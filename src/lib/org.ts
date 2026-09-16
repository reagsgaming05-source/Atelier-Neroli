import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orgMembers, users, type OrgMember } from "@/lib/db/schema";

export class OrgError extends Error {}

export async function listOrgMembers(ownerUserId: string) {
  return db.query.orgMembers.findMany({ where: eq(orgMembers.ownerUserId, ownerUserId), orderBy: [asc(orgMembers.invitedAt)] });
}

export async function inviteMember(ownerUserId: string, input: { email: string; name: string; role: OrgMember["role"] }) {
  const email = input.email.trim().toLowerCase();
  const owner = await db.query.users.findFirst({ where: eq(users.id, ownerUserId) });
  if (!owner) throw new OrgError("Compte introuvable.");
  if (owner.email === email) throw new OrgError("Vous êtes déjà titulaire de la licence.");

  const existing = await db.query.orgMembers.findFirst({ where: and(eq(orgMembers.ownerUserId, ownerUserId), eq(orgMembers.email, email)) });
  if (existing) throw new OrgError("Cette personne est déjà invitée.");

  const account = await db.query.users.findFirst({ where: eq(users.email, email) });
  const now = new Date();
  await db.insert(orgMembers).values({
    id: randomUUID(),
    ownerUserId,
    email,
    name: input.name.trim(),
    role: input.role,
    status: account ? "active" : "invited",
    userId: account?.id ?? null,
    invitedAt: now,
    joinedAt: account ? now : null,
  });
  return { linked: Boolean(account) };
}

export async function removeMember(ownerUserId: string, memberId: string) {
  await db.delete(orgMembers).where(and(eq(orgMembers.id, memberId), eq(orgMembers.ownerUserId, ownerUserId)));
}

/** Rattache les invitations en attente à un compte qui vient de se créer ou de se connecter. */
export async function linkInvitations(userId: string, email: string) {
  await db
    .update(orgMembers)
    .set({ userId, status: "active", joinedAt: new Date() })
    .where(and(eq(orgMembers.email, email.toLowerCase()), eq(orgMembers.status, "invited")));
}

/** Identifiants de tous les comptes couverts par une licence Établissement (titulaire inclus). */
export async function orgUserIds(ownerUserId: string) {
  const members = await listOrgMembers(ownerUserId);
  return [ownerUserId, ...members.map((m) => m.userId).filter((id): id is string => Boolean(id))];
}
