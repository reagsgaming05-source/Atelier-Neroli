// L'imposition d'un livret : pliées, les feuilles doivent se lire 1, 2, 3…
const test = require('node:test');
const assert = require('node:assert/strict');
const { extraire } = require('./aide');
const livretOrdre = extraire('  function livretOrdre(n) {', '  async function imposerPdf(', 'livretOrdre');

// Un cahier se lit ainsi : droite du recto de la feuille 1, gauche de son
// verso, en descendant vers la feuille du milieu, puis on remonte.
const plier = cotes => {
  const k = cotes.length / 2, lu = [];
  for (let i = 0; i < k; i++) { lu.push(cotes[2 * i][1]); lu.push(cotes[2 * i + 1][0]); }
  for (let i = k - 1; i >= 0; i--) { lu.push(cotes[2 * i + 1][1]); lu.push(cotes[2 * i][0]); }
  return lu;
};

for (const n of [4, 8, 12, 16, 32]) {
  test(n + ' pages : plié, le cahier se lit dans l\'ordre', () => {
    const lu = plier(livretOrdre(n));
    assert.deepEqual(lu, Array.from({ length: n }, (_, i) => i));
  });
}

test('un nombre qui n\'est pas multiple de quatre : les blanches tombent à la fin', () => {
  const lu = plier(livretOrdre(5));
  assert.deepEqual(lu.slice(0, 5), [0, 1, 2, 3, 4]);
  assert.ok(lu.slice(5).every(i => i >= 5), 'après la page 5, seulement des blanches');
});

test('la première feuille porte la dernière page à côté de la première', () => {
  assert.deepEqual(livretOrdre(8)[0], [7, 0]);
  assert.deepEqual(livretOrdre(8)[1], [1, 6]);
});
