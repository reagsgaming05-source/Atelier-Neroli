import type { Storyboard } from '../types';

/*
 * Pictures of the stories of Chouaïb, Youssouf, Qaroun and Talout & Djalout.
 * Ordinary people are silhouettes (folk, crowd, walkers, workers, caravan);
 * the prophets are never drawn: they stay light, lamp, footprints.
 */
export const BOARD_3: Storyboard = {
  // ══════════ CHOUAÏB ══════════
  // ── Épisode 1 : l'appel à Madyan ──
  'shuayb-0-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['crowd', 'wall', 'house', 'coins'], focus: 'crowd' },
    { at: 'Mais ils trichaient', motifs: ['folk', 'scales', 'coins', 'house'], focus: 'scales' },
  ],
  'shuayb-0-1': [{ at: '', sky: 'day', ground: 'city', motifs: ['folk', 'light', 'house', 'scales'], focus: 'light' }],
  'shuayb-0-2': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['folk', 'path', 'camel'], focus: 'folk' },
    { at: 'Souvenez-vous, leur dit-il', motifs: ['folk', 'tent', 'footprints', 'light'], focus: 'light' },
    { at: 'et qu’Allah vous a multipliés', motifs: ['crowd', 'tent', 'palms', 'light'], focus: 'crowd' },
  ],
  'shuayb-0-3': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['crowd', 'house', 'wall'], focus: 'crowd' },
    { at: 'patientez jusqu’à ce qu’Allah juge', motifs: ['folk', 'house', 'scales', 'light'], focus: 'scales' },
  ],
  'shuayb-0-4': [
    { at: '', sky: 'day', ground: 'city', motifs: ['folk', 'palace', 'wall', 'house'], focus: 'palace' },
    { at: 'Nous t’expulserons, Chouaïb', motifs: ['crowd', 'wall', 'path', 'footprints'], focus: 'crowd' },
  ],
  'shuayb-0-5': [{ at: '', sky: 'night', ground: 'city', motifs: ['folk', 'house', 'lamp', 'stars', 'light'], focus: 'lamp' }],
  'shuayb-0-6': [
    { at: '', sky: 'night', ground: 'city', motifs: ['folk', 'palace', 'house'], focus: 'folk' },
    { at: '« Si vous suivez Chouaïb', motifs: ['crowd', 'wall', 'house', 'dark-clouds'], focus: 'crowd' },
    { at: 'Alors le tremblement de terre', sky: 'storm', motifs: ['birds', 'ruins', 'wall', 'dark-clouds', 'wind'], focus: 'ruins' },
  ],
  'shuayb-0-7': [{ at: '', sky: 'dusk', ground: 'desert', motifs: ['ruins', 'path', 'footprints', 'light'], focus: 'footprints' }],
  'shuayb-0-8': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['ruins', 'house', 'sun', 'birds'], focus: 'ruins' },
    { at: 'Être honnête dans le commerce', motifs: ['folk', 'scales', 'coins', 'sun'], focus: 'scales' },
  ],

  // ── Épisode 2 : « Je ne veux que la réforme » ──
  'shuayb-1-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['crowd', 'house', 'scales', 'coins'], focus: 'scales' },
    { at: 'Je vous vois dans l’aisance', motifs: ['crowd', 'house', 'gold', 'coins'], focus: 'gold' },
    { at: 'et je crains pour vous le châtiment', motifs: ['crowd', 'house', 'gold', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'shuayb-1-1': [{ at: '', sky: 'day', ground: 'city', motifs: ['folk', 'scales', 'coins', 'light', 'house'], focus: 'scales' }],
  'shuayb-1-2': [{ at: '', sky: 'dusk', ground: 'city', motifs: ['folk', 'lamp', 'house', 'light'], focus: 'lamp' }],
  'shuayb-1-3': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['crowd', 'palace', 'house'], focus: 'crowd' },
    { at: 'ou de ne plus faire de nos biens', sky: 'night', motifs: ['folk', 'coins', 'gold', 'palace'], focus: 'gold' },
  ],
  'shuayb-1-4': [{ at: '', sky: 'dawn', ground: 'city', motifs: ['folk', 'light', 'lamp', 'house', 'birds'], focus: 'light' }],
  'shuayb-1-5': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['folk', 'ruins', 'path'], focus: 'ruins' },
    { at: 'et au peuple de Lout, qui n’était pas loin', motifs: ['ruins', 'withered', 'wind', 'path'], focus: 'horizon' },
  ],
  'shuayb-1-6': [{ at: '', sky: 'day', ground: 'valley', motifs: ['folk', 'path', 'light', 'spring', 'birds'], focus: 'spring' }],
  'shuayb-1-7': [
    { at: '', sky: 'day', ground: 'city', motifs: ['crowd', 'folk', 'wall', 'house'], focus: 'crowd' },
    { at: 'Sans ton clan', motifs: ['folk', 'wall', 'house', 'path'], focus: 'folk' },
    { at: 'Chouaïb dit : « Mon clan est-il pour vous', sky: 'dusk', motifs: ['crowd', 'wall', 'clouds', 'light'], focus: 'light' },
  ],
  'shuayb-1-8': [
    { at: '', sky: 'storm', ground: 'city', motifs: ['folk', 'house', 'light', 'dark-clouds', 'wind'], focus: 'light' },
    { at: 'Le Cri saisit les injustes', motifs: ['birds', 'ruins', 'dark-clouds', 'wind'], focus: 'ruins' },
    { at: 'ce fut comme s’ils n’avaient jamais prospéré', ground: 'desert', motifs: ['ruins', 'withered', 'wind'], focus: 'withered' },
  ],
  'shuayb-1-9': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['folk', 'ruins', 'house', 'sun'], focus: 'folk' },
    { at: 'voilà l’exemple de Chouaïb', motifs: ['birds', 'light', 'house', 'sun'], focus: 'light' },
  ],

  // ── Épisode 3 : les gens d'Al-Ayka ──
  'shuayb-2-0': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['tree', 'palms', 'birds'], focus: 'ground', cut: true },
    { at: 'qui traitèrent de menteurs les messagers', motifs: ['folk', 'tree', 'palms', 'path'], focus: 'folk' },
  ],
  'shuayb-2-1': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['folk', 'tree', 'palms', 'path'], focus: 'folk' },
    { at: 'Je suis pour vous un messager digne', motifs: ['light', 'lamp', 'path', 'tree', 'birds'], focus: 'lamp' },
  ],
  'shuayb-2-2': [{ at: '', sky: 'day', ground: 'garden', motifs: ['folk', 'scales', 'coins', 'tree', 'basket'], focus: 'scales' }],
  'shuayb-2-3': [{ at: '', sky: 'dusk', ground: 'garden', motifs: ['folk', 'scales', 'lamp', 'tree'], focus: 'scales' }],
  'shuayb-2-4': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['folk', 'scales', 'coins', 'tree'], focus: 'scales' },
    { at: 'ne semez pas le désordre', motifs: ['folk', 'tree', 'path', 'wind'], focus: 'wind' },
    { at: 'et craignez Celui qui vous a créés', sky: 'night', motifs: ['bats', 'stars', 'path', 'footprints', 'tree'], focus: 'stars' },
  ],
  'shuayb-2-5': [
    { at: '', sky: 'dawn', ground: 'garden', motifs: ['crowd', 'tree', 'path'], focus: 'crowd' },
    { at: 'et nous pensons que tu es un menteur', motifs: ['folk', 'tree', 'clouds', 'path'], focus: 'folk' },
    { at: 'Fais donc tomber sur nous des morceaux du ciel', sky: 'day', motifs: ['crowd', 'tree', 'clouds', 'wind'], focus: 'sky' },
  ],
  'shuayb-2-6': [{ at: '', sky: 'dusk', ground: 'garden', motifs: ['folk', 'light', 'tree', 'lamp', 'clouds'], focus: 'light' }],
  'shuayb-2-7': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['crowd', 'tree', 'dark-clouds', 'wind'], focus: 'crowd' },
    { at: 'Alors le châtiment du jour de l’Ombre', sky: 'storm', motifs: ['birds', 'tree', 'dark-clouds', 'wind'], focus: 'dark-clouds' },
  ],
  'shuayb-2-8': [
    { at: '', sky: 'dawn', ground: 'garden', motifs: ['sun', 'tree', 'light', 'birds', 'butterflies'], focus: 'sun' },
    { at: 'Soyons justes dans nos mesures', motifs: ['folk', 'scales', 'tree', 'sun'], focus: 'scales' },
  ],

  // ══════════ YOUSSOUF ══════════
  // ── Épisode 1 : le rêve et le puits ──
  'yusuf-0-0': [
    { at: '', sky: 'dawn', ground: 'none', motifs: ['book', 'light'], focus: 'book' },
    { at: 'C’est l’histoire de Youssouf', ground: 'plain', motifs: ['book', 'house', 'path', 'crowd'], focus: 'crowd' },
  ],
  'yusuf-0-1': [{ at: '', sky: 'night', ground: 'plain', motifs: ['house', 'stars', 'sun', 'moon'], focus: 'stars', cut: true }],
  'yusuf-0-2': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['house', 'lamp', 'moon'], focus: 'lamp' },
    { at: 'de peur qu’ils ne complotent contre lui', motifs: ['crowd', 'house', 'path', 'moon'], focus: 'crowd' },
    { at: 'Allah, lui dit-il, te choisira', motifs: ['house', 'light', 'stars', 'book'], focus: 'book' },
  ],
  'yusuf-0-3': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['crowd', 'house', 'tree', 'sun'], focus: 'crowd' },
    { at: 'Et ils voulurent l’éloigner', sky: 'day', motifs: ['walkers', 'tree', 'sun', 'path', 'footprints'], focus: 'walkers' },
  ],
  'yusuf-0-4': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['crowd', 'path', 'tree'], focus: 'crowd', cut: true },
    { at: 'Jetez-le plutôt au fond du puits', sky: 'dusk', motifs: ['crowd', 'well', 'rope', 'path'], focus: 'well' },
  ],
  'yusuf-0-5': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['crowd', 'house', 'path', 'tree'], focus: 'house', cut: true },
    { at: 'malgré sa crainte qu’un loup', motifs: ['house', 'wolf', 'path', 'tree'], focus: 'wolf' },
  ],
  'yusuf-0-6': [{ at: '', sky: 'dusk', ground: 'desert', motifs: ['well', 'light', 'path', 'rock'], focus: 'light' }],
  'yusuf-0-7': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['crowd', 'house', 'path', 'footprints'], focus: 'crowd' },
    { at: 'Ils dirent que le loup', sky: 'night', motifs: ['crowd', 'wolf', 'house', 'moon'], focus: 'wolf' },
    { at: 'et montrèrent sa tunique', motifs: ['crowd', 'shirt', 'house', 'moon'], focus: 'shirt' },
  ],
  'yusuf-0-8': [{ at: '', sky: 'night', ground: 'plain', motifs: ['house', 'lamp', 'shirt', 'stars'], focus: 'lamp' }],
  'yusuf-0-9': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['caravan', 'path', 'well'], focus: 'caravan', cut: true },
    { at: 'fit descendre son seau et s’écria', motifs: ['caravan', 'well', 'rope', 'jar'], focus: 'rope' },
    { at: 'Ils le vendirent pour quelques pièces', motifs: ['caravan', 'coins', 'well', 'light'], focus: 'coins' },
  ],

  // ── Épisode 2 : dans la maison d'Al-Aziz ──
  'yusuf-1-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['caravan', 'path', 'palace', 'palms'], focus: 'caravan', cut: true },
    { at: 'Accueille-le généreusement', motifs: ['folk', 'house', 'palace', 'palms'], focus: 'house' },
  ],
  'yusuf-1-1': [{ at: '', sky: 'day', ground: 'city', motifs: ['palace', 'light', 'book', 'palms', 'birds'], focus: 'book' }],
  'yusuf-1-2': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'lamp', 'palace'], focus: 'house' },
    { at: 'Elle ferma les portes', motifs: ['key', 'house', 'lamp', 'wall'], focus: 'key' },
  ],
  'yusuf-1-3': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'lamp', 'key'], focus: 'house' },
    { at: 'Et Allah écarta de lui le mal', motifs: ['light', 'house', 'stars'], focus: 'light' },
  ],
  'yusuf-1-4': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'path', 'footprints', 'key'], focus: 'path' },
    { at: 'et elle déchira sa tunique', motifs: ['shirt', 'house', 'wall'], focus: 'shirt' },
    { at: 'À la porte, ils trouvèrent le mari', motifs: ['folk', 'shirt', 'house', 'lamp'], focus: 'folk' },
  ],
  'yusuf-1-5': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['folk', 'shirt', 'house', 'wall'], focus: 'folk' },
    { at: 'si la tunique est déchirée par devant', sky: 'day', motifs: ['folk', 'shirt', 'wall'], focus: 'shirt' },
    { at: 'Elle était déchirée par derrière', motifs: ['shirt', 'light', 'house'], focus: 'light' },
  ],
  'yusuf-1-6': [
    { at: '', sky: 'day', ground: 'city', motifs: ['folk', 'palace', 'house', 'shirt'], focus: 'palace' },
    { at: 'Mais en ville, des femmes', motifs: ['folk', 'path', 'footprints', 'wall', 'house'], focus: 'folk' },
  ],
  'yusuf-1-7': [
    { at: '', sky: 'day', ground: 'city', motifs: ['folk', 'table', 'bread', 'goblet', 'palace'], focus: 'table' },
    { at: 'Quand elles virent Youssouf', motifs: ['folk', 'light', 'table', 'goblet'], focus: 'light' },
    { at: 'Ce n’est pas un être humain', motifs: ['folk', 'light', 'palace', 'birds'], focus: 'folk' },
  ],
  'yusuf-1-8': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['folk', 'house', 'key', 'wall'], focus: 'key' },
    { at: 'Youssouf invoqua alors', sky: 'night', motifs: ['prison', 'stars', 'wall', 'light'], focus: 'prison' },
  ],
  'yusuf-1-9': [
    { at: '', sky: 'night', ground: 'city', motifs: ['light', 'prison', 'stars'], focus: 'light' },
    { at: 'Pourtant, malgré les preuves', sky: 'dawn', motifs: ['folk', 'prison', 'shirt', 'wall', 'key'], focus: 'prison' },
  ],

  // ── Épisode 3 : la prison et le rêve du roi ──
  'yusuf-2-0': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['folk', 'prison', 'wall', 'path'], focus: 'prison' },
    { at: 'L’un se voyait en rêve pressant du raisin', sky: 'night', motifs: ['prison', 'goblet', 'moon', 'stars'], focus: 'goblet' },
    { at: 'L’autre portait sur sa tête du pain', motifs: ['prison', 'bread', 'birds', 'moon'], focus: 'bread' },
  ],
  'yusuf-2-1': [{ at: '', sky: 'night', ground: 'city', motifs: ['folk', 'prison', 'bright-star', 'stars'], focus: 'bright-star' }],
  'yusuf-2-2': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['folk', 'goblet', 'prison', 'palace'], focus: 'goblet' },
    { at: 'Il demanda au premier de parler de lui', motifs: ['folk', 'path', 'footprints', 'prison'], focus: 'path' },
    { at: 'mais Satan le lui fit oublier', motifs: ['wind', 'footprints', 'prison'], focus: 'wind' },
  ],
  'yusuf-2-3': [
    { at: '', sky: 'night', ground: 'city', motifs: ['prison', 'moon', 'wall'], focus: 'prison' },
    { at: 'Puis le roi vit en rêve sept vaches', ground: 'plain', motifs: ['cows', 'moon'], focus: 'cows' },
    { at: 'et sept épis verts, et sept autres secs', motifs: ['wheat', 'withered', 'cows', 'moon'], focus: 'wheat' },
  ],
  'yusuf-2-4': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['crowd', 'throne', 'palace', 'pillars'], focus: 'crowd', cut: true },
    { at: 'Alors l’ancien compagnon de prison', sky: 'day', motifs: ['goblet', 'prison', 'path', 'palace'], focus: 'prison' },
    { at: 'et alla lui demander l’explication', motifs: ['walkers', 'path', 'prison'], focus: 'walkers' },
  ],
  'yusuf-2-5': [{ at: '', sky: 'day', ground: 'plain', motifs: ['workers', 'wheat', 'sun', 'path'], focus: 'wheat' }],
  'yusuf-2-6': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['folk', 'withered', 'wheat', 'wind'], focus: 'withered' },
    { at: 'Puis viendrait une année où les gens seraient secourus', motifs: ['crowd', 'clouds', 'rain', 'wheat'], focus: 'rain' },
  ],
  'yusuf-2-7': [
    { at: '', sky: 'day', ground: 'city', motifs: ['folk', 'throne', 'palace', 'pillars'], focus: 'throne', cut: true },
    { at: 'Youssouf demanda d’abord que l’on interroge', motifs: ['prison', 'key', 'wall', 'palace'], focus: 'prison' },
    { at: 'Elles dirent : « Nous ne connaissons', motifs: ['folk', 'light', 'shirt', 'palace'], focus: 'light' },
  ],
  'yusuf-2-8': [
    { at: '', sky: 'day', ground: 'city', motifs: ['folk', 'throne', 'palace', 'light'], focus: 'throne' },
    { at: 'Youssouf lui dit', motifs: ['wheat', 'key', 'palace'], focus: 'wheat' },
  ],
  'yusuf-2-9': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['palace', 'light', 'wheat', 'sun', 'birds'], focus: 'light' },
    { at: 'Allah ne laisse jamais perdre la récompense', motifs: ['folk', 'light', 'sun', 'palms', 'palace'], focus: 'sun' },
  ],

  // ── Épisode 4 : les frères en Égypte et la coupe du roi ──
  'yusuf-3-0': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['withered', 'sun', 'wind'], focus: 'withered', cut: true },
    { at: 'Les frères de Youssouf', motifs: ['caravan', 'path', 'withered'], focus: 'caravan' },
  ],
  'yusuf-3-1': [{ at: '', sky: 'day', ground: 'city', motifs: ['crowd', 'palace', 'throne', 'path'], focus: 'crowd' }],
  'yusuf-3-2': [
    { at: '', sky: 'day', ground: 'city', motifs: ['folk', 'wheat', 'basket', 'palace'], focus: 'wheat' },
    { at: 'Amenez-moi votre frère de même père', motifs: ['folk', 'palace', 'path'], focus: 'folk' },
    { at: 'Il fit aussi remettre leurs marchandises', motifs: ['caravan', 'coins', 'basket', 'path'], focus: 'coins' },
  ],
  'yusuf-3-3': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['caravan', 'path', 'house'], focus: 'house' },
    { at: 'Yacoub leur répondit', motifs: ['crowd', 'house', 'lamp', 'light'], focus: 'light' },
  ],
  'yusuf-3-4': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['folk', 'house', 'lamp', 'path'], focus: 'lamp' },
    { at: 'Puis il leur conseilla d’entrer par des portes', sky: 'dawn', ground: 'city', motifs: ['walkers', 'wall', 'path', 'house'], focus: 'wall' },
    { at: 'La décision n’appartient qu’à Allah', motifs: ['light', 'wall', 'path'], focus: 'light' },
  ],
  'yusuf-3-5': [
    { at: '', sky: 'day', ground: 'city', motifs: ['crowd', 'palace', 'throne', 'path'], focus: 'crowd' },
    { at: 'il garda son frère près de lui', sky: 'night', motifs: ['palace', 'lamp', 'stars'], focus: 'lamp' },
    { at: '« Je suis ton frère', motifs: ['palace', 'lamp', 'light'], focus: 'light' },
  ],
  'yusuf-3-6': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['goblet', 'basket', 'palace', 'caravan'], focus: 'goblet' },
    { at: 'Un crieur annonça', sky: 'day', ground: 'desert', motifs: ['caravan', 'path', 'basket'], focus: 'caravan' },
    { at: 'Les frères répondirent qu’ils n’étaient pas', motifs: ['crowd', 'caravan', 'path'], focus: 'crowd' },
  ],
  'yusuf-3-7': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['caravan', 'basket', 'path'], focus: 'basket' },
    { at: 'celui de son frère en dernier', motifs: ['caravan', 'goblet', 'basket'], focus: 'goblet' },
  ],
  'yusuf-3-8': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['crowd', 'palace', 'throne', 'path'], focus: 'crowd' },
    { at: 'car leur père était très âgé', motifs: ['house', 'path', 'palace'], focus: 'house' },
    { at: 'Il refusa : il serait injuste', motifs: ['folk', 'scales', 'goblet', 'palace'], focus: 'scales' },
  ],
  'yusuf-3-9': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['folk', 'palace', 'wall', 'path'], focus: 'folk' },
    { at: 'Il dit aux autres de rentrer', ground: 'desert', motifs: ['walkers', 'path', 'footprints', 'camel'], focus: 'footprints' },
    { at: 'Comment Yacoub allait-il recevoir', ground: 'plain', motifs: ['walkers', 'house', 'path', 'footprints'], focus: 'house' },
  ],

  // ── Épisode 5 : la patience de Yacoub et le pardon ──
  'yusuf-4-0': [{ at: '', sky: 'dusk', ground: 'plain', motifs: ['caravan', 'house', 'path'], focus: 'caravan' }],
  'yusuf-4-1': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['folk', 'house', 'lamp', 'moon'], focus: 'lamp' },
    { at: 'Peut-être qu’Allah me les ramènera tous', motifs: ['house', 'lamp', 'path', 'stars'], focus: 'path' },
  ],
  'yusuf-4-2': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['folk', 'house', 'path', 'moon'], focus: 'house' },
    { at: 'Et ses yeux blanchirent de tristesse', motifs: ['moon', 'clouds', 'house'], focus: 'clouds' },
  ],
  'yusuf-4-3': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['crowd', 'house', 'lamp', 'stars'], focus: 'crowd' },
    { at: 'il répondit', motifs: ['house', 'lamp', 'stars', 'light'], focus: 'light' },
  ],
  'yusuf-4-4': [{ at: '', sky: 'dawn', ground: 'plain', motifs: ['walkers', 'path', 'light', 'house'], focus: 'walkers' }],
  'yusuf-4-5': [
    { at: '', sky: 'day', ground: 'city', motifs: ['caravan', 'path', 'palace'], focus: 'caravan' },
    { at: 'La disette nous a touchés', motifs: ['crowd', 'withered', 'wheat', 'palace'], focus: 'withered' },
    { at: 'Donne-nous pleine mesure', motifs: ['folk', 'scales', 'wheat', 'basket'], focus: 'scales' },
  ],
  'yusuf-4-6': [
    { at: '', sky: 'day', ground: 'city', motifs: ['folk', 'palace', 'pillars', 'throne'], focus: 'folk' },
    { at: 'Ils s’écrièrent : « Serais-tu Youssouf', motifs: ['crowd', 'palace', 'light'], focus: 'crowd' },
    { at: 'Il répondit : « Je suis Youssouf', motifs: ['crowd', 'light', 'palace', 'sun'], focus: 'light' },
  ],
  'yusuf-4-7': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['crowd', 'sun', 'palace'], focus: 'crowd' },
    { at: 'Youssouf leur dit', motifs: ['light', 'sun', 'palace', 'birds'], focus: 'light' },
  ],
  'yusuf-4-8': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['shirt', 'palace', 'light'], focus: 'shirt' },
    { at: 'Quand la caravane partit', ground: 'desert', motifs: ['caravan', 'path', 'shirt'], focus: 'caravan' },
    { at: 'Yacoub dit : « Je sens l’odeur', motifs: ['caravan', 'wind', 'house', 'path'], focus: 'wind' },
  ],
  'yusuf-4-9': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['walkers', 'shirt', 'house', 'path'], focus: 'shirt' },
    { at: 'et Yacoub retrouva la vue', motifs: ['light', 'sun', 'house', 'shirt'], focus: 'light' },
    { at: 'Ses fils lui demandèrent pardon', motifs: ['crowd', 'house', 'path', 'light'], focus: 'crowd' },
  ],

  // ── Épisode 6 : le rêve réalisé ──
  'yusuf-5-0': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['caravan', 'path', 'tent', 'house'], focus: 'caravan' },
    { at: 'Youssouf, paix sur lui, accueillit', ground: 'city', motifs: ['caravan', 'palace', 'path'], focus: 'palace' },
    { at: '« Entrez en Égypte en toute sécurité', motifs: ['crowd', 'palace', 'light', 'wall'], focus: 'light' },
  ],
  'yusuf-5-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['crowd', 'throne', 'palace', 'light'], focus: 'throne' },
    { at: 'le rêve de son enfance', motifs: ['crowd', 'throne', 'sun', 'moon', 'stars', 'palace'], focus: 'sun' },
  ],
  'yusuf-5-2': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['throne', 'stars', 'sun', 'moon'], focus: 'stars' },
    { at: 'Allah l’avait fait sortir de prison', motifs: ['prison', 'key', 'path', 'throne'], focus: 'prison' },
    { at: 'et avait fait venir sa famille du désert', motifs: ['caravan', 'tent', 'path', 'palace'], focus: 'caravan' },
  ],
  'yusuf-5-3': [{ at: '', sky: 'night', ground: 'city', motifs: ['palace', 'light', 'stars'], focus: 'light' }],
  'yusuf-5-4': [
    { at: '', sky: 'night', ground: 'none', motifs: ['book', 'stars', 'light'], focus: 'book' },
    { at: 'et tu n’étais pas auprès d’eux quand ils complotaient', ground: 'desert', motifs: ['crowd', 'well', 'path', 'stars'], focus: 'well' },
  ],
  'yusuf-5-5': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['sun', 'birds', 'clouds'], focus: 'sky', cut: true },
    { at: 'devant lesquels les gens passent', motifs: ['walkers', 'path', 'rock', 'birds'], focus: 'walkers' },
  ],
  'yusuf-5-6': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['path', 'footprints', 'rock', 'birds'], focus: 'path' },
    { at: 'moi et ceux qui me suivent', motifs: ['walkers', 'light', 'path', 'lamp'], focus: 'walkers' },
    { at: 'avec une preuve évidente', motifs: ['book', 'light', 'lamp'], focus: 'book' },
  ],
  'yusuf-5-7': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['dark-clouds', 'withered', 'path'], focus: 'withered' },
    { at: 'le secours d’Allah vint à eux', motifs: ['sun', 'light', 'clouds', 'birds'], focus: 'light' },
  ],
  'yusuf-5-8': [{ at: '', sky: 'day', ground: 'none', motifs: ['book', 'light', 'lamp'], focus: 'book' }],
  'yusuf-5-9': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['folk', 'book', 'light', 'palace'], focus: 'book' },
    { at: 'Ainsi s’achève l’histoire', motifs: ['crescent', 'palace', 'stars', 'folk'], focus: 'crescent' },
  ],

  // ══════════ QAROUN ══════════
  // ── Épisode 1 : les trésors de Qaroun ──
  'qarun-0-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['folk', 'tent', 'pillars', 'path'], focus: 'folk' },
    { at: 'mais il se montrait injuste', motifs: ['folk', 'palace', 'pillars', 'tent'], focus: 'palace' },
  ],
  'qarun-0-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['gold', 'coins', 'palace'], focus: 'gold' },
    { at: 'que leurs seules clés étaient lourdes', motifs: ['workers', 'key', 'gold', 'coins'], focus: 'key' },
  ],
  'qarun-0-2': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['folk', 'path', 'palace', 'gold'], focus: 'folk' },
    { at: 'car Allah n’aime pas les arrogants', motifs: ['folk', 'palace', 'gold', 'light'], focus: 'light' },
  ],
  'qarun-0-3': [{ at: '', sky: 'dusk', ground: 'garden', motifs: ['folk', 'palms', 'light', 'tree', 'butterflies'], focus: 'light' }],
  'qarun-0-4': [{ at: '', sky: 'night', ground: 'city', motifs: ['folk', 'palace', 'gold', 'key', 'ruins'], focus: 'key' }],
  'qarun-0-5': [
    { at: '', sky: 'night', ground: 'city', motifs: ['palace', 'gold', 'key', 'stars'], focus: 'gold' },
    { at: 'Avant lui, des peuples plus forts', ground: 'desert', motifs: ['ruins', 'stars', 'wind'], focus: 'ruins' },
    { at: 'La suite de son histoire allait le montrer', motifs: ['ruins', 'stars', 'path'], focus: 'horizon' },
  ],

  // ── Épisode 2 : l'apparat et l'engloutissement ──
  'qarun-1-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['crowd', 'palace', 'path', 'sun'], focus: 'path', cut: true },
    { at: 'dans tout son apparat', motifs: ['crowd', 'gold', 'coins', 'palace', 'sun'], focus: 'gold' },
  ],
  'qarun-1-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['crowd', 'path', 'footprints', 'palace'], focus: 'crowd' },
    { at: 'Si seulement nous avions ce qui', motifs: ['crowd', 'coins', 'gold', 'palace'], focus: 'gold' },
  ],
  'qarun-1-2': [{ at: '', sky: 'day', ground: 'city', motifs: ['folk', 'book', 'light', 'sun', 'palace'], focus: 'book' }],
  'qarun-1-3': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['palace', 'gold', 'dark-clouds', 'wind'], focus: 'dark-clouds' },
    { at: 'Personne ne put le secourir', ground: 'plain', motifs: ['crowd', 'ruins', 'rock', 'dark-clouds'], focus: 'ground' },
  ],
  'qarun-1-4': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['crowd', 'ruins', 'light', 'path'], focus: 'crowd' },
    { at: 'Allah donne largement à qui Il veut', motifs: ['crowd', 'house', 'wheat', 'light'], focus: 'wheat' },
    { at: 'Sans Sa faveur envers nous', motifs: ['folk', 'ruins', 'light'], focus: 'ruins' },
  ],
  'qarun-1-5': [{ at: '', sky: 'dawn', ground: 'garden', motifs: ['palms', 'tree', 'light', 'birds'], focus: 'light' }],
  'qarun-1-6': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['gold', 'coins', 'light', 'tree', 'birds'], focus: 'gold' },
    { at: 'pour celui qui croit, fait le bien', sky: 'dusk', motifs: ['folk', 'tree', 'palms', 'light', 'lamp'], focus: 'tree' },
  ],

  // ══════════ TALOUT ET DJALOUT ══════════
  // ── Épisode 1 : un roi pour les Enfants d'Israël ──
  'talut-jalut-0-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['tablets', 'tent', 'pillars'], focus: 'tablets' },
    { at: 'vinrent trouver un prophète de leur peuple', motifs: ['walkers', 'tent', 'path', 'footprints'], focus: 'walkers' },
  ],
  'talut-jalut-0-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['folk', 'throne', 'tent', 'sun'], focus: 'throne' },
    { at: 'pour que nous combattions dans le sentier', motifs: ['crowd', 'path', 'tent', 'footprints'], focus: 'crowd' },
    { at: 'Le prophète demanda', motifs: ['folk', 'scroll', 'tent', 'light'], focus: 'scroll' },
  ],
  'talut-jalut-0-2': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['folk', 'house', 'path'], focus: 'folk' },
    { at: 'alors qu’on nous a chassés de nos maisons', motifs: ['crowd', 'house', 'path', 'footprints'], focus: 'house' },
    { at: 'Mais quand le combat leur fut prescrit', motifs: ['walkers', 'scroll', 'footprints', 'path'], focus: 'footprints' },
  ],
  'talut-jalut-0-3': [{ at: '', sky: 'day', ground: 'plain', motifs: ['folk', 'throne', 'tent', 'path', 'light'], focus: 'throne' }],
  'talut-jalut-0-4': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['clouds', 'light', 'path', 'birds'], focus: 'sky' },
    { at: 'une source de quiétude venue de leur Seigneur', motifs: ['folk', 'light', 'tent', 'path'], focus: 'light' },
    { at: 'avec des reliques laissées par', motifs: ['tablets', 'staff', 'light', 'tent'], focus: 'staff' },
  ],
  'talut-jalut-0-5': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['folk', 'throne', 'light', 'tent'], focus: 'throne' },
    { at: 'allait maintenant partir avec ses troupes', motifs: ['walkers', 'tent', 'path', 'footprints'], focus: 'walkers' },
  ],

  // ── Épisode 2 : la rivière et la bataille ──
  'talut-jalut-1-0': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['crowd', 'tent', 'path', 'footprints'], focus: 'crowd' },
    { at: 'Allah va vous éprouver par une rivière', ground: 'river', motifs: ['crowd', 'path', 'palms', 'sun'], focus: 'ground' },
  ],
  'talut-jalut-1-1': [
    { at: '', sky: 'day', ground: 'river', motifs: ['crowd', 'palms', 'sun', 'birds'], focus: 'palms' },
    { at: 'Mais ils en burent', motifs: ['crowd', 'jar', 'goblet', 'palms'], focus: 'goblet' },
  ],
  'talut-jalut-1-2': [
    { at: '', sky: 'dusk', ground: 'river', motifs: ['walkers', 'path', 'footprints', 'palms'], focus: 'footprints' },
    { at: 'certains dirent : « Nous n’avons aucune force', ground: 'plain', motifs: ['folk', 'footprints', 'path'], focus: 'horizon' },
  ],
  'talut-jalut-1-3': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['folk', 'light', 'path'], focus: 'folk' },
    { at: 'Combien de fois une petite troupe', sky: 'night', motifs: ['folk', 'stars', 'path', 'footprints'], focus: 'stars' },
    { at: 'Et Allah est avec les endurants', motifs: ['folk', 'light', 'tent', 'stars'], focus: 'light' },
  ],
  'talut-jalut-1-4': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['crowd', 'dark-clouds', 'path', 'wind'], focus: 'dark-clouds' },
    { at: 'ils prièrent', motifs: ['folk', 'light', 'footprints', 'path'], focus: 'footprints' },
  ],
  'talut-jalut-1-5': [{ at: '', sky: 'day', ground: 'plain', motifs: ['crowd', 'sun', 'light', 'throne', 'book'], focus: 'throne' }],
  'talut-jalut-1-6': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['crowd', 'tent', 'path', 'footprints', 'light'], focus: 'light' },
    { at: 'Et ce jour-là commença l’histoire de Daoud', motifs: ['crescent', 'throne', 'tent', 'folk'], focus: 'crescent' },
  ],
};
