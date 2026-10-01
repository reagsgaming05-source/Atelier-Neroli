/**
 * Ce qui figure sur une facture et dans la QR-facture.
 *
 * Le créancier, l'IDE, le numéro de TVA et l'IBAN viennent de l'environnement
 * (src/content/editeur.ts) : le dépôt est public et n'en contient aucun. Tant
 * qu'ils manquent, le site n'émet ni offre ni facture (voir
 * `exigerIdentiteFacturation`).
 */
import { editeur, manquePourFacturer, pretPourFacturer } from "@/content/editeur";

export const facturation = {
  /** Le créancier, tel qu'il doit apparaître dans la section paiement. */
  creancier: {
    nom: editeur.nom,
    rue: editeur.rue,
    numero: editeur.numero,
    npa: editeur.npa,
    localite: editeur.localite,
    pays: "CH",
  },
  iban: editeur.iban,
  ide: editeur.ide,
  /** Vide tant que l'entreprise n'est pas assujettie : une TVA affichée sans numéro de TVA fait refuser la facture. */
  tvaNumero: editeur.tva,
  /** Taux applicable aux prestations de services, appliqué seulement si un numéro de TVA est posé. */
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
    "Facture payable à 30 jours dès réception, par QR-facture. Le logiciel traite les documents sur vos postes et n'ouvre aucune connexion pour le faire.",
};

/** Refuse d'émettre un document comptable tant que l'identité du vendeur n'est pas complète. */
export function exigerIdentiteFacturation(): void {
  if (pretPourFacturer) return;
  throw new Error(
    "L'identité de l'éditeur n'est pas configurée : impossible d'émettre une offre ou une facture. Variables manquantes : " +
      manquePourFacturer().join(", ") +
      ".",
  );
}

/** Le montant hors taxe et la TVA contenus dans un montant TTC (zéro tant qu'il n'y a pas de numéro de TVA). */
export function detailTva(montantCents: number, taux = facturation.tvaTaux) {
  if (!facturation.tvaNumero) return { netCents: montantCents, tvaCents: 0, taux: 0 };
  const tvaCents = Math.round((montantCents * taux) / (100 + taux));
  return { netCents: montantCents - tvaCents, tvaCents, taux };
}
