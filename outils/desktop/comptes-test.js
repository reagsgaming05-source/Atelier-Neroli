/*
 * Les comptes : un secrétariat pose l'application sur un partage, chacune
 * choisit son nom une fois, et retrouve ensuite ses affaires — sans voir
 * celles des autres.
 *
 *   node comptes-test.js                       # depuis les sources
 *   node comptes-test.js chemin\BlonayPDF.exe  # sur le dossier empaqueté
 *
 * Ce qui est vraiment vérifié ici, et qu'une relecture ne garantit pas : les
 * tampons et les signatures ne vivent pas dans un fichier à nous mais dans le
 * stockage local du moteur d'affichage, qui suit le dossier de données. Si le
 * dossier était fixé trop tard, ou mal, deux personnes les partageraient sans
 * que rien ne le signale.
 */
const { _electron: electron } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const exe = process.argv[2];
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'blonay-comptes-'));
const dit = (quoi) => console.log('  ' + quoi);

// Le dossier d'essai tient lieu de dossier de l'application ; le « profil
// Windows » de chacune est un dossier à part (XDG_CONFIG_HOME sous Linux,
// APPDATA sous Windows) pour que le choix retenu ne soit pas commun.
const lancer = (qui) => {
  const profil = path.join(base, 'poste-' + qui);
  const env = { ...process.env, BLONAY_DOSSIER_APP: base, APPDATA: profil, XDG_CONFIG_HOME: profil };
  return electron.launch(exe ? { executablePath: exe, args: ['--no-sandbox'], env }
    : { args: [path.join(__dirname), '--no-sandbox'], env });
};

// Choisir fait redémarrer l'application : l'instance relancée échappe au
// pilote et garderait le verrou d'instance unique.
function menage() {
  const motif = process.platform === 'win32' ? 'BlonayPDF.exe' : "node_modules/electron/dis[t]/electron";
  try {
    if (process.platform === 'win32') require('child_process').execSync('taskkill /F /IM BlonayPDF.exe /T', { stdio: 'ignore' });
    else require('child_process').execSync('pkill -f ' + JSON.stringify(motif) + ' || true');
  } catch (e) { /* rien à tuer */ }
}
const souffler = (ms) => new Promise((r) => setTimeout(r, ms));

async function choisir(qui) {
  const e = await lancer(qui);
  const f = await e.firstWindow();
  await f.waitForSelector('.compte', { timeout: 60000 });
  const proposes = await f.locator('.compte span:last-child').allTextContents();
  await f.locator('.compte', { hasText: qui }).click();
  await e.close().catch(() => {});
  await souffler(1500);
  menage();
  return proposes;
}

async function ouvrir(qui) {
  const e = await lancer(qui);
  const f = await e.firstWindow();
  await f.waitForSelector('#app-toolbar:not([hidden])', { timeout: 90000 });
  return { e, f, dossier: await e.evaluate(({ app }) => app.getPath('userData')) };
}

(async () => {
  fs.writeFileSync(path.join(base, 'comptes.txt'), '# le secrétariat\nMarie\nSophie\n');

  const proposes = await choisir('Marie');
  assert.deepEqual(proposes, ['Marie', 'Sophie'], 'les deux comptes de comptes.txt sont proposés');
  dit('comptes proposés : ' + proposes.join(', '));

  // Marie revient : plus aucune question, et elle mémorise un tampon.
  let s = await ouvrir('Marie');
  assert.equal(s.dossier, path.join(base, 'data', 'Marie'), 'Marie travaille dans son dossier');
  await s.f.evaluate(() => localStorage.setItem('blonay-tampons', JSON.stringify([{ text: 'REÇU LE' }])));
  await s.e.close().catch(() => {}); await souffler(800); menage();
  dit('Marie : ' + s.dossier + ', et un tampon mémorisé');

  // Le choix tient : une troisième ouverture ne repose pas la question.
  s = await ouvrir('Marie');
  assert.equal(await s.f.evaluate(() => localStorage.getItem('blonay-tampons')) !== null, true,
    'Marie retrouve son tampon');
  await s.e.close().catch(() => {}); await souffler(800); menage();
  dit('Marie : le choix tient, le tampon est retrouvé');

  await choisir('Sophie');
  s = await ouvrir('Sophie');
  assert.equal(s.dossier, path.join(base, 'data', 'Sophie'), 'Sophie a son propre dossier');
  assert.equal(await s.f.evaluate(() => localStorage.getItem('blonay-tampons')), null,
    'Sophie ne voit pas le tampon de Marie — le stockage local suit bien le dossier');
  await s.e.close().catch(() => {}); await souffler(800); menage();
  dit('Sophie : ' + s.dossier + ', et aucun tampon de Marie');

  const dossiers = fs.readdirSync(path.join(base, 'data')).sort();
  assert.deepEqual(dossiers, ['Marie', 'Sophie'], 'un dossier par personne dans data/');
  dit('data/ : ' + dossiers.join(', '));

  try { fs.rmSync(base, { recursive: true, force: true }); } catch (e) { /* ménage sans importance */ }
  console.log('COMPTES OK');
})().catch((e) => { menage(); console.error(e); process.exit(1); });
