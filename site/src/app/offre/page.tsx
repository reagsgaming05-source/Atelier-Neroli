import type { Metadata } from "next";
import { FileText, Landmark, ShieldCheck, Clock } from "lucide-react";
import { QuoteRequestForm } from "@/components/quote-request-form";
import { ORGANISATION_TYPES, type OrganisationType } from "@/content/segments";
import { facturation } from "@/content/facturation";
import { listActivePlans } from "@/lib/subscriptions";

export const metadata: Metadata = {
  title: "Demander une offre",
  description:
    "Offre chiffrée pour une commune, un établissement scolaire ou un service de l'État : devis nominatif, bon de commande, facture à 30 jours avec QR-facture suisse.",
};

const repères = [
  {
    icon: Clock,
    title: "Réponse sous deux jours ouvrables",
    text: "Une offre chiffrée, nominative, envoyée par courriel à l'adresse que vous indiquez.",
  },
  {
    icon: FileText,
    title: `Valable ${facturation.joursDeValiditeOffre} jours`,
    text: "Le temps d'un passage en Municipalité, en conseil de direction ou devant un service d'achat.",
  },
  {
    icon: Landmark,
    title: "Bon de commande et facture",
    text: `Vous acceptez avec votre numéro de bon de commande. La facture part avec sa QR-facture, payable à ${facturation.joursDePaiement} jours.`,
  },
  {
    icon: ShieldCheck,
    title: "Sans engagement",
    text: "Demander une offre n'engage à rien et ne crée aucun compte. Vous décidez ensuite, ou pas.",
  },
];

export default async function OffrePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const type = typeof params.type === "string" ? params.type : "";
  const formule = typeof params.formule === "string" ? params.formule : undefined;
  const defaultOrgType = (ORGANISATION_TYPES.find((t) => t.value === type)?.value ?? "commune") as OrganisationType;

  const plans = (await listActivePlans())
    .filter((p) => p.allowInvoice)
    .map((p) => ({ slug: p.slug, name: p.name, quoteOnly: p.quoteOnly }));

  return (
    <section className="container-x grid gap-12 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-24">
      <div>
        <p className="eyebrow">Demande d&rsquo;offre</p>
        <h1 className="mt-4 font-display text-[2.75rem] font-bold leading-[1.02] tracking-tight text-ink-900 sm:text-[3.25rem]">
          Une offre écrite,
          <br />
          <span className="text-brand-700">prête à faire valider.</span>
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-500">
          Une collectivité n&rsquo;achète pas par carte : elle demande une offre, la fait valider, émet un bon de commande
          et paie une facture. C&rsquo;est exactement ce chemin-là que suit ce formulaire.
        </p>

        <dl className="mt-10 space-y-7">
          {repères.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <Icon className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
              <div>
                <dt className="font-semibold text-ink-900">{title}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-ink-500">{text}</dd>
              </div>
            </div>
          ))}
        </dl>

        <p className="mt-10 rounded-xl border border-line bg-canvas-100 p-5 text-sm leading-relaxed text-ink-500">
          Pour une personne seule, il y a plus simple : la formule Poste se souscrit en ligne par carte, en deux minutes,
          depuis la page <a href="/tarifs" className="font-semibold text-brand-700 hover:text-brand-900">Tarifs</a>.
        </p>
      </div>

      <QuoteRequestForm plans={plans} defaultOrgType={defaultOrgType} defaultPlanSlug={formule} />
    </section>
  );
}
