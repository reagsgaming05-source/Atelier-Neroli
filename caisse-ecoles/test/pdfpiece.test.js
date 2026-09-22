const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('zlib');
const R = require('../src/registre.js');
const F = require('../src/pdfpiece.js');
const P = require('../src/parser.js');
const { PDFDocument } = require('pdf-lib');

// PNG 8x8 blanc (pour un justificatif image)
function tinyPng() {
  const w = 8; const h = 8;
  const raw = Buffer.alloc((w * 4 + 1) * h, 255);
  for (let y = 0; y < h; y++) raw[y * (w * 4 + 1)] = 0;
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crcTable = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
    let crc = 0xffffffff; for (const b of td) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8);
    const cb = Buffer.alloc(4); cb.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, td, cb]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

test('fiche PDF : une page par pièce, justificatifs image et PDF ajoutés, fiche relisible', async () => {
  const reg = R.emptyRegister(2026, { openingAmount: 100 });
  const p = R.newPiece(reg);
  Object.assign(p, { type: 'REMBOURSEMENT', objet: 'Collation', classe: '7-11S', periode: '12.12.2026', detail: 'concert chœur', personne: 'A. Berger', montant: 29.7, sens: 'credit', compte: '51000.3662.50', date: '2026-12-15' });
  p.libelle = R.composeLibelle(p);
  p.justificatifs = [{ name: 'ticket.png', kind: 'png', size: 1 }, { name: 'facture.pdf', kind: 'pdf', size: 1 }, { name: 'absent.jpg', kind: 'jpeg', size: 1 }];
  R.upsertPiece(reg, p);
  const other = await PDFDocument.create(); other.addPage([300, 300]); other.addPage([300, 300]);
  const otherBytes = await other.save();
  const res = await F.buildPdf(reg.pieces, reg, async (piece, j) => (j.kind === 'png' ? tinyPng() : j.kind === 'pdf' ? otherBytes : null));
  assert.equal(res.pages, 1 + 1 + 2, 'fiche + image + 2 pages PDF');
  assert.equal(res.skipped.length, 1);
  assert.match(res.skipped[0], /absent\.jpg/);
  // la fiche est un vrai texte : l'analyseur de l'application la relit
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(res.bytes), isEvalSupported: false, verbosity: 0 }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  const words = P.itemsFromTextContent(await page.getTextContent(), vp, pdfjs.Util);
  const info = P.analyzePage({ pageNumber: 1, width: vp.width, height: vp.height, words });
  assert.equal(info.no, 1);
  assert.equal(info.date, '2026-12-15');
  assert.equal(info.total, 29.7);
  assert.deepEqual(info.doit, ['51000.3662.50']);
  assert.deepEqual(info.avoir, ['9100.104']);
  const e = P.buildEntry(info, { caisse: '9100.104' });
  assert.equal(e.credit, 29.7);
  assert.equal(e.compte, '51000.3662.50');
  assert.equal(e.libelle, 'REMBOURSEMENT - Collation 7-11S du 12.12.2026 concert chœur - A. Berger');
});

test('récapitulatif des décomptes : tableau, total, pagination, texte relisible', async () => {
  const reg = R.emptyRegister(2026, { openingAmount: 100 });
  const mk = (no, objet, classe, periode, detail, personne, montant, sens, ref) => {
    const p = R.newPiece(reg);
    Object.assign(p, { no, type: 'DECOMPTE', objet, classe, periode, detail, personne, montant, sens, compte: '51000.3662.00', date: `2026-06-${String(10 + no).padStart(2, '0')}`, ref: ref || '' });
    p.libelle = R.composeLibelle(p); R.upsertPiece(reg, p); return p;
  };
  const a = mk(1, "Course d'école", '5P/3', '12.06.2026', 'Lausanne', 'A. Berger', 143.95, 'credit', 'D-2026-07');
  const b = mk(2, "Course d'école", '7P/1', '13.06.2026', 'Zoo de Servion, entrées et transport en car', 'Ch. Dupraz', 612.4, 'credit');
  const c = mk(3, 'Camp', '8P/3', '12-16.05.2026', 'Leysin', 'T. Morel', 2560, 'debit');
  const res = await F.buildRecapPdf([b, a], reg, { title: "Récapitulatif des décomptes – Courses d'école 2026", date: '16.09.2026' });
  assert.equal(res.pages, 1);
  assert.equal(res.total, 756.35);
  assert.equal(res.sorties, 756.35);
  assert.equal(res.entrees, 0);
  assert.equal(F.recapDescription(c), 'Camp 8P/3 du 12-16.05.2026 Leysin');
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(res.bytes), isEvalSupported: false, verbosity: 0 }).promise;
  const page = await doc.getPage(1);
  const txt = (await page.getTextContent()).items.map((i) => i.str).join(' ');
  assert.match(txt, /Récapitulatif des décomptes/);
  assert.match(txt, /Course d'école 5P\/3 du 12\.06\.2026\s+Lausanne/);
  assert.match(txt, /D-2026-07/);
  assert.match(txt, /756\.35/);
  assert.ok(txt.indexOf('143.95') < txt.indexOf('612.40'), 'trié par n°');
  // beaucoup de lignes : plusieurs pages, sens mêlés
  const many = [];
  for (let i = 0; i < 70; i++) many.push(mk(10 + i, i % 2 ? 'Camp' : "Course d'école", '6P/2', '01.05.2026', 'sortie ' + i, 'L. Duvernay', 10 + i, i % 3 ? 'credit' : 'debit'));
  const big = await F.buildRecapPdf(many.concat([c]), reg, {});
  assert.ok(big.pages >= 2, 'pagination');
  assert.equal(big.total, P.round2(many.reduce((s, p) => s + p.montant, 0) + 2560));
  assert.ok(big.entrees > 0 && big.sorties > 0);
});

/* ------------------------------------------------------------------ */
/* Audit : récapitulatif et fiche sans numéro                             */
/* ------------------------------------------------------------------ */

test('la description du récapitulatif dit la même chose que le libellé du journal', () => {
  const cas = [
    { objet: 'Camp', classe: '8P/3', periode: '12-16.05.2026', detail: 'Sortie au camp de Leysin' },
    { objet: "Course d'école", classe: '5P/3', periode: '12.06.2026', detail: 'Lausanne' },
    { objet: 'Autre', classe: '', periode: '', detail: 'achat de piles' },
    { objet: 'Camp', classe: '', periode: '', detail: '' },
  ];
  for (const c of cas) {
    const p = Object.assign({ type: 'DECOMPTE', personne: 'A. Berger', montant: 10, sens: 'credit' }, c);
    // R.composeLibelle = « TYPE - Description - Personne » : la description doit être la même
    const attendu = R.composeLibelle(p).split(' - ').slice(1, -1).join(' - ');
    assert.equal(F.recapDescription(p), attendu, JSON.stringify(c));
  }
});

test('une pièce sans numéro laisse la case vide sur la fiche, pas « 00 »', async () => {
  const reg = R.emptyRegister(2026, { openingAmount: 0 });
  const p = R.newPiece(reg);
  Object.assign(p, { no: null, type: 'REMBOURSEMENT', detail: 'piles', personne: 'R. Desaules', montant: 12, sens: 'credit', compte: '51000.3185.00', date: '2026-03-01' });
  p.libelle = R.composeLibelle(p);
  const res = await F.buildPdf([p], reg, () => null);
  // la fiche est relue par l'analyseur : sans numéro écrit, il n'en trouve aucun
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(res.bytes), isEvalSupported: false, verbosity: 0 }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  const words = P.itemsFromTextContent(await page.getTextContent(), vp, pdfjs.Util);
  const info = P.analyzePage({ pageNumber: 1, width: vp.width, height: vp.height, words });
  assert.equal(info.no, null, `numéro relu sur la fiche : ${info.no}`);
  assert.equal(info.total, 12);
  await doc.destroy();
});

/* ---------------- La marque de la pièce sur la fiche ---------------- */
// Le petit code QR imprimé dans la marge : c'est lui qui, au scan de la pile de fiches signées,
// ouvre un document et dit de quelle pièce il s'agit. Ce qu'on vérifie ici est sa place sur la
// feuille ; qu'il se relise est éprouvé dans marque.test.js, et de bout en bout dans le test de
// fumée (qui, lui, sait rendre une page de PDF en image).
const M = require('../src/marque.js');

/** Dessine une vraie fiche et rend les rectangles posés dans la zone de la marque. */
async function ficheAvecMarque(over) {
  const reg = R.emptyRegister(2026, { openingAmount: 0, caisse: '9100.104' });
  const piece = R.newPiece(reg);
  Object.assign(piece, {
    no: 12, date: '2026-03-03', type: 'REMBOURSEMENT', detail: 'collation du chœur',
    personne: 'A. Berger', compte: '51000.3662.50', montant: 29.7, sens: 'credit',
  }, over || {});
  piece.libelle = R.composeLibelle(piece);
  const doc = await PDFDocument.create();
  const page = doc.addPage(F.A4);
  const fonts = { normal: await doc.embedFont('Helvetica'), bold: await doc.embedFont('Helvetica-Bold') };
  const rects = [];
  const vrai = page.drawRectangle.bind(page);
  page.drawRectangle = (r) => { rects.push(r); return vrai(r); };
  F.drawPiece(page, fonts, piece, reg);
  return { reg, piece, page, rects, doc };
}

test('la fiche porte la marque de sa pièce', async () => {
  const { reg, piece, rects } = await ficheAvecMarque();
  const dansLaMarque = rects.filter((r) => r.x >= F.MARQUE.x - 0.01 && r.y >= F.MARQUE.y - 0.01);
  // un fond blanc plus les bandes noires du code
  assert.ok(dansLaMarque.length > 20, `${dansLaMarque.length} rectangle(s) dans la zone : le code manque`);
  // la marque attendue tient dans un code de 25 modules
  assert.equal(M.grille(M.ecrire(reg.annee, piece.id)).n, 25);
});

test('la marque reste dans la marge : elle ne recouvre aucune ligne du formulaire', async () => {
  const { rects } = await ficheAvecMarque();
  const dansLaMarque = rects.filter((r) => r.x >= F.MARQUE.x - 0.01 && r.y >= F.MARQUE.y - 0.01);
  for (const r of dansLaMarque) {
    assert.ok(r.x + r.width <= F.MARQUE.x + F.MARQUE.taille + 0.01, 'le code déborde à droite');
    assert.ok(r.y + r.height <= F.MARQUE.y + F.MARQUE.taille + 0.01, 'le code déborde en haut');
    assert.ok(r.y >= F.L.top, 'le code descend dans le cadre du formulaire');
    assert.ok(r.x + r.width <= F.A4[0], 'le code sort de la feuille');
    assert.ok(r.y + r.height <= F.A4[1], 'le code sort de la feuille');
  }
  // 16 mm : assez grand pour un copieur, assez petit pour ne pas se voir
  assert.ok(F.MARQUE.taille >= 40 && F.MARQUE.taille <= 60, `${F.MARQUE.taille} points de côté`);
});

test('une pièce sans identifiant s\'imprime quand même, simplement sans marque', async () => {
  const { rects } = await ficheAvecMarque({ id: '' });
  const dansLaMarque = rects.filter((r) => r.x >= F.MARQUE.x - 0.01 && r.y >= F.MARQUE.y - 0.01);
  assert.equal(dansLaMarque.length, 0);
  // et la fiche elle-même a bien été dessinée (le cadre de signature est un rectangle)
  assert.ok(rects.length > 0);
});

test('la fiche produite pèse à peine plus qu\'avant la marque', async () => {
  // le code est dessiné en bandes : s'il l'était carré par carré, une année de pièces gonflerait
  const reg = R.emptyRegister(2026, { openingAmount: 0, caisse: '9100.104' });
  const pieces = [];
  for (let i = 1; i <= 20; i++) {
    const p = R.newPiece(reg);
    Object.assign(p, { no: i, date: '2026-03-03', type: 'FRAIS', detail: 'piles', personne: 'A. Berger', compte: '51000.3185.00', montant: 12, sens: 'credit' });
    p.libelle = R.composeLibelle(p);
    pieces.push(p);
  }
  const { bytes } = await F.buildPdf(pieces, reg, null, {});
  assert.ok(bytes.length < 120000, `${bytes.length} octets pour 20 fiches marquées`);
});
