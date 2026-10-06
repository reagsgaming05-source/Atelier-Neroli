/**
 * Vérifie les histoires des prophètes de src/data/prophets.ts.
 *
 * Les contrôles structurels s'exécutent toujours. Les contrôles de fidélité au
 * texte s'appuient sur la traduction de Muhammad Hamidullah, non incluse dans le
 * dépôt. Pour les lancer :
 *
 *   curl -sLo /tmp/fra-muhammadhamidul.json \
 *     https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/fra-muhammadhamidul.json
 *   QURAN_FR_JSON=/tmp/fra-muhammadhamidul.json npx vitest run tests/prophets.test.ts
 *
 * Sans la variable d'environnement QURAN_FR_JSON, seuls les contrôles
 * structurels s'exécutent.
 */
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import meta from '../src/data/quran-meta.json';
import { PROPHET_STORIES } from '../src/data/prophets';

const QURAN_FR_JSON = process.env.QURAN_FR_JSON;

/** Number of verses of each surah, indexed by surah number. */
const VERSES: number[] = [0, ...meta.surahs.map((s) => s.verses)];

/**
 * Words that must appear (without accents, as whole words) in the Hamidullah
 * translation of each story's passages: a cheap guard against a wrong surah or
 * verse range. Every listed word must be found.
 */
const KEYWORDS: Record<string, string[]> = {
  adam: ['Adam', 'Iblis'],
  nuh: ['Noé', 'arche'],
  hud: ['Hûd', 'Aad'],
  salih: ['Sâlih', 'Thamûd', 'chamelle'],
  ibrahim: ['Abraham', 'feu', 'oiseaux'],
  lut: ['Lot'],
  ismail: ['Ismaël', 'Maison'],
  shuayb: ['Chuayb', 'Madyan'],
  yusuf: ['Joseph', 'Jacob', 'puits'],
  musa: ['Moïse', 'Pharaon', 'Aaron'],
  qarun: ['Coré'],
  'talut-jalut': ['Tâlût', 'Goliath'],
  dawud: ['David'],
  sulayman: ['Salomon', 'huppe', 'fourmis'],
  ayyub: ['Job'],
  yunus: ['Jonas', 'poisson'],
  'zakariya-yahya': ['Zacharie', 'Yahya'],
  maryam: ['Marie'],
  isa: ['Jésus', 'Marie'],
  'ashab-al-kahf': ['caverne', 'chien'],
  'dhul-qarnayn': ['Qarnayn', 'jûj'],
  luqman: ['Luqmân'],
  'les-deux-jardins': ['jardins', 'compagnon'],
  'ashab-al-jannah': ['verger'],
  'ashab-al-fil': ['Éléphant'],
  muhammad: ['Muhammad', 'grotte'],
};

/** Lower case, without accents, with a single kind of apostrophe. */
function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[’‘`´]/g, "'")
    .toLowerCase();
}

function containsWord(text: string, word: string): boolean {
  const w = fold(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![a-z])${w}(?![a-z])`).test(fold(text));
}

/** Parses "Coran 12:4" or "Coran 12:26-28". */
function parseRef(ref: string): { surah: number; from: number; to: number } | null {
  const m = /^Coran (\d+):(\d+)(?:-(\d+))?$/.exec(ref);
  if (!m) return null;
  return { surah: Number(m[1]), from: Number(m[2]), to: Number(m[3] ?? m[2]) };
}

function isValidRange(surah: number, from: number, to: number): boolean {
  return (
    Number.isInteger(surah) &&
    Number.isInteger(from) &&
    Number.isInteger(to) &&
    surah >= 1 &&
    surah <= 114 &&
    from >= 1 &&
    from <= to &&
    to <= VERSES[surah]
  );
}

describe('histoires des prophètes : structure', () => {
  it('quran-meta.json décrit bien 114 sourates', () => {
    expect(meta.surahs).toHaveLength(114);
    expect(VERSES[2]).toBe(286);
  });

  it('contient au moins les histoires attendues, avec des identifiants uniques en kebab-case', () => {
    const ids = PROPHET_STORIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id, id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    for (const id of [
      'adam', 'nuh', 'hud', 'salih', 'ibrahim', 'lut', 'shuayb', 'yusuf', 'musa', 'dawud',
      'sulayman', 'ayyub', 'yunus', 'zakariya-yahya', 'maryam', 'isa', 'ashab-al-kahf',
      'dhul-qarnayn', 'luqman', 'talut-jalut', 'qarun', 'les-deux-jardins',
      'ashab-al-jannah', 'ashab-al-fil',
    ]) {
      expect(ids, id).toContain(id);
    }
  });

  it.each(PROPHET_STORIES.map((s) => [s.id, s] as const))('%s : champs non vides', (_id, story) => {
    for (const field of [story.name, story.nameAr, story.title]) expect(field.trim()).not.toBe('');
    expect(story.nameAr).toMatch(/[؀-ۿ]/);
    expect(story.summary.length).toBeGreaterThanOrEqual(1);
    expect(story.lessons.length).toBeGreaterThanOrEqual(1);
    expect(story.passages.length).toBeGreaterThanOrEqual(1);
    expect(story.quiz.length).toBeGreaterThanOrEqual(1);
    for (const text of [...story.summary, ...story.lessons]) expect(text.trim()).not.toBe('');
  });

  it.each(PROPHET_STORIES.map((s) => [s.id, s] as const))('%s : passages valides', (_id, story) => {
    const seen = new Set<string>();
    for (const p of story.passages) {
      const label = `${story.id} ${p.surah}:${p.from}-${p.to}`;
      expect(isValidRange(p.surah, p.from, p.to), label).toBe(true);
      expect(p.title.trim(), label).not.toBe('');
      expect(seen.has(`${p.surah}:${p.from}-${p.to}`), `${label} en double`).toBe(false);
      seen.add(`${p.surah}:${p.from}-${p.to}`);
    }
  });

  it.each(PROPHET_STORIES.map((s) => [s.id, s] as const))('%s : quiz valide', (_id, story) => {
    for (const q of story.quiz) {
      expect(q.q.trim(), story.id).not.toBe('');
      expect(q.options.length, q.q).toBeGreaterThanOrEqual(3);
      expect(q.options.length, q.q).toBeLessThanOrEqual(4);
      expect(new Set(q.options.map((o) => fold(o.trim()))).size, q.q).toBe(q.options.length);
      for (const o of q.options) expect(o.trim(), q.q).not.toBe('');
      expect(Number.isInteger(q.answer), q.q).toBe(true);
      expect(q.answer, q.q).toBeGreaterThanOrEqual(0);
      expect(q.answer, q.q).toBeLessThan(q.options.length);

      // The answer must come from the story's own passages.
      const ref = parseRef(q.ref);
      expect(ref, q.ref).not.toBeNull();
      if (!ref) continue;
      expect(isValidRange(ref.surah, ref.from, ref.to), q.ref).toBe(true);
      const covered = story.passages.some((p) => p.surah === ref.surah && p.from <= ref.from && ref.to <= p.to);
      expect(covered, `${story.id} : ${q.ref} hors des passages`).toBe(true);
    }
  });

  it.each(PROPHET_STORIES.map((s) => [s.id, s] as const))('%s : références de versets du texte valides', (_id, story) => {
    // References such as "(11:40)", "(7:20-21)" or "(2:258 ; 2:260)".
    const text = [...story.summary, ...story.lessons].join('\n');
    const refs = [...text.matchAll(/(?<![\d:])(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?(?![\d:])/g)];
    for (const m of refs) {
      const surah = Number(m[1]);
      const from = Number(m[2]);
      const to = Number(m[3] ?? m[2]);
      expect(isValidRange(surah, from, to), `${story.id} : ${m[0]}`).toBe(true);
    }
  });

  it('chaque histoire a des mots-clés de contrôle', () => {
    for (const s of PROPHET_STORIES) expect(KEYWORDS[s.id], s.id).toBeDefined();
    for (const id of Object.keys(KEYWORDS)) expect(PROPHET_STORIES.some((s) => s.id === id), id).toBe(true);
  });
});

describe('histoires des prophètes : fidélité au texte (Hamidullah)', () => {
  it.skipIf(!QURAN_FR_JSON)('les mots-clés apparaissent dans la traduction des passages', async () => {
    const data = JSON.parse(await readFile(QURAN_FR_JSON as string, 'utf8')) as {
      quran: { chapter: number; verse: number; text: string }[];
    };
    const fr = new Map(data.quran.map((v) => [`${v.chapter}:${v.verse}`, v.text]));
    expect(fr.size).toBe(6236);

    const missing: string[] = [];
    for (const story of PROPHET_STORIES) {
      const parts: string[] = [];
      for (const p of story.passages) {
        for (let v = p.from; v <= p.to; v++) {
          const text = fr.get(`${p.surah}:${v}`);
          expect(text, `${story.id} ${p.surah}:${v}`).toBeDefined();
          parts.push(text ?? '');
        }
      }
      const text = parts.join('\n');
      for (const word of KEYWORDS[story.id] ?? []) {
        if (!containsWord(text, word)) missing.push(`${story.id} : « ${word} »`);
      }
    }
    expect(missing).toEqual([]);
  });
});
