/*
 * Caisse écoles – application fenêtrée (Electron).
 *
 * La fenêtre charge l'application autonome (app/Caisse-ecoles.html, produite par
 * `npm run build:public` dans le dossier parent). Rien n'est installé, rien n'est écrit dans
 * le registre : les réglages mémorisés (compte caisse, vocabulaire appris, dernier solde)
 * vont dans le sous-dossier `data/` à côté de l'exécutable, comme pour Décompte DGEO.
 * Aucune connexion réseau n'est ouverte par l'application.
 */
const { app, BrowserWindow, Menu, dialog, shell, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 600,
    title: APP_TITLE,
    backgroundColor: '#f6f7fb',
    show: false,
    icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // le preload lit le fichier des noms
      spellcheck: false,
      additionalArguments: [`--caisse-names=${namesFile() || ''}`, `--caisse-version=${app.getVersion()}`],
    },
  });
  mainWindow.once('ready-to-show', () => { mainWindow.show(); logLine('interface démarrée'); });
  mainWindow.on('page-title-updated', (ev) => ev.preventDefault());
  mainWindow.loadFile(path.join(__dirname, 'app', 'Caisse-ecoles.html'));

  // Le rapport de contrôle s'ouvre dans une fenêtre de l'application (imprimable avec Ctrl+P)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'about:blank' || url.startsWith('file:') || url.startsWith('blob:')) {
      return { action: 'allow', overrideBrowserWindowOptions: { width: 1000, height: 800, title: `${APP_TITLE} – rapport`, autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false } } };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

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

function buildMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        { label: 'Ouvrir le dossier des données', click: () => shell.openPath(app.getPath('userData')) },
        { type: 'separator' },
        { label: 'Quitter', accelerator: 'Alt+F4', role: 'quit' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Agrandir', role: 'zoomIn', accelerator: 'CmdOrCtrl+=' },
        { label: 'Réduire', role: 'zoomOut' },
        { label: 'Taille normale', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Plein écran', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Recharger l\'application', role: 'reload' },
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
