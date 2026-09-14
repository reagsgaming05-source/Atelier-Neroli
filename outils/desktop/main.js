/*
 * Blonay PDF – application fenêtrée (Electron).
 *
 * La fenêtre charge la page autonome (app/index.html, produite par `npm run build`
 * dans le dossier parent). Rien n'est installé, rien n'est écrit dans le registre :
 * les réglages mémorisés (vue, zoom, thème, taille des vignettes) vont dans le
 * sous-dossier `data/` à côté de l'exécutable, comme pour Décompte DGEO et Caisse
 * écoles. Aucune connexion réseau n'est ouverte par l'application : les documents
 * sont lus, modifiés et réassemblés dans cette fenêtre.
 */
const { app, BrowserWindow, Menu, dialog, shell, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_TITLE = 'Blonay PDF';
const PORTABLE_DIR = path.dirname(process.execPath);
const EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];

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

/** Les documents passés sur la ligne de commande (double-clic sur un PDF, dépôt sur l'icône). */
function fichiersDe(argv) {
  return argv.slice(1).filter((a) => !a.startsWith('-') && EXTENSIONS.includes(path.extname(a).toLowerCase()) && fs.existsSync(a));
}
/** Lus en mémoire, tels que la page les attend : { nom, octets }. */
function lire(chemins) {
  const out = [];
  for (const c of chemins) {
    try {
      const b = fs.readFileSync(c);
      out.push({ nom: path.basename(c), octets: new Uint8Array(b.buffer, b.byteOffset, b.length) });
    } catch (e) { console.warn('illisible :', c, e && e.message); }
  }
  return out;
}

let mainWindow = null;
let fichiersInitiaux = fichiersDe(process.argv);

// Une seule instance : un second double-clic sur un PDF l'ouvre dans la fenêtre existante.
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', (_e, argv) => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
  const liste = lire(fichiersDe(argv));
  if (liste.length) mainWindow.webContents.send('blonay:ouvrir', liste);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 880,
    minHeight: 560,
    title: APP_TITLE,
    backgroundColor: '#f3f4f6',
    show: false,
    icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      additionalArguments: ['--blonay-version=' + app.getVersion()],
    },
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('page-title-updated', (ev) => ev.preventDefault());
  mainWindow.loadFile(path.join(__dirname, 'app', 'index.html'));

  // Rien ne s'ouvre en dehors de la fenêtre, et la page ne navigue jamais ailleurs.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (ev) => ev.preventDefault());

  // Fermeture : la question de l'application, pas celle d'un navigateur.
  let quitter = false;
  mainWindow.webContents.on('will-prevent-unload', (ev) => ev.preventDefault());
  mainWindow.on('close', (ev) => {
    if (quitter) return;
    ev.preventDefault();
    (async () => {
      let modifie = false;
      try { modifie = await mainWindow.webContents.executeJavaScript("!!document.querySelector('#summary .mod')", true); } catch (e) { /* page absente */ }
      if (!modifie) { quitter = true; mainWindow.close(); return; }
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        buttons: ['Revenir au document', 'Quitter sans exporter'],
        defaultId: 0,
        cancelId: 0,
        title: APP_TITLE,
        message: 'Des modifications n\'ont pas été exportées.',
        detail: 'En quittant maintenant, vous les perdez.',
        noLink: true,
      });
      if (response === 1) { quitter = true; mainWindow.close(); }
    })();
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

// Enregistrer : toujours la boîte « Enregistrer sous » de Windows, jamais en silence
// dans « Téléchargements ». (En test de fumée, BLONAY_SMOKE_DIR fixe le dossier.)
function setupDownloads() {
  session.defaultSession.on('will-download', (_ev, item) => {
    const nom = item.getFilename();
    const ext = path.extname(nom).toLowerCase().replace('.', '');
    const filtres = { pdf: 'Document PDF', zip: 'Archive ZIP', png: 'Image PNG', jpg: 'Image JPEG', txt: 'Texte' };
    if (process.env.BLONAY_SMOKE_DIR) item.setSavePath(path.join(process.env.BLONAY_SMOKE_DIR, nom));
    else item.setSaveDialogOptions({
      title: 'Enregistrer sous',
      defaultPath: path.join(app.getPath('documents'), nom),
      filters: [...(filtres[ext] ? [{ name: filtres[ext], extensions: [ext] }] : []), { name: 'Tous les fichiers', extensions: ['*'] }],
    });
    item.once('done', (_e, etat) => {
      if (!mainWindow) return;
      mainWindow.webContents.send('blonay:enregistre', etat === 'completed' ? { chemin: item.getSavePath() } : { annule: true });
    });
  });
}

// La page ne sait contacter personne : toute requête qui n'est pas locale est refusée.
function setupNetwork() {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const u = details.url;
    const local = u.startsWith('file:') || u.startsWith('blob:') || u.startsWith('data:') || u.startsWith('devtools:');
    callback({ cancel: !local });
  });
}

function setupIpc() {
  ipcMain.handle('blonay:fichiers-initiaux', () => { const l = lire(fichiersInitiaux); fichiersInitiaux = []; return l; });
  ipcMain.handle('blonay:imprimantes', async () => {
    if (!mainWindow) return [];
    const liste = await mainWindow.webContents.getPrintersAsync();
    return liste.map((p) => ({ name: p.name, displayName: p.displayName || p.name, isDefault: !!p.isDefault }));
  });
  // Impression directe : l'imprimante choisie, le recto verso, les copies, la taille de feuille.
  ipcMain.handle('blonay:imprimer', (_e, o) => new Promise((resolve) => {
    if (!mainWindow) { resolve({ ok: false, erreur: 'fenêtre fermée' }); return; }
    const opts = {
      silent: true, printBackground: true, color: true,
      copies: Math.max(1, Math.min(99, parseInt(o && o.copies, 10) || 1)),
      landscape: !!(o && o.paysage),
      duplexMode: ['simplex', 'shortEdge', 'longEdge'].includes(o && o.duplex) ? o.duplex : 'simplex',
      margins: { marginType: 'none' },
    };
    if (o && o.imprimante) opts.deviceName = o.imprimante;
    if (o && o.largeurMicrons > 0 && o.hauteurMicrons > 0) opts.pageSize = { width: o.largeurMicrons, height: o.hauteurMicrons };
    try {
      mainWindow.webContents.print(opts, (ok, erreur) => resolve({ ok: !!ok, erreur: ok ? '' : String(erreur || '') }));
    } catch (e) { resolve({ ok: false, erreur: e && e.message ? e.message : String(e) }); }
  }));
}

const envoyer = (nom) => { if (mainWindow) mainWindow.webContents.send('blonay:commande', nom); };

async function ouvrirDocuments() {
  if (!mainWindow) return;
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Ouvrir',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'PDF et images', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp'] }, { name: 'Tous les fichiers', extensions: ['*'] }],
  });
  if (r.canceled || !r.filePaths.length) return;
  const liste = lire(r.filePaths);
  if (liste.length) mainWindow.webContents.send('blonay:ouvrir', liste);
}

function buildMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        { label: 'Ouvrir…', accelerator: 'CmdOrCtrl+O', click: ouvrirDocuments },
        { label: 'Exporter le PDF…', accelerator: 'CmdOrCtrl+S', click: () => envoyer('exporter') },
        { label: 'Imprimer…', accelerator: 'CmdOrCtrl+P', click: () => envoyer('imprimer') },
        { type: 'separator' },
        { label: 'Ouvrir le dossier des données', click: () => shell.openPath(app.getPath('userData')) },
        { type: 'separator' },
        { label: 'Quitter', accelerator: 'Alt+F4', role: 'quit' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Lire', accelerator: 'CmdOrCtrl+1', click: () => envoyer('lecture') },
        { label: 'Organiser les pages', accelerator: 'CmdOrCtrl+2', click: () => envoyer('organiser') },
        { type: 'separator' },
        { label: 'Agrandir', accelerator: 'CmdOrCtrl+=', click: () => envoyer('zoom-plus') },
        { label: 'Réduire', accelerator: 'CmdOrCtrl+-', click: () => envoyer('zoom-moins') },
        { label: 'Page entière', accelerator: 'CmdOrCtrl+0', click: () => envoyer('zoom-page') },
        { type: 'separator' },
        { label: 'Thème clair ou sombre', click: () => envoyer('theme') },
        { label: 'Plein écran', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Aide',
      submenu: [
        { label: 'Raccourcis clavier', accelerator: 'F1', click: () => envoyer('raccourcis') },
        { type: 'separator' },
        {
          label: 'À propos de ' + APP_TITLE,
          click: () => dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'À propos de ' + APP_TITLE,
            message: APP_TITLE + ' ' + app.getVersion(),
            detail: 'Organiser, corriger, annoter, remplir et imprimer des PDF.\n\n' +
              'Version portable : rien n\'est installé, aucune donnée ne quitte ce PC (les documents sont lus, ' +
              'modifiés et réassemblés dans cette fenêtre).\n\n' +
              'Dossier des données : ' + app.getPath('userData') + '\n\n' +
              'Electron ' + process.versions.electron + ' – Chromium ' + process.versions.chrome,
          }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  setupNetwork();
  setupDownloads();
  setupIpc();
  buildMenu();
  createWindow();
});

app.on('window-all-closed', () => app.quit());
