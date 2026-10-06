import type { LearnGuide } from './types';

/*
 * Guides pratiques de la rubrique « Apprendre ».
 *
 * - Formules tirées des hadiths : formulation de « Ḥiṣn al-Muslim » (Sa'īd ibn Wahf
 *   al-Qaḥṭānī), entièrement vocalisée. Les rares écarts (fautes de frappe corrigées,
 *   formules absentes de l'ouvrage) sont listés et justifiés dans tests/learn.test.ts.
 * - Textes coraniques : copiés tels quels, par script, depuis le texte uthmani Tanzil
 *   (encodage Khaled Hosny, pour la police Amiri Quran) ; traduction française de
 *   Muhammad Hamidullah, reproduite sans retouche.
 * - Références : Al-Bukhārī et les Sunan selon la numérotation usuelle (sunnah.com),
 *   Muslim selon Fu'ād 'Abd al-Bāqī. Chaque numéro a été vérifié sur le texte arabe.
 * - Là où les écoles juridiques divergent, le texte le signale sans trancher.
 *
 * Vérification automatique : tests/learn.test.ts.
 */

// ---------------------------------------------------------------------------
// Début du bloc généré par script (texte coranique) — ne pas modifier à la main.
// ---------------------------------------------------------------------------

/** Coran 1:1-7 (Al-Fātiḥa). */
const AL_FATIHA = {
  ar: "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ ﴿١﴾ ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَـٰلَمِینَ ﴿٢﴾ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ ﴿٣﴾ مَـٰلِكِ یَوۡمِ ٱلدِّینِ ﴿٤﴾ إِیَّاكَ نَعۡبُدُ وَإِیَّاكَ نَسۡتَعِینُ ﴿٥﴾ ٱهۡدِنَا ٱلصِّرَ ٰ⁠طَ ٱلۡمُسۡتَقِیمَ ﴿٦﴾ صِرَ ٰ⁠طَ ٱلَّذِینَ أَنۡعَمۡتَ عَلَیۡهِمۡ غَیۡرِ ٱلۡمَغۡضُوبِ عَلَیۡهِمۡ وَلَا ٱلضَّاۤلِّینَ ﴿٧﴾",
  fr: "Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux (1) Louange à Allah, Seigneur de l'univers (2) Le Tout Miséricordieux, le Très Miséricordieux (3) Maître du Jour de la rétribution (4) C'est Toi [Seul] que nous adorons, et c'est Toi [Seul] dont nous implorons secours (5) Guide-nous dans le droit chemin (6) le chemin de ceux que Tu as comblés de faveurs, non pas de ceux qui ont encouru Ta colère, ni des égarés (7)",
};

/** Coran 112:1-4 (Al-Ikhlāṣ), précédée de la basmala. */
const AL_IKHLAS = {
  ar: "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ قُلۡ هُوَ ٱللَّهُ أَحَدٌ ﴿١﴾ ٱللَّهُ ٱلصَّمَدُ ﴿٢﴾ لَمۡ یَلِدۡ وَلَمۡ یُولَدۡ ﴿٣﴾ وَلَمۡ یَكُن لَّهُۥ كُفُوًا أَحَدُۢ ﴿٤﴾",
  fr: "Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux. Dis: «Il est Allah, Unique (1) Allah, Le Seul à être imploré pour ce que nous désirons (2) Il n'a jamais engendré, n'a pas été engendré non plus (3) Et nul n'est égal à Lui» (4)",
};

// ---------------------------------------------------------------------------
// Fin du bloc généré.
// ---------------------------------------------------------------------------

/**
 * « Trois fois » : hadith d'Ibn Mas'ūd (Abū Dāwūd 886, At-Tirmidhī 261), dont la chaîne est
 * interrompue ; At-Tirmidhī précise que les savants recommandent de ne pas dire moins de
 * trois glorifications. La formule elle-même est authentique (Muslim 772).
 */
const TASBIH_SOURCE_NOTE = 'trois fois : At-Tirmidhī 261';

export const GUIDES: LearnGuide[] = [
  // -------------------------------------------------------------------------
  {
    id: 'piliers',
    title: 'Les piliers de l’islam et de la foi',
    subtitle: 'Islam, īmān et iḥsān : les fondements de la religion',
    intro:
      'Un jour, un homme aux habits d’un blanc éclatant vint s’asseoir devant le Prophète ﷺ et l’interrogea sur l’islam, la foi (īmān) et l’excellence (iḥsān). Après son départ, le Prophète ﷺ dit : « C’était Jibril (l’ange Gabriel), venu vous enseigner votre religion » (Muslim 8). Ce hadith et celui des cinq piliers (Al-Bukhārī 8, Muslim 16) sont les n° 2 et 3 des Quarante hadiths d’an-Nawawī.',
    sections: [
      {
        title: 'Les cinq piliers de l’islam',
        steps: [
          {
            title: 'L’attestation de foi (shahāda)',
            text: 'Attester qu’il n’y a de divinité digne d’adoration qu’Allah et que Muḥammad ﷺ est Son messager. C’est par cette attestation, prononcée avec sincérité et conviction, que l’on entre en islam.',
            ar: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ',
            translit: 'Ash-hadu an lā ilāha illa-llāh, wa ash-hadu anna Muḥammadan rasūlu-llāh.',
            fr: 'J’atteste qu’il n’y a de divinité qu’Allah, et j’atteste que Muḥammad est le Messager d’Allah.',
            source: 'Al-Bukhārī 8, Muslim 16',
          },
          {
            title: 'La prière (ṣalāt)',
            text: 'Accomplir les cinq prières obligatoires de chaque jour, chacune en son temps. En envoyant Mu‘ādh au Yémen, le Prophète ﷺ lui demanda d’enseigner les cinq prières juste après l’attestation de foi.',
            source: 'Coran 4:103 ; Al-Bukhārī 1395',
          },
          {
            title: 'L’aumône obligatoire (zakāt)',
            text: 'Verser une part de ses biens aux ayants droit cités par le Coran (pauvres, nécessiteux…). Pour l’argent épargné, lorsqu’il atteint un seuil minimal (niṣāb) et qu’une année lunaire s’est écoulée, elle est de 2,5 % (un quarantième).',
            source: 'Coran 9:60 ; Al-Bukhārī 1395, 1454',
          },
          {
            title: 'Le jeûne du mois de Ramaḍān (ṣawm)',
            text: 'S’abstenir de manger, de boire et de relations intimes, de l’aube jusqu’au coucher du soleil, chaque jour du mois de Ramaḍān. Le malade et le voyageur rattrapent plus tard les jours manqués.',
            source: 'Coran 2:183-187',
          },
          {
            title: 'Le pèlerinage à La Mecque (ḥajj)',
            text: 'Se rendre à la Maison sacrée (la Ka‘ba) pour accomplir les rites du pèlerinage, une fois dans sa vie, pour qui en a la capacité physique et financière.',
            source: 'Coran 3:97 ; Muslim 1337',
          },
        ],
      },
      {
        title: 'Les six piliers de la foi (īmān)',
        steps: [
          {
            title: 'Croire en Allah',
            text: 'Croire qu’Allah existe, qu’Il est l’Unique Créateur et Seigneur de toute chose, que Lui seul mérite d’être adoré, et qu’Il possède les plus beaux noms et les attributs parfaits.',
            source: 'Muslim 8 ; Coran 112',
          },
          {
            title: 'Croire en Ses anges',
            text: 'Croire à l’existence des anges, créés de lumière, qui obéissent à Allah sans jamais Lui désobéir. Parmi eux, Jibrīl (Gabriel) est chargé de transmettre la révélation.',
            source: 'Muslim 8, 2996 ; Coran 66:6, 2:97',
          },
          {
            title: 'Croire en Ses Livres',
            text: 'Croire qu’Allah a révélé des Livres à Ses messagers, dont la Torah, l’Évangile, les Psaumes (Zabūr) et le Coran, Sa dernière révélation, qu’Il a promis de préserver.',
            source: 'Muslim 8 ; Coran 3:3, 4:163, 15:9',
          },
          {
            title: 'Croire en Ses messagers',
            text: 'Croire en tous les prophètes et messagers envoyés par Allah, comme Nūḥ (Noé), Ibrāhīm (Abraham), Mūsā (Moïse) et ‘Īsā (Jésus), sans faire de distinction entre eux, et croire que Muḥammad ﷺ est le dernier des prophètes.',
            source: 'Muslim 8 ; Coran 2:285, 33:40',
          },
          {
            title: 'Croire au Jour dernier',
            text: 'Croire à la résurrection après la mort, au jugement où chacun rendra compte de ses actes, au Paradis et à l’Enfer.',
            source: 'Muslim 8 ; Coran 4:136',
          },
          {
            title: 'Croire au destin (qadar)',
            text: 'Croire qu’Allah connaît toute chose, qu’Il a tout écrit et que rien n’arrive sans Sa volonté, que cela nous paraisse un bien ou un mal. L’être humain reste responsable de ses choix : il a une volonté, soumise à celle d’Allah.',
            source: 'Muslim 8, 2653 ; Coran 54:49, 81:28-29',
          },
        ],
      },
      {
        title: 'L’excellence (iḥsān)',
        steps: [
          {
            title: 'Adorer Allah comme si on Le voyait',
            text: 'Le Prophète ﷺ a défini l’iḥsān ainsi : « C’est d’adorer Allah comme si tu Le voyais ; et même si tu ne Le vois pas, certes Lui te voit. » C’est le plus haut degré de la religion : accomplir chaque acte avec sincérité, en ayant conscience du regard d’Allah.',
            source: 'Muslim 8',
          },
        ],
      },
    ],
    notes: [
      'L’ordre des piliers suit la version de Muslim, où Ibn ‘Umar cite le jeûne de Ramaḍān avant le pèlerinage en précisant : « C’est ainsi que je l’ai entendu du Messager d’Allah ﷺ » (Muslim 16).',
      'Pour entrer en islam, il suffit de prononcer l’attestation de foi avec sincérité. Il est ensuite conseillé de se rapprocher d’une mosquée ou d’un enseignant de confiance pour apprendre pas à pas la prière et les bases de la religion.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'ablutions',
    title: 'Les ablutions (wuḍū’)',
    subtitle: 'Se purifier avant la prière, étape par étape',
    intro:
      'Le Prophète ﷺ a dit : « Aucune prière n’est acceptée sans purification » (Muslim 224). Les ablutions sont décrites dans le Coran (5:6), et le compagnon ‘Uthmān ibn ‘Affān les a montrées telles qu’il avait vu le Prophète ﷺ les faire (Al-Bukhārī 159, Muslim 226) : c’est cette description que suit ce guide.',
    sections: [
      {
        title: 'Avant de commencer',
        steps: [
          {
            title: 'L’intention',
            text: 'Avoir dans le cœur l’intention de se purifier pour Allah, en vue de la prière. Il n’est pas nécessaire de la prononcer.',
            source: 'Al-Bukhārī 1, Muslim 1907',
          },
          {
            title: 'Dire « Bismillāh »',
            text: 'Commencer les ablutions en prononçant le nom d’Allah.',
            ar: 'بِسْمِ اللَّهِ',
            translit: 'Bismi-llāh.',
            fr: 'Au nom d’Allah.',
            source: 'Abū Dāwūd 101, Ibn Mājah 399',
          },
        ],
      },
      {
        title: 'Les étapes, dans l’ordre',
        steps: [
          {
            title: 'Laver les mains — 3 fois',
            text: 'Verser de l’eau sur les mains et les laver jusqu’aux poignets, trois fois.',
            source: 'Al-Bukhārī 159, Muslim 226',
          },
          {
            title: 'Rincer la bouche et le nez — 3 fois',
            text: 'Prendre de l’eau dans la main droite, se rincer la bouche, puis aspirer un peu d’eau par le nez et la rejeter. Le faire trois fois.',
            source: 'Al-Bukhārī 159, 185 ; Muslim 235',
          },
          {
            title: 'Laver le visage — 3 fois',
            text: 'Laver tout le visage, de la naissance des cheveux jusqu’au menton et d’une oreille à l’autre, trois fois.',
            source: 'Al-Bukhārī 159, Muslim 226',
          },
          {
            title: 'Laver les bras jusqu’aux coudes — 3 fois',
            text: 'Laver le bras droit, du bout des doigts jusqu’au coude compris, trois fois, puis le bras gauche de la même manière.',
            source: 'Muslim 226',
          },
          {
            title: 'Passer les mains mouillées sur la tête',
            text: 'Passer les mains mouillées sur la tête, du front jusqu’à la nuque, puis les ramener vers l’avant. On le fait une fois (l’école shafi‘ite recommande trois fois).',
            source: 'Al-Bukhārī 185, Muslim 235',
          },
          {
            title: 'Essuyer les oreilles',
            text: 'Avec les doigts encore mouillés, passer les index à l’intérieur des oreilles et les pouces sur leur face extérieure.',
            source: 'An-Nasā’ī 102, At-Tirmidhī 36',
          },
          {
            title: 'Laver les pieds jusqu’aux chevilles — 3 fois',
            text: 'Laver le pied droit, chevilles comprises, trois fois, puis le pied gauche de la même manière. Veiller à ce que l’eau atteigne les talons : le Prophète ﷺ a mis en garde contre les talons laissés secs.',
            source: 'Muslim 226 ; Al-Bukhārī 165',
          },
        ],
      },
      {
        title: 'Après les ablutions',
        steps: [
          {
            title: 'L’attestation de foi',
            text: 'Le Prophète ﷺ a annoncé que les huit portes du Paradis s’ouvrent pour celui qui fait soigneusement ses ablutions puis dit :',
            ar: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
            translit: "Ash-hadu an lā ilāha illa-llāhu waḥdahu lā sharīka lah, wa ash-hadu anna Muḥammadan 'abduhu wa rasūluh.",
            fr: 'J’atteste qu’il n’y a de divinité qu’Allah, Seul, sans associé, et j’atteste que Muḥammad est Son serviteur et Son messager.',
            source: 'Muslim 234',
          },
          {
            title: 'L’invocation rapportée par At-Tirmidhī',
            text: 'Dans la version d’At-Tirmidhī, on ajoute après l’attestation :',
            ar: 'اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ، وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ',
            translit: "Allāhumma-j'alnī mina-t-tawwābīn, wa-j'alnī mina-l-mutaṭahhirīn.",
            fr: 'Ô Allah, fais de moi l’un de ceux qui se repentent, et fais de moi l’un de ceux qui se purifient.',
            source: 'At-Tirmidhī 55',
          },
          {
            title: 'Prier deux rak‘as (recommandé)',
            text: '« Celui qui fait ses ablutions comme je viens de les faire, puis prie deux rak‘as sans se laisser distraire par ses pensées, ses péchés passés lui sont pardonnés. »',
            source: 'Al-Bukhārī 159, Muslim 226',
          },
        ],
      },
      {
        title: 'Ce qui annule les ablutions',
        steps: [
          {
            title: 'Ce qui sort par les voies naturelles',
            text: 'L’urine, les selles et les gaz annulent les ablutions : il faut les refaire avant de prier.',
            source: 'Coran 5:6 ; Al-Bukhārī 135',
          },
          {
            title: 'Le sommeil profond et la perte de conscience',
            text: 'Le sommeil profond, notamment allongé, ainsi que l’évanouissement ou la perte de la raison, annulent les ablutions. Les écoles précisent différemment le cas du sommeil léger ou en position assise.',
            source: 'At-Tirmidhī 96 ; Abū Dāwūd 203',
          },
          {
            title: 'Ce qui impose le grand lavage',
            text: 'Les relations intimes, l’éjaculation, la fin des règles ou des lochies imposent le ghusl : voir le guide « La grande ablution ».',
            source: 'Coran 5:6',
          },
        ],
      },
    ],
    notes: [
      'Le minimum obligatoire cité par le Coran (5:6) est de laver le visage, les bras jusqu’aux coudes et les pieds jusqu’aux chevilles, et de passer les mains mouillées sur la tête. Les écoles divergent sur le caractère obligatoire de l’intention, de l’ordre, de l’enchaînement sans interruption, du frottement et du rinçage de la bouche et du nez.',
      'Laver chaque membre une seule fois est valable : le Prophète ﷺ a fait ses ablutions en lavant une fois, deux fois ou trois fois (Al-Bukhārī 157, 158, 159).',
      'Les écoles divergent sur d’autres causes d’annulation : toucher directement ses parties intimes, toucher une personne de l’autre sexe, manger de la viande de chameau, saigner ou vomir abondamment… Suivez l’avis d’un enseignant de confiance.',
      'Il est permis, à certaines conditions, de passer les mains mouillées sur des chaussons de cuir (khuffs) enfilés en état de pureté au lieu de laver les pieds (Al-Bukhārī 206, Muslim 274) ; renseignez-vous sur ces conditions et sur la durée permise.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'ghusl',
    title: 'La grande ablution (ghusl)',
    subtitle: 'Le lavage rituel du corps entier : quand et comment',
    intro:
      'Le ghusl est le lavage rituel de tout le corps. Il est indispensable pour prier après un état de grande impureté (janāba) : « Et si vous êtes pollués «junub», alors purifiez-vous (par un bain) » (Coran 5:6). La manière de faire suit la description de ‘Ā’isha, l’épouse du Prophète ﷺ (Al-Bukhārī 248, Muslim 316).',
    sections: [
      {
        title: 'Quand est-il obligatoire ?',
        steps: [
          {
            title: 'Après des relations intimes',
            text: 'Dès qu’il y a eu rapport sexuel, même sans éjaculation, comme le précise une version rapportée par Muslim.',
            source: 'Al-Bukhārī 291, Muslim 348',
          },
          {
            title: 'Après une éjaculation',
            text: 'Après une émission de sperme, y compris pendant le sommeil. Interrogé par Umm Sulaym, le Prophète ﷺ a précisé que la femme doit aussi faire le ghusl après un tel rêve si elle constate un écoulement.',
            source: 'Muslim 343 ; Al-Bukhārī 282',
          },
          {
            title: 'À la fin des règles et des lochies',
            text: 'Lorsque les menstrues, ou les saignements qui suivent l’accouchement (nifās), ont pris fin.',
            source: 'Coran 2:222 ; Al-Bukhārī 320',
          },
          {
            title: 'En embrassant l’islam',
            text: 'Le Prophète ﷺ ordonna à Qays ibn ‘Āṣim de se laver lorsqu’il embrassa l’islam. Certaines écoles en font une obligation, d’autres une recommandation.',
            source: 'Abū Dāwūd 355, At-Tirmidhī 605',
          },
        ],
      },
      {
        title: 'Comment faire',
        steps: [
          {
            title: 'L’intention',
            text: 'Avoir dans le cœur l’intention de se purifier de la grande impureté.',
            source: 'Al-Bukhārī 1, Muslim 1907',
          },
          {
            title: 'Se laver les mains',
            text: 'Commencer par se laver les mains.',
            source: 'Al-Bukhārī 248, Muslim 316',
          },
          {
            title: 'Laver les parties intimes',
            text: 'Verser de l’eau de la main droite sur la main gauche et laver ses parties intimes.',
            source: 'Muslim 316',
          },
          {
            title: 'Faire les ablutions',
            text: 'Faire des ablutions complètes, comme pour la prière. On peut garder le lavage des pieds pour la fin, comme le rapporte Maymūna.',
            source: 'Al-Bukhārī 248, 249 ; Muslim 316',
          },
          {
            title: 'Mouiller la racine des cheveux',
            text: 'Plonger les doigts dans l’eau et les passer dans les cheveux pour que l’eau en atteigne la racine.',
            source: 'Al-Bukhārī 248, Muslim 316',
          },
          {
            title: 'Verser de l’eau sur la tête — 3 fois',
            text: 'Verser trois fois de l’eau sur la tête, à pleines mains.',
            source: 'Al-Bukhārī 248, Muslim 316',
          },
          {
            title: 'Laver tout le corps',
            text: 'Verser l’eau sur tout le corps en commençant par le côté droit, et veiller à ce qu’elle atteigne chaque partie (aisselles, nombril, plis de la peau…).',
            source: 'Al-Bukhārī 248, 168',
          },
          {
            title: 'Laver les pieds',
            text: 'Terminer en se lavant les pieds.',
            source: 'Muslim 316 ; Al-Bukhārī 249',
          },
        ],
      },
      {
        title: 'Le minimum valable',
        steps: [
          {
            title: 'L’essentiel',
            text: 'Selon la plupart des savants, le ghusl est valable dès que l’eau a atteint tout le corps, cheveux compris, avec l’intention de se purifier ; certaines écoles exigent en plus de se rincer la bouche et le nez, ou de frotter le corps. La description ci-dessus est la manière complète, celle du Prophète ﷺ.',
            source: 'Muslim 330',
          },
        ],
      },
    ],
    notes: [
      'Une femme qui porte des tresses n’a pas à les défaire pour le ghusl après des relations : le Prophète ﷺ a dit à Umm Salama qu’il lui suffisait de verser trois fois de l’eau sur sa tête, puis sur tout son corps (Muslim 330).',
      'Le ghusl du vendredi est recommandé avec insistance (certains savants le jugent obligatoire) : voir le guide « Le vendredi ».',
      'Sans eau, ou si l’eau ne peut pas être utilisée, le tayammum remplace le ghusl : voir le guide « Les ablutions sèches ».',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'tayammum',
    title: 'Les ablutions sèches (tayammum)',
    subtitle: 'Se purifier avec de la terre quand l’eau manque',
    intro:
      'Allah dit : « … et que vous ne trouviez pas d’eau, alors recourez à la terre pure, passez-en sur vos visages et vos mains. Allah ne veut pas vous imposer quelque gêne » (Coran 5:6). Le tayammum remplace aussi bien les ablutions que le ghusl ; le Prophète ﷺ en a montré la manière à ‘Ammār ibn Yāsir (Al-Bukhārī 338).',
    sections: [
      {
        title: 'Quand le faire ?',
        steps: [
          {
            title: 'Quand il n’y a pas d’eau',
            text: 'Lorsqu’on ne trouve pas d’eau, ou pas assez pour se purifier, après l’avoir cherchée raisonnablement, par exemple en voyage.',
            source: 'Coran 5:6, 4:43',
          },
          {
            title: 'Quand l’eau ne peut pas être utilisée',
            text: 'Lorsque l’eau risque de nuire (maladie, blessure, froid intense sans moyen de la chauffer), ou lorsqu’elle est indispensable pour boire.',
            source: 'Coran 5:6 ; Abū Dāwūd 334',
          },
          {
            title: 'Pour les petites comme pour les grandes impuretés',
            text: 'Le tayammum remplace aussi bien les ablutions que le ghusl : ‘Ammār était en état de janāba lorsque le Prophète ﷺ le lui a enseigné.',
            source: 'Al-Bukhārī 338, 348',
          },
        ],
      },
      {
        title: 'Comment faire',
        steps: [
          {
            title: 'L’intention',
            text: 'Avoir dans le cœur l’intention de se purifier par le tayammum pour pouvoir prier.',
            source: 'Al-Bukhārī 1, Muslim 1907',
          },
          {
            title: 'Frapper la terre avec les paumes',
            text: 'Frapper légèrement le sol de terre pure (ṣa‘īd ṭayyib) avec les deux paumes.',
            source: 'Al-Bukhārī 338',
          },
          {
            title: 'Souffler sur les mains',
            text: 'Souffler légèrement sur les paumes, ou les secouer, pour enlever l’excédent de poussière.',
            source: 'Al-Bukhārī 338 ; Muslim 368',
          },
          {
            title: 'Essuyer le visage',
            text: 'Passer les deux paumes sur le visage.',
            source: 'Al-Bukhārī 338',
          },
          {
            title: 'Essuyer les mains',
            text: 'Passer la paume gauche sur le dos de la main droite, puis la paume droite sur le dos de la main gauche.',
            source: 'Al-Bukhārī 338 ; Muslim 368',
          },
        ],
      },
      {
        title: 'Ce qui l’annule',
        steps: [
          {
            title: 'Ce qui annule les ablutions',
            text: 'Tout ce qui annule les ablutions annule aussi le tayammum.',
          },
          {
            title: 'Retrouver de l’eau',
            text: 'Dès que l’eau est de nouveau disponible et utilisable, on se purifie avec elle ; celui qui était en état de janāba fait alors le ghusl. « La terre pure est l’ablution du musulman, même pendant dix ans ; quand tu trouves l’eau, passe-la sur ta peau, car c’est meilleur. »',
            source: 'Abū Dāwūd 332, At-Tirmidhī 124',
          },
        ],
      },
    ],
    notes: [
      'Les écoles divergent sur le nombre de frappes et sur l’étendue de l’essuyage : une frappe pour le visage et les mains selon le hadith de ‘Ammār (avis hanbalite) ; deux frappes, les avant-bras étant essuyés jusqu’aux coudes, chez les hanafites et les shafi‘ites ; chez les malikites, la seconde frappe et les avant-bras sont recommandés.',
      'Elles divergent aussi sur ce qui peut servir au tayammum : la terre ou la poussière seulement pour les shafi‘ites et les hanbalites ; tout ce qui forme la surface du sol (sable, pierre…) pour les hanafites et les malikites.',
      'Le tayammum est une facilité accordée par Allah : on n’y recourt que lorsque l’eau manque vraiment ou ne peut pas être utilisée.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'priere',
    title: 'La prière pas à pas',
    subtitle: 'Les gestes et les paroles de la ṣalāt',
    intro:
      'Le Prophète ﷺ a dit : « Priez comme vous m’avez vu prier » (Al-Bukhārī 631). Ce guide décrit une prière de deux rak‘as (unités), puis ce qui change pour les prières de trois et quatre rak‘as. Les gestes essentiels sont communs à tous les musulmans ; certains détails varient selon les écoles juridiques, ce qui est signalé au fil du texte et dans « À savoir ».',
    sections: [
      {
        title: 'Avant de prier',
        steps: [
          {
            title: 'Être en état de pureté',
            text: 'Avoir fait ses ablutions, ou le ghusl en cas de grande impureté. Sans eau, on fait le tayammum.',
            source: 'Muslim 224 ; Coran 5:6',
          },
          {
            title: 'Un corps, des vêtements et un lieu propres',
            text: 'S’assurer qu’il n’y a pas de souillure (urine, sang…) sur soi, sur ses vêtements ni à l’endroit où l’on prie.',
            source: 'Coran 74:4',
          },
          {
            title: 'Couvrir son corps',
            text: 'Porter des vêtements couvrants : pour l’homme, au minimum du nombril aux genoux ; pour la femme, tout le corps sauf le visage et les mains, selon la majorité des savants.',
            source: 'Coran 7:31',
          },
          {
            title: 'Prier à l’heure',
            text: 'Chaque prière obligatoire a son temps ; les horaires de l’application vous l’indiquent.',
            source: 'Coran 4:103 ; Muslim 612',
          },
          {
            title: 'Se tourner vers la qibla',
            text: 'Se tourner vers la Ka‘ba, à La Mecque. La boussole de l’application peut vous aider.',
            source: 'Coran 2:144',
          },
        ],
      },
      {
        title: 'Les cinq prières obligatoires',
        steps: [
          {
            title: 'Al-Fajr (l’aube) — 2 rak‘as',
            text: 'De l’aube jusqu’au lever du soleil. L’imam récite à voix haute.',
            source: 'Muslim 612',
          },
          {
            title: 'Aḍ-Ḍuhr (midi) — 4 rak‘as',
            text: 'Dès que le soleil a passé le zénith. La récitation se fait à voix basse.',
            source: 'Muslim 612',
          },
          {
            title: 'Al-‘Aṣr (l’après-midi) — 4 rak‘as',
            text: 'Dans l’après-midi, sans la retarder jusqu’à ce que le soleil jaunisse. La récitation se fait à voix basse.',
            source: 'Muslim 612',
          },
          {
            title: 'Al-Maghrib (le coucher du soleil) — 3 rak‘as',
            text: 'Dès le coucher du soleil, jusqu’à la disparition des lueurs du crépuscule. L’imam récite à voix haute dans les deux premières rak‘as.',
            source: 'Muslim 612',
          },
          {
            title: 'Al-‘Ishā’ (la nuit) — 4 rak‘as',
            text: 'Après la disparition des lueurs du crépuscule. L’imam récite à voix haute dans les deux premières rak‘as.',
            source: 'Muslim 612',
          },
        ],
      },
      {
        title: 'La première rak‘a',
        steps: [
          {
            title: 'L’intention',
            text: 'Debout, face à la qibla, avoir dans le cœur l’intention de la prière que l’on accomplit (par exemple : les deux rak‘as du Fajr). Il n’est pas nécessaire de la prononcer.',
            source: 'Al-Bukhārī 1, Muslim 1907',
          },
          {
            title: 'Le takbīr d’ouverture',
            text: 'Lever les mains à hauteur des épaules ou des oreilles et dire « Allāhu akbar ». Ce takbīr (takbīrat al-iḥrām) fait entrer dans la prière : dès lors, on ne parle plus et on ne fait plus de gestes étrangers à la prière.',
            ar: 'اللَّهُ أَكْبَرُ',
            translit: 'Allāhu akbar.',
            fr: 'Allah est le plus grand.',
            source: 'Al-Bukhārī 757, Muslim 397 ; mains levées : Al-Bukhārī 735, Muslim 391',
          },
          {
            title: 'La position des mains',
            text: 'Les écoles divergent sur la position des mains pendant la station debout : main droite posée sur la main gauche, sur la poitrine ou plus bas selon les écoles, ou bras le long du corps selon l’avis le plus répandu dans l’école malikite.',
          },
          {
            title: 'L’invocation d’ouverture',
            text: 'À voix basse, on peut commencer par cette invocation, recommandée selon la majorité des savants ; d’autres formules authentiques existent (Al-Bukhārī 744).',
            ar: 'سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبَارَكَ اسْمُكَ، وَتَعَالَى جَدُّكَ، وَلَا إِلَهَ غَيْرُكَ',
            translit: "Subḥānaka-llāhumma wa bi-ḥamdik, wa tabāraka-smuk, wa ta'ālā jadduk, wa lā ilāha ghayruk.",
            fr: 'Gloire et pureté à Toi, ô Allah, et par Ta louange. Béni soit Ton nom, élevée soit Ta majesté, et il n’y a pas de divinité en dehors de Toi.',
            source: 'Abū Dāwūd 775, At-Tirmidhī 242 ; dite par ‘Umar : Muslim 399',
          },
          {
            title: 'Chercher refuge auprès d’Allah',
            text: 'Avant de réciter, dire à voix basse cette formule, conformément à l’ordre coranique (16:98). On commence ensuite la Fātiḥa par la basmala ; les écoles divergent sur sa récitation dans la prière (à voix haute, à voix basse ou pas du tout).',
            ar: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ',
            translit: "A'ūdhu billāhi mina-sh-shayṭāni-r-rajīm.",
            fr: 'Je cherche refuge auprès d’Allah contre Satan le banni.',
            source: 'Al-Bukhārī 6115, Muslim 2610',
          },
          {
            title: 'Réciter la Fātiḥa',
            text: 'Réciter la sourate Al-Fātiḥa. Le Prophète ﷺ a dit : « Pas de prière pour qui ne récite pas la Fātiḥa » (Al-Bukhārī 756, Muslim 394). À la fin, on dit « Āmīn » (Al-Bukhārī 780, Muslim 410).',
            ...AL_FATIHA,
            translit: "Bismi-llāhi-r-raḥmāni-r-raḥīm (1). Al-ḥamdu lillāhi rabbi-l-'ālamīn (2). Ar-raḥmāni-r-raḥīm (3). Māliki yawmi-d-dīn (4). Iyyāka na'budu wa iyyāka nasta'īn (5). Ihdina-ṣ-ṣirāṭa-l-mustaqīm (6). Ṣirāṭa-lladhīna an'amta 'alayhim, ghayri-l-maghḍūbi 'alayhim wa la-ḍ-ḍāllīn (7).",
            source: 'Coran 1:1-7',
          },
          {
            title: 'Si l’on ne connaît pas encore la Fātiḥa',
            text: 'Celui qui débute l’apprend dès que possible. En attendant, le Prophète ﷺ a enseigné à un homme qui ne parvenait pas à retenir le Coran de dire à la place :',
            ar: 'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
            translit: 'Subḥāna-llāh, wa-l-ḥamdu lillāh, wa lā ilāha illa-llāh, wa-llāhu akbar, wa lā ḥawla wa lā quwwata illā billāh.',
            fr: 'Gloire et pureté à Allah, louange à Allah, il n’y a de divinité qu’Allah, Allah est le plus grand, et il n’y a de force ni de puissance qu’en Allah.',
            source: 'Abū Dāwūd 832, An-Nasā’ī 924',
          },
          {
            title: 'Réciter une autre sourate',
            text: 'Dans les deux premières rak‘as, on récite après la Fātiḥa une sourate ou quelques versets (Al-Bukhārī 776, Muslim 451), par exemple la sourate Al-Ikhlāṣ :',
            ...AL_IKHLAS,
            translit: 'Bismi-llāhi-r-raḥmāni-r-raḥīm. Qul huwa-llāhu aḥad (1). Allāhu-ṣ-ṣamad (2). Lam yalid wa lam yūlad (3). Wa lam yakun lahu kufuwan aḥad (4).',
            source: 'Coran 112:1-4',
          },
          {
            title: 'L’inclinaison (rukū‘)',
            text: 'Dire « Allāhu akbar » et s’incliner, les mains sur les genoux et le dos bien droit, en restant immobile un instant (Al-Bukhārī 828, 757). On dit au moins une fois, et habituellement trois fois :',
            ar: 'سُبْحَانَ رَبِّيَ الْعَظِيمِ',
            translit: "Subḥāna rabbiya-l-'aẓīm.",
            fr: 'Gloire et pureté à mon Seigneur, l’Immense.',
            source: `Muslim 772 ; ${TASBIH_SOURCE_NOTE}`,
          },
          {
            title: 'Se relever de l’inclinaison',
            text: 'Se redresser en disant :',
            ar: 'سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ',
            translit: "Sami'a-llāhu li-man ḥamidah.",
            fr: 'Allah entend celui qui Le loue.',
            source: 'Al-Bukhārī 789, Muslim 772',
          },
          {
            title: 'Debout, bien droit',
            text: 'Une fois bien redressé, dire cette formule ; on peut ajouter « ḥamdan kathīran ṭayyiban mubārakan fīh » (une louange abondante, pure et bénie ; Al-Bukhārī 799). Derrière un imam, les écoles divergent sur le fait de dire aussi « Sami‘a-llāhu li-man ḥamidah ».',
            ar: 'رَبَّنَا وَلَكَ الْحَمْدُ',
            translit: 'Rabbanā wa laka-l-ḥamd.',
            fr: 'Notre Seigneur, à Toi la louange.',
            source: 'Al-Bukhārī 735, 789',
          },
          {
            title: 'La prosternation (sujūd)',
            text: 'Dire « Allāhu akbar » et se prosterner sur sept os : le front avec le nez, les deux mains, les deux genoux et le bout des pieds (Al-Bukhārī 812). C’est là que le serviteur est le plus proche de son Seigneur : on peut y multiplier les invocations (Muslim 482). On dit au moins une fois, et habituellement trois fois :',
            ar: 'سُبْحَانَ رَبِّيَ الْأَعْلَى',
            translit: "Subḥāna rabbiya-l-a'lā.",
            fr: 'Gloire et pureté à mon Seigneur, le Très-Haut.',
            source: `Muslim 772 ; ${TASBIH_SOURCE_NOTE}`,
          },
          {
            title: 'L’assise entre les deux prosternations',
            text: 'Dire « Allāhu akbar », se redresser et s’asseoir un instant, immobile, en disant :',
            ar: 'رَبِّ اغْفِرْ لِي، رَبِّ اغْفِرْ لِي',
            translit: 'Rabbi-ghfir lī, rabbi-ghfir lī.',
            fr: 'Seigneur, pardonne-moi. Seigneur, pardonne-moi.',
            source: 'Abū Dāwūd 874, An-Nasā’ī 1145, Ibn Mājah 897',
          },
          {
            title: 'La seconde prosternation',
            text: 'Dire « Allāhu akbar » et se prosterner une seconde fois comme la première, en disant de nouveau « Subḥāna rabbiya-l-a‘lā ». La première rak‘a est terminée.',
            source: 'Al-Bukhārī 757, Muslim 397',
          },
        ],
      },
      {
        title: 'La deuxième rak‘a et la fin de la prière',
        steps: [
          {
            title: 'La deuxième rak‘a',
            text: 'Se relever en disant « Allāhu akbar » et accomplir la deuxième rak‘a comme la première, sans le takbīr ni l’invocation d’ouverture : Fātiḥa, sourate, inclinaison, redressement et deux prosternations.',
            source: 'Al-Bukhārī 789, Muslim 392',
          },
          {
            title: 'Le tashahhud',
            text: 'Après les deux prosternations de la deuxième rak‘a, rester assis et réciter le tashahhud que le Prophète ﷺ a enseigné à Ibn Mas‘ūd :',
            ar: 'التَّحِيَّاتُ لِلَّهِ، وَالصَّلَوَاتُ، وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
            translit: "At-taḥiyyātu lillāhi wa-ṣ-ṣalawātu wa-ṭ-ṭayyibāt, as-salāmu 'alayka ayyuha-n-nabiyyu wa raḥmatu-llāhi wa barakātuh, as-salāmu 'alaynā wa 'alā 'ibādi-llāhi-ṣ-ṣāliḥīn, ash-hadu an lā ilāha illa-llāh, wa ash-hadu anna Muḥammadan 'abduhu wa rasūluh.",
            fr: 'Les salutations sont à Allah, ainsi que les prières et les bonnes paroles. Que la paix soit sur toi, ô Prophète, ainsi que la miséricorde d’Allah et Ses bénédictions. Que la paix soit sur nous et sur les pieux serviteurs d’Allah. J’atteste qu’il n’y a de divinité qu’Allah, et j’atteste que Muḥammad est Son serviteur et Son messager.',
            source: 'Al-Bukhārī 831, Muslim 402',
          },
          {
            title: 'Pour les prières de trois ou quatre rak‘as',
            text: 'Au Maghrib, au Ḍuhr, au ‘Aṣr et à l’‘Ishā’, on se relève après ce premier tashahhud en disant « Allāhu akbar » pour accomplir la ou les rak‘as restantes, en n’y récitant que la Fātiḥa, puis on s’assoit pour le tashahhud final.',
            source: 'Al-Bukhārī 776, 789',
          },
          {
            title: 'La prière sur le Prophète ﷺ',
            text: 'Dans le dernier tashahhud, on poursuit en priant sur le Prophète ﷺ avec la formule qu’il a lui-même enseignée :',
            ar: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
            translit: "Allāhumma ṣalli 'alā Muḥammadin wa 'alā āli Muḥammad, kamā ṣallayta 'alā Ibrāhīma wa 'alā āli Ibrāhīm, innaka ḥamīdun majīd. Allāhumma bārik 'alā Muḥammadin wa 'alā āli Muḥammad, kamā bārakta 'alā Ibrāhīma wa 'alā āli Ibrāhīm, innaka ḥamīdun majīd.",
            fr: 'Ô Allah, prie sur Muḥammad et sur la famille de Muḥammad, comme Tu as prié sur Ibrāhīm et sur la famille d’Ibrāhīm ; Tu es certes digne de louange et de gloire. Ô Allah, bénis Muḥammad et la famille de Muḥammad, comme Tu as béni Ibrāhīm et la famille d’Ibrāhīm ; Tu es certes digne de louange et de gloire.',
            source: 'Al-Bukhārī 3370',
          },
          {
            title: 'Demander protection avant le salut',
            text: 'Le Prophète ﷺ a recommandé, après le dernier tashahhud, de demander la protection d’Allah contre quatre choses ; on peut ensuite invoquer Allah pour ce que l’on souhaite (Muslim 402).',
            ar: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ جَهَنَّمَ، وَمِنْ عَذَابِ الْقَبْرِ، وَمِنْ فِتْنَةِ الْمَحْيَا وَالْمَمَاتِ، وَمِنْ شَرِّ فِتْنَةِ الْمَسِيحِ الدَّجَّالِ',
            translit: "Allāhumma innī a'ūdhu bika min 'adhābi jahannam, wa min 'adhābi-l-qabr, wa min fitnati-l-maḥyā wa-l-mamāt, wa min sharri fitnati-l-masīḥi-d-dajjāl.",
            fr: 'Ô Allah, je cherche refuge auprès de Toi contre le châtiment de l’Enfer, contre le châtiment de la tombe, contre l’épreuve de la vie et de la mort, et contre le mal de l’épreuve du faux messie (ad-Dajjāl).',
            source: 'Muslim 588',
          },
          {
            title: 'Le salut final (taslīm)',
            text: 'Tourner le visage vers la droite en disant cette formule, puis vers la gauche en la répétant. La prière est terminée.',
            ar: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ',
            translit: "As-salāmu 'alaykum wa raḥmatu-llāh.",
            fr: 'Que la paix soit sur vous, ainsi que la miséricorde d’Allah.',
            source: 'Muslim 431, 582',
          },
          {
            title: 'Après la prière',
            text: 'Il est recommandé de rester un moment pour invoquer Allah : dire trois fois « Astaghfiru-llāh », puis « Allāhumma anta-s-salām… ». La suite se trouve dans la rubrique Adhkar, « Après la prière ».',
            source: 'Muslim 591',
          },
        ],
      },
    ],
    notes: [
      'Le nombre de rak‘as de chaque prière est connu par la pratique du Prophète ﷺ, transmise sans interruption par l’ensemble des musulmans.',
      'Tous lèvent les mains au takbīr d’ouverture ; les écoles divergent sur le fait de les lever aussi avant et après l’inclinaison, et en se relevant du premier tashahhud.',
      'D’autres détails varient selon les écoles : la basmala et « Āmīn » à voix haute ou basse, la récitation de la Fātiḥa derrière l’imam, la manière de s’asseoir, le mouvement de l’index pendant le tashahhud, ou le fait de poser d’abord les genoux ou les mains en se prosternant.',
      'D’autres formules authentiques existent pour l’ouverture, l’inclinaison, la prosternation et le tashahhud (comme celui d’Ibn ‘Abbās, Muslim 403) ; chaque école a ses préférences, mais toutes ces formules authentiques sont acceptées.',
      'En cas d’oubli dans la prière (une rak‘a, le premier tashahhud…), on fait deux prosternations de l’oubli (sujūd as-sahw, Al-Bukhārī 1224) ; leurs règles s’apprennent auprès d’un enseignant.',
      'La femme prie de la même manière ; certaines écoles enseignent quelques différences de posture.',
      'La prière en groupe vaut vingt-sept fois la prière faite seul (Al-Bukhārī 645, Muslim 650), et la mosquée est le meilleur endroit pour apprendre.',
      'Pour bien apprendre, rien ne remplace l’accompagnement d’un imam ou d’un enseignant de confiance près de chez vous : priez à côté d’autres fidèles et posez vos questions sans gêne.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'prieres-surerogatoires',
    title: 'Les prières surérogatoires',
    subtitle: 'Rawātib, witr, ḍuḥā et prière de la nuit',
    intro:
      'En plus des cinq prières obligatoires, le Prophète ﷺ accomplissait des prières volontaires (nawāfil). Elles rapprochent d’Allah et, au Jour du jugement, viendront compléter ce qui manque aux prières obligatoires (Abū Dāwūd 864, At-Tirmidhī 413).',
    sections: [
      {
        title: 'Les prières régulières (rawātib)',
        steps: [
          {
            title: 'Douze rak‘as par jour',
            text: '« Celui qui prie douze rak‘as en un jour et une nuit, une maison lui est bâtie au Paradis. »',
            source: 'Muslim 728',
          },
          {
            title: 'Leur répartition',
            text: 'Quatre rak‘as avant le Ḍuhr et deux après, deux après le Maghrib, deux après l’‘Ishā’ et deux avant le Fajr. Ibn ‘Umar rapporte que le Prophète ﷺ en priait deux avant le Ḍuhr (Al-Bukhārī 1180).',
            source: 'At-Tirmidhī 415',
          },
          {
            title: 'Les deux rak‘as avant le Fajr',
            text: 'Ce sont les plus importantes : « Les deux rak‘as du Fajr valent mieux que ce bas monde et tout ce qu’il contient. »',
            source: 'Muslim 725',
          },
          {
            title: 'De préférence à la maison',
            text: '« La meilleure prière est celle que l’on accomplit chez soi, sauf la prière obligatoire. »',
            source: 'Al-Bukhārī 731',
          },
        ],
      },
      {
        title: 'Le witr',
        steps: [
          {
            title: 'Clore la nuit par une prière impaire',
            text: '« Faites de la dernière de vos prières de la nuit une prière impaire (witr). » Son temps va de la fin de la prière de l’‘Ishā’ jusqu’à l’aube.',
            source: 'Al-Bukhārī 998, Muslim 751',
          },
          {
            title: 'Le nombre de rak‘as',
            text: 'Le Prophète ﷺ a indiqué qu’une seule rak‘a suffit à rendre impaire la prière de la nuit ; on peut aussi en prier trois, cinq ou davantage. Les écoles divergent sur son statut (sunna très appuyée pour la majorité, obligatoire pour les hanafites) et sur la manière de prier trois rak‘as.',
            source: 'Al-Bukhārī 990, Muslim 749',
          },
          {
            title: 'L’invocation du qunūt',
            text: 'Dans le witr, on peut dire cette invocation enseignée par le Prophète ﷺ à son petit-fils al-Ḥasan ; les écoles divergent sur son moment et sur sa fréquence.',
            ar: 'اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ، وَعَافِنِي فِيمَنْ عَافَيْتَ، وَتَوَلَّنِي فِيمَنْ تَوَلَّيْتَ، وَبَارِكْ لِي فِيمَا أَعْطَيْتَ، وَقِنِي شَرَّ مَا قَضَيْتَ، فَإِنَّكَ تَقْضِي وَلَا يُقْضَى عَلَيْكَ، إِنَّهُ لَا يَذِلُّ مَنْ وَالَيْتَ، وَلَا يَعِزُّ مَنْ عَادَيْتَ، تَبَارَكْتَ رَبَّنَا وَتَعَالَيْتَ',
            translit: "Allāhumma-hdinī fī-man hadayt, wa 'āfinī fī-man 'āfayt, wa tawallanī fī-man tawallayt, wa bārik lī fī-mā a'ṭayt, wa qinī sharra mā qaḍayt, fa-innaka taqḍī wa lā yuqḍā 'alayk, innahu lā yadhillu man wālayt, wa lā ya'izzu man 'ādayt, tabārakta rabbanā wa ta'ālayt.",
            fr: 'Ô Allah, guide-moi parmi ceux que Tu as guidés, préserve-moi parmi ceux que Tu as préservés, prends-moi sous Ta protection parmi ceux que Tu as pris sous Ta protection, bénis pour moi ce que Tu m’as donné, et protège-moi du mal de ce que Tu as décrété. Car c’est Toi qui décrètes, et nul ne décrète contre Toi. Celui que Tu prends sous Ta protection n’est jamais humilié, et celui que Tu prends pour ennemi n’est jamais honoré. Tu es béni, notre Seigneur, et élevé.',
            source: 'Abū Dāwūd 1425, At-Tirmidhī 464',
          },
        ],
      },
      {
        title: 'La prière du ḍuḥā',
        steps: [
          {
            title: 'Une recommandation du Prophète ﷺ',
            text: 'Abū Hurayra rapporte : « Mon ami intime ﷺ m’a recommandé trois choses : jeûner trois jours chaque mois, prier les deux rak‘as du ḍuḥā et prier le witr avant de dormir. »',
            source: 'Al-Bukhārī 1981, Muslim 721',
          },
          {
            title: 'Une aumône pour chaque articulation',
            text: 'Chaque matin, une aumône est due pour chacune des articulations du corps ; chaque glorification, louange ou bonne action en est une, et deux rak‘as de ḍuḥā suffisent à s’en acquitter.',
            source: 'Muslim 720',
          },
          {
            title: 'Son moment',
            text: 'Une fois le soleil bien levé, et jusqu’un peu avant qu’il n’atteigne le zénith ; le meilleur moment est lorsque la chaleur du jour devient forte. On en prie au moins deux rak‘as.',
            source: 'Muslim 748',
          },
        ],
      },
      {
        title: 'La prière de la nuit (tahajjud)',
        steps: [
          {
            title: 'La meilleure prière après les obligatoires',
            text: '« La meilleure prière après la prière obligatoire est la prière de la nuit. » Allah dit au Prophète ﷺ : « Et de la nuit consacre une partie [avant l’aube] pour des Salât surérogatoires » (Coran 17:79).',
            source: 'Muslim 1163',
          },
          {
            title: 'Le dernier tiers de la nuit',
            text: '« Notre Seigneur, béni et exalté soit-Il, descend chaque nuit au ciel le plus proche lorsqu’il ne reste que le dernier tiers de la nuit, et dit : Qui M’invoque, que Je l’exauce ? Qui Me demande, que Je lui donne ? Qui implore Mon pardon, que Je lui pardonne ? »',
            source: 'Al-Bukhārī 1145, Muslim 758',
          },
          {
            title: 'Comment la prier',
            text: 'Par séries de deux rak‘as, en terminant par le witr. Le Prophète ﷺ ne dépassait habituellement pas onze rak‘as, qu’il faisait longues et belles.',
            source: 'Al-Bukhārī 990, 1147 ; Muslim 738',
          },
        ],
      },
    ],
    notes: [
      'Le Prophète ﷺ a interdit de prier après la prière du Fajr jusqu’à ce que le soleil se soit élevé, après celle du ‘Aṣr jusqu’à son coucher (Al-Bukhārī 586, Muslim 827), et lorsque le soleil est au zénith (Muslim 831). Les écoles divergent sur les prières liées à une raison particulière (salut de la mosquée, rattrapage d’une prière manquée…).',
      '« L’œuvre la plus aimée d’Allah est la plus régulière, même si elle est modeste » (Al-Bukhārī 6464) : mieux vaut peu de prières surérogatoires accomplies avec constance que beaucoup de temps en temps.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'jumua',
    title: 'Le vendredi (jumu‘a)',
    subtitle: 'La prière du vendredi et les sunnas du jour',
    intro:
      '« Le meilleur jour sur lequel le soleil se soit levé est le vendredi » (Muslim 854). Allah dit : « O vous qui avez cru! Quand on appelle à la Salât du jour du Vendredi, accourez à l’invocation d’Allah et laissez tout négoce » (Coran 62:9).',
    sections: [
      {
        title: 'La prière du vendredi',
        steps: [
          {
            title: 'Une obligation pour les hommes',
            text: 'La prière du vendredi est obligatoire pour tout homme musulman adulte qui n’est ni malade ni en voyage. Elle ne l’est pas pour les femmes ni pour les enfants, qui peuvent toutefois y assister.',
            source: 'Coran 62:9 ; Abū Dāwūd 1067',
          },
          {
            title: 'Deux sermons, puis deux rak‘as',
            text: 'L’imam prononce deux sermons (khuṭba), séparés par une courte assise, puis dirige une prière de deux rak‘as récitée à voix haute. Elle remplace la prière du Ḍuhr.',
            source: 'Al-Bukhārī 928',
          },
          {
            title: 'Écouter le sermon en silence',
            text: '« Si tu dis à ton voisin “Tais-toi !” le vendredi pendant que l’imam prononce le sermon, tu as commis une futilité. »',
            source: 'Al-Bukhārī 934, Muslim 851',
          },
        ],
      },
      {
        title: 'Les recommandations du jour',
        steps: [
          {
            title: 'Faire le ghusl',
            text: '« Lorsque l’un de vous se rend à la prière du vendredi, qu’il fasse le ghusl. » La majorité des savants le considèrent comme une sunna très appuyée, certains comme une obligation.',
            source: 'Al-Bukhārī 877, 879 ; Muslim 844',
          },
          {
            title: 'Se parfumer et se préparer',
            text: 'Celui qui se lave le vendredi, se purifie autant qu’il peut, se parfume, ne sépare pas deux personnes assises côte à côte, prie ce qu’Allah lui permet puis écoute l’imam en silence, ses péchés jusqu’au vendredi suivant lui sont pardonnés.',
            source: 'Al-Bukhārī 883',
          },
          {
            title: 'Arriver tôt',
            text: 'Celui qui se rend à la mosquée dès la première heure a la récompense de celui qui offre un chameau ; à la deuxième, une vache ; à la troisième, un bélier ; puis une poule, puis un œuf. Quand l’imam arrive, les anges viennent écouter le rappel.',
            source: 'Al-Bukhārī 881, Muslim 850',
          },
          {
            title: 'Lire la sourate Al-Kahf',
            text: '« Celui qui lit la sourate Al-Kahf le vendredi, une lumière l’éclairera d’un vendredi à l’autre. » Certaines versions mentionnent la nuit du vendredi.',
            source: 'Al-Ḥākim, Al-Bayhaqī ; authentifié par Al-Albānī',
          },
          {
            title: 'Multiplier la prière sur le Prophète ﷺ',
            text: '« Parmi vos meilleurs jours, il y a le vendredi… Multipliez-y la prière sur moi, car votre prière m’est présentée. » On peut utiliser la formule enseignée pour la prière (voir le guide « La prière pas à pas »).',
            source: 'Abū Dāwūd 1047, An-Nasā’ī 1374',
          },
          {
            title: 'Le moment où l’invocation est exaucée',
            text: '« Il y a ce jour-là un moment où aucun serviteur musulman, debout en prière, ne demande quelque chose à Allah sans qu’Il le lui accorde. » Selon les hadiths, ce moment se situe entre l’assise de l’imam et la fin de la prière (Muslim 853), ou dans la dernière heure après le ‘Aṣr (Abū Dāwūd 1048) ; les savants divergent sur l’avis à retenir.',
            source: 'Al-Bukhārī 935, Muslim 852',
          },
        ],
      },
    ],
    notes: [
      'Celui qui manque la prière du vendredi pour une raison valable (maladie, voyage…) prie le Ḍuhr à la place, en quatre rak‘as.',
      'Si une femme ou un voyageur assiste à la prière du vendredi, elle lui tient lieu de prière du Ḍuhr.',
      'Délaisser la prière du vendredi sans excuse est grave : le Prophète ﷺ a averti que ceux qui la délaissent s’exposent à ce qu’Allah scelle leurs cœurs (Muslim 865).',
    ],
  },
];
