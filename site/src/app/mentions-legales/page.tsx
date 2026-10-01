import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/content/site";
import { adresseConnue, adresseSurUneLigne, editeur } from "@/content/editeur";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegalesPage() {
  return (
    <LegalPage eyebrow="Informations" title="Mentions légales" updated="octobre 2026">
      <h2>Éditeur du site et du logiciel</h2>
      {adresseConnue ? (
        <p>
          {editeur.nom}
          <br />
          {adresseSurUneLigne()}, {site.address.country}
          {site.phone || site.email ? (
            <>
              <br />
              {site.phone ? `Téléphone : ${site.phone}` : null}
              {site.phone && site.email ? " · " : null}
              {site.email ? `E-mail : ${site.email}` : null}
            </>
          ) : null}
          {editeur.ide ? (
            <>
              <br />
              Numéro IDE : {editeur.ide}
            </>
          ) : null}
          {editeur.tva ? (
            <>
              <br />
              Numéro TVA : {editeur.tva}
            </>
          ) : null}
        </p>
      ) : (
        <p>
          L&rsquo;éditeur n&rsquo;a pas encore publié son identité sur cette copie du site : ce site est une présentation du logiciel, et aucune offre ni facture ne peut en être émise tant que l&rsquo;éditeur n&rsquo;y est pas identifié.
        </p>
      )}
      <h2>Responsable de la publication</h2>
      <p>L&rsquo;éditeur désigné ci-dessus.</p>
      <h2>Hébergement</h2>
      <p>L&rsquo;hébergeur du site est précisé lors de la mise en ligne. Le logiciel, lui, ne s&rsquo;héberge pas : il s&rsquo;exécute sur les postes du client.</p>
      <h2>Propriété intellectuelle</h2>
      <p>
        Le logiciel {site.name}, son interface, ses textes et ses visuels sont protégés par le droit d&rsquo;auteur. Le code source est publié pour que chacun puisse le relire ; cette publication ne confère aucun droit de copie, de modification, de redistribution ni d&rsquo;exploitation commerciale. L&rsquo;abonnement confère un droit d&rsquo;utilisation, non un transfert de propriété. Les composants libres que le logiciel embarque restent sous leurs licences, reproduites dans le fichier MENTIONS-TIERCES.txt livré avec chaque copie.
      </p>
      <h2>Marques de tiers</h2>
      <p>Adobe et Acrobat sont des marques d&rsquo;Adobe Inc. Microsoft Word, Excel et PowerPoint sont des marques de Microsoft Corporation. Elles sont citées uniquement à des fins de compatibilité et de comparaison.</p>
      <h2>Responsabilité</h2>
      <p>
        Les informations publiées sont fournies à titre indicatif et peuvent être modifiées à tout moment. L&rsquo;éditeur ne saurait être tenu responsable des dommages indirects résultant de l&rsquo;utilisation du site, dans les limites prévues par la loi.
      </p>
      <h2>Droit applicable</h2>
      <p>Le présent site est soumis au droit suisse. Sous réserve des dispositions impératives, les tribunaux du siège de l&rsquo;éditeur sont compétents.</p>
    </LegalPage>
  );
}
