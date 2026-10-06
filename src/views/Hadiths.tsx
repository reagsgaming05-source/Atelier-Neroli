import { useEffect, useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { Spinner, TopBar, share } from '../components/ui';
import { learnStore, useStore } from '../lib/settings';

export interface HadithEntry {
  n: number;
  ar: string;
  fr: string;
}

export const COLLECTIONS = {
  nawawi: { title: 'Les 40 hadiths', subtitle: 'Recueil de l’imam an-Nawawī', titleAr: 'الأربعون النووية' },
  qudsi: { title: 'Hadiths qudsi', subtitle: 'Paroles d’Allah rapportées par le Prophète ﷺ', titleAr: 'الأحاديث القدسية' },
} as const;

export type CollectionId = keyof typeof COLLECTIONS;

const cache = new Map<string, Promise<HadithEntry[]>>();

export function loadCollection(id: CollectionId): Promise<HadithEntry[]> {
  let p = cache.get(id);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/hadith/${id}.json`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}

export function useCollection(id: CollectionId) {
  const [list, setList] = useState<HadithEntry[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadCollection(id)
      .then((l) => !cancelled && setList(l))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [id]);
  return { list, error };
}

/** The first words of a hadith, skipping the narrator's introduction. */
export function hadithTeaser(fr: string, max = 140): string {
  const quote = fr.indexOf('«');
  const body = quote > 0 && quote < 220 ? fr.slice(quote + 1) : fr;
  const clean = body.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max).replace(/\s\S*$/, '')}…` : clean;
}

export function HadithList({ id }: { id: CollectionId }) {
  const { list, error } = useCollection(id);
  const [learn] = useStore(learnStore);
  const c = COLLECTIONS[id];
  return (
    <>
      <TopBar title={c.title} subtitle={c.subtitle} backTo="/apprendre" />
      <div class="page">
        {error && <div class="notice">Recueil indisponible hors-ligne pour le moment : ouvrez-le une fois avec une connexion.</div>}
        {!list && !error && <Spinner />}
        {list && (
          <div class="list">
            {list.map((h) => (
              <a class="list-item" href={`#/hadiths/${id}/${h.n}`} key={h.n} style={{ alignItems: 'flex-start' }}>
                <span class="badge">{h.n}</span>
                <div class="grow">
                  <div class="subtitle" style={{ color: 'var(--text)' }}>
                    {hadithTeaser(h.fr)}
                  </div>
                  {learn.read[`${id}-${h.n}`] && <div class="subtitle">Lu</div>}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function HadithView({ id, n }: { id: CollectionId; n: number }) {
  const { list, error } = useCollection(id);
  const [, setLearn] = useStore(learnStore);
  const c = COLLECTIONS[id];
  const h = list?.find((x) => x.n === n);

  useEffect(() => {
    if (h) setLearn((s) => ({ ...s, read: { ...s.read, [`${id}-${n}`]: Date.now() } }));
  }, [h, id, n]);

  return (
    <>
      <TopBar title={`${c.title} · n° ${n}`} subtitle={c.titleAr} backTo={`/hadiths/${id}`} />
      <div class="page">
        {error && <div class="notice">Recueil indisponible hors-ligne pour le moment.</div>}
        {!list && !error && <Spinner />}
        {list && !h && <div class="empty">Hadith introuvable.</div>}
        {h && (
          <>
            <article class="card">
              <div class="ar" lang="ar" style={{ fontSize: '1.45rem', lineHeight: 2.1, textAlign: 'right' }}>
                {h.ar}
              </div>
            </article>
            <article class="card" style={{ lineHeight: 1.7 }}>
              {h.fr.split(/\n+/).map((p, i) => (
                <p key={i} style={{ margin: i ? '10px 0 0' : 0 }}>
                  {p}
                </p>
              ))}
              <div class="row" style={{ marginTop: '12px' }}>
                <span class="grow small muted">
                  {c.title}, n° {h.n}
                </span>
                <button class="icon-btn" aria-label="Partager" onClick={() => share(`${h.fr}\n\n— ${c.title}, n° ${h.n}`)}>
                  <Icon name="share" size={20} />
                </button>
              </div>
            </article>
            <div class="reader-nav">
              {n > 1 && (
                <a class="btn secondary" href={`#/hadiths/${id}/${n - 1}`}>
                  <Icon name="back" size={18} /> Précédent
                </a>
              )}
              {list && n < list.length && (
                <a class="btn" href={`#/hadiths/${id}/${n + 1}`}>
                  Suivant <Icon name="chevron" size={18} />
                </a>
              )}
            </div>
            <p class="small muted" style={{ marginTop: '14px' }}>
              Texte arabe et traduction française : projet hadith-api (fawazahmed0).
            </p>
          </>
        )}
      </div>
    </>
  );
}
