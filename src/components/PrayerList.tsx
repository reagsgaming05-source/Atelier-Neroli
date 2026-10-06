import { Icon } from './Icon';
import { haptic } from './ui';
import { PRAYER_NAMES, PRAYER_ORDER, dayKey, formatTime, type DayTimes } from '../lib/prayer';
import { prayerLogStore, settingsStore, useStore, type PrayerId } from '../lib/settings';

/** Today's prayers with a check button to log each one as performed. */
export function PrayerList({ times, next, now }: { times: DayTimes; next: PrayerId | null; now: Date }) {
  const [settings] = useStore(settingsStore);
  const [log, setLog] = useStore(prayerLogStore);
  const tz = settings.place!.tz;
  const key = dayKey(times.date);
  const dayLog = log[key] ?? {};

  const toggle = (id: Exclude<PrayerId, 'sunrise'>) => {
    haptic();
    setLog((prev) => ({ ...prev, [key]: { ...prev[key], [id]: !prev[key]?.[id] } }));
  };

  return (
    <div class="card prayers">
      {PRAYER_ORDER.map((id) => {
        const t = times[id];
        const past = !!t && t.getTime() <= now.getTime();
        const cls = ['prayer', id === 'sunrise' ? 'minor' : '', id === next ? 'next' : '', past ? 'past' : ''].join(' ');
        return (
          <div class={cls} key={id}>
            {id === 'sunrise' ? (
              <span class="tick-spacer" aria-hidden="true" />
            ) : (
              <button
                class="tick"
                aria-pressed={!!dayLog[id]}
                aria-label={`${PRAYER_NAMES[id].fr} accomplie`}
                disabled={!past && !dayLog[id]}
                onClick={() => toggle(id)}
                style={!past && !dayLog[id] ? { opacity: 0.4 } : undefined}
              >
                <Icon name="check" size={18} />
              </button>
            )}
            <div class="p-name">
              <b>{PRAYER_NAMES[id].fr}</b>
              <span class="ar">{PRAYER_NAMES[id].ar}</span>
            </div>
            <div class="p-time">{formatTime(t, tz, settings.clock)}</div>
          </div>
        );
      })}
    </div>
  );
}
