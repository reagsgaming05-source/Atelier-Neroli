/*
 * Le lanceur des postes installés depuis le serveur.
 *
 * Les postes installés avant le sous-dossier « Installation sur plusieurs PC » ont un lanceur qui
 * cherche sa mise à jour à côté du programme (« Compta Blonay.cmd »), où elle n'est plus. Il met
 * encore l'application à jour, mais plus lui-même : c'est l'application qui le remplace.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const L = require('../desktop/lanceur.js');

/** Un %LOCALAPPDATA% de poste installé : le programme, son sous-dossier, et le lanceur posé à côté. */
function poste({ ancien = 'ancien lanceur\r\n', neuf = 'lanceur du serveur\r\n' } = {}) {
  const local = fs.mkdtempSync(path.join(os.tmpdir(), 'compta-lanceur-'));
  const ici = path.join(local, 'ComptaBlonay');
  fs.mkdirSync(path.join(ici, L.SOUS_DOSSIER), { recursive: true });
  if (neuf != null) fs.writeFileSync(path.join(ici, L.SOUS_DOSSIER, 'lanceur.cmd'), neuf);
  if (ancien != null) fs.writeFileSync(path.join(local, 'ComptaBlonay-lanceur.cmd'), ancien);
  return { local, ici, lanceur: path.join(local, 'ComptaBlonay-lanceur.cmd') };
}

test("l'ancien lanceur d'un poste installé est remplacé par celui du programme", () => {
  const p = poste();
  assert.equal(L.mettreAJourLanceur({ localAppData: p.local, dossierProgramme: p.ici }), 'remplace');
  assert.equal(fs.readFileSync(p.lanceur, 'utf8'), 'lanceur du serveur\r\n');
  assert.ok(!fs.existsSync(`${p.lanceur}.nouveau`), 'pas de fichier provisoire laissé derrière');
  // la fois suivante, rien à faire
  assert.equal(L.mettreAJourLanceur({ localAppData: p.local, dossierProgramme: p.ici }), 'a-jour');
});

test('le dossier du programme se compare sans tenir compte des majuscules ni du séparateur final', () => {
  const p = poste();
  const autreCasse = p.ici.replace(/ComptaBlonay$/, 'comptablonay') + path.sep;
  // sous Linux le dossier en minuscules n'existe pas, mais la comparaison des chemins ne lit pas le disque
  assert.equal(L.mettreAJourLanceur({ localAppData: p.local, dossierProgramme: autreCasse }), 'remplace');
});

test('une version portable ouverte ailleurs (clé USB, Bureau) ne touche à aucun lanceur', () => {
  const p = poste();
  const ailleurs = fs.mkdtempSync(path.join(os.tmpdir(), 'compta-portable-'));
  assert.equal(L.mettreAJourLanceur({ localAppData: p.local, dossierProgramme: ailleurs }), 'sans-objet');
  assert.equal(fs.readFileSync(p.lanceur, 'utf8'), 'ancien lanceur\r\n');
});

test("sans lanceur posé (poste pas installé par l'installateur) ou sans copie neuve : rien n'est créé", () => {
  const sansLanceur = poste({ ancien: null });
  assert.equal(L.mettreAJourLanceur({ localAppData: sansLanceur.local, dossierProgramme: sansLanceur.ici }), 'sans-objet');
  assert.ok(!fs.existsSync(sansLanceur.lanceur));
  const sansNeuf = poste({ neuf: null });
  assert.equal(L.mettreAJourLanceur({ localAppData: sansNeuf.local, dossierProgramme: sansNeuf.ici }), 'sans-objet');
  assert.equal(fs.readFileSync(sansNeuf.lanceur, 'utf8'), 'ancien lanceur\r\n');
  assert.equal(L.mettreAJourLanceur({ localAppData: '', dossierProgramme: sansNeuf.ici }), 'sans-objet');
});

test("le sous-dossier est le même pour l'application, le lanceur, l'installateur et la construction", () => {
  const racine = path.join(__dirname, '..');
  const lanceur = fs.readFileSync(path.join(racine, 'desktop', 'build', 'lanceur.cmd'), 'utf8');
  assert.ok(lanceur.includes(`set "SOUS_DOSSIER=${L.SOUS_DOSSIER}"`), 'lanceur.cmd');
  assert.ok(lanceur.includes('%LOCALAPPDATA%\\ComptaBlonay'), 'lanceur.cmd : dossier du programme');
  const installateur = fs.readFileSync(path.join(racine, 'desktop', 'build', 'Installer sur ce PC.cmd'), 'utf8');
  assert.ok(installateur.includes('ComptaBlonay-lanceur.cmd'), "l'installateur pose le lanceur sous ce nom");
  const flux = fs.readFileSync(path.join(racine, '..', '.github', 'workflows', 'build-caisse-windows.yml'), 'utf8');
  assert.ok(flux.includes(`dist\\ComptaBlonay\\${L.SOUS_DOSSIER}\\`), 'la construction range les deux .cmd dans le sous-dossier');
  // et le module part bien dans l'exécutable
  const pkg = JSON.parse(fs.readFileSync(path.join(racine, 'desktop', 'package.json'), 'utf8'));
  assert.ok(pkg.build.files.includes('lanceur.js'), 'lanceur.js dans build.files');
});
