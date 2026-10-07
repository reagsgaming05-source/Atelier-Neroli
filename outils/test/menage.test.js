// Le ménage d'une mise à jour : ce que la nouvelle version ne livre plus part ; ce qui appartient à la personne ne bouge jamais.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { cheminSur, lireListe, aRetirer, faireLeMenage, menagePourLeScript, listerLeDossier, NOM_LISTE } = require('../desktop/menage');

function dossier(fichiers) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-menage-'));
  for (const [rel, contenu] of Object.entries(fichiers)) {
    const p = path.join(d, ...rel.split('/'));
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, contenu);
  }
  return d;
}
const existe = (d, rel) => fs.existsSync(path.join(d, ...rel.split('/')));

test('un chemin de la liste est relatif, propre, et hors des parties protégées', () => {
  for (const bon of ['AktumPDF.exe', 'resources/app.asar', 'locales/fr.pak', 'Notes de version.txt', 'é/à.bin']) assert.ok(cheminSur(bon), bon);
  for (const mauvais of ['', '/etc/passwd', '../hors.txt', 'a/../../b', 'a//b', './x', 'C:/Windows/x', 'a\\b', 'data/tampons.json', 'DATA/x', 'Data/comptes/x.json', 'maj/essai.zip', 'licence.json', 'LICENCE.JSON',
    'aktum.log', 'a\0b', NOM_LISTE, 'x'.repeat(500)]) assert.ok(!cheminSur(mauvais), JSON.stringify(mauvais));
});

test('la différence : seulement ce que l\'ancienne liste avait et que la nouvelle n\'a plus', () => {
  const r = aRetirer('a.dll\nb.dll\nlocales/de.pak\nlocales/fr.pak\n', 'a.dll\nlocales/fr.pak\nneuf.bin\n');
  assert.deepStrictEqual(r.fichiers, ['b.dll', 'locales/de.pak']);
  assert.deepStrictEqual(aRetirer('', 'a\n').fichiers, []);
  assert.deepStrictEqual(aRetirer('a\n', 'a\n').fichiers, []);
  // retours chariot, ligne vide, BOM : la liste écrite par Windows se lit comme celle de Linux
  assert.deepStrictEqual(lireListe('\uFEFFa.dll\r\n\r\nb.dll\r\n').sures.size, 2);
});

test('le ménage retire les fichiers de l\'ancienne version, garde data, les fichiers personnels et le reste', () => {
  const d = dossier({
    'AktumPDF.exe': 'x', 'ancien.dll': 'x', 'resources/app.asar': 'x', 'resources/ancien.pak': 'x', 'ancien-dossier/profond/a.bin': 'x', 'ancien-dossier/profond/b.bin': 'x',
    'data/tampons.json': 'MES TAMPONS', 'data/ancien.dll': 'MIEN', 'licence.json': 'L', 'notes-du-service.txt': 'A MOI',
  });
  const ancienne = ['AktumPDF.exe', 'ancien.dll', 'resources/app.asar', 'resources/ancien.pak', 'ancien-dossier/profond/a.bin', 'ancien-dossier/profond/b.bin'].join('\n');
  const nouvelle = ['AktumPDF.exe', 'resources/app.asar', 'neuf.bin'].join('\n');
  const b = faireLeMenage(d, ancienne, nouvelle);
  assert.deepStrictEqual(b.retires.sort(), ['ancien-dossier/profond/a.bin', 'ancien-dossier/profond/b.bin', 'ancien.dll', 'resources/ancien.pak']);
  assert.ok(!existe(d, 'ancien.dll') && !existe(d, 'resources/ancien.pak'));
  assert.ok(!existe(d, 'ancien-dossier'), 'le dossier que le retrait a vidé part aussi, jusqu\'en haut');
  assert.ok(existe(d, 'resources/app.asar') && existe(d, 'AktumPDF.exe') && existe(d, 'resources'), 'ce que la nouvelle version livre reste, et son dossier aussi');
  assert.strictEqual(fs.readFileSync(path.join(d, 'data', 'tampons.json'), 'utf8'), 'MES TAMPONS');
  assert.strictEqual(fs.readFileSync(path.join(d, 'notes-du-service.txt'), 'utf8'), 'A MOI');
  assert.ok(existe(d, 'licence.json'));
});

test('une liste qui voudrait sortir du dossier, ou toucher à data, n\'y arrive pas', () => {
  const hors = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-hors-'));
  fs.writeFileSync(path.join(hors, 'precieux.txt'), 'NE PAS TOUCHER');
  const d = dossier({ 'data/comptes.json': 'COMPTES', 'licence.json': 'L', 'ok.bin': 'x' });
  const piege = ['../' + path.basename(hors) + '/precieux.txt', path.join(hors, 'precieux.txt'), 'data/comptes.json', 'DATA/comptes.json', 'licence.json', 'ok.bin', 'a/../../x'].join('\n');
  const b = faireLeMenage(d, piege, '');
  assert.deepStrictEqual(b.retires, ['ok.bin'], 'seul ce qui est propre et permis part');
  assert.ok(b.refusees >= 5);
  assert.strictEqual(fs.readFileSync(path.join(hors, 'precieux.txt'), 'utf8'), 'NE PAS TOUCHER');
  assert.strictEqual(fs.readFileSync(path.join(d, 'data', 'comptes.json'), 'utf8'), 'COMPTES');
  assert.ok(existe(d, 'licence.json'));
});

test('un nom de liste qui désigne un dossier est refusé, un fichier absent est compté', () => {
  const d = dossier({ 'sous/dossier/x.bin': 'x' });
  const b = faireLeMenage(d, 'sous/dossier\nn-existe-pas.bin\n', '');
  assert.deepStrictEqual(b.retires, []);
  assert.strictEqual(b.absents, 1);
  assert.strictEqual(b.refusees, 1);
  assert.ok(existe(d, 'sous/dossier/x.bin'));
});

test('le mode du script : un code, une ligne ; sans l\'une des deux listes, rien n\'est retiré', () => {
  const d = dossier({ 'ancien.dll': 'x', 'AktumPDF.exe': 'x' });
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-listes-'));
  const ancienne = path.join(t, 'ancienne.txt'), nouvelle = path.join(t, 'nouvelle.txt'), sortie = path.join(t, 'menage.txt');
  fs.writeFileSync(ancienne, 'AktumPDF.exe\nancien.dll\n'); fs.writeFileSync(nouvelle, 'AktumPDF.exe\n');
  let r = menagePourLeScript(d, ancienne, path.join(t, 'absente.txt'), sortie);
  assert.strictEqual(r.code, 0); assert.match(r.ligne, /^MENAGE-SANS-LISTE/); assert.ok(existe(d, 'ancien.dll'));
  r = menagePourLeScript(d, path.join(t, 'absente.txt'), nouvelle, sortie);
  assert.match(r.ligne, /^MENAGE-SANS-LISTE/); assert.ok(existe(d, 'ancien.dll'));
  r = menagePourLeScript(path.join(t, 'pas-un-dossier'), ancienne, nouvelle, sortie);
  assert.strictEqual(r.code, 2); assert.match(r.ligne, /^MENAGE-REFUSE/);
  r = menagePourLeScript(d, ancienne, nouvelle, sortie);
  assert.strictEqual(r.code, 0); assert.match(r.ligne, /^MENAGE-OK 1 retiré/);
  assert.match(fs.readFileSync(sortie, 'utf8'), /^MENAGE-OK/);
  assert.ok(!existe(d, 'ancien.dll') && existe(d, 'AktumPDF.exe'));
});

test('la liste d\'un dossier prêt à archiver : tout, sauf data, licence, journal et la liste elle-même', () => {
  const d = dossier({ 'AktumPDF.exe': 'x', 'resources/app.asar': 'x', 'locales/fr.pak': 'x', 'data/t.json': 'x', 'licence.json': 'x', 'aktum.log': 'x', [NOM_LISTE]: 'x', 'Notes de version.txt': 'x' });
  assert.deepStrictEqual(listerLeDossier(d), ['AktumPDF.exe', 'Notes de version.txt', 'locales/fr.pak', 'resources/app.asar']);
});

test('« node menage.js liste » écrit la liste dans le dossier', () => {
  const d = dossier({ 'AktumPDF.exe': 'x', 'resources/app.asar': 'x' });
  const r = require('child_process').spawnSync(process.execPath, [path.join(__dirname, '..', 'desktop', 'menage.js'), 'liste', d], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(fs.readFileSync(path.join(d, NOM_LISTE), 'utf8'), 'AktumPDF.exe\nresources/app.asar\n');
  // et l'ancienne liste, relue, ne se nomme pas elle-même
  assert.ok(!lireListe(fs.readFileSync(path.join(d, NOM_LISTE), 'utf8')).sures.has(NOM_LISTE));
});

test('le script de mise à jour appelle le ménage de l\'application installée, avant la recopie, sans bloc entre parenthèses', () => {
  const cmd = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'build', 'Mettre-a-jour.cmd'), 'utf8');
  const iMenage = cmd.indexOf('--menage'), iRobocopy = cmd.indexOf('robocopy "%SOURCE%"');
  assert.ok(iMenage > 0 && iRobocopy > iMenage, 'le ménage précède la recopie');
  assert.ok(cmd.indexOf('ancienne-liste.txt') < iRobocopy, 'la liste installée est mise de côté avant que la recopie la remplace');
  // « Program Files (x86) » ferme une parenthèse : aucune commande qui porte un chemin ne doit être dans un bloc ( … )
  const bloc = cmd.slice(cmd.indexOf('rem --- 5.'), iRobocopy);
  assert.ok(!/^\s*if .*\(\s*$/m.test(bloc), 'pas de « if … ( » dans le ménage');
  assert.match(cmd, /if not exist "%DOSSIER%LISTE-DES-FICHIERS\.txt" goto :sans_menage/);
});
