import { useEffect, useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { QuizRunner } from '../components/QuizRunner';
import { SectionTitle, Spinner, TopBar, share } from '../components/ui';
import { PROPHET_STORIES } from '../data/prophets';
import { SUNNAH_STORIES } from '../data/sunnah-stories';
import { SURAHS } from '../data/surahs';
import type { ProphetStory, QuranPassage, SunnahStory } from '../data/types';
import { toArabicDigits } from '../lib/hijri';
import { fromBank } from '../lib/quiz';
import { TRANSLATIONS, loadSurah } from '../lib/quran';
import { learnStore, settingsStore, useStore } from '../lib/settings';

export function StoriesIndex() {
  const [learn] = useStore(learnStore);
  return (
    <>
      <TopBar title="Histoires" subtitle="قَصَص" backTo="/apprendre" />
      <div class="page">
        <p class="muted" style={{ margin: '0 4px 6px' }}>
          « Dans leurs récits il y a certes une leçon pour les gens doués d’intelligence. » (Coran 12:111)
        </p>
        <SectionTitle>Les prophètes et les récits du Coran</SectionTitle>
        <div class="list">
          {PROPHET_STORIES.map((s, i) => (
            <a class="list-item" href={`#/histoires/coran/${s.id}`} key={s.id}>
              <span class="badge star">{i + 1}</span>
              <div class="grow">
                <div class="title">{s.name}</div>
                <div class="subtitle">
                  {s.title}
                  {learn.read[`story-${s.id}`] ? ' · lu' : ''}
                </div>
              </div>
              <span class="surah-name-ar" style={{ fontSize: '1.05rem', maxWidth: '38%', textAlign: 'right' }}>
                {s.nameAr}
              </span>
            </a>
          ))}
        </div>
        <SectionTitle>Récits de la Sunna</SectionTitle>
        <div class="list">
          {SUNNAH_STORIES.map((s) => (
            <a class="list-item" href={`#/histoires/sunna/${s.id}`} key={s.id}>
              <span class="badge">
                <Icon name="scroll" size={20} />
              </span>
              <div class="grow">
                <div class="title">{s.title}</div>
                <div class="subtitle">
                  {collectionLabel(s.hadith.collection)} {s.hadith.number.split('.')[0]}
                  {learn.read[`sunna-${s.id}`] ? ' · lu' : ''}
                </div>
              </div>
              <Icon name="chevron" size={18} />
            </a>
          ))}
        </div>
      </div>
    </>
  );
}

function collectionLabel(c: 'bukhari' | 'muslim') {
  return c === 'bukhari' ? 'Al-Bukhārī' : 'Muslim';
}

function useMarkRead(key: string) {
  const [, setLearn] = useStore(learnStore);
  useEffect(() => {
    setLearn((s) => ({ ...s, read: { ...s.read, [key]: Date.now() } }));
  }, [key]);
}

function Passage({ passage }: { passage: QuranPassage }) {
  const [settings] = useStore(settingsStore);
  const translation = settings.quran.translation === 'none' ? 'fr-hamidullah' : settings.quran.translation;
  const [texts, setTexts] = useState<{ ar: string[]; tr: string[] } | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(passage.to - passage.from < 12);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([loadSurah('ar', passage.surah), loadSurah(translation, passage.surah)])
      .then(([ar, tr]) => !cancelled && setTexts({ ar, tr }))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [open, passage.surah, translation]);

  const surah = SURAHS[passage.surah - 1];
  const range = passage.from === passage.to ? `${passage.from}` : `${passage.from}–${passage.to}`;
  const verses = Array.from({ length: passage.to - passage.from + 1 }, (_, i) => passage.from + i);

  return (
    <section class="card" style={{ marginTop: '12px' }}>
      <div class="row">
        <div class="grow">
          <div style={{ fontWeight: 650 }}>{passage.title}</div>
          <div class="small muted">
            {surah.name} ({passage.surah}:{range})
          </div>
        </div>
        <a class="icon-btn" href={`#/coran/${passage.surah}?v=${passage.from}`} aria-label="Ouvrir dans le Coran">
          <Icon name="book" size={20} />
        </a>
      </div>
      {!open ? (
        <button class="btn secondary block" style={{ marginTop: '10px' }} onClick={() => setOpen(true)}>
          Lire les {verses.length} versets
        </button>
      ) : error ? (
        <div class="notice" style={{ marginTop: '10px' }}>
          Versets indisponibles hors-ligne : ouvrez cette sourate une fois avec une connexion.
        </div>
      ) : !texts ? (
        <Spinner />
      ) : (
        <div style={{ marginTop: '6px' }}>
          {verses.map((v) => (
            <div class="passage-verse" key={v}>
              <div class="ar" lang="ar">
                {texts.ar[v - 1]} <span class="verse-num">﴿{toArabicDigits(v)}﴾</span>
              </div>
              <div class="tr">
                <span class="muted small">{v}. </span>
                {texts.tr[v - 1]}
              </div>
            </div>
          ))}
          <div class="small muted" style={{ marginTop: '6px' }}>
            Traduction : {TRANSLATIONS[translation].label}
          </div>
        </div>
      )}
    </section>
  );
}

function Lessons({ lessons }: { lessons: string[] }) {
  return (
    <>
      <SectionTitle>Ce que l’on en retient</SectionTitle>
      <div class="card">
        <ul class="lessons">
          {lessons.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
    </>
  );
}

function StoryQuiz({ id, bank }: { id: string; bank: ProphetStory['quiz'] }) {
  const [round, setRound] = useState(0);
  const [started, setStarted] = useState(false);
  const [, setLearn] = useStore(learnStore);
  const [questions, setQuestions] = useState(() => fromBank(bank, bank.length));
  if (bank.length === 0) return null;
  return (
    <>
      <SectionTitle>Testez-vous</SectionTitle>
      {started ? (
        <QuizRunner
          key={round}
          questions={questions}
          onFinish={(score) => setLearn((s) => ({ ...s, best: { ...s.best, [id]: Math.max(s.best[id] ?? 0, score) } }))}
          onRestart={() => {
            setQuestions(fromBank(bank, bank.length));
            setRound(round + 1);
          }}
        />
      ) : (
        <button class="btn secondary block" onClick={() => setStarted(true)}>
          <Icon name="question" size={18} /> {bank.length} question{bank.length > 1 ? 's' : ''} sur ce récit
        </button>
      )}
    </>
  );
}

function NextLink<T extends { id: string; title: string }>({ list, current, base, label }: { list: T[]; current: string; base: string; label: (s: T) => string }) {
  const i = list.findIndex((s) => s.id === current);
  const next = list[i + 1];
  if (!next) return null;
  return (
    <a class="btn block" style={{ marginTop: '18px' }} href={`#/histoires/${base}/${next.id}`}>
      Récit suivant : {label(next)} <Icon name="chevron" size={18} />
    </a>
  );
}

export function ProphetStoryView({ id }: { id: string }) {
  const story = PROPHET_STORIES.find((s) => s.id === id);
  useMarkRead(`story-${id}`);
  if (!story) return <StoriesIndex />;
  return (
    <>
      <TopBar title={story.name} subtitle={story.title} backTo="/histoires" />
      <div class="page">
        <div class="story-hero">
          <div class="ar" lang="ar">
            {story.nameAr}
          </div>
          <h2>{story.name}</h2>
          <p>{story.title}</p>
        </div>
        <div class="card prose">
          {story.summary.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <SectionTitle>Dans le Coran</SectionTitle>
        {story.passages.map((p) => (
          <Passage passage={p} key={`${p.surah}:${p.from}`} />
        ))}
        <Lessons lessons={story.lessons} />
        <StoryQuiz id={`story-${story.id}`} bank={story.quiz} />
        <NextLink list={PROPHET_STORIES.map((s) => ({ ...s, title: s.name }))} current={story.id} base="coran" label={(s) => s.title} />
      </div>
    </>
  );
}

export function SunnahStoryView({ id }: { id: string }) {
  const story = SUNNAH_STORIES.find((s) => s.id === id);
  useMarkRead(`sunna-${id}`);
  if (!story) return <StoriesIndex />;
  const ref = `${collectionLabel(story.hadith.collection)} ${story.hadith.number.split('.')[0]}`;
  return (
    <>
      <TopBar title={story.title} subtitle={ref} backTo="/histoires" />
      <div class="page">
        <div class="story-hero">
          <Icon name="scroll" size={30} />
          <h2>{story.title}</h2>
          <p>Récit rapporté dans le Ṣaḥīḥ de {collectionLabel(story.hadith.collection)}</p>
        </div>
        <div class="card prose">
          <p>{story.intro}</p>
        </div>
        <SectionTitle>Le hadith</SectionTitle>
        <article class="card">
          <div class="hadith-text">
            {story.hadith.fr.split(/\n+/).map((p, i) => (
              <p key={i} style={{ margin: i ? '10px 0 0' : 0 }}>
                {p}
              </p>
            ))}
          </div>
          <div class="row" style={{ marginTop: '10px' }}>
            <span class="grow small muted">{ref}</span>
            <button class="icon-btn" aria-label="Partager" onClick={() => share(`${story.hadith.fr}\n\n— ${ref}`)}>
              <Icon name="share" size={20} />
            </button>
          </div>
        </article>
        <Lessons lessons={story.lessons} />
        <StoryQuiz id={`sunna-${story.id}`} bank={story.quiz} />
        <NextLink list={SUNNAH_STORIES} current={story.id} base="sunna" label={(s: SunnahStory) => s.title} />
        <p class="small muted" style={{ marginTop: '14px' }}>
          Traduction française du hadith : projet hadith-api (fawazahmed0).
        </p>
      </div>
    </>
  );
}
