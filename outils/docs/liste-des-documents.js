/*
 * Les documents de documentation livrés dans l'archive, en PDF : [source HTML, nom du PDF, titre, nombre de pages exact (facultatif)].
 * Une seule liste : la fabrication (faire-les-documents.js) et les contrôles de la chaîne (le nombre de PDF attendu dans chaque archive)
 * la lisent, au lieu de recopier un chiffre.
 */
const DOCUMENTS = [
  ['guide-administration.html', 'Guide-d-administration.pdf', 'Guide d’administration et de déploiement'],
  ['protection-des-donnees.html', 'Fiche-protection-des-donnees.pdf', 'Fiche de protection des données'],
  ['fiche-produit.html', 'Fiche-produit.pdf', 'Fiche produit'],
  ['support.html', 'Procedure-de-support.pdf', 'Procédure de support'],
  ['declaration-accessibilite.html', 'Declaration-d-accessibilite.pdf', 'Déclaration d’accessibilité'],
  ['faq.html', 'Questions-frequentes.pdf', 'Questions fréquentes'],
  // une feuille A4 recto verso : deux pages exactement, pas une de plus (le dernier champ le garde)
  ['aide-memoire.html', 'Aide-memoire.pdf', 'Aide-mémoire', 2],
  ['formation.html', 'Formation-une-heure.pdf', 'Formation d’une heure'],
];

module.exports = { DOCUMENTS };
