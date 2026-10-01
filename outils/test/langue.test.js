// La langue de l'interface : le traducteur (textes connus, textes assemblés, pluriels) et le dictionnaire
// allemand, confronté à ce que le code affiche réellement. Un texte qui s'affiche sans traduction fait
// échouer ce test : mieux vaut le savoir ici que dans une interface allemande à moitié française.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { extraire } = require('./aide');
const { relever } = require('../i18n/extraire');

const { fabriquerTraducteur, LANGUES } = extraire('// @debut-langue', '// @fin-langue', '{ fabriquerTraducteur, LANGUES }');
const dico = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'i18n', 'de.json'), 'utf8'));
const tr = fabriquerTraducteur(dico);

test('deux langues, nommées dans leur propre langue', () => {
  assert.deepStrictEqual(Object.keys(LANGUES), ['fr', 'de']);
  assert.strictEqual(LANGUES.de, 'Deutsch');
});

test('un texte connu se traduit, un texte inconnu est rendu intact', () => {
  assert.strictEqual(tr('Imprimer'), 'Drucken');
  assert.strictEqual(tr('Un texte que personne n\'a écrit'), 'Un texte que personne n\'a écrit');
  assert.strictEqual(tr(''), '');
});

test('les espaces et retours à la ligne du HTML ne gênent pas', () => {
  assert.strictEqual(tr('\n    Imprimer\n  '), '\n    Drucken\n  ');
  assert.strictEqual(tr('  Imprimer'), '  Drucken');
});

test('un texte assemblé retrouve son motif, et ses morceaux sont traduits à leur tour', () => {
  assert.strictEqual(tr('Page 3 sur 12 - remplacez cet exemple par vos propres documents.'), 'Seite 3 von 12 – ersetzen Sie dieses Beispiel durch Ihre eigenen Dokumente.');
  // « Fichier : x » : le nom du fichier reste tel quel
  assert.strictEqual(tr('Fichier : convocation.pdf'), 'Datei: convocation.pdf');
  // le morceau variable est lui-même un texte connu
  assert.strictEqual(tr('Enregistré sans déclaration PDF/A : Imprimer'), 'Ohne PDF/A-Deklaration gespeichert: Drucken');
});

test('un texte assemblé hors de tout motif garde ses morceaux connus traduits, en mots entiers', () => {
  assert.strictEqual(tr('rapport.pdf · modifié'), 'rapport.pdf · geändert');
  // « Imprimer » seul est un mot connu ; « Imprimerie » n'en contient pas
  assert.strictEqual(tr('Imprimerie nationale'), 'Imprimerie nationale');
  assert.strictEqual(tr('Aller à Imprimer maintenant'), 'Aller à Drucken maintenant');
});

test('l\'ordre des morceaux peut changer d\'une langue à l\'autre', () => {
  const t = fabriquerTraducteur({ motifs: { 'Le {0} de {1}': '{1} hat {0}' } });
  assert.strictEqual(t('Le chat de Paul'), 'Paul hat chat');
});

test('le motif le plus précis l\'emporte sur le plus général', () => {
  const t = fabriquerTraducteur({ motifs: { '{0} sur {1}': 'général {0}/{1}', '{0} sur {1} · fait': 'précis {0}/{1}' } });
  assert.strictEqual(t('3 sur 5 · fait'), 'précis 3/5');
  assert.strictEqual(t('3 sur 5'), 'général 3/5');
});

test('le pluriel allemand : « 0 Seiten », « 1 Seite »', () => {
  assert.strictEqual(tr.pluriel(0, 'page', 'pages', 'de'), 'Seiten');
  assert.strictEqual(tr.pluriel(1, 'page', 'pages', 'de'), 'Seite');
  assert.strictEqual(tr.pluriel(2, 'page', 'pages', 'de'), 'Seiten');
  // une forme française identique au singulier et au pluriel (« avis ») a son pluriel allemand à part
  assert.strictEqual(tr.pluriel(1, 'avis', 'avis', 'de'), 'Hinweis');
  assert.strictEqual(tr.pluriel(3, 'avis', 'avis', 'de'), 'Hinweise');
});

test('les caractères spéciaux d\'un motif ne sont pas pris pour une expression régulière', () => {
  const t = fabriquerTraducteur({ motifs: { 'a (b) [c] {0}.*?': 'x {0}' } });
  assert.strictEqual(t('a (b) [c] 7.*?'), 'x 7');
  assert.strictEqual(t('a b c 7'), 'a b c 7');
});

// --- Le dictionnaire face au code --------------------------------------------------------------------------
const releve = relever();

test('chaque texte que le code affiche a sa traduction allemande', () => {
  const manque = [];
  for (const s of ['litteraux', 'motifs', 'html']) for (const k of Object.keys(releve[s])) if (!(k in dico[s])) manque.push(s + ' : ' + JSON.stringify(k));
  assert.deepStrictEqual(manque, [], manque.length + ' texte(s) sans traduction ; node i18n/majdico.js les liste');
});

test('le dictionnaire ne garde pas de texte que le code n\'affiche plus', () => {
  const orphelins = [];
  for (const s of ['litteraux', 'motifs', 'html']) for (const k of Object.keys(dico[s])) if (!(k in releve[s])) orphelins.push(s + ' : ' + JSON.stringify(k));
  assert.deepStrictEqual(orphelins, [], 'node i18n/majdico.js --ecrire les retire');
});

test('une traduction est écrite : ni vide, ni restée à moitié française', () => {
  const suspects = [];
  const MOTS_FRANCAIS = /\b(le|la|les|une|un|du|est|sont|pour|dans|avec|sans|sur|vos|votre|ce|cette|ces|pas|ne|et|ou|au|aux)\b/i;
  for (const s of ['litteraux', 'motifs', 'html']) for (const [k, v] of Object.entries(dico[s])) {
    if (!v.trim()) { suspects.push('vide : ' + JSON.stringify(k)); continue; }
    if (v === k) continue;   // identique à dessein : un sigle, une mesure, une forme technique
    const reste = v.replace(/«[^»]*»/g, '').replace(/\{\d+\}/g, '');
    if (MOTS_FRANCAIS.test(reste) && !/\b(Aktum|PDF|OCR|ZIP|CSV|Bates)\b/.test(reste)) suspects.push(JSON.stringify(k) + ' → ' + JSON.stringify(v));
  }
  assert.deepStrictEqual(suspects, []);
});

test('un motif garde les mêmes morceaux variables dans les deux langues', () => {
  const faux = [];
  const morceaux = t => Array.from(t.matchAll(/\{(\d+)\}/g), m => m[1]).sort().join(',');
  for (const [k, v] of Object.entries(dico.motifs)) if (morceaux(k) !== morceaux(v)) faux.push(JSON.stringify(k) + ' → ' + JSON.stringify(v));
  assert.deepStrictEqual(faux, []);
});

test('un même texte ne se dit pas de deux façons selon la section', () => {
  const doubles = [];
  for (const k of Object.keys(dico.html)) if (k in dico.litteraux && dico.html[k] !== dico.litteraux[k]) doubles.push(k);
  assert.deepStrictEqual(doubles, []);
});

test('les formes françaises identiques au singulier et au pluriel ont leur pluriel allemand', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'assembler.js'), 'utf8') && require('./aide').SOURCE;
  const manque = [];
  for (const m of source.matchAll(/plural\([^,()]+(?:\([^()]*\))?[^,()]*, *'((?:[^'\\]|\\.)+)', *'((?:[^'\\]|\\.)+)'\)/g)) {
    if (m[1] === m[2] && !(m[1].replace(/\\'/g, '\'') in (dico.pluriels || {}))) manque.push(m[1]);
  }
  assert.deepStrictEqual(manque, []);
});

test('l\'allemand suit les règles de la maison : « Sie », guillemets français, pas de « ß »', () => {
  const faux = [];
  for (const s of ['litteraux', 'motifs', 'html']) for (const [k, v] of Object.entries(dico[s])) {
    if (v.includes('ß')) faux.push('ß : ' + v);
    if (/\bdu\b|\bdein(e|en|em|er|es)?\b/i.test(v.replace(/«[^»]*»/g, ''))) faux.push('tutoiement : ' + v);
    if (/„|“|”/.test(v)) faux.push('guillemets : ' + v);
  }
  assert.deepStrictEqual(faux, []);
});
