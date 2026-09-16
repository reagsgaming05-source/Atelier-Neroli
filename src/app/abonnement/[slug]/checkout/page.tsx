import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check } from "lucide-react";
import { CheckoutForm } from "@/components/checkout-form";
import { site } from "@/content/site";
import { requireUser } from "@/lib/auth";
import type { BillingInterval } from "@/lib/db/schema";
import { formatCHF, formatDate, fullName, intervalLabel, intervalSuffix } from "@/lib/format";
import { addInterval, getActiveSubscription, getPlanBySlug, planPrice, yearlySavings } from "@/lib/subscriptions";

export const metadata: Metadata = { title: "Souscription" };

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const interval: BillingInterval = sp.interval === "year" ? "year" : "month";

  const user = await requireUser(`/abonnement/${slug}/checkout?interval=${interval}`);
  const plan = await getPlanBySlug(slug);
  if (!plan) notFound();
  if (plan.quoteOnly) redirect("/contact?sujet=Offre%20cantonale");

  const existing = await getActiveSubscription(user.id);
  if (existing) redirect("/compte/abonnement?notice=already");

  const amount = planPrice(plan, interval);
  const renewal = addInterval(new Date(), interval);
  const otherInterval: BillingInterval = interval === "month" ? "year" : "month";

  return (
    <section className="bg-canvas-100/60">
      <div className="container-x grid gap-10 py-12 lg:grid-cols-[1fr_400px] lg:gap-16 lg:py-20">
        <div>
          <p className="eyebrow">Souscription</p>
          <h1 className="mt-3 font-display text-[2.25rem] font-semibold text-ink-900 sm:text-[2.75rem]">Finalisez votre abonnement.</h1>
          <p className="mt-3 text-[15px] text-ink-500">
            Connecté·e en tant que <strong className="text-ink-900">{fullName(user)}</strong> ({user.email}).
          </p>
          <div className="card mt-8 p-6 sm:p-8">
            <CheckoutForm planSlug={plan.slug} interval={interval} amountCents={amount} defaultHolder={fullName(user)} />
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-7">
            <p className="eyebrow">Votre formule</p>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-semibold text-ink-900">{plan.name}</h2>
                <p className="mt-1 text-sm text-ink-500">{plan.tagline}</p>
              </div>
              <span className="rounded-full bg-canvas-100 px-3 py-1 text-xs font-semibold capitalize text-ink-700">{intervalLabel(interval)}</span>
            </div>

            <ul className="mt-6 space-y-2.5 border-t border-line pt-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>

            <dl className="mt-6 space-y-2 border-t border-line pt-6 text-sm">
              <div className="flex justify-between text-ink-500">
                <dt>Abonnement {intervalLabel(interval)}</dt>
                <dd>{formatCHF(amount)}</dd>
              </div>
              {interval === "year" && (
                <div className="flex justify-between text-brand-700">
                  <dt>Économie vs mensuel</dt>
                  <dd>− {formatCHF(yearlySavings(plan))}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-3 text-base font-semibold text-ink-900">
                <dt>À payer aujourd'hui</dt>
                <dd>
                  {formatCHF(amount)} <span className="text-xs font-normal text-ink-500">{intervalSuffix(interval)}</span>
                </dd>
              </div>
            </dl>

            <p className="mt-5 text-xs leading-relaxed text-ink-400">
              Renouvellement automatique le {formatDate(renewal)}. {site.vatNote} Résiliable à tout moment depuis votre espace client.
            </p>
            <Link href={`/abonnement/${plan.slug}/checkout?interval=${otherInterval}`} className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:text-brand-900">
              Passer en {intervalLabel(otherInterval)} ({formatCHF(planPrice(plan, otherInterval))} {intervalSuffix(otherInterval)})
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
