/**
 * Contenu éditorial du site. Tout ce qui est propre à l'entreprise se règle ici.
 * ⚠️ Les coordonnées ci-dessous sont des valeurs provisoires à remplacer.
 */

export const site = {
  name: "Atelier Néroli",
  shortName: "Néroli",
  tagline: "Soins & bien-être à Blonay",
  description:
    "Atelier Néroli est une maison de soins et de bien-être à Blonay, sur la Riviera vaudoise. Soins du visage, massages aux huiles essentielles et ateliers de senteurs, sur rendez-vous ou en abonnement.",
  founded: 2018,
  address: {
    street: "Route de Vevey 12",
    zip: "1807",
    city: "Blonay",
    canton: "VD",
    country: "Suisse",
  },
  phone: "+41 21 943 00 00",
  phoneHref: "tel:+41219430000",
  email: "bonjour@atelier-neroli.ch",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Route+de+Vevey+12+1807+Blonay",
  instagram: "https://www.instagram.com/",
  hours: [
    { days: "Lundi", value: "Fermé" },
    { days: "Mardi – Vendredi", value: "09h00 – 19h00" },
    { days: "Samedi", value: "09h00 – 16h00" },
    { days: "Dimanche", value: "Fermé" },
  ],
  vatNote: "Prix en CHF, TVA 8.1 % incluse.",
};

export const navigation = [
  { href: "/soins", label: "Soins" },
  { href: "/abonnements", label: "Abonnements" },
  { href: "/a-propos", label: "L'atelier" },
  { href: "/contact", label: "Contact" },
];

export type Service = {
  slug: string;
  name: string;
  category: "Visage" | "Corps" | "Rituels" | "Ateliers";
  duration: string;
  priceCents: number;
  summary: string;
  description: string;
  benefits: string[];
  icon: "sparkles" | "hand" | "flower" | "flask" | "leaf" | "sun";
  featured?: boolean;
};

export const services: Service[] = [
  {
    slug: "soin-visage-signature",
    name: "Soin visage signature Néroli",
    category: "Visage",
    duration: "60 min",
    priceCents: 16000,
    summary: "Nettoyage, gommage doux, massage lymphatique et masque à la fleur d'oranger.",
    description:
      "Notre soin emblématique. Un protocole complet qui commence par un diagnostic de peau, se poursuit par un nettoyage en profondeur et un gommage enzymatique, puis un long massage drainant du visage, du cou et du décolleté. Le masque au néroli et à l'hydrolat de rose vient apaiser et illuminer le teint.",
    benefits: ["Teint unifié et lumineux", "Traits détendus", "Hydratation profonde"],
    icon: "sparkles",
    featured: true,
  },
  {
    slug: "massage-aromatique",
    name: "Massage aromatique sur mesure",
    category: "Corps",
    duration: "60 · 90 min",
    priceCents: 15000,
    summary: "Une synergie d'huiles essentielles composée pour vous, un massage lent et enveloppant.",
    description:
      "Avant chaque séance, nous composons ensemble une synergie d'huiles essentielles adaptée à votre état du moment : besoin de calme, de tonus ou de récupération. Le massage, à l'huile végétale suisse de première pression, alterne manœuvres profondes et effleurages pour relâcher les tensions durablement.",
    benefits: ["Relâchement musculaire", "Sommeil apaisé", "Synergie personnalisée à emporter"],
    icon: "hand",
    featured: true,
  },
  {
    slug: "rituel-fleur-d-oranger",
    name: "Rituel Fleur d'oranger",
    category: "Rituels",
    duration: "120 min",
    priceCents: 28000,
    summary: "Gommage corps, enveloppement, massage et soin visage express : une parenthèse complète.",
    description:
      "Deux heures hors du temps. Le rituel s'ouvre par un gommage corps au sucre et à l'huile de néroli, se poursuit par un enveloppement chaud puis un massage intégral, et se termine par un soin visage express. Une tisane maison vous attend à la fin du rituel.",
    benefits: ["Peau douce et nourrie", "Esprit apaisé", "Effet détox"],
    icon: "flower",
    featured: true,
  },
  {
    slug: "atelier-senteurs",
    name: "Atelier création de senteur",
    category: "Ateliers",
    duration: "90 min",
    priceCents: 12000,
    summary: "Composez votre eau de senteur ou votre huile de massage, guidé·e par notre aromathérapeute.",
    description:
      "En petit groupe (4 personnes maximum), découvrez les familles olfactives, apprenez à équilibrer notes de tête, de cœur et de fond, et repartez avec votre création (30 ml). Un moment convivial à partager, idéal pour un cadeau.",
    benefits: ["Création personnelle offerte", "Petit groupe", "Idéal en duo"],
    icon: "flask",
  },
  {
    slug: "soin-express",
    name: "Éclat express",
    category: "Visage",
    duration: "30 min",
    priceCents: 8500,
    summary: "Nettoyage, masque coup d'éclat et modelage rapide : l'idéal entre deux rendez-vous.",
    description:
      "Un soin court et efficace pour retrouver un teint frais en trente minutes. Nettoyage, masque adapté à votre peau et modelage stimulant. Parfait avant un événement ou pour entretenir les résultats de votre soin signature.",
    benefits: ["Résultat immédiat", "Sans temps de récupération", "Compatible pause de midi"],
    icon: "sun",
  },
  {
    slug: "consultation-aromatherapie",
    name: "Consultation aromathérapie",
    category: "Rituels",
    duration: "45 min",
    priceCents: 9000,
    summary: "Un entretien personnalisé pour intégrer les huiles essentielles à votre quotidien, en toute sécurité.",
    description:
      "Notre aromathérapeute diplômée vous reçoit pour un bilan de vos besoins (sommeil, stress, peau, saisonnalité) et vous remet un protocole écrit avec des recommandations d'usage sûres et précises.",
    benefits: ["Protocole écrit", "Conseils personnalisés", "Suivi possible"],
    icon: "leaf",
  },
];

export const values = [
  {
    title: "Des formules naturelles",
    text: "Huiles végétales suisses de première pression, huiles essentielles chémotypées, sans parfum de synthèse ni silicone.",
  },
  {
    title: "Le temps juste",
    text: "Jamais deux rendez-vous à la même heure. Chaque soin commence par un moment d'écoute et se termine sans hâte.",
  },
  {
    title: "Un savoir-faire certifié",
    text: "Esthéticienne CFC, aromathérapeute diplômée et formation continue chaque année en Suisse et en France.",
  },
];

export const steps = [
  {
    title: "Choisissez votre formule",
    text: "Trois abonnements, mensuels ou annuels, sans engagement au-delà de la période en cours.",
  },
  {
    title: "Réservez vos soins",
    text: "Par téléphone ou par e-mail, avec une priorité de réservation réservée aux membres.",
  },
  {
    title: "Profitez chaque mois",
    text: "Vos soins inclus, vos avantages boutique et vos invitations aux ateliers, gérés depuis votre espace.",
  },
];

/** Témoignages fictifs d'exemple, à remplacer par de vrais avis clients. */
export const testimonials = [
  {
    quote:
      "Le soin signature est devenu mon rendez-vous mensuel. On sort avec la peau lumineuse et la tête vide, ce qui est rare.",
    author: "Claire M.",
    detail: "Membre Signature depuis 2023",
  },
  {
    quote:
      "J'ai offert l'atelier senteurs à ma sœur, nous y sommes allées ensemble. Un moment vraiment à part, et un parfum que je porte encore.",
    author: "Nadia R.",
    detail: "Atelier création de senteur",
  },
  {
    quote:
      "Un lieu calme, des huiles remarquables et une vraie écoute. L'abonnement annuel s'est imposé de lui-même.",
    author: "Thomas B.",
    detail: "Membre Prestige",
  },
];

export const faq = [
  {
    q: "L'abonnement est-il avec engagement ?",
    a: "Non. Vous pouvez résilier à tout moment depuis votre espace membre ; l'abonnement reste actif jusqu'à la fin de la période déjà réglée, puis s'arrête sans frais.",
  },
  {
    q: "Les soins non utilisés sont-ils reportés ?",
    a: "Les soins inclus dans une formule mensuelle sont valables durant le mois en cours. Avec une formule annuelle, ils peuvent être répartis librement sur l'année.",
  },
  {
    q: "Puis-je changer de formule ?",
    a: "Oui. Un passage à une formule supérieure est immédiat, avec un crédit au prorata de la période en cours. Un passage à une formule inférieure prend effet à la prochaine échéance.",
  },
  {
    q: "Puis-je offrir un abonnement ?",
    a: "Bien sûr. Contactez-nous et nous préparons une carte cadeau à votre nom, valable sur les abonnements comme sur les soins à l'unité.",
  },
  {
    q: "Comment se passe le paiement ?",
    a: "Le paiement s'effectue par carte, en ligne, au moment de la souscription puis à chaque renouvellement. Vos factures sont disponibles dans votre espace membre.",
  },
];

/** Équipe (noms provisoires à remplacer). */
export const team = [
  {
    name: "Élodie",
    role: "Fondatrice · Esthéticienne CFC",
    bio: "Quinze ans de cabine entre Lausanne et Montreux avant d'ouvrir l'atelier. Elle conçoit chaque protocole et forme l'équipe aux gestes de la maison.",
  },
  {
    name: "Sarah",
    role: "Aromathérapeute diplômée",
    bio: "Formée en aromathérapie scientifique, elle compose les synergies de l'atelier, anime les ateliers senteurs et assure les consultations individuelles.",
  },
];
