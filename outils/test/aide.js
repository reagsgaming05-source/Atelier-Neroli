// Les tests valident le code réellement livré, extrait de source.html, et non
// une copie qui pourrait diverger : on découpe le bloc voulu et on l'évalue.
const fs = require('fs');
const path = require('path');
const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'source.html'), 'utf8');
function extraire(debut, fin, retour) {
  const a = SOURCE.indexOf(debut);
  const b = SOURCE.indexOf(fin, a);
  if (a < 0 || b < 0) throw new Error('bloc introuvable dans source.html : ' + debut);
  const code = SOURCE.slice(a, b);
  return new Function(code + '\nreturn ' + retour + ';')();
}
module.exports = { extraire, SOURCE };
