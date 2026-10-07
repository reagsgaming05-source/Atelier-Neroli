/*
 * La nomenclature logicielle (SBOM) d'une construction, au format CycloneDX 1.5 (JSON) : la liste, vérifiable, de ce que l'archive livrée contient
 * du travail d'autrui — nom, version, licence RETENUE, empreinte SHA-512 de l'archive npm relue.
 *
 *   node editeur/sbom.js <fichier-de-sortie>
 *
 * Elle est jointe à chaque publication. Une direction informatique qui doit inventorier ce qu'elle installe (et savoir, le jour où une faille est
 * publiée, si elle est concernée) la lit sans avoir à ouvrir l'application.
 *
 * Ce qu'elle dit vient des fichiers qui font foi, pas d'une copie : la liste et les empreintes de recuperer-libs.js, la version d'Electron de
 * desktop/package.json, la version du produit de package.json. La LICENCE est celle sous laquelle le produit utilise le composant — pas celle que
 * déclare npm : JSZip est offert en MIT ou GPLv3, node-forge en BSD ou GPLv2 ; la seconde n'est jamais retenue (voir mentions-tierces.js).
 * La date est celle du commit, pas de l'horloge : la même construction donne le même fichier.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RACINE = path.join(__dirname, '..');

// La licence retenue, par paquet npm : un identifiant SPDX (ou une expression). « portee » : « required » = dans la page ou l'application ;
// « excluded » = sert à la construction ou aux tests, n'est pas livré.
const LICENCES = {
  'pdfjs-dist': { spdx: 'Apache-2.0', role: 'lecture et affichage des PDF' },
  '@cantoo/pdf-lib': { spdx: 'MIT', role: 'création et modification des PDF' },
  'jszip': { spdx: 'MIT', declare: '(MIT OR GPL-3.0-or-later)', role: 'archives zip' },
  'tesseract.js': { spdx: 'Apache-2.0', role: 'reconnaissance de texte (OCR)' },
  'tesseract.js-core': { spdx: 'Apache-2.0', role: 'moteur OCR en WebAssembly' },
  '@tesseract.js-data/fra': { spdx: 'Apache-2.0', role: 'modèle de langue français (tessdata_best)' },
  '@tesseract.js-data/deu': { spdx: 'Apache-2.0', role: 'modèle de langue allemand (tessdata_best)' },
  '@cantoo/fontkit': { spdx: 'MIT', role: 'incorporation de polices dans les PDF produits' },
  'node-forge': { spdx: 'BSD-3-Clause', declare: '(BSD-3-Clause OR GPL-2.0-only)', role: 'certificats PKCS#12 et signature numérique' },
  'utif': { spdx: 'MIT', role: 'lecture des images TIFF' },
  'pako': { spdx: '(MIT AND Zlib)', role: 'décompression Deflate des TIFF' },
  'acorn': { spdx: 'MIT', role: 'outil de traduction (lit le code source) : non livré', portee: 'excluded' },
  '@fontsource-variable/geist': { spdx: 'OFL-1.1', role: 'police de l\'interface' },
  '@fontsource-variable/geist-mono': { spdx: 'OFL-1.1', role: 'police de l\'interface, chasse fixe' },
  '@fontsource/instrument-serif': { spdx: 'OFL-1.1', role: 'police de titrage de l\'interface' },
  '@expo-google-fonts/arimo': { spdx: 'OFL-1.1', role: 'police incorporée dans les PDF produits (largeurs de Helvetica)' },
  '@expo-google-fonts/tinos': { spdx: 'OFL-1.1', role: 'police incorporée dans les PDF produits (largeurs de Times)' },
  '@expo-google-fonts/cousine': { spdx: 'OFL-1.1', role: 'police incorporée dans les PDF produits (largeurs de Courier)' },
};

// Les paquets de la page et leurs empreintes, lus dans le texte de recuperer-libs.js (le script, lui, récupère depuis le réseau dès qu'on le charge).
function paquetsEmbarques() {
  const src = fs.readFileSync(path.join(RACINE, 'recuperer-libs.js'), 'utf8');
  const debut = src.indexOf('const PAQUETS = [');
  const bloc = src.slice(debut, src.indexOf('];', debut));
  const paquets = [...bloc.matchAll(/\['([^']+)', '([^']+)'\]/g)].map((m) => ({ nom: m[1], version: m[2] }));
  const empreintes = Object.fromEntries([...src.matchAll(/^\s*"([^"]+@[^"]+)": "sha512-([A-Za-z0-9+/=]+)"/gm)].map((m) => [m[1], m[2]]));
  return paquets.map((p) => ({ ...p, sha512: Buffer.from(empreintes[p.nom + '@' + p.version] || '', 'base64').toString('hex') }));
}

const purl = (nom, version) => 'pkg:npm/' + nom.replace(/^@/, '%40') + '@' + version;

function dateDuCommit() {
  const e = process.env.SOURCE_DATE_EPOCH;
  if (/^\d+$/.test(e || '')) return new Date(Number(e) * 1000);
  try {
    const t = execSync('git log -1 --format=%ct', { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (/^\d+$/.test(t)) return new Date(Number(t) * 1000);
  } catch (e2) { /* pas de dépôt */ }
  return new Date();
}
function commitLong() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try { return execSync('git rev-parse HEAD', { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (e) { return ''; }
}

function licenceCdx(l) {
  // Une expression (« A AND B ») ne s'écrit pas comme un identifiant simple.
  return /[()\s]/.test(l.spdx) ? { expression: l.spdx } : { license: { id: l.spdx, acknowledgement: 'concluded' } };
}

function construire() {
  const produit = require('../package.json');
  const electron = (require('../desktop/package.json').devDependencies || {}).electron;
  const commit = commitLong();
  const horodatage = dateDuCommit().toISOString();
  const composants = paquetsEmbarques().map((p) => {
    const l = LICENCES[p.nom];
    if (!l) throw new Error('SBOM : la licence retenue de ' + p.nom + ' n\'est pas dite dans editeur/sbom.js');
    const c = {
      type: /^@(expo-google-fonts|fontsource)/.test(p.nom) ? 'data' : 'library',
      'bom-ref': purl(p.nom, p.version), name: p.nom, version: p.version, purl: purl(p.nom, p.version),
      scope: l.portee || 'required', description: l.role, licenses: [licenceCdx(l)],
      hashes: p.sha512 ? [{ alg: 'SHA-512', content: p.sha512 }] : [],
    };
    if (l.declare) c.properties = [{ name: 'aktum:licence-declaree-par-npm', value: l.declare }];
    return c;
  });
  if (electron) {
    composants.push({
      type: 'framework', 'bom-ref': purl('electron', electron), name: 'electron', version: electron, purl: purl('electron', electron), scope: 'required',
      description: 'moteur de la version de bureau (inclut Chromium et Node.js ; leurs licences sont dans LICENSES.chromium.html, livré dans le dossier)',
      licenses: [{ license: { id: 'MIT', acknowledgement: 'concluded' } }],
    });
  }
  composants.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  // Le numéro de série dérive du contenu : le même commit redonne le même fichier.
  const graine = JSON.stringify([produit.version, commit, composants.map((c) => c['bom-ref'])]);
  const h = crypto.createHash('sha256').update(graine).digest('hex');
  const uuid = [h.slice(0, 8), h.slice(8, 12), '4' + h.slice(13, 16), '8' + h.slice(17, 20), h.slice(20, 32)].join('-');
  return {
    bomFormat: 'CycloneDX', specVersion: '1.5', serialNumber: 'urn:uuid:' + uuid, version: 1,
    metadata: {
      timestamp: horodatage,
      component: {
        type: 'application', 'bom-ref': 'aktum-pdf@' + produit.version, name: 'Aktum PDF', version: produit.version,
        description: 'Outil PDF local : aucune donnée ne quitte le poste', licenses: [{ license: { name: 'Licence propriétaire (voir LICENCE)' } }],
        ...(commit ? { properties: [{ name: 'aktum:commit', value: commit }] } : {}),
      },
    },
    components: composants,
  };
}

if (require.main === module) {
  const sortie = process.argv[2];
  if (!sortie) { console.error('usage : node editeur/sbom.js <fichier-de-sortie>'); process.exit(1); }
  const bom = construire();
  fs.mkdirSync(path.dirname(path.resolve(sortie)), { recursive: true });
  fs.writeFileSync(sortie, JSON.stringify(bom, null, 2) + '\n');
  console.log('SBOM CycloneDX : ' + bom.components.length + ' composants → ' + sortie);
}

module.exports = { construire, paquetsEmbarques, LICENCES, purl };
