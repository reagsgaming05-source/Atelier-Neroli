/*
 * Contrôle final après la fusion des six équipes : ce qu'une collègue voit à l'écran.
 *
 * Ce que la feuille de style promet pour qu'aucune page ne défile en largeur ; la preuve à
 * l'écran, à 1366 × 768, est dans le test de fumée (desktop/smoke-test.js, « contrôle final »).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const lire = (p) => fs.readFileSync(path.join(racine, p), 'utf8');

/* ---------------------------------------------------------------- feuille de style */

const css = () => lire('src/app.css');
/** Toutes les déclarations d'une propriété pour un sélecteur exact, dans l'ordre de la feuille (hors @media). */
function declarations(feuille, selecteur, propriete) {
  const horsMedia = feuille.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media[^{]*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, '');
  const esc = selecteur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const out = [];
  for (const m of horsMedia.matchAll(new RegExp(`(?<=^|\\})\\s*${esc}\\s*\\{([^}]*)\\}`, 'g'))) {
    const d = new RegExp(`(?:^|;)\\s*${propriete}\\s*:\\s*([^;]+)`).exec(m[1]);
    if (d) out.push(d[1].trim());
  }
  return out;
}

test('la Saisie des pièces ne pousse plus la page en largeur : la grille ne prend pas la largeur du journal', () => {
  const col = declarations(css(), '.layout2', 'grid-template-columns');
  assert.ok(col.length, 'règle .layout2 introuvable : la feuille a changé, ce test doit suivre');
  assert.match(col[col.length - 1], /^minmax\(0,\s*1fr\)$/, 'un « 1fr » seul prend la largeur minimale du journal');
});

test('le libellé du journal se coupe (…) au lieu d\'élargir le tableau', () => {
  const mw = declarations(css(), 'table.entries.journal td.libelle', 'max-width');
  assert.equal(mw[mw.length - 1], '0', 'dans un tableau, max-width: 520px ne retient pas la cellule');
});

test('le bouton Enregistrer de la fiche reste au-dessus des messages', () => {
  const b = declarations(css(), '#ficheActions', 'bottom');
  assert.match(b[b.length - 1], /var\(--avis-h/, 'la barre collée en bas passait sous la zone des messages');
});

test('Pièces scannées, sous 1700 px : tableau resserré et aperçu à côté, rien qui dépasse à 1366 px', () => {
  const f = css();
  const m = /@media \(max-width: 1700px\) \{([\s\S]*?)\n\}/.exec(f);
  assert.ok(m, 'bloc @media (max-width: 1700px) introuvable');
  const corps = m[1];
  const px = (re) => { const x = re.exec(corps); assert.ok(x, `${re} introuvable`); return Number(x[1]); };
  const apercu = px(/\.layout \{ grid-template-columns: minmax\(0, 1fr\) (\d+)px; gap: (?:\d+)px; \}/);
  const ecart = px(/\.layout \{ grid-template-columns: minmax\(0, 1fr\) \d+px; gap: (\d+)px; \}/);
  assert.ok(apercu >= 280, 'l\'aperçu doit rester lisible à côté de la ligne');
  // Largeur disponible à 1366 px (fenêtre agrandie, barre de défilement de 15 px), barre latérale
  // de 212 px, marges de la page (2 × 30) et de la carte resserrée (2 × 16, bords 2) : le tableau
  // doit tenir dans ce qui reste à côté de l'aperçu. Sa largeur minimale, relevée à l'écran avec
  // ces réglages (dates, comptes et montants lisibles en entier), est de 723 px ; on vérifie la
  // marge prise par le calcul, pas le navigateur.
  const disponible = 1366 - 15 - 212 - 60 - 34 - ecart - apercu;
  assert.ok(disponible >= 723 + 20, `il reste ${disponible} px au tableau à 1366 px`);
  for (const sel of ['#entriesTable input.date', '#entriesTable input.compte', '#entriesTable input.num', '#entriesTable td.libelle']) {
    assert.ok(corps.includes(sel), `${sel} n'est plus resserré`);
  }
});
