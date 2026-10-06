import { useMemo, useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { SectionTitle, TopBar } from '../components/ui';
import { HIJRI_MONTHS, ISLAMIC_EVENTS, formatHijri, gregorianFor, hijriDate, noonUtc, toArabicDigits, upcomingEvents } from '../lib/hijri';
import { dayIn } from '../lib/prayer';
import { settingsStore, useStore } from '../lib/settings';

const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function Calendar() {
  const [settings] = useStore(settingsStore);
  const offset = settings.hijriOffset;
  const tz = settings.place?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const t = dayIn(tz);
  const todayNoon = noonUtc(t.y, t.m, t.d);
  const todayH = hijriDate(todayNoon, offset);
  const [view, setView] = useState({ y: todayH.y, m: todayH.m });

  const days = useMemo(() => {
    const first = gregorianFor({ y: view.y, m: view.m, d: 1 }, offset, todayNoon);
    if (!first) return [];
    const list: { g: Date; h: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const g = new Date(first.getTime() + i * 86_400_000);
      const h = hijriDate(g, offset);
      if (h.m !== view.m) break;
      list.push({ g, h: h.d });
    }
    return list;
  }, [view.y, view.m, offset]);

  const shift = (delta: number) => {
    const index = view.y * 12 + (view.m - 1) + delta;
    setView({ y: Math.floor(index / 12), m: (index % 12) + 1 });
  };

  const lead = days.length ? (days[0].g.getUTCDay() + 6) % 7 : 0;
  const events = upcomingEvents(offset, todayNoon, 10);
  const monthEvents = ISLAMIC_EVENTS.filter((e) => e.m === view.m);
  const gregRange =
    days.length > 0
      ? `${fmt(days[0].g, { day: 'numeric', month: 'short' })} – ${fmt(days[days.length - 1].g, { day: 'numeric', month: 'short', year: 'numeric' })}`
      : '';

  return (
    <>
      <TopBar title="Calendrier hégirien" subtitle={formatHijri(todayH)} backTo="/plus" />
      <div class="page">
        <div class="card">
          <div class="row" style={{ marginBottom: '10px' }}>
            <button class="icon-btn" onClick={() => shift(-1)} aria-label="Mois précédent">
              <Icon name="back" size={20} />
            </button>
            <div class="grow center">
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                {HIJRI_MONTHS[view.m - 1].fr} {view.y}
              </div>
              <div class="ar" style={{ fontSize: '1.05rem', lineHeight: 1.5, direction: 'rtl' }}>
                {HIJRI_MONTHS[view.m - 1].ar} {toArabicDigits(view.y)}
              </div>
              <div class="small muted">{gregRange}</div>
            </div>
            <button class="icon-btn" onClick={() => shift(1)} aria-label="Mois suivant">
              <Icon name="chevron" size={20} />
            </button>
          </div>
          <div class="cal-grid">
            {DOW.map((d) => (
              <div class="dow" key={d}>
                {d}
              </div>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <div key={`e${i}`} />
            ))}
            {days.map(({ g, h }) => {
              const isToday = view.y === todayH.y && view.m === todayH.m && h === todayH.d;
              const hasEvent = monthEvents.some((e) => e.d === h);
              const white = h >= 13 && h <= 15;
              const cls = ['cal-day', isToday ? 'today' : '', hasEvent ? 'event' : '', white ? 'white' : ''].join(' ');
              return (
                <div class={cls} key={h}>
                  <b>{h}</b>
                  <small>{g.getUTCDate()}</small>
                </div>
              );
            })}
          </div>
          <div class="legend">
            <span class="l-event">Évènement</span>
            <span class="l-white">Jours blancs (13–15, jeûne recommandé)</span>
          </div>
        </div>

        {monthEvents.length > 0 && (
          <>
            <SectionTitle>Ce mois-ci</SectionTitle>
            <div class="list">
              {monthEvents.map((e) => (
                <div class="list-item" key={`${e.m}-${e.d}`}>
                  <span class="badge">{e.d}</span>
                  <div class="grow">
                    <div class="title">{e.title}</div>
                    <div class="subtitle">{e.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <SectionTitle>Prochains évènements</SectionTitle>
        <div class="list">
          {events.map(({ event, hijri, date }) => {
            const daysLeft = Math.round((date.getTime() - todayNoon.getTime()) / 86_400_000);
            return (
              <div class="list-item" key={`${hijri.y}-${event.m}-${event.d}`}>
                <div class="grow">
                  <div class="title">{event.title}</div>
                  <div class="subtitle">
                    {fmt(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {formatHijri(hijri)}
                  </div>
                </div>
                <span class="small muted" style={{ whiteSpace: 'nowrap' }}>
                  {daysLeft === 0 ? 'aujourd’hui' : `J-${daysLeft}`}
                </span>
              </div>
            );
          })}
        </div>
        <p class="small muted" style={{ margin: '14px 4px' }}>
          Dates calculées selon le calendrier Umm al-Qura. Le début des mois dépend de l’observation du croissant et peut différer d’un
          jour selon votre pays : ajustez le décalage dans les réglages et suivez l’annonce de votre mosquée.
        </p>
      </div>
    </>
  );
}

function fmt(d: Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('fr-FR', { ...opts, timeZone: 'UTC' }).format(d);
}
