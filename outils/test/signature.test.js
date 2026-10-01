// La preuve d'origine d'une archive de mise à jour : ce qui est signé s'accepte,
// et tout le reste — modifié, d'une autre plateforme, signé d'une autre clé,
// sans signature — se refuse. Aucun réseau : une paire de clés d'essai suffit.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sg = require('../desktop/signature');

function paire() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return { pem: privateKey.export({ format: 'pem', type: 'pkcs8' }), cle: { id: 'essai-' + crypto.randomBytes(2).toString('hex'), cle: sg.brute(publicKey) } };
}
function archive(contenu, opts) {
  const o = opts || {};
  const k = o.paire || paire();
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'blonay-sig-'));
  const zip = path.join(dossier, 'BlonayPDF-windows.zip');
  fs.writeFileSync(zip, contenu || crypto.randomBytes(5000));
  const corps = { v: 1, objet: 'maj', cle: k.cle.id, fichier: 'BlonayPDF-windows.zip', sha256: sg.empreinteFichier(zip), taille: fs.statSync(zip).size,
    version: '2.1.0', plateforme: o.plateforme || 'windows', canal: 'stable', critique: false, commit: 'abc1234', date: '2026-10-01T10:00:00.000Z' };
  fs.writeFileSync(zip + sg.SIGNATURE_DU_ZIP, JSON.stringify(sg.signer(corps, k.pem)));
  return { zip, k, dossier };
}

test('la sérialisation canonique ne dépend ni de l\'ordre ni des espaces', () => {
  assert.equal(sg.canonique({ b: 1, a: 'x', sig: 'ignoré' }), sg.canonique({ a: 'x', b: 1 }));
  assert.throws(() => sg.canonique({ a: { b: 1 } }), /valeur simple/);
});

test('une archive signée par la bonne clé s\'accepte', () => {
  const a = archive();
  const r = sg.verifierZip(a.zip, { cles: [a.k.cle], plateforme: 'windows' });
  assert.equal(r.ok, true, r.raison);
  assert.equal(r.piece.version, '2.1.0');
});

test('la signature se relit même réindentée par un éditeur de texte', () => {
  const a = archive();
  const f = a.zip + sg.SIGNATURE_DU_ZIP;
  fs.writeFileSync(f, JSON.stringify(JSON.parse(fs.readFileSync(f, 'utf8')), null, 4));
  assert.equal(sg.verifierZip(a.zip, { cles: [a.k.cle], plateforme: 'windows' }).ok, true);
});

test('un octet changé dans l\'archive, et elle est refusée', () => {
  const a = archive();
  const b = fs.readFileSync(a.zip); b[100] ^= 1; fs.writeFileSync(a.zip, b);
  const r = sg.verifierZip(a.zip, { cles: [a.k.cle], plateforme: 'windows' });
  assert.equal(r.ok, false);
  assert.match(r.raison, /modifié/);
});

test('une archive tronquée par une copie interrompue est refusée', () => {
  const a = archive();
  fs.writeFileSync(a.zip, fs.readFileSync(a.zip).subarray(0, 2000));
  assert.match(sg.verifierZip(a.zip, { cles: [a.k.cle], plateforme: 'windows' }).raison, /taille/);
});

test('une archive signée par une autre clé est refusée', () => {
  const a = archive();
  const autre = paire();
  assert.equal(sg.verifierZip(a.zip, { cles: [autre.cle], plateforme: 'windows' }).ok, false);
  const r = sg.verifierZip(a.zip, { cles: [Object.assign({}, autre.cle, { id: a.k.cle.id })], plateforme: 'windows' });
  assert.match(r.raison, /invalide/);
});

test('un pirate qui change la version ou le canal dans le fichier signé est refusé', () => {
  const a = archive();
  const f = a.zip + sg.SIGNATURE_DU_ZIP;
  const p = JSON.parse(fs.readFileSync(f, 'utf8'));
  p.version = '9.9.9'; fs.writeFileSync(f, JSON.stringify(p));
  assert.match(sg.verifierZip(a.zip, { cles: [a.k.cle], plateforme: 'windows' }).raison, /invalide/);
});

test('sans fichier de signature, sans clé embarquée, ou pour une autre plateforme : refusée, avec la raison', () => {
  const a = archive();
  fs.rmSync(a.zip + sg.SIGNATURE_DU_ZIP);
  assert.match(sg.verifierZip(a.zip, { cles: [a.k.cle], plateforme: 'windows' }).raison, /pas de fichier de signature/);
  const b = archive();
  assert.match(sg.verifierZip(b.zip, { cles: [], plateforme: 'windows' }).raison, /aucune clé/);
  const c = archive(null, { plateforme: 'mac' });
  assert.match(sg.verifierZip(c.zip, { cles: [c.k.cle], plateforme: 'windows' }).raison, /pour mac/);
});

test('deux clés publiques : la courante et la suivante, posée d\'avance', () => {
  const a = archive();
  const suivante = paire();
  assert.equal(sg.verifierZip(a.zip, { cles: [suivante.cle, a.k.cle], plateforme: 'windows' }).ok, true);
  const b = archive(null, { paire: suivante });
  assert.equal(sg.verifierZip(b.zip, { cles: [a.k.cle, suivante.cle], plateforme: 'windows' }).ok, true, 'signée par la suivante : acceptée par une application qui la connaît');
});

test('la liste des clés publiques livrée vient d\'un fichier, et se laisse remplacer pour les essais', () => {
  const k = paire();
  process.env.BLONAY_CLES_PUBLIQUES_ESSAI = JSON.stringify({ maj: [k.cle] });
  try { assert.deepEqual(sg.lireCles().maj, [k.cle]); } finally { delete process.env.BLONAY_CLES_PUBLIQUES_ESSAI; }
  const livre = sg.lireCles();
  assert.ok(Array.isArray(livre.maj) && Array.isArray(livre.licence));
});
