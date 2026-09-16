import { Check, FilePen, Highlighter, Merge, ScanText, Signature, ArrowLeftRight, Share2 } from "lucide-react";
import { cn } from "@/lib/cn";

const tools = [
  { label: "Éditer", icon: FilePen },
  { label: "Annoter", icon: Highlighter },
  { label: "Signer", icon: Signature, active: true },
  { label: "Fusionner", icon: Merge },
  { label: "Convertir", icon: ArrowLeftRight },
  { label: "OCR", icon: ScanText },
];

function Line({ w, className }: { w: string; className?: string }) {
  return <div className={cn("h-2 rounded-full bg-canvas-300", className)} style={{ width: w }} />;
}

/** Aperçu de l'éditeur Blonay PDF, en HTML/CSS pur (aucune capture d'écran). */
export function AppMock({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        {/* Barre de fenêtre */}
        <div className="flex items-center gap-3 border-b border-line bg-canvas-100 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-canvas-300" />
            <span className="size-2.5 rounded-full bg-canvas-300" />
            <span className="size-2.5 rounded-full bg-canvas-300" />
          </div>
          <p className="flex-1 truncate text-center text-xs font-medium text-ink-500">Autorisation_camp_ski_8P_2026.pdf · 3 pages</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-2.5 py-1 text-[0.68rem] font-semibold text-white">
            <Share2 className="size-3" aria-hidden />
            Partager
          </span>
        </div>

        {/* Barre d'outils */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-line px-3 py-2">
          {tools.map((t) => (
            <span
              key={t.label}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.72rem] font-semibold",
                t.active ? "bg-brand-50 text-brand-700" : "text-ink-500",
              )}
            >
              <t.icon className="size-3.5" aria-hidden />
              {t.label}
            </span>
          ))}
        </div>

        <div className="grid h-[380px] grid-cols-[56px_1fr] sm:grid-cols-[64px_1fr_176px]">
          {/* Vignettes */}
          <div className="flex flex-col items-center gap-2 border-r border-line bg-canvas-50 py-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className={cn("flex h-11 w-9 flex-col items-center justify-end rounded border bg-white pb-0.5 text-[0.55rem] text-ink-400", n === 3 ? "border-brand-500 ring-2 ring-brand-500/20" : "border-line")}>
                {n}
              </div>
            ))}
          </div>

          {/* Page */}
          <div className="relative overflow-hidden bg-canvas-200 p-4 sm:p-6">
            <div className="mx-auto h-full max-w-[300px] rounded-sm bg-white p-5 shadow-card">
              <Line w="55%" className="h-3 bg-ink-700" />
              <div className="mt-4 space-y-2">
                <Line w="100%" />
                <Line w="92%" />
                <Line w="97%" />
                <Line w="60%" />
              </div>
              <div className="mt-4 rounded bg-accent-100 p-2 ring-1 ring-accent-200">
                <div className="space-y-2">
                  <Line w="95%" className="bg-accent-200" />
                  <Line w="70%" className="bg-accent-200" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Line w="98%" />
                <Line w="88%" />
              </div>
              <div className="mt-5 flex items-end justify-between rounded-md border-2 border-dashed border-brand-500 bg-brand-50/60 px-3 py-2">
                <div>
                  <p className="text-[0.55rem] font-semibold uppercase tracking-wider text-brand-700">Signature du parent</p>
                  <svg viewBox="0 0 120 32" className="mt-1 h-7 w-24 text-ink-900" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                    <path d="M4 24c10-18 16-18 20-6s8 10 14-4 10-8 16 2 10 6 18-6 12-8 20 0 12 10 22 4" />
                  </svg>
                </div>
                <span className="rounded-full bg-success-50 px-2 py-0.5 text-[0.55rem] font-semibold text-success">Signé</span>
              </div>
            </div>
          </div>

          {/* Panneau latéral */}
          <div className="hidden flex-col border-l border-line bg-white p-4 sm:flex">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-400">Signature électronique</p>
            <ul className="mt-3 space-y-2.5">
              {[
                { name: "Marie Dupont", role: "Parent", done: true },
                { name: "Secrétariat", role: "Établissement", done: true },
                { name: "J. Favre", role: "Direction", done: false },
              ].map((s) => (
                <li key={s.name} className="flex items-center gap-2">
                  <span className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-full", s.done ? "bg-success-50 text-success" : "border border-dashed border-line text-transparent")}>
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[0.72rem] font-semibold text-ink-900">{s.name}</span>
                    <span className="block text-[0.62rem] text-ink-400">{s.role}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-auto rounded-lg bg-canvas-100 p-2.5 text-[0.62rem] text-ink-500">
              Horodatage et certificat d'audit joints au document final.
            </div>
          </div>
        </div>
      </div>

      {/* Bulles flottantes */}
      <div className="absolute -left-3 top-24 hidden items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-900 shadow-card ring-1 ring-line md:flex">
        <ScanText className="size-3.5 text-brand-600" aria-hidden />
        Caviardage · 3 n° AVS
      </div>
      <div className="absolute -right-3 bottom-16 hidden items-center gap-2 rounded-full bg-brand-900 px-3 py-1.5 text-xs font-semibold text-white shadow-soft md:flex">
        <Check className="size-3.5 text-accent-400" strokeWidth={3} aria-hidden />
        2 signatures sur 3
      </div>
    </div>
  );
}
