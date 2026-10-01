/*
 * Génère une paire de clés d'éditeur (Ed25519).
 *
 *   node editeur/generer-cles.js maj        # signer les archives de mise à jour
 *   node editeur/generer-cles.js licence    # signer les fichiers de licence
 *
 * À faire UNE FOIS, sur VOTRE poste, pas dans le dépôt et pas dans une
 * conversation. La clé PRIVÉE est écrite dans un dossier à vous (par défaut
 * ~/blonay-cles-privees, ou BLONAY_CLES_DIR) ; la clé PUBLIQUE est ajoutée à
 * desktop/cles-publiques.json, qui part dans l'application — commitez ce fichier.
 *
 * Où va la clé privée :
 *  - « maj »     → un secret du dépôt GitHub, nommé MAJ_CLE_PRIVEE (Settings ›
 *                  Secrets and variables › Actions › New repository secret) : collez
 *                  le contenu du fichier. La construction signe alors chaque archive.
 *  - « licence » → NULLE PART d'autre que votre poste et une sauvegarde hors ligne.
 *                  Ni GitHub, ni le site, ni son hébergeur : si l'hébergement est
 *                  compromis, personne ne doit pouvoir se signer une licence.
 *
 * Relancer la commande AJOUTE une clé (la suivante) sans retirer la courante : on
 * livre une version qui connaît déjà la clé de remplacement, puis on bascule.
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { brute } = require('../desktop/signature');

const quoi = process.argv[2];
if (quoi !== 'maj' && quoi !== 'licence') { console.error('usage : node editeur/generer-cles.js maj|licence'); process.exit(1); }
const dossierPrive = process.env.BLONAY_CLES_DIR || path.join(os.homedir(), 'blonay-cles-privees');
const fichierPublic = path.join(__dirname, '..', 'desktop', 'cles-publiques.json');

let j = { maj: [], licence: [] };
try { j = Object.assign(j, JSON.parse(fs.readFileSync(fichierPublic, 'utf8'))); } catch (e) { /* premier passage */ }
const d = new Date();
const id = quoi + '-' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String.fromCharCode(97 + j[quoi].length);

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
fs.mkdirSync(dossierPrive, { recursive: true, mode: 0o700 });
const chemin = path.join(dossierPrive, id + '.pem');
fs.writeFileSync(chemin, privateKey.export({ format: 'pem', type: 'pkcs8' }), { mode: 0o600 });
j[quoi].push({ id, cle: brute(publicKey) });
fs.writeFileSync(fichierPublic, JSON.stringify(j, null, 2) + '\n');

console.log('Clé ' + id + ' créée.');
console.log('  privée : ' + chemin + '   (à ne jamais commiter, jamais envoyer)');
console.log('  publique : ajoutée à desktop/cles-publiques.json — à commiter.');
console.log('');
if (quoi === 'maj') {
  console.log('Pour que la construction signe les archives :');
  console.log('  GitHub › Settings › Secrets and variables › Actions › New repository secret');
  console.log('  Nom : MAJ_CLE_PRIVEE     Valeur : tout le contenu de ' + chemin);
} else {
  console.log('Cette clé signe les licences : gardez-la sur ce poste et dans une sauvegarde hors ligne.');
  console.log('Elle ne va ni sur GitHub ni sur le site.');
}
