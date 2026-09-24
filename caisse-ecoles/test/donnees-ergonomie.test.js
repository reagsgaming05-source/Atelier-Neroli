/*
 * L'espace « Données », vu par la personne qui s'en sert : ce qu'elle écrit doit rester, ce que
 * l'écran promet doit être vrai, et la même chose ne doit pas finir écrite de deux façons.
 *
 * Chaque test part d'un constat de l'analyse d'ergonomie (Espace donné#1 à #14) : décrire un compte
 * intégré, « remettre » qui faisait disparaître, doublons « 7P2 » / « 7P/2 », sens d'un type
 * contredit par la fiche, sigles rangés parmi les classes, forme des noms de personnes.
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
const ok = (r) => { assert.ok(r.ok, r.message); return r.carnet; };

/* ---------------- Des classes qui n'en sont pas (Espace donné#12) ---------------- */

test('les classes intégrées portent toutes un degré', () => {
  const sans = V.classTokens.filter((x) => !C.vraisemblable('classes', x));
  assert.deepEqual(sans, [], `pas des classes : ${sans.join(', ')}`);
  assert.ok(V.classTokens.includes('7P/2') && V.classTokens.includes('9S'));
});

test('un sigle lu dans un libellé n\'est pas proposé comme classe', () => {
  // l'apprentissage range « USB » parmi les classes (pour ne pas le corriger comme un mot)
  const appris = P.mergeVocabulary(VOCAB(), P.learnVocabulary([
    { libelle: 'FRAIS - clé USB - 7P/2 - A. Berger', compte: '51000.3185.00', credit: 12 },
  ]));
  assert.ok(appris.classTokens.includes('USB'), 'le vocabulaire appris le contient bien');
  const liste = C.appliquer(appris, C.vide()).classTokens;
  assert.ok(!liste.includes('USB'), 'mais la liste des classes ne doit pas le proposer');
  assert.ok(liste.includes('7P/2'));
});

test('une classe sans degré ajoutée à la main reste proposée', () => {
  const c = ok(C.ajouter(C.vide(), 'classes', 'Accueil'));
  assert.ok(C.appliquer(VOCAB(), c).classTokens.includes('ACCUEIL'));
});

test('la correction des classes lues sur les pièces marche toujours', () => {
  // les sigles retirés ne servaient pas à corriger : seules les classes à chiffres y servent
  const idx = P.buildIndex(C.appliquer(VOCAB(), C.vide()));
  assert.equal(P.correctClassToken('98', idx), '9S');
});
