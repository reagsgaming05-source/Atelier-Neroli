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
  if (cheminReseau(dossierExe)) return { ou: 'profil', pourquoi: 'reseau' };
  if (sonde.marqueurPose()) return { ou: 'profil', pourquoi: 'marqueur' };
  if (!sonde.dossierInscriptible()) return { ou: 'profil', pourquoi: 'lecture-seule' };
  return { ou: 'cote', pourquoi: 'portable' };
}

// Ce qu'on affiche dans « À propos », sous le chemin.
const POURQUOI = {
  portable: 'Version portable : vos réglages suivent l\u2019application.',
  reseau: 'L\u2019application est sur un lecteur réseau : chacun garde ses propres tampons, signatures et récents.',
  marqueur: 'Réglé par « donnees-par-utilisateur.txt » : chacun garde ses propres tampons, signatures et récents.',
  'lecture-seule': 'Le dossier de l\u2019application est en lecture seule : vos données sont dans votre profil Windows.',
};

module.exports = { MARQUEUR, cheminReseau, ouRanger, POURQUOI };
