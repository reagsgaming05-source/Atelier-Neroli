import daily from './daily.json';
import type { DayParts } from '../lib/prayer';

export interface DailyVerse {
  surah: number;
  verse: number;
  ar: string;
  fr: string;
}

/** A different verse each day, the same for everyone on a given date. */
export function dailyVerse({ y, m, d }: DayParts): DailyVerse {
  const dayOfYear = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000);
  return daily[(dayOfYear + y) % daily.length];
}
