// La source de l'application est découpée en modules sous src/ : une page
// d'accueil (src/page.html) qui porte deux repères, la feuille de style
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

function lire(f) {
  // Windows convertit les fins de ligne au passage : on travaille en LF.
  return fs.readFileSync(path.join(SRC, f), 'utf8').replace(/\r\n/g, '\n');
}

function modules() {
  return fs.readdirSync(SRC).filter((f) => f.endsWith('.js')).sort();
}

function assembler() {
  let page = lire('page.html');
  for (const [repere, quoi] of [[REPERE_STYLE, 'style'], [REPERE_MODULES, 'modules']]) {
    if (!page.includes(repere)) throw new Error('repère ' + quoi + ' introuvable dans src/page.html');
  }
  const js = modules().map(lire).join('');
  // Fonction de remplacement plutôt que chaîne : un « $& » dans le code serait
  // sinon interprété par String.replace.
  page = page.replace(REPERE_STYLE, () => lire('style.css'));
  page = page.replace(REPERE_MODULES, () => js);
  return page;
}

module.exports = { assembler, modules };
