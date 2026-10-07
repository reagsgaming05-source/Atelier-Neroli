import { describe, expect, it } from 'vitest';
import { pictureAt, picturesOf, signature } from '../src/lib/storyboard';
import type { Scene } from '../src/data/types';

const scene: Scene = {
  text: 'Nouh construisait l’arche. Chaque fois que des notables passaient près de lui, ils se moquaient de lui. Il leur répondit que bientôt, ils sauraient.',
  sky: 'day',
  ground: 'plain',
  motifs: ['ark'],
};

describe('pictures of a scene', () => {
  it('is one picture, the scene’s own, without a storyboard', () => {
    const [p] = picturesOf(scene);
    expect(picturesOf(scene)).toHaveLength(1);
    expect(p).toMatchObject({ from: 0, to: 1, sky: 'day', ground: 'plain', motifs: ['ark'] });
  });

  it('inherits what a beat leaves out and starts each picture where its words are', () => {
    const pics = picturesOf(scene, [
      { at: '', motifs: ['planks', 'ark'], focus: 'planks' },
      { at: 'Chaque fois que des notables', motifs: ['ark', 'path'] },
      { at: 'Il leur répondit que bientôt', sky: 'dusk', focus: 'ark' },
    ]);
    expect(pics).toHaveLength(3);
    expect(pics[1].sky).toBe('day');
    expect(pics[2].sky).toBe('dusk');
    expect(pics[2].motifs).toEqual(['ark', 'path']);
    expect(pics[1].from).toBeCloseTo(scene.text.indexOf('Chaque fois') / scene.text.length, 6);
    expect(pics[0].to).toBe(pics[1].from);
    expect(pics[2].to).toBe(1);
  });

  it('shows the picture whose words are being told, slightly ahead of them', () => {
    const pics = picturesOf(scene, [{ at: '' }, { at: 'Chaque fois que des notables' }, { at: 'Il leur répondit que bientôt' }]);
    expect(pictureAt(pics, 0)).toBe(0);
    expect(pictureAt(pics, pics[1].from - 0.1)).toBe(0);
    expect(pictureAt(pics, pics[1].from - 0.01)).toBe(1);
    expect(pictureAt(pics, pics[2].from + 0.01)).toBe(2);
    expect(pictureAt(pics, 1)).toBe(2);
  });

  it('knows when two pictures look the same', () => {
    const a = { sky: 'day', ground: 'plain', motifs: ['ark', 'tree'] } as const;
    expect(signature(a)).toBe(signature({ ...a, motifs: ['tree', 'ark'] }));
    expect(signature(a)).not.toBe(signature({ ...a, sky: 'dusk' }));
  });
});
