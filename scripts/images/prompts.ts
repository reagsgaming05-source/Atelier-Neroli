/**
 * Writes the prompts of every picture of the storyboards (src/data/storyboards) to
 * scripts/images/prompts/auto/<story>-<episode>.json, for paint.py.
 *
 *   npx vite-node scripts/images/prompts.ts
 *
 * Each prompt is built from what the storyboard says is on screen: the sky, the
 * landscape, the motifs, the one the camera looks at first. Hand-written prompts in
 * scripts/images/prompts/*.json win over these for the same picture.
 *
 * The image model reads only about 60 words: the focus comes first, then at most
 * three other motifs, then the light and the place. People are always small, far
 * away, seen from behind, in hooded robes: never a face.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { STORYBOARD } from '../../src/data/storyboards/index';
import type { Beat, Ground, Motif, Sky } from '../../src/data/types';

const DIR = join(__dirname, 'prompts');
const OUT = join(DIR, 'auto');

const SKY: Record<Sky, string> = {
  dawn: 'at dawn, soft pink and golden light',
  day: 'in bright daylight, clear blue sky',
  dusk: 'at dusk, warm orange sunset light, long shadows',
  night: 'at night, deep blue sky, moonlight',
  storm: 'under a dark stormy sky, heavy grey clouds',
};

const GROUND: Record<Ground, string> = {
  desert: 'in a vast golden sand desert with dunes',
  sea: 'on the open sea, waves',
  mountains: 'among rocky mountains',
  valley: 'in a green valley between hills',
  garden: 'in a lush garden with fruit trees and streams',
  city: 'in an ancient town of flat-roofed mud-brick houses',
  river: 'on the bank of a wide river with reeds',
  plain: 'on a wide open plain with grass and olive trees',
  cave: 'inside a rocky cave',
  none: '',
};

const PEOPLE_TAIL = 'tiny and far away, seen from behind, faces hidden';

const MOTIF: Record<Motif, string> = {
  sun: 'a radiant sun',
  moon: 'a full moon',
  crescent: 'a thin crescent moon',
  stars: 'a sky full of stars',
  'bright-star': 'one very bright star',
  clouds: 'soft white clouds',
  'dark-clouds': 'dark heavy clouds',
  rain: 'pouring rain',
  lightning: 'lightning bolts',
  wind: 'a strong wind blowing sand and leaves',
  flood: 'a vast flood of churning water',
  'sea-split': 'the sea parted into two towering walls of water with a dry path between them',
  ark: 'a huge simple wooden ark with no mast and no sails',
  boat: 'a small wooden boat',
  'big-fish': 'an enormous whale in the sea',
  spring: 'a spring of clear water gushing from the ground',
  light: 'a soft heavenly golden light shining from above',
  fire: 'a great blazing fire',
  lamp: 'a small clay oil lamp glowing',
  palm: 'a date palm',
  palms: 'a grove of date palms',
  tree: 'a large old tree',
  withered: 'withered dead plants',
  wheat: 'golden fields of wheat',
  gourd: 'a broad-leaved gourd plant',
  dates: 'clusters of ripe dates',
  kaaba: 'a simple cube-shaped stone building in a rocky valley',
  tent: 'a black goat-hair bedouin tent',
  house: 'a flat-roofed mud-brick house',
  palace: 'a grand ancient stone palace with columns',
  tower: 'a tall ancient brick tower',
  ruins: 'crumbling ancient ruins',
  pillars: 'tall carved stone pillars',
  wall: 'a high mud-brick city wall',
  prison: 'a dark stone prison cell with a barred opening',
  well: 'an old round stone well',
  'cave-mouth': 'the dark mouth of a cave in a rocky hillside',
  throne: 'an empty ornate royal throne',
  camel: 'camels',
  birds: 'birds flying',
  hoopoe: 'a hoopoe bird with its crest',
  ants: 'a column of tiny ants',
  sheep: 'a flock of sheep',
  elephant: 'a huge war elephant',
  cows: 'cows',
  staff: 'a wooden shepherd staff',
  tablets: 'two engraved stone tablets',
  book: 'an old open book with golden pages',
  scroll: 'a rolled parchment scroll',
  coins: 'a few silver coins',
  gold: 'a heap of gold treasure',
  shirt: 'a simple linen tunic',
  cradle: 'a small wooden cradle',
  table: 'a low table laid with food',
  stones: 'scattered stones',
  path: 'a dusty winding path',
  footprints: 'footprints in the sand',
  key: 'a large old iron key',
  dove: 'a white dove',
  wolf: 'a grey wolf',
  serpent: 'a great serpent',
  locusts: 'a swarm of locusts',
  dog: 'a dog lying down',
  raven: 'a black raven',
  planks: 'wooden planks, ropes and tools',
  web: 'a spider web across an opening',
  basket: 'a woven reed basket',
  scales: 'old balance scales',
  goblet: 'a golden goblet',
  bread: 'loaves of flat bread',
  flames: 'tongues of flame',
  rock: 'a great rock',
  rope: 'a coiled rope',
  jar: 'clay jars',
  folk: `a few people in earth-toned hooded robes, ${PEOPLE_TAIL}`,
  crowd: `a crowd of people in earth-toned hooded robes, ${PEOPLE_TAIL}`,
  walkers: `travellers in hooded robes walking away, ${PEOPLE_TAIL}`,
  workers: `workers in plain robes at work, ${PEOPLE_TAIL}`,
  caravan: 'a camel caravan with robed riders seen from far away',
  horse: 'horses',
  goat: 'goats',
  gulls: 'seagulls',
  fish: 'fish leaping from the water',
  butterflies: 'butterflies',
  bats: 'bats flying',
};

/** Where the story takes place, when it is not just "the ancient Near East". */
function place(story: string, episode: number): string {
  if (story === 'musa' || story === 'qarun' || (story === 'yusuf' && episode > 0)) return 'ancient Egypt';
  if (story === 'muhammad' || story === 'ashab-al-fil') return 'ancient Arabia';
  return 'ancient Near East';
}

/** The beats of a scene with every omitted value filled in from the one before. */
function resolve(beats: Beat[]): Required<Pick<Beat, 'sky' | 'ground' | 'motifs'>>[] & { focus?: string }[] {
  let sky: Sky = 'day', ground: Ground = 'plain', motifs: Motif[] = [];
  return beats.map((b) => {
    sky = b.sky ?? sky;
    ground = b.ground ?? ground;
    motifs = b.motifs ?? motifs;
    return { sky, ground, motifs, focus: b.focus };
  });
}

export function promptFor(story: string, episode: number, b: { sky: Sky; ground: Ground; motifs: Motif[]; focus?: string }): string {
  const first = b.focus && (MOTIF as Record<string, string>)[b.focus] ? (b.focus as Motif) : undefined;
  const others = b.motifs.filter((m) => m !== first);
  // The focus, then living things, then the rest, so that the few words the model reads count most.
  const ordered = [...(first ? [first] : []), ...others.slice(0, 3)];
  const things = ordered.map((m) => MOTIF[m]).join(', ');
  const nobody = b.motifs.some((m) => ['folk', 'crowd', 'walkers', 'workers', 'caravan'].includes(m)) ? '' : ', no people';
  return [things || 'a wide quiet landscape', GROUND[b.ground], SKY[b.sky], place(story, episode)].filter(Boolean).join(', ') + nobody;
}

const handWritten: Record<string, string> = {};
for (const f of readdirSync(DIR).filter((f) => f.endsWith('.json'))) Object.assign(handWritten, JSON.parse(readFileSync(join(DIR, f), 'utf8')));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const files: Record<string, Record<string, string>> = {};
for (const [sceneKey, beats] of Object.entries(STORYBOARD)) {
  const parts = sceneKey.split('-');
  const scene = Number(parts.pop());
  const episode = Number(parts.pop());
  const story = parts.join('-');
  resolve(beats).forEach((b, i) => {
    const key = `${story}-${episode}-${scene}-${i}`;
    if (handWritten[key]) return;
    (files[`${story}-${episode}`] ??= {})[key] = promptFor(story, episode, b as never);
  });
}
let n = 0;
for (const [name, prompts] of Object.entries(files)) {
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(prompts, null, 1) + '\n');
  n += Object.keys(prompts).length;
}
console.log(`${n} prompts in ${Object.keys(files).length} files, ${Object.keys(handWritten).length} hand-written`);
