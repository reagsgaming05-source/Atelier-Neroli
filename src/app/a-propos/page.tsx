import type { Metadata } from "next";
import { Blossom } from "@/components/blossom";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { site, team, values } from "@/content/site";

export const metadata: Metadata = {
  title: "L'atelier",
  description: "L'histoire, les valeurs et l'équipe d'Atelier Néroli, maison de soins et de bien-être à Blonay.",
};

export default function AProposPage() {
  return (
    <>
      <section className="container-x grid items-center gap-12 py-16 lg:grid-cols-2 lg:gap-20 lg:py-24">
        <div>
          <p className="eyebrow">L'atelier</p>
          <h1 className="mt-4 font-display text-5xl font-medium leading-[1.02] text-ink-900 sm:text-6xl">Un atelier plus qu'un institut.</h1>
          <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-ink-500">
            <p>
              Atelier Néroli a ouvert ses portes à Blonay en {site.founded}, dans une ancienne échoppe aux hauts plafonds, à quelques minutes de Vevey. Le nom vient de la fleur de l'oranger amer, dont l'huile essentielle, apaisante et lumineuse, traverse chacun de nos soins.
            </p>
            <p>
              Nous avons voulu un lieu où l'on prend le temps : deux cabines seulement, jamais deux rendez-vous à la même heure, et un moment d'écoute avant chaque soin. Les produits sont choisis pour leur qualité et leur origine, jamais pour leur emballage.
            </p>
          </div>
        </div>
        <div className="hero-visual relative aspect-square overflow-hidden rounded-[2rem] shadow-soft">
          <Blossom className="absolute -bottom-10 -right-12 w-[110%] text-cream-50/25" />
          <div className="absolute inset-x-8 bottom-8">
            <p className="font-display text-3xl leading-snug text-cream-50">« Le soin est un artisanat : des gestes appris, répétés et affinés. »</p>
          </div>
        </div>
      </section>

      <section className="bg-cream-100">
        <div className="container-x py-20 lg:py-28">
          <SectionHeading eyebrow="Nos engagements" title="Trois convictions, tenues depuis le premier jour." />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {values.map((v, i) => (
              <div key={v.title} className="card p-8">
                <span className="font-display text-3xl text-blossom-500">0{i + 1}</span>
                <h3 className="mt-4 font-display text-2xl font-medium text-ink-900">{v.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-500">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x py-20 lg:py-28">
        <SectionHeading eyebrow="L'équipe" title="Deux métiers, une même exigence." />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {team.map((member) => (
            <div key={member.name} className="card flex gap-6 p-8">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-forest-800 font-display text-2xl text-cream-50">
                {member.name[0]}
              </div>
              <div>
                <h3 className="font-display text-2xl font-medium text-ink-900">{member.name}</h3>
                <p className="mt-1 text-sm font-semibold uppercase tracking-[0.12em] text-forest-600">{member.role}</p>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-500">{member.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x pb-20 lg:pb-28">
        <div className="card flex flex-col items-start gap-6 p-8 sm:p-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-medium text-ink-900 sm:text-4xl">Envie de découvrir l'atelier ?</h2>
            <p className="mt-2 text-ink-500">Réservez un premier soin, ou choisissez directement la formule qui vous ressemble.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/contact" variant="secondary">
              Réserver un soin
            </ButtonLink>
            <ButtonLink href="/abonnements">Voir les abonnements</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
