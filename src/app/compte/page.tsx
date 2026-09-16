import Link from "next/link";
import { createHash } from "node:crypto";
import { ArrowRight, CalendarDays, Check, CreditCard, Download, Globe, KeyRound } from "lucide-react";
import { Panel } from "@/components/account/space-shell";
import { SubscriptionBadge } from "@/components/account/subscription-badge";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { site } from "@/content/site";
import { requireUser } from "@/lib/auth";
import { formatCHF, formatDate, formatDateShort, intervalSuffix } from "@/lib/format";
import { getActiveSubscription, listUserInvoices, planPrice } from "@/lib/subscriptions";

/** Clé de licence lisible, dérivée de l'identifiant du compte (stable, sans état supplémentaire). */
function licenceKey(userId: string) {
  const hex = createHash("sha256").update(`blonay-pdf:${userId}`).digest("hex").toUpperCase();
  return `BPDF-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

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
              <h2 className="mt-4 font-display text-[1.9rem] font-semibold text-ink-900">Vous n'avez pas encore de formule.</h2>
              <p className="mt-2 max-w-lg text-[15px] text-ink-500">Choisissez la formule Enseignant·e ou Établissement pour activer votre licence et utiliser {site.name} dans le navigateur, sur Windows et sur macOS.</p>
            </div>
            <ButtonLink href="/tarifs">
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
            <Link href="/compte/abonnement" className="text-sm font-semibold text-brand-700 hover:text-brand-900">
              Gérer
            </Link>
          </div>
          <h2 className="mt-4 font-display text-[2.25rem] font-semibold text-ink-900">Formule {subscription.plan.name}</h2>
          <p className="mt-1 text-[15px] text-ink-500">{subscription.plan.tagline}</p>
          <p className="mt-6 flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold text-ink-900">{formatCHF(price)}</span>
            <span className="text-sm text-ink-500">{intervalSuffix(subscription.interval)}</span>
          </p>
          {subscription.pendingPlan && subscription.pendingInterval && (
            <p className="mt-4 rounded-xl bg-accent-100 px-4 py-3 text-sm text-accent-600">
              Passage à la formule {subscription.pendingPlan.name} ({subscription.pendingInterval === "month" ? "mensuelle" : "annuelle"}) le {formatDate(subscription.currentPeriodEnd)}.
            </p>
          )}
        </Panel>

        <Panel>
          <dl className="space-y-5 text-sm">
            <div className="flex gap-3">
              <CalendarDays className="mt-0.5 size-4 text-brand-600" aria-hidden />
              <div>
                <dt className="text-ink-500">{subscription.cancelAtPeriodEnd ? "Fin de l'abonnement" : "Prochain renouvellement"}</dt>
                <dd className="mt-0.5 font-semibold text-ink-900">{formatDate(subscription.currentPeriodEnd)}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <CreditCard className="mt-0.5 size-4 text-brand-600" aria-hidden />
              <div>
                <dt className="text-ink-500">Moyen de paiement</dt>
                <dd className="mt-0.5 font-semibold text-ink-900">
                  {subscription.paymentBrand ?? "Carte"} •••• {subscription.paymentLast4 ?? "····"}
                </dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Check className="mt-0.5 size-4 text-brand-600" aria-hidden />
              <div>
                <dt className="text-ink-500">Client depuis</dt>
                <dd className="mt-0.5 font-semibold text-ink-900">{formatDate(subscription.createdAt)}</dd>
              </div>
            </div>
          </dl>
        </Panel>
      </div>

      <Panel title="Votre licence et vos applications">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm text-ink-500">
              {subscription.plan.slug === "etablissement"
                ? "Clé de licence de l'établissement, à transmettre à vos collaborateur·trice·s ou à saisir dans la console de déploiement."
                : "Clé de licence, à saisir au premier lancement de l'application de bureau. Elle couvre tous vos appareils."}
            </p>
            <p className="mt-3 inline-flex items-center gap-3 rounded-xl border border-line bg-canvas-50 px-4 py-3 font-mono text-[15px] font-semibold tracking-wider text-ink-900">
              <KeyRound className="size-4 text-brand-600" aria-hidden />
              {licenceKey(user.id)}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={site.downloads.web} size="sm">
              <Globe className="size-4" aria-hidden />
              Ouvrir l'éditeur web
            </ButtonLink>
            <ButtonLink href={site.downloads.windows} variant="secondary" size="sm">
              <Download className="size-4" aria-hidden />
              Windows
            </ButtonLink>
            <ButtonLink href={site.downloads.mac} variant="secondary" size="sm">
              <Download className="size-4" aria-hidden />
              macOS
            </ButtonLink>
          </div>
        </div>
      </Panel>

      <Panel title="Inclus dans votre formule">
        <ul className="grid gap-3 sm:grid-cols-2">
          {subscription.plan.features.map((f) => (
            <li key={f} className="flex items-start gap-3 text-[15px] text-ink-700">
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-ink-500">
          Besoin d'un outil réservé à une formule supérieure ?{" "}
          <Link href="/compte/abonnement" className="font-semibold text-brand-700 hover:text-brand-900">
            Changer de formule
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
        <Link href="/compte/factures" className="text-sm font-semibold text-brand-700 hover:text-brand-900">
          Tout voir
        </Link>
      }
      flush
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
                  <Link href={`/compte/factures/${inv.id}`} className="font-semibold text-ink-900 hover:text-brand-700">
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
