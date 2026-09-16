import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegalesPage() {
  return (
    <LegalPage eyebrow="Informations" title="Mentions légales" updated="septembre 2026">
      <h2>Éditeur du site et du logiciel</h2>
      <p>
        {site.legalName}
        <br />
        {site.address.street}, {site.address.zip} {site.address.city}, {site.address.country}
        <br />
        Téléphone : {site.phone} · E-mail : {site.email}
        <br />
        Numéro IDE : CHE-000.000.000 (à compléter) · Numéro TVA : CHE-000.000.000 TVA (à compléter)
      </p>
      <h2>Responsable de la publication</h2>
      <p>La direction de {site.legalName}.</p>
      <h2>Hébergement</h2>
      <p>Le site et le service sont hébergés en Suisse. Le site est actuellement exploité en environnement local de démonstration ; l'hébergeur sera précisé lors de la mise en ligne.</p>
      <h2>Propriété intellectuelle</h2>
      <p>
        Le logiciel {site.name}, son interface, ses marques, textes et visuels sont la propriété de {site.legalName} et sont protégés par le droit suisse et international. L'abonnement confère un droit d'utilisation, non un transfert de propriété. Toute reproduction ou décompilation sans autorisation écrite est interdite.
      </p>
      <h2>Marques de tiers</h2>
      <p>Adobe et Acrobat sont des marques d'Adobe Inc. Microsoft Word, Excel et PowerPoint sont des marques de Microsoft Corporation. Elles sont citées uniquement à des fins de compatibilité et de comparaison.</p>
      <h2>Responsabilité</h2>
      <p>
        Les informations publiées sont fournies à titre indicatif et peuvent être modifiées à tout moment. {site.legalName} ne saurait être tenue responsable des dommages indirects résultant de l'utilisation du site ou du service, dans les limites prévues par la loi.
      </p>
      <h2>Droit applicable</h2>
      <p>Le présent site est soumis au droit suisse. Le for est à Vevey (VD), sous réserve des dispositions impératives.</p>
    </LegalPage>
  );
}
