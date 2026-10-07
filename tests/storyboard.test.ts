import { describe, expect, it } from 'vitest';
import { SERIES } from '../src/data/series';
import { STORYBOARD } from '../src/data/storyboards';
import { MOTIFS, type Beat, type Scene } from '../src/data/types';

const SKIES = ['dawn', 'day', 'dusk', 'night', 'storm'];
const GROUNDS = ['desert', 'sea', 'mountains', 'valley', 'garden', 'city', 'river', 'plain', 'cave', 'none'];
const FOCUS = [...MOTIFS, 'sky', 'ground', 'horizon'] as string[];

const scenes = new Map<string, Scene>();
const order: string[] = [];
for (const s of SERIES)
  s.episodes.forEach((e, ei) =>
    e.scenes.forEach((sc, si) => {
      scenes.set(`${s.storyId}-${ei}-${si}`, sc);
      order.push(`${s.storyId}-${ei}-${si}`);
    }),
  );

/** What a beat shows once the omitted fields are inherited. */
function resolve(scene: Scene, beats: Beat[]) {
  let sky = scene.sky, ground = scene.ground, motifs = scene.motifs ?? [];
  return beats.map((b) => {
    sky = b.sky ?? sky;
    ground = b.ground ?? ground;
    motifs = b.motifs ?? motifs;
    return { sky, ground, motifs: [...motifs], focus: b.focus, cut: !!b.cut };
  });
}

describe('storyboard entries', () => {
  const entries = Object.entries(STORYBOARD);

  it.each(entries)('%s: is a valid sequence of pictures of an existing scene', (key, beats) => {
    const scene = scenes.get(key);
    expect(scene, `no scene ${key}`).toBeDefined();
    expect(beats.length).toBeGreaterThanOrEqual(1);
    expect(beats.length).toBeLessThanOrEqual(5);
    expect(beats[0].at).toBe('');
    let previous = -1;
    beats.forEach((b, i) => {
      if (i === 0) return;
      const at = scene!.text.indexOf(b.at);
      expect(b.at.length, `${key}: beat ${i} starts with too few words`).toBeGreaterThanOrEqual(6);
      expect(at, `${key}: "${b.at}" is not in the scene text`).toBeGreaterThan(0);
      expect(at - previous, `${key}: beats ${i - 1} and ${i} are too close`).toBeGreaterThanOrEqual(i === 1 ? 25 : 25);
      previous = at;
    });
    for (const r of resolve(scene!, beats)) {
      expect(SKIES).toContain(r.sky);
      expect(GROUNDS).toContain(r.ground);
      expect(r.motifs.length).toBeLessThanOrEqual(7);
      for (const m of r.motifs) expect(MOTIFS as readonly string[]).toContain(m);
      if (r.focus) {
        expect(FOCUS, `${key}: unknown focus ${r.focus}`).toContain(r.focus);
        if (!['sky', 'ground', 'horizon'].includes(r.focus)) expect(r.motifs, `${key}: focus ${r.focus} is not in the picture`).toContain(r.focus);
      }
    }
    // The scene ends on what it started with only when the text says nothing happens: not checked.
  });

  it('every picture follows from the previous one: something carries over unless it is a deliberate cut', () => {
    const problems: string[] = [];
    let last: ReturnType<typeof resolve>[number] | null = null;
    let lastEpisode = '';
    for (const key of order) {
      const beats = STORYBOARD[key];
      const episode = key.replace(/-\d+$/, '');
      if (!beats) {
        last = null;
        continue;
      }
      const rs = resolve(scenes.get(key)!, beats);
      if (episode !== lastEpisode) last = null; // a new episode starts afresh
      lastEpisode = episode;
      rs.forEach((r, i) => {
        if (last && !r.cut) {
          const shares = r.ground === last.ground || r.motifs.some((m) => last!.motifs.includes(m)) || (r.sky === last.sky && r.sky !== 'day');
          if (!shares) problems.push(`${key} beat ${i}: ${last.sky}/${last.ground}/${last.motifs.join('+')} -> ${r.sky}/${r.ground}/${r.motifs.join('+')}`);
        }
        last = r;
      });
    }
    expect(problems.slice(0, 15)).toEqual([]);
  });
});

describe('storyboard coverage', () => {
  it('has pictures for every scene', () => {
    const missing = order.filter((k) => !STORYBOARD[k]);
    expect(missing.slice(0, 20), `${missing.length} scenes without pictures`).toEqual([]);
  });

  it('shows something new about every 12 seconds of narration (about 170 characters)', () => {
    const long = order.filter((k) => scenes.get(k)!.text.length > 220 && STORYBOARD[k]);
    const single = long.filter((k) => STORYBOARD[k].length < 2);
    expect(single.slice(0, 15)).toEqual([]);
  });
});
