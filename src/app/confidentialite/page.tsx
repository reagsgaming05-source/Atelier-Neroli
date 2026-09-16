import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Confidentialité" };

export default function ConfidentialitePage() {
  return (
    <LegalPage eyebrow="Informations" title="Politique de confidentialité" updated="septembre 2026">
      <p>
        {site.name} traite vos données personnelles conformément à la loi fédérale sur la protection des données (LPD) et, le cas échéant, au règlement général sur la protection des données (RGPD). Cette page décrit quelles données sont collectées, pourquoi, et quels sont vos droits.
      </p>

      <h2>Données collectées</h2>
      <ul>
        <li>Données de compte : prénom, nom, adresse e-mail, téléphone, mot de passe (stocké sous forme chiffrée).</li>
        <li>Données d'abonnement et de facturation : formule, périodes, factures, marque et quatre derniers chiffres de la carte. Le numéro complet de carte n'est jamais conservé.</li>
        <li>Messages envoyés via le formulaire de contact.</li>
        <li>Données techniques strictement nécessaires au fonctionnement du site (cookie de session).</li>
      </ul>

      <h2>Finalités</h2>
      <ul>
        <li>Gérer votre compte, votre abonnement et vos factures.</li>
        <li>Répondre à vos demandes et organiser vos rendez-vous.</li>
        <li>Respecter nos obligations légales, notamment comptables.</li>
      </ul>
      <p>Nous n'utilisons aucun outil de suivi publicitaire et ne transmettons pas vos données à des tiers à des fins commerciales.</p>

      <h2>Durée de conservation</h2>
      <p>Les données de compte sont conservées tant que le compte est actif. Les factures sont conservées dix ans conformément aux obligations comptables suisses. Les messages de contact sont supprimés au plus tard deux ans après leur réception.</p>

      <h2>Cookies</h2>
      <p>Le site utilise un unique cookie technique de session, indispensable à la connexion à votre espace membre. Aucun cookie publicitaire ou de mesure d'audience n'est déposé.</p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez à tout moment demander l'accès, la rectification, la portabilité ou la suppression de vos données, ou vous opposer à leur traitement, en écrivant à{" "}
        <a href={`mailto:${site.email}`}>{site.email}</a>. Vous pouvez également saisir le Préposé fédéral à la protection des données et à la transparence (PFPDT).
      </p>

      <h2>Contact</h2>
      <p>
        {site.name}, {site.address.street}, {site.address.zip} {site.address.city} · {site.email}
      </p>
    </LegalPage>
  );
}
