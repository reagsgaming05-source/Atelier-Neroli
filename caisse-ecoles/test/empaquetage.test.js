/*
 * Ce qui part dans l'exécutable.
 *
 * electron-builder n'embarque que les fichiers énumérés dans desktop/package.json. Un module
 * ajouté à côté de main.js et oublié dans cette liste ne se voit nulle part : les tests passent,
 * la construction passe, le zip se fabrique — et l'application ne démarre pas du tout, parce que
 * son `require` échoue avant la première fenêtre. C'est arrivé avec veille.js.
 *
 * Le test de fumée finit par le voir (l'application ne s'ouvre pas), mais trois minutes plus tard
 * et après avoir tout empaqueté. Ici, c'est dit en une seconde.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const desktop = path.join(__dirname, '..', 'desktop');
const pkg = JSON.parse(fs.readFileSync(path.join(desktop, 'package.json'), 'utf8'));

/** Les modules locaux qu'un fichier exige : require('./quelquechose.js'). */
function exigences(fichier) {
  const src = fs.readFileSync(path.join(desktop, fichier), 'utf8');
  return Array.from(src.matchAll(/require\(['"]\.\/([^'"]+)['"]\)/g)).map((m) => m[1]);
}

/** Le motif de la liste couvre-t-il ce fichier ? « app/** » couvre « app/x.html ». */
function couvert(fichier, motifs) {
  return motifs.some((m) => {
    if (m.startsWith('!')) return false;
    if (m === fichier) return true;
    const re = new RegExp('^' + m.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '::').replace(/\*/g, '[^/]*').replace(/::/g, '.*') + '$');
    return re.test(fichier);
  });
}

test('tout ce que le processus principal exige part dans l\'exécutable', () => {
  const motifs = pkg.build.files;
  const manquants = [];
  for (const entree of ['main.js', 'preload.js', 'shell-preload.js']) {
    for (const f of exigences(entree)) {
      if (!fs.existsSync(path.join(desktop, f))) continue; // module de node, pas un fichier à nous
      if (!couvert(f, motifs)) manquants.push(`${entree} exige ${f}`);
    }
  }
  assert.deepEqual(manquants, [], `modules absents de desktop/package.json « build.files » :\n  ${manquants.join('\n  ')}`);
});

test('les fichiers énumérés existent vraiment', () => {
  const absents = pkg.build.files
    .filter((m) => !m.startsWith('!') && !m.includes('*'))
    .filter((m) => !fs.existsSync(path.join(desktop, m)));
  assert.deepEqual(absents, [], 'fichiers énumérés mais introuvables');
});

test('le point d\'entrée déclaré est celui qui existe', () => {
  assert.ok(fs.existsSync(path.join(desktop, pkg.main)), `main : ${pkg.main} introuvable`);
  assert.ok(couvert(pkg.main, pkg.build.files), `le point d'entrée ${pkg.main} n'est pas empaqueté`);
});
