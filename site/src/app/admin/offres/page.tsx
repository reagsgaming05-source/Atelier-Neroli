import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { QuotePricingForm } from "@/components/admin/quote-pricing-form";
import { facturation } from "@/content/facturation";
import { formatCHF, formatDate, formatDateTime, intervalLabel } from "@/lib/format";
import { listActivePlans } from "@/lib/subscriptions";
import { listQuotes, quoteCounts } from "@/lib/quotes";
import type { QuoteStatus } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Offres" };

const ETIQUETTES: Record<QuoteStatus, { texte: string; ton: "amber" | "brand" | "green" | "gray" }> = {
  demande: { texte: "À chiffrer", ton: "amber" },
  envoye: { texte: "Envoyée", ton: "brand" },
  accepte: { texte: "Acceptée", ton: "green" },
  refuse: { texte: "Déclinée", ton: "gray" },
  expire: { texte: "Échue", ton: "gray" },
};

const TYPES: Record<string, string> = {
  commune: "Commune",
  ecole: "École",
  etat: "État",
  autre: "Autre",
};

export default async function AdminOffresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const envoyeeId = typeof params.envoyee === "string" ? params.envoyee : null;
  const [offres, compteurs, plans] = await Promise.all([listQuotes(), quoteCounts(), listActivePlans()]);
  const aChiffrer = offres.filter((o) => o.status === "demande");
  const suite = offres.filter((o) => o.status !== "demande");
  const envoyee = envoyeeId ? offres.find((o) => o.id === envoyeeId) : undefined;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-3xl font-semibold text-ink-900">Offres</h1>
        <p className="mt-2 text-ink-500">
          Le chemin d&rsquo;achat du secteur public : une demande arrive, vous la chiffrez, le client accepte avec son bon
          de commande, la facture part.
        </p>
      </header>

      {envoyee ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-6">
          <p className="font-semibold text-brand-800">
            Offre {envoyee.number} chiffrée à {formatCHF(envoyee.amountCents)} pour {envoyee.orgName}.
          </p>
          <p className="mt-2 text-sm text-ink-700">
            Transmettez ce lien à {envoyee.contactFirstName} {envoyee.contactLastName} (
            <a href={`mailto:${envoyee.contactEmail}`} className="font-medium text-brand-700 hover:text-brand-900">
              {envoyee.contactEmail}
            </a>
            ). Il affiche l&rsquo;offre et permet de la commander, sans connexion.
          </p>
          <p className="mt-3 select-all break-all rounded-lg border border-line bg-white px-3 py-2 font-mono text-sm text-ink-900">
            {`/offre/${envoyee.token}`}
          </p>
          <Link href={`/offre/${envoyee.token}`} className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:text-brand-900">
            Ouvrir l&rsquo;offre telle que le client la voit
          </Link>
        </div>
      ) : null}

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {(
          [
            ["À chiffrer", compteurs.demande],
            ["Envoyées", compteurs.envoye],
            ["Acceptées", compteurs.accepte],
            ["Déclinées", compteurs.refuse],
            ["Échues", compteurs.expire],
          ] as const
        ).map(([label, valeur]) => (
          <div key={label} className="card p-5">
            <dt className="text-sm text-ink-500">{label}</dt>
            <dd className="mt-1 font-display text-3xl font-semibold text-ink-900">{valeur}</dd>
          </div>
        ))}
      </dl>

      {/* ------------------------------------------------------- à chiffrer -- */}
      <section>
        <h2 className="font-display text-xl font-semibold text-ink-900">
          À chiffrer{aChiffrer.length ? ` — ${aChiffrer.length}` : ""}
        </h2>
        {aChiffrer.length === 0 ? (
          <p className="mt-3 text-ink-500">Aucune demande en attente.</p>
        ) : (
          <div className="mt-5 space-y-6">
            {aChiffrer.map((offre) => (
              <article key={offre.id} className="card p-6 sm:p-8">
                <EnTete offre={offre} />
                {offre.message ? (
                  <p className="mt-5 rounded-xl border border-line bg-canvas-50 p-4 text-sm leading-relaxed text-ink-700">
                    {offre.message}
                  </p>
                ) : null}
                <div className="mt-6 border-t border-line pt-6">
                  <QuotePricingForm
                    quoteId={offre.id}
                    plans={plans.map((p) => ({
                      id: p.id,
                      name: p.name,
                      slug: p.slug,
                      priceYearlyCents: p.priceYearlyCents,
                      priceMonthlyCents: p.priceMonthlyCents,
                    }))}
                    defaultPlanId={offre.planId ?? plans.find((p) => p.slug === "administration")?.id ?? plans[0]?.id}
                    defaultInterval={offre.interval}
                    defaultAmount={offre.amountCents ? (offre.amountCents / 100).toFixed(2) : ""}
                    defaultConditions={facturation.conditionsParDefaut}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------ suivi -- */}
      <section>
        <h2 className="font-display text-xl font-semibold text-ink-900">Suivi</h2>
        {suite.length === 0 ? (
          <p className="mt-3 text-ink-500">Rien encore.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                <tr className="border-b border-line">
                  <th className="py-3">Offre</th>
                  <th className="py-3">Organisation</th>
                  <th className="py-3">Formule</th>
                  <th className="py-3 text-right">Montant</th>
                  <th className="py-3">Validité</th>
                  <th className="py-3">État</th>
                  <th className="py-3">Lien</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {suite.map((offre) => (
                  <tr key={offre.id}>
                    <td className="py-4 font-medium text-ink-900">
                      {offre.number}
                      <span className="block text-xs text-ink-400">{formatDateTime(offre.createdAt)}</span>
                    </td>
                    <td className="py-4">
                      {offre.orgName}
                      <span className="block text-xs text-ink-400">
                        {TYPES[offre.orgType]} · {offre.seats} poste{offre.seats > 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="py-4 text-ink-500">
                      {offre.plan?.name ?? "—"}
                      <span className="block text-xs text-ink-400">{intervalLabel(offre.interval)}</span>
                    </td>
                    <td className="py-4 text-right font-medium text-ink-900">{formatCHF(offre.amountCents)}</td>
                    <td className="py-4 text-ink-500">{offre.validUntil ? formatDate(offre.validUntil) : "—"}</td>
                    <td className="py-4">
                      <Badge tone={ETIQUETTES[offre.status].ton}>{ETIQUETTES[offre.status].texte}</Badge>
                      {offre.purchaseOrder ? (
                        <span className="mt-1 block text-xs text-ink-400">BC {offre.purchaseOrder}</span>
                      ) : null}
                    </td>
                    <td className="py-4">
                      <Link href={`/offre/${offre.token}`} className="font-semibold text-brand-700 hover:text-brand-900">
                        Ouvrir
                      </Link>
                      <span className="mt-1 block select-all break-all font-mono text-[0.7rem] text-ink-400">
                        /offre/{offre.token}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function EnTete({ offre }: { offre: Awaited<ReturnType<typeof listQuotes>>[number] }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="font-display text-lg font-semibold text-ink-900">{offre.orgName}</p>
        <p className="text-sm text-ink-500">
          {TYPES[offre.orgType]} · {offre.seats} poste{offre.seats > 1 ? "s" : ""}
          {offre.orgIde ? ` · IDE ${offre.orgIde}` : ""}
        </p>
        <p className="mt-2 text-sm text-ink-700">
          {offre.contactFirstName} {offre.contactLastName}
          {offre.contactRole ? `, ${offre.contactRole}` : ""} —{" "}
          <a href={`mailto:${offre.contactEmail}`} className="text-brand-700 hover:text-brand-900">
            {offre.contactEmail}
          </a>
          {offre.contactPhone ? ` · ${offre.contactPhone}` : ""}
        </p>
        {offre.street || offre.city ? (
          <p className="text-sm text-ink-500">
            {offre.street}
            {offre.street && (offre.zip || offre.city) ? ", " : ""}
            {offre.zip} {offre.city}
          </p>
        ) : null}
      </div>
      <div className="text-right text-sm">
        <p className="font-medium text-ink-900">{offre.number}</p>
        <p className="text-ink-400">{formatDateTime(offre.createdAt)}</p>
      </div>
    </div>
  );
}
