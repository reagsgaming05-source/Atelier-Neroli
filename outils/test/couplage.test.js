// Le couplage entre modules : les modules de src/ sont recollés dans une seule portée, dans l'ordre de leurs
// numéros. Une fonction peut appeler un symbole défini plus loin (elle ne s'exécute qu'une fois tout chargé),
// mais chaque référence à contre-courant est un fil de plus entre des modules qu'on voudrait séparés — et un
// `const` lu au chargement avant sa déclaration est une erreur qui ne se voit qu'au démarrage.
//
// Ce test fige l'état présent comme plafond : une référence à contre-courant de plus fait échouer la
// construction, et il faut alors soit placer le code là où il appartient, soit passer par la vue
// (vue.render(), dans 05-etat.js). Quand on en retire, on baisse le plafond ; il ne remonte jamais.
//
//   node test/couplage-outil.js    liste les références à contre-courant, par symbole
const test = require('node:test');
const assert = require('node:assert');
const { analyser } = require('./couplage-outil');

// Mesuré à la remise en ordre (voir NOTES-DE-VERSION.md) : 285 références et 94 symboles avant, 78 et 56 après.
const PLAFOND_REFERENCES = 78;
const PLAFOND_SYMBOLES = 56;

const mesure = analyser();
const symboles = new Set(mesure.arcs.map(a => a.nom));

test('les références à contre-courant ne dépassent pas le plafond', () => {
  const liste = Array.from(symboles).sort().join(', ');
  assert.ok(mesure.arcs.length <= PLAFOND_REFERENCES, mesure.arcs.length + ' références à contre-courant (plafond ' + PLAFOND_REFERENCES + ') : ' + liste);
  assert.ok(symboles.size <= PLAFOND_SYMBOLES, symboles.size + ' symboles lus avant leur module (plafond ' + PLAFOND_SYMBOLES + ') : ' + liste);
});

test('aucun symbole n\'est lu au chargement avant le module qui le définit', () => {
  const au = mesure.arcs.filter(a => a.auChargement);
  assert.deepStrictEqual(au.map(a => a.de + ':' + a.ligne + ' lit ' + a.nom + ' (' + a.vers + ')'), []);
});

test('les modules « de socle » ne dépendent pas des modules d\'écran', () => {
  // Les outils généraux (mesure, couleurs, fenêtres, pages) ne remontent vers aucun écran (éditeur, recherche, impression…).
  const ECRANS = /^(8\d|9\d)-/;
  const SOCLE = /^(0[5-9]|1\d|2\d)-/;
  const fautes = mesure.arcs.filter(a => SOCLE.test(a.de) && ECRANS.test(a.vers) && !/^(00|01)-/.test(a.de));
  assert.deepStrictEqual(fautes.map(a => a.de + ' → ' + a.vers + ' (' + a.nom + ')'), []);
});
