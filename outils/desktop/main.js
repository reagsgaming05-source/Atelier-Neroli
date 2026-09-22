/*
 * Blonay PDF – application fenêtrée (Electron).
 *
 * Chaque fenêtre charge la page autonome (app/index.html, produite par `npm run build`
 * dans le dossier parent). Rien n'est installé, rien n'est écrit dans le registre :
 * les réglages mémorisés (vue, zoom, thème, taille des vignettes) vont dans le
 * sous-dossier `data/` à côté de l'exécutable, comme pour Décompte DGEO et Caisse
 * écoles. Aucune connexion réseau n'est ouverte par l'application : les documents
 * sont lus, modifiés et réassemblés dans la fenêtre.
 *
 * Un document double-cliqué ouvre sa propre fenêtre, comme dans Acrobat : deux
 * PDF ouverts depuis le bureau sont deux documents indépendants. Les combiner est
 * un choix explicite (« Ajouter au document… », ou le bouton Ouvrir dans la page).
 */
const { app, BrowserWindow, Menu, dialog, shell, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_TITLE = 'Blonay PDF';
// Date et commit de construction, posés par build.js puis prepare-app.js.
let CONSTRUCTION = '';
try { CONSTRUCTION = String(JSON.parse(fs.readFileSync(path.join(__dirname, 'app', 'construction.json'), 'utf8')).construction || ''); } catch (e) { /* version de travail */ }
const PORTABLE_DIR = path.dirname(process.execPath);
const { MARQUEUR, ouRanger, POURQUOI } = require('./ou-ranger');
const EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];

// Où vont les données : à côté de l'exécutable, ou dans le profil de chacun.
// ou-ranger.js porte la décision et l'explique ; ici, seulement ce qui touche
// au disque.
let RANGEMENT = { ou: 'cote', pourquoi: 'portable' };
function setupUserData() {
  // Test de fumée : un dossier de données à part, pour ne toucher ni aux
  // récents ni à la récupération de l'utilisateur.
  if (process.env.BLONAY_SMOKE_DIR) { try { app.setPath('userData', path.join(process.env.BLONAY_SMOKE_DIR, 'donnees')); } catch (e) { /* tant pis */ } return; }
  if (!app.isPackaged) return;
  const dir = path.join(PORTABLE_DIR, 'data');
  RANGEMENT = ouRanger(PORTABLE_DIR, {
    marqueurPose: () => { try { return fs.existsSync(path.join(PORTABLE_DIR, MARQUEUR)); } catch (e) { return false; } },
    dossierInscriptible: () => {
      try { fs.mkdirSync(dir, { recursive: true }); fs.accessSync(dir, fs.constants.W_OK); return true; }
      catch (e) { return false; }
    },
  });
  // 'profil' : on ne pose rien, Electron range dans le profil Windows du compte
  // ouvert — que le système protège déjà des autres comptes.
  if (RANGEMENT.ou === 'cote') { try { app.setPath('userData', dir); } catch (e) { /* tant pis */ } }
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
      out.push({ nom: path.basename(c), octets: new Uint8Array(b.buffer, b.byteOffset, b.length), chemin: c });
    } catch (e) { console.warn('illisible :', c, e && e.message); }
  }
  return out;
}

// Fichiers récents : une liste de chemins dans le dossier de données, rien d'autre.
const RECENTS_MAX = 12;
const fichierRecents = () => path.join(app.getPath('userData'), 'recents.json');

// Les réglages du poste, dans le dossier de données à côté de l'exécutable.
const fichierReglages = () => path.join(app.getPath('userData'), 'reglages.json');
function lireReglages() {
  try { const r = JSON.parse(fs.readFileSync(fichierReglages(), 'utf8')); return r && typeof r === 'object' ? r : {}; } catch (e) { return {}; }
}
function ecrireReglages(r) {
  try {
    fs.mkdirSync(path.dirname(fichierReglages()), { recursive: true });
    fs.writeFileSync(fichierReglages(), JSON.stringify(r, null, 1));
  } catch (e) { /* le réglage ne survivra pas au redémarrage, tant pis */ }
}
const toujoursEnOnglet = () => lireReglages().toujoursEnOnglet === true;
function lireRecents() {
  try { const l = JSON.parse(fs.readFileSync(fichierRecents(), 'utf8')); return Array.isArray(l) ? l.filter((c) => typeof c === 'string') : []; } catch (e) { return []; }
}
function ajouterRecent(chemin) {
  if (!chemin) return;
  const l = [chemin].concat(lireRecents().filter((c) => c !== chemin)).slice(0, RECENTS_MAX);
  try { fs.writeFileSync(fichierRecents(), JSON.stringify(l, null, 1)); } catch (e) { /* dossier non inscriptible */ }
  buildMenu();
}
function viderRecents() { try { fs.unlinkSync(fichierRecents()); } catch (e) { /* déjà vide */ } buildMenu(); }

// Récupération après plantage : chaque onglet modifié dépose son travail
// (sources et manifeste) dans le dossier de données ; il est effacé après
// un enregistrement ou une fermeture voulue.
const dossierRecup = () => path.join(app.getPath('userData'), 'recuperation');
const cleValide = (cle) => typeof cle === 'string' && /^[a-z0-9-]{3,64}$/.test(cle);
let recupProposee = false;
function recupEcrire(o) {
  if (!o || !cleValide(o.cle)) return { ok: false, erreur: 'clé invalide' };
  const dir = path.join(dossierRecup(), o.cle);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of o.fichiers || []) {
    if (!f || typeof f.nom !== 'string' || !/^[a-z0-9._-]+$/i.test(f.nom)) continue;
    fs.writeFileSync(path.join(dir, f.nom), Buffer.from(f.octets));
  }
  const tmp = path.join(dir, 'manifeste.json.tmp');
  fs.writeFileSync(tmp, JSON.stringify(o.manifeste));
  fs.renameSync(tmp, path.join(dir, 'manifeste.json'));
  return { ok: true };
}
function recupListe() {
  if (recupProposee) return [];
  recupProposee = true;
  const out = [];
  try {
    for (const cle of fs.readdirSync(dossierRecup())) {
      if (!cleValide(cle)) continue;
      try {
        const m = JSON.parse(fs.readFileSync(path.join(dossierRecup(), cle, 'manifeste.json'), 'utf8'));
        out.push({ cle, titre: m.titre || '', quand: m.quand || 0, pages: Array.isArray(m.pages) ? m.pages.length : 0 });
      } catch (e) { /* manifeste absent ou illisible : rien à proposer */ }
    }
  } catch (e) { /* pas de dossier */ }
  return out;
}
function recupLire(cle) {
  if (!cleValide(cle)) return null;
  const dir = path.join(dossierRecup(), cle);
  const manifeste = JSON.parse(fs.readFileSync(path.join(dir, 'manifeste.json'), 'utf8'));
  const fichiers = fs.readdirSync(dir).filter((f) => f !== 'manifeste.json' && !f.endsWith('.tmp'))
    .map((f) => { const b = fs.readFileSync(path.join(dir, f)); return { nom: f, octets: new Uint8Array(b.buffer, b.byteOffset, b.length) }; });
  return { manifeste, fichiers };
}
function recupEffacer(cle) {
  if (!cleValide(cle)) return false;
  fs.rmSync(path.join(dossierRecup(), cle), { recursive: true, force: true });
  return true;
}

const fenetres = new Set();
const fenetreActive = () => BrowserWindow.getFocusedWindow() || Array.from(fenetres).pop() || null;
const fenetreDe = (sender) => BrowserWindow.fromWebContents(sender);

// Une seule instance. Un nouveau double-clic sur un PDF ouvre par défaut une
// nouvelle fenêtre — un document à part. Deux façons d'ouvrir plusieurs
// documents, fenêtres depuis le bureau et onglets depuis l'application, c'est
// une de trop : « Toujours ouvrir en onglet » (menu Fichier) range les
// doubles-clics dans la fenêtre déjà ouverte.
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', (_e, argv) => {
  const liste = lire(fichiersDe(argv));
  liste.forEach((f) => ajouterRecent(f.chemin));
  const w = fenetreActive();
  if (liste.length) {
    if (toujoursEnOnglet() && w) {
      if (w.isMinimized()) w.restore();
      w.focus();
      w.webContents.send('blonay:ouvrir-onglet', liste);
    } else createWindow(liste);
    return;
  }
  if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
});

function createWindow(fichiers) {
  const win = new BrowserWindow({
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
      additionalArguments: ['--blonay-version=' + app.getVersion(), '--blonay-construction=' + CONSTRUCTION],
    },
  });
  win.blonayFichiers = fichiers || [];
  fenetres.add(win);
  win.once('ready-to-show', () => win.show());
  win.on('page-title-updated', (ev) => ev.preventDefault());
  win.loadFile(path.join(__dirname, 'app', 'index.html'));

  // Rien ne s'ouvre en dehors de la fenêtre, et la page ne navigue jamais ailleurs.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (ev) => ev.preventDefault());

  // Fermeture : la question de l'application, pas celle d'un navigateur.
  let quitter = false;
  win.webContents.on('will-prevent-unload', (ev) => ev.preventDefault());
  win.on('close', (ev) => {
    if (quitter) return;
    ev.preventDefault();
    (async () => {
      let modifie = false;
      try { modifie = await win.webContents.executeJavaScript("!!document.querySelector('#summary .mod') || !!document.querySelector('.onglet .mod')", true); } catch (e) { /* page absente */ }
      if (!modifie) { quitter = true; win.close(); return; }
      const { response } = await dialog.showMessageBox(win, {
        type: 'warning',
        buttons: ['Revenir au document', 'Quitter sans exporter'],
        defaultId: 0,
        cancelId: 0,
        title: APP_TITLE,
        message: 'Des modifications n\'ont pas été exportées.',
        detail: 'En quittant maintenant, vous les perdez.',
        noLink: true,
      });
      if (response === 1) { quitter = true; win.close(); }
    })();
  });
  win.on('closed', () => { fenetres.delete(win); });
  return win;
}

// Enregistrer : toujours la boîte « Enregistrer sous » de Windows, jamais en silence
// dans « Téléchargements ». (En test de fumée, BLONAY_SMOKE_DIR fixe le dossier.)
function setupDownloads() {
  session.defaultSession.on('will-download', (_ev, item, contents) => {
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
      if (!contents || contents.isDestroyed()) return;
      if (etat === 'completed' && /\.pdf$/i.test(item.getSavePath())) ajouterRecent(item.getSavePath());
      contents.send('blonay:enregistre', etat === 'completed' ? { chemin: item.getSavePath() } : { annule: true });
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
  // Les documents de cette fenêtre-là, remis une fois.
  ipcMain.handle('blonay:fichiers-initiaux', (e) => {
    const w = fenetreDe(e.sender);
    const l = (w && w.blonayFichiers) || [];
    if (w) w.blonayFichiers = [];
    return l;
  });
  // Enregistrer : réécrire le fichier ouvert, sur place, sans boîte de dialogue.
  ipcMain.handle('blonay:ecrire', (_e, o) => {
    try {
      if (!o || typeof o.chemin !== 'string' || !path.isAbsolute(o.chemin) || !o.octets) return { ok: false, erreur: 'chemin invalide' };
      const tmp = o.chemin + '.blonay-tmp';
      fs.writeFileSync(tmp, Buffer.from(o.octets));
      fs.renameSync(tmp, o.chemin);
      ajouterRecent(o.chemin);
      return { ok: true, chemin: o.chemin };
    } catch (err) { return { ok: false, erreur: err && err.message ? err.message : String(err) }; }
  });
  ipcMain.handle('blonay:recents', () => lireRecents().filter((c) => fs.existsSync(c)));
  // La page d'accueil rouvre un récent : seulement un chemin de la liste, jamais un autre.
  ipcMain.handle('blonay:lire-recent', (_e, chemin) => {
    if (typeof chemin !== 'string' || !lireRecents().includes(chemin) || !fs.existsSync(chemin)) return [];
    ajouterRecent(chemin);
    return lire([chemin]);
  });
  ipcMain.handle('blonay:recup-ecrire', (_e, o) => { try { return recupEcrire(o); } catch (err) { return { ok: false, erreur: err && err.message ? err.message : String(err) }; } });
  ipcMain.handle('blonay:recup-liste', () => { try { return recupListe(); } catch (err) { return []; } });
  ipcMain.handle('blonay:recup-lire', (_e, cle) => { try { return recupLire(cle); } catch (err) { return null; } });
  ipcMain.handle('blonay:recup-effacer', (_e, cle) => { try { return recupEffacer(cle); } catch (err) { return false; } });
  ipcMain.handle('blonay:imprimantes', async (e) => {
    const liste = await e.sender.getPrintersAsync();
    return liste.map((p) => ({ name: p.name, displayName: p.displayName || p.name, isDefault: !!p.isDefault }));
  });
  // Impression directe (imprimante choisie, recto verso, copies, taille de feuille) —
  // ou, avec « dialogue », la fenêtre d'impression de Windows et ses Propriétés.
  ipcMain.handle('blonay:imprimer', (e, o) => new Promise((resolve) => {
    const opts = {
      silent: !(o && o.dialogue), printBackground: true, color: true,
      copies: Math.max(1, Math.min(99, parseInt(o && o.copies, 10) || 1)),
      landscape: !!(o && o.paysage),
      duplexMode: ['simplex', 'shortEdge', 'longEdge'].includes(o && o.duplex) ? o.duplex : 'simplex',
      margins: { marginType: 'none' },
    };
    if (o && o.imprimante) opts.deviceName = o.imprimante;
    if (o && o.largeurMicrons > 0 && o.hauteurMicrons > 0) opts.pageSize = { width: o.largeurMicrons, height: o.hauteurMicrons };
    try {
      e.sender.print(opts, (ok, erreur) => resolve({ ok: !!ok, erreur: ok ? '' : String(erreur || '') }));
    } catch (err) { resolve({ ok: false, erreur: err && err.message ? err.message : String(err) }); }
  }));
}

const envoyer = (nom) => { const w = fenetreActive(); if (w) w.webContents.send('blonay:commande', nom); };

async function choisirDocuments(win) {
  const r = await dialog.showOpenDialog(win, {
    title: 'Ouvrir',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'PDF et images', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp'] }, { name: 'Tous les fichiers', extensions: ['*'] }],
  });
  if (r.canceled) return [];
  r.filePaths.forEach(ajouterRecent);
  return lire(r.filePaths);
}
function ouvrirRecent(chemin) {
  if (!fs.existsSync(chemin)) { dialog.showMessageBox({ type: 'warning', title: APP_TITLE, message: 'Ce fichier n\'existe plus :', detail: chemin, noLink: true }); viderRecents(); return; }
  const liste = lire([chemin]);
  if (!liste.length) return;
  ajouterRecent(chemin);
  const win = fenetreActive();
  if (win) win.webContents.send('blonay:ouvrir-onglet', liste); else createWindow(liste);
}

// Ouvrir… : un document à part, dans un nouvel onglet de la fenêtre courante
// si elle porte déjà un document (la page en décide) ; sans fenêtre, une nouvelle.
async function ouvrirDocuments() {
  const win = fenetreActive();
  const liste = await choisirDocuments(win);
  if (!liste.length) return;
  if (win) win.webContents.send('blonay:ouvrir-onglet', liste);
  else createWindow(liste);
}

// Ajouter au document… : les combiner, dans la fenêtre courante.
async function ajouterDocuments() {
  const win = fenetreActive();
  if (!win) return;
  const liste = await choisirDocuments(win);
  if (liste.length) win.webContents.send('blonay:ouvrir', liste);
}

function buildMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        { label: 'Ouvrir…', accelerator: 'CmdOrCtrl+O', click: ouvrirDocuments },
        {
          label: 'Récents',
          submenu: (lireRecents().length ? lireRecents().map((c) => ({ label: path.basename(c), sublabel: path.dirname(c), click: () => ouvrirRecent(c) })) : [{ label: 'Aucun fichier récent', enabled: false }])
            .concat([{ type: 'separator' }, { label: 'Effacer la liste', click: viderRecents }]),
        },
        { label: 'Ajouter au document…', accelerator: 'CmdOrCtrl+Shift+O', click: ajouterDocuments },
        { label: 'Nouvel onglet', accelerator: 'CmdOrCtrl+T', click: () => envoyer('nouvel-onglet') },
        { label: 'Nouvelle fenêtre', accelerator: 'CmdOrCtrl+N', click: () => createWindow([]) },
        {
          type: 'checkbox',
          label: 'Toujours ouvrir en onglet',
          checked: toujoursEnOnglet(),
          toolTip: 'Un double-clic sur un PDF depuis le bureau l\'ajoute à la fenêtre ouverte, au lieu d\'en ouvrir une seconde.',
          click: (item) => { const r = lireReglages(); r.toujoursEnOnglet = !!item.checked; ecrireReglages(r); },
        },
        { type: 'separator' },
        { id: 'enregistrer', label: 'Enregistrer', accelerator: 'CmdOrCtrl+S', click: () => envoyer('enregistrer') },
        { id: 'enregistrer-sous', label: 'Enregistrer sous…', accelerator: 'CmdOrCtrl+Shift+S', click: () => envoyer('exporter') },
        { label: 'Imprimer…', accelerator: 'CmdOrCtrl+P', click: () => envoyer('imprimer') },
        { type: 'separator' },
        { label: 'Ouvrir le dossier des données', click: () => shell.openPath(app.getPath('userData')) },
        { type: 'separator' },
        { label: 'Fermer l\'onglet', accelerator: 'CmdOrCtrl+W', click: () => envoyer('fermer-onglet') },
        { label: 'Fermer la fenêtre', accelerator: 'CmdOrCtrl+Shift+W', role: 'close' },
        { label: 'Quitter', accelerator: 'Alt+F4', role: 'quit' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Lire', accelerator: 'CmdOrCtrl+1', click: () => envoyer('lecture') },
        { label: 'Organiser les pages', accelerator: 'CmdOrCtrl+2', click: () => envoyer('organiser') },
        { label: 'Deux pages côte à côte', accelerator: 'CmdOrCtrl+Shift+2', click: () => envoyer('deux-pages') },
        { type: 'separator' },
        { label: 'Onglet suivant', accelerator: 'Ctrl+Tab', click: () => envoyer('onglet-suivant') },
        { label: 'Onglet précédent', accelerator: 'Ctrl+Shift+Tab', click: () => envoyer('onglet-precedent') },
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
      label: 'Outils',
      submenu: [
        { label: 'Éditeur de page', click: () => envoyer('editeur') },
        { label: 'Rechercher, remplacer, caviarder…', accelerator: 'CmdOrCtrl+F', click: () => envoyer('rechercher') },
        { label: 'Ajouter un signet', accelerator: 'CmdOrCtrl+B', click: () => envoyer('signet') },
        { type: 'separator' },
        { label: 'Reconnaître le texte (OCR)…', click: () => envoyer('ocr') },
        { label: 'Comparer deux versions…', click: () => envoyer('comparer') },
        { label: 'Copier un tableau vers Excel…', click: () => envoyer('tableau') },
        { type: 'separator' },
        { label: 'Constituer un dossier de pièces…', click: () => envoyer('dossier') },
        { label: 'Traiter plusieurs fichiers…', click: () => envoyer('lots') },
      ],
    },
    {
      label: 'Aide',
      submenu: [
        { label: 'Raccourcis clavier', accelerator: 'F1', click: () => envoyer('raccourcis') },
        { type: 'separator' },
        {
          label: 'À propos de ' + APP_TITLE,
          click: () => dialog.showMessageBox(fenetreActive(), {
            type: 'info',
            title: 'À propos de ' + APP_TITLE,
            message: APP_TITLE + ' ' + app.getVersion() + (CONSTRUCTION ? ' — ' + CONSTRUCTION : ' — version de travail'),
            detail: 'Organiser, corriger, annoter, remplir et imprimer des PDF.\n\n' +
              'Version portable : rien n\'est installé, aucune donnée ne quitte ce PC (les documents sont lus, ' +
              'modifiés et réassemblés dans cette fenêtre).\n\n' +
              'Dossier des données : ' + app.getPath('userData') + '\n' +
              (POURQUOI[RANGEMENT.pourquoi] || '') + '\n\n' +
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
  const initiaux = lire(fichiersDe(process.argv));
  initiaux.forEach((f) => ajouterRecent(f.chemin));
  createWindow(initiaux);
});

app.on('window-all-closed', () => app.quit());
