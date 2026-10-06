/**
 * Vérifie le contenu religieux de src/data/learn.ts (guides de la rubrique « Apprendre »).
 *
 * Les contrôles structurels s'exécutent toujours. Les contrôles de fidélité au texte
 * s'appuient sur deux fichiers de référence, non inclus dans le dépôt :
 *
 *   curl -sLo <dossier>/hisn.json \
 *     https://raw.githubusercontent.com/rn0x/hisn_almuslim_json/main/hisn_almuslim.json
 *   curl -sLo <dossier>/ara-qurankhaledhosn.json \
 *     https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/ara-qurankhaledhosn.json
 *   HISN_JSON=<dossier>/hisn.json QURAN_AR_JSON=<dossier>/ara-qurankhaledhosn.json \
 *     npx vitest run tests/learn.test.ts
 *
 * - Formule issue des hadiths (source ne commençant pas par « Coran ») : après
 *   normalisation, elle doit se retrouver telle quelle dans un texte ou une note de
 *   hisn.json, sauf écart connu et justifié (KNOWN_DEVIATIONS).
 * - Texte coranique (source « Coran S:V » ou « Coran S:V-W ») : chaque verset doit
 *   figurer mot pour mot, tel que dans le fichier du Coran.
 */
import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { GUIDES } from '../src/data/learn';
import type { LearnStep } from '../src/data/types';

const HISN_JSON = process.env.HISN_JSON;
const QURAN_AR_JSON = process.env.QURAN_AR_JSON;

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

interface Entry {
  /** « id-du-guide / titre de l'étape », identifiant utilisé dans KNOWN_DEVIATIONS. */
  key: string;
  guide: string;
  step: LearnStep;
}

const ENTRIES: Entry[] = GUIDES.flatMap((g) =>
  g.sections.flatMap((s) => s.steps.map((step) => ({ key: `${g.id} / ${step.title}`, guide: g.id, step }))),
);
const WITH_AR = ENTRIES.filter((e) => e.step.ar !== undefined);
const isQuran = (e: Entry) => (e.step.source ?? '').startsWith('Coran');
const HADITH_ENTRIES = WITH_AR.filter((e) => !isQuran(e));
const QURAN_ENTRIES = WITH_AR.filter(isQuran);

/**
 * Formules dont le texte arabe ne se retrouve pas tel quel dans hisn.json, avec la raison.
 * Le test vérifie que chaque mot existe dans la référence et que l'écart existe toujours
 * (sinon l'entrée doit être retirée de la liste).
 */
const KNOWN_DEVIATIONS: Record<string, string> = {
  // hisn.json ne donne l'attestation qu'avec « عبده ورسوله » (tashahhud, ablutions).
  'piliers / L’attestation de foi (shahāda)':
    'formule « وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ » des hadiths des cinq piliers (Al-Bukhārī 8, Muslim 16)',
  // hisn.json : « وبحمد ك » et « ولا أ له غيرك » (fautes de frappe).
  'priere / L’invocation d’ouverture':
    'fautes de frappe de hisn.json corrigées : « وَبِحَمْدِكَ », « وَلَا إِلَهَ غَيْرُكَ » (Abū Dāwūd 775, At-Tirmidhī 242)',
  // hisn.json cite la tombe avant l'Enfer ; Muslim 588 (première version) cite l'Enfer d'abord.
  'priere / Demander protection avant le salut': 'ordre des mots de Muslim 588 rétabli (Enfer, puis tombe)',
  // hisn.json ne contient pas la formule du salut final.
  'priere / Le salut final (taslīm)': 'formule absente de hisn.json ; texte de Muslim 431',
};

/** Normalisation pour comparer des textes plus ou moins vocalisés. */
function normalize(s: string): string {
  return s
    .replace(/[ً-ْٰـ]/g, '') // tashkīl, alif suscrit, tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(/[^ء-غف-ي]+/g, ' ') // ponctuation, crochets, chiffres, caractères invisibles
    .replace(/\s+/g, ' ')
    .trim();
}

const toArabicIndic = (n: number) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
const QURAN_SOURCE = /^Coran (\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?$/;

describe('structure des guides', () => {
  it('a les guides attendus, dans l’ordre', () => {
    expect(GUIDES.map((g) => g.id)).toEqual([
      'piliers',
      'ablutions',
      'ghusl',
      'tayammum',
      'priere',
      'prieres-surerogatoires',
      'jumua',
    ]);
  });

  it('a des identifiants uniques en kebab-case', () => {
    const ids = GUIDES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('a des sections et des étapes non vides, aux titres uniques dans chaque guide', () => {
    for (const g of GUIDES) {
      expect(g.title.trim(), g.id).not.toBe('');
      expect(g.subtitle.trim(), g.id).not.toBe('');
      if (g.intro !== undefined) expect(g.intro.trim(), g.id).not.toBe('');
      expect(g.sections.length, g.id).toBeGreaterThan(0);
      const sectionTitles = g.sections.map((s) => s.title);
      expect(new Set(sectionTitles).size, g.id).toBe(sectionTitles.length);
      for (const s of g.sections) {
        expect(s.title.trim(), g.id).not.toBe('');
        expect(s.steps.length, `${g.id} / ${s.title}`).toBeGreaterThan(0);
      }
      const stepTitles = g.sections.flatMap((s) => s.steps.map((st) => st.title));
      const dupes = stepTitles.filter((t, i) => stepTitles.indexOf(t) !== i);
      expect(dupes, g.id).toEqual([]);
    }
  });

  it('renseigne titre et texte de chaque étape', () => {
    for (const { key, step } of ENTRIES) {
      expect(step.title.trim(), key).not.toBe('');
      expect(step.text.trim(), key).not.toBe('');
      for (const field of ['ar', 'translit', 'fr', 'source'] as const) {
        if (step[field] !== undefined) expect(step[field]?.trim(), `${key} : ${field}`).not.toBe('');
      }
    }
  });

  it('accompagne chaque texte arabe d’une traduction et d’une source', () => {
    expect(WITH_AR.length).toBeGreaterThan(0);
    for (const { key, step } of WITH_AR) {
      expect(step.fr?.trim(), key).toBeTruthy();
      expect(step.source?.trim(), key).toBeTruthy();
    }
  });

  it('donne un texte arabe vocalisé et translittéré pour chaque formule issue des hadiths', () => {
    for (const { key, step } of HADITH_ENTRIES) {
      expect(step.translit?.trim(), key).toBeTruthy();
      expect(step.ar, key).toMatch(/[ً-ْ]/);
      expect(step.ar, key).not.toMatch(/[A-Za-z0-9]/);
    }
  });

  it('cite les textes coraniques au format « Coran S:V » ou « Coran S:V-W »', () => {
    for (const { key, step } of QURAN_ENTRIES) expect(step.source, key).toMatch(QURAN_SOURCE);
  });

  it('a des remarques non vides et uniques', () => {
    for (const g of GUIDES) {
      const notes = g.notes ?? [];
      for (const n of notes) expect(n.trim(), g.id).not.toBe('');
      expect(new Set(notes).size, g.id).toBe(notes.length);
    }
  });

  it('ne déclare des écarts connus que pour des formules issues des hadiths', () => {
    const keys = new Set(HADITH_ENTRIES.map((e) => e.key));
    for (const [key, reason] of Object.entries(KNOWN_DEVIATIONS)) {
      expect(keys.has(key), `${key} introuvable`).toBe(true);
      expect(reason.trim(), key).not.toBe('');
    }
  });
});

describe.skipIf(!HISN_JSON)('fidélité au Ḥiṣn al-Muslim (HISN_JSON)', () => {
  let chunks: string[] = [];
  let vocabulary = new Set<string>();

  beforeAll(async () => {
    const hisn = await readJson<Record<string, { text: string[]; footnote: string[] }>>(HISN_JSON as string);
    chunks = Object.values(hisn).flatMap((ch) => [...ch.text, ...ch.footnote].map(normalize));
    vocabulary = new Set(chunks.flatMap((c) => c.split(' ')).filter(Boolean));
  });

  /** Le texte figure-t-il, mot pour mot, dans un même texte ou une même note ? */
  const matches = (text: string) => chunks.some((c) => ` ${c} `.includes(` ${text} `));

  it('retrouve chaque formule issue des hadiths dans hisn.json', () => {
    const failures: string[] = [];
    for (const { key, step } of HADITH_ENTRIES) {
      if (key in KNOWN_DEVIATIONS) continue;
      const n = normalize(step.ar as string);
      if (!matches(n)) failures.push(`${key} : ${n}`);
    }
    expect(failures).toEqual([]);
  });

  it('limite les écarts connus à des mots présents dans hisn.json, et les garde à jour', () => {
    for (const key of Object.keys(KNOWN_DEVIATIONS)) {
      const entry = HADITH_ENTRIES.find((e) => e.key === key);
      expect(entry, `${key} introuvable`).toBeDefined();
      if (!entry) continue;
      const n = normalize(entry.step.ar as string);
      expect(matches(n), `${key} correspond désormais : retirer de KNOWN_DEVIATIONS`).toBe(false);
      const unknown = n.split(' ').filter((w) => !vocabulary.has(w));
      expect(unknown, key).toEqual([]);
    }
  });
});

describe.skipIf(!QURAN_AR_JSON)('texte coranique verbatim (QURAN_AR_JSON)', () => {
  let verses = new Map<string, string>();
  let basmala = '';

  beforeAll(async () => {
    const { quran } = await readJson<{ quran: { chapter: number; verse: number; text: string }[] }>(
      QURAN_AR_JSON as string,
    );
    basmala = quran.find((v) => v.chapter === 1 && v.verse === 1)?.text ?? '';
    verses = new Map(quran.map((v) => [`${v.chapter}:${v.verse}`, v.text]));
  });

  /** Texte du verset, sans la basmala préfixée au verset 1 (sauf sourates 1 et 9). */
  function verse(s: number, v: number): string {
    const text = verses.get(`${s}:${v}`);
    if (text === undefined) throw new Error(`verset ${s}:${v} introuvable`);
    if (v === 1 && s !== 1 && s !== 9) {
      expect(text.startsWith(`${basmala} `), `basmala attendue en tête de ${s}:1`).toBe(true);
      return text.slice(basmala.length + 1);
    }
    return text;
  }

  it('contient chaque verset cité, tel quel, numéroté s’il y en a plusieurs', () => {
    expect(QURAN_ENTRIES.length).toBeGreaterThan(0);
    for (const { key, step } of QURAN_ENTRIES) {
      const m = QURAN_SOURCE.exec(step.source as string);
      expect(m, key).not.toBeNull();
      if (!m) continue;
      const s = Number(m[1]);
      const from = Number(m[2]);
      const to = m[3] ? Number(m[3]) : from;
      const ar = step.ar as string;
      for (let v = from; v <= to; v++) {
        const text = verse(s, v);
        expect(ar.includes(text), `${key} : verset ${s}:${v} absent ou modifié`).toBe(true);
        if (to > from) expect(ar.includes(`${text} ﴿${toArabicIndic(v)}﴾`), `${key} : numéro ${v}`).toBe(true);
      }
    }
  });

  it('fait commencer la Fātiḥa et les sourates complètes par la basmala', () => {
    for (const { key, step } of QURAN_ENTRIES.filter((e) => /^Coran \d+:1-/.test(e.step.source ?? ''))) {
      expect((step.ar as string).startsWith(`${basmala} `), key).toBe(true);
    }
  });
});
