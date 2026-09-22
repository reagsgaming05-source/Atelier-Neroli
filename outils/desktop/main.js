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
const os = require('os');

const APP_TITLE = 'Blonay PDF';
// Date, commit et horodatage de construction, posés par build.js puis
// prepare-app.js. La date sert à « À propos », et à reconnaître un zip plus
// récent posé à côté de l'application (voir version-posee.js).
let VERSION = {};
try { VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, 'app', 'construction.json'), 'utf8')) || {}; } catch (e) { /* version de travail */ }
const CONSTRUCTION = String(VERSION.construction || '');
// BLONAY_DOSSIER_APP : le test de fumée fait passer un dossier d'essai pour le
// dossier de l'application, afin que le choix du rangement se joue pour de vrai.
const PORTABLE_DIR = process.env.BLONAY_DOSSIER_APP || path.dirname(process.execPath);
const { MARQUEUR, COMPTES, cheminReseau, ouRanger, nomDeDossier, listerComptes, POURQUOI } = require('./ou-ranger');
const { FICHE, sceller, verifier, protege, motDePasseAcceptable } = require('./comptes');
const { miseAJourPosee, poserLeJeton, retirerLeJeton, autresPostes, nettoyerLesJetons } = require('./version-posee');
const EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];

// Où vont les données : à côté de l'exécutable, ou dans le profil de chacun.
// ou-ranger.js porte la décision et l'explique ; ici, seulement ce qui touche
// au disque.
let RANGEMENT = { ou: 'cote', pourquoi: 'portable' };
let PROFIL = null; // le compte choisi, en mode « comptes »
const DOSSIER_DATA = () => path.join(PORTABLE_DIR, 'data');

// Qui utilise ce poste. Le choix est retenu ici, dans le profil Windows de la
// personne — surtout pas sur le partage, où il serait celui de tout le monde.
// Une entrée par installation : la même personne peut ouvrir deux dossiers.
// BLONAY_PROFIL : le test des comptes joue plusieurs postes sur une seule
// machine et doit donner à chacun son profil. Changer APPDATA n'y suffit pas —
// sous Windows, Electron ne lit pas cette variable, il demande le dossier au
// système, et les faux postes se retrouveraient à partager une seule session.
const profilLocal = () => process.env.BLONAY_PROFIL || app.getPath('appData');
const fichierChoix = () => path.join(profilLocal(), 'Blonay PDF', 'session.json');
function lireChoix() {
  try {
    const tout = JSON.parse(fs.readFileSync(fichierChoix(), 'utf8'));
    return nomDeDossier(tout[PORTABLE_DIR.toLowerCase()]);
  } catch (e) { return null; }
}
function ecrireChoix(nom) {
  try {
    const f = fichierChoix();
    let tout = {};
    try { tout = JSON.parse(fs.readFileSync(f, 'utf8')) || {}; } catch (e) { /* premier passage */ }
    if (nom) tout[PORTABLE_DIR.toLowerCase()] = nom;
    else delete tout[PORTABLE_DIR.toLowerCase()];
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(tout, null, 2));
    return true;
  } catch (e) { return false; }
}

// La fiche d'un compte : son nom et l'empreinte de son mot de passe. Jamais le
// mot de passe lui-même — voir comptes.js.
function lireFiche(nom) {
  try { return JSON.parse(fs.readFileSync(path.join(DOSSIER_DATA(), nom, FICHE), 'utf8')) || {}; }
  catch (e) { return {}; } // compte pas encore créé, ou fiche abîmée
}
function ecrireFiche(nom, fiche) {
  try {
    fs.mkdirSync(path.join(DOSSIER_DATA(), nom), { recursive: true });
    fs.writeFileSync(path.join(DOSSIER_DATA(), nom, FICHE), JSON.stringify(fiche, null, 2));
    return true;
  } catch (e) { return false; }
}

// Créer un compte, ou se connecter au sien. Rendent un message à afficher, ou
// rien du tout quand c'est bon.
function creerLeCompte(nom, motDePasse) {
  const propre = nomDeDossier(nom);
  if (!propre) return 'Ce nom ne peut pas servir de dossier. Essayez votre prénom et votre nom.';
  if (comptesConnus().some((n) => n.toLowerCase() === propre.toLowerCase())) {
    return 'Ce compte existe déjà. Choisissez-le dans la liste pour vous connecter.';
  }
  const souci = motDePasseAcceptable(motDePasse);
  if (souci) return souci;
  if (!ecrireFiche(propre, { nom: propre, cree: new Date().toISOString(), motDePasse: sceller(motDePasse) })) {
    return 'Impossible d\u2019écrire dans le dossier des données.';
  }
  return ouvrirLaSession(propre);
}

function connexion(nom, motDePasse) {
  const propre = nomDeDossier(nom);
  if (!propre) return 'Compte inconnu.';
  const fiche = lireFiche(propre);
  // Un compte sans mot de passe : celui d'avant, ou un mot de passe retiré par
  // l'administrateur pour en redonner l'accès. On en pose un maintenant.
  if (!protege(fiche)) {
    const souci = motDePasseAcceptable(motDePasse);
    if (souci) return souci;
    if (!ecrireFiche(propre, Object.assign({ nom: propre }, fiche, { motDePasse: sceller(motDePasse) }))) {
      return 'Impossible d\u2019écrire dans le dossier des données.';
    }
    return ouvrirLaSession(propre);
  }
  if (!verifier(motDePasse, fiche)) return 'Mot de passe incorrect.';
  return ouvrirLaSession(propre);
}

// Les comptes proposés : ceux de comptes.txt, plus ceux qui ont déjà un
// dossier dans data/.
function comptesConnus() {
  // Lu en octets : listerComptes reconnaît le codage (voir lireTexte).
  let lignes = Buffer.alloc(0);
  try { lignes = fs.readFileSync(path.join(PORTABLE_DIR, COMPTES)); } catch (e) { /* fichier vide ou absent */ }
  let dossiers = [];
  try {
    dossiers = fs.readdirSync(DOSSIER_DATA(), { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== 'recuperation').map((d) => d.name);
  } catch (e) { /* data pas encore créé */ }
  return listerComptes(lignes, dossiers);
}

// Un lecteur réseau monté sur une lettre (P:, S:…) ne se distingue pas d'un
// disque local par son chemin. Windows, lui, le sait : « net use P: » répond
// pour un lecteur mappé et échoue pour un disque. La fenêtre de la commande est
// masquée — sinon une console noire clignoterait à chaque lancement — et le
// temps est borné : un serveur qui ne répond pas ne doit pas retenir l'ouverture.
// BLONAY_RESEAU : pour éprouver ce chemin ailleurs que sur un vrai partage.
function surLeReseau() {
  if (process.env.BLONAY_RESEAU) return process.env.BLONAY_RESEAU !== '0';
  if (cheminReseau(PORTABLE_DIR)) return true;
  if (process.platform !== 'win32') return false;
  const lettre = /^([A-Za-z]):[\\/]/.exec(PORTABLE_DIR || '');
  if (!lettre) return false;
  try {
    require('child_process').execFileSync('net', ['use', lettre[1] + ':'],
      { windowsHide: true, stdio: ['ignore', 'ignore', 'ignore'], timeout: 4000 });
    return true;
  } catch (e) { return false; } // disque local, ou « net » indisponible
}

function setupUserData() {
  // Test de fumée : un dossier de données à part, pour ne toucher ni aux
  // récents ni à la récupération de l'utilisateur.
  if (!process.env.BLONAY_DOSSIER_APP && process.env.BLONAY_SMOKE_DIR) {
    try { app.setPath('userData', path.join(process.env.BLONAY_SMOKE_DIR, 'donnees')); } catch (e) { /* tant pis */ }
    return;
  }
  if (!app.isPackaged && !process.env.BLONAY_DOSSIER_APP) return;
  const dir = DOSSIER_DATA();
  RANGEMENT = ouRanger(PORTABLE_DIR, {
    comptesOuverts: () => { try { return fs.existsSync(path.join(PORTABLE_DIR, COMPTES)); } catch (e) { return false; } },
    surLeReseau,
    marqueurPose: () => { try { return fs.existsSync(path.join(PORTABLE_DIR, MARQUEUR)); } catch (e) { return false; } },
    dossierInscriptible: () => {
      try { fs.mkdirSync(dir, { recursive: true }); fs.accessSync(dir, fs.constants.W_OK); return true; }
      catch (e) { return false; }
    },
  });
  // Un dossier par personne, dans data/. Le compte est lu avant que quoi que
  // ce soit ne soit ouvert : les tampons et les signatures vivent dans le
  // stockage local du moteur d'affichage, qui suit le dossier de données —
  // le fixer trop tard les mélangerait.
  if (RANGEMENT.ou === 'comptes') {
    // La connexion tient tant qu'on ne se déconnecte pas : elle est retenue
    // dans le profil Windows de la personne, que le système protège déjà.
    PROFIL = lireChoix();
    if (PROFIL) {
      const sien = path.join(dir, PROFIL);
      try { fs.mkdirSync(sien, { recursive: true }); app.setPath('userData', sien); }
      catch (e) { PROFIL = null; }
    }
    return; // sans compte choisi, on demandera une fois la fenêtre possible
  }
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
// La boîte s'accroche à une fenêtre quand il y en a une, et se pose seule
// sinon : au démarrage, une mise à jour peut être proposée avant la première.
const direA = (opts) => {
  const f = fenetreActive();
  return f ? dialog.showMessageBox(f, opts) : dialog.showMessageBox(opts);
};
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
        ...(RANGEMENT.ou === 'comptes' ? [{
          label: 'Se déconnecter' + (PROFIL ? ' (' + PROFIL + ')' : ''),
          click: async () => {
            const r = await dialog.showMessageBox({
              type: 'question', buttons: ['Se déconnecter', 'Annuler'], defaultId: 1, cancelId: 1,
              message: 'Se déconnecter de Blonay PDF ?',
              detail: 'L\u2019application redémarre et redemandera le mot de passe. Rien n\u2019est effacé : '
                + 'le dossier de ' + (PROFIL || 'chacun') + ' reste tel quel.',
            });
            if (r.response !== 0) return;
            ecrireChoix(null);
            app.relaunch();
            app.exit(0);
          },
        }] : []),
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
        { label: 'Rechercher une mise à jour', click: () => { chercherUneMiseAJour(true).catch(() => {}); } },
        {
          label: 'À propos de ' + APP_TITLE,
          click: () => dialog.showMessageBox(fenetreActive(), {
            type: 'info',
            title: 'À propos de ' + APP_TITLE,
            message: APP_TITLE + ' ' + app.getVersion() + (CONSTRUCTION ? ' — ' + CONSTRUCTION : ' — version de travail'),
            detail: 'Organiser, corriger, annoter, remplir et imprimer des PDF.\n\n' +
              'Version portable : rien n\'est installé, aucune donnée ne quitte ce PC (les documents sont lus, ' +
              'modifiés et réassemblés dans cette fenêtre).\n\n' +
              (PROFIL ? 'Compte : ' + PROFIL + '\n' : '') +
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

// « Qui êtes-vous ? », une seule fois par personne et par poste. La fenêtre
// tourne dans une session en mémoire : elle ne doit rien écrire dans un dossier
// de données qu'on n'a justement pas encore choisi.
function demanderLeCompte() {
  const fen = new BrowserWindow({
    width: 460, height: 540, resizable: false, minimizable: false, maximizable: false,
    fullscreenable: false, title: APP_TITLE, show: false, autoHideMenuBar: true,
    backgroundColor: '#191F25',
    webPreferences: { preload: path.join(__dirname, 'choix-preload.js'), partition: 'choix-du-compte' },
  });
  fen.removeMenu();
  fen.once('ready-to-show', () => fen.show());
  fen.loadFile(path.join(__dirname, 'choix-profil.html'));
  // Refermée sans rien choisir : on ne peut pas travailler sans dossier.
  fen.on('closed', () => { if (!PROFIL) app.exit(0); }); // sans compte, rien à ouvrir
}

// La connexion est retenue, puis l'application redémarre : le dossier de
// données doit être fixé avant que quoi que ce soit ne soit ouvert, et c'est
// au tout début du démarrage que cela se joue. Une fois, jusqu'à la
// déconnexion. Rend un message d'erreur, ou rien quand c'est bon.
function ouvrirLaSession(nom) {
  try { fs.mkdirSync(path.join(DOSSIER_DATA(), nom), { recursive: true }); }
  catch (e) { return 'Impossible de créer le dossier de ce compte.'; }
  if (!ecrireChoix(nom)) return 'Impossible de retenir la connexion sur ce poste.';
  PROFIL = nom;
  app.relaunch();
  app.exit(0);
  return '';
}

// =============================================================================
//  La mise à jour qui se propose toute seule
// =============================================================================
// L'application est posée sur un partage et chacune l'ouvre par un raccourci.
// Mettre à jour, c'est remplacer ce seul dossier — mais encore faut-il que
// quelqu'un lance le script. Elle regarde donc si un zip plus récent a été posé
// à côté d'elle, et le dit. Rien n'est téléchargé : c'est vous qui apportez le
// zip. version-posee.js porte la lecture et la décision, éprouvées à part.

// Tant qu'une fenêtre est ouverte, ce poste laisse un jeton daté dans « data ».
// Une mise à jour lancée depuis un autre poste le verra : Windows verrouille un
// exécutable en cours, et celui-ci tourne depuis le partage, là où « tasklist »
// du poste voisin ne peut pas le voir.
let MON_JETON = null;
let BATTEMENT = null;
function annoncerCePoste() {
  const battre = () => { MON_JETON = poserLeJeton(DOSSIER_DATA(), os.hostname(), process.pid, Date.now()); };
  battre();
  nettoyerLesJetons(DOSSIER_DATA(), Date.now()); // les postes éteints d'hier
  BATTEMENT = setInterval(battre, 30 * 1000);
  if (BATTEMENT.unref) BATTEMENT.unref(); // ne retient pas la fermeture
}

let MAJ_VUE = false;      // proposée une fois par session, pas à chaque fenêtre
let MAJ_DEMANDEE = null;  // le script à lancer en partant, une fois tout fermé

async function chercherUneMiseAJour(demandee) {
  // Lecture synchrone, comme tout ce qui touche au dossier de l'application :
  // quelques dizaines de kilo-octets lus dans l'index du zip, et la fenêtre est
  // déjà ouverte depuis plusieurs secondes quand cela se produit.
  const trouvee = miseAJourPosee(PORTABLE_DIR, VERSION);
  if (!trouvee) {
    if (demandee) {
      direA({
        type: 'info', title: APP_TITLE, noLink: true,
        message: 'Vous avez la version la plus récente.',
        detail: (CONSTRUCTION || 'Version de travail') + '\n\n'
          + 'Pour mettre à jour : posez « BlonayPDF-windows.zip » à côté de l\'application '
          + '(ou dans un sous-dossier « maj »), et relancez-la.',
      });
    }
    return;
  }
  if (!demandee && MAJ_VUE) return;
  MAJ_VUE = true;
  const { response } = await direA({
    type: 'question', noLink: true, defaultId: 0, cancelId: 1,
    buttons: ['Mettre à jour maintenant', 'Plus tard'],
    title: APP_TITLE,
    message: 'Une version plus récente est posée à côté de l\'application.',
    detail: 'Installée : ' + (CONSTRUCTION || 'version de travail') + '\n'
      + 'Posée : ' + (trouvee.version.construction || path.basename(trouvee.zip)) + '\n\n'
      + 'La mise à jour ferme l\'application, remplace ses fichiers et la rouvre. '
      + 'Vos tampons, votre signature, vos récents et le travail mis de côté sont conservés.',
  });
  if (response === 0) lancerLaMiseAJour(trouvee);
}

function lancerLaMiseAJour(trouvee) {
  const script = path.join(PORTABLE_DIR, 'Mettre-a-jour.cmd');
  if (!fs.existsSync(script)) {
    direA({
      type: 'warning', title: APP_TITLE, noLink: true,
      message: 'Le script de mise à jour est introuvable.',
      detail: 'Fermez l\'application, puis décompressez « ' + path.basename(trouvee.zip)
        + ' » par-dessus le dossier, sans toucher à « data ».',
    });
    return;
  }
  // Une collègue encore dedans, et la copie se fait à moitié : ses fichiers
  // ouverts sont verrouillés. Mieux vaut le dire que réparer ensuite.
  const autres = autresPostes(DOSSIER_DATA(), MON_JETON, Date.now());
  if (autres.length) {
    direA({
      type: 'warning', title: APP_TITLE, noLink: true,
      message: 'L\'application est encore ouverte ailleurs.',
      detail: (autres.length > 1 ? 'Ces postes l\'ont ouverte : ' : 'Ce poste l\'a ouverte : ')
        + autres.join(', ') + '.\n\n'
        + 'Windows verrouille les fichiers en cours d\'utilisation : la mise à jour ne se ferait '
        + 'qu\'à moitié. Demandez qu\'on la referme, puis réessayez.',
    });
    return;
  }
  MAJ_DEMANDEE = { script, zip: trouvee.zip };
  // Fermer peut être refusé — une fenêtre demande confirmation quand du travail
  // n'est pas enregistré. Dans ce cas « will-quit » n'arrive jamais : la mise à
  // jour en attente s'oublie d'elle-même, plutôt que de partir au prochain
  // départ, des heures plus tard et sans crier gare.
  const oubli = setTimeout(() => { MAJ_DEMANDEE = null; }, 20 * 1000);
  if (oubli.unref) oubli.unref();
  app.quit();
}

app.on('will-quit', () => {
  if (BATTEMENT) clearInterval(BATTEMENT);
  retirerLeJeton(MON_JETON);
  if (!MAJ_DEMANDEE) return;
  const { script, zip } = MAJ_DEMANDEE;
  // Sous Windows, un .cmd passe par cmd.exe ; ailleurs — en essai — le script
  // est lancé tel quel. La console reste visible : la copie prend une minute,
  // et une fenêtre qui dit ce qu'elle fait vaut mieux qu'un écran vide.
  const quoi = process.platform === 'win32'
    ? { fichier: 'cmd.exe', args: ['/c', script, zip] }
    : { fichier: script, args: [zip] };
  try {
    const parti = require('child_process').spawn(quoi.fichier, quoi.args, {
      cwd: PORTABLE_DIR, detached: true, stdio: 'ignore', windowsHide: false,
      env: Object.assign({}, process.env, { BLONAY_MAJ_AUTO: '1' }),
    });
    parti.unref(); // il doit nous survivre : c'est lui qui nous remplace
  } catch (e) { /* rien à faire de plus : l'application part quand même */ }
});

app.whenReady().then(() => {
  if (RANGEMENT.ou === 'comptes' && !PROFIL) {
    ipcMain.handle('blonay:comptes', () => comptesConnus().map((nom) => ({ nom, protege: protege(lireFiche(nom)) })));
    ipcMain.handle('blonay:connexion', (_e, nom, motDePasse) => connexion(nom, motDePasse));
    ipcMain.handle('blonay:creer', (_e, nom, motDePasse) => creerLeCompte(nom, motDePasse));
    demanderLeCompte();
    return;
  }
  setupNetwork();
  setupDownloads();
  setupIpc();
  buildMenu();
  const initiaux = lire(fichiersDe(process.argv));
  initiaux.forEach((f) => ajouterRecent(f.chemin));
  createWindow(initiaux);
  // Seulement là où il y a une installation à mettre à jour : empaquetée, ou
  // le dossier d'essai que les tests font passer pour telle.
  if (app.isPackaged || process.env.BLONAY_DOSSIER_APP) {
    annoncerCePoste();
    // Quelques secondes après : le partage peut prendre son temps, et une
    // fenêtre qui tarde à s'afficher se remarque tout de suite.
    // BLONAY_MAJ_DELAI : le test a besoin d'avoir posé ses guetteurs avant.
    const delai = Number(process.env.BLONAY_MAJ_DELAI) || 4000;
    const plusTard = setTimeout(() => { chercherUneMiseAJour(false).catch(() => {}); }, delai);
    if (plusTard.unref) plusTard.unref();
  }
});

app.on('window-all-closed', () => app.quit());
