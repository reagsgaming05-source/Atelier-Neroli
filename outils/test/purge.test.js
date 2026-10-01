// La recherche qui sert à caviarder : sans accents, sans coupures de fin de
// ligne, et sur le texte recollé d'un flux. Un nom manqué ici est un nom qui
// reste dans le fichier.
const test = require('node:test');
const assert = require('node:assert/strict');
const { extraire } = require('./aide');
const P = extraire('  const PURGE_MARQUE', '  const CLES_SANS_TEXTE', '{ plierAccents, sansCesures, occurrencesDe, purgeTrouve, purgeMasquer }');

const trouve = (texte, spec) => P.occurrencesDe(texte, Object.assign({ terme: 'x' }, spec)).map(([a, b]) => texte.slice(a, b));

test('« Muller » trouve « Müller », « MÜLLER » et « Mueller » non', () => {
  const t = 'Madame Müller, MÜLLER Vera, Mueller et Muller';
  assert.deepEqual(trouve(t, { terme: 'Muller' }), ['Müller', 'MÜLLER', 'Muller']);
});

test('respecter les accents : « Muller » ne trouve plus « Müller »', () => {
  assert.deepEqual(trouve('Müller et Muller', { terme: 'Muller', accents: true }), ['Muller']);
});

test('la casse se respecte sur demande', () => {
  assert.deepEqual(trouve('Muller muller', { terme: 'Muller', casse: true }), ['Muller']);
  assert.deepEqual(trouve('Muller muller', { terme: 'Muller' }), ['Muller', 'muller']);
});

test('mot entier : « Muller » n\'est pas dans « Mullerstrasse »', () => {
  assert.deepEqual(trouve('Mullerstrasse et Muller.', { terme: 'Muller', mot: true }), ['Muller']);
});

test('un nom coupé en fin de ligne par un tiret se retrouve, et couvre les deux morceaux', () => {
  const t = 'Le dossier Mül-\nler est clos.';
  const occ = P.occurrencesDe(t, { terme: 'Muller' });
  assert.equal(occ.length, 1);
  assert.equal(t.slice(occ[0][0], occ[0][1]), 'Mül-\nler');
});

test('un tiret en fin de ligne est tenu pour une coupure : on noircit un nom de trop plutôt que d\'en manquer un', () => {
  assert.deepEqual(trouve('Muller-\nDupont', { terme: 'MullerDupont' }), ['Muller-\nDupont']);
  // Un tiret isolé, entre des espaces, n'est pas une coupure.
  assert.equal(P.sansCesures('a - b\nc').plat, 'a - b\nc');
});

test('la longueur ne change pas en pliant les accents : les positions valent dans l\'original', () => {
  const t = 'Zürich, Genève, Émile, Ça va, ß, œuvre';
  assert.equal(P.plierAccents(t).length, t.length);
  assert.equal(P.plierAccents(t), 'Zurich, Geneve, Emile, Ca va, ß, œuvre');
});

test('masquer remplace chaque occurrence par une marque, sans toucher au reste', () => {
  assert.equal(P.purgeMasquer('Dossier Vasilakis du 3 mars (Vasilakis)', [{ terme: 'vasilakis' }]), 'Dossier [caviardé] du 3 mars ([caviardé])');
});

test('plusieurs termes, dont un absent', () => {
  assert.ok(P.purgeTrouve('Annexe : Vasilakis', [{ terme: 'Dupont' }, { terme: 'Vasilakis' }]));
  assert.ok(!P.purgeTrouve('Annexe', [{ terme: 'Dupont' }]));
});
