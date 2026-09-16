import Link from "next/link";
import { and, count, desc, eq, gte, sum } from "drizzle-orm";
import { Panel } from "@/components/account/space-shell";
import { SubscriptionBadge } from "@/components/account/subscription-badge";
import { db } from "@/lib/db";
import { invoices, subscriptions, users } from "@/lib/db/schema";
import { formatCHF, formatDateShort, fullName } from "@/lib/format";
import { monthlyEquivalent, reconcileSubscriptions } from "@/lib/subscriptions";

export default async function AdminOverviewPage() {
  await reconcileSubscriptions();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [activeSubs, [{ revenue }], [{ members }], [{ pendingCancellations }], latestInvoices, latestMembers] = await Promise.all([
    db.query.subscriptions.findMany({ where: eq(subscriptions.status, "active"), with: { plan: true } }),
    db.select({ revenue: sum(invoices.amountCents) }).from(invoices).where(and(eq(invoices.status, "paid"), gte(invoices.issuedAt, startOfMonth))),
    db.select({ members: count() }).from(users).where(eq(users.role, "member")),
    db.select({ pendingCancellations: count() }).from(subscriptions).where(and(eq(subscriptions.status, "active"), eq(subscriptions.cancelAtPeriodEnd, true))),
    db.query.invoices.findMany({ orderBy: [desc(invoices.issuedAt)], limit: 6, with: { user: true } }),
    db.query.users.findMany({
      where: eq(users.role, "member"),
      orderBy: [desc(users.createdAt)],
      limit: 6,
      with: { subscriptions: { where: eq(subscriptions.status, "active"), with: { plan: true } } },
    }),
  ]);

  const mrr = activeSubs.reduce((acc, s) => acc + monthlyEquivalent(s.plan, s.interval), 0);
  const kpis = [
    { label: "Abonnements actifs", value: String(activeSubs.length) },
    { label: "Revenu mensuel récurrent", value: formatCHF(mrr) },
    { label: "Encaissé ce mois", value: formatCHF(Number(revenue ?? 0)) },
    { label: "Résiliations programmées", value: String(pendingCancellations) },
    { label: "Membres inscrits", value: String(members) },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">{k.label}</p>
            <p className="mt-3 whitespace-nowrap font-display text-[1.75rem] font-medium leading-none text-ink-900">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Dernières factures"
          className="!p-0"
          action={
            <Link href="/admin/factures" className="text-sm font-semibold text-forest-700 hover:text-forest-900">
              Tout voir
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Membre</th>
                  <th>Date</th>
                  <th>Montant</th>
                </tr>
              </thead>
              <tbody>
                {latestInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="whitespace-nowrap font-semibold text-ink-900">{inv.number}</td>
                    <td>{fullName(inv.user)}</td>
                    <td>{formatDateShort(inv.issuedAt)}</td>
                    <td className="font-semibold text-ink-900">{formatCHF(inv.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Derniers membres"
          className="!p-0"
          action={
            <Link href="/admin/membres" className="text-sm font-semibold text-forest-700 hover:text-forest-900">
              Tout voir
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Inscrit le</th>
                  <th>Formule</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {latestMembers.map((m) => {
                  const sub = m.subscriptions[0];
                  return (
                    <tr key={m.id}>
                      <td>
                        <span className="font-semibold text-ink-900">{fullName(m)}</span>
                        <span className="block text-xs text-ink-500">{m.email}</span>
                      </td>
                      <td>{formatDateShort(m.createdAt)}</td>
                      <td>{sub ? sub.plan.name : "—"}</td>
                      <td>
                        <SubscriptionBadge subscription={sub ?? null} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
