import type { Storyboard } from '../types';

/*
 * Pictures of: ashab-al-jannah, ashab-al-fil, muhammad, grotte, moussa-et-khidr.
 */
export const BOARD_7: Storyboard = {
  // ═════════ Les propriétaires du verger ═════════
  // ── Épisode 1 : le serment et le complot ──
  'ashab-al-jannah-0-0': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['palms', 'tree', 'dates'], focus: 'palms' },
    { at: 'qu’Il avait mis à l’épreuve', motifs: ['tree', 'dates', 'light'], focus: 'dates' },
  ],
  'ashab-al-jannah-0-1': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['tree', 'dates', 'basket', 'crescent'], focus: 'basket' },
    { at: 'Allah précise', motifs: ['tree', 'dates', 'crescent'], focus: 'sky' },
  ],
  'ashab-al-jannah-0-2': [
    { at: '', sky: 'night', ground: 'garden', motifs: ['tree', 'dates', 'moon', 'stars'], focus: 'moon' },
    { at: 'une calamité venue d’Allah', motifs: ['tree', 'dark-clouds', 'wind'], focus: 'dark-clouds' },
  ],
  'ashab-al-jannah-0-3': [
    { at: '', sky: 'night', ground: 'garden', motifs: ['withered', 'wind', 'moon'], focus: 'withered' },
    { at: 'Mais eux ne le savaient pas encore', motifs: ['withered', 'moon', 'stars'], focus: 'sky' },
  ],
  'ashab-al-jannah-0-4': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['house', 'path', 'sun'], focus: 'sun', cut: true },
    { at: '« Partez tôt à votre champ', motifs: ['path', 'basket', 'sun'], focus: 'path' },
  ],
  'ashab-al-jannah-0-5': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['path', 'footprints', 'wall', 'sun'], focus: 'wall' },
  ],
  'ashab-al-jannah-0-6': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['path', 'footprints', 'sun'], focus: 'footprints' },
    { at: 'et persuadés d’avoir tout en leur pouvoir', motifs: ['path', 'footprints', 'key'], focus: 'key' },
  ],
  'ashab-al-jannah-0-7': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['path', 'footprints', 'clouds'], focus: 'clouds' },
    { at: 'Mais que vont-ils trouver en arrivant', ground: 'garden', motifs: ['path', 'footprints', 'clouds'], focus: 'horizon' },
  ],

  // ── Épisode 2 : le verger dévasté et le repentir ──
  'ashab-al-jannah-1-0': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['withered', 'path', 'footprints', 'sun'], focus: 'withered' },
    { at: '« Nous nous sommes trompés de chemin', motifs: ['withered', 'path', 'clouds'], focus: 'path' },
  ],
  'ashab-al-jannah-1-1': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['withered', 'footprints', 'dark-clouds'], focus: 'withered' },
  ],
  'ashab-al-jannah-1-2': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['withered', 'footprints', 'light'], focus: 'light' },
  ],
  'ashab-al-jannah-1-3': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['withered', 'crescent', 'light'], focus: 'crescent' },
  ],
  'ashab-al-jannah-1-4': [
    { at: '', sky: 'night', ground: 'garden', motifs: ['withered', 'moon', 'stars'], focus: 'withered' },
    { at: 'et dirent', motifs: ['withered', 'stars', 'footprints'], focus: 'footprints' },
  ],
  'ashab-al-jannah-1-5': [
    { at: '', sky: 'dawn', ground: 'garden', motifs: ['withered', 'sun', 'light'], focus: 'sun' },
    { at: 'C’est vers notre Seigneur', motifs: ['path', 'sun', 'light'], focus: 'path' },
  ],
  'ashab-al-jannah-1-6': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['withered', 'dark-clouds', 'wind'], focus: 'dark-clouds' },
  ],
  'ashab-al-jannah-1-7': [
    { at: '', sky: 'dawn', ground: 'garden', motifs: ['withered', 'bread', 'basket'], focus: 'bread' },
    { at: 'Mais il n’est jamais trop tard', motifs: ['palms', 'bread', 'light', 'sun'], focus: 'palms' },
  ],

  // ═════════ Les gens de l'Éléphant ═════════
  'ashab-al-fil-0-0': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['elephant', 'path', 'sun'], focus: 'elephant' },
    { at: 'racontée dans une courte sourate', motifs: ['book', 'elephant', 'sun'], focus: 'book' },
  ],
  'ashab-al-fil-0-1': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['book', 'elephant', 'light'], focus: 'light' },
    { at: 'que la paix et les bénédictions', motifs: ['elephant', 'kaaba', 'path', 'sun'], focus: 'elephant' },
  ],
  'ashab-al-fil-0-2': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['elephant', 'path', 'kaaba'], focus: 'elephant' },
    { at: 'Mais Allah la rendit', motifs: ['elephant', 'kaaba', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'ashab-al-fil-0-3': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['birds', 'dark-clouds', 'elephant'], focus: 'birds' },
  ],
  'ashab-al-fil-0-4': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['birds', 'stones', 'elephant'], focus: 'stones' },
  ],
  'ashab-al-fil-0-5': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['wheat', 'wind', 'stones'], focus: 'wheat' },
  ],
  'ashab-al-fil-0-6': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['kaaba', 'elephant', 'light'], focus: 'kaaba' },
    { at: 'Et Allah peut se servir', motifs: ['kaaba', 'birds', 'light'], focus: 'birds' },
  ],

  // ═════════ Muhammad ﷺ ═════════
  // ── Épisode 1 : Lis ! ──
  'muhammad-0-0': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['stars', 'crescent', 'rock'], focus: 'crescent' },
    { at: 'Et tout commence par un mot', motifs: ['stars', 'crescent', 'rock', 'light'], focus: 'light' },
  ],
  'muhammad-0-1': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['cave-mouth', 'rock', 'stars'], focus: 'cave-mouth' },
    { at: 'voici les tout premiers versets', motifs: ['cave-mouth', 'light', 'stars'], focus: 'light' },
  ],
  'muhammad-0-2': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['cave-mouth', 'light', 'book', 'stars'], focus: 'book' },
  ],
  'muhammad-0-3': [
    { at: '', sky: 'night', ground: 'none', motifs: ['stars', 'light'], focus: 'light' },
    { at: 'Et Il répète', motifs: ['book', 'light', 'stars'], focus: 'book' },
  ],
  'muhammad-0-4': [
    { at: '', sky: 'dawn', ground: 'none', motifs: ['light', 'book', 'sun'], focus: 'light' },
    { at: 'la plume qui sert à écrire', motifs: ['scroll', 'light', 'sun'], focus: 'scroll' },
  ],
  'muhammad-0-5': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['book', 'light', 'rock'], focus: 'book' },
  ],
  'muhammad-0-6': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['book', 'sun', 'rock'], focus: 'book' },
    { at: 'Chercher à apprendre', motifs: ['path', 'book', 'sun'], focus: 'path' },
  ],

  // ── Épisode 2 : Lève-toi et avertis ──
  'muhammad-1-0': [
    { at: '', sky: 'dusk', ground: 'mountains', motifs: ['book', 'path', 'clouds', 'crescent'], focus: 'path' },
  ],
  'muhammad-1-1': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['book', 'stars', 'light'], focus: 'stars' },
    { at: '« Ô toi, le revêtu d’un manteau', motifs: ['rock', 'stars', 'light'], focus: 'light' },
  ],
  'muhammad-1-2': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['sun', 'light', 'path'], focus: 'sun' },
  ],
  'muhammad-1-3': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'path', 'light', 'sun'], focus: 'house' },
  ],
  'muhammad-1-4': [
    { at: '', sky: 'day', ground: 'river', motifs: ['spring', 'shirt', 'light'], focus: 'shirt' },
    { at: 'Et de tout péché, écarte-toi', motifs: ['path', 'light', 'spring'], focus: 'path' },
  ],
  'muhammad-1-5': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['coins', 'path', 'sun'], focus: 'coins' },
    { at: 'Et pour ton Seigneur, sois patient', motifs: ['path', 'footprints', 'sun'], focus: 'footprints' },
  ],
  'muhammad-1-6': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['path', 'footprints', 'house'], focus: 'footprints' },
    { at: 'voilà la mission confiée', motifs: ['path', 'house', 'light'], focus: 'light' },
  ],

  // ── Épisode 3 : Ton Seigneur ne t'a pas abandonné ──
  'muhammad-2-0': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['sun', 'light', 'palm'], focus: 'sun' },
  ],
  'muhammad-2-1': [
    { at: '', sky: 'night', ground: 'valley', motifs: ['moon', 'stars', 'palm'], focus: 'moon' },
  ],
  'muhammad-2-2': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['light', 'sun', 'palm'], focus: 'light' },
  ],
  'muhammad-2-3': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['sun', 'palm', 'path'], focus: 'path' },
    { at: 'Et son Seigneur lui donnera', motifs: ['palm', 'dates', 'light'], focus: 'dates' },
  ],
  'muhammad-2-4': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['tent', 'palm', 'sun'], focus: 'tent' },
  ],
  'muhammad-2-5': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['tent', 'path', 'light'], focus: 'path' },
    { at: 'Il l’a trouvé pauvre', motifs: ['tent', 'coins', 'dates'], focus: 'coins' },
  ],
  'muhammad-2-6': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'dates', 'light'], focus: 'house' },
  ],
  'muhammad-2-7': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'bread', 'lamp'], focus: 'bread' },
    { at: 'Et le bienfait de ton Seigneur', motifs: ['house', 'lamp', 'light', 'dates'], focus: 'light' },
  ],
  'muhammad-2-8': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['lamp', 'light', 'palm'], focus: 'lamp' },
    { at: 'Gardons espoir', motifs: ['light', 'palm', 'sun'], focus: 'sun' },
    { at: 'et prenons soin des orphelins', motifs: ['bread', 'lamp', 'house'], focus: 'bread' },
  ],

  // ── Épisode 4 : Le voyage nocturne ──
  'muhammad-3-0': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'kaaba', 'stars'], focus: 'kaaba' },
    { at: 'le Prophète, que la paix', motifs: ['kaaba', 'stars', 'light'], focus: 'light' },
  ],
  'muhammad-3-1': [
    { at: '', sky: 'night', ground: 'city', motifs: ['kaaba', 'crescent', 'stars'], focus: 'kaaba' },
    { at: 'la mosquée de la Kaaba', motifs: ['kaaba', 'pillars', 'path'], focus: 'pillars' },
  ],
  'muhammad-3-2': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['path', 'bright-star', 'stars'], focus: 'path' },
    { at: 'dont Il a béni les alentours', ground: 'garden', motifs: ['pillars', 'palms', 'light', 'bright-star'], focus: 'pillars' },
  ],
  'muhammad-3-3': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['kaaba', 'path', 'pillars', 'stars', 'light'], focus: 'path' },
  ],
  'muhammad-3-4': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['stars', 'moon', 'bright-star', 'light'], focus: 'bright-star' },
    { at: 'C’est Lui qui entend tout', motifs: ['stars', 'light', 'crescent'], focus: 'sky' },
  ],
  'muhammad-3-5': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['pillars', 'light', 'kaaba'], focus: 'kaaba' },
    { at: 'Pour Lui, rien n’est impossible', motifs: ['kaaba', 'sun', 'light'], focus: 'sun' },
  ],

  // ── Épisode 5 : Dans la grotte ──
  'muhammad-4-0': [
    { at: '', sky: 'night', ground: 'city', motifs: ['wall', 'house', 'path', 'stars'], focus: 'wall', cut: true },
    { at: 'Il partit avec un seul compagnon', ground: 'mountains', motifs: ['path', 'footprints', 'stars'], focus: 'footprints' },
  ],
  'muhammad-4-1': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['cave-mouth', 'path', 'footprints', 'moon'], focus: 'cave-mouth' },
    { at: 'Ce compagnon était Abou Bakr', motifs: ['cave-mouth', 'rock', 'moon', 'stars'], focus: 'moon' },
  ],
  'muhammad-4-2': [
    { at: '', sky: 'night', ground: 'cave', motifs: ['cave-mouth', 'stars', 'rock'], focus: 'cave-mouth' },
    { at: '« Ne t’afflige pas', motifs: ['cave-mouth', 'stars', 'light'], focus: 'light' },
  ],
  'muhammad-4-3': [
    { at: '', sky: 'night', ground: 'cave', motifs: ['light', 'cave-mouth', 'moon'], focus: 'light' },
    { at: 'et le soutint de soldats', motifs: ['stars', 'light', 'rock', 'cave-mouth'], focus: 'stars' },
  ],
  'muhammad-4-4': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['cave-mouth', 'rock', 'clouds'], focus: 'clouds' },
    { at: 'et c’est la parole d’Allah', motifs: ['cave-mouth', 'sun', 'light'], focus: 'sun' },
  ],
  'muhammad-4-5': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['cave-mouth', 'light', 'book', 'rock'], focus: 'book' },
  ],
  'muhammad-4-6': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['path', 'footprints', 'light'], focus: 'path' },
  ],

  // ── Épisode 6 : Le dernier des prophètes ──
  'muhammad-5-0': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['pillars', 'light', 'house'], focus: 'pillars' },
  ],
  'muhammad-5-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['book', 'light', 'pillars'], focus: 'book' },
  ],
  'muhammad-5-2': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'sun', 'pillars'], focus: 'house' },
    { at: 'et le sceau des prophètes', motifs: ['book', 'house', 'sun', 'light'], focus: 'book' },
  ],
  'muhammad-5-3': [
    { at: '', sky: 'night', ground: 'city', motifs: ['house', 'stars', 'bright-star'], focus: 'bright-star' },
  ],
  'muhammad-5-4': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'light', 'sun'], focus: 'sun' },
    { at: 'comme une miséricorde pour l’univers', ground: 'plain', motifs: ['light', 'sun', 'birds', 'tree', 'palms'], focus: 'birds' },
  ],
  'muhammad-5-5': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['path', 'footprints', 'light', 'sun'], focus: 'footprints' },
    { at: 'et une miséricorde pour tous', motifs: ['path', 'light', 'birds', 'palms'], focus: 'birds' },
  ],

  // ═════════ Les trois hommes de la grotte ═════════
  'grotte-0-0': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['sun', 'rock', 'clouds'], focus: 'rock' },
    { at: 'Trois hommes partirent en voyage', motifs: ['path', 'footprints', 'clouds'], focus: 'footprints' },
  ],
  'grotte-0-1': [
    { at: '', sky: 'storm', ground: 'mountains', motifs: ['rain', 'dark-clouds', 'path'], focus: 'dark-clouds' },
    { at: 'ils se réfugièrent dans une grotte', motifs: ['cave-mouth', 'rain', 'path'], focus: 'cave-mouth' },
    { at: 'Alors une pierre tomba', motifs: ['rock', 'cave-mouth', 'rain', 'dark-clouds'], focus: 'rock' },
  ],
  'grotte-0-2': [
    { at: '', sky: 'night', ground: 'cave', motifs: ['rock', 'stones'], focus: 'rock' },
  ],
  'grotte-0-3': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['house', 'tree', 'sun'], focus: 'house', cut: true },
    { at: 'Je gardais le troupeau', motifs: ['sheep', 'house', 'sun'], focus: 'sheep' },
    { at: 'je servais le lait', sky: 'night', motifs: ['goblet', 'house', 'moon'], focus: 'goblet' },
  ],
  'grotte-0-4': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['path', 'footprints', 'wheat'], focus: 'wheat' },
    { at: 'je suis rentré le soir', sky: 'night', motifs: ['house', 'lamp', 'moon'], focus: 'lamp' },
    { at: 'Je suis resté debout', motifs: ['goblet', 'lamp', 'house'], focus: 'goblet' },
  ],
  'grotte-0-5': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['goblet', 'lamp', 'house'], focus: 'lamp' },
    { at: 'et je suis resté ainsi jusqu’au matin', sky: 'dawn', motifs: ['house', 'goblet', 'light'], focus: 'light' },
    { at: 'Ô Allah, si Tu sais', sky: 'night', ground: 'cave', motifs: ['rock', 'stones'], focus: 'rock', cut: true },
    { at: 'La pierre bougea un peu', motifs: ['rock', 'stones', 'stars'], focus: 'stars' },
  ],
  'grotte-0-6': [
    { at: '', sky: 'night', ground: 'cave', motifs: ['rock', 'stones', 'stars'], focus: 'stones' },
    { at: 'Il était sur le point de', ground: 'plain', motifs: ['house', 'lamp', 'moon'], focus: 'lamp', cut: true },
    { at: 'Alors il se leva et renonça', motifs: ['house', 'path', 'footprints', 'moon'], focus: 'footprints' },
  ],
  'grotte-0-7': [
    { at: '', sky: 'night', ground: 'cave', motifs: ['rock', 'stones', 'stars'], focus: 'rock', cut: true },
    { at: 'Et leur situation s’améliora', motifs: ['rock', 'stones', 'stars', 'light'], focus: 'light' },
  ],
  'grotte-0-8': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['basket', 'wheat', 'footprints', 'sun'], focus: 'basket', cut: true },
    { at: 'Alors j’ai semé ce riz', motifs: ['wheat', 'tree', 'sun'], focus: 'wheat' },
    { at: 'riche en vaches et en troupeaux', motifs: ['cows', 'sheep', 'wheat'], focus: 'cows' },
  ],
  'grotte-0-9': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['path', 'footprints', 'cows', 'sheep'], focus: 'footprints' },
    { at: 'Je lui ai dit : prends ces vaches', motifs: ['cows', 'sheep', 'sun', 'tree'], focus: 'cows' },
  ],
  'grotte-0-10': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['sheep', 'cows', 'path', 'footprints'], focus: 'path' },
    { at: 'Ô Allah, si Tu sais', sky: 'night', ground: 'cave', motifs: ['rock', 'stones', 'stars', 'light'], focus: 'rock', cut: true },
    { at: 'Et Allah les délivra', sky: 'dawn', ground: 'mountains', motifs: ['cave-mouth', 'rock', 'light', 'path'], focus: 'cave-mouth' },
  ],
  'grotte-0-11': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['gold', 'light', 'cave-mouth'], focus: 'gold' },
    { at: 'dans l’épreuve, on peut', motifs: ['path', 'light', 'rock', 'sun'], focus: 'path' },
  ],

  // ═════════ Moussa et al-Khidr ═════════
  'moussa-et-khidr-0-0': [
    { at: '', sky: 'dawn', ground: 'sea', motifs: ['book', 'light', 'sun'], focus: 'book' },
    { at: 'a raconté cette histoire du prophète Moussa', motifs: ['light', 'sun', 'path'], focus: 'path' },
  ],
  'moussa-et-khidr-0-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['pillars', 'scroll', 'sun'], focus: 'scroll', cut: true },
    { at: 'Il répondit', motifs: ['pillars', 'scroll', 'book'], focus: 'book' },
    { at: 'Allah le lui reprocha', motifs: ['scroll', 'light', 'clouds'], focus: 'light' },
  ],
  'moussa-et-khidr-0-2': [
    { at: '', sky: 'night', ground: 'sea', motifs: ['scroll', 'light', 'stars'], focus: 'light' },
    { at: 'Prends un poisson dans un panier', motifs: ['basket', 'light', 'stars', 'rock'], focus: 'basket' },
  ],
  'moussa-et-khidr-0-3': [
    { at: '', sky: 'dusk', ground: 'sea', motifs: ['path', 'footprints', 'basket'], focus: 'footprints' },
    { at: 'Près d’un rocher, ils s’endormirent', motifs: ['rock', 'basket', 'moon'], focus: 'rock' },
    { at: 'et le poisson sortit du panier', motifs: ['rock', 'basket', 'sea-split', 'moon'], focus: 'sea-split' },
  ],
  'moussa-et-khidr-0-4': [
    { at: '', sky: 'dawn', ground: 'sea', motifs: ['footprints', 'path', 'sun'], focus: 'path' },
    { at: 'Moussa demanda le repas', motifs: ['bread', 'basket', 'footprints'], focus: 'bread' },
    { at: 'et ils revinrent sur leurs pas', sky: 'day', motifs: ['footprints', 'path', 'rock', 'sun'], focus: 'rock' },
  ],
  'moussa-et-khidr-0-5': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['rock', 'footprints', 'shirt'], focus: 'shirt' },
    { at: '« Puis-je te suivre', motifs: ['rock', 'book', 'light', 'shirt'], focus: 'book' },
  ],
  'moussa-et-khidr-0-6': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['rock', 'path', 'sun'], focus: 'path' },
    { at: 'J’ai une science qu’Allah m’a apprise', motifs: ['book', 'scroll', 'path'], focus: 'book' },
    { at: '« Si Allah le veut', motifs: ['path', 'footprints', 'sun'], focus: 'footprints' },
  ],
  'moussa-et-khidr-0-7': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['path', 'boat', 'sun'], focus: 'boat' },
    { at: 'Un moineau trempa son bec', motifs: ['boat', 'birds', 'sun'], focus: 'birds' },
    { at: '« Notre science n’enlève', motifs: ['boat', 'birds', 'light'], focus: 'light' },
  ],
  'moussa-et-khidr-0-8': [
    { at: '', sky: 'day', ground: 'sea', motifs: ['boat', 'planks', 'clouds'], focus: 'planks' },
    { at: '« Ils nous ont pris gratuitement', motifs: ['boat', 'planks', 'sun'], focus: 'boat' },
    { at: 'Moussa s’excusa', motifs: ['boat', 'clouds', 'light'], focus: 'light' },
  ],
  'moussa-et-khidr-0-9': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['path', 'footprints', 'clouds'], focus: 'path' },
    { at: '« As-tu tué une âme innocente', motifs: ['path', 'footprints', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'moussa-et-khidr-0-10': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['path', 'house', 'bread'], focus: 'house' },
    { at: 'Al-Khidr répara un mur', motifs: ['wall', 'ruins', 'house'], focus: 'wall' },
    { at: '« C’est ici que nos chemins', motifs: ['wall', 'path', 'footprints'], focus: 'path' },
  ],
  'moussa-et-khidr-0-11': [
    { at: '', sky: 'dawn', ground: 'sea', motifs: ['path', 'light', 'sun'], focus: 'sun' },
    { at: 'S’il avait été plus patient', motifs: ['path', 'footprints', 'light'], focus: 'footprints' },
    { at: 'Pour apprendre, il faut', motifs: ['book', 'light', 'birds', 'sun'], focus: 'book' },
  ],
};
