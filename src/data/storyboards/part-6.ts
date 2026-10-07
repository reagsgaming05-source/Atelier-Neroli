import type { Storyboard } from '../types';

/*
 * Pictures of the stories of Issa, the People of the Cave, Dhoul-Qarnayn,
 * Louqmane and the Two Gardens.
 */
export const BOARD_6: Storyboard = {
  // ───────────── ISA ─────────────
  // Épisode 1 : il parla dans le berceau
  'isa-0-0': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['palm', 'path', 'footprints', 'sun'], focus: 'footprints' },
    { at: 'Cet enfant, c’est Issa', motifs: ['palm', 'path', 'cradle', 'light'], focus: 'cradle' },
  ],
  'isa-0-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'wall', 'path'], focus: 'house' },
    { at: 'Ô sœur de Haroun', motifs: ['house', 'wall', 'path', 'light'], focus: 'light' },
  ],
  'isa-0-2': [
    { at: '', motifs: ['house', 'wall', 'cradle', 'path'], focus: 'cradle' },
    { at: 'Ils s’étonnèrent', motifs: ['house', 'wall', 'cradle'], focus: 'wall' },
  ],
  'isa-0-3': [{ at: '', sky: 'day', ground: 'none', motifs: ['cradle', 'light', 'book'], focus: 'cradle' }],
  'isa-0-4': [
    { at: '', sky: 'dusk', ground: 'none', motifs: ['cradle', 'light', 'crescent'], focus: 'cradle' },
    { at: 'lui avait recommandé la prière', motifs: ['cradle', 'lamp', 'crescent'], focus: 'lamp' },
  ],
  'isa-0-5': [{ at: '', sky: 'night', ground: 'none', motifs: ['cradle', 'stars', 'moon', 'light'], focus: 'stars' }],
  'isa-0-6': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['cradle', 'stars', 'bright-star'], focus: 'bright-star' },
    { at: 'Et Allah dit :', motifs: ['stars', 'bright-star', 'light'], focus: 'light' },
  ],
  'isa-0-7': [{ at: '', sky: 'dawn', ground: 'plain', motifs: ['path', 'light', 'footprints'], focus: 'path' }],
  'isa-0-8': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['tree', 'cradle', 'sun', 'path'], focus: 'cradle' },
    { at: 'Son message est clair', motifs: ['tree', 'path', 'light', 'sun'], focus: 'light' },
  ],

  // Épisode 2 : le message et les miracles
  'isa-1-0': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['book', 'scroll', 'house'], focus: 'book' },
    { at: 'Puis Il l’envoya comme messager', motifs: ['house', 'path', 'light', 'scroll'], focus: 'path' },
  ],
  'isa-1-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'path', 'light'], focus: 'light' },
    { at: 'Avec de l’argile', motifs: ['house', 'stones', 'light'], focus: 'stones' },
    { at: 'puis soufflait dedans', motifs: ['house', 'stones', 'wind'], focus: 'wind' },
    { at: 'elle devenait un oiseau', motifs: ['house', 'birds', 'light'], focus: 'birds' },
  ],
  'isa-1-2': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'lamp', 'light', 'birds'], focus: 'lamp' },
    { at: 'Il leur disait même', motifs: ['house', 'table', 'bread', 'jar'], focus: 'table' },
  ],
  'isa-1-3': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'tablets', 'scroll'], focus: 'tablets' },
    { at: 'Il disait : « Craignez Allah', motifs: ['house', 'tablets', 'light'], focus: 'light' },
  ],
  'isa-1-4': [{ at: '', sky: 'dawn', ground: 'plain', motifs: ['path', 'light', 'footprints'], focus: 'path' }],
  'isa-1-5': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'path', 'dark-clouds'], focus: 'dark-clouds' },
    { at: 'Alors il demanda', motifs: ['house', 'path', 'lamp', 'dark-clouds'], focus: 'lamp' },
  ],
  'isa-1-6': [{ at: '', sky: 'dusk', ground: 'plain', motifs: ['lamp', 'footprints', 'path', 'crescent'], focus: 'footprints' }],
  'isa-1-7': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['lamp', 'stars', 'path'], focus: 'lamp' },
    { at: 'Inscris-nous parmi ceux qui témoignent', motifs: ['lamp', 'stars', 'book'], focus: 'book' },
  ],
  'isa-1-8': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'wall', 'dark-clouds'], focus: 'wall' },
    { at: 'Allah fit échouer leur complot', sky: 'storm', motifs: ['house', 'wall', 'dark-clouds', 'wind', 'lightning'], focus: 'lightning' },
  ],
  'isa-1-9': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'light', 'birds'], focus: 'light' },
    { at: 'Et nous aussi', ground: 'valley', motifs: ['light', 'path', 'lamp', 'tree'], focus: 'lamp' },
  ],

  // Épisode 3 : la table servie
  'isa-2-0': [
    { at: '', sky: 'dawn', ground: 'none', motifs: ['light', 'stars'], focus: 'light' },
    { at: 'à lui et à sa mère', ground: 'valley', motifs: ['light', 'cradle', 'palm'], focus: 'cradle' },
  ],
  'isa-2-1': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['light', 'palm', 'cradle'], focus: 'light' },
    { at: 'Issa parla aux gens dès le berceau', motifs: ['cradle', 'palm', 'light'], focus: 'cradle' },
    { at: 'Allah lui enseigna le Livre', motifs: ['book', 'scroll', 'tablets', 'light'], focus: 'book' },
  ],
  'isa-2-2': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['stones', 'palm', 'light'], focus: 'stones' },
    { at: 'l’aveugle-né et le lépreux', motifs: ['birds', 'lamp', 'light', 'palm'], focus: 'lamp' },
    { at: 'À chaque fois, Allah dit', motifs: ['birds', 'light', 'sun'], focus: 'sun' },
  ],
  'isa-2-3': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['wall', 'house', 'light'], focus: 'wall' },
    { at: 'Mais ceux qui refusaient de croire', motifs: ['wall', 'house', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'isa-2-4': [
    { at: '', sky: 'night', ground: 'city', motifs: ['lamp', 'stars', 'house', 'wall'], focus: 'lamp' },
    { at: 'Ils dirent : « Nous croyons', ground: 'plain', motifs: ['lamp', 'stars', 'moon', 'path'], focus: 'moon' },
  ],
  'isa-2-5': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['palm', 'path', 'footprints'], focus: 'footprints' },
    { at: 'ton Seigneur peut-Il faire descendre du ciel', motifs: ['palm', 'path', 'clouds'], focus: 'sky' },
    { at: 'Il répondit : « Craignez Allah', motifs: ['palm', 'clouds', 'light'], focus: 'light' },
  ],
  'isa-2-6': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['wheat', 'bread', 'clouds'], focus: 'bread' },
    { at: 'rassurer nos cœurs', motifs: ['wheat', 'lamp', 'clouds'], focus: 'lamp' },
  ],
  'isa-2-7': [{ at: '', sky: 'day', ground: 'plain', motifs: ['clouds', 'light', 'wheat', 'lamp'], focus: 'sky' }],
  'isa-2-8': [{ at: '', sky: 'dusk', ground: 'plain', motifs: ['table', 'bread', 'goblet', 'light', 'crescent'], focus: 'table' }],
  'isa-2-9': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['sun', 'light', 'palm', 'table'], focus: 'sun' },
    { at: 'Toute force vient de Lui', motifs: ['sun', 'light', 'palm', 'birds'], focus: 'sky' },
  ],

  // Épisode 4 : l'annonce d'Ahmad
  'isa-3-0': [{ at: '', sky: 'day', ground: 'city', motifs: ['house', 'pillars', 'path'], focus: 'pillars' }],
  'isa-3-1': [{ at: '', sky: 'day', ground: 'city', motifs: ['pillars', 'house', 'wall', 'light'], focus: 'light' }],
  'isa-3-2': [{ at: '', sky: 'day', ground: 'city', motifs: ['tablets', 'scroll', 'pillars'], focus: 'scroll' }],
  'isa-3-3': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['scroll', 'path', 'bright-star'], focus: 'path' },
    { at: 'et son nom serait Ahmad', motifs: ['path', 'bright-star', 'light'], focus: 'bright-star' },
  ],
  'isa-3-4': [{ at: '', sky: 'dawn', ground: 'desert', motifs: ['scroll', 'light', 'bright-star', 'path'], focus: 'scroll' }],
  'isa-3-5': [{ at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'path', 'scroll', 'dark-clouds'], focus: 'dark-clouds' }],
  'isa-3-6': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['kaaba', 'path', 'light'], focus: 'kaaba' },
    { at: 'Les messagers d’Allah se suivent', motifs: ['kaaba', 'path', 'footprints', 'tablets', 'light'], focus: 'footprints' },
  ],

  // Épisode 5 : ni tué ni crucifié
  'isa-4-0': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'wall', 'dark-clouds'], focus: 'dark-clouds' },
    { at: 'Mais Allah fit échouer leur complot', motifs: ['house', 'wall', 'dark-clouds', 'light'], focus: 'light' },
  ],
  'isa-4-1': [{ at: '', sky: 'night', ground: 'city', motifs: ['wall', 'house', 'moon'], focus: 'moon' }],
  'isa-4-2': [{ at: '', sky: 'night', ground: 'none', motifs: ['moon', 'clouds', 'stars'], focus: 'clouds' }],
  'isa-4-3': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['path', 'stars', 'moon'], focus: 'path' },
    { at: 'Ceux qui en discutent', motifs: ['path', 'stars', 'wind', 'clouds'], focus: 'wind' },
  ],
  'isa-4-4': [{ at: '', sky: 'dawn', ground: 'none', motifs: ['light', 'stars', 'clouds'], focus: 'light' }],
  'isa-4-5': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['rock', 'clouds', 'light'], focus: 'rock' },
    { at: 'et Allah l’a élevé vers Lui', motifs: ['clouds', 'light', 'sun'], focus: 'sky' },
  ],

  // Épisode 6 : le témoignage d'Issa
  'isa-5-0': [{ at: '', sky: 'dawn', ground: 'none', motifs: ['light', 'clouds', 'scales'], focus: 'scales' }],
  'isa-5-1': [{ at: '', sky: 'day', ground: 'none', motifs: ['light', 'clouds', 'book', 'scales'], focus: 'clouds' }],
  'isa-5-2': [
    { at: '', sky: 'dusk', ground: 'none', motifs: ['light', 'crescent', 'book'], focus: 'light' },
    { at: 'Si je l’avais dit', motifs: ['book', 'lamp', 'crescent'], focus: 'book' },
  ],
  'isa-5-3': [{ at: '', sky: 'night', ground: 'none', motifs: ['stars', 'book', 'bright-star'], focus: 'stars' }],
  'isa-5-4': [{ at: '', sky: 'dawn', ground: 'plain', motifs: ['path', 'light', 'footprints', 'book'], focus: 'footprints' }],
  'isa-5-5': [{ at: '', sky: 'day', ground: 'plain', motifs: ['light', 'sun', 'path'], focus: 'sun' }],
  'isa-5-6': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['path', 'footprints', 'light'], focus: 'path' },
    { at: 'Et il a parlé d’Allah avec vérité', motifs: ['light', 'lamp', 'crescent'], focus: 'lamp' },
  ],

  // ───────────── ASHAB AL-KAHF ─────────────
  // Épisode 1 : des jeunes gens qui croyaient
  'ashab-al-kahf-0-0': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['rock', 'cave-mouth', 'stars', 'moon'], focus: 'rock' },
    { at: 'un récit étonnant', motifs: ['cave-mouth', 'stars', 'bright-star', 'light'], focus: 'light' },
  ],
  'ashab-al-kahf-0-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'lamp', 'light'], focus: 'lamp', cut: true },
    { at: 'Mais leur peuple adorait', motifs: ['pillars', 'wall', 'house'], focus: 'pillars' },
  ],
  'ashab-al-kahf-0-2': [{ at: '', sky: 'day', ground: 'city', motifs: ['pillars', 'lamp', 'light', 'sun'], focus: 'lamp' }],
  'ashab-al-kahf-0-3': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'pillars', 'wall', 'crescent'], focus: 'pillars' },
    { at: 'Qu’ils apportent donc une preuve claire', motifs: ['house', 'scroll', 'crescent'], focus: 'scroll' },
  ],
  'ashab-al-kahf-0-4': [
    { at: '', sky: 'dusk', ground: 'mountains', motifs: ['house', 'path', 'footprints', 'crescent'], focus: 'footprints' },
    { at: 'réfugions-nous dans la caverne', motifs: ['cave-mouth', 'rock', 'path', 'crescent'], focus: 'cave-mouth' },
    { at: 'Notre Seigneur répandra sur nous', motifs: ['cave-mouth', 'rock', 'light', 'crescent'], focus: 'light' },
  ],
  'ashab-al-kahf-0-5': [{ at: '', sky: 'night', ground: 'mountains', motifs: ['cave-mouth', 'rock', 'moon', 'light', 'stars'], focus: 'cave-mouth' }],
  'ashab-al-kahf-0-6': [
    { at: '', sky: 'night', ground: 'cave', motifs: ['cave-mouth', 'moon', 'stars'], focus: 'cave-mouth' },
    { at: 'pendant de nombreuses années', sky: 'dusk', motifs: ['cave-mouth', 'rock', 'sun', 'crescent'], focus: 'sky' },
  ],
  'ashab-al-kahf-0-7': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['cave-mouth', 'rock', 'sun', 'light'], focus: 'light' },
    { at: 'Mais que s’est-il passé', motifs: ['cave-mouth', 'rock', 'sun', 'clouds'], focus: 'cave-mouth' },
  ],

  // Épisode 2 : le long sommeil et le réveil
  'ashab-al-kahf-1-0': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['cave-mouth', 'rock', 'moon', 'stars'], focus: 'cave-mouth' },
    { at: 'pendant que les années passaient', sky: 'dawn', motifs: ['cave-mouth', 'rock', 'sun'], focus: 'sun' },
  ],
  'ashab-al-kahf-1-1': [{ at: '', sky: 'dawn', ground: 'cave', motifs: ['cave-mouth', 'rock', 'sun', 'light'], focus: 'sun' }],
  'ashab-al-kahf-1-2': [
    { at: '', sky: 'night', ground: 'cave', motifs: ['cave-mouth', 'stars', 'moon'], focus: 'moon' },
    { at: 'Et Allah les tournait', motifs: ['cave-mouth', 'stars', 'crescent', 'light'], focus: 'light' },
  ],
  'ashab-al-kahf-1-3': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['cave-mouth', 'dog', 'stars', 'rock'], focus: 'dog' },
    { at: 'Celui qui les aurait aperçus', motifs: ['cave-mouth', 'dog', 'stars', 'path', 'footprints'], focus: 'footprints' },
  ],
  'ashab-al-kahf-1-4': [
    { at: '', sky: 'dawn', ground: 'cave', motifs: ['cave-mouth', 'light', 'dog', 'rock'], focus: 'light' },
    { at: 'Ils dirent : « Un jour', sky: 'day', motifs: ['cave-mouth', 'sun', 'dog'], focus: 'sun' },
  ],
  'ashab-al-kahf-1-5': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['cave-mouth', 'sun', 'dog', 'path'], focus: 'cave-mouth' },
    { at: 'Envoyez l’un de vous en ville', motifs: ['path', 'coins', 'footprints'], focus: 'coins' },
    { at: 'pour qu’il rapporte la nourriture', motifs: ['path', 'coins', 'bread', 'house'], focus: 'bread' },
  ],
  'ashab-al-kahf-1-6': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'coins', 'path', 'footprints'], focus: 'coins' },
    { at: 'S’ils nous trouvent', motifs: ['house', 'wall', 'path', 'dark-clouds'], focus: 'wall' },
  ],
  'ashab-al-kahf-1-7': [{ at: '', sky: 'day', ground: 'city', motifs: ['coins', 'light', 'house', 'wall'], focus: 'light' }],
  'ashab-al-kahf-1-8': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['cave-mouth', 'rock', 'sun', 'light'], focus: 'cave-mouth' },
    { at: 'la promesse d’Allah est vraie', motifs: ['cave-mouth', 'sun', 'light', 'clouds'], focus: 'sky' },
  ],

  // Épisode 3 : Allah sait mieux
  'ashab-al-kahf-2-0': [{ at: '', sky: 'night', ground: 'mountains', motifs: ['cave-mouth', 'rock', 'stars', 'moon'], focus: 'stars' }],
  'ashab-al-kahf-2-1': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'path', 'crescent'], focus: 'path', cut: true },
    { at: 'avec leur chien en plus', ground: 'mountains', motifs: ['cave-mouth', 'dog', 'crescent'], focus: 'dog' },
  ],
  'ashab-al-kahf-2-2': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'footprints', 'crescent', 'stars'], focus: 'footprints' },
    { at: 'enseigne au Prophète', motifs: ['light', 'stars', 'moon', 'book'], focus: 'book' },
  ],
  'ashab-al-kahf-2-3': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['light', 'sun', 'book', 'path'], focus: 'book' },
    { at: 'Il est inutile de se disputer', motifs: ['path', 'footprints', 'wind', 'sun'], focus: 'wind' },
  ],
  'ashab-al-kahf-2-4': [{ at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'sun', 'path', 'light'], focus: 'sun' }],
  'ashab-al-kahf-2-5': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'path', 'light'], focus: 'house' },
    { at: 'Et si l’on oublie', motifs: ['house', 'lamp', 'path', 'light'], focus: 'lamp' },
    { at: 'en espérant qu’Il nous guide', motifs: ['path', 'sun', 'light'], focus: 'horizon' },
  ],
  'ashab-al-kahf-2-6': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['cave-mouth', 'rock', 'sun', 'path'], focus: 'cave-mouth' },
    { at: 'trois cents ans, et neuf de plus', sky: 'dusk', motifs: ['cave-mouth', 'rock', 'sun', 'crescent'], focus: 'sky' },
  ],
  'ashab-al-kahf-2-7': [{ at: '', sky: 'night', ground: 'mountains', motifs: ['cave-mouth', 'rock', 'stars', 'moon', 'bright-star'], focus: 'stars' }],
  'ashab-al-kahf-2-8': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['light', 'path', 'rock'], focus: 'light' },
    { at: 'Et pour chacun de nos projets', motifs: ['path', 'footprints', 'sun', 'light'], focus: 'sun' },
  ],

  // ───────────── DHUL-QARNAYN ─────────────
  // Épisode 1 : du Couchant au Levant
  'dhul-qarnayn-0-0': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['path', 'footprints', 'sun'], focus: 'path' },
    { at: 'Allah lui révéla', motifs: ['path', 'sun', 'book', 'light'], focus: 'book' },
  ],
  'dhul-qarnayn-0-1': [{ at: '', sky: 'dawn', ground: 'mountains', motifs: ['path', 'sun', 'rock', 'light'], focus: 'sun' }],
  'dhul-qarnayn-0-2': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['path', 'footprints', 'sun'], focus: 'footprints' },
    { at: 'jusqu’à atteindre le Couchant', sky: 'dusk', motifs: ['path', 'footprints', 'sun', 'clouds'], focus: 'horizon' },
  ],
  'dhul-qarnayn-0-3': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['sun', 'spring', 'path', 'footprints'], focus: 'sun' },
    { at: 'Et près de là', motifs: ['tent', 'spring', 'sun', 'footprints'], focus: 'tent' },
  ],
  'dhul-qarnayn-0-4': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['tent', 'light', 'crescent', 'scales'], focus: 'scales' },
    { at: 'soit les traiter avec bonté', motifs: ['tent', 'bread', 'lamp', 'crescent'], focus: 'bread' },
  ],
  'dhul-qarnayn-0-5': [
    { at: '', sky: 'night', ground: 'valley', motifs: ['tent', 'stars', 'moon', 'scales'], focus: 'scales' },
    { at: 'Puis il sera ramené', motifs: ['tent', 'stars', 'bright-star', 'light'], focus: 'light' },
  ],
  'dhul-qarnayn-0-6': [{ at: '', sky: 'dawn', ground: 'valley', motifs: ['tent', 'light', 'sun', 'path'], focus: 'sun' }],
  'dhul-qarnayn-0-7': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['path', 'footprints', 'tent'], focus: 'path' },
    { at: 'Là, il vit le soleil se lever', motifs: ['sun', 'path', 'footprints', 'light'], focus: 'sun' },
    { at: 'sur un peuple qui n’avait rien', motifs: ['sun', 'light', 'footprints'], focus: 'ground' },
  ],
  'dhul-qarnayn-0-8': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['sun', 'light', 'footprints'], focus: 'sun' },
    { at: 'Mais son voyage', ground: 'mountains', motifs: ['sun', 'path', 'footprints', 'rock'], focus: 'horizon' },
  ],

  // Épisode 2 : la grande barrière
  'dhul-qarnayn-1-0': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['path', 'footprints', 'sun'], focus: 'footprints' },
    { at: 'jusqu’à un passage entre deux montagnes', motifs: ['rock', 'path', 'footprints', 'sun'], focus: 'rock' },
  ],
  'dhul-qarnayn-1-1': [{ at: '', sky: 'day', ground: 'valley', motifs: ['tent', 'path', 'rock', 'sun'], focus: 'tent' }],
  'dhul-qarnayn-1-2': [
    { at: '', sky: 'dusk', ground: 'mountains', motifs: ['tent', 'rock', 'path'], focus: 'tent' },
    { at: 'Yajouj et Majouj sèment', motifs: ['dark-clouds', 'wind', 'rock', 'tent'], focus: 'dark-clouds' },
    { at: 'Veux-tu que nous te payions', motifs: ['coins', 'tent', 'rock'], focus: 'coins' },
  ],
  'dhul-qarnayn-1-3': [{ at: '', sky: 'day', ground: 'mountains', motifs: ['coins', 'light', 'stones', 'rock'], focus: 'light' }],
  'dhul-qarnayn-1-4': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['stones', 'rock', 'path'], focus: 'stones' },
    { at: 'Et quand il eut comblé', motifs: ['stones', 'rock', 'wall'], focus: 'wall' },
    { at: 'il dit : « Soufflez', motifs: ['wind', 'stones', 'wall', 'rock'], focus: 'wind' },
  ],
  'dhul-qarnayn-1-5': [
    { at: '', sky: 'dusk', ground: 'mountains', motifs: ['wall', 'flames', 'rock'], focus: 'flames' },
    { at: 'il dit : « Apportez-moi du cuivre fondu', motifs: ['wall', 'flames', 'jar', 'rock'], focus: 'jar' },
  ],
  'dhul-qarnayn-1-6': [{ at: '', sky: 'day', ground: 'mountains', motifs: ['wall', 'sun', 'rock', 'light'], focus: 'wall' }],
  'dhul-qarnayn-1-7': [{ at: '', sky: 'dawn', ground: 'mountains', motifs: ['wall', 'light', 'clouds', 'rock'], focus: 'light' }],
  'dhul-qarnayn-1-8': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['wall', 'path', 'tent', 'sun'], focus: 'path' },
    { at: 'et il attribua sa réussite', motifs: ['path', 'light', 'sun', 'clouds'], focus: 'light' },
  ],

  // ───────────── LUQMAN ─────────────
  // Épisode 1 : la gratitude, l'unicité et les parents
  'luqman-0-0': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['tree', 'book', 'light'], focus: 'book' },
    { at: 'sois reconnaissant envers Allah', motifs: ['tree', 'dates', 'light', 'palm'], focus: 'dates' },
  ],
  'luqman-0-1': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['tree', 'dates', 'sun'], focus: 'dates' },
    { at: 'Et celui qui est ingrat', motifs: ['withered', 'tree', 'sun'], focus: 'withered' },
    { at: 'et qu’Il est digne de louange', motifs: ['tree', 'sun', 'light'], focus: 'light' },
  ],
  'luqman-0-2': [{ at: '', sky: 'day', ground: 'plain', motifs: ['house', 'palm', 'path', 'sun'], focus: 'house' }],
  'luqman-0-3': [{ at: '', sky: 'day', ground: 'none', motifs: ['light', 'house', 'palm', 'clouds'], focus: 'light' }],
  'luqman-0-4': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['house', 'palm', 'path', 'crescent'], focus: 'house' },
    { at: 'et surtout envers la mère', motifs: ['cradle', 'house', 'lamp', 'crescent'], focus: 'cradle' },
  ],
  'luqman-0-5': [{ at: '', sky: 'night', ground: 'plain', motifs: ['cradle', 'house', 'stars', 'lamp'], focus: 'cradle' }],
  'luqman-0-6': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['house', 'path', 'light'], focus: 'path' },
    { at: 'Mais on reste bon envers eux', motifs: ['house', 'bread', 'path', 'light'], focus: 'bread' },
  ],
  'luqman-0-7': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['path', 'light', 'footprints', 'palm'], focus: 'footprints' },
    { at: 'Car c’est vers Lui que nous retournerons', motifs: ['path', 'light', 'book', 'clouds'], focus: 'book' },
  ],
  'luqman-0-8': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['tree', 'dates', 'light', 'sun'], focus: 'dates' },
    { at: 'puis envers ses parents', motifs: ['tree', 'house', 'light', 'sun'], focus: 'house' },
    { at: 'voilà les premières leçons', motifs: ['tree', 'book', 'light', 'sun'], focus: 'book' },
  ],

  // Épisode 2 : la prière, la patience et l'humilité
  'luqman-1-0': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['stones', 'rock', 'sun', 'path'], focus: 'path' },
    { at: 'Il lui apprit que rien n’échappe', motifs: ['rock', 'light', 'sun', 'stones'], focus: 'light' },
  ],
  'luqman-1-1': [{ at: '', sky: 'night', ground: 'mountains', motifs: ['rock', 'stones', 'stars', 'light'], focus: 'stones' }],
  'luqman-1-2': [{ at: '', sky: 'dawn', ground: 'plain', motifs: ['light', 'lamp', 'path', 'crescent'], focus: 'lamp' }],
  'luqman-1-3': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['lamp', 'path', 'sun'], focus: 'lamp' },
    { at: 'et rester patient dans les épreuves', motifs: ['path', 'footprints', 'wind', 'rock'], focus: 'footprints' },
    { at: 'ce sont des choses qui demandent', motifs: ['path', 'sun', 'light', 'rock'], focus: 'light' },
  ],
  'luqman-1-4': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'path', 'footprints'], focus: 'footprints' },
    { at: 'et ne marche pas sur terre', motifs: ['path', 'footprints', 'wall', 'sun'], focus: 'footprints' },
    { at: 'Allah n’aime pas l’orgueilleux', motifs: ['tower', 'path', 'clouds'], focus: 'tower' },
  ],
  'luqman-1-5': [{ at: '', sky: 'dusk', ground: 'plain', motifs: ['path', 'footprints', 'wind', 'clouds'], focus: 'wind' }],
  'luqman-1-6': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['light', 'tree', 'lamp'], focus: 'light' },
    { at: 'voilà les conseils d’un père sage', motifs: ['tree', 'path', 'light', 'house'], focus: 'house' },
  ],

  // ───────────── LES DEUX JARDINS ─────────────
  // Épisode 1 : l'orgueil du propriétaire
  'les-deux-jardins-0-0': [
    { at: '', sky: 'dawn', ground: 'garden', motifs: ['palms', 'light', 'path'], focus: 'path' },
    { at: 'À l’un d’eux, Il avait donné', motifs: ['wall', 'palms', 'tree', 'light'], focus: 'wall' },
  ],
  'les-deux-jardins-0-1': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['tree', 'wall', 'palms', 'sun'], focus: 'tree' },
    { at: 'avec des champs cultivés entre eux', motifs: ['wheat', 'palms', 'tree', 'sun'], focus: 'wheat' },
  ],
  'les-deux-jardins-0-2': [
    { at: '', sky: 'day', ground: 'river', motifs: ['palm', 'dates', 'tree', 'wheat'], focus: 'dates' },
    { at: 'et Allah avait fait jaillir un ruisseau', motifs: ['spring', 'palm', 'dates', 'wheat'], focus: 'spring' },
  ],
  'les-deux-jardins-0-3': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['dates', 'palms', 'house', 'spring'], focus: 'dates' },
    { at: 'En discutant avec son compagnon', motifs: ['house', 'coins', 'gold', 'dates'], focus: 'gold' },
  ],
  'les-deux-jardins-0-4': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['path', 'footprints', 'wall', 'palms'], focus: 'footprints' },
    { at: 'injuste envers lui-même', motifs: ['palms', 'dates', 'wheat', 'sun', 'wall'], focus: 'palms' },
  ],
  'les-deux-jardins-0-5': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['palms', 'clouds', 'wall', 'dates'], focus: 'clouds' },
    { at: 'Et même si l’on me ramène vers mon Seigneur', sky: 'dusk', motifs: ['palms', 'clouds', 'dates', 'light'], focus: 'light' },
  ],
  'les-deux-jardins-0-6': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['palm', 'dates', 'light', 'crescent'], focus: 'light' },
    { at: 'Que va lui répondre son compagnon', motifs: ['palm', 'path', 'footprints', 'crescent'], focus: 'footprints' },
  ],

  // Épisode 2 : le conseil du compagnon et la ruine
  'les-deux-jardins-1-0': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['palms', 'wall', 'path', 'footprints'], focus: 'footprints' },
    { at: 'Renierais-tu Celui qui t’a créé de terre', motifs: ['palms', 'wall', 'light', 'sun'], focus: 'light' },
    { at: 'puis d’une petite goutte', motifs: ['spring', 'palms', 'light'], focus: 'spring' },
  ],
  'les-deux-jardins-1-1': [{ at: '', sky: 'day', ground: 'plain', motifs: ['light', 'sun', 'path'], focus: 'light' }],
  'les-deux-jardins-1-2': [{ at: '', sky: 'day', ground: 'garden', motifs: ['path', 'wall', 'palms', 'light'], focus: 'wall' }],
  'les-deux-jardins-1-3': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['tree', 'palms', 'dates', 'light'], focus: 'dates' },
    { at: 'qu’Il envoie du ciel une calamité', motifs: ['dark-clouds', 'clouds', 'palms', 'tree'], focus: 'dark-clouds' },
    { at: 'ou que son eau disparaisse', motifs: ['well', 'dark-clouds', 'palms', 'wind'], focus: 'well' },
  ],
  'les-deux-jardins-1-4': [
    { at: '', sky: 'storm', ground: 'garden', motifs: ['withered', 'dark-clouds', 'lightning', 'wall'], focus: 'lightning' },
    { at: 'Ses vignes étaient ravagées', motifs: ['ruins', 'withered', 'dark-clouds', 'wind'], focus: 'ruins' },
  ],
  'les-deux-jardins-1-5': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['withered', 'ruins', 'coins'], focus: 'coins' },
    { at: 'Il disait : « Si seulement', motifs: ['withered', 'ruins', 'clouds', 'crescent'], focus: 'withered' },
  ],
  'les-deux-jardins-1-6': [{ at: '', sky: 'dusk', ground: 'plain', motifs: ['withered', 'ruins', 'path', 'wind'], focus: 'wind' }],
  'les-deux-jardins-1-7': [{ at: '', sky: 'dawn', ground: 'plain', motifs: ['light', 'sun', 'withered'], focus: 'sun' }],
  'les-deux-jardins-1-8': [
    { at: '', sky: 'dawn', ground: 'garden', motifs: ['palms', 'dates', 'light'], focus: 'dates' },
    { at: 'Telle est la volonté d’Allah', motifs: ['palms', 'spring', 'light', 'sun'], focus: 'sun' },
  ],
};
