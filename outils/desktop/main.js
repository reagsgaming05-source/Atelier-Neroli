/*
 * Aktum PDF – application fenêtrée (Electron).
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
const { app, BrowserWindow, Menu, dialog, shell, session, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const langue = require('./langue');

// =============================================================================
//  Réseau fermé — trois barrières, chacune suffisante pour une seule défaillance
// =============================================================================
// « Aucune donnée ne quitte le poste » est une promesse faite à des
// secrétariats qui traitent des documents sensibles : elle ne tient pas sur une
// seule serrure, et pas sur la seule intention de la page.
//  1. Les noms de domaine ne se résolvent pas : toute adresse autre que celle de
//     la machine échoue avant qu'un paquet ne parte (host-resolver-rules).
//  2. Un mandataire fixe, mort — 127.0.0.1:1 —, pour TOUTES les sessions et pour
//     le réseau interne de Chromium : jamais de mandataire du système, jamais de
//     détection automatique (WPAD/PAC), et ce qui échapperait aux deux autres
//     tomberait sur un port fermé.
//  3. Chaque session refuse toute requête qui n'est pas locale, et tient la liste
//     de ce qu'elle a refusé (voir reseauRefuse), pour que le test puisse dire
//     « rien n'a même essayé ».
// Les services d'arrière-plan de Chromium (mises à jour de composants, mesures,
// pings) sont arrêtés à la source : ils n'ont rien à faire dans cette application.
//
// AKTUM_OBSERVATEUR (tests seulement) : l'adresse d'un mandataire d'observation
// qui prend la place du mandataire mort. Il note tout ce qui lui parvient ; le
// test échoue si la moindre connexion y arrive pendant un usage normal.
// AKTUM_OBSERVATEUR_OUVERT (tests seulement, avec le précédent) : lève la
// barrière 3 et la barrière 1, pour prouver que l'observateur voit bien ce qui
// s'échapperait.
const MANDATAIRE = process.env.AKTUM_OBSERVATEUR || '127.0.0.1:1';
const BARRIERES_LEVEES = !!process.env.AKTUM_OBSERVATEUR && process.env.AKTUM_OBSERVATEUR_OUVERT === '1';
app.commandLine.appendSwitch('proxy-server', MANDATAIRE);
app.commandLine.appendSwitch('proxy-bypass-list', '<-loopback>');
if (!BARRIERES_LEVEES) app.commandLine.appendSwitch('host-resolver-rules', 'MAP * ~NOTFOUND , EXCLUDE ' + MANDATAIRE.split(':')[0]);
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('no-pings');
app.commandLine.appendSwitch('disable-features', 'OptimizationHints,MediaRouter,NetworkTimeServiceQuerying,InterestFeedContentSuggestions');

// Ce que les barrières ont refusé : { url, quand }. Vide, en usage normal.
const reseauRefuse = [];
global.__aktumReseau = reseauRefuse;
const sessionsFermees = new WeakSet();
function fermerLaSession(s) {
  if (!s || sessionsFermees.has(s)) return;
  sessionsFermees.add(s);
  s.setProxy({ mode: 'fixed_servers', proxyRules: MANDATAIRE, proxyBypassRules: '<-loopback>' }).catch(() => {});
  // Le correcteur orthographique de Chromium va chercher son dictionnaire chez
  // Google (redirector.gvt1.com) dès qu'une session existe — l'observation l'a
  // montré, alors que « spellcheck: false » était posé sur la fenêtre. La
  // session le coupe, ne lui laisse aucune langue, et lui retire son adresse.
  try {
    s.setSpellCheckerEnabled(false);
    s.setSpellCheckerLanguages([]);
    s.setSpellCheckerDictionaryDownloadURL('http://127.0.0.1:1/');
  } catch (e) { /* une version sans correcteur : rien à fermer */ }
  s.webRequest.onBeforeRequest((details, callback) => {
    const u = details.url;
    const local = u.startsWith('file:') || u.startsWith('blob:') || u.startsWith('data:') || u.startsWith('devtools:');
    if (!local) reseauRefuse.push({ url: u.slice(0, 300), quand: new Date().toISOString() });
    callback({ cancel: !local && !BARRIERES_LEVEES });
  });
}
// Toute session créée, y compris celles qu'une version future ouvrirait sans y penser.
app.on('session-created', fermerLaSession);

const APP_TITLE = 'Aktum PDF';
// Date, commit et horodatage de construction, posés par build.js puis
// prepare-app.js. La date sert à « À propos », et à reconnaître un zip plus
// récent posé à côté de l'application (voir version-posee.js).
let VERSION = {};
try { VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, 'app', 'construction.json'), 'utf8')) || {}; } catch (e) { /* version de travail */ }
const CONSTRUCTION = String(VERSION.construction || '');
// AKTUM_DOSSIER_APP : le test de fumée fait passer un dossier d'essai pour le
// dossier de l'application, afin que le choix du rangement se joue pour de vrai.
const PORTABLE_DIR = process.env.AKTUM_DOSSIER_APP
  || require('./ou-ranger').dossierPortable(path.dirname(process.execPath), process.platform);

const SCRIPT_MAJ = require('./ou-ranger').nomDuScriptDeMaj(process.platform);
const { MARQUEUR, COMPTES, cheminReseau, ouRanger, nomDeDossier, listerComptes, POURQUOI } = require('./ou-ranger');
const comptes = require('./comptes');
const { FICHE, sceller, verifier, protege, motDePasseAcceptable } = comptes;
const { examinerLesZips, poserLeJeton, retirerLeJeton, autresPostes, nettoyerLesJetons } = require('./version-posee');
const signature = require('./signature');
const licence = require('./licence');
const diagnostic = require('./diagnostic');
const verrou = require('./verrou');
// Cette instance de l'application : le verrou d'un document dit « c'est moi », ou « c'est quelqu'un d'autre ».
const INSTANCE = require('crypto').randomUUID();
const verrousPoses = new Set();
const EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];

// Où vont les données : dans le dossier de la personne connectée, ou dans le
// profil Windows de chacun quand les comptes ne peuvent pas s'ouvrir.
// ou-ranger.js porte la décision et l'explique ; ici, seulement ce qui touche
// au disque.
// La valeur de départ, « cote », ne vaut que pour une exécution depuis les
// sources : rien n'est alors installé, il n'y a ni compte ni connexion à
// demander, et les données restent dans data/ à côté du code.
let RANGEMENT = { ou: 'cote', pourquoi: 'portable' };
let PROFIL = null; // le compte choisi, en mode « comptes »
const DOSSIER_DATA = () => path.join(PORTABLE_DIR, 'data');

// Qui utilise ce poste. Le choix est retenu ici, dans le profil Windows de la
// personne — surtout pas sur le partage, où il serait celui de tout le monde.
// Une entrée par installation : la même personne peut ouvrir deux dossiers.
// AKTUM_PROFIL : le test des comptes joue plusieurs postes sur une seule
// machine et doit donner à chacun son profil. Changer APPDATA n'y suffit pas —
// sous Windows, Electron ne lit pas cette variable, il demande le dossier au
// système, et les faux postes se retrouveraient à partager une seule session.
const profilLocal = () => process.env.AKTUM_PROFIL || app.getPath('appData');
const fichierChoix = () => path.join(profilLocal(), 'Aktum PDF', 'session.json');
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

// Créer un compte, ou se connecter au sien. Rendent un message à afficher ; ou
// { code, nom } quand il y a un code de récupération à montrer avant d'ouvrir la
// session ; ou rien du tout quand c'est bon.
//
// Le code n'est montré qu'une fois, et la session ne s'ouvre qu'après que la
// personne a dit l'avoir noté (aktum:ouvrir) : ouvrir tout de suite
// redémarrerait l'application avant qu'elle ait pu le recopier.
const POSTE = () => { try { return os.hostname(); } catch (e) { return ''; } };
let pretAOuvrir = null; // le seul compte que aktum:ouvrir peut ouvrir, une fois

// Le frein, après un échec : le message dit aussi combien de temps patienter.
function apresEchec(propre, fiche, base) {
  const f = comptes.noterEchec(fiche);
  ecrireFiche(propre, f);
  const ms = comptes.attente(f);
  return ms > 0 ? base + ' ' + comptes.messageAttente(ms) : base;
}
function avecNouveauCode(propre, fiche, quoi) {
  const code = comptes.codeDeRecuperation();
  const f = comptes.noterEvenement(Object.assign({ nom: propre }, comptes.effacerEchecs(fiche), { recuperation: comptes.scellerCode(code) }), quoi, POSTE());
  return { code, fiche: f };
}

function creerLeCompte(nom, motDePasse) {
  const propre = nomDeDossier(nom);
  if (!propre) return 'Ce nom ne peut pas servir de dossier. Essayez votre prénom et votre nom.';
  if (comptesConnus().some((n) => n.toLowerCase() === propre.toLowerCase())) {
    return 'Ce compte existe déjà. Choisissez-le dans la liste pour vous connecter.';
  }
  const souci = motDePasseAcceptable(motDePasse, propre);
  if (souci) return souci;
  const { code, fiche } = avecNouveauCode(propre, { nom: propre, cree: new Date().toISOString(), motDePasse: sceller(motDePasse) }, 'compte créé');
  if (!ecrireFiche(propre, fiche)) return 'Impossible d’écrire dans le dossier des données.';
  pretAOuvrir = propre;
  return { code, nom: propre };
}

function connexion(nom, motDePasse) {
  const propre = nomDeDossier(nom);
  if (!propre) return 'Compte inconnu.';
  let fiche = lireFiche(propre);
  const ms = comptes.attente(fiche);
  if (ms > 0) return comptes.messageAttente(ms);
  // Un compte sans mot de passe : celui d'avant, ou un mot de passe retiré par
  // l'administrateur pour en redonner l'accès. Le compte appartient alors au
  // premier arrivé — c'est le principe de cette procédure — mais cela se voit
  // (la liste le dit, la fiche garde la date et le poste) et il reçoit un code
  // de récupération tout neuf.
  if (!protege(fiche)) {
    const souci = motDePasseAcceptable(motDePasse, propre);
    if (souci) return souci;
    const r = avecNouveauCode(propre, Object.assign({}, fiche, { motDePasse: sceller(motDePasse) }), 'mot de passe posé après réinitialisation');
    if (!ecrireFiche(propre, r.fiche)) return 'Impossible d’écrire dans le dossier des données.';
    pretAOuvrir = propre;
    return { code: r.code, nom: propre };
  }
  if (!verifier(motDePasse, fiche)) return apresEchec(propre, fiche, 'Mot de passe incorrect.');
  // Connexion réussie : le frein repart à zéro, une empreinte posée avec l'ancien
  // coût se refait au coût actuel, et un compte sans code de récupération en reçoit un.
  const avant = JSON.stringify(fiche);
  fiche = comptes.effacerEchecs(fiche);
  if (comptes.aRehacher(fiche)) fiche.motDePasse = sceller(motDePasse);
  if (!fiche.recuperation) {
    const r = avecNouveauCode(propre, fiche, 'code de récupération créé');
    if (ecrireFiche(propre, r.fiche)) { pretAOuvrir = propre; return { code: r.code, nom: propre }; }
  }
  if (JSON.stringify(fiche) !== avant) ecrireFiche(propre, fiche);
  return ouvrirLaSession(propre);
}

// Mot de passe oublié : le code de récupération, montré une fois à la création
// ou à la dernière réinitialisation, tient lieu de mot de passe pour en poser un nouveau.
function recuperer(nom, code, nouveau) {
  const propre = nomDeDossier(nom);
  if (!propre) return 'Compte inconnu.';
  const fiche = lireFiche(propre);
  const ms = comptes.attente(fiche);
  if (ms > 0) return comptes.messageAttente(ms);
  if (!fiche.recuperation) {
    return 'Ce compte n’a pas de code de récupération. Demandez à votre informaticien de réinitialiser le mot de passe (voir le guide d’administration).';
  }
  if (!comptes.verifierCode(code, fiche)) return apresEchec(propre, fiche, 'Ce code n’est pas le bon.');
  const souci = motDePasseAcceptable(nouveau, propre);
  if (souci) return souci;
  const r = avecNouveauCode(propre, Object.assign({}, fiche, { motDePasse: sceller(nouveau) }), 'mot de passe changé avec le code de récupération');
  if (!ecrireFiche(propre, r.fiche)) return 'Impossible d’écrire dans le dossier des données.';
  pretAOuvrir = propre;
  return { code: r.code, nom: propre };
}

// Supprimer un compte (le départ d'une collègue) : son dossier — tampons,
// signature mémorisée, copies de récupération — est effacé. Ses PDF, eux, sont
// où ils sont : l'application n'y touche pas. Il faut le mot de passe ou le code.
function supprimerCompte(nom, secret) {
  const propre = nomDeDossier(nom);
  if (!propre) return 'Compte inconnu.';
  const fiche = lireFiche(propre);
  const ms = comptes.attente(fiche);
  if (ms > 0) return comptes.messageAttente(ms);
  if (!(verifier(secret, fiche) || comptes.verifierCode(secret, fiche))) return apresEchec(propre, fiche, 'Ni le mot de passe ni le code de récupération ne correspondent.');
  const dossier = path.join(DOSSIER_DATA(), propre);
  // Jamais hors de data/, jamais data/ lui-même : le nom a déjà été nettoyé, on vérifie encore.
  if (path.dirname(path.resolve(dossier)) !== path.resolve(DOSSIER_DATA())) return 'Ce dossier ne peut pas être supprimé d’ici.';
  try { fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 }); }
  catch (e) { return 'Le dossier n’a pas pu être supprimé (' + (e && e.message ? e.message : e) + '). Fermez ce qui l’utilise et réessayez.'; }
  return '';
}

// ---------------------------------------------------------------------------
//  Une fois connectée : changer son mot de passe, refaire son code
// ---------------------------------------------------------------------------
function changerMonMotDePasse(ancien, nouveau) {
  if (!PROFIL) return 'Aucun compte n’est connecté.';
  const fiche = lireFiche(PROFIL);
  const ms = comptes.attente(fiche);
  if (ms > 0) return comptes.messageAttente(ms);
  if (!verifier(ancien, fiche)) return apresEchec(PROFIL, fiche, 'Le mot de passe actuel n’est pas le bon.');
  const souci = motDePasseAcceptable(nouveau, PROFIL);
  if (souci) return souci;
  const f = comptes.noterEvenement(Object.assign({}, comptes.effacerEchecs(fiche), { motDePasse: sceller(nouveau) }), 'mot de passe changé', POSTE());
  return ecrireFiche(PROFIL, f) ? '' : 'Impossible d’écrire dans le dossier des données.';
}
function refaireMonCode(motDePasse) {
  if (!PROFIL) return 'Aucun compte n’est connecté.';
  const fiche = lireFiche(PROFIL);
  const ms = comptes.attente(fiche);
  if (ms > 0) return comptes.messageAttente(ms);
  if (!verifier(motDePasse, fiche)) return apresEchec(PROFIL, fiche, 'Le mot de passe n’est pas le bon.');
  const r = avecNouveauCode(PROFIL, fiche, 'code de récupération refait');
  return ecrireFiche(PROFIL, r.fiche) ? { code: r.code, nom: PROFIL } : 'Impossible d’écrire dans le dossier des données.';
}

// Les comptes proposés : ceux de comptes.txt, plus ceux qui portent déjà leur
// fiche dans data/.
//
// C'est la fiche qui fait le compte, et non le simple fait d'être un dossier.
// « data » n'appartient pas qu'à nous : une version d'avant, qui ne demandait
// rien à personne, y rangeait directement le stockage du moteur d'affichage —
// « Cache », « Local Storage », « GPUCache », « Partitions »… Listés comme des
// noms, ils se seraient retrouvés proposés à la connexion.
//
// Un dossier d'une toute première version des comptes, sans fiche parce qu'il
// n'y avait pas encore de mot de passe, n'est pas proposé non plus — mais son
// nom réécrit à l'identique dans « Créer un compte » y repose une fiche, et
// ses affaires sont là, intactes.
function comptesConnus() {
  // Lu en octets : listerComptes reconnaît le codage (voir lireTexte).
  let lignes = Buffer.alloc(0);
  try { lignes = fs.readFileSync(path.join(PORTABLE_DIR, COMPTES)); } catch (e) { /* fichier vide ou absent */ }
  let dossiers = [];
  try {
    dossiers = fs.readdirSync(DOSSIER_DATA(), { withFileTypes: true })
      .filter((d) => d.isDirectory() && fs.existsSync(path.join(DOSSIER_DATA(), d.name, FICHE)))
      .map((d) => d.name);
  } catch (e) { /* data pas encore créé */ }
  return listerComptes(lignes, dossiers);
}

// Un lecteur réseau monté sur une lettre (P:, S:…) ne se distingue pas d'un
// disque local par son chemin. Windows, lui, le sait : « net use P: » répond
// pour un lecteur mappé et échoue pour un disque. La fenêtre de la commande est
// masquée — sinon une console noire clignoterait à chaque lancement — et le
// temps est borné : un serveur qui ne répond pas ne doit pas retenir l'ouverture.
// AKTUM_RESEAU : pour éprouver ce chemin ailleurs que sur un vrai partage.
function surLeReseau() {
  if (process.env.AKTUM_RESEAU) return process.env.AKTUM_RESEAU !== '0';
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
  if (!process.env.AKTUM_DOSSIER_APP && process.env.AKTUM_SMOKE_DIR) {
    try { app.setPath('userData', path.join(process.env.AKTUM_SMOKE_DIR, 'donnees')); } catch (e) { /* tant pis */ }
    return;
  }
  if (!app.isPackaged && !process.env.AKTUM_DOSSIER_APP) return;
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
// Le produit a changé de nom. Ce que l'ancien nom avait posé dans le profil de la personne — la
// session retenue, le jour de départ de l'essai, et, hors dossier portable, les données par défaut —
// est repris sous le nouveau, une fois, avant que quoi que ce soit ne s'ouvre. // @garder-ancien-nom
function reprendreLesDossiersDAvant() {
  if (!app.isPackaged) return;
  let appData;
  try { appData = app.getPath('appData'); } catch (e) { return; }
  // « AktumPDF » : le nom que portaient les versions candidates, avant que le produit s'écrive « Aktum PDF » partout, à l'exécutable près.
  [['Blonay PDF', 'Aktum PDF'], ['blonay-pdf-desktop', 'aktum-pdf-desktop'], ['AktumPDF', 'Aktum PDF']].forEach(([avant, apres]) => { // @garder-ancien-nom
    try {
      const a = path.join(appData, avant), n = path.join(appData, apres);
      if (fs.existsSync(a) && !fs.existsSync(n)) fs.renameSync(a, n);
    } catch (e) { /* tant pis : on se reconnectera, et l'essai repartira */ }
  });
}
reprendreLesDossiersDAvant();
setupUserData();

/** Les documents passés sur la ligne de commande (double-clic sur un PDF, dépôt sur l'icône). */
function fichiersDe(argv) {
  return argv.slice(1).filter((a) => !a.startsWith('-') && EXTENSIONS.includes(path.extname(a).toLowerCase()) && fs.existsSync(a));
}
const quiTravaille = () => PROFIL || (() => { try { return os.userInfo().username; } catch (e) { return ''; } })();
/**
 * Lus en mémoire, tels que la page les attend : { nom, octets, chemin, mtimeMs, verrou }.
 * La date de modification est celle du fichier au moment où on le lit : c'est
 * elle qu'on comparera avant de l'écraser. Le verrou dit si une autre personne
 * a déjà ce document ouvert ; sinon on le prend, et on le rafraîchit.
 */
function lire(chemins) {
  const out = [];
  for (const c of chemins) {
    try {
      const b = fs.readFileSync(c);
      const f = { nom: path.basename(c), octets: new Uint8Array(b.buffer, b.byteOffset, b.length), chemin: c, mtimeMs: 0, verrou: null };
      try { f.mtimeMs = fs.statSync(c).mtimeMs; } catch (e) { /* date inconnue : pas de comparaison possible */ }
      try {
        const r = verrou.poser(c, quiTravaille(), INSTANCE);
        if (r.pose) verrousPoses.add(c);
        else if (r.autre) f.verrou = r.autre;
      } catch (e) { /* un verrou qui ne se pose pas n'empêche pas de lire */ }
      out.push(f);
    } catch (e) { console.warn('illisible :', c, e && e.message); }
  }
  return out;
}
// Tant qu'un document est ouvert, son verrou est rafraîchi : c'est ce qui
// distingue une collègue qui travaille d'un plantage vieux d'une heure.
setInterval(() => { verrousPoses.forEach((c) => verrou.rafraichir(c, INSTANCE)); }, verrou.RAFRAICHIR_MS).unref();
function libererLesVerrous(chemins) {
  (chemins || Array.from(verrousPoses)).forEach((c) => { if (verrou.liberer(c, INSTANCE) || !fs.existsSync(verrou.nomVerrou(c))) verrousPoses.delete(c); });
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
// Le fond de la fenêtre avant que la page ne soit peinte : celui du thème de la page (clair par défaut), pris dans la palette
// de la marque — plus de valeur écrite ici, qui n'était le jeton d'aucun des deux thèmes (un éclair clair, en thème sombre).
const MARQUE = require('./marque.json');
function fondDeFenetre() {
  const t = lireReglages().theme;   // « light », « dark » ou « auto » : le choix de la page, recopié par aktum:theme
  const sombre = t === 'dark' || (t === 'auto' && nativeTheme.shouldUseDarkColors);
  return sombre ? MARQUE['fond-fenetre'].sombre : MARQUE['fond-fenetre'].clair;
}
ipcMain.on('aktum:theme', (_e, mode) => {
  if (mode !== 'light' && mode !== 'dark' && mode !== 'auto') return;
  const r = lireReglages();
  if (r.theme === mode) return;
  r.theme = mode; ecrireReglages(r);
});
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
      w.webContents.send('aktum:ouvrir-onglet', liste);
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
    backgroundColor: fondDeFenetre(),
    show: false,
    icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      additionalArguments: ['--aktum-version=' + app.getVersion(), '--aktum-construction=' + CONSTRUCTION],
    },
  });
  win.aktumFichiers = fichiers || [];
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
// dans « Téléchargements ». (En test de fumée, AKTUM_SMOKE_DIR fixe le dossier.)
function setupDownloads() {
  session.defaultSession.on('will-download', (_ev, item, contents) => {
    const nom = item.getFilename();
    const ext = path.extname(nom).toLowerCase().replace('.', '');
    const filtres = { pdf: 'Document PDF', zip: 'Archive ZIP', png: 'Image PNG', jpg: 'Image JPEG', txt: 'Texte' };
    if (process.env.AKTUM_SMOKE_DIR) item.setSavePath(path.join(process.env.AKTUM_SMOKE_DIR, nom));
    else item.setSaveDialogOptions({
      title: 'Enregistrer sous',
      defaultPath: path.join(app.getPath('documents'), nom),
      filters: [...(filtres[ext] ? [{ name: filtres[ext], extensions: [ext] }] : []), { name: 'Tous les fichiers', extensions: ['*'] }],
    });
    item.once('done', (_e, etat) => {
      if (!contents || contents.isDestroyed()) return;
      if (etat === 'completed' && /\.pdf$/i.test(item.getSavePath())) ajouterRecent(item.getSavePath());
      // Sa date de modification, pour que l'enregistrement suivant sache de quel fichier il parle.
      let mtimeMs = 0;
      if (etat === 'completed') { try { mtimeMs = fs.statSync(item.getSavePath()).mtimeMs; } catch (e) { /* le fichier a déjà bougé */ } }
      contents.send('aktum:enregistre', etat === 'completed' ? { chemin: item.getSavePath(), mtimeMs } : { annule: true });
    });
  });
}

// La page ne sait contacter personne : toute requête qui n'est pas locale est refusée.
// Les sessions créées plus tard le sont par l'écouteur « session-created » plus haut ; celle-ci
// existe déjà, on s'assure qu'elle est fermée.
function setupNetwork() {
  fermerLaSession(session.defaultSession);
}

function setupIpc() {
  ipcMain.handle('aktum:licence', () => etatLicence());
  if (RANGEMENT.ou === 'comptes' && PROFIL) {
    ipcMain.handle('aktum:mon-compte', () => ({ nom: PROFIL }));
    ipcMain.handle('aktum:changer', (_e, ancien, nouveau) => changerMonMotDePasse(ancien, nouveau));
    ipcMain.handle('aktum:refaire-code', (_e, motDePasse) => refaireMonCode(motDePasse));
  }
  // Les documents de cette fenêtre-là, remis une fois.
  ipcMain.handle('aktum:fichiers-initiaux', (e) => {
    const w = fenetreDe(e.sender);
    const l = (w && w.aktumFichiers) || [];
    if (w) w.aktumFichiers = [];
    return l;
  });
  // Enregistrer : réécrire le fichier ouvert, sur place, sans boîte de dialogue.
  ipcMain.handle('aktum:ecrire', (_e, o) => {
    try {
      // L'essai est fini : on lit tout, on n'écrit plus rien. Le travail en cours reste
      // dans le dossier de récupération.
      if (etatLicence().etat === 'essai-fini') return { ok: false, erreur: 'La version d\u2019essai est terminée : l\u2019application n\u2019enregistre plus de nouveau fichier.' };
      if (!o || typeof o.chemin !== 'string' || !path.isAbsolute(o.chemin) || !o.octets) return { ok: false, erreur: 'chemin invalide' };
      // Le fichier a-t-il changé depuis qu'on l'a lu ? Alors quelqu'un d'autre
      // a écrit entre-temps, et l'écraser ferait disparaître son travail sans
      // un mot. On rend la main à la page, qui demande.
      if (!o.forcer) {
        const c = verrou.conflit(o.chemin, o.mtimeAttendu);
        if (c.conflit) return { ok: false, conflit: true, mtimeMs: c.mtimeMs, taille: c.taille };
      }
      const tmp = o.chemin + '.aktum-tmp';
      fs.writeFileSync(tmp, Buffer.from(o.octets));
      fs.renameSync(tmp, o.chemin);
      ajouterRecent(o.chemin);
      let mtimeMs = 0;
      try { mtimeMs = fs.statSync(o.chemin).mtimeMs; } catch (e) { /* tant pis */ }
      try { if (verrou.poser(o.chemin, quiTravaille(), INSTANCE).pose) verrousPoses.add(o.chemin); } catch (e) { /* pas de verrou, pas d'erreur */ }
      return { ok: true, chemin: o.chemin, mtimeMs };
    } catch (err) { return { ok: false, erreur: err && err.message ? err.message : String(err) }; }
  });
  // Le document est fermé : son verrou ne doit pas gêner une collègue.
  ipcMain.handle('aktum:liberer', (_e, chemins) => {
    if (!Array.isArray(chemins)) return false;
    libererLesVerrous(chemins.filter((c) => typeof c === 'string' && path.isAbsolute(c)));
    return true;
  });
  ipcMain.handle('aktum:recents', () => lireRecents().filter((c) => fs.existsSync(c)));
  // La page d'accueil rouvre un récent : seulement un chemin de la liste, jamais un autre.
  ipcMain.handle('aktum:lire-recent', (_e, chemin) => {
    if (typeof chemin !== 'string' || !lireRecents().includes(chemin) || !fs.existsSync(chemin)) return [];
    ajouterRecent(chemin);
    return lire([chemin]);
  });
  ipcMain.handle('aktum:recup-ecrire', (_e, o) => { try { return recupEcrire(o); } catch (err) { return { ok: false, erreur: err && err.message ? err.message : String(err) }; } });
  ipcMain.handle('aktum:recup-liste', () => { try { return recupListe(); } catch (err) { return []; } });
  ipcMain.handle('aktum:recup-lire', (_e, cle) => { try { return recupLire(cle); } catch (err) { return null; } });
  ipcMain.handle('aktum:recup-effacer', (_e, cle) => { try { return recupEffacer(cle); } catch (err) { return false; } });
  ipcMain.handle('aktum:imprimantes', async (e) => {
    const liste = await e.sender.getPrintersAsync();
    return liste.map((p) => ({ name: p.name, displayName: p.displayName || p.name, isDefault: !!p.isDefault }));
  });
  // Impression directe (imprimante choisie, recto verso, copies, taille de feuille) —
  // ou, avec « dialogue », la fenêtre d'impression de Windows et ses Propriétés.
  ipcMain.handle('aktum:imprimer', (e, o) => new Promise((resolve) => {
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

const envoyer = (nom) => { const w = fenetreActive(); if (w) w.webContents.send('aktum:commande', nom); };

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
  if (win) win.webContents.send('aktum:ouvrir-onglet', liste); else createWindow(liste);
}

// Ouvrir… : un document à part, dans un nouvel onglet de la fenêtre courante
// si elle porte déjà un document (la page en décide) ; sans fenêtre, une nouvelle.
async function ouvrirDocuments() {
  const win = fenetreActive();
  const liste = await choisirDocuments(win);
  if (!liste.length) return;
  if (win) win.webContents.send('aktum:ouvrir-onglet', liste);
  else createWindow(liste);
}

// Ajouter au document… : les combiner, dans la fenêtre courante.
async function ajouterDocuments() {
  const win = fenetreActive();
  if (!win) return;
  const liste = await choisirDocuments(win);
  if (liste.length) win.webContents.send('aktum:ouvrir', liste);
}

// La langue : celle du réglage mémorisé, sinon celle du système. Les fenêtres de dialogue et les réponses
// faites à la page passent par le traducteur ; le menu se refait, et la page est prévenue, quand elle change.
function initialiserLaLangue() {
  langue.initialiser(app.getLocale(), lireReglages().langue, {
    ecrire: (l) => { const r = lireReglages(); r.langue = l; ecrireReglages(r); },
  });
  for (const nom of ['showMessageBox', 'showSaveDialog', 'showOpenDialog']) {
    const original = dialog[nom].bind(dialog);
    dialog[nom] = (...args) => original(...args.map((a) => (a && typeof a === 'object' && !(a instanceof BrowserWindow)) ? langue.options(a) : a));
  }
  const erreur = dialog.showErrorBox.bind(dialog);
  dialog.showErrorBox = (titre, contenu) => erreur(langue.t(titre), langue.t(contenu));
  const handle = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = (canal, f) => handle(canal, async (...a) => langue.resultat(await f(...a)));
  ipcMain.on('aktum:langue', (e) => { e.returnValue = langue.langue(); });
  ipcMain.handle('aktum:choisir-langue', (_e, l) => langue.choisir(l));
  langue.surChangement((l) => {
    buildMenu();
    BrowserWindow.getAllWindows().forEach((w) => { if (!w.isDestroyed()) w.webContents.send('aktum:langue', l); });
  });
}

// Les touches du menu : la table des raccourcis (raccourcis.json), telle que la page l'a réglée. Avant que la page n'ait
// parlé, ce sont les touches d'origine.
const TABLE_TOUCHES = require('./raccourcis.json').commandes;
let TOUCHES_REGLEES = null;   // { id: [touches] } envoyé par la page
const TOUCHE_UTILISABLE = /^([A-Z0-9]|F([1-9]|1\d|2[0-4])|Left|Right|Up|Down|Home|End|PageUp|PageDown|Tab|Space|Enter|Backspace|Delete|Plus|[,\-=.\/;'\[\]\\`])$/;
function enAccelerateur(combo) {
  const m = /^((?:(?:Ctrl|Alt|Shift)\+)*)(.+)$/.exec(combo);
  if (!m) return null;
  const NOMS = { ArrowLeft: 'Left', ArrowRight: 'Right', ArrowUp: 'Up', ArrowDown: 'Down', '+': 'Plus' };
  const touche = NOMS[m[2]] || m[2];
  if (!TOUCHE_UTILISABLE.test(touche)) return null;
  const mods = m[1].split('+').filter(Boolean).map((x) => (x === 'Ctrl' ? (touche === 'Tab' ? 'Ctrl' : 'CmdOrCtrl') : x));
  return mods.concat(touche).join('+');
}
function accel(id) {
  const c = TABLE_TOUCHES.find((x) => x.id === id);
  if (!c) return undefined;
  let touches = TOUCHES_REGLEES && Array.isArray(TOUCHES_REGLEES[id]) ? TOUCHES_REGLEES[id] : c.touches;
  // Rétablir : Cmd+Maj+Z sous macOS, Ctrl+Y ailleurs
  if (id === 'retablir' && process.platform === 'darwin') touches = touches.filter((t) => /Shift/.test(t)).concat(touches);
  for (const t of touches) { const a = enAccelerateur(t); if (a) return a; }
  return undefined;
}
ipcMain.on('aktum:accelerateurs', (_e, o) => {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return;
  const propre = {};
  for (const c of TABLE_TOUCHES) {
    const t = o[c.id];
    if (Array.isArray(t) && t.length <= 4 && t.every((x) => typeof x === 'string' && x.length <= 40)) propre[c.id] = t;
  }
  TOUCHES_REGLEES = propre;
  buildMenu();
});
// Quelques réglages de l'application, lisibles et modifiables depuis les préférences de la page : une liste fermée.
const REGLAGES_PAGE = { toujoursEnOnglet: 'boolean' };
ipcMain.handle('aktum:lire-reglage', (_e, cle) => (REGLAGES_PAGE[cle] ? lireReglages()[cle] === true : null));
ipcMain.handle('aktum:ecrire-reglage', (_e, cle, valeur) => {
  if (!REGLAGES_PAGE[cle] || typeof valeur !== REGLAGES_PAGE[cle]) return false;
  const r = lireReglages(); r[cle] = valeur; ecrireReglages(r);
  return true;
});

// Les outils du volet, tels que la page les envoie (voir src/96-panneau.js) : [{ titre, outils: [{ id, nom }] }].
// Rien n'est jamais exécuté d'ici : une entrée du menu renvoie à la page son identifiant, et c'est elle qui sait quoi faire.
let MENU_OUTILS = null;
const SUR = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;
ipcMain.on('aktum:menu-outils', (_e, liste) => {
  if (!Array.isArray(liste) || liste.length > 20) return;
  const propre = [];
  for (const g of liste) {
    if (!g || !SUR(g.titre, 60) || !Array.isArray(g.outils) || g.outils.length > 60) return;
    const outils = [];
    for (const o of g.outils) { if (!o || !SUR(o.id, 40) || !/^[\w-]+$/.test(o.id) || !SUR(o.nom, 80)) return; outils.push({ id: o.id, nom: o.nom }); }
    propre.push({ titre: g.titre, outils });
  }
  MENU_OUTILS = propre;
  buildMenu();
});
// Avant que la page n'ait envoyé sa liste (ou si elle ne le fait pas), le menu garde ses entrées d'origine.
const OUTILS_PAR_DEFAUT = [
  { label: 'Éditeur de page', click: () => envoyer('editeur') },
  { type: 'separator' },
  { label: 'Reconnaître le texte (OCR)…', click: () => envoyer('ocr') },
  { label: 'Comparer deux versions…', click: () => envoyer('comparer') },
  { label: 'Copier un tableau vers Excel…', click: () => envoyer('tableau') },
  { type: 'separator' },
  { label: 'Constituer un dossier de pièces…', click: () => envoyer('dossier') },
  { label: 'Traiter plusieurs fichiers…', click: () => envoyer('lots') },
];

function buildMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        { id: 'ouvrir', label: 'Ouvrir…', accelerator: accel('ouvrir'), click: ouvrirDocuments },
        {
          label: 'Récents',
          submenu: (lireRecents().length ? lireRecents().map((c) => ({ brut: true, label: path.basename(c), sublabel: path.dirname(c), click: () => ouvrirRecent(c) })) : [{ label: 'Aucun fichier récent', enabled: false }])
            .concat([{ type: 'separator' }, { label: 'Effacer la liste', click: viderRecents }]),
        },
        { id: 'ajouter', label: 'Ajouter au document…', accelerator: accel('ajouter'), click: ajouterDocuments },
        { id: 'nouvel-onglet', label: 'Nouvel onglet', accelerator: accel('nouvel-onglet'), click: () => envoyer('nouvel-onglet') },
        { label: 'Nouvelle fenêtre', accelerator: 'CmdOrCtrl+N', click: () => createWindow([]) },
        { id: 'preferences', label: 'Préférences…', accelerator: accel('preferences'), click: () => envoyer('preferences') },
        { type: 'separator' },
        { id: 'enregistrer', label: 'Enregistrer', accelerator: accel('enregistrer'), click: () => envoyer('enregistrer') },
        { id: 'enregistrer-sous', label: 'Enregistrer sous…', accelerator: accel('exporter'), click: () => envoyer('exporter') },
        { id: 'imprimer', label: 'Imprimer…', accelerator: accel('imprimer'), click: () => envoyer('imprimer') },
        { type: 'separator' },
        { label: 'Ouvrir le dossier des données', click: () => shell.openPath(app.getPath('userData')) },
        ...(RANGEMENT.ou === 'comptes' && PROFIL ? [
          { label: 'Changer mon mot de passe…', click: () => ouvrirMonCompte('changer') },
          { label: 'Refaire mon code de récupération…', click: () => ouvrirMonCompte('code') },
        ] : []),
        ...(RANGEMENT.ou === 'comptes' ? [{
          label: 'Se déconnecter' + (PROFIL ? ' (' + PROFIL + ')' : ''),
          click: async () => {
            const r = await dialog.showMessageBox({
              type: 'question', buttons: ['Se déconnecter', 'Annuler'], defaultId: 1, cancelId: 1,
              message: 'Se déconnecter d’Aktum PDF ?',
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
        { id: 'fermer-onglet', label: 'Fermer l\'onglet', accelerator: accel('fermer-onglet'), click: () => envoyer('fermer-onglet') },
        { label: 'Fermer la fenêtre', accelerator: 'CmdOrCtrl+Shift+W', role: 'close' },
        // Pas d'accélérateur écrit à la main : le système sait comment on quitte (Alt+F4 sous Windows, Cmd+Q sous macOS).
        { label: 'Quitter', role: 'quit' },
      ],
    },
    {
      // Sous macOS, les touches d'édition ne passent que par ce menu : sans lui, Cmd+C, Cmd+V et Cmd+X ne font rien
      // dans un champ. Annuler, Rétablir et Tout sélectionner sont rendus à la page, qui sait s'ils visent un champ
      // de saisie (le système fait) ou le document (l'application fait).
      label: 'Édition',
      submenu: [
        { id: 'annuler', label: 'Annuler l\'action', accelerator: accel('annuler'), click: () => envoyer('annuler') },
        { id: 'retablir', label: 'Rétablir l\'action', accelerator: accel('retablir'), click: () => envoyer('retablir') },
        { type: 'separator' },
        { label: 'Couper', role: 'cut' },
        { label: 'Copier', role: 'copy' },
        { label: 'Coller', role: 'paste' },
        { type: 'separator' },
        { id: 'tout-selectionner', label: 'Tout sélectionner', accelerator: accel('tout-selectionner'), click: () => envoyer('tout-selectionner') },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { id: 'lecture', label: 'Lire', accelerator: accel('lecture'), click: () => envoyer('lecture') },
        { id: 'organiser', label: 'Organiser les pages', accelerator: accel('organiser'), click: () => envoyer('organiser') },
        { id: 'deux-pages', label: 'Deux pages côte à côte', accelerator: accel('deux-pages'), click: () => envoyer('deux-pages') },
        { type: 'separator' },
        { id: 'onglet-suivant', label: 'Onglet suivant', accelerator: accel('onglet-suivant'), click: () => envoyer('onglet-suivant') },
        { id: 'onglet-precedent', label: 'Onglet précédent', accelerator: accel('onglet-precedent'), click: () => envoyer('onglet-precedent') },
        { type: 'separator' },
        { id: 'zoom-plus', label: 'Agrandir', accelerator: accel('zoom-plus'), click: () => envoyer('zoom-plus') },
        { id: 'zoom-moins', label: 'Réduire', accelerator: accel('zoom-moins'), click: () => envoyer('zoom-moins') },
        { id: 'zoom-page', label: 'Page entière', accelerator: accel('zoom-page'), click: () => envoyer('zoom-page') },
        { type: 'separator' },
        { label: 'Thème clair ou sombre', click: () => envoyer('theme') },
        { label: 'Plein écran', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Outils',
      submenu: [
        { id: 'rechercher', label: 'Rechercher, remplacer, caviarder…', accelerator: accel('rechercher'), click: () => envoyer('rechercher') },
        { id: 'signet', label: 'Ajouter un signet', accelerator: accel('signet'), click: () => envoyer('signet') },
        { type: 'separator' },
        // Les trente outils du volet, par groupe : les mêmes noms, dans la langue affichée (la page les a déjà traduits).
        ...(MENU_OUTILS
          ? MENU_OUTILS.map((g) => ({ brut: true, label: g.titre, submenu: g.outils.map((o) => ({ brut: true, label: o.nom, click: () => envoyer('outil:' + o.id) })) }))
          : OUTILS_PAR_DEFAUT),
      ],
    },
    {
      label: 'Aide',
      submenu: [
        { id: 'raccourcis', label: 'Raccourcis clavier', accelerator: accel('raccourcis'), click: () => envoyer('raccourcis') },
        {
          label: 'Langue',
          submenu: [
            { brut: true, label: 'Français', type: 'radio', checked: langue.langue() === 'fr', click: () => langue.choisir('fr') },
            { brut: true, label: 'Deutsch', type: 'radio', checked: langue.langue() === 'de', click: () => langue.choisir('de') },
          ],
        },
        { type: 'separator' },
        { label: 'Rechercher une mise à jour', click: () => { chercherUneMiseAJour(true).catch(() => {}); } },
        { label: 'Rapport de diagnostic pour le support…', click: () => { proposerLeDiagnostic().catch(() => {}); } },
        {
          label: 'À propos de ' + APP_TITLE,
          click: () => dialog.showMessageBox(fenetreActive(), {
            type: 'info',
            title: 'À propos de ' + APP_TITLE,
            message: APP_TITLE + ' ' + app.getVersion() + (CONSTRUCTION ? ' — ' + CONSTRUCTION : ' — version de travail'),
            detail: 'Organiser, corriger, annoter, remplir et imprimer des PDF.\n\n' +
              'Version portable : rien n\'est installé, aucune donnée ne quitte ce PC (les documents sont lus, ' +
              'modifiés et réassemblés dans cette fenêtre).\n\n' +
              etatLicence().description + '\n' +
              (PROFIL ? 'Compte : ' + PROFIL + '\n' : '') +
              'Dossier des données : ' + app.getPath('userData') + '\n' +
              (POURQUOI[RANGEMENT.pourquoi] || '') + '\n\n' +
              'Electron ' + process.versions.electron + ' – Chromium ' + process.versions.chrome,
          }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(langue.menu(template)));
}

// Les deux gestes d'une personne connectée : changer son mot de passe, refaire
// son code. La même fenêtre que la connexion, ouverte sur l'écran voulu.
function ouvrirMonCompte(mode) {
  const parent = BrowserWindow.getFocusedWindow() || undefined;
  const fen = new BrowserWindow({
    width: 460, height: 460, resizable: false, minimizable: false, maximizable: false,
    fullscreenable: false, title: APP_TITLE, show: false, autoHideMenuBar: true, parent, modal: !!parent,
    backgroundColor: MARQUE['fond-fenetre'].sombre,
    webPreferences: { preload: path.join(__dirname, 'choix-preload.js'), partition: 'choix-du-compte', sandbox: true },
  });
  fen.removeMenu();
  fen.once('ready-to-show', () => fen.show());
  langue.traduireLaPageDeConnexion(fen);
  fen.loadFile(path.join(__dirname, 'choix-profil.html'), { hash: mode });
}

// « Qui êtes-vous ? », une seule fois par personne et par poste. La fenêtre
// tourne dans une session en mémoire : elle ne doit rien écrire dans un dossier
// de données qu'on n'a justement pas encore choisi.
function demanderLeCompte() {
  const fen = new BrowserWindow({
    width: 460, height: 540, resizable: false, minimizable: false, maximizable: false,
    fullscreenable: false, title: APP_TITLE, show: false, autoHideMenuBar: true,
    backgroundColor: MARQUE['fond-fenetre'].sombre,
    webPreferences: { preload: path.join(__dirname, 'choix-preload.js'), partition: 'choix-du-compte' },
  });
  fen.removeMenu();
  fen.once('ready-to-show', () => fen.show());
  langue.traduireLaPageDeConnexion(fen);
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

// La licence, lue à chaque fois qu'on la demande : le fichier peut être posé pendant
// qu'on travaille, et la lecture coûte une fraction de milliseconde.
function etatLicence() {
  let editeur = {};
  try { editeur = JSON.parse(fs.readFileSync(path.join(__dirname, 'editeur.json'), 'utf8')) || {}; } catch (e) { /* pas de coordonnées renseignées */ }
  const e = licence.etatDeLaLicence({
    dossier: PORTABLE_DIR, cles: signature.lireCles().licence,
    essai: licence.ancreDansLeProfil(path.join(profilLocal(), 'Aktum PDF')),
  });
  return Object.assign({}, e, { description: licence.description(e), editeur: { nom: String(editeur.nom || ''), contact: String(editeur.contact || '') } });
}

// Le rapport de diagnostic : fabriqué ici, jamais envoyé. On le relit, on l'enregistre ou on le
// copie, et on le joint soi-même à une demande de support.
async function rapportDeDiagnostic() {
  let journal = [];
  const fen = fenetreActive();
  try { if (fen && !fen.isDestroyed()) journal = (await fen.webContents.executeJavaScript('window.aktumDiagnostic ? window.aktumDiagnostic() : []', true)) || []; } catch (e) { /* page absente : journal vide */ }
  let utilisateur = '', poste = '';
  try { utilisateur = os.userInfo().username; } catch (e) { /* inconnu */ }
  try { poste = os.hostname(); } catch (e) { /* inconnu */ }
  const l = etatLicence();
  return diagnostic.rapport({
    produit: { version: VERSION.version || app.getVersion(), canal: VERSION.canal || '', construction: CONSTRUCTION, commit: VERSION.commit || '' },
    systeme: { plateforme: process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : process.platform, version: os.release(), arch: process.arch,
      electron: process.versions.electron, chrome: process.versions.chrome, locale: app.getLocale() },
    donnees: { mode: RANGEMENT.ou, pourquoi: POURQUOI[RANGEMENT.pourquoi] || RANGEMENT.pourquoi || '' },
    licence: { etat: l.etat, id: l.id, postes: l.postes, majJusqu: l.majJusqu, joursRestants: l.joursRestants, invalide: l.invalide },
    postes: autresPostes(DOSSIER_DATA(), MON_JETON, Date.now()).length,
    journal, reseau: reseauRefuse.slice(), ident: { utilisateur, poste },
  });
}

async function proposerLeDiagnostic() {
  const texte = await rapportDeDiagnostic();
  const { response } = await dialog.showMessageBox(fenetreActive(), {
    type: 'info', noLink: true, defaultId: 0, cancelId: 2, title: APP_TITLE,
    buttons: ['Enregistrer le rapport…', 'Copier', 'Fermer'],
    message: 'Rapport de diagnostic',
    detail: 'Il aide le support à comprendre un problème sans venir sur place. Il ne contient aucun nom de document, aucun contenu, aucun nom de personne ; '
      + 'il n\u2019est envoyé nulle part — vous l\u2019enregistrez, vous le relisez, et c\u2019est vous qui le joignez à votre message.\n\n'
      + texte.split('\n').slice(0, 24).join('\n'),
  });
  if (response === 1) { require('electron').clipboard.writeText(texte); return; }
  if (response !== 0) return;
  const nom = 'Diagnostic-Aktum-PDF-' + new Date().toISOString().slice(0, 10) + '.txt';
  const r = process.env.AKTUM_SMOKE_DIR
    ? { filePath: path.join(process.env.AKTUM_SMOKE_DIR, nom) }
    : await dialog.showSaveDialog(fenetreActive(), { title: 'Enregistrer le rapport de diagnostic', defaultPath: path.join(app.getPath('documents'), nom), filters: [{ name: 'Texte', extensions: ['txt'] }] });
  if (r.canceled || !r.filePath) return;
  try { fs.writeFileSync(r.filePath, texte, 'utf8'); shell.showItemInFolder(r.filePath); }
  catch (e) { dialog.showErrorBox(APP_TITLE, 'Le rapport n\u2019a pas pu être enregistré : ' + (e && e.message ? e.message : e)); }
}

async function chercherUneMiseAJour(demandee) {
  // Une archive posée à côté n'est proposée que si elle est signée par l'éditeur :
  // l'application est sur un partage où tout le secrétariat écrit, et sans cette
  // preuve n'importe qui y déposerait un programme que la prochaine personne
  // exécuterait. Voir signature.js.
  const cles = signature.lireCles().maj;
  const installee = Object.assign({}, VERSION, { version: VERSION.version || app.getVersion() });
  const maLicence = etatLicence();
  const { propose: trouvee, refusees } = await examinerLesZips(PORTABLE_DIR, installee, {
    anterieure: !!demandee,
    verifier: async (zip) => {
      const r = await signature.verifierZipAsync(zip, { cles });
      if (!r.ok) return r;
      // Perpétuelle, avec les mises à jour d'un an : une version postérieure à la période n'est pas comprise.
      const c = licence.miseAJourComprise(maLicence, r.piece.date);
      return c.ok ? r : { ok: false, raison: c.raison };
    },
  });
  if (!trouvee) {
    if (demandee) {
      // Une archive posée mais refusée, c'est ce que la personne cherche à comprendre.
      const pourquoi = refusees.length
        ? '\n\nPosée à côté, mais pas acceptée :\n' + refusees.map((r) => '• ' + path.basename(r.zip) + ' — ' + r.raison).join('\n')
          + (cles.length ? '' : '\n\nCette version de l’application ne porte aucune clé d’éditeur : elle n’accepte aucune mise à jour posée à côté. Décompressez l’archive par-dessus le dossier à la main, sans toucher à « data ».')
        : '';
      direA({
        type: refusees.length ? 'warning' : 'info', title: APP_TITLE, noLink: true,
        message: refusees.length ? 'Aucune mise à jour valable n’est posée.' : 'Vous avez la version la plus récente.',
        detail: descriptionInstallee() + '\n\n'
          + 'Pour mettre à jour : posez « AktumPDF-windows.zip » et son fichier « .signature.json » à côté de l\'application '
          + '(ou dans un sous-dossier « maj »), et relancez-la.' + pourquoi,
      });
    }
    return;
  }
  if (!demandee && MAJ_VUE) return;
  MAJ_VUE = true;
  const v = trouvee.version;
  const { response } = await direA({
    type: trouvee.anterieure || v.critique ? 'warning' : 'question', noLink: true, defaultId: 0, cancelId: 1,
    buttons: [trouvee.anterieure ? 'Revenir à cette version' : 'Mettre à jour maintenant', 'Plus tard'],
    title: APP_TITLE,
    message: trouvee.anterieure
      ? 'Une version plus ancienne est posée à côté de l\'application.'
      : (v.critique ? 'Une mise à jour importante est posée à côté de l\'application.' : 'Une version plus récente est posée à côté de l\'application.'),
    detail: 'Installée : ' + descriptionInstallee() + '\n'
      + 'Posée : ' + (v.version ? v.version + ' (' + (v.canal || 'stable') + ')' : '') + (v.commit ? ' — commit ' + v.commit : '') + '\n'
      + 'Signée par l’éditeur : oui (clé ' + (v.cle || '?') + ')\n\n'
      + (trouvee.anterieure ? 'Cela remplace l\'application par une version plus ancienne. ' : '')
      + 'La mise à jour ferme l\'application, remplace ses fichiers et la rouvre. '
      + 'Vos tampons, votre signature, vos récents et le travail mis de côté sont conservés.',
  });
  if (response === 0) lancerLaMiseAJour(trouvee);
}
function descriptionInstallee() {
  const v = VERSION.version || app.getVersion();
  return v + (VERSION.canal === 'candidate' ? ' (candidate)' : '') + (CONSTRUCTION ? ' — ' + CONSTRUCTION : ' — version de travail');
}

function lancerLaMiseAJour(trouvee) {
  const script = path.join(PORTABLE_DIR, SCRIPT_MAJ);
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
  libererLesVerrous();
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
      env: Object.assign({}, process.env, { AKTUM_MAJ_AUTO: '1' }),
    });
    parti.unref(); // il doit nous survivre : c'est lui qui nous remplace
  } catch (e) { /* rien à faire de plus : l'application part quand même */ }
});

app.whenReady().then(() => {
  initialiserLaLangue();
  if (RANGEMENT.ou === 'comptes' && !PROFIL) {
    ipcMain.handle('aktum:comptes', () => comptesConnus().map((nom) => {
      const fiche = lireFiche(nom);
      const d = comptes.dernierChangement(fiche);
      return { nom, protege: protege(fiche), recuperation: !!fiche.recuperation, dernierChangement: d };
    }));
    ipcMain.handle('aktum:connexion', (_e, nom, motDePasse) => connexion(nom, motDePasse));
    ipcMain.handle('aktum:creer', (_e, nom, motDePasse) => creerLeCompte(nom, motDePasse));
    ipcMain.handle('aktum:recuperer', (_e, nom, code, nouveau) => recuperer(nom, code, nouveau));
    ipcMain.handle('aktum:supprimer', (_e, nom, secret) => supprimerCompte(nom, secret));
    // La session ne s'ouvre qu'une fois le code noté, et seulement pour le compte
    // qui vient de le recevoir : sans cela, ce canal ouvrirait n'importe quel compte.
    ipcMain.handle('aktum:ouvrir', (_e, nom) => {
      if (!pretAOuvrir || nomDeDossier(nom) !== pretAOuvrir) return 'Rien à ouvrir.';
      const propre = pretAOuvrir; pretAOuvrir = null;
      return ouvrirLaSession(propre);
    });
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
  if (app.isPackaged || process.env.AKTUM_DOSSIER_APP) {
    annoncerCePoste();
    // Quelques secondes après : le partage peut prendre son temps, et une
    // fenêtre qui tarde à s'afficher se remarque tout de suite.
    // AKTUM_MAJ_DELAI : le test a besoin d'avoir posé ses guetteurs avant.
    const delai = Number(process.env.AKTUM_MAJ_DELAI) || 4000;
    const plusTard = setTimeout(() => { chercherUneMiseAJour(false).catch(() => {}); }, delai);
    if (plusTard.unref) plusTard.unref();
  }
});

app.on('window-all-closed', () => app.quit());
