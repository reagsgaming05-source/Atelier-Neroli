/**
 * Contenu éditorial du site Blonay PDF. Tout ce qui est propre au produit et à l'entreprise se règle ici.
 * ⚠️ Coordonnées, témoignages et liens de téléchargement sont des valeurs provisoires à remplacer.
 */

export const site = {
  name: "Blonay PDF",
  legalName: "Blonay PDF Sàrl",
  tagline: "L'outil PDF des administrations publiques suisses",
  description:
    "Blonay PDF réunit tout ce qu'il faut pour travailler les documents officiels : éditer, fusionner, convertir, signer, caviarder et annoter les PDF, depuis l'application de bureau ou le navigateur. Une alternative complète à Acrobat pour les communes, les établissements scolaires et les services de l'État — les documents restent sur vos postes, et la facture arrive sur bon de commande.",
  audience: "les communes, les établissements scolaires et les services de l'État",
  founded: 2021,
  address: {
    street: "Route de Vevey 12",
    zip: "1807",
    city: "Blonay",
    canton: "VD",
    country: "Suisse",
  },
  phone: "+41 21 943 00 00",
  phoneHref: "tel:+41219430000",
  email: "bonjour@blonaypdf.ch",
  supportEmail: "support@blonaypdf.ch",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Route+de+Vevey+12+1807+Blonay",
  linkedin: "https://www.linkedin.com/",
  supportHours: [
    { days: "Lundi – Vendredi", value: "07h30 – 17h30" },
    { days: "Samedi et jours fériés", value: "Fermé" },
  ],
  vatNote: "Prix en CHF, TVA 8.1 % incluse.",
  platforms: ["Web", "Windows", "macOS"],
  /** Liens vers l'application : à renseigner lorsque les builds sont disponibles. */
  downloads: {
    web: "#",
    windows: "#",
    mac: "#",
  },
};

export const navigation = [
  { href: "/communes", label: "Communes" },
  { href: "/ecoles", label: "Écoles" },
  { href: "/etat", label: "État" },
  { href: "/fonctionnalites", label: "Fonctionnalités" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/securite", label: "Sécurité" },
];

export const featureCategories = ["Créer & éditer", "Organiser & convertir", "Signer & protéger", "Collaborer"] as const;
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
    | "compare";
  featured?: boolean;
  /** Réservé aux formules Pro et Équipe. */
  pro?: boolean;
};

export const features: Feature[] = [
  {
    slug: "editer",
    name: "Éditer le texte et les images",
    category: "Créer & éditer",
    summary: "Corrigez une date de convocation, remplacez l'en-tête de l'établissement, ajoutez une page : directement dans le PDF.",
    description:
      "L'éditeur reconnaît les blocs de texte, les polices et les images du document. Vous modifiez le contenu comme dans un traitement de texte, avec la mise en page conservée. Les polices manquantes sont remplacées automatiquement par l'équivalent le plus proche.",
    details: ["Texte, images, liens et en-têtes", "Polices et interlignes conservés", "Annuler / rétablir illimité"],
    icon: "edit",
    featured: true,
  },
  {
    slug: "formulaires",
    name: "Créer et remplir des formulaires",
    category: "Créer & éditer",
    summary: "Inscriptions aux camps, autorisations de sortie, demandes de congé : des formulaires à remplir en ligne, réponses centralisées.",
    description:
      "Ajoutez des champs texte, cases à cocher, listes et signatures en quelques clics. La détection automatique repère les zones à remplir dans les formulaires existants, y compris scannés.",
    details: ["Détection automatique des champs", "Réponses exportées en tableau", "Compatible avec les formulaires Acrobat"],
    icon: "forms",
  },
  {
    slug: "ocr",
    name: "Reconnaissance de texte (OCR)",
    category: "Créer & éditer",
    summary: "Rendez les dossiers scannés consultables et modifiables : certificats, décisions, anciens bulletins.",
    description:
      "L'OCR convertit les images de texte en texte réel : vous pouvez ensuite rechercher, copier, éditer ou caviarder. Les documents multilingues sont pris en charge dans un seul passage, avec conservation de la mise en page.",
    details: ["Plus de 30 langues", "Traitement par lots", "Sortie PDF/A pour l'archivage"],
    icon: "ocr",
    pro: true,
  },
  {
    slug: "organiser",
    name: "Organiser les pages",
    category: "Organiser & convertir",
    summary: "Réordonnez, pivotez, supprimez ou insérez des pages par glisser-déposer, par exemple pour assembler un dossier d'élève.",
    description:
      "La vue en vignettes permet de restructurer un document de cent pages en quelques secondes. Vous pouvez extraire une plage de pages vers un nouveau fichier ou insérer des pages venant d'un autre PDF, d'une image ou d'un scan.",
    details: ["Glisser-déposer des vignettes", "Extraction de plages", "Numérotation et filigranes"],
    icon: "organize",
  },
  {
    slug: "fusionner",
    name: "Fusionner et diviser",
    category: "Organiser & convertir",
    summary: "Assemblez les bulletins d'une classe en un seul envoi, ou découpez un lot de convocations par élève.",
    description:
      "Fusionnez des PDF, des images et des documents Office dans l'ordre souhaité, avec une table des matières générée automatiquement. La division fonctionne par nombre de pages, par signets ou par taille de fichier.",
    details: ["Fusion de formats mixtes", "Division par signets ou par taille", "Signets et table des matières"],
    icon: "merge",
    featured: true,
  },
  {
    slug: "convertir",
    name: "Convertir dans les deux sens",
    category: "Organiser & convertir",
    summary: "Word, Excel, PowerPoint, images : vers PDF et depuis PDF, avec export PDF/A pour l'archivage et PDF/UA pour l'accessibilité.",
    description:
      "La conversion vers Word ou Excel reconstruit les paragraphes, tableaux et styles pour un fichier réellement éditable. Vers PDF, la sortie respecte les normes PDF/A et PDF/X pour l'archivage et l'impression.",
    details: ["Word, Excel, PowerPoint, JPG, PNG, HTML", "PDF/A (archivage) et PDF/UA (accessibilité)", "Conversion par lots"],
    icon: "convert",
    featured: true,
  },
  {
    slug: "compresser",
    name: "Compresser sans perte visible",
    category: "Organiser & convertir",
    summary: "Réduisez le poids des documents jusqu'à 90 % pour les envoyer aux parents ou les déposer sur la plateforme de l'école.",
    description:
      "Trois niveaux de compression, avec un aperçu avant/après pour vérifier la qualité des images. Les polices et le texte restent vectoriels, seules les images sont recalculées.",
    details: ["Aperçu avant / après", "Choix de la résolution cible", "Traitement par lots"],
    icon: "compress",
  },
  {
    slug: "signer",
    name: "Signer électroniquement",
    category: "Signer & protéger",
    summary: "Faites signer les parents, la direction ou les stagiaires, suivez l'avancement, avec horodatage et journal d'audit.",
    description:
      "Envoyez un document à un ou plusieurs signataires, définissez l'ordre de signature et recevez une notification à chaque étape. Chaque signature est horodatée et le certificat d'audit est joint au document final.",
    details: ["Signatures simples et avancées", "Ordre de signature et rappels", "Certificat d'audit joint"],
    icon: "sign",
    featured: true,
    pro: true,
  },
  {
    slug: "proteger",
    name: "Protéger et chiffrer",
    category: "Signer & protéger",
    summary: "Mot de passe, chiffrement AES-256 et permissions fines pour les documents contenant des données d'élèves.",
    description:
      "Définissez un mot de passe d'ouverture et un mot de passe de permissions distincts. Vous contrôlez ce que le destinataire peut faire : imprimer, copier du texte, remplir des champs ou modifier le document.",
    details: ["Chiffrement AES-256", "Permissions détaillées", "Suppression des métadonnées"],
    icon: "protect",
  },
  {
    slug: "caviarder",
    name: "Caviarder définitivement",
    category: "Signer & protéger",
    summary: "Supprimez de façon irréversible les données personnelles avant transmission : noms, numéros AVS, adresses.",
    description:
      "Contrairement à un simple rectangle noir, le caviardage retire réellement le contenu du fichier. Recherchez un terme, un numéro AVS ou un IBAN pour caviarder toutes les occurrences en une fois.",
    details: ["Recherche et caviardage en masse", "Motifs prédéfinis (AVS, IBAN, e-mails)", "Rapport de vérification"],
    icon: "redact",
    pro: true,
  },
  {
    slug: "annoter",
    name: "Annoter et commenter",
    category: "Collaborer",
    summary: "Corrigez des travaux, annotez un projet d'établissement, relisez un règlement à plusieurs.",
    description:
      "Les annotations sont compatibles avec les autres lecteurs PDF. Partagez un lien de relecture : vos collègues commentent depuis leur navigateur, sans compte, et vous recevez un résumé des retours.",
    details: ["Surlignage, notes, formes, tampons", "Lien de relecture sans compte", "Résumé des commentaires"],
    icon: "annotate",
  },
  {
    slug: "comparer",
    name: "Comparer deux versions",
    category: "Collaborer",
    summary: "Repérez chaque différence entre deux versions d'un règlement, d'une directive ou d'un plan d'études.",
    description:
      "La comparaison met en évidence les textes ajoutés, supprimés et déplacés, ainsi que les changements de mise en page. Un rapport de synthèse liste les différences, page par page.",
    details: ["Différences de texte et de mise en page", "Rapport exportable", "Navigation d'une différence à l'autre"],
    icon: "compare",
    pro: true,
  },
];

export const values = [
  {
    title: "Les documents ne quittent pas vos postes",
    text: "L'application de bureau lit, modifie et réassemble les fichiers sur votre poste ou votre lecteur réseau. Aucune connexion sortante n'est ouverte pour traiter un document — cela se vérifie réseau coupé.",
  },
  {
    title: "Un seul outil pour toute l'administration",
    text: "Greffe, bourse, urbanisme, secrétariat, direction : la même application pour tout le monde, sans compter les postes et sans tenir une liste de licences.",
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

/** ⚠️ Témoignages fictifs d'exemple, à remplacer par de vrais retours avant publication. */
export const testimonials = [
  {
    quote: "Le préavis part en un seul PDF paginé au lieu de quatre pièces jointes. On a arrêté d'imprimer pour assembler.",
    author: "Témoignage à recueillir",
    detail: "Secrétariat municipal",
  },
  {
    quote: "Le caviardage avant une mise à l'enquête est devenu un réflexe : on cherche, on valide, le texte sort vraiment du fichier.",
    author: "Témoignage à recueillir",
    detail: "Service de l'urbanisme",
  },
  {
    quote: "Rien à installer, rien à demander à notre informaticien externe. Un raccourci, et c'est tout.",
    author: "Témoignage à recueillir",
    detail: "Direction d'établissement scolaire",
  },
];

export const faq = [
  {
    q: "Comment une commune achète-t-elle ?",
    a: "Elle demande une offre depuis le site, sans créer de compte. Elle reçoit un devis chiffré et nominatif, valable 90 jours, qu'elle fait valider en Municipalité. Elle l'accepte ensuite avec son numéro de bon de commande, et la facture part avec sa QR-facture, payable à 30 jours. Aucune carte de crédit n'intervient.",
  },
  {
    q: "Faut-il passer par un appel d'offres ?",
    a: "Dans la plupart des cantons, un abonnement annuel de cet ordre reste sous le seuil du gré à gré pour les services. C'est à votre secrétariat de le vérifier au regard de votre règlement et du droit cantonal des marchés publics. Nous fournissons la fiche technique, le descriptif des prestations et les références dont un dossier d'achat a besoin.",
  },
  {
    q: "Où passent les documents traités ?",
    a: "Nulle part. L'application de bureau lit, modifie et réécrit les fichiers sur votre poste ou votre lecteur réseau ; elle n'ouvre aucune connexion pour traiter un document, et cela se vérifie réseau coupé. C'est la différence avec un outil de fusion en ligne, sur lequel un dossier d'enquête publique partirait chez un tiers.",
  },
  {
    q: "Faut-il installer quelque chose sur chaque poste ?",
    a: "Non. Un dossier posé sur le lecteur réseau et un raccourci par bureau suffisent : aucun droit administrateur, rien dans le registre. La mise à jour consiste à remplacer ce dossier une fois, pour tout le monde.",
  },
  {
    q: "Combien de postes sont compris ?",
    a: "La formule Administration ne les compte pas : tout le personnel de l'entité peut l'utiliser. La formule Secrétariat, moins chère, s'arrête à dix postes. La formule Poste équipe une seule personne, par carte, sans passer par le service d'achat.",
  },
  {
    q: "L'abonnement est-il avec engagement ?",
    a: "Il est annuel et se résilie pour l'échéance depuis l'espace client. Il reste actif jusqu'à la fin de la période déjà réglée, puis s'arrête sans frais.",
  },
  {
    q: "Les signatures électroniques sont-elles valables juridiquement ?",
    a: "Les signatures simples et avancées conviennent à la grande majorité des actes administratifs courants. Pour ceux qui exigent une signature qualifiée au sens de la SCSE, contactez-nous : nous vous orientons vers un prestataire certifié compatible.",
  },
  {
    q: "Que se passe-t-il si vous cessez l'activité ?",
    a: "Ce que produit le logiciel est du PDF standard, lisible par n'importe quel autre outil, sans conversion ni format propriétaire. Pour les déploiements de taille cantonale, une clause de réversibilité et un dépôt du code source figurent au contrat.",
  },
];

export const securityPoints = [
  {
    icon: "server",
    title: "Hébergement en Suisse",
    text: "Serveurs situés en Suisse, chez un prestataire certifié ISO 27001. Aucune donnée n'est transférée hors du pays.",
  },
  {
    icon: "lock",
    title: "Chiffrement de bout en bout",
    text: "TLS 1.3 pour les transferts, AES-256 pour le stockage. Les clés sont gérées séparément des données.",
  },
  {
    icon: "trash",
    title: "Suppression automatique",
    text: "Les fichiers traités en ligne sont supprimés après 24 heures. Vous pouvez aussi les effacer immédiatement.",
  },
  {
    icon: "shield",
    title: "Conforme LPD et LPrD",
    text: "Traitement conforme à la loi fédérale sur la protection des données et à la loi vaudoise sur la protection des données personnelles. Contrat de sous-traitance fourni à chaque établissement.",
  },
  {
    icon: "key",
    title: "Accès maîtrisés",
    text: "Connexion unique via l'identité cantonale, authentification à deux facteurs, journal d'audit des actions par établissement.",
  },
  {
    icon: "monitor",
    title: "Hors ligne sur le bureau",
    text: "L'application Windows et macOS traite vos documents localement. Rien ne quitte votre machine sans votre accord.",
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
  { k: "12", v: "outils PDF" },
  { k: "0", v: "donnée qui sort du poste" },
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
  { week: "Jour 3", title: "Offre reçue", text: "Un PDF prêt à joindre à une décision de Municipalité, de direction ou de service d'achat." },
  { week: "À votre rythme", title: "Bon de commande", text: "Vous acceptez l'offre avec votre numéro de bon de commande ; la facture part avec sa QR-facture, payable à 30 jours." },
  { week: "Le jour même", title: "Mise en service", text: "Le dossier se pose sur le lecteur réseau, un raccourci par poste, chacun crée son compte au premier lancement." },
];

/** Comparatif indicatif (à vérifier avant publication). */
export const comparison = {
  columns: ["Blonay PDF", "Acrobat Pro", "Outils en ligne gratuits"],
  rows: [
    { label: "Documents traités sur le poste, sans envoi", values: ["yes", "partial", "no"] },
    { label: "Conformité LPD et LPrD, contrat de sous-traitance", values: ["yes", "partial", "no"] },
    { label: "Licence par entité, sans plafond de postes", values: ["yes", "no", "no"] },
    { label: "Signature électronique avec journal d'audit", values: ["yes", "yes", "no"] },
    { label: "Caviardage définitif", values: ["yes", "yes", "no"] },
    { label: "OCR multilingue", values: ["yes", "yes", "partial"] },
    { label: "Application de bureau hors ligne", values: ["yes", "yes", "no"] },
    { label: "Installation sans droits administrateur", values: ["yes", "no", "yes"] },
    { label: "Support en français", values: ["yes", "partial", "no"] },
    { label: "Offre, bon de commande et QR-facture", values: ["yes", "partial", "no"] },
  ] as { label: string; values: ("yes" | "no" | "partial")[] }[],
  note: "Comparatif indicatif établi à partir des offres publiques ; à vérifier avant publication.",
};

/** Hypothèses du calculateur d'économies. */
export const roi = {
  defaultStaff: 12,
  defaultLicenceCost: 24000, // CHF 240.– par an et par licence, en centimes
  establishmentYearlyCents: 199000,
};
