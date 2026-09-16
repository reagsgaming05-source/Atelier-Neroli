import type { Metadata } from "next";
import { Check } from "lucide-react";
import { serviceIcons } from "@/components/service-card";
import { ButtonLink } from "@/components/ui/button";
import { services, site } from "@/content/site";
import { formatCHF } from "@/lib/format";

export const metadata: Metadata = {
  title: "La carte des soins",
  description: "Soins du visage, massages aromatiques, rituels et ateliers de senteurs à Blonay. Durées, tarifs et bénéfices de chaque soin.",
};

const categories = ["Visage", "Corps", "Rituels", "Ateliers"] as const;

export default function SoinsPage() {
  return (
    <>
      <section className="border-b border-line bg-cream-100">
        <div className="container-x py-16 lg:py-20">
          <p className="eyebrow">Soins & rituels</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-medium leading-[1.02] text-ink-900 sm:text-6xl">La carte des soins</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-500">
            Chaque protocole est réalisé avec des huiles végétales suisses et des huiles essentielles chémotypées, sans parfum de synthèse. Les membres bénéficient de 10 à 20 % sur tous les soins à l'unité.
          </p>
        </div>
      </section>

      <section className="container-x grid gap-12 py-16 lg:grid-cols-[1fr_320px] lg:py-24">
        <div className="space-y-16">
          {categories.map((category) => {
            const items = services.filter((s) => s.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category}>
                <h2 className="font-display text-3xl font-medium text-ink-900">{category}</h2>
                <div className="mt-6 divide-y divide-line border-y border-line">
                  {items.map((service) => {
                    const Icon = serviceIcons[service.icon];
                    return (
                      <article key={service.slug} id={service.slug} className="grid scroll-mt-28 gap-6 py-8 md:grid-cols-[48px_1fr_auto]">
                        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-700">
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <div>
                          <h3 className="font-display text-2xl font-medium text-ink-900">{service.name}</h3>
                          <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{service.description}</p>
                          <ul className="mt-4 flex flex-wrap gap-2">
                            {service.benefits.map((b) => (
                              <li key={b} className="inline-flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-1 text-xs font-medium text-ink-700">
                                <Check className="size-3 text-forest-600" aria-hidden />
                                {b}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex flex-row items-center gap-4 md:flex-col md:items-end md:text-right">
                          <div>
                            <p className="font-display text-2xl font-medium text-ink-900">{formatCHF(service.priceCents)}</p>
                            <p className="text-sm text-ink-500">{service.duration}</p>
                          </div>
                          <ButtonLink href={`/contact?sujet=${encodeURIComponent("Réserver un soin")}&soin=${encodeURIComponent(service.name)}`} variant="secondary" size="sm">
                            Réserver
                          </ButtonLink>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="band-forest rounded-[1.75rem] p-8 text-cream-50 shadow-soft">
            <p className="eyebrow text-blossom-400">Membres</p>
            <h2 className="mt-3 font-display text-3xl font-medium leading-tight">Vos soins inclus, chaque mois.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-cream-100/75">
              À partir de {formatCHF(8900)} par mois, un soin de 60 minutes inclus et jusqu'à 20 % sur le reste de la carte.
            </p>
            <ButtonLink href="/abonnements" variant="light" className="mt-8 w-full">
              Voir les abonnements
            </ButtonLink>
          </div>
          <div className="card mt-6 p-7 text-sm text-ink-700">
            <p className="font-semibold text-ink-900">Bon à savoir</p>
            <ul className="mt-3 space-y-2.5 text-ink-500">
              <li>Sur rendez-vous uniquement, par téléphone ou e-mail.</li>
              <li>Annulation gratuite jusqu'à 24 h avant le soin.</li>
              <li>Cartes cadeaux disponibles pour tous les soins.</li>
              <li>{site.vatNote}</li>
            </ul>
          </div>
        </aside>
      </section>
    </>
  );
}
