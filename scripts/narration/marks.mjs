#!/usr/bin/env node
// Listens to each recorded episode for its pauses and pins the scene texts to them, so that
// the words light up and the pages turn when they are said (see src/lib/readalong.ts).
// Writes "marks" next to "spans" in public/data/narration/index.json.
//
// Usage: node scripts/narration/marks.mjs [--only nuh-0,nuh-1]   (needs ffmpeg)

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dir = join(root, 'public', 'data', 'narration');
const only = (() => {
  const i = process.argv.indexOf('--only');
  return i > 0 ? new Set(process.argv[i + 1].split(',')) : null;
})();

const RATE = 8000; // samples per second, enough to hear where the voice is
const FRAME = 0.01; // seconds per level
const MIN_PAUSE = 0.12; // seconds of quiet that make a pause

const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { SERIES } = await server.ssrLoadModule('/src/data/series/index.ts');
  const { textHash } = await server.ssrLoadModule('/src/lib/narration.ts');
  const { alignMarks, pausesOf } = await server.ssrLoadModule('/src/lib/readalong.ts');

  const texts = new Map();
  for (const s of SERIES) s.episodes.forEach((ep, i) => ep.scenes.forEach((sc) => texts.set(`${s.storyId}-${i}/${textHash(sc.text)}`, sc.text)));

  const indexPath = join(dir, 'index.json');
  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  let pinned = 0;
  let pins = 0;
  for (const [key, entry] of Object.entries(index.episodes)) {
    if (only && !only.has(key)) continue;
    const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', join(dir, entry.file), '-ac', '1', '-ar', String(RATE), '-f', 's16le', '-'], { maxBuffer: 1 << 30 });
    const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.byteLength >> 1);
    const per = Math.round(RATE * FRAME);
    const levels = new Float32Array(Math.floor(samples.length / per));
    for (let f = 0; f < levels.length; f++) {
      let sum = 0;
      for (let j = f * per; j < (f + 1) * per; j++) sum += samples[j] * samples[j];
      levels[f] = Math.sqrt(sum / per) / 32768;
    }
    // Quiet: under 4 % of the level of the loud part of the voice.
    const sorted = Float32Array.from(levels).sort();
    const threshold = sorted[Math.floor(sorted.length * 0.9)] * 0.04;
    const pauses = pausesOf(levels, FRAME, threshold, Math.round(MIN_PAUSE / FRAME));
    const voiced = (from, to) => {
      let a = Math.ceil(from / FRAME);
      let b = Math.floor(to / FRAME) - 1;
      while (a < b && levels[a] < threshold) a++;
      while (b > a && levels[b] < threshold) b--;
      return [a * FRAME, (b + 1) * FRAME];
    };
    entry.marks = {};
    for (const [hash, [start, end]] of Object.entries(entry.spans)) {
      const text = texts.get(`${key}/${hash}`);
      if (!text) continue; // a verse translation: shown whole, not word by word
      const marks = alignMarks(text, voiced(start, end), pauses);
      entry.marks[hash] = marks;
      pinned++;
      pins += (marks.length - 2) / 2;
    }
  }
  writeFileSync(indexPath, JSON.stringify(index) + '\n');
  console.log(`${pinned} texts pinned to their recording, ${pins} pauses matched with punctuation`);
} finally {
  await server.close();
}
