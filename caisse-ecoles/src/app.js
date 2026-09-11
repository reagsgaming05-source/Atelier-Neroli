/*
 * Interface de l'application (navigateur). Dépend de :
 *   window.pdfjsLib (pdf.js), window.ExcelJS, window.CaisseParser, window.CaisseExcel
 */
(function () {
  'use strict';

  const P = window.CaisseParser;
  const X = window.CaisseExcel;
  const pdfjsLib = window.pdfjsLib;

  /* ---------------- pdf.js : worker embarqué ---------------- */
  (function setupWorker() {
    if (!pdfjsLib) return;
    const el = document.getElementById('pdfjs-worker-src');
    if (!el) return;
    try {
      const blob = new Blob([el.textContent], { type: 'text/javascript' });
      pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
    } catch (e) {
      console.warn('Worker pdf.js non disponible, mode sans worker', e);
    }
  })();

  /* ---------------- État ---------------- */
  const state = {
    mode: 'existing',
    existing: null, // { fileName, opening, entries }
    docs: [], // [{ id, name, doc (pdf.js), numPages, pages: [{pageInDoc,width,height,words}], pieceCount }]
    nextDocId: 1,
    pages: [], // pages globales : { pageNumber, docId, pageInDoc, width, height, words }
    entries: [], // écritures nouvelles (modifiables)
    duplicates: [],
    docWarnings: [],
    selectedId: null,
    nextId: 1,
    renderCache: new Map(),
    loading: false,
    vocab: null, // vocabulaire appris (classeur + mémoire locale)
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    modeRadios: document.querySelectorAll('input[name="mode"]'),
    newBox: $('newBox'),
    vocabInfo: $('vocabInfo'),
    xlsxFile: $('xlsxFile'),
    existingInfo: $('existingInfo'),
    openingDate: $('openingDate'),
    openingAmount: $('openingAmount'),
    caisse: $('caisseAccount'),
    dropzone: $('dropzone'),
    pdfFile: $('pdfFile'),
    btnPickPdf: $('btnPickPdf'),
    pdfProgress: $('pdfProgress'),
    pdfListBox: $('pdfListBox'),
    pdfList: $('pdfList'),
    btnSortFiles: $('btnSortFiles'),
    btnClearFiles: $('btnClearFiles'),
    pdfInfo: $('pdfInfo'),
    pdfNotices: $('pdfNotices'),
    step3: $('step3'),
    step4: $('step4'),
    body: $('entriesBody'),
    rowSummary: $('rowSummary'),
    btnAddRow: $('btnAddRow'),
    btnCheckAll: $('btnCheckAll'),
    previewNav: $('previewNav'),
    previewFrame: $('previewFrame'),
    previewFields: $('previewFields'),
    accountsList: $('accountsList'),
    totals: $('totals'),
    excelNotices: $('excelNotices'),
    btnExcel: $('btnExcel'),
    excelHint: $('excelHint'),
  };

  try {
    const saved = localStorage.getItem('caisse.compte');
    if (saved) els.caisse.value = saved;
  } catch (e) { /* ignore */ }

  /* ---------------- Vocabulaire appris (mémoire locale du PC) ---------------- */
  function loadVocab() {
    try {
      const raw = localStorage.getItem('caisse.vocab');
      if (raw) {
        const v = JSON.parse(raw);
        if (v && Array.isArray(v.words)) return P.mergeVocabulary(P.emptyVocabulary(), v);
      }
    } catch (e) { /* ignore */ }
    return P.emptyVocabulary();
  }
  function saveVocab() {
    try { localStorage.setItem('caisse.vocab', JSON.stringify(state.vocab)); } catch (e) { /* ignore */ }
  }
  function renderVocabInfo() {
    const v = state.vocab;
    if (!v || (!v.words.length && !v.persons.length && !v.accounts.length)) {
      els.vocabInfo.textContent = 'Aucun vocabulaire appris pour l\'instant : chargez un classeur pour améliorer la lecture des libellés.';
      return;
    }
    els.vocabInfo.textContent = `Vocabulaire appris : ${v.words.length} mot(s), ${v.persons.length} nom(s), ${v.accounts.length} compte(s) – utilisé pour corriger les lectures OCR.`;
  }
  state.vocab = loadVocab();
  renderVocabInfo();

  /* ---------------- Utilitaires ---------------- */
  function fmtCHF(n) {
    const v = Number(n) || 0;
    const s = Math.abs(v).toFixed(2);
    const [i, d] = s.split('.');
    const withSep = i.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    return (v < 0 ? '-' : '') + withSep + '.' + d;
  }

  function fmtInput(n) {
    if (n == null || n === '') return '';
    const v = Number(n);
    return isFinite(v) ? v.toFixed(2) : '';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function notice(container, kind, html) {
    const div = document.createElement('div');
    div.className = `notice ${kind}`;
    div.innerHTML = html;
    container.appendChild(div);
  }

  function naturalCompare(a, b) {
    return String(a).localeCompare(String(b), 'fr', { numeric: true, sensitivity: 'base' });
  }

  function getCaisse() {
    return P.normalizeAccount(els.caisse.value) || P.DEFAULT_CAISSE;
  }

  function currentOpening() {
    if (state.mode === 'existing' && state.existing) return state.existing.opening;
    return {
      date: els.openingDate.value || null,
      amount: Number(els.openingAmount.value) || 0,
      libelle: 'Solde à nouveau',
    };
  }

  function existingEntries() {
    return state.mode === 'existing' && state.existing ? state.existing.entries : [];
  }

  /* ---------------- Étape 1 : classeur ---------------- */
  els.modeRadios.forEach((r) => r.addEventListener('change', () => {
    state.mode = document.querySelector('input[name="mode"]:checked').value;
    els.newBox.classList.toggle('hidden', state.mode !== 'new');
    if (state.pages.length) reparse();
    refreshAll();
  }));

  els.xlsxFile.addEventListener('change', async () => {
    const file = els.xlsxFile.files[0];
    if (!file) return;
    els.existingInfo.textContent = 'Lecture du classeur…';
    try {
      const buf = await file.arrayBuffer();
      const data = await X.readWorkbook(buf);
      state.existing = { fileName: file.name, opening: data.opening, entries: data.entries };
      const last = data.entries.length ? data.entries[data.entries.length - 1] : null;
      const totals = X.computeTotals(data.opening, data.entries);
      els.existingInfo.innerHTML =
        `<b>${escapeHtml(file.name)}</b> – feuille « ${escapeHtml(data.sheetName)} » : <b>${data.entries.length}</b> écriture(s), ` +
        `solde à nouveau <b>${fmtCHF(data.opening.amount)}</b>` + (data.opening.date ? ` au ${P.isoToDisplay(data.opening.date)}` : '') +
        (last ? `, dernière pièce n° <b>${escapeHtml(last.no)}</b>` + (last.date ? ` du ${P.isoToDisplay(last.date)}` : '') : '') +
        `, solde actuel <b>${fmtCHF(totals.end)}</b>.` +
        `<br><span class="legend">Si c'est le classeur de l'année passée, choisissez plutôt « Nouveau classeur » et indiquez le solde à nouveau (${fmtCHF(totals.end)}).</span>`;
      if (!els.openingAmount.value || Number(els.openingAmount.value) === 0) els.openingAmount.value = totals.end;
      // apprentissage du vocabulaire (mots, noms, comptes) pour corriger l'OCR
      state.vocab = P.mergeVocabulary(state.vocab, P.learnVocabulary(data.entries));
      saveVocab();
      renderVocabInfo();
    } catch (e) {
      console.error(e);
      state.existing = null;
      els.existingInfo.innerHTML = `<span style="color:var(--err)">Impossible de lire ce classeur : ${escapeHtml(e.message || e)}</span>`;
    }
    if (state.pages.length) reparse();
    refreshAll();
  });

  els.openingDate.addEventListener('change', refreshAll);
  els.openingAmount.addEventListener('input', refreshAll);
  els.caisse.addEventListener('change', () => {
    try { localStorage.setItem('caisse.compte', els.caisse.value); } catch (e) { /* ignore */ }
    if (state.pages.length) { reparse(); refreshAll(); }
  });

  /* ---------------- Étape 2 : PDF (plusieurs fichiers) ---------------- */
  els.btnPickPdf.addEventListener('click', () => els.pdfFile.click());
  els.pdfFile.addEventListener('change', () => {
    const files = Array.from(els.pdfFile.files || []);
    els.pdfFile.value = '';
    if (files.length) addPdfFiles(files);
  });
  ['dragenter', 'dragover'].forEach((ev) => els.dropzone.addEventListener(ev, (e) => { e.preventDefault(); els.dropzone.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => els.dropzone.addEventListener(ev, (e) => { e.preventDefault(); els.dropzone.classList.remove('over'); }));
  els.dropzone.addEventListener('drop', (e) => {
    const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
    if (files.length) addPdfFiles(files);
  });

  async function addPdfFiles(files) {
    if (!pdfjsLib) { alert('pdf.js non chargé'); return; }
    if (state.loading) { alert('Veuillez attendre la fin du chargement en cours.'); return; }
    const pdfs = files.filter((f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
    const rejected = files.length - pdfs.length;
    els.pdfNotices.innerHTML = '';
    if (rejected) notice(els.pdfNotices, 'warn', `${rejected} fichier(s) ignoré(s) : seuls les PDF sont acceptés.`);
    if (!pdfs.length) return;
    // Ordre naturel des noms (Pce 01 à 33, Pce 34 à 60, ...)
    pdfs.sort((a, b) => naturalCompare(a.name, b.name));

    state.loading = true;
    els.pdfProgress.classList.remove('hidden');
    els.pdfProgress.value = 0;
    const totalFiles = pdfs.length;
    let fileIdx = 0;
    for (const file of pdfs) {
      els.pdfInfo.textContent = `Lecture de ${file.name} (${fileIdx + 1}/${totalFiles})…`;
      try {
        const buf = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buf, isEvalSupported: false }).promise;
        const pages = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          const tc = await page.getTextContent();
          pages.push({ pageInDoc: i, width: vp.width, height: vp.height, words: P.itemsFromTextContent(tc, vp, pdfjsLib.Util) });
          els.pdfProgress.value = Math.round(((fileIdx + i / doc.numPages) / totalFiles) * 100);
          if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
        }
        const existingSame = state.docs.find((d) => d.name === file.name && d.numPages === doc.numPages);
        if (existingSame) {
          notice(els.pdfNotices, 'warn', `Le fichier <b>${escapeHtml(file.name)}</b> est déjà chargé : ignoré.`);
          try { doc.destroy(); } catch (e) { /* ignore */ }
        } else {
          state.docs.push({ id: state.nextDocId++, name: file.name, doc, numPages: doc.numPages, pages, pieceCount: 0 });
        }
      } catch (e) {
        console.error(e);
        notice(els.pdfNotices, 'err', `Impossible de lire <b>${escapeHtml(file.name)}</b> : ${escapeHtml(e.message || e)}`);
      }
      fileIdx++;
    }
    state.loading = false;
    els.pdfProgress.classList.add('hidden');
    afterDocsChanged();
  }

  function afterDocsChanged() {
    rebuildPages();
    if (state.pages.length) {
      const detected = P.detectCaisseAccount(state.pages);
      if (detected && detected !== getCaisse()) {
        notice(els.pdfNotices, 'warn', `Le compte le plus fréquent sur les pièces est <b>${escapeHtml(detected)}</b>, alors que le compte caisse réglé est <b>${escapeHtml(getCaisse())}</b>. Vérifiez le réglage à l'étape 1.`);
      }
    }
    reparse();
    renderFileList();
    refreshAll();
  }

  function rebuildPages() {
    const pages = [];
    let n = 1;
    for (const d of state.docs) {
      d.pieceCount = 0;
      for (const p of d.pages) {
        const page = { pageNumber: n++, docId: d.id, pageInDoc: p.pageInDoc, width: p.width, height: p.height, words: p.words };
        d.pieceCount += P.countForms(page);
        pages.push(page);
      }
    }
    state.pages = pages;
  }

  function pageRef(globalPage) {
    const p = state.pages.find((x) => x.pageNumber === globalPage);
    if (!p) return null;
    const doc = state.docs.find((d) => d.id === p.docId);
    if (!doc) return null;
    return { doc, docIndex: state.docs.indexOf(doc), pageInDoc: p.pageInDoc };
  }

  // Étiquette courte d'une page : "p. 5" (un seul fichier) ou "F2 p. 5" (plusieurs fichiers)
  function pageLabel(globalPage, withBadge) {
    const ref = pageRef(globalPage);
    if (!ref) return `p. ${globalPage}`;
    if (state.docs.length <= 1) return `p. ${ref.pageInDoc}`;
    const badge = `F${ref.docIndex + 1}`;
    return withBadge
      ? `<span class="fbadge" title="${escapeHtml(ref.doc.name)}">${badge}</span>p. ${ref.pageInDoc}`
      : `${badge} p. ${ref.pageInDoc} (${ref.doc.name})`;
  }

  function renderFileList() {
    const has = state.docs.length > 0;
    els.pdfListBox.classList.toggle('hidden', !has);
    if (!has) { els.pdfList.innerHTML = ''; return; }
    els.pdfList.innerHTML = state.docs.map((d, i) =>
      `<tr data-id="${d.id}">` +
      `<td class="badge">F${i + 1}</td>` +
      `<td class="name">${escapeHtml(d.name)}</td>` +
      `<td class="meta">${d.numPages} page(s) · ${d.pieceCount} pièce(s)</td>` +
      `<td class="actions">` +
      `<button type="button" class="small" data-action="up" title="Monter" ${i === 0 ? 'disabled' : ''}>▲</button>` +
      `<button type="button" class="small" data-action="down" title="Descendre" ${i === state.docs.length - 1 ? 'disabled' : ''}>▼</button>` +
      `<button type="button" class="small danger" data-action="remove" title="Retirer ce fichier">✕</button>` +
      `</td></tr>`
    ).join('');
  }

  els.pdfList.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-action]');
    if (!btn) return;
    const tr = btn.closest('tr');
    const id = Number(tr.dataset.id);
    const idx = state.docs.findIndex((d) => d.id === id);
    if (idx < 0) return;
    const action = btn.dataset.action;
    if (action === 'up' && idx > 0) {
      [state.docs[idx - 1], state.docs[idx]] = [state.docs[idx], state.docs[idx - 1]];
    } else if (action === 'down' && idx < state.docs.length - 1) {
      [state.docs[idx + 1], state.docs[idx]] = [state.docs[idx], state.docs[idx + 1]];
    } else if (action === 'remove') {
      const d = state.docs[idx];
      if (!confirm(`Retirer le fichier « ${d.name} » et ses ${d.pieceCount} pièce(s) ?`)) return;
      state.docs.splice(idx, 1);
      try { d.doc.destroy(); } catch (e) { /* ignore */ }
      for (const k of Array.from(state.renderCache.keys())) if (k.startsWith(`${d.id}:`)) state.renderCache.delete(k);
    } else {
      return;
    }
    els.pdfNotices.innerHTML = '';
    afterDocsChanged();
  });

  els.pdfNotices.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-action="show-page"]');
    if (!btn) return;
    const ref = pageRef(Number(btn.dataset.page));
    if (!ref) return;
    state.selectedId = null;
    els.body.querySelectorAll('tr.entry').forEach((r) => r.classList.remove('selected'));
    els.step3.classList.remove('hidden');
    showPage(ref, `Page sans texte – ${escapeHtml(ref.doc.name)}, page ${ref.pageInDoc} sur ${ref.doc.numPages}`, '', 1);
    els.step3.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  els.btnSortFiles.addEventListener('click', () => {
    state.docs.sort((a, b) => naturalCompare(a.name, b.name));
    els.pdfNotices.innerHTML = '';
    afterDocsChanged();
  });

  els.btnClearFiles.addEventListener('click', () => {
    if (!state.docs.length) return;
    if (!confirm('Retirer tous les fichiers PDF chargés ? Les écritures reconnues (et vos corrections) seront effacées.')) return;
    for (const d of state.docs) { try { d.doc.destroy(); } catch (e) { /* ignore */ } }
    state.docs = [];
    state.renderCache.clear();
    els.pdfNotices.innerHTML = '';
    els.pdfInfo.textContent = '';
    afterDocsChanged();
  });

  /**
   * Analyse toutes les pages chargées. Les écritures déjà présentes (même fichier, même page)
   * conservent les valeurs corrigées par l'utilisateur ; les écritures manuelles sont gardées.
   */
  function reparse() {
    const caisse = getCaisse();
    const existing = existingEntries();
    const history = existing.filter((e) => e.compte).map((e) => ({ type: P.typeFromLibelle(e.libelle), compte: e.compte }));
    const res = P.parseDocument(state.pages, {
      caisse,
      history,
      vocabulary: state.vocab,
      existingNumbers: existing.map((e) => Number(e.no)).filter((n) => !isNaN(n)),
    });

    const sourceKey = (globalPage) => {
      const p = state.pages.find((x) => x.pageNumber === globalPage);
      return p ? `${p.docId}:${p.pageInDoc}` : null;
    };
    const previous = new Map();
    for (const e of state.entries) if (e.sourceKey) previous.set(e.sourceKey, e);
    const manual = state.entries.filter((e) => e.manual);

    const entries = res.entries.map((e) => {
      const key = sourceKey(e.page);
      const old = key ? previous.get(key) : null;
      if (old) {
        // garde les corrections de l'utilisateur, rafraîchit ce qui vient de l'analyse
        old.page = e.page;
        // un nouvel avertissement remet la ligne « à vérifier »
        if (e.warnings.some((w) => !old.warnings.includes(w))) old.checked = false;
        old.warnings = e.warnings.slice();
        old.notes = (e.notes || []).slice();
        old.candidates = e.candidates;
        old.raw = e.raw;
        if (!old.edited) {
          old.no = e.no; old.date = e.date; old.compte = e.compte || ''; old.libelle = e.libelle; old.debit = e.debit; old.credit = e.credit;
          old.checked = e.warnings.length === 0;
        }
        return old;
      }
      return {
        id: state.nextId++,
        sourceKey: key,
        no: e.no,
        date: e.date,
        compte: e.compte || '',
        libelle: e.libelle,
        debit: e.debit,
        credit: e.credit,
        page: e.page,
        warnings: e.warnings.slice(),
        notes: (e.notes || []).slice(),
        candidates: e.candidates,
        raw: e.raw,
        checked: e.warnings.length === 0,
        manual: false,
        edited: false,
      };
    });
    state.entries = entries.concat(manual);
    state.duplicates = res.duplicates;
    state.docWarnings = res.warnings;
    if (!state.entries.some((e) => e.id === state.selectedId)) state.selectedId = state.entries.length ? state.entries[0].id : null;

    const textPages = state.pages.filter((p) => p.words.length).length;
    if (state.docs.length) {
      els.pdfInfo.innerHTML =
        `<b>${state.docs.length}</b> fichier(s), ${state.pages.length} page(s), ${res.pieceCount} pièce(s) comptable(s) reconnue(s), ` +
        `<b>${state.entries.filter((e) => !e.manual).length}</b> écriture(s)` +
        (res.duplicates.length ? `, ${res.duplicates.length} doublon(s) ignoré(s)` : '') + '.';
    }
    if (state.pages.length && !textPages) {
      notice(els.pdfNotices, 'err', "Ces PDF ne contiennent aucun texte : ils ont été scannés sans reconnaissance de texte (OCR). Rescannez-les en mode « PDF consultable » (option OCR du copieur) ou utilisez la fonction de reconnaissance de texte d'Acrobat, puis réessayez.");
    } else if (state.pages.length && !res.pieceCount) {
      notice(els.pdfNotices, 'err', "Aucune pièce comptable n'a été reconnue (formulaire « PIÈCE COMPTABLE » avec colonnes DOIT / SOMME / AVOIR).");
    }
    if (res.duplicates.length) {
      notice(els.pdfNotices, 'ok', 'Pièces en double (même numéro et même montant, copie jointe à une autre pièce) ignorées : ' +
        res.duplicates.map((d) => `n° ${d.no} (${escapeHtml(pageLabel(d.page))}, identique à ${escapeHtml(pageLabel(d.sameAs))})`).join(', ') + '.');
    }
    for (const w of res.warnings) notice(els.pdfNotices, 'warn', escapeHtml(w));
    if (state.pages.length && textPages && textPages < state.pages.length) {
      const list = res.emptyPages.slice(0, 40).map((n) => `<button type="button" class="small" data-action="show-page" data-page="${n}">${escapeHtml(pageLabel(n))}</button>`).join(' ');
      notice(els.pdfNotices, 'warn', `${state.pages.length - textPages} page(s) sans texte (tickets, photos) : normal pour les justificatifs. ` +
        `Si l'une d'elles est une pièce comptable, elle a été scannée sans reconnaissance de texte : ajoutez-la à la main (« Ajouter une écriture manuelle »). Voir : ${list}` +
        (res.emptyPages.length > 40 ? ' …' : ''));
    }
  }

  /* ---------------- Étape 3 : tableau ---------------- */
  function rowIssues(e) {
    const errs = [];
    if (!e.date) errs.push('Date manquante');
    if (!e.compte) errs.push('Compte manquant');
    if (!e.libelle) errs.push('Libellé manquant');
    const d = Number(e.debit) || 0;
    const c = Number(e.credit) || 0;
    if (!d && !c) errs.push('Montant manquant (débit ou crédit)');
    if (d && c) errs.push('Débit et crédit renseignés en même temps');
    if (e.no == null || e.no === '') errs.push('Numéro de pièce manquant');
    return errs;
  }

  function rowStatus(e) {
    if (rowIssues(e).length) return 'err';
    if (e.warnings.length && !e.checked) return 'warn';
    return 'ok';
  }

  function rowMessages(e) {
    const items = rowIssues(e).map((m) => `<li class="err">${escapeHtml(m)}</li>`)
      .concat(e.warnings.map((m) => `<li>${escapeHtml(m)}</li>`))
      .concat((e.notes || []).map((m) => `<li class="note">${escapeHtml(m)}</li>`));
    if (!items.length) return '';
    let html = `<ul>${items.join('')}</ul>`;
    const cands = (e.candidates || []).filter((a) => a !== e.compte);
    if ((e.candidates || []).length > 1 && cands.length) {
      html += `<div style="margin-top:4px">Compte : ` +
        cands.map((a) => `<button type="button" class="small" data-action="use-account" data-account="${escapeHtml(a)}">Utiliser ${escapeHtml(a)}</button>`).join('') + `</div>`;
    }
    return html;
  }

  function renderTable() {
    const body = els.body;
    body.innerHTML = '';
    for (const e of state.entries) {
      const status = rowStatus(e);
      const tr = document.createElement('tr');
      tr.className = 'entry' + (e.id === state.selectedId ? ' selected' : '');
      tr.dataset.id = e.id;
      tr.innerHTML =
        `<td class="status ${status}" title="${status === 'ok' ? 'En ordre' : status === 'warn' ? 'À vérifier' : 'Incomplet'}">${status === 'ok' ? '✓' : status === 'warn' ? '⚠' : '✖'}</td>` +
        `<td><input type="text" class="no" data-field="no" value="${escapeHtml(e.no == null ? '' : e.no)}"></td>` +
        `<td><input type="text" class="date" data-field="date" placeholder="jj.mm.aaaa" value="${escapeHtml(P.isoToDisplay(e.date))}"></td>` +
        `<td><input type="text" class="compte" data-field="compte" list="accountsList" value="${escapeHtml(e.compte)}"></td>` +
        `<td class="libelle"><input type="text" data-field="libelle" value="${escapeHtml(e.libelle)}"></td>` +
        `<td><input type="number" class="num" step="0.01" data-field="debit" value="${fmtInput(e.debit)}"></td>` +
        `<td><input type="number" class="num" step="0.01" data-field="credit" value="${fmtInput(e.credit)}"></td>` +
        `<td class="page">${e.page ? pageLabel(e.page, true) : (e.manual ? 'manuel' : '')}</td>` +
        `<td class="check"><input type="checkbox" data-field="checked" ${e.checked ? 'checked' : ''} title="Marquer comme vérifié"></td>` +
        `<td><button type="button" class="small danger" data-action="delete" title="Supprimer cette écriture">✕</button></td>`;
      body.appendChild(tr);

      const msgs = rowMessages(e);
      if (msgs) {
        const tr2 = document.createElement('tr');
        tr2.className = 'msgs';
        tr2.dataset.id = e.id;
        tr2.innerHTML = `<td colspan="10">${msgs}</td>`;
        body.appendChild(tr2);
      }
    }
    // Liste des comptes connus (classeur + pièces)
    const accounts = new Set();
    for (const e of existingEntries()) if (e.compte) accounts.add(e.compte);
    for (const e of state.entries) { if (e.compte) accounts.add(e.compte); (e.candidates || []).forEach((a) => accounts.add(a)); }
    els.accountsList.innerHTML = Array.from(accounts).sort().map((a) => `<option value="${escapeHtml(a)}">`).join('');
    renderSummary();
  }

  function renderSummary() {
    const n = state.entries.length;
    const errs = state.entries.filter((e) => rowStatus(e) === 'err').length;
    const warns = state.entries.filter((e) => rowStatus(e) === 'warn').length;
    els.rowSummary.innerHTML = `${n} écriture(s) – <span style="color:var(--ok)">${n - errs - warns} en ordre</span>` +
      (warns ? `, <span style="color:var(--warn)">${warns} à vérifier</span>` : '') +
      (errs ? `, <span style="color:var(--err)">${errs} incomplète(s)</span>` : '');
  }

  function updateRowStatus(id) {
    const e = state.entries.find((x) => x.id === id);
    if (!e) return;
    const status = rowStatus(e);
    const tr = els.body.querySelector(`tr.entry[data-id="${id}"]`);
    if (tr) {
      const td = tr.querySelector('td.status');
      td.className = `status ${status}`;
      td.textContent = status === 'ok' ? '✓' : status === 'warn' ? '⚠' : '✖';
    }
    let tr2 = els.body.querySelector(`tr.msgs[data-id="${id}"]`);
    const msgs = rowMessages(e);
    if (msgs) {
      if (!tr2) {
        tr2 = document.createElement('tr');
        tr2.className = 'msgs';
        tr2.dataset.id = id;
        tr.insertAdjacentElement('afterend', tr2);
      }
      tr2.innerHTML = `<td colspan="10">${msgs}</td>`;
    } else if (tr2) {
      tr2.remove();
    }
    renderSummary();
  }

  els.body.addEventListener('input', (ev) => {
    const input = ev.target;
    const field = input.dataset.field;
    if (!field) return;
    const tr = input.closest('tr');
    const id = Number(tr.dataset.id);
    const e = state.entries.find((x) => x.id === id);
    if (!e) return;
    if (field === 'no') {
      const v = input.value.trim();
      e.no = v === '' ? null : (/^\d+$/.test(v) ? parseInt(v, 10) : v);
    } else if (field === 'date') {
      e.date = P.displayToIso(input.value);
    } else if (field === 'compte') {
      e.compte = input.value.trim();
    } else if (field === 'libelle') {
      e.libelle = input.value;
    } else if (field === 'debit' || field === 'credit') {
      const v = input.value.trim();
      e[field] = v === '' ? null : P.round2(Number(v.replace(',', '.')));
    }
    e.edited = true;
    updateRowStatus(id);
    renderTotals();
  });

  els.body.addEventListener('change', (ev) => {
    const input = ev.target;
    if (input.dataset.field === 'checked') {
      const id = Number(input.closest('tr').dataset.id);
      const e = state.entries.find((x) => x.id === id);
      if (e) { e.checked = input.checked; e.edited = true; updateRowStatus(id); }
    } else if (input.dataset.field === 'date') {
      // reformate la date proprement
      const id = Number(input.closest('tr').dataset.id);
      const e = state.entries.find((x) => x.id === id);
      if (e && e.date) input.value = P.isoToDisplay(e.date);
    } else if (input.dataset.field === 'compte') {
      const id = Number(input.closest('tr').dataset.id);
      const e = state.entries.find((x) => x.id === id);
      const norm = P.normalizeAccount(input.value);
      if (e && norm) { e.compte = norm; input.value = norm; updateRowStatus(id); }
    }
  });

  els.body.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-action="delete"]');
    const useBtn = ev.target.closest('button[data-action="use-account"]');
    const tr = ev.target.closest('tr');
    if (!tr) return;
    const id = Number(tr.dataset.id);
    if (useBtn) {
      const e = state.entries.find((x) => x.id === id);
      if (e) {
        e.compte = useBtn.dataset.account;
        e.edited = true;
        const input = els.body.querySelector(`tr.entry[data-id="${id}"] input[data-field="compte"]`);
        if (input) input.value = e.compte;
        updateRowStatus(id);
      }
      return;
    }
    if (btn) {
      const e = state.entries.find((x) => x.id === id);
      if (e && confirm(`Supprimer l'écriture n° ${e.no != null ? e.no : '?'} ?`)) {
        state.entries = state.entries.filter((x) => x.id !== id);
        if (state.selectedId === id) state.selectedId = null;
        renderTable();
        renderTotals();
        renderPreview();
      }
      return;
    }
    if (state.selectedId !== id) {
      state.selectedId = id;
      els.body.querySelectorAll('tr.entry').forEach((r) => r.classList.toggle('selected', Number(r.dataset.id) === id));
      renderPreview();
    }
  });

  els.body.addEventListener('focusin', (ev) => {
    const tr = ev.target.closest('tr');
    if (!tr) return;
    const id = Number(tr.dataset.id);
    if (state.selectedId !== id) {
      state.selectedId = id;
      els.body.querySelectorAll('tr.entry').forEach((r) => r.classList.toggle('selected', Number(r.dataset.id) === id));
      renderPreview();
    }
  });

  els.btnAddRow.addEventListener('click', () => {
    const nos = state.entries.map((e) => Number(e.no)).filter((n) => !isNaN(n));
    const exNos = existingEntries().map((e) => Number(e.no)).filter((n) => !isNaN(n));
    const next = Math.max(0, ...nos, ...exNos) + 1;
    const last = state.entries[state.entries.length - 1];
    state.entries.push({
      id: state.nextId++, sourceKey: null, no: next, date: last ? last.date : null, compte: '', libelle: '', debit: null, credit: null,
      page: null, warnings: [], notes: [], candidates: [], raw: null, checked: true, manual: true, edited: true,
    });
    renderTable();
    renderTotals();
    const inputs = els.body.querySelectorAll('tr.entry:last-of-type input');
    if (inputs[3]) inputs[3].focus();
  });

  els.btnCheckAll.addEventListener('click', () => {
    state.entries.forEach((e) => { e.checked = true; e.edited = true; });
    renderTable();
  });

  /* ---------------- Aperçu ---------------- */
  let previewToken = 0;

  async function showPage(ref, navHtml, fieldsHtml, fraction) {
    const token = ++previewToken;
    els.previewNav.innerHTML = navHtml;
    els.previewFields.innerHTML = fieldsHtml || '';
    const cacheKey = `${ref.doc.id}:${ref.pageInDoc}:${fraction || 0.62}`;
    try {
      let canvas = state.renderCache.get(cacheKey);
      if (!canvas) {
        const page = await ref.doc.doc.getPage(ref.pageInDoc);
        const base = page.getViewport({ scale: 1 });
        const targetWidth = 800;
        const vp = page.getViewport({ scale: targetWidth / base.width });
        canvas = document.createElement('canvas');
        canvas.width = Math.round(vp.width);
        canvas.height = Math.round(vp.height * (fraction || 0.62)); // le haut de la page suffit (formulaire + date)
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        state.renderCache.set(cacheKey, canvas);
      }
      if (token !== previewToken) return;
      els.previewFrame.innerHTML = '';
      els.previewFrame.appendChild(canvas);
    } catch (err) {
      console.error(err);
      if (token === previewToken) els.previewFrame.innerHTML = `<span>Aperçu indisponible (${escapeHtml(err.message || err)})</span>`;
    }
  }

  async function renderPreview() {
    const e = state.entries.find((x) => x.id === state.selectedId);
    const ref = e && e.page ? pageRef(e.page) : null;
    if (!e || !ref) {
      previewToken++;
      els.previewFields.innerHTML = '';
      els.previewNav.textContent = e && e.manual ? 'Écriture saisie manuellement (pas de pièce).' : 'Sélectionnez une écriture pour afficher la pièce.';
      els.previewFrame.innerHTML = '<span>Aperçu de la pièce</span>';
      return;
    }
    const nav = `Pièce n° <b>${escapeHtml(e.no == null ? '?' : e.no)}</b> – ` +
      (state.docs.length > 1 ? `<b>F${ref.docIndex + 1}</b> ` : '') +
      `${escapeHtml(ref.doc.name)}, page ${ref.pageInDoc} sur ${ref.doc.numPages}` +
      (e.raw && e.raw.part ? ` (formulaire ${e.raw.part})` : '');
    let fields = '';
    const r = e.raw;
    if (r) {
      const dl = [
        ['N° lu', r.noRaw || '–'],
        ['DOIT', r.doit.join(', ') || '–'],
        ['AVOIR', r.avoir.join(', ') || '–'],
        ['SOMME', r.sommes.map((s) => s.raw).join(' | ') || '–'],
        ['Total', r.totalRaw || '–'],
        ['Libellé', r.libelleLines.join(' / ') || '–'],
        ['Date', r.dateRaw || '–'],
      ].map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('');
      fields = `<dl>${dl}</dl>`;
    }
    await showPage(ref, nav, fields, e.raw && e.raw.part ? 1 : 0.62);
  }

  /* ---------------- Étape 4 : totaux + Excel ---------------- */
  function allEntriesForExcel() {
    const news = state.entries.slice().sort((a, b) => {
      const na = Number(a.no); const nb = Number(b.no);
      if (isNaN(na) && isNaN(nb)) return 0;
      if (isNaN(na)) return 1;
      if (isNaN(nb)) return -1;
      return na - nb;
    });
    return existingEntries().map((e) => ({ no: e.no, date: e.date, compte: e.compte, libelle: e.libelle, debit: e.debit, credit: e.credit }))
      .concat(news.map((e) => ({ no: e.no, date: e.date, compte: e.compte, libelle: e.libelle, debit: e.debit, credit: e.credit })));
  }

  function renderTotals() {
    const opening = currentOpening();
    const tNew = X.computeTotals({ amount: 0 }, state.entries);
    const tAll = X.computeTotals(opening, allEntriesForExcel());
    const exist = existingEntries();
    const cards = [
      ['Solde de départ' + (state.mode === 'existing' && exist.length ? ' (classeur)' : ''), fmtCHF(state.mode === 'existing' && exist.length ? X.computeTotals(opening, exist).end : opening.amount), ''],
      ['Débits (nouvelles pièces)', '+ ' + fmtCHF(tNew.debits), ''],
      ['Crédits (nouvelles pièces)', '− ' + fmtCHF(tNew.credits), ''],
      ['Solde final', fmtCHF(tAll.end), 'end'],
    ];
    els.totals.innerHTML = cards.map(([l, v, c]) => `<div class="t ${c}"><div class="l">${escapeHtml(l)}</div><div class="v">${escapeHtml(v)}</div></div>`).join('');
  }

  function refreshAll() {
    const has = state.entries.length > 0;
    els.step3.classList.toggle('hidden', !has);
    els.step4.classList.toggle('hidden', !has);
    if (!has) return;
    renderTable();
    renderTotals();
    renderPreview();
    els.excelHint.textContent = `Fichier : ${X.suggestFileName(allEntriesForExcel(), currentOpening())}`;
  }

  /**
   * Enregistre le fichier : boîte de dialogue « Enregistrer sous » (Edge/Chrome) si disponible,
   * sinon téléchargement classique. Retourne le nom choisi, null (téléchargement) ou 'cancelled'.
   */
  async function saveBlob(blob, name) {
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: name,
          types: [{ description: 'Classeur Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return handle.name || name;
      } catch (e) {
        if (e && e.name === 'AbortError') return 'cancelled';
        console.warn('showSaveFilePicker indisponible, téléchargement classique', e);
      }
    }
    // Téléchargement classique : nom sans accents pour éviter un fichier nommé « download »
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    return null;
  }

  // Accès pour les tests automatisés
  window.CaisseApp = { state, addPdfFiles, reparse, refreshAll };

  els.btnExcel.addEventListener('click', async () => {
    els.excelNotices.innerHTML = '';
    const errs = state.entries.filter((e) => rowIssues(e).length);
    if (errs.length) {
      notice(els.excelNotices, 'err', `${errs.length} écriture(s) incomplète(s) (✖) : complétez-les avant de générer le fichier.`);
      return;
    }
    const warns = state.entries.filter((e) => rowStatus(e) === 'warn');
    if (warns.length && !confirm(`${warns.length} écriture(s) sont encore marquées « à vérifier ». Générer le fichier quand même ?`)) return;
    if (state.mode === 'new' && !els.openingDate.value) {
      if (!confirm('Aucune date de solde à nouveau n\'est indiquée. Continuer ?')) return;
    }
    // Numéros en double ?
    const all = allEntriesForExcel();
    const seen = new Map();
    const dups = [];
    for (const e of all) {
      const k = String(e.no);
      if (seen.has(k)) dups.push(k); else seen.set(k, true);
    }
    if (dups.length && !confirm(`Numéros de pièce en double dans le classeur : ${Array.from(new Set(dups)).join(', ')}. Continuer ?`)) return;

    els.btnExcel.disabled = true;
    try {
      const { workbook, finalBalance } = X.buildWorkbook({ opening: currentOpening(), entries: all });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const name = X.suggestFileName(all, currentOpening());
      const saved = await saveBlob(blob, name);
      if (saved === 'cancelled') return;
      notice(els.excelNotices, 'ok', `Fichier <b>${escapeHtml(saved || name)}</b> généré : ${all.length} écriture(s), solde final <b>${fmtCHF(finalBalance)}</b>.` +
        (saved ? '' : ' Il se trouve dans votre dossier Téléchargements.') + ' Ouvrez-le dans Excel pour contrôler, puis enregistrez-le à la place de votre classeur.');
    } catch (e) {
      console.error(e);
      notice(els.excelNotices, 'err', `Erreur lors de la génération : ${escapeHtml(e.message || e)}`);
    } finally {
      els.btnExcel.disabled = false;
    }
  });
})();
