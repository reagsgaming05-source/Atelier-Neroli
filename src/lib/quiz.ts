import daily from '../data/daily.json';
import { SURAHS } from '../data/surahs';
import type { DivineName, QuizQuestion } from '../data/types';

/** A quiz question with the material to show alongside it. */
export interface Question extends QuizQuestion {
  /** Optional Arabic text shown above the question. */
  ar?: string;
}

function shuffle<T>(list: T[], rand: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Builds a question from the right answer and distractors, in random order. */
function make(q: string, right: string, wrong: string[], ref: string, rand: () => number, ar?: string): Question {
  const options = shuffle([right, ...shuffle([...new Set(wrong.filter((w) => w !== right))], rand).slice(0, 3)], rand);
  return { q, options, answer: options.indexOf(right), ref, ar };
}

function pick<T>(list: T[], n: number, rand: () => number, except?: T): T[] {
  return shuffle(list.filter((x) => x !== except), rand).slice(0, n);
}

/** Questions generated from the Quran metadata and the verses of the day. */
export function quranQuestions(count: number, rand: () => number = Math.random): Question[] {
  const out: Question[] = [];
  const makers = [
    () => {
      const v = daily[Math.floor(rand() * daily.length)];
      const s = SURAHS[v.surah - 1];
      return make(
        'De quelle sourate vient ce verset ?',
        s.name,
        pick(SURAHS, 3, rand, s).map((x) => x.name),
        `Coran ${v.surah}:${v.verse}`,
        rand,
        v.ar,
      );
    },
    () => {
      const s = SURAHS[Math.floor(rand() * SURAHS.length)];
      const wrong = [s.verses - 3, s.verses + 2, s.verses + 7, s.verses - 1, s.verses + 4].filter((n) => n > 2);
      return make(`Combien de versets compte la sourate ${s.name} ?`, String(s.verses), pick(wrong.map(String), 3, rand), `Sourate ${s.n}`, rand);
    },
    () => {
      const s = SURAHS[Math.floor(rand() * SURAHS.length)];
      return make(`Que signifie le nom de la sourate ${s.name} ?`, s.fr, pick(SURAHS, 3, rand, s).map((x) => x.fr), `Sourate ${s.n}`, rand);
    },
    () => {
      const s = SURAHS[Math.floor(rand() * 113) + 1];
      return make(`Quelle sourate porte le numéro ${s.n} ?`, s.name, [SURAHS[s.n - 2].name, SURAHS[s.n % 114].name, ...pick(SURAHS, 2, rand, s).map((x) => x.name)], `Sourate ${s.n}`, rand);
    },
  ];
  for (let i = 0; i < count; i++) out.push(makers[Math.floor(rand() * makers.length)]());
  return out;
}

/** Questions on the meaning of the names of Allah. */
export function nameQuestions(names: DivineName[], count: number, rand: () => number = Math.random): Question[] {
  return pick(names, count, rand).map((n, i) =>
    i % 2 === 0
      ? make(`Que signifie le nom ${n.translit} ?`, n.fr, pick(names, 3, rand, n).map((x) => x.fr), `Nom n° ${n.n}`, rand, n.ar)
      : make(`Quel nom d’Allah signifie « ${n.fr} » ?`, n.translit, pick(names, 3, rand, n).map((x) => x.translit), `Nom n° ${n.n}`, rand),
  );
}

/** A random selection from a fixed question bank, options shuffled. */
export function fromBank(bank: QuizQuestion[], count: number, rand: () => number = Math.random): Question[] {
  return pick(bank, count, rand).map((q) => {
    const right = q.options[q.answer];
    const options = shuffle(q.options, rand);
    return { ...q, options, answer: options.indexOf(right) };
  });
}
