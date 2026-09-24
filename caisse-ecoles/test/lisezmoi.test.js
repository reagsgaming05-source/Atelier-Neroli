/*
 * Le LISEZMOI livré dans le zip est la seule aide que les collègues ouvrent. Chaque bouton,
 * menu ou message qu'il cite entre « » doit exister tel quel à l'écran : un libellé renommé
 * sans que le mode d'emploi suive, c'est une personne bloquée à l'étape qui le cite.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const LISEZMOI = fs.readFileSync(path.join(RACINE, 'desktop', 'build', 'LISEZMOI-portable.txt'), 'utf8');

/**
 * Ce que le LISEZMOI cite sans que ce soit un texte de Compta Blonay : les écrans de Windows,
 * un exemple, un nom de dossier, et les libellés de Décompte DGEO (construit à part).
 */
const HORS_APPLICATION = new Map([
  ['Windows a protégé votre ordinateur', 'Windows SmartScreen'],
  ['Informations complémentaires', 'Windows SmartScreen'],
  ['Exécuter quand même', 'Windows SmartScreen'],
  ['Ce PC', "l'Explorateur de Windows"],
  ['commun (\\\\ecole-srv) (S:)', "exemple d'un lecteur réseau dans l'Explorateur"],
  ['data', 'nom du dossier des données, à côté du programme'],
  ['Créer le fichier Excel du décompte', 'Décompte DGEO (son propre dépôt)'],
]);

/** Les textes que l'application peut afficher : pages, fenêtre, menus, installateur, lanceur. */
function corpus() {
  const fichiers = [];
  const ajouter = (dossier, filtre) => {
    for (const f of fs.readdirSync(dossier)) if (filtre.test(f)) fichiers.push(path.join(dossier, f));
  };
  ajouter(path.join(RACINE, 'src'), /\.(js|html)$/);
  ajouter(path.join(RACINE, 'desktop'), /\.(js|html)$/);
  ajouter(path.join(RACINE, 'desktop', 'build'), /\.cmd$/);
  return fichiers.map((f) => normaliser(fs.readFileSync(f, 'utf8'))).join('\n');
}

function normaliser(t) {
  return t
    .replace(/&amp;/g, '&').replace(/&nbsp;|&#160;/g, ' ').replace(/&#39;|&apos;|’/g, "'")
    .replace(/\\'/g, "'")
    .replace(/\.\.\./g, '…')
    .replace(/\s+/g, ' ');
}

/** Les citations « … » du LISEZMOI, retours à la ligne compris. */
function citations(texte) {
  const vues = new Set();
  for (const m of texte.matchAll(/«\s*([^»]+?)\s*»/g)) vues.add(m[1].replace(/\s+/g, ' '));
  return Array.from(vues);
}

/**
 * Une citation se retrouve dans le corpus : telle quelle ; sans ses points de suspension
 * (« Mise à jour… » abrège « Mise à jour de Compta Blonay depuis le serveur… ») ; et « N » y
 * tient la place d'un nombre calculé (« Joindre les N pièces reconnues »).
 */
function trouvee(citation, texte) {
  const brute = normaliser(citation).replace(/…$/, '');
  const motif = brute.split(/\bN\b/).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(?:\\$\\{[^}]*\\}|\\d+)');
  return new RegExp(motif).test(texte);
}

test('chaque libellé cité entre « » dans le LISEZMOI existe dans l\'application', () => {
  const texte = corpus();
  const absentes = citations(LISEZMOI).filter((c) => !HORS_APPLICATION.has(c) && !trouvee(c, texte));
  assert.deepEqual(absentes, [], `Libellés du LISEZMOI introuvables dans l'application : ${absentes.join(' | ')}`);
});

test("les exceptions servent encore : une citation retirée du LISEZMOI sort aussi de la liste", () => {
  const cites = new Set(citations(LISEZMOI));
  const inutiles = Array.from(HORS_APPLICATION.keys()).filter((c) => !cites.has(c));
  assert.deepEqual(inutiles, []);
});

test("la vérification attrape bien un libellé qui n'existe pas", () => {
  const texte = corpus();
  assert.ok(!trouvee('Générer la pièce de fantaisie', texte));
  assert.ok(trouvee('Joindre les N pièces reconnues', texte), '« N » vaut un nombre calculé');
  assert.ok(trouvee('Recherche d\'une nouvelle version…', texte), 'points de suspension : début du message');
});

test("le LISEZMOI ne parle plus de ce qui n'existe plus", () => {
  // plus d'onglets depuis la barre latérale ; le lanceur a changé de nom et de dossier ;
  // le README technique n'est plus livré sous le nom LISEZMOI
  for (const perime of [/onglet/i, /Compta Blonay\.cmd/, /LISEZMOI\.md/, /Ajouter au registre/]) {
    assert.ok(!perime.test(LISEZMOI), `LISEZMOI : ${perime}`);
  }
});

test('le LISEZMOI tient dans une fenêtre du Bloc-notes : pas de ligne de plus de 96 caractères', () => {
  const longues = LISEZMOI.split(/\r?\n/).map((l, i) => [i + 1, l]).filter(([, l]) => l.length > 96);
  assert.deepEqual(longues, []);
});

test("Aide → Mode d'emploi ouvre le fichier sous le nom qu'il porte dans le zip", () => {
  const flux = fs.readFileSync(path.join(RACINE, '..', '.github', 'workflows', 'build-caisse-windows.yml'), 'utf8');
  const copie = /Copy-Item build\\LISEZMOI-portable\.txt dist\\ComptaBlonay\\(\S+)/.exec(flux);
  assert.ok(copie, 'la construction copie le LISEZMOI dans le zip');
  const main = fs.readFileSync(path.join(RACINE, 'desktop', 'main.js'), 'utf8');
  // les fichiers que le menu essaie d'ouvrir : la liste passée à .find(), pas le message d'erreur
  const f = /function ouvrirModeEmploi\(\) \{[\s\S]*?const f = \[([^\]]*)\]\.find/.exec(main);
  assert.ok(f, 'ouvrirModeEmploi dans main.js');
  assert.ok(f[1].includes(`path.join(PORTABLE_DIR, '${copie[1]}')`), `main.js doit ouvrir ${copie[1]}`);
});
