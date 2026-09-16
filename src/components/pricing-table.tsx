"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { formatCHF } from "@/lib/format";
import { cn } from "@/lib/cn";

export type PricingPlan = {
  slug: string;
  name: string;
  tagline: string;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  features: string[];
  highlight: boolean;
};

type Billing = "month" | "year";

export function PricingTable({ plans, hasSubscription }: { plans: PricingPlan[]; hasSubscription: boolean }) {
  const [billing, setBilling] = useState<Billing>("month");

  return (
    <div>
      <div className="flex justify-center">
        <div role="radiogroup" aria-label="Périodicité" className="inline-flex rounded-full border border-line bg-white p-1 shadow-card">
          {(
            [
              { value: "month", label: "Mensuel" },
              { value: "year", label: "Annuel" },
            ] as const
          ).map((opt) => {
            const active = billing === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setBilling(opt.value)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition",
                  active ? "bg-forest-800 text-cream-50" : "text-ink-500 hover:text-ink-900",
                )}
              >
                {opt.label}
                {opt.value === "year" && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider",
                      active ? "bg-cream-50/15 text-cream-50" : "bg-blossom-100 text-blossom-600",
                    )}
                  >
                    2 mois offerts
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3 lg:items-stretch">
        {plans.map((plan) => {
          const price = billing === "month" ? plan.priceMonthlyCents : plan.priceYearlyCents;
          const perMonth = billing === "month" ? plan.priceMonthlyCents : Math.round(plan.priceYearlyCents / 12);
          const href = hasSubscription ? "/compte/abonnement" : `/abonnement/${plan.slug}/checkout?interval=${billing}`;
          const dark = plan.highlight;

          return (
            <article
              key={plan.slug}
              className={cn(
                "relative flex flex-col rounded-[1.75rem] p-8 transition",
                dark ? "band-forest text-cream-50 shadow-soft lg:-my-4 lg:py-12" : "card",
              )}
            >
              {dark && (
                <span className="absolute right-6 top-6 rounded-full bg-blossom-400 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-forest-900">
                  Le plus choisi
                </span>
              )}
              <h3 className="font-display text-3xl font-medium">{plan.name}</h3>
              <p className={cn("mt-2 text-sm", dark ? "text-cream-100/75" : "text-ink-500")}>{plan.tagline}</p>

              <div className="mt-8">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-[2.75rem] font-medium leading-none">{formatCHF(price)}</span>
                  <span className={cn("text-sm", dark ? "text-cream-100/70" : "text-ink-500")}>{billing === "month" ? "/ mois" : "/ an"}</span>
                </div>
                <p className={cn("mt-2 text-xs", dark ? "text-cream-100/60" : "text-ink-400")}>
                  {billing === "year" ? `soit ${formatCHF(perMonth)} par mois · 2 mois offerts` : `ou ${formatCHF(plan.priceYearlyCents)} par an`}
                </p>
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-[15px]">
                    <span className={cn("mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full", dark ? "bg-cream-50/15 text-blossom-400" : "bg-forest-50 text-forest-700")}>
                      <Check className="size-3" strokeWidth={3} aria-hidden />
                    </span>
                    <span className={dark ? "text-cream-50/90" : "text-ink-700"}>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href={href} className={buttonClasses(dark ? "light" : "primary", "md", "mt-10 w-full")}>
                {hasSubscription ? "Gérer mon abonnement" : `Choisir ${plan.name}`}
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
