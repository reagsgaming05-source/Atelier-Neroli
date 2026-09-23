# Caisse écoles – Saisie des pièces comptables et journal de caisse

Application locale, sans installation. Un écran = un travail, dans la barre latérale :

- **Saisie des pièces** : la fiche « PIÈCE COMPTABLE » se remplit dans l'application (n°, date,
  type, objet, classe, personne, compte proposé, montant, sens fixé par le libellé, justificatifs
  joints). Chaque pièce enregistrée entre dans le journal de l'année, conservé dans les fichiers
  de l'application ; à la fin : le fichier Excel de l'année et le PDF des pièces (fiche +
  justificatifs). En tête, un bandeau d'une ligne rappelle l'année ouverte, le solde à nouveau,
  le solde actuel et le compte caisse — les réglages eux-mêmes sont ailleurs.
- **Pièces scannées (PDF)** : lecture des pièces déjà remplies à la main et scannées, avec
  lectures croisées (couche texte, OCR local, Tesseract natif). La zone où déposer les PDF est la
  première chose de l'écran ; les réglages de lecture sont repliés dessous, avec un résumé d'une
  ligne de leur état. Les pièces lues entrent dans le journal de l'année dès la lecture.
- **Boîte de réception** : les scans du copieur entrent tout seuls. Voir *Du copieur au journal*.
- **Compter la caisse** : nombre de billets (1000, 200, 100, 50, 20, 10) et de pièces (5, 2, 1,
  50, 20, 10 et 5 centimes), total compté, dernier solde compté et nouveau solde avec leurs
  dates, écart avec le solde du journal à cette date, historique des comptages dans le registre.
- **L'année** : ce qu'on règle une fois par année (année ouverte, solde à nouveau, compte caisse,
  visas du relevé) et la maintenance du registre (reprendre un classeur commencé à la main, faire
  une sauvegarde, en restaurer une). On n'y va presque jamais : c'est pour cela qu'il a son écran,
  au lieu d'encombrer la saisie.
- **Données** : les listes que l'application propose partout — comptes comptables, classes,
  personnes, objets, types d'écriture. On y ajoute ce qui manque, on en retire ce qui ne sert
  plus ; c'est gardé sur le PC et repris à chaque ouverture. Retirer ne change aucune pièce déjà
  enregistrée : seules les listes déroulantes cessent de la proposer. Voir *Le carnet des
  données*.

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

### Plusieurs postes, une seule caisse

**Le programme reste sur chaque PC ; seules les données vont sur le serveur.** Lancer
`ComptaBlonay.exe` depuis un partage réseau échoue souvent, et c'est normal : 350 Mo relus par le
réseau à chaque démarrage, et surtout un programme non signé qui en lance d'autres
(`DecompteDGEO.exe`, `tesseract.exe`) et ouvre des ports locaux, depuis un partage — le portrait
exact de ce que la sécurité d'un réseau d'école bloque d'office.

*L'année → Où sont les données → Mettre les données sur le serveur…* : dans la fenêtre, tapez
l'adresse `\\SERVEUR\Partage` dans la barre du haut (pas une lettre de lecteur — elle change d'un
PC à l'autre, et le copieur ne la connaît pas), créez un dossier et choisissez-le. Le premier poste
propose d'y **emporter** ses registres ; les suivants trouvent la caisse et s'y rattachent sans
rien copier — un dossier qui a déjà sa caisse n'est jamais écrasé. L'application redémarre sur le
serveur.

Le réglage est un fichier `donnees.txt` à côté de l'exécutable : une ligne, l'adresse du dossier
(le Bloc-notes suffit ; les guillemets de *Copier en tant que chemin d'accès* sont acceptés).
L'effacer ramène aux données du PC, qui n'ont pas bougé. Pour un déploiement par l'informatique,
la variable d'environnement `COMPTA_DONNEES` fait la même chose et passe avant le fichier.

| Ce qui va sur le serveur | Ce qui reste sur chaque PC |
|---|---|
| registres, justificatifs, carnet des données, réglages de la caisse (`caisse\`) | le profil de la fenêtre (caches, stockage local) : Chromium y verrouille ses fichiers, et deux PC sur le même profil se bloqueraient au démarrage |
| le dépôt du copieur (`Scans\`) | le journal du poste (`data\caisse.log`) |
| le bac des décomptes (`Décomptes\`) | les dossiers de Décompte DGEO |

**Deux collègues en même temps.** Chaque poste retient le texte exact du registre qu'il a lu. À
l'enregistrement, si le fichier a changé entre-temps, rien n'est écrasé : les deux versions sont
**fusionnées** — ce que ce poste a fait, plus ce que l'autre a fait —, et l'écran le dit. Une pièce
touchée d'un seul côté prend la version de ce côté ; touchée des deux côtés, la plus récente
l'emporte et on vous le signale ; modifiée d'un côté et supprimée de l'autre, elle est gardée (une
suppression se refait d'un clic, une saisie perdue ne se retrouve pas). Deux pièces qui ont pris
« le numéro suivant » au même moment sont gardées toutes les deux, et le numéro en double est
signalé. Une restauration de sauvegarde, elle, remplace — c'est ce qu'on lui demande.

**Serveur éteint.** Au démarrage, l'application vérifie qu'elle peut écrire dans le dossier des
données. Sinon elle le dit et attend : *Réessayer*, *Quitter*, ou *Revenir aux données de ce PC*.
Elle ne s'ouvre jamais en douce sur les données du poste : on y saisirait dans une caisse à part,
qui ne rejoindrait jamais celle du serveur. Un enregistrement qui échoue en cours de route (réseau
coupé) s'affiche en rouge, et la fiche n'annonce plus « pièce enregistrée ».

**Installer sur chaque PC, mettre à jour une seule fois.** Le serveur distribue aussi le
programme, sans Internet : on y pose une copie de référence, et chaque PC fait tourner la sienne,
rafraîchie au lancement.

    \\SERVEUR\Partage\ComptaBlonay\           le programme : la seule copie à remplacer
    \\SERVEUR\Partage\ComptaBlonay-donnees\   la caisse de tout le monde

1. Sur le PC qui tient la caisse aujourd'hui, avec cette version : *Changer de dossier…* vers
   `ComptaBlonay-donnees` et *Emporter* (voir plus haut). Dans cet ordre : un PC installé depuis
   le serveur part d'une copie neuve, sans les registres de l'ancienne.
2. Le dossier `ComptaBlonay` du zip sur le serveur, avec à côté de l'exécutable un `donnees.txt`
   qui désigne `ComptaBlonay-donnees` — tous les postes le reçoivent.
3. Sur chaque PC, une fois : double-clic sur **Installer sur ce PC** dans le dossier du serveur.
   Le programme est copié dans `%LOCALAPPDATA%\ComptaBlonay` (le profil de la personne, sans
   droits d'administrateur), et un raccourci **Compta Blonay** posé sur le bureau.

Ce raccourci lance `Compta Blonay.cmd` (recopié hors du dossier du programme, qu'une mise à jour
réécrit). Il compare le `version.txt` du serveur à celui du PC — un par construction : commit,
numéro, date — et ne recopie que s'ils diffèrent ; sinon le démarrage est immédiat. La copie
(`robocopy /MIR`) rend le PC identique au serveur, fichiers retirés compris, sauf le profil
`data\` du poste ; `version.txt` n'est noté qu'à la fin, si bien qu'une copie interrompue est
reprise au lancement suivant au lieu de passer pour faite. `donnees.txt` et `vocabulaire-noms.js`
viennent du serveur quand il en a, et le PC garde les siens sinon.

Mettre à jour, c'est copier le contenu du nouveau zip par-dessus le dossier du serveur ; chaque
PC suit à son prochain lancement. Ce qui ne copie pas : un PC où l'application est ouverte (des
fichiers verrouillés, deux versions mélangées — il suivra la fois d'après), un serveur éteint (le
PC démarre sa version), un second double-clic pendant une copie (il attend la fin : le lanceur
tient un verrou que Windows relâche même si la fenêtre est fermée). Le lanceur se met lui-même à
jour avec le programme. *Aide → À propos* dit quelle construction tourne sur le poste. Tout cela
est éprouvé sous Windows par la construction, installation depuis une adresse `\\…` comprise.

**Noms de personnes** : le dépôt étant public, la version portable ne contient aucun nom. Posez
le fichier `vocabulaire-noms.js` (remis séparément, jamais publié) à côté de `ComptaBlonay.exe` :
il est lu au démarrage (menu *Aide → À propos* indique s'il a été trouvé). Sans lui, les noms
s'apprennent en chargeant un classeur existant.

**Les dates s'affichent en français même si Windows ne l'est pas.** Les champs *date* ne sont pas
dessinés par l'application : c'est Windows qui les habille, dans sa langue. Sur un poste en
anglais ils affichaient `mm/dd/yyyy`, et le 3 septembre se lisait alors 9 mars — une date de pièce
lue à l'envers ne se voit pas avant le bouclement. L'application impose donc sa langue au
démarrage, et le champ affiche `jj/mm/aaaa` partout (vérifié en photographiant le champ avec et
sans).

Le bouton des champs *fichier*, lui, continue d'afficher « Choose File » : ce texte-là ne suit pas
le réglage. Il n'a pas de conséquence sur ce qui est enregistré, et les boutons de l'application
qui ouvrent un fichier sont, eux, en français.

Au premier lancement, Windows SmartScreen peut afficher « Windows a protégé votre ordinateur »
(exécutable non signé) : cliquez sur *Informations complémentaires* puis *Exécuter quand même*.

**Décompte DGEO dans la même application** : le zip contient aussi la version portable de
Décompte DGEO (dossier `decompte/`, prise dans la release « windows-latest » du dépôt). Il n'y a
qu'un programme à ouvrir, `ComptaBlonay.exe` : au démarrage, il lance en arrière-plan le serveur
local de Décompte DGEO sur un port libre (le menu du logo indique *démarre…* puis, une fois
Décompte DGEO choisi, affiche le logiciel complet, avec toutes ses fonctions : analyse du dossier
PDF, effectifs, pièces, part État, décompte Excel) et l'arrête à la fermeture de la fenêtre.
Raccourci : Ctrl+7 ; Ctrl+1 à Ctrl+6 ramènent aux espaces de Caisse écoles. Ses dossiers vont
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
   (fichier HTML seul). Tout cela se règle dans l'espace **L'année** ; la saisie
   n'en garde que le bandeau de rappel, dont le bouton *Changer d'année, solde à nouveau…* y mène.
2. **Fiche** : n° (proposé), date, **type d'écriture** (REMBOURSEMENT, AVANCE, DECOMPTE,
   PARTICIPATION DES PARENTS…), **objet** (course d'école, camp, mini-camp, voyage d'étude, cours de
   ski, collation, repas, matériel…), classe, dates de l'activité, détail, personne. Le libellé du
   journal se compose tout seul (`TYPE - Objet classe du dates détail - Personne`) et reste
   modifiable. Le **compte** se choisit dans une **liste déroulante** qui porte tous les comptes
   connus (ceux du classeur de référence et ceux déjà employés cette année), le plus probable en
   tête, chacun avec ce à quoi il sert d'habitude (« DECOMPTE · Camp », « RETRAIT · Bourse
   communale ») et son côté usuel. La liste se filtre en tapant — par numéro (`3662`) comme par
   usage (`camp`) — se parcourt aux flèches, se choisit avec Entrée, et le champ reste libre : un
   compte inconnu se tape simplement. Même liste pour la classe, la personne et le compte caisse.
   **Tous les champs à choix multiple de l'application ont la même liste** : le type d'écriture
   (qui indique au passage son sens : entrée ou sortie de caisse), l'objet, la classe, la
   personne, le compte caisse, les signataires du relevé, l'année ouverte, le « PDF depuis le
   n° », et le compte de chaque ligne du tableau des pièces scannées — où les comptes réellement
   lus sur la pièce passent en tête. Les listes fermées (type, objet, année) reviennent à la
   dernière valeur connue si ce qui est tapé n'existe pas ; les champs libres (compte, classe,
   nom) gardent ce qu'on écrit.
   Le compte est proposé d'office d'après le classeur 2025 pour ce type, cet objet et ce
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
4. **Retrouver et contrôler.** Au-dessus du journal, un champ cherche une pièce par n°, nom,
   objet, compte, date ou montant (`berger camp` = les deux conditions ; `47` = la pièce 47, pas
   les lignes dont le compte contient 47 ; `12.06.2026` = ce jour-là). La case *Seulement les
   pièces à vérifier* isole les lectures de scan pas encore confirmées. On filtre l'affichage,
   jamais le calcul : le solde de chaque ligne reste celui de l'année.
   Sous la recherche, la **suite des numéros** est contrôlée en permanence : un n° sauté est une
   pièce reçue et jamais saisie, et le message la situe entre ses voisins (« n° 3, après le n° 2
   du 07.03, avant le n° 4 du 12.03 »). Les numéros employés deux fois sont cliquables.
   Raccourci : **Ctrl+Entrée** depuis n'importe quel champ de la fiche enregistre la pièce.
5. **Fichier Excel de l'année** : même format que le classeur ; **PDF des pièces** : une page
   « PIÈCE COMPTABLE » par pièce (relisible par l'application) suivie de ses justificatifs, pour
   toutes les pièces ou depuis un n°. Chaque ligne du journal a aussi ses boutons *Modifier*, *PDF*
   et *×*.
6. **Une seule liste : le journal.** Les pièces lues sur un scan entrent dans le journal de
   l'année **dès la lecture**, marquées *à vérifier* (fond orange, étiquette dans la colonne de
   droite), avec l'image de la pièce jointe en justificatif. Elles comptent tout de suite dans le
   solde — un bandeau sous le journal dit combien attendent d'être regardées. Quand l'OCR finit ou
   que vous corrigez une ligne dans l'espace des pièces scannées, **c'est la même pièce qui se met
   à jour**, jamais une seconde. Une pièce déjà saisie à la main (même n°, même montant, même
   sens) n'est pas ajoutée une deuxième fois : la lecture s'y rattache et la pièce reste telle que
   vous l'avez saisie. Pour confirmer une lecture : le bouton ✓ de la ligne, ou *Tout marquer comme
   vérifié* dans le bandeau ; ouvrir la pièce dans la fiche et l'enregistrer vaut aussi
   vérification. Pour renoncer à un lot : *Retirer ce lot du journal* dans l'espace des pièces
   scannées — seules les pièces pas encore vérifiées partent. Année commencée à l'ancienne
   (classeur Excel tenu à la main ou produit par les pièces scannées) : **Reprendre un classeur
   Excel…** sous le journal verse ses écritures dans le registre (solde à nouveau repris si le
   registre est vide, numérotation qui continue, pièces marquées *Excel*), et la saisie reprend
   dans la fiche. Le bouton *Reprendre ces écritures dans le registre* de l'espace des pièces
   scannées fait la même chose depuis un classeur chargé là.
7. Version portable : un décompte terminé dans l'onglet **Décompte DGEO** apparaît au-dessus de
   la fiche ; *Créer la pièce* la pré-remplit (voir plus haut, *Pont entre les deux onglets*).
8. **Récapitulatif des décomptes** : dans l'outil *Décompte DGEO* (sélecteur en tête de la barre
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
trop, ce qui signale une pièce non enregistrée ou un montant faux.

**Relevé de caisse (PDF)** : le bouton produit le formulaire officiel de la commune, rempli avec
le comptage affiché — pas besoin de l'avoir enregistré, c'est au moment où le total tombe qu'on
veut l'imprimer. Le document reprend la mise en page du classeur *Relevé de caisse* (feuille
*Caisse des écoles*) : le décompte des coupures avec la quantité, la valeur et la somme, le total
en caisse, puis le rapprochement — *Solde en caisse au* (le total compté), *Encaissement de la
période*, *Décaissement de la période* (les entrées et les sorties du journal depuis le point de
référence) et *Situation de la caisse au* (le comptage précédent, ou le solde à nouveau de
l'année s'il n'y en a pas encore) — et les deux lignes de visa à signer, suivies de la mention
des annexes. Le formulaire tombe juste par construction : référence + encaissements −
décaissements = solde du journal. Un écart entre le total compté et le journal, ou une remarque,
est écrit sur le document : un relevé qu'on signe ne doit pas taire un écart.

Les **noms des deux signataires** se saisissent dans *L'année* et restent dans les
données locales de l'année (jamais dans le dépôt). Tant qu'ils sont vides, le relevé écrit
*Visa du responsable* et *Visa du boursier*, comme le formulaire vierge.

Quand l'écart n'est pas nul, un encadré **Où chercher** le confronte au journal : l'écart vaut
souvent, au centime près, le montant d'une pièce (saisie deux fois, ou argent jamais passé en
caisse) ou son **double** du côté qui correspond (pièce inscrite en entrée au lieu de sortie, ou
l'inverse : la corriger déplace le solde de deux fois son montant). Le n° est cliquable et ouvre
la pièce dans le journal. Si plusieurs pièces portent le même montant, c'est dit au lieu d'en
désigner une au hasard ; si rien ne correspond et que la suite des numéros est complète, c'est dit
aussi — l'écart ne vient alors pas d'une seule pièce mal saisie. *Enregistrer le comptage* le
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
3. **Étape 1 – Vos pièces scannées (PDF)** : glisser un ou plusieurs PDF de pièces (ex.
   `Pce 01 à 33.pdf`, `Pce 34 à 60.pdf`). C'est la première chose de l'écran. Les fichiers sont
   classés par nom (ordre naturel) et listés avec leur nombre de pièces ; on peut les
   monter/descendre, en retirer, en ajouter plus tard sans perdre les corrections déjà faites.
   Les PDF doivent avoir été scannés avec reconnaissance de texte (PDF « consultable »), ce que
   fait le copieur.
4. **Réglages de la lecture** (volet replié sous la zone de dépôt, avec un résumé d'une ligne de
   son état) : par défaut *Registre de l'année* (celui de la saisie des
   pièces : les pièces scannées viennent à la suite, et le fichier Excel produit contient tout).
   *Classeur Excel existant* ajoute les pièces à la suite d'un classeur en cours (et permet de
   reprendre ses écritures dans le registre) ; *Nouveau classeur* demande la date et le montant du
   solde à nouveau (le solde final du dernier fichier généré est proposé d'un clic). **Aucun
   classeur n'est nécessaire pour lire les pièces** : la base de référence est intégrée à
   l'application. Vérifier le n° du compte caisse (`9100.104` par défaut).
5. **Étape 2 – Vérification** : seules les lignes ⚠ **orange** demandent un contrôle ; les lignes
   ✓ vertes ont été lues sans ambiguïté. Dans une ligne orange, **la cellule en doute est colorée**
   (numéro, date, compte, libellé ou montant), la raison s'affiche sous la ligne et au survol.
   Les cellules **bleues** signalent une correction automatique (mot, nom ou compte caisse mal lu).
   Cliquer sur une ligne affiche la pièce à droite avec les zones lues encadrées : **orange** pour
   la zone en doute, **bleu** pour les autres ; un clic sur l'image l'agrandit en plein écran.
   Dès qu'une cellule orange est corrigée elle redevient normale, et la ligne passe au vert quand
   tous ses doutes sont traités. Trois aides pour aller vite : la case *Afficher seulement les
   lignes à vérifier*, le bouton *✓ Vérifié → suivante*, et le raccourci **Ctrl + Entrée** qui
   valide la ligne affichée et saute à la suivante. On peut aussi ajouter une écriture manuelle.
6. **Étape 3 – Contrôle et fichier Excel** : le tableau de contrôle récapitule le lot (suite des
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

**Le centime.** Tous les montants sont arrondis au centime au même endroit (`round2`, recopié à
l'identique dans `excel.js` pour que le classeur remis dise exactement ce que l'écran affiche).
La formule évidente — multiplier par cent, arrondir, diviser — est fausse sur les demi-centimes :
`1.005` vaut `100.49999999999999` une fois multiplié, et redescendait donc à `1.00`. Un centime
perdu ne se voit pas, mais c'est un centime que le rapprochement de caisse ne retrouvera jamais.
L'arrondi décale la virgule par le texte du nombre, où le demi est resté un demi, et arrondit au
large de zéro comme le ferait une caisse (`−0.005` rend `−0.01`).

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
tableau. Ensuite, si l'option *Lectures croisées par OCR local* est cochée (volet *Réglages de la lecture*, par défaut),
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

## Du copieur au journal

La fiche « PIÈCE COMPTABLE » imprimée porte un petit code QR de 16 mm, dans la marge haute au
bord droit du cadre. Il ne contient que l'année et l'identifiant de la pièce — ni nom, ni
montant, ni libellé : une feuille qui traîne ou qui part chez un tiers ne dit rien à personne.

    CB1-2026-PLX9K2M3ABCDE

**Où le copieur envoie.** L'application tient son propre dossier de dépôt, surveillé d'office :

    <dossier des données>\Scans

Ce dossier suit les **données** de la caisse. Quand elles sont sur le serveur (voir
*Plusieurs postes, une seule caisse* plus haut), l'adresse est une adresse du serveur, et le
copieur la vise telle quelle. L'écran *Boîte de réception* l'affiche en toutes lettres, avec un
bouton pour la copier. D'autres dossiers peuvent s'ajouter à côté, si le copieur dépose déjà
ailleurs.

Ne **lancez** pas le programme depuis le serveur pour y arriver : c'est ce que ce document
conseillait d'abord, et cela échoue — voir la section citée (le serveur peut en garder la copie de
référence, que chaque PC recopie chez lui).

Sur le copieur (bizhub ou autre), c'est une destination « SMB » du carnet d'adresses : hôte,
chemin du partage, un compte et un mot de passe qui ont le droit d'y écrire. Tant que ce n'est
pas réglé, enregistrer la pièce jointe d'un scan reçu par e-mail dans ce dossier donne
exactement le même résultat.

Le trajet, une fois le copieur réglé en « numériser vers un dossier » (SMB) :

1. vous imprimez les fiches, l'enseignant-e signe ;
2. vous empilez et vous passez tout au copieur **en un seul envoi** ;
3. l'application prend le PDF dans le dossier surveillé, **découpe la pile à chaque code** — la
   page qui porte un code ouvre un document, qui court jusqu'au code suivant, donc une fiche
   emporte ses justificatifs — et rend chaque document à **sa** ligne du journal ;
4. chaque document attend votre accord dans la **Boîte de réception**, puis vient se joindre à sa
   pièce comme justificatif signé (`piece-signee.pdf`).

**Le bac à courrier des décomptes.** Sur la fiche d'un DECOMPTE, une case *Décompte à faire* dit
que le décompte DGEO reste à établir. Elle ne change rien à la comptabilité : elle décide où le
scan signé va se poser, en plus d'être joint à sa ligne du journal.

    Décomptes\
        À faire\
            Camp\                  décompte de camp marqué « à faire »
            Course d'école\        idem, course d'école
        …                          les décomptes non marqués : gardés, rien à en faire

Le genre vient de ce qui est déjà coché sur la fiche (*Camp* / *Course d'école*), pas du code QR :
celui-ci désigne la pièce, et la pièce porte le reste. Un décompte reclassé après coup n'oblige
donc pas à réimprimer quoi que ce soit. Le bouton *Ouvrir les décomptes* mène à ce dossier :
l'explorateur dit ce qu'il reste à faire sans passer par l'application.

**Et la même chose dans l'application.** En haut de la Boîte de réception, *Décomptes à faire*
montre le même bac, groupé *Camp* / *Course d'école* : n°, date, objet, enseignant-e, montant.
La liste est faite depuis le journal, pas depuis le dossier — un décompte coché apparaît donc
dès l'enregistrement de la fiche, avant même d'être imprimé, et la mention **signée** dit ceux
dont le scan est revenu. *Voir* ouvre ce scan dans la fenêtre ; *Fait* décoche la case et
descend le fichier de `Décomptes\À faire\…` vers `Décomptes\`. Le dossier et la liste disent
donc toujours la même chose, quel que soit le côté par lequel on range.

**Relire une pièce sans produire un fichier.** Une fois le scan revenu, le trombone de la ligne
du journal s'ouvre : il montre le **document complet** — la fiche, puis ses justificatifs, dont le
scan signé — dans le cadre d'aperçu, sans rien enregistrer sur le disque. L'aperçu dit de quelle
pièce il parle, si bien qu'on peut demander celui d'une ligne sans ouvrir sa fiche : une saisie en
cours n'est pas perdue. Le bouton imprimante de la même ligne continue, lui, d'enregistrer le PDF
comme fichier.

Sur la fiche, chaque justificatif a maintenant un *ouvrir* à côté de *retirer* : il montre **ce
fichier-là seul**, tel qu'il est enregistré — le scan signé sans la fiche regénérée, ou la photo
d'un ticket pour la relire de près. Les PDF, les JPEG et les PNG s'affichent dans le cadre ; un
autre format le dit plutôt que de ne rien montrer. Le justificatif posé par le copieur porte la
mention *signé*.

*Ranger automatiquement*, dans les réglages, saute l'étape 4 pour les pièces reconnues sans
ambiguïté. C'est décoché au départ, et volontairement : un classement qui se trompe une fois sur
dix coûte plus cher que pas de classement du tout.

Ce qui est prévu, et éprouvé :

| Le cas | Ce que fait l'application |
|---|---|
| le copieur écrit encore | rien n'est pris : la taille doit être immobile depuis un moment **et** le PDF doit se terminer (`%%EOF`) |
| PDF coupé net | rangé dans `à revoir\`, avec une note disant pourquoi |
| plusieurs postes sur le même dossier | réservation par déplacement atomique dans `.encours\<poste>\` : un scan n'est pris que par un poste |
| l'application ouverte deux fois sur le même PC | chaque exécution marque ses réservations : la seconde fenêtre ne reprend pas ce que la première est en train de lire |
| un poste s'éteint en plein travail | ses scans sont repris par un autre après deux heures (dix minutes s'il s'agit d'une autre fenêtre du même PC) |
| serveur injoignable | signalé à l'écran, la veille continue et reprend au retour |
| un scan attend déjà dans le dossier quand on ouvre l'application | rien n'est pris avant que la page sache lire une pile : la veille ne démarre qu'une fois l'application chargée, et se met en pause le temps d'un rechargement. Le scan reste dans le dossier et part au tour suivant, au lieu de finir dans `à revoir\` |
| feuille scannée à l'envers, de travers | le code se lit dans les quatre orientations |
| « PDF compact » du copieur | la redondance du code (25 %) encaisse l'écrasement des nuances |
| pile posée à l'envers, vieille pièce sans code | présentée telle quelle, jamais rattachée au hasard |
| même fiche passée deux fois | signalée « déjà dans cette pile » ; à vous de remplacer ou d'écarter |
| **dans tous les cas** | le fichier d'origine est déplacé dans `traité\AAAA-MM`, **jamais détruit** |

Les documents en attente de validation vivent dans les données de l'application, pas sur le
partage : fermer l'application ne perd rien.

## Le carnet des données

La base de référence et l'apprentissage automatique donnent des listes déjà justes, mais ils ne
savent rien d'une classe qui vient d'être créée ni d'un compte qui vient d'être ouvert. L'espace
**Données** ajoute ce qui manque et retire ce qui ne sert plus, pour les cinq listes à choix de
l'application :

| Liste | Où elle sert | Particularité |
|---|---|---|
| Comptes comptables | compte de contrepartie, compte caisse, compte d'une pièce scannée | on peut noter à quoi le compte sert, ce mot s'affiche dans la liste |
| Classes | champ *Classe*, reconnaissance des classes dans les libellés lus | |
| Personnes | champ *Personne*, visas du relevé de caisse | jamais publié : voir ci-dessus |
| Objets | objet de l'activité (libellé, compte proposé) | l'ordre de la liste intégrée est gardé, « Autre » en dernier |
| Types d'écriture | premier mot du libellé | on déclare son sens (entrée, sortie, ou selon la pièce) |

Le carnet ne porte que la différence : ce qu'on a ajouté, ce qu'on a retiré. Il est relu à
chaque ouverture et s'applique partout — listes déroulantes, comptes proposés, correction des
lectures. **« Retiré » l'emporte durablement** : les pièces scannées enrichissent le vocabulaire
toutes seules, et sans cela un compte retiré serait revenu à la première relecture. Retirer ne
touche à aucune écriture : une pièce déjà enregistrée garde son compte, son libellé et son
montant ; si la valeur est employée par des pièces de l'année ouverte, l'application le dit et
demande confirmation. Tout se remet d'un clic (les valeurs retirées figurent en bas de leur carte).

| Version | Où le carnet est gardé |
|---|---|
| application fenêtrée | `<données de l'application>/caisse/donnees.json`, avec une copie `donnees.bak.json` |
| fichier HTML seul | mémoire locale du navigateur (`caisse.donnees`) |

*Copie du carnet* en exporte un fichier JSON — à garder, ou à reprendre sur un autre PC
(*Reprendre un carnet…*, qui remplace celui du PC après confirmation).

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
- `src/combo.js` – liste déroulante d'un champ : `attach()` pour un champ libre, `fromSelect()` pour une liste fermée du navigateur (le `<select>` reste en place, caché, et garde la valeur)
- `src/marque.js` – la marque de la pièce : écrire le code QR (qrcode-generator), le poser sur la fiche, le relire sur un scan (jsQR)
- `src/pile.js` – découpe d'une pile scannée aux marques, et rapprochement de chaque document avec sa pièce (sans dépendance, éprouvé sur table)
- `src/reception.js` – boîte de réception : lecture des pages, découpe, validation, justificatif joint à la pièce, et bac des décomptes à faire (liste tenue depuis le journal)
- `desktop/veille.js` – surveillance du dossier scanné : stabilité du fichier, réservation atomique entre postes, rangement dans `traité\` ou `à revoir\` (sans dépendance)
- `src/carnet.js` – carnet des données : ajouts et retraits de l'utilisateur sur les cinq listes, lecture tolérante d'un fichier abîmé, `appliquer()` rend le vocabulaire vu à travers le carnet (sans dépendance, éprouvé hors navigateur)
- `src/donnees.js` – espace « Données » : les cinq cartes, l'ajout, le retrait, la remise, la copie du carnet
- `src/index.html`, `src/app.css` – interface : barre latérale (Saisie des pièces / Pièces scannées / Boîte de réception / Compter la caisse / L'année / Données, réduite à un rail d'icônes sous 1500 px), cartes, indicateurs du journal, tableaux, icônes SVG en ligne ; police Inter (SIL OFL) embarquée, jetons de couleur dans `:root`
- `src/registre.js` – registre des pièces par année : modèle, libellé composé, validation, journal, stockage (fichiers ou navigateur)
- `src/pdfpiece.js` – fiche « PIÈCE COMPTABLE » en PDF (pdf-lib) avec justificatifs
- `src/saisie.js` – onglet de saisie (fiche, journal, Excel, PDF, sauvegarde)
- `desktop/` – application fenêtrée (Electron) : `main.js` (fenêtre à onglets, Décompte DGEO démarré avec l'application, pont décompte → pièce, fichiers du registre, dossier `data/`, fichier des noms), `shell.html` (barre d'onglets Compta Blonay, badge des décomptes à saisir), `dgeo-theme.css` (thème injecté dans la page de Décompte DGEO pour le même aspect : police, couleurs, arrondis), `preload.js` (`CaisseFiles` — registres, justificatifs et carnet des données —, `CaisseScan` — veille du dossier scanné et boîte de réception —, `CaisseNative`, `CaisseDgeo`), `native-ocr.js` (Tesseract natif), `smoke-test.js`, `build/` (icône, LISEZMOI portable)

## Limites

- Le PDF doit contenir une couche texte (scan avec OCR). Un PDF « image » seule est signalé
  et ne peut pas être traité.
- L'OCR du scanner peut confondre certains caractères ; les corrections automatiques couvrent les
  cas fréquents, mais la relecture à l'étape 2 (*Vérification des écritures*) reste nécessaire.
- Une pièce scannée sans couche texte n'est pas reconnue : les pages sans texte sont listées
  avec un bouton pour les afficher, et la pièce peut être ajoutée à la main.
- Quand une pièce porte plusieurs comptes de contrepartie, le premier est proposé et la
  ligne est signalée pour choisir le bon.
