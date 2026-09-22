// Encodage du texte corrigé et petites aides d'affichage.
const test = require('node:test');
const assert = require('node:assert/strict');
const { extraire } = require('./aide');
const { winAnsi } = extraire('  const WINANSI_SUP = ', '  // =====', '{ winAnsi }');
const { plural, fmtSize } = extraire('  const plural = ', '  const baseName = ', '{ plural, fmtSize }');

test('l\'apostrophe typographique et les guillemets français passent tels quels', () => {
  assert.equal(winAnsi('l’été « chaud »'), 'l’été « chaud »');
});
test('une tabulation devient quatre espaces, un caractère de commande une espace', () => {
  assert.equal(winAnsi('a\tb\x07c'), 'a    b c');
});
test('une espace insécable devient une espace, un trait d\'union insécable un tiret', () => {
  assert.equal(winAnsi('12 000 anti‑gel'), '12 000 anti-gel');
});
test('ce que WinAnsi ne porte pas devient un point d\'interrogation', () => {
  assert.equal(winAnsi('Ω'), '?');
});
test('pluriel et tailles', () => {
  assert.equal(plural(1, 'page', 'pages'), '1 page');
  assert.equal(plural(3, 'page', 'pages'), '3 pages');
  assert.equal(fmtSize(512), '512 o');
  assert.equal(fmtSize(2048), '2 Ko');
  assert.equal(fmtSize(3 * 1024 * 1024), '3,0 Mo');
});
