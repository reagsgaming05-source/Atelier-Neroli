import type { Metadata } from "next";
import { Check } from "lucide-react";
import { ComparisonTable } from "@/components/comparison-table";
import { Faq } from "@/components/faq";
import { PricingTable } from "@/components/pricing-table";
import { Reveal } from "@/components/reveal";
import { RoiCalculator } from "@/components/roi-calculator";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { faq, site } from "@/content/site";
import { getAccess } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { listActivePlans } from "@/lib/subscriptions";

export const metadata: Metadata = {
  title: "Tarifs",
  description: "Formules Blonay PDF pour les enseignant·e·s, les établissements scolaires et le canton de Vaud. Mensuel ou annuel, sans engagement, facturation sur bon de commande.",
};

const included = [
  "Les 12 outils, sans option payante",
  "Application web, Windows et macOS avec la même licence",
  "Données hébergées en Suisse, conformité LPD et LPrD",
  "Mises à jour incluses pendant toute la durée de l'abonnement",
  "Résiliation à tout moment, effective à la fin de la période réglée",
  "Support en français, aux horaires scolaires",
];

export default async function TarifsPage() {
  const [plans, user] = await Promise.all([listActivePlans(), getCurrentUser()]);
  const access = user ? await getAccess(user) : null;
  const hasSubscription = Boolean(access && access.kind !== "none");

  return (
    <>
      <section className="border-b border-line bg-canvas-100">
        <div className="container-x py-16 text-center lg:py-20">
          <p className="eyebrow">Tarifs</p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-[2.75rem] font-bold leading-[1.02] tracking-tight text-ink-900 sm:text-[3.5rem]">Un prix public, sans engagement.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-500">
            Une formule pour une personne, une licence par établissement, ou un déploiement cantonal sur devis. L'abonnement annuel équivaut à deux mois offerts ; les établissements règlent sur bon de commande.
          </p>
        </div>
      </section>

      <section className="container-x py-16 lg:py-24">
        <PricingTable plans={plans} hasSubscription={hasSubscription} />
        <p className="mt-8 text-center text-xs text-ink-400">{site.vatNote}</p>
      </section>

      <section className="container-x pb-20 lg:pb-28">
        <Reveal>
          <SectionHeading eyebrow="Calculateur" title="Combien économise votre établissement ?" text="Comparez le coût de licences individuelles avec une licence Établissement, qui couvre tout le personnel sans plafond." />
        </Reveal>
        <Reveal delay={100} className="mt-10">
          <RoiCalculator />
        </Reveal>
      </section>

      <section className="bg-canvas-100">
        <div className="container-x py-20 lg:py-28">
          <Reveal>
            <SectionHeading eyebrow="Comparatif" title="Face à Acrobat et aux outils gratuits." text="Ce qui change pour un établissement public : l'hébergement, la conformité, le modèle de licence et le support." />
          </Reveal>
          <Reveal delay={100} className="mt-12">
            <ComparisonTable />
          </Reveal>
        </div>
      </section>

      <section>
        <div className="container-x grid gap-12 py-20 lg:grid-cols-2 lg:gap-20">
          <SectionHeading eyebrow="Dans toutes les formules" title="Ce qui est toujours inclus." text="Enseignant·e ou établissement, le même éditeur complet, sur toutes les plateformes, avec les mises à jour comprises." />
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
          <h2 className="mx-auto max-w-2xl font-display text-[2.25rem] font-semibold leading-tight sm:text-[2.75rem]">Plusieurs établissements, ou tout le canton ?</h2>
          <p className="mx-auto mt-5 max-w-xl text-[17px] text-white/75">Tarif dégressif, déploiement centralisé par la DGEO ou la DGEP, formation des secrétariats et fiche technique pour les marchés publics.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/contact?sujet=Offre%20cantonale" variant="light">
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
