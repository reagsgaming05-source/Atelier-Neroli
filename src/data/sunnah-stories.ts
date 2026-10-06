import type { SunnahStory } from './types';

/*
 * Récits de la Sunna : histoires racontées par le Prophète ﷺ, rapportées par
 * Al-Bukhārī ou Muslim.
 *
 * - `hadith.fr` est copié tel quel, par script, depuis la traduction française du
 *   projet hadith-api (github.com/fawazahmed0/hadith-api, éditions fra-bukhari et
 *   fra-muslim) : ne pas le retoucher à la main.
 * - Numérotation : Al-Bukhārī selon la numérotation usuelle (USC-MSA) ;
 *   Muslim selon Fu'ad 'Abd al-Bāqī, avec l'indice de la narration (« 2550.02 »).
 * - Introductions, leçons et quiz ne s'appuient que sur le texte du hadith cité.
 *
 * Vérification automatique : tests/sunnah-stories.test.ts.
 */

export const SUNNAH_STORIES: SunnahStory[] = [
  {
    id: 'grotte',
    title: 'Les trois hommes de la grotte',
    intro:
      '‘Abd Allāh ibn ‘Umar rapporte ce récit du Prophète ﷺ : trois voyageurs des nations précédentes se réfugient dans une grotte dont l’entrée se retrouve bloquée. Chacun invoque alors Allah en mentionnant une bonne action accomplie par crainte de Lui, et la pierre s’écarte peu à peu.',
    lessons: [
      'Il est permis d’invoquer Allah en mentionnant ses propres bonnes œuvres accomplies sincèrement pour Lui.',
      'La bienfaisance envers les parents : le deuxième homme attendit leur réveil jusqu’à l’aube plutôt que de les priver de leur lait.',
      'Renoncer à un péché par crainte d’Allah, alors qu’il est à portée de main, est une œuvre immense.',
      'Rendre à chacun son dû, et même davantage : le premier remit à son ouvrier tout ce que son salaire avait produit.',
    ],
    hadith: {
      collection: 'bukhari',
      number: '3465',
      fr: "Rapporté par Ibn `Umar : L’Envoyé d’Allah (ﷺ) a dit : « Trois personnes (des nations précédentes) voyageaient ensemble, et soudain il s’est mis à pleuvoir, alors ils se sont réfugiés dans une grotte. L’entrée de la grotte a été bloquée alors qu’ils étaient à l’intérieur. Ils se dirent : Ô vous ! Rien ne peut vous sauver sauf la vérité, alors que chacun d’entre vous demande l’aide d’Allah en mentionnant une action qu’il pense avoir faite sincèrement (pour plaire à Allah). L’un d’eux dit : Ô Allah ! Tu sais que j’avais un ouvrier qui a travaillé pour moi contre un faraq (trois sa’) de riz, mais il est parti en les laissant (c’est-à-dire son salaire). J’ai semé ce faraq de riz et, avec le rendement, j’ai acheté des vaches pour lui. Plus tard, quand il est revenu me demander son salaire, je lui ai dit : Va vers ces vaches et emmène-les. Il m’a dit : Mais tu ne me dois qu’un faraq de riz. Je lui ai dit : Va vers ces vaches et prends-les, car elles sont le produit de ce faraq (de riz). Il les a donc prises. Ô Allah ! Si Tu considères que j’ai fait cela par crainte de Toi, alors, s’il Te plaît, enlève la pierre. » La pierre bougea un peu de l’entrée de la grotte. Le deuxième dit : « Ô Allah, Tu sais que j’avais de vieux parents à qui j’apportais le lait de mes brebis chaque nuit. Un soir, j’ai été retardé et, quand je suis arrivé, ils dormaient, alors que ma femme et mes enfants pleuraient de faim. Je ne laissais pas ma famille boire avant que mes parents aient bu. Je n’aimais pas les réveiller, mais je n’aimais pas non plus qu’ils dorment sans avoir bu. J’ai donc attendu leur réveil jusqu’à l’aube. Ô Allah ! Si Tu considères que j’ai fait cela par crainte de Toi, alors, s’il Te plaît, enlève la pierre. » La pierre bougea et ils purent voir le ciel. Le troisième dit : « Ô Allah ! Tu sais que j’avais une cousine (la fille de mon oncle paternel) que j’aimais beaucoup et que j’ai voulu séduire, mais elle a refusé, sauf si je lui donnais cent dinars (pièces d’or). J’ai rassemblé la somme et la lui ai donnée, et elle m’a permis de m’approcher d’elle. Mais quand je me suis assis entre ses jambes, elle a dit : Crains Allah, et ne me déshonore pas sauf légalement. Je me suis levé et j’ai laissé les cent dinars pour elle. Ô Allah ! Si Tu considères que j’ai fait cela par crainte de Toi, alors, s’il Te plaît, enlève la pierre. » Alors Allah les a sauvés et ils sont sortis de la grotte",
    },
    quiz: [
      {
        q: 'Pour quel salaire l’ouvrier du premier homme avait-il travaillé ?',
        options: [
          'Cent dinars',
          'Un faraq de riz',
          'Une brebis pleine',
          'Une chamelle',
        ],
        answer: 1,
        ref: 'Al-Bukhārī 3465',
      },
      {
        q: 'Jusqu’à quand le deuxième homme attendit-il le réveil de ses parents ?',
        options: [
          'Jusqu’à minuit',
          'Jusqu’au soir suivant',
          'Jusqu’à l’aube',
          'Il les réveilla aussitôt',
        ],
        answer: 2,
        ref: 'Al-Bukhārī 3465',
      },
      {
        q: 'Que se passa-t-il après l’invocation du deuxième homme ?',
        options: [
          'La pierre se brisa en morceaux',
          'Rien ne bougea',
          'Un passant les entendit',
          'La pierre bougea et ils purent voir le ciel',
        ],
        answer: 3,
        ref: 'Al-Bukhārī 3465',
      },
    ],
  },
  {
    id: 'lepreux-chauve-aveugle',
    title: 'Le lépreux, le chauve et l’aveugle',
    intro:
      'Abū Hurayra rapporte ce récit du Prophète ﷺ : Allah éprouve trois Israélites en leur accordant la guérison et la richesse, puis leur envoie un ange sous l’apparence d’un pauvre voyageur. Deux d’entre eux renient le bienfait reçu, le troisième le reconnaît et donne.',
    lessons: [
      'La santé et la richesse sont une épreuve : Allah voit ce que nous en faisons.',
      'Reconnaître que ses biens viennent d’Allah, au lieu de prétendre, comme deux de ces hommes, les avoir hérités de ses ancêtres.',
      'Donner à celui qui demande au nom d’Allah attire Sa satisfaction.',
      'Se souvenir de son état passé garde humble et reconnaissant, comme l’ancien aveugle : « j’étais aveugle et Allah m’a rendu la vue ».',
    ],
    hadith: {
      collection: 'bukhari',
      number: '3464',
      fr: "Rapporté par Abu Huraira : Il a entendu l’Envoyé d’Allah (ﷺ) dire : « Allah a voulu éprouver trois Israélites : un lépreux, un aveugle et un homme chauve. Il leur a envoyé un ange qui est venu voir le lépreux et lui a demandé : Qu’est-ce que tu préfères le plus ? Il répondit : Une belle couleur et une belle peau, car les gens me fuient. L’ange le toucha, sa maladie disparut, et il reçut une belle couleur et une belle peau. L’ange lui demanda : Quelle richesse préfères-tu ? Il répondit : Des chameaux (ou des vaches). (Le narrateur hésite, car l’un des deux, le lépreux ou le chauve, a demandé des chameaux et l’autre des vaches.) On lui donna donc une chamelle pleine, et l’ange lui dit : Qu’Allah te bénisse avec elle. L’ange alla ensuite voir l’homme chauve et lui demanda : Qu’est-ce que tu préfères le plus ? Il répondit : De beaux cheveux et être guéri de cette maladie, car les gens me rejettent. L’ange le toucha, sa maladie disparut, et il eut de beaux cheveux. L’ange lui demanda : Quelle richesse préfères-tu ? Il répondit : Des vaches. L’ange lui donna une vache pleine et lui dit : Qu’Allah te bénisse avec elle. L’ange alla voir l’aveugle et lui demanda : Qu’est-ce que tu préfères le plus ? Il répondit : (Je voudrais) qu’Allah me rende la vue pour que je puisse voir les gens. L’ange toucha ses yeux et Allah lui rendit la vue. L’ange lui demanda : Quelle richesse préfères-tu ? Il répondit : Des moutons. L’ange lui donna une brebis pleine. Ensuite, les trois animaux donnèrent naissance à beaucoup de petits et chacun des trois hommes eut un troupeau qui remplissait une vallée : l’un de chameaux, l’autre de vaches et l’autre de moutons. Puis l’ange, sous l’apparence d’un lépreux, alla voir le lépreux et lui dit : Je suis un pauvre homme, j’ai tout perdu pendant mon voyage. Personne ne peut m’aider sauf Allah, puis toi. Au nom de Celui qui t’a donné cette belle couleur, cette belle peau et tant de richesses, donne-moi un chameau pour que je puisse poursuivre mon voyage. L’homme répondit : J’ai beaucoup d’obligations (je ne peux pas t’aider). L’ange dit : Je crois te reconnaître ; n’étais-tu pas un lépreux que les gens fuyaient ? N’étais-tu pas pauvre, et Allah t’a donné tout cela ? Il répondit : (C’est faux), j’ai hérité de ces biens de mes ancêtres. L’ange dit : Si tu mens, qu’Allah te rende comme tu étais avant. L’ange, sous l’apparence d’un chauve, alla voir le chauve et lui dit la même chose qu’au premier, et il répondit de la même façon. L’ange dit : Si tu mens, qu’Allah te rende comme tu étais avant. L’ange, sous l’apparence d’un aveugle, alla voir l’aveugle et lui dit : Je suis un pauvre homme et un voyageur, j’ai tout perdu pendant mon voyage. Personne ne peut m’aider sauf Allah, puis toi. Je te demande, au nom de Celui qui t’a rendu la vue, de me donner une brebis pour que je puisse finir mon voyage. L’homme répondit : C’est vrai, j’étais aveugle et Allah m’a rendu la vue ; j’étais pauvre et Allah m’a enrichi ; prends ce que tu veux de mes biens. Par Allah, je ne t’empêcherai pas de prendre ce dont tu as besoin pour Allah. L’ange répondit : Garde tes biens. Vous (les trois hommes) avez été mis à l’épreuve, et Allah est satisfait de toi et en colère contre tes deux compagnons. »",
    },
    quiz: [
      {
        q: 'Qu’a demandé l’aveugle lorsque l’ange l’a interrogé sur ce qu’il préférait ?',
        options: [
          'Des chameaux',
          'De beaux cheveux',
          'Une belle peau',
          'Qu’Allah lui rende la vue',
        ],
        answer: 3,
        ref: 'Al-Bukhārī 3464',
      },
      {
        q: 'Quelle richesse l’aveugle a-t-il reçue ?',
        options: [
          'Une chamelle pleine',
          'Une brebis pleine',
          'Une vache pleine',
          'Cent dinars',
        ],
        answer: 1,
        ref: 'Al-Bukhārī 3464',
      },
      {
        q: 'Comment le lépreux et le chauve ont-ils justifié leur richesse devant l’ange ?',
        options: [
          'Ils l’auraient héritée de leurs ancêtres',
          'Ils l’auraient gagnée au commerce',
          'Le roi la leur aurait donnée',
          'Ils l’auraient trouvée dans un trésor',
        ],
        answer: 0,
        ref: 'Al-Bukhārī 3464',
      },
    ],
  },
  {
    id: 'garcon-et-roi',
    title: 'Le garçon, le roi et le magicien',
    intro:
      'Ṣuhayb rapporte ce récit du Prophète ﷺ : un garçon envoyé auprès du magicien d’un roi rencontre un moine et choisit la foi en Allah. Ni la torture ni les tentatives du roi pour le faire périr n’ébranlent sa foi, et sa fermeté conduit tout un peuple à croire.',
    lessons: [
      'C’est Allah seul qui guérit : le garçon le rappelait à tous ceux qui venaient le voir.',
      'Rester ferme dans sa foi face à l’oppression, comme le moine, le proche du roi et le garçon.',
      'Se tourner vers Allah dans le danger : « Ô Allah, sauve-moi d’eux comme Tu veux. »',
      'La sincérité d’un seul croyant peut guider une foule : les gens dirent « Nous croyons au Seigneur de ce garçon ! »',
    ],
    hadith: {
      collection: 'muslim',
      number: '3005',
      fr: "Rapporté par Suhaib رضي الله عنه : Le Messager d’Allah ﷺ a raconté : « Il y avait un roi avant vous qui avait un magicien à sa cour. Quand le magicien devint vieux, il dit au roi : “Je suis devenu vieux, envoie-moi un jeune garçon pour que je lui enseigne la magie.” Le roi lui envoya un jeune garçon. Sur le chemin, ce garçon rencontra un moine assis et il fut impressionné par ses paroles. Il prit l’habitude de s’arrêter chez le moine avant d’aller chez le magicien, ce qui le mettait en retard et le magicien le frappait. Il se plaignit au moine, qui lui dit : “Si tu crains le magicien, dis-lui que ta famille t’a retenu. Et si tu crains ta famille, dis-leur que le magicien t’a retenu.” Un jour, une grosse bête bloqua le passage des gens. Le garçon dit : “Aujourd’hui, je vais savoir qui est le meilleur, le magicien ou le moine.” Il prit une pierre et dit : “Ô Allah, si l’affaire du moine Te plaît plus que celle du magicien, fais mourir cette bête pour que les gens puissent passer.” Il lança la pierre, tua la bête, et les gens purent circuler. Il raconta cela au moine, qui lui dit : “Mon garçon, aujourd’hui tu es supérieur à moi. Tu vas bientôt être mis à l’épreuve, et si c’est le cas, ne révèle pas mon identité.” Le garçon commença alors à guérir les aveugles, les lépreux et toutes sortes de malades. Un proche du roi, devenu aveugle, vint avec beaucoup de cadeaux et dit : “Si tu me guéris, tout ceci sera à toi.” Il répondit : “Je ne guéris personne, c’est Allah qui guérit. Si tu crois en Allah, j’invoquerai Allah pour toi.” Il crut en Allah et Allah le guérit. Il retourna auprès du roi, qui lui demanda : “Qui t’a rendu la vue ?” Il répondit : “Mon Seigneur.” Le roi dit : “Tu as donc un Seigneur autre que moi ?” Il répondit : “Mon Seigneur et le tien, c’est Allah.” Le roi le fit torturer jusqu’à ce qu’il révèle l’existence du garçon. Le garçon fut convoqué et le roi lui dit : “On m’a dit que tu fais des miracles.” Il répondit : “Je ne guéris personne, c’est Allah qui guérit.” Le roi le fit torturer jusqu’à ce qu’il dénonce le moine. Le moine fut convoqué et sommé d’abandonner sa religion, mais il refusa. On lui apporta une scie, on la plaça au milieu de sa tête et il fut coupé en deux. Le proche du roi fut aussi amené, sommé d’abandonner sa foi, il refusa et subit le même sort. Le garçon fut amené et sommé d’abandonner sa foi, il refusa. Le roi ordonna à ses hommes de l’emmener en haut d’une montagne pour le jeter s’il refusait. Arrivés en haut, le garçon pria : “Ô Allah, sauve-moi d’eux comme Tu veux.” La montagne trembla, ils tombèrent tous, et le garçon revint à pied chez le roi. Le roi l’envoya alors sur un bateau, avec l’ordre de le jeter à la mer s’il refusait d’abandonner sa foi. Le garçon pria : “Ô Allah, sauve-moi d’eux et de ce qu’ils veulent faire.” Le bateau chavira, ils se noyèrent tous, et le garçon revint à pied chez le roi. Le garçon dit au roi : “Tu ne pourras me tuer que si tu fais ce que je vais te dire. Rassemble les gens sur une grande place, attache-moi à un tronc, prends une flèche de mon carquois, dis : ‘Au nom d’Allah, le Seigneur de ce garçon’, puis tire la flèche. Tu pourras alors me tuer.” Le roi rassembla les gens, attacha le garçon, prit une flèche, dit : “Au nom d’Allah, le Seigneur de ce garçon”, tira la flèche, qui toucha la tempe du garçon. Celui-ci mit la main sur sa tempe et mourut. Les gens dirent alors : “Nous croyons au Seigneur de ce garçon !” Les proches du roi dirent : “Vois-tu, Allah a fait ce que tu voulais éviter : les gens ont cru.” Le roi ordonna de creuser des fosses, d’y allumer le feu, et dit : “Celui qui ne renonce pas à la foi du garçon sera jeté dans le feu.” Les gens préférèrent mourir plutôt que d’abandonner leur foi, jusqu’à ce qu’une femme, avec son enfant, hésite. L’enfant lui dit : “Ô maman, sois patiente, car c’est la vérité.” »",
    },
    quiz: [
      {
        q: 'Que répondait le garçon à ceux qui lui demandaient la guérison ?',
        options: [
          '« Apportez-moi des cadeaux »',
          '« Je ne guéris personne, c’est Allah qui guérit »',
          '« Allez voir le magicien »',
          '« Le roi vous guérira »',
        ],
        answer: 1,
        ref: 'Muslim 3005',
      },
      {
        q: 'Quelle parole le roi devait-il prononcer en tirant la flèche ?',
        options: [
          '« Au nom du roi »',
          '« Par ma puissance »',
          '« Au nom d’Allah, le Seigneur de ce garçon »',
          'Aucune parole',
        ],
        answer: 2,
        ref: 'Muslim 3005',
      },
      {
        q: 'Que dirent les gens après la mort du garçon ?',
        options: [
          '« Nous croyons au Seigneur de ce garçon ! »',
          '« Gloire au roi ! »',
          '« C’était un magicien »',
          'Ils se dispersèrent sans rien dire',
        ],
        answer: 0,
        ref: 'Muslim 3005',
      },
    ],
  },
  {
    id: 'jurayj',
    title: 'Jurayj, le dévot',
    intro:
      'Abū Hurayra rapporte ce récit du Prophète ﷺ, qui cite trois personnes ayant parlé au berceau. Jurayj, un dévot retiré dans son ermitage, ne répond pas à l’appel de sa mère pendant sa prière ; plus tard, faussement accusé, il est innocenté par la parole d’un nouveau-né. Le hadith se poursuit avec un autre nourrisson qui parla au sein de sa mère.',
    lessons: [
      'Prendre au sérieux l’appel de ses parents : la mère de Jurayj l’appela trois jours de suite, puis invoqua contre lui.',
      'Allah défend Ses serviteurs pieux : Il innocenta Jurayj par la parole d’un nourrisson.',
      'Se tourner vers la prière dans l’épreuve : avant d’interroger l’enfant, Jurayj demanda à prier.',
      'Ne pas juger sur les apparences : le cavalier bien vêtu était un tyran, et la jeune fille battue était accusée à tort.',
    ],
    hadith: {
      collection: 'muslim',
      number: '2550.02',
      fr: "Rapporté par Abu Huraira رضي الله عنه : « Le Messager d’Allah ﷺ a dit : “Trois personnes ont parlé alors qu’elles étaient encore au berceau : le Messie fils de Maryam, le compagnon de Juraij, et...” Juraij avait fait construire un ermitage et s’y était retiré. Sa mère est venue alors qu’il priait et a dit : “Juraij.” Il a dit : “Seigneur, ma mère m’appelle alors que je suis en prière”, et il a continué à prier. Elle est repartie, puis est revenue le lendemain alors qu’il priait et a dit : “Juraij.” Il a dit : “Seigneur, ma mère m’appelle alors que je prie”, et il a continué. Elle est revenue le lendemain, il priait encore, elle a dit : “Juraij.” Il a dit : “Seigneur, ma mère m’appelle alors que je prie”, et il a continué. Elle a alors invoqué : “Seigneur, ne lui donne pas la mort avant qu’il ait vu le sort des prostituées.” L’histoire de Juraij et de sa dévotion s’est répandue parmi les Bani Isra’il. Une prostituée très belle a dit : “Si vous voulez, je peux le séduire.” Elle s’est présentée à lui, mais il ne lui a pas prêté attention. Elle est allée voir un berger près de l’ermitage, s’est offerte à lui, il a eu une relation avec elle, elle est tombée enceinte et a eu un enfant. Elle a dit : “Cet enfant est de Juraij.” Les gens sont venus, l’ont fait descendre, ont détruit l’ermitage et l’ont frappé. Il a demandé : “Que se passe-t-il ?” Ils ont dit : “Tu as commis la fornication avec cette femme et elle a eu un enfant de toi.” Il a demandé : “Où est l’enfant ?” Ils l’ont amené, il a dit : “Laissez-moi prier.” Il a prié, puis s’est adressé à l’enfant : “Petit, qui est ton père ?” L’enfant a dit : “C’est le berger.” Alors ils se sont tournés vers Juraij, l’ont embrassé, ont cherché la bénédiction auprès de lui et ont dit : “Nous sommes prêts à reconstruire ton ermitage en or.” Il a répondu : “Non, reconstruisez-le en terre comme avant”, et ils l’ont fait. Ensuite, il y avait un bébé qui tétait sa mère. Un homme bien habillé est passé à cheval, la mère a dit : “Ô Allah, fais que mon enfant soit comme lui.” Le bébé a arrêté de téter, a regardé l’homme et a dit : “Ô Allah, ne me fais pas comme lui.” Puis il a repris la tétée. Abu Huraira a dit : “J’ai l’impression de voir le Messager d’Allah ﷺ mimer la scène, mettant son doigt dans sa bouche et imitant la tétée.” Abu Huraira a poursuivi : “Le Prophète ﷺ a dit : Une fille passait, battue par les gens qui disaient : ‘Tu as commis l’adultère, tu as volé’, et elle disait : ‘Allah me suffit, Il est mon meilleur protecteur.’ Sa mère a dit : ‘Ô Allah, ne fais pas que mon enfant soit comme elle’, et le bébé a arrêté de téter, l’a regardée et a dit : ‘Ô Allah, fais que je sois comme elle.’ Il y eut alors un échange entre eux. La mère a dit : ‘Un homme bien vêtu est passé, j’ai dit : Ô Allah, fais que mon enfant soit comme lui, et tu as dit : Ô Allah, ne me fais pas comme lui. Puis une fille battue est passée, on l’accusait d’adultère et de vol, j’ai dit : Ô Allah, ne fais pas que mon enfant soit comme elle, et tu as dit : Ô Allah, fais que je sois comme elle.’ Il a répondu : ‘Cet homme était un tyran, j’ai donc dit : Ô Allah, ne me fais pas comme lui. Quant à la fille, on l’accusait à tort d’adultère et de vol, alors j’ai dit : Ô Allah, fais que je sois comme elle.’ »",
    },
    quiz: [
      {
        q: 'Que faisait Jurayj lorsque sa mère l’appelait ?',
        options: [
          'Il dormait',
          'Il priait',
          'Il était en voyage',
          'Il gardait un troupeau',
        ],
        answer: 1,
        ref: 'Muslim 2550',
      },
      {
        q: 'Qui le nouveau-né désigna-t-il comme son père ?',
        options: [
          'Jurayj',
          'Un marchand',
          'Le berger',
          'Le roi',
        ],
        answer: 2,
        ref: 'Muslim 2550',
      },
      {
        q: 'Comment Jurayj demanda-t-il que son ermitage soit reconstruit ?',
        options: [
          'En or',
          'En terre, comme avant',
          'En pierre taillée',
          'Il refusa qu’on le reconstruise',
        ],
        answer: 1,
        ref: 'Muslim 2550',
      },
    ],
  },
  {
    id: 'repentir-du-meurtrier',
    title: 'L’homme qui avait tué quatre-vingt-dix-neuf personnes',
    intro:
      'Abū Sa‘īd al-Khudrī rapporte ce récit du Prophète ﷺ au sujet d’un homme des Banū Isrā’īl, coupable de nombreux meurtres, qui chercha malgré tout à se repentir. Il montre que la porte du repentir reste ouverte à celui qui revient sincèrement vers Allah.',
    lessons: [
      'Ne jamais désespérer du pardon d’Allah, quelle que soit la gravité de ses péchés.',
      'Le repentir sincère se traduit par des actes : l’homme se mit en route et, en mourant, tourna encore sa poitrine vers le village.',
      'Chercher conseil auprès de qui sait : le moine lui ferma la porte, un autre homme lui indiqua le chemin.',
      'Allah pardonne à qui Il veut : l’homme fut trouvé plus proche d’un empan du village où il se rendait.',
    ],
    hadith: {
      collection: 'bukhari',
      number: '3470',
      fr: "Rapporté par Abu Sa`id Al-Khudri : Le Prophète (ﷺ) a dit : « Parmi les hommes des Bani Israël, il y avait un homme qui avait tué quatre-vingt-dix-neuf personnes. Il partit alors demander si son repentir pouvait être accepté. Il rencontra un moine et lui demanda si son repentir pouvait être accepté. Le moine répondit non, alors l’homme le tua. Il continua à demander jusqu’à ce qu’un homme lui conseille d’aller dans un certain village. (Il s’y rendit) mais la mort le surprit en chemin. En mourant, il tourna sa poitrine vers le village (où il espérait que son repentir serait accepté), et alors les anges de la miséricorde et les anges du châtiment se disputèrent à son sujet. Allah ordonna au village (vers lequel il allait) de se rapprocher de lui, et au village (d’où il venait) de s’éloigner, puis Il ordonna aux anges de mesurer la distance entre son corps et les deux villages. Il fut trouvé plus proche d’une empan du village (où il se rendait). Ainsi, il fut pardonné. »",
    },
    quiz: [
      {
        q: 'Combien de personnes l’homme avait-il tuées avant de rencontrer le moine ?',
        options: [
          'Dix',
          'Cinquante',
          'Quatre-vingt-dix-neuf',
          'Cent',
        ],
        answer: 2,
        ref: 'Al-Bukhārī 3470',
      },
      {
        q: 'Qui se disputèrent à son sujet après sa mort ?',
        options: [
          'Les habitants des deux villages',
          'Les anges de la miséricorde et les anges du châtiment',
          'Ses enfants',
          'Le moine et son disciple',
        ],
        answer: 1,
        ref: 'Al-Bukhārī 3470',
      },
      {
        q: 'De combien était-il plus proche du village vers lequel il se rendait ?',
        options: [
          'D’un empan',
          'D’un jour de marche',
          'De cent pas',
          'D’un mille',
        ],
        answer: 0,
        ref: 'Al-Bukhārī 3470',
      },
    ],
  },
  {
    id: 'chien-assoiffe',
    title: 'L’homme qui donna à boire à un chien',
    intro:
      'Abū Hurayra rapporte ce récit du Prophète ﷺ : un homme assoiffé boit dans un puits, puis voit un chien souffrir de la même soif et redescend lui chercher de l’eau. Allah lui en est reconnaissant et lui pardonne, et le Prophète ﷺ précise qu’il y a une récompense pour toute créature vivante.',
    lessons: [
      'La bonté envers les animaux est récompensée : « il y a une récompense pour toute créature vivante ».',
      'Partir de sa propre souffrance pour comprendre celle des autres : « Ce chien souffre comme moi de la soif. »',
      'Ne jamais mépriser une bonne action : un peu d’eau dans une chaussure valut à cet homme le pardon d’Allah.',
      'Faire l’effort nécessaire pour aider : il redescendit dans le puits et remonta en tenant la chaussure avec ses dents.',
    ],
    hadith: {
      collection: 'bukhari',
      number: '2363',
      fr: "Rapporté par Abu Huraira : Le Messager d’Allah (ﷺ) a dit : « Alors qu’un homme marchait, il a eu soif et est descendu dans un puits pour boire de l’eau. En remontant, il a vu un chien haletant qui mangeait de la terre à cause de la soif. L’homme s’est dit : ‘Ce chien souffre comme moi de la soif.’ Il est donc redescendu dans le puits, a rempli sa chaussure d’eau, l’a tenue avec ses dents, est remonté et a donné de l’eau au chien. Allah l’a remercié pour cette bonne action et lui a pardonné. » Les gens ont demandé : « Ô Messager d’Allah (ﷺ) ! Y a-t-il une récompense pour nous si nous aidons les animaux ? » Il a répondu : « Oui, il y a une récompense pour toute créature vivante. »",
    },
    quiz: [
      {
        q: 'Avec quoi l’homme remonta-t-il de l’eau pour le chien ?',
        options: [
          'Un seau',
          'Ses mains',
          'Sa chaussure',
          'Une outre',
        ],
        answer: 2,
        ref: 'Al-Bukhārī 2363',
      },
      {
        q: 'Comment Allah a-t-il accueilli son geste ?',
        options: [
          'Il l’a remercié et lui a pardonné',
          'Il l’a rendu riche',
          'Il lui a donné un puits',
          'Il l’a guéri d’une maladie',
        ],
        answer: 0,
        ref: 'Al-Bukhārī 2363',
      },
      {
        q: 'Selon la réponse du Prophète ﷺ, pour quelles créatures y a-t-il une récompense ?',
        options: [
          'Uniquement pour les humains',
          'Uniquement pour les animaux domestiques',
          'Pour les chevaux et les chameaux',
          'Pour toute créature vivante',
        ],
        answer: 3,
        ref: 'Al-Bukhārī 2363',
      },
    ],
  },
  {
    id: 'pecheresse-et-chien',
    title: 'La prostituée et le chien',
    intro:
      'Abū Hurayra rapporte ce récit du Prophète ﷺ : une femme de mauvaise vie passe près d’un chien qui va mourir de soif au bord d’un puits, et elle lui puise de l’eau. Pour ce geste, Allah lui pardonne.',
    lessons: [
      'Nul ne doit désespérer de la miséricorde d’Allah, quel que soit son passé.',
      'Une bonne action sincère, même petite, peut valoir le pardon d’Allah.',
      'Ne pas mépriser les autres pour leurs fautes : Allah a pardonné à cette femme.',
      'Faire le bien avec ce que l’on a sous la main : elle se servit de sa chaussure et de son voile.',
    ],
    hadith: {
      collection: 'bukhari',
      number: '3321',
      fr: "Rapporté par Abu Huraira : Le Messager d’Allah (ﷺ) a dit : « Une prostituée a été pardonnée par Allah parce qu’en passant près d’un chien haletant près d’un puits, voyant qu’il allait mourir de soif, elle a enlevé sa chaussure, l’a attachée à son voile et a puisé de l’eau pour lui. Allah lui a pardonné pour cela. »",
    },
    quiz: [
      {
        q: 'Avec quoi la femme attacha-t-elle sa chaussure pour puiser l’eau ?',
        options: [
          'Une corde',
          'Sa ceinture',
          'Son voile',
          'Une branche',
        ],
        answer: 2,
        ref: 'Al-Bukhārī 3321',
      },
      {
        q: 'Qu’a obtenu cette femme pour son geste ?',
        options: [
          'Le pardon d’Allah',
          'Une grande richesse',
          'L’estime des gens',
          'Un puits à elle',
        ],
        answer: 0,
        ref: 'Al-Bukhārī 3321',
      },
    ],
  },
  {
    id: 'femme-et-chat',
    title: 'La femme et le chat',
    intro:
      '‘Abd Allāh ibn ‘Umar rapporte cet avertissement du Prophète ﷺ : une femme est entrée en Enfer à cause d’un chat qu’elle avait enfermé jusqu’à sa mort. Ce court récit montre que la cruauté envers un animal est un grave péché.',
    lessons: [
      'La cruauté envers les animaux est un grave péché, qui peut mener en Enfer.',
      'Qui garde un animal doit le nourrir et l’abreuver, ou le laisser libre de chercher sa nourriture.',
      'Aucune injustice n’est insignifiante, même envers une petite créature.',
      'À rapprocher du récit de l’homme qui donna à boire à un chien : la bonté envers les animaux mène au pardon, la cruauté au châtiment.',
    ],
    hadith: {
      collection: 'bukhari',
      number: '3482',
      fr: "Rapporté par `Abdullah bin `Umar : Le Messager d’Allah (ﷺ) a dit : Une femme a été punie à cause d’un chat qu’elle avait enfermé jusqu’à sa mort. Elle est entrée en Enfer à cause de cela, car elle ne lui a ni donné à manger ni à boire pendant qu’elle l’enfermait, et ne l’a pas non plus laissé libre pour qu’il puisse manger les insectes de la terre",
    },
    quiz: [
      {
        q: 'Pourquoi cette femme a-t-elle été punie ?',
        options: [
          'Elle avait volé un chat',
          'Elle avait enfermé un chat jusqu’à sa mort',
          'Elle avait chassé un chien',
          'Elle avait vendu un chat',
        ],
        answer: 1,
        ref: 'Al-Bukhārī 3482',
      },
      {
        q: 'Que pouvait faire le chat s’il avait été laissé libre ?',
        options: [
          'Rentrer chez son maître',
          'Boire à la rivière',
          'Manger les insectes de la terre',
          'Chasser les oiseaux',
        ],
        answer: 2,
        ref: 'Al-Bukhārī 3482',
      },
    ],
  },
  {
    id: 'mille-dinars',
    title: 'L’homme qui emprunta mille dinars',
    intro:
      'Abū Hurayra rapporte ce récit du Prophète ﷺ : un Israélite emprunte mille dinars en ne donnant pour témoin et pour garant qu’Allah. Ne trouvant pas de bateau pour rembourser à temps, il confie l’argent à la mer, et Allah le fait parvenir au prêteur.',
    lessons: [
      'Honorer ses dettes et faire tout son possible pour rembourser à l’échéance.',
      'S’en remettre à Allah après avoir fait tout ce qui est en son pouvoir : « J’ai vraiment tout fait […] alors je Te remets cet argent. »',
      'Allah suffit comme témoin et comme garant : Il a préservé ce qu’on Lui avait confié.',
      'L’honnêteté jusqu’au bout : l’emprunteur revint malgré tout avec mille dinars pour s’acquitter de sa dette.',
    ],
    hadith: {
      collection: 'bukhari',
      number: '2291',
      fr: "Rapporté par Abu Huraira : Le Prophète (ﷺ) a dit : « Un homme israélite a demandé à un autre israélite de lui prêter mille dinars. Le second homme a demandé des témoins. Le premier a répondu : “Allah suffit comme témoin.” Le second a dit : “Je veux une garantie.” Le premier a répondu : “Allah suffit comme garant.” Le second a dit : “Tu as raison”, et il lui a prêté l'argent pour une certaine période. Le débiteur est parti de l'autre côté de la mer. Quand il eut terminé son travail, il chercha un moyen de transport pour rentrer à temps et rembourser la dette, mais il n'en trouva pas. Alors, il prit un morceau de bois, y fit un trou, y mit les mille dinars et une lettre pour le prêteur, puis il referma soigneusement le trou. Il prit le morceau de bois jusqu'à la mer et dit : “Ô Allah ! Tu sais bien que j'ai pris un prêt de mille dinars de telle personne. Il m'a demandé une garantie, mais je lui ai dit que Ta garantie suffisait et il a accepté Ta garantie. Il a ensuite demandé un témoin et je lui ai dit que Tu suffisais comme témoin, et il T'a accepté comme témoin. J'ai vraiment tout fait pour trouver un moyen de lui rendre son argent, mais je n'ai rien trouvé, alors je Te remets cet argent.” En disant cela, il jeta le morceau de bois dans la mer jusqu'à ce qu'il disparaisse, puis il partit. Ensuite, il chercha un moyen de transport pour rejoindre le pays du créancier. Un jour, le prêteur sortit de chez lui pour voir si un bateau était arrivé avec son argent, et tout à coup il vit le morceau de bois dans lequel l'argent avait été placé. Il le prit chez lui pour en faire du bois de chauffage. Lorsqu'il le coupa, il trouva l'argent et la lettre à l'intérieur. Peu de temps après, le débiteur arriva avec mille dinars et dit : “Par Allah, j'ai tout fait pour trouver un bateau afin de t'apporter ton argent, mais je n'ai pas pu en trouver un avant celui par lequel je suis venu.” Le prêteur demanda : “M'as-tu envoyé quelque chose ?” Le débiteur répondit : “Je t'ai dit que je n'ai pas trouvé d'autre bateau que celui-ci.” Le prêteur dit : “Allah t'a rendu l'argent que tu avais envoyé dans le morceau de bois. Garde donc tes mille dinars et pars, guidé sur le droit chemin.”",
    },
    quiz: [
      {
        q: 'Qui l’emprunteur proposa-t-il comme témoin et comme garant ?',
        options: [
          'Son frère',
          'Le juge de la ville',
          'Allah',
          'Un marchand',
        ],
        answer: 2,
        ref: 'Al-Bukhārī 2291',
      },
      {
        q: 'Comment l’emprunteur fit-il partir l’argent ?',
        options: [
          'Par un messager',
          'Dans un morceau de bois jeté à la mer',
          'À bord d’un bateau marchand',
          'Il l’enterra sur le rivage',
        ],
        answer: 1,
        ref: 'Al-Bukhārī 2291',
      },
      {
        q: 'Pourquoi le prêteur emporta-t-il le morceau de bois chez lui ?',
        options: [
          'Pour en faire du bois de chauffage',
          'Pour le vendre',
          'Parce qu’il savait que l’argent était dedans',
          'Pour réparer son bateau',
        ],
        answer: 0,
        ref: 'Al-Bukhārī 2291',
      },
    ],
  },
  {
    id: 'or-du-terrain',
    title: 'L’or trouvé dans le terrain',
    intro:
      'Abū Hurayra rapporte ce récit du Prophète ﷺ : un homme achète un terrain et y découvre un pot rempli d’or. L’acheteur comme le vendeur refusent de le garder, et l’homme qu’ils prennent pour arbitre leur propose une solution.',
    lessons: [
      'L’honnêteté dans les transactions : l’acheteur refusa de garder ce qu’il estimait ne pas avoir acheté.',
      'Le scrupule face à un bien qui ne nous revient peut-être pas : chacun préféra que l’or aille à l’autre.',
      'Soumettre un différend à une personne sage pour le régler.',
      'Employer un bien dans le bien : marier les enfants, dépenser pour eux et donner le reste en aumône.',
    ],
    hadith: {
      collection: 'bukhari',
      number: '3472',
      fr: "Rapporté par Abu Huraira : Le Messager d’Allah (ﷺ) a dit : Un homme a acheté un terrain à un autre homme, et l’acheteur a trouvé dans ce terrain un pot en terre rempli d’or. L’acheteur a dit au vendeur : « Prends ton or, car je n’ai acheté que le terrain, pas l’or qui s’y trouvait. » L’ancien propriétaire a répondu : « Je t’ai vendu le terrain avec tout ce qu’il contient. » Alors, ils ont présenté leur cas à un homme qui leur a demandé : « Avez-vous des enfants ? » L’un a dit : « J’ai un garçon. » L’autre a dit : « J’ai une fille. » L’homme a dit : « Mariez la fille au garçon, dépensez l’argent pour eux deux et donnez le reste en aumône. »",
    },
    quiz: [
      {
        q: 'Qu’a trouvé l’acheteur dans le terrain ?',
        options: [
          'Une source d’eau',
          'Un pot rempli d’or',
          'Des bijoux d’argent',
          'Un parchemin',
        ],
        answer: 1,
        ref: 'Al-Bukhārī 3472',
      },
      {
        q: 'Que proposa l’homme qui les départagea ?',
        options: [
          'Partager l’or en deux parts égales',
          'Rendre le terrain au vendeur',
          'Marier la fille au garçon, dépenser l’or pour eux et donner le reste en aumône',
          'Remettre l’or au roi',
        ],
        answer: 2,
        ref: 'Al-Bukhārī 3472',
      },
    ],
  },
  {
    id: 'branche-epineuse',
    title: 'L’homme qui retira une branche épineuse',
    intro:
      'Abū Hurayra rapporte ce court récit du Prophète ﷺ : un homme trouve une branche épineuse sur son chemin et l’écarte. Allah le remercie pour ce geste et lui pardonne.',
    lessons: [
      'Écarter ce qui peut gêner ou blesser les passants est une bonne action récompensée.',
      'Ne jamais mépriser un geste simple : celui-ci valut à cet homme le pardon d’Allah.',
      'Prendre soin des lieux de passage que tout le monde partage.',
    ],
    hadith: {
      collection: 'bukhari',
      number: '2472',
      fr: "Rapporté par Abu Huraira : Le Messager d’Allah (ﷺ) a dit : « Un homme marchait sur la route, il trouva une branche d’arbre épineuse sur le chemin et l’enleva. Allah l’a remercié pour cet acte et lui a pardonné. »",
    },
    quiz: [
      {
        q: 'Qu’a trouvé l’homme sur la route ?',
        options: [
          'Une pierre',
          'Un animal blessé',
          'Une branche d’arbre épineuse',
          'Un trou',
        ],
        answer: 2,
        ref: 'Al-Bukhārī 2472',
      },
      {
        q: 'Qu’a fait Allah pour lui ?',
        options: [
          'Il l’a remercié et lui a pardonné',
          'Il l’a rendu riche',
          'Il lui a ouvert un nouveau chemin',
          'Il l’a guéri',
        ],
        answer: 0,
        ref: 'Al-Bukhārī 2472',
      },
    ],
  },
  {
    id: 'passagers-du-bateau',
    title: 'Les passagers du bateau',
    intro:
      'An-Nu‘mān ibn Bashīr rapporte cette parabole du Prophète ﷺ : des gens tirent au sort leurs places dans un bateau, et ceux du bas veulent percer la coque pour prendre de l’eau sans déranger ceux du haut. Elle illustre la responsabilité de chacun face au mal qui menace la communauté.',
    lessons: [
      'Celui qui respecte les limites d’Allah ne doit pas laisser faire ceux qui les transgressent.',
      'La faute de quelques-uns peut entraîner la perte de tous.',
      'Empêcher le mal protège toute la communauté, y compris ceux qui voulaient le commettre.',
      'Une bonne intention ne suffit pas : ceux du bas voulaient ne pas déranger, mais leur moyen menait au naufrage.',
    ],
    hadith: {
      collection: 'bukhari',
      number: '2493',
      fr: "Rapporté par An-Nu`man bin Bashir : Le Prophète (ﷺ) a dit : « L’exemple de la personne qui respecte les ordres et les interdits d’Allah par rapport à ceux qui les transgressent ressemble à des gens qui ont tiré au sort leur place dans un bateau. Certains étaient en haut, d’autres en bas. Quand ceux du bas avaient besoin d’eau, ils devaient monter, ce qui dérangeait les autres. Ils ont alors dit : ‘Faisons un trou dans notre partie du bateau pour prendre de l’eau, sans déranger ceux du dessus.’ Si les gens du dessus les laissaient faire, tout le monde serait perdu ; mais s’ils les en empêchent, tout le monde sera sauvé. »",
    },
    quiz: [
      {
        q: 'Comment les gens avaient-ils réparti leurs places dans le bateau ?',
        options: [
          'Selon leur richesse',
          'Par tirage au sort',
          'Selon leur âge',
          'Le capitaine les avait choisies',
        ],
        answer: 1,
        ref: 'Al-Bukhārī 2493',
      },
      {
        q: 'Que voulaient faire ceux du bas ?',
        options: [
          'Monter tous sur le pont',
          'Changer de place avec ceux du haut',
          'Quitter le bateau',
          'Faire un trou dans leur partie du bateau pour prendre de l’eau',
        ],
        answer: 3,
        ref: 'Al-Bukhārī 2493',
      },
      {
        q: 'Que se passe-t-il si ceux du haut les en empêchent ?',
        options: [
          'Tout le monde est sauvé',
          'Seuls ceux du haut sont sauvés',
          'Tout le monde est perdu',
          'Le bateau rentre au port',
        ],
        answer: 0,
        ref: 'Al-Bukhārī 2493',
      },
    ],
  },
  {
    id: 'cendres-dispersees',
    title: 'L’homme qui ordonna de brûler son corps',
    intro:
      'Abū Hurayra rapporte ce récit du Prophète ﷺ : un homme qui avait commis de mauvaises actions demande à ses fils de brûler son corps après sa mort et d’en disperser la cendre, tant il redoute le châtiment d’Allah. Allah le rassemble, l’interroge, puis lui pardonne.',
    lessons: [
      'La crainte sincère d’Allah a une grande valeur : c’est la raison que cet homme donna à Allah, qui lui pardonna.',
      'Rien n’échappe à Allah : Il ordonna à la terre de rassembler ce qu’elle détenait de lui, et l’homme se tint debout.',
      'Chacun sera ressuscité et interrogé sur ce qu’il a fait : « Qu’est-ce qui t’a poussé à agir ainsi ? »',
      'Ne jamais désespérer du pardon d’Allah.',
    ],
    hadith: {
      collection: 'bukhari',
      number: '3481',
      fr: "Rapporté par Abu Huraira : Le Prophète (ﷺ) a dit : Un homme faisait de mauvaises actions, et quand la mort est venue, il a dit à ses fils : « Après ma mort, brûlez-moi, puis réduisez-moi en poudre et dispersez la cendre dans l’air, car par Allah, si Allah a du pouvoir sur moi, Il me punira comme Il n’a jamais puni personne. » Quand il est mort, ses fils ont fait ce qu’il avait demandé. Allah a ordonné à la terre : « Rassemble ce que tu détiens de ses particules. » Elle l’a fait, et voilà que l’homme se tenait debout. Allah lui a demandé : « Qu’est-ce qui t’a poussé à agir ainsi ? » Il a répondu : « Ô mon Seigneur ! J’avais peur de Toi. » Alors Allah lui a pardonné. Un autre rapporteur a dit : « L’homme a dit : Par crainte de Toi, ô Seigneur. »",
    },
    quiz: [
      {
        q: 'Que demanda l’homme à ses fils avant de mourir ?',
        options: [
          'De donner ses biens aux pauvres',
          'De brûler son corps et d’en disperser la cendre',
          'De l’enterrer près d’un lieu de prière',
          'De jeûner à sa place',
        ],
        answer: 1,
        ref: 'Al-Bukhārī 3481',
      },
      {
        q: 'Quelle raison donna-t-il à Allah ?',
        options: [
          'La peur de ses fils',
          'La pauvreté',
          'L’ignorance',
          'La crainte d’Allah',
        ],
        answer: 3,
        ref: 'Al-Bukhārī 3481',
      },
    ],
  },
  {
    id: 'joie-du-repentir',
    title: 'Le voyageur et sa monture perdue',
    intro:
      'Anas ibn Mālik rapporte cette parabole du Prophète ﷺ : un voyageur perd dans le désert le chameau qui porte sa nourriture et sa boisson, puis le retrouve soudain devant lui alors qu’il avait perdu tout espoir. La joie d’Allah devant le repentir de Son serviteur est plus grande encore.',
    lessons: [
      'Allah se réjouit du repentir de Son serviteur lorsqu’il revient vers Lui.',
      'Ne pas tarder à se repentir, puisque ce retour est aimé d’Allah.',
      'Ne jamais désespérer : le voyageur avait perdu tout espoir lorsqu’il retrouva sa monture devant lui.',
    ],
    hadith: {
      collection: 'muslim',
      number: '2747.01',
      fr: "Rapporté par Anas b. Malik : Le Messager d’Allah ﷺ a dit : « Allah est plus heureux du repentir de Son serviteur lorsqu’il revient vers Lui que l’un d’entre vous ne l’est lorsqu’il est sur son chameau dans un désert sans eau, avec sa nourriture et sa boisson sur le chameau, puis il le perd. Ayant perdu tout espoir, il s’allonge à l’ombre, désespéré de retrouver son chameau, et soudain il le retrouve devant lui. Il saisit sa longe et, dans sa joie immense, il dit : “Ô Seigneur, Tu es mon serviteur et je suis Ton Seigneur.” Il se trompe ainsi à cause de sa grande joie. »",
    },
    quiz: [
      {
        q: 'À quoi le Prophète ﷺ compare-t-il la joie d’Allah devant le repentir ?',
        options: [
          'À la joie d’un marchand qui fait fortune',
          'À la joie d’un voyageur qui retrouve dans le désert sa monture perdue',
          'À la joie d’un père qui retrouve son fils',
          'À la joie d’un malade qui guérit',
        ],
        answer: 1,
        ref: 'Muslim 2747',
      },
      {
        q: 'Que portait la monture du voyageur ?',
        options: [
          'Ses marchandises',
          'Son or',
          'Sa nourriture et sa boisson',
          'Sa tente',
        ],
        answer: 2,
        ref: 'Muslim 2747',
      },
      {
        q: 'Que dit le voyageur sous l’effet de sa joie ?',
        options: [
          '« Ô Seigneur, Tu es mon serviteur et je suis Ton Seigneur »',
          '« Louange à Allah »',
          '« Allah est le plus grand »',
          'Il ne dit rien',
        ],
        answer: 0,
        ref: 'Muslim 2747',
      },
    ],
  },
  {
    id: 'dernier-au-paradis',
    title: 'Le dernier homme à entrer au Paradis',
    intro:
      '‘Abd Allāh ibn Mas‘ūd rapporte ces paroles du Prophète ﷺ sur le dernier homme à sortir du Feu et à entrer au Paradis. Croyant le Paradis déjà plein, il reçoit l’équivalent du monde et dix fois plus, et ce sera pourtant le rang le plus bas parmi ses habitants.',
    lessons: [
      'L’immensité de la générosité d’Allah : même le rang le plus bas du Paradis vaut dix fois le monde.',
      'Ce bas monde n’est rien à côté du Paradis : c’est lui qu’il faut viser.',
      'Ne jamais désespérer de la miséricorde d’Allah : cet homme sortit du Feu et entra au Paradis.',
    ],
    hadith: {
      collection: 'bukhari',
      number: '6571',
      fr: "Rapporté par `Abdullah : Le Prophète (ﷺ) a dit : « Je connais la personne qui sera la dernière à sortir du Feu et la dernière à entrer au Paradis. Ce sera un homme qui sortira du Feu en rampant, et Allah lui dira : ‘Va et entre au Paradis.’ Il s’y rendra, mais pensera qu’il est déjà plein, alors il reviendra et dira : ‘Seigneur, je l’ai trouvé plein.’ Allah lui dira : ‘Va et entre au Paradis, et tu auras l’équivalent du monde et dix fois plus (ou, tu auras dix fois ce que le monde contient).’ À ce moment-là, l’homme dira : ‘Te moques-tu de moi (ou ris-tu de moi) alors que Tu es le Roi ?’ J’ai vu le Messager d’Allah (ﷺ) sourire en disant cela, au point que ses dents de devant étaient visibles. On dit que cet homme sera celui qui aura le rang le plus bas parmi les gens du Paradis. »",
    },
    quiz: [
      {
        q: 'Que pensa l’homme en se rendant au Paradis ?',
        options: [
          'Qu’il était fermé',
          'Qu’il était déjà plein',
          'Qu’il n’en était pas digne',
          'Qu’il était trop petit',
        ],
        answer: 1,
        ref: 'Al-Bukhārī 6571',
      },
      {
        q: 'Que lui fut-il accordé ?',
        options: [
          'Une seule demeure',
          'Ce qu’il avait possédé sur terre',
          'L’équivalent du monde et dix fois plus',
          'Un jardin et une source',
        ],
        answer: 2,
        ref: 'Al-Bukhārī 6571',
      },
      {
        q: 'Comment le Messager d’Allah ﷺ réagit-il en rapportant la réponse de l’homme ?',
        options: [
          'Il sourit au point que ses dents de devant étaient visibles',
          'Il pleura',
          'Il garda le silence',
          'Il détourna le visage',
        ],
        answer: 0,
        ref: 'Al-Bukhārī 6571',
      },
    ],
  },
  {
    id: 'moussa-et-khidr',
    title: 'Mūsā et al-Khiḍr',
    intro:
      'Ibn ‘Abbās tenait ce récit d’Ubayy ibn Ka‘b, qui l’a entendu du Prophète ﷺ : après avoir dit qu’il était le plus savant des hommes, le prophète Mūsā (Moïse) part à la rencontre d’un serviteur d’Allah plus savant que lui, al-Khiḍr. Ce voyage, également relaté dans la sourate al-Kahf, enseigne l’humilité devant la science d’Allah et la patience.',
    lessons: [
      'Attribuer la science à Allah : Mūsā fut réprimandé pour avoir dit « C’est moi le plus savant ».',
      'Voyager et faire des efforts pour apprendre, même lorsqu’on est déjà savant.',
      'La science des créatures n’est rien face à celle d’Allah : à peine ce qu’un moineau prend de la mer avec son bec.',
      'La patience est nécessaire pour apprendre : le Prophète ﷺ aurait aimé que Mūsā patiente davantage, pour en apprendre plus sur leur histoire.',
    ],
    hadith: {
      collection: 'bukhari',
      number: '122',
      fr: "Rapporté par Sa`id bin Jubair : J’ai dit à Ibn `Abbas : « Nauf Al-Bakali prétend que Moïse, le compagnon de Khadir, n’était pas le Moïse des Bani Israël, mais un autre Moïse. » Ibn `Abbas répondit que l’ennemi d’Allah (Nauf) était un menteur. Rapporté par Ubai bin Ka`b : Le Prophète (ﷺ) a dit : « Un jour, le Prophète (ﷺ) Moïse s’est levé et a parlé aux Bani Israël. On lui a demandé : “Qui est l’homme le plus savant parmi les gens ?” Il a répondu : “C’est moi le plus savant.” Allah a réprimandé Moïse car il n’a pas attribué la connaissance absolue à Allah. Alors Allah lui a inspiré : “Au croisement des deux mers, il y a un de Mes serviteurs qui est plus savant que toi.” Moïse a dit : “Ô mon Seigneur ! Comment puis-je le rencontrer ?” Allah a dit : “Prends un poisson dans un panier, et tu le trouveras à l’endroit où tu perdras le poisson.” Moïse est donc parti avec son jeune serviteur, Yusha` bin Noon, en portant un poisson dans un panier. Ils sont arrivés près d’un rocher, se sont allongés et se sont endormis. Le poisson est sorti du panier et a pris son chemin dans la mer comme dans un tunnel. Cela a étonné Moïse et son serviteur. Ils ont continué leur voyage cette nuit-là et le lendemain. Au matin, Moïse a dit à son serviteur : “Apporte-nous notre repas, nous avons beaucoup souffert de fatigue pendant ce voyage.” Moïse ne s’est pas fatigué avant d’avoir dépassé l’endroit indiqué. Là, le serviteur a dit à Moïse : “Te souviens-tu quand nous nous sommes arrêtés près du rocher ? J’ai oublié le poisson.” Moïse a dit : “C’est ce que nous cherchions.” Ils sont donc revenus sur leurs pas jusqu’au rocher. Là, ils ont vu un homme couvert d’un vêtement. Moïse l’a salué. Al-Khadir a répondu : “Comment les gens se saluent-ils dans ton pays ?” Moïse a dit : “Je suis Moïse.” Il a demandé : “Le Moïse des Bani Israël ?” Moïse a répondu oui et a ajouté : “Puis-je te suivre pour que tu m’enseignes de la connaissance qu’Allah t’a donnée ?” Al-Khadir a répondu : “Tu ne pourras pas être patient avec moi, ô Moïse ! J’ai une partie de la connaissance d’Allah qu’Il m’a apprise et que tu ne connais pas, et toi tu as une connaissance qu’Allah t’a donnée et que j’ignore.” Moïse a dit : “Si Allah le veut, tu me trouveras patient et je n’irai pas contre tes ordres.” Ils sont donc partis marcher le long du rivage, car ils n’avaient pas de bateau. Un bateau est passé, ils ont demandé à monter à bord. L’équipage a reconnu Al-Khadir et les a pris sans leur faire payer. Un moineau s’est posé sur le bord du bateau et a trempé son bec une ou deux fois dans la mer. Al-Khadir a dit : “Ô Moïse ! Ma connaissance et la tienne n’enlèvent rien à la connaissance d’Allah, sauf ce que ce moineau a pris de la mer avec son bec.” Al-Khadir a ensuite arraché une planche du bateau. Moïse a dit : “Ces gens nous ont pris gratuitement et tu as abîmé leur bateau pour les faire couler !” Al-Khadir a répondu : “Ne t’ai-je pas dit que tu ne pourrais pas être patient avec moi ?” Moïse a dit : “Ne me blâme pas pour ce que j’ai oublié.” La première excuse de Moïse était l’oubli. Ils ont continué et ont trouvé un garçon qui jouait avec d’autres enfants. Al-Khadir a attrapé la tête du garçon et l’a tué. Moïse a dit : “As-tu tué une âme innocente qui n’a tué personne ?” Al-Khadir a répondu : “Ne t’ai-je pas dit que tu ne pourrais pas être patient avec moi ?” Ils ont continué jusqu’à arriver dans une ville. Ils ont demandé à manger aux habitants, mais ceux-ci ont refusé de les accueillir. Ils ont trouvé un mur prêt à s’effondrer. Al-Khadir l’a réparé de ses mains. Moïse a dit : “Si tu voulais, tu aurais pu demander un salaire pour cela.” Al-Khadir a répondu : “C’est ici que nos chemins se séparent.” Le Prophète a ajouté : “Qu’Allah fasse miséricorde à Moïse ! Si seulement il avait été plus patient, nous aurions appris plus sur son histoire avec Al-Khadir.”",
    },
    quiz: [
      {
        q: 'Quel signe devait indiquer à Mūsā l’endroit où trouver le serviteur savant ?',
        options: [
          'Un arbre en fleurs',
          'La perte du poisson',
          'Une étoile',
          'Le chant d’un oiseau',
        ],
        answer: 1,
        ref: 'Al-Bukhārī 122',
      },
      {
        q: 'Qui accompagnait Mūsā au début du voyage ?',
        options: [
          'Son jeune serviteur, Yusha‘ bin Noon',
          'Son frère Hārūn',
          'Un marchand',
          'Personne',
        ],
        answer: 0,
        ref: 'Al-Bukhārī 122',
      },
      {
        q: 'À quoi al-Khiḍr compara-t-il leur science face à celle d’Allah ?',
        options: [
          'À un grain de sable dans le désert',
          'À une feuille d’arbre',
          'À une goutte de pluie',
          'À ce que le moineau prend de la mer avec son bec',
        ],
        answer: 3,
        ref: 'Al-Bukhārī 122',
      },
    ],
  },
];
