/*
 * Registre des pièces comptables saisies dans l'application : une année = un registre
 * (solde à nouveau, compte caisse, pièces), enregistré dans les fichiers de l'application
 * (dossier data/caisse/<année>/ de la version fenêtrée) ou dans le navigateur (version HTML).
 *
 * Partie « pure » (modèle, libellé, validation, journal) testable dans Node ; partie
 * stockage (en bas) qui choisit l'adaptateur disponible.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./parser.js'));
  else root.CaisseRegistre = factory(root.CaisseParser);
})(typeof self !== 'undefined' ? self : this, function (P) {
  'use strict';

  const VERSION = 1;
  const TYPES = ['REMBOURSEMENT', 'AVANCE', 'DECOMPTE', 'PARTICIPATION DES PARENTS', 'RECETTE', 'RETRAIT', 'CADEAU', 'FRAIS', 'ACHAT', 'PAIEMENT', 'ENCAISSEMENT', 'VENTE'];
  const ACCOUNT_RE = /^\d{4,5}\.\d{3,4}(?:\.\d{2})?$/;

  /** Date ISO existant réellement : « 2026-02-30 » est rejetée (JavaScript la décalerait au 2 mars). */
  function isRealDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return false;
    const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1) return false;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function newId() {
    return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  }

  /** Registre vide d'une année. */
  function emptyRegister(annee, opts) {
    opts = opts || {};
    const y = Number(annee) || new Date().getFullYear();
    return {
      version: VERSION,
      annee: y,
      caisse: opts.caisse || P.DEFAULT_CAISSE,
      opening: { date: opts.openingDate || `${y}-01-01`, amount: soldeOk(opts.openingAmount) },
      // Signataires du relevé de caisse. Vides par défaut : le relevé écrit alors « Visa du
      // responsable » / « Visa du boursier », comme le formulaire vierge. Les vrais noms sont
      // saisis dans l'application et restent dans les données locales.
      visas: { responsable: String(opts.visaResponsable || ''), boursier: String(opts.visaBoursier || '') },
      pieces: [],
      comptages: [],
      updatedAt: new Date().toISOString(),
    };
  }

  /** Vérifie et complète un registre lu depuis un fichier ; renvoie null s'il est inutilisable. */
  function normalizeRegister(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const annee = Number(raw.annee);
    if (!annee || annee < 1990 || annee > 2100) return null;
    const reg = emptyRegister(annee, {
      caisse: raw.caisse, openingDate: raw.opening && raw.opening.date, openingAmount: raw.opening && raw.opening.amount,
      visaResponsable: raw.visas && raw.visas.responsable, visaBoursier: raw.visas && raw.visas.boursier,
    });
    reg.pieces = (Array.isArray(raw.pieces) ? raw.pieces : []).map((p) => normalizePiece(p)).filter(Boolean);
    sortPieces(reg);
    reg.comptages = (Array.isArray(raw.comptages) ? raw.comptages : []).map((c) => normalizeCount(c)).filter(Boolean);
    sortCounts(reg);
    reg.updatedAt = raw.updatedAt || reg.updatedAt;
    return reg;
  }

  /**
   * Montant tel qu'il entre dans le registre. Il ne vient pas toujours de la fiche : une
   * sauvegarde restaurée, un classeur repris ou une lecture de scan peuvent porter n'importe quoi.
   *  - hors des nombres finis → 0. « 1e309 » vaut Infinity, et round2 fait déjà passer 1e308 à
   *    Infinity en multipliant par 100 : une seule pièce rendait tout le journal infini ;
   *  - négatif → 0. Le sens porte déjà l'entrée ou la sortie ; un montant négatif restauré
   *    inversait l'écriture en silence (une sortie de −50 augmentait le solde).
   * Zéro est le bon refus : validate() le signale, la pièce reste visible et corrigeable, au lieu
   * d'être perdue ou de fausser le solde sans rien dire.
   */
  function montantOk(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    const r = P.round2(n);
    return Number.isFinite(r) && r > 0 ? r : 0;
  }

  /** Solde à nouveau : un solde peut être négatif (report d'une erreur), mais jamais infini. */
  function soldeOk(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    const r = P.round2(n);
    return Number.isFinite(r) ? r : 0;
  }

  function normalizePiece(p) {
    if (!p || typeof p !== 'object') return null;
    const montant = montantOk(p.montant);
    return {
      id: String(p.id || newId()),
      no: p.no == null || p.no === '' || !Number.isFinite(Number(p.no)) ? null : Number(p.no),
      date: p.date || null,
      type: p.type || '',
      objet: p.objet || 'Autre',
      classe: p.classe || '',
      periode: p.periode || '',
      detail: p.detail || '',
      personne: p.personne || '',
      libelle: p.libelle || '',
      compte: p.compte || '',
      montant,
      sens: p.sens === 'debit' || p.sens === 'credit' ? p.sens : null,
      justificatifs: Array.isArray(p.justificatifs) ? p.justificatifs.filter((j) => j && j.name).map((j) => ({ name: String(j.name), size: Number(j.size) || 0, kind: j.kind || kindOf(j.name) })) : [],
      // Décompte dont le décompte DGEO reste à établir. Coché sur la fiche, il ne change rien à
      // la comptabilité : il dit seulement dans quel bac le scan signé ira se poser (voir pile.js).
      decompteAFaire: !!p.decompteAFaire,
      source: p.source === 'scan' || p.source === 'dgeo' || p.source === 'excel' ? p.source : 'saisie',
      ref: p.ref ? String(p.ref) : '',
      // Pièce lue sur un scan : elle entre au journal tout de suite, mais reste marquée tant
      // qu'une personne ne l'a pas regardée. « scanKey » la relie à ce qui a été lu, pour qu'une
      // relecture (fin de l'OCR, correction) la mette à jour au lieu d'en créer une seconde.
      scanKey: p.scanKey ? String(p.scanKey) : '',
      aVerifier: !!p.aVerifier,
      doutes: Array.isArray(p.doutes) ? p.doutes.map(String).slice(0, 12) : [],
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString(),
    };
  }

  function kindOf(name) {
    return /\.pdf$/i.test(name) ? 'pdf' : /\.(jpe?g)$/i.test(name) ? 'jpeg' : /\.png$/i.test(name) ? 'png' : 'autre';
  }

  function sortPieces(reg) {
    reg.pieces.sort((a, b) => (a.no == null ? 1e9 : a.no) - (b.no == null ? 1e9 : b.no) || String(a.createdAt).localeCompare(String(b.createdAt)));
  }

  /** Prochain numéro libre. */
  function nextNo(reg) {
    let max = 0;
    for (const p of reg.pieces) if (p.no != null && p.no > max) max = p.no;
    return max + 1;
  }

  /** Nouvelle pièce vierge, pré-remplie (n° suivant, date du jour). */
  /**
   * Montant tapé à la main : « 4'825.55 », « 4 825,55 », « CHF 4825.55 » → 4825.55.
   * « 400.– », « 400.- », « Fr. 400.- » → 400 : c'est ainsi qu'on écrit les francs ronds en Suisse,
   * et c'est ce qu'on lit sur la quittance. Ils étaient refusés comme « Montant manquant ».
   * Renvoie null si le texte n'est pas un montant (au lieu de 0, qui passait pour une saisie).
   */
  function parseAmountInput(text) {
    const t = String(text == null ? '' : text)
      .replace(/chf|frs?\.?/ig, '')
      .replace(/[\s\u00A0’'´`]/g, '')
      .replace(',', '.')
      .replace(/(\d)\.?[-–—]+$/, '$1') // « 400.– », « 400.-- » : pas de centimes
      .replace(/(\d)\.$/, '$1') // « 400. »
      .trim();
    if (t === '' || !/^-?\d+(\.\d+)?$/.test(t)) return null;
    const v = Number(t);
    return isFinite(v) ? P.round2(v) : null;
  }

  function newPiece(reg) {
    // La date proposée reste dans l'année du registre ouvert : sur un registre d'une année passée,
    // la date du jour était refusée à l'enregistrement et devait être retapée à chaque pièce.
    const t = today();
    const annee = reg && reg.annee;
    const date = annee && String(t).slice(0, 4) !== String(annee) ? `${annee}-01-01` : t;
    return normalizePiece({ id: newId(), no: nextNo(reg), date, type: 'REMBOURSEMENT', objet: 'Autre', sens: 'credit' });
  }

  /**
   * Description composée depuis les champs structurés : « Camp 8P/3 du 12-16.05.2026 Leysin ».
   * L'objet « Autre » n'est pas écrit : seul le détail compte.
   */
  function composeDescription(p) {
    const parts = [];
    // l'objet n'est écrit que s'il n'est pas déjà dans le détail (pièces lues sur un scan)
    if (p.objet && p.objet !== 'Autre' && P.objetOf(p.detail || '') !== p.objet) parts.push(p.objet);
    if (p.classe) parts.push(p.classe);
    if (p.periode) parts.push(/^(du|le|les)\b/i.test(p.periode.trim()) ? p.periode.trim() : `du ${p.periode.trim()}`);
    if (p.detail) parts.push(p.detail.trim());
    let desc = parts.join(' ').replace(/\s+/g, ' ').trim();
    if (desc) desc = desc[0].toUpperCase() + desc.slice(1);
    return desc;
  }

  /* ---------------- Comptage de la caisse ---------------- */
  /** Coupures en circulation (CHF) : billets puis pièces. */
  const BILLETS = [1000, 200, 100, 50, 20, 10];
  const PIECES = [5, 2, 1, 0.5, 0.2, 0.1, 0.05];
  const DENOMS = BILLETS.concat(PIECES);
  const denomKey = (d) => String(d);

  /**
   * Nombre de coupures comptées : un entier positif et vraisemblable. Sans borne, « 1e309 » tapé
   * ou restauré rendait le total du comptage infini, donc l'écart de caisse aussi.
   * Un million de billets d'une même coupure, c'est déjà bien au-delà d'une caisse d'école.
   */
  const QUANTITE_MAX = 1000000;
  function quantiteOk(v) {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(n, QUANTITE_MAX);
  }

  /** Montants d'un comptage { '100': 3, '0.5': 2, … } -> { billets, pieces, total }. */
  function countTotal(counts) {
    counts = counts || {};
    let billets = 0; let pieces = 0;
    for (const d of BILLETS) billets += d * quantiteOk(counts[denomKey(d)]);
    for (const d of PIECES) pieces += d * quantiteOk(counts[denomKey(d)]);
    billets = P.round2(billets); pieces = P.round2(pieces);
    return { billets, pieces, total: P.round2(billets + pieces) };
  }

  function normalizeCount(c) {
    if (!c || typeof c !== 'object') return null;
    const counts = {};
    for (const d of DENOMS) {
      // la quantité stockée est bornée comme celle qu'on additionne : sinon le comptage
      // enregistré ne dirait pas la même chose que son propre total
      const n = quantiteOk((c.counts || {})[denomKey(d)]);
      if (n) counts[denomKey(d)] = n;
    }
    const t = countTotal(counts);
    return { id: String(c.id || newId()), date: c.date || today(), counts, billets: t.billets, pieces: t.pieces, total: t.total, note: String(c.note || ''), createdAt: c.createdAt || new Date().toISOString() };
  }

  function sortCounts(reg) {
    reg.comptages.sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.createdAt).localeCompare(String(b.createdAt)));
  }

  /** Ajoute ou remplace un comptage (par id), puis trie par date. */
  function upsertCount(reg, c) {
    const n = normalizeCount(c);
    if (!n) return null;
    if (!Array.isArray(reg.comptages)) reg.comptages = [];
    const i = reg.comptages.findIndex((x) => x.id === n.id);
    if (i >= 0) reg.comptages[i] = n; else reg.comptages.push(n);
    sortCounts(reg);
    reg.updatedAt = new Date().toISOString();
    return n;
  }

  function removeCount(reg, id) {
    reg.comptages = (reg.comptages || []).filter((c) => c.id !== id);
    reg.updatedAt = new Date().toISOString();
  }

  /**
   * Dernier comptage à la date donnée ou avant (le « dernier solde »). `ref` = comptage en cours de
   * modification ({ id, createdAt }) : il est ignoré, ainsi que les comptages du même jour faits après lui.
   */
  function previousCount(reg, date, ref) {
    const d = String(date || today());
    let best = null;
    for (const c of reg.comptages || []) {
      if (ref && c.id === ref.id) continue;
      if (String(c.date) > d) continue;
      if (ref && String(c.date) === d && ref.createdAt && String(c.createdAt) > String(ref.createdAt)) continue;
      if (!best || String(c.date) > String(best.date) || (String(c.date) === String(best.date) && String(c.createdAt) > String(best.createdAt))) best = c;
    }
    return best;
  }

  /** Solde du journal à une date : solde à nouveau + écritures datées jusqu'à cette date incluse. */
  /**
   * Solde du journal à une date : solde à nouveau + écritures jusqu'à cette date. Les pièces sans date
   * (lues sur un scan illisible ou reprises d'un classeur) sont comptées : sinon ce solde ne
   * correspondrait pas au solde final du journal, qui les compte.
   */
  function balanceAt(reg, date) {
    const d = String(date || today());
    let bal = Number(reg.opening && reg.opening.amount) || 0;
    for (const p of reg.pieces || []) {
      if ((p.date && String(p.date) > d) || !(p.montant > 0)) continue;
      if (p.sens === 'debit') bal += p.montant; else if (p.sens === 'credit') bal -= p.montant;
    }
    return P.round2(bal);
  }

  /**
   * Encaissements et décaissements entre deux dates, pour le relevé de caisse : ce qui est entré
   * et sorti depuis le point de référence (le comptage précédent, ou le solde à nouveau).
   *
   * `from` nul veut dire « depuis le début de l'année » : les pièces sans date y sont comptées,
   * exactement comme le fait balanceAt, pour que l'identité tienne —
   *   situation au point de référence + encaissements − décaissements = solde du journal.
   * Sans cela, le relevé ne tomberait pas juste dès qu'une pièce scannée est datée illisiblement.
   */
  function periodMovements(reg, from, to) {
    const d2 = String(to || today());
    const d1 = from == null ? null : String(from);
    let enc = 0; let dec = 0; let n = 0;
    for (const p of (reg && reg.pieces) || []) {
      if (!(p.montant > 0)) continue;
      if (!p.date) { if (d1 !== null) continue; } // sans date : seulement « depuis le début »
      else if (String(p.date) > d2 || (d1 !== null && String(p.date) <= d1)) continue;
      if (p.sens === 'debit') enc += p.montant;
      else if (p.sens === 'credit') dec += p.montant;
      else continue;
      n++;
    }
    return { encaissements: P.round2(enc), decaissements: P.round2(dec), pieces: n };
  }

  /** Libellé du journal : « TYPE - Description - Personne ». */
  function composeLibelle(p) {
    return P.formatLibelle(p.type || null, composeDescription(p), p.personne || null);
  }

  /** Période « 12.06.2026 », « 12-16.05.2026 » ou « 29.06-02.07.2026 » depuis deux dates jj.mm.aaaa. */
  function periodOf(debut, fin) {
    const a = P.displayToIso(debut); const b = P.displayToIso(fin) || a;
    if (!a) return String(debut || '').trim();
    const [ya, ma, da] = a.split('-'); const [yb, mb, db] = b.split('-');
    if (a === b) return `${da}.${ma}.${ya}`;
    if (ya === yb && ma === mb) return `${da}-${db}.${ma}.${ya}`;
    if (ya === yb) return `${da}.${ma}-${db}.${mb}.${ya}`;
    return `${da}.${ma}.${ya}-${db}.${mb}.${yb}`;
  }

  /**
   * Pièce DECOMPTE proposée depuis un dossier terminé dans Décompte DGEO (fichier Excel généré).
   * Les champs descriptifs viennent du formulaire de couverture du dossier. Le montant proposé est
   * ce que l'enseignant-e a payé de sa poche (colonne du formulaire), à défaut le total des
   * dépenses du formulaire, à défaut la part État calculée : les trois sont renvoyés pour que la
   * personne choisisse. Renvoie { piece, amounts, amountSource }.
   */
  function pieceFromDecompte(d, reg) {
    d = d || {};
    const p = newPiece(reg);
    p.type = 'DECOMPTE';
    p.objet = d.type_activite === 'camp' ? 'Camp' : "Course d'école";
    p.classe = String(d.classe || '').trim();
    p.periode = periodOf(d.date_debut, d.date_fin);
    p.detail = String(d.activite || '').trim();
    p.personne = String(d.enseignant || '').trim();
    const num = (v) => { const n = Number(v); return n > 0 ? P.round2(n) : null; };
    let paid = 0;
    for (const e of Array.isArray(d.form_expenses) ? d.form_expenses : []) paid += Number(e && e.paye_enseignant) || 0;
    const amounts = { enseignant: num(paid), formulaire: num(d.form_total), etat: num(d.total) };
    const amountSource = amounts.enseignant != null ? 'enseignant' : amounts.formulaire != null ? 'formulaire' : amounts.etat != null ? 'etat' : null;
    p.montant = amountSource ? amounts[amountSource] : 0;
    // remboursement à l'enseignant-e = sortie de caisse ; sinon la personne choisit le sens
    p.sens = amountSource === 'enseignant' ? 'credit' : null;
    const dd = P.displayToIso(d.date_decompte);
    if (dd && dd.slice(0, 4) === String(reg.annee)) p.date = dd;
    p.source = 'dgeo';
    p.ref = String(d.numero || d.filename || '').trim();
    p.libelle = composeLibelle(p);
    return { piece: p, amounts, amountSource };
  }

  /** Sens fixé par la logique des libellés (null pour DECOMPTE : à choisir). */
  function sensFor(type) {
    return P.sideFromType(type) || null;
  }

  /** Comptes proposés pour une pièce (les plus habituels d'abord). */
  function accountSuggestions(p, vocab, reg) {
    const history = (reg ? reg.pieces : []).filter((x) => x.compte && x.type).map((x) => ({ type: x.type, objet: x.objet, degre: P.degreOf(x.classe || ''), compte: x.compte }));
    const degre = P.degreOf(p.classe || '') || P.degreOf(p.detail || '');
    return P.suggestAccountFor(p.type, p.objet, degre, vocab, history);
  }

  /**
   * Tous les comptes proposables pour une pièce, du plus probable au moins probable, avec de quoi
   * choisir sans les connaître par cœur : à quoi sert habituellement le compte, et de quel côté
   * il tombe d'ordinaire.
   *
   * Les quatre « comptes habituels » suffisaient quand le bon en faisait partie ; sinon il fallait
   * connaître le numéro et le taper. La liste complète, elle, se parcourt.
   *
   *   niveau 0 : déjà employé pour ce type, cet objet et ce degré
   *   niveau 1 : pour ce type et cet objet
   *   niveau 2 : pour ce type
   *   niveau 3 : compte connu, jamais employé pour ce type
   */
  function accountChoices(p, vocab, reg, opts) {
    vocab = vocab || {};
    opts = opts || {};
    const sugg = accountSuggestions(p, vocab, reg);
    const rang = new Map();
    sugg.forEach((s, i) => rang.set(s.compte, { n: s.n, niveau: s.niveau, ordre: i }));

    // ce à quoi sert le compte : le couple type + objet le plus fréquent du classeur de référence
    const usages = new Map();
    const noter = (compte, libelle, n) => {
      if (!compte || !libelle) return;
      const m = usages.get(compte) || new Map();
      m.set(libelle, (m.get(libelle) || 0) + (n || 1));
      usages.set(compte, m);
    };
    // Une seule source par compte, sinon les mêmes écritures sont comptées deux fois sous deux
    // étiquettes et la plus vague l'emporte. On préfère le détail (type + objet), et on ne
    // retombe sur le type seul que pour les comptes qui n'ont pas d'objet connu. « Autre » n'est
    // pas un objet : on ne l'écrit pas. Le degré est omis, ce qui fusionne primaire et secondaire.
    const etiquette = (type, objet) => [type, objet && objet !== 'Autre' ? objet : null].filter(Boolean).join(' · ');
    const avecObjet = new Set();
    for (const h of vocab.objetAccounts || []) if (h && h.compte) { avecObjet.add(h.compte); noter(h.compte, etiquette(h.type, h.objet), h.n); }
    for (const h of vocab.typeAccounts || []) if (h && h.compte && !avecObjet.has(h.compte)) noter(h.compte, etiquette(h.type, null), h.n);
    for (const x of (reg && reg.pieces) || []) if (x.compte && x.type) noter(x.compte, etiquette(x.type, x.objet), 1);
    const usageDe = (c) => {
      const m = usages.get(c);
      if (!m) return '';
      let best = ''; let n = -1;
      for (const [k, v] of m) if (v > n || (v === n && k.length < best.length)) { best = k; n = v; }
      return best;
    };

    // Pour le type de la pièce en cours : avec quels objets chaque compte a servi. Presque tous
    // les comptes d'un remboursement s'étiquetaient « REMBOURSEMENT » : la liste ne distinguait
    // rien. Les objets (Repas, Matériel, Collation…) les distinguent, eux.
    const cleType = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    const typeCourant = cleType(p && p.type);
    const objetsDuType = new Map(); // compte -> Map(objet -> n) ; « Autre » compté sous ''
    const noterObjet = (compte, type, objet, n) => {
      if (!compte || !typeCourant || cleType(type) !== typeCourant) return;
      const m = objetsDuType.get(compte) || new Map();
      const o = objet && objet !== 'Autre' ? objet : '';
      m.set(o, (m.get(o) || 0) + (n || 1));
      objetsDuType.set(compte, m);
    };
    for (const h of vocab.objetAccounts || []) if (h && h.compte) noterObjet(h.compte, h.type, h.objet, h.n);
    for (const x of (reg && reg.pieces) || []) if (x.compte) noterObjet(x.compte, x.type, x.objet, 1);
    const objetsDe = (c) => {
      const m = objetsDuType.get(c);
      if (!m) return null;
      return Array.from(m).filter(([o]) => o).sort((a, b) => b[1] - a[1]).map(([o]) => o);
    };

    // Un exemple réel : la description de la dernière pièce passée sur ce compte, cette année ou
    // l'année d'avant (opts.pieces). « ex. Collation du chœur » dit plus qu'un numéro.
    const exemples = new Map();
    const passees = ((reg && reg.pieces) || []).concat(opts.pieces || [])
      .filter((x) => x && x.compte)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    for (const x of passees) {
      if (exemples.has(x.compte)) continue;
      const d = composeDescription(x);
      if (d) exemples.set(x.compte, d);
    }

    // côté habituel : une entrée en caisse ou une sortie
    const cotes = new Map();
    for (const a of vocab.accountSides || []) {
      if (!a || !a.compte) continue;
      const c = cotes.get(a.compte) || { debit: 0, credit: 0 };
      c[a.side === 'debit' ? 'debit' : 'credit'] += a.n || 1;
      cotes.set(a.compte, c);
    }
    const coteDe = (c) => {
      const v = cotes.get(c);
      if (!v || v.debit === v.credit) return '';
      return v.debit > v.credit ? 'debit' : 'credit';
    };

    const tous = new Set();
    for (const c of vocab.accounts || []) if (c) tous.add(String(c));
    for (const x of (reg && reg.pieces) || []) if (x.compte) tous.add(String(x.compte));
    for (const s of sugg) tous.add(String(s.compte));

    return Array.from(tous).map((compte) => {
      const r = rang.get(compte);
      return {
        compte,
        n: r ? r.n : 0,
        niveau: r ? r.niveau : 3,
        ordre: r ? r.ordre : 0,
        usage: usageDe(compte),
        sens: coteDe(compte),
        // null : jamais employé pour ce type ; [] : employé pour ce type, sans objet précis
        objets: objetsDe(compte),
        exemple: exemples.get(compte) || '',
      };
    }).sort((a, b) => a.niveau - b.niveau || a.ordre - b.ordre || b.n - a.n || a.compte.localeCompare(b.compte));
  }

  /**
   * Le compte à remplir d'office pour une pièce, ou null. Il n'est proposé que s'il s'impose :
   * employé au moins deux fois sur trois pour ce type et cet objet (et ce degré). Un compte pris
   * une fois sur six (51000.3170.05 pour un remboursement), rempli d'office, était gardé tel
   * quel par qui ne connaît pas les comptes — qu'il convienne ou non.
   * Rend { compte, n, total, niveau } ou null.
   */
  function compteImpose(p, vocab, reg) {
    const sugg = accountSuggestions(p, vocab, reg);
    if (!sugg.length || sugg[0].niveau > 1) return null;
    const total = sugg.reduce((t, x) => t + x.n, 0);
    return sugg[0].n * 3 >= total * 2 ? { compte: sugg[0].compte, n: sugg[0].n, total, niveau: sugg[0].niveau } : null;
  }

  /**
   * Erreurs bloquantes d'une pièce, chacune avec le champ de la fiche qu'elle concerne (liste vide
   * = pièce valable). Chaque message dit quoi faire, pas seulement ce qui manque : « le n° 1 existe
   * déjà » laissait chercher le numéro libre, « Montant manquant » s'affichait sous « 400.– ».
   *   opts.montantTape : le texte du champ Montant, pour distinguer un montant vide d'un illisible.
   * Rend [{ champ, message, libre? }] — `libre` : le prochain numéro libre, à proposer.
   */
  function validateChamps(p, reg, opts) {
    opts = opts || {};
    const errs = [];
    const err = (champ, message, extra) => errs.push(Object.assign({ champ, message }, extra || {}));
    if (p.no == null || !Number.isInteger(p.no) || p.no <= 0) err('pNo', 'Numéro de pièce à indiquer (un nombre entier : 1, 2, 3…)', reg ? { libre: nextNo(reg) } : null);
    else if (reg && reg.pieces.some((x) => x.id !== p.id && x.no === p.no)) {
      const libre = nextNo({ pieces: reg.pieces.filter((x) => x.id !== p.id) });
      err('pNo', `Le n° ${p.no} existe déjà dans le registre : le prochain numéro libre est le ${libre}`, { libre });
    }
    if (!isRealDate(p.date)) err('pDate', 'Date à indiquer');
    else if (reg && String(p.date).slice(0, 4) !== String(reg.annee)) {
      err('pDate', `La date n'est pas dans l'année ${reg.annee}, celle du registre ouvert. Pour une autre année : espace « L'année », « Changer d'année »`);
    }
    if (!p.type) err('pType', "Type d'écriture à choisir");
    if (!(p.montant > 0)) {
      const tape = String(opts.montantTape == null ? '' : opts.montantTape).trim();
      const lu = tape ? parseAmountInput(tape) : null;
      if (!tape) err('pMontant', 'Montant à indiquer');
      else if (lu == null) err('pMontant', `« ${tape} » n'est pas un montant lisible : tapez par exemple 400 ou 29.70`);
      else err('pMontant', "Le montant doit être plus grand que zéro, sans signe moins : l'entrée ou la sortie se choisit dans « Sens de l'écriture »");
    }
    if (!p.compte) err('pCompte', 'Compte à choisir : ouvrez la liste du champ Compte');
    else if (!ACCOUNT_RE.test(p.compte)) err('pCompte', `« ${p.compte} » n'est pas un n° de compte (il s'écrit comme 51000.3662.00)`);
    else if (reg && p.compte === reg.caisse) err('pCompte', 'Ce compte est le compte caisse lui-même : choisissez celui de la dépense ou de la recette');
    if (!p.sens) err('sens', "Sens de l'écriture à choisir (entrée ou sortie de caisse)");
    if (!(p.libelle || composeLibelle(p)).trim()) err('pLibelle', 'Libellé vide');
    if (!p.personne) err('pPersonne', 'Personne à indiquer (initiale et nom, ex. A. Berger)');
    return errs;
  }

  /** Erreurs bloquantes d'une pièce, en texte (liste vide = pièce valable). */
  function validate(p, reg, opts) {
    return validateChamps(p, reg, opts).map((e) => e.message);
  }

  /** Ajoute ou remplace une pièce (par id), puis trie. */
  function upsertPiece(reg, piece) {
    const p = normalizePiece(piece);
    p.updatedAt = new Date().toISOString();
    if (!p.libelle) p.libelle = composeLibelle(p);
    const i = reg.pieces.findIndex((x) => x.id === p.id);
    if (i >= 0) reg.pieces[i] = Object.assign({}, reg.pieces[i], p);
    else reg.pieces.push(p);
    sortPieces(reg);
    reg.updatedAt = new Date().toISOString();
    return reg.pieces.find((x) => x.id === p.id);
  }

  /**
   * Verse dans le registre les écritures lues sur des scans, et les y maintient à jour.
   *
   * Chaque écriture porte une clé stable (scanKey) : relue après l'OCR ou corrigée à l'écran,
   * elle met à jour SA pièce au lieu d'en créer une seconde. Une écriture qui correspond à une
   * pièce déjà saisie à la main (même n°, même montant, même sens) ne crée rien : elle se
   * rattache à cette pièce, qui reste telle qu'elle a été saisie. Une pièce déjà vérifiée n'est
   * plus réécrite par une relecture.
   *
   * Renvoie { ajoutees, misesAJour, rattachees, inchangees, sansMontant }.
   */
  function syncScanBatch(reg, entries, opts) {
    opts = opts || {};
    const res = { ajoutees: [], misesAJour: [], rattachees: [], inchangees: [], sansMontant: [] };
    const cents = (v) => Math.round((Number(v) || 0) * 100);
    for (const e of entries || []) {
      const key = String(e.scanKey || '');
      if (!key) continue;
      const montant = P.round2(Number(e.debit) > 0 ? Number(e.debit) : (Number(e.credit) > 0 ? Number(e.credit) : 0));
      const sens = Number(e.debit) > 0 ? 'debit' : (Number(e.credit) > 0 ? 'credit' : null);
      if (!(montant > 0)) { res.sansMontant.push(e); continue; }

      const existante = reg.pieces.find((x) => x.scanKey === key);
      if (existante) {
        if (!existante.aVerifier) { res.inchangees.push(existante); continue; } // vérifiée : on n'y touche plus
        const [maj] = piecesFromEntries([e], 'scan');
        const doutes = (e.warnings || []).map(String).slice(0, 12);
        // rien de nouveau dans la lecture : on ne réécrit pas (sinon le registre serait enregistré
        // à chaque rafraîchissement de l'écran)
        const pareil = existante.no === maj.no && existante.date === maj.date && existante.compte === maj.compte
          && existante.libelle === (maj.libelle || composeLibelle(maj)) && cents(existante.montant) === cents(maj.montant)
          && existante.sens === maj.sens && existante.doutes.join('|') === doutes.join('|');
        if (pareil) { res.inchangees.push(existante); continue; }
        upsertPiece(reg, Object.assign({}, maj, {
          id: existante.id, scanKey: key, aVerifier: true, doutes,
          justificatifs: existante.justificatifs, createdAt: existante.createdAt,
        }));
        res.misesAJour.push(reg.pieces.find((x) => x.id === existante.id));
        continue;
      }

      // déjà saisie à la main (ou reprise d'un classeur) : on s'y rattache, sans la réécrire
      const jumelle = reg.pieces.find((x) => !x.scanKey && x.no != null && e.no != null && Number(x.no) === Number(e.no)
        && cents(x.montant) === cents(montant) && x.sens === sens);
      if (jumelle) {
        jumelle.scanKey = key;
        jumelle.updatedAt = new Date().toISOString();
        res.rattachees.push(jumelle);
        continue;
      }

      const [neuve] = piecesFromEntries([e], 'scan');
      upsertPiece(reg, Object.assign({}, neuve, { scanKey: key, aVerifier: true, doutes: (e.warnings || []).slice(0, 12) }));
      res.ajoutees.push(reg.pieces.find((x) => x.scanKey === key));
    }
    if (res.ajoutees.length || res.misesAJour.length || res.rattachees.length) reg.updatedAt = new Date().toISOString();
    return res;
  }

  /** Retire du registre les pièces d'un lot scanné qui n'ont pas encore été vérifiées. */
  function removeScanBatch(reg, keys) {
    const garder = new Set((keys || []).map(String));
    const partent = reg.pieces.filter((p) => p.aVerifier && p.scanKey && garder.has(p.scanKey));
    for (const p of partent) removePiece(reg, p.id);
    // une pièce saisie à la main à laquelle le lot s'était rattaché redevient simplement elle-même
    for (const p of reg.pieces) if (p.scanKey && garder.has(p.scanKey)) p.scanKey = '';
    return partent;
  }

  /** Pièces du registre encore à vérifier (lues sur un scan, jamais regardées). */
  function pendingPieces(reg) {
    return reg && Array.isArray(reg.pieces) ? reg.pieces.filter((p) => p.aVerifier) : [];
  }

  /** Marque des pièces comme vérifiées (leur lecture est confirmée). */
  function markVerified(reg, ids) {
    const cible = new Set((ids || []).map(String));
    const faites = [];
    for (const p of reg.pieces) {
      if (!p.aVerifier || !cible.has(p.id)) continue;
      p.aVerifier = false;
      p.doutes = [];
      p.updatedAt = new Date().toISOString();
      faites.push(p);
    }
    if (faites.length) reg.updatedAt = new Date().toISOString();
    return faites;
  }

  function removePiece(reg, id) {
    const i = reg.pieces.findIndex((x) => x.id === id);
    if (i >= 0) reg.pieces.splice(i, 1);
    reg.updatedAt = new Date().toISOString();
  }

  /** Écritures au format du journal / du classeur Excel. */
  function entriesOf(reg) {
    return reg.pieces.map((p) => ({
      id: p.id,
      no: p.no,
      date: p.date,
      compte: p.compte,
      libelle: p.libelle || composeLibelle(p),
      debit: p.sens === 'debit' ? p.montant : null,
      credit: p.sens === 'credit' ? p.montant : null,
    }));
  }

  /** Journal avec solde cumulé et totaux. */
  function journal(reg) {
    let solde = P.round2(reg.opening.amount);
    let debits = 0;
    let credits = 0;
    const rows = entriesOf(reg).map((e) => {
      solde = P.round2(solde + (e.debit || 0) - (e.credit || 0));
      debits += e.debit || 0;
      credits += e.credit || 0;
      return Object.assign({}, e, { solde });
    });
    return { rows, start: reg.opening.amount, debits: P.round2(debits), credits: P.round2(credits), end: solde };
  }

  /**
   * Recherche libre dans les lignes du journal. Plusieurs mots = toutes les conditions
   * (« berger camp »).
   *
   * Un nombre seul (« 47 ») est le geste le plus courant : c'est un numéro de pièce, et il doit
   * rendre la pièce 47, pas les quarante lignes dont le compte ou la date contient « 47 ». Un
   * nombre nu se compare donc en entier — au n°, au montant, ou à un groupe complet du compte ou
   * de la date. Dès qu'il y a un séparateur (« 12.06.2026 », « 9206.101 ») ou du texte, on
   * revient à une recherche par morceau, qui est ce qu'on attend en tapant un bout de nom.
   *
   * Le solde affiché reste celui de la ligne dans l'année : on filtre l'affichage, jamais le calcul.
   */
  function searchRows(rows, query) {
    const q = String(query == null ? '' : query).trim().toLowerCase();
    if (!q) return rows || [];
    const mots = q.split(/\s+/);
    const groupes = (t) => String(t || '').split(/[^0-9]+/).filter(Boolean);
    return (rows || []).filter((r) => {
      const montant = r.debit != null ? r.debit : r.credit;
      const libelle = String(r.libelle || '').toLowerCase();
      const compte = String(r.compte || '').toLowerCase();
      const dates = [String(r.date || ''), P.isoToDisplay(r.date || '') || ''];
      const montants = montant == null ? [] : [String(montant), Number(montant).toFixed(2)];
      return mots.every((m) => {
        if (/^\d+$/.test(m)) {
          const n = Number(m);
          if (r.no != null && Number(r.no) === n) return true;
          if (montant != null && Number(montant) === n) return true;
          // groupes comparés tels qu'ils sont écrits : « 06 » trouve juin, « 6 » ne le trouve pas
          // par accident en cherchant la pièce 6, et « 3 » ne ramène pas tout le mois de mars
          if (groupes(compte).some((g) => g === m)) return true;
          if (dates.some((d) => groupes(d).some((g) => g === m))) return true;
          return libelle.includes(m);
        }
        return [libelle, compte].concat(dates.map((d) => d.toLowerCase())).concat(montants).some((f) => f.includes(m));
      });
    });
  }

  /**
   * Suite des numéros de pièces de l'année : trous et doublons. Le n° est le lien avec le papier —
   * un trou, c'est une pièce comptable qui n'a jamais été saisie, et on ne s'en aperçoit
   * autrement qu'au comptage suivant ou à la clôture.
   */
  function numberChecks(reg) {
    const nos = (reg && reg.pieces ? reg.pieces : [])
      .map((p) => p.no).filter((n) => Number.isInteger(n) && n > 0);
    const counts = new Map();
    for (const n of nos) counts.set(n, (counts.get(n) || 0) + 1);
    const doublons = Array.from(counts.entries()).filter(([, c]) => c > 1).map(([n]) => n).sort((a, b) => a - b);
    const manquants = [];
    if (nos.length) {
      // depuis 1 : une année qui commence à 12 a onze pièces d'avance, ce n'est pas un trou
      for (let n = Math.min.apply(null, nos); n <= Math.max.apply(null, nos); n++) if (!counts.has(n)) manquants.push(n);
    }
    const sansNo = (reg && reg.pieces ? reg.pieces : []).filter((p) => !Number.isInteger(p.no) || p.no <= 0).length;
    // Regroupés en plages : après une reprise de classeur la numérotation peut sauter de 200,
    // et lister 200 numéros ne dit rien. « 2–200, 202 » se lit d'un coup d'œil.
    const plages = [];
    for (const n of manquants) {
      const last = plages[plages.length - 1];
      if (last && n === last[1] + 1) last[1] = n; else plages.push([n, n]);
    }
    return { manquants, plages, doublons, sansNo, premier: nos.length ? Math.min.apply(null, nos) : null, dernier: nos.length ? Math.max.apply(null, nos) : null };
  }

  /**
   * Pourquoi la caisse ne tombe pas juste. L'écart seul ne dit rien ; il vaut souvent le montant
   * d'une pièce, et alors on sait où regarder :
   *  - écart = ± le montant d'une pièce du journal → pièce saisie en double, ou argent jamais
   *    passé en caisse ;
   *  - écart = ± deux fois le montant d'une pièce → elle est du mauvais côté (débit au lieu de
   *    crédit) : la corriger déplace le solde du double de son montant ;
   *  - un n° manquant dans la suite → la pièce papier correspondante n'a pas été saisie.
   * Ne renvoie que des correspondances au centime près : une piste fausse coûte plus qu'aucune.
   */
  function explainGap(reg, ecart, dateISO) {
    const cents = (v) => Math.round((Number(v) || 0) * 100);
    const e = cents(ecart);
    const pistes = [];
    if (!reg || !reg.pieces || e === 0) return pistes;
    const jusqua = dateISO || null;
    const candidates = reg.pieces.filter((p) => p.montant > 0 && (!jusqua || !p.date || p.date <= jusqua));
    for (const p of candidates) {
      const m = cents(p.montant);
      // la pièce compte dans le solde avec son signe : +m au débit, −m au crédit
      const signe = p.sens === 'debit' ? 1 : -1;
      // l'enlever ramènerait le solde de −signe×m, donc comblerait un écart de +signe×m… au signe près
      if (m === Math.abs(e)) pistes.push({ genre: 'montant', piece: p, ecart: ecart });
      else if (2 * m === Math.abs(e) && signe * e < 0) pistes.push({ genre: 'sens', piece: p, ecart: ecart });
    }
    const n = numberChecks(reg);
    if (n.manquants.length) pistes.push({ genre: 'numero', manquants: n.manquants.slice(0, 10), total: n.manquants.length });
    return pistes;
  }

  /** Pièces créées depuis des écritures lues sur des PDF scannés (source « scan ») ou reprises d'un classeur Excel (« excel »). */
  function piecesFromEntries(entries, source) {
    return (entries || []).map((e) => {
      const parts = String(e.libelle || '').split(' - ');
      const personne = parts.length >= 2 && P.looksLikePerson(parts[parts.length - 1]) ? parts[parts.length - 1] : '';
      // Le premier morceau n'est le type que s'il en est vraiment un : « Achat de piles - A. Berger »
      // n'a pas de type, et « REMBOURSEMENT piles » en a un collé à sa description. Prendre
      // aveuglément le premier morceau pour le type vidait la description, et la pièce était
      // réécrite sans elle au premier enregistrement.
      const head = P.splitType(parts[0] || '');
      const type = head.type || '';
      const tail = parts.slice(1, personne ? -1 : undefined);
      const desc = [head.rest, ...tail].filter(Boolean).join(' - ');
      return normalizePiece({
        no: e.no, date: e.date, type, objet: P.objetOf(desc), detail: desc, personne, libelle: e.libelle, compte: e.compte,
        montant: e.debit > 0 ? e.debit : (e.credit > 0 ? e.credit : 0), sens: e.debit > 0 ? 'debit' : (e.credit > 0 ? 'credit' : null), source: source || 'scan',
      });
    });
  }

  /**
   * Reprend dans le registre des écritures venues d'ailleurs : classeur Excel d'une année commencée
   * à la main (source « excel ») ou lot de pièces scannées (« scan »). Une écriture dont le n° est
   * déjà dans le registre n'est pas reprise : même montant et même sens, elle y est déjà
   * (skipped) ; sinon elle est signalée (conflicts). Les écritures sans montant sont ignorées
   * (noAmount) ; celles d'une autre année aussi (otherYears), sauf opts.otherYears.
   * opts.opening = { date, amount } du classeur : repris tel quel si le registre est encore vide,
   * sinon comparé (openingDiffers).
   */
  function mergeEntries(reg, entries, opts) {
    opts = opts || {};
    const pieces = piecesFromEntries(entries, opts.source || 'excel');
    const res = { added: [], skipped: [], conflicts: [], noAmount: [], otherYears: [], openingTaken: false, openingDiffers: false };
    if (opts.opening && typeof opts.opening === 'object') {
      const amount = P.round2(Number(opts.opening.amount) || 0);
      const date = /^\d{4}-\d{2}-\d{2}$/.test(String(opts.opening.date || '')) ? String(opts.opening.date) : null;
      if (!reg.pieces.length) {
        reg.opening.amount = amount;
        if (date) reg.opening.date = date;
        res.openingTaken = true;
      } else if (Math.abs(amount - P.round2(reg.opening.amount)) >= 0.005) res.openingDiffers = true;
    }
    const sameLine = (a, b) => a.date === b.date && a.sens === b.sens && Math.abs((a.montant || 0) - (b.montant || 0)) < 0.005
      && (a.libelle || composeLibelle(a)) === (b.libelle || composeLibelle(b));
    for (const p of pieces) {
      if (!(p.montant > 0)) { res.noAmount.push(p); continue; }
      // sans n° : on compare la ligne entière (date, libellé, montant, sens) pour ne pas la reprendre deux fois
      const same = p.no != null ? reg.pieces.find((x) => x.no === p.no) : reg.pieces.find((x) => x.no == null && sameLine(x, p));
      if (same) {
        if (Math.abs((same.montant || 0) - p.montant) < 0.005 && same.sens === p.sens) res.skipped.push(p); else res.conflicts.push(p);
        continue;
      }
      if (p.date && String(p.date).slice(0, 4) !== String(reg.annee)) { res.otherYears.push(p); if (!opts.otherYears) continue; }
      upsertPiece(reg, p);
      res.added.push(p);
    }
    if (res.added.length) reg.updatedAt = new Date().toISOString();
    return res;
  }

  function serialize(reg) {
    return JSON.stringify(reg, null, 1);
  }

  function parse(text) {
    try { return normalizeRegister(JSON.parse(text)); } catch (e) { return null; }
  }

  /**
   * Lecture d'un registre enregistré : renvoie { reg } si tout va bien, { reg: null } s'il n'existe pas,
   * { error } si le texte existe mais est illisible (fichier tronqué, JSON abîmé). Dans ce dernier cas
   * l'appelant ne doit surtout pas enregistrer par-dessus : la sauvegarde serait perdue.
   */
  function readStored(text) {
    if (text == null || String(text).trim() === '') return { reg: null };
    const reg = parse(text);
    return reg ? { reg } : { reg: null, error: 'registre illisible' };
  }

  /* ------------------------------------------------------------------ */
  /* Stockage                                                               */
  /* ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ */
  /* Plusieurs postes sur le même registre                                  */
  /* ------------------------------------------------------------------ */

  /*
   * Quand les données vivent sur le serveur, deux postes peuvent ouvrir la même année. Chacun
   * enregistre tout le registre d'un bloc : sans précaution, le dernier qui enregistre efface ce
   * que l'autre a fait entre-temps — une pièce saisie qui disparaît sans que personne le voie.
   *
   * On retient donc, pour chaque registre ouvert, le texte exact d'où il vient. À l'enregistrement,
   * le processus principal vérifie que le fichier n'a pas changé ; s'il a changé, il le rend au
   * lieu d'écrire, et on FUSIONNE : ce que ce poste a fait, plus ce que l'autre a fait.
   */

  const cleDe = (x, norm) => (x == null ? null : JSON.stringify(norm(x)));

  /**
   * Fusion à trois voies de deux versions d'un même registre.
   *   base   : le registre tel que ce poste l'avait lu (null : il n'existait pas encore) ;
   *   mien   : ce que ce poste veut enregistrer ;
   *   disque : ce qu'un autre poste a enregistré entre-temps.
   *
   * Une pièce que seul un côté a touchée prend la version de ce côté — ajout, modification ou
   * suppression. Touchée des deux côtés de la même façon : rien à trancher. Touchée des deux
   * côtés différemment : c'est un conflit, et la version modifiée le plus récemment l'emporte ; une
   * pièce modifiée d'un côté et supprimée de l'autre est gardée — une suppression perdue se refait
   * d'un clic, une saisie perdue ne se retrouve pas.
   *
   * Rend { reg, reprises, conflits, doublons } : `reprises` compte ce qui vient de l'autre poste,
   * `doublons` les numéros de pièce que les deux postes ont attribués chacun de leur côté.
   */
  function fusionner(base, mien, disque) {
    const b = base || { pieces: [], comptages: [] };
    const conflits = [];
    let reprises = 0;

    const fusionListe = (liste, norm, quoi) => {
      const index = (arr) => new Map((arr || []).map((x) => [x.id, x]));
      const B = index(b[liste]); const M = index(mien[liste]); const D = index(disque[liste]);
      const ids = [];
      for (const src of [mien[liste] || [], disque[liste] || []]) for (const x of src) if (!ids.includes(x.id)) ids.push(x.id);
      const out = [];
      for (const id of ids) {
        const kb = cleDe(B.get(id), norm); const km = cleDe(M.get(id), norm); const kd = cleDe(D.get(id), norm);
        const m = M.get(id); const d = D.get(id);
        let pris;
        if (km === kb) { pris = d; if (kd !== km) reprises += 1; }           // seul l'autre poste y a touché
        else if (kd === kb || kd === km) pris = m;                            // seul ce poste, ou la même chose
        else if (m && d) {                                                    // les deux, différemment
          const plusRecent = String(d.updatedAt || d.createdAt || '') > String(m.updatedAt || m.createdAt || '');
          pris = plusRecent ? d : m;
          if (plusRecent) reprises += 1;
          conflits.push({ quoi, id, no: (pris && pris.no) != null ? pris.no : null, garde: plusRecent ? 'autre poste' : 'ce poste' });
        } else {                                                              // modifiée d'un côté, supprimée de l'autre
          pris = m || d;
          if (!m) reprises += 1;
          conflits.push({ quoi, id, no: (pris && pris.no) != null ? pris.no : null, garde: 'gardée', supprimeeAilleurs: true });
        }
        if (pris) out.push(pris);
      }
      return out;
    };

    const reg = emptyRegister(mien.annee);
    reg.version = mien.version || reg.version;
    // Solde à nouveau, compte caisse, visas : même règle, sans identifiant à suivre.
    for (const champ of ['caisse', 'opening', 'visas']) {
      const kb = JSON.stringify(b[champ]); const km = JSON.stringify(mien[champ]); const kd = JSON.stringify(disque[champ]);
      if (km === kb && disque[champ] !== undefined) {
        reg[champ] = disque[champ];
        if (kd !== km) reprises += 1;
      } else {
        reg[champ] = mien[champ];
        if (kd !== kb && kd !== km) conflits.push({ quoi: champ, garde: 'ce poste' });
      }
    }
    reg.pieces = fusionListe('pieces', normalizePiece, 'pièce');
    reg.comptages = fusionListe('comptages', normalizeCount, 'comptage');
    sortPieces(reg);
    sortCounts(reg);

    // Les deux postes ont pris « le numéro suivant » chacun de leur côté : deux pièces n° 13.
    // Rien n'est perdu, mais il faut le dire — c'est le numéro qui relie la ligne au papier.
    const ajoutees = (cote) => (cote.pieces || []).filter((p) => !(b.pieces || []).some((x) => x.id === p.id));
    const nosMiens = new Set(ajoutees(mien).map((p) => p.no).filter((n) => n != null));
    const doublons = Array.from(new Set(ajoutees(disque).map((p) => p.no).filter((n) => nosMiens.has(n)))).sort((x, y) => x - y);

    reg.updatedAt = new Date().toISOString();
    return { reg, reprises, conflits, doublons };
  }

  // Le texte d'où vient chaque registre ouvert. Clé : l'objet registre lui-même — la saisie et la
  // boîte de réception en tiennent chacune un exemplaire, et chacun doit être comparé à SON point
  // de départ, pas au dernier qu'on a lu pour la même année.
  //
  // Un registre qui n'a jamais été lu sur le disque est une année que ce poste crée : on s'attend
  // à ne rien trouver. Si l'autre poste l'a créée entre-temps, on fusionne au lieu d'écraser.
  const origines = new WeakMap();
  const noterOrigine = (reg, texte) => { if (reg) origines.set(reg, texte == null ? null : String(texte)); };

  /** Adaptateur fichiers (application fenêtrée) : window.CaisseFiles fourni par le preload. */
  function fileStorage(F) {
    const charger = async (year) => {
      const t = await F.load(year);
      const lu = readStored(t);
      noterOrigine(lu.reg, t);
      return lu;
    };
    return {
      kind: 'fichiers',
      location: () => F.dir(),
      years: () => F.years(),
      load: async (year) => (await charger(year)).reg,
      loadStored: charger,
      /**
       * Enregistre le registre. `opts.remplacer` : c'est un remplacement voulu (restauration d'une
       * sauvegarde), on écrit sans fusionner. Rend { fusion } — null si personne d'autre n'avait
       * écrit ; sinon ce qui a été repris de l'autre poste. Le registre passé est mis à jour sur
       * place : l'écran montre aussitôt le travail de l'autre poste.
       */
      save: async (reg, opts) => {
        opts = opts || {};
        const annee = reg.annee;
        // undefined : écrire sans rien vérifier (remplacement voulu) ; null : l'année ne doit pas exister
        let attendu;
        if (!opts.remplacer) attendu = origines.has(reg) ? origines.get(reg) : null;
        let bilan = null;
        for (let essai = 0; essai < 4; essai++) {
          const texte = serialize(reg);
          const r = await F.save(annee, texte, attendu);
          if (!r || r === true || !r.conflit) {
            noterOrigine(reg, texte);
            return { fusion: bilan };
          }
          const disque = parse(r.disque);
          if (!disque) throw new Error("le registre enregistré par l'autre poste est illisible : rien n'a été écrit par-dessus");
          const f = fusionner(attendu == null ? null : parse(attendu), reg, disque);
          for (const k of Object.keys(f.reg)) reg[k] = f.reg[k];
          bilan = {
            reprises: (bilan ? bilan.reprises : 0) + f.reprises,
            conflits: (bilan ? bilan.conflits : []).concat(f.conflits),
            doublons: Array.from(new Set((bilan ? bilan.doublons : []).concat(f.doublons))),
          };
          attendu = r.disque;
        }
        throw new Error("le registre est modifié sans arrêt sur un autre poste : rien n'a été écrit, réessayez dans un instant");
      },
      attach: (year, pieceId, name, bytes) => F.attach(year, pieceId, name, bytes),
      read: (year, pieceId, name) => F.read(year, pieceId, name),
      remove: (year, pieceId, name) => F.remove(year, pieceId, name),
    };
  }

  /** Adaptateur navigateur : registres dans localStorage, justificatifs dans IndexedDB. */
  function browserStorage() {
    const KEY = (y) => `caisse.registre.${y}`;
    let dbp = null;
    function db() {
      if (dbp) return dbp;
      dbp = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB indisponible')); return; }
        const req = indexedDB.open('caisse-justificatifs', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('files');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      return dbp;
    }
    const tx = (mode, fn) => db().then((d) => new Promise((resolve, reject) => {
      const t = d.transaction('files', mode);
      const r = fn(t.objectStore('files'));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    }));
    const k = (y, id, n) => `${y}/${id}/${n}`;
    return {
      kind: 'navigateur',
      location: async () => 'mémoire du navigateur (pensez à exporter une sauvegarde)',
      years: async () => {
        const out = [];
        for (let i = 0; i < localStorage.length; i++) { const m = /^caisse\.registre\.(\d{4})$/.exec(localStorage.key(i)); if (m) out.push(Number(m[1])); }
        return out.sort();
      },
      load: async (year) => readStored(localStorage.getItem(KEY(year))).reg,
      loadStored: async (year) => readStored(localStorage.getItem(KEY(year))),
      save: async (reg) => { localStorage.setItem(KEY(reg.annee), serialize(reg)); },
      attach: async (year, pieceId, name, bytes) => { await tx('readwrite', (s) => s.put(bytes, k(year, pieceId, name))); return { name, size: bytes.length }; },
      read: async (year, pieceId, name) => { const v = await tx('readonly', (s) => s.get(k(year, pieceId, name))); return v ? new Uint8Array(v) : null; },
      remove: async (year, pieceId, name) => { await tx('readwrite', (s) => s.delete(k(year, pieceId, name))); },
    };
  }

  function storage() {
    if (typeof window !== 'undefined' && window.CaisseFiles) return fileStorage(window.CaisseFiles);
    if (typeof localStorage !== 'undefined') return browserStorage();
    return null;
  }

  return {
    VERSION,
    TYPES,
    ACCOUNT_RE,
    today,
    isRealDate,
    newId,
    emptyRegister,
    normalizeRegister,
    normalizePiece,
    kindOf,
    nextNo,
    newPiece,
    composeDescription,
    composeLibelle,
    periodOf,
    pieceFromDecompte,
    sensFor,
    accountSuggestions,
    validate,
    validateChamps,
    upsertPiece,
    removePiece,
    syncScanBatch,
    removeScanBatch,
    pendingPieces,
    markVerified,
    entriesOf,
    journal,
    BILLETS,
    PIECES,
    DENOMS,
    countTotal,
    normalizeCount,
    upsertCount,
    removeCount,
    previousCount,
    balanceAt,
    parseAmountInput,
    searchRows, numberChecks, explainGap,
    accountChoices,
    compteImpose,
    periodMovements,
    piecesFromEntries, mergeEntries,
    serialize,
    parse,
    readStored,
    fusionner,
    storage,
    fileStorage,
    browserStorage,
  };
});
