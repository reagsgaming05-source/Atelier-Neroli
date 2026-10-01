"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";
import { envoyer } from "@/lib/mail";
import { editeur } from "@/content/editeur";
import type { ActionState } from "./types";

const schema = z.object({
  name: z.string().trim().min(2, "Indiquez votre nom.").max(120),
  email: z.email("Adresse e-mail invalide."),
  phone: z.string().trim().max(30, "Numéro trop long.").optional(),
  subject: z.string().trim().min(2, "Choisissez un sujet.").max(120),
  message: z.string().trim().min(10, "Votre message est un peu court.").max(4000, "Message trop long."),
});

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function contactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Champ anti-robots : doit rester vide.
  if (str(formData, "website")) return { success: "Merci, votre message a bien été envoyé." };

  const raw = {
    name: str(formData, "name"),
    email: str(formData, "email").trim().toLowerCase(),
    phone: str(formData, "phone"),
    subject: str(formData, "subject"),
    message: str(formData, "message"),
  };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw };

  await db.insert(contactMessages).values({
    id: randomUUID(),
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    subject: parsed.data.subject,
    message: parsed.data.message,
  });

  // Prévenir le support : au mieux. Le message est enregistré quoi qu'il arrive, et l'administration le voit.
  const support = editeur.emailSupport || editeur.email;
  if (support) {
    await envoyer({
      a: support,
      repondreA: parsed.data.email,
      sujet: `[Contact] ${parsed.data.subject}`,
      texte: `De : ${parsed.data.name} <${parsed.data.email}>${parsed.data.phone ? `\nTéléphone : ${parsed.data.phone}` : ""}\n\n${parsed.data.message}`,
    }).catch(() => undefined);
  }

  return { success: "Merci, votre message est enregistré. Nous vous répondrons à l'adresse indiquée." };
}
