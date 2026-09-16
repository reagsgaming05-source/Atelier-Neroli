import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Conditions générales" };

export default function CgvPage() {
  return (
    <LegalPage eyebrow="Informations" title="Conditions générales de vente" updated="septembre 2026">
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions régissent la vente de soins à l'unité, d'ateliers, de cartes cadeaux et d'abonnements proposés par {site.name} ({site.address.street}, {site.address.zip} {site.address.city}), ci-après « l'atelier ». Toute commande implique l'acceptation sans réserve de ces conditions.
      </p>

      <h2>2. Abonnements</h2>
      <h3>2.1 Formules et contenu</h3>
      <p>
        Trois formules sont proposées (Essentiel, Signature, Prestige), en périodicité mensuelle ou annuelle. Le contenu de chaque formule (nombre de soins, remises, ateliers) est celui décrit sur la page Abonnements au moment de la souscription.
      </p>
      <h3>2.2 Durée et renouvellement</h3>
      <p>
        L'abonnement débute le jour de la souscription pour une période d'un mois ou d'un an selon la périodicité choisie. Il se renouvelle tacitement pour une période identique, sauf résiliation avant la fin de la période en cours.
      </p>
      <h3>2.3 Résiliation</h3>
      <p>
        L'abonnement peut être résilié à tout moment depuis l'espace membre. La résiliation prend effet à la fin de la période déjà réglée, sans frais ni pénalité. Aucun remboursement au prorata n'est effectué pour la période en cours.
      </p>
      <h3>2.4 Changement de formule</h3>
      <p>
        Un passage vers une formule supérieure est immédiat : la période en cours est créditée au prorata et une nouvelle période débute. Un passage vers une formule inférieure prend effet à la prochaine échéance.
      </p>
      <h3>2.5 Soins inclus</h3>
      <p>
        Les soins inclus dans une formule mensuelle sont à utiliser durant le mois en cours. Ceux d'une formule annuelle peuvent être répartis librement sur l'année. Les soins non utilisés ne sont ni reportés ni remboursés. Les avantages sont personnels et non cessibles.
      </p>

      <h2>3. Prix et paiement</h2>
      <p>
        Les prix sont indiqués en francs suisses (CHF), TVA de 8.1 % incluse. Le paiement des abonnements s'effectue par carte, en ligne, à la souscription puis à chaque renouvellement. Une facture est mise à disposition dans l'espace membre. En cas d'échec de paiement, l'atelier se réserve le droit de suspendre les avantages jusqu'à régularisation.
      </p>

      <h2>4. Rendez-vous et annulations</h2>
      <p>
        Les soins ont lieu sur rendez-vous. Toute annulation doit intervenir au moins 24 heures avant le rendez-vous. Passé ce délai, ou en cas d'absence, le soin est considéré comme effectué (déduit de la formule ou facturé au tarif en vigueur).
      </p>

      <h2>5. Cartes cadeaux</h2>
      <p>Les cartes cadeaux sont valables deux ans à compter de leur date d'émission, sur l'ensemble des soins, ateliers et abonnements. Elles ne sont ni remboursables ni échangeables contre des espèces.</p>

      <h2>6. Santé et contre-indications</h2>
      <p>
        Les soins proposés sont des soins de bien-être et ne constituent pas des actes médicaux. Il appartient à la cliente ou au client d'informer l'atelier de toute condition particulière (grossesse, allergies, traitements, pathologies) avant un soin.
      </p>

      <h2>7. Données personnelles</h2>
      <p>Le traitement des données personnelles est décrit dans notre politique de confidentialité.</p>

      <h2>8. Droit applicable et for</h2>
      <p>Les présentes conditions sont soumises au droit suisse. Tout litige sera soumis aux tribunaux compétents de Vevey (VD), sous réserve des fors impératifs prévus par la loi.</p>
    </LegalPage>
  );
}
