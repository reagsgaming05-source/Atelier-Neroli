// La table des raccourcis (desktop/raccourcis.json) : une seule source pour la page, le menu de l'application
// fenêtrée, la fenêtre d'aide et les préférences. Ce test garde la table cohérente : aucune touche prise deux fois,
// un seul ordre d'écriture des modificateurs, un menu qui ne cite que des gestes qui existent, et inversement.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const table = require('../desktop/raccourcis.json');
const main = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'main.js'), 'utf8');
const init = fs.readFileSync(path.join(__dirname, '..', 'src', '99-init.js'), 'utf8');

const ORDRE = ['Ctrl', 'Alt', 'Shift'];
const portee = c => c.portee || 'page';

test('chaque geste a un identifiant unique, un libellé et un groupe', () => {
  const ids = table.commandes.map(c => c.id);
  assert.deepStrictEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], 'identifiants en double');
  for (const c of table.commandes) {
    assert.match(c.id, /^[a-z][a-z0-9-]*$/, c.id);
    assert.ok(c.libelle && c.groupe && Array.isArray(c.touches), c.id + ' : libellé, groupe et touches');
  }
});

test('les touches sont écrites dans un seul ordre : Ctrl, Alt, Shift, puis la touche', () => {
  for (const c of table.commandes) {
    for (const t of c.touches) {
      const m = /^((?:(?:Ctrl|Alt|Shift)\+)*)(.+)$/.exec(t);
      assert.ok(m, c.id + ' : ' + t);
      const mods = m[1].split('+').filter(Boolean);
      assert.deepStrictEqual(mods, ORDRE.filter(x => mods.includes(x)), c.id + ' : ' + t + ' n\'est pas dans l\'ordre canonique');
      assert.strictEqual(new Set(mods).size, mods.length, c.id + ' : ' + t + ' répète un modificateur');
    }
  }
});

test('une même touche ne porte jamais deux gestes dans la même portée', () => {
  const vues = new Map();
  for (const c of table.commandes) {
    for (const t of c.touches) {
      const cle = portee(c) + ' ' + t;
      assert.ok(!vues.has(cle), t + ' est donnée à « ' + vues.get(cle) + ' » et à « ' + c.id + ' » (' + portee(c) + ')');
      vues.set(cle, c.id);
    }
  }
});

test('un geste à une lettre ne porte pas Ctrl ni Alt, et inversement', () => {
  for (const c of table.commandes) {
    const seules = c.touches.every(t => /^(Shift\+)?[A-Z]$/.test(t));
    if (c.uneLettre) assert.ok(seules, c.id + ' : « uneLettre » demande des lettres seules');
    else assert.ok(!c.touches.some(t => /^(Shift\+)?[A-Z]$/.test(t)), c.id + ' : une lettre seule doit être marquée « uneLettre »');
  }
});

test('le menu de l\'application fenêtrée ne cite que des gestes de la table, et chaque geste de menu y figure', () => {
  const cites = Array.from(main.matchAll(/accel\('([a-z-]+)'\)/g)).map(m => m[1]);
  const ids = new Set(table.commandes.map(c => c.id));
  assert.deepStrictEqual(cites.filter(id => !ids.has(id)), [], 'gestes du menu absents de la table');
  const menu = table.commandes.filter(c => c.menu).map(c => c.id);
  assert.deepStrictEqual(menu.filter(id => !cites.includes(id)), [], 'gestes marqués « menu » sans entrée de menu');
});

test('chaque geste a une action dans la page (les outils de l\'éditeur y sont posés un par un)', () => {
  const outilsEditeur = (init.match(/\[('select'[^\]]+)\]\.forEach\(outil/) || [, ''])[1].split(',').map(x => x.trim().replace(/'/g, ''));
  assert.ok(outilsEditeur.length >= 10, 'liste des outils de l\'éditeur introuvable dans 99-init.js');
  for (const c of table.commandes) {
    if (c.id.startsWith('ed-') && outilsEditeur.includes(c.id.slice(3))) continue;
    const ecrit = new RegExp("(^|\\n)\\s+'?" + c.id + "'?: \\{|ACTIONS\\['" + c.id + "'\\] = ");
    assert.ok(ecrit.test(init), c.id + ' : aucune action dans 99-init.js');
  }
  // et réciproquement : une action sans geste dans la table ne répond à rien
  const posees = Array.from(init.slice(init.indexOf('Object.assign(ACTIONS')).matchAll(/\n\s+'?([a-z][a-z0-9-]*)'?: \{ (?:quand|agit)/g)).map(m => m[1]);
  const ids = new Set(table.commandes.map(c => c.id));
  assert.deepStrictEqual(posees.filter(id => !ids.has(id)), [], 'actions sans geste dans la table');
});

test('les touches fixes (vignette) ont un groupe, un libellé et des touches lisibles', () => {
  for (const f of table.fixes) {
    assert.ok(f.libelle && f.groupe && f.touches, JSON.stringify(f));
  }
});
