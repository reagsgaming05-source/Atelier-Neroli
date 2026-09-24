/*
 * Ce que disent la fenêtre et ses boîtes de dialogue.
 *
 * Les textes et les petites décisions de la fenêtre, à part de main.js pour être vérifiés sans
 * lancer Electron (test/navigation.test.js) : titre de la fenêtre, taille à l'ouverture, boîtes
 * « OK / Annuler » en français, dossier des données injoignable au démarrage, fiche non
 * enregistrée à la fermeture, erreurs de fichiers dites en français, À propos.
 *
 * Aucune dépendance à Electron : main.js et les preloads appliquent, ce module décide.
 */
'use strict';

const APP_TITLE = 'Compta Blonay';

const propre = (s, max) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max || 80);
const pluriel = (n, mot, motPluriel) => `${n} ${n > 1 ? (motPluriel || `${mot}s`) : mot}`;

/**
 * Titre de la fenêtre : l'espace ouvert d'abord. C'est ce que montrent la barre des tâches de
 * Windows et Alt+Tab ; « Compta Blonay » seul ne disait pas où l'on en était.
 */
function titreFenetre(etat) {
  const espace = propre(etat && etat.espace, 60);
  const outil = propre(etat && etat.outil, 40);
  return [espace, outil && outil !== espace ? outil : '', APP_TITLE].filter(Boolean).join(' – ');
}

/**
 * Où ouvrir la fenêtre. La première fois : agrandie — ouverte en 1440 px, elle débordait d'un
 * écran de portable (1366 px) et n'utilisait qu'une partie d'un grand écran. Ensuite : comme on
 * l'a laissée, pourvu qu'elle se voie encore sur un des écrans (un second écran débranché ne
 * doit pas l'envoyer hors de vue).
 *
 * `memo` : { x, y, width, height, agrandie } retenu à la fermeture ; `ecrans` : zones de travail.
 */
function placementFenetre(memo, ecrans) {
  const defaut = { width: 1440, height: 920, agrandie: true };
  if (!memo || typeof memo !== 'object') return defaut;
  const n = (v) => Math.round(Number(v));
  const width = n(memo.width);
  const height = n(memo.height);
  const x = n(memo.x);
  const y = n(memo.y);
  if (!(width >= 900 && height >= 600) || !Number.isFinite(x) || !Number.isFinite(y)) return defaut;
  const liste = Array.isArray(ecrans) && ecrans.length ? ecrans : [];
  // la barre de titre doit tomber sur un écran : c'est par elle qu'on déplace la fenêtre
  const visible = liste.some((e) => x + width - 120 > e.x && x + 120 < e.x + e.width && y >= e.y - 10 && y + 40 < e.y + e.height);
  if (!visible) return { width, height, agrandie: !!memo.agrandie };
  return { x, y, width, height, agrandie: !!memo.agrandie };
}

/* ---------------------------------------------------------------- erreurs expliquées */

// Le code d'erreur du système, où qu'il soit : l'objet d'origine, ou le texte que le pont entre
// la page et le programme a transmis (« Error invoking remote method 'files:save': Error:
// ENOENT: no such file or directory, open '…' »).
const CODE_RE = /\b(E[A-Z]{3,}|UNKNOWN)\b/;
function codeErreur(e) {
  if (e && typeof e === 'object' && typeof e.code === 'string' && e.code) return e.code;
  const m = CODE_RE.exec(String((e && e.message) || e || ''));
  return m ? m[1] : '';
}

/** Le message sans les enveloppes techniques ajoutées en chemin. */
function messageBrut(e) {
  return String((e && e.message) || e || '')
    .replace(/^Error invoking remote method '[^']*':\s*/i, '')
    .replace(/^(Uncaught\s+)?(Type|Range)?Error:\s*/i, '')
    .trim();
}

// Réseau : un serveur éteint ou un PC sorti du réseau répond par l'un de ces codes (UNKNOWN et
// EIO pour un partage Windows qui ne répond plus, ENOENT pour un chemin \\SERVEUR introuvable).
const RESEAU = ['ETIMEDOUT', 'EHOSTUNREACH', 'EHOSTDOWN', 'ENETUNREACH', 'ENETDOWN', 'ECONNRESET', 'ECONNREFUSED', 'ECONNABORTED', 'EPIPE', 'UNKNOWN', 'EIO', 'EBADF'];
const CAUSES = {
  EACCES: "ce PC n'a pas le droit d'écrire dans le dossier des données",
  EPERM: "ce PC n'a pas le droit d'écrire dans le dossier des données",
  EROFS: "le dossier des données n'accepte que la lecture",
  EBUSY: 'le fichier est ouvert ailleurs (dans Excel, ou sur un autre poste) : fermez-le, puis recommencez',
  ETXTBSY: 'le fichier est ouvert ailleurs (dans Excel, ou sur un autre poste) : fermez-le, puis recommencez',
  EAGAIN: 'le fichier est ouvert ailleurs (dans Excel, ou sur un autre poste) : fermez-le, puis recommencez',
  ENOSPC: 'le disque (ou le dossier du serveur) est plein',
  EDQUOT: 'le dossier du serveur est plein (quota atteint)',
  ENAMETOOLONG: 'le nom du fichier ou du dossier est trop long',
  EMFILE: 'trop de fichiers ouverts : fermez Compta Blonay et rouvrez-le',
};
const SERVEUR_MUET = "le serveur ne répond pas (serveur éteint, ou ce PC n'est plus sur le réseau de l'école ?)";

/**
 * Une erreur de fichier dite en français : { code, texte, technique }.
 *
 * `texte` dit la cause à la personne, sans anglais ni code ; `technique` garde le message
 * d'origine, pour le fichier de suivi (caisse.log). Une erreur sans code connu garde son propre
 * message, débarrassé de ses enveloppes : c'est souvent déjà une phrase de l'application.
 * `reseau` : le dossier des données est sur un partage (\\SERVEUR\…) — un fichier « introuvable »
 * y veut presque toujours dire « serveur injoignable ».
 */
function expliquerErreur(e, opts) {
  const code = codeErreur(e);
  const technique = messageBrut(e);
  const reseau = !!(opts && opts.reseau) || /\\\\[^\\]|^\/\/[^/]/.test(technique);
  let texte;
  if (RESEAU.includes(code)) texte = SERVEUR_MUET;
  else if (code === 'ENOENT' || code === 'ENOTDIR') texte = reseau ? SERVEUR_MUET : 'le dossier des données est introuvable (déplacé, renommé, ou clé USB retirée ?)';
  else if (CAUSES[code]) texte = CAUSES[code];
  else texte = technique.replace(new RegExp(`^${code}:?\\s*`), '') || 'erreur inconnue';
  return { code, texte, technique };
}

/* ---------------------------------------------------------------- boîtes « OK / Annuler » */

// Une question qui détruit quelque chose : « Annuler » est alors le bouton par défaut, pour
// qu'une touche Entrée donnée par réflexe ne supprime rien.
const DESTRUCTIF = /(^|[^\p{L}])(supprimer|retirer|effacer|remplacer|écraser|vider)/iu;

/** Premier paragraphe en titre de la boîte, la suite en explication (comme les dialogues de Windows). */
function decouper(texte) {
  const t = String(texte == null ? '' : texte).replace(/\r\n/g, '\n').trim();
  const i = t.indexOf('\n\n');
  if (i < 0) return { message: t, detail: '' };
  return { message: t.slice(0, i).trim(), detail: t.slice(i + 2).trim() };
}

/** Options de dialog.showMessageBox pour un confirm() de la page : OK (0) ou Annuler (1). */
function boiteConfirmation(texte) {
  const { message, detail } = decouper(texte);
  return {
    type: 'question', title: APP_TITLE, message, detail,
    buttons: ['OK', 'Annuler'], defaultId: DESTRUCTIF.test(message) ? 1 : 0, cancelId: 1, noLink: true,
  };
}

/** Options de dialog.showMessageBox pour un alert() de la page. */
function boiteAlerte(texte) {
  const { message, detail } = decouper(texte);
  return { type: 'info', title: APP_TITLE, message, detail, buttons: ['OK'], defaultId: 0, cancelId: 0, noLink: true };
}

/**
 * Fermer (ou recharger) alors que la page le refuse : la fiche contient une saisie non
 * enregistrée (Caisse écoles), ou un décompte n'est pas terminé (Décompte DGEO).
 * Bouton 0 : rester — c'est aussi ce que fait Échap. `quitter(réponse)` dit s'il faut fermer.
 */
function boiteFermetureRefusee(vue) {
  const dgeo = vue === 'dgeo';
  return {
    type: 'warning',
    title: APP_TITLE,
    message: dgeo ? "Le décompte en cours n'est pas terminé" : "La fiche en cours n'est pas enregistrée",
    detail: dgeo
      ? 'Si vous fermez maintenant, ce qui a été vérifié dans Décompte DGEO est perdu.\n\nPour le garder : « Revenir au décompte », puis « Générer le fichier Excel ».'
      : 'Ce qui est tapé dans la fiche, et les justificatifs choisis, seront perdus si vous fermez maintenant.\n\nPour les garder : « Revenir à la fiche », puis « Enregistrer la pièce ».',
    buttons: dgeo ? ['Revenir au décompte', 'Fermer sans terminer'] : ['Revenir à la fiche', 'Fermer sans enregistrer'],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  };
}
const quitterMalgre = (reponse) => reponse === 1;

/* ---------------------------------------------------------------- données injoignables au démarrage */

/**
 * Ce poste a-t-il été installé depuis le serveur (« Installer sur ce PC ») ? Son programme est
 * alors dans %LOCALAPPDATA%\ComptaBlonay, et le lanceur y recopie à chaque démarrage le
 * donnees.txt du serveur : un réglage fait sur ce poste ne tient que jusqu'au lancement suivant.
 * `existe(chemin)` : fs.existsSync, remplaçable dans les tests.
 */
function installeDepuisServeur({ localAppData, programme, existe, sep }) {
  if (!localAppData || !programme) return false;
  const s = sep || '\\';
  const norm = (p) => String(p).replace(/[\\/]+$/, '').toLowerCase();
  if (norm(programme) !== norm(`${localAppData}${s}ComptaBlonay`)) return false;
  return !!existe(`${localAppData}${s}ComptaBlonay-serveur.txt`);
}

/**
 * Le dossier des données (sur le serveur) ne répond pas au démarrage. Réessayer (0), Quitter (1),
 * et — quand c'est possible — travailler pour cette fois sur la caisse de ce PC (2), qui demande
 * ensuite une confirmation (boiteCaisseSeparee).
 */
function boiteDossierInjoignable({ chemin, raison, separeePossible }) {
  return {
    type: 'warning',
    title: APP_TITLE,
    message: 'Le dossier des données ne répond pas',
    detail: `${chemin}\n${raison ? `Cause : ${raison}.\n` : ''}\n`
      + 'La caisse — le journal de chaque année, les justificatifs, les scans — est dans ce dossier, sur le serveur. '
      + "Compta Blonay attend qu'il réponde : sans lui, vous travailleriez sur une autre caisse que celle des collègues.\n\n"
      + "Vérifiez que le serveur est allumé et que ce PC est branché au réseau de l'école, puis « Réessayer ».\n"
      + 'Si le serveur reste éteint : notez les pièces sur papier, et saisissez-les quand il répondra.',
    buttons: separeePossible ? ['Réessayer', 'Quitter', 'Travailler sur ce PC pour cette fois…'] : ['Réessayer', 'Quitter'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  };
}

/**
 * Seconde question avant d'ouvrir la caisse de ce PC : dire ce qu'elle contient (souvent rien, ou
 * une copie ancienne) et ce que deviendra ce qu'on y saisit. `local` : { annee, pieces } de
 * l'année la plus récente, ou null si ce PC n'a aucune caisse.
 * Bouton 0 : revenir à la question précédente ; 1 : ouvrir la caisse de ce PC.
 */
function boiteCaisseSeparee(local) {
  const contenu = local && local.pieces
    ? `Elle contient ${pluriel(local.pieces, 'pièce')} pour ${local.annee}, et rien de ce que les collègues ont saisi depuis sur le serveur.`
    : "Elle est vide : aucune pièce n'y a été saisie.";
  return {
    type: 'warning',
    title: APP_TITLE,
    message: 'Ouvrir la caisse de ce PC, séparée de celle du serveur ?',
    detail: `${contenu}\n\n`
      + "Ce que vous y saisirez restera sur ce PC : les collègues ne le verront pas, et il faudra le ressaisir dans la caisse du serveur quand il répondra.\n\n"
      + "C'est pour cette fois seulement : au prochain lancement, Compta Blonay cherchera de nouveau le serveur.",
    buttons: ['Revenir', 'Ouvrir la caisse de ce PC'],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  };
}

/** L'année la plus récente d'une caisse et son nombre de pièces : [{ annee, pieces }] → { annee, pieces } | null. */
function resumeCaisse(annees) {
  const l = (Array.isArray(annees) ? annees : []).filter((a) => a && Number.isInteger(Number(a.annee)));
  if (!l.length) return null;
  const derniere = l.reduce((a, b) => (Number(b.annee) > Number(a.annee) ? b : a));
  return { annee: Number(derniere.annee), pieces: Math.max(0, Number(derniere.pieces) || 0) };
}

/* ---------------------------------------------------------------- où sont les données (barre du haut) */

/**
 * Ce que dit la barre du haut sur l'emplacement des données. Elle affichait « 100 % local,
 * aucune donnée n'est envoyée » même quand tout était sur le serveur : une collègue pouvait en
 * conclure que ses ajouts n'étaient pas partagés.
 */
function etiquetteDonnees({ partage, chemin, separee }) {
  const internet = "Rien n'est envoyé sur Internet.";
  if (separee) {
    return {
      genre: 'separee',
      texte: 'Caisse de ce PC seulement : le serveur ne répondait pas',
      titre: `Ce que vous saisissez ici reste sur ce PC : les collègues ne le verront pas. Au prochain lancement, Compta Blonay cherchera de nouveau le serveur.\n${internet}`,
    };
  }
  if (partage) {
    return { genre: 'partage', texte: `Données partagées : ${chemin}`, titre: `La caisse est dans ${chemin}, partagée par les postes de l'école.\n${internet}` };
  }
  return { genre: 'local', texte: 'Données sur ce PC', titre: `La caisse est dans ${chemin || 'le dossier « data » à côté du programme'}.\n${internet}` };
}

/* ---------------------------------------------------------------- décompte : fichier Excel */

/**
 * « Ouvrir l'Excel » d'un décompte dont le fichier n'est pas là. La liste des décomptes est
 * partagée par le serveur, mais le fichier a pu être enregistré dans les Documents d'un autre
 * poste : « déplacé ou renommé » faisait chercher un fichier que personne n'avait touché.
 */
function messageExcelIntrouvable({ chemin, poste, ici }) {
  if (!chemin) return "Aucun fichier Excel n'est connu pour ce décompte : générez-le dans Décompte DGEO.";
  if (poste && ici && String(poste).toLowerCase() !== String(ici).toLowerCase()) {
    return `Ce fichier Excel a été enregistré sur un autre poste (${poste}) : ${chemin}. Il ne se voit pas d'ici ; ouvrez-le sur ce poste-là.`;
  }
  return `Le fichier Excel de ce décompte n'est plus à sa place (déplacé ou renommé ?) : ${chemin}.`;
}

/* ---------------------------------------------------------------- À propos */

/**
 * La construction écrite dans version.txt (« <commit> <n° de construction> <date ISO> ») dite
 * comme une personne la compare d'un PC à l'autre : « version du 23.09.2026, construction n° 42 ».
 */
function versionLisible(texte) {
  const [commit, numero, date] = String(texte || '').trim().split(/\s+/);
  if (!commit) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '');
  return { commit: commit.slice(0, 7), numero: numero || '', date: m ? `${m[3]}.${m[2]}.${m[1]}` : '' };
}

/** Texte de la boîte À propos : ce qui sert à tout le monde d'abord, le technique en dernier. */
function texteAPropos(i) {
  const v = versionLisible(i.construction);
  const titre = v && v.date ? `${APP_TITLE} – version du ${v.date}` : `${APP_TITLE} – version de développement`;
  const lignes = [
    'Deux outils, choisis en haut à gauche de la fenêtre :',
    '• Caisse écoles : pièces comptables, journal de l\'année, comptage de la caisse, fichier Excel ;',
    '• Décompte DGEO : décomptes des courses d\'école et des camps.',
    '',
    "Rien n'est envoyé sur Internet : la lecture des PDF, les fichiers Excel et les décomptes se font sur ce PC.",
    `Données : ${i.donnees}${i.partage ? ' (partagées par les postes de l\'école)' : ' (sur ce PC)'}`,
    '',
    'Pour la personne qui s\'occupe de l\'informatique :',
    v ? `Construction n° ${v.numero || '?'}${v.date ? ` du ${v.date}` : ''} (${v.commit})` : 'Construction : inconnue (pas de version.txt)',
    `Programme : ${i.programme}`,
    `Fichier de suivi : ${i.suivi}`,
    `Noms de personnes : ${i.noms || 'aucun fichier vocabulaire-noms.js (les noms s\'apprennent depuis un classeur)'}`,
    `Troisième lecteur (Tesseract) : ${i.tesseract}`,
    `Décompte DGEO : ${i.dgeo}`,
    `Electron ${i.electron} – Chromium ${i.chromium}`,
  ];
  return { message: titre, detail: lignes.join('\n') };
}

module.exports = {
  APP_TITLE,
  titreFenetre,
  placementFenetre,
  codeErreur,
  messageBrut,
  expliquerErreur,
  decouper,
  boiteConfirmation,
  boiteAlerte,
  boiteFermetureRefusee,
  quitterMalgre,
  installeDepuisServeur,
  boiteDossierInjoignable,
  boiteCaisseSeparee,
  resumeCaisse,
  etiquetteDonnees,
  messageExcelIntrouvable,
  versionLisible,
  texteAPropos,
};
