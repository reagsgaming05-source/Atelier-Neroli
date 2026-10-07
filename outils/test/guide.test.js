// Le mode d'emploi ne recopie pas la table des raccourcis : il l'écrit depuis desktop/raccourcis.json, la même que le menu, les
// infobulles et la fenêtre « ? ». Un geste ajouté à la table apparaît donc dans le guide sans que personne y pense.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const table = require('../desktop/raccourcis.json');
const { tableauDesRaccourcis, guideAvecRaccourcis, DEBUT, FIN } = require('../guide/tableau-raccourcis');

const guide = fs.readFileSync(path.join(__dirname, '..', 'guide', 'guide.html'), 'utf8');
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

test('le guide porte les repères du tableau, et rien de recopié entre eux', () => {
  assert.ok(guide.includes(DEBUT) && guide.includes(FIN), 'repères présents');
  const entre = guide.slice(guide.indexOf(DEBUT), guide.indexOf(FIN));
  assert.ok(!/<kbd>/.test(entre), 'le tableau n\'est pas écrit à la main dans guide.html');
});

test('chaque geste de la table est dans le tableau du guide, avec ses touches', () => {
  const html = decode(tableauDesRaccourcis());
  for (const c of table.commandes) {
    assert.ok(html.includes(c.libelle), 'le guide dit « ' + c.libelle + ' »');
  }
  for (const f of table.fixes) assert.ok(html.includes(f.libelle), 'le guide dit « ' + f.libelle + ' »');
  // une touche d'origine : Ctrl+Maj+2 (Organiser) se lit « Ctrl + Maj + 2 »
  assert.match(tableauDesRaccourcis(), /<kbd>Ctrl<\/kbd> \+ <kbd>Maj<\/kbd> \+ <kbd>2<\/kbd>/);
  // et Ctrl+1 ne mène plus à une vue
  assert.ok(!/Ctrl<\/kbd> \+ <kbd>1<\/kbd> \/ <kbd>Ctrl<\/kbd> \+ <kbd>2<\/kbd><\/td><td>Vue/.test(tableauDesRaccourcis()));
});

test('le guide imprimé remplace ce qui est entre les repères', () => {
  const out = guideAvecRaccourcis(guide);
  assert.ok(out.includes('Répéter la dernière opération'), 'le geste ajouté à la table est là');
  assert.ok(!out.includes('remplacé à l’impression'));
  assert.throws(() => guideAvecRaccourcis('<p>sans repères</p>'), /repères/);
});

// Les chapitres écrits depuis la donnée (guide/chapitres-generes.js) : les outils, les messages, l'index.
const { chapitresGeneres, chapitreOutils, chapitreMessages, index, REPERES } = require('../guide/chapitres-generes');
const aide = require('../aide/outils.json');

test('le guide porte les repères de ses trois chapitres écrits, et rien de recopié entre eux', () => {
  for (const [debut, fin] of REPERES) {
    assert.ok(guide.includes(debut) && guide.includes(fin), debut + ' … ' + fin);
    const entre = guide.slice(guide.indexOf(debut), guide.indexOf(fin));
    assert.ok(!/<h4/.test(entre), 'rien n\'est écrit à la main entre ' + debut + ' et ' + fin);
  }
});

test('le chapitre des outils décrit chaque outil, avec ce qu\'il change', () => {
  const html = chapitreOutils();
  for (const o of aide.outils) {
    assert.ok(html.includes('id="outil-' + o.id + '"'), o.id + ' est au manuel');
    assert.ok(decode(html).includes(o.effet), o.id + ' : ce que cela change est dit');
  }
});

test('le chapitre des messages dit chaque code, et l\'index renvoie à chaque outil et à chaque code', () => {
  const m = chapitreMessages();
  for (const x of aide.messages) assert.ok(m.includes('>' + x.code + '<'), x.code);
  const i = index();
  for (const o of aide.outils) assert.ok(decode(i).toLowerCase().includes(o.nom.toLowerCase()), 'index : ' + o.nom);
  for (const x of aide.messages) assert.ok(i.includes(x.code), 'index : ' + x.code);
});

test('le guide complet est écrit sans repère vide ni outil manquant', () => {
  const tout = chapitresGeneres(guide);
  assert.ok(!/écrit à l’impression/.test(tout), 'les paragraphes provisoires sont remplacés');
  assert.ok((tout.match(/id="outil-/g) || []).length === aide.outils.length);
});
