import { describe, expect, it } from 'vitest';
import { LAYERS, sceneMix } from '../src/lib/ambience';
import { SERIES } from '../src/data/series';
import { MOTIFS, type Ground, type Sky } from '../src/data/types';

const SKIES: Sky[] = ['dawn', 'day', 'dusk', 'night', 'storm'];
const GROUNDS: Ground[] = ['desert', 'sea', 'mountains', 'valley', 'garden', 'city', 'river', 'plain', 'cave', 'none'];

describe('scene sounds', () => {
  it('only uses known sounds, between 0 and 1, for every sky, ground and motif', () => {
    for (const sky of SKIES)
      for (const ground of GROUNDS)
        for (const motif of [undefined, ...MOTIFS]) {
          const mix = sceneMix({ sky, ground, motifs: motif ? [motif] : [] });
          for (const [layer, level] of Object.entries(mix)) {
            expect(LAYERS as readonly string[]).toContain(layer);
            expect(level).toBeGreaterThan(0);
            expect(level).toBeLessThanOrEqual(1);
          }
        }
  });

  it('matches the place and the weather', () => {
    expect(sceneMix({ sky: 'day', ground: 'sea' }).sea).toBeGreaterThan(0.5);
    expect(sceneMix({ sky: 'storm', ground: 'plain' })).toMatchObject({ rain: expect.any(Number), thunder: expect.any(Number) });
    expect(sceneMix({ sky: 'night', ground: 'desert' }).night).toBeGreaterThan(0);
    expect(sceneMix({ sky: 'dawn', ground: 'garden' }).birds).toBeGreaterThan(0);
    expect(sceneMix({ sky: 'day', ground: 'desert', motifs: ['fire'] }).fire).toBeGreaterThan(0.5);
  });

  it('keeps the loudest request and drops what does not fit', () => {
    expect(sceneMix({ sky: 'day', ground: 'desert', motifs: ['wind'] }).wind).toBe(0.8);
    // no crickets at sea, in a cave or under rain; no birds in a storm
    expect(sceneMix({ sky: 'night', ground: 'sea' }).night).toBeUndefined();
    expect(sceneMix({ sky: 'night', ground: 'cave' }).night).toBeUndefined();
    expect(sceneMix({ sky: 'night', ground: 'plain', motifs: ['rain'] }).night).toBeUndefined();
    expect(sceneMix({ sky: 'storm', ground: 'garden', motifs: ['birds'] }).birds).toBeUndefined();
  });

  it('gives most scenes of the series some sound', () => {
    const scenes = SERIES.flatMap((s) => s.episodes.flatMap((e) => e.scenes));
    const silent = scenes.filter((s) => Object.keys(sceneMix(s)).length === 0);
    expect(silent.length / scenes.length).toBeLessThan(0.05);
  });
});
