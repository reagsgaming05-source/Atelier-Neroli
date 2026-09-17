// Le sommaire d'un dossier de pièces suit les pages. Ce qui est testé ici,
// c'est l'attente : quand on exporte juste après avoir déplacé une pièce, la
// régénération est encore en route, et le PDF ne doit surtout pas partir avec
// les numéros d'avant.
const test = require('node:test');
const assert = require('node:assert/strict');
const { SOURCE } = require('./aide');

const DEBUT = '  let sommaireEnCours = false;';
const FIN = '  async function rafraichirSommaire() {';
const a = SOURCE.indexOf(DEBUT);
const b = SOURCE.indexOf(FIN, a);
if (a < 0 || b < 0) throw new Error('bloc du sommaire introuvable dans la source');
const BLOC = SOURCE.slice(a, b);
// Le bloc livré, avec ses deux seules dépendances passées de l'extérieur.
const fabrique = new Function('state', 'rafraichirSommaire',
  BLOC + '\nreturn { sommairePret, sommaireAJour, lancerSommaire, poserEnCours: v => { sommaireEnCours = v; } };');

// Un dossier ouvert, et une régénération dont le test décide du déroulé.
// Comme la vraie, elle pose la signature dès le départ et ne finit que plus tard.
function monter(ids, deroule) {
  const state = { dossier: { signature: ids.join(',') }, pages: ids.map(id => ({ id })) };
  const appels = [];
  const api = fabrique(state, function () {
    const sig = state.pages.map(p => p.id).join(',');
    state.dossier.signature = sig;
    appels.push(sig);
    return deroule(state, appels.length);
  });
  return { state, api, appels };
}
const tick = () => new Promise(r => setTimeout(r, 0));

test('une régénération en route : le sommaire n\'est pas « à jour », même si la signature colle', async () => {
  let fini = false;
  const { api } = monter([1, 2], async () => { await tick(); fini = true; });
  api.lancerSommaire();
  assert.equal(api.sommaireAJour(), false, 'la signature est posée dès le départ : elle ne suffit pas à dire que c\'est prêt');
  await api.sommairePret();
  assert.equal(fini, true, 'l\'assemblage a attendu la fin de la régénération');
  assert.equal(api.sommaireAJour(), true);
});

test('une page bouge pendant la régénération : elle est refaite, et attendue', async () => {
  const { state, api, appels } = monter([1, 2], async (st, n) => {
    await tick();
    if (n === 1) st.pages.push({ id: 3 });   // une pièce ajoutée entre-temps
  });
  api.lancerSommaire();
  await api.sommairePret();
  assert.deepEqual(appels, ['1,2', '1,2,3'], 'deux passes : la seconde avec la page arrivée entre-temps');
  assert.equal(state.dossier.signature, '1,2,3');
  assert.equal(api.sommaireAJour(), true);
});

test('les pages ont bougé sans que personne ne relance : l\'assemblage s\'en charge', async () => {
  const { state, api, appels } = monter([1, 2], async () => { await tick(); });
  state.pages.push({ id: 3 });               // déplacement non suivi d'un rendu
  assert.equal(api.sommaireAJour(), false);
  await api.sommairePret();
  assert.deepEqual(appels, ['1,2,3']);
  assert.equal(api.sommaireAJour(), true);
});

test('une régénération qui ne peut rien faire n\'est pas relancée en boucle', async () => {
  // La vraie rend la main sans rien changer quand la source générée a disparu.
  const { state, api, appels } = monter([1, 2], async () => {});
  state.dossier.signature = 'périmée';
  await api.sommairePret();
  assert.equal(appels.length, 1, 'un seul essai : on n\'insiste pas si rien ne bouge');
});

test('une régénération qui échoue ne bloque pas l\'export', async () => {
  const { state, api, appels } = monter([1, 2], async () => { await tick(); throw new Error('sommaire illisible'); });
  state.pages.push({ id: 3 });               // il y a bien quelque chose à refaire
  const rendu = await api.sommairePret().then(() => true, () => false);
  assert.equal(rendu, true, 'sommairePret rend la main plutôt que de propager l\'échec');
  assert.equal(appels.length, 1);
});

test('sans dossier de pièces, il n\'y a rien à attendre', async () => {
  const { state, api, appels } = monter([1, 2], async () => { throw new Error('ne devrait pas être appelée'); });
  state.dossier = null;
  assert.equal(api.sommaireAJour(), true);
  await api.sommairePret();
  assert.equal(appels.length, 0);
});

test('une régénération encore dans son corps (sommaireEnCours) est attendue elle aussi', async () => {
  const { api } = monter([1, 2], async () => {});
  api.poserEnCours(true);
  assert.equal(api.sommaireAJour(), false, 'le drapeau interne suffit à dire « pas prêt »');
  api.poserEnCours(false);
  assert.equal(api.sommaireAJour(), true);
});
