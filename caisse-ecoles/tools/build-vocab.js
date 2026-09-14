/*
 * Construit la base de référence intégrée à l'application à partir d'un classeur de caisse.
 *
 *   node tools/build-vocab.js [chemin/du/classeur.xlsx]
 *
 * Écrit deux fichiers :
 *   src/vocabulaire.js       mots, désignations de classes, comptes, comptes et sens par type
 *                            -> versionné (données de gestion, aucune donnée personnelle)
 *   src/vocabulaire-noms.js  noms des personnes rencontrées dans les libellés
 *                            -> NON versionné (données personnelles), inclus seulement dans
 *                               la version de l'application utilisée dans l'établissement
 */
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const P = require('../src/parser.js');
const X = require('../src/excel.js')(ExcelJS);

const root = path.join(__dirname, '..');
const input = process.argv[2] || path.join(root, 'samples', 'caisse.xlsx');
const SEP = String.fromCharCode(1);

function compact(vocab) {
  const agg = (list, by, key) => {
    const m = new Map();
    for (const it of list || []) {
      const k = `${it[by]}${SEP}${it[key]}`;
      if (!m.has(k)) m.set(k, { [by]: it[by], [key]: it[key], n: 0 });
      m.get(k).n += it.n || 1;
    }
    return Array.from(m.values()).sort((a, b) => b.n - a.n);
  };
  return {
    words: vocab.words.slice().sort((a, b) => a.localeCompare(b, 'fr')),
    classTokens: vocab.classTokens.slice().sort((a, b) => a.localeCompare(b, 'fr', { numeric: true })),
    accounts: vocab.accounts.slice().sort(),
    typeAccounts: agg(vocab.typeAccounts, 'type', 'compte'),
    typeSides: agg(vocab.typeSides, 'type', 'side'),
    accountSides: agg(vocab.accountSides, 'compte', 'side'),
  };
}

function moduleFile(global, data, header) {
  return `/*\n${header}\n */\n(function (root, factory) {\n` +
    `  if (typeof module === 'object' && module.exports) module.exports = factory();\n` +
    `  else root.${global} = factory();\n` +
    `})(typeof self !== 'undefined' ? self : this, function () {\n  'use strict';\n  return ` +
    JSON.stringify(data, null, 2).replace(/\n/g, '\n  ') + ';\n});\n';
}

(async () => {
  if (!fs.existsSync(input)) {
    console.error(`Classeur introuvable : ${input}`);
    console.error('Usage : node tools/build-vocab.js chemin/du/classeur.xlsx');
    process.exit(1);
  }
  const data = await X.readWorkbook(fs.readFileSync(input));
  const learned = P.learnVocabulary(data.entries);
  const base = compact(learned);
  const years = new Set(data.entries.map((e) => (e.date || '').slice(0, 4)).filter(Boolean));
  const source = `${path.basename(input)} – ${data.entries.length} écriture(s)` +
    (years.size ? `, année(s) ${Array.from(years).sort().join(', ')}` : '');
  const stamp = new Date().toISOString().slice(0, 10);

  base.source = source;
  base.generated = stamp;

  fs.writeFileSync(path.join(root, 'src', 'vocabulaire.js'), moduleFile('CaisseVocab', base,
    ' * Base de référence intégrée : vocabulaire des libellés, désignations de classes, comptes,\n' +
    " * comptes et sens habituels par type d'écriture.\n *\n" +
    ` * Source : ${source}\n * Généré le ${stamp} par tools/build-vocab.js – ne pas modifier à la main.\n` +
    ' * Aucune donnée personnelle : les noms sont dans vocabulaire-noms.js (non versionné).'));

  const persons = {
    persons: learned.persons.slice().sort((a, b) => a.localeCompare(b, 'fr')),
    source,
    generated: stamp,
  };
  fs.writeFileSync(path.join(root, 'src', 'vocabulaire-noms.js'), moduleFile('CaisseVocabNoms', persons,
    ' * Noms des personnes rencontrées dans les libellés du classeur, pour corriger les noms mal lus.\n *\n' +
    ` * Source : ${source}\n * Généré le ${stamp} par tools/build-vocab.js – ne pas modifier à la main.\n` +
    " * DONNÉES PERSONNELLES : ce fichier n'est pas versionné et ne doit pas être publié."));

  console.log(`OK – base intégrée : ${base.words.length} mots, ${base.classTokens.length} classes, ` +
    `${base.accounts.length} comptes, ${base.typeAccounts.length} paires type/compte, ` +
    `${base.typeSides.length} sens par type, ${base.accountSides.length} sens par compte`);
  console.log(`     noms (fichier séparé, non versionné) : ${persons.persons.length}`);
  console.log(`     source : ${source}`);
})().catch((e) => { console.error(e); process.exit(1); });
