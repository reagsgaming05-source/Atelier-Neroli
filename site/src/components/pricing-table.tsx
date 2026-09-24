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
  quoteOnly: boolean;
  allowCard: boolean;
  allowInvoice: boolean;
  maxSeats: number;
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
                  active ? "bg-brand-800 text-canvas-50" : "text-ink-500 hover:text-ink-900",
                )}
              >
                {opt.label}
                {opt.value === "year" && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider",
                      active ? "bg-canvas-50/15 text-canvas-50" : "bg-accent-100 text-accent-600",
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

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4 lg:items-stretch">
        {plans.map((plan) => {
          const price = billing === "month" ? plan.priceMonthlyCents : plan.priceYearlyCents;
          const perMonth = billing === "month" ? plan.priceMonthlyCents : Math.round(plan.priceYearlyCents / 12);
          // Deux chemins d'achat, et le bon pour chaque formule : la carte pour
          // qui peut décider seul, l'offre pour qui doit faire valider une
          // dépense. Une collectivité n'a pas de carte à sortir.
          const hrefOffre = `/offre?formule=${plan.slug}`;
          const hrefCarte = hasSubscription ? "/compte/abonnement" : `/abonnement/${plan.slug}/checkout?interval=${billing}`;
          const principal = plan.quoteOnly || !plan.allowCard ? hrefOffre : hrefCarte;
          const libellePrincipal = plan.quoteOnly || !plan.allowCard
            ? "Demander une offre"
            : hasSubscription
              ? "Gérer mon abonnement"
              : `Choisir ${plan.name}`;
          const secondaire = !plan.quoteOnly && plan.allowCard && plan.allowInvoice && !hasSubscription;
          const dark = plan.highlight;

          return (
            <article
              key={plan.slug}
              className={cn(
                "relative flex flex-col rounded-[1.75rem] p-8 transition",
                dark ? "band-brand text-canvas-50 shadow-soft lg:-my-4 lg:py-12" : "card",
              )}
            >
              {dark && (
                <span className="absolute right-6 top-6 rounded-full bg-accent-400 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-900">
                  Le plus choisi
                </span>
              )}
              <h3 className="font-display text-2xl font-semibold">{plan.name}</h3>
              <p className={cn("mt-2 text-sm", dark ? "text-canvas-100/75" : "text-ink-500")}>{plan.tagline}</p>

              <div className="mt-8">
                {plan.quoteOnly ? (
                  <>
                    <span className="font-display text-[2.5rem] font-semibold leading-none tracking-tight">Sur devis</span>
                    <p className={cn("mt-2 text-xs", dark ? "text-canvas-100/60" : "text-ink-400")}>Tarif dégressif selon le nombre d&rsquo;entités · facturation annuelle</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-[2.5rem] font-semibold leading-none tracking-tight">{formatCHF(price)}</span>
                      <span className={cn("text-sm", dark ? "text-canvas-100/70" : "text-ink-500")}>{billing === "month" ? "/ mois" : "/ an"}</span>
                    </div>
                    <p className={cn("mt-2 text-xs", dark ? "text-canvas-100/60" : "text-ink-400")}>
                      {billing === "year" ? `soit ${formatCHF(perMonth)} par mois · 2 mois offerts` : `ou ${formatCHF(plan.priceYearlyCents)} par an`}
                      {plan.maxSeats === 0 ? " · postes illimités" : ` · jusqu'à ${plan.maxSeats} poste${plan.maxSeats > 1 ? "s" : ""}`}
                    </p>
                  </>
                )}
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-[15px]">
                    <span className={cn("mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full", dark ? "bg-canvas-50/15 text-accent-400" : "bg-brand-50 text-brand-700")}>
                      <Check className="size-3" strokeWidth={3} aria-hidden />
                    </span>
                    <span className={dark ? "text-canvas-50/90" : "text-ink-700"}>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href={principal} className={buttonClasses(dark ? "light" : "primary", "md", "mt-10 w-full")}>
                {libellePrincipal}
              </Link>
              {secondaire ? (
                <Link
                  href={hrefOffre}
                  className={cn(
                    "mt-3 text-center text-sm font-semibold underline-offset-4 hover:underline",
                    dark ? "text-canvas-50/80" : "text-brand-700",
                  )}
                >
                  ou demander une offre sur facture
                </Link>
              ) : null}
              <p className={cn("mt-3 text-center text-xs", dark ? "text-canvas-100/60" : "text-ink-400")}>
                {plan.quoteOnly || !plan.allowCard
                  ? "Offre chiffrée sous 2 jours · facture à 30 jours"
                  : plan.allowInvoice
                    ? "Carte bancaire, ou bon de commande et facture"
                    : "Paiement par carte, sans engagement"}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
