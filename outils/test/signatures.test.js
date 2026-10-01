// La vérification des signatures reçues : le verdict est recalculé (empreinte et signature
// cryptographique), et confronté à un contrôleur qui n'est pas le nôtre (pdfsig, de poppler)
// quand il est installé — en intégration continue il l'est, et son absence fait échouer.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { extraire } = require('./aide');

global.PDFLib = require(path.join(__dirname, '..', 'libs', 'cantoo-pdf-lib-2.11.0', 'dist', 'pdf-lib.js'));
const { verifierLesSignatures, derNoeud, derOid } = extraire('// @debut-signatures', '// @fin-signatures', '{ verifierLesSignatures, derNoeud, derOid }');
const FIX = n => new Uint8Array(fs.readFileSync(path.join(__dirname, '..', 'test-e2e', 'fixtures', n)));
const pdfsigDispo = spawnSync('pdfsig', ['-v']).error === undefined;

test('une signature RSA / SHA-256 : intacte, document entier couvert, auto-signée', async () => {
  const [s] = await verifierLesSignatures(FIX('decision-signee.pdf'));
  assert.strictEqual(s.etat, 'intacte');
  assert.strictEqual(s.octetsApres, 0);
  assert.strictEqual(s.signataire.sujet.champs.CN, 'Signataire d essai (non valide)');
  assert.strictEqual(s.signataire.autoSigne, true);
  assert.strictEqual(s.hachage, 'SHA-256');
  assert.ok(s.dateSignature instanceof Date);
  assert.strictEqual(s.champ, 'Signature1');
  assert.strictEqual(s.certification, 0);
});

test('un document certifié : le niveau de modification autorisé est lu', async () => {
  const [s] = await verifierLesSignatures(FIX('decision-certifiee.pdf'));
  assert.strictEqual(s.etat, 'intacte');
  assert.strictEqual(s.certification, 1, 'aucune modification autorisée');
});

test('ECDSA P-256, et RSA-3072 avec SHA-384 : intactes', async () => {
  const [e] = await verifierLesSignatures(FIX('signee-ecdsa.pdf'));
  assert.strictEqual(e.etat, 'intacte');
  assert.strictEqual(e.signataire.sujet.champs.CN, 'Signataire ECDSA d essai (non valide)');
  const [r] = await verifierLesSignatures(FIX('signee-sha384.pdf'));
  assert.strictEqual(r.etat, 'intacte');
  assert.strictEqual(r.hachage, 'SHA-384');
});

test('une chaîne de certificats : cohérente jusqu\'à une autorité qu\'on ne peut pas reconnaître', async () => {
  const [s] = await verifierLesSignatures(FIX('signee-chaine.pdf'));
  assert.strictEqual(s.etat, 'intacte');
  assert.strictEqual(s.chaine.length, 2);
  assert.strictEqual(s.chaine[0].signeParLeSuivant, true);
  assert.strictEqual(s.racine.sujet.champs.CN, 'Autorite d essai (non reconnue)');
  assert.strictEqual(s.signataire.autoSigne, false);
});

test('deux signatures : la première est intacte mais suivie, la seconde couvre tout', async () => {
  const [a, b] = await verifierLesSignatures(FIX('signee-deux.pdf'));
  assert.strictEqual(a.champ, 'Signature1');
  assert.strictEqual(b.champ, 'Signature2');
  assert.strictEqual(a.etat, 'intacte');
  assert.strictEqual(b.etat, 'intacte');
  assert.ok(a.octetsApres > 0, 'des octets ont été ajoutés après la première');
  assert.strictEqual(a.suivieDe.length, 1, 'ils sont la seconde signature');
  assert.strictEqual(b.octetsApres, 0);
});

// Altérer le fichier : un octet du contenu signé.
function alterer(octets, quand) {
  const o = new Uint8Array(octets);
  const i = quand(o);
  o[i] = o[i] === 0x41 ? 0x42 : 0x41;
  return o;
}
test('un octet changé dans le contenu signé : « altérée », avec la raison', async () => {
  const f = FIX('decision-signee.pdf');
  const modifie = alterer(f, o => 200);   // dans la première plage (en-tête et objets du document)
  const [s] = await verifierLesSignatures(modifie);
  assert.strictEqual(s.etat, 'alteree');
  assert.match(s.raison, /modifié depuis la signature/);
});

test('des données ajoutées après la signature : signature intacte, ajout signalé', async () => {
  const f = FIX('decision-signee.pdf');
  const ajout = Buffer.from('\n% une mise à jour ajoutée après coup\n');
  const plus = new Uint8Array(f.length + ajout.length);
  plus.set(f); plus.set(ajout, f.length);
  const [s] = await verifierLesSignatures(plus);
  assert.strictEqual(s.etat, 'intacte');
  assert.ok(s.octetsApres > 30);
  assert.strictEqual(s.suivieDe.length, 0);
  // une simple fin de ligne n'est pas un ajout
  const nl = new Uint8Array(f.length + 1); nl.set(f); nl[f.length] = 0x0a;
  assert.strictEqual((await verifierLesSignatures(nl))[0].octetsApres, 0);
});

test('une valeur de signature falsifiée (un octet de la signature elle-même) : « altérée »', async () => {
  const f = FIX('decision-signee.pdf');
  const txt = Buffer.from(f).toString('latin1');
  const debut = txt.indexOf('/Contents <') + '/Contents <'.length;
  // un chiffre hexadécimal vers la fin de la signature RSA (avant le bourrage de zéros)
  let i = debut + 600;
  const o = new Uint8Array(f);
  o[i] = o[i] === 0x30 ? 0x31 : 0x30;
  const [s] = await verifierLesSignatures(o);
  assert.ok(['alteree', 'illisible'].includes(s.etat), 'état : ' + s.etat);
  assert.notStrictEqual(s.etat, 'intacte');
});

test('une plage d\'octets qui ne désigne pas la valeur de la signature est refusée', async () => {
  const f = FIX('decision-signee.pdf');
  const txt = Buffer.from(f).toString('latin1');
  const m = /\/ByteRange \[(\d+) (\d+) (\d+) (\d+)\s*\]/.exec(txt);
  const faux = txt.replace(m[0], m[0].replace(m[3], String(Number(m[3]) + 8)));
  const [s] = await verifierLesSignatures(new Uint8Array(Buffer.from(faux, 'latin1')));
  assert.strictEqual(s.etat, 'illisible');
  assert.match(s.raison, /plage d'octets/);
});

test('un fichier sans signature : aucune', async () => {
  const doc = await PDFLib.PDFDocument.create();
  doc.addPage();
  assert.deepStrictEqual(await verifierLesSignatures(await doc.save()), []);
});

test('l\'analyseur ASN.1 lit les longueurs indéfinies du BER', () => {
  // SEQUENCE (longueur indéfinie) { OID 1.2.840.113549.1.7.2 } fin de contenu
  const o = new Uint8Array([0x30, 0x80, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02, 0x00, 0x00]);
  const n = derNoeud(o, 0, o.length);
  assert.strictEqual(n.indefini, true);
  assert.strictEqual(derOid(n.enfants[0]), '1.2.840.113549.1.7.2');
  assert.throws(() => derNoeud(new Uint8Array([0x30, 0x05, 0x01]), 0, 3), /longueur/);
});

// Le verdict n'est pas seulement le nôtre : pdfsig (poppler) juge les mêmes fichiers.
// Poppler n'est installé que sur le poste Linux de l'intégration continue ; ailleurs, le test se saute en le disant.
const sauteLe = process.platform !== 'linux' ? 'pdfsig n\'est installé que sous Linux' : (!pdfsigDispo && !process.env.CI ? 'pdfsig (poppler-utils) non installé sur ce poste' : false);
test('pdfsig, qui n\'est pas notre code, rend les mêmes verdicts', { skip: sauteLe }, async () => {
  assert.ok(pdfsigDispo, 'pdfsig doit être installé en intégration continue (poppler-utils)');
  const jugement = n => {
    const r = spawnSync('pdfsig', [path.join(__dirname, '..', 'test-e2e', 'fixtures', n)], { encoding: 'utf8' }).stdout;
    return Array.from(r.matchAll(/Signature Validation: (.*)/g)).map(m => /is Valid/.test(m[1]));
  };
  for (const n of ['decision-signee.pdf', 'decision-certifiee.pdf', 'signee-ecdsa.pdf', 'signee-sha384.pdf', 'signee-chaine.pdf', 'signee-deux.pdf']) {
    const nous = (await verifierLesSignatures(FIX(n))).map(s => s.etat === 'intacte');
    assert.deepStrictEqual(nous, jugement(n), n);
  }
  // Et sur un fichier altéré.
  const f = alterer(FIX('decision-signee.pdf'), () => 200);
  const tmp = path.join(require('os').tmpdir(), 'sig-altere-' + process.pid + '.pdf');
  fs.writeFileSync(tmp, f);
  const r = spawnSync('pdfsig', [tmp], { encoding: 'utf8' }).stdout;
  assert.match(r, /Signature Validation: Signature is Invalid|Digest Mismatch/i);
  assert.strictEqual((await verifierLesSignatures(f))[0].etat, 'alteree');
});
