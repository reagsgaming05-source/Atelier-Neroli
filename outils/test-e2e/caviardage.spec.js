// Point 4 — Caviarder : le mot masqué quitte vraiment le fichier, et la page
// reste du texte. C'est la promesse la plus lourde de conséquences du
// logiciel : un nom noirci qui se relit au copier-coller serait une fuite.
const { test, expect, pdfDe, texteDuPdf, fluxDecompresses } = require('./aide');

const docConfidentiel = () => pdfDe([[
  { x: 70, y: 760, taille: 14, texte: 'Décision du Conseil communal' },
  { x: 70, y: 720, texte: 'Requérant : Kalliope Vasilakis' },
  { x: 70, y: 690, texte: 'Objet : demande de permis de construire' },
]]);

async function caviarderTout(page, app, terme) {
  await page.click('#btn-search');
  await page.fill('#se-q', terme);
  await expect.poll(() => page.locator('#se-compte').textContent(), { timeout: 30000 }).not.toBe('');
  await page.click('#se-caviarder');
  await expect.poll(() => app.dernier(), { timeout: 90000 }).toMatch(/caviard/i);
}

test('le mot caviardé ne se relit plus dans le PDF exporté', async ({ app, page }) => {
  await app.ouvrir('decision.pdf', docConfidentiel());
  await caviarderTout(page, app, 'Vasilakis');
  const { octets } = await app.exporter();
  const lu = await texteDuPdf(page, octets);
  expect(lu, 'le nom masqué a quitté le texte du document').not.toContain('Vasilakis');
  expect(lu, 'le reste de la page est intact').toContain('Conseil communal');
  expect(lu).toContain('permis de construire');
});

test('le mot caviardé ne traîne pas non plus dans les octets du fichier', async ({ app, page }) => {
  await app.ouvrir('decision.pdf', docConfidentiel());
  await caviarderTout(page, app, 'Vasilakis');
  const { octets } = await app.exporter();
  // Flux décompressés : ce qu'un curieux retrouverait en ouvrant le fichier.
  expect(fluxDecompresses(octets)).not.toContain('Vasilakis');
});

test('la page caviardée reste du texte, elle n\'est pas convertie en image', async ({ app, page }) => {
  await app.ouvrir('decision.pdf', docConfidentiel());
  await caviarderTout(page, app, 'Vasilakis');
  const { octets } = await app.exporter();
  const lu = await texteDuPdf(page, octets);
  // Une page transformée en image ne rendrait plus aucun texte.
  expect(lu.replace(/\s/g, '').length, 'la page porte toujours du texte').toBeGreaterThan(40);
  const brut = require('./aide').brut(octets);
  expect(/\/Subtype\s*\/Image/.test(brut), 'aucune image n\'a remplacé la page').toBe(false);
});

test('le rectangle noir est bien posé sur la page', async ({ app, page }) => {
  await app.ouvrir('decision.pdf', docConfidentiel());
  await caviarderTout(page, app, 'Vasilakis');
  await app.vue('organiser');
  // La vignette signale l'annotation posée.
  await expect(page.locator('#pages .tile .flag.ann')).toHaveCount(1);
  await page.click('#btn-undo');
  await expect(page.locator('#pages .tile .flag.ann')).toHaveCount(0);
});

test('caviarder à la main dans l\'éditeur retire aussi le texte dessous', async ({ app, page }) => {
  await app.ouvrir('decision.pdf', docConfidentiel());
  await app.vue('organiser');
  await page.dblclick('#pages .tile:nth-child(1)');
  await expect(page.locator('.editor')).toBeVisible();
  await page.click('.ed-tool[data-tool="redact"]');
  // La feuille est à l'échelle de la page : on convertit les points PDF en
  // pixels pour couvrir exactement la bande du requérant (ligne de base 720).
  const feuille = await page.locator('.ed-sheet').boundingBox();
  const k = feuille.height / 842;
  await page.mouse.move(feuille.x + feuille.width * 0.10, feuille.y + (842 - 736) * k);
  await page.mouse.down();
  await page.mouse.move(feuille.x + feuille.width * 0.85, feuille.y + (842 - 712) * k, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.ed-side')).toContainText('Annotation sélectionnée');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.locator('.editor')).toBeHidden();

  const { octets } = await app.exporter();
  const lu = await texteDuPdf(page, octets);
  expect(lu, 'la ligne masquée a disparu').not.toContain('Vasilakis');
  expect(lu, 'les autres lignes sont là').toContain('Conseil communal');
});
