import meta from '../data/quran-meta.json';
import { SURAHS } from '../data/surahs';
import type { KhatmState } from './settings';

/** First verse of each of the 604 pages of the Madina mushaf. */
const PAGES = meta.pages as [number, number][];
export const PAGE_COUNT = PAGES.length;

export function pageStart(page: number): { surah: number; verse: number } {
  const [surah, verse] = PAGES[Math.min(Math.max(page, 1), PAGE_COUNT) - 1];
  return { surah, verse };
}

/** Last verse printed on a page. */
export function pageEnd(page: number): { surah: number; verse: number } {
  if (page >= PAGE_COUNT) return { surah: 114, verse: SURAHS[113].verses };
  const next = pageStart(page + 1);
  if (next.verse > 1) return { surah: next.surah, verse: next.verse - 1 };
  return { surah: next.surah - 1, verse: SURAHS[next.surah - 2].verses };
}

/** Page on which a verse is printed. */
export function pageOf(surah: number, verse: number): number {
  let lo = 0;
  let hi = PAGE_COUNT - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    const [s, v] = PAGES[mid];
    if (s < surah || (s === surah && v <= verse)) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/** Set of "surah:verse" keys that start a page, for page markers in the reader. */
export const PAGE_STARTS = new Map(PAGES.map(([s, v], i) => [`${s}:${v}`, i + 1]));

function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
}

export interface Portion {
  /** Day of the plan, starting at 1. */
  day: number;
  /** Next unread page. */
  from: number;
  /** Page the schedule says to reach by tonight. */
  to: number;
  pages: number;
  /** Today's portion is already read. */
  doneToday: boolean;
  /** The whole Quran is read. */
  finished: boolean;
}

/** Today's reading: from the next unread page up to where the schedule says you should be tonight. */
export function todaysPortion(state: KhatmState, today: string): Portion | null {
  const plan = state.plan;
  if (!plan) return null;
  const day = Math.min(plan.days, Math.max(1, daysBetween(plan.start, today) + 1));
  if (state.nextPage > PAGE_COUNT) return { day, from: PAGE_COUNT, to: PAGE_COUNT, pages: 0, doneToday: true, finished: true };
  const span = PAGE_COUNT - plan.firstPage + 1;
  const to = Math.min(PAGE_COUNT, plan.firstPage - 1 + Math.ceil((span * day) / plan.days));
  return {
    day,
    from: state.nextPage,
    to,
    pages: Math.max(0, to - state.nextPage + 1),
    doneToday: state.nextPage > to,
    finished: false,
  };
}

export function formatPortion(from: number, to: number): string {
  const a = pageStart(from);
  const b = pageEnd(to);
  const name = (s: number) => SURAHS[s - 1].name;
  return a.surah === b.surah
    ? `${name(a.surah)} ${a.verse}–${b.verse}`
    : `${name(a.surah)} ${a.verse} → ${name(b.surah)} ${b.verse}`;
}
