import { hijriDate, noonUtc } from './hijri';
import { OBLIGATORY, type DayParts, dayKey } from './prayer';
import type { GoalsState, KhatmState, PrayerLog } from './settings';
import { todaysPortion } from './khatm';

/** A good deed to aim for today, with the narration that encourages it. */
export interface Goal {
  id: string;
  title: string;
  why: string;
  source: string;
  /** Where to go to do it. */
  href?: string;
  /** Shown only on these days. */
  when?: (day: DayParts, weekday: number, hijriDay: number) => boolean;
}

export const GOALS: Goal[] = [
  {
    id: 'prieres',
    title: 'Les cinq prières',
    why: 'La première chose sur laquelle le serviteur sera jugé le Jour de la Résurrection est sa prière.',
    source: 'At-Tirmidhī 413',
    href: '#/',
  },
  {
    id: 'adhkar-matin',
    title: 'Adhkar du matin',
    why: 'Celui qui dit trois fois le matin « Bismillāhi-lladhī lā yaḍurru… », rien ne lui nuira.',
    source: 'Abū Dāwūd 5088',
    href: '#/adhkar/matin',
  },
  {
    id: 'adhkar-soir',
    title: 'Adhkar du soir',
    why: 'Se souvenir d’Allah matin et soir protège et apaise le cœur : « C’est par l’évocation d’Allah que se tranquillisent les cœurs. »',
    source: 'Coran 13:28',
    href: '#/adhkar/soir',
  },
  {
    id: 'wird',
    title: 'Ma lecture du Coran',
    why: 'Lisez le Coran, car il viendra le Jour de la Résurrection intercéder en faveur de ceux qui le lisaient.',
    source: 'Muslim 804',
    href: '#/khatm',
  },
  {
    id: 'rawatib',
    title: 'Les 12 rak‘at surérogatoires',
    why: 'Quiconque prie douze rak‘at volontaires chaque jour, Allah lui bâtit une maison au Paradis.',
    source: 'Muslim 728',
    href: '#/apprendre/guide/prieres-surerogatoires',
  },
  {
    id: 'witr',
    title: 'La prière du witr',
    why: 'Faites du witr la dernière de vos prières de la nuit.',
    source: 'Al-Bukhārī 998, Muslim 751',
  },
  {
    id: 'duha',
    title: 'La prière de ḍuḥā',
    why: 'Chaque articulation doit une aumône chaque matin ; deux rak‘at de ḍuḥā suffisent pour tout cela.',
    source: 'Muslim 720',
  },
  {
    id: 'istighfar',
    title: '100 fois Astaghfirullāh',
    why: 'Le Prophète ﷺ demandait pardon à Allah cent fois par jour.',
    source: 'Muslim 2702',
    href: '#/tasbih',
  },
  {
    id: 'subhanallah',
    title: '100 fois Subḥāna-llāhi wa bi-ḥamdih',
    why: 'Ses péchés sont effacés, seraient-ils comme l’écume de la mer.',
    source: 'Al-Bukhārī 6405',
    href: '#/tasbih',
  },
  {
    id: 'salawat',
    title: 'Prier sur le Prophète ﷺ',
    why: 'Celui qui prie sur moi une fois, Allah prie sur lui dix fois.',
    source: 'Muslim 408',
  },
  {
    id: 'sadaqa',
    title: 'Une aumône, même petite',
    why: 'Protégez-vous du Feu, ne serait-ce qu’avec une moitié de datte.',
    source: 'Al-Bukhārī 1417',
  },
  {
    id: 'bienfait',
    title: 'Un sourire, une bonne parole',
    why: 'Ton sourire à ton frère est une aumône.',
    source: 'At-Tirmidhī 1956',
  },
  {
    id: 'parents',
    title: 'Un geste pour ses parents',
    why: '« Et ton Seigneur a décrété : n’adorez que Lui, et soyez bons envers vos parents. »',
    source: 'Coran 17:23',
  },
  {
    id: 'apprendre',
    title: 'Apprendre quelque chose de sa religion',
    why: 'Celui qui emprunte un chemin pour acquérir une science, Allah lui facilite un chemin vers le Paradis.',
    source: 'Muslim 2699',
    href: '#/apprendre',
  },
  {
    id: 'jeune-lundi-jeudi',
    title: 'Jeûne du lundi ou du jeudi',
    why: 'Les œuvres sont présentées le lundi et le jeudi ; j’aime que mes œuvres soient présentées alors que je jeûne.',
    source: 'At-Tirmidhī 747',
    when: (_d, weekday) => weekday === 1 || weekday === 4,
  },
  {
    id: 'jours-blancs',
    title: 'Jeûne des jours blancs',
    why: 'Jeûner trois jours chaque mois, les 13, 14 et 15 du mois lunaire.',
    source: 'At-Tirmidhī 761, An-Nasā’ī 2424',
    when: (_d, _w, h) => h >= 13 && h <= 15,
  },
  {
    id: 'kahf',
    title: 'Sourate Al-Kahf',
    why: 'Celui qui lit la sourate Al-Kahf le vendredi, une lumière l’éclaire jusqu’au vendredi suivant.',
    source: 'Al-Ḥākim 2/368, authentifié par Al-Albānī',
    href: '#/coran/18',
    when: (_d, weekday) => weekday === 5,
  },
  {
    id: 'mulk',
    title: 'Sourate Al-Mulk avant de dormir',
    why: 'Une sourate de trente versets a intercédé pour un homme jusqu’à ce qu’il soit pardonné : « Tabāraka-lladhī bi-yadihi-l-mulk ».',
    source: 'At-Tirmidhī 2891',
    href: '#/coran/67',
  },
];

export const DEFAULT_HIDDEN: Record<string, boolean> = { duha: true, parents: true, subhanallah: true };

export interface GoalContext {
  goals: GoalsState;
  prayerLog: PrayerLog;
  /** Adhkar categories finished on `adhkarDate`. */
  adhkarComplete: Record<string, boolean>;
  adhkarDate: string;
  khatm: KhatmState;
  hijriOffset: number;
}

export interface GoalStatus {
  goal: Goal;
  done: boolean;
  /** Completed automatically from what the user did elsewhere in the app. */
  auto: boolean;
}

/** Goals that apply to the given day, with whether each is done. */
export function goalsFor(day: DayParts, ctx: GoalContext): GoalStatus[] {
  const key = dayKey(day);
  const weekday = new Date(Date.UTC(day.y, day.m - 1, day.d)).getUTCDay();
  const hijri = hijriDate(noonUtc(day.y, day.m, day.d), ctx.hijriOffset).d;
  const manual = ctx.goals.done[key] ?? {};
  const hidden = { ...DEFAULT_HIDDEN, ...ctx.goals.hidden };
  const adhkar = ctx.adhkarDate === key ? ctx.adhkarComplete : {};

  const automatic: Record<string, boolean> = {
    prieres: OBLIGATORY.every((p) => ctx.prayerLog[key]?.[p]),
    'adhkar-matin': !!adhkar.matin,
    'adhkar-soir': !!adhkar.soir,
    wird: !!ctx.khatm.log[key] && !!todaysPortion(ctx.khatm, key)?.doneToday,
  };

  return GOALS.filter((g) => !hidden[g.id] && (!g.when || g.when(day, weekday, hijri))).map((goal) => {
    const auto = automatic[goal.id] ?? false;
    return { goal, auto, done: auto || !!manual[goal.id] };
  });
}

/** Consecutive days, ending today or yesterday, where at least 70% of the goals were met. */
export function streak(scores: Record<string, number>, today: DayParts, addDays: (d: DayParts, n: number) => DayParts): number {
  let n = 0;
  for (let i = 0; i < 3650; i++) {
    const s = scores[dayKey(addDays(today, -i))] ?? 0;
    if (s >= 0.7) n++;
    else if (i > 0) break;
  }
  return n;
}
