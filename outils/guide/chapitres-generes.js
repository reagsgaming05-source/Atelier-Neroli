/*
 * Les chapitres du mode d'emploi qui s'écrivent depuis la donnée plutôt qu'à la main :
 *   - « Les outils, un par un », depuis aide/outils.json — la même donnée que le « ? » de chaque boîte ;
 *   - « Messages et codes d'erreur », depuis la même donnée (les codes sont contrôlés contre le code par test/aide.test.js) ;
 *   - l'index, qui renvoie des mots qu'on cherche (ceux du filtre du panneau compris) à la section où ils se traitent.
 * Un outil ajouté au logiciel sans son aide fait échouer la construction ; il ne peut donc pas manquer au manuel.
 */
const fs = require('fs');
const path = require('path');
const aide = require('../aide/outils.json');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Les « ‹ › » de l'aide restent des guillemets français ; « {p} » reste lisible : on n'échappe que le nécessaire.
const GROUPES = { organiser: 'Organiser', modifier: 'Modifier', exporter: 'Exporter', proteger: 'Protéger', document: 'Document', commande: 'La barre d’outils' };
const ORDRE_GROUPES = ['organiser', 'modifier', 'exporter', 'proteger', 'document', 'commande'];
const CHAPITRE_OUTILS = 16, CHAPITRE_MESSAGES = 17, CHAPITRE_INDEX = 18;

// Les mots qu'on tape pour trouver un outil : ceux du filtre du panneau (src/96-panneau.js).
function motsDuFiltre() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', '96-panneau.js'), 'utf8');
  const res = {};
  for (const m of src.matchAll(/\{ id: '([a-z-]+)', name: '(?:[^'\\]|\\.)*',(?: sub: '(?:[^'\\]|\\.)*',)? icon: [^,]+,(?: need: '[a-z]+',)? mots: '([^']*)'/g)) res[m[1]] = m[2];
  return res;
}

// Les outils dans l'ordre du manuel, numérotés 16.1, 16.2…
function outilsNumerotes() {
  const liste = [];
  let n = 0;
  for (const g of ORDRE_GROUPES) {
    aide.outils.filter((o) => o.groupe === g).forEach((o) => { n += 1; liste.push(Object.assign({ numero: CHAPITRE_OUTILS + '.' + n }, o)); });
  }
  return liste;
}

function chapitreOutils() {
  const outils = outilsNumerotes();
  let html = '<p class="lede">Chaque outil, avec ce qu’il fait, la façon de s’en servir et — surtout — ce qu’il change vraiment. Le même texte s’affiche dans l’application : le bouton <strong>?</strong> d’une boîte d’outil, ou la touche <kbd>F1</kbd>, ouvre l’aide de l’outil sans fermer la boîte.</p>\n';
  html += '<div class="note"><div class="titre">À retenir pour tous les outils</div><p>Rien n’est écrit sur le disque tant que vous n’avez pas exporté ou enregistré. Les réglages (filigrane, en-tête, mot de passe, aplatissement) s’appliquent à l’export ; la ligne de modifications sous la barre d’outils les liste et chacun s’y retire d’un clic. <kbd>Ctrl</kbd> + <kbd>Z</kbd> défait la dernière action, et la barre d’état dit laquelle.</p></div>\n';
  for (const g of ORDRE_GROUPES) {
    const dans = outils.filter((o) => o.groupe === g);
    if (!dans.length) continue;
    html += '<h3>' + esc(GROUPES[g]) + '</h3>\n';
    for (const o of dans) {
      html += '<h4 id="outil-' + o.id + '"><span class="num-outil">' + o.numero + '</span> ' + esc(o.nom) + '</h4>\n';
      html += '<p class="quoi"><strong>' + esc(o.quoi) + '</strong></p>\n';
      html += '<ol class="etapes">' + o.etapes.map((e) => '<li>' + esc(e) + '</li>').join('') + '</ol>\n';
      html += '<div class="note"><div class="titre">Ce que cela change</div><p>' + esc(o.effet) + '</p></div>\n';
      if (o.attention) html += '<div class="attention"><div class="titre">À savoir</div><p>' + esc(o.attention) + '</p></div>\n';
    }
  }
  return html;
}

function chapitreMessages() {
  let html = '<p class="lede">Quand une opération n’aboutit pas, l’application le dit en français, avec la cause et ce qu’il faut faire, suivi d’un code entre crochets. Le code sert à vous repérer dans ce chapitre, et à le donner au support. <strong>Rien n’est écrit tant qu’une opération a échoué : le document ouvert reste tel qu’il était.</strong></p>\n';
  html += '<table>\n  <tr><th>Code</th><th>Ce qui s’est passé</th><th>Ce qu’il faut faire</th></tr>\n';
  for (const m of aide.messages) {
    html += '  <tr><td class="touche"><code>' + esc(m.code) + '</code></td><td><strong>' + esc(m.titre) + '.</strong> ' + esc(m.quoi) + '</td><td>' + esc(m.action) + '</td></tr>\n';
  }
  html += '</table>\n';
  html += '<h3>Si le message ne suffit pas</h3>\n<p>Ouvrez <strong>Aide&nbsp;› Rapport de diagnostic pour le support…</strong> : l’application prépare un fichier qui ne contient ni le texte de vos documents ni leurs noms, que vous relisez avant de l’envoyer. Le journal de la session (en bas de la fenêtre) garde, pour chaque échec, la cause technique.</p>\n';
  return html;
}

// L'index : un mot, la section où il se traite. Les mots du filtre du panneau y sont (on cherche « biffer » pour caviarder).
function index() {
  const mots = motsDuFiltre();
  const outils = outilsNumerotes();
  const entrees = new Map();
  const ajoute = (terme, ref) => {
    const t = terme.trim();
    if (!t || t.length < 3) return;
    const cle = t.toLowerCase();
    if (!entrees.has(cle)) entrees.set(cle, { terme: t, refs: new Set() });
    entrees.get(cle).refs.add(ref);
  };
  for (const o of outils) {
    ajoute(o.nom, o.numero);
    (mots[o.id] || '').split(/\s+/).forEach((w) => { if (w.length > 3 && !/^(pdf|csv|png|jpg|txt)$/i.test(w)) ajoute(w, o.numero); });
  }
  for (const m of aide.messages) ajoute(m.code, CHAPITRE_MESSAGES);
  // quelques mots qui se traitent ailleurs que dans un outil
  const AILLEURS = {
    'mot de passe oublié': '1', 'compte': '1', 'raccourcis': '15', 'clavier': '15', 'annuler': '15', 'récupération': '12', 'mise à jour': '13',
    'licence': '13', 'essai': '13', 'recherche': '5', 'copier du texte': '4', 'zoom': '4', 'glisser vers le bureau': '6', 'allemand': '2', 'langue': '2',
    'journal': '11', 'diagnostic': '17', 'impression': '9', 'enregistrer': '9',
  };
  Object.keys(AILLEURS).forEach((t) => ajoute(t, AILLEURS[t]));
  // Un index qui renvoie « ajouter » à un outil au hasard n'aide personne : les mots trop courants, ceux qui mènent à plus de
  // trois sections, et le pluriel d'un mot déjà là s'en vont ; les noms d'outils et les codes restent toujours.
  const FADES = new Set(['ajouter', 'approuvé', 'copie', 'copier', 'texte', 'fichier', 'fichiers', 'page', 'pages', 'haut', 'bas', 'date', 'titre', 'plusieurs', 'insérer', 'retirer', 'supprimer', 'choisir', 'photo', 'image', 'images', 'format', 'taille', 'ouvert', 'dans', 'avec', 'sans', 'pour', 'terme', 'long', 'letter', 'travers', 'matières', 'table', 'courriel', 'lisible', 'modifié', 'intact', 'malvoyant', 'handicap', 'surimpression', 'saisir', 'saisie']);
  const noms = new Set(outils.map((o) => o.nom.toLowerCase()));
  for (const [c, e] of [...entrees]) {
    const sur = noms.has(c) || /^E-[A-Z]+$/.test(e.terme) || e.refs.size === 0;
    if (sur) continue;
    if (FADES.has(c) || e.refs.size > 3 || (c.endsWith('s') && entrees.has(c.slice(0, -1)))) entrees.delete(c);
  }
  const cles = [...entrees.keys()].sort((a, b) => a.localeCompare(b, 'fr'));
  let html = '<p class="lede">Un mot, la section où il se traite. Les nombres simples sont des chapitres ; ceux qui ont un point sont des outils du chapitre ' + CHAPITRE_OUTILS + '.</p>\n<div class="index">\n';
  let lettre = '';
  for (const c of cles) {
    const e = entrees.get(c);
    const l = c.charAt(0).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (l !== lettre) { if (lettre) html += '</div>\n'; html += '<div class="lettre"><h4>' + esc(l) + '</h4>\n'; lettre = l; }
    const refs = [...e.refs].map(String).sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b));
    html += '<p>' + esc(e.terme) + ' <span class="refs">' + refs.map((r) => '§ ' + r).join(', ') + '</span></p>\n';
  }
  html += '</div></div>\n';
  return html;
}

const REPERES = [
  ['<!--@outils-->', '<!--@fin-outils-->', chapitreOutils],
  ['<!--@messages-->', '<!--@fin-messages-->', chapitreMessages],
  ['<!--@index-->', '<!--@fin-index-->', index],
];
// Le guide, avec ses chapitres écrits : ce qui est entre deux repères est remplacé.
function chapitresGeneres(html) {
  for (const [debut, fin, faire] of REPERES) {
    const a = html.indexOf(debut), b = html.indexOf(fin);
    if (a < 0 || b < a) throw new Error('guide.html : les repères ' + debut + ' et ' + fin + ' manquent');
    html = html.slice(0, a) + faire() + html.slice(b + fin.length);
  }
  return html;
}

module.exports = { chapitresGeneres, chapitreOutils, chapitreMessages, index, outilsNumerotes, motsDuFiltre, REPERES, CHAPITRE_OUTILS, CHAPITRE_MESSAGES, CHAPITRE_INDEX };
