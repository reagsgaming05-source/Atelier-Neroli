import type { Metadata } from "next";
import { count, isNull } from "drizzle-orm";
import { SpaceShell } from "@/components/account/space-shell";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [{ unread }] = await db.select({ unread: count() }).from(contactMessages).where(isNull(contactMessages.readAt));

  return (
    <SpaceShell
      eyebrow="Administration"
      title="Blonay PDF"
      subtitle="Clients, abonnements, factures et messages reçus."
      items={[
        { href: "/admin", label: "Vue d'ensemble", icon: "dashboard", exact: true },
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
