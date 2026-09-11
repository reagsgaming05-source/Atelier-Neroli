# Atelier-Neroli

## Blonay PDF — organiser ses PDF sans Acrobat

`outils/blonay-pdf.html` est un logiciel de manipulation de PDF qui fonctionne
entièrement dans le navigateur : rien n'est envoyé sur un serveur, les fichiers restent
sur l'ordinateur.

**Ce qu'il permet de faire**

- ouvrir un ou plusieurs PDF (bouton « Ouvrir » ou glisser-déposer) ;
- réorganiser les pages en les faisant glisser, ou en tapant directement le numéro
  de la position voulue sous la page ;
- déplacer une sélection de pages d'un bloc vers un numéro de position précis ;
- retirer des pages, ou retirer un document entier avec toutes ses pages ;
- pivoter des pages (90° à gauche ou à droite) ;
- dupliquer des pages ;
- fusionner plusieurs documents : leurs pages arrivent à la suite, chacune marquée
  de la couleur de son document d'origine ;
- extraire une sélection de pages dans un nouveau PDF ;
- annuler et rétablir (Ctrl + Z, Ctrl + Y) ;
- exporter le PDF obtenu sous le nom de son choix.

**Utilisation**

1. Télécharger le fichier `outils/blonay-pdf.html`.
2. L'ouvrir avec un navigateur récent (Chrome, Edge, Firefox ou Safari) en double-cliquant dessus.
3. Ouvrir ses PDF, réorganiser, puis cliquer sur « Exporter le PDF ».

Une connexion internet est nécessaire à l'ouverture de la page pour charger les deux
bibliothèques utilisées (pdf.js pour l'aperçu des pages, pdf-lib pour l'assemblage du
PDF final). Les fichiers PDF protégés par mot de passe ne sont pas pris en charge.

**Déplacer une page vers un numéro précis**

- Sous chaque page, le champ numéroté indique sa position. Cliquer dedans, taper le
  numéro voulu puis appuyer sur Entrée : la page prend cette position.
- Avec une page sélectionnée (ou plusieurs), la barre du bas propose « Déplacer en
  position » : le bloc sélectionné est placé à partir du numéro saisi.
- Une page ayant le focus clavier accepte aussi la saisie directe d'un chiffre.

**Raccourcis clavier**

| Touche | Action |
| --- | --- |
| Clic | Sélectionner ou désélectionner une page |
| Maj + clic | Sélectionner une plage de pages |
| Clic sur un document (panneau de gauche) | Sélectionner toutes ses pages |
| Ctrl + A | Tout sélectionner |
| Suppr | Retirer les pages sélectionnées |
| R / Maj + R | Pivoter la sélection à droite / à gauche |
| Alt + ← / → | Décaler la page d'une position |
| Ctrl + Z / Ctrl + Y | Annuler / Rétablir |
| Échap | Désélectionner |
