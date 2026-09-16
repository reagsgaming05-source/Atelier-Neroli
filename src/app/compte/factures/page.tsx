import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/components/account/space-shell";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { formatCHF, formatDateShort } from "@/lib/format";
import { listUserInvoices, reconcileSubscriptions } from "@/lib/subscriptions";

export const metadata: Metadata = { title: "Mes factures" };

export default async function FacturesPage() {
  const user = await requireUser("/compte/factures");
  await reconcileSubscriptions(user.id);
  const invoices = await listUserInvoices(user.id);

  return (
    <Panel title="Factures" className="!p-0">
      {invoices.length === 0 ? (
        <p className="px-6 pb-8 text-sm text-ink-500">Aucune facture pour le moment.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Date</th>
                <th>Description</th>
                <th>Période</th>
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
                  <td className="whitespace-nowrap">
                    {inv.periodStart && inv.periodEnd ? `${formatDateShort(inv.periodStart)} – ${formatDateShort(inv.periodEnd)}` : "—"}
                  </td>
                  <td className="font-semibold text-ink-900">{formatCHF(inv.amountCents)}</td>
                  <td>
                    <Badge tone={inv.status === "paid" ? "green" : "gray"}>{inv.status === "paid" ? "Payée" : inv.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
