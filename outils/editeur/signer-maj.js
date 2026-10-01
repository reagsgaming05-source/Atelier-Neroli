/*
 * Signe une archive de mise à jour : écrit « <archive>.signature.json » à côté.
 *
 *   node editeur/signer-maj.js AktumPDF-windows.zip --plateforme windows \
 *        --version 2.1.0 --canal stable [--critique] [--commit abc1234] [--date ISO]
 *
 * La clé privée vient de la variable MAJ_CLE_PRIVEE (le contenu du fichier .pem),
 * ou de --cle <fichier.pem>. Elle doit correspondre à une clé publique déjà
 * présente dans desktop/cles-publiques.json : signer avec une clé que les
 * applications ne connaissent pas ne produirait que des archives refusées.
 *
 * Sans clé : avertit et sort sans rien écrire — la construction reste verte, mais
 * l'archive ne sera acceptée par aucun poste comme mise à jour (elle s'installe
 * toujours à la main). --obligatoire : sort en erreur plutôt que d'avertir.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { signer, empreinteFichier, brute, SIGNATURE_DU_ZIP, lireCles } = require('../desktop/signature');

function arg(nom, defaut) { const i = process.argv.indexOf('--' + nom); return i > 0 ? process.argv[i + 1] : defaut; }
const present = (nom) => process.argv.includes('--' + nom);
const zip = process.argv[2];
if (!zip || zip.startsWith('--')) { console.error('usage : node editeur/signer-maj.js <archive.zip> --plateforme windows|mac --version X.Y.Z --canal stable|candidate'); process.exit(1); }

let pem = process.env.MAJ_CLE_PRIVEE || '';
if (arg('cle')) pem = fs.readFileSync(arg('cle'), 'utf8');
if (!pem.trim()) {
  const msg = 'Aucune clé de signature (MAJ_CLE_PRIVEE) : l’archive n’est pas signée, aucun poste ne l’acceptera comme mise à jour. Voir editeur/generer-cles.js.';
  if (present('obligatoire')) { console.error(msg); process.exit(1); }
  console.log('::warning::' + msg);
  process.exit(0);
}
pem = pem.replace(/\\n/g, '\n');
const cle = crypto.createPrivateKey(pem);
const publique = brute(crypto.createPublicKey(cle));
const connue = lireCles().maj.find((c) => c.cle === publique);
if (!connue) { console.error('Cette clé privée ne correspond à aucune clé publique de desktop/cles-publiques.json : les applications refuseraient la signature.'); process.exit(1); }

const plateforme = arg('plateforme');
if (plateforme !== 'windows' && plateforme !== 'mac') { console.error('--plateforme windows ou mac'); process.exit(1); }
const canal = arg('canal', 'stable');
if (canal !== 'stable' && canal !== 'candidate') { console.error('--canal stable ou candidate'); process.exit(1); }
const corps = {
  v: 1, objet: 'maj', cle: connue.id,
  fichier: path.basename(zip), sha256: empreinteFichier(zip), taille: fs.statSync(zip).size,
  version: arg('version', ''), plateforme, canal, critique: present('critique'),
  commit: arg('commit', ''), date: arg('date', new Date().toISOString()),
};
fs.writeFileSync(zip + SIGNATURE_DU_ZIP, JSON.stringify(signer(corps, pem), null, 2) + '\n');
console.log('Signée : ' + path.basename(zip) + SIGNATURE_DU_ZIP + ' (clé ' + connue.id + ', ' + corps.version + ', ' + canal + ', ' + plateforme + ')');
