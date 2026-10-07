// « Réduire la taille » ne doit jamais alourdir un fichier. Convertir chaque
// page en image multipliait un document de texte par quarante — et le texte
// n'était plus sélectionnable. Désormais le résultat est mesuré avant d'être écrit.
const { test, expect, pdfTexte, texteDuPdf } = require('./aide');

test('sur un document de texte, la réduction est refusée au lieu de livrer un fichier plus gros', async ({ app, page }) => {
  await app.ouvrir('texte.pdf', pdfTexte(['Décision du Conseil communal', 'Objet : permis de construire']));
  let ecrit = false;
  page.on('download', () => { ecrit = true; });
  await app.outil('compress');
  await page.selectOption('#cp-methode', 'pages');
  await page.locator('.dialog .dlg-foot .tb-btn.primary').click();
  await expect(page.getByText('La réduction aurait alourdi le fichier')).toBeVisible({ timeout: 60000 });
  expect(ecrit, 'aucun fichier plus gros n\'a été livré').toBe(false);
  await expect(page.locator('#btn-journal')).toBeVisible();
});

test('sur un scan lourd, la réduction réduit et livre', async ({ app, page }) => {
  // Une page qui n'est qu'une grande image bruitée en JPEG qualité maximale.
  const b64 = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 1500; c.height = 2000;
    const x = c.getContext('2d');
    const d = x.createImageData(c.width, c.height);
    let s = 12345;
    for (let i = 0; i < d.data.length; i += 4) { s = (s * 1103515245 + 12345) & 0x7fffffff; const v = (s >> 16) & 255; d.data[i] = v; d.data[i + 1] = (v * 3) & 255; d.data[i + 2] = (v * 7) & 255; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
    const url = c.toDataURL('image/jpeg', 1.0);
    const doc = await window.PDFLib.PDFDocument.create();
    const img = await doc.embedJpg(url);
    const p = doc.addPage([595, 842]);
    p.drawImage(img, { x: 0, y: 0, width: 595, height: 842 });
    const o = await doc.save();
    let t = ''; for (let i = 0; i < o.length; i++) t += String.fromCharCode(o[i]);
    return btoa(t);
  });
  const lourd = Buffer.from(b64, 'base64');
  expect(lourd.length, 'le scan d\'essai est bien lourd').toBeGreaterThan(1.5e6);
  await app.ouvrir('scan.pdf', lourd);
  await app.outil('compress');
  await page.selectOption('#cp-methode', 'pages');
  const { octets } = await app.recolter(() => page.locator('.dialog .dlg-foot .tb-btn.primary').click());
  expect(octets.length, 'plus léger que l\'original').toBeLessThan(lourd.length);
});

// La méthode par défaut allège les images et laisse le texte : le fichier reste cherchable.
async function pdfTexteEtImage(page) {
  const b64 = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 1800; c.height = 1200;
    const x = c.getContext('2d');
    const d = x.createImageData(c.width, c.height);
    let s = 777;
    for (let i = 0; i < d.data.length; i += 4) { s = (s * 1103515245 + 12345) & 0x7fffffff; const v = (s >> 16) & 255; d.data[i] = v; d.data[i + 1] = (v * 5) & 255; d.data[i + 2] = (v * 11) & 255; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
    const doc = await window.PDFLib.PDFDocument.create();
    const font = await doc.embedFont(window.PDFLib.StandardFonts.Helvetica);
    const img = await doc.embedJpg(c.toDataURL('image/jpeg', 1.0));
    const p = doc.addPage([595, 842]);
    p.drawText('Rapport de la commission des finances', { x: 60, y: 780, size: 16, font });
    p.drawImage(img, { x: 60, y: 300, width: 300, height: 200 });
    const o = await doc.save();
    let t = ''; for (let i = 0; i < o.length; i++) t += String.fromCharCode(o[i]);
    return btoa(t);
  });
  return Buffer.from(b64, 'base64');
}

test('alléger les images : le fichier diminue et son texte reste du texte', async ({ app, page }) => {
  const lourd = await pdfTexteEtImage(page);
  expect(lourd.length, 'le document d\'essai est bien lourd').toBeGreaterThan(1e6);
  await app.ouvrir('rapport.pdf', lourd);
  await app.outil('compress');
  await expect(page.locator('#cp-methode')).toHaveValue('images');
  const { octets } = await app.recolter(() => page.locator('.dialog .dlg-foot .tb-btn.primary').click());
  expect(octets.length, 'plus léger que l\'original').toBeLessThan(lourd.length * 0.6);
  expect(await texteDuPdf(page, octets), 'le texte est resté sélectionnable').toContain('Rapport de la commission des finances');
});

test('alléger les images : un document sans image lourde n\'est pas « allégé » pour rien', async ({ app, page }) => {
  await app.ouvrir('texte.pdf', pdfTexte(['Décision du Conseil communal']));
  let ecrit = false;
  page.on('download', () => { ecrit = true; });
  await app.outil('compress');
  await page.locator('.dialog .dlg-foot .tb-btn.primary').click();
  await expect(page.getByText('Aucune image n\'était assez lourde')).toBeVisible({ timeout: 60000 });
  expect(ecrit).toBe(false);
});
