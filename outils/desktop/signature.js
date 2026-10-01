/*
 * Ce qui prouve qu'un fichier vient de l'éditeur : une signature Ed25519, vérifiée
 * ici, hors ligne, avec une clé publique que l'application porte avec elle.
 *
 * L'application est posée sur un partage où tout le secrétariat écrit. Sans
 * preuve d'origine, quiconque y dépose un « AktumPDF-windows.zip » obtient que
 * la prochaine personne qui ouvre l'application l'exécute — avec ses droits, sur
 * les décisions du conseil et les dossiers du personnel. Il n'y a ni réseau ni
 * serveur ici : seulement une clé qui ne signe que chez l'éditeur, et une qui
 * vérifie partout.
 *
 * Deux sortes de pièces sont signées, avec deux clés différentes :
 *  - « maj » : l'archive de mise à jour, par son empreinte SHA-256 ;
 *  - « licence » : le fichier de licence d'un client.
 * Chaque sorte peut porter plusieurs clés publiques : la courante, et la
 * suivante, posée d'avance. Perdre une clé privée ne doit pas rendre tout le
 * parc installé sourd aux versions suivantes.
 *
 * Ce module n'a pas d'Electron ni d'écran : il s'éprouve seul (test/signature.test.js).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// L'enveloppe DER d'une clé publique Ed25519 : 12 octets fixes devant les 32 de la clé.
const PREFIXE_SPKI = Buffer.from('302a300506032b6570032100', 'hex');
const publique = (b64) => crypto.createPublicKey({ key: Buffer.concat([PREFIXE_SPKI, Buffer.from(b64, 'base64')]), format: 'der', type: 'spki' });
const brute = (cleObjet) => cleObjet.export({ format: 'der', type: 'spki' }).subarray(PREFIXE_SPKI.length).toString('base64');

// La signature porte sur une sérialisation canonique : clés triées, sans espaces,
// champ `sig` retiré. Deux écritures du même objet — ou un fichier réindenté par
// un éditeur de texte — doivent donner les mêmes octets, sinon une pièce valide
// serait rejetée. Les objets imbriqués sont refusés plutôt que canonisés à demi.
function canonique(objet) {
  const o = Object.assign({}, objet);
  delete o.sig;
  const cles = Object.keys(o).sort();
  cles.forEach((k) => {
    const v = o[k];
    if (v !== null && typeof v === 'object') throw new Error('pièce signée : « ' + k + ' » n’est pas une valeur simple');
  });
  return JSON.stringify(o, cles);
}

function signer(corps, clePriveePem) {
  const sig = crypto.sign(null, Buffer.from(canonique(corps), 'utf8'), crypto.createPrivateKey(clePriveePem));
  return Object.assign({}, corps, { sig: sig.toString('base64') });
}

/**
 * La pièce est-elle signée par l'une de ces clés ? Rend { ok, cle } ou { ok:false, raison }.
 * `cles` : [{ id, cle }] — `cle` en base64, 32 octets. La pièce peut dire laquelle
 * (champ `cle`) ; sinon on les essaie toutes.
 */
function verifier(piece, cles) {
  if (!piece || typeof piece !== 'object') return { ok: false, raison: 'pièce illisible' };
  if (typeof piece.sig !== 'string' || !piece.sig) return { ok: false, raison: 'sans signature' };
  if (!Array.isArray(cles) || !cles.length) return { ok: false, raison: 'aucune clé d’éditeur n’est embarquée dans cette application' };
  let message;
  try { message = Buffer.from(canonique(piece), 'utf8'); } catch (e) { return { ok: false, raison: e.message }; }
  const sig = Buffer.from(piece.sig, 'base64');
  const candidates = piece.cle ? cles.filter((c) => c.id === piece.cle) : cles;
  if (!candidates.length) return { ok: false, raison: 'signée par une clé que cette application ne connaît pas (' + piece.cle + ')' };
  for (const c of candidates) {
    try { if (crypto.verify(null, message, publique(c.cle), sig)) return { ok: true, cle: c.id }; } catch (e) { /* clé illisible : suivante */ }
  }
  return { ok: false, raison: 'signature invalide' };
}

// Les clés publiques de cette application : un petit fichier à côté du code.
function lireCles(dossier) {
  const essai = process.env.AKTUM_CLES_PUBLIQUES_ESSAI; // les tests posent leurs propres clés
  try {
    const j = JSON.parse(essai || fs.readFileSync(path.join(dossier || __dirname, 'cles-publiques.json'), 'utf8'));
    return { maj: Array.isArray(j.maj) ? j.maj : [], licence: Array.isArray(j.licence) ? j.licence : [] };
  } catch (e) { return { maj: [], licence: [] }; }
}

// SHA-256 d'un fichier, lu par blocs : le zip pèse cent vingt mégaoctets.
function empreinteFichier(chemin) {
  const h = crypto.createHash('sha256');
  const fd = fs.openSync(chemin, 'r');
  try {
    const bloc = Buffer.alloc(1 << 20);
    for (;;) {
      const n = fs.readSync(fd, bloc, 0, bloc.length, null);
      if (!n) break;
      h.update(bloc.subarray(0, n));
    }
  } finally { fs.closeSync(fd); }
  return h.digest('hex');
}

const SIGNATURE_DU_ZIP = '.signature.json';
const PLATEFORMES = { win32: 'windows', darwin: 'mac' };

// SHA-256 sans bloquer l'application : le zip est lu depuis un partage, et sa
// vérification ne doit pas figer la fenêtre pendant plusieurs secondes.
function empreinteFichierAsync(chemin) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    const flux = fs.createReadStream(chemin, { highWaterMark: 1 << 20 });
    flux.on('data', (d) => h.update(d));
    flux.on('error', reject);
    flux.on('end', () => resolve(h.digest('hex')));
  });
}

/**
 * La pièce signée qui accompagne une archive de mise à jour, lue et vérifiée
 * — tout sauf le contenu du zip lui-même, qui est plus lourd à vérifier.
 * La signature est dans un fichier posé à côté (« <zip>.signature.json ») :
 * elle porte l'empreinte du zip, sa taille, la version, la plateforme et le
 * canal. Tout doit concorder — la pièce signée, le fichier tel qu'il est, la machine.
 */
function pieceDuZip(zip, opts) {
  const o = opts || {};
  const cles = o.cles || lireCles().maj;
  let piece;
  try { piece = JSON.parse(fs.readFileSync(zip + SIGNATURE_DU_ZIP, 'utf8')); }
  catch (e) { return { ok: false, raison: 'pas de fichier de signature à côté de l\u2019archive (' + path.basename(zip) + SIGNATURE_DU_ZIP + ')' }; }
  if (piece.v !== 1 || piece.objet !== 'maj') return { ok: false, raison: 'ce n\u2019est pas une signature d\u2019archive de mise à jour' };
  const v = verifier(piece, cles);
  if (!v.ok) return { ok: false, raison: v.raison };
  const plateforme = o.plateforme || PLATEFORMES[process.platform];
  if (plateforme && piece.plateforme !== plateforme) return { ok: false, raison: 'cette archive est pour ' + piece.plateforme + ', ce poste est sous ' + plateforme };
  let taille;
  try { taille = fs.statSync(zip).size; } catch (e) { return { ok: false, raison: 'archive illisible' }; }
  if (taille !== Number(piece.taille)) return { ok: false, raison: 'la taille de l\u2019archive ne correspond pas à celle qui a été signée (copie interrompue ?)' };
  return { ok: true, piece };
}
const CONTENU_MODIFIE = { ok: false, raison: 'le contenu de l\u2019archive a été modifié depuis sa signature' };
function verifierZip(zip, opts) {
  const p = pieceDuZip(zip, opts);
  if (!p.ok) return p;
  return empreinteFichier(zip) === p.piece.sha256 ? p : CONTENU_MODIFIE;
}
async function verifierZipAsync(zip, opts) {
  const p = pieceDuZip(zip, opts);
  if (!p.ok) return p;
  let e;
  try { e = await empreinteFichierAsync(zip); } catch (err) { return { ok: false, raison: 'archive illisible' }; }
  return e === p.piece.sha256 ? p : CONTENU_MODIFIE;
}

module.exports = { canonique, signer, verifier, lireCles, empreinteFichier, empreinteFichierAsync, pieceDuZip, verifierZip, verifierZipAsync, publique, brute, SIGNATURE_DU_ZIP, PLATEFORMES, PREFIXE_SPKI };
