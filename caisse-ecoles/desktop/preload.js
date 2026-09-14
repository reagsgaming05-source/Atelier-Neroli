/*
 * Exécuté avant les scripts de la page. Fournit à l'application :
 *  - window.CaisseVocabNoms : les noms de personnes lus dans le fichier vocabulaire-noms.js posé
 *    à côté de l'exécutable (facultatif, données personnelles jamais publiées) ;
 *  - window.CaisseDesktop  : informations sur l'application fenêtrée.
 */
const { contextBridge } = require('electron');
const fs = require('fs');

const arg = process.argv.find((a) => a.startsWith('--caisse-names='));
const namesPath = arg ? arg.slice('--caisse-names='.length) : '';
let names = null;
if (namesPath) {
  try {
    // module UMD : on l'évalue dans un bac à sable minimal
    const src = fs.readFileSync(namesPath, 'utf8');
    const sandbox = { module: { exports: {} } };
    sandbox.exports = sandbox.module.exports;
    // eslint-disable-next-line no-new-func
    new Function('module', 'exports', 'self', src)(sandbox.module, sandbox.exports, {});
    const v = sandbox.module.exports;
    if (v && Array.isArray(v.persons)) names = v;
  } catch (e) {
    console.warn('vocabulaire-noms.js illisible :', e && e.message);
  }
}
if (names) contextBridge.exposeInMainWorld('CaisseVocabNoms', names);
const verArg = process.argv.find((a) => a.startsWith('--caisse-version='));
contextBridge.exposeInMainWorld('CaisseDesktop', { version: verArg ? verArg.slice('--caisse-version='.length) : '', electron: process.versions.electron, namesLoaded: !!names });
