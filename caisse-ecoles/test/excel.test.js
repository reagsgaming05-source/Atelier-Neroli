const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const X = require('../src/excel.js')(ExcelJS);

const entries = [
  { no: 1, date: '2025-01-08', compte: '51000.3662.50', libelle: 'REMBOURSEMENT - Collation - A. Dupraz', debit: null, credit: 29.7 },
  { no: 2, date: '2025-01-09', compte: '9206.101', libelle: 'RECETTE - Vente - N. Morel', debit: 552, credit: null },
  { no: 3, date: '2025-01-10', compte: '9111.100', libelle: 'RETRAIT - Bourse communale - F. Bonnard', debit: 10000, credit: null },
];

test('buildWorkbook produit le format du journal de caisse avec formules de solde', async () => {
  const { workbook, finalBalance } = X.buildWorkbook({ opening: { date: '2025-01-06', amount: 2062.2 }, entries, prefillTo: 10 });
  assert.equal(finalBalance, 12584.5);
  const ws = workbook.getWorksheet('Caisse');
  assert.ok(ws);
  assert.deepEqual(ws.getRow(1).values.slice(1), ['Date', 'No ', 'Compte', 'Libellé', 'Débit ', 'Crédit', 'Solde']);
  assert.equal(ws.getCell('D2').value, 'Solde à nouveau');
  assert.equal(ws.getCell('G2').value, 2062.2);
  assert.equal(ws.getCell('A3').value.toISOString().slice(0, 10), '2025-01-08');
  assert.equal(ws.getCell('B3').value, 1);
  assert.equal(ws.getCell('C3').value, '51000.3662.50');
  assert.equal(ws.getCell('F3').value, 29.7);
  assert.deepEqual(ws.getCell('G3').value, { formula: 'G2+E3-F3', result: 2032.5 });
  assert.deepEqual(ws.getCell('G5').value, { formula: 'G4+E5-F5', result: 12584.5 });
  assert.equal(ws.getCell('B6').value, 4); // numérotation pré-remplie
  assert.equal(ws.getCell('B12').value, 10);
  assert.equal(ws.getCell('A3').numFmt, 'mm-dd-yy');
  assert.equal(ws.getCell('E3').numFmt, '0.00');
  assert.equal(ws.getCell('C3').numFmt, '@');
  assert.equal(ws.getCell('D3').font.name, 'Arial');
  assert.equal(ws.getCell('A1').font.bold, true);
  assert.equal(ws.getColumn(4).width, 110);
  assert.equal(ws.views[0].state, 'frozen');
  assert.equal(ws.pageSetup.orientation, 'landscape');
  assert.ok(workbook.getWorksheet('Compte'));
});

test('readWorkbook relit un classeur généré (aller-retour)', async () => {
  const { workbook } = X.buildWorkbook({ opening: { date: '2025-01-06', amount: 2062.2 }, entries, prefillTo: 10 });
  const buf = await workbook.xlsx.writeBuffer();
  const back = await X.readWorkbook(buf);
  assert.equal(back.sheetName, 'Caisse');
  assert.deepEqual(back.opening, { date: '2025-01-06', amount: 2062.2, libelle: 'Solde à nouveau' });
  assert.equal(back.entries.length, 3);
  assert.deepEqual(back.entries.map((e) => [e.no, e.date, e.compte, e.debit, e.credit]), [
    [1, '2025-01-08', '51000.3662.50', null, 29.7],
    [2, '2025-01-09', '9206.101', 552, null],
    [3, '2025-01-10', '9111.100', 10000, null],
  ]);
  assert.equal(back.entries[0].libelle, 'REMBOURSEMENT - Collation - A. Dupraz');
  const t = X.computeTotals(back.opening, back.entries);
  assert.deepEqual(t, { start: 2062.2, debits: 10552, credits: 29.7, end: 12584.5 });
  assert.equal(X.suggestFileName(back.entries, back.opening), 'Caisse écoles 2025.xlsx');
});

test('solde à nouveau reconnu aussi quand la ligne s\'appelle « Report »', async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Caisse');
  ws.getRow(1).values = ['Date', 'No ', 'Compte', 'Libellé', 'Débit ', 'Crédit', 'Solde'];
  ws.getRow(2).values = [new Date(Date.UTC(2026, 0, 6)), 0, '', 'Report', null, null, 2062.2];
  ws.getRow(3).values = [new Date(Date.UTC(2026, 0, 12)), 1, '51000.3662.00', "DECOMPTE - Course d'école 5P/3 du 12.01.2026 Vevey - A. Berger", null, 120];
  const data = await X.readWorkbook(await wb.xlsx.writeBuffer());
  assert.equal(data.opening.amount, 2062.2);
  assert.equal(data.opening.date, '2026-01-06');
  assert.equal(data.entries.length, 1);
  assert.equal(data.entries[0].no, 1);
});

/* ------------------------------------------------------------------ */
/* Audit : reprise d'un classeur commencé à la main                       */
/* ------------------------------------------------------------------ */

test('solde à nouveau saisi 0.00 en débit et crédit reste reconnu', async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Caisse');
  ws.getRow(1).values = ['Date', 'No ', 'Compte', 'Libellé', 'Débit ', 'Crédit', 'Solde'];
  // beaucoup de classeurs tenus à la main portent 0.00 dans les colonnes Débit et Crédit
  ws.getRow(2).values = [new Date(Date.UTC(2026, 0, 1)), 0, '', 'Solde à nouveau', 0, 0, 2062.2];
  ws.getRow(3).values = [new Date(Date.UTC(2026, 0, 12)), 1, '51000.3662.00', 'DECOMPTE - Course - A. Berger', null, 120];
  const data = await X.readWorkbook(await wb.xlsx.writeBuffer());
  assert.equal(data.opening.amount, 2062.2);
  assert.equal(data.entries.length, 1, 'le solde à nouveau n\'est pas une écriture');
  assert.deepEqual(X.computeTotals(data.opening, data.entries), { start: 2062.2, debits: 0, credits: 120, end: 1942.2 });
});

test('une ligne vide finale qui porte encore la formule du solde n\'est pas prise pour le solde à nouveau', async () => {
  // classeur sans ligne « Solde à nouveau », avec des lignes pré-remplies à la fin
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Caisse');
  ws.getRow(1).values = ['Date', 'No ', 'Compte', 'Libellé', 'Débit ', 'Crédit', 'Solde'];
  ws.getRow(2).values = [new Date(Date.UTC(2026, 0, 12)), 1, '9100.104', 'RECETTE - Vente - N. Morel', 280, null, 280];
  ws.getCell('G3').value = { formula: 'G2+E3-F3', result: 280 }; // ligne vide pré-remplie
  const data = await X.readWorkbook(await wb.xlsx.writeBuffer());
  assert.equal(data.opening.amount, 0, `solde d'ouverture lu : ${data.opening.amount}`);
  assert.equal(data.entries.length, 1);
  assert.equal(X.computeTotals(data.opening, data.entries).end, 280);
});

test('un classeur avec un titre au-dessus du solde à nouveau reste lisible', async () => {
  // certains classeurs tenus à la main portent un titre ou une ligne vide avant les écritures
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Caisse');
  ws.getRow(1).values = ['Date', 'No ', 'Compte', 'Libellé', 'Débit ', 'Crédit', 'Solde'];
  ws.getRow(2).values = [null, null, '', 'Caisse des écoles – année 2026'];
  ws.getRow(3).values = [new Date(Date.UTC(2026, 0, 1)), 0, '', 'Solde à nouveau', null, null, 2062.2];
  ws.getRow(4).values = [new Date(Date.UTC(2026, 0, 12)), 1, '51000.3662.00', 'DECOMPTE - Course - A. Berger', null, 120];
  const data = await X.readWorkbook(await wb.xlsx.writeBuffer());
  assert.equal(data.opening.amount, 2062.2, `solde d'ouverture lu : ${data.opening.amount}`);
  assert.equal(X.computeTotals(data.opening, data.entries).end, 1942.2);
});
