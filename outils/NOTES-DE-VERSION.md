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
- Rien d'autre à refaire. Vos tampons, signatures, récents et le travail mis de côté sont
  conservés.

### Ce qui n'existe pas encore

Pas de PDF/UA (le balisage ne couvre pas les titres, listes et tableaux des pages venues d'ailleurs,
ni les liens et formulaires), pas de signature qualifiée ni d'horodatage, pas de contrôle de
révocation ni de liste d'autorités de confiance, pas de PDF/A-1, -3 ni de niveau « a » ; l'application
est en français seulement (l'OCR lit aussi l'allemand). Voir la feuille de route.
