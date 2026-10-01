// Outil de maintenance du dictionnaire : aligne de.json sur ce que relève extraire.js (retire les entrées
// devenues sans objet, range dans l'ordre de l'extraction) et dit ce qu'il reste à traduire.
//   node i18n/majdico.js            affiche le rapport
//   node i18n/majdico.js --ecrire   réécrit de.json
const fs = require('fs');
const path = require('path');
const { relever } = require('./extraire');
const FICHIER = path.join(__dirname, 'de.json');
const SECTIONS = ['litteraux', 'motifs', 'html'];

function aligner(dico, releve) {
  const sortie = { pluriels: dico.pluriels || {} };
  const manque = [], perdu = [];
  for (const s of SECTIONS) {
    sortie[s] = {};
    for (const k of Object.keys(releve[s])) {
      if (dico[s] && k in dico[s]) sortie[s][k] = dico[s][k]; else manque.push([s, k]);
    }
    for (const k of Object.keys(dico[s] || {})) if (!(k in releve[s])) perdu.push([s, k]);
  }
  return { sortie, manque, perdu };
}
module.exports = { aligner };

if (require.main === module) {
  const dico = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
  const { sortie, manque, perdu } = aligner(dico, relever());
  console.log(manque.length + ' à traduire, ' + perdu.length + ' sans objet');
  manque.forEach(([s, k]) => console.log('  + [' + s + '] ' + JSON.stringify(k)));
  perdu.forEach(([s, k]) => console.log('  - [' + s + '] ' + JSON.stringify(k)));
  if (process.argv.includes('--ecrire')) { fs.writeFileSync(FICHIER, JSON.stringify(sortie, null, 1) + '\n'); console.log('de.json réécrit'); }
}
