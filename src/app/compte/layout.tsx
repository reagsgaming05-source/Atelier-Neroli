import type { Metadata } from "next";
import { SpaceShell } from "@/components/account/space-shell";
import type { SpaceNavItem } from "@/components/account/space-nav";
import { getAccess, isEstablishmentOwner } from "@/lib/access";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Mon espace" };

export default async function CompteLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/compte");
  const access = await getAccess(user);

  const items: SpaceNavItem[] = [
    { href: "/compte", label: "Tableau de bord", icon: "dashboard", exact: true },
    { href: "/compte/abonnement", label: "Abonnement", icon: "subscription" },
    ...(isEstablishmentOwner(access) ? [{ href: "/compte/equipe", label: "Équipe", icon: "members" } as SpaceNavItem] : []),
    { href: "/compte/factures", label: "Factures", icon: "invoices" },
    { href: "/compte/profil", label: "Profil", icon: "profile" },
  ];

  return (
    <SpaceShell eyebrow="Espace client" title={`Bonjour ${user.firstName}`} subtitle="Votre formule, votre licence, vos factures et vos informations, en un seul endroit." items={items}>
      {children}
    </SpaceShell>
  );
}
