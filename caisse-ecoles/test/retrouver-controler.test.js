/*
 * Retrouver une pièce et contrôler l'année : recherche libre dans le journal, trous et doublons
 * dans la suite des numéros, et lecture de l'écart entre la caisse comptée et le journal.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/registre.js');

function registre(pieces, opening) {
  const reg = R.emptyRegister(2026, { openingAmount: opening == null ? 1000 : opening, openingDate: '2026-01-01' });
  for (const [no, date, type, detail, personne, compte, montant, sens] of pieces) {
    const p = R.newPiece(reg);
    Object.assign(p, { no, date, type, detail, personne, compte, montant, sens });
    p.libelle = R.composeLibelle(p);
    R.upsertPiece(reg, p);
  }
  return reg;
}

const TROIS = [
  [1, '2026-03-03', 'REMBOURSEMENT', 'collation du chœur', 'A. Berger', '51000.3662.50', 29.7, 'credit'],
  [2, '2026-03-07', 'RECETTE', 'vente de fondues', 'T. Morel', '9206.101', 552, 'debit'],
  [3, '2026-06-12', 'AVANCE', 'camp de Leysin', 'L. Duvernay', '52000.3662.00', 1200, 'credit'],
];

/* ---------------- Recherche ---------------- */

test('une recherche vide rend tout le journal', () => {
  const j = R.journal(registre(TROIS));
  assert.equal(R.searchRows(j.rows, '').length, 3);
  assert.equal(R.searchRows(j.rows, '   ').length, 3);
});

test('on cherche par personne, par objet, par compte et par numéro', () => {
  const j = R.journal(registre(TROIS));
  const nos = (q) => R.searchRows(j.rows, q).map((r) => r.no);
  assert.deepEqual(nos('berger'), [1]);
  assert.deepEqual(nos('leysin'), [3]);
  assert.deepEqual(nos('9206.101'), [2]);
  assert.deepEqual(nos('3'), [3]); // le n° 3, pas les comptes ni les dates qui contiennent un 3
  assert.deepEqual(nos('552'), [2]); // un montant entier se retrouve aussi
  assert.deepEqual(nos('9206'), [2]); // un groupe entier du compte, oui
  assert.deepEqual(nos('510'), []); // un début de compte, non : « 510 » n'est pas un groupe
  assert.deepEqual(nos('06'), [3]); // « 06 » trouve juin, tel que la date l'écrit
  assert.deepEqual(nos('2026'), [1, 2, 3]); // l'année, elle, est dans les trois
});

test('la date se cherche comme on la lit autant que comme elle est stockée', () => {
  const j = R.journal(registre(TROIS));
  assert.deepEqual(R.searchRows(j.rows, '12.06.2026').map((r) => r.no), [3]);
  assert.deepEqual(R.searchRows(j.rows, '2026-06').map((r) => r.no), [3]);
  assert.deepEqual(R.searchRows(j.rows, '03.2026').map((r) => r.no), [1, 2]);
});

test('le montant se cherche tel qu\'il est affiché', () => {
  const j = R.journal(registre(TROIS));
  assert.deepEqual(R.searchRows(j.rows, '29.70').map((r) => r.no), [1]);
  assert.deepEqual(R.searchRows(j.rows, '1200').map((r) => r.no), [3]);
});

test('plusieurs mots : toutes les conditions, pas une seule', () => {
  const j = R.journal(registre(TROIS));
  assert.deepEqual(R.searchRows(j.rows, 'camp duvernay').map((r) => r.no), [3]);
  assert.deepEqual(R.searchRows(j.rows, 'camp berger').map((r) => r.no), []);
});

test('la recherche ne touche pas au solde cumulé de la ligne', () => {
  const j = R.journal(registre(TROIS));
  const seule = R.searchRows(j.rows, 'leysin')[0];
  // solde de l'année à cette ligne : 1000 − 29.70 + 552 − 1200
  assert.equal(seule.solde, 322.3);
  assert.equal(seule.solde, j.rows[2].solde);
});

test('la recherche ignore la casse et les accents du texte tapé tel quel', () => {
  const j = R.journal(registre(TROIS));
  assert.deepEqual(R.searchRows(j.rows, 'CHŒUR').map((r) => r.no), [1]);
  assert.deepEqual(R.searchRows(j.rows, 'Recette').map((r) => r.no), [2]);
});

/* ---------------- Suite des numéros ---------------- */

test('une suite complète ne signale rien', () => {
  const c = R.numberChecks(registre(TROIS));
  assert.deepEqual(c.manquants, []);
  assert.deepEqual(c.doublons, []);
  assert.equal(c.premier, 1);
  assert.equal(c.dernier, 3);
});

test('un numéro sauté est signalé : c\'est une pièce papier jamais saisie', () => {
  const reg = registre([TROIS[0], TROIS[2]]); // n° 1 et 3
  const c = R.numberChecks(reg);
  assert.deepEqual(c.manquants, [2]);
});

test('une année qui commence à 12 n\'a pas onze trous', () => {
  const reg = registre([
    [12, '2026-03-03', 'REMBOURSEMENT', 'piles', 'A. Berger', '51000.3185.00', 12, 'credit'],
    [13, '2026-03-04', 'RECETTE', 'vente', 'T. Morel', '9206.101', 40, 'debit'],
  ]);
  const c = R.numberChecks(reg);
  assert.deepEqual(c.manquants, []);
  assert.equal(c.premier, 12);
});

test('un numéro employé deux fois est signalé', () => {
  const reg = registre(TROIS);
  const p = R.newPiece(reg);
  Object.assign(p, { no: 2, date: '2026-04-01', type: 'FRAIS', montant: 8, sens: 'credit', compte: '51000.3185.00', personne: 'A. Berger' });
  p.libelle = R.composeLibelle(p);
  R.upsertPiece(reg, p);
  assert.deepEqual(R.numberChecks(reg).doublons, [2]);
});

test('les pièces sans numéro sont comptées à part, pas prises pour des trous', () => {
  const reg = registre(TROIS);
  const p = R.newPiece(reg);
  Object.assign(p, { no: null, date: '2026-04-01', type: 'FRAIS', montant: 8, sens: 'credit', compte: '51000.3185.00', personne: 'A. Berger' });
  R.upsertPiece(reg, p);
  const c = R.numberChecks(reg);
  assert.equal(c.sansNo, 1);
  assert.deepEqual(c.manquants, []);
});

test('les trous se regroupent en plages : une reprise ne fait pas une liste de 200 numéros', () => {
  const reg = registre([
    [1, '2026-01-05', 'FRAIS', 'piles', 'A. Berger', '51000.3185.00', 12, 'credit'],
    [201, '2026-05-04', 'FRAIS', 'papier', 'A. Berger', '51000.3185.00', 30, 'credit'],
    [203, '2026-05-09', 'FRAIS', 'colle', 'A. Berger', '51000.3185.00', 8, 'credit'],
  ]);
  const c = R.numberChecks(reg);
  assert.equal(c.manquants.length, 200); // 2–200 puis 202
  assert.deepEqual(c.plages, [[2, 200], [202, 202]]);
});

test('une suite sans trou n\'a aucune plage', () => {
  assert.deepEqual(R.numberChecks(registre(TROIS)).plages, []);
});

test('un registre vide ne signale rien', () => {
  const c = R.numberChecks(R.emptyRegister(2026));
  assert.deepEqual(c.manquants, []);
  assert.equal(c.premier, null);
});

/* ---------------- Écart caisse / journal ---------------- */

test('une caisse juste n\'a rien à expliquer', () => {
  assert.deepEqual(R.explainGap(registre(TROIS), 0), []);
});

test('un écart qui vaut le montant d\'une pièce la désigne', () => {
  const pistes = R.explainGap(registre(TROIS), -1200);
  const m = pistes.filter((x) => x.genre === 'montant');
  assert.equal(m.length, 1);
  assert.equal(m[0].piece.no, 3);
});

test('un écart du double, du bon côté, désigne une pièce inscrite à l\'envers', () => {
  // n° 3 : 1200 au crédit. Passée au débit par erreur, le journal serait 2400 trop haut,
  // donc la caisse comptée est 2400 plus basse que le journal : écart = −2400… non :
  // inscrite au crédit alors qu'elle devait être au débit → journal 2400 trop bas → écart +2400.
  const pistes = R.explainGap(registre(TROIS), 2400);
  const s = pistes.filter((x) => x.genre === 'sens');
  assert.equal(s.length, 1);
  assert.equal(s[0].piece.no, 3);
});

test('le double du mauvais côté n\'est pas une piste : l\'erreur de sens a un signe', () => {
  const s = R.explainGap(registre(TROIS), -2400).filter((x) => x.genre === 'sens');
  assert.deepEqual(s, []);
});

test('une pièce au débit inscrite à l\'envers se repère avec le signe opposé', () => {
  // n° 2 : 552 au débit. Si elle devait être au crédit, le journal est 1104 trop haut
  // → la caisse comptée est 1104 plus basse : écart = −1104.
  const s = R.explainGap(registre(TROIS), -1104).filter((x) => x.genre === 'sens');
  assert.equal(s.length, 1);
  assert.equal(s[0].piece.no, 2);
  assert.deepEqual(R.explainGap(registre(TROIS), 1104).filter((x) => x.genre === 'sens'), []);
});

test('un trou dans la numérotation est proposé comme piste quand la caisse ne tombe pas juste', () => {
  const reg = registre([TROIS[0], TROIS[2]]); // n° 2 manquant
  const pistes = R.explainGap(reg, -80);
  const n = pistes.filter((x) => x.genre === 'numero');
  assert.equal(n.length, 1);
  assert.deepEqual(n[0].manquants, [2]);
});

test('les pièces postérieures au comptage ne sont pas des pistes', () => {
  const reg = registre(TROIS);
  // comptage au 31 mars : le camp du 12 juin n'existe pas encore
  const pistes = R.explainGap(reg, -1200, '2026-03-31');
  assert.deepEqual(pistes.filter((x) => x.genre === 'montant'), []);
});

test('un écart qui ne correspond à rien ne fabrique pas de piste', () => {
  const pistes = R.explainGap(registre(TROIS), -77.35);
  assert.deepEqual(pistes.filter((x) => x.genre !== 'numero'), []);
});
