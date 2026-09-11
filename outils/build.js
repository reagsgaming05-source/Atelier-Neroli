// Construit les deux fichiers livrés à partir de source.html.
//
//   node outils/build.js
//
// Les bibliothèques sont attendues dans outils/libs, récupérées depuis npm :
//   npm pack pdfjs-dist@3.11.174 @cantoo/pdf-lib@2.11.0 jszip@3.10.1
//   puis décompressées dans outils/libs/<nom>-<version>/
// Fichiers utilisés :
//   pdfjs-dist-3.11.174/build/pdf.min.js
//   pdfjs-dist-3.11.174/build/pdf.worker.min.js
//   cantoo-pdf-lib-2.11.0/dist/pdf-lib.min.js   (pdf-lib, avec le chiffrement)
//   jszip-3.10.1/dist/jszip.min.js
//
// La version en ligne charge ces bibliothèques depuis un CDN ; la version hors
// ligne les contient.
const fs = require('fs');
const path = require('path');
const LIB = path.join(__dirname, 'libs');
const src = fs.readFileSync(path.join(__dirname, 'source.html'), 'utf8');
const HEAD = '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="color-scheme" content="dark light">\n</head>\n<body>\n';
const TAIL = '</body>\n</html>\n';
const OUT = '/home/user/Atelier-Neroli/outils';

// 1. version en ligne (composants chargés depuis les CDN)
fs.writeFileSync(path.join(OUT, 'blonay-pdf.html'), HEAD + src + TAIL);

// 2. version hors ligne : les trois bibliothèques sont incluses dans le fichier
// Une séquence <!-- ou </script dans le code fait dérailler l'analyseur HTML.
// Les échapper ne change pas le programme : "<\\!--" vaut "<!--" en JavaScript.
const read = p => fs.readFileSync(path.join(LIB, p), 'utf8')
  .replace(/<!--/g, '<\\!--')
  .replace(/<\/script/gi, '<\\/script');
const worker = read('pdfjs-dist-3.11.174/build/pdf.worker.min.js');
const inline = [
  '<script id="blonay-worker" type="text/plain">\n' + worker + '\n</script>',
  '<script>window.__blonayWorker = URL.createObjectURL(new Blob([document.getElementById("blonay-worker").textContent], { type: "text/javascript" }));</script>',
  '<script>' + read('pdfjs-dist-3.11.174/build/pdf.min.js') + '</script>',
  '<script>' + read('cantoo-pdf-lib-2.11.0/dist/pdf-lib.min.js') + '</script>',
  '<script>' + read('jszip-3.10.1/dist/jszip.min.js') + '</script>',
].join('\n');
// Remplacement par fonction : sinon les $& ou $` du code des bibliothèques
// seraient interprétés comme des motifs et injecteraient le reste de la page.
// Hors ligne, inutile d'appeler Google Fonts : la page utilise les polices du système.
const noFonts = src.replace(/<link rel="preconnect"[^>]*>\n/, '').replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\n/, '');
if (noFonts === src) throw new Error('liens de polices introuvables');
const offline = noFonts.replace('<script>\n(() => {', () => inline + '\n<script>\n(() => {');
if (offline === src) throw new Error("point d'insertion introuvable");
fs.writeFileSync(path.join(OUT, 'blonay-pdf-hors-ligne.html'), HEAD + offline + TAIL);

for (const f of ['blonay-pdf.html', 'blonay-pdf-hors-ligne.html']) {
  console.log(f.padEnd(30), (fs.statSync(path.join(OUT, f)).size / 1024 / 1024).toFixed(2) + ' Mo');
}
