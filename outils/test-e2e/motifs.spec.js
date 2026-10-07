// Caviarder par modèle : le téléphone, l'IBAN ou le numéro AVS se trouvent et se noircissent sans qu'on en connaisse la valeur.
const { test, expect, pdfDe, texteDuPdf } = require('./aide');

const doc = () => pdfDe([[
  { x: 70, y: 760, taille: 14, texte: 'Dossier de la requérante' },
  { x: 70, y: 730, texte: 'AVS : 756.1234.5678.97' },
  { x: 70, y: 710, texte: 'Téléphone : 021 000 00 00' },
  { x: 70, y: 690, texte: 'IBAN : CH93 0076 2011 6238 5295 7' },
  { x: 70, y: 670, texte: 'Courriel : greffe@commune.example' },
  { x: 70, y: 650, texte: 'Conseil communal, séance ordinaire' },
]]);

test('le modèle « téléphone » trouve le numéro, et le caviarder le retire du fichier', async ({ app, page }) => {
  await app.ouvrir('dossier.pdf', doc());
  await expect.poll(() => app.nbPages()).toBe(1);   // l'exemple, qui porte lui aussi un téléphone, est parti
  await page.keyboard.press('Control+f');
  await page.selectOption('#se-motif', 'telephone');
  await expect.poll(() => page.locator('#se-compte').textContent(), { timeout: 20000 }).toBe('1 / 1');
  await expect(page.locator('#se-q')).toBeDisabled();
  await page.click('#se-caviarder');
  await page.click('#se-caviarder-oui');
  await expect.poll(() => app.dernier(), { timeout: 30000 }).toContain('occurrence caviardée');
  const { octets } = await app.exporter();
  const lu = await texteDuPdf(page, octets);
  expect(lu, 'le numéro a disparu').not.toContain('021 000 00 00');
  expect(lu, 'le reste est là').toContain('Conseil communal');
});

test('les modèles AVS et IBAN trouvent chacun leur numéro et pas les autres', async ({ app, page }) => {
  await app.ouvrir('dossier.pdf', doc());
  await expect.poll(() => app.nbPages()).toBe(1);   // l'exemple, qui porte lui aussi un téléphone, est parti
  await page.keyboard.press('Control+f');
  await page.selectOption('#se-motif', 'avs');
  await expect.poll(() => page.locator('#se-compte').textContent(), { timeout: 20000 }).toBe('1 / 1');
  await expect(page.locator('.list .x mark').first()).toContainText('756.1234.5678.97');
  await page.selectOption('#se-motif', 'iban');
  await expect.poll(() => page.locator('.list .x mark').first().textContent(), { timeout: 20000 }).toContain('CH93');
  await page.selectOption('#se-motif', 'courriel');
  await expect.poll(() => page.locator('.list .x mark').first().textContent(), { timeout: 20000 }).toContain('greffe@commune.example');
});

test('revenir à un mot rend la saisie et ses options', async ({ app, page }) => {
  await app.ouvrir('dossier.pdf', doc());
  await expect.poll(() => app.nbPages()).toBe(1);   // l'exemple, qui porte lui aussi un téléphone, est parti
  await page.keyboard.press('Control+f');
  await page.selectOption('#se-motif', 'avs');
  await expect(page.locator('#se-q')).toBeDisabled();
  await page.selectOption('#se-motif', '');
  await expect(page.locator('#se-q')).toBeEnabled();
  await expect(page.locator('#se-casse')).toBeEnabled();
});
