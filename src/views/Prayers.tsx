import { useMemo, useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { PrayerList } from '../components/PrayerList';
import { SectionTitle, TopBar, toast } from '../components/ui';
import { downloadFile, buildIcs } from '../lib/ics';
import { hijriDate, noonUtc, HIJRI_MONTHS } from '../lib/hijri';
import { METHODS, PRAYER_ORDER, dayIn, dayKey, formatTime, nextPrayer, prayerTimes } from '../lib/prayer';
import { settingsStore, useStore } from '../lib/settings';
import { useNow } from '../lib/store';

export function Prayers() {
  const [settings] = useStore(settingsStore);
  const now = useNow(30_000);
  const place = settings.place!;
  const today = dayIn(place.tz, now);
  const [month, setMonth] = useState({ y: today.y, m: today.m });

  const todayTimes = prayerTimes(settings, place, today);
  const next = nextPrayer(settings, place, now);

  const days = useMemo(() => {
    const count = new Date(Date.UTC(month.y, month.m, 0)).getUTCDate();
    return Array.from({ length: count }, (_, i) => {
      const day = { y: month.y, m: month.m, d: i + 1 };
      return { day, times: prayerTimes(settings, place, day), hijri: hijriDate(noonUtc(day.y, day.m, day.d), settings.hijriOffset) };
    });
  }, [settings, place, month.y, month.m]);

  const shift = (delta: number) => {
    const d = new Date(Date.UTC(month.y, month.m - 1 + delta, 1));
    setMonth({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 });
  };

  const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(month.y, month.m - 1, 1)),
  );
  const todayKey = dayKey(today);

  const exportCalendar = () => {
    try {
      downloadFile(`prieres-${place.name.toLowerCase().replace(/\W+/g, '-')}.ics`, buildIcs(settings, 30), 'text/calendar');
      toast('Fichier calendrier créé — ouvrez-le pour l’ajouter');
    } catch {
      toast('Impossible de créer le fichier');
    }
  };

  return (
    <>
      <TopBar
        title="Horaires de prière"
        subtitle={`${place.name} · ${METHODS[settings.method].label}`}
        actions={
          <a class="icon-btn" href="#/reglages" aria-label="Réglages de calcul">
            <Icon name="settings" />
          </a>
        }
      />
      <div class="page">
        <PrayerList times={todayTimes} next={next?.id ?? null} now={now} />
        <div class="extra-times">
          <div>
            <small>Imsak</small>
            <b>{formatTime(todayTimes.imsak, place.tz, settings.clock)}</b>
          </div>
          <div>
            <small>Milieu de la nuit</small>
            <b>{formatTime(todayTimes.midnight, place.tz, settings.clock)}</b>
          </div>
          <div>
            <small>Dernier tiers</small>
            <b>{formatTime(todayTimes.lastThird, place.tz, settings.clock)}</b>
          </div>
        </div>

        <div class="row" style={{ marginTop: '14px', flexWrap: 'wrap' }}>
          <button class="btn secondary small grow" onClick={exportCalendar}>
            <Icon name="calendar" size={18} /> Ajouter à l’agenda
          </button>
          <a class="btn secondary small grow" href="#/suivi">
            <Icon name="check" size={18} /> Mon suivi
          </a>
        </div>
        <p class="small muted" style={{ margin: '8px 4px 0' }}>
          L’export agenda crée les 30 prochains jours avec une alerte à chaque prière : la façon la plus fiable d’être
          prévenu même application fermée.
        </p>

        <SectionTitle
          action={
            <span class="row" style={{ gap: '2px' }}>
              <button class="icon-btn" onClick={() => shift(-1)} aria-label="Mois précédent">
                <Icon name="back" size={20} />
              </button>
              <button class="icon-btn" onClick={() => shift(1)} aria-label="Mois suivant">
                <Icon name="chevron" size={20} />
              </button>
            </span>
          }
        >
          <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: '1rem', color: 'var(--text)' }}>{monthLabel}</span>
        </SectionTitle>
        <div class="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table class="month">
            <thead>
              <tr>
                <th style={{ textAlign: 'start', paddingInlineStart: '8px' }}>Jour</th>
                <th>Fajr</th>
                <th>Lever</th>
                <th>Dhuhr</th>
                <th>Asr</th>
                <th>Magh.</th>
                <th>Isha</th>
              </tr>
            </thead>
            <tbody>
              {days.map(({ day, times, hijri }) => {
                const date = new Date(Date.UTC(day.y, day.m - 1, day.d));
                const dow = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date).replace('.', '');
                const cls = [dayKey(day) === todayKey ? 'today' : '', date.getUTCDay() === 5 ? 'friday' : ''].join(' ');
                return (
                  <tr class={cls} key={day.d}>
                    <td>
                      {dow} {day.d}
                      <div class="muted" style={{ fontSize: '0.68rem', fontWeight: 400 }}>
                        {hijri.d} {HIJRI_MONTHS[hijri.m - 1].fr.split(' ')[0]}
                      </div>
                    </td>
                    {PRAYER_ORDER.map((id) => (
                      <td key={id}>{formatTime(times[id], place.tz, settings.clock)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p class="small muted" style={{ margin: '12px 4px' }}>
          Calcul astronomique : {METHODS[settings.method].detail}, Asr {settings.madhab === 'hanafi' ? 'hanafite' : 'majoritaire (shafi‘ite, malikite, hanbalite)'}.
          Comparez avec votre mosquée et ajustez à la minute près dans les réglages si besoin.
        </p>
      </div>
    </>
  );
}
