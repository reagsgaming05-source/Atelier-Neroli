import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowUpRight,
  EyeOff,
  FilePen,
  GitCompare,
  Highlighter,
  LayoutGrid,
  Lock,
  Merge,
  Minimize2,
  ScanText,
  Signature,
  TextCursorInput,
} from "lucide-react";
import type { Feature } from "@/content/site";
import { Badge } from "@/components/ui/badge";

export const featureIcons = {
  edit: FilePen,
  organize: LayoutGrid,
  merge: Merge,
  convert: ArrowLeftRight,
  compress: Minimize2,
  ocr: ScanText,
  sign: Signature,
  protect: Lock,
  redact: EyeOff,
  forms: TextCursorInput,
  annotate: Highlighter,
  compare: GitCompare,
} as const;

export function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = featureIcons[feature.icon];
  return (
    <Link href={`/fonctionnalites#${feature.slug}`} className="card group flex flex-col p-7 transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-start justify-between">
        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon className="size-5" aria-hidden />
        </span>
        <ArrowUpRight className="size-5 text-ink-400 transition group-hover:text-brand-700" aria-hidden />
      </div>
      <p className="eyebrow mt-7">{feature.category}</p>
      <h3 className="mt-2 font-display text-[1.35rem] font-semibold leading-tight text-ink-900">{feature.name}</h3>
      <p className="mt-3 flex-1 text-[15px] leading-relaxed text-ink-500">{feature.summary}</p>
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4 text-sm">
        <span className="font-semibold text-brand-700">En savoir plus</span>
        {feature.pro ? <Badge tone="brand">Pro</Badge> : <Badge tone="gray">Inclus</Badge>}
      </div>
    </Link>
  );
}
