import type { Metadata } from "next";
import { PasswordForm, ProfileForm } from "@/components/account/profile-forms";
import { Panel } from "@/components/account/space-shell";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Mon profil" };

export default async function ProfilPage() {
  const user = await requireUser("/compte/profil");

  return (
    <>
      <Panel title="Informations personnelles">
        <ProfileForm user={{ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone }} />
      </Panel>
      <Panel title="Mot de passe">
        <PasswordForm />
      </Panel>
    </>
  );
}
