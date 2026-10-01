// La licence : un fichier signé, lu sans réseau. Ce qui est signé s'accepte ; l'essai
// court depuis le premier lancement, survit à une recopie du dossier, et ne bloque
// personne quand l'écriture échoue ; l'essai fini ne détruit rien.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sg = require('../desktop/signature');
const lic = require('../desktop/licence');

const J = 24 * 3600 * 1000;
const T0 = Date.parse('2026-10-01T10:00:00Z');
function paire() { const k = crypto.generateKeyPairSync('ed25519'); return { pem: k.privateKey.export({ format: 'pem', type: 'pkcs8' }), cle: { id: 'lic-essai', cle: sg.brute(k.publicKey) } }; }
function dossierAvec(corps, k) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-lic-'));
  if (corps) fs.writeFileSync(path.join(d, 'licence.json'), JSON.stringify(sg.signer(Object.assign({ v: 1, objet: 'licence', cle: k.cle.id, id: 'BLP-2026-0001', client: 'Commune d\'Essai', ide: 'CHE-000.000.000', postes: 10, modele: 'site', emise: '2026-10-01', majJusqu: '2027-10-01' }, corps), k.pem)));
  return d;
}
const memoire = () => { let v = null; return { lire: () => v, ecrire: (x) => { v = x; return true; }, get valeur() { return v; } }; };

test('sans aucune clé de licence embarquée : version interne, aucune contrainte', () => {
  const e = lic.etatDeLaLicence({ dossier: dossierAvec(null), cles: [], maintenant: T0 });
  assert.equal(e.etat, 'interne');
  assert.match(lic.description(e), /non licenciée/);
});

test('un fichier signé donne une licence, avec le nom du client et le nombre de postes', () => {
  const k = paire();
  const e = lic.etatDeLaLicence({ dossier: dossierAvec({}, k), cles: [k.cle], maintenant: T0, essai: memoire() });
  assert.equal(e.etat, 'licence');
  assert.equal(e.client, 'Commune d\'Essai');
  assert.equal(e.postes, 10);
  assert.match(lic.description(e), /Commune d'Essai — 10 postes — mises à jour comprises jusqu.au 2027-10-01/);
});

test('porter les postes de 10 à 400 dans le fichier signé : rejeté', () => {
  const k = paire();
  const d = dossierAvec({}, k);
  const f = path.join(d, 'licence.json');
  const p = JSON.parse(fs.readFileSync(f, 'utf8')); p.postes = 400; fs.writeFileSync(f, JSON.stringify(p));
  const e = lic.etatDeLaLicence({ dossier: d, cles: [k.cle], maintenant: T0, essai: memoire() });
  assert.equal(e.etat, 'essai', 'on retombe sur l\'essai, jamais sur « interne »');
  assert.match(e.invalide, /signature de la licence est invalide/);
});

test('retirer la ligne sig, un autre éditeur, un fichier qui n\'est pas du JSON : rejetés avec la raison', () => {
  const k = paire();
  const d = dossierAvec({}, k);
  const f = path.join(d, 'licence.json');
  const p = JSON.parse(fs.readFileSync(f, 'utf8')); delete p.sig; fs.writeFileSync(f, JSON.stringify(p));
  assert.match(lic.lireLeFichier(d, [k.cle]).raison, /sans signature/);
  const autre = paire();
  assert.match(lic.lireLeFichier(dossierAvec({}, k), [autre.cle]).raison, /clé que cette application ne connaît pas|invalide/);
  fs.writeFileSync(f, 'pas du json');
  assert.match(lic.lireLeFichier(d, [k.cle]).raison, /illisible/);
  assert.equal(lic.lireLeFichier(dossierAvec(null), [k.cle]).absente, true);
});

test('la signature tient quand un éditeur de texte réindente le fichier', () => {
  const k = paire();
  const d = dossierAvec({}, k);
  const f = path.join(d, 'licence.json');
  fs.writeFileSync(f, '﻿' + JSON.stringify(JSON.parse(fs.readFileSync(f, 'utf8')), null, 8));
  assert.equal(lic.lireLeFichier(d, [k.cle]).ok, true);
});

test('l\'essai court depuis le premier lancement : quarante-cinq jours, puis fini', () => {
  const k = paire();
  const d = dossierAvec(null);
  const ancre = memoire();
  const a = lic.etatDeLaLicence({ dossier: d, cles: [k.cle], maintenant: T0, essai: ancre });
  assert.equal(a.etat, 'essai');
  assert.equal(a.joursRestants, 45);
  assert.equal(ancre.valeur, new Date(T0).toISOString(), 'le premier lancement pose l\'ancre');
  const b = lic.etatDeLaLicence({ dossier: d, cles: [k.cle], maintenant: T0 + 40 * J, essai: ancre });
  assert.equal(b.joursRestants, 5);
  assert.match(lic.description(b), /5 jours restants/);
  const c = lic.etatDeLaLicence({ dossier: d, cles: [k.cle], maintenant: T0 + 46 * J, essai: ancre });
  assert.equal(c.etat, 'essai-fini');
});

test('décompresser le zip une seconde fois ne remet pas l\'essai à zéro : l\'ancre est dans le profil', () => {
  const k = paire();
  const ancre = memoire();
  lic.etatDeLaLicence({ dossier: dossierAvec(null), cles: [k.cle], maintenant: T0, essai: ancre });
  const autreDossier = dossierAvec(null);
  const e = lic.etatDeLaLicence({ dossier: autreDossier, cles: [k.cle], maintenant: T0 + 50 * J, essai: ancre });
  assert.equal(e.etat, 'essai-fini');
});

test('si l\'écriture de l\'ancre échoue, l\'essai continue : on ne bloque pas un client sérieux', () => {
  const k = paire();
  const cassee = { lire: () => null, ecrire: () => { throw new Error('partage en lecture seule'); } };
  const e = lic.etatDeLaLicence({ dossier: dossierAvec(null), cles: [k.cle], maintenant: T0, essai: cassee });
  assert.equal(e.etat, 'essai');
  assert.equal(e.joursRestants, 45);
});

test('une horloge reculée ou une ancre dans le futur ne rallonge pas l\'essai', () => {
  const k = paire();
  const futur = { lire: () => new Date(T0 + 400 * J).toISOString(), ecrire: () => true };
  const e = lic.etatDeLaLicence({ dossier: dossierAvec(null), cles: [k.cle], maintenant: T0, essai: futur });
  assert.equal(e.joursRestants, 45);
});

test('l\'ancre dans le profil : un fichier, indépendant du dossier de l\'application', () => {
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-profil-'));
  const a = lic.ancreDansLeProfil(path.join(profil, 'Aktum PDF'));
  assert.equal(a.lire(), null);
  a.ecrire('2026-10-01T10:00:00.000Z');
  assert.equal(lic.ancreDansLeProfil(path.join(profil, 'Aktum PDF')).lire(), '2026-10-01T10:00:00.000Z');
});

test('les mises à jour sont comprises jusqu\'à la date de la licence ; au-delà, refusées', () => {
  const l = { etat: 'licence', majJusqu: '2027-10-01' };
  assert.equal(lic.miseAJourComprise(l, '2027-09-30T10:00:00Z').ok, true);
  assert.equal(lic.miseAJourComprise(l, '2027-10-01T23:00:00Z').ok, true, 'le jour même compte');
  const r = lic.miseAJourComprise(l, '2027-10-02T00:00:00Z');
  assert.equal(r.ok, false);
  assert.match(r.raison, /période de mise à jour/);
  assert.equal(lic.miseAJourComprise({ etat: 'essai' }, '2099-01-01').ok, true, 'pas de licence, pas de limite de période');
  assert.equal(lic.miseAJourComprise({ etat: 'licence', majJusqu: '' }, '2099-01-01').ok, true, 'interne : sans échéance');
});
