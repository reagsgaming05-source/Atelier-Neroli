import { desc } from "drizzle-orm";
import { Panel } from "@/components/account/space-shell";
import { SubscriptionBadge } from "@/components/account/subscription-badge";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { formatCHF, formatDateShort, fullName, intervalLabel } from "@/lib/format";
import { planPrice, reconcileSubscriptions } from "@/lib/subscriptions";

export default async function AdminAbonnementsPage() {
  await reconcileSubscriptions();
  const rows = await db.query.subscriptions.findMany({
    orderBy: [desc(subscriptions.createdAt)],
    with: { user: true, plan: true, pendingPlan: true },
  });

  return (
    <Panel title={`Abonnements (${rows.length})`} flush>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Formule</th>
              <th>Montant</th>
              <th>Période en cours</th>
              <th>Paiement</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>
                  <span className="font-semibold text-ink-900">{fullName(s.user)}</span>
                  <span className="block text-xs text-ink-500">{s.user.email}</span>
                </td>
                <td>
                  {s.plan.name} · {intervalLabel(s.interval)}
                  {s.pendingPlan && <span className="block text-xs text-accent-600">→ {s.pendingPlan.name} à l'échéance</span>}
                </td>
                <td className="font-semibold text-ink-900">{formatCHF(planPrice(s.plan, s.interval))}</td>
                <td className="whitespace-nowrap">
                  {formatDateShort(s.currentPeriodStart)} – {formatDateShort(s.currentPeriodEnd)}
                </td>
                <td>
                  {s.paymentBrand ?? "—"} {s.paymentLast4 ? `•••• ${s.paymentLast4}` : ""}
                </td>
                <td>{s.status === "canceled" ? <Badge tone="gray">Terminé</Badge> : <SubscriptionBadge subscription={s} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
