import {
  CalculationMethod,
  CalculationParameters,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PolarCircleResolution,
  PrayerTimes,
  Qibla,
  SunnahTimes,
} from 'adhan';
import type { PrayerId, Settings } from './settings';
import { hijriDate } from './hijri';

export interface MethodInfo {
  label: string;
  detail: string;
  params: () => CalculationParameters;
}

function angles(fajr: number, isha: number, ishaInterval = 0): () => CalculationParameters {
  return () => {
    const p = CalculationMethod.Other();
    p.fajrAngle = fajr;
    p.ishaAngle = isha;
    p.ishaInterval = ishaInterval;
    return p;
  };
}

export const METHODS = {
  mwl: { label: 'Ligue islamique mondiale', detail: 'Fajr 18°, Isha 17°', params: CalculationMethod.MuslimWorldLeague },
  uoif: { label: 'France — UOIF / Musulmans de France', detail: 'Fajr 12°, Isha 12°', params: angles(12, 12) },
  france15: { label: 'France — 15°', detail: 'Fajr 15°, Isha 15°', params: angles(15, 15) },
  france18: { label: 'France — 18°', detail: 'Fajr 18°, Isha 18°', params: angles(18, 18) },
  ummalqura: {
    label: 'Umm al-Qura (La Mecque)',
    detail: 'Fajr 18,5°, Isha 90 min après Maghrib (120 min en Ramadan)',
    params: CalculationMethod.UmmAlQura,
  },
  egypt: { label: 'Autorité égyptienne', detail: 'Fajr 19,5°, Isha 17,5°', params: CalculationMethod.Egyptian },
  morocco: { label: 'Maroc', detail: 'Fajr 19°, Isha 17°', params: angles(19, 17) },
  algeria: { label: 'Algérie', detail: 'Fajr 18°, Isha 17°', params: angles(18, 17) },
  tunisia: { label: 'Tunisie', detail: 'Fajr 18°, Isha 18°', params: angles(18, 18) },
  turkey: { label: 'Diyanet (Turquie)', detail: 'Approximation de la méthode Diyanet', params: CalculationMethod.Turkey },
  isna: { label: 'ISNA (Amérique du Nord)', detail: 'Fajr 15°, Isha 15°', params: CalculationMethod.NorthAmerica },
  moonsighting: {
    label: 'Moonsighting Committee',
    detail: 'Fajr 18°, Isha 18°, ajustements saisonniers (Royaume-Uni, Amérique du Nord)',
    params: CalculationMethod.MoonsightingCommittee,
  },
  karachi: { label: 'Université de Karachi', detail: 'Fajr 18°, Isha 18°', params: CalculationMethod.Karachi },
  dubai: { label: 'Dubaï (EAU)', detail: 'Fajr 18,2°, Isha 18,2°', params: CalculationMethod.Dubai },
  qatar: { label: 'Qatar', detail: 'Fajr 18°, Isha 90 min', params: CalculationMethod.Qatar },
  kuwait: { label: 'Koweït', detail: 'Fajr 18°, Isha 17,5°', params: CalculationMethod.Kuwait },
  singapore: {
    label: 'Singapour, Malaisie, Indonésie',
    detail: 'Fajr 20°, Isha 18°',
    params: CalculationMethod.Singapore,
  },
  russia: { label: 'Russie', detail: 'Fajr 16°, Isha 15°', params: angles(16, 15) },
  tehran: { label: 'Téhéran (Institut de géophysique)', detail: 'Fajr 17,7°, Isha 14°, Maghrib 4,5°', params: CalculationMethod.Tehran },
} satisfies Record<string, MethodInfo>;

export type MethodId = keyof typeof METHODS;

const COUNTRY_METHOD: Record<string, MethodId> = {
  FR: 'uoif', BE: 'mwl', CH: 'mwl', LU: 'mwl',
  MA: 'morocco', DZ: 'algeria', TN: 'tunisia', LY: 'egypt', EG: 'egypt', SD: 'egypt',
  SA: 'ummalqura', YE: 'ummalqura', AE: 'dubai', QA: 'qatar', KW: 'kuwait', BH: 'ummalqura', OM: 'ummalqura',
  TR: 'turkey', IR: 'tehran', RU: 'russia',
  US: 'isna', CA: 'isna', GB: 'moonsighting', IE: 'moonsighting',
  PK: 'karachi', IN: 'karachi', BD: 'karachi', AF: 'karachi',
  MY: 'singapore', SG: 'singapore', ID: 'singapore', BN: 'singapore',
};

export function recommendedMethod(countryCode?: string): MethodId {
  return (countryCode && COUNTRY_METHOD[countryCode]) || 'mwl';
}

export const PRAYER_NAMES: Record<PrayerId, { fr: string; ar: string }> = {
  fajr: { fr: 'Fajr', ar: 'الفجر' },
  sunrise: { fr: 'Lever du soleil', ar: 'الشروق' },
  dhuhr: { fr: 'Dhuhr', ar: 'الظهر' },
  asr: { fr: 'Asr', ar: 'العصر' },
  maghrib: { fr: 'Maghrib', ar: 'المغرب' },
  isha: { fr: 'Isha', ar: 'العشاء' },
};

export const PRAYER_ORDER: PrayerId[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const OBLIGATORY: Exclude<PrayerId, 'sunrise'>[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export interface DayParts {
  y: number;
  m: number;
  d: number;
}

export interface DayTimes {
  date: DayParts;
  fajr: Date | null;
  sunrise: Date | null;
  dhuhr: Date | null;
  asr: Date | null;
  maghrib: Date | null;
  isha: Date | null;
  /** Fajr minus 10 minutes: start of the fast. */
  imsak: Date | null;
  midnight: Date | null;
  lastThird: Date | null;
}

type CalcSettings = Pick<Settings, 'method' | 'madhab' | 'highLat' | 'adjust' | 'hijriOffset'>;
type CalcPlace = { lat: number; lng: number; tz: string };

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

/** Calendar date of `instant` in time zone `tz`. */
export function dayIn(tz: string, instant: Date = new Date()): DayParts {
  let fmt = partsFormatters.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' });
    partsFormatters.set(tz, fmt);
  }
  const parts = fmt.formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return { y: get('year'), m: get('month'), d: get('day') };
}

export function addDays({ y, m, d }: DayParts, n: number): DayParts {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export function dayKey({ y, m, d }: DayParts): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function buildParams(s: CalcSettings, place: CalcPlace, day: DayParts): CalculationParameters {
  const params = (METHODS[s.method] ?? METHODS.mwl).params();
  params.madhab = s.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  params.highLatitudeRule =
    s.highLat === 'auto' ? HighLatitudeRule.recommended(new Coordinates(place.lat, place.lng)) : s.highLat;
  params.polarCircleResolution = PolarCircleResolution.AqrabBalad;
  // Umm al-Qura prescribes Isha two hours after Maghrib during Ramadan.
  if (s.method === 'ummalqura') {
    const noon = new Date(Date.UTC(day.y, day.m - 1, day.d, 12));
    if (hijriDate(noon, s.hijriOffset).m === 9) params.ishaInterval = 120;
  }
  params.adjustments = { ...s.adjust };
  return params;
}

const valid = (d: Date | undefined | null): Date | null => (d && !Number.isNaN(d.getTime()) ? d : null);

/** Prayer times for the given local calendar day at `place`. */
export function prayerTimes(s: CalcSettings, place: CalcPlace, day: DayParts): DayTimes {
  const coords = new Coordinates(place.lat, place.lng);
  // adhan reads the year/month/day through local getters and returns UTC instants,
  // so a local-midnight Date carrying the place's calendar day is what it expects.
  const date = new Date(day.y, day.m - 1, day.d);
  const pt = new PrayerTimes(coords, date, buildParams(s, place, day));
  let midnight: Date | null = null;
  let lastThird: Date | null = null;
  try {
    const sunnah = new SunnahTimes(pt);
    midnight = valid(sunnah.middleOfTheNight);
    lastThird = valid(sunnah.lastThirdOfTheNight);
  } catch {
    /* undefined at extreme latitudes */
  }
  const fajr = valid(pt.fajr);
  return {
    date: day,
    fajr,
    sunrise: valid(pt.sunrise),
    dhuhr: valid(pt.dhuhr),
    asr: valid(pt.asr),
    maghrib: valid(pt.maghrib),
    isha: valid(pt.isha),
    imsak: fajr ? new Date(fajr.getTime() - 10 * 60_000) : null,
    midnight,
    lastThird,
  };
}

export interface NextPrayer {
  id: PrayerId;
  time: Date;
  /** The prayer whose time is currently running, if any. */
  current: PrayerId | null;
  currentStart: Date | null;
}

/** The next prayer (including sunrise) after `now`, looking into tomorrow if needed. */
export function nextPrayer(s: CalcSettings, place: CalcPlace, now: Date = new Date()): NextPrayer | null {
  const today = dayIn(place.tz, now);
  const days = [prayerTimes(s, place, addDays(today, -1)), prayerTimes(s, place, today), prayerTimes(s, place, addDays(today, 1))];
  const events: { id: PrayerId; time: Date }[] = [];
  for (const day of days) {
    for (const id of PRAYER_ORDER) {
      const t = day[id];
      if (t) events.push({ id, time: t });
    }
  }
  events.sort((a, b) => a.time.getTime() - b.time.getTime());
  const idx = events.findIndex((e) => e.time.getTime() > now.getTime());
  if (idx < 0) return null;
  const prev = events[idx - 1];
  // Between sunrise and Dhuhr no obligatory prayer is running.
  const current = prev && prev.id !== 'sunrise' ? prev : null;
  return { id: events[idx].id, time: events[idx].time, current: current?.id ?? null, currentStart: current?.time ?? null };
}

const timeFormatters = new Map<string, Intl.DateTimeFormat>();

export function formatTime(date: Date | null, tz: string, clock: '24h' | '12h' = '24h'): string {
  if (!date) return '—';
  const key = `${tz}|${clock}`;
  let fmt = timeFormatters.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: clock === '12h' });
    timeFormatters.set(key, fmt);
  }
  return fmt.format(date);
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h} h ${pad(m)} min` : m > 0 ? `${m} min ${pad(sec)} s` : `${sec} s`;
}

export const KAABA = { lat: 21.422487, lng: 39.826206 };

export function qiblaBearing(lat: number, lng: number): number {
  return Qibla(new Coordinates(lat, lng));
}

/** Great-circle distance in kilometres. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(a));
}
