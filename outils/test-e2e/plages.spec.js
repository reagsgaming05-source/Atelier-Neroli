// Désigner des pages par leurs numéros, et retrouver ses réglages d'un document
// à l'autre. Ce que l'on retape à chaque fois (le texte d'un filigrane, la forme
// d'une numérotation) se garde dans le poste, et rien d'autre.
const { test, expect, pdfDe, compterPages } = require('./aide');

const document = (n) => pdfDe(Array.from({ length: n }, (_, i) => [{ x: 70, y: 760, taille: 14, texte: 'Page ' + (i + 1) }]));

test('« 3-7, 12 » sélectionne six pages dans un document de douze', async ({ app, page }) => {
  await app.ouvrir('douze.pdf', document(12));
  await app.vue('organiser');
  await app.outil('select-plage');
  await page.fill('#sel-plage', '3-7, 12');
  await expect(page.locator('.dialog')).toContainText('6 pages désignées : 3-7, 12');
  await page.locator('.dialog').getByRole('button', { name: 'Sélectionner' }).click();
  await page.waitForFunction(() => document.querySelector('#sel-count').textContent.trim().startsWith('6'));
  const choisies = await page.evaluate(() => Array.from(document.querySelectorAll('#pages .tile'))
    .map((t, i) => (t.classList.contains('selected') || t.getAttribute('aria-selected') === 'true' ? i + 1 : 0)).filter(Boolean));
  expect(choisies).toEqual([3, 4, 5, 6, 7, 12]);
});

test('la désignation dit ce qui ne désigne rien ou n\'est pas compris, et refuse de choisir au hasard', async ({ app, page }) => {
  await app.ouvrir('cinq.pdf', document(5));
  await app.vue('organiser');
  await app.outil('select-plage');
  await page.fill('#sel-plage', '9-12, abc');
  await expect(page.locator('.dialog')).toContainText('Aucune page désignée');
  await expect(page.locator('.dialog')).toContainText('Hors du document (5 pages) : 9-12');
  await expect(page.locator('.dialog')).toContainText('Non compris : abc');
  await page.locator('.dialog').getByRole('button', { name: 'Sélectionner' }).click();
  await expect(page.locator('#toast')).toContainText('ne désigne aucune page');
  await expect(page.locator('#selbar')).toBeHidden();
});

test('à l\'impression, des pages hors du document ne ramènent rien ; des pages valides sont les seules écrites', async ({ app, page }) => {
  await app.ouvrir('cinq.pdf', document(5));
  await page.keyboard.press('Control+p');
  await page.waitForSelector('#imp-quoi', { state: 'visible' });
  await page.click('#imp-quoi button[data-value="plage"]');
  await page.fill('#imp-plage', '9-12');
  let telecharge = false;
  page.on('download', () => { telecharge = true; });
  await page.locator('.dialog').getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('#toast')).toContainText('ne désigne aucune page');
  await page.waitForTimeout(500);
  expect(telecharge, 'rien n\'est écrit').toBe(false);
  await page.fill('#imp-plage', '2-3, 5');
  const { octets } = await app.recolter(() => page.locator('.dialog').getByRole('button', { name: 'Enregistrer' }).click());
  expect(compterPages(octets), 'trois pages : la 2, la 3, la 5').toBe(3);
});

test('le filigrane posé une fois est repris au document suivant, et « Réglages d\'origine » l\'oublie', async ({ app, page }) => {
  await app.ouvrir('un.pdf', document(2));
  await app.outil('watermark');
  await expect(page.locator('#wm-text')).toHaveValue('CONFIDENTIEL');
  await page.fill('#wm-text', 'DOSSIER 2026');
  await page.fill('#wm-size', '42');
  await page.locator('.dialog').getByRole('button', { name: 'Appliquer' }).click();
  await page.waitForSelector('.dialog', { state: 'detached' });

  // Un autre document, sans filigrane : le réglage revient, et le dit.
  await page.reload();
  await page.waitForSelector('#app-toolbar', { state: 'visible' });
  await app.pretAvecExemple();
  await app.outil('watermark');
  await expect(page.locator('#wm-text')).toHaveValue('DOSSIER 2026');
  await expect(page.locator('#wm-size')).toHaveValue('42');
  await expect(page.locator('.dialog')).toContainText('Réglage repris du dernier filigrane appliqué');

  await page.locator('.dialog').getByRole('button', { name: 'Réglages d\'origine' }).click();
  await expect(page.locator('#wm-text')).toHaveValue('CONFIDENTIEL');
  await expect(page.locator('.dialog')).not.toContainText('Réglage repris');
});

test('la numérotation se souvient de sa forme, jamais du premier numéro, et en-tête et numérotation sont séparés', async ({ app, page }) => {
  await app.ouvrir('un.pdf', document(3));
  await app.outil('number');
  await page.fill('#st-fc', 'Page {p} sur {n}');
  await page.fill('#st-start', '5');
  await page.locator('.dialog').getByRole('button', { name: 'Appliquer' }).click();
  await page.waitForSelector('.dialog', { state: 'detached' });

  await page.reload();
  await page.waitForSelector('#app-toolbar', { state: 'visible' });
  await app.pretAvecExemple();
  await app.outil('number');
  await expect(page.locator('#st-fc')).toHaveValue('Page {p} sur {n}');
  await expect(page.locator('#st-start'), 'le premier numéro repart de 1').toHaveValue('1');
  await page.locator('.dialog .dlg-head .x').click();
  await page.waitForSelector('.dialog', { state: 'detached' });

  // L'en-tête a sa propre mémoire : la numérotation ne la remplit pas.
  await app.outil('stamp');
  await expect(page.locator('#st-fc')).toHaveValue('');
});
