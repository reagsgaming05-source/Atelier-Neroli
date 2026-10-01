// Robustesse : ce qui se passe quand le fichier est mauvais, et quand on renonce en route.
//  - un fichier refusé dit POURQUOI (vide, pas un PDF, incomplet) et ne fait pas disparaître le document d'exemple ;
//  - une opération interrompue — par le bouton, par Échap — n'écrit rien : ni fichier, ni changement dans le document ;
//  - un caviardage interrompu ne laisse aucune marque derrière lui.
const { test, expect, pdfDe, pdfTexte } = require('./aide');

async function deposer(page, nom, octets, type) {
  await page.setInputFiles('#file-input', { name: nom, mimeType: type || 'application/pdf', buffer: octets });
}

const message = (page) => page.locator('#toast');

test('un fichier vide dit qu\'il est vide, et l\'exemple reste ouvert', async ({ app, page }) => {
  await app.pretAvecExemple();
  await deposer(page, 'vide.pdf', Buffer.alloc(0));
  await expect(message(page)).toContainText('est vide');
  await expect(message(page)).toContainText('vide.pdf');
  await expect(message(page)).toHaveClass(/error/);
  expect(await app.nbPages(), 'l\'exemple est toujours là').toBe(6);
});

test('un fichier qui n\'est pas un PDF le dit, et l\'exemple reste ouvert', async ({ app, page }) => {
  await app.pretAvecExemple();
  await deposer(page, 'courrier.pdf', Buffer.from('Ceci est un simple fichier texte, pas un PDF.\n'));
  await expect(message(page)).toContainText('n\'est pas un PDF');
  await expect(message(page)).toContainText('courrier.pdf');
  expect(await app.nbPages()).toBe(6);
});

test('un PDF tronqué dit qu\'il est incomplet ou abîmé, et le journal garde la cause', async ({ app, page }) => {
  await app.pretAvecExemple();
  const entier = pdfDe([[{ x: 70, y: 700, texte: 'Une seule page' }]]);
  // coupé avant la table des références : l'en-tête est bon, le reste manque
  await deposer(page, 'tronque.pdf', entier.subarray(0, 120));
  await expect(message(page)).toContainText('incomplet ou abîmé');
  await expect(message(page)).toContainText('tronque.pdf');
  expect(await app.nbPages()).toBe(6);
  // la cause technique n'est pas perdue : elle est au journal, pour le support
  await expect(page.locator('#btn-journal')).toBeVisible();
});

test('un bon fichier ouvert après un refus remplace l\'exemple comme d\'habitude', async ({ app, page }) => {
  await app.pretAvecExemple();
  await deposer(page, 'vide.pdf', Buffer.alloc(0));
  await expect(message(page)).toContainText('est vide');
  await app.ouvrir('bon.pdf', pdfTexte(['Un vrai document']));
  expect(await app.nbPages()).toBe(1);
  await expect(page.locator('#doc-list .doc-name')).toHaveCount(1);
});

// Un classeur assez long pour que l'opération n'ait pas fini quand on demande l'arrêt.
const longDossier = (n) => pdfDe(Array.from({ length: n }, (_, i) => [
  { x: 70, y: 760, taille: 14, texte: 'Page ' + (i + 1) + ' du dossier' },
  { x: 70, y: 720, texte: 'Requérant : Kalliope Vasilakis' },
]));

test('Échap interrompt une opération longue : aucun fichier, document inchangé', async ({ app, page }) => {
  await app.ouvrir('gros.pdf', pdfDe(Array.from({ length: 40 }, () => [])));
  await app.outil('compress');
  await page.locator('.dialog .dlg-foot .tb-btn.primary').click();
  const annuler = page.locator('#btn-annuler-op');
  await expect(annuler).toBeVisible({ timeout: 30000 });
  let ecrit = false;
  page.on('download', () => { ecrit = true; });
  await page.keyboard.press('Escape');
  await expect(annuler).toContainText('Arrêt', { timeout: 10000 }).catch(() => {});   // le bouton passe par « Arrêt… » : trop bref pour toujours se voir
  await expect.poll(() => app.dernier(), { timeout: 60000 }).toContain('annulé');
  await expect(annuler).toBeHidden();
  expect(ecrit, 'aucun fichier n\'a été produit').toBe(false);
  expect(await app.nbPages(), 'le document est tel qu\'il était').toBe(40);
  expect(await app.estModifie(), 'et il n\'est pas marqué modifié').toBe(false);
});

test('un caviardage interrompu ne laisse aucune marque derrière lui', async ({ app, page }) => {
  test.setTimeout(240000);
  await app.ouvrir('dossier.pdf', longDossier(600));
  await page.click('#btn-search');
  await page.fill('#se-q', 'Vasilakis');
  await expect.poll(() => page.locator('#se-compte').textContent(), { timeout: 120000 }).not.toBe('');
  await page.click('#se-caviarder');
  await page.click('#se-caviarder-oui');
  const annuler = page.locator('#btn-annuler-op');
  await expect(annuler).toBeVisible({ timeout: 30000 });
  await annuler.click();
  await expect(message(page)).toContainText('Caviardage annulé', { timeout: 60000 });
  await expect(message(page)).toContainText('rien n\'a été changé');
  expect(await app.estModifie(), 'le document n\'est pas marqué modifié').toBe(false);
  await app.vue('organiser');
  await expect(page.locator('#pages .tile .flag.ann'), 'aucune marque de caviardage n\'a été posée').toHaveCount(0);
});
