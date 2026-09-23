/*
 * Plusieurs postes sur le même registre.
 *
 * Quand les données vivent sur le serveur, deux collègues peuvent ouvrir la même année. Chaque
 * enregistrement écrit tout le registre d'un bloc : sans précaution, le dernier qui enregistre
 * efface ce que l'autre vient de faire. Une pièce saisie disparaît, et personne ne le voit.
 *
 * Ces tests simulent un disque partagé et deux postes qui travaillent en même temps.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/registre.js');

/** Un disque partagé, avec la même règle que le processus principal (desktop/main.js, files:save). */
function disquePartage() {
  const fichiers = new Map();
  const F = {
    dir: async () => '\\\\SERVEUR\\Partage\\ComptaBlonay',
    years: async () => Array.from(fichiers.keys()).map(Number),
    load: async (y) => (fichiers.has(String(y)) ? fichiers.get(String(y)) : null),
    save: async (y, texte, attendu) => {
      const actuel = fichiers.has(String(y)) ? fichiers.get(String(y)) : null;
      if (attendu !== undefined && actuel !== null && actuel !== attendu) return { conflit: true, disque: actuel };
      fichiers.set(String(y), String(texte));
      return true;
    },
    attach: async () => ({}), read: async () => null, remove: async () => true,
  };
  return { fichiers, poste: () => R.fileStorage(F) };
}

function piece(reg, no, montant, extra) {
  const p = R.newPiece(reg);
  Object.assign(p, {
    no, date: `${reg.annee}-03-0${(no % 9) + 1}`, type: 'REMBOURSEMENT', detail: `achat ${no}`,
    personne: 'A. Berger', compte: '51000.3185.00', montant, sens: 'credit',
  }, extra || {});
  return R.upsertPiece(reg, p);
}

async function anneeCommune() {
  const d = disquePartage();
  const depart = R.emptyRegister(2026, { openingAmount: 500 });
  piece(depart, 1, 10);
  piece(depart, 2, 20);
  d.fichiers.set('2026', R.serialize(depart));
  return d;
}

test('deux postes enregistrent chacun une pièce : aucune ne se perd', async () => {
  const d = await anneeCommune();
  const A = d.poste(); const B = d.poste();
  const regA = await A.load(2026); const regB = await B.load(2026);

  piece(regA, 3, 30);
  assert.equal((await A.save(regA)).fusion, null, 'A écrit le premier : rien à fusionner');

  piece(regB, 4, 40, { detail: 'achat de B' });
  const r = await B.save(regB);
  assert.ok(r.fusion, 'B doit s\'apercevoir que A a écrit entre-temps');
  assert.equal(r.fusion.reprises, 1);

  const surDisque = R.parse(d.fichiers.get('2026'));
  assert.deepEqual(surDisque.pieces.map((p) => p.no), [1, 2, 3, 4], 'la pièce de A ET celle de B');
  // et l'écran de B montre aussitôt la pièce de A
  assert.deepEqual(regB.pieces.map((p) => p.no), [1, 2, 3, 4]);
});

test('sans autre poste, rien ne change : pas de fusion', async () => {
  const d = await anneeCommune();
  const A = d.poste();
  const reg = await A.load(2026);
  piece(reg, 3, 30);
  assert.equal((await A.save(reg)).fusion, null);
  piece(reg, 4, 40);
  assert.equal((await A.save(reg)).fusion, null, 'le second enregistrement part de ce que A a écrit lui-même');
});

test('une modification de l\'autre poste est gardée quand ce poste n\'y a pas touché', async () => {
  const d = await anneeCommune();
  const A = d.poste(); const B = d.poste();
  const regA = await A.load(2026); const regB = await B.load(2026);

  const p1 = regA.pieces.find((p) => p.no === 1);
  R.upsertPiece(regA, Object.assign({}, p1, { montant: 11.5 }));
  await A.save(regA);

  piece(regB, 3, 30); // B touche à autre chose
  await B.save(regB);
  const surDisque = R.parse(d.fichiers.get('2026'));
  assert.equal(surDisque.pieces.find((p) => p.no === 1).montant, 11.5, 'la correction de A survit');
  assert.ok(surDisque.pieces.some((p) => p.no === 3));
});

test('la même pièce modifiée des deux côtés : la plus récente l\'emporte, et c\'est dit', async () => {
  const d = await anneeCommune();
  const A = d.poste(); const B = d.poste();
  const regA = await A.load(2026); const regB = await B.load(2026);
  const id = regA.pieces.find((p) => p.no === 2).id;

  R.upsertPiece(regA, Object.assign({}, regA.pieces.find((p) => p.id === id), { montant: 21 }));
  regA.pieces.find((p) => p.id === id).updatedAt = '2026-03-01T10:00:00.000Z';
  await A.save(regA);

  R.upsertPiece(regB, Object.assign({}, regB.pieces.find((p) => p.id === id), { montant: 22 }));
  regB.pieces.find((p) => p.id === id).updatedAt = '2026-03-01T11:00:00.000Z';
  const r = await B.save(regB);

  assert.equal(r.fusion.conflits.length, 1);
  assert.equal(r.fusion.conflits[0].no, 2);
  assert.equal(R.parse(d.fichiers.get('2026')).pieces.find((p) => p.id === id).montant, 22, 'B a modifié en dernier');
});

test('une pièce supprimée d\'un côté mais modifiée de l\'autre est gardée', async () => {
  // une suppression perdue se refait d'un clic ; une saisie perdue ne se retrouve pas
  const d = await anneeCommune();
  const A = d.poste(); const B = d.poste();
  const regA = await A.load(2026); const regB = await B.load(2026);
  const id = regA.pieces.find((p) => p.no === 2).id;

  R.removePiece(regA, id);
  await A.save(regA);

  R.upsertPiece(regB, Object.assign({}, regB.pieces.find((p) => p.id === id), { montant: 99 }));
  const r = await B.save(regB);
  assert.ok(r.fusion.conflits.some((c) => c.supprimeeAilleurs));
  assert.equal(R.parse(d.fichiers.get('2026')).pieces.find((p) => p.id === id).montant, 99);
});

test('une suppression sans autre changement passe', async () => {
  const d = await anneeCommune();
  const A = d.poste(); const B = d.poste();
  const regA = await A.load(2026); const regB = await B.load(2026);
  R.removePiece(regA, regA.pieces.find((p) => p.no === 2).id);
  await A.save(regA);
  piece(regB, 3, 30);
  await B.save(regB);
  assert.deepEqual(R.parse(d.fichiers.get('2026')).pieces.map((p) => p.no), [1, 3]);
});

test('les deux postes prennent « le numéro suivant » : les deux pièces restent, et le doublon est signalé', async () => {
  const d = await anneeCommune();
  const A = d.poste(); const B = d.poste();
  const regA = await A.load(2026); const regB = await B.load(2026);
  piece(regA, 3, 30);
  await A.save(regA);
  piece(regB, 3, 33);
  const r = await B.save(regB);
  assert.deepEqual(r.fusion.doublons, [3]);
  assert.equal(R.parse(d.fichiers.get('2026')).pieces.filter((p) => p.no === 3).length, 2, 'aucune des deux n\'est perdue');
});

test('le solde à nouveau changé par l\'autre poste est repris', async () => {
  const d = await anneeCommune();
  const A = d.poste(); const B = d.poste();
  const regA = await A.load(2026); const regB = await B.load(2026);
  regA.opening.amount = 612.4;
  await A.save(regA);
  piece(regB, 3, 30);
  await B.save(regB);
  assert.equal(R.parse(d.fichiers.get('2026')).opening.amount, 612.4);
});

test('un comptage de caisse fait sur l\'autre poste est gardé', async () => {
  const d = await anneeCommune();
  const A = d.poste(); const B = d.poste();
  const regA = await A.load(2026); const regB = await B.load(2026);
  R.upsertCount(regA, { date: '2026-03-15', counts: { 100: 2 } });
  await A.save(regA);
  piece(regB, 3, 30);
  await B.save(regB);
  assert.equal(R.parse(d.fichiers.get('2026')).comptages.length, 1);
});

test('une restauration de sauvegarde remplace, elle ne fusionne pas', async () => {
  const d = await anneeCommune();
  const A = d.poste(); const B = d.poste();
  const regA = await A.load(2026);
  await B.load(2026);
  piece(regA, 3, 30);
  await A.save(regA);
  // B restaure une sauvegarde qui n'a que la pièce 1 : c'est un remplacement voulu
  const sauvegarde = R.emptyRegister(2026, { openingAmount: 500 });
  piece(sauvegarde, 1, 10);
  const r = await B.save(sauvegarde, { remplacer: true });
  assert.equal(r.fusion, null);
  assert.deepEqual(R.parse(d.fichiers.get('2026')).pieces.map((p) => p.no), [1]);
});

test('un registre illisible sur le disque n\'est jamais écrasé', async () => {
  const d = await anneeCommune();
  const A = d.poste();
  const reg = await A.load(2026);
  d.fichiers.set('2026', '{ ceci n\'est pas du JSON');
  piece(reg, 3, 30);
  await assert.rejects(() => A.save(reg), /illisible/);
  assert.equal(d.fichiers.get('2026'), '{ ceci n\'est pas du JSON', 'le fichier est resté tel quel');
});

test('une année créée des deux côtés garde les pièces des deux', async () => {
  const d = disquePartage();
  const A = d.poste(); const B = d.poste();
  // les deux postes ouvrent une année qui n'existe pas encore
  assert.equal(await A.load(2027), null);
  assert.equal(await B.load(2027), null);
  const regA = R.emptyRegister(2027); piece(regA, 1, 10);
  const regB = R.emptyRegister(2027); piece(regB, 2, 20);
  await A.save(regA);
  const r = await B.save(regB);
  assert.ok(r.fusion);
  assert.deepEqual(R.parse(d.fichiers.get('2027')).pieces.map((p) => p.no), [1, 2]);
});
