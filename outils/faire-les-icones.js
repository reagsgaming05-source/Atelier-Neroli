// Tire de src/marque.svg toutes les icônes du dépôt : celles du site
// installable, celle de la fenêtre Electron, celles du lanceur Go, et les deux
// fichiers .ico posés sur les exécutables Windows.
//
// À lancer quand le dessin de la marque change — « npm run icones » dans
// outils/ —, puis à commiter. Ces fichiers sont petits (une trentaine de
// kilooctets en tout) et servent avant que quoi que ce soit ne soit construit :
// electron-builder veut son .ico, le lanceur Go veut le sien. Les refaire à la
// main, en revanche, c'est la garantie qu'un jour l'un d'eux restera à
// l'ancienne marque sans que personne ne le voie.
//
// Le rendu passe par le Chromium de la suite de bout en bout : c'est le moteur
// qui affichera l'icône, et chaque taille est dessinée à sa taille plutôt que
// réduite depuis une grande — à 16 pixels, cela se voit.
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const MARQUE = path.join(__dirname, 'src', 'marque.svg');

let chromium;
try {
  ({ chromium } = require(path.join(__dirname, 'test-e2e', 'node_modules', '@playwright', 'test')));
} catch (e) {
  console.error('Le navigateur de rendu manque. Dans outils/test-e2e : npm ci puis npx playwright install chromium.');
  process.exit(1);
}

// Chaque fichier attendu, et la taille à laquelle le dessiner.
const PNG = [
  ['docs/icon-192.png', 192],
  ['docs/icon-512.png', 512],
  ['outils/desktop/build/icon.png', 256],
  ['outils/application/icon-32.png', 32],
  ['outils/application/icon-48.png', 48],
  ['outils/application/icon-256.png', 256],
];
// Windows pioche la taille qui lui convient selon l'endroit : la barre des
// tâches, l'explorateur en grandes icônes, la boîte Alt+Tab.
const ICO = [16, 24, 32, 48, 64, 128, 256];
const ICO_SORTIES = ['outils/application/icon.ico', 'outils/desktop/build/icon.ico'];

// Un .ico est un entête, un catalogue, puis les images bout à bout. Depuis
// Vista chaque image peut être un PNG tel quel, ce qu'attendait déjà l'ancien
// fichier : on garde ce format.
function ico(images) {
  const entetes = Buffer.alloc(6 + images.length * 16);
  entetes.writeUInt16LE(0, 0);
  entetes.writeUInt16LE(1, 2);
  entetes.writeUInt16LE(images.length, 4);
  let position = entetes.length;
  images.forEach(({ taille, png }, i) => {
    const e = 6 + i * 16;
    entetes.writeUInt8(taille >= 256 ? 0 : taille, e);
    entetes.writeUInt8(taille >= 256 ? 0 : taille, e + 1);
    entetes.writeUInt8(0, e + 2);
    entetes.writeUInt8(0, e + 3);
    entetes.writeUInt16LE(1, e + 4);
    entetes.writeUInt16LE(32, e + 6);
    entetes.writeUInt32LE(png.length, e + 8);
    entetes.writeUInt32LE(position, e + 12);
    position += png.length;
  });
  return Buffer.concat([entetes, ...images.map((i) => i.png)]);
}

(async () => {
  const dessin = fs.readFileSync(MARQUE, 'utf8');
  // Le site sert le dessin tel quel, sans les commentaires qui l'expliquent.
  const nu = dessin.replace(/<!--[\s\S]*?-->\n?\s*/g, '');
  fs.writeFileSync(path.join(RACINE, 'docs', 'icon.svg'), nu);
  const nav = await chromium.launch({ executablePath: process.env.BLONAY_CHROMIUM || undefined });
  const page = await nav.newPage();

  async function rendre(taille) {
    await page.setViewportSize({ width: taille, height: taille });
    await page.setContent('<style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style>'
      + dessin.replace(/width="\d+" height="\d+"/, 'width="' + taille + '" height="' + taille + '"'));
    // Fond omis : les coins arrondis de la tuile restent transparents.
    return page.screenshot({ omitBackground: true });
  }

  const faits = [['docs/icon.svg', 'vectoriel', nu.length]];
  for (const [relatif, taille] of PNG) {
    const png = await rendre(taille);
    fs.writeFileSync(path.join(RACINE, relatif), png);
    faits.push([relatif, taille + '×' + taille, png.length]);
  }

  const images = [];
  for (const taille of ICO) images.push({ taille, png: await rendre(taille) });
  const fichier = ico(images);
  for (const relatif of ICO_SORTIES) {
    fs.writeFileSync(path.join(RACINE, relatif), fichier);
    faits.push([relatif, ICO.join(', '), fichier.length]);
  }

  await nav.close();
  for (const [f, quoi, octets] of faits) {
    console.log(f.padEnd(34), String(quoi).padStart(22), (octets / 1024).toFixed(1).padStart(7) + ' ko');
  }
  console.log('\n' + faits.length + ' fichiers tirés de outils/src/marque.svg.');
})();
