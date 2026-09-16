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
  title: "Abonnements",
  description: "Trois formules d'abonnement bien-être à Blonay, mensuelles ou annuelles, sans engagement. Soins inclus, avantages boutique et ateliers.",
};

const included = [
  "Résiliation à tout moment, effective à la fin de la période réglée",
  "Réservation par téléphone ou e-mail, confirmation sous 24 h",
  "Paiement par carte en ligne, factures disponibles dans votre espace",
  "Changement de formule à tout moment, prorata automatique",
  "Tisanes maison et vestiaire privé à chaque visite",
  "Synergies d'huiles composées sur place, à emporter",
];

export default async function AbonnementsPage() {
  const [plans, user] = await Promise.all([listActivePlans(), getCurrentUser()]);
  const subscription = user ? await getActiveSubscription(user.id) : null;

  return (
    <>
      <section className="border-b border-line bg-cream-100">
        <div className="container-x py-16 text-center lg:py-20">
          <p className="eyebrow">Abonnements</p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-5xl font-medium leading-[1.02] text-ink-900 sm:text-6xl">
            Une formule pour chaque rythme.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-500">
            Mensuel ou annuel, sans engagement au-delà de la période en cours. L'abonnement annuel équivaut à deux mois offerts.
          </p>
        </div>
      </section>

      <section className="container-x py-16 lg:py-24">
        <PricingTable plans={plans} hasSubscription={Boolean(subscription)} />
        <p className="mt-8 text-center text-xs text-ink-400">{site.vatNote}</p>
      </section>

      <section className="bg-cream-100">
        <div className="container-x grid gap-12 py-20 lg:grid-cols-2 lg:gap-20">
          <SectionHeading eyebrow="Dans toutes les formules" title="Ce qui est toujours inclus." text="Quelle que soit la formule choisie, l'expérience de l'atelier reste la même : du temps, de l'écoute et des produits irréprochables." />
          <ul className="grid gap-4 sm:grid-cols-2">
            {included.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-2xl bg-white p-5 text-[15px] text-ink-700 shadow-card">
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-700">
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
        <div className="band-forest rounded-[2rem] p-10 text-center text-cream-50 shadow-soft sm:p-16">
          <h2 className="mx-auto max-w-2xl font-display text-4xl font-medium leading-tight sm:text-5xl">Une question avant de commencer ?</h2>
          <p className="mx-auto mt-5 max-w-xl text-[17px] text-cream-100/75">Passez nous voir à l'atelier, appelez-nous ou écrivez-nous. Nous vous aidons à choisir la formule la plus juste.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/contact" variant="light">
              Nous écrire
            </ButtonLink>
            <ButtonLink href={site.phoneHref} variant="outlineLight">
              {site.phone}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
