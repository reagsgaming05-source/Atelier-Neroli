/*
 * Une paire de clés d'essai, jetable : pour les tests de la construction, qui
 * signent et vérifient une archive sans toucher aux vraies clés de l'éditeur.
 *
 *   node editeur/paire-essai.js <fichier-prive.pem>
 *
 * Écrit la clé privée dans le fichier donné, et affiche sur la sortie standard ce
 * qu'il faut mettre dans AKTUM_CLES_PUBLIQUES_ESSAI pour que l'application (et
 * signer-maj.js) reconnaissent cette clé.
 */
const crypto = require('crypto');
const fs = require('fs');
const { brute } = require('../desktop/signature');
const sortie = process.argv[2];
if (!sortie) { console.error('usage : node editeur/paire-essai.js <fichier-prive.pem>'); process.exit(1); }
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
fs.writeFileSync(sortie, privateKey.export({ format: 'pem', type: 'pkcs8' }), { mode: 0o600 });
process.stdout.write(JSON.stringify({ maj: [{ id: 'essai-ci', cle: brute(publicKey) }], licence: [] }));
