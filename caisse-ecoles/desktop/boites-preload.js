/*
 * Boîtes « OK / Annuler » en français.
 *
 * Dans l'application fenêtrée, confirm() et alert() sont dessinés par Electron avec ses boutons
 * d'origine, « OK » et « Cancel » : le réglage de langue ne les traduit pas, et plusieurs
 * questions renvoient pourtant à « Annuler ». On les remplace, dans la page, par les boîtes du
 * programme (textes et bouton par défaut : dialogues.js), sans toucher à un seul appel.
 *
 * La page attend la réponse, comme avec le confirm() d'origine : l'appel est synchrone.
 * Préchargé seul pour Décompte DGEO ; repris par preload.js pour Caisse écoles.
 */
const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('CaisseBoites', {
  confirmer: (texte) => ipcRenderer.sendSync('boite:confirmer', String(texte)) === true,
  avertir: (texte) => { ipcRenderer.sendSync('boite:avertir', String(texte)); },
});
// Remplacées dans le monde de la page (contextIsolation : le preload a son propre `window`).
webFrame.executeJavaScript(`(function () {
  var B = window.CaisseBoites;
  if (!B) return;
  window.confirm = function (m) { return B.confirmer(m == null ? '' : String(m)); };
  window.alert = function (m) { B.avertir(m == null ? '' : String(m)); };
})();`);
