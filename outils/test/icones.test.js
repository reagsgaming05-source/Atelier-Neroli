// Les icônes sont un seul jeu : une grille, un trait, aucun doublon, aucune icône morte, aucune écrite hors du
// registre. L'audit en avait compté 74 dessins de deux sources, quatre épaisseurs de trait sur la même grille de 16,
// neuf doublons et trois icônes jamais employées.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { assembler, registreIcones } = require('../assembler');

const SRC = path.join(__dirname, '..', 'src');
const lire = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');
const registre = registreIcones();
const noms = Object.keys(registre);
const sources = fs.readdirSync(SRC).filter((f) => f.endsWith('.js') && f !== '11-icones.js').map(lire).join('\n');
const gabarit = lire('page.html');

test('le gabarit de la page ne dessine aucune icône : il renvoie au registre', () => {
  // seuls la marque du produit (un autre dessin, une autre grille) et le <use> qui la rappelle y gardent un <svg>
  const svg = gabarit.match(/<svg[^>]*>/g) || [];
  const permis = svg.filter((t) => /marque-source|class="mark"/.test(t));
  assert.equal(svg.length, permis.length, 'un <svg> écrit à la main dans src/page.html : ' + svg.filter((t) => !permis.includes(t)).join(' '));
  const reperes = [...gabarit.matchAll(/<!--@ic:(\w+)-->/g)].map((m) => m[1]);
  assert.ok(reperes.length >= 20, 'les repères d\'icône manquent');
  for (const nom of reperes) assert.ok(registre[nom], 'le gabarit demande une icône qui n\'existe pas : ' + nom);
});

test('la page assemblée n\'a plus un seul repère, et chaque icône y porte le même trait', () => {
  const page = assembler();
  assert.ok(!/<!--@ic:\w+-->/.test(page), 'un repère d\'icône est resté dans la page');
  const dessins = page.match(/<svg aria-hidden="true" focusable="false" viewBox="0 0 16 16"[^>]*>/g) || [];
  assert.ok(dessins.length >= 20);
  for (const d of dessins) assert.match(d, /stroke-width="1\.5"/, 'une icône de la page n\'a pas le trait de 1,5 : ' + d);
  // et rien dans la page ne redessine une icône avec un autre trait
  assert.ok(!/<svg viewBox="0 0 16 16"[^>]*stroke-width="1\.[67]"/.test(page), 'une icône écrite à la main a gardé son propre trait');
});

test('aucune icône du registre n\'est morte, aucune n\'est dessinée deux fois', () => {
  const dansGabarit = new Set([...gabarit.matchAll(/<!--@ic:(\w+)-->/g)].map((m) => m[1]));
  const mortes = noms.filter((n) => !dansGabarit.has(n) && !new RegExp('IC\\.' + n + '\\b').test(sources));
  assert.deepEqual(mortes, [], 'des icônes ne servent nulle part : ' + mortes.join(', '));
  const vues = new Map();
  for (const n of noms) {
    const sig = JSON.stringify(registre[n]);
    assert.ok(!vues.has(sig), 'même dessin sous deux noms : ' + vues.get(sig) + ' et ' + n);
    vues.set(sig, n);
  }
});

test('tout ce que le programme emprunte au registre y existe', () => {
  const utilisees = new Set([...sources.matchAll(/\bIC\.(\w+)/g)].map((m) => m[1]));
  const inconnues = [...utilisees].filter((n) => !registre[n]);
  assert.deepEqual(inconnues, [], 'IC.' + inconnues.join(', IC.') + ' n\'existe pas');
});

test('toute icône tient dans sa grille de 16', () => {
  for (const n of noms) {
    for (const p of [].concat(registre[n])) {
      if (p.charAt(0) === 'C') {
        const [cx, cy, r] = p.slice(1).split(',').map(Number);
        assert.ok(cx - r >= 0.4 && cx + r <= 15.6 && cy - r >= 0.4 && cy + r <= 15.6, n + ' sort de la grille : ' + p);
      } else {
        // les coordonnées absolues (lettres majuscules) restent dans [0, 16]
        for (const m of p.matchAll(/[MLHVCSQTA]\s*([-\d.\s,]+)/g)) {
          for (const v of m[1].trim().split(/[\s,]+/).map(Number)) assert.ok(v >= -0.01 && v <= 16.01, n + ' sort de la grille : ' + p);
        }
      }
    }
  }
});

test('l\'épaisseur du trait ne se surcharge que pour compenser une réduction', () => {
  // les seuls `sw` admis sont ceux de la croix des petits boutons de fermeture et de la coche d'une vignette
  const surcharges = [...sources.matchAll(/icon\(IC\.(\w+),\s*\{\s*sw:/g)].map((m) => m[1]);
  for (const n of surcharges) assert.ok(['x', 'plus', 'check'].includes(n), 'trait surchargé sur IC.' + n);
});
