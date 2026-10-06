#!/usr/bin/env node
// Lists every text read aloud in the story series, episode by episode, for
// scripts/narration/build.py:
//   .data-cache/narration/segments.json
//
// Each segment keeps the text shown on screen (its hash is how the player finds
// the recording) and a "speak" version for the voice: brackets removed and
// Arabic names spelled so that a French voice pronounces them well.
//
// Usage: node scripts/narration/export.mjs [--translations fr-hamidullah,fr-maash]

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, '.data-cache', 'narration', 'segments.json');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
// Verse translations to record; the player's default comes first.
const translations = arg('translations', 'fr-hamidullah').split(',');

// How a French voice should say these names (checked against espeak-ng's French
// phonemes, which both Piper and Kokoro use). Only the spoken text changes.
const LEXICON = {
  Abbas: 'Abbasse',
  Adam: 'Adame',
  'Al-Ayka': 'Al-Aïka',
  Ayyoub: 'Aïyoub',
  Bilqis: 'Bilqisse',
  Daoud: 'Daoude',
  Djalout: 'Djaloute',
  hadith: 'hadite',
  hadiths: 'hadites',
  Houd: 'Houde',
  Hourayra: 'Houraïra',
  Iblis: 'Iblisse',
  Imrane: 'Imerane',
  Jourayj: 'Djouraïdj',
  Lout: 'Loute',
  Madyan: 'Madiane',
  Madyane: 'Madiane',
  Majouj: 'Madjoudj',
  'Mas’oud': 'Massoude',
  Muhammad: 'Mouhammad',
  'Nou’mane': 'Nouemane',
  Oubayy: 'Oubaï',
  Qarnayn: 'Qarnaïne',
  Sunna: 'Sounna',
  Talout: 'Taloute',
  Thamoud: 'Tamoude',
  Yajouj: 'Yadjoudj',
  Younous: 'Younousse',
  zakat: 'zakate',
  'ﷺ': ', salla Allahou alayhi wa sallam,',
};
const lexicon = Object.entries(LEXICON).map(([word, say]) => [
  new RegExp(`(?<![\\p{L}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'gu'),
  say,
]);

export function speakable(text) {
  let s = text
    .replace(/[[\]]/g, '') // translator's additions: "[Seul]" is read "Seul"
    .replace(/\s*\(([^)]*)\)\s*/g, ', $1, ') // asides become a short pause
    .replace(/[`´]/g, '’');
  for (const [re, say] of lexicon) s = s.replace(re, say);
  return s
    .replace(/,\s*([,.;:!?…])/g, '$1')
    .replace(/\s+([,.;:!?…])/g, (m, p) => (/[;:!?]/.test(p) ? ` ${p}` : p))
    .replace(/^\s*,\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function main() {
  const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const { SERIES } = await server.ssrLoadModule('/src/data/series/index.ts');
    const { textHash, episodeKey } = await server.ssrLoadModule('/src/lib/narration.ts');
    const surahs = new Map();
    const verseText = async (edition, surah, verse) => {
      const key = `${edition}/${surah}`;
      if (!surahs.has(key)) surahs.set(key, JSON.parse(await readFile(join(root, 'public/data/quran', edition, `${surah}.json`), 'utf8')));
      return surahs.get(key)[verse - 1];
    };

    const episodes = [];
    for (const series of SERIES) {
      for (const [n, ep] of series.episodes.entries()) {
        const segments = [];
        const seen = new Set();
        const add = (text) => {
          const hash = textHash(text);
          if (seen.has(hash)) return;
          seen.add(hash);
          segments.push({ hash, text, speak: speakable(text) });
        };
        for (const scene of ep.scenes) {
          add(scene.text);
          if (scene.verse) for (const t of translations) add(await verseText(t, scene.verse.surah, scene.verse.verse));
        }
        episodes.push({ key: episodeKey(series.storyId, n), title: ep.title, segments });
      }
    }

    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, JSON.stringify({ translations, episodes }, null, 1));
    const count = episodes.reduce((n, e) => n + e.segments.length, 0);
    const chars = episodes.reduce((n, e) => n + e.segments.reduce((m, s) => m + s.speak.length, 0), 0);
    console.log(`${episodes.length} episodes, ${count} texts, ${chars} characters → ${out}`);
  } finally {
    await server.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
