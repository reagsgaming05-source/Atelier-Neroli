// Remplir un formulaire en série : une ligne du CSV, une copie. Le test fabrique
// un vrai formulaire (champs texte, case, liste), fournit un CSV avec une case
// ambiguë et un choix qui n'existe pas, et relit ce que contient chaque copie.
const { test, expect, pdfTexte, textesDuPdf, compterPages } = require('./aide');

async function formulaire(page) {
  const b64 = await page.evaluate(async () => {
    const { PDFDocument } = window.PDFLib;
    const d = await PDFDocument.create();
    const p = d.addPage([595, 842]);
    const f = d.getForm();
    p.drawText('Convocation', { x: 70, y: 780, size: 18 });
    [['Nom', 700], ['Prenom', 660], ['Commune', 620]].forEach(([nom, y]) => f.createTextField(nom).addToPage(p, { x: 70, y, width: 250, height: 20 }));
    f.createCheckBox('Accord').addToPage(p, { x: 70, y: 580, width: 16, height: 16 });
    const dd = f.createDropdown('Etat civil');
    dd.addOptions(['Célibataire', 'Marié']);
    dd.addToPage(p, { x: 70, y: 540, width: 150, height: 20 });
    const o = await d.save();
    let s = ''; for (let i = 0; i < o.length; i++) s += String.fromCharCode(o[i]);
    return btoa(s);
  });
  return Buffer.from(b64, 'base64');
}

const CSV = '﻿Nom;Prénom;Commune;Accord;État civil\r\n'
  + 'Dupont;Marie;Lacville;oui;marié\r\n'
  + 'Martin;Léa;Montclair;non;célibataire\r\n'
  + 'Rey;Noé;Lacville;peut-être;veuf\r\n';

async function preparer(app, page) {
  await app.ouvrir('convocation.pdf', await formulaire(page));
  // La détection des champs se fait après l'ouverture.
  await page.waitForFunction(() => document.querySelector('#tab-tools') !== null);
  await app.outil('serie');
  await page.setInputFiles('#serie-csv', { name: 'liste.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV, 'utf8') });
  await expect(page.locator('.dialog')).toContainText('liste.csv : 3 lignes, 5 colonnes');
}

test('chaque ligne du CSV fait une copie ; ce qui n\'est pas compris est dit avant, avec sa ligne', async ({ app, page }) => {
  await preparer(app, page);
  const d = page.locator('.dialog');
  await expect(d).toContainText('5 champs reliés sur 5');
  await expect(d).toContainText('2 avis');
  await expect(d).toContainText('Ligne 3, « Accord » → « Accord » : « peut-être » n\'est pas compris');
  await expect(d).toContainText('Ligne 3, « État civil » → « Etat civil » : « veuf » n\'est pas un des choix');
  await page.fill('#serie-nom', '{Nom}-{Prénom}');
  await expect(d).toContainText('Premier fichier : Dupont-Marie.pdf');

  const avantModifie = await app.estModifie();
  const { nom, octets } = await app.recolter(() => page.click('#serie-lancer'));
  expect(nom).toBe('convocation-serie.zip');
  const contenu = await page.evaluate(async (b64) => {
    const z = await window.JSZip.loadAsync(b64, { base64: true });
    const sortie = {};
    for (const n of Object.keys(z.files)) sortie[n] = await z.files[n].async('base64');
    return sortie;
  }, Buffer.from(octets).toString('base64'));
  expect(Object.keys(contenu).sort()).toEqual(['Dupont-Marie.pdf', 'Martin-Léa.pdf', 'Rey-Noé.pdf']);

  const t1 = (await textesDuPdf(page, Buffer.from(contenu['Dupont-Marie.pdf'], 'base64'))).join(' ');
  expect(t1).toContain('Dupont');
  expect(t1).toContain('Marie');
  expect(t1).toContain('Lacville');
  expect(t1).toContain('Marié');
  const t2 = (await textesDuPdf(page, Buffer.from(contenu['Martin-Léa.pdf'], 'base64'))).join(' ');
  expect(t2).toContain('Martin');
  expect(t2).toContain('Montclair');
  expect(t2).toContain('Célibataire');
  expect(t2, 'la copie de Martin ne porte rien de celle de Dupont').not.toContain('Dupont');
  const t3 = (await textesDuPdf(page, Buffer.from(contenu['Rey-Noé.pdf'], 'base64'))).join(' ');
  expect(t3).toContain('Rey');
  expect(t3, 'le choix inexistant n\'est pas inventé').not.toContain('veuf');
  expect(await app.estModifie(), 'la série ne change pas le document ouvert').toBe(avantModifie);
});

test('« Un seul PDF » met les copies bout à bout, aplaties', async ({ app, page }) => {
  await preparer(app, page);
  await page.click('#serie-sortie button[data-value="un"]');
  await expect(page.locator('#serie-aplatir')).toBeDisabled();
  const { nom, octets } = await app.recolter(() => page.click('#serie-lancer'));
  expect(nom).toBe('convocation-serie.pdf');
  expect(compterPages(octets)).toBe(3);
  const t = await textesDuPdf(page, octets);
  expect(t[0]).toContain('Dupont');
  expect(t[1]).toContain('Martin');
  expect(t[2]).toContain('Rey');
  expect(t[1], 'chaque page porte sa ligne, pas celle d\'une autre').not.toContain('Dupont');
});

test('un CSV sans ligne de données, ou un document sans formulaire, le dit au lieu de produire', async ({ app, page }) => {
  await app.ouvrir('lettre.pdf', pdfTexte(['Bonjour']));
  await app.outil('serie');
  await expect(page.locator('.dialog')).toContainText('Aucun champ de formulaire');
  await app.fermerDialogue();

  await app.ouvrir('convocation.pdf', await formulaire(page));
  await page.waitForFunction(() => document.querySelector('#tab-tools') !== null);
  await app.outil('serie');
  await page.setInputFiles('#serie-csv', { name: 'vide.csv', mimeType: 'text/csv', buffer: Buffer.from('Nom;Prénom\n', 'utf8') });
  await expect(page.locator('.dialog')).toContainText('il faut une ligne d\'en-têtes et au moins une ligne de données');
  await expect(page.locator('#serie-lancer')).toBeDisabled();
});

test('un CSV en Windows-1252 garde ses accents', async ({ app, page }) => {
  await app.ouvrir('convocation.pdf', await formulaire(page));
  await page.waitForFunction(() => document.querySelector('#tab-tools') !== null);
  await app.outil('serie');
  // Un fichier entier en Windows-1252 (« é » = l'octet 0xE9, pas de l'UTF-8 valide), comme l'exportait l'ancien Excel.
  const ancien = Buffer.from('Nom;Prénom\nDupont;Zoé\n', 'latin1');
  await page.setInputFiles('#serie-csv', { name: 'ancien.csv', mimeType: 'text/csv', buffer: ancien });
  await expect(page.locator('.dialog')).toContainText('1 ligne, 2 colonnes');
  await page.click('#serie-sortie button[data-value="un"]');
  const { octets } = await app.recolter(() => page.click('#serie-lancer'));
  const t = (await textesDuPdf(page, octets)).join(' ');
  expect(t).toContain('Zoé');
});
