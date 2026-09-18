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
      opening: { date: opts.openingDate || `${y}-01-01`, amount: P.round2(Number(opts.openingAmount) || 0) },
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
    const reg = emptyRegister(annee, { caisse: raw.caisse, openingDate: raw.opening && raw.opening.date, openingAmount: raw.opening && raw.opening.amount });
    reg.pieces = (Array.isArray(raw.pieces) ? raw.pieces : []).map((p) => normalizePiece(p)).filter(Boolean);
    sortPieces(reg);
    reg.comptages = (Array.isArray(raw.comptages) ? raw.comptages : []).map((c) => normalizeCount(c)).filter(Boolean);
    sortCounts(reg);
    reg.updatedAt = raw.updatedAt || reg.updatedAt;
    return reg;
  }

  function normalizePiece(p) {
    if (!p || typeof p !== 'object') return null;
    const montant = P.round2(Number(p.montant) || 0);
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
   * Renvoie null si le texte n'est pas un montant (au lieu de 0, qui passait pour une saisie).
   */
  function parseAmountInput(text) {
    const t = String(text == null ? '' : text)
      .replace(/chf|frs?\.?/ig, '')
      .replace(/[\s\u00A0’'´`]/g, '')
      .replace(',', '.')
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

  /** Montants d'un comptage { '100': 3, '0.5': 2, … } -> { billets, pieces, total }. */
  function countTotal(counts) {
    counts = counts || {};
    let billets = 0; let pieces = 0;
    for (const d of BILLETS) billets += d * (Math.max(0, Math.floor(Number(counts[denomKey(d)]))) || 0);
    for (const d of PIECES) pieces += d * (Math.max(0, Math.floor(Number(counts[denomKey(d)]))) || 0);
    billets = P.round2(billets); pieces = P.round2(pieces);
    return { billets, pieces, total: P.round2(billets + pieces) };
  }

  function normalizeCount(c) {
    if (!c || typeof c !== 'object') return null;
    const counts = {};
    for (const d of DENOMS) {
      const n = Math.max(0, Math.floor(Number((c.counts || {})[denomKey(d)]) || 0));
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

  /** Erreurs bloquantes d'une pièce (liste vide = pièce valable). */
  function validate(p, reg) {
    const errs = [];
    if (p.no == null || !Number.isInteger(p.no) || p.no <= 0) errs.push('Numéro de pièce manquant ou invalide');
    else if (reg && reg.pieces.some((x) => x.id !== p.id && x.no === p.no)) errs.push(`Le n° ${p.no} existe déjà dans le registre`);
    if (!isRealDate(p.date)) errs.push('Date manquante ou invalide');
    else if (reg && String(p.date).slice(0, 4) !== String(reg.annee)) errs.push(`La date n'est pas dans l'année ${reg.annee}`);
    if (!p.type) errs.push("Type d'écriture manquant");
    if (!(p.montant > 0)) errs.push('Montant manquant (doit être positif)');
    if (!p.compte || !ACCOUNT_RE.test(p.compte)) errs.push('N° de compte manquant ou mal formé (ex. 51000.3662.00)');
    else if (reg && p.compte === reg.caisse) errs.push('Le compte de contrepartie ne peut pas être le compte caisse');
    if (!p.sens) errs.push("Sens de l'écriture à choisir (entrée ou sortie de caisse)");
    if (!(p.libelle || composeLibelle(p)).trim()) errs.push('Libellé vide');
    if (!p.personne) errs.push('Personne manquante (« A. Nom »)');
    return errs;
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

  /** Adaptateur fichiers (application fenêtrée) : window.CaisseFiles fourni par le preload. */
  function fileStorage(F) {
    return {
      kind: 'fichiers',
      location: () => F.dir(),
      years: () => F.years(),
      load: async (year) => { const t = await F.load(year); return readStored(t).reg; },
      loadStored: async (year) => readStored(await F.load(year)),
      save: (reg) => F.save(reg.annee, serialize(reg)),
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
    piecesFromEntries, mergeEntries,
    serialize,
    parse,
    readStored,
    storage,
    fileStorage,
    browserStorage,
  };
});
