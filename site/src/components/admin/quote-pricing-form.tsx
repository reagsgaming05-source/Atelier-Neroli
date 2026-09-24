"use client";

import { useActionState, useState } from "react";
import { sendQuoteAction } from "@/lib/actions/quote";
import type { ActionState } from "@/lib/actions/types";
import { Field, FormError, SelectField, TextareaField } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

type PlanRow = { id: string; name: string; slug: string; priceYearlyCents: number; priceMonthlyCents: number };

/**
 * Chiffrer une offre et l'ouvrir au client.
 *
 * Le montant se saisit en francs, parce que c'est ce qu'on a sous les yeux dans
 * la décision de Municipalité qu'on est en train de lire ; la conversion en
 * centimes se fait côté serveur. Le prix public de la formule est proposé d'un
 * clic, pour que le cas courant — pas de remise — se règle en deux secondes.
 */
export function QuotePricingForm({
  quoteId,
  plans,
  defaultPlanId,
  defaultInterval,
  defaultAmount,
  defaultConditions,
}: {
  quoteId: string;
  plans: PlanRow[];
  defaultPlanId?: string;
  defaultInterval: "month" | "year";
  defaultAmount: string;
  defaultConditions: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(sendQuoteAction, {});
  const [planId, setPlanId] = useState(defaultPlanId ?? plans[0]?.id ?? "");
  const [interval, setInterval] = useState<"month" | "year">(defaultInterval);
  const [amount, setAmount] = useState(defaultAmount);

  const plan = plans.find((p) => p.id === planId);
  const prixPublic = plan ? (interval === "year" ? plan.priceYearlyCents : plan.priceMonthlyCents) / 100 : 0;
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="id" value={quoteId} />
      <FormError message={state.error} />

      <div className="grid gap-5 sm:grid-cols-3">
        <SelectField label="Formule" name="planId" value={planId} onChange={(e) => setPlanId(e.currentTarget.value)} error={fe.planId?.[0]}>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Périodicité"
          name="interval"
          value={interval}
          onChange={(e) => setInterval(e.currentTarget.value as "month" | "year")}
          error={fe.interval?.[0]}
        >
          <option value="year">Annuelle</option>
          <option value="month">Mensuelle</option>
        </SelectField>
        <Field
          label="Montant TTC (CHF)"
          name="amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.currentTarget.value)}
          error={fe.amount?.[0]}
          required
          hint={
            prixPublic > 0 ? (
              <button
                type="button"
                onClick={() => setAmount(prixPublic.toFixed(2))}
                className="font-semibold text-brand-700 hover:text-brand-900"
              >
                Prix public : {prixPublic.toFixed(2)} — appliquer
              </button>
            ) : (
              "Formule sur devis : à chiffrer."
            )
          }
        />
      </div>

      <Field
        label="Valable jusqu'au (facultatif)"
        name="validUntil"
        type="date"
        defaultValue={v.validUntil}
        error={fe.validUntil?.[0]}
        hint="Vide : 90 jours à compter d'aujourd'hui."
      />

      <TextareaField label="Conditions" name="conditions" defaultValue={v.conditions ?? defaultConditions} error={fe.conditions?.[0]} />
      <TextareaField
        label="Note interne (invisible pour le client)"
        name="internalNote"
        defaultValue={v.internalNote}
        error={fe.internalNote?.[0]}
      />

      <SubmitButton pendingText="Enregistrement…">Chiffrer et ouvrir l&rsquo;offre</SubmitButton>
    </form>
  );
}
