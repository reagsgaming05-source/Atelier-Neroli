/*
 * Construit dist/Caisse-ecoles.html : un seul fichier HTML autonome contenant
 * pdf.js, ExcelJS, la base de référence et le code de l'application
 * (fonctionne hors ligne, sans installation).
 *
 *   npm install
 *   npm run build
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const src = (p) => path.join(root, 'src', p);
const vendor = (p) => path.join(root, 'node_modules', p);

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

// Un script inséré dans une page HTML ne doit pas contenir "</script".
function safeScript(code) {
  return code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
}

function scriptTag(code, attrs) {
  return `<script${attrs ? ' ' + attrs : ''}>\n${safeScript(code)}\n</script>`;
}

const pdfjs = read(vendor('pdfjs-dist/legacy/build/pdf.min.js'));
const pdfjsWorker = read(vendor('pdfjs-dist/legacy/build/pdf.worker.min.js'));
const exceljs = read(vendor('exceljs/dist/exceljs.min.js'));
const pkgPdf = require(vendor('pdfjs-dist/package.json')).version;

// Seconde lecture par OCR local : tesseract.js (bibliothèque + worker), moteur wasm (SIMD,
// LSTM seul) et modèle de langue français (tessdata_best entier, 0,7 Mo compressé). Le tout
// est embarqué dans la page ; le worker ne charge rien de l'extérieur (voir src/ocr.js).
const tess = read(vendor('tesseract.js/dist/tesseract.min.js'));
let tessWorker = read(vendor('tesseract.js/dist/worker.min.js'));
// Correctif tesseract.js 7.0.0 : une langue fournie sous forme { code, data } est initialisée
// avec ses données au lieu de son code. Si le motif disparaît (autre version), la construction
// échoue plutôt que d'embarquer un worker qui ne fonctionne pas.
const tessBug = 'return"string"==typeof t?t:t.data})).join("+")';
if (!tessWorker.includes(tessBug)) throw new Error('Motif du correctif tesseract.js introuvable dans worker.min.js');
tessWorker = tessWorker.replace(tessBug, () => 'return"string"==typeof t?t:t.code})).join("+")');
const tessCore = read(vendor('tesseract.js-core/tesseract-core-simd-lstm.wasm.js'));
const tessLang = fs.readFileSync(vendor('@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz')).toString('base64');
const pkgTess = require(vendor('tesseract.js/package.json')).version;
const pkgTessCore = require(vendor('tesseract.js-core/package.json')).version;
const pkgXl = require(vendor('exceljs/package.json')).version;
const pdflib = read(vendor('pdf-lib/dist/pdf-lib.min.js'));
const pkgPdfLib = require(vendor('pdf-lib/package.json')).version;
// Code QR de la pièce : l'écrire (qrcode-generator) et le relire sur un scan (jsQR).
// Deux modules minuscules, sans dépendance : voir src/marque.js.
const qrgen = read(vendor('qrcode-generator/dist/qrcode.js'));
const jsqr = read(vendor('jsqr/dist/jsQR.js'));
const pkgQr = require(vendor('qrcode-generator/package.json')).version;
const pkgJsqr = require(vendor('jsqr/package.json')).version;

let html = read(src('index.html'));

// Remplacement par fonction : un "$&" ou "$'" présent dans le code inséré ne doit pas
// être interprété comme un motif de substitution.
function inline(marker, code) {
  if (!html.includes(marker)) throw new Error(`Marqueur ${marker} absent de index.html`);
  html = html.replace(marker, () => code);
}

// Base de référence : vocabulaire de gestion (versionné) et, si présent, les noms de
// personnes (fichier non versionné, voir tools/build-vocab.js).
// CAISSE_SANS_NOMS=1 force une version sans les noms de personnes : c'est celle qui est
// versionnée dans dist/ (le dépôt est public). Voir README, « Base de référence intégrée ».
// (option de ligne de commande --sans-noms ou variable CAISSE_SANS_NOMS=1)
const sansNoms = process.argv.includes('--sans-noms') || !!process.env.CAISSE_SANS_NOMS;
const hasNames = !sansNoms && fs.existsSync(src('vocabulaire-noms.js'));
const vocabCode = scriptTag(read(src('vocabulaire.js'))) +
  (hasNames ? '\n' + scriptTag(read(src('vocabulaire-noms.js'))) : '');

// Police Inter (SIL OFL 1.1), variable, sous-ensembles latin et latin étendu, embarquée en base64
const fontDir = path.join(__dirname, 'node_modules', '@fontsource-variable', 'inter', 'files');
const fontFace = (file, range) => `@font-face{font-family:"Inter Variable";font-style:normal;font-display:swap;font-weight:100 900;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(fontDir, file)).toString('base64')}) format("woff2-variations");unicode-range:${range}}`;
const fonts = fontFace('inter-latin-wght-normal.woff2', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD')
  + fontFace('inter-latin-ext-wght-normal.woff2', 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF');
inline('<!--INLINE_FONTS-->', `<!-- Inter (SIL Open Font License 1.1) -->\n<style>${fonts}</style>`);
inline('<!--INLINE_CSS-->', `<style>\n${read(src('app.css'))}\n</style>`);
inline('<!--INLINE_PDFJS-->', `<!-- pdf.js ${pkgPdf} (Apache-2.0) -->\n` + scriptTag(pdfjs));
inline('<!--INLINE_PDFJS_WORKER-->', scriptTag(pdfjsWorker, 'type="text/plain" id="pdfjs-worker-src"'));
inline('<!--INLINE_EXCELJS-->', `<!-- ExcelJS ${pkgXl} (MIT) -->\n` + scriptTag(exceljs));
inline('<!--INLINE_TESSERACT-->', `<!-- tesseract.js ${pkgTess} et tesseract.js-core ${pkgTessCore} (Apache-2.0), modèle fra de tessdata_best (Apache-2.0) -->\n` + scriptTag(tess));
inline('<!--INLINE_TESSERACT_WORKER-->', scriptTag(tessWorker, 'type="text/plain" id="tess-worker-src"'));
inline('<!--INLINE_TESSERACT_CORE-->', scriptTag(tessCore, 'type="text/plain" id="tess-core-src"'));
inline('<!--INLINE_TESSERACT_LANG-->', scriptTag(tessLang, 'type="text/plain" id="tess-lang-src"'));
inline('<!--INLINE_VOCAB-->', vocabCode);
inline('<!--INLINE_PDFLIB-->', `<!-- pdf-lib ${pkgPdfLib} (MIT) -->\n` + scriptTag(pdflib));
inline('<!--INLINE_PARSER-->', scriptTag(read(src('parser.js'))));
inline('<!--INLINE_OCR-->', scriptTag(read(src('ocr.js'))));
inline('<!--INLINE_EXCEL-->', scriptTag(read(src('excel.js'))));
inline('<!--INLINE_REGISTRE-->', scriptTag(read(src('registre.js'))));
inline('<!--INLINE_QR-->', `<!-- qrcode-generator ${pkgQr} (MIT) et jsQR ${pkgJsqr} (Apache-2.0) -->\n` + scriptTag(qrgen) + '\n' + scriptTag(jsqr));
inline('<!--INLINE_MARQUE-->', scriptTag(read(src('marque.js'))));
inline('<!--INLINE_PDFPIECE-->', scriptTag(read(src('pdfpiece.js'))));
inline('<!--INLINE_DOSSIER-->', scriptTag(read(src('dossier.js'))));
inline('<!--INLINE_CARNET-->', scriptTag(read(src('carnet.js'))));
inline('<!--INLINE_COMBO-->', scriptTag(read(src('combo.js'))));
inline('<!--INLINE_APP-->', scriptTag(read(src('app.js'))));
inline('<!--INLINE_SAISIE-->', scriptTag(read(src('saisie.js'))));
inline('<!--INLINE_COMPTAGE-->', scriptTag(read(src('comptage.js'))));
inline('<!--INLINE_DONNEES-->', scriptTag(read(src('donnees.js'))));
inline('<!--INLINE_PILE-->', scriptTag(read(src('pile.js'))));
inline('<!--INLINE_RECEPTION-->', scriptTag(read(src('reception.js'))));
if (/<!--INLINE_[A-Z_]+-->/.test(html)) throw new Error('Marqueur non remplacé dans index.html');

const outDir = path.join(root, 'dist');
fs.mkdirSync(outDir, { recursive: true });
// Le dépôt est PUBLIC et dist/Caisse-ecoles.html y est versionné : la version qui contient les
// noms de personnes s'écrit à côté, dans un fichier exclu du dépôt. Sans cela, un « git add » après
// un `node build.js` publiait les noms.
const out = path.join(outDir, hasNames ? 'Caisse-ecoles-avec-noms.html' : 'Caisse-ecoles.html');
fs.writeFileSync(out, html);
console.log(`OK -> ${path.relative(root, out)} (${(fs.statSync(out).size / 1024 / 1024).toFixed(2)} Mo)` +
  (hasNames ? ' – avec les noms de personnes (version interne, jamais versionnée)' : ' – sans les noms de personnes'));
