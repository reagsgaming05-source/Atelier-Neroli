"use client";

import { useActionState } from "react";
import { inviteMemberAction } from "@/lib/actions/org";
import type { ActionState } from "@/lib/actions/types";
import { Field, FormError, FormSuccess, SelectField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function InviteForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(inviteMemberAction, {});
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <div className="grid gap-4 sm:grid-cols-[1fr_1.2fr_auto_auto] sm:items-end">
        <Field label="Nom" name="name" defaultValue={v.name} error={fe.name?.[0]} placeholder="Prénom Nom" required />
        <Field label="E-mail" name="email" type="email" defaultValue={v.email} error={fe.email?.[0]} placeholder="prenom.nom@eduvaud.ch" required />
        <SelectField label="Rôle" name="role" defaultValue={v.role ?? "collaborateur"}>
          <option value="collaborateur">Collaborateur·trice</option>
          <option value="administration">Administration</option>
        </SelectField>
        <Button type="submit" disabled={pending} className="sm:mb-0">
          {pending ? "Envoi…" : "Inviter"}
        </Button>
      </div>
    </form>
  );
}
