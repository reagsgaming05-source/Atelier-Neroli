// Encodage du texte corrigé et petites aides d'affichage.
const test = require('node:test');
const assert = require('node:assert/strict');
const { extraire } = require('./aide');
// L'état d'écriture (polices incorporées ou standard) vit dans 49-unicode.js ; le bloc testé le lit.
global.ecriture = { unicode: false, actifs: 0, couverture: null };
// La langue de l'interface (01-langue.js) : plural() la consulte ; ici, le français.
global.traduction = null;
global.langue = 'fr';
const { winAnsi, releverHorsWinAnsi, oublierPertes, pertesCaracteres } = extraire('  const WINANSI_SUP = ', '  // =====', '{ winAnsi, releverHorsWinAnsi, oublierPertes, pertesCaracteres }');
const { plural, fmtSize, formaterNombre } = extraire('  const plural = ', '  const baseName = ', '{ plural, fmtSize, formaterNombre }');

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
test('avec des polices incorporées, ce qu\'elles couvrent s\'écrit tel quel, le reste est signalé', () => {
  oublierPertes();
  global.ecriture.unicode = true;
  global.ecriture.couverture = new Set(['Ω', 'ć', 'š', 'Ж'].map(c => c.codePointAt(0)));
  try {
    assert.equal(winAnsi('Milošević Ω Ж'), 'Milošević Ω Ж');
    assert.equal(winAnsi('Wang 漢'), 'Wang ?');
    assert.deepEqual(Array.from(pertesCaracteres.keys()), ['漢']);
    // les remplacements d'espaces et de tirets restent ceux de toujours
    assert.equal(winAnsi('12 000 anti‑gel'), '12 000 anti-gel');
    oublierPertes();
    releverHorsWinAnsi('Zoé 漢 Ω');
    assert.deepEqual(Array.from(pertesCaracteres.keys()), ['漢']);
  } finally { global.ecriture.unicode = false; global.ecriture.couverture = null; oublierPertes(); }
  oublierPertes();
  releverHorsWinAnsi('Ω');
  assert.deepEqual(Array.from(pertesCaracteres.keys()), ['Ω'], 'sans polices incorporées, Ω est hors WinAnsi');
  oublierPertes();
});
test('pluriel et tailles', () => {
  assert.equal(plural(1, 'page', 'pages'), '1 page');
  assert.equal(plural(3, 'page', 'pages'), '3 pages');
  assert.equal(fmtSize(512), '512 o');
  assert.equal(fmtSize(2048), '2 Ko');
  assert.equal(fmtSize(3 * 1024 * 1024), '3.0 Mo');
});
// Les nombres s'écrivent à la suisse, dans les deux langues : l'apostrophe des milliers, le point décimal.
test('nombres à la suisse', () => {
  assert.equal(formaterNombre(0), '0');
  assert.equal(formaterNombre(999), '999');
  assert.equal(formaterNombre(1250000), '1\u2019250\u2019000');
  assert.equal(formaterNombre(1234.5), '1\u2019234.5');
  assert.equal(formaterNombre(1234.567, 2), '1\u2019234.57');
  assert.equal(formaterNombre(-12345), '-12\u2019345');
  assert.equal(plural(8400, 'occurrence', 'occurrences'), '8\u2019400 occurrences');
  assert.equal(fmtSize(1500 * 1024 * 1024), '1\u2019500.0 Mo');
});
