// Point 1 — Lire : le texte se sélectionne et se copie par-dessus la page,
// et un double-clic sur du vide ouvre l'éditeur sans gêner la sélection.
const { test, expect, pdfTexte, pdfVide } = require('./aide');

test('la couche de texte se pose par-dessus la page', async ({ app, page }) => {
  await app.ouvrir('lettre.pdf', pdfTexte(['Commune de Blonay', 'Décompte des frais 2026']));
  const couche = page.locator('#lecture .feuille-vue .couche-texte');
  await expect(couche).toHaveCount(1);
  await expect(couche).toContainText('Commune de Blonay');
  await expect(couche).toContainText('Décompte des frais 2026');
  // Invisible mais sélectionnable : c'est la page dessous qu'on voit.
  const lisible = await couche.locator('span').first().evaluate((e) => getComputedStyle(e).color);
  expect(lisible).toBe('rgba(0, 0, 0, 0)');
});

test('un double-clic sélectionne le mot, et n\'ouvre pas l\'éditeur', async ({ app, page }) => {
  await app.ouvrir('lettre.pdf', pdfTexte(['Commune de Blonay']));
  const mot = page.locator('#lecture .couche-texte span').first();
  // La couche de texte étire ses boîtes pour coller à la largeur du PDF : les
  // glyphes se serrent à gauche, et le centre de la boîte tombe après le mot.
  const boite = await mot.boundingBox();
  await page.mouse.dblclick(boite.x + 10, boite.y + boite.height / 2);
  const choisi = await page.evaluate(() => String(window.getSelection()));
  expect(choisi.trim(), 'le mot cliqué est sélectionné').toBe('Commune');
  await expect(page.locator('.editor')).toBeHidden();
});

test('un double-clic sur le vide de la page ouvre l\'éditeur', async ({ app, page }) => {
  await app.ouvrir('vide.pdf', pdfVide(1));
  const feuille = page.locator('#lecture .feuille-vue').first();
  const boite = await feuille.boundingBox();
  await page.mouse.dblclick(boite.x + boite.width / 2, boite.y + boite.height - 30);
  await expect(page.locator('.editor')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.editor')).toBeHidden();
});

test('la sélection couvre plusieurs lignes et se relit entière', async ({ app, page }) => {
  await app.ouvrir('lettre.pdf', pdfTexte(['Première ligne du document', 'Seconde ligne du document']));
  await page.waitForFunction(() => document.querySelectorAll('#lecture .couche-texte span').length >= 2);
  const choisi = await page.evaluate(() => {
    const spans = document.querySelectorAll('#lecture .couche-texte span');
    const r = document.createRange();
    r.setStart(spans[0], 0);
    r.setEnd(spans[spans.length - 1], spans[spans.length - 1].childNodes.length);
    const s = window.getSelection();
    s.removeAllRanges(); s.addRange(r);
    return String(s);
  });
  expect(choisi).toContain('Première ligne');
  expect(choisi).toContain('Seconde ligne');
});

test('deux pages côte à côte, et le zoom se règle', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(4));
  await page.click('#vue-deux');
  await expect(page.locator('#vue-deux')).toHaveAttribute('aria-pressed', 'true');
  // Comme un livre : la couverture seule, puis les pages par paires.
  await expect(page.locator('#lecture .rangee')).toHaveCount(3);
  await page.click('#vue-deux');
  await expect(page.locator('#lecture .rangee')).toHaveCount(0);

  await page.selectOption('#zoom-niveau', '0.5');
  const petite = await page.locator('#lecture .feuille-vue').first().boundingBox();
  await page.selectOption('#zoom-niveau', '1');
  await expect.poll(async () => (await page.locator('#lecture .feuille-vue').first().boundingBox()).width)
    .toBeGreaterThan(petite.width);
});

test('le numéro de la page affichée suit le défilement', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', pdfVide(6));
  await expect(page.locator('#page-total')).toHaveText('/ 6');
  await page.fill('#page-num', '5');
  await page.press('#page-num', 'Enter');
  await expect.poll(() => page.inputValue('#page-num'), { timeout: 20000 }).toBe('5');
});

// Une sélection ne doit ramasser que le document. Le mobilier de
// l'application — la légende sous chaque page, le bouton « Modifier », la
// barre d'état — se trouvait entre deux couches de texte et partait avec, si
// bien qu'on collait « 3 / 12 · rapport » et « Modifier » au milieu d'un
// paragraphe. Le rendre non sélectionnable ne suffit pas : le navigateur le
// ramasse quand même dès que la sélection l'enjambe.
const denseDeux = () => require('./aide').pdfDe([
  [{ x: 70, y: 760, taille: 12, texte: 'Commune de Blonay' },
   { x: 70, y: 735, taille: 12, texte: 'Decompte des frais' },
   { x: 70, y: 710, taille: 12, texte: 'Transport scolaire' }],
  [{ x: 70, y: 760, taille: 12, texte: 'Seconde page du document' }],
]);
const selection = (page) => page.evaluate(() => String(document.getSelection()));

test('une sélection qui déborde d\'une page ne ramasse pas l\'interface', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', denseDeux());
  await page.waitForSelector('#lecture .couche-texte span');
  const feuille = page.locator('#lecture .feuille-vue').first();
  const bf = await feuille.boundingBox();
  const premier = await feuille.locator('.couche-texte span').first().boundingBox();

  // Le geste qui posait problème : partir du texte et descendre bien au-delà
  // du bas de la page, jusque dans la suivante.
  await page.mouse.move(premier.x + 2, premier.y + premier.height / 2);
  await page.mouse.down();
  await page.mouse.move(bf.x + bf.width - 20, bf.y + bf.height + 260, { steps: 25 });
  await page.mouse.up();

  const pris = await selection(page);
  expect(pris, 'le texte des deux pages est bien pris').toContain('Commune de Blonay');
  expect(pris).toContain('Seconde page du document');
  expect(pris, 'la légende de la page ne part pas avec').not.toMatch(/\d+ \/ \d+/);
  expect(pris, 'le bouton de retouche ne part pas avec').not.toContain('Modifier');
  expect(pris, 'la barre d\'état ne part pas avec').not.toContain('document ·');
  expect(pris).not.toContain('pages ·');
});

test('la légende et le bouton restent lisibles à l\'écran', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', denseDeux());
  await page.waitForSelector('#lecture .feuille-vue .num');
  // Le texte est posé par la feuille de style : il s'affiche sans être du
  // contenu sélectionnable, et le lecteur d'écran a son propre libellé.
  const legende = page.locator('#lecture .feuille-vue .num').first();
  await expect(legende).toHaveAttribute('data-legende', /^1 \/ 2/);
  await expect(legende).toHaveAttribute('aria-label', /^Page 1 sur 2/);
  expect(await legende.evaluate((e) => getComputedStyle(e, '::after').content)).toContain('1 / 2');
  const bouton = page.locator('#lecture .feuille-vue .retoucher').first();
  await expect(bouton).toHaveAttribute('aria-label', 'Modifier cette page');
  expect(await bouton.evaluate((e) => getComputedStyle(e, '::after').content)).toContain('Modifier');
});

test('l\'interface hors du document ne se sélectionne pas', async ({ app, page }) => {
  await app.ouvrir('rapport.pdf', denseDeux());
  await page.waitForSelector('#lecture .couche-texte span');
  const dehors = await page.evaluate(() => {
    const pris = (s) => {
      const e = document.querySelector(s);
      return e ? getComputedStyle(e).userSelect : 'absent';
    };
    return { barre: pris('.statusbar'), outils: pris('.toolbar'), cote: pris('.side'),
      texte: pris('#lecture .couche-texte') };
  });
  expect(dehors.barre).toBe('none');
  expect(dehors.outils).toBe('none');
  expect(dehors.cote).toBe('none');
  expect(dehors.texte, 'le texte des pages reste sélectionnable').toBe('text');
});

// L'interface est devenue non sélectionnable ; la zone de saisie de l'éditeur,
// elle, doit le rester — sans quoi on ne peut plus ni corriger un mot ni
// choisir ce qu'on remplace.
test('la zone de saisie de l\'éditeur reste sélectionnable', async ({ app, page }) => {
  await app.ouvrir('lettre.pdf', pdfTexte(['Commune de Blonay']));
  await app.vue('organiser');
  await page.dblclick('#pages .tile:nth-child(1)');
  await expect(page.locator('.editor')).toBeVisible();
  await page.click('.ed-tool[data-tool="edittext"]');
  // La feuille est à l'échelle de la page : la ligne est posée sur la ligne de
  // base 760, soit 82 points sous le haut d'une page de 842.
  const feuille = await page.locator('.ed-sheet').boundingBox();
  const k = feuille.height / 842;
  await page.mouse.click(feuille.x + 100 * k, feuille.y + (842 - 756) * k);
  const zone = page.locator('.ed-riche');
  await expect(zone).toBeVisible();
  expect(await zone.evaluate((e) => getComputedStyle(e).userSelect),
    'sans quoi on ne pourrait plus choisir ce qu\'on remplace').not.toBe('none');
  await page.keyboard.press('Control+a');
  expect(await page.evaluate(() => String(document.getSelection()))).toContain('Commune');
});
