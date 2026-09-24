"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { quoteRequestAction } from "@/lib/actions/quote";
import type { ActionState } from "@/lib/actions/types";
import { Field, FormError, SelectField, TextareaField } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ORGANISATION_TYPES, type OrganisationType } from "@/content/segments";

type PlanChoice = { slug: string; name: string; quoteOnly: boolean };

/**
 * Demander une offre, sans créer de compte.
 *
 * C'est le premier geste d'une secrétaire municipale qui a dix minutes entre
 * deux séances : on ne lui demande donc ni mot de passe, ni carte, ni rien
 * qu'elle doive aller chercher. Le strict nécessaire pour établir un devis
 * nominatif — et l'IDE, qu'une comptabilité publique veut voir sur sa facture.
 */
export function QuoteRequestForm({
  plans,
  defaultOrgType = "commune",
  defaultPlanSlug,
}: {
  plans: PlanChoice[];
  defaultOrgType?: OrganisationType;
  defaultPlanSlug?: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(quoteRequestAction, {});
  const [orgType, setOrgType] = useState<string>(defaultOrgType);
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};

  if (state.success) {
    return (
      <div className="card p-8">
        <CheckCircle2 className="size-10 text-brand-700" aria-hidden />
        <h2 className="mt-4 font-display text-2xl font-semibold text-ink-900">Demande enregistrée</h2>
        <p className="mt-3 text-ink-500">{state.success}</p>
        <p className="mt-6 text-sm text-ink-500">
          Entre-temps, vous pouvez{" "}
          <Link href="/demo" className="font-semibold text-brand-700 hover:text-brand-900">
            essayer l&rsquo;outil dans votre navigateur
          </Link>{" "}
          : aucun fichier n&rsquo;est envoyé.
        </p>
      </div>
    );
  }

  const nomOrganisation =
    orgType === "commune" ? "Nom de la commune" : orgType === "ecole" ? "Nom de l'établissement" : "Nom du service";

  return (
    <form action={action} className="card space-y-6 p-8" noValidate>
      <FormError message={state.error} />

      <fieldset className="space-y-5">
        <legend className="font-display text-lg font-semibold text-ink-900">Votre organisation</legend>
        <SelectField
          label="Type d'organisation"
          name="orgType"
          defaultValue={v.orgType ?? defaultOrgType}
          onChange={(e) => setOrgType(e.currentTarget.value)}
          error={fe.orgType?.[0]}
        >
          {ORGANISATION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </SelectField>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={nomOrganisation} name="orgName" defaultValue={v.orgName} error={fe.orgName?.[0]} required />
          <Field
            label="IDE (facultatif)"
            name="orgIde"
            placeholder="CHE-123.456.789"
            defaultValue={v.orgIde}
            error={fe.orgIde?.[0]}
            hint="Nous le reportons sur la facture si vous nous le donnez."
          />
        </div>
        <Field label="Adresse (facultatif)" name="street" defaultValue={v.street} error={fe.street?.[0]} />
        <div className="grid gap-5 sm:grid-cols-[1fr_2fr]">
          <Field label="NPA" name="zip" inputMode="numeric" defaultValue={v.zip} error={fe.zip?.[0]} />
          <Field label="Localité" name="city" defaultValue={v.city} error={fe.city?.[0]} />
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-line pt-6">
        <legend className="font-display text-lg font-semibold text-ink-900">Votre besoin</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Nombre de postes"
            name="seats"
            type="number"
            min={1}
            defaultValue={v.seats ?? "1"}
            error={fe.seats?.[0]}
            required
            hint="Une estimation suffit."
          />
          <SelectField label="Formule envisagée" name="planSlug" defaultValue={v.planSlug ?? defaultPlanSlug ?? ""} error={fe.planSlug?.[0]}>
            <option value="">Je ne sais pas encore</option>
            {plans.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
                {p.quoteOnly ? " (sur devis)" : ""}
              </option>
            ))}
          </SelectField>
        </div>
        <SelectField label="Périodicité souhaitée" name="interval" defaultValue={v.interval ?? "year"} error={fe.interval?.[0]}>
          <option value="year">Annuelle — deux mois offerts</option>
          <option value="month">Mensuelle</option>
        </SelectField>
      </fieldset>

      <fieldset className="space-y-5 border-t border-line pt-6">
        <legend className="font-display text-lg font-semibold text-ink-900">Qui vous êtes</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Prénom" name="contactFirstName" autoComplete="given-name" defaultValue={v.contactFirstName} error={fe.contactFirstName?.[0]} required />
          <Field label="Nom" name="contactLastName" autoComplete="family-name" defaultValue={v.contactLastName} error={fe.contactLastName?.[0]} required />
        </div>
        <Field label="Fonction (facultatif)" name="contactRole" placeholder="Secrétaire municipale" defaultValue={v.contactRole} error={fe.contactRole?.[0]} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="E-mail" name="contactEmail" type="email" autoComplete="email" defaultValue={v.contactEmail} error={fe.contactEmail?.[0]} required />
          <Field label="Téléphone (facultatif)" name="contactPhone" type="tel" autoComplete="tel" defaultValue={v.contactPhone} error={fe.contactPhone?.[0]} />
        </div>
        <TextareaField
          label="Précisions (facultatif)"
          name="message"
          placeholder="Contraintes de calendrier, procédure d'achat, questions du service informatique…"
          defaultValue={v.message}
          error={fe.message?.[0]}
        />
      </fieldset>

      <div className="hidden" aria-hidden>
        <label htmlFor="website">Site web</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <SubmitButton pendingText="Envoi…">Demander l&rsquo;offre</SubmitButton>
        <p className="text-sm text-ink-500">Sans engagement. Aucun compte à créer.</p>
      </div>
    </form>
  );
}
