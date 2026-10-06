import { createStore } from './store';
export { useStore } from './store';
import type { MethodId } from './prayer';

export type PrayerId = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface Place {
  name: string;
  country?: string;
  countryCode?: string;
  lat: number;
  lng: number;
  /** IANA time zone used to display times, e.g. "Europe/Paris". */
  tz: string;
  source: 'gps' | 'city' | 'manual';
}

export type HighLatRule = 'auto' | 'middleofthenight' | 'seventhofthenight' | 'twilightangle';

export interface Settings {
  place: Place | null;
  method: MethodId;
  madhab: 'shafi' | 'hanafi';
  highLat: HighLatRule;
  /** Per-prayer offsets in minutes, added after calculation. */
  adjust: Record<PrayerId, number>;
  /** Shift of the Hijri date in days, to follow local moon sighting. */
  hijriOffset: number;
  clock: '24h' | '12h';
  theme: 'auto' | 'light' | 'dark';
  quran: {
    translation: 'fr-hamidullah' | 'fr-maash' | 'none';
    translit: boolean;
    arabicSize: number;
    reciter: string;
  };
  notify: {
    enabled: boolean;
    prayers: Record<Exclude<PrayerId, 'sunrise'>, boolean>;
    /** Minutes before the prayer for an early reminder; 0 disables it. */
    before: number;
    sound: boolean;
  };
  tasbihVibrate: boolean;
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  place: null,
  method: 'mwl',
  madhab: 'shafi',
  highLat: 'auto',
  adjust: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  hijriOffset: 0,
  clock: '24h',
  theme: 'auto',
  quran: { translation: 'fr-hamidullah', translit: false, arabicSize: 30, reciter: 'Alafasy_128kbps' },
  notify: {
    enabled: false,
    prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    before: 0,
    sound: true,
  },
  tasbihVibrate: true,
  onboarded: false,
};

export const settingsStore = createStore<Settings>('sakina.settings', DEFAULT_SETTINGS);

export interface Bookmark {
  surah: number;
  verse: number;
  at: number;
}

export interface ReadingState {
  last: { surah: number; verse: number } | null;
  bookmarks: Bookmark[];
}

export const readingStore = createStore<ReadingState>('sakina.reading', { last: null, bookmarks: [] });

/** Prayers marked as performed, keyed by local date "YYYY-MM-DD". */
export type PrayerLog = Record<string, Partial<Record<Exclude<PrayerId, 'sunrise'>, boolean>>>;
export const prayerLogStore = createStore<PrayerLog>('sakina.prayerlog', {});

export interface TasbihState {
  count: number;
  target: number;
  phrase: number;
  /** Lifetime total per local date. */
  history: Record<string, number>;
}
export const tasbihStore = createStore<TasbihState>('sakina.tasbih', { count: 0, target: 33, phrase: 0, history: {} });

/** Adhkar progress for the current day: dhikr id -> repetitions done. */
export const adhkarStore = createStore<{ date: string; done: Record<string, number> }>('sakina.adhkar', {
  date: '',
  done: {},
});
