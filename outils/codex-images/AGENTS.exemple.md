## Images

La Briquetterie vend des jeux de briques de construction. Pour toute image, utiliser les outils du serveur MCP `images`. Ne pas utiliser `curl` ni de script de téléchargement : le bac à sable n'a pas internet.

1. **Trouver les photos**
   - Pour un produit précis chez un fournisseur : `page_images` avec l'adresse de la fiche produit. Il renvoie toutes les photos de la galerie, en grand format.
   - Sinon : `search_images`, en français puis en anglais (« building bricks set », nom exact du set), avec `source="web"` pour un produit précis.
   - Regarder les vignettes et garder les images nettes, en grand format, sans filigrane.
2. **Télécharger** les photos retenues avec `download_image("rN", name="nom-parlant")`. Le serveur en ligne fait la même chose avec `save_image`.
3. **Retoucher avec le générateur d'images de Codex** (`image_gen.imagegen`) :
   - serveur local : `referenced_image_paths` avec le chemin donné par `download_image` ;
   - serveur en ligne : `num_last_images_to_include = 1`, juste après `save_image` ou `view_image` (`max_side` 2048) ;
   - dans le prompt, dire ce qui doit **rester identique** : la boîte, les briques, leurs couleurs, les inscriptions et le logo ;
   - photos de fiche produit : fond blanc pur, lumière de studio douce, produit centré, ombre légère au sol ;
   - une même série d'images reçoit la même consigne, pour qu'elles s'accordent.
4. **Vérifier** chaque résultat avec `view_image` (chemin donné par le générateur, dans `generated_images/`) et recommencer si un détail du produit a changé.
5. **Mettre en ligne** chaque image retenue avec `publish_image(chemin, name="nom-parlant")` : il renvoie son adresse publique.
6. **Ajouter à la boutique**, avec le connecteur `boutique` (boutique `pignon`, La Briquetterie) :
   - retrouver le produit (`products(query: "…")`) ;
   - puis `productUpdate(product: {id: "gid://shopify/Product/…"}, media: [{originalSource: "<adresse publique>", mediaContentType: IMAGE, alt: "<description courte>"}])` ;
   - une image par photo, la vue principale en premier ;
   - relire ensuite le produit pour vérifier que les médias sont prêts (`status: READY`).
7. **Gestes exacts sans IA** avec `edit_image`, si besoin : format carré 1:1 (`pad` sur fond blanc), recadrage, redimensionnement à 2048 px au plus, logo.
8. **Crédits** : `list_images` donne la provenance de chaque image. Une photo prise sur un site n'est pas forcément libre de droits : le noter dans le récapitulatif.
