/*
 * Test d'intégration sur des fichiers réels (non versionnés) :
 *   samples/pieces.pdf   – PDF scanné des pièces
 *   samples/caisse.xlsx  – classeur de référence contenant ces pièces
 * Ignoré si les fichiers sont absents.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const P = require('../src/parser.js');

const dir = path.join(__dirname, '..', 'samples');
const pdfPath = path.join(dir, 'pieces.pdf');
const xlsxPath = path.join(dir, 'caisse.xlsx');
const available = fs.existsSync(pdfPath) && fs.existsSync(xlsxPath);

async function loadPages(file) {
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false, verbosity: 0 }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    pages.push({ pageNumber: i, width: vp.width, height: vp.height, words: P.itemsFromTextContent(tc, vp, pdfjs.Util) });
  }
  return pages;
}

test('les pièces du PDF d\'exemple correspondent au classeur de référence', { skip: !available && 'samples/ absent' }, async () => {
  const ExcelJS = require('exceljs');
  const X = require('../src/excel.js')(ExcelJS);
  const ref = await X.readWorkbook(fs.readFileSync(xlsxPath));
  const pages = await loadPages(pdfPath);
  const res = P.parseDocument(pages, { caisse: P.detectCaisseAccount(pages) });
  assert.ok(res.entries.length > 0);
  const byNo = new Map(ref.entries.map((e) => [Number(e.no), e]));
  const mismatches = [];
  let compared = 0;
  for (const e of res.entries) {
    const x = byNo.get(Number(e.no));
    if (!x) continue;
    compared++;
    const diffs = [];
    if (x.date !== e.date) diffs.push(`date ${e.date} ≠ ${x.date}`);
    if ((x.debit || null) !== (e.debit || null)) diffs.push(`débit ${e.debit} ≠ ${x.debit}`);
    if ((x.credit || null) !== (e.credit || null)) diffs.push(`crédit ${e.credit} ≠ ${x.credit}`);
    // le compte peut avoir été choisi à la main quand la pièce en propose plusieurs
    if (x.compte !== e.compte && !(e.candidates || []).includes(x.compte)) diffs.push(`compte ${e.compte} ≠ ${x.compte}`);
    if (diffs.length) mismatches.push(`n° ${e.no} (p. ${e.page}) : ${diffs.join(', ')}`);
  }
  console.log(`  ${compared} pièces comparées, ${mismatches.length} écart(s)`);
  mismatches.forEach((m) => console.log('  - ' + m));
  assert.ok(compared >= 10, 'trop peu de pièces comparées');
  assert.ok(mismatches.length <= Math.floor(compared * 0.05), `écarts : \n${mismatches.join('\n')}`);
});
