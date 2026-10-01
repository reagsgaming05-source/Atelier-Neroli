// La lecture des plages de pages (« 3-7, 12 ») : une seule grammaire pour
// l'impression, la division en lots et la sélection par numéros.
const test = require('node:test');
const assert = require('node:assert');
const { extraire } = require('./aide');

const { lirePlages, lireIntervalles, formaterPlages, lireUnePlage } =
  extraire('// @debut-plages', '// @fin-plages', '{ lirePlages, lireIntervalles, formaterPlages, lireUnePlage }');

test('numéros isolés et plages, dans l\'ordre, une fois chacun', () => {
  assert.deepStrictEqual(lirePlages('3-7, 12', 12).pages, [3, 4, 5, 6, 7, 12]);
  assert.deepStrictEqual(lirePlages('12, 3-7, 5', 12).pages, [3, 4, 5, 6, 7, 12]);
  assert.deepStrictEqual(lirePlages('2', 5).pages, [2]);
});

test('bornes ouvertes et « fin »', () => {
  assert.deepStrictEqual(lirePlages('5-', 8).pages, [5, 6, 7, 8]);
  assert.deepStrictEqual(lirePlages('-3', 8).pages, [1, 2, 3]);
  assert.deepStrictEqual(lirePlages('fin', 8).pages, [8]);
  assert.deepStrictEqual(lirePlages('6-fin', 8).pages, [6, 7, 8]);
});

test('une plage à l\'envers se lit à l\'endroit', () => {
  assert.deepStrictEqual(lirePlages('7-3', 9).pages, [3, 4, 5, 6, 7]);
});

test('séparateurs : virgule, point-virgule, ligne ; tirets de Word', () => {
  assert.deepStrictEqual(lirePlages('1;3\n5', 9).pages, [1, 3, 5]);
  assert.deepStrictEqual(lirePlages('3–5', 9).pages, [3, 4, 5]);
  assert.deepStrictEqual(lirePlages('3—5', 9).pages, [3, 4, 5]);
  assert.deepStrictEqual(lirePlages('  3 - 5 ,  8 ', 9).pages, [3, 4, 5, 8]);
});

test('hors du document : ne désigne rien, n\'est pas ramené sur une autre page', () => {
  const r = lirePlages('9-12', 5);
  assert.deepStrictEqual(r.pages, []);
  assert.deepStrictEqual(r.hors, ['9-12']);
  assert.deepStrictEqual(lirePlages('0', 5).pages, []);
  // une plage qui dépasse est tronquée, pas rejetée
  assert.deepStrictEqual(lirePlages('4-9', 5).pages, [4, 5]);
});

test('ce qui n\'est pas compris est rendu à part', () => {
  const r = lirePlages('2, abc, 4-x, 6', 9);
  assert.deepStrictEqual(r.pages, [2, 6]);
  assert.deepStrictEqual(r.ignores, ['abc', '4-x']);
});

test('texte vide ou absent : rien', () => {
  assert.deepStrictEqual(lirePlages('', 5), { pages: [], ignores: [], hors: [] });
  assert.deepStrictEqual(lirePlages(null, 5), { pages: [], ignores: [], hors: [] });
  assert.strictEqual(lireUnePlage('   ', 5), undefined);
});

test('à la division, chaque plage fait un fichier, dans l\'ordre écrit', () => {
  assert.deepStrictEqual(lireIntervalles('1-3, 4-6, 9', 10), [[1, 3], [4, 6], [9, 9]]);
  assert.deepStrictEqual(lireIntervalles('6-8, 1-2', 10), [[6, 8], [1, 2]]);
  assert.deepStrictEqual(lireIntervalles('20-30, 2', 10), [[2, 2]]);
});

test('formaterPlages est l\'inverse de la lecture', () => {
  assert.strictEqual(formaterPlages([1, 2, 3, 5, 8, 9]), '1-3, 5, 8-9');
  assert.strictEqual(formaterPlages([4]), '4');
  assert.strictEqual(formaterPlages([]), '');
  assert.strictEqual(formaterPlages([9, 1, 2, 2, 3]), '1-3, 9');
  const l = [1, 2, 3, 7, 10, 11];
  assert.deepStrictEqual(lirePlages(formaterPlages(l), 12).pages, l);
});
