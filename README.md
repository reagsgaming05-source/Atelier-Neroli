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
- caviardage réel : une page caviardée est convertie en image à l'export, ce
  qui supprime définitivement le texte masqué.

Les PDF protégés par mot de passe peuvent être ouverts : le mot de passe est
demandé à l'ouverture.

### Document

- propriétés : titre, auteur, sujet, mots-clés ;
- recherche de texte dans toutes les pages, avec extrait et accès direct à la
  page trouvée.

## Les deux fichiers

| Fichier | Poids | Internet |
| --- | --- | --- |
| `outils/blonay-pdf.html` | 190 Ko | requis à l'ouverture, pour charger pdf.js, pdf-lib et JSZip |
| `outils/blonay-pdf-hors-ligne.html` | 2,2 Mo | aucun : les trois bibliothèques sont incluses dans le fichier |

Les deux fichiers offrent exactement les mêmes fonctions. La version hors ligne
convient aux postes sans accès internet ou derrière un filtrage strict. Elle
utilise les polices du système au lieu de celles de Google Fonts.

Les deux sont produits à partir d'une source unique par `outils/build.js`.

## Utilisation

1. Télécharger l'un des deux fichiers.
2. L'ouvrir avec un navigateur récent (Chrome, Edge, Firefox ou Safari) en
   double-cliquant dessus.
3. Ouvrir ses PDF, travailler, puis cliquer sur « Exporter le PDF ».

La reconnaissance de texte sur documents scannés (OCR) n'est pas disponible.

## Version portable Windows (recommandée) — application fenêtrée, aucune installation

1. Téléchargez **`BlonayPDF-windows.zip`** depuis la page *Releases* du dépôt (version
   « Blonay PDF — Windows portable (dernière version) »).
2. Décompressez le zip où vous voulez (Bureau, Documents, clé USB…).
3. Double-cliquez sur **`BlonayPDF.exe`** : la fenêtre de l'application s'ouvre.

Tout est inclus dans le dossier : rien à installer, rien n'est écrit dans le registre ni dans
*Program Files*, aucun navigateur n'est sollicité, aucune donnée ne quitte le PC. Les réglages
mémorisés (vue, zoom, thème, taille des vignettes) vont dans le sous-dossier `data/` à côté de
l'exécutable.

La fenêtre a son menu — *Fichier* (Ouvrir, Ajouter au document, Nouvelle fenêtre,
Enregistrer le PDF, Imprimer, dossier des données), *Affichage* (Lire, Organiser, zoom, thème,
plein écran), *Aide* (raccourcis, à propos). « Enregistrer le PDF » ouvre la boîte
« Enregistrer sous » de Windows. « Imprimer » connaît vos imprimantes et envoie directement —
imprimante choisie, recto verso, copies, livret, plusieurs pages par feuille, échelle
(ajuster, taille réelle, réduire les pages hors format, pourcentage), source de papier selon
le format de la page — sans autre fenêtre ; « Propriétés… » passe par la fenêtre d'impression
de Windows et les réglages du pilote.

Chaque PDF double-cliqué s'ouvre dans **sa propre fenêtre**, comme dans Acrobat : deux
documents ouverts depuis le bureau restent deux documents. Les combiner est un choix :
*Fichier › Ajouter au document…*, ou le bouton « Ajouter un document » dans la fenêtre.
Fermer avec des modifications non enregistrées demande d'abord confirmation.

L'ancienne version (avant les dix ajouts de la version 2) reste disponible telle quelle dans
la release **« Blonay PDF — version 1 »** (`BlonayPDF-v1-windows.zip`, tag `blonaypdf-v1`) :
si quelque chose ne va pas dans la nouvelle, décompressez celle-là à côté et continuez.

Au premier lancement, Windows SmartScreen peut afficher « Windows a protégé votre ordinateur »
(exécutable non signé) : cliquez sur *Informations complémentaires* puis *Exécuter quand même*.

L'exécutable est construit automatiquement par GitHub Actions
(`.github/workflows/build-blonaypdf-windows.yml`) à chaque poussée : tests unitaires,
construction de la page autonome, empaquetage Electron (`outils/desktop/`), test de fumée de
l'exécutable (fenêtre, menu, ouverture d'un PDF, imprimantes, export d'un vrai PDF), puis
publication du zip dans la pré-release à tag fixe `blonaypdf-windows-latest`.

### Utilisation

- **Ouvrir** : *Fichier › Ouvrir*, glisser-déposer dans la fenêtre, ou double-clic sur un PDF.
  Plusieurs documents s'ouvrent ensemble et se fusionnent à l'export.
- **Lire** (Ctrl+1) : le document page à page, zoom de 50 à 400 % (Ctrl + molette, Ctrl +/−,
  Ctrl 0 pour la page entière), recherche (Ctrl+F).
- **Organiser** (Ctrl+2) : glisser les pages, sélection au lasso, pivoter, supprimer, dupliquer,
  insérer des pages vierges, retirer les pages vides d'un scan, diviser, redimensionner.
- **Corriger et annoter** : double-clic sur une page ouvre l'éditeur — correction du texte en
  place, texte, surlignage, cadres, dessin, signature, image, caviardage, champs à remplir.
- **Exporter** (Ctrl+S) : le PDF assemblé, avec ou sans aplatissement, mot de passe possible.
- **Imprimer** (Ctrl+P) : pages, livret, plusieurs pages par feuille, papier, échelle,
  imprimante, recto verso, copies ; aperçu en direct.

### Développement

```bash
cd outils
npm ci                # (aucune dépendance de la page elle-même)
npm run libs          # pdf.js, pdf-lib, JSZip depuis npm, dans outils/libs/
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
| Ctrl + S | Exporter le PDF |
| Ctrl + F | Rechercher du texte |
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
