// L'outil « champ à remplir » pose un vrai champ de formulaire PDF. Il
// échouait sans un mot : setFontSize était appelé avant addToPage, la
// bibliothèque levait MissingDAEntryError, et un catch avalait l'erreur.
const { test, expect, pdfTexte, fluxDecompresses, annotationsDuPdf } = require('./aide');

test('un champ à remplir posé dans l\'éditeur ressort comme vrai champ, avec sa taille de police', async ({ app, page }) => {
  await app.ouvrir('formulaire.pdf', pdfTexte(['Nom :', 'Prénom :']));
  await app.vue('organiser');
  await page.dblclick('#pages .tile:nth-child(1)');
  await page.waitForSelector('.editor', { state: 'visible', timeout: 30000 });
  await page.click('.ed-tool[data-tool="champ"]');
  const f = await page.locator('.ed-sheet').boundingBox();
  await page.mouse.move(f.x + f.width * 0.25, f.y + f.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(f.x + f.width * 0.7, f.y + f.height * 0.25, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.editor', { state: 'hidden', timeout: 20000 });
  const { octets } = await app.exporter();
  const s = fluxDecompresses(octets);
  expect(s, 'un champ texte existe dans le fichier').toMatch(/\/FT\s*\/Tx/);
  expect(s, 'sa police et sa taille sont définies (/DA)').toMatch(/\/DA\s*\([^)]*Tf/);
  const annots = await annotationsDuPdf(page, octets);
  expect(annots[0].some((a) => a.type === 'Widget'), 'le champ est un widget que les lecteurs affichent').toBe(true);
});

test('un caractère que les polices ne savent pas écrire est signalé avant l\'export, nommément', async ({ app, page }) => {
  await app.ouvrir('formulaire.pdf', pdfTexte(['Nom :']));
  // Un filigrane portant « Milošević » : le « ć » n'est pas dans WinAnsi.
  await app.outil('watermark');
  await page.fill('#wm-text', 'Milošević');
  await page.locator('.dialog').getByRole('button', { name: 'Appliquer' }).click();
  let telecharge = false;
  page.on('download', () => { telecharge = true; });
  await page.click('#btn-export');
  await page.waitForSelector('#carac-continuer', { timeout: 30000 });
  await expect(page.locator('.dialog')).toContainText('ć');
  await expect(page.locator('.dialog')).toContainText('Milošević');
  await page.click('#carac-annuler');
  await page.waitForTimeout(800);
  expect(telecharge, 'annuler n\'écrit rien').toBe(false);
  // En connaissance de cause, le fichier part.
  const p = app.recolter(() => page.click('#btn-export'));
  await page.waitForSelector('#carac-continuer', { timeout: 30000 });
  await page.click('#carac-continuer');
  const { octets } = await p;
  expect(octets.length).toBeGreaterThan(100);
});
