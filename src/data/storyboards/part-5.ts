import type { Storyboard } from '../types';

/*
 * Pictures of the stories of Ayyoub, Younous, Zakariya / Yahya and Maryam.
 * Prophets, angels and Maryam are never drawn: light, lamp, staff, spring, cradle stand for them;
 * only ordinary people (folk, crowd, walkers, caravan) and animals are shown alive.
 */
export const BOARD_5: Storyboard = {
  // ═══════════════ AYYOUB ═══════════════
  // ── Épisode 1 : l'invocation ──
  'ayyub-0-0': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['tent', 'palms', 'birds'], focus: 'tent' },
    { at: 'Il fut touché par le mal', motifs: ['tent', 'withered', 'dark-clouds'], focus: 'withered' },
    { at: 'et éprouvé dans sa famille', motifs: ['tent', 'folk', 'withered'], focus: 'folk' },
  ],
  'ayyub-0-1': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['tent', 'withered', 'stars', 'bats'], focus: 'tent' },
    { at: 'avec délicatesse et confiance', motifs: ['tent', 'stars', 'light', 'bats'], focus: 'light' },
  ],
  'ayyub-0-2': [{ at: '', sky: 'night', ground: 'desert', motifs: ['tent', 'crescent', 'light', 'bats'], focus: 'light' }],
  'ayyub-0-3': [{ at: '', sky: 'dawn', ground: 'garden', motifs: ['tent', 'tree', 'sun', 'light', 'folk', 'birds'], focus: 'light' }],
  'ayyub-0-4': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['tent', 'tree', 'birds'], focus: 'tent' },
    { at: 'Il a confié sa peine', motifs: ['tent', 'tree', 'light'], focus: 'light' },
    { at: 'Et la délivrance est venue.', motifs: ['tent', 'house', 'folk', 'butterflies', 'sun'], focus: 'folk' },
  ],

  // ── Épisode 2 : l'eau fraîche ──
  'ayyub-1-0': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['tent', 'stars', 'withered', 'bats'], focus: 'tent' },
    { at: 'au milieu de son épreuve', motifs: ['tent', 'withered', 'stars', 'dark-clouds'], focus: 'withered' },
  ],
  'ayyub-1-1': [{ at: '', sky: 'night', ground: 'desert', motifs: ['tent', 'crescent', 'withered'], focus: 'crescent' }],
  'ayyub-1-2': [{ at: '', sky: 'dawn', ground: 'desert', motifs: ['tent', 'footprints', 'spring', 'sun', 'birds'], focus: 'spring' }],
  'ayyub-1-3': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['spring', 'tree', 'tent'], focus: 'spring' },
    { at: 'pour se désaltérer', motifs: ['spring', 'birds', 'tree'], focus: 'birds' },
  ],
  'ayyub-1-4': [{ at: '', sky: 'day', ground: 'garden', motifs: ['house', 'tent', 'palms', 'folk', 'birds'], focus: 'folk' }],
  'ayyub-1-5': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['house', 'palm', 'light', 'folk'], focus: 'light' },
    { at: 'Quel bon serviteur', motifs: ['tent', 'palm', 'light', 'birds'], focus: 'birds' },
  ],
  'ayyub-1-6': [
    { at: '', sky: 'dawn', ground: 'garden', motifs: ['tent', 'spring', 'light', 'birds'], focus: 'light' },
    { at: 'Ayyoub l’a fait', motifs: ['tent', 'spring', 'tree', 'sun', 'butterflies'], focus: 'sun' },
  ],

  // ═══════════════ YOUNOUS ═══════════════
  // ── Épisode 1 : le bateau, le poisson et la courge ──
  'yunus-0-0': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['light', 'path', 'footprints', 'birds'], focus: 'light' },
    { at: 'Un jour, il s’enfuit', ground: 'sea', motifs: ['boat', 'footprints', 'gulls', 'clouds'], focus: 'boat' },
    { at: 'bateau chargé', motifs: ['boat', 'crowd', 'gulls', 'clouds'], focus: 'crowd' },
  ],
  'yunus-0-1': [
    { at: '', sky: 'dusk', ground: 'sea', motifs: ['boat', 'crowd', 'clouds', 'gulls'], focus: 'crowd' },
    { at: 'et le sort le désigna', sky: 'storm', motifs: ['boat', 'crowd', 'dark-clouds', 'wind'], focus: 'dark-clouds' },
  ],
  'yunus-0-2': [{ at: '', sky: 'night', ground: 'sea', motifs: ['big-fish', 'dark-clouds', 'wind'], focus: 'big-fish' }],
  'yunus-0-3': [
    { at: '', sky: 'night', ground: 'sea', motifs: ['big-fish', 'dark-clouds', 'light'], focus: 'light' },
    { at: 'il serait resté dans le ventre', motifs: ['big-fish', 'stars'], focus: 'big-fish' },
  ],
  'yunus-0-4': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['big-fish', 'stones', 'sun', 'gulls'], focus: 'big-fish' },
    { at: 'sur une terre nue', motifs: ['stones', 'sun', 'gulls'], focus: 'ground' },
  ],
  'yunus-0-5': [{ at: '', sky: 'dawn', ground: 'desert', motifs: ['gourd', 'stones', 'sun', 'birds'], focus: 'gourd' }],
  'yunus-0-6': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['gourd', 'path', 'light'], focus: 'path' },
    { at: 'cent mille personnes', ground: 'city', motifs: ['house', 'crowd', 'path', 'palms'], focus: 'crowd' },
    { at: 'Ils crurent', motifs: ['house', 'crowd', 'palms', 'light'], focus: 'light' },
    { at: 'jouir de la vie pour un temps', motifs: ['house', 'palms', 'sun', 'birds', 'folk'], focus: 'folk' },
  ],
  'yunus-0-7': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'palms', 'light', 'birds'], focus: 'light' },
    { at: 'Se souvenir d’Allah dans l’aisance', motifs: ['house', 'lamp', 'palms', 'crescent', 'folk'], focus: 'lamp' },
  ],

  // ── Épisode 2 : l'invocation dans les ténèbres ──
  'yunus-1-0': [
    { at: '', sky: 'dusk', ground: 'sea', motifs: ['big-fish', 'clouds', 'gulls'], focus: 'big-fish' },
    { at: 'partit un jour, irrité', motifs: ['boat', 'clouds', 'wind', 'gulls'], focus: 'boat' },
  ],
  'yunus-1-1': [{ at: '', sky: 'night', ground: 'sea', motifs: ['big-fish', 'dark-clouds', 'light'], focus: 'big-fish' }],
  'yunus-1-2': [{ at: '', sky: 'dawn', ground: 'sea', motifs: ['big-fish', 'light', 'sun', 'gulls'], focus: 'light' }],
  'yunus-1-3': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['gourd', 'stones', 'light'], focus: 'light' },
    { at: 'il L’a glorifié', motifs: ['gourd', 'birds', 'sun', 'light'], focus: 'birds' },
  ],
  'yunus-1-4': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['gourd', 'palm', 'light', 'birds'], focus: 'light' },
    { at: 'Cette délivrance n’était pas réservée', motifs: ['palm', 'path', 'caravan', 'light'], focus: 'caravan' },
  ],
  'yunus-1-5': [
    { at: '', sky: 'dusk', ground: 'sea', motifs: ['boat', 'light', 'clouds', 'gulls'], focus: 'boat' },
    { at: 'dans sa peine', motifs: ['boat', 'folk', 'crescent', 'gulls'], focus: 'crescent' },
  ],

  // ── Épisode 3 : l'homme au poisson ──
  'yunus-2-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['book', 'light', 'house', 'birds'], focus: 'book' },
    { at: 'et lui parle de Younous', ground: 'sea', motifs: ['book', 'light', 'big-fish'], focus: 'big-fish' },
  ],
  'yunus-2-1': [{ at: '', sky: 'day', ground: 'sea', motifs: ['book', 'light', 'big-fish', 'sun'], focus: 'book' }],
  'yunus-2-2': [
    { at: '', sky: 'night', ground: 'sea', motifs: ['big-fish', 'dark-clouds'], focus: 'big-fish' },
    { at: 'il avait appelé Allah', motifs: ['big-fish', 'dark-clouds', 'light'], focus: 'light' },
  ],
  'yunus-2-3': [{ at: '', sky: 'dawn', ground: 'desert', motifs: ['stones', 'sun', 'light', 'gulls'], focus: 'sun' }],
  'yunus-2-4': [{ at: '', sky: 'day', ground: 'desert', motifs: ['gourd', 'light', 'stones', 'birds'], focus: 'gourd' }],
  'yunus-2-5': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'path', 'crowd', 'light'], focus: 'path' },
    { at: 'Et ne jamais oublier', motifs: ['house', 'lamp', 'path', 'crescent', 'birds'], focus: 'lamp' },
  ],

  // ── Épisode 4 : un peuple qui crut à temps ──
  'yunus-3-0': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['wall', 'house', 'dark-clouds', 'crowd'], focus: 'crowd' },
    { at: 'jusqu’à ce qu’il soit trop tard', ground: 'desert', motifs: ['ruins', 'dark-clouds', 'bats'], focus: 'ruins' },
  ],
  'yunus-3-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'palms', 'light', 'folk'], focus: 'folk', cut: true },
    { at: 'vers qui il avait été envoyé', motifs: ['house', 'palms', 'path', 'light', 'crowd'], focus: 'crowd' },
  ],
  'yunus-3-2': [{ at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'light', 'sun', 'crowd', 'birds'], focus: 'sun' }],
  'yunus-3-3': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'dark-clouds', 'crowd', 'light'], focus: 'crowd' },
    { at: 'le châtiment humiliant', motifs: ['house', 'clouds', 'sun', 'birds'], focus: 'sun' },
    { at: 'et leur donna d’en profiter', motifs: ['house', 'palms', 'sun', 'folk', 'birds'], focus: 'palms' },
  ],
  'yunus-3-4': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'path', 'light', 'walkers'], focus: 'walkers' },
    { at: 'Le peuple de Younous a cru', motifs: ['house', 'palms', 'crescent', 'light', 'crowd'], focus: 'crescent' },
  ],

  // ═══════════════ ZAKARIYA & YAHYA ═══════════════
  // ── Épisode 1 : dans le sanctuaire ──
  'zakariya-yahya-0-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'wall', 'pillars', 'birds'], focus: 'house' },
    { at: 'Il entrait souvent', motifs: ['pillars', 'lamp', 'path', 'footprints', 'birds'], focus: 'footprints' },
  ],
  'zakariya-yahya-0-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['pillars', 'lamp', 'table', 'bread', 'birds'], focus: 'table' },
    { at: 'd’où te vient cela', motifs: ['pillars', 'lamp', 'light', 'table'], focus: 'light' },
    { at: 'Cela me vient d’Allah', motifs: ['table', 'bread', 'light', 'birds'], focus: 'bread' },
  ],
  'zakariya-yahya-0-2': [{ at: '', sky: 'dusk', ground: 'city', motifs: ['pillars', 'lamp', 'birds'], focus: 'lamp' }],
  'zakariya-yahya-0-3': [{ at: '', sky: 'night', ground: 'city', motifs: ['pillars', 'lamp', 'light', 'stars'], focus: 'light' }],
  'zakariya-yahya-0-4': [
    { at: '', sky: 'night', ground: 'city', motifs: ['pillars', 'lamp', 'stars', 'bats'], focus: 'lamp' },
    { at: 'alors que la vieillesse', motifs: ['pillars', 'withered', 'stars'], focus: 'withered' },
    { at: 'Allah répondit', motifs: ['pillars', 'lamp', 'light', 'stars'], focus: 'light' },
  ],
  'zakariya-yahya-0-5': [{ at: '', sky: 'dawn', ground: 'city', motifs: ['pillars', 'sun', 'lamp', 'birds'], focus: 'sun' }],
  'zakariya-yahya-0-6': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['pillars', 'light', 'sun', 'birds'], focus: 'light' },
    { at: 'et sa prière allait être exaucée', motifs: ['pillars', 'lamp', 'light', 'sun'], focus: 'lamp' },
  ],

  // ── Épisode 2 : la naissance de Yahya ──
  'zakariya-yahya-1-0': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'stars', 'light', 'bats'], focus: 'house' },
    { at: 'quand il invoqua son Seigneur en secret', motifs: ['house', 'lamp', 'stars'], focus: 'lamp' },
  ],
  'zakariya-yahya-1-1': [{ at: '', sky: 'night', ground: 'city', motifs: ['house', 'lamp', 'crescent', 'withered'], focus: 'lamp' }],
  'zakariya-yahya-1-2': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'lamp', 'folk', 'footprints'], focus: 'folk' },
    { at: 'et ma femme est stérile', motifs: ['house', 'withered', 'lamp'], focus: 'withered' },
    { at: 'Accorde-moi un descendant', motifs: ['house', 'lamp', 'light', 'stars'], focus: 'light' },
  ],
  'zakariya-yahya-1-3': [{ at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'light', 'sun', 'birds'], focus: 'light' }],
  'zakariya-yahya-1-4': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'withered', 'lamp', 'sun'], focus: 'withered' },
    { at: 'Allah répondit', motifs: ['house', 'light', 'lamp', 'birds'], focus: 'light' },
  ],
  'zakariya-yahya-1-5': [
    { at: '', sky: 'day', ground: 'city', motifs: ['pillars', 'moon', 'light', 'birds'], focus: 'pillars' },
    { at: 'Il sortit du sanctuaire', motifs: ['pillars', 'path', 'folk', 'footprints'], focus: 'footprints' },
    { at: 'glorifier Allah matin et soir', motifs: ['folk', 'sun', 'crescent', 'path'], focus: 'folk' },
  ],
  'zakariya-yahya-1-6': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['cradle', 'palm', 'sun', 'path', 'butterflies'], focus: 'cradle' },
    { at: 'tiens fermement au Livre', motifs: ['book', 'palm', 'light', 'sun', 'birds'], focus: 'book' },
    { at: 'Dès l’enfance, il reçut la sagesse', motifs: ['palm', 'tree', 'light', 'butterflies', 'sun'], focus: 'butterflies' },
    { at: 'Il était pieux, bon envers ses parents', motifs: ['house', 'palm', 'folk', 'light'], focus: 'house' },
  ],
  'zakariya-yahya-1-7': [{ at: '', sky: 'dawn', ground: 'garden', motifs: ['cradle', 'palm', 'sun', 'light', 'birds'], focus: 'light' }],
  'zakariya-yahya-1-8': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['cradle', 'tree', 'light', 'birds'], focus: 'cradle' },
    { at: 'Il ne faut jamais cesser d’invoquer', motifs: ['lamp', 'tree', 'crescent', 'birds'], focus: 'crescent' },
  ],

  // ── Épisode 3 : ne me laisse pas seul ──
  'zakariya-yahya-2-0': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'stars', 'bats'], focus: 'stars' },
    { at: 'quand il implora son Seigneur', motifs: ['house', 'lamp', 'stars'], focus: 'lamp' },
  ],
  'zakariya-yahya-2-1': [{ at: '', sky: 'night', ground: 'city', motifs: ['house', 'lamp', 'crescent'], focus: 'lamp' }],
  'zakariya-yahya-2-2': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'light', 'sun', 'birds'], focus: 'light' },
    { at: 'Il Lui demandait pourtant', motifs: ['house', 'withered', 'lamp'], focus: 'withered' },
  ],
  'zakariya-yahya-2-3': [{ at: '', sky: 'dawn', ground: 'garden', motifs: ['house', 'cradle', 'palm', 'light', 'butterflies', 'birds'], focus: 'cradle' }],
  'zakariya-yahya-2-4': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['house', 'folk', 'path', 'tree'], focus: 'folk' },
    { at: 'invoquer Allah avec amour', motifs: ['house', 'lamp', 'light', 'tree'], focus: 'lamp' },
    { at: 'voilà ce qui distinguait cette famille bénie', motifs: ['house', 'folk', 'tree', 'crescent', 'light'], focus: 'house' },
  ],

  // ═══════════════ MARYAM ═══════════════
  // ── Épisode 1 : la naissance de Maryam ──
  'maryam-0-0': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'wall', 'light', 'birds'], focus: 'house' },
    { at: 'Sa mère, la femme d’Imrane', motifs: ['house', 'lamp', 'light', 'folk'], focus: 'lamp' },
  ],
  'maryam-0-1': [{ at: '', sky: 'day', ground: 'city', motifs: ['house', 'pillars', 'light', 'birds'], focus: 'light' }],
  'maryam-0-2': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'cradle', 'birds'], focus: 'cradle' },
    { at: 'Elle la nomma Maryam', motifs: ['cradle', 'house', 'light', 'folk'], focus: 'light' },
    { at: 'sous la protection d’Allah', motifs: ['cradle', 'house', 'wall', 'light'], focus: 'wall' },
  ],
  'maryam-0-3': [{ at: '', sky: 'day', ground: 'city', motifs: ['pillars', 'lamp', 'table', 'bread', 'birds'], focus: 'bread' }],
  'maryam-0-4': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['table', 'bread', 'light', 'pillars', 'birds'], focus: 'bread' },
    { at: 'Maryam, confiée à Allah', motifs: ['pillars', 'lamp', 'house', 'birds'], focus: 'lamp' },
  ],

  // ── Épisode 2 : élue et purifiée ──
  'maryam-1-0': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['pillars', 'house', 'lamp', 'birds'], focus: 'pillars' },
    { at: 'Un jour, les anges', motifs: ['pillars', 'light', 'lamp'], focus: 'light' },
  ],
  'maryam-1-1': [{ at: '', sky: 'dawn', ground: 'city', motifs: ['pillars', 'light', 'sun', 'lamp', 'birds'], focus: 'light' }],
  'maryam-1-2': [
    { at: '', sky: 'day', ground: 'city', motifs: ['pillars', 'lamp', 'light', 'birds'], focus: 'lamp' },
    { at: 'avec ceux qui s’inclinent', motifs: ['pillars', 'lamp', 'folk', 'path'], focus: 'folk' },
  ],
  'maryam-1-3': [
    { at: '', sky: 'day', ground: 'city', motifs: ['scroll', 'lamp', 'pillars', 'birds'], focus: 'scroll' },
    { at: 'quand on jeta des calames', sky: 'dusk', motifs: ['stones', 'folk', 'pillars'], focus: 'stones' },
    { at: 'qui se chargerait de Maryam', motifs: ['folk', 'cradle', 'pillars', 'lamp'], focus: 'cradle' },
  ],
  'maryam-1-4': [{ at: '', sky: 'night', ground: 'city', motifs: ['pillars', 'light', 'bright-star'], focus: 'bright-star' }],
  'maryam-1-5': [
    { at: '', sky: 'night', ground: 'city', motifs: ['pillars', 'cradle', 'stars'], focus: 'cradle' },
    { at: 'et dans son âge mûr', motifs: ['folk', 'pillars', 'light', 'stars'], focus: 'folk' },
  ],
  'maryam-1-6': [{ at: '', sky: 'dawn', ground: 'city', motifs: ['cradle', 'pillars', 'light', 'sun', 'birds'], focus: 'light' }],
  'maryam-1-7': [
    { at: '', sky: 'dawn', ground: 'garden', motifs: ['palm', 'light', 'sun', 'pillars', 'butterflies'], focus: 'pillars' },
    { at: 'La suite raconte la naissance', motifs: ['palm', 'light', 'sun', 'cradle', 'birds'], focus: 'cradle' },
  ],

  // ── Épisode 3 : sous le palmier ──
  'maryam-2-0': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'path', 'footprints', 'folk'], focus: 'folk' },
    { at: 'en un lieu vers l’Orient', ground: 'desert', motifs: ['path', 'footprints', 'sun', 'birds'], focus: 'sun' },
    { at: 'et mit un voile entre elle et eux', motifs: ['wall', 'folk', 'sun', 'light'], focus: 'wall' },
  ],
  'maryam-2-1': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['wall', 'light', 'sun', 'birds'], focus: 'light' },
    { at: 'qui se présenta à elle', motifs: ['wall', 'footprints', 'light'], focus: 'footprints' },
  ],
  'maryam-2-2': [{ at: '', sky: 'day', ground: 'desert', motifs: ['wall', 'footprints', 'light', 'birds'], focus: 'wall' }],
  'maryam-2-3': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['light', 'footprints', 'wall', 'sun'], focus: 'footprints' },
    { at: 'venu te faire don', motifs: ['light', 'cradle', 'sun', 'birds'], focus: 'cradle' },
  ],
  'maryam-2-4': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['wall', 'footprints', 'light'], focus: 'wall' },
    { at: 'Il répondit', motifs: ['light', 'crescent', 'cradle'], focus: 'light' },
  ],
  'maryam-2-5': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['cradle', 'light', 'crescent'], focus: 'cradle' },
    { at: 'se retira avec l’enfant', motifs: ['path', 'footprints', 'crescent'], focus: 'footprints' },
    { at: 'Les douleurs de l’enfantement', motifs: ['palm', 'path', 'footprints', 'birds'], focus: 'palm' },
  ],
  'maryam-2-6': [{ at: '', sky: 'dusk', ground: 'desert', motifs: ['palm', 'spring', 'footprints', 'birds'], focus: 'spring' }],
  'maryam-2-7': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['palm', 'spring', 'light', 'birds'], focus: 'palm' },
    { at: 'il fera tomber sur toi des dattes', motifs: ['palm', 'dates', 'spring', 'birds'], focus: 'dates' },
    { at: 'que ton œil se réjouisse', motifs: ['palm', 'dates', 'spring', 'light'], focus: 'light' },
  ],
  'maryam-2-8': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['palm', 'dates', 'path', 'folk'], focus: 'folk' },
    { at: 'je ne parlerai', sky: 'night', motifs: ['palm', 'spring', 'stars', 'bats'], focus: 'stars' },
  ],
  'maryam-2-9': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['palm', 'spring', 'dates', 'moon', 'bats'], focus: 'palm' },
    { at: 'La suite est l’histoire', motifs: ['palm', 'light', 'moon', 'cradle'], focus: 'cradle' },
  ],

  // ── Épisode 4 : un exemple pour les croyants ──
  'maryam-3-0': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['book', 'light', 'path', 'walkers'], focus: 'walkers' },
    { at: 'Parmi eux, une femme', motifs: ['pillars', 'light', 'house', 'birds'], focus: 'pillars' },
  ],
  'maryam-3-1': [{ at: '', sky: 'dawn', ground: 'garden', motifs: ['palm', 'light', 'sun', 'birds', 'butterflies'], focus: 'palm' }],
  'maryam-3-2': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['book', 'light', 'palm', 'butterflies'], focus: 'book' },
    { at: 'Elle était de ceux qui obéissent', motifs: ['palm', 'lamp', 'light', 'sun', 'birds'], focus: 'lamp' },
  ],
  'maryam-3-3': [{ at: '', sky: 'day', ground: 'desert', motifs: ['palm', 'spring', 'cradle', 'light', 'birds'], focus: 'cradle' }],
  'maryam-3-4': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['palm', 'light', 'lamp', 'birds'], focus: 'lamp' },
    { at: 'Maryam reste un modèle', motifs: ['palm', 'path', 'crescent', 'light', 'walkers'], focus: 'walkers' },
  ],
};
