import type { BillingInterval } from "@/lib/db/schema";

const LOCALE = "fr-CH";

/** Montant en centimes → "CHF 159.–" ou "CHF 159.50". */
export function formatCHF(cents: number) {
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(Math.round(cents));
  const francs = Math.floor(abs / 100);
  const rappen = abs % 100;
  // Séparateur de milliers suisse (1’590), identique côté serveur et navigateur.
  const grouped = String(francs).replace(/\B(?=(\d{3})+(?!\d))/g, "’");
  return `CHF ${sign}${grouped}${rappen === 0 ? ".–" : `.${String(rappen).padStart(2, "0")}`}`;
}

export function formatDate(date: Date | number | string) {
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric" }).format(new Date(date));
}

export function formatDateShort(date: Date | number | string) {
  return new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));
}

export function formatDateTime(date: Date | number | string) {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function intervalLabel(interval: BillingInterval) {
  return interval === "month" ? "mensuel" : "annuel";
}

export function intervalSuffix(interval: BillingInterval) {
  return interval === "month" ? "/ mois" : "/ an";
}

export function fullName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function initials(user: { firstName: string; lastName: string }) {
  return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
}
