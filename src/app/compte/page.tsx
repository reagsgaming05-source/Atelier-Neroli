import Link from "next/link";
import { createHash } from "node:crypto";
import { ArrowRight, Building2, CalendarDays, Check, CreditCard, Download, Globe, KeyRound } from "lucide-react";
import { BarChart, BarList } from "@/components/charts/bar-chart";
import { Notice, Panel } from "@/components/account/space-shell";
import { SubscriptionBadge } from "@/components/account/subscription-badge";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { site } from "@/content/site";
import { getAccess, isEstablishmentOwner } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { formatCHF, formatDate, formatDateShort, intervalSuffix } from "@/lib/format";
import { orgUserIds } from "@/lib/org";
import { listUserInvoices, planPrice } from "@/lib/subscriptions";
import { getUsageSummary } from "@/lib/usage";

/** Clé de licence lisible, dérivée de l'identifiant du compte titulaire (stable, sans état supplémentaire). */
function licenceKey(ownerId: string) {
  const hex = createHash("sha256").update(`blonay-pdf:${ownerId}`).digest("hex").toUpperCase();
  return `BPDF-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

export default async function CompteDashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/compte");
  const params = await searchParams;
  const [access, invoices] = await Promise.all([getAccess(user), listUserInvoices(user.id)]);

  if (access.kind === "none") {
    return (
      <>
        <Panel>
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <SubscriptionBadge subscription={null} />
              <h2 className="mt-4 font-display text-[1.9rem] font-semibold text-ink-900">Vous n'avez pas encore de formule.</h2>
              <p className="mt-2 max-w-lg text-[15px] text-ink-500">Choisissez la formule Enseignant·e ou Établissement pour activer votre licence et utiliser {site.name} dans le navigateur, sur Windows et sur macOS. Si votre établissement est déjà équipé, demandez au secrétariat de vous inviter avec cette adresse : {user.email}.</p>
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

  const subscription = access.subscription;
  const ownerId = access.kind === "member" ? access.owner.id : user.id;
  const establishment = isEstablishmentOwner(access);
  const usage = await getUsageSummary(establishment ? await orgUserIds(user.id) : [user.id]);
  const price = planPrice(subscription.plan, subscription.interval);

  return (
    <>
      {params.notice === "via-etablissement" && <Notice tone="info">Votre accès est fourni par votre établissement : aucune souscription individuelle n'est nécessaire.</Notice>}
      {access.kind === "member" && (
        <Notice tone="info">
          <span className="inline-flex items-center gap-2">
            <Building2 className="size-4" aria-hidden />
            Licence Établissement fournie par {access.owner.name}. La gestion de l'abonnement est assurée par votre établissement.
          </span>
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SubscriptionBadge subscription={subscription} />
            {access.kind === "owner" && (
              <Link href="/compte/abonnement" className="text-sm font-semibold text-brand-700 hover:text-brand-900">
                Gérer
              </Link>
            )}
          </div>
          <h2 className="mt-4 font-display text-[2.25rem] font-semibold text-ink-900">Formule {subscription.plan.name}</h2>
          <p className="mt-1 text-[15px] text-ink-500">{subscription.plan.tagline}</p>
          {access.kind === "owner" ? (
            <p className="mt-6 flex items-baseline gap-2">
              <span className="font-display text-3xl font-semibold text-ink-900">{formatCHF(price)}</span>
              <span className="text-sm text-ink-500">{intervalSuffix(subscription.interval)}</span>
            </p>
          ) : (
            <p className="mt-6 text-sm text-ink-500">Accès actif jusqu'au {formatDate(subscription.currentPeriodEnd)}, renouvelé par votre établissement.</p>
          )}
          {subscription.pendingPlan && subscription.pendingInterval && access.kind === "owner" && (
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
            {access.kind === "owner" && (
              <div className="flex gap-3">
                <CreditCard className="mt-0.5 size-4 text-brand-600" aria-hidden />
                <div>
                  <dt className="text-ink-500">Moyen de paiement</dt>
                  <dd className="mt-0.5 font-semibold text-ink-900">
                    {subscription.paymentBrand ?? "Carte"} •••• {subscription.paymentLast4 ?? "····"}
                  </dd>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Check className="mt-0.5 size-4 text-brand-600" aria-hidden />
              <div>
                <dt className="text-ink-500">{access.kind === "member" ? "Rattaché·e à l'établissement" : "Client depuis"}</dt>
                <dd className="mt-0.5 font-semibold text-ink-900">{access.kind === "member" ? access.owner.name : formatDate(subscription.createdAt)}</dd>
              </div>
            </div>
          </dl>
        </Panel>
      </div>

      {/* ---------- Usage ---------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Documents ce mois", value: usage.thisMonth.documents },
          { label: "Pages traitées ce mois", value: usage.thisMonth.pages },
          { label: "Signatures envoyées", value: usage.thisMonth.signatures },
          { label: "Pages OCR", value: usage.thisMonth.ocrPages },
        ].map((k) => (
          <div key={k.label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">{k.label}</p>
            <p className="mt-3 font-display text-[1.75rem] font-semibold leading-none tabular-nums text-ink-900">{k.value.toLocaleString("fr-CH")}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title={establishment ? "Activité de l'établissement" : "Votre activité"} action={<span className="text-xs text-ink-400">Documents traités par mois, six derniers mois</span>}>
          {usage.total === 0 ? (
            <p className="text-sm text-ink-500">
              Aucune opération enregistrée pour le moment.{" "}
              <Link href="/demo" className="font-semibold text-brand-700 hover:text-brand-900">
                Essayez la démo
              </Link>{" "}
              : vos opérations apparaîtront ici.
            </p>
          ) : (
            <BarChart ariaLabel="Documents traités par mois" labels={usage.monthly.map((m) => m.label)} series={[{ name: "Documents", color: "var(--color-brand-600)", values: usage.monthly.map((m) => m.documents) }]} />
          )}
        </Panel>
        <Panel title="Outils les plus utilisés">
          {usage.byTool.length === 0 ? <p className="text-sm text-ink-500">Rien à afficher pour le moment.</p> : <BarList items={usage.byTool.slice(0, 6).map((t) => ({ label: t.label, value: t.documents }))} />}
        </Panel>
      </div>

      {/* ---------- Licence ---------- */}
      <Panel title="Votre licence et vos applications">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm text-ink-500">
              {establishment
                ? "Clé de licence de l'établissement, à transmettre à vos collaborateur·trice·s ou à saisir dans la console de déploiement."
                : access.kind === "member"
                  ? "Clé de licence de votre établissement, à saisir au premier lancement de l'application de bureau."
                  : "Clé de licence, à saisir au premier lancement de l'application de bureau. Elle couvre tous vos appareils."}
            </p>
            <p className="mt-3 inline-flex items-center gap-3 rounded-xl border border-line bg-canvas-50 px-4 py-3 font-mono text-[15px] font-semibold tracking-wider text-ink-900">
              <KeyRound className="size-4 text-brand-600" aria-hidden />
              {licenceKey(ownerId)}
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
        {establishment && (
          <p className="mt-6 text-sm text-ink-500">
            Invitez vos collaborateur·trice·s depuis{" "}
            <Link href="/compte/equipe" className="font-semibold text-brand-700 hover:text-brand-900">
              la page Équipe
            </Link>
            .
          </p>
        )}
      </Panel>

      {access.kind === "owner" && <InvoicesPanel invoices={invoices.slice(0, 5)} />}
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
