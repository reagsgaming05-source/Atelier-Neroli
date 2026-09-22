/*
 * L'espace « Données » : les listes de l'application, tenues à la main.
 *
 * Un écran, un travail : ici on ne saisit aucune pièce, on règle ce que les listes déroulantes
 * proposeront partout ailleurs. Cinq listes — comptes, classes, personnes, objets, types
 * d'écriture — avec, pour chacune, ce que l'application connaît déjà, ce qu'on y a ajouté, et ce
 * qu'on en a retiré. Tout est gardé sur ce PC (voir carnet.js) et rien n'en sort.
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
  if (!C || !hote) return;

  const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sansAccent = (t) => String(t == null ? '' : t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const plur = (n, mot, pluriel) => `${n} ${n > 1 ? (pluriel || mot + 's') : mot}`;

  const vocabBrut = () => (A.state && A.state.vocab) || window.CaisseVocab || {};
  const registre = () => (window.CaisseSaisie && window.CaisseSaisie.state && window.CaisseSaisie.state.reg) || null;
  const pieces = () => (registre() && registre().pieces) || [];

  /* ---------------- Les cinq listes ---------------- */
  /**
   * Pour chaque genre : ce que l'application propose d'elle-même (`base`), ce que la valeur vaut
   * dans une pièce (`champ`, pour compter les emplois de l'année) et l'ordre d'affichage.
   */
  const LISTES = [
    {
      genre: 'comptes',
      titre: 'Comptes comptables',
      icone: 'i-book',
      quoi: 'Le compte de contrepartie de la fiche, le compte caisse, et le compte de chaque pièce scannée.',
      exemple: '51000.3662.00',
      champ: (p) => p.compte,
      base: () => (vocabBrut().accounts || []),
      integres: () => ((window.CaisseVocab && window.CaisseVocab.accounts) || []),
      trier: (a, b) => String(a).localeCompare(String(b)),
      note: { libelle: 'À quoi il sert', exemple: 'ex. Camps et courses d\'école' },
      mono: true,
    },
    {
      genre: 'classes',
      titre: 'Classes',
      icone: 'i-users',
      quoi: 'Le champ « Classe » de la fiche, et la reconnaissance des classes dans les libellés lus.',
      exemple: '5P/3',
      champ: (p) => p.classe,
      base: () => (vocabBrut().classTokens || []),
      integres: () => ((window.CaisseVocab && window.CaisseVocab.classTokens) || []),
      trier: (a, b) => String(a).localeCompare(String(b), 'fr', { numeric: true }),
    },
    {
      genre: 'personnes',
      titre: 'Personnes',
      icone: 'i-users',
      quoi: 'Le champ « Personne » de la fiche et les deux visas du relevé de caisse.',
      exemple: 'A. Berger',
      champ: (p) => p.personne,
      base: () => (vocabBrut().persons || []),
      integres: () => ((window.CaisseVocabNoms && window.CaisseVocabNoms.persons) || []),
      trier: (a, b) => String(a).localeCompare(String(b), 'fr'),
    },
    {
      genre: 'objets',
      titre: 'Objets',
      icone: 'i-list',
      quoi: "L'objet de l'activité, qui entre dans le libellé et pèse sur le compte proposé.",
      exemple: 'Sortie au musée',
      champ: (p) => p.objet,
      base: () => (P.OBJET_LIST || []),
      integres: () => (P.OBJET_LIST || []),
      trier: null, // l'ordre de la liste intégrée dit quelque chose : « Autre » vient en dernier
    },
    {
      genre: 'types',
      titre: "Types d'écriture",
      icone: 'i-pen',
      quoi: "Le premier mot du libellé. Il commande le sens de l'écriture : dites-le en ajoutant un type.",
      exemple: 'SUBVENTION',
      champ: (p) => p.type,
      base: () => (R.TYPES || []),
      integres: () => (R.TYPES || []),
      trier: null,
      sens: true,
    },
  ];
  const listeDe = (genre) => LISTES.find((l) => l.genre === genre);

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
        sens: C.sensDeType(carnet, v),
      });
    };
    for (const v of l.base()) pousser(v);
    for (const p of pieces()) pousser(l.champ(p));
    for (const a of C.ajoutsDe(carnet, l.genre)) pousser(a.valeur);
    if (l.trier) out.sort((a, b) => l.trier(a.valeur, b.valeur));
    return out;
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
  /** De quoi écrire « elle apparaît » pour une classe et « il apparaît » pour un compte. */
  const PRONOM = { comptes: 'il', classes: 'elle', personnes: 'ce nom', objets: 'il', types: 'il' };
  const ORIGINE = {
    ajout: { texte: 'ajouté', titre: 'Ajouté ici, gardé sur ce PC' },
    base: { texte: 'intégré', titre: "Connu de l'application depuis la base de référence" },
    appris: { texte: 'appris', titre: "Vu dans un classeur repris, une pièce scannée ou une saisie" },
  };

  function carteHtml(l) {
    const g = l.genre;
    const champNote = l.note
      ? `<div class="field" style="flex:1;min-width:200px"><label for="d-${g}-note">${escapeHtml(l.note.libelle)} <span class="legend">(facultatif)</span></label><input type="text" id="d-${g}-note" placeholder="${escapeHtml(l.note.exemple)}"></div>`
      : '';
    const champSens = l.sens
      ? `<div class="field"><label for="d-${g}-sens">Sens de l'écriture</label><select id="d-${g}-sens" style="height:36px">` +
        '<option value="">selon la pièce</option><option value="debit">entrée en caisse (débit)</option><option value="credit">sortie de caisse (crédit)</option>' +
        '</select></div>'
      : '';
    return `<section class="card" data-carte="${g}">
  <h2><svg class="ico"><use href="#${l.icone}"/></svg> ${escapeHtml(l.titre)} <span class="legend" data-compteur="${g}"></span></h2>
  <p class="legend">${escapeHtml(l.quoi)}</p>
  <div class="row">
    <div class="field"><label for="d-${g}-val">Ajouter</label><input type="text" id="d-${g}-val" data-val="${g}" placeholder="${escapeHtml(l.exemple)}"${l.mono ? ' style="font-family:var(--mono);font-size:13px;width:170px"' : ''}></div>
    ${champNote}${champSens}
    <button type="button" class="small primary" data-ajouter="${g}" style="align-self:flex-end;height:36px"><svg class="ico"><use href="#i-plus"/></svg> Ajouter</button>
  </div>
  <div data-msg="${g}"></div>
  <div class="dfiltre hidden" data-boite-filtre="${g}">
    <svg class="ico"><use href="#i-search"/></svg>
    <input type="search" data-filtre="${g}" placeholder="Filtrer la liste…" autocomplete="off" aria-label="Filtrer ${escapeHtml(l.titre.toLowerCase())}">
  </div>
  <div class="dliste" data-liste="${g}"></div>
  <div data-retires="${g}"></div>
</section>`;
  }

  const filtres = {};

  function rendreListe(l) {
    const g = l.genre;
    const boite = hote.querySelector(`[data-liste="${g}"]`);
    if (!boite) return;
    const tout = valeurs(l);
    const use = g === 'comptes' ? usages() : null;
    const q = sansAccent(filtres[g] || '').trim();
    const montres = q ? tout.filter((x) => sansAccent(`${x.valeur} ${x.note || ''} ${(use && use.get(x.valeur)) || ''}`).includes(q)) : tout;

    const compteur = hote.querySelector(`[data-compteur="${g}"]`);
    const ajoutes = tout.filter((x) => x.origine === 'ajout').length;
    if (compteur) {
      compteur.textContent = `${plur(tout.length, 'valeur')}${ajoutes ? ` · ${ajoutes} de vous` : ''}`;
    }
    const filtre = hote.querySelector(`[data-boite-filtre="${g}"]`);
    if (filtre) filtre.classList.toggle('hidden', tout.length <= 12);

    if (!montres.length) {
      boite.innerHTML = `<div class="dvide">${q ? 'Rien dans cette liste ne correspond au filtre.' : 'Cette liste est vide.'}</div>`;
    } else {
      boite.innerHTML = montres.map((x) => {
        const o = ORIGINE[x.origine];
        const detail = x.note || (use && use.get(x.valeur)) || '';
        const sens = x.sens ? SENS_MOT[x.sens] : '';
        return `<div class="dligne">
  <span class="dval${l.mono ? ' mono' : ''}">${escapeHtml(x.valeur)}</span>
  <span class="dorig ${x.origine}" title="${escapeHtml(o.titre)}">${o.texte}</span>
  ${detail ? `<span class="ddetail">${escapeHtml(detail)}</span>` : ''}
  ${sens ? `<span class="ddetail">${escapeHtml(sens)}</span>` : ''}
  <span class="dspacer"></span>
  ${x.n ? `<span class="dn" title="Pièces de l'année ouverte qui s'en servent">${x.n}×</span>` : ''}
  <button type="button" class="small ghost" data-retirer="${g}" data-valeur="${escapeHtml(x.valeur)}" title="Retirer des listes (les pièces déjà enregistrées n'y perdent rien)"><svg class="ico sm"><use href="#i-x"/></svg></button>
</div>`;
      }).join('');
      if (q && montres.length < tout.length) {
        boite.insertAdjacentHTML('beforeend', `<div class="dvide">${plur(tout.length - montres.length, 'autre valeur', 'autres valeurs')} hors du filtre.</div>`);
      }
    }

    const retires = C.retiresDe(C.actuel(), g);
    const boiteR = hote.querySelector(`[data-retires="${g}"]`);
    if (boiteR) {
      boiteR.innerHTML = retires.length
        ? `<div class="dretires"><b>${plur(retires.length, 'valeur retirée', 'valeurs retirées')} des listes</b> ` +
          `<span class="legend">— elles ne sont plus proposées ; les pièces déjà enregistrées les gardent.</span><div class="dchips">` +
          retires.map((v) => `<button type="button" class="dchip" data-remettre="${g}" data-valeur="${escapeHtml(v)}" title="Remettre dans les listes">${escapeHtml(v)} <svg class="ico sm"><use href="#i-refresh"/></svg></button>`).join('') +
          '</div></div>'
        : '';
    }
  }

  function rendre() {
    for (const l of LISTES) rendreListe(l);
    const r = C.resume(C.actuel());
    const info = $('donneesResume');
    if (info) {
      info.innerHTML = r.total
        ? `Le carnet porte <b>${plur(C.GENRES.reduce((n, g) => n + r[g].ajoutes, 0), 'ajout')}</b> et ` +
          `<b>${plur(C.GENRES.reduce((n, g) => n + r[g].retires, 0), 'retrait')}</b>.`
        : "Le carnet est vide : les listes sont celles que l'application connaît d'elle-même.";
    }
  }

  function message(genre, kind, texte) {
    const boite = hote.querySelector(`[data-msg="${genre}"]`);
    if (!boite) return;
    boite.innerHTML = `<div class="notice ${kind}">${texte}</div>`;
    const n = boite.firstChild;
    setTimeout(() => { if (n && n.parentNode === boite) n.remove(); }, kind === 'err' ? 9000 : 6000);
  }

  /* ---------------- Modifications ---------------- */

  /** Enregistre le carnet, puis remet d'accord toutes les listes de l'application. */
  async function appliquer(carnet, genre, kind, texte) {
    C.poser(carnet);
    try {
      await depot.enregistrer(carnet);
    } catch (e) {
      message(genre, 'err', `Le carnet n'a pas pu être enregistré : ${escapeHtml(e && e.message ? e.message : String(e))}. La modification vaut pour cette séance seulement.`);
      rendre();
      prevenir();
      return;
    }
    rendre();
    prevenir();
    if (texte) message(genre, kind || 'ok', texte);
  }

  /** Les listes déroulantes, les listes de secours et les comptes proposés relisent le carnet. */
  function prevenir() {
    if (A.majDonnees) { try { A.majDonnees(); } catch (e) { /* ignore */ } }
    const S = window.CaisseSaisie;
    if (S && S.majListes) { try { S.majListes(); } catch (e) { /* ignore */ } }
  }

  function ajouter(genre) {
    const l = listeDe(genre);
    if (!l) return;
    const champ = $(`d-${genre}-val`);
    const note = l.note ? $(`d-${genre}-note`) : null;
    const sens = l.sens ? $(`d-${genre}-sens`) : null;
    const brut = champ ? champ.value : '';
    const extra = {};
    if (note && note.value.trim()) extra.note = note.value;
    if (sens && sens.value) extra.sens = sens.value;

    // déjà dans les listes : le dire plutôt que de faire semblant d'ajouter
    const propre = C.normaliser(genre, brut);
    if (propre && !C.retiresDe(C.actuel(), genre).some((x) => sansAccent(x) === sansAccent(propre))) {
      const deja = valeurs(l).find((x) => sansAccent(x.valeur) === sansAccent(propre));
      if (deja && deja.origine !== 'ajout') {
        message(genre, 'warn', `<b>${escapeHtml(deja.valeur)}</b> est déjà dans la liste (${ORIGINE[deja.origine].texte}) : rien à ajouter.`);
        if (champ) { champ.value = ''; champ.focus(); }
        return;
      }
    }

    const res = C.ajouter(C.actuel(), genre, brut, extra);
    if (!res.ok) { message(genre, 'err', escapeHtml(res.message)); return; }
    if (champ) { champ.value = ''; champ.focus(); }
    if (note) note.value = '';
    if (sens) { sens.value = ''; if (Combo) Combo.syncAll(); }
    const quoi = `<b>${escapeHtml(res.valeur)}</b>`;
    const texte = res.avertissement
      ? `${quoi} ajouté. ${escapeHtml(res.avertissement)}`
      : `${quoi} ${res.deja ? 'mis à jour' : (genre === 'classes' ? 'ajoutée' : 'ajouté')} : ${PRONOM[genre]} apparaît maintenant dans les listes.`;
    appliquer(res.carnet, genre, res.avertissement ? 'warn' : 'ok', texte);
  }

  function retirer(genre, valeur) {
    const l = listeDe(genre);
    if (!l) return;
    const n = pieces().filter((p) => sansAccent(l.champ(p)) === sansAccent(valeur)).length;
    if (n && !window.confirm(
      `${valeur} est employé par ${plur(n, 'pièce')} du registre ouvert.\n\n` +
      'Le retirer ne change aucune de ces pièces : elles gardent leur libellé, leur compte et leur montant. ' +
      "Seules les listes déroulantes cessent de le proposer.\n\nLe retirer quand même ?")) return;
    const res = C.retirer(C.actuel(), genre, valeur);
    if (!res.ok) return;
    const e = genre === 'classes' ? 'e' : '';
    appliquer(res.carnet, genre, 'ok', `<b>${escapeHtml(res.valeur)}</b> retiré${e} des listes. Vous pouvez ${genre === 'classes' ? 'la' : 'le'} remettre en bas de cette carte.`);
  }

  function remettre(genre, valeur) {
    const res = C.remettre(C.actuel(), genre, valeur);
    if (!res.ok) return;
    appliquer(res.carnet, genre, 'ok', `<b>${escapeHtml(valeur)}</b> est de nouveau proposé dans les listes.`);
  }

  /* ---------------- Copie du carnet ---------------- */

  async function copier() {
    const blob = new Blob([C.serialize(C.actuel())], { type: 'application/json' });
    const nom = `donnees-caisse-${new Date().toISOString().slice(0, 10)}.json`;
    if (A.saveBlob) await A.saveBlob(blob, nom);
    else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = nom; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    }
  }

  async function reprendre(file) {
    let texte = '';
    try { texte = await file.text(); } catch (e) { texte = ''; }
    const lu = C.parse(texte);
    const r = C.resume(lu);
    if (!r.total) {
      message('comptes', 'err', "Ce fichier ne contient aucune donnée reconnaissable : le carnet n'a pas été touché.");
      return;
    }
    const ici = C.resume(C.actuel());
    if (ici.total && !window.confirm(
      `Le fichier porte ${plur(r.total, 'entrée')}.\n` +
      `Le carnet de ce PC en porte ${ici.total}.\n\n` +
      'Reprendre le fichier remplace entièrement le carnet de ce PC. Continuer ?')) return;
    appliquer(lu, 'comptes', 'ok', `Carnet repris : ${r.total} entrée(s). Les listes sont à jour.`);
  }

  /* ---------------- Branchements ---------------- */

  hote.innerHTML = LISTES.map(carteHtml).join('');
  // le sens d'un type est un choix parmi trois : même liste déroulante que partout ailleurs
  const Combo = window.CaisseCombo;
  if (Combo) Combo.fromSelect($('d-types-sens'), { vide: "Entrée, sortie, ou selon la pièce : c'est tout." });

  hote.addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-ajouter]');
    if (a) { ajouter(a.dataset.ajouter); return; }
    const d = ev.target.closest('[data-retirer]');
    if (d) { retirer(d.dataset.retirer, d.dataset.valeur); return; }
    const b = ev.target.closest('[data-remettre]');
    if (b) { remettre(b.dataset.remettre, b.dataset.valeur); }
  });
  hote.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    const champ = ev.target.closest('input[data-val], input[id$="-note"]');
    if (!champ) return;
    const carte = champ.closest('[data-carte]');
    if (!carte) return;
    ev.preventDefault();
    ajouter(carte.dataset.carte);
  });
  hote.addEventListener('input', (ev) => {
    const f = ev.target.closest('input[data-filtre]');
    if (!f) return;
    filtres[f.dataset.filtre] = f.value;
    rendreListe(listeDe(f.dataset.filtre));
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
        ou.innerHTML = depot.kind === 'aucun'
          ? `<span style="color:var(--err)">Rien ne peut être gardé ici : ${escapeHtml(l)}.</span>`
          : `Gardé dans ${depot.kind === 'fichiers' ? 'les fichiers de l\'application' : 'la mémoire de ce navigateur'} : <code>${escapeHtml(l)}</code>`;
      } catch (e) { ou.textContent = ''; }
    }
    prevenir();
    rendre();
  })();

  // Le registre de l'année s'ouvre après nous : ses pièces disent quelles valeurs sont employées.
  window.CaisseDonnees = { rendre: () => { if (pret) rendre(); }, valeurs: (g) => valeurs(listeDe(g)) };
})();
