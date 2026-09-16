/*
 * Exécuté avant les scripts de la page, dans un bac à sable. Fournit à
 * l'application window.BlonayDesktop : les documents reçus au lancement ou
 * plus tard, les commandes du menu, le résultat d'un enregistrement, la liste
 * des imprimantes et l'impression directe.
 */
const { contextBridge, ipcRenderer } = require('electron');
const arg = (nom) => { const a = process.argv.find((x) => x.startsWith('--' + nom + '=')); return a ? a.slice(nom.length + 3) : ''; };
contextBridge.exposeInMainWorld('BlonayDesktop', {
  version: arg('blonay-version'),
  construction: arg('blonay-construction'),
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  fichiersInitiaux: () => ipcRenderer.invoke('blonay:fichiers-initiaux'),
  onOuvrir: (cb) => ipcRenderer.on('blonay:ouvrir', (_e, liste) => cb(liste)),
  onOuvrirOnglet: (cb) => ipcRenderer.on('blonay:ouvrir-onglet', (_e, liste) => cb(liste)),
  onCommande: (cb) => ipcRenderer.on('blonay:commande', (_e, nom) => cb(nom)),
  onEnregistre: (cb) => ipcRenderer.on('blonay:enregistre', (_e, r) => cb(r)),
  ecrire: (chemin, octets) => ipcRenderer.invoke('blonay:ecrire', { chemin, octets }),
  recents: () => ipcRenderer.invoke('blonay:recents'),
  lireRecent: (chemin) => ipcRenderer.invoke('blonay:lire-recent', chemin),
  recupEcrire: (o) => ipcRenderer.invoke('blonay:recup-ecrire', o),
  recupListe: () => ipcRenderer.invoke('blonay:recup-liste'),
  recupLire: (cle) => ipcRenderer.invoke('blonay:recup-lire', cle),
  recupEffacer: (cle) => ipcRenderer.invoke('blonay:recup-effacer', cle),
  imprimantes: () => ipcRenderer.invoke('blonay:imprimantes'),
  imprimer: (o) => ipcRenderer.invoke('blonay:imprimer', o),
});
