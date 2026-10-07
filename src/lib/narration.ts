/**
 * Recorded narration for the story series: each episode is one audio file,
 * read beforehand by a neural French voice (see scripts/narration/), so every
 * phone hears the same warm voice instead of its built-in speech synthesizer.
 *
 * public/data/narration/index.json maps each episode to its file and, for each
 * text spoken in it (scene narration, verse translation), the time span where
 * it is read. Texts are matched by hash, so an edited scene simply falls back
 * to silent reading until the episode is recorded again.
 */

/** [start, end] of one spoken text in the episode file, in seconds. */
export type Span = [number, number];

export interface EpisodeNarration {
  url: string;
  spans: Record<string, Span>;
  /** Short name of the voice, e.g. "Gemini" or "Kokoro-82M". */
  voice: string;
}

interface NarrationIndex {
  voice: string;
  episodes: Record<string, { file: string; spans: Record<string, Span>; voice?: string }>;
}

/** FNV-1a over UTF-16 code units: short, stable id for a text (8 hex digits). */
export function textHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function episodeKey(storyId: string, episode: number) {
  return `${storyId}-${episode}`;
}

const base = () => `${import.meta.env.BASE_URL}data/narration/`;
let index: Promise<NarrationIndex | null> | null = null;

function loadIndex(): Promise<NarrationIndex | null> {
  index ??= fetch(`${base()}index.json`)
    .then((r) => (r.ok ? (r.json() as Promise<NarrationIndex>) : null))
    .catch(() => {
      index = null; // offline: try again next time
      return null;
    });
  return index;
}

/** The episode's recording, or null when it has none (the device voice is used). */
export async function loadNarration(storyId: string, episode: number): Promise<EpisodeNarration | null> {
  const entry = (await loadIndex())?.episodes[episodeKey(storyId, episode)];
  if (!entry) return null;
  const url = base() + entry.file;
  // With the service worker, fetch the whole file once so it is cached for offline
  // listening; the <audio> element itself only asks for byte ranges.
  if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) fetch(url).catch(() => {});
  const full = entry.voice ?? (await loadIndex())?.voice ?? '';
  return { url, spans: entry.spans, voice: full.split('(')[0].trim() };
}

export function spanFor(narration: EpisodeNarration, text: string): Span | undefined {
  return narration.spans[textHash(text)];
}

/** A silent WAV, played from the first tap so iOS lets the page play audio later. */
export const SILENCE =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

export interface SpanHandle {
  /** Stops playback and returns the position reached, to resume from it. */
  cancel(): number;
}

/**
 * Plays `span` of the file loaded in `audio`, from `from` if given, and calls
 * `onEnd` once when the span is over. If the browser refuses to play, calls
 * `onFail` instead so the caller can fall back to a reading pause.
 */
export function playSpan(
  audio: HTMLAudioElement,
  [start, end]: Span,
  { rate = 1, from, onEnd, onFail }: { rate?: number; from?: number; onEnd: () => void; onFail: () => void },
): SpanHandle {
  let done = false;
  const position = Math.min(Math.max(from ?? start, start), end);

  const seek = () => {
    audio.currentTime = position;
  };
  const unmute = () => {
    audio.muted = false;
  };
  const stop = () => {
    done = true;
    clearInterval(poll);
    clearTimeout(guard);
    audio.removeEventListener('ended', finish);
    audio.removeEventListener('error', fail);
    audio.removeEventListener('loadedmetadata', seek);
    audio.removeEventListener('seeked', unmute);
    audio.pause();
    audio.muted = false;
  };
  function finish() {
    if (done) return;
    stop();
    onEnd();
  }
  function fail() {
    if (done) return;
    stop();
    onFail();
  }

  audio.addEventListener('ended', finish);
  audio.addEventListener('error', fail);
  audio.playbackRate = rate;
  if (audio.readyState >= 1) {
    audio.muted = false;
    seek();
  } else {
    // iOS loads nothing before play(): start muted, seek once the duration is known.
    audio.muted = true;
    audio.addEventListener('loadedmetadata', seek, { once: true });
    audio.addEventListener('seeked', unmute, { once: true });
  }
  audio.play().catch((e: Error) => {
    // AbortError: a newer play/pause call took over; anything else: no audio.
    if (e.name !== 'AbortError') fail();
  });
  // The span ends between two "timeupdate" events: check more often.
  const poll = window.setInterval(() => !audio.muted && audio.currentTime >= end && finish(), 50);
  // Never hang on a stalled connection: the span plus a generous margin.
  const guard = window.setTimeout(fail, ((end - position) / rate) * 1000 + 15_000);

  return {
    cancel() {
      const at = audio.currentTime;
      stop();
      return at >= start && at < end ? at : start;
    },
  };
}
