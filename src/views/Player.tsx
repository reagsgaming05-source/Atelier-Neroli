import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { Ambience, AMBIENCE_LEVEL, createAudioContext, sceneMix } from '../lib/ambience';
import { SceneArt } from '../components/SceneArt';
import { PROPHET_STORIES } from '../data/prophets';
import { getSeries } from '../data/series';
import { SUNNAH_STORIES } from '../data/sunnah-stories';
import { SURAHS } from '../data/surahs';
import { audioUrl, loadSurah } from '../lib/quran';
import { navigate } from '../lib/router';
import { learnStore, settingsStore, useStore } from '../lib/settings';
import { loadNarration, playSpan, SILENCE, spanFor, type EpisodeNarration, type SpanHandle } from '../lib/narration';
import { readingTime, speak, speechSupported, stopSpeaking, type SpeakHandle } from '../lib/speech';

type Phase = 'text' | 'verse' | 'recite';

/** Where a story lives, for the back button and the end screen. */
function storyInfo(storyId: string) {
  const prophet = PROPHET_STORIES.find((s) => s.id === storyId);
  if (prophet) return { title: prophet.name, ar: prophet.nameAr, href: `/histoires/coran/${storyId}`, lessons: prophet.lessons };
  const sunnah = SUNNAH_STORIES.find((s) => s.id === storyId);
  if (sunnah) return { title: sunnah.title, ar: '', href: `/histoires/sunna/${storyId}`, lessons: sunnah.lessons };
  return null;
}

function startAmbience(): Ambience | null {
  const ctx = createAudioContext();
  if (!ctx) return null;
  const amb = new Ambience(ctx);
  amb.start();
  return amb;
}

export function Player({ storyId, episode }: { storyId: string; episode: number }) {
  const series = getSeries(storyId);
  const info = storyInfo(storyId);
  const ep = series?.episodes[episode];
  const [settings, setSettings] = useStore(settingsStore);
  const [, setLearn] = useStore(learnStore);
  const prefs = settings.stories;
  const translation = settings.quran.translation === 'none' ? 'fr-hamidullah' : settings.quran.translation;

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('text');
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [verses, setVerses] = useState<{ ar: string[]; tr: string[] } | null>(null);
  // The episode's recorded narration: undefined while loading, null if it has none.
  const [narration, setNarration] = useState<EpisodeNarration | null | undefined>(undefined);
  const narrator = useRef<HTMLAudioElement | null>(null);
  // Nature sounds under the voice, created from the first tap.
  const ambience = useRef<Ambience | null>(null);
  const wantAmbience = prefs.ambience;
  // Where the narration was paused, to resume mid-sentence.
  const resume = useRef<{ index: number; phase: Phase; at: number } | null>(null);

  const scene = ep?.scenes[index];
  const verseSurah = ep?.scenes.find((s) => s.verse)?.verse?.surah;

  // Verse texts for this episode (all its verses come from one surah).
  useEffect(() => {
    if (!verseSurah) return;
    let cancelled = false;
    Promise.all([loadSurah('ar', verseSurah), loadSurah(translation, verseSurah)])
      .then(([ar, tr]) => !cancelled && setVerses({ ar, tr }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [verseSurah, translation]);

  useEffect(() => {
    let cancelled = false;
    setNarration(undefined);
    loadNarration(storyId, episode)
      .then((n) => {
        if (cancelled) return;
        if (n) {
          narrator.current ??= new Audio();
          narrator.current.preload = 'auto';
          narrator.current.src = n.url;
        }
        setNarration(n);
      })
      .catch(() => !cancelled && setNarration(null));
    return () => {
      cancelled = true;
    };
  }, [storyId, episode]);

  const next = () => {
    if (!ep) return;
    if (index + 1 < ep.scenes.length) {
      setIndex(index + 1);
      setPhase('text');
    } else {
      setEnded(true);
      setPlaying(false);
      setLearn((s) => ({ ...s, read: { ...s.read, [`ep-${storyId}-${episode}`]: Date.now() } }));
    }
  };

  const prev = () => {
    setIndex(Math.max(0, index - 1));
    setPhase('text');
    setEnded(false);
  };

  // Plays the current step: narration, then the verse translation, then its recitation.
  const nextRef = useRef(next);
  nextRef.current = next;
  useEffect(() => {
    // Wait for the recording before the first word, so the voice never changes mid-episode.
    if (!started || !playing || ended || !scene || (prefs.voice && narration === undefined)) return;
    let speech: SpeakHandle | null = null;
    let recorded: SpanHandle | null = null;
    let audio: HTMLAudioElement | null = null;
    let timer: number | undefined;
    const rate = prefs.rate;
    const after = (fn: () => void, ms = 450) => (timer = window.setTimeout(fn, ms));
    const pause = (text: string, then: () => void) => (timer = window.setTimeout(then, readingTime(text, rate)));
    const say = (text: string, then: () => void) => {
      if (!prefs.voice) return pause(text, then);
      if (narration && narrator.current) {
        // A recorded episode never switches to the device voice: an unrecorded
        // text (an edited scene, another translation) is left to read in silence.
        const span = spanFor(narration, text);
        if (!span) return pause(text, then);
        const saved = resume.current;
        const from = saved && saved.index === index && saved.phase === phase ? saved.at : undefined;
        resume.current = null;
        recorded = playSpan(narrator.current, span, { rate, from, onEnd: () => after(then), onFail: () => pause(text, then) });
      } else if (speechSupported()) speech = speak(text, { rate, onEnd: () => after(then) });
      else pause(text, then);
    };

    if (phase === 'text') {
      say(scene.text, () => (scene.verse ? setPhase('verse') : nextRef.current()));
    } else if (phase === 'verse') {
      const tr = scene.verse && verses?.tr[scene.verse.verse - 1];
      if (tr) say(tr, () => (prefs.recitation ? setPhase('recite') : nextRef.current()));
      else after(() => nextRef.current(), 1500);
    } else if (phase === 'recite' && scene.verse) {
      audio = new Audio(audioUrl(settings.quran.reciter, scene.verse.surah, scene.verse.verse));
      audio.onended = () => after(() => nextRef.current(), 600);
      audio.onerror = () => after(() => nextRef.current());
      audio.play().catch(() => after(() => nextRef.current()));
      // Never wait more than a minute on a slow connection.
      timer = window.setTimeout(() => nextRef.current(), 60_000);
    }

    return () => {
      speech?.cancel();
      if (recorded) resume.current = { index, phase, at: recorded.cancel() };
      if (audio) {
        audio.onended = audio.onerror = null;
        audio.pause();
      }
      clearTimeout(timer);
    };
  }, [started, playing, ended, index, phase, verses, narration, prefs.voice, prefs.recitation, prefs.rate]);

  // Nature sounds follow the scene: they fade with it, and fall silent when paused.
  useEffect(() => {
    if (!started || !scene) return;
    const active = playing && !ended && wantAmbience;
    if (active) ambience.current ??= startAmbience();
    const amb = ambience.current;
    if (!amb) return;
    const ctx = amb.ctx as AudioContext;
    if (!active) {
      amb.setLevel(0, 0.8);
      const t = window.setTimeout(() => ctx.suspend().catch(() => {}), 1000);
      return () => clearTimeout(t);
    }
    ctx.resume().catch(() => {});
    amb.setMix(sceneMix(scene), 3);
    // Quieter still under the recitation, which is the Quran's own voice.
    amb.setLevel(phase === 'recite' ? AMBIENCE_LEVEL * 0.35 : AMBIENCE_LEVEL, 1.2);
  }, [started, playing, ended, index, phase, wantAmbience]);

  useEffect(
    () => () => {
      ambience.current?.dispose(0.4);
      ambience.current = null;
    },
    [],
  );

  // Keep the screen awake while a story plays.
  useEffect(() => {
    if (!playing) return;
    let lock: { release(): Promise<void> } | null = null;
    (navigator as unknown as { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock
      ?.request('screen')
      .then((l) => (lock = l))
      .catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, [playing]);

  useEffect(
    () => () => {
      stopSpeaking();
      narrator.current?.pause();
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const close = () => {
    stopSpeaking();
    narrator.current?.pause();
    navigate(info?.href ?? '/histoires', true);
  };

  if (!series || !ep || !info || !scene) {
    return (
      <div class="player-screen" style={{ placeItems: 'center', justifyContent: 'center', display: 'flex' }}>
        <p>Cette histoire n’est pas encore disponible en série.</p>
        <button class="btn" onClick={close}>
          Retour
        </button>
      </div>
    );
  }

  const start = () => {
    // iOS only lets a page speak or play sound after a tap: start the voice from this tap.
    if (prefs.voice && narration !== null) {
      const a = (narrator.current ??= new Audio());
      if (!a.src) a.src = SILENCE;
      a.play().catch(() => {});
      a.pause();
    }
    if (prefs.voice && !narration && speechSupported()) speechSynthesis.speak(new SpeechSynthesisUtterance(' '));
    // The sounds must also be started from this tap.
    if (wantAmbience) ambience.current ??= startAmbience();
    setStarted(true);
    setPlaying(true);
  };

  const isLast = episode + 1 >= series.episodes.length;
  const verse = scene.verse;
  // The verse stays on screen for the whole scene, so it can be read when paused.
  const showVerse = !!verse;
  const toggle = (key: 'voice' | 'recitation' | 'ambience') => setSettings((s) => ({ ...s, stories: { ...s.stories, [key]: !s.stories[key] } }));

  return (
    <div class="player-screen" role="dialog" aria-label={`${info.title}, ${ep.title}`}>
      <div class="player-stage">
        <div class={`kenburns fade-in ${index % 2 ? 'reverse' : ''}`} key={index}>
          <SceneArt sky={scene.sky} ground={scene.ground} motifs={scene.motifs} still={!playing} label={scene.text} />
        </div>

        <div class="player-top">
          <div class="player-bars" aria-hidden="true">
            {ep.scenes.map((_, i) => (
              <span key={i}>
                <i style={{ width: i < index || ended ? '100%' : i === index ? (phase === 'text' ? '35%' : '75%') : '0%' }} />
              </span>
            ))}
          </div>
          <div class="player-title">
            <div class="grow">
              <b>{info.title}</b>
              {series.episodes.length > 1 ? `Épisode ${episode + 1}/${series.episodes.length} · ` : ''}
              {ep.title}
            </div>
            <button class="icon-btn" aria-label="Fermer" onClick={close}>
              <Icon name="close" />
            </button>
          </div>
        </div>

        {started && !ended && (
          <div class="player-tap">
            <button aria-label="Scène précédente" onClick={prev} />
            <button aria-label={playing ? 'Pause' : 'Lecture'} onClick={() => setPlaying(!playing)} />
            <button aria-label="Scène suivante" onClick={next} />
          </div>
        )}

        {!started && (
          <div class="player-start">
            <button onClick={start}>
              <span>
                <Icon name="play" size={34} />
              </span>
              <span>{episode === 0 ? 'Regarder' : `Regarder l’épisode ${episode + 1}`}</span>
              <small style={{ fontWeight: 450, opacity: 0.8 }}>
                {!prefs.voice || (narration === null && !speechSupported())
                  ? 'Le texte défile automatiquement'
                  : narration === undefined
                    ? 'Chargement de la voix…'
                    : 'Avec narration — montez le son'}
              </small>
            </button>
          </div>
        )}

        {ended && (
          <div class="player-end">
            <h2>{isLast ? (series.episodes.length > 1 ? 'Fin de la série' : 'Fin de l’histoire') : 'Fin de l’épisode'}</h2>
            {isLast && info.lessons.length > 0 && (
              <ul class="lessons" style={{ textAlign: 'start', maxWidth: '520px', margin: '6px auto' }}>
                {info.lessons.slice(0, 3).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            )}
            {!isLast && (
              <button
                class="btn"
                style={{ background: '#d9b45a', color: '#1b1a12' }}
                onClick={() => navigate(`/serie/${storyId}/${episode + 2}`, true)}
              >
                Épisode suivant : {series.episodes[episode + 1].title} <Icon name="chevron" size={18} />
              </button>
            )}
            <button
              class="btn secondary"
              onClick={() => {
                setIndex(0);
                setPhase('text');
                setEnded(false);
                setPlaying(true);
              }}
            >
              <Icon name="reset" size={18} /> Revoir
            </button>
            <button class="btn ghost" style={{ color: '#f4efe1' }} onClick={close}>
              {isLast ? 'Leçons, versets et quiz' : 'Retour à la série'}
            </button>
          </div>
        )}
      </div>

      <div class="player-caption" aria-live="polite">
        <div class="narration">{scene.text}</div>
        {showVerse && verses && (
          <div class="fade-in">
            <div class="verse-ar" lang="ar">
              {verses.ar[verse.verse - 1]}
            </div>
            <div class="verse-fr">{verses.tr[verse.verse - 1]}</div>
            <div class="verse-ref">
              {SURAHS[verse.surah - 1].name}, verset {verse.verse}
              {phase === 'recite' ? ' · récitation' : ''}
            </div>
          </div>
        )}
        <div class="player-toggles">
          <button class="toggle" aria-pressed={prefs.voice} onClick={() => toggle('voice')}>
            Voix
          </button>
          <button class="toggle" aria-pressed={wantAmbience} onClick={() => toggle('ambience')}>
            Ambiance
          </button>
          <button class="toggle" aria-pressed={prefs.recitation} onClick={() => toggle('recitation')}>
            Récitation
          </button>
        </div>
        <div class="player-controls">
          <button class="icon-btn" aria-label="Scène précédente" onClick={prev} disabled={index === 0}>
            <Icon name="back" />
          </button>
          <button class="play" aria-label={playing ? 'Pause' : 'Lecture'} onClick={() => (started ? setPlaying(!playing) : start())}>
            <Icon name={playing ? 'pause' : 'play'} size={26} />
          </button>
          <button class="icon-btn" aria-label="Scène suivante" onClick={next}>
            <Icon name="chevron" />
          </button>
        </div>
      </div>
    </div>
  );
}
