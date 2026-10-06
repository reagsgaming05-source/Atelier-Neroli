import { SectionTitle, TopBar } from '../components/ui';
import { createStore, useStore } from '../lib/store';
import { GOLD_NISAB_GRAMS, SILVER_NISAB_GRAMS, computeZakat, type ZakatInput } from '../lib/zakat';

const zakatStore = createStore<ZakatInput>('sakina.zakat', {
  cash: 0,
  gold: 0,
  silver: 0,
  investments: 0,
  merchandise: 0,
  receivables: 0,
  debts: 0,
  nisabBasis: 'gold',
  goldPricePerGram: 0,
  silverPricePerGram: 0,
});

const FIELDS: { key: keyof ZakatInput; label: string; hint?: string }[] = [
  { key: 'cash', label: 'Liquidités et comptes', hint: 'Espèces, comptes courants, livrets, épargne' },
  { key: 'gold', label: 'Or', hint: 'Valeur actuelle de l’or possédé (hors bijoux portés, selon les avis)' },
  { key: 'silver', label: 'Argent (métal)', hint: 'Valeur actuelle de l’argent possédé' },
  { key: 'investments', label: 'Placements', hint: 'Actions, fonds, crypto-actifs : valeur de marché' },
  { key: 'merchandise', label: 'Marchandises', hint: 'Stock destiné à la vente, au prix de vente' },
  { key: 'receivables', label: 'Créances', hint: 'Argent prêté que vous êtes sûr de récupérer' },
  { key: 'debts', label: 'Dettes à déduire', hint: 'Sommes dues et exigibles maintenant' },
];

export function Zakat() {
  const [input, setInput] = useStore(zakatStore);
  const r = computeZakat(input);
  const money = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
  const set = (key: keyof ZakatInput, value: string) => {
    const n = Number(value.replace(/\s/g, '').replace(',', '.'));
    setInput((s) => ({ ...s, [key]: Number.isFinite(n) ? n : 0 }));
  };

  const priceKey = input.nisabBasis === 'gold' ? 'goldPricePerGram' : 'silverPricePerGram';

  return (
    <>
      <TopBar title="Calcul de la zakat" subtitle="زكاة المال" backTo="/plus" />
      <div class="page">
        <div class="result">
          <div class="small" style={{ opacity: 0.8 }}>
            Zakat due (2,5 %)
          </div>
          <strong>{money(r.due)}</strong>
          <div class="small" style={{ opacity: 0.8 }}>
            {r.nisab === 0
              ? 'Renseignez le prix du gramme pour connaître le nisab'
              : r.reachesNisab
                ? `Patrimoine net ${money(r.net)} ≥ nisab ${money(r.nisab)}`
                : `Patrimoine net ${money(r.net)} < nisab ${money(r.nisab)} : pas de zakat`}
          </div>
        </div>

        <SectionTitle>Seuil (nisab)</SectionTitle>
        <div class="card">
          <div class="chip-row">
            <button class="chip" aria-pressed={input.nisabBasis === 'gold'} onClick={() => setInput((s) => ({ ...s, nisabBasis: 'gold' }))}>
              Or ({GOLD_NISAB_GRAMS} g)
            </button>
            <button class="chip" aria-pressed={input.nisabBasis === 'silver'} onClick={() => setInput((s) => ({ ...s, nisabBasis: 'silver' }))}>
              Argent ({SILVER_NISAB_GRAMS} g)
            </button>
          </div>
          <label class="field" style={{ marginTop: '10px' }}>
            <span>Prix actuel du gramme d’{input.nisabBasis === 'gold' ? 'or' : 'argent'} (€)</span>
            <input
              class="input"
              inputMode="decimal"
              value={input[priceKey] || ''}
              placeholder="Consultez le cours du jour"
              onChange={(e) => set(priceKey, (e.target as HTMLInputElement).value)}
            />
          </label>
        </div>

        <SectionTitle>Vos biens</SectionTitle>
        <div class="card">
          {FIELDS.map((f) => (
            <label class="field" key={f.key}>
              <span>{f.label}</span>
              <input
                class="input"
                inputMode="decimal"
                value={(input[f.key] as number) || ''}
                placeholder="0"
                onChange={(e) => set(f.key, (e.target as HTMLInputElement).value)}
              />
              {f.hint && <small class="muted">{f.hint}</small>}
            </label>
          ))}
        </div>
        <p class="small muted" style={{ margin: '14px 4px' }}>
          La zakat est due sur les biens qui atteignent le nisab et sont restés en votre possession une année lunaire (hawl). Ce calcul est
          indicatif : pour les cas particuliers (bijoux, entreprise, retraite), demandez conseil à une personne de science. Vos montants
          restent sur votre appareil.
        </p>
      </div>
    </>
  );
}
