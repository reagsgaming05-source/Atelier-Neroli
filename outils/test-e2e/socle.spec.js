// Le socle : l'application démarre sans réseau, ouvre un document, range ses
// pages, et rend un PDF qui vaut ce qu'on voit à l'écran.
const { test, expect, pdfVide, pdfTexte, compterPages, compterTournees, estUnPdf, texteDuFlux } = require('./aide');

test('la page hors ligne démarre sans réseau et charge son exemple', async ({ app, page }) => {
  await app.pretAvecExemple();
  expect(await app.nbPages()).toBe(6);
  await expect(page.locator('#doc-list .doc-name')).toHaveCount(1);
  await expect(page.locator('#doc-list .badge')).toHaveText('Exemple');
  // Hors ligne veut dire hors ligne : rien n'est allé chercher un script.
  const dehors = await page.evaluate(() => performance.getEntriesByType('resource')
    .map((r) => r.name).filter((n) => /^https?:/.test(n)));
  expect(dehors, 'aucune ressource distante').toEqual([]);
});

test('on ouvre son document : il prend la place de l\'exemple', async ({ app, page }) => {
  await app.pretAvecExemple();
  await app.ouvrir('rapport.pdf', pdfVide(3));
  expect(await app.nbPages()).toBe(3);
  await expect(page.locator('#doc-list .doc-name')).toHaveCount(1);
  await expect(page.locator('#doc-list .doc-name')).toContainText('rapport.pdf');
  expect(await app.estModifie(), 'ouvrir un document ne le marque pas modifié').toBe(false);
});

test('Lire et Organiser montrent le même document', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(4));
  await expect(page.locator('#lecture .feuille-vue')).toHaveCount(4);
  await app.vue('organiser');
  await expect(page.locator('#pages .tile')).toHaveCount(4);
  await expect(page.locator('#lecture')).toBeHidden();
  await app.vue('lecture');
  await expect(page.locator('#pages')).toBeHidden();
});

test('pivoter une page, puis annuler et rétablir', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(3));
  await app.vue('organiser');
  await app.selectionner(1);
  await page.click('#sel-rot-right');
  await expect(page.locator('#pages .tile:nth-child(1) .flag')).toHaveText('90°');
  expect(await app.estModifie()).toBe(true);

  await page.click('#btn-undo');
  await expect(page.locator('#pages .tile:nth-child(1) .flag')).toHaveCount(0);
  await page.click('#btn-redo');
  await expect(page.locator('#pages .tile:nth-child(1) .flag')).toHaveText('90°');
});

test('retirer des pages, puis les récupérer avec Ctrl+Z', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(5));
  await app.vue('organiser');
  await app.selectionner(2, 4);
  await page.click('#sel-delete');
  await expect(page.locator('#pages .tile')).toHaveCount(3);
  expect(await app.dernier()).toContain('2 pages retirées');
  await page.click('#btn-undo');
  await expect(page.locator('#pages .tile')).toHaveCount(5);
});

test('déplacer une page par son numéro', async ({ app, page }) => {
  // Trois pages reconnaissables à leur texte.
  const doc = [[{ x: 70, y: 700, taille: 24, texte: 'ALPHA' }],
    [{ x: 70, y: 700, taille: 24, texte: 'BRAVO' }],
    [{ x: 70, y: 700, taille: 24, texte: 'CHARLIE' }]];
  await app.ouvrir('trois.pdf', require('./aide').pdfDe(doc));
  await app.vue('organiser');
  const champ = page.locator('#pages .tile:nth-child(3) .pos');
  await champ.click();
  await champ.fill('1');
  await champ.press('Enter');
  await expect(page.locator('#pages .tile:nth-child(1) .src-label span')).toContainText('p. 3');

  const { octets } = await app.exporter();
  expect(estUnPdf(octets)).toBe(true);
  expect(compterPages(octets)).toBe(3);
  // La page déplacée est bien la première du fichier produit.
  expect(texteDuFlux(octets).indexOf('CHARLIE')).toBeLessThan(texteDuFlux(octets).indexOf('ALPHA'));
});

test('le PDF exporté porte les rotations et le bon nombre de pages', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(4));
  await app.vue('organiser');
  await app.selectionner(2);
  await page.click('#sel-rot-right');
  const { nom, octets } = await app.exporter();
  expect(nom).toMatch(/\.pdf$/);
  expect(estUnPdf(octets)).toBe(true);
  expect(compterPages(octets)).toBe(4);
  expect(compterTournees(octets, 90)).toBe(1);
});

test('extraire la sélection donne un PDF à part, sans toucher au document', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(5));
  await app.vue('organiser');
  await app.selectionner(2, 3);
  const { octets } = await app.recolter(() => page.click('#sel-extract'));
  expect(compterPages(octets)).toBe(2);
  await expect(page.locator('#pages .tile')).toHaveCount(5);
});

test('le texte de la page part dans le PDF tel qu\'il était', async ({ app }) => {
  await app.ouvrir('lettre.pdf', pdfTexte(['Commune de Blonay', 'Décompte 2026', 'Montant : 1240.00']));
  const { octets } = await app.exporter();
  const texte = texteDuFlux(octets);
  expect(texte).toContain('Commune de Blonay');
  expect(texte).toContain('Montant : 1240.00');
});
