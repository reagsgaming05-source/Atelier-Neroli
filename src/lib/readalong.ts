/**
 * Read-along: where the voice is in a text, from the pauses it takes.
 *
 * A recorded text is a span of the episode's file. Read at a steady pace, the
 * position in the text would grow evenly with time, but a voice slows down,
 * hurries, and stops at commas and full stops: a page then turned, and words
 * lit up, before they were said. So the recording is listened to beforehand
 * (scripts/narration/marks.mjs): its pauses are matched with the punctuation
 * of the text, and each match pins a place in the text to a moment in the
 * file. Between two pins, the position grows evenly.
 */

/** [character offset in the text, time in the episode file in seconds], in order of both. */
export type Mark = [number, number];

/** A silence in the recording, in seconds. */
export interface Pause {
  start: number;
  end: number;
}

/** Offsets where a word starts after punctuation that a voice pauses at (, ; : . ! ? … and quotes, dashes, brackets). */
export function breaksOf(text: string): number[] {
  const out: number[] = [];
  const re = /[,;:.!?…»)\]—–]\s+(?=\S)|\s+(?=[«(\[—–])/g;
  for (let m = re.exec(text); m; m = re.exec(text)) out.push(m.index + m[0].length);
  return out;
}

/** Silences of at least `minFrames` frames whose level stays under `threshold`, given one level per frame. */
export function pausesOf(levels: ArrayLike<number>, frameSec: number, threshold: number, minFrames: number): Pause[] {
  const out: Pause[] = [];
  let from = -1;
  for (let i = 0; i <= levels.length; i++) {
    const quiet = i < levels.length && levels[i] < threshold;
    if (quiet && from < 0) from = i;
    if (!quiet && from >= 0) {
      if (i - from >= minFrames) out.push({ start: from * frameSec, end: i * frameSec });
      from = -1;
    }
  }
  return out;
}

/** Where the voice is in the text at time `t`: a character offset, from the marks of the text. */
export function charAt(marks: readonly Mark[], t: number): number {
  if (!marks.length) return 0;
  if (t <= marks[0][1]) return marks[0][0];
  for (let i = 1; i < marks.length; i++) {
    const [c1, t1] = marks[i];
    if (t <= t1) {
      const [c0, t0] = marks[i - 1];
      return t1 > t0 ? c0 + ((c1 - c0) * (t - t0)) / (t1 - t0) : c1;
    }
  }
  return marks[marks.length - 1][0];
}

/** The words already (or being) said, when the voice is at character `at`. */
export function wordsSaid(text: string, at: number): number {
  if (at <= 0) return 0;
  let n = 0;
  let start = 0;
  for (const w of text.split(' ')) {
    if (start <= at) n++;
    start += w.length + 1;
  }
  return n;
}

/**
 * Pins the text to the recording: `voice` is when the voice starts and stops
 * in the span, `pauses` the silences within it. The longest pauses are placed
 * first, each at the break of the text closest to where the voice should be
 * by then; a pause too far from every break (a breath, not punctuation) is
 * left out. Returns the marks, from the first word to the end of the text.
 */
export function alignMarks(text: string, voice: [number, number], pauses: Pause[], tolerance = 0.22): Mark[] {
  const length = text.length;
  const marks: Mark[] = [
    [0, voice[0]],
    [length, voice[1]],
  ];
  const free = new Set(breaksOf(text));
  const inside = pauses.filter((p) => p.start > voice[0] && p.end < voice[1]).sort((a, b) => b.end - b.start - (a.end - a.start));
  for (const p of inside) {
    const mid = (p.start + p.end) / 2;
    // The pins around this pause, and where in the text the voice should be at its middle.
    const after = marks.findIndex(([, t]) => t > mid);
    if (after <= 0) continue;
    const [c0, t0] = marks[after - 1];
    const [c1, t1] = marks[after];
    const expected = c0 + ((c1 - c0) * (mid - t0)) / (t1 - t0);
    let best = -1;
    for (const b of free) if (b > c0 && b < c1 && (best < 0 || Math.abs(b - expected) < Math.abs(best - expected))) best = b;
    if (best < 0 || Math.abs(best - expected) > tolerance * Math.max(c1 - c0, length * 0.25)) continue;
    free.delete(best);
    // The words before the break are said by the start of the pause, the next one starts at its end.
    marks.splice(after, 0, [best - 1, p.start], [best, p.end]);
  }
  return marks.map(([c, t]) => [c, Math.round(t * 1000) / 1000]);
}
