import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/content/site";
import { adresseSurUneLigne } from "@/content/editeur";

export const metadata: Metadata = { title: "Confidentialité" };

export default function ConfidentialitePage() {
  const adresse = adresseSurUneLigne();
  return (
    <LegalPage eyebrow="Informations" title="Politique de confidentialité" updated="octobre 2026">
      <p>
        {site.legalName} traite vos données personnelles conformément à la loi fédérale sur la protection des données (LPD). Cette page décrit quelles données sont collectées par ce site et par l&rsquo;espace client, pourquoi, et quels sont vos droits. Elle ne concerne pas le logiciel {site.name} lui-même : celui-ci traite vos documents sur votre poste, n&rsquo;ouvre aucune connexion pour le faire, et ne transmet rien à l&rsquo;éditeur ni à un tiers.
      </p>

      <h2>Données collectées par le site et l&rsquo;espace client</h2>
      <ul>
        <li>Données de compte : prénom, nom, adresse e-mail, téléphone, mot de passe (stocké sous forme hachée).</li>
        <li>Données d&rsquo;abonnement et de facturation : formule, périodes, factures, marque et quatre derniers chiffres de la carte. Le numéro complet de carte n&rsquo;est jamais conservé.</li>
        <li>Messages et demandes d&rsquo;offre envoyés via les formulaires du site.</li>
        <li>Données techniques strictement nécessaires au fonctionnement du site (cookie de session).</li>
        <li>Dans l&rsquo;espace client, pour la facturation : des compteurs d&rsquo;utilisation de la démonstration en ligne, sans le contenu des documents, lorsque vous êtes connecté·e.</li>
      </ul>
      <p>Aucun document n&rsquo;est transmis : le logiciel travaille sur votre poste.</p>

      <h2>Finalités</h2>
      <ul>
        <li>Gérer votre compte, votre abonnement et vos factures.</li>
        <li>Répondre à vos demandes d&rsquo;offre et de support.</li>
        <li>Respecter nos obligations légales, notamment comptables.</li>
      </ul>
      <p>Nous n&rsquo;utilisons aucun outil de suivi publicitaire, ne vendons pas de données et n&rsquo;entraînons aucun modèle sur des documents.</p>

      <h2>Sous-traitants</h2>
      <p>Les prestataires techniques (hébergement du site, envoi de courriel) sont liés par contrat et n&rsquo;accèdent qu&rsquo;aux données nécessaires à leur prestation. La liste à jour est disponible sur demande.</p>

      <h2>Durée de conservation</h2>
      <p>Les données de compte sont conservées tant que le compte est actif, puis 30 jours. Les factures sont conservées dix ans conformément aux obligations comptables suisses.</p>

      <h2>Cookies</h2>
      <p>Le site utilise un unique cookie technique de session, indispensable à la connexion à votre espace client. Aucun cookie publicitaire ou de mesure d&rsquo;audience n&rsquo;est déposé.</p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez à tout moment demander l&rsquo;accès, la rectification ou la suppression de vos données, ou vous opposer à leur traitement
        {site.email ? (
          <>
            , en écrivant à <a href={`mailto:${site.email}`}>{site.email}</a>
          </>
        ) : (
          ", en passant par le formulaire de contact"
        )}
        . Vous pouvez également saisir le Préposé fédéral à la protection des données et à la transparence (PFPDT).
      </p>

      <h2>Contact</h2>
      <p>
        {site.legalName}
        {adresse ? `, ${adresse}` : ""}
        {site.email ? ` · ${site.email}` : ""}
      </p>
    </LegalPage>
  );
}
