// Corriger un texte « dans la page » (chapitre 12) : la correction se réécrit dans le flux de la page ; quand elle n'y tient pas, elle se pose
// par-dessus un recouvrement — et l'ancien texte ne doit alors JAMAIS rester lisible dessous (copier-coller, recherche, lecteur d'écran) :
// il s'efface tout entier du flux, ou, à défaut, la page se convertit en image.
const { test, expect, pdfTexte, texteDuPdf } = require('./aide');

async function corriger(page, app, x, yHaut, mot, remplacement) {
  await app.vue('organiser');
  await page.dblclick('#pages .tile:nth-child(1)');
  await expect(page.locator('.editor')).toBeVisible();
  await page.click('.ed-tool[data-tool="edittext"]');
  const feuille = await page.locator('.ed-sheet').boundingBox();
  const k = feuille.height / 842;
  await page.mouse.click(feuille.x + x * k, feuille.y + yHaut * k);
  const zone = page.locator('.ed-riche');
  await expect(zone).toBeVisible();
  await zone.dblclick({ position: { x: 3, y: 3 } }).catch(() => {});
  await page.keyboard.press('Control+a');
  await page.keyboard.type(remplacement);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Terminer' }).click().catch(() => {});
  await page.waitForSelector('.editor', { state: 'hidden', timeout: 20000 });
}

// Une ligne en deux polices : « Montant total : » en Helvetica, « 4 250.00 CHF » en gras, « à payer » en Helvetica.
async function ligneEnDeuxPolices(page) {
  const b64 = await page.evaluate(async () => {
    const { PDFDocument, StandardFonts } = window.PDFLib;
    const doc = await PDFDocument.create();
    const f = await doc.embedFont(StandardFonts.Helvetica), g = await doc.embedFont(StandardFonts.HelveticaBold);
    const p = doc.addPage([595, 842]);
    p.drawText('Facture de la Commune', { x: 60, y: 760, size: 14, font: f });
    let x = 60;
    for (const [t, fo] of [['Montant total : ', f], ['4 250.00 CHF', g], [' a payer', f]]) { p.drawText(t, { x, y: 700, size: 12, font: fo }); x += fo.widthOfTextAtSize(t, 12); }
    const o = await doc.save();
    let t = ''; for (let i = 0; i < o.length; i++) t += String.fromCharCode(o[i]);
    return btoa(t);
  });
  return Buffer.from(b64, 'base64');
}

test('une correction simple se réécrit dans la page : le nouveau texte est là, l\'ancien n\'y est plus', async ({ app, page }) => {
  await app.ouvrir('lettre.pdf', pdfTexte(['Commune Exemple']));
  await corriger(page, app, 100, 842 - 756, 'Exemple', 'Commune Modele');
  const { octets } = await app.exporter();
  const t = await texteDuPdf(page, octets);
  expect(t).toContain('Modele');
  expect(t, 'l\'ancien mot n\'est plus lisible dans le fichier').not.toContain('Exemple');
});

test('un montant en gras au milieu d\'une ligne : jamais « 3 4 100.00 250.00 », l\'ancien montant ne reste pas caché sous la correction', async ({ app, page }) => {
  await app.ouvrir('facture.pdf', await ligneEnDeuxPolices(page));
  await corriger(page, app, 200, 842 - 698, '4 250.00', 'Montant total : 3 100.00 CHF a payer');
  const { octets } = await app.exporter();
  const t = await texteDuPdf(page, octets);
  expect(t, 'l\'ancien montant ne se lit plus dans le fichier').not.toContain('250.00');
  expect(t, 'ni le mélange des deux').not.toMatch(/3 4 100/);
});

// Des annotations que le logiciel ne sait pas dessiner : le fichier les garde, l'écran ne les montre pas — il faut le dire à l'ouverture.
test('un polygone sans apparence : dit à l\'ouverture, gardé à l\'enregistrement', async ({ app, page }) => {
  const b64 = await page.evaluate(async () => {
    const { PDFDocument, PDFName } = window.PDFLib;
    const doc = await PDFDocument.create();
    const p = doc.addPage([595, 842]);
    p.drawText('Plan annoté', { x: 60, y: 780, size: 14 });
    const a = doc.context.obj({ Type: 'Annot', Subtype: 'Polygon', Rect: [100, 600, 300, 700], Vertices: [100, 600, 300, 600, 200, 700], C: [1, 0, 0], F: 4 });
    p.node.set(PDFName.of('Annots'), doc.context.obj([doc.context.register(a)]));
    const o = await doc.save();
    let t = ''; for (let i = 0; i < o.length; i++) t += String.fromCharCode(o[i]);
    return btoa(t);
  });
  await app.ouvrir('plan.pdf', Buffer.from(b64, 'base64'));
  await expect.poll(() => page.evaluate(() => window.aktumDiagnostic().map(j => j.msg).join('\n')), { timeout: 20000 }).toContain('sans apparence enregistrée');
  const { octets } = await app.exporter();
  const n = await page.evaluate(async (b64) => {
    const doc = await window.PDFLib.PDFDocument.load(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
    return doc.getPages()[0].node.Annots().size();
  }, Buffer.from(octets).toString('base64'));
  expect(n).toBe(1);
});

// Le cas le plus banal : le montant, en gras, au milieu d'une ligne en deux polices. On le sélectionne et on le remplace, gras conservé.
test('le montant en gras remplacé tel quel : réécrit dans la page, texte sélectionnable, ancien montant disparu', async ({ app, page }) => {
  await app.ouvrir('facture.pdf', await ligneEnDeuxPolices(page));
  await app.vue('organiser');
  await page.dblclick('#pages .tile:nth-child(1)');
  await expect(page.locator('.editor')).toBeVisible();
  await page.click('.ed-tool[data-tool="edittext"]');
  const feuille = await page.locator('.ed-sheet').boundingBox();
  const k = feuille.height / 842;
  await page.mouse.click(feuille.x + 200 * k, feuille.y + (842 - 698) * k);
  await expect(page.locator('.ed-riche')).toBeVisible();
  await page.keyboard.press('Home');
  for (let i = 0; i < 16; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 8; i++) await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.type('3 100.00');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Terminer' }).click().catch(() => {});
  await page.waitForSelector('.editor', { state: 'hidden', timeout: 20000 });
  const { octets } = await app.exporter();
  const t = await texteDuPdf(page, octets);
  expect(t, 'le nouveau montant est du texte de la page, à sa place dans la ligne').toContain('Montant total : 3 100.00 CHF a payer');
  expect(t).not.toContain('250.00');
});
