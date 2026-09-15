// Copier un tableau : des morceaux de texte posés sur la page, rangés en
// lignes et en colonnes tels qu'Excel doit les recevoir.
const test = require('node:test');
const assert = require('node:assert/strict');
const { extraire } = require('./aide');
const tableauDepuisMorceaux = extraire('  function tableauDepuisMorceaux(morceaux) {', '  const tableauTsv = ', 'tableauDepuisMorceaux');
const tableauCsv = extraire('  const tableauCsv = ', '  async function copierTexte(', 'tableauCsv');
const tableauTsv = extraire('  const tableauTsv = ', '  const tableauCsv = ', 'tableauTsv');

// Une facture : un titre pleine largeur, trois colonnes (libellé, quantité, montant).
const m = (str, x, base, w, size) => ({ str, x, base, w: w == null ? str.length * 5 : w, size: size || 10 });
const page = [
  m('Commune de Blonay — décompte des frais scolaires 2026', 60, 60, 380, 14),
  m('Libellé', 60, 120), m('Quantité', 300, 120), m('Montant', 420, 120),
  m('Transport', 60, 140), m('Bus', 110, 140), m('12', 300, 140), m("1'240.00", 420, 140),
  m('Repas', 60, 160), m('45', 300, 160), m('540.50', 420, 160),
  m('Total', 60, 190), m("1'780.50", 420, 190),
];

test('trois colonnes sont repérées, le titre pleine largeur ne les bouche pas', () => {
  const r = tableauDepuisMorceaux(page);
  assert.equal(r.colonnes, 3);
  assert.deepEqual(r.lignes[1], ['Libellé', 'Quantité', 'Montant']);
  assert.deepEqual(r.lignes[2], ['Transport Bus', '12', "1'240.00"]);
  assert.deepEqual(r.lignes[3], ['Repas', '45', '540.50']);
  assert.deepEqual(r.lignes[4], ['Total', '', "1'780.50"], 'la cellule vide reste vide, le total garde sa colonne');
});

test('deux morceaux qui se touchent font une seule cellule, avec l\'espace qu\'il faut', () => {
  const r = tableauDepuisMorceaux([m('Trans', 60, 10, 25), m('port', 85, 10, 20), m('12', 200, 10)]);
  assert.deepEqual(r.lignes[0], ['Transport', '12']);
});

test('une page sans colonnes : une cellule par ligne', () => {
  const r = tableauDepuisMorceaux([m('Bonjour', 60, 10), m('Au revoir', 60, 30)]);
  assert.equal(r.colonnes, 1);
  assert.deepEqual(r.lignes, [['Bonjour'], ['Au revoir']]);
});

test('CSV pour Excel : point-virgule, guillemets doublés, BOM', () => {
  const csv = tableauCsv([['a;b', 'il a dit "oui"'], ['1', '2']]);
  assert.ok(csv.startsWith('﻿'));
  assert.equal(csv.slice(1), '"a;b";"il a dit ""oui"""\r\n1;2');
  assert.equal(tableauTsv([['a', 'b\tc'], ['1', '2']]), 'a\tb c\r\n1\t2');
});
