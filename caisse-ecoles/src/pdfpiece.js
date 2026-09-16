/*
 * Fiche « PIÈCE COMPTABLE » en PDF (pdf-lib, dans le navigateur) : une page par pièce, au format
 * du formulaire de l'établissement (DOIT | SOMME | AVOIR, libellé, total, date, signature),
 * suivie des justificatifs (images JPEG/PNG, pages PDF). Le texte est du vrai texte : la fiche
 * produite est relisible par l'analyseur de l'application.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('pdf-lib'), require('./parser.js'));
  else root.CaissePdf = factory(root.PDFLib, root.CaisseParser);
})(typeof self !== 'undefined' ? self : this, function (PDFLib, P) {
  'use strict';

  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const A4 = [595.28, 841.89];
  const BLACK = rgb(0, 0, 0);
  const GREY = rgb(0.55, 0.55, 0.55);

  // Géométrie du formulaire (points, origine en bas à gauge comme en PDF)
  const L = {
    left: 62, right: 533, top: 790, // cadre
    colSomme: 305, colAvoir: 395, // séparations DOIT | SOMME | AVOIR
    rowHead: 34, // hauteur ligne d'en-tête (PIECE COMPTABLE / n°)
    rowCols: 28, // hauteur ligne DOIT / SOMME / AVOIR
    accLines: 6, lineH: 15, // bande des comptes
    libLines: 11, // bande du libellé
    rowTotal: 22,
  };

  function fmtCHF(v) {
    const n = Number(v) || 0;
    const [int, dec] = n.toFixed(2).split('.');
    return `CHF ${int.replace(/\B(?=(\d{3})+(?!\d))/g, "'")}.${dec}`;
  }

  /** Texte encodable en WinAnsi (police standard) : les autres caractères deviennent « ? ». */
  function safe(font, text) {
    const out = [];
    for (const ch of String(text || '')) {
      try { font.encodeText(ch); out.push(ch); } catch (e) { out.push('?'); }
    }
    return out.join('');
  }

  function wrap(font, size, text, maxWidth) {
    const words = safe(font, text).split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) <= maxWidth || !cur) cur = t;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /** Dessine la fiche d'une pièce sur une page A4. */
  function drawPiece(page, fonts, piece, reg) {
    const { normal, bold } = fonts;
    const caisse = reg.caisse || P.DEFAULT_CAISSE;
    const text = (s, x, y, opt) => page.drawText(safe(opt && opt.font ? opt.font : normal, s), Object.assign({ x, y, size: 11, font: normal, color: BLACK }, opt || {}));
    const line = (x1, y1, x2, y2, w, color) => page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: w || 0.8, color: color || BLACK });
    const centered = (s, x0, x1, y, opt) => { const f = opt && opt.font ? opt.font : normal; const size = opt && opt.size ? opt.size : 11; const w = f.widthOfTextAtSize(safe(f, s), size); text(s, x0 + (x1 - x0 - w) / 2, y, opt); };

    // en-tête de page (nom du fichier, comme sur les scans)
    text('pcecomptable', 265, 815, { size: 9, color: GREY });

    let y = L.top;
    // cadre et lignes
    const yHead = y - L.rowHead;
    const yCols = yHead - L.rowCols;
    const yAccEnd = yCols - L.accLines * L.lineH;
    const yLibTitle = yAccEnd - 18;
    const yLibEnd = yLibTitle - L.libLines * L.lineH;
    const yTotal = yLibEnd - L.rowTotal;
    line(L.left, y, L.right, y, 1.2); line(L.left, yTotal, L.right, yTotal, 1.2);
    line(L.left, y, L.left, yTotal, 1.2); line(L.right, y, L.right, yTotal, 1.2);
    line(L.colSomme, y, L.colSomme, yTotal); line(L.colAvoir, y, L.colAvoir, yTotal);
    line(L.left, yHead, L.right, yHead); line(L.left, yCols, L.right, yCols, 1.2);
    for (let i = 1; i < L.accLines; i++) line(L.left, yCols - i * L.lineH, L.right, yCols - i * L.lineH, 0.3, GREY);
    line(L.left, yAccEnd, L.right, yAccEnd, 1.2);
    line(L.left, yLibTitle, L.right, yLibTitle);
    for (let i = 1; i < L.libLines; i++) line(L.left, yLibTitle - i * L.lineH, L.right, yLibTitle - i * L.lineH, 0.3, GREY);
    line(L.left, yLibEnd, L.right, yLibEnd, 1.2);

    // en-tête : titre, n°
    text('PIECE COMPTABLE', L.left + 8, yHead + 11, { font: bold, size: 13 });
    centered(String(piece.no == null ? '' : piece.no).padStart(2, '0'), L.colSomme, L.colAvoir, yHead + 10, { font: bold, size: 15 });
    text('fe', L.right - 16, yHead + 12, { size: 9 });
    // colonnes
    text('DOIT - N° du compte', L.left + 8, yCols + 9, { font: bold, size: 12 });
    centered('SOMME', L.colSomme, L.colAvoir, yCols + 9, { font: bold, size: 11 });
    text('AVOIR - N° du compte', L.colAvoir + 6, yCols + 9, { font: bold, size: 12 });
    // comptes : la caisse au DOIT pour une entrée, à l'AVOIR pour une sortie
    const yAcc = yCols - L.lineH + 4;
    const doit = piece.sens === 'debit' ? caisse : piece.compte;
    const avoir = piece.sens === 'debit' ? piece.compte : caisse;
    centered(doit || '', L.left, L.colSomme, yAcc, { size: 11 });
    centered(fmtCHF(piece.montant), L.colSomme, L.colAvoir, yAcc, { size: 11 });
    centered(avoir || '', L.colAvoir, L.right, yAcc, { size: 11 });
    // libellé
    centered('Libellé', L.colSomme, L.colAvoir, yLibTitle + 5, { size: 11 });
    const libelle = piece.libelle || '';
    const parts = libelle.split(' - ');
    const typeLine = parts.length > 1 ? `${parts[0]} ${parts.slice(1, parts.length > 2 ? -1 : undefined).join(' - ')}` : libelle;
    const person = parts.length > 2 ? parts[parts.length - 1] : (parts.length === 2 && P.looksLikePerson(parts[1]) ? parts[1] : '');
    const lines = wrap(normal, 11, typeLine, L.colSomme - L.left - 16);
    let ly = yLibTitle - L.lineH * 2 + 4;
    for (const l of lines.slice(0, L.libLines - 3)) { text(l, L.left + 8, ly, { size: 11 }); ly -= L.lineH; }
    if (person) text(person, L.left + 8, ly, { size: 11 });
    // signature
    const sx0 = L.colAvoir + 2; const sy0 = yLibEnd + 6; const sx1 = L.right - 2; const sy1 = yLibEnd + 6 + 3 * L.lineH;
    page.drawRectangle({ x: sx0, y: sy0, width: sx1 - sx0, height: sy1 - sy0, borderColor: BLACK, borderWidth: 0.8 });
    text('Signature', sx0 + 4, sy1 - 10, { size: 7, color: GREY });
    // total
    text('Total', L.left + 8, yTotal + 7, { size: 11 });
    centered(fmtCHF(piece.montant), L.colSomme, L.colAvoir, yTotal + 7, { font: bold, size: 11 });
    // date
    text(P.isoToDisplay(piece.date) || '', L.left - 10, yTotal - 30, { size: 11 });
    // pied : origine
    text(`Pièce saisie dans Caisse écoles${piece.source === 'scan' ? ' (lue sur un scan)' : ''} – ${reg.annee}`, L.left - 10, 40, { size: 7, color: GREY });
    return { yTotal };
  }

  /** Ajoute une image (JPEG/PNG) sur une page A4, ajustée avec des marges. */
  async function addImagePage(doc, bytes, kind) {
    const img = kind === 'png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const page = doc.addPage(A4);
    const m = 30;
    const maxW = A4[0] - 2 * m; const maxH = A4[1] - 2 * m;
    const s = Math.min(maxW / img.width, maxH / img.height, 1.5);
    const w = img.width * s; const h = img.height * s;
    page.drawImage(img, { x: (A4[0] - w) / 2, y: A4[1] - m - h, width: w, height: h });
  }

  async function addPdfPages(doc, bytes) {
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await doc.copyPages(src, src.getPageIndices());
    for (const p of pages) doc.addPage(p);
  }

  /**
   * PDF d'une liste de pièces : pour chacune, la fiche puis ses justificatifs.
   * getAttachment(piece, justificatif) -> Uint8Array (ou null). Renvoie les octets du PDF.
   */
  async function buildPdf(pieces, reg, getAttachment, opts) {
    opts = opts || {};
    const doc = await PDFDocument.create();
    doc.setTitle(opts.title || `Pièces comptables ${reg.annee}`);
    doc.setProducer('Caisse écoles');
    doc.setCreator('Caisse écoles');
    const fonts = { normal: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold) };
    const skipped = [];
    for (const piece of pieces) {
      const page = doc.addPage(A4);
      drawPiece(page, fonts, piece, reg);
      for (const j of piece.justificatifs || []) {
        let bytes = null;
        try { bytes = getAttachment ? await getAttachment(piece, j) : null; } catch (e) { bytes = null; }
        if (!bytes) { skipped.push(`${piece.no} : ${j.name} (introuvable)`); continue; }
        try {
          if (j.kind === 'pdf') await addPdfPages(doc, bytes);
          else if (j.kind === 'jpeg' || j.kind === 'png') await addImagePage(doc, bytes, j.kind);
          else skipped.push(`${piece.no} : ${j.name} (format non pris en charge)`);
        } catch (e) {
          skipped.push(`${piece.no} : ${j.name} (${e && e.message ? e.message : 'illisible'})`);
        }
      }
    }
    const bytes = await doc.save();
    return { bytes, pages: doc.getPageCount(), skipped };
  }

  return { buildPdf, drawPiece, fmtCHF, A4 };
});
