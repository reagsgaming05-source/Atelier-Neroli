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
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  fichiersInitiaux: () => ipcRenderer.invoke('blonay:fichiers-initiaux'),
  onOuvrir: (cb) => ipcRenderer.on('blonay:ouvrir', (_e, liste) => cb(liste)),
  onCommande: (cb) => ipcRenderer.on('blonay:commande', (_e, nom) => cb(nom)),
  onEnregistre: (cb) => ipcRenderer.on('blonay:enregistre', (_e, r) => cb(r)),
  imprimantes: () => ipcRenderer.invoke('blonay:imprimantes'),
  imprimer: (o) => ipcRenderer.invoke('blonay:imprimer', o),
});
