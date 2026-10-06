import { Icon } from '../components/Icon';
import { TopBar, haptic, toast } from '../components/ui';
import { dayIn, dayKey } from '../lib/prayer';
import { goalsStore, settingsStore, tasbihStore, useStore } from '../lib/settings';

const PHRASES = [
  { ar: 'سُبْحَانَ اللَّهِ', translit: 'Subḥāna-llāh', fr: 'Gloire à Allah', target: 33 },
  { ar: 'الْحَمْدُ لِلَّهِ', translit: 'Al-ḥamdu li-llāh', fr: 'Louange à Allah', target: 33 },
  { ar: 'اللَّهُ أَكْبَرُ', translit: 'Allāhu akbar', fr: 'Allah est le plus grand', target: 34 },
  { ar: 'لَا إِلَٰهَ إِلَّا اللَّهُ', translit: 'Lā ilāha illa-llāh', fr: 'Nulle divinité excepté Allah', target: 100 },
  { ar: 'أَسْتَغْفِرُ اللَّهَ', translit: 'Astaghfiru-llāh', fr: 'Je demande pardon à Allah', target: 100 },
  { ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', translit: 'Subḥāna-llāhi wa bi-ḥamdih', fr: 'Gloire et louange à Allah', target: 100 },
  { ar: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', translit: 'Allāhumma ṣalli ‘alā Muḥammad', fr: 'Ô Allah, prie sur Muhammad', target: 10 },
  { ar: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', translit: 'Lā ḥawla wa lā quwwata illā bi-llāh', fr: 'Il n’y a de force ni de puissance qu’en Allah', target: 100 },
];

const TARGETS = [33, 99, 100, 1000, 0];

/** Phrases whose hundredth repetition completes a goal of "Ma journée". */
const GOAL_FOR_PHRASE: Record<number, string> = { 4: 'istighfar', 5: 'subhanallah' };

export function Tasbih() {
  const [state, setState] = useStore(tasbihStore);
  const [settings, setSettings] = useStore(settingsStore);
  const phrase = PHRASES[state.phrase] ?? PHRASES[0];
  const today = dayKey(dayIn(settings.place?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone));
  const todayTotal = state.history[today] ?? 0;
  const target = state.target;
  const ratio = target > 0 ? (state.count % target || (state.count > 0 ? target : 0)) / target : 0;

  const tap = () => {
    const count = state.count + 1;
    const reached = target > 0 && count % target === 0;
    if (settings.tasbihVibrate) haptic(reached ? 120 : 10);
    setState((s) => ({ ...s, count, history: { ...s.history, [today]: (s.history[today] ?? 0) + 1 } }));
    if (reached) {
      const goal = GOAL_FOR_PHRASE[state.phrase];
      if (goal && count >= 100) {
        goalsStore.set((g) => ({ ...g, done: { ...g.done, [today]: { ...g.done[today], [goal]: true } } }));
      }
      // After 33 SubhanAllah, move on to the next phrase of the post-prayer sequence.
      if (state.phrase < 2 && target === phrase.target) {
        setState((s) => ({ ...s, phrase: s.phrase + 1, count: 0, target: PHRASES[s.phrase + 1].target }));
        toast(`${count} ✓ — passez à « ${PHRASES[state.phrase + 1].translit} »`);
      } else {
        toast(`${count} atteint, qu’Allah l’accepte`);
      }
    }
  };

  const choosePhrase = (i: number) => setState((s) => ({ ...s, phrase: i, count: 0, target: PHRASES[i].target }));

  const circumference = 2 * Math.PI * 49;

  return (
    <>
      <TopBar
        title="Tasbih"
        subtitle={`Aujourd’hui : ${todayTotal.toLocaleString('fr-FR')}`}
        backTo="/plus"
        actions={
          <button class="icon-btn" aria-label="Remettre à zéro" onClick={() => setState((s) => ({ ...s, count: 0 }))}>
            <Icon name="reset" />
          </button>
        }
      />
      <div class="page">
        <div class="chip-row">
          {PHRASES.map((p, i) => (
            <button class="chip" aria-pressed={state.phrase === i} onClick={() => choosePhrase(i)} key={i}>
              {p.translit}
            </button>
          ))}
        </div>
        <div class="tasbih">
          <div class="tasbih-phrase">
            <div class="ar" lang="ar">
              {phrase.ar}
            </div>
            <div class="muted">{phrase.fr}</div>
          </div>
          <button class="tasbih-btn" onClick={tap} aria-label={`Compter. Total ${state.count}`}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="49" fill="none" stroke="rgb(255 255 255 / 10%)" stroke-width="1.5" />
              <circle
                cx="50"
                cy="50"
                r="49"
                fill="none"
                stroke="#d9b45a"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-dasharray={circumference}
                stroke-dashoffset={circumference * (1 - ratio)}
                style={{ transition: 'stroke-dashoffset 0.15s' }}
              />
            </svg>
            <div class="n">{state.count}</div>
            <div class="t">{target > 0 ? `objectif ${target}` : 'sans limite'}</div>
          </button>
          <div class="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            {TARGETS.map((t) => (
              <button class="chip" aria-pressed={target === t} onClick={() => setState((s) => ({ ...s, target: t }))} key={t}>
                {t === 0 ? '∞' : t}
              </button>
            ))}
          </div>
          <label class="row small muted">
            <input
              type="checkbox"
              role="switch"
              class="switch"
              checked={settings.tasbihVibrate}
              onChange={(e) => setSettings((s) => ({ ...s, tasbihVibrate: (e.target as HTMLInputElement).checked }))}
            />
            Vibration à chaque grain (Android)
          </label>
        </div>
      </div>
    </>
  );
}
