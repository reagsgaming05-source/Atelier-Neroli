// Plusieurs secrétaires ouvrent la même application posée sur un partage : il
// faut que chacune retrouve ses tampons, et surtout qu'aucune ne puisse poser
// la signature d'une autre ni lire ses copies de récupération. C'est la
// décision testée ici — celle du dossier de données.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ouRanger, cheminReseau, POURQUOI, MARQUEUR, nomDeDossier, listerComptes } = require('../desktop/ou-ranger');

// Une sonde qui répond ce qu'on lui dit, et qui note ce qu'on lui a demandé :
// sur un partage, on ne veut même pas qu'un dossier « data » soit créé.
const sondeComplete = (o) => ({
  marqueurPose: () => !!o.marqueur,
  comptesOuverts: () => !!o.comptes,
  surLeReseau: () => !!o.reseau,
  dossierInscriptible: () => o.ecrit !== false,
});

const sonde = (marqueur, inscriptible) => {
  const vues = [];
  return {
    vues,
    marqueurPose: () => { vues.push('marqueur'); return marqueur; },
    dossierInscriptible: () => { vues.push('inscriptible'); return inscriptible; },
  };
};

test('un chemin UNC est reconnu comme un partage', () => {
  assert.equal(cheminReseau('\\\\serveur\\commun\\BlonayPDF'), true);
  assert.equal(cheminReseau('\\\\SRV-FICHIERS\\greffe\\outils\\BlonayPDF'), true);
  // Barres obliques : certains outils rendent le chemin dans l'autre sens.
  assert.equal(cheminReseau('//serveur/commun/BlonayPDF'), true);
});

test('un disque local n\'est pas un partage, même écrit en forme longue', () => {
  assert.equal(cheminReseau('C:\\Outils\\BlonayPDF'), false);
  assert.equal(cheminReseau('D:\\BlonayPDF'), false);
  // « \\?\C:\… » est la forme longue d'un chemin local : deux barres au début,
  // et pourtant rien de partagé. C'est le piège de cette détection.
  assert.equal(cheminReseau('\\\\?\\C:\\Outils\\BlonayPDF'), false);
  // « \\?\UNC\… », en revanche, est bien un partage.
  assert.equal(cheminReseau('\\\\?\\UNC\\serveur\\commun'), true);
  assert.equal(cheminReseau(''), false);
  assert.equal(cheminReseau(undefined), false);
});

test('sur un lecteur réseau, les comptes s\'ouvrent d\'eux-mêmes', () => {
  // C'est le cas d'un secrétariat : l'application posée sur le serveur, et
  // personne n'a rien eu à préparer. Chacune choisit son nom au premier
  // lancement et retrouve ensuite ses affaires.
  assert.deepEqual(ouRanger('\\\\serveur\\commun\\BlonayPDF', sondeComplete({ reseau: true })),
    { ou: 'comptes', pourquoi: 'reseau' });
  assert.deepEqual(ouRanger('P:\\Outils\\BlonayPDF', sondeComplete({ reseau: true })),
    { ou: 'comptes', pourquoi: 'reseau' });
});

test('un partage en lecture seule renvoie au profil Windows', () => {
  // Sans pouvoir écrire dans data, il n'y a pas de dossier par personne à
  // créer : chacune retombe sur son profil, et personne n'est bloqué.
  assert.deepEqual(ouRanger('P:\\Outils\\BlonayPDF', sondeComplete({ reseau: true, ecrit: false })),
    { ou: 'profil', pourquoi: 'lecture-seule' });
});

test('le marqueur l\'emporte sur tout : profil Windows, même sur un partage', () => {
  assert.deepEqual(ouRanger('P:\\Outils\\BlonayPDF', sondeComplete({ reseau: true, marqueur: true })),
    { ou: 'profil', pourquoi: 'marqueur' });
});

test('le marqueur force le rangement par utilisateur, lettre de lecteur comprise', () => {
  // Un partage monté sur S: ne se distingue pas d'un disque local : le fichier
  // posé à côté de l'exécutable est la seule façon de le dire.
  const s = sonde(true, true);
  assert.deepEqual(ouRanger('S:\\Outils\\BlonayPDF', s), { ou: 'profil', pourquoi: 'marqueur' });
  assert.ok(!s.vues.includes('inscriptible'), 'inutile de tâter le dossier, c\'est déjà tranché');
  assert.equal(MARQUEUR, 'donnees-par-utilisateur.txt');
  // Et la liste posée à la main ouvre les comptes, même hors réseau.
  assert.deepEqual(ouRanger('C:\\Outils\\BlonayPDF', sondeComplete({ comptes: true })),
    { ou: 'comptes', pourquoi: 'comptes' });
});

test('un dossier en lecture seule renvoie aussi au profil', () => {
  assert.deepEqual(ouRanger('C:\\Program Files\\BlonayPDF', sondeComplete({ ecrit: false })),
    { ou: 'profil', pourquoi: 'lecture-seule' });
});

test('sur une clé USB ou un poste seul, rien ne change : les données suivent l\'application', () => {
  assert.deepEqual(ouRanger('E:\\BlonayPDF', sondeComplete({})), { ou: 'cote', pourquoi: 'portable' });
  assert.deepEqual(ouRanger('C:\\Users\\moi\\Bureau\\BlonayPDF', sondeComplete({})),
    { ou: 'cote', pourquoi: 'portable' });
});

test('chaque raison a une phrase à montrer dans « À propos »', () => {
  for (const pourquoi of ['portable', 'reseau', 'marqueur', 'lecture-seule', 'comptes']) {
    assert.ok(POURQUOI[pourquoi] && POURQUOI[pourquoi].length > 20,
      'la raison « ' + pourquoi + ' » s\'explique à l\'utilisateur');
  }
});

// comptes.txt est écrit à la main, souvent au Bloc-notes, et les noms d'ici
// portent des accents. Selon la version de Windows, il arrive en UTF-8 avec ou
// sans marque d'ordre, en UTF-16, ou dans l'ancien codage de Windows. Lu de
// travers, « Sophie Müller » deviendrait un dossier au nom abîmé.
const NOMS = 'Sophie Müller\nJoséphine Aebi\n';
const ATTENDU = ['Joséphine Aebi', 'Sophie Müller'];

test('la liste des comptes se lit quel que soit l\'enregistrement du Bloc-notes', () => {
  const bom = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(NOMS, 'utf8')]);
  assert.deepEqual(listerComptes(Buffer.from(NOMS, 'utf8'), []), ATTENDU, 'UTF-8 sans marque');
  assert.deepEqual(listerComptes(bom, []), ATTENDU, 'UTF-8 avec marque d\'ordre');
  assert.deepEqual(listerComptes(Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(NOMS, 'utf16le')]), []),
    ATTENDU, 'UTF-16 petit-boutiste');
  assert.deepEqual(listerComptes(Buffer.from(NOMS, 'latin1'), []), ATTENDU, 'ancien codage de Windows');
  assert.deepEqual(listerComptes(NOMS, []), ATTENDU, 'et une chaîne, comme avant');
});

test('commentaires, lignes vides et doublons sont écartés de la liste', () => {
  const brut = '# le secrétariat\n\nMarie\n  Sophie  \nMarie\n';
  assert.deepEqual(listerComptes(brut, ['sophie', 'Zoé']), ['Marie', 'Sophie', 'Zoé'],
    'un dossier « sophie » déjà là ne fait pas doublon avec « Sophie » de la liste');
});

test('un nom impossible sous Windows ne devient pas un dossier', () => {
  assert.equal(nomDeDossier('Marie\\Dupont'), 'Marie Dupont', 'la barre oblique inverse est écartée');
  assert.equal(nomDeDossier(':*?"<>|'), null, 'un nom qui n\'est fait que de caractères interdits');
  assert.equal(nomDeDossier('Greffe : accueil'), 'Greffe accueil', 'les interdits sautent, le reste demeure');
  assert.equal(nomDeDossier('  '), null);
  assert.equal(nomDeDossier('LPT1'), null, 'un nom réservé par Windows');
  assert.equal(nomDeDossier('Marie.'), 'Marie', 'Windows n\'aime pas le point final');
  assert.equal(nomDeDossier('x'.repeat(80)).length, 48, 'un nom trop long est coupé');
});
