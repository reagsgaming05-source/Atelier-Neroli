import type { Metadata } from "next";
import { ArrowRight, Check } from "lucide-react";
import { Notice, Panel } from "@/components/account/space-shell";
import { SubscriptionBadge } from "@/components/account/subscription-badge";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { cancelPendingChangeAction, cancelSubscriptionAction, changePlanAction, resumeSubscriptionAction } from "@/lib/actions/subscription";
import { requireUser } from "@/lib/auth";
import { BILLING_INTERVALS } from "@/lib/db/schema";
import { formatCHF, formatDate, intervalLabel, intervalSuffix } from "@/lib/format";
import { getActiveSubscription, listActivePlans, monthlyEquivalent, planPrice } from "@/lib/subscriptions";

export const metadata: Metadata = { title: "Mon abonnement" };

export default async function CompteAbonnementPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/compte/abonnement");
  const params = await searchParams;
  const [subscription, plans] = await Promise.all([getActiveSubscription(user.id), listActivePlans()]);

  const notice = typeof params.notice === "string" ? params.notice : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;
  const charge = typeof params.charge === "string" ? Number(params.charge) : undefined;
  const credit = typeof params.credit === "string" ? Number(params.credit) : undefined;

  if (!subscription) {
    return (
      <>
        {error && <Notice tone="error">{error}</Notice>}
        {notice === "already" && <Notice tone="info">Vous avez déjà un abonnement actif.</Notice>}
        <Panel>
          <SubscriptionBadge subscription={null} />
          <h2 className="mt-4 font-display text-3xl font-medium text-ink-900">Aucun abonnement actif.</h2>
          <p className="mt-2 max-w-lg text-[15px] text-ink-500">Choisissez une formule mensuelle ou annuelle ; vous pourrez la modifier ou la résilier à tout moment depuis cette page.</p>
          <ButtonLink href="/abonnements" className="mt-6">
            Voir les formules
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </Panel>
      </>
    );
  }

  const currentMonthly = monthlyEquivalent(subscription.plan, subscription.interval);

  return (
    <>
      {error && <Notice tone="error">{error}</Notice>}
      {notice === "canceled" && (
        <Notice tone="info">
          Résiliation enregistrée. Votre abonnement reste actif jusqu'au {formatDate(subscription.currentPeriodEnd)}, puis s'arrêtera sans frais.
        </Notice>
      )}
      {notice === "resumed" && <Notice>Votre abonnement a été réactivé. Il se renouvellera le {formatDate(subscription.currentPeriodEnd)}.</Notice>}
      {notice === "upgraded" && (
        <Notice>
          Votre nouvelle formule est active dès maintenant.
          {typeof charge === "number" && typeof credit === "number" && (
            <> Montant débité : {formatCHF(charge)} (crédit au prorata de {formatCHF(credit)} déduit).</>
          )}
        </Notice>
      )}
      {notice === "scheduled" && <Notice>Changement de formule enregistré. Il prendra effet le {formatDate(subscription.currentPeriodEnd)}.</Notice>}
      {notice === "change-canceled" && <Notice>Le changement de formule programmé a été annulé.</Notice>}
      {notice === "already" && <Notice tone="info">Vous avez déjà un abonnement actif : gérez-le ci-dessous.</Notice>}

      <Panel>
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <SubscriptionBadge subscription={subscription} />
            <h2 className="mt-4 font-display text-4xl font-medium text-ink-900">Formule {subscription.plan.name}</h2>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-2xl font-medium text-ink-900">{formatCHF(planPrice(subscription.plan, subscription.interval))}</span>
              <span className="text-sm text-ink-500">{intervalSuffix(subscription.interval)}</span>
            </p>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-500">Période en cours</dt>
                <dd className="mt-0.5 font-semibold text-ink-900">
                  {formatDate(subscription.currentPeriodStart)} → {formatDate(subscription.currentPeriodEnd)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500">{subscription.cancelAtPeriodEnd ? "Fin de l'abonnement" : "Prochain prélèvement"}</dt>
                <dd className="mt-0.5 font-semibold text-ink-900">
                  {subscription.cancelAtPeriodEnd ? formatDate(subscription.currentPeriodEnd) : `${formatCHF(planPrice(subscription.pendingPlan ?? subscription.plan, subscription.pendingInterval ?? subscription.interval))} le ${formatDate(subscription.currentPeriodEnd)}`}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500">Moyen de paiement</dt>
                <dd className="mt-0.5 font-semibold text-ink-900">
                  {subscription.paymentBrand ?? "Carte"} •••• {subscription.paymentLast4 ?? "····"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500">Périodicité</dt>
                <dd className="mt-0.5 font-semibold capitalize text-ink-900">{intervalLabel(subscription.interval)}</dd>
              </div>
            </dl>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-64">
            {subscription.cancelAtPeriodEnd ? (
              <form action={resumeSubscriptionAction}>
                <SubmitButton className="w-full" pendingText="Réactivation…">
                  Réactiver l'abonnement
                </SubmitButton>
              </form>
            ) : (
              <ConfirmForm action={cancelSubscriptionAction} message={`Résilier votre abonnement ? Il restera actif jusqu'au ${formatDate(subscription.currentPeriodEnd)}, sans nouveau prélèvement.`}>
                <SubmitButton variant="danger" className="w-full" pendingText="Résiliation…">
                  Résilier à l'échéance
                </SubmitButton>
              </ConfirmForm>
            )}
            <p className="text-xs text-ink-400">Sans frais. L'accès aux avantages est conservé jusqu'à la fin de la période réglée.</p>
          </div>
        </div>

        {subscription.pendingPlan && subscription.pendingInterval && (
          <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-blossom-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-blossom-600">
              Changement programmé : formule <strong>{subscription.pendingPlan.name}</strong> ({intervalLabel(subscription.pendingInterval)}) à partir du {formatDate(subscription.currentPeriodEnd)}.
            </p>
            <form action={cancelPendingChangeAction}>
              <SubmitButton variant="secondary" size="sm" pendingText="Annulation…">
                Annuler ce changement
              </SubmitButton>
            </form>
          </div>
        )}
      </Panel>

      <Panel title="Changer de formule">
        <p className="-mt-2 mb-6 text-sm text-ink-500">
          Une montée en gamme est immédiate, avec un crédit au prorata de votre période en cours. Une formule inférieure prend effet à la prochaine échéance.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="flex flex-col rounded-2xl border border-line p-5">
              <h3 className="font-display text-2xl font-medium text-ink-900">{plan.name}</h3>
              <p className="mt-1 text-xs text-ink-500">{plan.tagline}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.slice(0, 3).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-ink-700">
                    <Check className="mt-0.5 size-3 shrink-0 text-forest-600" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5 space-y-2">
                {BILLING_INTERVALS.map((interval) => {
                  const isCurrent = plan.id === subscription.planId && interval === subscription.interval;
                  const isPending = plan.id === subscription.pendingPlanId && interval === subscription.pendingInterval;
                  const upgrade = monthlyEquivalent(plan, interval) > currentMonthly;
                  return (
                    <form key={interval} action={changePlanAction}>
                      <input type="hidden" name="planSlug" value={plan.slug} />
                      <input type="hidden" name="interval" value={interval} />
                      <button
                        type="submit"
                        disabled={isCurrent || isPending}
                        className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-2.5 text-left text-sm transition hover:border-forest-500 hover:bg-forest-50 disabled:cursor-default disabled:border-forest-200 disabled:bg-forest-50"
                      >
                        <span>
                          <span className="font-semibold capitalize text-ink-900">{intervalLabel(interval)}</span>
                          <span className="block text-xs text-ink-500">
                            {isCurrent ? "Formule actuelle" : isPending ? "Programmé" : upgrade ? "Immédiat · prorata" : "À l'échéance"}
                          </span>
                        </span>
                        <span className="font-semibold text-ink-900">{formatCHF(planPrice(plan, interval))}</span>
                      </button>
                    </form>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
