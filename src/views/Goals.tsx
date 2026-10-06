import { useEffect, useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { SectionTitle, Switch, TopBar, haptic } from '../components/ui';
import { DEFAULT_HIDDEN, GOALS, goalsFor, streak, type GoalStatus } from '../lib/goals';
import { addDays, dayIn, dayKey } from '../lib/prayer';
import {
  adhkarStore,
  goalsStore,
  khatmStore,
  prayerLogStore,
  settingsStore,
  useStore,
} from '../lib/settings';

/** Today's goals, kept in sync with what the user does elsewhere in the app. */
export function useGoals() {
  const [settings] = useStore(settingsStore);
  const [goals, setGoals] = useStore(goalsStore);
  const [prayerLog] = useStore(prayerLogStore);
  const [adhkar] = useStore(adhkarStore);
  const [khatm] = useStore(khatmStore);
  const today = dayIn(settings.place?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  const key = dayKey(today);
  const list = goalsFor(today, {
    goals,
    prayerLog,
    adhkarComplete: adhkar.complete ?? {},
    adhkarDate: adhkar.date,
    khatm,
    hijriOffset: settings.hijriOffset,
  });
  const done = list.filter((g) => g.done).length;
  const ratio = list.length ? done / list.length : 0;

  // Record today's score so streaks survive even if goals are later hidden.
  useEffect(() => {
    if (goals.score[key] !== ratio) setGoals((g) => ({ ...g, score: { ...g.score, [key]: ratio } }));
  }, [key, ratio]);

  const toggle = (id: string) => {
    haptic();
    setGoals((g) => ({ ...g, done: { ...g.done, [key]: { ...g.done[key], [id]: !g.done[key]?.[id] } } }));
  };

  return { list, done, ratio, toggle, streak: streak({ ...goals.score, [key]: ratio }, today, addDays) };
}

export function ProgressRing({ ratio, size = 64, label }: { ratio: number; size?: number; label: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={label}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--surface-2)" stroke-width="7" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="var(--primary)"
        stroke-width="7"
        stroke-linecap="round"
        stroke-dasharray={c}
        stroke-dashoffset={c * (1 - ratio)}
        transform="rotate(-90 32 32)"
        style={{ transition: 'stroke-dashoffset 0.3s' }}
      />
      <text x="32" y="37" text-anchor="middle" font-size="15" font-weight="700" fill="var(--text)" font-family="system-ui, sans-serif">
        {Math.round(ratio * 100)}%
      </text>
    </svg>
  );
}

export function GoalRow({ status, onToggle }: { status: GoalStatus; onToggle: () => void }) {
  const { goal, done, auto } = status;
  return (
    <div class={`goal ${done ? 'done' : ''}`}>
      <button
        class="tick"
        aria-pressed={done}
        aria-label={`${goal.title} accompli`}
        onClick={onToggle}
        disabled={auto}
        title={auto ? 'Coché automatiquement' : undefined}
      >
        <Icon name="check" size={18} />
      </button>
      <div class="grow">
        {goal.href ? (
          <a href={goal.href} class="goal-title">
            {goal.title}
          </a>
        ) : (
          <span class="goal-title">{goal.title}</span>
        )}
        <div class="goal-why">
          {goal.why} <span class="muted">({goal.source})</span>
        </div>
      </div>
    </div>
  );
}

export function Goals() {
  const { list, done, ratio, toggle, streak: days } = useGoals();
  const [goals, setGoals] = useStore(goalsStore);
  const [editing, setEditing] = useState(false);
  const hidden = { ...DEFAULT_HIDDEN, ...goals.hidden };

  return (
    <>
      <TopBar
        title="Ma journée"
        subtitle="Petites actions régulières"
        backTo="/"
        actions={
          <button class={`icon-btn ${editing ? 'active' : ''}`} aria-label="Choisir mes objectifs" onClick={() => setEditing(!editing)}>
            <Icon name="list" />
          </button>
        }
      />
      <div class="page">
        <div class="card row">
          <ProgressRing ratio={ratio} label={`${done} objectifs sur ${list.length}`} />
          <div class="grow">
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
              {done}/{list.length} aujourd’hui
            </div>
            <div class="small muted">
              {days > 0 ? `${days} jour${days > 1 ? 's' : ''} d’affilée à 70 % ou plus` : 'Atteignez 70 % pour commencer une série'}
            </div>
          </div>
        </div>
        <p class="small muted" style={{ margin: '12px 4px' }}>
          « Les œuvres les plus aimées d’Allah sont les plus régulières, même si elles sont peu nombreuses. » (Al-Bukhārī 6464, Muslim 783)
        </p>

        {editing ? (
          <>
            <SectionTitle>Objectifs suivis</SectionTitle>
            <div class="card stack">
              {GOALS.map((g) => (
                <label class="row" key={g.id}>
                  <span class="grow">
                    {g.title}
                    {g.when && <span class="small muted"> (certains jours)</span>}
                  </span>
                  <Switch
                    label={g.title}
                    checked={!hidden[g.id]}
                    onChange={(v) => setGoals((s) => ({ ...s, hidden: { ...s.hidden, [g.id]: !v } }))}
                  />
                </label>
              ))}
            </div>
          </>
        ) : (
          <div class="card goals">
            {list.map((s) => (
              <GoalRow key={s.goal.id} status={s} onToggle={() => toggle(s.goal.id)} />
            ))}
          </div>
        )}
        <p class="small muted" style={{ margin: '12px 4px' }}>
          Les prières, les adhkar et la lecture du Coran se cochent tout seuls quand vous les faites dans l’application. Ce suivi reste sur
          votre téléphone : c’est un outil pour vous, pas un jugement.
        </p>
      </div>
    </>
  );
}
