import { useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { SectionTitle, TopBar, haptic, toast } from '../components/ui';
import { PRAYER_NAMES } from '../lib/prayer';
import { qadaStore, useStore, type QadaState } from '../lib/settings';

type QadaPrayer = keyof QadaState['prayers'];
const ROWS: { id: QadaPrayer; label: string }[] = [
  { id: 'fajr', label: PRAYER_NAMES.fajr.fr },
  { id: 'dhuhr', label: PRAYER_NAMES.dhuhr.fr },
  { id: 'asr', label: PRAYER_NAMES.asr.fr },
  { id: 'maghrib', label: PRAYER_NAMES.maghrib.fr },
  { id: 'isha', label: PRAYER_NAMES.isha.fr },
  { id: 'witr', label: 'Witr' },
];

export function Qada() {
  const [state, setState] = useStore(qadaStore);
  const [days, setDays] = useState('');
  const total = ROWS.reduce((n, r) => n + (state.prayers[r.id] ?? 0), 0);

  const change = (id: QadaPrayer, delta: number) => {
    haptic();
    setState((s) => ({ ...s, prayers: { ...s.prayers, [id]: Math.max(0, (s.prayers[id] ?? 0) + delta) } }));
    if (delta < 0) toast('Une prière rattrapée, qu’Allah l’accepte');
  };

  const addDays = (e: Event) => {
    e.preventDefault();
    const n = Math.floor(Number(days));
    if (!(n > 0)) return;
    setState((s) => ({
      ...s,
      prayers: Object.fromEntries(
        Object.entries(s.prayers).map(([k, v]) => [k, k === 'witr' ? v : v + n]),
      ) as QadaState['prayers'],
    }));
    setDays('');
    toast(`${n} jour${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''} pour chacune des cinq prières`);
  };

  return (
    <>
      <TopBar title="Rattrapages" subtitle={`${total} prière${total > 1 ? 's' : ''} · ${state.fasts} jeûne${state.fasts > 1 ? 's' : ''}`} backTo="/plus" />
      <div class="page">
        <p class="small muted" style={{ margin: '0 4px 12px' }}>
          « Celui qui a oublié une prière ou s’est endormi, qu’il la prie dès qu’il s’en souvient. » (Muslim 684). Notez ce qu’il vous
          reste à rattraper et avancez à votre rythme.
        </p>
        <SectionTitle>Prières à rattraper</SectionTitle>
        <div class="card stack">
          {ROWS.map((r) => (
            <div class="row" key={r.id}>
              <span class="grow" style={{ fontWeight: 600 }}>
                {r.label}
              </span>
              <button class="icon-btn" aria-label={`Ajouter une prière de ${r.label}`} onClick={() => change(r.id, 1)}>
                <Icon name="plus" size={20} />
              </button>
              <output class="badge" style={{ minWidth: '56px' }}>
                {state.prayers[r.id] ?? 0}
              </output>
              <button
                class="btn secondary"
                style={{ minHeight: '38px', padding: '0 12px' }}
                disabled={!state.prayers[r.id]}
                onClick={() => change(r.id, -1)}
              >
                Rattrapée
              </button>
            </div>
          ))}
          <form class="row" onSubmit={addDays}>
            <input
              id="qada-days"
              class="input grow"
              inputMode="numeric"
              placeholder="Nombre de jours manqués"
              value={days}
              onInput={(e) => setDays((e.target as HTMLInputElement).value)}
            />
            <button class="btn secondary" type="submit">
              Ajouter
            </button>
          </form>
        </div>

        <SectionTitle>Jours de jeûne à rattraper</SectionTitle>
        <div class="card row">
          <span class="grow">Ramadan ou jeûne obligatoire manqué</span>
          <button class="icon-btn" aria-label="Ajouter un jour" onClick={() => setState((s) => ({ ...s, fasts: s.fasts + 1 }))}>
            <Icon name="plus" size={20} />
          </button>
          <output class="badge" style={{ minWidth: '56px' }}>
            {state.fasts}
          </output>
          <button
            class="btn secondary"
            style={{ minHeight: '38px', padding: '0 12px' }}
            disabled={!state.fasts}
            onClick={() => {
              setState((s) => ({ ...s, fasts: Math.max(0, s.fasts - 1) }));
              toast('Un jour rattrapé, qu’Allah l’accepte');
            }}
          >
            Rattrapé
          </button>
        </div>
        <p class="small muted" style={{ margin: '14px 4px' }}>
          Les règles du rattrapage (ordre, prières manquées depuis longtemps, cas particuliers) varient selon les écoles : renseignez-vous
          auprès d’une personne de science. Ces nombres restent sur votre téléphone.
        </p>
      </div>
    </>
  );
}
