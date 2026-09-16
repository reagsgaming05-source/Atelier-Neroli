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
    reg.updatedAt = raw.updatedAt || reg.updatedAt;
    return reg;
  }

  function normalizePiece(p) {
    if (!p || typeof p !== 'object') return null;
    const montant = P.round2(Number(p.montant) || 0);
    return {
      id: String(p.id || newId()),
      no: p.no == null || p.no === '' ? null : Number(p.no),
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
      source: p.source === 'scan' || p.source === 'dgeo' ? p.source : 'saisie',
      ref: p.ref ? String(p.ref) : '',
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
  function newPiece(reg) {
    return normalizePiece({ id: newId(), no: nextNo(reg), date: today(), type: 'REMBOURSEMENT', objet: 'Autre', sens: 'credit' });
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
    if (!p.date || !/^\d{4}-\d{2}-\d{2}$/.test(p.date) || isNaN(new Date(p.date).getTime())) errs.push('Date manquante ou invalide');
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

  /** Pièces créées depuis des écritures lues sur des PDF scannés. */
  function piecesFromEntries(entries) {
    return (entries || []).map((e) => {
      const parts = String(e.libelle || '').split(' - ');
      const type = P.typeFromLibelle(e.libelle) || '';
      const personne = parts.length >= 2 && P.looksLikePerson(parts[parts.length - 1]) ? parts[parts.length - 1] : '';
      const desc = parts.slice(1, personne ? -1 : undefined).join(' - ');
      return normalizePiece({
        no: e.no, date: e.date, type, objet: P.objetOf(desc), detail: desc, personne, libelle: e.libelle, compte: e.compte,
        montant: e.debit != null ? e.debit : e.credit, sens: e.debit != null ? 'debit' : 'credit', source: 'scan',
      });
    });
  }

  function serialize(reg) {
    return JSON.stringify(reg, null, 1);
  }

  function parse(text) {
    try { return normalizeRegister(JSON.parse(text)); } catch (e) { return null; }
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
      load: async (year) => { const t = await F.load(year); return t ? parse(t) : null; },
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
      load: async (year) => { const t = localStorage.getItem(KEY(year)); return t ? parse(t) : null; },
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
    entriesOf,
    journal,
    piecesFromEntries,
    serialize,
    parse,
    storage,
    fileStorage,
    browserStorage,
  };
});
