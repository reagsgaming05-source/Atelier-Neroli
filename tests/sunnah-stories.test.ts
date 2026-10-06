/**
 * Vérifie le contenu de src/data/sunnah-stories.ts (récits de la Sunna).
 *
 * Les contrôles de fidélité au texte s'appuient sur la traduction française du
 * projet hadith-api, non incluse dans le dépôt. Pour les lancer :
 *
 *   curl -sLo /tmp/fra-bukhari.json \
 *     https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/fra-bukhari.json
 *   curl -sLo /tmp/fra-muslim.json \
 *     https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/fra-muslim.json
 *   HADITH_BUKHARI_FR=/tmp/fra-bukhari.json HADITH_MUSLIM_FR=/tmp/fra-muslim.json \
 *     npx vitest run tests/sunnah-stories.test.ts
 *
 * Sans ces variables d'environnement, seuls les contrôles structurels s'exécutent.
 *
 * Numérotation : Al-Bukhārī par `hadithnumber` (numérotation usuelle) ;
 * Muslim par `arabicnumber` (Fu'ad 'Abd al-Bāqī + indice de narration, « 2550.02 »),
 * le champ `hadithnumber` de fra-muslim.json n'étant pas la numérotation usuelle.
 */
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { SUNNAH_STORIES } from '../src/data/sunnah-stories';
import type { SunnahStory } from '../src/data/types';

const HADITH_BUKHARI_FR = process.env.HADITH_BUKHARI_FR;
const HADITH_MUSLIM_FR = process.env.HADITH_MUSLIM_FR;

interface HadithEdition {
  hadiths: { hadithnumber: number; arabicnumber?: string | number | null; text: string }[];
}

async function readEdition(path: string): Promise<HadithEdition> {
  return JSON.parse(await readFile(path, 'utf8')) as HadithEdition;
}

/** Référence attendue dans le quiz : « Al-Bukhārī 3465 » ou « Muslim 2550 ». */
function citation(s: SunnahStory): string {
  return s.hadith.collection === 'bukhari'
    ? `Al-Bukhārī ${s.hadith.number}`
    : `Muslim ${s.hadith.number.split('.')[0]}`;
}

const nonEmpty = (s: string) => s.trim().length > 0 && s === s.trim();

describe('structure des récits de la Sunna', () => {
  it('compte entre 12 et 16 récits', () => {
    expect(SUNNAH_STORIES.length).toBeGreaterThanOrEqual(12);
    expect(SUNNAH_STORIES.length).toBeLessThanOrEqual(16);
  });

  it('a des identifiants uniques en kebab-case', () => {
    const ids = SUNNAH_STORIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('a des titres uniques', () => {
    const titles = SUNNAH_STORIES.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('renseigne titre, introduction et 3 à 4 leçons non vides', () => {
    for (const s of SUNNAH_STORIES) {
      expect(nonEmpty(s.title), s.id).toBe(true);
      expect(nonEmpty(s.intro), s.id).toBe(true);
      expect(s.lessons.length, s.id).toBeGreaterThanOrEqual(3);
      expect(s.lessons.length, s.id).toBeLessThanOrEqual(4);
      for (const l of s.lessons) expect(nonEmpty(l), s.id).toBe(true);
      expect(new Set(s.lessons).size, s.id).toBe(s.lessons.length);
    }
  });

  it('cite Al-Bukhārī ou Muslim avec un numéro valide, sans doublon', () => {
    for (const { id, hadith } of SUNNAH_STORIES) {
      expect(['bukhari', 'muslim'], id).toContain(hadith.collection);
      if (hadith.collection === 'bukhari') expect(hadith.number, id).toMatch(/^\d+$/);
      else expect(hadith.number, id).toMatch(/^\d+(\.\d+)?$/);
    }
    const keys = SUNNAH_STORIES.map((s) => `${s.hadith.collection}:${s.hadith.number}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('donne un texte de hadith non vide, d’au moins 200 caractères', () => {
    for (const s of SUNNAH_STORIES) {
      expect(nonEmpty(s.hadith.fr), s.id).toBe(true);
      expect(s.hadith.fr.length, s.id).toBeGreaterThanOrEqual(200);
    }
  });

  it('propose 2 à 3 questions de quiz bien formées', () => {
    for (const s of SUNNAH_STORIES) {
      expect(s.quiz.length, s.id).toBeGreaterThanOrEqual(2);
      expect(s.quiz.length, s.id).toBeLessThanOrEqual(3);
      for (const q of s.quiz) {
        const where = `${s.id} — ${q.q}`;
        expect(nonEmpty(q.q), where).toBe(true);
        expect(q.options.length, where).toBeGreaterThanOrEqual(3);
        expect(q.options.length, where).toBeLessThanOrEqual(4);
        for (const o of q.options) expect(nonEmpty(o), where).toBe(true);
        expect(new Set(q.options).size, where).toBe(q.options.length);
        expect(Number.isInteger(q.answer), where).toBe(true);
        expect(q.answer, where).toBeGreaterThanOrEqual(0);
        expect(q.answer, where).toBeLessThan(q.options.length);
        expect(q.ref, where).toBe(citation(s));
      }
      const questions = s.quiz.map((q) => q.q);
      expect(new Set(questions).size, s.id).toBe(questions.length);
    }
  });
});

describe('texte du hadith verbatim (HADITH_BUKHARI_FR, HADITH_MUSLIM_FR)', () => {
  it.skipIf(!HADITH_BUKHARI_FR || !HADITH_MUSLIM_FR)(
    'reprend exactement le texte de hadith-api pour chaque numéro cité',
    async () => {
      const [bukhari, muslim] = await Promise.all([
        readEdition(HADITH_BUKHARI_FR!),
        readEdition(HADITH_MUSLIM_FR!),
      ]);
      const byNumber = {
        bukhari: new Map(
          bukhari.hadiths.map((h): [string, string] => [String(h.hadithnumber), h.text]),
        ),
        muslim: new Map(
          muslim.hadiths
            .filter((h) => h.arabicnumber != null && h.arabicnumber !== '')
            .map((h): [string, string] => [String(h.arabicnumber), h.text]),
        ),
      };
      for (const s of SUNNAH_STORIES) {
        const where = `${s.id} (${s.hadith.collection} ${s.hadith.number})`;
        const expected = byNumber[s.hadith.collection].get(s.hadith.number);
        expect(expected, `${where} : numéro introuvable`).toBeDefined();
        expect(s.hadith.fr, where).toBe(expected);
        expect(s.hadith.fr.length, where).toBeGreaterThanOrEqual(200);
      }
    },
  );
});
