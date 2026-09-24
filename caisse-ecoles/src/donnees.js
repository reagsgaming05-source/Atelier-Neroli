/*
 * L'espace « Données » : les listes de l'application, tenues à la main.
 *
 * Un écran, un travail : ici on ne saisit aucune pièce, on règle ce que les listes déroulantes
 * proposeront partout ailleurs. Cinq listes — classes, personnes, comptes, objets, types
 * d'écriture — avec, pour chacune, ce que l'application connaît déjà, ce qu'on y a ajouté, et ce
 * qu'on en a retiré. Tout est gardé avec les registres (voir carnet.js) et rien n'en sort.
 *
 * Chaque liste est une carte repliée : la page tient sur un écran et sert elle-même de sommaire.
 * Dans une carte, un seul champ sert à chercher et à ajouter : ce qu'on tape réduit la liste, ce
 * qui montre tout de suite si la valeur (ou une écriture voisine, « 7P2 » pour « 7P/2 ») existe.
 * Chaque changement se défait d'un clic (« Annuler ») : c'est plus sûr qu'une question de plus.
 *
 * Dépend de window.CaisseCarnet, CaisseParser, CaisseRegistre, et lit l'état de CaisseApp
 * (vocabulaire) et CaisseSaisie (registre de l'année ouverte) pour dire d'où vient chaque valeur.
 */
(function () {
  'use strict';

  const C = window.CaisseCarnet;
  const P = window.CaisseParser;
  const R = window.CaisseRegistre;
  const A = window.CaisseApp || {};
  const $ = (id) => document.getElementById(id);
  const hote = $('donneesCartes');
  const panneau = $('panelDonnees') || hote;
  if (!C || !hote) return;

  const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sansAccent = (t) => String(t == null ? '' : t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const plur = (n, mot, pluriel) => `${n} ${n > 1 ? (pluriel || mot + 's') : mot}`;

  const vocabBrut = () => (A.state && A.state.vocab) || window.CaisseVocab || {};
  const registre = () => (window.CaisseSaisie && window.CaisseSaisie.state && window.CaisseSaisie.state.reg) || null;
  const pieces = () => (registre() && registre().pieces) || [];
  /** Le sens que la logique des libellés impose à un type (« SUBVENTION » : entrée), ou null. */
  const sensFixe = (type) => (R && R.sensFor ? R.sensFor(C.normaliser('types', type)) : null) || null;

  /* ---------------- Les cinq listes ---------------- */
  /**
   * Pour chaque genre : ce que l'application propose d'elle-même (`base`), ce que la valeur vaut
   * dans une pièce (`champ`, pour compter les emplois de l'année), l'ordre d'affichage, et de quoi
   * dire à la personne où la valeur servira (`ou`, `retrait`). Les classes et les personnes
   * viennent en premier : ce sont elles qu'on ajoute chaque année.
   */
  const LISTES = [
    {
      genre: 'classes',
      titre: 'Classes',
      icone: 'i-users',
      nom: ['classe', 'classes'],
      f: true,
      quoi: 'Les classes proposées dans le champ Classe de la fiche. Elles servent aussi à reconnaître une classe écrite sur une pièce scannée.',
      etiquette: 'Chercher ou ajouter une classe',
      exemple: 'ex. 7P/3',
      aide: 'Degré, barre, numéro : « 7P/3 », « 9S », « 10VG/1 ».',
      ou: 'dans le champ Classe de la fiche',
      retrait: "n'est plus proposée dans le champ Classe de la fiche, ni reconnue sur les pièces scannées",
      champ: (p) => p.classe,
      base: () => (vocabBrut().classTokens || []).filter((v) => C.vraisemblable('classes', v)),
      integres: () => ((window.CaisseVocab && window.CaisseVocab.classTokens) || []),
      trier: (a, b) => String(a).localeCompare(String(b), 'fr', { numeric: true }),
    },
    {
      genre: 'personnes',
      titre: 'Personnes',
      icone: 'i-users',
      nom: ['nom', 'noms'],
      quoi: 'Les noms proposés dans le champ Personne de la fiche et pour les deux visas du relevé de caisse.',
      etiquette: 'Chercher ou ajouter un nom',
      exemple: 'ex. A. Berger',
      aide: 'Initiale, point, nom de famille, comme sur les pièces : « A. Berger », « Ch. Dupraz ».',
      ou: 'dans le champ Personne de la fiche et pour les visas du relevé',
      retrait: "n'est plus proposé dans la fiche ni pour les visas, ni reconnu sur les pièces scannées",
      champ: (p) => p.personne,
      base: () => (vocabBrut().persons || []),
      integres: () => ((window.CaisseVocabNoms && window.CaisseVocabNoms.persons) || []),
      trier: (a, b) => String(a).localeCompare(String(b), 'fr'),
    },
    {
      genre: 'comptes',
      titre: 'Comptes comptables',
      icone: 'i-book',
      nom: ['compte', 'comptes'],
      quoi: "Les comptes proposés dans le champ Compte de la fiche et pour le compte caisse ; ils servent aussi à relire les pièces scannées. « Modifier » dit à quoi sert un compte : c'est ce qui s'affiche à côté du numéro, ici et dans la fiche.",
      etiquette: 'Chercher ou ajouter un compte (numéro)',
      exemple: 'ex. 51000.3662.00',
      ou: 'dans le champ Compte de la fiche',
      retrait: "n'est plus proposé dans la fiche (champ Compte, comptes proposés), ni reconnu à la lecture des pièces scannées",
      champ: (p) => p.compte,
      base: () => (vocabBrut().accounts || []),
      integres: () => ((window.CaisseVocab && window.CaisseVocab.accounts) || []),
      trier: (a, b) => String(a).localeCompare(String(b)),
      note: { libelle: 'À quoi il sert', exemple: "ex. Camps et courses d'école" },
      mono: true,
    },
    {
      genre: 'objets',
      titre: 'Objets',
      icone: 'i-list',
      nom: ['objet', 'objets'],
      quoi: "Les objets proposés dans le champ Objet de la fiche (« Camp », « Course d'école »…). L'objet s'écrit dans le libellé de la pièce.",
      etiquette: 'Chercher ou ajouter un objet',
      exemple: 'ex. Sortie au musée',
      ou: 'dans le champ Objet de la fiche',
      retrait: "n'est plus proposé dans le champ Objet de la fiche",
      champ: (p) => p.objet,
      base: () => (P.OBJET_LIST || []),
      integres: () => (P.OBJET_LIST || []),
      trier: null, // l'ordre de la liste intégrée dit quelque chose : « Autre » vient en dernier
    },
    {
      genre: 'types',
      titre: "Types d'écriture",
      icone: 'i-pen',
      nom: ['type', 'types'],
      quoi: "Le premier mot du libellé (REMBOURSEMENT, RECETTE…). Il dit si l'argent entre dans la caisse ou en sort : pour un nouveau type, choisissez-le en l'ajoutant.",
      etiquette: 'Chercher ou ajouter un type',
      exemple: 'ex. COTISATION',
      ou: 'dans le champ Type de la fiche',
      retrait: "n'est plus proposé dans le champ Type de la fiche",
      champ: (p) => p.type,
      base: () => (R.TYPES || []),
      integres: () => (R.TYPES || []),
      trier: null,
      sens: true,
    },
  ];
  const listeDe = (genre) => LISTES.find((l) => l.genre === genre);
  /** « ajoutée » pour une classe, « ajouté » pour un compte. */
  const acc = (l) => (l.f ? 'e' : '');
  const Il = (l) => (l.f ? 'Elle' : 'Il');

  /* ---------------- Où le carnet est gardé ---------------- */
  const depot = C.depot();
  let pret = false;

  /* ---------------- Lecture : d'où vient chaque valeur ---------------- */

  /**
   * Toutes les valeurs d'un genre, avec leur origine et leur emploi.
   * origine : 'ajout' (ajoutée ici), 'base' (intégrée à l'application), 'appris' (venue d'un
   * classeur repris, d'une pièce scannée ou d'une saisie). `n` : pièces de l'année qui s'en servent.
   */
  function valeurs(l) {
    const carnet = C.actuel();
    const emplois = new Map();
    for (const p of pieces()) {
      const v = l.champ(p);
      if (!v) continue;
      const k = sansAccent(v);
      emplois.set(k, (emplois.get(k) || 0) + 1);
    }
    const integres = new Set(l.integres().map(sansAccent));
    const ajoutes = new Set(C.ajoutsDe(carnet, l.genre).map((x) => sansAccent(x.valeur)));
    const ok = C.garde(carnet, l.genre);

    const vus = new Set();
    const out = [];
    const pousser = (v) => {
      const k = sansAccent(v);
      if (!v || vus.has(k)) return;
      vus.add(k);
      if (!ok(v)) return; // retirée : elle apparaît dans la section du bas
      out.push({
        valeur: String(v),
        origine: ajoutes.has(k) ? 'ajout' : (integres.has(k) ? 'base' : 'appris'),
        n: emplois.get(k) || 0,
        note: C.noteDe(carnet, l.genre, v),
        sens: l.sens ? C.sensApplique(carnet, v, sensFixe(v)) : null,
        fixe: l.sens ? !!sensFixe(v) : false,
      });
    };
    for (const v of l.base()) pousser(v);
    for (const p of pieces()) pousser(l.champ(p));
    for (const a of C.ajoutsDe(carnet, l.genre)) pousser(a.valeur);
    if (l.trier) out.sort((a, b) => l.trier(a.valeur, b.valeur));
    return out;
  }

  /**
   * La valeur est-elle connue en dehors de nos ajouts (base, classeur relu, pièces de l'année) ?
   * Un ajout connu nulle part ailleurs se supprime ; sinon il faut le marquer « retiré », faute de
   * quoi il reviendrait aussitôt dans la liste par l'autre chemin.
   */
  function connueAilleurs(l, valeur) {
    const k = sansAccent(valeur);
    return l.base().some((v) => sansAccent(v) === k) || pieces().some((p) => sansAccent(l.champ(p)) === k);
  }

  /** À quoi servent les comptes, d'après le classeur de référence et l'année en cours. */
  function usages() {
    const m = new Map();
    try {
      const faux = { type: '', objet: 'Autre', classe: '', detail: '' };
      for (const c of R.accountChoices(faux, vocabBrut(), registre())) if (c.usage) m.set(c.compte, c.usage);
    } catch (e) { /* liste sans étiquettes : ce n'est pas une raison de ne rien afficher */ }
    return m;
  }

  /* ---------------- Affichage ---------------- */

  const SENS_MOT = { debit: 'entrée en caisse', credit: 'sortie de caisse' };
  const ORIGINE = {
    ajout: { texte: 'ajouté par vous', titre: 'Ajouté ici, gardé avec les registres de la caisse' },
    base: { texte: "d'origine", titre: "Connu de l'application dès l'installation" },
    appris: { texte: 'vu dans vos pièces', titre: 'Lu dans un classeur repris, une pièce scannée ou une fiche enregistrée' },
  };
  const origineTexte = (l, o) => (o === 'ajout' ? `ajouté${acc(l)} par vous` : o === 'appris' ? `vu${acc(l)} dans vos pièces` : ORIGINE[o].texte);

  function carteHtml(l) {
    const g = l.genre;
    const champNote = l.note
      ? `<div class="field" style="flex:1;min-width:200px"><label for="d-${g}-note">${escapeHtml(l.note.libelle)} <span class="legend">(facultatif)</span></label><input type="text" id="d-${g}-note" placeholder="${escapeHtml(l.note.exemple)}" maxlength="120"></div>`
      : '';
    const champSens = l.sens
      ? `<div class="field" data-sens-libre="${g}"><label for="d-${g}-sens">Sens de l'écriture</label><select id="d-${g}-sens" style="height:36px">` +
        '<option value="">selon la pièce</option><option value="debit">entrée en caisse (débit)</option><option value="credit">sortie de caisse (crédit)</option>' +
        '</select></div>' +
        `<div class="field hidden" data-sens-fixe="${g}"><span class="dlib">Sens de l'écriture</span><div class="dfixe"></div></div>`
      : '';
    return `<details class="card fold dcarte" data-carte="${g}">
  <summary><svg class="ico"><use href="#${l.icone}"/></svg> ${escapeHtml(l.titre)} <span class="legend" data-compteur="${g}"></span></summary>
  <p class="legend dquoi">${escapeHtml(l.quoi)}</p>
  <div class="row">
    <div class="field"><label for="d-${g}-val">${escapeHtml(l.etiquette)}</label><input type="text" id="d-${g}-val" data-val="${g}" placeholder="${escapeHtml(l.exemple)}" autocomplete="off" maxlength="80"${l.mono ? ' style="font-family:var(--mono);font-size:13px;width:190px"' : ' style="width:240px"'}></div>
    ${champNote}${champSens}
    <button type="button" class="small primary" data-ajouter="${g}" style="align-self:flex-end;height:36px"><svg class="ico"><use href="#i-plus"/></svg> Ajouter</button>
  </div>
  ${l.aide ? `<div class="legend daide">${escapeHtml(l.aide)}</div>` : ''}
  <div data-msg="${g}" aria-live="polite"></div>
  <div class="dliste" data-liste="${g}"></div>
  <div data-retires="${g}"></div>
</details>`;
  }

  const filtres = {};
  /** La ligne à montrer après un changement : elle défile dans la vue et reste surlignée un moment. */
  let marque = null;
  /** La ligne qu'on est en train de modifier : { genre, valeur }. */
  let edition = null;

  /** Ce qui ressemble à ce qu'on tape : le texte, la note, l'usage, mais aussi les écritures voisines. */
  function correspond(l, x, brut, usage) {
    const q = sansAccent(brut).trim();
    if (!q) return true;
    if (sansAccent(`${x.valeur} ${x.note || ''} ${usage || ''}`).includes(q)) return true;
    const f = C.forme(l.genre, brut);
    if (f && C.forme(l.genre, x.valeur).includes(f)) return true;
    return l.genre === 'personnes' && C.semblables('personnes', brut, [x.valeur]).length > 0;
  }

  function ligneHtml(l, x, use) {
    const g = l.genre;
    const v = escapeHtml(x.valeur);
    if (edition && edition.genre === g && sansAccent(edition.valeur) === sansAccent(x.valeur)) {
      const saisie = l.note
        ? `<label class="dlib" for="d-edit">${escapeHtml(l.note.libelle)}</label><input type="text" id="d-edit" data-edit-note value="${escapeHtml(x.note)}" placeholder="${escapeHtml(l.note.exemple)}" maxlength="120">`
        : `<label class="dlib" for="d-edit">Sens de l'écriture</label><select id="d-edit" data-edit-sens style="height:30px">` +
          ['', 'debit', 'credit'].map((s) => `<option value="${s}"${(C.sensDeType(C.actuel(), x.valeur) || '') === s ? ' selected' : ''}>${s ? SENS_MOT[s] : 'selon la pièce'}</option>`).join('') + '</select>';
      return `<div class="dligne dedit">
  <span class="dval${l.mono ? ' mono' : ''}">${v}</span>
  ${saisie}
  <button type="button" class="small primary" data-edit-ok>Enregistrer</button>
  <button type="button" class="small" data-edit-non>Annuler</button>
</div>`;
    }
    const usage = use && use.get(x.valeur);
    const sens = l.sens ? `${x.sens ? SENS_MOT[x.sens] : 'selon la pièce'}${x.fixe ? ' (toujours, pour ce mot)' : ''}` : '';
    // le sens d'un type d'origine ou fixé par le mot ne se change pas ; celui d'un type nouveau, si
    const modifiable = l.note || (l.sens && !x.fixe && x.origine !== 'base');
    const titreMod = l.note ? `Dire à quoi sert le compte ${x.valeur}` : `Changer le sens de ${x.valeur}`;
    const seul = x.origine === 'ajout' && !connueAilleurs(l, x.valeur);
    return `<div class="dligne${marque && marque.genre === g && sansAccent(marque.valeur) === sansAccent(x.valeur) ? ' dmarque' : ''}">
  <span class="dval${l.mono ? ' mono' : ''}">${v}</span>
  <span class="dorig ${x.origine}" title="${escapeHtml(ORIGINE[x.origine].titre)}">${origineTexte(l, x.origine)}</span>
  ${x.note ? `<span class="dnote">${escapeHtml(x.note)}</span>` : ''}
  ${usage ? `<span class="ddetail">${escapeHtml(usage)}</span>` : ''}
  ${sens ? `<span class="ddetail">${escapeHtml(sens)}</span>` : ''}
  <span class="dspacer"></span>
  ${x.n ? `<span class="dn" title="Pièces de l'année ouverte qui s'en servent">${x.n}×</span>` : ''}
  ${modifiable ? `<button type="button" class="small ghost" data-modifier="${g}" data-valeur="${v}" title="${escapeHtml(titreMod)}"><svg class="ico sm"><use href="#i-pen"/></svg> Modifier</button>` : ''}
  <button type="button" class="small ghost" data-retirer="${g}" data-valeur="${v}" aria-label="${seul ? 'Supprimer' : 'Retirer des listes'} ${v}" title="${seul ? 'Supprimer (ajouté par vous)' : 'Ne plus proposer'} : les pièces déjà enregistrées n'y perdent rien"><svg class="ico sm"><use href="#i-x"/></svg></button>
</div>`;
  }

  function rendreListe(l) {
    const g = l.genre;
    const boite = hote.querySelector(`[data-liste="${g}"]`);
    if (!boite) return;
    const tout = valeurs(l);
    const use = g === 'comptes' ? usages() : null;
    const brut = filtres[g] || '';
    const q = brut.trim();
    const montres = q ? tout.filter((x) => correspond(l, x, q, use && use.get(x.valeur))) : tout;

    const compteur = hote.querySelector(`[data-compteur="${g}"]`);
    if (compteur) {
      const ajoutes = tout.filter((x) => x.origine === 'ajout').length;
      const retires = C.retiresDe(C.actuel(), g).length;
      compteur.textContent = (tout.length ? plur(tout.length, l.nom[0], l.nom[1]) : `aucun${l.f ? 'e' : ''} ${l.nom[0]}`) +
        (ajoutes ? ` · ${ajoutes} ajouté${acc(l)}${ajoutes > 1 ? 's' : ''} par vous` : '') +
        (retires ? ` · ${retires} retiré${acc(l)}${retires > 1 ? 's' : ''}` : '');
    }

    // Ce qu'on tape n'est pas encore dans la liste : le dire, et proposer de l'ajouter sur place
    let tete = '';
    const v = q ? C.verifier(g, q) : null;
    const exact = v && v.ok && tout.some((x) => sansAccent(x.valeur) === sansAccent(v.valeur));
    if (q && v && v.ok && !exact) {
      const voisins = C.semblables(g, v.valeur, montres.map((x) => x.valeur)).length;
      const dit = !montres.length ? `Aucun${l.f ? 'e' : ''} ${l.nom[0]} ne ressemble à « ${escapeHtml(v.valeur)} ».`
        : voisins ? `« ${escapeHtml(v.valeur)} » n'est pas dans la liste ${l.f ? 'telle quelle' : 'tel quel'} ; ce qui lui ressemble est en dessous.`
          : `« ${escapeHtml(v.valeur)} » n'est pas encore dans la liste.`;
      tete = `<div class="dvide dproposer">${dit} ` +
        `<button type="button" class="small" data-ajouter="${g}"><svg class="ico sm"><use href="#i-plus"/></svg> Ajouter « ${escapeHtml(v.valeur)} »</button></div>`;
    } else if (q && montres.length && montres.length < tout.length) {
      tete = `<div class="dvide">La liste ne montre que ce qui ressemble à « ${escapeHtml(q)} » (${montres.length} sur ${tout.length}). Videz le champ pour tout revoir.</div>`;
    }
    if (!montres.length) {
      boite.innerHTML = tete || '<div class="dvide">Cette liste est vide.</div>';
    } else {
      boite.innerHTML = tete + montres.map((x) => ligneHtml(l, x, use)).join('');
    }

    const retires = C.retiresDe(C.actuel(), g);
    const boiteR = hote.querySelector(`[data-retires="${g}"]`);
    if (boiteR) {
      boiteR.innerHTML = retires.length
        ? `<div class="dretires"><b>${plur(retires.length, 'valeur retirée', 'valeurs retirées')} des listes</b> ` +
          `<span class="legend">— plus proposées ; les pièces déjà enregistrées les gardent. Cliquez sur une valeur pour la remettre.</span><div class="dchips">` +
          retires.map((x) => `<button type="button" class="dchip" data-remettre="${g}" data-valeur="${escapeHtml(x)}" title="Remettre ${escapeHtml(x)} dans les listes"><svg class="ico sm"><use href="#i-refresh"/></svg> ${escapeHtml(x)}</button>`).join('') +
          '</div></div>'
        : '';
    }

    // la ligne qu'on vient de toucher : la faire venir dans la boîte, sans bouger la page
    const cible = marque && marque.genre === g ? boite.querySelector('.dmarque, .dedit') : (edition && edition.genre === g ? boite.querySelector('.dedit') : null);
    if (cible) boite.scrollTop = Math.max(0, cible.offsetTop - (boite.clientHeight - cible.offsetHeight) / 2);
  }

  function rendre() {
    for (const l of LISTES) rendreListe(l);
    const r = C.resume(C.actuel());
    const info = $('donneesResume');
    if (info) {
      const somme = (cle) => C.GENRES.reduce((n, g) => n + r[g][cle], 0);
      const notes = C.GENRES.reduce((n, g) => n + C.precisionsDe(C.actuel(), g).filter((x) => x.note).length, 0);
      const parts = [];
      if (somme('ajoutes')) parts.push(plur(somme('ajoutes'), 'ajout'));
      if (somme('retires')) parts.push(plur(somme('retires'), 'retrait'));
      if (notes) parts.push(plur(notes, 'description de compte', 'descriptions de compte'));
      info.innerHTML = parts.length
        ? `Changements apportés aux listes : <b>${parts.join(', ')}</b>.`
        : "Aucun changement apporté aux listes : elles sont telles que l'application les connaît.";
    }
  }

  /** Un seul message à la fois : le dernier changement, qui reste affiché jusqu'au suivant. */
  function effacerMessages() {
    for (const b of panneau.querySelectorAll('[data-msg], #donneesMsg')) b.innerHTML = '';
  }

  function message(genre, kind, texte, opts) {
    effacerMessages();
    const boite = genre ? hote.querySelector(`[data-msg="${genre}"]`) : $('donneesMsg');
    if (!boite) return;
    const annuler = opts && opts.annuler ? ' <button type="button" class="small" data-annuler>Annuler</button>' : '';
    boite.innerHTML = `<div class="notice ${kind}">${texte}${annuler}</div>`;
  }

  /* ---------------- Modifications ---------------- */

  /** Le dernier changement, pour « Annuler » : le carnet d'avant, celui d'après, et ce qu'on dira. */
  let dernier = null;

  /**
   * Enregistre le carnet, puis remet d'accord toutes les listes de l'application.
   * `opts.marquer` : la valeur à montrer ; `opts.defaire` : le texte à dire si on annule.
   */
  async function appliquer(carnet, genre, kind, texte, opts) {
    opts = opts || {};
    const avant = C.actuel();
    C.poser(carnet);
    dernier = null;
    marque = opts.marquer ? { genre, valeur: opts.marquer } : null;
    try {
      await depot.enregistrer(carnet);
    } catch (e) {
      rendre();
      prevenir();
      message(genre, 'err', `Le changement n'a pas pu être enregistré : ${escapeHtml(e && e.message ? e.message : String(e))}. Il vaut pour cette séance seulement.`);
      return;
    }
    dernier = opts.defaire ? { avant, apres: carnet, genre, texte: opts.defaire, marquer: opts.marquerAvant || null } : null;
    rendre();
    prevenir();
    if (texte) message(genre, kind || 'ok', texte, { annuler: !!dernier });
  }

  function annuler() {
    const d = dernier;
    dernier = null;
    if (!d) return;
    if (C.actuel() !== d.apres) {
      message(d.genre, 'warn', 'Ce changement ne peut plus être annulé : les listes ont changé depuis.');
      return;
    }
    appliquer(d.avant, d.genre, 'ok', d.texte, { marquer: d.marquer });
  }

  /** Les listes déroulantes, les listes de secours et les comptes proposés relisent le carnet. */
  function prevenir() {
    if (A.majDonnees) { try { A.majDonnees(); } catch (e) { /* ignore */ } }
    const S = window.CaisseSaisie;
    if (S && S.majListes) { try { S.majListes(); } catch (e) { /* ignore */ } }
  }

  function viderChamps(genre) {
    const l = listeDe(genre);
    const champ = $(`d-${genre}-val`);
    if (champ) { champ.value = ''; champ.focus(); }
    filtres[genre] = '';
    if (l && l.note && $(`d-${genre}-note`)) $(`d-${genre}-note`).value = '';
    if (l && l.sens && $(`d-${genre}-sens`)) { $(`d-${genre}-sens`).value = ''; if (Combo) Combo.syncAll(); majSensFixe(genre); }
  }

  /**
   * Ajouter ce qui est tapé. Trois cas avant d'ajouter vraiment : la valeur est déjà là (ce qu'on
   * a tapé à côté vaut alors description ou sens), elle avait été retirée (on la remet), ou elle
   * ressemble à une valeur existante (on demande si c'est la même — sauf `force`).
   */
  function ajouter(genre, force) {
    const l = listeDe(genre);
    if (!l) return;
    const champ = $(`d-${genre}-val`);
    const brut = champ ? champ.value : '';
    const noteTapee = l.note && $(`d-${genre}-note`) ? $(`d-${genre}-note`).value.trim() : '';
    const sensChoisi = l.sens && $(`d-${genre}-sens`) ? $(`d-${genre}-sens`).value : '';
    const v = C.verifier(genre, brut);
    if (!v.ok) { message(genre, 'err', escapeHtml(v.message)); if (champ) champ.focus(); return; }
    const propre = v.valeur;
    const quoi = `<b>${escapeHtml(propre)}</b>`;
    const fixe = l.sens ? sensFixe(propre) : null;
    const tout = valeurs(l);
    const actuel = C.actuel();

    // 1. déjà dans la liste
    const deja = tout.find((x) => sansAccent(x.valeur) === sansAccent(propre));
    if (deja) {
      const precision = {};
      if (noteTapee) precision.note = noteTapee;
      if (sensChoisi && !fixe && deja.origine !== 'base') precision.sens = sensChoisi;
      viderChamps(genre);
      if (Object.keys(precision).length) {
        const res = C.preciser(actuel, genre, deja.valeur, precision);
        const texte = precision.note
          ? `<b>${escapeHtml(deja.valeur)}</b> était déjà dans la liste : sa description est maintenant « ${escapeHtml(C.noteDe(res.carnet, genre, deja.valeur))} »` +
            `${res.avant.note ? ` (au lieu de « ${escapeHtml(res.avant.note)} »)` : ''}. Elle s'affiche à côté du numéro, ici et dans le champ Compte de la fiche.`
          : `<b>${escapeHtml(deja.valeur)}</b> était déjà dans la liste : son sens est maintenant « ${SENS_MOT[precision.sens]} ».`;
        appliquer(res.carnet, genre, 'ok', texte, { marquer: deja.valeur, defaire: `Changement annulé : ${escapeHtml(deja.valeur)} est revenu comme avant.`, marquerAvant: deja.valeur });
        return;
      }
      marque = { genre, valeur: deja.valeur };
      rendreListe(l);
      const modifier = l.note ? ` <button type="button" class="small" data-modifier="${genre}" data-valeur="${escapeHtml(deja.valeur)}"><svg class="ico sm"><use href="#i-pen"/></svg> Modifier sa description</button>` : '';
      message(genre, 'warn', `<b>${escapeHtml(deja.valeur)}</b> est déjà dans la liste (${origineTexte(l, deja.origine)}) : rien à ajouter.${modifier}`);
      return;
    }

    // 2. retirée plus tôt : la remettre, telle qu'elle était
    const retiree = C.retiresDe(actuel, genre).find((x) => sansAccent(x) === sansAccent(propre));
    if (retiree) {
      let res = C.remettre(actuel, genre, retiree, { ailleurs: connueAilleurs(l, retiree) });
      const precision = {};
      if (noteTapee) precision.note = noteTapee;
      if (sensChoisi && !fixe) precision.sens = sensChoisi;
      if (Object.keys(precision).length) res = C.preciser(res.carnet, genre, retiree, precision);
      viderChamps(genre);
      appliquer(res.carnet, genre, 'ok', `<b>${escapeHtml(retiree)}</b> avait été retiré${acc(l)} des listes : ${Il(l).toLowerCase()} est de nouveau proposé${acc(l)} ${l.ou}.`,
        { marquer: retiree, defaire: `Changement annulé : ${escapeHtml(retiree)} est de nouveau parmi les valeurs retirées.` });
      return;
    }

    // 3. une écriture voisine d'une valeur qui existe déjà : demander avant d'avoir deux écritures
    if (!force) {
      const proches = C.semblables(genre, propre, tout.map((x) => x.valeur));
      if (proches.length) {
        const liste = proches.slice(0, 3).map((x) => `<b>${escapeHtml(x)}</b>`).join(', ');
        const pourquoi = genre === 'personnes'
          ? `a le même nom de famille que ${liste}, déjà dans la liste. Est-ce la même personne ?`
          : `ressemble à ${liste}, déjà dans la liste. Est-ce ${l.f ? 'la même' : 'le même'} ${l.nom[0]} ?`;
        marque = { genre, valeur: proches[0] };
        rendreListe(l);
        message(genre, 'warn', `« ${escapeHtml(propre)} » ${pourquoi}<div class="dchoix">` +
          `<button type="button" class="small" data-garder="${genre}" data-valeur="${escapeHtml(proches[0])}">Oui : garder ${escapeHtml(proches[0])}</button>` +
          `<button type="button" class="small" data-forcer="${genre}">Non : ajouter « ${escapeHtml(propre)} »</button></div>`);
        return;
      }
    }

    // 4. ajouter
    const res = C.ajouter(actuel, genre, propre, { note: noteTapee, sens: sensChoisi, sensFixe: fixe });
    if (!res.ok) { message(genre, 'err', escapeHtml(res.message)); return; }
    viderChamps(genre);
    let texte = `${quoi} ajouté${acc(l)}. ${Il(l)} est maintenant proposé${acc(l)} ${l.ou}.`;
    if (res.sensIgnore) texte += ` Son sens est celui que fixe ce mot : ${SENS_MOT[res.sensFixe]}.`;
    if (res.avertissement) texte += ` ${escapeHtml(res.avertissement)}`;
    appliquer(res.carnet, genre, res.avertissement ? 'warn' : 'ok', texte,
      { marquer: res.valeur, defaire: `Ajout annulé : ${escapeHtml(res.valeur)} n'est plus dans la liste.` });
  }

  /** « Oui, c'est la même » : rien n'est ajouté, on montre l'écriture qui existe. */
  function garderExistante(genre, valeur) {
    viderChamps(genre);
    marque = { genre, valeur };
    rendreListe(listeDe(genre));
    message(genre, 'ok', `Rien n'a été ajouté : <b>${escapeHtml(valeur)}</b> reste la seule écriture dans la liste.`);
  }

  function retirer(genre, valeur) {
    const l = listeDe(genre);
    if (!l) return;
    const n = pieces().filter((p) => sansAccent(l.champ(p)) === sansAccent(valeur)).length;
    const res = C.retirer(C.actuel(), genre, valeur, { ailleurs: connueAilleurs(l, valeur) });
    if (!res.ok) return;
    if (edition && edition.genre === genre) edition = null;
    const v = `<b>${escapeHtml(res.valeur)}</b>`;
    const texte = res.supprime
      ? `${v} supprimé${acc(l)} de vos ajouts : ${Il(l).toLowerCase()} n'est plus proposé${acc(l)}.`
      : `${v} ${l.retrait}. ` +
        (n ? `${plur(n, 'pièce')} de l'année ${n > 1 ? `l'emploient : elles ${l.f ? 'la' : 'le'} gardent` : `l'emploie : elle ${l.f ? 'la' : 'le'} garde`}, comme toutes les pièces déjà enregistrées. `
          : "Les pièces déjà enregistrées n'y perdent rien. ") +
        `Pour ${l.f ? 'la' : 'le'} proposer de nouveau : en bas de cette carte.`;
    appliquer(res.carnet, genre, 'ok', texte, { defaire: `Retrait annulé : ${escapeHtml(res.valeur)} est de nouveau proposé${acc(l)}.`, marquerAvant: res.valeur });
  }

  function remettre(genre, valeur) {
    const l = listeDe(genre);
    if (!l) return;
    const res = C.remettre(C.actuel(), genre, valeur, { ailleurs: connueAilleurs(l, valeur) });
    if (!res.ok) return;
    appliquer(res.carnet, genre, 'ok', `<b>${escapeHtml(valeur)}</b> est de nouveau proposé${acc(l)} ${l.ou}.`,
      { marquer: valeur, defaire: `Changement annulé : ${escapeHtml(valeur)} est de nouveau parmi les valeurs retirées.` });
  }

  /* ---------------- Modifier : la description d'un compte, le sens d'un type ---------------- */

  function modifier(genre, valeur) {
    const l = listeDe(genre);
    if (!l) return;
    const avant = edition;
    edition = { genre, valeur };
    marque = null;
    // une seule ligne en cours de modification dans toute la page
    if (avant && avant.genre !== genre) rendreListe(listeDe(avant.genre));
    rendreListe(l);
    const champ = $('d-edit');
    if (champ) { champ.focus(); if (champ.select) champ.select(); }
  }

  function enregistrerEdition() {
    if (!edition) return;
    const { genre, valeur } = edition;
    const l = listeDe(genre);
    const champ = $('d-edit');
    edition = null;
    if (!l || !champ) { if (l) rendreListe(l); return; }
    const avant = C.actuel();
    if (l.note) {
      const note = champ.value.replace(/\s+/g, ' ').trim();
      if (note === C.noteDe(avant, genre, valeur)) { rendreListe(l); return; }
      const res = C.preciser(avant, genre, valeur, { note });
      const texte = note
        ? `Description de <b>${escapeHtml(valeur)}</b> enregistrée : « ${escapeHtml(C.noteDe(res.carnet, genre, valeur))} ». Elle s'affiche à côté du numéro, ici et dans le champ Compte de la fiche.`
        : `Description de <b>${escapeHtml(valeur)}</b> effacée : c'est de nouveau l'usage habituel du compte qui s'affiche.`;
      return appliquer(res.carnet, genre, 'ok', texte, { marquer: valeur, defaire: `Changement annulé : la description de ${escapeHtml(valeur)} est revenue comme avant.`, marquerAvant: valeur });
    }
    const sens = champ.value || null;
    if (sens === C.sensDeType(avant, valeur)) { rendreListe(l); return; }
    const res = C.preciser(avant, genre, valeur, { sens });
    return appliquer(res.carnet, genre, 'ok', `<b>${escapeHtml(valeur)}</b> : ${sens ? `${SENS_MOT[sens]}, sur chaque pièce de ce type` : 'le sens se choisira sur chaque pièce'}.`,
      { marquer: valeur, defaire: `Changement annulé : le sens de ${escapeHtml(valeur)} est revenu comme avant.`, marquerAvant: valeur });
  }

  function abandonnerEdition() {
    if (!edition) return;
    const l = listeDe(edition.genre);
    edition = null;
    if (l) rendreListe(l);
  }

  /**
   * Au clavier, Entrée ou Échap referment la ligne en cours de modification : la main revient à
   * son bouton « Modifier ». Sans cela, le champ disparu l'emportait avec lui, et la touche Tab
   * suivante repartait du haut de la page.
   */
  function rendreLaMain(ligne) {
    if (!ligne) return;
    const b = Array.from(hote.querySelectorAll('[data-modifier]')).find((x) => x.dataset.modifier === ligne.genre && x.dataset.valeur === ligne.valeur);
    if (b) b.focus();
  }

  /* ---------------- Le sens d'un type que le mot fixe déjà ---------------- */

  /**
   * « SUBVENTION » fait toujours entrer de l'argent : la logique des libellés en décide, quoi
   * qu'on choisisse ici. Plutôt que de laisser choisir un sens qui serait ignoré, on le montre.
   */
  function majSensFixe(genre) {
    const l = listeDe(genre);
    if (!l || !l.sens) return;
    const libre = hote.querySelector(`[data-sens-libre="${genre}"]`);
    const boite = hote.querySelector(`[data-sens-fixe="${genre}"]`);
    if (!libre || !boite) return;
    const champ = $(`d-${genre}-val`);
    const fixe = champ ? sensFixe(champ.value) : null;
    libre.classList.toggle('hidden', !!fixe);
    boite.classList.toggle('hidden', !fixe);
    if (fixe) boite.querySelector('.dfixe').textContent = `${SENS_MOT[fixe]} — toujours, pour ce mot`;
  }

  /* ---------------- Copie des listes ---------------- */

  async function copier() {
    const blob = new Blob([C.serialize(C.actuel())], { type: 'application/json' });
    const nom = `listes-caisse-${new Date().toISOString().slice(0, 10)}.json`;
    let r = null;
    if (A.saveBlob) r = await A.saveBlob(blob, nom);
    else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = nom; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    }
    if (r === 'cancelled') return;
    message(null, 'ok', `Copie des listes enregistrée : <b>${escapeHtml(r || nom)}</b>. Gardez-la en lieu sûr ; « Remplacer par une copie… » la reprend, ici ou sur un autre PC.`);
  }

  async function reprendre(file) {
    let texte = '';
    try { texte = await file.text(); } catch (e) { texte = ''; }
    const lu = C.parse(texte);
    const r = C.resume(lu);
    if (!r.total) {
      message(null, 'err', "Ce fichier n'est pas une copie des listes (ou elle est vide) : rien n'a été changé.");
      return;
    }
    const ici = C.resume(C.actuel());
    if (ici.total && !window.confirm(
      `La copie porte ${plur(r.total, 'changement')} des listes ; ce PC en porte ${ici.total}.\n\n` +
      'Remplacer les changements de ce PC par ceux de la copie ?')) return;
    appliquer(lu, null, 'ok', `Copie reprise : ${plur(r.total, 'changement')}. Les listes sont à jour.`,
      { defaire: 'Reprise annulée : les listes sont revenues comme avant.' });
  }

  /* ---------------- Branchements ---------------- */

  hote.innerHTML = LISTES.map(carteHtml).join('');
  // le sens d'un type est un choix parmi trois : même liste déroulante que partout ailleurs
  const Combo = window.CaisseCombo;
  if (Combo) Combo.fromSelect($('d-types-sens'), { vide: "Entrée, sortie, ou selon la pièce : c'est tout." });

  panneau.addEventListener('click', (ev) => {
    const t = ev.target;
    const a = t.closest('[data-ajouter]');
    if (a) { ajouter(a.dataset.ajouter); return; }
    const d = t.closest('[data-retirer]');
    if (d) { retirer(d.dataset.retirer, d.dataset.valeur); return; }
    const b = t.closest('[data-remettre]');
    if (b) { remettre(b.dataset.remettre, b.dataset.valeur); return; }
    const m = t.closest('[data-modifier]');
    if (m) { modifier(m.dataset.modifier, m.dataset.valeur); return; }
    if (t.closest('[data-edit-ok]')) { enregistrerEdition(); return; }
    if (t.closest('[data-edit-non]')) { abandonnerEdition(); return; }
    if (t.closest('[data-annuler]')) { annuler(); return; }
    const k = t.closest('[data-garder]');
    if (k) { garderExistante(k.dataset.garder, k.dataset.valeur); return; }
    const f = t.closest('[data-forcer]');
    if (f) { ajouter(f.dataset.forcer, true); }
  });
  hote.addEventListener('keydown', (ev) => {
    if (ev.target.closest('#d-edit')) {
      const ligne = edition;
      if (ev.key === 'Enter') { ev.preventDefault(); Promise.resolve(enregistrerEdition()).then(() => rendreLaMain(ligne)); }
      else if (ev.key === 'Escape') { ev.preventDefault(); abandonnerEdition(); rendreLaMain(ligne); }
      return;
    }
    if (ev.key !== 'Enter') return;
    const champ = ev.target.closest('input[data-val], input[id$="-note"]');
    if (!champ) return;
    const carte = champ.closest('[data-carte]');
    if (!carte) return;
    ev.preventDefault();
    ajouter(carte.dataset.carte);
  });
  // Le champ d'ajout sert aussi à chercher : la liste se réduit à ce qui ressemble à ce qu'on tape
  hote.addEventListener('input', (ev) => {
    const f = ev.target.closest('input[data-val]');
    if (!f) return;
    const g = f.dataset.val;
    filtres[g] = f.value;
    marque = null;
    if (edition && edition.genre === g) edition = null;
    majSensFixe(g);
    rendreListe(listeDe(g));
  });

  if ($('btnDonneesCopie')) $('btnDonneesCopie').addEventListener('click', copier);
  if ($('btnDonneesReprendre')) $('btnDonneesReprendre').addEventListener('click', () => $('donneesFile').click());
  if ($('donneesFile')) {
    $('donneesFile').addEventListener('change', async (ev) => {
      const f = ev.target.files && ev.target.files[0];
      ev.target.value = '';
      if (f) await reprendre(f);
    });
  }

  /* ---------------- Démarrage ---------------- */

  (async function init() {
    let carnet = C.vide();
    try { carnet = await depot.charger(); } catch (e) { /* carnet illisible : on repart d'un carnet vide sans rien écraser */ }
    C.poser(carnet);
    pret = true;
    const ou = $('donneesOu');
    if (ou) {
      try {
        const l = await depot.ou();
        if (depot.kind === 'aucun') {
          ou.innerHTML = `<span style="color:var(--err)">Rien ne peut être gardé ici : ${escapeHtml(l)}.</span>`;
          ou.closest('details') && (ou.closest('details').open = true);
        } else if (depot.kind === 'fichiers') {
          ou.innerHTML = `Avec les registres de la caisse, dans le fichier <b>${escapeHtml(depot.fichier)}</b> de ce dossier : <code>${escapeHtml(l)}</code>`;
        } else {
          ou.textContent = `Dans ${l}. Enregistrez-en une copie de temps en temps : effacer les données du navigateur les effacerait.`;
        }
      } catch (e) { ou.textContent = ''; }
    }
    prevenir();
    rendre();
  })();

  // Le registre de l'année s'ouvre après nous : ses pièces disent quelles valeurs sont employées.
  window.CaisseDonnees = { rendre: () => { if (pret) rendre(); }, valeurs: (g) => valeurs(listeDe(g)) };
})();
