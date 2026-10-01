// Ce que le système répond quand une écriture échoue, dit à une secrétaire plutôt qu'à un développeur : cinq codes qu'on rencontre
// vraiment sur un poste communal (fichier tenu par Acrobat, dossier protégé, disque plein, partage débranché, dossier en lecture
// seule), et le code lui-même pour tout le reste, que le support saura lire.
const PHRASES = {
  EACCES: 'Windows refuse d’écrire ici : le fichier est protégé, ou vous n’avez pas le droit d’écrire dans ce dossier. Enregistrez-le ailleurs (« Enregistrer sous… »).',
  EPERM: 'Windows refuse d’écrire ici : le fichier est protégé, ou vous n’avez pas le droit d’écrire dans ce dossier. Enregistrez-le ailleurs (« Enregistrer sous… »).',
  EBUSY: 'Le fichier est ouvert dans un autre programme (Acrobat, Word…) : fermez-le, puis réessayez.',
  ENOSPC: 'Le disque est plein : libérez de la place, puis réessayez.',
  ENOENT: 'Le dossier du fichier n’existe plus (disque ou partage débranché ?). Enregistrez-le ailleurs (« Enregistrer sous… »).',
  EROFS: 'Ce dossier est en lecture seule : enregistrez le document ailleurs (« Enregistrer sous… »).',
};
function phraseErreur(err) {
  const code = err && err.code ? String(err.code) : '';
  if (PHRASES[code]) return PHRASES[code];
  return 'Le fichier n’a pas pu être écrit' + (code ? ' (' + code + ')' : '') + (err && err.message ? ' : ' + err.message : '') + '.';
}
module.exports = { phraseErreur, PHRASES };
