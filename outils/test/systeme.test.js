// Le système de design (chapitre 01 de l'audit) : une échelle par grandeur, définie une fois dans :root, et la feuille
// de style n'emploie plus que ces jetons. Un espacement, un rayon ou une taille de texte écrits « en dur » reviennent à
// 232 déclarations qui divergent sans qu'on s'en aperçoive : ce test les refuse.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'style.css'), 'utf8');
const racine = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
const jeton = nom => { const m = new RegExp('--' + nom + ':\\s*([0-9.]+)px').exec(racine); return m ? Number(m[1]) : null; };
const horsRacine = css.replace(racine, '');

test('l\'échelle d\'espacement : huit paliers multiples de 4, et le filet', () => {
  const paliers = [1, 2, 3, 4, 5, 6, 7, 8].map(n => jeton('e-' + n));
  assert.deepStrictEqual(paliers, [4, 8, 12, 16, 20, 24, 32, 48]);
  assert.ok(paliers.every(v => v % 4 === 0));
  assert.strictEqual(jeton('e-0'), 2, 'le filet');
});

test('trois rayons, des angles vifs pour le papier, six tailles de texte, quatre hauteurs de contrôle', () => {
  assert.deepStrictEqual([1, 2, 3].map(n => jeton('r-' + n)), [4, 8, 12]);
  assert.strictEqual(jeton('r-0'), 2);
  const tailles = [1, 2, 3, 4, 5, 6].map(n => jeton('t-' + n));
  assert.deepStrictEqual(tailles, tailles.slice().sort((a, b) => a - b), 'tailles croissantes');
  assert.strictEqual(new Set(tailles).size, 6);
  assert.ok(tailles[0] >= 11, 'pas de texte courant sous 11 px');
  assert.deepStrictEqual([1, 2, 3, 4].map(n => jeton('h-' + n)), [24, 30, 36, 44]);
});

test('aucun espacement écrit en dur : marges, remplissages et écarts passent par l\'échelle', () => {
  const fautes = [];
  for (const m of horsRacine.matchAll(/(?<![\w-])((?:padding|margin)(?:-[a-z-]+)?|gap|row-gap|column-gap)\s*:\s*([^;}{]+)/g)) {
    const bruts = (m[2].match(/-?\d+(?:\.\d+)?px/g) || []).filter(v => v !== '1px' && v !== '-1px');
    if (bruts.length) fautes.push(m[1] + ': ' + m[2].trim());
  }
  assert.deepStrictEqual(fautes, []);
});

test('aucun rayon ni taille de texte écrits en dur', () => {
  const rayons = Array.from(horsRacine.matchAll(/border-radius\s*:\s*([^;}{]+)/g)).map(m => m[1].trim()).filter(v => /\d+px/.test(v));
  assert.deepStrictEqual(rayons, []);
  const tailles = Array.from(horsRacine.matchAll(/(?<![\w-])font-size\s*:\s*([^;}{]+)/g)).map(m => m[1].trim()).filter(v => /\d+(?:\.\d+)?px/.test(v));
  assert.deepStrictEqual(tailles, []);
});

test('les contrôles ont une des quatre hauteurs : plus de 27, 29, 31 ou 35 px', () => {
  // Seules échappent les formes qui ne sont pas des contrôles : le logo, les filets, les pastilles.
  const hauteurs = Array.from(horsRacine.matchAll(/(?<![-\w])height\s*:\s*(\d+)px/g)).map(m => Number(m[1]));
  const intrus = hauteurs.filter(h => [25, 26, 27, 28, 29, 31, 32, 34, 35].includes(h));
  assert.deepStrictEqual(intrus, []);
});
