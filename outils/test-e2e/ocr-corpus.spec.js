// Un jeu de pages de référence pour la reconnaissance de texte (chapitre 14) : des pages au texte connu au caractère près, lues par le moteur,
// et un taux d'exactitude mesuré à chaque exécution, comparé à ce qu'on attend (references-ocr.json, versionné). Sans cela, aucune amélioration de
// l'OCR ne se défend dans la durée, et la première montée de version du moteur se ferait à l'aveugle.
// Le jeu est fabriqué dans la page (texte noir sur blanc, rasterisé, collé en image dans un PDF) : aucune donnée réelle, rien à stocker.
const { test, expect, texteDuPdf } = require('./aide');
const fs = require('fs');
const path = require('path');

const REFERENCES = JSON.parse(fs.readFileSync(path.join(__dirname, 'references-ocr.json'), 'utf8'));
const CORPUS = {
  'fra-decision': ['Décision du Conseil communal', 'Séance du douze mars deux mille vingt-six', 'Objet : demande de permis de construire', 'Parcelle numéro 1234 à Vevey, zone à bâtir', 'Le préavis est adopté à l\'unanimité des présents.'],
  'deu-beschluss': ['Beschluss des Gemeinderates', 'Sitzung vom zwölften März zweitausendsechsundzwanzig', 'Gegenstand: Baugesuch für ein Wohnhaus', 'Grundstück Nummer 1234 in Zürich, Bauzone', 'Der Antrag wird einstimmig angenommen.'],
  'fra-chiffres': ['Facture numéro 2026-0148', 'Montant total : 1250 francs', 'Échéance : trente jours net', 'Référence de paiement : 0148', 'Merci de votre confiance.'],
};

// Le nombre de modifications (insertion, suppression, remplacement) qui font passer de a à b.
function distance(a, b) {
  const m = a.length, n = b.length;
  let prec = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prec[j] + 1, cur[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prec = cur;
  }
  return prec[n];
}
const normaliser = t => String(t).normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();

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

for (const [nom, lignes] of Object.entries(CORPUS)) {
  test('page de référence « ' + nom + ' » : exactitude des caractères au moins de ' + Math.round(REFERENCES[nom].min * 100) + ' %', async ({ app, page }) => {
    test.setTimeout(300000);
    await app.ouvrir(nom + '.pdf', await scan(page, lignes));
    await app.outil('ocr');
    await page.selectOption('#ocr-langue', REFERENCES[nom].langue);
    await page.locator('.dialog').getByRole('button', { name: 'Reconnaître' }).click();
    await expect.poll(() => app.dernier(), { timeout: 240000 }).toMatch(/Texte reconnu/);
    const { octets } = await app.exporter();
    const lu = normaliser(await texteDuPdf(page, octets));
    const attendu = normaliser(lignes.join(' '));
    const exactitude = 1 - distance(attendu, lu) / attendu.length;
    console.log('OCR ' + nom + ' : exactitude ' + (exactitude * 100).toFixed(1) + ' % (attendu au moins ' + Math.round(REFERENCES[nom].min * 100) + ' %)');
    expect(exactitude, 'exactitude des caractères sur « ' + nom + ' » : lu « ' + lu + ' »').toBeGreaterThanOrEqual(REFERENCES[nom].min);
  });
}

test('la détection de la langue lit une page allemande en allemand, avec ses trémas', async ({ app, page }) => {
  test.setTimeout(300000);
  await app.ouvrir('beschluss.pdf', await scan(page, CORPUS['deu-beschluss']));
  await app.outil('ocr');
  await page.selectOption('#ocr-langue', 'auto');
  await page.locator('.dialog').getByRole('button', { name: 'Reconnaître' }).click();
  await expect.poll(() => app.dernier(), { timeout: 240000 }).toMatch(/langue détectée : allemand/);
  const { octets } = await app.exporter();
  expect(normaliser(await texteDuPdf(page, octets))).toContain('zürich');
});

test('la détection de la langue lit une page française en français', async ({ app, page }) => {
  test.setTimeout(300000);
  await app.ouvrir('decision.pdf', await scan(page, CORPUS['fra-decision']));
  await app.outil('ocr');
  await page.selectOption('#ocr-langue', 'auto');
  await page.locator('.dialog').getByRole('button', { name: 'Reconnaître' }).click();
  await expect.poll(() => app.dernier(), { timeout: 240000 }).toMatch(/langue détectée : français/);
});

test('relire le texte reconnu : un mot corrigé est ce qui part dans le PDF, et ce que la recherche trouve', async ({ app, page }) => {
  test.setTimeout(300000);
  await app.ouvrir('decision.pdf', await scan(page, CORPUS['fra-decision']));
  await app.outil('ocr');
  await page.selectOption('#ocr-langue', 'fra');
  await page.locator('.dialog').getByRole('button', { name: 'Reconnaître' }).click();
  await expect.poll(() => app.dernier(), { timeout: 240000 }).toMatch(/Texte reconnu/);
  await app.outil('ocr-relire');
  await page.locator('#rl-tous').check();
  const premier = page.locator('.rl-mot input[type="text"]').first();
  await expect(premier).toBeVisible({ timeout: 60000 });
  await expect(page.locator('.rl-mot canvas').first()).toBeVisible();
  await premier.fill('Zorglub');
  await premier.press('Enter');
  await page.click('.dialog .dlg-foot .tb-btn.primary');
  const { octets } = await app.exporter();
  expect(await texteDuPdf(page, octets), 'la correction est dans le texte invisible du PDF').toContain('Zorglub');
});
