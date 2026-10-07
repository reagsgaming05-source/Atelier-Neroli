import { createStore } from './store';
export { useStore } from './store';
import type { MethodId } from './prayer';

export type PrayerId = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface Place {
  name: string;
  /** Postcode, when known (Swiss localities). */
  postcode?: string;
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
    /** Memorisation mode: verses stay blurred until tapped. */
    hifz: boolean;
    /** How many times each verse is recited before moving on. */
    repeat: number;
  };
  notify: {
    enabled: boolean;
    prayers: Record<Exclude<PrayerId, 'sunrise'>, boolean>;
    /** Minutes before the prayer for an early reminder; 0 disables it. */
    before: number;
    sound: boolean;
  };
  tasbihVibrate: boolean;
  /** Illustrated stories: narration voice, verse recitation, speech rate, nature sounds under the voice. */
  stories: { voice: boolean; recitation: boolean; rate: number; ambience: boolean; people: boolean; look: 'draw' | 'book' | 'cine' };
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
  quran: { translation: 'fr-hamidullah', translit: false, arabicSize: 30, reciter: 'Alafasy_128kbps', hifz: false, repeat: 1 },
  notify: {
    enabled: false,
    prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    before: 0,
    sound: true,
  },
  tasbihVibrate: true,
  stories: { voice: true, recitation: true, rate: 1, ambience: true, people: true, look: 'book' },
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

/** Adhkar progress for the current day: dhikr id -> repetitions done, and finished categories. */
export const adhkarStore = createStore<{ date: string; done: Record<string, number>; complete: Record<string, boolean> }>(
  'sakina.adhkar',
  { date: '', done: {}, complete: {} },
);

export interface GoalsState {
  /** Goals ticked by hand, per local date. */
  done: Record<string, Record<string, boolean>>;
  /** Goals the user chose to hide. */
  hidden: Record<string, boolean>;
  /** Share of the day's goals completed, recorded for streaks. */
  score: Record<string, number>;
}
export const goalsStore = createStore<GoalsState>('sakina.goals', { done: {}, hidden: {}, score: {} });

export interface KhatmState {
  plan: { start: string; days: number; firstPage: number } | null;
  /** Next page to read, 1..605 (605 = finished). */
  nextPage: number;
  /** Pages read per local date. */
  log: Record<string, number>;
  completed: number;
}
export const khatmStore = createStore<KhatmState>('sakina.khatm', { plan: null, nextPage: 1, log: {}, completed: 0 });

export interface QadaState {
  prayers: Record<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'witr', number>;
  fasts: number;
}
export const qadaStore = createStore<QadaState>('sakina.qada', {
  prayers: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0 },
  fasts: 0,
});

/** Stories opened, and best quiz score per quiz id. */
export const learnStore = createStore<{ read: Record<string, number>; best: Record<string, number> }>('sakina.learn', {
  read: {},
  best: {},
});
