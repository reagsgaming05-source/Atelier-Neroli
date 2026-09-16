// Copie la page autonome hors ligne (../blonay-pdf-hors-ligne.html, produite par
// `npm run build` dans outils/) dans desktop/app/, d'où Electron la charge.
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'blonay-pdf-hors-ligne.html');
if (!fs.existsSync(src)) {
  console.error('blonay-pdf-hors-ligne.html introuvable : lancez d\'abord `npm run build` dans outils/');
  process.exit(1);
}
const html = fs.readFileSync(src, 'utf8');
for (const attendu of ['BlonayDesktop', 'ouvrirListe', 'pdfjsLib']) {
  if (!html.includes(attendu)) { console.error('page incomplète : « ' + attendu + ' » manque'); process.exit(1); }
}
fs.mkdirSync(path.join(__dirname, 'app'), { recursive: true });
fs.copyFileSync(src, path.join(__dirname, 'app', 'index.html'));
// La date et le commit de construction (écrits par build.js), pour « À propos ».
const info = path.join(__dirname, 'construction.json');
fs.writeFileSync(path.join(__dirname, 'app', 'construction.json'), fs.existsSync(info) ? fs.readFileSync(info) : '{"construction":""}\n');
console.log('OK -> desktop/app/index.html (' + (html.length / 1024 / 1024).toFixed(2) + ' Mo)');
