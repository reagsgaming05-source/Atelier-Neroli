import { describe, expect, it, vi } from 'vitest';
import { Recitation, type MediaLike } from '../src/lib/recitation';

/** An <audio> element as far as the recitation is concerned. */
class FakeAudio implements MediaLike {
  preload: MediaLike['preload'] = '';
  paused = true;
  error: unknown = null;
  onended: MediaLike['onended'] = null;
  onerror: MediaLike['onerror'] = null;
  ontimeupdate: MediaLike['ontimeupdate'] = null;
  currentTime = 0;
  duration = NaN;
  readyState = 4;
  /** How many times a recording was (re)loaded: setting src loads, so does load(). */
  loads = 0;
  plays = 0;
  /** What play() does: resolve, or reject as a browser would. */
  outcome: null | 'NotAllowedError' | 'AbortError' = null;
  private _src = '';

  get src() {
    return this._src;
  }
  set src(url: string) {
    this._src = url;
    this.error = null;
    this.paused = true;
    this.loads++;
  }
  load() {
    this.error = null;
    this.loads++;
  }
  play() {
    this.plays++;
    if (this.outcome) return Promise.reject(Object.assign(new Error(this.outcome), { name: this.outcome }));
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  removeAttribute(name: string) {
    if (name === 'src') this._src = '';
  }
  /** Plays on to `t` seconds of a `duration`-second recording. */
  at(t: number, duration = 5) {
    this.currentTime = t;
    this.duration = duration;
    this.ontimeupdate?.(new Event('timeupdate'));
  }
  end() {
    this.paused = true;
    this.onended?.(new Event('ended'));
  }
  fail() {
    this.error = { code: 4 };
    this.onerror?.(new Event('error'));
  }
}

function setup({ lastVerse = 3 } = {}) {
  const made: FakeAudio[] = [];
  const events: string[] = [];
  const state = { repeat: 1, reciter: 'A' };
  const url = (verse: number, reciter = state.reciter) => `https://x/${reciter}/${verse}.mp3`;
  const recitation = new Recitation({
    url: (v) => url(v),
    lastVerse: () => lastVerse,
    repeat: () => state.repeat,
    onVerse: (v, r) => events.push(r ? `verse ${v} ×${r + 1}` : `verse ${v}`),
    onStop: (failed) => events.push(failed ? 'error' : 'end'),
    create: () => {
      const a = new FakeAudio();
      made.push(a);
      return a;
    },
  });
  return { recitation, made, events, state, url };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('recitation', () => {
  it('loads the next verse while the current one is recited', () => {
    const { recitation, made, events, url } = setup();
    recitation.play(1);
    expect(made).toHaveLength(2);
    expect(made.map((a) => a.preload)).toEqual(['auto', 'auto']);
    expect(made[0].src).toBe(url(1));
    expect(made[0].paused).toBe(false);
    expect(made[1].src).toBe(url(2));
    expect(made[1].paused).toBe(true);
    expect(events).toEqual(['verse 1']);
    expect(recitation.playing).toBe(1);
  });

  it('goes straight on to the verse loaded ahead, without reloading it', () => {
    const { recitation, made, events, url } = setup();
    recitation.play(1);
    const loads = made[1].loads;
    made[0].end();
    expect(made[1].paused).toBe(false);
    expect(made[1].loads).toBe(loads);
    // The element that has just finished now loads the verse after.
    expect(made[0].src).toBe(url(3));
    expect(made[0].paused).toBe(true);
    expect(events).toEqual(['verse 1', 'verse 2']);
    made[1].end();
    expect(made[0].paused).toBe(false);
    expect(events).toEqual(['verse 1', 'verse 2', 'verse 3']);
  });

  it('stops at the end of the surah and lets go of the recordings', () => {
    const { recitation, made, events } = setup();
    recitation.play(3);
    expect(made[1].src).toBe('');
    made[0].end();
    expect(events).toEqual(['verse 3', 'end']);
    expect(recitation.playing).toBe(0);
    for (const a of made) {
      expect(a.src).toBe('');
      expect(a.paused).toBe(true);
      expect(a.onended).toBeNull();
      expect(a.onerror).toBeNull();
    }
  });

  it('recites a verse several times before moving on, on the same element', () => {
    const { recitation, made, events, state, url } = setup();
    recitation.play(1);
    // Set after play(): the number of repetitions is read at each verse.
    state.repeat = 3;
    const loads = made[0].loads;
    made[0].end();
    made[0].end();
    expect(made[0].plays).toBe(3);
    expect(made[0].loads).toBe(loads);
    expect(made[1].src).toBe(url(2));
    made[0].end();
    expect(made[1].paused).toBe(false);
    expect(events).toEqual(['verse 1', 'verse 1 ×2', 'verse 1 ×3', 'verse 2']);
  });

  it('hears a change of reciter from the next verse', () => {
    const { recitation, made, events, state, url } = setup();
    recitation.play(1);
    state.reciter = 'B';
    made[0].end();
    // The verse loaded ahead was the old reciter's: the new one's is loaded instead.
    const [active, idle] = made[0].paused ? [made[1], made[0]] : [made[0], made[1]];
    expect(active.src).toBe(url(2, 'B'));
    expect(idle.src).toBe(url(3, 'B'));
    expect(idle.paused).toBe(true);
    expect(events).toEqual(['verse 1', 'verse 2']);
  });

  it('reports a recording that cannot be played', () => {
    const { recitation, made, events } = setup();
    recitation.play(1);
    made[0].fail();
    expect(events).toEqual(['verse 1', 'error']);
    expect(recitation.playing).toBe(0);
    expect(made[1].src).toBe('');
  });

  it('keeps quiet about a failed load ahead and tries again when its turn comes', () => {
    const { recitation, made, events, url } = setup();
    recitation.play(1);
    made[1].fail();
    expect(events).toEqual(['verse 1']);
    const loads = made[0].loads + made[1].loads;
    made[0].end();
    const [active, idle] = made[0].paused ? [made[1], made[0]] : [made[0], made[1]];
    expect(active.src).toBe(url(2));
    expect(active.error).toBeNull();
    expect(idle.src).toBe(url(3));
    expect(made[0].loads + made[1].loads).toBeGreaterThan(loads);
    expect(events).toEqual(['verse 1', 'verse 2']);
  });

  it('reports a browser that refuses to play, but not an interrupted play()', async () => {
    const { recitation, made, events } = setup();
    recitation.play(1);
    made[1].outcome = 'AbortError';
    made[0].end();
    await tick();
    expect(events).toEqual(['verse 1', 'verse 2']);
    made[1].outcome = 'NotAllowedError';
    recitation.play(2);
    await tick();
    expect(events).toEqual(['verse 1', 'verse 2', 'verse 2', 'error']);
  });

  it('ignores the refusal of a play() that a later verse superseded', async () => {
    const { recitation, made, events } = setup();
    recitation.play(1);
    made[0].outcome = 'NotAllowedError';
    recitation.play(3); // this play() will be refused, but...
    made[0].outcome = null;
    recitation.play(2); // ...the recitation has moved to the other element before the refusal lands
    await tick();
    expect(events).toEqual(['verse 1', 'verse 3', 'verse 2']);
    expect(recitation.playing).toBe(2);
  });

  it('switches at once to another verse that was tapped', () => {
    const { recitation, made, url } = setup({ lastVerse: 5 });
    recitation.play(1);
    // The next verse is already loaded on the other element.
    recitation.play(2);
    expect(made[1].src).toBe(url(2));
    expect(made[1].paused).toBe(false);
    expect(made[0].src).toBe(url(3));
    expect(made[0].paused).toBe(true);
    // Any other verse is loaded on the spot on the element in use.
    recitation.play(5);
    expect(made[1].src).toBe(url(5));
    expect(made[1].paused).toBe(false);
    expect(made[0].paused).toBe(true);
    expect(recitation.playing).toBe(5);
  });

  it('pauses and resumes the element in use', () => {
    const { recitation, made } = setup();
    recitation.play(1);
    recitation.toggle();
    expect(recitation.paused).toBe(true);
    expect(made[0].paused).toBe(true);
    recitation.toggle();
    expect(recitation.paused).toBe(false);
    expect(made[0].paused).toBe(false);
    made[0].end();
    recitation.pause();
    expect(made[1].paused).toBe(true);
    recitation.resume();
    expect(made[1].paused).toBe(false);
  });

  it('stops quietly, without an error event', () => {
    const { recitation, made, events } = setup();
    recitation.play(2);
    recitation.stop();
    expect(recitation.playing).toBe(0);
    expect(recitation.paused).toBe(true);
    for (const a of made) {
      expect(a.src).toBe('');
      expect(a.onerror).toBeNull();
    }
    expect(events).toEqual(['verse 2']);
    // Playing again starts afresh.
    recitation.play(1);
    expect(made[0].paused).toBe(false);
    expect(events).toEqual(['verse 2', 'verse 1']);
  });

  it('starts the next verse just before the current one ends, and lets it play out', () => {
    vi.useFakeTimers();
    try {
      const { recitation, made, events, url } = setup();
      recitation.play(1);
      made[0].at(4, 5);
      vi.advanceTimersByTime(600);
      expect(made[1].paused).toBe(true);
      vi.advanceTimersByTime(200);
      // 0.3 s before the end of verse 1, verse 2 has started; verse 1 is not cut.
      expect(made[1].paused).toBe(false);
      expect(made[0].paused).toBe(false);
      expect(events).toEqual(['verse 1', 'verse 2']);
      // Only once verse 1 has played out does its element load verse 3.
      expect(made[0].src).toBe(url(1));
      made[0].end();
      expect(made[0].src).toBe(url(3));
      expect(events).toEqual(['verse 1', 'verse 2']);
      expect(recitation.playing).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('waits for the end when the verse is repeated, or the next one is not loaded yet', () => {
    vi.useFakeTimers();
    try {
      const { recitation, made, events, state } = setup();
      state.repeat = 2;
      recitation.play(1);
      made[0].at(4.9, 5);
      vi.advanceTimersByTime(1000);
      expect(made[1].paused).toBe(true);
      made[0].end();
      state.repeat = 1;
      made[1].readyState = 1;
      made[0].at(4.9, 5);
      vi.advanceTimersByTime(1000);
      expect(made[1].paused).toBe(true);
      made[0].end();
      expect(events).toEqual(['verse 1', 'verse 1 ×2', 'verse 2']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a pause cancels the early start', () => {
    vi.useFakeTimers();
    try {
      const { recitation, made } = setup();
      recitation.play(1);
      made[0].at(4.5, 5);
      recitation.pause();
      vi.advanceTimersByTime(1000);
      expect(made[1].paused).toBe(true);
      expect(recitation.playing).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
