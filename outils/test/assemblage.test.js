// La source de l'application vit en morceaux sous src/. Le découpage n'a de
// valeur que s'il reste invisible du côté livré : ce qui sort de assembler.js
// doit être une page complète et un script qui se lit d'un bloc. Ces tests
// gardent la couture, qu'aucun renommage ni ajout de module ne la défasse.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');
const { assembler, modules, traceMarque } = require('../assembler');

const SRC = path.join(__dirname, '..', 'src');
const source = assembler();

test('les repères sont consommés, rien ne reste en place', () => {
  for (const repere of ['/*@style@*/', '/*@modules@*/', '<!--@marque@-->', '<!--@favicon@-->']) {
    assert.ok(!source.includes(repere), 'le repère ' + repere + ' a été remplacé');
  }
});

test('la page recollée est complète', () => {
  assert.match(source, /^<title>Blonay PDF<\/title>\n/);
  assert.equal(source.split('<svg class="marque-source"').length - 1, 1);
  assert.equal(source.split('<style>').length - 1, 1);
  assert.equal(source.split('</style>').length - 1, 1);
  assert.equal(source.split('<script>').length - 1, 1);
  assert.ok(source.trimEnd().endsWith('</script>'), 'la page se termine par son script');
  // Le repère que build.js remplace par la date et le commit.
  assert.ok(source.includes("'__CONSTRUCTION__'"), 'le repère de construction est là');
});

// La marque a déjà existé en trois exemplaires — la tuile de la barre, celle
// du démarrage, l'icône d'onglet — et rien n'obligeait les trois à concorder.
test('la marque n\'est dessinée qu\'une fois, et les deux tuiles y renvoient', () => {
  const trace = traceMarque();
  assert.ok(trace.includes('<rect'), 'le tracé porte bien un dessin');
  assert.equal(source.split(trace).length - 1, 1, 'le dessin n\'apparaît qu\'une fois dans la page');
  assert.equal(source.split('<use href="#marque"/>').length - 1, 2, 'les deux tuiles renvoient au dessin');
  assert.equal(source.split('id="marque"').length - 1, 1, 'un seul élément porte cet identifiant');
});

test('l\'icône d\'onglet est la marque, encodée dans la page', () => {
  const m = source.match(/<link rel="icon" href="data:image\/svg\+xml;base64,([^"]+)">/);
  assert.ok(m, 'la page porte une icône d\'onglet');
  const svg = Buffer.from(m[1], 'base64').toString('utf8');
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, 'c\'est un SVG autonome');
  assert.ok(svg.includes(traceMarque().split('\n')[0].trim()), 'et c\'est le même dessin que les tuiles');
  // Un fichier à côté ne suivrait pas la page hors ligne, qu'on envoie seule.
  assert.ok(!source.includes('rel="icon" href="icon'), 'aucune icône servie depuis un fichier voisin');
});

test('le dessin livré ne porte pas les commentaires qui l\'expliquent', () => {
  const brut = fs.readFileSync(path.join(SRC, 'marque.svg'), 'utf8');
  assert.ok(brut.includes('<!--'), 'src/marque.svg explique le dessin');
  assert.ok(!traceMarque().includes('<!--'), 'la page ne reçoit que le tracé');
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
