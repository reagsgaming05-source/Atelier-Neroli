/*
 * La mise à jour qui se propose toute seule.
 *
 * Sur un lecteur réseau, l'application est posée une fois et chacune l'ouvre
 * par un raccourci : mettre à jour, c'est remplacer un seul dossier. Encore
 * faut-il que quelqu'un y pense — sans quoi quatre personnes travaillent avec
 * trois versions différentes, et le défaut corrigé la semaine passée revient
 * chez celle qui n'a pas relancé le script.
 *
 * L'application regarde donc elle-même si un zip plus récent a été posé à côté
 * d'elle, et le dit au lancement. Rien ne part sur Internet et rien n'est
 * téléchargé : c'est vous qui apportez le zip.
 *
 * Ce fichier ne touche ni à Electron ni à l'écran. Il lit un zip, compare deux
 * dates, et regarde qui d'autre a l'application ouverte. Il s'éprouve donc sans
 * Windows et sans fenêtre — voir outils/test/maj.test.js.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

// La fiche que le dossier portable emporte à sa racine : la même que celle
// qu'affiche « À propos », mais lisible sans ouvrir l'application.
const FICHE = 'version.json';

// =============================================================================
//  Lire une fiche dans un zip, sans bibliothèque
// =============================================================================
// Le zip pèse cent vingt mégaoctets et la fiche quelques dizaines d'octets. On
// ne décompresse donc rien : un zip se lit par la fin, où un index dit où se
// trouve chaque fichier, et on ne va chercher que celui-là.
const FIN_INDEX = 0x06054b50;   // « PK\5\6 » — fin de l'index central
const ENTREE = 0x02014b50;      // « PK\1\2 » — une entrée de l'index
const ENTETE = 0x04034b50;      // « PK\3\4 » — l'en-tête qui précède les données

function morceau(fd, depuis, combien) {
  const b = Buffer.alloc(combien);
  const lus = fs.readSync(fd, b, 0, combien, depuis);
  return lus === combien ? b : b.subarray(0, lus);
}

const cEstLaFiche = (nom) => nom === FICHE || nom.endsWith('/' + FICHE);

function lireLesDonnees(fd, debutEntete, methode, compressee) {
  const e = morceau(fd, debutEntete, 30);
  if (e.length < 30 || e.readUInt32LE(0) !== ENTETE) return null;
  // Les longueurs de l'en-tête local peuvent différer de celles de l'index :
  // c'est lui qui dit où commencent vraiment les données.
  const debut = debutEntete + 30 + e.readUInt16LE(26) + e.readUInt16LE(28);
  // Une taille nulle dans l'index, c'est une archive écrite au fil de l'eau,
  // qui range les tailles après les données. On lit large et on laisse zlib
  // s'arrêter à la fin du flux.
  const brut = morceau(fd, debut, compressee > 0 ? compressee : 64 * 1024);
  if (methode === 0) return compressee > 0 ? brut : null;
  if (methode === 8) return zlib.inflateRawSync(brut);
  return null; // un autre mode de compression : on ne devine pas
}

/**
 * La fiche de version d'un zip, ou null s'il n'en porte pas de lisible.
 *
 * Un zip encore en cours de copie sur le partage — cent vingt mégaoctets, cela
 * prend un moment — n'a pas encore sa fin d'index : il ne se lit donc pas, et
 * ne se propose pas. C'est exactement ce qu'il faut.
 */
function ficheDuZip(chemin) {
  let fd = null;
  try {
    fd = fs.openSync(chemin, 'r');
    const taille = fs.fstatSync(fd).size;
    if (taille < 22) return null;
    // La fin de l'index est dans les derniers 64 Ko : c'est la taille maximale
    // du commentaire qui peut la suivre.
    const zone = Math.min(taille, 22 + 0xffff);
    const fin = morceau(fd, taille - zone, zone);
    let p = -1;
    for (let i = fin.length - 22; i >= 0; i--) { if (fin.readUInt32LE(i) === FIN_INDEX) { p = i; break; } }
    if (p < 0) return null;
    const nb = fin.readUInt16LE(p + 10);
    const tailleIndex = fin.readUInt32LE(p + 12);
    const debutIndex = fin.readUInt32LE(p + 16);
    // Zip64 : ces champs valent alors 0xFFFFFFFF et l'index est ailleurs. Nos
    // archives n'y arrivent pas — moins de 4 Go, moins de 65 535 fichiers — et
    // si cela changeait, mieux vaut ne rien proposer que lire de travers.
    if (nb === 0xffff || tailleIndex === 0xffffffff || debutIndex === 0xffffffff) return null;
    const index = morceau(fd, debutIndex, tailleIndex);
    let o = 0;
    for (let i = 0; i < nb && o + 46 <= index.length; i++) {
      if (index.readUInt32LE(o) !== ENTREE) return null;
      const methode = index.readUInt16LE(o + 10);
      const compressee = index.readUInt32LE(o + 20);
      const lgNom = index.readUInt16LE(o + 28);
      const lgExtra = index.readUInt16LE(o + 30);
      const lgComm = index.readUInt16LE(o + 32);
      const debutEntete = index.readUInt32LE(o + 42);
      const nom = index.toString('utf8', o + 46, o + 46 + lgNom);
      if (cEstLaFiche(nom)) {
        const octets = lireLesDonnees(fd, debutEntete, methode, compressee);
        return octets ? JSON.parse(octets.toString('utf8')) : null;
      }
      o += 46 + lgNom + lgExtra + lgComm;
    }
    return null;
  } catch (e) {
    return null; // zip abîmé, tronqué, illisible, ou disparu en cours de route
  } finally {
    if (fd !== null) { try { fs.closeSync(fd); } catch (e) { /* déjà fermé */ } }
  }
}

// =============================================================================
//  Comparer
// =============================================================================
const quand = (v) => {
  if (!v || typeof v.date !== 'string') return null;
  const t = Date.parse(v.date);
  return Number.isFinite(t) ? t : null;
};

/**
 * La version posée bat-elle celle qui tourne ? Sans date sûre des deux côtés,
 * la réponse est non : proposer une mise à jour qu'on ne sait pas dater, c'est
 * risquer de réinstaller une version plus ancienne que celle qui marche.
 */
function plusRecente(installee, posee) {
  const a = quand(installee), b = quand(posee);
  if (a === null || b === null) return false;
  // Le même commit reconstruit deux fois n'est pas une nouvelle version : sans
  // cela, le zip laissé à côté après une mise à jour se reproposerait sans fin.
  if (installee.commit && posee.commit && installee.commit === posee.commit) return false;
  return b > a;
}

// =============================================================================
//  Où le zip peut avoir été posé
// =============================================================================
// À côté de l'exécutable, ou dans un sous-dossier « maj » pour qui préfère ne
// pas encombrer. Le nom est libre du moment qu'il commence par BlonayPDF et
// finit par .zip : « BlonayPDF-windows (1).zip » compte aussi.
function zipsPoses(dossierApp) {
  const trouves = [];
  [dossierApp, path.join(dossierApp, 'maj')].forEach((d) => {
    let noms = [];
    try { noms = fs.readdirSync(d); } catch (e) { return; } // dossier absent
    noms.filter((n) => /^blonaypdf.*\.zip$/i.test(n)).sort()
      .forEach((n) => trouves.push(path.join(d, n)));
  });
  return trouves;
}

/** La meilleure version posée à côté, si elle bat celle qui tourne. */
function miseAJourPosee(dossierApp, installee) {
  let mieux = null;
  zipsPoses(dossierApp).forEach((zip) => {
    const version = ficheDuZip(zip);
    if (!plusRecente(installee, version)) return;
    if (!mieux || plusRecente(mieux.version, version)) mieux = { zip, version };
  });
  return mieux;
}

// =============================================================================
//  Qui d'autre a l'application ouverte
// =============================================================================
// Remplacer les fichiers pendant qu'une collègue travaille dedans, c'est une
// copie à moitié faite : Windows verrouille un exécutable en cours, et celui-ci
// est ouvert depuis le partage, pas depuis son poste — le script de mise à jour
// ne peut donc pas le voir avec « tasklist ». Chaque instance laisse un jeton
// daté dans « data », que la mise à jour consulte avant de toucher à quoi que
// ce soit.
//
// Un fichier, et non un dossier : les dossiers de « data » sont les comptes, et
// une version plus ancienne de l'application prendrait un dossier « ouvert »
// pour une personne de plus dans la liste.
const JETON = '.ouvert-';
const FRAICHEUR = 2 * 60 * 1000; // au-delà, le poste a été éteint sans refermer

const nomDuJeton = (poste, pid) =>
  JETON + crypto.createHash('sha1').update(poste + '|' + pid).digest('hex').slice(0, 12) + '.json';

/** Pose ou rafraîchit le jeton de ce poste. Rend son chemin, ou null. */
function poserLeJeton(dossierData, poste, pid, maintenant) {
  const chemin = path.join(dossierData, nomDuJeton(poste, pid));
  try {
    fs.mkdirSync(dossierData, { recursive: true });
    fs.writeFileSync(chemin, JSON.stringify({ poste, pid, vu: new Date(maintenant).toISOString() }));
    return chemin;
  } catch (e) { return null; } // partage en lecture seule : tant pis, on n'en saura rien
}

// Une application tuée net — le poste s'éteint, Windows ferme tout — laisse son
// jeton derrière elle. Il cesse de compter au bout de deux minutes, mais il
// resterait là pour toujours : on balaie les vieux en posant le sien.
function nettoyerLesJetons(dossierData, maintenant, age) {
  const limite = age || 24 * 3600 * 1000;
  let noms = [];
  try { noms = fs.readdirSync(dossierData); } catch (e) { return 0; }
  let partis = 0;
  noms.filter((n) => n.startsWith(JETON)).forEach((n) => {
    const chemin = path.join(dossierData, n);
    try {
      const j = JSON.parse(fs.readFileSync(chemin, 'utf8'));
      const vu = Date.parse(j.vu);
      if (Number.isFinite(vu) && maintenant - vu < limite) return;
    } catch (e) { /* illisible : il ne dit plus rien, autant le retirer */ }
    try { fs.unlinkSync(chemin); partis++; } catch (e) { /* un autre poste l'a repris */ }
  });
  return partis;
}

function retirerLeJeton(chemin) {
  try { if (chemin) fs.unlinkSync(chemin); } catch (e) { /* déjà parti */ }
}

/** Les autres postes qui ont l'application ouverte, le nôtre exclu. */
function autresPostes(dossierData, monJeton, maintenant) {
  let noms = [];
  try { noms = fs.readdirSync(dossierData); } catch (e) { return []; }
  const vus = new Map();
  noms.filter((n) => n.startsWith(JETON)).forEach((n) => {
    const chemin = path.join(dossierData, n);
    if (monJeton && path.resolve(chemin) === path.resolve(monJeton)) return;
    try {
      const j = JSON.parse(fs.readFileSync(chemin, 'utf8'));
      const vu = Date.parse(j.vu);
      if (!Number.isFinite(vu) || maintenant - vu > FRAICHEUR) return; // jeton oublié
      const poste = String(j.poste || 'un autre poste');
      if (!vus.has(poste.toLowerCase())) vus.set(poste.toLowerCase(), poste);
    } catch (e) { /* jeton illisible : on ne bloque pas pour autant */ }
  });
  return Array.from(vus.values()).sort((a, b) => a.localeCompare(b, 'fr'));
}

module.exports = {
  FICHE, FRAICHEUR,
  ficheDuZip, plusRecente, zipsPoses, miseAJourPosee,
  nomDuJeton, poserLeJeton, retirerLeJeton, autresPostes, nettoyerLesJetons,
};
