/*
 * Lecture / écriture du classeur "Caisse" (journal de caisse) avec ExcelJS.
 * Le format reproduit celui du classeur modèle :
 *   Date | No | Compte | Libellé | Débit | Crédit | Solde
 * avec la formule de solde cumulé  G(n) = G(n-1) + E(n) - F(n).
 *
 * Utilisable dans le navigateur (window.CaisseExcel, avec ExcelJS chargé
 * globalement) et dans Node (module.exports = factory).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.CaisseExcel = factory(root.ExcelJS);
})(typeof self !== 'undefined' ? self : this, function (ExcelJS) {
  'use strict';

  const SHEET_NAME = 'Caisse';
  const FONT = { name: 'Arial', size: 11 };
  const FONT_BOLD = { name: 'Arial', size: 11, bold: true };
  const COL_WIDTHS = [12.14, 8.86, 15.71, 110, 10.14, 9.57, 10.14];
  const DEFAULT_PREFILL = 300;

  /* ------------------------------------------------------------------ */
  /* Utilitaires                                                            */
  /* ------------------------------------------------------------------ */

  function isoToDate(iso) {
    if (!iso) return null;
    if (iso instanceof Date) return iso;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
    if (!m) return null;
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  }

  function dateToIso(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return null;
    // Les dates Excel sont lues en UTC par ExcelJS ; on tolère un décalage de quelques heures.
    const shifted = new Date(d.getTime() + 12 * 3600 * 1000);
    return shifted.toISOString().slice(0, 10);
  }

  function cellValue(cell) {
    if (!cell) return null;
    let v = cell.value;
    if (v == null) return null;
    if (typeof v === 'object') {
      if (v instanceof Date) return v;
      if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('');
      if ('result' in v) v = v.result;
      else if ('text' in v) v = v.text;
      else if ('error' in v) return null;
      if (v && typeof v === 'object' && !(v instanceof Date)) return null;
    }
    return v;
  }

  function toNumber(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    const s = String(v).replace(/[\s'’]/g, '').replace(',', '.');
    const n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  function toText(v) {
    if (v == null) return '';
    if (v instanceof Date) return dateToIso(v) || '';
    return String(v).trim();
  }

  function toDateIso(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date) return dateToIso(v);
    if (typeof v === 'number') {
      // numéro de série Excel
      const ms = Math.round((v - 25569) * 86400 * 1000);
      return dateToIso(new Date(ms));
    }
    const s = String(v).trim();
    let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/.exec(s);
    if (m) {
      let y = parseInt(m[3], 10);
      if (m[3].length === 2) y += 2000;
      return `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
    }
    return null;
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  /* ------------------------------------------------------------------ */
  /* Lecture d'un classeur existant                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Lit un classeur (ArrayBuffer / Buffer) et retourne
   * { sheetName, opening: {date, amount, libelle}, entries: [{no,date,compte,libelle,debit,credit}] }
   */
  async function readWorkbook(buffer) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.getWorksheet(SHEET_NAME) || wb.worksheets[0];
    if (!ws) throw new Error('Aucune feuille trouvée dans le classeur');

    const entries = [];
    let opening = null;
    const maxRow = ws.rowCount;
    for (let r = 2; r <= maxRow; r++) {
      const row = ws.getRow(r);
      const date = toDateIso(cellValue(row.getCell(1)));
      const noV = cellValue(row.getCell(2));
      const compte = toText(cellValue(row.getCell(3)));
      const libelle = toText(cellValue(row.getCell(4)));
      const debit = toNumber(cellValue(row.getCell(5)));
      const credit = toNumber(cellValue(row.getCell(6)));
      const solde = toNumber(cellValue(row.getCell(7)));
      const no = toNumber(noV);

      const isOpening = !opening && /solde/i.test(libelle) && debit == null && credit == null;
      if (isOpening) {
        opening = { date, amount: solde != null ? solde : 0, libelle };
        continue;
      }
      const hasContent = libelle || compte || (debit != null && debit !== 0) || (credit != null && credit !== 0) || date;
      if (!hasContent) continue;
      entries.push({
        no: no != null ? no : (noV != null ? String(noV) : null),
        date,
        compte,
        libelle,
        debit: debit || null,
        credit: credit || null,
        row: r,
      });
    }
    if (!opening) {
      opening = { date: entries.length ? entries[0].date : null, amount: 0, libelle: 'Solde à nouveau' };
    }
    return { sheetName: ws.name, opening, entries };
  }

  /* ------------------------------------------------------------------ */
  /* Construction du classeur                                               */
  /* ------------------------------------------------------------------ */

  function styleDataRow(row) {
    row.height = 14.25;
    const thin = { style: 'thin' };
    const hair = { style: 'hair' };
    const a = row.getCell(1);
    a.font = FONT; a.numFmt = 'mm-dd-yy'; a.alignment = { horizontal: 'center' };
    a.border = { left: thin, right: thin, top: hair };
    const b = row.getCell(2);
    b.font = FONT; b.numFmt = '0'; b.alignment = { horizontal: 'center' };
    b.border = { left: thin, right: thin, top: hair };
    const c = row.getCell(3);
    c.font = FONT; c.numFmt = '@'; c.alignment = { horizontal: 'left' };
    c.border = { left: thin, right: thin, top: hair, bottom: hair };
    const d = row.getCell(4);
    d.font = FONT;
    d.border = { left: thin, right: thin, top: hair };
    for (const idx of [5, 6]) {
      const cell = row.getCell(idx);
      cell.font = FONT; cell.numFmt = '0.00'; cell.alignment = { horizontal: 'right' };
      cell.border = { left: thin, right: thin, top: hair, bottom: hair };
    }
    const g = row.getCell(7);
    g.font = FONT; g.numFmt = '0.00';
    g.border = { left: thin, right: thin, bottom: hair };
  }

  /**
   * model = {
   *   opening: { date: 'AAAA-MM-JJ', amount: number, libelle? },
   *   entries: [{ no, date, compte, libelle, debit, credit }],
   *   prefillTo: 300   // numérotation + formules pré-remplies jusqu'à ce n° (comme le modèle)
   * }
   * Retourne un ExcelJS.Workbook
   */
  function buildWorkbook(model) {
    const opening = model.opening || { date: null, amount: 0 };
    const entries = (model.entries || []).slice();

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Caisse écoles';
    wb.created = new Date();

    const ws = wb.addWorksheet(SHEET_NAME, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activeCell: 'A2' }],
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        printTitlesRow: '1:1',
        margins: { left: 0.236, right: 0.236, top: 0.354, bottom: 0.354, header: 0.315, footer: 0.315 },
      },
      properties: { defaultRowHeight: 12.75 },
    });
    ws.columns = COL_WIDTHS.map((w) => ({ width: w }));

    // Entête
    const header = ws.getRow(1);
    header.height = 15.75;
    const titles = ['Date', 'No ', 'Compte', 'Libellé', 'Débit ', 'Crédit', 'Solde'];
    titles.forEach((t, i) => {
      const cell = header.getCell(i + 1);
      cell.value = t;
      cell.font = FONT_BOLD;
      cell.border = { bottom: { style: 'medium' } };
    });
    header.getCell(1).border = { bottom: { style: 'medium' }, right: { style: 'hair' } };
    header.getCell(2).numFmt = '0.00';
    header.getCell(3).numFmt = '@';

    // Solde à nouveau
    const r2 = ws.getRow(2);
    styleDataRow(r2);
    const od = isoToDate(opening.date);
    if (od) r2.getCell(1).value = od;
    r2.getCell(2).value = 0;
    r2.getCell(4).value = opening.libelle || 'Solde à nouveau';
    r2.getCell(7).value = round2(Number(opening.amount) || 0);

    // Écritures
    let solde = round2(Number(opening.amount) || 0);
    let rowIdx = 3;
    let lastNo = 0;
    for (const e of entries) {
      const row = ws.getRow(rowIdx);
      styleDataRow(row);
      const d = isoToDate(e.date);
      if (d) row.getCell(1).value = d;
      const noNum = typeof e.no === 'number' ? e.no : (e.no != null && /^\d+$/.test(String(e.no)) ? parseInt(e.no, 10) : null);
      if (noNum != null) { row.getCell(2).value = noNum; if (noNum > lastNo) lastNo = noNum; }
      else if (e.no != null && e.no !== '') row.getCell(2).value = String(e.no);
      if (e.compte) row.getCell(3).value = String(e.compte);
      if (e.libelle) row.getCell(4).value = String(e.libelle);
      const debit = e.debit != null && e.debit !== '' ? round2(Number(e.debit)) : null;
      const credit = e.credit != null && e.credit !== '' ? round2(Number(e.credit)) : null;
      if (debit != null && debit !== 0) row.getCell(5).value = debit;
      if (credit != null && credit !== 0) row.getCell(6).value = credit;
      solde = round2(solde + (debit || 0) - (credit || 0));
      row.getCell(7).value = { formula: `G${rowIdx - 1}+E${rowIdx}-F${rowIdx}`, result: solde };
      rowIdx++;
    }

    // Lignes pré-remplies (numérotation + formule de solde), comme dans le modèle
    const prefillTo = model.prefillTo != null ? model.prefillTo : Math.max(DEFAULT_PREFILL, lastNo + 50);
    for (let n = lastNo + 1; n <= prefillTo; n++) {
      const row = ws.getRow(rowIdx);
      styleDataRow(row);
      row.getCell(2).value = n;
      row.getCell(7).value = { formula: `G${rowIdx - 1}+E${rowIdx}-F${rowIdx}`, result: solde };
      rowIdx++;
    }
    // quelques lignes de style supplémentaires
    for (let k = 0; k < 3; k++) {
      const row = ws.getRow(rowIdx);
      styleDataRow(row);
      row.getCell(7).value = { formula: `G${rowIdx - 1}+E${rowIdx}-F${rowIdx}`, result: solde };
      rowIdx++;
    }

    // Deuxième feuille (vide) comme dans le modèle
    const ws2 = wb.addWorksheet('Compte');
    ws2.getColumn(5).width = 48.57;

    return { workbook: wb, finalBalance: solde, lastRow: rowIdx - 1 };
  }

  /**
   * Calcule les totaux (débits, crédits, solde final) sans créer le classeur.
   */
  function computeTotals(opening, entries) {
    let debits = 0;
    let credits = 0;
    for (const e of entries || []) {
      debits += Number(e.debit) || 0;
      credits += Number(e.credit) || 0;
    }
    const start = Number(opening && opening.amount) || 0;
    return { start: round2(start), debits: round2(debits), credits: round2(credits), end: round2(start + debits - credits) };
  }

  function suggestFileName(entries, opening) {
    let year = null;
    for (const e of entries || []) {
      const m = /^(\d{4})/.exec(e.date || '');
      if (m) year = Math.max(year || 0, parseInt(m[1], 10));
    }
    if (!year && opening && opening.date) year = parseInt(String(opening.date).slice(0, 4), 10);
    return `Caisse écoles ${year || new Date().getFullYear()}.xlsx`;
  }

  return {
    SHEET_NAME,
    readWorkbook,
    buildWorkbook,
    computeTotals,
    suggestFileName,
    isoToDate,
    dateToIso,
  };
});
