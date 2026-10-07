import { describe, expect, it } from 'vitest';
import { SERIES } from '../src/data/series';
import { MOTIFS } from '../src/data/types';
import { VIEW, cameraTransform, effectsFor, layerZoom, planShots, sceneSeed, shotCount, shotOn, type Box } from '../src/lib/direction';

const stage = { w: 390, h: 520 };
const boxes: Box[] = [
  { x: 150, y: 250, w: 90, h: 50, weight: 55 },
  { x: 205, y: 92, w: 60, h: 60, weight: 40 },
  { x: 80, y: 280, w: 20, h: 40, weight: 20 },
];

describe('shot plan', () => {
  it('cuts a scene into more shots the longer it lasts', () => {
    expect(shotCount(2000)).toBe(1);
    expect(shotCount(8000)).toBe(2);
    expect(shotCount(13000)).toBe(3);
    expect(shotCount(60000)).toBe(7);
  });

  it('is reproducible and has the requested number of shots', () => {
    for (const n of [2, 3, 5, 7]) {
      const a = planShots(boxes, n, 42);
      expect(a).toHaveLength(n);
      expect(planShots(boxes, n, 42)).toEqual(a);
    }
  });

  it('opens wide, closes pulled back, and visits the biggest object', () => {
    const plan = planShots(boxes, 5, 7);
    expect(plan[0].k).toBeLessThan(1.1);
    expect(plan.at(-1)!.k).toBeLessThan(1.2);
    expect(plan.some((s) => s.x === 150 && s.y === 250)).toBe(true);
  });

  it('never moves the camera outside the picture or too close', () => {
    for (const seed of [1, 2, 3, 99, 12345]) {
      for (const shot of planShots(boxes, 7, seed)) {
        expect(shot.k).toBeGreaterThanOrEqual(1);
        expect(shot.k).toBeLessThanOrEqual(2);
        expect(shot.x).toBeGreaterThanOrEqual(0);
        expect(shot.x).toBeLessThanOrEqual(VIEW.w);
        expect(shot.y).toBeGreaterThanOrEqual(0);
        expect(shot.y).toBeLessThanOrEqual(VIEW.h);
      }
    }
  });

  it('zooms closer on small objects than on big ones', () => {
    expect(shotOn({ x: 100, y: 100, w: 20, h: 20, weight: 1 }).k).toBeGreaterThan(shotOn({ x: 100, y: 100, w: 140, h: 100, weight: 1 }).k);
  });

  it('plans scenes without any measured object (generic views only)', () => {
    expect(planShots([], 4, 5)).toHaveLength(4);
  });
});

describe('camera', () => {
  it('shows the whole picture at zoom 1', () => {
    expect(cameraTransform(stage, { x: 150, y: 190 }, 1)).toEqual({ tx: 0, ty: 0, k: 1 });
  });

  it('keeps the picture covering the stage whatever the focus', () => {
    for (const k of [1.2, 1.8, 2.4]) {
      for (const focus of [{ x: 0, y: 0 }, { x: 300, y: 360 }, { x: 150, y: 190 }, { x: 20, y: 330 }]) {
        const { tx, ty } = cameraTransform(stage, focus, k);
        expect(tx).toBeLessThanOrEqual(0);
        expect(ty).toBeLessThanOrEqual(0);
        expect(tx + k * stage.w).toBeGreaterThanOrEqual(stage.w - 1e-6);
        expect(ty + k * stage.h).toBeGreaterThanOrEqual(stage.h - 1e-6);
      }
    }
  });

  it('puts the focus in the middle of the stage when there is room', () => {
    const { tx, ty, k } = cameraTransform(stage, { x: 150, y: 190 }, 1.5);
    const s = Math.max(stage.w / VIEW.w, stage.h / VIEW.h);
    const px = (stage.w - VIEW.w * s) / 2 + 150 * s;
    const py = (stage.h - VIEW.h * s) / 2 + 190 * s;
    expect(tx + k * px).toBeCloseTo(stage.w / 2, 3);
    expect(ty + k * py).toBeCloseTo(stage.h / 2, 3);
  });

  it('moves far layers less than near ones', () => {
    expect(layerZoom(2, 0.5)).toBeCloseTo(1.5);
    expect(layerZoom(2, 1.5)).toBeCloseTo(2.5);
    expect(layerZoom(1, 1.5)).toBe(1);
  });
});

describe('atmosphere', () => {
  it('suits the sky, the place and the objects', () => {
    expect(effectsFor({ sky: 'night', ground: 'garden' })).toContain('fireflies');
    expect(effectsFor({ sky: 'day', ground: 'desert' })).toContain('dust');
    expect(effectsFor({ sky: 'day', ground: 'plain', motifs: ['fire'] })).toContain('embers');
    expect(effectsFor({ sky: 'storm', ground: 'sea' })).toContain('mist');
    expect(effectsFor({ sky: 'day', ground: 'desert', motifs: ['wind'] })).toContain('sand');
    expect(effectsFor({ sky: 'night', ground: 'desert' })).not.toContain('dust');
    expect(effectsFor({ sky: 'storm', ground: 'plain', motifs: ['birds'] })).not.toContain('birds');
  });

  it('knows every motif without failing, and keeps the effects few', () => {
    for (const m of MOTIFS) expect(effectsFor({ sky: 'day', ground: 'plain', motifs: [m] }).length).toBeLessThanOrEqual(6);
  });

  it('gives most scenes of the series something floating in front of them', () => {
    const scenes = SERIES.flatMap((s) => s.episodes.flatMap((e) => e.scenes));
    const bare = scenes.filter((s) => effectsFor(s).length === 0);
    expect(bare.length / scenes.length).toBeLessThan(0.1);
  });
});

describe('scene seed', () => {
  it('is stable and differs between texts', () => {
    expect(sceneSeed('abc')).toBe(sceneSeed('abc'));
    expect(sceneSeed('abc')).not.toBe(sceneSeed('abd'));
  });
});
