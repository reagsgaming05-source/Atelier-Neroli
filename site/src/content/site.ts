/**
 * Contenu éditorial du site Aktum PDF.
 *
 * Règle de rédaction : une phrase n'entre ici que si elle se vérifie dans le
 * logiciel livré. Le test `test/affirmations.test.ts` garde une liste de
 * formulations qui ne doivent jamais revenir — des promesses faites un jour sur
 * ce site et que le produit ne tenait pas.
 *
 * Qui vend (raison sociale, adresse, IDE, IBAN) ne s'écrit pas ici : le dépôt
 * est public. Voir src/content/editeur.ts.
 */
import { adresseConnue, editeur } from "@/content/editeur";

export const site = {
  name: "Aktum PDF",
  /** Tant que l'éditeur n'est pas renseigné, on ne lui invente aucun nom. */
  legalName: editeur.nom || "L'éditeur",
  tagline: "Tout le travail PDF d'un secrétariat, sans qu'un document sorte",
  description:
    "Aktum PDF est un logiciel PDF complet pour un secrétariat communal ou scolaire suisse. Trente et un outils : lire, réorganiser, fusionner, corriger le texte dans le PDF, annoter, caviarder, reconnaître le texte d'un scan en français et en allemand, recopier un tableau dans Excel, comparer deux versions, constituer un dossier de pièces avec intercalaires, pagination continue et sommaire, imprimer en livret. Il se décompresse dans un dossier et se lance par double-clic : rien à installer, aucun droit administrateur. Il n'ouvre aucune connexion pour traiter un document.",
  audience: "les communes, les établissements scolaires et les services de l'État",
  /** Vrai seulement quand l'éditeur a renseigné son adresse : sinon, rien à afficher. */
  adresseConnue,
  address: {
    street: [editeur.rue, editeur.numero].filter(Boolean).join(" "),
    zip: editeur.npa,
    city: editeur.localite,
    canton: editeur.canton,
    country: "Suisse",
  },
  phone: editeur.telephone,
  phoneHref: editeur.telephone ? `tel:${editeur.telephone.replace(/[^+\d]/g, "")}` : "",
  email: editeur.email,
  supportEmail: editeur.emailSupport,
  /** Les prix sont en francs ; la TVA n'est annoncée qu'une fois l'éditeur assujetti. */
  vatNote: editeur.tva ? "Prix en CHF, TVA 8.1 % incluse." : "Prix en francs suisses.",
  platforms: ["Windows", "macOS"],
  /** Les archives publiées par le dépôt, reconstruites à chaque modification. */
  downloads: {
    windows: "https://github.com/reagsgaming05-source/Atelier-Neroli/releases/download/aktumpdf-windows-latest/AktumPDF-windows.zip",
    mac: "https://github.com/reagsgaming05-source/Atelier-Neroli/releases/download/aktumpdf-mac-latest/AktumPDF-mac.zip",
  },
};

export const navigation = [
  { href: "/communes", label: "Communes" },
  { href: "/ecoles", label: "Écoles" },
  { href: "/etat", label: "État" },
  { href: "/fonctionnalites", label: "Fonctionnalités" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/securite", label: "Sécurité" },
  { href: "/telecharger", label: "Télécharger" },
];

export const featureCategories = ["Constituer & organiser", "Corriger & annoter", "Reconnaître & extraire", "Protéger & signer"] as const;
export type FeatureCategory = (typeof featureCategories)[number];

export type Feature = {
  slug: string;
  name: string;
  category: FeatureCategory;
  summary: string;
  description: string;
  details: string[];
  icon:
    | "edit"
    | "organize"
    | "merge"
    | "convert"
    | "compress"
    | "ocr"
    | "sign"
    | "protect"
    | "redact"
    | "forms"
    | "annotate"
    | "compare"
    | "dossier";
  featured?: boolean;
  /** Fonction qui touche à des données sensibles : signalée comme telle sur la page. */
  pro?: boolean;
};

export const features: Feature[] = [
  {
    slug: "dossier",
    name: "Constituer un dossier de pièces",
    category: "Constituer & organiser",
    summary: "Un préavis, un dossier de recours, un dossier de construction : chaque document devient une pièce numérotée, avec son intercalaire et son sommaire.",
    description:
      "Chaque document ouvert devient une pièce. Le logiciel insère un intercalaire à son titre, pose la mention « Pièce n° 3 » sur chacune de ses pages, numérote tout le dossier en continu, fabrique un sommaire en tête et pose un signet par pièce. Quand on déplace une pièce ensuite, le sommaire se refait tout seul.",
    details: ["Intercalaires et pièces numérotées", "Pagination continue", "Sommaire et signets refaits automatiquement"],
    icon: "dossier",
    featured: true,
  },
  {
    slug: "organiser",
    name: "Réorganiser les pages",
    category: "Constituer & organiser",
    summary: "Réordonnez, pivotez, supprimez ou insérez des pages par glisser-déposer.",
    description:
      "La vue en vignettes permet de restructurer un document de cent pages en quelques secondes. On peut extraire une plage de pages, insérer des pages vierges, des images ou des pages d'un autre PDF, redimensionner, détecter et retirer les pages vides d'un scan, puis poser un filigrane, un en-tête, un pied de page ou une numérotation.",
    details: ["Glisser-déposer des vignettes", "Détection des pages vides", "Filigrane, en-tête, numérotation"],
    icon: "organize",
  },
  {
    slug: "fusionner",
    name: "Fusionner et diviser",
    category: "Constituer & organiser",
    summary: "Assemblez plusieurs PDF et images en un seul document, ou découpez un document en plusieurs.",
    description:
      "Fusionnez des PDF et des images dans l'ordre souhaité. Pour un dossier de pièces, le sommaire et les intercalaires se font à part (voir « Constituer un dossier »). La division se fait une page par fichier, par lots de N pages, ou par plages que vous indiquez. Le traitement en série applique la même opération à tout un dossier de fichiers.",
    details: ["PDF et images", "Une page par fichier, par lots ou par plages", "Traitement de plusieurs fichiers en série"],
    icon: "merge",
    featured: true,
  },
  {
    slug: "editer",
    name: "Corriger le texte dans le PDF",
    category: "Corriger & annoter",
    summary: "Corrigez une date de convocation ou remplacez un nom, directement dans le PDF, sans que la mise en page bouge.",
    description:
      "L'éditeur de page repère les lignes de texte et vous laisse les corriger sur place. Quand la police d'origine n'est pas disponible, le texte est repris en Helvetica ou en Times. La fonction « Remplacer partout » corrige un terme dans tout le document. L'historique garde les soixante dernières opérations pour annuler et rétablir.",
    details: ["Texte corrigé sur place", "Remplacer partout", "Annuler et rétablir sur 60 opérations"],
    icon: "edit",
    featured: true,
  },
  {
    slug: "annoter",
    name: "Annoter et commenter",
    category: "Corriger & annoter",
    summary: "Surlignez, posez des notes, des formes, des tampons : ce sont de vrais commentaires PDF.",
    description:
      "Les annotations sont enregistrées comme des commentaires PDF, que les autres lecteurs relisent. Les commentaires d'un document reçu se listent et se retirent. La signature manuscrite et les tampons personnels se mémorisent sur le poste, dans le dossier de données du logiciel.",
    details: ["Surlignage, notes, formes, tampons", "Commentaires du document reçu : lister, retirer", "Signature et tampons mémorisés"],
    icon: "annotate",
  },
  {
    slug: "formulaires",
    name: "Remplir des formulaires",
    category: "Corriger & annoter",
    summary: "Remplissez les champs d'un formulaire PDF reçu, contrôlez la saisie, puis aplatissez-le à l'export.",
    description:
      "Les champs d'un formulaire PDF standard (AcroForm) se remplissent directement : texte (une ou plusieurs lignes), cases à cocher, boutons radio, listes (à choix multiple aussi). L'intitulé du champ, la lecture seule et le caractère obligatoire sont respectés ; le format (nombre, date, courriel) et la longueur sont contrôlés à la saisie, sans script dans le fichier. Ce qui est saisi se voit tout de suite sur la page, et les données s'enregistrent en CSV ou en XFDF et se reprennent. À l'export, le formulaire peut être aplati pour figer les valeurs. Les formulaires de type XFA ne sont pas pris en charge.",
    details: ["Champs, cases, boutons radio et listes", "Obligatoire, lecture seule, format contrôlés", "Données en CSV ou XFDF, reprises à volonté", "Aplatir à l'export"],
    icon: "forms",
  },
  {
    slug: "creer-formulaires",
    name: "Créer des formulaires à remplir",
    category: "Corriger & annoter",
    summary: "Tracez des champs sur une page, ou laissez le logiciel proposer ceux d'un formulaire à plat.",
    description:
      "Dans l'éditeur de page, on trace des champs : texte, case à cocher, liste déroulante, boutons radio d'un même groupe, zone de signature à laisser vide. Chaque champ peut porter une description lue par les lecteurs d'écran, être obligatoire ou en lecture seule, avoir un format et une longueur maximale. « Reconnaître les champs » repère, dans un formulaire à plat, les lignes, les pointillés, les cadres vides et les petites cases, et propose d'y poser de vrais champs : rien n'est posé avant votre accord. Un scan, qui n'est qu'une image, n'a ni lignes ni cadres à lire : ses champs se tracent à la main.",
    details: ["Cinq genres de champ", "Description pour les lecteurs d'écran", "Reconnaissance des champs d'un formulaire à plat, à contrôler", "Zone de signature vide (elle ne signe pas)"],
    icon: "forms",
  },
  {
    slug: "comparer",
    name: "Comparer deux versions",
    category: "Corriger & annoter",
    summary: "Repérez les mots ajoutés ou retirés entre deux versions d'un règlement ou d'une directive.",
    description:
      "Les deux versions s'affichent côte à côte, avec les mots ajoutés et retirés mis en évidence. La comparaison porte sur le texte : elle ne signale pas les changements de mise en page.",
    details: ["Côte à côte", "Mots ajoutés et retirés", "Texte seulement"],
    icon: "compare",
  },
  {
    slug: "ocr",
    name: "Reconnaître le texte d'un scan",
    category: "Reconnaître & extraire",
    summary: "Rendez un dossier scanné consultable : certificats, décisions, anciennes fiches.",
    description:
      "La reconnaissance de texte (OCR) s'exécute sur le poste, avec le moteur et les modèles de langue inclus dans le logiciel : rien n'est envoyé nulle part. Elle reconnaît le français et l'allemand, et peut choisir seule entre les deux en lisant la première page. Le texte reconnu sert ensuite à la recherche, au remplacement, au caviardage et à la copie, et repart dans le PDF exporté comme texte invisible placé sous l'image. Elle se lance aussi sur tout un lot de fichiers. Un écran de relecture montre, à côté de l'image du mot, ce que le moteur a lu avec le moins de confiance, pour le corriger. La mise en page d'origine (colonnes, tableaux) n'est pas reproduite : on retrouve le texte, pas la forme ; sur un scan de mauvaise qualité, le résultat sert à chercher, pas à republier.",
    details: ["Français et allemand, détection possible", "Entièrement local, sans réseau", "Relecture des mots douteux", "Texte invisible dans le PDF exporté"],
    icon: "ocr",
  },
  {
    slug: "extraire",
    name: "Extraire : images, texte, tableaux",
    category: "Reconnaître & extraire",
    summary: "Recopiez un tableau du PDF dans Excel, en colonnes, avec les montants à la suisse.",
    description:
      "Un tableau sélectionné dans le PDF se recopie dans Excel en colonnes ; les montants suisses (1'234.50, CHF 1 234.–) sont reconnus. Le logiciel exporte aussi les pages en images (PNG ou JPEG) et le texte brut (.txt). Il ne convertit pas vers Word, Excel ou PowerPoint, ni depuis ces formats.",
    details: ["Tableau vers Excel", "Pages en PNG ou JPEG", "Texte brut"],
    icon: "convert",
  },
  {
    slug: "compresser",
    name: "Réduire la taille",
    category: "Reconnaître & extraire",
    summary: "Efficace sur un document scanné ; sur un document de texte, il l'alourdit, et le logiciel vous le dit avant.",
    description:
      "« Réduire la taille » convertit chaque page en image : le texte n'est plus sélectionnable après l'opération. Le logiciel vous le signale, mesure le résultat et refuse de livrer un fichier plus gros que l'original. Le bilan de taille s'affiche après l'export.",
    details: ["Pages converties en images", "Résultat mesuré avant livraison", "Utile pour les scans"],
    icon: "compress",
  },
  {
    slug: "proteger",
    name: "Protéger par mot de passe",
    category: "Protéger & signer",
    summary: "Chiffrement AES-256 du PDF que vous produisez, avec mot de passe d'ouverture et de permissions distincts.",
    description:
      "Définissez un mot de passe d'ouverture et un mot de passe de permissions distincts, et choisissez ce que le destinataire peut faire : imprimer, copier du texte, remplir des champs ou modifier le document. Cette protection s'applique au fichier que vous exportez, sur votre poste.",
    details: ["Chiffrement AES-256", "Permissions détaillées", "Appliqué à l'export"],
    icon: "protect",
  },
  {
    slug: "caviarder",
    name: "Caviarder le texte d'une page",
    category: "Protéger & signer",
    summary: "Recherchez un terme dans tout le document et caviardez toutes ses occurrences après confirmation du nombre.",
    description:
      "Le caviardage retire du flux de la page les lettres masquées, et refait l'image lorsqu'une image passe sous la zone. Le terme est aussi cherché, et retiré, dans les métadonnées, les légendes d'images, les notes, les champs de formulaire, les signets, les pièces jointes et le texte posé hors de la page. Le logiciel annonce le nombre d'occurrences avant d'agir et demande confirmation ; un contrôle fait avec des outils qui ne sont pas les nôtres vérifie le résultat sur des documents piégés à chaque construction. Relisez tout de même le fichier produit avant de le publier.",
    details: ["Recherche dans tout le document", "Confirmation du nombre d'occurrences", "Page, métadonnées, notes, formulaires, signets, pièces jointes"],
    icon: "redact",
    pro: true,
  },
  {
    slug: "signer",
    name: "Poser une signature manuscrite",
    category: "Protéger & signer",
    summary: "Posez votre signature tracée à la souris ou au doigt, ou celle qu'on vous a transmise, sans imprimer puis scanner.",
    description:
      "La signature dessinée est fondue dans la page, avec la date que vous saisissez. Ce n'est pas une signature électronique au sens de la loi fédérale sur la signature électronique (SCSE) : pour une décision notifiée par voie électronique, un cachet électronique réglementé est requis, et nous vous orientons vers un fournisseur reconnu.",
    details: ["Signature tracée", "Date saisie", "Pas de signature qualifiée (SCSE)"],
    icon: "sign",
    pro: true,
  },
  {
    slug: "plages",
    name: "Sélectionner par numéros",
    category: "Constituer & organiser",
    summary: "« 3-7, 12 » : une seule écriture pour sélectionner, imprimer ou diviser, et des réglages qui reviennent d'un document à l'autre.",
    description:
      "La sélection par numéros accepte des plages (3-7), « 5- » jusqu'à la fin et « -3 » jusqu'à la page 3, séparées par des virgules ; la même écriture sert à l'impression et à la division. Le filigrane, la numérotation, l'en-tête et le pied de page reprennent les réglages du dernier document, qu'on peut revenir aux réglages d'origine.",
    details: ["Sélection par numéros de pages", "Même écriture à l'impression et à la division", "Réglages mémorisés d'un document à l'autre"],
    icon: "organize",
  },
  {
    slug: "serie",
    name: "Remplir des formulaires en série",
    category: "Corriger & annoter",
    summary: "Un formulaire PDF et un tableau (CSV) : une copie remplie par ligne du tableau.",
    description:
      "Le tableau (CSV, en UTF-8 ou en Windows-1252) donne une ligne par copie ; ses colonnes se relient aux champs du formulaire. Les valeurs que le logiciel ne comprend pas (une case à cocher, un choix qui n'existe pas) sont signalées avant, jamais devinées. Le résultat est un PDF par ligne, réunis dans une archive ZIP, ou un seul PDF.",
    details: ["Une copie par ligne du tableau", "Valeurs mal comprises signalées avant", "Un PDF par ligne (ZIP) ou un seul PDF"],
    icon: "forms",
  },
  {
    slug: "accessibilite",
    name: "Rendre les documents accessibles",
    category: "Corriger & annoter",
    summary: "Une langue, un titre et une structure pour les documents que le logiciel produit.",
    description:
      "Dans les Propriétés, le balisage d'accessibilité donne au document produit une langue, un titre et une structure que suivent les lecteurs d'écran : un dossier de pièces a de vrais titres, une numérotation est marquée comme décor. Ce n'est pas PDF/UA : les liens, les formulaires et les pages venues d'ailleurs ne reçoivent pas de structure fine, et le logiciel ne devine ni titres, ni listes, ni tableaux dans un document reçu.",
    details: ["Langue, titre, structure", "Vrais titres pour un dossier de pièces", "Pas de PDF/UA"],
    icon: "annotate",
  },
  {
    slug: "archiver",
    name: "Archiver en PDF/A",
    category: "Protéger & signer",
    summary: "Un format d'archivage à long terme, contrôlé avant d'être déclaré.",
    description:
      "« Archiver en PDF/A-2b » reconstruit le document, le contrôle (polices incorporées, pas de script, pas de chiffrement, annotations imprimables, métadonnées) et ne le déclare PDF/A-2b que si rien ne s'y oppose ; le contrôle est jugé par veraPDF à chaque construction du logiciel. Une page dont les polices ne sont pas incorporées ne se convertit en image qu'avec votre accord. Seul le niveau 2b existe : ni PDF/A-1, ni PDF/A-3, ni niveau a.",
    details: ["PDF/A-2b, contrôlé avant d'être déclaré", "Jugé par veraPDF à chaque construction", "Pages sans polices incorporées : en images, avec votre accord"],
    icon: "protect",
  },
  {
    slug: "signatures",
    name: "Vérifier les signatures reçues",
    category: "Protéger & signer",
    summary: "Un document signé reçu : le contenu est-il intact, et qui l'a signé ?",
    description:
      "Le logiciel contrôle, sur le poste, que le contenu couvert par chaque signature n'a pas changé, signale ce qui a été ajouté après (un formulaire rempli, une annotation, une version corrigée) et lit le signataire dans son certificat. Il ne dit pas si l'autorité qui a délivré le certificat est reconnue, ni si le certificat a été révoqué : ce contrôle suppose une connexion, que le logiciel n'ouvre jamais. Ce n'est donc pas une validation au sens de la SCSE.",
    details: ["Contenu signé intact ou modifié", "Signataire, date, certificat", "Ni contrôle d'autorité, ni révocation"],
    icon: "sign",
    pro: true,
  },
  {
    slug: "certificat",
    name: "Signer avec un certificat",
    category: "Protéger & signer",
    summary: "Une signature numérique faite avec votre certificat personnel (.p12, .pfx), visible ou non.",
    description:
      "Le certificat se lit sur le poste, avec son mot de passe, qui n'est jamais gardé. La signature (clés RSA) se pose dans un coin d'une page ou reste invisible, et elle est relue avant d'être enregistrée ; le PDF signé s'ouvre dans les autres lecteurs. Le logiciel ne pose pas d'horodatage, et la valeur juridique est celle de votre certificat : une signature qualifiée suppose un certificat qualifié, délivré par un prestataire reconnu.",
    details: ["Fichier .p12 ou .pfx, clés RSA", "Visible ou invisible, relue avant enregistrement", "Pas d'horodatage"],
    icon: "sign",
    pro: true,
  },
];

export const values = [
  {
    title: "Les documents ne quittent pas le poste",
    text: "Le logiciel lit, modifie et réassemble les fichiers sur votre poste ou votre lecteur réseau. Il n'ouvre aucune connexion pour traiter un document — cela se vérifie réseau coupé.",
  },
  {
    title: "Rien à installer, aucun droit administrateur",
    text: "Un dossier posé sur le lecteur réseau, un raccourci par poste. Pas d'installation, aucun service, aucune tâche planifiée. La mise à jour consiste à remplacer ce dossier, une fois, pour tout le monde.",
  },
  {
    title: "Un prix par entité, pas par poste",
    text: "Le greffe, la bourse, l'urbanisme et le contrôle des habitants ont besoin du même outil. Une licence d'entité supprime la liste de licences et la question du cinquième poste.",
  },
  {
    title: "Le circuit d'achat que vous connaissez",
    text: "Offre chiffrée, bon de commande, facture à 30 jours avec QR-facture suisse et votre référence interne. Pas de carte de crédit à sortir.",
  },
];

export const steps = [
  {
    title: "Vous demandez une offre",
    text: "Deux minutes, sans créer de compte. Vous recevez un devis chiffré et nominatif, valable 90 jours, prêt à faire valider.",
  },
  {
    title: "Vous commandez sur bon de commande",
    text: "Vous acceptez l'offre avec votre numéro de bon de commande. La facture part avec sa QR-facture, payable à 30 jours.",
  },
  {
    title: "L'administration travaille",
    text: "Un dossier posé sur le lecteur réseau, un raccourci par poste, aucun droit administrateur. Chacun crée son compte au premier lancement.",
  },
];

export const faq = [
  {
    q: "Comment une commune achète-t-elle ?",
    a: "Elle demande une offre depuis le site, sans créer de compte. Elle reçoit un devis chiffré et nominatif, valable 90 jours, qu'elle fait valider en Municipalité. Elle l'accepte ensuite avec son numéro de bon de commande, et la facture part avec sa QR-facture, payable à 30 jours. Aucune carte de crédit n'intervient.",
  },
  {
    q: "Faut-il passer par un appel d'offres ?",
    a: "Dans la plupart des cantons, un abonnement annuel de cet ordre reste sous le seuil du gré à gré pour les services. C'est à votre secrétariat de le vérifier au regard de votre règlement et du droit cantonal des marchés publics.",
  },
  {
    q: "Où passent les documents traités ?",
    a: "Nulle part. Le logiciel lit, modifie et réécrit les fichiers sur votre poste ou votre lecteur réseau ; il n'ouvre aucune connexion pour traiter un document, et cela se vérifie réseau coupé. C'est la différence avec un outil de fusion en ligne, sur lequel un dossier d'enquête publique partirait chez un tiers.",
  },
  {
    q: "Faut-il installer quelque chose sur chaque poste ?",
    a: "Non. Un dossier posé sur le lecteur réseau et un raccourci par bureau suffisent : aucun droit administrateur, rien dans le registre sauf si une personne demande, par un bouton, à ouvrir les PDF avec Aktum PDF. La mise à jour consiste à remplacer ce dossier une fois, pour tout le monde.",
  },
  {
    q: "Combien de postes sont compris ?",
    a: "La formule Administration ne les compte pas : tout le personnel de l'entité peut l'utiliser. La formule Secrétariat, moins chère, s'arrête à dix postes. La formule Poste équipe une seule personne et se règle sur facture, comme les autres.",
  },
  {
    q: "L'abonnement est-il avec engagement ?",
    a: "Il est annuel et se résilie pour l'échéance depuis l'espace client. Il reste actif jusqu'à la fin de la période déjà réglée, puis s'arrête sans frais.",
  },
  {
    q: "Les signatures sont-elles valables juridiquement ?",
    a: "Le logiciel pose une signature manuscrite dessinée dans la page, avec la date que vous saisissez, ou une signature numérique faite avec votre certificat personnel (.p12, .pfx). Ni l'une ni l'autre n'est une signature électronique qualifiée au sens de la SCSE. Pour une décision notifiée par voie électronique, un cachet électronique réglementé est requis (OCEl-PA, art. 9) ; nous vous orientons vers un fournisseur reconnu.",
  },
  {
    q: "Le caviardage est-il définitif ?",
    a: "Le caviardage retire du flux de la page les lettres masquées, et refait l'image lorsqu'une image passe sous la zone ; le terme est aussi retiré des métadonnées, des notes, des champs de formulaire, des signets et des pièces jointes. Un contrôle fait avec des outils qui ne sont pas les nôtres le vérifie à chaque construction du logiciel. Relisez tout de même le fichier produit avant de le publier : le logiciel ne peut pas deviner qu'un nom s'écrit autrement ailleurs.",
  },
  {
    q: "Que ne fait pas le logiciel ?",
    a: "Il ne délivre pas de signature électronique qualifiée et ne pose pas d'horodatage ; il lit les signatures des PDF reçus sans dire si l'autorité est reconnue ni si le certificat a été révoqué ; il produit du PDF/A-2b mais ni PDF/A-1 ni -3 ; son balisage d'accessibilité donne une langue, un titre et une structure aux documents qu'il produit sans atteindre PDF/UA ; et il ne convertit pas depuis ou vers Word, Excel et PowerPoint. Nous le disons avant l'évaluation, pas après.",
  },
  {
    q: "Que se passe-t-il si vous cessez l'activité ?",
    a: "Ce que produit le logiciel est du PDF standard, lisible par n'importe quel autre outil, sans conversion ni format propriétaire. Un séquestre du code source peut être convenu pour un déploiement important.",
  },
];

export const securityPoints = [
  {
    icon: "monitor",
    title: "Aucune connexion pour traiter un document",
    text: "Le logiciel travaille sur le poste. La page est servie depuis le disque sous une politique de sécurité de contenu appliquée par le navigateur embarqué, qui lui interdit de contacter qui que ce soit. Débranchez le réseau : tout continue.",
  },
  {
    icon: "server",
    title: "Pas d'hébergement, donc rien à héberger",
    text: "Vos documents ne sont jamais téléversés. Il n'y a ni serveur de traitement, ni stockage, ni suppression automatique : il n'y a rien à supprimer, parce que rien n'est envoyé.",
  },
  {
    icon: "lock",
    title: "Chiffrement du PDF que vous produisez",
    text: "AES-256, avec mot de passe d'ouverture et de permissions distincts. Le chiffrement s'applique à l'export, sur votre poste.",
  },
  {
    icon: "key",
    title: "Comptes locaux par utilisateur",
    text: "Chaque personne a son compte sur le poste ; le mot de passe est stocké sous forme d'empreinte scrypt, les dossiers sont séparés. Il n'y a ni compte en ligne, ni authentification unique, ni journal hébergé.",
  },
] as const;

export const contactSubjects = [
  "Demande d'offre pour une commune",
  "Demande d'offre pour un établissement scolaire",
  "Déploiement cantonal ou marché public",
  "Demande de démonstration",
  "Support technique",
  "Autre demande",
];

export const stats = [
  { k: "26", v: "outils PDF" },
  { k: "0", v: "connexion pour traiter un document" },
  { k: "1", v: "facture par an, sur bon de commande" },
];

/** Types d'institutions concernées (bandeau). */
export const institutionTypes = [
  "Greffes municipaux",
  "Contrôles des habitants",
  "Bourses communales",
  "Services d'urbanisme",
  "Établissements scolaires",
  "Services cantonaux",
];

/** Déploiement type dans un établissement. */
export const deployment = [
  { week: "Jour 1", title: "Demande d'offre", text: "Deux minutes, sans compte à créer. Nous chiffrons et renvoyons un devis nominatif valable 90 jours." },
  { week: "À votre rythme", title: "Offre et bon de commande", text: "Un PDF prêt à joindre à une décision de Municipalité, de direction ou de service d'achat. Vous l'acceptez avec votre numéro de bon de commande ; la facture part avec sa QR-facture, payable à 30 jours." },
  { week: "Le jour même", title: "Mise en service", text: "Le dossier se pose sur le lecteur réseau, un raccourci par poste, chacun crée son compte au premier lancement." },
];

/**
 * Comparatif. Chaque ligne a été vérifiée dans le logiciel livré ; les colonnes
 * des concurrents reposent sur leurs offres publiques et sont à relire à
 * chaque révision du site.
 */
export const comparison = {
  columns: ["Aktum PDF", "Acrobat Pro", "Outils en ligne gratuits"],
  rows: [
    { label: "Documents traités sur le poste, sans envoi", values: ["yes", "partial", "no"] },
    { label: "Licence par entité, sans plafond de postes", values: ["yes", "no", "no"] },
    { label: "Dossier de pièces : intercalaires, pagination continue, sommaire", values: ["yes", "partial", "no"] },
    { label: "Caviarder le texte d'une page", values: ["partial", "yes", "no"] },
    { label: "Reconnaissance de texte français et allemand, hors ligne", values: ["yes", "yes", "partial"] },
    { label: "Installation sans droits administrateur", values: ["yes", "no", "yes"] },
    { label: "Offre, bon de commande et QR-facture", values: ["yes", "partial", "no"] },
    { label: "Signature électronique qualifiée (SCSE)", values: ["no", "partial", "no"] },
    { label: "Sortie PDF/A pour l'archivage", values: ["partial", "yes", "no"] },
    { label: "Conversion depuis et vers Word, Excel, PowerPoint", values: ["no", "yes", "partial"] },
  ] as { label: string; values: ("yes" | "no" | "partial")[] }[],
  note: "Comparatif établi à partir du logiciel livré et des offres publiques des concurrents. Les lignes sur la signature qualifiée et la conversion bureautique sont des limites du produit, que nous indiquons volontairement ; en PDF/A, seul le niveau 2b est produit.",
};

/** Hypothèses du calculateur d'économies. */
export const roi = {
  defaultStaff: 12,
  /** Laissé à zéro : le prix à comparer est celui que paie déjà l'établissement. */
  defaultLicenceCost: 0,
  establishmentYearlyCents: 199000,
  /** Prix annuel de la formule Secrétariat, pour dire quand elle est moins chère. */
  secretariatYearlyCents: 89000,
};
