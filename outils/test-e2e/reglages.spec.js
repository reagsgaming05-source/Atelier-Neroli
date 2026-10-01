// Les réglages posés sur le document (chapitre 03 de l'audit) :
//  - le filigrane, l'en-tête et le pied de page montrent leur effet sur la page, avant l'export ;
//  - ils se posent sur toutes les pages ou sur une plage (« 2 », « 3-7, 12 »), la même lecture que partout ;
//  - « Commentaires du document » et « Détecter les pages vides » sont des volets : on garde la main sur le document.
const { test, expect, pdfDe, pdfVide, textesDuPdf } = require('./aide');

test.use({ viewport: { width: 1280, height: 860 } });

const troisPages = () => pdfDe([
  [{ x: 70, y: 760, taille: 12, texte: 'Premiere page' }],
  [{ x: 70, y: 760, taille: 12, texte: 'Deuxieme page' }],
  [{ x: 70, y: 760, taille: 12, texte: 'Troisieme page' }],
]);

async function ouvrirLeDocument(app, page) {
  await app.pretAvecExemple();
  await app.ouvrir('trois.pdf', troisPages());
}

test.describe('l\'aperçu des réglages', () => {
  test('le filigrane se voit sur la page, et suit ce qu\'on tape', async ({ app, page }) => {
    await ouvrirLeDocument(app, page);
    await app.outil('watermark');
    await expect(page.locator('.apercu-reglage')).toBeVisible();
    await expect(page.locator('.apercu-texte')).toHaveText('CONFIDENTIEL');
    await page.fill('#wm-text', 'COPIE');
    await expect(page.locator('.apercu-texte')).toHaveText('COPIE');
    await page.selectOption('#wm-mode', 'tile');
    expect(await page.locator('.apercu-texte').count(), 'la mosaïque répète le texte').toBeGreaterThan(4);
    // la plage fait disparaître l'aperçu quand la page affichée n'est pas visée
    await page.fill('#wm-pages', '2');
    await expect(page.locator('.apercu-texte')).toHaveCount(0);
    await page.fill('#wm-pages', '1');
    await expect(page.locator('.apercu-texte').first()).toBeVisible();
  });

  test('l\'en-tête et le pied de page montrent leurs six zones, avec les codes remplacés', async ({ app, page }) => {
    await ouvrirLeDocument(app, page);
    await app.outil('stamp');
    await page.fill('#st-hl', 'Commune');
    await page.fill('#st-fc', 'Page {p} sur {n}');
    await expect(page.locator('.apercu-texte')).toHaveCount(2);
    await expect(page.locator('.apercu-texte').nth(1)).toHaveText('Page 1 sur 3');
    await page.check('#st-skip');
    await expect(page.locator('.apercu-texte')).toHaveCount(0);
  });
});

test.describe('les pages visées', () => {
  test('un filigrane sur la page 2 seulement : l\'export ne le porte que là', async ({ app, page }) => {
    await ouvrirLeDocument(app, page);
    await app.outil('watermark');
    await page.fill('#wm-text', 'COPIE');
    await page.fill('#wm-pages', '2');
    await page.getByRole('button', { name: 'Appliquer' }).click();
    const { octets } = await app.exporter();
    const textes = await textesDuPdf(page, octets);
    expect(textes[0]).not.toContain('COPIE');
    expect(textes[1]).toContain('COPIE');
    expect(textes[2]).not.toContain('COPIE');
  });

  test('un pied de page sur les pages 1 et 3, numérotées comme dans le document', async ({ app, page }) => {
    await ouvrirLeDocument(app, page);
    await app.outil('number');
    await page.fill('#st-pages', '1, 3');
    await page.getByRole('button', { name: 'Appliquer' }).click();
    const { octets } = await app.exporter();
    const textes = await textesDuPdf(page, octets);
    expect(textes[0]).toContain('1 / 3');
    expect(textes[1]).not.toMatch(/\d \/ 3/);
    expect(textes[2]).toContain('3 / 3');
  });

  test('une plage incomprise ou qui ne désigne rien est refusée, et la fenêtre reste ouverte', async ({ app, page }) => {
    await ouvrirLeDocument(app, page);
    await app.outil('watermark');
    await page.fill('#wm-pages', '2-x');
    await page.getByRole('button', { name: 'Appliquer' }).click();
    await expect(page.locator('#toast')).toContainText('Plage de pages non comprise');
    await expect(page.locator('.dialog')).toBeVisible();
    await page.fill('#wm-pages', '40');
    await page.getByRole('button', { name: 'Appliquer' }).click();
    await expect(page.locator('#toast')).toContainText('ne désigne aucune page');
    await expect(page.locator('.dialog')).toBeVisible();
  });

  test('les pages visées ne suivent pas d\'un document au suivant', async ({ app, page }) => {
    await ouvrirLeDocument(app, page);
    await app.outil('watermark');
    await page.fill('#wm-pages', '2');
    await page.getByRole('button', { name: 'Appliquer' }).click();
    // un autre document, dans un autre onglet : le réglage mémorisé revient, sans la plage
    await page.click('#onglet-plus');
    await app.ouvrir('autre.pdf', pdfVide(2));
    await page.click('#tab-tools');
    await page.click('[data-tool="watermark"]');
    await expect(page.locator('#wm-text')).toHaveValue('CONFIDENTIEL');
    await expect(page.locator('#wm-pages')).toHaveValue('');
  });
});

test.describe('des volets, pas des fenêtres', () => {
  test('« Détecter les pages vides » laisse la main sur le document', async ({ app, page }) => {
    await app.pretAvecExemple();
    await app.ouvrir('vides.pdf', pdfDe([[{ x: 70, y: 760, taille: 12, texte: 'Texte' }], [], [{ x: 70, y: 760, taille: 12, texte: 'Texte' }], []]));
    await app.outil('vides');
    await expect(page.locator('.dialog.libre')).toBeVisible();
    // le document derrière reste utilisable : on bascule en vue Organiser sans fermer le volet
    await page.click('.vue-mode[data-vue="organiser"]');
    await expect(page.locator('.vue-mode[data-vue="organiser"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.dialog.libre')).toBeVisible();
  });

  test('« Commentaires du document » est un volet', async ({ app, page }) => {
    await app.pretAvecExemple();
    await app.outil('commentaires');
    await expect(page.locator('.dialog.libre')).toBeVisible();
    await page.click('.vue-mode[data-vue="organiser"]');
    await expect(page.locator('.dialog.libre')).toBeVisible();
  });
});

test.describe('les configurations nommées', () => {
  test('un filigrane se range sous un nom, se rappelle dans un autre document, se supprime', async ({ app, page }) => {
    await ouvrirLeDocument(app, page);
    await app.outil('watermark');
    await expect(page.locator('#cfg-filigrane')).toBeDisabled();       // aucune encore
    await page.fill('#wm-text', 'BROUILLON');
    await page.fill('#wm-size', '80');
    await page.fill('#cfg-nom-filigrane', 'Brouillon');
    await page.locator('.configs').getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.locator('#cfg-filigrane')).toHaveValue('Brouillon');
    await page.locator('.dlg-foot').getByRole('button', { name: 'Annuler' }).click();
    // un autre onglet, un autre document : la configuration est là, et remet les champs
    await page.click('#onglet-plus');
    await app.ouvrir('autre.pdf', pdfVide(2));
    await app.outil('watermark');
    await page.fill('#wm-text', 'AUTRE CHOSE');
    await page.selectOption('#cfg-filigrane', 'Brouillon');
    await expect(page.locator('#wm-text')).toHaveValue('BROUILLON');
    await expect(page.locator('#wm-size')).toHaveValue('80');
    await expect(page.locator('.apercu-texte')).toHaveText('BROUILLON');
    // supprimer
    await page.locator('.configs').getByRole('button', { name: 'Supprimer la configuration' }).click();
    await expect(page.locator('#cfg-filigrane')).toBeDisabled();
    expect(await page.evaluate(() => localStorage.getItem('aktum-configs-filigrane'))).toBeNull();
  });

  test('« Oublier » dans les préférences vide aussi les configurations', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.evaluate(() => localStorage.setItem('aktum-configs-entete', JSON.stringify([{ nom: 'Courrier', valeurs: { hl: 'Commune' } }])));
    await page.keyboard.press('Control+,');
    await page.getByRole('button', { name: 'Oublier : Configurations enregistrées' }).click();
    expect(await page.evaluate(() => localStorage.getItem('aktum-configs-entete'))).toBeNull();
  });
});

test.describe('la barre de sélection', () => {
  test('« Pages » prend une plage ; la sélection rapide prend les impaires, les paires, l\'inverse', async ({ app, page }) => {
    await app.pretAvecExemple();
    await app.vue('organiser');
    await app.selectionner(1);
    const selection = () => page.evaluate(() => Array.from(document.querySelectorAll('#pages .tile.selected')).map((t) => Array.from(t.parentElement.children).indexOf(t) + 1));
    await page.fill('#sel-plage', '2-4');
    await page.press('#sel-plage', 'Enter');
    expect(await selection()).toEqual([2, 3, 4]);
    await page.selectOption('#sel-rapide', 'impaires');
    expect(await selection()).toEqual([1, 3, 5]);
    await page.selectOption('#sel-rapide', 'paires');
    expect(await selection()).toEqual([2, 4, 6]);
    await page.selectOption('#sel-rapide', 'inverser');
    expect(await selection()).toEqual([1, 3, 5]);
    await page.selectOption('#sel-rapide', 'tout');
    expect(await selection()).toEqual([1, 2, 3, 4, 5, 6]);
    // une plage incomprise ne change rien et le dit
    await page.fill('#sel-plage', '2-x');
    await page.press('#sel-plage', 'Enter');
    await expect(page.locator('#toast')).toContainText('Plage de pages non comprise');
    expect(await selection()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
