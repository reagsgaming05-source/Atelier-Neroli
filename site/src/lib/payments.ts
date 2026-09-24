/**
 * Fournisseur de paiement en MODE DÉMONSTRATION.
 * Aucune transaction réelle : les cartes sont validées localement (format + Luhn)
 * et seuls la marque et les 4 derniers chiffres sont conservés.
 *
 * Pour passer en production, remplacer `chargeCard` par un appel à un prestataire
 * (Stripe, Datatrans, Payrexx…) en conservant la même signature.
 */

export type CardInput = {
  holder: string;
  number: string;
  expiry: string; // MM/AA
  cvc: string;
};

export type PaymentMethod = { brand: string; last4: string };

export type CardValidation =
  | { ok: true; method: PaymentMethod }
  | { ok: false; errors: Partial<Record<keyof CardInput, string>> };

export const DEMO_CARDS = {
  success: "4242 4242 4242 4242",
  declined: "4000 0000 0000 0002",
};

export function normalizeCardNumber(value: string) {
  return value.replace(/\D/g, "");
}

export function detectBrand(number: string): string {
  const n = normalizeCardNumber(number);
  if (/^4/.test(n)) return "Visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "American Express";
  if (/^(6011|65|64[4-9])/.test(n)) return "Discover";
  if (/^(30[0-5]|36|38)/.test(n)) return "Diners Club";
  return "Carte";
}

export function luhnValid(number: string) {
  const n = normalizeCardNumber(number);
  if (n.length < 12) return false;
  let sum = 0;
  let double = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let digit = Number(n[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function expiryValid(expiry: string) {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(expiry.trim());
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  return endOfMonth >= now;
}

export function validateCard(card: CardInput): CardValidation {
  const errors: Partial<Record<keyof CardInput, string>> = {};
  const number = normalizeCardNumber(card.number);

  if (card.holder.trim().length < 3) errors.holder = "Indiquez le nom figurant sur la carte.";
  if (number.length < 13 || number.length > 19 || !luhnValid(number)) {
    errors.number = "Numéro de carte invalide.";
  }
  if (!expiryValid(card.expiry)) errors.expiry = "Date d'expiration invalide (MM/AA).";
  if (!/^\d{3,4}$/.test(card.cvc.trim())) errors.cvc = "Code de sécurité invalide.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, method: { brand: detectBrand(number), last4: number.slice(-4) } };
}

export type ChargeResult = { ok: true; reference: string } | { ok: false; reason: string };

/** Simule un débit. La carte de test "…0002" est refusée pour tester le parcours d'échec. */
export async function chargeCard(card: CardInput, amountCents: number): Promise<ChargeResult> {
  const number = normalizeCardNumber(card.number);
  await new Promise((r) => setTimeout(r, 350)); // latence simulée
  if (number === normalizeCardNumber(DEMO_CARDS.declined)) {
    return { ok: false, reason: "Votre carte a été refusée par l'émetteur. Essayez une autre carte." };
  }
  if (amountCents < 0) return { ok: false, reason: "Montant invalide." };
  return { ok: true, reference: `demo_${Date.now().toString(36)}` };
}
