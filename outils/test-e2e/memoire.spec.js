// La mémoire des aperçus est bornée (chapitre 18) : parcourir un long document ne les garde pas tous, et ce qui a été libéré se redessine
// quand on y revient. Le défilement de la vue Lecture suit la page affichée sans lire toutes les feuilles.
const { test, expect, pdfDe } = require('./aide');

const doc = (n) => pdfDe(Array.from({ length: n }, (_, i) => [{ x: 70, y: 760, taille: 20, texte: 'Page ' + (i + 1) }]));
const mesures = (page) => page.evaluate(() => window.aktumMesures());

test('mille vignettes parcourues : la mémoire des aperçus reste sous sa borne, et un aperçu libéré revient quand on y retourne', async ({ app, page }) => {
  test.setTimeout(240000);
  await app.ouvrir('long.pdf', doc(420));
  await app.vue('organiser');
  // on parcourt tout le document, vignette après vignette
  for (let k = 0; k < 14; k++) {
    await page.evaluate((k) => { const c = document.querySelector('#canvas, .canvas') || document.scrollingElement; const z = document.querySelector('#pages'); (z.closest('.canvas') || z.parentElement).scrollTop = k * 2500; }, k);
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(1500);
  const m = await mesures(page);
  expect(m.pages).toBe(420);
  expect(m.vignettes, 'les aperçus gardés ne dépassent pas la borne (ceux de l\'écran en plus)').toBeLessThanOrEqual(m.vignettesMax + 60);
  expect(m.vignettes).toBeGreaterThan(20);
  // retour en haut : la première vignette se redessine
  await page.evaluate(() => { const z = document.querySelector('#pages'); (z.closest('.canvas') || z.parentElement).scrollTop = 0; });
  await expect.poll(() => page.evaluate(() => { const t = document.querySelector('#pages .tile:nth-child(1) img'); return !!(t && t.complete && t.naturalWidth > 0); }), { timeout: 30000 }).toBe(true);
});

test('en lecture, le numéro de la page affichée suit le défilement sur un long document', async ({ app, page }) => {
  await app.ouvrir('long.pdf', doc(300));
  await app.attendreRendu();
  const hauteur = await page.evaluate(() => document.querySelector('#lecture .feuille-vue').getBoundingClientRect().height);
  await page.evaluate((h) => { const c = document.querySelector('#lecture').closest('.canvas') || document.querySelector('#lecture').parentElement; c.scrollTop = (h + 16) * 149.6; }, hauteur);
  await expect.poll(() => page.inputValue('#page-num, #pageNum, input[aria-label="Page affichée"]'), { timeout: 10000 }).toBe('150');
});

test('un document de plus de 2 000 pages : l\'ouverture le dit, et reste possible', async ({ app, page }) => {
  test.setTimeout(300000);
  // sans attendre que tout soit dessiné : c'est l'avertissement qu'on regarde, et le fichier met du temps à s'ouvrir
  await page.setInputFiles('#file-input', { name: 'énorme.pdf', mimeType: 'application/pdf', buffer: pdfDe(Array.from({ length: 2010 }, () => [])) });
  await expect(page.locator('#toast')).toContainText('conçue pour des documents jusqu\'à 2 000 pages', { timeout: 120000 });
  await expect(page.locator('#summary')).toContainText(/2\W?010 pages/, { timeout: 120000 });   // « 2’010 pages » : les milliers à la suisse
});
