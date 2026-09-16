import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { formatCHF, formatDate } from "@/lib/format";
import { getUserInvoice } from "@/lib/subscriptions";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/compte");
  const params = await searchParams;
  const invoiceId = typeof params.invoice === "string" ? params.invoice : "";
  const invoice = invoiceId ? await getUserInvoice(user.id, invoiceId) : null;
  if (!invoice) redirect("/compte");

  return (
    <section className="container-x flex justify-center py-16 lg:py-24">
      <div className="card w-full max-w-xl p-10 text-center sm:p-14">
        <span className="mx-auto inline-flex size-16 items-center justify-center rounded-full bg-forest-50 text-forest-700">
          <CircleCheck className="size-8" aria-hidden />
        </span>
        <p className="eyebrow mt-8">Abonnement confirmé</p>
        <h1 className="mt-3 font-display text-4xl font-medium text-ink-900 sm:text-5xl">Bienvenue à l'atelier, {user.firstName}.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
          Votre formule {invoice.subscription?.plan?.name ?? ""} est active. Vous pouvez dès maintenant réserver votre premier soin en mentionnant votre abonnement.
        </p>

        <dl className="mt-8 grid gap-4 rounded-2xl bg-cream-100 p-6 text-left text-sm sm:grid-cols-3">
          <div>
            <dt className="text-ink-500">Facture</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">{invoice.number}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Montant réglé</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">{formatCHF(invoice.amountCents)}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Prochaine échéance</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">{invoice.periodEnd ? formatDate(invoice.periodEnd) : "—"}</dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/compte">Accéder à mon espace</ButtonLink>
          <ButtonLink href={`/compte/factures/${invoice.id}`} variant="secondary">
            Voir la facture
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
