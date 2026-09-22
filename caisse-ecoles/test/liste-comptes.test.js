/*
 * La liste déroulante des comptes : tous les comptes connus, le plus probable en premier, avec à
 * quoi chacun sert d'habitude. Quatre boutons « habituels » ne servaient que si le bon en faisait
 * partie ; sinon il fallait connaître le numéro par cœur.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/registre.js');
const V = require('../src/vocabulaire.js');

const VOCAB = V.base || V;

function piece(over) {
  const reg = R.emptyRegister(2026, { openingAmount: 0 });
  const p = R.newPiece(reg);
  Object.assign(p, over);
  return { p, reg };
}

const choix = (over, reg) => {
  const c = piece(over);
  return R.accountChoices(c.p, VOCAB, reg || c.reg);
};

test('la liste porte tous les comptes connus, pas seulement les quatre habituels', () => {
  const l = choix({ type: 'DECOMPTE', objet: "Course d'école", classe: '5P/3' });
  assert.ok(l.length >= (VOCAB.accounts || []).length, 'des comptes connus manquent à la liste');
  for (const c of VOCAB.accounts || []) {
    assert.ok(l.some((x) => x.compte === c), `compte ${c} absent de la liste`);
  }
});

test('le compte habituel du type arrive en tête', () => {
  const l = choix({ type: 'DECOMPTE', objet: "Course d'école", classe: '5P/3' });
  assert.equal(l[0].compte, '51000.3662.00');
  assert.equal(l[0].niveau, 0, 'il devrait être reconnu au niveau le plus précis');
  assert.ok(l[0].n > 0, 'il devrait porter le nombre d\'écritures qui le justifient');
});

test('la tête de liste suit les exemples documentés du README', () => {
  // DECOMPTE + course d'école + 5P, AVANCE + camp + 9S, PARTICIPATION + cours de ski
  assert.equal(choix({ type: 'DECOMPTE', objet: "Course d'école", classe: '5P/3' })[0].compte, '51000.3662.00');
  assert.equal(choix({ type: 'AVANCE', objet: 'Camp', classe: '9S' })[0].compte, '52000.3662.00');
  assert.equal(choix({ type: 'PARTICIPATION DES PARENTS', objet: 'Cours de ski', classe: '9S' })[0].compte, '51000.4392.20');
});

test('le degré change la tête de liste : primaire et secondaire n\'ont pas le même compte', () => {
  const secondaire = choix({ type: 'AVANCE', objet: 'Camp', classe: '9S' })[0].compte;
  const primaire = choix({ type: 'AVANCE', objet: 'Camp', classe: '8P/3' })[0].compte;
  assert.notEqual(primaire, secondaire, 'le degré devrait peser sur la proposition');
});

test('les comptes déjà employés pour ce genre d\'écriture se distinguent des autres', () => {
  const l = choix({ type: 'DECOMPTE', objet: "Course d'école", classe: '5P/3' });
  const forts = l.filter((c) => c.niveau <= 1);
  assert.ok(forts.length >= 1);
  // et ils sont tous avant les autres : la liste est triée par pertinence
  const premierFaible = l.findIndex((c) => c.niveau > 1);
  assert.ok(l.slice(0, premierFaible).every((c) => c.niveau <= 1));
});

test('chaque compte dit à quoi il sert, sans compter deux fois les mêmes écritures', () => {
  const l = choix({ type: 'DECOMPTE', objet: "Course d'école" });
  const par = (c) => (l.find((x) => x.compte === c) || {}).usage;
  // l'étiquette détaillée doit gagner sur l'étiquette vague du même compte
  assert.equal(par('52000.3662.00'), 'AVANCE · Camp');
  assert.equal(par('51000.3662.30'), 'DECOMPTE · Camp');
  assert.equal(par('9111.100'), 'RETRAIT · Bourse communale');
  // « Autre » n'est pas un objet : il ne s'écrit pas
  assert.ok(!l.some((c) => /· Autre/.test(c.usage)), 'un usage contient « Autre »');
});

test('le côté habituel du compte est connu quand il est net', () => {
  const l = choix({ type: 'DECOMPTE', objet: "Course d'école" });
  assert.equal((l.find((x) => x.compte === '51000.3662.00') || {}).sens, 'credit');
  assert.equal((l.find((x) => x.compte === '51000.4392.20') || {}).sens, 'debit');
});

test('les comptes de l\'année en cours s\'ajoutent à ceux du classeur', () => {
  const { p, reg } = piece({ type: 'FRAIS' });
  const nouveau = R.newPiece(reg);
  Object.assign(nouveau, { no: 1, date: '2026-01-05', type: 'FRAIS', objet: 'Matériel', compte: '99999.1234.56', montant: 10, sens: 'credit', personne: 'A. Berger' });
  R.upsertPiece(reg, nouveau);
  const l = R.accountChoices(p, VOCAB, reg);
  const x = l.find((c) => c.compte === '99999.1234.56');
  assert.ok(x, 'un compte employé cette année devrait figurer dans la liste');
  assert.equal(x.usage, 'FRAIS · Matériel');
  // niveau 2 : le type concorde, mais la pièce en cours n'a ni objet ni degré à confronter
  assert.equal(x.niveau, 2);
  assert.ok(l.indexOf(x) < l.findIndex((c) => c.niveau === 3), 'il devrait passer avant les comptes jamais employés pour ce type');
});

test('sans vocabulaire ni registre, la liste est vide plutôt que fausse', () => {
  const { p } = piece({ type: 'DECOMPTE' });
  assert.deepEqual(R.accountChoices(p, null, null), []);
  assert.deepEqual(R.accountChoices(p, {}, R.emptyRegister(2026)), []);
});

test('une pièce sans type garde la liste complète, simplement sans ordre de pertinence', () => {
  const l = choix({ type: '' });
  assert.equal(l.length, (VOCAB.accounts || []).length);
  assert.ok(l.every((c) => c.niveau === 3));
  // triée par numéro, pour être parcourue
  const numeros = l.map((c) => c.compte);
  assert.deepEqual(numeros, numeros.slice().sort((a, b) => a.localeCompare(b)));
});

test('aucun compte n\'apparaît deux fois', () => {
  const l = choix({ type: 'DECOMPTE', objet: "Course d'école", classe: '5P/3' });
  assert.equal(new Set(l.map((c) => c.compte)).size, l.length);
});
