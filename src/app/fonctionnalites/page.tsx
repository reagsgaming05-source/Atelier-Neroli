import type { Metadata } from "next";
import { Check } from "lucide-react";
import { featureIcons } from "@/components/feature-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { featureCategories, features, site } from "@/content/site";
import { formatCHF } from "@/lib/format";

export const metadata: Metadata = {
  title: "Fonctionnalités",
  description: "Éditer, organiser, fusionner, convertir, compresser, signer, protéger, caviarder, annoter et comparer vos PDF : les douze outils de Blonay PDF.",
};

export default function FonctionnalitesPage() {
  return (
    <>
      <section className="border-b border-line bg-canvas-100">
        <div className="container-x py-16 lg:py-20">
          <p className="eyebrow">Fonctionnalités</p>
          <h1 className="mt-4 max-w-3xl font-display text-[2.75rem] font-bold leading-[1.02] tracking-tight text-ink-900 sm:text-[3.5rem]">Tout ce qu'un PDF peut demander.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-500">
            Douze outils dans une seule interface, disponibles dans le navigateur et dans l'application de bureau. Les outils marqués « Pro » sont inclus dans les formules Pro et Équipe.
          </p>
        </div>
      </section>

      <section className="container-x grid gap-12 py-16 lg:grid-cols-[1fr_320px] lg:py-24">
        <div className="space-y-16">
          {featureCategories.map((category) => {
            const items = features.filter((f) => f.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category}>
                <h2 className="font-display text-[1.75rem] font-semibold text-ink-900">{category}</h2>
                <div className="mt-6 divide-y divide-line border-y border-line">
                  {items.map((feature) => {
                    const Icon = featureIcons[feature.icon];
                    return (
                      <article key={feature.slug} id={feature.slug} className="grid scroll-mt-28 gap-6 py-8 md:grid-cols-[48px_1fr_auto]">
                        <span className="inline-flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <div>
                          <h3 className="font-display text-[1.4rem] font-semibold text-ink-900">{feature.name}</h3>
                          <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{feature.description}</p>
                          <ul className="mt-4 flex flex-wrap gap-2">
                            {feature.details.map((d) => (
                              <li key={d} className="inline-flex items-center gap-1.5 rounded-full bg-canvas-100 px-3 py-1 text-xs font-medium text-ink-700">
                                <Check className="size-3 text-brand-600" aria-hidden />
                                {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="md:text-right">{feature.pro ? <Badge tone="brand">Pro et Équipe</Badge> : <Badge tone="gray">Toutes formules</Badge>}</div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="band-brand rounded-[1.5rem] p-8 text-white shadow-soft">
            <p className="eyebrow text-accent-400">Formules</p>
            <h2 className="mt-3 font-display text-[1.75rem] font-semibold leading-tight">Tous les outils dès {formatCHF(990)} par mois.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/75">Sans engagement, avec deux mois offerts en formule annuelle. Les outils Pro à partir de {formatCHF(1990)} par mois.</p>
            <ButtonLink href="/tarifs" variant="light" className="mt-8 w-full">
              Comparer les formules
            </ButtonLink>
          </div>
          <div className="card mt-6 p-7 text-sm text-ink-700">
            <p className="font-semibold text-ink-900">Bon à savoir</p>
            <ul className="mt-3 space-y-2.5 text-ink-500">
              <li>Disponible sur {site.platforms.join(", ")}.</li>
              <li>Fichiers traités en Suisse, supprimés après 24 h.</li>
              <li>Compatible avec les annotations et formulaires Acrobat.</li>
              <li>{site.vatNote}</li>
            </ul>
          </div>
        </aside>
      </section>
    </>
  );
}
