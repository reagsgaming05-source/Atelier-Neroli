/*
 * La pile de fiches scannées : la découper en documents, et rendre chacun à sa pièce.
 *
 * On imprime les fiches, l'enseignant-e signe, on empile, et on passe toute la pile au copieur en
 * un seul envoi. Ce qui arrive dans le dossier surveillé est donc un PDF de trente pages où se
 * suivent des pièces sans séparateur — sauf le petit code QR de chaque fiche (voir marque.js).
 *
 * Ce code fait deux choses, et rien d'autre : il dit où commence chaque document, et à quelle
 * pièce il appartient. Ni lecture de PDF, ni fenêtre, ni fichier : de quoi l'éprouver sur table.
 *
 * Règle de découpe : une page qui porte une marque OUVRE un document, qui court jusqu'à la marque
 * suivante. Les pages qui précèdent la première marque forment un document à part, sans marque —
 * une pièce d'avant le code QR, un courrier glissé par erreur, ou une pile posée à l'envers.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CaissePile = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Clé d'une pièce : « 2026:plx9k2m3abcde ». */
  const cle = (marque) => (marque && marque.annee && marque.id ? `${marque.annee}:${marque.id}` : '');

  /**
   * Découpe une pile d'après les marques relevées page par page.
   *
   * `marques` : un élément par page, { annee, id } ou null.
   * Rend [{ marque, pages: [n° de page, base 0], premiere, derniere, doublon }].
   */
  function decouper(marques) {
    const liste = Array.isArray(marques) ? marques : [];
    const docs = [];
    let courant = null;
    liste.forEach((m, i) => {
      if (m && cle(m)) {
        courant = { marque: { annee: m.annee, id: m.id }, pages: [i], premiere: i, derniere: i, doublon: false };
        docs.push(courant);
        return;
      }
      if (!courant) {
        // pages d'avant la première marque : un document à part entière, sans marque
        courant = { marque: null, pages: [i], premiere: i, derniere: i, doublon: false };
        docs.push(courant);
        return;
      }
      courant.pages.push(i);
      courant.derniere = i;
    });

    // Une même pièce deux fois dans la pile : la feuille est passée deux fois dans le chargeur,
    // ou la fiche a été réimprimée et les deux exemplaires sont dans le tas. On le dit plutôt que
    // de joindre deux fois le même justificatif à la même ligne du journal.
    const vues = new Map();
    for (const d of docs) {
      const k = cle(d.marque);
      if (!k) continue;
      if (vues.has(k)) { d.doublon = true; vues.get(k).premier = true; }
      else vues.set(k, d);
    }
    return docs;
  }

  /**
   * Rend à chaque document sa pièce. `pieces` : Map « annee:id » -> pièce, ou une fonction
   * (annee, id) -> pièce. Rend les documents enrichis de { piece, etat }.
   *
   * etat :
   *   'trouvee'     la marque désigne une pièce du registre : on sait exactement où la ranger ;
   *   'inconnue'    marque lisible, mais aucune pièce de ce nom (registre d'une autre année pas
   *                 encore ouvert sur ce poste, ou pièce supprimée depuis l'impression) ;
   *   'doublon'     cette pièce est déjà venue plus haut dans la même pile ;
   *   'sans-marque' aucun code QR : fiche d'avant le code, document étranger, ou pile à l'envers.
   */
  function classer(documents, pieces) {
    const chercher = typeof pieces === 'function'
      ? pieces
      : (annee, id) => (pieces && pieces.get ? pieces.get(`${annee}:${id}`) : null);
    return (documents || []).map((d) => {
      if (!d.marque) return Object.assign({}, d, { piece: null, etat: 'sans-marque' });
      let piece = null;
      try { piece = chercher(d.marque.annee, d.marque.id) || null; } catch (e) { piece = null; }
      if (!piece) return Object.assign({}, d, { piece: null, etat: 'inconnue' });
      return Object.assign({}, d, { piece, etat: d.doublon ? 'doublon' : 'trouvee' });
    });
  }

  /** Ce qu'il y a dans la pile, en une phrase : { total, trouvees, inconnues, doublons, sansMarque }. */
  function resume(documents) {
    const out = { total: 0, trouvees: 0, inconnues: 0, doublons: 0, sansMarque: 0, pages: 0 };
    for (const d of documents || []) {
      out.total += 1;
      out.pages += (d.pages || []).length;
      if (d.etat === 'trouvee') out.trouvees += 1;
      else if (d.etat === 'inconnue') out.inconnues += 1;
      else if (d.etat === 'doublon') out.doublons += 1;
      else out.sansMarque += 1;
    }
    return out;
  }

  /**
   * Nom du justificatif attaché à la pièce. Un nom stable : rescanner la même pièce remplace le
   * fichier au lieu d'en accumuler dix, ce qui serait le résultat d'un nom horodaté.
   */
  const NOM_SIGNEE = 'piece-signee.pdf';

  /* ---------------- Où ranger un décompte scanné ---------------- */

  const RACINE_DECOMPTES = 'Décomptes';
  const A_FAIRE = 'À faire';

  /** Camp ou course d'école, tels que la fiche les propose. « Mini-camp » est un camp. */
  function genreDeDecompte(objet) {
    const o = String(objet == null ? '' : objet).trim();
    return /camp/i.test(o) ? 'Camp' : "Course d'école";
  }

  /** Nom de fichier lisible dans l'explorateur, et acceptable par Windows. */
  function nomLisible(piece) {
    const no = piece && piece.no != null && piece.no !== '' ? String(piece.no).padStart(3, '0') : 'sans-no';
    // « DECOMPTE - Camp 9S du 12-16.05.2026 Leysin - L. Duvernay » : le type est déjà dit par le
    // dossier, on garde ce qui distingue un décompte d'un autre.
    const libelle = String((piece && piece.libelle) || '').replace(/^[A-ZÀ-Ý' ]+ - /, '').trim();
    const propre = `${no} ${libelle}`
      .replace(/[<>:"/\\|?*]/g, '-')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[. ]+|[. ]+$/g, '');
    return `${(propre || no).slice(0, 90)}.pdf`;
  }

  /**
   * Le dossier où poser le scan signé d'une pièce, en plus de l'attacher à sa ligne du journal.
   *
   * Ce classement-là n'est pas comptable : c'est un bac à courrier. Il sert à ouvrir l'explorateur
   * et voir d'un coup d'œil ce qu'il reste à faire, sans passer par l'application. Seuls les
   * décomptes y ont leur place ; le reste est déjà rangé par le journal.
   *
   *   Décomptes/À faire/Camp/            décompte marqué « à faire » sur un camp
   *   Décomptes/À faire/Course d'école/  idem, course d'école
   *   Décomptes/                         décompte non marqué : gardé, rien à en faire
   *
   * Rend { dossier, nom } ou null si la pièce n'est pas un décompte.
   */
  function rangement(piece) {
    if (!piece || String(piece.type || '').toUpperCase() !== 'DECOMPTE') return null;
    const dossier = piece.decompteAFaire
      ? `${RACINE_DECOMPTES}/${A_FAIRE}/${genreDeDecompte(piece.objet)}`
      : RACINE_DECOMPTES;
    return { dossier, nom: nomLisible(piece) };
  }

  return { decouper, classer, resume, cle, NOM_SIGNEE, rangement, genreDeDecompte, nomLisible, RACINE_DECOMPTES, A_FAIRE };
});
