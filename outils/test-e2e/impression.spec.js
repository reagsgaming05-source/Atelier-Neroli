// L'impression et sa mise en page : jamais couverte jusqu'ici. « Enregistrer » dans la fenêtre d'impression écrit
// le PDF tel qu'il partirait à l'imprimante — ce qui permet de juger l'imposition sans imprimante : une feuille
// par quatre pages, un livret dont les pages se retrouvent à la reliure, une plage, les pages impaires.
const { test, expect, pdfDe, textesDuPdf, compterPages } = require('./aide');

// Huit pages numérotées « Feuillet 1 » … « Feuillet 8 ».
const huit = () => pdfDe(Array.from({ length: 8 }, (_, i) => [{ x: 70, y: 700, taille: 24, texte: 'Feuillet ' + (i + 1) }]));

async function ouvrirImpression(app, page) {
  await app.ouvrir('registre.pdf', huit());
  await page.click('#btn-print');
  await page.waitForSelector('.dialog', { state: 'visible' });
}
const enregistrerLImpression = (app, page) => app.recolter(() => page.locator('.dialog').getByRole('button', { name: 'Enregistrer' }).click());
const numerosDe = (texte) => Array.from(texte.matchAll(/Feuillet (\d)/g), (m) => Number(m[1]));

test('la mise en page « Livret » : quatre feuilles, les pages se retrouvent à la reliure', async ({ app, page }) => {
  await ouvrirImpression(app, page);
  await page.click('.imp-mode[data-mode="livret"]');
  const { nom, octets } = await enregistrerLImpression(app, page);
  expect(nom).toMatch(/-livret\.pdf$/);
  // 8 pages = 2 feuilles pliées = 4 faces, deux pages par face
  expect(compterPages(octets)).toBe(4);
  const faces = (await textesDuPdf(page, octets)).map(numerosDe);
  // recto/verso de la première feuille (8-1, 2-7), puis de la seconde (6-3, 4-5) : les extrêmes d'abord
  const aplati = faces.flat().sort((a, b) => a - b);
  expect(aplati, 'chaque page figure une fois').toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  expect(faces[0].slice().sort((a, b) => a - b), 'première face : la dernière page et la première').toEqual([1, 8]);
  expect(faces[1].slice().sort((a, b) => a - b), 'verso : la deuxième et l\'avant-dernière').toEqual([2, 7]);
});

test('la mise en page « Multiple » : quatre pages par feuille', async ({ app, page }) => {
  await ouvrirImpression(app, page);
  await page.click('.imp-mode[data-mode="nup"]');
  const { nom, octets } = await enregistrerLImpression(app, page);
  expect(nom).toMatch(/-4-par-feuille\.pdf$/);
  expect(compterPages(octets)).toBe(2);
  const feuilles = (await textesDuPdf(page, octets)).map(numerosDe);
  expect(feuilles[0].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  expect(feuilles[1].sort((a, b) => a - b)).toEqual([5, 6, 7, 8]);
});

test('une plage de pages : seules ces pages partent', async ({ app, page }) => {
  await ouvrirImpression(app, page);
  await page.click('#imp-quoi button[data-value="plage"]');
  await page.fill('#imp-plage', '2-4, 8');
  const { octets } = await enregistrerLImpression(app, page);
  expect(compterPages(octets)).toBe(4);
  expect((await textesDuPdf(page, octets)).map(numerosDe).flat()).toEqual([2, 3, 4, 8]);
});

test('les pages impaires seulement, puis dans l\'ordre inverse', async ({ app, page }) => {
  await ouvrirImpression(app, page);
  await page.selectOption('#imp-faces', 'impaires');
  const { octets } = await enregistrerLImpression(app, page);
  expect((await textesDuPdf(page, octets)).map(numerosDe).flat()).toEqual([1, 3, 5, 7]);
  // la même fenêtre, sans filtre, à l'envers
  await page.click('#btn-print');
  await page.waitForSelector('.dialog', { state: 'visible' });
  await page.check('#imp-inv');
  const inverse = await enregistrerLImpression(app, page);
  expect((await textesDuPdf(page, inverse.octets)).map(numerosDe).flat()).toEqual([8, 7, 6, 5, 4, 3, 2, 1]);
});

test('une plage qui ne désigne aucune page est refusée au lieu de rien imprimer', async ({ app, page }) => {
  await ouvrirImpression(app, page);
  await page.click('#imp-quoi button[data-value="plage"]');
  await page.fill('#imp-plage', '40-50');
  await page.locator('.dialog').getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('#toast')).toContainText('ne désigne aucune page');
  await expect(page.locator('.dialog')).toBeVisible();
});
