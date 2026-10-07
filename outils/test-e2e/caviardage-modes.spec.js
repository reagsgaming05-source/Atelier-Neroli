// Les modes du caviardage (chapitre 15) : « certifié » (pages en images à 300 ppp, tout nettoyé, journal et relecture de la copie) et « marques à
// relire » (rien n'est retiré ; les zones s'écrivent comme annotations Redact qu'on reprend ensuite, ici ou dans Acrobat).
const { test, expect, pdfDe, texteDuPdf, annotationsDuPdf } = require('./aide');
const crypto = require('crypto');

const doc = () => pdfDe([[
  { x: 70, y: 760, taille: 14, texte: 'Décision du Conseil communal' },
  { x: 70, y: 720, texte: 'Requérant : Kalliope Vasilakis' },
  { x: 70, y: 690, texte: 'Objet : demande de permis de construire' },
]]);

async function caviarderTout(page, app, terme) {
  await page.click('#btn-search');
  await page.fill('#se-q', terme);
  await expect.poll(() => page.locator('#se-compte').textContent(), { timeout: 30000 }).not.toBe('');
  await page.click('#se-caviarder');
  await page.click('#se-caviarder-oui');
  await expect.poll(() => app.dernier(), { timeout: 90000 }).toMatch(/caviard/i);
}
async function choisirMode(app, page, mode, options) {
  await app.outil('caviardage-mode');
  await page.selectOption('#cv-mode', mode);
  if (options && options.termes) await page.locator('#cv-termes').check();
  await page.locator('.dialog .dlg-foot .tb-btn.primary').click();
  await page.waitForSelector('.dialog', { state: 'detached' });
}

test('marques à relire : rien n\'est retiré, la zone s\'écrit comme annotation Redact, et se reprend', async ({ app, page }) => {
  await app.ouvrir('decision.pdf', doc());
  await caviarderTout(page, app, 'Vasilakis');
  await choisirMode(app, page, 'marques');
  const { octets } = await app.exporter();
  expect(await texteDuPdf(page, octets), 'le nom est toujours là : rien n\'est caviardé').toContain('Vasilakis');
  const annots = await annotationsDuPdf(page, octets);
  expect(annots[0].some(a => a.type === 'Redact'), 'une marque Redact est écrite').toBe(true);

  // On rouvre ce fichier, on reprend les marques, on exporte en mode habituel : le nom disparaît.
  await app.ouvrir('marques.pdf', octets);
  await app.outil('commentaires');
  await expect(page.locator('.dialog')).toContainText('Caviardage');
  await page.click('#cm-reprendre');
  await expect.poll(() => app.dernier(), { timeout: 20000 }).toContain('marque reprise');
  const final = await app.exporter();
  const t = await texteDuPdf(page, final.octets);
  expect(t, 'le nom a quitté le fichier, la marque reprise ayant été appliquée').not.toContain('Vasilakis');
  expect(t).toContain('Conseil communal');
});

test('caviardage certifié : page en image à 300 ppp, rien de caché, journal et relecture de la copie', async ({ app, page }) => {
  test.setTimeout(240000);
  await app.ouvrir('decision.pdf', doc());
  await caviarderTout(page, app, 'Vasilakis');
  await choisirMode(app, page, 'certifie', { termes: true });
  // deux fichiers partent : le PDF, puis son journal
  const arrives = [];
  page.on('download', d => arrives.push(d));
  await page.click('#btn-export');
  await expect.poll(() => arrives.length, { timeout: 120000 }).toBe(2);
  const lus = [];
  for (const d of arrives) lus.push({ nom: d.suggestedFilename(), octets: require('fs').readFileSync(await d.path()) });
  const pdf = lus.find(x => /\.pdf$/.test(x.nom)), journal = lus.find(x => /\.txt$/.test(x.nom));
  expect(pdf && journal, 'le PDF et le journal').toBeTruthy();
  expect(journal.nom).toMatch(/journal-caviardage\.txt$/);
  expect(await texteDuPdf(page, pdf.octets)).toBe('');
  // l'image de la page : 300 ppp d'une A4 = 2480 px de large
  const largeur = await page.evaluate(async (b64) => {
    const doc = await window.PDFLib.PDFDocument.load(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
    const pg = doc.getPages()[0];
    const xo = pg.node.Resources().lookup(window.PDFLib.PDFName.of('XObject'));
    const ref = xo.values()[0];
    return doc.context.lookup(ref).dict.get(window.PDFLib.PDFName.of('Width')).asNumber();
  }, pdf.octets.toString('base64'));
  expect(largeur, 'image à 300 ppp').toBeGreaterThan(2300);
  const t = journal.octets.toString('utf8');
  expect(t).toContain('JOURNAL DE CAVIARDAGE');
  expect(t).toContain('Vasilakis');                                   // les termes y sont, à la demande
  expect(t).toMatch(/Pages caviardées, converties en images à 300 ppp : 1/);
  expect(t).toContain('aucun terme caviardé ne se retrouve');
  expect(t).toContain(crypto.createHash('sha256').update(pdf.octets).digest('hex'));
  // ni auteur ni logiciel d'origine dans les informations du fichier
  const infos = await page.evaluate(async (b64) => { const d = await window.PDFLib.PDFDocument.load(Uint8Array.from(atob(b64), c => c.charCodeAt(0))); return [d.getAuthor() || '', d.getTitle() || '', d.getSubject() || '', d.getKeywords() || ''].join('|'); }, pdf.octets.toString('base64'));
  expect(infos).toBe('|||');
});

test('caviardage certifié sans les termes : le journal ne les contient pas', async ({ app, page }) => {
  test.setTimeout(240000);
  await app.ouvrir('decision.pdf', doc());
  await caviarderTout(page, app, 'Vasilakis');
  await choisirMode(app, page, 'certifie');
  const arrives = [];
  page.on('download', d => arrives.push(d));
  await page.click('#btn-export');
  await expect.poll(() => arrives.length, { timeout: 120000 }).toBe(2);
  const journal = arrives.find(d => /\.txt$/.test(d.suggestedFilename()));
  const t = require('fs').readFileSync(await journal.path(), 'utf8');
  expect(t).not.toContain('Vasilakis');
  expect(t).toMatch(/terme 1 : \d+ occurrences/);
});
