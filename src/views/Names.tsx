import { useMemo, useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { TopBar } from '../components/ui';
import { NAMES } from '../data/names';
import { normalizeLatin } from '../data/surahs';

export function Names() {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const n = normalizeLatin(q);
    if (!n) return NAMES;
    return NAMES.filter((x) => normalizeLatin(x.translit).includes(n) || normalizeLatin(x.fr).includes(n) || String(x.n) === q.trim());
  }, [q]);

  return (
    <>
      <TopBar title="Les 99 noms d’Allah" subtitle="الأسماء الحسنى" backTo="/plus" />
      <div class="page">
        <p class="small muted" style={{ margin: '0 4px 12px' }}>
          « Allah a quatre-vingt-dix-neuf noms, cent moins un : quiconque les dénombre entrera au Paradis. » (Al-Bukhārī 2736, Muslim
          2677)
        </p>
        <div class="search" style={{ marginBottom: '12px' }}>
          <Icon name="search" size={20} />
          <input class="input" type="search" placeholder="Rechercher un nom" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
        </div>
        <div class="names-grid">
          {list.map((x) => (
            <div class="name-card" key={x.n}>
              <div class="num">{x.n}</div>
              <div class="ar" lang="ar">
                {x.ar}
              </div>
              <div class="tl">{x.translit}</div>
              <div class="fr">{x.fr}</div>
            </div>
          ))}
        </div>
        <p class="small muted" style={{ margin: '14px 4px' }}>
          Liste selon la narration d’At-Tirmidhī ; les savants divergent sur l’énumération exacte.
        </p>
      </div>
    </>
  );
}
