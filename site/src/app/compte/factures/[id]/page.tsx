import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { PrintButton } from "@/components/ui/print-button";
import { site } from "@/content/site";
import { detailTva, facturation } from "@/content/facturation";
import { SectionPaiement } from "@/components/qr-facture";
import { requireUser } from "@/lib/auth";
import { formatCHF, formatDate, fullName } from "@/lib/format";
import { formaterIban, formaterReference, infosFactureSwico } from "@/lib/qr-facture";
import { getUserInvoice } from "@/lib/subscriptions";

export const metadata: Metadata = { title: "Facture" };

export default async function FactureDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser("/compte/factures");
  const { id } = await params;
  const invoice = await getUserInvoice(user.id, id);
  if (!invoice) notFound();

  const { netCents, tvaCents, taux: VAT_RATE } = detailTva(invoice.amountCents);
  const vatCents = tvaCents;
  // Une facture à payer porte sa section paiement ; une facture déjà encaissée
  // par carte n'en a pas besoin, et un code QR sur un document réglé se scanne
  // par mégarde.
  const aPayer = invoice.status === "open" && invoice.paymentMode === "invoice";
  const sortieDeCommande = (await searchParams).commande === "1";

  return (
    <>
      {sortieDeCommande ? (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 p-5 print:hidden">
          <p className="font-semibold text-brand-800">Commande enregistrée. Merci.</p>
          <p className="mt-1 text-sm text-ink-700">
            Voici votre facture. Imprimez-la ou enregistrez-la en PDF pour votre comptabilité — la section paiement avec
            le code QR est en bas. Vous la retrouverez toujours ici.
          </p>
        </div>
      ) : null}

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
            <p className="mt-2 font-semibold text-ink-900">{invoice.billName ?? fullName(user)}</p>
            {invoice.billStreet && <p className="text-sm text-ink-500">{invoice.billStreet}</p>}
            {(invoice.billZip || invoice.billCity) && (
              <p className="text-sm text-ink-500">
                {invoice.billZip} {invoice.billCity}
              </p>
            )}
            {invoice.billIde && <p className="text-sm text-ink-500">IDE {invoice.billIde}</p>}
            {!invoice.billName && <p className="text-sm text-ink-500">{user.email}</p>}
            {!invoice.billName && user.phone && <p className="text-sm text-ink-500">{user.phone}</p>}
          </div>
          <div className="sm:text-right">
            <p className="eyebrow">Règlement</p>
            <p className="mt-2 font-semibold text-brand-700">
              {invoice.status === "paid" ? "Payée" : aPayer ? "À payer" : invoice.status}
            </p>
            {invoice.paidAt && <p className="text-sm text-ink-500">le {formatDate(invoice.paidAt)}</p>}
            {aPayer && invoice.dueAt && <p className="text-sm text-ink-500">échéance le {formatDate(invoice.dueAt)}</p>}
            {invoice.paymentBrand && (
              <p className="text-sm text-ink-500">
                {invoice.paymentBrand} •••• {invoice.paymentLast4}
              </p>
            )}
            {invoice.reference && <p className="mt-2 text-sm text-ink-500">Votre référence : {invoice.reference}</p>}
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

        {aPayer && invoice.qrReference ? (
          <div className="mt-10 rounded-xl border border-brand-200 bg-brand-50/60 p-6 text-sm">
            <p className="font-semibold text-ink-900">Payable à {facturation.joursDePaiement} jours</p>
            <p className="mt-2 text-ink-700">
              Scannez le code QR ci-dessous dans votre e-banking, ou saisissez l&rsquo;IBAN{" "}
              <span className="whitespace-nowrap font-medium">{formaterIban(facturation.iban)}</span> avec la référence{" "}
              <span className="whitespace-nowrap font-medium">{formaterReference(invoice.qrReference)}</span>.
            </p>
          </div>
        ) : null}

        <footer className="mt-12 border-t border-line pt-6 text-xs text-ink-400">
          {site.legalName} · {facturation.creancier.rue} {facturation.creancier.numero}, {facturation.creancier.npa}{" "}
          {facturation.creancier.localite} · {site.phone} · IDE {facturation.ide} · {site.vatNote}
        </footer>
      </article>

      {/* La section paiement détachable, aux dimensions de la norme suisse. */}
      {aPayer && invoice.qrReference ? (
        <div className="qr-bulletin-ecran mt-8 overflow-x-auto">
          <SectionPaiement
            facture={{
              iban: facturation.iban,
              creancier: facturation.creancier,
              debiteur: {
                nom: invoice.billName ?? fullName(user),
                rue: invoice.billStreet,
                numero: null,
                npa: invoice.billZip,
                localite: invoice.billCity,
                pays: invoice.billCountry ?? "CH",
              },
              montant: invoice.amountCents / 100,
              monnaie: "CHF",
              reference: invoice.qrReference,
              message: invoice.reference ? `Bon de commande ${invoice.reference}` : invoice.description,
              infosFacture: infosFactureSwico({
                numero: invoice.number,
                date: invoice.issuedAt,
                tvaNumero: facturation.tvaNumero,
                tvaTaux: VAT_RATE,
                montantCents: invoice.amountCents,
                joursDePaiement: facturation.joursDePaiement,
              }),
            }}
          />
        </div>
      ) : null}
    </>
  );
}
