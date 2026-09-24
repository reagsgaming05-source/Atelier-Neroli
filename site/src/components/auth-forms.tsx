"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction } from "@/lib/actions/auth";
import type { ActionState } from "@/lib/actions/types";
import { Field, FormError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, {});
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <FormError message={state.error} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" defaultValue={v.email} error={fe.email?.[0]} required autoFocus />
      <Field label="Mot de passe" name="password" type="password" autoComplete="current-password" error={fe.password?.[0]} required />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
      <p className="text-center text-sm text-ink-500">
        Pas encore de compte ?{" "}
        <Link href={next ? `/inscription?next=${encodeURIComponent(next)}` : "/inscription"} className="font-semibold text-brand-700 hover:text-brand-900">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(registerAction, {});
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <FormError message={state.error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Prénom" name="firstName" autoComplete="given-name" defaultValue={v.firstName} error={fe.firstName?.[0]} required autoFocus />
        <Field label="Nom" name="lastName" autoComplete="family-name" defaultValue={v.lastName} error={fe.lastName?.[0]} required />
      </div>
      <Field label="E-mail" name="email" type="email" autoComplete="email" defaultValue={v.email} error={fe.email?.[0]} required />
      <Field label="Téléphone (facultatif)" name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} error={fe.phone?.[0]} hint="Utile pour confirmer vos rendez-vous." />
      <Field label="Mot de passe" name="password" type="password" autoComplete="new-password" error={fe.password?.[0]} hint="8 caractères minimum." required />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Création du compte…" : "Créer mon compte"}
      </Button>
      <p className="text-center text-sm text-ink-500">
        Déjà membre ?{" "}
        <Link href={next ? `/connexion?next=${encodeURIComponent(next)}` : "/connexion"} className="font-semibold text-brand-700 hover:text-brand-900">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
