import { desc, eq } from "drizzle-orm";
import { Panel } from "@/components/account/space-shell";
import { SubscriptionBadge } from "@/components/account/subscription-badge";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { subscriptions, users } from "@/lib/db/schema";
import { formatDateShort, fullName, intervalLabel } from "@/lib/format";
import { reconcileSubscriptions } from "@/lib/subscriptions";

export default async function AdminMembresPage() {
  await reconcileSubscriptions();
  const members = await db.query.users.findMany({
    orderBy: [desc(users.createdAt)],
    with: { subscriptions: { where: eq(subscriptions.status, "active"), with: { plan: true } } },
  });

  return (
    <Panel title={`Membres (${members.length})`} className="!p-0">
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Membre</th>
              <th>Téléphone</th>
              <th>Inscrit le</th>
              <th>Formule</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const sub = m.subscriptions[0];
              return (
                <tr key={m.id}>
                  <td>
                    <span className="font-semibold text-ink-900">{fullName(m)}</span>
                    {m.role === "admin" && (
                      <Badge tone="dark" className="ml-2">
                        Admin
                      </Badge>
                    )}
                    <span className="block text-xs text-ink-500">{m.email}</span>
                  </td>
                  <td>{m.phone ?? "—"}</td>
                  <td>{formatDateShort(m.createdAt)}</td>
                  <td>{sub ? `${sub.plan.name} · ${intervalLabel(sub.interval)}` : "—"}</td>
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
  );
}
