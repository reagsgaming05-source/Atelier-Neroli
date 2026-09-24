import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Confidentialité" };

export default function ConfidentialitePage() {
  return (
    <LegalPage eyebrow="Informations" title="Politique de confidentialité" updated="septembre 2026">
      <p>
        {site.legalName} traite vos données personnelles conformément à la loi fédérale sur la protection des données (LPD) et, le cas échéant, au règlement général sur la protection des données (RGPD). Cette page décrit quelles données sont collectées, pourquoi, et quels sont vos droits.
      </p>

      <h2>Données collectées</h2>
      <ul>
        <li>Données de compte : prénom, nom, adresse e-mail, téléphone, mot de passe (stocké sous forme hachée).</li>
        <li>Données d'abonnement et de facturation : formule, périodes, factures, marque et quatre derniers chiffres de la carte. Le numéro complet de carte n'est jamais conservé.</li>
        <li>Documents traités : les fichiers que vous envoyez au service en ligne, chiffrés et supprimés après 24 heures sauf enregistrement volontaire. Leur contenu n'est jamais analysé à d'autres fins que le traitement demandé.</li>
        <li>Journal d'utilisation : horodatage des opérations (par exemple « fusion », « signature ») nécessaire au journal d'audit et à la facturation, sans le contenu des documents.</li>
        <li>Messages envoyés via le formulaire de contact.</li>
        <li>Données techniques strictement nécessaires au fonctionnement du site (cookie de session).</li>
      </ul>

      <h2>Finalités</h2>
      <ul>
        <li>Fournir le service : traitement des documents, licence, synchronisation entre appareils.</li>
        <li>Gérer votre compte, votre abonnement et vos factures.</li>
        <li>Répondre à vos demandes de support.</li>
        <li>Respecter nos obligations légales, notamment comptables.</li>
      </ul>
      <p>Nous n'utilisons aucun outil de suivi publicitaire, ne vendons pas de données et n'entraînons aucun modèle sur vos documents.</p>

      <h2>Hébergement et sous-traitants</h2>
      <p>Les données sont hébergées en Suisse. Les sous-traitants (hébergement, paiement par carte) sont liés par contrat et n'accèdent qu'aux données nécessaires à leur prestation. La liste à jour est disponible sur demande.</p>

      <h2>Durée de conservation</h2>
      <p>Les données de compte sont conservées tant que le compte est actif, puis 30 jours. Les factures sont conservées dix ans conformément aux obligations comptables suisses. Les fichiers non enregistrés sont supprimés après 24 heures ; les fichiers enregistrés le sont 30 jours après la fin de l'abonnement.</p>

      <h2>Cookies</h2>
      <p>Le site utilise un unique cookie technique de session, indispensable à la connexion à votre espace client. Aucun cookie publicitaire ou de mesure d'audience n'est déposé.</p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez à tout moment demander l'accès, la rectification, la portabilité ou la suppression de vos données, ou vous opposer à leur traitement, en écrivant à{" "}
        <a href={`mailto:${site.email}`}>{site.email}</a>. Vous pouvez également saisir le Préposé fédéral à la protection des données et à la transparence (PFPDT).
      </p>

      <h2>Contact</h2>
      <p>
        {site.legalName}, {site.address.street}, {site.address.zip} {site.address.city} · {site.email}
      </p>
    </LegalPage>
  );
}
