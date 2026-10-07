import type { Storyboard } from '../types';

/*
 * Pictures of Nûh's story. This is the model for the other storyboards:
 * each scene is told over several pictures that follow what is said, one
 * after the other, with what is already on screen staying until the text
 * says it goes away.
 */
export const BOARD_NUH: Storyboard = {
  // ── Épisode 2 : l'arche et le déluge ──
  'nuh-1-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['wall', 'house', 'light', 'crowd'], focus: 'crowd' },
    { at: 'Je crains pour vous le châtiment', sky: 'dusk', motifs: ['wall', 'house', 'dark-clouds', 'crowd'], focus: 'dark-clouds' },
  ],
  'nuh-1-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'pillars', 'folk'], focus: 'folk' },
    { at: 'Nouh refusa de repousser les croyants', motifs: ['house', 'lamp', 'crowd'], focus: 'lamp' },
  ],
  'nuh-1-2': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['tree', 'light'], focus: 'light', cut: true },
    { at: 'Et Il lui dit', motifs: ['tree', 'planks', 'light'], focus: 'planks' },
  ],
  'nuh-1-3': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['planks', 'ark', 'workers'], focus: 'workers' },
    { at: 'Chaque fois que des notables passaient', motifs: ['ark', 'workers', 'walkers', 'path'], focus: 'walkers' },
    { at: 'Il leur répondit que bientôt', sky: 'dusk', motifs: ['ark', 'walkers', 'dark-clouds', 'birds'], focus: 'dark-clouds' },
  ],
  'nuh-1-4': [
    { at: '', sky: 'storm', ground: 'plain', motifs: ['ark', 'dark-clouds', 'lightning'], focus: 'ark' },
    { at: 'un couple de chaque espèce', motifs: ['ark', 'path', 'sheep', 'camel', 'goat', 'birds'], focus: 'sheep' },
    { at: 'Ils étaient peu nombreux', motifs: ['ark', 'rain', 'dark-clouds', 'folk'], focus: 'folk' },
  ],
  'nuh-1-5': [{ at: '', sky: 'storm', ground: 'sea', motifs: ['ark', 'rain', 'flood'], focus: 'ark' }],
  'nuh-1-6': [
    { at: '', sky: 'storm', ground: 'sea', motifs: ['ark', 'flood', 'dark-clouds', 'lightning'], focus: 'ark' },
    { at: 'Nouh appela son fils', motifs: ['ark', 'flood', 'rain'], focus: 'horizon' },
    { at: 'Le fils voulut se réfugier', ground: 'mountains', motifs: ['rock', 'flood', 'dark-clouds'], focus: 'rock' },
    { at: 'Les vagues les séparèrent', ground: 'sea', motifs: ['flood', 'dark-clouds', 'lightning'], focus: 'flood' },
  ],
  'nuh-1-7': [{ at: '', sky: 'dawn', ground: 'mountains', motifs: ['flood', 'ark', 'rock', 'clouds'], focus: 'clouds' }],
  'nuh-1-8': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['ark', 'rock', 'light'], focus: 'light' },
    { at: 'Allah lui répondit que celui-ci', motifs: ['ark', 'rock', 'clouds', 'light'], focus: 'sky' },
    { at: 'Nouh demanda aussitôt pardon', sky: 'dawn', motifs: ['ark', 'rock', 'light'], focus: 'ark' },
  ],
  'nuh-1-9': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['sun', 'birds', 'tree', 'folk'], focus: 'sun' },
    { at: 'Et le Coran nous rappelle', sky: 'day', motifs: ['sun', 'birds', 'tree', 'light'], focus: 'sky' },
  ],
};
