/*
 * Les captures du mode d'emploi, prises sur l'application elle-même.
 *
 *   node captures.js [dossier de sortie]
 *
 * Rien n'est dessiné ni retouché : le script ouvre la fenêtre, y fait les
 * gestes qu'une secrétaire fera, et photographie l'écran obtenu. Une capture
 * qui ne correspond plus au logiciel se voit donc tout de suite, et le guide
 * se refait d'une commande quand l'interface bouge.
 *
 * Le document qui pose est fabriqué par exemple.js : il porte EXEMPLE en
 * filigrane et ne contient aucune donnée réelle.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
// Playwright et Electron sont installés pour l'application fenêtrée ; on
// travaille depuis son dossier pour que les deux se résolvent comme chez elle.
const APP = path.join(__dirname, '..', 'desktop');
process.chdir(APP);
const { _electron: electron } = require(path.join(APP, 'node_modules', 'playwright-core'));
const { fabriquer } = require('./exemple');

const SORTIE = path.resolve(process.argv[2] || path.join(__dirname, 'captures'));
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'blonay-guide-'));
const souffler = (ms) => new Promise((r) => setTimeout(r, ms));
const rates = [];
let faites = 0;

function menage() {
  try { require('child_process').execSync('pkill -f ' + JSON.stringify('node_modules/electron/dis[t]/electron') + ' || true'); }
  catch (e) { /* rien à tuer */ }
}

// Une capture rate rarement seule : si un sélecteur a changé, les suivantes
// suivront. On les tente toutes quand même, et on dit à la fin lesquelles
// manquent — un guide amputé sans prévenir serait pire.
async function prendre(fenetre, nom, avant) {
  try {
    if (avant) await avant();
    await souffler(420);
    await fenetre.screenshot({ path: path.join(SORTIE, nom + '.png') });
    faites++;
    console.log('  ' + nom);
  } catch (e) {
    rates.push(nom + ' : ' + e.message.split('\n')[0]);
    console.log('  ' + nom + ' — RATÉE');
  }
}

const lancer = (env, args) => electron.launch({
  args: [APP, '--no-sandbox', ...(args || [])],
  env: { ...process.env, ...env },
});

// Agrandir la fenêtre ne suffit pas : le gestionnaire de fenêtres peut prendre
// son temps, et la page garderait la hauteur d'avant — la capture montrerait
// alors une bande vide sous l'espace de travail. On attend donc que la page
// elle-même voie la nouvelle taille.
async function poser(app, f, largeur, hauteur) {
  for (let essai = 0; essai < 12; essai++) {
    await app.evaluate(({ BrowserWindow }, d) => {
      const w = BrowserWindow.getAllWindows()[0];
      w.setContentSize(d.l, d.h); w.center();
    }, { l: largeur, h: hauteur });
    await souffler(400);
    const vu = await f.evaluate(() => [window.innerWidth, window.innerHeight]);
    if (Math.abs(vu[0] - largeur) <= 4 && Math.abs(vu[1] - hauteur) <= 4) return;
    if (essai === 11) console.log('  (fenêtre : ' + vu.join('x') + ' au lieu de ' + largeur + 'x' + hauteur + ')');
  }
}

// Le guide s'imprime : le thème clair économise l'encre et se lit mieux. C'est
// celui par défaut ; on s'en assure par le bouton, qui tourne clair → sombre →
// automatique. Surtout pas en rechargeant la page : le document ouvert au
// lancement est dans la fenêtre, pas dans un fichier, et disparaîtrait.
async function themeClair(f) {
  for (let i = 0; i < 3; i++) {
    const quel = await f.evaluate(() => document.documentElement.getAttribute('data-theme'));
    if (quel === 'light') return;
    await f.click('#btn-theme');
    await souffler(250);
  }
}

// ---------------------------------------------------------------- connexion
async function ecransDeConnexion() {
  console.log('Écrans de connexion');
  // Un dossier d'essai ordinaire, sur le disque local : la connexion se demande
  // partout, et les captures montrent ce que voit une collègue.
  const env = { BLONAY_DOSSIER_APP: base };

  // Premier lancement : aucun compte n'existe, l'écran de création s'ouvre.
  let app = await lancer({ ...env, BLONAY_PROFIL: path.join(base, 'poste-1') });
  let f = await app.firstWindow();
  await f.waitForSelector('#ecran-creation:not([hidden]), #ecran-liste:not([hidden])', { timeout: 60000 });
  await prendre(f, 'c1-creation', async () => {
    if (await f.locator('#ecran-liste').isVisible()) await f.click('#vers-creation');
    await f.fill('#nom', 'Marie Dupont');
    await f.fill('#mdp1', 'greffe2026');
    await f.fill('#mdp2', 'greffe2026');
  });
  await f.click('#creer');
  await souffler(2500);
  await app.close().catch(() => {});
  menage();

  // Depuis un autre poste : le compte est dans la liste.
  app = await lancer({ ...env, BLONAY_PROFIL: path.join(base, 'poste-2') });
  f = await app.firstWindow();
  await f.waitForSelector('#ecran-liste:not([hidden])', { timeout: 60000 });
  await prendre(f, 'c2-liste');
  await prendre(f, 'c3-motdepasse', async () => {
    await f.locator('.compte', { hasText: 'Marie Dupont' }).click();
    await f.fill('#mdp', 'greffe2026');
  });
  await app.close().catch(() => {});
  menage();
}

// -------------------------------------------------------------- application
async function ecransDeLApplication() {
  console.log("Écrans de l'application");
  const travail = path.join(base, 'travail');
  fs.mkdirSync(travail, { recursive: true });
  const pdf = path.join(travail, 'reglement-dechets.pdf');
  fs.writeFileSync(pdf, await fabriquer());
  const env = { BLONAY_SMOKE_DIR: travail };

  // La page d'accueil, sans document.
  let app = await lancer(env);
  let f = await app.firstWindow();
  await f.waitForSelector('#app-toolbar:not([hidden])', { timeout: 90000 });
  await poser(app, f, 1280, 820);
  // Sans document, rien ne relance la mise en page après l'agrandissement :
  // l'espace de travail garderait la hauteur d'avant et laisserait une bande
  // vide en bas de la capture.
  await f.evaluate(() => window.dispatchEvent(new Event('resize')));
  await souffler(700);
  await themeClair(f);
  await prendre(f, 'a1-accueil');
  await app.close().catch(() => {});
  menage();

  // Le document ouvert, comme au double-clic sur un PDF.
  app = await lancer(env, [pdf]);
  f = await app.firstWindow();
  await f.waitForSelector('#app-toolbar:not([hidden])', { timeout: 90000 });
  await poser(app, f, 1280, 820);
  await themeClair(f);
  // L'application s'ouvre en lecture : c'est ce qu'on veut voir d'abord.
  await f.waitForSelector('#pages .tile', { state: 'attached', timeout: 90000 });
  await souffler(2400);

  await prendre(f, 'a2-lire');
  await prendre(f, 'a3-selection-texte', async () => {
    const ligne = f.locator('.couche-texte span').filter({ hasText: 'collecte' }).first();
    if (await ligne.count()) await ligne.click({ clickCount: 3 });
  });

  await prendre(f, 'a4-recherche', async () => {
    await f.keyboard.press('Control+f');
    await souffler(500);
    await f.keyboard.type('déchetterie');
    await souffler(1800);
  });
  await f.keyboard.press('Escape');
  await souffler(400);

  await prendre(f, 'a5-organiser', async () => {
    await f.click('[data-vue="organiser"]');
    await f.waitForSelector('#pages .tile', { timeout: 30000 });
    await souffler(1400);
  });

  await prendre(f, 'a6-selection', async () => {
    await f.click('#pages .tile:nth-child(2)');
    await f.click('#pages .tile:nth-child(4)', { modifiers: ['Shift'] });
  });
  await f.keyboard.press('Escape');
  await souffler(400);

  await prendre(f, 'a7-outils', async () => { await f.click('#tab-tools'); });

  await prendre(f, 'a8-editeur', async () => {
    await f.dblclick('#pages .tile:nth-child(2)');
    await souffler(2600);
  });

  // La correction du texte : l'outil repère les lignes et les encadre.
  await prendre(f, 'a9-corriger-texte', async () => {
    await f.click('.ed-tool[data-tool="edittext"]');
    await souffler(3000);
  });

  await prendre(f, 'a10-tampon', async () => {
    await f.click('.ed-tool[data-tool="tampon"]');
    await souffler(1200);
  });
  await f.keyboard.press('Escape');
  await souffler(700);
  await f.locator('.ed-head button', { hasText: 'Terminer' }).click().catch(() => {});
  await souffler(1200);

  await prendre(f, 'a11-exporter', async () => { await f.click('#btn-export'); await souffler(1200); });
  await f.keyboard.press('Escape');
  await souffler(400);

  await prendre(f, 'a12-proteger', async () => {
    await f.click('#tab-tools');
    await f.locator('.tool', { hasText: 'Mot de passe' }).click();
    await souffler(1000);
  });
  await f.keyboard.press('Escape');
  await souffler(400);

  await prendre(f, 'a13-tableau', async () => {
    await f.locator('.tool', { hasText: 'Copier un tableau' }).click();
    await souffler(2500);
    // La page proposée est celle qu'on regarde ; le tarif est en page 5.
    await f.selectOption('#tb-page', { label: 'Page 5' });
    await souffler(2500);
  });
  await f.keyboard.press('Escape');
  await souffler(400);

  await prendre(f, 'a14-dossier', async () => {
    await f.locator('.tool', { hasText: 'Constituer un dossier' }).click();
    await souffler(1000);
  });
  await f.keyboard.press('Escape');

  await app.close().catch(() => {});
  menage();
}

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  await ecransDeConnexion();
  await ecransDeLApplication();
  try { fs.rmSync(base, { recursive: true, force: true }); } catch (e) { /* ménage sans importance */ }
  console.log(faites + ' captures dans ' + SORTIE);
  if (rates.length) { console.error('MANQUANTES :\n  ' + rates.join('\n  ')); process.exit(1); }
  console.log('CAPTURES OK');
})().catch((e) => { menage(); console.error(e); process.exit(1); });
