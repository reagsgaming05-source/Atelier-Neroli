"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { contactMessages, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { enregistrerLicence } from "@/lib/licences";
import { dire, envoyer, urlDuSite } from "@/lib/mail";
import { editeur } from "@/content/editeur";
import type { ActionState } from "@/lib/actions/types";

export async function toggleMessageReadAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  const read = formData.get("read") === "1";
  if (typeof id !== "string") return;
  await db.update(contactMessages).set({ readAt: read ? new Date() : null }).where(eq(contactMessages.id, id));
  revalidatePath("/admin/messages");
}

/**
 * Ranger une licence émise hors du site (outils/editeur/emettre-licence.js). Le site la
 * vérifie avant de la garder : un fichier qu'aucune application n'accepterait ne doit pas
 * se retrouver chez un client.
 */
export async function enregistrerLicenceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const corps = String(formData.get("corps") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const remplace = String(formData.get("remplace") ?? "").trim();
  const motif = String(formData.get("motif") ?? "").trim();
  const values = { corps, email, remplace, motif };
  if (!corps) return { error: "Collez le contenu du fichier de licence.", values };

  let userId: string | null = null;
  if (email) {
    const u = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!u) return { error: `Aucun compte client avec l'adresse ${email}. Laissez le champ vide pour ranger la licence sans la rattacher.`, values };
    userId = u.id;
  }
  if (remplace && !motif) return { error: "Une réémission porte son motif (fichier perdu, nouveau nom, renouvellement des mises à jour…).", values };

  const r = await enregistrerLicence({ corps, userId, reason: motif || null, remplace: remplace || null });
  if (!r.ok) return { error: r.raison, values };
  revalidatePath("/admin/licences");
  revalidatePath("/compte");
  // La licence est le produit livré : elle part en pièce jointe, et reste téléchargeable dans l'espace client.
  let courriel = "";
  if (userId) {
    const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (u) {
      const v = await envoyer({
        a: u.email,
        sujet: `Votre licence ${r.number}`,
        texte: [
          `Bonjour ${u.firstName} ${u.lastName},`,
          "",
          `Votre licence ${r.number} est en pièce jointe (licence.json). Posez ce fichier, sans le renommer ni l'ouvrir, à côté de l'exécutable de l'application — une seule fois pour tout le service si l'application est sur un lecteur réseau —, puis relancez l'application. « Aide › À propos » affiche alors votre nom et la date jusqu'à laquelle les mises à jour sont comprises.`,
          `Le fichier reste téléchargeable à tout moment dans votre espace client : ${urlDuSite("/compte")}`,
          "",
          "Cordialement,",
          editeur.nom || "",
        ].join("\n"),
        pieces: [{ nom: "licence.json", contenu: corps }],
      });
      courriel = " " + dire(v, u.email);
    }
  }
  return { success: `Licence ${r.number} enregistrée${userId ? " et rattachée au client : il peut la télécharger dans son espace." : "."}${courriel}` };
}
