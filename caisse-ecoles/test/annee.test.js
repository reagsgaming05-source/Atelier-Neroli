/*
 * L'année de la caisse : le solde à nouveau qui suit l'année d'avant, ce qu'on propose au
 * démarrage (premier lancement, janvier), le comptage, les contrôles avant le fichier Excel,
 * la sauvegarde et la restauration, le relevé de caisse, et « Emporter » vers le serveur.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const R = require('../src/registre.js');
const AN = require('../src/annee.js');
const PDF = require('../src/pdfpiece.js');
const E = require('../desktop/emplacement.js');

/** Registre d'une année avec des pièces [no, date, montant, sens]. */
function registre(annee, ouverture, pieces) {
  const reg = R.emptyRegister(annee, { openingAmount: ouverture });
  for (const [no, date, montant, sens] of pieces || []) {
    const p = R.newPiece(reg);
    Object.assign(p, { no, date, montant, sens, type: sens === 'debit' ? 'RECETTE' : 'REMBOURSEMENT', compte: '51000.3662.00', personne: 'S. Monod', detail: 'matériel' });
    p.libelle = R.composeLibelle(p);
    R.upsertPiece(reg, p);
  }
  return reg;
}
const REG_2026 = () => registre(2026, 2062.2, [[1, '2026-03-03', 29.7, 'credit'], [2, '2026-03-07', 552, 'debit'], [3, '2026-05-12', 400, 'credit'], [4, '2026-06-18', 1200, 'credit']]);

/* ---------------- Solde à nouveau : l'année suivante suit ---------------- */

test('une pièce de décembre saisie après la création de 2027 : le solde à nouveau 2027 suit', () => {
  // Le cas relevé : 2027 créée à 984.50 ; une pièce du 18.12.2026 (85.40) arrive ensuite.
  const r2026 = REG_2026();
  const avant = R.journal(r2026).end;
  assert.equal(avant, 984.5);
  const r2027 = R.emptyRegister(2027, { openingAmount: avant });
  R.upsertPiece(r2026, Object.assign(R.newPiece(r2026), { no: 5, date: '2026-12-18', montant: 85.4, sens: 'credit', type: 'REMBOURSEMENT', compte: '51000.3112.00', personne: 'S. Monod' }));
  const apres = R.journal(r2026).end;
  assert.equal(apres, 899.1);
  assert.equal(AN.suivreSoldeFinal(r2027, avant, apres), 'suivi');
  assert.equal(r2027.opening.amount, 899.1, 'le solde à nouveau 2027 est resté figé sur l\'ancien solde final');
  assert.deepEqual(AN.comparerSoldes(r2027, r2026).egal, true);
});

test('un solde à nouveau réglé à la main n\'est pas remplacé en silence, et l\'écart se voit', () => {
  const r2026 = REG_2026();
  const r2027 = R.emptyRegister(2027, { openingAmount: 950 }); // repris d'un comptage, par exemple
  assert.equal(AN.suivreSoldeFinal(r2027, 984.5, 899.1), 'different');
  assert.equal(r2027.opening.amount, 950);
  const c = AN.comparerSoldes(r2027, r2026);
  assert.equal(c.egal, false);
  assert.equal(c.soldeFinal, 984.5);
  assert.equal(c.soldeANouveau, 950);
  assert.equal(c.precedente, 2026);
});

test('rien ne bouge quand le solde final ne change pas, ou qu\'il n\'y a pas d\'année suivante', () => {
  const r2027 = R.emptyRegister(2027, { openingAmount: 984.5 });
  assert.equal(AN.suivreSoldeFinal(r2027, 984.5, 984.5), 'rien');
  assert.equal(AN.suivreSoldeFinal(null, 984.5, 899.1), 'rien');
  assert.equal(AN.comparerSoldes(r2027, null), null);
});

test('l\'année d\'avant et l\'année d\'après sont les plus proches qui existent', () => {
  assert.equal(AN.anneePrecedente([2024, 2026, 2027], 2027), 2026);
  assert.equal(AN.anneePrecedente([2024, 2027], 2027), 2024);
  assert.equal(AN.anneePrecedente([2027], 2027), null);
  assert.equal(AN.anneeSuivante([2025, 2026, 2028], 2026), 2028);
  assert.equal(AN.anneeSuivante([2026], 2026), null);
});

/* ---------------- Démarrage : premier lancement, janvier ---------------- */

test('en janvier, la nouvelle année est proposée au lieu de rouvrir l\'ancienne sans rien dire', () => {
  const d = AN.demarrage([2025, 2026], '2027-01-12', null);
  assert.equal(d.ouvrir, 2026, 'les pièces de décembre arrivent encore : on rouvre la dernière');
  assert.equal(d.proposer, 2027);
  assert.equal(d.premierLancement, false);
  // l'année du jour existe : rien à proposer
  assert.equal(AN.demarrage([2026, 2027], '2027-01-12', 2026).proposer, null);
  assert.equal(AN.demarrage([2026, 2027], '2027-01-12', 2026).ouvrir, 2026);
});

test('premier lancement : l\'année du jour, marquée comme premier lancement', () => {
  const d = AN.demarrage([], '2026-09-24', null);
  assert.deepEqual(d, { ouvrir: 2026, proposer: null, premierLancement: true });
});

test('un registre vierge demande d\'où part la caisse ; dès qu\'il y a quelque chose, plus', () => {
  const reg = R.emptyRegister(2026);
  assert.equal(AN.registreVierge(reg), true);
  assert.equal(AN.registreVierge(R.emptyRegister(2026, { openingAmount: 2062.2 })), false);
  assert.equal(AN.registreVierge(REG_2026()), false);
  const compte = R.emptyRegister(2026);
  R.upsertCount(compte, { date: '2026-02-01', counts: { 100: 1 } });
  assert.equal(AN.registreVierge(compte), false);
});

test('dans une année passée, la date proposée est le 31 décembre, pas le 1er janvier', () => {
  // Au 01.01.2026, le comptage de clôture se comparait au solde d'ouverture : faux écart de toute l'année.
  assert.equal(AN.dateProposee(2026, '2027-01-12'), '2026-12-31');
  assert.equal(AN.dateProposee(2027, '2026-09-24'), '2027-01-01');
  assert.equal(AN.dateProposee(2026, '2026-09-24'), '2026-09-24');
});

test('la fiche d\'une pièce propose aussi le 31 décembre dans une année passée', () => {
  const reg = R.emptyRegister(2000); // année forcément passée
  assert.equal(R.newPiece(reg).date, '2000-12-31');
  assert.equal(R.newPiece(R.emptyRegister(2099)).date, '2099-01-01');
  assert.equal(R.newPiece(R.emptyRegister(new Date().getFullYear())).date, R.today());
});

/* ---------------- Comptage ---------------- */

test('avant tout comptage, pas d\'écart — donc pas d\'alarme « il manque de l\'argent »', () => {
  assert.deepEqual(AN.etatEcart({}, 0, 1784.5), { etat: 'vide', ecart: null });
  assert.deepEqual(AN.etatEcart({ 100: 0 }, 0, 1784.5), { etat: 'vide', ecart: null });
  assert.deepEqual(AN.etatEcart({ 200: 4 }, 800, 1784.5), { etat: 'moins', ecart: -984.5 });
  assert.equal(AN.etatEcart({ 200: 4 }, 800, 800).etat, 'juste');
  assert.equal(AN.etatEcart({ 200: 4 }, 800, 700).etat, 'plus');
});

test('un comptage enregistré puis un autre : deux comptages gardés, pas un seul', () => {
  // Après un enregistrement, le formulaire repart d'un comptage neuf (pas « en correction »).
  assert.equal(AN.modeEnregistrement(false, null, '2026-10-30'), 'nouveau');
  const reg = R.emptyRegister(2026);
  const a = R.upsertCount(reg, { id: undefined, date: '2026-09-24', counts: { 200: 4, 100: 1, 50: 1 } });
  const b = R.upsertCount(reg, { id: undefined, date: '2026-10-30', counts: { 200: 4, 100: 1, 50: 1, 10: 3 } });
  assert.notEqual(a.id, b.id);
  assert.equal(reg.comptages.length, 2);
});

test('corriger un comptage en changeant sa date : la question est posée', () => {
  assert.equal(AN.modeEnregistrement(true, '2026-09-24', '2026-10-30'), 'demander');
  assert.equal(AN.modeEnregistrement(true, '2026-09-24', '2026-09-24'), 'corriger');
});

/* ---------------- Avant le fichier Excel de l'année ---------------- */

test('avant le fichier Excel : pièces incomplètes et ce qui leur manque, trous, scans à vérifier, écart de caisse', () => {
  const reg = registre(2026, 1000, [[1, '2026-03-03', 29.7, 'credit'], [2, '2026-03-07', 552, 'debit'], [4, '2026-05-12', 40, 'credit']]);
  reg.pieces[1].compte = ''; // n° 2 : compte manquant
  reg.pieces[2].aVerifier = true; // n° 4 : lue sur un scan
  R.upsertCount(reg, { date: '2026-06-30', counts: { 1000: 1, 200: 2, 50: 1, 2: 1, 0.2: 1, 0.1: 1 } }); // 1452.30 au lieu de 1482.30
  const l = AN.controlesAvantExcel(reg);
  const tout = l.join('\n');
  assert.match(tout, /n° 2 incomplète : .*compte/i);
  assert.match(tout, /numéro manquant.*n° 3/);
  assert.match(tout, /lue sur un scan.*n° 4/);
  assert.match(tout, /30\.06\.2026.*− 30\.00/);
  assert.deepEqual(AN.controlesAvantExcel(registre(2026, 0, [[1, '2026-03-03', 29.7, 'credit']])), [], 'un registre en ordre ne demande rien');
});

/* ---------------- Sauvegarde ---------------- */

test('la sauvegarde contient les justificatifs, et se relit à l\'identique', () => {
  const reg = REG_2026();
  const ticket = new Uint8Array(70000).map((_, i) => (i * 31) % 256); // plus grand qu'une tranche base64
  const texte = AN.empaqueter(reg, [{ piece: reg.pieces[0].id, nom: 'ticket.jpg', octets: ticket }], '2026-09-12T10:00:00.000Z');
  const relu = AN.deballer(texte);
  assert.equal(relu.reg.pieces.length, 4);
  assert.equal(relu.faiteLe, '2026-09-12T10:00:00.000Z');
  assert.equal(relu.fichiers.length, 1);
  assert.equal(relu.fichiers[0].piece, reg.pieces[0].id);
  assert.deepEqual(Array.from(relu.fichiers[0].octets), Array.from(ticket));
});

test('une sauvegarde reste lisible par une version plus ancienne, et une ancienne sauvegarde par celle-ci', () => {
  const reg = REG_2026();
  const neuve = AN.empaqueter(reg, [{ piece: reg.pieces[0].id, nom: 'ticket.pdf', octets: new Uint8Array([37, 80, 68, 70]) }]);
  assert.equal(R.parse(neuve).pieces.length, 4, 'l\'ancienne restauration (R.parse) doit encore l\'ouvrir');
  const ancienne = AN.deballer(R.serialize(reg));
  assert.equal(ancienne.reg.pieces.length, 4);
  assert.deepEqual(ancienne.fichiers, []);
  assert.equal(AN.deballer('pas du JSON'), null);
  assert.equal(AN.deballer('{"annee":1800}'), null);
});

/* ---------------- Restauration ---------------- */

test('restaurer une sauvegarde ancienne : les pièces saisies depuis sont nommées avant d\'être perdues', () => {
  const sauvegarde = REG_2026();
  const actuel = JSON.parse(R.serialize(sauvegarde));
  const reg = R.normalizeRegister(actuel);
  const mk = (no, date, montant, sens) => R.upsertPiece(reg, Object.assign(R.newPiece(reg), { no, date, montant, sens, type: 'RECETTE', compte: '9206.101', personne: 'T. Morel' }));
  mk(5, '2026-09-01', 310, 'debit');
  mk(6, '2026-09-10', 22.5, 'credit');
  reg.pieces.find((p) => p.no === 3).montant = 410; // corrigée depuis
  R.upsertCount(reg, { date: '2026-09-20', counts: { 100: 9 } });
  const b = AN.bilanRestauration(reg, sauvegarde);
  assert.deepEqual(b.perdues.map((p) => p.no), [5, 6]);
  assert.deepEqual(b.changees.map((p) => p.no), [3]);
  assert.equal(b.comptagesPerdus.length, 1);
  assert.equal(b.actuel.pieces, 6);
  assert.equal(b.sauvegarde.pieces, 4);
  const q = AN.questionRestauration(b, { anneeOuverte: 2027, partage: true, copie: true, dateSauvegarde: '2026-09-12', justificatifs: 3 });
  assert.match(q, /Journal 2026 actuel : 6 pièces/);
  assert.match(q, /Sauvegarde : 4 pièces.*du 12\.09\.2026.*3 justificatifs/);
  assert.match(q, /PERDUES : les 2 pièces n° 5 et 6/);
  assert.match(q, /n° 3/);
  assert.match(q, /comptage.*20\.09\.2026/i);
  assert.match(q, /journal 2026 qui est remplacé, pas celui de l'année ouverte \(2027\)/);
  assert.match(q, /tous les postes verront ce journal/);
  assert.match(q, /copie de sécurité/);
  assert.match(q, /\?$/, 'la question finit par une question, à laquelle OK et Annuler répondent');
});

test('restaurer une sauvegarde qui contient tout : on dit que rien ne sera perdu', () => {
  const reg = REG_2026();
  const b = AN.bilanRestauration(reg, R.normalizeRegister(JSON.parse(R.serialize(reg))));
  assert.equal(b.rienNeSePerd, true);
  assert.match(AN.questionRestauration(b, { copie: true }), /Rien ne sera perdu/);
  // une année qui n'existe pas encore sur ce poste
  const neuve = AN.bilanRestauration(null, reg);
  assert.match(AN.questionRestauration(neuve, {}), /n'existe pas encore sur ce poste/);
});

test('une sauvegarde venue d\'un autre poste (autres identifiants) : les mêmes pièces se reconnaissent', () => {
  const a = REG_2026();
  const b = R.normalizeRegister(JSON.parse(R.serialize(a)));
  for (const p of b.pieces) p.id = `autre-${p.no}`;
  const bilan = AN.bilanRestauration(a, b);
  assert.deepEqual(bilan.perdues, []);
  assert.deepEqual(bilan.retrouvees, []);
});

test('la copie de sécurité porte un nom qu\'on reconnaît', () => {
  assert.equal(AN.nomCopieSecurite(2026, new Date(2026, 8, 24, 10, 32)), 'Registre caisse 2026 avant restauration du 24.09.2026 10h32.json');
});

/* ---------------- Relevé de caisse ---------------- */

async function elements(bytes) {
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, verbosity: 0 }).promise;
  const c = await (await doc.getPage(1)).getTextContent();
  return c.items.filter((i) => i.str.trim()).map((i) => ({ t: i.str, y: i.transform[5], taille: Math.abs(i.transform[0]) }));
}
const COUNTS = { 200: 3, 100: 7, 50: 21, 20: 69, 10: 36, 5: 38, 2: 17, 1: 13, 0.5: 89, 0.2: 28, 0.1: 51, 0.05: 34 };

test('sur le relevé à signer, l\'écart est un montant encadré, à la taille des autres', async () => {
  const reg = R.emptyRegister(2025, { openingAmount: 2062.2, openingDate: '2024-12-20' });
  const res = await PDF.buildReleveCaissePdf({ date: '2025-02-27', counts: COUNTS, total: 4383.9 }, reg, { ecart: -143.95 });
  const els = await elements(res.bytes);
  const libelle = els.find((e) => e.t.startsWith('Écart avec le journal'));
  const montant = els.find((e) => e.t === '- 143.95');
  assert.ok(libelle, 'la ligne « Écart avec le journal » manque');
  assert.ok(montant, 'le montant de l\'écart doit être dans sa case, seul, comme les autres montants');
  assert.ok(montant.taille >= 11, `écart écrit en ${montant.taille} pt : trop petit pour être vu à la signature`);
  assert.ok(Math.abs(montant.y - libelle.y) < 1, 'le montant est sur la ligne de son libellé');
});

test('l\'écart et toute la remarque tiennent au-dessus des visas', async () => {
  const reg = R.emptyRegister(2025, { openingAmount: 2062.2, openingDate: '2024-12-20' });
  reg.visas = { responsable: 'A. Berger', boursier: 'Ch. Dupraz' };
  const note = 'comptage de fin de trimestre, après la course d\'école des 7-8P et le versement de la participation des parents';
  const res = await PDF.buildReleveCaissePdf({ date: '2025-02-27', counts: COUNTS, total: 4383.9, note }, reg, { ecart: -143.95 });
  const els = await elements(res.bytes);
  const texte = els.map((e) => e.t).join(' ');
  assert.ok(texte.includes('- 143.95'));
  assert.ok(texte.includes('parents'), 'la fin de la remarque a été coupée faute de place');
  const visa = els.find((e) => e.t.startsWith('Visa de A. Berger'));
  for (const e of els.filter((x) => /Remarque|parents|manque de l'argent/.test(x.t))) assert.ok(e.y > visa.y + 12, `« ${e.t} » déborde sur les visas`);
});

/* ---------------- « Emporter » les données sur le serveur ---------------- */

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'caisse-annee-'));
function caissePoste(racine) {
  for (const [annee, pieces] of [[2025, 12], [2026, 6]]) {
    fs.mkdirSync(path.join(racine, 'caisse', String(annee), 'pieces', 'p1'), { recursive: true });
    fs.writeFileSync(path.join(racine, 'caisse', String(annee), 'registre.json'), JSON.stringify({ annee, pieces: Array.from({ length: pieces }, (_, i) => ({ id: `p${i}`, no: i + 1, montant: 5 })) }));
    fs.writeFileSync(path.join(racine, 'caisse', String(annee), 'pieces', 'p1', 'ticket.jpg'), 'jpg');
  }
  fs.mkdirSync(path.join(racine, 'Scans'), { recursive: true });
  fs.writeFileSync(path.join(racine, 'Scans', 'attend.pdf'), '%PDF');
}

test('« Partir de zéro » reste réversible : une caisse sans aucune pièce n\'empêche pas d\'emporter', async () => {
  const poste = tmp(); caissePoste(poste);
  const serveur = tmp();
  // ce que laisse « Partir de zéro » : un registre vide, écrit au démarrage
  fs.mkdirSync(path.join(serveur, 'caisse', '2026'), { recursive: true });
  fs.writeFileSync(path.join(serveur, 'caisse', '2026', 'registre.json'), JSON.stringify(R.emptyRegister(2026)));
  assert.equal(E.caisseEnUsage(serveur), false);
  const r = await E.copierSiVide(poste, serveur);
  assert.equal(r.copie, true);
  const copie = JSON.parse(fs.readFileSync(path.join(serveur, 'caisse', '2026', 'registre.json'), 'utf8'));
  assert.equal(copie.pieces.length, 6, 'le registre vide du serveur a caché le vrai registre de ce PC');
  assert.ok(fs.existsSync(path.join(serveur, 'caisse', '2025', 'registre.json')));
  assert.ok(fs.existsSync(path.join(serveur, 'caisse', '2026', 'pieces', 'p1', 'ticket.jpg')));
});

test('une caisse en usage n\'est jamais écrasée : pièces, comptages, justificatifs, registre illisible', () => {
  const avec = (quoi) => {
    const d = tmp();
    fs.mkdirSync(path.join(d, 'caisse', '2026', 'pieces', 'p1'), { recursive: true });
    const f = path.join(d, 'caisse', '2026', 'registre.json');
    if (quoi === 'pieces') fs.writeFileSync(f, JSON.stringify({ annee: 2026, pieces: [{ id: 'a', no: 1 }] }));
    if (quoi === 'comptages') fs.writeFileSync(f, JSON.stringify({ annee: 2026, pieces: [], comptages: [{ id: 'c', date: '2026-01-02' }] }));
    if (quoi === 'justificatif') fs.writeFileSync(path.join(d, 'caisse', '2026', 'pieces', 'p1', 'ticket.jpg'), 'jpg');
    if (quoi === 'illisible') fs.writeFileSync(f, '{"annee":2026,"pieces":[');
    return d;
  };
  for (const quoi of ['pieces', 'comptages', 'justificatif', 'illisible']) assert.equal(E.caisseEnUsage(avec(quoi)), true, quoi);
  assert.equal(E.caisseEnUsage(tmp()), false);
});

test('ce qui a été emporté se dit en une phrase lisible', async () => {
  const poste = tmp(); caissePoste(poste);
  const r = await E.copierSiVide(poste, path.join(tmp(), 'partage'));
  assert.deepEqual(r.annees, [2025, 2026]);
  assert.equal(E.resumeCopie(r), 'les journaux 2025 et 2026 (avec leurs justificatifs) et les scans du copieur');
  assert.equal(E.resumeCopie({ copie: false }), '');
});
