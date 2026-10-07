// L'aide dans l'application (chapitre 08 de l'audit) : le « ? » de chaque boîte d'outil, F1, les raisons d'un outil grisé,
// la pastille qui dit ce qui est réglé, et Annuler / Rétablir qui nomment l'action.
const { test, expect } = require('./aide');

test('le « ? » d\'une boîte montre l\'aide de l\'outil sans fermer la boîte ni perdre les réglages', async ({ app, page }) => {
  await app.pretAvecExemple();
  await app.outil('watermark');
  const boite = page.locator('.dialog');
  await page.fill('#wm-text', 'BROUILLON ESSAI');
  const q = boite.locator('.dlg-head .aide');
  await expect(q).toBeVisible();
  await expect(q).toHaveAttribute('aria-expanded', 'false');
  await q.click();
  await expect(q).toHaveAttribute('aria-expanded', 'true');
  const aide = boite.locator('.dlg-aide');
  await expect(aide).toBeVisible();
  await expect(aide).toContainText('Imprime un texte en travers des pages');
  await expect(aide).toContainText('Ce que cela change');
  // la boîte est restée ouverte, et ce qu'on avait tapé aussi
  await expect(page.locator('#wm-text')).toHaveValue('BROUILLON ESSAI');
  await q.click();
  await expect(aide).toHaveCount(0);
  await expect(q).toHaveAttribute('aria-expanded', 'false');
});

test('F1 ouvre et referme l\'aide de la boîte au lieu de la fermer', async ({ app, page }) => {
  await app.pretAvecExemple();
  await app.outil('compress');
  await expect(page.locator('.dialog .dlg-aide')).toHaveCount(0);
  await page.keyboard.press('F1');
  await expect(page.locator('.dialog .dlg-aide')).toContainText('Alléger les images');
  await expect(page.locator('.dialog')).toBeVisible();
  await page.keyboard.press('F1');
  await expect(page.locator('.dialog .dlg-aide')).toHaveCount(0);
  await expect(page.locator('.dialog')).toBeVisible();
});

test('hors d\'une boîte, F1 ouvre toujours la page des raccourcis et de l\'aide', async ({ app, page }) => {
  await app.pretAvecExemple();
  await page.keyboard.press('F1');
  await expect(page.locator('.dialog h2')).toHaveText('Raccourcis et aide');
});

test('chaque boîte d\'outil a son « ? » et une aide qui dit ce que cela change', async ({ app, page }) => {
  await app.pretAvecExemple();
  for (const outil of ['blank', 'split', 'resize', 'stamp', 'number', 'props', 'password', 'flatten', 'exp-img', 'tableau', 'ocr', 'archiver', 'comparer', 'access', 'search']) {
    await app.outil(outil);
    const q = page.locator('.dialog .dlg-head .aide');
    await expect(q, outil + ' : le « ? »').toBeVisible();
    await q.click();
    await expect(page.locator('.dialog .dlg-aide'), outil + ' : l\'aide').toContainText('Ce que cela change');
    await page.keyboard.press('Escape');
    await expect(page.locator('.dialog')).toHaveCount(0);
  }
});

test('un outil grisé dit pourquoi, et la pastille d\'un outil appliqué dit ce qui est réglé', async ({ app, page }) => {
  await app.pretAvecExemple();
  await page.click('#doc-list .doc-rm');          // plus aucun document
  await expect.poll(() => app.nbPages()).toBe(0);
  await page.click('#tab-tools');
  const outil = page.locator('[data-tool="watermark"]');
  await expect(outil).toBeDisabled();
  await expect(outil).toHaveAttribute('title', /Ouvrez d'abord un document/);
  await page.keyboard.press('Control+z');          // le document revient
  await app.pretAvecExemple();
  await expect(outil).toBeEnabled();
  await expect(outil).not.toHaveAttribute('title', /Ouvrez d'abord/);
  await app.outil('watermark');
  await page.fill('#wm-text', 'COPIE');
  await page.locator('.dialog .dlg-foot .primary').click();
  const pastille = page.locator('[data-tool="watermark"] .dot');
  await expect(pastille).toHaveAttribute('aria-label', 'Un filigrane est posé sur ce document');
});

test('Annuler et Rétablir disent laquelle des actions ils défont', async ({ app, page }) => {
  await app.pretAvecExemple();
  await app.outil('watermark');
  await page.fill('#wm-text', 'COPIE');
  await page.locator('.dialog .dlg-foot .primary').click();
  await page.keyboard.press('Control+z');
  await expect.poll(() => app.dernier()).toContain('Annulé : Filigrane');
  await page.keyboard.press('Control+y');
  await expect.poll(() => app.dernier()).toContain('Rétabli : Filigrane');
});
