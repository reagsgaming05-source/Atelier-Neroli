// Copier un tableau : des morceaux de texte posés sur la page, rangés en
// lignes et en colonnes tels qu'Excel doit les recevoir.
const test = require('node:test');
const assert = require('node:assert/strict');
const { extraire } = require('./aide');
const { tableauDepuisMorceaux, blocsDePage } = extraire('  function rangeesDe(morceaux) {', '  const tableauTsv = ', '{ tableauDepuisMorceaux, blocsDePage }');
const tableauCsv = extraire('  const tableauCsv = ', '  async function morceauxDePage(', 'tableauCsv');
const tableauTsv = extraire('  const tableauTsv = ', '  const tableauCsv = ', 'tableauTsv');

// Une facture : un titre pleine largeur, trois colonnes (libellé, quantité, montant).
const m = (str, x, base, w, size) => ({ str, x, base, w: w == null ? str.length * 5 : w, size: size || 10 });
const page = [
  m('Commune Exemple — décompte des frais scolaires 2026', 60, 60, 380, 14),
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

// ---------------------------------------------------------------------------
//  La structure d'une page pour un traitement de texte
// ---------------------------------------------------------------------------
// Une ligne de texte courant : pleine largeur (60 → 520), 10 pt.
const ligne = (str, base, o) => m(str, (o && o.x) || 60, base, (o && o.w) || 460, (o && o.size) || 10);
const mots = (n) => Array.from({ length: n }, () => 'mot').join(' ');

test('un titre, un paragraphe sur deux lignes, un tableau : trois blocs', () => {
  const b = blocsDePage([
    ligne('Décompte des frais', 60, { size: 20, w: 200 }),
    ligne('Voici le décompte du premier semestre pour les familles concernées par le camp de ski, établi avec soin et', 100),
    ligne('envoyé à chacune.', 114, { w: 90 }),
    m('Libellé', 60, 160), m('Quantité', 300, 160), m('Montant', 420, 160),
    m('Transport', 60, 176), m('12', 300, 176), m("1'240.00", 420, 176),
    m('Repas', 60, 192), m('45', 300, 192), m('540.50', 420, 192),
  ]);
  assert.deepEqual(b.map(x => x.t), ['titre', 'p', 'tableau']);
  assert.equal(b[0].n, 1, 'deux fois le corps : titre de premier niveau');
  assert.match(b[1].s, /établi avec soin et envoyé à chacune\.$/, 'les deux lignes du paragraphe sont jointes par une espace');
  assert.deepEqual(b[2].lignes[0], ['Libellé', 'Quantité', 'Montant']);
  assert.equal(b[2].lignes.length, 3);
});

test('une ligne courte clôt le paragraphe : une adresse garde ses lignes', () => {
  const b = blocsDePage([ligne('Commune de Exemple', 60, { w: 90 }), ligne('Rue du Lac 4', 74, { w: 60 }), ligne('1234 Exemple', 88, { w: 60 })]);
  assert.deepEqual(b.map(x => x.s), ['Commune de Exemple', 'Rue du Lac 4', '1234 Exemple']);
});

test('un trait d\'union de fin de ligne se recolle, un tiret de liste ne fusionne pas', () => {
  const b = blocsDePage([ligne('Le conseil s\'est réuni pour examiner le préavis relatif à la construction du nouveau bâtiment sco-', 60), ligne('laire et à son financement.', 74, { w: 120 }),
    ligne('- première pièce du dossier', 100, { w: 120 }), ligne('- deuxième pièce du dossier', 114, { w: 120 })]);
  assert.equal(b[0].s, 'Le conseil s\'est réuni pour examiner le préavis relatif à la construction du nouveau bâtiment scolaire et à son financement.');
  assert.equal(b.length, 3, 'chaque élément de liste reste seul');
});

test('un « Total » qui n\'a qu\'une cellule, entre deux rangées de tableau, reste dans le tableau', () => {
  const b = blocsDePage([
    m('Libellé', 60, 100), m('Montant', 420, 100),
    m('Transport', 60, 116), m('1\'240.00', 420, 116),
    m('Total', 60, 132),
    m('Repas', 60, 148), m('540.50', 420, 148),
  ]);
  assert.deepEqual(b.map(x => x.t), ['tableau']);
  assert.equal(b[0].lignes.length, 4);
});

test('deux lignes à deux cellules (expéditeur / date) forment un petit tableau ; une seule ligne reste du texte', () => {
  const une = blocsDePage([m('Commune de Exemple', 60, 60), m('Le 12.03.2026', 420, 60)]);
  assert.deepEqual(une.map(x => x.t), ['p']);
  const deux = blocsDePage([m('Objet', 60, 60), m('Permis 2026-14', 300, 60), m('Date', 60, 76), m('12.03.2026', 300, 76)]);
  assert.deepEqual(deux.map(x => x.t), ['tableau']);
});

test('page vide, texte seul d\'espaces : aucun bloc', () => {
  assert.deepEqual(blocsDePage([]), []);
  assert.deepEqual(blocsDePage([m('   ', 60, 60)]), []);
});
