/*
 * Exécuté avant les scripts de la page, dans un bac à sable. Fournit à
 * l'application window.AktumDesktop : les documents reçus au lancement ou
 * plus tard, les commandes du menu, le résultat d'un enregistrement, la liste
 * des imprimantes et l'impression directe.
 */
const { contextBridge, ipcRenderer } = require('electron');
const arg = (nom) => { const a = process.argv.find((x) => x.startsWith('--' + nom + '=')); return a ? a.slice(nom.length + 3) : ''; };
contextBridge.exposeInMainWorld('AktumDesktop', {
  version: arg('aktum-version'),
  construction: arg('aktum-construction'),
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  fichiersInitiaux: () => ipcRenderer.invoke('aktum:fichiers-initiaux'),
  onOuvrir: (cb) => ipcRenderer.on('aktum:ouvrir', (_e, liste) => cb(liste)),
  onOuvrirOnglet: (cb) => ipcRenderer.on('aktum:ouvrir-onglet', (_e, liste) => cb(liste)),
  onCommande: (cb) => ipcRenderer.on('aktum:commande', (_e, nom) => cb(nom)),
  onEnregistre: (cb) => ipcRenderer.on('aktum:enregistre', (_e, r) => cb(r)),
  // mtimeAttendu : la date du fichier quand on l'a lu ; forcer : écraser malgré un conflit confirmé.
  ecrire: (chemin, octets, opts) => ipcRenderer.invoke('aktum:ecrire', Object.assign({ chemin, octets }, opts || {})),
  liberer: (chemins) => ipcRenderer.invoke('aktum:liberer', chemins),
  recents: () => ipcRenderer.invoke('aktum:recents'),
  lireRecent: (chemin) => ipcRenderer.invoke('aktum:lire-recent', chemin),
  recupEcrire: (o) => ipcRenderer.invoke('aktum:recup-ecrire', o),
  recupListe: () => ipcRenderer.invoke('aktum:recup-liste'),
  recupLire: (cle) => ipcRenderer.invoke('aktum:recup-lire', cle),
  recupEffacer: (cle) => ipcRenderer.invoke('aktum:recup-effacer', cle),
  imprimantes: () => ipcRenderer.invoke('aktum:imprimantes'),
  licence: () => ipcRenderer.invoke('aktum:licence'),
  // La langue de l'application : celle que le processus principal a retenue (réglage, sinon système), et
  // le moyen d'en changer — le menu et la page restent d'accord.
  langue: ipcRenderer.sendSync('aktum:langue'),
  choisirLangue: (l) => ipcRenderer.invoke('aktum:choisir-langue', l),
  onLangue: (cb) => ipcRenderer.on('aktum:langue', (_e, l) => cb(l)),
  imprimer: (o) => ipcRenderer.invoke('aktum:imprimer', o),
  // La liste des outils du volet, rangée par groupe et déjà dans la langue affichée : le menu « Outils » la reprend telle
  // quelle, de sorte que ses entrées sont celles du volet, jamais une seconde liste à tenir à jour.
  definirMenuOutils: (liste) => ipcRenderer.send('aktum:menu-outils', liste),
  // Les touches du menu : celles de la table (raccourcis.json), telles que la personne les a réglées.
  definirAccelerateurs: (o) => ipcRenderer.send('aktum:accelerateurs', o),
  definirTheme: (mode) => ipcRenderer.send('aktum:theme', mode),
  // Un petit nombre de réglages de l'application (voir main.js) : « toujoursEnOnglet ».
  lireReglage: (cle) => ipcRenderer.invoke('aktum:lire-reglage', cle),
  ecrireReglage: (cle, valeur) => ipcRenderer.invoke('aktum:ecrire-reglage', cle, valeur),
});
