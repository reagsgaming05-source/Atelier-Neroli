/**
 * Vérifie le contenu religieux de src/data/adhkar.ts et src/data/names.ts.
 *
 * Les contrôles de fidélité au texte s'appuient sur deux fichiers de référence,
 * non inclus dans le dépôt. Pour les lancer :
 *
 *   curl -sLo /tmp/hisn.json \
 *     https://raw.githubusercontent.com/rn0x/hisn_almuslim_json/main/hisn_almuslim.json
 *   curl -sLo /tmp/quran-ar.json \
 *     https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/ara-qurankhaledhosn.json
 *   HISN_JSON=/tmp/hisn.json QURAN_AR_JSON=/tmp/quran-ar.json npx vitest run tests/adhkar.test.ts
 *
 * Sans ces variables d'environnement, seuls les contrôles structurels s'exécutent.
 */
import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { ADHKAR } from '../src/data/adhkar';
import { NAMES } from '../src/data/names';
import type { Dhikr } from '../src/data/types';

const HISN_JSON = process.env.HISN_JSON;
const QURAN_AR_JSON = process.env.QURAN_AR_JSON;

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

const ALL_ITEMS: Dhikr[] = ADHKAR.flatMap((c) => c.items);
const isQuran = (d: Dhikr) => d.source.startsWith('Coran');
const HADITH_ITEMS = ALL_ITEMS.filter((d) => !isQuran(d));
const QURAN_ITEMS = ALL_ITEMS.filter(isQuran);

/**
 * Éléments dont le texte arabe ne se retrouve pas tel quel dans hisn.json.
 * Pour chacun, le test vérifie au moins que chaque mot existe dans la référence,
 * et que l'écart existe toujours (sinon l'entrée doit être retirée de la liste).
 */
const KNOWN_DEVIATIONS: Record<string, string> = {
  // hisn.json : « وأن محمد عبده » et « وبمحمداً رسولاً » (fautes de frappe) ;
  // corrigé en « وَأَنَّ مُحَمَّدًا عَبْدُهُ » et « وَبِمُحَمَّدٍ رَسُولًا » (Muslim 386).
  'quotidien-adhan-shahada': 'fautes de frappe corrigées',
  // hisn.json : « وزرقنيه » (faute de frappe) ; corrigé en « وَرَزَقَنِيهِ ».
  'quotidien-apres-repas': 'faute de frappe corrigée',
  // hisn.json omet « ورب الأرض », présent dans Al-Bukhārī 6346 et Muslim 2730 :
  // « رب السماوات ورب الأرض ورب العرش الكريم ».
  'detresse-karb': 'omission de hisn.json rétablie',
};

/**
 * Pour le soir, hisn.json ne donne en note que les mots qui changent
 * (« وإذا أمسى قال: أمسينا وأمسى الملك لله… »). Les éléments `soir-*` qui ne se
 * retrouvent pas tels quels sont donc ramenés à la formulation du matin mot par mot.
 */
const EVENING_TO_MORNING: Record<string, string> = {
  امسينا: 'اصبحنا',
  امسي: 'اصبح',
  امسيت: 'اصبحت',
  هذه: 'هذا',
  الليله: 'اليوم',
  بعدها: 'بعده',
  فيها: 'فيه',
  فتحها: 'فتحه',
  نصرها: 'نصره',
  نورها: 'نوره',
  بركتها: 'بركته',
  هداها: 'هداه',
};

/** Normalisation pour comparer des textes plus ou moins vocalisés. */
function normalize(s: string): string {
  return s
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '') // tashkīl, signes coraniques, tatweel
    .replace(/[​-‏⁠﻿]/g, '') // caractères invisibles
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىی]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(/ک/g, 'ك')
    .replace(/[^ء-غف-ي]+/g, ' ') // ponctuation, crochets, chiffres, latin
    .replace(/\s+/g, ' ')
    .replace(/(^| )و (?=\S)/g, '$1و') // « و اجعل » → « واجعل » (espace parasite dans hisn.json)
    .trim();
}

function eveningToMorning(normalized: string): string {
  return normalized
    .split(' ')
    .map((w) => {
      if (EVENING_TO_MORNING[w]) return EVENING_TO_MORNING[w];
      if (w.startsWith('و') && EVENING_TO_MORNING[w.slice(1)]) return 'و' + EVENING_TO_MORNING[w.slice(1)];
      return w;
    })
    .join(' ');
}

const toArabicIndic = (n: number) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

describe('structure des adhkar', () => {
  it('a les catégories attendues, dans l’ordre', () => {
    expect(ADHKAR.map((c) => c.id)).toEqual([
      'matin',
      'soir',
      'apres-priere',
      'sommeil',
      'reveil',
      'quotidien',
      'detresse',
      'istikhara',
      'rabbana',
    ]);
    for (const c of ADHKAR) {
      expect(c.title, c.id).toBeTruthy();
      expect(c.titleAr, c.id).toBeTruthy();
      expect(c.items.length, c.id).toBeGreaterThan(0);
    }
  });

  it('a des identifiants uniques en kebab-case', () => {
    const ids = ALL_ITEMS.map((d) => d.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('renseigne ar, fr, source et un nombre de répétitions valide', () => {
    for (const d of ALL_ITEMS) {
      expect(d.ar.trim(), d.id).not.toBe('');
      expect(d.fr.trim(), d.id).not.toBe('');
      expect(d.source.trim(), d.id).not.toBe('');
      expect(Number.isInteger(d.count) && d.count >= 1, d.id).toBe(true);
    }
  });

  it('donne une translittération pour chaque texte issu des hadiths', () => {
    const missing = HADITH_ITEMS.filter((d) => !d.translit?.trim()).map((d) => d.id);
    expect(missing).toEqual([]);
  });

  it('cite les références coraniques au format « Coran S:V » ou « Coran S:V-W »', () => {
    for (const d of QURAN_ITEMS) expect(d.source, d.id).toMatch(/^Coran \d{1,3}:\d{1,3}(-\d{1,3})?$/);
  });
});

describe('99 noms', () => {
  it('compte exactement 99 noms numérotés de 1 à 99', () => {
    expect(NAMES).toHaveLength(99);
    expect(NAMES.map((x) => x.n)).toEqual(Array.from({ length: 99 }, (_, i) => i + 1));
  });

  it('a des noms arabes uniques, translittérés et traduits', () => {
    expect(new Set(NAMES.map((x) => x.ar)).size).toBe(99);
    expect(new Set(NAMES.map((x) => normalize(x.ar))).size).toBe(99);
    for (const x of NAMES) {
      expect(x.translit.trim(), String(x.n)).not.toBe('');
      expect(x.fr.trim(), String(x.n)).not.toBe('');
    }
  });

  it('commence par Ar-Raḥmān et se termine par Aṣ-Ṣabūr', () => {
    expect(normalize(NAMES[0].ar)).toBe('الرحمن');
    expect(normalize(NAMES[98].ar)).toBe('الصبور');
  });
});

describe.skipIf(!HISN_JSON)('fidélité au Ḥiṣn al-Muslim (HISN_JSON)', () => {
  let corpus = '';
  let vocabulary = new Set<string>();

  beforeAll(async () => {
    const hisn = await readJson<Record<string, { text: string[]; footnote: string[] }>>(HISN_JSON as string);
    const chunks = Object.values(hisn).flatMap((ch) => [...ch.text, ...ch.footnote].map(normalize));
    corpus = ` ${chunks.join(' ')} `;
    vocabulary = new Set(corpus.split(' ').filter(Boolean));
  });

  const matches = (text: string) => corpus.includes(` ${text} `);

  it('retrouve chaque texte issu des hadiths dans hisn.json', () => {
    const failures: string[] = [];
    for (const d of HADITH_ITEMS) {
      if (d.id in KNOWN_DEVIATIONS) continue;
      const n = normalize(d.ar);
      const ok = matches(n) || (d.id.startsWith('soir-') && matches(eveningToMorning(n)));
      if (!ok) failures.push(`${d.id}: ${n}`);
    }
    expect(failures).toEqual([]);
  });

  it('limite les écarts connus à des mots présents dans hisn.json, et les garde à jour', () => {
    for (const id of Object.keys(KNOWN_DEVIATIONS)) {
      const d = HADITH_ITEMS.find((x) => x.id === id);
      expect(d, `${id} introuvable`).toBeDefined();
      if (!d) continue;
      const n = normalize(d.ar);
      expect(matches(n), `${id} correspond désormais : retirer de KNOWN_DEVIATIONS`).toBe(false);
      const unknown = n.split(' ').filter((w) => !vocabulary.has(w));
      expect(unknown, id).toEqual([]);
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
    expect(QURAN_ITEMS.length).toBeGreaterThan(0);
    for (const d of QURAN_ITEMS) {
      const m = /^Coran (\d+):(\d+)(?:-(\d+))?$/.exec(d.source);
      expect(m, d.id).not.toBeNull();
      if (!m) continue;
      const s = Number(m[1]);
      const from = Number(m[2]);
      const to = m[3] ? Number(m[3]) : from;
      for (let v = from; v <= to; v++) {
        const text = verse(s, v);
        expect(d.ar.includes(text), `${d.id} : verset ${s}:${v} absent ou modifié`).toBe(true);
        if (to > from) expect(d.ar.includes(`${text} ﴿${toArabicIndic(v)}﴾`), `${d.id} : numéro ${v}`).toBe(true);
      }
    }
  });

  it('fait précéder les sourates complètes de la basmala', () => {
    for (const d of QURAN_ITEMS.filter((x) => /^Coran (112|113|114):1-/.test(x.source))) {
      expect(d.ar.startsWith(`${basmala} `), d.id).toBe(true);
    }
  });
});
