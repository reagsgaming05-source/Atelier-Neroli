// Archiver en PDF/A-2b. Ce qui est affirmé ici est jugé par veraPDF, le validateur de
// référence : définir VERAPDF (chemin du programme) pour l'activer. Sans lui, les
// scénarios tournent quand même, avec le seul contrôle interne du logiciel.
const { test, expect, pdfTexte, brut, textesDuPdf, pdfEmbarque } = require('./aide');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// Jugement de veraPDF, et, quand il refuse, les règles en cause.
function valider(octets, nom) {
  if (!process.env.VERAPDF) {
    // En intégration continue, ne pas juger n'est pas une option : le scénario échoue.
    if (process.env.CI) throw new Error('veraPDF manque : l\'archivage n\'est pas jugé (définir VERAPDF).');
    return;
  }
  const f = path.join(os.tmpdir(), 'aktum-pdfa-' + process.pid + '-' + nom + '.pdf');
  fs.writeFileSync(f, octets);
  if (process.env.AKTUM_PDFA_SORTIE) { fs.mkdirSync(process.env.AKTUM_PDFA_SORTIE, { recursive: true }); fs.copyFileSync(f, path.join(process.env.AKTUM_PDFA_SORTIE, nom + '.pdf')); }
  const r = spawnSync(process.env.VERAPDF, ['--flavour', '2b', '--format', 'xml', f], { encoding: 'utf8', timeout: 180000 });
  const sortie = r.stdout + r.stderr;
  const regles = Array.from(sortie.matchAll(/<rule specification="([^"]*)" clause="([^"]*)" testNumber="([^"]*)" status="failed"[^>]*>\s*<description>([^<]*)<\/description>/g))
    .map((m) => m[1] + ' ' + m[2] + '-' + m[3] + ' : ' + m[4]);
  expect(regles, 'règles refusées par veraPDF').toEqual([]);
  expect(sortie).toMatch(/isCompliant="true"/);
}

async function archiver(app, page, { convertir } = {}) {
  await app.outil('archiver');
  if (convertir) await page.check('#arch-raster');
  const { nom, octets } = await app.recolter(() => page.click('#arch-lancer'));
  return { nom, octets };
}

test('un document aux polices incorporées s\'archive en PDF/A-2b, jugé conforme par veraPDF', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', await pdfEmbarque(page, { pages: 3 }));
  const { nom, octets } = await archiver(app, page);
  expect(nom).toBe('rapport-pdfa.pdf');
  const s = brut(octets);
  expect(s).toMatch(/pdfaid:part>2</);
  expect(s).toMatch(/pdfaid:conformance>B</);
  await expect(page.locator('.dialog')).toContainText('aucun écart');
  valider(octets, 'simple');
});

test('filigrane, numérotation et texte accentué : écrits avec des polices incorporées, toujours conformes', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', await pdfEmbarque(page, { pages: 2 }));
  await app.outil('watermark');
  await page.fill('#wm-text', 'CONFIDENTIEL — Łódź');
  await page.locator('.dialog').getByRole('button', { name: 'Appliquer' }).click();
  await page.waitForSelector('.dialog', { state: 'detached' });
  await app.outil('number');
  await page.locator('.dialog').getByRole('button', { name: 'Appliquer' }).click();
  await page.waitForSelector('.dialog', { state: 'detached' });
  const { octets } = await archiver(app, page);
  await expect(page.locator('.dialog')).toContainText('aucun écart');
  const t = (await textesDuPdf(page, octets)).join(' ');
  expect(t).toContain('Łódź');
  expect(t).toContain('1 / 2');
  valider(octets, 'marques');
});

test('scripts, fichiers joints et lien sans drapeau d\'impression : retirés ou corrigés, et dits', async ({ app, page }) => {
  await app.ouvrir('piege.pdf', await pdfEmbarque(page, { javascript: true, piece: true, lien: true }));
  const { octets } = await archiver(app, page);
  const s = brut(octets);
  expect(s).not.toMatch(/JavaScript/);
  expect(s).not.toMatch(/EmbeddedFile/);
  await expect(page.locator('.dialog')).toContainText('Corrigé');
  valider(octets, 'piege');
});

test('un formulaire rempli est aplati, avec une police incorporée', async ({ app, page }) => {
  await app.ouvrir('formulaire.pdf', await pdfEmbarque(page, { formulaire: true }));
  const { octets } = await archiver(app, page);
  const t = (await textesDuPdf(page, octets)).join(' ');
  expect(t).toContain('Müller');
  expect(brut(octets), 'plus aucun champ à remplir').not.toMatch(/\/Subtype\s*\/Widget/);
  valider(octets, 'formulaire');
});

test('des polices non incorporées : dites avant, et la conversion des pages en images n\'est jamais faite sans accord', async ({ app, page }) => {
  await app.ouvrir('ancien.pdf', pdfTexte(['Bonjour', 'Madame']));
  await app.outil('archiver');
  await expect(page.locator('.dialog')).toContainText('Helvetica');
  await expect(page.locator('.dialog')).toContainText('page 1');
  // Sans accord, rien ne part.
  let telecharge = false;
  page.on('download', () => { telecharge = true; });
  await page.click('#arch-lancer');
  await page.waitForTimeout(600);
  expect(telecharge).toBe(false);
  await page.check('#arch-raster');
  const { octets } = await app.recolter(() => page.click('#arch-lancer'));
  await expect(page.locator('.dialog')).toContainText('aucun écart');
  expect(brut(octets)).toMatch(/pdfaid:part>2</);
  valider(octets, 'converti');
});

test('un document protégé par mot de passe ne s\'archive pas, et le dit', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', await pdfEmbarque(page, { pages: 1 }));
  await app.outil('password');
  await page.fill('#se-up', 'secret123');
  await page.locator('.dialog').getByRole('button', { name: 'Appliquer' }).click();
  await page.waitForSelector('.dialog', { state: 'detached' });
  await app.outil('archiver');
  await expect(page.locator('.dialog')).toContainText('protégé par un mot de passe');
});

test('un PDF fabriqué par un autre logiciel (le moteur d\'impression de Chromium) s\'archive aussi, jugé par veraPDF', async ({ app, page }) => {
  const autre = await page.context().newPage();
  await autre.setContent('<html><body style="font-family: sans-serif"><h1>Décision n° 14</h1><p>Le conseil, réuni le 3 mars, décide à l\'unanimité : « adopter le budget ». Zoé Łukasiewicz, Zürich — 12 €.</p><table border="1"><tr><td>A</td><td>B</td></tr></table><a href="https://example.org/">lien</a></body></html>');
  const pdf = await autre.pdf({ format: 'A4' });
  await autre.close();
  await app.ouvrir('chromium.pdf', pdf);
  const { octets } = await archiver(app, page);
  await expect(page.locator('.dialog')).toContainText('aucun écart');
  expect(brut(octets)).toMatch(/pdfaid:part>2</);
  valider(octets, 'chromium');
});

test('un dossier de pièces (sommaire, intercalaires, mention par page) s\'archive aussi : ses pages générées portent des polices incorporées', async ({ app, page }) => {
  await app.ouvrir('convention.pdf', await pdfEmbarque(page, { pages: 2 }));
  await app.ouvrir('annexe.pdf', await pdfEmbarque(page, { pages: 2 }));
  await app.outil('dossier');
  await page.fill('#do-titre', 'Dossier communal — Zürich');
  await page.click('.dialog .dlg-foot .tb-btn.primary');
  await expect.poll(() => app.dernier(), { timeout: 60000 }).toContain('Dossier constitué');
  await expect.poll(() => app.nbPages()).toBe(7);
  const { octets } = await archiver(app, page);
  await expect(page.locator('.dialog')).toContainText('aucun écart');
  const t = await textesDuPdf(page, octets);
  expect(t[0]).toContain('Sommaire');
  expect(t[0]).toContain('Zürich');
  valider(octets, 'dossier');
});
