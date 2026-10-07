import type { Storyboard } from '../types';

/*
 * Pictures of Adam, Houd, Salih and of episodes 1 and 3 of Nûh.
 * Each scene is told over pictures that follow the narration, with objects
 * staying on screen until the text says they are gone.
 */
export const BOARD_1: Storyboard = {
  // ═══════════ ADAM ═══════════
  // ── Épisode 1 : Un successeur sur la terre ──
  'adam-0-0': [
    { at: '', sky: 'dawn', ground: 'none', motifs: ['clouds', 'light'], focus: 'sky' },
    { at: 'Je vais établir sur la terre un successeur', ground: 'plain', motifs: ['light', 'clouds'], focus: 'ground' },
  ],
  'adam-0-1': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['stars', 'bright-star'], focus: 'ground' },
    { at: 'alors qu’eux célébraient Sa gloire', motifs: ['stars', 'bright-star', 'light'], focus: 'bright-star' },
    { at: 'Allah répondit', motifs: ['light', 'stars'], focus: 'light' },
  ],
  'adam-0-2': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['light', 'tree', 'birds', 'sheep'], focus: 'light' },
    { at: 'Puis Il présenta ces choses aux anges', motifs: ['tree', 'birds', 'sheep', 'camel', 'light'], focus: 'sky' },
  ],
  'adam-0-3': [{ at: '', sky: 'night', ground: 'none', motifs: ['stars', 'bright-star', 'light'], focus: 'light' }],
  'adam-0-4': [
    { at: '', sky: 'day', ground: 'none', motifs: ['light', 'tree', 'birds'], focus: 'tree' },
    { at: 'Puis Allah ordonna aux anges', motifs: ['light', 'clouds'], focus: 'sky' },
    { at: 'Tous se prosternèrent, sauf Iblis', motifs: ['light', 'clouds', 'fire', 'dark-clouds'], focus: 'fire' },
  ],
  'adam-0-5': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['light', 'palms', 'spring'], focus: 'palms' },
    { at: 'Mais n’approchez pas de cet arbre', motifs: ['tree', 'palms', 'spring'], focus: 'tree' },
  ],
  'adam-0-6': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['tree', 'wind', 'palms'], focus: 'wind' },
    { at: 'Allah leur dit de descendre', ground: 'plain', motifs: ['tree', 'path', 'footprints'], focus: 'footprints' },
    { at: 'ils auraient une demeure', motifs: ['house', 'wheat', 'path'], focus: 'house' },
  ],
  'adam-0-7': [{ at: '', sky: 'dawn', ground: 'plain', motifs: ['light', 'path', 'clouds'], focus: 'light' }],
  'adam-0-8': [{ at: '', sky: 'day', ground: 'valley', motifs: ['path', 'light', 'sun'], focus: 'light' }],
  'adam-0-9': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['sun', 'path', 'footprints'], focus: 'footprints' },
    { at: 'et la promesse d’une guidance', motifs: ['sun', 'path', 'light', 'clouds'], focus: 'light' },
  ],

  // ── Épisode 2 : L’orgueil d’Iblis et l’arbre interdit ──
  'adam-1-0': [
    { at: '', sky: 'day', ground: 'none', motifs: ['light', 'clouds'], focus: 'sky' },
    { at: 'Tous se prosternèrent, sauf Iblis', motifs: ['light', 'clouds', 'fire'], focus: 'fire' },
  ],
  'adam-1-1': [
    { at: '', sky: 'dusk', ground: 'none', motifs: ['light', 'fire'], focus: 'light' },
    { at: 'Iblis répondit', ground: 'plain', motifs: ['fire', 'dark-clouds'], focus: 'fire' },
  ],
  'adam-1-2': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['light', 'fire', 'dark-clouds'], focus: 'light' },
    { at: 'Iblis fut chassé', motifs: ['dark-clouds', 'wind'], focus: 'dark-clouds' },
  ],
  'adam-1-3': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['light', 'dark-clouds', 'stars'], focus: 'sky' },
    { at: 'Il jura alors d’assaillir les hommes', motifs: ['wind', 'dark-clouds', 'path'], focus: 'wind' },
    { at: 'pour les détourner du droit chemin', motifs: ['path', 'footprints', 'wind'], focus: 'path' },
  ],
  'adam-1-4': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['light', 'palms', 'spring'], focus: 'palms', cut: true },
    { at: 'Mais n’approchez pas de cet arbre', motifs: ['tree', 'palms', 'spring'], focus: 'tree' },
  ],
  'adam-1-5': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['tree', 'wind', 'palms'], focus: 'wind' },
    { at: 'Et il leur jura', motifs: ['tree', 'wind', 'dark-clouds'], focus: 'tree' },
  ],
  'adam-1-6': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['tree', 'wind', 'dark-clouds'], focus: 'tree' },
    { at: 'leur nudité leur apparut', motifs: ['palms', 'tree', 'clouds'], focus: 'palms' },
    { at: 'Leur Seigneur leur rappela', motifs: ['light', 'tree', 'dark-clouds'], focus: 'light' },
  ],
  'adam-1-7': [{ at: '', sky: 'night', ground: 'garden', motifs: ['tree', 'stars', 'light'], focus: 'light' }],
  'adam-1-8': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['light', 'path', 'footprints'], focus: 'path' },
    { at: 'ils y vivraient', motifs: ['sun', 'path', 'wheat', 'palm'], focus: 'wheat' },
  ],
  'adam-1-9': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['light', 'palm', 'path'], focus: 'light' },
    { at: 'c’est le chemin du retour', motifs: ['path', 'light', 'clouds', 'sun'], focus: 'path' },
  ],

  // ── Épisode 3 : L’oubli, le repentir et la guidance ──
  'adam-2-0': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['book', 'palms', 'light'], focus: 'book' },
    { at: 'au Paradis', motifs: ['tree', 'palms', 'spring'], focus: 'tree' },
  ],
  'adam-2-1': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['tree', 'fire', 'light'], focus: 'fire' },
    { at: 'Allah avertit alors Adam', motifs: ['tree', 'fire', 'dark-clouds', 'wind'], focus: 'dark-clouds' },
  ],
  'adam-2-2': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['dates', 'spring', 'palms'], focus: 'dates' },
    { at: 'Il n’y serait pas nu', motifs: ['palms', 'tree', 'clouds'], focus: 'palms' },
  ],
  'adam-2-3': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['tree', 'wind', 'dark-clouds'], focus: 'wind' },
    { at: 'Ô Adam, veux-tu', motifs: ['tree', 'palms', 'wind'], focus: 'tree' },
  ],
  'adam-2-4': [
    { at: '', sky: 'night', ground: 'garden', motifs: ['tree', 'moon', 'wind'], focus: 'tree' },
    { at: 'leur nudité leur apparut', motifs: ['palms', 'tree', 'moon'], focus: 'palms' },
    { at: 'Adam avait désobéi', motifs: ['tree', 'moon', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'adam-2-5': [{ at: '', sky: 'dawn', ground: 'garden', motifs: ['light', 'tree', 'path'], focus: 'light' }],
  'adam-2-6': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['path', 'footprints', 'tree'], focus: 'footprints' },
    { at: 'Et Il promit', motifs: ['path', 'light', 'sun'], focus: 'light' },
  ],
  'adam-2-7': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['path', 'footprints', 'sun'], focus: 'footprints' },
    { at: 'Ce qui compte', sky: 'night', ground: 'mountains', motifs: ['lamp', 'stars', 'path'], focus: 'lamp' },
  ],

  // ── Épisode 4 : Les deux fils d’Adam ──
  'adam-3-0': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['sun', 'light', 'path'], focus: 'sun' },
    { at: 'Chacun d’eux présenta une offrande', motifs: ['basket', 'light', 'path'], focus: 'basket' },
  ],
  'adam-3-1': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['basket', 'light'], focus: 'light' },
    { at: 'celle de l’autre ne le fut pas', motifs: ['basket', 'dark-clouds', 'wind'], focus: 'dark-clouds' },
    { at: 'Son frère répondit', motifs: ['path', 'light', 'dark-clouds'], focus: 'light' },
  ],
  'adam-3-2': [{ at: '', sky: 'day', ground: 'valley', motifs: ['tree', 'light', 'path'], focus: 'light' }],
  'adam-3-3': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['dark-clouds', 'wind', 'path'], focus: 'wind' },
    { at: 'Il le fit, et devint', motifs: ['dark-clouds', 'footprints', 'path'], focus: 'footprints' },
  ],
  'adam-3-4': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['raven', 'dark-clouds', 'path'], focus: 'raven' },
    { at: 'qui se mit à gratter la terre', motifs: ['raven', 'footprints'], focus: 'ground' },
  ],
  'adam-3-5': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['raven', 'moon', 'stars'], focus: 'raven' },
    { at: 'Et il fut rongé', motifs: ['moon', 'footprints'], focus: 'moon' },
  ],
  'adam-3-6': [{ at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'scroll', 'light', 'footprints'], focus: 'scroll' }],
  'adam-3-7': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['house', 'palms', 'light'], focus: 'house' },
    { at: 'Ne laissons jamais la jalousie', motifs: ['spring', 'palms', 'tree'], focus: 'spring' },
  ],

  // ═══════════ HOUD ═══════════
  // ── Épisode 1 : Des châteaux comme pour l’éternité ──
  'hud-0-0': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['palace', 'tower'], focus: 'palace' },
    { at: 'l’un des leurs', motifs: ['palace', 'path', 'footprints'], focus: 'footprints' },
  ],
  'hud-0-1': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['tower', 'path', 'footprints'], focus: 'footprints' },
    { at: 'Craignez Allah', motifs: ['tower', 'light', 'path'], focus: 'light' },
  ],
  'hud-0-2': [
    { at: '', sky: 'dusk', ground: 'mountains', motifs: ['tower', 'wall'], focus: 'tower' },
    { at: 'et il ajouta', motifs: ['palace', 'tower', 'pillars', 'wall'], focus: 'palace' },
  ],
  'hud-0-3': [{ at: '', sky: 'day', ground: 'city', motifs: ['wall', 'palace', 'dark-clouds'], focus: 'wall' }],
  'hud-0-4': [
    { at: '', sky: 'day', ground: 'city', motifs: ['wall', 'sheep', 'camel', 'cradle'], focus: 'sheep' },
    { at: 'des jardins et des sources', ground: 'garden', motifs: ['palms', 'spring', 'sheep'], focus: 'spring' },
  ],
  'hud-0-5': [{ at: '', sky: 'dusk', ground: 'desert', motifs: ['palms', 'dark-clouds', 'wind'], focus: 'dark-clouds' }],
  'hud-0-6': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'palms', 'wall'], focus: 'palace' },
    { at: 'Ce ne sont là que les coutumes', motifs: ['palace', 'pillars', 'wall'], focus: 'pillars' },
    { at: 'et nous ne serons pas châtiés', motifs: ['palace', 'pillars', 'sun'], focus: 'sun' },
  ],
  'hud-0-7': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['palace', 'dark-clouds', 'wind'], focus: 'dark-clouds' },
    { at: 'et Allah les fit périr', sky: 'storm', motifs: ['palace', 'dark-clouds', 'wind', 'lightning'], focus: 'wind' },
  ],
  'hud-0-8': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['ruins', 'sun'], focus: 'ruins' },
    { at: 'et ton Seigneur est le Puissant', motifs: ['ruins', 'light', 'clouds'], focus: 'light' },
  ],

  // ── Épisode 2 : Houd face à son peuple ──
  'hud-1-0': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['tower', 'palms', 'path'], focus: 'path' },
    { at: 'Vous n’avez pas d’autre divinité', motifs: ['tower', 'palms', 'light'], focus: 'light' },
  ],
  'hud-1-1': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['palace', 'tower', 'coins'], focus: 'coins' },
    { at: 'sa récompense', motifs: ['palace', 'tower', 'light'], focus: 'light' },
  ],
  'hud-1-2': [{ at: '', sky: 'day', ground: 'valley', motifs: ['clouds', 'rain', 'palms', 'light'], focus: 'rain' }],
  'hud-1-3': [
    { at: '', sky: 'day', ground: 'city', motifs: ['pillars', 'wall', 'light'], focus: 'light' },
    { at: 'Nous n’abandonnerons pas nos divinités', motifs: ['pillars', 'wall', 'palace'], focus: 'pillars' },
  ],
  'hud-1-4': [
    { at: '', sky: 'dusk', ground: 'mountains', motifs: ['tower', 'pillars', 'wall'], focus: 'pillars' },
    { at: 'Houd déclara', motifs: ['tower', 'light', 'path'], focus: 'light' },
    { at: 'et les défia de comploter', motifs: ['tower', 'wall', 'dark-clouds', 'path'], focus: 'tower' },
  ],
  'hud-1-5': [{ at: '', sky: 'night', ground: 'mountains', motifs: ['tower', 'path', 'light', 'stars'], focus: 'light' }],
  'hud-1-6': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['path', 'footprints', 'tower'], focus: 'footprints' },
    { at: 'Allah pouvait les remplacer', motifs: ['path', 'light', 'clouds'], focus: 'light' },
  ],
  'hud-1-7': [{ at: '', sky: 'storm', ground: 'desert', motifs: ['dark-clouds', 'wind', 'light', 'path'], focus: 'wind' }],
  'hud-1-8': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['ruins', 'sun', 'path'], focus: 'ruins' },
    { at: 'Le prochain épisode', motifs: ['ruins', 'clouds', 'wind'], focus: 'clouds' },
  ],

  // ── Épisode 3 : Le nuage et le vent ──
  'hud-2-0': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['sun', 'path'], focus: 'horizon' },
    { at: 'D’autres avertisseurs', motifs: ['sun', 'path', 'footprints'], focus: 'footprints' },
  ],
  'hud-2-1': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['palms', 'path', 'light'], focus: 'light' },
    { at: 'Je crains pour vous', sky: 'dusk', motifs: ['palms', 'path', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'hud-2-2': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['tower', 'wall', 'path'], focus: 'tower' },
    { at: 'Apporte-nous donc', motifs: ['tower', 'wall', 'dark-clouds', 'path'], focus: 'dark-clouds' },
  ],
  'hud-2-3': [{ at: '', sky: 'dusk', ground: 'mountains', motifs: ['scroll', 'light', 'tower', 'path'], focus: 'scroll' }],
  'hud-2-4': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['clouds', 'path', 'tower'], focus: 'horizon' },
    { at: 'approcher de leurs vallées', sky: 'storm', motifs: ['clouds', 'dark-clouds', 'wind', 'tower'], focus: 'dark-clouds' },
  ],
  'hud-2-5': [
    { at: '', sky: 'storm', ground: 'desert', motifs: ['wind', 'dark-clouds', 'tower'], focus: 'wind' },
    { at: 'Le lendemain', sky: 'day', motifs: ['ruins', 'wind', 'sun'], focus: 'ruins' },
  ],
  'hud-2-6': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['ruins', 'sun', 'light'], focus: 'light' },
    { at: 'Mais cela ne leur servit à rien', sky: 'dusk', motifs: ['ruins', 'wind', 'clouds'], focus: 'wind' },
  ],
  'hud-2-7': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['clouds', 'ruins', 'wind'], focus: 'clouds' },
    { at: 'Ouvrons nos yeux', motifs: ['sun', 'clouds', 'light', 'path'], focus: 'light' },
  ],

  // ── Épisode 4 : Sept nuits et huit jours ──
  'hud-3-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'tower', 'gold', 'pillars'], focus: 'gold' },
    { at: 'mais ils avaient refusé le message', sky: 'dusk', motifs: ['palace', 'tower', 'scroll', 'dark-clouds'], focus: 'scroll' },
  ],
  'hud-3-1': [{ at: '', sky: 'storm', ground: 'desert', motifs: ['wind', 'dark-clouds', 'palace', 'tower'], focus: 'wind' }],
  'hud-3-2': [
    { at: '', sky: 'night', ground: 'valley', motifs: ['wind', 'dark-clouds', 'withered', 'moon'], focus: 'wind' },
    { at: 'et huit jours', sky: 'day', motifs: ['wind', 'withered', 'sun', 'dark-clouds'], focus: 'sun' },
  ],
  'hud-3-3': [{ at: '', sky: 'dawn', ground: 'desert', motifs: ['ruins', 'withered', 'sun'], focus: 'ground' }],
  'hud-3-4': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['ruins', 'sun'], focus: 'ruins' },
    { at: 'Houd les avait pourtant', ground: 'valley', motifs: ['path', 'sun', 'light'], focus: 'light' },
    { at: 'qui aurait ajouté force', sky: 'day', motifs: ['clouds', 'rain', 'palms', 'path'], focus: 'rain' },
  ],

  // ═══════════ SALIH ═══════════
  // ── Épisode 1 : Des maisons taillées dans la montagne ──
  'salih-0-0': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['ruins', 'sun', 'path'], focus: 'ruins' },
    { at: 'Allah leur envoya', ground: 'mountains', motifs: ['house', 'path', 'light'], focus: 'house' },
  ],
  'salih-0-1': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['palms', 'house', 'path'], focus: 'path' },
    { at: 'Je suis pour vous un messager', motifs: ['palms', 'path', 'light', 'footprints'], focus: 'footprints' },
  ],
  'salih-0-2': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['spring', 'palms', 'tree'], focus: 'spring' },
    { at: 'des cultures', motifs: ['wheat', 'palms', 'dates'], focus: 'wheat' },
  ],
  'salih-0-3': [{ at: '', sky: 'dusk', ground: 'mountains', motifs: ['house', 'cave-mouth', 'rock', 'palms'], focus: 'cave-mouth' }],
  'salih-0-4': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['palace', 'wall', 'pillars'], focus: 'palace' },
    { at: 'qui sèment le désordre', motifs: ['palace', 'wall', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'salih-0-5': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'house', 'wall'], focus: 'house' },
    { at: 'Apporte donc un prodige', ground: 'mountains', motifs: ['house', 'rock', 'cave-mouth', 'light'], focus: 'light' },
  ],
  'salih-0-6': [{ at: '', sky: 'day', ground: 'desert', motifs: ['camel', 'spring', 'rock'], focus: 'camel' }],
  'salih-0-7': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['camel', 'spring', 'dark-clouds'], focus: 'camel' },
    { at: 'Mais ils la tuèrent', sky: 'dusk', motifs: ['spring', 'footprints', 'dark-clouds'], focus: 'footprints' },
  ],
  'salih-0-8': [
    { at: '', sky: 'storm', ground: 'mountains', motifs: ['dark-clouds', 'lightning', 'house', 'rock'], focus: 'lightning' },
    { at: 'Voilà bien un signe', motifs: ['ruins', 'rock', 'dark-clouds'], focus: 'ruins' },
  ],
  'salih-0-9': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['ruins', 'sun', 'light'], focus: 'sun' },
    { at: 'Dans l’épisode suivant', motifs: ['camel', 'sun', 'light', 'rock'], focus: 'camel' },
  ],

  // ── Épisode 2 : La chamelle, signe d’Allah ──
  'salih-1-0': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['house', 'rock', 'cave-mouth', 'palms'], focus: 'house' },
    { at: 'Leur frère Salih', motifs: ['house', 'path', 'footprints', 'palms'], focus: 'footprints' },
  ],
  'salih-1-1': [{ at: '', sky: 'dawn', ground: 'valley', motifs: ['light', 'spring', 'palms', 'path'], focus: 'light' }],
  'salih-1-2': [
    { at: '', sky: 'day', ground: 'city', motifs: ['pillars', 'house', 'path'], focus: 'path' },
    { at: 'Veux-tu nous interdire', motifs: ['pillars', 'wall', 'palace'], focus: 'pillars' },
  ],
  'salih-1-3': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['pillars', 'wall', 'light'], focus: 'light' },
    { at: 'qui donc le protégerait', sky: 'night', ground: 'mountains', motifs: ['rock', 'stars', 'light'], focus: 'rock' },
  ],
  'salih-1-4': [{ at: '', sky: 'day', ground: 'desert', motifs: ['camel', 'sun', 'rock', 'light'], focus: 'camel' }],
  'salih-1-5': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['rock', 'footprints', 'dark-clouds'], focus: 'footprints' },
    { at: 'Salih leur dit', ground: 'mountains', motifs: ['house', 'crescent', 'rock'], focus: 'house' },
  ],
  'salih-1-6': [{ at: '', sky: 'dawn', ground: 'plain', motifs: ['light', 'path', 'footprints', 'rock'], focus: 'footprints' }],
  'salih-1-7': [
    { at: '', sky: 'storm', ground: 'mountains', motifs: ['dark-clouds', 'wind', 'house', 'rock'], focus: 'wind' },
    { at: 'et ils restèrent étendus', motifs: ['ruins', 'rock', 'dark-clouds'], focus: 'ruins' },
  ],
  'salih-1-8': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['ruins', 'stars', 'light'], focus: 'light' },
    { at: 'et Il répond', motifs: ['stars', 'bright-star', 'light'], focus: 'bright-star' },
  ],

  // ── Épisode 3 : Les orgueilleux et les croyants ──
  'salih-2-0': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['house', 'rock', 'light'], focus: 'house' },
    { at: 'et leur présenta la chamelle', ground: 'desert', motifs: ['camel', 'rock', 'light'], focus: 'camel' },
  ],
  'salih-2-1': [{ at: '', sky: 'day', ground: 'mountains', motifs: ['palace', 'house', 'rock', 'palms'], focus: 'palace' }],
  'salih-2-2': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['camel', 'palms'], focus: 'camel' },
    { at: 'et de ne lui faire aucun mal', motifs: ['camel', 'palms', 'light', 'path'], focus: 'light' },
  ],
  'salih-2-3': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['palace', 'wall', 'path'], focus: 'palace' },
    { at: 'aux plus faibles', motifs: ['palace', 'house', 'lamp'], focus: 'lamp' },
  ],
  'salih-2-4': [{ at: '', sky: 'dusk', ground: 'city', motifs: ['pillars', 'palace', 'wall'], focus: 'pillars' }],
  'salih-2-5': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['pillars', 'footprints', 'dark-clouds'], focus: 'footprints' },
    { at: 'Ô Salih, fais-nous venir', motifs: ['pillars', 'dark-clouds', 'wind'], focus: 'dark-clouds' },
  ],
  'salih-2-6': [
    { at: '', sky: 'storm', ground: 'mountains', motifs: ['dark-clouds', 'wind', 'house'], focus: 'wind' },
    { at: 'et ils restèrent', motifs: ['ruins', 'dark-clouds'], focus: 'ruins' },
  ],
  'salih-2-7': [{ at: '', sky: 'dusk', ground: 'mountains', motifs: ['path', 'footprints', 'ruins'], focus: 'footprints' }],
  'salih-2-8': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['sun', 'palms', 'path'], focus: 'sun' },
    { at: 'Ainsi s’achève', motifs: ['sun', 'palms', 'house', 'light', 'rock'], focus: 'house' },
  ],

  // ═══════════ NÛH (épisodes 1 et 3) ═══════════
  // ── Épisode 1 : Un appel de nuit et de jour ──
  'nuh-0-0': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['house', 'palms', 'light'], focus: 'light' },
    { at: 'avertis ton peuple', sky: 'dusk', motifs: ['house', 'palms', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'nuh-0-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'wall', 'path'], focus: 'path' },
    { at: 'Adorez Allah', motifs: ['house', 'wall', 'light'], focus: 'light' },
  ],
  'nuh-0-2': [{ at: '', sky: 'night', ground: 'city', motifs: ['moon', 'stars', 'house', 'path'], focus: 'moon' }],
  'nuh-0-3': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'wall', 'path', 'footprints'], focus: 'footprints' },
    { at: 'Ils se mettaient', motifs: ['house', 'wall', 'shirt'], focus: 'shirt' },
    { at: 's’entêtaient et s’enflaient', motifs: ['wall', 'palace', 'tower'], focus: 'tower' },
  ],
  'nuh-0-4': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['wall', 'path', 'light'], focus: 'wall' },
    { at: 'puis en secret', ground: 'plain', motifs: ['path', 'light', 'tree'], focus: 'light' },
  ],
  'nuh-0-5': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['clouds', 'rain', 'tree'], focus: 'rain' },
    { at: 'Il vous donnera', motifs: ['cradle', 'gold', 'tree', 'palms'], focus: 'cradle' },
    { at: 'des jardins et des rivières', ground: 'river', motifs: ['palms', 'tree', 'wheat'], focus: 'ground' },
  ],
  'nuh-0-6': [
    { at: '', sky: 'dusk', ground: 'river', motifs: ['clouds', 'stars', 'bright-star', 'palms'], focus: 'sky' },
    { at: 'la lune qui éclaire', motifs: ['moon', 'sun', 'light', 'clouds'], focus: 'moon' },
    { at: 'et la terre étendue', ground: 'plain', motifs: ['path', 'palms', 'sun'], focus: 'path' },
  ],
  'nuh-0-7': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['path', 'footprints', 'dark-clouds'], focus: 'footprints' },
    { at: 'Ils suivirent ceux', motifs: ['gold', 'cradle', 'path', 'dark-clouds'], focus: 'gold' },
    { at: 'À cause de leurs fautes', sky: 'storm', ground: 'sea', motifs: ['flood', 'rain', 'dark-clouds', 'lightning'], focus: 'flood' },
  ],
  'nuh-0-8': [
    { at: '', sky: 'night', ground: 'sea', motifs: ['flood', 'stars', 'light'], focus: 'light' },
    { at: 'pour ses parents', ground: 'valley', motifs: ['house', 'stars', 'light'], focus: 'house' },
  ],
  'nuh-0-9': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['light', 'tree', 'palms'], focus: 'light' },
    { at: 'Dans l’épisode', motifs: ['tree', 'planks', 'light'], focus: 'planks' },
  ],

  // ── Épisode 3 : Mille ans moins cinquante ──
  'nuh-2-0': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['house', 'palms', 'book'], focus: 'book' },
    { at: 'la très longue mission', motifs: ['house', 'palms', 'path', 'footprints'], focus: 'footprints' },
  ],
  'nuh-2-1': [{ at: '', sky: 'day', ground: 'city', motifs: ['sun', 'moon', 'house', 'path'], focus: 'sun' }],
  'nuh-2-2': [
    { at: '', sky: 'night', ground: 'city', motifs: ['moon', 'stars', 'house', 'path'], focus: 'moon' },
    { at: 'de nuit comme de jour', sky: 'dawn', motifs: ['sun', 'house', 'path', 'footprints'], focus: 'sun' },
  ],
  'nuh-2-3': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'dark-clouds', 'path'], focus: 'dark-clouds' },
    { at: 'et le déluge les emporta', sky: 'storm', ground: 'sea', motifs: ['house', 'flood', 'rain', 'dark-clouds'], focus: 'flood' },
  ],
  'nuh-2-4': [{ at: '', sky: 'dawn', ground: 'sea', motifs: ['ark', 'sun', 'flood', 'clouds'], focus: 'ark' }],
  'nuh-2-5': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['ark', 'rock', 'light'], focus: 'ark' },
    { at: 'et de la miséricorde', motifs: ['ark', 'rock', 'light', 'clouds', 'sun'], focus: 'light' },
  ],
};
