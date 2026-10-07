/*
 * Le nom d'un fichier qui part par la boîte « Enregistrer sous », avec ses accents.
 *
 * Chromium — donc Electron — remplace par « download » le nom d'un téléchargement dont l'attribut `download` n'est pas de l'ASCII pur : un
 * « Préavis.pdf » devient « download ». C'est la raison pour laquelle la page repliait les accents (Preavis.pdf). Pour que Windows propose
 * le nom tel qu'on l'a écrit, la page transporte le nom en ASCII — « aktum-u8-<nom en UTF-8 écrit en base64 URL><extension> » — et le
 * processus principal le décode avant de proposer la boîte. Un nom qui n'a pas cette forme passe tel quel.
 */
const PREFIXE = 'aktum-u8-';
const MOTIF = /^aktum-u8-([A-Za-z0-9_-]+)(\.[A-Za-z0-9]{1,8})?$/;

// Le nom d'origine, ou le nom reçu s'il n'a pas la forme transportée.
function decoder(recu) {
  const m = MOTIF.exec(String(recu || ''));
  if (!m) return recu;
  try {
    const brut = Buffer.from(m[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    if (!brut || brut.includes('�')) return recu;
    return brut + (m[2] || '');
  } catch (e) { return recu; }
}
// L'inverse, pour l'essai : ce que la page écrit (voir nomTransporte dans src/60-livraison.js).
function encoder(nom) {
  const point = nom.lastIndexOf('.');
  const ext = point > 0 && /^\.[A-Za-z0-9]{1,8}$/.test(nom.slice(point)) ? nom.slice(point) : '';
  const base = ext ? nom.slice(0, point) : nom;
  return PREFIXE + Buffer.from(base, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') + ext;
}
module.exports = { decoder, encoder, PREFIXE };
