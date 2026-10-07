// Ce que l'application garde sur le poste de la personne, depuis l'interface : un tampon mémorisé se retrouve au rechargement et s'oublie ; une signature
// manuscrite, donnée personnelle, n'est mémorisée que si la personne le demande (case décochée par défaut, qui dit où elle est gardée).
const { test, expect, pdfDe } = require('./aide');

const doc = () => pdfDe([[{ x: 70, y: 700, taille: 16, texte: 'Une page' }]]);
const lire = (page, cle) => page.evaluate((c) => localStorage.getItem(c), cle);

async function ouvrirLeDialogue(page, outil) {
  await page.click('#tab-tools');
  await page.click('[data-tool="' + outil + '"]');
  await page.waitForSelector('.dialog', { state: 'visible' });
}

async function tracer(page) {
  const cv = page.locator('.dialog canvas').first();
  const b = await cv.boundingBox();
  await page.mouse.move(b.x + 20, b.y + 30);
  await page.mouse.down();
  await page.mouse.move(b.x + 80, b.y + 60, { steps: 5 });
  await page.mouse.move(b.x + 140, b.y + 25, { steps: 5 });
  await page.mouse.up();
}

test('un tampon mémorisé se retrouve après rechargement, et s\'oublie', async ({ app, page }) => {
  await app.ouvrir('lettre.pdf', doc());
  await ouvrirLeDialogue(page, 'tampon');
  expect(await lire(page, 'aktum-tampons'), 'rien n\'est mémorisé avant que la personne le demande').toBeNull();
  await page.fill('#tp-neuf', 'Reçu le {date} — service des finances');
  await page.click('.dialog button:has-text("Mémoriser")');
  const gardes = JSON.parse(await lire(page, 'aktum-tampons'));
  expect(gardes).toHaveLength(1);
  expect(gardes[0].text).toBe('Reçu le {date} — service des finances');
  await expect(page.locator('.tampon-item .tampon-choix[title="Votre tampon"]')).toHaveCount(1);

  // Au rechargement de la page, le tampon est toujours là.
  await page.reload();
  await page.waitForSelector('#app-toolbar', { state: 'visible' });
  await app.ouvrir('lettre.pdf', doc());
  await ouvrirLeDialogue(page, 'tampon');
  await expect(page.locator('.tampon-item .tampon-choix[title="Votre tampon"]')).toHaveCount(1);
  await expect(page.locator('.tampon-item .tampon-choix[title="Votre tampon"]')).toContainText('service des finances');

  // « Oublier ce tampon » le retire du poste.
  await page.click('.tampon-item .oubli');
  await expect(page.locator('.tampon-item .tampon-choix[title="Votre tampon"]')).toHaveCount(0);
  expect(JSON.parse(await lire(page, 'aktum-tampons'))).toEqual([]);
});

test('une signature n\'est mémorisée que si la personne le demande : la case est décochée et dit où elle est gardée', async ({ app, page }) => {
  await app.ouvrir('lettre.pdf', doc());
  await ouvrirLeDialogue(page, 'signer');
  const case_ = page.locator('#sg-garder');
  await expect(case_, 'la case est décochée par défaut').not.toBeChecked();
  await expect(page.locator('.dialog')).toContainText('dossier de l\'application (data), en clair');
  await tracer(page);
  await page.click('.dialog button:has-text("Insérer")');
  await page.waitForSelector('.dialog', { state: 'detached' });
  expect(await lire(page, 'aktum-signatures'), 'cochée nulle part : rien n\'est gardé').toBeNull();
});

test('une signature cochée est gardée, se propose ensuite, et s\'oublie une à une', async ({ app, page }) => {
  await app.ouvrir('lettre.pdf', doc());
  await ouvrirLeDialogue(page, 'signer');
  await tracer(page);
  await page.check('#sg-garder');
  await page.click('.dialog button:has-text("Insérer")');
  await page.waitForSelector('.dialog', { state: 'detached' });
  const gardees = JSON.parse(await lire(page, 'aktum-signatures'));
  expect(gardees).toHaveLength(1);
  expect(gardees[0].data).toMatch(/^data:image\/png/);
  // Au rechargement, elle est proposée ; « Oublier cette signature » la retire du poste.
  await page.reload();
  await page.waitForSelector('#app-toolbar', { state: 'visible' });
  await app.ouvrir('lettre.pdf', doc());
  await ouvrirLeDialogue(page, 'signer');
  await expect(page.locator('.signature-item')).toHaveCount(1);
  await page.click('.signature-item .oubli');
  expect(JSON.parse(await lire(page, 'aktum-signatures'))).toEqual([]);
});
