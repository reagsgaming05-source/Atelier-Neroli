const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/registre.js');
const V = require('../src/vocabulaire.js');

test('registre : pièce composée, compte proposé, validation, journal, aller-retour JSON', () => {
  const reg = R.emptyRegister(2026, { openingAmount: 2062.2, openingDate: '2026-01-06' });
  assert.equal(R.nextNo(reg), 1);
  const p = R.newPiece(reg);
  Object.assign(p, { type: 'DECOMPTE', objet: "Course d'école", classe: '5P/3', periode: '12.06.2026', detail: 'Lausanne', personne: 'A. Berger', montant: 143.95, sens: 'credit' });
  const sugg = R.accountSuggestions(p, V, reg);
  assert.equal(sugg[0].compte, '51000.3662.00');
  p.compte = sugg[0].compte;
  assert.equal(R.composeLibelle(p), "DECOMPTE - Course d'école 5P/3 du 12.06.2026 Lausanne - A. Berger");
  assert.deepEqual(R.validate(p, reg), []);
  R.upsertPiece(reg, p);
  // participation des parents : sens fixé par le libellé, compte du cours de ski
  const p2 = R.newPiece(reg);
  assert.equal(p2.no, 2);
  Object.assign(p2, { type: 'PARTICIPATION DES PARENTS', objet: 'Cours de ski', classe: '5P/6', periode: '06-10.01.2026', detail: 'aux Pléiades, 20 élèves', personne: 'Ch. Dupraz', montant: 400 });
  p2.sens = R.sensFor(p2.type);
  assert.equal(p2.sens, 'debit');
  p2.compte = R.accountSuggestions(p2, V, reg)[0].compte;
  assert.equal(p2.compte, '51000.4392.20');
  assert.deepEqual(R.validate(p2, reg), []);
  R.upsertPiece(reg, p2);
  const j = R.journal(reg);
  assert.equal(j.rows.length, 2);
  assert.equal(j.rows[0].solde, 1918.25);
  assert.equal(j.end, 2318.25);
  assert.equal(j.debits, 400);
  assert.equal(j.credits, 143.95);
  // erreurs
  const bad = R.normalizePiece({ no: 2, date: '2025-03-01', type: 'AVANCE', montant: 0, compte: '9100.104', personne: '' });
  const errs = R.validate(bad, reg);
  assert.ok(errs.some((e) => /n° 2 existe déjà/.test(e)));
  assert.ok(errs.some((e) => /année 2026/.test(e)));
  assert.ok(errs.some((e) => /Montant/.test(e)));
  assert.ok(errs.some((e) => /compte caisse/.test(e)));
  assert.ok(errs.some((e) => /Sens/.test(e)));
  assert.ok(errs.some((e) => /Personne/.test(e)));
  // aller-retour
  const back = R.parse(R.serialize(reg));
  assert.equal(back.pieces.length, 2);
  assert.equal(back.opening.amount, 2062.2);
  assert.equal(R.nextNo(back), 3);
  assert.equal(R.parse('{"annee": 12}'), null);
  // suppression
  R.removePiece(back, back.pieces[0].id);
  assert.equal(back.pieces.length, 1);
});

test('registre : pièces créées depuis des écritures lues sur des PDF', () => {
  const pieces = R.piecesFromEntries([{ no: 117, date: '2025-06-04', compte: '51000.4392.00', libelle: 'PARTICIPATION DES PARENTS - Classe 3P/6 Camp du 10-13.06.25 - T. Morel', debit: 1280, credit: null }]);
  assert.equal(pieces.length, 1);
  const p = pieces[0];
  assert.equal(p.type, 'PARTICIPATION DES PARENTS');
  assert.equal(p.objet, 'Camp');
  assert.equal(p.personne, 'T. Morel');
  assert.equal(p.sens, 'debit');
  assert.equal(p.montant, 1280);
  assert.equal(p.source, 'scan');
  assert.equal(R.composeLibelle(Object.assign({}, p, { libelle: '' })), 'PARTICIPATION DES PARENTS - Classe 3P/6 Camp du 10-13.06.25 - T. Morel');
});
