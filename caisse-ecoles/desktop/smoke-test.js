/*
 * Test de fumée de l'application fenêtrée : la fenêtre à onglets s'ouvre, Caisse écoles est
 * chargée, le moteur de lecture et l'OCR embarqué fonctionnent, le lecteur natif répond si
 * présent, une pièce saisie dans la fiche arrive dans le journal et dans les fichiers de
 * l'application, la fiche PDF se génère, et l'onglet Décompte DGEO démarre le serveur local
 * s'il est inclus.
 *
 *   node smoke-test.js                              # source (electron .)
 *   node smoke-test.js chemin/vers/CaisseEcoles.exe # exécutable empaqueté
 *   SMOKE_NATIVE=1 : exige le lecteur natif ; SMOKE_DGEO=1 : exige Décompte DGEO
 */
const path = require('path');
const { _electron: electron } = require('playwright-core');

async function findPage(app, pred, timeoutMs) {
  const t0 = Date.now();
  for (;;) {
    for (const p of app.windows()) { try { if (pred(p.url())) return p; } catch (e) { /* fermée */ } }
    if (Date.now() - t0 > (timeoutMs || 30000)) throw new Error('page introuvable');
    await new Promise((r) => setTimeout(r, 200));
  }
}

(async () => {
  const exe = process.argv[2];
  const app = await electron.launch(exe ? { executablePath: exe, args: [] } : { args: [path.join(__dirname)] });
  const shell = await findPage(app, (u) => /shell\.html/.test(u));
  const win = await findPage(app, (u) => /Caisse-ecoles\.html/.test(u));
  win.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await win.waitForLoadState('domcontentloaded');
  await win.waitForSelector('#regYear');
  const title = await win.title();
  const info = await win.evaluate(() => ({
    parser: typeof window.CaisseParser, excel: typeof window.CaisseExcel, ocr: !!(window.CaisseOCR && window.CaisseOCR.available()),
    registre: typeof window.CaisseRegistre, pdf: typeof window.CaissePdf, files: !!window.CaisseFiles,
    desktop: window.CaisseDesktop || null, names: !!(window.CaisseVocabNoms && window.CaisseVocabNoms.persons && window.CaisseVocabNoms.persons.length),
    vocab: (document.getElementById('vocabInfo').textContent || '').slice(0, 80),
  }));
  console.log('titre :', title);
  console.log(JSON.stringify(info));
  // lecture d'une pièce synthétique par le moteur (sans PDF : mots positionnés)
  const entry = await win.evaluate(() => {
    const P = window.CaisseParser;
    const w = (str, x, y) => ({ str, x, y, h: 10 });
    const words = [w('PIECE', 79, 82), w('COMPTABLE', 114, 82), w('12', 349, 79), w('DOIT', 79, 114), w('SOMME', 338, 112), w('AVOIR', 410, 112), w('Libellé', 342, 220), w('Total', 78, 390),
      w('50000.3652.00', 155, 142), w('CHF', 332, 142), w('12.00', 356, 142), w('9100.104', 454, 142), w('CHF', 332, 388), w('12.00', 356, 388),
      w('REMBOURSEMENT', 78, 261), w('frais', 118, 261), w('A.', 78, 275), w('Berger', 118, 275), w('01.03.2025', 56, 425)];
    const res = P.parseDocument([{ pageNumber: 1, width: 595, height: 842, words }], { caisse: '9100.104' });
    const e = res.entries[0];
    return e ? { no: e.no, date: e.date, compte: e.compte, credit: e.credit, libelle: e.libelle } : null;
  });
  console.log('pièce synthétique :', JSON.stringify(entry));
  let ok = /Caisse écoles/.test(title) && info.parser === 'object' && info.excel === 'object' && info.ocr && info.registre === 'object' && info.pdf === 'object' && info.files
    && !!entry && entry.credit === 12 && entry.compte === '50000.3652.00';

  // saisie d'une pièce dans la fiche -> journal -> fichiers de l'application
  await win.waitForFunction(() => window.CaisseSaisie && window.CaisseSaisie.state.reg, null, { timeout: 20000 });
  const year = await win.evaluate(() => window.CaisseSaisie.state.reg.annee);
  await win.selectOption('#pType', 'DECOMPTE');
  await win.selectOption('#pObjet', "Course d'école");
  await win.fill('#pClasse', '5P/3');
  await win.fill('#pPeriode', '12.06.' + year);
  await win.fill('#pDetail', 'Lausanne');
  await win.fill('#pPersonne', 'A. Berger');
  await win.fill('#pMontant', '143.95');
  await win.fill('#pDate', `${year}-06-15`);
  await win.check('#pSensCredit');
  const before = await win.evaluate(() => window.CaisseSaisie.state.reg.pieces.length);
  await win.click('#btnPieceSave');
  await win.waitForFunction((n) => window.CaisseSaisie.state.reg.pieces.length === n + 1, before, { timeout: 10000 });
  const saisie = await win.evaluate(async () => {
    const R = window.CaisseRegistre; const s = window.CaisseSaisie.state;
    const p = s.reg.pieces[s.reg.pieces.length - 1];
    const j = R.journal(s.reg);
    const stored = window.CaisseFiles ? await window.CaisseFiles.load(s.reg.annee) : null;
    const pdf = await window.CaissePdf.buildPdf([p], s.reg, () => null);
    return { no: p.no, libelle: p.libelle, compte: p.compte, sens: p.sens, montant: p.montant, rows: j.rows.length, end: j.end, storedPieces: stored ? JSON.parse(stored).pieces.length : null, pdfPages: pdf.pages, journalRows: document.querySelectorAll('#journalBody tr[data-id]').length };
  });
  console.log('pièce saisie :', JSON.stringify(saisie));
  ok = ok && saisie.compte === '51000.3662.00' && saisie.sens === 'credit' && saisie.montant === 143.95 && saisie.journalRows === saisie.rows && saisie.pdfPages === 1 && /DECOMPTE - Course d'école 5P\/3 du 12\.06\./.test(saisie.libelle) && (saisie.storedPieces === null || saisie.storedPieces === saisie.rows);
  // nettoyage : la pièce de test est retirée du registre
  await win.evaluate(async () => { const s = window.CaisseSaisie.state; window.CaisseRegistre.removePiece(s.reg, s.reg.pieces[s.reg.pieces.length - 1].id); await s.storage.save(s.reg); window.CaisseSaisie.renderJournal(); });

  if (process.env.SMOKE_OCR !== '0') {
    const ocr = await win.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 400; c.height = 100;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 100);
      ctx.fillStyle = '#000'; ctx.font = '40px Arial'; ctx.fillText('CHF 29.70', 20, 65);
      const engine = await window.CaisseOCR.createEngine();
      const blocks = await engine.recognize(c, 7);
      const words = window.CaisseOCR.itemsFromBlocks(blocks, 1, 0, 0).map((x) => x.str);
      await engine.terminate();
      return words.join(' ');
    });
    console.log('OCR embarqué :', JSON.stringify(ocr));
    ok = ok && /29\.70/.test(ocr);
  }
  // troisième lecteur (Tesseract natif) : présent dans la version portable, facultatif en développement
  const nat = await win.evaluate(async () => {
    if (!window.CaisseNative) return { available: false, reason: 'pas de pont' };
    const info = await window.CaisseNative.ocrInfo();
    if (!info.available) return info;
    const c = document.createElement('canvas'); c.width = 400; c.height = 100;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 100);
    ctx.fillStyle = '#000'; ctx.font = '40px Arial'; ctx.fillText('CHF 29.70', 20, 65);
    const png = await new Promise((r) => c.toBlob((b) => b.arrayBuffer().then((buf) => r(new Uint8Array(buf))), 'image/png'));
    const words = await window.CaisseNative.ocrRecognize(png, { psm: 7, oem: 1, dpi: 216 });
    let legacy = null;
    if (info.legacy) legacy = (await window.CaisseNative.ocrRecognize(png, { psm: 7, oem: 0, lang: 'fra_leg', dpi: 216 })).map((w) => w.text).join(' ');
    return Object.assign({}, info, { read: words.map((w) => w.text).join(' '), legacyRead: legacy });
  });
  console.log('Tesseract natif :', JSON.stringify(nat));
  if (process.env.SMOKE_NATIVE === '1') ok = ok && nat.available && /29\.70/.test(nat.read || '') && (!nat.legacy || /29\.70/.test(nat.legacyRead || ''));

  // onglet Décompte DGEO
  const st = await shell.evaluate(() => window.CaisseShell.state());
  console.log('coquille :', JSON.stringify(st));
  if (st.hasDgeo) {
    await shell.click('.tab[data-tab="dgeo"]');
    let dgeoPage = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 120000) {
      dgeoPage = app.windows().find((p) => /^http:\/\/127\.0\.0\.1:\d+\//.test(p.url()));
      if (dgeoPage) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    if (dgeoPage) {
      await dgeoPage.waitForLoadState('domcontentloaded');
      const dt = await dgeoPage.title();
      console.log('Décompte DGEO :', dgeoPage.url(), '–', dt);
      ok = ok && /Décompte/i.test(dt + (await dgeoPage.content()).slice(0, 2000));
    } else {
      console.log('Décompte DGEO : le serveur local n\'a pas répondu');
      if (process.env.SMOKE_DGEO === '1') ok = false;
    }
    await shell.click('.tab[data-tab="caisse"]');
  } else {
    console.log('Décompte DGEO : non inclus');
    if (process.env.SMOKE_DGEO === '1') ok = false;
  }
  await app.close();
  console.log(ok ? 'SMOKE OK' : 'SMOKE ÉCHEC');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
