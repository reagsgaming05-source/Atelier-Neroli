"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ORGANISATION_TYPES } from "@/lib/db/schema";
import { createSession, requireAdmin } from "@/lib/auth";
import {
  QuoteError,
  acceptQuote,
  createQuoteRequest,
  declineQuote,
  getQuoteByToken,
  markInvoicePaid,
  sendQuote,
} from "@/lib/quotes";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/password";
import type { ActionState } from "./types";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/* ------------------------------------------------------ Demande d'offre -- */

const demandeSchema = z.object({
  orgType: z.enum(ORGANISATION_TYPES, { message: "Choisissez le type d'organisation." }),
  orgName: z.string().trim().min(2, "Indiquez le nom de votre organisation.").max(160),
  orgIde: z.string().trim().max(30).optional(),
  street: z.string().trim().max(120).optional(),
  zip: z.string().trim().max(12).optional(),
  city: z.string().trim().max(80).optional(),
  contactFirstName: z.string().trim().min(2, "Indiquez votre prénom.").max(60),
  contactLastName: z.string().trim().min(2, "Indiquez votre nom.").max(60),
  contactRole: z.string().trim().max(120).optional(),
  contactEmail: z.email("Adresse e-mail invalide."),
  contactPhone: z.string().trim().max(30).optional(),
  seats: z.coerce.number().int().min(1, "Au moins un poste.").max(100000, "Écrivez-nous plutôt un message."),
  planSlug: z.string().trim().max(40).optional(),
  interval: z.enum(["month", "year"]).optional(),
  message: z.string().trim().max(4000, "Message trop long.").optional(),
});

export async function quoteRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Champ anti-robots : un formulaire public sans compte en attire beaucoup.
  if (str(formData, "website")) return { success: "Merci, votre demande nous est parvenue." };

  const raw = {
    orgType: str(formData, "orgType"),
    orgName: str(formData, "orgName"),
    orgIde: str(formData, "orgIde"),
    street: str(formData, "street"),
    zip: str(formData, "zip"),
    city: str(formData, "city"),
    contactFirstName: str(formData, "contactFirstName"),
    contactLastName: str(formData, "contactLastName"),
    contactRole: str(formData, "contactRole"),
    contactEmail: str(formData, "contactEmail").toLowerCase(),
    contactPhone: str(formData, "contactPhone"),
    seats: str(formData, "seats") || "1",
    planSlug: str(formData, "planSlug"),
    interval: str(formData, "interval") || "year",
    message: str(formData, "message"),
  };

  const parsed = demandeSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw };

  const quote = await createQuoteRequest(parsed.data);
  revalidatePath("/admin/offres");
  return {
    success:
      `Votre demande est enregistrée sous le numéro ${quote.number}. ` +
      "Vous recevez l'offre chiffrée par courriel sous deux jours ouvrables, à l'adresse indiquée.",
  };
}

/* ------------------------------------------- Acceptation par le client -- */

const acceptationSchema = z.object({
  purchaseOrder: z.string().trim().min(1, "Indiquez votre numéro de bon de commande.").max(60),
  password: z.string().max(200).optional(),
  billName: z.string().trim().max(160).optional(),
  billStreet: z.string().trim().max(120).optional(),
  billZip: z.string().trim().max(12).optional(),
  billCity: z.string().trim().max(80).optional(),
  billIde: z.string().trim().max(30).optional(),
});

/**
 * L'acceptation ouvre l'espace client dans la foulée : la personne vient de
 * choisir son mot de passe, lui redemander de se connecter serait une porte de
 * plus pour rien. Si le compte existait déjà, le mot de passe saisi sert à
 * l'identifier — sinon n'importe qui ayant le lien entrerait chez elle.
 */
export async function acceptQuoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = str(formData, "token");
  const raw = {
    purchaseOrder: str(formData, "purchaseOrder"),
    password: str(formData, "password"),
    billName: str(formData, "billName"),
    billStreet: str(formData, "billStreet"),
    billZip: str(formData, "billZip"),
    billCity: str(formData, "billCity"),
    billIde: str(formData, "billIde"),
  };
  const parsed = acceptationSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw };

  const quote = await getQuoteByToken(token);
  if (!quote) return { error: "Cette offre est introuvable." };

  const existant = await db.query.users.findFirst({ where: eq(users.email, quote.contactEmail.toLowerCase()) });
  if (existant) {
    const ok = await verifyPassword(parsed.data.password ?? "", existant.passwordHash);
    if (!ok) {
      return {
        error: "Un espace client existe déjà pour cette adresse. Saisissez son mot de passe pour confirmer la commande.",
        values: { ...raw, password: "" },
        fieldErrors: { password: ["Mot de passe incorrect."] },
      };
    }
  }

  let invoiceId: string;
  let userId: string;
  try {
    const r = await acceptQuote({ token, ...parsed.data, password: parsed.data.password ?? "" });
    invoiceId = r.invoice.id;
    userId = r.quote.userId!;
  } catch (e) {
    if (e instanceof QuoteError) return { error: e.message, values: { ...raw, password: "" } };
    throw e;
  }

  await createSession(userId);
  revalidatePath("/admin/offres");
  redirect(`/compte/factures/${invoiceId}?commande=1`);
}

export async function declineQuoteAction(formData: FormData) {
  const token = str(formData, "token");
  try {
    await declineQuote(token);
  } catch {
    /* une offre déjà close ne se refuse plus : rien à signaler au visiteur */
  }
  revalidatePath(`/offre/${token}`);
  revalidatePath("/admin/offres");
}

/* -------------------------------------------------- Côté administration -- */

const envoiSchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1, "Choisissez une formule."),
  interval: z.enum(["month", "year"]),
  /** Saisi en francs, gardé en centimes. */
  amount: z.coerce.number().positive("Indiquez un montant.").max(10_000_000),
  validUntil: z.string().trim().optional(),
  conditions: z.string().trim().max(2000).optional(),
  internalNote: z.string().trim().max(2000).optional(),
});

export async function sendQuoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const raw = {
    id: str(formData, "id"),
    planId: str(formData, "planId"),
    interval: str(formData, "interval") || "year",
    amount: str(formData, "amount"),
    validUntil: str(formData, "validUntil"),
    conditions: str(formData, "conditions"),
    internalNote: str(formData, "internalNote"),
  };
  const parsed = envoiSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw };

  let id: string;
  try {
    const quote = await sendQuote({
      id: parsed.data.id,
      planId: parsed.data.planId,
      interval: parsed.data.interval,
      amountCents: Math.round(parsed.data.amount * 100),
      validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
      conditions: parsed.data.conditions || null,
      internalNote: parsed.data.internalNote || null,
    });
    id = quote.id;
    revalidatePath("/admin/offres");
    revalidatePath(`/offre/${quote.token}`);
  } catch (e) {
    if (e instanceof QuoteError) return { error: e.message, values: raw };
    throw e;
  }
  // Une fois chiffrée, l'offre quitte la liste « à chiffrer » : le formulaire
  // qui portait le message de réussite est démonté avec elle, et le lien à
  // transmettre — la seule chose dont l'administration a besoin ensuite —
  // disparaissait avec lui. On renvoie donc sur la page, qui le montre.
  redirect(`/admin/offres?envoyee=${id}`);
}

export async function markPaidAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "invoiceId");
  try {
    await markInvoicePaid(id);
  } catch {
    /* déjà pointée par quelqu'un d'autre : le résultat voulu est atteint */
  }
  revalidatePath("/admin/factures");
  revalidatePath("/admin/offres");
}
