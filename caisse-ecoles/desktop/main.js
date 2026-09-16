/*
 * Caisse écoles – application fenêtrée (Electron).
 *
 * La fenêtre charge l'application autonome (app/Caisse-ecoles.html, produite par
 * `npm run build:public` dans le dossier parent). Rien n'est installé, rien n'est écrit dans
 * le registre : les réglages mémorisés (compte caisse, vocabulaire appris, dernier solde)
 * vont dans le sous-dossier `data/` à côté de l'exécutable, comme pour Décompte DGEO.
 * Aucune connexion réseau n'est ouverte par l'application.
 */
const { app, BrowserWindow, WebContentsView, Menu, dialog, shell, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
const nativeOcr = require('./native-ocr.js');

const APP_TITLE = 'Caisse écoles';
const PORTABLE_DIR = path.dirname(process.execPath);

// Dossier de données à côté de l'exécutable (version portable) ; sinon, dossier utilisateur.
function setupUserData() {
  if (!app.isPackaged) return;
  const dir = path.join(PORTABLE_DIR, 'data');
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    app.setPath('userData', dir);
  } catch (e) {
    // dossier non inscriptible (ex. Program Files) : emplacement par défaut de Windows
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

// Une seule instance de l'application
if (!app.requestSingleInstanceLock()) app.quit();

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
const TAB_H = 40; // hauteur de la barre d'onglets (shell.html)

function layoutViews() {
  if (!mainWindow) return;
  const [w, h] = mainWindow.getContentSize();
  const bounds = { x: 0, y: TAB_H, width: w, height: Math.max(0, h - TAB_H) };
  for (const [name, v] of [['caisse', caisseView], ['dgeo', dgeoView]]) {
    if (!v) continue;
    v.setBounds(bounds);
    v.setVisible(name === activeTab);
  }
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
      return { action: 'allow', overrideBrowserWindowOptions: { width: 1000, height: 800, title: `${APP_TITLE} – rapport`, autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false } } };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });
  caisseView.webContents.once('did-finish-load', () => { if (mainWindow && !mainWindow.isVisible()) { mainWindow.show(); logLine('interface démarrée'); } });

  // Onglet 2 : Décompte DGEO (serveur local embarqué, démarré à la première ouverture)
  dgeoView = new WebContentsView({ webPreferences: { contextIsolation: true, nodeIntegration: false } });
  mainWindow.contentView.addChildView(dgeoView);
  dgeoView.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  dgeoView.webContents.loadURL(dgeoPlaceholder('Décompte DGEO', "L'onglet démarre Décompte DGEO à sa première ouverture."));

  mainWindow.on('resize', layoutViews);
  mainWindow.on('closed', () => { mainWindow = null; caisseView = null; dgeoView = null; });
  layoutViews();
  setTimeout(() => { if (mainWindow && !mainWindow.isVisible()) mainWindow.show(); }, 4000);
}

function dgeoPlaceholder(title, message, spinner) {
  const html = `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font-family:Segoe UI,Arial,sans-serif;background:#f6f7fb;color:#1f2937;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center;max-width:560px"><h2 style="margin:0 0 8px">${title}</h2><p style="color:#4b5563">${message}</p>${spinner ? '<p style="color:#9ca3af;font-size:13px">Cela prend quelques secondes au premier lancement…</p>' : ''}</div></body>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

/* ---------------- Décompte DGEO : serveur local embarqué ---------------- */
// Le dossier decompte/ (version portable de Décompte DGEO) est posé à côté de l'exécutable ;
// son serveur est lancé en mode --web sur un port libre et affiché dans le second onglet.
// En développement : DECOMPTE_CMD (ex. « python -m decompte ») avec DECOMPTE_CWD.
const dgeo = { proc: null, url: null, status: 'off', starting: null };

function dgeoCommand() {
  if (process.env.DECOMPTE_CMD) {
    const parts = process.env.DECOMPTE_CMD.split(/\s+/);
    return { cmd: parts[0], args: parts.slice(1), cwd: process.env.DECOMPTE_CWD || PORTABLE_DIR };
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
  if (dgeo.starting) return dgeo.starting;
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
    dgeo.proc = spawn(c.cmd, args, { cwd: c.cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    dgeo.proc.stdout.on('data', (d) => logLine(`[dgeo] ${String(d).trim()}`));
    dgeo.proc.stderr.on('data', (d) => logLine(`[dgeo] ${String(d).trim()}`));
    dgeo.proc.on('exit', (code) => { logLine(`Décompte DGEO arrêté (code ${code})`); dgeo.proc = null; dgeo.status = dgeo.status === 'ready' ? 'off' : 'failed'; });
    const url = `http://127.0.0.1:${port}/`;
    for (let i = 0; i < 180; i++) {
      if (!dgeo.proc) break;
      if (await httpOk(url + 'api/health')) { dgeo.status = 'ready'; dgeo.url = url; logLine(`Décompte DGEO prêt : ${url}`); return url; }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (dgeo.status !== 'ready') dgeo.status = 'failed';
    return null;
  })();
  try { return await dgeo.starting; } finally { dgeo.starting = null; }
}

function stopDgeo() {
  if (!dgeo.proc) return;
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(dgeo.proc.pid), '/T', '/F'], { windowsHide: true });
    else dgeo.proc.kill('SIGTERM');
  } catch (e) { /* ignore */ }
  dgeo.proc = null;
  dgeo.status = 'off';
}

async function showTab(name) {
  activeTab = name;
  layoutViews();
  if (mainWindow) mainWindow.webContents.send('shell:active', name);
  if (name === 'dgeo' && dgeoView) {
    if (dgeo.status === 'ready') { if (!dgeoView.webContents.getURL().startsWith(dgeo.url)) dgeoView.webContents.loadURL(dgeo.url); return; }
    dgeoView.webContents.loadURL(dgeoPlaceholder('Décompte DGEO', 'Démarrage du logiciel de décompte…', true));
    const url = await startDgeo();
    if (!dgeoView) return;
    if (url) dgeoView.webContents.loadURL(url);
    else if (dgeo.status === 'missing') dgeoView.webContents.loadURL(dgeoPlaceholder('Décompte DGEO non inclus', "Le dossier « decompte » (version portable de Décompte DGEO) n'est pas à côté de CaisseEcoles.exe. Téléchargez le zip complet depuis la page Releases."));
    else dgeoView.webContents.loadURL(dgeoPlaceholder('Décompte DGEO ne répond pas', "Le serveur local n'a pas démarré. Voir data/caisse.log."));
  }
}

ipcMain.on('shell:tab', (ev, name) => { showTab(name === 'dgeo' ? 'dgeo' : 'caisse'); });
ipcMain.handle('shell:state', () => ({ active: activeTab, dgeo: dgeo.status, hasDgeo: !!dgeoCommand() }));

// Téléchargement (si la boîte « Enregistrer sous » du navigateur n'est pas disponible) :
// toujours demander où enregistrer, jamais en silence dans « Téléchargements ».
function setupDownloads() {
  session.defaultSession.on('will-download', (ev, item) => {
    item.setSaveDialogOptions({
      title: 'Enregistrer le fichier',
      defaultPath: path.join(app.getPath('documents'), item.getFilename()),
      filters: [{ name: 'Classeur Excel', extensions: ['xlsx'] }, { name: 'Tous les fichiers', extensions: ['*'] }],
    });
  });
}

function zoomActive(delta) {
  const v = activeTab === 'dgeo' ? dgeoView : caisseView;
  if (!v) return;
  const wc = v.webContents;
  wc.setZoomFactor(delta === 0 ? 1 : Math.min(2, Math.max(0.5, wc.getZoomFactor() + delta)));
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
      label: 'Onglets',
      submenu: [
        { label: 'Caisse écoles', accelerator: 'CmdOrCtrl+1', click: () => showTab('caisse') },
        { label: 'Décompte DGEO', accelerator: 'CmdOrCtrl+2', click: () => showTab('dgeo') },
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
              detail: 'Saisie automatique des pièces comptables dans le journal de caisse Excel.\n\n' +
                'Version portable : rien n\'est installé, aucune donnée ne quitte ce PC (lecture des PDF, ' +
                'seconde lecture par OCR local et génération du fichier Excel se font dans cette fenêtre).\n\n' +
                `Dossier des données : ${app.getPath('userData')}\n` +
                `Noms de personnes : ${names ? names : 'aucun fichier vocabulaire-noms.js (les noms s\'apprennent depuis un classeur)'}\n` +
                `Troisième lecteur (Tesseract natif) : ${(() => { const t = nativeOcr.detect(PORTABLE_DIR); return t ? `${t.version}${t.legacy ? ' + moteur historique' : ''}` : 'non trouvé (dossier tesseract/ absent)'; })()}\n\n` +
                `Décompte DGEO : ${dgeoCommand() ? (dgeo.status === 'ready' ? 'en service' : 'inclus') : 'non inclus'}\n` +
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
  return base || 'fichier';
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

// Troisième lecteur (Tesseract natif) au service de la page
ipcMain.handle('ocr:info', () => {
  const t = nativeOcr.detect(PORTABLE_DIR);
  logLine(t ? `Tesseract natif : ${t.version} (${t.cmd})${t.legacy ? ' + moteur historique' : ''}` : 'Tesseract natif : non trouvé');
  return t ? { available: true, version: t.version, legacy: t.legacy, cmd: t.cmd } : { available: false };
});
ipcMain.handle('ocr:recognize', (ev, png, opts) => nativeOcr.recognize(png, opts, PORTABLE_DIR));

app.whenReady().then(() => {
  logLine(`${APP_TITLE} ${app.getVersion()} – Electron ${process.versions.electron} – ${process.platform} – données : ${app.getPath('userData')}`);
  setupDownloads();
  buildMenu();
  createWindow();
});

app.on('window-all-closed', () => app.quit());
app.on('before-quit', stopDgeo);
app.on('will-quit', stopDgeo);
