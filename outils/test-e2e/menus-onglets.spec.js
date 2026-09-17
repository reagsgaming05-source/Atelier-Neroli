// Point 10 — Clic droit sur une page et sur un onglet, et la vie des onglets
// et des signets qui va avec.
const { test, expect, pdfVide, pdfTexte, brut } = require('./aide');

test('clic droit sur une vignette : le menu de la page', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(3));
  await app.vue('organiser');
  await page.click('#pages .tile:nth-child(2)', { button: 'right' });
  const menu = page.locator('.menu-ctx');
  await expect(menu).toBeVisible();
  await expect(menu).toContainText('Pivoter à droite');
  await expect(menu).toContainText('Modifier la page');
  await expect(menu).toContainText('Ajouter un signet');
  await expect(menu).toContainText('Supprimer');
});

test('le menu de la page agit vraiment', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(3));
  await app.vue('organiser');
  await page.click('#pages .tile:nth-child(2)', { button: 'right' });
  await page.locator('.menu-ctx button', { hasText: 'Pivoter à droite' }).click();
  await expect(page.locator('.menu-ctx')).toHaveCount(0);
  await expect(page.locator('#pages .tile:nth-child(2) .flag')).toHaveText('90°');
});

test('Échap referme le menu sans rien faire', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(3));
  await app.vue('organiser');
  await page.click('#pages .tile:nth-child(1)', { button: 'right' });
  await expect(page.locator('.menu-ctx')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.menu-ctx')).toHaveCount(0);
  await expect(page.locator('#pages .tile .flag')).toHaveCount(0);
});

test('le clic droit marche aussi en lecture', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(2));
  await page.locator('#lecture .feuille-vue').first().click({ button: 'right', position: { x: 40, y: 40 } });
  await expect(page.locator('.menu-ctx')).toBeVisible();
  await expect(page.locator('.menu-ctx')).toContainText('Copier le texte de la page');
});

test('clic droit sur un onglet : enregistrer, fermer, nouvel onglet', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(2));
  await expect(page.locator('#onglets .onglet')).toHaveCount(1);
  await page.locator('#onglets .onglet').first().click({ button: 'right' });
  const menu = page.locator('.menu-ctx');
  await expect(menu).toBeVisible();
  await expect(menu).toContainText('Nouvel onglet');
  await expect(menu).toContainText('Fermer l\'onglet');
  await menu.locator('button', { hasText: 'Nouvel onglet' }).click();
  await expect(page.locator('#onglets .onglet')).toHaveCount(2);
});

test('deux onglets : chacun garde son document', async ({ app, page }) => {
  await app.ouvrir('premier.pdf', pdfVide(3));
  await page.keyboard.press('Control+t');
  await expect(page.locator('#onglets .onglet')).toHaveCount(2);
  await app.ouvrir('second.pdf', pdfVide(5));
  expect(await app.nbPages()).toBe(5);
  // Retour au premier onglet : ses trois pages sont intactes.
  await page.locator('#onglets .onglet').first().click();
  await expect.poll(() => app.nbPages()).toBe(3);
  await expect(page.locator('#doc-list .doc-name')).toContainText('premier.pdf');
});

test('fermer un onglet ne touche pas à l\'autre', async ({ app, page }) => {
  await app.ouvrir('premier.pdf', pdfVide(3));
  await page.keyboard.press('Control+t');
  await app.ouvrir('second.pdf', pdfVide(5));
  await page.locator('#onglets .onglet').nth(1).locator('.x').click();
  await expect(page.locator('#onglets .onglet')).toHaveCount(1);
  await expect.poll(() => app.nbPages()).toBe(3);
});

test('un signet se pose, se retrouve dans le volet et part dans le PDF', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfTexte(['Chapitre premier']));
  await page.click('#tab-plan');
  await expect(page.locator('#signets-vide')).toBeVisible();
  await page.click('#btn-signet');
  await page.fill('#sg-titre', 'Chapitre premier');
  await page.locator('.dialog .dlg-foot .tb-btn.primary').click();
  await expect(page.locator('#signets .signet')).toHaveCount(1);
  await expect(page.locator('#signet-count')).toHaveText('1');

  const { octets } = await app.exporter();
  expect(brut(octets), 'le PDF porte un plan de document').toContain('/Outlines');
});

test('un signet se retire', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfTexte(['Chapitre premier']));
  await page.click('#tab-plan');
  await page.click('#btn-signet');
  await page.locator('.dialog .dlg-foot .tb-btn.primary').click();
  await expect(page.locator('#signets .signet')).toHaveCount(1);
  await page.locator('#signets .signet .sg-x').click();
  await expect(page.locator('#signets .signet')).toHaveCount(0);
  await expect(page.locator('#signets-vide')).toBeVisible();
});
