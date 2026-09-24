/*
 * L'année de la caisse : ce qui relie une année à la suivante (solde à nouveau), ce qu'on propose
 * au démarrage (premier lancement, janvier), ce qui protège un registre (sauvegarde,
 * restauration) et les contrôles qui précèdent le fichier Excel ou le comptage.
 *
 * Partie « pure », testable dans Node (test/annee.test.js) ; les écrans sont dans saisie.js
 * (L'année, bandeau de la saisie) et comptage.js.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./registre.js'), require('./parser.js'));
  else root.CaisseAnnee = factory(root.CaisseRegistre, root.CaisseParser);
})(typeof self !== 'undefined' ? self : this, function (R, P) {
  'use strict';

  const egaux = (a, b) => Math.abs((Number(a) || 0) - (Number(b) || 0)) < 0.005;
  const anneeDe = (iso) => Number(String(iso || '').slice(0, 4)) || null;
  /** « 24.09.2026 » depuis une date (2026-09-24) ou un instant (updatedAt, en UTC : on le lit à l'heure locale). */
  function jour(iso) {
    const s = String(iso || '');
    if (s.length > 10) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    }
    return s ? P.isoToDisplay(s.slice(0, 10)) : '';
  }
  const montant = (v) => {
    const n = Number(v) || 0; const [i, d] = Math.abs(n).toFixed(2).split('.');
    return `${n < 0 ? '− ' : ''}${i.replace(/\B(?=(\d{3})+(?!\d))/g, "'")}.${d}`;
  };
  const signe = (v) => (egaux(v, 0) ? '0.00' : `${v > 0 ? '+ ' : '− '}${montant(Math.abs(v))}`);
  const pluriel = (n, mot, pl) => `${n} ${n > 1 ? (pl || mot + 's') : mot}`;
  /** « n° 5 », « n° 5 et 6 », « n° 5, 6 et 9 » ; au-delà de `max`, « … ». */
  function numeros(liste, max) {
    const nos = liste.map((p) => (p && typeof p === 'object' ? p.no : p)).map((n) => (n == null ? '?' : String(n)));
    const vus = nos.slice(0, max || 12);
    const reste = nos.length > vus.length ? '…' : '';
    if (vus.length <= 1) return `n° ${vus.join('')}${reste}`;
    return reste ? `n° ${vus.join(', ')}${reste}` : `n° ${vus.slice(0, -1).join(', ')} et ${vus[vus.length - 1]}`;
  }

  /* ---------------- D'une année à l'autre ---------------- */

  /** L'année existante juste avant `annee` (la plus grande avant elle), ou null. */
  function anneePrecedente(annees, annee) {
    const avant = (annees || []).map(Number).filter((y) => y < Number(annee));
    return avant.length ? Math.max.apply(null, avant) : null;
  }
  /** L'année existante juste après `annee`, ou null. */
  function anneeSuivante(annees, annee) {
    const apres = (annees || []).map(Number).filter((y) => y > Number(annee));
    return apres.length ? Math.min.apply(null, apres) : null;
  }

  /**
   * Le solde à nouveau d'une année face au solde final de l'année d'avant. L'argent en caisse le
   * 31 décembre est celui du 1er janvier : les deux doivent être égaux. Rend null s'il n'y a pas
   * d'année précédente.
   */
  function comparerSoldes(reg, regPrecedent) {
    if (!reg || !regPrecedent) return null;
    const fin = R.journal(regPrecedent).end;
    const ouverture = P.round2(Number(reg.opening && reg.opening.amount) || 0);
    return {
      annee: reg.annee, precedente: regPrecedent.annee,
      soldeANouveau: ouverture, soldeFinal: fin, egal: egaux(ouverture, fin), ecart: P.round2(ouverture - fin),
    };
  }

  /**
   * Le solde final d'une année vient de changer : une pièce de décembre arrivée en janvier, une
   * correction faite après coup. L'année suivante, déjà créée, partait de l'ancien solde final ;
   * elle doit le suivre, sinon toute l'année repart d'un chiffre faux sans que rien ne le dise.
   *
   * Seulement si elle en partait vraiment : un solde à nouveau différent a été réglé à la main
   * (repris d'un classeur, corrigé après un comptage), et il n'appartient pas à l'application de
   * le remplacer. Celui-là reste tel quel ; l'écart se voit dans L'année et dans le bandeau.
   *
   * Modifie `regSuivant` quand il suit. Rend 'suivi', 'different' (laissé tel quel) ou 'rien'.
   */
  function suivreSoldeFinal(regSuivant, finAvant, finApres) {
    if (!regSuivant || finAvant == null || finApres == null || egaux(finAvant, finApres)) return 'rien';
    const ouverture = regSuivant.opening && regSuivant.opening.amount;
    if (egaux(ouverture, finApres)) return 'rien';
    if (!egaux(ouverture, finAvant)) return 'different';
    regSuivant.opening.amount = P.round2(finApres);
    regSuivant.updatedAt = new Date().toISOString();
    return 'suivi';
  }

  /**
   * Date proposée par défaut (fiche, comptage) dans le registre d'une année : aujourd'hui pour
   * l'année en cours ; le 31 décembre pour une année passée — on y revient en janvier pour les
   * pièces de décembre et le comptage de clôture, alors que le 1er janvier comparait la caisse au
   * solde d'ouverture (un faux écart de toute l'année) ; le 1er janvier pour une année à venir.
   */
  function dateProposee(annee, aujourdhui) {
    const t = aujourdhui || R.today();
    const a = Number(annee); const y = anneeDe(t);
    if (!a || a === y) return t;
    return a < y ? `${a}-12-31` : `${a}-01-01`;
  }

  /**
   * Au démarrage : quelle année ouvrir, et faut-il proposer celle du jour ?
   *  - premier lancement (aucun registre) : l'année du jour, sans l'écrire tant que la personne
   *    n'a rien décidé (voir « Pour commencer » dans saisie.js) ;
   *  - en janvier, l'année du jour n'a pas encore de registre : on rouvre la dernière (les pièces
   *    de décembre arrivent encore) et on PROPOSE la nouvelle — rien ne la suggérait, et les
   *    pièces de janvier partaient dans l'ancienne année ;
   *  - sinon, l'année mémorisée si elle existe encore, ou la plus récente.
   * Rend { ouvrir, proposer (année à créer, ou null), premierLancement }.
   */
  function demarrage(annees, aujourdhui, memorisee) {
    const y = anneeDe(aujourdhui || R.today());
    const liste = (annees || []).map(Number).filter(Boolean);
    if (!liste.length) return { ouvrir: y, proposer: null, premierLancement: true };
    const derniere = Math.max.apply(null, liste);
    const ouvrir = memorisee && liste.includes(Number(memorisee)) ? Number(memorisee) : derniere;
    return { ouvrir, proposer: !liste.includes(y) && derniere < y ? y : null, premierLancement: false };
  }

  /**
   * Registre où rien n'est encore fait : ni pièce, ni comptage, ni solde de départ. C'est là qu'il
   * faut dire d'où part la caisse — un classeur Excel déjà tenu, ou l'argent en caisse au
   * 1er janvier — avant la première pièce, sans quoi soldes et numéros partent faux.
   */
  function registreVierge(reg) {
    return !!reg && !(reg.pieces || []).length && !(reg.comptages || []).length && egaux(reg.opening && reg.opening.amount, 0);
  }

  /* ---------------- Comptage ---------------- */

  /**
   * L'écart caisse / journal à montrer. Rien tant qu'aucune quantité n'est tapée : une caisse pas
   * encore comptée n'a pas d'écart, et l'écran s'ouvrait sur une alarme rouge « il manque de
   * l'argent » de tout le solde du journal. Rend { etat: 'vide'|'juste'|'plus'|'moins', ecart }.
   */
  function etatEcart(counts, total, soldeJournal) {
    if (!counts || !Object.keys(counts).some((k) => Number(counts[k]) > 0)) return { etat: 'vide', ecart: null };
    const ecart = P.round2((Number(total) || 0) - (Number(soldeJournal) || 0));
    return { etat: egaux(ecart, 0) ? 'juste' : ecart > 0 ? 'plus' : 'moins', ecart };
  }

  /**
   * Enregistrer un comptage : un nouveau, ou la correction de celui qu'on a rouvert avec le crayon.
   * Une correction dont la date change ressemble à un nouveau comptage fait sur l'ancien : c'est
   * une question à poser, pas à deviner — deviner « correction » effaçait le comptage précédent.
   * Rend 'nouveau', 'corriger' ou 'demander'.
   */
  function modeEnregistrement(enCorrection, dateOuverte, date) {
    if (!enCorrection) return 'nouveau';
    return dateOuverte && date && date !== dateOuverte ? 'demander' : 'corriger';
  }

  /* ---------------- Fichier Excel de l'année ---------------- */

  /**
   * Ce qu'il faut regarder avant de remettre le fichier Excel de l'année : pièces incomplètes (et
   * ce qui leur manque), numéros manquants ou en double, lectures de scan pas encore vérifiées,
   * écart du dernier comptage. Les mêmes contrôles que l'espace des pièces scannées, mais sur le
   * registre entier. Rend une liste de phrases ; vide, rien à signaler.
   */
  function controlesAvantExcel(reg) {
    const out = [];
    if (!reg) return out;
    const incompletes = (reg.pieces || []).map((p) => ({ p, e: R.validate(p, reg) })).filter((x) => x.e.length);
    for (const x of incompletes.slice(0, 6)) {
      out.push(`${x.p.no == null ? 'pièce sans numéro' : `n° ${x.p.no}`} incomplète : ${x.e.map((m) => m.charAt(0).toLowerCase() + m.slice(1)).join(' ; ')}`);
    }
    if (incompletes.length > 6) out.push(`et ${pluriel(incompletes.length - 6, 'autre pièce incomplète', 'autres pièces incomplètes')} (${numeros(incompletes.slice(6).map((x) => x.p), 10)})`);
    const n = R.numberChecks(reg);
    if (n.manquants.length) out.push(`${n.manquants.length > 1 ? 'numéros manquants' : 'numéro manquant'} dans la suite : ${numeros(n.manquants, 12)}`);
    if (n.doublons.length) out.push(`${n.doublons.length > 1 ? 'numéros employés' : 'numéro employé'} deux fois : ${numeros(n.doublons, 12)}`);
    const aVoir = R.pendingPieces(reg);
    if (aVoir.length) out.push(`${pluriel(aVoir.length, 'pièce lue sur un scan', 'pièces lues sur un scan')}, pas encore ${aVoir.length > 1 ? 'vérifiées' : 'vérifiée'} : ${numeros(aVoir, 12)}`);
    const comptages = (reg.comptages || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.createdAt).localeCompare(String(b.createdAt)));
    const dernier = comptages[comptages.length - 1];
    if (dernier) {
      const e = P.round2(dernier.total - R.balanceAt(reg, dernier.date));
      if (!egaux(e, 0)) out.push(`dernier comptage de la caisse (${jour(dernier.date)}) : écart de ${signe(e)} avec le journal`);
    }
    return out;
  }

  /* ---------------- Sauvegarde et restauration ---------------- */

  // base64 par tranches : String.fromCharCode.apply sur un justificatif entier dépasse la pile
  function versBase64(octets) {
    const u = octets instanceof Uint8Array ? octets : new Uint8Array(octets || []);
    let s = '';
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function depuisBase64(texte) {
    try {
      const s = atob(String(texte));
      const u = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
      return u;
    } catch (e) { return null; }
  }

  /**
   * Fichier de sauvegarde d'une année : le registre, avec ses justificatifs (tickets, factures,
   * fiches signées) glissés dedans. Sans eux, la sauvegarde laissait croire qu'elle protégeait
   * « les pièces », alors qu'un PC en panne emportait tous les tickets.
   *
   * Le registre reste lisible tel quel : R.parse l'ouvre en ignorant le reste, et une version plus
   * ancienne de l'application restaure encore ce fichier (sans les justificatifs).
   *   fichiers : [{ piece (id), nom, octets }]
   */
  function empaqueter(reg, fichiers, faiteLe) {
    const sauvegarde = {
      faiteLe: faiteLe || new Date().toISOString(),
      justificatifs: (fichiers || []).map((f) => ({ piece: String(f.piece), nom: String(f.nom), octets: versBase64(f.octets) })),
    };
    return JSON.stringify(Object.assign({}, reg, { sauvegarde }), null, 1);
  }

  /** Relit un fichier de sauvegarde : { reg, fichiers, faiteLe }, ou null si ce n'en est pas un. */
  function deballer(texte) {
    let brut;
    try { brut = JSON.parse(texte); } catch (e) { return null; }
    const reg = R.normalizeRegister(brut);
    if (!reg) return null;
    const s = brut.sauvegarde && typeof brut.sauvegarde === 'object' ? brut.sauvegarde : {};
    const fichiers = [];
    for (const f of Array.isArray(s.justificatifs) ? s.justificatifs : []) {
      if (!f || !f.piece || !f.nom || typeof f.octets !== 'string') continue;
      const octets = depuisBase64(f.octets);
      if (octets) fichiers.push({ piece: String(f.piece), nom: String(f.nom), octets });
    }
    return { reg, fichiers, faiteLe: typeof s.faiteLe === 'string' ? s.faiteLe : null };
  }

  const CHAMPS = ['no', 'date', 'type', 'objet', 'classe', 'periode', 'detail', 'personne', 'libelle', 'compte', 'montant', 'sens'];
  const contenu = (p) => JSON.stringify(CHAMPS.map((k) => p[k])) + JSON.stringify((p.justificatifs || []).map((j) => j.name).sort());
  const resume = (reg) => (reg ? { pieces: reg.pieces.length, comptages: (reg.comptages || []).length, soldeFinal: R.journal(reg).end, modifie: reg.updatedAt || null } : null);

  /**
   * Ce qu'une restauration va changer. Une sauvegarde remplace le registre entier : les pièces
   * saisies depuis disparaissent, celles corrigées depuis reprennent leur ancienne version, les
   * comptages faits depuis sont perdus. On le dit AVANT, en les nommant.
   *
   * Les pièces se reconnaissent à leur identifiant ; à défaut (sauvegarde venue d'un autre poste),
   * au même n°, même montant et même sens. `actuel` peut être null : l'année n'existe pas encore.
   */
  function bilanRestauration(actuel, sauvegarde) {
    const res = {
      annee: sauvegarde.annee, actuel: resume(actuel), sauvegarde: resume(sauvegarde),
      perdues: [], changees: [], retrouvees: [], comptagesPerdus: [], comptagesRetrouves: [],
    };
    const piecesA = actuel ? actuel.pieces : [];
    const pareille = (a, b) => a.no != null && a.no === b.no && egaux(a.montant, b.montant) && a.sens === b.sens;
    const dans = (liste, p) => liste.find((x) => x.id === p.id) || liste.find((x) => pareille(x, p));
    for (const p of piecesA) {
      const s = dans(sauvegarde.pieces, p);
      if (!s) res.perdues.push(p);
      else if (contenu(p) !== contenu(s)) res.changees.push(p);
    }
    for (const s of sauvegarde.pieces) if (!dans(piecesA, s)) res.retrouvees.push(s);
    const cA = actuel ? actuel.comptages || [] : [];
    const cS = sauvegarde.comptages || [];
    const memeComptage = (a, b) => a.id === b.id || (a.date === b.date && egaux(a.total, b.total));
    res.comptagesPerdus = cA.filter((c) => !cS.some((x) => memeComptage(c, x)));
    res.comptagesRetrouves = cS.filter((c) => !cA.some((x) => memeComptage(c, x)));
    res.rienNeSePerd = !res.perdues.length && !res.changees.length && !res.comptagesPerdus.length
      && (!actuel || egaux(actuel.opening.amount, sauvegarde.opening.amount));
    res.soldeANouveauChange = !!actuel && !egaux(actuel.opening.amount, sauvegarde.opening.amount);
    res.soldeANouveau = { actuel: actuel ? actuel.opening.amount : null, sauvegarde: sauvegarde.opening.amount };
    return res;
  }

  /**
   * La question posée avant de restaurer : ce qu'il y a, ce que la sauvegarde contient, ce qui
   * sera perdu, et la copie de sécurité. opts : { anneeOuverte, partage, dateSauvegarde,
   * justificatifs (nombre dans la sauvegarde), copie (vrai si une copie de sécurité sera faite) }.
   */
  function questionRestauration(b, opts) {
    opts = opts || {};
    const L = [];
    const desc = (r) => `${pluriel(r.pieces, 'pièce')}, ${pluriel(r.comptages, 'comptage')}, solde final ${montant(r.soldeFinal)}`;
    L.push(opts.intitule || `Restaurer la sauvegarde du journal ${b.annee} ?`);
    L.push('');
    if (b.actuel) L.push(`Journal ${b.annee} actuel : ${desc(b.actuel)}${b.actuel.modifie ? ` (modifié le ${jour(b.actuel.modifie)})` : ''}.`);
    else L.push(`Le journal ${b.annee} n'existe pas encore sur ce poste : il sera créé.`);
    const date = opts.dateSauvegarde || b.sauvegarde.modifie;
    L.push(`Sauvegarde : ${desc(b.sauvegarde)}${date ? ` (du ${jour(date)})` : ''}` +
      `${opts.justificatifs ? `, ${pluriel(opts.justificatifs, 'justificatif')}` : ''}.`);
    if (b.actuel) {
      L.push('');
      if (b.rienNeSePerd) L.push('Rien ne sera perdu : la sauvegarde contient tout ce que le journal actuel contient.');
      if (b.perdues.length) L.push(`Seront PERDUES : ${b.perdues.length > 1 ? `les ${b.perdues.length} pièces` : 'la pièce'} ${numeros(b.perdues, 15)}, saisie${b.perdues.length > 1 ? 's' : ''} depuis la sauvegarde.`);
      if (b.changees.length) L.push(`Reprendront leur version de la sauvegarde (vos corrections depuis seront perdues) : ${numeros(b.changees, 15)}.`);
      if (b.comptagesPerdus.length) L.push(`${b.comptagesPerdus.length > 1 ? 'Comptages perdus' : 'Comptage perdu'} : ${b.comptagesPerdus.slice(0, 6).map((c) => `celui du ${jour(c.date)}`).join(', ')}.`);
      if (b.soldeANouveauChange) L.push(`Le solde à nouveau passe de ${montant(b.soldeANouveau.actuel)} à ${montant(b.soldeANouveau.sauvegarde)}.`);
      if (b.retrouvees.length) L.push(`Reviennent : ${numeros(b.retrouvees, 15)}.`);
    }
    if (opts.anneeOuverte && Number(opts.anneeOuverte) !== Number(b.annee)) {
      L.push('');
      L.push(`Attention : c'est le journal ${b.annee} qui est remplacé, pas celui de l'année ouverte (${opts.anneeOuverte}).`);
    }
    if (opts.partage) L.push('Les données sont partagées : tous les postes verront ce journal.');
    if (b.actuel && opts.copie) {
      L.push('');
      L.push(`Avant de le remplacer, une copie de sécurité du journal ${b.annee} actuel est gardée : la restauration pourra être annulée.`);
    }
    L.push('');
    L.push(`Remplacer le journal ${b.annee} par ${opts.intitule ? 'cette copie' : 'cette sauvegarde'} ?`);
    return L.join('\n');
  }

  /** Nom de la copie de sécurité gardée avant une restauration : on doit la reconnaître à l'œil. */
  function nomCopieSecurite(annee, quand) {
    const d = quand ? new Date(quand) : new Date();
    const deux = (n) => String(n).padStart(2, '0');
    return `Registre caisse ${annee} avant restauration du ${deux(d.getDate())}.${deux(d.getMonth() + 1)}.${d.getFullYear()} ${deux(d.getHours())}h${deux(d.getMinutes())}.json`;
  }

  return {
    anneePrecedente, anneeSuivante, comparerSoldes, suivreSoldeFinal, dateProposee, demarrage, registreVierge,
    etatEcart, modeEnregistrement, controlesAvantExcel,
    versBase64, depuisBase64, empaqueter, deballer, bilanRestauration, questionRestauration, nomCopieSecurite,
    // pour les écrans : même façon d'écrire les montants, les dates et les listes de numéros
    montant, signe, numeros, jour,
  };
});
