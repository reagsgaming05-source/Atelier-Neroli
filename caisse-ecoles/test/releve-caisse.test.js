/*
 * Relevé de caisse : le formulaire officiel de la commune, rempli depuis un comptage.
 * Ce qui compte ici n'est pas l'aspect du PDF mais qu'il tombe juste —
 *   situation de référence + encaissements − décaissements = solde du journal,
 * et que le total du décompte des coupures soit bien celui des quantités saisies.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/registre.js');
const PDF = require('../src/pdfpiece.js');

function registre(pieces, opts) {
  opts = opts || {};
  const reg = R.emptyRegister(2025, {
    openingAmount: opts.opening == null ? 2062.2 : opts.opening,
    openingDate: opts.openingDate || '2024-12-20',
  });
  for (const [no, date, montant, sens] of pieces || []) {
    const p = R.newPiece(reg);
    Object.assign(p, { no, date, type: 'FRAIS', detail: 'matériel', personne: 'A. Berger', compte: '51000.3185.00', montant, sens });
    p.libelle = R.composeLibelle(p);
    R.upsertPiece(reg, p);
  }
  return reg;
}

// le comptage du relevé fourni en exemple : 4'383.90
const COUNTS = { 1000: 0, 200: 3, 100: 7, 50: 21, 20: 69, 10: 36, 5: 38, 2: 17, 1: 13, 0.5: 89, 0.2: 28, 0.1: 51, 0.05: 34 };

/* ---------------- Mouvements de la période ---------------- */

test('le relevé tombe juste : référence + encaissements − décaissements = solde du journal', () => {
  const reg = registre([
    [1, '2025-01-10', 2500, 'debit'],
    [2, '2025-02-05', 178.3, 'credit'],
    [3, '2025-03-20', 50, 'credit'], // après le comptage : hors période
  ]);
  const m = R.periodMovements(reg, null, '2025-02-27');
  assert.equal(m.encaissements, 2500);
  assert.equal(m.decaissements, 178.3);
  const calcule = Math.round((reg.opening.amount + m.encaissements - m.decaissements) * 100) / 100;
  assert.equal(calcule, R.balanceAt(reg, '2025-02-27'));
});

test('entre deux comptages, seule la période compte', () => {
  const reg = registre([
    [1, '2025-01-10', 2500, 'debit'],
    [2, '2025-02-05', 178.3, 'credit'],
    [3, '2025-03-20', 400, 'debit'],
  ]);
  const m = R.periodMovements(reg, '2025-02-27', '2025-03-31');
  assert.equal(m.encaissements, 400);
  assert.equal(m.decaissements, 0);
  assert.equal(m.pieces, 1);
  // la borne de gauche est exclue : le jour du comptage précédent est déjà compté dans son solde
  assert.equal(R.periodMovements(reg, '2025-02-05', '2025-03-31').decaissements, 0);
});

test('les pièces sans date comptent depuis le début, comme dans le solde du journal', () => {
  const reg = registre([[1, '2025-01-10', 100, 'debit']]);
  const p = R.newPiece(reg);
  Object.assign(p, { no: 2, date: null, type: 'FRAIS', montant: 40, sens: 'credit', compte: '51000.3185.00', personne: 'A. Berger' });
  R.upsertPiece(reg, p);
  const m = R.periodMovements(reg, null, '2025-12-31');
  assert.equal(m.decaissements, 40);
  const calcule = Math.round((reg.opening.amount + m.encaissements - m.decaissements) * 100) / 100;
  assert.equal(calcule, R.balanceAt(reg, '2025-12-31'));
  // mais pas dans une période qui commence à un comptage : on ne sait pas si elle en fait partie
  assert.equal(R.periodMovements(reg, '2025-01-01', '2025-12-31').decaissements, 0);
});

test('une pièce sans sens ou sans montant n\'entre dans aucun mouvement', () => {
  const reg = registre();
  for (const over of [{ no: 1, montant: 0, sens: 'debit' }, { no: 2, montant: 50, sens: null }]) {
    const p = R.newPiece(reg);
    Object.assign(p, { date: '2025-02-01', type: 'FRAIS', compte: '51000.3185.00', personne: 'A. Berger' }, over);
    R.upsertPiece(reg, p);
  }
  const m = R.periodMovements(reg, null, '2025-12-31');
  assert.deepEqual([m.encaissements, m.decaissements, m.pieces], [0, 0, 0]);
});

/* ---------------- Le document ---------------- */

/** Éléments du PDF avec leur position : sert à vérifier que rien ne sort de la page. */
async function elementsPdf(bytes) {
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, verbosity: 0 }).promise;
  const pg = await doc.getPage(1);
  const vp = pg.getViewport({ scale: 1 });
  const c = await pg.getTextContent();
  return { hauteur: vp.height, items: c.items.filter((i) => i.str.trim()).map((i) => ({ t: i.str, y: i.transform[5] })) };
}

/** Texte réellement lisible du PDF : le relevé est du vrai texte, pas une image. */
async function textePdf(bytes) {
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, verbosity: 0 }).promise;
  const out = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const c = await (await doc.getPage(i)).getTextContent();
    out.push(c.items.map((it) => it.str).join(' '));
  }
  return out.join('\n');
}

async function releve(reg, comptage, opts) {
  const res = await PDF.buildReleveCaissePdf(comptage, reg, opts || {});
  return { res, texte: await textePdf(res.bytes) };
}

/* ---------------- Décompte des coupures ---------------- */

test('le total du relevé est celui des quantités comptées', () => {
  const t = R.countTotal(COUNTS);
  assert.equal(t.billets, 4090);
  assert.equal(t.pieces, 293.9);
  assert.equal(t.total, 4383.9);
});

test('le relevé emploie exactement les coupures du registre, dans le même ordre', async () => {
  // le module PDF garde sa propre liste pour ne pas dépendre du registre : elles doivent concorder,
  // sinon une coupure serait comptée à l'écran et absente du formulaire imprimé.
  const reg = registre();
  const { res, texte } = await releve(reg, { date: '2025-02-27', counts: COUNTS, total: 4383.9 });
  assert.equal(res.pages, 1, 'le relevé tient sur une page');
  for (const d of R.BILLETS.concat(R.PIECES)) {
    const ecrit = d.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    assert.ok(texte.includes(ecrit), `coupure ${ecrit} absente du relevé`);
  }
});

test('le relevé porte le titre, la date et le total du formulaire', async () => {
  const reg = registre();
  const { res, texte } = await releve(reg, { date: '2025-02-27', counts: COUNTS, total: 4383.9 });
  assert.equal(res.total, 4383.9);
  for (const attendu of ['Caisse des', 'Situation au :', 'Total en caisse', '27.02.2025', "4'383.90", 'Annexes']) {
    assert.ok(texte.includes(attendu), `« ${attendu} » absent du relevé`);
  }
});

test('sans nom de signataire, le relevé garde les rôles du formulaire vierge', async () => {
  const reg = registre();
  const { texte } = await releve(reg, { date: '2025-02-27', counts: COUNTS, total: 4383.9 });
  assert.ok(texte.includes('Visa du responsable'));
  assert.ok(texte.includes('Visa du boursier'));
});

test('les noms de signataires viennent du registre, jamais du code', async () => {
  const reg = registre();
  reg.visas = { responsable: 'A. Berger', boursier: 'Ch. Dupraz' };
  const { texte } = await releve(reg, { date: '2025-02-27', counts: COUNTS, total: 4383.9 });
  assert.ok(texte.includes('Visa de A. Berger'));
  assert.ok(texte.includes('Visa de Ch. Dupraz'));
  assert.ok(!texte.includes('Visa du responsable'));
});

test('les visas survivent à l\'enregistrement et à la relecture du registre', () => {
  const reg = registre();
  reg.visas = { responsable: 'A. Berger', boursier: 'Ch. Dupraz' };
  const relu = R.parse(R.serialize(reg));
  assert.deepEqual(relu.visas, { responsable: 'A. Berger', boursier: 'Ch. Dupraz' });
});

test('un registre d\'avant cette version se relit avec des visas vides', () => {
  const vieux = JSON.stringify({ version: 1, annee: 2025, caisse: '9100.104', opening: { date: '2024-12-20', amount: 2062.2 }, pieces: [], comptages: [] });
  const reg = R.parse(vieux);
  assert.deepEqual(reg.visas, { responsable: '', boursier: '' });
});

test('un écart avec le journal est écrit sur le relevé, pas tu', async () => {
  const reg = registre();
  const { texte } = await releve(reg, { date: '2025-02-27', counts: COUNTS, total: 4383.9 }, { ecart: -143.95 });
  assert.ok(/cart avec le journal/.test(texte), 'l\'écart devrait figurer sur le document signé');
  assert.ok(texte.includes('143.95'));
});

test('sans écart, le relevé ne porte aucune mention d\'écart', async () => {
  const reg = registre();
  const { texte } = await releve(reg, { date: '2025-02-27', counts: COUNTS, total: 4383.9 }, { ecart: 0 });
  assert.ok(!/cart avec le journal/.test(texte));
});

test('la remarque du comptage figure sur le relevé', async () => {
  const reg = registre();
  const { texte } = await releve(reg, { date: '2025-02-27', counts: COUNTS, total: 4383.9, note: 'comptage de fin de trimestre' });
  assert.ok(texte.includes('fin de trimestre'));
});

test('le rapprochement reprend la référence, les encaissements et les décaissements', async () => {
  const reg = registre();
  const { texte } = await releve(reg, { date: '2025-02-27', counts: COUNTS, total: 4383.9 }, {
    reference: { date: '2024-12-20', total: 2062.2 }, encaissements: 2500, decaissements: 178.3,
  });
  for (const attendu of ['Solde en caisse au :', 'Encaissement de la p', 'aissement de la p', 'Situation de la caisse au :', '20.12.2024', "2'062.20", "2'500.00", '178.30']) {
    assert.ok(texte.includes(attendu), `« ${attendu} » absent du rapprochement`);
  }
});

test('le bas du formulaire tient sur la page, même avec une remarque et un écart', async () => {
  // Écrit au fil du texte, « Annexes : pièces justificatives » passait sous le bord de la page
  // dès qu'une remarque était saisie : le document sorti de l'imprimante était amputé.
  const reg = registre();
  reg.visas = { responsable: 'A. Berger', boursier: 'Ch. Dupraz' };
  const comptage = {
    date: '2025-02-27', counts: COUNTS, total: 4383.9,
    note: 'comptage de fin de trimestre, après la course d\'école des 7-8P et le versement de la participation des parents',
  };
  const { res, texte } = await releve(reg, comptage, { ecart: -143.95 });
  assert.equal(res.pages, 1);
  assert.ok(texte.includes('Annexes'), 'la mention des annexes doit rester sur la page');
  assert.ok(texte.includes('Visa de A. Berger') && texte.includes('Visa de Ch. Dupraz'));
  const { hauteur, items } = await elementsPdf(res.bytes);
  const bas = Math.min.apply(null, items.map((i) => i.y));
  const haut = Math.max.apply(null, items.map((i) => i.y));
  assert.ok(bas > 0, `un élément sort par le bas (y = ${bas})`);
  assert.ok(haut < hauteur, `un élément sort par le haut (y = ${haut})`);
  // et rien ne se chevauche : la remarque doit rester au-dessus des visas, pas dessus
  const yDe = (debut) => (items.find((i) => i.t.startsWith(debut)) || {}).y;
  assert.ok(yDe('Remarque') > yDe('Visa de A. Berger') + 12, 'la remarque déborde sur la ligne de visa');
  assert.ok(yDe('Situation de la caisse au :') > yDe('Remarque') + 12, 'le rapprochement déborde sur la remarque');
  assert.ok(yDe('Visa de Ch. Dupraz') > yDe('Annexes') + 12, 'le visa déborde sur la mention des annexes');
});

test('les visas et les annexes sont à la même place, avec ou sans remarque', async () => {
  const reg = registre();
  const sans = await elementsPdf((await releve(reg, { date: '2025-02-27', counts: COUNTS, total: 4383.9 })).res.bytes);
  const avec = await elementsPdf((await releve(reg, { date: '2025-02-27', counts: COUNTS, total: 4383.9, note: 'un mot' }, { ecart: 12.5 })).res.bytes);
  const posDe = (els, debut) => (els.items.find((i) => i.t.startsWith(debut)) || {}).y;
  for (const debut of ['Annexes', 'Visa du responsable', 'Visa du boursier']) {
    assert.equal(posDe(avec, debut), posDe(sans, debut), `« ${debut} » a bougé`);
  }
});
