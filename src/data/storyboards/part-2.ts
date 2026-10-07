import type { Storyboard } from '../types';

/*
 * Pictures of the stories of Lout, Ibrahim and Ismaïl.
 * Prophets, angels and messengers are never drawn: they stay light, lamp, footprints.
 * Ordinary people (the town, the father, the crowd) are silhouettes.
 */
export const BOARD_2: Storyboard = {
  // ───────────── Lout, épisode 1 : l'appel de Lout ─────────────
  'lut-0-0': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['path', 'footprints', 'palms', 'birds'], focus: 'footprints' },
    { at: 'Allah l’envoya à un peuple', ground: 'city', motifs: ['path', 'wall', 'house', 'light'], focus: 'light' },
    { at: 'qui vivait dans une cité', motifs: ['house', 'wall', 'crowd', 'birds'], focus: 'crowd' },
  ],
  'lut-0-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'wall', 'crowd', 'light'], focus: 'crowd' },
    { at: 'Je suis pour vous un messager', motifs: ['house', 'folk', 'light', 'lamp'], focus: 'lamp' },
    { at: 'Craignez Allah et obéissez-moi', motifs: ['wall', 'house', 'folk', 'birds'], focus: 'folk' },
  ],
  'lut-0-2': [{ at: '', sky: 'dusk', ground: 'city', motifs: ['lamp', 'house', 'light', 'folk'], focus: 'lamp' }],
  'lut-0-3': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['wall', 'house', 'lamp', 'crowd'], focus: 'crowd' },
    { at: 'et délaissaient les épouses', motifs: ['wall', 'house', 'folk', 'bats'], focus: 'folk' },
    { at: 'que leur Seigneur avait créées', motifs: ['house', 'lamp', 'light', 'birds'], focus: 'light' },
    { at: 'Vous êtes des gens transgresseurs', motifs: ['wall', 'house', 'dark-clouds', 'crowd'], focus: 'dark-clouds' },
  ],
  'lut-0-4': [
    { at: '', sky: 'night', ground: 'city', motifs: ['wall', 'house', 'moon', 'crowd'], focus: 'crowd' },
    { at: 'tu seras chassé d’ici', motifs: ['wall', 'path', 'moon', 'crowd'], focus: 'path' },
  ],
  'lut-0-5': [
    { at: '', sky: 'night', ground: 'city', motifs: ['wall', 'house', 'stars', 'folk', 'bats'], focus: 'house' },
    { at: 'puis il invoqua', motifs: ['house', 'lamp', 'light', 'stars'], focus: 'light' },
  ],
  'lut-0-6': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['path', 'footprints', 'light', 'birds'], focus: 'footprints' },
    { at: 'sauf une vieille femme', motifs: ['path', 'footprints', 'dark-clouds', 'birds'], focus: 'horizon' },
  ],
  'lut-0-7': [
    { at: '', sky: 'storm', ground: 'city', motifs: ['wall', 'house', 'dark-clouds', 'lightning', 'crowd'], focus: 'dark-clouds' },
    { at: 'fit pleuvoir sur eux une pluie', motifs: ['wall', 'house', 'dark-clouds', 'stones'], focus: 'stones' },
  ],
  'lut-0-8': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['ruins', 'wall', 'dark-clouds', 'birds'], focus: 'ruins' },
    { at: 'mais la plupart des gens ne croient pas', motifs: ['ruins', 'path', 'walkers', 'birds'], focus: 'walkers' },
    { at: 'Garder sa pureté', ground: 'desert', motifs: ['ruins', 'crescent', 'path', 'light'], focus: 'light' },
  ],

  // ───────────── Lout, épisode 2 : les anges chez Ibrahim puis chez Lout ─────────────
  'lut-1-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'wall', 'crowd', 'birds'], focus: 'crowd' },
    { at: 'Vous commettez une turpitude', motifs: ['wall', 'house', 'folk', 'clouds'], focus: 'folk' },
    { at: 'que personne dans l’univers', motifs: ['house', 'clouds', 'path', 'birds'], focus: 'sky' },
  ],
  'lut-1-1': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['path', 'footprints', 'walkers', 'clouds'], focus: 'walkers' },
    { at: 'et commettaient le blâmable', ground: 'city', motifs: ['pillars', 'wall', 'path', 'crowd'], focus: 'pillars' },
  ],
  'lut-1-2': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['wall', 'pillars', 'house', 'crowd'], focus: 'crowd' },
    { at: 'Fais venir sur nous le châtiment', motifs: ['wall', 'house', 'dark-clouds', 'crowd'], focus: 'dark-clouds' },
  ],
  'lut-1-3': [{ at: '', sky: 'night', ground: 'city', motifs: ['house', 'lamp', 'stars', 'light', 'bats'], focus: 'light' }],
  'lut-1-4': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['house', 'palms', 'sheep', 'birds'], focus: 'house', cut: true },
    { at: 'avec une bonne nouvelle', motifs: ['house', 'palms', 'light', 'sheep'], focus: 'light' },
    { at: 'qu’ils allaient anéantir', motifs: ['house', 'palms', 'path', 'dark-clouds'], focus: 'dark-clouds' },
    { at: 'car ils étaient injustes', motifs: ['path', 'dark-clouds', 'crowd', 'wall'], focus: 'crowd' },
  ],
  'lut-1-5': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['house', 'palms', 'path', 'birds'], focus: 'path' },
    { at: 'Écoutons leur échange', motifs: ['house', 'path', 'lamp', 'light', 'birds'], focus: 'lamp' },
  ],
  'lut-1-6': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['path', 'footprints', 'wall', 'house'], focus: 'footprints', cut: true },
    { at: 'il fut affligé pour eux', motifs: ['house', 'lamp', 'wall', 'bats'], focus: 'house' },
    { at: 'se sentit incapable', motifs: ['house', 'wall', 'lamp', 'path'], focus: 'wall' },
    { at: 'Ne crains rien et ne t’afflige pas', motifs: ['house', 'lamp', 'light', 'footprints'], focus: 'light' },
  ],
  'lut-1-7': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'lamp', 'dark-clouds', 'bats'], focus: 'sky' },
    { at: 'à cause de sa perversité', sky: 'storm', motifs: ['wall', 'house', 'dark-clouds', 'wind', 'crowd'], focus: 'dark-clouds' },
  ],
  'lut-1-8': [{ at: '', sky: 'dawn', ground: 'city', motifs: ['ruins', 'light', 'clouds', 'birds'], focus: 'ruins' }],
  'lut-1-9': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['ruins', 'path', 'clouds', 'birds'], focus: 'ruins' },
    { at: 'c’est la foi qui sauve', motifs: ['path', 'light', 'lamp'], focus: 'lamp' },
    { at: 'face au mal', motifs: ['path', 'light', 'walkers', 'birds'], focus: 'walkers' },
  ],

  // ───────────── Lout, épisode 3 : la nuit du départ ─────────────
  'lut-2-0': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['path', 'footprints', 'house', 'wall'], focus: 'path' },
    { at: 'il fut chagriné pour eux', motifs: ['house', 'lamp', 'wall', 'bats'], focus: 'lamp' },
    { at: 'Voici un jour terrible', motifs: ['house', 'wall', 'dark-clouds', 'bats'], focus: 'dark-clouds' },
  ],
  'lut-2-1': [
    { at: '', sky: 'night', ground: 'city', motifs: ['path', 'footprints', 'house', 'walkers', 'moon'], focus: 'walkers' },
    { at: 'Déjà auparavant, ils commettaient', motifs: ['wall', 'house', 'crowd', 'moon'], focus: 'crowd' },
  ],
  'lut-2-2': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'lamp', 'crowd', 'moon'], focus: 'lamp' },
    { at: 'et ne me déshonorez pas', motifs: ['house', 'wall', 'crowd', 'moon'], focus: 'crowd' },
    { at: 'N’y a-t-il pas parmi vous', motifs: ['house', 'lamp', 'folk', 'path', 'moon'], focus: 'path' },
  ],
  'lut-2-3': [
    { at: '', sky: 'night', ground: 'city', motifs: ['wall', 'house', 'crowd', 'moon'], focus: 'wall' },
    { at: 'Ah, si j’avais la force', motifs: ['wall', 'rock', 'house', 'moon'], focus: 'rock' },
  ],
  'lut-2-4': [{ at: '', sky: 'night', ground: 'city', motifs: ['house', 'path', 'light', 'stars', 'bats'], focus: 'light' }],
  'lut-2-5': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'path', 'footprints', 'stars', 'bats'], focus: 'footprints' },
    { at: 'comme les messagers le lui avaient ordonné', ground: 'desert', motifs: ['path', 'footprints', 'stars'], focus: 'horizon' },
  ],
  'lut-2-6': [{ at: '', sky: 'dawn', ground: 'city', motifs: ['wall', 'house', 'stones', 'dark-clouds'], focus: 'stones', cut: true }],
  'lut-2-7': [
    { at: '', sky: 'day', ground: 'city', motifs: ['ruins', 'stones', 'wall'], focus: 'stones' },
    { at: 'Et un tel châtiment n’est pas loin', sky: 'dusk', ground: 'desert', motifs: ['ruins', 'crescent', 'path', 'bats'], focus: 'crescent' },
  ],
  'lut-2-8': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['ruins', 'lamp', 'light', 'crowd'], focus: 'lamp' },
    { at: 'Honorer ses hôtes', ground: 'valley', motifs: ['house', 'lamp', 'sun', 'light', 'sheep'], focus: 'house' },
    { at: 'demander le secours d’Allah', motifs: ['lamp', 'light', 'sun', 'palms', 'birds'], focus: 'light' },
  ],

  // ───────────── Ibrahim, épisode 1 : l'étoile, la lune et le soleil ─────────────
  'ibrahim-0-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['pillars', 'house', 'wall', 'crowd'], focus: 'crowd' },
    { at: 'Il dit à son père Azar', motifs: ['house', 'path', 'folk', 'lamp'], focus: 'folk' },
    { at: 'Prends-tu des idoles pour', motifs: ['pillars', 'house', 'folk', 'wall'], focus: 'pillars' },
    { at: 'Je te vois, toi et ton peuple', motifs: ['pillars', 'wall', 'path', 'crowd'], focus: 'path' },
  ],
  'ibrahim-0-1': [{ at: '', sky: 'night', ground: 'plain', motifs: ['path', 'stars', 'bright-star', 'bats'], focus: 'sky' }],
  'ibrahim-0-2': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['stars', 'path', 'bats'], focus: 'horizon' },
    { at: 'il vit une étoile', motifs: ['stars', 'bright-star', 'path', 'bats'], focus: 'bright-star' },
    { at: 'Mais quand elle disparut', motifs: ['stars', 'path', 'bats'], focus: 'sky' },
    { at: 'Je n’aime pas les choses', motifs: ['path', 'footprints', 'stars', 'bats'], focus: 'footprints' },
  ],
  'ibrahim-0-3': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['moon', 'stars', 'path', 'camel'], focus: 'moon' },
    { at: 'Quand elle disparut à son tour', motifs: ['stars', 'path', 'camel'], focus: 'sky' },
    { at: 'Si mon Seigneur ne me guide pas', motifs: ['stars', 'path', 'footprints', 'bats'], focus: 'footprints' },
  ],
  'ibrahim-0-4': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['sun', 'path', 'light', 'birds'], focus: 'sun' },
    { at: 'celui-ci est plus grand', sky: 'day', motifs: ['sun', 'light', 'birds', 'sheep'], focus: 'sun' },
    { at: 'Mais le soleil, lui aussi, disparut', sky: 'dusk', motifs: ['sun', 'path', 'sheep'], focus: 'horizon' },
  ],
  'ibrahim-0-5': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['pillars', 'house', 'sun', 'crowd'], focus: 'crowd' },
    { at: 'qu’il désavouait', motifs: ['pillars', 'wall', 'crowd', 'sun'], focus: 'pillars' },
    { at: 'et il déclara', motifs: ['sun', 'light', 'pillars', 'birds'], focus: 'light' },
  ],
  'ibrahim-0-6': [
    { at: '', sky: 'day', ground: 'city', motifs: ['pillars', 'house', 'wall', 'crowd'], focus: 'crowd' },
    { at: 'Il répondit qu’il ne craignait pas', motifs: ['pillars', 'house', 'path', 'folk'], focus: 'path' },
    { at: 'il ne craignait que ce que veut', motifs: ['house', 'light', 'lamp', 'folk'], focus: 'light' },
    { at: 'dont la science embrasse', motifs: ['pillars', 'book', 'light', 'birds'], focus: 'book' },
  ],
  'ibrahim-0-7': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['pillars', 'house', 'path', 'crowd'], focus: 'path' },
    { at: 'Voici la réponse', ground: 'valley', motifs: ['path', 'light', 'palms', 'house', 'sheep'], focus: 'light' },
  ],
  'ibrahim-0-8': [
    { at: '', sky: 'night', ground: 'valley', motifs: ['light', 'path', 'stars', 'bats'], focus: 'light' },
    { at: 'Regarder le ciel, les étoiles', ground: 'mountains', motifs: ['stars', 'crescent', 'bright-star', 'bats'], focus: 'sky' },
    { at: 'peut nous mener à leur Créateur', motifs: ['stars', 'bright-star', 'light', 'bats'], focus: 'light' },
  ],

  // ───────────── Ibrahim, épisode 2 : « Ô mon père… » ─────────────
  'ibrahim-1-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'wall', 'light', 'birds'], focus: 'house' },
    { at: 'il était très véridique', motifs: ['house', 'book', 'light'], focus: 'book' },
    { at: 'c’était un prophète', motifs: ['house', 'lamp', 'light', 'birds'], focus: 'lamp' },
  ],
  'ibrahim-1-1': [{ at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'lamp', 'pillars', 'folk'], focus: 'lamp' }],
  'ibrahim-1-2': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'lamp', 'folk', 'light'], focus: 'folk' },
    { at: 'une science que tu n’as pas reçue', motifs: ['house', 'lamp', 'book', 'folk'], focus: 'book' },
    { at: 'Suis-moi, je te guiderai', ground: 'plain', motifs: ['path', 'footprints', 'house', 'lamp', 'sheep'], focus: 'footprints' },
    { at: 'sur une voie droite', motifs: ['path', 'footprints', 'light', 'sheep'], focus: 'path' },
  ],
  'ibrahim-1-3': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['path', 'moon', 'stars', 'house'], focus: 'path' },
    { at: 'Je crains qu’un châtiment', motifs: ['path', 'moon', 'dark-clouds', 'folk'], focus: 'dark-clouds' },
    { at: 'du Tout Miséricordieux', motifs: ['path', 'moon', 'light', 'folk'], focus: 'light' },
  ],
  'ibrahim-1-4': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['pillars', 'house', 'dark-clouds', 'folk'], focus: 'pillars' },
    { at: 'Si tu ne cesses pas', motifs: ['wall', 'pillars', 'house', 'crowd'], focus: 'wall' },
    { at: 'Éloigne-toi de moi', motifs: ['path', 'footprints', 'wall', 'folk'], focus: 'path' },
  ],
  'ibrahim-1-5': [{ at: '', sky: 'dawn', ground: 'plain', motifs: ['path', 'footprints', 'light', 'birds'], focus: 'light' }],
  'ibrahim-1-6': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['path', 'footprints', 'house', 'folk'], focus: 'footprints' },
    { at: 'et se tourna vers son Seigneur', motifs: ['path', 'footprints', 'light', 'sun', 'birds'], focus: 'light' },
    { at: 'espérant ne pas être déçu', motifs: ['path', 'light', 'sun', 'lamp', 'birds'], focus: 'lamp' },
  ],
  'ibrahim-1-7': [{ at: '', sky: 'day', ground: 'valley', motifs: ['palms', 'light', 'cradle', 'sheep', 'birds'], focus: 'cradle' }],
  'ibrahim-1-8': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['house', 'palms', 'folk', 'sheep'], focus: 'house' },
    { at: 'et rester doux et respectueux', motifs: ['house', 'lamp', 'folk'], focus: 'lamp' },
    { at: 'C’est la belle leçon', motifs: ['house', 'lamp', 'light', 'sheep'], focus: 'light' },
  ],

  // ───────────── Ibrahim, épisode 3 : les idoles brisées et le feu ─────────────
  'ibrahim-2-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['light', 'house', 'wall', 'birds'], focus: 'light' },
    { at: 'Il demanda à son père et à son peuple', motifs: ['pillars', 'house', 'wall', 'folk'], focus: 'folk' },
    { at: 'Que sont ces statues', motifs: ['pillars', 'wall', 'crowd'], focus: 'pillars' },
  ],
  'ibrahim-2-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'pillars', 'crowd', 'footprints'], focus: 'crowd' },
    { at: 'Vous et vos ancêtres', motifs: ['house', 'pillars', 'folk', 'light'], focus: 'light' },
    { at: 'dans un égarement évident', motifs: ['pillars', 'path', 'crowd', 'clouds'], focus: 'clouds' },
  ],
  'ibrahim-2-2': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'crescent', 'clouds', 'crowd'], focus: 'crescent' },
    { at: 'est le Seigneur des cieux', motifs: ['crescent', 'stars', 'house', 'birds'], focus: 'sky' },
    { at: 'Puis il jura de ruser', motifs: ['pillars', 'house', 'crescent', 'crowd'], focus: 'pillars' },
    { at: 'une fois qu’ils seraient partis', motifs: ['pillars', 'path', 'footprints', 'walkers'], focus: 'walkers' },
  ],
  'ibrahim-2-3': [{ at: '', sky: 'night', ground: 'city', motifs: ['pillars', 'ruins', 'moon', 'bats'], focus: 'ruins' }],
  'ibrahim-2-4': [
    { at: '', sky: 'day', ground: 'city', motifs: ['path', 'footprints', 'ruins', 'crowd'], focus: 'crowd' },
    { at: 'Certains dirent', motifs: ['ruins', 'house', 'folk', 'wall'], focus: 'folk' },
    { at: 'On l’appelle Ibrahim', motifs: ['ruins', 'pillars', 'crowd', 'house'], focus: 'pillars' },
  ],
  'ibrahim-2-5': [
    { at: '', sky: 'day', ground: 'city', motifs: ['pillars', 'ruins', 'wall', 'crowd'], focus: 'crowd' },
    { at: 'Il répondit', motifs: ['pillars', 'ruins', 'folk'], focus: 'pillars' },
  ],
  'ibrahim-2-6': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['pillars', 'ruins', 'house', 'crowd'], focus: 'house' },
    { at: 'Ibrahim dit', motifs: ['house', 'lamp', 'ruins', 'folk'], focus: 'lamp' },
    { at: 'ce qui ne peut ni vous être utile', motifs: ['house', 'lamp', 'ruins', 'crowd', 'bats'], focus: 'crowd' },
  ],
  'ibrahim-2-7': [
    { at: '', sky: 'night', ground: 'city', motifs: ['pillars', 'house', 'fire', 'crowd'], focus: 'fire' },
    { at: 'Mais Allah dit au feu', ground: 'plain', motifs: ['fire', 'light', 'stars'], focus: 'light' },
  ],
  'ibrahim-2-8': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['fire', 'crowd', 'path', 'clouds'], focus: 'crowd' },
    { at: 'Allah sauva Ibrahim', ground: 'valley', motifs: ['path', 'footprints', 'palms', 'light', 'birds'], focus: 'footprints' },
    { at: 'vers une terre bénie', motifs: ['path', 'palms', 'sun', 'light', 'birds'], focus: 'sun' },
  ],
  'ibrahim-2-9': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['palms', 'cradle', 'light', 'butterflies'], focus: 'cradle' },
    { at: 'et fit d’eux des guides', motifs: ['tree', 'light', 'path', 'birds'], focus: 'path' },
    { at: 'accomplissaient la prière', motifs: ['tree', 'lamp', 'light', 'butterflies'], focus: 'lamp' },
  ],

  // ───────────── Ibrahim, épisode 4 : face au roi ─────────────
  'ibrahim-3-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'wall', 'path', 'birds'], focus: 'palace' },
    { at: 'Allah avait donné la royauté', motifs: ['palace', 'throne', 'light', 'crowd'], focus: 'throne' },
    { at: 'mais il disputa avec Ibrahim', motifs: ['palace', 'throne', 'folk', 'pillars'], focus: 'folk' },
  ],
  'ibrahim-3-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'wheat', 'withered', 'birds'], focus: 'wheat' },
    { at: 'Le roi répondit', motifs: ['palace', 'throne', 'folk', 'withered'], focus: 'throne' },
    { at: 'je donne la vie', motifs: ['palace', 'throne', 'crowd', 'wheat'], focus: 'crowd' },
  ],
  'ibrahim-3-2': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['palace', 'sun', 'light', 'birds'], focus: 'sun' },
    { at: 'que nul ne pouvait contredire', ground: 'plain', motifs: ['sun', 'light', 'path', 'birds'], focus: 'horizon' },
  ],
  'ibrahim-3-3': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['sun', 'light', 'path', 'birds'], focus: 'sun' },
    { at: 'Le roi ne pouvait pas', sky: 'dusk', motifs: ['sun', 'throne', 'path', 'folk'], focus: 'throne' },
    { at: 'le mécréant resta confondu', motifs: ['throne', 'path', 'crowd', 'sun'], focus: 'crowd' },
  ],
  'ibrahim-3-4': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['throne', 'path', 'dark-clouds', 'crowd'], focus: 'dark-clouds' },
    { at: 'La vérité se défend', sky: 'day', motifs: ['path', 'light', 'sun', 'birds'], focus: 'light' },
    { at: 'comme ceux d’Ibrahim', motifs: ['path', 'light', 'sun', 'sheep', 'birds'], focus: 'sheep' },
  ],

  // ───────────── Ibrahim, épisode 5 : les quatre oiseaux ─────────────
  'ibrahim-4-0': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['light', 'tree', 'path', 'birds'], focus: 'horizon' },
    { at: 'montre-moi comment Tu redonnes', motifs: ['light', 'withered', 'path'], focus: 'withered' },
    { at: 'la vie aux morts', motifs: ['light', 'withered', 'birds'], focus: 'birds' },
  ],
  'ibrahim-4-1': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['clouds', 'light', 'withered', 'birds'], focus: 'sky' },
    { at: 'Ibrahim répondit', motifs: ['lamp', 'light', 'withered', 'birds'], focus: 'lamp' },
    { at: 'Mais que mon cœur soit rassuré', motifs: ['lamp', 'light', 'birds', 'path'], focus: 'birds' },
  ],
  'ibrahim-4-2': [{ at: '', sky: 'day', ground: 'mountains', motifs: ['birds', 'light', 'path'], focus: 'birds' }],
  'ibrahim-4-3': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['birds', 'path'], focus: 'birds' },
    { at: 'placer une part d’eux sur des monts', motifs: ['path', 'light', 'sun'], focus: 'ground' },
    { at: 'puis les appeler', sky: 'dusk', motifs: ['birds', 'path', 'sun', 'light'], focus: 'birds' },
  ],
  'ibrahim-4-4': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['birds', 'light', 'path'], focus: 'birds' },
    { at: 'Il est permis de Lui demander', ground: 'valley', motifs: ['lamp', 'light', 'path', 'palms', 'birds'], focus: 'lamp' },
    { at: 'comme l’a fait Ibrahim', motifs: ['birds', 'light', 'path', 'palms'], focus: 'birds' },
  ],

  // ───────────── Ibrahim, épisode 6 : les hôtes et la bonne nouvelle ─────────────
  'ibrahim-5-0': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['palms', 'house', 'sheep', 'birds'], focus: 'house' },
    { at: 'vinrent chez Ibrahim', motifs: ['palms', 'house', 'path', 'footprints', 'sheep'], focus: 'footprints' },
    { at: 'porteurs d’une bonne nouvelle', motifs: ['palms', 'house', 'light', 'birds'], focus: 'light' },
  ],
  'ibrahim-5-1': [{ at: '', sky: 'day', ground: 'desert', motifs: ['house', 'table', 'palms', 'birds'], focus: 'table' }],
  'ibrahim-5-2': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['table', 'lamp', 'house', 'bats'], focus: 'table' },
    { at: 'il eut peur d’eux', motifs: ['table', 'lamp', 'house'], focus: 'lamp' },
    { at: 'nous sommes envoyés au peuple de Lout', motifs: ['table', 'lamp', 'path', 'crowd'], focus: 'crowd' },
  ],
  'ibrahim-5-3': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['house', 'palm', 'lamp', 'birds'], focus: 'house' },
    { at: 'Et Allah lui annonça la naissance', motifs: ['house', 'palm', 'cradle', 'light'], focus: 'cradle' },
    { at: 'et après Ishaq, celle de Yacoub', motifs: ['house', 'cradle', 'light', 'palm', 'sheep'], focus: 'light' },
  ],
  'ibrahim-5-4': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['house', 'crescent', 'palm', 'cradle'], focus: 'cradle' },
    { at: 'alors qu’elle était âgée', motifs: ['house', 'withered', 'crescent', 'bats'], focus: 'withered' },
    { at: 'et que son mari était un vieillard', motifs: ['house', 'withered', 'lamp', 'crescent'], focus: 'lamp' },
  ],
  'ibrahim-5-5': [{ at: '', sky: 'night', ground: 'desert', motifs: ['house', 'light', 'stars', 'bats'], focus: 'light' }],
  'ibrahim-5-6': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['house', 'light', 'path', 'birds'], focus: 'light' },
    { at: 'et que la bonne nouvelle', motifs: ['house', 'light', 'palms', 'birds'], focus: 'palms' },
    { at: 'Ibrahim se mit à plaider', ground: 'plain', motifs: ['path', 'footprints', 'lamp', 'birds'], focus: 'path' },
    { at: 'en faveur du peuple de Lout', motifs: ['path', 'lamp', 'crowd', 'footprints'], focus: 'crowd' },
  ],
  'ibrahim-5-7': [{ at: '', sky: 'day', ground: 'valley', motifs: ['palms', 'light', 'path', 'birds', 'sheep'], focus: 'light' }],
  'ibrahim-5-8': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['palms', 'path', 'dark-clouds', 'birds'], focus: 'dark-clouds' },
    { at: 'l’ordre de ton Seigneur', motifs: ['palms', 'path', 'light', 'dark-clouds'], focus: 'light' },
    { at: 'La suite de cette histoire', ground: 'city', motifs: ['wall', 'house', 'path', 'dark-clouds', 'crowd'], focus: 'wall' },
  ],

  // ───────────── Ismaïl, épisode 1 : le songe et l'immolation rachetée ─────────────
  'ismail-0-0': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'path', 'footprints', 'crowd'], focus: 'house' },
    { at: 'Je pars vers mon Seigneur', ground: 'desert', motifs: ['path', 'footprints', 'light', 'birds'], focus: 'horizon' },
  ],
  'ismail-0-1': [{ at: '', sky: 'night', ground: 'desert', motifs: ['path', 'stars', 'light', 'lamp', 'bats'], focus: 'light' }],
  'ismail-0-2': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['light', 'palms', 'cradle', 'birds'], focus: 'cradle' },
    { at: 'Le Coran ne nomme pas ce fils', motifs: ['palms', 'cradle', 'light', 'sun', 'sheep'], focus: 'sun' },
    { at: 'mais la plupart des savants', motifs: ['palms', 'book', 'folk', 'sun'], focus: 'folk' },
    { at: 'qu’il s’agit d’Ismaïl', motifs: ['cradle', 'palms', 'light', 'sun'], focus: 'cradle' },
  ],
  'ismail-0-3': [
    { at: '', sky: 'night', ground: 'valley', motifs: ['palms', 'path', 'moon', 'stars', 'bats'], focus: 'path' },
    { at: 'd’un songe', motifs: ['moon', 'stars', 'light', 'bats'], focus: 'moon' },
  ],
  'ismail-0-4': [{ at: '', sky: 'day', ground: 'plain', motifs: ['path', 'footprints', 'sun', 'light', 'birds'], focus: 'footprints' }],
  'ismail-0-5': [{ at: '', sky: 'day', ground: 'plain', motifs: ['light', 'clouds', 'path', 'footprints', 'birds'], focus: 'light' }],
  'ismail-0-6': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['light', 'path', 'sun', 'birds'], focus: 'sun' },
    { at: 'Et Allah racheta le fils', motifs: ['light', 'sheep', 'path'], focus: 'sheep' },
  ],
  'ismail-0-7': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['palms', 'book', 'light', 'birds'], focus: 'book' },
    { at: 'parmi les générations suivantes', motifs: ['palms', 'book', 'crowd', 'light'], focus: 'crowd' },
    { at: 'Puis Il lui annonça', motifs: ['palms', 'cradle', 'light', 'stars', 'sheep'], focus: 'cradle' },
    { at: 'prophète parmi les vertueux', motifs: ['palms', 'light', 'stars', 'book', 'folk'], focus: 'folk' },
  ],
  'ismail-0-8': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['light', 'birds', 'path', 'goat'], focus: 'light' },
    { at: 'et Allah les a honorés', motifs: ['light', 'path', 'birds', 'sun'], focus: 'sun' },
    { at: 'Ibrahim prie dans une vallée', ground: 'valley', motifs: ['path', 'light', 'clouds', 'birds'], focus: 'ground' },
  ],

  // ───────────── Ismaïl, épisode 2 : une vallée sans culture ─────────────
  'ismail-1-0': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['light', 'path', 'palms', 'birds'], focus: 'horizon' },
    { at: 'Il commença ainsi', motifs: ['kaaba', 'light', 'path', 'birds'], focus: 'kaaba' },
    { at: 'fais de cette cité un lieu sûr', motifs: ['kaaba', 'light', 'palms', 'sheep'], focus: 'palms' },
  ],
  'ismail-1-1': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['kaaba', 'light', 'birds'], focus: 'kaaba' },
    { at: 'de l’adoration des idoles', motifs: ['kaaba', 'light', 'lamp', 'birds'], focus: 'lamp' },
    { at: 'car elles avaient égaré beaucoup de gens', motifs: ['kaaba', 'path', 'crowd', 'clouds'], focus: 'crowd' },
  ],
  'ismail-1-2': [{ at: '', sky: 'day', ground: 'valley', motifs: ['kaaba', 'footprints', 'palm', 'dates', 'birds'], focus: 'dates' }],
  'ismail-1-3': [
    { at: '', sky: 'night', ground: 'valley', motifs: ['kaaba', 'lamp', 'stars', 'bats'], focus: 'lamp' },
    { at: 'Rien n’échappe à Allah', motifs: ['kaaba', 'stars', 'light', 'bats'], focus: 'light' },
    { at: 'ni dans le ciel', motifs: ['kaaba', 'stars', 'crescent', 'bright-star', 'bats'], focus: 'sky' },
  ],
  'ismail-1-4': [{ at: '', sky: 'dawn', ground: 'valley', motifs: ['sun', 'light', 'cradle', 'birds'], focus: 'cradle' }],
  'ismail-1-5': [{ at: '', sky: 'day', ground: 'valley', motifs: ['kaaba', 'birds', 'light'], focus: 'kaaba' }],
  'ismail-1-6': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['kaaba', 'crescent', 'path', 'bats'], focus: 'crescent' },
    { at: 'pour ses parents et pour les croyants', motifs: ['kaaba', 'crescent', 'folk', 'lamp'], focus: 'folk' },
    { at: 'au jour où l’on rendra des comptes', motifs: ['kaaba', 'book', 'stars', 'crescent'], focus: 'book' },
  ],
  'ismail-1-7': [
    { at: '', sky: 'night', ground: 'valley', motifs: ['kaaba', 'lamp', 'light', 'folk'], focus: 'lamp' },
    { at: 'afin qu’elles soient fidèles', motifs: ['kaaba', 'light', 'stars', 'bats'], focus: 'light' },
    { at: 'Dans l’épisode suivant', motifs: ['kaaba', 'wall', 'light', 'stars'], focus: 'wall' },
  ],

  // ───────────── Ismaïl, épisode 3 : la construction de la Maison ─────────────
  'ismail-2-0': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['light', 'path', 'camel', 'birds'], focus: 'path' },
    { at: 'et Ibrahim les accomplit', motifs: ['path', 'footprints', 'light', 'camel'], focus: 'footprints' },
    { at: 'un exemple à suivre pour les gens', motifs: ['footprints', 'path', 'walkers', 'light'], focus: 'walkers' },
  ],
  'ismail-2-1': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['path', 'footprints', 'cradle', 'birds'], focus: 'cradle' },
    { at: 'Allah répondit que Son engagement', motifs: ['path', 'stars', 'dark-clouds', 'crowd'], focus: 'dark-clouds' },
  ],
  'ismail-2-2': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['kaaba', 'path', 'footprints', 'walkers'], focus: 'walkers' },
    { at: 'Il demanda à Ibrahim et à Ismaïl de la purifier', motifs: ['kaaba', 'light', 'lamp', 'birds'], focus: 'light' },
    { at: 'pour ceux qui tournent autour', motifs: ['kaaba', 'crowd', 'footprints', 'palm'], focus: 'crowd' },
    { at: 'qui s’inclinent et se prosternent', motifs: ['kaaba', 'crowd', 'light', 'palm', 'birds'], focus: 'light' },
  ],
  'ismail-2-3': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['kaaba', 'light', 'palm', 'birds'], focus: 'kaaba' },
    { at: 'et nourris de fruits', motifs: ['kaaba', 'palm', 'dates', 'birds'], focus: 'dates' },
    { at: 'qui croient en Allah', motifs: ['kaaba', 'dates', 'palm', 'folk'], focus: 'folk' },
  ],
  'ismail-2-4': [{ at: '', sky: 'day', ground: 'valley', motifs: ['kaaba', 'wall', 'sun', 'birds'], focus: 'wall' }],
  'ismail-2-5': [{ at: '', sky: 'dusk', ground: 'valley', motifs: ['kaaba', 'lamp', 'light', 'birds'], focus: 'lamp' }],
  'ismail-2-6': [
    { at: '', sky: 'night', ground: 'valley', motifs: ['kaaba', 'stars', 'lamp', 'bats'], focus: 'lamp' },
    { at: 'pour leur descendance', motifs: ['kaaba', 'book', 'stars', 'bats'], focus: 'book' },
  ],
  'ismail-2-7': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['kaaba', 'wall', 'light', 'birds'], focus: 'kaaba' },
    { at: 'ils demandèrent à Allah de l’accepter', motifs: ['kaaba', 'light', 'lamp'], focus: 'lamp' },
    { at: 'Faisons de même', motifs: ['kaaba', 'sun', 'light', 'palms', 'birds'], focus: 'sun' },
  ],

  // ───────────── Ismaïl, épisode 4 : fidèle à ses promesses ─────────────
  'ismail-3-0': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['kaaba', 'light', 'path', 'birds'], focus: 'kaaba' },
    { at: 'en quelques mots précieux', motifs: ['kaaba', 'book', 'light', 'birds'], focus: 'book' },
  ],
  'ismail-3-1': [{ at: '', sky: 'day', ground: 'valley', motifs: ['book', 'light', 'kaaba', 'birds'], focus: 'book' }],
  'ismail-3-2': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['path', 'footprints', 'sun', 'sheep'], focus: 'footprints' },
    { at: 'c’est la première qualité', motifs: ['book', 'light', 'sun', 'birds'], focus: 'book' },
    { at: 'avant même de l’appeler messager', motifs: ['book', 'kaaba', 'light', 'sun', 'birds'], focus: 'kaaba' },
  ],
  'ismail-3-3': [{ at: '', sky: 'dusk', ground: 'valley', motifs: ['house', 'lamp', 'kaaba', 'light', 'sheep'], focus: 'lamp' }],
  'ismail-3-4': [
    { at: '', sky: 'night', ground: 'valley', motifs: ['house', 'lamp', 'stars', 'bats'], focus: 'lamp' },
    { at: 'et la zakat, l’aumône obligatoire', motifs: ['house', 'lamp', 'coins', 'stars'], focus: 'coins' },
    { at: 'Et son Seigneur l’agréait', motifs: ['house', 'lamp', 'light', 'stars', 'bats'], focus: 'light' },
  ],
  'ismail-3-5': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['house', 'lamp', 'sun', 'light', 'folk'], focus: 'lamp' },
    { at: 'Ainsi s’achève l’histoire', motifs: ['kaaba', 'sun', 'light', 'path', 'birds'], focus: 'kaaba' },
  ],
};
