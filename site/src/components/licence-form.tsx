"use client";

import { useActionState } from "react";
import { enregistrerLicenceAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/actions/types";
import { Field, FormError, FormSuccess, TextareaField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function LicenceForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(enregistrerLicenceAction, {});
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <TextareaField label="Fichier de licence signé (le contenu de BLP-….licence.json)" name="corps" defaultValue={v.corps} required />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Adresse du compte client (facultatif)" name="email" type="email" defaultValue={v.email} />
        <Field label="Numéro remplacé, si c'est une réémission" name="remplace" defaultValue={v.remplace} />
      </div>
      <Field label="Motif de la réémission" name="motif" defaultValue={v.motif} />
      <Button type="submit" disabled={pending}>
        {pending ? "Vérification…" : "Vérifier et enregistrer"}
      </Button>
    </form>
  );
}
