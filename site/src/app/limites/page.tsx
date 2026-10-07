import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { limites } from "@/content/limites";

export const metadata: Metadata = {
  title: "Ce que le logiciel ne fait pas encore",
  description:
    "Les limites connues d'Aktum PDF, dites avant l'achat, avec pour chacune ce qui existe à la place. Aucune date promise.",
};

export default function LimitesPage() {
  return (
    <>
      <section className="container-x py-16 lg:py-24">
        <p className="eyebrow">Limites connues</p>
        <h1 className="mt-4 max-w-3xl font-display text-[2.75rem] font-bold leading-[1.02] tracking-tight text-ink-900 sm:text-[3.5rem]">
          Ce que le logiciel ne fait pas encore.
        </h1>
        <p className="mt-6 max-w-3xl text-[17px] leading-relaxed text-ink-500">
          Une limite dite avant l&rsquo;achat est une limite assumée ; la même, découverte après, est un défaut. Voici la liste des limites connues, écrite par
          l&rsquo;éditeur, avec pour chacune ce qui existe à la place. Elle ne promet aucune date : &laquo;&nbsp;pas encore&nbsp;&raquo; veut dire
          &laquo;&nbsp;pas dans cette version&nbsp;&raquo;. Le même document, au format PDF, est livré avec l&rsquo;application.
        </p>
      </section>
      <section className="bg-canvas-100">
        <div className="container-x space-y-14 py-16">
          {limites.map((g) => (
            <div key={g.titre}>
              <h2 className="font-display text-[1.6rem] font-semibold text-ink-900">{g.titre}</h2>
              <dl className="mt-5 divide-y divide-line rounded-2xl border border-line bg-white">
                {g.limites.map((l) => (
                  <div key={l.limite} className="grid gap-2 p-5 md:grid-cols-[1.1fr_1fr] md:gap-8">
                    <dt className="font-semibold text-ink-900">{l.limite}</dt>
                    <dd className="text-[15px] leading-relaxed text-ink-500">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-ink-400">Ce qui existe à la place</span>
                      {l.apres}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          <p className="max-w-3xl text-[15px] leading-relaxed text-ink-500">
            La base légale du traitement, l&rsquo;analyse d&rsquo;impact, la conformité des marchés publics et la conservation des documents relèvent du service qui
            utilise le logiciel. Un défaut que vous trouvez et qui n&rsquo;est pas dans cette liste : écrivez-nous.
          </p>
          <ButtonLink href="/contact?sujet=Support%20technique" variant="secondary">
            Signaler une limite ou un défaut
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
