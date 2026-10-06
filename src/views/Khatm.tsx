import { useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { SectionTitle, TopBar, toast } from '../components/ui';
import { PAGE_COUNT, formatPortion, pageOf, pageStart, todaysPortion } from '../lib/khatm';
import { dayIn, dayKey } from '../lib/prayer';
import { khatmStore, readingStore, settingsStore, useStore } from '../lib/settings';
import { ProgressRing } from './Goals';

const DURATIONS = [
  { days: 7, label: '1 semaine', detail: '≈ 4 juz’ par jour' },
  { days: 15, label: '15 jours', detail: '2 juz’ par jour' },
  { days: 30, label: '1 mois', detail: '1 juz’ (20 pages) par jour' },
  { days: 60, label: '2 mois', detail: '10 pages par jour' },
  { days: 120, label: '4 mois', detail: '5 pages par jour' },
  { days: 365, label: '1 an', detail: '≈ 2 pages par jour' },
];

export function Khatm() {
  const [settings] = useStore(settingsStore);
  const [state, setState] = useStore(khatmStore);
  const [reading] = useStore(readingStore);
  const today = dayKey(dayIn(settings.place?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone));
  const portion = todaysPortion(state, today);
  const [custom, setCustom] = useState('');

  const start = (days: number, fromLast = false) => {
    const firstPage = fromLast && reading.last ? pageOf(reading.last.surah, reading.last.verse) : 1;
    setState((s) => ({ ...s, plan: { start: today, days, firstPage }, nextPage: firstPage }));
    toast('Plan de lecture créé, qu’Allah vous facilite');
  };

  const readUpTo = (page: number) => {
    const next = Math.min(PAGE_COUNT + 1, page + 1);
    const read = Math.max(0, next - state.nextPage);
    setState((s) => ({
      ...s,
      nextPage: next,
      log: { ...s.log, [today]: (s.log[today] ?? 0) + read },
      completed: next > PAGE_COUNT ? s.completed + 1 : s.completed,
    }));
    toast(next > PAGE_COUNT ? 'Khatm terminée, qu’Allah l’accepte de vous !' : `${read} page${read > 1 ? 's' : ''} notée${read > 1 ? 's' : ''}`);
  };

  if (!state.plan || !portion) {
    return (
      <>
        <TopBar title="Lire tout le Coran" subtitle="Plan de khatm" backTo="/" />
        <div class="page">
          <p style={{ margin: '4px 4px 14px' }}>
            Choisissez en combien de temps vous voulez terminer le Coran. Sakina vous indique chaque jour quelles pages lire et s’adapte
            si vous prenez du retard.
          </p>
          <div class="list">
            {DURATIONS.map((d) => (
              <button class="list-item" key={d.days} onClick={() => start(d.days)}>
                <span class="badge">{d.days}</span>
                <div class="grow">
                  <div class="title">{d.label}</div>
                  <div class="subtitle">{d.detail}</div>
                </div>
                <Icon name="chevron" size={18} />
              </button>
            ))}
          </div>
          {reading.last && (
            <button class="btn ghost block" style={{ marginTop: '10px' }} onClick={() => start(30, true)}>
              Commencer en 1 mois depuis ma lecture en cours
            </button>
          )}
          <p class="small muted" style={{ margin: '14px 4px' }}>
            Le découpage suit les 604 pages du mushaf de Médine. « Le meilleur d’entre vous est celui qui apprend le Coran et
            l’enseigne. » (Al-Bukhārī 5027)
          </p>
        </div>
      </>
    );
  }

  const plan = state.plan;
  const progress = (state.nextPage - plan.firstPage) / (PAGE_COUNT - plan.firstPage + 1);
  const start0 = pageStart(portion.from);
  const totalToday = state.log[today] ?? 0;

  return (
    <>
      <TopBar title="Lire tout le Coran" subtitle={`Jour ${portion.day} sur ${plan.days}`} backTo="/" />
      <div class="page">
        <div class="card row">
          <ProgressRing ratio={Math.min(1, progress)} label="Progression de la khatm" />
          <div class="grow">
            <div style={{ fontWeight: 700 }}>
              Page {Math.min(state.nextPage, PAGE_COUNT)} sur {PAGE_COUNT}
            </div>
            <div class="small muted">
              {state.completed > 0 ? `${state.completed} khatm terminée${state.completed > 1 ? 's' : ''} · ` : ''}
              {totalToday > 0 ? `${totalToday} page${totalToday > 1 ? 's' : ''} lue${totalToday > 1 ? 's' : ''} aujourd’hui` : 'Rien de lu aujourd’hui'}
            </div>
          </div>
        </div>

        {portion.finished ? (
          <div class="result" style={{ marginTop: '14px' }}>
            <strong>Khatm terminée</strong>
            <p>Qu’Allah l’accepte de vous et en fasse un témoin en votre faveur.</p>
            <button class="btn" onClick={() => setState((s) => ({ ...s, plan: null, nextPage: 1 }))}>
              Commencer une nouvelle lecture
            </button>
          </div>
        ) : (
          <>
            <SectionTitle>{portion.doneToday ? 'Portion du jour terminée ✓' : 'À lire aujourd’hui'}</SectionTitle>
            <div class="card stack">
              {portion.doneToday ? (
                <p style={{ margin: 0 }}>
                  Bravo, vous êtes dans les temps. Vous pouvez continuer : la suite commence page {portion.from}.
                </p>
              ) : (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>
                    Pages {portion.from} à {portion.to}{' '}
                    <span class="muted" style={{ fontWeight: 500, fontSize: '0.95rem' }}>
                      ({portion.pages} page{portion.pages > 1 ? 's' : ''})
                    </span>
                  </div>
                  <div class="muted">{formatPortion(portion.from, portion.to)}</div>
                </div>
              )}
              <a class="btn block" href={`#/coran/${start0.surah}?v=${start0.verse}`}>
                <Icon name="book" size={18} /> Lire à partir de la page {portion.from}
              </a>
              {!portion.doneToday && (
                <button class="btn secondary block" onClick={() => readUpTo(portion.to)}>
                  <Icon name="check" size={18} /> J’ai lu jusqu’à la page {portion.to}
                </button>
              )}
              <form
                class="row"
                onSubmit={(e) => {
                  e.preventDefault();
                  const p = Number(custom);
                  if (p >= state.nextPage && p <= PAGE_COUNT) {
                    readUpTo(p);
                    setCustom('');
                  } else toast(`Indiquez une page entre ${state.nextPage} et ${PAGE_COUNT}`);
                }}
              >
                <input
                  class="input grow"
                  id="khatm-page"
                  inputMode="numeric"
                  placeholder="J’ai lu jusqu’à la page…"
                  value={custom}
                  onInput={(e) => setCustom((e.target as HTMLInputElement).value)}
                />
                <button class="btn secondary" type="submit">
                  Noter
                </button>
              </form>
            </div>
          </>
        )}
        <button
          class="btn ghost block"
          style={{ marginTop: '14px' }}
          onClick={() => setState((s) => ({ ...s, plan: null, nextPage: 1 }))}
        >
          Changer de plan
        </button>
      </div>
    </>
  );
}
