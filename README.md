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
- diviser le document : une page par fichier, par lots ou par plages, réunis
  dans une archive ZIP ;
- redimensionner toutes les pages à un format standard avec marge.

### Modifier

L'éditeur de page (double-clic sur une page) permet d'ajouter du texte, de
surligner, d'encadrer, de dessiner à main levée, de signer, d'insérer une image
et de caviarder. Chaque annotation se déplace, se redimensionne et se supprime.

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

## Tests

Le comportement est vérifié dans Chromium : réorganisation, rotation avec
géométrie des annotations sur pages pivotées, caviardage, filigrane,
numérotation Bates, formulaires, chiffrement, division, export images et texte,
compression, redimensionnement, thèmes clair et sombre, affichage sur
téléphone. 80 vérifications, toutes au vert. La version hors ligne est testée
en plus avec tout accès réseau coupé.
