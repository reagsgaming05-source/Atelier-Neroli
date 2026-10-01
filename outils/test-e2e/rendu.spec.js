// Le rendu des pages hors du fil principal (src/09-rendu.js) : un scan lourd ne fige plus la fenêtre, le résultat
// est le même que sur le fil principal, et au moindre échec du travailleur la page se dessine quand même.
const { test, expect } = require('./aide');

// Un « scan » : trois pages portant chacune un grand JPEG bruité (≈ 3 Mo la page, 8,7 mégapixels), fabriquées dans la page.
async function fabriquerScan(page) {
  const b64 = await page.evaluate(async () => {
    const cv = document.createElement('canvas'); cv.width = 2480; cv.height = 3508;
    const cx = cv.getContext('2d');
    const id = cx.createImageData(2480, 3508);
    for (let i = 0; i < id.data.length; i += 4) { const v = (Math.random() * 255) | 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    cx.putImageData(id, 0, 0);
    const jpg = new Uint8Array(await (await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.7))).arrayBuffer());
    const doc = await window.PDFLib.PDFDocument.create();
    for (let i = 0; i < 3; i++) { const im = await doc.embedJpg(jpg); const p = doc.addPage([595, 842]); p.drawImage(im, { x: 0, y: 0, width: 595, height: 842 }); }
    const o = await doc.save();
    let s = ''; for (let i = 0; i < o.length; i += 8192) s += String.fromCharCode.apply(null, o.subarray(i, i + 8192));
    return btoa(s);
  });
  return Buffer.from(b64, 'base64');
}

// Le plus long blocage du fil principal : l'écart maximal entre deux battements d'un minuteur de 4 ms.
const surveillerLeFil = (page) => page.evaluate(() => {
  window.__ecart = 0; let dernier = performance.now();
  window.__battement = setInterval(() => { const n = performance.now(); window.__ecart = Math.max(window.__ecart, n - dernier); dernier = n; }, 4);
});
const ecartMax = (page) => page.evaluate(() => window.__ecart);
const remettreAZero = (page) => page.evaluate(() => { window.__ecart = 0; });

// Compte les travailleurs que la page lance, pour savoir si celui du rendu a été créé.
const compterLesTravailleurs = (page, casse) => page.addInitScript((casse) => {
  window.__travailleurs = 0;
  const Natif = window.Worker;
  window.Worker = function (url, o) {
    window.__travailleurs++;
    if (casse && window.__travailleurs >= 2) throw new Error('travailleur refusé (essai)');
    return new Natif(url, o);
  };
}, casse);

test('un scan lourd se dessine sans figer la fenêtre', async ({ app, page }) => {
  test.setTimeout(240000);
  const scan = await fabriquerScan(page);
  expect(scan.length / 3, 'trois pages lourdes').toBeGreaterThan(150 * 1024);
  await surveillerLeFil(page);
  // Playwright décode lui-même le fichier dans la page (≈ 1 s pour 13 Mo) : le chronomètre ne part qu'après.
  await page.setInputFiles('#file-input', { name: 'scan.pdf', mimeType: 'application/pdf', buffer: scan });
  await remettreAZero(page);
  await page.waitForFunction(() => {
    const cv = document.querySelector('#lecture .feuille-vue canvas');
    return cv && cv.width > 100 && document.querySelector('#lecture .feuille-vue .attente[hidden]');
  }, null, { timeout: 120000 });
  await page.waitForTimeout(600);
  const ecart = await ecartMax(page);
  console.log('scan de trois pages : plus long blocage du fil principal ' + Math.round(ecart) + ' ms');
  // Sur le fil principal, une seule de ces pages bloque 0,7 s ; le travailleur ne laisse que des miettes.
  expect(ecart, 'le fil principal ne doit pas geler').toBeLessThan(400);
});

test('le rendu hors du fil principal donne les mêmes pixels que le fil principal', async ({ app, page }) => {
  test.setTimeout(240000);
  const scan = await fabriquerScan(page);
  await app.ouvrir('scan.pdf', scan);
  await page.waitForFunction(() => { const cv = document.querySelector('#lecture .feuille-vue canvas'); return cv && cv.width > 100 && document.querySelector('#lecture .feuille-vue .attente[hidden]'); }, null, { timeout: 120000 });
  const r = await page.evaluate(async (b64) => {
    const bin = atob(b64); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const cv = document.querySelector('#lecture .feuille-vue canvas');
    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const p1 = await pdf.getPage(1);
    const vp = p1.getViewport({ scale: cv.width / p1.getViewport({ scale: 1 }).width });
    const ref = document.createElement('canvas'); ref.width = cv.width; ref.height = cv.height;
    const rx = ref.getContext('2d', { alpha: false }); rx.fillStyle = '#fff'; rx.fillRect(0, 0, ref.width, ref.height);
    await p1.render({ canvasContext: rx, viewport: vp }).promise;
    const a = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, b = rx.getImageData(0, 0, ref.width, ref.height).data;
    let diff = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) > 12) diff++;
    return { diff, total: a.length / 4 };
  }, scan.toString('base64'));
  console.log('pixels différents du rendu de référence : ' + r.diff + ' sur ' + r.total);
  expect(r.diff / r.total, 'part de pixels différents').toBeLessThan(0.002);
});

test('le travailleur de rendu n\'est lancé que pour un document lourd', async ({ app, page }) => {
  await compterLesTravailleurs(page, false);
  await page.goto(require('./aide').PAGE);
  await page.waitForSelector('#app-toolbar', { state: 'visible', timeout: 60000 });
  await app.pretAvecExemple();
  const apresLexemple = await page.evaluate(() => window.__travailleurs);
  const scan = await fabriquerScan(page);
  await app.ouvrir('scan.pdf', scan);
  await page.waitForFunction(() => { const cv = document.querySelector('#lecture .feuille-vue canvas'); return cv && cv.width > 100 && document.querySelector('#lecture .feuille-vue .attente[hidden]'); }, null, { timeout: 120000 });
  const apresLeScan = await page.evaluate(() => window.__travailleurs);
  expect(apresLeScan, 'un travailleur de plus pour le scan').toBeGreaterThan(apresLexemple);
});

test('si le travailleur ne peut pas démarrer, la page se dessine quand même', async ({ app, page }) => {
  test.setTimeout(240000);
  await compterLesTravailleurs(page, true);
  await page.goto(require('./aide').PAGE);
  await page.waitForSelector('#app-toolbar', { state: 'visible', timeout: 60000 });
  await app.pretAvecExemple();
  const scan = await fabriquerScan(page);
  await surveillerLeFil(page);
  await page.setInputFiles('#file-input', { name: 'scan.pdf', mimeType: 'application/pdf', buffer: scan });
  await remettreAZero(page);
  await page.waitForFunction(() => { const cv = document.querySelector('#lecture .feuille-vue canvas'); return cv && cv.width > 100 && document.querySelector('#lecture .feuille-vue .attente[hidden]'); }, null, { timeout: 120000 });
  await page.waitForTimeout(600);
  console.log('même scan, rendu à l\'ancienne (le travailleur est refusé) : plus long blocage ' + Math.round(await ecartMax(page)) + ' ms');
  // la page n'est pas restée blanche
  const noir = await page.evaluate(() => {
    const cv = document.querySelector('#lecture .feuille-vue canvas');
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] < 200) n++;
    return n;
  });
  expect(noir, 'la page est dessinée').toBeGreaterThan(100);
});
