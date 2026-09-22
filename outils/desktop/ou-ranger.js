// Où ranger les données de la personne qui ouvre l'application : ses tampons,
// sa signature mémorisée, ses fichiers récents, et les copies de travail mises
// de côté pour la récupération après un arrêt brutal.
//
// La règle est simple : on demande qui ouvre l'application, et chacune range
// ses affaires dans son propre dossier. C'est la première chose que l'on voit
// au lancement, avant toute fenêtre de travail.
//
// Ça ne l'était pas : les comptes ne s'ouvraient que sur un lecteur réseau
// reconnu comme tel, ou si une liste avait été posée à la main à côté de
// l'exécutable. Une application décompressée sur le Bureau pour l'essayer, ou
// posée sur un partage monté sur une lettre que « net use » ne reconnaissait
// pas, n'a jamais rien demandé à personne — et le dossier « data » était alors
// commun : la signature mémorisée par l'une pouvait être reposée par une autre
// sur n'importe quel PDF, et les copies de récupération, qui contiennent les
// documents ouverts, étaient lisibles par tout le service. Reconnaître le
// partage était la mauvaise question ; la bonne est « qui êtes-vous ? », et
// elle se pose partout.
//
// Deux exceptions, et elles se justifient toutes les deux :
//  - le dossier de l'application est en lecture seule : aucune fiche de compte
//    ne peut y être écrite, chacun retombe sur son profil Windows plutôt que de
//    rester devant une connexion impossible ;
//  - un fichier « donnees-par-utilisateur.txt » posé à côté de l'exécutable :
//    quelqu'un a décidé qu'il n'y aurait pas de comptes ici et que les données
//    iraient dans le profil Windows de chacun, que le système protège déjà.
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
//   'comptes' : un dossier par personne dans data/, ouvert par un mot de passe
//   'profil'  : l'emplacement par défaut de Windows, propre à chaque compte
// `sonde` porte les questions qui demandent le disque ; elles ne sont posées
// que si la précédente n'a pas déjà tranché. Les deux dernières ne changent
// plus la décision, seulement la phrase montrée dans « À propos ».
function ouRanger(dossierExe, sonde) {
  // Le choix contraire, s'il a ete pose, l'emporte sur tout : quelqu'un a
  // decide que les donnees vivraient dans le profil Windows de chacun, et
  // qu'on n'ouvrirait pas de comptes. C'est la seule facon de ne pas voir la
  // fenetre de connexion.
  if (sonde.marqueurPose()) return { ou: 'profil', pourquoi: 'marqueur' };
  // Sans pouvoir ecrire a cote de l'executable, il n'y a ni fiche de compte a
  // poser ni dossier a creer : chacun retombe sur son profil Windows, et
  // personne n'est bloque devant une connexion impossible.
  if (!sonde.dossierInscriptible()) return { ou: 'profil', pourquoi: 'lecture-seule' };
  // Partout ailleurs, on demande qui ouvre l'application. Une liste de comptes
  // posee a cote de l'executable, ou un lecteur reseau, ne changent plus la
  // decision : seulement ce qu'on en dit dans « A propos ».
  if (sonde.comptesOuverts && sonde.comptesOuverts()) return { ou: 'comptes', pourquoi: 'comptes' };
  if (sonde.surLeReseau && sonde.surLeReseau()) return { ou: 'comptes', pourquoi: 'reseau' };
  return { ou: 'comptes', pourquoi: 'poste' };
}

// Ce qu'on affiche dans « À propos », sous le chemin.
const POURQUOI = {
  comptes: 'Chaque personne a son dossier dans « data » : ses tampons, sa signature et ses récents ne sont qu\u2019à elle.',
  poste: 'Vous êtes connectée : votre dossier dans « data » porte vos tampons, votre signature et vos récents, et personne d\u2019autre ne l\u2019ouvre depuis l\u2019application.',
  reseau: 'L\u2019application est sur un lecteur réseau : chaque personne a son dossier dans « data », avec ses tampons, sa signature et ses récents.',
  portable: 'Version portable : vos réglages suivent l\u2019application.',
  marqueur: 'Réglé par « donnees-par-utilisateur.txt » : chacun garde ses propres tampons, signatures et récents.',
  'lecture-seule': 'Le dossier de l\u2019application est en lecture seule : vos données sont dans votre profil Windows.',
};

module.exports = { MARQUEUR, COMPTES, cheminReseau, ouRanger, nomDeDossier, listerComptes, lireTexte, POURQUOI };
