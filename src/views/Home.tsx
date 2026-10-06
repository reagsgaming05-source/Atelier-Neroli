import { useMemo } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { SectionTitle } from '../components/ui';
import { PrayerList } from '../components/PrayerList';
import { formatHijri, hijriDate, noonUtc } from '../lib/hijri';
import { PRAYER_NAMES, dayIn, dayKey, formatCountdown, formatTime, nextPrayer, prayerTimes } from '../lib/prayer';
import { khatmStore, readingStore, settingsStore, useStore } from '../lib/settings';
import { useNow } from '../lib/store';
import { SURAHS } from '../data/surahs';
import { dailyVerse } from '../data/daily';
import { formatPortion, pageStart, todaysPortion } from '../lib/khatm';
import { GoalRow, ProgressRing, useGoals } from './Goals';
import { hadithTeaser, useCollection } from './Hadiths';

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

      <DayCard />
      <KhatmCard today={dayKey(today)} />

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
        <a class="tile" href="#/histoires">
          <span class="tile-icon gold">
            <Icon name="scroll" />
          </span>
          <strong>Histoires en séries</strong>
          <span>Illustrées et racontées à voix haute</span>
        </a>
        <a class="tile" href="#/quiz">
          <span class="tile-icon">
            <Icon name="question" />
          </span>
          <strong>Quiz</strong>
          <span>Testez vos connaissances</span>
        </a>
        <a class="tile" href="#/tasbih">
          <span class="tile-icon">
            <Icon name="beads" />
          </span>
          <strong>Tasbih</strong>
          <span>Compteur de dhikr</span>
        </a>
        <a class="tile" href="#/qibla">
          <span class="tile-icon gold">
            <Icon name="kaaba" />
          </span>
          <strong>Qibla</strong>
          <span>Boussole vers la Ka‘ba</span>
        </a>
      </div>

      <HadithOfTheDay index={today.y * 400 + today.m * 31 + today.d} />

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

/** Today's goals at a glance, with the next few to do. */
function DayCard() {
  const { list, done, ratio, toggle } = useGoals();
  const todo = list.filter((g) => !g.done).slice(0, 3);
  return (
    <>
      <SectionTitle action={<a href="#/journee">Tout voir</a>}>Ma journée</SectionTitle>
      <div class="card">
        <a class="row" href="#/journee" style={{ color: 'inherit', textDecoration: 'none' }}>
          <ProgressRing ratio={ratio} size={56} label={`${done} objectifs sur ${list.length}`} />
          <div class="grow">
            <div style={{ fontWeight: 700 }}>
              {done}/{list.length} bonnes actions
            </div>
            <div class="small muted">{todo.length ? 'Prochaines étapes ci-dessous' : 'Tout est fait, qu’Allah l’accepte !'}</div>
          </div>
        </a>
        {todo.length > 0 && (
          <div class="goals" style={{ padding: '4px 0 0' }}>
            {todo.map((s) => (
              <GoalRow key={s.goal.id} status={s} onToggle={() => toggle(s.goal.id)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function KhatmCard({ today }: { today: string }) {
  const [khatm] = useStore(khatmStore);
  const portion = todaysPortion(khatm, today);
  if (!portion) {
    return (
      <a class="card row" href="#/khatm" style={{ marginTop: '14px', color: 'inherit', textDecoration: 'none' }}>
        <span class="badge">
          <Icon name="book" size={20} />
        </span>
        <div class="grow">
          <div style={{ fontWeight: 650 }}>Lire tout le Coran</div>
          <div class="small muted">Choisissez un plan : un mois, deux mois, un an…</div>
        </div>
        <Icon name="chevron" size={18} />
      </a>
    );
  }
  const start = pageStart(portion.from);
  return (
    <div class="card row" style={{ marginTop: '14px' }}>
      <span class="badge">
        <Icon name={portion.doneToday ? 'check' : 'book'} size={20} />
      </span>
      <a class="grow" href="#/khatm" style={{ color: 'inherit', textDecoration: 'none' }}>
        <div style={{ fontWeight: 650 }}>{portion.finished ? 'Khatm terminée' : portion.doneToday ? 'Lecture du jour faite ✓' : `Lecture du jour : pages ${portion.from}–${portion.to}`}</div>
        <div class="small muted">{portion.finished || portion.doneToday ? 'Continuez si vous le souhaitez' : formatPortion(portion.from, portion.to)}</div>
      </a>
      {!portion.finished && (
        <a class="btn" style={{ minHeight: '40px', padding: '0 16px' }} href={`#/coran/${start.surah}?v=${start.verse}`}>
          Lire
        </a>
      )}
    </div>
  );
}

function HadithOfTheDay({ index }: { index: number }) {
  const nawawi = useCollection('nawawi');
  const qudsi = useCollection('qudsi');
  if (!nawawi.list || !qudsi.list) return null;
  const all = [...nawawi.list.map((h) => ({ ...h, id: 'nawawi' })), ...qudsi.list.map((h) => ({ ...h, id: 'qudsi' }))];
  const h = all[index % all.length];
  return (
    <>
      <SectionTitle>Hadith du jour</SectionTitle>
      <a class="card" href={`#/hadiths/${h.id}/${h.n}`} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
        <div class="hadith-text">{hadithTeaser(h.fr, 260)}</div>
        <div class="small muted" style={{ marginTop: '8px' }}>
          {h.id === 'nawawi' ? 'Les 40 hadiths d’an-Nawawī' : 'Hadiths qudsi'}, n° {h.n} · Lire en entier
        </div>
      </a>
    </>
  );
}
