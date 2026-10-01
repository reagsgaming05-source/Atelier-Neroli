// Extrait les images « obtenues » que visuel.spec.js écrit dans le journal de la chaîne d'intégration
// (entre REFERENCE-OBTENUE <nom> et FIN-REFERENCE) et les range dans references-ci/.
//
//   node test-e2e/references-du-journal.js journal.txt
const fs = require('fs');
const path = require('path');

const texte = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/);
const dossier = path.join(__dirname, 'references-ci');
fs.mkdirSync(dossier, { recursive: true });
const sansHorodatage = (l) => l.replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z /, '').trim();

let nom = null, morceaux = [], n = 0;
for (const brut of texte) {
  const l = sansHorodatage(brut);
  const debut = l.match(/^REFERENCE-OBTENUE (\S+\.png)$/);
  if (debut) { nom = debut[1]; morceaux = []; continue; }
  if (l === 'FIN-REFERENCE' && nom) {
    fs.writeFileSync(path.join(dossier, nom), Buffer.from(morceaux.join(''), 'base64'));
    console.log('écrite : references-ci/' + nom);
    nom = null; n++; continue;
  }
  if (nom && /^[A-Za-z0-9+/=]+$/.test(l)) morceaux.push(l);
}
if (!n) { console.error('aucune image dans ce journal'); process.exit(1); }
