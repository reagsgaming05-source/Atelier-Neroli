/*
 * Navigation, fenêtre, messages et dialogues : savoir où l'on est, voir les messages, lire des
 * boîtes en français.
 *
 * Ce qui se vérifie sans lancer Electron : les textes et les décisions de desktop/dialogues.js
 * (titre, taille de la fenêtre, erreurs expliquées, boîtes OK / Annuler, démarrage sans serveur,
 * fermeture avec une fiche en cours), les règles de la zone des messages (src/avis.js), et deux
 * promesses de la feuille de style : les noms de la barre latérale restent visibles aux largeurs
 * d'écran courantes, et les réglages de Décompte DGEO ne disparaissent jamais sans chemin.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const D = require('../desktop/dialogues.js');
const Avis = require('../src/avis.js');

const racine = path.join(__dirname, '..');
const lire = (p) => fs.readFileSync(path.join(racine, p), 'utf8');

/* ---------------------------------------------------------------- titre, taille */

test('le titre de la fenêtre dit l\'espace ouvert, puis l\'outil', () => {
  assert.equal(D.titreFenetre({ outil: 'Caisse écoles', espace: 'Saisie des pièces' }), 'Saisie des pièces – Caisse écoles – Compta Blonay');
  assert.equal(D.titreFenetre({ outil: 'Décompte DGEO', espace: 'Récapitulatif des décomptes' }), 'Récapitulatif des décomptes – Décompte DGEO – Compta Blonay');
  // l'espace qui porte le nom de l'outil ne le répète pas
  assert.equal(D.titreFenetre({ outil: 'Décompte DGEO', espace: 'Décompte DGEO' }), 'Décompte DGEO – Compta Blonay');
  assert.equal(D.titreFenetre({}), 'Compta Blonay');
  assert.equal(D.titreFenetre(null), 'Compta Blonay');
});

test('la fenêtre s\'ouvre agrandie la première fois, puis comme on l\'a laissée', () => {
  const ecran = [{ x: 0, y: 0, width: 1366, height: 728 }];
  assert.deepEqual(D.placementFenetre(null, ecran), { width: 1440, height: 920, agrandie: true });
  assert.deepEqual(D.placementFenetre({ x: 40, y: 30, width: 1200, height: 700, agrandie: false }, ecran), { x: 40, y: 30, width: 1200, height: 700, agrandie: false });
  // laissée sur un second écran, débranché depuis : même taille, mais placée par le système
  const r = D.placementFenetre({ x: 2100, y: 50, width: 1200, height: 700, agrandie: true }, ecran);
  assert.equal(r.x, undefined);
  assert.equal(r.agrandie, true);
  // un réglage abîmé ne fait pas une fenêtre minuscule
  assert.deepEqual(D.placementFenetre({ x: 0, y: 0, width: 80, height: 'x' }, ecran), { width: 1440, height: 920, agrandie: true });
});

/* ---------------------------------------------------------------- erreurs en français */

test('une erreur de fichier arrivée par le pont se dit en français, sans enveloppe technique', () => {
  const brut = new Error("Error invoking remote method 'files:save': Error: ENOENT: no such file or directory, open '\\\\SERVEUR\\Partage\\ComptaBlonay-donnees\\caisse\\2026\\registre.json.SECRETARIAT-PC.4312.tmp'");
  const x = D.expliquerErreur(brut);
  assert.equal(x.code, 'ENOENT');
  assert.match(x.texte, /serveur ne répond pas/);
  assert.doesNotMatch(x.texte, /Error|invoking|ENOENT|no such file/);
  // le détail reste, pour le fichier de suivi, sans l'enveloppe du pont
  assert.match(x.technique, /^ENOENT: no such file/);
});

test('chaque cause courante a sa phrase : droits, fichier ouvert, disque plein, réseau', () => {
  const avec = (code, message) => Object.assign(new Error(message || `${code}: quelque chose`), { code });
  assert.match(D.expliquerErreur(avec('EACCES')).texte, /pas le droit d'écrire/);
  assert.match(D.expliquerErreur(avec('EPERM')).texte, /pas le droit d'écrire/);
  assert.match(D.expliquerErreur(avec('EBUSY')).texte, /ouvert ailleurs/);
  assert.match(D.expliquerErreur(avec('ENOSPC')).texte, /plein/);
  assert.match(D.expliquerErreur(avec('ETIMEDOUT')).texte, /serveur ne répond pas/);
  assert.match(D.expliquerErreur(avec('UNKNOWN')).texte, /serveur ne répond pas/);
  // un dossier local introuvable n'est pas un serveur éteint
  assert.match(D.expliquerErreur(avec('ENOENT', "ENOENT: no such file or directory, open 'C:\\x'")).texte, /introuvable/);
  assert.match(D.expliquerErreur(avec('ENOENT', 'ENOENT: …'), { reseau: true }).texte, /serveur ne répond pas/);
});

test('la raison d\'un dossier refusé ne répète plus le code (« ENOENT ENOENT: … »)', () => {
  // forme produite par emplacement.verifierDossier : code, puis message qui recommence par le code
  const x = D.expliquerErreur("ENOENT ENOENT: no such file or directory, mkdir '\\\\SERVEUR\\Partage\\x'");
  assert.equal(x.code, 'ENOENT');
  assert.match(x.texte, /serveur ne répond pas/);
  // une raison déjà dite en français passe telle quelle
  const muet = 'pas de réponse en 15 s (serveur éteint, ou PC hors du réseau ?)';
  assert.equal(D.expliquerErreur(muet).texte, muet);
  // une erreur de l'application (sans code) garde son texte
  assert.equal(D.expliquerErreur(new Error("Error invoking remote method 'classement:poser': Error: dossier refusé : « .. »")).texte, 'dossier refusé : « .. »');
});

/* ---------------------------------------------------------------- boîtes OK / Annuler */

test('confirm() devient une boîte « OK / Annuler » en français', () => {
  const b = D.boiteConfirmation('Marquer comme vérifiées les 3 pièce(s) lues sur un scan ?\n\nÀ ne faire qu\'après les avoir regardées : elles comptent déjà dans le solde.');
  assert.deepEqual(b.buttons, ['OK', 'Annuler']);
  assert.equal(b.cancelId, 1); // Échap = Annuler
  assert.equal(b.defaultId, 0);
  assert.equal(b.message, 'Marquer comme vérifiées les 3 pièce(s) lues sur un scan ?');
  assert.match(b.detail, /À ne faire qu'après/);
  assert.equal(b.title, 'Compta Blonay');
});

test('une question qui détruit quelque chose a « Annuler » par défaut : Entrée ne supprime rien', () => {
  for (const q of ['Supprimer la pièce n° 2 (RECETTE - Vente de fondues - T. Morel) et ses justificatifs ?', 'Retirer le justificatif « ticket.pdf » ?', 'Remplacer le registre 2026 (12 pièce(s)) par cette sauvegarde ?']) {
    assert.equal(D.boiteConfirmation(q).defaultId, 1, q);
  }
  // « supprimer » au milieu d'un mot ne compte pas
  assert.equal(D.boiteConfirmation('Aucune date de solde à nouveau n\'est indiquée. Continuer ?').defaultId, 0);
});

test('alert() devient une boîte avec un seul bouton « OK »', () => {
  const b = D.boiteAlerte('Toutes les lignes sont vérifiées.');
  assert.deepEqual(b.buttons, ['OK']);
  assert.equal(b.message, 'Toutes les lignes sont vérifiées.');
});

/* ---------------------------------------------------------------- fermer avec une fiche en cours */

test('fermer avec une fiche non enregistrée : rester est le choix par défaut, et celui d\'Échap', () => {
  const b = D.boiteFermetureRefusee('caisse');
  assert.match(b.message, /fiche en cours n'est pas enregistrée/);
  assert.deepEqual(b.buttons, ['Revenir à la fiche', 'Fermer sans enregistrer']);
  assert.equal(b.defaultId, 0);
  assert.equal(b.cancelId, 0);
  assert.equal(D.quitterMalgre(0), false);
  assert.equal(D.quitterMalgre(1), true);
  assert.match(D.boiteFermetureRefusee('dgeo').message, /décompte en cours/);
});

/* ---------------------------------------------------------------- démarrage : serveur injoignable */

test('un poste installé depuis le serveur se reconnaît (le lanceur y remet donnees.txt à chaque lancement)', () => {
  const lad = 'C:\\Users\\secretariat\\AppData\\Local';
  const existe = (p) => p === `${lad}\\ComptaBlonay-serveur.txt`;
  assert.equal(D.installeDepuisServeur({ localAppData: lad, programme: `${lad}\\ComptaBlonay`, existe }), true);
  assert.equal(D.installeDepuisServeur({ localAppData: lad, programme: `${lad}\\ComptaBlonay\\`, existe }), true);
  // une copie portable (clé USB, Bureau) n'est pas installée
  assert.equal(D.installeDepuisServeur({ localAppData: lad, programme: 'E:\\ComptaBlonay', existe }), false);
  // installé à la main sans l'installateur : pas de lanceur, rien n'est remis
  assert.equal(D.installeDepuisServeur({ localAppData: lad, programme: `${lad}\\ComptaBlonay`, existe: () => false }), false);
  assert.equal(D.installeDepuisServeur({ localAppData: '', programme: 'x', existe }), false);
});

test('serveur injoignable : plus de « Revenir aux données de ce PC », mais un choix qui dit ce qu\'il fait', () => {
  const b = D.boiteDossierInjoignable({ chemin: '\\\\SERVEUR\\Partage\\ComptaBlonay-donnees', raison: 'le serveur ne répond pas', separeePossible: true });
  assert.deepEqual(b.buttons.slice(0, 2), ['Réessayer', 'Quitter']);
  assert.equal(b.buttons.length, 3);
  assert.doesNotMatch(b.buttons[2], /Revenir aux données de ce PC/);
  assert.match(b.buttons[2], /pour cette fois/);
  assert.equal(b.defaultId, 0);
  assert.equal(b.cancelId, 1);
  assert.match(b.detail, /\\\\SERVEUR\\Partage/);
  assert.match(b.detail, /papier/); // que faire si le serveur reste éteint
  assert.deepEqual(D.boiteDossierInjoignable({ chemin: 'x', raison: '', separeePossible: false }).buttons, ['Réessayer', 'Quitter']);
});

test('avant d\'ouvrir la caisse de ce PC, on dit ce qu\'elle contient et ce que deviendra la saisie', () => {
  const pleine = D.boiteCaisseSeparee({ annee: 2025, pieces: 12 });
  assert.match(pleine.detail, /12 pièces pour 2025/);
  assert.match(pleine.detail, /les collègues ne le verront pas/);
  assert.match(pleine.detail, /pour cette fois seulement/);
  assert.deepEqual(pleine.buttons, ['Revenir', 'Ouvrir la caisse de ce PC']);
  assert.equal(pleine.defaultId, 0);
  assert.match(D.boiteCaisseSeparee(null).detail, /Elle est vide/);
  assert.match(D.boiteCaisseSeparee({ annee: 2026, pieces: 1 }).detail, /1 pièce pour 2026/);
});

test('la caisse de ce PC se résume par son année la plus récente', () => {
  assert.deepEqual(D.resumeCaisse([{ annee: 2025, pieces: 267 }, { annee: 2026, pieces: 12 }, { annee: 2024, pieces: 250 }]), { annee: 2026, pieces: 12 });
  assert.equal(D.resumeCaisse([]), null);
  assert.equal(D.resumeCaisse(null), null);
});

/* ---------------------------------------------------------------- où sont les données */

test('la barre du haut dit où sont les données, au lieu de « 100 % local » partout', () => {
  const p = D.etiquetteDonnees({ partage: true, chemin: '\\\\SERVEUR\\Partage\\ComptaBlonay-donnees', separee: false });
  assert.equal(p.genre, 'partage');
  assert.match(p.texte, /partagées : \\\\SERVEUR/);
  const l = D.etiquetteDonnees({ partage: false, chemin: 'C:\\ComptaBlonay\\data', separee: false });
  assert.equal(l.texte, 'Données sur ce PC');
  const s = D.etiquetteDonnees({ partage: false, chemin: 'C:\\x', separee: true });
  assert.equal(s.genre, 'separee');
  assert.match(s.texte, /ce PC seulement/);
  for (const e of [p, l, s]) {
    assert.doesNotMatch(`${e.texte} ${e.titre}`, /100 %/);
    assert.match(e.titre, /Rien n'est envoyé sur Internet/);
  }
});

/* ---------------------------------------------------------------- décompte fait sur un autre poste */

test('« Ouvrir l\'Excel » d\'un décompte fait sur un autre poste le dit, au lieu de « déplacé ou renommé »', () => {
  const autre = D.messageExcelIntrouvable({ chemin: 'C:\\Users\\a\\Documents\\BER120626.xlsx', poste: 'SECRETARIAT-PC', ici: 'CLASSE-5P' });
  assert.match(autre, /autre poste \(SECRETARIAT-PC\)/);
  assert.doesNotMatch(autre, /déplacé/);
  assert.match(D.messageExcelIntrouvable({ chemin: 'C:\\x.xlsx', poste: 'CLASSE-5P', ici: 'classe-5p' }), /déplacé ou renommé/);
  assert.match(D.messageExcelIntrouvable({ chemin: 'C:\\x.xlsx' }), /déplacé ou renommé/);
  assert.match(D.messageExcelIntrouvable({}), /générez-le/);
});

/* ---------------------------------------------------------------- À propos */

test('À propos : une version qui se compare d\'un PC à l\'autre, le technique en dernier', () => {
  assert.deepEqual(D.versionLisible('0123456789abcdef0123456789abcdef01234567 1234 2026-09-23T12:34:56Z'), { commit: '0123456', numero: '1234', date: '23.09.2026' });
  assert.equal(D.versionLisible(''), null);
  const t = D.texteAPropos({ construction: 'abcdef1234 42 2026-09-23T08:00:00Z', donnees: '\\\\SERVEUR\\d', partage: true, programme: 'C:\\p', suivi: 'C:\\p\\data\\caisse.log', noms: null, tesseract: '5.3', dgeo: 'en service', electron: '33', chromium: '130' });
  assert.equal(t.message, 'Compta Blonay – version du 23.09.2026');
  assert.match(t.detail, /Rien n'est envoyé sur Internet/);
  assert.match(t.detail, /partagées/);
  assert.doesNotMatch(t.detail, /onglet|aucune donnée ne quitte ce PC/);
  assert.ok(t.detail.indexOf('Electron') > t.detail.indexOf("Pour la personne qui s'occupe de l'informatique"));
  assert.equal(D.texteAPropos({ construction: '', donnees: 'd', partage: false }).message, 'Compta Blonay – version de développement');
});

/* ---------------------------------------------------------------- zone des messages */

test('les messages restent le temps d\'être lus ; les erreurs, jusqu\'à ce qu\'on les ferme', () => {
  assert.equal(Avis.duree('err'), null);
  assert.ok(Avis.duree('ok') >= 10000, 'une réussite ne disparaît plus au bout de 7 s');
  assert.ok(Avis.duree('warn') > Avis.duree('ok'));
  assert.equal(Avis.duree('ok', { keep: true }), null); // contrat de notice() : opts.keep
  assert.equal(Avis.duree('warn', { garder: true }), null);
  assert.equal(Avis.duree('ok', { actions: [{ texte: 'Créer la pièce maintenant', faire() {} }] }), null);
});

test('trop de messages : les plus anciens qui s\'effacent d\'eux-mêmes partent d\'abord, pas les erreurs', () => {
  const l = [{ persistant: true }, { persistant: false }, { persistant: false }, { persistant: true }, { persistant: false }];
  assert.deepEqual(Avis.aRetirer(l, 4), [1]);
  assert.deepEqual(Avis.aRetirer(l, 2), [1, 2, 4]);
  assert.deepEqual(Avis.aRetirer(l, 1), [1, 2, 4, 0]);
  assert.deepEqual(Avis.aRetirer(l.slice(0, 3), 4), []);
});

/* ---------------------------------------------------------------- feuille de style */

/** Les blocs @media (max-width: N px) de app.css : [{ max, corps }]. */
function blocsMedia(css) {
  const out = [];
  const re = /@media\s*\(max-width:\s*(\d+)px\)\s*\{/g;
  let m;
  while ((m = re.exec(css))) {
    let prof = 1; let i = re.lastIndex;
    while (prof && i < css.length) { if (css[i] === '{') prof++; else if (css[i] === '}') prof--; i++; }
    out.push({ max: Number(m[1]), corps: css.slice(re.lastIndex, i - 1) });
  }
  return out;
}
const regleCache = (corps, selecteur) => new RegExp(`(^|[,}\\s])${selecteur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[,{][^}]*display:\\s*none`).test(corps)
  || new RegExp(`${selecteur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*,[^{]*\\{[^}]*display:\\s*none`).test(corps);

test('les noms des espaces restent visibles aux largeurs courantes (1366, 1440, 1920 px)', () => {
  const css = lire('src/app.css');
  const blocs = blocsMedia(css);
  // les noms ne sont cachés qu'en dessous de 1366 px (et remplacés par un mot sous l'icône)
  const cachent = blocs.filter((b) => regleCache(b.corps, '.apptab .lbl'));
  assert.ok(cachent.length >= 1, 'règle introuvable : la feuille a changé, ce test doit suivre');
  for (const b of cachent) {
    assert.ok(b.max < 1366, `les noms des espaces disparaissent jusqu'à ${b.max} px`);
    assert.match(b.corps, /\.apptab \.court\s*\{[^}]*display:\s*block/, 'sans nom, un mot doit rester sous l\'icône');
  }
  // chaque entrée a son mot court et son nom
  const html = lire('src/index.html');
  const entrees = html.match(/<button type="button" class="apptab[^"]*"[^>]*>.*?<\/button>/g) || [];
  assert.ok(entrees.length >= 12);
  for (const e of entrees) {
    assert.match(e, /class="lbl"/, e.slice(0, 80));
    assert.match(e, /class="court">[^<]+</, e.slice(0, 80));
  }
});

test('les réglages de Décompte DGEO ne sont jamais cachés sans un bouton pour les ouvrir', () => {
  const css = lire('src/app.css');
  for (const b of blocsMedia(css).filter((x) => regleCache(x.corps, '.navnote'))) {
    assert.match(b.corps, /#btnDgeoReglages\s*\{[^}]*display:\s*flex/, `note cachée sous ${b.max} px sans bouton « Réglages »`);
    assert.match(b.corps, /\.navnote\.ouverte\s*\{[^}]*display:\s*block/);
  }
  const html = lire('src/index.html');
  assert.match(html, /id="btnDgeoReglages"/);
  // le volet du formulaire masqué laisse un bouton pour revenir
  assert.match(html, /id="btnDgeoFormShow"/);
  assert.doesNotMatch(html, /réglage dans la barre latérale/);
});

/* ---------------------------------------------------------------- vocabulaire */

test('plus d\'« onglet » ni de « 100 % local » à l\'écran, et « Données » s\'appelle « Listes »', () => {
  const html = lire('src/index.html');
  const shell = lire('desktop/shell.html');
  // textes affichés seulement : sans les commentaires
  const sansCommentaires = (t) => t.replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [nom, t] of [['index.html', html], ['shell.html', shell]]) {
    assert.doesNotMatch(sansCommentaires(t), /onglet/i, `${nom} parle encore d'onglet`);
    assert.doesNotMatch(t, /100 % local/, `${nom} annonce encore « 100 % local »`);
  }
  const main = sansCommentaires(lire('desktop/main.js'));
  for (const phrase of ["Cliquez sur l'onglet", 'dans deux onglets', 'page Releases', "Recharger l'application", 'aucune donnée ne quitte ce PC', 'registres, justificatifs, journal']) {
    assert.ok(!main.includes(phrase), `main.js dit encore « ${phrase} »`);
  }
  assert.match(html, /<span class="lbl">Listes<small>/);
  assert.match(html, /<h1>Listes<\/h1>/);
  assert.match(main, /label: "Mode d'emploi"/);
});
