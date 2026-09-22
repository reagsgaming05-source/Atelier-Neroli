/*
 * Les comptes : chacune crée le sien au fur et à mesure, avec un mot de passe,
 * et reste connectée jusqu'à ce qu'elle se déconnecte.
 *
 *   node comptes-test.js                       # depuis les sources
 *   node comptes-test.js chemin\BlonayPDF.exe  # sur le dossier empaqueté
 *
 * Deux choses qu'une relecture ne garantit pas, et qu'on vérifie ici. D'abord
 * qu'une personne ne peut pas ouvrir le compte d'une autre : c'est toute la
 * raison d'être du mot de passe. Ensuite que les affaires sont vraiment
 * séparées — les tampons et les signatures ne vivent pas dans un fichier à
 * nous mais dans le stockage local du moteur d'affichage, qui suit le dossier
 * de données. Fixé trop tard, ou mal, deux personnes les partageraient sans
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
const souffler = (ms) => new Promise((r) => setTimeout(r, ms));

// Le dossier d'essai tient lieu de dossier de l'application, reconnu comme un
// lecteur réseau ; chaque « poste » a son propre profil Windows, pour que la
// connexion retenue ne soit pas commune.
//
// Ce profil se donne par BLONAY_PROFIL et non par APPDATA : sous Windows,
// Electron ne lit pas cette variable, il demande le dossier au système. Les
// postes partageaient donc une seule session, Sophie ouvrait celle de Marie et
// la fenêtre de connexion n'apparaissait jamais. Rien de tel sur un vrai
// secrétariat, où chacune a son profil Windows — mais le test ne prouvait plus
// ce qu'il annonçait.
const profilDe = (poste) => path.join(base, 'poste-' + poste);
const sessionDe = (poste) => path.join(profilDe(poste), 'Blonay PDF', 'session.json');
const lancer = (poste) => {
  const profil = profilDe(poste);
  const env = { ...process.env, BLONAY_DOSSIER_APP: base, BLONAY_RESEAU: '1',
    BLONAY_PROFIL: profil, XDG_CONFIG_HOME: profil };
  return electron.launch(exe ? { executablePath: exe, args: ['--no-sandbox'], env }
    : { args: [path.join(__dirname), '--no-sandbox'], env });
};

// Se connecter fait redémarrer l'application : l'instance relancée échappe au
// pilote et garderait le verrou d'instance unique.
function menage() {
  try {
    if (process.platform === 'win32') require('child_process').execSync('taskkill /F /IM BlonayPDF.exe /T', { stdio: 'ignore' });
    else require('child_process').execSync('pkill -f ' + JSON.stringify('node_modules/electron/dis[t]/electron') + ' || true');
  } catch (e) { /* rien à tuer */ }
}

async function creer(poste, nom, mdp) {
  const e = await lancer(poste);
  const f = await e.firstWindow();
  await f.waitForSelector('#ecran-liste:not([hidden]), #ecran-creation:not([hidden])', { timeout: 60000 });
  if (await f.locator('#ecran-liste').isVisible()) await f.click('#vers-creation');
  await f.fill('#nom', nom);
  await f.fill('#mdp1', mdp);
  await f.fill('#mdp2', mdp);
  await f.click('#creer');
  await souffler(2500);
  await e.close().catch(() => {});
  menage();
}

// Rend le message d'erreur affiché, ou '' quand la connexion est passée.
async function seConnecter(poste, nom, mdp) {
  const e = await lancer(poste);
  const f = await e.firstWindow();
  await f.waitForSelector('#ecran-liste:not([hidden])', { timeout: 60000 });
  await f.locator('.compte', { hasText: nom }).click();
  await f.fill('#mdp', mdp);
  await f.click('#entrer');
  await souffler(2500);
  let erreur = '';
  try { erreur = (await f.locator('#erreur-c').textContent({ timeout: 800 })) || ''; } catch (e2) { /* fenêtre partie */ }
  await e.close().catch(() => {});
  menage();
  return erreur.trim();
}

async function ouvrir(poste) {
  const e = await lancer(poste);
  const f = await e.firstWindow();
  await f.waitForSelector('#app-toolbar:not([hidden])', { timeout: 90000 });
  return { e, f, dossier: await e.evaluate(({ app }) => app.getPath('userData')) };
}
const refermer = async (s) => { await s.e.close().catch(() => {}); await souffler(800); menage(); };

(async () => {
  // Rien n'est préparé : ni liste de noms, ni comptes. Tout se crée à l'usage.
  await creer('bureau-1', 'Marie', 'greffe2026');
  // Avant de s'appuyer dessus : chaque poste a bien sa session, et elle est
  // allée là où le test l'attend. Sans quoi ce qui suit échouerait plus loin,
  // par une attente de fenêtre interminable, au lieu de le dire ici.
  assert.ok(fs.existsSync(sessionDe('bureau-1')), 'la session de Marie est dans le profil du poste 1');
  assert.ok(!fs.existsSync(sessionDe('bureau-2')), 'et le poste 2 n\'en a pas hérité');
  let s = await ouvrir('bureau-1');
  assert.equal(s.dossier, path.join(base, 'data', 'Marie'), 'Marie travaille dans son dossier');
  await s.f.evaluate(() => localStorage.setItem('blonay-tampons', JSON.stringify([{ text: 'REÇU LE' }])));
  await refermer(s);
  dit('Marie : compte créé, ' + s.dossier + ', un tampon mémorisé');

  // La connexion tient : on rouvre sans rien redemander.
  s = await ouvrir('bureau-1');
  assert.notEqual(await s.f.evaluate(() => localStorage.getItem('blonay-tampons')), null,
    'Marie reste connectée et retrouve son tampon');
  await refermer(s);
  dit('Marie : toujours connectée, sans remettre son mot de passe');

  await creer('bureau-2', 'Sophie', 'archives!7');
  s = await ouvrir('bureau-2');
  assert.equal(s.dossier, path.join(base, 'data', 'Sophie'), 'Sophie a son propre dossier');
  assert.equal(await s.f.evaluate(() => localStorage.getItem('blonay-tampons')), null,
    'Sophie ne voit pas le tampon de Marie');
  await refermer(s);
  dit('Sophie : compte créé, ' + s.dossier + ', et aucun tampon de Marie');

  // Le point de la question : on n'entre pas chez quelqu'un d'autre.
  const refus = await seConnecter('bureau-3', 'Marie', 'greffe2025');
  assert.match(refus, /incorrect/i, 'un mauvais mot de passe est refusé');
  assert.equal(fs.existsSync(sessionDe('bureau-3')), false,
    'et aucune session n\'est ouverte pour autant');
  dit('mauvais mot de passe : « ' + refus +' », aucune session ouverte');

  // Le bon mot de passe ouvre, depuis n'importe quel poste.
  assert.equal(await seConnecter('bureau-4', 'Marie', 'greffe2026'), '', 'le bon mot de passe passe');
  s = await ouvrir('bureau-4');
  assert.equal(s.dossier, path.join(base, 'data', 'Marie'), 'Marie retrouve ses affaires sur un autre poste');
  await refermer(s);
  dit('Marie depuis un autre poste : ' + s.dossier);

  // Le mot de passe n'est écrit nulle part.
  const fiche = fs.readFileSync(path.join(base, 'data', 'Marie', 'compte.json'), 'utf8');
  assert.ok(!fiche.includes('greffe2026'), 'la fiche ne contient pas le mot de passe');
  assert.match(fiche, /scrypt/, 'seulement son empreinte');
  dit('fiche de Marie : empreinte scrypt, pas de mot de passe');

  // Les dossiers, et eux seuls : « data » porte aussi des fichiers à nous, dont
  // le jeton qui dit quels postes ont l'application ouverte.
  const dossiers = fs.readdirSync(path.join(base, 'data'), { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name).sort();
  assert.deepEqual(dossiers, ['Marie', 'Sophie'], 'un dossier par personne dans data/');
  dit('data/ : ' + dossiers.join(', '));

  try { fs.rmSync(base, { recursive: true, force: true }); } catch (e) { /* ménage sans importance */ }
  console.log('COMPTES OK');
})().catch((e) => { menage(); console.error(e); process.exit(1); });
