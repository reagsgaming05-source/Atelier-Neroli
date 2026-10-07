import type { Storyboard } from '../types';

/*
 * Pictures of the stories of Issa, the People of the Cave, Dhoul-Qarnayn,
 * Louqmane and the Two Gardens. Prophets are never drawn (light, path, lamp,
 * footprints); ordinary people are silhouettes (folk, crowd, walkers, workers).
 */
export const BOARD_6: Storyboard = {
  // ───────────── ISA ─────────────
  // Épisode 1 : il parla dans le berceau
  'isa-0-0': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['palm', 'folk', 'path', 'footprints', 'sun', 'birds'], focus: 'footprints' },
    { at: 'Cet enfant, c’est Issa', motifs: ['palm', 'path', 'cradle', 'light', 'birds'], focus: 'cradle' },
  ],
  'isa-0-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'wall', 'folk', 'path'], focus: 'folk' },
    { at: 'Ô sœur de Haroun', motifs: ['house', 'crowd', 'path'], focus: 'crowd' },
    { at: 'et ta mère n’était pas', motifs: ['house', 'folk', 'light', 'palm'], focus: 'light' },
  ],
  'isa-0-2': [
    { at: '', motifs: ['house', 'wall', 'cradle', 'folk'], focus: 'cradle' },
    { at: 'Ils s’étonnèrent', motifs: ['house', 'wall', 'cradle', 'crowd'], focus: 'crowd' },
  ],
  'isa-0-3': [{ at: '', sky: 'day', ground: 'none', motifs: ['cradle', 'light', 'book', 'folk'], focus: 'cradle' }],
  'isa-0-4': [
    { at: '', sky: 'dusk', ground: 'none', motifs: ['cradle', 'light', 'crescent', 'palm'], focus: 'cradle' },
    { at: 'lui avait recommandé la prière', motifs: ['cradle', 'lamp', 'crescent', 'birds'], focus: 'lamp' },
    { at: 'ainsi que la bonté envers sa mère', motifs: ['cradle', 'palm', 'light', 'crescent', 'birds'], focus: 'palm' },
  ],
  'isa-0-5': [{ at: '', sky: 'night', ground: 'none', motifs: ['cradle', 'stars', 'moon', 'light'], focus: 'stars' }],
  'isa-0-6': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['cradle', 'stars', 'bright-star', 'folk'], focus: 'folk' },
    { at: 'Et Allah dit :', motifs: ['stars', 'bright-star', 'light'], focus: 'light' },
  ],
  'isa-0-7': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['path', 'light', 'footprints', 'birds'], focus: 'light' },
    { at: 'Adorez-Le donc', motifs: ['path', 'light', 'walkers'], focus: 'path' },
  ],
  'isa-0-8': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['tree', 'cradle', 'sun', 'birds', 'path'], focus: 'cradle' },
    { at: 'Son message est clair', motifs: ['tree', 'path', 'light', 'sun', 'birds', 'walkers'], focus: 'light' },
  ],

  // Épisode 2 : le message et les miracles
  'isa-1-0': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['book', 'scroll', 'house', 'birds'], focus: 'book' },
    { at: 'Puis Il l’envoya comme messager', motifs: ['house', 'path', 'light', 'scroll', 'walkers'], focus: 'path' },
    { at: 'aux Enfants d’Israël', motifs: ['house', 'crowd', 'path', 'light'], focus: 'crowd' },
  ],
  'isa-1-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'folk', 'path', 'light'], focus: 'folk' },
    { at: 'Avec de l’argile', motifs: ['house', 'stones', 'folk', 'light'], focus: 'stones' },
    { at: 'puis soufflait dedans', motifs: ['house', 'stones', 'wind', 'folk'], focus: 'wind' },
    { at: 'elle devenait un oiseau', motifs: ['house', 'birds', 'folk', 'light'], focus: 'birds' },
  ],
  'isa-1-2': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'lamp', 'light', 'folk', 'birds'], focus: 'lamp' },
    { at: 'et il ramenait les morts à la vie', motifs: ['house', 'light', 'crowd', 'birds'], focus: 'crowd' },
    { at: 'Il leur disait même', motifs: ['house', 'table', 'bread', 'jar', 'folk'], focus: 'table' },
  ],
  'isa-1-3': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'tablets', 'scroll', 'folk'], focus: 'tablets' },
    { at: 'et leur rendre permises', motifs: ['house', 'scroll', 'folk', 'light'], focus: 'folk' },
    { at: 'Il disait : « Craignez Allah', motifs: ['house', 'crowd', 'light', 'tablets'], focus: 'light' },
  ],
  'isa-1-4': [{ at: '', sky: 'dawn', ground: 'plain', motifs: ['path', 'light', 'footprints', 'walkers', 'birds'], focus: 'path' }],
  'isa-1-5': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'path', 'crowd', 'dark-clouds'], focus: 'crowd' },
    { at: 'Alors il demanda', motifs: ['house', 'path', 'lamp', 'light', 'folk'], focus: 'lamp' },
  ],
  'isa-1-6': [{ at: '', sky: 'dusk', ground: 'plain', motifs: ['lamp', 'footprints', 'path', 'crescent', 'folk'], focus: 'folk' }],
  'isa-1-7': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['lamp', 'stars', 'folk', 'path'], focus: 'folk' },
    { at: 'et nous suivons le messager', motifs: ['lamp', 'stars', 'walkers', 'path'], focus: 'walkers' },
    { at: 'Inscris-nous parmi', motifs: ['lamp', 'stars', 'book', 'folk'], focus: 'book' },
  ],
  'isa-1-8': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'wall', 'folk', 'dark-clouds'], focus: 'wall' },
    { at: 'Allah fit échouer leur complot', sky: 'storm', motifs: ['house', 'wall', 'dark-clouds', 'wind', 'lightning'], focus: 'lightning' },
    { at: 'et nul ne déjoue', sky: 'dawn', motifs: ['house', 'wall', 'clouds', 'light', 'birds'], focus: 'light' },
  ],
  'isa-1-9': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'light', 'birds', 'folk'], focus: 'light' },
    { at: 'Et nous aussi', ground: 'valley', motifs: ['light', 'path', 'lamp', 'tree', 'walkers'], focus: 'lamp' },
    { at: 'en soutenant le bien', motifs: ['path', 'walkers', 'light', 'tree', 'birds'], focus: 'walkers' },
  ],

  // Épisode 3 : la table servie
  'isa-2-0': [
    { at: '', sky: 'dawn', ground: 'none', motifs: ['light', 'stars', 'birds'], focus: 'light' },
    { at: 'à lui et à sa mère', ground: 'valley', motifs: ['light', 'cradle', 'palm', 'birds'], focus: 'cradle' },
  ],
  'isa-2-1': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['light', 'palm', 'birds'], focus: 'light' },
    { at: 'Issa parla aux gens dès le berceau', motifs: ['cradle', 'palm', 'folk', 'light'], focus: 'cradle' },
    { at: 'Allah lui enseigna le Livre', motifs: ['book', 'scroll', 'tablets', 'light', 'folk'], focus: 'book' },
  ],
  'isa-2-2': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['stones', 'palm', 'light', 'folk'], focus: 'stones' },
    { at: 'l’aveugle-né et le lépreux', motifs: ['birds', 'lamp', 'light', 'palm', 'folk'], focus: 'lamp' },
    { at: 'À chaque fois, Allah dit', motifs: ['birds', 'light', 'sun', 'crowd'], focus: 'sun' },
  ],
  'isa-2-3': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['wall', 'house', 'light', 'folk'], focus: 'wall' },
    { at: 'quand il leur apporta les preuves', motifs: ['house', 'wall', 'light', 'scroll', 'crowd'], focus: 'scroll' },
    { at: 'Mais ceux qui refusaient de croire', motifs: ['wall', 'house', 'crowd', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'isa-2-4': [
    { at: '', sky: 'night', ground: 'city', motifs: ['lamp', 'stars', 'house', 'wall', 'folk'], focus: 'lamp' },
    { at: 'Ils dirent : « Nous croyons', ground: 'plain', motifs: ['lamp', 'stars', 'moon', 'path', 'folk'], focus: 'folk' },
    { at: 'Sois témoin que nous sommes soumis', motifs: ['lamp', 'stars', 'moon', 'walkers'], focus: 'moon' },
  ],
  'isa-2-5': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['palm', 'path', 'folk', 'birds'], focus: 'folk' },
    { at: 'ton Seigneur peut-Il faire descendre du ciel', motifs: ['palm', 'clouds', 'folk', 'path'], focus: 'sky' },
    { at: 'Il répondit : « Craignez Allah', motifs: ['palm', 'clouds', 'light', 'birds'], focus: 'light' },
  ],
  'isa-2-6': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['wheat', 'bread', 'clouds', 'folk'], focus: 'bread' },
    { at: 'rassurer nos cœurs', motifs: ['wheat', 'lamp', 'clouds', 'folk'], focus: 'lamp' },
    { at: 'et en être les témoins', motifs: ['wheat', 'light', 'clouds', 'crowd'], focus: 'light' },
  ],
  'isa-2-7': [{ at: '', sky: 'day', ground: 'plain', motifs: ['clouds', 'light', 'wheat', 'lamp', 'folk'], focus: 'sky' }],
  'isa-2-8': [{ at: '', sky: 'dusk', ground: 'plain', motifs: ['table', 'bread', 'goblet', 'light', 'crescent', 'folk'], focus: 'table' }],
  'isa-2-9': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['sun', 'light', 'palm', 'table', 'birds'], focus: 'sun' },
    { at: 'Toute force vient de Lui', motifs: ['sun', 'light', 'palm', 'birds', 'butterflies'], focus: 'sky' },
  ],

  // Épisode 4 : l'annonce d'Ahmad
  'isa-3-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'pillars', 'path', 'birds'], focus: 'pillars' },
    { at: 'aux Enfants d’Israël', motifs: ['pillars', 'crowd', 'house'], focus: 'crowd' },
  ],
  'isa-3-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['pillars', 'house', 'crowd', 'light'], focus: 'light' },
    { at: 'je suis vraiment le messager', motifs: ['pillars', 'crowd', 'light', 'sun'], focus: 'crowd' },
  ],
  'isa-3-2': [
    { at: '', sky: 'day', ground: 'city', motifs: ['scroll', 'pillars', 'folk', 'light'], focus: 'scroll' },
    { at: 'dans la Torah', motifs: ['tablets', 'scroll', 'light', 'pillars'], focus: 'tablets' },
  ],
  'isa-3-3': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['path', 'folk', 'scroll', 'bright-star'], focus: 'folk' },
    { at: 'et son nom serait Ahmad', motifs: ['path', 'bright-star', 'light', 'footprints'], focus: 'bright-star' },
  ],
  'isa-3-4': [{ at: '', sky: 'dawn', ground: 'desert', motifs: ['scroll', 'light', 'bright-star', 'path', 'folk'], focus: 'scroll' }],
  'isa-3-5': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'path', 'scroll', 'crowd'], focus: 'scroll' },
    { at: 'ils dirent : « C’est là une magie', motifs: ['house', 'crowd', 'dark-clouds', 'wind'], focus: 'dark-clouds' },
  ],
  'isa-3-6': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['kaaba', 'path', 'light', 'birds'], focus: 'kaaba', cut: true },
    { at: 'Les messagers d’Allah se suivent', motifs: ['kaaba', 'path', 'footprints', 'tablets', 'light'], focus: 'footprints' },
    { at: 'et confirment le même message', motifs: ['kaaba', 'tablets', 'scroll', 'light', 'birds'], focus: 'scroll' },
  ],

  // Épisode 5 : ni tué ni crucifié
  'isa-4-0': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'wall', 'folk', 'dark-clouds'], focus: 'folk' },
    { at: 'Mais Allah fit échouer leur complot', motifs: ['house', 'wall', 'light', 'dark-clouds'], focus: 'light' },
  ],
  'isa-4-1': [
    { at: '', sky: 'night', ground: 'city', motifs: ['wall', 'house', 'folk', 'moon'], focus: 'folk' },
    { at: 'Issa, fils de Maryam, le messager', motifs: ['wall', 'house', 'moon', 'stars', 'crowd'], focus: 'moon' },
  ],
  'isa-4-2': [{ at: '', sky: 'night', ground: 'none', motifs: ['moon', 'clouds', 'stars', 'folk'], focus: 'clouds' }],
  'isa-4-3': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['path', 'stars', 'moon', 'folk'], focus: 'path' },
    { at: 'cela leur a seulement paru ainsi', motifs: ['path', 'stars', 'clouds', 'moon'], focus: 'clouds' },
    { at: 'Ceux qui en discutent', motifs: ['path', 'stars', 'wind', 'crowd', 'clouds'], focus: 'wind' },
  ],
  'isa-4-4': [{ at: '', sky: 'dawn', ground: 'none', motifs: ['light', 'stars', 'clouds', 'birds'], focus: 'light' }],
  'isa-4-5': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['rock', 'clouds', 'light', 'birds'], focus: 'rock' },
    { at: 'et Allah l’a élevé vers Lui', motifs: ['clouds', 'light', 'sun', 'birds'], focus: 'sky' },
  ],

  // Épisode 6 : le témoignage d'Issa
  'isa-5-0': [{ at: '', sky: 'dawn', ground: 'none', motifs: ['light', 'clouds', 'scales', 'crowd'], focus: 'scales' }],
  'isa-5-1': [
    { at: '', sky: 'day', ground: 'none', motifs: ['light', 'clouds', 'scales', 'crowd'], focus: 'clouds' },
    { at: 'est-ce toi qui as dit aux gens', motifs: ['light', 'clouds', 'crowd', 'book'], focus: 'crowd' },
    { at: 'pour deux divinités en dehors d’Allah', motifs: ['light', 'clouds', 'scales', 'book'], focus: 'scales' },
  ],
  'isa-5-2': [
    { at: '', sky: 'dusk', ground: 'none', motifs: ['light', 'crescent', 'book', 'crowd'], focus: 'light' },
    { at: 'Il ne m’appartient pas de dire', motifs: ['light', 'crescent', 'book'], focus: 'book' },
    { at: 'Si je l’avais dit', motifs: ['book', 'lamp', 'crescent', 'crowd'], focus: 'lamp' },
  ],
  'isa-5-3': [
    { at: '', sky: 'night', ground: 'none', motifs: ['stars', 'book', 'crowd'], focus: 'stars' },
    { at: 'C’est Toi qui connais parfaitement', motifs: ['stars', 'moon', 'light', 'book'], focus: 'light' },
  ],
  'isa-5-4': [{ at: '', sky: 'dawn', ground: 'plain', motifs: ['path', 'light', 'footprints', 'book', 'crowd'], focus: 'footprints' }],
  'isa-5-5': [{ at: '', sky: 'day', ground: 'plain', motifs: ['light', 'sun', 'path', 'crowd'], focus: 'sun' }],
  'isa-5-6': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['path', 'footprints', 'light', 'walkers'], focus: 'path' },
    { at: 'Et il a parlé d’Allah avec vérité', motifs: ['light', 'lamp', 'crescent', 'birds'], focus: 'lamp' },
  ],

  // ───────────── ASHAB AL-KAHF ─────────────
  // Épisode 1 : des jeunes gens qui croyaient
  'ashab-al-kahf-0-0': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['rock', 'cave-mouth', 'stars', 'moon', 'bats'], focus: 'rock' },
    { at: 'un récit étonnant', motifs: ['cave-mouth', 'stars', 'bright-star', 'light'], focus: 'light' },
  ],
  'ashab-al-kahf-0-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'lamp', 'walkers', 'sun'], focus: 'walkers', cut: true },
    { at: 'et Allah augmenta leur guidance', motifs: ['house', 'lamp', 'light', 'folk', 'birds'], focus: 'light' },
    { at: 'Mais leur peuple adorait', motifs: ['pillars', 'wall', 'house', 'crowd'], focus: 'pillars' },
  ],
  'ashab-al-kahf-0-2': [{ at: '', sky: 'day', ground: 'city', motifs: ['pillars', 'lamp', 'light', 'sun', 'folk'], focus: 'folk' }],
  'ashab-al-kahf-0-3': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'pillars', 'wall', 'crescent', 'folk'], focus: 'folk' },
    { at: 'Qu’ils apportent donc une preuve claire', motifs: ['house', 'scroll', 'crescent', 'crowd'], focus: 'scroll' },
    { at: 'Qui est plus injuste', motifs: ['house', 'wall', 'crescent', 'dark-clouds', 'folk'], focus: 'dark-clouds' },
  ],
  'ashab-al-kahf-0-4': [
    { at: '', sky: 'dusk', ground: 'mountains', motifs: ['house', 'path', 'footprints', 'walkers', 'crescent'], focus: 'walkers' },
    { at: 'réfugions-nous dans la caverne', motifs: ['cave-mouth', 'rock', 'path', 'walkers', 'crescent'], focus: 'cave-mouth' },
    { at: 'Notre Seigneur répandra sur nous', motifs: ['cave-mouth', 'rock', 'light', 'crescent', 'bats'], focus: 'light' },
  ],
  'ashab-al-kahf-0-5': [{ at: '', sky: 'night', ground: 'mountains', motifs: ['cave-mouth', 'rock', 'moon', 'light', 'stars', 'bats'], focus: 'cave-mouth' }],
  'ashab-al-kahf-0-6': [
    { at: '', sky: 'night', ground: 'cave', motifs: ['cave-mouth', 'moon', 'stars', 'bats'], focus: 'cave-mouth' },
    { at: 'pendant de nombreuses années', sky: 'dusk', motifs: ['cave-mouth', 'rock', 'sun', 'crescent'], focus: 'sky' },
  ],
  'ashab-al-kahf-0-7': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['cave-mouth', 'rock', 'sun', 'light', 'birds'], focus: 'light' },
    { at: 'lequel des deux groupes', motifs: ['cave-mouth', 'rock', 'folk', 'sun'], focus: 'folk' },
    { at: 'Mais que s’est-il passé', motifs: ['cave-mouth', 'rock', 'sun', 'clouds', 'birds'], focus: 'cave-mouth' },
  ],

  // Épisode 2 : le long sommeil et le réveil
  'ashab-al-kahf-1-0': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['cave-mouth', 'rock', 'moon', 'stars', 'bats'], focus: 'cave-mouth' },
    { at: 'pendant que les années passaient', sky: 'dawn', motifs: ['cave-mouth', 'rock', 'sun', 'birds'], focus: 'sun' },
  ],
  'ashab-al-kahf-1-1': [{ at: '', sky: 'dawn', ground: 'cave', motifs: ['cave-mouth', 'rock', 'sun', 'light', 'birds'], focus: 'sun' }],
  'ashab-al-kahf-1-2': [
    { at: '', sky: 'night', ground: 'cave', motifs: ['cave-mouth', 'stars', 'moon', 'bats'], focus: 'moon' },
    { at: 'Et Allah les tournait', motifs: ['cave-mouth', 'stars', 'crescent', 'light'], focus: 'light' },
    { at: 'puis sur le côté gauche', motifs: ['cave-mouth', 'moon', 'stars', 'light', 'bats'], focus: 'cave-mouth' },
  ],
  'ashab-al-kahf-1-3': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['cave-mouth', 'dog', 'stars', 'rock'], focus: 'dog' },
    { at: 'Celui qui les aurait aperçus', motifs: ['cave-mouth', 'dog', 'path', 'footprints', 'walkers'], focus: 'walkers' },
  ],
  'ashab-al-kahf-1-4': [
    { at: '', sky: 'dawn', ground: 'cave', motifs: ['cave-mouth', 'light', 'dog', 'rock'], focus: 'light' },
    { at: 'Combien de temps êtes-vous restés', motifs: ['cave-mouth', 'folk', 'dog', 'light'], focus: 'folk' },
    { at: 'Ils dirent : « Un jour', sky: 'day', motifs: ['cave-mouth', 'sun', 'dog', 'folk'], focus: 'sun' },
  ],
  'ashab-al-kahf-1-5': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['cave-mouth', 'sun', 'dog', 'folk'], focus: 'folk' },
    { at: 'Envoyez l’un de vous en ville', motifs: ['path', 'coins', 'footprints', 'walkers'], focus: 'coins' },
    { at: 'pour qu’il rapporte la nourriture', motifs: ['path', 'bread', 'coins', 'house', 'walkers'], focus: 'bread' },
  ],
  'ashab-al-kahf-1-6': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'coins', 'path', 'walkers'], focus: 'coins' },
    { at: 'S’ils nous trouvent', motifs: ['house', 'wall', 'crowd', 'dark-clouds'], focus: 'dark-clouds' },
    { at: 'ou nous feront revenir à leur religion', motifs: ['wall', 'house', 'path', 'pillars', 'crowd'], focus: 'pillars' },
  ],
  'ashab-al-kahf-1-7': [{ at: '', sky: 'day', ground: 'city', motifs: ['coins', 'light', 'house', 'wall', 'crowd'], focus: 'light' }],
  'ashab-al-kahf-1-8': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['cave-mouth', 'dog', 'rock', 'sun', 'light'], focus: 'cave-mouth' },
    { at: 'la promesse d’Allah est vraie', motifs: ['cave-mouth', 'sun', 'light', 'clouds', 'birds'], focus: 'sky' },
  ],

  // Épisode 3 : Allah sait mieux
  'ashab-al-kahf-2-0': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['cave-mouth', 'rock', 'stars', 'moon', 'bats'], focus: 'stars' },
    { at: 'et surtout de leur nombre', motifs: ['cave-mouth', 'stars', 'moon', 'folk'], focus: 'folk' },
  ],
  'ashab-al-kahf-2-1': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'path', 'crescent', 'walkers'], focus: 'path', cut: true },
    { at: 'avec leur chien en plus', ground: 'mountains', motifs: ['cave-mouth', 'dog', 'crescent', 'rock'], focus: 'dog' },
    { at: 'Chacun donnera son avis', ground: 'city', motifs: ['house', 'folk', 'crowd', 'crescent'], focus: 'folk' },
  ],
  'ashab-al-kahf-2-2': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'footprints', 'crescent', 'stars', 'folk'], focus: 'folk' },
    { at: 'et enseigne au Prophète', motifs: ['light', 'stars', 'moon', 'book'], focus: 'book' },
  ],
  'ashab-al-kahf-2-3': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['light', 'sun', 'book', 'path'], focus: 'book' },
    { at: 'et peu de gens le savent', motifs: ['path', 'sun', 'folk', 'light'], focus: 'folk' },
    { at: 'Il est inutile de se disputer', motifs: ['path', 'footprints', 'wind', 'sun', 'crowd'], focus: 'wind' },
  ],
  'ashab-al-kahf-2-4': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'sun', 'path', 'birds', 'folk'], focus: 'sun' },
    { at: 'une leçon précieuse', motifs: ['house', 'sun', 'path', 'light', 'book'], focus: 'book' },
  ],
  'ashab-al-kahf-2-5': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'path', 'light', 'folk'], focus: 'house' },
    { at: 'Et si l’on oublie', motifs: ['house', 'lamp', 'path', 'light', 'birds'], focus: 'lamp' },
    { at: 'en espérant qu’Il nous guide', motifs: ['path', 'sun', 'light', 'walkers'], focus: 'horizon' },
  ],
  'ashab-al-kahf-2-6': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['cave-mouth', 'rock', 'sun', 'path', 'dog'], focus: 'cave-mouth' },
    { at: 'trois cents ans, et neuf de plus', sky: 'dusk', motifs: ['cave-mouth', 'rock', 'sun', 'crescent', 'bats'], focus: 'sky' },
  ],
  'ashab-al-kahf-2-7': [{ at: '', sky: 'night', ground: 'mountains', motifs: ['cave-mouth', 'rock', 'stars', 'moon', 'bright-star', 'bats'], focus: 'stars' }],
  'ashab-al-kahf-2-8': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['light', 'path', 'rock', 'birds'], focus: 'light' },
    { at: 'Et pour chacun de nos projets', motifs: ['path', 'footprints', 'sun', 'light', 'walkers'], focus: 'sun' },
    { at: 'si Allah le veut', motifs: ['path', 'sun', 'light', 'clouds', 'birds'], focus: 'sky' },
  ],

  // ───────────── DHUL-QARNAYN ─────────────
  // Épisode 1 : du Couchant au Levant
  'dhul-qarnayn-0-0': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['folk', 'path', 'sun', 'footprints'], focus: 'folk' },
    { at: 'au sujet de Dhoul-Qarnayn', motifs: ['path', 'footprints', 'sun', 'birds'], focus: 'footprints' },
    { at: 'Allah lui révéla', motifs: ['path', 'sun', 'book', 'light'], focus: 'book' },
  ],
  'dhul-qarnayn-0-1': [{ at: '', sky: 'dawn', ground: 'mountains', motifs: ['path', 'sun', 'rock', 'light', 'birds'], focus: 'sun' }],
  'dhul-qarnayn-0-2': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['path', 'footprints', 'sun', 'birds'], focus: 'footprints' },
    { at: 'jusqu’à atteindre le Couchant', sky: 'dusk', motifs: ['path', 'footprints', 'sun', 'clouds', 'birds'], focus: 'horizon' },
  ],
  'dhul-qarnayn-0-3': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['sun', 'spring', 'path', 'footprints', 'birds'], focus: 'sun' },
    { at: 'Et près de là', motifs: ['tent', 'spring', 'folk', 'footprints', 'sun'], focus: 'folk' },
  ],
  'dhul-qarnayn-0-4': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['tent', 'light', 'crescent', 'scales', 'folk'], focus: 'scales' },
    { at: 'soit les traiter avec bonté', motifs: ['tent', 'bread', 'lamp', 'crescent', 'folk'], focus: 'bread' },
  ],
  'dhul-qarnayn-0-5': [
    { at: '', sky: 'night', ground: 'valley', motifs: ['tent', 'stars', 'moon', 'scales', 'folk'], focus: 'scales' },
    { at: 'Puis il sera ramené', motifs: ['tent', 'stars', 'bright-star', 'light'], focus: 'light' },
    { at: 'qui le punira sévèrement', motifs: ['tent', 'dark-clouds', 'stars', 'crowd'], focus: 'dark-clouds' },
  ],
  'dhul-qarnayn-0-6': [{ at: '', sky: 'dawn', ground: 'valley', motifs: ['tent', 'light', 'sun', 'path', 'folk'], focus: 'sun' }],
  'dhul-qarnayn-0-7': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['path', 'footprints', 'tent', 'birds'], focus: 'path' },
    { at: 'Là, il vit le soleil se lever', motifs: ['sun', 'path', 'footprints', 'light'], focus: 'sun' },
    { at: 'sur un peuple qui n’avait rien', motifs: ['sun', 'light', 'folk', 'footprints'], focus: 'folk' },
  ],
  'dhul-qarnayn-0-8': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['sun', 'light', 'footprints', 'folk'], focus: 'sun' },
    { at: 'Mais son voyage', ground: 'mountains', motifs: ['sun', 'path', 'footprints', 'rock', 'goat'], focus: 'horizon' },
  ],

  // Épisode 2 : la grande barrière
  'dhul-qarnayn-1-0': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['path', 'footprints', 'sun', 'birds'], focus: 'footprints' },
    { at: 'jusqu’à un passage entre deux montagnes', motifs: ['rock', 'path', 'footprints', 'sun', 'birds'], focus: 'rock' },
  ],
  'dhul-qarnayn-1-1': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['rock', 'path', 'tent', 'sun', 'birds'], focus: 'path' },
    { at: 'qui ne comprenait presque', motifs: ['tent', 'folk', 'rock', 'sun'], focus: 'folk' },
  ],
  'dhul-qarnayn-1-2': [
    { at: '', sky: 'dusk', ground: 'mountains', motifs: ['tent', 'folk', 'rock', 'path'], focus: 'folk' },
    { at: 'Yajouj et Majouj sèment', motifs: ['dark-clouds', 'wind', 'rock', 'folk', 'tent'], focus: 'dark-clouds' },
    { at: 'Veux-tu que nous te payions', motifs: ['coins', 'folk', 'tent', 'rock'], focus: 'coins' },
    { at: 'pour que tu construises une barrière', motifs: ['stones', 'rock', 'folk', 'path'], focus: 'stones' },
  ],
  'dhul-qarnayn-1-3': [{ at: '', sky: 'day', ground: 'mountains', motifs: ['coins', 'light', 'stones', 'rock', 'workers'], focus: 'workers' }],
  'dhul-qarnayn-1-4': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['stones', 'rock', 'workers', 'path'], focus: 'stones' },
    { at: 'Et quand il eut comblé', motifs: ['stones', 'rock', 'wall', 'workers'], focus: 'wall' },
    { at: 'il dit : « Soufflez', motifs: ['wind', 'stones', 'wall', 'workers', 'rock'], focus: 'wind' },
  ],
  'dhul-qarnayn-1-5': [
    { at: '', sky: 'dusk', ground: 'mountains', motifs: ['wall', 'flames', 'rock', 'workers'], focus: 'flames' },
    { at: 'il dit : « Apportez-moi du cuivre fondu', motifs: ['flames', 'jar', 'workers', 'rock'], focus: 'jar' },
    { at: 'que je le verse dessus', motifs: ['wall', 'jar', 'flames', 'workers'], focus: 'wall' },
  ],
  'dhul-qarnayn-1-6': [{ at: '', sky: 'day', ground: 'mountains', motifs: ['wall', 'sun', 'rock', 'light', 'workers', 'birds'], focus: 'wall' }],
  'dhul-qarnayn-1-7': [{ at: '', sky: 'dawn', ground: 'mountains', motifs: ['wall', 'light', 'clouds', 'rock', 'birds', 'folk'], focus: 'light' }],
  'dhul-qarnayn-1-8': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['wall', 'path', 'tent', 'sun', 'workers'], focus: 'path' },
    { at: 'sans profiter d’eux', motifs: ['tent', 'folk', 'wall', 'sun', 'bread'], focus: 'bread' },
    { at: 'à la miséricorde d’Allah', motifs: ['path', 'light', 'sun', 'clouds', 'birds'], focus: 'light' },
  ],

  // ───────────── LUQMAN ─────────────
  // Épisode 1 : la gratitude, l'unicité et les parents
  'luqman-0-0': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['tree', 'book', 'light', 'birds'], focus: 'book' },
    { at: 'Et cette sagesse commence par un conseil', motifs: ['tree', 'lamp', 'light', 'butterflies'], focus: 'lamp' },
    { at: 'sois reconnaissant envers Allah', motifs: ['tree', 'dates', 'light', 'palm', 'birds'], focus: 'dates' },
  ],
  'luqman-0-1': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['tree', 'dates', 'sun', 'birds'], focus: 'dates' },
    { at: 'Et celui qui est ingrat', motifs: ['withered', 'tree', 'sun', 'birds'], focus: 'withered' },
    { at: 'et qu’Il est digne de louange', motifs: ['tree', 'sun', 'light', 'butterflies'], focus: 'light' },
  ],
  'luqman-0-2': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['house', 'palm', 'path', 'sun', 'birds'], focus: 'house' },
    { at: 'pour le conseiller avec tendresse', motifs: ['house', 'palm', 'light', 'butterflies'], focus: 'light' },
  ],
  'luqman-0-3': [{ at: '', sky: 'day', ground: 'none', motifs: ['light', 'house', 'palm', 'clouds', 'birds'], focus: 'light' }],
  'luqman-0-4': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['house', 'palm', 'crescent', 'birds'], focus: 'house' },
    { at: 'et surtout envers la mère', motifs: ['cradle', 'house', 'lamp', 'crescent'], focus: 'cradle' },
  ],
  'luqman-0-5': [{ at: '', sky: 'night', ground: 'plain', motifs: ['cradle', 'house', 'stars', 'lamp', 'bats'], focus: 'cradle' }],
  'luqman-0-6': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['house', 'path', 'light', 'folk'], focus: 'folk' },
    { at: 'Mais on reste bon envers eux', motifs: ['house', 'bread', 'path', 'light', 'birds'], focus: 'bread' },
  ],
  'luqman-0-7': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['path', 'light', 'footprints', 'palm', 'walkers'], focus: 'walkers' },
    { at: 'Car c’est vers Lui que nous retournerons', motifs: ['path', 'light', 'crowd', 'clouds'], focus: 'crowd' },
    { at: 'et Il nous informera', motifs: ['book', 'scales', 'light', 'crowd'], focus: 'book' },
  ],
  'luqman-0-8': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['tree', 'dates', 'light', 'sun', 'birds'], focus: 'dates' },
    { at: 'puis envers ses parents', motifs: ['tree', 'house', 'light', 'sun', 'folk'], focus: 'house' },
    { at: 'voilà les premières leçons', motifs: ['tree', 'book', 'light', 'sun', 'birds'], focus: 'book' },
  ],

  // Épisode 2 : la prière, la patience et l'humilité
  'luqman-1-0': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['stones', 'rock', 'sun', 'path', 'goat'], focus: 'path' },
    { at: 'Il lui apprit que rien n’échappe', motifs: ['rock', 'light', 'sun', 'stones', 'birds'], focus: 'light' },
  ],
  'luqman-1-1': [{ at: '', sky: 'night', ground: 'mountains', motifs: ['rock', 'stones', 'stars', 'light', 'bats'], focus: 'stones' }],
  'luqman-1-2': [{ at: '', sky: 'dawn', ground: 'plain', motifs: ['light', 'lamp', 'path', 'crescent', 'folk'], focus: 'lamp' }],
  'luqman-1-3': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['lamp', 'path', 'sun', 'folk'], focus: 'lamp' },
    { at: 'et rester patient dans les épreuves', motifs: ['path', 'footprints', 'wind', 'rock', 'walkers'], focus: 'walkers' },
    { at: 'ce sont des choses qui demandent', motifs: ['path', 'sun', 'light', 'rock', 'birds'], focus: 'light' },
  ],
  'luqman-1-4': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'path', 'footprints', 'folk'], focus: 'folk' },
    { at: 'et ne marche pas sur terre', motifs: ['path', 'footprints', 'wall', 'sun', 'walkers'], focus: 'footprints' },
    { at: 'Allah n’aime pas l’orgueilleux', motifs: ['tower', 'path', 'clouds', 'crowd'], focus: 'tower' },
  ],
  'luqman-1-5': [{ at: '', sky: 'dusk', ground: 'plain', motifs: ['path', 'walkers', 'wind', 'clouds'], focus: 'walkers' }],
  'luqman-1-6': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['light', 'tree', 'lamp', 'birds'], focus: 'light' },
    { at: 'voilà les conseils d’un père sage', motifs: ['tree', 'path', 'light', 'house', 'folk'], focus: 'house' },
  ],

  // ───────────── LES DEUX JARDINS ─────────────
  // Épisode 1 : l'orgueil du propriétaire
  'les-deux-jardins-0-0': [
    { at: '', sky: 'dawn', ground: 'garden', motifs: ['palms', 'path', 'folk', 'light', 'birds'], focus: 'folk' },
    { at: 'À l’un d’eux, Il avait donné', motifs: ['wall', 'palms', 'tree', 'light', 'butterflies'], focus: 'wall' },
  ],
  'les-deux-jardins-0-1': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['tree', 'wall', 'palms', 'sun', 'butterflies'], focus: 'tree' },
    { at: 'avec des champs cultivés entre eux', motifs: ['wheat', 'palms', 'tree', 'sun', 'birds'], focus: 'wheat' },
  ],
  'les-deux-jardins-0-2': [
    { at: '', sky: 'day', ground: 'river', motifs: ['palm', 'dates', 'tree', 'wheat', 'birds'], focus: 'dates' },
    { at: 'et Allah avait fait jaillir un ruisseau', motifs: ['spring', 'palm', 'dates', 'wheat', 'butterflies'], focus: 'spring' },
  ],
  'les-deux-jardins-0-3': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['dates', 'palms', 'house', 'spring', 'folk'], focus: 'dates' },
    { at: 'En discutant avec son compagnon', motifs: ['house', 'folk', 'coins', 'gold', 'dates'], focus: 'gold' },
  ],
  'les-deux-jardins-0-4': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['path', 'footprints', 'wall', 'palms', 'butterflies'], focus: 'footprints' },
    { at: 'injuste envers lui-même', motifs: ['palms', 'dates', 'wheat', 'sun', 'wall', 'birds'], focus: 'palms' },
  ],
  'les-deux-jardins-0-5': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['palms', 'clouds', 'wall', 'dates', 'birds'], focus: 'clouds' },
    { at: 'Et même si l’on me ramène vers mon Seigneur', sky: 'dusk', motifs: ['palms', 'clouds', 'dates', 'light', 'folk'], focus: 'light' },
    { at: 'je trouverai sûrement mieux', motifs: ['palms', 'dates', 'wall', 'clouds', 'butterflies'], focus: 'dates' },
  ],
  'les-deux-jardins-0-6': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['palm', 'dates', 'light', 'crescent', 'birds'], focus: 'light' },
    { at: 'Que va lui répondre son compagnon', motifs: ['palm', 'path', 'footprints', 'crescent', 'folk'], focus: 'folk' },
  ],

  // Épisode 2 : le conseil du compagnon et la ruine
  'les-deux-jardins-1-0': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['palms', 'wall', 'folk', 'path'], focus: 'folk' },
    { at: 'Renierais-tu Celui qui t’a créé de terre', motifs: ['palms', 'wall', 'light', 'sun', 'folk'], focus: 'light' },
    { at: 'puis d’une petite goutte', motifs: ['spring', 'palms', 'light', 'butterflies'], focus: 'spring' },
  ],
  'les-deux-jardins-1-1': [{ at: '', sky: 'day', ground: 'plain', motifs: ['light', 'sun', 'path', 'folk', 'birds'], focus: 'light' }],
  'les-deux-jardins-1-2': [{ at: '', sky: 'day', ground: 'garden', motifs: ['path', 'wall', 'palms', 'light', 'folk', 'butterflies'], focus: 'wall' }],
  'les-deux-jardins-1-3': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['tree', 'palms', 'dates', 'light', 'butterflies'], focus: 'dates' },
    { at: 'qu’Il envoie du ciel une calamité', motifs: ['dark-clouds', 'clouds', 'palms', 'tree', 'birds'], focus: 'dark-clouds' },
    { at: 'ou que son eau disparaisse', motifs: ['well', 'dark-clouds', 'palms', 'wind', 'birds'], focus: 'well' },
  ],
  'les-deux-jardins-1-4': [
    { at: '', sky: 'storm', ground: 'garden', motifs: ['withered', 'dark-clouds', 'lightning', 'wall'], focus: 'lightning' },
    { at: 'Ses vignes étaient ravagées', motifs: ['ruins', 'withered', 'dark-clouds', 'wind', 'birds'], focus: 'ruins' },
  ],
  'les-deux-jardins-1-5': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['withered', 'ruins', 'coins', 'folk'], focus: 'folk' },
    { at: 'en pensant à tout ce qu’il y avait dépensé', motifs: ['coins', 'ruins', 'withered', 'crescent'], focus: 'coins' },
    { at: 'Il disait : « Si seulement', motifs: ['withered', 'ruins', 'clouds', 'crescent', 'folk'], focus: 'withered' },
  ],
  'les-deux-jardins-1-6': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['withered', 'path', 'wind', 'ruins', 'folk'], focus: 'folk' },
    { at: 'et il ne put se secourir lui-même', motifs: ['withered', 'ruins', 'wind', 'birds'], focus: 'withered' },
  ],
  'les-deux-jardins-1-7': [{ at: '', sky: 'dawn', ground: 'plain', motifs: ['light', 'sun', 'withered', 'birds'], focus: 'sun' }],
  'les-deux-jardins-1-8': [
    { at: '', sky: 'dawn', ground: 'garden', motifs: ['palms', 'dates', 'light', 'butterflies'], focus: 'dates' },
    { at: 'Telle est la volonté d’Allah', motifs: ['palms', 'spring', 'light', 'sun', 'folk'], focus: 'sun' },
    { at: 'il n’y a de force que par Allah', motifs: ['palms', 'dates', 'sun', 'light', 'birds'], focus: 'light' },
  ],
};
