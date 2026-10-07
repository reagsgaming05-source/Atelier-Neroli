/*
 * Ce que la suite de bout en bout exécute du code de l'application.
 *
 *   npm run couverture                 # joue toute la suite avec relevé, puis rapporte
 *   node couverture.js --rapport       # rapporte seulement, d'après un relevé déjà fait
 *   node couverture.js -- poste.spec.js   # joue seulement ces scénarios
 *
 * Le navigateur dit, pour le programme de la page (un seul <script>), quelles plages d'octets ont été exécutées ; chaque scénario en dépose le
 * relevé dans couverture/. Ici on les additionne, puis on les rapporte aux modules de outils/src/ : sur chacun, la part des « jetons » du code
 * (hors blancs et commentaires) qui ont été exécutés au moins une fois par au moins un scénario.
 *
 * Ce que ce chiffre est : une borne HAUTE de ce que les scénarios prouvent (exécuter une ligne n'est pas la vérifier), et rien de plus. Il ne
 * dit rien de l'application de bureau (outils/desktop/), qui a ses propres essais. À citer avec cette réserve, jamais seul.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DOSSIER = path.join(__dirname, 'couverture');
const SRC = path.join(__dirname, '..', 'src');
const PAGE = path.join(__dirname, '..', 'aktum-pdf-hors-ligne.html');
const args = process.argv.slice(2);

if (!args.includes('--rapport')) {
  fs.rmSync(DOSSIER, { recursive: true, force: true });
  const apres = args.includes('--') ? args.slice(args.indexOf('--') + 1) : [];
  const r = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['playwright', 'test', '--workers=3', ...apres],
    { cwd: __dirname, stdio: 'inherit', env: { ...process.env, AKTUM_COUVERTURE: '1' }, shell: process.platform === 'win32' });
  if (r.status) console.error('\nLa suite a des échecs (code ' + r.status + ') : le relevé ci-dessous est celui des scénarios qui ont pu finir.');
}

if (!fs.existsSync(DOSSIER)) { console.error('Aucun relevé dans couverture/ : lancez « npm run couverture ».'); process.exit(1); }
const releves = fs.readdirSync(DOSSIER).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(DOSSIER, f), 'utf8')));
if (!releves.length) { console.error('Relevés vides.'); process.exit(1); }

// Le programme de la page, tel que le navigateur l'a lu.
const html = fs.readFileSync(PAGE, 'utf8');
const longueurs = new Map();
releves.forEach((r) => longueurs.set(r.longueur, (longueurs.get(r.longueur) || 0) + 1));
const longueur = [...longueurs.entries()].sort((a, b) => b[1] - a[1])[0][0];
let programme = null;
for (const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) if (m[1].length === longueur) { programme = m[1]; break; }
if (!programme) { console.error('Le programme relevé (' + longueur + ' octets) n\'est plus celui de la page construite : refaites « npm run build » puis le relevé.'); process.exit(1); }

const couvert = new Uint8Array(longueur);
for (const r of releves.filter((x) => x.longueur === longueur)) for (const [a, b] of r.plages) couvert.fill(1, a, b);

// Les modules, dans l'ordre où l'assembleur les recolle : chacun se repère à ses premières lignes.
const acorn = require(path.join(__dirname, '..', 'libs', 'acorn-8.14.1'));
const modules = fs.readdirSync(SRC).filter((f) => /^\d\d-.*\.js$/.test(f)).sort();
const debuts = [];
let curseur = 0;
for (const f of modules) {
  // Le début du module tel que l'assembleur l'a recollé : ses cent premiers caractères (en-tête compris), sinon sa première ligne de code, cherchée
  // à partir de la fin du module précédent — l'ordre des modules est celui des numéros.
  const brut = fs.readFileSync(path.join(SRC, f), 'utf8').replace(/\r\n/g, '\n');
  let i = programme.indexOf(brut.slice(0, 100), curseur);
  if (i < 0) {
    const code = brut.split('\n').filter((l) => l.trim() && !/^\s*\/\//.test(l)).slice(0, 1)[0];
    i = code ? programme.indexOf(code, curseur) : -1;
  }
  if (i < 0) { console.error('Module introuvable dans le programme : ' + f); continue; }
  debuts.push({ f, i }); curseur = i + 1;
}
debuts.sort((a, b) => a.i - b.i);

// Les jetons du programme entier (hors commentaires), puis la part exécutée, module par module.
const jetons = [];
try {
  for (const t of acorn.tokenizer(programme, { ecmaVersion: 'latest', allowHashBang: true })) jetons.push(t.start);
} catch (e) { console.error('Le programme n\'a pas pu être découpé en jetons : ' + e.message); process.exit(1); }
const lignes = [];
let totalJ = 0, totalC = 0;
debuts.forEach((m, k) => {
  const fin = k + 1 < debuts.length ? debuts[k + 1].i : programme.length;
  let n = 0, c = 0;
  for (const s of jetons) if (s >= m.i && s < fin) { n++; if (couvert[s]) c++; }
  totalJ += n; totalC += c;
  lignes.push({ module: m.f, jetons: n, couverts: c, part: n ? c / n : 1 });
});
lignes.sort((a, b) => a.part - b.part);
const pct = (x) => (100 * x).toFixed(1).padStart(5) + ' %';
const sortie = ['# Couverture de bout en bout', '',
  releves.length + ' relevés (un par scénario), ' + modules.length + ' modules, ' + totalJ + ' jetons de code.', '',
  'Part du code exécuté au moins une fois : **' + pct(totalC / totalJ).trim() + '**.', '',
  '| Module | Jetons | Exécutés | Part |', '| --- | ---: | ---: | ---: |']
  .concat(lignes.map((l) => '| ' + l.module + ' | ' + l.jetons + ' | ' + l.couverts + ' | ' + pct(l.part).trim() + ' |'));
fs.writeFileSync(path.join(DOSSIER, 'RAPPORT.md'), sortie.join('\n') + '\n');
console.log('\n' + sortie.join('\n'));
