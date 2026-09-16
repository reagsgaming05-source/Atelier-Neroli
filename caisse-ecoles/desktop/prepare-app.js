// Copie l'application autonome construite (dist/Caisse-ecoles.html, version publique sans noms)
// dans desktop/app/, d'où Electron la charge.
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'dist', 'Caisse-ecoles.html');
if (!fs.existsSync(src)) {
  console.error('dist/Caisse-ecoles.html introuvable : lancez d\'abord `npm run build:public` dans caisse-ecoles/');
  process.exit(1);
}
const html = fs.readFileSync(src, 'utf8');
if (/root\.CaisseVocabNoms\s*=/.test(html)) {
  console.error('dist/Caisse-ecoles.html contient les noms de personnes : construisez avec `npm run build:public` avant d\'empaqueter.');
  process.exit(1);
}
fs.mkdirSync(path.join(__dirname, 'app'), { recursive: true });
fs.copyFileSync(src, path.join(__dirname, 'app', 'Caisse-ecoles.html'));
console.log(`OK -> desktop/app/Caisse-ecoles.html (${(html.length / 1024 / 1024).toFixed(2)} Mo)`);
// Police Inter (SIL OFL) pour la barre d'onglets et le thème injecté dans Décompte DGEO
const fontSrc = path.join(__dirname, '..', 'node_modules', '@fontsource-variable', 'inter', 'files');
fs.mkdirSync(path.join(__dirname, 'app', 'fonts'), { recursive: true });
for (const f of ['inter-latin-wght-normal.woff2', 'inter-latin-ext-wght-normal.woff2']) {
  fs.copyFileSync(path.join(fontSrc, f), path.join(__dirname, 'app', 'fonts', f));
}
console.log('OK -> desktop/app/fonts/ (Inter)');
