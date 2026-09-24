import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { and, count, desc, eq, inArray, like, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  invoices,
  plans,
  quotes,
  subscriptions,
  users,
  type BillingInterval,
  type Invoice,
  type Plan,
  type Quote,
  type QuoteStatus,
} from "@/lib/db/schema";
import { facturation } from "@/content/facturation";
import { referencePourIban } from "@/lib/qr-facture";
import { addInterval, planPrice } from "@/lib/subscriptions";
import { hashPassword } from "@/lib/password";
import { intervalLabel } from "@/lib/format";

/**
 * Le chemin d'achat d'une collectivité publique.
 *
 * Une commune ne sort pas une carte de crédit : elle demande une offre, la fait
 * passer en Municipalité, émet un bon de commande, et paie une facture à
 * 30 jours. Le site suit ce chemin-là, étape par étape, parce qu'un site qui
 * n'accepte que la carte ne vend rien à une administration.
 *
 *   demande  →  envoyé  →  accepté  (abonnement + facture ouverte)
 *                       ↘  refusé
 *                       ↘  expiré  (passé la date de validité)
 *
 * Aucun compte n'est nécessaire pour demander une offre : le lien reçu suffit à
 * la consulter et à l'accepter. Le compte se crée à l'acceptation.
 */

export class QuoteError extends Error {}

export type QuoteWithPlan = Quote & { plan: Plan | null };

const jours = (n: number) => n * 24 * 60 * 60 * 1000;

/* ---------------------------------------------------------- Numérotation -- */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function nextQuoteNumber(tx: Tx | typeof db) {
  const year = new Date().getFullYear();
  const prefixe = `${facturation.prefixeOffre}-${year}-`;
  const [{ value }] = await tx.select({ value: count() }).from(quotes).where(like(quotes.number, `${prefixe}%`));
  return `${prefixe}${String(value + 1).padStart(4, "0")}`;
}

/** Le secret du lien public. Assez long pour qu'on ne le devine pas. */
const nouveauJeton = () => randomBytes(24).toString("base64url");

/* --------------------------------------------------------------- Lecture -- */

/**
 * Une offre passée de date ne doit plus pouvoir être acceptée. Plutôt qu'une
 * tâche planifiée — qui suppose un ordonnanceur, donc un serveur qui tourne —
 * on le constate à la lecture : c'est la même approche que pour les
 * renouvellements d'abonnement, et elle ne peut pas prendre de retard.
 */
async function expirerLesOffresPassees() {
  await db
    .update(quotes)
    .set({ status: "expire", updatedAt: new Date() })
    .where(and(eq(quotes.status, "envoye"), lt(quotes.validUntil, new Date())));
}

export async function listQuotes(statuts?: QuoteStatus[]): Promise<QuoteWithPlan[]> {
  await expirerLesOffresPassees();
  return db.query.quotes.findMany({
    where: statuts?.length ? inArray(quotes.status, statuts) : undefined,
    with: { plan: true },
    orderBy: [desc(quotes.createdAt)],
  });
}

export async function getQuoteByToken(token: string): Promise<QuoteWithPlan | null> {
  if (!token) return null;
  await expirerLesOffresPassees();
  const quote = await db.query.quotes.findFirst({ where: eq(quotes.token, token), with: { plan: true } });
  return quote ?? null;
}

export async function getQuoteById(id: string): Promise<QuoteWithPlan | null> {
  const quote = await db.query.quotes.findFirst({ where: eq(quotes.id, id), with: { plan: true } });
  return quote ?? null;
}

/** Ce que l'administration voit sur son tableau de bord. */
export async function quoteCounts() {
  const rows = await db.select({ status: quotes.status, value: count() }).from(quotes).groupBy(quotes.status);
  const par = Object.fromEntries(rows.map((r) => [r.status, r.value])) as Partial<Record<QuoteStatus, number>>;
  return {
    demande: par.demande ?? 0,
    envoye: par.envoye ?? 0,
    accepte: par.accepte ?? 0,
    refuse: par.refuse ?? 0,
    expire: par.expire ?? 0,
  };
}

/* ------------------------------------------------------------- Demande --- */

export type QuoteRequestInput = {
  orgType: Quote["orgType"];
  orgName: string;
  orgIde?: string | null;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  contactFirstName: string;
  contactLastName: string;
  contactRole?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  seats: number;
  planSlug?: string | null;
  interval?: BillingInterval;
  message?: string | null;
};

/**
 * Une demande d'offre. Elle n'engage à rien et ne crée pas de compte : c'est le
 * premier contact, et lui demander de choisir un mot de passe à ce moment-là
 * ferait fuir la moitié des secrétariats.
 */
export async function createQuoteRequest(input: QuoteRequestInput) {
  const plan = input.planSlug
    ? await db.query.plans.findFirst({ where: and(eq(plans.slug, input.planSlug), eq(plans.active, true)) })
    : null;

  const now = new Date();
  const [quote] = await db
    .insert(quotes)
    .values({
      id: randomUUID(),
      number: await nextQuoteNumber(db),
      token: nouveauJeton(),
      status: "demande",
      orgType: input.orgType,
      orgName: input.orgName,
      orgIde: input.orgIde || null,
      street: input.street || null,
      zip: input.zip || null,
      city: input.city || null,
      country: "CH",
      contactFirstName: input.contactFirstName,
      contactLastName: input.contactLastName,
      contactRole: input.contactRole || null,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone || null,
      seats: input.seats,
      message: input.message || null,
      planId: plan?.id ?? null,
      interval: input.interval ?? "year",
      // Le montant proposé d'emblée quand la formule a un prix public : cela
      // évite de faire attendre une petite commune pour un tarif affiché.
      amountCents: plan && !plan.quoteOnly ? planPrice(plan, input.interval ?? "year") : 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return quote;
}

/* --------------------------------------------------------------- Offre --- */

/** L'administration chiffre l'offre et l'envoie. Le lien devient consultable. */
export async function sendQuote(input: {
  id: string;
  planId: string;
  interval: BillingInterval;
  amountCents: number;
  validUntil?: Date | null;
  conditions?: string | null;
  internalNote?: string | null;
}) {
  const quote = await getQuoteById(input.id);
  if (!quote) throw new QuoteError("Offre introuvable.");
  if (quote.status === "accepte") throw new QuoteError("Cette offre a déjà été acceptée : elle ne se modifie plus.");
  if (input.amountCents <= 0) throw new QuoteError("Indiquez un montant.");

  const plan = await db.query.plans.findFirst({ where: eq(plans.id, input.planId) });
  if (!plan) throw new QuoteError("Formule introuvable.");

  const now = new Date();
  const [maj] = await db
    .update(quotes)
    .set({
      planId: plan.id,
      interval: input.interval,
      amountCents: input.amountCents,
      validUntil: input.validUntil ?? new Date(now.getTime() + jours(facturation.joursDeValiditeOffre)),
      conditions: input.conditions ?? facturation.conditionsParDefaut,
      internalNote: input.internalNote ?? quote.internalNote,
      status: "envoye",
      sentAt: now,
      declinedAt: null,
      updatedAt: now,
    })
    .where(eq(quotes.id, quote.id))
    .returning();
  return maj;
}

export async function declineQuote(token: string) {
  const quote = await getQuoteByToken(token);
  if (!quote) throw new QuoteError("Offre introuvable.");
  if (quote.status === "accepte") throw new QuoteError("Cette offre a déjà été acceptée.");
  const now = new Date();
  await db.update(quotes).set({ status: "refuse", declinedAt: now, updatedAt: now }).where(eq(quotes.id, quote.id));
}

/* ------------------------------------------------------------ Acceptation -- */

export type AcceptQuoteInput = {
  token: string;
  purchaseOrder: string;
  password: string;
  /** L'adresse de facturation, si elle diffère de celle de la demande. */
  billName?: string | null;
  billStreet?: string | null;
  billZip?: string | null;
  billCity?: string | null;
  billIde?: string | null;
};

/**
 * Le client accepte : c'est là que tout se crée d'un coup, dans une seule
 * transaction. Un abonnement à moitié créé avec une facture manquante serait
 * pire qu'un refus — la commune aurait engagé la dépense sans rien recevoir.
 *
 * Le compte est créé si l'adresse du contact ne correspond à personne. Si elle
 * correspond déjà à un compte, l'abonnement s'y rattache : on ne demande pas à
 * quelqu'un de gérer deux comptes parce qu'il a commandé deux fois.
 */
export async function acceptQuote(input: AcceptQuoteInput): Promise<{
  quote: Quote;
  invoice: Invoice;
  plan: Plan;
  compteCree: boolean;
}> {
  const quote = await getQuoteByToken(input.token);
  if (!quote) throw new QuoteError("Offre introuvable.");
  if (quote.status === "accepte") throw new QuoteError("Cette offre a déjà été acceptée.");
  if (quote.status === "expire") throw new QuoteError("Cette offre a dépassé sa date de validité. Demandez-nous une offre à jour.");
  if (quote.status !== "envoye") throw new QuoteError("Cette offre n'est pas encore disponible.");
  if (!quote.planId || quote.amountCents <= 0) throw new QuoteError("Cette offre n'est pas chiffrée.");
  if (!input.purchaseOrder.trim()) throw new QuoteError("Indiquez votre numéro de bon de commande.");

  const plan = await db.query.plans.findFirst({ where: eq(plans.id, quote.planId) });
  if (!plan) throw new QuoteError("La formule de cette offre n'existe plus.");

  const email = quote.contactEmail.toLowerCase();
  const existant = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!existant && input.password.length < 8) {
    throw new QuoteError("Choisissez un mot de passe d'au moins 8 caractères pour votre espace client.");
  }
  const motDePasseHache = existant ? null : await hashPassword(input.password);

  const now = new Date();
  const fin = addInterval(now, quote.interval);
  const echeance = new Date(now.getTime() + jours(facturation.joursDePaiement));

  return db.transaction(async (tx) => {
    // 1. Le compte
    let userId = existant?.id;
    if (!userId) {
      userId = randomUUID();
      await tx.insert(users).values({
        id: userId,
        email,
        passwordHash: motDePasseHache!,
        firstName: quote.contactFirstName,
        lastName: quote.contactLastName,
        phone: quote.contactPhone,
        role: "member",
        createdAt: now,
      });
    }

    // 2. L'abonnement, facturé et non prélevé
    const subscriptionId = randomUUID();
    await tx.insert(subscriptions).values({
      id: subscriptionId,
      userId,
      planId: plan.id,
      interval: quote.interval,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: fin,
      billingMode: "invoice",
      seats: quote.seats,
      createdAt: now,
      updatedAt: now,
    });

    // 3. La facture, ouverte, payable à 30 jours
    const year = now.getFullYear();
    const prefixe = `${facturation.prefixeFacture}-${year}-`;
    const [{ value }] = await tx.select({ value: count() }).from(invoices).where(like(invoices.number, `${prefixe}%`));
    const numero = `${prefixe}${String(value + 1).padStart(4, "0")}`;
    // La référence est calculée une fois et gardée : elle part imprimée chez le
    // client, et c'est elle qui permettra de rapprocher le virement.
    const { reference } = referencePourIban(facturation.iban, numero);

    const [invoice] = await tx
      .insert(invoices)
      .values({
        id: randomUUID(),
        number: numero,
        userId,
        subscriptionId,
        description: `Abonnement ${plan.name} — ${intervalLabel(quote.interval)}`,
        amountCents: quote.amountCents,
        status: "open",
        periodStart: now,
        periodEnd: fin,
        issuedAt: now,
        dueAt: echeance,
        paymentMode: "invoice",
        quoteId: quote.id,
        reference: input.purchaseOrder.trim(),
        qrReference: reference,
        billName: input.billName?.trim() || quote.orgName,
        billStreet: input.billStreet?.trim() || quote.street,
        billZip: input.billZip?.trim() || quote.zip,
        billCity: input.billCity?.trim() || quote.city,
        billCountry: quote.country,
        billIde: input.billIde?.trim() || quote.orgIde,
      })
      .returning();

    // 4. L'offre, close
    const [maj] = await tx
      .update(quotes)
      .set({
        status: "accepte",
        acceptedAt: now,
        purchaseOrder: input.purchaseOrder.trim(),
        userId,
        subscriptionId,
        invoiceId: invoice.id,
        updatedAt: now,
      })
      .where(eq(quotes.id, quote.id))
      .returning();

    return { quote: maj, invoice, plan, compteCree: !existant };
  });
}

/* ------------------------------------------------------------- Encaissement -- */

/** L'argent est arrivé sur le compte : l'administration pointe la facture. */
export async function markInvoicePaid(invoiceId: string) {
  const now = new Date();
  const [maj] = await db
    .update(invoices)
    .set({ status: "paid", paidAt: now })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.status, "open")))
    .returning();
  if (!maj) throw new QuoteError("Facture introuvable ou déjà réglée.");
  return maj;
}

/** Les factures en attente de paiement, les plus anciennes d'abord. */
export async function listOpenInvoices() {
  return db.query.invoices.findMany({
    where: eq(invoices.status, "open"),
    with: { user: true },
    orderBy: [invoices.dueAt],
  });
}
