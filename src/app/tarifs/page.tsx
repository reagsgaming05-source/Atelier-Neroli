import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Faq } from "@/components/faq";
import { PricingTable } from "@/components/pricing-table";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { faq, site } from "@/content/site";
import { getCurrentUser } from "@/lib/auth";
import { getActiveSubscription, listActivePlans } from "@/lib/subscriptions";

export const metadata: Metadata = {
  title: "Tarifs",
  description: "Trois formules Blonay PDF, mensuelles ou annuelles, sans engagement : Essentiel, Pro et Équipe. Deux mois offerts en annuel.",
};

const included = [
  "Résiliation à tout moment, effective à la fin de la période réglée",
  "Application web, Windows et macOS avec la même licence",
  "Mises à jour incluses pendant toute la durée de l'abonnement",
  "Changement de formule à tout moment, prorata automatique",
  "Paiement par carte, factures disponibles dans l'espace client",
  "Support en français, allemand et anglais",
];

export default async function TarifsPage() {
  const [plans, user] = await Promise.all([listActivePlans(), getCurrentUser()]);
  const subscription = user ? await getActiveSubscription(user.id) : null;

  return (
    <>
      <section className="border-b border-line bg-canvas-100">
        <div className="container-x py-16 text-center lg:py-20">
          <p className="eyebrow">Tarifs</p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-[2.75rem] font-bold leading-[1.02] tracking-tight text-ink-900 sm:text-[3.5rem]">Simple, clair, sans engagement.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-500">
            Mensuel ou annuel, résiliable à tout moment. L'abonnement annuel équivaut à deux mois offerts.
          </p>
        </div>
      </section>

      <section className="container-x py-16 lg:py-24">
        <PricingTable plans={plans} hasSubscription={Boolean(subscription)} />
        <p className="mt-8 text-center text-xs text-ink-400">{site.vatNote}</p>
      </section>

      <section className="bg-canvas-100">
        <div className="container-x grid gap-12 py-20 lg:grid-cols-2 lg:gap-20">
          <SectionHeading eyebrow="Dans toutes les formules" title="Ce qui est toujours inclus." text="Quelle que soit la formule, vous disposez du même éditeur, sur toutes vos plateformes, avec les mises à jour comprises." />
          <ul className="grid gap-4 sm:grid-cols-2">
            {included.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-2xl bg-white p-5 text-[15px] text-ink-700 shadow-card">
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-x grid gap-12 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
        <SectionHeading eyebrow="Questions fréquentes" title="Avant de vous décider." />
        <Faq items={faq} />
      </section>

      <section className="container-x pb-20 lg:pb-28">
        <div className="band-brand rounded-[1.75rem] p-10 text-center text-white shadow-soft sm:p-16">
          <h2 className="mx-auto max-w-2xl font-display text-[2.25rem] font-semibold leading-tight sm:text-[2.75rem]">Plus de cinq utilisateurs ?</h2>
          <p className="mx-auto mt-5 max-w-xl text-[17px] text-white/75">Nous proposons des conditions adaptées aux administrations, écoles et grandes équipes, avec facturation annuelle et déploiement centralisé.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/contact?sujet=Offre%20pour%20une%20équipe" variant="light">
              Demander une offre
            </ButtonLink>
            <ButtonLink href={`mailto:${site.email}`} variant="outlineLight">
              {site.email}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
