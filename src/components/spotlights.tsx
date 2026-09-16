import type { ReactNode } from "react";
import { Check, Clock, Download, Mail, ShieldCheck, Table2 } from "lucide-react";
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

export function SignatureVisual() {
  const events = [
    { t: "08:12", e: "Envoyé aux parents de Nora F.", icon: Mail },
    { t: "08:40", e: "Ouvert par Marie Dupont", icon: Clock },
    { t: "09:03", e: "Signé · empreinte horodatée", icon: Check },
    { t: "09:04", e: "Certificat d'audit généré", icon: ShieldCheck },
  ];
  return (
    <div className="card relative p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">Camp de ski 8P · autorisations</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink-900">42 / 48 signées</p>
        </div>
        <span className="rounded-full bg-success-50 px-3 py-1 text-xs font-semibold text-success">88 %</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-canvas-200">
        <div className="h-full w-[88%] rounded-full bg-brand-600" />
      </div>
      <ol className="mt-6 space-y-3">
        {events.map((ev) => (
          <li key={ev.t} className="flex items-center gap-3 text-sm">
            <span className="w-11 shrink-0 tabular-nums text-ink-400">{ev.t}</span>
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <ev.icon className="size-3.5" aria-hidden />
            </span>
            <span className="text-ink-700">{ev.e}</span>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex items-center justify-between rounded-xl bg-canvas-100 px-4 py-3 text-xs text-ink-500">
        <span>Rappel automatique aux 6 parents restants</span>
        <span className="font-semibold text-ink-900">demain 08:00</span>
      </div>
    </div>
  );
}

export function RedactVisual() {
  const lines = ["Nora Favre, née le 14.02.2013", "N° AVS 756.1234.5678.90", "Chemin des Écoliers 4, 1807 Blonay", "Représentante légale : Marie Dupont"];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {["Avant", "Après"].map((label, k) => (
        <div key={label} className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">{label}</p>
          <div className="mt-3 space-y-2.5 rounded-md bg-canvas-50 p-4 text-[0.8rem] leading-relaxed">
            <p className="font-semibold text-ink-900">Transmission au service externe</p>
            {lines.map((l, i) => {
              const sensitive = i !== 0 || k === 0;
              if (k === 0)
                return (
                  <p key={l} className={cn(i > 0 && "rounded bg-accent-100 px-1 text-accent-600 ring-1 ring-accent-200")}>
                    {l}
                  </p>
                );
              return (
                <p key={l} className="flex items-center gap-1 text-ink-700">
                  {i === 0 ? <span>Élève, née le 14.02.2013</span> : <span className={cn("inline-block h-3 rounded-sm bg-ink-900", i === 1 ? "w-36" : i === 2 ? "w-44" : "w-40")} aria-label="caviardé" />}
                  {sensitive && i > 0 && <span className="sr-only">caviardé</span>}
                </p>
              );
            })}
          </div>
          {k === 1 && (
            <p className="mt-3 flex items-center gap-2 text-xs text-success">
              <ShieldCheck className="size-3.5" aria-hidden />
              Contenu réellement supprimé du fichier, métadonnées nettoyées.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export function FormsVisual() {
  const rows = [
    { name: "Favre Nora", cls: "8P/2", ok: true, allergy: "Aucune" },
    { name: "Rochat Elias", cls: "8P/1", ok: true, allergy: "Arachides" },
    { name: "Meyer Lina", cls: "8P/2", ok: false, allergy: "—" },
  ];
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="text-sm font-semibold text-ink-900">Réponses · Inscription camp de ski</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas-100 px-2.5 py-1 text-xs font-semibold text-ink-700">
          <Download className="size-3" aria-hidden />
          Exporter
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[0.65rem] uppercase tracking-[0.14em] text-ink-400">
              <th className="px-5 py-2.5 font-semibold">Élève</th>
              <th className="px-3 py-2.5 font-semibold">Classe</th>
              <th className="px-3 py-2.5 font-semibold">Participe</th>
              <th className="px-5 py-2.5 font-semibold">Allergies</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-line/70">
                <td className="px-5 py-2.5 font-medium text-ink-900">{r.name}</td>
                <td className="px-3 py-2.5 text-ink-700">{r.cls}</td>
                <td className="px-3 py-2.5">
                  {r.ok ? <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs font-semibold text-success">Oui</span> : <span className="rounded-full bg-canvas-200 px-2 py-0.5 text-xs font-semibold text-ink-500">En attente</span>}
                </td>
                <td className="px-5 py-2.5 text-ink-700">{r.allergy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 border-t border-line bg-canvas-50 px-5 py-3 text-xs text-ink-500">
        <Table2 className="size-3.5" aria-hidden />
        46 réponses reçues · champs détectés automatiquement dans le formulaire PDF
      </div>
    </div>
  );
}
