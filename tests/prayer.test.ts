import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type Settings } from '../src/lib/settings';
import {
  addDays,
  dayIn,
  distanceKm,
  formatTime,
  nextPrayer,
  prayerTimes,
  qiblaBearing,
  recommendedMethod,
  METHODS,
} from '../src/lib/prayer';
import { hijriDate, noonUtc, gregorianFor, upcomingEvents } from '../src/lib/hijri';
import { computeZakat } from '../src/lib/zakat';
import { buildIcs } from '../src/lib/ics';

const PARIS = { lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris' };
const MECCA = { lat: 21.4225, lng: 39.8262, tz: 'Asia/Riyadh' };
const TOKYO = { lat: 35.6762, lng: 139.6503, tz: 'Asia/Tokyo' };
const LA = { lat: 34.0522, lng: -118.2437, tz: 'America/Los_Angeles' };

const settings = (patch: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...patch });
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
/** Asserts a formatted local time is within `tol` minutes of `expected`. */
const near = (actual: string, expected: string, tol = 3) =>
  expect(Math.abs(minutes(actual) - minutes(expected)), `${actual} vs ${expected}`).toBeLessThanOrEqual(tol);

describe('prayer times', () => {
  it('matches known solar times in Paris at the summer solstice', () => {
    const t = prayerTimes(settings({ method: 'mwl' }), PARIS, { y: 2026, m: 6, d: 21 });
    // Sunrise 05:47, solar noon ~13:52, sunset 21:58 (CEST).
    near(formatTime(t.sunrise, PARIS.tz), '05:47');
    near(formatTime(t.dhuhr, PARIS.tz), '13:53');
    near(formatTime(t.maghrib, PARIS.tz), '21:58');
    // 18° twilight never ends in Paris in June: the high-latitude rule must kick in.
    expect(t.fajr).not.toBeNull();
    expect(t.isha).not.toBeNull();
    expect(t.fajr!.getTime()).toBeLessThan(t.sunrise!.getTime());
    expect(t.isha!.getTime()).toBeGreaterThan(t.maghrib!.getTime());
  });

  it('returns local times for places in other time zones regardless of the device zone', () => {
    const tokyo = prayerTimes(settings(), TOKYO, { y: 2026, m: 3, d: 20 });
    near(formatTime(tokyo.dhuhr, TOKYO.tz), '11:49'); // 4.65° east of the JST meridian, equation of time −7.5 min
    expect(dayIn(TOKYO.tz, tokyo.fajr!)).toEqual({ y: 2026, m: 3, d: 20 });

    const la = prayerTimes(settings(), LA, { y: 2026, m: 12, d: 21 });
    near(formatTime(la.dhuhr, LA.tz), '11:52'); // 1.76° east of the PST meridian, equation of time +2 min
    expect(dayIn(LA.tz, la.isha!)).toEqual({ y: 2026, m: 12, d: 21 });
  });

  it('keeps prayers in order', () => {
    for (const method of Object.keys(METHODS) as Settings['method'][]) {
      const t = prayerTimes(settings({ method }), MECCA, { y: 2026, m: 10, d: 6 });
      const order = [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha].map((d) => d!.getTime());
      expect([...order].sort((a, b) => a - b), method).toEqual(order);
    }
  });

  it('gives a later Asr for the Hanafi school', () => {
    const day = { y: 2026, m: 10, d: 6 };
    const shafi = prayerTimes(settings({ madhab: 'shafi' }), PARIS, day).asr!;
    const hanafi = prayerTimes(settings({ madhab: 'hanafi' }), PARIS, day).asr!;
    expect(hanafi.getTime() - shafi.getTime()).toBeGreaterThan(30 * 60_000);
  });

  it('uses 120 minutes for Isha in Ramadan with Umm al-Qura', () => {
    const s = settings({ method: 'ummalqura' });
    const ramadan = prayerTimes(s, MECCA, { y: 2026, m: 3, d: 1 }); // 12 Ramadan 1447
    const shawwal = prayerTimes(s, MECCA, { y: 2026, m: 4, d: 1 });
    expect((ramadan.isha!.getTime() - ramadan.maghrib!.getTime()) / 60_000).toBe(120);
    expect((shawwal.isha!.getTime() - shawwal.maghrib!.getTime()) / 60_000).toBe(90);
  });

  it('applies manual adjustments', () => {
    const day = { y: 2026, m: 10, d: 6 };
    const base = prayerTimes(settings(), PARIS, day);
    const adjusted = prayerTimes(settings({ adjust: { ...DEFAULT_SETTINGS.adjust, dhuhr: 5 } }), PARIS, day);
    expect((adjusted.dhuhr!.getTime() - base.dhuhr!.getTime()) / 60_000).toBe(5);
  });

  it('finds the next prayer, rolling over to tomorrow after Isha', () => {
    const s = settings();
    const day = { y: 2026, m: 10, d: 6 };
    const t = prayerTimes(s, PARIS, day);
    const afterIsha = new Date(t.isha!.getTime() + 60_000);
    const next = nextPrayer(s, PARIS, afterIsha)!;
    expect(next.id).toBe('fajr');
    expect(next.current).toBe('isha');
    expect(dayIn(PARIS.tz, next.time)).toEqual(addDays(day, 1));

    const morning = nextPrayer(s, PARIS, new Date(t.sunrise!.getTime() + 60_000))!;
    expect(morning.id).toBe('dhuhr');
    expect(morning.current).toBeNull();
  });

  it('suggests a method per country', () => {
    expect(recommendedMethod('FR')).toBe('uoif');
    expect(recommendedMethod('MA')).toBe('morocco');
    expect(recommendedMethod('SA')).toBe('ummalqura');
    expect(recommendedMethod('XX')).toBe('mwl');
    expect(recommendedMethod()).toBe('mwl');
  });
});

describe('qibla', () => {
  it('points south-east from Paris and towards Mecca from elsewhere', () => {
    expect(qiblaBearing(PARIS.lat, PARIS.lng)).toBeCloseTo(119.2, 0);
    expect(qiblaBearing(40.7128, -74.006)).toBeCloseTo(58.5, 0); // New York
    expect(qiblaBearing(-6.2088, 106.8456)).toBeCloseTo(295.1, 0); // Jakarta
  });

  it('measures the distance to the Kaaba', () => {
    expect(distanceKm(PARIS.lat, PARIS.lng, MECCA.lat, MECCA.lng)).toBeGreaterThan(4450);
    expect(distanceKm(PARIS.lat, PARIS.lng, MECCA.lat, MECCA.lng)).toBeLessThan(4520);
  });
});

describe('hijri calendar', () => {
  it('converts known dates (Umm al-Qura)', () => {
    expect(hijriDate(noonUtc(2026, 2, 18))).toEqual({ y: 1447, m: 9, d: 1 });
    expect(hijriDate(noonUtc(2026, 3, 20))).toEqual({ y: 1447, m: 10, d: 1 });
    expect(hijriDate(noonUtc(2026, 3, 20), -1)).toEqual({ y: 1447, m: 9, d: 30 });
  });

  it('finds the Gregorian date of a Hijri date', () => {
    const d = gregorianFor({ y: 1447, m: 9, d: 1 }, 0, noonUtc(2026, 10, 6))!;
    expect(d.toISOString().slice(0, 10)).toBe('2026-02-18');
  });

  it('lists upcoming events in order', () => {
    const events = upcomingEvents(0, noonUtc(2026, 10, 6));
    expect(events.length).toBeGreaterThan(5);
    for (let i = 1; i < events.length; i++) expect(events[i].date >= events[i - 1].date).toBe(true);
    expect(events[0].date.getTime()).toBeGreaterThanOrEqual(noonUtc(2026, 10, 6).getTime());
  });
});

describe('zakat', () => {
  const base = {
    cash: 0, gold: 0, silver: 0, investments: 0, merchandise: 0, receivables: 0, debts: 0,
    nisabBasis: 'gold' as const, goldPricePerGram: 100, silverPricePerGram: 1,
  };

  it('is 2.5% of net assets above the nisab', () => {
    const r = computeZakat({ ...base, cash: 10000, debts: 1000 });
    expect(r.nisab).toBe(8500);
    expect(r.net).toBe(9000);
    expect(r.due).toBeCloseTo(225);
  });

  it('is zero below the nisab', () => {
    expect(computeZakat({ ...base, cash: 8000 }).due).toBe(0);
    expect(computeZakat({ ...base, cash: 8000, nisabBasis: 'silver' }).due).toBeCloseTo(200);
  });
});

describe('calendar export', () => {
  it('produces a valid iCalendar file with five prayers per day', () => {
    const ics = buildIcs(settings({ place: { ...PARIS, name: 'Paris', source: 'city' } }), 2, new Date('2026-10-06T08:00:00Z'));
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(10);
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(10);
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
