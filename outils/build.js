// Produit les deux fichiers livrés à partir de la source unique pro.html
const fs = require('fs');
const path = require('path');
const LIB = path.join(__dirname, 'libs');
const src = fs.readFileSync(path.join(__dirname, 'source.html'), 'utf8');
const HEAD = '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="color-scheme" content="dark light">\n</head>\n<body>\n';
const TAIL = '</body>\n</html>\n';
const OUT = '/home/user/Atelier-Neroli/outils';

// Règles de sécurité : la page n'a le droit de contacter personne. Ce n'est pas
// une promesse mais une contrainte appliquée par le navigateur lui-même.
// La version en ligne n'en reçoit pas : elle charge ses composants depuis un CDN
// et la plateforme qui l'héberge applique déjà les siennes.
const csp = extra => '<meta http-equiv="Content-Security-Policy" content="'
  + "default-src 'none'; "
  + "script-src 'unsafe-inline' blob:" + (extra ? " 'self'" : '') + '; '
  + "worker-src blob:" + (extra ? " 'self'" : '') + '; '
  + "style-src 'unsafe-inline'; "
  + 'img-src data: blob:' + (extra ? " 'self'" : '') + '; '
  + 'connect-src blob: data:' + (extra ? " 'self'" : '') + '; '
  + (extra ? "manifest-src 'self'; " : '')
  + "object-src 'none'; base-uri 'none'; form-action 'none'"
  + '">\n';

// 1. version en ligne (composants chargés depuis les CDN)
fs.writeFileSync(path.join(OUT, 'blonay-pdf.html'), HEAD + src + TAIL);

// 2. version hors ligne : les trois bibliothèques sont incluses dans le fichier
// Une séquence <!-- ou </script dans le code fait dérailler l'analyseur HTML.
// Les échapper ne change pas le programme : "<\\!--" vaut "<!--" en JavaScript.
const read = p => fs.readFileSync(path.join(LIB, p), 'utf8')
  .replace(/<!--/g, '<\\!--')
  .replace(/<\/script/gi, '<\\/script');
const worker = read('pdfjs-dist-3.11.174/build/pdf.worker.min.js');
const cspOffline = csp(false);
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
fs.writeFileSync(path.join(OUT, 'blonay-pdf-hors-ligne.html'),
  HEAD.replace('<meta charset="utf-8">\n', '<meta charset="utf-8">\n' + cspOffline) + offline + TAIL);

// 3. version « installable » : même page, plus le manifeste et le cache hors
//    ligne. À déposer sur une adresse https, où le navigateur proposera
//    « Installer en tant qu'application ». Le manifeste doit être dans <head>,
//    sinon le navigateur l'ignore.
const SITE = path.join(OUT, '..', 'docs'); // GitHub Pages sait servir /docs
const SITE_HEAD = '<!doctype html>\n<html lang="fr">\n<head>\n'
  + '<meta charset="utf-8">\n'
  + csp(true)
  + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
  + '<meta name="color-scheme" content="dark light">\n'
  + '<title>Blonay PDF</title>\n'
  + '<link rel="manifest" href="manifest.webmanifest">\n'
  + '<meta name="theme-color" content="#1B1E23">\n'
  + '<meta name="description" content="Organiser, annoter et protéger des PDF, directement sur votre ordinateur.">\n'
  + '<meta name="apple-mobile-web-app-capable" content="yes">\n'
  + '<meta name="apple-mobile-web-app-title" content="Blonay PDF">\n'
  + '<link rel="apple-touch-icon" href="icon-192.png">\n'
  + '<link rel="icon" href="icon.svg">\n'
  + '</head>\n<body>\n';
const pwaTail = '\n<script>\n'
  + "if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {\n"
  + "  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));\n"
  + '}\n'
  + '</scr' + 'ipt>\n';
// le titre et l'icône intégrée sont déjà dans l'en-tête ci-dessus
const siteBody = offline
  .replace('<title>Blonay PDF</title>\n', () => '')
  .replace(/<link rel="icon" href="data:image\/svg\+xml;base64,[^"]*">\n/, '');
fs.writeFileSync(path.join(SITE, 'index.html'), SITE_HEAD + siteBody + pwaTail + TAIL);

// 4. version pour l'application de bureau : l'icône est un vrai fichier posé à
//    côté de la page. Une icône encodée dans la page n'est jamais chargée par
//    le moteur d'affichage, d'où une fenêtre sans icône dans la barre des tâches.
const APPDIR = path.join(OUT, 'application', 'lanceur');
const APP_HEAD = '<!doctype html>\n<html lang="fr">\n<head>\n'
  + '<meta charset="utf-8">\n'
  + csp(true)
  + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
  + '<meta name="color-scheme" content="dark light">\n'
  + '<title>Blonay PDF</title>\n'
  + '<link rel="icon" type="image/png" sizes="256x256" href="icon-256.png">\n'
  + '<link rel="icon" type="image/png" sizes="48x48" href="icon-48.png">\n'
  + '<link rel="icon" type="image/png" sizes="32x32" href="icon-32.png">\n'
  + '</head>\n<body>\n';
fs.writeFileSync(path.join(APPDIR, 'blonay-pdf.html'), APP_HEAD + siteBody + TAIL);
for (const ic of ['icon-32.png', 'icon-48.png', 'icon-256.png']) {
  fs.copyFileSync(path.join(OUT, 'application', ic), path.join(APPDIR, ic));
}

for (const f of ['blonay-pdf.html', 'blonay-pdf-hors-ligne.html', '../docs/index.html', 'application/lanceur/blonay-pdf.html']) {
  console.log(f.replace('../', '').padEnd(34), (fs.statSync(path.join(OUT, f)).size / 1024 / 1024).toFixed(2) + ' Mo');
}
