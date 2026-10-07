# Notes de version

Écrites pour un secrétariat, pas pour un développeur : ce qui change, ce qu'il faut
refaire, ce qui ne bouge pas. Chaque version publiée garde ses notes, et son archive
reste téléchargeable (page « Releases » du dépôt, étiquette `v2.1.0`, `v2.2.0`…).

## 2.1.0 — octobre 2026

### Ce qui change

**Le caviardage retire vraiment ce qu'il masque.** Un mot caviardé ne se retrouve plus
dans le fichier, ni dans les légendes d'images, ni dans les formulaires, ni dans les notes,
ni dans les métadonnées. Le PDF caviardé est reconstruit, et un contrôle indépendant
(quatre outils qui ne sont pas les nôtres) vérifie dix-sept documents piégés à chaque
construction. La recherche trouve un mot même coupé en fin de ligne ou écrit sans accent.

**Plus rien n'est détruit en silence.** À l'ouverture, un PDF signé, un PDF/A, un document
balisé ou un formulaire XFA est reconnu ; l'application dit ce que l'enregistrement
détruirait avant de le faire, et ne laisse jamais une propriété annoncée alors qu'elle
n'est plus vraie. Un PDF/A enregistré sans modification de fond reste un PDF/A.

**Deux personnes, un même document.** Quand un document est déjà ouvert par une collègue,
vous êtes prévenue. Et si elle a enregistré depuis que vous l'avez ouvert, l'application
vous demande quoi faire (annuler, enregistrer sous un autre nom, écraser) au lieu
d'écraser son travail sans un mot.

**Comptes plus sûrs.** Mot de passe de huit caractères au moins ; une attente après trois
essais ratés ; un code de récupération (montré une seule fois à la création du compte)
pour retrouver l'accès ; « Changer mon mot de passe » dans le menu Fichier ; suppression
d'un compte depuis l'écran de connexion. Un compte dont l'administrateur a retiré le mot de
passe est signalé comme tel, et chaque changement est daté dans la fiche.

**Mises à jour signées.** Une archive posée à côté de l'application n'est proposée que si
elle porte la signature de l'éditeur. Une archive déposée par quelqu'un d'autre sur le
partage est ignorée, et l'application dit pourquoi quand on le lui demande.

**Reconnaissance de texte (OCR).** Les tableaux à filets se lisent en entier ; deux
colonnes se lisent l'une après l'autre ; « Arrêter » arrête vraiment.

**Rien ne sort du poste, et c'est vérifié.** Un test lance l'application derrière un
observateur réseau et échoue à la moindre connexion. Il a déjà trouvé et fait supprimer un
téléchargement du dictionnaire orthographique.

**Moins de saisie répétée.** « Sélectionner par numéros » (« 3-7, 12 »), avec la même écriture
à l'impression et à la division ; le filigrane, la numérotation et l'en-tête reviennent d'un
document à l'autre ; « Remplir en série (CSV) » fait une copie d'un formulaire par ligne d'un
tableau, avec les valeurs mal comprises signalées avant, jamais devinées.

**Archiver, signer, vérifier, rendre accessible.** « Archiver en PDF/A-2b » : le document est
reconstruit, contrôlé, et déclaré PDF/A-2b seulement si rien ne s'y oppose (les pages à polices
non incorporées ne se convertissent en images qu'avec votre accord) ; il est jugé par veraPDF à
chaque construction. « Vérifier les signatures » dit, sur le poste, si le contenu signé est
intact, ce qui a été ajouté après, et qui a signé — sans dire si l'autorité est reconnue, ni si le
certificat est révoqué. « Signer avec un certificat » (fichier .p12 ou .pfx, clés RSA) pose une
signature numérique, visible ou non, relue avant d'être enregistrée. Le « balisage
d'accessibilité » (Propriétés) donne aux documents produits une langue, un titre et une
structure : vrais titres pour un dossier de pièces, artefacts pour les numérotations. Et les noms
comme « Milošević » ou du cyrillique s'écrivent enfin au lieu de devenir « ? ».

**En allemand.** L'application existe en français et en allemand : le menu, la page, les fenêtres
de l'outil, la fenêtre de connexion et les messages. Elle part dans la langue du poste ; un bouton
« DE » / « FR » dans la barre, ou Aide ▸ Langue, change de langue sans rien perdre, et le choix est
retenu. Ce que l'application écrit dans les documents suit la langue choisie (sommaire, intercalaires,
« Beilage Nr. », cartouche de signature, tampons usuels, filigrane « VERTRAULICH »), et la
reconnaissance de texte propose l'allemand d'office. Le contenu de vos documents n'est jamais
traduit. Le manuel et le site restent en français.

**Plus fluide sur les gros documents.** La recherche montre son premier résultat tout de suite (sur
300 pages et 8 400 occurrences : environ un quart de seconde au lieu de deux et demie), « Suivant »
répond en quelques dizaines de millisecondes, et une deuxième recherche du même mot ne relit rien. Un
document scanné se dessine à l'arrière-plan : la fenêtre ne se fige plus (3 secondes de blocage sur trois
pages de 8,7 mégapixels, 63 millisecondes maintenant), et les opérations longues — export, recherche,
caviardage, comparaison, détection des pages vides — rendent la main assez souvent pour que la barre
d'avancement se voie et que « Annuler » réponde. Pour un document lourd, le dessin en arrière-plan garde
une seconde copie du fichier en mémoire (400 Mo au plus) ; au-delà, ou au moindre souci, l'application
dessine comme avant.

**Un premier lancement qui montre quelque chose.** Le document d'exemple est un dossier de commune
imaginaire — un préavis, un tableau, un formulaire à remplir, un courrier numérisé, un procès-verbal,
une page à signer — au lieu d'une page de vente. « Aide ▸ Découvrir Aktum PDF en 5 minutes » guide
quatre gestes (chercher, réorganiser, caviarder, imprimer) dans une petite carte qui ne bloque rien.
Après la connexion, un écran dit « Ouverture de votre dossier… » au lieu d'une fenêtre qui disparaît.
Un fichier « donnees-par-utilisateur.txt.txt » (l'Explorateur cache les extensions) est reconnu, et
« À propos » dit quel fichier de réglage a été lu. L'archive est allégée des langues inutiles de
Chromium (près de 40 Mo).

**Une interface plus lisible, plus rapide à prendre en main.** Les contrastes passent le seuil
d'accessibilité dans les deux thèmes, la fenêtre tient à partir de 873 px de large (le panneau passe
au-dessus du document en dessous), les trente et un outils se voient d'un coup d'œil, rangés en groupes
qui se replient, avec des synonymes (« biffer », « livret »…) ; le menu Outils reprend la même liste ;
le menu Édition (annuler, couper, copier, coller) existe. Les polices de l'interface sont embarquées,
les icônes ont un seul dessin, les boutons occupés, enfoncés ou désactivés se voient. Le logiciel, le
site et l'icône parlent la même langue visuelle : mêmes polices, même bleu, même marque.

**Le clavier à vous.** Une seule table de raccourcis décrit chaque geste : le menu, la fenêtre « ? » et
les infobulles disent la même chose. Fichier ▸ Préférences permet de changer une touche (un conflit est
refusé et nommé), de couper les touches à une lettre (R, V, H…), de choisir d'ouvrir les documents dans
un onglet, et d'oublier un à un les réglages que l'application retient. Nouveaux gestes : F3 / Ctrl+G
(occurrence suivante), Ctrl+Maj+N (aller à la page), Page préc./suiv., Début, Fin, Ctrl+K (chercher
un outil), Ctrl+, (préférences).

**Un aperçu avant d'appliquer.** Le filigrane, l'en-tête, le pied de page et la numérotation montrent
leur effet sur la page, à chaque frappe ; ils se posent sur toutes les pages ou sur une plage
(« 3-7, 12 »). Des configurations nommées se rangent, se rappellent et se suppriment (filigrane,
en-tête, propriétés). « Commentaires du document » et « Détecter les pages vides » sont des volets : le
document reste utilisable derrière. La barre de sélection prend une plage de pages et des choix
rapides (impaires, paires, inverser).

**Accessible au clavier et au lecteur d'écran.** L'éditeur de page est une vraie fenêtre modale (le
focus y entre, y tourne, et revient) ; la grille de pages s'utilise aux flèches ; les messages d'état
s'annoncent ; les pages de la vue Lire sont des régions nommées. « Vérifier l'accessibilité » dit, sur
le poste, ce qu'un lecteur d'écran ne pourrait pas lire dans le document tel qu'il serait exporté (langue,
titre, figures sans texte, pages qui ne sont qu'une image) — sans remplacer un contrôle PDF/UA complet.

**Des lots qui enchaînent, un caviardage qu'on choisit.** « Traiter plusieurs fichiers » enchaîne jusqu'à
trois opérations sur chaque fichier (pages vides, en-tête, filigrane, propriétés, protection, puis réduire,
séparer ou extraire le texte), l'en-tête, le filigrane et les propriétés se prenant dans les configurations
enregistrées. Dans « Rechercher, remplacer, caviarder », chaque page et chaque occurrence se coche : on masque
celles que l'on veut, les autres restent lisibles — et la confirmation dit combien. Ctrl+Maj+Y répète la
dernière opération (pivoter, supprimer, dupliquer des pages, filigrane, en-tête) sur la sélection ou le
document du moment. Dans l'application, une page se glisse de la vue Organiser vers le Bureau ou un dossier :
elle devient un PDF d'une page, préparé sur le poste et effacé à la fermeture.

**Quand ça se passe mal.** Un fichier vide, un fichier qui n'est pas un PDF et un PDF tronqué ne sont plus
confondus : chacun dit ce qu'il est, et le document d'exemple reste ouvert. Un enregistrement qui échoue ne laisse
plus de fichier temporaire et dit la cause en une phrase (disque plein, fichier tenu par un autre programme,
droits). Le travail mis de côté pour la récupération ne se garde que sept jours et dix dépôts, et le dit ;
l'historique d'annulation, lui, ne se récupère pas, et la boîte de récupération l'annonce. Une page convertie en
image à l'export est signalée. Échap interrompt une opération longue sans rien écrire.

**Réaffichage et cibles.** À 320 px de large (un écran à 400 %), plus rien ne déborde, les boîtes et l'éditeur
comptent ; toutes les commandes font 24 × 24 px au moins ; Échap écarte la barre d'actions d'une vignette. Une
**déclaration d'accessibilité** (critère par critère, WCAG 2.2 et EN 301 549) est livrée avec les documents, avec
ses limites : l'éditeur de page ne se manie pas entièrement au clavier, et le balisage d'un PDF reçu n'est pas conservé.

**Une aide à l'endroit où l'on décide.** Chaque boîte d'outil porte un bouton « ? » (ou F1) qui dit ce que l'outil
fait, comment s'en servir et ce qu'il change vraiment — sans fermer la boîte. Le mode d'emploi grandit de trois chapitres
écrits depuis la même donnée (les outils un par un, les messages et leurs codes, l'index) ; une foire aux questions de quarante
questions, un aide-mémoire recto verso et une formation d'une heure sont livrés avec les documents. Quatre-vingts champs de
boîte expliquent maintenant leur conséquence ; un outil grisé dit pourquoi ; Annuler et Rétablir nomment l'action (« Annulé :
Filigrane ») ; chaque échec dit sa cause en français et porte un code (E-MEM, E-FICHIER…) que le manuel explique ; deux messages
qui laissaient croire qu'un réglage était déjà écrit disent maintenant « à l'export ».

**Dates et nombres à la suisse.** 31.12.2026 et 12’345.50, en français comme en allemand, dans l'application et dans ce
qu'elle écrit dans vos documents (tampons, sommaires, intercalaires).

**Windows et le secrétariat.** Fichier ▸ Préférences propose « Ouvrir les PDF avec Aktum PDF » : un bouton qui dit ce qu’il écrit (dans votre profil seulement, jamais dans le choix que Windows a déjà fait pour vous) et qui le retire de la même façon. « Envoyer par courriel… » ouvre un message Outlook avec le PDF joint — il n’envoie jamais rien tout seul, et sans Outlook il dit comment faire. La boîte de réception du copieur surveille le dossier que vous désignez : elle annonce les nouveaux fichiers (jamais un fichier que le copieur écrit encore), les ouvre, les classe, les supprime après confirmation. À l’impression, un dossier aux formats mêlés (A4, A3) part feuille par feuille sur le bon papier, avec une case « Nuances de gris ». « Copier comme image » prend une page ou une zone dessinée à la souris ; « Afficher le document dans l’Explorateur » existe ; les noms accentués (« Préavis août.pdf ») restent intacts partout ; et si un autre programme tient le fichier (Acrobat Reader, la GEVER, un antivirus), le message le nomme au lieu de renoncer en silence.

**Vos traces, et le moyen de les effacer.** La signature n’est mémorisée que si vous cochez la case, qui dit où (dans le dossier de l’application, en clair). Fichier ▸ Effacer mes traces sur ce poste… retire les récents, le travail mis de côté, les tampons et signatures mémorisés et les copies du glisser — jamais vos documents — après vous avoir dit ce qui part. Le dossier du travail mis de côté est réservé à la personne qui l’a créé, et il ne contient plus le texte reconnu d’un scan (la récupération dit « N pages sont à reconnaître de nouveau »).

**Licence et essai.** Toutes les fonctions sont disponibles pendant 45 jours d’essai, avec le nombre de jours restants à l’écran. Ensuite, un fichier de licence signé (`licence.json`, posé à côté de l’exécutable) donne le droit d’utiliser la version reçue et d’installer les mises à jour jusqu’à une date ; « Aide ▸ À propos » dit où l’on en est. Rien n’est vérifié en ligne.

**Pour l’administrateur.** Un fichier `reglages.json` posé à côté de l’exécutable fixe, pour tout le service, ce que les personnes ne peuvent pas changer : interdire la mémorisation d’une signature, exiger un mot de passe plus long. Le script `Deployer-Aktum-PDF.ps1` pose, met à jour et retire l’application sans droits d’administrateur (script de connexion, stratégie de groupe, Intune), et ne touche jamais au dossier `data` ni à la licence. Chaque archive porte la liste exacte de ses fichiers : une mise à jour retire ceux que la nouvelle version ne livre plus, et seulement ceux-là. Les documents livrés passent à dix : guide d’administration, fiche de protection des données, fiche produit, procédure de support (avec ses délais), « Comment vérifier que rien ne sort », « Ce que le logiciel ne fait pas encore », déclaration d’accessibilité, questions fréquentes, aide-mémoire, formation.

**Une chaîne qu’on peut contrôler.** Chaque bibliothèque embarquée est vérifiée par son empreinte avant d’entrer dans la construction ; une nomenclature de tous les composants (avec leur licence) est jointe à chaque publication ; deux constructions du même état du dépôt donnent les mêmes pages ; l’audit des avis de sécurité est bloquant pour une version stable. La bibliothèque de certificats passe en 1.4.0.

**Et aussi** : les caractères que le PDF ne sait pas écrire dans un champ ou un tampon sont
signalés (plus de « Miloševi? » silencieux) ; plus de limite de 800 signets ; « Réduire la
taille » refuse de rendre un fichier plus gros ; Ctrl+Z juste après l'ouverture ne vide plus
l'espace de travail ; un journal qui dit ce qui s'est mal passé, au lieu de se taire.

### À savoir avant de mettre à jour

- **Première mise à jour vers la 2.1.0 : à la main si le zip n'a pas sa signature.** Les
  versions antérieures n'ont pas de clé d'éditeur : elles acceptent tout zip posé à côté.
  À partir de la 2.1.0, il faut le zip **et** son fichier `.signature.json`, posés ensemble.
- **Les mots de passe actuels continuent de marcher**, même de quatre ou cinq caractères ;
  ils sont refaits au nouveau coût à la prochaine connexion. Chaque compte reçoit alors son
  code de récupération, une fois : il faut le noter.
- **Deux touches ont changé.** Lire et Organiser passent de Ctrl+1 / Ctrl+2 à Ctrl+Maj+1 / Ctrl+Maj+2 :
  Ctrl+1 et Ctrl+2 règlent maintenant le zoom (taille réelle, largeur de la page), comme dans Acrobat.
  Tout geste se remet où l'on veut dans Fichier ▸ Préférences.
- Dans les menus et les fenêtres, « Retirer » des pages devient « Supprimer » : un seul mot pour un seul acte.
- **La signature n’est plus mémorisée d’office.** Celles que vous aviez gardées le restent ; pour une nouvelle, il faut cocher la case.
- **Le ménage des mises à jour commence avec cette version.** Une installation qui ne porte pas encore la liste de ses fichiers ne se nettoie pas la première fois (rien n’est retiré : mieux vaut un fichier de trop qu’un fichier de moins) ; les suivantes, si.
- Rien d'autre à refaire. Vos tampons, signatures, récents et le travail mis de côté sont
  conservés.

### Ce qui n'existe pas encore

Pas d'équivalent clavier pour poser une annotation dans l'éditeur de page, pas de balisage conservé d'un PDF reçu quand ses pages sont réassemblées (l'application prévient), pas de PDF/UA (le balisage ne couvre pas les titres, listes et tableaux des pages venues d'ailleurs,
ni les liens et formulaires), pas de signature qualifiée ni d'horodatage, pas de contrôle de
révocation ni de liste d'autorités de confiance, pas de PDF/A-1, -3 ni de niveau « a » ; l'application
est en français et en allemand (pas d'italien), et le manuel et le site restent en français. La liste complète, dite sans adoucir, est dans le document « Ce que le logiciel ne fait pas encore » (livré avec l'application, et sur le site). Voir la feuille de route.
