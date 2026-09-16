import { ArrowLeftRight, Check, EyeOff, FilePen, FileText, Highlighter, Loader2, Merge, ScanText, Search, Share2, Signature } from "lucide-react";
import { cn } from "@/lib/cn";

export type MockScenario = "sign" | "redact" | "convert" | "edit";

export const scenarios: { key: MockScenario; label: string; file: string; chip: string }[] = [
  { key: "sign", label: "Signer", file: "Autorisation_camp_ski_8P_2026.pdf · 3 pages", chip: "2 signatures sur 3" },
  { key: "redact", label: "Caviarder", file: "Dossier_eleve_transmission_SPJ.pdf · 14 pages", chip: "3 numéros AVS caviardés" },
  { key: "convert", label: "Convertir", file: "Bulletins_9VP_semestre_1.docx → PDF/A", chip: "27 documents convertis" },
  { key: "edit", label: "Éditer", file: "Convocation_reunion_parents_2026.pdf · 1 page", chip: "Texte modifié, mise en page conservée" },
];

const tools: { label: string; icon: typeof FilePen; key: MockScenario | "annotate" | "merge" | "ocr" }[] = [
  { label: "Éditer", icon: FilePen, key: "edit" },
  { label: "Annoter", icon: Highlighter, key: "annotate" },
  { label: "Signer", icon: Signature, key: "sign" },
  { label: "Caviarder", icon: EyeOff, key: "redact" },
  { label: "Fusionner", icon: Merge, key: "merge" },
  { label: "Convertir", icon: ArrowLeftRight, key: "convert" },
  { label: "OCR", icon: ScanText, key: "ocr" },
];

function Line({ w, className }: { w: string; className?: string }) {
  return <div className={cn("h-2 rounded-full bg-canvas-300", className)} style={{ width: w }} />;
}

/** Aperçu de l'éditeur Blonay PDF, en HTML/CSS pur, selon le scénario affiché. */
export function AppMock({ scenario = "sign", className }: { scenario?: MockScenario; className?: string }) {
  const meta = scenarios.find((s) => s.key === scenario) ?? scenarios[0];
  return (
    <div className={cn("relative", className)}>
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        <div className="flex items-center gap-3 border-b border-line bg-canvas-100 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-canvas-300" />
            <span className="size-2.5 rounded-full bg-canvas-300" />
            <span className="size-2.5 rounded-full bg-canvas-300" />
          </div>
          <p className="flex-1 truncate text-center text-xs font-medium text-ink-500">{meta.file}</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-2.5 py-1 text-[0.68rem] font-semibold text-white">
            <Share2 className="size-3" aria-hidden />
            Partager
          </span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto border-b border-line px-3 py-2">
          {tools.map((t) => (
            <span key={t.label} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.72rem] font-semibold transition-colors", t.key === scenario ? "bg-brand-50 text-brand-700" : "text-ink-500")}>
              <t.icon className="size-3.5" aria-hidden />
              {t.label}
            </span>
          ))}
        </div>

        <div className="grid h-[380px] grid-cols-[56px_1fr] sm:grid-cols-[64px_1fr_184px]">
          <div className="flex flex-col items-center gap-2 border-r border-line bg-canvas-50 py-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className={cn("flex h-11 w-9 flex-col items-center justify-end rounded border bg-white pb-0.5 text-[0.55rem] text-ink-400", n === 2 ? "border-brand-500 ring-2 ring-brand-500/20" : "border-line")}>
                {n}
              </div>
            ))}
          </div>

          <div className="relative overflow-hidden bg-canvas-200 p-4 sm:p-6">
            <div className="mx-auto h-full max-w-[300px] rounded-sm bg-white p-5 shadow-card">
              <Line w="55%" className="h-3 bg-ink-700" />
              {scenario === "sign" && <SignBody />}
              {scenario === "redact" && <RedactBody />}
              {scenario === "convert" && <ConvertBody />}
              {scenario === "edit" && <EditBody />}
            </div>
          </div>

          <div className="hidden flex-col border-l border-line bg-white p-4 sm:flex">
            {scenario === "sign" && <SignPanel />}
            {scenario === "redact" && <RedactPanel />}
            {scenario === "convert" && <ConvertPanel />}
            {scenario === "edit" && <EditPanel />}
          </div>
        </div>
      </div>

      <div className="float-slow absolute -left-3 top-24 hidden items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-900 shadow-card ring-1 ring-line md:flex">
        <ScanText className="size-3.5 text-brand-600" aria-hidden />
        OCR terminé · 14 pages
      </div>
      <div className="float-slower absolute -right-3 bottom-16 hidden items-center gap-2 rounded-full bg-brand-900 px-3 py-1.5 text-xs font-semibold text-white shadow-soft md:flex">
        <Check className="size-3.5 text-accent-400" strokeWidth={3} aria-hidden />
        {meta.chip}
      </div>
    </div>
  );
}

/* ---------- Corps de page par scénario ---------- */

function SignBody() {
  return (
    <>
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
    </>
  );
}

function RedactBody() {
  return (
    <>
      <div className="mt-4 space-y-2">
        <Line w="100%" />
        <div className="flex items-center gap-2">
          <Line w="34%" />
          <span className="h-2.5 w-[38%] rounded-sm bg-ink-900" />
          <Line w="18%" />
        </div>
        <Line w="96%" />
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-[30%] rounded-sm bg-ink-900" />
          <Line w="60%" />
        </div>
        <Line w="88%" />
        <Line w="93%" />
        <div className="flex items-center gap-2">
          <Line w="50%" />
          <span className="h-2.5 w-[36%] rounded-sm bg-ink-900 ring-2 ring-accent-400" />
        </div>
        <Line w="70%" />
      </div>
      <div className="mt-5 rounded-md bg-canvas-100 p-2.5 text-[0.6rem] text-ink-500">
        <span className="font-semibold text-ink-900">Rapport de vérification</span> · 3 occurrences supprimées du fichier, métadonnées nettoyées.
      </div>
    </>
  );
}

function ConvertBody() {
  return (
    <div className="mt-5 flex h-[80%] flex-col items-center justify-center gap-3 text-center">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <FileText className="size-6" aria-hidden />
        </span>
        <ArrowLeftRight className="size-4 text-ink-400" aria-hidden />
        <span className="flex size-12 items-center justify-center rounded-xl bg-accent-100 text-accent-600">
          <FileText className="size-6" aria-hidden />
        </span>
      </div>
      <p className="text-[0.7rem] font-semibold text-ink-900">Word → PDF/A-2b</p>
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-canvas-200">
        <div className="h-full w-[68%] rounded-full bg-brand-600" />
      </div>
      <p className="text-[0.62rem] text-ink-500">Tableaux et styles conservés · 27 fichiers en lot</p>
    </div>
  );
}

function EditBody() {
  return (
    <>
      <div className="mt-4 space-y-2">
        <Line w="100%" />
        <Line w="92%" />
      </div>
      <div className="mt-3 rounded border border-brand-500 bg-brand-50/50 p-2 ring-2 ring-brand-500/20">
        <p className="text-[0.62rem] leading-snug text-ink-900">
          La réunion des parents aura lieu le <mark className="rounded bg-brand-200/70 px-0.5 text-ink-900">jeudi 12 mars à 19h00</mark>
          <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-brand-700 align-middle" aria-hidden /> à l'aula de l'établissement.
        </p>
      </div>
      <div className="mt-3 space-y-2">
        <Line w="97%" />
        <Line w="88%" />
        <Line w="64%" />
      </div>
    </>
  );
}

/* ---------- Panneaux latéraux ---------- */

function SignPanel() {
  return (
    <>
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
      <div className="mt-auto rounded-lg bg-canvas-100 p-2.5 text-[0.62rem] text-ink-500">Horodatage et certificat d'audit joints au document final.</div>
    </>
  );
}

function RedactPanel() {
  return (
    <>
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-400">Caviardage</p>
      <label className="mt-3 flex items-center gap-2 rounded-lg border border-line px-2 py-1.5 text-[0.68rem] text-ink-500">
        <Search className="size-3" aria-hidden />
        Motif : numéro AVS
      </label>
      <ul className="mt-3 space-y-2">
        {["756.1234.5678.90", "756.9876.5432.10", "756.4455.6677.88"].map((n) => (
          <li key={n} className="flex items-center gap-2 text-[0.7rem]">
            <span className="inline-flex size-4 items-center justify-center rounded bg-brand-700 text-white">
              <Check className="size-2.5" strokeWidth={3} aria-hidden />
            </span>
            <span className="font-mono text-ink-900">{n}</span>
          </li>
        ))}
      </ul>
      <span className="mt-auto inline-flex items-center justify-center rounded-lg bg-ink-900 px-3 py-2 text-[0.68rem] font-semibold text-white">Appliquer définitivement</span>
    </>
  );
}

function ConvertPanel() {
  const items = [
    { name: "Bulletins_9VP.docx", done: true },
    { name: "Liste_classe.xlsx", done: true },
    { name: "Programme_camp.pptx", done: false },
  ];
  return (
    <>
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-400">Conversion par lots</p>
      <ul className="mt-3 space-y-2.5">
        {items.map((it) => (
          <li key={it.name} className="flex items-center gap-2 text-[0.7rem]">
            {it.done ? (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-success-50 text-success">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
            ) : (
              <Loader2 className="size-4 animate-spin text-brand-600" aria-hidden />
            )}
            <span className="truncate text-ink-900">{it.name}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto rounded-lg bg-canvas-100 p-2.5 text-[0.62rem] text-ink-500">Sortie PDF/A pour l'archivage, PDF/UA pour l'accessibilité.</div>
    </>
  );
}

function EditPanel() {
  return (
    <>
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-400">Texte</p>
      <dl className="mt-3 space-y-2 text-[0.7rem]">
        <div className="flex justify-between">
          <dt className="text-ink-500">Police</dt>
          <dd className="font-semibold text-ink-900">Arial 11</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-500">Interligne</dt>
          <dd className="font-semibold text-ink-900">1.15</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-500">Couleur</dt>
          <dd className="flex items-center gap-1 font-semibold text-ink-900">
            <span className="size-3 rounded-sm bg-ink-900" /> Noir
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex gap-1">
        {["G", "I", "S"].map((b) => (
          <span key={b} className={cn("flex size-6 items-center justify-center rounded border text-[0.65rem] font-semibold", b === "G" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-ink-500")}>
            {b}
          </span>
        ))}
      </div>
      <div className="mt-auto rounded-lg bg-canvas-100 p-2.5 text-[0.62rem] text-ink-500">Annuler / rétablir illimité, polices remplacées automatiquement.</div>
    </>
  );
}
