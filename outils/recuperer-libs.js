// Récupère depuis npm les bibliothèques que build.js embarque dans les
// versions hors ligne, sous libs/<nom>-<version>/ :
//   node recuperer-libs.js      (ou : npm run libs)
// Elles ne sont pas suivies par git (voir .gitignore) : ce script les remet,
// sous Windows comme sous Linux (npm et tar sont livrés avec les deux).
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
// La reconnaissance de texte (OCR) : tesseract.js, son moteur wasm et les
// modèles de langue français et allemand (tessdata_best, entiers).
// Les polices Unicode (Arimo, Tinos, Cousine : sous licence SIL OFL 1.1, de mêmes
// largeurs que Helvetica, Times et Courier) et fontkit, qui permet à pdf-lib de les
// incorporer : c'est ce qui rend possibles les caractères hors WinAnsi et le PDF/A.
// node-forge lit les certificats PKCS#12 (.p12, .pfx) et fabrique la signature numérique.
// acorn n'est pas dans la page : il sert à l'outil de traduction (i18n/) et à son test, qui lisent le code.
const PAQUETS = [['pdfjs-dist', '3.11.174'], ['@cantoo/pdf-lib', '2.11.0'], ['jszip', '3.10.1'],
  ['tesseract.js', '7.0.0'], ['tesseract.js-core', '7.0.0'], ['@tesseract.js-data/fra', '1.0.0'], ['@tesseract.js-data/deu', '1.0.0'],
  ['@cantoo/fontkit', '2.0.12'], ['node-forge', '1.3.1'], ['acorn', '8.14.1'], ['@expo-google-fonts/arimo', '0.4.3'], ['@expo-google-fonts/tinos', '0.4.2'], ['@expo-google-fonts/cousine', '0.4.3']];
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
