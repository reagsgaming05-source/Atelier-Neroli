import { useEffect } from 'preact/hooks';
import { Icon, type IconName } from '../components/Icon';
import { SectionTitle, TopBar, haptic, share } from '../components/ui';
import { ADHKAR } from '../data/adhkar';
import type { Dhikr } from '../data/types';
import { dayIn, dayKey } from '../lib/prayer';
import { adhkarStore, settingsStore, useStore } from '../lib/settings';

const ICONS: Record<string, IconName> = {
  matin: 'sun',
  soir: 'moon',
  'apres-priere': 'hands',
  sommeil: 'moon',
  reveil: 'sun',
  quotidien: 'home',
  detresse: 'heart',
  istikhara: 'compass',
  rabbana: 'book',
};

/** Progress resets every day (in the user's time zone). */
function useDailyProgress() {
  const [settings] = useStore(settingsStore);
  const [progress, setProgress] = useStore(adhkarStore);
  const today = dayKey(dayIn(settings.place?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone));
  useEffect(() => {
    if (progress.date !== today) setProgress({ date: today, done: {} });
  }, [today, progress.date]);
  const done = progress.date === today ? progress.done : {};
  return { done, setProgress, today };
}

export function AdhkarIndex() {
  const { done } = useDailyProgress();
  return (
    <>
      <TopBar title="Adhkar et invocations" subtitle="حصن المسلم" backTo="/plus" />
      <div class="page">
        <div class="list">
          {ADHKAR.map((cat) => {
            const total = cat.items.length;
            const complete = cat.items.filter((d) => (done[d.id] ?? 0) >= d.count).length;
            return (
              <a class="list-item" href={`#/adhkar/${cat.id}`} key={cat.id}>
                <span class="badge">
                  <Icon name={ICONS[cat.id] ?? 'hands'} size={20} />
                </span>
                <div class="grow">
                  <div class="title">{cat.title}</div>
                  <div class="subtitle">
                    {cat.subtitle ?? `${total} invocations`}
                    {complete > 0 && ` · ${complete}/${total} aujourd’hui`}
                  </div>
                </div>
                <span class="surah-name-ar" style={{ fontSize: '1.1rem' }}>
                  {cat.titleAr}
                </span>
              </a>
            );
          })}
        </div>
        <p class="small muted" style={{ margin: '14px 4px' }}>
          Textes tirés du Coran et de la Sunna authentique, d’après « La citadelle du musulman » (Hisn al-Muslim) de Sa‘id al-Qahtani.
          Les traductions rendent le sens et ne remplacent pas l’arabe.
        </p>
      </div>
    </>
  );
}

export function AdhkarCategory({ id }: { id: string }) {
  const cat = ADHKAR.find((c) => c.id === id);
  const { done, setProgress, today } = useDailyProgress();
  if (!cat) return <AdhkarIndex />;

  const totalReps = cat.items.reduce((n, d) => n + d.count, 0);
  const doneReps = cat.items.reduce((n, d) => n + Math.min(d.count, done[d.id] ?? 0), 0);

  const increment = (d: Dhikr) => {
    const current = done[d.id] ?? 0;
    if (current >= d.count) return;
    haptic(current + 1 === d.count ? 60 : 10);
    setProgress({ date: today, done: { ...done, [d.id]: current + 1 } });
    if (current + 1 === d.count) {
      // Bring the next unfinished dhikr into view.
      const idx = cat.items.indexOf(d);
      const next = cat.items.slice(idx + 1).find((x) => (done[x.id] ?? 0) < x.count);
      if (next) setTimeout(() => document.getElementById(`d-${next.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    }
  };

  const reset = () => {
    const next = { ...done };
    cat.items.forEach((d) => delete next[d.id]);
    setProgress({ date: today, done: next });
  };

  return (
    <>
      <TopBar
        title={cat.title}
        subtitle={`${doneReps}/${totalReps} répétitions`}
        backTo="/adhkar"
        actions={
          <button class="icon-btn" aria-label="Recommencer" onClick={reset}>
            <Icon name="reset" />
          </button>
        }
      />
      <div class="page">
        <div class="progress" role="progressbar" aria-valuemin={0} aria-valuemax={totalReps} aria-valuenow={doneReps}>
          <div style={{ width: `${(doneReps / Math.max(1, totalReps)) * 100}%` }} />
        </div>
        {cat.subtitle && <SectionTitle>{cat.subtitle}</SectionTitle>}
        <div style={{ marginTop: cat.subtitle ? 0 : '14px' }}>
          {cat.items.map((d) => {
            const count = done[d.id] ?? 0;
            const finished = count >= d.count;
            return (
              <article class={`card dhikr ${finished ? 'done' : ''}`} id={`d-${d.id}`} key={d.id} style={{ scrollMarginTop: '70px' }}>
                {d.note && (
                  <div class="small" style={{ color: 'var(--gold)', fontWeight: 600, marginBottom: '6px' }}>
                    {d.note}
                  </div>
                )}
                <div class="ar" lang="ar">
                  {d.ar}
                </div>
                {d.translit && <div class="translit">{d.translit}</div>}
                <div class="fr">{d.fr}</div>
                {d.virtue && <div class="virtue">{d.virtue}</div>}
                <div class="dhikr-count">
                  <span class="meta" style={{ margin: 0 }}>
                    {d.source}
                  </span>
                  <span class="row" style={{ gap: '4px' }}>
                    <button class="icon-btn" aria-label="Partager" onClick={() => share(`${d.ar}\n\n${d.fr}\n\n— ${d.source}`)}>
                      <Icon name="share" size={20} />
                    </button>
                    <button class="counter-btn" onClick={() => increment(d)} aria-label={`Compter, ${count} sur ${d.count}`}>
                      {finished ? <Icon name="check" size={20} /> : null}
                      {count}/{d.count}
                    </button>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}
