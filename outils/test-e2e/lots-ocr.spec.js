// La reconnaissance de texte dans le traitement par lots : un scan en entrée, un PDF cherchable en sortie, sans ouvrir le fichier.
const { test, expect, textesDuPdf } = require('./aide');

async function scan(page, lignes) {
  const b64 = await page.evaluate(async (lignes) => {
    const doc = await window.PDFLib.PDFDocument.create();
    const c = document.createElement('canvas'); c.width = 1240; c.height = 1754;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#000'; x.font = '38px "DejaVu Sans", Arial, sans-serif'; x.textBaseline = 'middle';
    lignes.forEach((l, i) => x.fillText(l, 120, 200 + i * 70));
    const img = await doc.embedPng(c.toDataURL('image/png'));
    doc.addPage([595, 842]).drawImage(img, { x: 0, y: 0, width: 595, height: 842 });
    const o = await doc.save();
    let t = ''; for (let i = 0; i < o.length; i++) t += String.fromCharCode(o[i]);
    return btoa(t);
  }, lignes);
  return Buffer.from(b64, 'base64');
}

test('« Reconnaître le texte » dans un lot rend un PDF cherchable, et le document ouvert reste intact', async ({ app, page }) => {
  test.setTimeout(300000);
  await app.pretAvecExemple();
  const octetsScan = await scan(page, ['Decision du Conseil communal', 'Objet : permis de construire', 'Parcelle numero 1234 a Vevey']);
  await app.outil('lots');
  await page.setInputFiles('#lots-fichiers', { name: 'courrier-scanne.pdf', mimeType: 'application/pdf', buffer: octetsScan });
  await page.selectOption('#lots-op', 'ocr');
  await expect(page.locator('#lots-ocr-langue')).toBeVisible();
  const { nom, octets } = await app.recolter(() => page.locator('.dialog').getByRole('button', { name: 'Lancer' }).click());
  expect(nom).toBe('courrier-scanne-ocr.pdf');
  const [texte] = await textesDuPdf(page, octets);
  expect(texte, 'le scan est maintenant du texte').toMatch(/Conseil communal/);
  expect(texte).toMatch(/permis de construire/);
  expect(await app.nbPages(), 'le document ouvert n\'a pas bougé').toBe(6);
  await expect(page.locator('.dialog')).toContainText('page reconnue');
});
