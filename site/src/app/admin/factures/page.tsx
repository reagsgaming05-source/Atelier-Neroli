import { desc } from "drizzle-orm";
import { Panel } from "@/components/account/space-shell";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { formatCHF, formatDateShort, fullName } from "@/lib/format";
import { reconcileSubscriptions } from "@/lib/subscriptions";

export default async function AdminFacturesPage() {
  await reconcileSubscriptions();
  const rows = await db.query.invoices.findMany({ orderBy: [desc(invoices.issuedAt)], with: { user: true } });
  const total = rows.filter((r) => r.status === "paid").reduce((acc, r) => acc + r.amountCents, 0);

  return (
    <Panel title={`Factures (${rows.length})`} flush action={<span className="text-sm text-ink-500">Total encaissé : <strong className="text-ink-900">{formatCHF(total)}</strong></span>}>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Client</th>
              <th>Date</th>
              <th>Description</th>
              <th>Montant</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr key={inv.id}>
                <td className="whitespace-nowrap font-semibold text-ink-900">{inv.number}</td>
                <td>{fullName(inv.user)}</td>
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
