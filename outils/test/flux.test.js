// Lecture du flux de contenu d'une page (le mécanisme d'Acrobat pour
// corriger le texte en place) : jetons, état du texte, positions.
const test = require('node:test');
const assert = require('node:assert/strict');
const { extraire } = require('./aide');
const F = extraire('const FX_BLANC', '  function fxPolice(', '{ fxJetons, fxAffichages, fxAppliquer, fxOctets, fxMat }');
const octets = s => new Uint8Array(Buffer.from(s, 'latin1'));
const police = () => ({ composite: false, largeur: () => 500 });   // chaque glyphe : une demi-cadratine

test('les jetons d\'un flux simple', () => {
  const j = F.fxJetons(octets('BT /F1 12 Tf 100 700 Td (Hello) Tj ET'));
  assert.deepEqual(j.map(x => x.t), ['op', 'nom', 'nombre', 'op', 'nombre', 'nombre', 'op', 'chaine', 'op', 'op']);
  assert.equal(j[1].v, 'F1');
  assert.equal(j[2].v, 12);
});

test('un commentaire et une chaîne hexadécimale', () => {
  const j = F.fxJetons(octets('% rien\n<48656C6C6F> Tj'));
  assert.equal(j.length, 2);
  assert.equal(j[0].t, 'chaine');
  assert.equal(j[0].hex, true);
});

test('une image en ligne est sautée jusqu\'à EI, même si ses octets contiennent EI', () => {
  const flux = 'BI /W 2 /H 2 /BPC 8 /CS /G ID \x00EI\x00\x00 EI Q (fin) Tj';
  const j = F.fxJetons(octets(flux));
  const ops = j.filter(x => x.t === 'op').map(x => x.v);
  assert.ok(ops.includes('EI'), 'EI reconnu');
  assert.equal(j[j.length - 1].v, 'Tj');
  assert.equal(j[j.length - 2].t, 'chaine');
});

test('position et taille d\'un texte : Td, Tf, Tm', () => {
  const a = F.fxAffichages(octets('BT /F1 12 Tf 100 700 Td (Hello) Tj ET'), police);
  assert.equal(a.length, 1);
  assert.equal(a[0].x, 100);
  assert.equal(a[0].y, 700);
  assert.equal(a[0].taille, 12);
  assert.equal(a[0].police, 'F1');
  // Avance : 5 glyphes × 500/1000 × 12 pt = 30 pt.
  assert.ok(Math.abs(a[0].large - 30) < 1e-9, 'largeur ' + a[0].large);
  const b = F.fxAffichages(octets('BT /F1 1 Tf 24 0 0 24 50 60 Tm (Hi) Tj ET'), police);
  assert.equal(b[0].taille, 24);
  assert.equal(b[0].x, 50);
});

test('un TJ avec un crénage recule la plume ; Tc et Tw s\'ajoutent', () => {
  const a = F.fxAffichages(octets('BT /F1 10 Tf 0 0 Td [(A) -500 (B)] TJ ET'), police);
  // A : 5 pt ; crénage -500 : +5 pt ; B : 5 pt → 15 pt.
  assert.ok(Math.abs(a[0].large - 15) < 1e-9, 'largeur ' + a[0].large);
  const b = F.fxAffichages(octets('BT /F1 10 Tf 2 Tc 3 Tw 0 0 Td (a b) Tj ET'), police);
  // 3 glyphes × 5 + 3 × Tc 2 + une espace × Tw 3 = 24 pt.
  assert.ok(Math.abs(b[0].large - 24) < 1e-9, 'largeur ' + b[0].large);
});

test('q/Q rend aussi l\'état du texte (police, taille)', () => {
  const a = F.fxAffichages(octets('BT /F1 12 Tf ET q BT /F2 30 Tf ET Q BT 0 0 Td (x) Tj ET'), police);
  assert.equal(a[0].police, 'F1');
  assert.equal(a[0].taille, 12);
});

test('deux lignes : T* descend de TL', () => {
  const a = F.fxAffichages(octets('BT /F1 10 Tf 14 TL 20 500 Td (un) Tj T* (deux) Tj ET'), police);
  assert.equal(a.length, 2);
  assert.equal(a[1].y, 486);
  assert.equal(a[1].x, 20);
});
