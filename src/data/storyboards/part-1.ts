import type { Storyboard } from '../types';

/*
 * Pictures of Adam, Houd, Salih and of episodes 1 and 3 of Nûh.
 * Each scene is told over pictures that follow the narration, with objects
 * staying on screen until the text says they are gone. Ordinary people are
 * silhouettes (folk, crowd, walkers, workers); prophets and angels never are.
 */
export const BOARD_1: Storyboard = {
  // ═══════════ ADAM ═══════════
  // ── Épisode 1 : Un successeur sur la terre ──
  'adam-0-0': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['clouds', 'light', 'birds'], focus: 'sky' },
    { at: 'Je vais établir sur la terre un successeur', motifs: ['light', 'birds', 'butterflies'], focus: 'ground' },
  ],
  'adam-0-1': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['stars', 'bright-star', 'bats'], focus: 'ground' },
    { at: 'alors qu’eux célébraient Sa gloire', motifs: ['stars', 'bright-star', 'light'], focus: 'bright-star' },
    { at: 'Allah répondit', motifs: ['light', 'stars'], focus: 'light' },
  ],
  'adam-0-2': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['light', 'tree', 'birds', 'sheep'], focus: 'light' },
    { at: 'Puis Il présenta ces choses aux anges', motifs: ['tree', 'birds', 'sheep', 'camel', 'light'], focus: 'camel' },
    { at: 'Informez-Moi de leurs noms', motifs: ['light', 'clouds', 'birds', 'camel'], focus: 'sky' },
  ],
  'adam-0-3': [{ at: '', sky: 'night', ground: 'none', motifs: ['stars', 'bright-star', 'light'], focus: 'light' }],
  'adam-0-4': [
    { at: '', sky: 'day', ground: 'none', motifs: ['light', 'tree', 'birds'], focus: 'tree' },
    { at: 'Puis Allah ordonna aux anges', motifs: ['light', 'clouds'], focus: 'sky' },
    { at: 'Tous se prosternèrent, sauf Iblis', motifs: ['light', 'clouds', 'fire', 'dark-clouds'], focus: 'fire' },
  ],
  'adam-0-5': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['light', 'palms', 'spring', 'butterflies'], focus: 'palms' },
    { at: 'Mais n’approchez pas de cet arbre', motifs: ['tree', 'palms', 'spring', 'birds'], focus: 'tree' },
  ],
  'adam-0-6': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['tree', 'wind', 'palms'], focus: 'wind' },
    { at: 'Allah leur dit de descendre', ground: 'plain', motifs: ['tree', 'path', 'footprints', 'birds'], focus: 'footprints' },
    { at: 'ils auraient une demeure', motifs: ['house', 'wheat', 'path', 'birds'], focus: 'house' },
  ],
  'adam-0-7': [{ at: '', sky: 'dawn', ground: 'plain', motifs: ['light', 'path', 'clouds', 'birds'], focus: 'light' }],
  'adam-0-8': [{ at: '', sky: 'day', ground: 'valley', motifs: ['path', 'light', 'sun', 'birds'], focus: 'light' }],
  'adam-0-9': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['sun', 'path', 'footprints', 'birds'], focus: 'footprints' },
    { at: 'avec un repentir accepté', motifs: ['sun', 'path', 'light', 'walkers'], focus: 'walkers' },
  ],

  // ── Épisode 2 : L’orgueil d’Iblis et l’arbre interdit ──
  'adam-1-0': [
    { at: '', sky: 'day', ground: 'none', motifs: ['light', 'clouds', 'birds'], focus: 'sky' },
    { at: 'Ensuite, Il dit aux anges', motifs: ['light', 'clouds'], focus: 'light' },
    { at: 'Tous se prosternèrent, sauf Iblis', motifs: ['light', 'clouds', 'fire'], focus: 'fire' },
  ],
  'adam-1-1': [
    { at: '', sky: 'dusk', ground: 'none', motifs: ['light', 'fire'], focus: 'light' },
    { at: 'Iblis répondit', ground: 'plain', motifs: ['fire', 'dark-clouds'], focus: 'fire' },
  ],
  'adam-1-2': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['light', 'fire', 'dark-clouds'], focus: 'light' },
    { at: 'Iblis fut chassé', motifs: ['dark-clouds', 'wind', 'bats'], focus: 'dark-clouds' },
  ],
  'adam-1-3': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['light', 'dark-clouds', 'stars'], focus: 'sky' },
    { at: 'Il jura alors d’assaillir les hommes', motifs: ['wind', 'dark-clouds', 'walkers', 'path'], focus: 'wind' },
    { at: 'pour les détourner du droit chemin', motifs: ['path', 'footprints', 'walkers', 'wind'], focus: 'path' },
  ],
  'adam-1-4': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['light', 'palms', 'spring', 'butterflies'], focus: 'palms', cut: true },
    { at: 'Mais n’approchez pas de cet arbre', motifs: ['tree', 'palms', 'spring', 'birds'], focus: 'tree' },
  ],
  'adam-1-5': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['tree', 'wind', 'palms'], focus: 'wind' },
    { at: 'pour les empêcher de devenir des anges', motifs: ['tree', 'light', 'palms', 'birds'], focus: 'light' },
    { at: 'Et il leur jura', motifs: ['tree', 'wind', 'dark-clouds'], focus: 'tree' },
  ],
  'adam-1-6': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['tree', 'wind', 'dark-clouds'], focus: 'wind' },
    { at: 'Quand ils goûtèrent de l’arbre', motifs: ['tree', 'dark-clouds', 'clouds'], focus: 'tree' },
    { at: 'leur nudité leur apparut', motifs: ['palms', 'tree', 'clouds', 'birds'], focus: 'palms' },
    { at: 'Leur Seigneur leur rappela', motifs: ['light', 'tree', 'dark-clouds'], focus: 'light' },
  ],
  'adam-1-7': [{ at: '', sky: 'night', ground: 'garden', motifs: ['tree', 'stars', 'light'], focus: 'light' }],
  'adam-1-8': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['light', 'path', 'footprints', 'birds'], focus: 'path' },
    { at: 'ils y vivraient', motifs: ['sun', 'path', 'wheat', 'palm', 'butterflies'], focus: 'wheat' },
  ],
  'adam-1-9': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['light', 'palm', 'path', 'birds'], focus: 'light' },
    { at: 'c’est le chemin du retour', motifs: ['path', 'light', 'clouds', 'walkers'], focus: 'walkers' },
  ],

  // ── Épisode 3 : L’oubli, le repentir et la guidance ──
  'adam-2-0': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['book', 'palms', 'light', 'birds'], focus: 'book' },
    { at: 'au Paradis', motifs: ['tree', 'palms', 'spring', 'butterflies'], focus: 'tree' },
  ],
  'adam-2-1': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['tree', 'fire', 'light'], focus: 'fire' },
    { at: 'Allah avertit alors Adam', motifs: ['tree', 'fire', 'dark-clouds', 'wind'], focus: 'dark-clouds' },
  ],
  'adam-2-2': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['dates', 'spring', 'palms', 'birds'], focus: 'dates' },
    { at: 'Il n’y serait pas nu', motifs: ['palms', 'tree', 'clouds', 'butterflies'], focus: 'palms' },
  ],
  'adam-2-3': [
    { at: '', sky: 'dusk', ground: 'garden', motifs: ['tree', 'wind', 'dark-clouds', 'bats'], focus: 'wind' },
    { at: 'Ô Adam, veux-tu', motifs: ['tree', 'palms', 'wind', 'birds'], focus: 'tree' },
  ],
  'adam-2-4': [
    { at: '', sky: 'night', ground: 'garden', motifs: ['tree', 'moon', 'wind', 'bats'], focus: 'tree' },
    { at: 'leur nudité leur apparut', motifs: ['palms', 'tree', 'moon'], focus: 'palms' },
    { at: 'Adam avait désobéi', motifs: ['tree', 'moon', 'dark-clouds'], focus: 'dark-clouds' },
  ],
  'adam-2-5': [{ at: '', sky: 'dawn', ground: 'garden', motifs: ['light', 'tree', 'path', 'birds'], focus: 'light' }],
  'adam-2-6': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['path', 'footprints', 'tree', 'birds'], focus: 'footprints' },
    { at: 'Et Il promit', motifs: ['path', 'light', 'sun', 'walkers'], focus: 'light' },
  ],
  'adam-2-7': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['path', 'folk', 'sun'], focus: 'folk' },
    { at: 'Ce qui compte', sky: 'night', ground: 'mountains', motifs: ['lamp', 'stars', 'path', 'walkers'], focus: 'lamp' },
  ],

  // ── Épisode 4 : Les deux fils d’Adam ──
  'adam-3-0': [
    { at: '', sky: 'dawn', ground: 'plain', motifs: ['sun', 'light', 'path', 'birds'], focus: 'sun' },
    { at: 'Chacun d’eux présenta une offrande', motifs: ['basket', 'light', 'path', 'folk'], focus: 'basket' },
  ],
  'adam-3-1': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['basket', 'light', 'folk'], focus: 'light' },
    { at: 'celle de l’autre ne le fut pas', motifs: ['basket', 'dark-clouds', 'wind', 'folk'], focus: 'dark-clouds' },
    { at: 'Son frère répondit', motifs: ['path', 'light', 'folk', 'birds'], focus: 'light' },
  ],
  'adam-3-2': [{ at: '', sky: 'day', ground: 'valley', motifs: ['tree', 'light', 'path', 'folk'], focus: 'light' }],
  'adam-3-3': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['dark-clouds', 'wind', 'path', 'folk'], focus: 'wind' },
    { at: 'Il le fit, et devint', motifs: ['dark-clouds', 'footprints', 'path'], focus: 'footprints' },
  ],
  'adam-3-4': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['raven', 'dark-clouds', 'path'], focus: 'raven' },
    { at: 'qui se mit à gratter la terre', motifs: ['raven', 'footprints', 'folk'], focus: 'ground' },
  ],
  'adam-3-5': [
    { at: '', sky: 'night', ground: 'plain', motifs: ['raven', 'moon', 'stars'], focus: 'raven' },
    { at: 'Et il fut rongé', motifs: ['moon', 'footprints', 'folk'], focus: 'moon' },
  ],
  'adam-3-6': [{ at: '', sky: 'dawn', ground: 'city', motifs: ['house', 'scroll', 'light', 'footprints', 'folk'], focus: 'scroll' }],
  'adam-3-7': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['house', 'palms', 'light', 'folk'], focus: 'house' },
    { at: 'Ne laissons jamais la jalousie', motifs: ['spring', 'palms', 'tree', 'butterflies', 'folk'], focus: 'spring' },
  ],

  // ═══════════ HOUD ═══════════
  // ── Épisode 1 : Des châteaux comme pour l’éternité ──
  'hud-0-0': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['palace', 'tower', 'crowd'], focus: 'palace' },
    { at: 'l’un des leurs', motifs: ['palace', 'path', 'footprints', 'folk'], focus: 'footprints' },
  ],
  'hud-0-1': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['tower', 'path', 'footprints', 'folk'], focus: 'footprints' },
    { at: 'Je suis pour vous un messager', motifs: ['tower', 'light', 'path', 'folk'], focus: 'light' },
    { at: 'Je ne vous demande aucun salaire', motifs: ['tower', 'coins', 'folk'], focus: 'coins' },
  ],
  'hud-0-2': [
    { at: '', sky: 'dusk', ground: 'mountains', motifs: ['tower', 'wall', 'workers'], focus: 'tower' },
    { at: 'et il ajouta', motifs: ['palace', 'tower', 'pillars', 'folk'], focus: 'palace' },
  ],
  'hud-0-3': [
    { at: '', sky: 'day', ground: 'city', motifs: ['wall', 'palace', 'crowd'], focus: 'wall' },
    { at: 'quand ils sévissaient', motifs: ['wall', 'palace', 'dark-clouds', 'folk'], focus: 'dark-clouds' },
  ],
  'hud-0-4': [
    { at: '', sky: 'day', ground: 'city', motifs: ['wall', 'folk', 'light'], focus: 'folk' },
    { at: 'des troupeaux et des enfants', motifs: ['sheep', 'camel', 'cradle', 'wall'], focus: 'sheep' },
    { at: 'des jardins et des sources', ground: 'garden', motifs: ['palms', 'spring', 'sheep', 'butterflies'], focus: 'spring' },
  ],
  'hud-0-5': [{ at: '', sky: 'dusk', ground: 'desert', motifs: ['palms', 'dark-clouds', 'wind', 'crowd'], focus: 'dark-clouds' }],
  'hud-0-6': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'palms', 'wall', 'crowd'], focus: 'palace' },
    { at: 'Ce ne sont là que les coutumes', motifs: ['palace', 'pillars', 'wall', 'folk'], focus: 'pillars' },
    { at: 'et nous ne serons pas châtiés', motifs: ['palace', 'pillars', 'sun', 'crowd'], focus: 'sun' },
  ],
  'hud-0-7': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['palace', 'dark-clouds', 'wind', 'crowd'], focus: 'dark-clouds' },
    { at: 'et Allah les fit périr', sky: 'storm', motifs: ['palace', 'dark-clouds', 'wind', 'lightning'], focus: 'wind' },
  ],
  'hud-0-8': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['ruins', 'sun', 'birds'], focus: 'ruins' },
    { at: 'et ton Seigneur est le Puissant', motifs: ['ruins', 'light', 'clouds', 'birds'], focus: 'light' },
    { at: 'Dans l’épisode suivant', motifs: ['ruins', 'path', 'crowd'], focus: 'crowd' },
  ],

  // ── Épisode 2 : Houd face à son peuple ──
  'hud-1-0': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['tower', 'palms', 'path', 'crowd'], focus: 'path' },
    { at: 'Vous n’avez pas d’autre divinité', motifs: ['tower', 'palms', 'light', 'folk'], focus: 'light' },
  ],
  'hud-1-1': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['palace', 'tower', 'coins', 'folk'], focus: 'coins' },
    { at: 'sa récompense', motifs: ['palace', 'tower', 'light'], focus: 'light' },
  ],
  'hud-1-2': [{ at: '', sky: 'day', ground: 'valley', motifs: ['clouds', 'rain', 'palms', 'light', 'folk'], focus: 'rain' }],
  'hud-1-3': [
    { at: '', sky: 'day', ground: 'city', motifs: ['pillars', 'wall', 'light', 'crowd'], focus: 'light' },
    { at: 'Nous n’abandonnerons pas nos divinités', motifs: ['pillars', 'wall', 'palace', 'crowd'], focus: 'pillars' },
    { at: 'et nous ne croyons pas en toi', motifs: ['wall', 'path', 'folk'], focus: 'path' },
  ],
  'hud-1-4': [
    { at: '', sky: 'dusk', ground: 'mountains', motifs: ['tower', 'pillars', 'wall', 'crowd'], focus: 'pillars' },
    { at: 'Houd déclara', motifs: ['tower', 'light', 'path', 'folk'], focus: 'light' },
    { at: 'et les défia de comploter', motifs: ['tower', 'wall', 'dark-clouds', 'crowd'], focus: 'tower' },
  ],
  'hud-1-5': [{ at: '', sky: 'night', ground: 'mountains', motifs: ['tower', 'path', 'light', 'stars', 'crowd'], focus: 'light' }],
  'hud-1-6': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['path', 'footprints', 'tower', 'walkers'], focus: 'footprints' },
    { at: 'Allah pouvait les remplacer', motifs: ['path', 'light', 'clouds', 'crowd'], focus: 'light' },
  ],
  'hud-1-7': [{ at: '', sky: 'storm', ground: 'desert', motifs: ['dark-clouds', 'wind', 'light', 'path', 'folk'], focus: 'wind' }],
  'hud-1-8': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['ruins', 'sun', 'path', 'birds'], focus: 'ruins' },
    { at: 'Le prochain épisode', motifs: ['ruins', 'clouds', 'wind'], focus: 'clouds' },
  ],

  // ── Épisode 3 : Le nuage et le vent ──
  'hud-2-0': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['sun', 'path', 'folk'], focus: 'horizon' },
    { at: 'D’autres avertisseurs étaient passés', motifs: ['sun', 'path', 'footprints'], focus: 'footprints' },
    { at: 'et d’autres vinrent après lui', motifs: ['path', 'footprints', 'clouds', 'birds'], focus: 'horizon' },
  ],
  'hud-2-1': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['palms', 'path', 'light', 'folk'], focus: 'light' },
    { at: 'Je crains pour vous', sky: 'dusk', motifs: ['palms', 'path', 'dark-clouds', 'crowd'], focus: 'dark-clouds' },
  ],
  'hud-2-2': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['tower', 'wall', 'path', 'folk'], focus: 'tower' },
    { at: 'Apporte-nous donc', motifs: ['tower', 'wall', 'dark-clouds', 'crowd'], focus: 'dark-clouds' },
  ],
  'hud-2-3': [{ at: '', sky: 'dusk', ground: 'mountains', motifs: ['scroll', 'light', 'path', 'folk'], focus: 'scroll' }],
  'hud-2-4': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['clouds', 'path', 'tower', 'crowd'], focus: 'horizon' },
    { at: 'approcher de leurs vallées', sky: 'storm', motifs: ['clouds', 'dark-clouds', 'wind', 'tower', 'crowd'], focus: 'dark-clouds' },
  ],
  'hud-2-5': [
    { at: '', sky: 'storm', ground: 'desert', motifs: ['wind', 'dark-clouds', 'tower'], focus: 'wind' },
    { at: 'Le lendemain', sky: 'day', motifs: ['ruins', 'wind', 'sun'], focus: 'ruins' },
  ],
  'hud-2-6': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'tower', 'crowd', 'light'], focus: 'palace', cut: true },
    { at: 'Mais cela ne leur servit à rien', sky: 'dusk', ground: 'desert', motifs: ['ruins', 'wind', 'clouds', 'light'], focus: 'wind' },
  ],
  'hud-2-7': [
    { at: '', sky: 'dusk', ground: 'valley', motifs: ['clouds', 'ruins', 'wind'], focus: 'clouds' },
    { at: 'était ce qu’ils avaient', motifs: ['clouds', 'dark-clouds', 'wind', 'ruins'], focus: 'dark-clouds' },
    { at: 'Ouvrons nos yeux', motifs: ['sun', 'clouds', 'light', 'path', 'walkers'], focus: 'light' },
  ],

  // ── Épisode 4 : Sept nuits et huit jours ──
  'hud-3-0': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'tower', 'gold', 'crowd'], focus: 'gold' },
    { at: 'mais ils avaient refusé le message', sky: 'dusk', motifs: ['palace', 'tower', 'scroll', 'dark-clouds', 'crowd'], focus: 'scroll' },
  ],
  'hud-3-1': [{ at: '', sky: 'storm', ground: 'desert', motifs: ['wind', 'dark-clouds', 'palace', 'tower'], focus: 'wind' }],
  'hud-3-2': [
    { at: '', sky: 'night', ground: 'valley', motifs: ['wind', 'dark-clouds', 'withered', 'moon'], focus: 'wind' },
    { at: 'et huit jours', sky: 'day', motifs: ['wind', 'withered', 'sun', 'dark-clouds'], focus: 'sun' },
  ],
  'hud-3-3': [{ at: '', sky: 'dawn', ground: 'desert', motifs: ['ruins', 'withered', 'sun'], focus: 'ground' }],
  'hud-3-4': [
    { at: '', sky: 'dawn', ground: 'desert', motifs: ['ruins', 'sun', 'birds'], focus: 'ruins' },
    { at: 'Houd les avait pourtant', ground: 'valley', motifs: ['path', 'sun', 'light', 'crowd'], focus: 'light' },
    { at: 'qui aurait ajouté force', sky: 'day', motifs: ['clouds', 'rain', 'palms', 'path', 'birds'], focus: 'rain' },
  ],

  // ═══════════ SALIH ═══════════
  // ── Épisode 1 : Des maisons taillées dans la montagne ──
  'salih-0-0': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['ruins', 'sun', 'path', 'birds'], focus: 'ruins' },
    { at: 'Allah leur envoya', ground: 'mountains', motifs: ['house', 'path', 'light', 'folk'], focus: 'house' },
  ],
  'salih-0-1': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['palms', 'house', 'path', 'folk'], focus: 'path' },
    { at: 'Je suis pour vous un messager', motifs: ['palms', 'path', 'light', 'footprints', 'folk'], focus: 'footprints' },
    { at: 'et je ne vous demande aucun salaire', motifs: ['palms', 'path', 'folk', 'birds'], focus: 'birds' },
  ],
  'salih-0-2': [
    { at: '', sky: 'day', ground: 'garden', motifs: ['spring', 'palms', 'tree', 'butterflies'], focus: 'spring' },
    { at: 'des cultures', motifs: ['wheat', 'palms', 'dates', 'birds'], focus: 'wheat' },
  ],
  'salih-0-3': [{ at: '', sky: 'dusk', ground: 'mountains', motifs: ['house', 'cave-mouth', 'rock', 'palms', 'workers'], focus: 'workers' }],
  'salih-0-4': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['palace', 'wall', 'pillars', 'crowd'], focus: 'palace' },
    { at: 'qui sèment le désordre', motifs: ['palace', 'wall', 'dark-clouds', 'crowd'], focus: 'dark-clouds' },
  ],
  'salih-0-5': [
    { at: '', sky: 'day', ground: 'city', motifs: ['palace', 'house', 'wall', 'crowd'], focus: 'house' },
    { at: 'Apporte donc un prodige', ground: 'mountains', motifs: ['house', 'rock', 'cave-mouth', 'light', 'folk'], focus: 'light' },
  ],
  'salih-0-6': [{ at: '', sky: 'day', ground: 'desert', motifs: ['camel', 'spring', 'rock', 'folk'], focus: 'camel' }],
  'salih-0-7': [
    { at: '', sky: 'day', ground: 'desert', motifs: ['camel', 'spring', 'rock', 'folk'], focus: 'camel' },
    { at: 'sinon le châtiment', motifs: ['camel', 'spring', 'dark-clouds', 'wind'], focus: 'dark-clouds' },
    { at: 'Mais ils la tuèrent', sky: 'dusk', motifs: ['spring', 'footprints', 'dark-clouds', 'crowd'], focus: 'footprints' },
  ],
  'salih-0-8': [
    { at: '', sky: 'storm', ground: 'mountains', motifs: ['dark-clouds', 'lightning', 'house', 'rock'], focus: 'lightning' },
    { at: 'Voilà bien un signe', motifs: ['ruins', 'rock', 'dark-clouds'], focus: 'ruins' },
  ],
  'salih-0-9': [
    { at: '', sky: 'dawn', ground: 'mountains', motifs: ['ruins', 'sun', 'light', 'birds'], focus: 'sun' },
    { at: 'Dans l’épisode suivant', motifs: ['camel', 'sun', 'light', 'rock'], focus: 'camel' },
  ],

  // ── Épisode 2 : La chamelle, signe d’Allah ──
  'salih-1-0': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['house', 'rock', 'cave-mouth', 'palms', 'folk'], focus: 'house' },
    { at: 'Leur frère Salih', motifs: ['house', 'path', 'footprints', 'palms', 'birds'], focus: 'footprints' },
  ],
  'salih-1-1': [{ at: '', sky: 'dawn', ground: 'valley', motifs: ['light', 'spring', 'palms', 'path', 'folk'], focus: 'light' }],
  'salih-1-2': [
    { at: '', sky: 'day', ground: 'city', motifs: ['pillars', 'house', 'path', 'crowd'], focus: 'path' },
    { at: 'Veux-tu nous interdire', motifs: ['pillars', 'wall', 'palace', 'crowd'], focus: 'pillars' },
  ],
  'salih-1-3': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['pillars', 'wall', 'light', 'folk'], focus: 'light' },
    { at: 'qui donc le protégerait', sky: 'night', ground: 'mountains', motifs: ['rock', 'stars', 'light', 'bats'], focus: 'rock' },
  ],
  'salih-1-4': [{ at: '', sky: 'day', ground: 'desert', motifs: ['camel', 'sun', 'rock', 'light', 'folk'], focus: 'camel' }],
  'salih-1-5': [
    { at: '', sky: 'dusk', ground: 'desert', motifs: ['rock', 'footprints', 'dark-clouds', 'folk'], focus: 'footprints' },
    { at: 'Salih leur dit', ground: 'mountains', motifs: ['house', 'crescent', 'rock', 'crowd'], focus: 'house' },
    { at: 'C’est une promesse', sky: 'night', motifs: ['house', 'rock', 'stars', 'crescent'], focus: 'crescent' },
  ],
  'salih-1-6': [{ at: '', sky: 'dawn', ground: 'plain', motifs: ['light', 'path', 'walkers', 'rock'], focus: 'walkers' }],
  'salih-1-7': [
    { at: '', sky: 'storm', ground: 'mountains', motifs: ['dark-clouds', 'wind', 'house', 'rock'], focus: 'wind' },
    { at: 'et ils restèrent étendus', motifs: ['ruins', 'rock', 'dark-clouds'], focus: 'ruins' },
  ],
  'salih-1-8': [
    { at: '', sky: 'night', ground: 'mountains', motifs: ['ruins', 'stars', 'light', 'bats'], focus: 'light' },
    { at: 'et Il répond', motifs: ['stars', 'bright-star', 'light', 'folk'], focus: 'bright-star' },
  ],

  // ── Épisode 3 : Les orgueilleux et les croyants ──
  'salih-2-0': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['house', 'rock', 'light', 'folk'], focus: 'house' },
    { at: 'et leur présenta la chamelle', ground: 'desert', motifs: ['camel', 'rock', 'light', 'folk'], focus: 'camel' },
  ],
  'salih-2-1': [{ at: '', sky: 'day', ground: 'mountains', motifs: ['palace', 'house', 'rock', 'palms', 'workers'], focus: 'palace' }],
  'salih-2-2': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['camel', 'palms', 'birds'], focus: 'camel' },
    { at: 'et de ne lui faire aucun mal', motifs: ['camel', 'palms', 'light', 'folk'], focus: 'light' },
  ],
  'salih-2-3': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['palace', 'wall', 'light', 'crowd'], focus: 'palace' },
    { at: 'aux plus faibles', motifs: ['palace', 'house', 'lamp', 'folk'], focus: 'lamp' },
  ],
  'salih-2-4': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['pillars', 'palace', 'wall', 'crowd'], focus: 'pillars' },
    { at: 'Nous, nous ne croyons pas', motifs: ['pillars', 'wall', 'folk'], focus: 'folk' },
  ],
  'salih-2-5': [
    { at: '', sky: 'night', ground: 'desert', motifs: ['pillars', 'footprints', 'dark-clouds', 'crowd'], focus: 'footprints' },
    { at: 'Ô Salih, fais-nous venir', motifs: ['pillars', 'dark-clouds', 'wind', 'crowd'], focus: 'dark-clouds' },
  ],
  'salih-2-6': [
    { at: '', sky: 'storm', ground: 'mountains', motifs: ['dark-clouds', 'wind', 'house'], focus: 'wind' },
    { at: 'et ils restèrent', motifs: ['ruins', 'dark-clouds'], focus: 'ruins' },
  ],
  'salih-2-7': [{ at: '', sky: 'dusk', ground: 'mountains', motifs: ['path', 'footprints', 'ruins'], focus: 'footprints' }],
  'salih-2-8': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['sun', 'palms', 'path', 'birds'], focus: 'sun' },
    { at: 'Ainsi s’achève', motifs: ['sun', 'palms', 'house', 'light', 'rock', 'butterflies'], focus: 'house' },
  ],

  // ═══════════ NÛH (épisodes 1 et 3) ═══════════
  // ── Épisode 1 : Un appel de nuit et de jour ──
  'nuh-0-0': [
    { at: '', sky: 'day', ground: 'valley', motifs: ['house', 'palms', 'light', 'folk'], focus: 'light' },
    { at: 'avertis ton peuple', sky: 'dusk', motifs: ['house', 'palms', 'dark-clouds', 'crowd'], focus: 'dark-clouds' },
  ],
  'nuh-0-1': [
    { at: '', sky: 'day', ground: 'city', motifs: ['house', 'wall', 'path', 'crowd'], focus: 'path' },
    { at: 'Adorez Allah', motifs: ['house', 'wall', 'light', 'folk'], focus: 'light' },
    { at: 'pour qu’Il vous pardonne', motifs: ['house', 'light', 'clouds', 'birds'], focus: 'birds' },
  ],
  'nuh-0-2': [{ at: '', sky: 'night', ground: 'city', motifs: ['moon', 'stars', 'house', 'path', 'bats'], focus: 'moon' }],
  'nuh-0-3': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'wall', 'footprints', 'walkers'], focus: 'walkers' },
    { at: 'Ils se mettaient', motifs: ['house', 'wall', 'shirt', 'crowd'], focus: 'shirt' },
    { at: 's’entêtaient et s’enflaient', motifs: ['wall', 'palace', 'tower', 'crowd'], focus: 'tower' },
  ],
  'nuh-0-4': [
    { at: '', sky: 'dawn', ground: 'city', motifs: ['wall', 'path', 'light', 'crowd'], focus: 'wall' },
    { at: 'puis en secret', ground: 'plain', motifs: ['path', 'light', 'tree', 'birds'], focus: 'light' },
  ],
  'nuh-0-5': [
    { at: '', sky: 'day', ground: 'plain', motifs: ['clouds', 'rain', 'tree', 'birds'], focus: 'rain' },
    { at: 'Il vous donnera', motifs: ['cradle', 'gold', 'tree', 'palms', 'folk'], focus: 'cradle' },
    { at: 'des jardins et des rivières', ground: 'river', motifs: ['palms', 'tree', 'wheat', 'butterflies'], focus: 'ground' },
  ],
  'nuh-0-6': [
    { at: '', sky: 'dusk', ground: 'river', motifs: ['clouds', 'stars', 'bright-star', 'palms', 'birds'], focus: 'sky' },
    { at: 'la lune qui éclaire', motifs: ['moon', 'sun', 'light', 'clouds'], focus: 'moon' },
    { at: 'et la terre étendue', ground: 'plain', motifs: ['path', 'palms', 'sun', 'walkers'], focus: 'path' },
  ],
  'nuh-0-7': [
    { at: '', sky: 'dusk', ground: 'plain', motifs: ['path', 'footprints', 'dark-clouds', 'walkers'], focus: 'footprints' },
    { at: 'Ils suivirent ceux', motifs: ['gold', 'cradle', 'path', 'dark-clouds'], focus: 'gold' },
    { at: 'et qui leur disaient', motifs: ['crowd', 'path', 'wind', 'dark-clouds'], focus: 'crowd' },
    { at: 'À cause de leurs fautes', sky: 'storm', ground: 'sea', motifs: ['flood', 'rain', 'dark-clouds', 'lightning'], focus: 'flood' },
  ],
  'nuh-0-8': [
    { at: '', sky: 'night', ground: 'sea', motifs: ['flood', 'stars', 'light'], focus: 'light' },
    { at: 'pour ses parents', ground: 'valley', motifs: ['house', 'stars', 'light', 'folk'], focus: 'house' },
  ],
  'nuh-0-9': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['light', 'tree', 'palms', 'birds', 'butterflies'], focus: 'light' },
    { at: 'Dans l’épisode', motifs: ['tree', 'planks', 'light', 'workers'], focus: 'planks' },
  ],

  // ── Épisode 3 : Mille ans moins cinquante ──
  'nuh-2-0': [
    { at: '', sky: 'dawn', ground: 'valley', motifs: ['house', 'palms', 'book', 'birds'], focus: 'book' },
    { at: 'la très longue mission', motifs: ['house', 'palms', 'path', 'footprints', 'folk'], focus: 'footprints' },
  ],
  'nuh-2-1': [{ at: '', sky: 'day', ground: 'city', motifs: ['sun', 'moon', 'house', 'path', 'crowd'], focus: 'sun' }],
  'nuh-2-2': [
    { at: '', sky: 'night', ground: 'city', motifs: ['moon', 'stars', 'house', 'bats'], focus: 'moon' },
    { at: 'Pendant tout ce temps', motifs: ['moon', 'house', 'path', 'footprints', 'folk'], focus: 'footprints' },
    { at: 'de nuit comme de jour', sky: 'dawn', motifs: ['sun', 'house', 'path', 'crowd'], focus: 'sun' },
  ],
  'nuh-2-3': [
    { at: '', sky: 'dusk', ground: 'city', motifs: ['house', 'dark-clouds', 'path', 'crowd'], focus: 'dark-clouds' },
    { at: 'et le déluge les emporta', sky: 'storm', ground: 'sea', motifs: ['house', 'flood', 'rain', 'dark-clouds'], focus: 'flood' },
  ],
  'nuh-2-4': [{ at: '', sky: 'dawn', ground: 'sea', motifs: ['ark', 'sun', 'flood', 'gulls'], focus: 'ark' }],
  'nuh-2-5': [
    { at: '', sky: 'day', ground: 'mountains', motifs: ['ark', 'rock', 'light', 'crowd'], focus: 'ark' },
    { at: 'un rappel de la patience', motifs: ['ark', 'rock', 'sun', 'birds'], focus: 'sun' },
    { at: 'et de la miséricorde', motifs: ['ark', 'rock', 'light', 'clouds', 'gulls'], focus: 'light' },
  ],
};
