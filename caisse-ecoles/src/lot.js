/*
 * Le lot de pièces scannées et le journal de l'année : une seule liste, d'un jour à l'autre.
 *
 * Les écritures lues dans « Pièces scannées » entrent au journal dès la lecture (registre.js,
 * syncScanBatch), et chacune y retrouve SA pièce par une clé. Ce module dit comment on fabrique
 * cette clé, et garde les deux écrans d'accord :
 *
 *  - la clé tient au CONTENU du fichier, pas à l'ordre d'ouverture. Elle valait « n° du fichier
 *    dans la session : page : formulaire », et ce n° repartait à 1 à chaque ouverture de
 *    l'application : le fichier lu le lendemain réécrivait les pièces encore « à vérifier » de la
 *    veille, ou n'entrait jamais au journal si elles étaient vérifiées ;
 *  - un registre écrit avant ce changement porte encore ces anciennes clés : relire l'ancien fichier
 *    reprend ses pièces au lieu de les doubler ;
 *  - une pièce déjà au journal, lue dans un autre fichier, n'y entre pas une seconde fois ;
 *  - « Vérifié » coché dans Pièces scannées vaut au journal, et une correction faite après coup
 *    y arrive aussi.
 *
 * Module sans fenêtre, éprouvé dans Node (test/scans.test.js).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./registre.js'));
  else root.CaisseLot = factory(root.CaisseRegistre);
})(typeof self !== 'undefined' ? self : this, function (R) {
  'use strict';

  /**
   * Empreinte du contenu d'un fichier : 17 caractères, les mêmes pour les mêmes octets, quel que
   * soit le nom du fichier ou le jour où on le lit.
   *
   * Calculée ici plutôt que par crypto.subtle : celui-ci n'existe que dans un contexte « sûr »
   * (pas toujours pour un fichier HTML ouvert à la main), et l'empreinte doit être la même dans
   * l'application fenêtrée, dans le navigateur et dans les essais.
   *
   * NE PAS CHANGER CETTE FORMULE : l'empreinte est écrite dans les registres (scanKey). Une autre
   * formule ferait de chaque fichier relu un inconnu, et ses pièces entreraient une seconde fois.
   * Le « f » de tête la distingue des anciennes clés, qui ne sont faites que de chiffres.
   */
  function empreinte(octets) {
    const o = octets instanceof Uint8Array ? octets : new Uint8Array(octets || []);
    let h1 = 0xdeadbeef ^ o.length;
    let h2 = 0x41c6ce57 ^ o.length;
    for (let i = 0; i < o.length; i++) {
      const c = o[i];
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 'f' + (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  }

  /** Clé d'une écriture lue : « empreinte du fichier : page : n° du formulaire sur la page ». */
  function cle(fichier, page, part) {
    return `${fichier}:${page}:${part == null ? '' : part}`;
  }

  /**
   * Clé d'un formulaire lu sur une page chargée ({ empreinte, docId, pageInDoc }). L'empreinte du
   * fichier, et non son n° d'ordre dans la séance (docId) : c'est ce qui fait qu'un fichier lu un
   * autre jour ne retombe pas sur les clés de celui de la veille. Le n° d'ordre ne sert plus que
   * pour une page qui n'a pas de fichier derrière elle (essais).
   */
  function cleDePage(page, part) {
    if (!page) return null;
    return cle(page.empreinte || page.docId, page.pageInDoc, part);
  }

  // Ancienne clé : « n° du fichier dans la session : page : formulaire », que des chiffres.
  const ANCIENNE = /^(\d+):(\d+):(\d*)$/;
  const estAncienne = (k) => ANCIENNE.test(String(k || ''));
  /** « page:formulaire » d'une clé, ancienne ou nouvelle. */
  function emplacement(k) {
    const m = /:(\d+):(\d*)$/.exec(String(k || ''));
    return m ? `${m[1]}:${m[2]}` : '';
  }
  /** Les clés d'un fichier commencent toutes par son empreinte. */
  const duFichier = (k, fichier) => !!fichier && String(k || '').startsWith(`${fichier}:`);

  const cents = (v) => Math.round((Number(v) || 0) * 100);
  const montantDe = (e) => (Number(e.debit) > 0 ? Number(e.debit) : (Number(e.credit) > 0 ? Number(e.credit) : 0));
  const sensDe = (e) => (Number(e.debit) > 0 ? 'debit' : (Number(e.credit) > 0 ? 'credit' : null));
  const memeNo = (a, b) => a != null && b != null && a !== '' && b !== '' && Number(a) === Number(b);

  /**
   * La pièce qu'un registre d'avant les clés stables a notée pour cette écriture : même page, même
   * formulaire sur la page, et même n° (à défaut de n° lisible, même montant du même côté). Le
   * n° du fichier, lui, ne dit plus rien : il dépendait de l'ordre d'ouverture.
   */
  function ancienneDe(reg, e, k) {
    const ou = emplacement(k);
    return reg.pieces.find((p) => estAncienne(p.scanKey) && emplacement(p.scanKey) === ou
      && (memeNo(p.no, e.no)
        || ((p.no == null || e.no == null || e.no === '') && cents(p.montant) === cents(montantDe(e)) && p.sens === sensDe(e))));
  }

  /**
   * La même pièce, déjà au journal par un autre fichier : même n°, même montant, même sens, et
   * rattachée à une autre lecture. Une fiche scannée deux fois (« Pce 01 à 33.pdf » puis sa
   * copie rescannée) ne doit pas faire deux lignes.
   */
  function dejaAilleurs(reg, e, k) {
    const m = cents(montantDe(e));
    const s = sensDe(e);
    if (!m || !s) return null;
    return reg.pieces.find((p) => p.scanKey && p.scanKey !== k && memeNo(p.no, e.no) && cents(p.montant) === m && p.sens === s) || null;
  }

  /** La lecture changerait-elle la pièce ? (pour ne pas réenregistrer le registre pour rien) */
  function differe(p, maj) {
    return p.no !== maj.no || p.date !== maj.date || p.compte !== maj.compte
      || (p.libelle || R.composeLibelle(p)) !== (maj.libelle || R.composeLibelle(maj))
      || cents(p.montant) !== cents(maj.montant) || p.sens !== maj.sens;
  }

  /**
   * Verse le lot au journal et l'y tient à jour. `entrees` : les écritures lues, chacune avec
   *   { scanKey, no, date, compte, libelle, debit, credit, warnings,
   *     verifie : true / false quand la personne a coché / décoché « Vérifié » dans Pièces scannées,
   *     corrige : true quand elle a corrigé la ligne à la main }.
   * opts.connues : clés qui étaient au journal plus tôt dans la séance. Une clé connue qui n'y est
   *   plus a été supprimée du journal par la personne : on ne la ressuscite pas.
   *
   * Rend ce que rend syncScanBatch, plus :
   *   reprises    pièces d'un ancien registre retrouvées et passées à la nouvelle clé ;
   *   ailleurs    [{ entree, piece }] déjà au journal par une autre lecture : pas ajoutées ;
   *   supprimees  écritures dont la pièce a été retirée du journal : pas remises ;
   *   verifiees / remisesAVerifier / corrigees : ce que la personne a fait dans Pièces scannées ;
   *   nonCorrigees pièces saisies à la main : la lecture ne les réécrit pas.
   */
  function verser(reg, entrees, opts) {
    opts = opts || {};
    const bilan = {
      ajoutees: [], misesAJour: [], rattachees: [], inchangees: [], sansMontant: [],
      reprises: [], ailleurs: [], supprimees: [], verifiees: [], remisesAVerifier: [], corrigees: [], nonCorrigees: [],
    };
    const aVerser = [];
    for (const e of entrees || []) {
      const k = String(e.scanKey || '');
      if (!k) continue;
      let piece = reg.pieces.find((p) => p.scanKey === k) || null;
      if (!piece && !estAncienne(k)) {
        const ancienne = ancienneDe(reg, e, k);
        if (ancienne) {
          ancienne.scanKey = k;
          ancienne.updatedAt = new Date().toISOString();
          piece = ancienne;
          bilan.reprises.push(ancienne);
        }
      }
      if (!piece) {
        if (opts.connues && opts.connues.has(k)) { bilan.supprimees.push(e); continue; }
        const autre = dejaAilleurs(reg, e, k);
        if (autre) { bilan.ailleurs.push({ entree: e, piece: autre }); continue; }
      }
      aVerser.push(e);
    }

    const res = R.syncScanBatch(reg, aVerser);
    for (const n of ['ajoutees', 'misesAJour', 'rattachees', 'inchangees', 'sansMontant']) bilan[n] = res[n] || [];

    // Ce que la personne a fait dans Pièces scannées vaut au journal. Seules les pièces venues d'un
    // scan sont concernées : une pièce saisie à la main, à laquelle la lecture s'est rattachée,
    // reste telle qu'elle a été saisie.
    const aCocher = [];
    for (const e of aVerser) {
      const k = String(e.scanKey);
      const p = reg.pieces.find((x) => x.scanKey === k);
      if (!p) continue;
      const scan = p.source === 'scan';
      if (e.corrige && !p.aVerifier) {
        if (!scan) bilan.nonCorrigees.push(p);
        else {
          const [maj] = R.piecesFromEntries([e], 'scan');
          if (maj.montant > 0 && differe(p, maj)) {
            // corrigée par quelqu'un qui la regarde : elle reste vérifiée
            R.upsertPiece(reg, Object.assign({}, maj, {
              id: p.id, scanKey: k, aVerifier: false, doutes: [],
              justificatifs: p.justificatifs, createdAt: p.createdAt, decompteAFaire: p.decompteAFaire, ref: p.ref,
            }));
            bilan.corrigees.push(reg.pieces.find((x) => x.id === p.id));
          }
        }
      }
      if (e.verifie === true && p.aVerifier) aCocher.push(p.id);
      else if (e.verifie === false && !p.aVerifier && scan) {
        p.aVerifier = true;
        p.doutes = (e.warnings || []).map(String).slice(0, 12);
        p.updatedAt = new Date().toISOString();
        bilan.remisesAVerifier.push(p);
      }
    }
    if (aCocher.length) bilan.verifiees = R.markVerified(reg, aCocher);
    if (bilan.reprises.length || bilan.remisesAVerifier.length || bilan.corrigees.length) reg.updatedAt = new Date().toISOString();
    return bilan;
  }

  /** Le versement a-t-il changé le registre ? (il faut alors l'enregistrer) */
  function aChange(b) {
    return !!(b && (b.ajoutees.length || b.misesAJour.length || b.rattachees.length || b.reprises.length
      || b.verifiees.length || b.remisesAVerifier.length || b.corrigees.length));
  }

  /**
   * L'autre sens : ce que le journal dit des écritures du lot, pour l'écran des pièces scannées.
   * Pour chaque écriture qui a sa pièce au journal : { entree, piece, verifiee, valeurs }, où
   * `valeurs` n'est donné que pour une pièce vérifiée — c'est alors le journal qui fait foi, et
   * l'écran la montre telle qu'elle y est, corrections faites dans la fiche comprises.
   * `retirees` : les écritures dont la pièce a quitté le journal alors qu'elle y était
   * (supprimée dans la saisie). Les laisser au lot les y remettrait au prochain versement.
   */
  function accorder(reg, entrees, connues) {
    const parCle = new Map();
    for (const p of (reg && reg.pieces) || []) if (p.scanKey) parCle.set(p.scanKey, p);
    const out = { lignes: [], retirees: [] };
    for (const e of entrees || []) {
      const k = String(e.scanKey || e.sourceKey || '');
      if (!k) continue;
      const p = parCle.get(k);
      if (!p) {
        if (connues && connues.has(k)) out.retirees.push(e);
        continue;
      }
      const verifiee = !p.aVerifier;
      out.lignes.push({
        entree: e, piece: p, verifiee,
        valeurs: verifiee ? {
          no: p.no, date: p.date, compte: p.compte, libelle: p.libelle || R.composeLibelle(p),
          debit: p.sens === 'debit' ? p.montant : null, credit: p.sens === 'credit' ? p.montant : null,
        } : null,
      });
    }
    return out;
  }

  /**
   * Retire du journal les pièces d'un fichier qui ne sont pas encore vérifiées, et celles-là
   * seulement : les autres fichiers du lot n'y perdent rien, et ce qui a été vérifié reste.
   * `autres` : clés à retirer en plus (écritures d'essai sans fichier derrière elles).
   */
  function retirerFichier(reg, fichier, autres) {
    const cles = reg.pieces.filter((p) => duFichier(p.scanKey, fichier)).map((p) => p.scanKey).concat(autres || []);
    return R.removeScanBatch(reg, cles);
  }

  /**
   * Ce que le lot a apporté au journal, pour les totaux et le contrôle de l'écran.
   *
   * Les pièces DU LOT sont celles qu'il a créées. Une pièce saisie à la main, à laquelle la lecture
   * s'est rattachée, ou une pièce déjà venue par un autre fichier, était au journal avant lui : elle
   * n'est pas comptée comme apportée. L'écran annonçait « déjà dans le registre » les pièces que le
   * lot venait lui-même d'y verser, et 0.00 d'entrées et de sorties.
   *
   *   avant + entrees − sorties = avec   (les quatre tuiles s'additionnent)
   *   dejaLa   : n° lus qui étaient déjà au journal (même montant) : non comptés deux fois ;
   *   conflits : n° lus qui y sont aussi avec un autre montant, ou deux fois.
   */
  function bilanDuLot(reg, entrees) {
    const cles = new Set();
    for (const e of entrees || []) { const k = String(e.scanKey || e.sourceKey || ''); if (k) cles.add(k); }
    const pieces = (reg && reg.pieces) || [];
    const parCle = new Map();
    for (const p of pieces) if (p.scanKey && cles.has(p.scanKey)) parCle.set(p.scanKey, p);
    const dedans = Array.from(parCle.values());
    const creees = dedans.filter((p) => p.source === 'scan');
    let entreesLot = 0; let sortiesLot = 0;
    for (const p of creees) {
      if (p.sens === 'debit') entreesLot += p.montant;
      else if (p.sens === 'credit') sortiesLot += p.montant;
    }
    const dejaLa = new Set(dedans.filter((p) => p.source !== 'scan' && p.no != null).map((p) => Number(p.no)));
    const conflits = new Set();
    for (const e of entrees || []) {
      if (e.no == null || e.no === '' || isNaN(Number(e.no))) continue;
      const sienne = parCle.get(String(e.scanKey || e.sourceKey || '')) || null;
      const autres = pieces.filter((p) => p !== sienne && memeNo(p.no, e.no));
      if (!autres.length) continue;
      const pareille = autres.some((p) => cents(p.montant) === cents(montantDe(e)) && p.sens === sensDe(e));
      if (!sienne && pareille) dejaLa.add(Number(e.no)); else conflits.add(Number(e.no));
    }
    const round2 = (v) => Math.round(v * 100) / 100;
    const avec = reg ? R.journal(reg).end : 0;
    const tri = (set) => Array.from(set).sort((a, b) => a - b);
    return {
      pieces: creees,
      rattachees: dedans.filter((p) => p.source !== 'scan'),
      aVerifier: creees.filter((p) => p.aVerifier).length,
      entrees: round2(entreesLot),
      sorties: round2(sortiesLot),
      avec,
      avant: round2(avec - entreesLot + sortiesLot),
      dejaLa: tri(dejaLa),
      conflits: tri(conflits),
    };
  }

  return { empreinte, cle, cleDePage, estAncienne, emplacement, duFichier, verser, aChange, accorder, retirerFichier, bilanDuLot };
});
