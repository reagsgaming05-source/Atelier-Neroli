// La marque, dite une seule fois (desktop/marque.json) et lue par quatre surfaces : l'application (style.css), le site de vente
// (globals.css, logo.tsx), l'icône (marque.svg) et l'application fenêtrée (main.js, pour le fond de la fenêtre). L'audit y
// avait trouvé des palettes sans aucune couleur commune, deux polices de titrage, et une fenêtre qui s'ouvrait sur un blanc
// qui n'était le fond d'aucun thème. Ce test garde les quatre d'accord.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..', '..');
const lire = (...p) => fs.readFileSync(path.join(RACINE, ...p), 'utf8').replace(/\r\n/g, '\n');
const marque = JSON.parse(lire('outils', 'desktop', 'marque.json'));
const css = lire('outils', 'src', 'style.css');
const site = lire('site', 'src', 'app', 'globals.css');
const svg = lire('outils', 'src', 'marque.svg');
const maj = s => String(s).toUpperCase();

function jetons(source, debut) {
  const i = source.indexOf(debut);
  assert.ok(i >= 0, 'bloc introuvable : ' + debut);
  const j = source.indexOf('{', i);
  let prof = 0, k = j;
  for (; k < source.length; k++) { if (source[k] === '{') prof++; else if (source[k] === '}' && --prof === 0) break; }
  const o = {};
  for (const m of source.slice(j + 1, k).matchAll(/(--[\w-]+):\s*([^;]+);/g)) o[m[1]] = m[2].trim();
  return o;
}
const appSombre = jetons(css, ':root {');
const appClair = jetons(css, ':root[data-theme="light"] {');
const siteTheme = jetons(site, '@theme {');

test('la palette de la marque a toutes ses couleurs, en hexadécimal', () => {
  for (const k of ['papier', 'encre', 'signet', 'signet-fonce', 'signet-pli', 'action', 'action-survol']) assert.match(marque[k], /^#[0-9A-F]{6}$/, k);
  assert.match(marque['fond-fenetre'].sombre, /^#[0-9A-F]{6}$/);
  assert.match(marque['fond-fenetre'].clair, /^#[0-9A-F]{6}$/);
});

test('l\'application : le bleu d\'action, le papier, l\'encre et le signet sont ceux de la marque', () => {
  assert.equal(maj(appSombre['--bleu']), marque.action);
  assert.equal(maj(appSombre['--bleu-survol']), marque['action-survol']);
  assert.equal(maj(appSombre['--papier']), marque.papier);
  assert.equal(maj(appSombre['--signet']), marque.signet);
  assert.equal(maj(appSombre['--signet-fonce']), marque['signet-fonce']);
  assert.equal(maj(appSombre['--signet-pli']), marque['signet-pli']);
});

test('les fonds de fenêtre sont le plateau (--table) de chaque thème', () => {
  assert.equal(maj(appSombre['--table']), marque['fond-fenetre'].sombre);
  assert.equal(maj(appClair['--table']), marque['fond-fenetre'].clair);
});

test('le site : le même bleu d\'action, le même papier, la même encre, les mêmes trois rouges', () => {
  assert.equal(maj(siteTheme['--color-brand-500']), marque.action);
  assert.equal(maj(siteTheme['--color-brand-600']), marque['action-survol']);
  assert.equal(maj(siteTheme['--color-papier']), marque.papier);
  assert.equal(maj(siteTheme['--color-canvas-50']), marque.papier);
  assert.equal(maj(siteTheme['--color-ink-900']), marque.encre);
  assert.equal(maj(siteTheme['--color-signet']), marque.signet);
  assert.equal(maj(siteTheme['--color-signet-fonce']), marque['signet-fonce']);
  assert.equal(maj(siteTheme['--color-signet-pli']), marque['signet-pli']);
});

test('l\'icône n\'emploie que les couleurs de la marque', () => {
  const utilisees = new Set(Array.from(svg.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/g)).map(m => maj(m[1])));
  const permises = new Set([marque.papier, marque.signet, marque['signet-fonce'], marque['signet-pli']]);
  assert.deepEqual(Array.from(utilisees).filter(c => !permises.has(c)), []);
  assert.ok(utilisees.has(marque.signet), 'la tuile est au signet');
});

test('le site porte le même dessin que l\'icône : la même feuille, le même coin, le même signet', () => {
  const formes = s => Array.from(s.matchAll(/\bd="([^"]+)"/g)).map(m => m[1]).sort();
  const logo = lire('site', 'src', 'components', 'logo.tsx');
  assert.deepEqual(formes(logo), formes(svg), 'les tracés du logo du site ne sont plus ceux de marque.svg');
  assert.equal(lire('site', 'src', 'app', 'icon.svg').replace(/\s+/g, ' ').trim(), svg.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').trim(), 'site/src/app/icon.svg : « npm run icones »');
});

test('les polices : celles de la marque, dans l\'application comme sur le site', () => {
  const { titre, interface: ui, chiffre } = marque.polices;
  assert.ok(appSombre['--titre'].startsWith('"' + titre + '"'));
  assert.ok(appSombre['--ui'].startsWith('"' + ui + '"'));
  assert.ok(appSombre['--chiffre'].startsWith('"' + chiffre + '"'));
  assert.match(siteTheme['--font-display'], new RegExp('"' + titre + '"'));
  assert.match(siteTheme['--font-sans'], new RegExp('"' + ui + '"'));
  const polices = lire('site', 'src', 'app', 'fonts.ts');
  assert.match(polices, /instrument-serif/);
  assert.match(polices, /geist/);
  assert.doesNotMatch(polices, /bricolage|manrope/i, 'les anciennes polices du site');
});

test('la fenêtre de l\'application prend son fond dans la marque, pas dans une valeur écrite à la main', () => {
  const main = lire('outils', 'desktop', 'main.js');
  const fonds = Array.from(main.matchAll(/backgroundColor:\s*([^,\n]+)/g)).map(m => m[1].trim());
  assert.ok(fonds.length >= 3, 'trois fenêtres : principale, connexion, compte');
  assert.deepEqual(fonds.filter(f => /^'#/.test(f)), [], 'un fond écrit en dur : ' + fonds.join(' | '));
  assert.match(lire('outils', 'desktop', 'package.json'), /"marque\.json"/, 'marque.json est dans le paquet');
});

test('« Aktum PDF » : le nom du produit s\'écrit avec son espace, le fichier sans', () => {
  const b = JSON.parse(lire('outils', 'desktop', 'package.json')).build;
  assert.equal(b.productName, 'Aktum PDF');
  assert.equal(b.win.executableName, 'AktumPDF');
  assert.equal(b.mac.executableName, 'AktumPDF');
  assert.ok(!/\$\{productName\}/.test(b.artifactName), 'un nom de fichier sans espace');
});

test('la fenêtre de connexion : le même bleu d\'action, les mêmes fonds que l\'application', () => {
  const page = lire('outils', 'desktop', 'choix-profil.html');
  assert.equal(maj((/--action:\s*(#[0-9A-Fa-f]{6})/.exec(page) || [])[1]), marque.action);
  assert.ok(page.includes('--table: ' + marque['fond-fenetre'].sombre), 'fond sombre');
  assert.ok(maj(page).includes('--TABLE: ' + marque['fond-fenetre'].clair), 'fond clair');
  assert.doesNotMatch(page, /--marque:/, 'le rouge de la marque n\'est plus la couleur des boutons');
});
