// Des garde-temps : trois opérations qu'une commune fait sur de gros documents, chronométrées, avec un
// plafond large (une machine d'intégration continue est plus lente et moins régulière qu'un poste) qui fait
// échouer la chaîne quand une régression de performance s'y glisse. Les durées mesurées sont écrites dans le
// journal du test, pour qu'on voie de combien on est sous le plafond.
//
// AKTUM_PAGE=chemin/vers/une/autre/page.html permet de comparer deux versions sur le même scénario.
const { test, expect, pdfDe, textesDuPdf } = require('./aide');

// Un document de n pages de texte, où « contrat » revient par[page] fois par page.
const documentDeTexte = (n, parPage) => pdfDe(Array.from({ length: n }, (_, p) => Array.from({ length: parPage + 12 }, (_, l) => ({
  x: 56, y: 790 - l * 17, taille: 10,
  texte: l < parPage ? 'Article ' + (l + 1) + ' du contrat de service numero ' + (p + 1) : 'Considerant que la commune ' + (l - parPage + 1) + ' a decide ce qui suit.',
}))));

const mediane = (l) => l.slice().sort((a, b) => a - b)[Math.floor(l.length / 2)];

test('recherche sur 300 pages : le premier résultat vient vite, « Suivant » répond, rien ne gèle', async ({ app, page }) => {
  test.setTimeout(300000);
  await app.ouvrir('registre.pdf', documentDeTexte(300, 28));
  expect(await app.nbPages()).toBe(300);
  // Les tâches longues du fil principal pendant la recherche.
  await page.evaluate(() => {
    window.__longues = [];
    try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__longues.push(e.duration))).observe({ entryTypes: ['longtask'] }); } catch (_) { /* pas de mesure */ }
  });
  await page.click('#btn-search');
  await expect(page.locator('.dialog.libre')).toBeVisible();
  const t0 = Date.now();
  await page.fill('#se-q', 'contrat');
  await expect.poll(() => page.locator('#se-compte').textContent(), { timeout: 60000 }).not.toBe('');
  const premier = Date.now() - t0;
  await page.waitForSelector('.dialog.libre .list[data-fini="1"]', { timeout: 120000 });
  const fin = Date.now() - t0;
  await expect(page.locator('#se-compte')).toHaveText(/^1 \/ 8400$/);
  // « Suivant » : le temps jusqu'à l'image suivante.
  const suivant = [];
  for (let i = 0; i < 12; i++) {
    suivant.push(await page.evaluate(() => new Promise((r) => {
      const t = performance.now();
      document.querySelector('#se-suiv').click();
      requestAnimationFrame(() => requestAnimationFrame(() => r(performance.now() - t)));
    })));
  }
  const longues = await page.evaluate(() => window.__longues || []);
  const pire = longues.length ? Math.max(...longues) : 0;
  console.log('recherche 300 p / 8 400 occurrences : premier résultat ' + premier + ' ms (dont 260 ms de délai de frappe), complète ' + fin
    + ' ms, « Suivant » ' + Math.round(mediane(suivant)) + ' ms (médiane), tâche la plus longue ' + Math.round(pire) + ' ms sur ' + longues.length);
  expect(premier, 'le premier résultat').toBeLessThan(1500);
  expect(fin, 'la recherche complète').toBeLessThan(10000);
  expect(mediane(suivant), '« Suivant »').toBeLessThan(150);
  expect(pire, 'la tâche la plus longue du fil principal').toBeLessThan(400);
  // une deuxième recherche du même terme reprend le texte déjà extrait
  await page.fill('#se-q', '');
  await page.fill('#se-q', 'contrat');
  const t1 = Date.now();
  await expect.poll(() => page.locator('.dialog.libre .list').getAttribute('data-fini'), { timeout: 60000 }).toBe('1');
  await expect(page.locator('#se-compte')).toHaveText(/^1 \/ 8400$/);
  const deuxieme = Date.now() - t1;
  console.log('deuxième recherche du même terme : ' + deuxieme + ' ms');
  expect(deuxieme, 'la deuxième recherche').toBeLessThan(fin);
});

test('export de 100 pages', async ({ app }) => {
  test.setTimeout(300000);
  await app.ouvrir('rapport.pdf', documentDeTexte(100, 20));
  const t0 = Date.now();
  const { octets } = await app.exporter();
  const duree = Date.now() - t0;
  console.log('export de 100 pages : ' + duree + ' ms, ' + octets.length + ' octets');
  expect(octets.slice(0, 5).toString()).toBe('%PDF-');
  expect(duree, 'l\'export de 100 pages').toBeLessThan(15000);
});

test('assemblage d\'un dossier de 10 pièces', async ({ app, page }) => {
  test.setTimeout(300000);
  for (let i = 1; i <= 10; i++) await app.ouvrir('piece-' + i + '.pdf', pdfDe(Array.from({ length: 3 }, (_, p) => [{ x: 70, y: 700, taille: 20, texte: 'Piece ' + i + ' page ' + (p + 1) }])));
  expect(await app.nbPages()).toBe(30);
  await app.outil('dossier');
  await page.fill('#do-titre', 'Dossier de controle');
  const t0 = Date.now();
  await page.click('.dialog .dlg-foot .tb-btn.primary');
  await expect.poll(() => app.dernier(), { timeout: 120000 }).toContain('Dossier constitué');
  const constitue = Date.now() - t0;
  const t1 = Date.now();
  const { octets } = await app.exporter();
  const exporte = Date.now() - t1;
  const pages = await textesDuPdf(page, octets);
  console.log('dossier de 10 pièces : constitué en ' + constitue + ' ms, exporté en ' + exporte + ' ms, ' + pages.length + ' pages');
  expect(pages.length).toBe(1 + 10 + 30);
  expect(constitue, 'la constitution du dossier').toBeLessThan(30000);
  expect(exporte, 'l\'export du dossier').toBeLessThan(30000);
});
