/*
 * Vérifier une archive de mise à jour avant de la déballer — pour le script de
 * mise à jour, qui tourne après la fermeture de l'application et ne sait pas
 * faire de cryptographie. Il appelle l'application elle-même, en mode « Node »,
 * qui porte les clés publiques de l'éditeur :
 *
 *   ELECTRON_RUN_AS_NODE=1 BlonayPDF.exe resources\app.asar\verifier-maj.js <zip>
 *
 * Code de sortie : 0 = signée par l'éditeur ; 2 = refusée (la raison est écrite).
 */
const { verifierZip, lireCles } = require('./signature');
const zip = process.argv[2];
if (!zip) { console.error('usage : verifier-maj.js <archive.zip>'); process.exit(2); }
const r = verifierZip(zip, { cles: lireCles().maj });
if (r.ok) { console.log('SIGNATURE-OK ' + (r.piece.version || '') + ' ' + (r.piece.canal || '')); process.exit(0); }
console.error('SIGNATURE-REFUSEE : ' + r.raison);
process.exit(2);
