// Le fichier des composants tiers livré avec le logiciel.
//
// 93 % de ce qui part chez un client est le travail d'autrui. Chaque licence en
// jeu demande, au minimum, que son texte et sa mention de droit d'auteur
// voyagent avec le logiciel : c'est la seule contrepartie qu'elles exigent, et
// c'est ce fichier qui la remplit. Il est produit à chaque construction depuis
// les fichiers de licence des paquets réellement embarqués (libs/), jamais
// recopié à la main : une copie à la main reste à la version du jour où on l'a
// faite.
const fs = require('fs');
const path = require('path');
const LIB = path.join(__dirname, 'libs');

const lire = (...parties) => {
  const p = path.join(LIB, ...parties);
  if (!fs.existsSync(p)) throw new Error('fichier de licence introuvable : ' + p + ' (npm run libs)');
  return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').trim();
};

// Les composants de la page, tels que build.js les soude dans le fichier livré.
// « licence » est celle sous laquelle Aktum PDF les utilise ; JSZip est offert
// en MIT ou en GPLv3 au choix, et c'est la MIT qui est retenue.
const COMPOSANTS = [
  { nom: 'pdf.js', version: '3.11.174', licence: 'Apache-2.0', auteur: 'Mozilla Foundation',
    role: 'lecture et affichage des PDF', fichier: ['pdfjs-dist-3.11.174', 'LICENSE'] },
  { nom: 'pdf-lib (fork @cantoo/pdf-lib)', version: '2.11.0', licence: 'MIT', auteur: 'Andrew Dillon et contributeurs',
    role: 'création et modification des PDF, chiffrement', fichier: ['cantoo-pdf-lib-2.11.0', 'LICENSE.md'] },
  { nom: 'JSZip', version: '3.10.1', licence: 'MIT (offert au choix en MIT ou GPLv3 ; la MIT est retenue)',
    auteur: 'Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso',
    role: 'archives zip (exports en lot)', fichier: ['jszip-3.10.1', 'LICENSE.markdown'], dependances: 'Inclut pako (MIT), https://github.com/nodeca/pako/blob/main/LICENSE' },
  { nom: 'tesseract.js', version: '7.0.0', licence: 'Apache-2.0', auteur: 'Jerome Wu, Balearica et contributeurs',
    role: 'reconnaissance de texte (OCR)', fichier: ['tesseract.js-7.0.0', 'LICENSE.md'],
    annexes: [['tesseract.js-7.0.0', 'dist', 'tesseract.min.js.LICENSE.txt'], ['tesseract.js-7.0.0', 'dist', 'worker.min.js.LICENSE.txt']] },
  { nom: 'tesseract.js-core (moteur Tesseract compilé en WebAssembly)', version: '7.0.0', licence: 'Apache-2.0',
    auteur: 'Jerome Wu et contributeurs ; Tesseract OCR : Google et contributeurs',
    role: 'moteur de reconnaissance de texte', fichier: ['tesseract.js-core-7.0.0', 'LICENSE'] },
  { nom: 'fontkit (fork @cantoo/fontkit)', version: '2.0.12', licence: 'MIT', auteur: 'Devon Govett et contributeurs',
    role: 'lecture et découpe des polices incorporées dans les PDF produits', fichier: ['cantoo-fontkit-2.0.12', 'LICENSE'],
    dependances: 'Inclut restructure, brotli, dfa, fflate, unicode-properties et unicode-trie (MIT), '
      + 'https://github.com/foliojs/restructure, https://github.com/foliojs/brotli.js, https://github.com/foliojs/dfa, '
      + 'https://github.com/101arrowz/fflate, https://github.com/foliojs/unicode-properties, https://github.com/foliojs/unicode-trie' },
  { nom: 'Arimo (police sans empattement, de mêmes largeurs que Helvetica et Arial)', version: '0.4.3', licence: 'SIL Open Font License 1.1',
    auteur: 'The Arimo Project Authors', role: 'écriture des textes ajoutés aux PDF avec des caractères hors du jeu Windows, et PDF/A',
    fichier: ['expo-google-fonts-arimo-0.4.3', 'LICENSE_FONT'] },
  { nom: 'Tinos (police à empattements, de mêmes largeurs que Times New Roman)', version: '0.4.2', licence: 'SIL Open Font License 1.1',
    auteur: 'The Tinos Project Authors', role: 'idem, famille à empattements', fichier: ['expo-google-fonts-tinos-0.4.2', 'LICENSE_FONT'] },
  { nom: 'Cousine (police à chasse fixe, de mêmes largeurs que Courier New)', version: '0.4.3', licence: 'SIL Open Font License 1.1',
    auteur: 'The Cousine Project Authors', role: 'idem, famille à chasse fixe', fichier: ['expo-google-fonts-cousine-0.4.3', 'LICENSE_FONT'] },
];

const MODELES = 'Modèles de langue français et allemand « tessdata_best » du projet Tesseract OCR (https://github.com/tesseract-ocr/tessdata_best), '
  + 'embarqués entiers. Licence : Apache-2.0 (texte ci-dessus, sous tesseract.js-core). '
  + 'Les paquets npm @tesseract.js-data/fra et @tesseract.js-data/deu qui les réemballent déclarent « MIT » et ne contiennent aucun fichier de licence : '
  + 'cette déclaration est inexacte, la licence du dépôt amont fait foi.';

function mentions({ version = '', construction = '' } = {}) {
  const trait = '='.repeat(78);
  const sous = '-'.repeat(78);
  const sortie = [];
  sortie.push('AKTUM PDF — COMPOSANTS TIERS ET LEURS LICENCES');
  sortie.push(trait);
  sortie.push('');
  sortie.push('Aktum PDF est un logiciel propriétaire : ses conditions d\'utilisation sont dans LICENCE.txt.');
  sortie.push('Il embarque les composants libres ci-dessous. Chacun reste sous sa licence, dont le texte est');
  sortie.push('reproduit ici comme elle l\'exige.' + (version ? '  Version ' + version + (construction ? ', ' + construction : '') + '.' : ''));
  sortie.push('');
  sortie.push('SOMMAIRE');
  COMPOSANTS.forEach((c, i) => sortie.push('  ' + (i + 1) + '. ' + c.nom + ' ' + c.version + ' — ' + c.licence));
  sortie.push('  ' + (COMPOSANTS.length + 1) + '. Modèles de langue de reconnaissance de texte — Apache-2.0');
  sortie.push('  ' + (COMPOSANTS.length + 2) + '. Electron et Chromium (application fenêtrée) — MIT, BSD, Apache-2.0, LGPL et autres');
  sortie.push('');
  COMPOSANTS.forEach((c, i) => {
    sortie.push(trait);
    sortie.push((i + 1) + '. ' + c.nom + ' ' + c.version);
    sortie.push('   Rôle : ' + c.role + '.   Auteur : ' + c.auteur + '.   Licence : ' + c.licence + '.');
    if (c.dependances) sortie.push('   ' + c.dependances + '.');
    sortie.push(sous);
    sortie.push(lire(...c.fichier));
    for (const a of c.annexes || []) {
      sortie.push('');
      sortie.push('   [ ' + a[a.length - 1] + ' — mentions des composants que ' + c.nom.split(' ')[0] + ' embarque lui-même ]');
      sortie.push(lire(...a));
    }
    sortie.push('');
  });
  sortie.push(trait);
  sortie.push((COMPOSANTS.length + 1) + '. Modèles de langue de reconnaissance de texte');
  sortie.push(sous);
  sortie.push(MODELES);
  sortie.push('');
  sortie.push(trait);
  sortie.push((COMPOSANTS.length + 2) + '. Electron et Chromium');
  sortie.push(sous);
  sortie.push('L\'application fenêtrée (AktumPDF.exe, AktumPDF.app) est construite sur Electron (licence MIT,');
  sortie.push('https://github.com/electron/electron), qui embarque Chromium. Le texte complet des licences de');
  sortie.push('Chromium et de ses composants figure dans le fichier LICENSES.chromium.html, posé à côté de');
  sortie.push('l\'application dans le même dossier, et le texte de la licence d\'Electron dans le fichier LICENSE.');
  sortie.push('');
  sortie.push('Offre de source (LGPL) : Chromium inclut FFmpeg et d\'autres bibliothèques sous licence LGPL, utilisées');
  sortie.push('sous forme de bibliothèques partagées que l\'utilisateur peut remplacer. Leur code source est publié');
  sortie.push('par leurs auteurs (https://chromium.googlesource.com/chromium/third_party/ffmpeg et');
  sortie.push('https://ffmpeg.org/download.html). L\'éditeur d’Aktum PDF s\'engage en outre à en fournir une copie sur');
  sortie.push('demande écrite, pendant trois ans à compter de la livraison de la version concernée.');
  sortie.push('');
  sortie.push(trait);
  sortie.push('Les polices Arimo, Tinos et Cousine sont embarquées telles quelles, sans modification. Les');
  sortie.push('documents produits n\'en contiennent que les lettres utilisées (sous-ensemble), ce que la licence');
  sortie.push('OFL 1.1 permet ; le nom des polices reste celui de leurs auteurs.');
  sortie.push('');
  sortie.push('Ce que ce logiciel n\'embarque pas : aucun module de statistiques, aucun code d\'un service en ligne.');
  sortie.push('Aucun composant sous GPL ou AGPL.');
  sortie.push('');
  return sortie.join('\n');
}

module.exports = { mentions, COMPOSANTS };

if (require.main === module) {
  const sortie = path.resolve(process.argv[2] || path.join(__dirname, 'desktop', 'build', 'MENTIONS-TIERCES.txt'));
  fs.writeFileSync(sortie, mentions());
  console.log(sortie + ' — ' + Math.round(fs.statSync(sortie).size / 1024) + ' Ko');
}
