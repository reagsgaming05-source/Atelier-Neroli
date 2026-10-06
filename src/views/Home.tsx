import { useMemo } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { SectionTitle } from '../components/ui';
import { PrayerList } from '../components/PrayerList';
import { formatHijri, hijriDate, noonUtc } from '../lib/hijri';
import { PRAYER_NAMES, dayIn, formatCountdown, formatTime, nextPrayer, prayerTimes } from '../lib/prayer';
import { readingStore, settingsStore, useStore } from '../lib/settings';
import { useNow } from '../lib/store';
import { SURAHS } from '../data/surahs';
import { dailyVerse } from '../data/daily';

export function Home() {
  const [settings] = useStore(settingsStore);
  const [reading] = useStore(readingStore);
  const now = useNow(1000);
  const place = settings.place!;
  const today = dayIn(place.tz, now);
  const dayKeyStr = `${today.y}-${today.m}-${today.d}`;

  const times = useMemo(() => prayerTimes(settings, place, today), [settings, place, dayKeyStr]);
  const next = nextPrayer(settings, place, now);
  const hijri = hijriDate(noonUtc(today.y, today.m, today.d), settings.hijriOffset);
  const gregorian = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: place.tz }).format(now);
  const isFriday = new Date(Date.UTC(today.y, today.m - 1, today.d)).getUTCDay() === 5;

  let progress = 0;
  if (next?.currentStart) {
    const span = next.time.getTime() - next.currentStart.getTime();
    progress = Math.min(1, (now.getTime() - next.currentStart.getTime()) / span);
  }

  // Suggest the adhkar that fit the time of day: morning from Fajr to Asr, evening after.
  const adhkarId =
    times.asr && now >= times.asr ? 'soir' : times.fajr && now >= times.fajr ? 'matin' : 'soir';
  const verse = dailyVerse(today);

  return (
    <div class="page">
      <section class="hero">
        <div class="hero-top">
          <a class="hero-place" href="#/lieu">
            <Icon name="pin" size={18} />
            {place.name}
          </a>
          <a class="icon-btn" href="#/reglages" aria-label="Réglages">
            <Icon name="settings" />
          </a>
        </div>
        <div class="hero-dates">
          <div class="ar">{formatHijri(hijri, 'ar')}</div>
          <div>
            <span style={{ textTransform: 'capitalize' }}>{gregorian}</span> · {formatHijri(hijri)}
          </div>
        </div>
        {next ? (
          <div class="hero-next">
            <div class="label">{next.id === 'sunrise' ? 'Prochain évènement' : 'Prochaine prière'}</div>
            <div class="name">
              <strong>{next.id === 'dhuhr' && isFriday ? 'Jumu‘a' : PRAYER_NAMES[next.id].fr}</strong>
              <span class="ar">{next.id === 'dhuhr' && isFriday ? 'الجمعة' : PRAYER_NAMES[next.id].ar}</span>
            </div>
            <div class="count" aria-live="off">
              dans <b>{formatCountdown(next.time.getTime() - now.getTime())}</b>
            </div>
            <div class="hero-progress" aria-hidden="true">
              <div style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        ) : (
          <p>Horaires indisponibles pour ce lieu aujourd’hui.</p>
        )}
      </section>

      {hijri.m === 9 && (
        <div class="card row" style={{ marginTop: '14px' }}>
          <span class="badge" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}>
            <Icon name="moon" size={20} />
          </span>
          <div class="grow">
            <div style={{ fontWeight: 650 }}>Ramadan · jour {hijri.d}</div>
            <div class="small muted">
              Imsak {formatTime(times.imsak, place.tz, settings.clock)} · Fajr {formatTime(times.fajr, place.tz, settings.clock)} · Iftar{' '}
              {formatTime(times.maghrib, place.tz, settings.clock)}
            </div>
          </div>
          {times.fajr && times.maghrib && now > times.fajr && now < times.maghrib && (
            <div class="small" style={{ textAlign: 'end', fontWeight: 650 }}>
              Iftar dans
              <br />
              {formatCountdown(times.maghrib.getTime() - now.getTime())}
            </div>
          )}
        </div>
      )}

      <SectionTitle action={<a href="#/prieres">Mois entier</a>}>Aujourd’hui</SectionTitle>
      <PrayerList times={times} next={next?.id ?? null} now={now} />

      <SectionTitle>Raccourcis</SectionTitle>
      <div class="tile-grid">
        <a class="tile" href={`#/adhkar/${adhkarId}`}>
          <span class="tile-icon gold">
            <Icon name={adhkarId === 'matin' ? 'sun' : 'moon'} />
          </span>
          <strong>Adhkar du {adhkarId}</strong>
          <span>{adhkarId === 'matin' ? 'Après Fajr jusqu’au milieu du jour' : 'Après Asr jusqu’à la nuit'}</span>
        </a>
        <a class="tile" href={reading.last ? `#/coran/${reading.last.surah}?v=${reading.last.verse}` : '#/coran'}>
          <span class="tile-icon">
            <Icon name="book" />
          </span>
          <strong>{reading.last ? 'Reprendre la lecture' : 'Lire le Coran'}</strong>
          <span>
            {reading.last
              ? `${SURAHS[reading.last.surah - 1].name}, verset ${reading.last.verse}`
              : '114 sourates, traduction française'}
          </span>
        </a>
        <a class="tile" href="#/tasbih">
          <span class="tile-icon">
            <Icon name="beads" />
          </span>
          <strong>Tasbih</strong>
          <span>Compteur de dhikr</span>
        </a>
        <a class="tile" href="#/qibla">
          <span class="tile-icon">
            <Icon name="kaaba" />
          </span>
          <strong>Qibla</strong>
          <span>Boussole vers la Ka‘ba</span>
        </a>
        {isFriday && (
          <a class="tile" href="#/coran/18">
            <span class="tile-icon gold">
              <Icon name="star" />
            </span>
            <strong>Sourate Al-Kahf</strong>
            <span>Recommandée le vendredi</span>
          </a>
        )}
        <a class="tile" href="#/coran/67">
          <span class="tile-icon">
            <Icon name="moon" />
          </span>
          <strong>Sourate Al-Mulk</strong>
          <span>À lire chaque soir</span>
        </a>
      </div>

      <SectionTitle>Verset du jour</SectionTitle>
      <a class="card" href={`#/coran/${verse.surah}?v=${verse.verse}`} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
        <div class="ar" style={{ fontSize: '1.6rem', textAlign: 'right' }}>
          {verse.ar}
        </div>
        <p style={{ margin: '8px 0 6px' }}>{verse.fr}</p>
        <div class="small muted">
          {SURAHS[verse.surah - 1].name} ({verse.surah}:{verse.verse})
        </div>
      </a>
    </div>
  );
}
