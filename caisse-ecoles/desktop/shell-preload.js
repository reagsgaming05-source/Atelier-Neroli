// Barre d'onglets de la fenêtre : demande au processus principal d'afficher un onglet.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('CaisseShell', {
  show: (name) => ipcRenderer.send('shell:tab', name),
  state: () => ipcRenderer.invoke('shell:state'),
  onState: (cb) => ipcRenderer.on('shell:state', (ev, st) => cb(st)),
});
