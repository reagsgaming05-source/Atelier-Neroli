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
  const F = window.CaissePdf; // relevé de caisse en PDF
  const AN = window.CaisseAnnee; // date proposée, écart à montrer (annee.js)
  const $ = (id) => document.getElementById(id);
  const els = {};
  for (const id of ['cDate', 'cNote', 'cRows', 'cTotBillets', 'cTotPieces', 'cTotal', 'cKpis', 'cPistes', 'cTitle', 'btnReleve', 'countErrors', 'btnCountSave', 'btnCountSaveTexte', 'btnCountLoadPrev', 'btnCountNew', 'btnCountNewTexte', 'countBody', 'countYear', 'countNotices']) els[id] = $(id);
  if (!els.cRows || !S) return;

  // editingId : comptage rouvert avec le crayon pour le corriger (sa date d'origine : dateOuverte) ;
  // dernierEnregistre : le comptage qu'on vient d'enregistrer, surligné dans l'historique.
  const state = { editingId: null, dateOuverte: null, dernierEnregistre: null, shownYear: null, prevYear: { annee: null, last: null } };
  const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtCHF = (n) => { const v = Number(n) || 0; const [i, d] = Math.abs(v).toFixed(2).split('.'); return `${v < 0 ? '− ' : ''}${i.replace(/\B(?=(\d{3})+(?!\d))/g, "'")}.${d}`; };
  const signed = (n) => (Math.abs(n) < 0.005 ? '0.00' : `${n > 0 ? '+ ' : '− '}${fmtCHF(Math.abs(n))}`);
  const fmtDate = (iso) => P.isoToDisplay(iso);
  const denomLabel = (d) => (d >= 1 ? `${d} CHF` : `${Math.round(d * 100)} ct.`);
  const ico = (id) => `<svg class="ico"><use href="#i-${id}"/></svg>`;
  /**
   * Message sous les boutons du comptage. opts.keep : il reste (il porte un résultat ou un bouton) ;
   * opts.cle : il remplace le précédent de même clé — deux « Comptage enregistré » empilés ne
   * disaient plus lequel était à l'écran.
   */
  function notice(kind, html, opts) {
    opts = opts || {};
    if (opts.cle) for (const vieux of els.countNotices.querySelectorAll(`[data-cle="${opts.cle}"]`)) vieux.remove();
    const div = document.createElement('div');
    div.className = `notice ${kind}`;
    if (opts.cle) div.dataset.cle = opts.cle;
    div.innerHTML = html;
    els.countNotices.prepend(div);
    if (!opts.keep) setTimeout(() => div.remove(), kind === 'err' ? 12000 : 7000);
  }

  /* ---------------- grille des coupures ---------------- */
  function buildRows() {
    const row = (d, kind) => `<tr data-denom="${d}" class="${kind}"><td class="lbl">${kind === 'billet' ? 'Billet' : 'Monnaie'} <b>${denomLabel(d)}</b></td>` +
      `<td class="qty"><input type="number" min="0" step="1" inputmode="numeric" data-denom="${d}" placeholder="0" aria-label="Nombre de ${kind === 'billet' ? 'billets' : 'pièces de monnaie'} de ${denomLabel(d)}"></td>` +
      `<td class="num line" data-line="${d}">0.00</td></tr>`;
    els.cRows.innerHTML = '<tr class="grp"><th colspan="3">Billets</th></tr>' + R.BILLETS.map((d) => row(d, 'billet')).join('') +
      '<tr class="grp"><th colspan="3">Monnaie</th></tr>' + R.PIECES.map((d) => row(d, 'piece')).join('');
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
    renderKpis(t.total, counts);
    return t;
  }

  /* ---------------- soldes ---------------- */
  function refCount() {
    return state.editingId && S.state.reg ? S.state.reg.comptages.find((c) => c.id === state.editingId) || null : null;
  }
  /** Dernier comptage avant `date`, sans compter `ref` (par défaut : le comptage en cours de correction). */
  function previous(date, ref) {
    const reg = S.state.reg;
    if (!reg) return null;
    const p = R.previousCount(reg, date, ref === undefined ? refCount() : ref);
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
  function renderKpis(total, counts) {
    const reg = S.state.reg;
    if (!reg) return;
    const date = els.cDate.value || R.today();
    const prev = previous(date);
    const book = R.balanceAt(reg, date);
    // Rien de compté : ni écart ni variation. L'écran s'ouvrait sur une alarme rouge « il manque
    // de l'argent » valant tout le solde du journal, avant même le premier billet.
    const e = AN.etatEcart(counts || readCounts(), total, book);
    const vide = e.etat === 'vide';
    const diffPrev = prev && !vide ? P.round2(total - prev.total) : null;
    const tile = (cls, label, value, detail) => `<div class="t ${cls}"><div class="l">${label}</div><div class="v">${value}</div><div class="d">${detail}</div></div>`;
    const DIT = {
      vide: 'comptez d\'abord les billets et la monnaie',
      juste: 'la caisse correspond au journal',
      plus: 'il y a plus d\'argent en caisse que dans le journal : une entrée non enregistrée ?',
      moins: 'il manque de l\'argent par rapport au journal : une sortie non enregistrée ?',
    };
    els.cKpis.innerHTML =
      tile('', 'Dernier solde compté', prev ? fmtCHF(prev.total) : '–', prev ? `le ${fmtDate(prev.date)}${prev.note ? ` · ${escapeHtml(prev.note)}` : ''}` : 'aucun comptage précédent') +
      tile('end', state.editingId ? 'Solde compté (correction)' : 'Nouveau solde compté', fmtCHF(total), `le ${fmtDate(date)}`) +
      tile(diffPrev == null ? '' : diffPrev >= 0 ? 'ok' : 'warn', 'Variation depuis le dernier comptage', diffPrev == null ? '–' : signed(diffPrev), prev && !vide ? `entre le ${fmtDate(prev.date)} et le ${fmtDate(date)}` : '') +
      tile('', `Solde du journal au ${fmtDate(date)}`, fmtCHF(book), 'solde à nouveau + écritures jusqu\'à cette date') +
      tile(vide ? '' : e.etat === 'juste' ? 'ok' : 'err', 'Écart caisse / journal', vide ? '–' : e.etat === 'juste' ? '0.00 ✓' : signed(e.ecart), DIT[e.etat]);
    renderPistes(reg, vide ? 0 : e.ecart, date, vide || e.etat === 'juste');
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
      const surligne = state.editingId === c.id || (!state.editingId && state.dernierEnregistre === c.id);
      return `<tr data-id="${c.id}"${surligne ? ' class="selected"' : ''}>` +
        `<td>${escapeHtml(fmtDate(c.date))}</td><td class="num">${fmtCHF(c.billets)}</td><td class="num">${fmtCHF(c.pieces)}</td><td class="num solde">${fmtCHF(c.total)}</td>` +
        `<td class="num">${fmtCHF(book)}</td><td class="num"><span class="chip ${same ? 'ok' : 'warn'}">${same ? '0.00 ✓' : signed(ecart)}</span></td>` +
        `<td class="libelle" title="${escapeHtml(c.note)}">${escapeHtml(c.note)}</td>` +
        `<td class="acts"><button type="button" class="small ghost" data-releve="${c.id}" title="Relevé de caisse de ce comptage (PDF)">${ico('printer')}</button>` +
        `<button type="button" class="small ghost" data-edit="${c.id}" title="Corriger ce comptage">${ico('pen')}</button>` +
        `<button type="button" class="small ghost danger" data-del="${c.id}" title="Supprimer ce comptage">${ico('trash')}</button></td></tr>`;
    }).join('') || '<tr><td colspan="8" class="legend">Aucun comptage enregistré cette année. Comptez les billets et la monnaie ci-dessus, puis « Enregistrer le comptage ».</td></tr>';
  }

  /* ---------------- formulaire ---------------- */
  /** Nouveau comptage, ou correction d'un comptage rouvert : le bouton dit lequel des deux on enregistre. */
  function libelles() {
    const corr = state.editingId ? `du comptage du ${fmtDate(state.dateOuverte)}` : '';
    if (els.btnCountSaveTexte) els.btnCountSaveTexte.textContent = corr ? `Enregistrer les corrections ${corr}` : 'Enregistrer le comptage';
    if (els.btnCountNewTexte) els.btnCountNewTexte.textContent = corr ? 'Abandonner la correction' : 'Nouveau comptage';
    els.cTitle.textContent = corr ? `(correction ${corr})` : '';
  }
  function newCount() {
    state.editingId = null;
    state.dateOuverte = null;
    if (S.state.reg) state.shownYear = S.state.reg.annee;
    // dans l'année du registre ouvert : aujourd'hui, ou le 31 décembre d'une année passée
    els.cDate.value = S.state.reg ? AN.dateProposee(S.state.reg.annee) : R.today();
    els.cNote.value = '';
    fillCounts({});
    libelles();
    els.countErrors.innerHTML = '';
    refreshTotals();
    renderHistory();
  }
  function editCount(c) {
    state.editingId = c.id;
    state.dateOuverte = c.date;
    els.cDate.value = c.date;
    els.cNote.value = c.note || '';
    fillCounts(c.counts);
    libelles();
    els.countErrors.innerHTML = '';
    refreshTotals();
    renderHistory();
    $('countCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  /**
   * Relevé de caisse : le formulaire officiel de la commune, rempli avec ce qui est à l'écran.
   * Il marche sur un comptage enregistré comme sur celui qu'on est en train de faire — c'est au
   * moment où le total tombe qu'on veut l'imprimer, pas après un détour par l'enregistrement.
   *
   * Le point de référence est le comptage précédent s'il y en a un, sinon le solde à nouveau de
   * l'année : c'est ce que porte le formulaire rempli à la main (« Situation de la caisse au
   * 20.12.2024 »), la clôture de l'année d'avant.
   */
  function releveData(comptage, ref) {
    const reg = S.state.reg;
    const prev = previous(comptage.date, ref);
    const reference = prev
      ? { date: prev.date, total: prev.total }
      : { date: reg.opening.date, total: reg.opening.amount };
    const mouv = R.periodMovements(reg, prev ? prev.date : null, comptage.date);
    return {
      reference,
      encaissements: mouv.encaissements,
      decaissements: mouv.decaissements,
      ecart: P.round2(comptage.total - R.balanceAt(reg, comptage.date)),
    };
  }

  async function openReleve(comptage, win, ref) {
    const reg = S.state.reg;
    const res = await F.buildReleveCaissePdf(comptage, reg, releveData(comptage, ref));
    const url = URL.createObjectURL(new Blob([res.bytes], { type: 'application/pdf' }));
    // la fenêtre est ouverte avant la construction (un navigateur bloque window.open après un await)
    const w = win && !win.closed ? win : window.open(url, '_blank');
    if (w && w !== win) { /* ouverte ici */ } else if (w) { try { w.location.replace(url); } catch (e) { w.location = url; } }
    if (!w) notice('warn', `Le relevé n'a pas pu s'ouvrir tout seul (fenêtre bloquée) : <button type="button" data-open-pdf="${url}">Ouvrir le relevé</button>`);
    setTimeout(() => URL.revokeObjectURL(url), 180000);
    return res;
  }

  if (els.btnReleve) els.btnReleve.addEventListener('click', async () => {
    const reg = S.state.reg;
    if (!reg) { notice('err', 'Aucun journal ouvert.'); return; }
    const date = els.cDate.value;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { notice('err', 'Date du comptage manquante ou invalide : le relevé n\'a pas été produit.'); return; }
    const counts = readCounts();
    if (!Object.keys(counts).length) { notice('err', 'Rien n\'est compté, ni billets ni monnaie : il n\'y a rien à mettre sur le relevé.'); return; }
    const t = R.countTotal(counts);
    const w = window.open('', '_blank'); // ouverte dans le clic, remplie après
    try {
      await openReleve({ date, counts, billets: t.billets, pieces: t.pieces, total: t.total, note: els.cNote.value.trim() }, w);
    } catch (e) {
      if (w && !w.closed) w.close();
      notice('err', `Le relevé n'a pas pu être produit : ${escapeHtml(e && e.message ? e.message : e)}`);
    }
  });
  /** Relevé d'un comptage déjà enregistré (historique, message d'enregistrement). */
  async function releveEnregistre(id) {
    const reg = S.state.reg;
    const c = reg && reg.comptages.find((x) => x.id === id);
    if (!c) { notice('warn', 'Ce comptage n\'est plus dans l\'historique.'); return; }
    const w = window.open('', '_blank'); // ouverte dans le clic, remplie après
    try {
      await openReleve(c, w, c); // le comptage lui-même n'est pas « le comptage précédent »
    } catch (e) {
      if (w && !w.closed) w.close();
      notice('err', `Le relevé n'a pas pu être produit : ${escapeHtml(e && e.message ? e.message : e)}`);
    }
  }
  if (els.countNotices) els.countNotices.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-open-pdf]');
    if (b) window.open(b.dataset.openPdf, '_blank');
    const r = ev.target.closest('button[data-releve-id]');
    if (r) releveEnregistre(r.dataset.releveId);
  });

  async function saveCount() {
    const reg = S.state.reg;
    if (!reg) { notice('err', "Aucun journal ouvert : le comptage n'a pas pu être enregistré."); return; }
    const date = els.cDate.value;
    const errs = [];
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date).getTime())) errs.push('Date manquante ou invalide');
    else if (String(date).slice(0, 4) !== String(reg.annee)) errs.push(`La date n'est pas dans l'année ${reg.annee} du journal ouvert`);
    const counts = readCounts();
    if (!Object.keys(counts).length) errs.push('Rien n\'est compté, ni billets ni monnaie');
    if (errs.length) {
      els.countErrors.innerHTML = `<div class="notice err"><b>Le comptage n'est pas enregistré :</b><ul>${errs.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`;
      return;
    }
    els.countErrors.innerHTML = '';
    // Correction dont la date a changé : un nouveau comptage fait sur l'ancien, ou vraiment une
    // date à corriger ? On le demande, en proposant d'abord ce qui ne perd rien.
    let corriger = !!state.editingId;
    if (AN.modeEnregistrement(corriger, state.dateOuverte, date) === 'demander') {
      if (confirm(`Enregistrer un NOUVEAU comptage au ${fmtDate(date)} ?\n\nLe comptage du ${fmtDate(state.dateOuverte)} reste tel quel dans l'historique.`)) corriger = false;
      else if (!confirm(`Corriger alors le comptage du ${fmtDate(state.dateOuverte)} en le datant du ${fmtDate(date)} ?\n\nIl sera remplacé par ce qui est à l'écran.`)) return;
    }
    const ref = corriger ? refCount() : null;
    const c = R.upsertCount(reg, { id: ref ? ref.id : undefined, date, counts, note: els.cNote.value.trim(), createdAt: ref ? ref.createdAt : undefined });
    try {
      await S.saveReg();
    } catch (e) {
      // Pas écrit : l'historique ne doit pas le montrer comme s'il l'était. Les quantités restent
      // à l'écran pour réessayer. (Le message du registre s'affiche aussi, voir saisie.js.)
      R.removeCount(reg, c.id);
      if (ref) R.upsertCount(reg, ref);
      els.countErrors.innerHTML = `<div class="notice err"><b>Le comptage n'est pas enregistré</b> : ${escapeHtml((e && e.message) || e)}. ` +
        'Les quantités restent à l\'écran : réessayez « Enregistrer » dans un instant, avant de fermer l\'application.</div>';
      refreshTotals();
      renderHistory();
      return;
    }
    const book = R.balanceAt(reg, date);
    const ecart = P.round2(c.total - book);
    // Le formulaire repart d'un comptage neuf : resté « en modification » sur celui-ci, le
    // prochain comptage (même des jours plus tard) le REMPLAÇAIT au lieu de s'ajouter. Le
    // résultat reste lisible ici et dans l'historique, où la ligne est surlignée, avec son relevé.
    state.dernierEnregistre = c.id;
    newCount();
    notice(Math.abs(ecart) < 0.005 ? 'ok' : 'warn', `<b>Comptage du ${fmtDate(date)} ${ref ? 'corrigé' : 'enregistré'}</b> : <b>${fmtCHF(c.total)}</b> en caisse (${fmtCHF(c.billets)} en billets, ${fmtCHF(c.pieces)} en monnaie). ` +
      (Math.abs(ecart) < 0.005 ? 'La caisse correspond au journal.' : `Écart avec le journal à cette date : <b>${signed(ecart)}</b>.`) +
      ` <button type="button" data-releve-id="${c.id}">Relevé de caisse de ce comptage</button>` +
      '<br>Le formulaire est prêt pour le prochain comptage ; celui-ci est surligné dans l\'historique.', { keep: true, cle: 'enregistrement' });
  }

  els.cRows.addEventListener('input', refreshTotals);
  els.cDate.addEventListener('change', refreshTotals);
  els.btnCountSave.addEventListener('click', saveCount);
  els.btnCountNew.addEventListener('click', newCount);
  els.btnCountLoadPrev.addEventListener('click', () => {
    const prev = previous(els.cDate.value || R.today());
    if (!prev) { notice('warn', 'Aucun comptage précédent : il n\'y a pas de quantités à reprendre.'); return; }
    fillCounts(prev.counts);
    refreshTotals();
  });
  els.countBody.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    const reg = S.state.reg;
    if (b.dataset.releve) { await releveEnregistre(b.dataset.releve); return; }
    if (b.dataset.edit) {
      const c = reg.comptages.find((x) => x.id === b.dataset.edit);
      if (c) editCount(c);
    } else if (b.dataset.del) {
      const c = reg.comptages.find((x) => x.id === b.dataset.del);
      if (!c || !confirm(`Supprimer le comptage du ${fmtDate(c.date)} (${fmtCHF(c.total)}) ?`)) return;
      R.removeCount(reg, c.id);
      // pas écrit (réseau coupé) : le comptage reste dans l'historique, comme sur le disque ; saveReg dit pourquoi
      try { await S.saveReg(); } catch (e) { R.upsertCount(reg, c); refreshTotals(); renderHistory(); return; }
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
    if (state.editingId && !S.state.reg.comptages.some((c) => c.id === state.editingId)) { state.editingId = null; state.dateOuverte = null; libelles(); }
    if (!els.cDate.value) els.cDate.value = AN.dateProposee(S.state.reg.annee);
    if (state.editingId) state.shownYear = S.state.reg.annee;
    refreshTotals();
    renderHistory();
    loadPrevYear();
  }

  window.CaisseComptage = { state, render, newCount, readCounts };
  render();
})();
