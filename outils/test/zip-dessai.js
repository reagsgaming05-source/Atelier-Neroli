/*
 * Un zip d'essai, écrit octet par octet : en-tête local, données, index
 * central, fin. Rien à installer, et son contenu est connu au caractère près.
 *
 * Il sert à deux tests : celui du lecteur de zip (test/maj.test.js) et celui de
 * la mise à jour proposée par l'application (desktop/maj-test.js). Ce fichier
 * n'est pas empaqueté — il ne figure pas dans « files » de desktop/package.json.
 *
 * Qu'un vrai zip de Windows se lise aussi se vérifie ailleurs, sur l'archive
 * que la CI vient de fabriquer avec Compress-Archive.
 */
const zlib = require('zlib');

const crc = (b) => (typeof zlib.crc32 === 'function' ? zlib.crc32(b) : 0);

// Un zip minimal mais conforme : en-tête local, données, index central, fin.
function zipDe(entrees, options) {
  const opt = options || {};
  const morceaux = [];
  const index = [];
  let decalage = 0;
  entrees.forEach((e) => {
    const nom = Buffer.from(e.nom, 'utf8');
    const clair = Buffer.from(e.contenu, 'utf8');
    const comprime = e.brut ? clair : zlib.deflateRawSync(clair);
    const methode = e.brut ? 0 : 8;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6);
    local.writeUInt16LE(methode, 8);
    local.writeUInt32LE(crc(clair), 14);
    local.writeUInt32LE(opt.taillesEnFinDeFlux ? 0 : comprime.length, 18);
    local.writeUInt32LE(opt.taillesEnFinDeFlux ? 0 : clair.length, 22);
    local.writeUInt16LE(nom.length, 26);
    local.writeUInt16LE(e.extra ? e.extra : 0, 28);
    const bourrage = Buffer.alloc(e.extra || 0);
    morceaux.push(local, nom, bourrage, comprime);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(methode, 10);
    central.writeUInt32LE(crc(clair), 16);
    central.writeUInt32LE(opt.taillesEnFinDeFlux ? 0 : comprime.length, 20);
    central.writeUInt32LE(clair.length, 24);
    central.writeUInt16LE(nom.length, 28);
    central.writeUInt32LE(decalage, 42);
    index.push(central, nom);
    decalage += local.length + nom.length + bourrage.length + comprime.length;
  });
  const corps = Buffer.concat(morceaux);
  const central = Buffer.concat(index);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(entrees.length, 8);
  fin.writeUInt16LE(entrees.length, 10);
  fin.writeUInt32LE(central.length, 12);
  fin.writeUInt32LE(corps.length, 16);
  return Buffer.concat([corps, central, fin]);
}


module.exports = { zipDe };
