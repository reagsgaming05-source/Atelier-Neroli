// Ce qu'un document porte et qu'une réécriture détruit : une signature, une
// déclaration PDF/A, un balisage, un formulaire XFA. Le logiciel réécrit le
// fichier à chaque export ; il doit le dire avant, et ne laisser dans le
// fichier produit aucune marque de ce qu'il a détruit.
const { test, expect, brut, fluxDecompresses } = require('./aide');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const FIX = (n) => fs.readFileSync(path.join(__dirname, 'fixtures', n));
const aOutil = (cmd, args) => { try { return spawnSync(cmd, args, { encoding: 'utf8' }).status === 0; } catch (_) { return false; } };

// Un PDF fabriqué DANS la page avec la bibliothèque embarquée, au niveau voulu.
async function pdfPropre(page, ajouts) {
  const b64 = await page.evaluate(async (ajouts) => {
    const { PDFDocument, PDFName, PDFString, PDFBool } = window.PDFLib;
    const d = await PDFDocument.create();
    d.addPage([595, 842]).drawRectangle({ x: 70, y: 700, width: 200, height: 20 });
    d.addPage([595, 842]);
    if (ajouts.pdfa) d.convertToPDFA({ conformance: ajouts.pdfa });
    if (ajouts.xfa) {
      const form = d.context.obj({ Fields: [], XFA: [PDFString.of('template'), d.context.register(d.context.stream('<xdp:xdp xmlns:xdp="http://ns.adobe.com/xdp/"/>'))] });
      d.catalog.set(PDFName.of('AcroForm'), form);
    }
    if (ajouts.balise) {
      d.catalog.set(PDFName.of('MarkInfo'), d.context.obj({ Marked: PDFBool.True }));
      d.catalog.set(PDFName.of('StructTreeRoot'), d.context.obj({ Type: 'StructTreeRoot' }));
    }
    const o = await d.save();
    let s = ''; for (let i = 0; i < o.length; i++) s += String.fromCharCode(o[i]);
    return btoa(s);
  }, ajouts);
  return Buffer.from(b64, 'base64');
}

test('un PDF/A-2b réenregistré sans rien changer reste un PDF/A-2b, sans question', async ({ app, page }) => {
  await app.ouvrir('archive.pdf', await pdfPropre(page, { pdfa: '2B' }));
  // Le temps que la lecture des propriétés ait fini.
  await page.waitForFunction(() => !!document.querySelector('#btn-journal') && !document.querySelector('#btn-journal').hidden, null, { timeout: 30000 });
  const { octets } = await app.exporter();
  const s = brut(octets);
  expect(s, 'le fichier déclare toujours son niveau').toMatch(/pdfaid:part>2</);
  expect(s).toMatch(/OutputIntent/);
  await expect(page.locator('#perte-continuer')).toHaveCount(0);
});

test('un PDF/A auquel on pose un filigrane le dit avant, puis ne se prétend plus PDF/A', async ({ app, page }) => {
  await app.ouvrir('archive.pdf', await pdfPropre(page, { pdfa: '2B' }));
  await page.waitForFunction(() => !document.querySelector('#btn-journal').hidden, null, { timeout: 30000 });
  await app.outil('watermark');
  await page.fill('#wm-text', 'COPIE');
  await page.locator('.dialog').getByRole('button', { name: 'Appliquer' }).click();
  const p = app.recolter(() => page.click('#btn-export'));
  await page.waitForSelector('#perte-continuer', { timeout: 30000 });
  await expect(page.locator('.dialog')).toContainText('PDF/A-2b');
  await expect(page.locator('.dialog')).toContainText('filigrane');
  await page.click('#perte-continuer');
  const { octets } = await p;
  const s = brut(octets);
  expect(s, 'plus de déclaration PDF/A').not.toMatch(/pdfaid/);
  expect(s, 'plus d\'intention de sortie').not.toMatch(/OutputIntent/);
});

test('renoncer au dialogue des pertes n\'écrit rien', async ({ app, page }) => {
  await app.ouvrir('archive.pdf', await pdfPropre(page, { pdfa: '2B' }));
  await page.waitForFunction(() => !document.querySelector('#btn-journal').hidden, null, { timeout: 30000 });
  await app.outil('watermark');
  await page.fill('#wm-text', 'COPIE');
  await page.locator('.dialog').getByRole('button', { name: 'Appliquer' }).click();
  let telecharge = false;
  page.on('download', () => { telecharge = true; });
  await page.click('#btn-export');
  await page.waitForSelector('#perte-annuler', { timeout: 30000 });
  await page.click('#perte-annuler');
  await page.waitForTimeout(800);
  expect(telecharge, 'aucun fichier n\'est parti').toBe(false);
});

test('un document signé est annoncé à l\'ouverture, et sa copie ne porte plus aucune marque de signature', async ({ app, page }) => {
  await app.ouvrir('decision-signee.pdf', FIX('decision-signee.pdf'));
  // Annoncé : dans le journal, dès l'ouverture.
  await page.waitForFunction(() => !document.querySelector('#btn-journal').hidden, null, { timeout: 30000 });
  const p = app.recolter(() => page.click('#btn-export'));
  await page.waitForSelector('#perte-continuer', { timeout: 30000 });
  await expect(page.locator('.dialog')).toContainText('signé');
  await page.click('#perte-continuer');
  const { octets } = await p;
  const s = fluxDecompresses(octets);
  expect(s, 'plus de /ByteRange périmé').not.toMatch(/ByteRange/);
  expect(s, 'plus de /SigFlags').not.toMatch(/SigFlags/);
  expect(s, 'plus de valeur de signature').not.toMatch(/\/Type\s*\/Sig\b/);
  if (aOutil('pdfsig', ['-v'])) {
    const f = path.join(require('os').tmpdir(), 'sans-signature-' + process.pid + '.pdf');
    fs.writeFileSync(f, octets);
    const r = spawnSync('pdfsig', [f], { encoding: 'utf8' });
    expect(r.stdout + r.stderr, 'pdfsig ne voit plus de signature').toMatch(/does not contain any signatures|0 signatures|no signatures/i);
  }
});

test('un document certifié perd aussi sa certification, et le dit', async ({ app, page }) => {
  await app.ouvrir('decision-certifiee.pdf', FIX('decision-certifiee.pdf'));
  await page.waitForFunction(() => !document.querySelector('#btn-journal').hidden, null, { timeout: 30000 });
  const p = app.recolter(() => page.click('#btn-export'));
  await page.waitForSelector('#perte-continuer', { timeout: 30000 });
  await expect(page.locator('.dialog')).toContainText('certifié');
  await page.click('#perte-continuer');
  const { octets } = await p;
  const s = fluxDecompresses(octets);
  expect(s, 'plus de /DocMDP : le fichier ne prétend plus interdire les modifications').not.toMatch(/DocMDP/);
  expect(s).not.toMatch(/\/Perms/);
});

test('un formulaire XFA est annoncé, et exporté tel quel garde son paquet', async ({ app, page }) => {
  await app.ouvrir('formulaire.pdf', await pdfPropre(page, { xfa: true }));
  await page.waitForFunction(() => !document.querySelector('#btn-journal').hidden, null, { timeout: 30000 });
  const p = app.recolter(() => page.click('#btn-export'));
  await page.waitForSelector('#perte-continuer', { timeout: 30000 });
  await expect(page.locator('.dialog')).toContainText('XFA');
  await page.click('#perte-continuer');
  const { octets } = await p;
  expect(fluxDecompresses(octets), 'le paquet XFA n\'a pas été détruit à l\'ouverture').toMatch(/XFA/);
});

test('un document balisé qui perd des pages le dit et ne se dit plus balisé', async ({ app, page }) => {
  await app.ouvrir('accessible.pdf', await pdfPropre(page, { balise: true }));
  await page.waitForFunction(() => !document.querySelector('#btn-journal').hidden, null, { timeout: 30000 });
  await app.vue('organiser');
  await app.selectionner(2);
  await page.keyboard.press('Delete');
  const p = app.recolter(() => page.click('#btn-export'));
  await page.waitForSelector('#perte-continuer', { timeout: 30000 });
  await expect(page.locator('.dialog')).toContainText('balisage');
  await page.click('#perte-continuer');
  const { octets } = await p;
  const s = fluxDecompresses(octets);
  expect(s).not.toMatch(/StructTreeRoot/);
  expect(s).not.toMatch(/MarkInfo/);
});

test('un PDF ordinaire ne déclenche aucune question', async ({ app, page }) => {
  await app.ouvrir('simple.pdf', await pdfPropre(page, {}));
  const { octets } = await app.exporter();
  expect(brut(octets).slice(0, 5)).toBe('%PDF-');
  await expect(page.locator('#perte-continuer')).toHaveCount(0);
});

// La conformité gardée n'est pas une déclaration : elle se valide avec veraPDF,
// l'outil de référence. Définir VERAPDF (chemin du programme) pour l'activer ;
// sans lui, ce test se saute en le disant.
test('un PDF/A-2b dont on supprime une page reste valide selon veraPDF', async ({ app, page }) => {
  test.skip(!process.env.VERAPDF, 'VERAPDF non défini : veraPDF n\'est pas installé sur ce poste');
  await app.ouvrir('archive.pdf', await pdfPropre(page, { pdfa: '2B' }));
  await page.waitForFunction(() => !document.querySelector('#btn-journal').hidden, null, { timeout: 30000 });
  await app.vue('organiser');
  await app.selectionner(2);
  await page.keyboard.press('Delete');
  const { octets } = await app.exporter();
  const f = path.join(require('os').tmpdir(), 'pdfa-' + process.pid + '.pdf');
  fs.writeFileSync(f, octets);
  const r = spawnSync(process.env.VERAPDF, ['--flavour', '2b', f], { encoding: 'utf8', timeout: 120000 });
  expect(r.stdout + r.stderr).toMatch(/isCompliant="true"|compliant="true"|PASS/i);
});
