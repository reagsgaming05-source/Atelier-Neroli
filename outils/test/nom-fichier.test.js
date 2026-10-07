// Le nom proposé à l'enregistrement : dans l'application fenêtrée il garde ses accents (la boîte de Windows s'en accommode),
// dans un navigateur il se replie en ASCII.
const test = require('node:test');
const assert = require('node:assert');
const { extraire } = require('./aide');
const { nomDeFichier } = extraire('  function asciiName(name) {', '  // La fenêtre de l\'application propose la boîte « Enregistrer sous » de', '{ nomDeFichier }');

test('dans l\'application, les accents restent', () => {
  assert.strictEqual(nomDeFichier('Préavis municipal 3-26.pdf', true), 'Préavis municipal 3-26.pdf');
  assert.strictEqual(nomDeFichier('Décision — Hêtre.pdf', true), 'Décision — Hêtre.pdf');
  assert.strictEqual(nomDeFichier('Procès-verbal août.pdf', true), 'Procès-verbal août.pdf');
  assert.strictEqual(nomDeFichier('Beschluss für Gemeinderät.pdf', true), 'Beschluss für Gemeinderät.pdf');
});
test('dans l\'application, seuls les caractères que Windows interdit changent', () => {
  assert.strictEqual(nomDeFichier('a/b\\c:d*e?f"g<h>i|j.pdf', true), 'a-b-c-d-e-f-g-h-i-j.pdf');
  assert.strictEqual(nomDeFichier('rapport.  ', true), 'rapport');
  assert.strictEqual(nomDeFichier('', true), 'document.pdf');
  assert.strictEqual(nomDeFichier('  ', true), 'document.pdf');
});
test('un nom décomposé (e + accent) revient composé : le même nom pour Windows', () => {
  assert.strictEqual(nomDeFichier('Préavis.pdf', true), 'Préavis.pdf');
});
test('dans un navigateur, le nom reste en ASCII', () => {
  assert.strictEqual(nomDeFichier('Préavis municipal 3-26.pdf', false), 'Preavis municipal 3-26.pdf');
  assert.strictEqual(nomDeFichier('Procès-verbal août.pdf', false), 'Proces-verbal aout.pdf');
  assert.strictEqual(nomDeFichier('Grüsse.pdf', false), 'Gruesse.pdf');
});

// Le transport en ASCII d'un nom à accents jusqu'au processus principal (Chromium remplace sinon le nom par « download »).
const { decoder, encoder } = require('../desktop/nom-telechargement.js');
const { nomTransporte } = extraire('  // Chromium remplace par « download » le nom d\'un téléchargement', '  function fallbackDownload(blob, filename) {', '{ nomTransporte }');
global.TextEncoder = global.TextEncoder || require('util').TextEncoder;
global.btoa = global.btoa || ((s) => Buffer.from(s, 'binary').toString('base64'));

test('un nom ASCII voyage tel quel', () => {
  assert.strictEqual(nomTransporte('lettre.pdf'), 'lettre.pdf');
  assert.strictEqual(nomTransporte('a b-c_d (2).pdf'), 'a b-c_d (2).pdf');
});
test('un nom à accents voyage en ASCII pur, et le processus principal le rend tel quel', () => {
  for (const nom of ['Préavis municipal 3-26.pdf', 'Décision — Hêtre.pdf', 'Procès-verbal août.pdf', 'essai-modifié.pdf', 'Beschluss für Gemeinderät.pdf', 'journal-caviardage.txt', 'Zürich ß œ.png']) {
    const t = nomTransporte(nom);
    assert.ok(!/[^\x20-\x7E]/.test(t), 'ASCII pur : ' + t);
    assert.strictEqual(decoder(t), nom);
  }
});
test('la page et le processus principal écrivent le même transport', () => {
  for (const nom of ['Préavis.pdf', 'sans extension é', 'à.b.c.pdf']) assert.strictEqual(nomTransporte(nom), encoder(nom));
});
test('un nom qui n\'a pas la forme transportée passe tel quel', () => {
  assert.strictEqual(decoder('lettre.pdf'), 'lettre.pdf');
  assert.strictEqual(decoder('aktum-u8-!!!.pdf'), 'aktum-u8-!!!.pdf');
  assert.strictEqual(decoder(''), '');
});
