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
// utif lit les images TIFF (scanners : Fax G4, LZW, PackBits, JPEG) ; pako ne lui sert qu'à décompresser le Deflate d'un TIFF.
// node-forge lit les certificats PKCS#12 (.p12, .pfx) et fabrique la signature numérique.
// Les polices de l'interface (Geist, Geist Mono, Instrument Serif : SIL OFL 1.1, sous-ensemble latin en WOFF2, tel que
// les distribue fontsource) : embarquées dans la feuille de style, pour que l'interface ait le dessin pour lequel elle a été
// faite sur tous les postes, au lieu de celui d'une police de substitution qu'on ne maîtrise pas.
// acorn n'est pas dans la page : il sert à l'outil de traduction (i18n/) et à son test, qui lisent le code.
const PAQUETS = [['pdfjs-dist', '3.11.174'], ['@cantoo/pdf-lib', '2.11.0'], ['jszip', '3.10.1'],
  ['tesseract.js', '7.0.0'], ['tesseract.js-core', '7.0.0'], ['@tesseract.js-data/fra', '1.0.0'], ['@tesseract.js-data/deu', '1.0.0'],
  ['@cantoo/fontkit', '2.0.12'], ['node-forge', '1.4.0'], ['utif', '3.1.0'], ['pako', '2.1.0'], ['acorn', '8.14.1'], ['@fontsource-variable/geist', '5.3.0'], ['@fontsource-variable/geist-mono', '5.3.0'], ['@fontsource/instrument-serif', '5.3.0'], ['@expo-google-fonts/arimo', '0.4.3'], ['@expo-google-fonts/tinos', '0.4.2'], ['@expo-google-fonts/cousine', '0.4.3']];
// L'empreinte SHA-512 (celle que le registre npm publie) de chacune des archives : ce qu'on embarque dans la page est ce qu'on a relu, pas ce que
// le registre sert ce jour-là. Une archive qui ne correspond pas est effacée et la construction s'arrête. Pour changer de version : récupérer
// l'archive, la relire, puis mettre ici son empreinte (`openssl dgst -sha512 -binary <archive> | base64`).
const EMPREINTES = {
  "pdfjs-dist@3.11.174": "sha512-TdTZPf1trZ8/UFu5Cx/GXB7GZM30LT+wWUNfsi6Bq8ePLnb+woNKtDymI2mxZYBpMbonNFqKmiz684DIfnd8dA==",
  "@cantoo/pdf-lib@2.11.0": "sha512-C5bUEG8F8nRqiZ00+ytp90QqNSMo1O1WEKVirh6J491H7D9+BBOs+SS0haFlJrb74gu7r2KD56FKDKOOgoy5jw==",
  "jszip@3.10.1": "sha512-xXDvecyTpGLrqFrvkrUSoxxfJI5AH7U8zxxtVclpsUtMCq4JQ290LY8AW5c7Ggnr/Y/oK+bQMbqK2qmtk3pN4g==",
  "tesseract.js@7.0.0": "sha512-exPBkd+z+wM1BuMkx/Bjv43OeLBxhL5kKWsz/9JY+DXcXdiBjiAch0V49QR3oAJqCaL5qURE0vx9Eo+G5YE7mA==",
  "tesseract.js-core@7.0.0": "sha512-WnNH518NzmbSq9zgTPeoF8c+xmilS8rFIl1YKbk/ptuuc7p6cLNELNuPAzcmsYw450ca6bLa8j3t0VAtq435Vw==",
  "@tesseract.js-data/fra@1.0.0": "sha512-pp58gMaoyidoBBLd5y5rnf0WW0Y1994QrGqZrYatITqIU/AReUJMykD+YY3JDgvnmgz7uAx1UmhjjuyEmV8JEA==",
  "@tesseract.js-data/deu@1.0.0": "sha512-3ter1p2gFAiCd5CMC+PodZ9YY2UDomkKj+ytlKeeZqOUmhLx1SDnYPf5zog0g5MBbxYveW+8omI3PUflqHfZ4Q==",
  "@cantoo/fontkit@2.0.12": "sha512-B9ZE4pA3cUf3pzn7UaPCtjyejd1ie16SLquCqdlGQiDncFgn8iD29dU9vD3dSgKkxAUx2ttvjg/li9JVkj5+fQ==",
  "node-forge@1.4.0": "sha512-LarFH0+6VfriEhqMMcLX2F7SwSXeWwnEAJEsYm5QKWchiVYVvJyV9v7UDvUv+w5HO23ZpQTXDv/GxdDdMyOuoQ==",
  "utif@3.1.0": "sha512-WEo4D/xOvFW53K5f5QTaTbbiORcm2/pCL9P6qmJnup+17eYfKaEhDeX9PeQkuyEoIxlbGklDuGl8xwuXYMrrXQ==",
  "pako@2.1.0": "sha512-w+eufiZ1WuJYgPXbV/PO3NCMEc3xqylkKHzp8bxp1uW4qaSNQUkwmLLEc3kKsfz8lpV1F8Ht3U1Cm+9Srog2ug==",
  "acorn@8.14.1": "sha512-OvQ/2pUDKmgfCg++xsTX1wGxfTaszcHVcTctW4UJB4hibJx2HXxxO5UmVgyjMa+ZDsiaf5wWLXYpRWMmBI0QHg==",
  "@fontsource-variable/geist@5.3.0": "sha512-j0m+vLQuG5XAYoHtGCVu0spvlGreR3EzpECUVzkFmI1mTVnAO38l/NEPDCFgZ177JxzYJCLSmTQibIiYPilGrA==",
  "@fontsource-variable/geist-mono@5.3.0": "sha512-vBbuwDEo9AkrqADMXOrlAR3DFcJi4/JxeuU43FoiQERnNwsfXNnvxvReZG02cQKmyk4DZkZdBZX3oTDvy2zBAw==",
  "@fontsource/instrument-serif@5.3.0": "sha512-mDiaIg0u67sYV59fie92Wz4sM8UiVlbL7fLxnFPCKkX15DMASEnQTREbaP5S5/3DCcsoAOcQ0sV9E4AeY4QqYQ==",
  "@expo-google-fonts/arimo@0.4.3": "sha512-kXMUJ303nJgKjJFr8yuiAY9dgIoAoj9HccKkaSw0J63/T4MSdxFejzfDUVLzUz+ohpQWinifV99QOAUQLcGKDg==",
  "@expo-google-fonts/tinos@0.4.2": "sha512-MQkfvUO1Aw7UP3jRtWLcjda+udanoL8ecrbkjbc3ZdhSI1iW/Uil4uD8O0eOiIxU2v/FeAT2XjGNiz5oYUlucg==",
  "@expo-google-fonts/cousine@0.4.3": "sha512-rSl8RXKqxwz8xJvedqdiKtPghSwRAl5c+lMecDyZ1L+V+IQEx6mavMnYkO0KuKgNcHekJXwXZsbmv7zJWggmAw==",
};
const crypto = require('crypto');
const LIBS = path.join(__dirname, 'libs');
fs.mkdirSync(LIBS, { recursive: true });
for (const [nom, version] of PAQUETS) {
  const dossier = path.join(LIBS, nom.replace(/^@/, '').replace('/', '-') + '-' + version);
  if (fs.existsSync(path.join(dossier, 'package.json'))) { console.log(path.basename(dossier) + ' : déjà là'); continue; }
  const sortie = execSync('npm pack ' + nom + '@' + version + ' --silent --ignore-scripts', { cwd: LIBS, encoding: 'utf8' });
  const archive = sortie.trim().split(/\r?\n/).pop();
  const attendu = EMPREINTES[nom + '@' + version];
  const obtenu = 'sha512-' + crypto.createHash('sha512').update(fs.readFileSync(path.join(LIBS, archive))).digest('base64');
  if (!attendu || obtenu !== attendu) {
    fs.rmSync(path.join(LIBS, archive), { force: true });
    console.error('ARCHIVE REFUSÉE : ' + nom + '@' + version + '\n  attendu : ' + (attendu || '(aucune empreinte connue)') + '\n  obtenu  : ' + obtenu);
    process.exit(1);
  }
  fs.rmSync(dossier, { recursive: true, force: true });
  fs.mkdirSync(dossier, { recursive: true });
  execSync('tar -xzf "' + archive + '" -C "' + dossier + '" --strip-components=1', { cwd: LIBS, stdio: 'inherit' });
  console.log(path.basename(dossier) + ' : récupéré');
}
