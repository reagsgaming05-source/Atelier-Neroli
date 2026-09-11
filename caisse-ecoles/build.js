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
const pkgXl = require(vendor('exceljs/package.json')).version;

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
const hasNames = !process.env.CAISSE_SANS_NOMS && fs.existsSync(src('vocabulaire-noms.js'));
const vocabCode = scriptTag(read(src('vocabulaire.js'))) +
  (hasNames ? '\n' + scriptTag(read(src('vocabulaire-noms.js'))) : '');

inline('<!--INLINE_CSS-->', `<style>\n${read(src('app.css'))}\n</style>`);
inline('<!--INLINE_PDFJS-->', `<!-- pdf.js ${pkgPdf} (Apache-2.0) -->\n` + scriptTag(pdfjs));
inline('<!--INLINE_PDFJS_WORKER-->', scriptTag(pdfjsWorker, 'type="text/plain" id="pdfjs-worker-src"'));
inline('<!--INLINE_EXCELJS-->', `<!-- ExcelJS ${pkgXl} (MIT) -->\n` + scriptTag(exceljs));
inline('<!--INLINE_VOCAB-->', vocabCode);
inline('<!--INLINE_PARSER-->', scriptTag(read(src('parser.js'))));
inline('<!--INLINE_EXCEL-->', scriptTag(read(src('excel.js'))));
inline('<!--INLINE_APP-->', scriptTag(read(src('app.js'))));
if (/<!--INLINE_[A-Z_]+-->/.test(html)) throw new Error('Marqueur non remplacé dans index.html');

const outDir = path.join(root, 'dist');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'Caisse-ecoles.html');
fs.writeFileSync(out, html);
console.log(`OK -> ${path.relative(root, out)} (${(fs.statSync(out).size / 1024 / 1024).toFixed(2)} Mo)` +
  (hasNames ? ' – avec les noms de personnes (version interne à l\'établissement)' : ' – sans les noms de personnes'));
