import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";
import { getCurrentUser, safeNextPath } from "@/lib/auth";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function InscriptionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNextPath(params.next) : undefined;

  const user = await getCurrentUser();
  if (user) redirect(next ?? "/compte");

  return (
    <AuthShell title="Créer un compte." text="Une minute suffit. Vous pourrez ensuite choisir votre formule et gérer votre abonnement en ligne.">
      <RegisterForm next={next} />
    </AuthShell>
  );
}
