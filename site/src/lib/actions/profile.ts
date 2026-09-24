"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { ActionState } from "./types";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

const profileSchema = z.object({
  firstName: z.string().trim().min(2, "Indiquez votre prénom.").max(60),
  lastName: z.string().trim().min(2, "Indiquez votre nom.").max(60),
  phone: z.string().trim().max(30, "Numéro trop long.").optional(),
});

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/compte/profil");
  const raw = { firstName: str(formData, "firstName"), lastName: str(formData, "lastName"), phone: str(formData, "phone") };
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw };

  await db
    .update(users)
    .set({ firstName: parsed.data.firstName, lastName: parsed.data.lastName, phone: parsed.data.phone || null })
    .where(eq(users.id, user.id));

  revalidatePath("/", "layout");
  return { success: "Vos informations ont été enregistrées.", values: raw };
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Indiquez votre mot de passe actuel."),
    password: z.string().min(8, "8 caractères minimum.").max(200),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], error: "Les deux mots de passe ne correspondent pas." });

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/compte/profil");
  const raw = { current: str(formData, "current"), password: str(formData, "password"), confirm: str(formData, "confirm") };
  const parsed = passwordSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const row = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (!row || !(await verifyPassword(parsed.data.current, row.passwordHash))) {
    return { fieldErrors: { current: ["Mot de passe actuel incorrect."] } };
  }

  await db.update(users).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(users.id, user.id));
  return { success: "Votre mot de passe a été modifié." };
}
