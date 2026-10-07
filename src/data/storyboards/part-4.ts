import type { Storyboard } from '../types';

/*
 * Pictures of the stories of Moussa, Daoud and Souleymane.
 * Each scene follows its narration picture by picture; objects stay on
 * screen until the text says they go, time and weather evolve in order,
 * and ordinary people (never a prophet) and animals bring the places to life.
 */
export const BOARD_4: Storyboard = {
  // ───────────── MOUSSA ─────────────
  // ── Épisode 1 : l'enfant du fleuve et Madyane ──
  'musa-0-0': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['palace', 'pillars', 'wall', 'crowd'], focus: 'palace' },
    { at: 'Il opprimait les Enfants d’Israël', motifs: ['wall', 'house', 'folk', 'dark-clouds'], focus: 'folk' },
    { at: 'Mais Allah voulait favoriser', motifs: ['house', 'folk', 'light', 'birds'], focus: 'light' },
  ],
  'musa-0-1': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'cradle', 'light', 'birds'], focus: 'cradle' },
    { at: 'voici ce qu’Allah inspira', ground: 'river', motifs: ['boat', 'palms', 'light', 'birds'], focus: 'boat' },
  ],
  'musa-0-2': [
    { at: '', sky: 'day', ground: 'river', motifs: ['boat', 'palace', 'palms', 'folk'], focus: 'folk' },
    { at: 'La femme de Pharaon dit', motifs: ['palace', 'cradle', 'palms', 'folk'], focus: 'cradle' },
    { at: 'Ne le tuez pas', motifs: ['cradle', 'palace', 'light', 'birds'], focus: 'light' },
  ],
  'musa-0-3': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'cradle', 'light'], focus: 'cradle' },
    { at: 'Elle dit à la sœur de Moussa', motifs: ['house', 'path', 'footprints', 'birds'], focus: 'footprints' },
    { at: 'L’enfant refusait toutes les nourrices', motifs: ['palace', 'cradle', 'folk'], focus: 'folk' },
    { at: 'et sa sœur proposa une famille', motifs: ['house', 'path', 'folk'], focus: 'house' },
  ],
  'musa-0-4': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'cradle', 'light'], focus: 'cradle' },
    { at: 'pour que son œil se réjouisse', motifs: ['house', 'light', 'birds', 'butterflies'], focus: 'birds' },
    { at: 'Devenu adulte', sky: 'day', motifs: ['house', 'book', 'light', 'folk'], focus: 'book' },
  ],
  'musa-0-5': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['wall', 'tower', 'house', 'crowd'], focus: 'crowd' },
    { at: 'l’un de son peuple', motifs: ['wall', 'folk', 'path'], focus: 'folk' },
    { at: 'Appelé au secours', motifs: ['wall', 'footprints', 'dark-clouds'], focus: 'footprints' },
  ],
  'musa-0-6': [
    { at: '', sky: 'night', ground: 'city', motifs: ['wall', 'tower', 'dark-clouds', 'crescent', 'bats'], focus: 'dark-clouds' },
    { at: 'et se tourna aussitôt vers son Seigneur', motifs: ['wall', 'crescent', 'stars', 'light'], focus: 'light' },
  ],
  'musa-0-7': [
    { at: '', sky: 'night', ground: 'city', motifs: ['wall', 'path', 'folk', 'stars'], focus: 'folk' },
    { at: 'les notables voulaient le tuer', motifs: ['wall', 'crowd', 'stars', 'path'], focus: 'crowd' },
    { at: 'Moussa quitta la ville', ground: 'desert', motifs: ['path', 'footprints', 'stars', 'wall'], focus: 'footprints' },
    { at: 'Seigneur, sauve-moi de ce peuple injuste', motifs: ['path', 'footprints', 'crescent', 'light', 'stars'], focus: 'light' },
    { at: 'Et il prit la route de Madyane', sky: 'dawn', motifs: ['path', 'footprints', 'sun', 'birds'], focus: 'horizon' },
  ],
  'musa-0-8': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['well', 'path', 'tree', 'goat'], focus: 'well' },
    { at: 'attendaient à l’écart', motifs: ['sheep', 'goat', 'well', 'folk', 'tree'], focus: 'folk' },
    { at: 'car leur père était très âgé', motifs: ['tree', 'well', 'sheep', 'jar', 'birds'], focus: 'tree' },
  ],
  'musa-0-9': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['tent', 'sheep', 'tree', 'folk'], focus: 'folk' },
    { at: 'Il lui proposa d’épouser', motifs: ['tent', 'sheep', 'goat', 'path'], focus: 'path' },
    { at: 'contre huit ou dix années de travail', motifs: ['sheep', 'goat', 'path', 'wheat'], focus: 'sheep' },
    { at: 'Moussa accepta', motifs: ['tent', 'sheep', 'light', 'folk'], focus: 'light' },
  ],

  // ── Épisode 2 : l'appel dans la vallée de Touwa ──
  'musa-1-0': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['path', 'footprints', 'stars', 'walkers'], focus: 'walkers' },
    { at: 'Moussa aperçut un feu', motifs: ['fire', 'stars', 'path'], focus: 'fire' },
    { at: 'Restez ici', motifs: ['tent', 'folk', 'fire', 'stars'], focus: 'folk' },
    { at: 'ou bien je trouverai près du feu', motifs: ['fire', 'path', 'footprints', 'stars'], focus: 'footprints' },
  ],
  'musa-1-1': [
    { at: '', sky: 'night', ground: 'valley', motifs: ['fire', 'path', 'footprints', 'bats'], focus: 'fire' },
    { at: 'Ô Moussa, Je suis ton Seigneur', motifs: ['light', 'fire', 'stars'], focus: 'light' },
    { at: 'Enlève tes sandales', motifs: ['footprints', 'path', 'fire', 'light'], focus: 'footprints' },
    { at: 'Je t’ai choisi', motifs: ['light', 'stars', 'fire'], focus: 'light' },
  ],
  'musa-1-2': [{ at: '', sky: 'night', ground: 'valley', motifs: ['light', 'stars', 'rock', 'bats'], focus: 'sky' }],
  'musa-1-3': [
    { at: '', sky: 'night', ground: 'valley', motifs: ['staff', 'light', 'stars'], focus: 'staff' },
    { at: 'Il le jeta, et voici', motifs: ['serpent', 'light', 'stars'], focus: 'serpent' },
    { at: 'Saisis-le sans crainte', motifs: ['serpent', 'light', 'rock'], focus: 'light' },
    { at: 'Nous allons lui rendre son premier état', motifs: ['staff', 'light', 'stars'], focus: 'staff' },
  ],
  'musa-1-4': [
    { at: '', sky: 'night', ground: 'valley', motifs: ['light', 'staff', 'stars'], focus: 'light' },
    { at: 'Puis Allah lui ordonna', sky: 'dawn', ground: 'mountains', motifs: ['path', 'staff', 'sun', 'birds'], focus: 'path' },
    { at: 'car il avait dépassé toute limite', motifs: ['path', 'palace', 'crowd', 'dark-clouds'], focus: 'crowd' },
  ],
  'musa-1-5': [{ at: '', sky: 'dawn', ground: 'mountains', motifs: ['light', 'lamp', 'path', 'birds'], focus: 'lamp' }],
  'musa-1-6': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['path', 'light', 'rock', 'goat'], focus: 'path' },
    { at: 'dénoue le nœud de sa langue', motifs: ['rope', 'light', 'rock'], focus: 'rope' },
    { at: 'et lui donne pour soutien', motifs: ['path', 'footprints', 'light'], focus: 'footprints' },
    { at: 'afin qu’ensemble ils Le glorifient', sky: 'day', motifs: ['sun', 'light', 'path', 'birds'], focus: 'birds' },
  ],
  'musa-1-7': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['light', 'path', 'birds'], focus: 'light' },
    { at: 'Il lui rappela qu’Il l’avait déjà protégé', ground: 'river', motifs: ['light', 'palms', 'birds'], focus: 'light' },
    { at: 'quand sa mère l’avait mis dans un coffret', motifs: ['boat', 'palms', 'fish'], focus: 'boat' },
    { at: 'avant qu’il ne lui soit rendu', motifs: ['house', 'cradle', 'palms', 'folk'], focus: 'cradle' },
  ],
  'musa-1-8': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['path', 'footprints', 'staff', 'goat'], focus: 'footprints', cut: true },
    { at: 'avec Ses prodiges', motifs: ['path', 'palace', 'crowd', 'staff', 'light'], focus: 'palace' },
  ],
  'musa-1-9': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['path', 'palace', 'crowd', 'dark-clouds'], focus: 'dark-clouds' },
    { at: 'Allah les rassura', motifs: ['path', 'light', 'birds'], focus: 'light' },
    { at: 'Ils allaient lui demander', motifs: ['path', 'footprints', 'palace', 'walkers'], focus: 'walkers' },
  ],

  // ── Épisode 3 : Pharaon, les magiciens et la mer ──
  'musa-2-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'pillars', 'crowd', 'footprints'], focus: 'footprints' },
    { at: 'Nous sommes les messagers', motifs: ['light', 'palace', 'crowd', 'path'], focus: 'light' },
    { at: 'Laisse partir avec nous', motifs: ['walkers', 'path', 'palace'], focus: 'walkers' },
    { at: 'Pharaon demanda', motifs: ['throne', 'palace', 'pillars', 'crowd'], focus: 'throne' },
  ],
  'musa-2-1': [{ at: '', sky: 'day', ground: 'city', motifs: ['sun', 'clouds', 'light', 'palms', 'birds'], focus: 'sky' }],
  'musa-2-2': [
    { at: '', sky: 'day', ground: 'city', motifs: ['prison', 'palace', 'throne', 'crowd'], focus: 'prison' },
    { at: 'Moussa jeta alors son bâton', motifs: ['staff', 'palace', 'pillars', 'crowd'], focus: 'staff' },
    { at: 'il devint un serpent', motifs: ['serpent', 'palace', 'pillars', 'crowd'], focus: 'serpent' },
    { at: 'Puis sa main apparut toute blanche', motifs: ['light', 'palace', 'pillars', 'crowd'], focus: 'light' },
  ],
  'musa-2-3': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'path', 'walkers', 'footprints'], focus: 'walkers' },
    { at: 'Au jour convenu', ground: 'plain', motifs: ['rope', 'staff', 'sun', 'path', 'crowd'], focus: 'rope' },
    { at: 'Puis Moussa jeta son bâton', motifs: ['staff', 'rope', 'sun', 'crowd'], focus: 'staff' },
    { at: 'et voici qu’il happa', motifs: ['serpent', 'sun', 'light', 'crowd'], focus: 'serpent' },
  ],
  'musa-2-4': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['crowd', 'footprints', 'staff', 'sun'], focus: 'crowd' },
    { at: 'en disant', motifs: ['light', 'sun', 'crowd'], focus: 'light' },
  ],
  'musa-2-5': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['dark-clouds', 'palace', 'crowd', 'footprints'], focus: 'dark-clouds' },
    { at: 'Mais ils restèrent fermes', motifs: ['crowd', 'footprints', 'path', 'light'], focus: 'crowd' },
    { at: 'c’est vers notre Seigneur que nous retournerons', motifs: ['crowd', 'path', 'footprints', 'light'], focus: 'path' },
    { at: 'Nous espérons qu’Il nous pardonne', motifs: ['light', 'crescent', 'path', 'crowd'], focus: 'light' },
  ],
  'musa-2-6': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['path', 'footprints', 'stars', 'walkers'], focus: 'walkers' },
    { at: 'Pharaon rassembla ses troupes', ground: 'city', motifs: ['palace', 'crowd', 'path', 'stars'], focus: 'crowd' },
    { at: 'et au lever du soleil', sky: 'dawn', ground: 'desert', motifs: ['path', 'footprints', 'sun', 'crowd', 'walkers'], focus: 'sun' },
  ],
  'musa-2-7': [
    { at: '', sky: 'dawn', ground: 'sea', motifs: ['walkers', 'path', 'sun', 'gulls'], focus: 'horizon' },
    { at: 'Moussa répondit', motifs: ['light', 'path', 'footprints', 'walkers', 'gulls'], focus: 'light' },
  ],
  'musa-2-8': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['staff', 'light', 'path', 'walkers', 'gulls'], focus: 'staff' },
    { at: 'Elle se fendit', motifs: ['sea-split', 'path', 'staff', 'gulls'], focus: 'sea-split' },
    { at: 'Allah sauva Moussa', motifs: ['sea-split', 'path', 'walkers', 'sun'], focus: 'walkers' },
    { at: 'et noya les autres', sky: 'storm', motifs: ['flood', 'dark-clouds', 'wind'], focus: 'flood' },
  ],
  'musa-2-9': [
    { at: '', sky: 'dusk', ground: 'sea', motifs: ['light', 'path', 'footprints', 'gulls'], focus: 'light' },
    { at: 'Et ton Seigneur est le Tout-Puissant', motifs: ['sun', 'clouds', 'light', 'gulls'], focus: 'sky' },
    { at: 'Comme Moussa, gardons confiance', motifs: ['walkers', 'path', 'birds', 'light'], focus: 'birds' },
  ],

  // ── Épisode 4 : la fin de Pharaon ──
  'musa-3-0': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['palace', 'pillars', 'gold', 'coins', 'crowd'], focus: 'gold' },
    { at: 'Mais ils s’en servaient', motifs: ['palace', 'gold', 'path', 'walkers'], focus: 'walkers' },
  ],
  'musa-3-1': [
    { at: '', sky: 'night', ground: 'city', motifs: ['palace', 'gold', 'crescent', 'stars', 'bats'], focus: 'sky' },
    { at: 'Lui demandant d’anéantir leurs biens', motifs: ['palace', 'gold', 'dark-clouds'], focus: 'gold' },
    { at: 'et d’endurcir leurs cœurs', motifs: ['palace', 'rock', 'dark-clouds'], focus: 'rock' },
  ],
  'musa-3-2': [{ at: '', sky: 'night', ground: 'city', motifs: ['light', 'stars', 'path', 'footprints'], focus: 'light' }],
  'musa-3-3': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['sea-split', 'path', 'walkers', 'sun', 'gulls'], focus: 'walkers', cut: true },
    { at: 'Pharaon et ses armées', motifs: ['sea-split', 'path', 'crowd', 'dark-clouds'], focus: 'crowd' },
  ],
  'musa-3-4': [{ at: '', sky: 'storm', ground: 'sea', motifs: ['flood', 'dark-clouds', 'wind'], focus: 'flood' }],
  'musa-3-5': [{ at: '', sky: 'storm', ground: 'sea', motifs: ['dark-clouds', 'lightning', 'flood'], focus: 'lightning' }],
  'musa-3-6': [
    { at: '', sky: 'dawn', ground: 'sea', motifs: ['sun', 'clouds', 'rock', 'gulls'], focus: 'rock' },
    { at: 'pour qu’il soit un signe', motifs: ['light', 'rock', 'path', 'footprints'], focus: 'light' },
    { at: 'Pourtant, beaucoup de gens restent inattentifs', motifs: ['folk', 'path', 'sun', 'rock'], focus: 'folk' },
  ],
  'musa-3-7': [
    { at: '', sky: 'dusk', ground: 'sea', motifs: ['withered', 'dark-clouds', 'path', 'sun'], focus: 'withered' },
    { at: 'C’est pendant la vie', motifs: ['walkers', 'path', 'light', 'crescent'], focus: 'light' },
  ],

  // ── Épisode 5 : le veau du Samiri ──
  'musa-4-0': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['path', 'footprints', 'rock', 'goat'], focus: 'path' },
    { at: 'Allah lui en demanda la raison', motifs: ['light', 'rock', 'path', 'birds'], focus: 'light' },
    { at: 'Ils suivent mes traces', motifs: ['walkers', 'footprints', 'path', 'rock'], focus: 'walkers' },
  ],
  'musa-4-1': [{ at: '', sky: 'day', ground: 'mountains', motifs: ['clouds', 'rock', 'tablets', 'tent', 'crowd'], focus: 'crowd' }],
  'musa-4-2': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['path', 'footprints', 'tablets', 'rock'], focus: 'footprints' },
    { at: 'Ô mon peuple', motifs: ['tent', 'crowd', 'tablets', 'path'], focus: 'crowd' },
    { at: 'Pourquoi avez-vous manqué', motifs: ['tent', 'crowd', 'path', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'musa-4-3': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['tent', 'crowd', 'gold', 'dark-clouds'], focus: 'gold' },
    { at: 'et nous les avons jetées', motifs: ['tent', 'crowd', 'gold', 'fire'], focus: 'fire' },
    { at: 'Et le Samiri en fit sortir', motifs: ['tent', 'crowd', 'gold', 'flames'], focus: 'flames' },
  ],
  'musa-4-4': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['tent', 'fire', 'gold', 'crowd'], focus: 'crowd' },
    { at: 'Ne voyaient-ils pas', motifs: ['gold', 'tent', 'stars', 'crowd'], focus: 'gold' },
    { at: 'ne pouvait ni leur nuire', motifs: ['gold', 'stars', 'bats'], focus: 'stars' },
  ],
  'musa-4-5': [{ at: '', sky: 'night', ground: 'desert', motifs: ['tent', 'lamp', 'folk', 'stars'], focus: 'lamp' }],
  'musa-4-6': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['fire', 'tent', 'crowd', 'crescent'], focus: 'crowd' },
    { at: 'À son retour, Moussa', motifs: ['footprints', 'path', 'tablets', 'tent'], focus: 'footprints' },
    { at: 'Haroun craignait qu’on lui reproche', motifs: ['lamp', 'tent', 'folk', 'crescent'], focus: 'lamp' },
    { at: 'd’avoir divisé les Enfants d’Israël', motifs: ['crowd', 'tent', 'path', 'crescent'], focus: 'crowd' },
  ],
  'musa-4-7': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['footprints', 'tent', 'folk', 'crescent'], focus: 'folk' },
    { at: 'Moussa lui dit de s’en aller', motifs: ['path', 'footprints', 'tent'], focus: 'path' },
    { at: 'et annonça que l’idole serait brûlée', motifs: ['flames', 'wind', 'path'], focus: 'flames' },
    { at: 'puis dispersée dans les flots', ground: 'sea', motifs: ['wind', 'flood'], focus: 'flood' },
  ],
  'musa-4-8': [{ at: '', sky: 'dawn', ground: 'desert', motifs: ['wind', 'light', 'sun', 'birds'], focus: 'sun' }],
  'musa-4-9': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['stones', 'sun', 'light', 'wind'], focus: 'stones' },
    { at: 'Seul Allah mérite', ground: 'mountains', motifs: ['light', 'clouds', 'rock', 'birds'], focus: 'light' },
  ],

  // ── Épisode 6 : la vache ──
  'musa-5-0': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['tent', 'palms', 'path', 'folk'], focus: 'folk' },
    { at: 'Un jour, il leur transmit un ordre', motifs: ['tent', 'light', 'crowd'], focus: 'light' },
  ],
  'musa-5-1': [{ at: '', sky: 'day', ground: 'plain', motifs: ['cows', 'tent', 'sun', 'crowd'], focus: 'cows' }],
  'musa-5-2': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['tent', 'cows', 'folk', 'footprints'], focus: 'folk' },
    { at: 'Moussa répondit', motifs: ['cows', 'wheat', 'sun'], focus: 'cows' },
    { at: 'Faites donc ce qu’on vous commande', motifs: ['cows', 'light', 'wheat', 'crowd'], focus: 'light' },
  ],
  'musa-5-3': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['tent', 'cows', 'folk'], focus: 'folk' },
    { at: 'C’est une vache jaune', motifs: ['cows', 'sun', 'light', 'wheat', 'butterflies'], focus: 'cows' },
  ],
  'musa-5-4': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['cows', 'tent', 'wheat', 'folk'], focus: 'folk' },
    { at: 'Moussa précisa', motifs: ['cows', 'wheat', 'jar'], focus: 'jar' },
    { at: 'elle est sans défaut', motifs: ['cows', 'light', 'wheat', 'birds'], focus: 'light' },
  ],
  'musa-5-5': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['light', 'cows', 'tent', 'crowd'], focus: 'light' },
    { at: 'mais il s’en fallut de peu', motifs: ['folk', 'path', 'footprints', 'tent', 'fire'], focus: 'footprints' },
  ],
  'musa-5-6': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'path', 'footprints', 'bats'], focus: 'footprints' },
    { at: 'chacun cherchait à rejeter la faute', motifs: ['wall', 'crowd', 'path'], focus: 'crowd' },
    { at: 'Mais Allah allait dévoiler', motifs: ['light', 'house', 'lamp', 'crowd'], focus: 'light' },
  ],
  'musa-5-7': [{ at: '', sky: 'night', ground: 'city', motifs: ['light', 'stars', 'cows', 'house', 'crowd'], focus: 'light' }],
  'musa-5-8': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['path', 'cows', 'light', 'birds'], focus: 'path' },
    { at: 'Et Allah, qui fait revivre les morts', motifs: ['wheat', 'sun', 'light', 'palms', 'butterflies'], focus: 'sun' },
  ],

  // ── Épisode 7 : Moussa et le serviteur savant ──
  'musa-6-0': [
    { at: '', sky: 'dawn', ground: 'sea', motifs: ['path', 'footprints', 'gulls'], focus: 'footprints' },
    { at: 'avant d’atteindre le confluent des deux mers', motifs: ['sun', 'path', 'footprints', 'gulls'], focus: 'horizon' },
    { at: 'même s’il faut marcher de longues années', sky: 'day', motifs: ['clouds', 'path', 'footprints', 'sun'], focus: 'path' },
  ],
  'musa-6-1': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['rock', 'stones', 'path', 'gulls'], focus: 'rock' },
    { at: 'ils oublièrent leur poisson', motifs: ['basket', 'rock', 'stones', 'fish'], focus: 'basket' },
    { at: 'Quand le compagnon s’en souvint', motifs: ['rock', 'light', 'path', 'fish'], focus: 'light' },
    { at: 'Et ils revinrent sur leurs pas', motifs: ['footprints', 'path', 'stones', 'gulls'], focus: 'footprints' },
  ],
  'musa-6-2': [{ at: '', sky: 'day', ground: 'sea', motifs: ['light', 'rock', 'stones', 'book', 'gulls'], focus: 'light' }],
  'musa-6-3': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['path', 'footprints', 'book', 'gulls'], focus: 'book' },
    { at: 'Tu ne pourras pas être patient', motifs: ['path', 'rock', 'light'], focus: 'path' },
    { at: 'Si Allah le veut', motifs: ['footprints', 'path', 'light', 'sun'], focus: 'footprints' },
  ],
  'musa-6-4': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['boat', 'clouds', 'path', 'gulls'], focus: 'boat' },
    { at: 'et le serviteur y fit une brèche', motifs: ['boat', 'planks', 'clouds', 'gulls'], focus: 'planks' },
    { at: 'Veux-tu noyer ses passagers', motifs: ['boat', 'folk', 'wind', 'clouds'], focus: 'folk' },
    { at: 'Ne t’avais-je pas dit', motifs: ['boat', 'clouds', 'sun', 'gulls'], focus: 'boat' },
  ],
  'musa-6-5': [
    { at: '', sky: 'dusk', ground: 'sea', motifs: ['path', 'footprints', 'clouds', 'gulls'], focus: 'path' },
    { at: 'Moussa protesta encore', ground: 'plain', motifs: ['path', 'tree', 'footprints', 'birds'], focus: 'tree' },
    { at: 'Et le serviteur lui rappela', motifs: ['tree', 'path', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'musa-6-6': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'path', 'footprints', 'crowd'], focus: 'crowd' },
    { at: 'Pourtant, le serviteur y redressa un mur', motifs: ['wall', 'ruins', 'house', 'dog'], focus: 'wall' },
    { at: 'Tu aurais pu demander un salaire', motifs: ['coins', 'wall', 'path'], focus: 'coins' },
    { at: 'C’était l’heure de se séparer', motifs: ['path', 'footprints', 'wall', 'birds'], focus: 'path' },
  ],
  'musa-6-7': [{ at: '', sky: 'day', ground: 'sea', motifs: ['boat', 'path', 'folk', 'gulls', 'throne'], focus: 'folk' }],
  'musa-6-8': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['house', 'path', 'light', 'folk'], focus: 'folk' },
    { at: 'nous avons craint qu’il ne les entraîne', motifs: ['house', 'dark-clouds', 'path'], focus: 'dark-clouds' },
    { at: 'Nous avons voulu que leur Seigneur', motifs: ['light', 'cradle', 'house', 'birds'], focus: 'cradle' },
  ],
  'musa-6-9': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['wall', 'gold', 'coins', 'light', 'folk'], focus: 'gold' },
    { at: 'Ton Seigneur a voulu qu’ils grandissent', motifs: ['wall', 'coins', 'light', 'tree', 'birds'], focus: 'tree' },
    { at: 'Je ne l’ai pas fait de mon propre chef', motifs: ['path', 'footprints', 'light', 'birds'], focus: 'light' },
  ],

  // ───────────── DAOUD ─────────────
  // ── Épisode 1 : la victoire sur Djalout ──
  'dawud-0-0': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['tent', 'path', 'crowd', 'footprints'], focus: 'crowd' },
    { at: 'se trouvait parmi les croyants', motifs: ['light', 'tent', 'crowd', 'footprints'], focus: 'light' },
  ],
  'dawud-0-1': [{ at: '', sky: 'day', ground: 'plain', motifs: ['sun', 'light', 'path', 'crowd'], focus: 'sun' }],
  'dawud-0-2': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'throne', 'path', 'crowd'], focus: 'throne' },
    { at: 'et lui enseigna ce qu’Il voulut', motifs: ['light', 'palace', 'pillars', 'birds'], focus: 'light' },
  ],
  'dawud-0-3': [{ at: '', sky: 'dawn', ground: 'city', motifs: ['book', 'light', 'palace', 'birds'], focus: 'book' }],
  'dawud-0-4': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['withered', 'dark-clouds', 'light', 'crowd'], focus: 'withered' },
    { at: 'Mais Allah est plein de grâce', motifs: ['light', 'clouds', 'wheat', 'sun', 'sheep'], focus: 'wheat' },
  ],
  'dawud-0-5': [
    { at: '', sky: 'dusk', ground: 'mountains', motifs: ['sun', 'palace', 'light', 'birds'], focus: 'palace' },
    { at: 'La suite nous fera découvrir', motifs: ['birds', 'sun', 'path', 'folk'], focus: 'birds' },
  ],

  // ── Épisode 2 : le fer amolli ──
  'dawud-1-0': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['sun', 'clouds', 'palace', 'birds'], focus: 'palace' },
    { at: 'qui glorifiait beaucoup son Seigneur', motifs: ['light', 'rock', 'sun', 'birds'], focus: 'light' },
  ],
  'dawud-1-1': [{ at: '', sky: 'dawn', ground: 'mountains', motifs: ['birds', 'rock', 'light'], focus: 'birds' }],
  'dawud-1-2': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['light', 'rock', 'clouds', 'goat'], focus: 'light' },
    { at: 'les montagnes et les oiseaux répétaient', motifs: ['birds', 'rock', 'clouds', 'sun'], focus: 'birds' },
  ],
  'dawud-1-3': [{ at: '', sky: 'day', ground: 'city', motifs: ['flames', 'house', 'light', 'rock'], focus: 'flames' }],
  'dawud-1-4': [{ at: '', sky: 'day', ground: 'city', motifs: ['shirt', 'flames', 'house'], focus: 'shirt' }],
  'dawud-1-5': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['shirt', 'house', 'fire'], focus: 'shirt' },
    { at: 'Et Allah voit tout ce que nous faisons', motifs: ['light', 'sun', 'house', 'birds'], focus: 'light' },
    { at: 'et soignons notre travail', motifs: ['lamp', 'shirt', 'house', 'workers'], focus: 'workers' },
  ],

  // ── Épisode 3 : le roi juste et repentant ──
  'dawud-2-0': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['rock', 'sun', 'birds'], focus: 'rock' },
    { at: 'qui revenait sans cesse vers Lui', motifs: ['path', 'footprints', 'light', 'sun'], focus: 'footprints' },
  ],
  'dawud-2-1': [{ at: '', sky: 'dawn', ground: 'mountains', motifs: ['birds', 'sun', 'rock', 'goat'], focus: 'birds' }],
  'dawud-2-2': [
    { at: '', sky: 'day', ground: 'city', motifs: ['birds', 'palace', 'sun', 'crowd'], focus: 'birds' },
    { at: 'Allah renforça son royaume', motifs: ['palace', 'pillars', 'wall', 'crowd'], focus: 'palace' },
    { at: 'et l’art de bien juger', motifs: ['throne', 'scales', 'light', 'crowd'], focus: 'scales' },
  ],
  'dawud-2-3': [
    { at: '', sky: 'night', ground: 'city', motifs: ['wall', 'palace', 'stars', 'folk'], focus: 'folk' },
    { at: 'Daoud fut effrayé', motifs: ['lamp', 'palace', 'stars', 'bats'], focus: 'lamp' },
    { at: 'Juge entre nous avec justice', motifs: ['scales', 'lamp', 'wall', 'folk'], focus: 'scales' },
  ],
  'dawud-2-4': [
    { at: '', sky: 'night', ground: 'city', motifs: ['sheep', 'goat', 'lamp', 'wall', 'folk'], focus: 'sheep' },
    { at: 'Il m’a dit : confie-la-moi', motifs: ['lamp', 'sheep', 'stars', 'folk'], focus: 'lamp' },
  ],
  'dawud-2-5': [{ at: '', sky: 'night', ground: 'city', motifs: ['scales', 'sheep', 'wall', 'light', 'folk'], focus: 'scales' }],
  'dawud-2-6': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['light', 'lamp', 'wall', 'birds'], focus: 'light' },
    { at: 'et un beau retour', motifs: ['path', 'light', 'palace', 'folk'], focus: 'path' },
  ],
  'dawud-2-7': [{ at: '', sky: 'day', ground: 'city', motifs: ['throne', 'scales', 'light', 'palace', 'crowd'], focus: 'throne' }],
  'dawud-2-8': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['path', 'footprints', 'light', 'folk'], focus: 'footprints' },
    { at: 'Juger avec équité', motifs: ['scales', 'throne', 'light', 'crowd'], focus: 'scales' },
    { at: 'voilà ce qu’Allah lui demandait', ground: 'mountains', motifs: ['birds', 'sun', 'light'], focus: 'birds' },
  ],

  // ── Épisode 4 : le jugement du champ ──
  'dawud-3-0': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['sheep', 'goat', 'path', 'crescent'], focus: 'sheep' },
    { at: 'dans un champ cultivé', motifs: ['wheat', 'sheep', 'crescent', 'bats'], focus: 'wheat' },
  ],
  'dawud-3-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['wheat', 'palace', 'path', 'folk'], focus: 'palace' },
    { at: 'et Allah était témoin', motifs: ['scales', 'light', 'palace', 'crowd'], focus: 'scales' },
  ],
  'dawud-3-2': [{ at: '', sky: 'day', ground: 'city', motifs: ['scroll', 'light', 'birds', 'crowd'], focus: 'scroll' }],
  'dawud-3-3': [{ at: '', sky: 'dawn', ground: 'mountains', motifs: ['shirt', 'flames', 'light', 'birds'], focus: 'shirt' }],
  'dawud-3-4': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['wheat', 'book', 'light', 'butterflies'], focus: 'book' },
    { at: 'Et tous ces bienfaits', motifs: ['sun', 'wheat', 'palms', 'light', 'birds'], focus: 'sun' },
  ],

  // ───────────── SOULEYMANE ─────────────
  // ── Épisode 1 : la vallée des fourmis ──
  'sulayman-0-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'book', 'light', 'folk'], focus: 'book' },
    { at: 'Ils dirent : « Louange à Allah', motifs: ['sun', 'light', 'palace', 'birds'], focus: 'sun' },
  ],
  'sulayman-0-1': [{ at: '', sky: 'day', ground: 'city', motifs: ['throne', 'birds', 'palace', 'light', 'crowd'], focus: 'birds' }],
  'sulayman-0-2': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['palace', 'path', 'crowd', 'footprints'], focus: 'crowd' },
    { at: 'furent rassemblées pour lui', motifs: ['birds', 'path', 'walkers'], focus: 'birds' },
  ],
  'sulayman-0-3': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['path', 'walkers', 'rock'], focus: 'walkers' },
    { at: 'une fourmi dit', motifs: ['ants', 'cave-mouth', 'rock'], focus: 'ants' },
    { at: 'pour que Souleymane et ses armées', motifs: ['walkers', 'footprints', 'ants'], focus: 'footprints' },
  ],
  'sulayman-0-4': [{ at: '', sky: 'day', ground: 'valley', motifs: ['ants', 'sun', 'path', 'birds'], focus: 'ants' }],
  'sulayman-0-5': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['ants', 'palace', 'path', 'birds'], focus: 'ants' },
    { at: 'Au lieu de s’enorgueillir', motifs: ['light', 'ants', 'lamp'], focus: 'light' },
  ],

  // ── Épisode 2 : la huppe et la reine de Saba ──
  'sulayman-1-0': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['birds', 'tree', 'sun'], focus: 'birds' },
    { at: 'oiseaux et ne vit pas la huppe', motifs: ['tree', 'rock'], focus: 'tree' },
    { at: 'Elle revint peu après', motifs: ['hoopoe', 'tree', 'light'], focus: 'hoopoe' },
    { at: 'J’ai appris ce que tu ne sais pas', motifs: ['hoopoe', 'tree', 'light', 'birds'], focus: 'light' },
  ],
  'sulayman-1-1': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['palace', 'throne', 'crowd'], focus: 'crowd', cut: true },
    { at: 'Elle a été comblée de tout', motifs: ['palace', 'throne', 'gold'], focus: 'gold' },
    { at: 'Mais elle et son peuple se prosternent devant le soleil', motifs: ['sun', 'palace', 'crowd', 'light'], focus: 'sun' },
  ],
  'sulayman-1-2': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['hoopoe', 'tree', 'sun', 'birds'], focus: 'hoopoe' },
    { at: 'Pars avec ma lettre', motifs: ['scroll', 'hoopoe', 'sun', 'birds'], focus: 'scroll' },
  ],
  'sulayman-1-3': [
    { at: '', sky: 'day', ground: 'city', motifs: ['throne', 'palace', 'scroll', 'crowd'], focus: 'crowd' },
    { at: 'qu’une noble lettre lui avait été lancée', motifs: ['scroll', 'light', 'palace', 'crowd'], focus: 'scroll' },
  ],
  'sulayman-1-4': [
    { at: '', sky: 'day', ground: 'city', motifs: ['scroll', 'palace'], focus: 'scroll' },
    { at: 'La reine consulta ses notables', motifs: ['crowd', 'throne', 'palace'], focus: 'crowd' },
    { at: 'puis envoya un présent', motifs: ['walkers', 'gold', 'path'], focus: 'gold' },
    { at: 'Ce qu’Allah m’a donné vaut mieux', motifs: ['palace', 'gold', 'light', 'birds'], focus: 'palace' },
  ],
  'sulayman-1-5': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'light', 'path', 'crowd'], focus: 'palace' },
    { at: 'Un djinn proposa', motifs: ['wind', 'light', 'palace'], focus: 'wind' },
    { at: 'avant qu’il ne se lève de sa place', motifs: ['throne', 'palace', 'light'], focus: 'throne' },
  ],
  'sulayman-1-6': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['throne', 'palace', 'crowd'], focus: 'throne' },
    { at: 'Quand la reine arriva', motifs: ['path', 'walkers', 'palace'], focus: 'walkers' },
    { at: 'Ton trône est-il ainsi', motifs: ['throne', 'lamp', 'palace', 'folk'], focus: 'throne' },
  ],
  'sulayman-1-7': [{ at: '', sky: 'dawn', ground: 'city', motifs: ['palace', 'pillars', 'light', 'spring', 'folk'], focus: 'spring' }],
  'sulayman-1-8': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['throne', 'palace', 'crowd'], focus: 'throne' },
    { at: 'cette grâce de mon Seigneur', motifs: ['light', 'throne', 'birds'], focus: 'light' },
    { at: 'Plus Allah nous donne', ground: 'garden', motifs: ['palms', 'dates', 'light', 'butterflies'], focus: 'dates' },
  ],

  // ── Épisode 3 : le vent, les djinns et la canne ──
  'sulayman-2-0': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['wind', 'clouds', 'birds'], focus: 'wind' },
    { at: 'sa course du matin valait un mois de marche', motifs: ['sun', 'wind', 'path', 'birds'], focus: 'path' },
    { at: 'et celle du soir, un mois aussi', sky: 'dusk', motifs: ['wind', 'path', 'sun'], focus: 'wind' },
  ],
  'sulayman-2-1': [{ at: '', sky: 'day', ground: 'valley', motifs: ['spring', 'sun', 'rock', 'path', 'goat', 'birds'], focus: 'spring' }],
  'sulayman-2-2': [
    { at: '', sky: 'day', ground: 'city', motifs: ['path', 'planks', 'stones', 'birds'], focus: 'planks' },
    { at: 'et bâtissaient ce qu’il voulait', motifs: ['palace', 'pillars', 'planks', 'birds'], focus: 'palace' },
  ],
  'sulayman-2-3': [{ at: '', sky: 'day', ground: 'city', motifs: ['tower', 'palace', 'jar', 'light', 'birds'], focus: 'jar' }],
  'sulayman-2-4': [{ at: '', sky: 'dusk', ground: 'city', motifs: ['throne', 'staff', 'palace'], focus: 'staff' }],
  'sulayman-2-5': [
    { at: '', sky: 'night', ground: 'city', motifs: ['palace', 'staff', 'stars', 'crescent', 'bats'], focus: 'sky' },
    { at: 'Et ce qu’Il nous donne', motifs: ['light', 'stars', 'palms', 'dates', 'folk'], focus: 'dates' },
  ],
};
