#!/usr/bin/env node
// Generates the static data shipped with the app:
//   public/data/quran/<edition>/<surah>.json   one JSON array of verse strings per surah
//   public/data/hadith/<collection>.json       40 hadiths of an-Nawawi, 40 hadiths qudsi
//   public/data/cities.json                    compact world city list for offline search
//   src/data/quran-meta.json                   surah lengths, juz starts, sajdas, pages
//
// Sources (fetched once, cached in .data-cache/):
//   - Quran text and translations: github.com/fawazahmed0/quran-api (Unlicense),
//     which redistributes Tanzil.net, quranenc.com and Khaled Hosny's quran-data.
//   - Hadith: github.com/fawazahmed0/hadith-api (Unlicense).
//   - Cities: npm package city-timezones (MIT, data from simplemaps.com, CC BY 4.0);
//     every Swiss locality from npm package swiss-zipcodes (MIT, GeoNames postal
//     codes, CC BY 4.0).
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
const HADITH_API = 'https://raw.githubusercontent.com/fawazahmed0/hadith-api/1';

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
  const pages = [];
  const surahs = info.chapters.map((c) => {
    for (const v of c.verses) {
      if (v.juz !== juz.length) juz.push([c.chapter, v.verse]);
      if (v.page !== pages.length) pages.push([c.chapter, v.verse]);
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
  if (pages.length !== 604) throw new Error(`expected 604 pages, got ${pages.length}`);

  const daily = DAILY.map(([s, v]) => ({
    surah: s,
    verse: v,
    ar: texts.ar[s - 1][v - 1],
    fr: texts['fr-hamidullah'][s - 1][v - 1],
  }));
  await writeFile(join(root, 'src/data/daily.json'), JSON.stringify(daily, null, 1));
  await writeFile(join(root, 'src/data/quran-meta.json'), JSON.stringify({ surahs, juz, sajdas, pages }));
  console.log(`✓ quran-meta (${sajdas.length} sajdas)`);
}

const round4 = (x) => Math.round(x * 1e4) / 1e4;

function km(lat1, lng1, lat2, lng2) {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

const CANTONS = {
  AG: 'Argovie', AI: 'Appenzell Rhodes-Intérieures', AR: 'Appenzell Rhodes-Extérieures', BE: 'Berne',
  BL: 'Bâle-Campagne', BS: 'Bâle-Ville', FR: 'Fribourg', GE: 'Genève', GL: 'Glaris', GR: 'Grisons', JU: 'Jura',
  LU: 'Lucerne', NE: 'Neuchâtel', NW: 'Nidwald', OW: 'Obwald', SG: 'Saint-Gall', SH: 'Schaffhouse', SO: 'Soleure',
  SZ: 'Schwytz', TG: 'Thurgovie', TI: 'Tessin', UR: 'Uri', VD: 'Vaud', VS: 'Valais', ZG: 'Zoug', ZH: 'Zurich',
};

// Postcodes reserved for companies and PO boxes ("Bern Swisscom", "Lausanne
// Veillon"): their postcode is kept, under the locality's own name.
const BUSINESS_SUFFIX =
  /\s+(Voice Pub|PostFinance|Verarb\.zentr\.|Swisscom|Weihnachten|D4|K|Vögele|Ifolor|Adm cant|Veillon|Redoute|Mutuel|Versich\.|R Digest|IBRS local|Caselle)$/;

/** Folds accents and punctuation for name comparisons. */
const foldName = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim();

/** English names in the world list → Swiss local names. */
const SWISS_EXONYMS = { geneva: 'geneve', lucerne: 'luzern', biel: 'biel bienne', berne: 'bern', 'saint gallen': 'st gallen' };

/**
 * Every Swiss locality with a postcode. Post-office variants ("Lausanne 26",
 * "Basel PF OC") are merged into their locality, which keeps all its postcodes.
 */
function swissLocalities() {
  const require = createRequire(import.meta.url);
  const entries = require('swiss-zipcodes/src/data_geonames.json');
  const groups = [];
  for (const e of entries) {
    const name = e.place
      .replace(/\s+\d+(\s.*)?$/, '')
      .replace(BUSINESS_SUFFIX, '')
      .replace(/(\s+[A-Z]{2,})+$/, '')
      .trim();
    const lat = Number(e.latitude);
    const lng = Number(e.longitude);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng) || !CANTONS[e.state_code]) continue;
    // Same name in the same canton within 20 km is the same locality.
    let g = groups.find((x) => x.name === name && x.canton === e.state_code && km(x.points[0][0], x.points[0][1], lat, lng) < 20);
    if (!g) {
      g = { name, canton: e.state_code, points: [], zips: new Set() };
      groups.push(g);
    }
    g.points.push([lat, lng, e.place === name]);
    g.zips.add(e.zipcode);
  }
  // Place each locality at its most common coordinate, preferring entries named exactly like it.
  for (const g of groups) {
    const exact = g.points.filter((p) => p[2]);
    const counts = new Map();
    for (const [lat, lng] of exact.length ? exact : g.points) {
      const key = `${lat},${lng}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    [g.lat, g.lng] = best.split(',').map(Number);
  }
  // A few postcodes of a city sit just across a canton border (Basel 4040 in
  // Basel-Landschaft): fold them into the city rather than listing it twice.
  groups.sort((a, b) => b.zips.size - a.zips.size);
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    const main = groups.find((x, j) => j < i && x.name === g.name && km(x.lat, x.lng, g.lat, g.lng) < 10);
    if (main) {
      g.zips.forEach((z) => main.zips.add(z));
      groups.splice(i, 1);
    }
  }
  return groups;
}

async function buildCities() {
  const require = createRequire(import.meta.url);
  const cities = require('city-timezones/data/cityMap.json');
  const swiss = swissLocalities();
  const unmatched = [];
  const seen = new Set();
  const rows = [];
  for (const c of cities) {
    if (!c.timezone || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
    if (c.iso2 === 'CH') {
      // Replaced by the complete Swiss list; hand its population, for ranking, to the
      // nearby locality of the same name (the one with most postcodes if several).
      const wanted = SWISS_EXONYMS[foldName(c.city)] ?? foldName(c.city);
      const target = swiss
        .filter((g) => foldName(g.name) === wanted && km(c.lat, c.lng, g.lat, g.lng) < 25)
        .sort((a, b) => b.zips.size - a.zips.size)[0];
      if (target) target.pop = Math.max(target.pop ?? 0, Math.round(c.pop ?? 0));
      else unmatched.push(c.city);
      continue;
    }
    const key = `${c.city}|${c.iso2}|${c.lat.toFixed(1)}|${c.lng.toFixed(1)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // [name, country code, country, region, lat, lng, timezone, population, postcodes?]
    rows.push([c.city, c.iso2, c.country, c.province ?? '', round4(c.lat), round4(c.lng), c.timezone, Math.round(c.pop ?? 0)]);
  }
  for (const g of swiss) {
    const zips = [...g.zips].sort();
    // Localities without a known population rank by their number of postcodes.
    rows.push([g.name, 'CH', 'Switzerland', CANTONS[g.canton], round4(g.lat), round4(g.lng), 'Europe/Zurich', g.pop ?? zips.length, zips.join(' ')]);
  }
  rows.sort((a, b) => b[7] - a[7]);
  await writeJson(join(root, 'public/data/cities.json'), rows);
  console.log(`✓ cities (${rows.length}, of which ${swiss.length} in Switzerland)`);
  if (unmatched.length) console.log(`  Swiss cities ranked by postcodes only: ${unmatched.join(', ')}`);
}

async function buildHadith() {
  for (const collection of ['nawawi', 'qudsi']) {
    const ar = await cached(`ara-${collection}.json`, `${HADITH_API}/editions/ara-${collection}.json`);
    const fr = await cached(`fra-${collection}.json`, `${HADITH_API}/editions/fra-${collection}.json`);
    const frByNumber = new Map(fr.hadiths.map((h) => [h.hadithnumber, h.text.trim()]));
    const list = ar.hadiths
      .map((h) => ({ n: h.hadithnumber, ar: h.text.trim(), fr: frByNumber.get(h.hadithnumber) ?? '' }))
      .filter((h) => h.ar && h.fr);
    if (list.length < 40) throw new Error(`${collection}: only ${list.length} hadiths with both texts`);
    await writeJson(join(root, 'public/data/hadith', `${collection}.json`), list);
    console.log(`✓ hadith ${collection} (${list.length})`);
  }
}

await buildQuran();
await buildHadith();
await buildCities();
