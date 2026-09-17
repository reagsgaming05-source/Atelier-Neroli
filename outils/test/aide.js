// Les tests valident le code réellement livré, extrait de la source recollée
// depuis src/, et non une copie qui pourrait diverger : on découpe le bloc
// voulu et on l'évalue.
const { assembler } = require('../assembler');
const SOURCE = assembler();
function extraire(debut, fin, retour) {
  const a = SOURCE.indexOf(debut);
  const b = SOURCE.indexOf(fin, a);
  if (a < 0 || b < 0) throw new Error('bloc introuvable dans la source : ' + debut);
  const code = SOURCE.slice(a, b);
  return new Function(code + '\nreturn ' + retour + ';')();
}
module.exports = { extraire, SOURCE };
