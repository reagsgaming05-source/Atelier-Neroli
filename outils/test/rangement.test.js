// Plusieurs secrétaires ouvrent la même application posée sur un partage : il
// faut que chacune retrouve ses tampons, et surtout qu'aucune ne puisse poser
// la signature d'une autre ni lire ses copies de récupération. C'est la
// décision testée ici — celle du dossier de données.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ouRanger, cheminReseau, POURQUOI, MARQUEUR } = require('../desktop/ou-ranger');

// Une sonde qui répond ce qu'on lui dit, et qui note ce qu'on lui a demandé :
// sur un partage, on ne veut même pas qu'un dossier « data » soit créé.
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

test('sur un partage, chacun range dans son profil', () => {
  const s = sonde(false, true);
  assert.deepEqual(ouRanger('\\\\serveur\\commun\\BlonayPDF', s), { ou: 'profil', pourquoi: 'reseau' });
  assert.deepEqual(s.vues, [], 'le disque n\'est même pas interrogé : aucun dossier « data » n\'est créé sur le partage');
});

test('le marqueur force le rangement par utilisateur, lettre de lecteur comprise', () => {
  // Un partage monté sur S: ne se distingue pas d'un disque local : le fichier
  // posé à côté de l'exécutable est la seule façon de le dire.
  const s = sonde(true, true);
  assert.deepEqual(ouRanger('S:\\Outils\\BlonayPDF', s), { ou: 'profil', pourquoi: 'marqueur' });
  assert.ok(!s.vues.includes('inscriptible'), 'inutile de tâter le dossier, c\'est déjà tranché');
  assert.equal(MARQUEUR, 'donnees-par-utilisateur.txt');
});

test('un dossier en lecture seule renvoie aussi au profil', () => {
  assert.deepEqual(ouRanger('C:\\Program Files\\BlonayPDF', sonde(false, false)),
    { ou: 'profil', pourquoi: 'lecture-seule' });
});

test('sur une clé USB ou un poste seul, rien ne change : les données suivent l\'application', () => {
  const s = sonde(false, true);
  assert.deepEqual(ouRanger('E:\\BlonayPDF', s), { ou: 'cote', pourquoi: 'portable' });
  assert.deepEqual(ouRanger('C:\\Users\\moi\\Bureau\\BlonayPDF', sonde(false, true)),
    { ou: 'cote', pourquoi: 'portable' });
  assert.deepEqual(s.vues, ['marqueur', 'inscriptible'], 'les deux questions sont posées dans cet ordre');
});

test('chaque raison a une phrase à montrer dans « À propos »', () => {
  for (const pourquoi of ['portable', 'reseau', 'marqueur', 'lecture-seule']) {
    assert.ok(POURQUOI[pourquoi] && POURQUOI[pourquoi].length > 20,
      'la raison « ' + pourquoi + ' » s\'explique à l\'utilisateur');
  }
});
