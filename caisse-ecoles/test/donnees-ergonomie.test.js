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
const fs = require('fs');
const path = require('path');
const C = require('../src/carnet.js');
const R = require('../src/registre.js');
const P = require('../src/parser.js');
const V = require('../src/vocabulaire.js');

const VOCAB = () => P.mergeVocabulary(P.emptyVocabulary(), Object.assign({ persons: ['A. Berger', 'Ch. Dupraz'] }, V));
const ok = (r) => { assert.ok(r.ok, r.message); return r.carnet; };

/* ---------------- Décrire un compte, même intégré (Espace donné#1) ---------------- */

test('un compte intégré se décrit : le numéro reste, la description s\'affiche à côté', () => {
  assert.ok(V.accounts.includes('51000.3151.00'), 'le compte doit être dans la base intégrée');
  const c = ok(C.preciser(C.vide(), 'comptes', '51000.3151.00', { note: "Courses d'école et camps" }));
  assert.equal(C.noteDe(c, 'comptes', '51000.3151.00'), "Courses d'école et camps");
  assert.deepEqual(C.ajoutsDe(c, 'comptes'), [], 'décrire un compte intégré n\'en fait pas un ajout');
  assert.deepEqual(C.appliquer(VOCAB(), c).accounts, C.appliquer(VOCAB(), C.vide()).accounts, 'la liste des comptes ne change pas');
});

test('retaper un compte ajouté sans description ne fait pas perdre celle qu\'on avait écrite', () => {
  let c = ok(C.ajouter(C.vide(), 'comptes', '51000.3199.10', { note: 'Bibliothèque' }));
  c = ok(C.ajouter(c, 'comptes', '51000.3199.10', { note: '' }));
  assert.equal(C.noteDe(c, 'comptes', '51000.3199.10'), 'Bibliothèque');
  assert.equal(C.ajoutsDe(c, 'comptes').length, 1);
});

test('une description se change, et s\'efface quand on la vide exprès', () => {
  let c = ok(C.preciser(C.vide(), 'comptes', '51000.3151.00', { note: 'Camps' }));
  const r = C.preciser(c, 'comptes', '51000.3151.00', { note: 'Camps et courses' });
  assert.equal(r.avant.note, 'Camps', 'l\'ancienne description doit pouvoir être rappelée à l\'écran');
  c = ok(r);
  assert.equal(C.noteDe(c, 'comptes', '51000.3151.00'), 'Camps et courses');
  c = ok(C.preciser(c, 'comptes', '51000.3151.00', { note: '   ' }));
  assert.equal(C.noteDe(c, 'comptes', '51000.3151.00'), '');
  assert.equal(C.resume(c).total, 0, 'une description effacée ne laisse rien dans le carnet');
});

test('la description d\'un compte survit à son retrait, et revient quand on le remet', () => {
  let c = ok(C.preciser(C.vide(), 'comptes', '51000.3151.00', { note: 'Camps' }));
  c = ok(C.retirer(c, 'comptes', '51000.3151.00', { ailleurs: true }));
  c = ok(C.remettre(c, 'comptes', '51000.3151.00', { ailleurs: true }));
  assert.equal(C.noteDe(c, 'comptes', '51000.3151.00'), 'Camps');
});

test('les descriptions sont gardées d\'une ouverture à l\'autre', () => {
  let c = ok(C.preciser(C.vide(), 'comptes', '51000.3151.00', { note: 'Camps' }));
  c = ok(C.ajouter(c, 'comptes', '51000.3199.10', { note: 'Bibliothèque' }));
  const relu = C.parse(C.serialize(c));
  assert.deepEqual(relu, c);
  assert.equal(C.noteDe(relu, 'comptes', '51000.3151.00'), 'Camps');
});

test('un carnet enregistré avant les descriptions garde la note de ses comptes ajoutés', () => {
  const ancien = JSON.stringify({ version: 1, ajouts: { comptes: [{ valeur: '51000.3199.10', note: 'Bibliothèque' }], types: [{ valeur: 'COTISATION', sens: 'debit' }] }, retires: {} });
  const c = C.parse(ancien);
  assert.equal(C.noteDe(c, 'comptes', '51000.3199.10'), 'Bibliothèque');
  assert.equal(C.sensDeType(c, 'COTISATION'), 'debit');
  assert.deepEqual(C.ajoutsDe(c, 'comptes').map((x) => x.valeur), ['51000.3199.10']);
});

test('une copie des listes qui ne porte que des descriptions n\'est pas « vide »', () => {
  // « Remplacer par une copie » refuse un fichier sans rien de reconnaissable : une copie faite
  // pour garder ses descriptions de comptes doit pouvoir être reprise
  const c = ok(C.preciser(C.vide(), 'comptes', '51000.3151.00', { note: 'Camps' }));
  assert.ok(C.resume(C.parse(C.serialize(c))).total > 0);
});

/* ---------------- Retirer, remettre, supprimer (Espace donné#2) ---------------- */

test('supprimer un nom qu\'on avait ajouté ne le laisse pas traîner parmi les valeurs retirées', () => {
  // une faute de frappe ajoutée puis ôtée : elle n'a rien à « remettre »
  let c = ok(C.ajouter(C.vide(), 'personnes', 'Duvernay Laure'));
  const r = C.retirer(c, 'personnes', 'Duvernay Laure', { ailleurs: false });
  c = ok(r);
  assert.equal(r.supprime, true);
  assert.deepEqual(C.retiresDe(c, 'personnes'), []);
  assert.deepEqual(C.ajoutsDe(c, 'personnes'), []);
  assert.equal(C.resume(c).total, 0);
});

test('remettre un nom ajouté, retiré avant la correction, le propose vraiment de nouveau', () => {
  // le carnet d'un PC où l'ancien « × » avait ôté l'ajout et laissé une pastille « retirée » :
  // cliquer la pastille disait « de nouveau proposé » et le nom disparaissait pour de bon
  const ancien = C.parse(JSON.stringify({ ajouts: { personnes: ['T. Morel'] }, retires: { personnes: ['Duvernay Laure'] } }));
  const c = ok(C.remettre(ancien, 'personnes', 'Duvernay Laure', { ailleurs: false }));
  assert.ok(C.appliquer(VOCAB(), c).persons.includes('Duvernay Laure'), 'le nom remis doit être proposé');
  assert.deepEqual(C.retiresDe(c, 'personnes'), []);
});

test('un type ajouté, retiré puis remis garde le sens qu\'on lui avait donné', () => {
  let c = ok(C.ajouter(C.vide(), 'types', 'COTISATION', { sens: 'credit' }));
  // déjà employé par des pièces de l'année : il faut le marquer retiré, pas seulement l'ôter
  c = ok(C.retirer(c, 'types', 'COTISATION', { ailleurs: true }));
  assert.deepEqual(C.retiresDe(c, 'types'), ['COTISATION']);
  c = ok(C.remettre(c, 'types', 'COTISATION', { ailleurs: true }));
  assert.equal(C.sensDeType(c, 'COTISATION'), 'credit');
});

test('un ajout connu ailleurs reste retiré : il ne revient pas par l\'autre chemin', () => {
  let c = ok(C.ajouter(C.vide(), 'classes', '9S'));
  c = ok(C.retirer(c, 'classes', '9S', { ailleurs: true }));
  assert.ok(!C.appliquer(VOCAB(), c).classTokens.includes('9S'));
});

/* ---------------- La même chose écrite deux fois (Espace donné#4) ---------------- */

test('« 7P2 » et « 7P/02 » ressemblent à « 7P/2 »', () => {
  const classes = ['7P/1', '7P/2', '8P/2', '1-2P/01'];
  assert.deepEqual(C.semblables('classes', '7P2', classes), ['7P/2']);
  assert.deepEqual(C.semblables('classes', '7P/02', classes), ['7P/2']);
  assert.deepEqual(C.semblables('classes', '7p / 2', classes), [], 'la même écriture n\'est pas « semblable » : elle est déjà là');
  assert.deepEqual(C.semblables('classes', '1-2P/1', classes), ['1-2P/01']);
});

test('deux classes différentes ne sont pas confondues', () => {
  const classes = ['7P/1', '7P/2', '1-2P/01', '10VG/2'];
  assert.deepEqual(C.semblables('classes', '7P/3', classes), []);
  assert.deepEqual(C.semblables('classes', '7P/12', classes), []);
  assert.deepEqual(C.semblables('classes', '12P/1', classes), []);
  assert.deepEqual(C.semblables('classes', '1VG/2', classes), []);
});

test('« Duvernay Laure » ressemble à « L. Duvernay » : même nom de famille', () => {
  const noms = ['A. Berger', 'L. Duvernay', 'T. Morel'];
  assert.deepEqual(C.semblables('personnes', 'Duvernay Laure', noms), ['L. Duvernay']);
  assert.deepEqual(C.semblables('personnes', 'Laure DUVERNAY', noms), ['L. Duvernay']);
  assert.deepEqual(C.semblables('personnes', 'S. Monod', noms), []);
  assert.deepEqual(C.semblables('personnes', 'l. duvernay', noms), [], 'la même personne écrite en minuscules est déjà là');
});

test('un compte sans ses « .00 » ressemble au même compte complet', () => {
  assert.deepEqual(C.semblables('comptes', '51000.3662', ['51000.3662.00', '51000.3662.20']), ['51000.3662.00']);
  assert.deepEqual(C.semblables('comptes', '51000.3662.30', ['51000.3662.00', '51000.3662.20']), []);
});

test('un objet au pluriel ou sans accent ressemble à l\'objet existant', () => {
  assert.deepEqual(C.semblables('objets', 'Camps', P.OBJET_LIST), ['Camp']);
  assert.deepEqual(C.semblables('objets', 'course d ecole', P.OBJET_LIST), ["Course d'école"]);
  assert.deepEqual(C.semblables('objets', 'Sortie au musée', P.OBJET_LIST), []);
});

/* ---------------- Le sens d'un type que le mot fixe déjà (Espace donné#10) ---------------- */

test('le sens choisi pour SUBVENTION n\'est pas gardé : c\'est la règle des libellés qui s\'applique', () => {
  const fixe = R.sensFor('SUBVENTION');
  assert.equal(fixe, 'debit', 'SUBVENTION fait toujours entrer de l\'argent');
  const r = C.ajouter(C.vide(), 'types', 'SUBVENTION', { sens: 'credit', sensFixe: fixe });
  const c = ok(r);
  assert.equal(r.sensIgnore, true, 'l\'écran doit pouvoir dire que le choix ne compte pas');
  assert.equal(C.sensDeType(c, 'SUBVENTION'), null, 'aucun sens contraire à la règle ne doit être gardé');
  // ce que l'espace Données affiche est ce que la fiche appliquera
  assert.equal(C.sensApplique(c, 'SUBVENTION', fixe), 'debit');
});

test('un type nouveau dont le mot ne fixe rien garde le sens qu\'on lui donne', () => {
  const fixe = R.sensFor('COTISATION');
  assert.equal(fixe, null);
  const c = ok(C.ajouter(C.vide(), 'types', 'COTISATION', { sens: 'credit', sensFixe: fixe }));
  assert.equal(C.sensApplique(c, 'COTISATION', fixe), 'credit');
});

test('l\'exemple proposé pour un nouveau type est un mot dont on peut choisir le sens', () => {
  // la carte suggérait « SUBVENTION », justement un mot au sens imposé
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'donnees.js'), 'utf8');
  const bloc = src.slice(src.indexOf("genre: 'types'"));
  const m = /exemple:\s*'(?:ex\.\s*)?([^']+)'/.exec(bloc);
  assert.ok(m, 'exemple introuvable');
  assert.equal(R.sensFor(m[1]), null, `« ${m[1]} » a déjà un sens fixé par les libellés`);
});

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

/* ---------------- La forme d'une classe, d'un nom (Espace donné#4, #14) ---------------- */

test('un nom qui n\'a pas la forme « initiale, point, nom » est signalé', () => {
  const r = C.verifier('personnes', 'Duvernay Laure');
  assert.equal(r.ok, true, 'il est accepté : l\'application n\'a pas à décider qu\'un nom est faux');
  assert.match(r.avertissement || '', /initiale, point, nom/);
  for (const bon of ['L. Duvernay', 'Ch. Dupraz', 'T.-L. Morel', 'A. de Berger', 'S. Monod-Berger']) {
    assert.equal(C.verifier('personnes', bon).avertissement, undefined, `« ${bon} » a la bonne forme`);
  }
});

test('une classe qui n\'a pas la forme habituelle est signalée', () => {
  assert.match(C.verifier('classes', '7P2').avertissement || '', /forme habituelle/);
  for (const bon of ['7P/2', '9S', '10VG/1', '1-2P/01', '5-6P']) {
    assert.equal(C.verifier('classes', bon).avertissement, undefined, `« ${bon} » a la bonne forme`);
  }
});
