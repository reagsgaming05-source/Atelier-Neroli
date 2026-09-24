// Barre du haut de la fenêtre : choisit l'outil (Caisse écoles, Décompte DGEO) et montre où
// sont les données ; voir main.js.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('CaisseShell', {
  show: (name) => ipcRenderer.send('shell:outil', name),
  donnees: () => ipcRenderer.send('shell:donnees'),
  state: () => ipcRenderer.invoke('shell:state'),
  onState: (cb) => ipcRenderer.on('shell:state', (ev, st) => cb(st)),
});
