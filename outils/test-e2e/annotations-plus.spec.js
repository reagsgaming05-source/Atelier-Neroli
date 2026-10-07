// Les annotations qu'Acrobat sait faire et que l'éditeur ignorait (chapitre 09 de l'audit) : souligner, barrer, flèche,
// note autocollante, lien. Chacune doit partir comme un vrai commentaire PDF que n'importe quelle visionneuse relit.
const { test, expect, annotationsDuPdf, liensDuPdf, pdfDe } = require('./aide');

test.use({ viewport: { width: 1400, height: 950 } });

async function ouvrirEditeur(app, page) {
  await app.pretAvecExemple();
  await app.vue('organiser');
  await page.dblclick('#pages .tile:nth-child(1)');
  await expect(page.locator('.editor')).toBeVisible();
}
// Un geste sur la feuille, en points de la page (x vers la droite, y vers le bas, comme à l'écran).
async function geste(page, de, vers) {
  const f = await page.locator('.ed-sheet').boundingBox();
  const kx = f.width / 595, ky = f.height / 842;
  await page.mouse.move(f.x + de[0] * kx, f.y + de[1] * ky);
  await page.mouse.down();
  await page.mouse.move(f.x + vers[0] * kx, f.y + vers[1] * ky, { steps: 6 });
  await page.mouse.up();
}
async function clic(page, pt) {
  const f = await page.locator('.ed-sheet').boundingBox();
  await page.mouse.click(f.x + pt[0] * f.width / 595, f.y + pt[1] * f.height / 842);
}
async function fermerEtExporter(app, page) {
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await expect(page.locator('.editor')).toBeHidden();
  return (await app.exporter()).octets;
}

test('souligner, barrer, flèche et note partent comme de vrais commentaires PDF', async ({ app, page }) => {
  await ouvrirEditeur(app, page);
  await page.click('.ed-tool[data-tool="underline"]');
  await geste(page, [70, 120], [300, 136]);
  await page.click('.ed-tool[data-tool="strike"]');
  await geste(page, [70, 160], [300, 176]);
  await page.click('.ed-tool[data-tool="arrow"]');
  await geste(page, [350, 300], [450, 220]);
  await page.click('.ed-tool[data-tool="note"]');
  await clic(page, [500, 80]);
  await expect(page.locator('.ed-side')).toContainText('Texte de la note');
  await page.fill('#ed-note-texte', 'À vérifier avec le service des finances');
  await page.locator('#ed-note-texte').blur();
  const octets = await fermerEtExporter(app, page);
  const types = (await annotationsDuPdf(page, octets))[0].map((a) => a.type);
  expect(types).toEqual(expect.arrayContaining(['Underline', 'StrikeOut', 'Line', 'Text']));
  const note = (await annotationsDuPdf(page, octets))[0].find((a) => a.type === 'Text');
  expect(note.contenu).toBe('À vérifier avec le service des finances');
});

test('Annuler nomme chaque annotation posée', async ({ app, page }) => {
  await ouvrirEditeur(app, page);
  await page.click('.ed-tool[data-tool="arrow"]');
  await geste(page, [350, 300], [450, 220]);
  await expect.poll(() => app.dernier()).toContain('Dessiner une flèche');
  await page.keyboard.press('Control+z');
  await expect.poll(() => app.dernier()).toContain('Annulé : Dessiner une flèche');
});

test('un lien vers une adresse web part comme un vrai lien, et un lien dangereux ne part pas', async ({ app, page }) => {
  await ouvrirEditeur(app, page);
  await page.click('.ed-tool[data-tool="lien"]');
  await geste(page, [70, 200], [300, 218]);
  await expect(page.locator('#ed-lien-url')).toBeVisible();
  await page.fill('#ed-lien-url', 'https://www.exemple.ch/reglement');
  await page.locator('#ed-lien-url').blur();
  await page.fill('#ed-lien-libelle', 'Règlement de la salle');
  await page.locator('#ed-lien-libelle').blur();
  // un second lien, dangereux
  await page.click('.ed-tool[data-tool="lien"]');
  await geste(page, [70, 260], [300, 278]);
  await page.fill('#ed-lien-url', 'javascript:alert(1)');
  await page.locator('#ed-lien-url').blur();
  await expect(page.locator('.ed-side')).toContainText('ne sera pas écrite');
  const octets = await fermerEtExporter(app, page);
  const liens = await page.evaluate(async (b64) => {
    const bin = atob(b64); const data = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
    const doc = await window.pdfjsLib.getDocument({ data }).promise;
    const out = [];
    for (const a of await (await doc.getPage(1)).getAnnotations()) if (a.subtype === 'Link') out.push({ url: a.url || '', contenu: (a.contentsObj && a.contentsObj.str) || '' });
    return out;
  }, Buffer.from(octets).toString('base64'));
  expect(liens.map((l) => l.url)).toContain('https://www.exemple.ch/reglement');
  expect(liens.some((l) => /javascript/i.test(l.url)), 'aucun lien ne lance de script').toBe(false);
  expect(liens.find((l) => l.url.includes('exemple.ch')).contenu).toBe('Règlement de la salle');
});

test('un lien vers une page d'un document mène à cette page', async ({ app, page }) => {
  await ouvrirEditeur(app, page);
  await page.click('.ed-tool[data-tool="lien"]');
  await geste(page, [70, 200], [300, 218]);
  await page.selectOption('#ed-lien-type', 'page');
  await page.fill('#ed-lien-page', '3');
  await page.locator('#ed-lien-page').blur();
  await fermerEtExporter(app, page).then(async (octets) => {
    const liens = await liensDuPdf(page, octets);
    expect(liens.filter((l) => l.depuis === 1).map((l) => l.vers)).toContain(3);
  });
});

test('le sommaire d\'un dossier de pièces est cliquable : chaque ligne mène à sa pièce', async ({ app, page }) => {
  const piece = (titre) => pdfDe([[{ x: 70, y: 700, taille: 20, texte: titre }], [{ x: 70, y: 700, taille: 14, texte: titre + ' (suite)' }]]);
  await app.ouvrir('contrat.pdf', piece('CONTRAT'));
  await app.ouvrir('annexe.pdf', piece('ANNEXE'));
  await app.outil('dossier');
  await page.click('.dialog .dlg-foot .tb-btn.primary');
  await expect.poll(() => app.dernier(), { timeout: 60000 }).toContain('Dossier');
  const { octets } = await app.exporter();
  const liens = await liensDuPdf(page, octets);
  const duSommaire = liens.filter((l) => l.depuis === 1);
  expect(duSommaire, 'une ligne cliquable par pièce').toHaveLength(2);
  const { textesDuPdf } = require('./aide');
  const textes = await textesDuPdf(page, octets);
  duSommaire.forEach((l, i) => {
    expect(textes[l.vers - 1], 'la ligne ' + (i + 1) + ' mène à l\'intercalaire de sa pièce').toMatch(new RegExp('PIÈCE N°\\s*' + (i + 1), 'i'));
  });
});
