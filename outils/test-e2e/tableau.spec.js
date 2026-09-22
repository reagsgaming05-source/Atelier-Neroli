// Point 8 — Copier un tableau vers Excel : les colonnes sont repérées d'après
// les blancs, plusieurs pages se suivent, et les montants deviennent des
// nombres qu'Excel additionne au lieu de textes qu'il aligne à gauche.
const { test, expect, pdfDe } = require('./aide');

const ligne = (y, a, b, c) => [
  { x: 70, y, texte: a }, { x: 300, y, texte: b }, { x: 430, y, texte: c },
];
const facture = () => pdfDe([
  [...ligne(760, 'Libellé', 'Quantité', 'Montant'),
    ...ligne(730, 'Transport scolaire', '12', "1'240.50"),
    ...ligne(700, 'Repas', '45', 'CHF 540.-')],
  [...ligne(760, 'Fournitures', '7', "89.90"),
    ...ligne(730, 'Total', '', "1'870.40")],
]);

test('les colonnes du tableau sont repérées', async ({ app, page }) => {
  await app.ouvrir('facture.pdf', facture());
  await app.outil('tableau');
  await expect(page.locator('.apercu-tableau table tr')).toHaveCount(3);
  const premiere = page.locator('.apercu-tableau table tr').first().locator('td');
  await expect(premiere).toHaveCount(3);
  await expect(premiere.nth(0)).toHaveText('Libellé');
  await expect(premiere.nth(2)).toHaveText('Montant');
});

test('tout le document d\'un coup : les lignes des deux pages se suivent', async ({ app, page }) => {
  await app.ouvrir('facture.pdf', facture());
  await app.outil('tableau');
  await page.selectOption('#tb-page', 'tout');
  await expect(page.locator('.apercu-tableau table tr')).toHaveCount(5);
  await expect(page.locator('.dialog')).toContainText('sur 2 pages');
  await expect(page.locator('.apercu-tableau table tr').last()).toContainText('Total');
});

test('les montants deviennent des nombres, monnaie et apostrophes retirées', async ({ app, page }) => {
  await app.ouvrir('facture.pdf', facture());
  await app.outil('tableau');
  await page.selectOption('#tb-decimale', '.');
  const montants = page.locator('.apercu-tableau table tr td:nth-child(3)');
  await expect(montants.nth(1)).toHaveText('1240.50');
  await expect(montants.nth(2)).toHaveText('540.00');
  // Un nombre est aligné à droite : c'est le repère visuel de la conversion.
  await expect(montants.nth(1)).toHaveClass(/nombre/);
});

test('le séparateur décimal se choisit', async ({ app, page }) => {
  await app.ouvrir('facture.pdf', facture());
  await app.outil('tableau');
  await page.selectOption('#tb-decimale', ',');
  await expect(page.locator('.apercu-tableau table tr td:nth-child(3)').nth(1)).toHaveText('1240,50');
});

test('sans la conversion, les montants restent tels qu\'écrits', async ({ app, page }) => {
  await app.ouvrir('facture.pdf', facture());
  await app.outil('tableau');
  await page.uncheck('#tb-nombres');
  await expect(page.locator('.apercu-tableau table tr td:nth-child(3)').nth(1)).toHaveText("1'240.50");
});

test('le CSV enregistré s\'ouvre dans Excel : point-virgule et BOM', async ({ app, page }) => {
  await app.ouvrir('facture.pdf', facture());
  await app.outil('tableau');
  await page.selectOption('#tb-page', 'tout');
  await page.selectOption('#tb-decimale', '.');
  const { nom, octets } = await app.recolter(() =>
    page.locator('.dialog .dlg-foot .tb-btn', { hasText: 'Enregistrer en CSV' }).click());
  expect(nom).toMatch(/\.csv$/);
  const texte = octets.toString('utf8');
  expect(texte.charCodeAt(0), 'le BOM, sans quoi Excel casse les accents').toBe(0xFEFF);
  expect(texte).toContain('Libellé;Quantité;Montant');
  expect(texte).toContain('1240.50');
});

test('une page sans texte le dit au lieu de rendre un tableau vide', async ({ app, page }) => {
  await app.ouvrir('vide.pdf', require('./aide').pdfVide(1));
  await app.outil('tableau');
  await expect(page.locator('.dialog')).toContainText('Aucun texte');
  await expect(page.locator('.apercu-tableau table')).toHaveCount(0);
});
