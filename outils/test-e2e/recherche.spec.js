// Point 7 — Rechercher : le panneau flotte à côté du document, chaque
// occurrence est surlignée sur sa page, Entrée passe à la suivante, et
// « mot entier » ne confond plus « aire » avec « affaire ».
const { test, expect, pdfDe, pdfTexte, texteDuPdf } = require('./aide');

// Un document où le mot cherché revient, seul et à l'intérieur d'un autre mot.
const docAire = () => pdfDe([
  [{ x: 70, y: 760, texte: "L'aire de jeux est ouverte." }, { x: 70, y: 730, texte: "Une affaire classée." }],
  [{ x: 70, y: 760, texte: "L'aire de repos reste fermée." }],
]);

async function chercher(page, terme) {
  await page.click('#btn-search');
  await expect(page.locator('.dialog.libre')).toBeVisible();
  await page.fill('#se-q', terme);
  await expect.poll(() => page.locator('#se-compte').textContent(), { timeout: 30000 }).not.toBe('');
}

test('le panneau flotte : le document reste visible à côté', async ({ app, page }) => {
  await app.ouvrir('aires.pdf', docAire());
  await chercher(page, 'aire');
  await expect(page.locator('.scrim')).toHaveCount(0);      // pas de voile sur le document
  await expect(page.locator('#lecture .feuille-vue').first()).toBeVisible();
});

test('les occurrences sont comptées, listées et surlignées sur la page', async ({ app, page }) => {
  await app.ouvrir('aires.pdf', docAire());
  await chercher(page, 'aire');
  // « aire » seul deux fois, plus celui d'« affaire » : trois.
  await expect(page.locator('#se-compte')).toHaveText('1 / 3');
  await expect(page.locator('.dialog.libre .result')).toHaveCount(2);   // deux pages concernées
  await expect(page.locator('#lecture .feuille-vue .marques i')).toHaveCount(3);
  await expect(page.locator('#lecture .feuille-vue .marques i.courante')).toHaveCount(1);
});

test('« mot entier » ne trouve plus « aire » dans « affaire »', async ({ app, page }) => {
  await app.ouvrir('aires.pdf', docAire());
  await chercher(page, 'aire');
  await expect(page.locator('#se-compte')).toHaveText('1 / 3');
  await page.check('#se-mot');
  await expect(page.locator('#se-compte')).toHaveText('1 / 2');
  await expect(page.locator('#lecture .feuille-vue .marques i')).toHaveCount(2);
});

test('Suivant, Précédent et Entrée passent d\'une occurrence à l\'autre', async ({ app, page }) => {
  await app.ouvrir('aires.pdf', docAire());
  await chercher(page, 'aire');
  await expect(page.locator('#se-compte')).toHaveText('1 / 3');
  await page.click('#se-suiv');
  await expect(page.locator('#se-compte')).toHaveText('2 / 3');
  await page.click('#se-suiv');
  await expect(page.locator('#se-compte')).toHaveText('3 / 3');
  await page.click('#se-suiv');
  await expect(page.locator('#se-compte'), 'après la dernière on revient à la première').toHaveText('1 / 3');
  await page.click('#se-prec');
  await expect(page.locator('#se-compte')).toHaveText('3 / 3');
  // Entrée dans le champ : la suivante ; Maj+Entrée : la précédente.
  await page.click('#se-q');
  await page.keyboard.press('Enter');
  await expect(page.locator('#se-compte')).toHaveText('1 / 3');
  await page.keyboard.press('Shift+Enter');
  await expect(page.locator('#se-compte')).toHaveText('3 / 3');
});

test('la casse se respecte à la demande', async ({ app, page }) => {
  await app.ouvrir('casse.pdf', pdfTexte(['Blonay et blonay', 'BLONAY aussi']));
  await chercher(page, 'Blonay');
  await expect(page.locator('#se-compte')).toHaveText('1 / 3');
  await page.check('#se-casse');
  await expect(page.locator('#se-compte')).toHaveText('1 / 1');
});

test('un terme absent le dit, et n\'allume rien', async ({ app, page }) => {
  await app.ouvrir('aires.pdf', docAire());
  await page.click('#btn-search');
  await page.fill('#se-q', 'zzzz');
  await expect(page.locator('.dialog.libre')).toContainText('Aucun résultat');
  await expect(page.locator('#lecture .feuille-vue .marques i')).toHaveCount(0);
});

test('en refermant le panneau, les surlignages disparaissent', async ({ app, page }) => {
  await app.ouvrir('aires.pdf', docAire());
  await chercher(page, 'aire');
  await expect(page.locator('#lecture .feuille-vue .marques i')).toHaveCount(3);
  await page.click('.dialog.libre .dlg-head .x');
  await expect(page.locator('#lecture .feuille-vue .marques i')).toHaveCount(0);
});

test('remplacer partout corrige le PDF, sans toucher au mot qui contient le terme', async ({ app, page }) => {
  await app.ouvrir('aires.pdf', docAire());
  await chercher(page, 'aire');
  await page.check('#se-mot');                       // « affaire » doit rester intact
  await expect(page.locator('#se-compte')).toHaveText('1 / 2');
  await page.fill('#se-r', 'esplanade');
  await page.click('#se-remplacer');
  await expect.poll(() => app.dernier(), { timeout: 90000 }).toMatch(/remplac/);
  const { octets } = await app.exporter();
  // Relu avec pdf.js : ce que l'utilisateur obtiendrait en copiant-collant.
  const lu = await texteDuPdf(page, octets);
  expect(lu).toContain('esplanade');
  expect(lu, 'le mot qui contenait le terme n\'a pas bougé').toContain('affaire');
});
