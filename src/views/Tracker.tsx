import { SectionTitle, TopBar } from '../components/ui';
import { OBLIGATORY, PRAYER_NAMES, addDays, dayIn, dayKey } from '../lib/prayer';
import { prayerLogStore, settingsStore, useStore } from '../lib/settings';

export function Tracker() {
  const [settings] = useStore(settingsStore);
  const [log] = useStore(prayerLogStore);
  const today = dayIn(settings.place?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone);

  const countFor = (k: string) => OBLIGATORY.filter((p) => log[k]?.[p]).length;

  // Consecutive days with all five prayers logged, counting back from today
  // (today counts only once complete, so an unfinished day doesn't break the streak).
  let streak = 0;
  for (let i = 0; i < 3650; i++) {
    const n = countFor(dayKey(addDays(today, -i)));
    if (n === 5) streak++;
    else if (i > 0) break;
  }

  const last30 = Array.from({ length: 28 }, (_, i) => addDays(today, i - 27));
  const total30 = last30.reduce((n, d) => n + countFor(dayKey(d)), 0);
  const perPrayer = OBLIGATORY.map((p) => ({ p, n: last30.filter((d) => log[dayKey(d)]?.[p]).length }));

  return (
    <>
      <TopBar title="Suivi des prières" subtitle="Pour soi, sans jugement" backTo="/prieres" />
      <div class="page">
        <div class="stat-row">
          <div class="stat">
            <b>{countFor(dayKey(today))}/5</b>
            <small>aujourd’hui</small>
          </div>
          <div class="stat">
            <b>{streak}</b>
            <small>jour{streak > 1 ? 's' : ''} complets d’affilée</small>
          </div>
          <div class="stat">
            <b>{Math.round((total30 / (28 * 5)) * 100)}%</b>
            <small>sur 4 semaines</small>
          </div>
        </div>

        <SectionTitle>4 dernières semaines</SectionTitle>
        <div class="card">
          <div class="heat">
            {last30.map((d) => {
              const n = countFor(dayKey(d));
              return (
                <div
                  key={dayKey(d)}
                  title={`${d.d}/${d.m} : ${n}/5`}
                  style={n ? { background: `color-mix(in srgb, var(--primary) ${20 + n * 16}%, var(--surface-2))` } : undefined}
                />
              );
            })}
          </div>
          <div class="legend">
            <span>Plus la case est foncée, plus de prières ont été notées ce jour-là.</span>
          </div>
        </div>

        <SectionTitle>Par prière (4 semaines)</SectionTitle>
        <div class="card stack">
          {perPrayer.map(({ p, n }) => (
            <div key={p}>
              <div class="row small" style={{ justifyContent: 'space-between' }}>
                <b>{PRAYER_NAMES[p].fr}</b>
                <span class="muted">{n}/28</span>
              </div>
              <div class="progress" style={{ marginTop: '6px' }}>
                <div style={{ width: `${(n / 28) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p class="small muted" style={{ margin: '14px 4px' }}>
          Cochez chaque prière accomplie depuis l’accueil ou la page des horaires. Ces données restent uniquement sur votre téléphone.
        </p>
      </div>
    </>
  );
}
