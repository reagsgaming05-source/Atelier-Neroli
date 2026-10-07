import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SERIES } from '../src/data/series';
import { episodeKey, textHash, type Span } from '../src/lib/narration';
// @ts-expect-error plain JavaScript build script
import { speakable } from '../scripts/narration/export.mjs';

const dir = join(__dirname, '../public/data/narration');
const indexPath = join(dir, 'index.json');
const index: { voice: string; episodes: Record<string, { file: string; spans: Record<string, Span> }> } | null = existsSync(indexPath)
  ? JSON.parse(readFileSync(indexPath, 'utf8'))
  : null;

describe('text hash', () => {
  it('is 32-bit FNV-1a', () => {
    expect(textHash('')).toBe('811c9dc5');
    expect(textHash('a')).toBe('e40c292c');
    expect(textHash('foobar')).toBe('bf9cf968');
  });
});

describe('spoken text', () => {
  it('reads translator brackets and asides naturally', () => {
    expect(speakable('C’est Toi [Seul] que nous adorons')).toBe('C’est Toi Seul que nous adorons');
    expect(speakable('Il dit (à ces récits) que')).toBe('Il dit, à ces récits, que');
    expect(speakable('Elle dit (Joseph!).')).toBe('Elle dit, Joseph!.');
  });

  it('respells names for a French voice, whole words only', () => {
    expect(speakable('Allah enseigna à Adam, puis à Lout.')).toBe('Allah enseigna à Adame, puis à Loute.');
    expect(speakable('d’Iblis et de Dhoul-Qarnayn')).toBe('d’Iblisse et de Dhoul-Qarnaïne');
    expect(speakable('Adama Louter')).toBe('Adama Louter');
  });
});

describe.skipIf(!index)('recorded narration', () => {
  const episodes = Object.entries(index?.episodes ?? {});

  it('names a voice and only known episodes', () => {
    expect(index!.voice).toBeTruthy();
    const keys = new Set(SERIES.flatMap((s) => s.episodes.map((_, n) => episodeKey(s.storyId, n))));
    for (const [key] of episodes) expect(keys.has(key), key).toBe(true);
  });

  it.each(episodes)('%s: file exists and spans follow each other', (key, entry) => {
    expect(existsSync(join(dir, entry.file)), entry.file).toBe(true);
    expect(entry.file.startsWith(`${key}.`)).toBe(true);
    const spans = Object.values(entry.spans).sort((a, b) => a[0] - b[0]);
    let at = 0;
    for (const [start, end] of spans) {
      expect(start).toBeGreaterThanOrEqual(at - 0.001);
      expect(end).toBeGreaterThan(start + 0.5);
      at = end;
    }
  });

  it.each(episodes)('%s: each text lasts about as long as it takes to read it', (key) => {
    const cut = key.lastIndexOf('-');
    const ep = SERIES.find((s) => s.storyId === key.slice(0, cut))!.episodes[Number(key.slice(cut + 1))];
    const spans = index!.episodes[key].spans;
    // A span cut in the wrong pause makes one text far too long and its neighbour far too short.
    const odd = ep.scenes
      .filter((s) => s.text.length > 80 && spans[textHash(s.text)])
      .map((s) => ({ text: s.text.slice(0, 40), rate: s.text.length / (spans[textHash(s.text)][1] - spans[textHash(s.text)][0]) }))
      .filter((s) => s.rate < 5 || s.rate > 30);
    expect(odd).toEqual([]);
  });

  it.each(episodes)('%s: every scene of the current script is recorded', (key) => {
    const cut = key.lastIndexOf('-');
    const ep = SERIES.find((s) => s.storyId === key.slice(0, cut))!.episodes[Number(key.slice(cut + 1))];
    const spans = index!.episodes[key].spans;
    const missing = ep.scenes.filter((s) => !spans[textHash(s.text)]).map((s) => s.text.slice(0, 60));
    // A scene edited since the recording is read in silence: record it again with
    // "node scripts/narration/export.mjs && python3 scripts/narration/build.py …".
    expect(missing).toEqual([]);
  });
});
