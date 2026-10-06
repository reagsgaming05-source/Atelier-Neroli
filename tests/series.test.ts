/**
 * Checks the illustrated, narrated series in src/data/series/part-*.ts:
 * one episode per Quran passage of the story (one episode for a hadith story),
 * short narration suited to text-to-speech, known motifs, and verses that
 * belong to the episode's passage.
 */
import { describe, expect, it } from 'vitest';
import { PROPHET_STORIES } from '../src/data/prophets';
import { SUNNAH_STORIES } from '../src/data/sunnah-stories';
import { MOTIFS, type Series } from '../src/data/types';

const modules = import.meta.glob<Record<string, Series[]>>('../src/data/series/part-*.ts', { eager: true });
const all: Series[] = Object.values(modules).flatMap((m) => Object.values(m).flat());
const motifSet = new Set<string>(MOTIFS);

describe('series', () => {
  it('has at most one series per story', () => {
    const ids = all.map((s) => s.storyId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const series of all) {
    const prophet = PROPHET_STORIES.find((s) => s.id === series.storyId);
    const sunnah = SUNNAH_STORIES.find((s) => s.id === series.storyId);

    describe(series.storyId, () => {
      it('belongs to a known story', () => {
        expect(prophet || sunnah).toBeTruthy();
      });

      it('has one episode per passage (or one for a hadith story)', () => {
        expect(series.episodes.length).toBe(prophet ? prophet.passages.length : 1);
      });

      series.episodes.forEach((ep, i) => {
        it(`episode ${i + 1} is well formed`, () => {
          expect(ep.title.trim().length).toBeGreaterThan(2);
          expect(ep.scenes.length).toBeGreaterThanOrEqual(4);
          expect(ep.scenes.length).toBeLessThanOrEqual(12);
          for (const scene of ep.scenes) {
            expect(scene.text.length, scene.text).toBeGreaterThanOrEqual(15);
            expect(scene.text.length, scene.text).toBeLessThanOrEqual(280);
            // Read aloud: no references, brackets or verse numbers.
            expect(scene.text, scene.text).not.toMatch(/[()[\]{}]|\d+:\d+|ﷺ/);
            for (const m of scene.motifs ?? []) expect(motifSet.has(m), `${m} in ${series.storyId}`).toBe(true);
            expect(new Set(scene.motifs ?? []).size).toBe((scene.motifs ?? []).length);
          }
          if (prophet) {
            const p = prophet.passages[i];
            const verses = ep.scenes.filter((s) => s.verse);
            expect(verses.length, `episode ${i + 1} needs at least one verse`).toBeGreaterThanOrEqual(1);
            for (const s of verses) {
              expect(s.verse!.surah).toBe(p.surah);
              expect(s.verse!.verse).toBeGreaterThanOrEqual(p.from);
              expect(s.verse!.verse).toBeLessThanOrEqual(p.to);
            }
          } else {
            expect(ep.scenes.every((s) => !s.verse)).toBe(true);
          }
        });
      });
    });
  }
});
