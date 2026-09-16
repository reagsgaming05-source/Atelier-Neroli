/**
 * Contenu éditorial du site Blonay PDF. Tout ce qui est propre au produit et à l'entreprise se règle ici.
 * ⚠️ Coordonnées, témoignages et liens de téléchargement sont des valeurs provisoires à remplacer.
 */

export const site = {
  name: "Blonay PDF",
  legalName: "Blonay PDF Sàrl",
  tagline: "L'outil PDF des établissements scolaires vaudois",
  description:
    "Blonay PDF réunit tout ce qu'il faut pour travailler les documents de l'école : éditer, fusionner, convertir, signer, protéger et annoter les PDF, depuis le navigateur ou l'application de bureau. Une alternative complète à Acrobat pour l'État de Vaud et ses établissements scolaires, hébergée en Suisse et conforme à la LPrD.",
  audience: "l'État de Vaud et l'ensemble des établissements scolaires",
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
    { days: "Vacances scolaires", value: "08h30 – 12h00" },
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
  { href: "/fonctionnalites", label: "Fonctionnalités" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/securite", label: "Sécurité" },
  { href: "/contact", label: "Contact" },
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
    title: "Les données des élèves restent en Suisse",
    text: "Traitement et stockage sur des serveurs situés en Suisse, chiffrement de bout en bout, suppression automatique des fichiers temporaires. Conforme à la LPD et à la LPrD vaudoise.",
  },
  {
    title: "Un seul outil pour tout l'établissement",
    text: "Secrétariat, direction, doyens et enseignant·e·s utilisent la même application, dans le navigateur ou sur le poste de travail, avec la connexion unique de l'identité cantonale.",
  },
  {
    title: "Un prix public, une facture par établissement",
    text: "Une licence par établissement, sans plafond de collaborateurs, facturée sur bon de commande. Aucune option payante cachée.",
  },
];

export const steps = [
  {
    title: "L'établissement souscrit",
    text: "Le secrétariat ou la direction choisit la formule Établissement et reçoit la facture sur bon de commande.",
  },
  {
    title: "Les collaborateur·trice·s se connectent",
    text: "Avec leur identité cantonale ou une invitation par e-mail. Aucune installation n'est nécessaire pour la version web.",
  },
  {
    title: "Chacun travaille ses PDF",
    text: "Bulletins, convocations, formulaires, dossiers : dans le navigateur ou l'application de bureau, hors ligne si besoin.",
  },
];

/** Témoignages fictifs d'exemple, à remplacer par de vrais retours clients. */
export const testimonials = [
  {
    quote: "Les autorisations de sortie signées par les parents reviennent en deux jours au lieu de deux semaines. Le secrétariat a arrêté de courir après les papiers.",
    author: "Claire M.",
    detail: "Secrétaire d'établissement primaire, Riviera",
  },
  {
    quote: "Le caviardage des données d'élèves avant transmission à un service externe est devenu un réflexe : on recherche, on valide, c'est propre.",
    author: "Nadia R.",
    detail: "Doyenne, gymnase vaudois",
  },
  {
    quote: "Je corrige les travaux de mes classes directement dans le PDF, sur le poste de l'école comme à la maison. Un seul outil, enfin.",
    author: "Thomas B.",
    detail: "Enseignant, école professionnelle",
  },
];

export const faq = [
  {
    q: "Qui souscrit : l'enseignant·e ou l'établissement ?",
    a: "Les deux sont possibles. La formule Établissement couvre l'ensemble des collaborateur·trice·s d'une école, sans plafond, et se règle sur facture. La formule Enseignant·e permet à une personne de s'équiper individuellement.",
  },
  {
    q: "Que deviennent les documents des élèves ?",
    a: "Les fichiers traités en ligne sont chiffrés, hébergés en Suisse et supprimés automatiquement après 24 heures, sauf enregistrement volontaire dans l'espace de l'établissement. L'application de bureau traite les documents localement. Le traitement respecte la LPD et la LPrD vaudoise.",
  },
  {
    q: "Les élèves peuvent-ils utiliser l'outil ?",
    a: "La licence Établissement peut être étendue aux élèves du secondaire II pour la remise de travaux et les formulaires, sans compte nominatif pour les mineurs. Parlez-en avec nous lors de la mise en place.",
  },
  {
    q: "L'abonnement est-il avec engagement ?",
    a: "Non. L'abonnement se résilie à tout moment depuis l'espace client ; il reste actif jusqu'à la fin de la période déjà réglée, puis s'arrête sans frais.",
  },
  {
    q: "Puis-je changer de formule ?",
    a: "Oui. Un passage à une formule supérieure est immédiat, avec un crédit au prorata de la période en cours. Un passage à une formule inférieure prend effet à la prochaine échéance.",
  },
  {
    q: "Les signatures électroniques sont-elles valables juridiquement ?",
    a: "Les signatures simples et avancées conviennent à la grande majorité des contrats. Pour les actes exigeant une signature qualifiée au sens de la SCSE, contactez-nous : nous vous orientons vers un prestataire certifié compatible.",
  },
  {
    q: "Comment se passe le paiement ?",
    a: "Les particuliers règlent par carte, en ligne. Les établissements et services de l'État peuvent régler sur facture, avec bon de commande et référence interne. Toutes les factures sont disponibles dans l'espace client.",
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

export const contactSubjects = ["Souscrire pour un établissement", "Offre cantonale", "Demande de démonstration", "Support technique", "Autre demande"];

export const stats = [
  { k: "12", v: "outils PDF" },
  { k: "100 %", v: "hébergé en Suisse" },
  { k: "1", v: "licence par établissement" },
];
