#!/usr/bin/env node
// Generates the static data shipped with the app:
//   public/data/quran/<edition>/<surah>.json   one JSON array of verse strings per surah
//   public/data/cities.json                    compact world city list for offline search
//   src/data/quran-meta.json                   surah lengths, juz starts, sajdas, pages
//
// Sources (fetched once, cached in .data-cache/):
//   - Quran text and translations: github.com/fawazahmed0/quran-api (Unlicense),
//     which redistributes Tanzil.net, quranenc.com and Khaled Hosny's quran-data.
//   - Cities: npm package city-timezones (MIT, data from simplemaps.com, CC BY 4.0).
//
// Usage: npm run data

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(root, '.data-cache');
const API = 'https://raw.githubusercontent.com/fawazahmed0/quran-api/1';

// Verses shown as "verset du jour", rotating by day of the year.
const DAILY = [
  [2, 152], [2, 153], [2, 186], [2, 201], [2, 216], [2, 286], [3, 8], [3, 26], [3, 31], [3, 92],
  [3, 139], [3, 173], [3, 185], [7, 56], [9, 51], [10, 62], [12, 87], [13, 11], [13, 28], [14, 7],
  [16, 18], [16, 97], [16, 128], [17, 9], [18, 46], [20, 46], [20, 114], [21, 87], [24, 35], [25, 63],
  [28, 24], [29, 45], [29, 69], [31, 17], [33, 41], [33, 56], [35, 15], [39, 10], [39, 53], [40, 60],
  [47, 7], [49, 13], [50, 16], [51, 56], [55, 13], [59, 18], [64, 11], [65, 3], [67, 2], [94, 5],
];

// Our id -> fawazahmed0 edition name.
const EDITIONS = {
  ar: 'ara-qurankhaledhosn', // Uthmani script encoded for the Amiri Quran font
  'fr-hamidullah': 'fra-muhammadhamidul', // Muhammad Hamidullah (Tanzil)
  'fr-maash': 'fra-rashidmaash', // Rashid Maash (quranenc.com)
  translit: 'ara-quran-la', // Tanzil transliteration
};

async function cached(name, url) {
  const file = join(cacheDir, name);
  if (existsSync(file)) return JSON.parse(await readFile(file, 'utf8'));
  console.log(`↓ ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const text = await res.text();
  await mkdir(cacheDir, { recursive: true });
  await writeFile(file, text);
  return JSON.parse(text);
}

async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data));
}

function groupBySurah(edition) {
  const surahs = Array.from({ length: 114 }, () => []);
  for (const { chapter, verse, text } of edition.quran) {
    surahs[chapter - 1][verse - 1] = text.trim();
  }
  return surahs;
}

async function buildQuran() {
  const info = await cached('info.json', `${API}/info.json`);
  const texts = {};
  const verseCounts = info.chapters.map((c) => c.verses.length);

  for (const [id, name] of Object.entries(EDITIONS)) {
    const edition = await cached(`${name}.json`, `${API}/editions/${name}.json`);
    const surahs = groupBySurah(edition);

    surahs.forEach((verses, i) => {
      if (verses.length !== verseCounts[i] || verses.some((v) => !v)) {
        throw new Error(`${name}: surah ${i + 1} has ${verses.length} verses, expected ${verseCounts[i]}`);
      }
    });

    if (id === 'ar') {
      // This edition prefixes verse 1 with the basmala (except al-Fatiha, where it
      // *is* verse 1, and at-Tawba, which has none). The app shows the basmala as
      // a header instead, so strip it and fail loudly if the text is not as expected.
      // Surahs 95 and 97 carry an extra shadda on the first letter (ب + U+0651).
      const basmala = surahs[0][0];
      const variants = [basmala, basmala[0] + '\u0651' + basmala.slice(1)];
      surahs.forEach((verses, i) => {
        const n = i + 1;
        if (n === 1) return;
        const prefix = variants.find((b) => verses[0].startsWith(b + ' '));
        if (n === 9) {
          if (prefix) throw new Error('at-Tawba should not start with the basmala');
          return;
        }
        if (!prefix) throw new Error(`surah ${n} verse 1 does not start with the basmala`);
        verses[0] = verses[0].slice(prefix.length + 1).trim();
      });
    }

    await Promise.all(surahs.map((verses, i) => writeJson(join(root, 'public/data/quran', id, `${i + 1}.json`), verses)));
    texts[id] = surahs;
    console.log(`✓ ${id} (${name})`);
  }

  // Metadata used by the reader: verse counts, revelation place, first page,
  // juz boundaries and verses of prostration.
  const juz = [];
  const sajdas = [];
  const surahs = info.chapters.map((c) => {
    for (const v of c.verses) {
      if (v.juz !== juz.length) juz.push([c.chapter, v.verse]);
      if (v.sajda) sajdas.push([c.chapter, v.verse]);
    }
    return {
      n: c.chapter,
      ar: c.arabicname.replace(/^سُوْرَةُ\s+/, ''),
      verses: c.verses.length,
      revelation: c.revelation === 'Mecca' ? 'M' : 'D',
      page: c.verses[0].page,
    };
  });
  if (juz.length !== 30) throw new Error(`expected 30 juz, got ${juz.length}`);

  const daily = DAILY.map(([s, v]) => ({
    surah: s,
    verse: v,
    ar: texts.ar[s - 1][v - 1],
    fr: texts['fr-hamidullah'][s - 1][v - 1],
  }));
  await writeFile(join(root, 'src/data/daily.json'), JSON.stringify(daily, null, 1));
  await writeFile(join(root, 'src/data/quran-meta.json'), JSON.stringify({ surahs, juz, sajdas }, null, 1));
  console.log(`✓ quran-meta (${sajdas.length} sajdas)`);
}

async function buildCities() {
  const require = createRequire(import.meta.url);
  const cities = require('city-timezones/data/cityMap.json');
  const seen = new Set();
  const rows = [];
  for (const c of cities) {
    if (!c.timezone || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
    const key = `${c.city}|${c.iso2}|${c.lat.toFixed(1)}|${c.lng.toFixed(1)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // [name, country code, country, region, lat, lng, timezone, population]
    rows.push([
      c.city,
      c.iso2,
      c.country,
      c.province ?? '',
      Math.round(c.lat * 1e4) / 1e4,
      Math.round(c.lng * 1e4) / 1e4,
      c.timezone,
      Math.round(c.pop ?? 0),
    ]);
  }
  rows.sort((a, b) => b[7] - a[7]);
  await writeJson(join(root, 'public/data/cities.json'), rows);
  console.log(`✓ cities (${rows.length})`);
}

await buildQuran();
await buildCities();
