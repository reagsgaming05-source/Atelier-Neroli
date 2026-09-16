"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction } from "@/lib/actions/profile";
import type { ActionState } from "@/lib/actions/types";
import { Field, FormError, FormSuccess } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function ProfileForm({ user }: { user: { firstName: string; lastName: string; email: string; phone: string | null } }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateProfileAction, {});
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Prénom" name="firstName" autoComplete="given-name" defaultValue={v.firstName ?? user.firstName} error={fe.firstName?.[0]} required />
        <Field label="Nom" name="lastName" autoComplete="family-name" defaultValue={v.lastName ?? user.lastName} error={fe.lastName?.[0]} required />
      </div>
      <Field label="E-mail" name="email" type="email" defaultValue={user.email} disabled hint="Pour changer d'adresse e-mail, contactez l'atelier." />
      <Field label="Téléphone" name="phone" type="tel" autoComplete="tel" defaultValue={v.phone ?? user.phone ?? ""} error={fe.phone?.[0]} />
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(changePasswordAction, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <Field label="Mot de passe actuel" name="current" type="password" autoComplete="current-password" error={fe.current?.[0]} required />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" error={fe.password?.[0]} hint="8 caractères minimum." required />
        <Field label="Confirmation" name="confirm" type="password" autoComplete="new-password" error={fe.confirm?.[0]} required />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Modification…" : "Modifier le mot de passe"}
      </Button>
    </form>
  );
}
