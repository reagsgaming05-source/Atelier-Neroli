/*
 * Compta Blonay – application fenêtrée (Electron) : une seule application pour les deux outils.
 *
 * La barre du haut de la fenêtre choisit l'outil. Caisse écoles est l'application autonome
 * (app/Caisse-ecoles.html, produite par `npm run build:public` dans le dossier parent). Décompte
 * DGEO est sa version portable (dossier decompte/ à côté de l'exécutable), démarrée en mode --web
 * dès l'ouverture, sur un port local libre, arrêtée avec la fenêtre, et posée dans l'espace
 * « Décompte DGEO » de la page Caisse écoles.
 * Les deux outils partagent le dossier de données `data/` à côté de l'exécutable et un pont :
 * chaque décompte terminé dans Décompte DGEO est proposé comme pièce DECOMPTE dans la caisse.
 * Rien n'est installé, rien n'est écrit dans le registre Windows, aucune connexion réseau
 * n'est ouverte vers l'extérieur.
 */
const { app, BrowserWindow, WebContentsView, Menu, dialog, shell, session, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
const os = require('os');
const nativeOcr = require('./native-ocr.js');
const dgeoProxy = require('./dgeo-proxy.js');
const { creerVeille } = require('./veille.js');
const emplacement = require('./emplacement.js');
const { mettreAJourLanceur } = require('./lanceur.js');
const D = require('./dialogues.js');

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

// Les données de la caisse — registres, justificatifs, scans, décomptes — peuvent vivre ailleurs
// que le profil du poste : sur le serveur, désigné par « donnees.txt » à côté du programme (voir
// emplacement.js). Le profil, lui, reste toujours sur le poste : Chromium y verrouille ses
// fichiers, et le verrou d'instance unique y est rangé.
// En développement, le « programme » est celui d'Electron, dans node_modules : on lit alors
// donnees.txt dans le profil.
const DOSSIER_REGLAGE = () => (app.isPackaged ? PORTABLE_DIR : app.getPath('userData'));
let donneesPartagees = emplacement.lireEmplacement(DOSSIER_REGLAGE(), process.env);
/** Vrai si, le serveur ne répondant pas au démarrage, on travaille pour cette fois sur la caisse de ce PC. */
let caisseSeparee = false;
/** Racine des données de la caisse. */
const DONNEES = () => (donneesPartagees ? donneesPartagees.chemin : app.getPath('userData'));

/**
 * La construction d'où vient ce programme (version.txt, écrit par la construction Windows :
 * commit, n° de construction, date). C'est ce que le lanceur compare au serveur pour savoir s'il
 * doit recopier ; et c'est la réponse à « quelle version tourne sur ce poste ? ».
 */
function versionConstruite() {
  try { return fs.readFileSync(path.join(PORTABLE_DIR, 'version.txt'), 'utf8').trim().split(/\s+/).slice(0, 3).join(' '); } catch (e) { return ''; }
}

// Fichier de suivi technique du processus principal (data/caisse.log) : démarrage, erreurs,
// lecteur natif. Comme decompte.log de Décompte DGEO, pour comprendre un problème sur un poste.
// (Pas un « journal » pour la personne : le journal, c'est celui de la caisse.)
const FICHIER_SUIVI = () => path.join(app.getPath('userData'), 'caisse.log');
function logLine(msg) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  try { fs.appendFileSync(FICHIER_SUIVI(), line); } catch (e) { /* ignore */ }
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
  const candidates = [path.join(PORTABLE_DIR, 'vocabulaire-noms.js'), path.join(DONNEES(), 'vocabulaire-noms.js'), path.join(app.getPath('userData'), 'vocabulaire-noms.js')];
  if (!app.isPackaged) candidates.push(path.join(__dirname, '..', 'src', 'vocabulaire-noms.js'));
  return candidates.find((p) => fs.existsSync(p)) || null;
}

let mainWindow = null;
let caisseView = null;
let dgeoView = null;
let activeTab = 'caisse';
let dgeoEmbed = null; // zone (px CSS de la page Caisse écoles) où la page Décompte DGEO s'affiche, ou null
const TAB_H = 46; // hauteur de la barre du haut (shell.html)
/** La vue a-t-elle encore sa page ? Une fois fermée (voir fermerLesPages), `webContents` n'existe plus du tout. */
const vivante = (v) => !!(v && v.webContents && !v.webContents.isDestroyed());
/** L'espace ouvert dans la page, tel qu'elle l'annonce : { outil: 'caisse'|'dgeo', outilNom, espace }. */
let espaceOuvert = { outil: 'caisse', outilNom: 'Caisse écoles', espace: '' };

// La page Caisse écoles occupe toute la fenêtre sous la barre ; la page Décompte DGEO est posée
// par-dessus, dans la zone que la barre latérale lui réserve (espace « Décompte DGEO »).
function layoutViews() {
  if (!mainWindow) return;
  const [w, h] = mainWindow.getContentSize();
  if (caisseView) { caisseView.setBounds({ x: 0, y: TAB_H, width: w, height: Math.max(0, h - TAB_H) }); caisseView.setVisible(true); }
  if (dgeoView) {
    if (dgeoEmbed) {
      const z = vivante(caisseView) ? caisseView.webContents.getZoomFactor() : 1; // pendant la fermeture, la page peut déjà être partie
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

/*
 * Taille et position de la fenêtre, retenues d'une fois à l'autre dans le profil du poste
 * (fenetre.json) : c'est un réglage de CE poste et de son écran, pas de la caisse partagée.
 */
const FICHIER_FENETRE = () => path.join(app.getPath('userData'), 'fenetre.json');
function lirePlacement() {
  let memo = null;
  try { memo = JSON.parse(fs.readFileSync(FICHIER_FENETRE(), 'utf8')); } catch (e) { /* première ouverture */ }
  let ecrans = [];
  try { ecrans = screen.getAllDisplays().map((d) => d.workArea); } catch (e) { /* ignore */ }
  return D.placementFenetre(memo, ecrans);
}
function retenirPlacement() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    // la taille « normale » seulement si la fenêtre est agrandie : sinon elle peut dater d'avant
    // un agrandissement que le système n'a jamais fait
    const agrandie = mainWindow.isMaximized();
    const b = agrandie ? mainWindow.getNormalBounds() : mainWindow.getBounds();
    fs.writeFileSync(FICHIER_FENETRE(), JSON.stringify({ x: b.x, y: b.y, width: b.width, height: b.height, agrandie }));
  } catch (e) { /* ignore */ }
}

function createWindow() {
  const place = lirePlacement();
  mainWindow = new BrowserWindow({
    width: place.width,
    height: place.height,
    ...(place.x != null ? { x: place.x, y: place.y } : {}),
    minWidth: 900,
    minHeight: 600,
    title: APP_TITLE,
    backgroundColor: '#1f4e79',
    show: false,
    icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'shell-preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  // La première fois, agrandie : à 1440 px, la fenêtre débordait d'un écran de portable et
  // n'utilisait qu'une partie d'un grand écran. Agrandie au moment de s'afficher seulement
  // (maximize() montrerait la fenêtre vide avant que la page soit prête).
  const montrer = () => {
    if (!mainWindow || mainWindow.isVisible()) return false;
    if (place.agrandie) mainWindow.maximize();
    mainWindow.show();
    return true;
  };
  // le titre suit l'espace ouvert (voir « app:espace »), pas le titre de la barre du haut
  mainWindow.on('page-title-updated', (ev) => ev.preventDefault());
  mainWindow.loadFile(path.join(__dirname, 'shell.html'));

  // Caisse écoles (application autonome)
  caisseView = new WebContentsView({ webPreferences: caissePreferences() });
  mainWindow.contentView.addChildView(caisseView);
  caisseView.webContents.loadFile(path.join(__dirname, 'app', 'Caisse-ecoles.html'));
  // Le rapport de contrôle s'ouvre dans une fenêtre de l'application (imprimable avec Ctrl+P)
  caisseView.webContents.setWindowOpenHandler(({ url, frameName }) => {
    if (url === 'about:blank' || url.startsWith('file:') || url.startsWith('blob:')) {
      // rapport de contrôle, fiche PDF à imprimer (visionneuse PDF de Chromium, Ctrl+P), récapitulatifs.
      // La fiche ouverte d'office à l'enregistrement, si la page la nomme « fichePdf » : une seule
      // fenêtre, réutilisée, montrée sans prendre le clavier — sinon, pour trente pièces à la suite,
      // le Ctrl+Entrée de la suivante partait dans la fenêtre du PDF.
      const discrete = frameName === 'fichePdf';
      return { action: 'allow', overrideBrowserWindowOptions: { width: 1000, height: 860, show: !discrete, title: `${APP_TITLE} – document`, autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false, plugins: true } } };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });
  caisseView.webContents.on('did-create-window', (w, details) => { if (details && details.frameName === 'fichePdf') w.showInactive(); });
  caisseView.webContents.once('did-finish-load', () => { if (montrer()) logLine('interface démarrée'); });

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

  // Décompte DGEO (serveur local embarqué, démarré avec l'application). Son préchargement ne fait
  // qu'une chose : des boîtes « OK / Annuler » en français (voir boites-preload.js).
  dgeoView = new WebContentsView({ webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'boites-preload.js') } });
  mainWindow.contentView.addChildView(dgeoView);
  dgeoView.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  // Le bouton « Relancer » des pages d'attente (dgeoPlaceholder) : une adresse qui ne mène nulle
  // part, interceptée ici. Le texte disait « Cliquez sur l'onglet », alors qu'il n'y a plus d'onglet.
  dgeoView.webContents.on('will-navigate', (ev, url) => {
    if (!String(url).startsWith(RELANCE_DGEO)) return;
    ev.preventDefault();
    launchDgeo().catch((e) => logLine(`Décompte DGEO : ${(e && e.message) || e}`));
  });
  // même aspect que Caisse écoles : thème (police, couleurs, arrondis) injecté dans la page de Décompte DGEO
  dgeoView.webContents.on('did-finish-load', () => {
    if (!dgeoView || !dgeo.url || !dgeoView.webContents.getURL().startsWith(dgeo.url)) return;
    // feuille ajoutée en fin de document pour passer après la feuille de style de Décompte DGEO
    const css = dgeoTheme();
    if (!css) return;
    dgeoView.webContents.executeJavaScript(`(function(){var s=document.getElementById('compta-theme')||document.createElement('style');s.id='compta-theme';s.textContent=${JSON.stringify(css)};document.documentElement.appendChild(s);})()`, true)
      .catch((e) => logLine(`thème DGEO : ${e.message}`));
  });
  dgeoView.webContents.loadURL(dgeoPlaceholder('Décompte DGEO', 'Démarrage de Décompte DGEO…', true));
  launchDgeo().catch((e) => logLine(`Décompte DGEO : ${(e && e.message) || e}`));

  // Une fiche non enregistrée (ou un décompte en cours) ne part pas sans qu'on l'ait dit.
  for (const [vue, nom] of [[caisseView, 'caisse'], [dgeoView, 'dgeo']]) {
    vue.webContents.on('will-prevent-unload', (ev) => {
      const r = dialog.showMessageBoxSync(mainWindow, D.boiteFermetureRefusee(nom));
      if (D.quitterMalgre(r)) { ev.preventDefault(); return; } // preventDefault : on passe outre, la page se ferme
      fermetureEnCours = false;
      app.isQuitting = false; // « Quitter » du menu est annulé lui aussi : l'application continue
    });
  }
  mainWindow.on('close', (ev) => {
    retenirPlacement();
    if (fermerLesPages()) ev.preventDefault();
  });
  mainWindow.on('resize', layoutViews);
  mainWindow.on('closed', () => { mainWindow = null; caisseView = null; dgeoView = null; });
  layoutViews();
  setTimeout(montrer, 4000);
}

/*
 * Fermer la fenêtre, c'est d'abord demander à chaque page si elle peut partir : une fiche à moitié
 * remplie (garde « beforeunload » de la page) ne doit pas disparaître en silence. Les vues posées
 * dans la fenêtre ne reçoivent pas cet avertissement d'elles-mêmes : on les ferme une à une en le
 * demandant (« will-prevent-unload » pose la question), et la fenêtre suit quand elles sont toutes
 * parties. Renvoie vrai tant qu'il faut retenir la fermeture de la fenêtre.
 */
let fermetureEnCours = false;
function fermerLesPages() {
  const ouverte = vivante;
  if (![caisseView, dgeoView].some(ouverte)) return false;
  if (fermetureEnCours) return true;
  fermetureEnCours = true;
  // une vue après l'autre : deux questions à la fois se recouvriraient
  const suivante = () => {
    const v = [caisseView, dgeoView].find(ouverte);
    if (!v) { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close(); return; }
    if (!v.ecouteFermeture) { v.ecouteFermeture = true; v.webContents.once('destroyed', () => { if (fermetureEnCours) suivante(); }); }
    v.webContents.close({ waitForBeforeUnload: true });
  };
  suivante();
  return true;
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

// Adresse du bouton « Relancer » des pages d'attente : jamais chargée, interceptée par
// « will-navigate » (voir createWindow). Un domaine en .invalid n'existe nulle part.
const RELANCE_DGEO = 'http://relancer.compta-blonay.invalid/';
const echapper = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/**
 * Page affichée à la place de Décompte DGEO quand il démarre, s'est arrêté ou manque.
 * `opts.relancer` : texte d'un bouton qui le relance ; `opts.technique` : le détail, sur une petite
 * ligne à part, pour la personne qui s'occupe de l'informatique.
 */
function dgeoPlaceholder(title, message, spinner, opts) {
  const o = opts || {};
  const bouton = o.relancer ? `<p style="margin:18px 0 0"><a href="${RELANCE_DGEO}" style="display:inline-block;background:#2457d6;color:#fff;text-decoration:none;font-weight:600;padding:9px 18px;border-radius:8px">${echapper(o.relancer)}</a></p>` : '';
  const technique = o.technique ? `<p style="color:#94a3b8;font-size:12px;margin:18px 0 0;line-height:1.45">Pour la personne qui s'occupe de l'informatique : ${echapper(o.technique)} (détails : menu Aide, fichier de suivi technique).</p>` : '';
  const html = `<!doctype html><meta charset="utf-8"><title>${echapper(title)}</title><body style="font-family:Inter,'Segoe UI',Arial,sans-serif;background:#f4f6fa;color:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center;max-width:560px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:34px 40px;box-shadow:0 1px 2px rgba(15,23,42,.05)">${spinner ? '<div style="width:34px;height:34px;margin:0 auto 16px;border:3px solid #e2e8f0;border-top-color:#2457d6;border-radius:50%;animation:s 1s linear infinite"></div><style>@keyframes s{to{transform:rotate(360deg)}}</style>' : ''}<h2 style="margin:0 0 8px;font-size:18px;letter-spacing:-.01em">${echapper(title)}</h2><p style="color:#64748b;margin:0;line-height:1.5">${echapper(message)}</p>${spinner ? '<p style="color:#94a3b8;font-size:12.5px;margin:12px 0 0">Cela prend quelques secondes au premier lancement…</p>' : ''}${bouton}${technique}</div></body>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

/* ---------------- Décompte DGEO : serveur local embarqué ---------------- */
// Le dossier decompte/ (version portable de Décompte DGEO) est posé à côté de l'exécutable ;
// son serveur est lancé en mode --web sur un port libre et affiché dans l'espace « Décompte DGEO ».
// En développement : DECOMPTE_CMD (ex. « python -m decompte ») avec DECOMPTE_CWD.
const dgeo = { proc: null, url: null, target: null, proxy: null, status: 'off', starting: null, lastExcelId: null, lastExcelAt: 0 };

/**
 * État de la fenêtre pour la barre du haut (et le test de fumée). `active` : la page Décompte DGEO
 * est-elle posée à l'écran ; `outil` : l'outil de l'espace ouvert (le Récapitulatif des décomptes
 * appartient à Décompte DGEO sans afficher sa page) ; `donnees` : ce que la barre dit de
 * l'emplacement des données.
 */
function shellState() {
  return {
    active: activeTab, outil: espaceOuvert.outil, embedded: !!dgeoEmbed, dgeo: dgeo.status, hasDgeo: !!dgeoCommand(),
    decomptes: loadDecomptes().filter((d) => !d.saisi).length,
    donnees: D.etiquetteDonnees({ partage: !!donneesPartagees, chemin: DONNEES(), separee: caisseSeparee }),
  };
}
function pushShellState() {
  const st = shellState();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('shell:state', st);
  notifyCaisse('shell:state', st);
}
function notifyCaisse(channel, payload) {
  if (vivante(caisseView)) caisseView.webContents.send(channel, payload);
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
    const stopped = (title, detail, msg, opts) => {
      if (dgeo.proc !== child) return;
      logLine(msg);
      dgeo.proc = null;
      if (dgeo.proxy) { try { dgeo.proxy.close(); } catch (e) { /* ignore */ } dgeo.proxy = null; }
      dgeo.url = null; dgeo.target = null;
      dgeo.status = dgeo.status === 'ready' ? 'off' : 'failed';
      if (dgeoView && !app.isQuitting) dgeoView.webContents.loadURL(dgeoPlaceholder(title, detail, false, opts));
      pushShellState();
    };
    // « error » : le programme n'a pas pu être lancé (introuvable, droits refusés, DECOMPTE_CMD
    // erroné). « exit » n'est alors jamais émis : sans cet écouteur, Node arrête l'application et
    // l'attente ci-dessous tournerait 90 secondes dans le vide.
    child.on('error', (e) => stopped("Décompte DGEO n'a pas pu démarrer", "Le module Décompte DGEO n'a pas pu être lancé sur ce PC.", `Décompte DGEO : lancement impossible (${e.message})`, { relancer: 'Réessayer', technique: `lancement impossible (${e.message})` }));
    child.on('exit', (code) => stopped("Décompte DGEO s'est arrêté", "Le module Décompte DGEO s'est arrêté. Un décompte en cours, s'il y en avait un, est à reprendre.", `Décompte DGEO arrêté (code ${code})`, { relancer: 'Relancer Décompte DGEO', technique: `arrêt du programme (code ${code})` }));
    const url = `http://127.0.0.1:${port}/`;
    for (let i = 0; i < 180; i++) {
      if (!dgeo.proc) break;
      if (await httpOk(url + 'api/health')) {
        // passerelle devant Décompte DGEO : le dossier PDF est nettoyé (pièce comptable retirée) avant l'analyse
        dgeo.target = url;
        try {
          dgeo.proxy = await dgeoProxy.startProxy({ target: url, clean: cleanDossierViaPage, onCleaned: (info) => notifyCaisse('dgeo:cleaned', info), onAnalysed: recordDossier, onSaved: (info) => recordDossier(info, true), log: logLine });
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

/** Démarre Décompte DGEO (à l'ouverture de la fenêtre, ou pour le relancer) et affiche sa page. */
async function launchDgeo() {
  if (!dgeoCommand()) {
    dgeo.status = 'missing';
    if (dgeoView) dgeoView.webContents.loadURL(dgeoPlaceholder("Décompte DGEO n'est pas inclus", 'Le module Décompte DGEO manque dans le dossier du programme. Demandez à la personne qui a installé Compta Blonay de reprendre le zip complet depuis la page de téléchargement.', false, { technique: `dossier « decompte » absent à côté de ${path.basename(process.execPath)}` }));
    pushShellState();
    return null;
  }
  if (dgeo.status !== 'ready' && dgeoView) dgeoView.webContents.loadURL(dgeoPlaceholder('Décompte DGEO', 'Démarrage de Décompte DGEO…', true));
  pushShellState();
  const url = await startDgeo();
  if (!dgeoView) return url;
  if (url) { if (!dgeoView.webContents.getURL().startsWith(url)) dgeoView.webContents.loadURL(url); }
  else dgeoView.webContents.loadURL(dgeoPlaceholder('Décompte DGEO ne répond pas', "Le module Décompte DGEO n'a pas démarré.", false, { relancer: 'Réessayer', technique: 'le serveur local de Décompte DGEO ne répond pas' }));
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
  // espace ouvert : l'état de la page est (re)donné aux raccourcis ; espace quitté : plus de suivi
  if (!!dgeoEmbed !== !!dgeoSuivi) { dgeoPageEtat = ''; suivreDgeo(); }
});
// bouton « Décompte DGEO » de la fiche : la page de Décompte DGEO elle-même
ipcMain.on('shell:tab', (ev, name) => { showTab(name === 'dgeo' ? 'dgeo' : 'caisse'); });
// barre du haut : l'outil, rouvert là où on l'avait laissé (c'est la page qui s'en souvient)
ipcMain.on('shell:outil', (ev, outil) => { notifyCaisse('app:outil', outil === 'dgeo' ? 'dgeo' : 'caisse'); });
// barre du haut : l'emplacement des données, expliqué dans « L'année → Où sont les données »
ipcMain.on('shell:donnees', () => { notifyCaisse('app:aller', { panel: 'panelAnnee', cible: 'carteEmplacement' }); });
// La page annonce l'espace ouvert : le titre de la fenêtre le dit (barre des tâches, Alt+Tab),
// et la barre du haut marque l'outil.
ipcMain.on('app:espace', (ev, info) => {
  const i = info && typeof info === 'object' ? info : {};
  espaceOuvert = { outil: i.outil === 'dgeo' ? 'dgeo' : 'caisse', outilNom: String(i.outilNom || ''), espace: String(i.espace || '') };
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setTitle(D.titreFenetre({ outil: espaceOuvert.outilNom, espace: espaceOuvert.espace }));
  pushShellState();
});
// le détail technique d'une erreur que la page a reçue en français (voir preload.js)
ipcMain.on('journal:erreur', (ev, texte) => { logLine(`erreur montrée à la page — ${String(texte).slice(0, 2000)}`); });
// raccourcis de la barre latérale vers les sections de la page Décompte DGEO (ids de sa page)
ipcMain.on('dgeo:scroll', (ev, sectionId) => {
  if (!dgeoView || dgeo.status !== 'ready' || !/^[a-z-]{1,40}$/.test(String(sectionId))) return;
  dgeoView.webContents.executeJavaScript(`(function(){var el=document.getElementById(${JSON.stringify(String(sectionId))});if(el&&!el.hidden){el.scrollIntoView({behavior:'smooth',block:'start'});}else{window.scrollTo({top:0,behavior:'smooth'});}})()`, true).catch(() => {});
});
// État de la page Décompte DGEO pour ces raccourcis : un dossier est-il ouvert (sinon ses
// sections sont masquées et le raccourci ne menait nulle part), et quelle section est à l'écran
// (l'entrée active ne suivait pas le défilement). Demandé à la page tant que l'espace est affiché.
let dgeoSuivi = null;
let dgeoPageEtat = '';
function suivreDgeo() {
  if (dgeoSuivi) { clearInterval(dgeoSuivi); dgeoSuivi = null; }
  if (!dgeoEmbed || !dgeoView) return;
  const lire = `(function(){var ids=['sec-upload','sec-dossier','sec-pieces','sec-rows'];var d=document.getElementById('sec-dossier');var ouvert=!!d&&!d.hidden;var cur='sec-upload';for(var i=0;i<ids.length;i++){var e=document.getElementById(ids[i]);if(e&&!e.hidden&&e.getBoundingClientRect().top<=120)cur=ids[i];}if(ouvert&&window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-4)cur='sec-rows';return {ouvert:ouvert,section:cur};})()`;
  dgeoSuivi = setInterval(() => {
    if (!dgeoView || dgeo.status !== 'ready' || !dgeo.url || !dgeoView.webContents.getURL().startsWith(dgeo.url)) return;
    dgeoView.webContents.executeJavaScript(lire, true).then((s) => {
      const k = JSON.stringify(s);
      if (k !== dgeoPageEtat) { dgeoPageEtat = k; notifyCaisse('dgeo:page', s); }
    }).catch(() => {});
  }, 500);
}
ipcMain.handle('shell:state', () => shellState());

/*
 * confirm() et alert() de la page, en français (voir boites-preload.js). La page attend la
 * réponse : elle arrive quand la boîte se ferme, sans bloquer le programme entre-temps (la veille
 * des scans et Décompte DGEO continuent).
 */
function repondreBoite(ev, options, valeur) {
  const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
  (parent ? dialog.showMessageBox(parent, options) : dialog.showMessageBox(options))
    .then((r) => { ev.returnValue = valeur(r.response); })
    .catch(() => { ev.returnValue = false; });
}
ipcMain.on('boite:confirmer', (ev, texte) => repondreBoite(ev, D.boiteConfirmation(texte), (r) => r === 0));
ipcMain.on('boite:avertir', (ev, texte) => repondreBoite(ev, D.boiteAlerte(texte), () => true));

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
const DEPOT = () => path.join(DONNEES(), 'Scans');
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
    if (!vivante(caisseView) || !caissePrete) { resolve({ ok: false, raison: "l'application n'est pas encore prête" }); return; }
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
const DECOMPTES = () => path.join(DONNEES(), 'Décomptes');
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
  const racine = DONNEES();
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
    if (!vivante(caisseView)) { resolve(null); return; }
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
  resolve({ bytes: r.bytes ? Buffer.from(r.bytes) : null, removed: Array.isArray(r.removed) ? r.removed : [], total: Number(r.total) || 0, reason: String(r.reason || ''), supposee: !!r.supposee });
});

/* ---------------- Dossiers analysés par Décompte DGEO (formulaire affiché dans l'application) ---------------- */
// Chaque dossier analysé (réponse de Décompte DGEO) est résumé dans data/caisse/dossiers-dgeo.json :
// pages (dont le formulaire de couverture, image servie par Décompte DGEO) et champs lus.
const DOSSIERS_FILE = () => path.join(REG_ROOT(), 'dossiers-dgeo.json');
function loadDossiers() {
  try { const a = JSON.parse(fs.readFileSync(DOSSIERS_FILE(), 'utf8')); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
const withBase = (d) => Object.assign({}, d, { base: dgeo.url || '' });
// suivi = décompte enregistré ou repris par la page (et non analysé) : le volet suit ses chiffres,
// l'heure d'analyse reste celle d'origine, et caisse.log n'en garde pas une ligne à chaque frappe
function recordDossier(info, suivi) {
  if (!info || !info.id) return;
  const list = loadDossiers();
  const old = list.find((d) => d.id === info.id);
  if (suivi && old && old.analysedAt) info = Object.assign({}, info, { analysedAt: old.analysedAt });
  const rest = list.filter((d) => d.id !== info.id);
  rest.unshift(info);
  fs.mkdirSync(REG_ROOT(), { recursive: true });
  fs.writeFileSync(DOSSIERS_FILE(), JSON.stringify(rest.slice(0, 30), null, 1));
  if (!suivi) logLine(`dossier analysé par Décompte DGEO : ${info.filename} – ${info.activite || '?'} ${info.classe || ''} – ${info.pages.length} page(s), formulaire : ${info.pages.filter((p) => p.kind === 'form').map((p) => p.number).join(', ') || 'non reconnu'}`);
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
    s.excel = old.excel; s.excelPoste = old.excelPoste; s.saisi = old.saisi; s.pieceId = old.pieceId;
    // la page Caisse écoles le signale (totalPrecedent) : une ligne dans caisse.log ne se voyait pas
    if (old.saisi && old.total !== s.total) { s.totalPrecedent = old.total; logLine(`Décompte ${s.numero || s.id} refait (total ${old.total} → ${s.total}) alors que sa pièce comptable existe déjà : à vérifier.`); }
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
  const isExcel = (details) => vivante(dgeoView) && details.webContentsId === dgeoView.webContents.id && details.method === 'POST' && /\/api\/excel(\?|$)/.test(details.url);
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
// true si le fichier s'ouvre ; sinon { message } : la liste des décomptes est partagée, mais le
// fichier a pu être enregistré sur un autre poste
ipcMain.handle('dgeo:open-excel', (ev, id) => {
  const d = loadDecomptes().find((x) => x.id === String(id));
  if (d && d.excel && fs.existsSync(d.excel)) { shell.openPath(d.excel); return true; }
  return { message: D.messageExcelIntrouvable({ chemin: d && d.excel, poste: d && d.excelPoste, ici: os.hostname() }) };
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
    // Le fichier Excel d'un décompte, quand les données sont partagées : dans le dossier
    // « Décomptes » du serveur, pour que « Ouvrir l'Excel » marche aussi depuis le poste d'une
    // collègue (dans les Documents d'un PC, il n'est visible que de ce PC).
    const duDecompte = !!(vivante(dgeoView) && wc && wc.id === dgeoView.webContents.id);
    let dossier = app.getPath('documents');
    if (duDecompte && donneesPartagees) { try { fs.mkdirSync(DECOMPTES(), { recursive: true }); dossier = DECOMPTES(); } catch (e) { /* les Documents, à défaut */ } }
    item.setSaveDialogOptions({
      title: 'Enregistrer le fichier',
      defaultPath: path.join(dossier, name),
      filters,
    });
    // fichier Excel d'un décompte DGEO : son emplacement est retenu avec le décompte (pont)
    if (duDecompte) {
      item.once('done', (e, state) => {
        if (state !== 'completed') return;
        const list = loadDecomptes();
        // le décompte que Décompte DGEO vient de produire (pont « /api/excel »), et non le dernier
        // de la liste : avec deux décomptes en attente, refaire l'Excel du plus ancien écrivait son
        // emplacement sur le plus récent
        const fresh = dgeo.lastExcelId && Date.now() - (dgeo.lastExcelAt || 0) < 5 * 60 * 1000 ? list.find((x) => x.id === dgeo.lastExcelId) : null;
        const d = fresh || list.slice().reverse().find((x) => !x.saisi);
        if (d) { d.excel = item.getSavePath(); d.excelPoste = os.hostname(); saveDecomptes(list); notifyCaisse('dgeo:new', d); }
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

/**
 * Le mode d'emploi livré avec le programme. Sur un PC installé depuis le serveur, le dossier du
 * programme est caché dans le profil Windows : sans ce menu, personne ne le retrouve.
 */
function ouvrirModeEmploi() {
  // LISEZMOI.txt : le nom qu'il porte dans le zip (voir la construction) ; les deux autres servent
  // quand l'application est lancée depuis le dépôt
  const f = [path.join(PORTABLE_DIR, 'LISEZMOI.txt'), path.join(PORTABLE_DIR, 'LISEZMOI-portable.txt'), path.join(__dirname, 'build', 'LISEZMOI-portable.txt')].find((p) => fs.existsSync(p));
  if (f) { shell.openPath(f); return; }
  dialog.showMessageBox(mainWindow, { type: 'info', title: APP_TITLE, message: "Le mode d'emploi est introuvable", detail: `Il devrait se trouver à côté du programme : ${path.join(PORTABLE_DIR, 'LISEZMOI.txt')}.`, buttons: ['OK'], noLink: true });
}

function aPropos() {
  const names = namesFile();
  const t = nativeOcr.detect(PORTABLE_DIR);
  const { message, detail } = D.texteAPropos({
    construction: versionConstruite(),
    donnees: DONNEES(),
    partage: !!donneesPartagees,
    programme: PORTABLE_DIR,
    suivi: FICHIER_SUIVI(),
    noms: names,
    tesseract: t ? `${t.version}${t.legacy ? ' + moteur historique' : ''}` : 'non trouvé (dossier tesseract/ absent)',
    dgeo: dgeoCommand() ? (dgeo.status === 'ready' ? `en service (${dgeo.url})` : dgeo.status === 'starting' ? 'démarrage…' : 'inclus, arrêté') : 'non inclus',
    electron: process.versions.electron,
    chromium: process.versions.chrome,
  });
  dialog.showMessageBox(mainWindow, { type: 'info', title: `À propos de ${APP_TITLE}`, message, detail, buttons: ['OK'], noLink: true });
}

function buildMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        // « journaux » : ceux de la caisse, un par année (le fichier de suivi technique est dans le menu Aide)
        { label: 'Ouvrir le dossier des données (journaux, justificatifs, scans)', click: () => shell.openPath(DONNEES()) },
        { type: 'separator' },
        { label: 'Quitter', accelerator: 'Alt+F4', role: 'quit' },
      ],
    },
    {
      label: 'Affichage',
      // « Recharger l'application » n'y est plus : c'était un outil de mise au point, qui effaçait
      // une fiche en cours de saisie.
      submenu: [
        { label: 'Agrandir', accelerator: 'CmdOrCtrl+=', click: () => zoomActive(0.1) },
        { label: 'Réduire', accelerator: 'CmdOrCtrl+-', click: () => zoomActive(-0.1) },
        { label: 'Taille normale', accelerator: 'CmdOrCtrl+0', click: () => zoomActive(0) },
        { type: 'separator' },
        { label: 'Plein écran', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Espaces',
      submenu: [
        { label: 'Caisse écoles', enabled: false },
        { label: 'Saisie des pièces', accelerator: 'CmdOrCtrl+1', click: () => openPanel('panelSaisie') },
        { label: 'Pièces scannées', accelerator: 'CmdOrCtrl+2', click: () => openPanel('panelScan') },
        { label: 'Boîte de réception', accelerator: 'CmdOrCtrl+3', click: () => openPanel('panelReception') },
        { label: 'Compter la caisse', accelerator: 'CmdOrCtrl+4', click: () => openPanel('panelCaisse') },
        { label: "L'année", accelerator: 'CmdOrCtrl+5', click: () => openPanel('panelAnnee') },
        { label: 'Listes (comptes, classes, noms)', accelerator: 'CmdOrCtrl+6', click: () => openPanel('panelDonnees') },
        { type: 'separator' },
        { label: 'Décompte DGEO', enabled: false },
        { label: 'Décompte DGEO', accelerator: 'CmdOrCtrl+7', click: () => openPanel('panelDgeo') },
        { label: 'Récapitulatif des décomptes', accelerator: 'CmdOrCtrl+8', click: () => openPanel('panelRecap') },
      ],
    },
    {
      label: 'Aide',
      submenu: [
        { label: "Mode d'emploi", accelerator: 'F1', click: ouvrirModeEmploi },
        { label: 'Où sont mes données ?', click: () => notifyCaisse('app:aller', { panel: 'panelAnnee', cible: 'carteEmplacement' }) },
        { type: 'separator' },
        { label: "Pour l'informatique : fichier de suivi technique (caisse.log)", click: () => shell.openPath(FICHIER_SUIVI()) },
        { type: 'separator' },
        { label: `À propos de ${APP_TITLE}`, click: aPropos },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.on('second-instance', () => {
  if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  // encore au démarrage (serveur qui tarde, question posée) : on montre où l'on en est
  else if (attente && !attente.isDestroyed()) { attente.show(); attente.focus(); }
});

/* ---------------- Registre des pièces : fichiers de l'application ---------------- */
// data/caisse/<année>/registre.json et data/caisse/<année>/pieces/<id>/<justificatif>
const REG_ROOT = () => path.join(DONNEES(), 'caisse');
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

/* ---------------- Où vivent les données (voir emplacement.js) ---------------- */
function relancer() {
  // après la réponse à la page, pour qu'elle ait le temps d'afficher ce qu'on lui dit
  setTimeout(() => { app.relaunch(); app.exit(0); }, 600);
}
/*
 * Un poste installé depuis le serveur (« Installer sur ce PC ») reçoit à chaque lancement le
 * donnees.txt du dossier du programme sur le serveur (voir build/Compta Blonay.cmd) : un
 * emplacement choisi ici ne tiendrait que jusqu'au lancement suivant. « Ce poste ne les verra
 * plus » était faux. Vrai seulement si le serveur a bien un donnees.txt (sinon le lanceur garde
 * celui du poste) ; un serveur qui ne répond pas dans les 3 s ne bloque rien.
 */
async function emplacementFixeParLeServeur() {
  if (!app.isPackaged || !D.installeDepuisServeur({ localAppData: process.env.LOCALAPPDATA, programme: PORTABLE_DIR, existe: fs.existsSync, sep: path.sep })) return false;
  let serveur = '';
  try { serveur = fs.readFileSync(path.join(process.env.LOCALAPPDATA, 'ComptaBlonay-serveur.txt'), 'utf8').trim(); } catch (e) { return false; }
  if (!serveur) return false;
  const essai = fs.promises.access(path.join(serveur, emplacement.FICHIER)).then(() => true, () => false);
  return Promise.race([essai, new Promise((r) => setTimeout(() => r(false), 3000))]);
}
/** Pourquoi l'emplacement ne se change pas d'ici (texte montré dans « Où sont les données »), ou ''. */
async function emplacementBloque() {
  if (caisseSeparee) {
    return "Pour cette fois, Compta Blonay travaille sur la caisse de ce PC : le dossier des données du serveur ne répondait pas au démarrage. "
      + "Ce qui est saisi ici n'apparaîtra pas chez les collègues. Au prochain lancement, Compta Blonay cherchera de nouveau le serveur.";
  }
  if (await emplacementFixeParLeServeur()) {
    return "Sur ce PC, l'emplacement des données est repris à chaque lancement du dossier du programme sur le serveur (fichier donnees.txt) : "
      + "c'est ce fichier du serveur qu'il faut changer, et tous les postes suivront.";
  }
  return '';
}
ipcMain.handle('donnees:etat', async () => {
  const note = await emplacementBloque();
  return {
    partage: !!donneesPartagees,
    chemin: DONNEES(),
    source: donneesPartagees ? donneesPartagees.source : null,
    poste: app.getPath('userData'),
    reglage: path.join(DOSSIER_REGLAGE(), emplacement.FICHIER),
    // posé par l'informatique (variable d'environnement) ou par le serveur : ce n'est pas à l'écran de le changer
    modifiable: !note && (!donneesPartagees || donneesPartagees.source === emplacement.FICHIER),
    separee: caisseSeparee,
    note,
  };
});
ipcMain.handle('donnees:choisir', async () => {
  if (donneesPartagees && donneesPartagees.source !== emplacement.FICHIER) return { change: false, erreur: 'L\'emplacement est fixé par l\'informatique (COMPTA_DONNEES).' };
  const bloque = await emplacementBloque();
  if (bloque) return { change: false, erreur: bloque };
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Dossier des données partagées — tapez l\'adresse \\\\SERVEUR\\partage en haut',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Mettre les données ici',
  });
  if (r.canceled || !r.filePaths.length) return { change: false };
  const cible = r.filePaths[0];
  const courant = DONNEES();
  if (path.resolve(cible) === path.resolve(courant)) return { change: false, erreur: 'Ce sont déjà les données utilisées.' };
  const v = await emplacement.verifierDossier(cible);
  if (!v.ok) {
    logLine(`dossier des données refusé : ${cible} — ${v.raison}`);
    return { change: false, erreur: `Ce dossier n'est pas utilisable : ${D.expliquerErreur(v.raison, { reseau: estReseau(cible) }).texte}.` };
  }
  // une caisse sans aucune pièce (laissée par « Partir de zéro ») ne compte pas : on peut encore emporter
  const dejaUneCaisse = emplacement.caisseEnUsage(cible);
  let copie = null;
  if (!dejaUneCaisse && fs.existsSync(path.join(courant, 'caisse'))) {
    const q = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: APP_TITLE,
      message: 'Emporter les journaux de ce PC dans ce dossier ?',
      detail: 'Le dossier choisi ne contient pas encore de caisse.\n\n'
        + '« Emporter » y copie les journaux, les justificatifs, les scans et les décomptes de ce PC : c\'est ce qu\'il faut la première fois. '
        + 'Rien n\'est retiré de ce PC.\n\n« Partir de zéro » laisse le dossier vide : les journaux de ce PC n\'y seront pas. '
        + 'Tant qu\'aucune pièce n\'y est saisie, vous pourrez encore les emporter (« Revenir aux données de ce PC », puis « Mettre les données sur le serveur… »).',
      buttons: ['Emporter', 'Partir de zéro', 'Annuler'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    });
    if (q.response === 2) return { change: false };
    if (q.response === 0) {
      try { copie = await emplacement.copierSiVide(courant, cible); }
      catch (e) {
        logLine(`copie des données vers ${cible} : ${(e && e.message) || e}`);
        return { change: false, erreur: `La copie a échoué, rien n'a été changé : ${D.expliquerErreur(e, { reseau: estReseau(cible) }).texte}.` };
      }
    }
  }
  try { emplacement.ecrireEmplacement(DOSSIER_REGLAGE(), cible); }
  catch (e) { return { change: false, erreur: `Impossible d'écrire ${emplacement.FICHIER} à côté du programme (${(e && e.code) || e}). Le programme est-il dans un dossier protégé ?` }; }
  logLine(`données déplacées vers ${cible}${copie && copie.copie ? ` (copié : ${copie.dossiers.join(', ')})` : ''}${dejaUneCaisse ? ' (caisse existante reprise)' : ''}`);
  // La copie a pu durer une minute : on dit ce qui est parti AVANT de redémarrer, au lieu d'un
  // message de 0,6 s et d'une ligne dans le journal technique.
  if (copie && copie.copie) {
    await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: APP_TITLE,
      message: 'Données emportées sur le serveur',
      detail: `Dans ${cible}, l'application a copié ${emplacement.resumeCopie(copie)}.\n\nRien n'a été retiré de ce PC. Compta Blonay va redémarrer sur ce dossier.`,
      buttons: ['OK'],
      noLink: true,
    });
  }
  relancer();
  return { change: true, chemin: cible, dejaUneCaisse, copie };
});
ipcMain.handle('donnees:ouvrir', () => { try { fs.mkdirSync(DONNEES(), { recursive: true }); } catch (e) { /* signalé par l'explorateur */ } return shell.openPath(DONNEES()); });
ipcMain.handle('donnees:local', async () => {
  if (!donneesPartagees || donneesPartagees.source !== emplacement.FICHIER) return { change: false };
  if (await emplacementBloque()) return { change: false };
  emplacement.ecrireEmplacement(DOSSIER_REGLAGE(), null);
  logLine(`retour aux données du poste : ${app.getPath('userData')}`);
  relancer();
  return { change: true };
});
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
/*
 * Enregistrement du registre, avec un contrôle pour les données partagées.
 *
 * `attendu` est le texte que la page croit trouver sur le disque (null : l'année ne devrait pas
 * encore exister ; absent : ne rien vérifier — une restauration voulue). Si un autre poste a écrit
 * entre-temps, on n'écrase pas : on rend ce qu'il a écrit, et la page fusionne (registre.js).
 * Le contrôle se fait juste avant le renommage, pour que la fenêtre où deux postes pourraient
 * encore se croiser ne dure que quelques millisecondes.
 */
ipcMain.handle('files:save', (ev, y, text, attendu) => {
  if (!yearOk(y)) throw new Error('année invalide');
  const dir = regDir(y);
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, 'registre.json');
  const tmp = `${f}.${os.hostname().replace(/[^A-Za-z0-9_-]/g, '_')}.${process.pid}.tmp`; // un fichier de travail par poste
  fs.writeFileSync(tmp, String(text));
  if (attendu !== undefined) {
    const actuel = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
    if (actuel !== null && actuel !== attendu) {
      try { fs.unlinkSync(tmp); } catch (e) { /* ignore */ }
      logLine(`registre ${y} : modifié par un autre poste depuis sa lecture — fusion`);
      return { conflit: true, disque: actuel };
    }
  }
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

/*
 * Une petite fenêtre pendant qu'on attend le serveur. Un serveur éteint fait attendre Windows
 * jusqu'à 15 s (voir emplacement.js), avant et après chaque « Réessayer » : sans elle, rien ne
 * s'affichait, on double-cliquait de nouveau, et la seconde ouverture se fermait sans un mot.
 * Elle sert aussi de fenêtre aux questions du démarrage (sinon posées sur un bureau vide).
 */
let attente = null;
function montrerAttente(titre, texte) {
  if (!attente || attente.isDestroyed()) {
    attente = new BrowserWindow({
      width: 540, height: 230, resizable: false, maximizable: false, fullscreenable: false, show: false,
      title: APP_TITLE, backgroundColor: '#f4f6fa', autoHideMenuBar: true,
      icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    });
    attente.setMenuBarVisibility(false);
    attente.once('ready-to-show', () => { if (attente && !attente.isDestroyed()) attente.show(); });
  }
  const html = `<!doctype html><meta charset="utf-8"><title>${APP_TITLE}</title><body style="font-family:'Segoe UI',Inter,Arial,sans-serif;background:#f4f6fa;color:#0f172a;margin:0;padding:26px 30px"><h2 style="margin:0 0 10px;font-size:17px">${echapper(titre)}</h2><p style="margin:0;color:#475569;line-height:1.5;white-space:pre-line">${echapper(texte)}</p></body>`;
  attente.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}
function fermerAttente() { if (attente && !attente.isDestroyed()) attente.destroy(); attente = null; }

/** La caisse gardée sur ce PC (son profil) : l'année la plus récente et son nombre de pièces, ou null. */
function caisseLocale() {
  const racine = path.join(app.getPath('userData'), 'caisse');
  let annees = [];
  try {
    annees = fs.readdirSync(racine).filter(yearOk).map((a) => {
      try {
        const r = JSON.parse(fs.readFileSync(path.join(racine, a, 'registre.json'), 'utf8'));
        return { annee: Number(a), pieces: Array.isArray(r.pieces) ? r.pieces.length : 0 };
      } catch (e) { return null; }
    }).filter(Boolean);
  } catch (e) { /* aucune caisse sur ce PC */ }
  return D.resumeCaisse(annees);
}

/**
 * Les données partagées sont-elles joignables ? Sinon, on ne s'ouvre pas sur autre chose.
 *
 * Retomber en silence sur les données du poste serait pire que tout : on saisirait dans un
 * registre à part, qui ne rejoindrait jamais celui du serveur — deux caisses pour une. La personne
 * choisit donc : réessayer (le serveur démarrait, le réseau revenait), quitter, ou travailler pour
 * cette fois sur la caisse de ce PC, après avoir lu ce qu'elle contient et ce que deviendra ce
 * qu'elle y saisit.
 *
 * « Pour cette fois » : donnees.txt n'est plus effacé. L'ancien « Revenir aux données de ce PC »
 * l'effaçait, et sur un PC installé depuis le serveur le lanceur le remettait au démarrage
 * suivant : les pièces saisies la veille « disparaissaient » dans une caisse que plus rien
 * n'ouvrait. Désormais le poste revient de lui-même au serveur, et l'écran le dit tout le temps
 * (barre du haut en orange).
 */
async function assurerDonnees() {
  if (!donneesPartagees) return true;
  const chemin = donneesPartagees.chemin;
  for (;;) {
    // la petite fenêtre ne s'ouvre que si la réponse tarde : un serveur qui répond ne fait rien clignoter
    const minuteur = setTimeout(() => montrerAttente('Connexion au dossier des données…', `${chemin}\n\nSi le serveur est éteint, Compta Blonay le dira dans 15 secondes au plus.`), 700);
    const v = await emplacement.verifierDossier(chemin);
    clearTimeout(minuteur);
    if (v.ok) { logLine(`données partagées joignables : ${chemin}`); return true; }
    logLine(`données partagées injoignables : ${chemin} — ${v.raison}`);
    montrerAttente('Le dossier des données ne répond pas', `${chemin}\n\nRépondez à la question affichée.`);
    const raison = D.expliquerErreur(v.raison, { reseau: estReseau(chemin) }).texte;
    let choix;
    for (;;) {
      choix = (await dialog.showMessageBox(attente, D.boiteDossierInjoignable({ chemin, raison, separeePossible: true }))).response;
      if (choix !== 2) break;
      const c = await dialog.showMessageBox(attente, D.boiteCaisseSeparee(caisseLocale()));
      if (c.response === 1) break; // sinon : retour à la première question
    }
    if (choix === 0) continue;
    if (choix === 2) {
      logLine(`serveur injoignable : pour cette fois, caisse de ce poste (${app.getPath('userData')}) ; donnees.txt reste en place`);
      donneesPartagees = null;
      caisseSeparee = true;
      return true;
    }
    app.quit();
    return false;
  }
}

app.whenReady().then(async () => {
  logLine(`${APP_TITLE} ${app.getVersion()} – Electron ${process.versions.electron} – ${process.platform} – construction : ${versionConstruite() || '?'} – exécutable : ${PORTABLE_DIR} – profil : ${app.getPath('userData')} – données : ${DONNEES()}${donneesPartagees ? ` (${donneesPartagees.source})` : ''}`);
  if (raisonDonneesAilleurs) logLine(`données hors du dossier de l'application : ${raisonDonneesAilleurs}`);
  if (!(await assurerDonnees())) return;
  setupDownloads();
  setupDgeoBridge();
  buildMenu();
  createWindow();
  // la petite fenêtre d'attente s'efface quand la vraie s'affiche
  if (attente) { mainWindow.once('show', fermerAttente); if (mainWindow.isVisible()) fermerAttente(); }
  // la veille démarre quand la page Caisse écoles a fini de charger (voir createWindow) : après la
  // fenêtre, pour qu'un partage injoignable ne retienne pas l'ouverture, et jamais avant que la
  // page puisse répondre — sinon le premier scan du matin part « à revoir » sans avoir été lu
  // Le lanceur des postes installés avant le sous-dossier « Installation sur plusieurs PC » ne se
  // met plus à jour lui-même (voir lanceur.js) : on le remplace, une fois qu'il a fini de tourner.
  setTimeout(() => {
    try {
      if (mettreAJourLanceur({ localAppData: process.env.LOCALAPPDATA, dossierProgramme: PORTABLE_DIR }) === 'remplace') {
        logLine('lanceur du poste remplacé par celui du programme (Installation sur plusieurs PC\\lanceur.cmd)');
      }
    } catch (e) { logLine(`lanceur du poste non remplacé : ${e.message}`); }
  }, 15000);
});

app.on('window-all-closed', () => app.quit());
// La veille et Décompte DGEO ne s'arrêtent qu'une fois les fenêtres vraiment fermées : « Quitter »
// peut encore être annulé par la question sur une fiche non enregistrée.
app.on('before-quit', () => { app.isQuitting = true; });
app.on('will-quit', () => { if (veille) veille.arreter(); stopDgeo(); });
