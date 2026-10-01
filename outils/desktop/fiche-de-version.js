// La fiche de version qui voyage à la racine du dossier livré (version.json) :
// celle de construction.json (version, canal, commit, date), plus la plateforme.
//   node fiche-de-version.js windows|mac <destination>
const fs = require('fs');
const path = require('path');
const [plateforme, destination] = process.argv.slice(2);
if (!['windows', 'mac'].includes(plateforme) || !destination) { console.error('usage : node fiche-de-version.js windows|mac <destination>'); process.exit(1); }
const j = JSON.parse(fs.readFileSync(path.join(__dirname, 'construction.json'), 'utf8'));
fs.writeFileSync(destination, JSON.stringify(Object.assign({}, j, { plateforme })) + '\n');
console.log('fiche de version : ' + j.version + ' (' + j.canal + ', ' + plateforme + ') -> ' + destination);
