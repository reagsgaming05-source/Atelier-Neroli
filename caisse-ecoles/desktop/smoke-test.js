/*
 * Test de fumée de l'application fenêtrée : la fenêtre s'ouvre, l'application est chargée,
 * le moteur OCR embarqué est disponible et une pièce synthétique est lue.
 *
 *   node smoke-test.js                      # source (electron .)
 *   node smoke-test.js chemin/vers/CaisseEcoles.exe   # exécutable empaqueté
 */
const path = require('path');
const { _electron: electron } = require('playwright-core');
(async () => {
  const exe = process.argv[2];
  const app = await electron.launch(exe ? { executablePath: exe, args: [] } : { args: [path.join(__dirname)] });
  const win = await app.firstWindow();
  win.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await win.waitForLoadState('domcontentloaded');
  await win.waitForSelector('#step1');
  const title = await win.title();
  const info = await win.evaluate(() => ({
    parser: typeof window.CaisseParser, excel: typeof window.CaisseExcel, ocr: !!(window.CaisseOCR && window.CaisseOCR.available()),
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
  let ok = /Caisse écoles/.test(title) && info.parser === 'object' && info.excel === 'object' && info.ocr && !!entry && entry.credit === 12 && entry.compte === '50000.3652.00';
  if (process.env.SMOKE_OCR !== '0') {
    // le moteur OCR démarre et lit un mot dessiné dans un canvas
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
  await app.close();
  console.log(ok ? 'SMOKE OK' : 'SMOKE ÉCHEC');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
