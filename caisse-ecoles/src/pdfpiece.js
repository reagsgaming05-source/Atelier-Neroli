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
  // Coupures du relevé de caisse, dans l'ordre du formulaire. Mêmes valeurs que CaisseRegistre :
  // le module PDF ne dépend pas du registre, mais un test vérifie que les deux listes concordent.
  const R_BILLETS = [1000, 200, 100, 50, 20, 10];
  const R_PIECES = [5, 2, 1, 0.5, 0.2, 0.1, 0.05];
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
    // pièce sans numéro : la case reste vide (« 00 » se relisait ensuite comme la pièce n° 0)
    const noTexte = piece.no == null || piece.no === '' ? '' : String(piece.no).padStart(2, '0');
    centered(noTexte, L.colSomme, L.colAvoir, yHead + 10, { font: bold, size: 15 });
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
    // « TYPE - Description - Personne » : la personne est écrite seule, sous la description ; avec
    // seulement « TYPE - Personne », la description est vide (le nom ne doit pas être écrit deux fois)
    const person = parts.length > 2 ? parts[parts.length - 1] : (parts.length === 2 && P.looksLikePerson(parts[1]) ? parts[1] : '');
    const typeLine = parts.length > 2 ? `${parts[0]} ${parts.slice(1, -1).join(' - ')}` : (parts.length === 2 ? (person ? parts[0] : `${parts[0]} ${parts[1]}`) : libelle);
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

  /** Description d'un décompte pour le récapitulatif : « Course d'école 5P/3 du 12.06.2026 Lausanne ». */
  function recapDescription(p) {
    const parts = [];
    const det = String(p.detail || '').trim();
    // Même règle que le libellé du journal (registre.composeDescription) : l'objet n'est écrit que
    // s'il n'est pas déjà dans le détail. Comparer le début du texte ne suffisait pas (« Camp » +
    // « Sortie au camp de Leysin » écrivait l'activité deux fois) et le récapitulatif ne disait
    // alors plus la même chose que le journal.
    if (p.objet && p.objet !== 'Autre' && P.objetOf(det) !== p.objet) parts.push(p.objet);
    if (p.classe) parts.push(p.classe);
    if (p.periode) parts.push(/^(du|le|les)\b/i.test(String(p.periode).trim()) ? String(p.periode).trim() : `du ${String(p.periode).trim()}`);
    if (det) parts.push(det);
    let desc = parts.join(' ').replace(/\s+/g, ' ').trim();
    if (desc) desc = desc[0].toUpperCase() + desc.slice(1);
    return desc || (p.libelle || '');
  }

  /**
   * Récapitulatif des décomptes : un tableau (n° de pièce, date, décompte, personne, réf. DGEO,
   * montant) avec le total, sur autant de pages A4 que nécessaire.
   * opts : { title, subtitle, date } ; renvoie { bytes, pages, total, sorties, entrees }.
   */
  async function buildRecapPdf(pieces, reg, opts) {
    opts = opts || {};
    const doc = await PDFDocument.create();
    const title = opts.title || `Récapitulatif des décomptes ${reg.annee}`;
    doc.setTitle(title);
    doc.setProducer('Caisse écoles');
    doc.setCreator('Caisse écoles');
    const normal = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const left = 56; const right = A4[0] - 56; const top = A4[1] - 56; const bottom = 60;
    const cols = [
      { key: 'no', label: 'N°', w: 34, align: 'right' },
      { key: 'date', label: 'Date', w: 62 },
      { key: 'desc', label: 'Décompte', w: 188 },
      { key: 'personne', label: 'Enseignant-e', w: 84 },
      { key: 'ref', label: 'Réf. DGEO', w: 58 },
      { key: 'montant', label: 'Montant CHF', w: right - left - (34 + 62 + 188 + 84 + 58), align: 'right' },
    ];
    const rows = pieces.slice().sort((a, b) => (a.no == null ? 1e9 : a.no) - (b.no == null ? 1e9 : b.no)).map((p) => ({
      no: p.no == null ? '' : String(p.no),
      date: P.isoToDisplay(p.date),
      desc: recapDescription(p),
      personne: p.personne || '',
      ref: p.ref || '',
      montant: fmtCHF(p.montant).replace('CHF ', ''),
      sens: p.sens,
      value: Number(p.montant) || 0,
    }));
    const total = P.round2(rows.reduce((s, r) => s + r.value, 0));
    const sorties = P.round2(rows.filter((r) => r.sens === 'credit').reduce((s, r) => s + r.value, 0));
    const entrees = P.round2(rows.filter((r) => r.sens === 'debit').reduce((s, r) => s + r.value, 0));
    const dateStr = opts.date || P.isoToDisplay(new Date().toISOString().slice(0, 10));
    const size = 9.5; const lineH = 12.5; const pad = 4;
    const pages = [];
    let page = null; let y = 0;
    const cellX = (i) => left + cols.slice(0, i).reduce((s, c) => s + c.w, 0);
    const text = (font, str, x, yy, sz, color) => page.drawText(safe(font, str), { x, y: yy, size: sz || size, font, color: color || BLACK });
    const rightText = (font, str, xRight, yy, sz, color) => { const s = safe(font, str); page.drawText(s, { x: xRight - font.widthOfTextAtSize(s, sz || size), y: yy, size: sz || size, font, color: color || BLACK }); };
    function header() {
      page = doc.addPage(A4); pages.push(page);
      y = top;
      text(bold, title, left, y, 15);
      y -= 18;
      text(normal, opts.subtitle || `Caisse écoles – registre ${reg.annee} – établi le ${dateStr}`, left, y, 10, GREY);
      y -= 22;
      // en-tête du tableau
      page.drawRectangle({ x: left, y: y - pad - 3, width: right - left, height: lineH + pad + 2, color: rgb(0.94, 0.95, 0.97) });
      cols.forEach((c, i) => {
        const x = cellX(i);
        if (c.align === 'right') rightText(bold, c.label, x + c.w - pad, y - 1, 8.5, GREY); else text(bold, c.label, x + pad, y - 1, 8.5, GREY);
      });
      y -= lineH + pad + 4;
    }
    header();
    for (const r of rows) {
      const descLines = wrap(normal, size, r.desc, cols[2].w - 2 * pad);
      const persLines = wrap(normal, size, r.personne, cols[3].w - 2 * pad);
      const n = Math.max(1, descLines.length, persLines.length);
      const h = n * lineH + pad;
      if (y - h < bottom + 30) header();
      rightText(normal, r.no, cellX(0) + cols[0].w - pad, y - lineH + 3);
      text(normal, r.date, cellX(1) + pad, y - lineH + 3);
      descLines.forEach((l, k) => text(normal, l, cellX(2) + pad, y - lineH * (k + 1) + 3));
      persLines.forEach((l, k) => text(normal, l, cellX(3) + pad, y - lineH * (k + 1) + 3));
      text(normal, r.ref, cellX(4) + pad, y - lineH + 3, 8.5, GREY);
      rightText(r.sens === 'debit' ? normal : bold, r.montant, right - pad, y - lineH + 3);
      y -= h;
      page.drawLine({ start: { x: left, y: y + 1 }, end: { x: right, y: y + 1 }, thickness: 0.4, color: rgb(0.85, 0.87, 0.9) });
    }
    // total
    if (y - 2 * lineH - 10 < bottom + 30) header();
    y -= 6;
    page.drawLine({ start: { x: left, y: y + 2 }, end: { x: right, y: y + 2 }, thickness: 1, color: BLACK });
    y -= lineH + 2;
    text(bold, `Total (${rows.length} décompte${rows.length > 1 ? 's' : ''})`, left + pad, y, 10.5);
    rightText(bold, fmtCHF(total), right - pad, y, 10.5);
    if (sorties && entrees) {
      y -= lineH;
      text(normal, `dont sorties de caisse ${fmtCHF(sorties)} et entrées en caisse ${fmtCHF(entrees)}`, left + pad, y, 8.5, GREY);
    }
    // pieds de page
    pages.forEach((pg, i) => {
      const s = safe(normal, `${title} – page ${i + 1} / ${pages.length}`);
      pg.drawText(s, { x: right - normal.widthOfTextAtSize(s, 8), y: 30, size: 8, font: normal, color: GREY });
      pg.drawText(safe(normal, 'Caisse écoles – Compta Blonay'), { x: left, y: 30, size: 8, font: normal, color: GREY });
    });
    const bytes = await doc.save();
    return { bytes, pages: doc.getPageCount(), total, sorties, entrees };
  }

  /**
   * Relevé de caisse : le formulaire officiel de la commune, en PDF.
   *
   * Reprend la mise en page du classeur « Relevé de caisse » (feuille « Caisse des écoles ») :
   * le décompte des coupures avec la quantité, la valeur et la somme ; le total en caisse ; puis
   * le rapprochement avec la période précédente — situation de référence, encaissements,
   * décaissements, solde compté — et les deux visas à signer.
   *
   *   comptage : { date, counts, billets, pieces, total, note }
   *   opts     : { reference: { date, total, libelle }, encaissements, decaissements, ecart }
   * Renvoie { bytes, pages, total }.
   */
  async function buildReleveCaissePdf(comptage, reg, opts) {
    opts = opts || {};
    const doc = await PDFDocument.create();
    const titre = 'Caisse des écoles';
    doc.setTitle(`Relevé de caisse – ${P.isoToDisplay(comptage.date)}`);
    doc.setProducer('Caisse écoles');
    doc.setCreator('Caisse écoles');
    const normal = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.addPage(A4);

    // Trois colonnes, aux largeurs du classeur : libellé large, puis quantité/valeur et somme.
    const left = 62; const right = A4[0] - 62;
    const colB = left + 212; const colC = colB + 131; // débuts des colonnes « billets » et « Somme »
    const wB = 131; const wC = right - colC;
    const S = 11; // corps de texte, comme le classeur (Arial 12 ≈ Helvetica 11 à l'œil)

    const txt = (font, str, x, y, size, color) => page.drawText(safe(font, str), { x, y, size: size || S, font, color: color || BLACK });
    const center = (font, str, x, w, y, size, color) => {
      const t = safe(font, str); const sz = size || S;
      page.drawText(t, { x: x + (w - font.widthOfTextAtSize(t, sz)) / 2, y, size: sz, font, color: color || BLACK });
    };
    const box = (x, y, w, h) => page.drawRectangle({ x, y, width: w, height: h, borderWidth: 0.8, borderColor: BLACK });
    /** Montant du formulaire : « 4'383.90 », sans le préfixe CHF (la colonne s'appelle « Somme »). */
    const somme = (v) => fmtCHF(v).replace('CHF ', '');

    let y = A4[1] - 66;
    txt(bold, titre, left, y, 15);
    y -= 30;

    // Situation au : [date encadrée]
    const hCell = 19;
    txt(normal, 'Situation au :', left, y + 5);
    box(colB, y, wB, hCell);
    center(normal, P.isoToDisplay(comptage.date), colB, wB, y + 5);
    y -= 34;

    // En-tête du décompte
    center(bold, 'Quantité', left, 212, y);
    center(bold, 'billets', colB, wB, y);
    center(bold, 'Somme', colC, wC, y);
    y -= 20;

    const counts = comptage.counts || {};
    const ligne = (denom) => {
      const n = Math.max(0, Math.floor(Number(counts[String(denom)]) || 0));
      box(left, y, 212, hCell);
      center(normal, String(n), left, 212, y + 5);
      center(normal, somme(denom), colB, wB, y + 5); // le formulaire écrit la coupure à deux décimales
      center(normal, somme(P.round2(denom * n)), colC, wC, y + 5);
      y -= hCell + 2;
    };
    for (const d of R_BILLETS) ligne(d);
    y -= 8;
    center(bold, 'pièces', colB, wB, y + 5);
    y -= 18;
    for (const d of R_PIECES) ligne(d);

    // Total en caisse
    y -= 12;
    txt(bold, 'Total en caisse', left, y + 5, 12);
    box(colC, y, wC, hCell);
    center(bold, somme(comptage.total), colC, wC, y + 5, 12);
    y -= 40;

    // Rapprochement : Date | Somme
    page.drawLine({ start: { x: colB, y: y + 17 }, end: { x: right, y: y + 17 }, thickness: 0.8, color: BLACK });
    center(normal, 'Date', colB, wB, y);
    center(normal, 'Somme', colC, wC, y);
    y -= 26;

    const ref = opts.reference || null;
    const rang = (libelle, date, montant, gras) => {
      const f = gras ? bold : normal;
      txt(f, libelle, left, y + 5);
      box(colB, y, wB, hCell);
      if (date) center(normal, P.isoToDisplay(date), colB, wB, y + 5);
      box(colC, y, wC, hCell);
      if (montant != null) center(f, somme(montant), colC, wC, y + 5);
      y -= hCell + 7;
    };
    rang('Solde en caisse au :', comptage.date, comptage.total, true);
    rang('Encaissement de la période :', null, opts.encaissements == null ? null : opts.encaissements);
    rang('Décaissement de la période :', null, opts.decaissements == null ? null : opts.decaissements);
    rang(ref && ref.libelle ? ref.libelle : 'Situation de la caisse au :', ref && ref.date, ref ? ref.total : null);

    // Le bas du formulaire est ancré, pas coulé : les visas et la mention des annexes gardent
    // leur place quelle que soit la longueur de ce qui précède. Laissé au fil du texte, « Annexes »
    // passait sous le bord de la page dès qu'une remarque était saisie.
    const yAnnexes = 58;
    const yVisa2 = yAnnexes + 46;
    const yVisa1 = yVisa2 + 46;
    const visas = (reg && reg.visas) || {};
    [[yVisa1, 'responsable', visas.responsable], [yVisa2, 'boursier', visas.boursier]].forEach(([yy, role, nom]) => {
      txt(normal, nom ? `Visa de ${nom}` : `Visa du ${role}`, left, yy + 6);
      page.drawLine({ start: { x: colB, y: yy + 2 }, end: { x: right, y: yy + 2 }, thickness: 0.6, color: BLACK });
    });
    txt(normal, 'Annexes : pièces justificatives', left, yAnnexes);

    // Entre le rapprochement et les visas : l'écart et la remarque, dans la place disponible.
    // Un relevé qu'on signe ne doit pas taire un écart — on l'écrit en toutes lettres plutôt que
    // de laisser le formulaire sembler tomber juste.
    const notes = [];
    const ecart = Number(opts.ecart) || 0;
    if (Math.abs(ecart) >= 0.005) {
      notes.push(`Écart avec le journal au ${P.isoToDisplay(comptage.date)} : ${ecart > 0 ? '+ ' : '- '}${somme(Math.abs(ecart))} ` +
        `(${ecart > 0 ? "plus d'argent en caisse que dans le journal" : "il manque de l'argent par rapport au journal"}).`);
    }
    if (comptage.note) notes.push(`Remarque : ${comptage.note}`);
    if (notes.length) {
      const lignes = notes.reduce((acc, n) => acc.concat(wrap(normal, 9.5, n, right - left)), []);
      const dispo = Math.max(0, Math.floor((y - (yVisa1 + 24)) / 13));
      let yy = y - 4;
      for (const l of lignes.slice(0, dispo)) { txt(normal, l, left, yy, 9.5, GREY); yy -= 13; }
    }

    const bytes = await doc.save();
    return { bytes, pages: doc.getPageCount(), total: comptage.total };
  }

  return { buildPdf, buildRecapPdf, buildReleveCaissePdf, recapDescription, drawPiece, fmtCHF, A4 };
});
