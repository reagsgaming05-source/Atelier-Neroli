/*
 * La langue de l'application fenêtrée : le menu, la page et la fenêtre de connexion suivent la même langue,
 * choisie par le réglage mémorisé ou, à défaut, par la langue du système ; un changement (depuis le menu ou
 * depuis la page) se répercute des deux côtés et survit au redémarrage.
 *
 *   node langue-test.js                       # depuis les sources
 *   node langue-test.js chemin\AktumPDF.exe  # sur le dossier empaqueté
 */
const { _electron: electron } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const exe = process.argv[2];
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-langue-'));
const dit = (quoi) => console.log('  ' + quoi);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const lancer = (env) => electron.launch(exe ? { executablePath: exe, args: ['--no-sandbox'], env }
  : { args: [path.join(__dirname), '--no-sandbox'], env });
async function fenetrePrete(app) {
  const win = await app.firstWindow();
  await win.waitForLoadState('domcontentloaded');
  await win.waitForSelector('#app-toolbar', { state: 'visible', timeout: 60000 });
  return win;
}
const menu = (app) => app.evaluate(({ Menu }) => Menu.getApplicationMenu().items.map((i) => i.label));
const attendre = async (cond, quoi, delai) => {
  const fin = Date.now() + (delai || 15000);
  while (Date.now() < fin) { if (await cond()) return; await dormir(250); }
  assert.fail('délai dépassé : ' + quoi);
};
// Un clic sur « Français » / « Deutsch » dans Aide ▸ Langue, comme à la souris.
const choisirDansLeMenu = (app, nom) => app.evaluate(({ Menu }, nom) => {
  const aide = Menu.getApplicationMenu().items[3];
  const langue = aide.submenu.items.find((i) => i.submenu);
  langue.submenu.items.find((i) => i.label === nom).click();
}, nom);

(async () => {
  let echecs = 0;
  const etape = async (nom, f) => { try { await f(); dit('ok  ' + nom); } catch (e) { echecs++; console.log('ÉCHEC ' + nom + '\n   ' + String(e && e.message).split('\n').slice(0, 6).join('\n   ')); } };
  const dossier = path.join(base, 'a');
  fs.mkdirSync(dossier, { recursive: true });
  const env = { ...process.env, AKTUM_SMOKE_DIR: dossier };
  delete env.AKTUM_LANGUE;
  const reglages = path.join(dossier, 'donnees', 'reglages.json');

  // 1. Imposée (essais) : l'allemand, partout
  let app = await lancer({ ...env, AKTUM_LANGUE: 'de' });
  let win = await fenetrePrete(app);
  await etape('le menu est en allemand', async () => assert.deepEqual(await menu(app), ['Datei', 'Ansicht', 'Werkzeuge', 'Hilfe']));
  await etape('la page est en allemand et le sait', async () => {
    assert.equal(await win.evaluate(() => document.documentElement.lang), 'de');
    assert.equal(await win.evaluate(() => window.AktumDesktop.langue), 'de');
    assert.match(await win.locator('#btn-open').getAttribute('title'), /öffnen/);
    assert.equal(await win.locator('#btn-langue').textContent(), 'FR');
  });
  // 2. Le menu change la langue : la page suit, le choix est retenu
  await etape('le menu passe la page en français', async () => {
    await choisirDansLeMenu(app, 'Français');
    await attendre(async () => (await win.evaluate(() => document.documentElement.lang)) === 'fr', 'la page passe en français');
    assert.deepEqual(await menu(app), ['Fichier', 'Affichage', 'Outils', 'Aide']);
    assert.match(await win.locator('#btn-open').getAttribute('title'), /Ouvrir/);
    await attendre(() => fs.existsSync(reglages) && JSON.parse(fs.readFileSync(reglages, 'utf8')).langue === 'fr', 'le choix est écrit dans reglages.json');
  });
  // 3. La page change la langue : le menu suit
  await etape('le bouton de la page passe le menu en allemand', async () => {
    await win.click('#btn-langue');
    await attendre(async () => JSON.stringify(await menu(app)) === JSON.stringify(['Datei', 'Ansicht', 'Werkzeuge', 'Hilfe']), 'le menu passe en allemand');
    await attendre(() => JSON.parse(fs.readFileSync(reglages, 'utf8')).langue === 'de', 'le choix est écrit');
  });
  await etape('la licence est rédigée dans la langue de la page', async () => {
    const l = await win.evaluate(() => window.AktumDesktop.licence());
    assert.ok(l && typeof l.description === 'string' && !/Version non licenciée|Version d’essai/.test(l.description), 'description : ' + (l && l.description));
  });
  await app.close();

  // 4. Au lancement suivant, sans rien imposer : le réglage mémorisé l'emporte sur la langue du système (anglais ici)
  app = await lancer(env);
  win = await fenetrePrete(app);
  await etape('le réglage mémorisé est repris', async () => {
    assert.equal(await win.evaluate(() => document.documentElement.lang), 'de');
    assert.deepEqual(await menu(app), ['Datei', 'Ansicht', 'Werkzeuge', 'Hilfe']);
  });
  await app.close();

  // 5. Sans réglage, la langue du système : l'allemand pour un système en allemand (LANGUAGE sous Linux), le français sinon
  fs.rmSync(reglages, { force: true });
  app = await lancer({ ...env, LANGUAGE: 'de', LC_ALL: 'de_CH.UTF-8', LANG: 'de_CH.UTF-8' });
  win = await fenetrePrete(app);
  await etape('un système en allemand donne une application en allemand', async () => {
    const locale = await app.evaluate(({ app }) => app.getLocale());
    dit('    (locale du système : ' + locale + ')');
    assert.equal(await win.evaluate(() => document.documentElement.lang), /^de/i.test(locale) ? 'de' : 'fr');
  });
  await app.close();

  // 6. La fenêtre de connexion (comptes) en allemand
  const dossierApp = path.join(base, 'comptes');
  fs.mkdirSync(dossierApp, { recursive: true });
  const profil = path.join(base, 'poste');
  app = await lancer({ ...process.env, AKTUM_LANGUE: 'de', AKTUM_DOSSIER_APP: dossierApp, AKTUM_PROFIL: profil, XDG_CONFIG_HOME: profil });
  win = await app.firstWindow();
  await win.waitForLoadState('domcontentloaded');
  await etape('la fenêtre de connexion est en allemand', async () => {
    await attendre(async () => /Wählen Sie Ihr Konto|Konto erstellen|Vor- und Nachname/.test(await win.evaluate(() => document.body.innerText)), 'texte allemand dans la fenêtre de connexion', 20000);
    const texte = await win.evaluate(() => document.body.innerText);
    assert.ok(!/Créer|Choisissez|Mot de passe|Prénom/.test(texte), 'du français est resté : ' + texte.slice(0, 300));
    assert.equal(await win.evaluate(() => document.documentElement.lang), 'de');
  });
  await app.close();

  fs.rmSync(base, { recursive: true, force: true });
  console.log(echecs ? echecs + ' échec(s)' : 'LANGUE OK');
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
