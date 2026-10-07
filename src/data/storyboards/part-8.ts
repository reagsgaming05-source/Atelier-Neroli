import type { Storyboard } from '../types';

/*
 * Pictures of fourteen hadith stories told with places, objects and animals
 * only: the leper/bald/blind, the boy and the king, Jurayj, the murderer's
 * repentance, the thirsty dog, the sinner and the dog, the woman and the cat,
 * the thousand dinars, the gold in the land, the thorny branch, the boat's
 * passengers, the scattered ashes, the lost camel and the last man in Paradise.
 */
export const BOARD_8: Storyboard = {
  // ── Le lépreux, le chauve et l’aveugle ──
  'lepreux-chauve-aveugle-0-0': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['path', 'sun'], focus: 'path' },
    { at: 'Allah voulut éprouver trois hommes', motifs: ['path', 'tree', 'sun', 'light'], focus: 'light' },
  ],
  'lepreux-chauve-aveugle-0-1': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['light', 'path'], focus: 'light' },
    { at: 'L’ange le toucha, et sa maladie disparut', motifs: ['light', 'sun', 'path'], focus: 'sun' },
    { at: 'Puis il demanda des chameaux', motifs: ['camel', 'light', 'path'], focus: 'camel' },
  ],
  'lepreux-chauve-aveugle-0-2': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['tree', 'light', 'path'], focus: 'light' },
    { at: 'L’ange le toucha, et il guérit', motifs: ['tree', 'light', 'sun'], focus: 'sun' },
    { at: 'Puis il demanda des vaches', motifs: ['cows', 'tree', 'light'], focus: 'cows' },
  ],
  'lepreux-chauve-aveugle-0-3': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['light', 'path'], focus: 'light' },
    { at: 'L’ange toucha ses yeux', sky: 'day', motifs: ['light', 'sun'], focus: 'sun' },
    { at: 'Puis il demanda des moutons', motifs: ['sheep', 'sun', 'light'], focus: 'sheep' },
  ],
  'lepreux-chauve-aveugle-0-4': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['camel', 'cows', 'sheep'], focus: 'ground' },
  ],
  'lepreux-chauve-aveugle-0-5': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['camel', 'path'], focus: 'path' },
    { at: 'Au nom de Celui qui t’a donné', motifs: ['camel', 'path', 'light'], focus: 'light' },
  ],
  'lepreux-chauve-aveugle-0-6': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['camel', 'path'], focus: 'camel' },
    { at: 'L’ange lui rappela', motifs: ['camel', 'light'], focus: 'light' },
    { at: 'Si tu mens', motifs: ['camel', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'lepreux-chauve-aveugle-0-7': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['cows', 'path'], focus: 'cows' },
    { at: 'Il répondit de la même façon', motifs: ['cows', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'lepreux-chauve-aveugle-0-8': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['sheep', 'path'], focus: 'path' },
    { at: 'Au nom de Celui qui t’a rendu la vue', motifs: ['sheep', 'path', 'light'], focus: 'light' },
  ],
  'lepreux-chauve-aveugle-0-9': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['sheep', 'light'], focus: 'sheep' },
    { at: 'Prends ce que tu veux', motifs: ['sheep', 'path'], focus: 'path' },
  ],
  'lepreux-chauve-aveugle-0-10': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['sheep', 'sun', 'path'], focus: 'sheep' },
    { at: 'Allah est satisfait de toi', motifs: ['sheep', 'light', 'sun'], focus: 'light' },
  ],
  'lepreux-chauve-aveugle-0-11': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['light', 'palms', 'sheep'], focus: 'light' },
    { at: 'reconnais qu’elles viennent d’Allah', motifs: ['light', 'palms', 'path'], focus: 'path' },
  ],

  // ── Le garçon, le roi et le magicien ──
  'garcon-et-roi-0-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'wall'], focus: 'palace' },
    { at: 'Devenu vieux, le magicien demanda', motifs: ['palace', 'path', 'book'], focus: 'book' },
  ],
  'garcon-et-roi-0-1': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['path', 'house'], focus: 'path' },
    { at: 'Il s’arrêtait chez lui', sky: 'day', motifs: ['house', 'path', 'footprints'], focus: 'footprints' },
    { at: 'Le moine lui conseilla', motifs: ['house', 'light'], focus: 'light' },
  ],
  'garcon-et-roi-0-2': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['path', 'footprints'], focus: 'path' },
    { at: 'Le garçon prit une pierre', motifs: ['stones', 'path', 'light'], focus: 'stones' },
    { at: 'Il la lança, la bête mourut', motifs: ['path', 'footprints', 'sun'], focus: 'footprints' },
  ],
  'garcon-et-roi-0-3': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['house', 'path'], focus: 'house' },
    { at: 'Tu vas être éprouvé', motifs: ['house', 'clouds'], focus: 'clouds' },
    { at: 'Et le garçon se mit à guérir', motifs: ['house', 'light', 'path'], focus: 'light' },
  ],
  'garcon-et-roi-0-4': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'path'], focus: 'palace' },
    { at: 'vint avec des cadeaux', motifs: ['house', 'gold', 'path'], focus: 'gold' },
    { at: 'Si tu crois en Allah', motifs: ['house', 'light'], focus: 'light' },
  ],
  'garcon-et-roi-0-5': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'throne'], focus: 'throne' },
    { at: 'Alors le roi le fit maltraiter', sky: 'dusk', motifs: ['palace', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'garcon-et-roi-0-6': [
    { at: '', sky: 'night', ground: 'city', motifs: ['prison', 'wall'], focus: 'prison' },
    { at: 'Sommés de renier leur foi', motifs: ['prison', 'lamp'], focus: 'lamp' },
  ],
  'garcon-et-roi-0-7': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['path', 'rock', 'stars'], focus: 'rock' },
    { at: 'Le garçon pria', motifs: ['rock', 'light', 'stars'], focus: 'light' },
    { at: 'La montagne trembla', sky: 'storm', motifs: ['rock', 'stones', 'dark-clouds'], focus: 'rock' },
    { at: 'et il revint à pied chez le roi', sky: 'dawn', motifs: ['rock', 'path', 'footprints'], focus: 'footprints' },
  ],
  'garcon-et-roi-0-8': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['boat', 'path'], focus: 'boat' },
    { at: 'Le garçon pria', sky: 'dusk', motifs: ['boat', 'wind', 'clouds'], focus: 'wind' },
    { at: 'Le bateau chavira', sky: 'storm', motifs: ['boat', 'flood', 'dark-clouds'], focus: 'boat' },
  ],
  'garcon-et-roi-0-9': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'throne', 'footprints'], focus: 'throne', cut: true },
    { at: 'Au nom d’Allah', motifs: ['palace', 'light'], focus: 'light' },
    { at: 'Les gens dirent', sky: 'dawn', motifs: ['palace', 'sun', 'light', 'path'], focus: 'sun' },
  ],
  'garcon-et-roi-0-10': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['path', 'flames'], focus: 'flames', cut: true },
    { at: 'Les croyants restèrent fermes', motifs: ['flames', 'lamp', 'stars'], focus: 'lamp' },
    { at: 'son enfant lui dit', motifs: ['lamp', 'light', 'stars'], focus: 'light' },
  ],
  'garcon-et-roi-0-11': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['sun', 'light', 'lamp'], focus: 'sun' },
    { at: 'La fermeté d’un seul croyant', motifs: ['lamp', 'path', 'light'], focus: 'path' },
  ],

  // ── Jourayj, le dévot ──
  'jurayj-0-0': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['stars', 'moon'], focus: 'sky' },
    { at: 'trois enfants ont parlé au berceau', motifs: ['cradle', 'stars', 'moon'], focus: 'cradle' },
    { at: 'l’enfant de l’histoire de Jourayj', motifs: ['tower', 'stars'], focus: 'tower' },
  ],
  'jurayj-0-1': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['tower', 'path'], focus: 'tower' },
    { at: 'Un jour, sa mère vint l’appeler', sky: 'day', motifs: ['tower', 'path', 'footprints'], focus: 'footprints' },
    { at: 'Il se dit', motifs: ['tower', 'light'], focus: 'light' },
  ],
  'jurayj-0-2': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['path', 'footprints', 'tower'], focus: 'footprints' },
    { at: 'Alors elle invoqua', sky: 'dusk', motifs: ['tower', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'jurayj-0-3': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['tower', 'path', 'lamp'], focus: 'tower' },
    { at: 'Elle alla alors vers un berger', motifs: ['sheep', 'tower', 'path'], focus: 'sheep' },
    { at: 'et eut un enfant de lui', sky: 'night', motifs: ['cradle', 'sheep', 'tower'], focus: 'cradle' },
  ],
  'jurayj-0-4': [
    { at: '', sky: 'storm', ground: 'mountains', motifs: ['tower', 'path', 'dark-clouds'], focus: 'path' },
    { at: 'détruisirent son ermitage', motifs: ['ruins', 'stones', 'dark-clouds'], focus: 'ruins' },
    { at: 'On l’accusa', motifs: ['ruins', 'cradle', 'dark-clouds'], focus: 'cradle' },
  ],
  'jurayj-0-5': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['ruins', 'cradle', 'clouds'], focus: 'cradle' },
    { at: 'Laissez-moi prier', motifs: ['ruins', 'light'], focus: 'light' },
    { at: 'L’enfant répondit', motifs: ['cradle', 'sheep', 'light'], focus: 'sheep' },
  ],
  'jurayj-0-6': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['ruins', 'path', 'light'], focus: 'ruins' },
    { at: 'et proposèrent de reconstruire', motifs: ['ruins', 'gold'], focus: 'gold' },
    { at: 'Et ils le firent', motifs: ['tower', 'light', 'path'], focus: 'tower' },
  ],
  'jurayj-0-7': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['cradle', 'path', 'sun'], focus: 'cradle', cut: true },
    { at: 'Un homme bien vêtu passa', motifs: ['cradle', 'path', 'footprints', 'sun'], focus: 'footprints' },
  ],
  'jurayj-0-8': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['cradle', 'path', 'palm'], focus: 'cradle' },
    { at: 'Abou Hourayra croyait encore', motifs: ['palm', 'path', 'sun'], focus: 'palm' },
  ],
  'jurayj-0-9': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['path', 'house'], focus: 'path' },
    { at: 'Elle disait', motifs: ['house', 'light'], focus: 'light' },
    { at: 'La mère dit', motifs: ['cradle', 'house', 'path'], focus: 'cradle' },
  ],
  'jurayj-0-10': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['cradle', 'house', 'lamp'], focus: 'cradle' },
    { at: 'et il expliqua', motifs: ['house', 'lamp', 'dark-clouds'], focus: 'dark-clouds' },
    { at: 'Quant à cette fille', motifs: ['house', 'lamp', 'light'], focus: 'lamp' },
  ],
  'jurayj-0-11': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['tower', 'light'], focus: 'tower', cut: true },
    { at: 'Et l’on ne juge pas', motifs: ['tower', 'path', 'sun'], focus: 'path' },
  ],

  // ── L’homme qui avait tué quatre-vingt-dix-neuf personnes ──
  'repentir-du-meurtrier-0-0': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['stars', 'path'], focus: 'path' },
    { at: 'Parmi les Bani Israël', motifs: ['path', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'repentir-du-meurtrier-0-1': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['path', 'footprints'], focus: 'footprints' },
    { at: 'Il rencontra un moine', sky: 'day', motifs: ['path', 'tower'], focus: 'tower' },
  ],
  'repentir-du-meurtrier-0-2': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['tower', 'path'], focus: 'tower' },
    { at: 'Alors l’homme le tua', sky: 'dusk', motifs: ['tower', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'repentir-du-meurtrier-0-3': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['path', 'footprints'], focus: 'footprints' },
    { at: 'jusqu’à ce qu’un homme lui conseille', motifs: ['path', 'house'], focus: 'house' },
  ],
  'repentir-du-meurtrier-0-4': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['path', 'footprints'], focus: 'footprints' },
    { at: 'En mourant, il tourna sa poitrine', sky: 'dusk', motifs: ['house', 'path', 'footprints'], focus: 'house' },
  ],
  'repentir-du-meurtrier-0-5': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['stars', 'light'], focus: 'light' },
    { at: 'et les anges du châtiment', motifs: ['light', 'dark-clouds', 'stars'], focus: 'dark-clouds' },
  ],
  'repentir-du-meurtrier-0-6': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['house', 'path', 'light'], focus: 'house' },
    { at: 'et au village d’où il venait', motifs: ['wall', 'path', 'light'], focus: 'wall' },
  ],
  'repentir-du-meurtrier-0-7': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['wall', 'footprints', 'path', 'house'], focus: 'footprints' },
    { at: 'On le trouva plus proche', motifs: ['house', 'footprints', 'light'], focus: 'house' },
    { at: 'Ainsi, il fut pardonné', sky: 'day', motifs: ['house', 'light', 'sun'], focus: 'light' },
  ],
  'repentir-du-meurtrier-0-8': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['sun', 'light', 'path'], focus: 'sun' },
    { at: 'la porte du repentir reste ouverte', motifs: ['house', 'path', 'light'], focus: 'house' },
  ],

  // ── L’homme qui donna à boire à un chien ──
  'chien-assoiffe-0-0': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['path', 'sun'], focus: 'sun' },
    { at: 'Un homme marchait', motifs: ['path', 'footprints', 'sun'], focus: 'footprints' },
  ],
  'chien-assoiffe-0-1': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['well', 'rope', 'footprints'], focus: 'rope' },
  ],
  'chien-assoiffe-0-2': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['well', 'rope', 'path'], focus: 'rope' },
    { at: 'qui haletait et mangeait de la terre', motifs: ['dog', 'well', 'path'], focus: 'dog' },
    { at: 'L’homme se dit', motifs: ['well', 'dog', 'light'], focus: 'well' },
  ],
  'chien-assoiffe-0-3': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['well', 'rope', 'dog'], focus: 'well' },
    { at: 'et remplit sa chaussure d’eau', motifs: ['well', 'rope', 'goblet'], focus: 'goblet' },
    { at: 'et donna à boire au chien', motifs: ['dog', 'goblet', 'well'], focus: 'dog' },
  ],
  'chien-assoiffe-0-4': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['well', 'dog'], focus: 'dog' },
    { at: 'et lui pardonna', motifs: ['well', 'light'], focus: 'light' },
  ],
  'chien-assoiffe-0-5': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'palm', 'path'], focus: 'house', cut: true },
    { at: 'si nous aidons les animaux', motifs: ['dog', 'house', 'palm'], focus: 'dog' },
  ],
  'chien-assoiffe-0-6': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'dog', 'palm', 'stars'], focus: 'stars' },
  ],
  'chien-assoiffe-0-7': [
    { at: '', sky: 'dawn', ground: 'garden', motifs: ['palm', 'spring'], focus: 'palm' },
    { at: 'un peu d’eau donnée', motifs: ['spring', 'dog', 'palm'], focus: 'dog' },
    { at: 'valut à cet homme le pardon', motifs: ['spring', 'light', 'birds'], focus: 'light' },
  ],

  // ── La pécheresse et le chien ──
  'pecheresse-et-chien-0-0': [{ at: '', sky: 'dawn', ground: 'desert', motifs: ['path', 'sun'], focus: 'horizon' }],
  'pecheresse-et-chien-0-1': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['path', 'footprints'], focus: 'footprints' },
    { at: 'à cause d’un chien', motifs: ['path', 'dog', 'light'], focus: 'dog' },
  ],
  'pecheresse-et-chien-0-2': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['path', 'footprints', 'well'], focus: 'well' },
    { at: 'où se trouvait un chien qui haletait', motifs: ['well', 'dog', 'path'], focus: 'dog' },
  ],
  'pecheresse-et-chien-0-3': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['dog', 'sun', 'well'], focus: 'sun' },
  ],
  'pecheresse-et-chien-0-4': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['well', 'rope'], focus: 'rope' },
    { at: 'et puisa de l’eau pour lui', motifs: ['well', 'rope', 'goblet', 'dog'], focus: 'goblet' },
  ],
  'pecheresse-et-chien-0-5': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['well', 'dog', 'light'], focus: 'light' },
  ],
  'pecheresse-et-chien-0-6': [
    { at: '', sky: 'dawn', ground: 'garden', motifs: ['light', 'spring'], focus: 'light' },
    { at: 'une bonne action sincère', motifs: ['spring', 'dog', 'palms'], focus: 'dog' },
  ],

  // ── La femme et le chat ──
  'femme-et-chat-0-0': [{ at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'wall', 'path'], focus: 'house' }],
  'femme-et-chat-0-1': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'moon', 'path'], focus: 'house' },
    { at: 'Elle l’avait enfermé', motifs: ['house', 'key', 'moon'], focus: 'key' },
  ],
  'femme-et-chat-0-2': [
    { at: '', sky: 'storm', ground: 'city', motifs: ['house', 'dark-clouds', 'lightning'], focus: 'dark-clouds' },
  ],
  'femme-et-chat-0-3': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'key', 'lamp'], focus: 'lamp' },
  ],
  'femme-et-chat-0-4': [
    { at: '', sky: 'dawn', ground: 'garden', motifs: ['house', 'key', 'tree'], focus: 'tree' },
    { at: 'pour qu’il puisse manger les insectes', sky: 'day', motifs: ['ants', 'tree'], focus: 'ants' },
  ],
  'femme-et-chat-0-5': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['light', 'tree', 'ants'], focus: 'light' },
    { at: 'Qui garde un animal doit le nourrir', motifs: ['spring', 'tree', 'birds'], focus: 'spring' },
    { at: 'ou le laisser libre', motifs: ['birds', 'ants', 'tree'], focus: 'birds' },
  ],

  // ── L’homme qui emprunta mille dinars ──
  'mille-dinars-0-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'path'], focus: 'house' },
    { at: 'Un homme des Bani Israël demanda', motifs: ['house', 'coins', 'path'], focus: 'coins' },
  ],
  'mille-dinars-0-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'scroll'], focus: 'scroll' },
    { at: 'Allah suffit comme témoin', motifs: ['scroll', 'light'], focus: 'light' },
    { at: 'Il demanda un garant', motifs: ['house', 'coins', 'light'], focus: 'coins' },
  ],
  'mille-dinars-0-2': [
    { at: '', sky: 'day', ground: 'city', motifs: ['coins', 'scroll', 'house'], focus: 'coins' },
    { at: 'L’emprunteur partit alors', ground: 'sea', motifs: ['boat', 'coins'], focus: 'boat' },
  ],
  'mille-dinars-0-3': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['path', 'footprints'], focus: 'footprints' },
    { at: 'mais il n’en trouva aucun', motifs: ['path', 'clouds'], focus: 'horizon' },
  ],
  'mille-dinars-0-4': [
    { at: '', sky: 'dusk', ground: 'sea', motifs: ['planks', 'path'], focus: 'planks' },
    { at: 'y mit les mille dinars', motifs: ['planks', 'coins', 'scroll'], focus: 'coins' },
  ],
  'mille-dinars-0-5': [
    { at: '', sky: 'dusk', ground: 'sea', motifs: ['planks', 'path', 'clouds'], focus: 'planks' },
    { at: 'Ô Allah, Tu sais', motifs: ['planks', 'light'], focus: 'light' },
  ],
  'mille-dinars-0-6': [
    { at: '', sky: 'dusk', ground: 'sea', motifs: ['planks', 'path', 'wind'], focus: 'planks' },
    { at: 'Il jeta le bois dans la mer', sky: 'night', motifs: ['planks', 'wind', 'moon'], focus: 'planks' },
    { at: 'jusqu’à ce qu’il disparaisse', motifs: ['moon', 'wind'], focus: 'horizon' },
  ],
  'mille-dinars-0-7': [
    { at: '', sky: 'dawn', ground: 'sea', motifs: ['sun', 'path', 'clouds'], focus: 'horizon' },
    { at: 'Soudain, il vit le morceau de bois', motifs: ['planks', 'sun', 'path'], focus: 'planks' },
    { at: 'Il l’emporta chez lui', ground: 'city', motifs: ['planks', 'house', 'path'], focus: 'house' },
  ],
  'mille-dinars-0-8': [
    { at: '', sky: 'day', ground: 'city', motifs: ['planks', 'coins', 'scroll', 'house'], focus: 'coins' },
  ],
  'mille-dinars-0-9': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['boat', 'coins'], focus: 'boat' },
    { at: 'Par Allah, j’ai tout fait', motifs: ['boat', 'coins', 'sun'], focus: 'sun' },
  ],
  'mille-dinars-0-10': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'path', 'coins'], focus: 'house' },
    { at: 'Allah m’a fait parvenir l’argent', motifs: ['house', 'light', 'planks', 'coins'], focus: 'light' },
    { at: 'Garde tes mille dinars', motifs: ['coins', 'path', 'footprints'], focus: 'path' },
  ],
  'mille-dinars-0-11': [
    { at: '', sky: 'dawn', ground: 'sea', motifs: ['boat', 'coins', 'light'], focus: 'boat' },
    { at: 'puis remets-t’en à Allah', motifs: ['boat', 'light', 'sun'], focus: 'light' },
  ],

  // ── L’or trouvé dans le terrain ──
  'or-du-terrain-0-0': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['path', 'house'], focus: 'house' },
    { at: 'Un homme acheta un terrain', motifs: ['house', 'path', 'coins'], focus: 'coins' },
  ],
  'or-du-terrain-0-1': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['jar', 'path'], focus: 'jar' },
    { at: 'rempli d’or', motifs: ['jar', 'gold'], focus: 'gold' },
  ],
  'or-du-terrain-0-2': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['jar', 'gold', 'house'], focus: 'gold' },
    { at: 'Je ne t’ai acheté que le terrain', motifs: ['gold', 'house', 'path'], focus: 'house' },
  ],
  'or-du-terrain-0-3': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['house', 'scroll', 'path'], focus: 'scroll' },
    { at: 'avec tout ce qu’il contient', motifs: ['house', 'gold', 'jar'], focus: 'jar' },
  ],
  'or-du-terrain-0-4': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'lamp', 'path'], focus: 'lamp' },
    { at: 'Avez-vous des enfants', motifs: ['cradle', 'lamp', 'house'], focus: 'cradle' },
  ],
  'or-du-terrain-0-5': [
    { at: '', sky: 'night', ground: 'city', motifs: ['cradle', 'house', 'moon'], focus: 'cradle' },
  ],
  'or-du-terrain-0-6': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['house', 'palms'], focus: 'house' },
    { at: 'dépensez cet or pour eux deux', motifs: ['gold', 'coins', 'palms'], focus: 'gold' },
  ],
  'or-du-terrain-0-7': [
    { at: '', sky: 'dawn', ground: 'garden', motifs: ['gold', 'tree', 'light'], focus: 'gold' },
    { at: 'voilà l’honnêteté d’un cœur scrupuleux', motifs: ['lamp', 'light', 'tree'], focus: 'lamp' },
  ],

  // ── L’homme qui retira une branche épineuse ──
  'branche-epineuse-0-0': [{ at: '', sky: 'dawn', ground: 'plain', motifs: ['path', 'sun'], focus: 'horizon' }],
  'branche-epineuse-0-1': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['path', 'footprints', 'sun'], focus: 'footprints' },
  ],
  'branche-epineuse-0-2': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['path', 'footprints'], focus: 'footprints' },
    { at: 'une branche d’arbre pleine d’épines', motifs: ['path', 'withered', 'footprints'], focus: 'withered' },
  ],
  'branche-epineuse-0-3': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['path', 'footprints', 'tree'], focus: 'path' },
  ],
  'branche-epineuse-0-4': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['path', 'light', 'tree'], focus: 'light' },
  ],
  'branche-epineuse-0-5': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['path', 'sun', 'tree'], focus: 'path' },
    { at: 'Ne méprise jamais un geste simple', motifs: ['path', 'footprints', 'light'], focus: 'light' },
  ],

  // ── Les passagers du bateau ──
  'passagers-du-bateau-0-0': [{ at: '', sky: 'dawn', ground: 'sea', motifs: ['boat', 'sun'], focus: 'boat' }],
  'passagers-du-bateau-0-1': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['boat', 'light', 'clouds'], focus: 'light' },
    { at: 'ressemble à des gens qui ont tiré au sort', motifs: ['boat', 'clouds', 'sun'], focus: 'boat' },
  ],
  'passagers-du-bateau-0-2': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['boat', 'sun', 'clouds'], focus: 'sky' },
    { at: 'd’autres en bas', motifs: ['boat', 'sun'], focus: 'ground' },
  ],
  'passagers-du-bateau-0-3': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['boat', 'jar'], focus: 'jar' },
    { at: 'et cela dérangeait ceux du haut', motifs: ['boat', 'jar', 'clouds'], focus: 'clouds' },
  ],
  'passagers-du-bateau-0-4': [
    { at: '', sky: 'dusk', ground: 'sea', motifs: ['boat', 'wind'], focus: 'boat' },
    { at: 'pour prendre de l’eau', motifs: ['boat', 'jar', 'wind'], focus: 'jar' },
  ],
  'passagers-du-bateau-0-5': [
    { at: '', sky: 'storm', ground: 'sea', motifs: ['boat', 'dark-clouds', 'lightning'], focus: 'dark-clouds' },
    { at: 'tout le monde serait perdu', motifs: ['boat', 'flood', 'rain'], focus: 'flood' },
  ],
  'passagers-du-bateau-0-6': [
    { at: '', sky: 'dawn', ground: 'sea', motifs: ['boat', 'clouds', 'light'], focus: 'light' },
  ],
  'passagers-du-bateau-0-7': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['boat', 'light'], focus: 'light' },
    { at: 'empêcher le mal protège', motifs: ['boat', 'sun'], focus: 'sun' },
  ],

  // ── L’homme qui ordonna de brûler son corps ──
  'cendres-dispersees-0-0': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['house', 'path'], focus: 'house' },
    { at: 'Un homme commettait de mauvaises actions', motifs: ['house', 'dark-clouds', 'path'], focus: 'dark-clouds' },
  ],
  'cendres-dispersees-0-1': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['house', 'lamp'], focus: 'lamp' },
    { at: 'brûlez mon corps', motifs: ['house', 'lamp', 'fire'], focus: 'fire' },
    { at: 'et dispersez la cendre dans l’air', motifs: ['house', 'wind', 'stars'], focus: 'wind' },
  ],
  'cendres-dispersees-0-2': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['house', 'dark-clouds', 'lamp'], focus: 'dark-clouds' },
    { at: 'Il me punira comme', motifs: ['dark-clouds', 'lightning', 'house'], focus: 'lightning' },
  ],
  'cendres-dispersees-0-3': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['house', 'fire', 'wind'], focus: 'fire' },
  ],
  'cendres-dispersees-0-4': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['light', 'wind'], focus: 'ground' },
    { at: 'Elle le fit', motifs: ['light', 'sun'], focus: 'light' },
  ],
  'cendres-dispersees-0-5': [
    { at: '', sky: 'dawn', ground: 'none', motifs: ['light', 'clouds'], focus: 'light' },
    { at: 'Il répondit', motifs: ['light', 'lamp'], focus: 'lamp' },
  ],
  'cendres-dispersees-0-6': [{ at: '', sky: 'day', ground: 'none', motifs: ['sun', 'light'], focus: 'sun' }],
  'cendres-dispersees-0-7': [
    { at: '', sky: 'dawn', ground: 'garden', motifs: ['light', 'spring'], focus: 'spring' },
    { at: 'Ne désespère jamais de Son pardon', motifs: ['light', 'palms', 'spring'], focus: 'light' },
  ],

  // ── Le voyageur et sa monture perdue ──
  'joie-du-repentir-0-0': [{ at: '', sky: 'dawn', ground: 'desert', motifs: ['light', 'sun'], focus: 'light' }],
  'joie-du-repentir-0-1': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['light', 'crescent'], focus: 'light' },
    { at: 'que l’un de vous ne le serait', motifs: ['path', 'light', 'sun'], focus: 'path' },
  ],
  'joie-du-repentir-0-2': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['camel', 'path', 'sun'], focus: 'camel' },
    { at: 'Sa nourriture et sa boisson', motifs: ['camel', 'bread', 'jar', 'sun'], focus: 'bread' },
  ],
  'joie-du-repentir-0-3': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['footprints', 'sun', 'path'], focus: 'footprints' },
  ],
  'joie-du-repentir-0-4': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['footprints', 'palm'], focus: 'palm' },
  ],
  'joie-du-repentir-0-5': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['camel', 'palm', 'light'], focus: 'camel' },
    { at: 'Il saisit sa longe', motifs: ['camel', 'rope', 'palm'], focus: 'rope' },
  ],
  'joie-du-repentir-0-6': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['camel', 'rope', 'light'], focus: 'light' },
    { at: 'Il se trompe ainsi', motifs: ['camel', 'jar', 'bread', 'light'], focus: 'jar' },
  ],
  'joie-du-repentir-0-7': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['light', 'sun', 'camel'], focus: 'light' },
    { at: 'Ne tarde pas à revenir vers Lui', motifs: ['path', 'footprints', 'light'], focus: 'path' },
  ],

  // ── Le dernier homme à entrer au Paradis ──
  'dernier-au-paradis-0-0': [
    { at: '', sky: 'night', ground: 'none', motifs: ['stars', 'moon'], focus: 'sky' },
    { at: 'le dernier à sortir du Feu', motifs: ['stars', 'flames'], focus: 'flames' },
    { at: 'le dernier à entrer au Paradis', motifs: ['stars', 'palms', 'flames'], focus: 'palms' },
  ],
  'dernier-au-paradis-0-1': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['flames', 'path', 'footprints'], focus: 'footprints' },
    { at: 'Allah lui dira', motifs: ['path', 'light', 'footprints'], focus: 'light' },
  ],
  'dernier-au-paradis-0-2': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['palms', 'spring', 'path'], focus: 'palms' },
    { at: 'Il reviendra et dira', motifs: ['path', 'footprints', 'light'], focus: 'footprints' },
  ],
  'dernier-au-paradis-0-3': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['light', 'palms', 'path'], focus: 'light' },
    { at: 'tu auras l’équivalent du monde', motifs: ['palace', 'palms', 'spring'], focus: 'palace' },
  ],
  'dernier-au-paradis-0-4': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['palace', 'palms'], focus: 'palace' },
    { at: 'alors que Tu es le Roi', motifs: ['throne', 'light', 'palace'], focus: 'throne' },
  ],
  'dernier-au-paradis-0-5': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['light', 'sun', 'palace'], focus: 'sun' },
  ],
  'dernier-au-paradis-0-6': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['palms', 'spring', 'palace'], focus: 'ground' },
  ],
  'dernier-au-paradis-0-7': [
    { at: '', sky: 'dawn', ground: 'garden', motifs: ['palms', 'spring', 'light'], focus: 'light' },
    { at: 'Ne désespère jamais', motifs: ['light', 'tree', 'path'], focus: 'path' },
  ],
};
