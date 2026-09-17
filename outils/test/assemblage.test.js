// La source de l'application vit en morceaux sous src/. Le découpage n'a de
// valeur que s'il reste invisible du côté livré : ce qui sort de assembler.js
// doit être une page complète et un script qui se lit d'un bloc. Ces tests
// gardent la couture, qu'aucun renommage ni ajout de module ne la défasse.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');
const { assembler, modules } = require('../assembler');

const SRC = path.join(__dirname, '..', 'src');
const source = assembler();

test('les repères sont consommés, rien ne reste en place', () => {
  assert.ok(!source.includes('/*@style@*/'), 'le repère de la feuille de style a été remplacé');
  assert.ok(!source.includes('/*@modules@*/'), 'le repère des modules a été remplacé');
});

test('la page recollée est complète', () => {
  assert.match(source, /^<title>Blonay PDF<\/title>\n/);
  assert.equal(source.split('<style>').length - 1, 1);
  assert.equal(source.split('</style>').length - 1, 1);
  assert.equal(source.split('<script>').length - 1, 1);
  assert.ok(source.trimEnd().endsWith('</script>'), 'la page se termine par son script');
  // Le repère que build.js remplace par la date et le commit.
  assert.ok(source.includes("'__CONSTRUCTION__'"), 'le repère de construction est là');
});

test('la feuille de style est celle de src/', () => {
  const css = fs.readFileSync(path.join(SRC, 'style.css'), 'utf8').replace(/\r\n/g, '\n');
  assert.ok(source.includes(css), 'le contenu de style.css se retrouve tel quel');
  assert.ok(css.includes(':root'), 'et ce sont bien des styles');
});

test('le script recollé se lit d\'un bloc', () => {
  const a = source.indexOf('<script>\n') + '<script>\n'.length;
  const b = source.lastIndexOf('</script>');
  // Une accolade laissée ouverte par un découpage maladroit se verrait ici :
  // le script entier est analysé, sans être exécuté.
  new vm.Script(source.slice(a, b), { filename: 'blonay-pdf.js' });
});

test('les modules sont numérotés, uniques et pris dans l\'ordre', () => {
  const noms = modules();
  assert.ok(noms.length > 20, 'le découpage compte bien des modules : ' + noms.length);
  const numeros = noms.map((n) => {
    assert.match(n, /^\d\d-[a-z0-9-]+\.js$/, n + ' suit la forme NN-nom.js');
    return n.slice(0, 2);
  });
  assert.equal(new Set(numeros).size, numeros.length, 'deux modules ne partagent pas un numéro');
  assert.deepEqual(noms, [...noms].sort(), 'l\'ordre de lecture est celui des noms');
  assert.equal(noms[0], '00-socle.js');
  assert.equal(noms[noms.length - 1], '99-init.js');
});

test('chaque module finit par une fin de ligne', () => {
  for (const n of modules()) {
    const t = fs.readFileSync(path.join(SRC, n), 'utf8');
    assert.ok(t.endsWith('\n'), n + ' finit par une fin de ligne, sinon deux modules se collent');
  }
});

test('le premier module ouvre le mode strict, le dernier démarre l\'application', () => {
  const premier = fs.readFileSync(path.join(SRC, '00-socle.js'), 'utf8');
  assert.match(premier, /^\s*'use strict';/);
  const dernier = fs.readFileSync(path.join(SRC, '99-init.js'), 'utf8');
  assert.match(dernier.trimEnd().split('\n').pop(), /\bboot\(\);$/,
    'le dernier module met l\'application en marche, et c\'est sa dernière ligne');
});

test('recoller deux fois donne exactement la même source', () => {
  assert.equal(assembler(), source);
});
