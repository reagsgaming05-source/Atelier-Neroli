import { describe, expect, it } from 'vitest';
import { PAGE_COUNT, pageEnd, pageOf, pageStart, todaysPortion } from '../src/lib/khatm';
import { GOALS, goalsFor, streak, type GoalContext } from '../src/lib/goals';
import { addDays } from '../src/lib/prayer';
import { nameQuestions, quranQuestions, fromBank } from '../src/lib/quiz';
import { NAMES } from '../src/data/names';
import type { KhatmState } from '../src/lib/settings';

const plan = (days: number, nextPage = 1, start = '2026-10-01'): KhatmState => ({
  plan: { start, days, firstPage: 1 },
  nextPage,
  log: {},
  completed: 0,
});

describe('mushaf pages', () => {
  it('has 604 pages from al-Fatiha to an-Nas', () => {
    expect(PAGE_COUNT).toBe(604);
    expect(pageStart(1)).toEqual({ surah: 1, verse: 1 });
    expect(pageStart(2)).toEqual({ surah: 2, verse: 1 });
    expect(pageEnd(1)).toEqual({ surah: 1, verse: 7 });
    expect(pageEnd(604)).toEqual({ surah: 114, verse: 6 });
  });

  it('finds the page of a verse', () => {
    expect(pageOf(1, 1)).toBe(1);
    expect(pageOf(2, 1)).toBe(2);
    expect(pageOf(2, 255)).toBe(42); // Ayat al-Kursi
    expect(pageOf(18, 1)).toBe(293);
    expect(pageOf(114, 6)).toBe(604);
    for (let p = 1; p <= PAGE_COUNT; p++) {
      const { surah, verse } = pageStart(p);
      expect(pageOf(surah, verse)).toBe(p);
    }
  });
});

describe('khatm plan', () => {
  it('splits a 30-day plan into about 20 pages a day', () => {
    const day1 = todaysPortion(plan(30), '2026-10-01')!;
    expect(day1).toMatchObject({ day: 1, from: 1, to: 21, doneToday: false });
    const day30 = todaysPortion(plan(30, 590), '2026-10-30')!;
    expect(day30.to).toBe(604);
  });

  it('carries over missed pages and marks the day done once caught up', () => {
    const late = todaysPortion(plan(30), '2026-10-03')!;
    expect(late.from).toBe(1);
    expect(late.to).toBe(61);
    expect(late.pages).toBe(61);
    const caughtUp = todaysPortion(plan(30, 62), '2026-10-03')!;
    expect(caughtUp.doneToday).toBe(true);
  });

  it('reports a finished khatm', () => {
    expect(todaysPortion(plan(30, 605), '2026-10-20')!.finished).toBe(true);
    expect(todaysPortion({ ...plan(30), plan: null }, '2026-10-20')).toBeNull();
  });
});

describe('daily goals', () => {
  const ctx = (patch: Partial<GoalContext> = {}): GoalContext => ({
    goals: { done: {}, hidden: {}, score: {} },
    prayerLog: {},
    adhkarComplete: {},
    adhkarDate: '',
    khatm: { plan: null, nextPage: 1, log: {}, completed: 0 },
    hijriOffset: 0,
    ...patch,
  });
  const ids = (list: ReturnType<typeof goalsFor>) => list.map((g) => g.goal.id);

  it('shows day-specific goals only on their days', () => {
    expect(ids(goalsFor({ y: 2026, m: 10, d: 9 }, ctx()))).toContain('kahf'); // Friday
    expect(ids(goalsFor({ y: 2026, m: 10, d: 8 }, ctx()))).not.toContain('kahf');
    expect(ids(goalsFor({ y: 2026, m: 10, d: 5 }, ctx()))).toContain('jeune-lundi-jeudi'); // Monday
  });

  it('ticks prayers and adhkar automatically', () => {
    const day = { y: 2026, m: 10, d: 6 };
    const list = goalsFor(
      day,
      ctx({
        prayerLog: { '2026-10-06': { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true } },
        adhkarComplete: { matin: true },
        adhkarDate: '2026-10-06',
      }),
    );
    const status = Object.fromEntries(list.map((g) => [g.goal.id, g]));
    expect(status.prieres).toMatchObject({ done: true, auto: true });
    expect(status['adhkar-matin']).toMatchObject({ done: true, auto: true });
    expect(status['adhkar-soir'].done).toBe(false);
  });

  it('respects hidden goals and manual ticks', () => {
    const list = goalsFor({ y: 2026, m: 10, d: 6 }, ctx({ goals: { done: { '2026-10-06': { sadaqa: true } }, hidden: { witr: true }, score: {} } }));
    expect(ids(list)).not.toContain('witr');
    expect(list.find((g) => g.goal.id === 'sadaqa')!.done).toBe(true);
  });

  it('every goal cites a source', () => {
    for (const g of GOALS) expect(g.source.length, g.id).toBeGreaterThan(3);
  });

  it('counts a streak of days at 70% or more, tolerating an unfinished today', () => {
    const today = { y: 2026, m: 10, d: 6 };
    const scores = { '2026-10-03': 0.8, '2026-10-04': 1, '2026-10-05': 0.7, '2026-10-06': 0.2 };
    expect(streak(scores, today, addDays)).toBe(3);
    expect(streak({ ...scores, '2026-10-04': 0.5 }, today, addDays)).toBe(1);
  });
});

describe('quiz', () => {
  it('builds well-formed questions', () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const qs = [...quranQuestions(40, rand), ...nameQuestions(NAMES, 20, rand)];
    for (const q of qs) {
      expect(q.options.length, q.q).toBeGreaterThanOrEqual(3);
      expect(new Set(q.options).size, q.q).toBe(q.options.length);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
    }
  });

  it('keeps the right answer when shuffling a question bank', () => {
    const bank = [{ q: 'Q', options: ['a', 'b', 'c', 'd'], answer: 2, ref: 'x' }];
    for (let i = 0; i < 20; i++) {
      const [q] = fromBank(bank, 1);
      expect(q.options[q.answer]).toBe('c');
    }
  });
});
