/**
 * Les formules, insérées en base au premier lancement (voir scripts/seed.ts).
 *
 * Elles sont volontairement neutres : « Secrétariat » et « Administration »
 * parlent aussi bien à un greffe communal qu'à une direction d'école ou à un
 * service de l'État. Une formule par type de client aurait multiplié les pages
 * sans rien ajouter — c'est le public visé qui change, pas ce qu'on vend.
 *
 * Deux choses commandent le parcours d'achat, et pas le prix :
 *  - `allowCard`    : on peut souscrire en ligne, tout de suite, par carte.
 *  - `allowInvoice` : on peut demander une offre et régler sur facture, à
 *                     30 jours, avec un bon de commande. C'est ainsi qu'achète
 *                     une collectivité publique, et c'est le chemin principal.
 *
 * ⚠️ Les prix sont des valeurs de départ défendables, pas des prix arrêtés.
 * Ils se changent ici, et s'appliquent au prochain démarrage.
 */
export const planCatalog = [
  {
    slug: "poste",
    name: "Poste",
    tagline: "Une personne, tous les outils.",
    description:
      "Pour s'équiper seul·e, sans passer par le service d'achat : une secrétaire qui veut arrêter d'attendre, un·e enseignant·e, un·e indépendant·e qui travaille pour une commune.",
    priceMonthlyCents: 490,
    priceYearlyCents: 4900,
    /** 0 = sans plafond. */
    maxSeats: 1,
    features: [
      "Les 12 outils, bureau et web",
      "Signatures, reconnaissance de texte et caviardage inclus",
      "1 poste · tous vos appareils",
      "Paiement par carte, sans engagement",
    ],
    highlight: false,
    allowCard: true,
    allowInvoice: false,
    quoteOnly: false,
    sortOrder: 1,
  },
  {
    slug: "secretariat",
    name: "Secrétariat",
    tagline: "Une petite équipe, une seule licence.",
    description:
      "Le format d'une petite commune ou d'une école primaire : jusqu'à dix postes qui partagent la même installation sur le lecteur réseau, chacun avec ses propres dossiers.",
    priceMonthlyCents: 8900,
    priceYearlyCents: 89000,
    maxSeats: 10,
    features: [
      "Jusqu'à 10 postes",
      "Installation unique sur le lecteur réseau",
      "Un dossier par personne, protégé par mot de passe",
      "Carte bancaire ou facture à 30 jours",
      "Support en français",
    ],
    highlight: false,
    allowCard: true,
    allowInvoice: true,
    quoteOnly: false,
    sortOrder: 2,
  },
  {
    slug: "administration",
    name: "Administration",
    tagline: "Toute l'entité, sans compter les postes.",
    description:
      "Une commune, un établissement scolaire ou un service : tout le personnel utilise l'outil, du greffe aux services techniques, sans qu'on ait à tenir une liste de licences.",
    priceMonthlyCents: 19900,
    priceYearlyCents: 199000,
    maxSeats: 0,
    features: [
      "Postes illimités dans l'entité",
      "Mise à jour centralisée : un dossier à remplacer, une fois",
      "Contrat de sous-traitance LPD / LPrD",
      "Facture à 30 jours avec QR-facture et votre référence",
      "Fiche technique pour le dossier d'achat",
      "Formation du secrétariat à la mise en service",
    ],
    highlight: true,
    allowCard: true,
    allowInvoice: true,
    quoteOnly: false,
    sortOrder: 3,
  },
  {
    slug: "collectivite",
    name: "Collectivité",
    tagline: "Plusieurs entités, un seul contrat.",
    description:
      "Un canton, une direction générale, une association de communes : le tarif décroît avec le nombre d'entités, et le dossier d'achat est fourni prêt à instruire.",
    priceMonthlyCents: 0,
    priceYearlyCents: 0,
    maxSeats: 0,
    features: [
      "Tout Administration, pour toutes vos entités",
      "Tarif dégressif au nombre d'entités",
      "Dossier de marché public fourni",
      "Clause de réversibilité et pérennité",
      "Formation des référent·e·s et support dédié",
      "Une facture annuelle unique",
    ],
    highlight: false,
    allowCard: false,
    allowInvoice: true,
    quoteOnly: true,
    sortOrder: 4,
  },
];

export type PlanSeed = (typeof planCatalog)[number];

export const planSeedBySlug = (slug: string) => planCatalog.find((p) => p.slug === slug);
