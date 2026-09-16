import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { PrintButton } from "@/components/ui/print-button";
import { site } from "@/content/site";
import { requireUser } from "@/lib/auth";
import { formatCHF, formatDate, fullName } from "@/lib/format";
import { getUserInvoice } from "@/lib/subscriptions";

export const metadata: Metadata = { title: "Facture" };

const VAT_RATE = 8.1;

export default async function FactureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("/compte/factures");
  const { id } = await params;
  const invoice = await getUserInvoice(user.id, id);
  if (!invoice) notFound();

  const vatCents = Math.round((invoice.amountCents * VAT_RATE) / (100 + VAT_RATE));
  const netCents = invoice.amountCents - vatCents;

  return (
    <>
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Link href="/compte/factures" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900">
          <ArrowLeft className="size-4" aria-hidden />
          Toutes les factures
        </Link>
        <PrintButton />
      </div>

      <article className="card p-8 sm:p-12 print:border-0 print:shadow-none">
        <header className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3 text-brand-800">
            <LogoMark className="size-9" />
            <div>
              <p className="font-display text-2xl font-bold leading-none tracking-tight">
                Blonay <span className="text-brand-600">PDF</span>
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {site.address.street}, {site.address.zip} {site.address.city} · {site.email}
              </p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="eyebrow">Facture</p>
            <p className="mt-1 font-display text-3xl font-semibold text-ink-900">{invoice.number}</p>
            <p className="mt-1 text-sm text-ink-500">Émise le {formatDate(invoice.issuedAt)}</p>
          </div>
        </header>

        <div className="mt-10 grid gap-8 border-t border-line pt-8 sm:grid-cols-2">
          <div>
            <p className="eyebrow">Facturé à</p>
            <p className="mt-2 font-semibold text-ink-900">{fullName(user)}</p>
            <p className="text-sm text-ink-500">{user.email}</p>
            {user.phone && <p className="text-sm text-ink-500">{user.phone}</p>}
          </div>
          <div className="sm:text-right">
            <p className="eyebrow">Règlement</p>
            <p className="mt-2 font-semibold text-brand-700">{invoice.status === "paid" ? "Payée" : invoice.status}</p>
            {invoice.paidAt && <p className="text-sm text-ink-500">le {formatDate(invoice.paidAt)}</p>}
            {invoice.paymentBrand && (
              <p className="text-sm text-ink-500">
                {invoice.paymentBrand} •••• {invoice.paymentLast4}
              </p>
            )}
          </div>
        </div>

        <table className="mt-10 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[0.7rem] uppercase tracking-[0.14em] text-ink-500">
              <th className="py-3 pr-4 font-semibold">Description</th>
              <th className="py-3 pr-4 font-semibold">Période</th>
              <th className="py-3 text-right font-semibold">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line">
              <td className="py-4 pr-4 text-ink-900">
                {invoice.description}
                {invoice.subscription?.plan && <span className="block text-xs text-ink-500">Formule {invoice.subscription.plan.name}</span>}
              </td>
              <td className="py-4 pr-4 text-ink-700">
                {invoice.periodStart && invoice.periodEnd ? `${formatDate(invoice.periodStart)} – ${formatDate(invoice.periodEnd)}` : "—"}
              </td>
              <td className="py-4 text-right font-semibold text-ink-900">{formatCHF(invoice.amountCents)}</td>
            </tr>
          </tbody>
        </table>

        <dl className="ml-auto mt-6 max-w-xs space-y-2 text-sm">
          <div className="flex justify-between text-ink-500">
            <dt>Montant hors TVA</dt>
            <dd>{formatCHF(netCents)}</dd>
          </div>
          <div className="flex justify-between text-ink-500">
            <dt>TVA {VAT_RATE} %</dt>
            <dd>{formatCHF(vatCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold text-ink-900">
            <dt>Total TTC</dt>
            <dd>{formatCHF(invoice.amountCents)}</dd>
          </div>
        </dl>

        <footer className="mt-12 border-t border-line pt-6 text-xs text-ink-400">
          {site.legalName} · {site.address.street}, {site.address.zip} {site.address.city} · {site.phone} · IDE CHE-000.000.000 (à compléter) · {site.vatNote}
        </footer>
      </article>
    </>
  );
}
