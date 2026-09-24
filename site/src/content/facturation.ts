/**
 * Ce qui figure sur une facture et dans la QR-facture.
 *
 * ⚠️ VALEURS PROVISOIRES. L'IBAN, l'IDE et le numéro de TVA doivent être
 * remplacés par les vôtres avant la première facture envoyée. L'IBAN ci-dessous
 * est l'exemple publié de la norme ISO 13616 : il est syntaxiquement valide,
 * ce qui permet au site de fonctionner, mais il ne mène à aucun compte.
 * Voir README, section « À vérifier avant de vendre ».
 */

export const facturation = {
  /** Le créancier, tel qu'il doit apparaître dans la section paiement. */
  creancier: {
    nom: "Blonay PDF Sàrl",
    rue: "Route de Vevey",
    numero: "12",
    npa: "1807",
    localite: "Blonay",
    pays: "CH",
  },
  /** ⚠️ À remplacer : exemple de la norme, aucun compte derrière. */
  iban: "CH93 0076 2011 6238 5295 7",
  /** ⚠️ À remplacer. Numéro d'identification des entreprises. */
  ide: "CHE-000.000.000",
  /** ⚠️ À remplacer. Laisser vide tant que l'entreprise n'est pas assujettie. */
  tvaNumero: "",
  /** Taux applicable aux prestations de services. */
  tvaTaux: 8.1,
  /** Le délai qu'attend une comptabilité publique. */
  joursDePaiement: 30,
  /** Durée de validité d'une offre : le temps d'un passage en Municipalité. */
  joursDeValiditeOffre: 90,
  /** Préfixe des numéros d'offre et de facture. */
  prefixeOffre: "OF",
  prefixeFacture: "AN",
  conditionsParDefaut:
    "Abonnement annuel, renouvelable tacitement, résiliable pour l'échéance. Prix en francs suisses. " +
    "Facture payable à 30 jours dès réception, par QR-facture. Aucune donnée traitée par le logiciel ne quitte vos postes.",
};

/** Le montant hors taxe et la TVA contenus dans un montant TTC. */
export function detailTva(montantCents: number, taux = facturation.tvaTaux) {
  const tvaCents = Math.round((montantCents * taux) / (100 + taux));
  return { netCents: montantCents - tvaCents, tvaCents, taux };
}
