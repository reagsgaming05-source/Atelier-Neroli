import { Icon, type IconName } from '../components/Icon';
import { Poster } from '../components/Poster';
import { SectionTitle, TopBar } from '../components/ui';
import { GUIDES } from '../data/learn';
import { PROPHET_STORIES } from '../data/prophets';
import { SUNNAH_STORIES } from '../data/sunnah-stories';
import { learnStore, useStore } from '../lib/settings';

const GUIDE_ICONS: Record<string, IconName> = {
  piliers: 'kaaba',
  ablutions: 'water',
  ghusl: 'water',
  tayammum: 'hands',
  priere: 'clock',
  'prieres-surerogatoires': 'star',
  jumua: 'calendar',
};

export function Learn() {
  const [learn] = useStore(learnStore);
  const storiesRead = PROPHET_STORIES.filter((s) => learn.read[`story-${s.id}`]).length;
  const sunnaRead = SUNNAH_STORIES.filter((s) => learn.read[`sunna-${s.id}`]).length;

  return (
    <>
      <TopBar title="Apprendre" subtitle="Histoires, hadiths, guides et quiz" />
      <div class="page">
        <a class="feature-card" href="#/histoires">
          <Poster storyId="nuh" episode={1} label="Histoires des prophètes" />
          <span class="info">
            <b>Histoires des prophètes</b>
            <small>
              {PROPHET_STORIES.length} séries illustrées et racontées
              {storiesRead > 0 ? ` · ${storiesRead} commencée${storiesRead > 1 ? 's' : ''}` : ''}
            </small>
          </span>
        </a>
        <a class="feature-card" href="#/histoires">
          <Poster storyId="grotte" label="Récits de la Sunna" />
          <span class="info">
            <b>Récits de la Sunna</b>
            <small>
              {SUNNAH_STORIES.length} histoires racontées par le Prophète ﷺ
              {sunnaRead > 0 ? ` · ${sunnaRead} lue${sunnaRead > 1 ? 's' : ''}` : ''}
            </small>
          </span>
        </a>

        <SectionTitle>Hadiths et connaissances</SectionTitle>
        <div class="list">
          {[
            { href: '#/hadiths/nawawi', icon: 'book', title: 'Les 40 hadiths', subtitle: 'Les bases de la religion selon an-Nawawī' },
            { href: '#/hadiths/qudsi', icon: 'star', title: 'Hadiths qudsi', subtitle: '40 paroles d’Allah rapportées par le Prophète ﷺ' },
            { href: '#/noms', icon: 'heart', title: '99 noms d’Allah', subtitle: 'Les connaître et les comprendre' },
            { href: '#/quiz', icon: 'question', title: 'Quiz', subtitle: 'Coran, noms d’Allah, prophètes, Sunna' },
          ].map((it) => (
            <a class="list-item" href={it.href} key={it.href}>
              <Icon name={it.icon as IconName} />
              <div class="grow">
                <div class="title">{it.title}</div>
                <div class="subtitle">{it.subtitle}</div>
              </div>
              <Icon name="chevron" size={18} />
            </a>
          ))}
        </div>

        <SectionTitle>Guides pratiques</SectionTitle>
        <div class="list">
          {GUIDES.map((g) => (
            <a class="list-item" href={`#/apprendre/guide/${g.id}`} key={g.id}>
              <span class="badge">
                <Icon name={GUIDE_ICONS[g.id] ?? 'learn'} size={20} />
              </span>
              <div class="grow">
                <div class="title">{g.title}</div>
                <div class="subtitle">{g.subtitle}</div>
              </div>
              <Icon name="chevron" size={18} />
            </a>
          ))}
        </div>

        <SectionTitle>Pratiquer</SectionTitle>
        <div class="list">
          <a class="list-item" href="#/journee">
            <Icon name="target" />
            <div class="grow">
              <div class="title">Ma journée</div>
              <div class="subtitle">Bonnes actions du jour et régularité</div>
            </div>
            <Icon name="chevron" size={18} />
          </a>
          <a class="list-item" href="#/khatm">
            <Icon name="book" />
            <div class="grow">
              <div class="title">Lire tout le Coran</div>
              <div class="subtitle">Un plan de lecture à votre rythme</div>
            </div>
            <Icon name="chevron" size={18} />
          </a>
        </div>
      </div>
    </>
  );
}

export function Guide({ id }: { id: string }) {
  const guide = GUIDES.find((g) => g.id === id);
  if (!guide) return <Learn />;
  let n = 0;
  return (
    <>
      <TopBar title={guide.title} subtitle={guide.subtitle} backTo="/apprendre" />
      <div class="page">
        {guide.intro && (
          <div class="card prose">
            <p>{guide.intro}</p>
          </div>
        )}
        {guide.sections.map((section) => (
          <section key={section.title}>
            <SectionTitle>{section.title}</SectionTitle>
            <div class="card" style={{ paddingBlock: '4px' }}>
              {section.steps.map((step) => {
                n++;
                return (
                  <div class="guide-step" key={step.title}>
                    <span class="step-num">{n}</span>
                    <div class="grow" style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 650 }}>{step.title}</div>
                      <div style={{ marginTop: '4px', lineHeight: 1.6 }}>{step.text}</div>
                      {step.ar && (
                        <div class="ar" lang="ar">
                          {step.ar}
                        </div>
                      )}
                      {step.translit && <div class="translit" style={{ fontStyle: 'italic', color: 'var(--primary)' }}>{step.translit}</div>}
                      {step.fr && <div style={{ marginTop: '4px' }}>« {step.fr} »</div>}
                      {step.source && <div class="small muted" style={{ marginTop: '6px' }}>{step.source}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        {guide.notes && guide.notes.length > 0 && (
          <>
            <SectionTitle>À savoir</SectionTitle>
            <div class="card">
              <ul class="lessons">
                {guide.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  );
}
