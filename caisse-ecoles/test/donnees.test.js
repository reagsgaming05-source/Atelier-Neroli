/*
 * Le carnet des données : les listes tenues à la main dans l'espace « Données ».
 *
 * Ce qu'on y ajoute doit se retrouver dans les listes déroulantes et y rester d'une ouverture à
 * l'autre ; ce qu'on en retire ne doit plus jamais être proposé — pas même quand l'application
 * réapprend la valeur toute seule en relisant une pièce. Et retirer ne touche à aucune écriture.
 *
 * Noms fictifs : A. Berger, Ch. Dupraz, T. Morel, L. Duvernay, S. Monod.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/carnet.js');
const R = require('../src/registre.js');
const P = require('../src/parser.js');
const V = require('../src/vocabulaire.js');

const VOCAB = () => P.mergeVocabulary(P.emptyVocabulary(), Object.assign({ persons: ['A. Berger', 'Ch. Dupraz'] }, V));
const ajout = (carnet, genre, valeur, extra) => {
  const r = C.ajouter(carnet, genre, valeur, extra);
  assert.ok(r.ok, r.message);
  return r.carnet;
};
const retrait = (carnet, genre, valeur) => {
  const r = C.retirer(carnet, genre, valeur);
  assert.ok(r.ok, r.message);
  return r.carnet;
};

/* ---------------- Ajouter ---------------- */

test('une classe ajoutée se retrouve dans la liste des classes', () => {
  const v = VOCAB();
  assert.ok(!v.classTokens.includes('12VG/2'), 'la classe ne devrait pas être connue d\'avance');
  const c = ajout(C.vide(), 'classes', '12VG/2');
  assert.ok(C.appliquer(v, c).classTokens.includes('12VG/2'));
});

test('un compte ajouté se retrouve dans la liste des comptes, avec ce qu\'on en a noté', () => {
  const c = ajout(C.vide(), 'comptes', '51000.3199.10', { note: 'Bibliothèque' });
  assert.ok(C.appliquer(VOCAB(), c).accounts.includes('51000.3199.10'));
  assert.equal(C.noteDe(c, 'comptes', '51000.3199.10'), 'Bibliothèque');
});

test('un nom ajouté se retrouve dans la liste des personnes', () => {
  const c = ajout(C.vide(), 'personnes', 'S. Monod');
  assert.ok(C.appliquer(VOCAB(), c).persons.includes('S. Monod'));
});

test('la même valeur écrite autrement ne fait pas deux entrées', () => {
  let c = ajout(C.vide(), 'personnes', 'S. Monod');
  c = ajout(c, 'personnes', 's. monod');
  assert.equal(C.ajoutsDe(c, 'personnes').length, 1);
});

test('la valeur est mise en forme : « 5p / 3 » et « 5P/3 » sont la même classe', () => {
  assert.equal(C.normaliser('classes', '5p / 3'), '5P/3');
  assert.equal(C.normaliser('comptes', ' 51000 . 3662 . 00 '), '51000.3662.00');
  assert.equal(C.normaliser('types', 'subvention'), 'SUBVENTION');
  assert.equal(C.normaliser('objets', 'sortie au musée'), 'Sortie au musée');
});

test('un ajout ne modifie pas le carnet qu\'on lui donne', () => {
  const avant = C.vide();
  const apres = ajout(avant, 'classes', '12VG/2');
  assert.equal(C.ajoutsDe(avant, 'classes').length, 0, 'le carnet d\'origine a été modifié');
  assert.equal(C.ajoutsDe(apres, 'classes').length, 1);
});

/* ---------------- Ce qu'on refuse, ce qu'on signale ---------------- */

test('un compte sans chiffre est refusé : ce n\'est pas un numéro', () => {
  const r = C.ajouter(C.vide(), 'comptes', 'caisse');
  assert.equal(r.ok, false);
  assert.match(r.message, /chiffres/);
});

test('un compte d\'une autre forme est accepté, mais signalé', () => {
  const r = C.ajouter(C.vide(), 'comptes', '1234');
  assert.equal(r.ok, true);
  assert.match(r.avertissement, /forme habituelle/);
  assert.ok(C.appliquer(VOCAB(), r.carnet).accounts.includes('1234'), 'le compte doit quand même être gardé');
});

test('un champ vide est refusé, avec le mot juste', () => {
  assert.match(C.ajouter(C.vide(), 'classes', '   ').message, /une classe/);
  assert.match(C.ajouter(C.vide(), 'comptes', '').message, /un compte/);
});

test('un genre inconnu ne crée rien', () => {
  const r = C.ajouter(C.vide(), 'bricoles', 'x');
  assert.equal(r.ok, false);
  assert.deepEqual(C.resume(r.carnet).total, 0);
});

/* ---------------- Retirer ---------------- */

test('un compte retiré n\'est plus proposé', () => {
  const v = VOCAB();
  const cible = v.accounts[0];
  const c = retrait(C.vide(), 'comptes', cible);
  assert.ok(!C.appliquer(v, c).accounts.includes(cible));
});

test('un retrait tient même quand l\'application réapprend la valeur toute seule', () => {
  // c'est tout l'intérêt : les pièces scannées enrichissent le vocabulaire sans rien demander,
  // et un compte retiré serait revenu dans les listes à la première relecture
  const c = retrait(C.vide(), 'comptes', '51000.3185.00');
  const rappris = P.mergeVocabulary(VOCAB(), P.learnVocabulary([
    { libelle: 'FRAIS - piles - A. Berger', compte: '51000.3185.00', credit: 12 },
  ]));
  assert.ok(rappris.accounts.includes('51000.3185.00'), 'le vocabulaire, lui, l\'a bien réappris');
  assert.ok(!C.appliquer(rappris, c).accounts.includes('51000.3185.00'), 'mais la liste ne doit plus le proposer');
});

test('ce qu\'on a ajouté puis retiré ne revient pas non plus', () => {
  let c = ajout(C.vide(), 'classes', '12VG/2');
  c = retrait(c, 'classes', '12VG/2');
  assert.equal(C.ajoutsDe(c, 'classes').length, 0);
  assert.ok(!C.appliquer(VOCAB(), c).classTokens.includes('12VG/2'));
});

test('remettre une valeur retirée la replace dans les listes, sans en faire un ajout', () => {
  const v = VOCAB();
  const cible = v.accounts[0];
  let c = retrait(C.vide(), 'comptes', cible);
  const r = C.remettre(c, 'comptes', cible);
  assert.equal(r.ok, true);
  c = r.carnet;
  assert.ok(C.appliquer(v, c).accounts.includes(cible));
  assert.equal(C.ajoutsDe(c, 'comptes').length, 0, 'une valeur intégrée remise ne devient pas un ajout à nous');
  assert.equal(C.resume(c).total, 0, 'le carnet redevient vide');
});

test('ajouter une valeur retirée la remet dans les listes', () => {
  let c = retrait(C.vide(), 'classes', '9S');
  c = ajout(c, 'classes', '9S');
  assert.ok(C.appliquer(VOCAB(), c).classTokens.includes('9S'));
  assert.deepEqual(C.retiresDe(c, 'classes'), []);
});

test('retirer un compte ne touche à aucune écriture du registre', () => {
  const reg = R.emptyRegister(2026, { openingAmount: 1000, openingDate: '2026-01-01' });
  const p = R.newPiece(reg);
  Object.assign(p, { no: 1, date: '2026-03-03', type: 'FRAIS', objet: 'Matériel', personne: 'A. Berger', compte: '51000.3185.00', montant: 29.7, sens: 'credit' });
  p.libelle = R.composeLibelle(p);
  R.upsertPiece(reg, p);
  const avant = R.journal(reg);

  retrait(C.vide(), 'comptes', '51000.3185.00');

  const apres = R.journal(reg);
  assert.equal(apres.end, avant.end);
  assert.equal(reg.pieces[0].compte, '51000.3185.00');
  assert.equal(reg.pieces[0].libelle, avant.rows[0].libelle);
});

/* ---------------- Objets et types ---------------- */

test('les objets ajoutés viennent après les objets intégrés, « Autre » gardant sa place', () => {
  const c = ajout(C.vide(), 'objets', 'Sortie au musée');
  const l = C.fusionner(P.OBJET_LIST, c, 'objets');
  assert.deepEqual(l.slice(0, P.OBJET_LIST.length), P.OBJET_LIST, "l'ordre de la liste intégrée doit être gardé");
  assert.equal(l[l.length - 1], 'Sortie au musée');
});

test('un type ajouté porte le sens qu\'on lui a donné', () => {
  const c = ajout(C.vide(), 'types', 'subvention', { sens: 'debit' });
  assert.ok(C.fusionner(R.TYPES, c, 'types').includes('SUBVENTION'));
  assert.equal(C.sensDeType(c, 'SUBVENTION'), 'debit');
  assert.equal(C.sensDeType(c, 'AUTRE CHOSE'), null);
});

test('un type ajouté sans sens déclaré n\'en invente pas', () => {
  const c = ajout(C.vide(), 'types', 'DIVERS');
  assert.equal(C.sensDeType(c, 'DIVERS'), null);
});

/* ---------------- Ce qui est gardé d'une fois sur l'autre ---------------- */

test('le carnet relu dit la même chose que le carnet écrit', () => {
  let c = ajout(C.vide(), 'comptes', '51000.3199.10', { note: 'Bibliothèque' });
  c = ajout(c, 'classes', '12VG/2');
  c = ajout(c, 'personnes', 'L. Duvernay');
  c = ajout(c, 'types', 'SUBVENTION', { sens: 'debit' });
  c = retrait(c, 'comptes', '51000.3185.00');
  const relu = C.parse(C.serialize(c));
  assert.deepEqual(relu, c);
  assert.equal(C.noteDe(relu, 'comptes', '51000.3199.10'), 'Bibliothèque');
  assert.equal(C.sensDeType(relu, 'SUBVENTION'), 'debit');
  assert.deepEqual(C.retiresDe(relu, 'comptes'), ['51000.3185.00']);
});

test('un carnet illisible ou absent vaut un carnet vide, pas une erreur', () => {
  for (const mauvais of [null, undefined, '', 'pas du json', '[]', '"x"', '42', '{"ajouts":3}']) {
    const c = C.parse(mauvais);
    assert.equal(C.resume(c).total, 0);
    assert.deepEqual(C.appliquer(VOCAB(), c).accounts, VOCAB().accounts.slice().sort((a, b) => a.localeCompare(b)));
  }
});

test('un carnet bricolé à la main ne pollue pas les objets de l\'application', () => {
  const c = C.parse(JSON.stringify({
    version: 1,
    ajouts: { __proto__: { pollue: 1 }, comptes: [{ valeur: '1234.567', note: 'ok', __proto__: { pollue: 1 } }], inventé: ['x'] },
    retires: { classes: ['9S'], constructor: { x: 1 } },
  }));
  assert.equal({}.pollue, undefined);
  assert.equal({}.x, undefined);
  assert.deepEqual(C.ajoutsDe(c, 'comptes').map((x) => x.valeur), ['1234.567']);
  assert.deepEqual(C.retiresDe(c, 'classes'), ['9S']);
  assert.deepEqual(Object.keys(c.ajouts).sort(), C.GENRES.slice().sort());
});

test('un carnet démesuré est borné plutôt que chargé tel quel', () => {
  const c = C.parse(JSON.stringify({ ajouts: { classes: Array.from({ length: 5000 }, (_, i) => `${i}VG/1`) } }));
  assert.ok(C.ajoutsDe(c, 'classes').length <= 2000);
});

test('une valeur trop longue n\'entre pas dans le carnet', () => {
  const r = C.ajouter(C.vide(), 'personnes', 'A. ' + 'Berger'.repeat(40));
  assert.equal(r.ok, false);
  assert.equal(C.parse(JSON.stringify({ ajouts: { personnes: ['A. ' + 'Berger'.repeat(40)] } })).ajouts.personnes.length, 0);
});

test('une valeur ne peut pas être à la fois ajoutée et retirée', () => {
  const c = C.parse(JSON.stringify({ ajouts: { classes: ['12VG/2'] }, retires: { classes: ['12VG/2'] } }));
  assert.deepEqual(C.ajoutsDe(c, 'classes').map((x) => x.valeur), ['12VG/2']);
  assert.deepEqual(C.retiresDe(c, 'classes'), []);
});

/* ---------------- Le vocabulaire vu à travers le carnet ---------------- */

test('tout ce que le carnet ne concerne pas passe tel quel', () => {
  const v = VOCAB();
  const out = C.appliquer(v, ajout(C.vide(), 'classes', '12VG/2'));
  assert.equal(out.words, v.words);
  assert.equal(out.typeAccounts, v.typeAccounts);
  assert.equal(out.objetAccounts, v.objetAccounts);
});

test('un vocabulaire qui grandit dans le même objet est bien revu', () => {
  // le vocabulaire appris s'allonge par ajout dans ses propres tableaux (un nom tapé dans la
  // fiche) sans que l'objet soit remplacé : la mémoire d'un coup ne doit pas rendre l'ancienne liste
  const v = VOCAB();
  const c = C.vide();
  assert.ok(!C.appliquer(v, c).persons.includes('T. Morel'));
  v.persons.push('T. Morel');
  assert.ok(C.appliquer(v, c).persons.includes('T. Morel'), 'la liste est restée sur son ancienne version');
});

test('la même demande deux fois de suite rend le même objet : les listes ne se refont pas pour rien', () => {
  const v = VOCAB();
  const c = ajout(C.vide(), 'classes', '12VG/2');
  assert.equal(C.appliquer(v, c), C.appliquer(v, c));
});

test('les listes rendues sont triées pour être parcourues', () => {
  const c = ajout(ajout(C.vide(), 'classes', '12VG/2'), 'personnes', 'T. Morel');
  const out = C.appliquer(VOCAB(), c);
  assert.deepEqual(out.accounts, out.accounts.slice().sort((a, b) => a.localeCompare(b)));
  assert.deepEqual(out.persons, out.persons.slice().sort((a, b) => a.localeCompare(b, 'fr')));
  // l'ajout n'est pas mis en queue : il prend sa place dans l'ordre
  assert.equal(out.persons.indexOf('T. Morel'), 2);
});

/* ---------------- Compteur ---------------- */

test('le carnet sait dire ce qu\'il porte', () => {
  let c = ajout(C.vide(), 'classes', '12VG/2');
  c = ajout(c, 'comptes', '1234.567');
  c = retrait(c, 'personnes', 'Ch. Dupraz');
  const r = C.resume(c);
  assert.equal(r.total, 3);
  assert.deepEqual(r.classes, { ajoutes: 1, retires: 0 });
  assert.deepEqual(r.personnes, { ajoutes: 0, retires: 1 });
  assert.equal(C.resume(C.vide()).total, 0);
});

/* ---------------- Le carnet en cours ---------------- */

test('le carnet en cours est celui que toute l\'application lit', () => {
  const avant = C.actuel();
  const c = ajout(C.vide(), 'classes', '12VG/2');
  C.poser(c);
  assert.equal(C.actuel(), c);
  assert.ok(C.appliquer(VOCAB()).classTokens.includes('12VG/2'), 'sans carnet donné, c\'est le carnet en cours qui vaut');
  C.poser(avant);
});

test('poser n\'importe quoi comme carnet rend un carnet vide plutôt qu\'un état bancal', () => {
  const avant = C.actuel();
  C.poser(null);
  assert.equal(C.resume(C.actuel()).total, 0);
  C.poser({ nawak: 1 });
  assert.deepEqual(Object.keys(C.actuel().ajouts).sort(), C.GENRES.slice().sort());
  C.poser(avant);
});
