// Le plan d'un document : tous ses signets, ou le dit. Un plafond de 800 en
// coupait en silence — sur 2 000 signets, 1 200 étaient perdus à l'enregistrement,
// et c'est exactement le dossier d'enquête indexé pièce par pièce.
const { test, expect, fluxDecompresses } = require('./aide');

// Un PDF de trois pages avec n signets à plat, écrit à la main.
function pdfAvecSignets(n) {
  const objets = [];
  const nouveau = (s) => { objets.push(s); return objets.length; };
  nouveau('<< /Type /Catalog /Pages 2 0 R /Outlines 6 0 R /PageMode /UseOutlines >>');  // 1
  nouveau('<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>');                     // 2
  for (let i = 0; i < 3; i++) nouveau('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>'); // 3-5
  const premier = 7, dernier = 6 + n;
  nouveau('<< /Type /Outlines /First ' + premier + ' 0 R /Last ' + dernier + ' 0 R /Count ' + n + ' >>'); // 6
  for (let i = 0; i < n; i++) {
    const num = 7 + i;
    objets.push('<< /Title (Piece ' + (i + 1) + ') /Parent 6 0 R'
      + (i > 0 ? ' /Prev ' + (num - 1) + ' 0 R' : '') + (i < n - 1 ? ' /Next ' + (num + 1) + ' 0 R' : '')
      + ' /Dest [' + (3 + (i % 3)) + ' 0 R /Fit] >>');
  }
  let corps = '%PDF-1.4\n';
  const decalages = [];
  objets.forEach((o, i) => { decalages.push(Buffer.byteLength(corps, 'latin1')); corps += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  const xref = Buffer.byteLength(corps, 'latin1');
  corps += 'xref\n0 ' + (objets.length + 1) + '\n0000000000 65535 f \n' + decalages.map((d) => String(d).padStart(10, '0') + ' 00000 n \n').join('');
  corps += 'trailer\n<< /Size ' + (objets.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(corps, 'latin1');
}

test('2 000 signets s\'ouvrent en entier et repartent en entier', async ({ app, page }) => {
  await app.ouvrir('indexe.pdf', pdfAvecSignets(2000));
  await page.waitForFunction(() => /2\s?000/.test(document.querySelector('#signet-count') ? document.querySelector('#signet-count').textContent : ''), null, { timeout: 60000 });
  const { octets } = await app.exporter();
  const titres = (fluxDecompresses(octets).match(/\/Title\b/g) || []).length;
  expect(titres, 'les 2 000 signets sont dans le fichier enregistré').toBe(2000);
});
