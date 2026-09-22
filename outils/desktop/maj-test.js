/*
 * La mise à jour proposée toute seule, jouée sur l'application.
 *
 *   node maj-test.js                       # depuis les sources
 *   node maj-test.js chemin\BlonayPDF.exe  # sur le dossier empaqueté
 *
 * Quatre situations, parce que se tromper ici ne se rattrape pas : une mise à
 * jour proposée à tort réinstalle une version plus ancienne, une mise à jour
 * lancée pendant qu'une collègue travaille laisse une installation à moitié
 * remplacée, et une mise à jour jamais proposée ne sert à rien.
 *
 * Le script de mise à jour est remplacé par un témoin : ce qu'on vérifie ici,
 * c'est que l'application ferme tout et l'appelle avec le bon zip. Que le vrai
 * script préserve « data » se vérifie ailleurs, sur Windows, avec le vrai zip.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const { _electron: electron } = require('playwright-core');
const { zipDe } = require('../test/zip-dessai.js');
const { poserLeJeton } = require('./version-posee.js');

const exe = process.argv[2];
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'blonay-maj-'));
const dit = (quoi) => console.log('  ' + quoi);
const souffler = (ms) => new Promise((r) => setTimeout(r, ms));
const DELAI = 9000; // l'application attend ce délai avant de regarder

function menage() {
  try {
    if (process.platform === 'win32') require('child_process').execSync('taskkill /F /IM BlonayPDF.exe /T', { stdio: 'ignore' });
    else require('child_process').execSync('pkill -f ' + JSON.stringify('node_modules/electron/dis[t]/electron') + ' || true');
  } catch (e) { /* rien à tuer */ }
}

// Une installation d'essai : le dossier de l'application, son script de mise à
// jour remplacé par un témoin, et le zip qu'on veut lui faire trouver.
function installation(nom, fiche) {
  const d = path.join(base, nom);
  fs.mkdirSync(d, { recursive: true });
  const temoin = path.join(d, 'temoin.txt');
  const script = path.join(d, 'Mettre-a-jour.cmd');
  if (process.platform === 'win32') {
    fs.writeFileSync(script, '@echo off\r\necho %BLONAY_MAJ_AUTO% %1> "%~dp0temoin.txt"\r\n');
  } else {
    fs.writeFileSync(script, '#!/bin/sh\nprintf "%s %s" "$BLONAY_MAJ_AUTO" "$1" > "$(dirname "$0")/temoin.txt"\n');
    fs.chmodSync(script, 0o755);
  }
  if (fiche) fs.writeFileSync(path.join(d, 'BlonayPDF-windows.zip'),
    zipDe([{ nom: 'BlonayPDF/version.json', contenu: JSON.stringify(fiche) }]));
  return { dossier: d, temoin, zip: path.join(d, 'BlonayPDF-windows.zip') };
}

const lancer = (dossier) => {
  const env = { ...process.env, BLONAY_DOSSIER_APP: dossier, BLONAY_MAJ_DELAI: String(DELAI) };
  return electron.launch(exe ? { executablePath: exe, args: ['--no-sandbox'], env }
    : { args: [path.join(__dirname), '--no-sandbox'], env });
};

// On remplace la boîte de dialogue : elle est native, donc invisible au pilote,
// et elle retiendrait le test indéfiniment. Ce qu'on lit ensuite, c'est ce que
// l'application voulait dire, et ce qu'elle fait de la réponse.
async function guetter(app, reponse) {
  await app.evaluate(({ dialog }, rep) => {
    global.__boites = [];
    dialog.showMessageBox = (a, b) => {
      const o = b || a;
      global.__boites.push({ message: String(o.message || ''), detail: String(o.detail || ''), boutons: o.buttons || [] });
      return Promise.resolve({ response: rep });
    };
  }, reponse);
}
const boites = (app) => app.evaluate(() => global.__boites || []);

async function ouvrir(dossier, reponse) {
  const app = await lancer(dossier);
  const f = await app.firstWindow();
  await f.waitForSelector('#app-toolbar:not([hidden])', { timeout: 90000 });
  await guetter(app, reponse);
  return app;
}

async function attendreUneBoite(app, combien) {
  for (let i = 0; i < Math.ceil((DELAI + 12000) / 250); i++) {
    const vues = await boites(app).catch(() => []);
    if (vues.length >= (combien || 1)) return vues;
    await souffler(250);
  }
  return [];
}

(async () => {
  const demain = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const neuve = { construction: 'construite le 23.09.2026, commit f00df00', commit: 'f00df00', date: demain };

  // 1. Une version plus récente est posée : elle est proposée, et « Plus tard »
  //    ne touche à rien.
  let poste = installation('plus-tard', neuve);
  let app = await ouvrir(poste.dossier, 1);
  let vues = await attendreUneBoite(app);
  assert.equal(vues.length, 1, 'la mise à jour est proposée');
  assert.match(vues[0].message, /plus récente/i);
  assert.match(vues[0].detail, /f00df00/, 'la version posée est nommée');
  assert.deepEqual(vues[0].boutons, ['Mettre à jour maintenant', 'Plus tard']);
  await souffler(1500);
  assert.equal(fs.existsSync(poste.temoin), false, '« Plus tard » ne lance rien');
  await app.close().catch(() => {});
  menage();
  dit('proposée : « ' + vues[0].message + ' » — « Plus tard » ne lance rien');

  // 2. Une collègue a encore l'application ouverte ailleurs : on refuse, en le
  //    disant. La copie se ferait à moitié, ses fichiers étant verrouillés.
  poste = installation('occupe', neuve);
  poserLeJeton(path.join(poste.dossier, 'data'), 'PC-ACCUEIL', 4242, Date.now());
  app = await ouvrir(poste.dossier, 0);
  vues = await attendreUneBoite(app, 2);
  assert.equal(vues.length, 2, 'un avertissement suit la demande');
  assert.match(vues[1].message, /ouverte ailleurs/i);
  assert.match(vues[1].detail, /PC-ACCUEIL/, 'le poste qui bloque est nommé');
  await souffler(1500);
  assert.equal(fs.existsSync(poste.temoin), false, 'et rien n\'est lancé');
  await app.close().catch(() => {});
  menage();
  dit('un autre poste ouvert : « ' + vues[1].message + ' », rien n\'est lancé');

  // 3. Personne d'autre : l'application ferme tout et passe la main au script.
  poste = installation('seule', neuve);
  app = await ouvrir(poste.dossier, 0);
  await app.waitForEvent('close', { timeout: 30000 });
  for (let i = 0; i < 60 && !fs.existsSync(poste.temoin); i++) await souffler(250);
  assert.ok(fs.existsSync(poste.temoin), 'le script de mise à jour est lancé');
  const dit_par_le_script = fs.readFileSync(poste.temoin, 'utf8').trim();
  assert.match(dit_par_le_script, /^1 /, 'lancé en mode automatique (BLONAY_MAJ_AUTO)');
  assert.ok(dit_par_le_script.includes('BlonayPDF-windows.zip'), 'avec le zip posé : ' + dit_par_le_script);
  menage();
  dit('seule au bureau : l\'application se ferme et appelle le script — ' + dit_par_le_script);

  // 4. Le zip posé porte la version installée : rien à proposer. C'est le cas
  //    ordinaire — le zip reste à côté après la mise à jour.
  // La fiche de la version installée se lit à côté de l'exécutable : c'est elle
  // que le dossier portable emporte, et l'oublier à l'empaquetage rendrait la
  // mise à jour automatique muette. Ce test tombe alors ici.
  const ouEstLaFiche = exe
    ? path.join(path.dirname(exe), 'version.json')
    : path.join(__dirname, 'app', 'construction.json');
  let installee = null;
  try { installee = JSON.parse(fs.readFileSync(ouEstLaFiche, 'utf8')); } catch (e) { /* dit juste après */ }
  assert.ok(installee && installee.date, 'la fiche de version accompagne l\'application : ' + ouEstLaFiche);
  poste = installation('deja-a-jour', null);
  app = await ouvrir(poste.dossier, 1);
  fs.writeFileSync(poste.zip, zipDe([{ nom: 'BlonayPDF/version.json', contenu: JSON.stringify(installee) }]));
  await souffler(DELAI + 6000);
  assert.deepEqual(await boites(app), [], 'la version déjà installée ne se propose pas');
  await app.close().catch(() => {});
  menage();
  dit('zip de la version installée : rien n\'est proposé');

  try { fs.rmSync(base, { recursive: true, force: true }); } catch (e) { /* ménage sans importance */ }
  console.log('MAJ OK');
})().catch((e) => { menage(); console.error(e); process.exit(1); });
