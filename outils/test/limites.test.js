// « Ce que le logiciel ne fait pas encore » : un document livré avec l'application (docs/limites-connues.html) et une page du site (site/src/content/limites.ts)
// disent les mêmes limites. Les deux sont écrits à la main ; ce test les empêche de diverger.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'limites-connues.html'), 'utf8');
const site = fs.readFileSync(path.join(__dirname, '..', '..', 'site', 'src', 'content', 'limites.ts'), 'utf8');
const nette = (t) => t.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&rsquo;/g, '\'').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// le document : la première cellule de chaque ligne de tableau (la limite), la deuxième (ce qui existe à la place)
const lignesDoc = [...doc.matchAll(/<tr><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)].map((m) => ({ limite: nette(m[1]), apres: nette(m[2]) }));
// le site : chaque { limite: "…", apres: "…" } (les chaînes sont entre guillemets doubles, avec des \" possibles)
const chaine = String.raw`"((?:[^"\\]|\\.)*)"`;
const lignesSite = [...site.matchAll(new RegExp('limite:\\s*' + chaine + ',\\s*apres:\\s*' + chaine, 'g'))].map((m) => ({ limite: nette(JSON.parse('"' + m[1] + '"')), apres: nette(JSON.parse('"' + m[2] + '"')) }));
// les titres des groupes
const titresDoc = [...doc.matchAll(/<h2>([^<]+)<\/h2>/g)].map((m) => nette(m[1])).filter((t) => !/^Ce qui ne dépend pas/.test(t));
const titresSite = [...site.matchAll(/titre:\s*"([^"]+)"/g)].map((m) => m[1]);

test('le document et le site disent les mêmes limites, dans le même ordre', () => {
  assert.ok(lignesDoc.length >= 14, 'le document est lu : ' + lignesDoc.length);
  assert.deepStrictEqual(lignesSite.map((l) => l.limite), lignesDoc.map((l) => l.limite));
});

test('et pour chacune, ce qui existe à la place', () => {
  assert.deepStrictEqual(lignesSite.map((l) => l.apres), lignesDoc.map((l) => l.apres));
});

test('sous les mêmes titres de groupes', () => {
  assert.deepStrictEqual(titresSite, titresDoc);
});

test('aucune limite ne promet une date : « pas encore » veut dire « pas dans cette version »', () => {
  for (const l of lignesSite) assert.ok(!/\b(bient[oô]t|prochainement|d['’]ici|en 20\d\d|au printemps|au trimestre|prévu)\b/i.test(l.limite + ' ' + l.apres), l.limite);
});

test('le document est dans la liste de ceux que la construction fabrique et que l\'archive livre', () => {
  const { DOCUMENTS } = require('../docs/liste-des-documents');
  assert.ok(DOCUMENTS.some(([src, pdf]) => src === 'limites-connues.html' && pdf === 'Limites-connues.pdf'));
});
