// Le programme se charge-t-il ? Les modules de src/ sont recollés dans une seule portée : un `const` lu avant sa
// déclaration, un nom oublié ou une accolade mal fermée ne se voient qu'au chargement, et new vm.Script() ne fait
// qu'analyser sans rien évaluer. Ici, le script de la page est exécuté dans node:vm, avec un décor de document
// minimal : la phase de chargement — le seul moment où une portée partagée casse — est jouée pour de bon, et
// l'échec dit lequel, au lieu de faire tomber soixante-neuf scénarios de bout en bout sans explication.
const test = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const { assembler } = require('../assembler');

// Le script de la page : ce qui se trouve entre les balises <script> du corps.
function scriptDeLaPage() {
  const page = assembler();
  const a = page.indexOf('<script>\n(() => {');
  const b = page.indexOf('})();\n</script>', a);
  assert.ok(a > 0 && b > a, 'le script de la page est introuvable dans la source recollée');
  return page.slice(a + '<script>\n'.length, b + '})();'.length);
}

// Tout ce qu'on lit existe, tout ce qu'on appelle répond : un décor sans mémoire, qui ne demande rien au réseau.
const factice = () => new Proxy(function () {}, {
  get: (_, k) => (k === Symbol.toPrimitive ? () => '' : k === 'length' ? 0 : k === 'then' ? undefined : factice()),
  set: () => true, apply: () => factice(), construct: () => factice(),
});
function decor() {
  const doc = {
    readyState: 'loading', addEventListener() {}, getElementById: () => null, querySelector: () => factice(), querySelectorAll: () => [],
    createElement: () => factice(), createElementNS: () => factice(), createTextNode: () => factice(), createTreeWalker: () => factice(),
    documentElement: factice(), body: factice(), fonts: { ready: Promise.resolve() },
  };
  const sandbox = {
    document: doc, navigator: { language: 'fr', userAgent: 'node' }, location: { href: 'file:///x', search: '', hash: '' },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {}, key: () => null, length: 0 },
    performance: { now: () => 0, getEntriesByType: () => [] }, matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {}, removeEventListener() {}, requestAnimationFrame: () => 0,
    setTimeout, clearTimeout, setInterval, clearInterval, console, URL, Blob, TextEncoder, TextDecoder, Promise, AbortController,
  };
  sandbox.window = sandbox;
  return vm.createContext(sandbox);
}
function charger(code) {
  try { vm.runInContext(code, decor(), { filename: 'page.js', timeout: 5000 }); return null; }
  catch (e) { return e; }
}

test('le script de la page se charge, de la première à la dernière ligne', () => {
  const e = charger(scriptDeLaPage());
  assert.strictEqual(e, null, e && ('la phase de chargement échoue : ' + e.message + '\n' + String(e.stack).split('\n').slice(1, 4).join('\n')));
});

test('le garde-fou voit bien ce qu\'il doit voir : un const lu avant sa déclaration', () => {
  const e = charger('(() => { const y = trop_tot + 1; const trop_tot = 2; })();');
  assert.ok(e && /before initialization|trop_tot/.test(e.message), 'le garde-fou n\'a rien vu');
  assert.ok(charger('(() => { f(); const f = () => 1; })();'), 'un appel avant la déclaration doit échouer');
  assert.strictEqual(charger('(() => { function f() { return 1; } f(); })();'), null);
});

test('une faute de portée dans un module est attrapée, et le message dit laquelle', () => {
  const casse = scriptDeLaPage().replace("'use strict';", "'use strict'; const exprès = nomInconnuDeTous + 1;");
  const e = charger(casse);
  assert.ok(e && /nomInconnuDeTous/.test(e.message), 'faute attendue : ' + (e && e.message));
});
