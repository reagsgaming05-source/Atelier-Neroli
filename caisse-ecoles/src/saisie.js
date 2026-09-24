/*
 * Saisie des pièces comptables : fiche « PIÈCE COMPTABLE » remplie dans l'application,
 * registre par année (solde à nouveau, pièces, justificatifs), journal avec solde cumulé,
 * fichier Excel de l'année et PDF des pièces (fiche + justificatifs).
 * Dépend de window.CaisseParser, CaisseRegistre, CaissePdf, CaisseExcel, CaisseApp (aides).
 */
(function () {
  'use strict';

  const P = window.CaisseParser;
  const R = window.CaisseRegistre;
  const X = window.CaisseExcel;
  const F = window.CaissePdf;
  const A = window.CaisseApp || {};
  const $ = (id) => document.getElementById(id);
  const els = {};
  for (const id of ['regYear', 'btnNewYear', 'regOpeningDate', 'regOpeningAmount', 'regCaisse', 'regVisaResp', 'regVisaBours', 'regInfo', 'btnRegOpenDir',
    'ficheTitle', 'pNo', 'pDate', 'pType', 'pObjet', 'pClasse', 'pPeriode', 'pDetail', 'pPersonne', 'pLibelle', 'pLibelleEdit', 'pCompte', 'pCompteSugg',
    'pMontant', 'pSensDebit', 'pSensCredit', 'pSensHint', 'pFiles', 'pFilesList', 'ficheErrors', 'btnPieceSave', 'btnPieceNew', 'btnPiecePreview', 'fichePreview', 'fichePreviewTitre', 'ficheFrame', 'btnPreviewClose', 'dgeoPending', 'btnOpenDgeo',
    'journalYear', 'journalBody', 'journalTotals', 'journalPending', 'journalSearch', 'journalOnlyDoubt', 'journalCount', 'journalNumbers', 'yearBar', 'anneeNotices', 'btnRegExcel', 'btnRegPdf', 'regPdfFrom', 'btnRegExport', 'regImportFile', 'btnRegImport', 'btnRegExcelIn', 'regExcelFile', 'regNotices', 'regClassList', 'regPersonList', 'regAccountList',
    'pObjetField', 'pKindField', 'pKind', 'pAFaireField', 'pAFaire', 'recapYear', 'recapFilter', 'btnRecapAll', 'btnRecapNone', 'recapSummary', 'recapBody', 'btnRecapPdf', 'recapHint', 'optPdfAuto', 'optPdfAutoJust']) {
    els[id] = $(id);
  }
  if (!els.regYear) return; // page sans le panneau de saisie

  // photo : la fiche telle qu'elle a été remplie (voir photoFiche) ; retires : justificatifs déjà
  // enregistrés que la personne a retirés, effacés seulement quand elle enregistre la pièce
  const state = { storage: null, reg: null, editingId: null, pending: [], retires: new Set(), photo: null, years: [], previewUrl: null, dgeo: { list: [], current: null } };

  const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /** Accord au pluriel des compteurs affichés en permanence : « 1 pièce », « 5 pièces ». */
  const plur = (n, mot, pluriel) => `${n} ${n > 1 ? (pluriel || mot + 's') : mot}`;
  const fmtCHF = (n) => { const v = Number(n) || 0; const [i, d] = v.toFixed(2).split('.'); return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, "'")}.${d}`; };
  /** Les messages s'affichent sur la page regardée : sinon un message de restauration partait
   *  sur la page de saisie pendant qu'on est dans « L'année ». */
  function noticeBox() {
    const annee = document.getElementById('panelAnnee');
    if (els.anneeNotices && annee && !annee.classList.contains('hidden')) return els.anneeNotices;
    return els.regNotices;
  }
  function notice(kind, html, opts) {
    const div = document.createElement('div');
    div.className = `notice ${kind}`;
    div.innerHTML = html;
    noticeBox().prepend(div);
    // opts.keep : message qui contient un bouton à cliquer (fiche PDF bloquée) — il reste affiché
    if (!(opts && opts.keep)) setTimeout(() => div.remove(), kind === 'err' ? 12000 : 7000);
  }
  async function saveBlob(blob, name) {
    if (A.saveBlob) return A.saveBlob(blob, name);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    return null;
  }
  // Le vocabulaire vu à travers le carnet des données (espace « Données ») : ce qu'on y a ajouté
  // s'y trouve, ce qu'on en a retiré n'y est plus.
  const vocab = () => (A.vocabActif && A.vocabActif()) || (A.state && A.state.vocab) || window.CaisseVocab || P.emptyVocabulary();
  const C = window.CaisseCombo;
  const K = window.CaisseCarnet || null;
  /** Vrai/faux : cette valeur a-t-elle encore sa place dans les listes ? */
  const garde = (genre) => (K ? K.garde(K.actuel(), genre) : () => true);
  /** Les listes fermées, carnet compris : un type ou un objet ajouté doit pouvoir être choisi. */
  const TYPES = () => (K ? K.fusionner(R.TYPES, K.actuel(), 'types') : R.TYPES);
  const OBJETS = () => (K ? K.fusionner(P.OBJET_LIST, K.actuel(), 'objets') : P.OBJET_LIST);
  /**
   * Le sens d'un type d'écriture : la logique des libellés d'abord (elle fait règle), puis ce qui
   * a été déclaré en ajoutant le type dans l'espace « Données » — un type nouveau n'a que cela.
   */
  const sensDe = (type) => R.sensFor(type) || (K ? K.sensDeType(K.actuel(), type) : null);

  /* ---------------- Registre ---------------- */
  async function init() {
    state.storage = R.storage();
    if (!state.storage) { els.regInfo.textContent = 'Stockage indisponible dans ce navigateur.'; return; }
    fillLists();
    brancherCombos();
    state.years = await state.storage.years();
    const thisYear = new Date().getFullYear();
    let year = state.years.length ? Math.max.apply(null, state.years) : thisYear;
    try { const saved = Number(localStorage.getItem('caisse.registre.annee')); if (saved && state.years.includes(saved)) year = saved; } catch (e) { /* ignore */ }
    await openYear(year);
    initDgeo();
  }

  /** Classes et personnes connues, du classeur de référence et de l'année en cours. */
  function connus(cle) {
    const v = vocab();
    const vus = new Set((v[cle === 'classe' ? 'classTokens' : 'persons'] || []).filter(Boolean));
    for (const p of (state.reg && state.reg.pieces) || []) {
      const x = cle === 'classe' ? p.classe : p.personne;
      if (x) vus.add(x);
    }
    // une valeur retirée ne doit pas revenir par les pièces de l'année
    const ok = garde(cle === 'classe' ? 'classes' : 'personnes');
    return Array.from(vus).filter(ok).sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
  }

  /** Les listes déroulantes de la fiche et des réglages de l'année. */
  function brancherCombos() {
    if (!C) return;
    const NIVEAU = ['pour ce type, cet objet et ce degré', 'pour ce type et cet objet', 'pour ce type'];
    const comptes = () => choixDeComptes(formPiece()).filter((c) => garde('comptes')(c.compte)).map((c) => ({
      value: c.compte,
      hint: decrireCompte(c, els.pType.value),
      note: c.n ? `${c.n}×` : '',
      fort: c.niveau <= 1,
      // le survol dit pourquoi ce compte est proposé si haut
      titre: c.niveau < 3 ? `${c.n} écriture(s) ${NIVEAU[c.niveau]}` : 'compte connu du classeur',
    }));
    C.attach(els.pCompte, comptes, { classe: 'combo-comptes', vide: 'Aucun compte connu ne correspond. Le numéro tapé sera gardé tel quel.', onPick: () => { state.autoAccount = false; refreshSuggestions(); } });
    C.attach(els.pClasse, () => connus('classe').map((x) => ({ value: x })), { vide: 'Aucune classe connue ne correspond.' });
    C.attach(els.pPersonne, () => connus('personne').map((x) => ({ value: x })), { vide: 'Aucun nom connu ne correspond.' });
    // le compte caisse est un compte comme un autre : même liste, sans le tri par pertinence
    const tousComptes = () => (vocab().accounts || []).slice().sort().map((x) => ({ value: x, hint: usageBrut(x) }));
    // (vocab() porte déjà les ajouts du carnet et plus les retraits : rien à filtrer ici)
    C.attach(els.regCaisse, tousComptes, { vide: 'Aucun compte connu ne correspond.' });
    // les deux signataires du relevé sont des personnes : même liste que la fiche
    const personnes = () => connus('personne').map((x) => ({ value: x }));
    C.attach(els.regVisaResp, personnes, { vide: 'Aucun nom connu ne correspond. Ce que vous tapez sera gardé.' });
    C.attach(els.regVisaBours, personnes, { vide: 'Aucun nom connu ne correspond. Ce que vous tapez sera gardé.' });

    // Listes fermées : un type ou un objet inventé n'aurait ni sens, ni compte habituel, ni
    // libellé correct. Le champ filtre et se parcourt comme les autres, mais revient à la
    // dernière valeur connue si ce qui est tapé n'existe pas.
    const SENS = { debit: 'entrée en caisse', credit: 'sortie de caisse' };
    C.fromSelect(els.pType, {
      items: () => TYPES().map((t) => ({ value: t, hint: SENS[sensDe(t)] || 'selon la pièce' })),
      vide: "Aucun type ne correspond. Les types s'ajoutent dans l'espace « Données ».",
    });
    C.fromSelect(els.pObjet, { vide: "Aucun objet ne correspond. Les objets s'ajoutent dans l'espace « Données »." });
    C.fromSelect(els.regYear, { vide: 'Aucune année ne correspond.' });
    // « toutes les pièces » ou « depuis le n° X » : une entrée par pièce, donc une liste qui défile
    C.fromSelect(els.regPdfFrom, { vide: 'Aucun numéro ne correspond.' });
  }

  /** Les comptes proposables pour la pièce, avec des exemples tirés aussi de l'année d'avant. */
  const choixDeComptes = (p) => R.accountChoices(p, vocab(), state.reg, { pieces: state.piecesAvant || [] });
  /**
   * Ce qui distingue un compte d'un autre, en clair : ce qu'on en a noté dans l'espace Données,
   * sinon les objets pour lesquels il a servi avec ce type (« Repas, Matériel »), sinon son usage
   * habituel ; et un exemple réel. Presque tous les comptes d'un remboursement s'affichaient
   * « REMBOURSEMENT » : on gardait le compte proposé faute de pouvoir choisir.
   */
  function decrireCompte(c, type) {
    let quoi = K ? K.noteDe(K.actuel(), 'comptes', c.compte) : '';
    if (!quoi && c.objets) {
      quoi = c.objets.length ? c.objets.slice(0, 3).join(', ') : 'objet jamais précisé';
      // un compte surtout employé pour un autre type le dit : 51000.3662.00 n'est pas « Repas »
      if (c.usage && type && c.usage.split(' · ')[0] !== type) quoi += ` (surtout ${c.usage})`;
    }
    if (!quoi) quoi = c.usage;
    return [quoi, c.exemple ? `ex. ${c.exemple}` : ''].filter(Boolean).join(' — ');
  }

  /** À quoi sert un compte, sans pièce en cours pour peser la pertinence. */
  function usageBrut(compte) {
    const faux = { type: '', objet: 'Autre', classe: '', detail: '' };
    const x = R.accountChoices(faux, vocab(), state.reg).find((c) => c.compte === compte);
    return x ? x.usage : '';
  }

  function fillLists() {
    const v = vocab();
    const setList = (el, items) => { if (el) el.innerHTML = items.map((x) => `<option value="${escapeHtml(x)}">`).join(''); };
    setList(els.regClassList, (v.classTokens || []).slice().sort((a, b) => a.localeCompare(b, 'fr', { numeric: true })));
    setList(els.regPersonList, (v.persons || []).slice().sort((a, b) => a.localeCompare(b, 'fr')));
    setList(els.regAccountList, (v.accounts || []).slice().sort());
    remplirSelect(els.pType, TYPES());
    remplirSelect(els.pObjet, OBJETS());
  }

  /**
   * Refait les options d'une liste fermée en gardant la valeur en place. Cette valeur peut ne plus
   * être dans la liste — un objet retiré de l'espace « Données » alors qu'une pièce ouverte le
   * porte : elle est alors conservée en queue, sans quoi la fiche affichée changerait toute seule.
   */
  function remplirSelect(el, valeurs) {
    if (!el) return;
    const avant = el.value;
    const liste = avant && valeurs.indexOf(avant) < 0 ? valeurs.concat([avant]) : valeurs;
    el.innerHTML = liste.map((x) => `<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join('');
    el.value = avant;
  }

  /** Le carnet des données a changé : les listes de cet espace le relisent. */
  function majListes() {
    fillLists();
    if (C) C.syncAll();
    refreshSuggestions();
  }

  async function openYear(year) {
    // un registre enregistré mais illisible (fichier abîmé) ne doit jamais être remplacé par un registre vide
    const stored = state.storage.loadStored ? await state.storage.loadStored(year) : { reg: await state.storage.load(year) };
    if (stored.error) {
      notice('err', `Le registre ${year} est enregistré mais illisible (fichier abîmé). Il n'a pas été remplacé : restaurez une sauvegarde (« Restaurer… ») ` +
        'ou, dans l\'application fenêtrée, reprenez le fichier <code>registre.bak.json</code> du dossier des données.');
      els.regYear.value = String(state.reg ? state.reg.annee : year);
      return;
    }
    let reg = stored.reg;
    if (!reg) {
      const prev = state.years.filter((y) => y < year).sort().pop();
      const prevReg = prev ? await state.storage.load(prev) : null;
      const opening = prevReg ? R.journal(prevReg).end : 0;
      reg = R.emptyRegister(year, { caisse: (A.getCaisse && A.getCaisse()) || undefined, openingDate: `${year}-01-01`, openingAmount: opening });
      await state.storage.save(reg);
      if (!state.years.includes(year)) state.years.push(year);
      state.years.sort();
    }
    state.reg = reg;
    try { localStorage.setItem('caisse.registre.annee', String(year)); } catch (e) { /* ignore */ }
    renderYears();
    els.regOpeningDate.value = reg.opening.date || '';
    els.regOpeningAmount.value = fmtCHF(reg.opening.amount);
    els.regCaisse.value = reg.caisse;
    els.journalYear.textContent = String(reg.annee);
    const loc = await state.storage.location();
    els.regInfo.innerHTML = state.storage.kind === 'fichiers'
      ? `Enregistré dans les fichiers de l'application : <code>${escapeHtml(loc)}</code>`
      : `Enregistré dans la ${escapeHtml(loc)}.`;
    if (els.btnRegOpenDir) els.btnRegOpenDir.classList.toggle('hidden', state.storage.kind !== 'fichiers');
    newPiece();
    renderJournal();
    if (window.CaisseComptage) window.CaisseComptage.render();
    notifyRegister();
  }

  function renderYears() {
    const years = state.years.slice().sort();
    els.regYear.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join('');
    if (state.reg) els.regYear.value = String(state.reg.annee);
    if (C) C.syncAll();
  }

  async function saveReg() {
    state.reg.updatedAt = new Date().toISOString();
    let res;
    try {
      res = await state.storage.save(state.reg);
    } catch (e) {
      // Le dire, puis laisser tomber l'action : sinon la fiche annonçait « Pièce enregistrée »
      // alors que rien n'était écrit. Avec les données sur le serveur, un réseau coupé n'est plus
      // un cas d'école.
      notice('err', `<b>Registre non enregistré</b> : ${escapeHtml((e && e.message) || e)}. Ce qui est à l'écran est gardé ; réessayez dans un instant.`, { keep: true });
      throw e;
    }
    const f = res && res.fusion;
    if (f) {
      // Un autre poste avait écrit dans cette année entre-temps : son travail est repris, pas écrasé.
      const parts = [`Un autre poste avait modifié le registre ${state.reg.annee} entre-temps : ${plur(f.reprises, 'changement')} de sa part ${f.reprises > 1 ? 'ont été repris' : 'a été repris'}, rien n'est perdu.`];
      if (f.doublons.length) parts.push(`<b>Deux pièces portent le même numéro</b> (${f.doublons.map((n) => `n° ${n}`).join(', ')}) : chaque poste a pris « le suivant ». Renumérotez l'une des deux.`);
      const vraies = f.conflits.filter((c) => c.quoi === 'pièce' && c.no != null);
      if (vraies.length) parts.push(`Modifiée des deux côtés : ${vraies.map((c) => `n° ${c.no}`).join(', ')} — la version la plus récente a été gardée, vérifiez-la.`);
      notice(f.doublons.length || vraies.length ? 'warn' : 'ok', parts.join(' '), { keep: !!(f.doublons.length || vraies.length) });
      try { renderJournal(); } catch (e) { /* l'appelant rafraîchit aussi */ }
    }
    notifyRegister();
  }
  /** Le registre a changé (ouvert, enregistré) : l'espace des pièces scannées, qui s'appuie dessus, se met à jour. */
  function notifyRegister() {
    try { document.dispatchEvent(new CustomEvent('caisse:registre', { detail: { annee: state.reg ? state.reg.annee : null } })); } catch (e) { /* ignore */ }
  }

  els.regYear.addEventListener('change', () => openYear(Number(els.regYear.value)));
  // Nouvelle année : petit formulaire en ligne (window.prompt n'existe pas dans l'application fenêtrée)
  const yearBox = $('newYearBox');
  const yearInput = $('newYearInput');
  function hideYearBox() { if (yearBox) yearBox.classList.add('hidden'); }
  async function createYear() {
    const y = Number(yearInput.value);
    if (!Number.isInteger(y) || y < 1990 || y > 2100) { notice('err', 'Année invalide : indiquez une année entre 1990 et 2100.'); return; }
    hideYearBox();
    const existed = state.years.includes(y);
    await openYear(y);
    notice('ok', existed ? `Registre ${y} ouvert (il existait déjà).` : `Registre ${y} créé. Le solde à nouveau proposé est le solde final de l'année précédente : vérifiez-le.`);
  }
  els.btnNewYear.addEventListener('click', () => {
    if (!yearBox || !yearInput) return;
    yearInput.value = String((state.years.length ? Math.max.apply(null, state.years) : new Date().getFullYear()) + 1);
    yearBox.classList.remove('hidden');
    yearInput.focus();
    yearInput.select();
  });
  if (yearBox) {
    $('btnNewYearOk').addEventListener('click', createYear);
    $('btnNewYearCancel').addEventListener('click', hideYearBox);
    yearInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); createYear(); } else if (ev.key === 'Escape') hideYearBox(); });
  }
  els.regOpeningDate.addEventListener('change', async () => { state.reg.opening.date = els.regOpeningDate.value; await saveReg(); renderJournal(); });
  els.regOpeningAmount.addEventListener('change', async () => {
    // Un texte illisible ne doit pas devenir 0 : le solde à nouveau de l'année serait effacé
    // sans rien dire, et tout le journal recalculé par-dessus.
    const v = R.parseAmountInput(els.regOpeningAmount.value);
    if (v == null) {
      notice('err', `« ${escapeHtml(els.regOpeningAmount.value)} » n'est pas un montant : le solde à nouveau n'a pas été modifié.`);
      els.regOpeningAmount.value = fmtCHF(state.reg.opening.amount);
      return;
    }
    state.reg.opening.amount = v; await saveReg(); renderJournal();
  });
  els.regCaisse.addEventListener('change', async () => { state.reg.caisse = els.regCaisse.value.trim() || P.DEFAULT_CAISSE; await saveReg(); renderYearBar(); });
  // Les deux signataires du relevé de caisse : ils vivent dans le registre (données locales de
  // l'année), jamais dans le code — le dépôt est public.
  for (const [el, cle] of [[els.regVisaResp, 'responsable'], [els.regVisaBours, 'boursier']]) {
    if (!el) continue;
    el.addEventListener('change', async () => {
      if (!state.reg.visas) state.reg.visas = { responsable: '', boursier: '' };
      state.reg.visas[cle] = el.value.trim();
      await saveReg();
    });
  }
  if (els.btnRegOpenDir) els.btnRegOpenDir.addEventListener('click', () => { if (window.CaisseFiles) window.CaisseFiles.openDir(); });

  /* ---------------- Fiche ---------------- */
  function newPiece() {
    const p = R.newPiece(state.reg);
    const force = $('pSensForce');
    if (force) force.checked = false; // la case « forcer le sens » ne reste pas cochée d'une pièce à l'autre
    state.editingId = null;
    state.pending = [];
    state.retires = new Set();
    state.dgeo.current = null;
    fillForm(p);
    els.ficheTitle.textContent = `n° ${p.no}`;
    montrerErreurs([]);
    afficherMode();
    hidePreview();
  }

  /**
   * La fiche, champ par champ, telle qu'on la voit. Comparée à celle prise au remplissage (pièce
   * neuve, pièce ouverte pour modification, décompte repris), elle dit si la personne y a
   * touché : « Nouvelle pièce », le crayon d'une autre ligne ou la fermeture de la fenêtre
   * effaçaient sans prévenir une fiche à moitié remplie.
   */
  function photoFiche() {
    return [els.pNo.value.trim(), els.pDate.value, els.pType.value, els.pObjet.value, els.pClasse.value.trim(), els.pPeriode.value.trim(),
      els.pDetail.value.trim(), els.pPersonne.value.trim(), els.pCompte.value.trim(), els.pMontant.value.trim(),
      els.pSensDebit.checked, els.pSensCredit.checked, els.pLibelleEdit.checked ? els.pLibelle.value.trim() : '',
      !!(els.pAFaire && els.pAFaire.checked)];
  }
  function retenirPhoto() { state.photo = photoFiche(); }
  /**
   * Vrai si la fiche porte une saisie qui n'est pas enregistrée : un champ changé, un justificatif
   * choisi mais pas encore enregistré, ou un justificatif enregistré que l'on a retiré.
   */
  function ficheModifiee() {
    if (!state.reg || !state.photo) return false;
    return state.pending.length > 0 || state.retires.size > 0 || JSON.stringify(photoFiche()) !== JSON.stringify(state.photo);
  }
  /**
   * Avant de remplacer la fiche : si elle porte une saisie non enregistrée, on demande. La
   * question se lit avec les deux boutons de la boîte : OK abandonne, Annuler revient à la fiche.
   */
  function abandonnerFiche() {
    if (!ficheModifiee()) return true;
    const quoi = state.editingId
      ? `Les changements de la pièce n° ${pieceEnCours() ? pieceEnCours().no : '?'} ne sont pas enregistrés.`
      : `La fiche n° ${els.pNo.value.trim() || '?'} n'est pas enregistrée.`;
    return confirm(`${quoi}\n\nAbandonner ce qui a été tapé ?\n\nOK : abandonner.   Annuler : revenir à la fiche.`);
  }
  const pieceEnCours = () => (state.editingId ? state.reg.pieces.find((x) => x.id === state.editingId) : null);

  /**
   * Modifier une pièce du journal doit se voir : un « (modification) » gris à côté du n° ne
   * suffisait pas, le bouton disait toujours « Enregistrer la pièce → journal » (on craignait
   * d'en créer une seconde) et rien ne permettait de renoncer.
   */
  function afficherMode() {
    const p = pieceEnCours();
    const card = $('ficheCard');
    if (card) card.classList.toggle('en-modification', !!p);
    const txt = $('btnPieceSaveTexte');
    if (txt) txt.textContent = p ? 'Enregistrer les modifications' : 'Enregistrer la pièce → journal';
    const bandeau = $('ficheMode');
    if (!bandeau) return;
    bandeau.classList.toggle('hidden', !p);
    bandeau.innerHTML = p
      ? `<span><b>Vous modifiez la pièce n° ${p.no == null ? '?' : p.no}${p.date ? ` du ${escapeHtml(P.isoToDisplay(p.date))}` : ''}</b>, déjà dans le journal. ` +
        'Rien ne change tant que vous n\'avez pas enregistré.</span>' +
        '<button type="button" class="small" data-annuler-modif="1"><svg class="ico"><use href="#i-x"/></svg> Annuler la modification</button>'
      : '';
  }

  function fillForm(p) {
    // pièce qui a déjà un compte (modification, décompte pré-rempli) : il ne sera pas re-proposé
    state.autoAccount = !p.compte;
    if (els.pAFaire) els.pAFaire.checked = !!p.decompteAFaire;
    els.pNo.value = p.no == null ? '' : p.no;
    els.pDate.value = p.date || '';
    els.pType.value = R.TYPES.includes(p.type) ? p.type : R.TYPES[0];
    els.pObjet.value = P.OBJET_LIST.includes(p.objet) ? p.objet : 'Autre';
    if (C) C.syncAll();
    els.pClasse.value = p.classe || '';
    els.pPeriode.value = p.periode || '';
    els.pDetail.value = p.detail || '';
    els.pPersonne.value = p.personne || '';
    els.pCompte.value = p.compte || '';
    state.autoAccount = !p.compte;
    els.pMontant.value = p.montant ? p.montant.toFixed(2) : '';
    els.pLibelleEdit.checked = !!(p.libelle && p.libelle !== R.composeLibelle(p));
    els.pLibelle.readOnly = !els.pLibelleEdit.checked;
    els.pLibelle.value = p.libelle || R.composeLibelle(p);
    // le sens enregistré est conservé tel quel ; s'il ne suit pas la logique du type (pièce remplie
    // à l'envers, conservée ainsi), la case « forcer » est cochée pour qu'il reste modifiable
    const force = $('pSensForce');
    if (force) force.checked = !!(p.sens && sensDe(p.type) && p.sens !== sensDe(p.type));
    setSens(p.sens || sensDe(p.type), !p.sens);
    refreshKind();
    renderFiles(p);
    refreshSuggestions();
    retenirPhoto();
  }

  // Un DECOMPTE concerne une course d'école ou un camp : deux choix explicites à la place de la liste des objets.
  const DECOMPTE_KINDS = ["Course d'école", 'Camp'];
  function kindOfObjet(o) { return o === 'Camp' || o === 'Mini-camp' ? 'Camp' : "Course d'école"; }
  function refreshKind() {
    const isDecompte = els.pType.value === 'DECOMPTE';
    els.pKindField.classList.toggle('hidden', !isDecompte);
    if (els.pAFaireField) els.pAFaireField.classList.toggle('hidden', !isDecompte);
    els.pObjetField.classList.toggle('hidden', isDecompte);
    if (!isDecompte) return;
    // « Mini-camp » se montre sous le bouton « Camp » mais reste « Mini-camp » dans la pièce :
    // l'écraser à la simple ouverture de la fiche changeait le libellé enregistré.
    const MONTRE_COMME = { 'Mini-camp': 'Camp' };
    const courant = els.pObjet.value;
    const affiche = DECOMPTE_KINDS.includes(courant) ? courant : (MONTRE_COMME[courant] || kindOfObjet(courant));
    // On n'écrit dans la pièce que si elle n'a pas encore d'objet à elle : ouvrir la fiche
    // suffisait sinon à changer l'objet enregistré, donc le libellé.
    if (!courant || courant === 'Autre') { els.pObjet.value = affiche; if (C) C.syncAll(); }
    for (const r of els.pKind.querySelectorAll('input')) r.checked = r.value === affiche;
  }
  els.pKind.addEventListener('change', () => {
    const r = els.pKind.querySelector('input:checked');
    if (!r) return;
    els.pObjet.value = r.value;
    if (C) C.syncAll();
    if (state.autoAccount) els.pCompte.value = '';
    refreshSuggestions(); refreshLibelle();
  });

  function formPiece() {
    const base = state.editingId ? state.reg.pieces.find((x) => x.id === state.editingId) : null;
    const p = R.normalizePiece(Object.assign({}, base || {}, {
      id: base ? base.id : (state.draftId || (state.draftId = R.newId())),
      no: els.pNo.value.trim() === '' ? null : Number(els.pNo.value),
      date: els.pDate.value || null,
      type: els.pType.value,
      objet: els.pObjet.value,
      classe: els.pClasse.value.trim(),
      periode: els.pPeriode.value.trim(),
      detail: els.pDetail.value.trim(),
      personne: els.pPersonne.value.trim(),
      compte: els.pCompte.value.trim(),
      montant: R.parseAmountInput(els.pMontant.value) || 0,
      sens: els.pSensDebit.checked ? 'debit' : (els.pSensCredit.checked ? 'credit' : null),
      justificatifs: base ? base.justificatifs.filter((j) => !state.retires.has(j.name)) : [],
      source: base ? base.source : (state.dgeo.current ? 'dgeo' : 'saisie'),
      ref: base ? base.ref : (state.dgeo.current ? (state.dgeo.current.numero || state.dgeo.current.filename || '') : ''),
      // ouvrir une pièce lue sur un scan et l'enregistrer, c'est l'avoir vérifiée
      scanKey: base ? base.scanKey : '',
      aVerifier: false,
      doutes: [],
      // ne vaut que pour un décompte : la case est cachée pour les autres types
      decompteAFaire: els.pType.value === 'DECOMPTE' && !!(els.pAFaire && els.pAFaire.checked),
    }));
    p.libelle = els.pLibelleEdit.checked ? els.pLibelle.value.trim() : R.composeLibelle(p);
    return p;
  }

  function setSens(sens, fromType) {
    els.pSensDebit.checked = sens === 'debit';
    els.pSensCredit.checked = sens === 'credit';
    const logic = sensDe(els.pType.value);
    const forced = !!$('pSensForce') && $('pSensForce').checked;
    const locked = !!logic && !forced;
    els.pSensDebit.disabled = locked; els.pSensCredit.disabled = locked;
    els.pSensHint.textContent = logic
      ? `Sens fixé par le libellé : ${els.pType.value} = ${logic === 'debit' ? 'entrée en caisse (Débit)' : 'sortie de caisse (Crédit)'}${forced ? ' – forcé' : ''}`
      : "Ce type va dans les deux sens : choisissez (décompte rendu à la caisse = entrée ; complément payé = sortie).";
    if (fromType && logic && !forced) { els.pSensDebit.checked = logic === 'debit'; els.pSensCredit.checked = logic === 'credit'; }
  }

  function refreshLibelle() {
    if (!els.pLibelleEdit.checked) els.pLibelle.value = R.composeLibelle(formPiece());
  }

  function refreshSuggestions() {
    const p = formPiece();
    // Le compte n'est rempli d'office que s'il s'impose (deux fois sur trois au moins pour ce
    // genre de pièce) ; sinon la personne choisit, avec de quoi distinguer les comptes. Et
    // seulement tant que le compte n'a pas été touché à la main : sinon vider le champ le
    // remplissait aussitôt, et le texte tapé venait s'ajouter à la suite de la proposition.
    const impose = R.compteImpose(p, vocab(), state.reg);
    if (state.autoAccount && !els.pCompte.value && impose) els.pCompte.value = impose.compte;
    const choix = choixDeComptes(Object.assign({}, p, { compte: els.pCompte.value.trim() }));
    const actuel = els.pCompte.value.trim();
    const c = choix.find((x) => x.compte === actuel);
    const employes = choix.filter((x) => x.niveau <= 2 && x.n > 0);
    // l'objet départage souvent les comptes d'un même type : on le dit quand il n'est pas choisi
    const objets = [];
    for (const x of employes) for (const o of x.objets || []) if (!objets.includes(o)) objets.push(o);
    const conseilObjet = p.objet === 'Autre' && p.type !== 'DECOMPTE' && objets.length
      ? ` Choisir l'objet (${escapeHtml(objets.slice(0, 3).join(', '))}…) aide à trouver le bon.` : '';
    let html;
    if (actuel && c) {
      html = `<b>${escapeHtml(actuel)}</b> : ${escapeHtml(decrireCompte(c, p.type) || 'compte connu')}` +
        (impose && impose.compte === actuel ? ` <span class="legend">· proposé : employé ${impose.n} fois sur ${impose.total} pour ce genre de pièce</span>` : '');
    } else if (actuel) {
      html = `<b>${escapeHtml(actuel)}</b> <span class="legend">: compte jamais employé jusqu'ici</span>`;
    } else if (employes.length > 1) {
      html = `<span class="legend">Plusieurs comptes servent pour ce type : choisissez dans la liste du champ Compte, les plus employés sont en tête.${conseilObjet}</span>`;
    } else if (employes.length === 1) {
      html = `<span class="legend">Pour ce type, le compte employé jusqu'ici est <b>${escapeHtml(employes[0].compte)}</b> : choisissez-le dans la liste s'il convient.</span>`;
    } else html = '<span class="legend">Aucun compte habituel pour ce type : ouvrez la liste du champ Compte pour voir tous les comptes connus.</span>';
    els.pCompteSugg.innerHTML = html;
  }

  // Les exemples de la liste des comptes viennent aussi de l'année d'avant : une année qui
  // commence n'a pas encore de pièces à montrer.
  let exemplesDe = null;
  document.addEventListener('caisse:registre', async () => {
    const an = state.reg && state.reg.annee;
    if (!an || exemplesDe === an) return;
    exemplesDe = an;
    state.piecesAvant = [];
    const avant = state.years.filter((y) => y < an).sort().pop();
    if (!avant) return;
    try { const r = await state.storage.load(avant); state.piecesAvant = (r && r.pieces) || []; } catch (e) { /* sans exemples */ }
  });

  els.pType.addEventListener('change', () => { setSens(null, true); refreshKind(); els.pCompte.value = ''; state.autoAccount = true; refreshSuggestions(); refreshLibelle(); });
  // objet ou classe modifiés : le compte habituel change souvent (degré, activité) -> re-proposé
  for (const id of ['pObjet', 'pClasse']) els[id].addEventListener('input', () => { if (state.autoAccount) els.pCompte.value = ''; refreshSuggestions(); refreshLibelle(); });
  els.pDetail.addEventListener('input', () => { refreshSuggestions(); refreshLibelle(); });
  els.pCompte.addEventListener('input', () => { state.autoAccount = false; refreshSuggestions(); });
  // Le montant compris est réécrit dès qu'on quitte le champ : « 400.– » devient « 400.00 », et
  // la personne voit ce qui sera enregistré. Un texte illisible reste tel quel, pour être corrigé.
  els.pMontant.addEventListener('change', () => {
    const v = R.parseAmountInput(els.pMontant.value);
    if (v != null && v > 0) els.pMontant.value = v.toFixed(2);
  });
  for (const id of ['pPeriode', 'pPersonne']) els[id].addEventListener('input', refreshLibelle);
  els.pLibelleEdit.addEventListener('change', () => { els.pLibelle.readOnly = !els.pLibelleEdit.checked; if (!els.pLibelleEdit.checked) refreshLibelle(); });
  if ($('pSensForce')) $('pSensForce').addEventListener('change', () => setSens(els.pSensDebit.checked ? 'debit' : (els.pSensCredit.checked ? 'credit' : null), true));
  els.pPersonne.addEventListener('change', () => { const c = P.correctPerson && P.correctPerson(els.pPersonne.value, P.buildIndex(vocab())); if (c) els.pPersonne.value = c; refreshLibelle(); });

  // justificatifs
  els.pFiles.addEventListener('change', async () => {
    for (const f of Array.from(els.pFiles.files || [])) {
      const kind = R.kindOf(f.name);
      if (kind === 'autre') { notice('warn', `« ${escapeHtml(f.name)} » ignoré : seuls les PDF, JPG et PNG sont acceptés.`); continue; }
      state.pending.push({ name: f.name, kind, bytes: new Uint8Array(await f.arrayBuffer()) });
    }
    els.pFiles.value = '';
    renderFiles(formPiece());
  });
  els.pFilesList.addEventListener('click', async (ev) => {
    const o = ev.target.closest('button[data-ouvrir]');
    if (o) { await ouvrirJustificatif(o.dataset.ouvrir); return; }
    const g = ev.target.closest('button[data-garder]');
    if (g) { state.retires.delete(g.dataset.garder); renderFiles(formPiece()); return; }
    const b = ev.target.closest('button[data-remove]');
    if (!b) return;
    const raw = b.dataset.remove; const cut = raw.indexOf(':');
    const where = cut < 0 ? raw : raw.slice(0, cut); const key = cut < 0 ? '' : raw.slice(cut + 1); // le nom du fichier peut contenir « : »
    if (where === 'pending') state.pending.splice(Number(key), 1);
    // Un justificatif déjà enregistré n'est effacé du disque qu'à l'enregistrement de la pièce :
    // l'effacer aussitôt le perdait même si l'on renonçait ensuite à la modification.
    else if (state.editingId) state.retires.add(key);
    renderFiles(formPiece());
  });
  function renderFiles(p) {
    const items = [];
    for (const j of p.justificatifs || []) items.push(`<li>${escapeHtml(j.name)}${j.signee ? ' <span class="tag">signé</span>' : ''} <span class="legend">(${j.kind}, ${Math.round(j.size / 1024)} Ko)</span> <button type="button" class="small ghost" data-ouvrir="saved:${escapeHtml(j.name)}">ouvrir</button> <button type="button" class="small" data-remove="saved:${escapeHtml(j.name)}">retirer</button></li>`);
    const base = pieceEnCours();
    for (const j of (base && base.justificatifs) || []) {
      if (state.retires.has(j.name)) items.push(`<li class="retire"><s>${escapeHtml(j.name)}</s> <span class="legend">sera retiré quand vous enregistrerez la pièce</span> <button type="button" class="small ghost" data-garder="${escapeHtml(j.name)}">garder</button></li>`);
    }
    state.pending.forEach((f, i) => items.push(`<li>${escapeHtml(f.name)} <span class="legend">(${f.kind}, ${Math.round(f.bytes.length / 1024)} Ko, à enregistrer)</span> <button type="button" class="small ghost" data-ouvrir="pending:${i}">ouvrir</button> <button type="button" class="small" data-remove="pending:${i}">retirer</button></li>`));
    els.pFilesList.innerHTML = items.length ? `<ul>${items.join('')}</ul>` : '<span class="legend">Aucun justificatif joint (tickets, factures, photos : PDF, JPG ou PNG).</span>';
  }

  // enregistrement
  // Ctrl+Entrée depuis n'importe quel champ de la fiche : trente pièces à la suite, c'est trente
  // allers-retours vers la souris en moins. Le raccourci existait déjà dans le tableau des
  // pièces scannées ; la fiche ne l'avait pas.
  const ficheCard = $('ficheCard');
  if (ficheCard) ficheCard.addEventListener('keydown', (ev) => {
    if (!(ev.ctrlKey || ev.metaKey) || ev.key !== 'Enter') return;
    ev.preventDefault();
    if (!els.btnPieceSave.disabled) els.btnPieceSave.click();
  });
  /**
   * Les erreurs de la fiche, chacune sur son champ : encadré rouge, et la liste au-dessus du
   * bouton. Elles se retirent d'elles-mêmes à mesure que les champs sont corrigés (voir plus bas) :
   * le cadre gardait sinon « Montant manquant » sous un montant bien rempli.
   */
  const enErreur = new Set();
  function champVisible(id) {
    const el = id === 'sens' ? els.pSensDebit : $(id);
    if (!el) return null;
    if (el.tagName === 'SELECT' && el.previousElementSibling) return el.previousElementSibling.querySelector('input') || el;
    if (id === 'sens') return (el.closest && el.closest('.sens')) || el;
    return el;
  }
  function montrerErreurs(errs) {
    for (const id of enErreur) { const c = champVisible(id); if (c) c.classList.remove('champ-erreur'); }
    enErreur.clear();
    for (const e of errs) { const c = champVisible(e.champ); if (c) { c.classList.add('champ-erreur'); enErreur.add(e.champ); } }
    els.ficheErrors.innerHTML = errs.length
      ? `<div class="notice err"><b>La pièce n'est pas encore enregistrée :</b><ul>${errs.map((e) => `<li>${escapeHtml(e.message)}` +
        `${e.libre ? ` <button type="button" class="small" data-prendre-no="${e.libre}">Prendre le n° ${e.libre}</button>` : ''}</li>`).join('')}</ul></div>`
      : '';
  }
  const erreursFiche = () => R.validateChamps(formPiece(), state.reg, { montantTape: els.pMontant.value });
  // une erreur affichée se retire dès que son champ est corrigé
  if (ficheCard) for (const t of ['input', 'change']) ficheCard.addEventListener(t, () => { if (enErreur.size) montrerErreurs(erreursFiche()); });

  els.btnPieceSave.addEventListener('click', async () => {
    const p = formPiece();
    const errs = erreursFiche();
    if (errs.length) {
      montrerErreurs(errs);
      const premier = champVisible(errs[0].champ);
      if (premier && premier.focus) premier.focus();
      return;
    }
    montrerErreurs([]);
    // justificatifs en attente -> fichiers
    const failed = [];
    for (const f of state.pending) {
      if (p.justificatifs.some((j) => j.name === f.name)) { notice('warn', `Un justificatif nommé « ${escapeHtml(f.name)} » est déjà joint à cette pièce : le second n'a pas été ajouté.`); continue; }
      try {
        const saved = await state.storage.attach(state.reg.annee, p.id, f.name, f.bytes);
        p.justificatifs.push({ name: saved.name, size: saved.size, kind: f.kind });
      } catch (e) {
        failed.push(f);
        notice('err', `Justificatif « ${escapeHtml(f.name)} » non enregistré : ${escapeHtml(e.message || e)}`);
      }
    }
    state.pending = failed;
    renderFiles(p); // les indices « pending:<i> » du bouton « retirer » ont changé
    const wasEdit = !!state.editingId;
    R.upsertPiece(state.reg, p);
    await saveReg();
    // les justificatifs retirés pendant la modification ne quittent le disque que maintenant
    for (const nom of state.retires) {
      if (p.justificatifs.some((j) => j.name === nom)) continue; // remplacé par un fichier du même nom
      try { await state.storage.remove(state.reg.annee, p.id, nom); } catch (e) { /* ignore */ }
    }
    state.retires = new Set();
    if (A.rememberVocabulary) A.rememberVocabulary({ persons: [p.personne], classTokens: p.classe ? [p.classe] : [] });
    if (state.dgeo.current && window.CaisseDgeo) {
      try { await window.CaisseDgeo.mark(state.dgeo.current.id, { saisi: true, pieceId: p.id }); } catch (e) { /* ignore */ }
      await refreshDgeo();
    }
    renderJournal();
    if (failed.length) {
      // la pièce est enregistrée mais un justificatif manque : la fiche reste ouverte sur cette
      // pièce, avec le fichier encore en mémoire, pour réessayer sans avoir à le rechoisir
      state.editingId = p.id;
      els.ficheTitle.textContent = `n° ${p.no} (modification)`;
      afficherMode();
      retenirPhoto(); // la pièce est enregistrée : seuls les justificatifs en attente restent à faire
      notice('warn', `Pièce n° ${p.no} enregistrée, mais ${failed.length} justificatif(s) n'ont pas pu l'être. La fiche reste ouverte : réessayez « Enregistrer ».`);
      return;
    }
    notice('ok', `Pièce n° ${p.no} ${wasEdit ? 'modifiée' : 'enregistrée'} : ${escapeHtml(p.libelle)} – ${p.sens === 'debit' ? 'Débit' : 'Crédit'} ${fmtCHF(p.montant)}.` +
      (ficheAuto.open ? ' La fiche PDF s\'ouvre dans une fenêtre : <b>Ctrl+P</b> pour l\'imprimer.' : ''));
    state.draftId = null;
    newPiece();
    els.pDate.focus();
    if (ficheAuto.open) {
      const w = window.open('', '_blank'); // ouverte tout de suite (clic de l'utilisateur), remplie ensuite
      openPiecePdf(p, w).catch((e) => { if (w && !w.closed) w.close(); notice('err', `Fiche PDF impossible : ${escapeHtml(e.message || e)}`); });
    }
  });

  // Fiche PDF ouverte automatiquement après l'enregistrement (pour l'imprimer) : réglage mémorisé.
  const ficheAuto = { open: true, withAttachments: false };
  try { Object.assign(ficheAuto, JSON.parse(localStorage.getItem('caisse.ficheAuto') || '{}')); } catch (e) { /* ignore */ }
  if (els.optPdfAuto && els.optPdfAutoJust) {
    els.optPdfAuto.checked = !!ficheAuto.open;
    els.optPdfAutoJust.checked = !!ficheAuto.withAttachments;
    const saveOpt = () => {
      ficheAuto.open = els.optPdfAuto.checked; ficheAuto.withAttachments = els.optPdfAutoJust.checked;
      try { localStorage.setItem('caisse.ficheAuto', JSON.stringify(ficheAuto)); } catch (e) { /* ignore */ }
    };
    els.optPdfAuto.addEventListener('change', saveOpt);
    els.optPdfAutoJust.addEventListener('change', saveOpt);
  }
  /** Construit la fiche PDF de la pièce et l'ouvre dans une fenêtre (visionneuse PDF, imprimable). */
  async function openPiecePdf(p, win) {
    const res = await F.buildPdf([p], state.reg, ficheAuto.withAttachments ? (piece, j) => readAttachment(piece, j) : () => null, { title: `Pièce comptable n° ${p.no} – ${p.libelle}` });
    const url = URL.createObjectURL(new Blob([res.bytes], { type: 'application/pdf' }));
    // la fenêtre est ouverte avant la construction du PDF (voir l'appelant) : un navigateur bloque
    // window.open appelé après un await, hors du clic de l'utilisateur
    const w = win && !win.closed ? win : window.open(url, '_blank');
    if (w && w !== win) { /* ouverte ici */ } else if (w) { try { w.location.replace(url); } catch (e) { w.location = url; } }
    if (!w) notice('warn', `La fiche PDF n'a pas pu s'ouvrir toute seule (fenêtre bloquée par le navigateur) : <button type="button" data-open-pdf="${url}">Ouvrir la fiche PDF</button>`, { keep: true });
    setTimeout(() => URL.revokeObjectURL(url), 180000); // la fenêtre a le temps de charger le document
    return res;
  }
  els.regNotices.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-open-pdf]');
    if (b) window.open(b.dataset.openPdf, '_blank');
  });
  els.btnPieceNew.addEventListener('click', () => {
    if (!abandonnerFiche()) return;
    state.draftId = null;
    newPiece();
    renderJournal(); // la ligne qu'on modifiait n'est plus en surbrillance
  });
  const bandeauMode = $('ficheMode');
  if (bandeauMode) bandeauMode.addEventListener('click', (ev) => {
    if (!ev.target.closest('button[data-annuler-modif]')) return;
    // renoncer est le geste même : pas de question en plus, la pièce du journal n'a pas bougé
    state.draftId = null;
    newPiece();
    renderJournal();
    els.pDate.focus();
  });
  // Fermer la fenêtre ou recharger la page effaçait une fiche à moitié remplie sans rien dire. La
  // page refuse de partir tant que la fiche porte une saisie non enregistrée : le navigateur pose
  // alors sa question, l'application fenêtrée la sienne (main.js, « will-prevent-unload »).
  window.addEventListener('beforeunload', (ev) => {
    if (!ficheModifiee()) return;
    ev.preventDefault();
    ev.returnValue = '';
  });

  // aperçu de la fiche (PDF)
  els.btnPiecePreview.addEventListener('click', async () => {
    const p = formPiece();
    if (!p.libelle) p.libelle = R.composeLibelle(p);
    // les justificatifs choisis mais pas encore enregistrés figurent aussi dans l'aperçu
    const attente = state.pending.filter((f) => !p.justificatifs.some((j) => j.name === f.name));
    const vue = Object.assign({}, p, {
      justificatifs: p.justificatifs.concat(attente.map((f) => ({ name: f.name, size: f.bytes.length, kind: f.kind }))),
    });
    try {
      const res = await F.buildPdf([vue], state.reg, (piece, j) => {
        const f = state.pending.find((x) => x.name === j.name);
        return f ? f.bytes : readAttachment(piece, j);
      });
      showPreview(res.bytes);
    } catch (e) { notice('err', `Aperçu impossible : ${escapeHtml(e.message || e)}`); }
  });
  // Le cadre d'aperçu sert à trois choses : la fiche en cours, le document complet d'une pièce
  // du journal, et un justificatif seul. D'où le type et le titre : un JPEG annoncé « pdf » ne
  // s'affiche pas, et un cadre qui dit toujours « Aperçu de la fiche » ment deux fois sur trois.
  function showPreview(bytes, type, titre) {
    hidePreview();
    state.previewUrl = URL.createObjectURL(new Blob([bytes], { type: type || 'application/pdf' }));
    els.ficheFrame.src = state.previewUrl;
    if (els.fichePreviewTitre) els.fichePreviewTitre.textContent = titre || 'Aperçu de la fiche (et des justificatifs)';
    els.fichePreview.classList.remove('hidden');
    els.fichePreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  const TYPE_MIME = { pdf: 'application/pdf', jpeg: 'image/jpeg', png: 'image/png' };
  function hidePreview() {
    if (state.previewUrl) { URL.revokeObjectURL(state.previewUrl); state.previewUrl = null; }
    els.ficheFrame.removeAttribute('src');
    els.fichePreview.classList.add('hidden');
  }
  els.btnPreviewClose.addEventListener('click', hidePreview);

  async function readAttachment(piece, j) {
    const pend = state.pending.find((f) => f.name === j.name);
    if (pend) return pend.bytes;
    return state.storage.read(state.reg.annee, piece.id, j.name);
  }

  /* ---------------- Journal ---------------- */
  /** Les réglages de l'année vivent maintenant sur un autre écran que le journal : ils doivent
   *  être recopiés du registre à chaque changement, sinon on y lit une valeur périmée — et un
   *  simple passage dans le champ la réécrirait dans le registre. Le champ qu'on est en train de
   *  remplir est laissé tranquille. */
  function renderRegFields() {
    const reg = state.reg;
    if (!reg || !els.regOpeningDate) return;
    const busy = document.activeElement;
    if (busy !== els.regOpeningDate) els.regOpeningDate.value = reg.opening.date || '';
    if (busy !== els.regOpeningAmount) els.regOpeningAmount.value = fmtCHF(reg.opening.amount);
    if (busy !== els.regCaisse) els.regCaisse.value = reg.caisse;
    const v = reg.visas || {};
    if (els.regVisaResp && busy !== els.regVisaResp) els.regVisaResp.value = v.responsable || '';
    if (els.regVisaBours && busy !== els.regVisaBours) els.regVisaBours.value = v.boursier || '';
  }

  /** Bandeau d'une ligne rappelant l'année ouverte : les réglages, eux, ont leur propre espace. */
  function renderYearBar() {
    if (!els.yearBar || !state.reg) return;
    const reg = state.reg;
    const j = R.journal(reg);
    els.yearBar.innerHTML =
      `<span class="y">${reg.annee}</span>` +
      `<span class="i"><b>${reg.pieces.length}</b> ${reg.pieces.length > 1 ? 'pièces' : 'pièce'}</span>` +
      `<span class="i">solde à nouveau <b>${fmtCHF(reg.opening.amount)}</b>${reg.opening.date ? ` au ${escapeHtml(P.isoToDisplay(reg.opening.date))}` : ''}</span>` +
      `<span class="i">solde actuel <b>${fmtCHF(j.end)}</b></span>` +
      `<span class="i">compte caisse <b>${escapeHtml(reg.caisse)}</b></span>` +
      `<button type="button" class="small ghost" data-annee="1">Changer d'année, solde à nouveau…</button>`;
  }
  if (els.yearBar) els.yearBar.addEventListener('click', (ev) => {
    if (ev.target.closest('button[data-annee]') && A.showPanel) A.showPanel('panelAnnee');
  });

  /**
   * Suite des numéros de l'année. Le n° est le lien avec la pièce papier : un trou, c'est une
   * pièce reçue et jamais saisie, et sans ce contrôle on ne s'en aperçoit qu'au comptage suivant
   * ou à la clôture. Le même contrôle existait déjà pour un lot scanné, pas pour l'année.
   *
   * Dire qu'il manque le n° 47 ne suffit pas : ce qu'on veut savoir, c'est quand il aurait dû
   * être saisi. On donne donc les dates de ses deux voisins.
   */
  function renderNumberChecks() {
    if (!els.journalNumbers || !state.reg) return;
    const c = R.numberChecks(state.reg);
    const parNo = new Map();
    for (const p of state.reg.pieces) if (Number.isInteger(p.no)) parNo.set(p.no, p);
    const jour = (n) => { const p = parNo.get(n); return p && p.date ? P.isoToDisplay(p.date) : null; };
    // le n° manquant situé entre ses voisins présents : « le 47, entre le 46 (03.03) et le 48 (09.03) »
    const situer = (n) => {
      let av = n - 1; while (av >= c.premier && !parNo.has(av)) av--;
      let ap = n + 1; while (ap <= c.dernier && !parNo.has(ap)) ap++;
      const bouts = [];
      if (parNo.has(av) && jour(av)) bouts.push(`après le n° ${av} du ${jour(av)}`);
      if (parNo.has(ap) && jour(ap)) bouts.push(`avant le n° ${ap} du ${jour(ap)}`);
      return `<b>n° ${n}</b>${bouts.length ? ` (${bouts.join(', ')})` : ''}`;
    };
    const chip = (n) => `<button type="button" class="numlink" data-search-nums="${n}" title="Chercher le n° ${n} dans le journal">${n}</button>`;
    const parts = [];
    if (c.plages.length) {
      // un trou d'un seul numéro est une pièce manquante : on la situe. Une plage large vient
      // d'une reprise ou d'un changement de numérotation : on la nomme sans prétendre la situer.
      const dire = ([a, b]) => (a === b ? situer(a) : `<b>n° ${a} à ${b}</b> (${b - a + 1})`);
      const montres = c.plages.slice(0, 5).map(dire).join(' · ');
      const n = c.manquants.length;
      parts.push(`<b>${n} numéro${n > 1 ? 's' : ''} manquant${n > 1 ? 's' : ''}</b> dans la suite ${c.premier}–${c.dernier} : ${montres}` +
        `${c.plages.length > 5 ? ` et ${c.plages.length - 5} autres intervalles` : ''}. Une pièce reçue et pas encore saisie ?`);
    }
    if (c.doublons.length) parts.push(`<b>Numéro${c.doublons.length > 1 ? 's' : ''} employé${c.doublons.length > 1 ? 's' : ''} deux fois</b> : ${c.doublons.slice(0, 25).map(chip).join(' ')}.`);
    if (c.sansNo) parts.push(`<b>${c.sansNo} pièce${c.sansNo > 1 ? 's' : ''} sans numéro.</b>`);
    els.journalNumbers.innerHTML = parts.length ? `<div class="notice warn">${parts.join(' ')}</div>` : '';
  }

  function renderJournal() {
    renderYearBar();
    renderRegFields();
    const j = R.journal(state.reg);
    // On filtre l'affichage, jamais le calcul : le solde de chaque ligne reste celui de l'année,
    // et les totaux au-dessus restent ceux de l'année entière.
    const q = els.journalSearch ? els.journalSearch.value : '';
    const doutesSeuls = !!(els.journalOnlyDoubt && els.journalOnlyDoubt.checked);
    let vues = R.searchRows(j.rows, q);
    if (doutesSeuls) {
      const enAttente = new Set(R.pendingPieces(state.reg).map((p) => p.id));
      vues = vues.filter((r) => enAttente.has(r.id));
    }
    const filtre = !!(String(q).trim() || doutesSeuls);
    if (els.journalCount) {
      els.journalCount.textContent = filtre ? `${plur(vues.length, 'ligne')} sur ${j.rows.length}` : '';
    }
    els.journalBody.innerHTML = vues.map((r) => {
      const p = state.reg.pieces.find((x) => x.id === r.id);
      const ico = (id) => `<svg class="ico"><use href="#i-${id}"/></svg>`;
      const classes = [state.editingId === r.id ? 'selected' : '', p && p.aVerifier ? 'a-verifier' : ''].filter(Boolean).join(' ');
      return `<tr data-id="${r.id}"${classes ? ` class="${classes}"` : ''}>` +
        `<td>${r.no == null ? '' : r.no}</td><td>${escapeHtml(P.isoToDisplay(r.date))}</td><td class="compte">${escapeHtml(r.compte)}</td><td class="libelle" title="${escapeHtml(r.libelle)}">${escapeHtml(r.libelle)}</td>` +
        `<td class="num">${r.debit != null ? fmtCHF(r.debit) : ''}</td><td class="num">${r.credit != null ? fmtCHF(r.credit) : ''}</td><td class="num solde">${fmtCHF(r.solde)}</td>` +
        `<td>${p && p.justificatifs.length ? `<button type="button" class="clip" data-apercu="${r.id}" title="Voir le document complet : la fiche et ses ${p.justificatifs.length} justificatif(s)">${ico('clip')} ${p.justificatifs.length}</button>` : ''}${p && p.aVerifier ? ` <span class="tag warn" title="Lue sur un scan, pas encore vérifiée${p.doutes && p.doutes.length ? ' :\n- ' + p.doutes.join('\n- ').replace(/"/g, '') : ''}">à vérifier</span>` : ''}${p && p.source === 'scan' ? ' <span class="tag" title="Lue sur un scan">scan</span>' : ''}${p && p.source === 'dgeo' ? ` <span class="tag" title="Créée depuis Décompte DGEO${p.ref ? ` (${escapeHtml(p.ref)})` : ''}">DGEO</span>` : ''}${p && p.source === 'excel' ? ' <span class="tag" title="Reprise d\'un classeur Excel">Excel</span>' : ''}</td>` +
        `<td class="acts">${p && p.aVerifier ? `<button type="button" class="small ghost ok" data-verif="${r.id}" title="Cette lecture est juste : marquer la pièce comme vérifiée">${ico('check')}</button>` : ''}<button type="button" class="small ghost" data-edit="${r.id}" title="Modifier la pièce">${ico('pen')}</button><button type="button" class="small ghost" data-pdf="${r.id}" title="PDF de la pièce">${ico('printer')}</button><button type="button" class="small ghost danger" data-del="${r.id}" title="Supprimer la pièce">${ico('trash')}</button></td></tr>`;
    }).join('') || `<tr><td colspan="9" class="legend">${filtre
      ? `Aucune pièce ne correspond${String(q).trim() ? ` à « ${escapeHtml(String(q).trim())} »` : ''}. <button type="button" class="small ghost" data-search-clear="1">Tout afficher</button>`
      : 'Aucune pièce dans ce registre. Remplissez la fiche à gauche : chaque pièce enregistrée apparaît ici avec le solde cumulé.'}</td></tr>`;
    els.journalTotals.innerHTML = `<div class="t"><div class="l">Solde à nouveau</div><div class="v">${fmtCHF(j.start)}</div></div>` +
      `<div class="t"><div class="l">Débits (entrées)</div><div class="v">+ ${fmtCHF(j.debits)}</div></div>` +
      `<div class="t"><div class="l">Crédits (sorties)</div><div class="v">− ${fmtCHF(j.credits)}</div></div>` +
      `<div class="t end"><div class="l">Solde final</div><div class="v">${fmtCHF(j.end)}</div></div>` +
      `<div class="t"><div class="l">Pièces</div><div class="v">${state.reg.pieces.length}</div></div>`;
    renderNumberChecks();
    // pièces lues sur un scan et pas encore regardées : elles comptent dans le solde, il faut le dire
    const aVerifier = R.pendingPieces(state.reg);
    if (els.journalPending) {
      els.journalPending.innerHTML = aVerifier.length
        ? `<div class="notice warn"><b>${aVerifier.length}</b> ${aVerifier.length > 1 ? 'pièces lues sur un scan attendent' : 'pièce lue sur un scan attend'} d'être vérifiée${aVerifier.length > 1 ? 's' : ''} (n° ${aVerifier.map((p) => (p.no == null ? '?' : p.no)).slice(0, 25).join(', ')}${aVerifier.length > 25 ? '…' : ''}). ` +
          `Elles sont déjà comptées dans le solde. Ouvrez-en une pour la corriger, ou confirmez la lecture d'un coup : ` +
          `<button type="button" class="small" data-verif-all="1">Tout marquer comme vérifié</button></div>`
        : '';
    }
    // sélecteur « depuis le n° » pour le PDF
    const nos = state.reg.pieces.map((p) => p.no).filter((n) => n != null);
    if (els.regPdfFrom) {
      const cur = els.regPdfFrom.value;
      els.regPdfFrom.innerHTML = '<option value="">toutes les pièces</option>' + nos.map((n) => `<option value="${n}">depuis le n° ${n}</option>`).join('');
      els.regPdfFrom.value = nos.map(String).includes(cur) ? cur : '';
      if (C) C.syncAll();
    }
    if (window.CaisseComptage && window.CaisseComptage.state) window.CaisseComptage.render();
    renderRecap();
  }

  /* ---------------- Récapitulatif des décomptes ---------------- */
  // Les pièces DECOMPTE de l'année, filtrées (courses d'école / camps / les deux), cochées ou non,
  // puis un PDF : n° de chaque décompte, montant, total.
  const recap = { filter: 'course', selected: new Set(), seen: new Set() };
  const RECAP_LABEL = { course: "Courses d'école", camp: 'Camps', tous: "Courses d'école et camps" };
  function recapPieces() {
    return state.reg.pieces.filter((p) => p.type === 'DECOMPTE' && (recap.filter === 'tous' || kindOfObjet(p.objet) === (recap.filter === 'camp' ? 'Camp' : "Course d'école")));
  }
  function renderRecap() {
    if (!els.recapBody || !state.reg) return;
    els.recapYear.textContent = String(state.reg.annee);
    const pieces = recapPieces();
    // une pièce vue pour la première fois est cochée d'office
    for (const p of pieces) if (!recap.seen.has(p.id)) { recap.seen.add(p.id); recap.selected.add(p.id); }
    els.recapBody.innerHTML = pieces.map((p) => {
      const on = recap.selected.has(p.id);
      return `<tr data-id="${p.id}" class="${on ? '' : 'off'}"><td class="sel"><input type="checkbox" data-recap="${p.id}"${on ? ' checked' : ''} aria-label="Reprendre la pièce n° ${p.no}"></td>` +
        `<td>${p.no == null ? '' : p.no}</td><td>${escapeHtml(P.isoToDisplay(p.date))}</td><td class="libelle" title="${escapeHtml(F.recapDescription(p))}">${escapeHtml(F.recapDescription(p))}</td>` +
        `<td>${escapeHtml(p.personne)}</td><td>${p.ref ? `<span class="tag">${escapeHtml(p.ref)}</span>` : ''}</td><td class="legend">${p.sens === 'debit' ? 'entrée' : 'sortie'}</td><td class="num">${fmtCHF(p.montant)}</td></tr>`;
    }).join('') || `<tr><td colspan="8" class="legend">Aucun décompte ${recap.filter === 'course' ? 'de course d\'école' : recap.filter === 'camp' ? 'de camp' : ''} dans le registre ${state.reg.annee}. Les pièces de type DECOMPTE apparaissent ici.</td></tr>`;
    const sel = pieces.filter((p) => recap.selected.has(p.id));
    const total = P.round2(sel.reduce((s, p) => s + (Number(p.montant) || 0), 0));
    els.recapSummary.innerHTML = pieces.length ? `<b>${sel.length}</b> sur ${pieces.length} décompte(s) coché(s) · total <b>${fmtCHF(total)}</b>` : '';
    els.btnRecapPdf.disabled = !sel.length;
  }
  els.recapFilter.addEventListener('change', () => { const r = els.recapFilter.querySelector('input:checked'); recap.filter = r ? r.value : 'course'; renderRecap(); });
  els.btnRecapAll.addEventListener('click', () => { for (const p of recapPieces()) recap.selected.add(p.id); renderRecap(); });
  els.btnRecapNone.addEventListener('click', () => { for (const p of recapPieces()) recap.selected.delete(p.id); renderRecap(); });
  els.recapBody.addEventListener('change', (ev) => {
    const cb = ev.target.closest('input[data-recap]');
    if (!cb) return;
    if (cb.checked) recap.selected.add(cb.dataset.recap); else recap.selected.delete(cb.dataset.recap);
    renderRecap();
  });
  els.btnRecapPdf.addEventListener('click', async () => {
    const pieces = recapPieces().filter((p) => recap.selected.has(p.id));
    if (!pieces.length) { notice('warn', 'Aucun décompte coché.'); return; }
    const title = `Récapitulatif des décomptes – ${RECAP_LABEL[recap.filter]} ${state.reg.annee}`;
    try {
      const res = await F.buildRecapPdf(pieces, state.reg, { title });
      const name = `${title}.pdf`;
      const saved = await saveBlob(new Blob([res.bytes], { type: 'application/pdf' }), name);
      if (saved === 'cancelled') return;
      notice('ok', `Récapitulatif généré : <b>${pieces.length}</b> décompte(s), total <b>${fmtCHF(res.total)}</b>, ${res.pages} page(s).`);
    } catch (e) { notice('err', `Récapitulatif impossible : ${escapeHtml(e.message || e)}`); }
  });

  if (els.journalPending) els.journalPending.addEventListener('click', async (ev) => {
    if (!ev.target.closest('button[data-verif-all]')) return;
    const restent = R.pendingPieces(state.reg);
    if (!restent.length) return;
    if (!confirm(`Marquer comme vérifiées les ${restent.length} pièce(s) lues sur un scan ?\n\nÀ ne faire qu'après les avoir regardées : elles comptent déjà dans le solde.`)) return;
    R.markVerified(state.reg, restent.map((p) => p.id));
    await saveReg();
    renderJournal();
    notice('ok', `${restent.length} pièce(s) marquée(s) comme vérifiée(s).`);
  });

  /* ---------------- Chercher dans le journal ---------------- */
  // Le registre de référence porte 267 écritures pour une année : retrouver une pièce est le geste
  // le plus fréquent, et il se faisait à la molette.
  let rechercheDifferee = null;
  function relancerRecherche() {
    clearTimeout(rechercheDifferee);
    rechercheDifferee = setTimeout(renderJournal, 120); // une frappe rapide ne redessine pas 267 lignes à chaque lettre
  }
  if (els.journalSearch) {
    els.journalSearch.addEventListener('input', relancerRecherche);
    els.journalSearch.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && els.journalSearch.value) { ev.stopPropagation(); els.journalSearch.value = ''; renderJournal(); }
    });
  }
  if (els.journalOnlyDoubt) els.journalOnlyDoubt.addEventListener('change', renderJournal);
  /** Poser une recherche depuis ailleurs (un n° en double, une piste d'écart de caisse). */
  function chercherDansJournal(texte) {
    if (!els.journalSearch) return;
    els.journalSearch.value = String(texte == null ? '' : texte);
    if (els.journalOnlyDoubt) els.journalOnlyDoubt.checked = false;
    if (A.showPanel) A.showPanel('panelSaisie');
    renderJournal();
    els.journalSearch.focus();
    els.journalSearch.select();
    const carte = $('journalCard');
    if (carte) carte.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (els.journalNumbers) els.journalNumbers.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-search-nums]');
    if (b) chercherDansJournal(b.dataset.searchNums);
  });

  els.journalBody.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.searchClear) {
      if (els.journalSearch) els.journalSearch.value = '';
      if (els.journalOnlyDoubt) els.journalOnlyDoubt.checked = false;
      renderJournal();
      return;
    }
    if (b.dataset.verif) {
      const p = state.reg.pieces.find((x) => x.id === b.dataset.verif);
      if (!p) return;
      R.markVerified(state.reg, [p.id]);
      await saveReg();
      renderJournal();
      return;
    }
    if (b.dataset.apercu) {
      const p = state.reg.pieces.find((x) => x.id === b.dataset.apercu);
      if (p) await voirDocument(p);
      return;
    }
    if (b.dataset.edit) {
      const p = state.reg.pieces.find((x) => x.id === b.dataset.edit);
      if (!p) return;
      if (state.editingId !== p.id && !abandonnerFiche()) return;
      state.editingId = p.id; state.pending = []; state.retires = new Set(); state.dgeo.current = null;
      fillForm(p);
      els.ficheTitle.textContent = `n° ${p.no} (modification)`;
      montrerErreurs([]);
      afficherMode();
      renderJournal();
      $('ficheCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (b.dataset.del) {
      const p = state.reg.pieces.find((x) => x.id === b.dataset.del);
      if (!p || !confirm(`Supprimer la pièce n° ${p.no} (${p.libelle}) et ses justificatifs ?`)) return;
      for (const j of p.justificatifs) { try { await state.storage.remove(state.reg.annee, p.id, j.name); } catch (e) { /* ignore */ } }
      // pièce créée depuis un décompte DGEO : le décompte redevient « à saisir »
      if (p.source === 'dgeo' && window.CaisseDgeo) {
        try {
          const list = await window.CaisseDgeo.list();
          const d = list.find((x) => x.pieceId === p.id) || (p.ref ? list.find((x) => (x.numero || '') === p.ref) : null);
          if (d) { await window.CaisseDgeo.mark(d.id, { saisi: false, pieceId: null }); await refreshDgeo(); }
        } catch (e) { /* ignore */ }
      }
      R.removePiece(state.reg, p.id);
      await saveReg();
      if (state.editingId === p.id) newPiece();
      else if (!state.editingId && Number(els.pNo.value) > R.nextNo(state.reg)) els.pNo.value = R.nextNo(state.reg); // fiche vierge : le n° suivant redescend
      renderJournal();
    } else if (b.dataset.pdf) {
      const p = state.reg.pieces.find((x) => x.id === b.dataset.pdf);
      if (!p) return;
      await exportPdf([p], `Pièce ${p.no} caisse ${state.reg.annee}.pdf`);
    }
  });

  // Le document complet d'une pièce du journal, montré sans passer par un fichier : jusqu'ici il
  // fallait l'enregistrer sur le disque (bouton imprimante) pour simplement le regarder. L'aperçu
  // s'ouvre dans le cadre de la fiche, mais il dit de quelle pièce il parle : on peut demander
  // celui d'une ligne sans ouvrir sa fiche, et une fiche en cours de saisie n'est pas perdue.
  async function voirDocument(p) {
    try {
      const res = await F.buildPdf([p], state.reg, (piece, j) => state.storage.read(state.reg.annee, piece.id, j.name));
      showPreview(res.bytes, 'application/pdf', `Pièce n° ${p.no} : la fiche et ${plur((p.justificatifs || []).length, 'justificatif')}`);
      if (res.skipped.length) notice('warn', `Justificatifs non inclus : ${escapeHtml(res.skipped.join(' ; '))}.`);
    } catch (e) { notice('err', `Aperçu impossible : ${escapeHtml(e.message || e)}`); }
  }

  /** Un justificatif seul : le scan signé sans le reste, un ticket qu'on veut relire de près. */
  async function ouvrirJustificatif(raw) {
    const cut = raw.indexOf(':');
    const ou = cut < 0 ? raw : raw.slice(0, cut);
    const cle = cut < 0 ? '' : raw.slice(cut + 1); // le nom du fichier peut contenir « : »
    let octets = null; let nom = cle; let genre = '';
    if (ou === 'pending') {
      const f = state.pending[Number(cle)];
      if (!f) return;
      octets = f.bytes; nom = f.name; genre = f.kind;
    } else {
      const p = state.reg.pieces.find((x) => x.id === state.editingId);
      const j = p && (p.justificatifs || []).find((x) => x.name === cle);
      if (!p || !j) return;
      genre = j.kind;
      try { octets = await state.storage.read(state.reg.annee, p.id, j.name); } catch (e) { octets = null; }
      if (!octets) { notice('err', `Justificatif introuvable : ${escapeHtml(j.name)}.`); return; }
    }
    const mime = TYPE_MIME[genre];
    if (!mime) { notice('warn', `« ${escapeHtml(nom)} » : format ${escapeHtml(genre || 'inconnu')}, pas affichable ici.`); return; }
    showPreview(octets, mime, nom);
  }

  async function exportPdf(pieces, name) {
    try {
      const res = await F.buildPdf(pieces, state.reg, (piece, j) => state.storage.read(state.reg.annee, piece.id, j.name), { title: name.replace(/\.pdf$/, '') });
      const saved = await saveBlob(new Blob([res.bytes], { type: 'application/pdf' }), name);
      if (saved === 'cancelled') return;
      notice('ok', `PDF généré : ${res.pages} page(s)${res.skipped.length ? ` – justificatifs non inclus : ${escapeHtml(res.skipped.join(' ; '))}` : ''}.`);
    } catch (e) { notice('err', `PDF impossible : ${escapeHtml(e.message || e)}`); }
  }

  els.btnRegPdf.addEventListener('click', async () => {
    const from = els.regPdfFrom && els.regPdfFrom.value ? Number(els.regPdfFrom.value) : null;
    const pieces = state.reg.pieces.filter((p) => from == null || (p.no != null && p.no >= from));
    if (!pieces.length) { notice('warn', 'Aucune pièce à imprimer.'); return; }
    const nos = pieces.map((p) => p.no).filter((n) => n != null);
    // aucun numéro lisible : pas de plage dans le nom (elle valait « n° Infinity à -Infinity »)
    const plage = nos.length ? ` n° ${Math.min.apply(null, nos)} à ${Math.max.apply(null, nos)}` : '';
    await exportPdf(pieces, `Pièces caisse ${state.reg.annee}${plage}.pdf`);
  });

  els.btnRegExcel.addEventListener('click', async () => {
    const reg = state.reg;
    if (!reg.pieces.length) { notice('warn', 'Aucune pièce dans le registre.'); return; }
    const invalid = reg.pieces.filter((p) => R.validate(p, reg).length);
    if (invalid.length && !confirm(`${invalid.length} pièce(s) incomplète(s) (n° ${invalid.map((p) => p.no).join(', ')}). Générer quand même ?`)) return;
    try {
      const { workbook, finalBalance } = X.buildWorkbook({ opening: { date: reg.opening.date, amount: reg.opening.amount }, entries: R.entriesOf(reg) });
      const buf = await workbook.xlsx.writeBuffer();
      const name = `Caisse écoles ${reg.annee}.xlsx`;
      const saved = await saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name);
      if (saved === 'cancelled') return;
      try { localStorage.setItem('caisse.dernierSolde', JSON.stringify({ amount: finalBalance, date: reg.pieces[reg.pieces.length - 1].date })); } catch (e) { /* ignore */ }
      notice('ok', `Fichier <b>${escapeHtml(saved || name)}</b> généré : ${reg.pieces.length} écriture(s), solde final <b>${fmtCHF(finalBalance)}</b>.`);
    } catch (e) { notice('err', `Erreur lors de la génération : ${escapeHtml(e.message || e)}`); }
  });

  els.btnRegExport.addEventListener('click', async () => {
    await saveBlob(new Blob([R.serialize(state.reg)], { type: 'application/json' }), `Registre caisse ${state.reg.annee}.json`);
  });
  els.btnRegImport.addEventListener('click', () => els.regImportFile.click());
  els.regImportFile.addEventListener('change', async () => {
    const f = els.regImportFile.files && els.regImportFile.files[0];
    els.regImportFile.value = '';
    if (!f) return;
    const reg = R.parse(await f.text());
    if (!reg) { notice('err', 'Ce fichier n\'est pas une sauvegarde de registre.'); return; }
    if (!confirm(`Remplacer le registre ${reg.annee} (${reg.pieces.length} pièce(s)) par cette sauvegarde ? Les justificatifs déjà enregistrés sont conservés.`)) return;
    await state.storage.save(reg, { remplacer: true });
    if (!state.years.includes(reg.annee)) state.years.push(reg.annee);
    await openYear(reg.annee);
    notice('ok', `Registre ${reg.annee} restauré.`);
  });

  /* ---------------- Reprise d'un classeur Excel ---------------- */
  // Année commencée à l'ancienne (classeur tenu à la main ou produit depuis les pièces scannées) :
  // ses écritures entrent dans le registre, rien n'est compté deux fois, la numérotation continue.
  async function importWorkbook(buffer, fileName) {
    if (!state.reg) await init();
    const reg = state.reg;
    let data;
    try { data = await X.readWorkbook(buffer); } catch (e) { notice('err', `Impossible de lire ce classeur : ${escapeHtml(e.message || e)}`); return null; }
    const otherYears = R.piecesFromEntries(data.entries, 'excel').filter((p) => p.montant > 0 && p.date && String(p.date).slice(0, 4) !== String(reg.annee)).length;
    const includeOther = otherYears > 0 && confirm(`${otherYears} écriture(s) du classeur ne sont pas de l'année ${reg.annee} du registre ouvert. Les reprendre quand même ?`);
    const r = R.mergeEntries(reg, data.entries, { source: 'excel', opening: data.opening, otherYears: includeOther });
    await saveReg();
    renderJournal();
    newPiece();
    if (A && A.learnEntries) A.learnEntries(data.entries);
    const parts = [`<b>${r.added.length}</b> écriture(s) reprise(s) de <b>${escapeHtml(fileName || 'ce classeur')}</b> dans le registre ${reg.annee}`];
    if (r.skipped.length) parts.push(`${r.skipped.length} déjà présente(s) (même n° et même montant), non comptée(s) deux fois`);
    if (r.conflicts.length) parts.push(`<b>${r.conflicts.length} n° déjà pris avec un autre montant</b>, non reprise(s) : ${r.conflicts.slice(0, 10).map((p) => `n° ${p.no}`).join(', ')}`);
    if (r.otherYears.length && !includeOther) parts.push(`${r.otherYears.length} d'une autre année ignorée(s)`);
    if (r.noAmount.length) parts.push(`${r.noAmount.length} ligne(s) sans montant ignorée(s)`);
    if (r.openingTaken) parts.push(`solde à nouveau repris du classeur : <b>${fmtCHF(reg.opening.amount)}</b>${reg.opening.date ? ` au ${escapeHtml(P.isoToDisplay(reg.opening.date))}` : ''}`);
    if (r.openingDiffers) parts.push(`le solde à nouveau du classeur (${fmtCHF(Number(data.opening.amount) || 0)}) diffère de celui du registre (${fmtCHF(reg.opening.amount)}), conservé : vérifiez-le`);
    notice(r.conflicts.length ? 'warn' : 'ok', parts.join(' · ') + '.');
    return r;
  }
  if (els.btnRegExcelIn && els.regExcelFile) {
    els.btnRegExcelIn.addEventListener('click', () => els.regExcelFile.click());
    els.regExcelFile.addEventListener('change', async () => {
      const f = els.regExcelFile.files && els.regExcelFile.files[0];
      els.regExcelFile.value = '';
      if (!f) return;
      await importWorkbook(await f.arrayBuffer(), f.name);
    });
  }

  /* ---------------- Depuis les pièces scannées ---------------- */
  /**
   * Ajoute au registre de l'année des écritures lues sur des PDF ; getImage(entry) peut fournir
   * l'image JPEG de la pièce (Uint8Array) pour la joindre en justificatif.
   */
  async function addFromScan(entries, getImage) {
    if (!state.reg) await init();
    const year = state.reg.annee;
    const pieces = R.piecesFromEntries(entries);
    const wrongYear = pieces.filter((p) => p.date && String(p.date).slice(0, 4) !== String(year));
    // refuser ne jette plus le lot entier : seules les pièces d'une autre année sont laissées de côté
    const skipYear = wrongYear.length > 0
      && !confirm(`${wrongYear.length} pièce(s) ne sont pas de l'année ${year} du registre ouvert. Les ajouter quand même ?\n\nAnnuler : seules les pièces de ${year} sont ajoutées.`);
    // Deux pièces sans numéro sont la même si tout le reste concorde (comme « Reprendre un
    // classeur »). La comparaison ne porte que sur le registre TEL QU'IL ÉTAIT avant ce lot :
    // deux pièces réellement distinctes du même lot (même jour, même montant, même libellé)
    // doivent toutes deux être ajoutées, quitte à se voir dans le journal.
    const avant = state.reg.pieces.slice();
    const sameLine = (a, b) => a.date === b.date && a.sens === b.sens && Math.abs((a.montant || 0) - (b.montant || 0)) < 0.005
      && (a.libelle || R.composeLibelle(a)) === (b.libelle || R.composeLibelle(b));
    let added = 0; let dup = 0; let sansMontant = 0; let autreAnnee = 0; const conflicts = [];
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (!(p.montant > 0)) { sansMontant++; continue; } // ligne sans montant lisible : rien à enregistrer
      if (skipYear && wrongYear.includes(p)) { autreAnnee++; continue; }
      const same = p.no != null
        ? state.reg.pieces.find((x) => x.no === p.no)
        : avant.find((x) => x.no == null && sameLine(x, p));
      if (same) { if (Math.abs((same.montant || 0) - p.montant) < 0.005 && same.sens === p.sens) dup++; else conflicts.push(p.no); continue; }
      if (getImage) {
        try {
          const img = await getImage(entries[i]);
          if (img) { const saved = await state.storage.attach(year, p.id, `scan-piece-${p.no}.jpg`, img); p.justificatifs.push({ name: saved.name, size: saved.size, kind: 'jpeg' }); }
        } catch (e) { /* sans image */ }
      }
      R.upsertPiece(state.reg, p);
      added++;
    }
    await saveReg();
    renderJournal();
    newPiece();
    notice(added && !conflicts.length ? 'ok' : 'warn', `${added} pièce(s) ajoutée(s) au registre ${year}${dup ? `, ${dup} déjà présente(s) (même n° et même montant), non comptée(s) deux fois` : ''}` +
      `${conflicts.length ? `, <b>${conflicts.length} n° déjà pris avec un autre montant</b>, non ajoutée(s) : n° ${conflicts.join(', ')}` : ''}` +
      `${sansMontant ? `, ${sansMontant} ligne(s) sans montant ignorée(s)` : ''}` +
      `${autreAnnee ? `, ${autreAnnee} pièce(s) d'une autre année laissée(s) de côté` : ''}.`);
    return added;
  }

  /* ---------------- Pont avec l'onglet Décompte DGEO ---------------- */
  // Chaque décompte terminé dans l'autre onglet (fichier Excel généré) est proposé ici comme
  // pièce DECOMPTE pré-remplie : classe, période, enseignant-e, montants du formulaire.
  const dgeoLabel = (d) => `${d.numero ? `n° ${d.numero}` : (d.filename || d.id)} – ${d.type_activite === 'camp' ? 'Camp' : "Course d'école"}${d.classe ? ` ${d.classe}` : ''}${d.activite ? ` ${d.activite}` : ''}${d.enseignant ? ` – ${d.personneAffichee || d.enseignant}` : ''}`;
  function initDgeo() {
    if (!window.CaisseDgeo) return;
    els.btnOpenDgeo.classList.remove('hidden');
    els.btnOpenDgeo.addEventListener('click', () => window.CaisseDgeo.show());
    window.CaisseDgeo.onNew((d) => {
      refreshDgeo().then(() => {
        if (!d || d.saisi) return;
        notice('ok', `Décompte terminé dans l'onglet Décompte DGEO : <b>${escapeHtml(dgeoLabel(d))}</b>${d.excel ? ' (fichier Excel enregistré)' : ''}. Il est proposé au-dessus de la fiche : « Créer la pièce ».`);
      });
    });
    refreshDgeo();
  }
  async function refreshDgeo() {
    if (!window.CaisseDgeo) return;
    try { state.dgeo.list = await window.CaisseDgeo.list(); } catch (e) { state.dgeo.list = []; }
    renderDgeo();
  }
  function renderDgeo() {
    const pending = state.dgeo.list.filter((d) => !d.saisi);
    if (!pending.length) { els.dgeoPending.classList.add('hidden'); els.dgeoPending.innerHTML = ''; return; }
    els.dgeoPending.innerHTML = `<div class="legend">Décompte${pending.length > 1 ? 's' : ''} terminé${pending.length > 1 ? 's' : ''} dans l'onglet Décompte DGEO, à passer en pièce comptable :</div>` +
      pending.slice().reverse().map((d) => `<div class="item"><span class="what"><b>${escapeHtml(dgeoLabel(d))}</b>` +
        `<span class="legend"> · part État ${d.total != null ? fmtCHF(d.total) : '–'}${d.form_total != null ? ` · dépenses du formulaire ${fmtCHF(d.form_total)}` : ''}${d.date_debut ? ` · ${escapeHtml(d.date_debut)}${d.date_fin && d.date_fin !== d.date_debut ? `–${escapeHtml(d.date_fin)}` : ''}` : ''}</span></span>` +
        `<button type="button" class="small" data-dgeo-use="${escapeHtml(d.id)}">Créer la pièce</button>` +
        `${d.excel ? `<button type="button" class="small" data-dgeo-excel="${escapeHtml(d.id)}">Ouvrir l'Excel</button>` : ''}` +
        `<button type="button" class="small" data-dgeo-forget="${escapeHtml(d.id)}" title="Ne pas créer de pièce pour ce décompte">Ignorer</button></div>`).join('');
    els.dgeoPending.classList.remove('hidden');
  }
  els.dgeoPending.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.dgeoUse) {
      const d = state.dgeo.list.find((x) => x.id === b.dataset.dgeoUse);
      if (d) useDecompte(d);
    } else if (b.dataset.dgeoExcel) {
      if (!(await window.CaisseDgeo.openExcel(b.dataset.dgeoExcel))) notice('warn', 'Le fichier Excel de ce décompte est introuvable (déplacé ou renommé).');
    } else if (b.dataset.dgeoForget) {
      await window.CaisseDgeo.forget(b.dataset.dgeoForget);
      if (state.dgeo.current && state.dgeo.current.id === b.dataset.dgeoForget) state.dgeo.current = null;
      await refreshDgeo();
    }
  });
  /** Remplit la fiche depuis un décompte DGEO ; la personne vérifie le montant, le sens et le compte, puis enregistre. */
  function useDecompte(d) {
    if (!state.reg || !abandonnerFiche()) return null;
    const { piece, amounts, amountSource } = R.pieceFromDecompte(d, state.reg);
    if (P.correctPerson && piece.personne) { const c = P.correctPerson(piece.personne, P.buildIndex(vocab())); if (c) piece.personne = c; }
    piece.libelle = R.composeLibelle(piece);
    state.editingId = null; state.pending = []; state.retires = new Set(); state.draftId = piece.id; state.dgeo.current = d;
    fillForm(piece);
    afficherMode();
    els.ficheTitle.textContent = `n° ${piece.no} – depuis Décompte DGEO ${d.numero ? `n° ${d.numero}` : ''}`.trim();
    const srcLabel = { enseignant: "payé par l'enseignant-e (formulaire)", formulaire: 'dépenses du formulaire', etat: 'part État calculée' };
    const opts = [['enseignant', "payé par l'enseignant-e"], ['formulaire', 'dépenses du formulaire'], ['etat', 'part État (remboursement DGEO)']]
      .filter(([k]) => amounts[k] != null)
      .map(([k, label]) => `<button type="button" class="small" data-amount="${amounts[k]}">${label} ${fmtCHF(amounts[k])}</button>`).join(' ');
    els.ficheErrors.innerHTML = `<div class="notice ok">Fiche pré-remplie depuis le décompte <b>${escapeHtml(dgeoLabel(d))}</b>. ` +
      `${amountSource ? `Montant proposé : ${srcLabel[amountSource]}.` : 'Aucun montant trouvé dans le décompte.'} ` +
      `Vérifiez le montant, le sens (sortie de caisse si la caisse rembourse l'enseignant-e) et le compte, puis enregistrez.${opts ? `<div style="margin-top:6px">Montants du décompte : ${opts}</div>` : ''}</div>`;
    hidePreview();
    $('ficheCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    els.pMontant.focus();
    return piece;
  }
  els.ficheErrors.addEventListener('click', (ev) => {
    const n = ev.target.closest('button[data-prendre-no]');
    if (n) {
      els.pNo.value = n.dataset.prendreNo;
      els.pNo.dispatchEvent(new Event('input', { bubbles: true }));
      els.pNo.focus();
      return;
    }
    const b = ev.target.closest('button[data-amount]');
    if (!b) return;
    els.pMontant.value = Number(b.dataset.amount).toFixed(2);
    refreshLibelle();
  });

  /* ---------------- Où sont les données : ce PC, ou le serveur ---------------- */
  // Seulement dans l'application fenêtrée : le fichier HTML seul garde tout dans le navigateur.
  const DN = window.CaisseEmplacement || null;
  const carteEmpl = $('carteEmplacement');
  function noticeEmpl(kind, html) {
    const box = $('emplacementNotices');
    if (!box) { notice(kind, html); return; }
    const div = document.createElement('div');
    div.className = `notice ${kind}`;
    div.innerHTML = html;
    box.prepend(div);
  }
  async function majEmplacement() {
    if (!DN || !carteEmpl) return;
    let e;
    try { e = await DN.etat(); } catch (err) { return; }
    carteEmpl.classList.remove('hidden');
    $('emplacementChemin').textContent = e.chemin;
    $('emplacementGenre').textContent = e.partage ? 'partagées' : 'sur ce PC';
    $('btnEmplacementChoisirTexte').textContent = e.partage ? 'Changer de dossier…' : 'Mettre les données sur le serveur…';
    $('btnEmplacementChoisir').disabled = !e.modifiable;
    $('btnEmplacementLocal').classList.toggle('hidden', !(e.partage && e.modifiable));
    const reseau = /^\\\\[^\\]/.test(e.chemin);
    let note;
    if (e.partage && !e.modifiable) note = 'Emplacement fixé par l\'informatique (variable COMPTA_DONNEES) : il ne se change pas d\'ici.';
    else if (e.partage && !reseau) note = `Réglé par <code>${escapeHtml(e.reglage)}</code>. Attention : une lettre de lecteur (Z:) n'est pas forcément la même sur chaque poste, et le copieur ne la connaît pas. Préférez l'adresse <code>\\\\SERVEUR\\partage</code>.`;
    else if (e.partage) note = `Réglé par <code>${escapeHtml(e.reglage)}</code> — effacer ce fichier revient aussi aux données de ce PC. Le copieur dépose dans <code>${escapeHtml(e.chemin)}\\Scans</code>.`;
    else note = 'Les données de ce PC, dans le dossier « data » à côté du programme. Pour les partager : « Mettre les données sur le serveur… », puis tapez l\'adresse <code>\\\\SERVEUR\\partage</code> dans la barre du haut de la fenêtre qui s\'ouvre.';
    $('emplacementNote').innerHTML = note;
  }
  if (DN && carteEmpl) {
    $('btnEmplacementChoisir').addEventListener('click', async () => {
      let r;
      try { r = await DN.choisir(); } catch (err) { noticeEmpl('err', escapeHtml((err && err.message) || err)); return; }
      if (r.erreur) { noticeEmpl('err', escapeHtml(r.erreur)); return; }
      if (!r.change) return;
      const quoi = r.dejaUneCaisse
        ? 'Ce dossier contient déjà une caisse — celle des collègues : l\'application redémarre dessus. Les données de ce PC restent où elles sont.'
        : (r.copie && r.copie.copie ? 'Données emportées sur le serveur. L\'application redémarre dessus…' : 'L\'application redémarre sur ce dossier…');
      noticeEmpl('ok', quoi);
    });
    $('btnEmplacementLocal').addEventListener('click', async () => {
      if (!confirm('Revenir aux données de ce PC ? Les données du serveur restent où elles sont, mais ce poste ne les verra plus.')) return;
      const r = await DN.local();
      if (r && r.change) noticeEmpl('ok', 'L\'application redémarre sur les données de ce PC…');
    });
    $('btnEmplacementOuvrir').addEventListener('click', () => { DN.ouvrir().catch(() => {}); });
    majEmplacement();
  }

  window.CaisseSaisie = { state, init, majListes, openYear, addFromScan, importWorkbook, renderJournal, useDecompte, refreshDgeo, saveReg, openPiecePdf, ficheAuto, chercherDansJournal, ficheModifiee };
  init().catch((e) => { console.error(e); els.regInfo.textContent = `Registre indisponible : ${e && e.message ? e.message : e}`; });
})();
