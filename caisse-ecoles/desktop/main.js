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
const nativeOcr = require('./native-ocr.js');

const APP_TITLE = 'Compta Blonay';
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
const TAB_H = 46; // hauteur de la barre d'onglets (shell.html)

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
  launchDgeo();

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
const dgeo = { proc: null, url: null, status: 'off', starting: null };

/** État de la fenêtre pour la barre d'onglets (et le test de fumée). */
function shellState() {
  return { active: activeTab, dgeo: dgeo.status, hasDgeo: !!dgeoCommand(), decomptes: loadDecomptes().filter((d) => !d.saisi).length };
}
function pushShellState() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('shell:state', shellState());
}
function notifyCaisse(channel, payload) {
  if (caisseView && !caisseView.webContents.isDestroyed()) caisseView.webContents.send(channel, payload);
}

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
    dgeo.proc.on('exit', (code) => {
      logLine(`Décompte DGEO arrêté (code ${code})`);
      dgeo.proc = null;
      dgeo.status = dgeo.status === 'ready' ? 'off' : 'failed';
      if (dgeoView && !app.isQuitting) dgeoView.webContents.loadURL(dgeoPlaceholder('Décompte DGEO arrêté', "Le logiciel de décompte s'est arrêté. Cliquez sur l'onglet pour le relancer (détails dans data/caisse.log)."));
      pushShellState();
    });
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

async function showTab(name) {
  activeTab = name;
  layoutViews();
  pushShellState();
  if (name === 'dgeo' && dgeoView) {
    if (dgeo.status === 'ready') { if (!dgeoView.webContents.getURL().startsWith(dgeo.url)) dgeoView.webContents.loadURL(dgeo.url); return; }
    if (dgeo.status === 'starting') return; // launchDgeo() affichera la page dès que le serveur répond
    await launchDgeo(); // non démarré, arrêté ou en échec : nouvel essai
  }
}

ipcMain.on('shell:tab', (ev, name) => { showTab(name === 'dgeo' ? 'dgeo' : 'caisse'); });
ipcMain.handle('shell:state', () => shellState());

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
  const i = list.findIndex((x) => x.id === s.id && !x.saisi);
  if (i >= 0) { s.excel = list[i].excel; list[i] = s; } else list.push(s);
  saveDecomptes(list);
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
    item.setSaveDialogOptions({
      title: 'Enregistrer le fichier',
      defaultPath: path.join(app.getPath('documents'), item.getFilename()),
      filters: [{ name: 'Classeur Excel', extensions: ['xlsx'] }, { name: 'Tous les fichiers', extensions: ['*'] }],
    });
    // fichier Excel d'un décompte DGEO : son emplacement est retenu avec le décompte (pont)
    if (dgeoView && wc && wc.id === dgeoView.webContents.id) {
      item.once('done', (e, state) => {
        if (state !== 'completed') return;
        const list = loadDecomptes();
        const d = list.slice().reverse().find((x) => !x.saisi);
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
  setupDgeoBridge();
  buildMenu();
  createWindow();
});

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { app.isQuitting = true; stopDgeo(); });
app.on('will-quit', stopDgeo);
