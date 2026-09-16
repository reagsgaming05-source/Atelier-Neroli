import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orgMembers, type SafeUser } from "@/lib/db/schema";
import { fullName } from "@/lib/format";
import { getActiveSubscription, type SubscriptionWithPlan } from "@/lib/subscriptions";

export type Access =
  | { kind: "owner"; subscription: SubscriptionWithPlan }
  | { kind: "member"; subscription: SubscriptionWithPlan; owner: { id: string; name: string } }
  | { kind: "none" };

/**
 * Droit d'utilisation effectif : abonnement propre, ou licence Établissement
 * d'un titulaire auquel la personne est rattachée.
 */
export async function getAccess(user: Pick<SafeUser, "id">): Promise<Access> {
  const own = await getActiveSubscription(user.id);
  if (own) return { kind: "owner", subscription: own };

  const membership = await db.query.orgMembers.findFirst({
    where: and(eq(orgMembers.userId, user.id), eq(orgMembers.status, "active")),
    with: { owner: true },
  });
  if (!membership?.owner) return { kind: "none" };

  const ownerSub = await getActiveSubscription(membership.ownerUserId);
  if (!ownerSub || ownerSub.plan.slug !== "etablissement") return { kind: "none" };

  return { kind: "member", subscription: ownerSub, owner: { id: membership.owner.id, name: fullName(membership.owner) } };
}

export function isEstablishmentOwner(access: Access): access is Extract<Access, { kind: "owner" }> {
  return access.kind === "owner" && access.subscription.plan.slug === "etablissement";
}
