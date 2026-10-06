import { useState } from 'preact/hooks';
import { QuizRunner } from '../components/QuizRunner';
import { TopBar } from '../components/ui';
import { NAMES } from '../data/names';
import { PROPHET_STORIES } from '../data/prophets';
import { SUNNAH_STORIES } from '../data/sunnah-stories';
import { fromBank, nameQuestions, quranQuestions, type Question } from '../lib/quiz';
import { learnStore, useStore } from '../lib/settings';

const ROUND = 10;

const CATEGORIES = {
  coran: { label: 'Coran', build: () => quranQuestions(ROUND) },
  noms: { label: 'Noms d’Allah', build: () => nameQuestions(NAMES, ROUND) },
  prophetes: { label: 'Prophètes', build: () => fromBank(PROPHET_STORIES.flatMap((s) => s.quiz), ROUND) },
  sunna: { label: 'Sunna', build: () => fromBank(SUNNAH_STORIES.flatMap((s) => s.quiz), ROUND) },
  melange: {
    label: 'Mélange',
    build: (): Question[] =>
      [
        ...quranQuestions(3),
        ...nameQuestions(NAMES, 2),
        ...fromBank(PROPHET_STORIES.flatMap((s) => s.quiz), 3),
        ...fromBank(SUNNAH_STORIES.flatMap((s) => s.quiz), 2),
      ].sort(() => Math.random() - 0.5),
  },
} as const;

type CategoryId = keyof typeof CATEGORIES;

export function Quiz() {
  const [category, setCategory] = useState<CategoryId>('melange');
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState<Question[]>(() => CATEGORIES.melange.build());
  const [learn, setLearn] = useStore(learnStore);

  const start = (c: CategoryId) => {
    setCategory(c);
    setQuestions(CATEGORIES[c].build());
    setRound((r) => r + 1);
  };

  const best = learn.best[`quiz-${category}`];

  return (
    <>
      <TopBar title="Quiz" subtitle={best != null ? `Meilleur score : ${best}/${questions.length}` : 'Apprendre en s’amusant'} backTo="/apprendre" />
      <div class="page">
        <div class="chip-row" style={{ marginBottom: '12px' }}>
          {(Object.keys(CATEGORIES) as CategoryId[]).map((c) => (
            <button class="chip" aria-pressed={category === c} onClick={() => start(c)} key={c}>
              {CATEGORIES[c].label}
            </button>
          ))}
        </div>
        <QuizRunner
          key={round}
          questions={questions}
          onFinish={(score) =>
            setLearn((s) => ({ ...s, best: { ...s.best, [`quiz-${category}`]: Math.max(s.best[`quiz-${category}`] ?? 0, score) } }))
          }
          onRestart={() => start(category)}
        />
        <p class="small muted" style={{ margin: '14px 4px' }}>
          Les questions viennent du Coran, des 99 noms et des récits de l’application ; chaque réponse indique sa source.
        </p>
      </div>
    </>
  );
}
