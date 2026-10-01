// Le strict nécessaire pour la fenêtre de connexion : lire la liste des
// comptes, se connecter, en créer un, retrouver l'accès avec le code de
// récupération, supprimer un compte. Le mot de passe ne fait que passer —
// il n'est ni gardé ici ni écrit nulle part (voir comptes.js).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('comptes', {
  liste: () => ipcRenderer.invoke('blonay:comptes'),
  connexion: (nom, motDePasse) => ipcRenderer.invoke('blonay:connexion', nom, motDePasse),
  creer: (nom, motDePasse) => ipcRenderer.invoke('blonay:creer', nom, motDePasse),
  recuperer: (nom, code, nouveau) => ipcRenderer.invoke('blonay:recuperer', nom, code, nouveau),
  supprimer: (nom, secret) => ipcRenderer.invoke('blonay:supprimer', nom, secret),
  ouvrir: (nom) => ipcRenderer.invoke('blonay:ouvrir', nom),
  // La même fenêtre, ouverte depuis le menu d'une personne déjà connectée.
  monCompte: () => ipcRenderer.invoke('blonay:mon-compte'),
  changer: (ancien, nouveau) => ipcRenderer.invoke('blonay:changer', ancien, nouveau),
  refaireCode: (motDePasse) => ipcRenderer.invoke('blonay:refaire-code', motDePasse),
});
