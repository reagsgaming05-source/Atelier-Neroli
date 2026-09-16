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

test('comptage de la caisse : totaux, dernier comptage, solde du journal à une date, aller-retour JSON', () => {
  const reg = R.emptyRegister(2026, { openingAmount: 100 });
  const mk = (no, date, montant, sens) => { const p = R.newPiece(reg); Object.assign(p, { no, date, montant, sens, compte: '51000.3662.00', personne: 'A. Berger', type: sens === 'debit' ? 'RECETTE' : 'REMBOURSEMENT' }); p.libelle = R.composeLibelle(p); R.upsertPiece(reg, p); };
  mk(1, '2026-01-10', 50, 'credit'); mk(2, '2026-02-01', 200, 'debit'); mk(3, '2026-03-15', 12.35, 'credit');
  assert.equal(R.balanceAt(reg, '2026-01-01'), 100);
  assert.equal(R.balanceAt(reg, '2026-01-10'), 50);
  assert.equal(R.balanceAt(reg, '2026-02-20'), 250);
  assert.equal(R.balanceAt(reg, '2026-12-31'), 237.65);
  const t = R.countTotal({ 100: 3, 20: 2, 0.5: 3, 0.05: 1, 1000: 0, 5: -2 });
  assert.deepEqual(t, { billets: 340, pieces: 1.55, total: 341.55 });
  const c1 = R.upsertCount(reg, { date: '2026-02-20', counts: { 200: 1, 20: 2, 5: 2 }, note: 'fin février', createdAt: '2026-02-20T10:00:00.000Z' });
  assert.equal(c1.total, 250);
  assert.deepEqual(c1.counts, { 200: 1, 20: 2, 5: 2 });
  const c2 = R.upsertCount(reg, { date: '2026-01-05', counts: { 100: 1 }, createdAt: '2026-01-05T10:00:00.000Z' });
  assert.deepEqual(reg.comptages.map((c) => c.date), ['2026-01-05', '2026-02-20'], 'triés par date');
  assert.equal(R.previousCount(reg, '2026-03-20', null).id, c1.id);
  assert.equal(R.previousCount(reg, '2026-02-20', null).id, c1.id, 'même jour : comptage existant compte comme précédent');
  assert.equal(R.previousCount(reg, '2026-02-20', c1).id, c2.id, 'en modification, le comptage lui-même est ignoré');
  assert.equal(R.previousCount(reg, '2026-01-01', null), null);
  // modification en place, suppression
  R.upsertCount(reg, { id: c2.id, date: '2026-01-05', counts: { 100: 1, 0.05: 1 }, createdAt: c2.createdAt });
  assert.equal(reg.comptages.length, 2);
  assert.equal(reg.comptages[0].total, 100.05);
  const back = R.normalizeRegister(JSON.parse(R.serialize(reg)));
  assert.equal(back.comptages.length, 2);
  assert.equal(back.comptages[1].note, 'fin février');
  assert.equal(back.comptages[1].total, 250);
  R.removeCount(reg, c1.id);
  assert.equal(reg.comptages.length, 1);
  assert.equal(R.emptyRegister(2027).comptages.length, 0);
});

test("reprise d'un classeur Excel dans le registre : doublons par n°, conflits, solde à nouveau, autre année", () => {
  const reg = R.emptyRegister(2026, { openingAmount: 0 });
  const entries = [
    { no: 1, date: '2026-01-12', compte: '51000.3662.00', libelle: "DECOMPTE - Course d'école 5P/3 du 12.01.2026 Vevey - A. Berger", debit: null, credit: 120 },
    { no: 2, date: '2026-02-03', compte: '51000.4392.20', libelle: 'PARTICIPATION DES PARENTS - Cours de ski 5P/6 du 06-10.01.2026 - Ch. Dupraz', debit: 400, credit: null },
    { no: 3, date: '2025-12-20', compte: '50000.3652.00', libelle: 'REMBOURSEMENT - Frais - T. Morel', debit: null, credit: 30 },
    { no: 'x', date: '2026-02-03', compte: '', libelle: 'note sans montant', debit: null, credit: null },
  ];
  const r = R.mergeEntries(reg, entries, { source: 'excel', opening: { date: '2026-01-06', amount: 2062.2 } });
  assert.equal(r.openingTaken, true);
  assert.equal(reg.opening.amount, 2062.2);
  assert.equal(reg.opening.date, '2026-01-06');
  assert.equal(r.added.length, 2);
  assert.equal(r.otherYears.length, 1);
  assert.equal(r.noAmount.length, 1);
  assert.equal(reg.pieces.length, 2);
  assert.equal(reg.pieces[0].source, 'excel');
  assert.equal(reg.pieces[0].type, 'DECOMPTE');
  assert.equal(reg.pieces[0].personne, 'A. Berger');
  assert.equal(reg.pieces[1].sens, 'debit');
  assert.equal(R.nextNo(reg), 3);
  assert.equal(R.journal(reg).end, 2342.2);
  // seconde reprise du même classeur : rien n'est compté deux fois ; un n° déjà pris avec un autre montant est signalé
  const again = entries.slice(0, 2).concat([{ no: 2, date: '2026-02-03', compte: '51000.4392.20', libelle: 'PARTICIPATION DES PARENTS - Cours de ski - Ch. Dupraz', debit: 450, credit: null }]);
  const r2 = R.mergeEntries(reg, again, { source: 'excel', opening: { date: '2026-01-06', amount: 100 } });
  assert.equal(r2.added.length, 0);
  assert.equal(r2.skipped.length, 2);
  assert.equal(r2.conflicts.length, 1);
  assert.equal(r2.openingDiffers, true);
  assert.equal(reg.opening.amount, 2062.2);
  assert.equal(reg.pieces.length, 2);
  // écritures d'une autre année acceptées explicitement
  const r3 = R.mergeEntries(reg, [entries[2]], { source: 'excel', otherYears: true });
  assert.equal(r3.added.length, 1);
  assert.equal(reg.pieces.length, 3);
  // aller-retour JSON : la source « excel » est conservée
  const back = R.parse(R.serialize(reg));
  assert.equal(back.pieces.filter((p) => p.source === 'excel').length, 3);
});

test("classeur Excel de l'année → registre → classeur : mêmes écritures, même solde", async () => {
  const ExcelJS = require('exceljs');
  const X = require('../src/excel.js')(ExcelJS);
  const reg0 = R.emptyRegister(2026, { openingAmount: 500, openingDate: '2026-01-01' });
  const a = R.newPiece(reg0);
  Object.assign(a, { type: 'DECOMPTE', objet: 'Camp', classe: '8P/3', periode: '12-16.05.2026', detail: 'Leysin', personne: 'L. Duvernay', montant: 250.5, sens: 'credit', compte: '51000.3662.00', date: '2026-05-20' });
  a.libelle = R.composeLibelle(a);
  R.upsertPiece(reg0, a);
  const b = R.newPiece(reg0);
  Object.assign(b, { type: 'PARTICIPATION DES PARENTS', objet: 'Camp', classe: '8P/3', periode: '12-16.05.2026', personne: 'L. Duvernay', montant: 1200, sens: 'debit', compte: '51000.4392.00', date: '2026-05-04' });
  b.libelle = R.composeLibelle(b);
  R.upsertPiece(reg0, b);
  // classeur produit par l'application (ancienne méthode ou « Fichier Excel de l'année »)
  const { workbook } = X.buildWorkbook({ opening: { date: reg0.opening.date, amount: reg0.opening.amount }, entries: R.entriesOf(reg0) });
  const buf = await workbook.xlsx.writeBuffer();
  const data = await X.readWorkbook(buf);
  assert.equal(data.entries.length, 2);
  // repris dans un registre vide : mêmes n°, mêmes libellés, même solde, numérotation qui continue
  const reg1 = R.emptyRegister(2026, { openingAmount: 0 });
  const r = R.mergeEntries(reg1, data.entries, { source: 'excel', opening: data.opening });
  assert.equal(r.added.length, 2);
  assert.equal(reg1.opening.amount, 500);
  assert.equal(reg1.opening.date, '2026-01-01');
  assert.deepEqual(reg1.pieces.map((p) => [p.no, p.libelle, p.montant, p.sens, p.compte]), reg0.pieces.map((p) => [p.no, p.libelle, p.montant, p.sens, p.compte]));
  assert.equal(R.journal(reg1).end, R.journal(reg0).end);
  assert.equal(R.nextNo(reg1), 3);
  // le même classeur repris une seconde fois ne change rien
  const r2 = R.mergeEntries(reg1, data.entries, { source: 'excel', opening: data.opening });
  assert.equal(r2.added.length, 0);
  assert.equal(r2.skipped.length, 2);
});

test('registre illisible : jamais remplacé par un registre vide', () => {
  assert.deepEqual(R.readStored(null), { reg: null });
  assert.deepEqual(R.readStored('   '), { reg: null });
  const bad = R.readStored('{"annee":2026,"pieces":[');
  assert.equal(bad.reg, null);
  assert.ok(bad.error);
  const reg = R.emptyRegister(2026, { openingAmount: 12 });
  assert.equal(R.readStored(R.serialize(reg)).reg.annee, 2026);
  assert.equal(R.readStored(R.serialize(reg)).error, undefined);
});

test('solde du journal à une date : les pièces sans date sont comptées comme dans le journal', () => {
  const reg = R.emptyRegister(2026, { openingAmount: 100 });
  R.upsertPiece(reg, R.normalizePiece({ no: 1, date: null, type: 'FRAIS', personne: 'A. Berger', montant: 10, sens: 'credit', compte: '50000.3652.00' }));
  R.upsertPiece(reg, R.normalizePiece({ no: 2, date: '2026-08-01', type: 'RECETTE', personne: 'Ch. Dupraz', montant: 30, sens: 'debit', compte: '51000.4392.00' }));
  assert.equal(R.balanceAt(reg, '2026-06-30'), 90); // la pièce sans date compte, celle d'août pas encore
  assert.equal(R.balanceAt(reg, '2026-12-31'), R.journal(reg).end);
});

test('dates impossibles refusées (30 février)', () => {
  assert.equal(R.isRealDate('2026-02-30'), false);
  assert.equal(R.isRealDate('2026-13-01'), false);
  assert.equal(R.isRealDate('2026-02-28'), true);
  const reg = R.emptyRegister(2026, {});
  const p = R.newPiece(reg);
  Object.assign(p, { date: '2026-02-30', type: 'FRAIS', personne: 'A. Berger', montant: 10, sens: 'credit', compte: '50000.3652.00' });
  assert.ok(R.validate(p, reg).some((e) => /Date/.test(e)));
});

test("écriture sans montant : ni sens ni pièce inventés ; reprise sans n° non comptée deux fois", () => {
  const [p] = R.piecesFromEntries([{ no: 5, date: '2026-02-02', compte: '50000.3652.00', libelle: 'REMBOURSEMENT - x - A. Berger', debit: 0, credit: 50 }]);
  assert.equal(p.montant, 50);
  assert.equal(p.sens, 'credit');
  const [vide] = R.piecesFromEntries([{ no: 6, date: '2026-02-02', compte: '', libelle: 'note', debit: null, credit: null }]);
  assert.equal(vide.montant, 0);
  assert.equal(vide.sens, null);
  // même ligne sans n° reprise deux fois : comptée une seule fois
  const reg = R.emptyRegister(2026, {});
  const ligne = [{ no: null, date: '2026-03-03', compte: '50000.3652.00', libelle: 'FRAIS - Timbres - A. Berger', debit: null, credit: 8.5 }];
  assert.equal(R.mergeEntries(reg, ligne, { source: 'excel' }).added.length, 1);
  assert.equal(R.mergeEntries(reg, ligne, { source: 'excel' }).added.length, 0);
  assert.equal(reg.pieces.length, 1);
});
