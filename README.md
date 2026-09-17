# Atelier-Neroli

## Blonay PDF — un logiciel PDF complet dans le navigateur

`outils/blonay-pdf.html` est un fichier HTML autonome qui offre les fonctions
d'un logiciel PDF professionnel. Tout le traitement se fait sur l'ordinateur de
l'utilisateur : aucun fichier n'est envoyé sur un serveur.

### Organiser

- ouvrir un ou plusieurs PDF (bouton « Ouvrir » ou glisser-déposer) ;
- réorganiser les pages en les faisant glisser, ou en tapant directement le
  numéro de la position voulue sous la page ;
- déplacer une sélection de pages d'un bloc vers un numéro précis ;
- retirer, dupliquer, pivoter des pages ; retirer un document entier ;
- fusionner plusieurs documents, chaque page gardant la couleur de son origine ;
- insérer des pages vierges (A4, A5, A3, Letter, Legal, portrait ou paysage) ;
- convertir des images JPEG, PNG et WebP en pages ;
- détecter et retirer les pages vides d'un document scanné, après vérification
  page par page ;
- diviser le document : une page par fichier, par lots ou par plages, réunis
  dans une archive ZIP ;
- redimensionner toutes les pages à un format standard avec marge.

### Modifier

L'éditeur de page (double-clic sur une page) permet de corriger le texte
existant, d'ajouter du texte, de surligner, d'encadrer, de dessiner à main
levée, de signer, d'insérer une image et de caviarder. Chaque annotation se
déplace, se redimensionne et se supprime.

La correction du texte repère les lignes de la page et les encadre. Un clic
reprend la ligne telle quelle, avec sa taille, sa police approchée, la couleur
de son encre et celle de son fond, toutes deux relevées sur la page. Le texte
saisi remplace l'ancien, recouvert. Une case permet d'effacer réellement le
texte d'origine : la page concernée est alors convertie en image à l'export,
faute de quoi l'ancien texte resterait retrouvable par copier-coller.

- filigrane : texte, police, taille, angle, couleur, opacité, au centre ou en
  mosaïque ;
- en-tête et pied de page sur six zones, avec les codes `{p}`, `{n}`, `{date}`,
  `{file}` et `{bates}` ;
- numérotation des pages, y compris la numérotation Bates avec préfixe.

### Formulaires

Les champs d'un PDF de formulaire (texte, cases à cocher, listes, choix) sont
détectés et remplissables. Les valeurs peuvent rester modifiables ou être
aplaties. Si les pages sont réorganisées ou fusionnées, l'aplatissement est
appliqué automatiquement pour conserver les valeurs saisies.

### Exporter

- le PDF complet, ou seulement les pages sélectionnées ;
- les pages en images PNG ou JPEG (72, 150 ou 300 ppp) ;
- le texte du document en fichier `.txt` ;
- une version allégée : les pages sont converties en images, avec comparaison
  des tailles avant et après.

### Protéger

- mot de passe d'ouverture et mot de passe propriétaire, chiffrement AES-256 ;
- autorisations : impression, copie, modification, annotation, remplissage des
  formulaires, réorganisation ;
- aplatissement des champs de formulaire ;
- caviardage réel : le texte caviardé est retiré du flux de la page, qui reste
  vectorielle quand sa police le permet ; sinon la page est convertie en image, ce
  qui supprime définitivement le texte masqué.

Les PDF protégés par mot de passe peuvent être ouverts : le mot de passe est
demandé à l'ouverture.

### Document

- propriétés : titre, auteur, sujet, mots-clés ;
- recherche de texte dans toutes les pages, avec extrait et accès direct à la
  page trouvée ; **remplacer partout** (chaque bloc est corrigé comme dans
  l'éditeur, le texte d'origine effacé du fichier) et **caviarder partout** ;
- **copier un tableau vers Excel** : les colonnes sont repérées d'après les
  blancs qui traversent les lignes, le résultat se colle dans Excel (Ctrl+V,
  une cellule par colonne) ou s'enregistre en CSV ;
- **reconnaître le texte (OCR)** d'un scan, en français et en allemand,
  entièrement sur le poste : le texte sert à la recherche, au remplacement,
  au tableau et à la correction dans l'éditeur, et repart dans le PDF exporté,
  invisible mais sélectionnable et cherchable ;
- **comparer deux versions** : pages côte à côte, mots retirés et ajoutés
  en couleur, page par page.

### Ce que la version 2 ajoute

Dix ajouts, choisis pour le travail de bureau au quotidien :

1. **Reconnaissance de texte (OCR)** locale, français et allemand, scans
   cherchables à l'export.
2. **Dossier de pièces** : chaque document devient une pièce numérotée —
   sommaire, intercalaires « Pièce n° », mention sur chaque page, pagination
   continue, un signet par pièce.
3. **Rechercher, remplacer partout, caviarder partout.**
4. **Copier un tableau vers Excel.**
5. **Tampons** (Reçu le, Payé, Copie conforme, Visé, Approuvé…) avec la date
   du jour, tampons personnels et **signatures mémorisés** sur le poste
   (dossier `data/`, jamais dans un PDF sans les y poser).
6. **Traiter plusieurs fichiers** : pages vides, compression, numérotation,
   protection, images en PDF, séparer, extraire le texte — en série, sans
   toucher au document ouvert ; résultats dans une archive ZIP.
7. **Vrais commentaires PDF** : surlignages, cadres, dessins, textes libres
   et tampons partent avec leur apparence en annotations que le destinataire
   retrouve, déplace ou retire dans Acrobat — ou figés dans la page, au choix
   (outil Aplatir).
8. **Comparer deux versions.**
9. **Signets** : le plan du document, repris du PDF ouvert, complété, exporté ;
   **lecture deux pages côte à côte**.
10. **Onglets** : plusieurs documents dans une fenêtre (Ctrl+T, Ctrl+W,
    Ctrl+Tab), une page se glisse d'un onglet à l'autre. « Ouvrir » ouvre à
    part ; « Ajouter au document » combine.

### Et depuis

Ce qu'une relecture complète du logiciel a fait ajouter ensuite :

- **Enregistrer** (Ctrl+S) réécrit le fichier ouvert, dans l'application Windows,
  après une confirmation la première fois pour chaque fichier ; **Enregistrer
  sous…** (Ctrl+Maj+S) crée un nouveau fichier. *Fichier › Récents* rouvre les
  derniers documents, et la page d'accueil les liste.
- **Récupération après plantage** : le travail en cours est mis de côté dans
  `data/recuperation/` quelques secondes après chaque changement, effacé à
  l'enregistrement ou à la fermeture voulue ; s'il en reste au lancement
  suivant, l'application propose de le récupérer, modifications comprises.
- **Sélection de texte en mode Lire**, copier-coller compris, sur un PDF
  texte comme sur un scan reconnu.
- **Caviardage et effacement sans convertir la page en image** : le texte
  visé est retiré du flux de la page, qui reste vectorielle (texte net,
  fichier léger). Si une image passe sous le rectangle, **seule cette
  image est refaite** — avec la zone peinte dans ses pixels mêmes — et non
  la page entière : sur un scan reconnu, le texte invisible de l'OCR reste
  donc sélectionnable partout, sauf sous le rectangle, où le mot est retiré
  du fichier lui aussi. La page n'est convertie en image que si le contenu
  masqué ne se laisse pas retoucher autrement (image posée de travers ou
  servant à plusieurs endroits, dégradé, police illisible) ; le journal le
  dit alors.
- **Commentaires déjà présents** dans un PDF reçu : listés, et retirés d'un
  clic (outil Commentaires).
- **Annuler** une longue opération (OCR, lot, assemblage) : bouton en bas,
  ou Échap.
- **Journal** : ce qui a été contourné pendant une opération (police
  illisible, lien perdu, commentaire ignoré…) n'est plus silencieux ; un
  bouton en bas de la fenêtre l'ouvre.
- **Comparer** : reconnaissance à la demande quand une version est un scan,
  et une vue « aspect » qui marque en rouge ce qui change à l'image.
- **Rechercher** (Ctrl+F) : le panneau flotte à côté du document au lieu de
  le masquer, chaque occurrence est **surlignée sur la page**, Entrée ou
  *Suivant* passe à la suivante (Maj+Entrée à la précédente), et l'option
  **mot entier** évite qu'« aire » trouve « affaire ».
- **Menus contextuels** : clic droit sur une page (pivoter, modifier,
  signet, copier le texte, dupliquer, extraire, supprimer) et sur un onglet
  (enregistrer, enregistrer sous, nouvel onglet, fermer, fermer les autres).
- **Tableau vers Excel sur plusieurs pages** d'un coup, les lignes se
  suivent, et les **montants deviennent des nombres** (1'234.50 → 1234.50,
  monnaie et espaces retirés, séparateur décimal au choix) : Excel les
  additionne sans retouche.
- **Reconnaissance de texte** : le temps restant est annoncé pendant le
  travail.
- **Impression** : qualité au choix (fine 300 ppp, normale 200, rapide 150).
  Le document part en images : c'est ce qui permet d'envoyer directement à
  l'imprimante sans autre fenêtre, et Chromium ne sait pas imprimer un PDF
  en vectoriel depuis une application ; à 300 ppp, la différence ne se voit
  pas sur papier.

## Les deux fichiers

| Fichier | Poids | Internet |
| --- | --- | --- |
| `outils/blonay-pdf.html` | 0,5 Mo | requis à l'ouverture, pour charger pdf.js, pdf-lib, JSZip et, à la demande, le moteur OCR |
| `outils/blonay-pdf-hors-ligne.html` | 9 Mo | aucun : les bibliothèques, le moteur OCR et les modèles français et allemand sont inclus dans le fichier |

Les deux fichiers offrent les mêmes fonctions. La version hors ligne convient
aux postes sans accès internet ou derrière un filtrage strict (c'est elle que
l'application Windows embarque). Elle utilise les polices du système au lieu
de celles de Google Fonts.

Les deux sont produits à partir d'une source unique par `outils/build.js`.

## Utilisation

1. Télécharger l'un des deux fichiers.
2. L'ouvrir avec un navigateur récent (Chrome, Edge, Firefox ou Safari) en
   double-cliquant dessus.
3. Ouvrir ses PDF, travailler, puis cliquer sur « Exporter le PDF ».

La reconnaissance de texte (OCR) se lance depuis *Outils › Reconnaître le
texte* : elle tourne sur le poste, rien n'est envoyé.

## Version portable Windows (recommandée) — application fenêtrée, aucune installation

1. Téléchargez **`BlonayPDF-windows.zip`** depuis la page *Releases* du dépôt (version
   « Blonay PDF — Windows portable (dernière version) »).
2. Décompressez le zip où vous voulez (Bureau, Documents, clé USB…).
3. Double-cliquez sur **`BlonayPDF.exe`** : la fenêtre de l'application s'ouvre.

Tout est inclus dans le dossier : rien à installer, rien n'est écrit dans le registre ni dans
*Program Files*, aucun navigateur n'est sollicité, aucune donnée ne quitte le PC. Les réglages
mémorisés (vue, zoom, thème, taille des vignettes) vont dans le sous-dossier `data/` à côté de
l'exécutable.

La fenêtre a son menu — *Fichier* (Ouvrir, Récents, Ajouter au document, Nouvelle fenêtre,
Enregistrer, Enregistrer sous…, Imprimer, dossier des données), *Affichage* (Lire, Organiser,
zoom, thème, plein écran), *Outils*, *Aide* (raccourcis, à propos). « Enregistrer » (Ctrl+S)
réécrit le fichier ouvert, après confirmation la première fois pour chaque fichier ;
« Enregistrer sous… » (Ctrl+Maj+S) ouvre la boîte de Windows. Le travail en cours est mis de
côté dans `data/recuperation/` quelques secondes après chaque changement et effacé à
l'enregistrement : après un arrêt brutal, il est proposé au lancement suivant. « Imprimer »
connaît vos imprimantes et envoie directement —
imprimante choisie, recto verso, copies, livret, plusieurs pages par feuille, échelle
(ajuster, taille réelle, réduire les pages hors format, pourcentage), source de papier selon
le format de la page — sans autre fenêtre ; « Propriétés… » passe par la fenêtre d'impression
de Windows et les réglages du pilote.

Chaque PDF double-cliqué s'ouvre dans **sa propre fenêtre**, comme dans Acrobat : deux
documents ouverts depuis le bureau restent deux documents. Les combiner est un choix :
*Fichier › Ajouter au document…*, ou le bouton « Ajouter un document » dans la fenêtre.
Fermer avec des modifications non enregistrées demande d'abord confirmation.

L'ancienne version (avant les dix ajouts de la version 2) reste disponible telle quelle dans
la release **« Blonay PDF — version 1 »** (`BlonayPDF-v1-windows.zip`) : si quelque chose
ne va pas dans la nouvelle, décompressez celle-là à côté et continuez. Le zip est celui publié
le 14 septembre 2026, construit depuis le commit `0ed7dac` ; le tag git `blonaypdf-v1` que
l'action de release a créé pointe, lui, sur `main`, et le jeton du workflow n'a pas le droit de
le déplacer. Pour le remettre d'équerre depuis un poste qui a les droits :
`git push --force origin 0ed7dac09ea1b2ac101842bb5de278607ef82a0e:refs/tags/blonaypdf-v1`.

Au premier lancement, Windows SmartScreen peut afficher « Windows a protégé votre ordinateur »
(exécutable non signé) : cliquez sur *Informations complémentaires* puis *Exécuter quand même*.

L'exécutable est construit automatiquement par GitHub Actions
(`.github/workflows/build-blonaypdf-windows.yml`) à chaque poussée : tests unitaires,
construction de la page autonome, empaquetage Electron (`outils/desktop/`), test de fumée de
l'exécutable (fenêtre, menu, ouverture d'un PDF, imprimantes, Enregistrer sous, Enregistrer sur
place après confirmation, récupération du travail après un arrêt brutal, seconde instance), puis
publication du zip dans la pré-release à tag fixe `blonaypdf-windows-latest`.

### Utilisation

- **Ouvrir** : *Fichier › Ouvrir* (Ctrl+O, dans un nouvel onglet), glisser-déposer dans la
  fenêtre, ou double-clic sur un PDF (nouvelle fenêtre). *Fichier › Ajouter au document*
  (Ctrl+Maj+O) combine plusieurs documents, qui se fusionnent à l'export.
- **Onglets** : Ctrl+T nouvel onglet, Ctrl+W fermer, Ctrl+Tab suivant ; une page glissée sur
  un autre onglet y déménage.
- **Lire** (Ctrl+1) : le document page à page ou deux pages côte à côte, zoom de 50 à 400 %
  (Ctrl + molette, Ctrl +/−, Ctrl 0 pour la page entière), signets (volet *Plan*, Ctrl+B),
  recherche, remplacement et caviardage (Ctrl+F).
- **Organiser** (Ctrl+2) : glisser les pages, sélection au lasso, pivoter, supprimer, dupliquer,
  insérer des pages vierges, retirer les pages vides d'un scan, diviser, redimensionner.
- **Corriger et annoter** : double-clic sur une page ouvre l'éditeur — correction du texte en
  place, texte, surlignage, cadres, dessin, tampons, signature (mémorisable), image,
  caviardage, champs à remplir. Les annotations partent en vrais commentaires PDF.
- **Outils** (menu) : reconnaître le texte (OCR, temps restant annoncé), comparer deux
  versions, copier un tableau vers Excel (plusieurs pages, montants en nombres), constituer
  un dossier de pièces, traiter plusieurs fichiers.
- **Clic droit** sur une page ou sur un onglet : les gestes courants, sans la barre d'outils.
- **Enregistrer** (Ctrl+S) : réécrit le fichier ouvert. **Enregistrer sous…** (Ctrl+Maj+S) : le
  PDF assemblé dans un nouveau fichier, avec ou sans aplatissement, mot de passe possible.
- **Imprimer** (Ctrl+P) : pages, livret, plusieurs pages par feuille, papier, échelle,
  imprimante, recto verso, copies ; aperçu en direct.

### Développement

```bash
cd outils
npm ci                # (aucune dépendance de la page elle-même)
npm run libs          # pdf.js, pdf-lib, JSZip, tesseract.js et les modèles fra/deu depuis npm, dans outils/libs/
npm test              # tests unitaires (node --test), sous Windows comme sous Linux
npm run build         # source.html → blonay-pdf.html, blonay-pdf-hors-ligne.html, docs/, lanceur/
cd desktop
npm ci
npm start             # la fenêtre, depuis les sources
npm run smoke         # test de fumée (Playwright pilote Electron)
npm run dist:win      # dossier portable dist/win-unpacked (BlonayPDF.exe)
```

`outils/source.html` est la seule source : `build.js` en tire les versions livrées. Les tests
de `outils/test/` valident le code réellement livré, extrait de la source. Le lanceur Go en
un seul fichier (`outils/application/lanceur/`, fenêtre WebView2, 4 Mo) reste disponible en
solution de repli : `sh outils/application/lanceur/construire.sh`.

## L'installer comme une vraie application

Le dossier `docs/` contient la même application, accompagnée d'un manifeste, de
ses icônes et d'un cache hors ligne. Servi par une adresse en https, il devient
installable : le navigateur propose « Installer Blonay PDF », et l'application
apparaît dans le menu Démarrer avec son icône, dans sa propre fenêtre, sans
onglet ni barre d'adresse. Après la première ouverture, elle fonctionne sans
connexion.

| Fichier | Rôle |
| --- | --- |
| `index.html` | l'application complète |
| `manifest.webmanifest` | nom, icône, fenêtre autonome |
| `sw.js` | cache hors ligne |
| `icon-192.png`, `icon-512.png`, `icon.svg` | icônes |

### Mise en ligne avec Vercel

Le fichier `vercel.json` à la racine indique déjà quoi servir : rien à
configurer, rien à installer.

1. ouvrir https://vercel.com et se connecter avec son compte GitHub
2. Add New, Project, puis importer le dépôt `Atelier-Neroli`
3. Deploy

Vercel sert le dossier `docs/` et attribue une adresse en https du type
`atelier-neroli.vercel.app`. Chaque envoi de code met le site à jour.

Vercel déploie la branche par défaut du dépôt. Tant que le travail vit sur une
autre branche, il faut soit la fusionner dans `main`, soit, dans Vercel,
Settings, Git, Production Branch, choisir cette branche.

### Mise en ligne avec GitHub Pages

Le dépôt étant public, quatre étapes suffisent, sans rien installer :

1. ouvrir https://github.com/reagsgaming05-source/Atelier-Neroli/settings/pages
2. Source : « Deploy from a branch »
3. Branch : la branche qui contient ce dossier, dossier `/docs`, puis Save
   (GitHub Pages accepte n'importe quelle branche, pas seulement `main`)
4. après une minute, l'adresse https://reagsgaming05-source.github.io/Atelier-Neroli/
   sert l'application

Cette adresse se partage : chaque personne l'ouvre, clique sur « Installer »
dans son navigateur, et l'application s'ajoute à son menu Démarrer. Rien n'est
installé au sens administrateur, et aucun compte n'est demandé.

L'application peut aussi être déposée sur un serveur interne : le dossier `docs/`
se copie tel quel, aucune configuration n'est nécessaire.

## Le donner à quelqu'un d'autre

Le dossier `outils/pour-les-collegues/` est prêt à être transmis tel quel, par
clé USB, partage réseau ou archive ZIP. Il contient :

| Fichier | Rôle |
| --- | --- |
| `blonay-pdf.html` | l'outil complet, hors ligne |
| `Blonay-PDF-Windows.cmd` | ouvre l'outil dans une fenêtre d'application |
| `Blonay-PDF-Mac.command` | la même chose sur Mac |
| `LISEZ-MOI.txt` | mode d'emploi en trois lignes |

Le destinataire double-clique sur le lanceur de son système : l'outil s'ouvre
dans une fenêtre sans onglet ni barre d'adresse. Les lanceurs ne font que
démarrer le navigateur déjà présent sur la machine, avec l'option `--app`.
Rien n'est installé, aucun compte n'est nécessaire, aucune donnée ne sort du
poste. Un double-clic sur le fichier HTML seul fonctionne aussi, dans un
onglet ordinaire.

Sur Mac, le premier lancement demande un clic droit puis Ouvrir, parce que le
fichier n'est pas signé.

## L'ouvrir comme une application, sans rien installer

### Windows, avec un raccourci

1. Enregistrer `blonay-pdf-hors-ligne.html` dans ses documents.
2. Clic droit sur le Bureau, Nouveau, Raccourci.
3. Saisir cette cible, en remplaçant le chemin par le sien :

   ```
   msedge --app="file:///C:/Users/VOTRE-NOM/Documents/blonay-pdf-hors-ligne.html"
   ```

   Avec Chrome, remplacer `msedge` par `chrome`. Si le nom seul est refusé,
   utiliser le chemin complet du navigateur, par exemple
   `"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"`.
4. Nommer le raccourci « Blonay PDF ».

Le double-clic ouvre une fenêtre sans onglet ni barre d'adresse. Le raccourci
s'épingle à la barre des tâches. Rien n'est installé sur le poste et aucun
droit administrateur n'est nécessaire.

### Depuis le navigateur

Sur une page ouverte, Edge propose « Installer ce site en tant qu'application »
dans le menu `…`, section Applications. Chrome propose la même chose dans
`⋮`, « Diffuser, enregistrer et partager », « Installer la page en tant
qu'application ». Un raccourci est créé et la page s'ouvre dans sa propre
fenêtre. C'est une fonction du navigateur, pas une installation de logiciel.

## Raccourcis clavier

| Touche | Action |
| --- | --- |
| Clic | Sélectionner ou désélectionner une page |
| Maj + clic | Sélectionner une plage de pages |
| Double-clic | Ouvrir l'éditeur de page |
| Chiffre | Déplacer la page vers ce numéro |
| Ctrl + A | Tout sélectionner |
| Ctrl + O | Ouvrir des fichiers |
| Ctrl + S | Enregistrer (application : réécrit le fichier ouvert ; navigateur : exporter) |
| Ctrl + Maj + S | Enregistrer sous… |
| Ctrl + F | Rechercher (mot entier, occurrences surlignées) |
| Entrée / Maj + Entrée | Occurrence suivante / précédente |
| Clic droit | Menu de la page, ou de l'onglet |
| Ctrl + Z / Ctrl + Y | Annuler / Rétablir |
| Suppr | Retirer les pages sélectionnées |
| R / Maj + R | Pivoter à droite / à gauche |
| Alt + ← / → | Décaler la page d'une position |
| ? | Afficher tous les raccourcis |

## Pages vides

La détection mesure l'encre de chaque page sur un rendu réduit, bords ignorés
pour écarter les ombres de scanner, et ne compte que les groupes de pixels
sombres, ce qui élimine les poussières isolées. Une page n'est retenue que si
elle ne contient aucun texte et que cette mesure reste sous le seuil choisi.

Les seuils viennent de mesures : une page réellement vide, y compris un verso
de scan bruité ou marqué par l'ombre du bord, mesure zéro ; un simple tampon de
deux centimètres mesure déjà un dixième de pourcent. Trois sensibilités sont
proposées, la plus tolérante restant six fois sous ce tampon.

Rien n'est supprimé sans votre accord : les pages détectées sont présentées
avec leur aperçu et leur mesure, cochées, et vous décochez celles à garder.

Vérifié sur un document d'épreuve de six pages comportant une page blanche, un
verso bruité, une page marquée par l'ombre du bord, une page portant un simple
tampon et une page portant deux mots : les trois premières sont détectées, les
deux dernières non, et le résultat reste le même une fois le document converti
en images, sans aucune couche de texte.

## Confidentialité

Les documents ne quittent pas l'ordinateur. Ils sont lus, modifiés et
réassemblés par le navigateur, en mémoire. Il n'y a ni envoi, ni compte, ni
cookie, ni mesure d'audience, ni identifiant. Le seul stockage est celui des
préférences d'affichage, sous les clés `blonay-theme` et `blonay-zoom`.

Ce n'est pas une promesse mais une contrainte : les fichiers livrés portent une
politique de sécurité qui interdit au navigateur toute connexion sortante.
Vérification faite dans Chromium, sur la version hors ligne, en tentant
délibérément six sorties depuis la page :

| Tentative | Résultat |
| --- | --- |
| `fetch` vers un serveur distant | refusée, `connect-src` |
| `navigator.sendBeacon` | refusée, `connect-src` |
| WebSocket | refusée, `connect-src` |
| script tiers | refusé, `script-src-elem` |
| pixel de traçage | refusé, `img-src` |
| cadre distant | refusé, `frame-src` |

Le même audit, mené pendant un parcours complet (ouverture, annotation,
caviardage, filigrane, mot de passe, export, extraction de texte, recherche),
ne relève aucune requête sortante, aucun cookie, aucune base de données créée.

La version hébergée porte la même politique, élargie au strict nécessaire pour
servir ses propres fichiers. L'hébergeur voit la demande de la page, comme tout
serveur web, jamais les documents traités.

## Tests

Le comportement est vérifié dans Chromium : réorganisation, rotation avec
géométrie des annotations sur pages pivotées, caviardage, filigrane,
numérotation Bates, formulaires, chiffrement, division, export images et texte,
compression, redimensionnement, thèmes clair et sombre, affichage sur
téléphone, détection des pages vides et correction du texte existant.
106 vérifications, toutes au vert. La version hors ligne est testée en plus
avec tout accès réseau coupé.
