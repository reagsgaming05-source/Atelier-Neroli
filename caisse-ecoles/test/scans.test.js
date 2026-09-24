/*
 * Pièces scannées et boîte de réception : ce que la lecture d'un scan fait au journal, d'un jour
 * à l'autre, et ce que la découpe d'une pile dit de ce qu'elle n'a pas pu reconnaître.
 *
 * Aucune donnée réelle : des octets fabriqués pour l'occasion, des noms fictifs.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const R = require('../src/registre.js');
const L = require('../src/lot.js');
const Pile = require('../src/pile.js');
const V = require('../desktop/veille.js');
const { pdfExemple, ecrireTronque, dossierTemporaire, horlogeFactice, pause } = require('./aide-copieur.js');

const reg2026 = () => R.emptyRegister(2026, { openingAmount: 1000, openingDate: '2026-01-01' });
const octets = (texte) => new TextEncoder().encode(`%PDF-1.4 ${texte} %%EOF`);

/** Trois fiches lues dans un fichier : n° de départ, montants au crédit. */
function fiches(depart, montants) {
  return montants.map((m, i) => ({
    no: depart + i, date: `2026-03-0${i + 1}`, compte: '51000.3662.50',
    libelle: `REMBOURSEMENT - Collation ${depart + i} - A. Berger`, debit: null, credit: m, warnings: [],
  }));
}

/**
 * Ce que fait l'écran à l'ouverture d'un fichier : chaque page porte le n° d'ordre du fichier dans
 * la séance (docId, qui repart à 1 à chaque démarrage) et l'empreinte de son contenu. La clé d'une
 * écriture est tirée de la page, exactement comme dans app.js (reparse → L.cleDePage).
 */
function lire(bytes, lues, docId) {
  const page = (n) => ({ docId: docId == null ? 1 : docId, empreinte: L.empreinte(bytes), pageInDoc: n });
  return lues.map((e, i) => Object.assign({}, e, { scanKey: L.cleDePage(page(i + 1), '') }));
}

/* ---------------- La clé d'une pièce lue ---------------- */

test('l\'empreinte d\'un fichier ne dépend que de son contenu', () => {
  const a = octets('Pce 01 à 33');
  assert.equal(L.empreinte(a), L.empreinte(Uint8Array.from(a)), 'mêmes octets, autre empreinte');
  assert.notEqual(L.empreinte(a), L.empreinte(octets('Pce 34 à 60')));
  assert.notEqual(L.empreinte(a), L.empreinte(a.slice(0, a.length - 1)), 'un octet de moins ne change rien');
  assert.match(L.empreinte(a), /^f[0-9a-f]{16}$/);
  // formule figée : elle est écrite dans les registres
  assert.equal(L.empreinte(new Uint8Array([1, 2, 3])), 'f66f3f60e9a1763da');
});

test('la clé d\'une page suit le fichier, pas son rang dans la séance', () => {
  const emp = L.empreinte(octets('A'));
  assert.equal(L.cleDePage({ docId: 1, empreinte: emp, pageInDoc: 2 }, ''), L.cleDePage({ docId: 7, empreinte: emp, pageInDoc: 2 }, ''));
  assert.notEqual(L.cleDePage({ docId: 1, empreinte: emp, pageInDoc: 2 }, 1), L.cleDePage({ docId: 1, empreinte: emp, pageInDoc: 2 }, 2), 'deux formulaires sur une page');
  assert.equal(L.cleDePage({ docId: 'essai', pageInDoc: 1 }, ''), 'essai:1:', 'sans fichier derrière elle (essais), le n° d\'ordre sert encore');
});

/* ---------------- Le défaut bloquant : un 2e fichier lu un autre jour ---------------- */

test('un 2e fichier lu un autre jour n\'écrase pas les pièces encore « à vérifier » du 1er', () => {
  const reg = reg2026();
  const A = octets('Pce 01 à 03'); const B = octets('Pce 04 à 06');
  // jour 1 : « Pce 01 à 03.pdf », premier fichier de la séance
  L.verser(reg, lire(A, fiches(1, [29.7, 552, 1200])));
  // jour 2 : l'application a été fermée ; « Pce 04 à 06.pdf » est de nouveau le premier fichier
  L.verser(reg, lire(B, fiches(4, [400, 18.5, 64.2])));
  assert.deepEqual(reg.pieces.map((p) => p.no), [1, 2, 3, 4, 5, 6], 'les pièces du premier fichier ont été remplacées');
  assert.deepEqual(reg.pieces.slice(0, 3).map((p) => p.montant), [29.7, 552, 1200]);
  assert.equal(R.pendingPieces(reg).length, 6);
});

test('un 2e fichier lu un autre jour entre au journal même si le 1er a été vérifié', () => {
  const reg = reg2026();
  L.verser(reg, lire(octets('Pce 01 à 03'), fiches(1, [29.7, 552, 1200])));
  R.markVerified(reg, reg.pieces.map((p) => p.id));
  const res = L.verser(reg, lire(octets('Pce 04 à 06'), fiches(4, [400, 18.5, 64.2])));
  assert.equal(res.ajoutees.length, 3, 'le second fichier n\'est jamais entré au journal');
  assert.deepEqual(reg.pieces.map((p) => p.no), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(reg.pieces.map((p) => p.aVerifier), [false, false, false, true, true, true]);
});

test('relire le même fichier un autre jour met à jour ses pièces, sans en créer', () => {
  const reg = reg2026();
  const A = octets('Pce 01 à 03');
  L.verser(reg, lire(A, fiches(1, [29.7, 552, 1200])));
  const ids = reg.pieces.map((p) => p.id);
  // relu en 3e position dans une autre séance, et l'OCR corrige un montant
  const res = L.verser(reg, lire(A, fiches(1, [29.7, 552, 1250]), 3));
  assert.deepEqual(reg.pieces.map((p) => p.id), ids);
  assert.equal(res.ajoutees.length, 0);
  assert.equal(reg.pieces[2].montant, 1250);
});

/* ---------------- Les registres écrits avant les clés stables ---------------- */

/** Un registre d'avant : les pièces portent « n° du fichier dans la séance : page : ». */
function registreAncien(depart, montants, verifiees) {
  const reg = reg2026();
  R.syncScanBatch(reg, fiches(depart, montants).map((e, i) => Object.assign({}, e, { scanKey: `1:${i + 1}:` })));
  if (verifiees) R.markVerified(reg, reg.pieces.map((p) => p.id));
  return reg;
}

test('un ancien registre : relire son fichier reprend ses pièces, sans doublon ni perte', () => {
  const reg = registreAncien(1, [29.7, 552, 1200]);
  const ids = reg.pieces.map((p) => p.id);
  const res = L.verser(reg, lire(octets('Pce 01 à 03'), fiches(1, [29.7, 552, 1200])));
  assert.equal(reg.pieces.length, 3, 'les pièces d\'un ancien registre ont été doublées');
  assert.equal(res.reprises.length, 3);
  assert.deepEqual(reg.pieces.map((p) => p.id), ids, 'les pièces ont changé d\'identité');
  assert.ok(reg.pieces.every((p) => !L.estAncienne(p.scanKey)), 'les anciennes clés sont restées');
  // et elles se retirent ensuite avec leur fichier
  assert.equal(L.retirerFichier(reg, L.empreinte(octets('Pce 01 à 03'))).length, 3);
});

test('un ancien registre vérifié : la relecture ne réécrit rien et n\'ajoute rien', () => {
  const reg = registreAncien(1, [29.7, 552, 1200], true);
  const res = L.verser(reg, lire(octets('Pce 01 à 03'), fiches(1, [29.7, 552, 999])));
  assert.equal(reg.pieces.length, 3);
  assert.equal(reg.pieces[2].montant, 1200, 'une pièce vérifiée a été réécrite par une relecture');
  assert.equal(res.ajoutees.length, 0);
});

test('un ancien registre déjà faussé (le 2e fichier avait pris les clés du 1er) : rien ne se double', () => {
  // le défaut avait laissé au journal les n° 4 à 6 sous les clés 1:1:, 1:2:, 1:3:
  const reg = registreAncien(4, [400, 18.5, 64.2]);
  L.verser(reg, lire(octets('Pce 01 à 03'), fiches(1, [29.7, 552, 1200])));
  L.verser(reg, lire(octets('Pce 04 à 06'), fiches(4, [400, 18.5, 64.2])));
  assert.deepEqual(reg.pieces.map((p) => p.no), [1, 2, 3, 4, 5, 6]);
});

test('la même fiche lue dans un autre fichier n\'entre pas deux fois', () => {
  const reg = reg2026();
  L.verser(reg, lire(octets('Pce 01 à 03'), fiches(1, [29.7, 552, 1200])));
  // la même pile rescannée : autres octets, mêmes fiches
  const res = L.verser(reg, lire(octets('Pce 01 à 03 (rescan)'), fiches(1, [29.7, 552, 1200])));
  assert.equal(reg.pieces.length, 3, 'une fiche rescannée a été ajoutée une seconde fois');
  assert.equal(res.ailleurs.length, 3);
  const b = L.bilanDuLot(reg, lire(octets('Pce 01 à 03 (rescan)'), fiches(1, [29.7, 552, 1200])));
  assert.deepEqual(b.dejaLa, [1, 2, 3]);
});

/* ---------------- « Vérifié » : une seule vérification ---------------- */

test('cocher « Vérifié » dans Pièces scannées vérifie la pièce au journal, et décocher la remet', () => {
  const reg = reg2026();
  const lues = lire(octets('lot'), fiches(1, [29.7, 552]));
  L.verser(reg, lues);
  let res = L.verser(reg, lues.map((e) => Object.assign({}, e, { verifie: true })));
  assert.equal(res.verifiees.length, 2);
  assert.equal(R.pendingPieces(reg).length, 0, '« Vérifié » ne comptait pas au journal');
  res = L.verser(reg, [Object.assign({}, lues[0], { verifie: false, warnings: ['Montant à vérifier'] })]);
  assert.equal(res.remisesAVerifier.length, 1);
  assert.equal(reg.pieces[0].aVerifier, true);
  assert.deepEqual(reg.pieces[0].doutes, ['Montant à vérifier']);
});

test('sans geste de la personne, la lecture ne vérifie rien', () => {
  const reg = reg2026();
  const lues = lire(octets('lot'), fiches(1, [29.7]));
  L.verser(reg, lues);
  L.verser(reg, lues); // relecture (fin de l'OCR)
  assert.equal(R.pendingPieces(reg).length, 1);
});

test('une correction faite dans Pièces scannées arrive au journal, même sur une pièce vérifiée', () => {
  const reg = reg2026();
  const lues = lire(octets('lot'), fiches(1, [29.7]));
  L.verser(reg, lues);
  R.markVerified(reg, [reg.pieces[0].id]);
  // relue sans geste : on n'y touche pas
  L.verser(reg, [Object.assign({}, lues[0], { credit: 99 })]);
  assert.equal(reg.pieces[0].montant, 29.7);
  // corrigée à la main : elle passe, et la pièce reste vérifiée
  const res = L.verser(reg, [Object.assign({}, lues[0], { credit: 27.9, corrige: true })]);
  assert.equal(res.corrigees.length, 1, 'la correction n\'est pas arrivée au journal');
  assert.equal(reg.pieces[0].montant, 27.9);
  assert.equal(reg.pieces[0].aVerifier, false);
});

test('une pièce saisie à la main n\'est ni réécrite ni remise « à vérifier » par la lecture', () => {
  const reg = reg2026();
  const main = R.newPiece(reg);
  Object.assign(main, { no: 1, date: '2026-03-01', type: 'REMBOURSEMENT', detail: 'collation', personne: 'A. Berger', compte: '51000.3662.50', montant: 29.7, sens: 'credit' });
  main.libelle = R.composeLibelle(main);
  R.upsertPiece(reg, main);
  const lues = lire(octets('lot'), fiches(1, [29.7]));
  L.verser(reg, lues);
  const res = L.verser(reg, [Object.assign({}, lues[0], { credit: 31, corrige: true, verifie: false })]);
  assert.equal(res.nonCorrigees.length, 1);
  assert.equal(reg.pieces[0].montant, 29.7);
  assert.equal(reg.pieces[0].aVerifier, false);
  assert.equal(reg.pieces[0].source, 'saisie');
});

test('l\'écran suit le journal : pièce vérifiée dans la saisie, pièce supprimée du journal', () => {
  const reg = reg2026();
  const lues = lire(octets('lot'), fiches(1, [29.7, 552]));
  L.verser(reg, lues);
  const connues = new Set(lues.map((e) => e.scanKey));
  // vérifiée et corrigée dans la fiche de saisie
  R.markVerified(reg, [reg.pieces[0].id]);
  reg.pieces[0].montant = 29.9;
  // supprimée du journal
  R.removePiece(reg, reg.pieces[1].id);
  const r = L.accorder(reg, lues, connues);
  assert.equal(r.lignes.length, 1);
  assert.equal(r.lignes[0].verifiee, true);
  assert.equal(r.lignes[0].valeurs.credit, 29.9, 'l\'écran ne montre pas la pièce telle qu\'elle est au journal');
  assert.deepEqual(r.retirees.map((e) => e.no), [2]);
  // et le versement suivant ne la ressuscite pas
  const res = L.verser(reg, lues, { connues });
  assert.equal(res.ajoutees.length, 0, 'une pièce supprimée du journal y a été remise');
  assert.equal(reg.pieces.length, 1);
});

/* ---------------- Retirer un fichier ---------------- */

test('retirer un fichier retire ses pièces non vérifiées du journal, et seulement les siennes', () => {
  const reg = reg2026();
  const A = octets('A'); const B = octets('B');
  L.verser(reg, lire(A, fiches(1, [29.7, 552])));
  L.verser(reg, lire(B, fiches(3, [400, 18.5])));
  R.markVerified(reg, [reg.pieces.find((p) => p.no === 4).id]);
  const partis = L.retirerFichier(reg, L.empreinte(B));
  assert.deepEqual(partis.map((p) => p.no), [3]);
  assert.deepEqual(reg.pieces.map((p) => p.no), [1, 2, 4], 'la croix laissait les pièces du fichier au journal');
});

/* ---------------- Les totaux du lot ---------------- */

test('les totaux du lot s\'additionnent et ne comptent pas le lot comme « déjà là »', () => {
  const reg = reg2026();
  const main = R.newPiece(reg);
  Object.assign(main, { no: 9, date: '2026-02-01', type: 'RECETTE', detail: 'vente', personne: 'T. Morel', compte: '9206.101', montant: 50, sens: 'debit' });
  main.libelle = R.composeLibelle(main);
  R.upsertPiece(reg, main);
  const lues = lire(octets('lot'), [
    { no: 1, date: '2026-03-01', compte: '9206.101', libelle: 'RECETTE - Vente de fondues - T. Morel', debit: 552, credit: null, warnings: [] },
    { no: 2, date: '2026-03-02', compte: '51000.3662.50', libelle: 'REMBOURSEMENT - Collation - A. Berger', debit: null, credit: 29.7, warnings: [] },
    // la pièce saisie à la main, lue elle aussi
    { no: 9, date: '2026-02-01', compte: '9206.101', libelle: 'RECETTE - vente - T. Morel', debit: 50, credit: null, warnings: [] },
  ]);
  L.verser(reg, lues);
  const b = L.bilanDuLot(reg, lues);
  assert.equal(b.entrees, 552, 'les entrées du lot valaient 0.00');
  assert.equal(b.sorties, 29.7);
  assert.equal(b.avant, 1050);
  assert.equal(b.avec, R.journal(reg).end);
  assert.equal(Math.round((b.avant + b.entrees - b.sorties) * 100), Math.round(b.avec * 100));
  assert.deepEqual(b.pieces.map((p) => p.no), [1, 2]);
  assert.deepEqual(b.dejaLa, [9], 'les pièces versées par le lot étaient annoncées « déjà dans le registre »');
  assert.deepEqual(b.conflits, []);
});

test('un n° déjà au journal avec un autre montant est un conflit', () => {
  const reg = reg2026();
  L.verser(reg, lire(octets('A'), fiches(1, [29.7])));
  const autre = lire(octets('B'), fiches(1, [31]));
  L.verser(reg, autre);
  assert.deepEqual(L.bilanDuLot(reg, autre).conflits, [1]);
});

/* ---------------- La pile de la boîte de réception ---------------- */

const m = (annee, id) => ({ annee, id });

test('une fiche au code illisible ouvre son document au lieu d\'être collée à la pièce d\'avant', () => {
  // fiche 7, son ticket, fiche 8 au code couvert par une agrafe, fiche 9
  const docs = Pile.decouper([m(2026, 'p7'), null, null, m(2026, 'p9')], { fiches: [true, false, true, true] });
  assert.deepEqual(docs.map((d) => d.pages), [[0, 1], [2], [3]], 'la fiche 8 est devenue une page de la pièce 7');
  const classes = Pile.classer(docs, (a, id) => ({ id, no: Number(id.slice(1)) }));
  assert.deepEqual(classes.map((d) => d.etat), ['trouvee', 'code-illisible', 'trouvee']);
  const r = Pile.resume(classes);
  assert.equal(r.illisibles, 1);
  assert.equal(Pile.phrase(r), '2 pièces reconnues, 1 à regarder');
});

test('une pile posée à l\'envers est signalée', () => {
  // ticket B, fiche B, ticket A, fiche A : chaque ticket part avec la fiche d'avant
  const docs = Pile.classer(Pile.decouper([null, m(2026, 'b'), null, m(2026, 'a')]), (a, id) => ({ id, no: 1 }));
  assert.equal(Pile.resume(docs).ordreDouteux, true);
  // la même pile dans le bon ordre ne l'est pas
  const bon = Pile.classer(Pile.decouper([m(2026, 'a'), null, m(2026, 'b'), null]), (a, id) => ({ id, no: 1 }));
  assert.equal(Pile.resume(bon).ordreDouteux, false);
});

test('les pages d\'un document sont dites, pour qu\'une page de trop se voie', () => {
  assert.equal(Pile.pagesDe(1, true), '1 page');
  assert.equal(Pile.pagesDe(2, true), '2 pages : la fiche et 1 page jointe');
  assert.equal(Pile.pagesDe(3, true), '3 pages : la fiche et 2 pages jointes');
  assert.equal(Pile.pagesDe(3, false), '3 pages');
  assert.equal(Pile.phrase({ trouvees: 1, doublons: 1, inconnues: 1, sansMarque: 1, illisibles: 0 }), '1 pièce reconnue, 1 en double, 2 à regarder');
});

/* ---------------- Les scans en échec ---------------- */

test('un scan mis « à revoir » est nommé avec sa raison, et la veille dit quand elle a regardé', async () => {
  const d = dossierTemporaire('revoir-raison');
  try {
    const h = horlogeFactice();
    const v = V.creerVeille({
      dossiers: () => [{ chemin: d.chemin }], poste: 'POSTE-A', maintenant: h.maintenant, stabiliteMs: 0,
      traiter: async () => ({ ok: false, raison: 'aucune page lisible dans ce PDF' }),
    });
    fs.writeFileSync(d.fichier('illisible.pdf'), await pdfExemple(['page blanche']));
    for (let i = 0; i < 3; i++) { h.avancer(10000); await v.tour(); await pause(5); }
    const e = v.etat();
    assert.equal(e.revoir, 1);
    assert.equal(e.aRevoir.length, 1, 'l\'écran n\'avait qu\'un compteur, sans nom ni raison');
    assert.equal(e.aRevoir[0].nom, 'illisible.pdf');
    assert.equal(e.aRevoir[0].raison, 'aucune page lisible dans ce PDF');
    assert.equal(e.aRevoir[0].dossier, d.chemin);
    assert.equal(e.dernierTour, h.maintenant());
  } finally { d.jeter(); }
});

test('un PDF tronqué est nommé « à revoir » avec la raison du copieur interrompu', async () => {
  const d = dossierTemporaire('revoir-tronque');
  try {
    const h = horlogeFactice();
    const v = V.creerVeille({ dossiers: () => [{ chemin: d.chemin }], poste: 'POSTE-A', maintenant: h.maintenant, stabiliteMs: 0, patienceMs: 1000 });
    ecrireTronque(d.fichier('coupe.pdf'), await pdfExemple(['pièce 1']), 0.3);
    for (let i = 0; i < 4; i++) { h.avancer(10000); await v.tour(); await pause(5); }
    const e = v.etat();
    assert.equal(e.aRevoir.length, 1);
    assert.match(e.aRevoir[0].raison, /incomplet|tronqué/);
  } finally { d.jeter(); }
});
