/**
 * Hijri calendar helpers built on the browser's Umm al-Qura calendar
 * (Intl "islamic-umalqura"). Actual month starts depend on moon sighting, so
 * users can shift the result by a day or two in Settings.
 */

export interface HijriDate {
  y: number;
  m: number;
  d: number;
}

export const HIJRI_MONTHS = [
  { fr: 'Mouharram', ar: 'مُحَرَّم' },
  { fr: 'Safar', ar: 'صَفَر' },
  { fr: 'Rabi al-awwal', ar: 'رَبِيع الأَوَّل' },
  { fr: 'Rabi ath-thani', ar: 'رَبِيع الآخِر' },
  { fr: 'Joumada al-oula', ar: 'جُمَادَى الأُولَى' },
  { fr: 'Joumada ath-thania', ar: 'جُمَادَى الآخِرَة' },
  { fr: 'Rajab', ar: 'رَجَب' },
  { fr: 'Chaabane', ar: 'شَعْبَان' },
  { fr: 'Ramadan', ar: 'رَمَضَان' },
  { fr: 'Chawwal', ar: 'شَوَّال' },
  { fr: 'Dhou al-Qi‘da', ar: 'ذُو القَعْدَة' },
  { fr: 'Dhou al-Hijja', ar: 'ذُو الحِجَّة' },
];

const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

/**
 * Hijri date of a calendar day. Pass a Date at UTC noon of the Gregorian day
 * you mean (see `noonUtc`) so the time zone never shifts the day.
 */
export function hijriDate(utcNoon: Date, offsetDays = 0): HijriDate {
  const shifted = new Date(utcNoon.getTime() + offsetDays * 86_400_000);
  const parts = fmt.formatToParts(shifted);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  // Some engines label the year "relatedYear" for non-Gregorian calendars.
  return { y: get('year') || get('relatedYear'), m: get('month'), d: get('day') };
}

export function noonUtc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function formatHijri(h: HijriDate, lang: 'fr' | 'ar' = 'fr'): string {
  const month = HIJRI_MONTHS[h.m - 1];
  if (lang === 'ar') return `${toArabicDigits(h.d)} ${month.ar} ${toArabicDigits(h.y)} هـ`;
  return `${h.d} ${month.fr} ${h.y} H`;
}

export function toArabicDigits(n: number | string): string {
  return String(n).replace(/\d/g, (c) => '٠١٢٣٤٥٦٧٨٩'[Number(c)]);
}

/** Gregorian day (UTC noon) on which the given Hijri date falls, or null if out of range. */
export function gregorianFor(target: HijriDate, offsetDays = 0, from: Date = new Date()): Date | null {
  // Estimate from the mean lunar year, then walk day by day.
  const current = hijriDate(from, offsetDays);
  const monthsAhead = (target.y - current.y) * 12 + (target.m - current.m);
  let t = from.getTime() + (monthsAhead * 29.530588 + (target.d - current.d)) * 86_400_000;
  t = Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth(), new Date(t).getUTCDate(), 12);
  for (let i = 0; i < 6; i++) {
    for (const dir of i === 0 ? [0] : [i, -i]) {
      const candidate = new Date(t + dir * 86_400_000);
      const h = hijriDate(candidate, offsetDays);
      if (h.y === target.y && h.m === target.m && h.d === target.d) return candidate;
    }
  }
  return null;
}

export interface IslamicEvent {
  m: number;
  d: number;
  title: string;
  detail: string;
}

export const ISLAMIC_EVENTS: IslamicEvent[] = [
  { m: 1, d: 1, title: 'Nouvel an hégirien', detail: 'Début de l’année lunaire, en souvenir de l’Hégire.' },
  { m: 1, d: 9, title: 'Tasu‘a', detail: 'Jeûne recommandé la veille de ‘Achoura.' },
  { m: 1, d: 10, title: '‘Achoura', detail: 'Jeûne recommandé : il expie les péchés de l’année passée (Muslim 1162).' },
  { m: 3, d: 12, title: 'Mawlid', detail: 'Date communément retenue pour la naissance du Prophète ﷺ.' },
  { m: 7, d: 27, title: 'Isra’ et Mi‘raj', detail: 'Date communément retenue pour le Voyage nocturne.' },
  { m: 9, d: 1, title: 'Début du Ramadan', detail: 'Premier jour du jeûne (selon l’observation du croissant).' },
  { m: 9, d: 21, title: 'Dix dernières nuits', detail: 'Recherchez Laylat al-Qadr dans les nuits impaires des dix dernières.' },
  { m: 9, d: 27, title: 'Nuit du 27', detail: 'Nuit souvent espérée pour Laylat al-Qadr.' },
  { m: 10, d: 1, title: '‘Aïd al-Fitr', detail: 'Fête de la rupture du jeûne. Zakat al-Fitr avant la prière.' },
  { m: 12, d: 8, title: 'Yawm at-Tarwiya', detail: 'Début des rites du Hajj.' },
  { m: 12, d: 9, title: 'Jour de ‘Arafat', detail: 'Jeûne recommandé pour qui ne fait pas le Hajj (Muslim 1162).' },
  { m: 12, d: 10, title: '‘Aïd al-Adha', detail: 'Fête du sacrifice.' },
  { m: 12, d: 11, title: 'Jours de Tachriq', detail: '11, 12 et 13 Dhou al-Hijja : jours de takbir, le jeûne y est interdit.' },
];

/** The next occurrences of each event, sorted by date. */
export function upcomingEvents(offsetDays = 0, from: Date = new Date(), count = 8) {
  const today = hijriDate(from, offsetDays);
  const list: { event: IslamicEvent; hijri: HijriDate; date: Date }[] = [];
  for (const year of [today.y, today.y + 1]) {
    for (const event of ISLAMIC_EVENTS) {
      const hijri = { y: year, m: event.m, d: event.d };
      const isPast = year === today.y && (event.m < today.m || (event.m === today.m && event.d < today.d));
      if (isPast) continue;
      const date = gregorianFor(hijri, offsetDays, from);
      if (date) list.push({ event, hijri, date });
    }
  }
  return list.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, count);
}
