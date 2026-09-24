'use strict';
/**
 * Le lanceur des postes installés depuis le serveur (%LOCALAPPDATA%\ComptaBlonay-lanceur.cmd)
 * se tient lui-même à jour avec la copie reçue du serveur. Mais les postes installés avant le
 * sous-dossier « Installation sur plusieurs PC » ont un lanceur qui cherche cette copie à côté
 * du programme, sous le nom « Compta Blonay.cmd » : elle n'y est plus, et il ne se mettrait plus
 * jamais à jour. L'application, elle, est bien mise à jour par ce vieux lanceur : c'est donc
 * elle qui le remplace, une fois, par celui du sous-dossier.
 *
 * Rien ne se passe ailleurs que dans une copie installée (%LOCALAPPDATA%\ComptaBlonay) : une
 * version portable ouverte depuis une clé USB n'a pas de lanceur à tenir à jour.
 */
const fs = require('fs');
const path = require('path');

const SOUS_DOSSIER = 'Installation sur plusieurs PC';

const memeDossier = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

/**
 * Remplace le lanceur du poste par celui du programme s'ils diffèrent.
 * @returns {'remplace'|'a-jour'|'sans-objet'} ce qui a été fait
 */
function mettreAJourLanceur({ localAppData, dossierProgramme }) {
  if (!localAppData || !dossierProgramme) return 'sans-objet';
  const ici = path.join(localAppData, 'ComptaBlonay');
  if (!memeDossier(dossierProgramme, ici)) return 'sans-objet';
  const lanceur = path.join(localAppData, 'ComptaBlonay-lanceur.cmd');
  const neuf = path.join(ici, SOUS_DOSSIER, 'lanceur.cmd');
  // pas de lanceur : ce poste n'a pas été installé par « Installer sur ce PC » ; pas de copie
  // neuve : ce n'est pas à l'application d'en inventer une
  if (!fs.existsSync(lanceur) || !fs.existsSync(neuf)) return 'sans-objet';
  const contenu = fs.readFileSync(neuf);
  if (contenu.equals(fs.readFileSync(lanceur))) return 'a-jour';
  // écrit à côté puis renommé : un lanceur à moitié écrit ne démarrerait plus rien
  const provisoire = `${lanceur}.nouveau`;
  fs.writeFileSync(provisoire, contenu);
  fs.renameSync(provisoire, lanceur);
  return 'remplace';
}

module.exports = { mettreAJourLanceur, SOUS_DOSSIER };
