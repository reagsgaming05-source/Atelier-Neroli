import { SURAHS } from '../data/surahs';

export type EditionId = 'ar' | 'fr-hamidullah' | 'fr-maash' | 'translit';

export const TRANSLATIONS = {
  'fr-hamidullah': { label: 'Muhammad Hamidullah', source: 'Tanzil.net' },
  'fr-maash': { label: 'Rachid Maach', source: 'QuranEnc.com' },
} as const;

const cache = new Map<string, Promise<string[]>>();

export function loadSurah(edition: EditionId, surah: number): Promise<string[]> {
  const key = `${edition}/${surah}`;
  let p = cache.get(key);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/quran/${edition}/${surah}.json`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<string[]>;
    });
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

/**
 * Fetches every surah of the given editions so the service worker caches them
 * for offline reading. Reports progress from 0 to 1.
 */
export async function downloadAll(editions: EditionId[], onProgress: (ratio: number) => void): Promise<void> {
  const jobs = editions.flatMap((e) => SURAHS.map((s) => [e, s.n] as const));
  let done = 0;
  const queue = [...jobs];
  const worker = async () => {
    while (queue.length) {
      const [e, n] = queue.shift()!;
      await loadSurah(e, n);
      onProgress(++done / jobs.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
}

export interface SearchHit {
  surah: number;
  verse: number;
  text: string;
}

/** Case- and accent-insensitive search in a translation. */
export async function searchTranslation(edition: EditionId, query: string, limit = 200): Promise<SearchHit[]> {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = norm(query.trim());
  if (q.length < 2) return [];
  const all = await Promise.all(SURAHS.map((s) => loadSurah(edition, s.n)));
  const hits: SearchHit[] = [];
  all.forEach((verses, i) => {
    verses.forEach((text, j) => {
      if (hits.length < limit && norm(text).includes(q)) hits.push({ surah: i + 1, verse: j + 1, text });
    });
  });
  return hits;
}

/** Reciters available on everyayah.com (verse-by-verse MP3). */
export const RECITERS = [
  { id: 'Alafasy_128kbps', name: 'Mishary Rashid Alafasy' },
  { id: 'Abdul_Basit_Murattal_192kbps', name: 'Abdul Basit (Murattal)' },
  { id: 'Husary_128kbps', name: 'Mahmoud Khalil Al-Husary' },
  { id: 'Minshawy_Murattal_128kbps', name: 'Mohamed Siddiq Al-Minshawi' },
  { id: 'Abdurrahmaan_As-Sudais_192kbps', name: 'Abdurrahman As-Sudais' },
  { id: 'Saood_ash-Shuraym_128kbps', name: 'Saud Ash-Shuraim' },
  { id: 'MaherAlMuaiqly128kbps', name: 'Maher Al-Muaiqly' },
];

export function audioUrl(reciter: string, surah: number, verse: number): string {
  const pad = (n: number) => String(n).padStart(3, '0');
  return `https://everyayah.com/data/${reciter}/${pad(surah)}${pad(verse)}.mp3`;
}
