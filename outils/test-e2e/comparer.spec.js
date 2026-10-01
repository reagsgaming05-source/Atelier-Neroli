// La comparaison de deux versions : jamais couverte jusqu'ici. Deux versions d'une décision, dont une page
// modifiée et une page ajoutée : la comparaison dit lesquelles diffèrent, surligne les mots retirés et ajoutés,
// et reconnaît deux versions identiques.
const { test, expect, pdfDe } = require('./aide');

const ligne = (texte, y) => ({ x: 70, y: y || 700, taille: 14, texte });
const versionUn = () => pdfDe([
  [ligne('Le conseil approuve le budget de 1200 francs'), ligne('Les comptes sont deposes', 670)],
  [ligne('Annexe unique sans aucun changement')],
]);
const versionDeux = () => pdfDe([
  [ligne('Le conseil refuse le budget de 1500 francs'), ligne('Les comptes sont deposes', 670)],
  [ligne('Annexe unique sans aucun changement')],
  [ligne('Page ajoutee apres coup')],
]);

async function comparer(app, page, a, b) {
  await app.ouvrir('decision-v1.pdf', a);
  await app.ouvrir('decision-v2.pdf', b);
  await app.outil('comparer');
  // A est la première version, B la seconde
  await page.selectOption('#cmp-a', { label: 'decision-v1.pdf' });
  await page.selectOption('#cmp-b', { label: 'decision-v2.pdf' });
  await page.locator('.dialog').getByRole('button', { name: 'Comparer' }).click();
}

test('deux versions : les pages qui diffèrent, et les mots retirés et ajoutés', async ({ app, page }) => {
  await comparer(app, page, versionUn(), versionDeux());
  await page.waitForSelector('.cmp-chiffres', { timeout: 60000 });
  // la première page diffère : quatre mots changent (approuve / refuse, 1200 / 1500)
  const retires = await page.locator('.cmp-texte .diff-del').allTextContents();
  const ajoutes = await page.locator('.cmp-texte .diff-add').allTextContents();
  expect(retires.join(' ')).toContain('approuve');
  expect(retires.join(' ')).toContain('1200');
  expect(ajoutes.join(' ')).toContain('refuse');
  expect(ajoutes.join(' ')).toContain('1500');
  expect(retires.join(' ')).not.toContain('conseil');
  await expect(page.locator('.cmp-chiffres')).toContainText('2 mots retirés, 2 mots ajoutés');
  // le résumé : deux pages diffèrent sur trois (la première, et la page ajoutée)
  await expect(page.locator('.dialog')).toContainText('2 pages diffèrent sur 3');
  // Suivant va à la page ajoutée, que la première version n'a pas
  await page.locator('.dialog').getByRole('button', { name: /Suivant|›/ }).first().click();
  await expect(page.locator('.dialog')).toContainText('page absente');
});

test('deux versions identiques : aucune différence de texte', async ({ app, page }) => {
  await comparer(app, page, versionUn(), versionUn());
  await page.waitForSelector('.cmp-chiffres', { timeout: 60000 });
  await expect(page.locator('.dialog')).toContainText('Aucune différence de texte');
  await expect(page.locator('.cmp-texte .diff-del')).toHaveCount(0);
  await expect(page.locator('.cmp-texte .diff-add')).toHaveCount(0);
});

test('choisir deux fois la même version est refusé', async ({ app, page }) => {
  await app.ouvrir('decision-v1.pdf', versionUn());
  await app.ouvrir('decision-v2.pdf', versionDeux());
  await app.outil('comparer');
  await page.selectOption('#cmp-a', { label: 'decision-v1.pdf' });
  await page.selectOption('#cmp-b', { label: 'decision-v1.pdf' });
  await page.locator('.dialog').getByRole('button', { name: 'Comparer' }).click();
  await expect(page.locator('#toast')).toContainText('deux versions différentes');
});
