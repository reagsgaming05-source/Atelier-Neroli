import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/content/site";
import { adresseSurUneLigne } from "@/content/editeur";

export const metadata: Metadata = { title: "Conditions générales" };

export default function CgvPage() {
  const adresse = adresseSurUneLigne();
  return (
    <LegalPage eyebrow="Informations" title="Conditions générales d'abonnement" updated="octobre 2026">
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions régissent l&rsquo;abonnement au logiciel {site.name}, édité par {site.legalName}
        {adresse ? ` (${adresse})` : ""}, ci-après « l&rsquo;éditeur ». Le logiciel est un programme que le client utilise sur ses propres postes ; l&rsquo;éditeur n&rsquo;exploite aucun service en ligne de traitement de documents. Toute souscription implique l&rsquo;acceptation de ces conditions.
      </p>

      <h2>2. Formules et licence</h2>
      <h3>2.1 Formules</h3>
      <p>
        Les formules Poste, Secrétariat et Administration sont proposées en périodicité mensuelle ou annuelle ; la formule Collectivité fait l&rsquo;objet d&rsquo;une offre séparée. Le contenu de chaque formule (nombre de postes, entités couvertes) est celui décrit sur la page Tarifs au moment de la souscription. Tous les outils du logiciel sont inclus dans chaque formule.
      </p>
      <h3>2.2 Licence d&rsquo;utilisation</h3>
      <p>
        L&rsquo;abonnement confère un droit d&rsquo;utilisation non exclusif et non transférable du logiciel pour la durée de l&rsquo;abonnement, dans les limites de la formule souscrite. La formule Poste couvre une personne. La formule Secrétariat couvre jusqu&rsquo;à dix postes d&rsquo;une même entité. La formule Administration couvre l&rsquo;ensemble du personnel de l&rsquo;entité souscriptrice. Le texte complet de la licence (LICENCE.txt) accompagne chaque copie du logiciel et prévaut en cas de différence avec le présent résumé.
      </p>
      <h3>2.3 Durée et renouvellement</h3>
      <p>
        L&rsquo;abonnement débute le jour de la souscription pour une période d&rsquo;un mois ou d&rsquo;un an selon la périodicité choisie. Il se renouvelle tacitement pour une période identique, sauf résiliation avant la fin de la période en cours.
      </p>
      <h3>2.4 Résiliation</h3>
      <p>
        L&rsquo;abonnement peut être résilié à tout moment depuis l&rsquo;espace client. La résiliation prend effet à la fin de la période déjà réglée, sans frais ni pénalité. Aucun remboursement au prorata n&rsquo;est effectué pour la période en cours. À l&rsquo;échéance, le droit d&rsquo;utilisation prend fin. Les documents que le client a produits avec le logiciel sont des fichiers PDF standard : ils restent lisibles et utilisables par tout autre outil.
      </p>
      <h3>2.5 Changement de formule</h3>
      <p>
        Un passage vers une formule supérieure est immédiat : la période en cours est créditée au prorata et une nouvelle période débute. Un passage vers une formule inférieure prend effet à la prochaine échéance.
      </p>

      <h2>3. Prix et paiement</h2>
      <p>
        Les prix sont indiqués en francs suisses (CHF). {site.vatNote} Le prix se règle sur facture, à 30 jours (QR-facture), avec bon de commande et référence interne si le service le demande ; rien n&rsquo;est prélevé. Le paiement par carte n&rsquo;est pas ouvert à ce jour. Une facture est mise à disposition dans l&rsquo;espace client. En cas de retard de paiement, l&rsquo;éditeur peut suspendre l&rsquo;accès aux mises à jour après notification et délai de grâce de 30 jours.
      </p>

      <h2>4. Mises à jour et support</h2>
      <p>
        Les mises à jour du logiciel sont incluses dans l&rsquo;abonnement. Elles se font en remplaçant le dossier du logiciel ; les données des utilisateurs sont conservées. Les limites connues de chaque version sont publiées dans les notes de version. Le support est fourni en français.
      </p>

      <h2>5. Données et fichiers</h2>
      <p>
        Le logiciel traite les documents sur le poste du client et n&rsquo;ouvre aucune connexion pour le faire : l&rsquo;éditeur n&rsquo;a accès à aucun document du client et n&rsquo;en héberge aucun. Le client reste seul responsable du contenu de ses documents et des droits qui s&rsquo;y rattachent. Le traitement des données personnelles que l&rsquo;éditeur collecte lui-même (compte, facturation, messages) est décrit dans la politique de confidentialité.
      </p>

      <h2>6. Ce que le logiciel ne fait pas</h2>
      <p>
        La signature posée par le logiciel est une signature manuscrite dessinée, avec la date saisie : ce n&rsquo;est pas une signature électronique au sens de la loi fédérale sur la signature électronique (SCSE). Les actes qui exigent une signature qualifiée ou un cachet électronique réglementé nécessitent le recours à un prestataire reconnu. Le caviardage retire le texte du flux de la page ; il ne nettoie pas les métadonnées, les commentaires ni les champs de formulaire, et le client contrôle le fichier produit avant de le transmettre. Le logiciel ne produit pas de PDF/A et ne vérifie pas les signatures numériques des documents reçus.
      </p>

      <h2>7. Usage acceptable</h2>
      <p>Le logiciel ne peut être utilisé pour traiter des contenus illicites, contourner une protection ou porter atteinte aux droits de tiers. L&rsquo;éditeur se réserve le droit de suspendre un compte en cas d&rsquo;abus manifeste, après notification.</p>

      <h2>8. Responsabilité</h2>
      <p>
        L&rsquo;éditeur répond des dommages causés intentionnellement ou par négligence grave. Pour le surplus, et dans les limites de la loi, sa responsabilité est limitée au montant des abonnements réglés au cours des douze derniers mois. Le client conserve des copies de ses documents originaux et contrôle le résultat d&rsquo;une opération irréversible avant de transmettre un document.
      </p>

      <h2>9. Droit applicable et for</h2>
      <p>Les présentes conditions sont soumises au droit suisse. Sous réserve des fors impératifs prévus par la loi, les tribunaux du siège de l&rsquo;éditeur sont compétents.</p>
    </LegalPage>
  );
}
