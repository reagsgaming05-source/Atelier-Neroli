import meta from './quran-meta.json';

/** Transliterated name and French meaning of each surah, in order. */
const NAMES: [string, string][] = [
  ['Al-Fâtiha', 'L’Ouverture'],
  ['Al-Baqara', 'La Vache'],
  ['Âl ‘Imrân', 'La Famille d’Imrân'],
  ['An-Nisâ’', 'Les Femmes'],
  ['Al-Mâ’ida', 'La Table servie'],
  ['Al-An‘âm', 'Les Bestiaux'],
  ['Al-A‘râf', 'Les Murailles'],
  ['Al-Anfâl', 'Le Butin'],
  ['At-Tawba', 'Le Repentir'],
  ['Yûnus', 'Jonas'],
  ['Hûd', 'Hûd'],
  ['Yûsuf', 'Joseph'],
  ['Ar-Ra‘d', 'Le Tonnerre'],
  ['Ibrâhîm', 'Abraham'],
  ['Al-Hijr', 'Al-Hijr'],
  ['An-Nahl', 'Les Abeilles'],
  ['Al-Isrâ’', 'Le Voyage nocturne'],
  ['Al-Kahf', 'La Caverne'],
  ['Maryam', 'Marie'],
  ['Tâ-Hâ', 'Tâ-Hâ'],
  ['Al-Anbiyâ’', 'Les Prophètes'],
  ['Al-Hajj', 'Le Pèlerinage'],
  ['Al-Mu’minûn', 'Les Croyants'],
  ['An-Nûr', 'La Lumière'],
  ['Al-Furqân', 'Le Discernement'],
  ['Ash-Shu‘arâ’', 'Les Poètes'],
  ['An-Naml', 'Les Fourmis'],
  ['Al-Qasas', 'Le Récit'],
  ['Al-‘Ankabût', 'L’Araignée'],
  ['Ar-Rûm', 'Les Romains'],
  ['Luqmân', 'Luqmân'],
  ['As-Sajda', 'La Prosternation'],
  ['Al-Ahzâb', 'Les Coalisés'],
  ['Saba’', 'Saba'],
  ['Fâtir', 'Le Créateur'],
  ['Yâ-Sîn', 'Yâ-Sîn'],
  ['As-Sâffât', 'Les Rangés'],
  ['Sâd', 'Sâd'],
  ['Az-Zumar', 'Les Groupes'],
  ['Ghâfir', 'Le Pardonneur'],
  ['Fussilat', 'Les Versets détaillés'],
  ['Ash-Shûrâ', 'La Consultation'],
  ['Az-Zukhruf', 'L’Ornement'],
  ['Ad-Dukhân', 'La Fumée'],
  ['Al-Jâthiya', 'L’Agenouillée'],
  ['Al-Ahqâf', 'Al-Ahqâf'],
  ['Muhammad', 'Muhammad'],
  ['Al-Fath', 'La Victoire éclatante'],
  ['Al-Hujurât', 'Les Appartements'],
  ['Qâf', 'Qâf'],
  ['Adh-Dhâriyât', 'Les Vents qui dispersent'],
  ['At-Tûr', 'Le Mont'],
  ['An-Najm', 'L’Étoile'],
  ['Al-Qamar', 'La Lune'],
  ['Ar-Rahmân', 'Le Tout Miséricordieux'],
  ['Al-Wâqi‘a', 'L’Événement'],
  ['Al-Hadîd', 'Le Fer'],
  ['Al-Mujâdila', 'La Discussion'],
  ['Al-Hashr', 'L’Exode'],
  ['Al-Mumtahana', 'L’Éprouvée'],
  ['As-Saff', 'Le Rang'],
  ['Al-Jumu‘a', 'Le Vendredi'],
  ['Al-Munâfiqûn', 'Les Hypocrites'],
  ['At-Taghâbun', 'La Grande Perte'],
  ['At-Talâq', 'Le Divorce'],
  ['At-Tahrîm', 'L’Interdiction'],
  ['Al-Mulk', 'La Royauté'],
  ['Al-Qalam', 'La Plume'],
  ['Al-Hâqqa', 'Celle qui montre la vérité'],
  ['Al-Ma‘ârij', 'Les Voies d’ascension'],
  ['Nûh', 'Noé'],
  ['Al-Jinn', 'Les Djinns'],
  ['Al-Muzzammil', 'L’Enveloppé'],
  ['Al-Muddaththir', 'Le Revêtu d’un manteau'],
  ['Al-Qiyâma', 'La Résurrection'],
  ['Al-Insân', 'L’Homme'],
  ['Al-Mursalât', 'Les Envoyés'],
  ['An-Naba’', 'La Nouvelle'],
  ['An-Nâzi‘ât', 'Les Anges qui arrachent'],
  ['‘Abasa', 'Il s’est renfrogné'],
  ['At-Takwîr', 'L’Obscurcissement'],
  ['Al-Infitâr', 'La Rupture'],
  ['Al-Mutaffifîn', 'Les Fraudeurs'],
  ['Al-Inshiqâq', 'La Déchirure'],
  ['Al-Burûj', 'Les Constellations'],
  ['At-Târiq', 'L’Astre nocturne'],
  ['Al-A‘lâ', 'Le Très-Haut'],
  ['Al-Ghâshiya', 'L’Enveloppante'],
  ['Al-Fajr', 'L’Aube'],
  ['Al-Balad', 'La Cité'],
  ['Ash-Shams', 'Le Soleil'],
  ['Al-Layl', 'La Nuit'],
  ['Ad-Duhâ', 'Le Jour montant'],
  ['Ash-Sharh', 'L’Ouverture de la poitrine'],
  ['At-Tîn', 'Le Figuier'],
  ['Al-‘Alaq', 'L’Adhérence'],
  ['Al-Qadr', 'La Destinée'],
  ['Al-Bayyina', 'La Preuve'],
  ['Az-Zalzala', 'La Secousse'],
  ['Al-‘Âdiyât', 'Les Coursiers'],
  ['Al-Qâri‘a', 'Le Fracas'],
  ['At-Takâthur', 'La Course aux richesses'],
  ['Al-‘Asr', 'Le Temps'],
  ['Al-Humaza', 'Les Calomniateurs'],
  ['Al-Fîl', 'L’Éléphant'],
  ['Quraysh', 'Quraysh'],
  ['Al-Mâ‘ûn', 'L’Ustensile'],
  ['Al-Kawthar', 'L’Abondance'],
  ['Al-Kâfirûn', 'Les Infidèles'],
  ['An-Nasr', 'Le Secours'],
  ['Al-Masad', 'Les Fibres'],
  ['Al-Ikhlâs', 'Le Monothéisme pur'],
  ['Al-Falaq', 'L’Aube naissante'],
  ['An-Nâs', 'Les Hommes'],
];

export interface Surah {
  n: number;
  ar: string;
  name: string;
  fr: string;
  verses: number;
  revelation: 'M' | 'D';
  page: number;
}

export const SURAHS: Surah[] = meta.surahs.map((s) => ({
  ...s,
  revelation: s.revelation as 'M' | 'D',
  name: NAMES[s.n - 1][0],
  fr: NAMES[s.n - 1][1],
}));

/** [surah, verse] where each of the 30 juz starts. */
export const JUZ_STARTS = meta.juz as [number, number][];
export const SAJDAS = meta.sajdas as [number, number][];

export function juzOf(surah: number, verse: number): number {
  let juz = 1;
  JUZ_STARTS.forEach(([s, v], i) => {
    if (surah > s || (surah === s && verse >= v)) juz = i + 1;
  });
  return juz;
}

/** Index of a verse in the whole Quran, from 1 to 6236. */
export function globalVerseNumber(surah: number, verse: number): number {
  let n = 0;
  for (let i = 0; i < surah - 1; i++) n += SURAHS[i].verses;
  return n + verse;
}

/** Strips Latin diacritics and punctuation for forgiving search. */
export function normalizeLatin(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'‘`\-\s]/g, '')
    .toLowerCase();
}
