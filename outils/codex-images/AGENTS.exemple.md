## Images

La Briquetterie vend des jeux de briques de construction. Pour toute image, utiliser les outils du serveur MCP `images`. Ne pas utiliser `curl` ni de script de téléchargement : le bac à sable n'a pas internet.

1. **Chercher** avec `search_images`, en français puis en anglais (« building bricks set », « brick toy box », nom exact du set). Pour la photo d'un produit précis, chercher sur tout le web (`source="web"`). Regarder les vignettes et garder les images nettes, en grand format, sans filigrane.
2. **Télécharger** les meilleures avec `download_image` (ou `save_image` sur le serveur en ligne), en leur donnant un nom parlant. Une adresse de page trouvée par la recherche web marche aussi.
3. **Retoucher avec le générateur d'images de Codex** (`image_gen.imagegen`) :
   - serveur local : `referenced_image_paths` avec le chemin donné par `download_image` ;
   - serveur en ligne : `num_last_images_to_include = 1`, juste après `save_image` ou `view_image` (`max_side` 2048) ;
   - dans le prompt, dire ce qui doit **rester identique** : la boîte, les briques, leurs couleurs, les inscriptions et le logo ;
   - photos de fiche produit : fond blanc pur, lumière de studio douce, produit centré, ombre légère au sol ;
   - une même série d'images reçoit la même consigne, pour qu'elles s'accordent.
4. **Gestes exacts sans IA** avec `edit_image` : format carré 1:1 pour les fiches produit (`pad` sur fond blanc), recadrage, redimensionnement à 2048 px au plus, logo.
5. **Vérifier** le résultat avec `view_image` avant de le garder.
6. **Crédits** : `list_images` donne l'auteur et la licence de chaque image téléchargée. Une photo prise sur le web n'est pas forcément libre de droits : le noter dans le récapitulatif.
