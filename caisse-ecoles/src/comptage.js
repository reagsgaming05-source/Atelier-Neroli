/*
 * Comptage de la caisse : billets et pièces comptés, total, dernier solde compté et nouveau solde
 * avec leurs dates, comparaison avec le solde du journal à la date du comptage, historique des
 * comptages conservé dans le registre de l'année (registre.json, clé « comptages »).
 * Dépend de window.CaisseParser, CaisseRegistre et CaisseSaisie (registre ouvert, stockage).
 */
(function () {
  'use strict';

  const P = window.CaisseParser;
  const R = window.CaisseRegistre;
  const S = window.CaisseSaisie;
  const $ = (id) => document.getElementById(id);
  const els = {};
  for (const id of ['cDate', 'cNote', 'cRows', 'cTotBillets', 'cTotPieces', 'cTotal', 'cKpis', 'cPistes', 'cTitle', 'countErrors', 'btnCountSave', 'btnCountLoadPrev', 'btnCountNew', 'countBody', 'countYear', 'countNotices']) els[id] = $(id);
  if (!els.cRows || !S) return;

  const state = { editingId: null, shownYear: null, prevYear: { annee: null, last: null } };
  const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtCHF = (n) => { const v = Number(n) || 0; const [i, d] = Math.abs(v).toFixed(2).split('.'); return `${v < 0 ? '− ' : ''}${i.replace(/\B(?=(\d{3})+(?!\d))/g, "'")}.${d}`; };
  const signed = (n) => (Math.abs(n) < 0.005 ? '0.00' : `${n > 0 ? '+ ' : '− '}${fmtCHF(Math.abs(n))}`);
  const fmtDate = (iso) => P.isoToDisplay(iso);
  const denomLabel = (d) => (d >= 1 ? `${d} CHF` : `${Math.round(d * 100)} ct.`);
  const ico = (id) => `<svg class="ico"><use href="#i-${id}"/></svg>`;
  function notice(kind, html) {
    const div = document.createElement('div');
    div.className = `notice ${kind}`;
    div.innerHTML = html;
    els.countNotices.prepend(div);
    setTimeout(() => div.remove(), kind === 'err' ? 12000 : 7000);
  }

  /* ---------------- grille des coupures ---------------- */
  function buildRows() {
    const row = (d, kind) => `<tr data-denom="${d}" class="${kind}"><td class="lbl">${kind === 'billet' ? 'Billet' : 'Pièce'} <b>${denomLabel(d)}</b></td>` +
      `<td class="qty"><input type="number" min="0" step="1" inputmode="numeric" data-denom="${d}" placeholder="0" aria-label="Nombre de ${kind === 'billet' ? 'billets' : 'pièces'} de ${denomLabel(d)}"></td>` +
      `<td class="num line" data-line="${d}">0.00</td></tr>`;
    els.cRows.innerHTML = '<tr class="grp"><th colspan="3">Billets</th></tr>' + R.BILLETS.map((d) => row(d, 'billet')).join('') +
      '<tr class="grp"><th colspan="3">Pièces</th></tr>' + R.PIECES.map((d) => row(d, 'piece')).join('');
  }
  function readCounts() {
    const counts = {};
    for (const inp of els.cRows.querySelectorAll('input[data-denom]')) {
      const n = Math.max(0, Math.floor(Number(inp.value) || 0));
      if (n) counts[inp.dataset.denom] = n;
    }
    return counts;
  }
  function fillCounts(counts) {
    for (const inp of els.cRows.querySelectorAll('input[data-denom]')) inp.value = counts && counts[inp.dataset.denom] ? counts[inp.dataset.denom] : '';
  }
  function refreshTotals() {
    const counts = readCounts();
    for (const cell of els.cRows.querySelectorAll('td[data-line]')) {
      const d = Number(cell.dataset.line); const n = counts[cell.dataset.line] || 0;
      cell.textContent = fmtCHF(P.round2(d * n));
      cell.classList.toggle('filled', n > 0);
    }
    const t = R.countTotal(counts);
    els.cTotBillets.textContent = fmtCHF(t.billets);
    els.cTotPieces.textContent = fmtCHF(t.pieces);
    els.cTotal.textContent = fmtCHF(t.total);
    renderKpis(t.total);
    return t;
  }

  /* ---------------- soldes ---------------- */
  function refCount() {
    return state.editingId && S.state.reg ? S.state.reg.comptages.find((c) => c.id === state.editingId) || null : null;
  }
  function previous(date) {
    const reg = S.state.reg;
    if (!reg) return null;
    const p = R.previousCount(reg, date, refCount());
    if (p) return p;
    // aucun comptage plus tôt dans l'année : dernier comptage de l'année précédente
    return state.prevYear.annee === reg.annee ? state.prevYear.last : null;
  }
  async function loadPrevYear() {
    const reg = S.state.reg;
    if (!reg || state.prevYear.annee === reg.annee) return;
    // On écrit dans l'objet créé pour CETTE année-là : si l'année change pendant la lecture, le
    // résultat tardif n'atterrit plus sur le comptage de la nouvelle année.
    const cible = { annee: reg.annee, last: null };
    state.prevYear = cible;
    try {
      if (S.state.years.includes(reg.annee - 1)) {
        const prev = await S.state.storage.load(reg.annee - 1);
        if (prev) cible.last = R.previousCount(prev, `${reg.annee - 1}-12-31`, null);
      }
    } catch (e) { /* sans année précédente */ }
    if (state.prevYear === cible) refreshTotals();
  }
  function renderKpis(total) {
    const reg = S.state.reg;
    if (!reg) return;
    const date = els.cDate.value || R.today();
    const prev = previous(date);
    const book = R.balanceAt(reg, date);
    const diffPrev = prev ? P.round2(total - prev.total) : null;
    const ecart = P.round2(total - book);
    const same = Math.abs(ecart) < 0.005;
    const tile = (cls, label, value, detail) => `<div class="t ${cls}"><div class="l">${label}</div><div class="v">${value}</div><div class="d">${detail}</div></div>`;
    els.cKpis.innerHTML =
      tile('', 'Dernier solde compté', prev ? fmtCHF(prev.total) : '–', prev ? `le ${fmtDate(prev.date)}${prev.note ? ` · ${escapeHtml(prev.note)}` : ''}` : 'aucun comptage précédent') +
      tile('end', state.editingId ? 'Solde compté (modification)' : 'Nouveau solde compté', fmtCHF(total), `le ${fmtDate(date)}`) +
      tile(diffPrev == null ? '' : diffPrev >= 0 ? 'ok' : 'warn', 'Variation depuis le dernier comptage', diffPrev == null ? '–' : signed(diffPrev), prev ? `entre le ${fmtDate(prev.date)} et le ${fmtDate(date)}` : '') +
      tile('', `Solde du journal au ${fmtDate(date)}`, fmtCHF(book), 'solde à nouveau + écritures jusqu\'à cette date') +
      tile(same ? 'ok' : 'err', 'Écart caisse / journal', same ? '0.00 ✓' : signed(ecart), same ? 'la caisse correspond au journal' : ecart > 0 ? 'il y a plus d\'argent en caisse que dans le journal : une entrée non enregistrée ?' : 'il manque de l\'argent par rapport au journal : une sortie non enregistrée ?');
    renderPistes(reg, ecart, date, same);
  }

  /**
   * Où chercher quand la caisse ne tombe pas juste. Le montant de l'écart ne dit rien par
   * lui-même ; mais il vaut souvent, au centime près, le montant d'une pièce du journal, ou son
   * double — et là on sait quoi aller regarder. Chaque piste renvoie à la pièce dans le journal.
   *
   * Ce sont des pistes, pas un verdict : si plusieurs pièces portent le même montant, on le dit
   * au lieu de désigner la première au hasard.
   */
  function renderPistes(reg, ecart, date, same) {
    if (!els.cPistes) return;
    if (same) { els.cPistes.innerHTML = ''; return; }
    const pistes = R.explainGap(reg, ecart, date);
    const lien = (p) => `<button type="button" class="numlink" data-piste-no="${p.no == null ? '' : p.no}">n° ${p.no == null ? '?' : p.no}</button>`;
    const parts = [];
    const sens = pistes.filter((x) => x.genre === 'sens');
    const montant = pistes.filter((x) => x.genre === 'montant');
    const numero = pistes.find((x) => x.genre === 'numero');
    if (sens.length === 1) {
      const p = sens[0].piece;
      parts.push(`L'écart vaut exactement <b>deux fois</b> le montant de la pièce ${lien(p)} (${fmtCHF(p.montant)}), du côté qui correspond : elle est peut-être inscrite en <b>${p.sens === 'debit' ? 'entrée (débit)' : 'sortie (crédit)'}</b> alors qu'elle devrait être de l'autre côté.`);
    } else if (sens.length > 1) {
      parts.push(`<b>${sens.length} pièces</b> valent la moitié de l'écart du bon côté : l'une d'elles est peut-être inscrite à l'envers (${sens.slice(0, 8).map((x) => lien(x.piece)).join(' ')}).`);
    }
    if (montant.length === 1) {
      const p = montant[0].piece;
      parts.push(`L'écart vaut exactement le montant de la pièce ${lien(p)} du ${fmtDate(p.date)} (${fmtCHF(p.montant)}) : saisie deux fois, ou argent jamais passé en caisse ?`);
    } else if (montant.length > 1 && montant.length <= 8) {
      parts.push(`<b>${montant.length} pièces</b> valent exactement le montant de l'écart : ${montant.map((x) => lien(x.piece)).join(' ')}.`);
    } else if (montant.length > 8) {
      parts.push(`<b>${montant.length} pièces</b> du journal valent exactement le montant de l'écart : trop nombreuses pour être une piste.`);
    }
    if (numero) {
      parts.push(`La suite des numéros a <b>${numero.total} trou${numero.total > 1 ? 's' : ''}</b> (n° ${numero.manquants.join(', ')}${numero.total > numero.manquants.length ? '…' : ''}) : une pièce reçue et jamais saisie expliquerait un écart.`);
    }
    els.cPistes.innerHTML = parts.length
      ? `<div class="notice warn" style="margin-top:12px"><b>Où chercher :</b> ${parts.join(' ')}</div>`
      : '<div class="notice" style="margin-top:12px">Aucune pièce du journal ne correspond à cet écart, et la suite des numéros est complète : l\'écart ne vient pas d\'une seule pièce mal saisie.</div>';
  }
  if (els.cPistes) els.cPistes.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-piste-no]');
    if (b && S.chercherDansJournal) S.chercherDansJournal(b.dataset.pisteNo);
  });

  /* ---------------- historique ---------------- */
  function renderHistory() {
    const reg = S.state.reg;
    if (!reg) return;
    els.countYear.textContent = String(reg.annee);
    const list = reg.comptages.slice().reverse();
    els.countBody.innerHTML = list.map((c) => {
      const book = R.balanceAt(reg, c.date);
      const ecart = P.round2(c.total - book);
      const same = Math.abs(ecart) < 0.005;
      return `<tr data-id="${c.id}"${state.editingId === c.id ? ' class="selected"' : ''}>` +
        `<td>${escapeHtml(fmtDate(c.date))}</td><td class="num">${fmtCHF(c.billets)}</td><td class="num">${fmtCHF(c.pieces)}</td><td class="num solde">${fmtCHF(c.total)}</td>` +
        `<td class="num">${fmtCHF(book)}</td><td class="num"><span class="chip ${same ? 'ok' : 'warn'}">${same ? '0.00 ✓' : signed(ecart)}</span></td>` +
        `<td class="libelle" title="${escapeHtml(c.note)}">${escapeHtml(c.note)}</td>` +
        `<td class="acts"><button type="button" class="small ghost" data-edit="${c.id}" title="Reprendre ce comptage pour le corriger">${ico('pen')}</button><button type="button" class="small ghost danger" data-del="${c.id}" title="Supprimer ce comptage">${ico('trash')}</button></td></tr>`;
    }).join('') || '<tr><td colspan="8" class="legend">Aucun comptage enregistré cette année. Comptez les billets et les pièces ci-dessus, puis « Enregistrer le comptage ».</td></tr>';
  }

  /* ---------------- formulaire ---------------- */
  function newCount() {
    state.editingId = null;
    if (S.state.reg) state.shownYear = S.state.reg.annee;
    // la date proposée reste dans l'année du registre ouvert
    els.cDate.value = S.state.reg && String(R.today()).slice(0, 4) !== String(S.state.reg.annee) ? `${S.state.reg.annee}-01-01` : R.today();
    els.cNote.value = '';
    fillCounts({});
    els.cTitle.textContent = '';
    els.countErrors.innerHTML = '';
    refreshTotals();
    renderHistory();
  }
  function editCount(c) {
    state.editingId = c.id;
    els.cDate.value = c.date;
    els.cNote.value = c.note || '';
    fillCounts(c.counts);
    els.cTitle.textContent = `(modification du comptage du ${fmtDate(c.date)})`;
    els.countErrors.innerHTML = '';
    refreshTotals();
    renderHistory();
    $('countCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  async function saveCount() {
    const reg = S.state.reg;
    if (!reg) { notice('err', "Aucun registre ouvert : le comptage n'a pas pu être enregistré."); return; }
    const date = els.cDate.value;
    const errs = [];
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date).getTime())) errs.push('Date manquante ou invalide');
    else if (String(date).slice(0, 4) !== String(reg.annee)) errs.push(`La date n'est pas dans l'année ${reg.annee} du registre ouvert`);
    const counts = readCounts();
    if (!Object.keys(counts).length) errs.push('Aucun billet ni aucune pièce compté(e)');
    if (errs.length) {
      els.countErrors.innerHTML = `<div class="notice err"><b>Le comptage n'est pas enregistré :</b><ul>${errs.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`;
      return;
    }
    els.countErrors.innerHTML = '';
    const ref = refCount();
    const c = R.upsertCount(reg, { id: state.editingId || undefined, date, counts, note: els.cNote.value.trim(), createdAt: ref ? ref.createdAt : undefined });
    await S.saveReg();
    const book = R.balanceAt(reg, date);
    const ecart = P.round2(c.total - book);
    notice(Math.abs(ecart) < 0.005 ? 'ok' : 'warn', `Comptage du ${fmtDate(date)} enregistré : <b>${fmtCHF(c.total)}</b> en caisse (${fmtCHF(c.billets)} en billets, ${fmtCHF(c.pieces)} en pièces). ` +
      (Math.abs(ecart) < 0.005 ? 'La caisse correspond au journal.' : `Écart avec le journal à cette date : <b>${signed(ecart)}</b>.`) +
      ' Le comptage reste affiché ; « Nouveau comptage » pour en commencer un autre.');
    // le comptage enregistré reste à l'écran (soldes et écart le concernent), au lieu d'un formulaire remis à zéro
    state.editingId = c.id;
    els.cTitle.textContent = `(comptage du ${fmtDate(c.date)} enregistré)`;
    refreshTotals();
    renderHistory();
  }

  els.cRows.addEventListener('input', refreshTotals);
  els.cDate.addEventListener('change', refreshTotals);
  els.btnCountSave.addEventListener('click', saveCount);
  els.btnCountNew.addEventListener('click', newCount);
  els.btnCountLoadPrev.addEventListener('click', () => {
    const prev = previous(els.cDate.value || R.today());
    if (!prev) { notice('warn', 'Aucun comptage précédent à reprendre.'); return; }
    fillCounts(prev.counts);
    refreshTotals();
  });
  els.countBody.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    const reg = S.state.reg;
    if (b.dataset.edit) {
      const c = reg.comptages.find((x) => x.id === b.dataset.edit);
      if (c) editCount(c);
    } else if (b.dataset.del) {
      const c = reg.comptages.find((x) => x.id === b.dataset.del);
      if (!c || !confirm(`Supprimer le comptage du ${fmtDate(c.date)} (${fmtCHF(c.total)}) ?`)) return;
      R.removeCount(reg, c.id);
      await S.saveReg();
      if (state.editingId === c.id) newCount(); else { refreshTotals(); renderHistory(); }
    }
  });

  /** À appeler quand le registre change (année ouverte, pièce enregistrée) : recalcule soldes et historique. */
  function render() {
    if (!S.state.reg) return;
    if (!els.cRows.children.length) buildRows();
    // changement d'année du registre : on repart d'un comptage vierge (la date et les quantités
    // de l'année précédente donneraient des soldes faux)
    if (state.shownYear !== S.state.reg.annee) { state.shownYear = S.state.reg.annee; newCount(); return; }
    if (state.editingId && !S.state.reg.comptages.some((c) => c.id === state.editingId)) state.editingId = null;
    if (!els.cDate.value) els.cDate.value = R.today();
    if (state.editingId) state.shownYear = S.state.reg.annee;
    refreshTotals();
    renderHistory();
    loadPrevYear();
  }

  window.CaisseComptage = { state, render, newCount, readCounts };
  render();
})();
