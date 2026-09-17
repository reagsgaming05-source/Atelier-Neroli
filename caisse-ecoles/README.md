# Caisse écoles – Saisie des pièces comptables et journal de caisse

Application locale, sans installation, en deux onglets :

- **Saisie des pièces** : la fiche « PIÈCE COMPTABLE » se remplit dans l'application (n°, date,
  type, objet, classe, personne, compte proposé, montant, sens fixé par le libellé, justificatifs
  joints). Chaque pièce enregistrée entre dans le journal de l'année, conservé dans les fichiers
  de l'application ; à la fin : le fichier Excel de l'année et le PDF des pièces (fiche +
  justificatifs).
- **Pièces scannées (PDF)** : lecture des pièces déjà remplies à la main et scannées, avec
  lectures croisées (couche texte, OCR local, Tesseract natif), et ajout au registre.
- **Compter la caisse** : nombre de billets (1000, 200, 100, 50, 20, 10) et de pièces (5, 2, 1,
  50, 20, 10 et 5 centimes), total compté, dernier solde compté et nouveau solde avec leurs
  dates, écart avec le solde du journal à cette date, historique des comptages dans le registre.

La version portable Windows s'appelle **Compta Blonay** : une seule application pour les deux
outils du dépôt. Le logo en tête de la barre latérale est un menu déroulant qui passe de
**Caisse écoles** à **Décompte DGEO** (courses d'école & camps) : l'autre logiciel s'affiche alors
au complet dans la même page, avec ses propres raccourcis dans la barre latérale (dossier PDF,
dossier & effectifs, pièces justificatives, lignes du décompte), démarré avec la fenêtre et arrêté
avec elle. Un pont relie les deux : chaque
décompte terminé dans l'onglet Décompte DGEO est proposé dans la caisse comme pièce DECOMPTE
pré-remplie.

Le journal de caisse Excel est produit dans le même format que le classeur existant :

| Date | No | Compte | Libellé | Débit | Crédit | Solde |
|------|----|--------|---------|-------|--------|-------|

Le solde est une formule cumulée (`=G(n-1)+E(n)-F(n)`), comme dans le classeur d'origine.
Le compte caisse au **DOIT** de la pièce donne un **Débit** (entrée en caisse), le compte
caisse à l'**AVOIR** donne un **Crédit** (sortie de caisse). La colonne *Compte* reçoit le
compte de contrepartie.

## Version portable Windows « Compta Blonay » (recommandée) — application fenêtrée, aucune installation

1. Téléchargez **`ComptaBlonay-windows.zip`** depuis la page *Releases* du dépôt (version
   « Compta Blonay — Windows portable »).
2. Décompressez le zip où vous voulez (Bureau, Documents, clé USB…).
3. Double-cliquez sur **`ComptaBlonay.exe`** : la fenêtre de l'application s'ouvre, avec les
   onglets *Caisse écoles* et *Décompte DGEO*.

Tout est inclus dans le dossier : rien à installer, rien n'est écrit dans le registre ni dans
*Program Files*, aucun navigateur n'est sollicité, aucune donnée ne quitte le PC. Les réglages
mémorisés (compte caisse, vocabulaire appris, dernier solde) vont dans le sous-dossier `data/`
à côté de l'exécutable.

**Noms de personnes** : le dépôt étant public, la version portable ne contient aucun nom. Posez
le fichier `vocabulaire-noms.js` (remis séparément, jamais publié) à côté de `ComptaBlonay.exe` :
il est lu au démarrage (menu *Aide → À propos* indique s'il a été trouvé). Sans lui, les noms
s'apprennent en chargeant un classeur existant.

Au premier lancement, Windows SmartScreen peut afficher « Windows a protégé votre ordinateur »
(exécutable non signé) : cliquez sur *Informations complémentaires* puis *Exécuter quand même*.

**Décompte DGEO dans la même application** : le zip contient aussi la version portable de
Décompte DGEO (dossier `decompte/`, prise dans la release « windows-latest » du dépôt). Il n'y a
qu'un programme à ouvrir, `ComptaBlonay.exe` : au démarrage, il lance en arrière-plan le serveur
local de Décompte DGEO sur un port libre (le menu du logo indique *démarre…* puis, une fois
Décompte DGEO choisi, affiche le logiciel complet, avec toutes ses fonctions : analyse du dossier
PDF, effectifs, pièces, part État, décompte Excel) et l'arrête à la fermeture de la fenêtre.
Raccourci : Ctrl+4 ; Ctrl+1 à Ctrl+3 ramènent aux espaces de Caisse écoles. Ses dossiers vont
dans `data/decompte/`, à côté des registres de la caisse. Si le serveur s'arrête, rechoisir
Décompte DGEO dans le menu le relance ; sans le dossier `decompte/`, le menu l'indique. Dans le
fichier HTML seul, Décompte DGEO n'affiche qu'une explication : il fait partie de l'application
Windows.

**Dossier nettoyé avant l'analyse** : le dossier scanné pour un décompte commence par la pièce
comptable de la caisse (fiche imprimée depuis l'application ou remplie à la main), que Décompte
DGEO ne doit pas lire. Une passerelle locale placée devant Décompte DGEO confie chaque dossier
déposé à Caisse écoles, qui retire les pages « PIÈCE COMPTABLE » reconnues par leur texte (et, si
le dossier n'a aucun texte lisible, la première page, réglage sous les raccourcis de Décompte
DGEO dans la barre latérale), puis transmet le reste : Décompte DGEO ne voit que le formulaire de
couverture et les tickets. La barre latérale indique ce qui a été retiré.

**Formulaire du dossier affiché à côté** : chaque dossier scanné contient le « Formulaire de décompte
camp & course » de Blonay (page de couverture manuscrite). Après l'analyse, ce formulaire s'affiche
dans un volet à droite de Décompte DGEO (image redressée, agrandissable) avec ce que Décompte DGEO y a
lu : type, activité, classe, dates, responsable, budget, effectifs, dépenses par pièce (payé par
l'enseignant-e, par la commune, coût total), part État, remarques. Les dossiers analysés sont
retenus (`data/caisse/dossiers-dgeo.json`) et sélectionnables ; le volet se masque d'une case dans la
barre latérale.

**Pont entre les deux outils** : quand un décompte est terminé dans Décompte DGEO (bouton
*Générer le fichier Excel*), la fenêtre retient le dossier (n°, course d'école ou camp, classe,
dates, enseignant-e, montants) dans `data/caisse/decomptes-dgeo.json`. L'onglet *Caisse écoles*
affiche alors un badge « 1 décompte à saisir » et, au-dessus de la fiche, le décompte avec
*Créer la pièce* : la fiche se pré-remplit (type DECOMPTE, objet, classe, période, détail,
personne, compte habituel, libellé) ; le montant proposé est ce que l'enseignant-e a payé de sa
poche d'après le formulaire (à défaut le total des dépenses, à défaut la part État), les autres
montants du décompte restant à un clic. On vérifie montant, sens et compte, puis on enregistre :
la pièce est marquée « DGEO » dans le journal et le décompte n'est plus proposé. *Ouvrir l'Excel*
ouvre le fichier du décompte enregistré ; *Ignorer* écarte un décompte sans pièce. Rien n'est
modifié dans Décompte DGEO : la fenêtre observe seulement sa requête locale de génération.

L'exécutable est construit automatiquement par GitHub Actions
(`.github/workflows/build-caisse-windows.yml`) : tests, construction de l'application autonome,
empaquetage Electron (`desktop/`), Tesseract et Décompte DGEO ajoutés au dossier, test de fumée
de l'exécutable (fenêtre à onglets, saisie d'une pièce jusqu'au journal et aux fichiers, moteur
de lecture, OCR embarqué, Tesseract natif, Décompte DGEO démarré avec l'application, pont
décompte → pièce), puis publication du zip.

## Saisie des pièces (onglet principal)

1. **Année** : le registre de l'année en cours s'ouvre (ou se crée avec, comme solde à nouveau,
   le solde final de l'année précédente). Chaque année est un registre séparé, conservé dans
   `data/caisse/<année>/` à côté de l'exécutable (version portable) ou dans le navigateur
   (fichier HTML seul) ; *Sauvegarde (JSON)* / *Restaurer…* pour copier ou reprendre un registre.
2. **Fiche** : n° (proposé), date, **type d'écriture** (REMBOURSEMENT, AVANCE, DECOMPTE,
   PARTICIPATION DES PARENTS…), **objet** (course d'école, camp, mini-camp, voyage d'étude, cours de
   ski, collation, repas, matériel…), classe, dates de l'activité, détail, personne. Le libellé du
   journal se compose tout seul (`TYPE - Objet classe du dates détail - Personne`) et reste
   modifiable. Le **compte** est proposé d'après le classeur 2025 pour ce type, cet objet et ce
   degré (primaire / secondaire) — par exemple DECOMPTE + course d'école + 5P → 51000.3662.00,
   AVANCE + camp + 9S → 52000.3662.00, PARTICIPATION + cours de ski → 51000.4392.20. Le **sens**
   est fixé par la logique des libellés (un DECOMPTE se choisit). Les **justificatifs** (PDF, JPG,
   PNG) sont joints à la pièce et enregistrés avec elle.
3. **Enregistrer la pièce → journal** : la pièce est vérifiée (n° unique, date de l'année, compte,
   montant, sens, personne) puis ajoutée au journal, qui recalcule le solde cumulé. La **fiche
   PDF s'ouvre aussitôt dans une fenêtre**, prête à imprimer (Ctrl+P), seule ou avec ses
   justificatifs selon les deux cases sous les boutons ; le réglage est mémorisé.
   Pour un **DECOMPTE**, la liste des objets laisse place à deux choix explicites : *Course
   d'école* ou *Camp*.
4. **Fichier Excel de l'année** : même format que le classeur ; **PDF des pièces** : une page
   « PIÈCE COMPTABLE » par pièce (relisible par l'application) suivie de ses justificatifs, pour
   toutes les pièces ou depuis un n°. Chaque ligne du journal a aussi ses boutons *Modifier*, *PDF*
   et *×*.
5. **Pièces scannées et pièces saisies vont dans le même registre.** L'espace des pièces
   scannées prend par défaut le registre de l'année comme base : les pièces lues viennent à la
   suite de celles déjà saisies, **Ajouter au registre de l'année** les y verse (avec l'image de
   chaque pièce en justificatif) et le fichier Excel généré là contient tout le registre plus le
   lot, sans rien compter deux fois (une pièce déjà dans le registre avec le même n° et le même
   montant est reconnue ; même n° avec un autre montant : signalé). Année commencée à l'ancienne
   (classeur Excel tenu à la main ou produit par les pièces scannées) : **Reprendre un classeur
   Excel…** sous le journal verse ses écritures dans le registre (solde à nouveau repris si le
   registre est vide, numérotation qui continue, pièces marquées *Excel*), et la saisie reprend
   dans la fiche. Le bouton *Reprendre ces écritures dans le registre* de l'espace des pièces
   scannées fait la même chose depuis un classeur chargé là.
6. Version portable : un décompte terminé dans l'onglet **Décompte DGEO** apparaît au-dessus de
   la fiche ; *Créer la pièce* la pré-remplit (voir plus haut, *Pont entre les deux onglets*).
7. **Récapitulatif des décomptes** : dans l'outil *Décompte DGEO* (sélecteur en tête de la barre
   latérale), espace *Récapitulatif*. Les pièces DECOMPTE de l'année du registre ouvert, filtrées
   (courses d'école, camps ou les deux), à cocher ; *Générer le récapitulatif (PDF)* produit un
   document avec le n° de chaque décompte, la date, la description, l'enseignant-e, la référence
   DGEO, le montant et le total des décomptes cochés (plusieurs pages si besoin).

## Compter la caisse

L'espace *Compter la caisse* sert au comptage physique : pour chaque coupure (billets de 1000,
200, 100, 50, 20, 10 CHF ; pièces de 5, 2, 1 CHF et de 50, 20, 10, 5 centimes) on tape le
nombre, le total se calcule en direct (billets, pièces, total). À droite, cinq indicateurs :
le **dernier solde compté** avec sa date (le comptage précédent, au besoin celui de l'année
d'avant), le **nouveau solde compté** avec sa date, la variation entre les deux, le **solde du
journal** au jour du comptage (solde à nouveau + écritures datées jusqu'à ce jour) et l'**écart
caisse / journal** : 0.00 quand la caisse correspond, sinon le montant qui manque ou qui est en
trop, ce qui signale une pièce non enregistrée ou un montant faux. *Enregistrer le comptage* le
range dans l'historique de l'année (date, billets, pièces, total, solde du journal, écart,
remarque), conservé dans `registre.json` avec les pièces ; chaque comptage peut être repris pour
correction ou supprimé. *Reprendre le dernier comptage* pré-remplit les quantités du comptage
précédent pour ne corriger que ce qui a changé.

## Utilisation (fichier HTML seul, sans installation)

La même application existe en un seul fichier HTML, pour un PC où l'exécutable ne peut pas être
lancé :

1. Copier `dist/Caisse-ecoles.html` sur le PC (clé USB, courriel, téléchargement depuis GitHub).
2. Double-cliquer dessus : il s'ouvre dans le navigateur (Edge, Chrome, Firefox). Rien n'est
   envoyé sur internet, tout se passe dans le navigateur ; l'application fonctionne hors ligne.
3. **Étape 1 – Base des écritures** : par défaut *Registre de l'année* (celui de la saisie des
   pièces : les pièces scannées viennent à la suite, et le fichier Excel produit contient tout).
   *Classeur Excel existant* ajoute les pièces à la suite d'un classeur en cours (et permet de
   reprendre ses écritures dans le registre) ; *Nouveau classeur* demande la date et le montant du
   solde à nouveau (le solde final du dernier fichier généré est proposé d'un clic). **Aucun
   classeur n'est nécessaire pour lire les pièces** : la base de référence est intégrée à
   l'application. Vérifier le n° du compte caisse (`9100.104` par défaut).
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

## Lectures croisées : OCR local, Tesseract natif, moteur historique

La couche texte du PDF (produite par le copieur) est lue instantanément ; c'est elle qui remplit le
tableau. Ensuite, si l'option *Seconde lecture par OCR local* est cochée (étape 1, par défaut),
chaque pièce est relue sur son image par un moteur de reconnaissance de caractères embarqué dans
le fichier HTML (Tesseract, logiciel libre, exécuté en WebAssembly dans le navigateur) :

- **rien ne sort du PC** : ni réseau, ni service externe, ni installation ; le moteur et le
  modèle de langue français sont dans le fichier (environ 5 Mo de plus) ;
- chaque page est rendue à 216 dpi, puis les zones du formulaire sont relues une à une :
  n° de pièce, colonnes DOIT / SOMME / AVOIR, Total, date, bloc libellé. Les champs numériques
  sont lus sur l'image brute (mode le plus fiable mesuré), le libellé sur une image dont les
  traits du tableau ont été effacés ;
- **confrontation champ par champ** avec la couche texte : lu deux fois à l'identique → champ
  confirmé (liseré vert) ; illisible dans la couche texte mais lu par l'OCR → complété (bleu) ;
  lectures différentes → orange, avec un bouton *Prendre …* pour retenir la seconde lecture ;
  jeton illisible du libellé (« 0^. 05.25 ») → remplacé par le mot OCR situé au même endroit ;
- une **page scannée sans reconnaissance de texte** (PDF image) est d'abord lue entièrement par
  l'OCR : si c'est une pièce, elle entre dans le lot comme les autres, avec les relectures par
  zone ;
- le tableau est utilisable dès la lecture de la couche texte ; la seconde lecture tourne en
  arrière-plan (environ une seconde par pièce) et ses constats arrivent à la fin, sans toucher
  aux corrections déjà saisies.

Mesuré sur 102 pièces réelles : la seconde lecture confirme 413 champs sur 510, ne contredit
aucun champ correct, et retrouve seule 102 n°, 102 dates, 102 comptes et 101 totaux sur 102.
Avec le troisième lecteur (version portable) : 418 champs confirmés, 4 corrections d'office,
0 divergence à trancher ; et sans aucune couche texte (PDF image), les lecteurs OCR seuls
retrouvent 99 montants, 99 dates et 99 comptes sur 102 (contre 83 montants avec un seul OCR).
Le libellé reste le champ où la couche texte et l'OCR se complètent le mieux (« chœur », « 7-11S »
et les dates sont mieux lus par l'OCR ; les mentions manuscrites ne sont lues par aucun des deux
et sont signalées en orange).

L'OCR ne lit pas l'écriture manuscrite : ces mentions restent à saisir, et l'application les
signale (*Libellé illisible par endroits*).

### Troisième lecteur (version portable Windows)

L'application fenêtrée embarque en plus **Tesseract natif** (dossier `tesseract/` à côté de
l'exécutable, comme pour Décompte DGEO) avec deux modèles français : `fra` (tessdata_best,
flottant, le plus précis) et `fra_leg` (modèle combiné, pour le **moteur historique** qui relit
les zones numériques). Chaque zone est donc lue par trois ou quatre lecteurs indépendants, et
les lectures sont **votées** champ par champ (`src/ocr.js`, `crossRead`) :

- une valeur soutenue par deux lectures est confirmée (liseré vert) ;
- la couche texte n'est corrigée d'office (bleu) que si les lectures OCR concordent entre elles
  **et** que la correction est plausible : compte connu à la place d'un compte inconnu, total
  cohérent avec la colonne SOMME, n° dont la lecture texte contenait des caractères parasites,
  date dont la lecture texte était abîmée ;
- sinon la divergence reste orange, avec un bouton *Prendre …* ;
- quand les lectures divergent, les zones concernées sont **relues à 360 dpi** par le lecteur
  natif avant le vote.

Les lecteurs travaillent en parallèle (worker WebAssembly + processus natifs) : comptez une à
deux secondes par pièce. Sans dossier `tesseract/` (fichier HTML seul), l'application se limite
à la double lecture.

### Mémoire des corrections

Une correction faite à la main (compte, n°, mot du libellé, ou un choix parmi les propositions)
est mémorisée sur ce PC. La même lecture corrigée deux fois de la même façon est ensuite
corrigée d'office, en bleu, avec la mention *d'après vos corrections précédentes*.

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
npm run build        # -> dist/Caisse-ecoles-avec-noms.html (version interne, jamais versionnée)
npm run build:public # -> dist/Caisse-ecoles.html (version publique, sans les noms)
cd desktop && npm install && npm start          # application fenêtrée depuis les sources (Electron)
cd desktop && npm run dist:win                  # dossier portable Windows dist/win-unpacked/ (sur Windows)
cd desktop && node smoke-test.js [chemin/exe]   # test de fumée de la fenêtre
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
- `src/ocr.js` – seconde lecture par OCR local : prétraitement, zones, confrontation des lectures, moteur embarqué
- `build.js` – assemble tout (avec pdf.js, ExcelJS, tesseract.js et le modèle français, pdf-lib, la police Inter) dans `dist/` : `Caisse-ecoles.html` sans les noms (versionné), `Caisse-ecoles-avec-noms.html` avec (exclu du dépôt)
- `src/dossier.js` – dossier scanné pour Décompte DGEO : pages « PIÈCE COMPTABLE » retirées avant l'analyse (pdf.js, pdf-lib, analyseur)
- `desktop/dgeo-proxy.js` – passerelle locale devant Décompte DGEO (multipart, nettoyage du dossier via la page)
- `src/comptage.js` – comptage de la caisse (grille des coupures, soldes, historique) ; modèle dans `registre.js` (`countTotal`, `upsertCount`, `previousCount`, `balanceAt`)
- `src/index.html`, `src/app.css` – interface : barre latérale (Saisie des pièces / Pièces scannées / Compter la caisse, réduite à un rail d'icônes sous 1500 px), cartes, indicateurs du journal, tableaux, icônes SVG en ligne ; police Inter (SIL OFL) embarquée, jetons de couleur dans `:root`
- `src/registre.js` – registre des pièces par année : modèle, libellé composé, validation, journal, stockage (fichiers ou navigateur)
- `src/pdfpiece.js` – fiche « PIÈCE COMPTABLE » en PDF (pdf-lib) avec justificatifs
- `src/saisie.js` – onglet de saisie (fiche, journal, Excel, PDF, sauvegarde)
- `desktop/` – application fenêtrée (Electron) : `main.js` (fenêtre à onglets, Décompte DGEO démarré avec l'application, pont décompte → pièce, fichiers du registre, dossier `data/`, fichier des noms), `shell.html` (barre d'onglets Compta Blonay, badge des décomptes à saisir), `dgeo-theme.css` (thème injecté dans la page de Décompte DGEO pour le même aspect : police, couleurs, arrondis), `preload.js` (`CaisseFiles`, `CaisseNative`, `CaisseDgeo`), `native-ocr.js` (Tesseract natif), `smoke-test.js`, `build/` (icône, LISEZMOI portable)

## Limites

- Le PDF doit contenir une couche texte (scan avec OCR). Un PDF « image » seule est signalé
  et ne peut pas être traité.
- L'OCR du scanner peut confondre certains caractères ; les corrections automatiques couvrent les
  cas fréquents, mais la relecture à l'étape 3 reste nécessaire.
- Une pièce scannée sans couche texte n'est pas reconnue : les pages sans texte sont listées
  avec un bouton pour les afficher, et la pièce peut être ajoutée à la main.
- Quand une pièce porte plusieurs comptes de contrepartie, le premier est proposé et la
  ligne est signalée pour choisir le bon.
