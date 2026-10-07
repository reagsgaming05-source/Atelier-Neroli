// Reconnaître les champs d'un formulaire à plat : des traits, des cadres et du texte posés sur une page, et ce qu'on en tire.
const test = require('node:test');
const assert = require('node:assert/strict');
const { extraire } = require('./aide');
const { formesDeLaPage, champsProbables } = extraire('  function formesDeLaPage(', '  // La page lue :', '{ formesDeLaPage, champsProbables }');

// Les codes de pdf.js (3.11), tels que la page les reçoit.
const OPS = { save: 10, restore: 11, transform: 12, moveTo: 13, lineTo: 14, curveTo: 15, curveTo2: 16, curveTo3: 17, closePath: 18, rectangle: 19,
  stroke: 20, closeStroke: 21, fill: 22, eoFill: 23, fillStroke: 24, eoFillStroke: 25, closeFillStroke: 26, closeEOFillStroke: 27, endPath: 28, constructPath: 91 };
const IDENT = [1, 0, 0, 1, 0, 0];
const chemin = (ops, coords, peint) => ({ fn: [OPS.constructPath, peint], args: [[ops, coords], null] });
function liste(...elements) { const fn = [], args = []; elements.forEach(e => { e.fn.forEach((f, i) => { fn.push(f); args.push(e.args[i]); }); }); return { fnArray: fn, argsArray: args }; }
const trait = (x0, y, x1) => chemin([OPS.moveTo, OPS.lineTo], [x0, y, x1, y], OPS.stroke);
const cadre = (x, y, w, h, peint) => chemin([OPS.rectangle], [x, y, w, h], peint || OPS.stroke);

test('formes : un trait horizontal, un cadre, une case, un filet très plat', () => {
  const f = formesDeLaPage(liste(trait(100, 700, 300), cadre(100, 600, 200, 20), cadre(100, 500, 10, 10), cadre(50, 400, 300, 0.5, OPS.fill)), OPS, IDENT);
  assert.equal(f.horizontaux.length, 2, 'le trait et le filet');
  assert.deepEqual(f.boites.map(b => [b.x, b.y, b.w, b.h]), [[100, 600, 200, 20], [100, 500, 10, 10]]);
});

test('formes : la matrice de la vue retourne la page (origine en haut), la matrice courante déplace le dessin', () => {
  // pdf.js : [1,0,0,-1,0,842] — un trait à y = 700 en PDF est à 142 sur l'écran
  const f = formesDeLaPage(liste({ fn: [OPS.save, OPS.transform], args: [null, [1, 0, 0, 1, 10, 0]] }, trait(100, 700, 300), { fn: [OPS.restore], args: [null] }, trait(100, 600, 300)), OPS, [1, 0, 0, -1, 0, 842]);
  assert.deepEqual(f.horizontaux.map(h => [h.x0, h.x1, h.y]), [[110, 310, 142], [100, 300, 242]]);
});

// Une page de formulaire : trois lignes à remplir, une case, un cadre vide, un tableau (à ne pas toucher)
const m = (str, x, base, x1, size) => ({ str, x, x1: x1 == null ? x + str.length * 5 : x1, base, size: size || 10 });
const rangee = (base, ...cellules) => ({ base, size: 10, cellules });
const page = (o) => Object.assign({ largeur: 595, hauteur: 842, rangees: [], horizontaux: [], verticaux: [], boites: [], widgets: [], existants: [] }, o);

test('un trait à droite d\'un intitulé devient un champ texte qui porte cet intitulé', () => {
  const r = champsProbables(page({
    rangees: [rangee(100, m('Nom :', 60, 100)), rangee(130, m('Date de naissance', 60, 130, 150))],
    horizontaux: [{ x0: 100, x1: 300, y: 102 }, { x0: 160, x1: 300, y: 132 }],
  }));
  assert.equal(r.length, 2);
  assert.deepEqual(r.map(c => c.libelle), ['Nom', 'Date de naissance']);
  assert.ok(r.every(c => c.genre === 'texte' && c.sur));
  assert.ok(Math.abs(r[0].x - 100) < 0.01 && Math.abs(r[0].w - 200) < 0.01 && r[0].y < 100 && r[0].y + r[0].h <= 102.5, 'le champ est posé au-dessus du trait');
});

test('un texte souligné n\'est pas un champ, ni la ligne d\'un tableau', () => {
  const r = champsProbables(page({
    rangees: [rangee(100, m('Conditions générales de location', 60, 100, 260))],
    horizontaux: [{ x0: 60, x1: 260, y: 102 }, { x0: 60, x1: 400, y: 300 }],
    verticaux: [{ x: 60, y0: 280, y1: 300 }, { x: 400, y0: 280, y1: 300 }],
  }));
  assert.deepEqual(r, []);
});

test('des soulignés tapés au clavier : l\'intitulé est ce qui précède, le champ couvre la série de signes', () => {
  const r = champsProbables(page({ rangees: [rangee(200, m('Adresse : ____________________', 60, 200, 260))] }));
  assert.equal(r.length, 1);
  assert.equal(r[0].libelle, 'Adresse');
  assert.ok(r[0].x > 110 && r[0].x < 130, 'le champ commence après « Adresse : »');
  assert.ok(Math.abs(r[0].x + r[0].w - 260) < 1);
});

test('une petite case carrée vide est une case à cocher, son texte à droite son intitulé', () => {
  const r = champsProbables(page({ rangees: [rangee(300, m('Cuisine', 80, 300))], boites: [{ x: 60, y: 290, w: 10, h: 10, trait: true }] }));
  assert.deepEqual(r.map(c => [c.genre, c.libelle]), [['case', 'Cuisine']]);
  assert.ok(Math.abs(r[0].w - r[0].h) < 0.01);
});

test('le caractère ☐ est une case, lui aussi', () => {
  const r = champsProbables(page({ rangees: [rangee(300, m('☐', 60, 300, 70), m('Électricité', 76, 300))] }));
  assert.deepEqual(r.map(c => [c.genre, c.libelle]), [['case', 'Électricité']]);
});

test('un cadre vide est un champ, un cadre qui contient du texte non, le cadre de la page non', () => {
  const r = champsProbables(page({
    rangees: [rangee(250, m('Remarques', 60, 250)), rangee(405, m('Déjà rempli', 105, 405))],
    boites: [{ x: 60, y: 260, w: 400, h: 60, trait: true }, { x: 100, y: 390, w: 200, h: 20, trait: true }, { x: 10, y: 10, w: 575, h: 820, trait: true }],
  }));
  assert.equal(r.length, 1);
  assert.equal(r[0].libelle, 'Remarques');
  assert.equal(r[0].multi, true, 'un cadre haut accepte plusieurs lignes');
});

test('ce qui est déjà un champ de formulaire n\'est pas proposé une seconde fois', () => {
  const r = champsProbables(page({ rangees: [rangee(100, m('Nom :', 60, 100))], horizontaux: [{ x0: 100, x1: 300, y: 102 }], widgets: [{ x: 100, y: 88, w: 200, h: 16 }] }));
  assert.deepEqual(r, []);
});

test('un trait qui borde un cadre n\'est pas compté en plus du cadre', () => {
  const r = champsProbables(page({ rangees: [rangee(100, m('Nom', 60, 100))], boites: [{ x: 100, y: 90, w: 200, h: 20, trait: true }], horizontaux: [{ x0: 100, x1: 300, y: 110 }] }));
  assert.equal(r.length, 1);
});

test('une page sans rien à lire : aucun champ', () => {
  assert.deepEqual(champsProbables(page({})), []);
});
