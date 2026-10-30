/**
 * Verse-by-verse recitation that flows on without a pause between verses.
 *
 * everyayah.com serves one MP3 per verse. Reloading a single <audio> element
 * when a verse ended left a silence of up to a few seconds on a phone: the
 * next file was only fetched once the previous one was over. Here two
 * elements take turns: while one recites a verse, the other already loads
 * the next one, so when the first ends the second starts at once.
 *
 * Media elements are used rather than Web Audio so that the recitation goes
 * on with the screen locked, on iPhone as on Android.
 */

/** The part of HTMLMediaElement that the recitation relies on (a fake stands in for it in tests). */
export interface MediaLike {
  src: string;
  preload: '' | 'none' | 'metadata' | 'auto';
  readonly paused: boolean;
  readonly error: unknown;
  onended: ((this: any, ev: Event) => any) | null;
  onerror: ((this: any, ev: Event | string) => any) | null;
  load(): void;
  play(): Promise<void>;
  pause(): void;
  removeAttribute(name: string): void;
}

export interface RecitationOptions {
  /** Address of a verse's recording. Read at each verse, so a change of reciter is heard from the next verse. */
  url: (verse: number) => string;
  /** Last verse of the surah. */
  lastVerse: () => number;
  /** How many times each verse is recited before the next one (memorisation). Read at each verse. */
  repeat: () => number;
  /** A verse starts; `repetition` is 0 the first time, then 1, 2… */
  onVerse: (verse: number, repetition: number) => void;
  /** The last verse is over, or (`failed`) a recording could not be played. */
  onStop: (failed: boolean) => void;
  /** Makes an audio element; tests pass a fake. */
  create?: () => MediaLike;
}

/** Whether the element holds this recording, loaded or loading, and in good order. */
const holds = (el: MediaLike, url: string) => el.src === url && !el.error;

export class Recitation {
  private players: [MediaLike, MediaLike] | null = null;
  /** Index of the element reciting now; the other one loads ahead. */
  private current = 0;
  private verse = 0;
  private repetition = 0;
  /** Bumped at each start and stop, so a stale play() rejection is ignored. */
  private token = 0;

  constructor(private readonly o: RecitationOptions) {}

  /** The verse being recited (even if paused), or 0 when silent. */
  get playing(): number {
    return this.verse;
  }

  get paused(): boolean {
    return this.players?.[this.current].paused ?? true;
  }

  /**
   * Recites `verse`, then the following ones to the end of the surah.
   * Call it from a tap: a browser only lets an audio element play on its own
   * (here, when the previous verse ends) once that element has been loaded or
   * played during a user gesture. Both elements are prepared here for that.
   */
  play(verse: number) {
    this.start(verse, 0);
  }

  pause() {
    this.players?.[this.current].pause();
  }

  resume() {
    const el = this.players?.[this.current];
    if (el) el.play().catch(() => {});
  }

  toggle() {
    if (this.paused) this.resume();
    else this.pause();
  }

  /** Silence, and let go of the recordings. */
  stop() {
    this.token++;
    this.verse = 0;
    this.repetition = 0;
    for (const el of this.players ?? []) {
      el.onended = el.onerror = null;
      el.pause();
      // Dropping the attribute frees the recording quietly; setting src to ''
      // would raise an error event instead.
      el.removeAttribute('src');
      el.load();
    }
  }

  private ensure(): [MediaLike, MediaLike] {
    if (!this.players) {
      const create = this.o.create ?? (() => new Audio());
      this.players = [create(), create()];
      for (const el of this.players) el.preload = 'auto';
    }
    return this.players;
  }

  private start(verse: number, repetition: number) {
    const players = this.ensure();
    const url = this.o.url(verse);
    // Take the element that already holds this verse: the one loaded ahead, usually.
    let i = this.current;
    if (!holds(players[i], url) && holds(players[1 - i], url)) i = 1 - i;
    this.current = i;
    const el = players[i];
    const other = players[1 - i];
    this.verse = verse;
    this.repetition = repetition;
    const token = ++this.token;

    other.onended = other.onerror = null;
    other.pause();

    el.onended = () => this.advance();
    el.onerror = () => this.fail();
    if (!holds(el, url)) el.src = url;
    // On an element that has ended, play() starts over from the beginning: that is a repetition.
    el.play().catch((e: unknown) => {
      // Interrupted by a pause or another verse: nothing wrong. Otherwise the
      // browser refused to play (no error event is raised for that).
      if (token === this.token && (e as Error | null)?.name !== 'AbortError') this.fail();
    });

    // Load the next verse ahead on the idle element.
    if (verse < this.o.lastVerse()) {
      const next = this.o.url(verse + 1);
      if (!holds(other, next)) {
        other.src = next;
        // Setting src already loads; load() is what also lifts, on iPhone, the
        // gesture requirement for this element when called from a tap.
        other.load();
      }
    }

    this.o.onVerse(verse, repetition);
  }

  private advance() {
    if (this.repetition + 1 < this.o.repeat()) this.start(this.verse, this.repetition + 1);
    else if (this.verse < this.o.lastVerse()) this.start(this.verse + 1, 0);
    else {
      this.stop();
      this.o.onStop(false);
    }
  }

  private fail() {
    this.stop();
    this.o.onStop(true);
  }
}
