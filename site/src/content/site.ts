/**
 * Contenu éditorial du site Blonay PDF.
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
  name: "Blonay PDF",
  /** Tant que l'éditeur n'est pas renseigné, on ne lui invente aucun nom. */
  legalName: editeur.nom || "L'éditeur",
  tagline: "Tout le travail PDF d'un secrétariat, sans qu'un document sorte",
  description:
    "Blonay PDF est un logiciel PDF complet pour un secrétariat communal ou scolaire suisse. Vingt-six outils : lire, réorganiser, fusionner, corriger le texte dans le PDF, annoter, caviarder, reconnaître le texte d'un scan en français et en allemand, recopier un tableau dans Excel, comparer deux versions, constituer un dossier de pièces avec intercalaires, pagination continue et sommaire, imprimer en livret. Il se décompresse dans un dossier et se lance par double-clic : rien à installer, aucun droit administrateur. Il n'ouvre aucune connexion pour traiter un document.",
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
    windows: "https://github.com/reagsgaming05-source/Atelier-Neroli/releases/download/blonaypdf-windows-latest/BlonayPDF-windows.zip",
    mac: "https://github.com/reagsgaming05-source/Atelier-Neroli/releases/download/blonaypdf-mac-latest/BlonayPDF-mac.zip",
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
    summary: "Remplissez les champs d'un formulaire PDF reçu, puis aplatissez-le à l'export.",
    description:
      "Les champs d'un formulaire PDF standard (AcroForm) se remplissent directement : texte, cases à cocher, listes. À l'export, le formulaire peut être aplati pour figer les valeurs. Les formulaires de type XFA ne sont pas pris en charge.",
    details: ["Champs, cases et listes", "Formulaires PDF standard (AcroForm)", "Aplatir à l'export"],
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
      "La reconnaissance de texte (OCR) s'exécute sur le poste, avec le moteur et les modèles de langue inclus dans le logiciel : rien n'est envoyé nulle part. Elle reconnaît le français et l'allemand. Le texte reconnu sert ensuite à la recherche, au remplacement, au caviardage et à la copie, et repart dans le PDF exporté comme texte invisible placé sous l'image.",
    details: ["Français et allemand", "Entièrement local, sans réseau", "Texte invisible dans le PDF exporté"],
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
      "Le caviardage retire du flux de la page les lettres masquées, et refait l'image lorsqu'une image passe sous la zone. Le logiciel annonce le nombre d'occurrences avant d'agir et demande confirmation. Les métadonnées, les commentaires et les champs de formulaire ne sont pas traités : nettoyez-les avant transmission, et relisez le fichier produit.",
    details: ["Recherche dans tout le document", "Confirmation du nombre d'occurrences", "Texte de la page seulement"],
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
];

export const values = [
  {
    title: "Les documents ne quittent pas le poste",
    text: "Le logiciel lit, modifie et réassemble les fichiers sur votre poste ou votre lecteur réseau. Il n'ouvre aucune connexion pour traiter un document — cela se vérifie réseau coupé.",
  },
  {
    title: "Rien à installer, aucun droit administrateur",
    text: "Un dossier posé sur le lecteur réseau, un raccourci par poste. Pas d'installation, pas d'écriture dans le registre, aucun service, aucune tâche planifiée. La mise à jour consiste à remplacer ce dossier, une fois, pour tout le monde.",
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
    a: "Non. Un dossier posé sur le lecteur réseau et un raccourci par bureau suffisent : aucun droit administrateur, rien dans le registre. La mise à jour consiste à remplacer ce dossier une fois, pour tout le monde.",
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
    a: "Le logiciel pose une signature manuscrite dessinée dans la page, avec la date que vous saisissez. Ce n'est pas une signature électronique au sens de la SCSE. Pour une décision notifiée par voie électronique, un cachet électronique réglementé est requis (OCEl-PA, art. 9) ; nous vous orientons vers un fournisseur reconnu.",
  },
  {
    q: "Le caviardage est-il définitif ?",
    a: "Le caviardage retire du flux de la page les lettres masquées, et refait l'image lorsqu'une image passe sous la zone. Les métadonnées, les commentaires et les champs de formulaire ne sont pas traités : nettoyez-les avant transmission et relisez le fichier produit avant de le publier.",
  },
  {
    q: "Que ne fait pas le logiciel ?",
    a: "Il ne vérifie pas les signatures numériques des PDF que vous recevez, il ne produit pas de PDF/A, il ne convertit pas depuis ou vers Word, Excel et PowerPoint, et il ne balise pas les documents pour l'accessibilité. Nous le disons avant l'évaluation, pas après.",
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
  columns: ["Blonay PDF", "Acrobat Pro", "Outils en ligne gratuits"],
  rows: [
    { label: "Documents traités sur le poste, sans envoi", values: ["yes", "partial", "no"] },
    { label: "Licence par entité, sans plafond de postes", values: ["yes", "no", "no"] },
    { label: "Dossier de pièces : intercalaires, pagination continue, sommaire", values: ["yes", "partial", "no"] },
    { label: "Caviarder le texte d'une page", values: ["partial", "yes", "no"] },
    { label: "Reconnaissance de texte français et allemand, hors ligne", values: ["yes", "yes", "partial"] },
    { label: "Installation sans droits administrateur", values: ["yes", "no", "yes"] },
    { label: "Offre, bon de commande et QR-facture", values: ["yes", "partial", "no"] },
    { label: "Signature électronique qualifiée (SCSE)", values: ["no", "partial", "no"] },
    { label: "Sortie PDF/A pour l'archivage", values: ["no", "yes", "no"] },
    { label: "Conversion depuis et vers Word, Excel, PowerPoint", values: ["no", "yes", "partial"] },
  ] as { label: string; values: ("yes" | "no" | "partial")[] }[],
  note: "Comparatif établi à partir du logiciel livré et des offres publiques des concurrents. Les deux dernières lignes sont des limites du produit, que nous indiquons volontairement.",
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
