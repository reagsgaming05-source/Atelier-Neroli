/*
 * Les réglages de l'administrateur : un fichier « reglages.json » posé à côté de l'exécutable, que l'informaticien écrit une fois et que tous les postes
 * qui ouvrent ce dossier suivent. Il n'est jamais écrit par l'application, et chaque réglage a sa valeur d'usine : sans le fichier, rien ne change.
 *
 *   {
 *     "miseAJour": false,               // plus de mise à jour proposée à l'ouverture ni par le menu : le service informatique la pose lui-même
 *     "memoriserSignature": false,      // aucune signature manuscrite n'est gardée sur le poste, la case disparaît
 *     "motDePasseMin": 12,              // longueur minimale d'un mot de passe de compte (8 à 64)
 *     "aide": "Service informatique : poste 214, informatique@commune.example"   // une ligne, montrée dans « À propos » et en cas d'erreur
 *   }
 *
 * Le rangement des données (comptes ou profil de chacun) reste réglé par les deux fichiers « comptes.txt » et « donnees-par-utilisateur.txt » (ou-ranger.js).
 *
 * Un fichier illisible ou un réglage qui n'a pas de sens ne bloque rien : la valeur d'usine reste, et « À propos » dit ce qui n'a pas été compris.
 * Ce module est sans Electron : il s'éprouve avec un dossier temporaire (test/reglages.test.js).
 */
const fs = require('fs');
const path = require('path');

const NOMS = ['reglages.json', 'reglages.json.txt'];   // l'Explorateur masque les extensions : « reglages.json » créé au Bloc-notes devient « reglages.json.txt »
const USINE = Object.freeze({ miseAJour: true, memoriserSignature: true, motDePasseMin: 8, aide: '' });
const MDP_MIN = 8, MDP_MAX = 64, AIDE_MAX = 200;

function lire(dossier) {
  const valeurs = { ...USINE };
  const resultat = { fichier: '', valeurs, avertissements: [], lu: false };
  let nom = null;
  for (const n of NOMS) { try { if (fs.statSync(path.join(dossier, n)).isFile()) { nom = n; break; } } catch (e) { /* absent */ } }
  if (!nom) return resultat;
  resultat.fichier = nom;
  let brut;
  try { brut = JSON.parse(fs.readFileSync(path.join(dossier, nom), 'utf8').replace(/^﻿/, '')); }
  catch (e) { resultat.avertissements.push('le fichier n\'est pas du JSON lisible (' + (e && e.message ? e.message : e) + ') : les réglages d\'usine restent'); return resultat; }
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) { resultat.avertissements.push('le fichier doit contenir un objet { … } : les réglages d\'usine restent'); return resultat; }
  resultat.lu = true;
  for (const [cle, v] of Object.entries(brut)) {
    if (cle.startsWith('_') || cle.startsWith('//')) continue;   // une clé « _commentaire » est un commentaire
    switch (cle) {
      case 'miseAJour':
      case 'memoriserSignature':
        if (typeof v === 'boolean') valeurs[cle] = v; else resultat.avertissements.push('« ' + cle + ' » doit valoir true ou false : ignoré');
        break;
      case 'motDePasseMin':
        if (Number.isInteger(v) && v >= MDP_MIN && v <= MDP_MAX) valeurs.motDePasseMin = v;
        else resultat.avertissements.push('« motDePasseMin » doit être un entier de ' + MDP_MIN + ' à ' + MDP_MAX + ' : ignoré');
        break;
      case 'aide':
        if (typeof v === 'string') {
          const l = v.replace(/[\r\n\t]+/g, ' ').trim();
          valeurs.aide = l.slice(0, AIDE_MAX);
          if (l.length > AIDE_MAX) resultat.avertissements.push('« aide » dépasse ' + AIDE_MAX + ' caractères : coupée');
        } else resultat.avertissements.push('« aide » doit être un texte : ignoré');
        break;
      default:
        resultat.avertissements.push('réglage inconnu : « ' + cle + ' »');
    }
  }
  return resultat;
}

module.exports = { lire, USINE, NOMS, MDP_MIN, MDP_MAX, AIDE_MAX };
