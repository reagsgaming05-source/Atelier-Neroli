// Le strict nécessaire pour la fenêtre « qui êtes-vous ? » : elle n'a besoin
// que de lire la liste des comptes et de rendre celui qu'on a choisi.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('choix', {
  liste: () => ipcRenderer.invoke('blonay:comptes'),
  valider: (nom) => ipcRenderer.invoke('blonay:compte-choisi', nom),
});
