// Les fichiers que l'application reçoit : un TIFF de scanner devient des pages (plusieurs, à leur taille réelle) ; un fichier
// Word, Excel ou courriel dit ce qu'il faut faire au lieu d'être refusé sec.
const { test, expect } = require('./aide');

// Un TIFF sans compression, en niveaux de gris, de n pages : fabriqué octet par octet, comme les PDF d'essai.
function tiffGris(n, largeur, hauteur, ppp) {
  const octets = [];
  const u16 = (v) => octets.push(v & 255, (v >> 8) & 255);
  const u32 = (v) => octets.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255);
  octets.push(0x49, 0x49); u16(42); u32(8);   // en-tête : petit-boutiste, premier répertoire en 8
  const taillePixels = largeur * hauteur;
  const TAGS = 12, tailleIfd = 2 + TAGS * 12 + 4;
  for (let k = 0; k < n; k++) {
    const debut = octets.length;
    const apresIfd = debut + tailleIfd;
    const offRes = apresIfd, offPixels = apresIfd + 16;
    const suivant = k < n - 1 ? offPixels + taillePixels : 0;
    u16(TAGS);
    const tag = (id, type, nb, val) => { u16(id); u16(type); u32(nb); if (type === 3 && nb === 1) { u16(val); u16(0); } else u32(val); };
    tag(256, 4, 1, largeur); tag(257, 4, 1, hauteur); tag(258, 3, 1, 8); tag(259, 3, 1, 1); tag(262, 3, 1, 1);
    tag(273, 4, 1, offPixels); tag(277, 3, 1, 1); tag(278, 4, 1, hauteur); tag(279, 4, 1, taillePixels);
    tag(282, 5, 1, offRes); tag(283, 5, 1, offRes + 8); tag(296, 3, 1, 2);
    u32(suivant);
    u32(ppp); u32(1); u32(ppp); u32(1);                       // résolutions, en rationnels
    for (let i = 0; i < taillePixels; i++) octets.push((i * 7 + k * 60) & 255);
  }
  return Buffer.from(octets);
}

test('un TIFF de scanner devient des pages, à la taille que sa résolution donne', async ({ app, page }) => {
  await app.pretAvecExemple();
  await page.setInputFiles('#file-input', { name: 'scan-bureau.tif', mimeType: 'image/tiff', buffer: tiffGris(3, 300, 424, 300) });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('#doc-list .doc-name')).some((e) => /scan-bureau/.test(e.textContent)), null, { timeout: 60000 });
  expect(await app.nbPages(), 'trois pages, et l\'exemple est parti').toBe(3);
  const { octets } = await app.exporter();
  const dim = await page.evaluate(async (b64) => {
    const bin = atob(b64); const data = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
    const doc = await window.pdfjsLib.getDocument({ data }).promise;
    const v = (await doc.getPage(1)).getViewport({ scale: 1 });
    return [Math.round(v.width), Math.round(v.height)];
  }, Buffer.from(octets).toString('base64'));
  expect(dim, '300 pixels à 300 ppp font 72 points').toEqual([72, 102]);
});

test('un fichier Word dit comment en faire un PDF au lieu d\'être refusé sec', async ({ app, page }) => {
  await app.pretAvecExemple();
  await page.setInputFiles('#file-input', { name: 'lettre.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('PK') });
  await expect(page.locator('#toast')).toContainText('lettre.docx');
  await expect(page.locator('#toast')).toContainText('Dans Word : Fichier › Enregistrer sous › PDF');
  expect(await app.nbPages(), 'l\'exemple est toujours là').toBe(6);
});

test('un courriel et un tableur reçoivent chacun leur conseil', async ({ app, page }) => {
  await app.pretAvecExemple();
  await page.setInputFiles('#file-input', { name: 'message.msg', mimeType: 'application/vnd.ms-outlook', buffer: Buffer.from('x') });
  await expect(page.locator('#toast')).toContainText('imprimer le message en PDF');
  await page.setInputFiles('#file-input', { name: 'budget.xlsx', mimeType: 'application/vnd.ms-excel', buffer: Buffer.from('PK') });
  await expect(page.locator('#toast')).toContainText('Dans Excel');
});
