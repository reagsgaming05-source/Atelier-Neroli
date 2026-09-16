"use client";

import { useActionState } from "react";
import { contactAction } from "@/lib/actions/contact";
import type { ActionState } from "@/lib/actions/types";
import { Field, FormError, FormSuccess, SelectField, TextareaField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const subjects = ["Réserver un soin", "Question sur les abonnements", "Offrir une carte cadeau", "Ateliers senteurs", "Autre demande"];

export function ContactForm({ defaultSubject, defaultMessage }: { defaultSubject?: string; defaultMessage?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(contactAction, {});
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};

  if (state.success) {
    return (
      <div className="card p-8">
        <FormSuccess message={state.success} />
        <p className="mt-4 text-sm text-ink-500">Pour une réservation urgente, appelez-nous directement pendant les heures d'ouverture.</p>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-5 p-8" noValidate>
      <FormError message={state.error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nom complet" name="name" autoComplete="name" defaultValue={v.name} error={fe.name?.[0]} required />
        <Field label="E-mail" name="email" type="email" autoComplete="email" defaultValue={v.email} error={fe.email?.[0]} required />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Téléphone (facultatif)" name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} error={fe.phone?.[0]} />
        <SelectField label="Sujet" name="subject" defaultValue={v.subject ?? defaultSubject ?? subjects[0]} error={fe.subject?.[0]}>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
      </div>
      <TextareaField label="Message" name="message" defaultValue={v.message ?? defaultMessage} error={fe.message?.[0]} required />
      <div className="hidden" aria-hidden>
        <label htmlFor="website">Site web</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Envoi…" : "Envoyer le message"}
      </Button>
    </form>
  );
}
