/*
 * Analyse des pièces comptables (formulaire "PIECE COMPTABLE") à partir de la
 * couche texte d'un PDF scanné (OCR du scanner).
 *
 * Module sans dépendance, utilisable dans le navigateur (window.CaisseParser)
 * et dans Node (module.exports) pour les tests.
 *
 * Entrée : pour chaque page, la liste des "mots" avec leur position
 *   { str, x, y, h }   (x, y en points, origine en haut à gauche ; h = hauteur du texte)
 * Sortie : les écritures à reporter dans le journal de caisse.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CaisseParser = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULT_CAISSE = '9100.104';

  // Types d'écriture connus (en tête du libellé sur la pièce).
  const KNOWN_TYPES = [
    'REMBOURSEMENT',
    'AVANCE',
    'DECOMPTE',
    'RECETTE',
    'RETRAIT',
    'PARTICIPATION DES PARENTS',
    'PARTICIPATION PARENTS',
    'PARTICIPATION',
    'VERSEMENT',
    'DEPOT',
    'ENCAISSEMENT',
    'PAIEMENT',
    'ACHAT',
    'VENTE',
    'DON',
    'FRAIS',
    'SUBVENTION',
    'COTISATION',
    'CADEAU',
    'CADEAUX',
    'PRIX',
  ];

  // Types qui, par nature, font entrer de l'argent dans la caisse (débit du compte caisse)
  // Logique comptable des libellés : le type d'écriture fixe le sens du mouvement de caisse,
  // quoi qu'indique la position du compte caisse sur la pièce (pièce remplie à l'envers,
  // colonne mal lue). Un REMBOURSEMENT fait toujours sortir de l'argent, une PARTICIPATION
  // en fait toujours entrer. Les types absents de cette table (DECOMPTE…) vont dans les deux
  // sens : c'est la pièce qui décide.
  const TYPE_LOGIC = {
    // sortie de caisse -> crédit
    REMBOURSEMENT: 'credit',
    AVANCE: 'credit',
    PAIEMENT: 'credit',
    ACHAT: 'credit',
    FRAIS: 'credit',
    CADEAU: 'credit',
    CADEAUX: 'credit',
    PRIX: 'credit',
    // entrée en caisse -> débit
    'PARTICIPATION DES PARENTS': 'debit',
    'PARTICIPATION PARENTS': 'debit',
    PARTICIPATION: 'debit',
    RECETTE: 'debit',
    RETRAIT: 'debit', // retrait bancaire qui alimente la caisse
    ENCAISSEMENT: 'debit',
    VENTE: 'debit',
    SUBVENTION: 'debit',
  };
  // Types au sens seulement probable : utilisés en dernier recours, toujours avec un doute.
  const TYPE_GUESS = { DON: 'debit', COTISATION: 'debit', VERSEMENT: 'debit' };

  // Vocabulaire de base (mots courants des libellés d'une caisse d'école). Complété à
  // l'exécution par le vocabulaire appris dans le classeur de l'utilisateur.
  const BASE_LEXICON = (
    "école écoles classe classes élève élèves enseignant enseignants enseignante maîtres maîtresse " +
    "camp camps mini-camp course courses voyage voyages excursion sortie sorties journée journées nuit " +
    "ski neige montagne raquettes patinoire piscine palmes marche forêt jardin permaculture plantes graines bulbes " +
    "engrais piquets bordures bacs pots fresque peinture pinceau pinceaux feutre feutres crayons marqueurs stylos stylet " +
    "papier carton emballage tissu tissus nappe serviettes coussins tapis table tables chaises tabourets meuble meubles " +
    "rangement aménagement stockage boîtes boites caisses clés câbles réseau informatique informatiques écran ordinateur " +
    "matériel pharmacie médicaments santé vaccination anti-stress couverture lestée chariot pliable piles gants " +
    "repas collation collations croissants pain pain-choc sandwich sandwichs fruits pommes jus boissons bouteilles eaux thé thés " +
    "café chocolat glaces bonbons galettes crème farine riz miel champagne apéritif aliments nourriture cuisine resto " +
    "gluten lactose préparé produits divers besoins particuliers " +
    "fête fêtes noël cortège spectacle concert chœur chœurs orchestre musique musical musicale musiciens partitions flûtes " +
    "répétition répétitions séminaire séance bilan réunion conférence soirée numérique animation atelier ateliers " +
    "intervenant intervenante intervenants externe médiation défraiement défraichement frais douane transport trajets " +
    "affiches flyers poster panneau panneaux décoration décorations décors exposition photo photos logo stickers t-shirts " +
    "livres jeux ballons balles buts foot ping-pong boxe multi-sports relais match activité physique équipe " +
    "vente ventes stand marché pâtisseries fondues caisse recette bourse communale retrait remboursement décompte avance " +
    "participation parents cadeau cadeaux prix remerciements jubilaires départ départs arrivée nouveaux nouvelle fin " +
    "semaine médias journalistes branché débranché branché-débranché inter-collège échange échanges linguistique linguistiques " +
    "pédagogique scolarité information d'information secrétariat municipalité responsables place salle cours " +
    "janvier février mars avril mai juin juillet août septembre octobre novembre décembre " +
    "pléiades diablerets leysin villars cojonnex clos-béguin grand-pré echallens narcisse ricochet prodega juventute lift slam " +
    "complémentaire supplémentaire fond fonds point points rond-point achat achats location réparation entretien nettoyage abonnement " +
    "billet billets entrée entrées train bus cars taxi essence parking hôtel auberge cabane chalet refuge hébergement logement " +
    "petit-déjeuner déjeuner dîner souper pique-nique goûter boisson lait sirop sucre beurre fromage raclette viande légumes salade " +
    "dessert gâteau gâteaux tarte tartes cake biscuits chips bricolage colle ciseaux scotch ruban laine perles bois clous outils outil " +
    "vernis ampoules lampe lampes batterie batteries chargeur adaptateur écouteurs casque casques enceinte micro caméra appareil " +
    "impression impressions photocopies reliure plastification carte cartes timbres enveloppes courrier offert offerts acheté achetés " +
    "payé payée reçu reçue remis versé prêté solde restant reste différence erreur correction annulation retour retours " +
    "lundi mardi mercredi jeudi vendredi samedi dimanche maître maîtresses professeur professeurs direction directeur directrice " +
    "doyen doyenne secrétaire concierge infirmière psychologue logopédiste médiateur médiatrice bibliothèque bibliothécaire " +
    "informaticien aula gymnase terrain stade bassin vestiaires accueil visite visites guide guides musée théâtre cinéma zoo " +
    "exposition exposé exposés projet projets thème semestre trimestre année scolaire vacances rentrée mémoire souvenir souvenirs " +
    "réserve avance frais participation groupe groupes pièce pièces cheque chèque espèces monnaie caisse caissier caissière"
  ).split(/\s+/).filter(Boolean);

  // Désignations de classes (Vaud) : 1P…8P, 9S…11S, 9VP…11VG, groupes ACC, OS, LAT…
  const BASE_CLASS_TOKENS = (
    "1P 2P 3P 4P 5P 6P 7P 8P 9S 10S 11S 9VP 10VP 11VP 9VG 10VG 11VG 1-2P 3-4P 5-6P 7-8P 1-4P 5-8P 1-8P 7-11S 9-11S 10-11S 9-10S " +
    "ACC OS LAT DEV RAC MITIC"
  ).split(/\s+/);

  // Paires de caractères souvent confondus par l'OCR (dans les deux sens)
  const CONFUSION_GROUPS = [
    'il1I|!t', 'o0OQcedpqb', 'sS58zZ', 'nuhrmvw', 'œoe', 'gqy9', 'B8E3', 'DO0', 'Z2', 'G6C', 'çc', 'éèêeë', 'àâa', 'ûùu', 'ïîi', 'ff', 'rv', 'kh',
  ];
  const CONFUSABLE = new Map();
  for (const g of CONFUSION_GROUPS) for (const c of g) {
    if (!CONFUSABLE.has(c)) CONFUSABLE.set(c, new Set());
    for (const d of g) CONFUSABLE.get(c).add(d);
  }

  /* ------------------------------------------------------------------ */
  /* Utilitaires texte                                                    */
  /* ------------------------------------------------------------------ */

  function stripAccents(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function wordKey(s) {
    return stripAccents(String(s || '')).toLowerCase().replace(/œ|oe/g, 'o').replace(/[\u2019`\u00B4]/g, "'");
  }

  function levenshtein(a, b) {
    a = String(a); b = String(b);
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = new Array(b.length + 1);
    let cur = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      const t = prev; prev = cur; cur = t;
    }
    return prev[b.length];
  }

  // Corrections OCR classiques dans une zone qui ne doit contenir que des chiffres.
  function ocrDigits(s) {
    return String(s || '')
      .replace(/[OoQ]/g, '0')
      .replace(/[Il|!]/g, '1')
      .replace(/[Ss]/g, '5')
      .replace(/[Bb]/g, '8');
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function uniq(arr) {
    return Array.from(new Set(arr));
  }

  /* ------------------------------------------------------------------ */
  /* Normalisations                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * "CHF 10'OOO.OQ" -> 10000 ; "CHF2'500. 00" -> 2500 ; "CHF 29. 70" -> 29.7
   * Retourne null si la chaîne n'est pas un montant lisible.
   * lenient = true : accepte des lectures plus abîmées ("CHF rooo. oo" -> 1000).
   */
  function normalizeAmount(raw, lenient) {
    if (raw == null) return null;
    let t = String(raw)
      .replace(/CHF|CHf|Fr\.?|SFr\.?|Frs\.?/gi, ' ')
      .replace(/[\u2019\u2018'`\u00B4"\u00A0]/g, ' ')
      .trim();
    if (!t) return null;
    if (lenient) {
      // "r" en tête = "1'" mal lu ; lettres isolées collées aux chiffres
      t = t.replace(/^r(?=[\d0OoQ])/i, '1').replace(/(?<=\d)r(?=[\d0OoQ])/g, '1');
      t = t.replace(/[Ss]/g, '5').replace(/[Bb]/g, '8').replace(/[Zz]/g, '2').replace(/[Gg]/g, '6');
    }
    // Séparateur décimal : dernier point/virgule suivi de 2 chiffres (ou lettres OCR)
    const m = t.match(/^(.*?)[.,]\s*([0-9OoQIl|!Ss]{2})\s*$/);
    let intPart;
    let decPart = '00';
    if (m) {
      intPart = m[1];
      decPart = ocrDigits(m[2]);
    } else {
      intPart = t;
    }
    intPart = intPart.replace(/[\s\-\u2013\u2014.,_]/g, '');
    intPart = intPart.replace(/[OoQ]/g, '0').replace(/[Il|!]/g, '1');
    if (!/^\d{1,9}$/.test(intPart) || !/^\d{2}$/.test(decPart)) return null;
    const val = parseInt(intPart, 10) + parseInt(decPart, 10) / 100;
    return round2(val);
  }

  /**
   * "51000. 3662. 50'" -> "51000.3662.50" ; "9100. 104" -> "9100.104"
   */
  function normalizeAccount(raw) {
    if (raw == null) return null;
    let t = String(raw)
      .replace(/[\s\u00A0'\u2019\u2018`\u00B4"]/g, '')
      .replace(/[,;:]/g, '.')
      .replace(/[OoQ]/g, '0')
      .replace(/[Il|!]/g, '1');
    const m = t.match(/(\d{4,5})\.(\d{3,4})(?:\.(\d{2}))?/);
    if (!m) return null;
    return m[3] != null ? `${m[1]}.${m[2]}.${m[3]}` : `${m[1]}.${m[2]}`;
  }

  function accountsClose(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    return a.length === b.length && levenshtein(a, b) <= 1;
  }

  /**
   * Cherche une date jj.mm.aaaa (ou jj.mm.aa) dans un texte. Retourne 'AAAA-MM-JJ' ou null.
   */
  function findDate(text) {
    if (!text) return null;
    const t = String(text).replace(/[OoQ]/g, '0').replace(/[Il|!]/g, '1');
    const valide = (jj, mm, aa, len2) => {
      const d = parseInt(jj, 10);
      const mo = parseInt(mm, 10);
      let y = parseInt(aa, 10);
      if (len2) y += 2000;
      if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 2000 && y <= 2100) {
        return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      return null;
    };
    // forme normale : jj.mm.aaaa, jj/mm/aa, jj-mm-aaaa
    const re = /(\d{1,2})\s*[./\-]\s*(\d{1,2})\s*[./\-]\s*(\d{4}|\d{2})(?!\d)/g;
    let m;
    while ((m = re.exec(t))) {
      const iso = valide(m[1], m[2], m[3], m[3].length === 2);
      if (iso) return iso;
    }
    // l'OCR perd parfois un séparateur : « 11 12. 2025 ». On l'accepte si l'année a
    // quatre chiffres et qu'au moins un vrai séparateur subsiste, pour éviter de prendre
    // une suite de nombres quelconque pour une date.
    const re2 = /(\d{1,2})\s*([./\-]|\s)\s*(\d{1,2})\s*([./\-]|\s)\s*(\d{4})(?!\d)/g;
    while ((m = re2.exec(t))) {
      const ponctuel = /[./\-]/.test(m[2]) || /[./\-]/.test(m[4]);
      if (!ponctuel) continue;
      const iso = valide(m[1], m[3], m[5], false);
      if (iso) return iso;
    }
    return null;
  }

  function isoToDisplay(iso) {
    if (!iso) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
  }

  function displayToIso(s) {
    if (!s) return null;
    const t = String(s).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    return findDate(t);
  }

  /**
   * Reconnaît le "type" en tête du libellé (REMBOURSEMENT, AVANCE, ...).
   * Retourne { type, rest } ; type = null si aucun mot en majuscules en tête.
   */
  function splitType(firstLine) {
    const line = String(firstLine || '').trim();
    if (!line) return { type: null, rest: '' };
    const words = line.split(/\s+/);
    const upper = [];
    for (const w of words) {
      const clean = stripAccents(w).replace(/[^A-Za-z]/g, '');
      if (clean.length >= 2 && clean === clean.toUpperCase()) upper.push(w);
      else break;
    }
    if (!upper.length) return { type: null, rest: line, exact: false };
    let typeRaw = upper.join(' ');
    const read = typeRaw;
    let rest = words.slice(upper.length).join(' ');
    const canon = canonicalType(typeRaw);
    if (canon) typeRaw = canon;
    else if (upper.length > 1) {
      // Un seul mot en majuscules reconnu ? on retente sur le 1er mot
      const c1 = canonicalType(upper[0]);
      if (c1) {
        typeRaw = c1;
        rest = words.slice(1).join(' ');
      }
    }
    // exact : le type a été lu tel quel (pas de correction approximative)
    return { type: typeRaw, rest: rest.trim(), exact: typeKey(read) === typeRaw || typeKey(upper[0]) === typeRaw };
  }

  function typeKey(raw) {
    return stripAccents(raw).toUpperCase().replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function canonicalType(raw) {
    const key = typeKey(raw);
    if (!key) return null;
    let best = null;
    let bestDist = Infinity;
    for (const t of KNOWN_TYPES) {
      const d = levenshtein(key, t);
      if (d < bestDist) { bestDist = d; best = t; }
    }
    const tol = key.length >= 10 ? 3 : key.length >= 6 ? 2 : 0;
    if (best && bestDist <= tol) return best;
    return null;
  }

  // "A. Dupraz", "Ch. Marendaz", "A.-L. Delacroix", "F.N. Ravel", "J. Tissot (donné à ...)", "Mme Dupont"
  // L'initiale peut avoir été lue « l » ou « 1 » à la place de « I » (confusion fréquente).
  const PERSON_RE = /^((?:[A-ZÀ-Ýl1][a-zà-ÿ]{0,3}\.\s*-?\s*)+)\s*([A-ZÀ-Ý][A-Za-zÀ-ÿ'\-]+(?:\s+[A-ZÀ-Ý][A-Za-zÀ-ÿ'\-]+)*)(.*)$/;

  /**
   * Remet en majuscule une initiale lue en minuscule (« l. Scoziero »). Le « l » minuscule et le
   * « 1 » sont souvent un « I » mal lu : on ne tranche que si les noms connus le confirment,
   * sinon on garde la lettre lue, simplement en majuscule.
   */
  function fixInitials(person, index) {
    let t = String(person || '').replace(/(^|[\s.\-])([a-zà-ÿ])(?=\.)/g, (m, before, c) => before + c.toUpperCase());
    t = t.replace(/(^|[\s.\-])1(?=\.)/g, (m, before) => before + 'I');
    if (!index || !index.persons || !index.persons.length) return t;
    const m = PERSON_RE.exec(t.trim());
    if (!m) return t;
    const initials = m[1].replace(/\s+/g, '');
    const key = wordKey(m[2]);
    const connus = index.persons.filter((p) => p.key === key);
    if (!connus.length || connus.some((p) => p.initials === initials)) return t;
    // même nom de famille, initiales proches (I/L/1 confondus) : on retient celles du classeur
    const norm = (x) => x.replace(/[IL1]/g, 'I');
    const match = connus.find((p) => norm(p.initials) === norm(initials));
    return match ? `${match.initials.replace(/\.(?=[A-Z])/g, '. ')} ${m[2]}${m[3] || ''}`.replace(/\s+/g, ' ').trim() : t;
  }

  function looksLikePerson(line) {
    const t = String(line || '').trim();
    if (!t) return false;
    if (PERSON_RE.test(t)) return true;
    if (/^(Mme|Mlle|M\.|Mr|M)\s+[A-ZÀ-Ý]/.test(t)) return true;
    return false;
  }

  function capitalizeFirst(s) {
    const t = String(s || '').trim();
    if (!t) return t;
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  /**
   * Compose le libellé du journal : "TYPE - Description - Personne"
   */
  function formatLibelle(type, description, person) {
    const parts = [];
    if (type) parts.push(type.trim());
    if (description) parts.push(capitalizeFirst(description));
    if (person) parts.push(person.trim());
    return parts.join(' - ');
  }

  /**
   * Nettoie une description OCR : "du 12. 12. 2024" -> "du 12.12.2024", "11 VP/4" -> "11VP/4"...
   */
  function cleanDescription(s) {
    let t = String(s || '').replace(/\s+/g, ' ').trim();
    // « 12. 12. 2024 » → « 12.12.2024 » : un point ou une barre suivis d'un espace sont
    // un artefact de l'OCR. En revanche « 5P/6 - 20 élèves » garde son tiret entouré
    // d'espaces : c'est une vraie séparation écrite sur la pièce.
    for (let i = 0; i < 3; i++) {
      t = t.replace(/(\d)\s*([./])\s+(\d)/g, '$1$2$3');
      t = t.replace(/(\d)-\s+(\d)/g, '$1-$2');
    }
    t = t.replace(/\b(\d{1,2})\s+(VP|VG)\b/g, '$1$2');
    t = t.replace(/\b(\d{1,2}(?:VP|VG|P|S))\s*\/\s*(\d{1,2})\b/g, '$1/$2');
    t = t.replace(/\s+([,;:!?])/g, '$1');
    return t;
  }

  /* ------------------------------------------------------------------ */
  /* Vocabulaire (appris dans le classeur) et corrections OCR               */
  /* ------------------------------------------------------------------ */

  const CLASS_TOKEN_RE = /^\d{1,2}(?:-\d{1,2})?(?:VP|VG|P|S)(?:\/\d{1,2})?$/;

  function emptyVocabulary() {
    return { words: [], persons: [], classTokens: [], accounts: [], typeAccounts: [], typeSides: [], accountSides: [], objetAccounts: [] };
  }

  // Objets d'activité reconnus dans un libellé (mots-clés -> objet), du plus précis au plus général
  const OBJETS = [
    ['mini-camp', 'Mini-camp'], ['minicamp', 'Mini-camp'], ['camp', 'Camp'],
    ["course d'école", "Course d'école"], ['course d’école', "Course d'école"], ['course', "Course d'école"],
    ["voyage d'étude", "Voyage d'étude"], ['voyage', "Voyage d'étude"],
    ['échange', 'Échange linguistique'], ['echange', 'Échange linguistique'],
    ['cours de ski', 'Cours de ski'], ['ski', 'Cours de ski'],
    ['collation', 'Collation'], ['repas', 'Repas'], ['apéritif', 'Repas'], ['aperitif', 'Repas'],
    ['bourse', 'Bourse communale'], ['caisse de classe', 'Caisse de classe'],
    ['matériel', 'Matériel'], ['materiel', 'Matériel'], ['fourniture', 'Matériel'],
    ['cadeau', 'Cadeau'], ['départ', 'Cadeau'], ['depart', 'Cadeau'],
  ];
  const OBJET_LIST = ["Course d'école", 'Camp', 'Mini-camp', "Voyage d'étude", 'Échange linguistique', 'Cours de ski', 'Collation', 'Repas', 'Matériel', 'Caisse de classe', 'Bourse communale', 'Cadeau', 'Autre'];

  /** Objet d'activité d'une description de libellé (« Camp 8P/3 du 12-16.05 » -> Camp), ou « Autre ». */
  function objetOf(text) {
    const t = stripAccents(String(text || '')).toLowerCase();
    for (const [k, v] of OBJETS) if (t.includes(stripAccents(k).toLowerCase())) return v;
    return 'Autre';
  }

  /** Degré scolaire d'après la classe citée : « 5P/3 » -> P (primaire), « 9S », « 10VP/4 » -> S (secondaire), sinon null. */
  function degreOf(text) {
    const m = /\b\d{1,2}(?:-\d{1,2})?\s*(P|S|VP|VG)\b/.exec(String(text || ''));
    if (!m) return null;
    return m[1] === 'P' ? 'P' : 'S';
  }

  /**
   * Compte habituel pour un type d'écriture, un objet et un degré, d'après le classeur
   * (vocab.objetAccounts, agrégé avec n) et l'historique du lot. Du plus précis au plus général :
   * (type, objet, degré) -> (type, objet) -> (type). Renvoie [{ compte, n, niveau }] classés.
   */
  function suggestAccountFor(type, objet, degre, vocab, history) {
    const key = stripAccents(type || '').toUpperCase();
    if (!key) return [];
    const list = ((vocab && vocab.objetAccounts) || []).concat(history || []);
    const levels = [
      (h) => objet && h.objet === objet && degre && h.degre === degre,
      (h) => objet && h.objet === objet,
      (h) => true,
    ];
    for (let lvl = 0; lvl < levels.length; lvl++) {
      const counts = new Map();
      for (const h of list) {
        if (!h || !h.compte || stripAccents(h.type || '').toUpperCase() !== key) continue;
        if (!levels[lvl](h)) continue;
        counts.set(h.compte, (counts.get(h.compte) || 0) + (h.n || 1));
      }
      if (counts.size) return Array.from(counts, ([compte, n]) => ({ compte, n, niveau: lvl })).sort((a, b) => b.n - a.n);
    }
    return [];
  }

  /**
   * Apprend le vocabulaire à partir des écritures d'un classeur
   * ({libelle, compte}). Retourne un objet sérialisable (tableaux).
   */
  function learnVocabulary(entries) {
    const words = new Map();
    const persons = new Map();
    const classTokens = new Set();
    const accounts = new Set();
    const typeAccounts = [];
    const typeSides = [];
    const accountSides = [];
    const objetAccounts = [];
    for (const e of entries || []) {
      const lib = String(e.libelle || '').trim();
      if (!lib || /^solde/i.test(lib)) continue;
      const compte = e.compte ? normalizeAccount(e.compte) : null;
      if (compte) accounts.add(compte);
      const parts = lib.split(' - ').map((p) => p.trim()).filter(Boolean);
      let type = null;
      if (parts.length) type = splitType(parts[0]).type;
      if (type && compte) typeAccounts.push({ type, compte });
      if (type && compte) {
        const desc = parts.slice(1).join(' ');
        objetAccounts.push({ type, objet: objetOf(desc), degre: degreOf(desc), compte });
      }
      {
        const d = Number(e.debit) || 0;
        const c = Number(e.credit) || 0;
        const side = d && !c ? 'debit' : (c && !d ? 'credit' : null);
        if (side && type) typeSides.push({ type, side });
        if (side && compte) accountSides.push({ compte, side });
      }
      let body = parts;
      if (parts.length >= 2 && looksLikePerson(parts[parts.length - 1])) {
        const p = parts[parts.length - 1].replace(/\s*\(.*\)\s*$/, '').trim();
        persons.set(wordKey(p), p);
        body = parts.slice(0, -1);
      }
      for (const seg of body) {
        for (const tok of seg.split(/[\s,;:()]+/)) {
          const w = tok.replace(/^[^A-Za-zÀ-ÿœŒ0-9]+|[^A-Za-zÀ-ÿœŒ0-9]+$/g, '');
          if (!w) continue;
          if (CLASS_TOKEN_RE.test(w) || /^[A-Z]{2,5}$/.test(w)) { classTokens.add(w); continue; }
          // "d'école" -> "école"
          const m = /^[dlDLjJnNsS]['\u2019](.+)$/.exec(w);
          const core = m ? m[1] : w;
          if (/^[A-Za-zÀ-ÿœŒ][A-Za-zÀ-ÿœŒ'\u2019\-]{2,}$/.test(core) && !/^[A-Z]+$/.test(core)) {
            const k = wordKey(core);
            if (!words.has(k)) words.set(k, core);
          }
        }
      }
    }
    return {
      words: Array.from(words.values()),
      persons: Array.from(persons.values()),
      classTokens: Array.from(classTokens),
      accounts: Array.from(accounts),
      typeAccounts,
      typeSides,
      accountSides,
      objetAccounts,
    };
  }

  function mergeVocabulary(a, b) {
    a = a || emptyVocabulary(); b = b || emptyVocabulary();
    const byKey = (arr) => { const m = new Map(); for (const w of arr || []) m.set(wordKey(w), w); return m; };
    const words = byKey(a.words); for (const [k, v] of byKey(b.words)) if (!words.has(k)) words.set(k, v);
    const persons = byKey(a.persons); for (const [k, v] of byKey(b.persons)) if (!persons.has(k)) persons.set(k, v);
    const seen = new Set();
    const typeAccounts = [];
    for (const t of (a.typeAccounts || []).concat(b.typeAccounts || [])) {
      typeAccounts.push(t);
    }
    return {
      words: Array.from(words.values()),
      persons: Array.from(persons.values()),
      classTokens: uniq((a.classTokens || []).concat(b.classTokens || [])),
      accounts: uniq((a.accounts || []).concat(b.accounts || [])),
      typeAccounts,
      typeSides: (a.typeSides || []).concat(b.typeSides || []),
      accountSides: (a.accountSides || []).concat(b.accountSides || []),
      objetAccounts: (a.objetAccounts || []).concat(b.objetAccounts || []),
    };
  }

  // Index rapide pour les corrections
  function buildIndex(vocab) {
    vocab = vocab || emptyVocabulary();
    const words = new Map();
    for (const w of BASE_LEXICON.concat(vocab.words || [])) {
      const k = wordKey(w);
      if (!words.has(k)) words.set(k, w);
    }
    const classTokens = new Set(BASE_CLASS_TOKENS.concat(vocab.classTokens || []));
    const persons = [];
    for (const p of vocab.persons || []) {
      const m = PERSON_RE.exec(p);
      if (m) persons.push({ full: p, initials: m[1].replace(/\s+/g, ''), surname: m[2], key: wordKey(m[2]) });
    }
    // Sens attendu par type : uniquement les types dont le classeur ne montre qu'un seul sens
    const counts = new Map();
    for (const t of vocab.typeSides || []) {
      const k = stripAccents(t.type || '').toUpperCase();
      if (!k) continue;
      if (!counts.has(k)) counts.set(k, { debit: 0, credit: 0 });
      counts.get(k)[t.side] += t.n || 1;
    }
    const expectedSide = new Map();
    for (const [k, c] of counts) {
      const n = c.debit + c.credit;
      if (n < MIN_SIDE_SAMPLES) continue;
      if (c.credit === 0) expectedSide.set(k, { side: 'debit', n });
      else if (c.debit === 0) expectedSide.set(k, { side: 'credit', n });
    }
    // Sens attendu par compte : un compte dont toutes les écritures du classeur vont dans le
    // même sens (sur un nombre suffisant) sert aussi de contrôle.
    const accCounts = new Map();
    for (const t of vocab.accountSides || []) {
      const k = t.compte;
      if (!k) continue;
      if (!accCounts.has(k)) accCounts.set(k, { debit: 0, credit: 0 });
      accCounts.get(k)[t.side] += t.n || 1;
    }
    const expectedSideByAccount = new Map();
    for (const [k, c] of accCounts) {
      const n = c.debit + c.credit;
      if (n < MIN_SIDE_SAMPLES) continue;
      if (c.credit === 0) expectedSideByAccount.set(k, { side: 'debit', n });
      else if (c.debit === 0) expectedSideByAccount.set(k, { side: 'credit', n });
    }
    return { words, classTokens, persons, accounts: new Set(vocab.accounts || []), expectedSide, expectedSideByAccount };
  }

  // Nombre minimal d'écritures du classeur pour retenir un sens comme constant
  const MIN_SIDE_SAMPLES = 5;

  /**
   * Sens attendu pour un compte de contrepartie d'après le plan comptable :
   * un compte de revenus (2e groupe commençant par 4) entre en caisse (débit).
   * Retourne 'debit', ou null si aucune règle sûre.
   */
  function expectedSideFromAccount(compte) {
    const m = /^\d{4,5}\.(\d)/.exec(String(compte || ''));
    if (m && m[1] === '4') return 'debit';
    return null;
  }

  function singleSubstitutionConfusable(a, b) {
    if (a.length !== b.length) return false;
    let diff = -1;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) { if (diff >= 0) return false; diff = i; }
    }
    if (diff < 0) return true;
    const x = a[diff]; const y = b[diff];
    const set = CONFUSABLE.get(x);
    return !!(set && set.has(y));
  }

  /**
   * Corrige un mot (lettres) d'après le lexique. Retourne le mot corrigé ou null.
   */
  function correctWord(word, index) {
    const core = word;
    if (core.length < 4) return null;
    const key = wordKey(core);
    if (!/^[A-Za-zÀ-ÿœŒ][A-Za-zÀ-ÿœŒ'\u2019\-]+$/.test(core)) return null;
    if (index.words.has(key)) {
      // mot connu : on restaure seulement la ligature œ perdue par l'OCR ("chour" -> "chœur")
      const form = index.words.get(key);
      if (/œ/.test(form) && !/œ/.test(core) && wordKey(form) === key) {
        const out = /^[A-ZÀ-Ý]/.test(core) ? form.charAt(0).toUpperCase() + form.slice(1) : form;
        return out === core ? null : out;
      }
      return null;
    }
    if (/^[A-Z]{2,}$/.test(stripAccents(core))) return null; // sigle
    const len = key.length;
    const maxD = len >= 9 ? 2 : 1;
    let best = null;
    let bestD = Infinity;
    let ties = 0;
    for (const [k, form] of index.words) {
      if (Math.abs(k.length - len) > maxD) continue;
      if (k[0] !== key[0]) continue; // la 1re lettre doit correspondre
      const d = levenshtein(key, k);
      if (d === 0) return null;
      if (d > maxD) continue;
      if (d < bestD) { bestD = d; best = form; ties = 0; } else if (d === bestD) ties++;
    }
    if (!best || ties) return null;
    const bestKey = wordKey(best);
    if (bestD === 1) {
      if (key.length === bestKey.length) {
        // substitution : seulement entre caractères confondus par l'OCR (ou mot long)
        if (len < 7 && !singleSubstitutionConfusable(key, bestKey)) return null;
      } else {
        // insertion/suppression : pas pour un simple pluriel, et mot assez long
        if (len < 7) return null;
        if (key.replace(/s$/, '') === bestKey.replace(/s$/, '')) return null;
      }
    } else if (bestD === 2) {
      if (key[key.length - 1] !== bestKey[bestKey.length - 1]) return null;
    }
    // conserve la casse de la 1re lettre
    const out = /^[A-ZÀ-Ý]/.test(core) ? best.charAt(0).toUpperCase() + best.slice(1) : best;
    return out === core ? null : out;
  }

  /**
   * Corrige un jeton contenant des chiffres (désignation de classe "98" -> "9S", "7-118" -> "7-11S").
   */
  function correctClassToken(tok, index) {
    if (CLASS_TOKEN_RE.test(tok)) return null;
    if (!/\d/.test(tok) || tok.length < 2 || tok.length > 8) return null;
    if (/^\d+$/.test(tok) && tok.length !== 2 && tok.length !== 3) return null;
    if (/^\d{1,2}[.,]\d{2}$/.test(tok)) return null; // montant
    let best = null;
    let ties = 0;
    for (const c of index.classTokens) {
      if (c.length !== tok.length) continue;
      if (!/\d/.test(c)) continue;
      if (levenshtein(tok, c) === 1 && tok[0] === c[0]) {
        if (best) ties++; else best = c;
      }
    }
    // "98" -> "9S" seulement si le jeton finit par 8/5 (S confondu) ou contient une lettre
    if (best && !ties && (/[85]$/.test(tok) || /[A-Za-z]/.test(tok))) return best;
    return null;
  }

  /**
   * Corrige les mots d'une description. Retourne { text, notes[] }.
   */
  function correctDescription(text, index) {
    const notes = [];
    if (!text || !index) return { text, notes };
    const out = String(text).split(/(\s+)/).map((tok) => {
      if (!tok || /^\s+$/.test(tok)) return tok;
      // séparer ponctuation de tête/queue
      const m = /^([^A-Za-zÀ-ÿœŒ0-9]*)(.*?)([^A-Za-zÀ-ÿœŒ0-9]*)$/.exec(tok);
      const lead = m[1]; let core = m[2]; const trail = m[3];
      if (!core) return tok;
      // "d'expbsition" -> préfixe élidé
      const el = /^([dlDLjJnNsS][\u2019'])(.+)$/.exec(core);
      const prefix = el ? el[1] : '';
      const word = el ? el[2] : core;
      let fixed = null;
      if (/\d/.test(word)) fixed = correctClassToken(word, index);
      else fixed = correctWord(word, index);
      if (fixed && fixed !== word) {
        notes.push(`${word} → ${fixed}`);
        return lead + prefix + fixed + trail;
      }
      return tok;
    }).join('');
    return { text: out, notes };
  }

  /**
   * Corrige un nom de personne d'après les personnes connues ("N. Moret" -> "N. Morel").
   */
  function correctPerson(person, index) {
    if (!person || !index || !index.persons.length) return null;
    const m = PERSON_RE.exec(person.trim());
    if (!m) return null;
    const initials = m[1].replace(/\s+/g, '');
    const surname = m[2];
    const rest = m[3] || '';
    const key = wordKey(surname);
    let best = null;
    let bestD = Infinity;
    for (const p of index.persons) {
      if (p.initials !== initials) continue;
      const d = levenshtein(key, p.key);
      if (d < bestD) { bestD = d; best = p; }
    }
    if (!best || bestD === 0) return null;
    const maxD = key.length >= 8 ? 2 : key.length >= 5 ? 1 : 0;
    if (bestD > maxD) return null;
    return `${m[1].trim()} ${best.surname}${rest}`.replace(/\s+/g, ' ').trim();
  }

  /* ------------------------------------------------------------------ */
  /* Conversion pdf.js -> mots positionnés                                */
  /* ------------------------------------------------------------------ */

  /**
   * Convertit un TextContent pdf.js en liste de mots { str, x, y, h, w }.
   * viewport : page.getViewport({scale:1}) ; Util : pdfjsLib.Util
   */
  function itemsFromTextContent(textContent, viewport, Util) {
    const out = [];
    for (const it of textContent.items) {
      if (typeof it.str !== 'string') continue;
      if (!it.str.trim()) continue;
      const t = Util.transform(viewport.transform, it.transform);
      const h = Math.hypot(t[2], t[3]) || it.height || 0;
      out.push({ str: it.str, x: t[4], y: t[5], h, w: it.width * viewport.scale });
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Regroupement en lignes                                                */
  /* ------------------------------------------------------------------ */

  /**
   * Regroupe les mots en lignes : deux mots sont sur la même ligne si leurs
   * hauteurs se chevauchent nettement (tolère les scans légèrement inclinés).
   */
  function groupLines(words, tol) {
    tol = tol || 5;
    const sorted = words.slice().sort((a, b) => a.y - b.y || a.x - b.x);
    const lines = [];
    for (const w of sorted) {
      const h = w.h && w.h > 2 ? w.h : 10;
      let line = lines.length ? lines[lines.length - 1] : null;
      let same = false;
      if (line) {
        const lh = line.h || 10;
        const t = Math.max(tol, Math.min(h, lh) * 0.6);
        same = Math.abs(w.y - line.y) <= t;
      }
      if (!same) {
        line = { y: w.y, h, words: [] };
        lines.push(line);
      }
      line.words.push(w);
      line.y = line.words.reduce((s, x) => s + x.y, 0) / line.words.length;
      line.h = line.words.reduce((s, x) => s + (x.h > 2 ? x.h : 10), 0) / line.words.length;
    }
    for (const l of lines) {
      l.words.sort((a, b) => a.x - b.x);
      l.x = l.words[0].x;
      l.text = l.words.map((w) => w.str.trim()).join(' ').replace(/\s+/g, ' ').trim();
    }
    return lines;
  }

  function findWord(words, re) {
    for (const w of words) if (re.test(stripAccents(w.str).trim())) return w;
    return null;
  }

  function findWords(words, re) {
    return words.filter((w) => re.test(stripAccents(w.str).trim()));
  }

  /**
   * Un n° de compte peut être coupé en deux lignes par le scanner (« 51000.3151. » puis « 00 »),
   * ce qui donnerait un compte tronqué. On recolle un fragment court de chiffres à la ligne
   * précédente quand celle-ci ressemble à un compte inachevé.
   */
  function mergeAccountFragments(lines, issues, colName) {
    const out = [];
    for (const l of lines) {
      const prev = out.length ? out[out.length - 1] : null;
      const frag = /^[\s.]*([0-9OoQIl|!]{1,2})[\s.]*$/.exec(l.text);
      if (prev && frag) {
        const before = normalizeAccount(prev.text);
        const merged = normalizeAccount(prev.text + frag[1]);
        // On ne recolle que sur une ligne visiblement inachevée : compte illisible tel quel, ou
        // compte terminé par un séparateur auquel il manque la sous-rubrique (« 51000.3151. » +
        // « 00 »). Sans cela un nombre isolé de la colonne voisine allongerait un compte déjà
        // complet (« 9100. 104 » + « 50 » → 9100.1045) et le compte de caisse disparaîtrait.
        const inacheve = !before || (/[.,;:]\s*$/.test(prev.text) && merged && merged.split('.').length === 3 && before.split('.').length === 2);
        if (merged && merged !== before && inacheve) {
          if (issues) issues.push(`Compte ${colName.toUpperCase()} lu sur deux lignes (« ${prev.text} » + « ${l.text.trim()} ») : ${merged} retenu`);
          prev.text = prev.text + frag[1];
          prev.words = prev.words.concat(l.words);
          continue;
        }
      }
      out.push({ y: l.y, h: l.h, x: l.x, text: l.text, words: l.words.slice() });
    }
    return out;
  }

  // Rectangle englobant d'une liste de mots (coordonnées page, origine en haut à gauche)
  function boxOf(words) {
    if (!words || !words.length) return null;
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (const w of words) {
      const h = w.h && w.h > 2 ? w.h : 10;
      const wd = w.w && w.w > 0 ? w.w : String(w.str || '').length * h * 0.5;
      x0 = Math.min(x0, w.x); y0 = Math.min(y0, w.y - h);
      x1 = Math.max(x1, w.x + wd); y1 = Math.max(y1, w.y + h * 0.25);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /* ------------------------------------------------------------------ */
  /* Analyse d'une page                                                     */
  /* ------------------------------------------------------------------ */

  function isFormPage(words) {
    const flat = words.map((w) => stripAccents(w.str).toUpperCase()).join(' ');
    const hasPiece = /PIECE\s*COMPTABLE/.test(flat) || /P[1I]ECE\s*C0?OMPTABLE/.test(flat);
    const hasCols = /DOIT/.test(flat) && /AVOIR/.test(flat) && /SOMME/.test(flat);
    return hasPiece || hasCols;
  }

  /**
   * Découpe une page contenant plusieurs formulaires (plusieurs entêtes "PIECE COMPTABLE").
   * Retourne une liste de sous-pages { pageNumber, part, width, height, words }.
   */
  function splitForms(page) {
    const words = (page.words || []).filter((w) => w.str && w.str.trim());
    const heads = findWords(words, /^P[1I]?[EÉ]CE/i).filter((w) => {
      // "PIECE" suivi de "COMPTABLE" sur la même ligne, ou "PIECECOMPTABLE"
      if (/COMPTABLE/i.test(stripAccents(w.str))) return true;
      return words.some((o) => Math.abs(o.y - w.y) < 8 && o.x > w.x && /^C0?OMPTABLE/i.test(stripAccents(o.str)));
    }).sort((a, b) => a.y - b.y);
    // plusieurs entêtes séparées d'au moins 150 pt
    const cuts = [];
    for (const h of heads) if (!cuts.length || h.y - cuts[cuts.length - 1] > 150) cuts.push(h.y);
    if (cuts.length <= 1) return [page];
    const parts = [];
    for (let i = 0; i < cuts.length; i++) {
      const y0 = cuts[i] - 30;
      const y1 = i + 1 < cuts.length ? cuts[i + 1] - 30 : Infinity;
      parts.push({ pageNumber: page.pageNumber, part: i + 1, source: page.source, width: page.width, height: page.height, words: words.filter((w) => w.y >= y0 && w.y < y1) });
    }
    return parts;
  }

  /**
   * Analyse la couche texte d'une page (ou d'une partie de page).
   * page : { pageNumber, width, height, words: [{str,x,y,h}] }
   * Retourne null si la page n'est pas une pièce comptable, sinon les champs bruts.
   */
  function analyzePage(page) {
    const words = (page.words || []).filter((w) => w.str && w.str.trim());
    if (!words.length) return null;
    const W = page.width || 595;
    const H = page.height || 842;
    if (!isFormPage(words)) return null;

    const wDoit = findWord(words, /^DOIT/i);
    const wSomme = findWord(words, /^SOMME/i);
    const wAvoir = findWord(words, /^AVOIR/i);
    const wLibelle = findWord(words, /^Libell/i);
    const wPiece = findWord(words, /^P[1I]?[EÉ]CE/i);
    // "Total" : le plus bas des mots "Total" situés sous "Libellé"
    const totals = findWords(words, /^Total/i).filter((w) => !wLibelle || w.y > wLibelle.y);
    const wTotal = totals.length ? totals.reduce((a, b) => (a.y > b.y ? a : b)) : null;

    // Frontières de colonnes (DOIT | SOMME | AVOIR)
    const b1 = wSomme ? wSomme.x - 18 : W * 0.52;
    const b2 = wAvoir ? wAvoir.x - 12 : W * 0.68;
    const col = (x) => (x < b1 ? 'doit' : x < b2 ? 'somme' : 'avoir');

    // Bandes horizontales
    const yHeader = wDoit ? wDoit.y : wSomme ? wSomme.y : wPiece ? wPiece.y + 32 : H * 0.13;
    const yLibelle = wLibelle ? wLibelle.y : yHeader + 105;
    const yTotal = wTotal ? wTotal.y : yLibelle + 170;

    const inBand = (w, y0, y1) => w.y > y0 + 4 && w.y < y1 - 4;

    // ---- Numéro de pièce : au-dessus de l'entête, colonne du milieu
    let no = null;
    let noRaw = null;
    let noWords = [];
    const topWords = words.filter((w) => w.y < yHeader - 6);
    for (const w of topWords.slice().sort((a, b) => a.x - b.x)) {
      if (col(w.x) !== 'somme') continue;
      const raw = w.str.trim();
      // le mot doit déjà contenir un chiffre : sinon « B », « S » ou « No », corrigés en 8, 5 et 0
      // par ocrDigits, passeraient pour le numéro de la pièce et arrêteraient la recherche
      if (!/\d/.test(raw)) continue;
      const t = ocrDigits(raw).replace(/[^\d]/g, '');
      if (/^\d{1,3}$/.test(t)) { no = parseInt(t, 10); noRaw = w.str; noWords = [w]; break; }
    }
    if (no == null) {
      const top = groupLines(topWords).map((l) => l.text).join(' ');
      const m = /(\d{1,3})\s*fe\b/i.exec(top) || /COMPTABLE\s*(\d{1,3})\b/i.exec(top);
      if (m) { no = parseInt(m[1], 10); noRaw = m[0]; }
    }

    // ---- Zone comptes / sommes : entre l'entête et "Libellé"
    const doit = [];
    const avoir = [];
    const sommes = [];
    const bandWords = words.filter((w) => inBand(w, yHeader, yLibelle));
    const colWords = { doit: [], somme: [], avoir: [] };
    const accountIssues = [];
    for (const c of ['doit', 'somme', 'avoir']) {
      colWords[c] = bandWords.filter((w) => col(w.x) === c);
      const lines = c === 'somme' ? groupLines(colWords[c]) : mergeAccountFragments(groupLines(colWords[c]), accountIssues, c);
      for (const l of lines) {
        if (c === 'somme') {
          // un montant nul n'existe pas sur une pièce : c'est une lecture ratée (« CHFQ'OOO.OO »)
          let a = normalizeAmount(l.text);
          if (a === 0) a = null;
          let len = a == null ? normalizeAmount(l.text, true) : null;
          if (len === 0) len = null;
          sommes.push({ raw: l.text, value: a, lenient: len });
        } else {
          const acc = normalizeAccount(l.text);
          if (acc) (c === 'doit' ? doit : avoir).push(acc);
        }
        // (la fusion des fragments est faite juste après, sur le texte des lignes)
      }
    }

    // ---- Total (ligne "Total", colonne du milieu)
    let total = null;
    let totalRaw = null;
    let totalLenient = null;
    let totalWords = [];
    if (wTotal) {
      const tw = words.filter((w) => Math.abs(w.y - yTotal) <= 8 && col(w.x) === 'somme');
      totalWords = tw;
      if (tw.length) {
        const l = groupLines(tw)[0];
        totalRaw = l.text;
        total = normalizeAmount(l.text);
        if (total === 0) total = null;
        if (total == null) {
          totalLenient = normalizeAmount(l.text, true);
          if (totalLenient === 0) totalLenient = null;
        }
      }
    }

    // ---- Libellé : entre "Libellé" et "Total", colonne de gauche
    const libWords = words.filter((w) => inBand(w, yLibelle, yTotal) && col(w.x) === 'doit');
    const libelleLines = groupLines(libWords).map((l) => l.text).filter((t) => t && /[A-Za-z0-9À-ÿ]/.test(t));

    // ---- Date : sous la ligne Total (à gauche), sinon sur la ligne Total
    let date = null;
    let dateRaw = null;
    let dateWords = [];
    const below = groupLines(words.filter((w) => w.y > yTotal + 6 && col(w.x) === 'doit'));
    for (const l of below) {
      const d = findDate(l.text);
      if (d) { date = d; dateRaw = l.text; dateWords = l.words; break; }
    }
    if (!date) {
      const same = groupLines(words.filter((w) => Math.abs(w.y - yTotal) <= 8 && col(w.x) === 'doit'));
      for (const l of same) {
        const d = findDate(l.text.replace(/^Total/i, ''));
        if (d) { date = d; dateRaw = l.text; dateWords = l.words; break; }
      }
    }
    const boxes = {
      no: boxOf(noWords),
      doit: boxOf(colWords.doit),
      somme: boxOf(colWords.somme),
      avoir: boxOf(colWords.avoir),
      total: boxOf(totalWords),
      libelle: boxOf(libWords),
      date: boxOf(dateWords),
    };

    return {
      pageNumber: page.pageNumber,
      part: page.part || null,
      source: page.source || 'text', // 'text' : couche texte du PDF ; 'ocr' : première passe OCR
      no,
      noRaw,
      doit,
      avoir,
      sommes,
      total,
      totalRaw,
      totalLenient,
      libelleLines,
      libelleWords: libWords,
      date,
      dateRaw,
      hasTotalWord: !!wTotal,
      hasLibelleWord: !!wLibelle,
      accountIssues,
      datesBelow: below.map((l) => l.text).filter((t) => findDate(t)),
      boxes,
      // géométrie du formulaire (points PDF) : frontières de colonnes et bandes horizontales
      layout: { width: W, height: H, b1, b2, yHeader, yLibelle, yTotal },
    };
  }

  /* ------------------------------------------------------------------ */
  /* Construction d'une écriture                                            */
  /* ------------------------------------------------------------------ */

  function buildEntry(info, options) {
    options = options || {};
    const caisse = options.caisse || DEFAULT_CAISSE;
    const index = options.index || null;
    const learnedAccounts = index ? index.accounts : new Set();
    const knownAccounts = options.knownAccounts || learnedAccounts;
    // drapeaux par champ : { level: 'doubt' | 'note', message }
    const flags = { no: [], date: [], compte: [], libelle: [], montant: [] };
    const warnings = [];
    const notes = [];
    const doubt = (field, message, action) => { warnings.push(message); if (flags[field]) flags[field].push({ level: 'doubt', message, action }); };
    const note = (field, message) => { notes.push(message); if (flags[field]) flags[field].push({ level: 'note', message }); };

    // ---- Libellé
    const lines = info.libelleLines.slice();
    let person = null;
    if (lines.length >= 2 && looksLikePerson(lines[lines.length - 1])) {
      person = fixInitials(lines.pop(), index);
    }
    const first = lines.shift() || '';
    const { type, rest, exact: typeExact } = splitType(first);
    let description = cleanDescription([rest, ...lines].filter(Boolean).join(' '));
    if (index) {
      const c = correctDescription(description, index);
      if (c.notes.length) { description = c.text; note('libelle', `Libellé corrigé : ${c.notes.join(', ')}`); }
      if (person) {
        const p = correctPerson(person, index);
        if (p) { note('libelle', `Nom corrigé : ${person} → ${p}`); person = p; }
      }
    }
    if (!info.libelleLines.length) doubt('libelle', 'Libellé non reconnu');
    else {
      // caractères qui n'existent pas dans un libellé : lecture ratée, souvent une mention
      // manuscrite ajoutée sur la pièce
      const illisibles = description.split(/\s+/).filter((t) => /[\^£<>*~$#{}\[\]\\|¦§¤©®µ¬¢]/.test(t));
      if (illisibles.length) doubt('libelle', `Libellé illisible par endroits (« ${illisibles.join(' ')} ») : à compléter d'après la pièce (mention manuscrite ?)`);
      if (!type) doubt('libelle', `Libellé sans type d'écriture en tête (REMBOURSEMENT, AVANCE…) : « ${first} »`);
      else if (!KNOWN_TYPES.includes(type)) doubt('libelle', `Type d'écriture inhabituel : « ${type} »`);
      if (!person) doubt('libelle', 'Aucun nom de personne trouvé en fin de libellé');
      if (index) {
        const unknown = unknownWords(description, index);
        if (unknown.length) doubt('libelle', `Mot(s) inconnu(s) du vocabulaire, peut-être mal lu(s) : ${unknown.map((w) => `« ${w} »`).join(', ')}`);
        if (person && index.persons.length) {
          const near = nearPerson(person, index);
          if (near) doubt('libelle', `Nom « ${person} » proche d'un nom connu (${near}) : à vérifier`);
        }
      }
    }

    // ---- Montant
    // Le Total en bas de la pièce fait foi ; la colonne SOMME, souvent laissée vide,
    // ne sert qu'à confirmer le total ou à le remplacer quand il manque.
    let amount = null;
    const sommeVals = info.sommes.map((s) => s.value).filter((v) => v != null);
    if (info.total != null) amount = info.total;
    else if (sommeVals.length) amount = sommeVals[0];
    if (amount == null) {
      const lenientVals = [info.totalLenient].concat(info.sommes.map((s) => s.lenient)).filter((v) => v != null);
      if (lenientVals.length) {
        amount = lenientVals[0];
        doubt('montant', `Montant difficile à lire (« ${info.totalRaw || (info.sommes[0] && info.sommes[0].raw) || '?'} ») : ${amount.toFixed(2)} proposé, à vérifier`);
      } else {
        doubt('montant', 'Montant non reconnu');
      }
    } else if (info.total != null && sommeVals.length && sommeVals.every((v) => v !== info.total)) {
      const sum = round2(sommeVals.reduce((a, b) => a + b, 0));
      if (sum === info.total) note('montant', `Plusieurs sommes (${sommeVals.join(' + ')}) : total ${info.total} retenu`);
      else doubt('montant', `Somme (${sommeVals.join(', ')}) différente du total (${info.total}) : vérifier le montant`);
    } else if (info.total == null && sommeVals.length > 1) {
      doubt('montant', `Plusieurs sommes lues (${sommeVals.join(', ')}) : première retenue`);
    }
    if (amount != null && amount === 0) doubt('montant', 'Montant nul');
    if (amount != null && amount >= 50000) doubt('montant', 'Montant inhabituellement élevé');

    // ---- Compte caisse mal lu ("9100.184") : reconnu s'il est proche et n'est pas un autre compte connu
    const fixAccount = (a) => {
      if (a !== caisse && accountsClose(a, caisse) && !knownAccounts.has(a)) {
        note('compte', `Compte caisse lu « ${a} » → ${caisse}`);
        return caisse;
      }
      return a;
    };
    const doitAcc = info.doit.map(fixAccount);
    const avoirAcc = info.avoir.map(fixAccount);

    // ---- Sens de l'écriture
    const doitOther = doitAcc.filter((a) => a !== caisse);
    const avoirOther = avoirAcc.filter((a) => a !== caisse);
    const doitCaisse = doitAcc.includes(caisse);
    const avoirCaisse = avoirAcc.includes(caisse);
    let side = null; // 'debit' = entrée en caisse, 'credit' = sortie
    let compte = null;
    let candidates = [];
    const sideFr = (x) => (x === 'debit' ? 'Débit (entrée en caisse)' : 'Crédit (sortie de caisse)');
    const swap = (attendu) => ({ type: 'swap', side: attendu });
    // Logique comptable du libellé (REMBOURSEMENT = sortie, PARTICIPATION = entrée…)
    const logicSide = sideFromType(type);
    const typeSure = !!logicSide && !!typeExact;

    if (doitCaisse && !avoirCaisse) {
      side = 'debit';
      candidates = avoirOther;
    } else if (avoirCaisse && !doitCaisse) {
      side = 'credit';
      candidates = doitOther;
    } else if (doitCaisse && avoirCaisse) {
      doubt('compte', `Le compte caisse ${caisse} figure au DOIT et à l'AVOIR : compte à corriger`);
      candidates = doitOther.concat(avoirOther);
      side = logicSide || guessSideFromType(type);
      if (!side) doubt('montant', 'Sens de l\'écriture (débit/crédit) à vérifier');
      else if (typeSure) note('montant', `Sens fixé par le libellé : « ${type} » = ${sideFr(side)}`);
      else doubt('montant', `Sens de l'écriture (${side === 'debit' ? 'débit' : 'crédit'}) déduit du type « ${type} » : à vérifier`);
    } else {
      if (!doitAcc.length && !avoirAcc.length) doubt('compte', 'Aucun n° de compte reconnu');
      else doubt('compte', `Le compte caisse ${caisse} n'apparaît pas sur la pièce : sens et compte à vérifier`);
      candidates = doitOther.concat(avoirOther);
      side = logicSide || guessSideFromType(type);
      if (!side) doubt('montant', 'Sens de l\'écriture (débit/crédit) inconnu');
      else if (typeSure) note('montant', `Sens fixé par le libellé : « ${type} » = ${sideFr(side)}`);
      else doubt('montant', `Sens de l'écriture (${side === 'debit' ? 'débit' : 'crédit'}) déduit du type : à vérifier`);
    }

    // La logique du libellé prime sur la position lue du compte caisse : une pièce remplie
    // à l'envers (ou une colonne mal lue) ne doit pas inverser le mouvement de caisse.
    if (logicSide && side && side !== logicSide) {
      const lu = side;
      side = logicSide;
      const msg = `Sens fixé par le libellé : « ${type} » = ${sideFr(logicSide)}, alors que la pièce place le compte caisse ${lu === 'debit' ? 'au DOIT' : 'à l\'AVOIR'} (pièce remplie à l'envers ?)`;
      if (typeSure) note('montant', msg);
      else doubt('montant', `${msg} – type d'écriture lu approximativement : à vérifier`, swap(lu));
    }

    const readCandidates = uniq(candidates); // comptes réellement lus sur la pièce
    if (candidates.length) {
      compte = candidates[0];
      if (uniq(candidates).length > 1) {
        doubt('compte', `Plusieurs comptes possibles : ${uniq(candidates).join(', ')}`);
      } else if (learnedAccounts.size && !knownAccounts.has(compte)) {
        // compte jamais vu : peut-être un chiffre mal lu -> on propose les comptes connus voisins
        const close = Array.from(knownAccounts).filter((k) => k !== caisse && accountsClose(compte, k));
        if (close.length) {
          doubt('compte', `Compte ${compte} jamais utilisé jusqu'ici, ressemble à ${close.join(' / ')} : à vérifier`);
          candidates = candidates.concat(close);
        } else {
          doubt('compte', `Compte ${compte} jamais utilisé jusqu'ici : à vérifier`);
        }
      }
    } else {
      doubt('compte', 'Compte de contrepartie non reconnu');
    }

    // Contrôle croisé du sens pour les types sans logique fixe (DECOMPTE…) : habitudes du
    // classeur par type d'écriture et par compte, nature du compte
    if (side && compte && !logicSide) {
      const key = stripAccents(type || '').toUpperCase();
      const exp = index && index.expectedSide ? index.expectedSide.get(key) : null;
      const expAcc = index && index.expectedSideByAccount ? index.expectedSideByAccount.get(compte) : null;
      if (exp && exp.side !== side) {
        doubt('montant', `Sens inhabituel : ${sideFr(side)} alors que les ${exp.n} écritures « ${type} » du classeur sont toutes en ${exp.side === 'debit' ? 'débit' : 'crédit'} : à vérifier sur la pièce`, swap(exp.side));
      } else if (expAcc && expAcc.side !== side) {
        doubt('montant', `Sens inhabituel : ${sideFr(side)} alors que les ${expAcc.n} écritures du compte ${compte} dans le classeur sont toutes en ${expAcc.side === 'debit' ? 'débit' : 'crédit'} : à vérifier sur la pièce`, swap(expAcc.side));
      } else {
        const accSide = expectedSideFromAccount(compte);
        if (accSide && accSide !== side) doubt('montant', `Sens inhabituel : ${sideFr(side)} sur un compte de recettes (${compte}) : à vérifier sur la pièce`, swap(accSide));
      }
    }

    for (const m of info.accountIssues || []) note('compte', m);
    if (info.datesBelow && info.datesBelow.length > 1) {
      const vues = uniq(info.datesBelow.map((t) => findDate(t)).filter(Boolean));
      if (vues.length > 1) doubt('date', `Plusieurs dates sous le tableau (${vues.map(isoToDisplay).join(', ')}) : ${isoToDisplay(info.date)} retenue, à vérifier`);
    }
    if (!info.date) doubt('date', 'Date non reconnue');
    if (info.no == null) doubt('no', 'Numéro de pièce non reconnu');
    else if (info.noRaw && /[^0-9\s]/.test(String(info.noRaw))) doubt('no', `Numéro lu « ${String(info.noRaw).trim()} » interprété ${info.no} : à vérifier`);

    // Constats de la lecture croisée (ocr.js) : confirmations, compléments, divergences
    for (const f of info.crossFlags || []) {
      if (!flags[f.field]) continue;
      if (f.level === 'doubt') doubt(f.field, f.message, f.action);
      else if (f.level === 'note') note(f.field, f.message);
      else flags[f.field].push({ level: 'ok', message: f.message });
    }

    return {
      no: info.no,
      page: info.pageNumber,
      part: info.part,
      crossChecked: !!info.crossChecked,
      date: info.date,
      compte,
      type,
      description,
      person,
      libelle: formatLibelle(type, description, person),
      debit: side === 'debit' ? amount : null,
      credit: side === 'credit' ? amount : null,
      side,
      amount,
      candidates: uniq(candidates),
      readCandidates,
      warnings,
      notes,
      flags,
      raw: info,
    };
  }

  // Mots de la description qui ressemblent à une erreur OCR : inconnus du vocabulaire et
  // proches d'un mot connu (sans avoir pu être corrigés sûrement), ou d'aspect anormal.
  function unknownWords(description, index) {
    const out = [];
    if (!index) return out;
    for (const tok of String(description || '').split(/\s+/)) {
      const m = /^[^A-Za-zÀ-ÿœŒ0-9]*(.*?)[^A-Za-zÀ-ÿœŒ0-9]*$/.exec(tok);
      let core = m ? m[1] : tok;
      const el = /^[dlDLjJnNsS][\u2019'](.+)$/.exec(core);
      if (el) core = el[1];
      if (!core || core.length < 4) continue;
      if (/\d/.test(core)) continue; // dates, classes, montants
      if (/^[A-Z]{2,}$/.test(stripAccents(core))) continue; // sigles
      if (!/^[A-Za-zÀ-ÿœŒ][A-Za-zÀ-ÿœŒ'\u2019\-]+$/.test(core)) continue;
      const parts = core.split(/[-\u2019']/).filter((x) => x.length >= 3);
      const known = (x) => index.words.has(wordKey(x));
      if (known(core) || (parts.length > 1 && parts.every(known))) continue;
      if (isSuspiciousWord(core, index)) out.push(core);
    }
    return uniq(out).slice(0, 4);
  }

  function isSuspiciousWord(word, index) {
    const key = wordKey(word);
    // aspect anormal : majuscule au milieu, lettre triplée, amas de consonnes
    if (/[a-zà-ÿ][A-ZÀ-Ý]/.test(word)) return true;
    if (/(.)\1\1/.test(key)) return true;
    if (/[bcdfghjklmnpqrstvwxz]{5}/.test(key)) return true;
    // proche d'un mot connu (même 1re lettre) sans avoir été corrigé
    const maxD = key.length >= 7 ? 2 : 1;
    for (const k of index.words.keys()) {
      if (k[0] !== key[0] || Math.abs(k.length - key.length) > maxD) continue;
      const d = levenshtein(key, k);
      if (d > 0 && d <= maxD) {
        // simple pluriel / féminin : pas suspect
        if (k.replace(/e?s$/, '') === key.replace(/e?s$/, '')) return false;
        return true;
      }
    }
    return false;
  }

  /**
   * Nom connu très proche : mêmes initiales et nom de famille à 1 (ou 2 si long) lettre près.
   * Cas typique d'une erreur OCR sur le nom (« N. Moret » pour « N. Morel »).
   * Un même nom avec d'autres initiales (C./Ch. Marendaz) n'est pas signalé : c'est courant
   * et légitime dans un établissement.
   */
  function nearPerson(person, index) {
    const m = PERSON_RE.exec(String(person || '').trim());
    if (!m) return null;
    const initials = m[1].replace(/\s+/g, '');
    const key = wordKey(m[2]);
    if (index.persons.some((p) => p.key === key)) return null; // nom de famille déjà connu
    const maxD = key.length >= 8 ? 2 : key.length >= 5 ? 1 : 0;
    if (!maxD) return null;
    for (const p of index.persons) {
      if (p.initials !== initials) continue;
      if (Math.abs(p.key.length - key.length) <= maxD && levenshtein(key, p.key) <= maxD) return p.full;
    }
    return null;
  }

  function knownPerson(person, index) {
    const m = PERSON_RE.exec(String(person || '').trim());
    if (!m) return false;
    const initials = m[1].replace(/\s+/g, '');
    const key = wordKey(m[2]);
    return index.persons.some((p) => p.key === key && p.initials === initials);
  }

  /** Sens fixé par la logique comptable du libellé, ou null si le type va dans les deux sens. */
  function sideFromType(type) {
    if (!type) return null;
    const t = stripAccents(type).toUpperCase().trim();
    if (TYPE_LOGIC[t]) return TYPE_LOGIC[t];
    const k = Object.keys(TYPE_LOGIC).find((key) => t.startsWith(key + ' '));
    return k ? TYPE_LOGIC[k] : null;
  }

  /** Sens seulement probable (dernier recours, toujours accompagné d'un doute). */
  function guessSideFromType(type) {
    const sure = sideFromType(type);
    if (sure) return sure;
    if (!type) return null;
    const t = stripAccents(type).toUpperCase().trim();
    const k = Object.keys(TYPE_GUESS).find((key) => t === key || t.startsWith(key + ' '));
    return k ? TYPE_GUESS[k] : null;
  }

  /* ------------------------------------------------------------------ */
  /* Analyse d'un document complet                                          */
  /* ------------------------------------------------------------------ */

  /**
   * pages : [{ pageNumber, width, height, words }]
   * options : { caisse, vocabulary, history: [{type, compte}], existingNumbers: [n° ou {no, debit, credit}] }
   */
  function parseDocument(pages, options) {
    options = options || {};
    const caisse = options.caisse || DEFAULT_CAISSE;
    const vocab = options.vocabulary || emptyVocabulary();
    const index = buildIndex(vocab);
    const entries = [];
    const duplicates = [];
    const emptyPages = [];
    const globalWarnings = [];

    // 1er passage : champs bruts
    const infos = [];
    for (const p of pages) {
      if (!p.words || !p.words.length) { emptyPages.push(p.pageNumber); continue; }
      for (const part of splitForms(p)) {
        let info = analyzePage(part);
        // Lecture croisée (seconde lecture par OCR local) : le module ocr.js peut compléter,
        // confirmer ou contester les champs lus dans la couche texte.
        if (info && options.refine) info = options.refine(info, part, { index, caisse }) || info;
        if (info) infos.push(info);
      }
    }

    // Comptes connus : classeur + comptes vus au moins 2 fois dans ce lot
    const knownAccounts = new Set(index.accounts);
    const seenCounts = new Map();
    for (const info of infos) for (const a of uniq(info.doit.concat(info.avoir))) seenCounts.set(a, (seenCounts.get(a) || 0) + 1);
    for (const [a, n] of seenCounts) if (n >= 2) knownAccounts.add(a);
    knownAccounts.add(caisse);

    // 2e passage : écritures
    const byNo = new Map();
    for (const info of infos) {
      const e = buildEntry(info, { caisse, index, knownAccounts });
      if (e.no != null && byNo.has(e.no)) {
        const prev = byNo.get(e.no);
        const sameAmount = prev.amount != null && e.amount != null && prev.amount === e.amount;
        const sameDate = !prev.date || !e.date || prev.date === e.date;
        if (sameAmount && sameDate) {
          duplicates.push({ no: e.no, page: e.page, sameAs: prev.page });
          continue;
        }
        e.warnings.push(`Numéro ${e.no} déjà utilisé en page ${prev.page} avec un autre montant`);
        e.flags.no.push({ level: 'doubt', message: e.warnings[e.warnings.length - 1] });
        prev.warnings.push(`Numéro ${e.no} aussi en page ${e.page} avec un autre montant`);
        prev.flags.no.push({ level: 'doubt', message: prev.warnings[prev.warnings.length - 1] });
      } else if (e.no != null) {
        byNo.set(e.no, e);
      }
      entries.push(e);
    }

    const addDoubt = (e, field, message) => { e.warnings.push(message); if (e.flags && e.flags[field]) e.flags[field].push({ level: 'doubt', message }); };

    // Suggestions de compte quand il manque (historique + autres pièces)
    const history = (options.history || []).concat(vocab.typeAccounts || [])
      .concat(entries.filter((e) => e.compte).map((e) => ({ type: e.type, compte: e.compte })));
    for (const e of entries) {
      if (!e.compte && e.type) {
        const s = suggestAccount(e.type, history);
        if (s) {
          e.compte = s;
          e.suggested = true;
          addDoubt(e, 'compte', `Compte ${s} proposé d'après les autres pièces "${e.type}" : à vérifier`);
        }
      } else if (e.readCandidates.length > 1 && e.type) {
        // Plusieurs comptes lus sur la pièce : mettre en tête celui habituellement utilisé
        // pour ce type d'écriture (le doute reste signalé). Ne s'applique jamais à un compte
        // simplement proposé par ressemblance.
        const usual = suggestAccount(e.type, history, e.readCandidates);
        if (usual && usual !== e.compte) {
          e.compte = usual;
          e.candidates = [usual].concat(e.candidates.filter((a) => a !== usual));
          for (const f of e.flags.compte) {
            if (/Plusieurs comptes possibles/.test(f.message)) f.message += ` – ${usual} retenu, habituel pour « ${e.type} »`;
          }
          e.warnings = e.warnings.map((w) => (/Plusieurs comptes possibles/.test(w) ? `${w} – ${usual} retenu, habituel pour « ${e.type} »` : w));
        }
      }
    }

    // Numéros déjà présents dans la base (registre de l'année ou classeur). Une pièce déjà enregistrée
    // avec le MÊME montant est la même pièce (lot déjà versé au registre) : ce n'est pas un doute.
    if (options.existingNumbers && options.existingNumbers.length) {
      const ex = new Map();
      for (const x of options.existingNumbers) {
        if (x != null && typeof x === 'object') { if (x.no != null) ex.set(Number(x.no), x); }
        else if (!isNaN(Number(x))) ex.set(Number(x), null);
      }
      const cents = (v) => Math.round((Number(v) || 0) * 100);
      for (const e of entries) {
        if (e.no == null || !ex.has(Number(e.no))) continue;
        const x = ex.get(Number(e.no));
        if (x && cents(x.debit) === cents(e.debit) && cents(x.credit) === cents(e.credit)) continue; // même pièce
        addDoubt(e, 'no', `La pièce n° ${e.no} existe déjà avec un autre montant`);
      }
    }

    // Tri par numéro puis page
    const sortEntries = (list) => list.sort((a, b) => {
      if (a.no == null && b.no == null) return a.page - b.page || (a.part || 0) - (b.part || 0);
      if (a.no == null) return 1;
      if (b.no == null) return -1;
      return a.no - b.no || a.page - b.page;
    });
    sortEntries(entries);

    // Numéro manquant : proposé d'après l'ordre des pages ; date manquante : date de la pièce précédente
    const pageOrder = (a, b) => a.page - b.page || (a.part || 0) - (b.part || 0);
    const used = new Set(entries.filter((e) => e.no != null).map((e) => Number(e.no)));
    const numbered = entries.filter((e) => e.no != null).sort(pageOrder);
    for (const e of entries.filter((x) => x.no == null).sort(pageOrder)) {
      const before = numbered.filter((x) => pageOrder(x, e) < 0);
      if (!before.length) continue;
      const prev = before[before.length - 1];
      const n = prev.no + 1;
      e.no = n;
      // la pièce prend sa place parmi les numérotées : celle d'après repart d'elle, sinon deux
      // pièces sans numéro qui se suivent recevraient toutes les deux le numéro du même voisin
      numbered.push(e); numbered.sort(pageOrder);
      if (used.has(n)) addDoubt(e, 'no', `Numéro ${n} proposé (pièce qui suit la n° ${prev.no}) mais ce numéro est déjà pris : à corriger`);
      else addDoubt(e, 'no', `Numéro ${n} proposé (pièce qui suit la n° ${prev.no}) : à vérifier`);
      used.add(n);
    }
    // L'ordre des pages n'est pas un indice fiable : les classeurs contiennent des copies de
    // pièces antérieures jointes comme justificatifs. Les trous et les doublons de numéros sont
    // contrôlés globalement (voir le récapitulatif de contrôle), ce qui est plus sûr.
    sortEntries(entries);
    let lastDate = null;
    for (const e of entries) {
      if (e.date) lastDate = e.date;
      else if (lastDate) { e.date = lastDate; addDoubt(e, 'date', `Date ${isoToDisplay(lastDate)} proposée (date de la pièce précédente) : à vérifier`); }
    }
    // Dates dans l'ordre des numéros ; année dominante
    const years = new Map();
    for (const e of entries) if (e.date) { const y = e.date.slice(0, 4); years.set(y, (years.get(y) || 0) + 1); }
    let mainYear = null; let mainN = 0;
    for (const [y, n] of years) if (n > mainN) { mainYear = y; mainN = n; }
    // Les pièces ne sont pas toujours saisies dans l'ordre chronologique : seule une année
    // différente du reste du lot est signalée.
    for (const e of entries) {
      if (!e.date) continue;
      if (mainYear && entries.length >= 3 && e.date.slice(0, 4) !== mainYear) addDoubt(e, 'date', `Année ${e.date.slice(0, 4)} différente des autres pièces (${mainYear}) : date à vérifier`);
    }

    const nos = entries.filter((e) => e.no != null).map((e) => e.no);
    if (nos.length) {
      const min = Math.min.apply(null, nos);
      const max = Math.max.apply(null, nos);
      const have = new Set(nos);
      const missing = [];
      for (let n = min; n <= max; n++) if (!have.has(n)) missing.push(n);
      if (missing.length) globalWarnings.push(`Numéros de pièce manquants : ${missing.join(', ')}`);
    }

    return { entries, duplicates, emptyPages, warnings: globalWarnings, pieceCount: infos.length };
  }

  /**
   * Compte le plus souvent utilisé pour ce type d'écriture.
   * `only` limite le choix à une liste de comptes (les candidats lus sur la pièce).
   */
  function suggestAccount(type, history, only) {
    const key = stripAccents(type || '').toUpperCase();
    if (!key) return null;
    const allowed = only && only.length ? new Set(only) : null;
    const counts = new Map();
    for (const h of history) {
      if (!h || !h.compte || !h.type) continue;
      if (stripAccents(h.type).toUpperCase() !== key) continue;
      if (allowed && !allowed.has(h.compte)) continue;
      counts.set(h.compte, (counts.get(h.compte) || 0) + (h.n || 1));
    }
    let best = null;
    let bestN = 0;
    for (const [acc, n] of counts) if (n > bestN) { best = acc; bestN = n; }
    return best;
  }

  /**
   * Détecte le compte caisse le plus probable : le compte qui apparaît sur le plus de pièces.
   */
  function detectCaisseAccount(pages) {
    const counts = new Map();
    for (const p of pages) {
      for (const part of splitForms(p)) {
        const info = analyzePage(part);
        if (!info) continue;
        for (const a of uniq(info.doit.concat(info.avoir))) counts.set(a, (counts.get(a) || 0) + 1);
      }
    }
    let best = null;
    let bestN = 0;
    for (const [acc, n] of counts) if (n > bestN) { best = acc; bestN = n; }
    return best;
  }

  /**
   * Nombre de formulaires reconnus sur une page.
   */
  function countForms(page) {
    let n = 0;
    for (const part of splitForms(page)) if (analyzePage(part)) n++;
    return n;
  }

  /**
   * Explique un écart entre le solde calculé et le solde réel compté.
   * ecart = solde calculé − solde réel (en francs). Cherche :
   *  - une écriture comptée deux fois (son montant vaut l'écart) ;
   *  - jusqu'à trois écritures prises dans le mauvais sens (débit au lieu de crédit ou
   *    l'inverse) : inverser une écriture au débit baisse le solde de 2 × montant,
   *    inverser une écriture au crédit le monte de 2 × montant.
   * Renvoie des propositions, les plus simples d'abord (au plus `limit`).
   */
  function explainGap(entries, ecart, limit) {
    const max = limit || 5;
    const cents = Math.round((Number(ecart) || 0) * 100);
    if (!cents) return [];
    const list = (entries || []).map((e) => {
      const d = Math.round((Number(e.debit) || 0) * 100);
      const c = Math.round((Number(e.credit) || 0) * 100);
      return { e, amount: d || c, effect: 2 * (d - c) };
    }).filter((x) => x.amount > 0);
    const out = [];
    for (const x of list) if (x.effect === 2 * cents) out.push({ kind: 'double', entries: [x.e] });
    const seen = new Set();
    const key = (xs) => xs.map((x) => list.indexOf(x)).sort((a, b) => a - b).join(',');
    const add = (xs) => {
      const k = key(xs);
      if (seen.has(k)) return;
      seen.add(k);
      out.push({ kind: 'swap', entries: xs.map((x) => x.e) });
    };
    const byEffect = new Map();
    list.forEach((x, i) => { if (!byEffect.has(x.effect)) byEffect.set(x.effect, []); byEffect.get(x.effect).push(i); });
    // une seule écriture
    for (const i of byEffect.get(cents) || []) add([list[i]]);
    // deux écritures
    if (out.length < max) {
      for (let i = 0; i < list.length; i++) {
        for (const j of byEffect.get(cents - list[i].effect) || []) if (j > i) add([list[i], list[j]]);
        if (out.length >= max) break;
      }
    }
    // trois écritures, seulement si rien de plus simple n'explique l'écart
    if (!out.length) {
      for (let i = 0; i < list.length && out.length < max; i++) {
        for (let j = i + 1; j < list.length && out.length < max; j++) {
          for (const k of byEffect.get(cents - list[i].effect - list[j].effect) || []) if (k > j) add([list[i], list[j], list[k]]);
        }
      }
    }
    return out.slice(0, max);
  }

  /**
   * Extrait le type d'un libellé du journal ("REMBOURSEMENT - ... - X. Y") pour l'historique.
   */
  function typeFromLibelle(libelle) {
    const first = String(libelle || '').split(' - ')[0];
    return splitType(first).type;
  }

  return {
    DEFAULT_CAISSE,
    KNOWN_TYPES,
    TYPE_LOGIC,
    sideFromType,
    BASE_LEXICON,
    normalizeAmount,
    normalizeAccount,
    findDate,
    isoToDisplay,
    displayToIso,
    splitType,
    canonicalType,
    looksLikePerson,
    formatLibelle,
    fixInitials,
    cleanDescription,
    learnVocabulary,
    mergeVocabulary,
    emptyVocabulary,
    buildIndex,
    correctWord,
    correctClassToken,
    correctDescription,
    correctPerson,
    itemsFromTextContent,
    groupLines,
    splitForms,
    analyzePage,
    countForms,
    buildEntry,
    unknownWords,
    expectedSideFromAccount,
    isSuspiciousWord,
    nearPerson,
    knownPerson,
    boxOf,
    parseDocument,
    detectCaisseAccount,
    typeFromLibelle,
    explainGap,
    objetOf,
    degreOf,
    OBJET_LIST,
    suggestAccountFor,
    levenshtein,
    round2,
  };
});
