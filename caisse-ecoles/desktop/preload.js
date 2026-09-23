/*
 * Exécuté avant les scripts de la page. Fournit à l'application :
 *  - window.CaisseVocabNoms : les noms de personnes lus dans le fichier vocabulaire-noms.js posé
 *    à côté de l'exécutable (facultatif, données personnelles jamais publiées) ;
 *  - window.CaisseDesktop  : informations sur l'application fenêtrée.
 */
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');

const arg = process.argv.find((a) => a.startsWith('--caisse-names='));
const namesPath = arg ? arg.slice('--caisse-names='.length) : '';
let names = null;
if (namesPath) {
  try {
    // module UMD : on l'évalue dans un bac à sable minimal
    const src = fs.readFileSync(namesPath, 'utf8');
    const sandbox = { module: { exports: {} } };
    sandbox.exports = sandbox.module.exports;
    // eslint-disable-next-line no-new-func
    new Function('module', 'exports', 'self', src)(sandbox.module, sandbox.exports, {});
    const v = sandbox.module.exports;
    if (v && Array.isArray(v.persons)) names = v;
  } catch (e) {
    console.warn('vocabulaire-noms.js illisible :', e && e.message);
  }
}
if (names) contextBridge.exposeInMainWorld('CaisseVocabNoms', names);
const verArg = process.argv.find((a) => a.startsWith('--caisse-version='));
contextBridge.exposeInMainWorld('CaisseDesktop', { version: verArg ? verArg.slice('--caisse-version='.length) : '', electron: process.versions.electron, namesLoaded: !!names });

// Troisième lecteur : Tesseract natif, via le processus principal
contextBridge.exposeInMainWorld('CaisseNative', {
  ocrInfo: () => ipcRenderer.invoke('ocr:info'),
  // png : Uint8Array ; opts : { psm, oem, dpi } ; renvoie [{ text, conf, x0, y0, x1, y1 }]
  ocrRecognize: (png, opts) => ipcRenderer.invoke('ocr:recognize', png, opts),
});

// Registre des pièces : fichiers de l'application (data/caisse/<année>/), voir main.js
contextBridge.exposeInMainWorld('CaisseFiles', {
  dir: () => ipcRenderer.invoke('files:dir'),
  years: () => ipcRenderer.invoke('files:years'),
  load: (year) => ipcRenderer.invoke('files:load', year),
  // `attendu` : le texte que la page croit trouver sur le disque ; si un autre poste a écrit
  // entre-temps, on reçoit { conflit, disque } au lieu d'un écrasement (voir registre.js)
  save: (year, text, attendu) => ipcRenderer.invoke('files:save', year, text, attendu),
  attach: (year, id, name, bytes) => ipcRenderer.invoke('files:attach', year, id, name, bytes),
  read: (year, id, name) => ipcRenderer.invoke('files:read', year, id, name).then((b) => (b ? new Uint8Array(b) : null)),
  remove: (year, id, name) => ipcRenderer.invoke('files:remove', year, id, name),
  openDir: () => ipcRenderer.invoke('files:open-dir'),
  // carnet des données : les listes tenues à la main (espace « Données »)
  loadCarnet: () => ipcRenderer.invoke('files:load-carnet'),
  saveCarnet: (text) => ipcRenderer.invoke('files:save-carnet', text),
});

// Où vivent les données de la caisse : sur ce PC, ou sur le serveur (voir emplacement.js).
// (« CaisseDonnees » est déjà le carnet des listes, src/donnees.js : ne pas le recouvrir)
contextBridge.exposeInMainWorld('CaisseEmplacement', {
  etat: () => ipcRenderer.invoke('donnees:etat'),
  choisir: () => ipcRenderer.invoke('donnees:choisir'),
  local: () => ipcRenderer.invoke('donnees:local'),
  ouvrir: () => ipcRenderer.invoke('donnees:ouvrir'),
});

// Veille du dossier scanné : le copieur y dépose ses PDF, l'application les y prend (voir
// veille.js et main.js). La page reçoit les octets, découpe la pile aux codes QR et range.
contextBridge.exposeInMainWorld('CaisseScan', {
  etat: () => ipcRenderer.invoke('scan:etat'),
  regler: (patchObj) => ipcRenderer.invoke('scan:regler', patchObj),
  choisirDossier: () => ipcRenderer.invoke('scan:choisir-dossier'),
  regarder: () => ipcRenderer.invoke('scan:regarder'),
  ouvrirDepot: () => ipcRenderer.invoke('scan:ouvrir-depot'),
  // le processus principal confie un scan complet ; la page répond par scan:resultat
  onEntrant: (cb) => ipcRenderer.on('scan:entrant', (ev, d) => cb(d)),
  resultat: (r) => ipcRenderer.send('scan:resultat', r),
  // documents découpés en attente de validation, gardés dans les données de l'application
  deposer: (id, fiche, octets) => ipcRenderer.invoke('reception:deposer', id, fiche, octets),
  liste: () => ipcRenderer.invoke('reception:liste'),
  lire: (id) => ipcRenderer.invoke('reception:lire', id).then((b) => (b ? new Uint8Array(b) : null)),
  retirer: (id) => ipcRenderer.invoke('reception:retirer', id),
  ouvrirDossier: () => ipcRenderer.invoke('reception:ouvrir-dossier'),
  // bac à courrier des décomptes : Décomptes\À faire\Camp, etc.
  poser: (sousDossier, nom, octets) => ipcRenderer.invoke('classement:poser', sousDossier, nom, octets),
  ouvrirClassement: (sousDossier) => ipcRenderer.invoke('classement:ouvrir', sousDossier),
  racineClassement: () => ipcRenderer.invoke('classement:racine'),
  deplacer: (deSous, versSous, nom) => ipcRenderer.invoke('classement:deplacer', deSous, versSous, nom),
});

// Pont Décompte DGEO → Caisse écoles : décomptes terminés (Excel généré dans l'autre onglet),
// proposés dans la fiche comme pièce DECOMPTE pré-remplie ; voir main.js.
contextBridge.exposeInMainWorld('CaisseDgeo', {
  list: () => ipcRenderer.invoke('dgeo:list'),
  mark: (id, info) => ipcRenderer.invoke('dgeo:mark', id, info),
  forget: (id) => ipcRenderer.invoke('dgeo:forget', id),
  openExcel: (id) => ipcRenderer.invoke('dgeo:open-excel', id),
  show: () => ipcRenderer.send('shell:tab', 'dgeo'),
  state: () => ipcRenderer.invoke('shell:state'),
  onNew: (cb) => ipcRenderer.on('dgeo:new', (ev, d) => cb(d)),
  // affichage de la page Décompte DGEO dans l'espace de la barre latérale : zone { x, y, width, height } (px CSS) ou null
  embed: (rect) => ipcRenderer.send('dgeo:embed', rect),
  onState: (cb) => ipcRenderer.on('shell:state', (ev, s) => cb(s)),
  onPanel: (cb) => ipcRenderer.on('app:panel', (ev, id) => cb(id)),
  scrollTo: (sectionId) => ipcRenderer.send('dgeo:scroll', sectionId),
  // nettoyage du dossier PDF avant Décompte DGEO (la page retire les pages « PIÈCE COMPTABLE »)
  onClean: (cb) => ipcRenderer.on('dgeo:clean', (ev, req) => cb(req)),
  cleanResult: (r) => ipcRenderer.send('dgeo:clean-result', r),
  onCleaned: (cb) => ipcRenderer.on('dgeo:cleaned', (ev, info) => cb(info)),
  // dossiers analysés par Décompte DGEO (formulaire de couverture affiché à côté)
  dossiers: () => ipcRenderer.invoke('dgeo:dossiers'),
  onAnalysed: (cb) => ipcRenderer.on('dgeo:analysed', (ev, d) => cb(d)),
  settings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patchObj) => ipcRenderer.invoke('settings:set', patchObj),
});
