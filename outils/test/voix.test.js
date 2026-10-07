// Lire à voix haute : le texte est découpé en morceaux que la voix dit d'un souffle.
const test = require('node:test');
const assert = require('node:assert/strict');
const { extraire } = require('./aide');
const { morceauxAParler, segmentsAParler } = extraire('  const synthese = () =>', '  const lecture = {', '{ morceauxAParler, segmentsAParler }');

test('une phrase par morceau, les points des abréviations ne coupent pas', () => {
  assert.deepEqual(morceauxAParler('Le Conseil a adopté le préavis. M. Dupont rapporte ! Selon l\'art. 5 al. 2, la décision est valable.'),
    ['Le Conseil a adopté le préavis.', 'M. Dupont rapporte !', 'Selon l\'art. 5 al. 2, la décision est valable.']);
});

test('une phrase trop longue se coupe aux espaces, jamais au milieu d\'un mot', () => {
  const longue = Array.from({ length: 80 }, (_, i) => 'mot' + i).join(' ');
  const m = morceauxAParler(longue);
  assert.ok(m.length > 1);
  assert.ok(m.every(x => x.length <= 240), 'chaque morceau tient en 240 signes');
  assert.equal(m.join(' '), longue, 'rien ne se perd, rien ne se coupe');
});

test('texte vide ou fait d\'espaces : rien à dire', () => {
  assert.deepEqual(morceauxAParler('   '), []);
  assert.deepEqual(morceauxAParler(null), []);
});

test('un tableau se dit une rangée à la fois, les cellules vides sautées', () => {
  assert.deepEqual(segmentsAParler({ t: 'tableau', lignes: [['Libellé', '', 'Montant'], ['Repas', '45', '']] }), ['Libellé, Montant', 'Repas, 45']);
  assert.deepEqual(segmentsAParler({ t: 'titre', n: 1, s: 'Préavis' }), ['Préavis']);
});
