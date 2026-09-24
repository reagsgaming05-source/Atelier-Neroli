# Caisse écoles – Saisie des pièces comptables et journal de caisse

Application locale, sans installation. Un écran = un travail, dans la barre latérale :

- **Saisie des pièces** : la fiche « PIÈCE COMPTABLE » se remplit dans l'application (n°, date,
  type, objet, classe, personne, compte proposé, montant, sens fixé par le type d'écriture,
  justificatifs joints). Chaque pièce enregistrée entre dans le journal de l'année, conservé dans
  les fichiers de l'application ; à la fin : le fichier Excel de l'année et le PDF des pièces
  (fiche + justificatifs). En tête, un bandeau d'une ligne rappelle l'année ouverte, le nombre de
  pièces, le solde à nouveau, le solde actuel et le compte caisse — les réglages eux-mêmes sont
  dans *L'année*.
- **Pièces scannées** : lecture des fiches déjà remplies à la main et scannées, avec lectures
  croisées (couche texte, OCR local, Tesseract natif). Sous l'aiguillage « Quel papier va où ? »,
  la zone où déposer les PDF est la première chose de l'écran ; les réglages de lecture sont
  repliés dessous, avec un résumé d'une ligne de leur état. Les pièces lues entrent dans le
  journal de l'année dès la lecture, et « Vérifié » coché ici vaut vérification au journal.
- **Boîte de réception** : les scans du copieur entrent tout seuls — les fiches imprimées par
  l'application, revenues signées, reconnues à leur code QR. Voir *Du copieur au journal*.
- **Compter la caisse** : nombre de billets (1000, 200, 100, 50, 20, 10) et de pièces de monnaie
  (5, 2, 1, 50, 20, 10 et 5 centimes), total compté, dernier solde compté et nouveau solde avec
  leurs dates, écart avec le solde du journal à cette date, historique des comptages dans le
  registre, relevé de caisse à faire viser.
- **L'année** : ce qu'on règle une fois par année (année ouverte, solde à nouveau, compte caisse,
  visas du relevé) et ce qui protège la caisse (reprendre un classeur commencé à la main, faire
  une sauvegarde, en restaurer une et, dans l'application fenêtrée, l'endroit où sont les
  données). On n'y va presque jamais : c'est pour cela qu'il a son écran, au lieu d'encombrer la
  saisie. Voir *L'année*.
- **Listes** : les listes que l'application propose partout — comptes comptables, classes,
  personnes, objets, types d'écriture. On y ajoute ce qui manque, on en retire ce qui ne sert
  plus ; c'est gardé avec les données de la caisse et repris à chaque ouverture. Retirer ne change
  aucune pièce déjà enregistrée : seules les listes déroulantes cessent de la proposer. Voir
  *Les listes*.

Les messages de la saisie, du journal et de *L'année* s'affichent dans une zone fixe en bas de la
fenêtre, quel que soit l'espace ouvert et l'endroit où l'on a fait défiler la page
(`src/avis.js`) : sous le journal, où ils s'ajoutaient avant, une année réelle les envoyait à des
milliers de pixels sous l'écran, et une erreur d'écriture passait pour un clic sans effet. Une
réussite reste 12 secondes, un avertissement 25 ; une erreur, ou un message qui propose une action
(*Annuler la suppression*, *Créer la pièce maintenant*…), reste jusqu'à ce qu'on le ferme. Un
message survolé ne s'efface pas.

La version portable Windows s'appelle **Compta Blonay** : une seule application pour les deux
outils du dépôt. La barre du haut de la fenêtre porte deux boutons toujours visibles,
**Caisse écoles** et **Décompte DGEO** (courses d'école & camps) ; le sélecteur « Changer
d'outil », en tête de la barre latérale, fait la même chose. Choisi, Décompte DGEO s'affiche au
complet dans la même page, avec ses propres raccourcis dans la barre latérale (*Dossier PDF*,
*Dossier & effectifs*, *Justificatifs*, *Lignes du décompte*, puis *Récapitulatif*, *Boîte de
réception* et *Réglages*), démarré avec la fenêtre et arrêté avec elle. Chaque outil se rouvre là
où on l'avait laissé. Un pont relie les deux : chaque décompte terminé dans Décompte DGEO est
proposé dans la caisse comme pièce DECOMPTE pré-remplie.

Le journal de caisse Excel est produit dans le même format que le classeur existant :

| Date | No | Compte | Libellé | Débit | Crédit | Solde |
|------|----|--------|---------|-------|--------|-------|

Le solde est une formule cumulée (`=G(n-1)+E(n)-F(n)`), comme dans le classeur d'origine.
Le compte caisse au **DOIT** de la pièce donne un **Débit** (entrée en caisse), le compte
caisse à l'**AVOIR** donne un **Crédit** (sortie de caisse). La colonne *Compte* reçoit le
compte de contrepartie.

## Version portable Windows « Compta Blonay » (recommandée) — application fenêtrée, aucune installation

1. Téléchargez **`ComptaBlonay-windows.zip`** depuis la page *Releases* du dépôt (version
   « Compta Blonay — Windows portable (dernière version) »).
2. Décompressez le zip où vous voulez (Bureau, Documents, clé USB…).
3. Double-cliquez sur **`ComptaBlonay.exe`** : la fenêtre de l'application s'ouvre, agrandie la
   première fois, sur *Caisse écoles* ; le bouton *Décompte DGEO* de la barre du haut passe à
   l'autre outil. Le `LISEZMOI.txt` du zip est le mode d'emploi pour les collègues ; il se
   rouvre dans l'application par *Aide → Mode d'emploi* (touche F1).

Tout est inclus dans le dossier : rien à installer, rien n'est écrit dans le registre ni dans
*Program Files*, aucun navigateur n'est sollicité, aucune donnée ne quitte le PC. Les registres,
les justificatifs et ce que le poste mémorise (vocabulaire appris, mémoire des corrections, taille
et position de la fenêtre) vont dans le sous-dossier `data/` à côté de l'exécutable.

### La fenêtre

- **Où l'on est.** Le titre de la fenêtre — celui que montrent la barre des tâches et Alt+Tab —
  dit l'espace ouvert : « Saisie des pièces – Caisse écoles – Compta Blonay ». « Compta Blonay »
  seul ne disait pas où l'on en était. La fenêtre s'ouvre agrandie la première fois (ouverte en
  1440 px, elle débordait d'un écran de portable), puis comme on l'a laissée, pourvu qu'elle se
  voie encore sur un des écrans : un second écran débranché ne l'envoie pas hors de vue.
- **Où sont les données.** À droite de la barre du haut, un bouton le dit : « Données sur ce PC »,
  « Données partagées : » suivi du dossier, ou, en orange, « Caisse de ce PC seulement : le
  serveur ne répondait pas ». Un clic mène à *L'année → Où sont les données*, comme le menu
  *Aide → « Où sont mes données ? »*.
- **Menus.** *Fichier* (ouvrir le dossier des données, Quitter), *Affichage* (Agrandir, Réduire,
  Taille normale, Plein écran), *Espaces* (Ctrl+1 à Ctrl+6 pour les six espaces de Caisse écoles,
  Ctrl+7 pour Décompte DGEO, Ctrl+8 pour le Récapitulatif des décomptes), *Aide* (« Mode
  d'emploi », F1, qui ouvre le `LISEZMOI.txt` ; « Où sont mes données ? » ; pour l'informatique,
  le fichier de suivi technique `caisse.log` ; *À propos de Compta Blonay*).
- **Boîtes « OK / Annuler » en français.** Electron dessine les questions de la page
  (`confirm()`, `alert()`) avec ses boutons d'origine, « OK » et « Cancel », que le réglage de
  langue ne traduit pas — alors que plusieurs questions renvoient à « Annuler ». Elles sont
  remplacées, pour Caisse écoles comme pour Décompte DGEO, par les boîtes du programme
  (`desktop/boites-preload.js`, textes dans `desktop/dialogues.js`) : « OK » et « Annuler », le
  premier paragraphe en titre, et « Annuler » comme bouton par défaut quand la question supprime,
  retire, efface, remplace, écrase ou vide quelque chose — une touche Entrée donnée par réflexe
  ne détruit rien.
- **Fermer sans rien perdre.** Une fiche commencée et pas enregistrée retient la fermeture :
  « La fiche en cours n'est pas enregistrée », avec *Revenir à la fiche* (aussi Échap) ou *Fermer
  sans enregistrer*. Si la page de Décompte DGEO retient la sienne (décompte pas terminé), la
  question est la même : *Revenir au décompte* ou *Fermer sans terminer*.
- **Les erreurs en français.** Une erreur de fichier dit sa cause (« le serveur ne répond pas… »,
  « le fichier est ouvert ailleurs… », « le disque (ou le dossier du serveur) est plein ») au lieu
  du message système en anglais ; le détail technique va au fichier de suivi.

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
L'effacer — ou *Revenir aux données de ce PC*, dans la même carte — ramène aux données du PC, qui
n'ont pas bougé. Sur un poste installé depuis le serveur (voir plus bas), c'est le `donnees.txt`
du serveur qui compte : le lanceur le recopie à chaque démarrage, et la carte le dit au lieu de
proposer un changement qui ne tiendrait pas. Pour un déploiement par l'informatique, la variable
d'environnement `COMPTA_DONNEES` fait la même chose et passe avant le fichier.

| Ce qui va sur le serveur | Ce qui reste sur chaque PC |
|---|---|
| registres et justificatifs, listes (`donnees.json`), réglages de la caisse, documents en attente dans la Boîte de réception, décomptes DGEO terminés et dossiers analysés (`caisse\`) | le profil de la fenêtre (caches, stockage local — vocabulaire appris, mémoire des corrections —, taille de la fenêtre) : Chromium y verrouille ses fichiers, et deux PC sur le même profil se bloqueraient au démarrage |
| le dépôt du copieur (`Scans\`) | le fichier de suivi technique (`data\caisse.log`) |
| le bac des décomptes (`Décomptes\`), où l'on propose aussi d'enregistrer le fichier Excel d'un décompte | les décomptes commencés dans Décompte DGEO (`data\decompte\`) |

**Deux collègues en même temps.** Chaque poste retient le texte exact du registre qu'il a lu. À
l'enregistrement, si le fichier a changé entre-temps, rien n'est écrasé : les deux versions sont
**fusionnées** — ce que ce poste a fait, plus ce que l'autre a fait —, et l'écran le dit. Une pièce
touchée d'un seul côté prend la version de ce côté ; touchée des deux côtés, la plus récente
l'emporte et on vous le signale ; modifiée d'un côté et supprimée de l'autre, elle est gardée (une
suppression se refait d'un clic, une saisie perdue ne se retrouve pas). Deux pièces qui ont pris
« le numéro suivant » au même moment sont gardées toutes les deux, et le numéro en double est
signalé. Une restauration de sauvegarde, elle, remplace — c'est ce qu'on lui demande.
Revenir à la fenêtre relit le registre : les pièces saisies sur un autre poste apparaissent, et
le n° que propose la fiche suit. Juste avant d'enregistrer, le registre est relu encore une fois :
si le n° proposé vient d'être pris ailleurs, rien n'est enregistré, la fiche prend le suivant et
le dit — le n° est le lien avec la fiche papier, qu'il ne faut pas imprimer en double.

**Serveur éteint.** Au démarrage, l'application vérifie qu'elle peut écrire dans le dossier des
données ; si la réponse tarde, une petite fenêtre « Connexion au dossier des données… » le dit
(un serveur éteint fait attendre Windows jusqu'à 15 secondes). S'il ne répond pas, elle le dit,
avec la cause, et attend : *Réessayer*, *Quitter*, ou *Travailler sur ce PC pour cette fois…*.
Elle ne s'ouvre jamais en douce sur les données du poste : on y saisirait dans une caisse à part,
qui ne rejoindrait jamais celle du serveur. Le troisième choix pose d'abord une seconde question,
qui dit ce que contient la caisse de ce PC (souvent rien, ou une copie ancienne) et que ce qui y
sera saisi n'ira pas sur le serveur ; puis il l'ouvre pour cette séance seulement. `donnees.txt`
n'est pas effacé : au lancement suivant, l'application cherche de nouveau le serveur, et d'ici là
la barre du haut le rappelle en orange. Effacer ce fichier ne tenait pas : sur un poste installé
depuis le serveur, le lanceur le remettait au démarrage suivant, et les pièces saisies entre-temps
restaient dans une caisse que plus rien n'ouvrait. Un enregistrement qui échoue en cours de route
(réseau coupé) s'affiche en rouge — « Journal non enregistré », avec sa cause — et reste à
l'écran jusqu'à ce qu'on le ferme ; la pièce n'est pas annoncée comme enregistrée.

**Installer sur chaque PC, mettre à jour une seule fois.** Le serveur distribue aussi le
programme, sans Internet : on y pose une copie de référence, et chaque PC fait tourner la sienne,
rafraîchie au lancement.

    \\SERVEUR\Partage\ComptaBlonay\           le programme : la seule copie à remplacer
    \\SERVEUR\Partage\ComptaBlonay-donnees\   la caisse de tout le monde

1. Sur le PC qui tient la caisse aujourd'hui, avec cette version : *Mettre les données sur le
   serveur…* vers `ComptaBlonay-donnees` et *Emporter* (voir plus haut). Dans cet ordre : un PC
   installé depuis le serveur part d'une copie neuve, sans les registres de l'ancienne.
2. Compta Blonay fermé, le dossier `ComptaBlonay` du zip sur le serveur, **à côté** de
   `ComptaBlonay-donnees`.
3. Sur chaque PC, une fois : double-clic sur **Installer sur ce PC**, dans le sous-dossier
   *Installation sur plusieurs PC* du dossier du serveur. Le programme est copié dans
   `%LOCALAPPDATA%\ComptaBlonay` (le profil de la personne, sans droits d'administrateur : chaque
   session Windows du PC refait cette étape), et un raccourci **Compta Blonay** posé sur le
   bureau.

L'installateur fait lui-même ce qui se ratait à la main :

- **Le dossier des données.** S'il n'y a pas encore de `donnees.txt` dans le dossier du programme
  sur le serveur et qu'un dossier `ComptaBlonay-donnees` (avec sa caisse) est à côté, il écrit ce
  `donnees.txt`, une fois pour tous les postes. Une lettre de lecteur réseau (`S:\…`) y est notée
  sous son adresse `\\…`, la même sur tous les PC. S'il ne trouve rien, il prévient que ce PC
  aurait sa propre caisse, séparée de celle des collègues, et demande avant de continuer. Il
  affiche, avant de copier, d'où vient le programme et où sont les données.
- **Pas depuis un dossier local.** Lancé depuis un dossier du PC (le zip décompressé sur le Bureau,
  par exemple), il explique que pour un seul PC il suffit d'ouvrir `ComptaBlonay.exe`, et demande
  avant de continuer.
- **Compta Blonay ouvert sur ce PC.** Il demande de le fermer, puis continue : des fichiers
  verrouillés ne se copient pas.
- **La fin se voit.** « Installation terminée », le raccourci à utiliser désormais, puis, sur une
  touche, l'application démarre.

Le raccourci lance `%LOCALAPPDATA%\ComptaBlonay-lanceur.cmd`, une copie de
`Installation sur plusieurs PC\lanceur.cmd` rangée hors du dossier du programme (qu'une mise à jour
réécrit). Il compare le `version.txt` du serveur à celui du PC — un par construction : commit,
numéro, date — et ne recopie que s'ils diffèrent ; sinon le démarrage est immédiat. La fenêtre
noire dit ce qu'elle fait : « Recherche d'une nouvelle version sur le serveur… », « Copie du
programme sur ce PC… » à la première installation, « Mise à jour… » ensuite, et « Le serveur ne
répond pas » quand il est éteint (elle reste alors quelques secondes, le temps de le lire, puis la
version du poste démarre). La copie (`robocopy /MIR`) rend le PC identique au serveur, fichiers
retirés compris, sauf le profil `data\` du poste ; `version.txt` n'est noté qu'à la fin, si bien
qu'une copie interrompue est reprise au lancement suivant au lieu de passer pour faite.
`donnees.txt` et `vocabulaire-noms.js` viennent du serveur quand il en a, et le PC garde les siens
sinon.

Mettre à jour, c'est copier le contenu du dossier `ComptaBlonay` du nouveau zip par-dessus celui
du serveur ; chaque PC suit à son prochain lancement. Ce qui ne copie pas : un PC où l'application
est ouverte (des fichiers verrouillés, deux versions mélangées — il suivra la fois d'après), un
serveur éteint (le PC démarre sa version), un second double-clic pendant une copie (il attend la
fin : le lanceur tient un verrou que Windows relâche même si la fenêtre est fermée). Le lanceur se
met lui-même à jour avec le programme ; celui des postes installés avant le sous-dossier
*Installation sur plusieurs PC* est remplacé par l'application à son démarrage suivant.
*Aide → À propos de Compta Blonay* dit quelle version tourne sur le poste : « version du » suivi
de la date de construction, et, pour l'informatique, le n° de construction et le commit. Tout
cela est éprouvé sous Windows par la construction (treize scénarios : dossier local refusé,
première installation, même version, nouvelle version, serveur éteint, application ouverte, deux
lancements en même temps, lanceur mis à jour, installation depuis une adresse `\\…`, etc.).

**Noms de personnes** : le dépôt étant public, la version portable ne contient aucun nom. Posez
le fichier `vocabulaire-noms.js` (remis séparément, jamais publié) à côté de `ComptaBlonay.exe` :
il est lu au démarrage (*Aide → À propos de Compta Blonay* indique s'il a été trouvé). Avec un
serveur, il suffit de le poser une fois dans le dossier du programme sur le serveur : le lanceur
le distribue. Sans lui, les noms s'apprennent en chargeant un classeur existant.

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
local de Décompte DGEO sur un port libre (le bouton *Décompte DGEO* de la barre du haut indique
*démarre…*), l'affiche au complet quand on le choisit, avec toutes ses fonctions (analyse du
dossier PDF, effectifs, pièces, part État, décompte Excel), et l'arrête à la fermeture de la
fenêtre. Ses dossiers — les décomptes commencés, qui se reprennent plus tard — vont dans
`data\decompte\` du poste, même quand la caisse est sur le serveur. S'il s'arrête, sa page le dit
avec un bouton *Relancer Décompte DGEO* (*Réessayer* s'il n'a pas démarré), et rouvrir l'espace le
relance aussi ; sans le dossier `decompte/`, le bouton de la barre du haut dit *non inclus* et la
page explique quoi faire. Ses raccourcis vers les sections de sa page sont grisés tant qu'aucun
dossier n'est ouvert, et suivent la section affichée. Dans le fichier HTML seul, Décompte DGEO
n'affiche qu'une explication : il fait partie de l'application Windows.

**Dossier nettoyé avant l'analyse** : le dossier scanné pour un décompte commence par la pièce
comptable de la caisse (fiche imprimée depuis l'application ou remplie à la main), que Décompte
DGEO ne doit pas lire. Une passerelle locale placée devant Décompte DGEO confie chaque dossier
déposé à Caisse écoles, qui retire les pages « PIÈCE COMPTABLE » reconnues par leur texte (et, si
le dossier n'a aucun texte lisible, la première page : réglage dans *Réglages*, dans la barre
latérale de Décompte DGEO), puis transmet le reste : Décompte DGEO ne voit que le formulaire de
couverture et les tickets. La note des *Réglages* dit ce qui a été retiré, et la réponse
transmise à Décompte DGEO le porte aussi. Une analyse demandée avec toutes les pages transmet le
dossier entier.

**Formulaire du dossier affiché à côté** : chaque dossier scanné contient le « Formulaire de
décompte camp & course » de Blonay (page de couverture manuscrite). Après l'analyse, ce formulaire
s'affiche dans un volet à droite de Décompte DGEO (image agrandissable d'un clic) avec, sous
*Repris dans le décompte*, ce que Décompte DGEO y a lu : type, activité, classe(s), dates,
responsable, budget, effectifs, noms des enseignant-e-s et des accompagnants ; les dépenses du
formulaire (payé par l'enseignant-e, par la commune, coût total, et leur total) ; puis, sous
*Décompte*, les *Justificatifs comptés* (« N sur M lus » : ceux qui entrent dans le décompte, sur
ceux qui ont été lus) et la part de l'État, tenue à jour à chaque enregistrement du décompte (avec
l'heure), et les remarques de Décompte DGEO. Les dossiers analysés sont retenus (les trente
derniers, `caisse\dossiers-dgeo.json` dans le dossier des données) et se choisissent dans une
liste quand il y en a plusieurs ; la croix du volet le masque, le bouton *Formulaire du dossier*
le rouvre (la case est aussi dans *Réglages*).

**Pont entre les deux outils** : quand un décompte est terminé dans Décompte DGEO (bouton
*Créer le fichier Excel du décompte*), la fenêtre retient le dossier (n°, course d'école ou camp,
classe, dates, enseignant-e, montants) dans le dossier des données (`caisse\decomptes-dgeo.json`).
Un message le dit aussitôt, sous la page de Décompte DGEO, avec *Créer la pièce maintenant* ; le
bouton *Caisse écoles* de la barre du haut dit « N décomptes à saisir », *Saisie des pièces* porte
une pastille avec ce nombre et, au-dessus de la fiche, le décompte avec *Créer la pièce* : la fiche
se pré-remplit (type DECOMPTE, objet, classe, période, détail, personne, libellé), sous un bandeau
qui dit de quel décompte elle vient ; le compte n'est rempli d'office que s'il s'impose (voir plus
bas). Le montant proposé est ce que l'enseignant-e a payé de sa poche d'après le formulaire (à
défaut le total des dépenses, à défaut la part État) ; sous le champ Montant, *Quel montant ?*
laisse les autres montants du décompte à un clic. On vérifie montant, sens et compte, puis on
enregistre : la pièce est marquée « DGEO » dans le journal et le décompte n'est plus proposé.
*Ouvrir l'Excel* ouvre le fichier du décompte enregistré (enregistré sur un autre poste, il ne se
voit pas d'ici, et le message le dit) ; *Ignorer* écarte un décompte sans pièce. Un décompte refait
après la création de sa pièce, avec une autre part de l'État, est signalé : le montant de la pièce
est à revoir. Décompte DGEO lui-même n'est pas modifié : la fenêtre observe sa requête locale de
génération.

L'exécutable est construit automatiquement par GitHub Actions
(`.github/workflows/build-caisse-windows.yml`) : tests, construction de l'application autonome,
empaquetage Electron (`desktop/`), Tesseract et Décompte DGEO ajoutés au dossier, installateur et
lanceur éprouvés, test de fumée de l'exécutable (fenêtre et barre latérale, saisie d'une pièce
jusqu'au journal et aux fichiers, moteur de lecture, OCR embarqué, Tesseract natif, Décompte DGEO
démarré avec l'application, pont décompte → pièce), puis publication du zip.

## Saisie des pièces (espace principal)

1. **Année** : le registre de l'année en cours s'ouvre (ou se crée avec, comme solde à nouveau,
   le solde final de l'année précédente). Chaque année est un registre séparé, conservé dans
   `caisse/<année>/` du dossier des données (`data/` à côté de l'exécutable, ou le serveur ;
   version portable) ou dans le navigateur (fichier HTML seul). Tout cela se règle dans l'espace
   **L'année** ; la saisie n'en garde que le bandeau de rappel, dont le bouton *Changer d'année,
   solde à nouveau…* y mène ; celui d'une année passée porte l'étiquette *année passée*. Sous le
   bandeau viennent les avis de *L'année* : la nouvelle année à créer, la carte « Pour commencer
   l'année » d'un registre vide, un solde à nouveau qui ne suit plus l'année d'avant.
2. **Fiche** : n° (proposé), date, **type d'écriture** (REMBOURSEMENT, AVANCE, DECOMPTE,
   PARTICIPATION DES PARENTS…), **objet** (course d'école, camp, mini-camp, voyage d'étude, cours de
   ski, collation, repas, matériel…), classe, dates de l'activité, détail, personne — l'étiquette
   dit « Personne qui reçoit l'argent » ou « qui remet l'argent » selon le sens. Le libellé du
   journal se compose tout seul (`TYPE - Objet classe du dates détail - Personne`) et reste
   modifiable (*modifier à la main*). Le montant accepte ce qu'on écrit sur un papier : « 400.– »,
   « 400.- », « 1'250.50 », « CHF 29.70 » ; il est réécrit (`400.00`) dès qu'on quitte le champ, et
   un texte illisible reste tel quel, signalé, au lieu de devenir 0.
   Le **compte** (« Compte (où va la dépense, d'où vient l'argent) ») se choisit dans une **liste
   déroulante** qui porte tous les comptes connus (ceux du classeur de référence et ceux déjà
   employés cette année), le plus probable en tête, chacun avec ce à quoi il sert : la description
   notée dans *Listes*, sinon les objets pour lesquels il a servi avec ce type, sinon son usage
   habituel (« DECOMPTE · Camp », « RETRAIT · Bourse communale »), avec un exemple réel de l'année
   ou de l'année d'avant et le nombre d'emplois. *Aide au choix du compte*, à côté, dit à quoi
   sert le compte choisi, ou comment choisir. La liste se filtre en tapant — par numéro (`3662`)
   comme par usage (`camp`) — se parcourt aux flèches, se choisit avec Entrée, et le champ reste
   libre : un compte inconnu se tape simplement. Même liste pour la classe, la personne et le
   compte caisse.
   **Tous les champs à choix multiple de l'application ont la même liste** : le type d'écriture
   (qui indique au passage son sens : entrée ou sortie de caisse, et, pour les types qui prêtent à
   confusion, une définition d'une ligne), l'objet, la classe, la personne, le compte caisse, les
   signataires du relevé, l'année ouverte, « Pièces à imprimer », le sens d'un type dans *Listes*,
   et le compte de chaque ligne du tableau des pièces scannées — où les comptes réellement lus sur
   la pièce passent en tête. Les listes fermées (type, objet, année, pièces à imprimer) reviennent
   à la dernière valeur connue si ce qui est tapé n'existe pas ; les champs libres (compte, classe,
   nom) gardent ce qu'on écrit.
   Le compte le plus probable pour ce type, cet objet et ce degré (primaire / secondaire) vient en
   tête de la liste — par exemple DECOMPTE + course d'école + 5P → 51000.3662.00,
   AVANCE + camp + 9S → 52000.3662.00, PARTICIPATION + cours de ski → 51000.4392.20 — et n'est
   rempli d'office que s'il s'impose (employé au moins deux fois sur trois pour ce genre de pièce) :
   un compte rempli d'office était gardé tel quel par qui ne connaît pas les comptes, qu'il
   convienne ou non. Le **sens** est fixé par la logique des libellés (un DECOMPTE se choisit) ;
   la case *changer le sens (cas exceptionnel)* le libère. Les **justificatifs** (PDF, JPG, PNG) se
   joignent par *Joindre un ticket, une facture ou une photo…* ou en glissant le fichier sur la
   fiche, et sont enregistrés avec la pièce ; chacun a *ouvrir* et *retirer*.
   Pour un **DECOMPTE**, la liste des objets laisse place à deux choix explicites : *Course
   d'école* ou *Camp*, et la case *Décompte à faire* (voir *Du copieur au journal*).
   *Aperçu de la fiche* montre la fiche PDF et ses justificatifs, même pas encore enregistrés.
3. **Enregistrer la pièce → journal** : la pièce est vérifiée (n° unique, date de l'année, compte,
   montant, sens, personne) puis ajoutée au journal, qui recalcule le solde cumulé. Chaque erreur
   s'affiche sur son champ, encadré en rouge, et dans une liste au-dessus du bouton qui dit quoi
   faire (un n° déjà pris propose *Prendre le n°* libre) ; elle se retire dès que le champ est
   corrigé. Juste avant, le registre est relu : si le n° proposé vient d'être pris sur un autre
   poste, rien n'est enregistré et la fiche prend le suivant (voir *Plusieurs postes, une seule
   caisse*). La **fiche PDF s'ouvre aussitôt dans une fenêtre d'impression**, prête à imprimer
   (Ctrl+P), seule ou avec ses justificatifs selon les deux cases sous les boutons (*Après
   l'enregistrement, ouvrir la fiche à imprimer*, *avec les justificatifs joints*) ; le réglage
   est mémorisé. Il n'y a qu'une fenêtre d'impression : la première prend la
   main, et tant qu'elle reste ouverte, la fiche suivante y remplace la précédente sans la
   reprendre — dix pièces reprises d'affilée empilaient dix fenêtres, et le Ctrl+Entrée suivant
   partait dans le PDF. Case décochée, le message d'enregistrement offre *Imprimer sa fiche*.
   Raccourci : **Ctrl+Entrée** depuis n'importe quel champ de la fiche enregistre la pièce.
   *Nouvelle pièce*, le crayon d'une autre ligne ou *Créer la pièce* d'un décompte demandent
   avant d'abandonner une fiche commencée (OK : abandonner ; Annuler : revenir à la fiche) ;
   fermer la fenêtre aussi (voir *La fenêtre*).
4. **Modifier, supprimer.** Le crayon d'une ligne du journal ouvre la pièce dans la fiche, sous un
   bandeau « Vous modifiez la pièce n° … » ; le bouton devient *Enregistrer les modifications*, et
   *Annuler la modification* y renonce sans rien changer au journal. Un justificatif retiré pendant
   la modification ne quitte le disque qu'à l'enregistrement (*garder* le remet). La corbeille
   supprime la pièce et ses justificatifs après confirmation ; le message qui le dit porte
   *Annuler la suppression*, qui remet la pièce avec ses justificatifs, et, si le n° libéré est au
   milieu de la suite, *Donner le n° … à la fiche*. Une pièce créée depuis Décompte DGEO remet son
   décompte « à saisir ».
5. **Retrouver et contrôler.** Au-dessus du journal, un champ cherche une pièce par n°, nom,
   objet, compte, date ou montant (`berger camp` = les deux conditions ; `47` = la pièce 47, pas
   les lignes dont le compte contient 47 ; `12.06.2026` = ce jour-là). La case *Seulement les
   pièces à vérifier* isole les lectures de scan pas encore confirmées. On filtre l'affichage,
   jamais le calcul : le solde de chaque ligne reste celui de l'année.
   Sous la recherche, la **suite des numéros** est contrôlée en permanence : un n° sauté est une
   pièce reçue et jamais saisie, et le message la situe entre ses voisins (« n° 3 (après le n° 2
   du 07.03.2026, avant le n° 4 du 12.03.2026) »). Les numéros employés deux fois sont cliquables.
6. **Fichier Excel de l'année** : même format que le classeur. Avant de le produire, l'application
   dit ce qu'il faut regarder (pièces incomplètes, numéros manquants ou en double, lectures de scan
   pas encore vérifiées, écart du dernier comptage) et demande confirmation. **PDF des pièces** :
   une page « PIÈCE COMPTABLE » par pièce (relisible par l'application) suivie de ses
   justificatifs, pour toutes les pièces ou depuis un n° (« Pièces à imprimer : »). Chaque ligne
   du journal a aussi ses boutons : ✓ (confirmer une lecture de scan), crayon (modifier),
   imprimante (la fiche dans la fenêtre d'impression, qui sait aussi l'enregistrer), corbeille
   (supprimer) ; le trombone montre le document complet (voir *Du copieur au journal*). Les
   étiquettes *à vérifier*, *scan*, *DGEO* et *Excel* disent d'où vient la pièce.
7. **Une seule liste : le journal.** Les pièces lues sur un scan entrent dans le journal de
   l'année **dès la lecture**, marquées *à vérifier* (fond orange, étiquette dans la colonne des
   justificatifs), avec l'image de la pièce jointe en justificatif. Elles comptent tout de suite
   dans le solde — un bandeau sous le journal dit combien attendent d'être regardées. Quand l'OCR
   finit ou que vous corrigez une ligne dans l'espace des pièces scannées, **c'est la même pièce
   qui se met à jour**, jamais une seconde, d'un jour à l'autre aussi : la pièce retrouve sa ligne
   par l'empreinte du contenu du fichier, pas par son nom ni par l'ordre d'ouverture. Une pièce
   déjà saisie à la main (même n°, même montant, même sens) n'est pas ajoutée une deuxième fois :
   la lecture s'y rattache et la pièce reste telle que vous l'avez saisie. Pour confirmer une
   lecture : le bouton ✓ de la ligne, *Tout marquer comme vérifié* dans le bandeau, ou « Vérifié »
   coché dans l'espace des pièces scannées — c'est la même vérification, et une pièce vérifiée au
   journal y est cochée ; ouvrir la pièce dans la fiche et l'enregistrer vaut aussi vérification.
   Une pièce supprimée du journal quitte le lot. Pour renoncer à un lot : *Retirer ce lot…* (ou
   *Tout retirer*) dans l'espace des pièces scannées — seules les pièces pas encore vérifiées
   partent du journal ; la croix d'un fichier fait de même pour ce fichier. Année commencée à
   l'ancienne (classeur Excel tenu à la main ou produit par les pièces scannées) : voir
   *L'année*.
8. Version portable : un décompte terminé dans **Décompte DGEO** apparaît au-dessus de
   la fiche ; *Créer la pièce* la pré-remplit (voir plus haut, *Pont entre les deux outils*).
9. **Récapitulatif des décomptes** : dans l'outil *Décompte DGEO* (barre du haut, ou Ctrl+8),
   espace *Récapitulatif*. Les pièces DECOMPTE de l'année du registre ouvert, filtrées
   (courses d'école, camps ou les deux), à cocher ; *Générer le récapitulatif (PDF)* produit un
   document avec le n° de chaque décompte, la date, la description, l'enseignant-e, la référence
   DGEO, le montant et le total des décomptes cochés (plusieurs pages si besoin).

## Compter la caisse

L'espace *Compter la caisse* sert au comptage physique : pour chaque coupure (billets de 1000,
200, 100, 50, 20, 10 CHF ; monnaie de 5, 2, 1 CHF et de 50, 20, 10, 5 centimes) on tape le
nombre, le total se calcule en direct (billets, monnaie, total compté). La date proposée est
celle du jour, ou le 31 décembre dans le registre d'une année passée. À droite, cinq
indicateurs : le **dernier solde compté** avec sa date (le comptage précédent, au besoin celui de
l'année d'avant), le **nouveau solde compté** avec sa date, la variation entre les deux, le
**solde du journal** au jour du comptage (solde à nouveau + écritures datées jusqu'à ce jour) et
l'**écart caisse / journal** : 0.00 quand la caisse correspond, sinon le montant qui manque ou qui
est en trop, ce qui signale une pièce non enregistrée ou un montant faux. Tant qu'aucune quantité
n'est tapée, ni écart ni variation ne s'affichent : l'écran s'ouvrait sur une alarme « il manque
de l'argent » valant tout le solde du journal, avant même le premier billet.

**Relevé de caisse (PDF)** : le bouton produit le formulaire officiel de la commune, rempli avec
le comptage affiché — pas besoin de l'avoir enregistré, c'est au moment où le total tombe qu'on
veut l'imprimer. Chaque comptage de l'historique a aussi le sien (imprimante), et le message
d'enregistrement l'offre. Le document reprend la mise en page du classeur *Relevé de caisse*
(feuille *Caisse des écoles*) : le décompte des coupures avec la quantité, la valeur et la somme,
le total en caisse, puis le rapprochement — *Solde en caisse au* (le total compté), *Encaissement
de la période*, *Décaissement de la période* (les entrées et les sorties du journal depuis le
point de référence) et *Situation de la caisse au* (le comptage précédent, ou le solde à nouveau
de l'année s'il n'y en a pas encore) — et les deux lignes de visa à signer, suivies de la mention
des annexes. Le formulaire tombe juste par construction : référence + encaissements −
décaissements = solde du journal. Un écart entre le total compté et le journal, ou une remarque,
est écrit sur le document : un relevé qu'on signe ne doit pas taire un écart.

Les **noms des deux signataires** se saisissent dans *L'année* et restent dans le registre de
l'année (jamais dans le dépôt). Tant qu'ils sont vides, le relevé écrit *Visa du responsable* et
*Visa du boursier*, comme le formulaire vierge.

Quand l'écart n'est pas nul, un encadré **Où chercher** le confronte au journal : l'écart vaut
souvent, au centime près, le montant d'une pièce (saisie deux fois, ou argent jamais passé en
caisse) ou son **double** du côté qui correspond (pièce inscrite en entrée au lieu de sortie, ou
l'inverse : la corriger déplace le solde de deux fois son montant). Le n° est cliquable et ouvre
la pièce dans le journal. Si plusieurs pièces portent le même montant, c'est dit au lieu d'en
désigner une au hasard ; si rien ne correspond et que la suite des numéros est complète, c'est dit
aussi — l'écart ne vient alors pas d'une seule pièce mal saisie. *Enregistrer le comptage* le
range dans l'historique de l'année (date, billets, monnaie, total compté, solde du journal, écart,
remarque), conservé dans `registre.json` avec les pièces. Le crayon (*Corriger ce comptage*) le
rouvre : le bouton devient « Enregistrer les corrections du comptage du … », et si la date change,
l'application demande s'il s'agit d'un nouveau comptage ou de la correction de l'ancien ; la
corbeille le supprime. *Partir des quantités du dernier comptage* remplit les quantités du
comptage précédent pour ne corriger que ce qui a changé : c'est un nouveau comptage, l'ancien
reste dans l'historique.

## L'année

Ce qu'on règle une fois par année, et ce qui protège la caisse. Chaque réglage est enregistré
dans le registre de l'année dès qu'on quitte le champ.

- **Année ouverte.** La liste *Année* rouvre un registre ; *Nouvelle année* en crée un. Au
  démarrage, l'application rouvre la dernière année ouverte. Quand l'année du jour n'a pas encore
  de registre (en janvier, typiquement), elle rouvre l'ancienne — les pièces de décembre arrivent
  encore — et le dit, en tête de la saisie comme ici : « Nous sommes en … », avec *Créer le
  registre …* (solde à nouveau : le solde final de l'année d'avant) ou *Rester en … (pièces de
  décembre)*. Rien ne le suggérait, et les pièces de janvier partaient dans l'ancienne année.
- **Pour commencer.** Sur un registre encore vide (ni pièce, ni comptage, ni solde de départ) et
  sans année précédente dans l'application, la carte « Pour commencer l'année … », en tête de la
  saisie, demande d'où part la caisse avant la première pièce — sinon soldes et numéros partent
  faux : *Reprendre le classeur Excel de …*, l'argent en caisse au 1er janvier (*Enregistrer ce
  solde*), ou *Commencer à zéro*. Le registre du tout premier lancement n'est pas écrit d'office.
- **Solde à nouveau.** Date et montant ; le journal part de ce montant. À côté du champ,
  l'application dit d'où il vient : égal au solde final de l'année d'avant (✓), ou différent, avec
  *Reprendre* ce solde final. Un changement s'y affiche avec *Annuler*. Quand le solde final d'une
  année change après coup (pièce de décembre saisie en janvier, correction), le solde à nouveau de
  l'année suivante le suit s'il en partait ; réglé à la main à un autre montant, il n'est pas
  touché, et l'écart se voit ici et en tête de la saisie (*Reprendre* ou *Garder*).
- **Compte caisse et visas du relevé.** Le compte caisse de l'année (`9100.104` par défaut) est le
  seul réglage de ce compte : la saisie comme la lecture des pièces scannées s'en servent, et c'est
  lui qui décide du sens de chaque écriture lue. L'espace des pièces scannées l'affiche sans le
  laisser modifier (*Modifier dans L'année*). Un PC gardait autrefois un second compte, pour la
  lecture, qui ne suivait pas le premier : il n'est plus lu que pour une première année et, s'il
  diffère, l'écran propose une fois de le reprendre. Les noms des deux visas du relevé de caisse
  se tapent ici.
- **Reprendre une année commencée à l'ancienne.** *Reprendre un classeur Excel…* verse dans le
  registre les écritures d'un classeur tenu à la main (ou produit par les pièces scannées) : rien
  n'est compté deux fois (même n°, même montant), un n° déjà pris avec un autre montant est
  signalé et laissé de côté, les écritures d'une autre année ne sont reprises que sur demande, le
  solde à nouveau du classeur est repris si le registre est encore vide (sinon une différence est
  signalée), la numérotation continue, et les pièces reprises sont marquées *Excel* dans le
  journal. La saisie reprend ensuite dans la fiche.
- **Sauvegardes.** *Faire une sauvegarde* enregistre un fichier
  (`Sauvegarde caisse AAAA du jj.mm.aaaa.json`) qui contient tout le journal de l'année ouverte :
  les pièces **avec leurs justificatifs** (tickets, factures, scans signés), les comptages et le
  solde à nouveau — sans les justificatifs, un PC en panne emportait tous les tickets. Les autres
  années et les listes n'y sont pas : une sauvegarde par année, et une copie des listes à part
  (voir *Les listes*). La carte dit quand la dernière sauvegarde a été faite sur ce poste, et si
  le registre a changé de nombre de pièces depuis. *Restaurer une sauvegarde…* remplace le
  registre de l'année de la sauvegarde — pas forcément l'année ouverte, et la question le dit.
  Avant, l'application dit ce qui serait perdu (pièces saisies depuis, corrections, comptages, solde à
  nouveau changé), puis garde une copie de sécurité du registre remplacé, rangée avec les
  justificatifs de l'année (`pieces/copies-de-securite/`) : *Annuler la restauration*, dans le
  message, ou *Remettre ce journal*, dans la carte, le remet. Les justificatifs de la sauvegarde
  qui manquent sur le poste sont remis ; une sauvegarde plus ancienne, sans justificatifs, se
  restaure encore.
- **Où sont les données** (application fenêtrée) : le dossier des données, sur ce PC ou sur le
  serveur ; *Mettre les données sur le serveur…* (*Changer de dossier…* quand elles y sont déjà),
  *Revenir aux données de ce PC*, *Ouvrir le dossier des données*. Voir *Plusieurs postes, une
  seule caisse*. La barre du haut et *Aide → « Où sont mes données ? »* mènent à cette carte.

## Utilisation (fichier HTML seul, sans installation)

La même application existe en un seul fichier HTML, pour un PC où l'exécutable ne peut pas être
lancé :

1. Copier `dist/Caisse-ecoles.html` sur le PC (clé USB, courriel, téléchargement depuis GitHub).
2. Double-cliquer dessus : il s'ouvre dans le navigateur (Edge, Chrome, Firefox). Rien n'est
   envoyé sur internet, tout se passe dans le navigateur ; l'application fonctionne hors ligne.
3. **1 – Vos fiches remplies à la main, scannées (PDF)** : glisser un ou plusieurs PDF de pièces
   (ex. `Pce 01 à 33.pdf`, `Pce 34 à 60.pdf`). C'est la première chose de l'écran, sous
   l'aiguillage « Quel papier va où ? » (fiche remplie à la main : ici ; fiche imprimée par
   l'application et revenue signée : Boîte de réception ; ticket, facture, photo : Saisie des
   pièces, joint à la fiche de sa pièce). Les fichiers sont classés par nom (ordre naturel) et
   listés avec leur nombre de pièces ; on peut les monter/descendre, les trier par nom, en
   retirer, en ajouter plus tard sans perdre les corrections déjà faites. Un fichier déjà chargé
   (même contenu) est ignoré ; une photo déposée ici renvoie vers la saisie ; un PDF de fiches
   revenues signées (reconnues à leur code QR) n'est pas relu (voir plus bas). Le PDF
   « consultable » du copieur (avec reconnaissance de texte) est le plus rapide ; un PDF sans
   texte est lu sur l'image, plus lentement.
4. **Réglages de la lecture** (volet replié sous la zone de dépôt, avec un résumé d'une ligne de
   son état) : par défaut *Journal de l'année (Saisie des pièces)* : les pièces scannées viennent
   à la suite, et le fichier Excel produit contient tout. *Classeur Excel existant* ajoute les
   pièces à la suite d'un classeur en cours (et *Reprendre ces écritures dans le journal de
   l'année* les y verse) ; *Nouveau classeur (nouvelle année)* demande la date et le montant du
   solde à nouveau (le solde final du dernier fichier généré est proposé d'un clic). Sur ces deux
   bases, *Verser au journal de l'année*, à l'étape 3, fait entrer le lot au registre. **Aucun
   classeur n'est nécessaire pour lire les pièces** : la base de référence est intégrée à
   l'application. Le compte caisse y est rappelé, mais il se règle dans *L'année*. La case
   *Relire chaque pièce sur l'image*, cochée par défaut, lance la seconde lecture (voir
   *Lectures croisées*).
5. **2 – Vérification des écritures** : chaque ligne est déjà au journal, marquée « à vérifier ».
   Les lignes ⚠ **orange** demandent un contrôle attentif ; les lignes ✓ vertes ont été lues sans
   ambiguïté. Dans une ligne orange, **la cellule en doute est colorée** (numéro, date, compte,
   libellé ou montant), la raison s'affiche sous la ligne et au survol. Les cellules **bleues**
   signalent une correction automatique (mot, nom ou compte caisse mal lu). Cliquer sur une ligne
   affiche la pièce à droite avec les zones lues encadrées : **orange** pour la zone en doute,
   **bleu** pour les autres ; un clic sur l'image l'agrandit en plein écran. Dès qu'une cellule
   orange est corrigée elle redevient normale, et la ligne passe au vert quand tous ses doutes sont
   traités. Quand vous avez regardé une pièce, cochez **Vérifié** : c'est la même vérification que
   dans le journal, et une correction faite ici y arrive aussi. Pour aller vite : la case
   *Seulement les lignes à vérifier*, *Prochaine ligne à vérifier*, le bouton *Vérifié →
   suivante*, le raccourci **Ctrl+Entrée** qui valide la ligne affichée et saute à la suivante,
   et *Tout marquer vérifié* (qui prévient s'il reste des lignes orange). *Écriture manuelle*
   ajoute une ligne à la main ; la croix d'une ligne la sort du lot, et sa pièce du journal si
   elle n'y était pas encore vérifiée.
6. **3 – Contrôle et fichier Excel** : le tableau de contrôle récapitule le lot (pièces ajoutées
   au journal, suite des numéros, doublons, pièces déjà au journal, lignes incomplètes ou en doute,
   pièces vérifiées, pièces jamais affichées, totaux). Avec le registre de l'année, le
   rapprochement montre le dernier comptage enregistré et son écart avec le journal, et renvoie à
   *Compter la caisse*. Avec un classeur, on inscrit l'**argent compté en caisse** : l'application
   affiche l'écart avec le solde calculé, nomme les pièces qui l'expliquent exactement (sens
   inversé, pièce comptée deux fois) et propose la correction. *Fichier Excel de l'année*
   enregistre `Caisse écoles AAAA.xlsx` ; toute anomalie restante demande une confirmation
   explicite. *Rapport de contrôle* ouvre un récapitulatif imprimable à conserver avec les pièces.
   Un bandeau dit que le lot est dans le journal et combien de pièces y restent « à vérifier »,
   avec *Ouvrir le journal* et *Retirer ce lot…*.

Les copies de pièces jointes à d'autres pièces (même numéro, même montant) sont ignorées
automatiquement, y compris d'un fichier à l'autre ; les numéros manquants dans la séquence sont
signalés. Avec plusieurs fichiers, la colonne *Page* indique le fichier (F1, F2…) et la page.

Dans le fichier HTML seul, il n'y a pas de dossier du copieur à surveiller : les fiches revenues
signées se déposent dans *Pièces scannées*, qui les reconnaît à leur code et propose, après
confirmation, de les joindre à leurs pièces.

## Ce que l'application lit sur une pièce

Formulaire « PIÈCE COMPTABLE » : le numéro (en haut au milieu), les comptes des colonnes
DOIT et AVOIR, la SOMME et le Total, les lignes du libellé (type en majuscules, description,
personne) et la date sous le tableau. Le libellé du journal est composé ainsi :
`TYPE - Description - Personne` (ex. `REMBOURSEMENT - Collation chœur 7-11S concert du 12.12.2024 - Ch. Dupraz`).
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
- le nom de la personne est corrigé d'après les noms connus (`T. Moret` → `T. Morel`) ;
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
- une initiale lue en minuscule (`l. Duvernay`) est tranchée d'après les noms connus, sans
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
3. **Le rapprochement de caisse** : l'argent compté est comparé au solde calculé. C'est le
   contrôle final, celui qui révèle toute écriture mal lue, y compris celles qu'aucune règle ne
   pouvait détecter. Avec le registre de l'année, il se fait dans *Compter la caisse*, dont
   l'encadré *Où chercher* désigne les pièces qui valent l'écart ou sa moitié. Avec un classeur
   Excel, le solde réel se tape à l'étape 3, et l'application cherche elle-même ce qui explique
   exactement l'écart : une pièce comptée deux fois, ou jusqu'à trois pièces prises dans le
   mauvais sens (un décompte de camp peut aller dans les deux sens, aucune règle ne le signale ;
   le rapprochement, si). Elle nomme les pièces et propose d'inverser leur sens en un clic, après
   vérification sur la pièce.

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
7 retraits, tous en entrée. Un type ajouté dans *Listes* reçoit le sens qu'on y déclare.

## Lectures croisées : OCR local, Tesseract natif, moteur historique

La couche texte du PDF (produite par le copieur) est lue instantanément ; c'est elle qui remplit le
tableau. Ensuite, si la case *Relire chaque pièce sur l'image* est cochée (volet *Réglages de la
lecture* ; cochée par défaut, réglage gardé sur le PC), chaque pièce est relue sur son image par
un moteur de reconnaissance de caractères embarqué dans le fichier HTML (Tesseract, logiciel
libre, exécuté en WebAssembly dans le navigateur) :

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
  zone ; sinon (ticket, photo), elle est laissée de côté ;
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
est présent, dans `dist/Caisse-ecoles-avec-noms.html`, exclu du dépôt, et l'indique dans son
message ; `npm run build:public` construit sans, et c'est cette version qui est versionnée dans
`dist/`). Une version téléchargée depuis le dépôt fonctionne de la même manière, sans la
correction des noms ; charger une fois un classeur les rétablit. Un test automatique vérifie
qu'aucun nom ne se glisse dans le fichier versionné.

## Du copieur au journal

La fiche « PIÈCE COMPTABLE » imprimée porte un petit code QR de 16 mm, dans la marge haute au
bord droit du cadre. Il ne contient que l'année et l'identifiant de la pièce — ni nom, ni
montant, ni libellé : une feuille qui traîne ou qui part chez un tiers ne dit rien à personne.

    CB1-2026-PLX9K2M3ABCDE

**Où le copieur envoie.** L'application tient son propre dossier de dépôt, surveillé d'office :

    <dossier des données>\Scans

Ce dossier suit les **données** de la caisse. Quand elles sont sur le serveur (voir
*Plusieurs postes, une seule caisse* plus haut), l'adresse est une adresse du serveur, et le
copieur la vise telle quelle. La *Boîte de réception* l'affiche en toutes lettres, dans le volet
*Où le copieur dépose ses scans*, avec *Copier l'adresse* et *Ouvrir*. D'autres dossiers peuvent
s'ajouter à côté (*Ajouter un dossier…*), si le copieur dépose déjà ailleurs ; *Regarder le
dossier maintenant* n'attend pas le passage suivant.

Ne **lancez** pas le programme depuis le serveur pour y arriver : c'est ce que ce document
conseillait d'abord, et cela échoue — voir la section citée (le serveur peut en garder la copie de
référence, que chaque PC recopie chez lui).

Sur le copieur (bizhub ou autre), c'est une destination « SMB » du carnet d'adresses : hôte,
chemin du partage, un compte et un mot de passe qui ont le droit d'y écrire. Tant que ce n'est
pas réglé, enregistrer la pièce jointe d'un scan reçu par e-mail dans ce dossier donne
exactement le même résultat.

Le trajet, une fois le copieur réglé en « numériser vers un dossier » (SMB) :

1. vous imprimez les fiches, l'enseignant-e signe ;
2. vous empilez, chaque fiche au-dessus de ses tickets, et vous passez tout au copieur **en un
   seul envoi** ;
3. l'application prend le PDF dans le dossier surveillé, **découpe la pile à chaque code** — la
   page qui porte un code ouvre un document, qui court jusqu'au code suivant, donc une fiche
   emporte ses justificatifs — et rend chaque document à **sa** ligne du journal ;
4. chaque document attend votre accord dans la **Boîte de réception** — la liste des documents
   vient en premier —, puis vient se joindre à sa pièce comme justificatif signé
   (`piece-signee.pdf`) : *Joindre à la pièce* pour un document, *Joindre les N pièces
   reconnues* pour toute une pile (après une confirmation qui dit lesquelles ; celles qui ont
   déjà leur scan signé sont laissées de côté).

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
donc pas à réimprimer quoi que ce soit.

**Et la même chose dans l'application.** Plus bas dans la Boîte de réception, la carte *Décomptes
à faire* montre le même bac, groupé *Camp* / *Course d'école* : n°, libellé, montant, et la
mention **signée** pour ceux dont le scan est revenu (« pas encore scannée » sinon). La liste est
faite depuis le journal, pas depuis le dossier — un décompte coché apparaît donc dès
l'enregistrement de la fiche, avant même d'être imprimé. *Voir* ouvre son scan dans le cadre
d'aperçu ; *Fait* décoche la case et descend le fichier de `Décomptes\À faire\…` vers
`Décomptes\`. Le dossier et la liste disent donc toujours la même chose, quel que soit le côté par
lequel on range. *Ouvrir le dossier*, en tête de la carte, ouvre `Décomptes\` dans l'explorateur,
qui dit ce qu'il reste à faire sans passer par l'application.

**Relire une pièce sans produire un fichier.** Le trombone d'une ligne du journal (il porte le
nombre de justificatifs) montre le **document complet** — la fiche, puis ses justificatifs, dont
le scan signé — dans le cadre d'aperçu, sans rien enregistrer sur le disque. L'aperçu dit de
quelle pièce il parle, si bien qu'on peut demander celui d'une ligne sans ouvrir sa fiche : une
saisie en cours n'est pas perdue. Le bouton imprimante de la même ligne ouvre la fiche dans la
fenêtre d'impression, qui sait aussi l'enregistrer comme fichier.

Sur la fiche, chaque justificatif a un *ouvrir* à côté de *retirer* : il montre **ce fichier-là
seul**, tel qu'il est enregistré — le scan signé sans la fiche regénérée, ou la photo d'un ticket
pour la relire de près. Les PDF, les JPEG et les PNG s'affichent dans le cadre ; un autre format
le dit plutôt que de ne rien montrer. Le justificatif posé par le copieur porte la mention
*signé*.

La case « Joindre tout seuls les documents reconnus sans doute possible, sans me demander », dans
le volet *Où le copieur dépose ses scans*, saute l'étape 4 pour les pièces reconnues sans
ambiguïté. Elle est décochée au départ, et volontairement : un classement qui se trompe une fois
sur dix coûte plus cher que pas de classement du tout.

Ce qui est prévu, et éprouvé :

| Le cas | Ce que fait l'application |
|---|---|
| le copieur écrit encore | rien n'est pris : la taille doit être immobile depuis un moment **et** le PDF doit se terminer (`%%EOF`) |
| PDF coupé net | rangé dans `à revoir\`, avec une note disant pourquoi ; la Boîte de réception dit lequel et pourquoi, et ouvre ce dossier |
| plusieurs postes sur le même dossier | réservation par déplacement atomique dans `.encours\<poste>\` : un scan n'est pris que par un poste |
| l'application ouverte deux fois sur le même PC | chaque exécution marque ses réservations : la seconde fenêtre ne reprend pas ce que la première est en train de lire |
| un poste s'éteint en plein travail | ses scans sont repris par un autre après deux heures (dix minutes s'il s'agit d'une autre fenêtre du même PC) |
| serveur injoignable | signalé à l'écran, la veille continue et reprend au retour |
| un scan attend déjà dans le dossier quand on ouvre l'application | rien n'est pris avant que la page sache lire une pile : la veille ne démarre qu'une fois l'application chargée, et se met en pause le temps d'un rechargement. Le scan reste dans le dossier et part au tour suivant, au lieu de finir dans `à revoir\` |
| feuille scannée à l'envers, de travers | le code se lit dans les quatre orientations |
| « PDF compact » du copieur | la redondance du code (25 %) encaisse l'écrasement des nuances |
| pile posée à l'envers | une pile qui commence par des pages sans code est signalée : les tickets sont peut-être partis avec la fiche d'avant |
| vieille fiche sans code, code illisible, pièce introuvable | présentée telle quelle, jamais rattachée au hasard : on tape le n° de sa pièce (« Pièce n° » puis *Joindre à cette pièce*) ou on l'écarte ; un document sans code peut aussi partir dans Pièces scannées (*Lire comme fiche remplie à la main*) |
| même fiche passée deux fois | signalée « deux fois dans cette pile » ; le bouton proposé est *Écarter ce doublon*, *Remplacer le scan joint…* reste possible |
| **dans tous les cas** | le fichier d'origine est déplacé dans `traité\AAAA-MM`, **jamais détruit** |

Les documents en attente de validation vivent dans le dossier des données
(`caisse\reception\`), pas dans le dossier du copieur : fermer l'application ne perd rien.

## Les listes

La base de référence et l'apprentissage automatique donnent des listes déjà justes, mais ils ne
savent rien d'une classe qui vient d'être créée ni d'un compte qui vient d'être ouvert. L'espace
**Listes** (le « carnet des données », `src/carnet.js` et `src/donnees.js`) ajoute ce qui manque
et retire ce qui ne sert plus, pour les cinq listes à choix de l'application. Chaque liste est une
carte repliée ; dans une carte, un seul champ sert à chercher et à ajouter, ce qui montre tout de
suite si la valeur (ou une écriture voisine, « 7P2 » pour « 7P/2 ») existe déjà.

| Liste | Où elle sert | Particularité |
|---|---|---|
| Classes | champ *Classe*, reconnaissance des classes dans les libellés lus | |
| Personnes | champ *Personne*, visas du relevé de caisse | jamais publié : voir ci-dessus |
| Comptes comptables | compte de la fiche, compte caisse, compte d'une pièce scannée | *Modifier* note à quoi sert le compte : cette description s'affiche à côté du numéro, ici et dans la fiche |
| Objets | objet de l'activité (libellé, compte proposé) | l'ordre de la liste intégrée est gardé, « Autre » en dernier |
| Types d'écriture | premier mot du libellé | on déclare son sens (entrée, sortie, ou selon la pièce) ; un type que la logique des libellés fixe déjà le montre |

Le carnet ne porte que la différence : ce qu'on a ajouté, ce qu'on a retiré. Il est relu à
chaque ouverture et s'applique partout — listes déroulantes, comptes proposés, correction des
lectures. **« Retiré » l'emporte durablement** : les pièces scannées enrichissent le vocabulaire
toutes seules, et sans cela un compte retiré serait revenu à la première relecture. Retirer ne
touche à aucune écriture : une pièce déjà enregistrée garde son compte, son libellé et son
montant ; si la valeur est employée par des pièces de l'année ouverte, le message le dit. Chaque
changement se défait d'un clic (*Annuler* dans le message), et les valeurs retirées figurent en
bas de leur carte, d'où un clic les remet.

| Version | Où le carnet est gardé |
|---|---|
| application fenêtrée | `caisse/donnees.json` du dossier des données (sur ce PC, ou sur le serveur), avec une copie `donnees.bak.json` |
| fichier HTML seul | mémoire locale du navigateur (`caisse.donnees`) |

*Enregistrer une copie des listes…* en fait un fichier JSON — à garder, ou à reprendre sur un
autre PC (*Remplacer par une copie…*, qui remplace les changements du PC après confirmation). Les
listes ne sont pas dans la sauvegarde de l'année.

## Développement

```bash
cd caisse-ecoles
npm install          # pdf.js, ExcelJS, tesseract.js, pdf-lib, qrcode-generator, jsQR, Inter
npm run build        # -> dist/Caisse-ecoles-avec-noms.html si les noms sont là (jamais versionnée)
npm run build:public # -> dist/Caisse-ecoles.html (version publique, sans les noms)
cd desktop && npm install && npm start          # application fenêtrée depuis les sources (Electron)
cd desktop && npm run dist:win                  # dossier portable Windows dist/win-unpacked/ (sur Windows)
cd desktop && node smoke-test.js [chemin/exe]   # test de fumée de la fenêtre
node desktop/shot.js [dossier]                  # copies d'écran de chaque espace (desktop/shots/)
npm test             # tous les tests (node --test test/*.test.js)
```

Le test d'intégration `test/sample.test.js` compare les pièces d'un vrai PDF au classeur de
référence si l'on place `samples/pieces.pdf` et `samples/caisse.xlsx` (dossier non versionné,
car il contient des données personnelles).

Tests (`test/`), sans Electron ni navigateur (les écrans sont simulés quand il le faut) :

- lecture des pièces : `parser`, `corrections`, `ocr`, `vocabulaire`, `sample` ; aides communes
  dans `helpers.js` (formulaire « PIÈCE COMPTABLE » synthétique) ;
- registre et fiche : `registre`, `invariants`, `arrondi`, `donnees-hostiles`, `liste-comptes`,
  `fiche`, `retrouver-controler`, `partage` (plusieurs postes sur le même registre) ;
- l'année, le comptage et les fichiers produits : `annee`, `releve-caisse`, `excel`, `pdfpiece` ;
- pièces scannées et boîte de réception : `lot-scanne`, `scans`, `pile`, `marque`, `veille`
  (avec `aide-copieur.js`, un faux copieur qui écrit ses PDF par morceaux) ;
- listes : `donnees`, `donnees-ergonomie` ;
- Décompte DGEO : `dossier`, `dgeo-ergonomie` ;
- fenêtre et livraison : `navigation` (titre, placement, erreurs expliquées, boîtes OK / Annuler,
  fermeture avec une fiche en cours, démarrage sans serveur, barre du haut, À propos, zone des
  messages, barre latérale lisible), `emplacement`, `lanceur`, `empaquetage` (tout module de
  `desktop/` part dans l'exécutable), `lisezmoi` (chaque libellé cité dans le LISEZMOI existe à
  l'écran).

Structure :

- `src/parser.js` – analyse de la couche texte des pièces (positions des mots → champs → écriture)
- `src/vocabulaire.js`, `src/vocabulaire-noms.js` – base de référence intégrée (générée)
- `tools/build-vocab.js` – génère cette base depuis un classeur
- `src/excel.js` – lecture d'un classeur existant et génération du classeur au format du modèle
- `src/ocr.js` – seconde lecture par OCR local : prétraitement, zones, confrontation des lectures, moteur embarqué
- `build.js` – assemble tout (avec pdf.js, ExcelJS, tesseract.js et le modèle français, pdf-lib, qrcode-generator, jsQR, la police Inter) dans `dist/` : `Caisse-ecoles.html` sans les noms (versionné), `Caisse-ecoles-avec-noms.html` avec (exclu du dépôt)
- `src/index.html`, `src/app.css` – interface : barre latérale (sélecteur d'outil, espaces de Caisse écoles, raccourcis de Décompte DGEO ; les noms des espaces toujours affichés, sans sous-titre sous 1500 px, un mot sous chaque icône sous 1200 px), cartes, indicateurs du journal, tableaux, zone des messages, icônes SVG en ligne ; police Inter (SIL OFL) embarquée, jetons de couleur dans `:root`
- `src/app.js` – espace Pièces scannées (fichiers, lecture, lectures croisées, vérification, contrôle du lot, rapport), navigation entre les espaces et les outils, volet « Formulaire du dossier » et raccourcis de Décompte DGEO
- `src/lot.js` – le lot scanné et le journal : clé des pièces par empreinte du contenu du fichier, versement au journal, « Vérifié » et corrections qui y passent, pièces supprimées qui quittent le lot, bilan du lot (sans fenêtre, éprouvé dans Node)
- `src/registre.js` – registre des pièces par année : modèle, libellé composé, comptes proposés, validation, journal, recherche et suite des numéros, comptages, fusion entre postes, stockage (fichiers ou navigateur)
- `src/annee.js` – ce qui relie une année à la suivante (solde à nouveau), l'année proposée au démarrage, le registre vierge, l'écart du comptage, les contrôles avant le fichier Excel, la sauvegarde avec justificatifs et la restauration (bilan, question, copie de sécurité) — la partie sans écran de L'année, éprouvée dans Node
- `src/saisie.js` – espace de saisie (fiche, journal, Excel, PDF, pont avec Décompte DGEO, récapitulatif des décomptes) et espace L'année (année ouverte, solde à nouveau, sauvegardes, reprise d'un classeur, où sont les données)
- `src/avis.js` – les messages : une zone fixe en bas de la fenêtre, durée selon le genre, messages qui restent tant qu'ils proposent une action
- `src/pdfpiece.js` – fiche « PIÈCE COMPTABLE » en PDF (pdf-lib) avec justificatifs, récapitulatif des décomptes, relevé de caisse
- `src/comptage.js` – comptage de la caisse (grille des coupures, soldes, pistes d'écart, historique, relevé) ; modèle dans `registre.js` (`countTotal`, `upsertCount`, `previousCount`, `balanceAt`, `explainGap`)
- `src/combo.js` – liste déroulante d'un champ : `attach()` pour un champ libre, `fromSelect()` pour une liste fermée du navigateur (le `<select>` reste en place, caché, et garde la valeur)
- `src/dossier.js` – dossier scanné pour Décompte DGEO : pages « PIÈCE COMPTABLE » retirées avant l'analyse (pdf.js, pdf-lib, analyseur)
- `src/marque.js` – la marque de la pièce : écrire le code QR (qrcode-generator), le poser sur la fiche, le relire sur un scan (jsQR)
- `src/pile.js` – découpe d'une pile scannée aux marques, rapprochement de chaque document avec sa pièce, et rangement des décomptes (sans dépendance, éprouvé sur table)
- `src/reception.js` – boîte de réception : lecture des pages, découpe, validation, justificatif joint à la pièce (ou à la pièce dont on tape le n°), et bac des décomptes à faire (liste tenue depuis le journal)
- `src/carnet.js` – carnet des listes : ajouts et retraits de l'utilisateur sur les cinq listes, lecture tolérante d'un fichier abîmé, `appliquer()` rend le vocabulaire vu à travers le carnet (sans dépendance, éprouvé hors navigateur)
- `src/donnees.js` – espace « Listes » : les cinq cartes, l'ajout, le retrait, la remise, la description d'un compte, le sens d'un type, la copie des listes
- `desktop/` – application fenêtrée (Electron) :
  - `main.js` – fenêtre et barre du haut, menus, Décompte DGEO démarré avec l'application, pont décompte → pièce, fichiers du registre, dossier `data/`, emplacement des données et démarrage sans serveur, veille du dossier scanné, fichier des noms, boîtes de dialogue ;
  - `shell.html`, `shell-preload.js` – la barre du haut : les deux boutons d'outil et l'emplacement des données ;
  - `preload.js` – ce que la page reçoit : `CaisseFiles` (registres, justificatifs, carnet des listes), `CaisseEmplacement`, `CaisseScan` (veille du dossier scanné, boîte de réception, bac des décomptes), `CaisseNative`, `CaisseDgeo`, `CaisseFenetre` (espace ouvert, outil choisi dans la barre du haut) ; les erreurs du programme y sont dites en français ;
  - `boites-preload.js` – `confirm()` et `alert()` remplacés par les boîtes « OK / Annuler » du programme (Caisse écoles et Décompte DGEO) ;
  - `dialogues.js` – ce que disent la fenêtre et ses boîtes, sans dépendance à Electron : titre, taille à l'ouverture, erreurs expliquées, boîtes, dossier des données injoignable, fermeture refusée, À propos ;
  - `emplacement.js` – où vivent les données : `donnees.txt`, `COMPTA_DONNEES`, dossier utilisable, copie des registres (« Emporter ») ;
  - `lanceur.js` – remplace le lanceur des postes installés avant le sous-dossier *Installation sur plusieurs PC* ;
  - `veille.js` – surveillance du dossier scanné : stabilité du fichier, réservation atomique entre postes, rangement dans `traité\` ou `à revoir\` (sans dépendance) ;
  - `dgeo-proxy.js` – passerelle locale devant Décompte DGEO (multipart, nettoyage du dossier via la page, résumé de chaque dossier analysé ou enregistré pour le volet) ;
  - `dgeo-theme.css` – thème injecté dans la page de Décompte DGEO pour le même aspect (police, couleurs, arrondis) ;
  - `native-ocr.js` – Tesseract natif ;
  - `prepare-app.js` (copie de `dist/Caisse-ecoles.html` et de la police dans `desktop/app/`), `smoke-test.js`, `shot.js` ;
  - `build/` – icône, LISEZMOI portable, `Installer sur ce PC.cmd` et `lanceur.cmd`

## Limites

- La lecture la plus sûre part d'une couche texte (PDF « consultable » du copieur). Un PDF sans
  texte est lu sur l'image par l'OCR, plus lentement, et seulement si *Relire chaque pièce sur
  l'image* est cochée ; sinon il est signalé et rien n'y est lu.
- L'OCR du scanner peut confondre certains caractères ; les corrections automatiques couvrent les
  cas fréquents, mais la relecture à l'étape 2 (*Vérification des écritures*) reste nécessaire.
- Une page sans fiche lisible (ticket, photo, fiche que rien n'a pu lire) est listée avec un
  bouton pour l'afficher ; une fiche restée illisible s'ajoute à la main (*Écriture manuelle*).
- Quand une pièce porte plusieurs comptes de contrepartie, celui habituellement employé pour ce
  type est proposé (à défaut, le premier lu) et la ligne est signalée, avec un bouton par compte
  lu pour choisir le bon.
