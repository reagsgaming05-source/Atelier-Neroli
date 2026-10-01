/*
 * La page de référence des composants : un seul fichier HTML, sans réseau, qui montre le système de design de l'application
 * tel qu'il est dans le code — les jetons (couleurs avec leurs contrastes, espacements, rayons, tailles de texte, hauteurs),
 * les composants dans leurs états, et le registre d'icônes. Elle sert au développement (un composant se compare à elle) et
 * elle se montre en appel d'offres.
 *
 *   node faire-reference-composants.js [dossier-de-sortie]     écrit Reference-des-composants.html
 *
 * Rien n'y est écrit à la main qui puisse diverger du code : les jetons sont lus dans src/style.css, les icônes dans le
 * registre de src/11-icones.js, et les composants reprennent les classes de l'application avec sa feuille de style
 * (polices comprises). Le test test/systeme.test.js garde la feuille sur ces jetons.
 */
const fs = require('fs');
const path = require('path');
const { feuilleDeStyle, registreIcones, svgIcone, traceMarque } = require('../assembler');

const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'style.css'), 'utf8').replace(/\r\n/g, '\n');
const version = require('../package.json').version;
const PRODUIT = 'Aktum PDF';

// --- les jetons, par thème ----------------------------------------------------------------------------------------------
function bloc(debut) {
  const i = css.indexOf(debut);
  if (i < 0) throw new Error('bloc introuvable : ' + debut);
  const j = css.indexOf('{', i);
  let prof = 0, k = j;
  for (; k < css.length; k++) { if (css[k] === '{') prof++; else if (css[k] === '}' && --prof === 0) break; }
  return css.slice(j + 1, k);
}
const jetons = b => { const o = {}; for (const m of b.matchAll(/(--[\w-]+):\s*([^;]+);/g)) o[m[1]] = m[2].trim(); return o; };
const sombre = jetons(bloc(':root {'));
const clair = Object.assign({}, sombre, jetons(bloc(':root[data-theme="light"] {')));
const resoudre = (t, nom) => { const v = t[nom]; const m = /^var\((--[\w-]+)\)$/.exec(v || ''); return m ? resoudre(t, m[1]) : v; };
const luminance = hex => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const rapport = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const estHex = v => /^#[0-9a-f]{6}$/i.test(v || '');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SURFACES = [['--encre', 'le fond des fenêtres et des champs'], ['--table', 'le plateau, derrière les pages'], ['--feutre', 'le panneau et la barre'], ['--relief', 'ce qui se lève : boutons, menus']];
const TEXTES = [['--texte', 'texte courant'], ['--texte-2', 'texte secondaire'], ['--texte-3', 'texte tertiaire : aides, titres de groupe']];
const SIGNAUX = [['--bleu', 'aplat de l\'action principale'], ['--bleu-vif', 'texte et lien d\'action'], ['--focus', 'anneau de focus'], ['--rouge', 'alerte'], ['--ambre', 'avertissement'], ['--vert', 'confirmation'], ['--trait-champ', 'bordure d\'un champ (3:1)']];

function pastille(t, nom) { const v = resoudre(t, nom); return estHex(v) ? '<span class="r-puce" style="background:' + v + '"></span><code>' + v + '</code>' : '<code>' + esc(v || '') + '</code>'; }

const marque = require('../desktop/marque.json');
function marqueLignes() {
  const roles = { papier: 'le papier : la feuille de l\'icône, le fond du site', encre: 'l\'encre : le texte et le fond le plus sombre', signet: 'le signet : la tuile de l\'icône, jamais un signal d\'erreur', 'signet-fonce': 'le signet, ombré : le ruban et les lignes de l\'icône', 'signet-pli': 'le signet, éclairé : le coin replié', action: 'l\'action : le bouton principal, partout', 'action-survol': 'l\'action, au survol' };
  return Object.keys(roles).map(k => '<tr><th scope="row"><code>' + k + '</code><br><small>' + roles[k] + '</small></th><td><span class="r-puce" style="background:' + marque[k] + '"></span><code>' + marque[k] + '</code></td></tr>').join('')
    + '<tr><th scope="row"><code>fond-fenetre</code><br><small>le fond de la fenêtre avant que la page ne soit peinte</small></th><td><span class="r-puce" style="background:' + marque['fond-fenetre'].sombre + '"></span><code>' + marque['fond-fenetre'].sombre + '</code> sombre · <span class="r-puce" style="background:' + marque['fond-fenetre'].clair + '"></span><code>' + marque['fond-fenetre'].clair + '</code> clair</td></tr>';
}

function sectionCouleurs() {
  const lignes = [];
  for (const [nom, role] of SURFACES.concat(TEXTES, SIGNAUX)) {
    lignes.push('<tr><th scope="row"><code>' + nom + '</code><br><small>' + role + '</small></th><td>' + pastille(sombre, nom) + '</td><td>' + pastille(clair, nom) + '</td></tr>');
  }
  const paires = [];
  const ligne = (fg, bg, seuil, usage) => {
    const f = [sombre, clair].map(t => { const a = resoudre(t, fg), b = resoudre(t, bg); return estHex(a) && estHex(b) ? rapport(a, b) : null; });
    if (f.some(x => x == null)) return;
    paires.push('<tr><td>' + usage + '</td><td><code>' + fg + '</code> sur <code>' + bg + '</code></td>' + f.map(x => '<td class="' + (x >= seuil ? 'r-ok' : 'r-ko') + '">' + x.toFixed(2).replace('.', ',') + ' : 1</td>').join('') + '<td>' + String(seuil).replace('.', ',') + ' : 1</td></tr>');
  };
  for (const s of ['--encre', '--table', '--feutre', '--relief']) { ligne('--texte', s, 4.5, 'texte courant'); ligne('--texte-2', s, 4.5, 'texte secondaire'); ligne('--texte-3', s, 4.5, 'texte tertiaire'); }
  ligne('--bleu-encre', '--bleu', 4.5, 'libellé du bouton principal');
  ligne('--bleu-encre', '--bleu-survol', 4.5, 'libellé du bouton principal, au survol');
  for (const s of ['--feutre', '--encre']) { ligne('--trait-champ', s, 3, 'bordure d\'un champ de saisie'); ligne('--focus', s, 3, 'anneau de focus'); }
  for (const s of ['--feutre', '--encre']) { ligne('--rouge', s, 4.5, 'texte d\'alerte'); ligne('--vert', s, 4.5, 'texte de confirmation'); ligne('--ambre', s, 4.5, 'texte d\'avertissement'); }
  return `
<section id="couleurs"><h2>Couleurs</h2>
<p>Deux thèmes, sombre et clair, chacun avec quatre profondeurs. Les valeurs sont celles de <code>src/style.css</code> ; les rapports de contraste (formule de luminance relative de WCAG 2.1) sont recalculés ici, et le test <code>test/contraste.test.js</code> les garde au-dessus des seuils.</p>
<table class="r-table"><thead><tr><th>Jeton</th><th>Sombre</th><th>Clair</th></tr></thead><tbody>${lignes.join('')}</tbody></table>
<h3>La marque</h3>
<p>Une palette, dite une fois dans <code>desktop/marque.json</code> : l'application, le site de vente, l'icône et la fenêtre de l'application la lisent, et <code>test/marque.test.js</code> vérifie qu'ils disent tous la même chose.</p>
<table class="r-table"><tbody>${marqueLignes()}</tbody></table>
<h3>Contrastes mesurés</h3>
<table class="r-table"><thead><tr><th>Usage</th><th>Paire</th><th>Sombre</th><th>Clair</th><th>Seuil</th></tr></thead><tbody>${paires.join('')}</tbody></table>
</section>`;
}

function sectionEchelles() {
  const px = n => Number(/([0-9.]+)px/.exec(sombre['--' + n])[1]);
  const esp = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => ['e-' + n, px('e-' + n)]);
  const ray = [['r-0', 'angles vifs : le papier, les filets'], ['r-1', 'puces, repères'], ['r-2', 'boutons, champs, cartes'], ['r-3', 'fenêtres, panneaux, zones de dépôt']].map(([n, r]) => [n, px(n), r]);
  const txt = [['t-1', 'légendes, métadonnées'], ['t-2', 'interface courante'], ['t-3', 'corps, champs de saisie'], ['t-4', 'titre de fenêtre'], ['t-5', 'titre de page'], ['t-6', 'affichage']].map(([n, r]) => [n, px(n), r]);
  const hau = [['h-1', 'compact : fermer, puces, champs serrés'], ['h-2', 'courant : bouton, ligne d\'outil, champ de barre'], ['h-3', 'large : boutons de fenêtre, champs de formulaire'], ['h-4', 'tactile : outils de l\'éditeur'], ['h-barre', 'la barre d\'outils']].map(([n, r]) => [n, px(n), r]);
  return `
<section id="echelles"><h2>Échelles</h2>
<p>Chaque grandeur a son échelle, définie une fois dans <code>:root</code>. La feuille de style n'écrit aucun espacement, rayon ni taille de texte en dur : <code>test/systeme.test.js</code> refuse la première valeur qui y reviendrait.</p>
<h3>Espacement</h3>
<p>Huit paliers, multiples de 4, et le filet (2 px), qui n'est pas un palier : il sert aux écarts entre éléments collés.</p>
<table class="r-table"><tbody>${esp.map(([n, v]) => `<tr><th scope="row"><code>--${n}</code></th><td>${v} px</td><td><span class="r-barre" style="width:${v * 4}px"></span></td></tr>`).join('')}</tbody></table>
<h3>Rayons</h3>
<table class="r-table"><tbody>${ray.map(([n, v, r]) => `<tr><th scope="row"><code>--${n}</code></th><td>${v} px</td><td><span class="r-bloc" style="border-radius:${v}px"></span></td><td>${r}</td></tr>`).join('')}<tr><th scope="row"><code>--r-pilule</code></th><td>999 px</td><td><span class="r-bloc" style="border-radius:999px"></span></td><td>puces, étiquettes</td></tr></tbody></table>
<h3>Texte</h3>
<p>Six tailles. Jamais de texte courant sous 11 px ; la famille de l'interface est Geist, celle des chiffres Geist Mono, celle des titres Instrument Serif — toutes trois embarquées, rien n'est demandé au réseau.</p>
<table class="r-table"><tbody>${txt.map(([n, v, r]) => `<tr><th scope="row"><code>--${n}</code></th><td>${v} px</td><td style="font-size:${v}px">Une table lumineuse pour vos pages</td><td>${r}</td></tr>`).join('')}</tbody></table>
<h3>Hauteur d'un contrôle</h3>
<table class="r-table"><tbody>${hau.map(([n, v, r]) => `<tr><th scope="row"><code>--${n}</code></th><td>${v} px</td><td><span class="r-bloc" style="height:${v}px;width:${v * 2}px;border-radius:8px"></span></td><td>${r}</td></tr>`).join('')}</tbody></table>
</section>`;
}

function sectionComposants(ic) {
  const i = nom => svgIcone(nom, ic);
  return `
<section id="composants"><h2>Composants</h2>
<p>Chaque composant est monté ici avec les classes et le balisage de l'application ; le sélecteur de thème, en haut de la page, change les jetons.</p>

<h3>Boutons</h3>
<div class="r-scene r-rang">
  <button class="tb-btn" type="button">${i('ouvrir')}<span class="lbl">Ouvrir</span></button>
  <button class="tb-btn primary" type="button">${i('ouvrir')}<span class="lbl">Exporter le PDF</span></button>
  <button class="tb-btn" type="button" disabled>${i('ouvrir')}<span class="lbl">Désactivé</span></button>
  <button class="tb-btn" type="button" aria-busy="true"><span class="lbl">Occupé</span></button>
  <button class="tb-btn" type="button" aria-pressed="true">${i('lire')}<span class="lbl">Enfoncé</span></button>
  <button class="tb-btn" type="button" title="Sans libellé" aria-label="Sans libellé">${i('aide')}</button>
</div>
<p class="r-note">États : repos, survol, enfoncé (<code>:active</code>), focus clavier (<code>:focus-visible</code>, anneau <code>--focus</code>), désactivé (opacité <code>--desactive</code>, un seul jeton), occupé (<code>aria-busy</code>, disque tournant), pressé (<code>aria-pressed</code>).</p>

<h3>Choix de vue</h3>
<div class="r-scene r-rang">
  <div class="vue-modes" role="group" aria-label="Affichage">
    <button class="vue-mode" type="button" aria-pressed="true">${i('lire')}<span class="lbl">Lire</span></button>
    <button class="vue-mode" type="button" aria-pressed="false">${i('grille')}<span class="lbl">Organiser</span></button>
  </div>
  <div class="seg" role="group" aria-label="Exemple"><button type="button" aria-pressed="true">Recto</button><button type="button" aria-pressed="false">Verso</button></div>
</div>

<h3>Champs</h3>
<div class="r-scene r-colonne">
  <div class="field"><label for="r-a">Texte</label><input id="r-a" type="text" value="Commune Exemple"></div>
  <div class="field"><label for="r-b">Liste</label><select id="r-b"><option>Une page</option><option>Deux pages</option></select></div>
  <div class="field"><label for="r-c">Taille</label><input id="r-c" type="range" min="0" max="100" value="40"></div>
  <label class="check"><input type="checkbox" checked> Une case</label>
</div>
<p class="r-note">La bordure d'un champ est <code>--trait-champ</code> (3:1 au moins sur le fond) ; <code>--trait</code> reste réservé aux filets décoratifs.</p>

<h3>Onglets du panneau</h3>
<div class="r-scene">
  <div class="tabs" style="max-width:320px"><div class="tabs-liste" role="tablist" aria-label="Exemple">
    <button class="tab" role="tab" aria-selected="true" type="button">${i('lire')}<span>Documents</span></button>
    <button class="tab" role="tab" aria-selected="false" type="button">${i('outils')}<span>Outils</span></button>
    <button class="tab" role="tab" aria-selected="false" type="button">${i('lire')}<span>Signets</span></button>
  </div></div>
</div>

<h3>Ligne d'outil et groupe</h3>
<div class="r-scene" style="max-width:320px">
  <section class="tool-group"><h3><button class="groupe-tete" type="button" aria-expanded="true">${i('right')}<span class="g-titre">Organiser</span><span class="g-nb">2</span></button></h3>
  <div class="tool-grille" role="group" aria-label="Organiser">
    <button class="tool" type="button">${i('dupliquer')}<span class="t-texte"><span class="t-name">Dupliquer</span><span class="t-sub">Copier les pages choisies</span></span></button>
    <button class="tool" type="button" disabled>${i('alerte')}<span class="t-texte"><span class="t-name">Désactivé</span><span class="t-sub">Il faut un document</span></span></button>
  </div></section>
</div>

<h3>Fenêtre</h3>
<div class="r-scene r-fenetre"><div class="dialog" role="group" aria-label="Exemple" style="position:static;transform:none">
  <div class="dlg-head">${i('aide').replace('<svg ', '<svg class="ic" ')}<h2>Titre de la fenêtre</h2><button type="button" class="x" aria-label="Fermer">${i('x')}</button></div>
  <div class="dlg-body"><p>Le corps de la fenêtre : un titre court, les champs, une phrase qui dit ce qui se passe.</p></div>
  <div class="dlg-foot"><button class="tb-btn" type="button">Annuler</button><button class="tb-btn primary" type="button">Valider</button></div>
</div></div>

<h3>Messages</h3>
<div class="r-scene r-colonne">
  <div class="toast show" role="status" style="position:static;transform:none">Document enregistré.</div>
  <div class="toast show error" role="alert" style="position:static;transform:none">Le fichier n'a pas pu être écrit.</div>
  <div class="progress" role="progressbar" aria-label="Exemple" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100"><i style="width:60%"></i></div>
  <span class="chip">Une étiquette<button type="button" aria-label="Retirer">${i('x')}</button></span>
  <span><kbd>Ctrl</kbd> + <kbd>S</kbd></span>
</div>
</section>`;
}

function sectionIcones(ic) {
  const noms = Object.keys(ic).sort();
  return `
<section id="icones"><h2>Icônes</h2>
<p>${noms.length} icônes, dans <code>src/11-icones.js</code> : une grille de 16, un trait de 1,5, bouts et jointures arrondis. Une icône n'est jamais seule pour dire quelque chose : le nom d'un bouton vient de son libellé.</p>
<ul class="r-icones">${noms.map(n => `<li>${svgIcone(n, ic)}<code>${n}</code></li>`).join('')}</ul>
</section>`;
}

const FEUILLE_PAGE = `
  html { scroll-behavior: auto; }
  body { background: var(--table); color: var(--texte); font: var(--t-3) / 1.5 var(--ui); margin: 0; user-select: text; -webkit-user-select: text; overflow: auto; display: block; height: auto; }
  .r-page { max-width: 980px; margin: 0 auto; padding: var(--e-6) var(--e-4) var(--e-8); }
  .r-page h1 { font: 400 var(--t-6) var(--titre); margin: 0 0 var(--e-2); }
  .r-page section > h2 { font-size: var(--t-5); margin: var(--e-8) 0 var(--e-2); border-bottom: 1px solid var(--trait); padding-bottom: var(--e-1); }
  .r-page section > h3 { font-size: var(--t-4); margin: var(--e-6) 0 var(--e-2); }
  .r-page p, .r-page li { max-width: 72ch; }
  .r-entete { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--e-4); flex-wrap: wrap; }
  .r-theme { display: flex; gap: var(--e-1); }
  .r-theme button { height: var(--h-2); padding: 0 var(--e-3); border: 1px solid var(--trait-champ); border-radius: var(--r-2); background: var(--relief); color: var(--texte); font: inherit; cursor: pointer; }
  .r-theme button[aria-pressed="true"] { background: var(--bleu); border-color: var(--bleu); color: var(--bleu-encre); }
  .r-nav { display: flex; gap: var(--e-4); flex-wrap: wrap; margin: var(--e-4) 0 0; padding: 0; list-style: none; }
  .r-nav a, .r-page a { color: var(--bleu-vif); }
  .r-table { width: 100%; border-collapse: collapse; margin: var(--e-2) 0; font-size: var(--t-2); }
  .r-table th, .r-table td { text-align: left; vertical-align: middle; padding: var(--e-2) var(--e-3); border-bottom: 1px solid var(--trait); }
  .r-table thead th { color: var(--texte-2); font-weight: 600; }
  .r-table small { color: var(--texte-3); font-weight: 400; }
  .r-puce { display: inline-block; width: var(--e-5); height: var(--e-5); border-radius: var(--r-1); border: 1px solid var(--trait-champ); vertical-align: middle; margin-right: var(--e-2); }
  .r-ok { color: var(--vert); } .r-ko { color: var(--rouge); font-weight: 700; }
  .r-barre { display: inline-block; height: var(--e-2); background: var(--bleu-vif); border-radius: var(--r-0); }
  .r-bloc { display: inline-block; width: 64px; height: 32px; background: var(--relief); border: 1px solid var(--trait-champ); }
  .r-scene { background: var(--feutre); border: 1px solid var(--trait); border-radius: var(--r-3); padding: var(--e-4); margin: var(--e-2) 0; }
  .r-rang { display: flex; flex-wrap: wrap; gap: var(--e-3); align-items: center; }
  .r-colonne { display: flex; flex-direction: column; gap: var(--e-3); align-items: flex-start; }
  .r-fenetre .dialog { max-width: 420px; }
  .r-note { color: var(--texte-2); font-size: var(--t-2); }
  .r-icones { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: var(--e-2); padding: 0; list-style: none; }
  .r-icones li { display: flex; flex-direction: column; align-items: center; gap: var(--e-1); padding: var(--e-3) var(--e-2); background: var(--feutre); border: 1px solid var(--trait); border-radius: var(--r-2); }
  .r-icones svg { width: 24px; height: 24px; }
  .r-icones code { font-size: var(--t-1); color: var(--texte-2); }
  code { font-family: var(--chiffre); font-size: .92em; }
`;

(function main() {
  const sortie = path.resolve(process.argv[2] || path.join(__dirname, 'sortie'));
  fs.mkdirSync(sortie, { recursive: true });
  const ic = registreIcones();
  const html = `<!doctype html>
<html lang="fr" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:; script-src 'unsafe-inline'">
<title>${PRODUIT} — Référence des composants</title>
<style>
${feuilleDeStyle()}
${FEUILLE_PAGE}
</style>
</head>
<body>
<main class="r-page">
  <div class="r-entete">
    <div>
      <h1>${PRODUIT} — Référence des composants</h1>
      <p class="r-note">Version ${esc(version)} · système de design de l'application, tel qu'il est dans le code · ce fichier est autonome et se lit hors ligne.</p>
    </div>
    <div class="r-theme" role="group" aria-label="Thème de la page"><button type="button" data-theme="dark" aria-pressed="true">Sombre</button><button type="button" data-theme="light" aria-pressed="false">Clair</button></div>
  </div>
  <ul class="r-nav"><li><a href="#couleurs">Couleurs</a></li><li><a href="#echelles">Échelles</a></li><li><a href="#composants">Composants</a></li><li><a href="#icones">Icônes</a></li></ul>
  ${sectionCouleurs()}
  ${sectionEchelles()}
  ${sectionComposants(ic)}
  ${sectionIcones(ic)}
</main>
<script>
(function () {
  var boutons = document.querySelectorAll('.r-theme button');
  boutons.forEach(function (b) {
    b.addEventListener('click', function () {
      document.documentElement.setAttribute('data-theme', b.getAttribute('data-theme'));
      boutons.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    });
  });
})();
</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(sortie, 'Reference-des-composants.html'), html);
  console.log('Reference-des-composants.html : ' + (html.length / 1024 / 1024).toFixed(2) + ' Mo, ' + Object.keys(ic).length + ' icônes');
})();
