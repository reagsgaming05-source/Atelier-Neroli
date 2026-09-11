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
  const INFLOW_TYPES = ['RECETTE', 'RETRAIT', 'PARTICIPATION DES PARENTS', 'PARTICIPATION PARENTS', 'PARTICIPATION', 'ENCAISSEMENT', 'VENTE', 'DON', 'SUBVENTION', 'COTISATION', 'VERSEMENT'];
  // Types qui font sortir de l'argent (crédit du compte caisse)
  const OUTFLOW_TYPES = ['REMBOURSEMENT', 'AVANCE', 'PAIEMENT', 'ACHAT', 'FRAIS', 'CADEAU', 'CADEAUX', 'PRIX'];

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
    const re = /(\d{1,2})\s*[./\-]\s*(\d{1,2})\s*[./\-]\s*(\d{4}|\d{2})(?!\d)/g;
    let m;
    while ((m = re.exec(t))) {
      const d = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10);
      let y = parseInt(m[3], 10);
      if (m[3].length === 2) y += 2000;
      if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 2000 && y <= 2100) {
        return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
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
    if (!upper.length) return { type: null, rest: line };
    let typeRaw = upper.join(' ');
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
    return { type: typeRaw, rest: rest.trim() };
  }

  function canonicalType(raw) {
    const key = stripAccents(raw).toUpperCase().replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
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

  // "A. Nagy", "Ch. Ansermet", "A.-L. Emmenegger", "F.N. Olgiati", "J. Gertsch (donné à ...)", "Mme Dupont"
  const PERSON_RE = /^((?:[A-ZÀ-Ý][a-zà-ÿ]{0,3}\.\s*-?\s*)+)\s*([A-ZÀ-Ý][A-Za-zÀ-ÿ'\-]+(?:\s+[A-ZÀ-Ý][A-Za-zÀ-ÿ'\-]+)*)(.*)$/;

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
    for (let i = 0; i < 3; i++) t = t.replace(/(\d)\s*([.\-\/])\s+(\d)/g, '$1$2$3');
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
    return { words: [], persons: [], classTokens: [], accounts: [], typeAccounts: [], typeSides: [] };
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
    for (const e of entries || []) {
      const lib = String(e.libelle || '').trim();
      if (!lib || /^solde/i.test(lib)) continue;
      const compte = e.compte ? normalizeAccount(e.compte) : null;
      if (compte) accounts.add(compte);
      const parts = lib.split(' - ').map((p) => p.trim()).filter(Boolean);
      let type = null;
      if (parts.length) type = splitType(parts[0]).type;
      if (type && compte) typeAccounts.push({ type, compte });
      if (type) {
        const d = Number(e.debit) || 0;
        const c = Number(e.credit) || 0;
        if (d && !c) typeSides.push({ type, side: 'debit' });
        else if (c && !d) typeSides.push({ type, side: 'credit' });
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
      counts.get(k)[t.side] += 1;
    }
    const expectedSide = new Map();
    for (const [k, c] of counts) {
      const n = c.debit + c.credit;
      if (n < MIN_SIDE_SAMPLES) continue;
      if (c.credit === 0) expectedSide.set(k, { side: 'debit', n });
      else if (c.debit === 0) expectedSide.set(k, { side: 'credit', n });
    }
    return { words, classTokens, persons, accounts: new Set(vocab.accounts || []), expectedSide };
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
   * Corrige un nom de personne d'après les personnes connues ("N. Boriat" -> "N. Borlat").
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
      parts.push({ pageNumber: page.pageNumber, part: i + 1, width: page.width, height: page.height, words: words.filter((w) => w.y >= y0 && w.y < y1) });
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
      const t = ocrDigits(w.str.trim()).replace(/[^\d]/g, '');
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
    for (const c of ['doit', 'somme', 'avoir']) {
      colWords[c] = bandWords.filter((w) => col(w.x) === c);
      const lines = groupLines(colWords[c]);
      for (const l of lines) {
        if (c === 'somme') {
          const a = normalizeAmount(l.text);
          sommes.push({ raw: l.text, value: a, lenient: a == null ? normalizeAmount(l.text, true) : null });
        } else {
          const acc = normalizeAccount(l.text);
          if (acc) (c === 'doit' ? doit : avoir).push(acc);
        }
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
        if (total == null) totalLenient = normalizeAmount(l.text, true);
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
      no,
      noRaw,
      doit,
      avoir,
      sommes,
      total,
      totalRaw,
      totalLenient,
      libelleLines,
      date,
      dateRaw,
      hasTotalWord: !!wTotal,
      hasLibelleWord: !!wLibelle,
      boxes,
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
    const doubt = (field, message) => { warnings.push(message); if (flags[field]) flags[field].push({ level: 'doubt', message }); };
    const note = (field, message) => { notes.push(message); if (flags[field]) flags[field].push({ level: 'note', message }); };

    // ---- Libellé
    const lines = info.libelleLines.slice();
    let person = null;
    if (lines.length >= 2 && looksLikePerson(lines[lines.length - 1])) person = lines.pop();
    const first = lines.shift() || '';
    const { type, rest } = splitType(first);
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

    if (doitCaisse && !avoirCaisse) {
      side = 'debit';
      candidates = avoirOther;
    } else if (avoirCaisse && !doitCaisse) {
      side = 'credit';
      candidates = doitOther;
    } else if (doitCaisse && avoirCaisse) {
      doubt('compte', `Le compte caisse ${caisse} figure au DOIT et à l'AVOIR : compte à corriger`);
      candidates = doitOther.concat(avoirOther);
      side = guessSideFromType(type);
      if (!side) doubt('montant', 'Sens de l\'écriture (débit/crédit) à vérifier');
      else doubt('montant', `Sens de l'écriture (${side === 'debit' ? 'débit' : 'crédit'}) déduit du type « ${type} » : à vérifier`);
    } else {
      if (!doitAcc.length && !avoirAcc.length) doubt('compte', 'Aucun n° de compte reconnu');
      else doubt('compte', `Le compte caisse ${caisse} n'apparaît pas sur la pièce : sens et compte à vérifier`);
      candidates = doitOther.concat(avoirOther);
      side = guessSideFromType(type);
      doubt('montant', side ? `Sens de l'écriture (${side === 'debit' ? 'débit' : 'crédit'}) déduit du type : à vérifier` : 'Sens de l\'écriture (débit/crédit) inconnu');
    }

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

    // Contrôle croisé du sens : type d'écriture et nature du compte
    if (side && compte) {
      const key = stripAccents(type || '').toUpperCase();
      const exp = index && index.expectedSide ? index.expectedSide.get(key) : null;
      const sideFr = (x) => (x === 'debit' ? 'Débit (entrée en caisse)' : 'Crédit (sortie de caisse)');
      if (exp && exp.side !== side) {
        doubt('montant', `Sens inhabituel : ${sideFr(side)} alors que les ${exp.n} écritures « ${type} » du classeur sont toutes en ${exp.side === 'debit' ? 'débit' : 'crédit'} : à vérifier`);
      } else {
        const accSide = expectedSideFromAccount(compte);
        if (accSide && accSide !== side) doubt('montant', `Sens inhabituel : ${sideFr(side)} sur un compte de recettes (${compte}) : à vérifier`);
      }
    }

    if (!info.date) doubt('date', 'Date non reconnue');
    if (info.no == null) doubt('no', 'Numéro de pièce non reconnu');
    else if (info.noRaw && /[^0-9\s]/.test(String(info.noRaw))) doubt('no', `Numéro lu « ${String(info.noRaw).trim()} » interprété ${info.no} : à vérifier`);

    return {
      no: info.no,
      page: info.pageNumber,
      part: info.part,
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
   * Cas typique d'une erreur OCR sur le nom (« N. Boriat » pour « N. Borlat »).
   * Un même nom avec d'autres initiales (C./Ch. Ansermet) n'est pas signalé : c'est courant
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

  function guessSideFromType(type) {
    if (!type) return null;
    const t = stripAccents(type).toUpperCase();
    if (INFLOW_TYPES.some((k) => t.startsWith(k))) return 'debit';
    if (OUTFLOW_TYPES.some((k) => t.startsWith(k))) return 'credit';
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Analyse d'un document complet                                          */
  /* ------------------------------------------------------------------ */

  /**
   * pages : [{ pageNumber, width, height, words }]
   * options : { caisse, vocabulary, history: [{type, compte}], existingNumbers: [..] }
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
        const info = analyzePage(part);
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
      }
    }

    // Numéros déjà présents dans le classeur
    if (options.existingNumbers && options.existingNumbers.length) {
      const ex = new Set(options.existingNumbers.map(Number));
      for (const e of entries) {
        if (e.no != null && ex.has(Number(e.no))) addDoubt(e, 'no', `La pièce n° ${e.no} existe déjà dans le classeur`);
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
    const withNo = entries.filter((e) => e.no != null);
    for (const e of entries) {
      if (e.no == null) {
        const before = withNo.filter((x) => x.page < e.page || (x.page === e.page && (x.part || 0) < (e.part || 0)));
        if (before.length) {
          const prev = before[before.length - 1];
          e.no = prev.no + 1;
          addDoubt(e, 'no', `Numéro ${e.no} proposé (pièce qui suit la n° ${prev.no}) : à vérifier`);
        }
      }
    }
    // Numéro incohérent avec l'ordre des pages (les pièces sont scannées dans l'ordre)
    const byPage = entries.filter((e) => e.no != null).slice().sort((a, b) => a.page - b.page || (a.part || 0) - (b.part || 0));
    for (let i = 1; i < byPage.length; i++) {
      const prev = byPage[i - 1];
      const cur = byPage[i];
      if (cur.no !== prev.no + 1) {
        const msg = cur.no < prev.no
          ? `Numéro ${cur.no} lu après la pièce n° ${prev.no} (ordre des pages) : numéro à vérifier`
          : `Numéro ${cur.no} lu, ${prev.no + 1} attendu d'après l'ordre des pages : numéro à vérifier (ou pièce manquante)`;
        addDoubt(cur, 'no', msg);
      }
    }
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
    let prevDated = null;
    for (const e of entries) {
      if (!e.date) continue;
      if (mainYear && entries.length >= 3 && e.date.slice(0, 4) !== mainYear) addDoubt(e, 'date', `Année ${e.date.slice(0, 4)} différente des autres pièces (${mainYear}) : date à vérifier`);
      if (prevDated && e.date < prevDated.date) addDoubt(e, 'date', `Date ${isoToDisplay(e.date)} antérieure à la pièce n° ${prevDated.no} (${isoToDisplay(prevDated.date)}) : à vérifier`);
      prevDated = e;
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

  function suggestAccount(type, history) {
    const key = stripAccents(type || '').toUpperCase();
    if (!key) return null;
    const counts = new Map();
    for (const h of history) {
      if (!h || !h.compte || !h.type) continue;
      if (stripAccents(h.type).toUpperCase() !== key) continue;
      counts.set(h.compte, (counts.get(h.compte) || 0) + 1);
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
   * Extrait le type d'un libellé du journal ("REMBOURSEMENT - ... - X. Y") pour l'historique.
   */
  function typeFromLibelle(libelle) {
    const first = String(libelle || '').split(' - ')[0];
    return splitType(first).type;
  }

  return {
    DEFAULT_CAISSE,
    KNOWN_TYPES,
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
    levenshtein,
    round2,
  };
});
