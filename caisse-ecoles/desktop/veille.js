/*
 * La veille du dossier scanné : ce que le copieur dépose entre dans l'application tout seul.
 *
 * Elle vit dans le processus principal, seul endroit qui voie le disque. Elle ne lit pas les PDF
 * elle-même — c'est la page qui a pdf.js, l'OCR et l'analyseur : la veille lui confie les octets
 * (`traiter`) et range le fichier selon ce qu'on lui répond. Module sans dépendance, pour être
 * éprouvé avec de vrais fichiers, hors d'Electron.
 *
 * Trois décisions qui méritent d'être dites :
 *
 * 1. On relit le dossier à intervalle, on n'« écoute » pas les événements du système. Sur un
 *    partage réseau (SMB, chemin UNC) ces événements manquent ou n'arrivent jamais. Une lecture
 *    de dossier toutes les cinq secondes sur quelques fichiers ne coûte rien et ne ment pas.
 *
 * 2. Un fichier est réservé en le DÉPLAÇANT dans `.encours/<poste>/`. Le déplacement est
 *    atomique : entre deux postes, un seul trouve la source, l'autre reçoit une erreur et passe
 *    au suivant. C'est un verrou par fichier, qui se nettoie tout seul et ne laisse pas de
 *    cadavre — un fichier `.lock` consultatif, lui, se périme mal. La destination porte le nom du
 *    poste, donc deux postes ne se disputent jamais la même cible, seulement la source.
 *
 * 3. Un fichier n'est réservé que s'il est complet. « La taille ne bouge plus » ne suffit pas :
 *    entre deux morceaux, un copieur laisse la taille immobile une seconde ou deux. On exige
 *    aussi la signature d'un PDF entier — `%PDF` en tête, `%%EOF` en queue. Un document coupé
 *    n'a pas de fin, et ne sera jamais pris pour complet.
 */
'use strict';
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');

const ENCOURS = '.encours';
const TRAITE = 'traité';
const REVOIR = 'à revoir';
/** Un fichier qui n'est toujours pas un PDF entier après ce délai est écarté plutôt qu'attendu. */
const PATIENCE_MS = 10 * 60 * 1000;
const STABILITE_MS = 4000;
const REPRISE_MS = 2 * 60 * 60 * 1000;
const QUEUE_EOF = 2048; // on cherche « %%EOF » dans la fin du fichier

/** Nom de fichier utilisable sous Windows, sans accent ni caractère interdit. */
function nomPropre(nom) {
  const base = path.basename(String(nom || ''), path.extname(String(nom || '')));
  const propre = base
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/n°/gi, 'no').replace(/[<>:"/\\|?*]/g, '-')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[. ]+|[. ]+$/g, '');
  return (propre || 'scan').slice(0, 80);
}

/** Le fichier ou le dossier est-il là ? Pour dire lequel des deux côtés manque à un renommage. */
async function existe(p) {
  try { await fsp.access(p); return true; } catch (e) { return false; }
}

const deuxChiffres = (n) => String(n).padStart(2, '0');
function jour(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${deuxChiffres(d.getUTCMonth() + 1)}-${deuxChiffres(d.getUTCDate())}`;
}
const mois = (ms) => jour(ms).slice(0, 7);

/** Un nom libre dans ce dossier : « scan.pdf », puis « scan (2).pdf »… Deux scans ne s'écrasent pas. */
async function nomLibre(dossier, base, ext) {
  for (let i = 1; i < 500; i++) {
    const nom = i === 1 ? `${base}${ext}` : `${base} (${i})${ext}`;
    try {
      await fsp.access(path.join(dossier, nom));
    } catch (e) {
      return nom; // inaccessible = inexistant : la place est libre
    }
  }
  return `${base} (${Date.now()})${ext}`;
}

/**
 * Le fichier est-il un PDF entier ? On lit sa tête et sa queue, rien de plus : ouvrir vraiment le
 * document est le travail de la page, qui a pdf.js. Ici on écarte seulement ce qui est
 * manifestement inachevé.
 */
async function pdfEntier(chemin) {
  let fd = null;
  try {
    fd = await fsp.open(chemin, 'r');
    const { size } = await fd.stat();
    if (size < 32) return false;
    const tete = Buffer.alloc(5);
    await fd.read(tete, 0, 5, 0);
    if (tete.toString('latin1') !== '%PDF-') return false;
    const n = Math.min(QUEUE_EOF, size);
    const queue = Buffer.alloc(n);
    await fd.read(queue, 0, n, size - n);
    return queue.toString('latin1').includes('%%EOF');
  } catch (e) {
    return false;
  } finally {
    if (fd) { try { await fd.close(); } catch (e) { /* ignore */ } }
  }
}

/**
 * Crée une veille.
 *
 * opts.dossiers  : () => [{ chemin }] — relu à chaque tour, les réglages peuvent changer
 * opts.poste     : nom du poste, qui donne son dossier de travail dans `.encours/`
 * opts.traiter   : async ({ nom, chemin, octets, dossier }) => { ok, raison, nom }
 * opts.journal   : (ligne) => void
 * opts.maintenant: () => ms (pour les essais)
 */
function creerVeille(opts) {
  opts = opts || {};
  const poste = nomPropre(opts.poste || os.hostname() || 'poste') || 'poste';
  const maintenant = opts.maintenant || (() => Date.now());
  const stabiliteMs = opts.stabiliteMs == null ? STABILITE_MS : Number(opts.stabiliteMs);
  const repriseMs = opts.repriseMs == null ? REPRISE_MS : Number(opts.repriseMs);
  const patienceMs = opts.patienceMs == null ? PATIENCE_MS : Number(opts.patienceMs);
  const journal = opts.journal || (() => {});
  const traiter = opts.traiter || (async () => ({ ok: false, raison: 'aucun lecteur' }));
  const listeDossiers = typeof opts.dossiers === 'function' ? opts.dossiers : () => (opts.dossiers || []);

  // Ce qu'on a vu du fichier au tour précédent : sans cette mémoire, « la taille ne bouge plus »
  // n'a pas de sens. Clé : chemin complet.
  const vus = new Map();
  // Dossiers signalés injoignables : on ne réécrit pas la même ligne au journal à chaque tour.
  const muets = new Set();
  let enCours = false;
  let minuteur = null;
  const compteur = { tours: 0, traites: 0, revoir: 0, erreurs: 0 };

  function noter(ligne) {
    try { journal(`[veille] ${ligne}`); } catch (e) { /* le journal ne doit jamais faire tomber la veille */ }
  }

  /**
   * Range un fichier réservé, selon ce que la page a répondu.
   *
   * Un échec de rangement ne doit jamais faire tomber le tour : sur un partage réseau, le fichier
   * réservé peut disparaître sous nos pieds (antivirus, sauvegarde, quelqu'un qui fait le ménage)
   * et le dossier de destination peut devenir injoignable entre deux instants. On le dit — en
   * nommant lequel des deux côtés manque, parce que « ENOENT » sur un renommage ne le dit pas —
   * et on passe au fichier suivant.
   */
  async function classer(racine, chemin, nomOrigine, resultat) {
    const t = maintenant();
    const ok = !!(resultat && resultat.ok);
    const sous = ok ? path.join(TRAITE, mois(t)) : REVOIR;
    const dest = path.join(racine, sous);
    await fsp.mkdir(dest, { recursive: true });
    const base = ok ? `${jour(t)}_${nomPropre(resultat.nom || nomOrigine)}` : `${jour(t)}_${nomPropre(nomOrigine)}`;
    const nom = await nomLibre(dest, base, '.pdf');
    try {
      await fsp.rename(chemin, path.join(dest, nom));
    } catch (e) {
      const sourceLa = await existe(chemin);
      const destLa = await existe(dest);
      noter(`rangement impossible : ${nomOrigine} — ${(e && e.code) || ''} ${(e && e.message) || e}` +
        ` [source ${sourceLa ? 'présente' : 'DISPARUE'}, dossier ${sous} ${destLa ? 'présent' : 'ABSENT'}]`);
      compteur.erreurs += 1;
      return { sous, nom, ok: false, echecRangement: true };
    }
    if (!ok) {
      // pourquoi ce scan n'a pas pu entrer : la note vit à côté du fichier, pas seulement au journal
      const raison = (resultat && resultat.raison) || 'lecture impossible';
      const note = `${nomOrigine}\n${new Date(t).toISOString()}\n\n${raison}\n`;
      try { await fsp.writeFile(path.join(dest, `${nom.slice(0, -4)}.txt`), note, 'utf8'); } catch (e) { /* le PDF est sauf, c'est l'essentiel */ }
      compteur.revoir += 1;
      noter(`à revoir : ${nomOrigine} — ${raison}`);
    } else {
      compteur.traites += 1;
      noter(`rangé : ${nomOrigine} -> ${path.join(sous, nom)}`);
    }
    return { sous, nom, ok };
  }

  /** Lit le fichier réservé et le confie à la page, puis le range. */
  async function lireEtClasser(racine, chemin, nomOrigine) {
    let octets = null;
    try {
      octets = await fsp.readFile(chemin);
    } catch (e) {
      await classer(racine, chemin, nomOrigine, { ok: false, raison: `fichier illisible (${(e && e.code) || ''} ${(e && e.message) || e})`.trim() });
      return;
    }
    let resultat = null;
    try {
      resultat = await traiter({ nom: nomOrigine, chemin, octets, dossier: racine });
    } catch (e) {
      resultat = { ok: false, raison: `lecture impossible (${e && e.message ? e.message : e})` };
    }
    await classer(racine, chemin, nomOrigine, resultat || { ok: false, raison: 'aucune réponse du lecteur' });
  }

  /**
   * Reprend les fichiers restés dans les dossiers de travail : les nôtres toujours (l'application
   * a été fermée en plein travail), ceux d'un autre poste seulement après le délai de reprise —
   * ce poste est peut-être simplement éteint, et lui reprendre un scan trop tôt le ferait traiter
   * deux fois.
   */
  async function reprendre(racine) {
    const base = path.join(racine, ENCOURS);
    let postes = [];
    try { postes = await fsp.readdir(base); } catch (e) { return []; }
    const repris = [];
    for (const p of postes) {
      const dir = path.join(base, p);
      let noms = [];
      try { noms = await fsp.readdir(dir); } catch (e) { continue; }
      for (const n of noms) {
        if (!/\.pdf$/i.test(n)) continue;
        const chemin = path.join(dir, n);
        const r = reservationDe(n);
        if (p !== poste) {
          let depuis = r.depuis;
          if (depuis == null) {
            // nom sans horodatage (fichier posé à la main) : faute de mieux, la date du fichier
            try { depuis = (await fsp.stat(chemin)).mtimeMs; } catch (e) { continue; }
          }
          if (maintenant() - depuis < repriseMs) continue;
          noter(`reprise d'un scan laissé par ${p} : ${r.nom}`);
        }
        repris.push({ chemin, nom: r.nom });
      }
    }
    return repris;
  }

  /**
   * Le nom réservé porte le moment de la réservation et le nom déposé par le copieur :
   * « 1700000000000-x7k2p-SKM_C224.pdf ». On en tire les deux.
   *
   * L'heure vient du nom, pas de la date du fichier sur le disque : sur un partage réseau cette
   * date est celle qu'y a laissée le copieur, une sauvegarde ou un antivirus — ce qui nous
   * intéresse est depuis quand un poste retient ce scan, et cela, seul le nom le dit.
   */
  function reservationDe(nomReserve) {
    const m = /^(\d{10,})-[a-z0-9]+-(.*)$/i.exec(nomReserve);
    return m ? { depuis: Number(m[1]), nom: m[2] } : { depuis: null, nom: nomReserve };
  }

  /**
   * Réserve un fichier en le déplaçant dans notre dossier de travail. Rend le nouveau chemin, ou
   * null si quelqu'un d'autre l'a pris (ou s'il a disparu). L'horodatage et le grain de hasard
   * dans le nom évitent d'écraser un de nos propres restes portant le même nom.
   */
  async function reserver(racine, nom) {
    const dir = path.join(racine, ENCOURS, poste);
    await fsp.mkdir(dir, { recursive: true });
    const alea = Math.random().toString(36).slice(2, 7);
    const cible = path.join(dir, `${maintenant()}-${alea}-${nom}`);
    try {
      await fsp.rename(path.join(racine, nom), cible);
      return cible;
    } catch (e) {
      return null; // pris par un autre poste, ou disparu entre-temps
    }
  }

  /** Un tour de veille sur un dossier. */
  async function tourDossier(racine) {
    const sortie = { reserves: [], attentes: [], erreurs: [] };
    let noms = [];
    try {
      noms = await fsp.readdir(racine);
      if (muets.delete(racine)) noter(`dossier de nouveau joignable : ${racine}`);
    } catch (e) {
      sortie.erreurs.push({ dossier: racine, message: e && e.message ? e.message : String(e) });
      compteur.erreurs += 1;
      if (!muets.has(racine)) {
        muets.add(racine);
        noter(`dossier injoignable : ${racine} (${e && e.code ? e.code : 'erreur'}) — la veille continue`);
      }
      return sortie;
    }

    // d'abord nos restes et ceux d'un poste tombé
    for (const r of await reprendre(racine)) {
      sortie.reserves.push(r);
      try {
        await lireEtClasser(racine, r.chemin, r.nom);
      } catch (e) {
        sortie.erreurs.push({ dossier: racine, message: `${r.nom} : ${(e && e.message) || e}` });
        compteur.erreurs += 1;
        noter(`reprise abandonnée : ${r.nom} — ${(e && e.message) || e}`);
      }
    }

    for (const nom of noms) {
      if (!/\.pdf$/i.test(nom)) continue; // le reste du dossier n'est pas à nous
      const chemin = path.join(racine, nom);
      let st = null;
      try { st = await fsp.stat(chemin); } catch (e) { continue; }
      if (!st.isFile()) continue;

      const t = maintenant();
      const vu = vus.get(chemin);
      if (!vu || vu.taille !== st.size || vu.mtime !== st.mtimeMs) {
        vus.set(chemin, { taille: st.size, mtime: st.mtimeMs, depuis: t });
        sortie.attentes.push({ nom, raison: 'taille en mouvement' });
        continue;
      }
      if (t - vu.depuis < stabiliteMs) { sortie.attentes.push({ nom, raison: 'trop récent' }); continue; }

      if (!(await pdfEntier(chemin))) {
        // Un PDF sans fin est un document en cours d'écriture — ou une écriture interrompue. On
        // attend, puis on renonce : le laisser tourner en boucle le rendrait invisible pour
        // toujours, et le lire le ferait entrer tronqué dans le journal.
        if (t - vu.depuis < patienceMs) { sortie.attentes.push({ nom, raison: 'PDF incomplet' }); continue; }
        const chemin2 = await reserver(racine, nom);
        vus.delete(chemin);
        if (!chemin2) continue;
        sortie.reserves.push({ chemin: chemin2, nom });
        await classer(racine, chemin2, nom, { ok: false, raison: 'PDF incomplet ou tronqué : le fichier ne se termine pas (aucun %%EOF). Le copieur a peut-être été interrompu ; relancez la numérisation.' });
        continue;
      }

      const chemin2 = await reserver(racine, nom);
      vus.delete(chemin);
      if (!chemin2) continue; // un autre poste a été plus rapide
      sortie.reserves.push({ chemin: chemin2, nom });
      try {
        await lireEtClasser(racine, chemin2, nom);
      } catch (e) {
        // Un scan qui résiste ne doit pas priver les dix-neuf autres de leur tour. Il reste dans
        // notre dossier de travail, et le tour suivant le reprendra.
        sortie.erreurs.push({ dossier: racine, message: `${nom} : ${(e && e.message) || e}` });
        compteur.erreurs += 1;
        noter(`scan abandonné pour ce tour : ${nom} — ${(e && e.message) || e}`);
      }
    }

    // mémoire des fichiers disparus : sans ce ménage, elle grandirait sans fin
    for (const c of Array.from(vus.keys())) {
      if (c.startsWith(racine + path.sep) && !noms.includes(path.basename(c))) vus.delete(c);
    }
    return sortie;
  }

  /** Un tour complet, sur tous les dossiers réglés. Ne se superpose jamais à lui-même. */
  async function tour() {
    if (enCours) return { reserves: [], attentes: [], erreurs: [], saute: true };
    enCours = true;
    const sortie = { reserves: [], attentes: [], erreurs: [] };
    try {
      let dossiers = [];
      try { dossiers = listeDossiers() || []; } catch (e) { dossiers = []; }
      for (const d of dossiers) {
        const racine = d && (typeof d === 'string' ? d : d.chemin);
        if (!racine) continue;
        const r = await tourDossier(racine);
        sortie.reserves.push(...r.reserves);
        sortie.attentes.push(...r.attentes);
        sortie.erreurs.push(...r.erreurs);
      }
      compteur.tours += 1;
    } finally {
      enCours = false;
    }
    return sortie;
  }

  function demarrer(intervalleMs) {
    arreter();
    const ms = Math.max(500, Number(intervalleMs) || 5000);
    minuteur = setInterval(() => { tour().catch((e) => noter(`tour interrompu : ${e && e.message ? e.message : e}`)); }, ms);
    if (minuteur.unref) minuteur.unref(); // ne retient pas la fermeture de l'application
    return minuteur;
  }

  function arreter() {
    if (minuteur) { clearInterval(minuteur); minuteur = null; }
  }

  const etat = () => Object.assign({ poste, actif: !!minuteur, enCours }, compteur);

  return { tour, demarrer, arreter, etat, poste };
}

module.exports = { creerVeille, nomPropre, pdfEntier, ENCOURS, TRAITE, REVOIR };
