import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Conditions générales" };

export default function CgvPage() {
  return (
    <LegalPage eyebrow="Informations" title="Conditions générales d'abonnement" updated="septembre 2026">
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions régissent l'abonnement au logiciel {site.name}, édité par {site.legalName} ({site.address.street}, {site.address.zip} {site.address.city}), ci-après « l'éditeur ». Toute souscription implique l'acceptation sans réserve de ces conditions.
      </p>

      <h2>2. Formules et licence</h2>
      <h3>2.1 Formules</h3>
      <p>
        Trois formules sont proposées (Essentiel, Pro, Équipe), en périodicité mensuelle ou annuelle. Le contenu de chaque formule (outils, limites de taille, stockage, nombre d'utilisateurs) est celui décrit sur la page Tarifs au moment de la souscription.
      </p>
      <h3>2.2 Licence d'utilisation</h3>
      <p>
        L'abonnement confère un droit d'utilisation personnel, non exclusif et non transférable du logiciel, sur l'ensemble des appareils de l'utilisateur, pour la durée de l'abonnement. La formule Équipe couvre le nombre d'utilisateurs indiqué ; chaque utilisateur dispose d'un compte nominatif.
      </p>
      <h3>2.3 Durée et renouvellement</h3>
      <p>
        L'abonnement débute le jour de la souscription pour une période d'un mois ou d'un an selon la périodicité choisie. Il se renouvelle tacitement pour une période identique, sauf résiliation avant la fin de la période en cours.
      </p>
      <h3>2.4 Résiliation</h3>
      <p>
        L'abonnement peut être résilié à tout moment depuis l'espace client. La résiliation prend effet à la fin de la période déjà réglée, sans frais ni pénalité. Aucun remboursement au prorata n'est effectué pour la période en cours. À l'échéance, la licence est désactivée ; les fichiers stockés restent téléchargeables durant 30 jours.
      </p>
      <h3>2.5 Changement de formule</h3>
      <p>
        Un passage vers une formule supérieure est immédiat : la période en cours est créditée au prorata et une nouvelle période débute. Un passage vers une formule inférieure prend effet à la prochaine échéance.
      </p>

      <h2>3. Prix et paiement</h2>
      <p>
        Les prix sont indiqués en francs suisses (CHF), TVA de 8.1 % incluse. Le paiement s'effectue par carte, en ligne, à la souscription puis à chaque renouvellement. Une facture est mise à disposition dans l'espace client. En cas d'échec de paiement, l'éditeur peut suspendre l'accès jusqu'à régularisation, après notification.
      </p>

      <h2>4. Disponibilité et mises à jour</h2>
      <p>
        L'éditeur s'efforce d'assurer une disponibilité du service en ligne de 99.5 % par mois, hors maintenance planifiée annoncée au moins 48 heures à l'avance. Les mises à jour du logiciel sont incluses dans l'abonnement.
      </p>

      <h2>5. Données et fichiers</h2>
      <p>
        Les fichiers traités en ligne sont chiffrés, hébergés en Suisse et supprimés automatiquement 24 heures après le traitement, sauf enregistrement volontaire dans l'espace de stockage. L'utilisateur reste seul responsable du contenu de ses documents et des droits qui s'y rattachent. Le traitement des données personnelles est décrit dans la politique de confidentialité.
      </p>

      <h2>6. Signatures électroniques</h2>
      <p>
        Les signatures produites par le service sont des signatures électroniques simples ou avancées. Il appartient à l'utilisateur de vérifier que ce niveau convient à l'acte concerné. Les actes exigeant une signature électronique qualifiée au sens de la loi fédérale sur la signature électronique (SCSE) nécessitent le recours à un prestataire certifié.
      </p>

      <h2>7. Usage acceptable</h2>
      <p>Le service ne peut être utilisé pour traiter des contenus illicites, contourner des protections ou porter atteinte aux droits de tiers. L'éditeur se réserve le droit de suspendre un compte en cas d'abus manifeste, après notification.</p>

      <h2>8. Responsabilité</h2>
      <p>
        L'éditeur répond des dommages causés intentionnellement ou par négligence grave. Pour le surplus, et dans les limites de la loi, sa responsabilité est limitée au montant des abonnements réglés au cours des douze derniers mois. L'utilisateur conserve des copies de ses documents originaux.
      </p>

      <h2>9. Droit applicable et for</h2>
      <p>Les présentes conditions sont soumises au droit suisse. Tout litige sera soumis aux tribunaux compétents de Vevey (VD), sous réserve des fors impératifs prévus par la loi.</p>
    </LegalPage>
  );
}
