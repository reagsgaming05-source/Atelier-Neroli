import type { Beat, Storyboard } from '../types';

/** All the storyboard files (part-*.ts), merged. */
const parts = import.meta.glob<Record<string, Storyboard>>('./part-*.ts', { eager: true });
export const STORYBOARD: Storyboard = Object.assign({}, ...Object.values(parts).flatMap((m) => Object.values(m)));

/** The pictures of a scene; none when it has not been storyboarded (the scene's own picture is used). */
export function getBeats(storyId: string, episode: number, scene: number): Beat[] | undefined {
  return STORYBOARD[`${storyId}-${episode}-${scene}`];
}
