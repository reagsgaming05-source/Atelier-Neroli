// Un échec se dit en français, avec sa cause, ce qu'on peut faire et une référence à citer au support : jamais le message brut d'une
// bibliothèque (« This method should not be called. »), qui part au journal.
const test = require('node:test');
const assert = require('node:assert/strict');
const { extraire } = require('./aide');
const journal = [];
global.signaler = (contexte, e, niveau) => journal.push({ contexte, msg: e && e.message ? e.message : String(e), niveau });
const { messageDEchec, analyserEchec } = extraire('  const CAUSES_ECHEC = ', '  // Le journal de la session pour le rapport', '{ messageDEchec, analyserEchec }');

test('un message brut en anglais ne sort jamais à l\'écran, et va au journal', () => {
  journal.length = 0;
  const m = messageDEchec('Le caviardage', new Error('This method should not be called.'));
  assert.ok(m.startsWith('Le caviardage n\'a pas abouti : '), m);
  assert.ok(!/method|called/i.test(m), 'rien d\'anglais à l\'écran : ' + m);
  assert.ok(/\[E-INCONNU\]$/.test(m), 'la référence est dite');
  assert.equal(journal.length, 1);
  assert.equal(journal[0].msg, 'This method should not be called.');
  assert.equal(journal[0].niveau, 'erreur');
});

test('les causes connues sont reconnues, chacune avec sa référence', () => {
  const cas = [
    ['Array buffer allocation failed', 'E-MEM', /mémoire/],
    ['Invalid typed array length: 4294967296', 'E-MEM', /mémoire/],
    ['No password given', 'E-MDP', /mot de passe/],
    ['Invalid PDF structure', 'E-FICHIER', /incomplet ou abîmé/],
    ['bad XRef entry', 'E-FICHIER', /incomplet ou abîmé/],
    ['ENOSPC: no space left on device', 'E-DISQUE', /écriture/],
    ['Failed to fetch dynamically imported module', 'E-COMPOSANT', /composant/],
    ['Unknown font: glyph not found', 'E-POLICE', /police/],
    ['quelque chose d\'imprévu', 'E-INCONNU', /pas pu être identifiée/],
  ];
  for (const [brut, code, motif] of cas) {
    const a = analyserEchec(new Error(brut));
    assert.equal(a.code, code, brut);
    assert.match(a.cause, motif, brut);
    assert.ok(a.action.length > 20, 'une action est proposée pour ' + brut);
  }
});

test('un échec sans message (valeur jetée, chaîne) se dit aussi', () => {
  assert.match(messageDEchec('L\'export', 'boom'), /^L'export n'a pas abouti : /);
  assert.match(messageDEchec('L\'export', undefined), /E-INCONNU/);
});

// Le garde-fou : aucun toast ne recolle le message d'une exception. Toute nouvelle opération passe par messageDEchec().
test('aucun message d\'erreur de l\'interface ne recolle e.message', () => {
  const fs = require('fs'), path = require('path');
  const SRC = path.join(__dirname, '..', 'src');
  const fautifs = [];
  for (const f of fs.readdirSync(SRC).filter(n => n.endsWith('.js'))) {
    fs.readFileSync(path.join(SRC, f), 'utf8').split('\n').forEach((l, i) => {
      if (/toast\(/.test(l) && /\be(rr)?\.message\b|e && e\.message/.test(l) && !/humain/.test(l)) fautifs.push(f + ':' + (i + 1));
    });
  }
  assert.deepEqual(fautifs, [], 'passer par messageDEchec(quoi, e)');
});
