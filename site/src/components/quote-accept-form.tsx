"use client";

import { useActionState, useState } from "react";
import { acceptQuoteAction } from "@/lib/actions/quote";
import type { ActionState } from "@/lib/actions/types";
import { CheckboxField, Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/**
 * Accepter l'offre, c'est-à-dire passer commande.
 *
 * Le bon de commande est le seul champ vraiment obligatoire : c'est la pièce
 * que la comptabilité communale exige de revoir sur la facture. Le reste n'est
 * demandé que s'il diffère de ce que nous savons déjà, parce qu'une personne
 * qui vient de faire valider une dépense en Municipalité n'a pas envie de
 * ressaisir son adresse.
 */
export function QuoteAcceptForm({
  token,
  compteExistant,
  adresse,
}: {
  token: string;
  compteExistant: boolean;
  adresse: { nom: string; rue: string; npa: string; localite: string; ide: string };
}) {
  const [state, action] = useActionState<ActionState, FormData>(acceptQuoteAction, {});
  const [autreAdresse, setAutreAdresse] = useState(false);
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormError message={state.error} />

      <Field
        label="Votre numéro de bon de commande"
        name="purchaseOrder"
        defaultValue={v.purchaseOrder}
        error={fe.purchaseOrder?.[0]}
        required
        hint="Il figurera sur la facture, pour votre imputation."
      />

      <Field
        label={compteExistant ? "Mot de passe de votre espace client" : "Choisissez un mot de passe"}
        name="password"
        type="password"
        autoComplete={compteExistant ? "current-password" : "new-password"}
        error={fe.password?.[0]}
        required
        hint={
          compteExistant
            ? "Un espace client existe déjà pour cette adresse : confirmez que c'est bien vous."
            : "Huit caractères au minimum. Il ouvrira votre espace client, où vous retrouverez vos factures."
        }
      />

      <div className="rounded-xl border border-line bg-canvas-50 p-5">
        <p className="text-sm font-semibold text-ink-900">Adresse de facturation</p>
        <p className="mt-1 text-sm text-ink-500">
          {adresse.nom}
          {adresse.rue ? `, ${adresse.rue}` : ""}
          {adresse.npa || adresse.localite ? `, ${adresse.npa} ${adresse.localite}` : ""}
          {adresse.ide ? ` · ${adresse.ide}` : ""}
        </p>
        <CheckboxField
          className="mt-4"
          label="Facturer à une autre adresse"
          name="autreAdresse"
          checked={autreAdresse}
          onChange={(e) => setAutreAdresse(e.currentTarget.checked)}
        />
        {autreAdresse ? (
          <div className="mt-5 space-y-4">
            <Field label="Nom du service à facturer" name="billName" defaultValue={v.billName} error={fe.billName?.[0]} />
            <Field label="Adresse" name="billStreet" defaultValue={v.billStreet} error={fe.billStreet?.[0]} />
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <Field label="NPA" name="billZip" inputMode="numeric" defaultValue={v.billZip} error={fe.billZip?.[0]} />
              <Field label="Localité" name="billCity" defaultValue={v.billCity} error={fe.billCity?.[0]} />
            </div>
            <Field label="IDE (facultatif)" name="billIde" defaultValue={v.billIde} error={fe.billIde?.[0]} />
          </div>
        ) : null}
      </div>

      <SubmitButton size="lg" pendingText="Enregistrement…">
        Accepter l&rsquo;offre et commander
      </SubmitButton>
      <p className="text-sm text-ink-500">
        La facture est émise immédiatement, payable à 30 jours par QR-facture. Aucun paiement n&rsquo;est demandé maintenant.
      </p>
    </form>
  );
}
