/*
 * Interface de l'application (navigateur). Dépend de :
 *   window.pdfjsLib (pdf.js), window.ExcelJS, window.CaisseParser, window.CaisseExcel
 */
(function () {
  'use strict';

  const P = window.CaisseParser;
  const X = window.CaisseExcel;
  const pdfjsLib = window.pdfjsLib;
  // Base de référence intégrée à l'application (générée depuis un classeur, voir
  // tools/build-vocab.js). Les noms de personnes sont dans un module séparé.
  const BASE_VOCAB = (function () {
    const v = window.CaisseVocab || {};
    const noms = window.CaisseVocabNoms || {};
    return {
      words: v.words || [],
      persons: noms.persons || [],
      classTokens: v.classTokens || [],
      accounts: v.accounts || [],
      typeAccounts: v.typeAccounts || [],
      typeSides: v.typeSides || [],
      source: v.source || null,
      generated: v.generated || null,
      hasNames: !!(noms.persons && noms.persons.length),
    };
  })();

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
    mode: 'new',
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
    fullPage: false,
    vocab: null, // vocabulaire appris (classeur + mémoire locale)
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    modeRadios: document.querySelectorAll('input[name="mode"]'),
    newBox: $('newBox'),
    existingBox: $('existingBox'),
    openingHint: $('openingHint'),
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
    filterDoubt: $('filterDoubt'),
    btnNextDoubt: $('btnNextDoubt'),
    btnVerifyNext: $('btnVerifyNext'),
    btnFullPage: $('btnFullPage'),
    btnAddRow: $('btnAddRow'),
    btnCheckAll: $('btnCheckAll'),
    previewNav: $('previewNav'),
    previewFrame: $('previewFrame'),
    previewFields: $('previewFields'),
    accountsList: $('accountsList'),
    totals: $('totals'),
    checkTable: $('checkTable'),
    checkBalance: $('checkBalance'),
    checkDate: $('checkDate'),
    balanceResult: $('balanceResult'),
    btnReview: $('btnReview'),
    btnReport: $('btnReport'),
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
    const base = P.mergeVocabulary(P.emptyVocabulary(), BASE_VOCAB);
    try {
      const raw = localStorage.getItem('caisse.vocab');
      if (raw) {
        const v = JSON.parse(raw);
        if (v && Array.isArray(v.words)) return P.mergeVocabulary(base, v);
      }
    } catch (e) { /* ignore */ }
    return base;
  }
  function saveVocab() {
    try {
      // seule la part apprise en plus de la base intégrée est mémorisée
      const baseWords = new Set(BASE_VOCAB.words);
      const basePersons = new Set(BASE_VOCAB.persons);
      const baseClasses = new Set(BASE_VOCAB.classTokens);
      const baseAccounts = new Set(BASE_VOCAB.accounts);
      const extra = {
        words: state.vocab.words.filter((w) => !baseWords.has(w)),
        persons: state.vocab.persons.filter((p) => !basePersons.has(p)),
        classTokens: state.vocab.classTokens.filter((c) => !baseClasses.has(c)),
        accounts: state.vocab.accounts.filter((a) => !baseAccounts.has(a)),
        typeAccounts: state.vocab.typeAccounts.slice(-600),
        typeSides: state.vocab.typeSides.slice(-600),
      };
      localStorage.setItem('caisse.vocab', JSON.stringify(extra));
    } catch (e) { /* ignore */ }
  }
  function renderVocabInfo() {
    const v = state.vocab;
    const added = Math.max(0, v.words.length - BASE_VOCAB.words.length) + Math.max(0, v.persons.length - BASE_VOCAB.persons.length);
    let html = '';
    if (BASE_VOCAB.source) {
      html = `<b>Base de référence intégrée</b> (${escapeHtml(BASE_VOCAB.source)}) : ` +
        `${v.words.length} mot(s), ${v.persons.length} nom(s), ${v.accounts.length} compte(s), ` +
        `comptes et sens habituels par type d'écriture. Elle sert à corriger les lectures et à repérer les anomalies : ` +
        `aucun classeur n'est nécessaire pour lire des pièces.`;
      if (!BASE_VOCAB.hasNames) html += ' <i>Les noms de personnes ne sont pas inclus dans cette version ; ils s\'ajoutent si vous chargez un classeur.</i>';
    } else {
      html = 'Aucune base de référence intégrée : chargez un classeur pour améliorer la lecture des libellés.';
    }
    if (added) html += ` <span style="color:#2563eb">+ ${added} élément(s) appris sur ce PC.</span>`;
    els.vocabInfo.innerHTML = html;
  }
  state.vocab = loadVocab();
  renderVocabInfo();

  /* ---------------- Solde à nouveau proposé d'après la dernière utilisation ---------------- */
  function loadLastBalance() {
    try {
      const raw = localStorage.getItem('caisse.dernierSolde');
      if (!raw) return null;
      const v = JSON.parse(raw);
      return v && typeof v.amount === 'number' ? v : null;
    } catch (e) { return null; }
  }
  function renderOpeningHint() {
    const last = loadLastBalance();
    if (!last) { els.openingHint.textContent = ''; return; }
    els.openingHint.innerHTML = `Dernier fichier généré : solde final <b>${fmtCHF(last.amount)}</b>` +
      (last.date ? ` au ${P.isoToDisplay(last.date)}` : '') +
      ` <button type="button" class="small" id="btnUseLast">Reprendre comme solde à nouveau</button>`;
    const b = $('btnUseLast');
    if (b) b.addEventListener('click', () => {
      els.openingAmount.value = last.amount;
      if (last.date) els.openingDate.value = last.date;
      refreshAll();
    });
  }

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

  function uniqList(arr) {
    return Array.from(new Set(arr));
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
    els.existingBox.classList.toggle('hidden', state.mode !== 'existing');
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
        `, solde actuel <b>${fmtCHF(totals.end)}</b>.`;
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

  renderOpeningHint();

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
    return { doc, docIndex: state.docs.indexOf(doc), pageInDoc: p.pageInDoc, pageWidth: p.width, pageHeight: p.height };
  }

  // Zones lues sur la pièce, avec leur niveau (doute / lu) pour les cadres de l'aperçu
  function zonesFor(e) {
    if (!e.raw || !e.raw.boxes) return [];
    const b = e.raw.boxes;
    const f = e.flags || {};
    const lvl = (field) => (fieldDoubt(e, field) ? 'doubt' : 'read');
    const z = [];
    if (b.no) z.push({ box: b.no, level: lvl('no'), label: 'N°' });
    if (b.date) z.push({ box: b.date, level: lvl('date'), label: 'Date' });
    if (b.doit) z.push({ box: b.doit, level: lvl('compte'), label: 'DOIT' });
    if (b.avoir) z.push({ box: b.avoir, level: lvl('compte'), label: 'AVOIR' });
    if (b.somme) z.push({ box: b.somme, level: lvl('montant'), label: 'Somme' });
    if (b.total) z.push({ box: b.total, level: lvl('montant'), label: 'Total' });
    if (b.libelle) z.push({ box: b.libelle, level: lvl('libelle'), label: 'Libellé' });
    return z;
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
        old.flags = e.flags;
        old.candidates = e.candidates;
        if (!old.edited) old.resolved = {};
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
        flags: e.flags,
        resolved: {},
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

  const FIELDS = ['no', 'date', 'compte', 'libelle', 'montant'];

  function rowStatus(e) {
    if (rowIssues(e).length) return 'err';
    if (FIELDS.some((f) => fieldDoubt(e, f))) return 'warn';
    return 'ok';
  }

  function rowMessages(e) {
    const status = rowStatus(e);
    // Une ligne en ordre n'affiche pas le détail des corrections : elles restent visibles par la
    // cellule bleue et son info-bulle. Le contenu ne dépend pas de la sélection, sinon cliquer
    // sur un bouton de la ligne le détruirait avant que le clic ne soit traité.
    const showNotes = status !== 'ok';
    const open = [];
    for (const f of FIELDS) if (fieldDoubt(e, f)) for (const x of e.flags[f]) if (x.level === 'doubt') open.push(x.message);
    const items = rowIssues(e).map((m) => `<li class="err">${escapeHtml(m)}</li>`)
      .concat(uniqList(open).map((m) => `<li>${escapeHtml(m)}</li>`))
      .concat(showNotes ? (e.notes || []).map((m) => `<li class="note">${escapeHtml(m)}</li>`) : []);
    if (!items.length) return '';
    let html = `<ul>${items.join('')}</ul>`;
    const swap = fieldDoubt(e, 'montant') && (e.flags.montant || []).map((f) => f.action).find((a) => a && a.type === 'swap');
    if (swap) {
      html += `<div style="margin-top:4px">Si la pièce a été remplie à l'envers : ` +
        `<button type="button" class="small" data-action="swap" data-side="${swap.side}">Passer en ${swap.side === 'debit' ? 'Débit (entrée)' : 'Crédit (sortie)'}</button></div>`;
    }
    const cands = (e.candidates || []).filter((a) => a !== e.compte);
    if ((e.candidates || []).length > 1 && cands.length) {
      html += `<div style="margin-top:4px">Compte : ` +
        cands.map((a) => `<button type="button" class="small" data-action="use-account" data-account="${escapeHtml(a)}">Utiliser ${escapeHtml(a)}</button>`).join('') + `</div>`;
    }
    return html;
  }

  // classe + info-bulle d'une cellule selon les drapeaux du champ
  function fieldDoubt(e, field) {
    if (e.checked) return false;
    if (e.resolved && e.resolved[field]) return false;
    return ((e.flags && e.flags[field]) || []).some((f) => f.level === 'doubt');
  }

  function cellAttrs(e, field) {
    const list = (e.flags && e.flags[field]) || [];
    if (fieldDoubt(e, field)) {
      return { cls: 'doubt', title: list.filter((f) => f.level === 'doubt').map((f) => f.message).join('\n') };
    }
    if (list.some((f) => f.level === 'note')) return { cls: 'fixed', title: list.filter((f) => f.level === 'note').map((f) => f.message).join('\n') };
    return { cls: '', title: '' };
  }

  function hasDoubt(e) {
    return rowStatus(e) !== 'ok';
  }

  function renderTable() {
    const body = els.body;
    body.innerHTML = '';
    const filter = els.filterDoubt.checked;
    for (const e of state.entries) {
      const status = rowStatus(e);
      const tr = document.createElement('tr');
      tr.className = 'entry' + (e.id === state.selectedId ? ' selected' : '') + (status === 'warn' ? ' warn-row' : '') + (filter && status === 'ok' ? ' hidden-row' : '');
      tr.dataset.id = e.id;
      const a = {
        no: cellAttrs(e, 'no'), date: cellAttrs(e, 'date'), compte: cellAttrs(e, 'compte'), libelle: cellAttrs(e, 'libelle'), montant: cellAttrs(e, 'montant'),
      };
      const attr = (x) => `class="${x.cls}" title="${escapeHtml(x.title)}"`;
      tr.innerHTML =
        `<td class="status ${status}" title="${status === 'ok' ? 'En ordre : lu sans ambiguïté' : status === 'warn' ? 'À vérifier : voir les cellules orange' : 'Incomplet'}">${status === 'ok' ? '✓' : status === 'warn' ? '⚠' : '✖'}</td>` +
        `<td><input type="text" class="no ${a.no.cls}" title="${escapeHtml(a.no.title)}" data-field="no" value="${escapeHtml(e.no == null ? '' : e.no)}"></td>` +
        `<td><input type="text" class="date ${a.date.cls}" title="${escapeHtml(a.date.title)}" data-field="date" placeholder="jj.mm.aaaa" value="${escapeHtml(P.isoToDisplay(e.date))}"></td>` +
        `<td><input type="text" class="compte ${a.compte.cls}" title="${escapeHtml(a.compte.title)}" data-field="compte" list="accountsList" value="${escapeHtml(e.compte)}"></td>` +
        `<td class="libelle"><input type="text" class="${a.libelle.cls}" title="${escapeHtml(a.libelle.title)}" data-field="libelle" value="${escapeHtml(e.libelle)}"></td>` +
        `<td><input type="number" class="num ${a.montant.cls}" title="${escapeHtml(a.montant.title)}" step="0.01" data-field="debit" value="${fmtInput(e.debit)}"></td>` +
        `<td><input type="number" class="num ${a.montant.cls}" title="${escapeHtml(a.montant.title)}" step="0.01" data-field="credit" value="${fmtInput(e.credit)}"></td>` +
        `<td class="page">${e.page ? pageLabel(e.page, true) : (e.manual ? 'manuel' : '')}</td>` +
        `<td class="check"><input type="checkbox" data-field="checked" ${e.checked ? 'checked' : ''} title="Marquer comme vérifié"></td>` +
        `<td><button type="button" class="small danger" data-action="delete" title="Supprimer cette écriture">✕</button></td>`;
      body.appendChild(tr);

      const msgs = rowMessages(e);
      if (msgs) {
        const tr2 = document.createElement('tr');
        tr2.className = 'msgs' + (filter && status === 'ok' ? ' hidden-row' : '');
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
    const fixed = state.entries.filter((e) => (e.notes || []).length).length;
    els.rowSummary.innerHTML = `${n} écriture(s) – <span style="color:var(--ok)">${n - errs - warns} en ordre</span>` +
      (warns ? `, <span style="color:var(--warn)">${warns} à vérifier</span>` : '') +
      (errs ? `, <span style="color:var(--err)">${errs} incomplète(s)</span>` : '') +
      (fixed ? ` <span style="color:#2563eb" title="Lignes dont un mot, un nom ou un compte a été corrigé automatiquement (cellule bleue)">· ${fixed} corrigée(s)</span>` : '');
    els.btnNextDoubt.disabled = !(errs + warns);
    els.btnVerifyNext.disabled = !(errs + warns);
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
      tr.classList.toggle('warn-row', status === 'warn');
      const map = { no: 'no', date: 'date', compte: 'compte', libelle: 'libelle', debit: 'montant', credit: 'montant' };
      tr.querySelectorAll('input[data-field]').forEach((inp) => {
        const f = map[inp.dataset.field];
        if (!f) return;
        const a = cellAttrs(e, f);
        inp.classList.remove('doubt', 'fixed');
        if (a.cls) inp.classList.add(a.cls);
        inp.title = a.title;
      });
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
      // Ne reconstruire que si le contenu change réellement : sinon un simple clic sur un
      // bouton de cette ligne détruirait ce bouton avant que le clic ne soit traité.
      const html = `<td colspan="10">${msgs}</td>`;
      if (tr2.innerHTML !== html) tr2.innerHTML = html;
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
    const FIELD_OF = { no: 'no', date: 'date', compte: 'compte', libelle: 'libelle', debit: 'montant', credit: 'montant' };
    if (FIELD_OF[field]) {
      e.resolved = e.resolved || {};
      e.resolved[FIELD_OF[field]] = true;
    }
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
    renderChecks();
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
    const swapBtn = ev.target.closest('button[data-action="swap"]');
    const tr = ev.target.closest('tr');
    if (!tr) return;
    const id = Number(tr.dataset.id);
    if (swapBtn) {
      const e = state.entries.find((x) => x.id === id);
      if (e) {
        const montant = e.debit != null ? e.debit : e.credit;
        if (swapBtn.dataset.side === 'debit') { e.debit = montant; e.credit = null; } else { e.credit = montant; e.debit = null; }
        e.edited = true;
        e.resolved = Object.assign({}, e.resolved, { montant: true });
        // mise à jour de la seule ligne concernée, pour ne pas détruire les autres boutons
        const row = els.body.querySelector(`tr.entry[data-id="${id}"]`);
        if (row) {
          const dInp = row.querySelector('input[data-field="debit"]');
          const cInp = row.querySelector('input[data-field="credit"]');
          if (dInp) dInp.value = fmtInput(e.debit);
          if (cInp) cInp.value = fmtInput(e.credit);
        }
        updateRowStatus(id);
        renderTotals();
        renderChecks();
      }
      return;
    }
    if (useBtn) {
      const e = state.entries.find((x) => x.id === id);
      if (e) {
        e.compte = useBtn.dataset.account;
        e.edited = true;
        e.resolved = Object.assign({}, e.resolved, { compte: true });
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
    if (state.selectedId !== id) selectEntry(id);
  });

  els.body.addEventListener('focusin', (ev) => {
    const tr = ev.target.closest('tr');
    if (!tr) return;
    const id = Number(tr.dataset.id);
    if (state.selectedId !== id) selectEntry(id);
  });

  els.btnAddRow.addEventListener('click', () => {
    const nos = state.entries.map((e) => Number(e.no)).filter((n) => !isNaN(n));
    const exNos = existingEntries().map((e) => Number(e.no)).filter((n) => !isNaN(n));
    const next = Math.max(0, ...nos, ...exNos) + 1;
    const last = state.entries[state.entries.length - 1];
    state.entries.push({
      id: state.nextId++, sourceKey: null, no: next, date: last ? last.date : null, compte: '', libelle: '', debit: null, credit: null,
      page: null, warnings: [], notes: [], flags: { no: [], date: [], compte: [], libelle: [], montant: [] }, resolved: {}, candidates: [], raw: null, checked: true, manual: true, edited: true,
    });
    renderTable();
    renderTotals();
    const inputs = els.body.querySelectorAll('tr.entry:last-of-type input');
    if (inputs[3]) inputs[3].focus();
  });

  els.btnCheckAll.addEventListener('click', () => {
    const reste = state.entries.filter((e) => rowStatus(e) === 'warn');
    if (reste.length) {
      const nos = reste.map((e) => e.no == null ? '?' : e.no).join(', ');
      const ok = confirm(
        `Attention : ${reste.length} ligne(s) portent encore une alerte de lecture.\n\n` +
        `Pièces concernées : ${nos}\n\n` +
        `Les marquer toutes vérifiées sans les regarder revient à accepter ces lectures telles quelles. ` +
        `Une erreur de sens ou de montant passerait alors dans le fichier Excel.\n\n` +
        `Voulez-vous plutôt les contrôler une par une (Annuler), ou tout valider quand même (OK) ?`);
      if (!ok) { gotoNextDoubt(null); return; }
    }
    state.entries.forEach((e) => { e.checked = true; e.edited = true; });
    renderTable();
    renderChecks();
  });

  els.filterDoubt.addEventListener('change', () => renderTable());

  function selectEntry(id) {
    state.selectedId = id;
    els.body.querySelectorAll('tr.entry').forEach((r) => r.classList.toggle('selected', Number(r.dataset.id) === id));
    const tr = els.body.querySelector(`tr.entry[data-id="${id}"]`);
    if (tr) tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    renderPreview();
  }

  function gotoNextDoubt(fromId) {
    const list = state.entries;
    const start = fromId != null ? list.findIndex((e) => e.id === fromId) : -1;
    for (let k = 1; k <= list.length; k++) {
      const e = list[(start + k) % list.length];
      if (hasDoubt(e)) { selectEntry(e.id); return true; }
    }
    return false;
  }

  els.btnNextDoubt.addEventListener('click', () => {
    if (!gotoNextDoubt(state.selectedId)) alert('Aucune ligne à vérifier : tout est en ordre.');
  });

  els.btnVerifyNext.addEventListener('click', () => {
    const e = state.entries.find((x) => x.id === state.selectedId);
    if (e) {
      e.checked = true;
      e.edited = true;
      const cb = els.body.querySelector(`tr.entry[data-id="${e.id}"] input[data-field="checked"]`);
      if (cb) cb.checked = true;
      updateRowStatus(e.id);
      if (els.filterDoubt.checked) renderTable();
    }
    if (!gotoNextDoubt(state.selectedId)) { renderPreview(); alert('Toutes les lignes sont vérifiées.'); }
  });

  els.btnFullPage.addEventListener('click', () => {
    state.fullPage = !state.fullPage;
    els.btnFullPage.textContent = state.fullPage ? 'Haut de page' : 'Page entière';
    renderPreview();
  });

  /* ---------------- Aperçu ---------------- */
  let previewToken = 0;

  async function showPage(ref, navHtml, fieldsHtml, fraction, zones) {
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
      els.previewFrame.style.cursor = 'zoom-in';
      els.previewFrame.title = 'Cliquer pour agrandir la pièce';
      if (zones && zones.length) {
        const ov = document.createElement('canvas');
        ov.className = 'overlay';
        ov.width = canvas.width;
        ov.height = canvas.height;
        const octx = ov.getContext('2d');
        const scale = canvas.width / ref.pageWidth;
        for (const z of zones) {
          if (!z.box) continue;
          const x = z.box.x * scale - 4; const y = z.box.y * scale - 3; const w = z.box.w * scale + 8; const h = z.box.h * scale + 6;
          octx.lineWidth = z.level === 'doubt' ? 4 : 2;
          octx.strokeStyle = z.level === 'doubt' ? 'rgba(217,119,6,0.95)' : 'rgba(37,99,235,0.7)';
          octx.fillStyle = z.level === 'doubt' ? 'rgba(251,191,36,0.22)' : 'rgba(96,165,250,0.10)';
          octx.fillRect(x, y, w, h);
          octx.strokeRect(x, y, w, h);
          octx.font = 'bold 15px Segoe UI, Arial, sans-serif';
          octx.fillStyle = z.level === 'doubt' ? '#b45309' : '#1d4ed8';
          octx.fillText(z.label, x + 2, Math.max(14, y - 5));
        }
        els.previewFrame.appendChild(ov);
      }
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
    const zones = zonesFor(e);
    const needFull = state.fullPage || (e.raw && e.raw.part) || zones.some((z) => z.box && (z.box.y + z.box.h) > ref.pageHeight * 0.6);
    await showPage(ref, nav, fields, needFull ? 1 : 0.62, zones);
  }

  // Agrandissement plein écran de l'aperçu (clic sur l'image)
  els.previewFrame.addEventListener('click', () => {
    const canvases = els.previewFrame.querySelectorAll('canvas');
    if (!canvases.length) return;
    const box = document.createElement('div');
    box.className = 'zoom-overlay';
    box.innerHTML = '<div class="zoom-inner"></div><div class="zoom-hint">Cliquer ou appuyer sur Échap pour fermer</div>';
    const inner = box.querySelector('.zoom-inner');
    canvases.forEach((c) => {
      const copy = document.createElement('canvas');
      copy.width = c.width;
      copy.height = c.height;
      copy.className = c.className;
      copy.getContext('2d').drawImage(c, 0, 0);
      inner.appendChild(copy);
    });
    const close = () => { box.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (ev) => { if (ev.key === 'Escape') close(); };
    box.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(box);
  });

  // Raccourcis clavier : Ctrl/⌘+Entrée = vérifié puis ligne suivante à contrôler
  document.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter' && !els.step3.classList.contains('hidden')) {
      ev.preventDefault();
      els.btnVerifyNext.click();
    }
  });

  /* ---------------- Contrôle pièce par pièce ---------------- */
  const review = { open: false, id: null, el: null, token: 0 };

  function reviewList() {
    return state.entries.filter((e) => e.page);
  }

  function openReview(startId) {
    const list = reviewList();
    if (!list.length) { alert('Aucune pièce à contrôler.'); return; }
    review.open = true;
    review.id = startId != null && list.some((e) => e.id === startId) ? startId : list[0].id;
    if (!review.el) {
      review.el = document.createElement('div');
      review.el.className = 'review';
      review.el.innerHTML =
        '<header>' +
        '<span class="title">Contrôle des pièces</span>' +
        '<span class="progress" id="rvProgress"></span>' +
        '<span class="spacer"></span>' +
        '<button type="button" id="rvPrev">◀ Précédente</button>' +
        '<button type="button" id="rvNextDoubt">Prochaine à vérifier</button>' +
        '<button type="button" class="primary" id="rvOk">✓ Correct → suivante</button>' +
        '<button type="button" id="rvClose">Fermer</button>' +
        '</header>' +
        '<div class="body"><div class="sheet" id="rvSheet"></div><div class="side" id="rvSide"></div></div>';
      document.body.appendChild(review.el);
      $('rvClose').addEventListener('click', closeReview);
      $('rvPrev').addEventListener('click', () => moveReview(-1));
      $('rvOk').addEventListener('click', () => { markReviewed(true); moveReview(1); });
      $('rvNextDoubt').addEventListener('click', () => gotoReviewDoubt());
      review.el.addEventListener('input', (ev) => {
        const f = ev.target.dataset && ev.target.dataset.rvField;
        if (!f) return;
        const e = state.entries.find((x) => x.id === review.id);
        if (!e) return;
        const val = ev.target.value;
        if (f === 'no') e.no = val.trim() === '' ? null : (/^\d+$/.test(val.trim()) ? parseInt(val, 10) : val.trim());
        else if (f === 'date') e.date = P.displayToIso(val);
        else if (f === 'compte') e.compte = val.trim();
        else if (f === 'libelle') e.libelle = val;
        else if (f === 'debit' || f === 'credit') e[f] = val.trim() === '' ? null : P.round2(Number(val.replace(',', '.')));
        e.edited = true;
        const champ = { no: 'no', date: 'date', compte: 'compte', libelle: 'libelle', debit: 'montant', credit: 'montant' }[f];
        if (champ) e.resolved = Object.assign({}, e.resolved, { [champ]: true });
        renderReviewMessages();
      });
      document.addEventListener('keydown', (ev) => {
        if (!review.open) return;
        if (ev.key === 'Escape') { closeReview(); return; }
        if (ev.target && /^(INPUT|TEXTAREA)$/.test(ev.target.tagName)) return;
        if (ev.key === 'ArrowRight' || ev.key === ' ') { ev.preventDefault(); markReviewed(true); moveReview(1); }
        else if (ev.key === 'ArrowLeft') { ev.preventDefault(); moveReview(-1); }
      });
    }
    review.el.style.display = 'flex';
    renderReview();
  }

  function closeReview() {
    review.open = false;
    if (review.el) review.el.style.display = 'none';
    renderTable();
    renderTotals();
    renderChecks();
    renderPreview();
  }

  function markReviewed(ok) {
    const e = state.entries.find((x) => x.id === review.id);
    if (!e) return;
    e.seen = true;
    if (ok && rowStatus(e) !== 'err') e.checked = true;
  }

  function moveReview(step) {
    const list = reviewList();
    const i = list.findIndex((e) => e.id === review.id);
    const j = i + step;
    if (j < 0) return;
    if (j >= list.length) { closeReview(); alert('Toutes les pièces ont été parcourues.'); return; }
    review.id = list[j].id;
    renderReview();
  }

  function gotoReviewDoubt() {
    const list = reviewList();
    const i = list.findIndex((e) => e.id === review.id);
    for (let k = 1; k <= list.length; k++) {
      const e = list[(i + k) % list.length];
      if (rowStatus(e) !== 'ok') { review.id = e.id; renderReview(); return; }
    }
    alert('Aucune pièce ne porte encore d\'alerte.');
  }

  function renderReviewMessages() {
    const e = state.entries.find((x) => x.id === review.id);
    if (!e) return;
    const box = $('rvMsgs');
    if (!box) return;
    const open = [];
    for (const f of FIELDS) if (fieldDoubt(e, f)) for (const x of e.flags[f]) if (x.level === 'doubt') open.push(x.message);
    const items = rowIssues(e).map((m) => `<li class="err">${escapeHtml(m)}</li>`)
      .concat(uniqList(open).map((m) => `<li>${escapeHtml(m)}</li>`))
      .concat((e.notes || []).map((m) => `<li class="note">${escapeHtml(m)}</li>`));
    box.innerHTML = items.length ? `<ul>${items.join('')}</ul>` : '<div style="color:var(--ok)">✓ Lue sans ambiguïté</div>';
    review.el.querySelectorAll('input[data-rv-field]').forEach((inp) => {
      const map = { no: 'no', date: 'date', compte: 'compte', libelle: 'libelle', debit: 'montant', credit: 'montant' };
      inp.classList.toggle('doubt', fieldDoubt(e, map[inp.dataset.rvField]));
    });
  }

  async function renderReview() {
    const e = state.entries.find((x) => x.id === review.id);
    if (!e) return;
    e.seen = true;
    const list = reviewList();
    const i = list.findIndex((x) => x.id === review.id);
    const restant = state.entries.filter((x) => x.page && !x.seen).length;
    $('rvProgress').textContent = `Pièce ${i + 1} / ${list.length} – ${restant} pas encore affichée(s)`;
    const ref = pageRef(e.page);
    $('rvSide').innerHTML =
      `<div class="f"><label>N° de pièce</label><input type="text" data-rv-field="no" value="${escapeHtml(e.no == null ? '' : e.no)}"></div>` +
      `<div class="f"><label>Date</label><input type="text" data-rv-field="date" value="${escapeHtml(P.isoToDisplay(e.date))}" placeholder="jj.mm.aaaa"></div>` +
      `<div class="f"><label>Compte de contrepartie</label><input type="text" data-rv-field="compte" list="accountsList" value="${escapeHtml(e.compte)}"></div>` +
      `<div class="f"><label>Libellé</label><input type="text" data-rv-field="libelle" value="${escapeHtml(e.libelle)}"></div>` +
      `<div class="f amount"><div><label>Débit (entrée)</label><input type="number" step="0.01" data-rv-field="debit" value="${fmtInput(e.debit)}"></div>` +
      `<div><label>Crédit (sortie)</label><input type="number" step="0.01" data-rv-field="credit" value="${fmtInput(e.credit)}"></div></div>` +
      `<div class="msgs" id="rvMsgs"></div>` +
      (e.candidates && e.candidates.length > 1 ? `<div class="legend">Comptes lus sur la pièce : ${e.candidates.map((a) => `<button type="button" class="small" data-rv-account="${escapeHtml(a)}">${escapeHtml(a)}</button>`).join(' ')}</div>` : '') +
      `<div class="actions"><button type="button" class="primary" id="rvOk2">✓ Correct → suivante</button>` +
      `<button type="button" id="rvSwap">↔ Inverser débit / crédit</button></div>` +
      `<div class="legend" style="margin-top:6px">La pièce est parfois remplie à l'envers (compte caisse du mauvais côté) : l'application lit ce qui est écrit et le signale, à vous de trancher.</div>` +
      `<div class="legend" style="margin-top:10px">Raccourcis : <b>→</b> ou <b>Espace</b> valide et passe à la suivante, <b>←</b> revient, <b>Échap</b> ferme.</div>`;
    $('rvOk2').addEventListener('click', () => { markReviewed(true); moveReview(1); });
    $('rvSwap').addEventListener('click', () => {
      const d = e.debit; e.debit = e.credit; e.credit = d;
      e.edited = true;
      e.resolved = Object.assign({}, e.resolved, { montant: true });
      renderReview();
    });
    $('rvSide').querySelectorAll('button[data-rv-account]').forEach((b) => b.addEventListener('click', () => {
      e.compte = b.dataset.rvAccount;
      e.edited = true;
      e.resolved = Object.assign({}, e.resolved, { compte: true });
      renderReview();
    }));
    renderReviewMessages();
    // image de la pièce
    const token = ++review.token;
    const sheet = $('rvSheet');
    sheet.innerHTML = '<span style="color:var(--muted);padding:20px">Chargement de la pièce…</span>';
    try {
      const page = await ref.doc.doc.getPage(ref.pageInDoc);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: 1400 / base.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height * 0.66);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      if (token !== review.token) return;
      sheet.innerHTML = '';
      sheet.appendChild(canvas);
      const zones = zonesFor(e);
      if (zones.length) {
        const ov = document.createElement('canvas');
        ov.width = canvas.width; ov.height = canvas.height;
        const octx = ov.getContext('2d');
        const scale = canvas.width / ref.pageWidth;
        for (const z of zones) {
          if (!z.box) continue;
          const x = z.box.x * scale - 5, y = z.box.y * scale - 4, w = z.box.w * scale + 10, h = z.box.h * scale + 8;
          octx.lineWidth = z.level === 'doubt' ? 4 : 2;
          octx.strokeStyle = z.level === 'doubt' ? 'rgba(217,119,6,0.95)' : 'rgba(37,99,235,0.55)';
          if (z.level === 'doubt') { octx.fillStyle = 'rgba(251,191,36,0.20)'; octx.fillRect(x, y, w, h); }
          octx.strokeRect(x, y, w, h);
          octx.font = 'bold 16px Segoe UI, Arial, sans-serif';
          octx.fillStyle = z.level === 'doubt' ? '#b45309' : '#1d4ed8';
          octx.fillText(z.label, x + 2, Math.max(15, y - 5));
        }
        ov.className = 'overlay';
        ov.style.width = '100%';
        sheet.appendChild(ov);
      }
    } catch (err) {
      console.error(err);
      if (token === review.token) sheet.innerHTML = `<span style="color:var(--err);padding:20px">Aperçu indisponible : ${escapeHtml(err.message || err)}</span>`;
    }
  }

  els.btnReview.addEventListener('click', () => openReview(state.selectedId));

  /**
   * Rapport de contrôle : récapitulatif du lot et détail des pièces signalées,
   * à imprimer ou à conserver avec les pièces.
   */
  els.btnReport.addEventListener('click', () => {
    const c = lotChecks();
    const t = X.computeTotals(currentOpening(), allEntriesForExcel());
    const op = currentOpening();
    const esc = escapeHtml;
    const ligne = (e) => {
      const msgs = [];
      for (const f of FIELDS) if (fieldDoubt(e, f)) for (const x of e.flags[f]) if (x.level === 'doubt') msgs.push(x.message);
      return `<tr><td>${esc(e.no == null ? '?' : e.no)}</td><td>${esc(P.isoToDisplay(e.date))}</td><td>${esc(e.compte)}</td>` +
        `<td>${esc(e.libelle)}</td><td class="n">${e.debit != null ? fmtCHF(e.debit) : ''}</td><td class="n">${e.credit != null ? fmtCHF(e.credit) : ''}</td>` +
        `<td>${esc(e.page ? pageLabel(e.page) : 'manuel')}</td><td>${esc(uniqList(msgs).join(' ; '))}</td></tr>`;
    };
    const signalees = state.entries.filter((e) => rowStatus(e) !== 'ok');
    const soldeSaisi = els.checkBalance.value.trim();
    const ecart = soldeSaisi === '' ? null : P.round2(t.end - Number(soldeSaisi.replace(',', '.')));
    const html =
      `<!doctype html><meta charset="utf-8"><title>Rapport de contrôle – caisse</title>` +
      `<style>body{font-family:Arial,Helvetica,sans-serif;font-size:12px;margin:24px;color:#111}` +
      `h1{font-size:17px;margin:0 0 4px}h2{font-size:13px;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.04em;color:#555}` +
      `table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top}` +
      `th{background:#eee}td.n{text-align:right;white-space:nowrap}dl{display:grid;grid-template-columns:260px 1fr;gap:3px 10px;margin:0}` +
      `dt{color:#555}dd{margin:0;font-weight:bold}.ko{color:#b3261e}.ok{color:#1e7f4f}@media print{body{margin:10mm}}</style>` +
      `<h1>Rapport de contrôle de la caisse</h1><div>Édité le ${esc(P.isoToDisplay(new Date().toISOString().slice(0, 10)))}` +
      (state.docs.length ? ` – pièces : ${esc(state.docs.map((d) => d.name).join(', '))}` : '') + `</div>` +
      `<h2>Récapitulatif</h2><dl>` +
      `<dt>Solde à nouveau${op.date ? ' au ' + esc(P.isoToDisplay(op.date)) : ''}</dt><dd>${esc(fmtCHF(op.amount))}</dd>` +
      `<dt>Pièces lues dans ce lot</dt><dd>${c.count}</dd>` +
      `<dt>Total des débits (entrées)</dt><dd>${esc(fmtCHF(t.debits))}</dd>` +
      `<dt>Total des crédits (sorties)</dt><dd>${esc(fmtCHF(t.credits))}</dd>` +
      `<dt>Solde calculé</dt><dd>${esc(fmtCHF(t.end))}</dd>` +
      (ecart == null ? '' : `<dt>Solde réel compté</dt><dd>${esc(fmtCHF(Number(soldeSaisi.replace(',', '.'))))}</dd>` +
        `<dt>Écart</dt><dd class="${Math.abs(ecart) < 0.005 ? 'ok' : 'ko'}">${esc(fmtCHF(ecart))}${Math.abs(ecart) < 0.005 ? ' (rapprochement correct)' : ' (à expliquer)'}</dd>`) +
      `<dt>Numéros manquants</dt><dd class="${c.manquants.length ? 'ko' : 'ok'}">${c.manquants.length ? esc(c.manquants.join(', ')) : 'aucun'}</dd>` +
      `<dt>Numéros en double</dt><dd class="${c.doublons.length ? 'ko' : 'ok'}">${c.doublons.length ? esc(c.doublons.join(', ')) : 'aucun'}</dd>` +
      `<dt>Pièces affichées à l'écran</dt><dd>${c.count - c.jamaisVues.length} sur ${c.count}</dd>` +
      `<dt>Lignes encore signalées</dt><dd class="${signalees.length ? 'ko' : 'ok'}">${signalees.length}</dd>` +
      `</dl>` +
      (signalees.length ? `<h2>Pièces signalées</h2><table><tr><th>N°</th><th>Date</th><th>Compte</th><th>Libellé</th><th>Débit</th><th>Crédit</th><th>Page</th><th>Motif</th></tr>` +
        signalees.map(ligne).join('') + `</table>` : '<h2>Pièces signalées</h2><div class="ok">Aucune.</div>') +
      `<h2>Toutes les écritures du lot</h2><table><tr><th>N°</th><th>Date</th><th>Compte</th><th>Libellé</th><th>Débit</th><th>Crédit</th><th>Page</th><th>Motif</th></tr>` +
      state.entries.map(ligne).join('') + `</table>`;
    const w = window.open('', '_blank');
    if (!w) { alert('Le navigateur a bloqué l\'ouverture du rapport. Autorisez les fenêtres surgissantes pour cette page.'); return; }
    w.document.write(html);
    w.document.close();
  });

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

  /**
   * Contrôles du lot : séquence des numéros, doublons, lignes non contrôlées.
   * Sert à la fois au tableau de l'étape 4 et au refus de générer un fichier douteux.
   */
  function lotChecks() {
    const news = state.entries;
    const nos = news.map((e) => Number(e.no)).filter((n) => !isNaN(n));
    const counts = new Map();
    for (const n of nos) counts.set(n, (counts.get(n) || 0) + 1);
    const doublons = Array.from(counts.entries()).filter(([, c]) => c > 1).map(([n]) => n).sort((a, b) => a - b);
    const manquants = [];
    if (nos.length) {
      for (let n = Math.min.apply(null, nos); n <= Math.max.apply(null, nos); n++) if (!counts.has(n)) manquants.push(n);
    }
    const existNos = new Set(existingEntries().map((e) => Number(e.no)).filter((n) => !isNaN(n)));
    const dejaLa = nos.filter((n) => existNos.has(n));
    const sansNo = news.filter((e) => e.no == null || e.no === '').length;
    const aVerifier = news.filter((e) => rowStatus(e) === 'warn');
    const incompletes = news.filter((e) => rowStatus(e) === 'err');
    const jamaisVues = news.filter((e) => !e.seen && !e.checked && !e.edited && !e.manual);
    return { doublons, manquants, dejaLa: uniqList(dejaLa), sansNo, aVerifier, incompletes, jamaisVues, count: news.length };
  }

  function renderChecks() {
    const c = lotChecks();
    const t = X.computeTotals(currentOpening(), allEntriesForExcel());
    const line = (k, v, level, action) =>
      `<tr class="${level}"><td class="k">${k}</td><td class="v">${v}${action || ''}</td></tr>`;
    const btn = (label, act) => ` <button type="button" class="small" data-check="${act}">${label}</button>`;
    const rows = [];
    rows.push(line('Pièces lues dans ce lot', `${c.count}`, 'ok'));
    rows.push(c.manquants.length
      ? line('Numéros manquants dans la suite', `${c.manquants.length} : ${c.manquants.slice(0, 20).join(', ')}${c.manquants.length > 20 ? '…' : ''}`, 'err')
      : line('Suite des numéros', 'complète, sans trou', 'ok'));
    rows.push(c.doublons.length
      ? line('Numéros en double', `${c.doublons.join(', ')}`, 'err', btn('Voir', 'dup'))
      : line('Numéros en double', 'aucun', 'ok'));
    if (c.dejaLa.length) rows.push(line('Numéros déjà dans le classeur', c.dejaLa.join(', '), 'err'));
    if (c.sansNo) rows.push(line('Pièces sans numéro', String(c.sansNo), 'err'));
    rows.push(c.incompletes.length
      ? line('Lignes incomplètes', String(c.incompletes.length), 'err', btn('Voir', 'err'))
      : line('Lignes incomplètes', 'aucune', 'ok'));
    rows.push(c.aVerifier.length
      ? line('Lignes à vérifier', String(c.aVerifier.length), 'warn', btn('Voir', 'warn'))
      : line('Lignes à vérifier', 'aucune', 'ok'));
    rows.push(c.jamaisVues.length
      ? line('Pièces jamais affichées', `${c.jamaisVues.length} sur ${c.count}`, 'warn', btn('Contrôler', 'review'))
      : line('Pièces affichées au moins une fois', `${c.count} sur ${c.count}`, 'ok'));
    rows.push(line('Total des débits', fmtCHF(t.debits), 'ok'));
    rows.push(line('Total des crédits', fmtCHF(t.credits), 'ok'));
    rows.push(line('Solde calculé', fmtCHF(t.end), 'ok'));
    els.checkTable.innerHTML = rows.join('');
    renderBalanceCheck();
  }

  function renderBalanceCheck() {
    const v = els.checkBalance.value.trim();
    if (v === '') { els.balanceResult.innerHTML = ''; return; }
    const reel = Number(v.replace(',', '.'));
    if (!isFinite(reel)) { els.balanceResult.innerHTML = ''; return; }
    const t = X.computeTotals(currentOpening(), allEntriesForExcel());
    const ecart = P.round2(t.end - reel);
    if (Math.abs(ecart) < 0.005) {
      els.balanceResult.innerHTML = `<div class="balance-box ok">✓ Le solde calculé correspond exactement au solde réel : <b>${escapeHtml(fmtCHF(t.end))}</b>. Les écritures de ce lot sont cohérentes.</div>`;
    } else {
      els.balanceResult.innerHTML = `<div class="balance-box err">✖ Écart de <b>${escapeHtml(fmtCHF(Math.abs(ecart)))}</b> : le calcul donne ${escapeHtml(fmtCHF(t.end))}, vous avez compté ${escapeHtml(fmtCHF(reel))}.` +
        `<br>Une écriture a probablement été mal lue. Cherchez d'abord :` +
        `<ul style="margin:6px 0 0 0"><li>un montant de <b>${escapeHtml(fmtCHF(Math.abs(ecart) / 2))}</b> pris dans le mauvais sens (débit au lieu de crédit ou l'inverse) ;</li>` +
        `<li>une pièce de <b>${escapeHtml(fmtCHF(Math.abs(ecart)))}</b> oubliée ou comptée deux fois ;</li>` +
        `<li>les numéros manquants ou en double signalés à gauche.</li></ul></div>`;
    }
  }

  els.checkBalance.addEventListener('input', renderBalanceCheck);

  els.checkTable.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-check]');
    if (!b) return;
    const c = lotChecks();
    if (b.dataset.check === 'review') { openReview(c.jamaisVues[0] ? c.jamaisVues[0].id : null); return; }
    const list = b.dataset.check === 'dup'
      ? state.entries.filter((e) => c.doublons.includes(Number(e.no)))
      : b.dataset.check === 'err' ? c.incompletes : c.aVerifier;
    if (!list.length) return;
    els.step3.scrollIntoView({ behavior: 'smooth', block: 'start' });
    selectEntry(list[0].id);
  });

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
    renderChecks();
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
  window.CaisseApp = { state, addPdfFiles, reparse, refreshAll, gotoNextDoubt, selectEntry };

  els.btnExcel.addEventListener('click', async () => {
    els.excelNotices.innerHTML = '';
    const c = lotChecks();
    if (c.incompletes.length) {
      notice(els.excelNotices, 'err', `${c.incompletes.length} écriture(s) incomplète(s) (✖) : complétez-les avant de générer le fichier.`);
      selectEntry(c.incompletes[0].id);
      return;
    }
    // Anomalies de séquence : très probablement un numéro mal lu, donc une pièce perdue ou doublée
    const graves = [];
    if (c.manquants.length) graves.push(`• numéros absents de la suite : ${c.manquants.slice(0, 25).join(', ')}${c.manquants.length > 25 ? '…' : ''}`);
    if (c.doublons.length) graves.push(`• numéros en double : ${c.doublons.join(', ')}`);
    if (c.dejaLa.length) graves.push(`• numéros déjà présents dans le classeur : ${c.dejaLa.join(', ')}`);
    if (c.sansNo) graves.push(`• ${c.sansNo} pièce(s) sans numéro`);
    if (graves.length) {
      const ok = confirm(
        'La suite des numéros de pièces n\'est pas continue :\n\n' + graves.join('\n') +
        '\n\nC\'est le signe habituel d\'un numéro mal lu : une pièce peut manquer ou être comptée deux fois, ' +
        'et le solde final serait alors faux.\n\nGénérer le fichier quand même ?');
      if (!ok) return;
    }
    if (c.aVerifier.length) {
      const ok = confirm(
        `${c.aVerifier.length} ligne(s) portent encore une alerte de lecture (pièces ${c.aVerifier.map((e) => e.no == null ? '?' : e.no).join(', ')}).\n\n` +
        'Générer le fichier quand même ?');
      if (!ok) { gotoNextDoubt(null); return; }
    }
    if (c.jamaisVues.length > 0 && c.jamaisVues.length === c.count) {
      if (!confirm(`Aucune des ${c.count} pièces n'a été affichée à l'écran. Générer le fichier sans les avoir contrôlées ?`)) { openReview(null); return; }
    }
    const soldeSaisi = els.checkBalance.value.trim();
    if (soldeSaisi !== '') {
      const t0 = X.computeTotals(currentOpening(), allEntriesForExcel());
      const ecart = P.round2(t0.end - Number(soldeSaisi.replace(',', '.')));
      if (Math.abs(ecart) >= 0.005 && !confirm(`Le solde calculé (${fmtCHF(t0.end)}) ne correspond pas au solde réel saisi : écart de ${fmtCHF(Math.abs(ecart))}.\n\nGénérer le fichier malgré cet écart ?`)) return;
    }
    if (state.mode === 'new' && !els.openingDate.value) {
      if (!confirm('Aucune date de solde à nouveau n\'est indiquée. Continuer ?')) return;
    }
    const all = allEntriesForExcel();

    els.btnExcel.disabled = true;
    try {
      const { workbook, finalBalance } = X.buildWorkbook({ opening: currentOpening(), entries: all });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const name = X.suggestFileName(all, currentOpening());
      const saved = await saveBlob(blob, name);
      if (saved === 'cancelled') return;
      try {
        const lastDate = all.map((e) => e.date).filter(Boolean).sort().pop() || null;
        localStorage.setItem('caisse.dernierSolde', JSON.stringify({ amount: finalBalance, date: lastDate }));
      } catch (e) { /* ignore */ }
      // les écritures validées enrichissent la base pour les prochaines fois
      state.vocab = P.mergeVocabulary(state.vocab, P.learnVocabulary(state.entries.map((e) => ({ libelle: e.libelle, compte: e.compte, debit: e.debit, credit: e.credit }))));
      saveVocab();
      renderVocabInfo();
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
