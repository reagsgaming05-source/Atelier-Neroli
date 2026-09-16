import Link from "next/link";
import { ArrowRight, CalendarDays, Check, CreditCard } from "lucide-react";
import { Panel } from "@/components/account/space-shell";
import { SubscriptionBadge } from "@/components/account/subscription-badge";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { formatCHF, formatDate, formatDateShort, intervalSuffix } from "@/lib/format";
import { getActiveSubscription, listUserInvoices, planPrice } from "@/lib/subscriptions";

export default async function CompteDashboardPage() {
  const user = await requireUser("/compte");
  const [subscription, invoices] = await Promise.all([getActiveSubscription(user.id), listUserInvoices(user.id)]);

  if (!subscription) {
    return (
      <>
        <Panel>
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <SubscriptionBadge subscription={null} />
              <h2 className="mt-4 font-display text-3xl font-medium text-ink-900">Vous n'avez pas encore d'abonnement.</h2>
              <p className="mt-2 max-w-lg text-[15px] text-ink-500">
                Choisissez une formule pour bénéficier de vos soins inclus chaque mois, de la réservation prioritaire et des avantages boutique.
              </p>
            </div>
            <ButtonLink href="/abonnements">
              Choisir une formule
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        </Panel>
        {invoices.length > 0 && <InvoicesPanel invoices={invoices.slice(0, 5)} />}
      </>
    );
  }

  const price = planPrice(subscription.plan, subscription.interval);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SubscriptionBadge subscription={subscription} />
            <Link href="/compte/abonnement" className="text-sm font-semibold text-forest-700 hover:text-forest-900">
              Gérer
            </Link>
          </div>
          <h2 className="mt-4 font-display text-4xl font-medium text-ink-900">Formule {subscription.plan.name}</h2>
          <p className="mt-1 text-[15px] text-ink-500">{subscription.plan.tagline}</p>
          <p className="mt-6 flex items-baseline gap-2">
            <span className="font-display text-3xl font-medium text-ink-900">{formatCHF(price)}</span>
            <span className="text-sm text-ink-500">{intervalSuffix(subscription.interval)}</span>
          </p>
          {subscription.pendingPlan && subscription.pendingInterval && (
            <p className="mt-4 rounded-xl bg-blossom-100 px-4 py-3 text-sm text-blossom-600">
              Passage à la formule {subscription.pendingPlan.name} ({subscription.pendingInterval === "month" ? "mensuelle" : "annuelle"}) le {formatDate(subscription.currentPeriodEnd)}.
            </p>
          )}
        </Panel>

        <Panel>
          <dl className="space-y-5 text-sm">
            <div className="flex gap-3">
              <CalendarDays className="mt-0.5 size-4 text-forest-600" aria-hidden />
              <div>
                <dt className="text-ink-500">{subscription.cancelAtPeriodEnd ? "Fin de l'abonnement" : "Prochain renouvellement"}</dt>
                <dd className="mt-0.5 font-semibold text-ink-900">{formatDate(subscription.currentPeriodEnd)}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <CreditCard className="mt-0.5 size-4 text-forest-600" aria-hidden />
              <div>
                <dt className="text-ink-500">Moyen de paiement</dt>
                <dd className="mt-0.5 font-semibold text-ink-900">
                  {subscription.paymentBrand ?? "Carte"} •••• {subscription.paymentLast4 ?? "····"}
                </dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Check className="mt-0.5 size-4 text-forest-600" aria-hidden />
              <div>
                <dt className="text-ink-500">Membre depuis</dt>
                <dd className="mt-0.5 font-semibold text-ink-900">{formatDate(subscription.createdAt)}</dd>
              </div>
            </div>
          </dl>
        </Panel>
      </div>

      <Panel title="Vos avantages">
        <ul className="grid gap-3 sm:grid-cols-2">
          {subscription.plan.features.map((f) => (
            <li key={f} className="flex items-start gap-3 text-[15px] text-ink-700">
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-700">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-ink-500">
          Pour réserver un soin, contactez-nous en mentionnant votre formule.{" "}
          <Link href="/contact?sujet=Réserver%20un%20soin" className="font-semibold text-forest-700 hover:text-forest-900">
            Réserver maintenant
          </Link>
        </p>
      </Panel>

      <InvoicesPanel invoices={invoices.slice(0, 5)} />
    </>
  );
}

function InvoicesPanel({ invoices }: { invoices: Awaited<ReturnType<typeof listUserInvoices>> }) {
  return (
    <Panel
      title="Dernières factures"
      action={
        <Link href="/compte/factures" className="text-sm font-semibold text-forest-700 hover:text-forest-900">
          Tout voir
        </Link>
      }
      className="!p-0"
    >
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Date</th>
              <th>Description</th>
              <th>Montant</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="whitespace-nowrap">
                  <Link href={`/compte/factures/${inv.id}`} className="font-semibold text-ink-900 hover:text-forest-700">
                    {inv.number}
                  </Link>
                </td>
                <td>{formatDateShort(inv.issuedAt)}</td>
                <td>{inv.description}</td>
                <td className="font-semibold text-ink-900">{formatCHF(inv.amountCents)}</td>
                <td>
                  <Badge tone={inv.status === "paid" ? "green" : "gray"}>{inv.status === "paid" ? "Payée" : inv.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
