const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const P = require('../src/parser.js');

const vocabPath = path.join(__dirname, '..', 'src', 'vocabulaire.js');
const namesPath = path.join(__dirname, '..', 'src', 'vocabulaire-noms.js');

test('la base intégrée est utilisable telle quelle par l\'analyseur', () => {
  const v = require(vocabPath);
  assert.ok(v.words.length > 100, 'vocabulaire trop petit');
  assert.ok(v.accounts.length > 5);
  assert.ok(v.classTokens.includes('9S'));
  assert.ok(v.typeSides.some((t) => t.type === 'REMBOURSEMENT' && t.side === 'credit' && t.n > 5));
  assert.ok(v.typeAccounts.some((t) => t.n > 1), 'les paires type/compte doivent être agrégées');
  assert.ok(v.source && v.generated, 'origine et date de génération manquantes');
  // utilisable comme vocabulaire complet
  const merged = P.mergeVocabulary(P.emptyVocabulary(), Object.assign({ persons: [] }, v));
  const idx = P.buildIndex(merged);
  assert.equal(idx.expectedSide.get('REMBOURSEMENT').side, 'credit');
  assert.equal(idx.expectedSide.get('RECETTE').side, 'debit');
  assert.equal(idx.expectedSide.has('DECOMPTE'), false, 'un type au sens variable ne doit pas faire règle');
  assert.equal(P.correctWord('chour', idx), 'chœur');
  assert.equal(P.correctClassToken('98', idx), '9S');
});

test('les compteurs agrégés comptent comme autant d\'occurrences', () => {
  const v = { typeSides: [{ type: 'TEST', side: 'credit', n: 7 }], typeAccounts: [{ type: 'TEST', compte: '1.2', n: 4 }, { type: 'TEST', compte: '1.3', n: 1 }] };
  const idx = P.buildIndex(P.mergeVocabulary(P.emptyVocabulary(), v));
  assert.deepEqual(idx.expectedSide.get('TEST'), { side: 'credit', n: 7 });
});

test('la base versionnée ne contient aucun nom de personne', () => {
  const raw = fs.readFileSync(vocabPath, 'utf8');
  const v = require(vocabPath);
  assert.equal(v.persons, undefined, 'la base versionnée ne doit pas porter de liste de noms');
  // aucune chaîne de la forme "A. Nom" (initiale + nom de famille)
  const suspects = raw.match(/"[A-ZÀ-Ý][a-zà-ÿ]?\.\s*[A-ZÀ-Ý][a-zà-ÿ]+"/g) || [];
  assert.deepEqual(suspects, [], `noms trouvés dans la base versionnée : ${suspects.join(', ')}`);
  for (const w of v.words) assert.ok(!P.looksLikePerson(w), `« ${w} » ressemble à un nom de personne`);
});

test('les noms, quand ils existent, sont dans un module séparé non versionné', { skip: !fs.existsSync(namesPath) && 'vocabulaire-noms.js absent' }, () => {
  const n = require(namesPath);
  assert.ok(Array.isArray(n.persons) && n.persons.length > 0);
  assert.ok(n.persons.every((p) => P.looksLikePerson(p)));
  const ignored = fs.readFileSync(path.join(__dirname, '..', '..', '.gitignore'), 'utf8');
  assert.match(ignored, /vocabulaire-noms\.js/, 'le fichier des noms doit être exclu du dépôt');
});

test('aucun nom réel du classeur ne figure dans le code versionné', { skip: !fs.existsSync(namesPath) && 'vocabulaire-noms.js absent' }, () => {
  const real = new Set(require(namesPath).persons);
  const dir = path.join(__dirname, '..');
  // dist/ en fait partie : c'est un fichier versionné, et c'est celui que « node build.js »
  // produisait avec les noms avant qu'il n'écrive dans un fichier séparé exclu du dépôt
  const versionne = (f) => !/-avec-noms\.html$/.test(f);
  const files = ['README.md', 'build.js']
    .concat(fs.readdirSync(path.join(dir, 'src')).filter((f) => f !== 'vocabulaire-noms.js').map((f) => path.join('src', f)))
    .concat(fs.readdirSync(path.join(dir, 'test')).map((f) => path.join('test', f)))
    .concat(fs.readdirSync(path.join(dir, 'tools')).map((f) => path.join('tools', f)))
    .concat(fs.existsSync(path.join(dir, 'dist')) ? fs.readdirSync(path.join(dir, 'dist')).filter(versionne).map((f) => path.join('dist', f)) : []);
  const found = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const name of real) if (raw.includes(name)) found.push(`${f} : ${name}`);
  }
  assert.deepEqual(found, [], `noms réels dans des fichiers versionnés :\n  ${found.join('\n  ')}`);
});
