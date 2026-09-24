import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarX2, CheckCircle2, XCircle } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { PrintButton } from "@/components/ui/print-button";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { QuoteAcceptForm } from "@/components/quote-accept-form";
import { declineQuoteAction } from "@/lib/actions/quote";
import { facturation, detailTva } from "@/content/facturation";
import { site } from "@/content/site";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { formatCHF, formatDate, intervalLabel } from "@/lib/format";
import { getQuoteByToken } from "@/lib/quotes";

export const metadata: Metadata = { title: "Votre offre", robots: { index: false, follow: false } };

const LIBELLES_TYPE: Record<string, string> = {
  commune: "Commune",
  ecole: "Établissement scolaire",
  etat: "Service de l'État",
  autre: "Organisation",
};

export default async function OffreLienPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await getQuoteByToken(token);
  if (!quote) notFound();

  // Une demande non encore chiffrée n'est pas une offre : le lien existe, mais
  // il n'y a rien à montrer tant que nous n'avons pas répondu.
  if (quote.status === "demande") {
    return (
      <section className="container-x max-w-2xl py-24 text-center">
        <LogoMark className="mx-auto size-12" />
        <h1 className="mt-6 font-display text-3xl font-semibold text-ink-900">Votre demande est arrivée</h1>
        <p className="mt-4 text-ink-500">
          Nous préparons l&rsquo;offre {quote.number} pour {quote.orgName}. Vous la recevrez par courriel à{" "}
          {quote.contactEmail}, sous deux jours ouvrables, et ce lien l&rsquo;affichera.
        </p>
      </section>
    );
  }

  const { netCents, tvaCents, taux } = detailTva(quote.amountCents);
  const existant = await db.query.users.findFirst({ where: eq(users.email, quote.contactEmail.toLowerCase()) });
  const ouverte = quote.status === "envoye";

  return (
    <section className="container-x max-w-4xl py-12 lg:py-16">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <p className="eyebrow">Offre {quote.number}</p>
        <PrintButton label="Imprimer ou enregistrer en PDF" />
      </div>

      {/* --------------------------------------------------------- le devis -- */}
      <article className="card mt-6 p-8 sm:p-12 print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-8">
          <div className="flex items-center gap-3">
            <LogoMark className="size-10" />
            <div>
              <p className="font-display text-lg font-semibold text-ink-900">{site.legalName}</p>
              <p className="text-sm text-ink-500">
                {facturation.creancier.rue} {facturation.creancier.numero} · {facturation.creancier.npa}{" "}
                {facturation.creancier.localite}
              </p>
              <p className="text-sm text-ink-500">IDE {facturation.ide}</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-display text-2xl font-semibold text-ink-900">Offre</p>
            <p className="mt-1 text-ink-500">{quote.number}</p>
            <p className="text-ink-500">Établie le {formatDate(quote.sentAt ?? quote.createdAt)}</p>
            {quote.validUntil ? <p className="text-ink-500">Valable jusqu&rsquo;au {formatDate(quote.validUntil)}</p> : null}
          </div>
        </header>

        <div className="grid gap-8 py-8 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Destinataire</p>
            <p className="mt-2 font-semibold text-ink-900">{quote.orgName}</p>
            <p className="text-sm text-ink-500">{LIBELLES_TYPE[quote.orgType]}</p>
            {quote.street ? <p className="text-sm text-ink-500">{quote.street}</p> : null}
            {quote.zip || quote.city ? (
              <p className="text-sm text-ink-500">
                {quote.zip} {quote.city}
              </p>
            ) : null}
            {quote.orgIde ? <p className="mt-1 text-sm text-ink-500">IDE {quote.orgIde}</p> : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">À l&rsquo;attention de</p>
            <p className="mt-2 font-semibold text-ink-900">
              {quote.contactFirstName} {quote.contactLastName}
            </p>
            {quote.contactRole ? <p className="text-sm text-ink-500">{quote.contactRole}</p> : null}
            <p className="text-sm text-ink-500">{quote.contactEmail}</p>
            {quote.contactPhone ? <p className="text-sm text-ink-500">{quote.contactPhone}</p> : null}
          </div>
        </div>

        <table className="w-full border-t border-line text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
              <th className="py-3">Prestation</th>
              <th className="py-3 text-right">Montant</th>
            </tr>
          </thead>
          <tbody className="border-t border-line">
            <tr>
              <td className="py-5">
                <p className="font-semibold text-ink-900">Blonay PDF — formule {quote.plan?.name ?? "à définir"}</p>
                <p className="mt-1 text-ink-500">
                  Abonnement {intervalLabel(quote.interval).toLowerCase()} · {quote.seats}{" "}
                  {quote.seats > 1 ? "postes annoncés" : "poste annoncé"}
                </p>
                {quote.plan ? (
                  <ul className="mt-3 space-y-1 text-ink-500">
                    {quote.plan.features.map((f) => (
                      <li key={f}>· {f}</li>
                    ))}
                  </ul>
                ) : null}
              </td>
              <td className="py-5 text-right align-top font-semibold text-ink-900">{formatCHF(netCents)}</td>
            </tr>
          </tbody>
          <tfoot className="border-t border-line">
            <tr className="text-ink-500">
              <td className="py-2">Sous-total</td>
              <td className="py-2 text-right">{formatCHF(netCents)}</td>
            </tr>
            <tr className="text-ink-500">
              <td className="py-2">TVA {taux} %</td>
              <td className="py-2 text-right">{formatCHF(tvaCents)}</td>
            </tr>
            <tr className="border-t border-line font-display text-lg font-semibold text-ink-900">
              <td className="py-4">Total</td>
              <td className="py-4 text-right">{formatCHF(quote.amountCents)}</td>
            </tr>
          </tfoot>
        </table>

        {quote.conditions ? (
          <div className="mt-8 border-t border-line pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Conditions</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{quote.conditions}</p>
          </div>
        ) : null}
      </article>

      {/* ------------------------------------------------------ la décision -- */}
      <div className="mt-10 print:hidden">
        {ouverte ? (
          <div className="card p-8 sm:p-10">
            <h2 className="font-display text-2xl font-semibold text-ink-900">Accepter cette offre</h2>
            <p className="mt-3 max-w-2xl text-ink-500">
              L&rsquo;abonnement démarre aujourd&rsquo;hui et la facture est émise immédiatement, payable à{" "}
              {facturation.joursDePaiement} jours par QR-facture. Rien n&rsquo;est prélevé.
            </p>
            <div className="mt-8 max-w-xl">
              <QuoteAcceptForm
                token={token}
                compteExistant={!!existant}
                adresse={{
                  nom: quote.orgName,
                  rue: quote.street ?? "",
                  npa: quote.zip ?? "",
                  localite: quote.city ?? "",
                  ide: quote.orgIde ?? "",
                }}
              />
            </div>
            <ConfirmForm
              action={declineQuoteAction}
              message="Décliner cette offre ? Vous pourrez toujours nous en redemander une."
              className="mt-8 border-t border-line pt-6"
            >
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="text-sm font-medium text-ink-500 underline-offset-4 hover:text-ink-900 hover:underline">
                Décliner cette offre
              </button>
            </ConfirmForm>
          </div>
        ) : (
          <EtatFerme statut={quote.status} />
        )}
      </div>
    </section>
  );
}

function EtatFerme({ statut }: { statut: string }) {
  const contenu =
    statut === "accepte"
      ? {
          Icone: CheckCircle2,
          couleur: "text-brand-700",
          titre: "Offre acceptée",
          texte:
            "La commande est enregistrée et la facture émise. Vous la retrouvez dans votre espace client, avec sa QR-facture.",
        }
      : statut === "refuse"
        ? {
            Icone: XCircle,
            couleur: "text-ink-400",
            titre: "Offre déclinée",
            texte: "Elle ne peut plus être acceptée. Écrivez-nous si vous souhaitez une offre à jour.",
          }
        : {
            Icone: CalendarX2,
            couleur: "text-accent-600",
            titre: "Offre échue",
            texte:
              "La date de validité est passée. Demandez-nous une offre à jour : les conditions sont généralement identiques.",
          };
  const { Icone, couleur, titre, texte } = contenu;
  return (
    <div className="card flex gap-5 p-8">
      <Icone className={`size-8 shrink-0 ${couleur}`} aria-hidden />
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-900">{titre}</h2>
        <p className="mt-2 max-w-xl text-ink-500">{texte}</p>
      </div>
    </div>
  );
}
