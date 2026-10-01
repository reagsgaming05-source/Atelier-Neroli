// Les contrastes de l'interface, recalculés depuis les jetons de src/style.css (formule de luminance relative de WCAG 2.1) :
// le texte courant à 4,5:1 au moins, le texte du bouton principal aussi, les bordures de champs et l'anneau de focus à 3:1.
// L'audit en avait mesuré vingt-et-une sous le seuil ; ce test les garde dessus, dans les deux thèmes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'style.css'), 'utf8').replace(/\r\n/g, '\n');

// Les jetons d'un bloc, par nom ; une valeur « var(--x) » se résout dans le même thème.
function jetons(bloc) {
  const o = {};
  for (const m of bloc.matchAll(/(--[\w-]+):\s*([^;]+);/g)) o[m[1]] = m[2].trim();
  return o;
}
function bloc(debut) {
  const i = css.indexOf(debut);
  assert.ok(i >= 0, 'bloc introuvable : ' + debut);
  const j = css.indexOf('{', i);
  let prof = 0, k = j;
  for (; k < css.length; k++) { if (css[k] === '{') prof++; else if (css[k] === '}' && --prof === 0) break; }
  return css.slice(j + 1, k);
}
const sombre = jetons(bloc(':root {'));
const clair = Object.assign({}, sombre, jetons(bloc(':root[data-theme="light"] {')));

function resoudre(t, nom) {
  let v = t[nom];
  assert.ok(v, 'jeton absent : ' + nom);
  const m = /^var\((--[\w-]+)\)$/.exec(v);
  return m ? resoudre(t, m[1]) : v;
}
function luminance(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function rapport(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// [texte ou trait, fond, seuil, usage]
const SURFACES = ['--encre', '--table', '--feutre', '--relief'];
const PAIRES = [];
for (const s of SURFACES) {
  PAIRES.push(['--texte', s, 4.5, 'texte courant']);
  PAIRES.push(['--texte-2', s, 4.5, 'texte secondaire']);
  PAIRES.push(['--texte-3', s, 4.5, 'texte tertiaire (titres de groupe, aides, métadonnées)']);
}
PAIRES.push(['--bleu-encre', '--bleu', 4.5, 'libellé du bouton principal']);
PAIRES.push(['--bleu-encre', '--bleu-survol', 4.5, 'libellé du bouton principal au survol']);
for (const s of ['--feutre', '--encre']) {
  PAIRES.push(['--trait-champ', s, 3, 'bordure d\'un champ de saisie (WCAG 1.4.11)']);
  PAIRES.push(['--focus', s, 3, 'anneau de focus']);
}
// les signaux, quand ils portent du texte
for (const s of ['--feutre', '--encre', '--table']) {
  PAIRES.push(['--rouge', s, 4.5, 'texte d\'alerte']);
  PAIRES.push(['--vert', s, 4.5, 'texte de confirmation']);
  PAIRES.push(['--ambre', s, 4.5, 'texte d\'avertissement']);
}

for (const [nom, t] of [['sombre', sombre], ['clair', clair]]) {
  test('thème ' + nom + ' : les contrastes passent', () => {
    const fautes = [];
    for (const [fg, bg, seuil, usage] of PAIRES) {
      const r = rapport(resoudre(t, fg), resoudre(t, bg));
      if (r < seuil) fautes.push(fg + ' sur ' + bg + ' (' + usage + ') : ' + r.toFixed(2) + ':1 au lieu de ' + seuil + ':1');
    }
    assert.deepEqual(fautes, []);
  });
}

test('les surfaces du thème clair ont leurs propres niveaux, comme celles du thème sombre', () => {
  // quatre profondeurs : le plateau, le panneau, la barre, ce qui se lève. En clair, elles valaient toutes #FFFFFF.
  const distinctes = new Set(['--table', '--feutre', '--encre'].map(n => resoudre(clair, n).toUpperCase()));
  assert.ok(distinctes.size >= 2, 'le plateau et le panneau du thème clair sont de la même couleur');
  assert.notEqual(resoudre(clair, '--table').toUpperCase(), resoudre(clair, '--feutre').toUpperCase());
  assert.notEqual(resoudre(sombre, '--trait-fin').toUpperCase(), resoudre(sombre, '--feutre').toUpperCase(), 'les filets fins du thème sombre se confondent avec le panneau');
});

test('les deux thèmes déclarent les mêmes jetons de couleur', () => {
  const couleur = (t) => Object.keys(t).filter(n => /^#|^rgba?\(/.test(t[n])).sort();
  const manque = couleur(sombre).filter(n => !(n in jetons(bloc(':root[data-theme="light"] {'))) && !['--bleu-ombre', '--rouge-ombre'].includes(n));
  // seuls les jetons de géométrie, de police ou de transparence propres à un thème peuvent ne pas être redéclarés ; les trois du signet
  // sont ceux de la marque, qui ne suit pas le thème (desktop/marque.json)
  assert.deepEqual(manque.filter(n => !/^--(survol|lueur|voile|ombre|teinte|bleu-encre|signet)/.test(n)), [], 'jetons du thème sombre sans pendant clair');
});

test('un seul état « désactivé » : un jeton, pas cinq opacités', () => {
  const opacites = [...css.matchAll(/:disabled[^{]*\{[^}]*opacity:\s*([^;}]+)/g)].map(m => m[1].trim());
  // (le mode contraste élevé du système pose « 1 » : il n'atténue pas, il passe par la couleur GrayText)
  assert.ok(opacites.every(o => o === 'var(--desactive)' || o === '1'), 'des opacités écrites en dur : ' + opacites.join(', '));
});
