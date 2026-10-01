/**
 * Les trois publics auxquels Blonay PDF se vend : une commune, un établissement
 * scolaire, un service de l'État.
 *
 * Ils ont le même besoin — des documents officiels à préparer, signer, caviarder
 * et archiver — mais pas le même vocabulaire, pas les mêmes exemples et surtout
 * pas le même acheteur. Un greffe municipal ne se reconnaît pas dans un bulletin
 * scolaire, et un secrétariat d'école ne signe pas de préavis au Conseil
 * communal. Une page par public, avec ses propres mots.
 *
 * ⚠️ Les références légales et les seuils de marchés publics sont indicatifs :
 * ils changent d'un canton à l'autre et se révisent. À faire vérifier avant
 * publication (voir README, section « À vérifier avant de vendre »).
 */

export type SegmentSlug = "communes" | "ecoles" | "etat";

export type Segment = {
  slug: SegmentSlug;
  /** Libellé court, pour la navigation. */
  label: string;
  /** Nom du public, au pluriel, dans une phrase. */
  name: string;
  /** Le titre de la page, en deux morceaux : le second est mis en couleur. */
  title: [string, string];
  kicker: string;
  lede: string;
  /** Qui signe le bon de commande. C'est la personne à convaincre. */
  buyer: { role: string; text: string };
  /** Des situations concrètes, pas des fonctionnalités. */
  situations: { title: string; text: string; tool: string }[];
  /** Ce que coûte l'absence d'outil, dit sans emphase. */
  friction: { title: string; text: string }[];
  /** Les services concernés, pour le bandeau. */
  units: string[];
  /** Les arguments qui comptent pour l'acheteur public de ce segment. */
  assurances: { title: string; text: string }[];
  /** La formule mise en avant pour ce public. */
  recommendedPlan: string;
  /** Le chemin d'achat, de la première question à la mise en service. */
  path: { step: string; title: string; text: string }[];
  faq: { q: string; a: string }[];
};

export const segments: Segment[] = [
  {
    slug: "communes",
    label: "Communes",
    name: "les communes",
    title: ["Les documents de la commune,", "sans licence Acrobat."],
    kicker: "Greffe · Contrôle des habitants · Urbanisme · Bourse communale",
    lede:
      "Un préavis à assembler, un permis de construire à caviarder avant consultation publique, un procès-verbal à signer, un dossier à archiver : tout passe par le PDF. Blonay PDF réunit ces gestes dans un seul outil, facturé une fois pour toute l'administration, sans compter les postes, et sans qu'un document quitte le poste.",
    buyer: {
      role: "Secrétaire municipal·e ou boursier·ère",
      text:
        "La personne qui signe le bon de commande est celle qui subit le problème : c'est le greffe qui assemble les préavis la veille de la séance, et c'est la bourse qui paie les licences. Le devis est nominatif, chiffré, valable 90 jours, et se glisse tel quel dans un dossier de Municipalité.",
    },
    situations: [
      {
        title: "Le préavis au Conseil communal",
        text:
          "Le rapport, les annexes techniques, le plan et le tableau financier arrivent de quatre services en quatre formats. Chacun devient une pièce numérotée : le dossier part en un seul PDF paginé, avec ses intercalaires, son sommaire et un en-tête à votre convenance. Quand une pièce bouge, le sommaire se refait.",
        tool: "Constituer un dossier",
      },
      {
        title: "L'enquête publique",
        text:
          "Un dossier de mise à l'enquête se consulte au guichet et se publie souvent en ligne. On cherche un nom dans trois cents pages et on le caviarde partout d'un coup, après confirmation du nombre d'occurrences : le texte est retiré du flux de la page, pas recouvert d'un rectangle noir. Les métadonnées et les commentaires se nettoient à part, et le fichier produit se relit avant publication.",
        tool: "Caviarder",
      },
      {
        title: "Le procès-verbal signé",
        text:
          "Le PV de la séance de Municipalité se signe par le syndic et le secrétaire. La signature manuscrite se pose dans le document, avec sa date, sans imprimer puis scanner. Ce n'est pas une signature qualifiée au sens de la SCSE : pour un acte qui l'exige, un cachet électronique réglementé reste nécessaire.",
        tool: "Signer",
      },
      {
        title: "Les archives du contrôle des habitants",
        text:
          "Des décennies de fiches scannées, illisibles par une recherche. La reconnaissance de texte, en français et en allemand, les rend consultables, sur le poste et sans rien envoyer. Le logiciel ne produit pas de PDF/A : pour l'archivage légal, nous vous le disons avant, pas après.",
        tool: "Reconnaissance de texte",
      },
    ],
    friction: [
      {
        title: "Une licence par poste, renouvelée chaque année",
        text:
          "Le greffe, la bourse, l'urbanisme et le contrôle des habitants ont chacun besoin du même outil. Facturé par poste, cela devient une ligne budgétaire qu'il faut défendre au Conseil chaque automne.",
      },
      {
        title: "Les outils gratuits en ligne",
        text:
          "Fusionner un dossier d'enquête sur un site gratuit, c'est téléverser des données personnelles sur un serveur dont personne ne sait où il est. Le risque est réel et la responsabilité reste à la commune.",
      },
      {
        title: "Imprimer pour signer, scanner pour envoyer",
        text:
          "Un document qui sort de la chaîne numérique perd sa recherche, sa qualité et sa traçabilité. Et il revient en photocopie de photocopie dans les archives.",
      },
    ],
    units: [
      "Greffe municipal",
      "Contrôle des habitants",
      "Bourse communale",
      "Urbanisme et travaux",
      "État civil",
      "Affaires sociales",
      "Services industriels",
    ],
    assurances: [
      {
        title: "Aucune donnée ne quitte la commune",
        text:
          "L'application de bureau travaille sur le poste, ou sur le lecteur réseau de l'administration. Un dossier d'enquête ouvert dans Blonay PDF ne part sur aucun serveur, pas même les nôtres : le logiciel n'ouvre aucune connexion pour traiter un document.",
      },
      {
        title: "Une facture, pas un abonnement à la carte",
        text:
          "Offre chiffrée, bon de commande, facture à 30 jours avec QR-facture suisse et votre référence interne. Ce que votre comptabilité attend, dans le format qu'elle attend.",
      },
      {
        title: "Sous le seuil du gré à gré",
        text:
          "Le montant annuel reste, dans la plupart des cantons, sous le seuil qui impose une procédure de marché public. C'est à votre secrétariat de le vérifier au regard de votre règlement communal et du droit cantonal des marchés publics.",
      },
      {
        title: "Rien à installer",
        text:
          "Un dossier posé sur le lecteur réseau, un raccourci sur chaque bureau. Aucun droit administrateur, aucun passage de votre informaticien sur chaque poste.",
      },
    ],
    recommendedPlan: "administration",
    path: [
      {
        step: "Jour 1",
        title: "Vous demandez une offre",
        text: "Le formulaire prend deux minutes : la commune, le nombre de postes, la personne à facturer. Aucun compte à créer.",
      },
      {
        step: "Sur chiffrage",
        title: "Vous recevez le devis",
        text: "Un PDF chiffré, nominatif, valable 90 jours, avec l'IDE et les conditions. Prêt à joindre à une décision de Municipalité.",
      },
      {
        step: "À votre rythme",
        title: "Vous acceptez avec votre bon de commande",
        text: "Vous saisissez votre numéro de bon de commande. L'abonnement démarre, la facture part avec sa QR-facture, payable à 30 jours.",
      },
      {
        step: "Le jour même",
        title: "L'administration travaille",
        text: "Le dossier se pose sur le lecteur réseau, chacun ouvre son raccourci et crée son compte au premier lancement.",
      },
    ],
    faq: [
      {
        q: "Faut-il passer par un appel d'offres ?",
        a: "Dans la plupart des cantons, un abonnement annuel de cet ordre reste sous le seuil du gré à gré pour les services. C'est à votre secrétariat de le vérifier au regard de votre règlement communal et du droit cantonal des marchés publics.",
      },
      {
        q: "Combien de postes sont compris ?",
        a: "La formule Administration ne compte pas les postes : tout le personnel communal peut l'utiliser, du greffe aux services industriels. La formule Secrétariat, moins chère, est plafonnée à dix postes et convient aux petites communes.",
      },
      {
        q: "Et si notre informaticien est externe ?",
        a: "Il n'a rien à faire. L'application est portable : un dossier sur le lecteur réseau et un raccourci. Pas d'installation, pas de droits administrateur, pas d'écriture dans le registre. La mise à jour consiste à remplacer un dossier, une fois, pour tout le monde.",
      },
      {
        q: "Les documents partent-ils sur Internet ?",
        a: "Non. L'application de bureau lit, modifie et réassemble les documents sur le poste. Aucune connexion sortante n'est ouverte pour traiter un fichier. C'est vérifiable : le logiciel fonctionne avec le réseau coupé.",
      },
    ],
  },
  {
    slug: "ecoles",
    label: "Écoles",
    name: "les établissements scolaires",
    title: ["Tous les PDF de l'école,", "un seul outil."],
    kicker: "Secrétariat · Direction · Doyens · Corps enseignant",
    lede:
      "Bulletins, convocations, autorisations de sortie, dossiers d'élèves : le secrétariat d'un établissement produit plus de PDF qu'il n'en lit. Une licence par établissement, sans plafond de collaborateurs, réglée sur bon de commande, et des documents qui restent sur le poste.",
    buyer: {
      role: "Direction d'établissement",
      text:
        "La direction décide, le secrétariat utilise. Le devis est établi au nom de l'établissement, avec le détail des prestations, et se transmet tel quel au service cantonal si la dépense doit être validée plus haut.",
    },
    situations: [
      {
        title: "Le dossier d'un élève",
        text:
          "Bulletins, décisions, rapports et correspondance s'assemblent en un seul document paginé, avec ses signets et son sommaire, prêt à transmettre.",
        tool: "Constituer un dossier",
      },
      {
        title: "L'autorisation de sortie",
        text:
          "Un formulaire PDF à remplir, qu'on remplit sur le poste au lieu de le photocopier : les champs se complètent directement, puis le formulaire s'aplatit à l'export. La signature manuscrite de la direction s'y pose sans imprimer.",
        tool: "Formulaires",
      },
      {
        title: "Le rapport transmis à un service externe",
        text:
          "Avant d'envoyer un dossier au SPJ ou à un office, on retire du flux de la page les noms et les données sensibles qui ne concernent pas le destinataire, après confirmation du nombre d'occurrences. Le fichier produit se relit avant l'envoi.",
        tool: "Caviarder",
      },
      {
        title: "Les convocations d'une classe",
        text:
          "Une même opération — pagination, en-tête, réduction, détection des pages vides — appliquée à tout un dossier de fichiers en un seul passage.",
        tool: "Traitement par lots",
      },
    ],
    friction: [
      {
        title: "Une licence Acrobat par secrétaire",
        text:
          "Trois personnes au secrétariat, trois licences, chaque année. Et les enseignants qui en auraient besoin ne l'ont pas.",
      },
      {
        title: "Les données d'élèves sur un site gratuit",
        text:
          "Fusionner un dossier scolaire sur un outil en ligne revient à confier des données sensibles de mineurs à un tiers inconnu. C'est le point sur lequel une direction ne peut pas transiger.",
      },
      {
        title: "Le papier qui circule",
        text:
          "Une autorisation imprimée, distribuée, signée, récupérée, scannée : deux semaines et quelques exemplaires perdus.",
      },
    ],
    units: [
      "Écoles primaires",
      "Établissements secondaires",
      "Gymnases",
      "Écoles professionnelles",
      "Écoles de maturité spécialisée",
      "Directions générales",
    ],
    assurances: [
      {
        title: "Les données des élèves restent sur place",
        text:
          "L'application de bureau traite les documents localement. Rien ne part sur un serveur, et cela se vérifie réseau coupé.",
      },
      {
        title: "Une licence par établissement",
        text:
          "Secrétariat, direction, doyens et corps enseignant : la même application, sans plafond de collaborateurs et sans option payante cachée.",
      },
      {
        title: "Facturation sur bon de commande",
        text:
          "Offre, bon de commande, facture à 30 jours avec QR-facture et votre référence interne. Le circuit habituel d'un établissement.",
      },
      {
        title: "Installable sans informaticien",
        text:
          "Un dossier sur le serveur de l'école, un raccourci par poste. Aucun droit administrateur nécessaire.",
      },
    ],
    recommendedPlan: "administration",
    path: [
      { step: "Jour 1", title: "Vous demandez une offre", text: "L'établissement, le nombre de postes, la personne à facturer. Aucun compte à créer." },
      { step: "Sur chiffrage", title: "Vous recevez le devis", text: "Un PDF chiffré au nom de l'établissement, valable 90 jours, transmissible tel quel au service cantonal." },
      { step: "À votre rythme", title: "Vous acceptez avec votre bon de commande", text: "L'abonnement démarre, la facture part avec sa QR-facture, payable à 30 jours." },
      { step: "Le jour même", title: "Le secrétariat travaille", text: "Le dossier se pose sur le serveur, chacun ouvre son raccourci et crée son compte au premier lancement." },
    ],
    faq: [
      {
        q: "Qui souscrit : l'établissement ou l'enseignant·e ?",
        a: "Les deux sont possibles. La formule Administration couvre tout l'établissement sans plafond et se règle sur facture. La formule Poste permet à une personne de s'équiper seule, par carte, sans passer par la direction.",
      },
      {
        q: "Les élèves peuvent-ils l'utiliser ?",
        a: "L'application de bureau ne demande pas de compte nominatif à qui l'ouvre depuis un poste de l'école : elle demande simplement qui travaille, pour séparer les dossiers. L'extension aux élèves du secondaire II se discute à la mise en place.",
      },
      {
        q: "Que deviennent les documents traités ?",
        a: "Ils restent là où ils sont. L'application de bureau lit et réécrit les fichiers sur le poste ou le serveur de l'école, sans aucun envoi.",
      },
    ],
  },
  {
    slug: "etat",
    label: "État et cantons",
    name: "les services de l'État",
    title: ["Un outil PDF pour l'État,", "déployé une fois."],
    kicker: "Services cantonaux · Directions générales · Établissements de droit public",
    lede:
      "Quand plusieurs services ou plusieurs dizaines d'entités ont le même besoin, l'achat par entité n'a plus de sens. Un déploiement centralisé, un tarif dégressif, un interlocuteur et une facture annuelle unique.",
    buyer: {
      role: "Direction générale ou service d'achat",
      text:
        "Ici, l'acheteur n'est pas l'utilisateur. Le dossier doit tenir devant un service juridique et un service d'achat. Ce que nous pouvons dire dès aujourd'hui, et que vous pouvez vérifier : le logiciel n'ouvre aucune connexion pour traiter un document, il produit des PDF standard, et son code source est public.",
    },
    situations: [
      {
        title: "Un parc à équiper d'un coup",
        text:
          "Des dizaines d'entités, un seul contrat, un seul interlocuteur, une seule facture annuelle. Le déploiement se fait entité par entité, à votre rythme.",
        tool: "Déploiement centralisé",
      },
      {
        title: "Les pièces du dossier d'achat",
        text:
          "Les pièces dont un dossier d'achat a besoin — fiche technique, conditions générales — se demandent avec l'offre. Ce que le logiciel ne fait pas encore (signature qualifiée, PDF/A, vérification des signatures reçues) est écrit en toutes lettres.",
        tool: "Dossier d'achat",
      },
      {
        title: "La réversibilité",
        text:
          "Aucun format propriétaire : ce que produit Blonay PDF est du PDF standard, lisible par n'importe quel autre outil. Vous n'êtes captif de rien.",
        tool: "Formats ouverts",
      },
      {
        title: "La formation des référents",
        text:
          "Un mode d'emploi illustré accompagne le logiciel, et les référent·e·s de chaque entité forment leurs collègues. Une prise en main en visioconférence se convient avec l'offre.",
        tool: "Prise en main",
      },
    ],
    friction: [
      {
        title: "Des licences achetées entité par entité",
        text:
          "Le même logiciel payé trente fois, à trente prix différents, avec trente échéances. Personne n'a la vue d'ensemble et le volume ne sert à rien.",
      },
      {
        title: "Des outils non conformes utilisés faute de mieux",
        text:
          "Quand l'outil officiel manque, les services en trouvent un en ligne. C'est le point de fuite le plus courant pour des données qui ne devraient pas sortir.",
      },
      {
        title: "Des dossiers d'achat qui traînent",
        text:
          "Un fournisseur qui ne sait pas dire clairement ce que fait son logiciel, et ce qu'il ne fait pas, fait perdre des mois. Nous écrivons les deux.",
      },
    ],
    units: [
      "Départements et directions générales",
      "Services cantonaux",
      "Offices régionaux",
      "Établissements de droit public",
      "Associations de communes",
      "Institutions parapubliques",
    ],
    assurances: [
      {
        title: "Traitement local, par construction",
        text:
          "Le logiciel n'ouvre aucune connexion pour traiter un document. Ce n'est pas une promesse contractuelle, c'est une propriété du logiciel, vérifiable réseau coupé.",
      },
      {
        title: "Tarif dégressif au nombre d'entités",
        text:
          "Le prix par entité diminue avec le volume. L'offre est établie sur mesure et reste valable 90 jours.",
      },
      {
        title: "Un logiciel dont on peut relire le code",
        text:
          "Le code source est public : un informaticien cantonal peut lire ce qu'il déploie. La consultation ne confère pas le droit de le copier ou de le revendre — voir la licence.",
      },
      {
        title: "Un interlocuteur, une facture",
        text:
          "Une facture annuelle unique avec QR-facture et votre référence interne, quel que soit le nombre d'entités desservies.",
      },
    ],
    recommendedPlan: "collectivite",
    path: [
      { step: "Premier contact", title: "Vous décrivez le périmètre", text: "Nombre d'entités, nombre de postes, calendrier souhaité, contraintes d'achat." },
      { step: "Sur chiffrage", title: "Vous recevez l'offre", text: "Offre chiffrée sur mesure, valable 90 jours, avec les conditions générales." },
      { step: "Votre procédure", title: "Vous menez la décision", text: "Nous restons disponibles pour les questions du service juridique et du service d'achat, sans relance commerciale." },
      { step: "Déploiement", title: "Entité par entité", text: "Mise en service progressive : un dossier à poser, un raccourci par poste." },
    ],
    faq: [
      {
        q: "Répondez-vous aux appels d'offres ?",
        a: "Nous répondons aux questions du service juridique et du service d'achat. Écrivez-nous avec le calendrier de la procédure. Au-delà du seuil du gré à gré, le produit n'a pas encore de dossier de marché public type : nous le disons plutôt que de le promettre.",
      },
      {
        q: "Un hébergement dédié est-il possible ?",
        a: "Le logiciel ne nécessite aucun hébergement : il travaille sur vos postes et vos serveurs, sans connexion. Il n'y a donc rien à héberger.",
      },
      {
        q: "Que se passe-t-il si vous cessez l'activité ?",
        a: "Ce que produit le logiciel est du PDF standard : vos documents restent lisibles par n'importe quel autre outil, sans conversion. Un séquestre du code source peut être convenu pour un déploiement de cette taille.",
      },
      {
        q: "Comment se fait la facturation ?",
        a: "Une facture annuelle unique, avec QR-facture suisse, votre référence interne et le détail par entité si vous en avez besoin pour votre imputation analytique.",
      },
    ],
  },
];

export const segmentBySlug = (slug: string): Segment | undefined => segments.find((s) => s.slug === slug);

/** Ce que le formulaire d'offre propose comme type d'entité. */
export const ORGANISATION_TYPES = [
  { value: "commune", label: "Commune ou association de communes" },
  { value: "ecole", label: "Établissement scolaire" },
  { value: "etat", label: "Service de l'État ou établissement de droit public" },
  { value: "autre", label: "Autre organisation" },
] as const;

export type OrganisationType = (typeof ORGANISATION_TYPES)[number]["value"];
