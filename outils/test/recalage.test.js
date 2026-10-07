// Comparer deux versions : une page insérée ou retirée ne doit pas décaler toutes les suivantes (le défaut de la comparaison
// « page contre page » : tout paraissait avoir changé après la première insertion).
const test = require('node:test');
const assert = require('node:assert/strict');
const { extraire } = require('./aide');
const { alignerPages } = extraire('  const SIMILITUDE_MIN', '  async function texteDocPage', '{ alignerPages }');

const p = (...mots) => mots.join(' ');
const p1 = p('Préavis', 'municipal', 'crédit', 'salle', 'polyvalente', 'conseil', 'communal');
const p2 = p('Tableau', 'financement', 'montant', 'francs', 'subvention', 'cantonale', 'emprunt');
const p3 = p('Procès', 'verbal', 'séance', 'municipalité', 'adopté', 'voix', 'abstentions');

test('deux documents identiques s\'alignent page à page', () => {
  assert.deepEqual(alignerPages([p1, p2, p3], [p1, p2, p3]), [{ iA: 0, iB: 0 }, { iA: 1, iB: 1 }, { iA: 2, iB: 2 }]);
});

test('une page insérée au milieu : les suivantes restent alignées sur leurs vraies sœurs', () => {
  const neuve = p('Annexe', 'nouvelle', 'règlement', 'tarifs', 'location', 'heures', 'ouverture');
  assert.deepEqual(alignerPages([p1, p2, p3], [p1, neuve, p2, p3]),
    [{ iA: 0, iB: 0 }, { iA: null, iB: 1 }, { iA: 1, iB: 2 }, { iA: 2, iB: 3 }]);
});

test('une page retirée : elle ressort seule, sans décaler le reste', () => {
  assert.deepEqual(alignerPages([p1, p2, p3], [p1, p3]), [{ iA: 0, iB: 0 }, { iA: 1, iB: null }, { iA: 2, iB: 1 }]);
});

test('une page retouchée reste en face d\'elle-même', () => {
  const retouchee = p2.replace('francs', 'euros').replace('emprunt', 'prêt');
  assert.deepEqual(alignerPages([p1, p2, p3], [p1, retouchee, p3]), [{ iA: 0, iB: 0 }, { iA: 1, iB: 1 }, { iA: 2, iB: 2 }]);
});

test('une page entièrement refaite devient une page retirée et une page ajoutée', () => {
  const autre = p('Convention', 'bail', 'locataire', 'loyer', 'charges', 'résiliation', 'préavis');
  const l = alignerPages([p1, p2, p3], [p1, autre, p3]);
  assert.equal(l.length, 4);
  assert.deepEqual(l.filter(x => x.iA == null).length, 1);
  assert.deepEqual(l.filter(x => x.iB == null).length, 1);
});

test('deux scans sans aucun texte se rangent un à un, dans l\'ordre', () => {
  assert.deepEqual(alignerPages(['', '', ''], ['', '', '']), [{ iA: 0, iB: 0 }, { iA: 1, iB: 1 }, { iA: 2, iB: 2 }]);
});

test('un document plus long : les pages en trop sont ajoutées à la fin', () => {
  assert.deepEqual(alignerPages([p1], [p1, p2]), [{ iA: 0, iB: 0 }, { iA: null, iB: 1 }]);
  assert.deepEqual(alignerPages([], [p1]), [{ iA: null, iB: 0 }]);
});

test('les mille pages se recalent vite', () => {
  const mots = i => p('mot' + i, 'unique' + i, 'page' + i, 'texte' + i, 'commun');
  const A = Array.from({ length: 600 }, (_, i) => mots(i));
  const B = A.slice(0, 300).concat([p('inséré', 'ici')]).concat(A.slice(300));
  const t = Date.now();
  const l = alignerPages(A, B);
  assert.ok(Date.now() - t < 5000, 'moins de cinq secondes');
  assert.equal(l.filter(x => x.iA == null).length, 1);
  assert.equal(l.length, 601);
});
