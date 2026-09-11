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
  ];

  // Types qui, par nature, font entrer de l'argent dans la caisse (débit du compte caisse)
  const INFLOW_TYPES = ['RECETTE', 'RETRAIT', 'PARTICIPATION DES PARENTS', 'PARTICIPATION PARENTS', 'PARTICIPATION', 'ENCAISSEMENT', 'VENTE', 'DON', 'SUBVENTION', 'COTISATION', 'VERSEMENT'];
  // Types qui font sortir de l'argent (crédit du compte caisse)
  const OUTFLOW_TYPES = ['REMBOURSEMENT', 'AVANCE', 'PAIEMENT', 'ACHAT', 'FRAIS'];

  /* ------------------------------------------------------------------ */
  /* Utilitaires texte                                                    */
  /* ------------------------------------------------------------------ */

  function stripAccents(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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

  /* ------------------------------------------------------------------ */
  /* Normalisations                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * "CHF 10'OOO.OQ" -> 10000 ; "CHF2'500. 00" -> 2500 ; "CHF 29. 70" -> 29.7
   * Retourne null si la chaîne n'est pas un montant lisible.
   */
  function normalizeAmount(raw) {
    if (raw == null) return null;
    let t = String(raw)
      .replace(/CHF|CHf|Fr\.?|SFr\.?|Frs\.?/gi, ' ')
      .replace(/[\u2019\u2018'`\u00B4"\u00A0]/g, ' ')
      .trim();
    if (!t) return null;
    // Séparateur décimal : dernier point/virgule suivi de 1 ou 2 chiffres (ou lettres OCR)
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
    // Ne garde que les mots utiles (DES / DE / DU peuvent faire partie du type)
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

  function looksLikePerson(line) {
    const t = String(line || '').trim();
    if (!t) return false;
    // "A. Nagy", "Ch. Ansermet", "J. Gertsch (donné à Isabelle Braillard)", "M. Chardome"
    if (/^[A-ZÀ-Ý][a-zà-ÿ]{0,3}\.\s*[A-ZÀ-Ý]/.test(t)) return true;
    // "Mme Dupont", "M Dupont"
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

  function groupLines(words, tol) {
    tol = tol || 5;
    const sorted = words.slice().sort((a, b) => a.y - b.y || a.x - b.x);
    const lines = [];
    for (const w of sorted) {
      let line = lines.length ? lines[lines.length - 1] : null;
      if (!line || Math.abs(w.y - line.y) > tol) {
        line = { y: w.y, words: [] };
        lines.push(line);
      }
      line.words.push(w);
      // moyenne glissante de y
      line.y = line.words.reduce((s, x) => s + x.y, 0) / line.words.length;
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

  /* ------------------------------------------------------------------ */
  /* Analyse d'une page                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Analyse la couche texte d'une page.
   * page : { pageNumber, width, height, words: [{str,x,y,h}] }
   * Retourne null si la page n'est pas une pièce comptable, sinon les champs bruts.
   */
  function analyzePage(page) {
    const words = (page.words || []).filter((w) => w.str && w.str.trim());
    if (!words.length) return null;
    const W = page.width || 595;
    const H = page.height || 842;

    const flat = words.map((w) => stripAccents(w.str).toUpperCase()).join(' ');
    const hasPiece = /PIECE\s*COMPTABLE/.test(flat) || /P[1I]ECE\s*C0?OMPTABLE/.test(flat);
    const hasCols = /DOIT/.test(flat) && /AVOIR/.test(flat) && /SOMME/.test(flat);
    if (!hasPiece && !hasCols) return null;

    const wDoit = findWord(words, /^DOIT/i);
    const wSomme = findWord(words, /^SOMME/i);
    const wAvoir = findWord(words, /^AVOIR/i);
    const wLibelle = findWord(words, /^Libell/i);
    const wTotal = findWord(words, /^Total/i);
    const wPiece = findWord(words, /^PIECE/i);

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
    const topWords = words.filter((w) => w.y < yHeader - 6);
    for (const w of topWords) {
      if (col(w.x) !== 'somme') continue;
      const t = ocrDigits(w.str.trim()).replace(/[^\d]/g, '');
      if (/^\d{1,4}$/.test(t) && !/^\d{4}$/.test(t)) { no = parseInt(t, 10); noRaw = w.str; break; }
    }
    if (no == null) {
      const top = groupLines(topWords).map((l) => l.text).join(' ');
      let m = /(\d{1,3})\s*fe\b/i.exec(top) || /COMPTABLE\s*(\d{1,3})\b/i.exec(top);
      if (m) { no = parseInt(m[1], 10); noRaw = m[0]; }
    }

    // ---- Zone comptes / sommes : entre l'entête et "Libellé"
    const doit = [];
    const avoir = [];
    const sommes = [];
    const bandWords = words.filter((w) => inBand(w, yHeader, yLibelle));
    for (const c of ['doit', 'somme', 'avoir']) {
      const lines = groupLines(bandWords.filter((w) => col(w.x) === c));
      for (const l of lines) {
        if (c === 'somme') {
          const a = normalizeAmount(l.text);
          sommes.push({ raw: l.text, value: a });
        } else {
          const acc = normalizeAccount(l.text);
          if (acc) (c === 'doit' ? doit : avoir).push(acc);
        }
      }
    }

    // ---- Total (ligne "Total", colonne du milieu)
    let total = null;
    let totalRaw = null;
    if (wTotal) {
      const tw = words.filter((w) => Math.abs(w.y - yTotal) <= 8 && col(w.x) === 'somme');
      if (tw.length) {
        const l = groupLines(tw)[0];
        totalRaw = l.text;
        total = normalizeAmount(l.text);
      }
    }

    // ---- Libellé : entre "Libellé" et "Total", colonne de gauche
    const libWords = words.filter((w) => inBand(w, yLibelle, yTotal) && col(w.x) === 'doit');
    const libelleLines = groupLines(libWords).map((l) => l.text).filter((t) => t && /[A-Za-z0-9À-ÿ]/.test(t));

    // ---- Date : sous la ligne Total (à gauche), sinon dernière date de la page
    let date = null;
    let dateRaw = null;
    const below = groupLines(words.filter((w) => w.y > yTotal + 6 && col(w.x) === 'doit'));
    for (const l of below) {
      const d = findDate(l.text);
      if (d) { date = d; dateRaw = l.text; break; }
    }
    if (!date) {
      // Ligne "Total ... date" sur la même ligne ?
      const same = groupLines(words.filter((w) => Math.abs(w.y - yTotal) <= 8 && col(w.x) === 'doit'));
      for (const l of same) {
        const d = findDate(l.text.replace(/^Total/i, ''));
        if (d) { date = d; dateRaw = l.text; break; }
      }
    }

    return {
      pageNumber: page.pageNumber,
      no,
      noRaw,
      doit,
      avoir,
      sommes,
      total,
      totalRaw,
      libelleLines,
      date,
      dateRaw,
      hasTotalWord: !!wTotal,
      hasLibelleWord: !!wLibelle,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Construction d'une écriture                                            */
  /* ------------------------------------------------------------------ */

  function buildEntry(info, options) {
    options = options || {};
    const caisse = options.caisse || DEFAULT_CAISSE;
    const warnings = [];

    // Libellé
    const lines = info.libelleLines.slice();
    let person = null;
    if (lines.length >= 2 && looksLikePerson(lines[lines.length - 1])) person = lines.pop();
    const first = lines.shift() || '';
    const { type, rest } = splitType(first);
    const description = cleanDescription([rest, ...lines].filter(Boolean).join(' '));
    if (!info.libelleLines.length) warnings.push('Libellé non reconnu');

    // Montant
    let amount = null;
    const sommeVals = info.sommes.map((s) => s.value).filter((v) => v != null);
    if (info.total != null) amount = info.total;
    else if (sommeVals.length) amount = sommeVals[0];
    if (amount == null) warnings.push('Montant non reconnu');
    else if (info.total != null && sommeVals.length && sommeVals.every((v) => v !== info.total)) {
      const sum = round2(sommeVals.reduce((a, b) => a + b, 0));
      if (sum === info.total) warnings.push(`Plusieurs sommes (${sommeVals.join(' + ')}) : total ${info.total} retenu`);
      else warnings.push(`Somme (${sommeVals.join(', ')}) différente du total (${info.total}) : vérifier le montant`);
    } else if (info.total == null && sommeVals.length > 1) {
      warnings.push(`Plusieurs sommes lues (${sommeVals.join(', ')}) : première retenue`);
    }

    // Sens de l'écriture
    const doitOther = info.doit.filter((a) => a !== caisse);
    const avoirOther = info.avoir.filter((a) => a !== caisse);
    const doitCaisse = info.doit.includes(caisse);
    const avoirCaisse = info.avoir.includes(caisse);
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
      warnings.push(`Le compte caisse ${caisse} figure au DOIT et à l'AVOIR : compte à corriger`);
      candidates = doitOther.concat(avoirOther);
      side = guessSideFromType(type);
      if (!side) warnings.push('Sens de l\'écriture (débit/crédit) à vérifier');
    } else {
      if (!info.doit.length && !info.avoir.length) warnings.push('Aucun n° de compte reconnu');
      else warnings.push(`Le compte caisse ${caisse} n'apparaît pas sur la pièce : sens et compte à vérifier`);
      candidates = doitOther.concat(avoirOther);
      side = guessSideFromType(type);
    }

    if (candidates.length) {
      compte = candidates[0];
      if (new Set(candidates).size > 1) {
        warnings.push(`Plusieurs comptes possibles : ${Array.from(new Set(candidates)).join(', ')}`);
      }
    } else {
      warnings.push('Compte de contrepartie non reconnu');
    }

    if (!info.date) warnings.push('Date non reconnue');
    if (info.no == null) warnings.push('Numéro de pièce non reconnu');

    return {
      no: info.no,
      page: info.pageNumber,
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
      candidates: Array.from(new Set(candidates)),
      warnings,
      raw: info,
    };
  }

  /**
   * Nettoie une description OCR : "du 12. 12. 2024" -> "du 12.12.2024", espaces multiples...
   */
  function cleanDescription(s) {
    let t = String(s || '').replace(/\s+/g, ' ').trim();
    // points/tirets de dates séparés par des espaces
    for (let i = 0; i < 3; i++) t = t.replace(/(\d)\s*([.\-\/])\s+(\d)/g, '$1$2$3');
    t = t.replace(/\s+([,;:!?])/g, '$1');
    return t;
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
   * options : { caisse, history: [{type, compte}] , existingNumbers: [..] }
   */
  function parseDocument(pages, options) {
    options = options || {};
    const caisse = options.caisse || DEFAULT_CAISSE;
    const entries = [];
    const duplicates = [];
    const emptyPages = [];
    const globalWarnings = [];

    const infos = [];
    for (const p of pages) {
      if (!p.words || !p.words.length) emptyPages.push(p.pageNumber);
      const info = analyzePage(p);
      if (info) infos.push(info);
    }

    const byNo = new Map();
    for (const info of infos) {
      const e = buildEntry(info, { caisse });
      if (e.no != null && byNo.has(e.no)) {
        const prev = byNo.get(e.no);
        const sameAmount = prev.amount != null && e.amount != null && prev.amount === e.amount;
        const sameDate = !prev.date || !e.date || prev.date === e.date;
        if (sameAmount && sameDate) {
          duplicates.push({ no: e.no, page: e.page, sameAs: prev.page });
          continue;
        }
        e.warnings.push(`Numéro ${e.no} déjà utilisé en page ${prev.page} avec un autre montant`);
        prev.warnings.push(`Numéro ${e.no} aussi en page ${e.page} avec un autre montant`);
      } else if (e.no != null) {
        byNo.set(e.no, e);
      }
      entries.push(e);
    }

    // Suggestions de compte quand il manque (à partir de l'historique + des autres pièces)
    const history = (options.history || []).concat(entries.filter((e) => e.compte).map((e) => ({ type: e.type, compte: e.compte })));
    for (const e of entries) {
      if (!e.compte && e.type) {
        const s = suggestAccount(e.type, history);
        if (s) {
          e.compte = s;
          e.suggested = true;
          e.warnings.push(`Compte ${s} proposé d'après les autres pièces "${e.type}" : à vérifier`);
        }
      }
    }

    // Numéros déjà présents dans le classeur
    if (options.existingNumbers && options.existingNumbers.length) {
      const ex = new Set(options.existingNumbers.map(Number));
      for (const e of entries) {
        if (e.no != null && ex.has(Number(e.no))) e.warnings.push(`La pièce n° ${e.no} existe déjà dans le classeur`);
      }
    }

    // Tri par numéro puis page ; numéros manquants
    entries.sort((a, b) => {
      if (a.no == null && b.no == null) return a.page - b.page;
      if (a.no == null) return 1;
      if (b.no == null) return -1;
      return a.no - b.no || a.page - b.page;
    });
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
      const info = analyzePage(p);
      if (!info) continue;
      const set = new Set(info.doit.concat(info.avoir));
      for (const a of set) counts.set(a, (counts.get(a) || 0) + 1);
    }
    let best = null;
    let bestN = 0;
    for (const [acc, n] of counts) if (n > bestN) { best = acc; bestN = n; }
    return best;
  }

  /**
   * Extrait { type } d'un libellé du journal ("REMBOURSEMENT - ... - X. Y") pour l'historique.
   */
  function typeFromLibelle(libelle) {
    const first = String(libelle || '').split(' - ')[0];
    return splitType(first).type;
  }

  return {
    DEFAULT_CAISSE,
    KNOWN_TYPES,
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
    itemsFromTextContent,
    groupLines,
    analyzePage,
    buildEntry,
    parseDocument,
    detectCaisseAccount,
    typeFromLibelle,
    levenshtein,
    round2,
  };
});
