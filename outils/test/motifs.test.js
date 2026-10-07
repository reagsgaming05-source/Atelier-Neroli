// Les motifs qu'on caviarde sans connaître la valeur : numéro AVS, IBAN, téléphone, courriel, date, IDE, plaque, montant.
// Chacun trouve les écritures qu'on rencontre vraiment, et laisse en paix ce qui y ressemble sans en être.
const test = require('node:test');
const assert = require('node:assert/strict');
const { extraire } = require('./aide');
const P = extraire('  const PURGE_MARQUE', '  const CLES_SANS_TEXTE', '{ plierAccents, sansCesures, occurrencesDe, MOTIFS, regexDuMotif }');

const trouve = (id, texte) => P.occurrencesDe(texte, { terme: P.MOTIFS[id].libelle, motif: id }).map(([a, b]) => texte.slice(a, b));

test('un numéro AVS se trouve avec des points, des espaces, des tirets ou rien', () => {
  const t = 'AVS 756.1234.5678.97 ; 756 1234 5678 97 ; 756-1234-5678-97 ; 7561234567897.';
  assert.deepEqual(trouve('avs', t), ['756.1234.5678.97', '756 1234 5678 97', '756-1234-5678-97', '7561234567897']);
  assert.deepEqual(trouve('avs', 'Parcelle 7561234 et le 1756.1234.5678.97'), [], 'ni une parcelle, ni un nombre plus long');
});

test('un IBAN suisse se trouve groupé ou non, et un autre pays ne passe pas pour un IBAN suisse', () => {
  assert.deepEqual(trouve('iban', 'IBAN CH93 0076 2011 6238 5295 7 ou CH9300762011623852957.'), ['CH93 0076 2011 6238 5295 7', 'CH9300762011623852957']);
  assert.deepEqual(trouve('iban', 'DE89 3704 0044 0532 0130 00'), []);
});

test('un téléphone suisse, avec ou sans indicatif', () => {
  const t = 'Tél. 021 000 00 00, mobile 079 123 45 67, depuis l\'étranger +41 21 000 00 00 ou 0041 79 123 45 67.';
  assert.deepEqual(trouve('telephone', t), ['021 000 00 00', '079 123 45 67', '+41 21 000 00 00', '0041 79 123 45 67']);
  assert.deepEqual(trouve('telephone', 'Facture 2026 0123 4567 89'), [], 'un numéro de facture n\'est pas un téléphone');
});

test('une adresse de courriel, même avec un accent dans le nom', () => {
  assert.deepEqual(trouve('courriel', 'écrire à greffe@commune.example ou à hélène.müller@commune-exemple.ch.'), ['greffe@commune.example', 'helene.muller@commune-exemple.ch'.replace('helene', 'hélène').replace('muller', 'müller')].map(x => x));
});

test('une date à la suisse ou à la française, et pas un nombre ordinaire', () => {
  assert.deepEqual(trouve('date', 'Séance du 12.03.2026 ; naissance 3/4/87 ; version 2.10.5 ; total 31.12'), ['12.03.2026', '3/4/87']);
});

test('un numéro d\'entreprise (IDE) et une plaque', () => {
  assert.deepEqual(trouve('ide', 'IDE CHE-123.456.789 et CHE 987 654 321'), ['CHE-123.456.789', 'CHE 987 654 321']);
  assert.deepEqual(trouve('plaque', 'Véhicule VD 123456, GE-12345 ; bureau VD 2 étage'), ['VD 123456', 'GE-12345']);
});

test('un montant en francs, avec l\'apostrophe des milliers', () => {
  assert.deepEqual(trouve('montant', 'Crédit de CHF 480\'000.00 et Fr. 1 250,50 ; 12 francs'), ['CHF 480\'000.00', 'Fr. 1 250,50']);
});

test('chaque motif a un libellé, une expression valide, et un nom qui ne se confond pas avec un autre', () => {
  const ids = Object.keys(P.MOTIFS);
  assert.ok(ids.length >= 8);
  const libelles = new Set();
  for (const id of ids) {
    assert.ok(P.MOTIFS[id].libelle && P.regexDuMotif(id) instanceof RegExp, id);
    assert.ok(!libelles.has(P.MOTIFS[id].libelle)); libelles.add(P.MOTIFS[id].libelle);
  }
  assert.equal(P.regexDuMotif('inconnu'), null);
});
