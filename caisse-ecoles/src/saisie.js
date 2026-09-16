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
  for (const id of ['regYear', 'btnNewYear', 'regOpeningDate', 'regOpeningAmount', 'regCaisse', 'regInfo', 'btnRegOpenDir',
    'ficheTitle', 'pNo', 'pDate', 'pType', 'pObjet', 'pClasse', 'pPeriode', 'pDetail', 'pPersonne', 'pLibelle', 'pLibelleEdit', 'pCompte', 'pCompteSugg',
    'pMontant', 'pSensDebit', 'pSensCredit', 'pSensHint', 'pFiles', 'pFilesList', 'ficheErrors', 'btnPieceSave', 'btnPieceNew', 'btnPiecePreview', 'fichePreview', 'ficheFrame', 'btnPreviewClose', 'dgeoPending', 'btnOpenDgeo',
    'journalYear', 'journalBody', 'journalTotals', 'btnRegExcel', 'btnRegPdf', 'regPdfFrom', 'btnRegExport', 'regImportFile', 'btnRegImport', 'regNotices', 'regClassList', 'regPersonList', 'regAccountList']) {
    els[id] = $(id);
  }
  if (!els.regYear) return; // page sans le panneau de saisie

  const state = { storage: null, reg: null, editingId: null, pending: [], years: [], previewUrl: null, dgeo: { list: [], current: null } };

  const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtCHF = (n) => { const v = Number(n) || 0; const [i, d] = v.toFixed(2).split('.'); return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, "'")}.${d}`; };
  function notice(kind, html) {
    const div = document.createElement('div');
    div.className = `notice ${kind}`;
    div.innerHTML = html;
    els.regNotices.prepend(div);
    setTimeout(() => div.remove(), kind === 'err' ? 12000 : 7000);
  }
  async function saveBlob(blob, name) {
    if (A.saveBlob) return A.saveBlob(blob, name);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    return null;
  }
  const vocab = () => (A.state && A.state.vocab) || window.CaisseVocab || P.emptyVocabulary();

  /* ---------------- Registre ---------------- */
  async function init() {
    state.storage = R.storage();
    if (!state.storage) { els.regInfo.textContent = 'Stockage indisponible dans ce navigateur.'; return; }
    fillLists();
    state.years = await state.storage.years();
    const thisYear = new Date().getFullYear();
    let year = state.years.length ? Math.max.apply(null, state.years) : thisYear;
    try { const saved = Number(localStorage.getItem('caisse.registre.annee')); if (saved && state.years.includes(saved)) year = saved; } catch (e) { /* ignore */ }
    await openYear(year);
    initDgeo();
  }

  function fillLists() {
    const v = vocab();
    const setList = (el, items) => { if (el) el.innerHTML = items.map((x) => `<option value="${escapeHtml(x)}">`).join(''); };
    setList(els.regClassList, (v.classTokens || []).slice().sort((a, b) => a.localeCompare(b, 'fr', { numeric: true })));
    setList(els.regPersonList, (v.persons || []).slice().sort((a, b) => a.localeCompare(b, 'fr')));
    setList(els.regAccountList, (v.accounts || []).slice().sort());
    if (els.pType && !els.pType.options.length) {
      els.pType.innerHTML = R.TYPES.map((t) => `<option value="${t}">${t}</option>`).join('');
    }
    if (els.pObjet && !els.pObjet.options.length) {
      els.pObjet.innerHTML = P.OBJET_LIST.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
    }
  }

  async function openYear(year) {
    let reg = await state.storage.load(year);
    if (!reg) {
      const prev = state.years.filter((y) => y < year).sort().pop();
      const prevReg = prev ? await state.storage.load(prev) : null;
      const opening = prevReg ? R.journal(prevReg).end : 0;
      reg = R.emptyRegister(year, { caisse: (A.state && A.state.caisse) || undefined, openingDate: `${year}-01-01`, openingAmount: opening });
      await state.storage.save(reg);
      if (!state.years.includes(year)) state.years.push(year);
      state.years.sort();
    }
    state.reg = reg;
    try { localStorage.setItem('caisse.registre.annee', String(year)); } catch (e) { /* ignore */ }
    renderYears();
    els.regOpeningDate.value = reg.opening.date || '';
    els.regOpeningAmount.value = reg.opening.amount;
    els.regCaisse.value = reg.caisse;
    els.journalYear.textContent = String(reg.annee);
    const loc = await state.storage.location();
    els.regInfo.innerHTML = state.storage.kind === 'fichiers'
      ? `Enregistré dans les fichiers de l'application : <code>${escapeHtml(loc)}</code>`
      : `Enregistré dans la ${escapeHtml(loc)}.`;
    if (els.btnRegOpenDir) els.btnRegOpenDir.classList.toggle('hidden', state.storage.kind !== 'fichiers');
    newPiece();
    renderJournal();
  }

  function renderYears() {
    const years = state.years.slice().sort();
    els.regYear.innerHTML = years.map((y) => `<option value="${y}"${state.reg && y === state.reg.annee ? ' selected' : ''}>${y}</option>`).join('');
  }

  async function saveReg() {
    state.reg.updatedAt = new Date().toISOString();
    await state.storage.save(state.reg);
  }

  els.regYear.addEventListener('change', () => openYear(Number(els.regYear.value)));
  els.btnNewYear.addEventListener('click', async () => {
    const def = (state.years.length ? Math.max.apply(null, state.years) : new Date().getFullYear()) + 1;
    const v = prompt('Nouvelle année du registre :', String(def));
    if (!v) return;
    const y = Number(v);
    if (!y || y < 1990 || y > 2100) { alert('Année invalide.'); return; }
    await openYear(y);
    notice('ok', `Registre ${y} créé. Le solde à nouveau proposé est le solde final de l'année précédente : vérifiez-le.`);
  });
  els.regOpeningDate.addEventListener('change', async () => { state.reg.opening.date = els.regOpeningDate.value; await saveReg(); renderJournal(); });
  els.regOpeningAmount.addEventListener('change', async () => { state.reg.opening.amount = P.round2(Number(String(els.regOpeningAmount.value).replace(',', '.')) || 0); await saveReg(); renderJournal(); });
  els.regCaisse.addEventListener('change', async () => { state.reg.caisse = els.regCaisse.value.trim() || P.DEFAULT_CAISSE; await saveReg(); });
  if (els.btnRegOpenDir) els.btnRegOpenDir.addEventListener('click', () => { if (window.CaisseFiles) window.CaisseFiles.openDir(); });

  /* ---------------- Fiche ---------------- */
  function newPiece() {
    const p = R.newPiece(state.reg);
    state.editingId = null;
    state.pending = [];
    state.dgeo.current = null;
    fillForm(p);
    els.ficheTitle.textContent = `n° ${p.no}`;
    els.ficheErrors.innerHTML = '';
    hidePreview();
  }

  function fillForm(p) {
    els.pNo.value = p.no == null ? '' : p.no;
    els.pDate.value = p.date || '';
    els.pType.value = R.TYPES.includes(p.type) ? p.type : R.TYPES[0];
    els.pObjet.value = P.OBJET_LIST.includes(p.objet) ? p.objet : 'Autre';
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
    setSens(p.sens || R.sensFor(p.type), true);
    renderFiles(p);
    refreshSuggestions();
  }

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
      montant: Number(String(els.pMontant.value).replace(',', '.')) || 0,
      sens: els.pSensDebit.checked ? 'debit' : (els.pSensCredit.checked ? 'credit' : null),
      justificatifs: base ? base.justificatifs : [],
      source: base ? base.source : (state.dgeo.current ? 'dgeo' : 'saisie'),
      ref: base ? base.ref : (state.dgeo.current ? (state.dgeo.current.numero || state.dgeo.current.filename || '') : ''),
    }));
    p.libelle = els.pLibelleEdit.checked ? els.pLibelle.value.trim() : R.composeLibelle(p);
    return p;
  }

  function setSens(sens, fromType) {
    els.pSensDebit.checked = sens === 'debit';
    els.pSensCredit.checked = sens === 'credit';
    const logic = R.sensFor(els.pType.value);
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
    const sugg = R.accountSuggestions(p, vocab(), state.reg).slice(0, 4);
    els.pCompteSugg.innerHTML = sugg.length
      ? 'Habituel : ' + sugg.map((s) => `<button type="button" class="small${s.compte === els.pCompte.value ? ' primary' : ''}" data-account="${escapeHtml(s.compte)}" title="${s.n} écriture(s) de ce genre dans le classeur">${escapeHtml(s.compte)}</button>`).join(' ')
      : '<span class="legend">Aucun compte habituel connu pour ce type : choisissez dans la liste.</span>';
    if (!els.pCompte.value && sugg.length && sugg[0].niveau <= 1) { els.pCompte.value = sugg[0].compte; state.autoAccount = true; }
  }

  els.pCompteSugg.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-account]');
    if (!b) return;
    els.pCompte.value = b.dataset.account;
    state.autoAccount = false;
    refreshSuggestions();
  });
  els.pType.addEventListener('change', () => { setSens(null, true); els.pCompte.value = ''; state.autoAccount = true; refreshSuggestions(); refreshLibelle(); });
  // objet ou classe modifiés : le compte habituel change souvent (degré, activité) -> re-proposé
  for (const id of ['pObjet', 'pClasse']) els[id].addEventListener('input', () => { if (state.autoAccount) els.pCompte.value = ''; refreshSuggestions(); refreshLibelle(); });
  els.pDetail.addEventListener('input', () => { refreshSuggestions(); refreshLibelle(); });
  els.pCompte.addEventListener('input', () => { state.autoAccount = false; refreshSuggestions(); });
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
    const b = ev.target.closest('button[data-remove]');
    if (!b) return;
    const [where, key] = b.dataset.remove.split(':');
    if (where === 'pending') state.pending.splice(Number(key), 1);
    else if (state.editingId) {
      const p = state.reg.pieces.find((x) => x.id === state.editingId);
      if (p && confirm(`Retirer le justificatif « ${key} » ?`)) {
        p.justificatifs = p.justificatifs.filter((j) => j.name !== key);
        try { await state.storage.remove(state.reg.annee, p.id, key); } catch (e) { /* ignore */ }
        await saveReg();
      }
    }
    renderFiles(formPiece());
  });
  function renderFiles(p) {
    const items = [];
    for (const j of p.justificatifs || []) items.push(`<li>${escapeHtml(j.name)} <span class="legend">(${j.kind}, ${Math.round(j.size / 1024)} Ko)</span> <button type="button" class="small" data-remove="saved:${escapeHtml(j.name)}">retirer</button></li>`);
    state.pending.forEach((f, i) => items.push(`<li>${escapeHtml(f.name)} <span class="legend">(${f.kind}, ${Math.round(f.bytes.length / 1024)} Ko, à enregistrer)</span> <button type="button" class="small" data-remove="pending:${i}">retirer</button></li>`));
    els.pFilesList.innerHTML = items.length ? `<ul>${items.join('')}</ul>` : '<span class="legend">Aucun justificatif joint (tickets, factures, photos : PDF, JPG ou PNG).</span>';
  }

  // enregistrement
  els.btnPieceSave.addEventListener('click', async () => {
    const p = formPiece();
    const errs = R.validate(p, state.reg);
    if (errs.length) {
      els.ficheErrors.innerHTML = `<div class="notice err"><b>La pièce n'est pas enregistrée :</b><ul>${errs.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`;
      return;
    }
    els.ficheErrors.innerHTML = '';
    // justificatifs en attente -> fichiers
    for (const f of state.pending) {
      try {
        const saved = await state.storage.attach(state.reg.annee, p.id, f.name, f.bytes);
        p.justificatifs.push({ name: saved.name, size: saved.size, kind: f.kind });
      } catch (e) {
        notice('err', `Justificatif « ${escapeHtml(f.name)} » non enregistré : ${escapeHtml(e.message || e)}`);
      }
    }
    state.pending = [];
    const wasEdit = !!state.editingId;
    R.upsertPiece(state.reg, p);
    await saveReg();
    if (A.rememberVocabulary) A.rememberVocabulary({ persons: [p.personne], classTokens: p.classe ? [p.classe] : [] });
    if (state.dgeo.current && window.CaisseDgeo) {
      try { await window.CaisseDgeo.mark(state.dgeo.current.id, { saisi: true, pieceId: p.id }); } catch (e) { /* ignore */ }
      await refreshDgeo();
    }
    renderJournal();
    notice('ok', `Pièce n° ${p.no} ${wasEdit ? 'modifiée' : 'enregistrée'} : ${escapeHtml(p.libelle)} – ${p.sens === 'debit' ? 'Débit' : 'Crédit'} ${fmtCHF(p.montant)}.`);
    state.draftId = null;
    newPiece();
    els.pDate.focus();
  });
  els.btnPieceNew.addEventListener('click', () => { state.draftId = null; newPiece(); });

  // aperçu de la fiche (PDF)
  els.btnPiecePreview.addEventListener('click', async () => {
    const p = formPiece();
    if (!p.libelle) p.libelle = R.composeLibelle(p);
    try {
      const res = await F.buildPdf([p], state.reg, (piece, j) => readAttachment(piece, j));
      showPreview(res.bytes);
    } catch (e) { notice('err', `Aperçu impossible : ${escapeHtml(e.message || e)}`); }
  });
  function showPreview(bytes) {
    hidePreview();
    state.previewUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    els.ficheFrame.src = state.previewUrl;
    els.fichePreview.classList.remove('hidden');
  }
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
  function renderJournal() {
    const j = R.journal(state.reg);
    els.journalBody.innerHTML = j.rows.map((r) => {
      const p = state.reg.pieces.find((x) => x.id === r.id);
      const ico = (id) => `<svg class="ico"><use href="#i-${id}"/></svg>`;
      return `<tr data-id="${r.id}"${state.editingId === r.id ? ' class="selected"' : ''}>` +
        `<td>${r.no == null ? '' : r.no}</td><td>${escapeHtml(P.isoToDisplay(r.date))}</td><td class="compte">${escapeHtml(r.compte)}</td><td class="libelle" title="${escapeHtml(r.libelle)}">${escapeHtml(r.libelle)}</td>` +
        `<td class="num">${r.debit != null ? fmtCHF(r.debit) : ''}</td><td class="num">${r.credit != null ? fmtCHF(r.credit) : ''}</td><td class="num solde">${fmtCHF(r.solde)}</td>` +
        `<td>${p && p.justificatifs.length ? `<span title="${p.justificatifs.length} justificatif(s)">${ico('clip')} ${p.justificatifs.length}</span>` : ''}${p && p.source === 'scan' ? ' <span class="tag" title="Lue sur un scan">scan</span>' : ''}${p && p.source === 'dgeo' ? ` <span class="tag" title="Créée depuis Décompte DGEO${p.ref ? ` (${escapeHtml(p.ref)})` : ''}">DGEO</span>` : ''}</td>` +
        `<td class="acts"><button type="button" class="small ghost" data-edit="${r.id}" title="Modifier la pièce">${ico('pen')}</button><button type="button" class="small ghost" data-pdf="${r.id}" title="PDF de la pièce">${ico('printer')}</button><button type="button" class="small ghost danger" data-del="${r.id}" title="Supprimer la pièce">${ico('trash')}</button></td></tr>`;
    }).join('') || '<tr><td colspan="9" class="legend">Aucune pièce dans ce registre. Remplissez la fiche à gauche : chaque pièce enregistrée apparaît ici avec le solde cumulé.</td></tr>';
    els.journalTotals.innerHTML = `<div class="t"><div class="l">Solde à nouveau</div><div class="v">${fmtCHF(j.start)}</div></div>` +
      `<div class="t"><div class="l">Débits (entrées)</div><div class="v">+ ${fmtCHF(j.debits)}</div></div>` +
      `<div class="t"><div class="l">Crédits (sorties)</div><div class="v">− ${fmtCHF(j.credits)}</div></div>` +
      `<div class="t end"><div class="l">Solde final</div><div class="v">${fmtCHF(j.end)}</div></div>` +
      `<div class="t"><div class="l">Pièces</div><div class="v">${state.reg.pieces.length}</div></div>`;
    // sélecteur « depuis le n° » pour le PDF
    const nos = state.reg.pieces.map((p) => p.no).filter((n) => n != null);
    if (els.regPdfFrom) {
      const cur = els.regPdfFrom.value;
      els.regPdfFrom.innerHTML = '<option value="">toutes les pièces</option>' + nos.map((n) => `<option value="${n}">depuis le n° ${n}</option>`).join('');
      if (nos.map(String).includes(cur)) els.regPdfFrom.value = cur;
    }
  }

  els.journalBody.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.edit) {
      const p = state.reg.pieces.find((x) => x.id === b.dataset.edit);
      if (!p) return;
      state.editingId = p.id; state.pending = []; state.dgeo.current = null;
      fillForm(p);
      els.ficheTitle.textContent = `n° ${p.no} (modification)`;
      els.ficheErrors.innerHTML = '';
      renderJournal();
      $('ficheCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (b.dataset.del) {
      const p = state.reg.pieces.find((x) => x.id === b.dataset.del);
      if (!p || !confirm(`Supprimer la pièce n° ${p.no} (${p.libelle}) et ses justificatifs ?`)) return;
      for (const j of p.justificatifs) { try { await state.storage.remove(state.reg.annee, p.id, j.name); } catch (e) { /* ignore */ } }
      R.removePiece(state.reg, p.id);
      await saveReg();
      if (state.editingId === p.id) newPiece();
      renderJournal();
    } else if (b.dataset.pdf) {
      const p = state.reg.pieces.find((x) => x.id === b.dataset.pdf);
      if (!p) return;
      await exportPdf([p], `Pièce ${p.no} caisse ${state.reg.annee}.pdf`);
    }
  });

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
    await exportPdf(pieces, `Pièces caisse ${state.reg.annee} n° ${Math.min.apply(null, nos)} à ${Math.max.apply(null, nos)}.pdf`);
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
    await state.storage.save(reg);
    if (!state.years.includes(reg.annee)) state.years.push(reg.annee);
    await openYear(reg.annee);
    notice('ok', `Registre ${reg.annee} restauré.`);
  });

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
    if (wrongYear.length && !confirm(`${wrongYear.length} pièce(s) ne sont pas de l'année ${year} du registre ouvert. Les ajouter quand même ?`)) return 0;
    let added = 0; let dup = 0;
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (p.no != null && state.reg.pieces.some((x) => x.no === p.no)) { dup++; continue; }
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
    notice(added ? 'ok' : 'warn', `${added} pièce(s) ajoutée(s) au registre ${year}${dup ? `, ${dup} déjà présente(s) (même n°) ignorée(s)` : ''}.`);
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
    if (!state.reg) return null;
    const { piece, amounts, amountSource } = R.pieceFromDecompte(d, state.reg);
    if (P.correctPerson && piece.personne) { const c = P.correctPerson(piece.personne, P.buildIndex(vocab())); if (c) piece.personne = c; }
    piece.libelle = R.composeLibelle(piece);
    state.editingId = null; state.pending = []; state.draftId = piece.id; state.dgeo.current = d;
    fillForm(piece);
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
    const b = ev.target.closest('button[data-amount]');
    if (!b) return;
    els.pMontant.value = Number(b.dataset.amount).toFixed(2);
    refreshLibelle();
  });

  window.CaisseSaisie = { state, init, openYear, addFromScan, renderJournal, useDecompte, refreshDgeo };
  init().catch((e) => { console.error(e); els.regInfo.textContent = `Registre indisponible : ${e && e.message ? e.message : e}`; });
})();
