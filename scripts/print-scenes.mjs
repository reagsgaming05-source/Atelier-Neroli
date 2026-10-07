#!/usr/bin/env node
// Prints the scenes of some stories with their index, picture and narration, to write their storyboard.
//   node scripts/print-scenes.mjs adam nuh        (all episodes of these stories)
//   node scripts/print-scenes.mjs nuh:1           (one episode)
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { SERIES } = await server.ssrLoadModule('/src/data/series/index.ts');
for (const arg of process.argv.slice(2)) {
  const [id, only] = arg.split(':');
  const series = SERIES.find((s) => s.storyId === id);
  if (!series) {
    console.log(`?? unknown story ${id}`);
    continue;
  }
  series.episodes.forEach((ep, ei) => {
    if (only !== undefined && Number(only) !== ei) return;
    console.log(`\n=== ${id} episode ${ei}: ${ep.title}`);
    ep.scenes.forEach((s, si) => {
      console.log(`[${id}-${ei}-${si}] ${s.sky}/${s.ground}/${(s.motifs ?? []).join('+')}`);
      console.log(`    ${s.text}`);
      if (s.verse) {
        const tr = JSON.parse(readFileSync(`public/data/quran/fr-hamidullah/${s.verse.surah}.json`, 'utf8'))[s.verse.verse - 1];
        console.log(`    VERSE read aloud after the text (${s.verse.surah}:${s.verse.verse}): ${tr}`);
      }
    });
  });
}
await server.close();
