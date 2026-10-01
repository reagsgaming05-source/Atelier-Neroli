// Les règles autour du mot de passe d'un compte local : ce qu'on refuse, le
// frein, le code de récupération, la trace. La cryptographie elle-même
// (scrypt, sel, temps constant) était saine ; ce sont ces règles qui manquaient.
const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('../desktop/comptes');

test('un mot de passe de moins de huit caractères est refusé', () => {
  assert.match(c.motDePasseAcceptable('1234'), /au moins 8 caractères/);
  assert.equal(c.motDePasseAcceptable('Un autre mot de passe'), '');
});

test('les premiers qu\'on essaie, un caractère répété ou le nom du compte sont refusés', () => {
  assert.match(c.motDePasseAcceptable('12345678'), /premiers qu/);
  assert.match(c.motDePasseAcceptable('PassWord'), /premiers qu/);
  assert.match(c.motDePasseAcceptable('aaaaaaaaaa'), /répète/);
  assert.match(c.motDePasseAcceptable('Marie Dupont', 'Marie Dupont'), /votre nom/);
  assert.equal(c.motDePasseAcceptable('Marie Dupont 2026', 'Marie Dupont'), '');
});

test('la fiche ne porte jamais le mot de passe, et il se vérifie', () => {
  const m = c.sceller('correct horse battery');
  assert.equal(m.N, 131072, 'N = 2^17');
  assert.ok(!JSON.stringify(m).includes('correct horse'));
  assert.equal(c.verifier('correct horse battery', { motDePasse: m }), true);
  assert.equal(c.verifier('correct horse batterz', { motDePasse: m }), false);
  assert.equal(c.verifier('', { motDePasse: null }), false);
});

test('une fiche scellée avant le durcissement se vérifie encore, et se refait', () => {
  const crypto = require('crypto');
  const sel = crypto.randomBytes(16);
  const ancienne = { algo: 'scrypt', N: 16384, r: 8, p: 1, sel: sel.toString('hex'), empreinte: crypto.scryptSync('ancien mot', sel, 32, { N: 16384, r: 8, p: 1 }).toString('hex') };
  assert.equal(c.verifier('ancien mot', { motDePasse: ancienne }), true);
  assert.equal(c.aRehacher({ motDePasse: ancienne }), true);
  assert.equal(c.aRehacher({ motDePasse: c.sceller('neuf neuf neuf') }), false);
});

test('le frein : trois essais gratuits, puis des attentes qui doublent, plafonnées', () => {
  let f = {};
  const t0 = Date.parse('2026-10-01T10:00:00Z');
  for (let i = 0; i < 3; i++) { assert.equal(c.attente(f, t0), 0, 'essai ' + (i + 1) + ' libre'); f = c.noterEchec(f, t0); }
  assert.equal(c.attente(f, t0), 5000, 'après trois échecs : cinq secondes');
  assert.equal(c.attente(f, t0 + 5000), 0, 'passé ce délai, on peut réessayer');
  f = c.noterEchec(f, t0 + 5000);
  assert.equal(c.attente(f, t0 + 5000), 10000, 'puis dix');
  for (let i = 0; i < 20; i++) f = c.noterEchec(f, t0);
  assert.equal(c.attente(f, t0), c.FREIN.plafond, 'jamais plus de quinze minutes');
  assert.equal(c.attente(c.effacerEchecs(f), t0), 0, 'une connexion réussie remet à zéro');
  assert.match(c.messageAttente(20000), /20 secondes/);
  assert.match(c.messageAttente(600000), /10 minutes/);
});

test('le code de récupération : 20 signes sans ambiguïté, vérifié sur son empreinte', () => {
  const code = c.codeDeRecuperation();
  assert.match(code, /^[A-HJ-NP-Z2-9]{5}(-[A-HJ-NP-Z2-9]{5}){3}$/);
  assert.notEqual(code, c.codeDeRecuperation(), 'jamais deux fois le même');
  const fiche = { recuperation: c.scellerCode(code) };
  assert.ok(!JSON.stringify(fiche).includes(code.replace(/-/g, '')), 'seule l\'empreinte est gardée');
  assert.equal(c.verifierCode(code, fiche), true);
  assert.equal(c.verifierCode(code.toLowerCase().replace(/-/g, ' '), fiche), true, 'recopié en minuscules, avec des espaces');
  assert.equal(c.verifierCode('AAAAA-AAAAA-AAAAA-AAAAA', fiche), false);
  assert.equal(c.verifierCode(code, {}), false, 'un compte sans code n\'en a pas');
});

test('chaque changement de mot de passe laisse une trace, et seulement les douze derniers', () => {
  let f = {};
  for (let i = 0; i < 15; i++) f = c.noterEvenement(f, i === 14 ? 'mot de passe posé après réinitialisation' : 'connexion', 'POSTE-07', Date.parse('2026-10-01T10:00:00Z') + i * 1000);
  assert.equal(f.evenements.length, 12);
  const d = c.dernierChangement(f);
  assert.equal(d.poste, 'POSTE-07');
  assert.match(d.quoi, /réinitialisation/);
  assert.equal(c.dernierChangement({}), null);
});
