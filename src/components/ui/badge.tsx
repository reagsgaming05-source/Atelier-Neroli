import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  green: "bg-forest-50 text-forest-700 ring-forest-200",
  amber: "bg-blossom-100 text-blossom-600 ring-blossom-200",
  gray: "bg-cream-100 text-ink-500 ring-line",
  dark: "bg-forest-800 text-cream-50 ring-forest-800",
  light: "bg-cream-50/15 text-cream-50 ring-cream-50/25",
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
