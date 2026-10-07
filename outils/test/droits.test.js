// Les droits du dossier du travail mis de côté : la personne seule (et, sous Windows, le système et les administrateurs), sans jamais la priver
// de son propre dossier.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { argumentsIcacls, sidDeLaPersonne, dossierUtilisable, reserverAuProprietaire, SID_SYSTEME, SID_ADMINISTRATEURS } = require('../desktop/droits');

test('les arguments d\'icacls coupent l\'héritage et n\'accordent le contrôle qu\'à la personne, au système et aux administrateurs', () => {
  const a = argumentsIcacls('C:\\Aktum\\data\\Marie\\recuperation', 'S-1-5-21-111-222-333-1001');
  assert.deepStrictEqual(a, ['C:\\Aktum\\data\\Marie\\recuperation', '/inheritance:r', '/grant:r', '*S-1-5-21-111-222-333-1001:(OI)(CI)F', '/grant:r', '*S-1-5-18:(OI)(CI)F', '/grant:r', '*S-1-5-32-544:(OI)(CI)F']);
  assert.ok(a.every((x) => !/Everyone|Users|Authenticated|\*S-1-1-0|\*S-1-5-32-545/i.test(x)), 'aucun groupe large');
  assert.strictEqual(SID_SYSTEME, 'S-1-5-18'); assert.strictEqual(SID_ADMINISTRATEURS, 'S-1-5-32-544');
  // un identifiant qui n'en est pas un n'arrive jamais jusqu'à la ligne de commande
  for (const mauvais of ['', 'Marie', 'S-1-5-21-1 /grant Everyone:F', '*S-1-5-18', 'S-1-5-21-1;calc']) assert.throws(() => argumentsIcacls('x', mauvais), /illisible/);
});

test('l\'identifiant de la personne se lit dans la sortie de « whoami /user »', () => {
  assert.strictEqual(sidDeLaPersonne('"DESKTOP-ABC\\marie","S-1-5-21-1004336348-1177238915-682003330-1001"\r\n'), 'S-1-5-21-1004336348-1177238915-682003330-1001');
  assert.strictEqual(sidDeLaPersonne('"COMMUNE\\jean.dupont","S-1-12-1-2-3-4-5"'), 'S-1-12-1-2-3-4-5');
  assert.strictEqual(sidDeLaPersonne(''), null);
  assert.strictEqual(sidDeLaPersonne('erreur : accès refusé'), null);
});

test('sur macOS et Linux, le dossier devient celui de la personne seule', { skip: process.platform === 'win32' }, () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-droits-'));
  fs.chmodSync(d, 0o777);
  const r = reserverAuProprietaire(d);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(fs.statSync(d).mode & 0o777, 0o700);
  assert.ok(dossierUtilisable(d), 'la personne y écrit et y relit toujours');
  fs.rmSync(d, { recursive: true, force: true });
});

test('un dossier qui n\'existe pas ne lève rien : le résultat dit pourquoi', () => {
  const r = reserverAuProprietaire(path.join(os.tmpdir(), 'aktum-n-existe-pas-' + process.pid));
  assert.strictEqual(r.ok, false);
  assert.ok(String(r.sur).length > 0);
  assert.strictEqual(dossierUtilisable(path.join(os.tmpdir(), 'aktum-n-existe-pas-' + process.pid)), false);
});

test('le dépôt d\'un travail mis de côté est écrit en 0600 dans un dossier 0700, et le manifeste ne contient plus le texte reconnu', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'main.js'), 'utf8');
  assert.match(main, /mkdir\(dossierRecup\(\), \{ recursive: true, mode: 0o700 \}\)/);
  assert.match(main, /writeFile\(path\.join\(dir, f\.nom\), Buffer\.from\(f\.octets\), \{ mode: 0o600 \}\)/);
  assert.match(main, /writeFile\(tmp, JSON\.stringify\(m\), \{ mode: 0o600 \}\)/);
  assert.match(main, /droits\.reserverAuProprietaire\(dossierRecup\(\)\)/);
  const liv = fs.readFileSync(path.join(__dirname, '..', 'src', '60-livraison.js'), 'utf8');
  assert.match(liv, /ocr: p\.ocr \? \{ aRefaire: true, conf: p\.ocr\.conf, langues: p\.ocr\.langues, quand: p\.ocr\.quand \} : null/);
  assert.ok(!/ocr: p\.ocr \|\| null[^]*?retraits: p\.retraits \|\| \[\] \}\)\),\n/.test(liv.slice(liv.indexOf('function manifesteDe'), liv.indexOf('async function sauvegarderRecuperation'))), 'le manifeste n\'écrit plus l\'objet ocr entier');
});
