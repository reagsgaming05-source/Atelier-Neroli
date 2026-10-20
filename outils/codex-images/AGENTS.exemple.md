## Images

Pour toute image du site, utiliser les outils du serveur MCP `images`. Ne pas utiliser `curl` ni de script de téléchargement : le bac à sable n'a pas internet.

1. **Chercher** avec `search_images`, en français puis en anglais (« brick kiln », « clay bricks stack », « red brick facade »). Regarder la planche de vignettes et garder les images nettes, bien cadrées, sans texte ni filigrane, cohérentes entre elles.
2. **Télécharger** les meilleures avec `download_image("rN", name="nom-parlant")`. Une adresse de page trouvée par la recherche web marche aussi.
3. **Retoucher** avec `edit_image`, puis regarder l'avant/après et recommencer jusqu'à ce que ce soit juste :
   - recadrer au format de l'emplacement (bandeau 16:9, vignette 4:3 ou 1:1), avec le sujet bien placé ;
   - redresser les verticales des bâtiments (`perspective`, ou `rotate` avec `crop: true`) ;
   - lumière naturelle et chaude, briques d'un rouge-orangé crédible, sans saturer ;
   - une même série d'images reçoit les mêmes réglages ;
   - pour le web : `resize` à 2000 px de large au plus, enregistrer en `.webp` ou en `.jpg`.
4. Pour enlever un objet gênant ou changer un ciel : `ai_edit_image`, en précisant ce qui doit rester identique.
5. **Vérifier** le résultat final avec `view_image`, puis ranger les images retenues dans `images/site/` (paramètre `output`).
6. **Crédits** : `list_images` donne l'auteur et la licence de chaque image. Les reporter dans la page des mentions légales ou des crédits.

Toujours garder `commercial_only` à `true` : le site est celui d'une entreprise.
