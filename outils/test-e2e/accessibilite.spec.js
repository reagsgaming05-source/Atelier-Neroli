// Point 6 — Le clavier : une boîte modale le retient et le rend où il était,
// une boîte flottante le laisse partir, et la barre d'onglets se parcourt aux
// flèches. Sans quoi on se retrouve à tabuler dans le document derrière une
// fenêtre ouverte, sans moyen visible de revenir.
const { test, expect, pdfVide } = require('./aide');

const dansLaBoite = (page) => page.evaluate(() => {
  const d = document.querySelector('.dialog');
  return !!(d && d.contains(document.activeElement));
});

test('une boîte modale retient le clavier', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(2));
  await app.outil('props');
  await expect(page.locator('.dialog')).toHaveAttribute('aria-modal', 'true');
  // Bien plus de tabulations qu'il n'y a d'éléments : le focus doit tourner.
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    expect(await dansLaBoite(page), 'le clavier est resté dans la boîte (tabulation ' + (i + 1) + ')').toBe(true);
  }
});

test('Maj+Tab depuis le premier élément revient au dernier', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(2));
  await app.outil('props');
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await dansLaBoite(page)).toBe(true);
  }
});

test('en refermant, le clavier revient là où il était', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(2));
  await app.outil('props');
  await page.keyboard.press('Escape');
  await expect(page.locator('.dialog')).toHaveCount(0);
  const revenu = await page.evaluate(() => document.activeElement && document.activeElement.dataset
    ? document.activeElement.dataset.tool || '' : '');
  expect(revenu, 'le clavier est rendu au bouton qui a ouvert la boîte').toBe('props');
});

test('le panneau de recherche flotte : il ne retient pas le clavier', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(2));
  await page.click('#btn-search');
  const panneau = page.locator('.dialog.libre');
  await expect(panneau).toBeVisible();
  // Non modal : on lit le document derrière pendant qu'il est ouvert.
  expect(await panneau.getAttribute('aria-modal'), 'un panneau flottant n\'est pas modal').toBeNull();
  let sorti = false;
  for (let i = 0; i < 30 && !sorti; i++) {
    await page.keyboard.press('Tab');
    sorti = !(await dansLaBoite(page));
  }
  expect(sorti, 'le clavier peut quitter le panneau flottant').toBe(true);
});

test('les flèches parcourent la barre d\'onglets', async ({ app, page }) => {
  await app.ouvrir('premier.pdf', pdfVide(3));
  await page.keyboard.press('Control+t');
  await app.ouvrir('second.pdf', pdfVide(5));
  await expect(page.locator('#onglets .onglet')).toHaveCount(2);
  expect(await app.nbPages()).toBe(5);

  await page.locator('#onglets .onglet[aria-selected="true"]').focus();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => app.nbPages()).toBe(3);
  // Le clavier suit l'onglet activé, sur l'élément reconstruit par le rendu.
  const suit = await page.evaluate(() => {
    const a = document.activeElement;
    return !!(a && a.classList.contains('onglet') && a.getAttribute('aria-selected') === 'true');
  });
  expect(suit, 'le clavier est sur l\'onglet devenu actif').toBe(true);

  await page.keyboard.press('ArrowRight');
  await expect.poll(() => app.nbPages()).toBe(5);
});

test('Début et Fin vont aux extrémités de la barre d\'onglets', async ({ app, page }) => {
  await app.ouvrir('premier.pdf', pdfVide(3));
  await page.keyboard.press('Control+t');
  await app.ouvrir('second.pdf', pdfVide(5));
  await page.locator('#onglets .onglet[aria-selected="true"]').focus();
  await page.keyboard.press('Home');
  await expect.poll(() => app.nbPages()).toBe(3);
  await page.keyboard.press('End');
  await expect.poll(() => app.nbPages()).toBe(5);
});

test('un seul onglet est atteignable par Tab, les flèches font le reste', async ({ app, page }) => {
  await app.ouvrir('premier.pdf', pdfVide(3));
  await page.keyboard.press('Control+t');
  await app.ouvrir('second.pdf', pdfVide(5));
  const indices = await page.locator('#onglets .onglet').evaluateAll((els) => els.map((e) => e.tabIndex));
  expect(indices.filter((i) => i === 0), 'un seul onglet dans l\'ordre de tabulation').toHaveLength(1);
  expect(indices.filter((i) => i === -1)).toHaveLength(1);
});
