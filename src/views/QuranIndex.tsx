import { useEffect, useMemo, useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { Spinner, TopBar } from '../components/ui';
import { JUZ_STARTS, SURAHS, normalizeLatin } from '../data/surahs';
import { searchTranslation, type SearchHit } from '../lib/quran';
import { readingStore, settingsStore, useStore } from '../lib/settings';
import { toArabicDigits } from '../lib/hijri';

type Tab = 'sourates' | 'juz' | 'favoris' | 'recherche';

export function QuranIndex({ initialTab }: { initialTab?: string }) {
  const [tab, setTab] = useState<Tab>((initialTab as Tab) || 'sourates');
  const [reading] = useStore(readingStore);
  const [filter, setFilter] = useState('');

  const surahs = useMemo(() => {
    const q = normalizeLatin(filter);
    if (!q) return SURAHS;
    return SURAHS.filter((s) => String(s.n) === filter.trim() || normalizeLatin(s.name).includes(q) || normalizeLatin(s.fr).includes(q));
  }, [filter]);

  return (
    <>
      <TopBar title="Le Saint Coran" subtitle="القرآن الكريم" />
      <div class="page">
        <div class="chip-row" role="tablist">
          {(
            [
              ['sourates', 'Sourates'],
              ['juz', 'Juz’'],
              ['favoris', 'Marque-pages'],
              ['recherche', 'Recherche'],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button class="chip" role="tab" aria-pressed={tab === id} aria-selected={tab === id} onClick={() => setTab(id)} key={id}>
              {label}
            </button>
          ))}
        </div>

        {reading.last && tab === 'sourates' && (
          <a class="card row" href={`#/coran/${reading.last.surah}?v=${reading.last.verse}`} style={{ margin: '8px 0 14px', textDecoration: 'none', color: 'inherit' }}>
            <span class="badge">
              <Icon name="book" size={20} />
            </span>
            <div class="grow">
              <div class="small muted">Reprendre la lecture</div>
              <div style={{ fontWeight: 650 }}>
                {SURAHS[reading.last.surah - 1].name} · verset {reading.last.verse}
              </div>
            </div>
            <Icon name="chevron" />
          </a>
        )}

        {tab === 'sourates' && (
          <>
            <div class="search" style={{ margin: '6px 0 12px' }}>
              <Icon name="search" size={20} />
              <input
                class="input"
                type="search"
                placeholder="Nom ou numéro de sourate"
                value={filter}
                onInput={(e) => setFilter((e.target as HTMLInputElement).value)}
                aria-label="Filtrer les sourates"
              />
            </div>
            <div class="list">
              {surahs.map((s) => (
                <a class="list-item" href={`#/coran/${s.n}`} key={s.n}>
                  <span class="badge star">{s.n}</span>
                  <div class="grow">
                    <div class="title">{s.name}</div>
                    <div class="subtitle">
                      {s.fr} · {s.verses} versets · {s.revelation === 'M' ? 'mecquoise' : 'médinoise'}
                    </div>
                  </div>
                  <span class="surah-name-ar">{s.ar}</span>
                </a>
              ))}
            </div>
          </>
        )}

        {tab === 'juz' && (
          <div class="list">
            {JUZ_STARTS.map(([s, v], i) => (
              <a class="list-item" href={`#/coran/${s}?v=${v}`} key={i}>
                <span class="badge">{i + 1}</span>
                <div class="grow">
                  <div class="title">Juz’ {i + 1}</div>
                  <div class="subtitle">
                    Commence à {SURAHS[s - 1].name}, verset {v}
                  </div>
                </div>
                <span class="surah-name-ar">الجزء {toArabicDigits(i + 1)}</span>
              </a>
            ))}
          </div>
        )}

        {tab === 'favoris' && <Bookmarks />}
        {tab === 'recherche' && <Search />}
      </div>
    </>
  );
}

function Bookmarks() {
  const [reading, setReading] = useStore(readingStore);
  if (reading.bookmarks.length === 0) {
    return (
      <div class="empty">
        <Icon name="bookmark" size={36} />
        <p>Aucun marque-page. Touchez l’icône de marque-page à côté d’un verset pour le retrouver ici.</p>
      </div>
    );
  }
  const sorted = [...reading.bookmarks].sort((a, b) => b.at - a.at);
  return (
    <div class="list">
      {sorted.map((b) => (
        <div class="list-item" key={`${b.surah}:${b.verse}`}>
          <a class="row grow" href={`#/coran/${b.surah}?v=${b.verse}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            <span class="badge">
              <Icon name="bookmark" size={18} />
            </span>
            <div class="grow">
              <div class="title">
                {SURAHS[b.surah - 1].name} {b.surah}:{b.verse}
              </div>
              <div class="subtitle">{new Date(b.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
          </a>
          <button
            class="icon-btn"
            aria-label="Supprimer le marque-page"
            onClick={() => setReading((r) => ({ ...r, bookmarks: r.bookmarks.filter((x) => !(x.surah === b.surah && x.verse === b.verse)) }))}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}

function Search() {
  const [settings] = useStore(settingsStore);
  const edition = settings.quran.translation === 'none' ? 'fr-hamidullah' : settings.quran.translation;
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (query.trim().length < 3) {
      setHits(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setBusy(true);
      setError(false);
      try {
        const r = await searchTranslation(edition, query);
        if (!cancelled) setHits(r);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, edition]);

  const q = query.trim();
  return (
    <>
      <div class="search" style={{ margin: '6px 0 12px' }}>
        <Icon name="search" size={20} />
        <input
          class="input"
          type="search"
          placeholder="Rechercher dans la traduction (ex. patience)"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          aria-label="Rechercher dans la traduction"
        />
      </div>
      {busy && <Spinner />}
      {error && <div class="notice">La recherche a besoin du texte complet : connectez-vous une fois ou téléchargez le Coran dans les réglages.</div>}
      {hits && !busy && (
        <p class="small muted" style={{ margin: '0 4px 10px' }}>
          {hits.length === 200 ? '200 premiers résultats' : `${hits.length} résultat${hits.length > 1 ? 's' : ''}`}
        </p>
      )}
      {hits && hits.length > 0 && (
        <div class="list">
          {hits.map((h) => (
            <a class="list-item" href={`#/coran/${h.surah}?v=${h.verse}`} key={`${h.surah}:${h.verse}`} style={{ alignItems: 'flex-start' }}>
              <span class="badge" style={{ fontSize: '0.75rem' }}>
                {h.surah}:{h.verse}
              </span>
              <div class="grow">
                <div class="subtitle" style={{ color: 'var(--text)' }}>
                  <Highlight text={h.text} query={q} />
                </div>
                <div class="subtitle">{SURAHS[h.surah - 1].name}</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // NFD + stripping marks keeps the same length for French text only when each
  // accented letter decomposes into one base + marks, so map indexes char by char.
  const map: number[] = [];
  let folded = '';
  [...text].forEach((ch, i) => {
    const f = norm(ch);
    for (let k = 0; k < f.length; k++) map.push(i);
    folded += f;
  });
  const at = folded.indexOf(norm(query));
  if (at < 0) return <>{text}</>;
  const chars = [...text];
  const start = map[at];
  const end = map[at + norm(query).length - 1] + 1;
  return (
    <>
      {chars.slice(0, start).join('')}
      <mark style={{ background: 'var(--gold-soft)', color: 'inherit', borderRadius: '3px' }}>{chars.slice(start, end).join('')}</mark>
      {chars.slice(end).join('')}
    </>
  );
}
