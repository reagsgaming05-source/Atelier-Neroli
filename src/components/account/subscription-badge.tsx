import { Badge } from "@/components/ui/badge";
import type { Subscription } from "@/lib/db/schema";

export function SubscriptionBadge({ subscription }: { subscription: Pick<Subscription, "status" | "cancelAtPeriodEnd"> | null }) {
  if (!subscription || subscription.status !== "active") return <Badge tone="gray">Sans abonnement</Badge>;
  if (subscription.cancelAtPeriodEnd) return <Badge tone="amber">Résiliation programmée</Badge>;
  return <Badge tone="green">Actif</Badge>;
}
