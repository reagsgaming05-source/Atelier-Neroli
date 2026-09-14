# Caisse écoles – Saisie automatique des pièces comptables

Application locale (un seul fichier HTML, sans installation) qui lit un PDF scanné de
pièces comptables et remplit le journal de caisse Excel dans le même format que le
classeur existant :

| Date | No | Compte | Libellé | Débit | Crédit | Solde |
|------|----|--------|---------|-------|--------|-------|

Le solde est une formule cumulée (`=G(n-1)+E(n)-F(n)`), comme dans le classeur d'origine.
Le compte caisse au **DOIT** de la pièce donne un **Débit** (entrée en caisse), le compte
caisse à l'**AVOIR** donne un **Crédit** (sortie de caisse). La colonne *Compte* reçoit le
compte de contrepartie.

## Utilisation (PC de l'État, sans installation)

1. Copier `dist/Caisse-ecoles.html` sur le PC (clé USB, courriel, téléchargement depuis GitHub).
2. Double-cliquer dessus : il s'ouvre dans le navigateur (Edge, Chrome, Firefox). Rien n'est
   envoyé sur internet, tout se passe dans le navigateur ; l'application fonctionne hors ligne.
3. **Étape 1 – Classeur Excel** : par défaut *Nouveau classeur*, il suffit d'indiquer la date et
   le montant du solde à nouveau (le solde final du dernier fichier généré est proposé d'un clic).
   Choisir *Continuer un classeur existant* pour ajouter les pièces à la suite d'un classeur en
   cours. **Aucun classeur n'est nécessaire pour lire les pièces** : la base de référence est
   intégrée à l'application. Vérifier le n° du compte caisse (`9100.104` par défaut).
4. **Étape 2 – PDF** : glisser un ou plusieurs PDF de pièces (ex. `Pce 01 à 33.pdf`,
   `Pce 34 à 60.pdf`). Les fichiers sont classés par nom (ordre naturel) et listés avec leur
   nombre de pièces ; on peut les monter/descendre, en retirer, en ajouter plus tard sans perdre
   les corrections déjà faites. Les PDF doivent avoir été scannés avec reconnaissance de texte
   (PDF « consultable »), ce que fait le copieur.
5. **Étape 3 – Vérification** : seules les lignes ⚠ **orange** demandent un contrôle ; les lignes
   ✓ vertes ont été lues sans ambiguïté. Dans une ligne orange, **la cellule en doute est colorée**
   (numéro, date, compte, libellé ou montant), la raison s'affiche sous la ligne et au survol.
   Les cellules **bleues** signalent une correction automatique (mot, nom ou compte caisse mal lu).
   Cliquer sur une ligne affiche la pièce à droite avec les zones lues encadrées : **orange** pour
   la zone en doute, **bleu** pour les autres ; un clic sur l'image l'agrandit en plein écran.
   Dès qu'une cellule orange est corrigée elle redevient normale, et la ligne passe au vert quand
   tous ses doutes sont traités. Trois aides pour aller vite : la case *Afficher seulement les
   lignes à vérifier*, le bouton *✓ Vérifié → suivante*, et le raccourci **Ctrl + Entrée** qui
   valide la ligne affichée et saute à la suivante. On peut aussi ajouter une écriture manuelle.
6. **Étape 4 – Contrôle et fichier Excel** : le tableau de contrôle récapitule le lot (suite des
   numéros, doublons, lignes à vérifier, pièces jamais affichées, totaux). Inscrire le **solde réel
   compté en caisse** : l'application affiche l'écart avec le solde calculé, nomme les pièces qui
   l'expliquent exactement (sens inversé, pièce comptée deux fois) et propose la correction.
   *Générer le fichier Excel* télécharge `Caisse écoles AAAA.xlsx` ; toute anomalie restante demande
   une confirmation explicite. *Rapport de contrôle* ouvre un récapitulatif imprimable à conserver
   avec les pièces.

Les copies de pièces jointes à d'autres pièces (même numéro, même montant) sont ignorées
automatiquement, y compris d'un fichier à l'autre ; les numéros manquants dans la séquence sont
signalés. Avec plusieurs fichiers, la colonne *Page* indique le fichier (F1, F2…) et la page.

## Ce que l'application lit sur une pièce

Formulaire « PIÈCE COMPTABLE » : le numéro (en haut au milieu), les comptes des colonnes
DOIT et AVOIR, la SOMME et le Total, les lignes du libellé (type en majuscules, description,
personne) et la date sous le tableau. Le libellé du journal est composé ainsi :
`TYPE - Description - Personne` (ex. `REMBOURSEMENT - Collation chœur 7-11S concert du 12.12.2024 - A. Dupraz`).
Les fautes d'OCR courantes sont corrigées (`10'OOO.OQ` → 10 000.00, `51000. 3662. 50` → `51000.3662.50`,
`REMBOURSMENT` → `REMBOURSEMENT`).

Doutes signalés (ce qui déclenche l'orange) :

- **Montant** : illisible, différent entre la colonne SOMME et le Total, nul ou inhabituellement
  élevé ; pour les types sans logique fixe (DECOMPTE…), sens débit/crédit déduit au lieu d'être
  lu, contraire au sens habituel du type ou du compte dans le classeur, ou opposé à la nature du
  compte (compte de recettes `.4xxx` en sortie).
- **Compte** : plusieurs comptes possibles sur la pièce, aucun compte lu, compte caisse des deux
  côtés ou absent, compte jamais utilisé jusqu'ici (avec les comptes connus voisins proposés).
- **Numéro** : absent, dupliqué, déjà présent dans le classeur, ou hors séquence par rapport à
  l'ordre des pages (pièces scannées dans l'ordre).
- **Date** : absente, antérieure à la pièce précédente, ou d'une autre année que le reste du lot.
- **Libellé** : absent, sans type d'écriture en tête, sans nom de personne, contenant un mot qui
  ressemble à une erreur de lecture, ou un nom très proche d'un nom connu.

Précision de la lecture :

- les mots du libellé sont comparés au vocabulaire (lexique de base d'environ 450 mots + mots
  appris dans le classeur) et corrigés quand l'écart est typique de l'OCR (`chour` → `chœur`,
  `expbsition` → `exposition`) ; les désignations de classes aussi (`98` → `9S`, `7-118` → `7-11S`) ;
- le nom de la personne est corrigé d'après les noms connus (`N. Moret` → `N. Morel`) ;
- un compte jamais utilisé qui ressemble à un compte connu est signalé avec une proposition
  (jamais corrigé d'office, les sous-comptes voisins étant légitimes) ; un compte caisse mal lu
  (`9100.184`) est reconnu ;
- quand la pièce porte plusieurs comptes possibles, celui habituellement utilisé pour ce type
  d'écriture dans le classeur est retenu, l'autre restant proposé d'un clic ;
- le texte de la pièce est respecté : seuls les séparateurs de dates cassés par l'OCR
  (`12. 12. 2024`) sont recollés, un tiret entouré d'espaces (`5P/6 - 20 élèves`) est conservé ;
- un montant illisible est retenté en mode tolérant et signalé ; un numéro ou une date
  manquants sont proposés d'après la pièce précédente et signalés ;
- deux formulaires sur une même page sont reconnus séparément ; les scans légèrement inclinés
  sont tolérés ;
- chaque correction est indiquée par une cellule bleue, avec le détail au survol et sous la ligne
  quand elle est sélectionnée ;
- le sens attendu est appris du classeur, par type d'écriture **et par compte** (une règle n'est
  retenue que si toutes les écritures concernées vont dans le même sens, sur au moins cinq
  occurrences) ;
- un n° de compte coupé en deux lignes par le scanner est recollé (`51000.3151.` + `00`) ;
- une date dont l'OCR a perdu un séparateur est reconnue (`11 12. 2025` → 11.12.2025) ;
- une initiale lue en minuscule (`l. Sandoz`) est tranchée d'après les noms connus, sans
  transformer un vrai `L.` en `I.` ;
- un montant lu à zéro est traité comme illisible, le Total faisant foi.

Le montant retenu est le **Total** en bas de la pièce. La colonne SOMME, souvent laissée vide,
sert uniquement à confirmer ce total, ou à le remplacer quand il est absent ou illisible : son
absence ne déclenche donc aucun doute.

Sur le lot d'exemple de 33 pièces, trois lignes sont signalées et trente passent en vert, sans
écart sur les dates, numéros, montants, sens et comptes par rapport au classeur de référence.

## Ce qui garantit un fichier juste

Une lecture de scan n'est jamais certaine à 100 %. Trois garde-fous se complètent :

1. **Les alertes par cellule** (orange) signalent ce qui n'a pas pu être confirmé, en particulier
   un sens débit/crédit contraire aux habitudes du classeur. Sur un lot réel de 68 pièces, les deux
   seules erreurs étaient toutes deux signalées, pour quatre alertes au total.
2. **Le contrôle pièce par pièce** (bouton *Contrôler les pièces une par une*) affiche chaque pièce
   en grand avec ses champs à côté ; les flèches du clavier enchaînent les validations. Le tableau
   de contrôle indique combien de pièces n'ont jamais été affichées.
3. **Le rapprochement de caisse** : le solde calculé est comparé au solde réel compté. C'est le
   contrôle final, celui qui révèle toute écriture mal lue, y compris celles qu'aucune règle ne
   pouvait détecter. En cas d'écart, l'application cherche elle-même ce qui l'explique exactement :
   une pièce comptée deux fois, ou jusqu'à trois pièces prises dans le mauvais sens (un décompte de
   camp peut aller dans les deux sens, aucune règle ne le signale ; le rapprochement, si). Elle
   nomme les pièces et propose d'inverser leur sens en un clic, après vérification sur la pièce.

### Logique des libellés

Le type d'écriture en tête du libellé fixe le sens du mouvement de caisse, quoi qu'indique la
position du compte caisse sur la pièce :

| Sens | Types |
|---|---|
| Sortie de caisse (crédit) | REMBOURSEMENT, AVANCE, PAIEMENT, ACHAT, FRAIS, CADEAU, PRIX |
| Entrée en caisse (débit) | PARTICIPATION (DES PARENTS), RECETTE, RETRAIT (bancaire), ENCAISSEMENT, VENTE, SUBVENTION |
| Selon la pièce | DECOMPTE (et tout autre type) |

Une pièce remplie à l'envers (compte caisse du mauvais côté du formulaire) est donc remise dans
le bon sens automatiquement ; la cellule du montant passe en bleu avec l'explication. Si le type
lui-même a été lu approximativement (`REMBOURSMENT`), la logique s'applique mais la cellule reste
orange, avec un bouton pour revenir au sens lu. Pour un DECOMPTE, qui va dans les deux sens, c'est
la pièce qui décide, puis le rapprochement de caisse qui tranche. Le classeur 2025 confirme cette
logique : 123 remboursements et 37 avances, tous en sortie ; 18 participations, 8 recettes et
7 retraits, tous en entrée.

## Base de référence intégrée

L'application embarque le vocabulaire d'un classeur de référence : mots des libellés,
désignations de classes, numéros de comptes, et pour chaque type d'écriture le compte et le sens
habituels. C'est ce qui permet de corriger les lectures et de repérer les anomalies **sans
charger aucun fichier**. Elle s'enrichit ensuite toute seule : chaque classeur chargé et chaque
lot de pièces validé ajoutent ce qu'ils apportent de nouveau, mémorisé sur le PC.

Régénérer la base depuis un classeur plus récent :

```bash
npm run vocab -- chemin/du/classeur.xlsx   # par défaut samples/caisse.xlsx
npm run build
```

Deux fichiers sont produits :

| Fichier | Contenu | Versionné |
|---|---|---|
| `src/vocabulaire.js` | mots, classes, comptes, comptes et sens par type | oui – aucune donnée personnelle |
| `src/vocabulaire-noms.js` | noms des personnes citées dans les libellés | **non** – données personnelles |

Le dépôt étant public, les noms ne sont pas publiés : ils ne figurent que dans la version de
l'application construite au sein de l'établissement (`npm run build` les inclut si le fichier
est présent, et l'indique dans son message ; `npm run build:public` construit sans, et c'est
cette version qui est versionnée dans `dist/`). Une version téléchargée depuis le dépôt fonctionne
de la même manière, sans la correction des noms ; charger une fois un classeur les rétablit.
Un test automatique vérifie qu'aucun nom ne se glisse dans le fichier versionné.

## Développement

```bash
cd caisse-ecoles
npm install          # pdf.js + ExcelJS
npm run build        # -> dist/Caisse-ecoles.html (fichier autonome)
npm test             # tests unitaires (parser, Excel)
```

Le test d'intégration `test/sample.test.js` compare les pièces d'un vrai PDF au classeur de
référence si l'on place `samples/pieces.pdf` et `samples/caisse.xlsx` (dossier non versionné,
car il contient des données personnelles).

Structure :

- `src/parser.js` – analyse de la couche texte des pièces (positions des mots → champs → écriture)
- `src/vocabulaire.js`, `src/vocabulaire-noms.js` – base de référence intégrée (générée)
- `tools/build-vocab.js` – génère cette base depuis un classeur
- `src/excel.js` – lecture d'un classeur existant et génération du classeur au format du modèle
- `src/app.js`, `src/index.html`, `src/app.css` – interface
- `build.js` – assemble tout (avec pdf.js et ExcelJS) dans `dist/Caisse-ecoles.html`

## Limites

- Le PDF doit contenir une couche texte (scan avec OCR). Un PDF « image » seule est signalé
  et ne peut pas être traité.
- L'OCR du scanner peut confondre certains caractères ; les corrections automatiques couvrent les
  cas fréquents, mais la relecture à l'étape 3 reste nécessaire.
- Une pièce scannée sans couche texte n'est pas reconnue : les pages sans texte sont listées
  avec un bouton pour les afficher, et la pièce peut être ajoutée à la main.
- Quand une pièce porte plusieurs comptes de contrepartie, le premier est proposé et la
  ligne est signalée pour choisir le bon.
