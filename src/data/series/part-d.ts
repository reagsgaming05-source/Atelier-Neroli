import type { Series } from '../types';

/*
 * Récits de la Sunna en livres audio-visuels : un seul épisode par récit.
 *
 * - La narration reprend le texte français du hadith (`hadith.fr` dans
 *   src/data/sunnah-stories.ts), dans son ordre, sans rien y ajouter ; les
 *   passages délicats sont racontés avec pudeur et sobriété.
 * - Écrite pour être lue à voix haute : nombres en lettres, formule de
 *   salutation sur le Prophète en toutes lettres une fois par récit, ni
 *   parenthèses ni références.
 * - Les illustrations ne montrent jamais de personnes : seulement des lieux,
 *   des objets, des animaux et la lumière.
 */

export const SERIES_D: Series[] = [
  {
    storyId: 'grotte',
    episodes: [
      {
        title: 'Les trois hommes de la grotte',
        scenes: [
          {
            text: 'Abdallah ibn Omar rapporte que le Prophète, que la paix et les bénédictions d’Allah soient sur lui, a raconté cette histoire. Trois hommes partirent en voyage.',
            sky: 'day', ground: 'mountains', motifs: ['path', 'clouds'],
          },
          {
            text: 'La pluie les surprit, et ils se réfugièrent dans une grotte, au flanc d’une montagne. Alors une pierre tomba devant l’entrée, et les enferma complètement.',
            sky: 'storm', ground: 'mountains', motifs: ['cave-mouth', 'rain'],
          },
          {
            text: 'L’un d’eux dit aux autres : « Rappelez-vous une bonne action que vous avez faite pour Allah, et invoquez Allah, afin qu’Il nous délivre de ce malheur. »',
            sky: 'night', ground: 'cave', motifs: ['stones'],
          },
          {
            text: 'Le premier dit : « Ô Allah, j’avais des parents âgés, une femme et de jeunes enfants. Je gardais le troupeau, et le soir, je servais le lait d’abord à mes parents. »',
            sky: 'dusk', ground: 'plain', motifs: ['house', 'moon'],
          },
          {
            text: '« Un jour, parti loin chercher du fourrage, je suis rentré le soir et mes parents dormaient. Je suis resté debout près d’eux avec le lait, sans vouloir les réveiller, ni servir mes enfants avant eux. »',
            sky: 'night', ground: 'plain', motifs: ['house', 'lamp'],
          },
          {
            text: '« Mes enfants pleuraient à mes pieds, et je suis resté ainsi jusqu’au matin. Ô Allah, si Tu sais que j’ai fait cela pour Te plaire, délivre-nous. » La pierre bougea un peu, et ils purent voir le ciel.',
            sky: 'dawn', ground: 'cave', motifs: ['stones', 'light'],
          },
          {
            text: 'Le deuxième parla d’une cousine qu’il aimait plus que tout. Il était sur le point de commettre un péché avec elle, mais elle lui dit : « Serviteur d’Allah, crains Allah, et ne fais rien qui ne soit licite. » Alors il se leva et renonça.',
            sky: 'night', ground: 'cave', motifs: ['stones'],
          },
          {
            text: '« Ô Allah, si Tu sais que j’ai fait cela pour Te plaire, délivre-nous de ce malheur. » Et leur situation s’améliora encore un peu.',
            sky: 'night', ground: 'cave', motifs: ['stones', 'light'],
          },
          {
            text: 'Le troisième dit : « Ô Allah, j’ai employé un ouvrier pour une mesure de riz, mais il n’a pas voulu prendre son dû. Alors j’ai semé ce riz, et je suis devenu riche en vaches et en troupeaux. »',
            sky: 'day', ground: 'valley', motifs: ['sun', 'tree'],
          },
          {
            text: '« L’ouvrier est revenu et m’a dit : crains Allah, et ne sois pas injuste envers moi. Je lui ai dit : prends ces vaches et ces moutons. Il m’a dit : crains Allah, et ne te moque pas de moi. »',
            sky: 'day', ground: 'valley', motifs: ['cows', 'sheep'],
          },
          {
            text: '« Je lui ai dit : je ne me moque pas de toi, prends-les. Et il les a pris. Ô Allah, si Tu sais que j’ai fait cela pour Te plaire, délivre-nous. » Et Allah les délivra complètement.',
            sky: 'dawn', ground: 'mountains', motifs: ['cave-mouth', 'light'],
          },
          {
            text: 'Une bonne action faite sincèrement pour Allah est un trésor : dans l’épreuve, on peut L’invoquer en la mentionnant.',
            sky: 'dawn', ground: 'mountains', motifs: ['light', 'path'],
          },
        ],
      },
    ],
  },
  {
    storyId: 'lepreux-chauve-aveugle',
    episodes: [
      {
        title: 'Le lépreux, le chauve et l’aveugle',
        scenes: [
          {
            text: 'Abou Hourayra rapporte qu’il a entendu le Prophète, que la paix et les bénédictions d’Allah soient sur lui, raconter cette histoire. Allah voulut éprouver trois hommes des Bani Israël : un lépreux, un aveugle et un chauve.',
            sky: 'day', ground: 'plain', motifs: ['path', 'sun'],
          },
          {
            text: 'Il leur envoya un ange. Le lépreux demanda une belle couleur et une belle peau, car les gens le fuyaient. L’ange le toucha, et sa maladie disparut. Puis il demanda des chameaux, et reçut une chamelle pleine.',
            sky: 'day', ground: 'desert', motifs: ['camel', 'light'],
          },
          {
            text: 'L’ange alla voir le chauve, qui demanda de beaux cheveux et la guérison, car les gens le rejetaient. L’ange le toucha, et il guérit. Puis il demanda des vaches, et reçut une vache pleine.',
            sky: 'day', ground: 'plain', motifs: ['cows', 'tree'],
          },
          {
            text: 'L’ange alla voir l’aveugle, qui demanda qu’Allah lui rende la vue, pour voir les gens. L’ange toucha ses yeux, et Allah lui rendit la vue. Puis il demanda des moutons, et reçut une brebis pleine.',
            sky: 'dawn', ground: 'valley', motifs: ['sheep', 'light'],
          },
          {
            text: 'Les bêtes eurent beaucoup de petits, et chacun eut un troupeau qui remplissait une vallée : l’un de chameaux, l’autre de vaches, le troisième de moutons.',
            sky: 'day', ground: 'valley', motifs: ['camel', 'cows', 'sheep'],
          },
          {
            text: 'Puis l’ange revint voir le lépreux, sous l’apparence d’un lépreux : « Je suis un pauvre voyageur, j’ai tout perdu. Au nom de Celui qui t’a donné cette belle peau et ces richesses, donne-moi un chameau pour continuer ma route. »',
            sky: 'dusk', ground: 'valley', motifs: ['camel', 'path'],
          },
          {
            text: 'L’homme refusa, disant qu’il avait trop d’obligations. L’ange lui rappela qu’il était un lépreux pauvre, et qu’Allah lui avait tout donné. Il répondit qu’il avait hérité ces biens de ses ancêtres. « Si tu mens, dit l’ange, qu’Allah te rende comme avant. »',
            sky: 'dusk', ground: 'valley', motifs: ['camel', 'dark-clouds'],
          },
          {
            text: 'L’ange alla voir le chauve, sous l’apparence d’un chauve, et lui dit la même chose. Il répondit de la même façon, et l’ange lui dit : « Si tu mens, qu’Allah te rende comme avant. »',
            sky: 'dusk', ground: 'valley', motifs: ['cows', 'dark-clouds'],
          },
          {
            text: 'Enfin, sous l’apparence d’un aveugle, l’ange alla voir l’aveugle : « Je suis un pauvre voyageur, j’ai tout perdu. Au nom de Celui qui t’a rendu la vue, donne-moi une brebis pour finir mon voyage. »',
            sky: 'dusk', ground: 'valley', motifs: ['sheep', 'path'],
          },
          {
            text: 'L’homme répondit : « C’est vrai, j’étais aveugle et Allah m’a rendu la vue, j’étais pauvre et Il m’a enrichi. Prends ce que tu veux : par Allah, je ne t’empêcherai pas de prendre ce dont tu as besoin. »',
            sky: 'dawn', ground: 'valley', motifs: ['sheep', 'light'],
          },
          {
            text: 'L’ange lui dit : « Garde tes biens. Vous avez été mis à l’épreuve, tous les trois. Allah est satisfait de toi, et en colère contre tes deux compagnons. »',
            sky: 'day', ground: 'valley', motifs: ['sheep', 'sun'],
          },
          {
            text: 'La santé et la richesse sont une épreuve : reconnais qu’elles viennent d’Allah, et donne à celui qui te demande en Son nom.',
            sky: 'dawn', ground: 'valley', motifs: ['light', 'palms'],
          },
        ],
      },
    ],
  },
  {
    storyId: 'garcon-et-roi',
    episodes: [
      {
        title: 'Le garçon, le roi et le magicien',
        scenes: [
          {
            text: 'Souhayb rapporte que le Prophète, que la paix et les bénédictions d’Allah soient sur lui, a raconté l’histoire d’un roi d’autrefois, qui avait un magicien. Devenu vieux, le magicien demanda au roi un garçon, pour lui enseigner la magie.',
            sky: 'day', ground: 'city', motifs: ['palace'],
          },
          {
            text: 'Sur son chemin, le garçon rencontra un moine, et ses paroles le touchèrent. Il s’arrêtait chez lui, arrivait en retard, et le magicien le frappait. Le moine lui conseilla de dire à chacun que l’autre l’avait retenu.',
            sky: 'dawn', ground: 'plain', motifs: ['path', 'house'],
          },
          {
            text: 'Un jour, une grosse bête bloquait le passage. Le garçon prit une pierre : « Ô Allah, si l’affaire du moine Te plaît plus que celle du magicien, fais mourir cette bête. » Il la lança, la bête mourut, et les gens passèrent.',
            sky: 'day', ground: 'plain', motifs: ['stones', 'path'],
          },
          {
            text: 'Le moine lui dit : « Mon garçon, aujourd’hui tu es supérieur à moi. Tu vas être éprouvé : ne révèle pas qui je suis. » Et le garçon se mit à guérir les aveugles, les lépreux et bien des malades.',
            sky: 'day', ground: 'plain', motifs: ['house', 'light'],
          },
          {
            text: 'Un proche du roi, devenu aveugle, vint avec des cadeaux. Le garçon lui dit : « Je ne guéris personne, c’est Allah qui guérit. Si tu crois en Allah, je L’invoquerai pour toi. » Il crut, et Allah le guérit.',
            sky: 'day', ground: 'city', motifs: ['gold', 'light'],
          },
          {
            text: 'Le roi lui demanda qui lui avait rendu la vue. « Mon Seigneur et le tien, c’est Allah », répondit-il. Alors le roi le fit maltraiter, jusqu’à ce qu’il parle du garçon.',
            sky: 'day', ground: 'city', motifs: ['palace', 'throne'],
          },
          {
            text: 'Le garçon, maltraité à son tour, finit par parler du moine. Sommés de renier leur foi, le moine et le proche du roi refusèrent, et furent mis à mort. Le garçon refusa lui aussi.',
            sky: 'night', ground: 'city', motifs: ['prison'],
          },
          {
            text: 'Le roi le fit emmener au sommet d’une montagne. Le garçon pria : « Ô Allah, sauve-moi d’eux comme Tu veux. » La montagne trembla, les hommes du roi tombèrent, et il revint à pied chez le roi.',
            sky: 'storm', ground: 'mountains', motifs: ['stones', 'dark-clouds'],
          },
          {
            text: 'Le roi l’envoya alors en mer, sur un bateau. Le garçon pria : « Ô Allah, sauve-moi d’eux. » Le bateau chavira, les hommes du roi se noyèrent, et le garçon revint à pied chez le roi.',
            sky: 'storm', ground: 'sea', motifs: ['boat', 'wind'],
          },
          {
            text: 'Le garçon dit au roi qu’il ne pourrait le tuer qu’en rassemblant les gens, et en tirant une flèche en disant : « Au nom d’Allah, le Seigneur de ce garçon. » Le roi fit ainsi, et le garçon mourut. Les gens dirent : « Nous croyons au Seigneur de ce garçon ! »',
            sky: 'day', ground: 'city', motifs: ['palace', 'light'],
          },
          {
            text: 'Le roi fit creuser des fossés et y allumer un feu, menaçant quiconque ne renoncerait pas à cette foi. Les croyants restèrent fermes, et quand une femme hésita, son enfant lui dit : « Ô maman, sois patiente, car c’est la vérité. »',
            sky: 'night', ground: 'plain', motifs: ['fire', 'stars'],
          },
          {
            text: 'C’est Allah seul qui guérit et qui protège. La fermeté d’un seul croyant sincère peut guider tout un peuple vers Lui.',
            sky: 'dawn', ground: 'mountains', motifs: ['light', 'sun'],
          },
        ],
      },
    ],
  },
  {
    storyId: 'jurayj',
    episodes: [
      {
        title: 'Jourayj, le dévot',
        scenes: [
          {
            text: 'Abou Hourayra rapporte que le Prophète, que la paix et les bénédictions d’Allah soient sur lui, a dit que trois enfants ont parlé au berceau : le Messie, fils de Maryam, l’enfant de l’histoire de Jourayj, et un autre.',
            sky: 'night', ground: 'mountains', motifs: ['stars', 'tower'],
          },
          {
            text: 'Jourayj s’était fait construire un ermitage, et s’y était retiré. Un jour, sa mère vint l’appeler pendant qu’il priait. Il se dit : « Seigneur, ma mère m’appelle, et je suis en prière. » Et il continua de prier.',
            sky: 'day', ground: 'mountains', motifs: ['tower', 'path'],
          },
          {
            text: 'Elle revint le lendemain, puis le jour suivant, et chaque fois il continua sa prière. Alors elle invoqua : « Seigneur, ne le fais pas mourir avant qu’il ait vu le sort des femmes de mauvaise vie. »',
            sky: 'dusk', ground: 'mountains', motifs: ['tower', 'dark-clouds'],
          },
          {
            text: 'La dévotion de Jourayj était connue des Bani Israël. Une femme de mauvaise vie proposa de le séduire, mais il ne lui prêta aucune attention. Elle alla alors vers un berger, près de l’ermitage, et eut un enfant de lui, qu’elle attribua à Jourayj.',
            sky: 'dusk', ground: 'valley', motifs: ['sheep', 'tower'],
          },
          {
            text: 'Les gens vinrent, le firent descendre, détruisirent son ermitage et le frappèrent. Il demanda ce qui se passait. On l’accusa d’être le père de l’enfant de cette femme.',
            sky: 'storm', ground: 'mountains', motifs: ['ruins', 'stones'],
          },
          {
            text: '« Où est l’enfant ? » demanda-t-il. On le lui amena. « Laissez-moi prier », dit-il. Après sa prière, il demanda au nouveau-né : « Petit, qui est ton père ? » L’enfant répondit : « C’est le berger. »',
            sky: 'day', ground: 'mountains', motifs: ['ruins', 'light'],
          },
          {
            text: 'Alors les gens l’embrassèrent, cherchèrent sa bénédiction, et proposèrent de reconstruire son ermitage en or. « Non, dit-il, reconstruisez-le en terre, comme avant. » Et ils le firent.',
            sky: 'dawn', ground: 'mountains', motifs: ['tower', 'light'],
          },
          {
            text: 'Il y avait aussi un bébé qui tétait sa mère. Un homme bien vêtu passa à cheval, et la mère dit : « Ô Allah, fais que mon enfant soit comme lui. »',
            sky: 'day', ground: 'plain', motifs: ['path', 'sun'],
          },
          {
            text: 'Le bébé cessa de téter, regarda l’homme et dit : « Ô Allah, ne me fais pas comme lui. » Abou Hourayra croyait encore voir le Prophète mimer la scène, le doigt à la bouche.',
            sky: 'day', ground: 'plain', motifs: ['path', 'palm'],
          },
          {
            text: 'Puis passa une jeune fille, maltraitée par des gens qui l’accusaient d’un grand péché et de vol. Elle disait : « Allah me suffit, Il est mon meilleur protecteur. » La mère dit : « Ô Allah, ne fais pas que mon enfant soit comme elle. »',
            sky: 'dusk', ground: 'city', motifs: ['house', 'path'],
          },
          {
            text: 'Le bébé dit : « Ô Allah, fais que je sois comme elle. » Sa mère l’interrogea, et il expliqua : « Cet homme était un tyran. Quant à cette fille, on l’accusait à tort. »',
            sky: 'dusk', ground: 'city', motifs: ['house', 'lamp'],
          },
          {
            text: 'Allah défend Ses serviteurs pieux. Et l’on ne juge pas sur les apparences : le cavalier bien vêtu était un tyran, et la jeune fille accusée était innocente.',
            sky: 'dawn', ground: 'mountains', motifs: ['tower', 'light'],
          },
        ],
      },
    ],
  },
  {
    storyId: 'repentir-du-meurtrier',
    episodes: [
      {
        title: 'L’homme qui avait tué quatre-vingt-dix-neuf personnes',
        scenes: [
          {
            text: 'Abou Saïd al-Khoudri rapporte que le Prophète, que la paix et les bénédictions d’Allah soient sur lui, a raconté cette histoire. Parmi les Bani Israël, il y avait un homme qui avait tué quatre-vingt-dix-neuf personnes.',
            sky: 'night', ground: 'plain', motifs: ['dark-clouds'],
          },
          {
            text: 'Il partit demander si son repentir pouvait être accepté. Il rencontra un moine, et lui posa la question.',
            sky: 'dusk', ground: 'plain', motifs: ['path', 'tower'],
          },
          {
            text: 'Le moine répondit que non. Alors l’homme le tua, lui aussi.',
            sky: 'night', ground: 'plain', motifs: ['tower', 'dark-clouds'],
          },
          {
            text: 'Mais il continua à demander, jusqu’à ce qu’un homme lui conseille d’aller dans un certain village.',
            sky: 'dawn', ground: 'plain', motifs: ['path', 'house'],
          },
          {
            text: 'Il se mit en route, mais la mort le surprit en chemin. En mourant, il tourna sa poitrine vers le village où il se rendait.',
            sky: 'dusk', ground: 'plain', motifs: ['path', 'footprints'],
          },
          {
            text: 'Alors les anges de la miséricorde et les anges du châtiment se disputèrent à son sujet.',
            sky: 'night', ground: 'plain', motifs: ['stars', 'light'],
          },
          {
            text: 'Allah ordonna au village vers lequel il allait de se rapprocher, et au village d’où il venait de s’éloigner.',
            sky: 'dawn', ground: 'plain', motifs: ['house', 'path'],
          },
          {
            text: 'Puis Il ordonna de mesurer la distance entre lui et les deux villages. On le trouva plus proche, d’un empan, du village où il se rendait. Ainsi, il fut pardonné.',
            sky: 'dawn', ground: 'plain', motifs: ['footprints', 'light'],
          },
          {
            text: 'Ne désespère jamais du pardon d’Allah : la porte du repentir reste ouverte à celui qui revient sincèrement vers Lui.',
            sky: 'day', ground: 'plain', motifs: ['light', 'sun'],
          },
        ],
      },
    ],
  },
  {
    storyId: 'chien-assoiffe',
    episodes: [
      {
        title: 'L’homme qui donna à boire à un chien',
        scenes: [
          {
            text: 'Abou Hourayra rapporte que le Prophète, que la paix et les bénédictions d’Allah soient sur lui, a raconté cette histoire. Un homme marchait, et il eut soif.',
            sky: 'day', ground: 'desert', motifs: ['path', 'sun'],
          },
          {
            text: 'Il descendit dans un puits, et but de l’eau.',
            sky: 'day', ground: 'desert', motifs: ['well'],
          },
          {
            text: 'En remontant, il vit un chien qui haletait et mangeait de la terre, tant il avait soif. L’homme se dit : « Ce chien souffre de la soif, comme moi. »',
            sky: 'day', ground: 'desert', motifs: ['well', 'path'],
          },
          {
            text: 'Il redescendit dans le puits, et remplit sa chaussure d’eau. Il la tint avec ses dents, remonta, et donna à boire au chien.',
            sky: 'day', ground: 'desert', motifs: ['well', 'sun'],
          },
          {
            text: 'Allah le remercia pour cette bonne action, et lui pardonna.',
            sky: 'dusk', ground: 'desert', motifs: ['well', 'light'],
          },
          {
            text: 'Les gens demandèrent : « Ô Messager d’Allah, y a-t-il une récompense pour nous, si nous aidons les animaux ? »',
            sky: 'dusk', ground: 'city', motifs: ['house', 'palm'],
          },
          {
            text: 'Il répondit : « Oui, il y a une récompense pour toute créature vivante. »',
            sky: 'night', ground: 'desert', motifs: ['well', 'stars'],
          },
          {
            text: 'Ne méprise aucune bonne action : un peu d’eau donnée à un animal assoiffé valut à cet homme le pardon d’Allah.',
            sky: 'dawn', ground: 'garden', motifs: ['spring', 'birds'],
          },
        ],
      },
    ],
  },
  {
    storyId: 'pecheresse-et-chien',
    episodes: [
      {
        title: 'La pécheresse et le chien',
        scenes: [
          {
            text: 'Abou Hourayra rapporte que le Prophète, que la paix et les bénédictions d’Allah soient sur lui, a raconté cette histoire.',
            sky: 'dawn', ground: 'desert', motifs: ['path'],
          },
          {
            text: 'Il parla d’une femme de mauvaise vie à qui Allah pardonna, à cause d’un chien.',
            sky: 'day', ground: 'desert', motifs: ['path', 'sun'],
          },
          {
            text: 'Elle passait près d’un puits, où se trouvait un chien qui haletait.',
            sky: 'day', ground: 'desert', motifs: ['well', 'path'],
          },
          {
            text: 'Elle vit qu’il allait mourir de soif.',
            sky: 'day', ground: 'desert', motifs: ['well', 'sun'],
          },
          {
            text: 'Alors elle enleva sa chaussure, l’attacha à son voile, et puisa de l’eau pour lui.',
            sky: 'day', ground: 'desert', motifs: ['well'],
          },
          {
            text: 'Et pour cela, Allah lui pardonna.',
            sky: 'dusk', ground: 'desert', motifs: ['well', 'light'],
          },
          {
            text: 'Nul ne doit désespérer de la miséricorde d’Allah : une bonne action sincère, même petite, peut valoir Son pardon.',
            sky: 'dawn', ground: 'garden', motifs: ['light', 'spring'],
          },
        ],
      },
    ],
  },
  {
    storyId: 'femme-et-chat',
    episodes: [
      {
        title: 'La femme et le chat',
        scenes: [
          {
            text: 'Abdallah ibn Omar rapporte que le Prophète, que la paix et les bénédictions d’Allah soient sur lui, a parlé d’une femme et d’un chat.',
            sky: 'dusk', ground: 'city', motifs: ['house'],
          },
          {
            text: 'Une femme fut punie à cause d’un chat. Elle l’avait enfermé, jusqu’à ce qu’il meure.',
            sky: 'night', ground: 'city', motifs: ['house', 'moon'],
          },
          {
            text: 'À cause de cela, elle entra en Enfer.',
            sky: 'storm', ground: 'city', motifs: ['dark-clouds'],
          },
          {
            text: 'Car pendant qu’elle l’enfermait, elle ne lui donna ni à manger, ni à boire.',
            sky: 'night', ground: 'city', motifs: ['house', 'lamp'],
          },
          {
            text: 'Et elle ne le laissa pas libre non plus, pour qu’il puisse manger les insectes de la terre.',
            sky: 'day', ground: 'garden', motifs: ['ants', 'tree'],
          },
          {
            text: 'La cruauté envers les animaux est un grave péché. Qui garde un animal doit le nourrir et l’abreuver, ou le laisser libre de chercher sa nourriture.',
            sky: 'dawn', ground: 'garden', motifs: ['light', 'birds'],
          },
        ],
      },
    ],
  },
  {
    storyId: 'mille-dinars',
    episodes: [
      {
        title: 'L’homme qui emprunta mille dinars',
        scenes: [
          {
            text: 'Abou Hourayra rapporte que le Prophète, que la paix et les bénédictions d’Allah soient sur lui, a raconté cette histoire. Un homme des Bani Israël demanda à un autre de lui prêter mille dinars.',
            sky: 'day', ground: 'city', motifs: ['house', 'coins'],
          },
          {
            text: 'Le prêteur demanda des témoins. « Allah suffit comme témoin », répondit l’autre. Il demanda un garant. « Allah suffit comme garant. »',
            sky: 'day', ground: 'city', motifs: ['coins', 'scroll'],
          },
          {
            text: '« Tu as raison », dit le prêteur, et il lui prêta l’argent pour une durée fixée. L’emprunteur partit alors de l’autre côté de la mer.',
            sky: 'day', ground: 'sea', motifs: ['boat', 'coins'],
          },
          {
            text: 'Son travail terminé, il chercha un bateau pour rentrer à temps et rembourser sa dette, mais il n’en trouva aucun.',
            sky: 'day', ground: 'sea', motifs: ['clouds', 'path'],
          },
          {
            text: 'Alors il prit un morceau de bois, y creusa un trou, y mit les mille dinars avec une lettre pour le prêteur, puis il referma soigneusement le trou.',
            sky: 'dusk', ground: 'sea', motifs: ['coins', 'scroll'],
          },
          {
            text: 'Au bord de la mer, il dit : « Ô Allah, Tu sais que j’ai emprunté mille dinars. Il m’a demandé un garant et un témoin, je lui ai dit que Tu suffisais, et il T’a accepté. »',
            sky: 'dusk', ground: 'sea', motifs: ['light'],
          },
          {
            text: '« J’ai vraiment tout fait pour lui rendre son argent, sans rien trouver. Alors je Te le confie. » Il jeta le bois dans la mer, jusqu’à ce qu’il disparaisse, puis repartit chercher un bateau.',
            sky: 'dusk', ground: 'sea', motifs: ['wind', 'moon'],
          },
          {
            text: 'Un jour, le prêteur sortit voir si un bateau arrivait avec son argent. Soudain, il vit le morceau de bois. Il l’emporta chez lui, pour en faire du bois de chauffage.',
            sky: 'dawn', ground: 'sea', motifs: ['sun', 'clouds'],
          },
          {
            text: 'Lorsqu’il le coupa, il trouva à l’intérieur l’argent et la lettre.',
            sky: 'day', ground: 'city', motifs: ['house', 'coins', 'scroll'],
          },
          {
            text: 'Peu après, l’emprunteur arriva avec mille dinars : « Par Allah, j’ai tout fait pour trouver un bateau, mais je n’en ai trouvé aucun avant celui qui m’a amené. »',
            sky: 'day', ground: 'sea', motifs: ['boat', 'coins'],
          },
          {
            text: '« M’as-tu envoyé quelque chose ? » demanda le prêteur. Puis il lui dit : « Allah m’a fait parvenir l’argent que tu avais mis dans le morceau de bois. Garde tes mille dinars, et va, bien guidé. »',
            sky: 'day', ground: 'city', motifs: ['house', 'light'],
          },
          {
            text: 'Honore tes dettes, fais tout ce qui est en ton pouvoir, puis remets-t’en à Allah : Il suffit comme témoin et comme garant.',
            sky: 'dawn', ground: 'sea', motifs: ['light', 'boat'],
          },
        ],
      },
    ],
  },
  {
    storyId: 'or-du-terrain',
    episodes: [
      {
        title: 'L’or trouvé dans le terrain',
        scenes: [
          {
            text: 'Abou Hourayra rapporte que le Prophète, que la paix et les bénédictions d’Allah soient sur lui, a raconté cette histoire. Un homme acheta un terrain à un autre homme.',
            sky: 'day', ground: 'plain', motifs: ['path', 'house'],
          },
          {
            text: 'Dans ce terrain, l’acheteur trouva un pot en terre, rempli d’or.',
            sky: 'day', ground: 'plain', motifs: ['gold'],
          },
          {
            text: 'Il dit au vendeur : « Prends ton or. Je ne t’ai acheté que le terrain, pas l’or qui s’y trouvait. »',
            sky: 'day', ground: 'city', motifs: ['gold', 'house'],
          },
          {
            text: 'L’ancien propriétaire répondit : « Je t’ai vendu le terrain, avec tout ce qu’il contient. »',
            sky: 'day', ground: 'city', motifs: ['house', 'scroll'],
          },
          {
            text: 'Ils présentèrent alors leur affaire à un homme, qui leur demanda : « Avez-vous des enfants ? »',
            sky: 'dusk', ground: 'city', motifs: ['house', 'lamp'],
          },
          {
            text: 'L’un dit : « J’ai un garçon. » L’autre dit : « J’ai une fille. »',
            sky: 'dusk', ground: 'city', motifs: ['house', 'moon'],
          },
          {
            text: 'L’homme dit : « Mariez la fille au garçon, dépensez cet or pour eux deux, et donnez le reste en aumône. »',
            sky: 'day', ground: 'garden', motifs: ['gold', 'palms'],
          },
          {
            text: 'Chacun préféra laisser l’or à l’autre plutôt que de garder un bien qui ne lui revenait peut-être pas : voilà l’honnêteté d’un cœur scrupuleux.',
            sky: 'dawn', ground: 'garden', motifs: ['light', 'tree'],
          },
        ],
      },
    ],
  },
  {
    storyId: 'branche-epineuse',
    episodes: [
      {
        title: 'L’homme qui retira une branche épineuse',
        scenes: [
          {
            text: 'Abou Hourayra rapporte que le Prophète, que la paix et les bénédictions d’Allah soient sur lui, a raconté cette histoire.',
            sky: 'dawn', ground: 'plain', motifs: ['path'],
          },
          {
            text: 'Un homme marchait sur la route.',
            sky: 'day', ground: 'plain', motifs: ['path', 'sun'],
          },
          {
            text: 'Il trouva, sur le chemin, une branche d’arbre pleine d’épines.',
            sky: 'day', ground: 'plain', motifs: ['path', 'withered'],
          },
          {
            text: 'Alors il l’enleva du chemin.',
            sky: 'day', ground: 'plain', motifs: ['path', 'tree'],
          },
          {
            text: 'Allah le remercia pour ce geste, et lui pardonna.',
            sky: 'dusk', ground: 'plain', motifs: ['path', 'light'],
          },
          {
            text: 'Écarter ce qui peut blesser les passants est une bonne action. Ne méprise jamais un geste simple : il peut valoir le pardon d’Allah.',
            sky: 'dawn', ground: 'garden', motifs: ['path', 'light'],
          },
        ],
      },
    ],
  },
  {
    storyId: 'passagers-du-bateau',
    episodes: [
      {
        title: 'Les passagers du bateau',
        scenes: [
          {
            text: 'An-Nou’mane ibn Bachir rapporte que le Prophète, que la paix et les bénédictions d’Allah soient sur lui, a donné cet exemple.',
            sky: 'dawn', ground: 'sea', motifs: ['boat'],
          },
          {
            text: 'Celui qui respecte les ordres et les interdits d’Allah, face à ceux qui les transgressent, ressemble à des gens qui ont tiré au sort leurs places dans un bateau.',
            sky: 'day', ground: 'sea', motifs: ['boat', 'clouds'],
          },
          {
            text: 'Certains eurent leur place en haut, d’autres en bas.',
            sky: 'day', ground: 'sea', motifs: ['boat', 'sun'],
          },
          {
            text: 'Quand ceux du bas avaient besoin d’eau, ils devaient monter, et cela dérangeait ceux du haut.',
            sky: 'day', ground: 'sea', motifs: ['boat', 'birds'],
          },
          {
            text: 'Ils dirent alors : « Faisons un trou dans notre partie du bateau, pour prendre de l’eau sans déranger ceux du dessus. »',
            sky: 'dusk', ground: 'sea', motifs: ['boat', 'wind'],
          },
          {
            text: 'Si ceux du haut les laissaient faire, tout le monde serait perdu.',
            sky: 'storm', ground: 'sea', motifs: ['boat', 'dark-clouds'],
          },
          {
            text: 'Mais s’ils les en empêchent, tout le monde sera sauvé.',
            sky: 'dawn', ground: 'sea', motifs: ['boat', 'light'],
          },
          {
            text: 'Celui qui respecte les limites d’Allah ne laisse pas faire ceux qui les transgressent : empêcher le mal protège toute la communauté.',
            sky: 'day', ground: 'sea', motifs: ['boat', 'sun'],
          },
        ],
      },
    ],
  },
  {
    storyId: 'cendres-dispersees',
    episodes: [
      {
        title: 'L’homme qui ordonna de brûler son corps',
        scenes: [
          {
            text: 'Abou Hourayra rapporte que le Prophète, que la paix et les bénédictions d’Allah soient sur lui, a raconté cette histoire. Un homme commettait de mauvaises actions.',
            sky: 'dusk', ground: 'plain', motifs: ['house'],
          },
          {
            text: 'Quand la mort approcha, il dit à ses fils : « Après ma mort, brûlez mon corps, réduisez-le en poudre, et dispersez la cendre dans l’air. »',
            sky: 'night', ground: 'plain', motifs: ['house', 'lamp'],
          },
          {
            text: '« Car par Allah, si Allah a pouvoir sur moi, Il me punira comme Il n’a jamais puni personne. »',
            sky: 'night', ground: 'plain', motifs: ['dark-clouds'],
          },
          {
            text: 'Quand il mourut, ses fils firent ce qu’il avait demandé.',
            sky: 'dusk', ground: 'plain', motifs: ['wind', 'clouds'],
          },
          {
            text: 'Allah ordonna à la terre : « Rassemble ce que tu détiens de lui. » Elle le fit, et voilà que l’homme se tenait debout.',
            sky: 'dawn', ground: 'plain', motifs: ['light', 'wind'],
          },
          {
            text: 'Allah lui demanda : « Qu’est-ce qui t’a poussé à agir ainsi ? » Il répondit : « Ô mon Seigneur, j’avais peur de Toi. »',
            sky: 'dawn', ground: 'none', motifs: ['light'],
          },
          {
            text: 'Alors Allah lui pardonna.',
            sky: 'day', ground: 'none', motifs: ['light', 'sun'],
          },
          {
            text: 'La crainte sincère d’Allah a une grande valeur, et rien ne Lui échappe. Ne désespère jamais de Son pardon.',
            sky: 'dawn', ground: 'garden', motifs: ['light', 'spring'],
          },
        ],
      },
    ],
  },
  {
    storyId: 'joie-du-repentir',
    episodes: [
      {
        title: 'Le voyageur et sa monture perdue',
        scenes: [
          {
            text: 'Anas rapporte que le Prophète, que la paix et les bénédictions d’Allah soient sur lui, a donné cet exemple, au sujet du repentir.',
            sky: 'dawn', ground: 'desert', motifs: ['light'],
          },
          {
            text: 'Allah est plus heureux du repentir de Son serviteur, quand il revient vers Lui, que l’un de vous ne le serait dans cette situation.',
            sky: 'dawn', ground: 'desert', motifs: ['light', 'crescent'],
          },
          {
            text: 'Un homme est sur son chameau, dans un désert sans eau. Sa nourriture et sa boisson sont sur le chameau.',
            sky: 'day', ground: 'desert', motifs: ['camel', 'sun'],
          },
          {
            text: 'Puis il perd son chameau.',
            sky: 'day', ground: 'desert', motifs: ['footprints', 'sun'],
          },
          {
            text: 'Ayant perdu tout espoir, il s’allonge à l’ombre, désespéré de le retrouver.',
            sky: 'dusk', ground: 'desert', motifs: ['palm'],
          },
          {
            text: 'Et soudain, il le retrouve, là, devant lui ! Il saisit sa longe.',
            sky: 'day', ground: 'desert', motifs: ['camel', 'palm'],
          },
          {
            text: 'Dans sa joie immense, il dit : « Ô Seigneur, Tu es mon serviteur, et je suis Ton Seigneur. » Il se trompe ainsi, tant sa joie est grande.',
            sky: 'day', ground: 'desert', motifs: ['camel', 'light'],
          },
          {
            text: 'La joie d’Allah devant le repentir de Son serviteur est plus grande encore. Ne tarde pas à revenir vers Lui.',
            sky: 'dawn', ground: 'desert', motifs: ['light', 'sun'],
          },
        ],
      },
    ],
  },
  {
    storyId: 'dernier-au-paradis',
    episodes: [
      {
        title: 'Le dernier homme à entrer au Paradis',
        scenes: [
          {
            text: 'Abdallah ibn Mas’oud rapporte que le Prophète, que la paix et les bénédictions d’Allah soient sur lui, a dit : « Je connais celui qui sera le dernier à sortir du Feu, et le dernier à entrer au Paradis. »',
            sky: 'night', ground: 'none', motifs: ['stars'],
          },
          {
            text: 'Ce sera un homme qui sortira du Feu en rampant. Allah lui dira : « Va, et entre au Paradis. »',
            sky: 'dusk', ground: 'plain', motifs: ['path', 'light'],
          },
          {
            text: 'Il s’y rendra, mais il lui semblera qu’il est déjà plein. Il reviendra et dira : « Seigneur, je l’ai trouvé plein. »',
            sky: 'day', ground: 'garden', motifs: ['palms', 'spring'],
          },
          {
            text: 'Allah lui dira : « Va, et entre au Paradis : tu auras l’équivalent du monde, et dix fois plus. »',
            sky: 'day', ground: 'garden', motifs: ['palace', 'palms'],
          },
          {
            text: 'L’homme dira : « Te moques-tu de moi, alors que Tu es le Roi ? »',
            sky: 'day', ground: 'garden', motifs: ['palace', 'light'],
          },
          {
            text: 'Abdallah raconte qu’en rapportant cela, le Prophète sourit, au point que l’on voyait ses dents de devant.',
            sky: 'day', ground: 'garden', motifs: ['light', 'sun'],
          },
          {
            text: 'On dit que cet homme aura le rang le plus bas parmi les gens du Paradis.',
            sky: 'day', ground: 'garden', motifs: ['palms', 'spring', 'palace'],
          },
          {
            text: 'Si le rang le plus bas du Paradis vaut dix fois le monde, quelle immense générosité ! Ne désespère jamais de la miséricorde d’Allah.',
            sky: 'dawn', ground: 'garden', motifs: ['light', 'tree'],
          },
        ],
      },
    ],
  },
  {
    storyId: 'moussa-et-khidr',
    episodes: [
      {
        title: 'Moussa et al-Khidr',
        scenes: [
          {
            text: 'Ibn Abbas rapporte, d’après Oubayy ibn Ka’b, que le Prophète, que la paix et les bénédictions d’Allah soient sur lui, a raconté cette histoire du prophète Moussa, que la paix soit sur lui.',
            sky: 'dawn', ground: 'sea', motifs: ['light', 'book'],
          },
          {
            text: 'Un jour, Moussa parlait aux Bani Israël. On lui demanda : « Qui est le plus savant des hommes ? » Il répondit : « C’est moi. » Allah le lui reprocha, car il n’avait pas attribué la science à Allah.',
            sky: 'day', ground: 'city', motifs: ['pillars', 'scroll'],
          },
          {
            text: 'Allah lui inspira : « Au croisement des deux mers, un de Mes serviteurs est plus savant que toi. Prends un poisson dans un panier : tu le trouveras là où tu perdras le poisson. »',
            sky: 'night', ground: 'sea', motifs: ['stars', 'light'],
          },
          {
            text: 'Moussa partit avec son jeune serviteur, Youcha’ ibn Noun. Près d’un rocher, ils s’endormirent, et le poisson sortit du panier pour filer dans la mer, comme dans un tunnel.',
            sky: 'dusk', ground: 'sea', motifs: ['stones', 'moon'],
          },
          {
            text: 'Ils marchèrent jusqu’au lendemain. Moussa demanda le repas, et le serviteur dit : « J’ai oublié le poisson près du rocher. » « C’est ce que nous cherchions ! » dit Moussa, et ils revinrent sur leurs pas.',
            sky: 'dawn', ground: 'sea', motifs: ['footprints', 'stones'],
          },
          {
            text: 'Près du rocher, ils trouvèrent un homme couvert d’un vêtement : c’était al-Khidr. Moussa le salua, et lui demanda : « Puis-je te suivre, pour que tu m’enseignes de la science qu’Allah t’a donnée ? »',
            sky: 'day', ground: 'sea', motifs: ['stones', 'light'],
          },
          {
            text: '« Tu ne pourras pas être patient avec moi, répondit al-Khidr. J’ai une science qu’Allah m’a apprise et que tu ignores, et tu as une science que j’ignore. » « Si Allah le veut, tu me trouveras patient », dit Moussa.',
            sky: 'day', ground: 'sea', motifs: ['path', 'sun'],
          },
          {
            text: 'Un bateau les prit à bord sans les faire payer. Un moineau trempa son bec dans la mer, et al-Khidr dit : « Notre science n’enlève à celle d’Allah que ce que ce moineau a pris de la mer. »',
            sky: 'day', ground: 'sea', motifs: ['boat', 'birds'],
          },
          {
            text: 'Puis al-Khidr arracha une planche du bateau. « Ils nous ont pris gratuitement, et tu abîmes leur bateau ! » dit Moussa. « Ne t’ai-je pas dit que tu ne pourrais pas être patient ? » Moussa s’excusa : il avait oublié.',
            sky: 'day', ground: 'sea', motifs: ['boat', 'clouds'],
          },
          {
            text: 'Plus loin, al-Khidr ôta la vie à un garçon qui jouait avec d’autres enfants. « As-tu tué une âme innocente ? » dit Moussa. Et al-Khidr lui rappela qu’il ne pourrait pas être patient.',
            sky: 'dusk', ground: 'plain', motifs: ['path', 'dark-clouds'],
          },
          {
            text: 'Dans une ville, les habitants refusèrent de les accueillir. Al-Khidr répara un mur prêt à s’effondrer. « Tu aurais pu demander un salaire », dit Moussa. « C’est ici que nos chemins se séparent », répondit al-Khidr.',
            sky: 'dusk', ground: 'city', motifs: ['wall', 'ruins'],
          },
          {
            text: 'Le Prophète a dit : « Qu’Allah fasse miséricorde à Moussa ! S’il avait été plus patient, nous en aurions appris plus sur leur histoire. » Pour apprendre, il faut de l’humilité et de la patience.',
            sky: 'dawn', ground: 'sea', motifs: ['light', 'birds'],
          },
        ],
      },
    ],
  },
];
