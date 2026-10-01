// Archiver en PDF/A-2b. Ce qui est affirmé ici est jugé par veraPDF, le validateur de
// référence : définir VERAPDF (chemin du programme) pour l'activer. Sans lui, les
// scénarios tournent quand même, avec le seul contrôle interne du logiciel.
const { test, expect, pdfTexte, brut, textesDuPdf } = require('./aide');
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

// Un PDF dont les polices sont incorporées, fabriqué dans la page avec les polices du logiciel.
async function pdfEmbarque(page, ajouts) {
  const b64 = await page.evaluate(async (ajouts) => {
    const gunzip = async (id) => {
      const u = Uint8Array.from(atob(document.getElementById(id).textContent.trim()), (c) => c.charCodeAt(0));
      return new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    };
    const { PDFDocument, PDFName, PDFString, PDFHexString, rgb } = window.PDFLib;
    const d = await PDFDocument.create();
    d.registerFontkit(window.fontkit);
    const f = await d.embedFont(await gunzip('police-sans-r'), { subset: true });
    const n = ajouts.pages || 2;
    for (let i = 0; i < n; i++) {
      const p = d.addPage([595, 842]);
      p.drawText('Page ' + (i + 1) + ' — Zürich, Łódź', { x: 70, y: 760, size: 14, font: f });
      p.drawRectangle({ x: 70, y: 700, width: 120, height: 14, color: rgb(0.8, 0.1, 0.1) });
    }
    if (ajouts.javascript) {
      d.catalog.set(PDFName.of('OpenAction'), d.context.obj({ S: 'JavaScript', JS: PDFString.of('app.alert(1)') }));
      d.catalog.set(PDFName.of('Names'), d.context.obj({ JavaScript: d.context.obj({ Names: [PDFString.of('x'), d.context.obj({ S: 'JavaScript', JS: PDFString.of('1') })] }) }));
    }
    if (ajouts.piece) {
      const flux = d.context.stream('pièce jointe', { Type: 'EmbeddedFile' });
      const spec = d.context.obj({ Type: 'Filespec', F: PDFString.of('note.txt'), EF: d.context.obj({ F: d.context.register(flux) }) });
      const noms = d.catalog.lookup(PDFName.of('Names')) || d.context.obj({});
      noms.set(PDFName.of('EmbeddedFiles'), d.context.obj({ Names: [PDFString.of('note.txt'), d.context.register(spec)] }));
      d.catalog.set(PDFName.of('Names'), noms);
    }
    if (ajouts.lien) {
      const a = d.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [70, 700, 190, 714], Border: [0, 0, 0], A: d.context.obj({ S: 'URI', URI: PDFString.of('https://example.org/') }) });
      d.getPage(0).node.set(PDFName.of('Annots'), d.context.obj([d.context.register(a)]));
    }
    if (ajouts.formulaire) {
      const form = d.getForm();
      const t = form.createTextField('Nom');
      t.addToPage(d.getPage(0), { x: 70, y: 600, width: 200, height: 20, font: f });
      t.setText('Müller');
    }
    const o = await d.save();
    let s = ''; for (let i = 0; i < o.length; i++) s += String.fromCharCode(o[i]);
    return btoa(s);
  }, ajouts || {});
  return Buffer.from(b64, 'base64');
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
