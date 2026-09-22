// Où ranger les données de la personne qui ouvre l'application : ses tampons,
// sa signature mémorisée, ses fichiers récents, et les copies de travail mises
// de côté pour la récupération après un arrêt brutal.
//
// À côté de l'exécutable, c'est la version portable : l'application et ses
// réglages voyagent ensemble sur une clé USB, et rien ne reste sur le poste.
// C'est le comportement par défaut, et il est juste tant qu'une seule personne
// ouvre ce dossier.
//
// Posée sur un lecteur réseau, la même application est ouverte par plusieurs
// personnes — un secrétariat, par exemple. Le dossier « data » leur serait
// commun : la signature mémorisée par l'une pourrait être reposée par une
// autre sur n'importe quel PDF, et les copies de récupération, qui contiennent
// les documents ouverts, seraient lisibles par tout le service. Chacune range
// donc ses données dans son profil Windows, que le système protège déjà des
// autres comptes.
//
// Deux façons d'y arriver, parce qu'un partage ne se reconnaît pas toujours :
//  - un chemin UNC (\\serveur\partage\…) est repéré tout seul ;
//  - un fichier « donnees-par-utilisateur.txt » posé à côté de l'exécutable
//    force le même choix, pour les partages montés sur une lettre de lecteur
//    (S:\, Z:\…) que rien ne distingue d'un disque local.
//
// La décision est ici, séparée de ce qui touche au disque, pour qu'elle
// s'éprouve sans Windows ni Electron.

const MARQUEUR = 'donnees-par-utilisateur.txt';
// Le fichier qui ouvre les comptes : une ligne par personne, et l'application
// demande au premier lancement qui l'ouvre.
const COMPTES = 'comptes.txt';

// Un nom saisi devient un nom de dossier. Windows refuse \ / : * ? " < > | et
// quelques noms reserves (CON, PRN, AUX, NUL, COM1...), et se moque des
// espaces et des points en fin de nom.
const RESERVES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
function nomDeDossier(nom) {
  const propre = String(nom == null ? '' : nom)
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/[\x00-\x1f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 48)
    .trim();
  if (!propre || RESERVES.test(propre)) return null;
  return propre;
}

// comptes.txt est écrit à la main, souvent au Bloc-notes, et les noms d'ici
// portent des accents. Selon la version de Windows et le choix fait en
// enregistrant, le fichier arrive en UTF-8, avec ou sans marque d'ordre, ou
// encore dans l'ancien codage de Windows. Le lire en UTF-8 sans regarder
// donnerait « Sophie M�ller » — et un dossier à ce nom-là.
function lireTexte(octets) {
  const b = Buffer.isBuffer(octets) ? octets : Buffer.from(String(octets || ''), 'utf8');
  if (b.length >= 3 && b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) return b.slice(3).toString('utf8');
  if (b.length >= 2 && b[0] === 0xFF && b[1] === 0xFE) return b.slice(2).toString('utf16le');
  if (b.length >= 2 && b[0] === 0xFE && b[1] === 0xFF) {
    const inverse = Buffer.from(b.slice(2));
    for (let i = 0; i + 1 < inverse.length; i += 2) { const t = inverse[i]; inverse[i] = inverse[i + 1]; inverse[i + 1] = t; }
    return inverse.toString('utf16le');
  }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b); }
  catch (e) { return b.toString('latin1'); } // ancien codage de Windows
}

// Les noms proposés au choix : ceux que l'administrateur a écrits dans
// comptes.txt, et ceux qui ont déjà un dossier dans data/. Les lignes vides et
// celles qui commencent par # sont des commentaires.
function listerComptes(lignesDuFichier, dossiersExistants) {
  const vus = new Map();
  const ajouter = (brut) => {
    const n = nomDeDossier(brut);
    if (n && !vus.has(n.toLowerCase())) vus.set(n.toLowerCase(), n);
  };
  lireTexte(lignesDuFichier).split(/\r?\n/).forEach((l) => {
    const t = l.trim();
    if (t && !t.startsWith('#')) ajouter(t);
  });
  (dossiersExistants || []).forEach(ajouter);
  return Array.from(vus.values()).sort((a, b) => a.localeCompare(b, 'fr'));
}

// Un chemin UNC désigne un partage : \\serveur\partage\dossier.
// Deux pièges, et ils se ressemblent : « \\?\C:\… » est la forme longue d'un
// chemin local, tandis que « \\?\UNC\serveur\partage » est bien un partage.
function cheminReseau(chemin) {
  let p = String(chemin || '').replace(/\//g, '\\');
  if (!p.startsWith('\\\\')) return false;
  const longueur = /^\\\\[?.]\\/.test(p);
  if (longueur) {
    const reste = p.slice(4);
    if (/^UNC\\/i.test(reste)) return true;
    return false; // \\?\C:\... : un disque local, écrit long
  }
  // \\serveur\partage : il faut au moins un nom de serveur.
  return /^\\\\[^\\]/.test(p);
}

// Rend l'endroit choisi et la raison, pour que l'application puisse le dire à
// qui se demande où sont passés ses tampons.
//   'cote'   : le sous-dossier data, à côté de l'exécutable
//   'profil' : l'emplacement par défaut de Windows, propre à chaque compte
// `sonde` porte les deux questions qui demandent le disque ; elles ne sont
// posées que si la précédente n'a pas déjà tranché — inutile de créer un
// dossier « data » sur un partage qu'on a justement décidé d'éviter.
function ouRanger(dossierExe, sonde) {
  // Les comptes passent avant tout le reste : c'est un choix explicite, pose
  // par la personne qui installe, et il vaut aussi sur un partage.
  if (sonde.comptesOuverts && sonde.comptesOuverts()) return { ou: 'comptes', pourquoi: 'comptes' };
  if (cheminReseau(dossierExe)) return { ou: 'profil', pourquoi: 'reseau' };
  if (sonde.marqueurPose()) return { ou: 'profil', pourquoi: 'marqueur' };
  if (!sonde.dossierInscriptible()) return { ou: 'profil', pourquoi: 'lecture-seule' };
  return { ou: 'cote', pourquoi: 'portable' };
}

// Ce qu'on affiche dans « À propos », sous le chemin.
const POURQUOI = {
  comptes: 'Chaque personne a son dossier dans « data » : ses tampons, sa signature et ses récents ne sont qu\u2019à elle.',
  portable: 'Version portable : vos réglages suivent l\u2019application.',
  reseau: 'L\u2019application est sur un lecteur réseau : chacun garde ses propres tampons, signatures et récents.',
  marqueur: 'Réglé par « donnees-par-utilisateur.txt » : chacun garde ses propres tampons, signatures et récents.',
  'lecture-seule': 'Le dossier de l\u2019application est en lecture seule : vos données sont dans votre profil Windows.',
};

module.exports = { MARQUEUR, COMPTES, cheminReseau, ouRanger, nomDeDossier, listerComptes, lireTexte, POURQUOI };
