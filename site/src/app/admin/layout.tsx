import type { Metadata } from "next";
import { count, isNull } from "drizzle-orm";
import { SpaceShell } from "@/components/account/space-shell";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";
import { quoteCounts } from "@/lib/quotes";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [{ unread }] = await db.select({ unread: count() }).from(contactMessages).where(isNull(contactMessages.readAt));
  // Une demande d'offre qui dort est une vente qui s'en va : elle se compte
  // dans la navigation, comme un message non lu.
  const offres = await quoteCounts();

  return (
    <SpaceShell
      eyebrow="Administration"
      title="Blonay PDF"
      subtitle="Offres, clients, abonnements, factures et messages reçus."
      items={[
        { href: "/admin", label: "Vue d'ensemble", icon: "dashboard", exact: true },
        { href: "/admin/offres", label: "Offres", icon: "quotes", badge: offres.demande },
        { href: "/admin/membres", label: "Clients", icon: "members" },
        { href: "/admin/abonnements", label: "Abonnements", icon: "subscriptions" },
        { href: "/admin/factures", label: "Factures", icon: "invoices" },
        { href: "/admin/messages", label: "Messages", icon: "messages", badge: unread },
      ]}
    >
      {children}
    </SpaceShell>
  );
}
