/*
 * La licence : un fichier, signé par l'éditeur, posé à côté de l'application.
 *
 * Elle se lit sans réseau, sans compte et sans rien envoyer à personne : le
 * fichier « licence.json » porte le nom du client, le nombre de postes, la date
 * jusqu'à laquelle les mises à jour sont comprises, et la signature de l'éditeur
 * (Ed25519, voir signature.js). L'application ne contient que de quoi vérifier,
 * jamais de quoi fabriquer.
 *
 * Ce que cela vaut, honnêtement : un fichier signé au nom d'une commune, dont le
 * nom s'affiche dans « À propos », décourage la copie de bon voisinage — la
 * secrétaire de la commune d'à côté à qui une collègue dit « prends notre dossier,
 * il est très bien ». Ce n'est pas un dispositif anticopie : la clé publique est dans
 * le code livré, et qui sait ce qu'il fait peut s'en écarter. On ne lie PAS la
 * licence au matériel : un parc communal se renouvelle par tranches et se clone.
 *
 * Trois états, et un quatrième qui n'en est pas un :
 *  - « licence »    un fichier valide ;
 *  - « essai »      pas de fichier : toutes les fonctions, aucun filigrane, pour une
 *                   durée limitée, qui court depuis le premier lancement ;
 *  - « essai-fini » l'essai est passé : on lit encore tout, mais l'application refuse
 *                   de produire de nouveaux fichiers, et le dit — le travail en cours
 *                   se récupère, rien n'est perdu ;
 *  - « interne »    aucune clé de licence n'est embarquée : la version de travail, ou
 *                   celle d'un service qui ne vend rien. Aucune contrainte.
 *
 * L'ancre de l'essai est dans le profil Windows de la personne, hors du dossier
 * portable : décompresser le zip une deuxième fois ne remet pas l'essai à zéro. Elle
 * est franchissable (effacer ce fichier), et c'est assumé : on décourage la
 * prolongation distraite, on n'arrête pas qui veut passer outre. Et si l'écriture
 * échoue (partage en lecture seule, profil itinérant mal réglé), l'essai continue :
 * on ne bloque pas un client sérieux pour empêcher une fraude qu'on n'empêche pas.
 *
 * Pas d'Electron ici : s'éprouve seul (test/licence.test.js).
 */
const fs = require('fs');
const path = require('path');
const { verifier } = require('./signature');

const NOM_FICHIER = 'licence.json';
const JOURS_D_ESSAI = 45; // la validité d'une offre de commune est de 90 jours : 30 serait trop court
const JOUR = 24 * 3600 * 1000;
const MODELES = ['site', 'interne'];

const AUCUNE = { etat: 'interne', pourquoi: 'aucune clé de licence n’est embarquée dans cette version' };

/**
 * Lit « licence.json » dans `dossier`. Rend { ok, licence } ou { ok:false, raison, absente }.
 * `cles` : les clés publiques « licence » de l'application.
 */
function lireLeFichier(dossier, cles) {
  let brut;
  try { brut = fs.readFileSync(path.join(dossier, NOM_FICHIER), 'utf8'); }
  catch (e) { return { ok: false, absente: true, raison: 'pas de fichier ' + NOM_FICHIER }; }
  let piece;
  try { piece = JSON.parse(brut.replace(/^﻿/, '')); } catch (e) { return { ok: false, raison: NOM_FICHIER + ' est illisible (ce n’est pas du JSON)' }; }
  if (piece.v !== 1 || piece.objet !== 'licence') return { ok: false, raison: NOM_FICHIER + ' n’est pas un fichier de licence' };
  const v = verifier(piece, cles);
  if (!v.ok) return { ok: false, raison: v.raison === 'signature invalide' ? 'la signature de la licence est invalide : le fichier a été modifié, ou il n’est pas de l’éditeur' : v.raison };
  if (!MODELES.includes(piece.modele)) return { ok: false, raison: 'modèle de licence inconnu (' + piece.modele + ')' };
  return { ok: true, licence: piece };
}

function jours(ms) { return Math.ceil(ms / JOUR); }

/**
 * L'état de la licence à `maintenant`.
 *   dossier — à côté de l'exécutable (PORTABLE_DIR)
 *   cles    — les clés publiques « licence »
 *   essai   — { lire(): ISO|null, ecrire(ISO): bool } : l'ancre de l'essai (profil de la personne)
 */
function etatDeLaLicence(opts) {
  const o = opts || {};
  const maintenant = o.maintenant == null ? Date.now() : o.maintenant;
  if (!o.cles || !o.cles.length) return Object.assign({}, AUCUNE);

  const f = lireLeFichier(o.dossier, o.cles);
  if (f.ok) {
    const l = f.licence;
    return {
      etat: 'licence', id: l.id, client: l.client, ide: l.ide || '', postes: Number(l.postes) || 0, modele: l.modele,
      emise: l.emise, majJusqu: l.majJusqu || '',
    };
  }
  // Un fichier posé mais invalide : on le dit, et on retombe sur l'essai — jamais
  // sur « interne », qui ouvrirait tout à qui a abîmé le fichier.
  const invalide = f.absente ? null : f.raison;

  let debut = null;
  try { debut = o.essai && o.essai.lire ? o.essai.lire() : null; } catch (e) { /* ancre illisible : on repart de maintenant */ }
  let t = debut ? Date.parse(debut) : NaN;
  if (!Number.isFinite(t)) {
    t = maintenant;
    try { if (o.essai && o.essai.ecrire) o.essai.ecrire(new Date(maintenant).toISOString()); } catch (e) { /* l'échec d'écriture n'interdit pas l'essai */ }
  }
  // Une horloge reculée ne rallonge pas l'essai ; une ancre dans le futur est une ancre abîmée.
  if (t > maintenant + JOUR) t = maintenant;
  const fin = t + JOURS_D_ESSAI * JOUR;
  const reste = fin - maintenant;
  const base = { debut: new Date(t).toISOString(), fin: new Date(fin).toISOString(), invalide };
  if (reste > 0) return Object.assign(base, { etat: 'essai', joursRestants: jours(reste) });
  return Object.assign(base, { etat: 'essai-fini', joursRestants: 0 });
}

/** Une mise à jour datée de `dateMaj` est-elle comprise dans la licence ? (Perpétuelle, mises à jour pour un an.) */
function miseAJourComprise(licence, dateMaj) {
  if (!licence || licence.etat !== 'licence' || !licence.majJusqu) return { ok: true };
  const limite = Date.parse(licence.majJusqu + 'T23:59:59Z');
  const d = Date.parse(dateMaj);
  if (!Number.isFinite(limite) || !Number.isFinite(d)) return { ok: true };
  return d <= limite ? { ok: true } : { ok: false, raison: 'cette version date du ' + String(dateMaj).slice(0, 10) + ', après la fin de la période de mise à jour de votre licence (' + licence.majJusqu + ')' };
}

/** Le texte de « À propos » et de la barre d'état. */
function description(e) {
  if (e.etat === 'licence') {
    return 'Licence : ' + e.client + (e.postes ? ' — ' + e.postes + (e.postes > 1 ? ' postes' : ' poste') : ' — postes illimités')
      + (e.majJusqu ? ' — mises à jour comprises jusqu’au ' + e.majJusqu : '') + ' (' + e.id + ')';
  }
  if (e.etat === 'essai') return 'Version d’essai : ' + e.joursRestants + (e.joursRestants > 1 ? ' jours restants' : ' jour restant') + ', toutes les fonctions.';
  if (e.etat === 'essai-fini') return 'Version d’essai terminée : l’application se lit, mais n’enregistre plus de nouveau fichier.';
  return 'Version non licenciée (' + e.pourquoi + ').';
}

// L'ancre de l'essai : un fichier dans le profil de la personne, une entrée NON indexée
// par le chemin du dossier — sinon décompresser le zip ailleurs ferait un second essai.
function ancreDansLeProfil(dossierProfil) {
  const f = path.join(dossierProfil, 'essai.json');
  return {
    lire() { try { return JSON.parse(fs.readFileSync(f, 'utf8')).debut || null; } catch (e) { return null; } },
    ecrire(iso) { fs.mkdirSync(dossierProfil, { recursive: true }); fs.writeFileSync(f, JSON.stringify({ debut: iso }) + '\n'); return true; },
  };
}

module.exports = { NOM_FICHIER, JOURS_D_ESSAI, MODELES, lireLeFichier, etatDeLaLicence, miseAJourComprise, description, ancreDansLeProfil };
