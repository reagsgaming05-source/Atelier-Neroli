/*
 * Le tableau des raccourcis du mode d'emploi, écrit depuis desktop/raccourcis.json : la même table que celle du menu, des
 * infobulles et de la fenêtre « ? ». Le guide ne la recopie pas à la main (elle vieillissait : Ctrl+1 et Ctrl+2 y menaient
 * encore aux vues, alors que ces touches règlent le zoom depuis longtemps).
 */
const table = require('../desktop/raccourcis.json');

// Les noms que la page donne aux touches (src/97-raccourcis.js, NOMS_TOUCHES), en français.
const NOMS = { Ctrl: 'Ctrl', Shift: 'Maj', Alt: 'Alt', Delete: 'Suppr', Backspace: 'Retour arrière', Escape: 'Échap', Enter: 'Entrée', Space: 'Espace', Tab: 'Tab',
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', PageUp: 'Page préc.', PageDown: 'Page suiv.', Home: 'Début', End: 'Fin' };
const GESTES_DE_SOURIS = ['Clic', 'Double-clic', 'Clic droit'];
const ORDRE = ['Affichage', 'Document', 'Navigation', 'Onglets', 'Pages', 'Éditeur de page', 'Vignette'];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function jetons(combo) {
  const j = [];
  let reste = combo;
  while (reste.length) {
    const m = /^(Ctrl|Shift|Alt)\+(.+)$/.exec(reste);
    if (m) { j.push(m[1]); reste = m[2]; continue; }
    j.push(reste); reste = '';
  }
  return j;
}
const kbd = (combo) => jetons(combo).map((j) => (GESTES_DE_SOURIS.includes(j) ? esc(j) : '<kbd>' + esc(NOMS[j] || j) + '</kbd>')).join(' + ');

function tableauDesRaccourcis() {
  const lignes = [];
  table.commandes.forEach((c) => lignes.push({ groupe: c.groupe, touches: [].concat(c.touches), libelle: c.libelle, unelettre: !!c.uneLettre }));
  (table.fixes || []).forEach((f) => lignes.push({ groupe: f.groupe, touches: [].concat(f.touches), libelle: f.libelle, unelettre: false }));
  const groupes = ORDRE.concat(lignes.map((l) => l.groupe).filter((g) => !ORDRE.includes(g)));
  let html = '<table>\n  <tr><th>Touche</th><th>Action</th></tr>\n';
  new Set(groupes).forEach((g) => {
    const dans = lignes.filter((l) => l.groupe === g);
    if (!dans.length) return;
    html += '  <tr class="groupe"><th colspan="2">' + esc(g) + '</th></tr>\n';
    dans.forEach((l) => {
      html += '  <tr><td class="touche">' + l.touches.map(kbd).join(' / ') + '</td><td>' + esc(l.libelle)
        + (l.unelettre ? ' <span class="petit">(touche d’une lettre : se coupe dans Préférences)</span>' : '') + '</td></tr>\n';
    });
  });
  return html + '</table>';
}

const DEBUT = '<!--@raccourcis-->', FIN = '<!--@fin-raccourcis-->';
// Le guide, avec son tableau : ce qui est entre les deux repères est remplacé.
function guideAvecRaccourcis(html) {
  const a = html.indexOf(DEBUT), b = html.indexOf(FIN);
  if (a < 0 || b < a) throw new Error('guide.html : les repères ' + DEBUT + ' et ' + FIN + ' manquent');
  return html.slice(0, a) + tableauDesRaccourcis() + html.slice(b + FIN.length);
}
// Les touches d'une commande de la table, écrites comme dans le guide : « {{RACCOURCI:ouvrir}} » dans un document devient <kbd>Ctrl</kbd> + <kbd>O</kbd>.
// Les documents ne recopient donc jamais une touche : elles suivent la table, comme le menu.
function touchesDeLaCommande(id) {
  const c = table.commandes.find((x) => x.id === id);
  if (!c) throw new Error('raccourci inconnu : « ' + id + ' » (desktop/raccourcis.json)');
  return [].concat(c.touches).map(kbd).join(' ou ');
}
function raccourcisDansLeDocument(html) {
  return html.replace(/\{\{RACCOURCI:([a-z0-9-]+)\}\}/g, (m, id) => touchesDeLaCommande(id));
}
module.exports = { tableauDesRaccourcis, guideAvecRaccourcis, touchesDeLaCommande, raccourcisDansLeDocument, DEBUT, FIN };
