/*
 * Où vivent les données : sur le poste, ou sur le serveur via « donnees.txt ».
 *
 * Le programme reste sur chaque PC ; seules les données de la caisse vont sur le serveur. Ces
 * tests couvrent ce qu'une personne tape réellement dans le Bloc-notes, un dossier où l'on ne
 * peut pas écrire, et la première bascule — celle où il faut emporter ses registres sans
 * écraser ceux des collègues.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const E = require('../desktop/emplacement.js');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'compta-emplacement-'));

test('sans donnees.txt : les données restent sur le poste', () => {
  assert.equal(E.lireEmplacement(tmp(), {}), null);
});

test('donnees.txt tel que le Bloc-notes l\'écrit : marque d\'octets, commentaires, guillemets, fin de ligne Windows', () => {
  const d = tmp();
  const cible = path.join(d, 'serveur', 'ComptaBlonay-donnees');
  // « Copier en tant que chemin d'accès » dans l'explorateur ajoute les guillemets
  fs.writeFileSync(path.join(d, E.FICHIER), `﻿# mes données\r\n\r\n"${cible}"\r\n`, 'utf8');
  const r = E.lireEmplacement(d, {});
  assert.equal(r.chemin, cible);
  assert.equal(r.source, E.FICHIER);
});

test('un fichier vide ou fait de commentaires ne déplace rien', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, E.FICHIER), '# rien pour l\'instant\n\n   \n');
  assert.equal(E.lireEmplacement(d, {}), null);
});

test('la variable COMPTA_DONNEES passe avant le fichier', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, E.FICHIER), path.join(d, 'depuis-le-fichier'));
  const r = E.lireEmplacement(d, { COMPTA_DONNEES: path.join(d, 'depuis-l-environnement') });
  assert.equal(r.chemin, path.join(d, 'depuis-l-environnement'));
  assert.equal(r.source, 'COMPTA_DONNEES');
});

test('écrire puis effacer donnees.txt fait l\'aller-retour', () => {
  const d = tmp();
  const cible = path.join(d, 'partage');
  E.ecrireEmplacement(d, cible);
  assert.equal(E.lireEmplacement(d, {}).chemin, cible);
  E.ecrireEmplacement(d, null);
  assert.equal(E.lireEmplacement(d, {}), null);
  E.ecrireEmplacement(d, null); // effacer ce qui n'existe plus n'est pas une erreur
});

test('un dossier inscriptible est accepté, et créé s\'il manque', async () => {
  const cible = path.join(tmp(), 'nouveau', 'sous-dossier');
  assert.deepEqual(await E.verifierDossier(cible), { ok: true });
  assert.ok(fs.existsSync(cible));
  assert.deepEqual(fs.readdirSync(cible), [], 'le fichier d\'essai ne reste pas derrière');
});

test('un dossier où l\'on ne peut pas écrire est refusé, avec la raison', async () => {
  // un « dossier » qui est en réalité un fichier : refusé sur tous les systèmes, même en administrateur
  const d = tmp();
  const fichier = path.join(d, 'pas-un-dossier');
  fs.writeFileSync(fichier, 'x');
  const r = await E.verifierDossier(path.join(fichier, 'dedans'));
  assert.equal(r.ok, false);
  assert.match(r.raison, /\S/);
});

test('un serveur qui ne répond pas est déclaré injoignable au lieu de figer l\'application', async () => {
  const fsp = fs.promises;
  const vrai = fsp.mkdir;
  fsp.mkdir = () => new Promise(() => {}); // un partage réseau éteint : Windows ne rend jamais la main
  try {
    const t0 = Date.now();
    const r = await E.verifierDossier(path.join(tmp(), 'x'), 200);
    assert.equal(r.ok, false);
    assert.match(r.raison, /pas de réponse/);
    assert.ok(Date.now() - t0 < 2000);
  } finally { fsp.mkdir = vrai; }
});

function caisseFactice(racine) {
  fs.mkdirSync(path.join(racine, 'caisse', '2026'), { recursive: true });
  fs.writeFileSync(path.join(racine, 'caisse', '2026', 'registre.json'), '{"annee":2026}');
  fs.mkdirSync(path.join(racine, 'Scans', '.encours', 'PC-1'), { recursive: true });
  fs.writeFileSync(path.join(racine, 'Scans', '.encours', 'PC-1', 'en-lecture.pdf'), '%PDF');
  fs.writeFileSync(path.join(racine, 'Scans', 'attend.pdf'), '%PDF');
  fs.mkdirSync(path.join(racine, 'Décomptes', 'À faire', 'Camp'), { recursive: true });
  fs.writeFileSync(path.join(racine, 'Décomptes', 'À faire', 'Camp', '900 camp.pdf'), '%PDF');
  // le profil de Chromium : il ne doit PAS partir
  fs.mkdirSync(path.join(racine, 'Local Storage'), { recursive: true });
  fs.writeFileSync(path.join(racine, 'Local Storage', 'LOCK'), '');
  fs.writeFileSync(path.join(racine, 'caisse.log'), 'journal du poste');
}

test('la première bascule emporte les registres, les scans et les décomptes — pas le profil du poste', async () => {
  const poste = tmp(); caisseFactice(poste);
  const serveur = path.join(tmp(), 'partage');
  const r = await E.copierSiVide(poste, serveur);
  assert.equal(r.copie, true);
  assert.ok(fs.existsSync(path.join(serveur, 'caisse', '2026', 'registre.json')));
  assert.ok(fs.existsSync(path.join(serveur, 'Scans', 'attend.pdf')));
  assert.ok(fs.existsSync(path.join(serveur, 'Décomptes', 'À faire', 'Camp', '900 camp.pdf')));
  assert.ok(!fs.existsSync(path.join(serveur, 'Local Storage')), 'le profil Chromium reste sur le poste');
  assert.ok(!fs.existsSync(path.join(serveur, 'caisse.log')), 'le journal du poste reste sur le poste');
  assert.ok(!fs.existsSync(path.join(serveur, 'Scans', '.encours')), 'un scan en cours de lecture ne suit pas');
  // et rien n'a été retiré du poste
  assert.ok(fs.existsSync(path.join(poste, 'caisse', '2026', 'registre.json')));
});

test('un dossier qui a déjà sa caisse n\'est jamais écrasé', async () => {
  const poste = tmp(); caisseFactice(poste);
  const serveur = tmp();
  fs.mkdirSync(path.join(serveur, 'caisse', '2026'), { recursive: true });
  // la caisse des collègues a des pièces (une caisse sans rien, elle, peut être remplacée : voir annee.test.js)
  const leur = '{"annee":2026,"des":"collègues","pieces":[{"id":"p1","no":1,"montant":5}]}';
  fs.writeFileSync(path.join(serveur, 'caisse', '2026', 'registre.json'), leur);
  const r = await E.copierSiVide(poste, serveur);
  assert.equal(r.copie, false);
  assert.equal(fs.readFileSync(path.join(serveur, 'caisse', '2026', 'registre.json'), 'utf8'), leur);
});

test('rien à emporter : pas de copie, pas d\'erreur', async () => {
  const r = await E.copierSiVide(tmp(), path.join(tmp(), 'vide'));
  assert.equal(r.copie, false);
});
