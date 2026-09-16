import Link from "next/link";
import { ArrowRight, Globe, Monitor, Quote, ServerCog, ShieldCheck } from "lucide-react";
import { AppMock } from "@/components/app-mock";
import { Faq } from "@/components/faq";
import { FeatureCard } from "@/components/feature-card";
import { PricingTable } from "@/components/pricing-table";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { faq, features, site, stats, steps, testimonials, values } from "@/content/site";
import { getCurrentUser } from "@/lib/auth";
import { getActiveSubscription, listActivePlans } from "@/lib/subscriptions";

const highlights = [
  { icon: ServerCog, text: "Données des élèves hébergées en Suisse" },
  { icon: ShieldCheck, text: "Conforme LPD et LPrD vaudoise" },
  { icon: Globe, text: "Web, Windows et macOS" },
  { icon: Monitor, text: "Connexion unique via l'identité cantonale" },
];

export default async function HomePage() {
  const [plans, user] = await Promise.all([listActivePlans(), getCurrentUser()]);
  const subscription = user ? await getActiveSubscription(user.id) : null;
  const featured = features.filter((f) => f.featured);

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div className="container-x grid items-center gap-12 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:py-24">
          <div>
            <p className="eyebrow">Pour l'État de Vaud et les établissements scolaires</p>
            <h1 className="mt-5 font-display text-[2.9rem] font-bold leading-[1.02] tracking-tight text-ink-900 sm:text-[3.6rem] lg:text-[4.1rem]">
              Tous les PDF de l'école, <span className="text-brand-700">un seul outil.</span>
            </h1>
            <p className="mt-7 max-w-xl text-[17px] leading-relaxed text-ink-500 sm:text-lg">{site.description}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/tarifs" size="lg">
                Voir les formules
                <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/fonctionnalites" variant="secondary" size="lg">
                Découvrir les outils
              </ButtonLink>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-8">
              {stats.map((s) => (
                <div key={s.v}>
                  <dt className="font-display text-3xl font-semibold text-ink-900">{s.k}</dt>
                  <dd className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-500">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <AppMock className="mx-auto w-full max-w-2xl lg:max-w-none" />
        </div>
      </section>

      {/* ---------- Points clés ---------- */}
      <section className="border-y border-line bg-canvas-100">
        <ul className="container-x grid gap-6 py-6 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((h) => (
            <li key={h.text} className="flex items-center gap-3 text-sm text-ink-700">
              <h.icon className="size-4 shrink-0 text-brand-600" aria-hidden />
              {h.text}
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Fonctionnalités ---------- */}
      <section className="container-x py-20 lg:py-28">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading eyebrow="Fonctionnalités" title="Douze outils, une seule interface." text="Bulletins, convocations, formulaires, dossiers d'élèves : les opérations du quotidien d'un secrétariat ou d'une salle des maîtres, sans changer d'application." />
          <Link href="/fonctionnalites" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900">
            Toutes les fonctionnalités
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {featured.map((feature) => (
            <FeatureCard key={feature.slug} feature={feature} />
          ))}
        </div>
      </section>

      {/* ---------- Pourquoi ---------- */}
      <section className="bg-canvas-100">
        <div className="container-x grid items-center gap-12 py-20 lg:grid-cols-2 lg:gap-20 lg:py-28">
          <div className="band-brand relative overflow-hidden rounded-[1.75rem] p-10 text-white sm:p-14">
            <p className="eyebrow text-accent-400">Notre conviction</p>
            <p className="mt-4 font-display text-[1.9rem] font-semibold leading-snug sm:text-[2.3rem]">
              « Un outil PDF pour l'école doit être complet, simple pour tout le monde, et garder les données des élèves là où elles doivent rester : en Suisse. »
            </p>
            <p className="mt-6 text-xs uppercase tracking-[0.16em] text-white/60">L'équipe {site.name}, {site.address.city}</p>
          </div>
          <div>
            <SectionHeading eyebrow="Pourquoi Blonay PDF" title="Pensé pour l'école vaudoise." text="Écoles obligatoires, gymnases, écoles professionnelles et services de l'État : des utilisateurs pour qui la protection des données et la simplicité ne sont pas négociables." />
            <ul className="mt-10 space-y-6">
              {values.map((v) => (
                <li key={v.title} className="flex gap-5">
                  <span className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <ShieldCheck className="size-4" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink-900">{v.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-500">{v.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <ButtonLink href="/securite" variant="secondary" className="mt-10">
              Sécurité et hébergement
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* ---------- Tarifs ---------- */}
      <section id="tarifs" className="container-x py-20 lg:py-28">
        <SectionHeading align="center" eyebrow="Tarifs" title="Une formule par personne, par établissement ou pour le canton." text="Mensuel ou annuel, sans engagement au-delà de la période en cours. Les établissements règlent sur bon de commande ; le déploiement cantonal se fait sur devis." />
        <div className="mt-12">
          <PricingTable plans={plans} hasSubscription={Boolean(subscription)} />
        </div>
        <p className="mt-8 text-center text-xs text-ink-400">{site.vatNote} Résiliation possible à tout moment depuis votre espace client.</p>
      </section>

      {/* ---------- Étapes ---------- */}
      <section className="band-brand text-white">
        <div className="container-x py-20 lg:py-28">
          <SectionHeading light eyebrow="Démarrer" title="Trois étapes pour équiper un établissement." />
          <ol className="mt-14 grid gap-10 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="border-t border-white/15 pt-6">
                <span className="font-display text-4xl font-semibold text-accent-400">0{i + 1}</span>
                <h3 className="mt-4 font-display text-2xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-white/75">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Témoignages ---------- */}
      <section className="container-x py-20 lg:py-28">
        <SectionHeading align="center" eyebrow="Dans les écoles" title="Ce que les établissements retiennent." />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.author} className="card flex flex-col p-8">
              <Quote className="size-5 text-accent-500" aria-hidden />
              <blockquote className="mt-4 flex-1 text-[17px] leading-relaxed text-ink-900">{t.quote}</blockquote>
              <figcaption className="mt-6 border-t border-line pt-4 text-sm">
                <span className="font-semibold text-ink-900">{t.author}</span>
                <span className="block text-ink-500">{t.detail}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="bg-canvas-100">
        <div className="container-x grid gap-12 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
          <SectionHeading eyebrow="Questions fréquentes" title="Tout ce qu'il faut savoir avant de commencer." text="Une autre question ? Écrivez-nous, nous répondons sous 24 h ouvrées." />
          <Faq items={faq} />
        </div>
      </section>

      {/* ---------- Appel final ---------- */}
      <section className="container-x py-20 lg:py-28">
        <div className="card grid gap-10 p-8 sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="eyebrow">Prêt à commencer ?</p>
            <h2 className="mt-3 font-display text-[2.25rem] font-semibold leading-tight text-ink-900">Équipez votre établissement en une semaine.</h2>
            <p className="mt-3 max-w-xl text-[15px] text-ink-500">
              Souscrivez en ligne ou demandez une démonstration pour votre équipe. Les applications Windows et macOS se téléchargent depuis l'espace client, et la version web est immédiate.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <ButtonLink href="/tarifs">Souscrire pour un établissement</ButtonLink>
            <ButtonLink href="/contact?sujet=Demande%20de%20démonstration" variant="secondary">
              Demander une démo
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
