import { BookOpen, Check, EyeOff, FilePen, GitCompare, Highlighter, Merge, ScanText, Search, Signature } from "lucide-react";
import { cn } from "@/lib/cn";

/*
 * Aperçu de l'éditeur, en HTML/CSS pur. C'est une illustration, pas une
 * capture : elle ne montre donc que des gestes que le logiciel fait
 * aujourd'hui, sur des données entièrement fictives (le dépôt est public).
 */

export type MockScenario = "dossier" | "redact" | "ocr" | "edit";

export const scenarios: { key: MockScenario; label: string; file: string; chip: string }[] = [
  { key: "dossier", label: "Dossier de pièces", file: "Preavis_12_dossier.pdf · 33 pages", chip: "Sommaire refait automatiquement" },
  { key: "redact", label: "Caviarder", file: "Dossier_enquete_publique.pdf · 14 pages", chip: "3 occurrences, confirmées avant d'agir" },
  { key: "ocr", label: "Reconnaître le texte", file: "Fiches_scannees_1980.pdf · 14 pages", chip: "Texte reconnu : français et allemand" },
  { key: "edit", label: "Corriger", file: "Convocation_reunion_2026.pdf · 1 page", chip: "Texte modifié, mise en page conservée" },
];

const tools: { label: string; icon: typeof FilePen; key: MockScenario | "annotate" | "sign" | "merge" | "compare" }[] = [
  { label: "Corriger", icon: FilePen, key: "edit" },
  { label: "Annoter", icon: Highlighter, key: "annotate" },
  { label: "Signature manuscrite", icon: Signature, key: "sign" },
  { label: "Caviarder", icon: EyeOff, key: "redact" },
  { label: "Fusionner", icon: Merge, key: "merge" },
  { label: "Dossier", icon: BookOpen, key: "dossier" },
  { label: "Comparer", icon: GitCompare, key: "compare" },
  { label: "OCR", icon: ScanText, key: "ocr" },
];

function Line({ w, className }: { w: string; className?: string }) {
  return <div className={cn("h-2 rounded-full bg-canvas-300", className)} style={{ width: w }} />;
}

export function AppMock({ scenario = "dossier", className }: { scenario?: MockScenario; className?: string }) {
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
          <span className="w-12" aria-hidden />
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
              {scenario === "dossier" && <DossierBody />}
              {scenario === "redact" && <RedactBody />}
              {scenario === "ocr" && <OcrBody />}
              {scenario === "edit" && <EditBody />}
            </div>
          </div>

          <div className="hidden flex-col border-l border-line bg-white p-4 sm:flex">
            {scenario === "dossier" && <DossierPanel />}
            {scenario === "redact" && <RedactPanel />}
            {scenario === "ocr" && <OcrPanel />}
            {scenario === "edit" && <EditPanel />}
          </div>
        </div>
      </div>

      <div className="float-slower absolute -right-3 bottom-16 hidden items-center gap-2 rounded-full bg-brand-900 px-3 py-1.5 text-xs font-semibold text-white shadow-soft md:flex">
        <Check className="size-3.5 text-accent-400" strokeWidth={3} aria-hidden />
        {meta.chip}
      </div>
    </div>
  );
}

/* ---------- Corps de page par scénario ---------- */

function DossierBody() {
  return (
    <>
      <p className="mt-4 text-[0.62rem] font-semibold uppercase tracking-wider text-ink-400">Sommaire</p>
      <ol className="mt-3 space-y-2.5">
        {[
          ["1", "Rapport de la Municipalité", "3"],
          ["2", "Annexe technique", "11"],
          ["3", "Plan de situation", "26"],
          ["4", "Tableau financier", "29"],
        ].map(([n, t, p]) => (
          <li key={n} className="flex items-center gap-2 text-[0.62rem] text-ink-700">
            <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-700">{n}</span>
            <span className="flex-1 truncate">{t}</span>
            <span className="tabular-nums text-ink-400">{p}</span>
          </li>
        ))}
      </ol>
      <div className="mt-5 rounded-md border-2 border-dashed border-brand-500 bg-brand-50/60 px-3 py-2 text-[0.58rem] font-semibold uppercase tracking-wider text-brand-700">
        Pièce n° 3 · page 26 / 33
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
        <span className="font-semibold text-ink-900">Avant d&rsquo;agir</span> · 3 occurrences trouvées. Les métadonnées et les commentaires se nettoient à part.
      </div>
    </>
  );
}

function OcrBody() {
  return (
    <div className="mt-5 flex h-[80%] flex-col justify-center gap-3 text-center">
      <div className="space-y-2" aria-hidden>
        {["96%", "82%", "90%", "70%"].map((w, i) => (
          <div key={i} className="mx-auto h-2 rounded-full bg-ink-500/30" style={{ width: w }} />
        ))}
      </div>
      <p className="text-[0.7rem] font-semibold text-ink-900">Image → texte cherchable</p>
      <div className="mx-auto h-1.5 w-40 overflow-hidden rounded-full bg-canvas-200">
        <div className="h-full w-[68%] rounded-full bg-brand-600" />
      </div>
      <p className="text-[0.62rem] text-ink-500">Sur le poste · sans réseau · français et allemand</p>
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
          La réunion aura lieu le <mark className="rounded bg-brand-200/70 px-0.5 text-ink-900">jeudi 12 mars à 19h00</mark>
          <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-brand-700 align-middle" aria-hidden /> à la salle communale.
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

function DossierPanel() {
  return (
    <>
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-400">Dossier de pièces</p>
      <ul className="mt-3 space-y-2.5">
        {["Intercalaires", "Pièces numérotées", "Pagination continue", "Signet par pièce"].map((t) => (
          <li key={t} className="flex items-center gap-2 text-[0.7rem] text-ink-900">
            <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-success-50 text-success">
              <Check className="size-3" strokeWidth={3} aria-hidden />
            </span>
            {t}
          </li>
        ))}
      </ul>
      <div className="mt-auto rounded-lg bg-canvas-100 p-2.5 text-[0.62rem] text-ink-500">Le sommaire se refait quand une pièce est déplacée.</div>
    </>
  );
}

function RedactPanel() {
  return (
    <>
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-400">Caviardage</p>
      <label className="mt-3 flex items-center gap-2 rounded-lg border border-line px-2 py-1.5 text-[0.68rem] text-ink-500">
        <Search className="size-3" aria-hidden />
        Terme : nom du requérant
      </label>
      <ul className="mt-3 space-y-2">
        {["page 2, ligne 4", "page 5, ligne 11", "page 9, ligne 2"].map((n) => (
          <li key={n} className="flex items-center gap-2 text-[0.7rem]">
            <span className="inline-flex size-4 items-center justify-center rounded bg-brand-700 text-white">
              <Check className="size-2.5" strokeWidth={3} aria-hidden />
            </span>
            <span className="text-ink-900">{n}</span>
          </li>
        ))}
      </ul>
      <span className="mt-auto inline-flex items-center justify-center rounded-lg bg-ink-900 px-3 py-2 text-[0.68rem] font-semibold text-white">Caviarder les 3 occurrences</span>
    </>
  );
}

function OcrPanel() {
  return (
    <>
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-400">Reconnaissance de texte</p>
      <dl className="mt-3 space-y-2 text-[0.7rem]">
        <div className="flex justify-between">
          <dt className="text-ink-500">Langues</dt>
          <dd className="font-semibold text-ink-900">Français, allemand</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-500">Moteur</dt>
          <dd className="font-semibold text-ink-900">Sur le poste</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-500">Réseau</dt>
          <dd className="font-semibold text-ink-900">Aucun</dd>
        </div>
      </dl>
      <div className="mt-auto rounded-lg bg-canvas-100 p-2.5 text-[0.62rem] text-ink-500">Le texte reconnu repart dans le PDF exporté, invisible, sous l&rsquo;image.</div>
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
          <dd className="font-semibold text-ink-900">Helvetica 11</dd>
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
      <div className="mt-auto rounded-lg bg-canvas-100 p-2.5 text-[0.62rem] text-ink-500">Annuler et rétablir sur 60 opérations. Police d&rsquo;origine absente : Helvetica ou Times.</div>
    </>
  );
}
