import type { Series } from '../types';

// Each part file exports one array of series (written per group of stories).
const parts = import.meta.glob<Record<string, Series[]>>('./part-*.ts', { eager: true });

export const SERIES: Series[] = Object.values(parts).flatMap((m) => Object.values(m).flat());

const byId = new Map(SERIES.map((s) => [s.storyId, s]));

export function getSeries(storyId: string): Series | undefined {
  return byId.get(storyId);
}
