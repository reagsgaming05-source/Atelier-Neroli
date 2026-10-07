import type { ReactNode } from "react";
import { Check, FileText, ScanText, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function Spotlight({
  eyebrow,
  title,
  text,
  points,
  href,
  cta,
  visual,
  reverse = false,
}: {
  eyebrow: string;
  title: string;
  text: string;
  points: string[];
  href: string;
  cta: string;
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className={cn("grid items-center gap-10 lg:grid-cols-2 lg:gap-16", reverse && "lg:[&>*:first-child]:order-2")}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h3 className="mt-3 font-display text-[2rem] font-semibold leading-[1.08] text-ink-900 sm:text-[2.4rem]">{title}</h3>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-500">{text}</p>
        <ul className="mt-6 space-y-2.5">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[15px] text-ink-700">
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
              {p}
            </li>
          ))}
        </ul>
        <ButtonLink href={href} variant="secondary" className="mt-8">
          {cta}
        </ButtonLink>
      </div>
      <div>{visual}</div>
    </div>
  );
}

/* ---------- Visuels ---------- */
/*
 * Illustrations (les captures de l'application sont dans hero-showcase.tsx) : aucune donnée réelle (le dépôt est public) et aucune
 * promesse que le logiciel ne tienne pas. Chaque visuel montre un geste que le logiciel fait aujourd'hui, et le dit à l'écran :
 * « Illustration », jamais présentée comme une capture.
 */
export function Illustration({ children }: { children: ReactNode }) {
  return (
    <figure>
      {children}
      <figcaption className="mt-3 text-xs text-ink-400">Illustration, données fictives : pas une capture de l&rsquo;application.</figcaption>
    </figure>
  );
}

export function RedactVisual() {
  const lines = [
    "Opposant·e n° 3 — dossier d'enquête",
    "N° AVS 000.0000.0000.00",
    "Rue de l'Exemple 4, 0000 Localité",
    "Représentant légal : Étude d'exemple",
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {["Avant", "Après"].map((label, k) => (
        <div key={label} className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">{label}</p>
          <div className="mt-3 space-y-2.5 rounded-md bg-canvas-50 p-4 text-[0.8rem] leading-relaxed">
            <p className="font-semibold text-ink-900">Transmission au service externe</p>
            {lines.map((l, i) => {
              if (k === 0)
                return (
                  <p key={l} className={cn(i > 0 && "rounded bg-accent-100 px-1 text-accent-600 ring-1 ring-accent-200")}>
                    {l}
                  </p>
                );
              return (
                <p key={l} className="flex items-center gap-1 text-ink-700">
                  {i === 0 ? <span>Opposant·e n° 3 — dossier d&rsquo;enquête</span> : <span className={cn("inline-block h-3 rounded-sm bg-ink-900", i === 1 ? "w-36" : i === 2 ? "w-44" : "w-40")} aria-label="caviardé" />}
                  {i > 0 && <span className="sr-only">caviardé</span>}
                </p>
              );
            })}
          </div>
          {k === 1 && (
            <p className="mt-3 flex items-start gap-2 text-xs text-ink-500">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand-600" aria-hidden />
              Lettres retirées du flux de la page. Métadonnées et commentaires : à nettoyer à part, puis relire le fichier.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export function OcrVisual() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">Scan : une image</p>
        <div className="mt-3 flex h-40 flex-col justify-center gap-2 rounded-md bg-canvas-200 p-4" aria-hidden>
          {["92%", "78%", "86%", "64%", "90%", "58%"].map((w, i) => (
            <span key={i} className="block h-2 rounded-full bg-ink-500/40" style={{ width: w }} />
          ))}
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-ink-500">
          <FileText className="size-3.5" aria-hidden />
          Impossible à chercher
        </p>
      </div>
      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">Après reconnaissance</p>
        <div className="mt-3 flex h-40 flex-col justify-center gap-1.5 rounded-md bg-canvas-50 p-4 text-[0.75rem] leading-snug text-ink-700">
          <p>Extrait du registre du Conseil communal,</p>
          <p>séance du <mark className="rounded bg-accent-100 px-0.5 text-ink-900">12 mars</mark>. Le Conseil décide :</p>
          <p>1. d&rsquo;adopter le préavis n° 12 ;</p>
          <p>2. d&rsquo;autoriser la Municipalité à…</p>
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-ink-500">
          <ScanText className="size-3.5 text-brand-600" aria-hidden />
          Texte cherchable, sur le poste, sans réseau
        </p>
      </div>
    </div>
  );
}
