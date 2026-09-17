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

function assembler() {
  let page = lire('page.html');
  for (const [repere, quoi] of [[REPERE_STYLE, 'style'], [REPERE_MODULES, 'modules'],
    [REPERE_MARQUE, 'marque'], [REPERE_FAVICON, 'favicon']]) {
    if (!page.includes(repere)) throw new Error('repère ' + quoi + ' introuvable dans src/page.html');
  }
  const js = modules().map(lire).join('');
  // Fonction de remplacement plutôt que chaîne : un « $& » dans le code serait
  // sinon interprété par String.replace.
  page = page.replace(REPERE_STYLE, () => lire('style.css'));
  page = page.replace(REPERE_MODULES, () => js);
  page = page.replace(REPERE_MARQUE, () => traceMarque() + '\n');
  page = page.replace(REPERE_FAVICON, favicon);
  return page;
}

module.exports = { assembler, modules, traceMarque };
