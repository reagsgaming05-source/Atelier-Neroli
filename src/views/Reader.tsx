import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { Spinner, Stepper, TopBar, share, toast } from '../components/ui';
import { SAJDAS, SURAHS, juzOf } from '../data/surahs';
import { toArabicDigits } from '../lib/hijri';
import { PAGE_STARTS } from '../lib/khatm';
import { RECITERS, TRANSLATIONS, audioUrl, loadSurah } from '../lib/quran';
import { navigate } from '../lib/router';
import { readingStore, settingsStore, useStore } from '../lib/settings';

const BASMALA = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ';

interface Texts {
  ar: string[];
  tr: string[] | null;
  translit: string[] | null;
}

export function Reader({ surah, verse }: { surah: number; verse?: number }) {
  const info = SURAHS[surah - 1];
  const [settings, setSettings] = useStore(settingsStore);
  const [reading, setReading] = useStore(readingStore);
  const [texts, setTexts] = useState<Texts | null>(null);
  const [error, setError] = useState(false);
  const [panel, setPanel] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const audio = useRef<HTMLAudioElement | null>(null);
  const repeats = useRef(0);
  const qs = settings.quran;

  useEffect(() => {
    let cancelled = false;
    setTexts(null);
    setError(false);
    Promise.all([
      loadSurah('ar', surah),
      qs.translation === 'none' ? null : loadSurah(qs.translation, surah),
      qs.translit ? loadSurah('translit', surah) : null,
    ])
      .then(([ar, tr, translit]) => !cancelled && setTexts({ ar, tr, translit }))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [surah, qs.translation, qs.translit]);

  // Jump to the requested verse once the text is on screen (not again when
  // display options reload the text).
  const scrolledTo = useRef('');
  useEffect(() => {
    if (!texts || scrolledTo.current === `${surah}:${verse}`) return;
    scrolledTo.current = `${surah}:${verse}`;
    if (verse && verse > 1) {
      requestAnimationFrame(() => document.getElementById(`v${verse}`)?.scrollIntoView({ block: 'start' }));
    } else {
      window.scrollTo(0, 0);
    }
  }, [texts, surah, verse]);

  // Remember the topmost visible verse as the reading position.
  useEffect(() => {
    if (!texts) return;
    let timer: number | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).map((e) => Number((e.target as HTMLElement).dataset.v));
        if (!visible.length) return;
        const v = Math.min(...visible);
        clearTimeout(timer);
        timer = window.setTimeout(() => setReading((r) => ({ ...r, last: { surah, verse: v } })), 800);
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );
    document.querySelectorAll('.verse').forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [texts, surah]);

  // Stop audio when leaving the surah.
  useEffect(() => () => stop(), [surah]);

  const play = (v: number, repeat = 0) => {
    if (!audio.current) {
      audio.current = new Audio();
      audio.current.preload = 'auto';
    }
    const el = audio.current;
    repeats.current = repeat;
    el.onended = () => {
      // Memorisation: recite the same verse `qs.repeat` times before moving on.
      if (repeats.current + 1 < qs.repeat) play(v, repeats.current + 1);
      else if (v < info.verses) play(v + 1);
      else stop();
    };
    el.onerror = () => {
      toast('Récitation indisponible : vérifiez votre connexion');
      stop();
    };
    el.src = audioUrl(qs.reciter, surah, v);
    el.play().catch(() => {
      /* error handler above reports failures */
    });
    setPlaying(v);
    setPaused(false);
    if (repeat === 0) document.getElementById(`v${v}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const stop = () => {
    audio.current?.pause();
    if (audio.current) audio.current.src = '';
    setPlaying(null);
    setPaused(false);
  };

  const togglePause = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setPaused(false);
    } else {
      el.pause();
      setPaused(true);
    }
  };

  const isBookmarked = (v: number) => reading.bookmarks.some((b) => b.surah === surah && b.verse === v);
  const toggleBookmark = (v: number) => {
    setReading((r) => ({
      ...r,
      bookmarks: isBookmarked(v)
        ? r.bookmarks.filter((b) => !(b.surah === surah && b.verse === v))
        : [...r.bookmarks, { surah, verse: v, at: Date.now() }],
    }));
    toast(isBookmarked(v) ? 'Marque-page retiré' : 'Marque-page ajouté');
  };

  const shareVerse = (v: number) => {
    if (!texts) return;
    const parts = [texts.ar[v - 1], texts.tr?.[v - 1], `— ${info.name} (${surah}:${v})`].filter(Boolean);
    share(parts.join('\n\n'));
  };

  const sajdaSet = new Set(SAJDAS.filter(([s]) => s === surah).map(([, v]) => v));
  const reciter = RECITERS.find((r) => r.id === qs.reciter) ?? RECITERS[0];

  return (
    <>
      <TopBar
        title={`${surah}. ${info.name}`}
        subtitle={info.fr}
        backTo="/coran"
        actions={
          <>
            <button class="icon-btn" aria-label="Écouter la sourate" onClick={() => (playing ? stop() : play(1))}>
              <Icon name={playing ? 'pause' : 'play'} />
            </button>
            <button class={`icon-btn ${panel ? 'active' : ''}`} aria-label="Options d’affichage" aria-expanded={panel} onClick={() => setPanel(!panel)}>
              <Icon name="settings" />
            </button>
          </>
        }
      />
      <div class="page" style={{ ['--quran-size' as string]: `${qs.arabicSize}px` }}>
        {panel && (
          <div class="card stack" style={{ marginBottom: '14px' }}>
            <div class="row">
              <span class="grow">Taille du texte arabe</span>
              <Stepper
                label="Taille du texte arabe"
                value={qs.arabicSize}
                min={20}
                max={52}
                step={2}
                onChange={(v) => setSettings((s) => ({ ...s, quran: { ...s.quran, arabicSize: v } }))}
              />
            </div>
            <div>
              <div class="small muted" style={{ marginBottom: '6px' }}>
                Traduction
              </div>
              <div class="chip-row">
                {(['fr-hamidullah', 'fr-maash', 'none'] as const).map((t) => (
                  <button
                    class="chip"
                    aria-pressed={qs.translation === t}
                    key={t}
                    onClick={() => setSettings((s) => ({ ...s, quran: { ...s.quran, translation: t } }))}
                  >
                    {t === 'none' ? 'Aucune' : TRANSLATIONS[t].label}
                  </button>
                ))}
              </div>
            </div>
            <label class="row">
              <span class="grow">Translittération</span>
              <input
                type="checkbox"
                role="switch"
                class="switch"
                checked={qs.translit}
                onChange={(e) => setSettings((s) => ({ ...s, quran: { ...s.quran, translit: (e.target as HTMLInputElement).checked } }))}
              />
            </label>
            <label class="row">
              <span class="grow">
                Mode mémorisation
                <span class="small muted" style={{ display: 'block' }}>
                  Le texte arabe reste flou : récitez de mémoire, puis touchez le verset pour vérifier.
                </span>
              </span>
              <input
                type="checkbox"
                role="switch"
                class="switch"
                checked={qs.hifz}
                onChange={(e) => {
                  setRevealed(new Set());
                  setSettings((s) => ({ ...s, quran: { ...s.quran, hifz: (e.target as HTMLInputElement).checked } }));
                }}
              />
            </label>
            <div>
              <div class="small muted" style={{ marginBottom: '6px' }}>
                Répéter chaque verset
              </div>
              <div class="chip-row">
                {[1, 3, 5, 10].map((n) => (
                  <button
                    class="chip"
                    aria-pressed={qs.repeat === n}
                    key={n}
                    onClick={() => setSettings((s) => ({ ...s, quran: { ...s.quran, repeat: n } }))}
                  >
                    {n === 1 ? '1 fois' : `${n} fois`}
                  </button>
                ))}
              </div>
            </div>
            <label class="field">
              <span>Récitateur</span>
              <select
                class="input"
                value={qs.reciter}
                onChange={(e) => setSettings((s) => ({ ...s, quran: { ...s.quran, reciter: (e.target as HTMLSelectElement).value } }))}
              >
                {RECITERS.map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div class="reader-head">
          <div class="ar">سُورَةُ {info.ar}</div>
          <div class="meta">
            {info.fr} · {info.verses} versets · {info.revelation === 'M' ? 'Mecquoise' : 'Médinoise'} · Juz’ {juzOf(surah, 1)}
          </div>
        </div>

        {error && (
          <div class="notice">
            Impossible de charger cette sourate. Connectez-vous une première fois, ou téléchargez le Coran complet depuis les réglages pour
            la lecture hors-ligne.
          </div>
        )}
        {!texts && !error && <Spinner />}

        {texts && (
          <>
            {surah !== 1 && surah !== 9 && <div class="ar basmala">{BASMALA}</div>}
            {texts.ar.map((ar, i) => {
              const v = i + 1;
              const cls = [
                'verse',
                v === verse ? 'highlight' : '',
                v === playing ? 'playing' : '',
                qs.hifz ? 'hifz' : '',
                revealed.has(v) ? 'revealed' : '',
              ].join(' ');
              const page = PAGE_STARTS.get(`${surah}:${v}`);
              return (
                <article class={cls} id={`v${v}`} data-v={v} key={v}>
                  {page && v > 1 && <div class="page-mark">Page {page}</div>}
                  <div class="verse-tools">
                    <span class="badge">
                      {surah}:{v}
                    </span>
                    {sajdaSet.has(v) && <span class="sajda-mark">۩ Prosternation</span>}
                    <button class="icon-btn" aria-label={`Écouter le verset ${v}`} onClick={() => (playing === v ? togglePause() : play(v))}>
                      <Icon name={playing === v && !paused ? 'pause' : 'play'} size={20} />
                    </button>
                    <button
                      class={`icon-btn ${isBookmarked(v) ? 'active' : ''}`}
                      aria-label="Marque-page"
                      aria-pressed={isBookmarked(v)}
                      onClick={() => toggleBookmark(v)}
                    >
                      <Icon name="bookmark" size={20} fill={isBookmarked(v) ? 'currentColor' : 'none'} />
                    </button>
                    <button class="icon-btn" aria-label="Partager" onClick={() => shareVerse(v)}>
                      <Icon name="share" size={20} />
                    </button>
                  </div>
                  <p
                    class="ar"
                    lang="ar"
                    style={{ margin: 0 }}
                    onClick={qs.hifz ? () => setRevealed((r) => new Set(r).add(v)) : undefined}
                  >
                    {ar} <span class="verse-num">﴿{toArabicDigits(v)}﴾</span>
                  </p>
                  {texts.translit && <p class="translit" style={{ margin: '6px 0 0' }}>{texts.translit[i]}</p>}
                  {texts.tr && <p class="tr" style={{ margin: '8px 0 0' }}>{texts.tr[i]}</p>}
                </article>
              );
            })}
            {qs.translation !== 'none' && (
              <p class="small muted" style={{ marginTop: '16px' }}>
                Traduction : {TRANSLATIONS[qs.translation].label} ({TRANSLATIONS[qs.translation].source}). Une traduction rend le sens, elle
                ne remplace pas le texte arabe.
              </p>
            )}
            <div class="reader-nav">
              {surah > 1 && (
                <button class="btn secondary" onClick={() => navigate(`/coran/${surah - 1}`)}>
                  <Icon name="back" size={18} /> {SURAHS[surah - 2].name}
                </button>
              )}
              {surah < 114 && (
                <button class="btn" onClick={() => navigate(`/coran/${surah + 1}`)}>
                  {SURAHS[surah].name} <Icon name="chevron" size={18} />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {playing && (
        <div class="player" role="region" aria-label="Lecteur audio">
          <div class="grow small">
            <div style={{ fontWeight: 650 }}>
              {info.name} · verset {playing}
            </div>
            <div style={{ opacity: 0.75 }}>{reciter.name}</div>
          </div>
          <button class="icon-btn" aria-label={paused ? 'Reprendre' : 'Pause'} onClick={togglePause}>
            <Icon name={paused ? 'play' : 'pause'} />
          </button>
          <button class="icon-btn" aria-label="Arrêter" onClick={stop}>
            <Icon name="close" />
          </button>
        </div>
      )}
    </>
  );
}
