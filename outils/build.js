// Produit les fichiers livrés à partir de la source unique, elle-même
// recollée depuis les modules de src/ par assembler.js.
const fs = require('fs');
const path = require('path');
const { assembler } = require('./assembler');
const LIB = path.join(__dirname, 'libs');
// Quel que soit le poste (Windows convertit les fins de ligne au passage),
// on travaille en LF : les repères de ce script en dépendent.
let src = assembler();
// Avant d'écrire quoi que ce soit : une page dont une déclaration est lue avant
// d'être posée ne démarre pas (voir garde-demarrage.js). Le build s'arrête là.
try { require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'garde-demarrage.js')], { stdio: 'inherit' }); } catch (e) { process.exit(1); }
// Date et commit de construction, affichés dans l'aide : on sait quelle
// version on a sous la main.
function commitCourt() {
  const env = process.env.GITHUB_SHA || process.env.AKTUM_COMMIT || '';
  if (env) return env.slice(0, 7);
  try { return require('child_process').execSync('git rev-parse --short HEAD', { cwd: __dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (e) { return ''; }
}
// La date n'est PAS celle de l'horloge : deux constructions du même commit doivent donner les mêmes octets. C'est la date du commit
// (ou SOURCE_DATE_EPOCH, la convention des constructions reproductibles) ; sans dépôt git ni variable, faute de mieux, l'horloge.
// Les jour, mois et année sont lus en UTC : le fuseau du poste de construction n'y change rien.
function dateDeConstruction() {
  const epoch = process.env.SOURCE_DATE_EPOCH;
  if (/^\d+$/.test(epoch || '')) return new Date(Number(epoch) * 1000);
  try {
    const t = require('child_process').execSync('git log -1 --format=%ct', { cwd: __dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (/^\d+$/.test(t)) return new Date(Number(t) * 1000);
  } catch (e) { /* pas de dépôt : l'horloge */ }
  return new Date();
}
const d = dateDeConstruction();
const CONSTRUCTION = 'construite le ' + String(d.getUTCDate()).padStart(2, '0') + '.' + String(d.getUTCMonth() + 1).padStart(2, '0') + '.' + d.getUTCFullYear() + (commitCourt() ? ', commit ' + commitCourt() : '');
if (!src.includes("'__CONSTRUCTION__'")) throw new Error('repère de construction introuvable dans la source');
src = src.replace("'__CONSTRUCTION__'", () => JSON.stringify(CONSTRUCTION));
// Le numéro de version : un seul, celui de outils/package.json, partout (À propos,
// propriétés de l'exécutable, fiche de version, nom des fichiers publiés).
const VERSION = require('./package.json').version;
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(VERSION)) throw new Error('outils/package.json : « ' + VERSION + ' » n\u2019est pas un numéro de version (X.Y.Z)');
if (!src.includes("'__VERSION__'")) throw new Error('repère de version introuvable dans la source');
src = src.replace("'__VERSION__'", () => JSON.stringify(VERSION));
// Le canal : « stable » pour ce qui est livré aux postes, « candidate » pour ce qui sort d'une branche
// de travail et doit d'abord être essayé. La construction qui publie le pose ; sans rien, c'est une
// version de travail, donc candidate.
const CANAL = process.env.AKTUM_CANAL === 'stable' ? 'stable' : 'candidate';
// Les mentions des composants tiers : produites ici, depuis les licences des
// paquets réellement embarqués, pour que le fichier livré ne vieillisse pas.
fs.writeFileSync(path.join(__dirname, 'desktop', 'build', 'MENTIONS-TIERCES.txt'),
  require('./mentions-tierces').mentions({ version: require('./package.json').version, construction: CONSTRUCTION }));
fs.writeFileSync(path.join(__dirname, 'desktop', 'construction.json'), JSON.stringify({ version: VERSION, canal: CANAL, construction: CONSTRUCTION, commit: commitCourt(), date: d.toISOString() }) + '\n');
const HEAD = '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="color-scheme" content="dark light">\n</head>\n<body>\n';
const TAIL = '</body>\n</html>\n';
const OUT = __dirname;

// Règles de sécurité : la page n'a le droit de contacter personne. Ce n'est pas
// une promesse mais une contrainte appliquée par le navigateur lui-même.
// La version en ligne n'en reçoit pas : elle charge ses composants depuis un CDN
// et la plateforme qui l'héberge applique déjà les siennes.
// « voisin » : la page, ouverte depuis le disque, peut charger un script posé
// à côté d'elle — le fichier d'ouverture que le lanceur dépose quand on
// double-clique un PDF (voir ouvrirAuLancement). Jamais pour le site.
const csp = (extra, voisin) => '<meta http-equiv="Content-Security-Policy" content="'
  + "default-src 'none'; "
  + "script-src 'unsafe-inline' 'wasm-unsafe-eval' blob:" + (extra ? " 'self'" : '') + (voisin ? ' file:' : '') + '; '
  + "worker-src blob:" + (extra ? " 'self'" : '') + '; '
  + "style-src 'unsafe-inline'; "
  + 'img-src data: blob:' + (extra ? " 'self'" : '') + '; '
  + 'font-src data:; '
  + 'connect-src blob: data:' + (extra ? " 'self'" : '') + '; '
  + (extra ? "manifest-src 'self'; " : '')
  + "object-src 'none'; base-uri 'none'; form-action 'none'"
  + '">\n';

// 1. version en ligne (composants chargés depuis les CDN)
fs.writeFileSync(path.join(OUT, 'aktum-pdf.html'), HEAD + src + TAIL);

// 2. version hors ligne : les trois bibliothèques sont incluses dans le fichier
// Une séquence <!-- ou </script dans le code fait dérailler l'analyseur HTML.
// Les échapper ne change pas le programme : "<\\!--" vaut "<!--" en JavaScript.
const read = p => fs.readFileSync(path.join(LIB, p), 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/<!--/g, '<\\!--')
  .replace(/<\/script/gi, '<\\/script');
const worker = read('pdfjs-dist-3.11.174/build/pdf.worker.min.js');
// Reconnaissance de texte : tesseract.js (bibliothèque + worker), son moteur
// wasm (SIMD, LSTM seul) et les modèles français et allemand (tessdata_best,
// entiers). Tout est dans la page : le worker ne charge rien de l'extérieur.
// Correctif tesseract.js 7.0.0 : une langue fournie sous forme { code, data }
// est nommée par son code, pas par ses octets.
const tess = read('tesseract.js-7.0.0/dist/tesseract.min.js');
let tessWorker = read('tesseract.js-7.0.0/dist/worker.min.js');
const tessBug = 'return"string"==typeof t?t:t.data})).join("+")';
if (!tessWorker.includes(tessBug)) throw new Error('Motif du correctif tesseract.js introuvable dans worker.min.js');
tessWorker = tessWorker.replace(tessBug, () => 'return"string"==typeof t?t:t.code})).join("+")');
const tessCore = read('tesseract.js-core-7.0.0/tesseract-core-simd-lstm.wasm.js');
const langue = code => fs.readFileSync(path.join(LIB, 'tesseract.js-data-' + code + '-1.0.0/4.0.0_best_int/' + code + '.traineddata.gz')).toString('base64');
// Les polices Unicode et fontkit : de quoi écrire « Milošević » ou du cyrillique dans un
// document, et poser des polices incorporées pour le PDF/A. Les polices sont comprimées
// (gzip) puis codées en base 64 ; l'application ne les décomprime qu'au moment d'en avoir besoin.
const zlib = require('zlib');
const utifLib = read('utif-3.1.0/UTIF.js');
const pakoInflate = read('pako-2.1.0/dist/pako_inflate.min.js').replace(/\n\/\/# sourceMappingURL=.*$/m, '');
const forgeLib = read('node-forge-1.4.0/dist/forge.min.js').replace(/\n\/\/# sourceMappingURL=.*$/m, '');
const fontkit = read('cantoo-fontkit-2.0.12/dist/fontkit.umd.min.js').replace(/\n\/\/# sourceMappingURL=.*$/m, '');
const POLICES_UNICODE = [
  ['sans-r', 'expo-google-fonts-arimo-0.4.3', '400Regular/Arimo_400Regular.ttf'],
  ['sans-b', 'expo-google-fonts-arimo-0.4.3', '700Bold/Arimo_700Bold.ttf'],
  ['sans-i', 'expo-google-fonts-arimo-0.4.3', '400Regular_Italic/Arimo_400Regular_Italic.ttf'],
  ['sans-bi', 'expo-google-fonts-arimo-0.4.3', '700Bold_Italic/Arimo_700Bold_Italic.ttf'],
  ['serif-r', 'expo-google-fonts-tinos-0.4.2', '400Regular/Tinos_400Regular.ttf'],
  ['serif-b', 'expo-google-fonts-tinos-0.4.2', '700Bold/Tinos_700Bold.ttf'],
  ['serif-i', 'expo-google-fonts-tinos-0.4.2', '400Regular_Italic/Tinos_400Regular_Italic.ttf'],
  ['serif-bi', 'expo-google-fonts-tinos-0.4.2', '700Bold_Italic/Tinos_700Bold_Italic.ttf'],
  ['mono-r', 'expo-google-fonts-cousine-0.4.3', '400Regular/Cousine_400Regular.ttf'],
  ['mono-b', 'expo-google-fonts-cousine-0.4.3', '700Bold/Cousine_700Bold.ttf'],
  ['mono-i', 'expo-google-fonts-cousine-0.4.3', '400Regular_Italic/Cousine_400Regular_Italic.ttf'],
  ['mono-bi', 'expo-google-fonts-cousine-0.4.3', '700Bold_Italic/Cousine_700Bold_Italic.ttf'],
].map(([id, dossier, fichier]) => '<script id="police-' + id + '" type="text/plain">'
  + zlib.gzipSync(fs.readFileSync(path.join(LIB, dossier, fichier)), { level: 9 }).toString('base64') + '</script>').join('\n');
const cspOffline = csp(false, true);
const inline = [
  '<script id="aktum-worker" type="text/plain">\n' + worker + '\n</script>',
  '<script>window.__aktumWorker = URL.createObjectURL(new Blob([document.getElementById("aktum-worker").textContent], { type: "text/javascript" }));</script>',
  '<script id="aktum-pdfjs">' + read('pdfjs-dist-3.11.174/build/pdf.min.js') + '</script>',
  '<script>' + read('cantoo-pdf-lib-2.11.0/dist/pdf-lib.min.js') + '</script>',
  '<script>' + read('jszip-3.10.1/dist/jszip.min.js') + '</script>',
  '<!-- tesseract.js 7.0.0 et tesseract.js-core 7.0.0 (Apache-2.0), modèles fra et deu de tessdata_best (Apache-2.0) -->',
  '<script>' + tess + '</script>',
  '<script id="tess-worker-src" type="text/plain">\n' + tessWorker + '\n</script>',
  '<script id="tess-core-src" type="text/plain">\n' + tessCore + '\n</script>',
  '<script id="tess-lang-fra" type="text/plain">' + langue('fra') + '</script>',
  '<script id="tess-lang-deu" type="text/plain">' + langue('deu') + '</script>',
  '<!-- fontkit 2.0.12 (MIT) ; polices Arimo, Tinos et Cousine (SIL OFL 1.1) -->',
  '<script>' + fontkit + '</script>',
  POLICES_UNICODE,
  '<!-- node-forge 1.4.0 (BSD-3-Clause) : certificats PKCS#12 et signature numérique -->',
  '<script>' + forgeLib + '</script>',
  '<!-- UTIF 3.1.0 (MIT) et pako 2.1.0 (MIT et Zlib) : lecture des images TIFF des scanners -->',
  '<script>' + pakoInflate + '</script>',
  '<script>' + utifLib + '</script>',
].join('\n');
// Remplacement par fonction : sinon les $& ou $` du code des bibliothèques
// seraient interprétés comme des motifs et injecteraient le reste de la page.
// Les polices de l'interface sont dans la feuille de style (voir assembler.js) : aucun appel à Google Fonts, nulle part.
if (/fonts\.g(oogleapis|static)\.com/.test(src)) throw new Error('la page appelle encore Google Fonts : les polices de l\'interface sont embarquées');
const sansPolices = src;
// Ni adresse de CDN, ni message qui renvoie vers internet : ce qui part aux
// postes ne charge rien de l'extérieur, et le dit.
const vidage = (t, nom, re, remplacement) => {
  const r = t.replace(re, () => remplacement);
  if (r === t) throw new Error('bloc ' + nom + ' introuvable : le vidage des adresses est à revoir');
  return r;
};
let noFonts = vidage(sansPolices, 'CDN', /const CDN = \{[\s\S]*?\n  \};/, "const CDN = { pdfjs: '', worker: '', pdflib: '', pdflibFallback: '', jszip: '' };");
noFonts = vidage(noFonts, 'OCR_CDN', /const OCR_CDN = \{[\s\S]*?\n  \};/, "const OCR_CDN = { lib: '', worker: '', core: '' };");
noFonts = vidage(noFonts, 'EN_LIGNE', /const EN_LIGNE = true;/, 'const EN_LIGNE = false;');
// Garde-fou : le code de l'application (hors bibliothèques embarquées, qui
// portent leurs propres noms d'espaces XML) ne doit contenir aucune adresse
// réseau. C'est ce que lira un informaticien qui fait un « grep http ».
// Les identifiants d'espaces de noms XML (W3C, Dublin Core et Adobe pour les métadonnées XMP, Office Open XML pour le .docx, XFDF d'Adobe) ne sont
// pas des adresses que l'on appelle : ils désignent un vocabulaire, et ne sont jamais téléchargés.
const ESPACES_DE_NOMS = /^(https?:\/\/www\.w3\.org\/|http:\/\/purl\.org\/dc\/(elements\/1\.1|terms)\/|http:\/\/ns\.adobe\.com\/(pdf\/1\.3|xfdf)\/|http:\/\/schemas\.openxmlformats\.org\/)/;
const adresses = (noFonts.match(/https?:\/\/[^\s"'<>)\\]+/g) || []).filter(u => !ESPACES_DE_NOMS.test(u));
if (adresses.length) throw new Error('adresse réseau dans le code de l\'application livrée : ' + [...new Set(adresses)].join(', '));
const offline = noFonts.replace('<script>\n(() => {', () => inline + '\n<script>\n(() => {');
if (offline === src) throw new Error("point d'insertion introuvable");
fs.writeFileSync(path.join(OUT, 'aktum-pdf-hors-ligne.html'),
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
  + '<title>Aktum PDF</title>\n'
  + '<link rel="manifest" href="manifest.webmanifest">\n'
  + '<meta name="theme-color" content="#1B1E23">\n'
  + '<meta name="description" content="Organiser, annoter et protéger des PDF, directement sur votre ordinateur.">\n'
  + '<meta name="apple-mobile-web-app-capable" content="yes">\n'
  + '<meta name="apple-mobile-web-app-title" content="Aktum PDF">\n'
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
  .replace('<title>Aktum PDF</title>\n', () => '')
  .replace(/<link rel="icon" href="data:image\/svg\+xml;base64,[^"]*">\n/, '');
fs.writeFileSync(path.join(SITE, 'index.html'), SITE_HEAD + siteBody + pwaTail + TAIL);

// 4. version pour l'application de bureau : l'icône est un vrai fichier posé à
//    côté de la page. Une icône encodée dans la page n'est jamais chargée par
//    le moteur d'affichage, d'où une fenêtre sans icône dans la barre des tâches.
const APPDIR = path.join(OUT, 'application', 'lanceur');
const APP_HEAD = '<!doctype html>\n<html lang="fr">\n<head>\n'
  + '<meta charset="utf-8">\n'
  + csp(true, true)
  + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
  + '<meta name="color-scheme" content="dark light">\n'
  + '<title>Aktum PDF</title>\n'
  + '<link rel="icon" type="image/png" sizes="256x256" href="icon-256.png">\n'
  + '<link rel="icon" type="image/png" sizes="48x48" href="icon-48.png">\n'
  + '<link rel="icon" type="image/png" sizes="32x32" href="icon-32.png">\n'
  + '</head>\n<body>\n';
fs.writeFileSync(path.join(APPDIR, 'aktum-pdf.html'), APP_HEAD + siteBody + TAIL);
for (const ic of ['icon-32.png', 'icon-48.png', 'icon-256.png']) {
  fs.copyFileSync(path.join(OUT, 'application', ic), path.join(APPDIR, ic));
}

// 5. le dossier à poser sur un partage réseau pour les collègues : la page
//    hors ligne, à côté de ses deux lanceurs et de son mode d'emploi. Elle est
//    produite ici et non recopiée à la main : une copie faite à la main reste
//    à la version du jour où on l'a faite, et personne ne s'en aperçoit.
fs.copyFileSync(path.join(OUT, 'aktum-pdf-hors-ligne.html'),
  path.join(OUT, 'pour-les-collegues', 'aktum-pdf.html'));

for (const f of ['aktum-pdf.html', 'aktum-pdf-hors-ligne.html', '../docs/index.html',
  'application/lanceur/aktum-pdf.html', 'pour-les-collegues/aktum-pdf.html']) {
  console.log(f.replace('../', '').padEnd(34), (fs.statSync(path.join(OUT, f)).size / 1024 / 1024).toFixed(2) + ' Mo');
}
