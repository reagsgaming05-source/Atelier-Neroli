"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSession, destroySession, safeNextPath } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { ActionState } from "./types";

const registerSchema = z.object({
  firstName: z.string().trim().min(2, "Indiquez votre prénom.").max(60, "Prénom trop long."),
  lastName: z.string().trim().min(2, "Indiquez votre nom.").max(60, "Nom trop long."),
  email: z.email("Adresse e-mail invalide."),
  phone: z.string().trim().max(30, "Numéro trop long.").optional(),
  password: z.string().min(8, "8 caractères minimum.").max(200, "Mot de passe trop long."),
});

const loginSchema = z.object({
  email: z.email("Adresse e-mail invalide."),
  password: z.string().min(1, "Indiquez votre mot de passe."),
});

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    firstName: str(formData, "firstName"),
    lastName: str(formData, "lastName"),
    email: str(formData, "email").trim().toLowerCase(),
    phone: str(formData, "phone"),
    password: str(formData, "password"),
  };
  const values = { firstName: raw.firstName, lastName: raw.lastName, email: raw.email, phone: raw.phone };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  if (existing) {
    return { error: "Un compte existe déjà avec cette adresse e-mail. Connectez-vous.", values };
  }

  const id = randomUUID();
  await db.insert(users).values({
    id,
    email: parsed.data.email,
    passwordHash: await hashPassword(parsed.data.password),
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    phone: parsed.data.phone || null,
    role: "member",
  });
  await createSession(id);

  redirect(safeNextPath(formData.get("next")));
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = { email: str(formData, "email").trim().toLowerCase(), password: str(formData, "password") };
  const values = { email: raw.email };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  const valid = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !valid) {
    return { error: "E-mail ou mot de passe incorrect.", values };
  }

  await createSession(user.id);
  const fallback = user.role === "admin" ? "/admin" : "/compte";
  redirect(safeNextPath(formData.get("next"), fallback));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
