import type { Metadata } from "next";
import { SpaceShell } from "@/components/account/space-shell";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Mon espace" };

export default async function CompteLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/compte");

  return (
    <SpaceShell
      eyebrow="Espace client"
      title={`Bonjour ${user.firstName}`}
      subtitle="Votre formule, votre licence, vos factures et vos informations, en un seul endroit."
      items={[
        { href: "/compte", label: "Tableau de bord", icon: "dashboard", exact: true },
        { href: "/compte/abonnement", label: "Abonnement", icon: "subscription" },
        { href: "/compte/factures", label: "Factures", icon: "invoices" },
        { href: "/compte/profil", label: "Profil", icon: "profile" },
      ]}
    >
      {children}
    </SpaceShell>
  );
}
