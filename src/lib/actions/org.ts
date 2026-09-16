"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getAccess, isEstablishmentOwner } from "@/lib/access";
import { inviteMember, OrgError, removeMember } from "@/lib/org";
import type { ActionState } from "./types";

const inviteSchema = z.object({
  name: z.string().trim().min(2, "Indiquez le nom de la personne.").max(120),
  email: z.email("Adresse e-mail invalide."),
  role: z.enum(["administration", "collaborateur"]),
});

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function inviteMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/compte/equipe");
  const access = await getAccess(user);
  if (!isEstablishmentOwner(access)) return { error: "Les invitations sont réservées aux licences Établissement." };

  const raw = { name: str(formData, "name"), email: str(formData, "email").trim().toLowerCase(), role: str(formData, "role") || "collaborateur" };
  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw };

  try {
    const { linked } = await inviteMember(user.id, parsed.data);
    revalidatePath("/compte/equipe");
    return {
      success: linked
        ? `${parsed.data.name} disposait déjà d'un compte : l'accès est actif immédiatement.`
        : `Invitation enregistrée pour ${parsed.data.name}. L'accès s'activera dès la création de son compte avec cette adresse.`,
    };
  } catch (err) {
    if (err instanceof OrgError) return { error: err.message, values: raw };
    throw err;
  }
}

export async function removeMemberAction(formData: FormData) {
  const user = await requireUser("/compte/equipe");
  const id = formData.get("id");
  if (typeof id === "string") await removeMember(user.id, id);
  revalidatePath("/compte/equipe");
}
