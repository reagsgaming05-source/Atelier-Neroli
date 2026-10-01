// Les tests valident le code réellement livré, extrait de la source recollée
// depuis src/, et non une copie qui pourrait diverger : on découpe le bloc
// voulu et on l'évalue.
const { assembler } = require('../assembler');
const SOURCE = assembler();
// La couche de langue (01-langue.js) : les blocs testés l'appellent. Ici, le français, sans traduction.
global.langue = 'fr';
global.traduction = null;
global.tr = (s) => s;
global.regionLocale = () => 'fr-CH';
global.codeLangue = () => 'fr';
global.SUFFIXE_MODIFIE = /-(modifi[eé]|ge(ä|ae)ndert)$/i;
function extraire(debut, fin, retour) {
  const a = SOURCE.indexOf(debut);
  const b = SOURCE.indexOf(fin, a);
  if (a < 0 || b < 0) throw new Error('bloc introuvable dans la source : ' + debut);
  const code = SOURCE.slice(a, b);
  return new Function(code + '\nreturn ' + retour + ';')();
}
module.exports = { extraire, SOURCE };
