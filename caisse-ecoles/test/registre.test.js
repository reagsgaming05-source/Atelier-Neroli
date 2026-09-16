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

test('pièce DECOMPTE proposée depuis un dossier Décompte DGEO terminé', () => {
  const reg = R.emptyRegister(2026, { openingAmount: 100 });
  const d = { id: 'abc', filename: 'decompte.pdf', numero: 'D-2026-07', type_activite: 'course', activite: 'Lausanne', classe: '5P/3', enseignant: 'A. Berger',
    date_debut: '12.06.2026', date_fin: '12.06.2026', date_decompte: '20.06.2026', form_expenses: [{ paye_enseignant: 100.5 }, { paye_enseignant: 43.45, paye_commune: 12 }], form_total: 155.95, total: 24.4 };
  const { piece, amounts, amountSource } = R.pieceFromDecompte(d, reg);
  assert.equal(piece.type, 'DECOMPTE');
  assert.equal(piece.objet, "Course d'école");
  assert.equal(piece.classe, '5P/3');
  assert.equal(piece.periode, '12.06.2026');
  assert.equal(piece.personne, 'A. Berger');
  assert.equal(piece.date, '2026-06-20');
  assert.equal(piece.montant, 143.95);
  assert.equal(piece.sens, 'credit');
  assert.equal(amountSource, 'enseignant');
  assert.deepEqual(amounts, { enseignant: 143.95, formulaire: 155.95, etat: 24.4 });
  assert.equal(piece.source, 'dgeo');
  assert.equal(piece.ref, 'D-2026-07');
  assert.equal(piece.libelle, "DECOMPTE - Course d'école 5P/3 du 12.06.2026 Lausanne - A. Berger");
  assert.equal(R.validate(Object.assign(piece, { compte: '51000.3662.00' }), reg).length, 0);
  // camp sur plusieurs jours, sans montant payé par l'enseignant-e : total du formulaire, sens laissé au choix
  const camp = R.pieceFromDecompte({ type_activite: 'camp', activite: 'Leysin', classe: '8P/3', enseignant: 'T. Morel', date_debut: '12.05.2026', date_fin: '16.05.2026', date_decompte: '01.06.2025', form_total: 2560, total: 400 }, reg);
  assert.equal(camp.piece.periode, '12-16.05.2026');
  assert.equal(camp.piece.montant, 2560);
  assert.equal(camp.amountSource, 'formulaire');
  assert.equal(camp.piece.sens, null);
  assert.equal(camp.piece.date, R.today(), 'date du décompte hors année : date du jour');
  assert.equal(camp.piece.libelle, 'DECOMPTE - Camp 8P/3 du 12-16.05.2026 Leysin - T. Morel');
  assert.equal(R.periodOf('29.06.2026', '02.07.2026'), '29.06-02.07.2026');
  assert.equal(R.periodOf('20.12.2026', '03.01.2027'), '20.12.2026-03.01.2027');
  // la source et la référence survivent à la relecture du registre
  R.upsertPiece(reg, piece);
  const back = R.normalizeRegister(JSON.parse(R.serialize(reg)));
  assert.equal(back.pieces[0].source, 'dgeo');
  assert.equal(back.pieces[0].ref, 'D-2026-07');
});
