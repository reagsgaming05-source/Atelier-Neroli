/*
 * Renomme le produit dans tout le dépôt, d'un seul geste et dans les deux sens.
 *
 *   node editeur/renommer-le-produit.js <ancien> <nouveau>            # montre ce qui changerait
 *   node editeur/renommer-le-produit.js <ancien> <nouveau> --ecrire   # le fait
 *
 *   exemple :  node editeur/renommer-le-produit.js blonay aktum --ecrire
 *   et pour revenir :  node editeur/renommer-le-produit.js aktum blonay --ecrire
 *
 * Le nom d'un produit s'écrit de trois façons (« Blonay », « BLONAY », « blonay ») : chacune est
 * remplacée par sa façon équivalente, dans les textes suivis par git — le code, les tests, les
 * documents, les flux de construction, le site. Les fichiers dont le NOM porte l'ancien nom sont
 * renommés (git mv). Les images, PDF et binaires ne sont pas touchés.
 *
 * Une ligne qui porte « @garder-ancien-nom » est laissée telle quelle : c'est ce qui permet à
 * l'application de retrouver, sous leur ancien nom, les réglages et dossiers d'avant le
 * changement (voir les migrations de main.js et de 00-socle.js).
 *
 * « de Aktum » devient « d’Aktum » (apostrophe typographique, sûre dans une chaîne JavaScript ou
 * une page) : le français élide devant une voyelle.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const [de, vers] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const ecrire = process.argv.includes('--ecrire');
if (!de || !vers) { console.error('usage : node editeur/renommer-le-produit.js <ancien> <nouveau> [--ecrire]'); process.exit(1); }

const racine = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: __dirname, encoding: 'utf8' }).trim();
const fichiers = execFileSync('git', ['ls-files', '-z'], { cwd: racine, encoding: 'utf8', maxBuffer: 1 << 28 }).split('\0').filter(Boolean);
const BINAIRES = /\.(png|jpe?g|gif|ico|icns|pdf|zip|gz|woff2?|ttf|otf|wasm|bin|traineddata|mp4|webp)$/i;
const IGNORES = [/^site\/vitrine\//, /^outils\/libs\//, /(^|\/)node_modules\//];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const variantes = [[de.toUpperCase(), vers.toUpperCase()], [cap(de), cap(vers)], [de.toLowerCase(), vers.toLowerCase()]];
const voyelle = /^[aeiouyàâäéèêëîïôöùûüh]/i.test(vers);

let touches = 0, remplacements = 0;
const rapport = [];
for (const f of fichiers) {
  if (BINAIRES.test(f) || IGNORES.some((r) => r.test(f))) continue;
  const chemin = path.join(racine, f);
  let brut;
  try { const st = fs.statSync(chemin); if (!st.isFile() || st.size > 8 << 20) continue; brut = fs.readFileSync(chemin, 'utf8'); } catch (e) { continue; }
  if (brut.includes('\u0000')) continue;
  let n = 0;
  const lignes = brut.split('\n').map((l) => {
    if (l.includes('@garder-ancien-nom')) return l;
    let r = l;
    for (const [a, b] of variantes) r = r.split(a).join(b);
    if (voyelle) {
      // « de Aktum » → « d’Aktum », « que Aktum » → « qu’Aktum », « le Aktum » → « l’Aktum »
      r = r.replace(new RegExp('\\b([Dd])e (' + cap(vers) + ')', 'g'), '$1’$2')
        .replace(new RegExp('\\b([Qq]u)e (' + cap(vers) + ')', 'g'), '$1’$2')
        .replace(new RegExp('\\b([Ll])e (' + cap(vers) + ')', 'g'), '$1’$2');
    }
    if (r !== l) n++;
    return r;
  });
  if (n) { touches++; remplacements += n; rapport.push(f + ' (' + n + ')'); if (ecrire) fs.writeFileSync(chemin, lignes.join('\n')); }
}

// Les fichiers dont le nom porte l'ancien nom.
const renommes = [];
for (const f of fichiers) {
  if (IGNORES.some((r) => r.test(f))) continue;
  let n = f;
  for (const [a, b] of variantes) n = n.split(a).join(b);
  if (n !== f) renommes.push([f, n]);
}
if (ecrire) for (const [a, b] of renommes) { fs.mkdirSync(path.dirname(path.join(racine, b)), { recursive: true }); execFileSync('git', ['mv', a, b], { cwd: racine }); }

console.log((ecrire ? 'Fait' : 'À faire') + ' : ' + remplacements + ' lignes dans ' + touches + ' fichiers, ' + renommes.length + ' fichier(s) renommé(s).');
if (!ecrire) { rapport.slice(0, 60).forEach((r) => console.log('  ' + r)); renommes.forEach(([a, b]) => console.log('  mv ' + a + ' → ' + b)); }
