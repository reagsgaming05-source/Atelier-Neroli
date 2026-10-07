// Les genres de champ (chapitre 13) : texte, case à cocher, liste déroulante, boutons radio d'un même groupe, signature vide — de
// vrais champs de formulaire, avec leur description (/TU), leurs attributs obligatoire / lecture seule et l'ordre de tabulation.
const { test, expect, pdfTexte, fluxDecompresses } = require('./aide');

async function ouvrirEditeur(app, page) {
  await app.ouvrir('formulaire.pdf', pdfTexte(['Demande de location', 'Salle polyvalente']));
  await app.vue('organiser');
  await page.dblclick('#pages .tile:nth-child(1)');
  await page.waitForSelector('.editor', { state: 'visible', timeout: 30000 });
  await page.click('.ed-tool[data-tool="champ"]');
}
async function tracer(page, x1, y1, x2, y2) {
  const f = await page.locator('.ed-sheet').boundingBox();
  await page.mouse.move(f.x + f.width * x1, f.y + f.height * y1);
  await page.mouse.down();
  await page.mouse.move(f.x + f.width * x2, f.y + f.height * y2, { steps: 6 });
  await page.mouse.up();
}
async function lireLesChamps(page, octets) {
  return page.evaluate(async (b64) => {
    const doc = await window.PDFLib.PDFDocument.load(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
    const form = doc.getForm();
    return form.getFields().map(f => {
      // Les noms de classes sont raccourcis dans la page construite : on reconnaît le genre à ce que le champ sait faire.
      const genre = 'isChecked' in f ? 'case' : ('getText' in f ? 'texte' : ('enableEditing' in f ? 'liste' : ('getOptions' in f ? 'radio' : 'signature')));
      const o = { nom: f.getName(), genre, tu: null, requis: f.isRequired(), lecture: f.isReadOnly() };
      const tu = f.acroField.dict.get(window.PDFLib.PDFName.of('TU'));
      o.tu = tu && tu.decodeText ? tu.decodeText() : null;
      if (genre === 'case') o.coche = f.isChecked();
      if (genre === 'liste') { o.options = f.getOptions(); o.choisi = f.getSelected(); }
      if (genre === 'radio') { o.options = f.getOptions(); o.choisi = f.getSelected(); o.nbWidgets = f.acroField.getWidgets().length; }
      return o;
    });
  }, Buffer.from(octets).toString('base64'));
}

test('cinq genres de champ ressortent comme vrais champs, avec leurs attributs', async ({ app, page }) => {
  await ouvrirEditeur(app, page);
  // 1. un champ texte, obligatoire et décrit
  await tracer(page, 0.2, 0.15, 0.7, 0.19);
  await page.fill('#ch-lib', 'Nom du locataire');
  await page.fill('#ch-desc', 'Nom et prénom de la personne qui loue');
  await page.locator('#ch-oblig').check();
  // 2. une case à cocher, cochée d'avance
  await page.click('.ed-tool[data-tool="champ"]');
  await page.selectOption('#ch-genre', 'case');
  await tracer(page, 0.2, 0.3, 0.26, 0.34);
  await page.fill('#ch-lib', 'Cuisine');
  await page.locator('#ch-coche').check();
  // 3. une liste déroulante
  await page.click('.ed-tool[data-tool="champ"]');
  await page.selectOption('#ch-genre', 'liste');
  await tracer(page, 0.2, 0.4, 0.7, 0.44);
  await page.fill('#ch-lib', 'Durée');
  await page.fill('#ch-options', 'Une soirée\nUn week-end\nUne semaine');
  await page.fill('#ch-val', 'Un week-end');
  // 4. deux boutons radio du même groupe, le second choisi d'avance
  for (const [i, nom] of [[0, 'Virement'], [1, 'Espèces']]) {
    await page.click('.ed-tool[data-tool="champ"]');
    await page.selectOption('#ch-genre', 'radio');
    await tracer(page, 0.2 + i * 0.25, 0.52, 0.26 + i * 0.25, 0.56);
    await page.fill('#ch-groupe', 'Paiement');
    await page.fill('#ch-choix', nom);
    if (i === 1) await page.locator('#ch-coche').check();
  }
  // 5. une zone de signature
  await page.click('.ed-tool[data-tool="champ"]');
  await page.selectOption('#ch-genre', 'signature');
  await tracer(page, 0.2, 0.65, 0.6, 0.72);
  await page.fill('#ch-lib', 'Signature du locataire');
  await page.getByRole('button', { name: 'Terminer' }).click();
  await page.waitForSelector('.editor', { state: 'hidden', timeout: 20000 });
  const { octets } = await app.exporter();
  const champs = await lireLesChamps(page, octets);
  const par = (n) => champs.find(c => c.nom === n);
  expect(par('Nom du locataire')).toMatchObject({ genre: 'texte', requis: true, tu: 'Nom et prénom de la personne qui loue' });
  expect(par('Cuisine')).toMatchObject({ genre: 'case', coche: true, tu: 'Cuisine' });
  expect(par('Durée')).toMatchObject({ genre: 'liste', options: ['Une soirée', 'Un week-end', 'Une semaine'], choisi: ['Un week-end'] });
  expect(par('Paiement')).toMatchObject({ genre: 'radio', options: ['Virement', 'Espèces'], choisi: 'Espèces', nbWidgets: 2 });
  const brut = fluxDecompresses(octets);
  expect(par('Signature du locataire'), 'une zone de signature vide').toMatchObject({ genre: 'signature', tu: 'Signature du locataire' });
  expect(brut, 'une zone de signature vide').toMatch(/\/FT\s*\/Sig/);
  expect(brut, 'le clavier suit les champs dans l\'ordre de la page').toMatch(/\/Tabs\s*\/S/);
});

test('une case est carrée, même tracée en rectangle', async ({ app, page }) => {
  await ouvrirEditeur(app, page);
  await page.selectOption('#ch-genre', 'case');
  await tracer(page, 0.2, 0.3, 0.5, 0.33);
  const r = await page.locator('.ed-sheet svg [data-ann] rect').first().boundingBox();
  expect(Math.abs(r.width - r.height), 'largeur et hauteur égales').toBeLessThan(2);
});
