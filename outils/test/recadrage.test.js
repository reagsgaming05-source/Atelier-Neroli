// Recadrer : les marges se donnent comme on voit la page ; la zone visible du PDF (CropBox) se règle dans l'espace du PDF, qui tourne
// avec la page. Une erreur ici retire la bande du mauvais bord.
const test = require('node:test');
const assert = require('node:assert/strict');
const { extraire } = require('./aide');
const { zoneRecadree } = extraire('  function zoneRecadree', '  // Les marges blanches', '{ zoneRecadree }');

const vue = { vx: 0, vy: 0, vw: 600, vh: 800 };
const m = { haut: 10, droite: 20, bas: 30, gauche: 40 };

test('page droite : chaque bande part de son bord', () => {
  assert.deepEqual(zoneRecadree(vue, m, 0), { x: 40, y: 30, w: 540, h: 760 });
});
test('page tournée de 90° : le haut vu est le bord gauche du PDF', () => {
  // vue tournée de 90° dans le sens des aiguilles : haut → gauche du PDF, droite → haut, bas → droite, gauche → bas
  assert.deepEqual(zoneRecadree(vue, m, 90), { x: 10, y: 40, w: 600 - 10 - 30, h: 800 - 40 - 20 });
});
test('page à l\'envers : le haut vu est le bas du PDF', () => {
  assert.deepEqual(zoneRecadree(vue, m, 180), { x: 20, y: 10, w: 600 - 20 - 40, h: 800 - 10 - 30 });
});
test('page tournée de 270° : le haut vu est le bord droit du PDF', () => {
  assert.deepEqual(zoneRecadree(vue, m, 270), { x: 30, y: 20, w: 600 - 30 - 10, h: 800 - 20 - 40 });
});
test('une zone déjà recadrée se recadre depuis son propre coin, pas depuis l\'origine', () => {
  const z = zoneRecadree({ vx: 50, vy: 100, vw: 400, vh: 500 }, { haut: 0, droite: 0, bas: 0, gauche: 25 }, 0);
  assert.deepEqual(z, { x: 75, y: 100, w: 375, h: 500 });
});
test('jamais une zone vide : trop de marge laisse un point', () => {
  const z = zoneRecadree({ vx: 0, vy: 0, vw: 100, vh: 100 }, { haut: 90, droite: 90, bas: 90, gauche: 90 }, 0);
  assert.ok(z.w >= 1 && z.h >= 1);
});
