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
