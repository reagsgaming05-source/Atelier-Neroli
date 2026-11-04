import type { DayTimes } from '../lib/prayer';
import type { PrayerId } from '../lib/settings';

const MARKS: PrayerId[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const W = 320;
const H = 120;
const CX = W / 2;
const CY = 104;
const RX = 140;
const RY = 88;

/**
 * The day as the path of the sun, from Fajr to Isha: each prayer is a point on the
 * arc, the next one is lit, and a sun (or a moon at night) shows where we are now.
 */
export function DayArc({ times, next, now }: { times: DayTimes; next: PrayerId | null; now: Date }) {
  const first = times.fajr?.getTime();
  const last = times.isha?.getTime();
  if (!first || !last || last <= first) return null;
  const at = (t: number) => {
    const f = Math.min(1, Math.max(0, (t - first) / (last - first)));
    return { x: CX - RX * Math.cos(Math.PI * f), y: CY - RY * Math.sin(Math.PI * f) };
  };
  const t = now.getTime();
  const inDay = t >= first && t <= last;
  const here = at(t);
  const sunUp = times.sunrise && times.maghrib && t >= times.sunrise.getTime() && t <= times.maghrib.getTime();
  const travelled = inDay ? `M ${CX - RX} ${CY} A ${RX} ${RY} 0 0 1 ${here.x.toFixed(1)} ${here.y.toFixed(1)}` : '';
  return (
    <svg class="day-arc" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="La journée de prière">
      <line x1="0" x2={W} y1={CY} y2={CY} class="horizon" />
      <path d={`M ${CX - RX} ${CY} A ${RX} ${RY} 0 0 1 ${CX + RX} ${CY}`} class="path" />
      {travelled && <path d={travelled} class="path done" />}
      {MARKS.map((id) => {
        const d = times[id];
        if (!d) return null;
        const p = at(d.getTime());
        return <circle key={id} cx={p.x} cy={p.y} r={id === next ? 5 : 3} class={id === next ? 'mark next' : d.getTime() <= t ? 'mark past' : 'mark'} />;
      })}
      {inDay && (
        <g transform={`translate(${here.x.toFixed(1)} ${here.y.toFixed(1)})`}>
          <circle r="13" class={sunUp ? 'glow' : 'glow night'} />
          <circle r="7" class={sunUp ? 'sun' : 'moon'} />
        </g>
      )}
    </svg>
  );
}
