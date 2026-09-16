import { Check, Minus, X } from "lucide-react";
import { comparison } from "@/content/site";
import { cn } from "@/lib/cn";

function Cell({ value }: { value: "yes" | "no" | "partial" }) {
  if (value === "yes")
    return (
      <span className="inline-flex items-center gap-1.5 text-success">
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-success-50">
          <Check className="size-3.5" strokeWidth={3} aria-hidden />
        </span>
        <span className="sr-only">Oui</span>
      </span>
    );
  if (value === "partial")
    return (
      <span className="inline-flex items-center gap-1.5 text-accent-600">
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-accent-100">
          <Minus className="size-3.5" strokeWidth={3} aria-hidden />
        </span>
        <span className="text-xs">Partiel</span>
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-ink-400">
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-canvas-200">
        <X className="size-3.5" strokeWidth={3} aria-hidden />
      </span>
      <span className="sr-only">Non</span>
    </span>
  );
}

export function ComparisonTable() {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="px-6 py-4 text-left text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink-500">Critère</th>
              {comparison.columns.map((c, i) => (
                <th key={c} className={cn("px-4 py-4 text-left text-[0.7rem] font-semibold uppercase tracking-[0.14em]", i === 0 ? "text-brand-700" : "text-ink-500")}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.label} className="border-b border-line/70 last:border-b-0">
                <td className="px-6 py-3.5 text-ink-700">{row.label}</td>
                {row.values.map((v, i) => (
                  <td key={i} className={cn("px-4 py-3.5", i === 0 && "bg-brand-50/40")}>
                    <Cell value={v} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-6 py-3 text-xs text-ink-400">{comparison.note}</p>
    </div>
  );
}
