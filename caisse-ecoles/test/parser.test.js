const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/parser.js');

test('normalizeAmount tolère les erreurs OCR et les séparateurs', () => {
  assert.equal(P.normalizeAmount("CHF 10'OOO.OQ"), 10000);
  assert.equal(P.normalizeAmount('CHF2\'500. 00'), 2500);
  assert.equal(P.normalizeAmount('CHF 2-500. 00'), 2500);
  assert.equal(P.normalizeAmount('CHF 29. 70'), 29.7);
  assert.equal(P.normalizeAmount('CHF1\'000.00'), 1000);
  assert.equal(P.normalizeAmount('CHF 1-800. 00'), 1800);
  assert.equal(P.normalizeAmount('CHF80. 45'), 80.45);
  assert.equal(P.normalizeAmount('552.00'), 552);
  assert.equal(P.normalizeAmount('1234'), 1234);
  assert.equal(P.normalizeAmount('CHF rooo. oo'), null);
  assert.equal(P.normalizeAmount(''), null);
});

test('normalizeAccount nettoie les espaces et lettres OCR', () => {
  assert.equal(P.normalizeAccount('51000. 3662. 50'), '51000.3662.50');
  assert.equal(P.normalizeAccount("51000. 3662. 00'"), '51000.3662.00');
  assert.equal(P.normalizeAccount('9100. 104'), '9100.104');
  assert.equal(P.normalizeAccount('9lOO.1O4'), '9100.104');
  assert.equal(P.normalizeAccount('35308.3151'), '35308.3151');
  assert.equal(P.normalizeAccount('CHF 29.70'), null);
});

test('findDate reconnaît jj.mm.aaaa et jj.mm.aa', () => {
  assert.equal(P.findDate('08. 01. 2025'), '2025-01-08');
  assert.equal(P.findDate('du 23.01.25'), '2025-01-23');
  assert.equal(P.findDate('30.01. 2025'), '2025-01-30');
  assert.equal(P.findDate('Total'), null);
  assert.equal(P.isoToDisplay('2025-01-08'), '08.01.2025');
  assert.equal(P.displayToIso('8.1.2025'), '2025-01-08');
});

test('splitType reconnaît et corrige le type en tête du libellé', () => {
  assert.deepEqual(P.splitType('REMBOURSEMENT collation chœur 7-11S'), { type: 'REMBOURSEMENT', rest: 'collation chœur 7-11S' });
  assert.deepEqual(P.splitType("REMBOURSMENT soirée numérique à l'école"), { type: 'REMBOURSEMENT', rest: "soirée numérique à l'école" });
  assert.deepEqual(P.splitType('PARTICIPATION DES PARENTS'), { type: 'PARTICIPATION DES PARENTS', rest: '' });
  assert.deepEqual(P.splitType('DECOMPTE échange linguistique 11VP/4'), { type: 'DECOMPTE', rest: 'échange linguistique 11VP/4' });
  assert.deepEqual(P.splitType('Cours de ski'), { type: null, rest: 'Cours de ski' });
});

test('formatLibelle compose "TYPE - Description - Personne"', () => {
  assert.equal(P.formatLibelle('AVANCE', "course d'école OS LAT 9S du 17.01.2025", 'L. Favre'), "AVANCE - Course d'école OS LAT 9S du 17.01.2025 - L. Favre");
  assert.equal(P.formatLibelle(null, 'divers', null), 'Divers');
  assert.equal(P.cleanDescription('du 12. 12. 2024 , test'), 'du 12.12.2024, test');
});

test('looksLikePerson', () => {
  assert.equal(P.looksLikePerson('A. Nagy'), true);
  assert.equal(P.looksLikePerson('Ch. Ansermet'), true);
  assert.equal(P.looksLikePerson('J. Gertsch (donné à Isabelle Braillard)'), true);
  assert.equal(P.looksLikePerson('vente de fondues'), false);
  assert.equal(P.looksLikePerson('5P/3 - 18 élèves'), false);
});

// Fabrique une page de formulaire synthétique (positions en points, origine en haut à gauche)
function makePage(opts) {
  const w = (str, x, y) => ({ str, x, y, h: 10 });
  const words = [
    w('PIECE', 79, 82), w('COMPTABLE', 114, 82), w(opts.no, 349, 79), w('fe', 534, 79),
    w('DOIT', 79, 114), w('-', 118, 114), w('N°', 130, 114), w('du', 141, 114), w('compte', 158, 114),
    w('SOMME', 338, 112), w('AVOIR', 410, 112), w('-', 462, 112), w('N°', 475, 112), w('du', 487, 112), w('compte', 504, 112),
    w('Libellé', 342, 220), w('Total', 78, 390),
  ];
  let y = 142;
  for (const line of opts.lines || []) {
    if (line.doit) line.doit.split(' ').forEach((s, i) => words.push(w(s, 155 + i * 31, y)));
    if (line.somme) line.somme.split(' ').forEach((s, i) => words.push(w(s, 332 + i * 24, y)));
    if (line.avoir) line.avoir.split(' ').forEach((s, i) => words.push(w(s, 454 + i * 28, y)));
    y += 14;
  }
  if (opts.total) opts.total.split(' ').forEach((s, i) => words.push(w(s, 332 + i * 24, 388)));
  let ly = 261;
  for (const l of opts.libelle || []) {
    l.split(' ').forEach((s, i) => words.push(w(s, 78 + i * 40, ly)));
    ly += 14;
  }
  if (opts.signature) words.push(w(opts.signature, 430, 350));
  if (opts.date) opts.date.split(' ').forEach((s, i) => words.push(w(s, 56 + i * 14, 425)));
  return { pageNumber: opts.pageNumber || 1, width: 595, height: 842, words };
}

test('analyzePage lit une pièce (sortie de caisse)', () => {
  const page = makePage({
    no: '01',
    lines: [{ doit: '51000. 3662. 50', somme: 'CHF 29. 70', avoir: '9100. 104' }],
    total: 'CHF 29. 70',
    libelle: ['REMBOURSEMENT collation chœur 7-11S', 'concert du 12. 12. 2024', 'A. Nagy'],
    signature: 'A^dn',
    date: '08. 01. 2025',
  });
  const info = P.analyzePage(page);
  assert.equal(info.no, 1);
  assert.deepEqual(info.doit, ['51000.3662.50']);
  assert.deepEqual(info.avoir, ['9100.104']);
  assert.equal(info.total, 29.7);
  assert.equal(info.date, '2025-01-08');
  assert.deepEqual(info.libelleLines, ['REMBOURSEMENT collation chœur 7-11S', 'concert du 12. 12. 2024', 'A. Nagy']);
  const e = P.buildEntry(info, { caisse: '9100.104' });
  assert.equal(e.credit, 29.7);
  assert.equal(e.debit, null);
  assert.equal(e.compte, '51000.3662.50');
  assert.equal(e.libelle, 'REMBOURSEMENT - Collation chœur 7-11S concert du 12.12.2024 - A. Nagy');
  assert.deepEqual(e.warnings, []);
});

test('analyzePage lit une entrée en caisse avec montant OCR abîmé', () => {
  const page = makePage({
    no: '04',
    lines: [{ doit: '9100. 104', somme: "CHF 10'OOO.OQ", avoir: '9111.100' }],
    total: "CHF 10'OOO. OQ",
    libelle: ['RETRAIT bourse communale', 'du 10. 01.2025', 'F. Eminaj'],
    date: '10. 01. 2025',
  });
  const e = P.buildEntry(P.analyzePage(page), { caisse: '9100.104' });
  assert.equal(e.debit, 10000);
  assert.equal(e.credit, null);
  assert.equal(e.compte, '9111.100');
  assert.equal(e.type, 'RETRAIT');
  assert.equal(e.person, 'F. Eminaj');
});

test('pièce à plusieurs comptes : total retenu, avertissement', () => {
  const page = makePage({
    no: '03',
    lines: [
      { doit: '9100. 104', somme: 'CHF 552. 00', avoir: '52000. 4390. 30' },
      { doit: '52000. 3819. 10', somme: 'CHF 552. 00', avoir: '9206. 101' },
    ],
    total: 'CHF 552. 00',
    libelle: ['RECETTE caisse de classe 10VG/2', 'vente de fondues', 'N. Borlat'],
    date: '09. 01. 2025',
  });
  const e = P.buildEntry(P.analyzePage(page), { caisse: '9100.104' });
  assert.equal(e.debit, 552);
  assert.equal(e.compte, '52000.4390.30');
  assert.deepEqual(e.candidates, ['52000.4390.30', '9206.101']);
  assert.ok(e.warnings.some((w) => /Plusieurs comptes/.test(w)));
});

test('compte caisse des deux côtés : sens deviné, compte suggéré par l\'historique', () => {
  const p1 = makePage({ pageNumber: 1, no: '20', lines: [{ doit: '9100. 104', somme: 'CHF 360. 00', avoir: '9100. 104' }], total: 'CHF 360. 00', libelle: ['PARTICIPATION DES PARENTS', 'Cours de ski', 'E. Heymoz'], date: '30. 01. 2025' });
  const p2 = makePage({ pageNumber: 2, no: '21', lines: [{ doit: '9100. 104', somme: 'CHF 420. 00', avoir: '51000. 4392. 20' }], total: 'CHF 420. 00', libelle: ['PARTICIPATION DES PARENTS', 'Cours de ski', 'J. Pellet'], date: '30. 01. 2025' });
  const res = P.parseDocument([p1, p2], { caisse: '9100.104' });
  const e20 = res.entries.find((e) => e.no === 20);
  assert.equal(e20.debit, 360);
  assert.equal(e20.compte, '51000.4392.20');
  assert.equal(e20.suggested, true);
  assert.ok(e20.warnings.some((w) => /DOIT et à l'AVOIR/.test(w)));
});

test('parseDocument ignore les doublons, signale les numéros manquants et les pages sans pièce', () => {
  const p1 = makePage({ pageNumber: 1, no: '01', lines: [{ doit: '51000.3662.50', somme: 'CHF 29.70', avoir: '9100.104' }], total: 'CHF 29.70', libelle: ['REMBOURSEMENT test', 'A. Nagy'], date: '08.01.2025' });
  const ticket = { pageNumber: 2, width: 595, height: 842, words: [{ str: 'COOP', x: 100, y: 100, h: 10 }, { str: 'Total', x: 100, y: 200, h: 10 }] };
  const p1bis = makePage({ pageNumber: 3, no: '01', lines: [{ doit: '51000.3662.50', somme: 'CHF 29.70', avoir: '9100.104' }], total: 'CHF 29.70', libelle: ['REMBOURSEMENT test', 'A. Nagy'], date: '08.01.2025' });
  const p3 = makePage({ pageNumber: 4, no: '03', lines: [{ doit: '9100.104', somme: 'CHF 552.00', avoir: '9206.101' }], total: 'CHF 552.00', libelle: ['RECETTE vente', 'N. Borlat'], date: '09.01.2025' });
  const empty = { pageNumber: 5, width: 595, height: 842, words: [] };
  const res = P.parseDocument([p1, ticket, p1bis, p3, empty], { caisse: '9100.104', existingNumbers: [3] });
  assert.equal(res.entries.length, 2);
  assert.deepEqual(res.duplicates, [{ no: 1, page: 3, sameAs: 1 }]);
  assert.deepEqual(res.emptyPages, [5]);
  assert.ok(res.warnings.some((w) => /manquants : 2/.test(w)));
  assert.ok(res.entries[1].warnings.some((w) => /existe déjà/.test(w)));
  assert.equal(P.detectCaisseAccount([p1, p3]), '9100.104');
});

test('typeFromLibelle retrouve le type dans un libellé du journal', () => {
  assert.equal(P.typeFromLibelle('PARTICIPATION PARENTS - Cours de ski aux Pléiades 5P/6 - Ch. Ansermet'), 'PARTICIPATION PARENTS');
  assert.equal(P.typeFromLibelle('Solde à nouveau'), null);
});
