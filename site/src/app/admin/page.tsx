import Link from "next/link";
import { and, count, desc, eq, gte, sum } from "drizzle-orm";
import { BarChart, BarList } from "@/components/charts/bar-chart";
import { getUsageSummary } from "@/lib/usage";
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

  // Séries mensuelles (six derniers mois)
  const sixMonthsAgo = new Date(startOfMonth);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  const [paidInvoices, allUsers] = await Promise.all([
    db.select({ amount: invoices.amountCents, issuedAt: invoices.issuedAt }).from(invoices).where(and(eq(invoices.status, "paid"), gte(invoices.issuedAt, sixMonthsAgo))),
    db.select({ id: users.id, createdAt: users.createdAt }).from(users).where(eq(users.role, "member")),
  ]);
  const monthLabels = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() - 5 + i, 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: monthLabels[d.getMonth()] };
  });
  const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const revenueByMonth = months.map((m) => paidInvoices.filter((i) => keyOf(i.issuedAt) === m.key).reduce((a, i) => a + i.amount, 0));
  const signupsByMonth = months.map((m) => allUsers.filter((u) => keyOf(u.createdAt) === m.key).length);
  const usage = await getUsageSummary(allUsers.map((u) => u.id));
  const byPlan = Object.values(
    activeSubs.reduce<Record<string, { label: string; value: number }>>((acc, s) => {
      acc[s.plan.slug] ??= { label: s.plan.name, value: 0 };
      acc[s.plan.slug].value += 1;
      return acc;
    }, {}),
  );
  const kpis = [
    { label: "Abonnements actifs", value: String(activeSubs.length) },
    { label: "Revenu mensuel récurrent", value: formatCHF(mrr) },
    { label: "Encaissé ce mois", value: formatCHF(Number(revenue ?? 0)) },
    { label: "Résiliations programmées", value: String(pendingCancellations) },
    { label: "Comptes clients", value: String(members) },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">{k.label}</p>
            <p className="mt-3 whitespace-nowrap font-display text-[1.75rem] font-semibold leading-none text-ink-900">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Encaissé par mois" action={<span className="text-xs text-ink-400">Factures payées, six derniers mois</span>}>
          <BarChart ariaLabel="Montant encaissé par mois" labels={months.map((m) => m.label)} series={[{ name: "Encaissé", color: "var(--color-brand-600)", values: revenueByMonth.map((v) => v / 100) }]} unit="chf" />
        </Panel>
        <Panel title="Abonnements actifs par formule">
          {byPlan.length === 0 ? <p className="text-sm text-ink-500">Aucun abonnement actif.</p> : <BarList items={byPlan} />}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Nouveaux comptes par mois">
          <BarChart ariaLabel="Nouveaux comptes par mois" labels={months.map((m) => m.label)} series={[{ name: "Comptes", color: "var(--color-accent-500)", values: signupsByMonth }]} height={180} />
        </Panel>
        <Panel title="Documents traités par mois" action={<span className="text-xs text-ink-400">Tous comptes confondus</span>}>
          <BarChart ariaLabel="Documents traités par mois" labels={usage.monthly.map((m) => m.label)} series={[{ name: "Documents", color: "var(--color-brand-600)", values: usage.monthly.map((m) => m.documents) }]} height={180} />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Dernières factures"
          flush
          action={
            <Link href="/admin/factures" className="text-sm font-semibold text-brand-700 hover:text-brand-900">
              Tout voir
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Client</th>
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
          title="Derniers clients"
          flush
          action={
            <Link href="/admin/membres" className="text-sm font-semibold text-brand-700 hover:text-brand-900">
              Tout voir
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
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
