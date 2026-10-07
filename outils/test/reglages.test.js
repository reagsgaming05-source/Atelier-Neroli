// Les réglages de l'administrateur : un fichier « reglages.json » à côté de l'exécutable ; sans lui, rien ne change ; un réglage faux ne bloque rien.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { lire, USINE } = require('../desktop/reglages');
const comptes = require('../desktop/comptes');

const dossier = (fichiers) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-reglages-'));
  for (const [nom, contenu] of Object.entries(fichiers)) fs.writeFileSync(path.join(d, nom), contenu);
  return d;
};

test('sans fichier : les valeurs d\'usine, rien n\'est dit', () => {
  const r = lire(dossier({}));
  assert.deepStrictEqual(r.valeurs, { ...USINE });
  assert.strictEqual(r.fichier, ''); assert.strictEqual(r.lu, false); assert.deepStrictEqual(r.avertissements, []);
  assert.deepStrictEqual(USINE, { miseAJour: true, memoriserSignature: true, motDePasseMin: 8, aide: '' });
});

test('un fichier complet est lu, avec ou sans BOM, sous le nom que l\'Explorateur donne', () => {
  const json = '{ "miseAJour": false, "memoriserSignature": false, "motDePasseMin": 12, "aide": "Informatique : poste 214" }';
  for (const [nom, contenu] of [['reglages.json', json], ['reglages.json.txt', '﻿' + json]]) {
    const r = lire(dossier({ [nom]: contenu }));
    assert.deepStrictEqual(r.valeurs, { miseAJour: false, memoriserSignature: false, motDePasseMin: 12, aide: 'Informatique : poste 214' }, nom);
    assert.strictEqual(r.fichier, nom); assert.deepStrictEqual(r.avertissements, []);
  }
});

test('un réglage qui n\'a pas de sens est ignoré et dit, les autres passent', () => {
  const r = lire(dossier({ 'reglages.json': '{ "miseAJour": "non", "motDePasseMin": 3, "memoriserSignature": false, "aide": 42, "inconnu": 1, "_commentaire": "libre" }' }));
  assert.strictEqual(r.valeurs.miseAJour, true, 'une chaîne n\'est pas un booléen');
  assert.strictEqual(r.valeurs.motDePasseMin, 8, 'on n\'abaisse jamais sous la valeur d\'usine');
  assert.strictEqual(r.valeurs.memoriserSignature, false, 'le réglage valable passe');
  assert.strictEqual(r.valeurs.aide, '');
  assert.strictEqual(r.avertissements.length, 4);   // miseAJour, motDePasseMin, aide, inconnu — pas le commentaire
  assert.ok(r.avertissements.some((a) => /inconnu/.test(a)));
  assert.ok(!r.avertissements.some((a) => /_commentaire/.test(a)));
  assert.strictEqual(lire(dossier({ 'reglages.json': '{ "motDePasseMin": 65 }' })).valeurs.motDePasseMin, 8, 'au plus 64');
});

test('un fichier qui n\'est pas du JSON ne bloque rien', () => {
  for (const contenu of ['pas du json', '[1, 2]', '"texte"', '']) {
    const r = lire(dossier({ 'reglages.json': contenu }));
    assert.deepStrictEqual(r.valeurs, { ...USINE }, JSON.stringify(contenu));
    assert.ok(r.avertissements.length === 1 && /usine/.test(r.avertissements[0]), JSON.stringify(contenu));
  }
});

test('l\'aide tient en une ligne et en deux cents caractères', () => {
  const r = lire(dossier({ 'reglages.json': JSON.stringify({ aide: 'ligne un\nligne deux\t' + 'x'.repeat(300) }) }));
  assert.ok(!/[\r\n\t]/.test(r.valeurs.aide));
  assert.strictEqual(r.valeurs.aide.length, 200);
  assert.ok(r.avertissements.some((a) => /dépasse/.test(a)));
});

test('la longueur minimale d\'un mot de passe de compte suit le réglage, et ne descend jamais sous huit', () => {
  const avant = comptes.minimumActuel();
  try {
    comptes.regler({ motDePasseMin: 8 });
    assert.strictEqual(comptes.motDePasseAcceptable('abcdefgh1', 'Marie'), '');
    comptes.regler({ motDePasseMin: 12 });
    assert.strictEqual(comptes.minimumActuel(), 12);
    assert.match(comptes.motDePasseAcceptable('abcdefgh1', 'Marie'), /au moins 12 caractères/);
    assert.strictEqual(comptes.motDePasseAcceptable('abcdefghij12', 'Marie'), '');
    comptes.regler({ motDePasseMin: 4 });
    comptes.regler({ motDePasseMin: 'douze' });
    comptes.regler(null);
    assert.strictEqual(comptes.minimumActuel(), 12, 'une valeur absurde ne change rien');
  } finally { comptes.regler({ motDePasseMin: 64 }); comptes.regler({ motDePasseMin: 8 }); }
  assert.ok(avant >= 8);
});

test('main.js lit les réglages, ne propose pas de mise à jour quand l\'administrateur la gère, et le dit dans « À propos »', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'main.js'), 'utf8');
  assert.match(main, /const REGLAGES = require\('\.\/reglages'\)\.lire\(PORTABLE_DIR\);/);
  assert.match(main, /comptes\.regler\(REGLAGES\.valeurs\);/);
  assert.match(main, /if \(!REGLAGES\.valeurs\.miseAJour\) \{/);
  assert.match(main, /phraseDesReglages\(\) \+/);
  assert.ok(main.indexOf("function chercherUneMiseAJour") < main.indexOf('if (!REGLAGES.valeurs.miseAJour)'), 'le garde est dans la recherche de mise à jour');
});
