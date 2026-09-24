"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { BILLING_INTERVALS, type BillingInterval } from "@/lib/db/schema";
import { chargeCard, validateCard } from "@/lib/payments";
import {
  cancelAtPeriodEnd,
  cancelPendingChange,
  changePlan,
  getActiveSubscription,
  getPlanBySlug,
  planPrice,
  resumeSubscription,
  startSubscription,
  SubscriptionError,
} from "@/lib/subscriptions";
import type { ActionState } from "./types";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function parseInterval(value: string): BillingInterval {
  return (BILLING_INTERVALS as readonly string[]).includes(value) ? (value as BillingInterval) : "month";
}

export async function subscribeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const planSlug = str(formData, "planSlug");
  const interval = parseInterval(str(formData, "interval"));

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/connexion?next=${encodeURIComponent(`/abonnement/${planSlug}/checkout?interval=${interval}`)}`);
  }

  const card = {
    holder: str(formData, "holder"),
    number: str(formData, "number"),
    expiry: str(formData, "expiry"),
    cvc: str(formData, "cvc"),
  };
  const values = { holder: card.holder, number: card.number, expiry: card.expiry };

  const fieldErrors: Record<string, string[]> = {};
  const validation = validateCard(card);
  if (!validation.ok) {
    for (const [key, message] of Object.entries(validation.errors)) {
      if (message) fieldErrors[key] = [message];
    }
  }
  if (formData.get("terms") !== "on") {
    fieldErrors.terms = ["Veuillez accepter les conditions générales pour continuer."];
  }
  if (Object.keys(fieldErrors).length > 0 || !validation.ok) {
    return { fieldErrors, values };
  }

  const plan = await getPlanBySlug(planSlug);
  if (!plan) return { error: "Cette formule n'est plus disponible.", values };

  if (await getActiveSubscription(user.id)) {
    redirect("/compte/abonnement");
  }

  const charge = await chargeCard(card, planPrice(plan, interval));
  if (!charge.ok) return { error: charge.reason, values };

  let invoiceId: string;
  try {
    const result = await startSubscription({ userId: user.id, planSlug, interval, payment: validation.method });
    invoiceId = result.invoice.id;
  } catch (err) {
    if (err instanceof SubscriptionError) return { error: err.message, values };
    throw err;
  }

  revalidatePath("/", "layout");
  redirect(`/abonnement/confirmation?invoice=${invoiceId}`);
}

export async function cancelSubscriptionAction() {
  const user = await requireUser("/compte/abonnement");
  let target = "/compte/abonnement?notice=canceled";
  try {
    await cancelAtPeriodEnd(user.id);
  } catch (err) {
    if (!(err instanceof SubscriptionError)) throw err;
    target = `/compte/abonnement?error=${encodeURIComponent(err.message)}`;
  }
  revalidatePath("/compte", "layout");
  redirect(target);
}

export async function resumeSubscriptionAction() {
  const user = await requireUser("/compte/abonnement");
  let target = "/compte/abonnement?notice=resumed";
  try {
    await resumeSubscription(user.id);
  } catch (err) {
    if (!(err instanceof SubscriptionError)) throw err;
    target = `/compte/abonnement?error=${encodeURIComponent(err.message)}`;
  }
  revalidatePath("/compte", "layout");
  redirect(target);
}

export async function cancelPendingChangeAction() {
  const user = await requireUser("/compte/abonnement");
  let target = "/compte/abonnement?notice=change-canceled";
  try {
    await cancelPendingChange(user.id);
  } catch (err) {
    if (!(err instanceof SubscriptionError)) throw err;
    target = `/compte/abonnement?error=${encodeURIComponent(err.message)}`;
  }
  revalidatePath("/compte", "layout");
  redirect(target);
}

export async function changePlanAction(formData: FormData) {
  const user = await requireUser("/compte/abonnement");
  const planSlug = str(formData, "planSlug");
  const interval = parseInterval(str(formData, "interval"));

  let target: string;
  try {
    const result = await changePlan({ userId: user.id, planSlug, interval });
    target =
      result.effective === "now"
        ? `/compte/abonnement?notice=upgraded&charge=${result.chargeCents}&credit=${result.creditCents}`
        : `/compte/abonnement?notice=scheduled`;
  } catch (err) {
    if (!(err instanceof SubscriptionError)) throw err;
    target = `/compte/abonnement?error=${encodeURIComponent(err.message)}`;
  }
  revalidatePath("/compte", "layout");
  redirect(target);
}
