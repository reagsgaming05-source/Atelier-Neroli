import { useState } from 'preact/hooks';
import { Icon } from './Icon';
import { haptic } from './ui';
import type { Question } from '../lib/quiz';

/** Plays a list of questions one at a time and reports the score at the end. */
export function QuizRunner({
  questions,
  onFinish,
  onRestart,
}: {
  questions: Question[];
  onFinish?: (score: number) => void;
  onRestart?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);

  if (questions.length === 0) return null;

  if (over) {
    const ratio = score / questions.length;
    return (
      <div class="result">
        <div class="small" style={{ opacity: 0.8 }}>
          Votre score
        </div>
        <strong>
          {score}/{questions.length}
        </strong>
        <p style={{ margin: '6px 0 14px' }}>
          {ratio === 1 ? 'Parfait, mā shā’ Allāh !' : ratio >= 0.7 ? 'Très bien, continuez ainsi.' : 'Chaque essai fait apprendre : relisez et recommencez.'}
        </p>
        {onRestart && (
          <button class="btn" style={{ background: '#d9b45a', color: '#1b1a12' }} onClick={onRestart}>
            <Icon name="reset" size={18} /> Nouvelle série
          </button>
        )}
      </div>
    );
  }

  const q = questions[index];
  const answered = chosen !== null;

  const choose = (i: number) => {
    if (answered) return;
    setChosen(i);
    const right = i === q.answer;
    haptic(right ? 15 : 60);
    if (right) setScore((s) => s + 1);
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setOver(true);
      onFinish?.(score);
    } else {
      setIndex(index + 1);
      setChosen(null);
    }
  };

  return (
    <div class="card quiz">
      <div class="row small muted" style={{ justifyContent: 'space-between' }}>
        <span>
          Question {index + 1}/{questions.length}
        </span>
        <span>Score {score}</span>
      </div>
      <div class="progress" style={{ margin: '8px 0 14px' }}>
        <div style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>
      {q.ar && (
        <div class="ar" lang="ar" style={{ fontSize: '1.5rem', textAlign: 'right', marginBottom: '8px' }}>
          {q.ar}
        </div>
      )}
      <div style={{ fontWeight: 650, fontSize: '1.08rem', marginBottom: '12px' }}>{q.q}</div>
      <div class="stack">
        {q.options.map((o, i) => {
          const state = !answered ? '' : i === q.answer ? 'right' : i === chosen ? 'wrong' : 'dim';
          return (
            <button class={`option ${state}`} key={o} onClick={() => choose(i)} disabled={answered}>
              <span class="grow">{o}</span>
              {state === 'right' && <Icon name="check" size={20} />}
              {state === 'wrong' && <Icon name="close" size={20} />}
            </button>
          );
        })}
      </div>
      {answered && (
        <div class="row" style={{ marginTop: '14px' }}>
          <span class="grow small muted">Référence : {q.ref}</span>
          <button class="btn" onClick={next}>
            {index + 1 >= questions.length ? 'Voir le score' : 'Suivante'}
          </button>
        </div>
      )}
    </div>
  );
}
