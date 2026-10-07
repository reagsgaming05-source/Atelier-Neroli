/*
 * Le ménage d'une mise à jour : retirer du dossier de l'application les fichiers que la version précédente livrait et que la nouvelle ne livre
 * plus (une langue de moins, une bibliothèque remplacée) — sans jamais toucher à ce qui appartient à la personne.
 *
 * Chaque version livre un fichier LISTE-DES-FICHIERS.txt : un chemin relatif par ligne, tout ce que l'archive pose, rien d'autre. Le script de
 * mise à jour compare la liste de la version installée à celle de la nouvelle et fait retirer la différence par l'application elle-même
 * (`AktumPDF.exe --menage …`), qui n'est jamais plus prudente que dans ce fichier :
 *  - jamais le dossier « data » (les comptes, tampons, signatures, récents, le travail mis de côté), ni « maj », « licence.json », « aktum.log » ;
 *  - jamais un fichier qui n'est pas dans l'ancienne liste : ce que la personne a posé dans le dossier lui reste ;
 *  - jamais hors du dossier : un chemin absolu, avec « .. », une lettre de lecteur ou une barre oblique inverse est ignoré ;
 *  - jamais un dossier : seulement des fichiers, puis les dossiers que ce retrait a laissés vides.
 * Une version qui ne livre pas encore de liste (ou une installation qui n'en a pas) ne fait rien : mieux vaut un fichier de trop qu'un fichier
 * de moins.
 *
 * Ce module est sans Electron : il s'éprouve avec un dossier temporaire (test/menage.test.js).
 */
const fs = require('fs');
const path = require('path');

const NOM_LISTE = 'LISTE-DES-FICHIERS.txt';
// Ce que la mise à jour ne touche jamais, et que la liste ne mentionne donc pas : le premier segment du chemin, sans égard à la casse.
const PROTEGES = ['data', 'maj', 'licence.json', 'aktum.log'];

// Un chemin que la liste a le droit de nommer : relatif, propre, hors des parties protégées.
function cheminSur(rel) {
  if (typeof rel !== 'string') return false;
  if (!rel || rel.length > 400 || /[\0\r\n\\:]/.test(rel) || rel.startsWith('/')) return false;
  const segments = rel.split('/');
  if (segments.some((s) => !s || s === '.' || s === '..')) return false;
  if (PROTEGES.includes(segments[0].toLowerCase())) return false;
  if (rel === NOM_LISTE) return false;
  return true;
}

function lireListe(texte) {
  const sures = new Set();
  let refusees = 0;
  for (const brute of String(texte || '').replace(/^﻿/, '').split('\n')) {
    const l = brute.replace(/\r$/, '');
    if (!l.trim()) continue;
    if (cheminSur(l)) sures.add(l); else refusees++;
  }
  return { sures, refusees };
}

// Les fichiers à retirer : dans l'ancienne liste, absents de la nouvelle.
function aRetirer(texteAncienne, texteNouvelle) {
  const ancienne = lireListe(texteAncienne), nouvelle = lireListe(texteNouvelle);
  return { fichiers: [...ancienne.sures].filter((f) => !nouvelle.sures.has(f)).sort(), refusees: ancienne.refusees };
}

// Retirer ces fichiers de `dossier`. Rend ce qui s'est passé ; ne lève jamais (un fichier tenu par le système reste, et sera repris à la suivante).
function faireLeMenage(dossier, texteAncienne, texteNouvelle) {
  const racine = path.resolve(dossier);
  const { fichiers, refusees } = aRetirer(texteAncienne, texteNouvelle);
  const bilan = { retires: [], absents: 0, gardes: [], refusees };
  const dossiersTouches = new Set();
  for (const rel of fichiers) {
    const cible = path.resolve(racine, ...rel.split('/'));
    // Une seconde ceinture : quoi que dise la liste, on reste sous le dossier.
    if (cible !== racine && !cible.startsWith(racine + path.sep)) { bilan.refusees++; continue; }
    let st;
    try { st = fs.lstatSync(cible); } catch (e) { bilan.absents++; continue; }
    if (st.isDirectory()) { bilan.refusees++; continue; }
    try { fs.unlinkSync(cible); bilan.retires.push(rel); dossiersTouches.add(path.dirname(cible)); }
    catch (e) { bilan.gardes.push(rel + ' (' + (e && e.code ? e.code : 'erreur') + ')'); }
  }
  // Les dossiers que ce retrait a vidés, du plus profond au plus haut, sans jamais retirer le dossier de l'application lui-même.
  [...dossiersTouches].sort((a, b) => b.length - a.length).forEach((d) => {
    for (let c = d; c !== racine && c.startsWith(racine + path.sep); c = path.dirname(c)) {
      try { fs.rmdirSync(c); } catch (e) { break; }   // pas vide, ou tenu : on s'arrête là
    }
  });
  return bilan;
}

// Le mode « sans fenêtre » appelé par le script : la liste installée est lue dans un fichier que le script a mis de côté AVANT de recopier
// la nouvelle version (qui écrase la liste installée), la nouvelle dans le dossier de l'archive déjà décompressée.
function menagePourLeScript(dossier, ancienne, nouvelle, sortie) {
  let ligne;
  try {
    if (!dossier || !fs.existsSync(dossier) || !fs.statSync(dossier).isDirectory()) ligne = 'MENAGE-REFUSE : dossier introuvable';
    else if (!ancienne || !fs.existsSync(ancienne)) ligne = 'MENAGE-SANS-LISTE : la version installée ne livrait pas de liste, rien n\'est retiré';
    else if (!nouvelle || !fs.existsSync(nouvelle)) ligne = 'MENAGE-SANS-LISTE : la nouvelle version ne livre pas de liste, rien n\'est retiré';
    else {
      const b = faireLeMenage(dossier, fs.readFileSync(ancienne, 'utf8'), fs.readFileSync(nouvelle, 'utf8'));
      ligne = 'MENAGE-OK ' + b.retires.length + ' retiré(s)' + (b.gardes.length ? ', ' + b.gardes.length + ' gardé(s) (tenus par le système)' : '');
    }
  } catch (e) { ligne = 'MENAGE-REFUSE : ' + (e && e.message ? e.message : e); }
  if (sortie) { try { fs.writeFileSync(sortie, ligne + '\n', 'utf8'); } catch (e) { /* le code de sortie dit l'essentiel */ } }
  return { code: ligne.startsWith('MENAGE-REFUSE') ? 2 : 0, ligne };
}

// La liste d'un dossier prêt à être archivé : tout ce qui s'y trouve, sauf ce qui n'est pas livré.
function listerLeDossier(dossier) {
  const racine = path.resolve(dossier);
  const sortie = [];
  (function marcher(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const complet = path.join(d, e.name);
      const rel = path.relative(racine, complet).split(path.sep).join('/');
      if (e.isDirectory()) { if (!PROTEGES.includes(rel.split('/')[0].toLowerCase())) marcher(complet); continue; }
      if (cheminSur(rel)) sortie.push(rel);
    }
  })(racine);
  return sortie.sort();
}

module.exports = { NOM_LISTE, PROTEGES, cheminSur, lireListe, aRetirer, faireLeMenage, menagePourLeScript, listerLeDossier };

// En ligne de commande : « node menage.js liste <dossier> » écrit LISTE-DES-FICHIERS.txt dans ce dossier (à la construction, avant l'archive).
if (require.main === module) {
  if (process.argv[2] === 'liste' && process.argv[3]) {
    const dossier = process.argv[3];
    const fichiers = listerLeDossier(dossier);
    fs.writeFileSync(path.join(dossier, NOM_LISTE), fichiers.join('\n') + '\n', 'utf8');
    console.log(NOM_LISTE + ' : ' + fichiers.length + ' fichiers');
  } else { console.error('usage : node menage.js liste <dossier>'); process.exit(1); }
}
