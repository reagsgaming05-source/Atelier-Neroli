// La mise à jour qui se propose toute seule : lire la fiche de version dans un
// zip sans le décompresser, décider si elle bat celle qui tourne, et savoir qui
// d'autre a l'application ouverte avant d'y toucher.
//
// Les zips d'essai sont écrits ici, octet par octet : rien à installer, et leur
// contenu est connu au caractère près. La preuve que le format est bien lu sur
// une archive produite par Windows lui-même est ailleurs — maj-test.js, joué
// par la CI sur le zip que PowerShell vient de fabriquer.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { zipDe } = require('./zip-dessai.js');

const {
  ficheDuZip, plusRecente, zipsPoses, miseAJourPosee,
  poserLeJeton, retirerLeJeton, autresPostes, nettoyerLesJetons, FRAICHEUR,
} = require('../desktop/version-posee.js');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'blonay-maj-'));
const VERSION = { construction: 'construite le 22.09.2026, commit abc1234', commit: 'abc1234', date: '2026-09-22T08:00:00.000Z' };
const poser = (dossier, nom, octets) => {
  const c = path.join(dossier, nom);
  fs.mkdirSync(path.dirname(c), { recursive: true });
  fs.writeFileSync(c, octets);
  return c;
};

// ---------------------------------------------------------------- lire le zip
test('la fiche de version se lit à la racine du zip', () => {
  const d = tmp();
  const z = poser(d, 'BlonayPDF-windows.zip', zipDe([
    { nom: 'BlonayPDF.exe', contenu: 'MZ...' },
    { nom: 'version.json', contenu: JSON.stringify(VERSION) },
  ]));
  assert.deepEqual(ficheDuZip(z), VERSION);
});

test('elle se lit aussi dans le dossier que porte le zip', () => {
  // C'est la forme que produit Windows : « Compress-Archive -Path dist\BlonayPDF »
  // range tout sous un dossier du même nom.
  const d = tmp();
  const z = poser(d, 'a.zip', zipDe([
    { nom: 'BlonayPDF/LISEZMOI.md', contenu: '# titre' },
    { nom: 'BlonayPDF/version.json', contenu: JSON.stringify(VERSION) },
  ]));
  assert.deepEqual(ficheDuZip(z), VERSION);
});

test('une fiche rangée sans compression se lit également', () => {
  const d = tmp();
  const z = poser(d, 'a.zip', zipDe([{ nom: 'version.json', contenu: JSON.stringify(VERSION), brut: true }]));
  assert.deepEqual(ficheDuZip(z), VERSION);
});

test('les données sont cherchées d\'après l\'en-tête local, pas d\'après l\'index', () => {
  // Les deux peuvent porter des longueurs différentes ; suivre l'index ferait
  // commencer la lecture quelques octets trop tôt et ne rendrait rien.
  const d = tmp();
  const z = poser(d, 'a.zip', zipDe([{ nom: 'version.json', contenu: JSON.stringify(VERSION), extra: 12 }]));
  assert.deepEqual(ficheDuZip(z), VERSION);
});

test('une archive qui range ses tailles après les données se lit quand même', () => {
  const d = tmp();
  const z = poser(d, 'a.zip', zipDe([{ nom: 'version.json', contenu: JSON.stringify(VERSION) }], { taillesEnFinDeFlux: true }));
  assert.deepEqual(ficheDuZip(z), VERSION);
});

test('un zip sans fiche, un fichier qui n\'est pas un zip, un zip tronqué : rien, sans lever', () => {
  const d = tmp();
  assert.equal(ficheDuZip(poser(d, 'sans.zip', zipDe([{ nom: 'BlonayPDF.exe', contenu: 'MZ' }]))), null);
  assert.equal(ficheDuZip(poser(d, 'faux.zip', Buffer.from('ceci n\'est pas une archive'))), null);
  const entier = zipDe([{ nom: 'version.json', contenu: JSON.stringify(VERSION) }]);
  assert.equal(ficheDuZip(poser(d, 'coupe.zip', entier.subarray(0, entier.length - 40))), null);
  assert.equal(ficheDuZip(path.join(d, 'absent.zip')), null);
});

test('une fiche illisible ne rend rien plutôt que de faire tomber l\'application', () => {
  const d = tmp();
  const z = poser(d, 'a.zip', zipDe([{ nom: 'version.json', contenu: '{ ceci n\'est pas du JSON' }]));
  assert.equal(ficheDuZip(z), null);
});

// ---------------------------------------------------------------- comparer
test('plus récente : seule une date sûre et postérieure vaut une proposition', () => {
  const vieille = { commit: 'aaa1111', date: '2026-09-01T10:00:00.000Z' };
  const neuve = { commit: 'bbb2222', date: '2026-09-22T08:00:00.000Z' };
  assert.equal(plusRecente(vieille, neuve), true);
  assert.equal(plusRecente(neuve, vieille), false, 'une version antérieure ne se propose pas');
  assert.equal(plusRecente(neuve, neuve), false, 'ni la même');
  assert.equal(plusRecente(vieille, null), false, 'ni un zip sans fiche');
  assert.equal(plusRecente(vieille, { date: 'la semaine passée' }), false, 'ni une date illisible');
  assert.equal(plusRecente({ date: '' }, neuve), false, 'ni quand on ignore ce qui tourne');
});

test('le même commit reconstruit ne se propose pas', () => {
  // Sinon le zip laissé à côté après la mise à jour se reproposerait sans fin.
  const installee = { commit: 'abc1234', date: '2026-09-22T08:00:00.000Z' };
  const rezippee = { commit: 'abc1234', date: '2026-09-23T09:00:00.000Z' };
  assert.equal(plusRecente(installee, rezippee), false);
});

// ---------------------------------------------------------------- chercher
test('le zip est cherché à côté de l\'exécutable et dans « maj »', () => {
  const d = tmp();
  poser(d, 'BlonayPDF-windows.zip', Buffer.alloc(4));
  poser(d, 'BlonayPDF-windows (1).ZIP', Buffer.alloc(4));
  poser(d, 'autre-chose.zip', Buffer.alloc(4));
  poser(d, 'BlonayPDF.exe', Buffer.alloc(4));
  poser(d, path.join('maj', 'BlonayPDF-windows.zip'), Buffer.alloc(4));
  const trouves = zipsPoses(d).map((c) => path.basename(c)).sort();
  assert.deepEqual(trouves, ['BlonayPDF-windows (1).ZIP', 'BlonayPDF-windows.zip', 'BlonayPDF-windows.zip']);
  assert.deepEqual(zipsPoses(path.join(d, 'nulle-part')), [], 'un dossier absent ne fait pas tomber');
});

test('entre plusieurs zips posés, c\'est la version la plus récente qui est retenue', () => {
  const d = tmp();
  const installee = { commit: 'aaa1111', date: '2026-09-01T10:00:00.000Z' };
  const fiche = (commit, date) => JSON.stringify({ construction: 'commit ' + commit, commit, date });
  poser(d, 'BlonayPDF-aout.zip', zipDe([{ nom: 'version.json', contenu: fiche('bbb2222', '2026-08-01T10:00:00.000Z') }]));
  poser(d, 'BlonayPDF-sept.zip', zipDe([{ nom: 'version.json', contenu: fiche('ccc3333', '2026-09-10T10:00:00.000Z') }]));
  poser(d, 'BlonayPDF-oct.zip', zipDe([{ nom: 'version.json', contenu: fiche('ddd4444', '2026-10-05T10:00:00.000Z') }]));
  const trouvee = miseAJourPosee(d, installee);
  assert.equal(trouvee.version.commit, 'ddd4444');
  assert.equal(path.basename(trouvee.zip), 'BlonayPDF-oct.zip');
  assert.equal(miseAJourPosee(d, { commit: 'zzz9999', date: '2026-12-01T10:00:00.000Z' }), null,
    'rien à proposer quand ce qui tourne est plus récent que tout ce qui traîne');
});

// ---------------------------------------------------------------- les jetons
test('les autres postes ouverts sont vus, le nôtre non', () => {
  const d = path.join(tmp(), 'data');
  const t = Date.now();
  const mien = poserLeJeton(d, 'PC-GREFFE-1', 1234, t);
  poserLeJeton(d, 'PC-ACCUEIL', 991, t - 30 * 1000);
  assert.deepEqual(autresPostes(d, mien, t), ['PC-ACCUEIL']);
  assert.deepEqual(autresPostes(d, null, t), ['PC-ACCUEIL', 'PC-GREFFE-1'], 'sans le nôtre, les deux sont là');
});

test('un jeton oublié par un poste éteint ne bloque pas la mise à jour', () => {
  const d = path.join(tmp(), 'data');
  const t = Date.now();
  poserLeJeton(d, 'PC-ETEINT', 42, t - FRAICHEUR - 1000);
  assert.deepEqual(autresPostes(d, null, t), []);
});

test('un jeton illisible est ignoré, et le nôtre s\'efface en partant', () => {
  const d = path.join(tmp(), 'data');
  const t = Date.now();
  const mien = poserLeJeton(d, 'PC-GREFFE-1', 1234, t);
  fs.writeFileSync(path.join(d, '.ouvert-abimé.json'), 'ceci n\'est pas du JSON');
  assert.deepEqual(autresPostes(d, mien, t), []);
  retirerLeJeton(mien);
  assert.equal(fs.existsSync(mien), false);
  assert.deepEqual(autresPostes(d, null, t), [], 'plus personne n\'a l\'application ouverte');
});

test('un dossier de données impossible à écrire ne fait pas tomber le lancement', () => {
  // Un partage en lecture seule, ou un chemin qui ne mène nulle part : le jeton
  // ne se pose pas, et c'est tout. On n'en saura pas qui travaille ailleurs,
  // mais personne ne se retrouve devant une application qui refuse de s'ouvrir.
  const fichier = path.join(tmp(), 'ceci-est-un-fichier');
  fs.writeFileSync(fichier, 'x');
  const impossible = path.join(fichier, 'data');
  assert.equal(poserLeJeton(impossible, 'PC', 1, Date.now()), null);
  assert.deepEqual(autresPostes(impossible, null, Date.now()), []);
});

test('les jetons des postes éteints depuis longtemps sont balayés', () => {
  // Sans cela, « data » collectionnerait un fichier par arrêt brutal, pour
  // toujours. Deux minutes suffisent à ne plus compter ; on efface au jour.
  const d = path.join(tmp(), 'data');
  const t = Date.now();
  const hier = poserLeJeton(d, 'PC-ETEINT', 1, t - 25 * 3600 * 1000);
  const recent = poserLeJeton(d, 'PC-OUVERT', 2, t - 30 * 1000);
  const abime = path.join(d, '.ouvert-rien.json');
  fs.writeFileSync(abime, 'pas du JSON');
  assert.equal(nettoyerLesJetons(d, t), 2, 'le vieux et l\'illisible partent');
  assert.equal(fs.existsSync(hier), false);
  assert.equal(fs.existsSync(abime), false);
  assert.equal(fs.existsSync(recent), true, 'celui qui travaille reste');
  assert.equal(nettoyerLesJetons(path.join(d, 'absent'), t), 0, 'un dossier absent ne fait pas tomber');
});
