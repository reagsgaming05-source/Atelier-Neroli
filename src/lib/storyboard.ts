/**
 * Turns a scene and its storyboard into the pictures shown while its narration
 * is told, and says which one is on screen at a given moment.
 */
import type { Beat, Focus, Ground, Motif, Scene, Sky } from '../data/types';

export interface Picture {
  /** Where in the scene's text this picture starts, as a fraction of its length (0 for the first). */
  from: number;
  /** Where it ends: where the next one starts, or 1. */
  to: number;
  sky: Sky;
  ground: Ground;
  motifs: Motif[];
  focus?: Focus;
  cut: boolean;
}

/** The pictures of a scene; a scene without a storyboard is one picture, its own. */
export function picturesOf(scene: Scene, beats?: Beat[]): Picture[] {
  const list = beats?.length ? beats : [{ at: '' } as Beat];
  let sky = scene.sky;
  let ground = scene.ground;
  let motifs = scene.motifs ?? [];
  const pictures = list.map((b, i) => {
    sky = b.sky ?? sky;
    ground = b.ground ?? ground;
    motifs = b.motifs ?? motifs;
    const at = i === 0 ? 0 : scene.text.indexOf(b.at);
    return { from: at <= 0 ? 0 : at / scene.text.length, to: 1, sky, ground, motifs: [...motifs], focus: b.focus, cut: !!b.cut } as Picture;
  });
  pictures.forEach((p, i) => (p.to = pictures[i + 1]?.from ?? 1));
  return pictures;
}

/**
 * The picture on screen when the narration has got `progress` (0 to 1) through the
 * scene's text. A picture appears a little before its first word, so that the eye
 * has arrived when the word is said.
 */
export function pictureAt(pictures: Picture[], progress: number, anticipation = 0.03): number {
  let found = 0;
  pictures.forEach((p, i) => {
    if (progress + anticipation >= p.from) found = i;
  });
  return found;
}

/** What makes two pictures look the same on screen. */
export const signature = (p: { sky: Sky; ground: Ground; motifs: readonly Motif[] }) => `${p.sky}/${p.ground}/${[...p.motifs].sort().join('+')}`;
