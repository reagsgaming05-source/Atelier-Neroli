/*
 * La pile de fiches scannées, découpée et rendue à ses pièces.
 *
 * Le cas courant : on imprime dix fiches, l'enseignant-e signe, on empile, on scanne tout en un
 * passage. Ce qui doit tenir, c'est qu'aucune page ne se retrouve dans le mauvais document et
 * qu'aucune pièce ne reçoive le justificatif d'une autre — c'est le genre d'erreur qu'on ne voit
 * qu'au contrôle des comptes, des mois plus tard.
 *
 * Noms fictifs : A. Berger, Ch. Dupraz, T. Morel, L. Duvernay, S. Monod.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/pile.js');
const R = require('../src/registre.js');

const m = (annee, id) => ({ annee, id });

/* ---------------- Découper ---------------- */

test('une pile de fiches sans justificatif : une page, une pièce', () => {
  const docs = L.decouper([m(2026, 'a'), m(2026, 'b'), m(2026, 'c')]);
  assert.equal(docs.length, 3);
  assert.deepEqual(docs.map((d) => d.pages), [[0], [1], [2]]);
  assert.deepEqual(docs.map((d) => d.marque.id), ['a', 'b', 'c']);
});

test('chaque fiche emporte les pages qui la suivent : ce sont ses justificatifs', () => {
  // fiche A + 2 tickets, fiche B seule, fiche C + 1 facture
  const docs = L.decouper([m(2026, 'a'), null, null, m(2026, 'b'), m(2026, 'c'), null]);
  assert.deepEqual(docs.map((d) => d.pages), [[0, 1, 2], [3], [4, 5]]);
  assert.deepEqual(docs.map((d) => [d.premiere, d.derniere]), [[0, 2], [3, 3], [4, 5]]);
});

test('les pages d\'avant la première marque font un document à part', () => {
  // une pile posée à l'envers, ou une vieille pièce sans code glissée en tête
  const docs = L.decouper([null, null, m(2026, 'a'), null]);
  assert.equal(docs.length, 2);
  assert.equal(docs[0].marque, null);
  assert.deepEqual(docs[0].pages, [0, 1]);
  assert.deepEqual(docs[1].pages, [2, 3]);
});

test('une pile sans aucune marque reste un seul document, pas trente', () => {
  const docs = L.decouper([null, null, null, null]);
  assert.equal(docs.length, 1);
  assert.equal(docs[0].marque, null);
  assert.deepEqual(docs[0].pages, [0, 1, 2, 3]);
});

test('une pile vide ne fabrique pas de document', () => {
  assert.deepEqual(L.decouper([]), []);
  assert.deepEqual(L.decouper(null), []);
  assert.deepEqual(L.decouper(undefined), []);
});

test('une marque abîmée ne coupe pas la pile au mauvais endroit', () => {
  // { annee, id } incomplet : ce n'est pas une marque, la page appartient au document en cours
  const docs = L.decouper([m(2026, 'a'), { annee: 2026 }, { id: 'b' }, {}, null]);
  assert.equal(docs.length, 1);
  assert.deepEqual(docs[0].pages, [0, 1, 2, 3, 4]);
});

test('la même pièce deux fois dans la pile est signalée, pas jointe deux fois', () => {
  // la feuille est passée deux fois dans le chargeur, ou les deux exemplaires sont dans le tas
  const docs = L.decouper([m(2026, 'a'), m(2026, 'b'), m(2026, 'a')]);
  assert.deepEqual(docs.map((d) => d.doublon), [false, false, true]);
});

test('deux pièces de même identifiant mais d\'années différentes ne sont pas un doublon', () => {
  const docs = L.decouper([m(2025, 'a'), m(2026, 'a')]);
  assert.deepEqual(docs.map((d) => d.doublon), [false, false]);
});

/* ---------------- Rendre chaque document à sa pièce ---------------- */

function registre(annee, combien) {
  const reg = R.emptyRegister(annee, { openingAmount: 0 });
  const pieces = [];
  for (let i = 1; i <= combien; i++) {
    const p = R.newPiece(reg);
    Object.assign(p, { no: i, date: `${annee}-03-0${i}`, type: 'FRAIS', detail: 'piles', personne: 'A. Berger', compte: '51000.3185.00', montant: 10 + i, sens: 'credit' });
    p.libelle = R.composeLibelle(p);
    R.upsertPiece(reg, p);
    pieces.push(p);
  }
  return { reg, pieces };
}

/** Le carnet des pièces connues de ce poste, toutes années confondues. */
function connues(...registres) {
  const map = new Map();
  for (const { reg } of registres) for (const p of reg.pieces) map.set(`${reg.annee}:${p.id}`, p);
  return map;
}

test('une marque connue désigne exactement sa pièce', () => {
  const r = registre(2026, 3);
  const docs = L.classer(L.decouper([m(2026, r.pieces[1].id)]), connues(r));
  assert.equal(docs[0].etat, 'trouvee');
  assert.equal(docs[0].piece.id, r.pieces[1].id);
  assert.equal(docs[0].piece.no, 2);
});

test('une pile entière retourne à ses pièces, dans le désordre s\'il le faut', () => {
  const r = registre(2026, 4);
  // on a empilé les fiches dans un ordre quelconque
  const ordre = [2, 0, 3, 1];
  const marques = [];
  for (const i of ordre) { marques.push(m(2026, r.pieces[i].id)); marques.push(null); }
  const docs = L.classer(L.decouper(marques), connues(r));
  assert.deepEqual(docs.map((d) => d.piece.no), ordre.map((i) => i + 1));
  assert.ok(docs.every((d) => d.etat === 'trouvee'));
});

test('des pièces de deux années dans la même pile vont chacune dans la sienne', () => {
  const a = registre(2025, 2);
  const b = registre(2026, 2);
  const docs = L.classer(L.decouper([m(2025, a.pieces[0].id), m(2026, b.pieces[1].id)]), connues(a, b));
  assert.deepEqual(docs.map((d) => d.etat), ['trouvee', 'trouvee']);
  assert.equal(docs[0].piece.id, a.pieces[0].id);
  assert.equal(docs[1].piece.id, b.pieces[1].id);
});

test('une marque lisible dont la pièce est introuvable ne s\'attache à personne', () => {
  // registre d'une autre année jamais ouvert sur ce poste, ou pièce supprimée depuis l'impression
  const r = registre(2026, 2);
  const docs = L.classer(L.decouper([m(2026, 'pjamaisvue'), m(2019, r.pieces[0].id)]), connues(r));
  assert.deepEqual(docs.map((d) => d.etat), ['inconnue', 'inconnue']);
  assert.ok(docs.every((d) => d.piece === null));
});

test('un document sans marque est présenté tel quel, pas rattaché au hasard', () => {
  const r = registre(2026, 2);
  const docs = L.classer(L.decouper([null, null]), connues(r));
  assert.equal(docs[0].etat, 'sans-marque');
  assert.equal(docs[0].piece, null);
});

test('le second exemplaire d\'une pièce est marqué doublon, le premier reste bon', () => {
  const r = registre(2026, 2);
  const id = r.pieces[0].id;
  const docs = L.classer(L.decouper([m(2026, id), m(2026, id)]), connues(r));
  assert.deepEqual(docs.map((d) => d.etat), ['trouvee', 'doublon']);
  // le doublon connaît quand même sa pièce : c'est à l'écran de proposer de remplacer
  assert.equal(docs[1].piece.id, id);
});

test('un carnet de pièces cherché par fonction marche aussi', () => {
  const r = registre(2026, 1);
  const docs = L.classer(L.decouper([m(2026, r.pieces[0].id)]), (annee, id) => (annee === 2026 ? r.reg.pieces.find((p) => p.id === id) : null));
  assert.equal(docs[0].etat, 'trouvee');
});

test('une recherche qui échoue ne fait pas tomber le classement', () => {
  const docs = L.classer(L.decouper([m(2026, 'a')]), () => { throw new Error('registre illisible'); });
  assert.equal(docs[0].etat, 'inconnue');
});

/* ---------------- Ce que la pile contient, en une phrase ---------------- */

test('le résumé compte ce qu\'il y a à faire', () => {
  const r = registre(2026, 2);
  const ids = r.pieces.map((p) => p.id);
  const docs = L.classer(
    L.decouper([null, m(2026, ids[0]), null, m(2026, ids[1]), m(2026, ids[0]), m(2026, 'pinconnue')]),
    connues(r),
  );
  assert.deepEqual(L.resume(docs), { total: 5, trouvees: 2, inconnues: 1, doublons: 1, sansMarque: 1, pages: 6 });
});

test('le justificatif porte un nom stable : rescanner remplace, n\'accumule pas', () => {
  assert.equal(L.NOM_SIGNEE, 'piece-signee.pdf');
  assert.doesNotMatch(L.NOM_SIGNEE, /\d{4}|\d{10}/, 'un nom horodaté empilerait dix copies de la même pièce');
});

/* ---------------- Aucune page ne se perd, aucune ne passe deux fois ---------------- */

test('la découpe conserve toutes les pages, chacune une seule fois', () => {
  const graine = (n) => (n * 2654435761) % 4294967296;
  for (let essai = 0; essai < 200; essai++) {
    const n = 1 + (graine(essai) % 40);
    const marques = [];
    for (let i = 0; i < n; i++) {
      const x = graine(essai * 97 + i) % 100;
      marques.push(x < 35 ? m(2026, `p${x}`) : null);
    }
    const docs = L.decouper(marques);
    const pages = docs.flatMap((d) => d.pages);
    assert.deepEqual(pages, Array.from({ length: n }, (_, i) => i), `essai ${essai} : pages perdues ou doublées`);
    // et chaque document est une tranche continue
    for (const d of docs) {
      assert.deepEqual(d.pages, Array.from({ length: d.derniere - d.premiere + 1 }, (_, i) => d.premiere + i));
    }
  }
});
