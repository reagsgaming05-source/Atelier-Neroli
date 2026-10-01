// Réaffichage à 320 px CSS (WCAG 1.4.10, soit un écran de 1280 px agrandi à 400 %) et taille des cibles (WCAG 2.5.8) :
// rien ne déborde de la fenêtre — ni la page, ni une boîte de dialogue, ni l'éditeur —, et aucune commande n'est plus petite que 24 × 24 px.
// L'audit avait relevé 515 px de largeur pour 320 de fenêtre, et huit cibles trop petites sous 520 px.
const { test, expect, pdfVide } = require('./aide');

test.use({ viewport: { width: 320, height: 568 } });

// Ce qui dépasse le bord droit de la fenêtre, hors des zones qui défilent d'elles-mêmes (la toile des pages).
const debordements = (page) => page.evaluate(() => {
  const W = document.documentElement.clientWidth;
  const hors = [...document.querySelectorAll('body *')].filter((e) => {
    const b = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return b.width > 0 && b.right > W + 0.5 && cs.visibility !== 'hidden' && !e.closest('[hidden], canvas, .sr-only');
  }).slice(0, 5).map((e) => (e.id ? '#' + e.id : '') + '.' + String(e.className).slice(0, 30) + ' (bord droit à ' + Math.round(e.getBoundingClientRect().right) + ')');
  return { largeurPage: document.documentElement.scrollWidth, W, hors };
});
const tient = async (page, quoi) => {
  const r = await debordements(page);
  expect(r.largeurPage, quoi + ' : la page tient dans ' + r.W + ' px').toBeLessThanOrEqual(r.W);
  expect(r.hors, quoi + ' : rien ne dépasse du bord').toEqual([]);
};

test('la vue Lecture, la vue Organiser et le volet des outils tiennent à 320 px', async ({ app, page }) => {
  await app.ouvrir('quatre.pdf', pdfVide(4));
  await tient(page, 'lecture');
  await app.vue('organiser');
  await tient(page, 'organiser');
  await page.click('#tab-tools');
  await tient(page, 'volet des outils');
});

for (const outil of ['props', 'watermark', 'lots', 'search', 'stamp', 'compress', 'password', 'ocr']) {
  test('la boîte « ' + outil + ' » tient à 320 px, boutons du pied compris', async ({ app, page }) => {
    await app.ouvrir('quatre.pdf', pdfVide(4));
    await page.click('#tab-tools');
    await page.click('[data-tool="' + outil + '"]');
    await page.waitForSelector('.dialog', { state: 'visible' });
    await tient(page, 'boîte ' + outil);
  });
}

test('l\'éditeur de page tient à 320 px', async ({ app, page }) => {
  await app.ouvrir('quatre.pdf', pdfVide(4));
  await app.vue('organiser');
  await page.dblclick('#pages .tile:nth-child(1) .sheet');
  await expect(page.locator('.editor')).toBeVisible();
  await tient(page, 'éditeur');
});

test('aucune commande n\'est plus petite que 24 × 24 px, barre d\'actions des vignettes comprise', async ({ app, page }) => {
  await app.ouvrir('quatre.pdf', pdfVide(4));
  await app.vue('organiser');
  await page.addStyleTag({ content: '.tile-tools { opacity: 1 !important; transform: translateX(-50%) !important; }' });
  await app.selectionner(1);
  const petites = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('button, a[href], input:not([type=hidden]):not([type=file]), select, textarea, [role=tab], [role=option]').forEach((e) => {
      const b = e.getBoundingClientRect();
      if (b.width <= 0 || b.height <= 0 || getComputedStyle(e).visibility === 'hidden' || e.closest('[hidden], .sr-only')) return;
      if (b.width < 23.5 || b.height < 23.5) out.push((e.dataset.act ? 'vignette:' + e.dataset.act : e.id || String(e.className).slice(0, 24) || e.tagName) + ' ' + Math.round(b.width) + '×' + Math.round(b.height));
    });
    return out;
  });
  expect(petites, 'commandes sous 24 × 24 px').toEqual([]);
});
