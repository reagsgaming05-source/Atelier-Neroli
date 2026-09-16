"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

export type BarSeries = { name: string; color: string; values: number[] };

/**
 * Histogramme à une seule échelle : marques fines, extrémité arrondie ancrée à la ligne de base,
 * info-bulle au survol, légende dès deux séries. Les textes portent les couleurs de texte, jamais celles des séries.
 */
const formatters = {
  number: (v: number) => Math.round(v).toLocaleString("fr-CH"),
  chf: (v: number) => `CHF ${Math.round(v).toLocaleString("fr-CH")}`,
} as const;

export function BarChart({
  labels,
  series,
  unit = "number",
  height = 200,
  className,
  ariaLabel,
}: {
  labels: string[];
  series: BarSeries[];
  /** Format des valeurs (sérialisable, le composant étant client). */
  unit?: keyof typeof formatters;
  height?: number;
  className?: string;
  ariaLabel: string;
}) {
  const id = useId();
  const format = formatters[unit];
  const [hover, setHover] = useState<number | null>(null);

  const width = 560;
  const pad = { top: 18, right: 8, bottom: 28, left: 44 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const niceMax = niceCeil(max);
  const ticks = [0, niceMax / 2, niceMax];
  const groupW = innerW / Math.max(1, labels.length);
  const barGap = 2;
  const barW = Math.min(28, (groupW * 0.62 - barGap * (series.length - 1)) / series.length);
  const y = (v: number) => pad.top + innerH - (v / niceMax) * innerH;

  return (
    <figure className={cn("relative", className)}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-title`} className="h-auto w-full overflow-visible">
        <title id={`${id}-title`}>{ariaLabel}</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={pad.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="var(--color-ink-400)">
              {format(t)}
            </text>
          </g>
        ))}
        {labels.map((label, i) => {
          const gx = pad.left + i * groupW;
          const totalW = series.length * barW + (series.length - 1) * barGap;
          const startX = gx + (groupW - totalW) / 2;
          const active = hover === i;
          const dim = hover !== null && !active;
          return (
            <g key={label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={gx} y={pad.top} width={groupW} height={innerH} fill={active ? "var(--color-canvas-100)" : "transparent"} rx="6" />
              {series.map((s, si) => {
                const v = s.values[i] ?? 0;
                const h = Math.max(0, pad.top + innerH - y(v));
                const x = startX + si * (barW + barGap);
                return (
                  <g key={s.name} opacity={dim ? 0.5 : 1}>
                    {h > 0 && (
                      <path
                        d={`M${x} ${pad.top + innerH} V${y(v) + Math.min(4, h)} a4 4 0 0 1 4 -4 h${barW - 8} a4 4 0 0 1 4 4 V${pad.top + innerH} Z`}
                        fill={s.color}
                      />
                    )}
                    {active && (
                      <text x={x + barW / 2} y={y(v) - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-ink-900)">
                        {format(v)}
                      </text>
                    )}
                  </g>
                );
              })}
              <text x={gx + groupW / 2} y={height - 8} textAnchor="middle" fontSize="11" fill={active ? "var(--color-ink-900)" : "var(--color-ink-500)"}>
                {label}
              </text>
            </g>
          );
        })}
        <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="var(--color-ink-400)" strokeWidth="1" />
      </svg>
      {series.length > 1 && (
        <figcaption className="mt-3 flex flex-wrap gap-4 text-xs text-ink-500">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th>Période</th>
            {series.map((s) => (
              <th key={s.name}>{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((l, i) => (
            <tr key={l}>
              <td>{l}</td>
              {series.map((s) => (
                <td key={s.name}>{format(s.values[i] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function niceCeil(v: number) {
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 4 ? 4 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/** Barres horizontales pour une répartition (une série, libellés directs). */
export function BarList({ items, unit = "number", color = "var(--color-brand-600)" }: { items: { label: string; value: number }[]; unit?: keyof typeof formatters; color?: string }) {
  const format = formatters[unit];
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="grid grid-cols-[128px_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-ink-700">{item.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-canvas-200">
            <span className="block h-2 rounded-full" style={{ width: `${(item.value / max) * 100}%`, background: color }} />
          </span>
          <span className="font-semibold tabular-nums text-ink-900">{format(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}
