// Récupère depuis npm les trois bibliothèques que build.js embarque dans les
// versions hors ligne, sous libs/<nom>-<version>/ :
//   node recuperer-libs.js      (ou : npm run libs)
// Elles ne sont pas suivies par git (voir .gitignore) : ce script les remet,
// sous Windows comme sous Linux (npm et tar sont livrés avec les deux).
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const PAQUETS = [['pdfjs-dist', '3.11.174'], ['@cantoo/pdf-lib', '2.11.0'], ['jszip', '3.10.1']];
const LIBS = path.join(__dirname, 'libs');
fs.mkdirSync(LIBS, { recursive: true });
for (const [nom, version] of PAQUETS) {
  const dossier = path.join(LIBS, nom.replace(/^@/, '').replace('/', '-') + '-' + version);
  if (fs.existsSync(path.join(dossier, 'package.json'))) { console.log(path.basename(dossier) + ' : déjà là'); continue; }
  const sortie = execSync('npm pack ' + nom + '@' + version + ' --silent', { cwd: LIBS, encoding: 'utf8' });
  const archive = sortie.trim().split(/\r?\n/).pop();
  fs.rmSync(dossier, { recursive: true, force: true });
  fs.mkdirSync(dossier, { recursive: true });
  execSync('tar -xzf "' + archive + '" -C "' + dossier + '" --strip-components=1', { cwd: LIBS, stdio: 'inherit' });
  console.log(path.basename(dossier) + ' : récupéré');
}
