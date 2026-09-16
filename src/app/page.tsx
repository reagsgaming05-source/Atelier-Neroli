import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Leaf, MapPin, Phone, Quote, ShieldCheck } from "lucide-react";
import { Blossom } from "@/components/blossom";
import { Faq } from "@/components/faq";
import { PricingTable } from "@/components/pricing-table";
import { ServiceCard } from "@/components/service-card";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { faq, services, site, steps, testimonials, values } from "@/content/site";
import { getCurrentUser } from "@/lib/auth";
import { getActiveSubscription, listActivePlans } from "@/lib/subscriptions";

const highlights = [
  { icon: Leaf, text: "Huiles végétales & essentielles suisses" },
  { icon: ShieldCheck, text: "Esthéticienne CFC · Aromathérapeute diplômée" },
  { icon: CalendarDays, text: "Abonnements sans engagement" },
  { icon: MapPin, text: "Blonay, à 10 minutes de Vevey" },
];

export default async function HomePage() {
  const [plans, user] = await Promise.all([listActivePlans(), getCurrentUser()]);
  const subscription = user ? await getActiveSubscription(user.id) : null;
  const featured = services.filter((s) => s.featured);

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div className="container-x grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-24">
          <div>
            <p className="eyebrow">Blonay · Riviera vaudoise · depuis {site.founded}</p>
            <h1 className="mt-5 font-display text-[3.25rem] font-medium leading-[0.98] text-ink-900 sm:text-[4.25rem] lg:text-[5rem]">
              Le soin, <em className="font-normal italic text-forest-700">comme un rituel.</em>
            </h1>
            <p className="mt-7 max-w-xl text-[17px] leading-relaxed text-ink-500 sm:text-lg">
              Atelier Néroli est une maison de soins et de bien-être à Blonay. Soins du visage, massages aux huiles
              essentielles et ateliers de senteurs, à l'unité ou en abonnement, pour faire du soin une habitude plutôt
              qu'une exception.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/abonnements" size="lg">
                Découvrir les abonnements
                <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/soins" variant="secondary" size="lg">
                Voir la carte des soins
              </ButtonLink>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-8">
              {[
                { k: "3", v: "formules d'abonnement" },
                { k: "60–120", v: "minutes par soin" },
                { k: "0", v: "engagement" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="font-display text-3xl font-medium text-ink-900">{s.k}</dt>
                  <dd className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-500">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="hero-visual relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-soft">
              <Blossom className="absolute -bottom-12 -right-16 w-[115%] text-cream-50/25" />
              <div className="absolute left-6 top-6 rounded-full bg-cream-50/10 px-3.5 py-1.5 text-xs font-medium text-cream-50 ring-1 ring-cream-50/20 backdrop-blur">
                Ouvert du mardi au samedi
              </div>
              <figure className="absolute inset-x-6 bottom-6 rounded-2xl bg-cream-50/95 p-6 shadow-card backdrop-blur">
                <Quote className="size-5 text-blossom-500" aria-hidden />
                <blockquote className="mt-3 font-display text-[1.45rem] leading-snug text-ink-900">
                  Le néroli, fleur de l'oranger amer, est au cœur de chacun de nos rituels : apaisant, lumineux, précis.
                </blockquote>
                <figcaption className="mt-3 text-xs uppercase tracking-[0.14em] text-ink-500">L'équipe de l'atelier</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Highlights ---------- */}
      <section className="border-y border-line bg-cream-100">
        <ul className="container-x grid gap-6 py-6 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((h) => (
            <li key={h.text} className="flex items-center gap-3 text-sm text-ink-700">
              <h.icon className="size-4 shrink-0 text-forest-600" aria-hidden />
              {h.text}
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Soins ---------- */}
      <section className="container-x py-20 lg:py-28">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading eyebrow="Nos soins" title="Des protocoles précis, des gestes lents." text="Chaque soin commence par un moment d'écoute et se termine sans hâte. Voici nos trois rituels les plus demandés." />
          <Link href="/soins" className="inline-flex items-center gap-2 text-sm font-semibold text-forest-700 hover:text-forest-900">
            Toute la carte des soins
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {featured.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
      </section>

      {/* ---------- L'atelier ---------- */}
      <section className="bg-cream-100">
        <div className="container-x grid items-center gap-12 py-20 lg:grid-cols-2 lg:gap-20 lg:py-28">
          <div className="relative order-2 lg:order-1">
            <div className="relative overflow-hidden rounded-[2rem] bg-cream-200 p-10 sm:p-14">
              <Blossom className="absolute -left-20 -top-10 w-[90%] text-forest-700/15" />
              <p className="relative font-display text-3xl font-medium leading-snug text-forest-900 sm:text-4xl">
                « Nous avons voulu un lieu où l'on prend le temps. Un atelier plus qu'un institut, où chaque geste a une
                raison d'être. »
              </p>
              <p className="relative mt-6 text-xs uppercase tracking-[0.16em] text-ink-500">Fondatrice de l'atelier</p>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeading eyebrow="L'atelier" title="Une maison de soins pensée comme un atelier." text="Installé à Blonay, sur les hauts de Vevey, l'atelier réunit une esthéticienne et une aromathérapeute autour d'une même conviction : le soin est un artisanat." />
            <ol className="mt-10 space-y-6">
              {values.map((v, i) => (
                <li key={v.title} className="flex gap-5">
                  <span className="font-display text-2xl text-blossom-500">0{i + 1}</span>
                  <div>
                    <h3 className="font-semibold text-ink-900">{v.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-500">{v.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <ButtonLink href="/a-propos" variant="secondary" className="mt-10">
              Découvrir l'atelier
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* ---------- Abonnements ---------- */}
      <section id="abonnements" className="container-x py-20 lg:py-28">
        <SectionHeading align="center" eyebrow="Abonnements" title="Faites du soin une habitude." text="Trois formules, mensuelles ou annuelles, sans engagement au-delà de la période en cours. Vos soins, vos avantages boutique et vos ateliers, gérés depuis votre espace membre." />
        <div className="mt-12">
          <PricingTable plans={plans} hasSubscription={Boolean(subscription)} />
        </div>
        <p className="mt-8 text-center text-xs text-ink-400">{site.vatNote} Résiliation possible à tout moment depuis votre espace membre.</p>
      </section>

      {/* ---------- Étapes ---------- */}
      <section className="band-forest text-cream-50">
        <div className="container-x py-20 lg:py-28">
          <SectionHeading light eyebrow="Comment ça marche" title="Trois étapes, puis le reste suit." />
          <ol className="mt-14 grid gap-10 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="border-t border-cream-50/15 pt-6">
                <span className="font-display text-4xl text-blossom-400">0{i + 1}</span>
                <h3 className="mt-4 font-display text-2xl font-medium">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-cream-100/75">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Témoignages ---------- */}
      <section className="container-x py-20 lg:py-28">
        <SectionHeading align="center" eyebrow="Ils en parlent" title="Ce que nos membres retiennent." />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.author} className="card flex flex-col p-8">
              <Quote className="size-5 text-blossom-500" aria-hidden />
              <blockquote className="mt-4 flex-1 font-display text-[1.35rem] leading-snug text-ink-900">{t.quote}</blockquote>
              <figcaption className="mt-6 border-t border-line pt-4 text-sm">
                <span className="font-semibold text-ink-900">{t.author}</span>
                <span className="block text-ink-500">{t.detail}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="bg-cream-100">
        <div className="container-x grid gap-12 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
          <SectionHeading eyebrow="Questions fréquentes" title="Tout ce qu'il faut savoir avant de commencer." text="Une autre question ? Écrivez-nous, nous répondons sous 24 h ouvrées." />
          <Faq items={faq} />
        </div>
      </section>

      {/* ---------- Contact ---------- */}
      <section className="container-x py-20 lg:py-28">
        <div className="card grid gap-10 p-8 sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="eyebrow">Nous trouver</p>
            <h2 className="mt-3 font-display text-4xl font-medium text-ink-900">
              {site.address.street}, {site.address.zip} {site.address.city}
            </h2>
            <div className="mt-6 grid gap-4 text-sm text-ink-700 sm:grid-cols-3">
              <p className="flex items-start gap-2.5">
                <Clock className="mt-0.5 size-4 text-forest-600" aria-hidden />
                <span>
                  Mardi – vendredi 9h–19h
                  <br />
                  Samedi 9h–16h
                </span>
              </p>
              <p className="flex items-start gap-2.5">
                <Phone className="mt-0.5 size-4 text-forest-600" aria-hidden />
                <a href={site.phoneHref} className="hover:text-forest-700">
                  {site.phone}
                </a>
              </p>
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 text-forest-600" aria-hidden />
                <span>Parking à proximité · Ligne de bus VMCV</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <ButtonLink href="/contact">Nous contacter</ButtonLink>
            <ButtonLink href={site.mapsUrl} variant="secondary" target="_blank" rel="noreferrer">
              Itinéraire
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
