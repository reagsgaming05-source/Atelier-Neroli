import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegalesPage() {
  return (
    <LegalPage eyebrow="Informations" title="Mentions légales" updated="septembre 2026">
      <h2>Éditeur du site</h2>
      <p>
        {site.name}
        <br />
        {site.address.street}, {site.address.zip} {site.address.city}, {site.address.country}
        <br />
        Téléphone : {site.phone} · E-mail : {site.email}
        <br />
        Numéro IDE : CHE-000.000.000 (à compléter) · Numéro TVA : CHE-000.000.000 TVA (à compléter)
      </p>
      <h2>Responsable de la publication</h2>
      <p>La direction d'{site.name}.</p>
      <h2>Hébergement</h2>
      <p>Le site est actuellement exploité en environnement local de démonstration. L'hébergeur sera indiqué ici lors de la mise en ligne.</p>
      <h2>Propriété intellectuelle</h2>
      <p>
        L'ensemble des contenus de ce site (textes, visuels, logo, protocoles de soins) est la propriété d'{site.name} ou de ses partenaires et est protégé par le droit suisse et international de la propriété intellectuelle. Toute reproduction sans autorisation écrite est interdite.
      </p>
      <h2>Responsabilité</h2>
      <p>
        Les informations publiées sont fournies à titre indicatif et peuvent être modifiées à tout moment. {site.name} ne saurait être tenu responsable des dommages directs ou indirects résultant de l'utilisation du site. Les soins proposés ne remplacent pas un avis médical.
      </p>
      <h2>Droit applicable</h2>
      <p>Le présent site est soumis au droit suisse. Le for est à Vevey (VD), sous réserve des dispositions impératives.</p>
    </LegalPage>
  );
}
