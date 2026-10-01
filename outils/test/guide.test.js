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
