// « Modifier le texte existant » sur des PDF faits par d'autres logiciels que le nôtre (LibreOffice, Chromium, Ghostscript, Cairo, reportlab, un scan à
// texte caché) : la correction se joue dans l'application, comme un utilisateur, puis poppler et qpdf — qui ne sont pas notre code — jugent la page.
//
// Ce qu'on exige de chaque correction : le nouveau texte est lu dans la page ; l'ancien n'est plus lisible, ni à l'écran, ni dans le copier-coller, ni dans les
// octets du fichier ; aucun autre mot de la page ne bouge ; aucun mot n'en recouvre un autre ; et le rendu hors de la zone corrigée ne change pas d'un point.
// Les PDF de `fixtures/texte/` sont inventés (noms, adresses et montants de pure fiction) ; ils viennent de moteurs aux flux très différents : un
// affichage par ligne (LibreOffice), une lettre par affichage (Chromium), une ligne de tableau d'un seul tenant avec de grands écarts (Ghostscript).
const fs = require('fs');
const path = require('path');
const { test, expect } = require('./aide');
const P = require('./modifier-texte-outils');

test.afterAll(() => P.nettoyer());

const norm = s => s.replace(/\s+/g, ' ').trim();
const journalDe = page => page.evaluate(() => window.aktumDiagnostic().map(j => j.contexte + ' : ' + j.msg));
// La correction s'est-elle posée par-dessus (recouvrement) plutôt que réécrite dans la page ?
const parDessus = journal => journal.some(j => /Correction posée par-dessus/.test(j));

// Sélectionne `cible` dans la zone de saisie (texte brut) ; faux si elle n'y est pas.
async function selectionner(page, cible) {
  return page.evaluate((cible) => {
    const z = document.querySelector('.ed-riche');
    let t = '';
    const parcourir = el => el.childNodes.forEach(n => { if (n.nodeType === 3) t += n.nodeValue; else if (n.nodeName === 'BR') t += '\n'; else parcourir(n); });
    parcourir(z);
    let i = t.indexOf(cible);
    if (i < 0) i = t.replace(/ /g, ' ').indexOf(cible);
    if (i < 0) return false;
    const point = index => {
      let reste = index, cible2 = null;
      const aller = el => {
        for (const n of Array.from(el.childNodes)) {
          if (cible2) return;
          if (n.nodeType === 3) { const L = n.nodeValue.length; if (reste <= L) { cible2 = { node: n, offset: reste }; return; } reste -= L; }
          else if (n.nodeName === 'BR') { if (reste === 0) { cible2 = { node: z, offset: Array.from(z.childNodes).indexOf(n) }; return; } reste -= 1; }
          else aller(n);
        }
      };
      aller(z);
      return cible2 || { node: z, offset: z.childNodes.length };
    };
    const a = point(i), b = point(i + cible.length), r = document.createRange();
    r.setStart(a.node, a.offset); r.setEnd(b.node, b.offset);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r); z.focus();
    return true;
  }, cible);
}

// Ouvre le fixture dans l'éditeur de page, outil « Modifier le texte existant » pris, et pose le curseur sur le mot visé.
async function ouvrirLeBloc(page, app, fixture, ou, rang) {
  const f = path.join(P.CORPUS, fixture);
  const avant = P.mots(f, 1);
  const trouves = P.trouver(avant.mots, ou, rang);
  expect(trouves, 'le mot visé est dans le fixture : ' + ou).not.toBeNull();
  await app.ouvrir(fixture, fs.readFileSync(f));
  await app.vue('organiser');
  await page.dblclick('#pages .tile:nth-child(1)');
  await expect(page.locator('.editor')).toBeVisible();
  await page.click('.ed-tool[data-tool="edittext"]');
  await page.waitForSelector('.ed-overlay .bloc', { timeout: 20000 });
  const feuille = await page.locator('.ed-sheet').boundingBox();
  const k = feuille.width / avant.w;
  const m0 = trouves[0];
  await page.mouse.click(feuille.x + (m0.x0 + m0.x1) / 2 * k, feuille.y + (m0.y0 + m0.y1) / 2 * k);
  await page.waitForSelector('.ed-riche', { timeout: 8000 });
  return { f, avant, trouves };
}

// Remplace `cible` par `nouveau` (\n = Entrée), valide, termine, exporte. Rend les deux PDF (sur disque), le journal, l'avis affiché.
async function corriger(page, app, fixture, cible, nouveau, opts) {
  opts = opts || {};
  const ctx = await ouvrirLeBloc(page, app, fixture, opts.ou || cible, opts.rang);
  expect(await selectionner(page, cible), 'la cible est dans le bloc ouvert : ' + cible).toBe(true);
  if (nouveau === '') await page.keyboard.press('Delete');
  else {
    const lignes = nouveau.split('\n');
    for (let q = 0; q < lignes.length; q++) { if (q) await page.keyboard.press('Enter'); if (lignes[q]) await page.keyboard.insertText(lignes[q]); }
  }
  await page.keyboard.press('Escape');
  await page.waitForSelector('.ed-riche', { state: 'detached', timeout: 8000 });
  const avis = await page.evaluate(() => (document.querySelector('#toast') ? document.querySelector('#toast').innerText : ''));
  await page.getByRole('button', { name: 'Terminer' }).click();
  await page.waitForSelector('.editor', { state: 'hidden', timeout: 20000 });
  const { octets } = await app.exporter();
  const apres = P.ecrire(octets, 'apres.pdf');
  return Object.assign(ctx, { apres, avis, journal: await journalDe(page), octets });
}

// Le jugement commun : nouveau texte lu, ancien disparu, rien d'autre qui bouge, aucun chevauchement nouveau, rendu intact hors de la zone.
function juger(r, att, zone) {
  const apresMots = P.mots(r.apres, 1);
  const lu = norm(P.texte(r.apres, 1));
  (att.attendu || []).forEach(a => expect(lu, 'texte attendu : ' + a).toContain(norm(a)));
  const brut = P.octets(r.apres);
  (att.absent || []).forEach(a => {
    expect(lu, 'ancien texte encore lisible : ' + a).not.toContain(a);
    expect(brut, 'ancien texte encore dans les octets : ' + a).not.toContain(a);
  });
  const col = P.collateral(r.avant.mots, apresMots.mots, zone);
  expect(col.bouges, 'mots déplacés hors de la zone').toEqual([]);
  expect(col.perdus, 'mots perdus hors de la zone').toEqual([]);
  if (!att.chevauche) expect(P.chevauchements(apresMots.mots).length, 'mots qui en recouvrent d\'autres').toBeLessThanOrEqual(P.chevauchements(r.avant.mots).length);
  if (!att.rendu) expect(P.pixels(r.f, r.apres, 1, zone).hors, 'points du rendu qui changent hors de la zone').toBeLessThanOrEqual(30);
  return apresMots;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------

test('un nom dans un bloc d\'adresse : la ligne d\'à côté ne bouge pas, l\'ancien nom est parti', async ({ page, app }) => {
  const r = await corriger(page, app, 'lettre-lo-sans.pdf', 'Claire Exemple', 'Paul Modèle');
  const zone = P.zoneDe(r.avant, r.trouves, { marge: 10 });
  juger(r, { attendu: ['Madame Paul Modèle'], absent: ['Claire'] }, zone);
  // la ligne du dessous reste sa propre ligne
  expect(P.texte(r.apres, 1).split('\n').some(l => /Chemin des Vignes 12/.test(l) && !/Madame|Modèle/.test(l))).toBe(true);
  expect(parDessus(r.journal), 'réécrit dans la page, sans recouvrement').toBe(false);
});

test('allonger un nom de bloc d\'adresse ne fait pas passer un mot sur la ligne du dessous', async ({ page, app }) => {
  // le défaut vu : le nom s'allongeait, un mot passait à la ligne suivante et se fondait dans la ligne du téléphone
  const r = await corriger(page, app, 'lettre-lo-sans.pdf', 'Claire Exemple', 'Anne-Sophie Exemple-Montreux');
  const apres = P.texte(r.apres, 1).split('\n');
  expect(apres.some(l => /Madame Anne-Sophie Exemple-Montreux/.test(l))).toBe(true);
  expect(apres.some(l => /Chemin des Vignes 12/.test(l) && !/Madame|Montreux/.test(l))).toBe(true);
  expect(apres.some(l => /1001 Exemple-sur-Lac/.test(l) && !/Madame|Vignes/.test(l))).toBe(true);
  const zone = P.zoneDe(r.avant, r.trouves, { marge: 140 });
  juger(r, { absent: ['Claire'] }, zone);
});

test('des lettres que la police du document n\'a pas : écrites dans une police de même dessin, jamais en Helvetica de secours', async ({ page, app }) => {
  const r = await corriger(page, app, 'lettre-lo-sans.pdf', 'Claire', 'Zoë-Łucja');
  const zone = P.zoneDe(r.avant, r.trouves, { marge: 40 });
  juger(r, { attendu: ['Madame Zoë-Łucja Exemple'], absent: ['Claire'] }, zone);
  // (OpenSymbol est la police des puces du document, qui n'est pas touchée)
  const familles = new Set(P.polices(r.apres).filter(n => !/OpenSymbol/.test(n)).map(P.famille));
  expect(Array.from(familles), 'toutes les polices du texte ont le dessin d\'Arial').toEqual(['sans']);
});

test('un mot en gras dont des lettres manquent dans la police : mesuré en gras, la virgule qui suit ne le touche pas', async ({ page, app }) => {
  const r = await corriger(page, app, 'attestation-lo.pdf', 'Madame Claire Exemple', 'Monsieur Paul Modèle-Lüscher');
  const apresMots = P.mots(r.apres, 1);
  expect(P.chevauchements(apresMots.mots), 'aucun mot n\'en touche un autre').toEqual([]);
  expect(norm(P.texte(r.apres, 1))).toContain('Monsieur Paul Modèle-Lüscher');
  // le nom reste en gras
  const gras = require('child_process').spawnSync('pdftohtml', ['-xml', '-stdout', '-i', '-noframes', r.apres], { encoding: 'utf8' }).stdout;
  expect(/<b>Modèle-Lüscher<\/b>/.test(gras), 'le nom corrigé est en gras').toBe(true);
});

test('un paragraphe justifié : un mot plus long fait couler le texte, le reste de la page ne bouge pas', async ({ page, app }) => {
  const r = await corriger(page, app, 'lettre-lo-sans.pdf', 'complet', 'complet et conforme');
  const zone = P.zoneDe(r.avant, r.trouves, { haut: 1, bas: 3, large: true });
  juger(r, { attendu: ['complet et conforme'] }, zone);
});

test('un mot court à la place d\'un mot long, au milieu d\'un paragraphe', async ({ page, app }) => {
  const r = await corriger(page, app, 'lettre-lo-sans.pdf', 'trente jours', '30 jours');
  const zone = P.zoneDe(r.avant, r.trouves, { haut: 3, bas: 2, large: true });
  juger(r, { attendu: ['30 jours'], absent: ['trente jours'] }, zone);
});

test('une puce : la puce reste, le texte change, la ligne d\'après ne bouge pas', async ({ page, app }) => {
  const r = await corriger(page, app, 'lettre-lo-sans.pdf', 'Formulaire de demande signé', 'Formulaire de demande dûment signé');
  const zone = P.zoneDe(r.avant, r.trouves, { marge: 60 });
  juger(r, { attendu: ['Formulaire de demande dûment signé'] }, zone);
});

test('un montant en gras au milieu d\'une ligne : la suite de la ligne reste en place', async ({ page, app }) => {
  const r = await corriger(page, app, 'lettre-lo-sans.pdf', 'CHF 1 250.50', 'CHF 1 350.50', { ou: 'Montant total à payer' });
  const zone = P.zoneDe(r.avant, r.trouves, { marge: 20 });
  juger(r, { attendu: ['Montant total à payer : CHF 1 350.50 (TVA comprise)'], absent: ['1 250.50 ('] }, zone);
});

test('une date calée à droite grandit vers la gauche : son bord droit ne bouge pas', async ({ page, app }) => {
  const r = await corriger(page, app, 'lettre-lo-sans.pdf', 'le 12 mars 2026', 'le 23 septembre 2026');
  const zone = P.zoneDe(r.avant, r.trouves, { marge: 80 });
  const apres = juger(r, { attendu: ['le 23 septembre 2026'], absent: ['12 mars'] }, zone);
  const y = r.trouves[0].y1;
  const droite = ms => Math.max.apply(null, ms.filter(m => Math.abs(m.y1 - y) < 2.5).map(m => m.x1));
  expect(Math.abs(droite(apres.mots) - droite(r.avant.mots))).toBeLessThan(1);
});

test('un chiffre dans une ligne de tableau que Ghostscript écrit d\'un seul tenant : les autres cellules ne bougent pas', async ({ page, app }) => {
  // une ligne entière dans un seul TJ, séparée par des écarts de plusieurs centaines de points : réécrite d'un bloc, elle perdrait ses colonnes
  const r = await corriger(page, app, 'lettre-gs.pdf', '210 000.00', '1 215 500.00');
  const zone = P.zoneDe(r.avant, r.trouves, { marge: 60 });
  const apres = juger(r, { attendu: ['1 215 500.00'], absent: ['210 000.00'] }, zone);
  // la cellule est calée à droite : le nouveau montant finit là où finissait l'ancien
  const neuf = P.trouver(apres.mots, '1 215 500.00');
  expect(neuf, 'le nouveau montant est lu').not.toBeNull();
  expect(Math.abs(neuf[neuf.length - 1].x1 - r.trouves[r.trouves.length - 1].x1), 'la cellule calée à droite garde son bord droit').toBeLessThan(1);
  expect(parDessus(r.journal), 'réécrit dans la page, sans recouvrement').toBe(false);
});

test('un PDF de Chromium (une lettre par affichage) : la page reste du texte, rien n\'est converti en image', async ({ page, app }) => {
  const r = await corriger(page, app, 'lettre-chromium.pdf', 'Claire Exemple', 'Paul Modèle');
  const zone = P.zoneDe(r.avant, r.trouves, { marge: 20 });
  juger(r, { attendu: ['Madame Paul Modèle'], absent: ['Claire'] }, zone);
  expect(P.images(r.apres, 1), 'aucune image : la page garde son texte').toBe(0);
});

for (const fixture of ['lettre-cairo.pdf', 'lettre-reportlab.pdf']) {
  test('un PDF fait par ' + fixture.replace(/^lettre-|\.pdf$/g, '') + ' : le même nom corrigé, la même page autour', async ({ page, app }) => {
    const r = await corriger(page, app, fixture, 'Claire Exemple', 'Paul Modèle');
    const zone = P.zoneDe(r.avant, r.trouves, { marge: 20 });
    juger(r, { attendu: ['Madame Paul Modèle'], absent: ['Claire'] }, zone);
  });
}

test('un titre centré qui s\'allonge : il grandit des deux côtés et reste centré', async ({ page, app }) => {
  const r = await corriger(page, app, 'attestation-lo.pdf', 'DOMICILE', 'DOMICILE ET DE SÉJOUR');
  const zone = P.zoneDe(r.avant, r.trouves, { marge: 60 });
  const apres = juger(r, { attendu: ['ATTESTATION DE DOMICILE ET DE SÉJOUR'] }, zone);
  const y = r.trouves[0].y1;
  const centre = ms => { const l = ms.filter(m => Math.abs(m.y1 - y) < 2.5); return (Math.min.apply(null, l.map(m => m.x0)) + Math.max.apply(null, l.map(m => m.x1))) / 2; };
  expect(Math.abs(centre(apres.mots) - centre(r.avant.mots)), 'le centre du titre ne bouge pas').toBeLessThan(1.5);
});

test('une page enregistrée en paysage et affichée droite (/Rotate 90) : la correction tombe au bon endroit', async ({ page, app }) => {
  const r = await corriger(page, app, 'lettre-rot90-droit.pdf', 'Claire Exemple', 'Paul Modèle');
  const zone = P.zoneDe(r.avant, r.trouves, { marge: 20 });
  juger(r, { attendu: ['Madame Paul Modèle'], absent: ['Claire'] }, zone);
});

test('un scan dont la couche de texte est cachée : la correction se voit à l\'écran, et l\'ancien texte caché s\'en va', async ({ page, app }) => {
  const r = await corriger(page, app, 'scan-ocr.pdf', 'Claire Exemple', 'Paul Modèle');
  const zone = P.zoneDe(r.avant, r.trouves, { marge: 20 });
  juger(r, { attendu: ['Madame Paul Modèle'], absent: ['Claire'], rendu: true }, zone);
  // ce qu'on lit est l'image : sans recouvrement, la page n'aurait pas changé d'un point
  const px = P.pixels(r.f, r.apres, 1, zone);
  expect(px.dans, 'la zone corrigée a changé à l\'écran').toBeGreaterThan(200);
  expect(px.hors, 'le reste du scan est intact').toBeLessThanOrEqual(30);
  expect(parDessus(r.journal), 'posée par-dessus : le texte caché n\'est pas ce qu\'on voit').toBe(true);
});

test('un texte couché sur la page : l\'outil le dit, au lieu de rester muet', async ({ page, app }) => {
  const f = path.join(P.CORPUS, 'lettre-rot90.pdf');
  await app.ouvrir('lettre-rot90.pdf', fs.readFileSync(f));
  await app.vue('organiser');
  await page.dblclick('#pages .tile:nth-child(1)');
  await expect(page.locator('.editor')).toBeVisible();
  await page.click('.ed-tool[data-tool="edittext"]');
  await expect(page.locator('#toast')).toContainText(/couché|à l'envers/, { timeout: 15000 });
  expect(await page.locator('.ed-overlay .bloc').count(), 'aucun bloc proposé : le texte n\'est pas droit').toBe(0);
});

test('un retour à la ligne dans un bloc qui n\'a pas la place : le texte voisin est touché, et l\'utilisateur en est prévenu', async ({ page, app }) => {
  const r = await corriger(page, app, 'lettre-lo-sans.pdf', 'Claire Exemple', 'Claire Exemple\nCase postale 45');
  expect(r.avis).toMatch(/touche le texte voisin/);
  // les deux lignes se recouvrent : pdftotext les entremêle, on cherche donc les mots un à un
  const mots = P.mots(r.apres, 1).mots.map(m => m.t);
  ['Case', 'postale', '45'].forEach(m => expect(mots, 'le mot ajouté est dans la page : ' + m).toContain(m));
});

test('annuler et rétablir dans la zone de saisie : chaque frappe se défait, le style des lettres revient avec elles', async ({ page, app }) => {
  await ouvrirLeBloc(page, app, 'lettre-lo-sans.pdf', 'Claire Exemple');
  const lire = () => page.evaluate(() => document.querySelector('.ed-riche').innerText);
  const avant = await lire();
  expect(await selectionner(page, 'Claire')).toBe(true);
  await page.keyboard.insertText('Paul');
  await expect.poll(lire).toContain('Madame Paul Exemple');
  await page.keyboard.press('Control+z');
  await expect.poll(lire).toBe(avant);
  await page.keyboard.press('Control+y');
  await expect.poll(lire).toContain('Madame Paul Exemple');
  await page.keyboard.press('Escape');
});
