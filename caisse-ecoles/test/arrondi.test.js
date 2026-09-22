/*
 * L'arrondi au centime.
 *
 * « Math.round(n * 100) / 100 » a l'air juste et ne l'est pas : 1.005 vaut 100.49999999999999 une
 * fois multiplié par 100, et redescendait donc à 1.00. Un centime perdu n'a l'air de rien, mais
 * c'est un centime que le journal ne retrouvera jamais, et un comptage qui ne tombe pas juste.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/parser.js');
const R = require('../src/registre.js');

test('round2 rend le centime juste, y compris sur un demi-centime', () => {
  // ce que l'ancienne formule rendait faux
  assert.equal(P.round2(1.005), 1.01);
  assert.equal(P.round2(8.165), 8.17);
  assert.equal(P.round2(1.015), 1.02);
  assert.equal(P.round2(0.145), 0.15);
  // un demi-centime négatif s'arrondit au large de zéro, comme une caisse le ferait
  assert.equal(P.round2(-1.005), -1.01);
  assert.equal(P.round2(-0.005), -0.01);
  // et ce qui était déjà juste le reste
  assert.equal(P.round2(0.1 + 0.2), 0.3);
  assert.equal(P.round2(2.675), 2.68);
  assert.equal(P.round2(7.895000195129094), 7.9);
  assert.equal(P.round2(-465842.4350002437), -465842.44);
  assert.equal(P.round2(0.20499959344770424), 0.2);
  assert.equal(P.round2(2.5), 2.5);
  assert.equal(P.round2(-2.5), -2.5);
  assert.equal(P.round2(0), 0);
  assert.equal(P.round2(12.3), 12.3);
});

test('round2 ne rend jamais un nombre à plus de deux décimales', () => {
  for (let i = 0; i < 20000; i++) {
    const n = (Math.random() * 2 - 1) * Math.pow(10, Math.floor(Math.random() * 7));
    const r = P.round2(n);
    assert.equal(Math.round(r * 100) / 100, r, `${n} -> ${r}`);
  }
});

test('round2 laisse passer ce qui n\'est pas un nombre utilisable', () => {
  assert.ok(Number.isNaN(P.round2(NaN)));
  assert.equal(P.round2(Infinity), Infinity);
  assert.equal(P.round2(-Infinity), -Infinity);
});

test('un montant absurde déborde toujours : c\'est ce qui le fait rejeter', () => {
  // le registre s'appuie là-dessus (montantOk, soldeOk) pour ramener à zéro un montant impossible
  for (const v of [1e308, Number.MAX_VALUE, 1e400]) {
    assert.equal(P.round2(Number(v)), Infinity, `${v} devrait déborder`);
  }
  assert.equal(P.round2(-1e308), -Infinity);
});

test('un nombre minuscule vaut zéro, sans devenir NaN', () => {
  // le décalage de virgule par le texte ne marche pas en notation exponentielle (« 1e-7 ») :
  // sans garde, un centime de rien rendait NaN et contaminait tout le solde
  for (const v of [1e-7, 1e-20, 0.0001, 0.004, 5e-324]) {
    assert.equal(P.round2(v), 0, `${v}`);
    assert.ok(!Number.isNaN(P.round2(-v)), `-${v}`);
  }
  assert.equal(P.round2(0.005), 0.01); // le demi-centime, lui, compte
});

test('aucun nombre ordinaire ne sort de round2 en NaN', () => {
  for (let i = 0; i < 50000; i++) {
    const n = (Math.random() * 2 - 1) * Math.pow(10, Math.floor(Math.random() * 30) - 15);
    assert.ok(!Number.isNaN(P.round2(n)), `${n} -> NaN`);
  }
});

test('un montant tapé au demi-centime entre au journal pour sa valeur juste', () => {
  assert.equal(R.parseAmountInput('10.005'), 10.01);
  assert.equal(R.parseAmountInput('1.005'), 1.01);
  // et le solde du journal suit
  const reg = R.emptyRegister(2026, { openingAmount: 0 });
  const p = R.newPiece(reg);
  Object.assign(p, {
    no: 1, date: '2026-03-01', type: 'REMBOURSEMENT', detail: 'piles', personne: 'A. Berger',
    compte: '51000.3185.00', montant: 1.005, sens: 'debit',
  });
  R.upsertPiece(reg, p);
  assert.equal(R.journal(reg).end, 1.01);
});

test('le classeur Excel arrondit exactement comme l\'application', () => {
  // excel.js recopie round2 (il ne dépend que d'ExcelJS). Les deux doivent rendre le même
  // centime : sinon le classeur remis à la bourse ne dit pas ce que l'écran affiche. Ce test
  // existe pour que la copie ne dérive pas en silence.
  const X = require('../src/excel.js')(null);
  const cas = [1.005, -1.005, 8.165, 1.015, 0.005, -0.005, 0.1 + 0.2, 2.675, 12.3, 0, 1e-7];
  for (const v of cas) {
    assert.equal(X.computeTotals({ amount: v }, []).start, P.round2(v), `solde à nouveau ${v}`);
  }
  // et sur une écriture, où le total passe par la même formule
  for (const v of [1.005, 8.165, 2.675]) {
    const t = X.computeTotals({ amount: 0 }, [{ debit: v, credit: null }]);
    assert.equal(t.end, P.round2(v), `débit ${v}`);
  }
});
