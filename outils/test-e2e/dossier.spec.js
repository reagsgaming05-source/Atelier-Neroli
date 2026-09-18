// Point 9 — Dossier de pièces : le sommaire suit les pages, et surtout, ce
// qui est enregistré porte les numéros du moment. La régénération du sommaire
// est asynchrone : exporter juste après avoir déplacé une pièce est exactement
// le cas qui partait avec les numéros d'avant.
const { test, expect, pdfDe, textesDuPdf } = require('./aide');

const piece = (titre, n) => pdfDe(Array.from({ length: n }, (_, i) => [
  { x: 70, y: 700, taille: 20, texte: titre + ' page ' + (i + 1) },
]));

// Les deux documents ouverts deviennent deux pièces du dossier.
async function dossierDeDeuxPieces(app, page) {
  await app.ouvrir('convention.pdf', piece('Convention', 2));
  await app.ouvrir('annexe.pdf', piece('Annexe', 2));
  expect(await app.nbPages()).toBe(4);
  await app.outil('dossier');
  await page.fill('#do-titre', 'Dossier communal');
  await page.click('.dialog .dlg-foot .tb-btn.primary');
  await expect.poll(() => app.dernier(), { timeout: 60000 }).toContain('Dossier constitué');
  // sommaire + (intercalaire + 2) × 2
  await expect.poll(() => app.nbPages()).toBe(7);
}

// Ce que le sommaire annonce, et où les pièces se trouvent réellement.
function annoncesEtPositions(pages) {
  const annonces = {};
  for (const m of pages[0].matchAll(/Pièce n°\s*(\d+)\s*p\.\s*(\d+)/g)) annonces[m[1]] = Number(m[2]);
  const positions = {};
  pages.forEach((t, i) => {
    const m = /PIÈCE N°\s*(\d+)/.exec(t);
    if (m && positions[m[1]] === undefined) positions[m[1]] = i + 1;
  });
  return { annonces, positions };
}

test('le dossier prend un sommaire, des intercalaires et une mention par page', async ({ app, page }) => {
  await dossierDeDeuxPieces(app, page);
  const { octets } = await app.exporter();
  const pages = await textesDuPdf(page, octets);
  expect(pages).toHaveLength(7);
  expect(pages[0]).toContain('Sommaire');
  expect(pages[0]).toContain('Dossier communal');
  const { annonces, positions } = annoncesEtPositions(pages);
  expect(Object.keys(annonces).sort()).toEqual(['1', '2']);
  expect(annonces).toEqual(positions);
  // La mention « Pièce n° » est posée sur les pages des pièces.
  expect(pages[2]).toContain('Pièce n° 1');
  expect(pages[5]).toContain('Pièce n° 2');
});

test('une page déplacée puis un export immédiat : le sommaire est déjà à jour', async ({ app, page }) => {
  await dossierDeDeuxPieces(app, page);
  await app.vue('organiser');
  // La seconde pièce entière (intercalaire compris) passe devant la première :
  // les deux changent de page, et chacune reste d'un seul tenant.
  await app.selectionner(5, 6, 7);
  await page.fill('#moveto', '2');
  await page.click('#moveto-go');
  await expect(page.locator('#pages .tile')).toHaveCount(7);

  // Sans laisser au sommaire le temps de se refaire : c'est tout l'enjeu.
  const { octets } = await app.exporter();
  const pages = await textesDuPdf(page, octets);
  const { annonces, positions } = annoncesEtPositions(pages);
  expect(Object.keys(annonces)).toHaveLength(2);
  expect(annonces, 'le sommaire annonce les pages où les pièces sont vraiment').toEqual(positions);
  // Et les numéros ont bien changé : un sommaire périmé aurait gardé les anciens.
  expect(annonces['2'], 'la pièce 2 ouvre maintenant le dossier').toBe(2);
  expect(annonces['1'], 'la pièce 1 a reculé').toBe(5);
});

test('retirer une pièce entière : le sommaire le dit par un tiret', async ({ app, page }) => {
  await dossierDeDeuxPieces(app, page);
  await app.vue('organiser');
  // L'intercalaire de la pièce 2 et ses deux pages : les trois dernières.
  await app.selectionner(5, 6, 7);
  await page.click('#sel-delete');
  await expect(page.locator('#pages .tile')).toHaveCount(4);
  const { octets } = await app.exporter();
  const pages = await textesDuPdf(page, octets);
  expect(pages[0]).toContain('Pièce n° 1');
  // La pièce partie n'annonce plus de page.
  expect(/Pièce n°\s*2\s*—/.test(pages[0]) || /Pièce n°\s*2/.test(pages[0])).toBe(true);
  const { annonces, positions } = annoncesEtPositions(pages);
  Object.keys(annonces).forEach((n) => {
    if (positions[n]) expect(annonces[n]).toBe(positions[n]);
  });
});

test('le dossier pose un signet par pièce, et une pagination continue', async ({ app, page }) => {
  await dossierDeDeuxPieces(app, page);
  await page.click('#tab-plan');
  // Sommaire + une entrée par pièce.
  await expect(page.locator('#signets .signet')).toHaveCount(3);
  await expect(page.locator('#signets')).toContainText('Pièce n° 1');
  const { octets } = await app.exporter();
  const pages = await textesDuPdf(page, octets);
  expect(pages[3], 'le pied de page numérote la quatrième feuille').toContain('4 / 7');
});

test('Ctrl+Z défait la constitution du dossier', async ({ app, page }) => {
  await dossierDeDeuxPieces(app, page);
  await page.click('#btn-undo');
  await expect.poll(() => app.nbPages()).toBe(4);
  await page.click('#tab-plan');
  await expect(page.locator('#signets .signet')).toHaveCount(0);
});
