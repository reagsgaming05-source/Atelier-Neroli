// Le strict nécessaire pour la fenêtre de connexion : lire la liste des
// comptes, se connecter, en créer un. Le mot de passe ne fait que passer —
// il n'est ni gardé ici ni écrit nulle part (voir comptes.js).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('comptes', {
  liste: () => ipcRenderer.invoke('blonay:comptes'),
  connexion: (nom, motDePasse) => ipcRenderer.invoke('blonay:connexion', nom, motDePasse),
  creer: (nom, motDePasse) => ipcRenderer.invoke('blonay:creer', nom, motDePasse),
});
