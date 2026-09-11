# Atelier-Neroli

## Néroli PDF — organiser ses PDF sans Acrobat

`outils/neroli-pdf.html` est un petit logiciel de manipulation de PDF qui fonctionne
entièrement dans le navigateur : rien n'est envoyé sur un serveur, les fichiers restent
sur l'ordinateur.

**Ce qu'il permet de faire**

- ouvrir un ou plusieurs PDF (bouton « Ouvrir des PDF » ou glisser-déposer) ;
- réorganiser les pages en les faisant glisser (une sélection se déplace d'un bloc) ;
- retirer des pages, ou retirer un fichier entier avec toutes ses pages ;
- pivoter des pages (90° à gauche ou à droite) ;
- fusionner plusieurs fichiers : leurs pages arrivent à la suite, chacune marquée
  de la couleur de son fichier d'origine ;
- extraire une sélection de pages dans un nouveau PDF ;
- annuler la dernière action (Ctrl + Z) ;
- télécharger le PDF obtenu.

**Utilisation**

1. Télécharger le fichier `outils/neroli-pdf.html`.
2. L'ouvrir avec un navigateur récent (Chrome, Edge, Firefox ou Safari) en double-cliquant dessus.
3. Ouvrir ses PDF, réorganiser, puis cliquer sur « Télécharger le PDF ».

Une connexion internet est nécessaire à l'ouverture de la page pour charger les deux
bibliothèques utilisées (pdf.js pour l'aperçu des pages, pdf-lib pour l'assemblage du
PDF final). Les fichiers PDF protégés par mot de passe ne sont pas pris en charge.

**Raccourcis clavier**

| Touche | Action |
| --- | --- |
| Clic | Sélectionner ou désélectionner une page |
| Maj + clic | Sélectionner une plage de pages |
| Ctrl + A | Tout sélectionner |
| Suppr | Retirer les pages sélectionnées |
| R / Maj + R | Pivoter la sélection à droite / à gauche |
| Ctrl + Z | Annuler |
| Échap | Désélectionner |
