/*
 * Données qui n'auraient pas dû arriver là : sauvegarde restaurée corrompue ou bricolée à la
 * main, classeur repris d'ailleurs, lecture de scan délirante, quantité tapée de travers.
 *
 * Le registre est la frontière : ce qui entre doit être fini, positif et vraisemblable, sinon
 * une seule valeur absurde emporte tout le journal — et un solde faux ne se voit pas.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/registre.js');
const P = require('../src/parser.js');

const sauvegarde = (over) => JSON.stringify(Object.assign({
  version: 1, annee: 2026, caisse: '9100.104',
  opening: { date: '2026-01-01', amount: 100 }, pieces: [], comptages: [],
}, over));

const piece = (over) => Object.assign({
  id: 'p1', no: 1, date: '2026-01-02', type: 'FRAIS', compte: '51000.3185.00',
  personne: 'A. Berger', libelle: 'FRAIS - x - A. Berger', sens: 'debit', montant: 10,
}, over);

/* ---------------- Montants ---------------- */

test('un montant qui déborde ne rend pas le journal infini', () => {
  // « 1e309 » vaut Infinity ; et round2 multiplie par 100, donc 1e308 déborde aussi.
  for (const mauvais of ['1e309', 1e308, '1e400', Number.MAX_VALUE]) {
    const reg = R.parse(sauvegarde({ pieces: [piece({ montant: mauvais })] }));
    assert.equal(reg.pieces[0].montant, 0, `montant ${mauvais} accepté`);
    const j = R.journal(reg);
    assert.ok(Number.isFinite(j.end), `solde infini avec ${mauvais}`);
  }
});

test('un montant négatif ne renverse pas le sens de l\'écriture', () => {
  // une « sortie » de −50 augmentait le solde : le sens porte déjà l'entrée ou la sortie
  const reg = R.parse(sauvegarde({ pieces: [piece({ montant: -50, sens: 'credit' })] }));
  assert.equal(reg.pieces[0].montant, 0);
  assert.equal(R.journal(reg).end, 100, 'le solde à nouveau doit être inchangé');
});

test('un montant illisible vaut zéro, et la pièce reste signalée', () => {
  for (const mauvais of ['abc', null, undefined, {}, [], NaN]) {
    const reg = R.parse(sauvegarde({ pieces: [piece({ montant: mauvais })] }));
    assert.equal(reg.pieces[0].montant, 0);
    // zéro plutôt que la perte de la pièce : validate() la signale, elle reste corrigeable
    assert.ok(R.validate(reg.pieces[0], reg).some((e) => /[Mm]ontant/.test(e)));
  }
});

test('les montants ordinaires traversent sans être touchés', () => {
  for (const bon of [29.7, 0.05, 1200, 4825.55, '143.95']) {
    const reg = R.parse(sauvegarde({ pieces: [piece({ montant: bon })] }));
    assert.equal(reg.pieces[0].montant, Number(bon));
  }
});

/* ---------------- Solde à nouveau ---------------- */

test('un solde à nouveau qui déborde vaut zéro', () => {
  for (const mauvais of ['1e309', 1e308, 'abc']) {
    const reg = R.parse(sauvegarde({ opening: { date: '2026-01-01', amount: mauvais } }));
    assert.equal(reg.opening.amount, 0);
    assert.ok(Number.isFinite(R.journal(reg).end));
  }
});

test('un solde à nouveau négatif reste négatif : ce n\'est pas absurde', () => {
  // un report d'erreur peut laisser un solde négatif ; le taire serait pire que le montrer
  const reg = R.parse(sauvegarde({ opening: { date: '2026-01-01', amount: -42.5 } }));
  assert.equal(reg.opening.amount, -42.5);
});

/* ---------------- Quantités d'un comptage ---------------- */

test('une quantité absurde ne rend pas le comptage infini', () => {
  const reg = R.parse(sauvegarde({ comptages: [{ date: '2026-02-01', counts: { 100: '1e309', 1000: 'abc', 50: -3 } }] }));
  const c = reg.comptages[0];
  assert.deepEqual(c.counts, {}, 'aucune de ces quantités ne devrait être retenue');
  assert.equal(c.total, 0);
  assert.ok(Number.isFinite(c.total));
});

test('une quantité décimale est un nombre de billets : elle est tronquée', () => {
  const reg = R.parse(sauvegarde({ comptages: [{ date: '2026-02-01', counts: { 20: 2.9 } }] }));
  assert.equal(reg.comptages[0].counts['20'], 2);
  assert.equal(reg.comptages[0].total, 40);
});

test('la quantité enregistrée dit la même chose que le total enregistré', () => {
  // le comptage stocke à la fois les quantités et leur total : s'ils sont bornés différemment,
  // le comptage relu ne correspond plus à son propre total
  const reg = R.parse(sauvegarde({ comptages: [{ date: '2026-02-01', counts: { 100: 3, 20: 2.9, 50: 1e309 } }] }));
  const c = reg.comptages[0];
  assert.equal(c.total, R.countTotal(c.counts).total);
});

/* ---------------- Aucune valeur infinie ne sort du registre ---------------- */

test('rien d\'infini ne ressort du registre, quoi qu\'on y mette', () => {
  const reg = R.parse(sauvegarde({
    opening: { date: '2026-01-01', amount: '1e309' },
    pieces: [piece({ no: 1, montant: '1e309' }), piece({ id: 'p2', no: 2, montant: -7, sens: 'credit' }), piece({ id: 'p3', no: 3, montant: 29.7, sens: 'credit' })],
    comptages: [{ date: '2026-02-01', counts: { 100: '1e309', 20: 3 } }],
  }));
  const j = R.journal(reg);
  const m = R.periodMovements(reg, null, '2026-12-31');
  const nombres = [j.start, j.debits, j.credits, j.end, R.balanceAt(reg, '2026-12-31'),
    m.encaissements, m.decaissements, reg.comptages[0].total];
  for (const n of nombres) assert.ok(Number.isFinite(n), `valeur non finie : ${n}`);
  assert.ok(reg.pieces.every((p) => Number.isFinite(p.montant) && p.montant >= 0));
});

/* ---------------- Lecture d'une ligne brouillée ---------------- */

test('une ligne d\'initiales en rafale se tranche tout de suite', () => {
  // « A. A. A. … » est ce qu'un OCR produit sur une ligne brouillée. L'expression régulière des
  // noms explorait 2^n chemins avant d'échouer : 9 s à 28 répétitions, des minutes au-delà.
  for (const n of [28, 60, 400]) {
    const t0 = process.hrtime.bigint();
    P.looksLikePerson('A. '.repeat(n) + '!');
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    assert.ok(ms < 200, `${n} répétitions ont pris ${ms.toFixed(0)} ms`);
  }
});

test('les vraies formes de noms restent reconnues', () => {
  for (const bon of ['A. Berger', 'Ch. Dupraz', 'A.-L. Delacroix', 'F.N. Ravel', 'Mme Dupont', 'J. Tissot (donné à la classe)']) {
    assert.ok(P.looksLikePerson(bon), `« ${bon} » n'est plus reconnu`);
  }
  for (const mauvais of ['pas une personne', '', 'REMBOURSEMENT', '51000.3185.00']) {
    assert.ok(!P.looksLikePerson(mauvais), `« ${mauvais} » est pris pour une personne`);
  }
});

test('une ligne très longue n\'est jamais un nom de personne', () => {
  assert.ok(!P.looksLikePerson('A. ' + 'Berger '.repeat(100)));
});

/* ---------------- Pas de pollution de prototype ---------------- */

test('une sauvegarde bricolée ne pollue pas les objets de l\'application', () => {
  const reg = R.parse(JSON.stringify({
    version: 1, annee: 2026, caisse: '9100.104', opening: { date: '2026-01-01', amount: 0 },
    pieces: [{ id: 'a', no: 1, montant: 1, sens: 'debit', __proto__: { pollue: 1 } }],
    comptages: [{ date: '2026-01-02', counts: { __proto__: { pollue: 1 }, constructor: { x: 1 }, 100: 2 } }],
  }));
  assert.equal({}.pollue, undefined);
  assert.equal({}.x, undefined);
  assert.deepEqual(reg.comptages[0].counts, { 100: 2 });
});

/* ---------------- Lecture des PDF : la parade doit rester en place ---------------- */

test('chaque lecture de PDF désarme l\'évaluation de code de pdf.js', () => {
  // pdf.js 3.x est exposé à CVE-2024-4367 : une police fabriquée dans un PDF malveillant fait
  // exécuter du JavaScript. La parade documentée est isEvalSupported: false, et l'application
  // ouvre par métier des PDF venus de tiers. Si un jour un appel l'oublie, ce test le dit.
  const fs = require('fs');
  const path = require('path');
  const dir = path.join(__dirname, '..', 'src');
  const oublis = [];
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    const re = /getDocument\s*\(\s*\{([^}]*)\}/g;
    let m;
    while ((m = re.exec(src))) {
      if (!/isEvalSupported\s*:\s*false/.test(m[1])) oublis.push(`${f} : getDocument({${m[1].trim().slice(0, 60)}…`);
    }
  }
  assert.deepEqual(oublis, [], 'un appel à pdf.js sans isEvalSupported: false');
});

test('la version livrée porte la même parade que les sources', () => {
  const fs = require('fs');
  const path = require('path');
  const dist = path.join(__dirname, '..', 'dist', 'Caisse-ecoles.html');
  if (!fs.existsSync(dist)) return; // pas encore construite
  const html = fs.readFileSync(dist, 'utf8');
  const appels = html.match(/getDocument\(\{[^}]*\}/g) || [];
  assert.ok(appels.length > 0, 'aucun appel trouvé dans la version livrée');
  for (const a of appels) assert.match(a, /isEvalSupported:\s*false/, `appel sans parade : ${a.slice(0, 70)}`);
});
