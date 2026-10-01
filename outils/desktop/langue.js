/*
 * La langue du processus principal : les menus, les fenêtres de dialogue, les messages de connexion et de
 * mise à jour. La page a sa propre couche de langue (src/01-langue.js) ; les deux partagent le traducteur
 * (traducteur.js) et la même règle : le code est écrit en français, un dictionnaire (langue-de.json) donne
 * l'allemand, et un texte sans entrée reste en français plutôt que de s'inventer.
 *
 * Le choix se lit, dans l'ordre : AKTUM_LANGUE (essais), le réglage mémorisé dans reglages.json, puis la
 * langue du système (l'allemand si elle l'est, le français sinon).
 */
const fs = require('fs');
const path = require('path');
const { fabriquerTraducteur } = require('./traducteur');
const dico = require('./langue-de.json');

const LANGUES = ['fr', 'de'];
const traduction = fabriquerTraducteur({ litteraux: dico.litteraux, motifs: dico.motifs || {}, html: {} });
let courante = 'fr';
let memoire = null;      // { lire(), ecrire(langue) } : où le choix est retenu
const ecouteurs = [];

// locale : « de-CH », « fr-CH »… (app.getLocale()). memoire : le réglage mémorisé, ou rien.
function initialiser(locale, reglage, memo) {
  memoire = memo || null;
  let l = process.env.AKTUM_LANGUE;
  if (!LANGUES.includes(l)) l = reglage;
  if (!LANGUES.includes(l)) l = /^de\b/i.test(String(locale || '')) ? 'de' : 'fr';
  courante = l;
  return courante;
}
const langue = () => courante;
function choisir(l) {
  if (!LANGUES.includes(l) || l === courante) return courante;
  courante = l;
  if (memoire) { try { memoire.ecrire(l); } catch (e) { /* le choix ne survivra pas au redémarrage, tant pis */ } }
  ecouteurs.forEach((f) => { try { f(l); } catch (e) { /* un écouteur défaillant ne bloque pas les autres */ } });
  return courante;
}
const surChangement = (f) => { ecouteurs.push(f); };
// Un texte du code, dans la langue courante. Un texte assemblé se traduit morceau par morceau.
const t = (s) => (courante === 'de' && typeof s === 'string' && s) ? traduction(s) : s;
// Une fenêtre de dialogue : titre, message, détail, boutons, cases, filtres de fichiers.
function options(o) {
  if (!o || typeof o !== 'object' || courante === 'fr') return o;
  const c = Object.assign({}, o);
  ['title', 'message', 'detail', 'checkboxLabel', 'buttonLabel', 'okLabel', 'cancelLabel'].forEach((k) => { if (typeof c[k] === 'string') c[k] = t(c[k]); });
  if (Array.isArray(c.buttons)) c.buttons = c.buttons.map(t);
  if (Array.isArray(c.filters)) c.filters = c.filters.map((f) => Object.assign({}, f, { name: t(f.name) }));
  return c;
}
// Un menu : étiquettes, aides au survol, sous-menus.
function menu(modele) {
  return modele.map((item) => {
    const c = Object.assign({}, item);
    if (item.brut) delete c.brut;   // un nom de fichier ou de langue : rendu tel quel
    else ['label', 'sublabel', 'toolTip'].forEach((k) => { if (typeof c[k] === 'string') c[k] = t(c[k]); });
    if (Array.isArray(c.submenu)) c.submenu = menu(c.submenu);
    return c;
  });
}
// Le résultat d'un échange avec la page : un message, ou un objet dont certains champs sont des messages.
function resultat(r) {
  if (typeof r === 'string') return t(r);
  if (courante !== 'fr' && r && typeof r === 'object' && Object.getPrototypeOf(r) === Object.prototype) {
    const c = Object.assign({}, r);
    ['erreur', 'message', 'description', 'detail'].forEach((k) => { if (typeof c[k] === 'string') c[k] = t(c[k]); });
    return c;
  }
  return r;
}

// La fenêtre de connexion est une page à part, sans la couche de langue de l'application : en allemand, ce script
// la traduit à l'ouverture (texte, infobulles) et à chaque ajout de texte, avec le même traducteur.
function scriptPourLaPageDeConnexion() {
  const traducteur = fs.readFileSync(path.join(__dirname, 'traducteur.js'), 'utf8');
  return '(function () {\n' + traducteur + '\n'
    + 'const tr = fabriquerTraducteur(' + JSON.stringify({ litteraux: dico.profil || {} }) + ');\n'
    + `const ATTRIBUTS = ['title', 'aria-label', 'placeholder', 'alt'];
const noeud = (n) => { const v = n.nodeValue; if (v && /\\S/.test(v) && !(n.parentElement && n.parentElement.closest('script, style, textarea'))) { const o = tr(v); if (o !== v) n.nodeValue = o; } };
const attributs = (e) => ATTRIBUTS.forEach((a) => { const v = e.getAttribute(a); if (v) { const o = tr(v); if (o !== v) e.setAttribute(a, o); } });
const arbre = (r) => {
  if (r.nodeType === 3) { noeud(r); return; }
  if (r.nodeType !== 1) return;
  attributs(r);
  const m = document.createTreeWalker(r, 1 | 4);
  for (let n = m.nextNode(); n; n = m.nextNode()) { if (n.nodeType === 3) noeud(n); else attributs(n); }
};
document.documentElement.lang = 'de';
arbre(document.documentElement);
new MutationObserver((lot) => lot.forEach((m) => {
  if (m.type === 'childList') m.addedNodes.forEach(arbre);
  else if (m.type === 'characterData') noeud(m.target);
  else if (m.type === 'attributes') attributs(m.target);
})).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTS });
` + '})();';
}
// Appelée à chaque ouverture de la fenêtre de connexion.
function traduireLaPageDeConnexion(fenetre) {
  if (courante !== 'de') return;
  fenetre.webContents.once('dom-ready', () => { fenetre.webContents.executeJavaScript(scriptPourLaPageDeConnexion()).catch(() => {}); });
}
module.exports = { initialiser, langue, choisir, surChangement, t, options, menu, resultat, traduireLaPageDeConnexion, LANGUES, traduction };
