import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";
import { getCurrentUser, safeNextPath } from "@/lib/auth";

export const metadata: Metadata = { title: "Connexion" };

export default async function ConnexionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNextPath(params.next) : undefined;

  const user = await getCurrentUser();
  if (user) redirect(next ?? (user.role === "admin" ? "/admin" : "/compte"));

  return (
    <AuthShell title="Bon retour." text="Connectez-vous pour accéder à votre abonnement, vos factures et vos avantages.">
      <LoginForm next={next} />
    </AuthShell>
  );
}
