/*
 * Construit dist/Caisse-ecoles.html : un seul fichier HTML autonome contenant
 * pdf.js, ExcelJS et le code de l'application (fonctionne hors ligne, sans installation).
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
html = html
  .replace('<!--INLINE_CSS-->', `<style>\n${read(src('app.css'))}\n</style>`)
  .replace('<!--INLINE_PDFJS-->', `<!-- pdf.js ${pkgPdf} (Apache-2.0) -->\n` + scriptTag(pdfjs))
  .replace('<!--INLINE_PDFJS_WORKER-->', scriptTag(pdfjsWorker, 'type="text/plain" id="pdfjs-worker-src"'))
  .replace('<!--INLINE_EXCELJS-->', `<!-- ExcelJS ${pkgXl} (MIT) -->\n` + scriptTag(exceljs))
  .replace('<!--INLINE_PARSER-->', scriptTag(read(src('parser.js'))))
  .replace('<!--INLINE_EXCEL-->', scriptTag(read(src('excel.js'))))
  .replace('<!--INLINE_APP-->', scriptTag(read(src('app.js'))));

const outDir = path.join(root, 'dist');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'Caisse-ecoles.html');
fs.writeFileSync(out, html);
console.log(`OK -> ${path.relative(root, out)} (${(fs.statSync(out).size / 1024 / 1024).toFixed(2)} Mo)`);
