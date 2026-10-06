/** Zakat al-mal on savings, trade goods and precious metals. */

export const GOLD_NISAB_GRAMS = 85;
export const SILVER_NISAB_GRAMS = 595;
export const ZAKAT_RATE = 0.025;

export interface ZakatInput {
  cash: number;
  gold: number;
  silver: number;
  investments: number;
  merchandise: number;
  receivables: number;
  /** Debts falling due now, deducted from the assets. */
  debts: number;
  nisabBasis: 'gold' | 'silver';
  goldPricePerGram: number;
  silverPricePerGram: number;
}

export interface ZakatResult {
  assets: number;
  net: number;
  nisab: number;
  due: number;
  reachesNisab: boolean;
}

const n = (x: number) => (Number.isFinite(x) && x > 0 ? x : 0);

export function computeZakat(input: ZakatInput): ZakatResult {
  const assets = n(input.cash) + n(input.gold) + n(input.silver) + n(input.investments) + n(input.merchandise) + n(input.receivables);
  const net = Math.max(0, assets - n(input.debts));
  const nisab =
    input.nisabBasis === 'gold' ? GOLD_NISAB_GRAMS * n(input.goldPricePerGram) : SILVER_NISAB_GRAMS * n(input.silverPricePerGram);
  const reachesNisab = nisab > 0 && net >= nisab;
  return { assets, net, nisab, due: reachesNisab ? net * ZAKAT_RATE : 0, reachesNisab };
}
