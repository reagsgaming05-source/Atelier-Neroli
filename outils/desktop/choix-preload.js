// Le strict nécessaire pour la fenêtre de connexion : lire la liste des
// comptes, se connecter, en créer un, retrouver l'accès avec le code de
// récupération, supprimer un compte. Le mot de passe ne fait que passer —
// il n'est ni gardé ici ni écrit nulle part (voir comptes.js).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('comptes', {
  liste: () => ipcRenderer.invoke('aktum:comptes'),
  connexion: (nom, motDePasse) => ipcRenderer.invoke('aktum:connexion', nom, motDePasse),
  creer: (nom, motDePasse) => ipcRenderer.invoke('aktum:creer', nom, motDePasse),
  recuperer: (nom, code, nouveau) => ipcRenderer.invoke('aktum:recuperer', nom, code, nouveau),
  supprimer: (nom, secret) => ipcRenderer.invoke('aktum:supprimer', nom, secret),
  ouvrir: (nom) => ipcRenderer.invoke('aktum:ouvrir', nom),
  // La même fenêtre, ouverte depuis le menu d'une personne déjà connectée.
  monCompte: () => ipcRenderer.invoke('aktum:mon-compte'),
  changer: (ancien, nouveau) => ipcRenderer.invoke('aktum:changer', ancien, nouveau),
  refaireCode: (motDePasse) => ipcRenderer.invoke('aktum:refaire-code', motDePasse),
});
