// La source de l'application est découpée en modules sous src/ : une page
// d'accueil (src/page.html) qui porte quatre repères, la feuille de style
// (src/style.css) et les modules JavaScript (src/NN-nom.js, dans l'ordre des
// numéros). Ce fichier les recolle pour former la source unique que build.js
// transforme en pages livrées, et que les tests évaluent. Découper le fichier
// n'a de valeur que si le livrable ne bouge pas d'un octet : le recollage est
// une simple substitution de texte, sans reformatage ni réordonnancement.
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, 'src');

// Les repères sont des commentaires JavaScript valides, pour que src/page.html
// reste lisible dans un éditeur sans traitement particulier.
const REPERE_STYLE = '/*@style@*/\n';
const REPERE_MODULES = '/*@modules@*/\n';
// La marque n'est dessinée qu'une fois, dans src/marque.svg : la page reçoit
// son tracé et son icône d'onglet d'ici. Trois copies d'un même dessin
// finissent toujours par diverger, et on ne s'en aperçoit pas.
const REPERE_MARQUE = '<!--@marque@-->\n';
const REPERE_FAVICON = '<!--@favicon@-->\n';
// Le dictionnaire allemand (i18n/de.json) : posé dans la page comme donnée, sans code, et lu seulement
// si l'interface est en allemand. On n'y met que ce qui change : un texte identique dans les deux langues
// (un sigle, une mesure) se rend tel quel sans entrée.
const REPERE_DICO_DE = '<!--@dico-de@-->\n';
// Le traducteur (desktop/traducteur.js) est écrit une fois, pour la page et pour le processus principal d'Electron :
// la page le reçoit à l'endroit que src/01-langue.js lui réserve, indenté comme le reste du module.
const REPERE_TRADUCTEUR = '  /*@traducteur@*/\n';

// Les polices de l'interface sont dans la feuille de style, en WOFF2 : sans elles, Geist, Geist Mono et Instrument
// Serif — celles pour lesquelles l'interface a été dessinée — retombent sur ce que le poste a, et la page se mesure
// à des largeurs que personne n'a vues (24 % de plus pour « Tout sélectionner »). Le marqueur est dans style.css.
const REPERE_POLICES = '/*@polices@*/\n';
const POLICES_INTERFACE = [
  ['Geist', 'fontsource-variable-geist-5.3.0/files/geist-latin-wght-normal.woff2', '100 900'],
  ['Geist Mono', 'fontsource-variable-geist-mono-5.3.0/files/geist-mono-latin-wght-normal.woff2', '100 900'],
  ['Instrument Serif', 'fontsource-instrument-serif-5.3.0/files/instrument-serif-latin-400-normal.woff2', '400'],
];
// le sous-ensemble « latin » de fontsource : le français et l'allemand, les guillemets, l'euro, les tirets
const PLAGE_LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
function policesInterface() {
  return POLICES_INTERFACE.map(([famille, fichier, graisse]) => {
    const p = path.join(__dirname, 'libs', fichier);
    if (!fs.existsSync(p)) throw new Error('police de l\'interface introuvable : ' + p + ' (npm run libs)');
    return '  @font-face { font-family: "' + famille + '"; font-style: normal; font-weight: ' + graisse + '; font-display: swap;\n'
      + '    src: url(data:font/woff2;base64,' + fs.readFileSync(p).toString('base64') + ') format("woff2");\n'
      + '    unicode-range: ' + PLAGE_LATIN + '; }\n';
  }).join('');
}

function lire(f) {
  // Windows convertit les fins de ligne au passage : on travaille en LF.
  return fs.readFileSync(path.join(SRC, f), 'utf8').replace(/\r\n/g, '\n');
}

function modules() {
  return fs.readdirSync(SRC).filter((f) => f.endsWith('.js')).sort();
}

// Les commentaires de src/marque.svg expliquent le dessin à qui le reprend :
// ils restent dans le dépôt et ne partent pas dans les pages livrées.
const sansCommentaires = (svg) => svg.replace(/<!--[\s\S]*?-->\n?\s*/g, '');

// Le dessin seul, sans son enveloppe <svg> : la page le range dans un <defs>
// et les deux tuiles y renvoient par <use>.
function traceMarque() {
  const svg = sansCommentaires(lire('marque.svg'));
  const a = svg.indexOf('>', svg.indexOf('<svg')) + 1;
  const b = svg.lastIndexOf('</svg>');
  if (a <= 0 || b < 0) throw new Error('src/marque.svg : balise <svg> introuvable');
  return svg.slice(a, b).trim();
}

// L'icône de l'onglet du navigateur : le même fichier, encodé dans la page.
// Un fichier à côté ne suivrait pas la page hors ligne, qu'on envoie seule.
function favicon() {
  const b64 = Buffer.from(sansCommentaires(lire('marque.svg')), 'utf8').toString('base64');
  return '<link rel="icon" href="data:image/svg+xml;base64,' + b64 + '">\n';
}

function traducteur() {
  const src = fs.readFileSync(path.join(__dirname, 'desktop', 'traducteur.js'), 'utf8').replace(/\r\n/g, '\n');
  // Sans l'en-tête d'explication ni la ligne d'export, propre à Node.
  const a = src.indexOf('// @debut-langue');
  const b = src.indexOf('\nif (typeof module');
  if (a < 0 || b < 0) throw new Error('desktop/traducteur.js : repères introuvables');
  return src.slice(a, b).replace(/\n+$/, '\n').split('\n').map(l => (l ? '  ' + l : l)).join('\n');
}

function dictionnaireAllemand() {
  const brut = JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n', 'de.json'), 'utf8'));
  const dico = { litteraux: {}, motifs: {}, html: {}, pluriels: brut.pluriels || {} };
  for (const s of ['litteraux', 'motifs', 'html']) for (const k of Object.keys(brut[s])) if (brut[s][k] !== k) dico[s][k] = brut[s][k];
  // « < » devient « \u003c » : rien, dans les données, ne peut refermer la balise ni ouvrir un commentaire.
  return '<script type="application/json" id="aktum-dico-de">' + JSON.stringify(dico).replace(/</g, '\\u003c') + '</script>\n';
}

// Les icônes ne s'écrivent qu'une fois : le registre de src/11-icones.js. La page y renvoie par un repère
// <!--@ic:nom--> que cette fonction remplace par le dessin, à la construction (le dessin est donc là dès le premier
// rendu, sans attendre le JavaScript), avec le même trait que les icônes que le programme pose lui-même.
function registreIcones() {
  const src = lire('11-icones.js');
  const debut = src.indexOf('const IC = {');
  const fin = src.indexOf('\n  };', debut);
  if (debut < 0 || fin < 0) throw new Error('src/11-icones.js : registre des icônes introuvable');
  return new Function('return ' + src.slice(debut + 'const IC = '.length, fin + 4))();
}

function svgIcone(nom, registre) {
  const d = registre[nom];
  if (!d) throw new Error('src/page.html : icône inconnue « ' + nom + ' »');
  const formes = (Array.isArray(d) ? d : [d]).map((p) => {
    if (p.charAt(0) !== 'C') return '<path d="' + p + '"/>';
    const a = p.slice(1).split(',');
    return '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="' + a[2] + '"/>';
  }).join('');
  return '<svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + formes + '</svg>';
}

function assembler() {
  let page = lire('page.html');
  const icones = registreIcones();
  page = page.replace(/<!--@ic:(\w+)-->/g, (_, nom) => svgIcone(nom, icones));
  for (const [repere, quoi] of [[REPERE_STYLE, 'style'], [REPERE_MODULES, 'modules'],
    [REPERE_MARQUE, 'marque'], [REPERE_FAVICON, 'favicon'], [REPERE_DICO_DE, 'dico-de']]) {
    if (!page.includes(repere)) throw new Error('repère ' + quoi + ' introuvable dans src/page.html');
  }
  let js = modules().map(lire).join('');
  if (!js.includes(REPERE_TRADUCTEUR)) throw new Error('repère traducteur introuvable dans src/01-langue.js');
  js = js.replace(REPERE_TRADUCTEUR, () => traducteur());
  // Fonction de remplacement plutôt que chaîne : un « $& » dans le code serait
  // sinon interprété par String.replace.
  const feuille = lire('style.css');
  if (!feuille.includes(REPERE_POLICES)) throw new Error('repère polices introuvable dans src/style.css');
  page = page.replace(REPERE_STYLE, () => feuille.replace(REPERE_POLICES, () => policesInterface()));
  page = page.replace(REPERE_MODULES, () => js);
  page = page.replace(REPERE_MARQUE, () => traceMarque() + '\n');
  page = page.replace(REPERE_FAVICON, favicon);
  page = page.replace(REPERE_DICO_DE, dictionnaireAllemand);
  return page;
}

module.exports = { assembler, modules, traceMarque, registreIcones, svgIcone };
