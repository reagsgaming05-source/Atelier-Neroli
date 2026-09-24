/*
 * Carnet des données : les listes tenues à la main, qui restent sur ce PC.
 *
 * L'application connaît déjà des comptes, des classes, des noms, des objets et des types : ils
 * viennent de la base de référence intégrée et de ce qui a été lu dans les classeurs. Mais une
 * classe nouvelle, un compte qui vient d'être ouvert, un nom qui arrive, n'y sont pas — et il n'y
 * avait aucun moyen de les y mettre autrement qu'en les tapant chaque fois.
 *
 * Le carnet porte deux choses, et seulement deux : ce qu'on a ajouté, ce qu'on a retiré.
 *   ajouts  : ce qui n'existait nulle part et qu'on veut voir dans les listes ;
 *   retires : ce que les listes proposaient et qu'on ne veut plus voir.
 *
 * Retirer ne touche à aucune écriture : une pièce déjà enregistrée garde son compte, son libellé
 * et son montant. Seules les listes proposées changent. Et « retiré » l'emporte durablement : les
 * pièces scannées enrichissent le vocabulaire toutes seules, et sans cela un compte retiré serait
 * revenu à la première relecture.
 *
 * Module sans dépendance, pour être éprouvé en dehors du navigateur.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CaisseCarnet = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const GENRES = ['comptes', 'classes', 'personnes', 'objets', 'types'];
  /** Au singulier, tel qu'on en parle à l'écran. */
  const NOM = {
    comptes: 'compte',
    classes: 'classe',
    personnes: 'personne',
    objets: 'objet',
    types: "type d'écriture",
  };
  /** Avec son article, pour les phrases de l'écran des données. */
  const ARTICLE = {
    comptes: 'un compte',
    classes: 'une classe',
    personnes: 'une personne',
    objets: 'un objet',
    types: "un type d'écriture",
  };
  const MAX = 80; // longueur d'une valeur
  const MAX_NOTE = 120;
  const MAX_LISTE = 2000; // garde-fou d'un fichier abîmé ou bricolé
  const CLE_LOCALE = 'caisse.donnees';
  const COMPTE_RE = /^\d{4,5}\.\d{3,4}(?:\.\d{2})?$/;
  // Une classe porte un degré : un chiffre suivi de P, S, VG ou VP (« 5P/3 », « 9S », « 10VG/2 »).
  const DEGRE_RE = /\d(?:VP|VG|P|S)/i;

  const sansAccent = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '');
  /** Deux écritures d'une même valeur (« a. berger » et « A. Berger ») ne font qu'une entrée. */
  const cle = (genre, valeur) => sansAccent(valeur).toLowerCase().replace(/\s+/g, ' ').trim();

  function vide() {
    const c = { version: 1, ajouts: {}, retires: {} };
    for (const g of GENRES) { c.ajouts[g] = []; c.retires[g] = []; }
    return c;
  }

  /** Copie de travail : chaque modification rend un carnet neuf, jamais l'ancien modifié. */
  function copie(carnet) {
    const src = carnet && carnet.ajouts ? carnet : vide();
    const c = { version: 1, ajouts: {}, retires: {} };
    for (const g of GENRES) {
      c.ajouts[g] = (src.ajouts[g] || []).map((x) => Object.assign({}, x));
      c.retires[g] = (src.retires[g] || []).slice();
    }
    return c;
  }

  /**
   * Lit un carnet enregistré. Un fichier abîmé, bricolé à la main ou venu d'ailleurs ne doit pas
   * faire tomber l'application : ce qui n'est pas reconnu est laissé de côté, le reste est gardé.
   * Seules les clés attendues sont lues, donc rien de ce que contient le fichier n'atteint les
   * objets de l'application.
   */
  function parse(texte) {
    const c = vide();
    let brut = null;
    try { brut = typeof texte === 'string' ? JSON.parse(texte) : texte; } catch (e) { return c; }
    if (!brut || typeof brut !== 'object') return c;
    const ajouts = brut.ajouts && typeof brut.ajouts === 'object' ? brut.ajouts : {};
    const retires = brut.retires && typeof brut.retires === 'object' ? brut.retires : {};
    for (const g of GENRES) {
      const va = Array.isArray(ajouts[g]) ? ajouts[g] : [];
      for (const x of va.slice(0, MAX_LISTE)) {
        const valeur = normaliser(g, x && typeof x === 'object' ? x.valeur : x);
        if (!valeur || valeur.length > MAX) continue;
        const item = { valeur };
        if (x && typeof x === 'object') {
          const note = String(x.note == null ? '' : x.note).replace(/\s+/g, ' ').trim();
          if (note) item.note = note.slice(0, MAX_NOTE);
          if (x.sens === 'debit' || x.sens === 'credit') item.sens = x.sens;
        }
        if (!c.ajouts[g].some((y) => cle(g, y.valeur) === cle(g, valeur))) c.ajouts[g].push(item);
      }
      const vr = Array.isArray(retires[g]) ? retires[g] : [];
      for (const x of vr.slice(0, MAX_LISTE)) {
        const valeur = normaliser(g, x);
        if (!valeur || valeur.length > MAX) continue;
        if (!c.retires[g].some((y) => cle(g, y) === cle(g, valeur))) c.retires[g].push(valeur);
      }
      // une valeur ne peut pas être à la fois ajoutée et retirée
      c.retires[g] = c.retires[g].filter((v) => !c.ajouts[g].some((a) => cle(g, a.valeur) === cle(g, v)));
    }
    return c;
  }

  function serialize(carnet) {
    return JSON.stringify(copie(carnet), null, 2);
  }

  /** La forme sous laquelle la valeur sera écrite partout : « 5p/3 » et « 5P / 3 » font « 5P/3 ». */
  function normaliser(genre, valeur) {
    let v = String(valeur == null ? '' : valeur).replace(/\s+/g, ' ').trim();
    if (!v) return '';
    if (genre === 'comptes') v = v.replace(/\s+/g, '');
    else if (genre === 'classes') v = v.replace(/\s*\/\s*/g, '/').toUpperCase();
    else if (genre === 'types') v = v.toUpperCase();
    else if (genre === 'objets') v = v.charAt(0).toUpperCase() + v.slice(1);
    return v;
  }

  /**
   * Ce qu'on s'apprête à ajouter tient-il debout ? Rend { ok, valeur, message, avertissement }.
   * Un avertissement n'empêche pas d'ajouter : la forme habituelle d'un compte est celle de la
   * commune, mais l'application n'a pas à décider qu'un numéro inconnu est faux.
   */
  function verifier(genre, valeur) {
    if (GENRES.indexOf(genre) < 0) return { ok: false, message: 'Genre de donnée inconnu.' };
    const v = normaliser(genre, valeur);
    if (!v) return { ok: false, message: `Tapez ${ARTICLE[genre]} avant d'ajouter.` };
    if (v.length > MAX) return { ok: false, message: `C'est trop long : ${MAX} caractères au plus.` };
    if (genre === 'comptes') {
      if (!/\d/.test(v)) return { ok: false, message: 'Un numéro de compte, ce sont des chiffres : « 51000.3662.00 ».' };
      if (!COMPTE_RE.test(v)) return { ok: true, valeur: v, avertissement: "Ce numéro n'a pas la forme habituelle (51000.3662.00) : il est gardé tel quel." };
    }
    if (genre === 'classes' && !/\d/.test(v)) {
      return { ok: true, valeur: v, avertissement: "Une classe porte d'ordinaire un degré : « 5P/3 », « 9S »." };
    }
    if (genre === 'personnes' && !/[A-Za-zÀ-ÿ]/.test(v)) {
      return { ok: false, message: 'Un nom, ce sont des lettres : « A. Berger ».' };
    }
    return { ok: true, valeur: v };
  }

  /**
   * Une valeur apprise a-t-elle sa place dans une liste ? Pour une classe, il lui faut un degré.
   * L'apprentissage des libellés range parmi les classes tout sigle en capitales (« USB »,
   * « PRIX », « SLAM ») — pour ne pas les « corriger » comme des mots —, et ils se retrouvaient
   * proposés dans le champ Classe. Ce qu'on a ajouté soi-même, en revanche, est toujours gardé.
   */
  function vraisemblable(genre, valeur) {
    if (genre !== 'classes') return true;
    return DEGRE_RE.test(normaliser(genre, valeur));
  }

  const ajoutsDe = (carnet, genre) => ((carnet && carnet.ajouts && carnet.ajouts[genre]) || []);
  /** Les valeurs retirées des listes, dans l'ordre où on les a retirées. */
  const retiresDe = (carnet, genre) => ((carnet && carnet.retires && carnet.retires[genre]) || []);

  /**
   * Ajoute une valeur. `extra` : { note } pour un compte (à quoi il sert),
   * { sens: 'debit' | 'credit' } pour un type d'écriture.
   */
  function ajouter(carnet, genre, valeur, extra) {
    const v = verifier(genre, valeur);
    if (!v.ok) return { carnet: carnet || vide(), ok: false, message: v.message };
    const c = copie(carnet);
    const k = cle(genre, v.valeur);
    c.retires[genre] = c.retires[genre].filter((x) => cle(genre, x) !== k);
    const item = { valeur: v.valeur };
    if (extra && extra.note != null) {
      const note = String(extra.note).replace(/\s+/g, ' ').trim();
      if (note) item.note = note.slice(0, MAX_NOTE);
    }
    if (extra && (extra.sens === 'debit' || extra.sens === 'credit')) item.sens = extra.sens;
    const i = c.ajouts[genre].findIndex((x) => cle(genre, x.valeur) === k);
    if (i >= 0) c.ajouts[genre][i] = item; else c.ajouts[genre].push(item);
    return { carnet: c, ok: true, valeur: v.valeur, avertissement: v.avertissement, deja: i >= 0 };
  }

  /**
   * Retire une valeur des listes. Qu'elle vienne de la base intégrée, d'un classeur relu ou de
   * nos propres ajouts ne change rien : elle est inscrite parmi les retirées, et elle le reste.
   */
  function retirer(carnet, genre, valeur) {
    if (GENRES.indexOf(genre) < 0) return { carnet: carnet || vide(), ok: false, message: 'Genre de donnée inconnu.' };
    const v = normaliser(genre, valeur);
    if (!v) return { carnet: carnet || vide(), ok: false, message: 'Rien à retirer.' };
    const c = copie(carnet);
    const k = cle(genre, v);
    c.ajouts[genre] = c.ajouts[genre].filter((x) => cle(genre, x.valeur) !== k);
    if (!c.retires[genre].some((x) => cle(genre, x) === k)) c.retires[genre].push(v);
    return { carnet: c, ok: true, valeur: v };
  }

  /** Remet dans les listes une valeur retirée, sans en faire un ajout à nous. */
  function remettre(carnet, genre, valeur) {
    if (GENRES.indexOf(genre) < 0) return { carnet: carnet || vide(), ok: false, message: 'Genre de donnée inconnu.' };
    const c = copie(carnet);
    const k = cle(genre, normaliser(genre, valeur));
    const avant = c.retires[genre].length;
    c.retires[genre] = c.retires[genre].filter((x) => cle(genre, x) !== k);
    return { carnet: c, ok: c.retires[genre].length !== avant };
  }

  /** Rend une fonction vrai/faux : cette valeur a-t-elle sa place dans les listes ? */
  function garde(carnet, genre) {
    const hors = new Set(retiresDe(carnet, genre).map((x) => cle(genre, x)));
    if (!hors.size) return () => true;
    return (valeur) => !hors.has(cle(genre, valeur));
  }

  const TRI = {
    comptes: (a, b) => String(a).localeCompare(String(b)),
    classes: (a, b) => String(a).localeCompare(String(b), 'fr', { numeric: true }),
    personnes: (a, b) => String(a).localeCompare(String(b), 'fr'),
  };

  /**
   * La liste telle qu'elle doit être proposée : la base, moins les retirées, plus les nôtres.
   * `opts.trier` : comparateur, ou rien pour garder l'ordre de la base (l'ordre des objets et des
   * types dit quelque chose — « Autre » vient en dernier). De la base, seul ce qui a la forme de
   * son genre est gardé (voir vraisemblable) ; nos ajouts, eux, le sont toujours.
   */
  function fusionner(base, carnet, genre, opts) {
    opts = opts || {};
    const ok = garde(carnet, genre);
    const vus = new Set();
    const out = [];
    const pousser = (x, nous) => {
      const v = String(x == null ? '' : x);
      if (!v) return;
      const k = cle(genre, v);
      if (vus.has(k) || !ok(v)) return;
      if (!nous && !vraisemblable(genre, v)) return;
      vus.add(k);
      out.push(v);
    };
    for (const x of base || []) pousser(x, false);
    for (const a of ajoutsDe(carnet, genre)) pousser(a.valeur, true);
    if (opts.trier) out.sort(opts.trier);
    return out;
  }

  // Le vocabulaire est reconstruit à chaque frappe (libellé, comptes proposés) : sans cette
  // mémoire d'un coup, les mêmes listes se refabriquaient des dizaines de fois par seconde.
  //
  // L'identité de l'objet ne suffit pas à dire qu'il n'a pas changé : le vocabulaire appris
  // grandit par ajout dans les mêmes tableaux (un nom tapé dans la fiche, une pièce relue), sans
  // que l'objet soit remplacé. On retient donc aussi la longueur des trois listes qui nous
  // concernent — elles ne peuvent que s'allonger.
  let cache = { v: null, c: null, taille: '', out: null };
  const taille = (v) => `${(v.accounts || []).length}|${(v.classTokens || []).length}|${(v.persons || []).length}`;

  /**
   * Le vocabulaire de l'application, vu à travers le carnet : comptes, classes et noms ajoutés
   * s'y trouvent, retirés n'y sont plus. Tout le reste passe tel quel. C'est le seul point de
   * passage : listes déroulantes, comptes proposés et correction des lectures en dépendent.
   */
  function appliquer(vocab, carnet) {
    vocab = vocab || {};
    carnet = carnet || actuel();
    const t = taille(vocab);
    if (cache.v === vocab && cache.c === carnet && cache.taille === t && cache.out) return cache.out;
    const out = Object.assign({}, vocab);
    out.accounts = fusionner(vocab.accounts, carnet, 'comptes', { trier: TRI.comptes });
    out.classTokens = fusionner(vocab.classTokens, carnet, 'classes', { trier: TRI.classes });
    out.persons = fusionner(vocab.persons, carnet, 'personnes', { trier: TRI.personnes });
    cache = { v: vocab, c: carnet, taille: t, out };
    return out;
  }

  /** Ce qu'on a noté à côté d'un compte ajouté (« Camp de ski », « Bibliothèque »), ou ''. */
  function noteDe(carnet, genre, valeur) {
    const k = cle(genre, normaliser(genre, valeur));
    const x = ajoutsDe(carnet, genre).find((y) => cle(genre, y.valeur) === k);
    return (x && x.note) || '';
  }

  /**
   * Le sens déclaré d'un type ajouté à la main. Les types intégrés tiennent leur sens de la
   * logique des libellés ; un type nouveau n'a que ce qu'on en a dit.
   */
  function sensDeType(carnet, type) {
    const k = cle('types', normaliser('types', type));
    const x = ajoutsDe(carnet, 'types').find((y) => cle('types', y.valeur) === k);
    return (x && x.sens) || null;
  }

  /** De quoi afficher un compteur : { comptes: { ajoutes, retires }, … , total }. */
  function resume(carnet) {
    const out = { total: 0 };
    for (const g of GENRES) {
      const a = ajoutsDe(carnet, g).length;
      const r = retiresDe(carnet, g).length;
      out[g] = { ajoutes: a, retires: r };
      out.total += a + r;
    }
    return out;
  }

  /* ---------------- Où le carnet est gardé ---------------- */

  /**
   * Dans l'application fenêtrée : un fichier à côté des registres, qui survit aux mises à jour.
   * Dans un navigateur : la mémoire locale de la page. Sans l'un ni l'autre : rien n'est gardé,
   * et l'écran des données le dit plutôt que de faire semblant.
   */
  function depot() {
    const F = typeof window !== 'undefined' ? window.CaisseFiles : null;
    if (F && F.loadCarnet && F.saveCarnet) {
      return {
        kind: 'fichiers',
        ou: () => Promise.resolve(F.dir()).then((d) => `${d} (donnees.json)`),
        charger: async () => parse(await F.loadCarnet()),
        enregistrer: async (c) => { await F.saveCarnet(serialize(c)); },
      };
    }
    if (typeof localStorage !== 'undefined') {
      return {
        kind: 'navigateur',
        ou: async () => 'mémoire du navigateur (faites une copie du carnet de temps en temps)',
        charger: async () => parse(localStorage.getItem(CLE_LOCALE)),
        enregistrer: async (c) => { localStorage.setItem(CLE_LOCALE, serialize(c)); },
      };
    }
    return { kind: 'aucun', ou: async () => 'nulle part : les ajouts seront perdus en fermant', charger: async () => vide(), enregistrer: async () => {} };
  }

  /* ---------------- Le carnet en cours ---------------- */
  // Un seul carnet pour toute l'application : la saisie, les pièces scannées et l'écran des
  // données lisent le même, et une modification se voit partout sans être transmise de main en main.
  let courant = vide();
  const actuel = () => courant;
  const poser = (c) => { courant = c && c.ajouts ? c : vide(); return courant; };

  return {
    GENRES, NOM, ARTICLE, CLE_LOCALE,
    vide, parse, serialize, normaliser, verifier, vraisemblable,
    ajouter, retirer, remettre,
    ajoutsDe, retiresDe, garde, fusionner, appliquer, noteDe, sensDeType, resume,
    depot, actuel, poser,
  };
});
