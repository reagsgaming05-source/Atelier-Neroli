import type { Dhikr, DhikrCategory } from './types';

/*
 * Adhkar et invocations.
 *
 * - Textes tirés des hadiths : formulation de « Ḥiṣn al-Muslim » (Sa'īd ibn Wahf
 *   al-Qaḥṭānī), entièrement vocalisée en écriture arabe standard ; les références
 *   reprennent les notes de l'ouvrage.
 * - Textes coraniques : copiés tels quels, par script, depuis le texte uthmani Tanzil
 *   (encodage Khaled Hosny, pour la police Amiri Quran) ; traduction française de
 *   Muhammad Hamidullah, reproduite sans retouche.
 *
 * Vérification automatique : tests/adhkar.test.ts.
 */

type DhikrBody = Omit<Dhikr, 'id'>;

// ---------------------------------------------------------------------------
// Début du bloc généré par script (texte coranique) — ne pas modifier à la main.
// ---------------------------------------------------------------------------

/** Coran 2:255 (Āyat al-Kursī). */
const AYAT_AL_KURSI = {
  ar: "ٱللَّهُ لَاۤ إِلَـٰهَ إِلَّا هُوَ ٱلۡحَیُّ ٱلۡقَیُّومُۚ لَا تَأۡخُذُهُۥ سِنَةࣱ وَلَا نَوۡمࣱۚ لَّهُۥ مَا فِی ٱلسَّمَـٰوَ ٰ⁠تِ وَمَا فِی ٱلۡأَرۡضِۗ مَن ذَا ٱلَّذِی یَشۡفَعُ عِندَهُۥۤ إِلَّا بِإِذۡنِهِۦۚ یَعۡلَمُ مَا بَیۡنَ أَیۡدِیهِمۡ وَمَا خَلۡفَهُمۡۖ وَلَا یُحِیطُونَ بِشَیۡءࣲ مِّنۡ عِلۡمِهِۦۤ إِلَّا بِمَا شَاۤءَۚ وَسِعَ كُرۡسِیُّهُ ٱلسَّمَـٰوَ ٰ⁠تِ وَٱلۡأَرۡضَۖ وَلَا یَـُٔودُهُۥ حِفۡظُهُمَاۚ وَهُوَ ٱلۡعَلِیُّ ٱلۡعَظِیمُ",
  fr: "Allah! Point de divinité à part Lui, le Vivant, Celui qui subsiste par lui-même «Al-Qayyûm». Ni somnolence ni sommeil ne Le saisissent. A Lui appartient tout ce qui est dans les cieux et sur la terre. Qui peut intercéder auprès de Lui sans Sa permission? Il connaît leur passé et leur futur. Et, de Sa science, ils n'embrassent que ce qu'Il veut. Son Trône «Kursiy», déborde les cieux et la terre, dont la garde ne Lui coûte aucune peine. Et Il est le Très Haut, le Très Grand",
};

/** Coran 112:1-4 (Al-Ikhlāṣ). */
const AL_IKHLAS = {
  ar: "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ قُلۡ هُوَ ٱللَّهُ أَحَدٌ ﴿١﴾ ٱللَّهُ ٱلصَّمَدُ ﴿٢﴾ لَمۡ یَلِدۡ وَلَمۡ یُولَدۡ ﴿٣﴾ وَلَمۡ یَكُن لَّهُۥ كُفُوًا أَحَدُۢ ﴿٤﴾",
  fr: "Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux. Dis: «Il est Allah, Unique (1) Allah, Le Seul à être imploré pour ce que nous désirons (2) Il n'a jamais engendré, n'a pas été engendré non plus (3) Et nul n'est égal à Lui» (4)",
};

/** Coran 113:1-5 (Al-Falaq). */
const AL_FALAQ = {
  ar: "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ قُلۡ أَعُوذُ بِرَبِّ ٱلۡفَلَقِ ﴿١﴾ مِن شَرِّ مَا خَلَقَ ﴿٢﴾ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ﴿٣﴾ وَمِن شَرِّ ٱلنَّفَّـٰثَـٰتِ فِی ٱلۡعُقَدِ ﴿٤﴾ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ ﴿٥﴾",
  fr: "Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux. Dis: «Je cherche protection auprès du Seigneur de l'aube naissante (1) contre le mal des êtres qu'Il a créés (2) contre le mal de l'obscurité quand elle s'approfondit (3) contre le mal de celles qui soufflent [les sorcières] sur les nœuds (4) et contre le mal de l'envieux quand il envie» (5)",
};

/** Coran 114:1-6 (An-Nās). */
const AN_NAS = {
  ar: "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ قُلۡ أَعُوذُ بِرَبِّ ٱلنَّاسِ ﴿١﴾ مَلِكِ ٱلنَّاسِ ﴿٢﴾ إِلَـٰهِ ٱلنَّاسِ ﴿٣﴾ مِن شَرِّ ٱلۡوَسۡوَاسِ ٱلۡخَنَّاسِ ﴿٤﴾ ٱلَّذِی یُوَسۡوِسُ فِی صُدُورِ ٱلنَّاسِ ﴿٥﴾ مِنَ ٱلۡجِنَّةِ وَٱلنَّاسِ ﴿٦﴾",
  fr: "Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux. Dis: «Je cherche protection auprès du Seigneur des hommes (1) Le Souverain des hommes (2) Dieu des hommes (3) contre le mal du mauvais conseiller, furtif (4) qui souffle le mal dans les poitrines des hommes (5) qu'il (le conseiller) soit un djinn, ou un être humain» (6)",
};

/** Coran 2:285-286 (fin de la sourate Al-Baqara). */
const AL_BAQARA_285_286 = {
  ar: "ءَامَنَ ٱلرَّسُولُ بِمَاۤ أُنزِلَ إِلَیۡهِ مِن رَّبِّهِۦ وَٱلۡمُؤۡمِنُونَۚ كُلٌّ ءَامَنَ بِٱللَّهِ وَمَلَـٰۤىِٕكَتِهِۦ وَكُتُبِهِۦ وَرُسُلِهِۦ لَا نُفَرِّقُ بَیۡنَ أَحَدࣲ مِّن رُّسُلِهِۦۚ وَقَالُوا۟ سَمِعۡنَا وَأَطَعۡنَاۖ غُفۡرَانَكَ رَبَّنَا وَإِلَیۡكَ ٱلۡمَصِیرُ ﴿٢٨٥﴾ لَا یُكَلِّفُ ٱللَّهُ نَفۡسًا إِلَّا وُسۡعَهَاۚ لَهَا مَا كَسَبَتۡ وَعَلَیۡهَا مَا ٱكۡتَسَبَتۡۗ رَبَّنَا لَا تُؤَاخِذۡنَاۤ إِن نَّسِینَاۤ أَوۡ أَخۡطَأۡنَاۚ رَبَّنَا وَلَا تَحۡمِلۡ عَلَیۡنَاۤ إِصۡرࣰا كَمَا حَمَلۡتَهُۥ عَلَى ٱلَّذِینَ مِن قَبۡلِنَاۚ رَبَّنَا وَلَا تُحَمِّلۡنَا مَا لَا طَاقَةَ لَنَا بِهِۦۖ وَٱعۡفُ عَنَّا وَٱغۡفِرۡ لَنَا وَٱرۡحَمۡنَاۤۚ أَنتَ مَوۡلَىٰنَا فَٱنصُرۡنَا عَلَى ٱلۡقَوۡمِ ٱلۡكَـٰفِرِینَ ﴿٢٨٦﴾",
  fr: "Le Messager a cru en ce qu'on a fait descendre vers lui venant de son Seigneur, et aussi les croyants: tous ont cru en Allah, en Ses anges, à Ses livres et en Ses messagers; (en disant): «Nous ne faisons aucune distinction entre Ses messagers». Et ils ont dit: «Nous avons entendu et obéi. Seigneur, nous implorons Ton pardon. C'est à Toi que sera le retour» (285) Allah n'impose à aucune âme une charge supérieure à sa capacité. Elle sera récompensée du bien qu'elle aura fait, punie du mal qu'elle aura fait. Seigneur, ne nous châtie pas s'il nous arrive d'oublier ou de commettre une erreur. Seigneur! Ne nous charge pas d'un fardeau lourd comme Tu as chargé ceux qui vécurent avant nous. Seigneur! Ne nous impose pas ce que nous ne pouvons supporter, efface nos fautes, pardonne-nous et fais nous miséricorde. Tu es Notre Maître, accorde-nous donc la victoire sur les peuples infidèles (286)",
};

/** Coran 3:190-200 (fin de la sourate Āl 'Imrān). */
const AL_IMRAN_190_200 = {
  ar: "إِنَّ فِی خَلۡقِ ٱلسَّمَـٰوَ ٰ⁠تِ وَٱلۡأَرۡضِ وَٱخۡتِلَـٰفِ ٱلَّیۡلِ وَٱلنَّهَارِ لَـَٔایَـٰتࣲ لِّأُو۟لِی ٱلۡأَلۡبَـٰبِ ﴿١٩٠﴾ ٱلَّذِینَ یَذۡكُرُونَ ٱللَّهَ قِیَـٰمࣰا وَقُعُودࣰا وَعَلَىٰ جُنُوبِهِمۡ وَیَتَفَكَّرُونَ فِی خَلۡقِ ٱلسَّمَـٰوَ ٰ⁠تِ وَٱلۡأَرۡضِ رَبَّنَا مَا خَلَقۡتَ هَـٰذَا بَـٰطِلࣰا سُبۡحَـٰنَكَ فَقِنَا عَذَابَ ٱلنَّارِ ﴿١٩١﴾ رَبَّنَاۤ إِنَّكَ مَن تُدۡخِلِ ٱلنَّارَ فَقَدۡ أَخۡزَیۡتَهُۥۖ وَمَا لِلظَّـٰلِمِینَ مِنۡ أَنصَارࣲ ﴿١٩٢﴾ رَّبَّنَاۤ إِنَّنَا سَمِعۡنَا مُنَادِیࣰا یُنَادِی لِلۡإِیمَـٰنِ أَنۡ ءَامِنُوا۟ بِرَبِّكُمۡ فَـَٔامَنَّاۚ رَبَّنَا فَٱغۡفِرۡ لَنَا ذُنُوبَنَا وَكَفِّرۡ عَنَّا سَیِّـَٔاتِنَا وَتَوَفَّنَا مَعَ ٱلۡأَبۡرَارِ ﴿١٩٣﴾ رَبَّنَا وَءَاتِنَا مَا وَعَدتَّنَا عَلَىٰ رُسُلِكَ وَلَا تُخۡزِنَا یَوۡمَ ٱلۡقِیَـٰمَةِۖ إِنَّكَ لَا تُخۡلِفُ ٱلۡمِیعَادَ ﴿١٩٤﴾ فَٱسۡتَجَابَ لَهُمۡ رَبُّهُمۡ أَنِّی لَاۤ أُضِیعُ عَمَلَ عَـٰمِلࣲ مِّنكُم مِّن ذَكَرٍ أَوۡ أُنثَىٰۖ بَعۡضُكُم مِّنۢ بَعۡضࣲۖ فَٱلَّذِینَ هَاجَرُوا۟ وَأُخۡرِجُوا۟ مِن دِیَـٰرِهِمۡ وَأُوذُوا۟ فِی سَبِیلِی وَقَـٰتَلُوا۟ وَقُتِلُوا۟ لَأُكَفِّرَنَّ عَنۡهُمۡ سَیِّـَٔاتِهِمۡ وَلَأُدۡخِلَنَّهُمۡ جَنَّـٰتࣲ تَجۡرِی مِن تَحۡتِهَا ٱلۡأَنۡهَـٰرُ ثَوَابࣰا مِّنۡ عِندِ ٱللَّهِۚ وَٱللَّهُ عِندَهُۥ حُسۡنُ ٱلثَّوَابِ ﴿١٩٥﴾ لَا یَغُرَّنَّكَ تَقَلُّبُ ٱلَّذِینَ كَفَرُوا۟ فِی ٱلۡبِلَـٰدِ ﴿١٩٦﴾ مَتَـٰعࣱ قَلِیلࣱ ثُمَّ مَأۡوَىٰهُمۡ جَهَنَّمُۖ وَبِئۡسَ ٱلۡمِهَادُ ﴿١٩٧﴾ لَـٰكِنِ ٱلَّذِینَ ٱتَّقَوۡا۟ رَبَّهُمۡ لَهُمۡ جَنَّـٰتࣱ تَجۡرِی مِن تَحۡتِهَا ٱلۡأَنۡهَـٰرُ خَـٰلِدِینَ فِیهَا نُزُلࣰا مِّنۡ عِندِ ٱللَّهِۗ وَمَا عِندَ ٱللَّهِ خَیۡرࣱ لِّلۡأَبۡرَارِ ﴿١٩٨﴾ وَإِنَّ مِنۡ أَهۡلِ ٱلۡكِتَـٰبِ لَمَن یُؤۡمِنُ بِٱللَّهِ وَمَاۤ أُنزِلَ إِلَیۡكُمۡ وَمَاۤ أُنزِلَ إِلَیۡهِمۡ خَـٰشِعِینَ لِلَّهِ لَا یَشۡتَرُونَ بِـَٔایَـٰتِ ٱللَّهِ ثَمَنࣰا قَلِیلًاۚ أُو۟لَـٰۤىِٕكَ لَهُمۡ أَجۡرُهُمۡ عِندَ رَبِّهِمۡۗ إِنَّ ٱللَّهَ سَرِیعُ ٱلۡحِسَابِ ﴿١٩٩﴾ یَـٰۤأَیُّهَا ٱلَّذِینَ ءَامَنُوا۟ ٱصۡبِرُوا۟ وَصَابِرُوا۟ وَرَابِطُوا۟ وَٱتَّقُوا۟ ٱللَّهَ لَعَلَّكُمۡ تُفۡلِحُونَ ﴿٢٠٠﴾",
  fr: "En vérité, dans la création des cieux et de la terre, et dans l'alternance de la nuit et du jour, il y a certes des signes pour les doués d'intelligence (190) qui, debout, assis, couchés sur leurs côtés, invoquent Allah et méditent sur la création des cieux et de la terre (disant): «Notre Seigneur! Tu n'as pas créé cela en vain. Gloire à Toi! Garde-nous du châtiment du Feu (191) Seigneur! Quiconque Tu fais entrer dans le Feu, Tu le couvres vraiment d'ignominie. Et pour les injustes, il n'y a pas de secoureurs (192) Seigneur! Nous avons entendu l'appel de celui qui a appelé ainsi à la foi: «Croyez en votre Seigneur» et dès lors nous avons cru. Seigneur, pardonne-nous nos péchés, efface de nous nos méfaits, et place nous, à notre mort, avec les gens de bien (193) Seigneur! Donne-nous ce que Tu nous as promis par Tes messagers. Et ne nous couvre pas d'ignominie au Jour de la Résurrection. Car Toi, Tu ne manques pas à Ta promesse» (194) Leur Seigneur les a alors exaucés (disant): «En vérité, Je ne laisse pas perdre le bien que quiconque parmi vous a fait, homme ou femme, car vous êtes les uns des autres. Ceux donc qui ont émigré, qui ont été expulsés de leurs demeures, qui ont été persécutés dans Mon chemin, qui ont combattu, qui ont été tués, Je tiendrai certes pour expiées leurs mauvaises actions, et les ferai entrer dans les Jardins sous lesquels coulent les ruisseaux, comme récompense de la part d'Allah.» Quant à Allah, c'est auprès de Lui qu'est la plus belle récompense (195) Que ne t'abuse point la versatilité [pour la prospérité] dans le pays, de ceux qui sont infidèles (196) Piètre jouissance! Puis leur refuge sera l'Enfer. Et quelle détestable couche (197) Mais quant à ceux qui craignent leur Seigneur, ils auront des Jardins sous lesquels coulent les ruisseaux, pour y demeurer éternellement, un lieu d'accueil de la part d'Allah. Et ce qu'il y a auprès d'Allah est meilleur, pour les pieux (198) Il y a certes, parmi les gens du Livre ceux qui croient en Allah et en ce qu'on a fait descendre vers vous et en ce qu'on a fait descendre vers eux. Ils sont humbles envers Allah, et ne vendent point les versets d'Allah à vil prix. Voilà ceux dont la récompense est auprès de leur Seigneur. En vérité, Allah est prompt à faire les comptes (199) O les croyants! Soyez endurants. Incitez-vous à l'endurance. Luttez constamment (contre l'ennemi) et craignez Allah, afin que vous réussissiez (200)",
};

/** Invocations coraniques (versets entiers), dans l'ordre du Mushaf. */
const RABBANA_ITEMS: Dhikr[] = [
  {
    id: "rabbana-2-127",
    ar: "وَإِذۡ یَرۡفَعُ إِبۡرَ ٰ⁠هِـۧمُ ٱلۡقَوَاعِدَ مِنَ ٱلۡبَیۡتِ وَإِسۡمَـٰعِیلُ رَبَّنَا تَقَبَّلۡ مِنَّاۤۖ إِنَّكَ أَنتَ ٱلسَّمِیعُ ٱلۡعَلِیمُ",
    fr: "Et quand Abraham et Ismaël élevaient les assises de la Maison: «O notre Seigneur, accepte ceci de notre part! Car c'est Toi l'Audient, l'Omniscient",
    count: 1,
    source: "Coran 2:127",
  },
  {
    id: "rabbana-2-128",
    ar: "رَبَّنَا وَٱجۡعَلۡنَا مُسۡلِمَیۡنِ لَكَ وَمِن ذُرِّیَّتِنَاۤ أُمَّةࣰ مُّسۡلِمَةࣰ لَّكَ وَأَرِنَا مَنَاسِكَنَا وَتُبۡ عَلَیۡنَاۤۖ إِنَّكَ أَنتَ ٱلتَّوَّابُ ٱلرَّحِیمُ",
    fr: "Notre Seigneur! Fais de nous Tes Soumis, et de notre descendance une communauté soumise à Toi. Et montre nous nos rites et accepte de nous le repentir. Car c'est Toi certes l'Accueillant au repentir, le Miséricordieux",
    count: 1,
    source: "Coran 2:128",
  },
  {
    id: "rabbana-2-201",
    ar: "وَمِنۡهُم مَّن یَقُولُ رَبَّنَاۤ ءَاتِنَا فِی ٱلدُّنۡیَا حَسَنَةࣰ وَفِی ٱلۡـَٔاخِرَةِ حَسَنَةࣰ وَقِنَا عَذَابَ ٱلنَّارِ",
    fr: "Et il est des gens qui disent: «Seigneur! Accorde nous belle part ici-bas, et belle part aussi dans l'au-delà; et protège-nous du châtiment du Feu!»",
    count: 1,
    source: "Coran 2:201",
  },
  {
    id: "rabbana-2-250",
    ar: "وَلَمَّا بَرَزُوا۟ لِجَالُوتَ وَجُنُودِهِۦ قَالُوا۟ رَبَّنَاۤ أَفۡرِغۡ عَلَیۡنَا صَبۡرࣰا وَثَبِّتۡ أَقۡدَامَنَا وَٱنصُرۡنَا عَلَى ٱلۡقَوۡمِ ٱلۡكَـٰفِرِینَ",
    fr: "Et quand ils affrontèrent Goliath et ses troupes, ils dirent: «Seigneur! Déverse sur nous l'endurance, affermis nos pas et donne-nous la victoire sur ce peuple infidèle»",
    count: 1,
    source: "Coran 2:250",
  },
  {
    id: "rabbana-2-286",
    ar: "لَا یُكَلِّفُ ٱللَّهُ نَفۡسًا إِلَّا وُسۡعَهَاۚ لَهَا مَا كَسَبَتۡ وَعَلَیۡهَا مَا ٱكۡتَسَبَتۡۗ رَبَّنَا لَا تُؤَاخِذۡنَاۤ إِن نَّسِینَاۤ أَوۡ أَخۡطَأۡنَاۚ رَبَّنَا وَلَا تَحۡمِلۡ عَلَیۡنَاۤ إِصۡرࣰا كَمَا حَمَلۡتَهُۥ عَلَى ٱلَّذِینَ مِن قَبۡلِنَاۚ رَبَّنَا وَلَا تُحَمِّلۡنَا مَا لَا طَاقَةَ لَنَا بِهِۦۖ وَٱعۡفُ عَنَّا وَٱغۡفِرۡ لَنَا وَٱرۡحَمۡنَاۤۚ أَنتَ مَوۡلَىٰنَا فَٱنصُرۡنَا عَلَى ٱلۡقَوۡمِ ٱلۡكَـٰفِرِینَ",
    fr: "Allah n'impose à aucune âme une charge supérieure à sa capacité. Elle sera récompensée du bien qu'elle aura fait, punie du mal qu'elle aura fait. Seigneur, ne nous châtie pas s'il nous arrive d'oublier ou de commettre une erreur. Seigneur! Ne nous charge pas d'un fardeau lourd comme Tu as chargé ceux qui vécurent avant nous. Seigneur! Ne nous impose pas ce que nous ne pouvons supporter, efface nos fautes, pardonne-nous et fais nous miséricorde. Tu es Notre Maître, accorde-nous donc la victoire sur les peuples infidèles",
    count: 1,
    source: "Coran 2:286",
  },
  {
    id: "rabbana-3-8",
    ar: "رَبَّنَا لَا تُزِغۡ قُلُوبَنَا بَعۡدَ إِذۡ هَدَیۡتَنَا وَهَبۡ لَنَا مِن لَّدُنكَ رَحۡمَةًۚ إِنَّكَ أَنتَ ٱلۡوَهَّابُ",
    fr: "«Seigneur! Ne laisse pas dévier nos cœurs après que Tu nous aies guidés; et accorde-nous Ta miséricorde. C'est Toi, certes, le Grand Donateur",
    count: 1,
    source: "Coran 3:8",
  },
  {
    id: "rabbana-3-9",
    ar: "رَبَّنَاۤ إِنَّكَ جَامِعُ ٱلنَّاسِ لِیَوۡمࣲ لَّا رَیۡبَ فِیهِۚ إِنَّ ٱللَّهَ لَا یُخۡلِفُ ٱلۡمِیعَادَ",
    fr: "Seigneur! C'est Toi qui rassembleras les gens, un jour - en quoi il n'y a point de doute - Allah, vraiment, ne manque jamais à Sa promesse.»",
    count: 1,
    source: "Coran 3:9",
  },
  {
    id: "rabbana-3-16",
    ar: "ٱلَّذِینَ یَقُولُونَ رَبَّنَاۤ إِنَّنَاۤ ءَامَنَّا فَٱغۡفِرۡ لَنَا ذُنُوبَنَا وَقِنَا عَذَابَ ٱلنَّارِ",
    fr: "qui disent: «O notre Seigneur, nous avons la foi; pardonne-nous donc nos péchés, et protège-nous du châtiment du Feu»",
    count: 1,
    source: "Coran 3:16",
  },
  {
    id: "rabbana-3-38",
    ar: "هُنَالِكَ دَعَا زَكَرِیَّا رَبَّهُۥۖ قَالَ رَبِّ هَبۡ لِی مِن لَّدُنكَ ذُرِّیَّةࣰ طَیِّبَةًۖ إِنَّكَ سَمِیعُ ٱلدُّعَاۤءِ",
    fr: "Alors, Zacharie pria son Seigneur, et dit: «O mon Seigneur, donne-moi, venant de Toi, une excellente descendance. Car Tu es Celui qui entend bien la prière»",
    count: 1,
    source: "Coran 3:38",
  },
  {
    id: "rabbana-3-53",
    ar: "رَبَّنَاۤ ءَامَنَّا بِمَاۤ أَنزَلۡتَ وَٱتَّبَعۡنَا ٱلرَّسُولَ فَٱكۡتُبۡنَا مَعَ ٱلشَّـٰهِدِینَ",
    fr: "Seigneur! Nous avons cru à ce que Tu as fait descendre et suivi le messager. Inscris-nous donc parmi ceux qui témoignent»",
    count: 1,
    source: "Coran 3:53",
  },
  {
    id: "rabbana-3-147",
    ar: "وَمَا كَانَ قَوۡلَهُمۡ إِلَّاۤ أَن قَالُوا۟ رَبَّنَا ٱغۡفِرۡ لَنَا ذُنُوبَنَا وَإِسۡرَافَنَا فِیۤ أَمۡرِنَا وَثَبِّتۡ أَقۡدَامَنَا وَٱنصُرۡنَا عَلَى ٱلۡقَوۡمِ ٱلۡكَـٰفِرِینَ",
    fr: "Et ils n'eurent que cette parole: «Seigneur, pardonne-nous nos péchés ainsi que nos excès dans nos comportements, affermis nos pas et donne-nous la victoire sur les gens mécréants»",
    count: 1,
    source: "Coran 3:147",
  },
  {
    id: "rabbana-3-193",
    ar: "رَّبَّنَاۤ إِنَّنَا سَمِعۡنَا مُنَادِیࣰا یُنَادِی لِلۡإِیمَـٰنِ أَنۡ ءَامِنُوا۟ بِرَبِّكُمۡ فَـَٔامَنَّاۚ رَبَّنَا فَٱغۡفِرۡ لَنَا ذُنُوبَنَا وَكَفِّرۡ عَنَّا سَیِّـَٔاتِنَا وَتَوَفَّنَا مَعَ ٱلۡأَبۡرَارِ",
    fr: "Seigneur! Nous avons entendu l'appel de celui qui a appelé ainsi à la foi: «Croyez en votre Seigneur» et dès lors nous avons cru. Seigneur, pardonne-nous nos péchés, efface de nous nos méfaits, et place nous, à notre mort, avec les gens de bien",
    count: 1,
    source: "Coran 3:193",
  },
  {
    id: "rabbana-3-194",
    ar: "رَبَّنَا وَءَاتِنَا مَا وَعَدتَّنَا عَلَىٰ رُسُلِكَ وَلَا تُخۡزِنَا یَوۡمَ ٱلۡقِیَـٰمَةِۖ إِنَّكَ لَا تُخۡلِفُ ٱلۡمِیعَادَ",
    fr: "Seigneur! Donne-nous ce que Tu nous as promis par Tes messagers. Et ne nous couvre pas d'ignominie au Jour de la Résurrection. Car Toi, Tu ne manques pas à Ta promesse»",
    count: 1,
    source: "Coran 3:194",
  },
  {
    id: "rabbana-7-23",
    ar: "قَالَا رَبَّنَا ظَلَمۡنَاۤ أَنفُسَنَا وَإِن لَّمۡ تَغۡفِرۡ لَنَا وَتَرۡحَمۡنَا لَنَكُونَنَّ مِنَ ٱلۡخَـٰسِرِینَ",
    fr: "Tous deux dirent: «O notre Seigneur, nous avons fait du tort à nous-mêmes. Et si Tu ne nous pardonnes pas et ne nous fais pas miséricorde, nous serons très certainement du nombre des perdants»",
    count: 1,
    source: "Coran 7:23",
  },
  {
    id: "rabbana-7-126",
    ar: "وَمَا تَنقِمُ مِنَّاۤ إِلَّاۤ أَنۡ ءَامَنَّا بِـَٔایَـٰتِ رَبِّنَا لَمَّا جَاۤءَتۡنَاۚ رَبَّنَاۤ أَفۡرِغۡ عَلَیۡنَا صَبۡرࣰا وَتَوَفَّنَا مُسۡلِمِینَ",
    fr: "Tu ne te venges de nous que parce que nous avons cru aux preuves de notre Seigneur, lorsqu'elles nous sont venues. O notre Seigneur! Déverse sur nous l'endurance et fais nous mourir entièrement soumis.»",
    count: 1,
    source: "Coran 7:126",
  },
  {
    id: "rabbana-10-85",
    ar: "فَقَالُوا۟ عَلَى ٱللَّهِ تَوَكَّلۡنَا رَبَّنَا لَا تَجۡعَلۡنَا فِتۡنَةࣰ لِّلۡقَوۡمِ ٱلظَّـٰلِمِینَ",
    fr: "Ils dirent: «En Allah nous plaçons notre confiance. O notre Seigneur, ne fais pas de nous une cible pour les persécutions des injustes",
    count: 1,
    source: "Coran 10:85",
  },
  {
    id: "rabbana-10-86",
    ar: "وَنَجِّنَا بِرَحۡمَتِكَ مِنَ ٱلۡقَوۡمِ ٱلۡكَـٰفِرِینَ",
    fr: "Et délivre-nous, par Ta miséricorde, des gens mécréants»",
    count: 1,
    source: "Coran 10:86",
  },
  {
    id: "rabbana-14-40",
    ar: "رَبِّ ٱجۡعَلۡنِی مُقِیمَ ٱلصَّلَوٰةِ وَمِن ذُرِّیَّتِیۚ رَبَّنَا وَتَقَبَّلۡ دُعَاۤءِ",
    fr: "O mon Seigneur! Fais que j'accomplisse assidûment la Salât ainsi qu'une partie de ma descendance; exauce ma prière, ô notre Seigneur",
    count: 1,
    source: "Coran 14:40",
  },
  {
    id: "rabbana-14-41",
    ar: "رَبَّنَا ٱغۡفِرۡ لِی وَلِوَ ٰ⁠لِدَیَّ وَلِلۡمُؤۡمِنِینَ یَوۡمَ یَقُومُ ٱلۡحِسَابُ",
    fr: "O notre Seigneur! pardonne-moi, ainsi qu'à mes père et mère et aux croyants, le jour de la reddition des comptes»",
    count: 1,
    source: "Coran 14:41",
  },
  {
    id: "rabbana-17-24",
    ar: "وَٱخۡفِضۡ لَهُمَا جَنَاحَ ٱلذُّلِّ مِنَ ٱلرَّحۡمَةِ وَقُل رَّبِّ ٱرۡحَمۡهُمَا كَمَا رَبَّیَانِی صَغِیرࣰا",
    fr: "et par miséricorde, abaisse pour eux l'aile de l'humilité, et dis: «O mon Seigneur, fais-leur, à tous deux, miséricorde comme ils m'ont élevé tout petit»",
    count: 1,
    source: "Coran 17:24",
  },
  {
    id: "rabbana-18-10",
    ar: "إِذۡ أَوَى ٱلۡفِتۡیَةُ إِلَى ٱلۡكَهۡفِ فَقَالُوا۟ رَبَّنَاۤ ءَاتِنَا مِن لَّدُنكَ رَحۡمَةࣰ وَهَیِّئۡ لَنَا مِنۡ أَمۡرِنَا رَشَدࣰا",
    fr: "Quand les jeunes gens se furent réfugiés dans la caverne, ils dirent: «O notre Seigneur, donne-nous de Ta part une miséricorde; et assure nous la droiture dans tout ce qui nous concerne»",
    count: 1,
    source: "Coran 18:10",
  },
  {
    id: "rabbana-20-114",
    ar: "فَتَعَـٰلَى ٱللَّهُ ٱلۡمَلِكُ ٱلۡحَقُّۗ وَلَا تَعۡجَلۡ بِٱلۡقُرۡءَانِ مِن قَبۡلِ أَن یُقۡضَىٰۤ إِلَیۡكَ وَحۡیُهُۥۖ وَقُل رَّبِّ زِدۡنِی عِلۡمࣰا",
    fr: "Que soit éxalté Allah, le Vrai Souverain! Ne te hâte pas [de réciter] le Coran avant que ne te soit achevée sa révélation. Et dis: «O mon Seigneur, accroît mes connaissances!»",
    count: 1,
    source: "Coran 20:114",
  },
  {
    id: "rabbana-21-87",
    ar: "وَذَا ٱلنُّونِ إِذ ذَّهَبَ مُغَـٰضِبࣰا فَظَنَّ أَن لَّن نَّقۡدِرَ عَلَیۡهِ فَنَادَىٰ فِی ٱلظُّلُمَـٰتِ أَن لَّاۤ إِلَـٰهَ إِلَّاۤ أَنتَ سُبۡحَـٰنَكَ إِنِّی كُنتُ مِنَ ٱلظَّـٰلِمِینَ",
    fr: "Et Dû'n-Nûn (Jonas) quand il partit, irrité. Il pensa que Nous N'allions pas l'éprouver. Puis il fit, dans les ténèbres, l'appel que voici: «Pas de divinité à part Toi! Pureté à Toi! J'ai été vraiment du nombre des injustes»",
    count: 1,
    source: "Coran 21:87",
  },
  {
    id: "rabbana-21-89",
    ar: "وَزَكَرِیَّاۤ إِذۡ نَادَىٰ رَبَّهُۥ رَبِّ لَا تَذَرۡنِی فَرۡدࣰا وَأَنتَ خَیۡرُ ٱلۡوَ ٰ⁠رِثِینَ",
    fr: "Et Zacharie, quand il implora son Seigneur: «Ne me laisse pas seul, Seigneur, alors que Tu es le meilleur des héritiers»",
    count: 1,
    source: "Coran 21:89",
  },
  {
    id: "rabbana-23-97",
    ar: "وَقُل رَّبِّ أَعُوذُ بِكَ مِنۡ هَمَزَ ٰ⁠تِ ٱلشَّیَـٰطِینِ",
    fr: "Et dis: «Seigneur, je cherche Ta protection, contre les incitations des diables",
    count: 1,
    source: "Coran 23:97",
  },
  {
    id: "rabbana-23-98",
    ar: "وَأَعُوذُ بِكَ رَبِّ أَن یَحۡضُرُونِ",
    fr: "et je cherche Ta protection, Seigneur, contre leur présence auprès de moi»",
    count: 1,
    source: "Coran 23:98",
  },
  {
    id: "rabbana-23-109",
    ar: "إِنَّهُۥ كَانَ فَرِیقࣱ مِّنۡ عِبَادِی یَقُولُونَ رَبَّنَاۤ ءَامَنَّا فَٱغۡفِرۡ لَنَا وَٱرۡحَمۡنَا وَأَنتَ خَیۡرُ ٱلرَّ ٰ⁠حِمِینَ",
    fr: "Il y eut un groupe de Mes serviteurs qui dirent: «Seigneur, nous croyons; pardonne-nous donc et fais-nous miséricorde, car Tu es le meilleur des Miséricordieux»",
    count: 1,
    source: "Coran 23:109",
  },
  {
    id: "rabbana-23-118",
    ar: "وَقُل رَّبِّ ٱغۡفِرۡ وَٱرۡحَمۡ وَأَنتَ خَیۡرُ ٱلرَّ ٰ⁠حِمِینَ",
    fr: "Et dis: «Seigneur, pardonne et fais miséricorde. C'est Toi le Meilleur des miséricordieux»",
    count: 1,
    source: "Coran 23:118",
  },
  {
    id: "rabbana-25-65",
    ar: "وَٱلَّذِینَ یَقُولُونَ رَبَّنَا ٱصۡرِفۡ عَنَّا عَذَابَ جَهَنَّمَۖ إِنَّ عَذَابَهَا كَانَ غَرَامًا",
    fr: "qui disent: «Seigneur, écarte de nous le châtiment de l'Enfer». - car son châtiment est permanent",
    count: 1,
    source: "Coran 25:65",
  },
  {
    id: "rabbana-25-74",
    ar: "وَٱلَّذِینَ یَقُولُونَ رَبَّنَا هَبۡ لَنَا مِنۡ أَزۡوَ ٰ⁠جِنَا وَذُرِّیَّـٰتِنَا قُرَّةَ أَعۡیُنࣲ وَٱجۡعَلۡنَا لِلۡمُتَّقِینَ إِمَامًا",
    fr: "et qui disent: «Seigneur, donne-nous, en nos épouses et nos descendants, la joie des yeux, et fais de nous un guide pour les pieux»",
    count: 1,
    source: "Coran 25:74",
  },
  {
    id: "rabbana-26-83",
    ar: "رَبِّ هَبۡ لِی حُكۡمࣰا وَأَلۡحِقۡنِی بِٱلصَّـٰلِحِینَ",
    fr: "Seigneur, accorde-moi sagesse (et savoir) et fais-moi rejoindre les gens de bien",
    count: 1,
    source: "Coran 26:83",
  },
  {
    id: "rabbana-27-19",
    ar: "فَتَبَسَّمَ ضَاحِكࣰا مِّن قَوۡلِهَا وَقَالَ رَبِّ أَوۡزِعۡنِیۤ أَنۡ أَشۡكُرَ نِعۡمَتَكَ ٱلَّتِیۤ أَنۡعَمۡتَ عَلَیَّ وَعَلَىٰ وَ ٰ⁠لِدَیَّ وَأَنۡ أَعۡمَلَ صَـٰلِحࣰا تَرۡضَىٰهُ وَأَدۡخِلۡنِی بِرَحۡمَتِكَ فِی عِبَادِكَ ٱلصَّـٰلِحِینَ",
    fr: "Il sourit, amusé par ses propos et dit: «Permets-moi Seigneur, de rendre grâce pour le bienfait dont Tu m'as comblé ainsi que mes père et mère, et que je fasse une bonne œuvre que tu agrées et fais-moi entrer, par Ta miséricorde, parmi Tes serviteurs vertueux»",
    count: 1,
    source: "Coran 27:19",
  },
  {
    id: "rabbana-28-24",
    ar: "فَسَقَىٰ لَهُمَا ثُمَّ تَوَلَّىٰۤ إِلَى ٱلظِّلِّ فَقَالَ رَبِّ إِنِّی لِمَاۤ أَنزَلۡتَ إِلَیَّ مِنۡ خَیۡرࣲ فَقِیرࣱ",
    fr: "Il abreuva [les bêtes] pour elles puis retourna à l'ombre et dit: «Seigneur, j'ai grand besoin du bien que tu feras descendre vers moi»",
    count: 1,
    source: "Coran 28:24",
  },
  {
    id: "rabbana-46-15",
    ar: "وَوَصَّیۡنَا ٱلۡإِنسَـٰنَ بِوَ ٰ⁠لِدَیۡهِ إِحۡسَـٰنًاۖ حَمَلَتۡهُ أُمُّهُۥ كُرۡهࣰا وَوَضَعَتۡهُ كُرۡهࣰاۖ وَحَمۡلُهُۥ وَفِصَـٰلُهُۥ ثَلَـٰثُونَ شَهۡرًاۚ حَتَّىٰۤ إِذَا بَلَغَ أَشُدَّهُۥ وَبَلَغَ أَرۡبَعِینَ سَنَةࣰ قَالَ رَبِّ أَوۡزِعۡنِیۤ أَنۡ أَشۡكُرَ نِعۡمَتَكَ ٱلَّتِیۤ أَنۡعَمۡتَ عَلَیَّ وَعَلَىٰ وَ ٰ⁠لِدَیَّ وَأَنۡ أَعۡمَلَ صَـٰلِحࣰا تَرۡضَىٰهُ وَأَصۡلِحۡ لِی فِی ذُرِّیَّتِیۤۖ إِنِّی تُبۡتُ إِلَیۡكَ وَإِنِّی مِنَ ٱلۡمُسۡلِمِینَ",
    fr: "Et Nous avons enjoint à l'homme de la bonté envers ses père et mère: sa mère l'a péniblement porté et en a péniblement accouché; et sa gestation et sevrage durent trente mois; puis quand il atteint ses pleines forces et atteint quarante ans, il dit: «O Seigneur! Inspire-moi pour que je rende grâce au bienfait dont Tu m'as comblé ainsi qu'à mes père et mère, et pour que je fasse une bonne œuvre que Tu agrées. Et fais que ma postérité soit de moralité saine. Je me repens à Toi et je suis du nombre des Soumis»",
    count: 1,
    source: "Coran 46:15",
  },
  {
    id: "rabbana-59-10",
    ar: "وَٱلَّذِینَ جَاۤءُو مِنۢ بَعۡدِهِمۡ یَقُولُونَ رَبَّنَا ٱغۡفِرۡ لَنَا وَلِإِخۡوَ ٰ⁠نِنَا ٱلَّذِینَ سَبَقُونَا بِٱلۡإِیمَـٰنِ وَلَا تَجۡعَلۡ فِی قُلُوبِنَا غِلࣰّا لِّلَّذِینَ ءَامَنُوا۟ رَبَّنَاۤ إِنَّكَ رَءُوفࣱ رَّحِیمٌ",
    fr: "Et [il appartient également] à ceux qui sont venus après eux en disant: «Seigneur, pardonne-nous, ainsi qu'à nos frères qui nous ont précédés dans la foi; et ne mets dans nos cœurs aucune rancœur pour ceux qui ont cru. Seigneur, Tu es Compatissant et Très Miséricordieux»",
    count: 1,
    source: "Coran 59:10",
  },
  {
    id: "rabbana-60-4",
    ar: "قَدۡ كَانَتۡ لَكُمۡ أُسۡوَةٌ حَسَنَةࣱ فِیۤ إِبۡرَ ٰ⁠هِیمَ وَٱلَّذِینَ مَعَهُۥۤ إِذۡ قَالُوا۟ لِقَوۡمِهِمۡ إِنَّا بُرَءَ ٰۤ⁠ ؤُا۟ مِنكُمۡ وَمِمَّا تَعۡبُدُونَ مِن دُونِ ٱللَّهِ كَفَرۡنَا بِكُمۡ وَبَدَا بَیۡنَنَا وَبَیۡنَكُمُ ٱلۡعَدَ ٰ⁠وَةُ وَٱلۡبَغۡضَاۤءُ أَبَدًا حَتَّىٰ تُؤۡمِنُوا۟ بِٱللَّهِ وَحۡدَهُۥۤ إِلَّا قَوۡلَ إِبۡرَ ٰ⁠هِیمَ لِأَبِیهِ لَأَسۡتَغۡفِرَنَّ لَكَ وَمَاۤ أَمۡلِكُ لَكَ مِنَ ٱللَّهِ مِن شَیۡءࣲۖ رَّبَّنَا عَلَیۡكَ تَوَكَّلۡنَا وَإِلَیۡكَ أَنَبۡنَا وَإِلَیۡكَ ٱلۡمَصِیرُ",
    fr: "Certes, vous avez eu un bel exemple [à suivre] en Abraham et en ceux qui étaient avec lui, quand ils dirent à leur peuple: «Nous vous désavouons, vous et ce que vous adorez en dehors d'Allah. Nous vous renions. Entre vous et nous, l'inimitié et la haine sont à jamais déclarées jusqu'à ce que vous croyiez en Allah, seul». Exception faite de la parole d'Abraham [adressée] à son père: «J'implorerai certes, le pardon [d'Allah] en ta faveur bien que je ne puisse rien pour toi auprès d'Allah». «Seigneur, c'est en Toi que nous mettons notre confiance et à Toi nous revenons [repentants]. Et vers Toi est le Devenir",
    count: 1,
    source: "Coran 60:4",
  },
  {
    id: "rabbana-60-5",
    ar: "رَبَّنَا لَا تَجۡعَلۡنَا فِتۡنَةࣰ لِّلَّذِینَ كَفَرُوا۟ وَٱغۡفِرۡ لَنَا رَبَّنَاۤۖ إِنَّكَ أَنتَ ٱلۡعَزِیزُ ٱلۡحَكِیمُ",
    fr: "Seigneur, ne fais pas de nous [un sujet] de tentation pour ceux qui ont mécru; et pardonne-nous, Seigneur, car c'est Toi le Puissant, le Sage»",
    count: 1,
    source: "Coran 60:5",
  },
  {
    id: "rabbana-66-8",
    ar: "یَـٰۤأَیُّهَا ٱلَّذِینَ ءَامَنُوا۟ تُوبُوۤا۟ إِلَى ٱللَّهِ تَوۡبَةࣰ نَّصُوحًا عَسَىٰ رَبُّكُمۡ أَن یُكَفِّرَ عَنكُمۡ سَیِّـَٔاتِكُمۡ وَیُدۡخِلَكُمۡ جَنَّـٰتࣲ تَجۡرِی مِن تَحۡتِهَا ٱلۡأَنۡهَـٰرُ یَوۡمَ لَا یُخۡزِی ٱللَّهُ ٱلنَّبِیَّ وَٱلَّذِینَ ءَامَنُوا۟ مَعَهُۥۖ نُورُهُمۡ یَسۡعَىٰ بَیۡنَ أَیۡدِیهِمۡ وَبِأَیۡمَـٰنِهِمۡ یَقُولُونَ رَبَّنَاۤ أَتۡمِمۡ لَنَا نُورَنَا وَٱغۡفِرۡ لَنَاۤۖ إِنَّكَ عَلَىٰ كُلِّ شَیۡءࣲ قَدِیرࣱ",
    fr: "O vous qui avez cru! Repentez-vous à Allah d'un repentir sincère. Il se peut que votre Seigneur vous efface vos fautes et qu'Il vous fasse entrer dans des Jardins sous lesquels coulent les ruisseaux, le jour où Allah épargnera l'ignominie au Prophète et à ceux qui croient avec lui. Leur lumière courra devant eux et à leur droite; ils diront: «Seigneur, parfais-nous notre lumière et pardonne-nous. Car Tu es Omnipotent»",
    count: 1,
    source: "Coran 66:8",
  },
  {
    id: "rabbana-71-28",
    ar: "رَّبِّ ٱغۡفِرۡ لِی وَلِوَ ٰ⁠لِدَیَّ وَلِمَن دَخَلَ بَیۡتِیَ مُؤۡمِنࣰا وَلِلۡمُؤۡمِنِینَ وَٱلۡمُؤۡمِنَـٰتِۖ وَلَا تَزِدِ ٱلظَّـٰلِمِینَ إِلَّا تَبَارَۢا",
    fr: "Seigneur! Pardonne-moi, et à mes père et mère et à celui qui entre dans ma demeure croyant, ainsi qu'aux croyants et croyantes; et ne fais croître les injustes qu'en perdition»",
    count: 1,
    source: "Coran 71:28",
  },
];

// ---------------------------------------------------------------------------
// Fin du bloc généré.
// ---------------------------------------------------------------------------

const KURSI_NOTE = "Commencer par : A'ūdhu billāhi mina-sh-shayṭāni-r-rajīm";

const MUAWWIDHAT_VIRTUE =
  "Réciter Al-Ikhlāṣ, Al-Falaq et An-Nās trois fois le matin et trois fois le soir suffit contre toute chose (Abū Dāwūd 5082, At-Tirmidhī 3575).";

// --- Textes communs au matin et au soir --------------------------------------

const SAYYID_AL_ISTIGHFAR: DhikrBody = {
  ar: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي، فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
  translit:
    "Allāhumma anta rabbī lā ilāha illā ant, khalaqtanī wa ana 'abduk, wa ana 'alā 'ahdika wa wa'dika ma-staṭa't, a'ūdhu bika min sharri mā ṣana't, abū'u laka bi-ni'matika 'alayy, wa abū'u bi-dhanbī, fa-ghfir lī, fa-innahu lā yaghfiru-dh-dhunūba illā ant.",
  fr: "Ô Allah, Tu es mon Seigneur, il n'y a de divinité que Toi. Tu m'as créé et je suis Ton serviteur. Je reste fidèle à Ton pacte et à Ta promesse autant que je le peux. Je cherche refuge auprès de Toi contre le mal que j'ai commis. Je reconnais Ton bienfait envers moi et je reconnais mon péché ; pardonne-moi donc, car nul ne pardonne les péchés en dehors de Toi.",
  count: 1,
  source: "Al-Bukhārī 6306",
  note: "Sayyid al-istighfār : la meilleure des demandes de pardon",
  virtue:
    "Celui qui la dit le soir avec certitude et meurt pendant la nuit entre au Paradis ; de même s'il la dit le matin.",
};

const AFINI: DhikrBody = {
  ar: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ. اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ، وَالْفَقْرِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ",
  translit:
    "Allāhumma 'āfinī fī badanī, Allāhumma 'āfinī fī sam'ī, Allāhumma 'āfinī fī baṣarī, lā ilāha illā ant. Allāhumma innī a'ūdhu bika mina-l-kufri wa-l-faqr, Allāhumma innī a'ūdhu bika min 'adhābi-l-qabr, lā ilāha illā ant.",
  fr: "Ô Allah, préserve la santé de mon corps. Ô Allah, préserve mon ouïe. Ô Allah, préserve ma vue. Il n'y a de divinité que Toi. Ô Allah, je cherche refuge auprès de Toi contre la mécréance et la pauvreté. Ô Allah, je cherche refuge auprès de Toi contre le châtiment de la tombe. Il n'y a de divinité que Toi.",
  count: 3,
  source: "Abū Dāwūd 5090",
};

const HASBIYALLAH: DhikrBody = {
  ar: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ، وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
  translit: "Ḥasbiya-llāhu lā ilāha illā huwa, 'alayhi tawakkaltu, wa huwa rabbu-l-'arshi-l-'aẓīm.",
  fr: "Allah me suffit, il n'y a de divinité que Lui. En Lui je place ma confiance, et Il est le Seigneur du Trône immense.",
  count: 7,
  source: "Ibn as-Sunnī 71, Abū Dāwūd 5081 (mawqūf)",
  virtue:
    "Celui qui la dit sept fois le matin et le soir, Allah lui suffit pour tout ce qui le préoccupe de ce monde et de l'au-delà.",
};

const AL_AFWA: DhikrBody = {
  ar: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي، وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ، وَمِنْ خَلْفِي، وَعَنْ يَمِينِي، وَعَنْ شِمَالِي، وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي",
  translit:
    "Allāhumma innī as'aluka-l-'afwa wa-l-'āfiyata fi-d-dunyā wa-l-ākhirah. Allāhumma innī as'aluka-l-'afwa wa-l-'āfiyata fī dīnī wa dunyāya wa ahlī wa mālī. Allāhumma-stur 'awrātī, wa āmin raw'ātī. Allāhumma-ḥfaẓnī min bayni yadayya, wa min khalfī, wa 'an yamīnī, wa 'an shimālī, wa min fawqī, wa a'ūdhu bi-'aẓamatika an ughtāla min taḥtī.",
  fr: "Ô Allah, je Te demande le pardon et la préservation dans ce monde et dans l'au-delà. Ô Allah, je Te demande le pardon et la préservation dans ma religion, ma vie d'ici-bas, ma famille et mes biens. Ô Allah, couvre mes défauts et apaise mes craintes. Ô Allah, protège-moi par-devant, par-derrière, à ma droite, à ma gauche et par-dessus, et je cherche refuge auprès de Ta grandeur contre le fait d'être pris par surprise par-dessous.",
  count: 1,
  source: "Abū Dāwūd 5074, Ibn Mājah 3871",
};

const ALIM_AL_GHAYB: DhikrBody = {
  ar: "اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ، فَاطِرَ السَّمَوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي، وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَى نَفْسِي سُوءًا، أَوْ أَجُرَّهُ إِلَى مُسْلِمٍ",
  translit:
    "Allāhumma 'ālima-l-ghaybi wa-sh-shahādah, fāṭira-s-samāwāti wa-l-arḍ, rabba kulli shay'in wa malīkah, ash-hadu an lā ilāha illā ant, a'ūdhu bika min sharri nafsī, wa min sharri-sh-shayṭāni wa shirkih, wa an aqtarifa 'alā nafsī sū'an, aw ajurrahu ilā muslim.",
  fr: "Ô Allah, Connaisseur de l'invisible et du visible, Créateur des cieux et de la terre, Seigneur et Souverain de toute chose, j'atteste qu'il n'y a de divinité que Toi. Je cherche refuge auprès de Toi contre le mal de mon âme, contre le mal de Satan et son incitation à l'associationnisme, et contre le fait de commettre un mal contre moi-même ou de l'attirer sur un musulman.",
  count: 1,
  source: "At-Tirmidhī 3392, Abū Dāwūd 5067",
};

const BISMILLAH_LA_YADURR: DhikrBody = {
  ar: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ، وَهُوَ السَّمِيعُ الْعَلِيمُ",
  translit: "Bismi-llāhi-lladhī lā yaḍurru ma'a-smihi shay'un fi-l-arḍi wa lā fi-s-samā', wa huwa-s-samī'u-l-'alīm.",
  fr: "Au nom d'Allah, avec le nom duquel rien ne peut nuire, ni sur la terre ni dans le ciel, et Il est l'Audient, l'Omniscient.",
  count: 3,
  source: "Abū Dāwūd 5088, At-Tirmidhī 3388",
  virtue: "Celui qui la dit trois fois le matin et trois fois le soir, rien ne lui nuira.",
};

const RADITU: DhikrBody = {
  ar: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا",
  translit: "Raḍītu billāhi rabbā, wa bi-l-islāmi dīnā, wa bi-Muḥammadin ṣalla-llāhu 'alayhi wa sallama nabiyyā.",
  fr: "Je suis satisfait d'Allah comme Seigneur, de l'islam comme religion et de Muḥammad ﷺ comme prophète.",
  count: 3,
  source: "Abū Dāwūd 5072, At-Tirmidhī 3389",
  virtue:
    "Celui qui la dit trois fois le matin et trois fois le soir, Allah S'est engagé à le satisfaire le Jour de la Résurrection.",
};

const YA_HAYYU: DhikrBody = {
  ar: "يَا حَيُّ يَا قَيُّومُ، بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ",
  translit: "Yā Ḥayyu yā Qayyūm, bi-raḥmatika astaghīth, aṣliḥ lī sha'nī kullah, wa lā takilnī ilā nafsī ṭarfata 'ayn.",
  fr: "Ô Vivant, ô Toi qui subsistes par Toi-même, c'est Ta miséricorde que j'implore : améliore toutes mes affaires et ne me confie pas à moi-même, ne serait-ce que le temps d'un clin d'œil.",
  count: 1,
  source: "Al-Ḥākim 1/545",
};

const SUBHANALLAH_100: DhikrBody = {
  ar: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
  translit: "Subḥāna-llāhi wa bi-ḥamdih.",
  fr: "Gloire et pureté à Allah, et par Sa louange.",
  count: 100,
  source: "Muslim 2692",
  virtue:
    "Celui qui la dit cent fois le matin et le soir, nul n'apportera le Jour de la Résurrection mieux que ce qu'il apporte, sauf celui qui en aura dit autant ou davantage.",
};

const TAHLIL_TEXT = {
  ar: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
  translit: "Lā ilāha illa-llāhu waḥdahu lā sharīka lah, lahu-l-mulku wa lahu-l-ḥamd, wa huwa 'alā kulli shay'in qadīr.",
  fr: "Il n'y a de divinité qu'Allah, Seul, sans associé. À Lui la royauté, à Lui la louange, et Il est capable de toute chose.",
};

const TAHLIL_10: DhikrBody = {
  ...TAHLIL_TEXT,
  count: 10,
  source: "An-Nasā'ī ('Amal al-yawm wa-l-layla 24), Abū Dāwūd 5077",
  note: "Dix fois, ou une seule fois en cas de lassitude",
  virtue:
    "Celui qui la dit dix fois est comme celui qui a affranchi quatre âmes parmi les descendants d'Ismā'īl (Muslim 2693).",
};

const ISTIGHFAR_100: DhikrBody = {
  ar: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
  translit: "Astaghfiru-llāha wa atūbu ilayh.",
  fr: "Je demande pardon à Allah et je me repens à Lui.",
  count: 100,
  source: "Al-Bukhārī 6307, Muslim 2702",
  note: "Cent fois dans la journée",
};

const SALAT_ALA_NABI: DhikrBody = {
  ar: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ",
  translit: "Allāhumma ṣalli wa sallim 'alā nabiyyinā Muḥammad.",
  fr: "Ô Allah, prie sur notre prophète Muḥammad et accorde-lui la paix.",
  count: 10,
  source: "Aṭ-Ṭabarānī (Majma' az-zawā'id 10/120)",
  virtue:
    "« Celui qui prie sur moi dix fois le matin et dix fois le soir, mon intercession l'atteindra le Jour de la Résurrection. »",
};

const ILMAN_NAFIAN = {
  ar: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا",
  translit: "Allāhumma innī as'aluka 'ilman nāfi'an, wa rizqan ṭayyiban, wa 'amalan mutaqabbalā.",
  fr: "Ô Allah, je Te demande une science utile, une subsistance bonne et licite, et des œuvres agréées.",
  count: 1,
  source: "Ibn Mājah 925",
};

// --- Catégories ----------------------------------------------------------------

export const ADHKAR: DhikrCategory[] = [
  {
    id: "matin",
    title: "Adhkar du matin",
    titleAr: "أذكار الصباح",
    subtitle: "À réciter le matin, après la prière du Fajr",
    items: [
      {
        id: "matin-ayat-al-kursi",
        ar: AYAT_AL_KURSI.ar,
        fr: AYAT_AL_KURSI.fr,
        count: 1,
        source: "Coran 2:255",
        note: KURSI_NOTE,
        virtue:
          "Celui qui la récite le matin est protégé des djinns jusqu'au soir, et celui qui la récite le soir l'est jusqu'au matin (Al-Ḥākim 1/562).",
      },
      { id: "matin-al-ikhlas", ar: AL_IKHLAS.ar, fr: AL_IKHLAS.fr, count: 3, source: "Coran 112:1-4", virtue: MUAWWIDHAT_VIRTUE },
      { id: "matin-al-falaq", ar: AL_FALAQ.ar, fr: AL_FALAQ.fr, count: 3, source: "Coran 113:1-5" },
      { id: "matin-an-nas", ar: AN_NAS.ar, fr: AN_NAS.fr, count: 3, source: "Coran 114:1-6" },
      {
        id: "matin-asbahna",
        ar: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ",
        translit:
          "Aṣbaḥnā wa aṣbaḥa-l-mulku lillāh, wa-l-ḥamdu lillāh, lā ilāha illa-llāhu waḥdahu lā sharīka lah, lahu-l-mulku wa lahu-l-ḥamdu wa huwa 'alā kulli shay'in qadīr. Rabbi as'aluka khayra mā fī hādha-l-yawmi wa khayra mā ba'dah, wa a'ūdhu bika min sharri mā fī hādha-l-yawmi wa sharri mā ba'dah. Rabbi a'ūdhu bika mina-l-kasali wa sū'i-l-kibar. Rabbi a'ūdhu bika min 'adhābin fi-n-nāri wa 'adhābin fi-l-qabr.",
        fr: "Nous voici au matin, et au matin la royauté appartient à Allah. Louange à Allah. Il n'y a de divinité qu'Allah, Seul, sans associé. À Lui la royauté, à Lui la louange, et Il est capable de toute chose. Seigneur, je Te demande le bien de ce jour et le bien de ce qui le suit, et je cherche refuge auprès de Toi contre le mal de ce jour et le mal de ce qui le suit. Seigneur, je cherche refuge auprès de Toi contre la paresse et les maux de la vieillesse. Seigneur, je cherche refuge auprès de Toi contre un châtiment dans le Feu et un châtiment dans la tombe.",
        count: 1,
        source: "Muslim 2723",
      },
      {
        id: "matin-bika-asbahna",
        ar: "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ",
        translit: "Allāhumma bika aṣbaḥnā, wa bika amsaynā, wa bika naḥyā, wa bika namūtu, wa ilayka-n-nushūr.",
        fr: "Ô Allah, c'est par Toi que nous atteignons le matin et par Toi que nous atteignons le soir, par Toi que nous vivons et par Toi que nous mourons, et vers Toi est la résurrection.",
        count: 1,
        source: "At-Tirmidhī 3391, Abū Dāwūd 5068",
      },
      {
        ...SAYYID_AL_ISTIGHFAR,
        id: "matin-sayyid-al-istighfar",
        virtue:
          "Celui qui la dit le matin avec certitude et meurt dans la journée entre au Paradis ; de même s'il la dit le soir et meurt pendant la nuit.",
      },
      {
        id: "matin-ushhiduka",
        ar: "اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ",
        translit:
          "Allāhumma innī aṣbaḥtu ush-hiduk, wa ush-hidu ḥamalata 'arshik, wa malā'ikatak, wa jamī'a khalqik, annaka anta-llāhu lā ilāha illā anta waḥdaka lā sharīka lak, wa anna Muḥammadan 'abduka wa rasūluk.",
        fr: "Ô Allah, en ce matin je Te prends à témoin, et je prends à témoin les porteurs de Ton Trône, Tes anges et toute Ta création, que Tu es Allah, il n'y a de divinité que Toi, Seul, sans associé, et que Muḥammad est Ton serviteur et Ton Messager.",
        count: 4,
        source: "Abū Dāwūd 5069",
        virtue: "Celui qui la dit quatre fois le matin et le soir, Allah l'affranchit du Feu.",
      },
      {
        id: "matin-ma-asbaha-bi",
        ar: "اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ",
        translit:
          "Allāhumma mā aṣbaḥa bī min ni'matin aw bi-aḥadin min khalqika fa-minka waḥdaka lā sharīka lak, fa-laka-l-ḥamdu wa laka-sh-shukr.",
        fr: "Ô Allah, tout bienfait dont je jouis en ce matin, ou dont jouit l'une de Tes créatures, vient de Toi Seul, sans associé. À Toi donc la louange et à Toi la gratitude.",
        count: 1,
        source: "Abū Dāwūd 5073",
        virtue:
          "Celui qui la dit le matin s'acquitte de la gratitude due pour sa journée, et celui qui la dit le soir, de celle due pour sa nuit.",
      },
      { ...AFINI, id: "matin-afini" },
      { ...HASBIYALLAH, id: "matin-hasbiyallah" },
      { ...AL_AFWA, id: "matin-al-afwa" },
      { ...ALIM_AL_GHAYB, id: "matin-alim-al-ghayb" },
      { ...BISMILLAH_LA_YADURR, id: "matin-bismillah" },
      { ...RADITU, id: "matin-raditu" },
      { ...YA_HAYYU, id: "matin-ya-hayyu" },
      {
        id: "matin-khayra-hadha-al-yawm",
        ar: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ رَبِّ الْعَالَمِينَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا الْيَوْمِ: فَتْحَهُ، وَنَصْرَهُ، وَنُورَهُ، وَبَرَكَتَهُ، وَهُدَاهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهِ وَشَرِّ مَا بَعْدَهُ",
        translit:
          "Aṣbaḥnā wa aṣbaḥa-l-mulku lillāhi rabbi-l-'ālamīn. Allāhumma innī as'aluka khayra hādha-l-yawm : fatḥahu, wa naṣrahu, wa nūrahu, wa barakatahu, wa hudāh, wa a'ūdhu bika min sharri mā fīhi wa sharri mā ba'dah.",
        fr: "Nous voici au matin, et au matin la royauté appartient à Allah, Seigneur des mondes. Ô Allah, je Te demande le bien de ce jour : son ouverture, son secours, sa lumière, sa bénédiction et sa guidance ; et je cherche refuge auprès de Toi contre le mal qu'il renferme et le mal de ce qui le suit.",
        count: 1,
        source: "Abū Dāwūd 5084",
      },
      {
        id: "matin-fitrat-al-islam",
        ar: "أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ، حَنِيفًا مُسْلِمًا، وَمَا كَانَ مِنَ الْمُشْرِكِينَ",
        translit:
          "Aṣbaḥnā 'alā fiṭrati-l-islām, wa 'alā kalimati-l-ikhlāṣ, wa 'alā dīni nabiyyinā Muḥammadin ṣalla-llāhu 'alayhi wa sallam, wa 'alā millati abīnā Ibrāhīm, ḥanīfan musliman, wa mā kāna mina-l-mushrikīn.",
        fr: "Nous voici au matin sur la saine nature de l'islam, sur la parole du monothéisme pur, sur la religion de notre prophète Muḥammad ﷺ et sur la voie de notre père Ibrāhīm, croyant sincère et soumis, qui n'était pas du nombre des associateurs.",
        count: 1,
        source: "Aḥmad 3/406, Ibn as-Sunnī 34",
      },
      { ...SUBHANALLAH_100, id: "matin-subhanallah-100" },
      { ...TAHLIL_10, id: "matin-tahlil-10" },
      {
        ...TAHLIL_TEXT,
        id: "matin-tahlil-100",
        count: 100,
        source: "Al-Bukhārī 3293, Muslim 2691",
        note: "Cent fois, le matin",
        virtue:
          "Celui qui la dit cent fois dans la journée obtient l'équivalent de l'affranchissement de dix esclaves ; cent bonnes actions lui sont inscrites et cent mauvaises effacées ; elle le protège de Satan ce jour-là jusqu'au soir, et nul n'apporte mieux que lui, sauf celui qui en a fait davantage.",
      },
      {
        id: "matin-adada-khalqihi",
        ar: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ",
        translit: "Subḥāna-llāhi wa bi-ḥamdih, 'adada khalqih, wa riḍā nafsih, wa zinata 'arshih, wa midāda kalimātih.",
        fr: "Gloire et pureté à Allah, et par Sa louange, autant que le nombre de Ses créatures, autant qu'il Lui plaît, autant que le poids de Son Trône et autant que l'encre de Ses paroles.",
        count: 3,
        source: "Muslim 2726",
        note: "Le matin",
      },
      { ...ILMAN_NAFIAN, id: "matin-ilman-nafian", note: "Le matin" },
      { ...ISTIGHFAR_100, id: "matin-istighfar-100" },
      { ...SALAT_ALA_NABI, id: "matin-salat-ala-nabi" },
    ],
  },
  {
    id: "soir",
    title: "Adhkar du soir",
    titleAr: "أذكار المساء",
    subtitle: "À réciter le soir, après la prière du 'Aṣr",
    items: [
      {
        id: "soir-ayat-al-kursi",
        ar: AYAT_AL_KURSI.ar,
        fr: AYAT_AL_KURSI.fr,
        count: 1,
        source: "Coran 2:255",
        note: KURSI_NOTE,
        virtue:
          "Celui qui la récite le soir est protégé des djinns jusqu'au matin, et celui qui la récite le matin l'est jusqu'au soir (Al-Ḥākim 1/562).",
      },
      { id: "soir-al-ikhlas", ar: AL_IKHLAS.ar, fr: AL_IKHLAS.fr, count: 3, source: "Coran 112:1-4", virtue: MUAWWIDHAT_VIRTUE },
      { id: "soir-al-falaq", ar: AL_FALAQ.ar, fr: AL_FALAQ.fr, count: 3, source: "Coran 113:1-5" },
      { id: "soir-an-nas", ar: AN_NAS.ar, fr: AN_NAS.fr, count: 3, source: "Coran 114:1-6" },
      {
        id: "soir-amsayna",
        ar: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ",
        translit:
          "Amsaynā wa amsa-l-mulku lillāh, wa-l-ḥamdu lillāh, lā ilāha illa-llāhu waḥdahu lā sharīka lah, lahu-l-mulku wa lahu-l-ḥamdu wa huwa 'alā kulli shay'in qadīr. Rabbi as'aluka khayra mā fī hādhihi-l-laylati wa khayra mā ba'dahā, wa a'ūdhu bika min sharri mā fī hādhihi-l-laylati wa sharri mā ba'dahā. Rabbi a'ūdhu bika mina-l-kasali wa sū'i-l-kibar. Rabbi a'ūdhu bika min 'adhābin fi-n-nāri wa 'adhābin fi-l-qabr.",
        fr: "Nous voici au soir, et au soir la royauté appartient à Allah. Louange à Allah. Il n'y a de divinité qu'Allah, Seul, sans associé. À Lui la royauté, à Lui la louange, et Il est capable de toute chose. Seigneur, je Te demande le bien de cette nuit et le bien de ce qui la suit, et je cherche refuge auprès de Toi contre le mal de cette nuit et le mal de ce qui la suit. Seigneur, je cherche refuge auprès de Toi contre la paresse et les maux de la vieillesse. Seigneur, je cherche refuge auprès de Toi contre un châtiment dans le Feu et un châtiment dans la tombe.",
        count: 1,
        source: "Muslim 2723",
      },
      {
        id: "soir-bika-amsayna",
        ar: "اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ",
        translit: "Allāhumma bika amsaynā, wa bika aṣbaḥnā, wa bika naḥyā, wa bika namūtu, wa ilayka-l-maṣīr.",
        fr: "Ô Allah, c'est par Toi que nous atteignons le soir et par Toi que nous atteignons le matin, par Toi que nous vivons et par Toi que nous mourons, et vers Toi est le retour.",
        count: 1,
        source: "At-Tirmidhī 3391, Abū Dāwūd 5068",
      },
      { ...SAYYID_AL_ISTIGHFAR, id: "soir-sayyid-al-istighfar" },
      {
        id: "soir-ushhiduka",
        ar: "اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ",
        translit:
          "Allāhumma innī amsaytu ush-hiduk, wa ush-hidu ḥamalata 'arshik, wa malā'ikatak, wa jamī'a khalqik, annaka anta-llāhu lā ilāha illā anta waḥdaka lā sharīka lak, wa anna Muḥammadan 'abduka wa rasūluk.",
        fr: "Ô Allah, en ce soir je Te prends à témoin, et je prends à témoin les porteurs de Ton Trône, Tes anges et toute Ta création, que Tu es Allah, il n'y a de divinité que Toi, Seul, sans associé, et que Muḥammad est Ton serviteur et Ton Messager.",
        count: 4,
        source: "Abū Dāwūd 5069",
        virtue: "Celui qui la dit quatre fois le matin et le soir, Allah l'affranchit du Feu.",
      },
      {
        id: "soir-ma-amsa-bi",
        ar: "اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ",
        translit:
          "Allāhumma mā amsā bī min ni'matin aw bi-aḥadin min khalqika fa-minka waḥdaka lā sharīka lak, fa-laka-l-ḥamdu wa laka-sh-shukr.",
        fr: "Ô Allah, tout bienfait dont je jouis en ce soir, ou dont jouit l'une de Tes créatures, vient de Toi Seul, sans associé. À Toi donc la louange et à Toi la gratitude.",
        count: 1,
        source: "Abū Dāwūd 5073",
        virtue:
          "Celui qui la dit le soir s'acquitte de la gratitude due pour sa nuit, et celui qui la dit le matin, de celle due pour sa journée.",
      },
      { ...AFINI, id: "soir-afini" },
      { ...HASBIYALLAH, id: "soir-hasbiyallah" },
      { ...AL_AFWA, id: "soir-al-afwa" },
      { ...ALIM_AL_GHAYB, id: "soir-alim-al-ghayb" },
      { ...BISMILLAH_LA_YADURR, id: "soir-bismillah" },
      { ...RADITU, id: "soir-raditu" },
      { ...YA_HAYYU, id: "soir-ya-hayyu" },
      {
        id: "soir-khayra-hadhihi-al-layla",
        ar: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ رَبِّ الْعَالَمِينَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذِهِ اللَّيْلَةِ: فَتْحَهَا، وَنَصْرَهَا، وَنُورَهَا، وَبَرَكَتَهَا، وَهُدَاهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهَا وَشَرِّ مَا بَعْدَهَا",
        translit:
          "Amsaynā wa amsa-l-mulku lillāhi rabbi-l-'ālamīn. Allāhumma innī as'aluka khayra hādhihi-l-laylah : fatḥahā, wa naṣrahā, wa nūrahā, wa barakatahā, wa hudāhā, wa a'ūdhu bika min sharri mā fīhā wa sharri mā ba'dahā.",
        fr: "Nous voici au soir, et au soir la royauté appartient à Allah, Seigneur des mondes. Ô Allah, je Te demande le bien de cette nuit : son ouverture, son secours, sa lumière, sa bénédiction et sa guidance ; et je cherche refuge auprès de Toi contre le mal qu'elle renferme et le mal de ce qui la suit.",
        count: 1,
        source: "Abū Dāwūd 5084",
      },
      {
        id: "soir-fitrat-al-islam",
        ar: "أَمْسَيْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ، حَنِيفًا مُسْلِمًا، وَمَا كَانَ مِنَ الْمُشْرِكِينَ",
        translit:
          "Amsaynā 'alā fiṭrati-l-islām, wa 'alā kalimati-l-ikhlāṣ, wa 'alā dīni nabiyyinā Muḥammadin ṣalla-llāhu 'alayhi wa sallam, wa 'alā millati abīnā Ibrāhīm, ḥanīfan musliman, wa mā kāna mina-l-mushrikīn.",
        fr: "Nous voici au soir sur la saine nature de l'islam, sur la parole du monothéisme pur, sur la religion de notre prophète Muḥammad ﷺ et sur la voie de notre père Ibrāhīm, croyant sincère et soumis, qui n'était pas du nombre des associateurs.",
        count: 1,
        source: "Aḥmad 3/406, Ibn as-Sunnī 34",
      },
      { ...SUBHANALLAH_100, id: "soir-subhanallah-100" },
      { ...TAHLIL_10, id: "soir-tahlil-10" },
      { ...ISTIGHFAR_100, id: "soir-istighfar-100" },
      {
        id: "soir-kalimat-tammat",
        ar: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
        translit: "A'ūdhu bi-kalimāti-llāhi-t-tāmmāti min sharri mā khalaq.",
        fr: "Je cherche refuge auprès des paroles parfaites d'Allah contre le mal de ce qu'Il a créé.",
        count: 3,
        source: "Aḥmad 2/290, An-Nasā'ī ('Amal al-yawm wa-l-layla 590)",
        note: "Le soir",
        virtue: "Celui qui la dit trois fois le soir, aucune piqûre venimeuse ne lui nuira cette nuit-là.",
      },
      { ...SALAT_ALA_NABI, id: "soir-salat-ala-nabi" },
    ],
  },
  {
    id: "apres-priere",
    title: "Après la prière",
    titleAr: "أذكار الصلاة",
    subtitle: "Après le salut final de chaque prière obligatoire",
    items: [
      {
        id: "priere-istighfar",
        ar: "أَسْتَغْفِرُ اللَّهَ",
        translit: "Astaghfiru-llāh.",
        fr: "Je demande pardon à Allah.",
        count: 3,
        source: "Muslim 591",
      },
      {
        id: "priere-anta-as-salam",
        ar: "اللَّهُمَّ أَنْتَ السَّلَامُ، وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
        translit: "Allāhumma anta-s-salāmu wa minka-s-salām, tabārakta yā dha-l-jalāli wa-l-ikrām.",
        fr: "Ô Allah, Tu es la Paix et de Toi vient la paix. Béni sois-Tu, ô Détenteur de la majesté et de la générosité.",
        count: 1,
        source: "Muslim 591",
      },
      {
        id: "priere-la-mania",
        ar: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ",
        translit:
          "Lā ilāha illa-llāhu waḥdahu lā sharīka lah, lahu-l-mulku wa lahu-l-ḥamdu wa huwa 'alā kulli shay'in qadīr. Allāhumma lā māni'a limā a'ṭayt, wa lā mu'ṭiya limā mana't, wa lā yanfa'u dha-l-jaddi minka-l-jadd.",
        fr: "Il n'y a de divinité qu'Allah, Seul, sans associé. À Lui la royauté, à Lui la louange, et Il est capable de toute chose. Ô Allah, nul ne peut retenir ce que Tu donnes, nul ne peut donner ce que Tu retiens, et la richesse du riche ne lui sert à rien auprès de Toi.",
        count: 1,
        source: "Al-Bukhārī 844, Muslim 593",
      },
      {
        id: "priere-la-nabudu-illa-iyyah",
        ar: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ، لَا إِلَهَ إِلَّا اللَّهُ، وَلَا نَعْبُدُ إِلَّا إِيَّاهُ، لَهُ النِّعْمَةُ وَلَهُ الْفَضْلُ، وَلَهُ الثَّنَاءُ الْحَسَنُ، لَا إِلَهَ إِلَّا اللَّهُ مُخْلِصِينَ لَهُ الدِّينَ وَلَوْ كَرِهَ الْكَافِرُونَ",
        translit:
          "Lā ilāha illa-llāhu waḥdahu lā sharīka lah, lahu-l-mulku wa lahu-l-ḥamdu wa huwa 'alā kulli shay'in qadīr. Lā ḥawla wa lā quwwata illā billāh. Lā ilāha illa-llāh, wa lā na'budu illā iyyāh, lahu-n-ni'matu wa lahu-l-faḍl, wa lahu-th-thanā'u-l-ḥasan. Lā ilāha illa-llāhu mukhliṣīna lahu-d-dīna wa law kariha-l-kāfirūn.",
        fr: "Il n'y a de divinité qu'Allah, Seul, sans associé. À Lui la royauté, à Lui la louange, et Il est capable de toute chose. Il n'y a de force ni de puissance qu'en Allah. Il n'y a de divinité qu'Allah, et nous n'adorons que Lui. À Lui le bienfait, à Lui la grâce et à Lui la belle louange. Il n'y a de divinité qu'Allah ; nous Lui vouons un culte exclusif, dussent les mécréants le détester.",
        count: 1,
        source: "Muslim 594",
      },
      {
        id: "priere-subhanallah-33",
        ar: "سُبْحَانَ اللَّهِ",
        translit: "Subḥāna-llāh.",
        fr: "Gloire et pureté à Allah.",
        count: 33,
        source: "Muslim 597",
      },
      {
        id: "priere-alhamdulillah-33",
        ar: "الْحَمْدُ لِلَّهِ",
        translit: "Al-ḥamdu lillāh.",
        fr: "Louange à Allah.",
        count: 33,
        source: "Muslim 597",
      },
      {
        id: "priere-allahu-akbar-33",
        ar: "اللَّهُ أَكْبَرُ",
        translit: "Allāhu akbar.",
        fr: "Allah est le plus grand.",
        count: 33,
        source: "Muslim 597",
      },
      {
        ...TAHLIL_TEXT,
        id: "priere-tahlil-100",
        count: 1,
        source: "Muslim 597",
        note: "Pour compléter la centaine",
        virtue:
          "Celui qui dit cela à la fin de chaque prière, ses fautes lui sont pardonnées, fussent-elles aussi abondantes que l'écume de la mer.",
      },
      {
        id: "priere-al-ikhlas",
        ar: AL_IKHLAS.ar,
        fr: AL_IKHLAS.fr,
        count: 1,
        source: "Coran 112:1-4",
        note: "Une fois après chaque prière ; trois fois après le Fajr et le Maghrib (Abū Dāwūd 1523)",
      },
      {
        id: "priere-al-falaq",
        ar: AL_FALAQ.ar,
        fr: AL_FALAQ.fr,
        count: 1,
        source: "Coran 113:1-5",
        note: "Une fois après chaque prière ; trois fois après le Fajr et le Maghrib",
      },
      {
        id: "priere-an-nas",
        ar: AN_NAS.ar,
        fr: AN_NAS.fr,
        count: 1,
        source: "Coran 114:1-6",
        note: "Une fois après chaque prière ; trois fois après le Fajr et le Maghrib",
      },
      {
        id: "priere-ayat-al-kursi",
        ar: AYAT_AL_KURSI.ar,
        fr: AYAT_AL_KURSI.fr,
        count: 1,
        source: "Coran 2:255",
        note: KURSI_NOTE,
        virtue:
          "Rien ne sépare celui qui la récite après chaque prière de l'entrée au Paradis, si ce n'est la mort (An-Nasā'ī, 'Amal al-yawm wa-l-layla 100).",
      },
      {
        id: "priere-yuhyi-wa-yumit",
        ar: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، يُحْيِي وَيُمِيتُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
        translit: "Lā ilāha illa-llāhu waḥdahu lā sharīka lah, lahu-l-mulku wa lahu-l-ḥamd, yuḥyī wa yumīt, wa huwa 'alā kulli shay'in qadīr.",
        fr: "Il n'y a de divinité qu'Allah, Seul, sans associé. À Lui la royauté, à Lui la louange ; Il donne la vie et la mort, et Il est capable de toute chose.",
        count: 10,
        source: "At-Tirmidhī 3474",
        note: "Après les prières du Maghrib et du Fajr",
      },
      { ...ILMAN_NAFIAN, id: "priere-ilman-nafian", note: "Après le salut de la prière du Fajr" },
    ],
  },
  {
    id: "sommeil",
    title: "Avant de dormir",
    titleAr: "أذكار النوم",
    subtitle: "Au moment de se mettre au lit",
    items: [
      {
        id: "sommeil-al-ikhlas",
        ar: AL_IKHLAS.ar,
        fr: AL_IKHLAS.fr,
        count: 3,
        source: "Coran 112:1-4",
        note: "Joindre les paumes, souffler dedans et réciter les trois sourates, puis passer les mains sur tout le corps possible, en commençant par la tête, le visage et le devant du corps. Le faire trois fois (Al-Bukhārī 5017).",
      },
      { id: "sommeil-al-falaq", ar: AL_FALAQ.ar, fr: AL_FALAQ.fr, count: 3, source: "Coran 113:1-5" },
      { id: "sommeil-an-nas", ar: AN_NAS.ar, fr: AN_NAS.fr, count: 3, source: "Coran 114:1-6" },
      {
        id: "sommeil-ayat-al-kursi",
        ar: AYAT_AL_KURSI.ar,
        fr: AYAT_AL_KURSI.fr,
        count: 1,
        source: "Coran 2:255",
        note: KURSI_NOTE,
        virtue:
          "Celui qui la récite en se mettant au lit reste sous la garde d'Allah, et aucun diable ne l'approche jusqu'au matin (Al-Bukhārī 2311).",
      },
      {
        id: "sommeil-fin-al-baqara",
        ar: AL_BAQARA_285_286.ar,
        fr: AL_BAQARA_285_286.fr,
        count: 1,
        source: "Coran 2:285-286",
        virtue: "Celui qui récite ces deux versets pendant la nuit, ils lui suffisent (Al-Bukhārī 5009, Muslim 807).",
      },
      {
        id: "sommeil-bismika-rabbi",
        ar: "بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، إِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ",
        translit:
          "Bismika rabbī waḍa'tu janbī, wa bika arfa'uh, in amsakta nafsī fa-rḥamhā, wa in arsaltahā fa-ḥfaẓhā bimā taḥfaẓu bihi 'ibādaka-ṣ-ṣāliḥīn.",
        fr: "C'est en Ton nom, mon Seigneur, que je pose mon flanc, et c'est par Toi que je le relève. Si Tu retiens mon âme, fais-lui miséricorde ; et si Tu la renvoies, protège-la par ce qui Te sert à protéger Tes serviteurs vertueux.",
        count: 1,
        source: "Al-Bukhārī 6320, Muslim 2714",
        note: "Épousseter d'abord sa couche trois fois avec le pan de son vêtement, en mentionnant le nom d'Allah",
      },
      {
        id: "sommeil-qini-adhabak",
        ar: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ",
        translit: "Allāhumma qinī 'adhābaka yawma tab'athu 'ibādak.",
        fr: "Ô Allah, préserve-moi de Ton châtiment le jour où Tu ressusciteras Tes serviteurs.",
        count: 3,
        source: "Abū Dāwūd 5045",
        note: "En posant la main droite sous la joue",
      },
      {
        id: "sommeil-bismika-amutu",
        ar: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
        translit: "Bismika-llāhumma amūtu wa aḥyā.",
        fr: "C'est en Ton nom, ô Allah, que je meurs et que je vis.",
        count: 1,
        source: "Al-Bukhārī 6312",
      },
      {
        id: "sommeil-subhanallah-33",
        ar: "سُبْحَانَ اللَّهِ",
        translit: "Subḥāna-llāh.",
        fr: "Gloire et pureté à Allah.",
        count: 33,
        source: "Al-Bukhārī 3705, Muslim 2727",
        virtue: "Le Prophète ﷺ a dit à 'Alī et Fāṭima : « Cela vaut mieux pour vous qu'un serviteur. »",
      },
      {
        id: "sommeil-alhamdulillah-33",
        ar: "الْحَمْدُ لِلَّهِ",
        translit: "Al-ḥamdu lillāh.",
        fr: "Louange à Allah.",
        count: 33,
        source: "Al-Bukhārī 3705, Muslim 2727",
      },
      {
        id: "sommeil-allahu-akbar-34",
        ar: "اللَّهُ أَكْبَرُ",
        translit: "Allāhu akbar.",
        fr: "Allah est le plus grand.",
        count: 34,
        source: "Al-Bukhārī 3705, Muslim 2727",
      },
      {
        id: "sommeil-aslamtu-nafsi",
        ar: "اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ، وَأَلْجَأْتُ ظَهْرِي إِلَيْكَ، رَهْبَةً وَرَغْبَةً إِلَيْكَ، لَا مَلْجَأَ وَلَا مَنْجَا مِنْكَ إِلَّا إِلَيْكَ، آمَنْتُ بِكِتَابِكَ الَّذِي أَنْزَلْتَ، وَبِنَبِيِّكَ الَّذِي أَرْسَلْتَ",
        translit:
          "Allāhumma aslamtu nafsī ilayk, wa fawwaḍtu amrī ilayk, wa alja'tu ẓahrī ilayk, rahbatan wa raghbatan ilayk, lā malja'a wa lā manjā minka illā ilayk, āmantu bi-kitābika-lladhī anzalt, wa bi-nabiyyika-lladhī arsalt.",
        fr: "Ô Allah, je T'ai soumis mon âme, je T'ai remis mon affaire et je me suis adossé à Toi, par crainte et par désir de Toi. Il n'y a de refuge ni de salut contre Toi qu'auprès de Toi. J'ai cru en Ton Livre que Tu as révélé et en Ton Prophète que Tu as envoyé.",
        count: 1,
        source: "Al-Bukhārī 6311, Muslim 2710",
        note: "Après avoir fait ses ablutions, se coucher sur le côté droit ; en faire ses dernières paroles",
        virtue: "« Si tu meurs (cette nuit-là), tu mourras sur la fiṭra (la saine nature). »",
      },
    ],
  },
  {
    id: "reveil",
    title: "Au réveil",
    titleAr: "أذكار الاستيقاظ",
    subtitle: "En se réveillant",
    items: [
      {
        id: "reveil-ahyana",
        ar: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا، وَإِلَيْهِ النُّشُورُ",
        translit: "Al-ḥamdu lillāhi-lladhī aḥyānā ba'da mā amātanā, wa ilayhi-n-nushūr.",
        fr: "Louange à Allah qui nous a rendu la vie après nous avoir fait mourir, et vers Lui est la résurrection.",
        count: 1,
        source: "Al-Bukhārī 6312, Muslim 2711",
        note: "Le sommeil est une « petite mort »",
      },
      {
        id: "reveil-afani",
        ar: "الْحَمْدُ لِلَّهِ الَّذِي عَافَانِي فِي جَسَدِي، وَرَدَّ عَلَيَّ رُوحِي، وَأَذِنَ لِي بِذِكْرِهِ",
        translit: "Al-ḥamdu lillāhi-lladhī 'āfānī fī jasadī, wa radda 'alayya rūḥī, wa adhina lī bi-dhikrih.",
        fr: "Louange à Allah qui a préservé la santé de mon corps, m'a rendu mon âme et m'a permis de L'évoquer.",
        count: 1,
        source: "At-Tirmidhī 3401",
      },
      {
        id: "reveil-al-imran-190-200",
        ar: AL_IMRAN_190_200.ar,
        fr: AL_IMRAN_190_200.fr,
        count: 1,
        source: "Coran 3:190-200",
        note: "Le Prophète ﷺ récitait ces versets en se levant la nuit, le regard tourné vers le ciel (Al-Bukhārī 4569, Muslim 763)",
      },
    ],
  },
  {
    id: "quotidien",
    title: "Invocations du quotidien",
    titleAr: "أدعية يومية",
    subtitle: "Toilettes, ablutions, maison, mosquée, repas, voyage…",
    items: [
      {
        id: "quotidien-entree-toilettes",
        ar: "بِسْمِ اللَّهِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ",
        translit: "Bismi-llāh. Allāhumma innī a'ūdhu bika mina-l-khubuthi wa-l-khabā'ith.",
        fr: "Au nom d'Allah. Ô Allah, je cherche refuge auprès de Toi contre les démons mâles et femelles.",
        count: 1,
        source: "Al-Bukhārī 142, Muslim 375",
        note: "En entrant aux toilettes. « Bismillāh » au début est rapporté par Sa'īd ibn Manṣūr",
      },
      {
        id: "quotidien-sortie-toilettes",
        ar: "غُفْرَانَكَ",
        translit: "Ghufrānak.",
        fr: "(J'implore) Ton pardon.",
        count: 1,
        source: "Abū Dāwūd 30, At-Tirmidhī 7",
        note: "En sortant des toilettes",
      },
      {
        id: "quotidien-avant-ablutions",
        ar: "بِسْمِ اللَّهِ",
        translit: "Bismi-llāh.",
        fr: "Au nom d'Allah.",
        count: 1,
        source: "Abū Dāwūd 101",
        note: "Avant les ablutions",
      },
      {
        id: "quotidien-apres-ablutions",
        ar: "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
        translit: "Ash-hadu an lā ilāha illa-llāhu waḥdahu lā sharīka lah, wa ash-hadu anna Muḥammadan 'abduhu wa rasūluh.",
        fr: "J'atteste qu'il n'y a de divinité qu'Allah, Seul, sans associé, et j'atteste que Muḥammad est Son serviteur et Son Messager.",
        count: 1,
        source: "Muslim 234",
        note: "Après les ablutions",
        virtue: "Les huit portes du Paradis lui sont ouvertes ; il y entre par celle qu'il veut.",
      },
      {
        id: "quotidien-apres-ablutions-tawwabin",
        ar: "اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ، وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ",
        translit: "Allāhumma-j'alnī mina-t-tawwābīn, wa-j'alnī mina-l-mutaṭahhirīn.",
        fr: "Ô Allah, place-moi parmi ceux qui se repentent sans cesse et parmi ceux qui se purifient.",
        count: 1,
        source: "At-Tirmidhī 55",
        note: "Après les ablutions, à la suite des deux attestations",
      },
      {
        id: "quotidien-apres-ablutions-subhanaka",
        ar: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ",
        translit: "Subḥānaka-llāhumma wa bi-ḥamdik, ash-hadu an lā ilāha illā ant, astaghfiruka wa atūbu ilayk.",
        fr: "Gloire et pureté à Toi, ô Allah, et par Ta louange. J'atteste qu'il n'y a de divinité que Toi. Je Te demande pardon et je me repens à Toi.",
        count: 1,
        source: "An-Nasā'ī ('Amal al-yawm wa-l-layla, p. 173)",
        note: "Après les ablutions",
      },
      {
        id: "quotidien-sortie-maison",
        ar: "بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
        translit: "Bismi-llāh, tawakkaltu 'ala-llāh, wa lā ḥawla wa lā quwwata illā billāh.",
        fr: "Au nom d'Allah, je place ma confiance en Allah, et il n'y a de force ni de puissance qu'en Allah.",
        count: 1,
        source: "Abū Dāwūd 5095, At-Tirmidhī 3426",
        note: "En sortant de chez soi",
        virtue: "Il lui est dit : « Tu es guidé, tu es préservé et il t'est suffi », et le diable s'écarte de lui.",
      },
      {
        id: "quotidien-sortie-maison-adilla",
        ar: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ أَنْ أَضِلَّ أَوْ أُضَلَّ، أَوْ أَزِلَّ أَوْ أُزَلَّ، أَوْ أَظْلِمَ أَوْ أُظْلَمَ، أَوْ أَجْهَلَ أَوْ يُجْهَلَ عَلَيَّ",
        translit:
          "Allāhumma innī a'ūdhu bika an aḍilla aw uḍall, aw azilla aw uzall, aw aẓlima aw uẓlam, aw ajhala aw yujhala 'alayy.",
        fr: "Ô Allah, je cherche refuge auprès de Toi contre le fait de m'égarer ou d'être égaré, de trébucher ou d'être fait trébucher, d'être injuste ou de subir l'injustice, de me conduire en ignorant ou d'être traité avec ignorance.",
        count: 1,
        source: "Abū Dāwūd 5094, At-Tirmidhī 3427",
        note: "En sortant de chez soi",
      },
      {
        id: "quotidien-entree-maison",
        ar: "بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى رَبِّنَا تَوَكَّلْنَا",
        translit: "Bismi-llāhi walajnā, wa bismi-llāhi kharajnā, wa 'alā rabbinā tawakkalnā.",
        fr: "Au nom d'Allah nous entrons, au nom d'Allah nous sortons, et en notre Seigneur nous plaçons notre confiance.",
        count: 1,
        source: "Abū Dāwūd 5096",
        note: "En entrant chez soi, puis saluer les siens",
      },
      {
        id: "quotidien-vers-la-mosquee",
        ar: "اللَّهُمَّ اجْعَلْ فِي قَلْبِي نُورًا، وَفِي لِسَانِي نُورًا، وَفِي سَمْعِي نُورًا، وَفِي بَصَرِي نُورًا، وَمِنْ فَوْقِي نُورًا، وَمِنْ تَحْتِي نُورًا، وَعَنْ يَمِينِي نُورًا، وَعَنْ شِمَالِي نُورًا، وَمِنْ أَمَامِي نُورًا، وَمِنْ خَلْفِي نُورًا، وَاجْعَلْ فِي نَفْسِي نُورًا، وَأَعْظِمْ لِي نُورًا، وَعَظِّمْ لِي نُورًا، وَاجْعَلْ لِي نُورًا، وَاجْعَلْنِي نُورًا، اللَّهُمَّ أَعْطِنِي نُورًا، وَاجْعَلْ فِي عَصَبِي نُورًا، وَفِي لَحْمِي نُورًا، وَفِي دَمِي نُورًا، وَفِي شَعْرِي نُورًا، وَفِي بَشَرِي نُورًا",
        translit:
          "Allāhumma-j'al fī qalbī nūrā, wa fī lisānī nūrā, wa fī sam'ī nūrā, wa fī baṣarī nūrā, wa min fawqī nūrā, wa min taḥtī nūrā, wa 'an yamīnī nūrā, wa 'an shimālī nūrā, wa min amāmī nūrā, wa min khalfī nūrā, wa-j'al fī nafsī nūrā, wa a'ẓim lī nūrā, wa 'aẓẓim lī nūrā, wa-j'al lī nūrā, wa-j'alnī nūrā. Allāhumma a'ṭinī nūrā, wa-j'al fī 'aṣabī nūrā, wa fī laḥmī nūrā, wa fī damī nūrā, wa fī sha'rī nūrā, wa fī basharī nūrā.",
        fr: "Ô Allah, mets de la lumière dans mon cœur, de la lumière dans ma langue, de la lumière dans mon ouïe, de la lumière dans ma vue, de la lumière au-dessus de moi, de la lumière au-dessous de moi, de la lumière à ma droite, de la lumière à ma gauche, de la lumière devant moi et de la lumière derrière moi. Mets de la lumière dans mon âme, rends ma lumière immense, magnifie pour moi la lumière, accorde-moi de la lumière et fais de moi une lumière. Ô Allah, donne-moi de la lumière, et mets de la lumière dans mes nerfs, dans ma chair, dans mon sang, dans mes cheveux et dans ma peau.",
        count: 1,
        source: "Al-Bukhārī 6316, Muslim 763",
        note: "En se rendant à la mosquée",
      },
      {
        id: "quotidien-entree-mosquee-audhu",
        ar: "أَعُوذُ بِاللَّهِ الْعَظِيمِ، وَبِوَجْهِهِ الْكَرِيمِ، وَسُلْطَانِهِ الْقَدِيمِ، مِنَ الشَّيْطَانِ الرَّجِيمِ",
        translit: "A'ūdhu billāhi-l-'aẓīm, wa bi-wajhihi-l-karīm, wa sulṭānihi-l-qadīm, mina-sh-shayṭāni-r-rajīm.",
        fr: "Je cherche refuge auprès d'Allah l'Immense, auprès de Son noble Visage et de Son pouvoir éternel, contre Satan le banni.",
        count: 1,
        source: "Abū Dāwūd 466",
        note: "En entrant à la mosquée",
      },
      {
        id: "quotidien-entree-mosquee",
        ar: "بِسْمِ اللَّهِ، وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ، اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
        translit: "Bismi-llāh, wa-ṣ-ṣalātu wa-s-salāmu 'alā rasūli-llāh. Allāhumma-ftaḥ lī abwāba raḥmatik.",
        fr: "Au nom d'Allah, et que la prière et la paix soient sur le Messager d'Allah. Ô Allah, ouvre-moi les portes de Ta miséricorde.",
        count: 1,
        source: "Muslim 713, Abū Dāwūd 465, Ibn as-Sunnī 88",
        note: "En entrant à la mosquée",
      },
      {
        id: "quotidien-sortie-mosquee",
        ar: "بِسْمِ اللَّهِ، وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ، اللَّهُمَّ اعْصِمْنِي مِنَ الشَّيْطَانِ الرَّجِيمِ",
        translit:
          "Bismi-llāh, wa-ṣ-ṣalātu wa-s-salāmu 'alā rasūli-llāh. Allāhumma innī as'aluka min faḍlik. Allāhumma-'ṣimnī mina-sh-shayṭāni-r-rajīm.",
        fr: "Au nom d'Allah, et que la prière et la paix soient sur le Messager d'Allah. Ô Allah, je Te demande de Ta grâce. Ô Allah, préserve-moi de Satan le banni.",
        count: 1,
        source: "Muslim 713 ; Ibn Mājah pour la fin (Ṣaḥīḥ Ibn Mājah 1/288)",
        note: "En sortant de la mosquée",
      },
      {
        id: "quotidien-adhan-hawqala",
        ar: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
        translit: "Lā ḥawla wa lā quwwata illā billāh.",
        fr: "Il n'y a de force ni de puissance qu'en Allah.",
        count: 1,
        source: "Al-Bukhārī 611, Muslim 385",
        note: "Pendant l'appel à la prière : répéter chaque phrase du muezzin, sauf « Ḥayya 'ala-ṣ-ṣalāh » et « Ḥayya 'ala-l-falāḥ », auxquelles on répond par cette formule",
      },
      {
        id: "quotidien-adhan-shahada",
        ar: "وَأَنَا أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ، رَضِيتُ بِاللَّهِ رَبًّا، وَبِمُحَمَّدٍ رَسُولًا، وَبِالْإِسْلَامِ دِينًا",
        translit:
          "Wa ana ash-hadu an lā ilāha illa-llāhu waḥdahu lā sharīka lah, wa anna Muḥammadan 'abduhu wa rasūluh, raḍītu billāhi rabbā, wa bi-Muḥammadin rasūlā, wa bi-l-islāmi dīnā.",
        fr: "Et moi aussi, j'atteste qu'il n'y a de divinité qu'Allah, Seul, sans associé, et que Muḥammad est Son serviteur et Son Messager. Je suis satisfait d'Allah comme Seigneur, de Muḥammad comme Messager et de l'islam comme religion.",
        count: 1,
        source: "Muslim 386",
        note: "Après les attestations de foi du muezzin",
        virtue: "Ses péchés lui sont pardonnés.",
      },
      {
        id: "quotidien-apres-adhan",
        ar: "اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ، [إِنَّكَ لَا تُخْلِفُ الْمِيعَادَ]",
        translit:
          "Allāhumma rabba hādhihi-d-da'wati-t-tāmmah, wa-ṣ-ṣalāti-l-qā'imah, āti Muḥammadani-l-wasīlata wa-l-faḍīlah, wa-b'ath-hu maqāman maḥmūdani-lladhī wa'adtah, [innaka lā tukhlifu-l-mī'ād].",
        fr: "Ô Allah, Seigneur de cet appel parfait et de cette prière qui va être accomplie, accorde à Muḥammad al-wasīla et l'excellence, et ressuscite-le au rang digne de louange que Tu lui as promis, [car Tu ne manques jamais à Ta promesse].",
        count: 1,
        source: "Al-Bukhārī 614",
        note: "Après l'appel à la prière, après avoir prié sur le Prophète ﷺ. La fin entre crochets est rapportée par Al-Bayhaqī",
        virtue: "Celui qui dit cela après avoir entendu l'appel obtiendra l'intercession du Prophète ﷺ le Jour de la Résurrection.",
      },
      {
        id: "quotidien-avant-repas",
        ar: "بِسْمِ اللَّهِ",
        translit: "Bismi-llāh.",
        fr: "Au nom d'Allah.",
        count: 1,
        source: "Abū Dāwūd 3767, At-Tirmidhī 1858",
        note: "Avant de manger",
      },
      {
        id: "quotidien-avant-repas-oubli",
        ar: "بِسْمِ اللَّهِ فِي أَوَّلِهِ وَآخِرِهِ",
        translit: "Bismi-llāhi fī awwalihi wa ākhirih.",
        fr: "Au nom d'Allah, au début et à la fin.",
        count: 1,
        source: "Abū Dāwūd 3767, At-Tirmidhī 1858",
        note: "Si l'on a oublié de dire « Bismillāh » au début du repas",
      },
      {
        id: "quotidien-apres-repas",
        ar: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا، وَرَزَقَنِيهِ، مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
        translit: "Al-ḥamdu lillāhi-lladhī aṭ'amanī hādhā, wa razaqanīh, min ghayri ḥawlin minnī wa lā quwwah.",
        fr: "Louange à Allah qui m'a nourri de ceci et me l'a accordé, sans force ni puissance de ma part.",
        count: 1,
        source: "Abū Dāwūd 4023, At-Tirmidhī 3458",
        note: "Après le repas",
        virtue: "Ses péchés passés lui sont pardonnés.",
      },
      {
        id: "quotidien-apres-repas-hamdan",
        ar: "الْحَمْدُ لِلَّهِ حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ، غَيْرَ مَكْفِيٍّ وَلَا مُوَدَّعٍ، وَلَا مُسْتَغْنًى عَنْهُ رَبَّنَا",
        translit:
          "Al-ḥamdu lillāhi ḥamdan kathīran ṭayyiban mubārakan fīh, ghayra makfiyyin wa lā muwadda'in wa lā mustaghnan 'anhu rabbanā.",
        fr: "Louange à Allah, une louange abondante, pure et bénie ; une louange qui ne suffit jamais, que l'on ne délaisse pas et dont on ne peut se passer, ô notre Seigneur.",
        count: 1,
        source: "Al-Bukhārī 5458 ; At-Tirmidhī 5/507",
        note: "Après le repas",
      },
      {
        id: "quotidien-vetement",
        ar: "الْحَمْدُ لِلَّهِ الَّذِي كَسَانِي هَذَا الثَّوْبَ، وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
        translit: "Al-ḥamdu lillāhi-lladhī kasānī hādha-th-thawb, wa razaqanīhi min ghayri ḥawlin minnī wa lā quwwah.",
        fr: "Louange à Allah qui m'a vêtu de ce vêtement et me l'a accordé, sans force ni puissance de ma part.",
        count: 1,
        source: "Abū Dāwūd 4023",
        note: "En s'habillant",
      },
      {
        id: "quotidien-vetement-neuf",
        ar: "اللَّهُمَّ لَكَ الْحَمْدُ، أَنْتَ كَسَوْتَنِيهِ، أَسْأَلُكَ مِنْ خَيْرِهِ وَخَيْرِ مَا صُنِعَ لَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّهِ وَشَرِّ مَا صُنِعَ لَهُ",
        translit:
          "Allāhumma laka-l-ḥamd, anta kasawtanīh, as'aluka min khayrihi wa khayri mā ṣuni'a lah, wa a'ūdhu bika min sharrihi wa sharri mā ṣuni'a lah.",
        fr: "Ô Allah, à Toi la louange ; c'est Toi qui m'en as vêtu. Je Te demande son bien et le bien de ce pour quoi il a été fait, et je cherche refuge auprès de Toi contre son mal et le mal de ce pour quoi il a été fait.",
        count: 1,
        source: "Abū Dāwūd 4020, At-Tirmidhī 1767",
        note: "En portant un vêtement neuf",
      },
      {
        id: "quotidien-monture",
        ar: "بِسْمِ اللَّهِ، الْحَمْدُ لِلَّهِ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ، الْحَمْدُ لِلَّهِ، الْحَمْدُ لِلَّهِ، الْحَمْدُ لِلَّهِ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، سُبْحَانَكَ اللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
        translit:
          "Bismi-llāh, al-ḥamdu lillāh, subḥāna-lladhī sakhkhara lanā hādhā wa mā kunnā lahu muqrinīn, wa innā ilā rabbinā la-munqalibūn. Al-ḥamdu lillāh, al-ḥamdu lillāh, al-ḥamdu lillāh. Allāhu akbar, Allāhu akbar, Allāhu akbar. Subḥānaka-llāhumma innī ẓalamtu nafsī fa-ghfir lī, fa-innahu lā yaghfiru-dh-dhunūba illā ant.",
        fr: "Au nom d'Allah. Louange à Allah. Gloire à Celui qui a mis ceci à notre service alors que nous n'étions pas capables de le maîtriser ; et c'est vers notre Seigneur que nous retournerons. Louange à Allah (trois fois). Allah est le plus grand (trois fois). Gloire et pureté à Toi, ô Allah ; j'ai été injuste envers moi-même, pardonne-moi donc, car nul ne pardonne les péchés en dehors de Toi.",
        count: 1,
        source: "Abū Dāwūd 2602, At-Tirmidhī 3446",
        note: "En montant sur sa monture ou dans un véhicule",
      },
      {
        id: "quotidien-voyage",
        ar: "اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ، اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى، اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا، وَاطْوِ عَنَّا بُعْدَهُ، اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ، وَالْخَلِيفَةُ فِي الْأَهْلِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ وَعْثَاءِ السَّفَرِ، وَكَآبَةِ الْمَنْظَرِ، وَسُوءِ الْمُنْقَلَبِ فِي الْمَالِ وَالْأَهْلِ",
        translit:
          "Allāhu akbar, Allāhu akbar, Allāhu akbar. Subḥāna-lladhī sakhkhara lanā hādhā wa mā kunnā lahu muqrinīn, wa innā ilā rabbinā la-munqalibūn. Allāhumma innā nas'aluka fī safarinā hādha-l-birra wa-t-taqwā, wa mina-l-'amali mā tarḍā. Allāhumma hawwin 'alaynā safaranā hādhā, wa-ṭwi 'annā bu'dah. Allāhumma anta-ṣ-ṣāḥibu fi-s-safar, wa-l-khalīfatu fi-l-ahl. Allāhumma innī a'ūdhu bika min wa'thā'i-s-safar, wa ka'ābati-l-manẓar, wa sū'i-l-munqalabi fi-l-māli wa-l-ahl.",
        fr: "Allah est le plus grand (trois fois). Gloire à Celui qui a mis ceci à notre service alors que nous n'étions pas capables de le maîtriser ; et c'est vers notre Seigneur que nous retournerons. Ô Allah, nous Te demandons, dans ce voyage, la bonté et la piété, ainsi que des œuvres que Tu agrées. Ô Allah, facilite-nous ce voyage et raccourcis-en pour nous la distance. Ô Allah, Tu es le Compagnon du voyage et Celui qui veille sur la famille en notre absence. Ô Allah, je cherche refuge auprès de Toi contre les fatigues du voyage, tout spectacle affligeant et tout retour malheureux, dans les biens et dans la famille.",
        count: 1,
        source: "Muslim 1342",
        note: "Au départ en voyage",
      },
      {
        id: "quotidien-retour-voyage",
        ar: "آيِبُونَ، تَائِبُونَ، عَابِدُونَ، لِرَبِّنَا حَامِدُونَ",
        translit: "Āyibūna, tā'ibūna, 'ābidūna, li-rabbinā ḥāmidūn.",
        fr: "Nous voici de retour, repentants, adorant notre Seigneur et Le louant.",
        count: 1,
        source: "Muslim 1342",
        note: "Au retour de voyage : redire l'invocation du voyage en y ajoutant ces mots",
      },
      {
        id: "quotidien-pluie",
        ar: "اللَّهُمَّ صَيِّبًا نَافِعًا",
        translit: "Allāhumma ṣayyiban nāfi'ā.",
        fr: "Ô Allah, (fais que ce soit) une pluie abondante et bénéfique.",
        count: 1,
        source: "Al-Bukhārī 1032",
        note: "Quand il pleut",
      },
      {
        id: "quotidien-apres-pluie",
        ar: "مُطِرْنَا بِفَضْلِ اللَّهِ وَرَحْمَتِهِ",
        translit: "Muṭirnā bi-faḍli-llāhi wa raḥmatih.",
        fr: "Nous avons reçu la pluie par la grâce d'Allah et par Sa miséricorde.",
        count: 1,
        source: "Al-Bukhārī 846, Muslim 71",
        note: "Après la pluie",
      },
      {
        id: "quotidien-eternuement",
        ar: "الْحَمْدُ لِلَّهِ",
        translit: "Al-ḥamdu lillāh.",
        fr: "Louange à Allah.",
        count: 1,
        source: "Al-Bukhārī 6224",
        note: "Celui qui éternue dit",
      },
      {
        id: "quotidien-eternuement-reponse",
        ar: "يَرْحَمُكَ اللَّهُ",
        translit: "Yarḥamuka-llāh.",
        fr: "Qu'Allah te fasse miséricorde.",
        count: 1,
        source: "Al-Bukhārī 6224",
        note: "Celui qui l'entend lui répond",
      },
      {
        id: "quotidien-eternuement-retour",
        ar: "يَهْدِيكُمُ اللَّهُ وَيُصْلِحُ بَالَكُمْ",
        translit: "Yahdīkumu-llāhu wa yuṣliḥu bālakum.",
        fr: "Qu'Allah vous guide et améliore votre état.",
        count: 1,
        source: "Al-Bukhārī 6224",
        note: "Celui qui a éternué répond à son tour",
      },
      {
        id: "quotidien-visite-malade",
        ar: "لَا بَأْسَ، طَهُورٌ إِنْ شَاءَ اللَّهُ",
        translit: "Lā ba's, ṭahūrun in shā'a-llāh.",
        fr: "Ce n'est rien : (cette maladie est) une purification, si Allah le veut.",
        count: 1,
        source: "Al-Bukhārī 5656",
        note: "En rendant visite à un malade",
      },
      {
        id: "quotidien-visite-malade-shifa",
        ar: "أَسْأَلُ اللَّهَ الْعَظِيمَ، رَبَّ الْعَرْشِ الْعَظِيمِ، أَنْ يَشْفِيَكَ",
        translit: "As'alu-llāha-l-'aẓīm, rabba-l-'arshi-l-'aẓīm, an yashfiyak.",
        fr: "Je demande à Allah l'Immense, Seigneur du Trône immense, de te guérir.",
        count: 7,
        source: "Abū Dāwūd 3106, At-Tirmidhī 2083",
        note: "En rendant visite à un malade",
        virtue:
          "Tout musulman qui rend visite à un malade dont le terme n'est pas encore venu et dit cela sept fois, le malade sera guéri.",
      },
      {
        id: "quotidien-marche",
        ar: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، يُحْيِي وَيُمِيتُ، وَهُوَ حَيٌّ لَا يَمُوتُ، بِيَدِهِ الْخَيْرُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
        translit:
          "Lā ilāha illa-llāhu waḥdahu lā sharīka lah, lahu-l-mulku wa lahu-l-ḥamd, yuḥyī wa yumīt, wa huwa ḥayyun lā yamūt, bi-yadihi-l-khayr, wa huwa 'alā kulli shay'in qadīr.",
        fr: "Il n'y a de divinité qu'Allah, Seul, sans associé. À Lui la royauté, à Lui la louange ; Il donne la vie et la mort, et Il est le Vivant qui ne meurt pas. Le bien est dans Sa main, et Il est capable de toute chose.",
        count: 1,
        source: "At-Tirmidhī 3428, Al-Ḥākim 1/538",
        note: "En entrant au marché",
      },
    ],
  },
  {
    id: "detresse",
    title: "Anxiété et détresse",
    titleAr: "دعاء الكرب",
    subtitle: "Dans le souci, la tristesse et l'angoisse",
    items: [
      {
        id: "detresse-abduka",
        ar: "اللَّهُمَّ إِنِّي عَبْدُكَ، ابْنُ عَبْدِكَ، ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ، مَاضٍ فِيَّ حُكْمُكَ، عَدْلٌ فِيَّ قَضَاؤُكَ، أَسْأَلُكَ بِكُلِّ اسْمٍ هُوَ لَكَ، سَمَّيْتَ بِهِ نَفْسَكَ، أَوْ أَنْزَلْتَهُ فِي كِتَابِكَ، أَوْ عَلَّمْتَهُ أَحَدًا مِنْ خَلْقِكَ، أَوِ اسْتَأْثَرْتَ بِهِ فِي عِلْمِ الْغَيْبِ عِنْدَكَ، أَنْ تَجْعَلَ الْقُرْآنَ رَبِيعَ قَلْبِي، وَنُورَ صَدْرِي، وَجَلَاءَ حُزْنِي، وَذَهَابَ هَمِّي",
        translit:
          "Allāhumma innī 'abduk, ibnu 'abdik, ibnu amatik, nāṣiyatī bi-yadik, māḍin fiyya ḥukmuk, 'adlun fiyya qaḍā'uk, as'aluka bi-kulli-smin huwa lak, sammayta bihi nafsak, aw anzaltahu fī kitābik, aw 'allamtahu aḥadan min khalqik, awi-sta'tharta bihi fī 'ilmi-l-ghaybi 'indak, an taj'ala-l-qur'āna rabī'a qalbī, wa nūra ṣadrī, wa jalā'a ḥuznī, wa dhahāba hammī.",
        fr: "Ô Allah, je suis Ton serviteur, fils de Ton serviteur, fils de Ta servante. Mon toupet est dans Ta main ; Ton jugement s'accomplit sur moi ; Ton décret à mon égard est juste. Je Te demande, par chacun des noms qui T'appartiennent, par lesquels Tu T'es nommé, que Tu as révélés dans Ton Livre, que Tu as enseignés à l'une de Tes créatures ou que Tu as gardés dans la science de l'invisible auprès de Toi, de faire du Coran le printemps de mon cœur, la lumière de ma poitrine, ce qui dissipe ma tristesse et ce qui chasse mon souci.",
        count: 1,
        source: "Aḥmad 3712",
        virtue:
          "Quiconque, atteint de souci ou de tristesse, dit ces paroles, Allah fait disparaître son souci et sa tristesse et les remplace par la joie.",
      },
      {
        id: "detresse-hamm-hazan",
        ar: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ، وَغَلَبَةِ الرِّجَالِ",
        translit:
          "Allāhumma innī a'ūdhu bika mina-l-hammi wa-l-ḥazan, wa-l-'ajzi wa-l-kasal, wa-l-bukhli wa-l-jubn, wa ḍala'i-d-dayni wa ghalabati-r-rijāl.",
        fr: "Ô Allah, je cherche refuge auprès de Toi contre le souci et la tristesse, l'incapacité et la paresse, l'avarice et la lâcheté, le poids des dettes et la domination des hommes.",
        count: 1,
        source: "Al-Bukhārī 6369",
        note: "Le Prophète ﷺ répétait souvent cette invocation",
      },
      {
        id: "detresse-karb",
        ar: "لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ السَّمَوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ",
        translit:
          "Lā ilāha illa-llāhu-l-'aẓīmu-l-ḥalīm, lā ilāha illa-llāhu rabbu-l-'arshi-l-'aẓīm, lā ilāha illa-llāhu rabbu-s-samāwāti wa rabbu-l-arḍi wa rabbu-l-'arshi-l-karīm.",
        fr: "Il n'y a de divinité qu'Allah, l'Immense, l'Indulgent. Il n'y a de divinité qu'Allah, Seigneur du Trône immense. Il n'y a de divinité qu'Allah, Seigneur des cieux, Seigneur de la terre et Seigneur du noble Trône.",
        count: 1,
        source: "Al-Bukhārī 6346, Muslim 2730",
      },
      {
        id: "detresse-rahmataka-arju",
        ar: "اللَّهُمَّ رَحْمَتَكَ أَرْجُو، فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ، وَأَصْلِحْ لِي شَأْنِي كُلَّهُ، لَا إِلَهَ إِلَّا أَنْتَ",
        translit: "Allāhumma raḥmataka arjū, fa-lā takilnī ilā nafsī ṭarfata 'ayn, wa aṣliḥ lī sha'nī kullah, lā ilāha illā ant.",
        fr: "Ô Allah, c'est Ta miséricorde que j'espère : ne me confie donc pas à moi-même, ne serait-ce que le temps d'un clin d'œil, et améliore toutes mes affaires. Il n'y a de divinité que Toi.",
        count: 1,
        source: "Abū Dāwūd 5090",
      },
      {
        id: "detresse-dhu-n-nun",
        ar: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
        translit: "Lā ilāha illā anta subḥānaka innī kuntu mina-ẓ-ẓālimīn.",
        fr: "Il n'y a de divinité que Toi ; gloire et pureté à Toi ! J'ai certes été du nombre des injustes.",
        count: 1,
        source: "At-Tirmidhī 3505",
        note: "L'invocation de Yūnus (Dhū-n-Nūn) dans le ventre du poisson (Coran 21:87)",
        virtue: "Aucun musulman n'invoque par elle pour quelque chose sans qu'Allah ne l'exauce.",
      },
      {
        id: "detresse-allahu-rabbi",
        ar: "اللَّهُ اللَّهُ رَبِّي لَا أُشْرِكُ بِهِ شَيْئًا",
        translit: "Allāhu Allāhu rabbī, lā ushriku bihi shay'ā.",
        fr: "Allah, Allah est mon Seigneur, je ne Lui associe rien.",
        count: 1,
        source: "Abū Dāwūd 1525, Ibn Mājah 3882",
      },
    ],
  },
  {
    id: "istikhara",
    title: "Prière de consultation",
    titleAr: "الاستخارة",
    subtitle: "Demander à Allah de choisir le bien",
    items: [
      {
        id: "istikhara-dua",
        ar: "اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ، فَإِنَّكَ تَقْدِرُ وَلَا أَقْدِرُ، وَتَعْلَمُ وَلَا أَعْلَمُ، وَأَنْتَ عَلَّامُ الْغُيُوبِ، اللَّهُمَّ إِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ (يُسَمِّي حَاجَتَهُ) خَيْرٌ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي (أَوْ قَالَ: عَاجِلِهِ وَآجِلِهِ) فَاقْدُرْهُ لِي، وَيَسِّرْهُ لِي، ثُمَّ بَارِكْ لِي فِيهِ، وَإِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ شَرٌّ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي (أَوْ قَالَ: عَاجِلِهِ وَآجِلِهِ) فَاصْرِفْهُ عَنِّي، وَاصْرِفْنِي عَنْهُ، وَاقْدُرْ لِيَ الْخَيْرَ حَيْثُ كَانَ، ثُمَّ أَرْضِنِي بِهِ",
        translit:
          "Allāhumma innī astakhīruka bi-'ilmik, wa astaqdiruka bi-qudratik, wa as'aluka min faḍlika-l-'aẓīm, fa-innaka taqdiru wa lā aqdir, wa ta'lamu wa lā a'lam, wa anta 'allāmu-l-ghuyūb. Allāhumma in kunta ta'lamu anna hādha-l-amra (on nomme ici l'affaire) khayrun lī fī dīnī wa ma'āshī wa 'āqibati amrī (ou : 'ājilihi wa ājilih), fa-qdurhu lī, wa yassirhu lī, thumma bārik lī fīh. Wa in kunta ta'lamu anna hādha-l-amra sharrun lī fī dīnī wa ma'āshī wa 'āqibati amrī (ou : 'ājilihi wa ājilih), fa-ṣrifhu 'annī, wa-ṣrifnī 'anh, wa-qdur liya-l-khayra ḥaythu kān, thumma arḍinī bih.",
        fr: "Ô Allah, je Te demande de choisir pour moi par Ta science, je Te demande de m'en rendre capable par Ta puissance, et je Te demande de Ton immense grâce. Car Tu es capable et je ne le suis pas, Tu sais et je ne sais pas, et c'est Toi le Grand Connaisseur de l'invisible. Ô Allah, si Tu sais que cette affaire (on la nomme ici) est un bien pour moi dans ma religion, ma vie et l'issue de mon affaire (ou il dit : dans le présent et dans l'avenir), alors décrète-la pour moi, facilite-la-moi, puis bénis-la pour moi. Et si Tu sais que cette affaire est un mal pour moi dans ma religion, ma vie et l'issue de mon affaire (ou il dit : dans le présent et dans l'avenir), alors écarte-la de moi et écarte-moi d'elle, décrète pour moi le bien où qu'il se trouve, puis rends-moi satisfait de celui-ci.",
        count: 1,
        source: "Al-Bukhārī 1162",
        note: "Accomplir deux rak'as surérogatoires (en dehors des prières obligatoires), puis prononcer cette invocation en nommant l'affaire concernée à l'endroit de « hādha-l-amr » (هَذَا الْأَمْرَ). La mention « أَوْ قَالَ » signale une variante rapportée par le narrateur.",
      },
    ],
  },
  {
    id: "rabbana",
    title: "Invocations du Coran",
    titleAr: "أدعية قرآنية",
    subtitle: "Rabbanā : supplications tirées du Coran (traduction Hamidullah)",
    items: RABBANA_ITEMS,
  },
];
