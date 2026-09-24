import Link from "next/link";
import { ArrowRight, Check, Quote as QuoteIcon } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Faq } from "@/components/faq";
import { Reveal } from "@/components/reveal";
import type { Segment } from "@/content/segments";
import type { Plan } from "@/lib/db/schema";
import { formatCHF } from "@/lib/format";

/**
 * La page d'un public : communes, écoles, État.
 *
 * Le produit est le même pour les trois, l'argumentaire non. On garde donc une
 * seule mise en page et on change ce qui doit l'être — les mots, les exemples,
 * l'acheteur. Une page par segment écrite à la main aurait divergé au bout de
 * deux corrections.
 */
export function SegmentPage({ segment, plan }: { segment: Segment; plan: Plan | null }) {
  const typeOrganisation = segment.slug === "communes" ? "commune" : segment.slug === "ecoles" ? "ecole" : "etat";

  return (
    <>
      {/* ------------------------------------------------------- ouverture -- */}
      <section className="border-b border-line bg-gradient-to-b from-brand-50/60 to-canvas-50">
        <div className="container-x py-16 lg:py-24">
          <p className="eyebrow">{segment.kicker}</p>
          <h1 className="mt-4 max-w-4xl font-display text-[2.75rem] font-bold leading-[1.02] tracking-tight text-ink-900 sm:text-[3.75rem]">
            {segment.title[0]}
            <br />
            <span className="text-brand-700">{segment.title[1]}</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-ink-500">{segment.lede}</p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <ButtonLink href={`/offre?type=${typeOrganisation}`} size="lg">
              Demander une offre
              <ArrowRight className="size-5" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/demo" variant="secondary" size="lg">
              Essayer sans rien installer
            </ButtonLink>
          </div>
          <p className="mt-5 text-sm text-ink-500">
            Sans engagement, sans compte à créer. Réponse sous deux jours ouvrables.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------- les services -- */}
      <section className="border-b border-line bg-white py-8">
        <div className="container-x flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-ink-500">
          <span className="font-semibold text-ink-900">Concerne&nbsp;:</span>
          {segment.units.map((u) => (
            <span key={u}>{u}</span>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ situations -- */}
      <section className="container-x py-20 lg:py-28">
        <SectionHeading
          eyebrow="Au quotidien"
          title="Quatre situations que vous reconnaîtrez."
          text="Pas une liste de fonctionnalités : ce que vous faites déjà, en moins de temps et sans sortir du numérique."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {segment.situations.map((s, i) => (
            <Reveal key={s.title} delay={i * 60}>
              <article className="card h-full p-8">
                <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {s.tool}
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold text-ink-900">{s.title}</h3>
                <p className="mt-3 leading-relaxed text-ink-500">{s.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- friction -- */}
      <section className="border-y border-line bg-canvas-100 py-20 lg:py-28">
        <div className="container-x">
          <SectionHeading eyebrow="Ce que ça coûte aujourd'hui" title="Le problème n'est pas le logiciel. C'est ce qu'on fait sans lui." />
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {segment.friction.map((f) => (
              <div key={f.title} className="rounded-2xl border border-line bg-white p-7">
                <h3 className="font-display text-lg font-semibold text-ink-900">{f.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-500">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- garanties -- */}
      <section className="container-x py-20 lg:py-28">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <SectionHeading eyebrow="Ce qui compte pour vous" title="Les quatre questions qu'on nous pose toujours." />
          <div className="grid gap-6 sm:grid-cols-2">
            {segment.assurances.map((a) => (
              <div key={a.title} className="flex gap-4">
                <Check className="mt-1 size-5 shrink-0 text-brand-600" aria-hidden />
                <div>
                  <h3 className="font-semibold text-ink-900">{a.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{a.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- acheteur -- */}
      <section className="border-y border-line bg-ink-900 py-20 text-white lg:py-24">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <QuoteIcon className="size-8 text-accent-400" aria-hidden />
            <p className="mt-5 font-display text-2xl font-semibold leading-snug">{segment.buyer.role}</p>
          </div>
          <p className="text-lg leading-relaxed text-white/75">{segment.buyer.text}</p>
        </div>
      </section>

      {/* ------------------------------------------------------ le parcours -- */}
      <section className="container-x py-20 lg:py-28">
        <SectionHeading
          eyebrow="Comment ça se passe"
          title="De la question à la mise en service."
          text="Le chemin d'achat d'une collectivité, suivi tel qu'il est : une offre, un bon de commande, une facture à 30 jours."
        />
        <ol className="mt-14 grid gap-6 md:grid-cols-4">
          {segment.path.map((p, i) => (
            <li key={p.title} className="relative rounded-2xl border border-line bg-white p-7">
              <span className="font-display text-3xl font-bold text-brand-200">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-accent-600">{p.step}</p>
              <h3 className="mt-2 font-semibold text-ink-900">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{p.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------------ tarif -- */}
      {plan ? (
        <section className="border-y border-line bg-brand-50/50 py-20 lg:py-24">
          <div className="container-x grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="eyebrow">La formule conseillée</p>
              <h2 className="mt-3 font-display text-[2.25rem] font-semibold leading-[1.05] text-ink-900">{plan.name}</h2>
              <p className="mt-4 text-lg text-ink-500">{plan.description}</p>
              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[15px] text-ink-700">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-8">
              {plan.quoteOnly ? (
                <p className="font-display text-4xl font-bold text-ink-900">Sur devis</p>
              ) : (
                <p className="font-display text-4xl font-bold text-ink-900">
                  {formatCHF(plan.priceYearlyCents)}
                  <span className="ml-2 text-base font-medium text-ink-500">/ an</span>
                </p>
              )}
              <p className="mt-3 text-sm text-ink-500">
                {plan.quoteOnly
                  ? "Tarif établi sur le nombre d'entités et le calendrier de déploiement."
                  : "Soit deux mois offerts par rapport au paiement mensuel."}
              </p>
              <div className="mt-7 space-y-3">
                <ButtonLink href={`/offre?type=${typeOrganisation}&formule=${plan.slug}`} className="w-full" size="lg">
                  Demander une offre
                </ButtonLink>
                <Link
                  href="/tarifs"
                  className="block text-center text-sm font-semibold text-brand-700 hover:text-brand-900"
                >
                  Voir toutes les formules
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------------- FAQ -- */}
      <section className="container-x py-20 lg:py-28">
        <SectionHeading eyebrow="Questions" title="Ce qu'on nous demande avant de signer." />
        <div className="mt-12 max-w-3xl">
          <Faq items={segment.faq} />
        </div>
      </section>
    </>
  );
}
