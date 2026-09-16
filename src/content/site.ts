/**
 * Contenu éditorial du site Blonay PDF. Tout ce qui est propre au produit et à l'entreprise se règle ici.
 * ⚠️ Coordonnées, témoignages et liens de téléchargement sont des valeurs provisoires à remplacer.
 */

export const site = {
  name: "Blonay PDF",
  legalName: "Blonay PDF Sàrl",
  tagline: "L'outil PDF complet, conçu en Suisse",
  description:
    "Blonay PDF réunit tout ce qu'il faut pour travailler vos documents : éditer, fusionner, convertir, signer, protéger et annoter vos PDF, depuis le navigateur ou l'application de bureau. Une alternative complète à Acrobat, avec des données hébergées en Suisse.",
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
    { days: "Lundi – Vendredi", value: "08h30 – 18h00" },
    { days: "Samedi – Dimanche", value: "E-mail uniquement" },
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
    summary: "Corrigez un paragraphe, remplacez un logo, ajoutez une page : directement dans le PDF, sans repasser par le fichier d'origine.",
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
    summary: "Transformez n'importe quel document en formulaire à remplir, ou complétez ceux que vous recevez.",
    description:
      "Ajoutez des champs texte, cases à cocher, listes et signatures en quelques clics. La détection automatique repère les zones à remplir dans les formulaires existants, y compris scannés.",
    details: ["Détection automatique des champs", "Export des réponses en CSV", "Compatible avec les formulaires Acrobat"],
    icon: "forms",
  },
  {
    slug: "ocr",
    name: "Reconnaissance de texte (OCR)",
    category: "Créer & éditer",
    summary: "Rendez vos scans consultables et modifiables, en français, allemand, italien et anglais.",
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
    summary: "Réordonnez, pivotez, supprimez ou insérez des pages par glisser-déposer.",
    description:
      "La vue en vignettes permet de restructurer un document de cent pages en quelques secondes. Vous pouvez extraire une plage de pages vers un nouveau fichier ou insérer des pages venant d'un autre PDF, d'une image ou d'un scan.",
    details: ["Glisser-déposer des vignettes", "Extraction de plages", "Numérotation et filigranes"],
    icon: "organize",
  },
  {
    slug: "fusionner",
    name: "Fusionner et diviser",
    category: "Organiser & convertir",
    summary: "Combinez plusieurs fichiers en un seul PDF, ou découpez un document volumineux.",
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
    summary: "Word, Excel, PowerPoint, images, HTML : vers PDF et depuis PDF, avec la mise en page respectée.",
    description:
      "La conversion vers Word ou Excel reconstruit les paragraphes, tableaux et styles pour un fichier réellement éditable. Vers PDF, la sortie respecte les normes PDF/A et PDF/X pour l'archivage et l'impression.",
    details: ["Word, Excel, PowerPoint, JPG, PNG, HTML", "PDF/A et PDF/X", "Conversion par lots"],
    icon: "convert",
    featured: true,
  },
  {
    slug: "compresser",
    name: "Compresser sans perte visible",
    category: "Organiser & convertir",
    summary: "Réduisez le poids de vos fichiers jusqu'à 90 % pour les envoyer par e-mail ou les archiver.",
    description:
      "Trois niveaux de compression, avec un aperçu avant/après pour vérifier la qualité des images. Les polices et le texte restent vectoriels, seules les images sont recalculées.",
    details: ["Aperçu avant / après", "Choix de la résolution cible", "Traitement par lots"],
    icon: "compress",
  },
  {
    slug: "signer",
    name: "Signer électroniquement",
    category: "Signer & protéger",
    summary: "Signez, faites signer et suivez l'avancement, avec horodatage et journal d'audit.",
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
    summary: "Mot de passe, chiffrement AES-256 et permissions fines : impression, copie, modification.",
    description:
      "Définissez un mot de passe d'ouverture et un mot de passe de permissions distincts. Vous contrôlez ce que le destinataire peut faire : imprimer, copier du texte, remplir des champs ou modifier le document.",
    details: ["Chiffrement AES-256", "Permissions détaillées", "Suppression des métadonnées"],
    icon: "protect",
  },
  {
    slug: "caviarder",
    name: "Caviarder définitivement",
    category: "Signer & protéger",
    summary: "Supprimez des informations sensibles de façon irréversible, texte et images compris.",
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
    summary: "Surlignez, commentez, dessinez et discutez dans le document, à plusieurs.",
    description:
      "Les annotations sont compatibles avec les autres lecteurs PDF. Partagez un lien de relecture : vos collègues commentent depuis leur navigateur, sans compte, et vous recevez un résumé des retours.",
    details: ["Surlignage, notes, formes, tampons", "Lien de relecture sans compte", "Résumé des commentaires"],
    icon: "annotate",
  },
  {
    slug: "comparer",
    name: "Comparer deux versions",
    category: "Collaborer",
    summary: "Repérez chaque différence entre deux versions d'un contrat ou d'un rapport.",
    description:
      "La comparaison met en évidence les textes ajoutés, supprimés et déplacés, ainsi que les changements de mise en page. Un rapport de synthèse liste les différences, page par page.",
    details: ["Différences de texte et de mise en page", "Rapport exportable", "Navigation d'une différence à l'autre"],
    icon: "compare",
    pro: true,
  },
];

export const values = [
  {
    title: "Vos fichiers restent en Suisse",
    text: "Traitement et stockage sur des serveurs situés en Suisse, chiffrement de bout en bout, suppression automatique des fichiers temporaires après 24 heures.",
  },
  {
    title: "Un seul outil, partout",
    text: "La même application dans le navigateur, sur Windows et sur macOS. Vos documents et réglages vous suivent, et l'app de bureau fonctionne hors ligne.",
  },
  {
    title: "Un prix clair, sans engagement",
    text: "Trois formules, mensuelles ou annuelles, résiliables à tout moment. Pas de frais cachés ni d'options facturées à part.",
  },
];

export const steps = [
  {
    title: "Créez votre compte",
    text: "Une adresse e-mail suffit. Votre espace client centralise abonnement, factures et licence.",
  },
  {
    title: "Choisissez votre formule",
    text: "Essentiel, Pro ou Équipe, en mensuel ou en annuel. Vous pouvez changer de formule à tout moment.",
  },
  {
    title: "Ouvrez vos PDF",
    text: "Dans le navigateur immédiatement, ou en installant l'application sur Windows et macOS.",
  },
];

/** Témoignages fictifs d'exemple, à remplacer par de vrais retours clients. */
export const testimonials = [
  {
    quote: "Nous avons remplacé cinq licences Acrobat par Blonay PDF. La signature électronique et le caviardage nous font gagner des heures chaque semaine.",
    author: "Claire M.",
    detail: "Fiduciaire, Vevey · formule Équipe",
  },
  {
    quote: "La conversion vers Word est enfin fidèle : les tableaux ressortent propres. Et l'OCR sur nos plans scannés fonctionne du premier coup.",
    author: "Nadia R.",
    detail: "Bureau d'architecture, Montreux · formule Pro",
  },
  {
    quote: "Un outil simple qui fait tout ce dont j'ai besoin, avec des données qui restent en Suisse. Le rapport qualité-prix est imbattable.",
    author: "Thomas B.",
    detail: "Avocat indépendant · formule Pro",
  },
];

export const faq = [
  {
    q: "L'abonnement est-il avec engagement ?",
    a: "Non. Vous pouvez résilier à tout moment depuis votre espace client ; l'abonnement reste actif jusqu'à la fin de la période déjà réglée, puis s'arrête sans frais.",
  },
  {
    q: "Que deviennent mes fichiers ?",
    a: "Les fichiers traités en ligne sont chiffrés, hébergés en Suisse et supprimés automatiquement après 24 heures, sauf si vous les enregistrez dans votre espace de stockage. L'application de bureau traite vos documents localement.",
  },
  {
    q: "Puis-je utiliser Blonay PDF sur plusieurs appareils ?",
    a: "Oui. Une licence Essentiel ou Pro couvre tous vos appareils (navigateur, Windows, macOS). La formule Équipe inclut cinq utilisateurs, extensibles depuis l'administration.",
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
    a: "Le paiement s'effectue par carte, en ligne, à la souscription puis à chaque renouvellement. Vos factures sont disponibles dans votre espace client, en format imprimable.",
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
    title: "Conforme LPD et RGPD",
    text: "Traitement conforme à la loi fédérale sur la protection des données et au RGPD. Contrat de sous-traitance disponible pour les équipes.",
  },
  {
    icon: "key",
    title: "Accès maîtrisés",
    text: "Authentification à deux facteurs, connexion unique (SSO) Google et Microsoft pour les équipes, journal d'audit des actions.",
  },
  {
    icon: "monitor",
    title: "Hors ligne sur le bureau",
    text: "L'application Windows et macOS traite vos documents localement. Rien ne quitte votre machine sans votre accord.",
  },
] as const;

export const contactSubjects = ["Question sur les tarifs", "Demande de démonstration", "Offre pour une équipe", "Support technique", "Autre demande"];

export const stats = [
  { k: "12", v: "outils PDF" },
  { k: "3", v: "plateformes" },
  { k: "0", v: "engagement" },
];
