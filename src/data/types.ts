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
] as const;

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

export interface Episode {
  title: string;
  scenes: Scene[];
}

/** The illustrated, narrated version of a story: one episode per Quran passage, or a single episode for a hadith story. */
export interface Series {
  storyId: string;
  episodes: Episode[];
}
