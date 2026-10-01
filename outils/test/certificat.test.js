// Signer avec un certificat PKCS#12 : lecture du fichier, signature, et relecture de ce qui
// vient d'être signé — par notre vérificateur, puis par pdfsig (poppler) qui n'est pas notre code.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { extraire } = require('./aide');

// Le même code que celui du paquet navigateur, dans sa version pour Node (le paquet navigateur,
// lui, est essayé dans un vrai navigateur par la suite de bout en bout).
global.forge = require(path.join(__dirname, '..', 'libs', 'node-forge-1.3.1', 'lib', 'index.js'));
global.PDFLib = require(path.join(__dirname, '..', 'libs', 'cantoo-pdf-lib-2.11.0', 'dist', 'pdf-lib.js'));
const { certificatLire, signerPdf } = extraire('// @debut-certificat', '// @fin-certificat', '{ certificatLire, signerPdf }');
const { verifierLesSignatures } = extraire('// @debut-signatures', '// @fin-signatures', '{ verifierLesSignatures }');
const F = global.forge;

// Une autorité d'essai et un signataire, jetables : créés ici, jamais écrits dans le dépôt.
function faireCertificat(cn, o, cleParent, certParent, ca) {
  const paire = F.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  const c = F.pki.createCertificate();
  c.publicKey = paire.publicKey;
  c.serialNumber = '0' + Math.floor(Math.random() * 1e9).toString(16);
  c.validity.notBefore = new Date(Date.now() - 86400000);
  c.validity.notAfter = new Date(Date.now() + 5 * 365 * 86400000);
  const attrs = [{ name: 'commonName', value: cn }, { name: 'organizationName', value: o }];
  c.setSubject(attrs);
  c.setIssuer(certParent ? certParent.subject.attributes : attrs);
  c.setExtensions([{ name: 'basicConstraints', cA: !!ca }]);
  c.sign(cleParent || paire.privateKey, F.md.sha256.create());
  return { cle: paire.privateKey, cert: c };
}
const autorite = faireCertificat('Autorite d essai (non reconnue)', 'Essai', null, null, true);
const signataire = faireCertificat('Signataire d essai (non valide)', 'Essai', autorite.cle, autorite.cert, false);
const p12 = (algo, mdp) => new Uint8Array(Buffer.from(F.asn1.toDer(F.pkcs12.toPkcs12Asn1(signataire.cle, [signataire.cert, autorite.cert], mdp, { algorithm: algo, generateLocalKeyId: true })).getBytes(), 'binary'));

async function pdfDeDeuxPages(rotation) {
  const doc = await PDFLib.PDFDocument.create();
  const f = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  for (let i = 0; i < 2; i++) { const p = doc.addPage([595, 842]); p.drawText('Page ' + (i + 1), { x: 70, y: 760, size: 14, font: f }); if (rotation) p.setRotation(PDFLib.degrees(rotation)); }
  return doc.save();
}
const jugePdfsig = (octets) => {
  const f = path.join(os.tmpdir(), 'cert-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.pdf');
  fs.writeFileSync(f, octets);
  return spawnSync('pdfsig', [f], { encoding: 'utf8' }).stdout;
};
const pdfsigDispo = spawnSync('pdfsig', ['-v']).error === undefined && process.platform === 'linux';

test('un certificat .p12 se lit avec son mot de passe, en 3DES comme en AES-256', () => {
  ['3des', 'aes256'].forEach(algo => {
    const r = certificatLire(p12(algo, 'secret'), 'secret');
    assert.strictEqual(r.resume.sujet, 'Signataire d essai (non valide)');
    assert.strictEqual(r.resume.organisation, 'Essai');
    assert.strictEqual(r.resume.emetteur, 'Autorite d essai (non reconnue)');
    assert.strictEqual(r.resume.autoSigne, false);
    assert.strictEqual(r.resume.chaine, 1, 'l\'autorité est dans la chaîne');
    assert.strictEqual(r.resume.expire, false);
  });
});

test('un mauvais mot de passe, ou un fichier qui n\'en est pas un, sont dits en clair', () => {
  assert.throws(() => certificatLire(p12('aes256', 'secret'), 'autre'), /Mot de passe incorrect/);
  assert.throws(() => certificatLire(new Uint8Array([1, 2, 3, 4]), 'x'), /n'est pas un certificat/);
});

test('un certificat sans sa clé, ou expiré, est reconnu comme tel', () => {
  const sansCle = new Uint8Array(Buffer.from(F.asn1.toDer(F.pkcs12.toPkcs12Asn1(null, [autorite.cert], 'secret', {})).getBytes(), 'binary'));
  assert.throws(() => certificatLire(sansCle, 'secret'), /ne contient pas de clé RSA/);
});

test('un PDF signé (invisible) se relit intact : signataire, chaîne, document entier couvert', async () => {
  const lu = certificatLire(p12('aes256', 'secret'), 'secret');
  const date = new Date('2026-10-01T10:00:00Z');
  const signe = await signerPdf(await pdfDeDeuxPages(0), { certificat: lu, raison: 'Approbation', lieu: 'Mairie', date });
  const [s] = await verifierLesSignatures(signe);
  assert.strictEqual(s.etat, 'intacte', s.raison);
  assert.strictEqual(s.octetsApres, 0);
  assert.strictEqual(s.signataire.sujet.champs.CN, 'Signataire d essai (non valide)');
  assert.strictEqual(s.raison, 'Approbation');
  assert.strictEqual(s.lieu, 'Mairie');
  assert.strictEqual(s.chaine.length, 2);
  assert.strictEqual(s.hachage, 'SHA-256');
  assert.strictEqual(s.dateSignature.toISOString(), date.toISOString());
  assert.strictEqual(s.champ, 'Signature1');
  // la plus petite altération se voit
  const alt = new Uint8Array(signe); alt[120] = alt[120] === 0x41 ? 0x42 : 0x41;
  assert.strictEqual((await verifierLesSignatures(alt))[0].etat, 'alteree');
});

test('le fichier signé est jugé valide par pdfsig, qui n\'est pas notre code', { skip: pdfsigDispo ? false : 'pdfsig n\'est installé que sous Linux (poppler-utils)' }, async () => {
  const lu = certificatLire(p12('3des', 'secret'), 'secret');
  const signe = await signerPdf(await pdfDeDeuxPages(0), { certificat: lu, raison: 'Essai', date: new Date() });
  const r = jugePdfsig(signe);
  assert.match(r, /Signature Validation: Signature is Valid/);
  assert.match(r, /Total document signed/);
  assert.match(r, /Signer Certificate Common Name: Signataire d essai \(non valide\)/);
  assert.match(r, /adbe\.pkcs7\.detached/);
  const alt = new Uint8Array(signe); alt[120] = alt[120] === 0x41 ? 0x42 : 0x41;
  assert.doesNotMatch(jugePdfsig(alt), /Signature is Valid/);
});

test('un cartouche visible : placé dans le coin demandé de la page, y compris sur une page pivotée', async () => {
  const lu = certificatLire(p12('aes256', 'secret'), 'secret');
  const rects = {};
  for (const angle of [0, 90, 180, 270]) {
    const signe = await signerPdf(await pdfDeDeuxPages(angle), { certificat: lu, date: new Date(), visible: { page: 2, coin: 'bas-droite' } });
    assert.strictEqual((await verifierLesSignatures(signe))[0].etat, 'intacte', 'rotation ' + angle);
    const doc = await PDFLib.PDFDocument.load(signe);
    const annots = doc.getPages()[1].node.Annots();
    const w = annots.lookup(annots.size() - 1);
    rects[angle] = Array.from({ length: 4 }, (_, i) => w.lookup(PDFLib.PDFName.of('Rect')).lookup(i).asNumber());
  }
  // Page non pivotée : en bas à droite, avec la marge de 24 points.
  assert.deepStrictEqual(rects[0].map(Math.round), [595 - 200 - 24, 24, 595 - 24, 24 + 58]);
  // Pivotée de 90° (vue : 842 de large, 595 de haut) : le coin bas-droite de la vue est le coin haut-droite... du fichier.
  assert.ok(rects[90][2] - rects[90][0] === 58 && rects[90][3] - rects[90][1] === 200, 'les dimensions sont échangées');
  assert.ok(rects[180][2] - rects[180][0] === 200 && rects[180][3] - rects[180][1] === 58);
  // sur la page 1, aucun cartouche
  const signe = await signerPdf(await pdfDeDeuxPages(0), { certificat: lu, date: new Date(), visible: { page: 2, coin: 'haut-gauche' } });
  const doc = await PDFLib.PDFDocument.load(signe);
  const a1 = doc.getPages()[0].node.Annots();
  assert.strictEqual(a1 ? a1.size() : 0, 0);
});

test('un fichier .p12 fabriqué par openssl (AES-256 et ancien format) se lit et signe', { skip: pdfsigDispo && spawnSync('openssl', ['version']).error === undefined ? false : 'openssl absent' }, async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'p12-'));
  fs.writeFileSync(path.join(d, 'k.pem'), F.pki.privateKeyToPem(signataire.cle));
  fs.writeFileSync(path.join(d, 'c.pem'), F.pki.certificateToPem(signataire.cert));
  for (const options of [[], ['-legacy']]) {
    const r = spawnSync('openssl', ['pkcs12', '-export', '-inkey', path.join(d, 'k.pem'), '-in', path.join(d, 'c.pem'), '-out', path.join(d, 'o.p12'), '-passout', 'pass:essai', ...options], { encoding: 'utf8' });
    if (r.status !== 0) continue;   // « -legacy » n'existe pas dans toutes les versions d'openssl
    const lu = certificatLire(new Uint8Array(fs.readFileSync(path.join(d, 'o.p12'))), 'essai');
    assert.strictEqual(lu.resume.sujet, 'Signataire d essai (non valide)');
    const signe = await signerPdf(await pdfDeDeuxPages(0), { certificat: lu, date: new Date() });
    assert.strictEqual((await verifierLesSignatures(signe))[0].etat, 'intacte');
  }
});
