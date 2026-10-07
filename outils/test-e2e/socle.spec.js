// Le socle : l'application démarre sans réseau, ouvre un document, range ses
// pages, et rend un PDF qui vaut ce qu'on voit à l'écran.
const { test, expect, pdfVide, pdfTexte, compterPages, compterTournees, estUnPdf, texteDuFlux } = require('./aide');

test('la page hors ligne démarre sans réseau et charge son exemple', async ({ app, page }) => {
  await app.pretAvecExemple();
  expect(await app.nbPages()).toBe(6);
  await expect(page.locator('#doc-list .doc-name')).toHaveCount(1);
  await expect(page.locator('#doc-list .badge:not(.form)')).toHaveText('Exemple');
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
  expect(await app.dernier()).toContain('2 pages supprimées');
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
  await app.ouvrir('lettre.pdf', pdfTexte(['Commune Exemple', 'Décompte 2026', 'Montant : 1240.00']));
  const { octets } = await app.exporter();
  const texte = texteDuFlux(octets);
  expect(texte).toContain('Commune Exemple');
  expect(texte).toContain('Montant : 1240.00');
});

// Sans document, la barre d'onglets est masquée. Elle sortait alors de la
// grille de l'espace de travail : le panneau de gauche et la table remontaient
// dans la rangée qui se dimensionne au contenu, et s'arrêtaient en plein
// milieu d'une fenêtre haute, laissant une bande vide sous la zone de dépôt.
test('sans document, le panneau et la table descendent jusqu\'en bas', async ({ app, page }) => {
  await app.pretAvecExemple();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.click('#doc-list .doc-rm');
  await expect(page.locator('#dropzone')).toBeVisible();
  await expect(page.locator('#onglets')).toBeHidden();
  const bas = await page.evaluate(() => {
    const b = (s) => Math.round(document.querySelector(s).getBoundingClientRect().bottom);
    return { espace: b('.workspace'), panneau: b('.side'), table: b('#canvas') };
  });
  expect(bas.panneau, 'le panneau va jusqu\'en bas de l\'espace de travail').toBe(bas.espace);
  expect(bas.table, 'la table aussi').toBe(bas.espace);
});

// La barre d'outils se resserrait par paliers de largeur — 1460, 1320, 1080,
// 960 px. Entre deux paliers, rien ne rattrapait : à 1500 px, la taille
// d'ouverture de la fenêtre, elle mesurait 1596 px et « Enregistrer » sortait
// de l'écran. Et elle tenait tant qu'aucun document n'était ouvert, pour
// déborder dès qu'on en ouvrait un, les contrôles de zoom apparaissant.
// On mesure donc à des largeurs choisies entre les anciens paliers.
test('la barre d\'outils tient à toutes les largeurs, document ouvert compris', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(3));
  for (const largeur of [1920, 1600, 1500, 1440, 1366, 1280, 1200, 1100, 1000, 950, 901]) {
    await page.setViewportSize({ width: largeur, height: 820 });
    // La barre se remesure à l'image suivante : on attend deux images, pas un délai.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const etat = await page.evaluate(() => {
      const barre = document.querySelector('#app-toolbar');
      const enregistrer = document.querySelector('#btn-export').getBoundingClientRect();
      return {
        deborde: barre.scrollWidth > barre.clientWidth + 1,
        bordDroit: Math.round(enregistrer.right),
        largeurBouton: Math.round(enregistrer.width),
        ecran: document.documentElement.clientWidth,
      };
    });
    expect(etat.deborde, `la barre déborde à ${largeur} px`).toBe(false);
    expect(etat.largeurBouton, `« Enregistrer » a disparu à ${largeur} px`).toBeGreaterThan(0);
    expect(etat.bordDroit, `« Enregistrer » sort de l'écran à ${largeur} px`).toBeLessThanOrEqual(etat.ecran + 1);
  }
});
