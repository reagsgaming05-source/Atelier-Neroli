import { randomUUID } from "node:crypto";
import { and, count, desc, eq, like, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  invoices,
  plans,
  subscriptions,
  type BillingInterval,
  type Invoice,
  type Plan,
  type Subscription,
} from "@/lib/db/schema";
import type { PaymentMethod } from "@/lib/payments";
import { intervalLabel } from "@/lib/format";

export class SubscriptionError extends Error {}

export type SubscriptionWithPlan = Subscription & { plan: Plan; pendingPlan: Plan | null };

/* ---------- Helpers de calcul ---------- */

export function addInterval(date: Date, interval: BillingInterval) {
  const d = new Date(date);
  if (interval === "month") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

export function planPrice(plan: Plan, interval: BillingInterval) {
  return interval === "month" ? plan.priceMonthlyCents : plan.priceYearlyCents;
}

/** Prix ramené au mois, pour comparer deux formules quel que soit l'intervalle. */
export function monthlyEquivalent(plan: Plan, interval: BillingInterval) {
  return interval === "month" ? plan.priceMonthlyCents : Math.round(plan.priceYearlyCents / 12);
}

export function yearlySavings(plan: Plan) {
  return plan.priceMonthlyCents * 12 - plan.priceYearlyCents;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function nextInvoiceNumber(tx: Tx) {
  const year = new Date().getFullYear();
  const [{ value }] = await tx
    .select({ value: count() })
    .from(invoices)
    .where(like(invoices.number, `AN-${year}-%`));
  return `AN-${year}-${String(value + 1).padStart(4, "0")}`;
}

async function insertInvoice(
  tx: Tx,
  data: {
    userId: string;
    subscriptionId: string | null;
    description: string;
    amountCents: number;
    periodStart: Date | null;
    periodEnd: Date | null;
    payment: PaymentMethod | null;
    issuedAt?: Date;
  },
): Promise<Invoice> {
  const number = await nextInvoiceNumber(tx);
  const issuedAt = data.issuedAt ?? new Date();
  const [invoice] = await tx
    .insert(invoices)
    .values({
      id: randomUUID(),
      number,
      userId: data.userId,
      subscriptionId: data.subscriptionId,
      description: data.description,
      amountCents: data.amountCents,
      status: "paid",
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      issuedAt,
      paidAt: issuedAt,
      paymentBrand: data.payment?.brand ?? null,
      paymentLast4: data.payment?.last4 ?? null,
    })
    .returning();
  return invoice;
}

/* ---------- Lecture ---------- */

export async function listActivePlans() {
  return db.query.plans.findMany({ where: eq(plans.active, true), orderBy: [plans.sortOrder] });
}

export async function getPlanBySlug(slug: string) {
  return db.query.plans.findFirst({ where: and(eq(plans.slug, slug), eq(plans.active, true)) });
}

/** Abonnement actif d'un membre, après application des renouvellements échus. */
export async function getActiveSubscription(userId: string): Promise<SubscriptionWithPlan | null> {
  await reconcileSubscriptions(userId);
  const sub = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")),
    with: { plan: true, pendingPlan: true },
  });
  return (sub as SubscriptionWithPlan | undefined) ?? null;
}

export async function listUserInvoices(userId: string) {
  return db.query.invoices.findMany({ where: eq(invoices.userId, userId), orderBy: [desc(invoices.issuedAt)] });
}

export async function getUserInvoice(userId: string, invoiceId: string) {
  return db.query.invoices.findFirst({
    where: and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)),
    with: { subscription: { with: { plan: true } } },
  });
}

/* ---------- Écriture ---------- */

export async function startSubscription(input: {
  userId: string;
  planSlug: string;
  interval: BillingInterval;
  payment: PaymentMethod;
}) {
  const plan = await getPlanBySlug(input.planSlug);
  if (!plan) throw new SubscriptionError("Cette formule n'est plus disponible.");

  const existing = await getActiveSubscription(input.userId);
  if (existing) throw new SubscriptionError("Vous avez déjà un abonnement actif. Gérez-le depuis votre espace.");

  const now = new Date();
  const end = addInterval(now, input.interval);
  const subscriptionId = randomUUID();

  return db.transaction(async (tx) => {
    const [subscription] = await tx
      .insert(subscriptions)
      .values({
        id: subscriptionId,
        userId: input.userId,
        planId: plan.id,
        interval: input.interval,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: end,
        paymentBrand: input.payment.brand,
        paymentLast4: input.payment.last4,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const invoice = await insertInvoice(tx, {
      userId: input.userId,
      subscriptionId,
      description: `Abonnement ${plan.name} — ${intervalLabel(input.interval)}`,
      amountCents: planPrice(plan, input.interval),
      periodStart: now,
      periodEnd: end,
      payment: input.payment,
      issuedAt: now,
    });

    return { subscription, invoice, plan };
  });
}

export async function cancelAtPeriodEnd(userId: string) {
  const sub = await getActiveSubscription(userId);
  if (!sub) throw new SubscriptionError("Aucun abonnement actif.");
  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: true, canceledAt: new Date(), pendingPlanId: null, pendingInterval: null, updatedAt: new Date() })
    .where(eq(subscriptions.id, sub.id));
}

export async function resumeSubscription(userId: string) {
  const sub = await getActiveSubscription(userId);
  if (!sub) throw new SubscriptionError("Aucun abonnement actif.");
  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: false, canceledAt: null, updatedAt: new Date() })
    .where(eq(subscriptions.id, sub.id));
}

export async function cancelPendingChange(userId: string) {
  const sub = await getActiveSubscription(userId);
  if (!sub) throw new SubscriptionError("Aucun abonnement actif.");
  await db
    .update(subscriptions)
    .set({ pendingPlanId: null, pendingInterval: null, updatedAt: new Date() })
    .where(eq(subscriptions.id, sub.id));
}

export type PlanChangeResult =
  | { effective: "now"; chargeCents: number; creditCents: number; invoice: Invoice }
  | { effective: "period_end"; date: Date };

/**
 * Montée en gamme : immédiate, avec crédit au prorata de la période restante.
 * Descente en gamme : programmée à la prochaine échéance.
 */
export async function changePlan(input: {
  userId: string;
  planSlug: string;
  interval: BillingInterval;
}): Promise<PlanChangeResult> {
  const sub = await getActiveSubscription(input.userId);
  if (!sub) throw new SubscriptionError("Aucun abonnement actif.");
  const newPlan = await getPlanBySlug(input.planSlug);
  if (!newPlan) throw new SubscriptionError("Cette formule n'est plus disponible.");
  if (newPlan.id === sub.planId && input.interval === sub.interval) {
    throw new SubscriptionError("Vous êtes déjà sur cette formule.");
  }

  const now = new Date();
  const currentMonthly = monthlyEquivalent(sub.plan, sub.interval);
  const newMonthly = monthlyEquivalent(newPlan, input.interval);
  const isUpgrade = newMonthly > currentMonthly;

  if (!isUpgrade) {
    await db
      .update(subscriptions)
      .set({ pendingPlanId: newPlan.id, pendingInterval: input.interval, cancelAtPeriodEnd: false, canceledAt: null, updatedAt: now })
      .where(eq(subscriptions.id, sub.id));
    return { effective: "period_end", date: sub.currentPeriodEnd };
  }

  const periodLength = sub.currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime();
  const remaining = Math.max(0, sub.currentPeriodEnd.getTime() - now.getTime());
  const creditCents = periodLength > 0 ? Math.round((planPrice(sub.plan, sub.interval) * remaining) / periodLength) : 0;
  const chargeCents = Math.max(0, planPrice(newPlan, input.interval) - creditCents);
  const end = addInterval(now, input.interval);
  const payment: PaymentMethod | null =
    sub.paymentBrand && sub.paymentLast4 ? { brand: sub.paymentBrand, last4: sub.paymentLast4 } : null;

  return db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({
        planId: newPlan.id,
        interval: input.interval,
        currentPeriodStart: now,
        currentPeriodEnd: end,
        pendingPlanId: null,
        pendingInterval: null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, sub.id));

    const invoice = await insertInvoice(tx, {
      userId: input.userId,
      subscriptionId: sub.id,
      description: `Passage à ${newPlan.name} (${intervalLabel(input.interval)}) — crédit prorata déduit`,
      amountCents: chargeCents,
      periodStart: now,
      periodEnd: end,
      payment,
      issuedAt: now,
    });
    return { effective: "now", chargeCents, creditCents, invoice };
  });
}

/* ---------- Renouvellements (exécutés à la demande, sans tâche planifiée) ---------- */

/**
 * Applique les échéances passées : clôture, changement de formule programmé,
 * puis renouvellement avec facture. Idempotent.
 */
export async function reconcileSubscriptions(userId?: string) {
  const now = new Date();
  const due = await db.query.subscriptions.findMany({
    where: and(
      eq(subscriptions.status, "active"),
      lte(subscriptions.currentPeriodEnd, now),
      ...(userId ? [eq(subscriptions.userId, userId)] : []),
    ),
    with: { plan: true, pendingPlan: true },
  });

  for (const sub of due) {
    await db.transaction(async (tx) => {
      let planForPeriod: Plan = sub.plan;
      let interval: BillingInterval = sub.interval;
      let periodStart = sub.currentPeriodStart;
      let periodEnd = sub.currentPeriodEnd;
      let ended = false;

      while (periodEnd <= now) {
        if (sub.cancelAtPeriodEnd) {
          ended = true;
          break;
        }
        if (sub.pendingPlan && sub.pendingInterval) {
          planForPeriod = sub.pendingPlan;
          interval = sub.pendingInterval;
          sub.pendingPlan = null;
          sub.pendingInterval = null;
        }
        periodStart = periodEnd;
        periodEnd = addInterval(periodStart, interval);
        await insertInvoice(tx, {
          userId: sub.userId,
          subscriptionId: sub.id,
          description: `Renouvellement ${planForPeriod.name} — ${intervalLabel(interval)}`,
          amountCents: planPrice(planForPeriod, interval),
          periodStart,
          periodEnd,
          payment: sub.paymentBrand && sub.paymentLast4 ? { brand: sub.paymentBrand, last4: sub.paymentLast4 } : null,
          issuedAt: periodStart,
        });
      }

      if (ended) {
        await tx
          .update(subscriptions)
          .set({ status: "canceled", endedAt: sub.currentPeriodEnd, updatedAt: now })
          .where(eq(subscriptions.id, sub.id));
      } else {
        await tx
          .update(subscriptions)
          .set({
            planId: planForPeriod.id,
            interval,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            pendingPlanId: null,
            pendingInterval: null,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, sub.id));
      }
    });
  }
}
