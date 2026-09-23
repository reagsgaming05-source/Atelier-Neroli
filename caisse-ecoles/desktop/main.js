/*
 * Compta Blonay – application fenêtrée (Electron) : une seule application pour les deux outils.
 *
 * La fenêtre a deux onglets. Le premier charge l'application autonome Caisse écoles
 * (app/Caisse-ecoles.html, produite par `npm run build:public` dans le dossier parent). Le second
 * affiche Décompte DGEO : sa version portable (dossier decompte/ à côté de l'exécutable) est
 * démarrée en mode --web dès l'ouverture, sur un port local libre, et arrêtée avec la fenêtre.
 * Les deux outils partagent le dossier de données `data/` à côté de l'exécutable et un pont :
 * chaque décompte terminé dans Décompte DGEO est proposé comme pièce DECOMPTE dans la caisse.
 * Rien n'est installé, rien n'est écrit dans le registre Windows, aucune connexion réseau
 * n'est ouverte vers l'extérieur.
 */
const { app, BrowserWindow, WebContentsView, Menu, dialog, shell, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
const os = require('os');
const nativeOcr = require('./native-ocr.js');
const dgeoProxy = require('./dgeo-proxy.js');
const { creerVeille } = require('./veille.js');

const APP_TITLE = 'Compta Blonay';
const PORTABLE_DIR = path.dirname(process.execPath);

// Français, quelle que soit la langue de Windows. Les champs « date » ne sont pas dessinés par la
// page : Chromium les habille dans SA langue, et sur un poste en anglais le gabarit passe à
// « mm/dd/yyyy » — 03/09/2026 se lit alors 9 mars, et une date de pièce lue à l'envers ne se voit
// pas avant le bouclement. Vérifié en photographiant le champ avec et sans ce commutateur.
// (Le bouton des champs « fichier » reste « Choose File » : ce texte-là ne suit pas le réglage.)
// Le commutateur doit être posé avant que l'application ne soit prête.
app.commandLine.appendSwitch('lang', 'fr-CH');

// Dossier de données à côté de l'exécutable (version portable) ; sinon, dossier utilisateur.
let raisonDonneesAilleurs = '';
function setupUserData() {
  if (!app.isPackaged) return;
  const dir = path.join(PORTABLE_DIR, 'data');
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    app.setPath('userData', dir);
  } catch (e) {
    // Dossier non inscriptible : Program Files, ou un partage réseau où l'on n'a que la lecture.
    // On repart sur l'emplacement par défaut de Windows, et on retient POURQUOI : sans cette
    // raison, une application posée sur le serveur qui ne retrouve plus ses registres — ou qui
    // ne s'ouvre pas du tout, le verrou d'instance unique étant alors partagé avec une autre
    // copie — reste une énigme.
    raisonDonneesAilleurs = `${path.join(PORTABLE_DIR, 'data')} n'est pas inscriptible (${(e && e.code) || e})`;
  }
}
setupUserData();

// Journal du processus principal (data/caisse.log) : démarrage, erreurs, lecteur natif.
// Comme decompte.log de Décompte DGEO, pour comprendre un problème sur un poste.
function logLine(msg) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  try { fs.appendFileSync(path.join(app.getPath('userData'), 'caisse.log'), line); } catch (e) { /* ignore */ }
  if (!app.isPackaged) process.stdout.write(line);
}
process.on('uncaughtException', (e) => { logLine(`ERREUR ${e && e.stack ? e.stack : e}`); });
process.on('unhandledRejection', (e) => { logLine(`ERREUR (promesse) ${e && e.stack ? e.stack : e}`); });

// Une seule instance de l'application. Un deuxième lancement ne s'ouvre pas : il réveille la
// fenêtre déjà ouverte (voir « second-instance » plus bas). Mais le verrou porte sur le DOSSIER DE
// DONNÉES, pas sur l'exécutable : deux copies dont les données atterrissent au même endroit — ce
// qui arrive dès qu'un `data/` n'est pas inscriptible — se le disputent, et la seconde se ferme
// sans un mot. On l'écrit au journal avant de partir : c'est la seule trace d'une application qui
// « ne se lance pas ».
if (!app.requestSingleInstanceLock()) {
  logLine(`démarrage abandonné : une autre instance tient déjà les données ${app.getPath('userData')}`
    + (raisonDonneesAilleurs ? ` — ${raisonDonneesAilleurs}` : ''));
  app.quit();
}

/** Fichier des noms de personnes (données personnelles, jamais dans le dépôt) posé à côté de l'exe. */
function namesFile() {
  const candidates = [path.join(PORTABLE_DIR, 'vocabulaire-noms.js'), path.join(app.getPath('userData'), 'vocabulaire-noms.js')];
  if (!app.isPackaged) candidates.push(path.join(__dirname, '..', 'src', 'vocabulaire-noms.js'));
  return candidates.find((p) => fs.existsSync(p)) || null;
}

let mainWindow = null;
let caisseView = null;
let dgeoView = null;
let activeTab = 'caisse';
let dgeoEmbed = null; // zone (px CSS de la page Caisse écoles) où la page Décompte DGEO s'affiche, ou null
const TAB_H = 46; // hauteur de la barre d'onglets (shell.html)

// La page Caisse écoles occupe toute la fenêtre sous la barre ; la page Décompte DGEO est posée
// par-dessus, dans la zone que la barre latérale lui réserve (espace « Décompte DGEO »).
function layoutViews() {
  if (!mainWindow) return;
  const [w, h] = mainWindow.getContentSize();
  if (caisseView) { caisseView.setBounds({ x: 0, y: TAB_H, width: w, height: Math.max(0, h - TAB_H) }); caisseView.setVisible(true); }
  if (dgeoView) {
    if (dgeoEmbed) {
      const z = caisseView ? caisseView.webContents.getZoomFactor() : 1;
      const r = (v) => Math.max(0, Math.round(v * z));
      dgeoView.setBounds({ x: r(dgeoEmbed.x), y: TAB_H + r(dgeoEmbed.y), width: Math.max(1, r(dgeoEmbed.width)), height: Math.max(1, r(dgeoEmbed.height)) });
      dgeoView.setVisible(true);
    } else dgeoView.setVisible(false);
  }
  activeTab = dgeoEmbed ? 'dgeo' : 'caisse';
}

function caissePreferences() {
  return {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false, // le preload lit le fichier des noms
    spellcheck: false,
    additionalArguments: [`--caisse-names=${namesFile() || ''}`, `--caisse-version=${app.getVersion()}`],
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 600,
    title: APP_TITLE,
    backgroundColor: '#1f4e79',
    show: false,
    icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'shell-preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  mainWindow.on('page-title-updated', (ev) => ev.preventDefault());
  mainWindow.loadFile(path.join(__dirname, 'shell.html'));

  // Onglet 1 : Caisse écoles (application autonome)
  caisseView = new WebContentsView({ webPreferences: caissePreferences() });
  mainWindow.contentView.addChildView(caisseView);
  caisseView.webContents.loadFile(path.join(__dirname, 'app', 'Caisse-ecoles.html'));
  // Le rapport de contrôle s'ouvre dans une fenêtre de l'application (imprimable avec Ctrl+P)
  caisseView.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'about:blank' || url.startsWith('file:') || url.startsWith('blob:')) {
      // rapport de contrôle, fiche PDF à imprimer (visionneuse PDF de Chromium, Ctrl+P), récapitulatifs
      return { action: 'allow', overrideBrowserWindowOptions: { width: 1000, height: 860, title: `${APP_TITLE} – document`, autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false, plugins: true } } };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });
  caisseView.webContents.once('did-finish-load', () => { if (mainWindow && !mainWindow.isVisible()) { mainWindow.show(); logLine('interface démarrée'); } });

  // La veille ne tourne que quand la page peut répondre. C'est elle qui lit les piles : tant que
  // son code n'est pas en place, un scan qui lui serait confié partirait dans le vide, et le
  // fichier finirait dans « À revoir » au bout des dix minutes d'attente — alors qu'il n'a rien.
  // Laissé dans le dossier du copieur, il sera simplement pris au tour suivant.
  caisseView.webContents.on('did-finish-load', () => { caissePrete = true; demarrerVeille(); });
  // Seulement la page elle-même : « did-start-loading » se déclenche aussi pour un cadre interne,
  // et l'aperçu d'un PDF en est un — la veille se serait arrêtée au premier aperçu sans repartir.
  caisseView.webContents.on('did-start-navigation', (a, b, c, d) => {
    const principal = a && typeof a === 'object' && 'isMainFrame' in a ? a.isMainFrame : d; // deux signatures selon la version d'Electron
    if (!principal) return;
    caissePrete = false;
    if (veille) { veille.arreter(); logLine('veille en pause : la page se recharge'); }
  });

  // Onglet 2 : Décompte DGEO (serveur local embarqué, démarré avec l'application)
  dgeoView = new WebContentsView({ webPreferences: { contextIsolation: true, nodeIntegration: false } });
  mainWindow.contentView.addChildView(dgeoView);
  dgeoView.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  // même aspect que Caisse écoles : thème (police, couleurs, arrondis) injecté dans la page de Décompte DGEO
  dgeoView.webContents.on('did-finish-load', () => {
    if (!dgeoView || !dgeo.url || !dgeoView.webContents.getURL().startsWith(dgeo.url)) return;
    // feuille ajoutée en fin de document pour passer après la feuille de style de Décompte DGEO
    const css = dgeoTheme();
    if (!css) return;
    dgeoView.webContents.executeJavaScript(`(function(){var s=document.getElementById('compta-theme')||document.createElement('style');s.id='compta-theme';s.textContent=${JSON.stringify(css)};document.documentElement.appendChild(s);})()`, true)
      .catch((e) => logLine(`thème DGEO : ${e.message}`));
  });
  dgeoView.webContents.loadURL(dgeoPlaceholder('Décompte DGEO', 'Démarrage du logiciel de décompte…', true));
  launchDgeo().catch((e) => logLine(`Décompte DGEO : ${(e && e.message) || e}`));

  mainWindow.on('resize', layoutViews);
  mainWindow.on('closed', () => { mainWindow = null; caisseView = null; dgeoView = null; });
  layoutViews();
  setTimeout(() => { if (mainWindow && !mainWindow.isVisible()) mainWindow.show(); }, 4000);
}

let dgeoThemeCss = null;
function dgeoTheme() {
  if (dgeoThemeCss != null) return dgeoThemeCss;
  try {
    const font = fs.readFileSync(path.join(__dirname, 'app', 'fonts', 'inter-latin-wght-normal.woff2')).toString('base64');
    const face = `@font-face{font-family:"Inter Variable";font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,${font}) format("woff2-variations")}\n`;
    dgeoThemeCss = face + fs.readFileSync(path.join(__dirname, 'dgeo-theme.css'), 'utf8');
  } catch (e) { logLine(`thème DGEO indisponible : ${e.message}`); dgeoThemeCss = ''; }
  return dgeoThemeCss;
}

function dgeoPlaceholder(title, message, spinner) {
  const html = `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font-family:Inter,'Segoe UI',Arial,sans-serif;background:#f4f6fa;color:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center;max-width:560px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:34px 40px;box-shadow:0 1px 2px rgba(15,23,42,.05)">${spinner ? '<div style="width:34px;height:34px;margin:0 auto 16px;border:3px solid #e2e8f0;border-top-color:#2457d6;border-radius:50%;animation:s 1s linear infinite"></div><style>@keyframes s{to{transform:rotate(360deg)}}</style>' : ''}<h2 style="margin:0 0 8px;font-size:18px;letter-spacing:-.01em">${title}</h2><p style="color:#64748b;margin:0;line-height:1.5">${message}</p>${spinner ? '<p style="color:#94a3b8;font-size:12.5px;margin:12px 0 0">Cela prend quelques secondes au premier lancement…</p>' : ''}</div></body>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

/* ---------------- Décompte DGEO : serveur local embarqué ---------------- */
// Le dossier decompte/ (version portable de Décompte DGEO) est posé à côté de l'exécutable ;
// son serveur est lancé en mode --web sur un port libre et affiché dans le second onglet.
// En développement : DECOMPTE_CMD (ex. « python -m decompte ») avec DECOMPTE_CWD.
const dgeo = { proc: null, url: null, target: null, proxy: null, status: 'off', starting: null, lastExcelId: null, lastExcelAt: 0 };

/** État de la fenêtre pour la barre d'onglets (et le test de fumée). */
function shellState() {
  return { active: activeTab, embedded: !!dgeoEmbed, dgeo: dgeo.status, hasDgeo: !!dgeoCommand(), decomptes: loadDecomptes().filter((d) => !d.saisi).length };
}
function pushShellState() {
  const st = shellState();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('shell:state', st);
  notifyCaisse('shell:state', st);
}
function notifyCaisse(channel, payload) {
  if (caisseView && !caisseView.webContents.isDestroyed()) caisseView.webContents.send(channel, payload);
}

function dgeoCommand() {
  if (process.env.DECOMPTE_CMD) {
    const parts = process.env.DECOMPTE_CMD.split(/\s+/);
    // chemin vers un fichier : vérifié tout de suite, pour dire « non inclus » plutôt que d'attendre
    // l'échec du lancement (un simple nom de commande est laissé au PATH)
    const cwd = process.env.DECOMPTE_CWD || PORTABLE_DIR;
    if (/[\\/]/.test(parts[0]) && !fs.existsSync(path.resolve(cwd, parts[0]))) { logLine(`DECOMPTE_CMD introuvable : ${parts[0]}`); return null; }
    return { cmd: parts[0], args: parts.slice(1), cwd };
  }
  const exe = path.join(PORTABLE_DIR, 'decompte', process.platform === 'win32' ? 'DecompteDGEO.exe' : 'DecompteDGEO');
  if (fs.existsSync(exe)) return { cmd: exe, args: [], cwd: path.dirname(exe) };
  return null;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => { const port = srv.address().port; srv.close(() => resolve(port)); });
    srv.on('error', reject);
  });
}

function httpOk(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => { res.resume(); resolve(res.statusCode === 200); });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

async function startDgeo() {
  if (dgeo.status === 'ready') return dgeo.url;
  if (dgeo.starting) return dgeo.starting.catch(() => null); // l'échec est signalé à l'appelant qui a lancé le démarrage
  dgeo.starting = (async () => {
    const c = dgeoCommand();
    if (!c) { dgeo.status = 'missing'; return null; }
    const port = await freePort();
    const dataDir = path.join(app.getPath('userData'), 'decompte');
    fs.mkdirSync(dataDir, { recursive: true });
    const args = c.args.concat(['--web', '--no-browser', '--host', '127.0.0.1', '--port', String(port)]);
    logLine(`Décompte DGEO : ${c.cmd} ${args.join(' ')}`);
    const env = Object.assign({}, process.env, { DECOMPTE_DATA: dataDir, PYTHONUNBUFFERED: '1' });
    // Tesseract de Caisse écoles partagé si Décompte DGEO n'a pas le sien
    if (!env.TESSERACT_CMD && !fs.existsSync(path.join(path.dirname(c.cmd), 'tesseract'))) {
      const t = nativeOcr.detect(PORTABLE_DIR);
      if (t && t.cmd.includes(path.sep)) env.TESSERACT_CMD = t.cmd;
    }
    dgeo.status = 'starting';
    const child = spawn(c.cmd, args, { cwd: c.cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    dgeo.proc = child;
    child.stdout.on('data', (d) => logLine(`[dgeo] ${String(d).trim()}`));
    child.stderr.on('data', (d) => logLine(`[dgeo] ${String(d).trim()}`));
    // Arrêt du programme : la passerelle qui le précède est fermée avec lui, sinon un relancement
    // laisserait l'ancienne à l'écoute. Le garde « dgeo.proc !== child » laisse tranquille un
    // programme déjà relancé, et l'arrêt volontaire (stopDgeo) qui a déjà tout remis à zéro.
    const stopped = (title, detail, msg) => {
      if (dgeo.proc !== child) return;
      logLine(msg);
      dgeo.proc = null;
      if (dgeo.proxy) { try { dgeo.proxy.close(); } catch (e) { /* ignore */ } dgeo.proxy = null; }
      dgeo.url = null; dgeo.target = null;
      dgeo.status = dgeo.status === 'ready' ? 'off' : 'failed';
      if (dgeoView && !app.isQuitting) dgeoView.webContents.loadURL(dgeoPlaceholder(title, detail));
      pushShellState();
    };
    // « error » : le programme n'a pas pu être lancé (introuvable, droits refusés, DECOMPTE_CMD
    // erroné). « exit » n'est alors jamais émis : sans cet écouteur, Node arrête l'application et
    // l'attente ci-dessous tournerait 90 secondes dans le vide.
    child.on('error', (e) => stopped('Décompte DGEO n\'a pas pu démarrer', `Le logiciel de décompte n'a pas pu être lancé (${e.message}). Détails dans data/caisse.log.`, `Décompte DGEO : lancement impossible (${e.message})`));
    child.on('exit', (code) => stopped('Décompte DGEO arrêté', "Le logiciel de décompte s'est arrêté. Cliquez sur l'onglet pour le relancer (détails dans data/caisse.log).", `Décompte DGEO arrêté (code ${code})`));
    const url = `http://127.0.0.1:${port}/`;
    for (let i = 0; i < 180; i++) {
      if (!dgeo.proc) break;
      if (await httpOk(url + 'api/health')) {
        // passerelle devant Décompte DGEO : le dossier PDF est nettoyé (pièce comptable retirée) avant l'analyse
        dgeo.target = url;
        try {
          dgeo.proxy = await dgeoProxy.startProxy({ target: url, clean: cleanDossierViaPage, onCleaned: (info) => notifyCaisse('dgeo:cleaned', info), onAnalysed: recordDossier, log: logLine });
          dgeo.url = dgeo.proxy.url;
        } catch (e) { logLine(`passerelle Décompte DGEO indisponible (${e.message}) : accès direct`); dgeo.url = url; }
        dgeo.status = 'ready';
        logLine(`Décompte DGEO prêt : ${url} (affiché via ${dgeo.url})`);
        return dgeo.url;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (dgeo.status !== 'ready') dgeo.status = 'failed';
    return null;
  })();
  try { return await dgeo.starting; }
  catch (e) { dgeo.status = 'failed'; logLine(`Décompte DGEO : démarrage impossible (${(e && e.message) || e})`); return null; }
  finally { dgeo.starting = null; }
}

function stopDgeo() {
  if (dgeo.proxy) { try { dgeo.proxy.close(); } catch (e) { /* ignore */ } dgeo.proxy = null; }
  if (!dgeo.proc) return;
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(dgeo.proc.pid), '/T', '/F'], { windowsHide: true });
    else dgeo.proc.kill('SIGTERM');
  } catch (e) { /* ignore */ }
  dgeo.proc = null;
  dgeo.status = 'off';
}

/** Démarre Décompte DGEO (à l'ouverture de la fenêtre, ou pour le relancer) et affiche sa page dans l'onglet. */
async function launchDgeo() {
  if (!dgeoCommand()) {
    dgeo.status = 'missing';
    if (dgeoView) dgeoView.webContents.loadURL(dgeoPlaceholder('Décompte DGEO non inclus', "Le dossier « decompte » (version portable de Décompte DGEO) n'est pas à côté de ComptaBlonay.exe. Téléchargez le zip complet depuis la page Releases."));
    pushShellState();
    return null;
  }
  if (dgeo.status !== 'ready' && dgeoView) dgeoView.webContents.loadURL(dgeoPlaceholder('Décompte DGEO', 'Démarrage du logiciel de décompte…', true));
  pushShellState();
  const url = await startDgeo();
  if (!dgeoView) return url;
  if (url) { if (!dgeoView.webContents.getURL().startsWith(url)) dgeoView.webContents.loadURL(url); }
  else dgeoView.webContents.loadURL(dgeoPlaceholder('Décompte DGEO ne répond pas', "Le serveur local n'a pas démarré. Cliquez sur l'onglet pour réessayer ; détails dans data/caisse.log."));
  pushShellState();
  return url;
}

/** Ouvre un espace de la barre latérale de Caisse écoles (menu, raccourcis, anciens appels « onglet »). */
function openPanel(id) { notifyCaisse('app:panel', id); }
function showTab(name) { openPanel(name === 'dgeo' ? 'panelDgeo' : 'panelSaisie'); }

// La page Caisse écoles indique où afficher Décompte DGEO (espace ouvert) ou null (autre espace).
ipcMain.on('dgeo:embed', (ev, rect) => {
  dgeoEmbed = rect && typeof rect === 'object' ? { x: Number(rect.x) || 0, y: Number(rect.y) || 0, width: Number(rect.width) || 0, height: Number(rect.height) || 0 } : null;
  layoutViews();
  pushShellState();
  if (dgeoEmbed && dgeoView) {
    if (dgeo.status === 'ready') { if (!dgeoView.webContents.getURL().startsWith(dgeo.url)) dgeoView.webContents.loadURL(dgeo.url); }
    else if (dgeo.status !== 'starting') launchDgeo().catch((e) => logLine(`Décompte DGEO : ${(e && e.message) || e}`)); // non démarré, arrêté ou en échec : nouvel essai
  }
});
ipcMain.on('shell:tab', (ev, name) => { showTab(name === 'dgeo' ? 'dgeo' : 'caisse'); });
// raccourcis de la barre latérale vers les sections de la page Décompte DGEO (ids de sa page)
ipcMain.on('dgeo:scroll', (ev, sectionId) => {
  if (!dgeoView || dgeo.status !== 'ready' || !/^[a-z-]{1,40}$/.test(String(sectionId))) return;
  dgeoView.webContents.executeJavaScript(`(function(){var el=document.getElementById(${JSON.stringify(String(sectionId))});if(el&&!el.hidden){el.scrollIntoView({behavior:'smooth',block:'start'});}else{window.scrollTo({top:0,behavior:'smooth'});}})()`, true).catch(() => {});
});
ipcMain.handle('shell:state', () => shellState());

/* ---------------- Réglages (data/caisse/reglages.json) ---------------- */
const SETTINGS_FILE = () => path.join(REG_ROOT(), 'reglages.json');
const SETTINGS_DEFAULT = {
  dgeoSkipFirst: true,
  // Veille du dossier scanné. Une LISTE de dossiers, pas un chemin : un copieur sait souvent
  // envoyer vers plusieurs destinations (un bouton = un dossier), et cela ne coûte rien de plus.
  scanDossiers: [],
  scanActif: true,
  scanIntervalle: 5000,
  // Ranger sans demander. Décoché au départ, et c'est voulu : un classement qui se trompe une
  // fois sur dix coûte plus cher que pas de classement du tout.
  scanAuto: false,
};
function loadSettings() {
  try { return Object.assign({}, SETTINGS_DEFAULT, JSON.parse(fs.readFileSync(SETTINGS_FILE(), 'utf8'))); } catch (e) { return Object.assign({}, SETTINGS_DEFAULT); }
}
function saveSettings(patchObj) {
  const s = Object.assign(loadSettings(), patchObj || {});
  fs.mkdirSync(REG_ROOT(), { recursive: true });
  fs.writeFileSync(SETTINGS_FILE(), JSON.stringify(s, null, 1));
  return s;
}
ipcMain.handle('settings:get', () => loadSettings());
ipcMain.handle('settings:set', (ev, patchObj) => saveSettings(patchObj && typeof patchObj === 'object' ? patchObj : {}));

/* ---------------- Veille du dossier scanné ---------------- */
/*
 * Le copieur dépose ses PDF dans un dossier du serveur ; la veille les y prend et les confie à la
 * page, qui a pdf.js, l'OCR et l'analyseur. Même mécanisme que le nettoyage des dossiers DGEO
 * ci-dessous : le processus principal ne lit aucun PDF lui-même.
 *
 * Le dossier de réception (les documents découpés, en attente de validation) vit dans les données
 * de l'application, pas sur le partage : ce qui attend une validation attend sur ce poste.
 */
const RECEPTION = () => path.join(REG_ROOT(), 'reception');
/**
 * Le dépôt de l'application : le dossier où le copieur envoie directement, sans qu'on ait rien à
 * régler dans l'application. Il vit dans les données, donc à côté de l'exécutable — et si le
 * dossier ComptaBlonay est posé sur le serveur, ce chemin EST une adresse du serveur, que le
 * copieur peut viser tel quel. Surveillé d'office, il ne se retire pas.
 *
 * Le nom est court, sans accent et sans espace : il finit tapé dans le carnet d'adresses du
 * copieur, et les vieux appareils y sont regardants. Il est à la racine des données plutôt que
 * sous caisse/ pour que l'adresse à donner soit la plus courte possible.
 */
const DEPOT = () => path.join(app.getPath('userData'), 'Scans');
/** Une adresse que le copieur peut viser : \\serveur\partage\… */
const estReseau = (p) => /^\\\\[^\\]/.test(String(p || ''));
let veille = null;
/** La page Caisse écoles a fini de charger : elle écoute les scans entrants (voir reception.js). */
let caissePrete = false;
const scansEnCours = new Map();
let scanSeq = 0;

/** Confie un scan à la page et attend sa réponse. Sans page, le fichier n'est pas pris. */
function lireScanDansLaPage(nom, octets) {
  return new Promise((resolve) => {
    if (!caisseView || caisseView.webContents.isDestroyed() || !caissePrete) { resolve({ ok: false, raison: "l'application n'est pas encore prête" }); return; }
    const id = ++scanSeq;
    scansEnCours.set(id, resolve);
    caisseView.webContents.send('scan:entrant', { id, nom, octets, auto: loadSettings().scanAuto === true });
    // une pile de trente pages passée à l'OCR peut être longue : on laisse le temps, mais pas l'éternité
    setTimeout(() => {
      if (scansEnCours.delete(id)) resolve({ ok: false, raison: 'la lecture a dépassé dix minutes' });
    }, 600000);
  });
}
ipcMain.on('scan:resultat', (ev, r) => {
  if (!r || typeof r !== 'object') return;
  const resolve = scansEnCours.get(r.id);
  if (!resolve) return;
  scansEnCours.delete(r.id);
  resolve({ ok: !!r.ok, raison: String(r.raison || ''), nom: r.nom ? String(r.nom) : '' });
});

/** Le dépôt de l'application d'abord, puis les dossiers ajoutés à la main. */
function dossiersSurveilles() {
  const depot = DEPOT();
  try { fs.mkdirSync(depot, { recursive: true }); } catch (e) { /* signalé par la veille */ }
  const ajoutes = (loadSettings().scanDossiers || [])
    .filter((d) => d && d.chemin && path.resolve(d.chemin) !== path.resolve(depot));
  return [{ chemin: depot, depot: true }].concat(ajoutes);
}

function demarrerVeille() {
  const s = loadSettings();
  if (veille) veille.arreter();
  // appelée au chargement de la page, au changement de réglages et par « Regarder maintenant »
  if (!caissePrete) { logLine('veille en attente : la page Caisse écoles n\'est pas encore chargée'); return veille; }
  veille = creerVeille({
    dossiers: dossiersSurveilles,
    poste: os.hostname(),
    journal: logLine,
    traiter: ({ nom, octets }) => lireScanDansLaPage(nom, octets),
  });
  if (s.scanActif !== false) veille.demarrer(Number(s.scanIntervalle) || 5000);
  return veille;
}

ipcMain.handle('scan:etat', () => {
  const s = loadSettings();
  const depot = DEPOT();
  return Object.assign({
    depot,
    depotReseau: estReseau(depot),
    dossiers: (s.scanDossiers || []).filter((d) => d && d.chemin && path.resolve(d.chemin) !== path.resolve(depot)),
    actif: s.scanActif !== false,
    auto: s.scanAuto === true,
    intervalle: s.scanIntervalle || 5000,
    reception: RECEPTION(),
  }, veille ? veille.etat() : { poste: os.hostname(), tours: 0, traites: 0, revoir: 0, erreurs: 0 }, {
    // « actif » ci-dessus est la case à cocher : ce que la personne a demandé. Celui-ci dit si la
    // veille tourne VRAIMENT — elle n'est mise en route qu'une fois la page capable de lire une
    // pile, et elle s'arrête le temps d'un rechargement.
    veilleEnMarche: !!(veille && veille.etat().actif),
  });
});
ipcMain.handle('scan:ouvrir-depot', () => { try { fs.mkdirSync(DEPOT(), { recursive: true }); } catch (e) { /* ignore */ } return shell.openPath(DEPOT()); });
ipcMain.handle('scan:regler', (ev, patchObj) => {
  const p = patchObj && typeof patchObj === 'object' ? patchObj : {};
  const propre = {};
  if (Array.isArray(p.scanDossiers)) {
    propre.scanDossiers = p.scanDossiers
      .map((d) => ({ chemin: String((d && d.chemin) || '').trim() }))
      .filter((d) => d.chemin).slice(0, 10);
  }
  if (typeof p.scanActif === 'boolean') propre.scanActif = p.scanActif;
  if (typeof p.scanAuto === 'boolean') propre.scanAuto = p.scanAuto;
  const s = saveSettings(propre);
  demarrerVeille();
  return s;
});
ipcMain.handle('scan:choisir-dossier', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Dossier où le copieur dépose ses scans',
    properties: ['openDirectory'],
    buttonLabel: 'Surveiller ce dossier',
  });
  return r.canceled || !r.filePaths.length ? null : r.filePaths[0];
});
/** Un tour tout de suite, sans attendre le minuteur (bouton « Regarder maintenant »). */
ipcMain.handle('scan:regarder', async () => {
  if (!veille) demarrerVeille();
  if (!veille) return { reserves: 0, attentes: 0, erreurs: ["l'application n'est pas encore prête"] };
  const r = await veille.tour();
  return { reserves: r.reserves.length, attentes: r.attentes.length, erreurs: r.erreurs.map((e) => e.message) };
});

/* La réception : les documents découpés, en attente de validation. */
const recOk = (id) => /^[A-Za-z0-9_-]{1,60}$/.test(String(id));
ipcMain.handle('reception:deposer', (ev, id, fiche, octets) => {
  if (!recOk(id)) throw new Error('identifiant invalide');
  const dir = path.join(RECEPTION(), String(id));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'document.pdf'), Buffer.from(octets));
  fs.writeFileSync(path.join(dir, 'fiche.json'), JSON.stringify(fiche || {}, null, 1));
  return true;
});
ipcMain.handle('reception:liste', () => {
  try {
    return fs.readdirSync(RECEPTION()).filter(recOk).map((id) => {
      try {
        const fiche = JSON.parse(fs.readFileSync(path.join(RECEPTION(), id, 'fiche.json'), 'utf8'));
        return Object.assign({ id }, fiche);
      } catch (e) { return { id, abime: true }; }
    });
  } catch (e) { return []; }
});
ipcMain.handle('reception:lire', (ev, id) => {
  if (!recOk(id)) throw new Error('identifiant invalide');
  const f = path.join(RECEPTION(), String(id), 'document.pdf');
  return fs.existsSync(f) ? fs.readFileSync(f) : null;
});
ipcMain.handle('reception:retirer', (ev, id) => {
  if (!recOk(id)) throw new Error('identifiant invalide');
  fs.rmSync(path.join(RECEPTION(), String(id)), { recursive: true, force: true });
  return true;
});
ipcMain.handle('reception:ouvrir-dossier', () => shell.openPath(RECEPTION()));

/*
 * Le bac à courrier des décomptes : en plus d'être attaché à sa ligne du journal, un décompte
 * scanné est posé dans un dossier qu'on ouvre dans l'explorateur. La page dit où (voir pile.js) ;
 * ici on écrit, et on refuse tout ce qui sortirait des données de l'application — un chemin
 * venu de la page ne décide pas où l'on écrit sur le disque.
 */
const DECOMPTES = () => path.join(app.getPath('userData'), 'Décomptes');
/**
 * Le dossier désigné par la page, ramené à un chemin sous les données de l'application.
 *
 * On valide segment par segment plutôt que de s'en remettre à `path.resolve` : sous Linux,
 * « ..\..\x » n'est qu'un nom de fichier et resolve le laisse passer ; sous Windows c'est une
 * remontée de deux crans. Un garde-fou dont la justesse dépend du système qui lit la chaîne n'est
 * pas un garde-fou. Nos propres chemins (voir pile.js) ne sont faits que de segments simples
 * séparés par « / » — tout le reste est refusé, et la résolution le revérifie ensuite.
 */
const SEGMENT_INTERDIT = /[<>:"\\|?*]|[\u0000-\u001f]/;
function sousDossierSur(relatif) {
  const racine = app.getPath('userData');
  const brut = String(relatif || '').trim();
  if (!brut) return racine;
  const segments = brut.split('/');
  for (const seg of segments) {
    if (!seg || seg === '.' || seg === '..' || SEGMENT_INTERDIT.test(seg) || /^[. ]+$|[. ]$/.test(seg)) {
      throw new Error(`dossier refusé : « ${seg} »`);
    }
  }
  const cible = path.resolve(racine, segments.join(path.sep));
  if (cible !== racine && !cible.startsWith(racine + path.sep)) throw new Error('dossier hors des données de l\'application');
  return cible;
}
ipcMain.handle('classement:poser', (ev, sousDossier, nom, octets) => {
  const dir = sousDossierSur(sousDossier);
  const fichier = path.join(dir, safeName(nom));
  if (!fichier.startsWith(dir + path.sep)) throw new Error('nom de fichier invalide');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fichier, Buffer.from(octets));
  return fichier;
});
ipcMain.handle('classement:ouvrir', (ev, sousDossier) => {
  const dir = sousDossier ? sousDossierSur(sousDossier) : DECOMPTES();
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { /* ignore */ }
  return shell.openPath(dir);
});
ipcMain.handle('classement:racine', () => DECOMPTES());
/**
 * Déplace un scan d'un bac à l'autre : « à faire » -> « fait », quand la personne coche dans
 * l'application. Sans cela l'écran et le dossier se contrediraient, et c'est le dossier qu'on
 * ouvre quand on est pressé. Un fichier absent (déplacé à la main, jamais scanné) n'est pas une
 * erreur : il n'y a simplement rien à déplacer.
 */
ipcMain.handle('classement:deplacer', (ev, deSous, versSous, nom) => {
  const propre = safeName(nom);
  const source = path.join(sousDossierSur(deSous), propre);
  if (!fs.existsSync(source)) return { deplace: false, raison: 'absent' };
  const dest = sousDossierSur(versSous);
  fs.mkdirSync(dest, { recursive: true });
  let cible = path.join(dest, propre);
  const ext = path.extname(propre); const stem = propre.slice(0, propre.length - ext.length);
  let k = 1;
  while (fs.existsSync(cible)) cible = path.join(dest, `${stem} (${k++})${ext}`);
  fs.renameSync(source, cible);
  return { deplace: true, chemin: cible };
});

/* ---------------- Nettoyage du dossier DGEO par la page Caisse écoles ---------------- */
// La page a déjà pdf.js, pdf-lib et l'analyseur des pièces : la passerelle lui confie le dossier,
// elle retire les pages « PIÈCE COMPTABLE » et renvoie le PDF (src/dossier.js).
const pendingClean = new Map();
let cleanSeq = 0;
function cleanDossierViaPage(bytes, filename) {
  return new Promise((resolve) => {
    if (!caisseView || caisseView.webContents.isDestroyed()) { resolve(null); return; }
    const id = ++cleanSeq;
    pendingClean.set(id, resolve);
    caisseView.webContents.send('dgeo:clean', { id, bytes, filename, skipFirst: loadSettings().dgeoSkipFirst !== false });
    setTimeout(() => { if (pendingClean.delete(id)) { logLine('nettoyage du dossier : pas de réponse de la page, dossier transmis tel quel'); resolve(null); } }, 120000);
  });
}
ipcMain.on('dgeo:clean-result', (ev, r) => {
  if (!r || typeof r !== 'object') return;
  const resolve = pendingClean.get(r.id);
  if (!resolve) return;
  pendingClean.delete(r.id);
  resolve({ bytes: r.bytes ? Buffer.from(r.bytes) : null, removed: Array.isArray(r.removed) ? r.removed : [], total: Number(r.total) || 0, reason: String(r.reason || '') });
});

/* ---------------- Dossiers analysés par Décompte DGEO (formulaire affiché dans l'application) ---------------- */
// Chaque dossier analysé (réponse de Décompte DGEO) est résumé dans data/caisse/dossiers-dgeo.json :
// pages (dont le formulaire de couverture, image servie par Décompte DGEO) et champs lus.
const DOSSIERS_FILE = () => path.join(REG_ROOT(), 'dossiers-dgeo.json');
function loadDossiers() {
  try { const a = JSON.parse(fs.readFileSync(DOSSIERS_FILE(), 'utf8')); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
const withBase = (d) => Object.assign({}, d, { base: dgeo.url || '' });
function recordDossier(info) {
  if (!info || !info.id) return;
  const list = loadDossiers().filter((d) => d.id !== info.id);
  list.unshift(info);
  fs.mkdirSync(REG_ROOT(), { recursive: true });
  fs.writeFileSync(DOSSIERS_FILE(), JSON.stringify(list.slice(0, 30), null, 1));
  logLine(`dossier analysé par Décompte DGEO : ${info.filename} – ${info.activite || '?'} ${info.classe || ''} – ${info.pages.length} page(s), formulaire : ${info.pages.filter((p) => p.kind === 'form').map((p) => p.number).join(', ') || 'non reconnu'}`);
  notifyCaisse('dgeo:analysed', withBase(info));
}
ipcMain.handle('dgeo:dossiers', () => loadDossiers().map(withBase));

/* ---------------- Pont Décompte DGEO → Caisse écoles ---------------- */
// Quand Décompte DGEO génère son fichier Excel (POST /api/excel sur son serveur local), le dossier
// envoyé par sa page est retenu dans data/caisse/decomptes-dgeo.json et proposé dans la fiche de
// saisie de la caisse comme pièce DECOMPTE pré-remplie (classe, période, enseignant-e, montants).
// Rien n'est modifié dans Décompte DGEO : la fenêtre observe seulement cette requête locale.
const DECOMPTES_FILE = () => path.join(REG_ROOT(), 'decomptes-dgeo.json');
function loadDecomptes() {
  try { const a = JSON.parse(fs.readFileSync(DECOMPTES_FILE(), 'utf8')); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
function saveDecomptes(list) {
  fs.mkdirSync(REG_ROOT(), { recursive: true });
  fs.writeFileSync(DECOMPTES_FILE(), JSON.stringify(list.slice(-50), null, 1));
}
function summarizeDossier(d) {
  const str = (v) => (v == null ? '' : String(v)).slice(0, 200);
  const num = (v) => (v == null || v === '' || isNaN(Number(v)) ? null : Number(v));
  return {
    id: str(d.id), numero: str(d.numero), filename: str(d.filename), type_activite: d.type_activite === 'camp' ? 'camp' : 'course',
    activite: str(d.activite), classe: str(d.classe), enseignant: str(d.enseignant), date_debut: str(d.date_debut), date_fin: str(d.date_fin), date_decompte: str(d.date_decompte),
    budget: num(d.budget), form_total: num(d.form_total), total: num(d.total),
    form_expenses: (Array.isArray(d.form_expenses) ? d.form_expenses : []).slice(0, 40).map((e) => ({ categorie: str(e && e.categorie), descriptif: str(e && e.descriptif), paye_enseignant: num(e && e.paye_enseignant), paye_commune: num(e && e.paye_commune), cout_total: num(e && e.cout_total) })),
    pieces: (Array.isArray(d.pieces) ? d.pieces : []).filter((p) => p && p.include !== false).length,
    capturedAt: new Date().toISOString(), saisi: false, pieceId: null, excel: null,
  };
}
function recordDecompte(d) {
  const s = summarizeDossier(d);
  if (!s.id) return;
  const list = loadDecomptes();
  // Un seul enregistrement par décompte : « dgeo:mark », « Ouvrir l'Excel » et le lien avec la pièce
  // comptable retrouvent le décompte par son identifiant. Un doublon (décompte refait après la
  // création de la pièce) les ferait travailler sur l'ancien enregistrement : le décompte resterait
  // « à saisir » pour toujours et « Créer la pièce » se répéterait.
  const i = list.findIndex((x) => x.id === s.id);
  if (i >= 0) {
    const old = list[i];
    s.excel = old.excel; s.saisi = old.saisi; s.pieceId = old.pieceId;
    if (old.saisi && old.total !== s.total) logLine(`Décompte ${s.numero || s.id} refait (total ${old.total} → ${s.total}) alors que sa pièce comptable existe déjà : à vérifier.`);
    list[i] = s;
  } else list.push(s);
  saveDecomptes(list);
  // le classeur enregistré juste après appartient à ce décompte-là (voir « will-download »)
  dgeo.lastExcelId = s.id; dgeo.lastExcelAt = Date.now();
  logLine(`Décompte DGEO terminé : ${s.numero || s.filename || s.id} – ${s.activite} ${s.classe} – total ${s.total}`);
  notifyCaisse('dgeo:new', s);
  pushShellState();
}
function setupDgeoBridge() {
  const bodies = new Map();
  const filter = { urls: ['http://127.0.0.1/*'] };
  const isExcel = (details) => !!dgeoView && details.webContentsId === dgeoView.webContents.id && details.method === 'POST' && /\/api\/excel(\?|$)/.test(details.url);
  session.defaultSession.webRequest.onBeforeRequest(filter, (details, cb) => {
    if (isExcel(details) && Array.isArray(details.uploadData) && details.uploadData.length) {
      try { bodies.set(details.id, Buffer.concat(details.uploadData.map((u) => (u.bytes ? Buffer.from(u.bytes) : Buffer.alloc(0)))).toString('utf8')); } catch (e) { logLine(`pont DGEO : ${e.message}`); }
    }
    cb({});
  });
  session.defaultSession.webRequest.onCompleted(filter, (details) => {
    const body = bodies.get(details.id);
    if (body == null) return;
    bodies.delete(details.id);
    if (details.statusCode !== 200) return;
    try { const d = JSON.parse(body); if (d && typeof d === 'object') recordDecompte(d); } catch (e) { logLine(`pont DGEO : dossier illisible (${e.message})`); }
  });
  session.defaultSession.webRequest.onErrorOccurred(filter, (details) => { bodies.delete(details.id); });
}
ipcMain.handle('dgeo:list', () => loadDecomptes());
ipcMain.handle('dgeo:mark', (ev, id, info) => {
  const list = loadDecomptes();
  const d = list.find((x) => x.id === String(id));
  if (!d) return false;
  if (info && typeof info === 'object') { if ('saisi' in info) d.saisi = !!info.saisi; if ('pieceId' in info) d.pieceId = info.pieceId ? String(info.pieceId) : null; }
  saveDecomptes(list);
  pushShellState();
  return true;
});
ipcMain.handle('dgeo:forget', (ev, id) => { saveDecomptes(loadDecomptes().filter((x) => x.id !== String(id))); pushShellState(); return true; });
ipcMain.handle('dgeo:open-excel', (ev, id) => {
  const d = loadDecomptes().find((x) => x.id === String(id));
  if (!d || !d.excel || !fs.existsSync(d.excel)) return false;
  shell.openPath(d.excel);
  return true;
});

// Téléchargement (si la boîte « Enregistrer sous » du navigateur n'est pas disponible) :
// toujours demander où enregistrer, jamais en silence dans « Téléchargements ».
function setupDownloads() {
  session.defaultSession.on('will-download', (ev, item, wc) => {
    // le filtre de la boîte suit le type du fichier (classeur, PDF, sauvegarde), sinon Windows
    // ajouterait « .xlsx » à un PDF dont on retape le nom
    const name = item.getFilename();
    const ext = (/\.([a-z0-9]+)$/i.exec(name) || [])[1];
    const KNOWN = { xlsx: 'Classeur Excel', xlsm: 'Classeur Excel', pdf: 'Document PDF', json: 'Sauvegarde (JSON)', html: 'Page HTML', csv: 'Fichier CSV', jpg: 'Image JPEG', jpeg: 'Image JPEG', png: 'Image PNG' };
    const filters = [];
    if (ext && KNOWN[ext.toLowerCase()]) filters.push({ name: KNOWN[ext.toLowerCase()], extensions: [ext.toLowerCase()] });
    filters.push({ name: 'Tous les fichiers', extensions: ['*'] });
    item.setSaveDialogOptions({
      title: 'Enregistrer le fichier',
      defaultPath: path.join(app.getPath('documents'), name),
      filters,
    });
    // fichier Excel d'un décompte DGEO : son emplacement est retenu avec le décompte (pont)
    if (dgeoView && wc && wc.id === dgeoView.webContents.id) {
      item.once('done', (e, state) => {
        if (state !== 'completed') return;
        const list = loadDecomptes();
        // le décompte que Décompte DGEO vient de produire (pont « /api/excel »), et non le dernier
        // de la liste : avec deux décomptes en attente, refaire l'Excel du plus ancien écrivait son
        // emplacement sur le plus récent
        const fresh = dgeo.lastExcelId && Date.now() - (dgeo.lastExcelAt || 0) < 5 * 60 * 1000 ? list.find((x) => x.id === dgeo.lastExcelId) : null;
        const d = fresh || list.slice().reverse().find((x) => !x.saisi);
        if (d) { d.excel = item.getSavePath(); saveDecomptes(list); notifyCaisse('dgeo:new', d); }
      });
    }
  });
}

function zoomActive(delta) {
  const v = activeTab === 'dgeo' ? dgeoView : caisseView;
  if (!v) return;
  const wc = v.webContents;
  wc.setZoomFactor(delta === 0 ? 1 : Math.min(2, Math.max(0.5, wc.getZoomFactor() + delta)));
  layoutViews();
}

function buildMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        { label: 'Ouvrir le dossier des données (registres, justificatifs, journal)', click: () => shell.openPath(app.getPath('userData')) },
        { type: 'separator' },
        { label: 'Quitter', accelerator: 'Alt+F4', role: 'quit' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Agrandir', accelerator: 'CmdOrCtrl+=', click: () => zoomActive(0.1) },
        { label: 'Réduire', accelerator: 'CmdOrCtrl+-', click: () => zoomActive(-0.1) },
        { label: 'Taille normale', accelerator: 'CmdOrCtrl+0', click: () => zoomActive(0) },
        { type: 'separator' },
        { label: 'Plein écran', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Recharger l\'application', accelerator: 'CmdOrCtrl+R', click: () => { const v = activeTab === 'dgeo' ? dgeoView : caisseView; if (v) v.webContents.reload(); } },
      ],
    },
    {
      label: 'Espaces',
      submenu: [
        { label: 'Saisie des pièces', accelerator: 'CmdOrCtrl+1', click: () => openPanel('panelSaisie') },
        { label: 'Pièces scannées', accelerator: 'CmdOrCtrl+2', click: () => openPanel('panelScan') },
        { label: 'Boîte de réception', accelerator: 'CmdOrCtrl+3', click: () => openPanel('panelReception') },
        { label: 'Compter la caisse', accelerator: 'CmdOrCtrl+4', click: () => openPanel('panelCaisse') },
        { label: "L'année", accelerator: 'CmdOrCtrl+5', click: () => openPanel('panelAnnee') },
        { label: 'Données', accelerator: 'CmdOrCtrl+6', click: () => openPanel('panelDonnees') },
        { label: 'Décompte DGEO', accelerator: 'CmdOrCtrl+7', click: () => openPanel('panelDgeo') },
        { label: 'Récapitulatif des décomptes', accelerator: 'CmdOrCtrl+8', click: () => openPanel('panelRecap') },
      ],
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: `À propos de ${APP_TITLE}`,
          click: () => {
            const names = namesFile();
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: `À propos de ${APP_TITLE}`,
              message: `${APP_TITLE} ${app.getVersion()}`,
              detail: 'Compta Blonay réunit en une seule application, dans deux onglets, Caisse écoles (saisie des pièces, ' +
                'pièces scannées, journal, fichier Excel, PDF des pièces) et Décompte DGEO (courses d\'école & camps).\n\n' +
                'Version portable : rien n\'est installé, aucune donnée ne quitte ce PC (lecture des PDF, ' +
                'lectures croisées par OCR local, génération des fichiers Excel et décomptes se font dans cette fenêtre).\n\n' +
                `Dossier des données : ${app.getPath('userData')}\n` +
                `Noms de personnes : ${names ? names : 'aucun fichier vocabulaire-noms.js (les noms s\'apprennent depuis un classeur)'}\n` +
                `Troisième lecteur (Tesseract natif) : ${(() => { const t = nativeOcr.detect(PORTABLE_DIR); return t ? `${t.version}${t.legacy ? ' + moteur historique' : ''}` : 'non trouvé (dossier tesseract/ absent)'; })()}\n\n` +
                `Décompte DGEO : ${dgeoCommand() ? (dgeo.status === 'ready' ? `en service (${dgeo.url})` : dgeo.status === 'starting' ? 'démarrage…' : 'inclus, arrêté') : 'non inclus'}\n` +
                `Electron ${process.versions.electron} – Chromium ${process.versions.chrome}`,
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.on('second-instance', () => {
  if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
});

/* ---------------- Registre des pièces : fichiers de l'application ---------------- */
// data/caisse/<année>/registre.json et data/caisse/<année>/pieces/<id>/<justificatif>
const REG_ROOT = () => path.join(app.getPath('userData'), 'caisse');
const yearOk = (y) => /^\d{4}$/.test(String(y));
const idOk = (id) => /^[A-Za-z0-9_-]{1,40}$/.test(String(id));
function safeName(name) {
  // pas de chemin, pas de caractères interdits sous Windows, pas de caractères de contrôle
  const base = path.basename(String(name || 'fichier')).replace(/[<>:"/\\|?*]/g, '_').replace(/[^\x20-\x7e -￿]/g, '_').trim();
  // « . » et « .. » survivaient à basename() et désignaient le dossier parent, jamais un fichier
  if (!base || base === '.' || base === '..') return 'fichier';
  return base;
}
function regDir(y) { return path.join(REG_ROOT(), String(y)); }
ipcMain.handle('files:dir', () => REG_ROOT());
ipcMain.handle('files:years', () => {
  try {
    return fs.readdirSync(REG_ROOT()).filter((d) => yearOk(d) && fs.existsSync(path.join(REG_ROOT(), d, 'registre.json'))).map(Number).sort();
  } catch (e) { return []; }
});
ipcMain.handle('files:load', (ev, y) => {
  if (!yearOk(y)) throw new Error('année invalide');
  const f = path.join(regDir(y), 'registre.json');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
});
ipcMain.handle('files:save', (ev, y, text) => {
  if (!yearOk(y)) throw new Error('année invalide');
  const dir = regDir(y);
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, 'registre.json');
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, String(text));
  if (fs.existsSync(f)) fs.copyFileSync(f, f.replace(/\.json$/, '.bak.json'));
  fs.renameSync(tmp, f);
  return true;
});
ipcMain.handle('files:attach', (ev, y, id, name, bytes) => {
  if (!yearOk(y) || !idOk(id)) throw new Error('identifiant invalide');
  const dir = path.join(regDir(y), 'pieces', String(id));
  fs.mkdirSync(dir, { recursive: true });
  let n = safeName(name);
  const ext = path.extname(n); const stem = n.slice(0, n.length - ext.length);
  let k = 1;
  while (fs.existsSync(path.join(dir, n))) n = `${stem} (${k++})${ext}`;
  const buf = Buffer.from(bytes);
  fs.writeFileSync(path.join(dir, n), buf);
  return { name: n, size: buf.length };
});
ipcMain.handle('files:read', (ev, y, id, name) => {
  if (!yearOk(y) || !idOk(id)) throw new Error('identifiant invalide');
  const f = path.join(regDir(y), 'pieces', String(id), safeName(name));
  return fs.existsSync(f) ? fs.readFileSync(f) : null;
});
ipcMain.handle('files:remove', (ev, y, id, name) => {
  if (!yearOk(y) || !idOk(id)) throw new Error('identifiant invalide');
  const f = path.join(regDir(y), 'pieces', String(id), safeName(name));
  if (fs.existsSync(f)) fs.unlinkSync(f);
  return true;
});
ipcMain.handle('files:open-dir', () => shell.openPath(REG_ROOT()));

// Carnet des données (espace « Données ») : les listes tenues à la main — comptes, classes, noms,
// objets, types. Un seul fichier à côté des registres, qui ne dépend d'aucune année et que la
// mise à jour de l'exécutable ne touche pas.
const CARNET = () => path.join(REG_ROOT(), 'donnees.json');
ipcMain.handle('files:load-carnet', () => {
  try { return fs.existsSync(CARNET()) ? fs.readFileSync(CARNET(), 'utf8') : null; } catch (e) { return null; }
});
ipcMain.handle('files:save-carnet', (ev, text) => {
  fs.mkdirSync(REG_ROOT(), { recursive: true });
  const f = CARNET();
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, String(text));
  // la copie de la veille reste : un carnet écrasé par erreur se rattrape
  if (fs.existsSync(f)) fs.copyFileSync(f, f.replace(/\.json$/, '.bak.json'));
  fs.renameSync(tmp, f);
  return true;
});

// Troisième lecteur (Tesseract natif) au service de la page
ipcMain.handle('ocr:info', () => {
  const t = nativeOcr.detect(PORTABLE_DIR);
  logLine(t ? `Tesseract natif : ${t.version} (${t.cmd})${t.legacy ? ' + moteur historique' : ''}` : 'Tesseract natif : non trouvé');
  return t ? { available: true, version: t.version, legacy: t.legacy, cmd: t.cmd } : { available: false };
});
ipcMain.handle('ocr:recognize', (ev, png, opts) => nativeOcr.recognize(png, opts, PORTABLE_DIR));

app.whenReady().then(() => {
  logLine(`${APP_TITLE} ${app.getVersion()} – Electron ${process.versions.electron} – ${process.platform} – exécutable : ${PORTABLE_DIR} – données : ${app.getPath('userData')}`);
  if (raisonDonneesAilleurs) logLine(`données hors du dossier de l'application : ${raisonDonneesAilleurs}`);
  setupDownloads();
  setupDgeoBridge();
  buildMenu();
  createWindow();
  // la veille démarre quand la page Caisse écoles a fini de charger (voir createWindow) : après la
  // fenêtre, pour qu'un partage injoignable ne retienne pas l'ouverture, et jamais avant que la
  // page puisse répondre — sinon le premier scan du matin part « à revoir » sans avoir été lu
});

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { app.isQuitting = true; if (veille) veille.arreter(); stopDgeo(); });
app.on('will-quit', stopDgeo);
