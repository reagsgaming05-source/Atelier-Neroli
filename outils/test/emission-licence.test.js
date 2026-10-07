// L'outil d'émission des licences, sur le poste de l'éditeur : il émet un fichier que l'application accepte, et tient un registre local.
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { brute } = require('../desktop/signature');
const { lireLeFichier } = require('../desktop/licence');

function emettre(args, cles, dossierCles, travail) {
  return spawnSync(process.execPath, [path.join(__dirname, '..', 'editeur', 'emettre-licence.js'), ...args], {
    cwd: travail, encoding: 'utf8',
    env: { ...process.env, AKTUM_CLES_PUBLIQUES_ESSAI: JSON.stringify(cles), AKTUM_CLES_DIR: dossierCles },
  });
}

test('une licence émise passe la vérification de l\'application, et chaque émission laisse une ligne au registre local', () => {
  const travail = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-emission-'));
  const dossierCles = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-cles-'));
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pem = path.join(dossierCles, 'licence-essai.pem');
  fs.writeFileSync(pem, privateKey.export({ format: 'pem', type: 'pkcs8' }), { mode: 0o600 });
  const cles = { maj: [], licence: [{ id: 'essai', cle: brute(publicKey) }] };

  let r = emettre(['--client', 'Commune d\'Essai', '--ide', 'CHE-000.000.000', '--postes', '10', '--id', 'BLP-2026-0001', '--maj-jusqu', '2027-10-01'], cles, dossierCles, travail);
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /Licence BLP-2026-0001 émise/);
  const fichier = path.join(travail, 'BLP-2026-0001.licence.json');
  assert.ok(fs.existsSync(fichier));

  // L'application la lit comme elle lira celle d'un client.
  const poste = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-poste-'));
  fs.copyFileSync(fichier, path.join(poste, 'licence.json'));
  const lu = lireLeFichier(poste, cles.licence);
  assert.strictEqual(lu.ok, true, JSON.stringify(lu));

  // Le registre : une ligne, avec l'empreinte du fichier remis et le corps signé.
  const registre = path.join(dossierCles, 'registre-licences.jsonl');
  let lignes = fs.readFileSync(registre, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  assert.strictEqual(lignes.length, 1);
  assert.strictEqual(lignes[0].id, 'BLP-2026-0001');
  assert.strictEqual(lignes[0].client, 'Commune d\'Essai');
  assert.strictEqual(lignes[0].reemission, false);
  assert.strictEqual(lignes[0].empreinte, crypto.createHash('sha256').update(fs.readFileSync(fichier)).digest('hex'));
  assert.ok(lignes[0].corps && lignes[0].corps.sig, 'le corps signé est gardé tel quel');

  // Une seconde émission pour le même client est tracée comme une réémission.
  r = emettre(['--client', 'Commune d\'Essai', '--ide', 'CHE-000.000.000', '--postes', '10', '--id', 'BLP-2026-0002', '--maj-jusqu', '2028-10-01'], cles, dossierCles, travail);
  assert.strictEqual(r.status, 0, r.stderr);
  lignes = fs.readFileSync(registre, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  assert.strictEqual(lignes.length, 2);
  assert.strictEqual(lignes[1].reemission, true);
  assert.match(r.stdout, /réémission/);
});

test('sans clé privée correspondant à une clé publique connue, rien n\'est émis', () => {
  const travail = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-emission-'));
  const dossierCles = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-cles-'));
  const { privateKey } = crypto.generateKeyPairSync('ed25519');
  const pem = path.join(dossierCles, 'licence-intruse.pem');
  fs.writeFileSync(pem, privateKey.export({ format: 'pem', type: 'pkcs8' }), { mode: 0o600 });
  const r = emettre(['--client', 'Quelqu\'un', '--id', 'BLP-X'], { maj: [], licence: [] }, dossierCles, travail);
  assert.notStrictEqual(r.status, 0);
  assert.ok(!fs.existsSync(path.join(travail, 'BLP-X.licence.json')));
  assert.ok(!fs.existsSync(path.join(dossierCles, 'registre-licences.jsonl')));
});
