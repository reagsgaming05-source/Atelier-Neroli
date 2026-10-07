import type { Storyboard } from '../types';

/*
 * Pictures of the stories of Moussa, Daoud and Souleymane.
 * Each scene follows its narration picture by picture; objects stay on
 * screen until the text says they go, and time / weather evolve in order.
 */
export const BOARD_4: Storyboard = {
  // ───────────── MOUSSA ─────────────
  // ── Épisode 1 : l'enfant du fleuve et Madyane ──
  'musa-0-0': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['palace', 'pillars', 'wall'], focus: 'palace' },
    { at: 'Il opprimait les Enfants d’Israël', motifs: ['wall', 'house', 'dark-clouds'], focus: 'house' },
    { at: 'Mais Allah voulait favoriser', motifs: ['house', 'light', 'palace'], focus: 'light' },
  ],
  'musa-0-1': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'cradle', 'light'], focus: 'cradle' },
    { at: 'voici ce qu’Allah inspira', ground: 'river', motifs: ['boat', 'palms', 'light'], focus: 'boat' },
  ],
  'musa-0-2': [
    { at: '', sky: 'day', ground: 'river', motifs: ['boat', 'palace', 'palms'], focus: 'boat' },
    { at: 'La femme de Pharaon dit', motifs: ['palace', 'cradle', 'palms', 'light'], focus: 'cradle' },
  ],
  'musa-0-3': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'cradle'], focus: 'cradle' },
    { at: 'Elle dit à la sœur de Moussa', motifs: ['house', 'path', 'footprints'], focus: 'footprints' },
    { at: 'L’enfant refusait toutes les nourrices', motifs: ['palace', 'cradle', 'path'], focus: 'cradle' },
  ],
  'musa-0-4': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'cradle', 'light'], focus: 'cradle' },
    { at: 'Devenu adulte', sky: 'day', motifs: ['house', 'book', 'light'], focus: 'book' },
  ],
  'musa-0-5': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['wall', 'tower', 'house', 'path'], focus: 'path' },
    { at: 'Appelé au secours', motifs: ['wall', 'footprints', 'dark-clouds'], focus: 'footprints' },
  ],
  'musa-0-6': [
    { at: '', sky: 'night', ground: 'city', motifs: ['wall', 'tower', 'dark-clouds', 'crescent'], focus: 'dark-clouds' },
    { at: 'et se tourna aussitôt vers son Seigneur', motifs: ['wall', 'crescent', 'stars', 'light'], focus: 'light' },
  ],
  'musa-0-7': [
    { at: '', sky: 'night', ground: 'city', motifs: ['wall', 'path', 'footprints', 'stars'], focus: 'footprints' },
    { at: 'Moussa quitta la ville', ground: 'desert', motifs: ['path', 'footprints', 'stars', 'wall'], focus: 'path' },
    { at: 'Et il prit la route de Madyane', sky: 'dawn', motifs: ['path', 'footprints', 'sun'], focus: 'horizon' },
  ],
  'musa-0-8': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['well', 'path', 'tree'], focus: 'well' },
    { at: 'attendaient à l’écart', motifs: ['sheep', 'well', 'tree'], focus: 'sheep' },
    { at: 'car leur père était très âgé', motifs: ['tree', 'well', 'sheep', 'tent'], focus: 'tree' },
  ],
  'musa-0-9': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['tent', 'sheep', 'tree'], focus: 'tent' },
    { at: 'Il lui proposa d’épouser', motifs: ['tent', 'sheep', 'path'], focus: 'path' },
    { at: 'Moussa accepta', motifs: ['tent', 'sheep', 'light'], focus: 'light' },
  ],

  // ── Épisode 2 : l'appel dans la vallée de Touwa ──
  'musa-1-0': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['path', 'footprints', 'stars'], focus: 'path' },
    { at: 'Moussa aperçut un feu', motifs: ['fire', 'stars', 'path'], focus: 'fire' },
    { at: 'Je vous en rapporterai peut-être un tison', motifs: ['tent', 'fire', 'stars'], focus: 'tent' },
  ],
  'musa-1-1': [
    { at: '', sky: 'night', ground: 'valley', motifs: ['fire', 'path', 'footprints'], focus: 'fire' },
    { at: 'Ô Moussa, Je suis ton Seigneur', motifs: ['light', 'fire', 'stars'], focus: 'light' },
    { at: 'Enlève tes sandales', motifs: ['footprints', 'path', 'fire', 'light'], focus: 'footprints' },
    { at: 'Je t’ai choisi', motifs: ['light', 'stars', 'fire'], focus: 'light' },
  ],
  'musa-1-2': [{ at: '', sky: 'night', ground: 'valley', motifs: ['light', 'stars', 'rock'], focus: 'sky' }],
  'musa-1-3': [
    { at: '', sky: 'night', ground: 'valley', motifs: ['staff', 'light', 'stars'], focus: 'staff' },
    { at: 'Il le jeta, et voici', motifs: ['serpent', 'light', 'stars'], focus: 'serpent' },
    { at: 'Saisis-le sans crainte', motifs: ['serpent', 'light', 'rock'], focus: 'light' },
    { at: 'Nous allons lui rendre son premier état', motifs: ['staff', 'light', 'stars'], focus: 'staff' },
  ],
  'musa-1-4': [
    { at: '', sky: 'night', ground: 'valley', motifs: ['light', 'staff', 'stars'], focus: 'light' },
    { at: 'Puis Allah lui ordonna', sky: 'dawn', ground: 'mountains', motifs: ['path', 'staff', 'sun'], focus: 'path' },
    { at: 'car il avait dépassé toute limite', motifs: ['path', 'palace', 'dark-clouds'], focus: 'palace' },
  ],
  'musa-1-5': [{ at: '', sky: 'dawn', ground: 'mountains', motifs: ['light', 'lamp', 'path'], focus: 'lamp' }],
  'musa-1-6': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['path', 'light', 'rock'], focus: 'path' },
    { at: 'dénoue le nœud de sa langue', motifs: ['rope', 'light', 'rock'], focus: 'rope' },
    { at: 'et lui donne pour soutien', motifs: ['path', 'footprints', 'light'], focus: 'footprints' },
    { at: 'afin qu’ensemble ils Le glorifient', sky: 'day', motifs: ['sun', 'light', 'path'], focus: 'sky' },
  ],
  'musa-1-7': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['light', 'path'], focus: 'light' },
    { at: 'Il lui rappela qu’Il l’avait déjà protégé', ground: 'river', motifs: ['light', 'palms'], focus: 'light' },
    { at: 'quand sa mère l’avait mis dans un coffret', motifs: ['boat', 'palms'], focus: 'boat' },
    { at: 'avant qu’il ne lui soit rendu', motifs: ['house', 'cradle', 'palms'], focus: 'cradle' },
  ],
  'musa-1-8': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['path', 'footprints', 'staff'], focus: 'footprints', cut: true },
    { at: 'avec Ses prodiges', motifs: ['path', 'palace', 'staff', 'light'], focus: 'palace' },
  ],
  'musa-1-9': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['path', 'palace', 'dark-clouds'], focus: 'dark-clouds' },
    { at: 'Allah les rassura', motifs: ['path', 'light'], focus: 'light' },
    { at: 'Ils allaient lui demander', motifs: ['path', 'footprints', 'palace'], focus: 'palace' },
  ],

  // ── Épisode 3 : Pharaon, les magiciens et la mer ──
  'musa-2-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'pillars', 'path', 'footprints'], focus: 'footprints' },
    { at: 'Nous sommes les messagers', motifs: ['light', 'palace', 'path'], focus: 'light' },
    { at: 'Pharaon demanda', motifs: ['throne', 'palace', 'pillars'], focus: 'throne' },
  ],
  'musa-2-1': [{ at: '', sky: 'day', ground: 'city', motifs: ['sun', 'clouds', 'light', 'palms'], focus: 'sky' }],
  'musa-2-2': [
    { at: '', sky: 'day', ground: 'city', motifs: ['prison', 'palace', 'throne'], focus: 'prison' },
    { at: 'Moussa jeta alors son bâton', motifs: ['staff', 'palace', 'pillars'], focus: 'staff' },
    { at: 'il devint un serpent', motifs: ['serpent', 'palace', 'pillars'], focus: 'serpent' },
    { at: 'Puis sa main apparut toute blanche', motifs: ['light', 'palace', 'pillars'], focus: 'light' },
  ],
  'musa-2-3': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'path', 'footprints'], focus: 'footprints' },
    { at: 'Au jour convenu', ground: 'plain', motifs: ['rope', 'staff', 'sun', 'path'], focus: 'rope' },
    { at: 'Puis Moussa jeta son bâton', motifs: ['staff', 'rope', 'sun'], focus: 'staff' },
    { at: 'et voici qu’il happa', motifs: ['serpent', 'sun', 'light'], focus: 'serpent' },
  ],
  'musa-2-4': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['footprints', 'staff', 'sun'], focus: 'footprints' },
    { at: 'en disant', motifs: ['light', 'sun'], focus: 'light' },
  ],
  'musa-2-5': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['dark-clouds', 'palace', 'footprints'], focus: 'dark-clouds' },
    { at: 'Mais ils restèrent fermes', motifs: ['footprints', 'path', 'light'], focus: 'footprints' },
    { at: 'Nous espérons qu’Il nous pardonne', motifs: ['light', 'crescent', 'path'], focus: 'light' },
  ],
  'musa-2-6': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['path', 'footprints', 'stars', 'crescent'], focus: 'path' },
    { at: 'Pharaon rassembla ses troupes', ground: 'city', motifs: ['palace', 'path', 'footprints', 'stars'], focus: 'palace' },
    { at: 'et au lever du soleil', sky: 'dawn', ground: 'desert', motifs: ['path', 'footprints', 'sun'], focus: 'sun' },
  ],
  'musa-2-7': [
    { at: '', sky: 'dawn', ground: 'sea', motifs: ['footprints', 'path', 'sun'], focus: 'horizon' },
    { at: 'Moussa répondit', motifs: ['light', 'path', 'footprints'], focus: 'light' },
  ],
  'musa-2-8': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['staff', 'light', 'path'], focus: 'staff' },
    { at: 'Elle se fendit', motifs: ['sea-split', 'path', 'staff'], focus: 'sea-split' },
    { at: 'Allah sauva Moussa', motifs: ['sea-split', 'path', 'footprints', 'sun'], focus: 'footprints' },
    { at: 'et noya les autres', sky: 'storm', motifs: ['flood', 'dark-clouds'], focus: 'flood' },
  ],
  'musa-2-9': [
    { at: '', sky: 'dusk', ground: 'sea', motifs: ['light', 'path', 'footprints'], focus: 'light' },
    { at: 'Et ton Seigneur est le Tout-Puissant', motifs: ['sun', 'clouds', 'light'], focus: 'sky' },
    { at: 'Comme Moussa, gardons confiance', motifs: ['path', 'footprints', 'birds', 'light'], focus: 'birds' },
  ],

  // ── Épisode 4 : la fin de Pharaon ──
  'musa-3-0': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['palace', 'pillars', 'gold', 'coins'], focus: 'gold' },
    { at: 'Mais ils s’en servaient', motifs: ['palace', 'gold', 'path', 'footprints'], focus: 'footprints' },
  ],
  'musa-3-1': [
    { at: '', sky: 'night', ground: 'city', motifs: ['palace', 'gold', 'crescent', 'stars'], focus: 'sky' },
    { at: 'Lui demandant d’anéantir leurs biens', motifs: ['palace', 'gold', 'dark-clouds'], focus: 'gold' },
    { at: 'et d’endurcir leurs cœurs', motifs: ['palace', 'rock', 'dark-clouds'], focus: 'rock' },
  ],
  'musa-3-2': [{ at: '', sky: 'night', ground: 'city', motifs: ['light', 'stars', 'path', 'footprints'], focus: 'light' }],
  'musa-3-3': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['sea-split', 'path', 'footprints', 'sun'], focus: 'path', cut: true },
    { at: 'Pharaon et ses armées', motifs: ['sea-split', 'path', 'footprints', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'musa-3-4': [{ at: '', sky: 'storm', ground: 'sea', motifs: ['flood', 'dark-clouds', 'wind'], focus: 'flood' }],
  'musa-3-5': [{ at: '', sky: 'storm', ground: 'sea', motifs: ['dark-clouds', 'lightning', 'flood'], focus: 'lightning' }],
  'musa-3-6': [
    { at: '', sky: 'dawn', ground: 'sea', motifs: ['sun', 'clouds', 'light', 'rock'], focus: 'rock' },
    { at: 'Pourtant, beaucoup de gens restent inattentifs', motifs: ['sun', 'path', 'footprints', 'rock'], focus: 'footprints' },
  ],
  'musa-3-7': [
    { at: '', sky: 'dusk', ground: 'sea', motifs: ['withered', 'dark-clouds', 'path', 'sun'], focus: 'withered' },
    { at: 'C’est pendant la vie', motifs: ['path', 'footprints', 'light', 'crescent'], focus: 'light' },
  ],

  // ── Épisode 5 : le veau du Samiri ──
  'musa-4-0': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['path', 'footprints', 'rock'], focus: 'path' },
    { at: 'Allah lui en demanda la raison', motifs: ['light', 'rock', 'path'], focus: 'light' },
    { at: 'Ils suivent mes traces', motifs: ['footprints', 'path', 'rock'], focus: 'footprints' },
  ],
  'musa-4-1': [{ at: '', sky: 'day', ground: 'mountains', motifs: ['clouds', 'rock', 'tablets', 'tent'], focus: 'tent' }],
  'musa-4-2': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['path', 'footprints', 'tablets', 'rock'], focus: 'footprints' },
    { at: 'Ô mon peuple', motifs: ['tent', 'tablets', 'path'], focus: 'tent' },
    { at: 'Pourquoi avez-vous manqué', motifs: ['tent', 'path', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'musa-4-3': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['tent', 'gold', 'dark-clouds'], focus: 'gold' },
    { at: 'et nous les avons jetées', motifs: ['tent', 'gold', 'fire'], focus: 'fire' },
    { at: 'Et le Samiri en fit sortir', motifs: ['tent', 'gold', 'flames'], focus: 'flames' },
  ],
  'musa-4-4': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['tent', 'fire', 'gold'], focus: 'gold' },
    { at: 'Ne voyaient-ils pas', motifs: ['gold', 'tent', 'stars'], focus: 'stars' },
  ],
  'musa-4-5': [{ at: '', sky: 'night', ground: 'desert', motifs: ['tent', 'lamp', 'path', 'stars'], focus: 'lamp' }],
  'musa-4-6': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['fire', 'tent', 'crescent'], focus: 'fire' },
    { at: 'À son retour, Moussa', motifs: ['footprints', 'path', 'tablets', 'tent'], focus: 'footprints' },
    { at: 'Haroun craignait qu’on lui reproche', motifs: ['lamp', 'tent', 'crescent'], focus: 'lamp' },
  ],
  'musa-4-7': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['footprints', 'tent', 'crescent'], focus: 'footprints' },
    { at: 'Moussa lui dit de s’en aller', motifs: ['path', 'footprints', 'tent'], focus: 'path' },
    { at: 'et annonça que l’idole serait brûlée', motifs: ['flames', 'wind', 'path'], focus: 'flames' },
    { at: 'puis dispersée dans les flots', ground: 'sea', motifs: ['wind', 'flood'], focus: 'flood' },
  ],
  'musa-4-8': [{ at: '', sky: 'dawn', ground: 'desert', motifs: ['wind', 'light', 'sun'], focus: 'sun' }],
  'musa-4-9': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['stones', 'sun', 'light'], focus: 'stones' },
    { at: 'Seul Allah mérite', ground: 'mountains', motifs: ['light', 'clouds', 'rock', 'path'], focus: 'light' },
  ],

  // ── Épisode 6 : la vache ──
  'musa-5-0': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['tent', 'palms', 'path'], focus: 'tent' },
    { at: 'Un jour, il leur transmit un ordre', motifs: ['tent', 'light', 'path'], focus: 'light' },
  ],
  'musa-5-1': [{ at: '', sky: 'day', ground: 'plain', motifs: ['cows', 'tent', 'sun'], focus: 'cows' }],
  'musa-5-2': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['tent', 'cows', 'footprints'], focus: 'footprints' },
    { at: 'Moussa répondit', motifs: ['cows', 'wheat', 'sun'], focus: 'cows' },
    { at: 'Faites donc ce qu’on vous commande', motifs: ['cows', 'light', 'wheat'], focus: 'light' },
  ],
  'musa-5-3': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['tent', 'cows', 'footprints'], focus: 'footprints' },
    { at: 'C’est une vache jaune', motifs: ['cows', 'sun', 'light', 'wheat'], focus: 'cows' },
  ],
  'musa-5-4': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['cows', 'tent', 'wheat'], focus: 'cows' },
    { at: 'Moussa précisa', motifs: ['cows', 'wheat', 'jar'], focus: 'jar' },
    { at: 'elle est sans défaut', motifs: ['cows', 'light', 'wheat'], focus: 'light' },
  ],
  'musa-5-5': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['light', 'cows', 'tent'], focus: 'light' },
    { at: 'mais il s’en fallut de peu', motifs: ['path', 'footprints', 'tent', 'fire'], focus: 'footprints' },
  ],
  'musa-5-6': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'path', 'footprints'], focus: 'footprints' },
    { at: 'chacun cherchait à rejeter la faute', motifs: ['wall', 'footprints', 'path'], focus: 'wall' },
    { at: 'Mais Allah allait dévoiler', motifs: ['light', 'house', 'lamp'], focus: 'light' },
  ],
  'musa-5-7': [{ at: '', sky: 'night', ground: 'city', motifs: ['light', 'stars', 'cows', 'house'], focus: 'light' }],
  'musa-5-8': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['path', 'cows', 'light'], focus: 'path' },
    { at: 'Et Allah, qui fait revivre les morts', motifs: ['wheat', 'sun', 'light', 'palms'], focus: 'sun' },
  ],

  // ── Épisode 7 : Moussa et le serviteur savant ──
  'musa-6-0': [
    { at: '', sky: 'dawn', ground: 'sea', motifs: ['path', 'footprints'], focus: 'footprints' },
    { at: 'avant d’atteindre le confluent des deux mers', motifs: ['sun', 'path', 'footprints'], focus: 'horizon' },
    { at: 'même s’il faut marcher de longues années', sky: 'day', motifs: ['clouds', 'path', 'footprints', 'sun'], focus: 'path' },
  ],
  'musa-6-1': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['rock', 'stones', 'path'], focus: 'rock' },
    { at: 'ils oublièrent leur poisson', motifs: ['basket', 'rock', 'stones'], focus: 'basket' },
    { at: 'Quand le compagnon s’en souvint', motifs: ['rock', 'light', 'path'], focus: 'light' },
    { at: 'Et ils revinrent sur leurs pas', motifs: ['footprints', 'path', 'stones'], focus: 'footprints' },
  ],
  'musa-6-2': [{ at: '', sky: 'day', ground: 'sea', motifs: ['light', 'rock', 'stones', 'book'], focus: 'light' }],
  'musa-6-3': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['path', 'footprints', 'book'], focus: 'book' },
    { at: 'Tu ne pourras pas être patient', motifs: ['path', 'rock', 'light'], focus: 'path' },
    { at: 'Si Allah le veut', motifs: ['footprints', 'path', 'light', 'sun'], focus: 'footprints' },
  ],
  'musa-6-4': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['boat', 'clouds', 'path'], focus: 'boat' },
    { at: 'et le serviteur y fit une brèche', motifs: ['boat', 'planks', 'clouds'], focus: 'planks' },
    { at: 'Veux-tu noyer ses passagers', motifs: ['boat', 'wind', 'clouds'], focus: 'wind' },
    { at: 'Ne t’avais-je pas dit', motifs: ['boat', 'clouds', 'sun'], focus: 'boat' },
  ],
  'musa-6-5': [
    { at: '', sky: 'dusk', ground: 'sea', motifs: ['path', 'footprints', 'clouds'], focus: 'path' },
    { at: 'Moussa protesta encore', ground: 'plain', motifs: ['path', 'tree', 'footprints'], focus: 'tree' },
    { at: 'Et le serviteur lui rappela', motifs: ['tree', 'path', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'musa-6-6': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'path', 'footprints'], focus: 'house' },
    { at: 'Pourtant, le serviteur y redressa un mur', motifs: ['wall', 'ruins', 'house'], focus: 'wall' },
    { at: 'Tu aurais pu demander un salaire', motifs: ['coins', 'wall'], focus: 'coins' },
    { at: 'C’était l’heure de se séparer', motifs: ['path', 'footprints', 'wall'], focus: 'path' },
  ],
  'musa-6-7': [{ at: '', sky: 'day', ground: 'sea', motifs: ['boat', 'path', 'throne', 'light'], focus: 'boat' }],
  'musa-6-8': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['house', 'path', 'light'], focus: 'house' },
    { at: 'nous avons craint qu’il ne les entraîne', motifs: ['house', 'dark-clouds', 'path'], focus: 'dark-clouds' },
    { at: 'Nous avons voulu que leur Seigneur', motifs: ['light', 'cradle', 'house'], focus: 'cradle' },
  ],
  'musa-6-9': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['wall', 'gold', 'coins', 'light'], focus: 'gold' },
    { at: 'Ton Seigneur a voulu qu’ils grandissent', motifs: ['wall', 'coins', 'light', 'tree'], focus: 'tree' },
    { at: 'Je ne l’ai pas fait de mon propre chef', motifs: ['path', 'footprints', 'light'], focus: 'light' },
  ],

  // ───────────── DAOUD ─────────────
  // ── Épisode 1 : la victoire sur Djalout ──
  'dawud-0-0': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['tent', 'path', 'footprints'], focus: 'tent' },
    { at: 'se trouvait parmi les croyants', motifs: ['light', 'tent', 'footprints'], focus: 'light' },
  ],
  'dawud-0-1': [{ at: '', sky: 'day', ground: 'plain', motifs: ['sun', 'light', 'path'], focus: 'sun' }],
  'dawud-0-2': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'throne', 'path'], focus: 'throne' },
    { at: 'et lui enseigna ce qu’Il voulut', motifs: ['light', 'palace', 'pillars'], focus: 'light' },
  ],
  'dawud-0-3': [{ at: '', sky: 'dawn', ground: 'city', motifs: ['book', 'light', 'palace'], focus: 'book' }],
  'dawud-0-4': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['withered', 'dark-clouds', 'light'], focus: 'withered' },
    { at: 'Mais Allah est plein de grâce', motifs: ['light', 'clouds', 'wheat', 'sun'], focus: 'wheat' },
  ],
  'dawud-0-5': [
    { at: '', sky: 'dusk', ground: 'mountains', motifs: ['sun', 'palace', 'light'], focus: 'palace' },
    { at: 'La suite nous fera découvrir', motifs: ['birds', 'sun', 'path'], focus: 'birds' },
  ],

  // ── Épisode 2 : le fer amolli ──
  'dawud-1-0': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['sun', 'clouds', 'palace'], focus: 'palace' },
    { at: 'qui glorifiait beaucoup son Seigneur', motifs: ['light', 'rock', 'sun'], focus: 'light' },
  ],
  'dawud-1-1': [{ at: '', sky: 'dawn', ground: 'mountains', motifs: ['birds', 'rock', 'light'], focus: 'birds' }],
  'dawud-1-2': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['light', 'rock', 'clouds'], focus: 'light' },
    { at: 'les montagnes et les oiseaux répétaient', motifs: ['birds', 'rock', 'clouds', 'sun'], focus: 'birds' },
  ],
  'dawud-1-3': [{ at: '', sky: 'day', ground: 'city', motifs: ['flames', 'house', 'light', 'rock'], focus: 'flames' }],
  'dawud-1-4': [{ at: '', sky: 'day', ground: 'city', motifs: ['shirt', 'flames', 'house'], focus: 'shirt' }],
  'dawud-1-5': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['shirt', 'house', 'fire'], focus: 'shirt' },
    { at: 'Et Allah voit tout ce que nous faisons', motifs: ['light', 'sun', 'house'], focus: 'light' },
    { at: 'et soignons notre travail', motifs: ['lamp', 'shirt', 'house'], focus: 'lamp' },
  ],

  // ── Épisode 3 : le roi juste et repentant ──
  'dawud-2-0': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['rock', 'sun'], focus: 'rock' },
    { at: 'qui revenait sans cesse vers Lui', motifs: ['path', 'footprints', 'light', 'sun'], focus: 'footprints' },
  ],
  'dawud-2-1': [{ at: '', sky: 'dawn', ground: 'mountains', motifs: ['birds', 'sun', 'rock'], focus: 'birds' }],
  'dawud-2-2': [
    { at: '', sky: 'day', ground: 'city', motifs: ['birds', 'palace', 'sun'], focus: 'birds' },
    { at: 'Allah renforça son royaume', motifs: ['palace', 'pillars', 'wall'], focus: 'palace' },
    { at: 'et l’art de bien juger', motifs: ['throne', 'scales', 'light'], focus: 'scales' },
  ],
  'dawud-2-3': [
    { at: '', sky: 'night', ground: 'city', motifs: ['wall', 'palace', 'stars'], focus: 'wall' },
    { at: 'Daoud fut effrayé', motifs: ['lamp', 'palace', 'stars'], focus: 'lamp' },
    { at: 'Juge entre nous avec justice', motifs: ['scales', 'lamp', 'wall'], focus: 'scales' },
  ],
  'dawud-2-4': [
    { at: '', sky: 'night', ground: 'city', motifs: ['sheep', 'lamp', 'wall', 'palace'], focus: 'sheep' },
    { at: 'Il m’a dit : confie-la-moi', motifs: ['lamp', 'sheep', 'stars'], focus: 'lamp' },
  ],
  'dawud-2-5': [{ at: '', sky: 'night', ground: 'city', motifs: ['scales', 'sheep', 'wall', 'light'], focus: 'scales' }],
  'dawud-2-6': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['light', 'lamp', 'wall'], focus: 'light' },
    { at: 'et un beau retour', motifs: ['path', 'light', 'palace'], focus: 'path' },
  ],
  'dawud-2-7': [{ at: '', sky: 'day', ground: 'city', motifs: ['throne', 'scales', 'light', 'palace'], focus: 'throne' }],
  'dawud-2-8': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['path', 'footprints', 'light'], focus: 'footprints' },
    { at: 'Juger avec équité', motifs: ['scales', 'throne', 'light'], focus: 'scales' },
    { at: 'voilà ce qu’Allah lui demandait', ground: 'mountains', motifs: ['birds', 'sun', 'light'], focus: 'birds' },
  ],

  // ── Épisode 4 : le jugement du champ ──
  'dawud-3-0': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['sheep', 'path', 'crescent'], focus: 'sheep' },
    { at: 'dans un champ cultivé', motifs: ['wheat', 'sheep', 'crescent'], focus: 'wheat' },
  ],
  'dawud-3-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['wheat', 'palace', 'path'], focus: 'palace' },
    { at: 'et Allah était témoin', motifs: ['scales', 'light', 'palace'], focus: 'scales' },
  ],
  'dawud-3-2': [{ at: '', sky: 'day', ground: 'city', motifs: ['scroll', 'light', 'birds'], focus: 'scroll' }],
  'dawud-3-3': [{ at: '', sky: 'dawn', ground: 'mountains', motifs: ['shirt', 'flames', 'light'], focus: 'shirt' }],
  'dawud-3-4': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['wheat', 'book', 'light'], focus: 'book' },
    { at: 'Et tous ces bienfaits', motifs: ['sun', 'wheat', 'palms', 'light'], focus: 'sun' },
  ],

  // ───────────── SOULEYMANE ─────────────
  // ── Épisode 1 : la vallée des fourmis ──
  'sulayman-0-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'book', 'light'], focus: 'book' },
    { at: 'Ils dirent : « Louange à Allah', motifs: ['sun', 'light', 'palace'], focus: 'sun' },
  ],
  'sulayman-0-1': [{ at: '', sky: 'day', ground: 'city', motifs: ['throne', 'birds', 'palace', 'light'], focus: 'birds' }],
  'sulayman-0-2': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['palace', 'path', 'footprints'], focus: 'footprints' },
    { at: 'furent rassemblées pour lui', motifs: ['birds', 'path', 'footprints'], focus: 'birds' },
  ],
  'sulayman-0-3': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['path', 'footprints', 'rock'], focus: 'path' },
    { at: 'une fourmi dit', motifs: ['ants', 'cave-mouth', 'rock'], focus: 'ants' },
    { at: 'pour que Souleymane et ses armées', motifs: ['path', 'footprints', 'ants'], focus: 'footprints' },
  ],
  'sulayman-0-4': [{ at: '', sky: 'day', ground: 'valley', motifs: ['ants', 'sun', 'path'], focus: 'ants' }],
  'sulayman-0-5': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['ants', 'palace', 'path'], focus: 'ants' },
    { at: 'Au lieu de s’enorgueillir', motifs: ['light', 'ants', 'lamp'], focus: 'light' },
  ],

  // ── Épisode 2 : la huppe et la reine de Saba ──
  'sulayman-1-0': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['birds', 'tree'], focus: 'birds' },
    { at: 'oiseaux et ne vit pas la huppe', motifs: ['tree', 'rock'], focus: 'tree' },
    { at: 'Elle revint peu après', motifs: ['hoopoe', 'tree', 'light'], focus: 'hoopoe' },
  ],
  'sulayman-1-1': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['palace', 'throne', 'gold'], focus: 'throne', cut: true },
    { at: 'Mais elle et son peuple se prosternent devant le soleil', motifs: ['sun', 'palace', 'throne', 'light'], focus: 'sun' },
  ],
  'sulayman-1-2': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['hoopoe', 'tree', 'sun'], focus: 'hoopoe' },
    { at: 'Pars avec ma lettre', motifs: ['scroll', 'hoopoe', 'sun'], focus: 'scroll' },
  ],
  'sulayman-1-3': [
    { at: '', sky: 'day', ground: 'city', motifs: ['throne', 'palace', 'scroll'], focus: 'throne' },
    { at: 'qu’une noble lettre lui avait été lancée', motifs: ['scroll', 'light', 'palace'], focus: 'scroll' },
  ],
  'sulayman-1-4': [
    { at: '', sky: 'day', ground: 'city', motifs: ['scroll', 'palace'], focus: 'scroll' },
    { at: 'puis envoya un présent', motifs: ['gold', 'coins', 'path'], focus: 'gold' },
    { at: 'Ce qu’Allah m’a donné vaut mieux', motifs: ['palace', 'gold', 'light'], focus: 'palace' },
  ],
  'sulayman-1-5': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'light', 'path'], focus: 'palace' },
    { at: 'Un djinn proposa', motifs: ['wind', 'light', 'palace'], focus: 'wind' },
    { at: 'avant qu’il ne se lève de sa place', motifs: ['throne', 'palace', 'light'], focus: 'throne' },
  ],
  'sulayman-1-6': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['throne', 'palace'], focus: 'throne' },
    { at: 'Quand la reine arriva', motifs: ['path', 'footprints', 'palace'], focus: 'footprints' },
    { at: 'Ton trône est-il ainsi', motifs: ['throne', 'lamp', 'palace'], focus: 'throne' },
  ],
  'sulayman-1-7': [{ at: '', sky: 'dawn', ground: 'city', motifs: ['palace', 'pillars', 'light', 'spring'], focus: 'spring' }],
  'sulayman-1-8': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['throne', 'light', 'palace'], focus: 'throne' },
    { at: 'Plus Allah nous donne', ground: 'garden', motifs: ['palms', 'dates', 'light'], focus: 'dates' },
  ],

  // ── Épisode 3 : le vent, les djinns et la canne ──
  'sulayman-2-0': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['wind', 'clouds'], focus: 'wind' },
    { at: 'sa course du matin valait un mois de marche', motifs: ['sun', 'wind', 'path'], focus: 'path' },
    { at: 'et celle du soir, un mois aussi', sky: 'dusk', motifs: ['wind', 'path', 'sun'], focus: 'wind' },
  ],
  'sulayman-2-1': [{ at: '', sky: 'day', ground: 'valley', motifs: ['spring', 'sun', 'rock', 'path'], focus: 'spring' }],
  'sulayman-2-2': [
    { at: '', sky: 'day', ground: 'city', motifs: ['path', 'planks', 'stones'], focus: 'planks' },
    { at: 'et bâtissaient ce qu’il voulait', motifs: ['palace', 'pillars', 'planks'], focus: 'palace' },
  ],
  'sulayman-2-3': [{ at: '', sky: 'day', ground: 'city', motifs: ['tower', 'palace', 'jar', 'light'], focus: 'jar' }],
  'sulayman-2-4': [{ at: '', sky: 'dusk', ground: 'city', motifs: ['throne', 'staff', 'palace'], focus: 'staff' }],
  'sulayman-2-5': [
    { at: '', sky: 'night', ground: 'city', motifs: ['palace', 'staff', 'stars', 'crescent'], focus: 'sky' },
    { at: 'Et ce qu’Il nous donne', motifs: ['light', 'stars', 'palms', 'dates'], focus: 'dates' },
  ],
};
