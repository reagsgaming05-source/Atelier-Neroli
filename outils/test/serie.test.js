// Le remplissage en série : lecture du CSV, correspondance des champs, noms des
// copies. Le code testé est celui du livrable (extrait de src/91-serie.js).
const test = require('node:test');
const assert = require('node:assert');
const { extraire } = require('./aide');

const S = extraire('// @debut-csv', '// @fin-csv',
  '{ lireCsv, lireOuiNon, choisirOption, planDeSerie, nomDeSerie, marquesInconnues, nomsUniques, normaliserCle, SERIE_MAX }');

test('CSV d\'Excel français : point-virgule, BOM, CRLF', () => {
  const r = S.lireCsv('﻿Nom;Prénom;Accord\r\nDupont;Marie;oui\r\nMartin;Léa;non\r\n');
  assert.strictEqual(r.delimiteur, ';');
  assert.deepStrictEqual(r.entetes, ['Nom', 'Prénom', 'Accord']);
  assert.deepStrictEqual(r.lignes, [['Dupont', 'Marie', 'oui'], ['Martin', 'Léa', 'non']]);
  assert.deepStrictEqual(r.avis, []);
});

test('virgule et tabulation sont reconnues', () => {
  assert.strictEqual(S.lireCsv('a,b,c\n1,2,3').delimiteur, ',');
  assert.strictEqual(S.lireCsv('a\tb\tc\n1\t2\t3').delimiteur, '\t');
  assert.deepStrictEqual(S.lireCsv('a\tb\n1\t2').lignes, [['1', '2']]);
});

test('guillemets : séparateur dans une cellule, guillemet doublé, retour à la ligne', () => {
  const r = S.lireCsv('Nom;Adresse\n"Dupont; Marie";"Rue ""du Lac"" 4\n1800 Vevey"\n');
  assert.deepStrictEqual(r.lignes, [['Dupont; Marie', 'Rue "du Lac" 4\n1800 Vevey']]);
});

test('lignes vides ignorées, en-têtes vides et doublons rendus uniques, cellules manquantes complétées', () => {
  const r = S.lireCsv('Nom;;Nom\n\nA\n;;;\nB;x;y');
  assert.deepStrictEqual(r.entetes, ['Nom', 'colonne 2', 'Nom (2)']);
  assert.deepStrictEqual(r.lignes, [['A', '', ''], ['B', 'x', 'y']]);
});

test('une ligne trop longue est signalée avec son numéro, un guillemet ouvert aussi', () => {
  const r = S.lireCsv('a;b\n1;2;3\n4;5');
  assert.strictEqual(r.avis.length, 1);
  assert.match(r.avis[0], /Ligne 1 : 3 cellules pour 2 en-têtes/);
  assert.deepStrictEqual(r.lignes, [['1', '2'], ['4', '5']]);
  const o = S.lireCsv('a;b\n"1;2');
  assert.match(o.avis[0], /guillemet/);
});

test('texte vide : rien, sans erreur', () => {
  assert.deepStrictEqual(S.lireCsv('').entetes, []);
  assert.deepStrictEqual(S.lireCsv(null).lignes, []);
});

test('oui/non : les formes usuelles, et le reste n\'est pas deviné', () => {
  ['oui', 'Oui', ' X ', '1', 'vrai', 'TRUE', 'ja', 'coché'].forEach(v => assert.strictEqual(S.lireOuiNon(v), true, v));
  ['non', 'Non', '0', 'faux', '', 'nein'].forEach(v => assert.strictEqual(S.lireOuiNon(v), false, v));
  ['peut-être', '2', 'oui mais'].forEach(v => assert.strictEqual(S.lireOuiNon(v), null, v));
});

test('choix d\'une liste : exact, puis sans accents ni casse, sinon rien', () => {
  const o = ['Célibataire', 'Marié', 'Divorcé'];
  assert.strictEqual(S.choisirOption('Marié', o), 'Marié');
  assert.strictEqual(S.choisirOption('celibataire', o), 'Célibataire');
  assert.strictEqual(S.choisirOption('DIVORCE', o), 'Divorcé');
  assert.strictEqual(S.choisirOption('veuf', o), null);
  assert.strictEqual(S.choisirOption('', o), null);
});

const champs = [
  { name: 'Nom', kind: 'text' },
  { name: 'Accord', kind: 'check' },
  { name: 'Etat civil', kind: 'dropdown', options: ['Célibataire', 'Marié'] },
  { name: 'Commune', kind: 'text' },
];

test('le plan : valeurs par champ, avis nommant la ligne, la colonne et le champ ; un champ non relié est laissé', () => {
  const csv = S.lireCsv('Nom;Accord;État civil\nDupont;oui;marié\nMartin;peut-être;veuf\nRey;;');
  const liens = { Nom: 0, Accord: 1, 'Etat civil': 2, Commune: -1 };
  const p = S.planDeSerie(champs, csv, liens);
  assert.deepStrictEqual(p.lignes[0].valeurs, { Nom: 'Dupont', Accord: true, 'Etat civil': 'Marié' });
  // « peut-être » : la case n'est pas touchée, « veuf » : le choix n'existe pas, les deux sont dits
  assert.deepStrictEqual(p.lignes[1].valeurs, { Nom: 'Martin' });
  assert.strictEqual(p.avis.length, 2);
  assert.match(p.avis[0], /Ligne 2, « Accord » → « Accord » : « peut-être »/);
  assert.match(p.avis[1], /Ligne 2, « État civil » → « Etat civil » : « veuf »/);
  // cellules vides : case décochée, liste vidée, texte vide
  assert.deepStrictEqual(p.lignes[2].valeurs, { Nom: 'Rey', Accord: false, 'Etat civil': '' });
  assert.ok(!('Commune' in p.lignes[0].valeurs));
});

test('noms des copies : numéro, cellules, accents conservés, marques inconnues repérées, doublons départagés', () => {
  const e = ['Nom', 'Prénom'];
  assert.strictEqual(S.nomDeSerie('{n}', e, ['A', 'B'], 7, 12), '007');
  assert.strictEqual(S.nomDeSerie('conv-{n}', e, ['A', 'B'], 7, 1200), 'conv-0007');
  assert.strictEqual(S.nomDeSerie('{nom}-{PRENOM}', e, ['Dupont', 'Léa'], 1, 3), 'Dupont-Léa');
  assert.strictEqual(S.nomDeSerie('{Adresse}', e, ['A', 'B'], 1, 3), '{Adresse}');
  assert.deepStrictEqual(S.marquesInconnues('{Nom}-{x}-{n}', e), ['{x}']);
  assert.deepStrictEqual(S.nomsUniques(['Dupont', 'Martin', 'dupont', 'Dupont']), ['Dupont', 'Martin', 'dupont (2)', 'Dupont (3)']);
});
