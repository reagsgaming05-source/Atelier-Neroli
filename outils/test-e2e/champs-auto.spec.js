// Reconnaître les champs d'un formulaire à plat (chapitre 09) : un vrai PDF dessiné avec des traits, un cadre, une case et des
// pointillés tapés ; la liste proposée, puis les champs posés et écrits comme vrais champs de formulaire.
const { test, expect } = require('./aide');

async function formulaireAPlat(page) {
  const b64 = await page.evaluate(async () => {
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const p = doc.addPage([595, 842]);
    const noir = rgb(0, 0, 0);
    p.drawText('Demande de location', { x: 60, y: 780, size: 18, font });
    p.drawText('Nom :', { x: 60, y: 700, size: 11, font });
    p.drawLine({ start: { x: 110, y: 698 }, end: { x: 400, y: 698 }, thickness: 0.7, color: noir });
    p.drawText('Prénom :', { x: 60, y: 660, size: 11, font });
    p.drawLine({ start: { x: 120, y: 658 }, end: { x: 400, y: 658 }, thickness: 0.7, color: noir });
    p.drawText('Localité : ____________________________', { x: 60, y: 620, size: 11, font });
    p.drawText('Remarques', { x: 60, y: 580, size: 11, font });
    p.drawRectangle({ x: 60, y: 480, width: 340, height: 90, borderColor: noir, borderWidth: 0.8 });
    p.drawRectangle({ x: 60, y: 440, width: 10, height: 10, borderColor: noir, borderWidth: 0.8 });
    p.drawText('Cuisine', { x: 78, y: 441, size: 11, font });
    p.drawText('Un texte souligné', { x: 60, y: 400, size: 11, font });
    p.drawLine({ start: { x: 60, y: 398 }, end: { x: 152, y: 398 }, thickness: 0.7, color: noir });
    const o = await doc.save();
    let t = ''; for (let i = 0; i < o.length; i++) t += String.fromCharCode(o[i]);
    return btoa(t);
  });
  return Buffer.from(b64, 'base64');
}

test('les lignes, le cadre, la case et les pointillés sont proposés ; le texte souligné non', async ({ app, page }) => {
  await app.ouvrir('demande.pdf', await formulaireAPlat(page));
  await app.outil('champs-auto');
  const lignes = page.locator('.liste-champs .check-row');
  await expect(lignes).toHaveCount(5);
  const textes = await lignes.allTextContents();
  const t = textes.join('\n');
  expect(t).toContain('« Nom »');
  expect(t).toContain('« Prénom »');
  expect(t).toContain('« Localité »');
  expect(t).toContain('« Remarques »');
  expect(t).toMatch(/Case à cocher — « Cuisine »/);
  expect(t).not.toContain('souligné');
  await expect(page.locator('.dialog')).toContainText('5 champs probables');
});

test('« Ajouter les champs » les pose, Ctrl+Z les retire d\'un coup, et l\'export les écrit comme vrais champs', async ({ app, page }) => {
  await app.ouvrir('demande.pdf', await formulaireAPlat(page));
  await app.outil('champs-auto');
  await expect(page.locator('.liste-champs .check-row')).toHaveCount(5);
  // on décoche « Prénom » : il n'est pas ajouté
  await page.locator('.liste-champs .check-row', { hasText: 'Prénom' }).locator('input').uncheck();
  await expect(page.locator('#ca-ajouter')).toHaveText('Ajouter 4 champs');
  await page.locator('#ca-ajouter').click();
  await expect.poll(() => app.dernier(), { timeout: 20000 }).toContain('4 champs ajoutés');
  const { octets } = await app.exporter();
  const champs = await page.evaluate(async (b64) => {
    const doc = await window.PDFLib.PDFDocument.load(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
    return doc.getForm().getFields().map(f => ({ nom: f.getName(), case: 'isChecked' in f }));
  }, Buffer.from(octets).toString('base64'));
  expect(champs.map(c => c.nom).sort()).toEqual(['Cuisine', 'Localité', 'Nom', 'Remarques']);
  expect(champs.find(c => c.nom === 'Cuisine').case).toBe(true);
});

test('une page sans lignes ni cadres : on le dit', async ({ app, page }) => {
  const { pdfTexte } = require('./aide');
  await app.ouvrir('texte.pdf', pdfTexte(['Un simple courrier.']));
  await app.outil('champs-auto');
  await expect(page.locator('.dialog')).toContainText('Aucun champ reconnu');
});

test('Ctrl+Z retire d\'un coup tous les champs ajoutés', async ({ app, page }) => {
  await app.ouvrir('demande.pdf', await formulaireAPlat(page));
  await app.outil('champs-auto');
  await expect(page.locator('.liste-champs .check-row')).toHaveCount(5);
  await page.locator('#ca-ajouter').click();
  await expect.poll(() => app.dernier(), { timeout: 20000 }).toContain('5 champs ajoutés');
  await page.keyboard.press('Control+z');
  await expect.poll(() => app.dernier(), { timeout: 20000 }).toContain('Reconnaître les champs');
  const { octets } = await app.exporter();
  const n = await page.evaluate(async (b64) => (await window.PDFLib.PDFDocument.load(Uint8Array.from(atob(b64), c => c.charCodeAt(0)))).getForm().getFields().length, Buffer.from(octets).toString('base64'));
  expect(n).toBe(0);
});
