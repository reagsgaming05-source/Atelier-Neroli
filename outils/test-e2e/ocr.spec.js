// La reconnaissance de texte (OCR) : jamais couverte jusqu'ici, alors que le
// moteur pèse plus de 70 % du fichier livré. Quatre choses éprouvées :
//  - une page de texte se lit ;
//  - un tableau à filets horizontaux ET verticaux se lit en entier (avec le mode
//    par défaut de la bibliothèque, il perdait huit lignes sur neuf, avec une
//    confiance annoncée de 95 %) ;
//  - deux colonnes de texte se lisent l'une après l'autre, pas ligne à ligne ;
//  - un arrêt demandé en cours de route arrête vraiment (le journal du moteur
//    effaçait la demande dans la milliseconde).
const { test, expect } = require('./aide');

// Un scan fabriqué dans la page : du texte noir sur blanc, rasterisé, collé en
// image dans un PDF — aucune couche de texte, exactement un scan.
async function scan(page, pages) {
  const b64 = await page.evaluate(async (pages) => {
    const doc = await window.PDFLib.PDFDocument.create();
    for (const contenu of pages) {
      const c = document.createElement('canvas'); c.width = 1240; c.height = 1754;
      const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = '#000'; x.strokeStyle = '#000'; x.lineWidth = 3;
      x.font = '38px "DejaVu Sans", Arial, sans-serif'; x.textBaseline = 'middle';
      if (contenu.lignes) contenu.lignes.forEach((l, i) => x.fillText(l, 120, 200 + i * 70));
      if (contenu.tableau) {
        const t = contenu.tableau, L = 120, T = 200, cw = 330, rh = 80;
        t.forEach((ligne, r) => ligne.forEach((cell, k) => { x.strokeRect(L + k * cw, T + r * rh, cw, rh); x.fillText(cell, L + k * cw + 18, T + r * rh + rh / 2); }));
      }
      const img = await doc.embedPng(c.toDataURL('image/png'));
      doc.addPage([595, 842]).drawImage(img, { x: 0, y: 0, width: 595, height: 842 });
    }
    const o = await doc.save();
    let t = ''; for (let i = 0; i < o.length; i++) t += String.fromCharCode(o[i]);
    return btoa(t);
  }, pages);
  return Buffer.from(b64, 'base64');
}

async function lancerLOcr(app, page) {
  await app.outil('ocr');
  await page.locator('.dialog').getByRole('button', { name: 'Reconnaître' }).click();
}

async function mots(page, liste) {
  const trouves = [];
  for (const m of liste) {
    await page.click('#btn-search');
    await page.fill('#se-q', m);
    await page.waitForFunction(() => document.querySelector('.dialog .list[data-fini="1"]'), null, { timeout: 60000 });
    if ((await page.locator('#se-compte').textContent()) !== '') trouves.push(m);
    await page.click('.dialog .dlg-head .x');
    await page.waitForSelector('.dialog', { state: 'detached' });
  }
  return trouves;
}

test('un scan de texte se lit', async ({ app, page }) => {
  test.setTimeout(240000);
  await app.ouvrir('scan.pdf', await scan(page, [{ lignes: ['Decision du Conseil communal', 'Objet : permis de construire', 'Parcelle numero 1234 a Vevey'] }]));
  await lancerLOcr(app, page);
  await expect.poll(() => app.dernier(), { timeout: 200000 }).toMatch(/Texte reconnu/);
  const trouves = await mots(page, ['Conseil', 'communal', 'permis', 'construire', 'Parcelle']);
  expect(trouves.length, 'au moins quatre mots sur cinq retrouvés par la recherche : ' + trouves.join(', ')).toBeGreaterThanOrEqual(4);
});

test('un tableau à filets horizontaux et verticaux se lit en entier, pas seulement son titre', async ({ app, page }) => {
  test.setTimeout(240000);
  const tableau = [
    ['Rubrique', 'Budget', 'Comptes'],
    ['Salaires', 'quarante', 'trente'],
    ['Chauffage', 'vingt', 'dixhuit'],
    ['Entretien', 'douze', 'quinze'],
    ['Honoraires', 'huit', 'neuf'],
  ];
  await app.ouvrir('budget.pdf', await scan(page, [{ lignes: ['Budget de fonctionnement 2026'], tableau }]));
  await lancerLOcr(app, page);
  await expect.poll(() => app.dernier(), { timeout: 200000 }).toMatch(/Texte reconnu/);
  const attendus = ['Salaires', 'Chauffage', 'Entretien', 'Honoraires', 'quarante', 'vingt', 'douze', 'huit'];
  const trouves = await mots(page, attendus);
  expect(trouves.length, 'les cellules du tableau sont lues (' + trouves.join(', ') + ')').toBeGreaterThanOrEqual(6);
});

test('un arrêt demandé en cours de reconnaissance arrête vraiment, et rien n\'est perdu', async ({ app, page }) => {
  test.setTimeout(240000);
  const pages = Array.from({ length: 10 }, (_, i) => ({ lignes: ['Page numero ' + (i + 1), 'Le Conseil communal siege ce soir', 'Ordre du jour : budget et comptes'] }));
  await app.ouvrir('dossier.pdf', await scan(page, pages));
  await app.outil('ocr');
  await page.locator('#ocr-quoi').selectOption('toutes');
  await page.locator('.dialog').getByRole('button', { name: 'Reconnaître' }).click();
  const annuler = page.locator('#btn-annuler-op');
  await expect(annuler).toBeVisible({ timeout: 60000 });
  // Laisser le moteur démarrer sa première page, puis demander l'arrêt.
  await page.waitForFunction(() => /Reconnaissance… page/.test(document.querySelector('#busy-text, #last, .busy') ? document.body.innerText : ''), null, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await annuler.click();
  await expect.poll(() => app.dernier(), { timeout: 120000 }).toMatch(/interrompue/);
  const dit = await app.dernier();
  const faites = Number((/sur (\d+) page/.exec(dit) || [])[1] || 0);
  expect(faites, 'moins de pages que demandé : l\'arrêt a eu lieu (« ' + dit + ' »)').toBeLessThan(10);
  expect(faites, 'ce qui était fait est gardé').toBeGreaterThanOrEqual(1);
});

test('deux colonnes se lisent l\'une après l\'autre, pas ligne à ligne (le mode « une colonne » les mélangeait)', async ({ app, page }) => {
  test.setTimeout(240000);
  const b64 = await page.evaluate(async () => {
    const doc = await window.PDFLib.PDFDocument.create();
    const c = document.createElement('canvas'); c.width = 1240; c.height = 1754;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#000'; x.font = '30px "DejaVu Sans", Arial, sans-serif'; x.textBaseline = 'middle';
    // Une vraie page : vingt-deux lignes par colonne, une gouttière étroite.
    const gauche = ['Premier alinea de la', 'colonne gauche avec du', 'texte ordinaire sur', 'plusieurs lignes pour', 'tester la lecture'];
    const droite = ['Second alinea de la', 'colonne droite avec un', 'autre texte ordinaire', 'sur plusieurs lignes', 'pour la comparaison'];
    const remplir = (base, suite) => Array.from({ length: 22 }, (_, i) => i < 5 ? base[i] : suite + ' ' + (i - 4));
    remplir(gauche, 'Ligne courante gauche numero').forEach((l, i) => x.fillText(l, 100, 150 + i * 62));
    remplir(droite, 'Ligne courante droite numero').forEach((l, i) => x.fillText(l, 720, 150 + i * 62));
    const img = await doc.embedPng(c.toDataURL('image/png'));
    doc.addPage([595, 842]).drawImage(img, { x: 0, y: 0, width: 595, height: 842 });
    const o = await doc.save(); let s = ''; for (let i = 0; i < o.length; i++) s += String.fromCharCode(o[i]); return btoa(s);
  });
  await app.ouvrir('colonnes.pdf', Buffer.from(b64, 'base64'));
  await lancerLOcr(app, page);
  await expect.poll(() => app.dernier(), { timeout: 200000 }).toMatch(/Texte reconnu/);
  await page.click('#tab-tools');
  const { octets } = await app.recolter(() => page.click('[data-tool="exp-txt"]'));
  const t = octets.toString('utf8');
  const finGauche = t.indexOf('gauche numero 17'), debutDroite = t.indexOf('Second alinea');
  expect(finGauche, 'la dernière ligne de la colonne de gauche est lue').toBeGreaterThanOrEqual(0);
  expect(debutDroite, 'le début de la colonne de droite est lu').toBeGreaterThanOrEqual(0);
  expect(finGauche, 'la colonne de gauche est lue en entier avant celle de droite').toBeLessThan(debutDroite);
});
