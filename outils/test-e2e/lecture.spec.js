// Point 1 — Lire : le texte se sélectionne et se copie par-dessus la page,
// et un double-clic sur du vide ouvre l'éditeur sans gêner la sélection.
const { test, expect, pdfTexte, pdfVide } = require('./aide');

test('la couche de texte se pose par-dessus la page', async ({ app, page }) => {
  await app.ouvrir('lettre.pdf', pdfTexte(['Commune de Blonay', 'Décompte des frais 2026']));
  const couche = page.locator('#lecture .feuille-vue .couche-texte');
  await expect(couche).toHaveCount(1);
  await expect(couche).toContainText('Commune de Blonay');
  await expect(couche).toContainText('Décompte des frais 2026');
  // Invisible mais sélectionnable : c'est la page dessous qu'on voit.
  const lisible = await couche.locator('span').first().evaluate((e) => getComputedStyle(e).color);
  expect(lisible).toBe('rgba(0, 0, 0, 0)');
});

test('un double-clic sélectionne le mot, et n\'ouvre pas l\'éditeur', async ({ app, page }) => {
  await app.ouvrir('lettre.pdf', pdfTexte(['Commune de Blonay']));
  const mot = page.locator('#lecture .couche-texte span').first();
  // La couche de texte étire ses boîtes pour coller à la largeur du PDF : les
  // glyphes se serrent à gauche, et le centre de la boîte tombe après le mot.
  const boite = await mot.boundingBox();
  await page.mouse.dblclick(boite.x + 10, boite.y + boite.height / 2);
  const choisi = await page.evaluate(() => String(window.getSelection()));
  expect(choisi.trim(), 'le mot cliqué est sélectionné').toBe('Commune');
  await expect(page.locator('.editor')).toBeHidden();
});

test('un double-clic sur le vide de la page ouvre l\'éditeur', async ({ app, page }) => {
  await app.ouvrir('vide.pdf', pdfVide(1));
  const feuille = page.locator('#lecture .feuille-vue').first();
  const boite = await feuille.boundingBox();
  await page.mouse.dblclick(boite.x + boite.width / 2, boite.y + boite.height - 30);
  await expect(page.locator('.editor')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.editor')).toBeHidden();
});

test('la sélection couvre plusieurs lignes et se relit entière', async ({ app, page }) => {
  await app.ouvrir('lettre.pdf', pdfTexte(['Première ligne du document', 'Seconde ligne du document']));
  await page.waitForFunction(() => document.querySelectorAll('#lecture .couche-texte span').length >= 2);
  const choisi = await page.evaluate(() => {
    const spans = document.querySelectorAll('#lecture .couche-texte span');
    const r = document.createRange();
    r.setStart(spans[0], 0);
    r.setEnd(spans[spans.length - 1], spans[spans.length - 1].childNodes.length);
    const s = window.getSelection();
    s.removeAllRanges(); s.addRange(r);
    return String(s);
  });
  expect(choisi).toContain('Première ligne');
  expect(choisi).toContain('Seconde ligne');
});

test('deux pages côte à côte, et le zoom se règle', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(4));
  await page.click('#vue-deux');
  await expect(page.locator('#vue-deux')).toHaveAttribute('aria-pressed', 'true');
  // Comme un livre : la couverture seule, puis les pages par paires.
  await expect(page.locator('#lecture .rangee')).toHaveCount(3);
  await page.click('#vue-deux');
  await expect(page.locator('#lecture .rangee')).toHaveCount(0);

  await page.selectOption('#zoom-niveau', '0.5');
  const petite = await page.locator('#lecture .feuille-vue').first().boundingBox();
  await page.selectOption('#zoom-niveau', '1');
  await expect.poll(async () => (await page.locator('#lecture .feuille-vue').first().boundingBox()).width)
    .toBeGreaterThan(petite.width);
});

test('le numéro de la page affichée suit le défilement', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(6));
  await expect(page.locator('#page-total')).toHaveText('/ 6');
  await page.fill('#page-num', '5');
  await page.press('#page-num', 'Enter');
  await expect.poll(() => page.inputValue('#page-num'), { timeout: 20000 }).toBe('5');
});
