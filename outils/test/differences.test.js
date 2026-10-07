// L'encodage /Differences d'une police simple : des noms de glyphes posés sur des codes. Beaucoup de PDF issus de LaTeX, de vieux pilotes
// d'impression et de générateurs métier n'ont pas d'autre table : sans elle, le flux se lit de travers et la correction échoue.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { extraire } = require('./aide');

global.PDFLib = require(path.join(__dirname, '..', 'libs', 'cantoo-pdf-lib-2.11.0', 'dist', 'pdf-lib.js'));
global.signaler = () => {};
const { PDFDocument, PDFName } = PDFLib;
const { polNomGlyphe, polLireDifferences } = extraire('  const POL_CP1252 = {', '  function polLargeurs(', '{ polNomGlyphe, polLireDifferences }');
global.polNomPdf = extraire('  function polNomPdf(n) {', '  function polTrouverDict(', 'polNomPdf');

test('les noms de glyphes courants se traduisent en lettres', () => {
  assert.equal(polNomGlyphe('/A'), 'A');
  assert.equal(polNomGlyphe('five'), '5');
  assert.equal(polNomGlyphe('space'), ' ');
  assert.equal(polNomGlyphe('eacute'), 'é');
  assert.equal(polNomGlyphe('Ccedilla'), 'Ç');
  assert.equal(polNomGlyphe('germandbls'), 'ß');
  assert.equal(polNomGlyphe('ydieresis'), 'ÿ');
  assert.equal(polNomGlyphe('endash'), '–');
  assert.equal(polNomGlyphe('fi'), 'ﬁ');
  assert.equal(polNomGlyphe('uni20AC'), '€');
  assert.equal(polNomGlyphe('eacute.alt'), 'é', 'la variante se lit comme la lettre');
  assert.equal(polNomGlyphe('g123'), '', 'un nom inconnu ne devine rien');
});

test('un tableau /Differences réaffecte les codes, un nom après l\'autre', async () => {
  const doc = await PDFDocument.create();
  const enc = doc.context.obj({ Type: 'Encoding', Differences: [65, 'B', 'C', 200, 'eacute', 'agrave'] });
  const m = polLireDifferences(enc);
  assert.equal(m.get(65), 'B');
  assert.equal(m.get(66), 'C');
  assert.equal(m.get(200), 'é');
  assert.equal(m.get(201), 'à');
  assert.equal(m.size, 4);
});

test('sans /Differences, rien n\'est réaffecté', async () => {
  const doc = await PDFDocument.create();
  assert.equal(polLireDifferences(doc.context.obj({ Type: 'Encoding', BaseEncoding: 'WinAnsiEncoding' })).size, 0);
});
