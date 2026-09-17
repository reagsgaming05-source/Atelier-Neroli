/*
 * Audit : propriétés qui doivent tenir sur n'importe quel registre.
 * Les pièces sont tirées au hasard avec une graine fixe (reproductible).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const R = require('../src/registre.js');
const P = require('../src/parser.js');
const X = require('../src/excel.js')(ExcelJS);

// générateur reproductible (xorshift)
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 0x100000000; };
}

const TYPES = ['REMBOURSEMENT', 'RECETTE', 'AVANCE', 'DECOMPTE', 'PARTICIPATION DES PARENTS', 'RETRAIT'];
const PERSONNES = ['A. Berger', 'Ch. Dupraz', 'T. Morel', 'L. Duvernay', 'S. Monod'];
const COMPTES = ['51000.3662.00', '9206.101', '50000.3652.00', '51000.4392.20', '9111.100'];

function registreAleatoire(seed, n) {
  const r = rng(seed);
  const pick = (a) => a[Math.floor(r() * a.length) % a.length];
  const reg = R.emptyRegister(2026, { openingAmount: Math.round(r() * 500000) / 100, openingDate: '2026-01-01' });
  for (let i = 0; i < n; i++) {
    const p = R.newPiece(reg);
    Object.assign(p, {
      type: pick(TYPES),
      objet: 'Autre',
      detail: `dépense ${i}`,
      personne: pick(PERSONNES),
      compte: pick(COMPTES),
      // montants aux deux décimales, y compris des valeurs qui tombent mal en flottant
      montant: Math.round(r() * 300000) / 100 + 0.01,
      sens: r() < 0.5 ? 'debit' : 'credit',
      date: `2026-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`,
    });
    p.libelle = R.composeLibelle(p);
    R.upsertPiece(reg, p);
  }
  return reg;
}

test('journal, classeur produit et relecture donnent le même solde', async () => {
  for (const seed of [1, 7, 42, 1234, 99991]) {
    const reg = registreAleatoire(seed, 25);
    const j = R.journal(reg);

    // 1. le solde final du journal = solde à nouveau + débits − crédits
    assert.equal(j.end, P.round2(reg.opening.amount + j.debits - j.credits), `graine ${seed} : journal incohérent`);

    // 2. le classeur produit annonce le même solde final
    const { workbook, finalBalance } = X.buildWorkbook({ opening: reg.opening, entries: R.entriesOf(reg) });
    assert.equal(finalBalance, j.end, `graine ${seed} : solde du classeur différent du journal`);

    // 3. relire le classeur redonne le même solde à nouveau, les mêmes écritures et le même total
    const relu = await X.readWorkbook(await workbook.xlsx.writeBuffer());
    assert.equal(relu.opening.amount, P.round2(reg.opening.amount), `graine ${seed} : solde à nouveau relu`);
    assert.equal(relu.entries.length, reg.pieces.length, `graine ${seed} : nombre d'écritures relues`);
    const t = X.computeTotals(relu.opening, relu.entries);
    assert.equal(t.end, j.end, `graine ${seed} : solde après relecture`);
    assert.equal(t.debits, j.debits, `graine ${seed} : total des débits`);
    assert.equal(t.credits, j.credits, `graine ${seed} : total des crédits`);
  }
});

test('reprendre un classeur dans un registre vide redonne le même solde', async () => {
  for (const seed of [3, 77, 4242]) {
    const reg = registreAleatoire(seed, 15);
    const attendu = R.journal(reg);
    const { workbook } = X.buildWorkbook({ opening: reg.opening, entries: R.entriesOf(reg) });
    const relu = await X.readWorkbook(await workbook.xlsx.writeBuffer());

    const vide = R.emptyRegister(2026, { openingAmount: 0, openingDate: '2026-01-01' });
    const res = R.mergeEntries(vide, relu.entries, { opening: relu.opening, source: 'excel' });
    assert.equal(res.conflicts.length, 0, `graine ${seed} : conflits à la reprise`);
    assert.equal(res.noAmount.length, 0, `graine ${seed} : écritures sans montant`);
    assert.equal(res.added.length, reg.pieces.length, `graine ${seed} : ${res.added.length} reprises sur ${reg.pieces.length}`);
    assert.equal(R.journal(vide).end, attendu.end, `graine ${seed} : solde après reprise`);
  }
});

test('reprendre deux fois le même classeur n\'ajoute rien la seconde fois', async () => {
  const reg = registreAleatoire(11, 12);
  const { workbook } = X.buildWorkbook({ opening: reg.opening, entries: R.entriesOf(reg) });
  const relu = await X.readWorkbook(await workbook.xlsx.writeBuffer());
  const vide = R.emptyRegister(2026, { openingAmount: 0, openingDate: '2026-01-01' });
  R.mergeEntries(vide, relu.entries, { opening: relu.opening, source: 'excel' });
  const solde = R.journal(vide).end;
  const encore = R.mergeEntries(vide, relu.entries, { opening: relu.opening, source: 'excel' });
  assert.equal(encore.added.length, 0, 'des écritures ont été reprises deux fois');
  assert.equal(R.journal(vide).end, solde, 'le solde a bougé à la seconde reprise');
});
