// Point 6 — Les liens internes suivent les pages quand on réorganise, et les
// commentaires déjà présents dans un PDF reçu se listent et se retirent.
// Point 5 — Une opération longue s'interrompt, et ce qui a été contourné est
// noté dans le journal.
const { test, expect, pdfDe, pdfVide, annotationsDuPdf, liensDuPdf, textesDuPdf } = require('./aide');

// Trois pages, et sur la première un renvoi « voir page 3 ».
const docAvecLien = () => pdfDe([
  { morceaux: [{ x: 70, y: 700, taille: 18, texte: 'ALPHA — voir page 3' }],
    annots: (refs) => ['<< /Type /Annot /Subtype /Link /Rect [70 690 300 715] /Border [0 0 0] /Dest [' + refs[2] + ' 0 R /Fit] >>'] },
  [{ x: 70, y: 700, taille: 18, texte: 'BRAVO' }],
  [{ x: 70, y: 700, taille: 18, texte: 'CHARLIE' }],
]);

test('un lien interne vise toujours la bonne page après réorganisation', async ({ app, page }) => {
  await app.ouvrir('renvoi.pdf', docAvecLien());
  await app.vue('organiser');
  // CHARLIE passe en tête : le renvoi doit le suivre, pas garder « page 3 ».
  const champ = page.locator('#pages .tile:nth-child(3) .pos');
  await champ.click();
  await champ.fill('1');
  await champ.press('Enter');
  await expect(page.locator('#pages .tile:nth-child(1) .src-label span')).toContainText('p. 3');

  const { octets } = await app.exporter();
  const liens = await liensDuPdf(page, octets);
  expect(liens, 'le lien est toujours là').toHaveLength(1);
  const pages = await textesDuPdf(page, octets);
  expect(pages[liens[0].vers - 1], 'il mène à la page qui porte CHARLIE').toContain('CHARLIE');
});

test('un lien vers une page retirée ne mène plus nulle part', async ({ app, page }) => {
  await app.ouvrir('renvoi.pdf', docAvecLien());
  await app.vue('organiser');
  await app.selectionner(3);
  await page.click('#sel-delete');
  await expect(page.locator('#pages .tile')).toHaveCount(2);
  const { octets } = await app.exporter();
  // Plutôt qu'un lien qui envoie n'importe où, il est retiré.
  expect(await liensDuPdf(page, octets)).toHaveLength(0);
});

// Un PDF reçu avec la note d'un relecteur.
const docCommente = () => pdfDe([
  { morceaux: [{ x: 70, y: 700, texte: 'Projet de règlement' }],
    annots: ['<< /Type /Annot /Subtype /Text /Rect [400 700 420 720] /Contents (Merci de vérifier ce montant) /T (Relecteur) /M (D:20260101120000Z) >>'] },
  [{ x: 70, y: 700, texte: 'Article premier' }],
]);

test('les commentaires d\'un PDF reçu sont listés', async ({ app, page }) => {
  await app.ouvrir('recu.pdf', docCommente());
  await app.outil('commentaires');
  await expect(page.locator('.dialog')).toContainText('1 commentaire');
  await expect(page.locator('.dialog .list-item')).toContainText('Relecteur');
  await expect(page.locator('.dialog .list-item')).toContainText('Merci de vérifier ce montant');
});

test('les commentaires retirés ne sont plus dans le PDF exporté', async ({ app, page }) => {
  await app.ouvrir('recu.pdf', docCommente());
  const avant = await annotationsDuPdf(page, docCommente());
  expect(avant[0].filter((a) => a.type === 'Text')).toHaveLength(1);

  await app.outil('commentaires');
  await page.locator('.dialog .dlg-foot .tb-btn', { hasText: 'Tout retirer' }).click();
  await page.locator('.dialog .dlg-foot .tb-btn.primary').click();
  await expect.poll(() => app.dernier(), { timeout: 30000 }).toContain('commentaire retiré');

  const { octets } = await app.exporter();
  const apres = await annotationsDuPdf(page, octets);
  expect(apres.flat().filter((a) => a.type === 'Text'), 'la note du relecteur est partie').toHaveLength(0);
  // Le reste du document n'a pas bougé.
  const pages = await textesDuPdf(page, octets);
  expect(pages[0]).toContain('Projet de règlement');
});

test('une opération longue s\'interrompt, et rien n\'est écrit', async ({ app, page }) => {
  await app.ouvrir('gros.pdf', pdfVide(40));
  await app.outil('compress');
  await page.locator('.dialog .dlg-foot .tb-btn.primary').click();
  const annuler = page.locator('#btn-annuler-op');
  await expect(annuler).toBeVisible({ timeout: 30000 });
  // Un téléchargement pendant l'attente signerait une opération allée au bout.
  let ecrit = false;
  page.on('download', () => { ecrit = true; });
  await annuler.click();
  await expect.poll(() => app.dernier(), { timeout: 60000 }).toContain('annulé');
  await expect(annuler).toBeHidden();
  expect(ecrit, 'aucun fichier n\'a été produit').toBe(false);
});

test('le journal recense ce qui a été contourné', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(2));
  // Rien d'anormal : pas de bouton journal.
  await expect(page.locator('#btn-journal')).toBeHidden();
});
