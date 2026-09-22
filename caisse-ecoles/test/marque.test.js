/*
 * La marque de la pièce : le petit code QR imprimé sur la fiche « PIÈCE COMPTABLE ».
 *
 * Ce qui doit tenir : ce qu'on imprime, on doit le relire — y compris sur une feuille scannée à
 * l'envers, de travers, ou passée au « PDF compact » du copieur qui écrase les nuances de gris.
 * Et la marque ne doit rien dire de la pièce à qui la trouverait : ni nom, ni montant.
 *
 * Noms fictifs : A. Berger, Ch. Dupraz, T. Morel, L. Duvernay, S. Monod.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../src/marque.js');
const R = require('../src/registre.js');

/* ---------------- Ce que la marque dit, et ne dit pas ---------------- */

test('la marque désigne une pièce d\'une année, et rien d\'autre', () => {
  const t = M.ecrire(2026, 'plx9k2m3abcde');
  assert.equal(t, 'CB1-2026-PLX9K2M3ABCDE');
  assert.deepEqual(M.lire(t), { annee: 2026, id: 'plx9k2m3abcde' });
});

test('la marque ne porte ni nom, ni montant, ni libellé', () => {
  const reg = R.emptyRegister(2026, { openingAmount: 0 });
  const p = R.newPiece(reg);
  Object.assign(p, { no: 12, type: 'REMBOURSEMENT', detail: 'collation du chœur', personne: 'A. Berger', montant: 29.7, compte: '51000.3662.50' });
  const t = M.ecrire(reg.annee, p.id);
  for (const secret of ['Berger', 'BERGER', '29.7', '2970', 'collation', 'COLLATION', '51000']) {
    assert.ok(!t.includes(secret), `la marque laisse voir « ${secret} »`);
  }
  // ce qu'elle contient : la marque de l'application, l'année, l'identifiant — trois morceaux
  assert.equal(t.split('-').length, 3);
});

test('un identifiant de pièce vraiment produit par le registre tient dans la marque', () => {
  const reg = R.emptyRegister(2026, { openingAmount: 0 });
  for (let i = 0; i < 50; i++) {
    const p = R.newPiece(reg);
    const t = M.ecrire(reg.annee, p.id);
    assert.ok(t, `identifiant refusé : ${p.id}`);
    assert.deepEqual(M.lire(t), { annee: reg.annee, id: p.id });
    // 25 modules de côté : la plus petite taille qui tienne, soit 16 mm à l'impression
    assert.equal(M.grille(t).n, 25, `le code grossit pour ${t}`);
  }
});

test('ce qui n\'est pas une marque à nous est écarté', () => {
  for (const mauvais of [
    '', null, undefined, 'https://exemple.ch', 'CB1-2026', 'CB1--PLX9', 'CB2-2026-PLX9K2M3',
    'CB1-1800-PLX9K2M3', 'CB1-2026-Ǆ', 'BEGIN:VCARD', 'CB1-2026-' + 'A'.repeat(41),
  ]) {
    assert.equal(M.lire(mauvais), null, `« ${mauvais} » a été pris pour une marque`);
  }
});

test('une année ou un identifiant impossibles ne s\'impriment pas', () => {
  assert.equal(M.ecrire(1800, 'abc'), '');
  assert.equal(M.ecrire(2026, ''), '');
  assert.equal(M.ecrire(2026, 'a b'), '');
  assert.equal(M.ecrire('pas une année', 'abc'), '');
});

/* ---------------- Imprimer, puis relire ---------------- */

const MARQUE = M.ecrire(2026, 'plx9k2m3abcde');

test('ce qu\'on imprime, on le relit', () => {
  const img = M.imageRGBA(MARQUE, { module: 4 });
  assert.deepEqual(M.lire(M.decoder(img.data, img.width, img.height)), { annee: 2026, id: 'plx9k2m3abcde' });
});

test('une feuille scannée à l\'envers ou de travers se lit quand même', () => {
  for (const rotation of [90, 180, 270]) {
    const img = M.imageRGBA(MARQUE, { module: 4, rotation });
    const lu = M.decoder(img.data, img.width, img.height);
    assert.deepEqual(M.lire(lu), { annee: 2026, id: 'plx9k2m3abcde' }, `illisible à ${rotation}°`);
  }
});

test('le « PDF compact » du copieur abîme les caractères, pas le code', () => {
  // contraste écrasé (du noir et blanc franc il ne reste que du gris) et bruit de compression
  const img = M.imageRGBA(MARQUE, { module: 5, contraste: 0.45, bruit: 0.18 });
  assert.deepEqual(M.lire(M.decoder(img.data, img.width, img.height)), { annee: 2026, id: 'plx9k2m3abcde' });
});

test('une résolution de copieur ordinaire suffit', () => {
  // 16 mm à 200 points par pouce = 126 px pour 33 modules (code + marge), soit ~3,8 px par module
  const img = M.imageRGBA(MARQUE, { module: 3 });
  assert.ok(img.width <= 100, `le code occupe ${img.width} px, ce n'est plus une basse résolution`);
  assert.deepEqual(M.lire(M.decoder(img.data, img.width, img.height)), { annee: 2026, id: 'plx9k2m3abcde' });
});

/* ---------------- Retrouver le code sur une page entière ---------------- */

/** Une page blanche de w × h, avec le code posé à l'endroit voulu. */
function page(marque, w, h, coin, opts) {
  const code = M.imageRGBA(marque, opts || { module: 4 });
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  const pos = {
    'haut-droite': [w - code.width - 20, 20],
    'bas-gauche': [20, h - code.height - 20],
    'haut-gauche': [20, 20],
    'bas-droite': [w - code.width - 20, h - code.height - 20],
    centre: [Math.round((w - code.width) / 2), Math.round((h - code.height) / 2)],
  }[coin] || [20, 20];
  for (let y = 0; y < code.height; y++) {
    const src = y * code.width * 4;
    const dst = ((pos[1] + y) * w + pos[0]) * 4;
    data.set(code.data.subarray(src, src + code.width * 4), dst);
  }
  return { data, width: w, height: h };
}

test('le code est retrouvé sur une page entière, là où il est imprimé', () => {
  // une A4 lue à 150 points par pouce fait environ 1240 × 1754 px
  const p = page(MARQUE, 1240, 1754, 'haut-droite', { module: 4 });
  const trouve = M.chercher(p.data, p.width, p.height);
  assert.ok(trouve, 'code non retrouvé sur la page');
  assert.deepEqual(trouve.marque, { annee: 2026, id: 'plx9k2m3abcde' });
});

test('le code est retrouvé où que la feuille ait été posée, et à la taille imprimée', () => {
  // 16 mm de côté : à 150 points par pouce le code fait 99 px sur une page de 1240 × 1754,
  // soit un demi pour cent de la surface. C'est le cas réel, pas un code agrandi pour le test.
  for (const coin of ['haut-droite', 'bas-gauche', 'haut-gauche', 'bas-droite', 'centre']) {
    const p = page(MARQUE, 1240, 1754, coin, { module: 3 });
    const trouve = M.chercher(p.data, p.width, p.height);
    assert.ok(trouve, `code non retrouvé en ${coin}`);
    assert.deepEqual(trouve.marque, { annee: 2026, id: 'plx9k2m3abcde' });
  }
});

test('une A4 lue à 300 points par pouce se dépouille en moins d\'une seconde', () => {
  // la boîte de réception lit page après page : à plusieurs secondes la page, une pile de
  // trente pièces mettrait des minutes à arriver
  const p = page(MARQUE, 2480, 3508, 'haut-droite', { module: 6 });
  const t0 = Date.now();
  const trouve = M.chercher(p.data, p.width, p.height);
  const ms = Date.now() - t0;
  assert.ok(trouve, 'code non retrouvé à 300 points par pouce');
  assert.ok(ms < 1000, `${ms} ms pour une seule page`);
});

test('une page sans marque ne fabrique pas de marque', () => {
  const data = new Uint8ClampedArray(600 * 800 * 4).fill(255);
  // quelques traits noirs, comme un formulaire
  for (let y = 100; y < 110; y++) data.fill(0, (y * 600 + 50) * 4, (y * 600 + 550) * 4);
  assert.equal(M.chercher(data, 600, 800), null);
});

test('un code QR étranger n\'est pas pris pour une pièce', () => {
  const p = page('https://www.blonay.ch', 1240, 1754, 'haut-droite', { module: 4 });
  assert.equal(M.chercher(p.data, p.width, p.height), null, 'un QR quelconque a été pris pour une marque');
});

/* ---------------- La forme imprimée ---------------- */

test('le code se dessine en bandes plutôt qu\'en 625 carrés', () => {
  const b = M.bandes(MARQUE);
  assert.equal(b.n, 25);
  assert.ok(b.bandes.length > 0);
  // sans regroupement il y aurait un rectangle par module noir, soit plusieurs centaines
  assert.ok(b.bandes.length < 200, `${b.bandes.length} rectangles : le regroupement ne sert à rien`);
  // et les bandes couvrent exactement les modules noirs
  const g = M.grille(MARQUE);
  let noirs = 0;
  for (let y = 0; y < g.n; y++) for (let x = 0; x < g.n; x++) if (g.noir(x, y)) noirs++;
  assert.equal(b.bandes.reduce((n, r) => n + r.w, 0), noirs);
});

test('dessiner pose le code à l\'endroit demandé, dans la place annoncée', () => {
  const rects = [];
  const fausse = { drawRectangle: (r) => rects.push(r) };
  const place = M.dessiner(fausse, MARQUE, { x: 480, y: 780, taille: 46, rgb: (r, g, b) => ({ r, g, b }) });
  assert.deepEqual(place, { x: 480, y: 780, taille: 46, modules: 25 });
  assert.ok(rects.length > 1);
  for (const r of rects) {
    assert.ok(r.x >= 480 - 0.01 && r.x + r.width <= 480 + 46 + 0.01, `bande hors du cadre en x : ${r.x}`);
    assert.ok(r.y >= 780 - 0.01 && r.y + r.height <= 780 + 46 + 0.01, `bande hors du cadre en y : ${r.y}`);
  }
  // la première bande dessinée est le fond blanc, à la taille exacte
  assert.equal(rects[0].width, 46);
  assert.equal(rects[0].height, 46);
});

/** Rend en image ce que `dessiner` a posé sur la page, pour le relire comme un scanner. */
function rendre(rects, taille, echelle, fond) {
  const cote = Math.round(taille * echelle);
  const data = new Uint8ClampedArray(cote * cote * 4).fill(fond == null ? 255 : fond);
  for (const r of rects) {
    const noir = !!(r.color && r.color.r === 0 && r.color.g === 0 && r.color.b === 0);
    const x0 = Math.round(r.x * echelle);
    // l'origine d'un PDF est en bas à gauche, celle d'une image en haut à gauche
    const y0 = Math.round((taille - r.y - r.height) * echelle);
    const w = Math.max(1, Math.round(r.width * echelle));
    const h = Math.max(1, Math.round(r.height * echelle));
    for (let y = Math.max(0, y0); y < Math.min(cote, y0 + h); y++) {
      for (let x = Math.max(0, x0); x < Math.min(cote, x0 + w); x++) {
        const i = (y * cote + x) * 4;
        const v = noir ? 0 : 255;
        data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
      }
    }
  }
  return { data, width: cote, height: cote };
}
const aplat = (img) => [img.data, img.width, img.height];

test('le code posé sur la page par `dessiner` se relit tel quel', () => {
  // Le vrai contrôle : on repasse par le dessin PDF, on le rend en image, et on le décode.
  // Un code imprimé en miroir ou tête-bêche — l'origine d'un PDF est en bas, celle du code en
  // haut — reste un carré de points crédible à l'oeil, et seul ce test-là le voit.
  const rects = [];
  const rgb = (r, g, b) => ({ r, g, b });
  M.dessiner({ drawRectangle: (x) => rects.push(x) }, MARQUE, { x: 0, y: 0, taille: 46, rgb });
  const img = rendre(rects, 46, 8); // 46 points rendus à 8 px/pt, comme un scan très fin
  assert.deepEqual(M.lire(M.decoder(img.data, img.width, img.height)), { annee: 2026, id: 'plx9k2m3abcde' });
});

test('ce qui est posé sur la page est la grille du code, dans le bon sens', () => {
  // L'aller-retour ci-dessus ne dit rien de l'orientation : jsQR décode aussi un code en miroir
  // (vérifié). Un autre lecteur — la fonction QR du copieur, un téléphone — ne sera pas forcément
  // aussi indulgent, et l'origine d'un PDF est en bas quand celle du code est en haut : une
  // inversion est invisible à l'oeil et passe tous les autres tests. On relève donc la grille
  // imprimée, module par module, et on la compare à celle qu'on voulait.
  const g = M.grille(MARQUE);
  const rects = [];
  const rgb = (r, gg, b) => ({ r, g: gg, b });
  const e = 4; // 4 px par module
  M.dessiner({ drawRectangle: (x) => rects.push(x) }, MARQUE, { x: 0, y: 0, taille: g.n, marge: 0, rgb });
  const img = rendre(rects, g.n, e);
  const noirAu = (mx, my) => {
    const px = Math.floor(mx * e + e / 2);
    const py = Math.floor(my * e + e / 2);
    return img.data[(py * img.width + px) * 4] < 128;
  };
  const ecarts = [];
  for (let y = 0; y < g.n; y++) {
    for (let x = 0; x < g.n; x++) if (noirAu(x, y) !== g.noir(x, y)) ecarts.push(`${x},${y}`);
  }
  assert.deepEqual(ecarts.slice(0, 8), [], `${ecarts.length} module(s) mal placé(s) : le code est imprimé de travers`);
});

test('la marge silencieuse est ce qui permet de poser le code contre un cadre', () => {
  // Mesuré, pas supposé : sur fond blanc, un code sans marge se lit encore. C'est seulement
  // entouré d'encre — et sur la fiche il est posé près du cadre du formulaire — qu'il faut du
  // blanc autour pour qu'un lecteur distingue le code de ce qui le borde. Sans marge : illisible.
  const surFondNoir = (marge) => {
    const rects = [];
    const rgb = (r, g, b) => ({ r, g, b });
    M.dessiner({ drawRectangle: (x) => rects.push(x) }, MARQUE, { x: 30, y: 30, taille: 46, marge, rgb });
    return rendre(rects, 106, 8, 0); // 0 = page noire autour du code
  };
  assert.equal(M.decoder(...aplat(surFondNoir(0))), null, 'sans marge, le code devrait être illisible');
  assert.deepEqual(M.lire(M.decoder(...aplat(surFondNoir(3)))), { annee: 2026, id: 'plx9k2m3abcde' });
});
