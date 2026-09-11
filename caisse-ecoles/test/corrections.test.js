const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/parser.js');

const sampleEntries = [
  { no: 1, compte: '51000.3662.50', libelle: 'REMBOURSEMENT - Collation concert 7-11S du 12.12.24 - A. Nagy' },
  { no: 3, compte: '9206.101', libelle: 'RECETTE caisse de classe 10VG/2 vente de fondues - N. Borlat' },
  { no: 6, compte: '52000.3662.00', libelle: 'AVANCE - Camp de ski 9S à Leysin du 10-14.02.2025 - K. Mauclet' },
  { no: 17, compte: '50000.3652.00', libelle: "REMBOURSEMENT - Soirée numérique à l'école du 21.01.25, panneau d'exposition et frais de douane - A. Nicolet" },
  { no: 99, compte: '51000.3199.00', libelle: 'CADEAU - Départ à la retraite - A.-L. Emmenegger' },
];

test('learnVocabulary extrait mots, noms, classes et comptes du classeur', () => {
  const v = P.learnVocabulary(sampleEntries);
  assert.ok(v.words.includes('Collation'));
  assert.ok(v.words.includes('exposition'), 'd\'exposition -> exposition');
  assert.ok(v.persons.includes('N. Borlat'));
  assert.ok(v.persons.includes('A.-L. Emmenegger'));
  assert.ok(v.classTokens.includes('10VG/2'));
  assert.ok(v.classTokens.includes('7-11S'));
  assert.ok(v.accounts.includes('9206.101'));
  assert.ok(v.typeAccounts.some((t) => t.type === 'RECETTE' && t.compte === '9206.101'));
  const merged = P.mergeVocabulary(v, P.learnVocabulary([{ no: 5, compte: '9111.100', libelle: 'RETRAIT - Bourse communale - F. Eminaj' }]));
  assert.ok(merged.persons.includes('F. Eminaj') && merged.persons.includes('N. Borlat'));
  assert.equal(JSON.parse(JSON.stringify(merged)).words.length, merged.words.length);
});

test('correctWord corrige les confusions OCR mais pas les mots légitimes', () => {
  const idx = P.buildIndex(P.learnVocabulary(sampleEntries));
  assert.equal(P.correctWord('chour', idx), 'chœur');
  assert.equal(P.correctWord('expbsition', idx), 'exposition');
  assert.equal(P.correctWord('Collatlon', idx), 'Collation');
  assert.equal(P.correctWord('Leysin', idx), null, 'mot connu');
  assert.equal(P.correctWord('vélo', idx), null, 'mot inconnu sans candidat');
  assert.equal(P.correctWord('pommes', idx), null, 'mot du lexique de base');
  assert.equal(P.correctWord('REMBOURSEMENT', idx), null, 'sigle/majuscules');
});

test('correctClassToken corrige 98 -> 9S et 7-118 -> 7-11S', () => {
  const idx = P.buildIndex(P.learnVocabulary(sampleEntries));
  assert.equal(P.correctClassToken('98', idx), '9S');
  assert.equal(P.correctClassToken('7-118', idx), '7-11S');
  assert.equal(P.correctClassToken('5P/6', idx), null);
  assert.equal(P.correctClassToken('2025', idx), null);
  assert.equal(P.correctClassToken('20', idx), null, 'un nombre ordinaire reste tel quel');
});

test('correctDescription et correctPerson', () => {
  const idx = P.buildIndex(P.learnVocabulary(sampleEntries));
  const r = P.correctDescription("collation chour 7-118 concert du 12.12.2024, panneaux d'expbsition", idx);
  assert.equal(r.text, "collation chœur 7-11S concert du 12.12.2024, panneaux d'exposition");
  assert.deepEqual(r.notes, ['chour → chœur', '7-118 → 7-11S', 'expbsition → exposition']);
  assert.equal(P.correctPerson('N. Boriat', idx), 'N. Borlat');
  assert.equal(P.correctPerson('A. Boriat', idx), null, 'initiale différente');
  assert.equal(P.correctPerson('N. Borlat', idx), null, 'déjà correct');
  assert.equal(P.correctPerson('J. Gertsch (donné à I. Braillard)', idx), null);
  assert.equal(P.looksLikePerson('A.-L. Emmenegger'), true);
  assert.equal(P.looksLikePerson('F.N. Olgiati'), true);
});

test('normalizeAmount en mode tolérant lit "CHF rooo. oo"', () => {
  assert.equal(P.normalizeAmount('CHF rooo. oo'), null);
  assert.equal(P.normalizeAmount('CHF rooo. oo', true), 1000);
  assert.equal(P.normalizeAmount('CHF 2S0.00', true), 250);
});

function makeForm(opts) {
  const w = (str, x, y) => ({ str, x, y: y + (opts.dy || 0), h: 10 });
  const words = [
    w('PIECE', 79, 82), w('COMPTABLE', 114, 82), w(opts.no, 349, 79), w('fe', 534, 79),
    w('DOIT', 79, 114), w('-', 118, 114), w('du', 141, 114), w('compte', 158, 114),
    w('SOMME', 338, 112), w('AVOIR', 410, 112), w('-', 462, 112), w('du', 487, 112), w('compte', 504, 112),
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
  for (const l of opts.libelle || []) { l.split(' ').forEach((s, i) => words.push(w(s, 78 + i * 40, ly))); ly += 14; }
  if (opts.date) opts.date.split(' ').forEach((s, i) => words.push(w(s, 56 + i * 14, 425)));
  return words;
}

test('deux formulaires sur une même page sont reconnus séparément', () => {
  const words = makeForm({ no: '40', lines: [{ doit: '51000.3185.00', somme: 'CHF 12.00', avoir: '9100.104' }], total: 'CHF 12.00', libelle: ['REMBOURSEMENT piles', 'R. Perrier'], date: '01.03.2025' })
    .concat(makeForm({ no: '41', dy: 420, lines: [{ doit: '9100.104', somme: 'CHF 300.00', avoir: '51000.4392.20' }], total: 'CHF 300.00', libelle: ['PARTICIPATION DES PARENTS', 'Cours de ski', 'E. Heymoz'], date: '02.03.2025' }));
  const page = { pageNumber: 7, width: 595, height: 842, words };
  assert.equal(P.countForms(page), 2);
  const res = P.parseDocument([page], { caisse: '9100.104' });
  assert.deepEqual(res.entries.map((e) => [e.no, e.debit, e.credit, e.date, e.part]), [[40, null, 12, '2025-03-01', 1], [41, 300, null, '2025-03-02', 2]]);
});

test('numéro et date manquants : proposés d\'après la pièce précédente', () => {
  const p1 = { pageNumber: 1, width: 595, height: 842, words: makeForm({ no: '10', lines: [{ doit: '51000.3185.00', somme: 'CHF 12.00', avoir: '9100.104' }], total: 'CHF 12.00', libelle: ['REMBOURSEMENT piles', 'R. Perrier'], date: '01.03.2025' }) };
  const p2 = { pageNumber: 2, width: 595, height: 842, words: makeForm({ no: '??', lines: [{ doit: '51000.3185.00', somme: 'CHF 15.00', avoir: '9100.104' }], total: 'CHF 15.00', libelle: ['REMBOURSEMENT gants', 'R. Perrier'] }) };
  const res = P.parseDocument([p1, p2], { caisse: '9100.104' });
  const e = res.entries[1];
  assert.equal(e.no, 11);
  assert.equal(e.date, '2025-03-01');
  assert.ok(e.warnings.some((w) => /Numéro 11 proposé/.test(w)));
  assert.ok(e.warnings.some((w) => /Date 01.03.2025 proposée/.test(w)));
});

test('compte inconnu proche d\'un compte connu : signalé et proposé (jamais corrigé d\'office) ; caisse approchée reconnue', () => {
  const page = { pageNumber: 1, width: 595, height: 842, words: makeForm({ no: '12', lines: [{ doit: '51000.3185.08', somme: 'CHF 12.00', avoir: '9100.184' }], total: 'CHF 12.00', libelle: ['REMBOURSEMENT piles', 'R. Perrier'], date: '01.03.2025' }) };
  const vocab = P.learnVocabulary([{ no: 1, compte: '51000.3185.00', libelle: 'REMBOURSEMENT - Matériel pharmacie - R. Perrier' }]);
  const res = P.parseDocument([page], { caisse: '9100.104', vocabulary: vocab });
  const e = res.entries[0];
  assert.equal(e.compte, '51000.3185.08', 'le compte lu est conservé');
  assert.equal(e.credit, 12);
  assert.ok(e.warnings.some((w) => /jamais utilisé.*ressemble à 51000\.3185\.00/.test(w)));
  assert.ok(e.candidates.includes('51000.3185.00'), 'proposé comme alternative');
  assert.ok(e.notes.some((n) => /9100.184/.test(n)));
  assert.ok(!e.warnings.some((w) => /n'apparaît pas/.test(w)));
  // un sous-compte voisin légitime déjà connu n'est pas signalé
  const vocab2 = P.learnVocabulary([{ no: 1, compte: '51000.3185.00', libelle: 'REMBOURSEMENT - A - R. Perrier' }, { no: 2, compte: '51000.3185.08', libelle: 'REMBOURSEMENT - B - R. Perrier' }]);
  const e2 = P.parseDocument([page], { caisse: '9100.104', vocabulary: vocab2 }).entries[0];
  assert.ok(!e2.warnings.some((w) => /jamais utilisé/.test(w)));
});

test('montant illisible : lecture tolérante proposée avec avertissement', () => {
  const page = { pageNumber: 1, width: 595, height: 842, words: makeForm({ no: '13', lines: [{ doit: '51000.3185.00', somme: 'CHF rooo. oo', avoir: '9100.104' }], total: 'CHF rooo. oo', libelle: ['REMBOURSEMENT piles', 'R. Perrier'], date: '01.03.2025' }) };
  const res = P.parseDocument([page], { caisse: '9100.104' });
  const e = res.entries[0];
  assert.equal(e.credit, 1000);
  assert.ok(e.warnings.some((w) => /difficile à lire/.test(w)));
});

test('scan incliné : les mots d\'une même ligne restent groupés', () => {
  const words = [];
  'REMBOURSEMENT matériel pharmacie camp'.split(' ').forEach((s, i) => words.push({ str: s, x: 78 + i * 60, y: 261 + i * 1.8, h: 10 }));
  'R. Perrier'.split(' ').forEach((s, i) => words.push({ str: s, x: 78 + i * 20, y: 275 + i * 1.8, h: 10 }));
  const lines = P.groupLines(words);
  assert.deepEqual(lines.map((l) => l.text), ['REMBOURSEMENT matériel pharmacie camp', 'R. Perrier']);
});
