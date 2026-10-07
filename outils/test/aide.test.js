// L'aide des outils (aide/outils.json) : une seule donnée pour le « ? » des boîtes, le chapitre « Les outils » du mode
// d'emploi, la foire aux questions et la formation. Ces tests la gardent d'accord avec le code : un outil ajouté sans aide,
// un « ? » qui renvoie à rien, un code d'erreur que le manuel ne dit pas, font échouer la construction.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const aide = require('../aide/outils.json');

const src = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
const tous = fs.readdirSync(path.join(__dirname, '..', 'src')).filter((f) => f.endsWith('.js'));
const panneau = src('96-panneau.js');

// les outils du panneau : { id, nom, groupe }
function outilsDuPanneau() {
  const res = [];
  const debut = panneau.indexOf('function toolGroups()');
  const fin = panneau.indexOf('function raccourcisDuFiltre()');
  const corps = panneau.slice(debut, fin);
  let groupe = null;
  for (const l of corps.split('\n')) {
    const g = l.match(/^\s*\{ id: '([a-z]+)', title: '/);
    if (g) groupe = g[1];
    const o = l.match(/\{ id: '([a-z-]+)', name: '((?:[^'\\]|\\.)*)'/);
    if (o && groupe) res.push({ id: o[1], nom: o[2].replace(/\\'/g, '\''), groupe });
  }
  return res;
}

test('chaque outil du panneau a son aide, sous le même nom et dans le même groupe', () => {
  const outils = outilsDuPanneau();
  assert.ok(outils.length >= 34, 'le panneau compte ' + outils.length + ' outils');
  for (const o of outils) {
    const a = aide.outils.find((x) => x.id === o.id);
    assert.ok(a, 'l\'outil « ' + o.nom + ' » (' + o.id + ') n\'a pas d\'aide');
    assert.equal(a.nom, o.nom, o.id + ' : le nom de l\'aide est celui du panneau');
    assert.equal(a.groupe, o.groupe, o.id + ' : le groupe de l\'aide est celui du panneau');
  }
});

test('les deux gestes de la barre (imprimer, exporter) ont leur aide', () => {
  for (const id of ['cmd-imprimer', 'cmd-exporter']) assert.ok(aide.outils.find((x) => x.id === id && x.groupe === 'commande'), id);
});

test('aucune aide ne décrit un outil qui n\'existe plus', () => {
  const ids = new Set(outilsDuPanneau().map((o) => o.id));
  for (const a of aide.outils) assert.ok(ids.has(a.id) || a.groupe === 'commande', a.id + ' n\'est plus dans le panneau');
});

test('chaque aide dit ce que l\'outil fait, comment, et ce que cela change', () => {
  const vus = new Set();
  for (const a of aide.outils) {
    assert.ok(!vus.has(a.id), 'identifiant en double : ' + a.id); vus.add(a.id);
    assert.ok(a.quoi && a.quoi.length > 20, a.id + ' : une phrase sur ce que l\'outil fait');
    assert.ok(Array.isArray(a.etapes) && a.etapes.length >= 1 && a.etapes.length <= 5, a.id + ' : entre une et cinq étapes');
    assert.ok(a.effet && a.effet.length > 20, a.id + ' : ce que cela change');
    for (const t of [a.quoi, a.effet, a.attention].concat(a.etapes)) {
      if (!t) continue;
      assert.match(t, /[.»…)]$/, a.id + ' : une phrase finit par un point : « ' + t + ' »');
      assert.ok(t.length <= 330, a.id + ' : phrase trop longue (' + t.length + ') : « ' + t.slice(0, 40) + '… »');
    }
  }
});

test('chaque « ? » de boîte renvoie à une aide qui existe, et chaque boîte d\'outil en a un', () => {
  const ids = new Set(aide.outils.map((a) => a.id));
  const posees = new Set();
  for (const f of tous) {
    for (const m of src(f).matchAll(/^\s*aide: ('([a-z-]+)'|preset === 'number' \? 'number' : 'stamp'),/gm)) {
      (m[2] ? [m[2]] : ['number', 'stamp']).forEach((id) => { assert.ok(ids.has(id), f + ' : « ? » vers une aide absente : ' + id); posees.add(id); });
    }
  }
  // les outils qui ouvrent une boîte à régler
  for (const id of ['blank', 'vides', 'select-plage', 'split', 'dossier', 'resize', 'lots', 'watermark', 'stamp', 'number', 'form', 'serie',
    'commentaires', 'archiver', 'exp-img', 'compress', 'flatten', 'password', 'certificat', 'signatures', 'props', 'access', 'search',
    'tableau', 'ocr', 'comparer', 'cmd-imprimer', 'tampon', 'signer']) {
    assert.ok(posees.has(id), 'la boîte « ' + id + ' » n\'a pas de « ? »');
  }
});

test('le manuel dit chaque code d\'erreur que l\'application peut afficher, et rien de plus', () => {
  const codes = [...src('08-outillage.js').matchAll(/^\s*\['([A-Z]+)', \//gm)].map((m) => 'E-' + m[1]).concat('E-INCONNU');
  assert.ok(codes.length >= 7, 'codes lus : ' + codes.join(', '));
  assert.deepEqual(aide.messages.map((m) => m.code).sort(), codes.slice().sort());
  for (const m of aide.messages) assert.ok(m.titre && m.quoi && m.action, m.code + ' : titre, cause et action');
});
