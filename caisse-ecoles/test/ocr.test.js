const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/parser.js');
const O = require('../src/ocr.js');

// image RGBA blanche W×H avec des pixels noirs donnés
function image(W, H, black) {
  const data = new Uint8ClampedArray(W * H * 4).fill(255);
  for (const [x, y] of black) { const i = (y * W + x) * 4; data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; }
  return { width: W, height: H, data };
}

test('preprocess efface les traits longs et garde les petits signes', () => {
  const W = 200; const H = 100; const black = [];
  for (let x = 0; x < W; x++) black.push([x, 50]); // ligne horizontale pleine largeur
  for (let y = 0; y < H; y++) black.push([100, y]); // ligne verticale
  for (let x = 20; x < 26; x++) black.push([x, 20]); // tiret court (un caractère)
  const out = O.preprocess(image(W, H, black), { minRun: 30 });
  const px = (x, y) => out.data[(y * W + x) * 4];
  assert.equal(px(10, 50), 255, 'trait horizontal effacé');
  assert.equal(px(100, 10), 255, 'trait vertical effacé');
  assert.equal(px(22, 20), 0, 'tiret court conservé');
  assert.equal(px(5, 5), 255);
});

test('cleanWords retire les résidus de traits mais garde la ponctuation utile', () => {
  const words = [{ str: '|REMBOURSEMENT', conf: 90 }, { str: '—', conf: 40 }, { str: '_', conf: 10 }, { str: '-', conf: 80 }, { str: '“oo', conf: 5 }, { str: 'A.', conf: 90 }];
  assert.deepEqual(O.cleanWords(words).map((w) => w.str), ['REMBOURSEMENT', '-', 'oo', 'A.']);
});

test('lecture des zones : n°, montants, comptes, date', () => {
  const w = (str, conf, x) => ({ str, conf, x: x || 0, y: 10, w: 20, h: 10 });
  assert.deepEqual(O.readNo([w('|', 3), w('115', 96)]), { value: 115, conf: 96, raw: '115' });
  assert.equal(O.readNo([w('abc', 90)]), null);
  const amounts = O.readAmounts([w('CHF', 93, 0), w("6'000.00", 4, 30)]);
  assert.deepEqual(amounts, [{ value: 6000, conf: 4, raw: "CHF 6'000.00" }]);
  const acc = O.readAccounts([w('9100.104', 82), w('LU', 11), w('51000.4392.20', 89), w('_', 92)]);
  assert.deepEqual(acc.map((a) => a.value), ['9100.104', '51000.4392.20']);
  assert.deepEqual(O.readDate([w('08.01.2025', 96)]), { value: '2025-01-08', conf: 96, raw: '08.01.2025' });
});

test('mergeLibelle remplace les jetons illisibles par les mots OCR à la même place', () => {
  const index = P.buildIndex(P.learnVocabulary([{ no: 1, compte: '50000.3652.00', libelle: 'REMBOURSEMENT - Repas préparé par les élèves pour la Municipalité le 02.05.25 - A. Berger' }]));
  // couche texte : « le 0^. 05.25 » sur une ligne, en un seul élément
  const a = [{ str: 'Repas préparé par les élèves pour la Municipalité le 0^. 05.25', x: 80, y: 280, w: 300, h: 10 }, { str: 'A. Berger', x: 80, y: 294, w: 45, h: 10 }];
  // OCR : mots positionnés ; « 02.05.25 » couvre « 0^. » et « 05.25 »
  const b = [];
  let x = 80;
  for (const t of ['Repas', 'préparé', 'par', 'les', 'élèves', 'pour', 'la', 'Municipalité', 'le']) { b.push({ str: t, conf: 92, x, y: 280, w: t.length * 4.9, h: 10 }); x += t.length * 4.9 + 4.9; }
  b.push({ str: '02.05.25', conf: 90, x, y: 280, w: 43, h: 10 });
  b.push({ str: 'A.', conf: 90, x: 80, y: 294, w: 10, h: 10 }, { str: 'Berger', conf: 90, x: 92, y: 294, w: 30, h: 10 });
  const m = O.mergeLibelle(a, b, index);
  assert.deepEqual(m.lines, ['Repas préparé par les élèves pour la Municipalité le 02.05.25', 'A. Berger']);
  assert.deepEqual(m.replacements, [{ from: '0^.', to: '02.05.25' }]);
  // rien de douteux : rien ne change
  const m2 = O.mergeLibelle([{ str: 'Repas + défraiement', x: 80, y: 280, w: 100, h: 10 }], [{ str: 'Repas', conf: 90, x: 80, y: 280, w: 30, h: 10 }, { str: 'repas', conf: 90, x: 110, y: 280, w: 10, h: 10 }], index);
  assert.deepEqual(m2.lines, ['Repas + défraiement']);
  assert.deepEqual(m2.replacements, []);
});

function fakeInfo(over) {
  return Object.assign({
    no: 12, noRaw: '12', date: '2025-03-01', dateRaw: '01.03.2025', doit: ['50000.3652.00'], avoir: ['9100.104'],
    sommes: [{ value: 12, raw: 'CHF 12.00' }], total: 12, totalRaw: 'CHF 12.00', libelleLines: ['REMBOURSEMENT frais', 'A. Berger'],
    libelleWords: [{ str: 'REMBOURSEMENT frais', x: 80, y: 280, w: 120, h: 10 }, { str: 'A. Berger', x: 80, y: 294, w: 45, h: 10 }],
    boxes: {}, layout: { width: 595, height: 842, b1: 300, b2: 400, yHeader: 100, yLibelle: 220, yTotal: 390 },
  }, over || {});
}
const W = (str, conf) => ({ str, conf, x: 0, y: 0, w: 20, h: 10 });

test('crossRead confirme les champs quand les deux lectures concordent', () => {
  const reads = { no: [W('12', 95)], total: [W('CHF', 90), W('12.00', 90)], somme: [W('CHF', 90), W('12.00', 88)], doit: [W('50000.3652.00', 85)], avoir: [W('9100.104', 80)], date: [W('01.03.2025', 96)], libelle: [] };
  const out = O.crossRead(fakeInfo(), reads, { index: P.buildIndex(P.emptyVocabulary()), caisse: '9100.104' });
  assert.equal(out.crossChecked, true);
  const okFields = out.crossFlags.filter((f) => f.level === 'ok').map((f) => f.field).sort();
  assert.deepEqual(okFields, ['compte', 'date', 'montant', 'no']);
  assert.equal(out.crossFlags.some((f) => f.level === 'doubt'), false);
});

test('crossRead complète ce qui manque et conteste ce qui diverge', () => {
  const ctx = { index: P.buildIndex(P.learnVocabulary([{ no: 1, compte: '50000.3652.00', libelle: 'REMBOURSEMENT - Frais - A. B' }])), caisse: '9100.104' };
  // total illisible dans la couche texte, somme absente : l'OCR le fournit (note)
  const o1 = O.crossRead(fakeInfo({ total: null, totalRaw: "CHFC'OOO. OO", sommes: [] }), { total: [W('CHF', 90), W("6'000.00", 75)] }, ctx);
  assert.equal(o1.total, 6000);
  assert.ok(o1.crossFlags.some((f) => f.field === 'montant' && f.level === 'note'));
  // montants différents : doute avec proposition
  const o2 = O.crossRead(fakeInfo(), { total: [W('CHF', 90), W('120.00', 90)] }, ctx);
  const d2 = o2.crossFlags.find((f) => f.field === 'montant' && f.level === 'doubt');
  assert.ok(d2); assert.deepEqual(d2.action, { type: 'set', field: 'montant', value: 120 });
  assert.equal(o2.total, 12, 'la couche texte reste retenue');
  // compte caisse mal lu par l'OCR (8100.104, inconnu) : pas de doute
  const o3 = O.crossRead(fakeInfo(), { doit: [W('50000.3652.00', 85)], avoir: [W('8100.104', 60)] }, ctx);
  assert.equal(o3.crossFlags.some((f) => f.field === 'compte' && f.level === 'doubt'), false);
  // compte de la couche texte inconnu, l'OCR lit un compte connu : doute avec proposition
  const o4 = O.crossRead(fakeInfo({ doit: ['50000.3852.00'] }), { doit: [W('50000.3652.00', 85)], avoir: [W('9100.104', 80)] }, ctx);
  const d4 = o4.crossFlags.find((f) => f.field === 'compte' && f.level === 'doubt');
  assert.ok(d4); assert.deepEqual(d4.action, { type: 'set', field: 'compte', value: '50000.3652.00' });
  // date absente : fournie par l'OCR
  const o5 = O.crossRead(fakeInfo({ date: null }), { date: [W('01.03.2025', 96)] }, ctx);
  assert.equal(o5.date, '2025-03-01');
  // page sans couche texte : la relecture ciblée prime
  const o6 = O.crossRead(fakeInfo({ source: 'ocr', total: 1000000, no: 4 }), { no: [W('4', 96)], total: [W('CHF', 90), W("10'000.00", 80)] }, ctx);
  assert.equal(o6.total, 10000);
});

test('crossFlags passent dans les écritures via parseDocument({ refine })', () => {
  const makeForm = require('./helpers.js').makeForm;
  const page = { pageNumber: 1, width: 595, height: 842, words: makeForm({ no: '12', lines: [{ doit: '50000.3652.00', somme: 'CHF 12.00', avoir: '9100.104' }], total: 'CHF 12.00', libelle: ['REMBOURSEMENT frais', 'A. Berger'], date: '01.03.2025' }) };
  const res = P.parseDocument([page], { caisse: '9100.104', refine: (info, part, ctx) => O.crossRead(info, { no: [W('12', 95)], total: [W('CHF', 90), W('12.00', 90)] }, ctx) });
  const e = res.entries[0];
  assert.equal(e.crossChecked, true);
  assert.ok(e.flags.no.some((f) => f.level === 'ok'));
  assert.ok(e.flags.montant.some((f) => f.level === 'ok'));
  assert.deepEqual(e.warnings, []);
});
