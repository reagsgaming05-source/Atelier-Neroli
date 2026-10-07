/** A single remembrance (dhikr) or supplication (du'a). */
export interface Dhikr {
  id: string;
  /** Arabic text, fully vocalised. */
  ar: string;
  /** Phonetic transliteration for French readers. */
  translit?: string;
  /** French translation of the meaning. */
  fr: string;
  /** How many times to repeat it. */
  count: number;
  /** Where it comes from, e.g. "Muslim 2723" or "Coran 2:255". */
  source: string;
  /** Virtue reported in the narration, in French. */
  virtue?: string;
  /** Short instruction, e.g. "Après chaque prière obligatoire". */
  note?: string;
}

export interface DhikrCategory {
  id: string;
  title: string;
  titleAr: string;
  /** One-line description shown under the title. */
  subtitle?: string;
  items: Dhikr[];
}

export interface DivineName {
  n: number;
  ar: string;
  translit: string;
  fr: string;
}

/** A passage of the Quran, shown in Arabic with its translation. */
export interface QuranPassage {
  surah: number;
  from: number;
  to: number;
  /** Short French heading for this part of the story. */
  title: string;
}

/** A multiple-choice question; `answer` is the index of the right option. */
export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  /** Where the answer comes from, e.g. "Coran 11:37". */
  ref: string;
}

/** A story told by the Quran, retold briefly and read from the verses themselves. */
export interface ProphetStory {
  id: string;
  /** Display name, e.g. "Nûh (Noé)". */
  name: string;
  nameAr: string;
  /** Short subtitle, e.g. "L’arche et le déluge". */
  title: string;
  /** French retelling, one string per paragraph, faithful to the passages. */
  summary: string[];
  lessons: string[];
  passages: QuranPassage[];
  quiz: QuizQuestion[];
}

/** A story narrated by the Prophet ﷺ in an authentic hadith. */
export interface SunnahStory {
  id: string;
  title: string;
  /** One-paragraph introduction in French. */
  intro: string;
  lessons: string[];
  hadith: {
    collection: 'bukhari' | 'muslim';
    /** Al-Bukhari: USC-MSA number ("3465"); Muslim: Fu'ad 'Abd al-Baqi number with sub-index ("2743.01"). */
    number: string;
    /** French text, verbatim from the hadith-api dataset. */
    fr: string;
  };
  quiz: QuizQuestion[];
}

export interface LearnStep {
  title: string;
  text: string;
  ar?: string;
  translit?: string;
  fr?: string;
  source?: string;
}

/** A step-by-step guide (ablutions, prayer…). */
export interface LearnGuide {
  id: string;
  title: string;
  subtitle: string;
  intro?: string;
  sections: { title: string; steps: LearnStep[] }[];
  notes?: string[];
}

/** Time of day / weather of an illustrated scene. */
export type Sky = 'dawn' | 'day' | 'dusk' | 'night' | 'storm';

/** Landscape of an illustrated scene. */
export type Ground = 'desert' | 'sea' | 'mountains' | 'valley' | 'garden' | 'city' | 'river' | 'plain' | 'cave' | 'none';

/**
 * Elements drawn in a scene. No people, prophets or angels are ever drawn:
 * only places, objects, animals and symbols.
 */
export const MOTIFS = [
  // sky
  'sun', 'moon', 'crescent', 'stars', 'bright-star', 'clouds', 'dark-clouds', 'rain', 'lightning', 'wind',
  // water
  'flood', 'sea-split', 'ark', 'boat', 'big-fish', 'spring',
  // light and fire
  'light', 'fire', 'lamp',
  // plants
  'palm', 'palms', 'tree', 'withered', 'wheat', 'gourd', 'dates',
  // buildings and places
  'kaaba', 'tent', 'house', 'palace', 'tower', 'ruins', 'pillars', 'wall', 'prison', 'well', 'cave-mouth', 'throne',
  // animals
  'camel', 'birds', 'hoopoe', 'ants', 'sheep', 'elephant', 'cows',
  // objects and symbols
  'staff', 'tablets', 'book', 'scroll', 'coins', 'gold', 'shirt', 'cradle', 'table', 'stones', 'path', 'footprints', 'key',
  // more animals
  'dove', 'wolf', 'serpent', 'locusts', 'dog', 'raven',
  // more objects, to tell more of the stories
  'planks', 'web', 'basket', 'scales', 'goblet', 'bread', 'flames', 'rock', 'rope', 'jar',
  // life: ordinary people as faceless silhouettes (never a prophet, an angel or a Companion), and more animals
  'folk', 'crowd', 'walkers', 'workers', 'caravan',
  'horse', 'goat', 'gulls', 'fish', 'butterflies', 'bats',
] as const;

/** Silhouettes of ordinary people. They can be hidden in the player. */
export const PEOPLE: readonly Motif[] = ['folk', 'crowd', 'walkers', 'workers', 'caravan'];

/** Everything that moves by itself: people and animals. */
export const LIVING: readonly Motif[] = [
  ...PEOPLE,
  'camel', 'birds', 'hoopoe', 'ants', 'sheep', 'elephant', 'cows', 'dove', 'wolf', 'serpent', 'locusts', 'dog', 'raven',
  'horse', 'goat', 'gulls', 'fish', 'butterflies', 'bats', 'big-fish',
];

export type Motif = (typeof MOTIFS)[number];

export interface Scene {
  /** Narration read aloud: 1 to 3 short sentences, no references or brackets. */
  text: string;
  sky: Sky;
  ground: Ground;
  motifs?: Motif[];
  /** A verse shown in Arabic with its translation, then recited. */
  verse?: { surah: number; verse: number };
}

/** What the camera is looking at: an object of the picture, or a part of the frame. */
export type Focus = Motif | 'sky' | 'ground' | 'horizon';

/**
 * One picture of a scene. A scene's narration is told over several pictures that
 * follow each other, each starting at a sentence or a clause of the text, so that
 * what is on screen is what is being said.
 */
export interface Beat {
  /** Exact words of the scene's text where this picture begins ('' for the first one). */
  at: string;
  /** Omitted: the previous picture's value (the scene's own for the first one). */
  sky?: Sky;
  ground?: Ground;
  /** Everything visible in this picture; it replaces the previous list. */
  motifs?: Motif[];
  /** What the camera looks at first. */
  focus?: Focus;
  /** A deliberate cut to somewhere or some time else: nothing has to carry over from the previous picture. */
  cut?: boolean;
}

/** Pictures of the scenes, by "<storyId>-<episode>-<scene>" (all numbers start at 0). */
export type Storyboard = Record<string, Beat[]>;

export interface Episode {
  title: string;
  scenes: Scene[];
}

/** The illustrated, narrated version of a story: one episode per Quran passage, or a single episode for a hadith story. */
export interface Series {
  storyId: string;
  episodes: Episode[];
}
