import type { ReactNode } from "react";

export function LegalPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated: string; children: ReactNode }) {
  return (
    <section className="container-x py-16 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 font-display text-5xl font-medium leading-[1.02] text-ink-900">{title}</h1>
        <p className="mt-3 text-sm text-ink-400">Dernière mise à jour : {updated}</p>
        <div className="prose-legal mt-10 border-t border-line pt-8">{children}</div>
      </div>
    </section>
  );
}
