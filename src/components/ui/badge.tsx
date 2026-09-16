import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  green: "bg-success-50 text-success ring-success-200",
  amber: "bg-accent-100 text-accent-600 ring-accent-200",
  gray: "bg-canvas-100 text-ink-500 ring-line",
  dark: "bg-brand-900 text-white ring-brand-900",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  light: "bg-white/15 text-white ring-white/25",
} as const;

export function Badge({ tone = "gray", className, children }: { tone?: keyof typeof tones; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
