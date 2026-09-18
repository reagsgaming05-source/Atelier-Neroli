/*
 * Une seule liste : les pièces lues sur un scan entrent au journal dès la lecture et s'y
 * maintiennent à jour, sans jamais faire de doublon avec ce qui a été saisi à la main.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/registre.js');

const reg2026 = () => R.emptyRegister(2026, { openingAmount: 1000, openingDate: '2026-01-01' });

const lu = (over) => Object.assign({
  scanKey: 'doc:1:1', no: 10, date: '2026-03-01', compte: '51000.3185.00',
  libelle: 'REMBOURSEMENT - Piles - R. Desaules', debit: null, credit: 12, warnings: [],
}, over);

test('une écriture lue entre au journal tout de suite, marquée à vérifier', () => {
  const reg = reg2026();
  const res = R.syncScanBatch(reg, [lu({ warnings: ['Numéro 10 proposé : à vérifier'] })]);
  assert.equal(res.ajoutees.length, 1);
  assert.equal(reg.pieces.length, 1);
  const p = reg.pieces[0];
  assert.equal(p.source, 'scan');
  assert.equal(p.aVerifier, true);
  assert.deepEqual(p.doutes, ['Numéro 10 proposé : à vérifier']);
  assert.equal(R.journal(reg).end, 988); // 1000 − 12 : elle compte dans le solde
  assert.equal(R.pendingPieces(reg).length, 1);
});

test('relire le même lot ne crée pas de seconde pièce : il met la première à jour', () => {
  const reg = reg2026();
  R.syncScanBatch(reg, [lu({ credit: 12 })]);
  const id = reg.pieces[0].id;
  // l'OCR finit et corrige le montant
  const res = R.syncScanBatch(reg, [lu({ credit: 12.5 })]);
  assert.equal(reg.pieces.length, 1, 'une seconde pièce a été créée');
  assert.equal(res.misesAJour.length, 1);
  assert.equal(reg.pieces[0].id, id, "la pièce a changé d'identité");
  assert.equal(reg.pieces[0].montant, 12.5);
  assert.equal(R.journal(reg).end, 987.5);
});

test('une pièce déjà saisie à la main ne se dédouble pas : la lecture s\'y rattache', () => {
  const reg = reg2026();
  const main = R.newPiece(reg);
  Object.assign(main, { no: 10, date: '2026-03-01', type: 'REMBOURSEMENT', detail: 'piles', personne: 'R. Desaules', compte: '51000.3185.00', montant: 12, sens: 'credit' });
  main.libelle = R.composeLibelle(main);
  R.upsertPiece(reg, main);

  const res = R.syncScanBatch(reg, [lu()]);
  assert.equal(reg.pieces.length, 1, 'la pièce a été ajoutée une seconde fois');
  assert.equal(res.rattachees.length, 1);
  assert.equal(res.ajoutees.length, 0);
  const p = reg.pieces[0];
  assert.equal(p.source, 'saisie', 'la pièce saisie à la main a été réécrite');
  assert.equal(p.aVerifier, false, 'une pièce saisie à la main ne devient pas « à vérifier »');
  assert.equal(p.scanKey, 'doc:1:1');
  assert.equal(R.journal(reg).end, 988);
});

test('une pièce vérifiée n\'est plus réécrite par une relecture', () => {
  const reg = reg2026();
  R.syncScanBatch(reg, [lu({ credit: 12 })]);
  R.markVerified(reg, [reg.pieces[0].id]);
  assert.equal(reg.pieces[0].aVerifier, false);
  assert.deepEqual(reg.pieces[0].doutes, []);
  const res = R.syncScanBatch(reg, [lu({ credit: 999 })]);
  assert.equal(res.inchangees.length, 1);
  assert.equal(reg.pieces[0].montant, 12, 'la pièce vérifiée a été écrasée par une relecture');
});

test('retirer un lot enlève ses pièces non vérifiées et libère celles saisies à la main', () => {
  const reg = reg2026();
  const main = R.newPiece(reg);
  Object.assign(main, { no: 10, date: '2026-03-01', type: 'REMBOURSEMENT', detail: 'piles', personne: 'R. Desaules', compte: '51000.3185.00', montant: 12, sens: 'credit' });
  main.libelle = R.composeLibelle(main);
  R.upsertPiece(reg, main);
  R.syncScanBatch(reg, [lu(), lu({ scanKey: 'doc:1:2', no: 11, credit: null, debit: 300, libelle: 'PARTICIPATION DES PARENTS - Ski - E. Vallon' })]);
  assert.equal(reg.pieces.length, 2);

  const partis = R.removeScanBatch(reg, ['doc:1:1', 'doc:1:2']);
  assert.equal(partis.length, 1, 'seule la pièce lue doit partir');
  assert.equal(reg.pieces.length, 1);
  assert.equal(reg.pieces[0].id, main.id, 'la pièce saisie à la main a été supprimée');
  assert.equal(reg.pieces[0].scanKey, '', 'le lien avec le lot retiré subsiste');
  assert.equal(R.journal(reg).end, 988);
});

test('une écriture sans montant lisible n\'entre pas au journal', () => {
  const reg = reg2026();
  const res = R.syncScanBatch(reg, [lu({ debit: null, credit: null })]);
  assert.equal(res.sansMontant.length, 1);
  assert.equal(reg.pieces.length, 0);
});

test('le lot versé survit à l\'enregistrement et à la relecture du fichier', () => {
  const reg = reg2026();
  R.syncScanBatch(reg, [lu({ warnings: ['Date proposée'] })]);
  const relu = R.normalizeRegister(JSON.parse(JSON.stringify(reg)));
  const p = relu.pieces[0];
  assert.equal(p.aVerifier, true);
  assert.equal(p.scanKey, 'doc:1:1');
  assert.deepEqual(p.doutes, ['Date proposée']);
});

test('relire sans rien changer ne réécrit pas le registre', () => {
  const reg = reg2026();
  R.syncScanBatch(reg, [lu({ warnings: ['Date proposée'] })]);
  const marque = reg.updatedAt;
  const res = R.syncScanBatch(reg, [lu({ warnings: ['Date proposée'] })]);
  assert.equal(res.misesAJour.length, 0, 'une écriture identique a été réécrite');
  assert.equal(res.inchangees.length, 1);
  assert.equal(reg.updatedAt, marque, 'le registre a été marqué modifié sans raison');
});
