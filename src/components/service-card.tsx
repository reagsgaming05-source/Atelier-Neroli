import Link from "next/link";
import { ArrowUpRight, FlaskConical, Flower2, Hand, Leaf, Sparkles, Sun } from "lucide-react";
import type { Service } from "@/content/site";
import { formatCHF } from "@/lib/format";

export const serviceIcons = {
  sparkles: Sparkles,
  hand: Hand,
  flower: Flower2,
  flask: FlaskConical,
  leaf: Leaf,
  sun: Sun,
} as const;

export function ServiceCard({ service }: { service: Service }) {
  const Icon = serviceIcons[service.icon];
  return (
    <Link
      href={`/soins#${service.slug}`}
      className="card group flex flex-col p-7 transition hover:-translate-y-0.5 hover:shadow-soft"
    >
      <div className="flex items-start justify-between">
        <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-forest-50 text-forest-700">
          <Icon className="size-5" aria-hidden />
        </span>
        <ArrowUpRight className="size-5 text-ink-400 transition group-hover:text-forest-700" aria-hidden />
      </div>
      <p className="eyebrow mt-7">{service.category}</p>
      <h3 className="mt-2 font-display text-2xl font-medium leading-tight text-ink-900">{service.name}</h3>
      <p className="mt-3 flex-1 text-[15px] leading-relaxed text-ink-500">{service.summary}</p>
      <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-sm">
        <span className="text-ink-500">{service.duration}</span>
        <span className="font-semibold text-ink-900">dès {formatCHF(service.priceCents)}</span>
      </div>
    </Link>
  );
}
