// « Nettoyer le document » (chapitres 09 et 15 de l'audit) : ce qu'un PDF garde sans le dire — l'auteur, le logiciel d'origine, un
// script d'ouverture, un fichier joint, un commentaire oublié — ne part pas dans le fichier exporté quand on l'a demandé.
const { test, expect } = require('./aide');

// Un PDF chargé de ce qu'on ne voit pas, fabriqué avec la bibliothèque de la page.
async function pdfChargé(page) {
  const b64 = await page.evaluate(async () => {
    const { PDFDocument, PDFName, PDFString, PDFHexString } = window.PDFLib;
    const doc = await PDFDocument.create();
    const p = doc.addPage([595, 842]);
    p.drawText('Contrat de location', { x: 70, y: 700, size: 18 });
    doc.setAuthor('Claire Exemple'); doc.setTitle('Contrat Exemple'); doc.setSubject('Dossier 1234'); doc.setKeywords(['confidentiel']);
    const ctx = doc.context;
    // un script d'ouverture et un fichier joint
    doc.catalog.set(PDFName.of('OpenAction'), ctx.obj({ S: 'JavaScript', JS: PDFString.of('app.alert("bonjour")') }));
    const flux = ctx.stream('note interne', { Type: 'EmbeddedFile' });
    const spec = ctx.obj({ Type: 'Filespec', F: PDFString.of('interne.txt'), EF: { F: ctx.register(flux) } });
    p.node.addAnnot(ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'FileAttachment', Rect: [10, 10, 30, 30], FS: ctx.register(spec), Contents: PDFHexString.fromText('pièce jointe') })));
    p.node.addAnnot(ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Text', Rect: [40, 40, 60, 60], Contents: PDFHexString.fromText('À supprimer avant publication') })));
    const octets = await doc.save();
    let s = ''; octets.forEach((b) => { s += String.fromCharCode(b); });
    return btoa(s);
  });
  return Buffer.from(b64, 'base64');
}
// Ce que le fichier exporté contient vraiment, relu avec la bibliothèque (pas avec ce que la page croit y avoir mis).
async function inspecter(page, octets) {
  return page.evaluate(async (b64) => {
    const { PDFDocument, PDFName, PDFDict } = window.PDFLib;
    const bin = atob(b64); const data = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
    const doc = await PDFDocument.load(data, { updateMetadata: false });
    const ctx = doc.context;
    const types = [];
    for (const item of doc.getPages()[0].node.Annots() ? doc.getPages()[0].node.Annots().asArray() : []) {
      const a = ctx.lookup(item); if (a instanceof PDFDict) types.push(a.get(PDFName.of('Subtype')).toString());
    }
    const trailer = ctx.trailerInfo.ID;
    return {
      auteur: doc.getAuthor() || '', titre: doc.getTitle() || '', sujet: doc.getSubject() || '', mots: doc.getKeywords() || '',
      producteur: doc.getProducer() || '', createur: doc.getCreator() || '',
      ouverture: doc.catalog.has(PDFName.of('OpenAction')), noms: doc.catalog.has(PDFName.of('Names')), xmp: doc.catalog.has(PDFName.of('Metadata')),
      annots: types, id: trailer && trailer.size ? trailer.size() : 0,
    };
  }, Buffer.from(octets).toString('base64'));
}

test('sans nettoyage, le fichier garde tout, et le producteur dit le logiciel qui l\'a écrit', async ({ app, page }) => {
  await app.ouvrir('contrat.pdf', await pdfChargé(page));
  const { octets } = await app.exporter();
  const f = await inspecter(page, octets);
  expect(f.auteur).toBe('Claire Exemple');
  expect(f.producteur, 'le producteur est le logiciel, version comprise, pas la bibliothèque').toMatch(/^Aktum PDF \d+\.\d+/);
  expect(f.id, 'chaque fichier porte son identifiant (/ID, deux moitiés)').toBe(2);
});

test('« Nettoyer le document » retire les métadonnées, le script d\'ouverture et le fichier joint à l\'export', async ({ app, page }) => {
  await app.ouvrir('contrat.pdf', await pdfChargé(page));
  await app.outil('nettoyer');
  await page.locator('.dialog .dlg-foot .tb-btn.primary').click();
  await expect(page.locator('#last')).toContainText('Nettoyage réglé');
  await expect(page.locator('.chips, #chips, [data-chips]').first()).toBeAttached();
  const { octets } = await app.exporter();
  const f = await inspecter(page, octets);
  expect(f.auteur, 'l\'auteur est parti').toBe('');
  expect(f.titre).toBe(''); expect(f.sujet).toBe(''); expect(f.mots).toBe('');
  expect(f.ouverture, 'plus de script d\'ouverture').toBe(false);
  expect(f.noms, 'plus de dictionnaire de noms (fichiers joints, scripts)').toBe(false);
  expect(f.annots, 'le fichier joint est parti').not.toContain('/FileAttachment');
  expect(f.annots, 'le commentaire reste : on ne l\'a pas coché').toContain('/Text');
  expect(f.producteur).toMatch(/^Aktum PDF/);
});

test('cocher les commentaires les retire aussi, et Annuler rend le réglage', async ({ app, page }) => {
  await app.ouvrir('contrat.pdf', await pdfChargé(page));
  await app.outil('nettoyer');
  await page.locator('#net-annots').check();
  await page.locator('.dialog .dlg-foot .tb-btn.primary').click();
  const { octets } = await app.exporter();
  expect((await inspecter(page, octets)).annots, 'plus aucun commentaire').not.toContain('/Text');
  await page.keyboard.press('Control+z');
  await expect.poll(() => app.dernier()).toContain('Annulé : Nettoyer le document');
  const apres = await app.exporter();
  expect((await inspecter(page, apres.octets)).auteur, 'sans nettoyage, l\'auteur est revenu').toBe('Claire Exemple');
});
