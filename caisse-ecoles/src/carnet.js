/*
 * Carnet des données : les listes tenues à la main, qui restent sur ce PC.
 *
 * L'application connaît déjà des comptes, des classes, des noms, des objets et des types : ils
 * viennent de la base de référence intégrée et de ce qui a été lu dans les classeurs. Mais une
 * classe nouvelle, un compte qui vient d'être ouvert, un nom qui arrive, n'y sont pas — et il n'y
 * avait aucun moyen de les y mettre autrement qu'en les tapant chaque fois.
 *
 * Le carnet porte trois choses : ce qu'on a ajouté, ce qu'on a retiré, et ce qu'on a dit d'une valeur.
 *   ajouts     : ce qui n'existait nulle part et qu'on veut voir dans les listes ;
 *   retires    : ce que les listes proposaient et qu'on ne veut plus voir ;
 *   precisions : à quoi sert un compte, dans quel sens va un type — quelle que soit l'origine de
 *                la valeur. Un compte intégré se décrit comme un compte ajouté, et ce qu'on en a
 *                dit survit à un retrait : « remettre » le rend tel qu'il était.
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
  // La forme que l'analyseur reconnaît dans un libellé (CLASS_TOKEN_RE de parser.js, recopiée :
  // ce module n'a pas de dépendance).
  const CLASSE_RE = /^\d{1,2}(?:-\d{1,2})?(?:VP|VG|P|S)(?:\/\d{1,2})?$/;
  // « A. Berger », « Ch. Dupraz », « T.-L. Morel » : initiale(s) avec point, puis le nom
  // (une particule est permise : « A. de Berger »)
  const PERSONNE_RE = /^(?:[A-ZÀ-Ý][a-zà-ÿ]{0,2}\.\s*-?\s*)+(?:[a-zà-ÿ]+(?:\s+|['’]))?[A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]+(?:\s+[A-Za-zÀ-ÿ'’-]+)*$/;

  const sansAccent = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '');
  /** Deux écritures d'une même valeur (« a. berger » et « A. Berger ») ne font qu'une entrée. */
  const cle = (genre, valeur) => sansAccent(valeur).toLowerCase().replace(/\s+/g, ' ').trim();

  function vide() {
    const c = { version: 1, ajouts: {}, retires: {}, precisions: {} };
    for (const g of GENRES) { c.ajouts[g] = []; c.retires[g] = []; c.precisions[g] = []; }
    return c;
  }

  /** Copie de travail : chaque modification rend un carnet neuf, jamais l'ancien modifié. */
  function copie(carnet) {
    const src = carnet && carnet.ajouts ? carnet : vide();
    const c = { version: 1, ajouts: {}, retires: {}, precisions: {} };
    for (const g of GENRES) {
      c.ajouts[g] = (src.ajouts[g] || []).map((x) => Object.assign({}, x));
      c.retires[g] = ((src.retires && src.retires[g]) || []).slice();
      c.precisions[g] = ((src.precisions && src.precisions[g]) || []).map((x) => Object.assign({}, x));
    }
    return c;
  }

  const propreNote = (t) => String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE);
  const propreSens = (s) => (s === 'debit' || s === 'credit' ? s : null);

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
    const precisions = brut.precisions && typeof brut.precisions === 'object' ? brut.precisions : {};
    for (const g of GENRES) {
      const vp = Array.isArray(precisions[g]) ? precisions[g] : [];
      for (const x of vp.slice(0, MAX_LISTE)) {
        if (!x || typeof x !== 'object') continue;
        const valeur = normaliser(g, x.valeur);
        if (!valeur || valeur.length > MAX) continue;
        const item = { valeur };
        const note = propreNote(x.note);
        if (note) item.note = note;
        if (propreSens(x.sens)) item.sens = x.sens;
        if ((item.note || item.sens) && !c.precisions[g].some((y) => cle(g, y.valeur) === cle(g, valeur))) c.precisions[g].push(item);
      }
      const va = Array.isArray(ajouts[g]) ? ajouts[g] : [];
      for (const x of va.slice(0, MAX_LISTE)) {
        const valeur = normaliser(g, x && typeof x === 'object' ? x.valeur : x);
        if (!valeur || valeur.length > MAX) continue;
        if (c.ajouts[g].some((y) => cle(g, y.valeur) === cle(g, valeur))) continue;
        c.ajouts[g].push({ valeur });
        // Un carnet d'avant les précisions gardait la note et le sens dans l'ajout lui-même
        if (x && typeof x === 'object' && !c.precisions[g].some((y) => cle(g, y.valeur) === cle(g, valeur))) {
          const item = { valeur };
          const note = propreNote(x.note);
          if (note) item.note = note;
          if (propreSens(x.sens)) item.sens = x.sens;
          if (item.note || item.sens) c.precisions[g].push(item);
        }
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
    if (genre === 'classes') {
      if (!DEGRE_RE.test(v)) return { ok: true, valeur: v, avertissement: "Une classe porte d'ordinaire un degré : « 5P/3 », « 9S », « 10VG/1 »." };
      if (!CLASSE_RE.test(v)) return { ok: true, valeur: v, avertissement: "Ce n'est pas la forme habituelle d'une classe (« 7P/2 », « 9S », « 10VG/1 ») : elle est gardée telle quelle." };
    }
    if (genre === 'personnes') {
      if (!/[A-Za-zÀ-ÿ]/.test(v)) return { ok: false, message: 'Un nom, ce sont des lettres : « A. Berger ».' };
      // les visas du relevé et les libellés impriment le nom tel quel : deux formes pour une même
      // personne s'y verraient côte à côte
      if (!PERSONNE_RE.test(v)) return { ok: true, valeur: v, avertissement: "D'ordinaire, un nom s'écrit initiale, point, nom de famille : « L. Duvernay ». C'est ainsi qu'il sera imprimé sur les pièces et les visas." };
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
  const precisionsDe = (carnet, genre) => ((carnet && carnet.precisions && carnet.precisions[genre]) || []);
  const estAjout = (carnet, genre, valeur) => {
    const k = cle(genre, normaliser(genre, valeur));
    return ajoutsDe(carnet, genre).some((x) => cle(genre, x.valeur) === k);
  };

  /**
   * Pose ce qu'on dit d'une valeur dans une copie `c` : `quoi.note` (à quoi sert un compte),
   * `quoi.sens` (un type d'écriture). Un champ absent n'est pas touché ; une chaîne vide efface.
   */
  function poserPrecision(c, genre, valeur, quoi) {
    const k = cle(genre, valeur);
    const i = c.precisions[genre].findIndex((x) => cle(genre, x.valeur) === k);
    const item = i >= 0 ? Object.assign({}, c.precisions[genre][i]) : { valeur };
    if (quoi.note !== undefined) { const n = propreNote(quoi.note); if (n) item.note = n; else delete item.note; }
    if (quoi.sens !== undefined) { if (propreSens(quoi.sens)) item.sens = quoi.sens; else delete item.sens; }
    const garder = !!(item.note || item.sens);
    if (i >= 0) { if (garder) c.precisions[genre][i] = item; else c.precisions[genre].splice(i, 1); } else if (garder) c.precisions[genre].push(item);
  }

  /**
   * Ajoute une valeur. `extra` : { note } pour un compte (à quoi il sert),
   * { sens: 'debit' | 'credit' } pour un type d'écriture.
   *
   * Une note laissée vide n'efface pas celle qu'on avait déjà écrite : retaper un numéro pour
   * vérifier qu'il est là ne doit rien faire perdre. Et quand la logique des libellés fixe déjà le
   * sens du type (`extra.sensFixe`, « SUBVENTION » fait toujours entrer de l'argent), le sens
   * choisi n'est pas gardé : c'est la règle qui s'appliquera, et l'écran ne doit pas dire autre chose.
   */
  function ajouter(carnet, genre, valeur, extra) {
    const v = verifier(genre, valeur);
    if (!v.ok) return { carnet: carnet || vide(), ok: false, message: v.message };
    extra = extra || {};
    const c = copie(carnet);
    const k = cle(genre, v.valeur);
    c.retires[genre] = c.retires[genre].filter((x) => cle(genre, x) !== k);
    const i = c.ajouts[genre].findIndex((x) => cle(genre, x.valeur) === k);
    if (i < 0) c.ajouts[genre].push({ valeur: v.valeur });
    const quoi = {};
    if (propreNote(extra.note)) quoi.note = extra.note;
    const fixe = propreSens(extra.sensFixe);
    if (fixe) quoi.sens = null; // rien de déclaré : la règle des libellés fait foi
    else if (propreSens(extra.sens)) quoi.sens = extra.sens;
    poserPrecision(c, genre, v.valeur, quoi);
    return {
      carnet: c, ok: true, valeur: v.valeur, avertissement: v.avertissement, deja: i >= 0,
      sensFixe: fixe, sensIgnore: !!(fixe && propreSens(extra.sens) && extra.sens !== fixe),
    };
  }

  /**
   * Dit à quoi sert une valeur (la note d'un compte), ou dans quel sens va un type, qu'elle soit
   * ajoutée, intégrée ou apprise : on garde le numéro, on change ce qui s'affiche à côté.
   * `quoi` : { note } et/ou { sens } ; une note vide efface la note.
   */
  function preciser(carnet, genre, valeur, quoi) {
    if (GENRES.indexOf(genre) < 0) return { carnet: carnet || vide(), ok: false, message: 'Genre de donnée inconnu.' };
    const v = normaliser(genre, valeur);
    if (!v) return { carnet: carnet || vide(), ok: false, message: `Tapez ${ARTICLE[genre]}.` };
    const avant = { note: noteDe(carnet, genre, v), sens: genre === 'types' ? sensDeType(carnet, v) : null };
    const c = copie(carnet);
    poserPrecision(c, genre, v, quoi || {});
    return { carnet: c, ok: true, valeur: v, avant };
  }

  /**
   * Retire une valeur des listes. `opts.ailleurs` : la valeur est-elle connue en dehors de nos
   * ajouts (base intégrée, classeur relu, pièces de l'année) ?
   *   - un ajout connu nulle part ailleurs est simplement supprimé : il n'a rien à « remettre »,
   *     et une faute de frappe ne doit pas rester affichée parmi les valeurs retirées ;
   *   - sinon, la valeur est inscrite parmi les retirées, et elle le reste. Ce qu'on en a dit
   *     (note, sens) est gardé, pour que « remettre » la rende telle qu'elle était.
   * Sans `opts`, la valeur est retirée (le plus prudent : elle ne peut pas revenir toute seule).
   */
  function retirer(carnet, genre, valeur, opts) {
    if (GENRES.indexOf(genre) < 0) return { carnet: carnet || vide(), ok: false, message: 'Genre de donnée inconnu.' };
    const v = normaliser(genre, valeur);
    if (!v) return { carnet: carnet || vide(), ok: false, message: 'Rien à retirer.' };
    const c = copie(carnet);
    const k = cle(genre, v);
    const ajout = c.ajouts[genre].some((x) => cle(genre, x.valeur) === k);
    c.ajouts[genre] = c.ajouts[genre].filter((x) => cle(genre, x.valeur) !== k);
    if (ajout && opts && opts.ailleurs === false) {
      c.precisions[genre] = c.precisions[genre].filter((x) => cle(genre, x.valeur) !== k);
      return { carnet: c, ok: true, valeur: v, supprime: true };
    }
    if (!c.retires[genre].some((x) => cle(genre, x) === k)) c.retires[genre].push(v);
    return { carnet: c, ok: true, valeur: v, supprime: false };
  }

  /**
   * Remet dans les listes une valeur retirée. Si elle est connue ailleurs (base, classeur, pièces),
   * il suffit d'effacer la marque « retirée ». Sinon — un ajout retiré avant que le carnet ne sache
   * les supprimer —, effacer la marque la ferait disparaître pour de bon : `opts.ailleurs === false`
   * en refait un ajout, puisque c'est la seule façon de la proposer de nouveau.
   */
  function remettre(carnet, genre, valeur, opts) {
    if (GENRES.indexOf(genre) < 0) return { carnet: carnet || vide(), ok: false, message: 'Genre de donnée inconnu.' };
    const c = copie(carnet);
    const v = normaliser(genre, valeur);
    const k = cle(genre, v);
    const avant = c.retires[genre].length;
    c.retires[genre] = c.retires[genre].filter((x) => cle(genre, x) !== k);
    const ok = c.retires[genre].length !== avant;
    if (ok && opts && opts.ailleurs === false && !c.ajouts[genre].some((x) => cle(genre, x.valeur) === k)) c.ajouts[genre].push({ valeur: v });
    return { carnet: c, ok };
  }

  /* ---------------- Deux écritures d'une même chose ---------------- */

  const mots = (t) => sansAccent(t).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

  /**
   * La forme « à peu près » d'une valeur : deux valeurs de même forme sont sans doute la même,
   * écrite autrement. « 7P2 », « 7P/02 » et « 7P/2 » ; « 51000.3662 » et « 51000.3662.00 » ;
   * « Camps » et « camp ».
   */
  function forme(genre, valeur) {
    const v = cle(genre, normaliser(genre, valeur));
    if (genre === 'classes') return v.replace(/[\s/.]+/g, '').replace(/(^|\D)0+(?=\d)/g, '$1');
    if (genre === 'comptes') {
      const g = v.split(/\D+/).filter(Boolean);
      if (g.length > 1 && /^0+$/.test(g[g.length - 1])) g.pop();
      return g.join('.');
    }
    return mots(v).map((m) => (m.length > 3 ? m.replace(/s$/, '') : m)).join(' ');
  }

  /** Les noms de famille possibles : « A. Berger » → berger ; « Duvernay Laure » → les deux mots. */
  function nomsDeFamille(valeur) {
    const t = String(valeur == null ? '' : valeur).trim();
    const m = /^((?:[A-Za-zÀ-ÿ]{1,3}\.\s*-?\s*)+)(.+)$/.exec(t);
    return mots(m ? m[2] : t).filter((x) => x.length >= 3 && !/^(?:des?|du|von|van|les?|la)$/.test(x));
  }

  /**
   * Parmi `existantes`, celles qui ressemblent à `valeur` sans être la même : même forme, ou pour
   * une personne, même nom de famille (« Duvernay Laure » et « L. Duvernay »). De quoi demander
   * « est-ce la même ? » avant que les listes et les libellés n'aient deux écritures d'une chose.
   */
  function semblables(genre, valeur, existantes) {
    const v = normaliser(genre, valeur);
    if (!v) return [];
    const k = cle(genre, v);
    const out = [];
    if (genre === 'personnes') {
      const noms = new Set(nomsDeFamille(v));
      if (!noms.size) return [];
      for (const x of existantes || []) {
        if (cle(genre, x) === k || out.indexOf(x) >= 0) continue;
        if (nomsDeFamille(x).some((n) => noms.has(n))) out.push(x);
      }
      return out;
    }
    const f = forme(genre, v);
    if (!f) return [];
    for (const x of existantes || []) {
      if (cle(genre, x) === k || out.indexOf(x) >= 0) continue;
      if (forme(genre, x) === f) out.push(x);
    }
    return out;
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

  function precisionDe(carnet, genre, valeur) {
    const k = cle(genre, normaliser(genre, valeur));
    return precisionsDe(carnet, genre).find((y) => cle(genre, y.valeur) === k) || null;
  }

  /** Ce qu'on a noté à côté d'un compte (« Camp de ski », « Bibliothèque »), ajouté ou non, ou ''. */
  function noteDe(carnet, genre, valeur) {
    const x = precisionDe(carnet, genre, valeur);
    return (x && x.note) || '';
  }

  /**
   * Le sens déclaré d'un type ajouté à la main. Les types intégrés tiennent leur sens de la
   * logique des libellés ; un type nouveau n'a que ce qu'on en a dit.
   */
  function sensDeType(carnet, type) {
    const x = precisionDe(carnet, 'types', type);
    return (x && x.sens) || null;
  }

  /**
   * Le sens qui s'appliquera vraiment à un type : celui que fixe la logique des libellés
   * (`fixe`, donné par l'appelant : ce module n'en dépend pas), sinon celui qu'on a déclaré.
   * C'est lui qu'il faut afficher, pour que l'espace Données et la fiche disent la même chose.
   */
  function sensApplique(carnet, type, fixe) {
    return propreSens(fixe) || sensDeType(carnet, type);
  }

  /** De quoi afficher un compteur : { comptes: { ajoutes, retires }, … , precisions, total }. */
  function resume(carnet) {
    const out = { total: 0, precisions: 0 };
    for (const g of GENRES) {
      const a = ajoutsDe(carnet, g).length;
      const r = retiresDe(carnet, g).length;
      out[g] = { ajoutes: a, retires: r };
      out.precisions += precisionsDe(carnet, g).length;
      out.total += a + r;
    }
    out.total += out.precisions;
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
        fichier: 'donnees.json',
        ou: () => Promise.resolve(F.dir()),
        charger: async () => parse(await F.loadCarnet()),
        enregistrer: async (c) => { await F.saveCarnet(serialize(c)); },
      };
    }
    if (typeof localStorage !== 'undefined') {
      return {
        kind: 'navigateur',
        ou: async () => 'la mémoire de ce navigateur',
        charger: async () => parse(localStorage.getItem(CLE_LOCALE)),
        enregistrer: async (c) => { localStorage.setItem(CLE_LOCALE, serialize(c)); },
      };
    }
    return { kind: 'aucun', ou: async () => 'nulle part : vos changements seront perdus en fermant', charger: async () => vide(), enregistrer: async () => {} };
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
    ajouter, retirer, remettre, preciser, estAjout,
    forme, semblables,
    ajoutsDe, retiresDe, precisionsDe, garde, fusionner, appliquer, noteDe, sensDeType, sensApplique, resume,
    depot, actuel, poser,
  };
});
