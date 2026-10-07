// Remplir un formulaire (chapitre 13) : l'intitulé du champ en tête de ligne, lecture seule grisé, obligatoire signalé et contrôlé, multiligne,
// format contrôlé, données exportées en CSV et XFDF puis reprises ; ce qui est saisi se voit sur la page tout de suite.
const { test, expect } = require('./aide');
const crypto = require('crypto');

async function formulaire(page) {
  const b64 = await page.evaluate(async () => {
    const { PDFDocument, PDFName, PDFHexString, StandardFonts } = window.PDFLib;
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const p = doc.addPage([595, 842]);
    const form = doc.getForm();
    p.drawText('Demande', { x: 60, y: 780, size: 16, font });
    const nom = form.createTextField('nom'); nom.addToPage(p, { x: 60, y: 700, width: 220, height: 20 });
    nom.acroField.dict.set(PDFName.of('TU'), PDFHexString.fromText('Nom et prénom du demandeur')); nom.enableRequired();
    const ref = form.createTextField('reference'); ref.addToPage(p, { x: 60, y: 660, width: 220, height: 20 }); ref.setText('A-2026-14'); ref.enableReadOnly();
    const note = form.createTextField('remarques'); note.enableMultiline(); note.addToPage(p, { x: 60, y: 580, width: 220, height: 60 });
    const age = form.createTextField('age'); age.addToPage(p, { x: 320, y: 700, width: 80, height: 20 }); age.setMaxLength(3);
    age.acroField.dict.set(PDFName.of('AktumFormat'), PDFName.of('entier'));
    const ok = form.createCheckBox('accord'); ok.addToPage(p, { x: 320, y: 660, width: 14, height: 14 });
    const salle = form.createOptionList('salles'); salle.addOptions(['Aula', 'Salle de gym', 'Réfectoire']); salle.enableMultiselect(); salle.addToPage(p, { x: 320, y: 560, width: 120, height: 60 });
    const o = await doc.save();
    let t = ''; for (let i = 0; i < o.length; i++) t += String.fromCharCode(o[i]);
    return btoa(t);
  });
  return Buffer.from(b64, 'base64');
}
const ligne = (page, texte) => page.locator('.dialog .list-item', { hasText: texte });

test('l\'intitulé du champ, lecture seule, obligatoire, multiligne : dits et respectés', async ({ app, page }) => {
  await app.ouvrir('demande.pdf', await formulaire(page));
  await app.outil('form');
  const nom = ligne(page, 'Nom et prénom du demandeur');
  await expect(nom).toContainText('obligatoire');
  await expect(nom.locator('.n')).toContainText('*');
  const ref = ligne(page, 'reference');
  await expect(ref).toContainText('lecture seule');
  await expect(ref.locator('input')).toBeDisabled();
  await expect(ligne(page, 'remarques').locator('textarea')).toHaveCount(1);
  await expect(ligne(page, 'salles').locator('select[multiple]')).toHaveCount(1);
  await expect(ligne(page, 'age')).toContainText('Nombre entier');
});

test('un champ obligatoire vide prévient une fois ; un format faux bloque ; une saisie valide se voit sur la page', async ({ app, page }) => {
  await app.ouvrir('demande.pdf', await formulaire(page));
  await app.outil('form');
  await page.locator('.dialog .list-item', { hasText: 'age' }).locator('input').fill('abc');
  await page.locator('#fm-enregistrer').click();
  await expect(page.locator('.dialog')).toContainText('À corriger avant d\'enregistrer');
  await expect(page.locator('.dialog')).toContainText('un nombre entier est attendu');
  await page.locator('.dialog .list-item', { hasText: 'age' }).locator('input').fill('42');
  await page.locator('#fm-enregistrer').click();
  await expect(page.locator('.dialog')).toContainText('champ obligatoire est vide');     // prévenu une fois…
  await ligne(page, 'Nom et prénom du demandeur').locator('input').fill('Claire Müller');
  await ligne(page, 'remarques').locator('textarea').fill('Première ligne\nSeconde ligne');
  await page.locator('#fm-f3').check().catch(() => {});
  await page.locator('#fm-enregistrer').click();
  await page.waitForSelector('.dialog', { state: 'detached' });
  // … et ce qui est saisi se voit sur la page, sans attendre l'export
  const couche = page.locator('#lecture .saisies-layer text');
  await expect(couche.filter({ hasText: 'Claire Müller' })).toHaveCount(1, { timeout: 20000 });
  await expect(couche.filter({ hasText: '42' })).toHaveCount(1);
  await expect(couche.filter({ hasText: 'Seconde ligne' })).toHaveCount(1);
});

test('les données s\'enregistrent en CSV et en XFDF, et se reprennent', async ({ app, page }) => {
  await app.ouvrir('demande.pdf', await formulaire(page));
  await app.outil('form');
  await ligne(page, 'Nom et prénom du demandeur').locator('input').fill('Marc Dupont');
  await page.locator('.dialog .list-item', { hasText: 'age' }).locator('input').fill('37');
  const csv = await app.recolter(() => page.locator('#fm-csv').click());
  expect(csv.nom).toBe('demande-donnees.csv');
  const texte = csv.octets.toString('utf8');
  expect(texte).toContain('nom;reference;remarques;age;accord;salles');
  expect(texte).toContain('Marc Dupont;A-2026-14;;37;Non;');
  const xfdf = await app.recolter(() => page.locator('#fm-xfdf').click());
  expect(xfdf.nom).toBe('demande-donnees.xfdf');
  const x = xfdf.octets.toString('utf8');
  expect(x).toContain('<field name="nom"><value>Marc Dupont</value></field>');
  expect(x).toContain('<field name="accord"><value>Off</value></field>');
  // on vide, on reprend le XFDF : les valeurs reviennent (le champ en lecture seule n'est pas touché)
  await ligne(page, 'Nom et prénom du demandeur').locator('input').fill('');
  await page.setInputFiles('#fm-charger', { name: 'reprise.xfdf', mimeType: 'text/xml', buffer: Buffer.from(x.replace('Marc Dupont', 'Léa Roth'), 'utf8') });
  await expect(ligne(page, 'Nom et prénom du demandeur').locator('input')).toHaveValue('Léa Roth');
  // un CSV relu : mêmes noms d'en-têtes
  await page.setInputFiles('#fm-charger', { name: 'reprise.csv', mimeType: 'text/csv', buffer: Buffer.from('nom;age;accord\r\nSophie Favre;55;oui\r\n', 'utf8') });
  await expect(ligne(page, 'Nom et prénom du demandeur').locator('input')).toHaveValue('Sophie Favre');
  await expect(page.locator('.dialog .list-item', { hasText: 'age' }).locator('input')).toHaveValue('55');
});

test('un champ créé avec un format et une longueur les garde dans le fichier', async ({ app, page }) => {
  const { pdfTexte } = require('./aide');
  await app.ouvrir('vide.pdf', pdfTexte(['Demande']));
  await app.vue('organiser');
  await page.dblclick('#pages .tile:nth-child(1)');
  await page.waitForSelector('.editor', { state: 'visible', timeout: 30000 });
  await page.click('.ed-tool[data-tool="champ"]');
  const f = await page.locator('.ed-sheet').boundingBox();
  await page.mouse.move(f.x + f.width * 0.2, f.y + f.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(f.x + f.width * 0.6, f.y + f.height * 0.24, { steps: 6 });
  await page.mouse.up();
  await page.fill('#ch-lib', 'Âge');
  await page.selectOption('#ch-format', 'entier');
  await page.fill('#ch-maxlen', '3');
  await page.locator('#ch-maxlen').blur();
  await page.getByRole('button', { name: 'Terminer' }).click();
  await page.waitForSelector('.editor', { state: 'hidden', timeout: 20000 });
  const { octets } = await app.exporter();
  const s = octets.toString('latin1');
  expect(s).toMatch(/\/MaxLen 3/);
  expect(s).toMatch(/\/AktumFormat \/entier/);
  // rouvert, le champ porte son format
  await app.ouvrir('rouvert.pdf', octets);
  await app.outil('form');
  await expect(page.locator('.dialog .list-item', { hasText: 'Âge' })).toContainText('Nombre entier');
  await expect(page.locator('.dialog .list-item', { hasText: 'Âge' })).toContainText('3');
});
