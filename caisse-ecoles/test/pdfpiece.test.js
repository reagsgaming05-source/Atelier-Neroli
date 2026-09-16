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
