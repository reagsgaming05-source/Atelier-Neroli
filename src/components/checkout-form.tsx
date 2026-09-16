"use client";

import { useActionState, useState } from "react";
import { Lock } from "lucide-react";
import { subscribeAction } from "@/lib/actions/subscription";
import type { ActionState } from "@/lib/actions/types";
import { DEMO_CARDS, detectBrand, normalizeCardNumber } from "@/lib/payments";
import { formatCHF } from "@/lib/format";
import { CheckboxField, Field, FormError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function formatCardNumber(value: string) {
  return normalizeCardNumber(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export function CheckoutForm({ planSlug, interval, amountCents, defaultHolder }: { planSlug: string; interval: "month" | "year"; amountCents: number; defaultHolder: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(subscribeAction, {});
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};

  const [holder, setHolder] = useState(v.holder ?? defaultHolder);
  const [number, setNumber] = useState(v.number ?? "");
  const [expiry, setExpiry] = useState(v.expiry ?? "");
  const [cvc, setCvc] = useState("");

  const brand = normalizeCardNumber(number).length >= 4 ? detectBrand(number) : null;

  function fillDemoCard(kind: "success" | "declined") {
    setHolder(holder || defaultHolder || "Marie Dupont");
    setNumber(DEMO_CARDS[kind]);
    setExpiry("12/30");
    setCvc("123");
  }

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="planSlug" value={planSlug} />
      <input type="hidden" name="interval" value={interval} />

      <div className="rounded-2xl border border-accent-200 bg-accent-100 p-5 text-sm text-accent-600">
        <p className="font-semibold">Mode démonstration — aucun paiement réel.</p>
        <p className="mt-1">Utilisez une carte de test pour parcourir la souscription de bout en bout.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => fillDemoCard("success")} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-card transition hover:bg-brand-50">
            Carte acceptée · {DEMO_CARDS.success}
          </button>
          <button type="button" onClick={() => fillDemoCard("declined")} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-danger shadow-card transition hover:bg-danger/5">
            Carte refusée · {DEMO_CARDS.declined}
          </button>
        </div>
      </div>

      <FormError message={state.error} />

      <Field label="Nom sur la carte" name="holder" autoComplete="cc-name" value={holder} onChange={(e) => setHolder(e.target.value)} error={fe.holder?.[0]} required />

      <div>
        <label htmlFor="number" className="label">
          Numéro de carte
        </label>
        <div className="relative">
          <input
            id="number"
            name="number"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 5678 9012 3456"
            value={number}
            onChange={(e) => setNumber(formatCardNumber(e.target.value))}
            aria-invalid={fe.number ? true : undefined}
            className={`input pr-28 font-mono tracking-wider ${fe.number ? "input-error" : ""}`}
            required
          />
          {brand && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-md bg-canvas-100 px-2 py-1 text-xs font-semibold text-ink-700">{brand}</span>}
        </div>
        {fe.number?.[0] && <p className="mt-1.5 text-xs font-medium text-danger">{fe.number[0]}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Expiration (MM/AA)" name="expiry" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} error={fe.expiry?.[0]} required />
        <Field label="Code de sécurité" name="cvc" inputMode="numeric" autoComplete="cc-csc" placeholder="CVC" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} error={fe.cvc?.[0]} required />
      </div>

      <CheckboxField
        name="terms"
        error={fe.terms?.[0]}
        label={
          <>
            J'ai lu et j'accepte les{" "}
            <Link href="/cgv" className="font-semibold text-brand-700 underline underline-offset-4" target="_blank">
              conditions générales
            </Link>
            . L'abonnement se renouvelle automatiquement et peut être résilié à tout moment.
          </>
        }
      />

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <Lock className="size-4" aria-hidden />
        {pending ? "Traitement en cours…" : `Confirmer et payer ${formatCHF(amountCents)}`}
      </Button>
      <p className="text-center text-xs text-ink-400">Paiement sécurisé · Vous recevez une facture immédiatement dans votre espace.</p>
    </form>
  );
}
