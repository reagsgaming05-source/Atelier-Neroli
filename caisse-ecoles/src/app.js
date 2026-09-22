/*
 * Interface de l'application (navigateur). Dépend de :
 *   window.pdfjsLib (pdf.js), window.ExcelJS, window.CaisseParser, window.CaisseExcel,
 *   window.CaisseOCR (facultatif : seconde lecture par OCR local)
 */
(function () {
  'use strict';

  const P = window.CaisseParser;
  const K = window.CaisseCarnet || null; // carnet des données (espace « Données »)
  const X = window.CaisseExcel;
  const pdfjsLib = window.pdfjsLib;
  const O = window.CaisseOCR || null; // seconde lecture par OCR local (src/ocr.js)
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
      accountSides: v.accountSides || [],
      objetAccounts: v.objetAccounts || [],
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
    mode: 'registre', // base des écritures : registre de l'année (Saisie des pièces), classeur existant ou nouveau classeur
    existing: null, // { fileName, opening, entries, buffer }
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
    // seconde lecture par OCR local : relectures par zone, indexées par « doc:page:partie »
    ocr: { status: 'idle', engine: null, reads: new Map(), doneKeys: new Set(), done: 0, total: 0, run: 0, error: null, native: null },
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    modeRadios: document.querySelectorAll('input[name="mode"]'),
    newBox: $('newBox'),
    existingBox: $('existingBox'),
    registreBox: $('registreBox'),
    registreInfo: $('registreInfo'),
    step1Resume: $('step1Resume'),
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
    optOcr: $('optOcr'),
    ocrStatus: $('ocrStatus'),
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
    if (K) {
      const r = K.resume(K.actuel());
      const aj = K.GENRES.reduce((n, g) => n + r[g].ajoutes, 0);
      const re = K.GENRES.reduce((n, g) => n + r[g].retires, 0);
      if (aj || re) {
        html += ` <span style="color:#2563eb">Espace <b>Données</b> : ${aj} ajout(s), ${re} retrait(s).</span>`;
      }
    }
    // Logique comptable des libellés (voir TYPE_LOGIC dans parser.js)
    const logic = P.TYPE_LOGIC || {};
    const list = (side) => {
      const seen = new Set();
      return Object.keys(logic).filter((k) => logic[k] === side).map((k) => k.split(' ')[0]).filter((k) => !seen.has(k) && seen.add(k)).join(', ');
    };
    html += `<div style="margin-top:6px"><b>Logique des libellés</b> : ${escapeHtml(list('debit'))} = entrée en caisse (débit) · ` +
      `${escapeHtml(list('credit'))} = sortie de caisse (crédit) · DECOMPTE = selon la pièce. ` +
      `Une pièce remplie à l'envers est remise dans le bon sens et la cellule du montant passe en bleu.</div>`;
    els.vocabInfo.innerHTML = html;
  }
  state.vocab = loadVocab();

  /**
   * Le vocabulaire tel que l'application doit s'en servir : celui qu'elle a appris, plus les
   * ajouts de l'espace « Données », moins ce qui en a été retiré. C'est le seul vocabulaire que
   * lisent les listes, les comptes proposés et la correction des lectures ; `state.vocab` reste
   * la part apprise, celle qu'on enregistre.
   */
  function vocabActif() { return K ? K.appliquer(state.vocab, K.actuel()) : state.vocab; }
  /**
   * Le carnet des données a changé. Les listes déroulantes lisent le carnet au moment de
   * s'ouvrir : elles n'ont rien à faire. Le tableau des pièces scannées, lui, porte des champs
   * déjà posés — il est redessiné, ce qui leur rend une liste à jour.
   */
  function majDonnees() {
    renderVocabInfo();
    if (state.entries.length) renderTable();
  }

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
    // un solde à nouveau tapé mais illisible ne doit pas passer pour 0 sans le dire
    if (openingSaisi() == null) {
      els.openingHint.innerHTML = `<span style="color:var(--err);font-weight:600">« ${escapeHtml(String(els.openingAmount.value).trim())} » n'est pas un montant : le solde à nouveau est compté comme 0.</span>`;
      return;
    }
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

  /** Registre de l'année ouvert dans « Saisie des pièces » (même année, mêmes écritures). */
  function registre() {
    return window.CaisseSaisie && window.CaisseSaisie.state ? window.CaisseSaisie.state.reg : null;
  }

  // Versement du lot lu au journal (voir « Une seule liste » plus bas). Déclarés ici : l'ouverture
  // de l'écran appelle applyMode() → refreshAll() avant que le bloc du bas ne soit exécuté.
  let versementEnCours = false;
  let imagesEnCours = false;

  function currentOpening() {
    if (state.mode === 'registre') {
      const reg = registre();
      return reg ? { date: reg.opening.date || null, amount: Number(reg.opening.amount) || 0, libelle: 'Solde à nouveau' } : { date: null, amount: 0, libelle: 'Solde à nouveau' };
    }
    if (state.mode === 'existing' && state.existing) return state.existing.opening;
    return {
      date: els.openingDate.value || null,
      // un texte illisible vaut 0, et renderOpeningHint le dit à côté du champ
      amount: openingSaisi() ?? 0,
      libelle: 'Solde à nouveau',
    };
  }

  /** Écritures déjà dans la base choisie : registre de l'année ou classeur existant. */
  function existingEntries() {
    if (state.mode === 'registre') { const reg = registre(); return reg ? window.CaisseRegistre.entriesOf(reg) : []; }
    return state.mode === 'existing' && state.existing ? state.existing.entries : [];
  }
  const baseLabel = () => (state.mode === 'registre' ? 'le registre' : 'le classeur');
  const numNo = (e) => (e.no == null || e.no === '' ? NaN : Number(e.no));

  /* ---------------- Réglages de la lecture : base des écritures ---------------- */
  // Par défaut, le registre de l'année : les pièces lues y entrent toutes seules, à la suite de
  // celles déjà saisies. Sur une autre base (nouveau classeur, classeur existant), il faut un geste
  // explicite : « Verser au registre de l'année ». Une année commencée à l'ancienne se reprend par
  // « Reprendre ces écritures dans le registre » (classeur existant).
  function renderToRegisterButton() {
    const b = document.getElementById('btnToRegister');
    if (b) b.classList.toggle('hidden', state.mode === 'registre');
  }

  function applyMode(mode) {
    if (!['registre', 'existing', 'new'].includes(mode)) mode = 'registre';
    state.mode = mode;
    for (const r of els.modeRadios) r.checked = r.value === mode;
    els.newBox.classList.toggle('hidden', mode !== 'new');
    els.existingBox.classList.toggle('hidden', mode !== 'existing');
    if (els.registreBox) els.registreBox.classList.toggle('hidden', mode !== 'registre');
    try { localStorage.setItem('caisse.scan.base', mode); } catch (e) { /* ignore */ }
    renderRegistreInfo();
    renderStep1Resume();
    renderToRegisterButton(); // « Verser au registre » n'a de sens que si le registre n'est pas déjà la base
    if (state.pages.length) reparse();
    refreshAll();
  }
  els.modeRadios.forEach((r) => r.addEventListener('change', () => applyMode(document.querySelector('input[name="mode"]:checked').value)));

  // Les réglages de lecture sont repliés : le titre doit dire en une ligne ce qu'ils valent
  // aujourd'hui, pour qu'on n'ait pas à les déplier juste pour vérifier.
  function renderStep1Resume() {
    if (!els.step1Resume) return;
    const base = state.mode === 'new' ? 'nouveau classeur'
      : state.mode === 'existing' ? 'classeur Excel existant'
      : "registre de l'année";
    const ocr = els.optOcr && els.optOcr.checked ? 'OCR activé' : 'OCR désactivé';
    els.step1Resume.textContent = `— ${base}, compte caisse ${getCaisse()}, ${ocr}`;
  }

  function renderRegistreInfo() {
    if (!els.registreInfo) return;
    const reg = registre();
    if (!reg) { els.registreInfo.textContent = "Registre de l'année indisponible : ouvrez d'abord « Saisie des pièces »."; return; }
    const j = window.CaisseRegistre.journal(reg);
    const last = reg.pieces.length ? reg.pieces[reg.pieces.length - 1] : null;
    els.registreInfo.innerHTML = `Registre <b>${reg.annee}</b> (Saisie des pièces) : <b>${reg.pieces.length}</b> pièce(s), solde à nouveau <b>${fmtCHF(j.start)}</b>${reg.opening.date ? ` au ${escapeHtml(P.isoToDisplay(reg.opening.date))}` : ''}` +
      (last ? `, dernière pièce n° <b>${last.no == null ? '?' : last.no}</b>${last.date ? ` du ${escapeHtml(P.isoToDisplay(last.date))}` : ''}` : '') + `, solde actuel <b>${fmtCHF(j.end)}</b>. ` +
      `Les pièces lues ci-dessous entrent dans ce journal dès la lecture, marquées « à vérifier » : il n'y a qu'une seule liste. ` +
      `<button type="button" class="small" data-act="goSaisie">Ouvrir la saisie des pièces</button>`;
  }
  if (els.registreInfo) els.registreInfo.addEventListener('click', (ev) => { if (ev.target.closest('button[data-act="goSaisie"]')) showPanel('panelSaisie'); });
  // le registre a changé (ouvert, pièce enregistrée, classeur repris) : la base se met à jour
  document.addEventListener('caisse:registre', () => {
    if (state.mode !== 'registre' || versementEnCours) return;
    renderRegistreInfo();
    if (state.pages.length) reparse();
    refreshAll();
  });

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
        (window.CaisseSaisie && window.CaisseSaisie.importWorkbook ? ` <button type="button" class="small" data-act="toRegistre" title="Année commencée à l'ancienne : ses écritures entrent dans le registre de l'année (Saisie des pièces), rien n'est compté deux fois">Reprendre ces écritures dans le registre de l'année</button>` : '');
      state.existing.buffer = buf;
      const saisi = window.CaisseRegistre && window.CaisseRegistre.parseAmountInput(els.openingAmount.value);
      if (!saisi) els.openingAmount.value = totals.end;
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

  els.existingInfo.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button[data-act="toRegistre"]');
    if (!b || !state.existing || !state.existing.buffer || !window.CaisseSaisie) return;
    b.disabled = true;
    try {
      const r = await window.CaisseSaisie.importWorkbook(state.existing.buffer, state.existing.fileName);
      if (r) { applyMode('registre'); showPanel('panelSaisie'); }
    } finally { b.disabled = false; }
  });

  renderOpeningHint();

  els.openingDate.addEventListener('change', refreshAll);
  els.openingAmount.addEventListener('input', refreshAll);
  els.caisse.addEventListener('change', () => {
    try { localStorage.setItem('caisse.compte', els.caisse.value); } catch (e) { /* ignore */ }
    renderStep1Resume();
    if (state.pages.length) { reparse(); refreshAll(); }
  });

  /* ---------------- Étape 1 : PDF (plusieurs fichiers) ---------------- */
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
        notice(els.pdfNotices, 'warn', `Le compte le plus fréquent sur les pièces est <b>${escapeHtml(detected)}</b>, alors que le compte caisse réglé est <b>${escapeHtml(getCaisse())}</b>. Vérifiez-le dans « Réglages de la lecture ».`);
      }
    }
    reparse();
    renderFileList();
    refreshAll();
    startCrossReading();
  }

  function rebuildPages() {
    const pages = [];
    let n = 1;
    for (const d of state.docs) {
      d.pieceCount = 0;
      for (const p of d.pages) {
        const page = { pageNumber: n++, docId: d.id, pageInDoc: p.pageInDoc, width: p.width, height: p.height, words: p.words, source: p.source || 'text' };
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
    // les pièces versées au journal et pas encore vérifiées partent avec le lot
    retirerDuJournal().then((n) => { if (n) notice(els.pdfNotices, 'ok', `${n} pièce(s) non vérifiée(s) retirée(s) du journal.`); });
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
      vocabulary: vocabActif(),
      // n° déjà pris, avec leur montant : une pièce identique déjà enregistrée n'est pas signalée
      existingNumbers: existing.filter((e) => !isNaN(numNo(e))).map((e) => ({ no: numNo(e), debit: e.debit, credit: e.credit })),
      refine: state.ocr.reads.size ? refineWithOcr : null,
    });

    // Une page peut porter deux formulaires « PIÈCE COMPTABLE » : la clé retient aussi lequel,
    // sinon les deux écritures retombaient sur le même objet à la relecture (une pièce perdue,
    // l'autre en double dans le tableau, les totaux et le classeur produit).
    const sourceKey = (globalPage, part) => {
      const p = state.pages.find((x) => x.pageNumber === globalPage);
      return p ? `${p.docId}:${p.pageInDoc}:${part == null ? '' : part}` : null;
    };
    const previous = new Map();
    for (const e of state.entries) if (e.sourceKey) previous.set(e.sourceKey, e);
    const manual = state.entries.filter((e) => e.manual);

    const entries = res.entries.map((e) => {
      const key = sourceKey(e.page, e.part);
      const old = key ? previous.get(key) : null;
      if (old) {
        // garde les corrections de l'utilisateur, rafraîchit ce qui vient de l'analyse
        old.page = e.page;
        old.part = e.part;
        old.side = e.side;
        // pièce validée à la main dans « Contrôle des pièces » : elle le reste, sauf nouvel
        // avertissement. Sans cela, la fin de la relecture OCR effaçait tous les contrôles faits.
        const valideALaMain = !!(old.seen && old.checked);
        const nouvelAvert = e.warnings.some((w) => !old.warnings.includes(w));
        // un nouvel avertissement remet la ligne « à vérifier »
        if (nouvelAvert) old.checked = false;
        old.warnings = e.warnings.slice();
        old.notes = (e.notes || []).slice();
        old.flags = e.flags;
        old.candidates = e.candidates;
        old.crossChecked = !!e.crossChecked;
        if (!old.edited) old.resolved = {};
        old.raw = e.raw;
        if (!old.edited) {
          old.no = e.no; old.date = e.date; old.compte = e.compte || ''; old.libelle = e.libelle; old.debit = e.debit; old.credit = e.credit;
          old.checked = valideALaMain && !nouvelAvert ? true : e.warnings.length === 0;
        }
        return old;
      }
      return {
        id: state.nextId++,
        sourceKey: key,
        part: e.part,
        side: e.side,
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
        crossChecked: !!e.crossChecked,
        raw: e.raw,
        checked: e.warnings.length === 0,
        manual: false,
        edited: false,
      };
    });
    const learned = learnedCorrections();
    if (Object.keys(learned).length) for (const e of entries) if (!e.edited && !e.manual) applyLearnedCorrections(e, learned);
    state.entries = entries.concat(manual);
    state.duplicates = res.duplicates;
    state.docWarnings = res.warnings;
    if (!state.entries.some((e) => e.id === state.selectedId)) state.selectedId = state.entries.length ? state.entries[0].id : null;

    // Les constats de l'analyse sont refaits à chaque passage (fin de l'OCR, changement de mode,
    // de compte caisse…) : ils vivent dans leur propre bloc, vidé ici, pour ne pas s'empiler.
    // Les messages de chargement des fichiers, eux, restent où ils sont.
    let parseBox = els.pdfNotices.querySelector('#parseNotices');
    if (!parseBox) { parseBox = document.createElement('div'); parseBox.id = 'parseNotices'; els.pdfNotices.appendChild(parseBox); }
    parseBox.innerHTML = '';

    const textPages = state.pages.filter((p) => p.words.length).length;
    if (state.docs.length) {
      els.pdfInfo.innerHTML =
        `<b>${state.docs.length}</b> fichier(s), ${state.pages.length} page(s), ${res.pieceCount} pièce(s) comptable(s) reconnue(s), ` +
        `<b>${state.entries.filter((e) => !e.manual).length}</b> écriture(s)` +
        (res.duplicates.length ? `, ${res.duplicates.length} doublon(s) ignoré(s)` : '') + '.';
    }
    if (state.pages.length && !textPages) {
      notice(parseBox, 'err', "Ces PDF ne contiennent aucun texte : ils ont été scannés sans reconnaissance de texte (OCR). Rescannez-les en mode « PDF consultable » (option OCR du copieur) ou utilisez la fonction de reconnaissance de texte d'Acrobat, puis réessayez.");
    } else if (state.pages.length && !res.pieceCount) {
      notice(parseBox, 'err', "Aucune pièce comptable n'a été reconnue (formulaire « PIÈCE COMPTABLE » avec colonnes DOIT / SOMME / AVOIR).");
    }
    if (res.duplicates.length) {
      notice(parseBox, 'ok', 'Pièces en double (même numéro et même montant, copie jointe à une autre pièce) ignorées : ' +
        res.duplicates.map((d) => `n° ${d.no} (${escapeHtml(pageLabel(d.page))}, identique à ${escapeHtml(pageLabel(d.sameAs))})`).join(', ') + '.');
    }
    for (const w of res.warnings) notice(parseBox, 'warn', escapeHtml(w));
    if (state.pages.length && textPages && textPages < state.pages.length) {
      const list = res.emptyPages.slice(0, 40).map((n) => `<button type="button" class="small" data-action="show-page" data-page="${n}">${escapeHtml(pageLabel(n))}</button>`).join(' ');
      notice(parseBox, 'warn', `${state.pages.length - textPages} page(s) sans texte (tickets, photos) : normal pour les justificatifs. ` +
        `Si l'une d'elles est une pièce comptable, elle a été scannée sans reconnaissance de texte : ajoutez-la à la main (« Ajouter une écriture manuelle »). Voir : ${list}` +
        (res.emptyPages.length > 40 ? ' …' : ''));
    }
  }


  /* ---------------- Mémoire des corrections ---------------- */
  // Les corrections faites à la main (compte, n°, date, mot du libellé) sont mémorisées sur ce PC.
  // Une même lecture corrigée deux fois de la même façon est corrigée d'office ensuite (en bleu).
  const CORR_KEY = 'caisse.corrections';
  const CORR_MAX = 500;
  function loadCorrections() {
    try { const raw = localStorage.getItem(CORR_KEY); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
  }
  function saveCorrections(list) {
    try { localStorage.setItem(CORR_KEY, JSON.stringify(list.slice(-CORR_MAX))); } catch (e) { /* ignore */ }
  }
  /** Enregistre une correction { field, from, to } (valeurs textuelles). */
  function rememberCorrection(field, from, to) {
    from = String(from == null ? '' : from).trim(); to = String(to == null ? '' : to).trim();
    if (!from || !to || from === to) return;
    const list = loadCorrections();
    list.push({ field, from, to, t: Date.now() });
    saveCorrections(list);
  }
  /** Corrections apprises : { field: Map(from -> to) } pour celles vues au moins deux fois. */
  function learnedCorrections() {
    const counts = new Map();
    for (const c of loadCorrections()) {
      const k = `${c.field}\u0001${c.from}\u0001${c.to}`;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const out = {};
    for (const [k, n] of counts) {
      if (n < 2) continue;
      const [field, from, to] = k.split('\u0001');
      out[field] = out[field] || new Map();
      out[field].set(from, to);
    }
    return out;
  }
  /** Applique les corrections apprises à une écriture fraîchement lue (avant affichage). */
  function applyLearnedCorrections(e, learned) {
    const note = (field, msg) => { e.notes.push(msg); if (e.flags && e.flags[field]) e.flags[field].push({ level: 'note', message: msg }); };
    if (learned.compte && e.compte && learned.compte.has(e.compte)) {
      const to = learned.compte.get(e.compte);
      note('compte', `Compte ${e.compte} → ${to} d'après vos corrections précédentes`);
      e.compte = to;
    }
    if (learned.no && e.no != null && learned.no.has(String(e.no))) {
      const to = Number(learned.no.get(String(e.no)));
      if (!isNaN(to)) { note('no', `N° ${e.no} → ${to} d'après vos corrections précédentes`); e.no = to; }
    }
    if (learned.mot && e.libelle) {
      const parts = e.libelle.split(' ');
      const changed = [];
      const out = parts.map((w) => { if (learned.mot.has(w)) { changed.push(`« ${w} » → « ${learned.mot.get(w)} »`); return learned.mot.get(w); } return w; });
      if (changed.length) { e.libelle = out.join(' '); note('libelle', `Libellé corrigé d'après vos corrections précédentes : ${changed.join(', ')}`); }
    }
  }
  /** Compare l'ancienne et la nouvelle valeur d'un champ édité pour en tirer des corrections. */
  function noteEdit(e, field, before, after) {
    if (field === 'compte' || field === 'no') { rememberCorrection(field, before, after); return; }
    if (field === 'libelle') {
      const a = String(before || '').split(' '); const b = String(after || '').split(' ');
      if (a.length !== b.length) return; // un mot changé à la fois : sinon on n'apprend rien
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && a[i].length >= 3 && b[i].length >= 2) rememberCorrection('mot', a[i], b[i]);
    }
  }

  /* ---------------- Seconde lecture par OCR local ---------------- */
  // Après l'analyse instantanée de la couche texte, chaque pièce est relue sur son image par le
  // moteur OCR embarqué (voir src/ocr.js). Les relectures sont conservées par page et
  // réinjectées dans l'analyse (parseDocument({ refine })) : champs confirmés, complétés ou
  // contestés. Les pages sans couche texte sont d'abord lues entièrement.
  function ocrKey(docId, pageInDoc, part) { return `${docId}:${pageInDoc}:${part || ''}`; }

  function refineWithOcr(info, part, ctx) {
    const p = state.pages.find((x) => x.pageNumber === part.pageNumber);
    if (!p) return info;
    const reads = state.ocr.reads.get(ocrKey(p.docId, p.pageInDoc, part.part));
    return reads ? O.crossRead(info, reads, ctx) : info;
  }

  function ocrEnabled() {
    return !!O && !!els.optOcr && els.optOcr.checked;
  }

  function setPageWords(p, words, source) {
    const d = state.docs.find((x) => x.id === p.docId);
    const dp = d && d.pages.find((x) => x.pageInDoc === p.pageInDoc);
    if (dp) { dp.words = words; dp.source = source; }
  }

  function setOcrStatus(extraHtml) {
    const o = state.ocr;
    const box = els.ocrStatus;
    if (!box) return;
    box.classList.remove('hidden', 'ok', 'warn');
    if (o.status === 'idle' || o.status === 'off') { box.classList.add('hidden'); return; }
    if (o.status === 'unavailable') {
      box.classList.add('warn');
      box.innerHTML = `Seconde lecture (OCR local) indisponible dans ce navigateur${o.error ? ' : ' + escapeHtml(o.error) : ''}. L'application fonctionne avec la couche texte seule.`;
      return;
    }
    if (o.status === 'running') {
      const who = o.native && o.native.available ? `OCR local + Tesseract natif${o.native.legacy ? ' + moteur historique' : ''}` : 'OCR local';
      box.innerHTML = `<span>🔎 Lectures croisées (${escapeHtml(who)}, sur ce PC) : <b>${o.done} / ${o.total}</b> page(s)…</span><progress max="${o.total}" value="${o.done}"></progress><span class="legend">Les écritures sont déjà utilisables ; les confirmations arrivent à la fin.</span>`;
      return;
    }
    if (o.status === 'done') {
      box.classList.add('ok');
      box.innerHTML = extraHtml || '';
    }
  }

  function ocrSummaryHtml() {
    let confirmed = 0; let diverg = 0; let added = 0; let entries = 0;
    for (const e of state.entries) {
      if (!e.crossChecked) continue;
      entries++;
      for (const f of FIELDS) {
        const list = (e.flags && e.flags[f]) || [];
        if (list.some((x) => x.level === 'ok')) confirmed++;
        if (list.some((x) => x.level === 'doubt' && /OCR|lecture/i.test(x.message))) diverg++;
        if (list.some((x) => x.level === 'note' && /OCR|lecture/i.test(x.message))) added++;
      }
    }
    const ocrPages = state.pages.filter((p) => p.source === 'ocr').length;
    const o = state.ocr;
    const who = o.native && o.native.available ? `3 lectures${o.native.legacy ? ' + moteur historique sur les chiffres' : ''}` : '2 lectures';
    return `✓ Lectures croisées terminées (${who}) sur ${entries} pièce(s) : <b>${confirmed}</b> champ(s) confirmé(s) (liseré vert)` +
      (added ? `, <b>${added}</b> complété(s) ou corrigé(s) (bleu)` : '') +
      (diverg ? `, <b style="color:#b45309">${diverg}</b> divergence(s) à trancher (orange)` : ', aucune divergence') +
      (ocrPages ? `, ${ocrPages} page(s) scannée(s) sans texte lue(s) par l'OCR` : '') + '.';
  }

  async function startCrossReading() {
    const o = state.ocr;
    if (!ocrEnabled()) { o.status = 'off'; setOcrStatus(); return; }
    if (!O.available()) { o.status = 'unavailable'; o.error = 'moteur non embarqué ou WebAssembly indisponible'; setOcrStatus(); return; }
    const run = ++o.run;
    const todo = [];
    for (const p of state.pages) {
      const isForm = P.countForms(p) > 0;
      const empty = !p.words.length;
      if (!isForm && !empty) continue; // justificatifs avec texte : rien à relire
      if (o.doneKeys.has(`${p.docId}:${p.pageInDoc}`)) continue;
      todo.push({ p, empty });
    }
    if (!todo.length) { finishCrossReading(run, false); return; }
    o.status = 'running'; o.total = todo.length; o.done = 0; setOcrStatus();
    if (o.native == null) {
      try { o.native = window.CaisseNative ? await window.CaisseNative.ocrInfo() : { available: false }; } catch (e) { o.native = { available: false }; }
    }
    const nativeRec = o.native.available ? (png, opts) => window.CaisseNative.ocrRecognize(png, opts) : null;
    const index = P.buildIndex(vocabActif() || P.emptyVocabulary());
    try {
      if (!o.engine) o.engine = await O.createEngine();
    } catch (e) {
      console.warn('OCR local', e);
      o.status = 'unavailable'; o.error = e && e.message ? e.message : String(e); setOcrStatus();
      return;
    }
    if (run !== o.run) return;
    let wordsChanged = false;
    for (const { p, empty } of todo) {
      if (run !== o.run) return; // relance entre-temps (fichiers ajoutés ou retirés)
      const key = `${p.docId}:${p.pageInDoc}`;
      try {
        const ref = pageRef(p.pageNumber);
        if (!ref) continue;
        const pdfPage = await ref.doc.doc.getPage(p.pageInDoc);
        const raw = await O.renderPage(pdfPage, O.SCALE);
        let pre = null;
        const getPre = () => pre || (pre = O.preprocessCanvas(raw));
        let page = p;
        if (empty) {
          // page scannée sans reconnaissance de texte : est-ce une pièce ?
          const words = await O.readFullPage(o.engine, getPre);
          const probe = Object.assign({}, p, { words, source: 'ocr' });
          if (P.countForms(probe) > 0) {
            setPageWords(p, words, 'ocr');
            page = probe;
            wordsChanged = true;
          } else {
            o.doneKeys.add(key);
            o.done++; setOcrStatus();
            continue;
          }
        }
        for (const part of P.splitForms(page)) {
          const info = P.analyzePage(part);
          if (!info) continue;
          // les lecteurs travaillent en même temps : OCR local (worker) et Tesseract natif (processus)
          const jobs = [O.readZones(o.engine, raw, info, getPre).then((reads) => ({ name: 'OCR local', reads }))];
          if (nativeRec) {
            jobs.push(O.readZonesNative(nativeRec, raw, info, getPre, { oem: 1 }).then((reads) => ({ name: 'Tesseract natif', reads })).catch((e) => { console.warn('Lecteur natif', e); return null; }));
            if (o.native.legacy) jobs.push(O.readZonesNative(nativeRec, raw, info, getPre, { oem: 0, lang: 'fra_leg', numericOnly: true }).then((reads) => ({ name: 'moteur historique', reads })).catch((e) => { console.warn('Moteur historique', e); return null; }));
          }
          const readers = (await Promise.all(jobs)).filter(Boolean);
          if (nativeRec && readers.length > 1) {
            try {
              // lectures divergentes : relecture à 360 dpi des zones concernées
              const probe = O.crossRead(info, readers, { index, caisse: getCaisse() });
              const fields = probe.crossFlags.filter((f) => f.level === 'doubt' && f.action && f.action.type === 'set').map((f) => f.field);
              const zones = Array.from(new Set(fields.flatMap((f) => O.zonesForField(f))));
              if (zones.length) readers.push({ name: 'Tesseract natif 360 dpi', reads: await O.readZonesHiRes(nativeRec, pdfPage, info, zones, { oem: 1 }) });
            } catch (e) {
              console.warn('Lecteur natif', e);
            }
          }
          o.reads.set(ocrKey(p.docId, p.pageInDoc, part.part), readers);
        }
        o.doneKeys.add(key);
      } catch (e) {
        console.warn('Seconde lecture, page ' + p.pageNumber, e);
      }
      o.done++; setOcrStatus();
      await new Promise((r) => setTimeout(r, 0));
    }
    if (run !== o.run) return;
    finishCrossReading(run, wordsChanged);
  }

  function finishCrossReading(run, wordsChanged) {
    const o = state.ocr;
    if (run !== o.run) return;
    // ne pas reconstruire le tableau pendant une saisie
    const active = document.activeElement;
    if (active && els.body.contains(active) && active.tagName === 'INPUT') {
      setTimeout(() => finishCrossReading(run, wordsChanged), 1500);
      return;
    }
    if (wordsChanged) rebuildPages();
    o.status = 'done';
    reparse();
    refreshAll();
    setOcrStatus(ocrSummaryHtml());
  }

  /** Applique une valeur proposée par la seconde lecture à un champ (ne touche que la ligne). */
  function applyFieldValue(id, field, value) {
    const e = state.entries.find((x) => x.id === id);
    if (!e) return;
    const row = els.body.querySelector(`tr.entry[data-id="${id}"]`);
    const setInput = (f, v) => { const inp = row && row.querySelector(`input[data-field="${f}"]`); if (inp) inp.value = v; };
    if (field === 'no') { rememberCorrection('no', e.no, value); e.no = Number(value); setInput('no', e.no); }
    else if (field === 'date') { e.date = value; setInput('date', P.isoToDisplay(value)); }
    else if (field === 'compte') { rememberCorrection('compte', e.compte, value); e.compte = value; setInput('compte', value); }
    else if (field === 'montant') {
      const v = Number(value);
      // Aucun montant n'était lisible : c'est le sens lu sur la pièce qui décide, pas le débit par
      // défaut. Sinon accepter le montant proposé sur un remboursement (crédit) le basculait en
      // débit, et le solde s'écartait du double du montant.
      const sens = e.credit != null && e.debit == null ? 'credit'
        : (e.debit != null ? 'debit' : (e.side === 'credit' ? 'credit' : 'debit'));
      if (sens === 'credit') { e.credit = v; e.debit = null; setInput('credit', fmtInput(v)); setInput('debit', ''); }
      else { e.debit = v; e.credit = null; setInput('debit', fmtInput(v)); setInput('credit', ''); }
    } else return;
    e.edited = true;
    e.resolved = Object.assign({}, e.resolved, { [field]: true });
    updateRowStatus(id);
  }

  // réglage mémorisé sur ce PC
  if (els.optOcr) {
    try { if (localStorage.getItem('caisse.ocr') === '0') els.optOcr.checked = false; } catch (e) { /* ignore */ }
    if (!O || !O.available()) {
      els.optOcr.checked = false;
      els.optOcr.disabled = true;
      els.optOcr.parentElement.title = 'Moteur OCR non disponible dans cette version ou ce navigateur';
    }
    els.optOcr.addEventListener('change', () => {
      try { localStorage.setItem('caisse.ocr', els.optOcr.checked ? '1' : '0'); } catch (e) { /* ignore */ }
      renderStep1Resume();
      if (els.optOcr.checked && state.pages.length) startCrossReading();
      else if (!els.optOcr.checked) { state.ocr.run++; state.ocr.status = 'off'; setOcrStatus(); }
    });
  }

  /* ---------------- Étape 2 : tableau ---------------- */
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
    const sets = [];
    for (const f of FIELDS) if (fieldDoubt(e, f)) for (const x of e.flags[f]) if (x.level === 'doubt' && x.action && x.action.type === 'set') sets.push(x.action);
    if (sets.length) {
      html += `<div style="margin-top:4px">Seconde lecture : ` + sets.map((a) => {
        const shown = a.field === 'date' ? P.isoToDisplay(a.value) : a.field === 'montant' ? fmtCHF(a.value) : String(a.value);
        return `<button type="button" class="small" data-action="set" data-field="${a.field}" data-value="${escapeHtml(String(a.value))}">Prendre ${escapeHtml(shown)}</button>`;
      }).join('') + `</div>`;
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
    if (list.some((f) => f.level === 'ok')) return { cls: 'sure', title: list.filter((f) => f.level === 'ok').map((f) => f.message).join('\n') };
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
        `<td><input type="text" class="compte ${a.compte.cls}" title="${escapeHtml(a.compte.title)}" data-field="compte" value="${escapeHtml(e.compte)}"></td>` +
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
    brancherCombosComptes();
    renderSummary();
  }

  /**
   * Comptes proposables pour une écriture lue sur un scan, du plus probable au moins probable.
   *
   * C'est ici qu'on corrige un compte mal lu, et il n'y avait aucune liste : il fallait connaître
   * le numéro. Les comptes réellement lus sur la pièce passent devant — c'est presque toujours
   * l'un d'eux —, puis ceux qui conviennent au type d'écriture du libellé.
   */
  function comptesPour(e) {
    const R = window.CaisseRegistre;
    let piece = null;
    try { piece = R.piecesFromEntries([e], 'scan')[0]; } catch (err) { piece = null; }
    const choix = R.accountChoices(piece || {}, vocabActif(), registre());
    // un compte retiré dans l'espace « Données » ne revient ni par le registre, ni par la pièce
    const garde = K ? K.garde(K.actuel(), 'comptes') : () => true;
    const parNo = new Map(choix.map((c) => [c.compte, c]));
    const sortie = [];
    const vus = new Set();
    for (const a of e.candidates || []) {
      if (!a || vus.has(a) || !garde(a)) continue;
      vus.add(a);
      const c = parNo.get(a) || {};
      sortie.push({ value: a, hint: c.usage || '', note: 'lu sur la pièce', fort: true, titre: 'Ce compte figure sur la pièce scannée' });
    }
    for (const c of choix) {
      if (vus.has(c.compte) || !garde(c.compte)) continue;
      vus.add(c.compte);
      sortie.push({ value: c.compte, hint: c.usage, note: c.n ? `${c.n}×` : '', fort: c.niveau <= 1 });
    }
    // les comptes du classeur repris, absents du vocabulaire
    for (const x of existingEntries()) {
      if (x.compte && !vus.has(x.compte) && garde(x.compte)) { vus.add(x.compte); sortie.push({ value: x.compte, hint: '', note: '' }); }
    }
    return sortie;
  }

  /** Les lignes du tableau se redessinent sans cesse : chaque champ neuf reçoit sa liste. */
  function brancherCombosComptes() {
    const C = window.CaisseCombo;
    if (!C) return;
    for (const inp of els.body.querySelectorAll('input[data-field="compte"]:not([data-combo])')) {
      const tr = inp.closest('tr[data-id]');
      // dataset rend toujours une chaîne, alors que l'identifiant d'une écriture est un nombre :
      // comparés strictement, ils ne se rencontraient jamais et la liste restait vide
      const id = tr && String(tr.dataset.id);
      C.attach(inp, () => {
        const e = state.entries.find((x) => String(x.id) === id);
        return e ? comptesPour(e) : [];
      }, { vide: 'Aucun compte connu ne correspond. Le numéro tapé sera gardé tel quel.' });
    }
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

  // valeur lue avant la modification, pour la mémoire des corrections
  els.body.addEventListener('focusin', (ev) => {
    const input = ev.target;
    if (input.dataset && input.dataset.field && input.dataset.orig == null) input.dataset.orig = input.value;
  });

  els.body.addEventListener('change', (ev) => {
    const input = ev.target;
    if (['no', 'compte', 'libelle'].includes(input.dataset.field) && input.dataset.orig != null) {
      const tr0 = input.closest('tr');
      const e0 = state.entries.find((x) => x.id === Number(tr0.dataset.id));
      if (e0) noteEdit(e0, input.dataset.field, input.dataset.orig, input.value);
      input.dataset.orig = input.value;
    }
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

  // Passe le montant d'une écriture de l'autre côté (débit <-> crédit). Ne met à jour que la
  // ligne concernée, pour ne pas détruire les boutons des autres lignes.
  function applySwap(id, side) {
    const e = state.entries.find((x) => x.id === id);
    if (!e) return;
    const montant = e.debit != null ? e.debit : e.credit;
    if (montant == null) return;
    if (side === 'debit') { e.debit = montant; e.credit = null; } else { e.credit = montant; e.debit = null; }
    e.edited = true;
    e.resolved = Object.assign({}, e.resolved, { montant: true });
    const row = els.body.querySelector(`tr.entry[data-id="${id}"]`);
    if (row) {
      const dInp = row.querySelector('input[data-field="debit"]');
      const cInp = row.querySelector('input[data-field="credit"]');
      if (dInp) dInp.value = fmtInput(e.debit);
      if (cInp) cInp.value = fmtInput(e.credit);
    }
    updateRowStatus(id);
  }

  els.body.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-action="delete"]');
    const useBtn = ev.target.closest('button[data-action="use-account"]');
    const swapBtn = ev.target.closest('button[data-action="swap"]');
    const setBtn = ev.target.closest('button[data-action="set"]');
    const tr = ev.target.closest('tr');
    if (!tr) return;
    const id = Number(tr.dataset.id);
    if (setBtn) {
      applyFieldValue(id, setBtn.dataset.field, setBtn.dataset.value);
      renderTotals();
      renderChecks();
      return;
    }
    if (swapBtn) {
      applySwap(id, swapBtn.dataset.side);
      renderTotals();
      renderChecks();
      return;
    }
    if (useBtn) {
      const e = state.entries.find((x) => x.id === id);
      if (e) {
        rememberCorrection('compte', e.compte, useBtn.dataset.account);
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
    // « tr.entry:last-of-type » ne désignait jamais rien : chaque ligne est suivie d'un « tr.msgs »
    const lignes = els.body.querySelectorAll('tr.entry');
    const inputs = lignes.length ? lignes[lignes.length - 1].querySelectorAll('input') : [];
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
      `<div class="f"><label>Compte de contrepartie</label><input type="text" data-rv-field="compte" value="${escapeHtml(e.compte)}"></div>` +
      `<div class="f"><label>Libellé</label><input type="text" data-rv-field="libelle" value="${escapeHtml(e.libelle)}"></div>` +
      `<div class="f amount"><div><label>Débit (entrée)</label><input type="number" step="0.01" data-rv-field="debit" value="${fmtInput(e.debit)}"></div>` +
      `<div><label>Crédit (sortie)</label><input type="number" step="0.01" data-rv-field="credit" value="${fmtInput(e.credit)}"></div></div>` +
      `<div class="msgs" id="rvMsgs"></div>` +
      (e.candidates && e.candidates.length > 1 ? `<div class="legend">Comptes lus sur la pièce : ${e.candidates.map((a) => `<button type="button" class="small" data-rv-account="${escapeHtml(a)}">${escapeHtml(a)}</button>`).join(' ')}</div>` : '') +
      `<div class="actions"><button type="button" class="primary" id="rvOk2">✓ Correct → suivante</button>` +
      `<button type="button" id="rvSwap">↔ Inverser débit / crédit</button></div>` +
      `<div class="legend" style="margin-top:6px">La pièce est parfois remplie à l'envers (compte caisse du mauvais côté) : l'application lit ce qui est écrit et le signale, à vous de trancher.</div>` +
      `<div class="legend" style="margin-top:10px">Raccourcis : <b>→</b> ou <b>Espace</b> valide et passe à la suivante, <b>←</b> revient, <b>Échap</b> ferme.</div>`;
    // le volet se redessine à chaque pièce : son champ de compte reçoit la même liste
    if (window.CaisseCombo) {
      const inp = $('rvSide').querySelector('input[data-rv-field="compte"]');
      if (inp) window.CaisseCombo.attach(inp, () => comptesPour(e), { vide: 'Aucun compte connu ne correspond. Le numéro tapé sera gardé tel quel.' });
    }
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
    const reelCompte = soldeCompte();
    const ecart = reelCompte == null ? null : P.round2(t.end - reelCompte);
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
      (ecart == null ? '' : `<dt>Solde réel compté</dt><dd>${esc(fmtCHF(reelCompte))}</dd>` +
        `<dt>Écart</dt><dd class="${Math.abs(ecart) < 0.005 ? 'ok' : 'ko'}">${esc(fmtCHF(ecart))}${Math.abs(ecart) < 0.005 ? ' (rapprochement correct)' : ' (à expliquer)'}</dd>`) +
      `<dt>Numéros manquants</dt><dd class="${c.manquants.length ? 'ko' : 'ok'}">${c.manquants.length ? esc(c.manquants.join(', ')) : 'aucun'}</dd>` +
      `<dt>Numéros en double</dt><dd class="${c.doublons.length ? 'ko' : 'ok'}">${c.doublons.length ? esc(c.doublons.join(', ')) : 'aucun'}</dd>` +
      `<dt>Pièces affichées à l'écran</dt><dd>${c.count - c.jamaisVues.length} sur ${c.count}</dd>` +
      `<dt>Lignes encore signalées</dt><dd class="${signalees.length ? 'ko' : 'ok'}">${signalees.length}</dd>` +
      `</dl>` +
      (state.ocr.status === 'done' ? `<h2>Seconde lecture (OCR local)</h2><div>${ocrSummaryHtml()}</div>` : '') +
      (signalees.length ? `<h2>Pièces signalées</h2><table><tr><th>N°</th><th>Date</th><th>Compte</th><th>Libellé</th><th>Débit</th><th>Crédit</th><th>Page</th><th>Motif</th></tr>` +
        signalees.map(ligne).join('') + `</table>` : '<h2>Pièces signalées</h2><div class="ok">Aucune.</div>') +
      `<h2>Toutes les écritures du lot</h2><table><tr><th>N°</th><th>Date</th><th>Compte</th><th>Libellé</th><th>Débit</th><th>Crédit</th><th>Page</th><th>Motif</th></tr>` +
      state.entries.map(ligne).join('') + `</table>`;
    const w = window.open('', '_blank');
    if (!w) { alert('Le navigateur a bloqué l\'ouverture du rapport. Autorisez les fenêtres surgissantes pour cette page.'); return; }
    w.document.write(html);
    w.document.close();
  });

  /* ---------------- Étape 3 : totaux + Excel ---------------- */
  /**
   * Écritures du lot triées par n°, sans celles déjà présentes dans la base (même n° et même
   * montant, ou ligne entière identique quand le n° n'a pas pu être lu).
   */
  function freshEntries() {
    const news = state.entries.slice().sort((a, b) => {
      const na = Number(a.no); const nb = Number(b.no);
      if (isNaN(na) && isNaN(nb)) return 0;
      if (isNaN(na)) return 1;
      if (isNaN(nb)) return -1;
      return na - nb;
    });
    // une pièce du lot déjà dans la base (même n°, même montant : ajoutée au registre, ou déjà dans le classeur) n'est pas comptée deux fois
    const exist = existingEntries();
    const cents = (v) => Math.round((Number(v) || 0) * 100);
    const key = (e) => `${numNo(e)}|${cents(e.debit)}|${cents(e.credit)}`;
    // sans n° lisible : on compare la ligne entière (date, libellé, montants)
    const keyNoNum = (e) => `${e.date || ''}|${String(e.libelle || '').trim()}|${cents(e.debit)}|${cents(e.credit)}`;
    const already = new Set(exist.filter((e) => !isNaN(numNo(e))).map(key));
    const alreadyNoNum = new Set(exist.map(keyNoNum));
    return news.filter((e) => (isNaN(numNo(e)) ? !alreadyNoNum.has(keyNoNum(e)) : !already.has(key(e))));
  }

  function allEntriesForExcel() {
    const plain = (e) => ({ no: e.no, date: e.date, compte: e.compte, libelle: e.libelle, debit: e.debit, credit: e.credit });
    return existingEntries().map(plain).concat(freshEntries().map(plain));
  }

  /**
   * Contrôles du lot : séquence des numéros, doublons, lignes non contrôlées.
   * Sert à la fois au tableau de l'étape 3 et au refus de générer un fichier douteux.
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
    // n° déjà dans la base : même montant, la pièce y est déjà (pas comptée deux fois) ; autre montant, conflit
    const exist = new Map();
    for (const e of existingEntries()) { const n = numNo(e); if (!isNaN(n)) exist.set(n, e); }
    const cents = (v) => Math.round((Number(v) || 0) * 100);
    const dejaLa = []; const conflits = [];
    for (const e of news) {
      const n = numNo(e); const x = !isNaN(n) ? exist.get(n) : null;
      if (!x) continue;
      if (cents(x.debit) === cents(e.debit) && cents(x.credit) === cents(e.credit)) dejaLa.push(n); else conflits.push(n);
    }
    const sansNo = news.filter((e) => e.no == null || e.no === '').length;
    const aVerifier = news.filter((e) => rowStatus(e) === 'warn');
    const incompletes = news.filter((e) => rowStatus(e) === 'err');
    const jamaisVues = news.filter((e) => !e.seen && !e.checked && !e.edited && !e.manual);
    return { doublons, manquants, dejaLa: uniqList(dejaLa), conflits: uniqList(conflits), sansNo, aVerifier, incompletes, jamaisVues, count: news.length };
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
    if (c.conflits.length) rows.push(line(`Numéros déjà dans ${baseLabel()} avec un autre montant`, c.conflits.join(', '), 'err'));
    if (c.dejaLa.length) rows.push(line(`Pièces déjà dans ${baseLabel()}`, `${c.dejaLa.length} (n° ${c.dejaLa.slice(0, 20).join(', ')}${c.dejaLa.length > 20 ? '…' : ''}) : non comptées deux fois`, 'ok'));
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

  /** Écritures à prendre en compte pour le rapprochement : jusqu'à la date du comptage si elle est indiquée. */
  function entriesUpToCheckDate() {
    const all = allEntriesForExcel();
    const d = els.checkDate && els.checkDate.value;
    return d ? all.filter((e) => !e.date || String(e.date) <= d) : all;
  }
  function renderBalanceCheck() {
    const v = els.checkBalance.value.trim();
    if (v === '') { els.balanceResult.innerHTML = ''; return; }
    const reelSaisi = soldeCompte();
    // le séparateur de milliers que l'application affiche elle-même (1’234.50) et un « CHF »
    // recopié ne doivent pas rendre le solde illisible : la vérification était alors sautée en
    // silence (le champ était « number », qui vide sa valeur au moindre caractère inattendu)
    const reel = reelSaisi;
    if (reel == null) { els.balanceResult.innerHTML = `<div class="balance-box err">« ${escapeHtml(v)} » n'est pas un montant : le rapprochement n'a pas pu être fait.</div>`; return; }
    const entries = entriesUpToCheckDate();
    const t = X.computeTotals(currentOpening(), entries);
    const horsDate = allEntriesForExcel().length - entries.length;
    const ecart = P.round2(t.end - reel);
    if (Math.abs(ecart) < 0.005) {
      els.balanceResult.innerHTML = `<div class="balance-box ok">✓ Le solde calculé correspond exactement au solde réel : <b>${escapeHtml(fmtCHF(t.end))}</b>. Les écritures de ce lot sont cohérentes.` +
        (horsDate ? ` <span class="legend">(${horsDate} écriture(s) postérieure(s) au ${escapeHtml(P.isoToDisplay(els.checkDate.value))} non comptée(s))</span>` : '') + '</div>';
    } else {
      const props = P.explainGap(state.entries, ecart, 5);
      let html = `<div class="balance-box err">✖ Écart de <b>${escapeHtml(fmtCHF(Math.abs(ecart)))}</b> : le calcul donne ${escapeHtml(fmtCHF(t.end))}, vous avez compté ${escapeHtml(fmtCHF(reel))}.` +
        (horsDate ? ` <span class="legend">(${horsDate} écriture(s) postérieure(s) au ${escapeHtml(P.isoToDisplay(els.checkDate.value))} non comptée(s))</span>` : '');
      if (props.length) {
        html += `<br><b>Explication${props.length > 1 ? 's' : ''} possible${props.length > 1 ? 's' : ''}</b> (les pièces ci-dessous expliquent exactement l'écart) :<ul style="margin:6px 0 0 0">`;
        for (const pr of props) {
          const desc = pr.entries.map((e) => `n° ${e.no != null ? e.no : '?'} (${fmtCHF(e.debit != null ? e.debit : e.credit)}${e.debit != null ? ' au débit' : ' au crédit'})`).join(', ');
          const ids = pr.entries.map((e) => e.id).join(',');
          if (pr.kind === 'double') {
            html += `<li>la pièce ${escapeHtml(desc)} semble comptée deux fois <button type="button" class="small" data-fix="see" data-ids="${ids}">Voir</button></li>`;
          } else {
            html += `<li>${pr.entries.length > 1 ? 'les pièces' : 'la pièce'} ${escapeHtml(desc)} ${pr.entries.length > 1 ? 'prises' : 'prise'} dans le mauvais sens ` +
              `<button type="button" class="small" data-fix="swap" data-ids="${ids}">Inverser le sens ${pr.entries.length > 1 ? 'de ces ' + pr.entries.length + ' pièces' : 'de cette pièce'}</button> ` +
              `<button type="button" class="small" data-fix="see" data-ids="${ids}">Voir</button></li>`;
          }
        }
        html += `</ul><div style="margin-top:6px">Vérifiez sur ${props.length > 1 ? 'les pièces' : 'la pièce'} avant de corriger : une pièce remplie à l'envers (caisse dans la mauvaise colonne) donne exactement ce genre d'écart.</div>`;
      } else {
        html += `<br>Aucune combinaison simple n'explique cet écart. Cherchez :` +
          `<ul style="margin:6px 0 0 0"><li>les numéros manquants ou en double signalés à gauche (une pièce oubliée ou lue deux fois) ;</li>` +
          `<li>un montant mal lu : comparez les montants signalés en orange avec le Total de la pièce ;</li>` +
          `<li>une pièce d'une autre année glissée dans le lot.</li></ul>`;
      }
      els.balanceResult.innerHTML = html + '</div>';
    }
  }

  els.balanceResult.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-fix]');
    if (!b) return;
    const ids = String(b.dataset.ids || '').split(',').map(Number).filter((n) => n);
    if (!ids.length) return;
    if (b.dataset.fix === 'swap') {
      for (const id of ids) {
        const e = state.entries.find((x) => x.id === id);
        if (e) applySwap(id, e.debit != null ? 'credit' : 'debit');
      }
      renderTotals();
      renderChecks();
      return;
    }
    els.step3.scrollIntoView({ behavior: 'smooth', block: 'start' });
    selectEntry(ids[0]);
  });

  els.checkBalance.addEventListener('input', renderBalanceCheck);
  if (els.checkDate) els.checkDate.addEventListener('change', renderBalanceCheck);

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

  /** Solde réel compté tel que tapé dans le champ, ou null. */
  function soldeCompte() {
    const v = els.checkBalance.value.trim();
    if (v === '') return null;
    const n = window.CaisseRegistre ? window.CaisseRegistre.parseAmountInput(v) : Number(v.replace(',', '.'));
    return n == null || !isFinite(n) ? null : n;
  }

  /** Solde à nouveau tapé pour un classeur neuf, ou null si le champ n'est pas un montant. */
  function openingSaisi() {
    const v = String(els.openingAmount.value || '').trim();
    if (v === '') return 0;
    const n = window.CaisseRegistre ? window.CaisseRegistre.parseAmountInput(v) : Number(v.replace(',', '.'));
    return n == null || !isFinite(n) ? null : n;
  }

  function renderTotals() {
    const opening = currentOpening();
    // seulement les écritures qui ne sont pas déjà dans la base : sinon, après « Ajouter au
    // registre », les quatre tuiles ne s'additionnaient plus
    const tNew = X.computeTotals({ amount: 0 }, freshEntries());
    const tAll = X.computeTotals(opening, allEntriesForExcel());
    const exist = existingEntries();
    const cards = [
      ['Solde de départ' + (state.mode !== 'new' && exist.length ? (state.mode === 'registre' ? ' (registre)' : ' (classeur)') : ''), fmtCHF(state.mode !== 'new' && exist.length ? X.computeTotals(opening, exist).end : opening.amount), ''],
      ['Débits (nouvelles pièces)', '+ ' + fmtCHF(tNew.debits), ''],
      ['Crédits (nouvelles pièces)', '− ' + fmtCHF(tNew.credits), ''],
      ['Solde final', fmtCHF(tAll.end), 'end'],
    ];
    els.totals.innerHTML = cards.map(([l, v, c]) => `<div class="t ${c}"><div class="l">${escapeHtml(l)}</div><div class="v">${escapeHtml(v)}</div></div>`).join('');
  }

  function refreshAll() {
    renderOpeningHint(); // signale un solde à nouveau tapé mais illisible
    // les écritures lues entrent au journal (une seule liste) ; sans effet si rien n'a changé
    verserAuJournal().catch((e) => console && console.warn && console.warn('versement au journal', e));
    renderJournalLink();
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
  const SAVE_TYPES = {
    xlsx: { description: 'Classeur Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } },
    pdf: { description: 'Document PDF', accept: { 'application/pdf': ['.pdf'] } },
    json: { description: 'Sauvegarde (JSON)', accept: { 'application/json': ['.json'] } },
    html: { description: 'Page HTML', accept: { 'text/html': ['.html'] } },
  };
  async function saveBlob(blob, name) {
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        // filtre de la boîte de dialogue selon l'extension du fichier (Excel, PDF, sauvegarde JSON…)
        const ext = (/\.([a-z0-9]+)$/i.exec(name || '') || [])[1];
        const type = ext && SAVE_TYPES[ext.toLowerCase()];
        const handle = await window.showSaveFilePicker(Object.assign({ suggestedName: name }, type ? { types: [type] } : {}));
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
  /* ---------------- Onglets de la page ---------------- */
  const appTabs = document.getElementById('appTabs');
  // Espaces de l'outil Décompte DGEO : sa page (panelDgeo) et le récapitulatif des décomptes
  const DGEO_PANELS = ['panelDgeo', 'panelRecap'];
  const toolOf = (id) => (DGEO_PANELS.includes(id) ? 'dgeo' : 'caisse');
  function showPanel(id) {
    for (const b of appTabs.querySelectorAll('.apptab')) b.classList.toggle('active', b.dataset.panel === id);
    if (toolEls.dgeoNav) {
      for (const b of toolEls.dgeoNav.querySelectorAll('.apptab[data-panel]')) b.classList.toggle('active', b.dataset.panel === id);
      // raccourcis vers les sections de Décompte DGEO : actifs seulement quand sa page est affichée
      for (const b of toolEls.dgeoNav.querySelectorAll('.apptab[data-dgeo]')) b.classList.toggle('active', id === 'panelDgeo' && b.dataset.dgeo === dgeoSection);
    }
    for (const el of document.querySelectorAll('main .panel')) el.classList.toggle('hidden', el.id !== id);
    try { localStorage.setItem('caisse.onglet', id); } catch (e) { /* ignore */ }
    const tool = toolOf(id);
    if (tool === 'caisse') lastCaissePanel = id; else lastDgeoPanel = id;
    syncTool(tool);
    updateDgeoEmbed();
  }
  // Sélecteur d'outil en tête de la barre latérale : Caisse écoles (ses espaces) ou Décompte DGEO
  // (sa page, avec des raccourcis vers ses sections). L'outil ouvert est mémorisé.
  const toolEls = { btn: document.getElementById('btnTool'), menu: document.getElementById('toolMenu'), mark: document.getElementById('toolMark'), name: document.getElementById('toolName'), caisseNav: appTabs, dgeoNav: document.getElementById('dgeoNav') };
  let currentTool = 'caisse';
  let lastCaissePanel = 'panelSaisie';
  let lastDgeoPanel = 'panelDgeo';
  let dgeoSection = 'sec-upload';
  function syncTool(tool) {
    currentTool = tool;
    const dgeo = tool === 'dgeo';
    if (toolEls.mark) { toolEls.mark.classList.toggle('dgeo', dgeo); toolEls.mark.innerHTML = `<svg class="ico"><use href="#i-${dgeo ? 'layers' : 'wallet'}"/></svg>`; }
    if (toolEls.name) toolEls.name.textContent = dgeo ? 'Décompte DGEO' : 'Caisse écoles';
    if (toolEls.caisseNav) toolEls.caisseNav.classList.toggle('hidden', dgeo);
    if (toolEls.dgeoNav) toolEls.dgeoNav.classList.toggle('hidden', !dgeo);
    if (toolEls.menu) for (const b of toolEls.menu.querySelectorAll('button[data-tool]')) b.classList.toggle('active', b.dataset.tool === tool);
    try { localStorage.setItem('caisse.outil', tool); } catch (e) { /* ignore */ }
  }
  function setTool(tool) {
    closeToolMenu();
    if (tool === 'dgeo') showPanel(lastDgeoPanel && document.getElementById(lastDgeoPanel) ? lastDgeoPanel : 'panelDgeo');
    else showPanel(lastCaissePanel && document.getElementById(lastCaissePanel) ? lastCaissePanel : 'panelSaisie');
  }
  function closeToolMenu() { if (toolEls.menu) { toolEls.menu.classList.add('hidden'); toolEls.btn.setAttribute('aria-expanded', 'false'); } }
  if (toolEls.btn && toolEls.menu) {
    toolEls.btn.addEventListener('click', (ev) => { ev.stopPropagation(); const open = toolEls.menu.classList.toggle('hidden'); toolEls.btn.setAttribute('aria-expanded', open ? 'false' : 'true'); });
    toolEls.menu.addEventListener('click', (ev) => { const b = ev.target.closest('button[data-tool]'); if (b) setTool(b.dataset.tool); });
    document.addEventListener('click', (ev) => { if (!toolEls.menu.contains(ev.target) && ev.target !== toolEls.btn) closeToolMenu(); });
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeToolMenu(); });
  }
  if (toolEls.dgeoNav) {
    toolEls.dgeoNav.addEventListener('click', (ev) => {
      const b = ev.target.closest('.apptab');
      if (!b) return;
      if (b.dataset.panel) { showPanel(b.dataset.panel); return; } // espace de l'outil (récapitulatif)
      if (!b.dataset.dgeo) return;
      dgeoSection = b.dataset.dgeo;
      showPanel('panelDgeo'); // la page de Décompte DGEO, puis sa section
      if (window.CaisseDgeo && window.CaisseDgeo.scrollTo) window.CaisseDgeo.scrollTo(b.dataset.dgeo);
    });
  }

  // Décompte DGEO : dans l'application fenêtrée, sa page est posée par le processus principal dans
  // la zone de l'espace « Décompte DGEO » (fichier HTML seul : une explication à la place).
  const dgeoHost = document.getElementById('dgeoHost');
  const dgeoAbout = document.getElementById('dgeoAbout');
  const canEmbed = !!(window.CaisseDgeo && window.CaisseDgeo.embed && dgeoHost);
  if (dgeoAbout && canEmbed) dgeoAbout.classList.add('hidden');
  if (dgeoHost && !canEmbed) dgeoHost.classList.add('hidden');
  function updateDgeoEmbed() {
    if (!canEmbed) return;
    const panel = document.getElementById('panelDgeo');
    const active = !!panel && !panel.classList.contains('hidden');
    const content = document.querySelector('main.content');
    if (content) content.classList.toggle('embed', active);
    if (!active) { window.CaisseDgeo.embed(null); return; }
    const r = dgeoHost.getBoundingClientRect();
    window.CaisseDgeo.embed({ x: r.left, y: r.top, width: r.width, height: r.height });
  }
  if (canEmbed) {
    window.addEventListener('resize', updateDgeoEmbed);
    if (window.ResizeObserver) new ResizeObserver(updateDgeoEmbed).observe(dgeoHost);
    window.CaisseDgeo.onPanel((id) => { if (document.getElementById(id)) showPanel(id); });
    const DGEO_STATE = { starting: 'démarre…', ready: "Courses d'école & camps", off: 'arrêté – cliquer pour relancer', failed: 'ne répond pas – cliquer pour réessayer', missing: 'non inclus dans ce dossier' };
    const applyState = (s) => {
      const el = document.getElementById('dgeoNavState');
      if (el) el.textContent = s.hasDgeo ? (DGEO_STATE[s.dgeo] || DGEO_STATE.ready) : DGEO_STATE.missing;
      const b = document.getElementById('navBadgeSaisie');
      if (b) { b.textContent = s.decomptes ? String(s.decomptes) : ''; b.classList.toggle('hidden', !s.decomptes); }
    };
    window.CaisseDgeo.onState(applyState);
    window.CaisseDgeo.state().then(applyState).catch(() => {});
    // dossier PDF déposé dans Décompte DGEO : la passerelle le confie à cette page, qui retire les
    // pages « PIÈCE COMPTABLE » (src/dossier.js) avant l'analyse
    if (window.CaisseDgeo.onClean && window.CaisseDossier) {
      window.CaisseDgeo.onClean(async (req) => {
        const result = { id: req.id, bytes: null, removed: [], total: 0, reason: '' };
        try {
          const r = await window.CaisseDossier.clean(req.bytes, { skipFirst: !!req.skipFirst });
          result.removed = r.removed; result.total = r.total; result.reason = r.reason;
          if (r.removed.length) result.bytes = r.bytes;
        } catch (e) { result.reason = `nettoyage impossible : ${e && e.message ? e.message : e}`; }
        window.CaisseDgeo.cleanResult(result);
      });
    }
    const cleanInfo = document.getElementById('dgeoCleanInfo');
    if (window.CaisseDgeo.onCleaned && cleanInfo) {
      window.CaisseDgeo.onCleaned((info) => {
        const n = info.removed.length;
        cleanInfo.textContent = n
          ? `Dossier « ${info.filename} » : page${n > 1 ? 's' : ''} ${info.removed.join(', ')} sur ${info.total} ignorée${n > 1 ? 's' : ''} (${info.reason}).`
          : `Dossier « ${info.filename} » : ${info.total} page(s) transmise(s) telles quelles (${info.reason}).`;
      });
    }
    // formulaire de décompte de Blonay (page de couverture) affiché à côté de Décompte DGEO
    const formPane = document.getElementById('dgeoFormPane');
    const formPages = document.getElementById('dgeoFormPages');
    const formFields = document.getElementById('dgeoFormFields');
    const formFile = document.getElementById('dgeoFormFile');
    const formSelect = document.getElementById('dgeoFormSelect');
    const formOpt = document.getElementById('optDgeoForm');
    const dossiers = { list: [], current: null };
    let formOn = true;
    try { formOn = localStorage.getItem('caisse.dgeoForm') !== '0'; } catch (e) { /* ignore */ }
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const chf = (n) => (n == null ? '–' : (Number(n) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'"));
    const formPagesOf = (d) => { const f = (d.pages || []).filter((p) => p.kind === 'form'); return f.length ? f : (d.pages || []).slice(0, 1); };
    function renderForm() {
      if (!formPane) return;
      const d = dossiers.list.find((x) => x.id === dossiers.current) || dossiers.list[0] || null;
      const show = formOn && !!d;
      formPane.classList.toggle('hidden', !show);
      if (!show) { updateDgeoEmbed(); return; }
      dossiers.current = d.id;
      formFile.textContent = `${d.filename || d.id}${d.analysedAt ? ` · analysé le ${new Date(d.analysedAt).toLocaleDateString('fr-CH')}` : ''}`;
      formSelect.innerHTML = dossiers.list.map((x) => `<option value="${esc(x.id)}"${x.id === d.id ? ' selected' : ''}>${esc(x.filename || x.id)}</option>`).join('');
      formSelect.classList.toggle('hidden', dossiers.list.length < 2);
      const pages = formPagesOf(d);
      const hasForm = (d.pages || []).some((p) => p.kind === 'form');
      formPages.innerHTML = pages.length
        ? pages.map((p) => `<img src="${esc((d.base || '') + String(p.url || '').replace(/^\//, ''))}" alt="Page ${p.number}" data-page="${p.number}" title="Cliquer pour agrandir">`).join('') +
          `<div class="legend">${hasForm ? `Page${pages.length > 1 ? 's' : ''} ${pages.map((p) => p.number).join(', ')} du dossier (formulaire reconnu par Décompte DGEO)` : 'Première page du dossier (formulaire non reconnu par Décompte DGEO : vérifiez).'}</div>`
        : '<div class="empty">Aucune page dans ce dossier.</div>';
      const e = d.effectifs || {};
      const typeTxt = d.type_activite_texte || (d.type_activite === 'camp' ? 'Camp' : "Course d'école");
      const dates = d.date_debut ? (d.date_fin && d.date_fin !== d.date_debut ? `${d.date_debut} – ${d.date_fin}` : d.date_debut) : '–';
      const rows = (d.form_expenses || []).map((x) => `<tr><td>${esc(x.categorie)}</td><td>${esc(x.descriptif)}</td><td>${esc(x.pieces)}</td><td class="num">${chf(x.paye_enseignant)}</td><td class="num">${chf(x.paye_commune)}</td><td class="num">${chf(x.cout_total)}</td></tr>`).join('');
      formFields.innerHTML =
        '<h4>Lu sur le formulaire</h4>' +
        `<dl><dt>Type</dt><dd>${esc(typeTxt)}</dd><dt>Activité</dt><dd>${esc(d.activite || '–')}</dd><dt>Classe(s)</dt><dd>${esc(d.classe || '–')}</dd><dt>Dates</dt><dd>${esc(dates)}</dd>` +
        `<dt>Responsable</dt><dd>${esc(d.enseignant || '–')}${d.telephone ? ` · ${esc(d.telephone)}` : ''}</dd><dt>Budget</dt><dd>${d.budget != null ? `CHF ${chf(d.budget)}` : '–'}</dd>` +
        `<dt>Effectifs</dt><dd>${e.eleves || 0} élèves · ${e.enseignants_dgeo || 0} ens. DGEO · ${e.enseignants_js || 0} ens. J+S · ${e.moniteurs_js || 0} moniteurs J+S · ${e.autres || 0} autres</dd>` +
        `${d.noms_enseignants && d.noms_enseignants.length ? `<dt>Enseignant-e-s</dt><dd>${esc(d.noms_enseignants.join(', '))}</dd>` : ''}${d.noms_accompagnants && d.noms_accompagnants.length ? `<dt>Accompagnants</dt><dd>${esc(d.noms_accompagnants.join(', '))}</dd>` : ''}</dl>` +
        (rows ? `<h4>Dépenses du formulaire</h4><table><thead><tr><th>Catégorie</th><th>Descriptif</th><th>N° pièce</th><th class="num">Payé ens.</th><th class="num">Payé commune</th><th class="num">Coût total</th></tr></thead><tbody>${rows}` +
          `<tr class="total"><td colspan="5">Total des dépenses</td><td class="num">${chf(d.form_total)}</td></tr></tbody></table>` : '<h4>Dépenses du formulaire</h4><div class="legend">Aucune ligne de dépense lue.</div>') +
        `<h4>Décompte</h4><dl><dt>Pièces retenues</dt><dd>${d.pieces || 0}</dd><dt>Part État</dt><dd>${d.total != null ? `CHF ${chf(d.total)}` : '–'}</dd></dl>` +
        (d.warnings && d.warnings.length ? `<h4>Remarques de Décompte DGEO</h4><ul class="warn" style="margin:0;padding-left:18px">${d.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : '');
      updateDgeoEmbed();
    }
    if (formPane) {
      window.CaisseDgeo.onAnalysed((d) => { dossiers.list = [d].concat(dossiers.list.filter((x) => x.id !== d.id)); dossiers.current = d.id; renderForm(); });
      if (window.CaisseDgeo.dossiers) window.CaisseDgeo.dossiers().then((list) => { dossiers.list = list || []; dossiers.current = dossiers.list.length ? dossiers.list[0].id : null; renderForm(); }).catch(() => {});
      formSelect.addEventListener('change', () => { dossiers.current = formSelect.value; renderForm(); });
      const setFormOn = (on) => { formOn = on; if (formOpt) formOpt.checked = on; try { localStorage.setItem('caisse.dgeoForm', on ? '1' : '0'); } catch (e) { /* ignore */ } renderForm(); };
      if (formOpt) { formOpt.checked = formOn; formOpt.addEventListener('change', () => setFormOn(formOpt.checked)); }
      document.getElementById('btnDgeoFormHide').addEventListener('click', () => setFormOn(false));
      const zoomImg = (src) => {
        const ov = document.createElement('div'); ov.className = 'zoom-overlay';
        ov.innerHTML = `<div class="zoom-inner"><img src="${esc(src)}" alt="Formulaire"></div><div class="zoom-hint">Cliquer ou Échap pour fermer</div>`;
        const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = (ev) => { if (ev.key === 'Escape') close(); };
        ov.addEventListener('click', close); document.addEventListener('keydown', onKey);
        document.body.appendChild(ov);
      };
      formPages.addEventListener('click', (ev) => { const img = ev.target.closest('img'); if (img) zoomImg(img.src); });
      document.getElementById('btnDgeoFormZoom').addEventListener('click', () => { const img = formPages.querySelector('img'); if (img) zoomImg(img.src); });
    }
    const skip = document.getElementById('optDgeoSkip');
    if (skip && window.CaisseDgeo.settings) {
      window.CaisseDgeo.settings().then((s) => { skip.checked = s.dgeoSkipFirst !== false; }).catch(() => {});
      skip.addEventListener('change', () => window.CaisseDgeo.setSettings({ dgeoSkipFirst: skip.checked }));
    }
  }
  if (appTabs) {
    appTabs.addEventListener('click', (ev) => { const b = ev.target.closest('.apptab'); if (b) showPanel(b.dataset.panel); });
    try { const saved = localStorage.getItem('caisse.onglet'); if (saved && saved !== 'panelSaisie' && document.getElementById(saved)) showPanel(saved); } catch (e) { /* ignore */ }
  }
  // base des écritures des pièces scannées : celle choisie la dernière fois, sinon le registre de l'année
  { let base = 'registre'; try { base = localStorage.getItem('caisse.scan.base') || 'registre'; } catch (e) { /* ignore */ } applyMode(base); }

  /* ---------------- Une seule liste : le lot lu entre au journal ---------------- */
  // Les écritures lues sur les scans sont versées au registre de l'année dès la lecture, marquées
  // « à vérifier ». Une relecture (fin de l'OCR, correction à l'écran) met à jour LA MÊME pièce ;
  // une pièce déjà saisie à la main ne se dédouble pas, la lecture s'y rattache. Il n'y a donc
  // plus deux listes à rapprocher : le journal est la liste.
  function scanEntries() {
    return state.entries.filter((e) => !e.manual && e.sourceKey).map((e) => ({
      scanKey: e.sourceKey, no: e.no, date: e.date, compte: e.compte, libelle: e.libelle,
      debit: e.debit, credit: e.credit, page: e.page,
      warnings: (e.warnings || []).slice(0, 12),
    }));
  }

  async function verserAuJournal() {
    if (versementEnCours || state.mode !== 'registre') return null;
    const reg = registre();
    if (!reg || !window.CaisseSaisie || !window.CaisseRegistre) return null;
    const entries = scanEntries();
    if (!entries.length) return null;
    const res = window.CaisseRegistre.syncScanBatch(reg, entries);
    if (!(res.ajoutees.length || res.misesAJour.length || res.rattachees.length)) return res;
    versementEnCours = true; // saveReg prévient l'écran des scans : on ne se relance pas soi-même
    try {
      await window.CaisseSaisie.saveReg();
      window.CaisseSaisie.renderJournal();
    } finally { versementEnCours = false; }
    renderJournalLink();
    if (res.ajoutees.length) joindreImages(res.ajoutees);
    return res;
  }

  /** Joint l'image de chaque pièce lue (page rendue en JPEG) en justificatif, en arrière-plan. */
  async function joindreImages(pieces) {
    if (imagesEnCours || !window.CaisseSaisie) return;
    const reg = registre();
    if (!reg) return;
    imagesEnCours = true;
    try {
      let n = 0;
      for (const p of pieces) {
        const e = state.entries.find((x) => x.sourceKey === p.scanKey);
        if (!e || !e.page || (p.justificatifs || []).some((j) => /^scan-/.test(j.name))) continue;
        try {
          const img = await imagePage(e.page);
          const vive = reg.pieces.find((x) => x.id === p.id);
          if (!img || !vive) continue;
          const nom = `scan-piece-${vive.no == null ? vive.id.slice(0, 6) : vive.no}.jpg`;
          const saved = await window.CaisseSaisie.state.storage.attach(reg.annee, vive.id, nom, img);
          vive.justificatifs.push({ name: saved.name, size: saved.size, kind: 'jpeg' });
          n++;
        } catch (err) { /* sans image : la pièce reste au journal */ }
      }
      if (n) {
        versementEnCours = true;
        try { await window.CaisseSaisie.saveReg(); window.CaisseSaisie.renderJournal(); } finally { versementEnCours = false; }
      }
    } finally { imagesEnCours = false; }
  }

  /** Page rendue en JPEG (image de la pièce, jointe en justificatif). */
  async function imagePage(globalPage) {
    const ref = pageRef(globalPage);
    if (!ref) return null;
    const page = await ref.doc.doc.getPage(ref.pageInDoc);
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: 1200 / base.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  }

  /** Retire du journal les pièces de ce lot qui n'ont pas encore été vérifiées. */
  async function retirerDuJournal() {
    const reg = registre();
    if (!reg || !window.CaisseRegistre || !window.CaisseSaisie) return 0;
    const partis = window.CaisseRegistre.removeScanBatch(reg, scanEntries().map((e) => e.scanKey));
    if (!partis.length) return 0;
    versementEnCours = true;
    try { await window.CaisseSaisie.saveReg(); window.CaisseSaisie.renderJournal(); } finally { versementEnCours = false; }
    renderJournalLink();
    return partis.length;
  }

  function renderJournalLink() {
    const box = document.getElementById('journalLink');
    if (!box) return;
    const reg = registre();
    if (state.mode !== 'registre' || !reg || !state.entries.some((e) => !e.manual)) { box.innerHTML = ''; return; }
    const aVerifier = window.CaisseRegistre.pendingPieces(reg).length;
    box.innerHTML = `<div class="notice ok">Ces écritures sont <b>déjà dans le journal</b> du registre ${reg.annee} : il n'y a qu'une seule liste. ` +
      (aVerifier ? `<b>${aVerifier}</b> pièce(s) y sont marquées « à vérifier » tant que vous ne les avez pas regardées. ` : '') +
      `<button type="button" class="small" data-journal="voir">Ouvrir le journal</button> ` +
      `<button type="button" class="small danger" data-journal="retirer">Retirer ce lot du journal</button></div>`;
  }

  {
    const box = document.getElementById('journalLink');
    if (box) box.addEventListener('click', async (ev) => {
      const b = ev.target.closest('button[data-journal]');
      if (!b) return;
      if (b.dataset.journal === 'voir') { showPanel('panelSaisie'); return; }
      const reg = registre();
      const n = window.CaisseRegistre.pendingPieces(reg).filter((p) => p.scanKey).length;
      if (!confirm(`Retirer du journal les ${n} pièce(s) de ce lot qui ne sont pas encore vérifiées ?\n\nCelles que vous avez déjà vérifiées restent au journal.`)) return;
      const partis = await retirerDuJournal();
      notice(els.pdfNotices, 'ok', `${partis} pièce(s) retirée(s) du journal.`);
    });
  }

  /* ---------------- Vers le registre de l'année (onglet Saisie) ---------------- */
  const btnToRegister = document.getElementById('btnToRegister');
  if (btnToRegister) {
    btnToRegister.addEventListener('click', async () => {
      if (!window.CaisseSaisie) return;
      const entries = state.entries.filter((e) => !e.manual || e.libelle);
      if (!entries.length) return;
      const pending = entries.filter((e) => rowStatus(e) !== 'ok');
      if (pending.length && !confirm(`${pending.length} ligne(s) sont encore à vérifier (orange). Les ajouter quand même au registre ?`)) return;
      // image de la pièce (page rendue en JPEG) jointe en justificatif
      const getImage = async (e) => {
        const ref = e.page ? pageRef(e.page) : null;
        if (!ref) return null;
        const page = await ref.doc.doc.getPage(ref.pageInDoc);
        const base = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: 1200 / base.width });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
        return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
      };
      btnToRegister.disabled = true;
      try {
        const n = await window.CaisseSaisie.addFromScan(entries.map((e) => ({ no: e.no, date: e.date, compte: e.compte, libelle: e.libelle, debit: e.debit, credit: e.credit, page: e.page })), getImage);
        if (n) showPanel('panelSaisie');
      } finally { btnToRegister.disabled = false; }
    });
  }

  /** Mémorise dans le vocabulaire appris sur ce PC des noms et classes saisis à la main. */
  function rememberVocabulary(extra) {
    if (!state.vocab) return;
    const v = state.vocab;
    let changed = false;
    for (const p of (extra.persons || [])) if (p && P.looksLikePerson(p) && !v.persons.includes(p)) { v.persons.push(p); changed = true; }
    for (const c of (extra.classTokens || [])) if (c && !v.classTokens.includes(c)) { v.classTokens.push(c); changed = true; }
    // objet neuf : les listes mémorisent le vocabulaire qu'elles ont lu, et un tableau allongé
    // dans le même objet serait passé inaperçu
    if (changed) { state.vocab = Object.assign({}, v); saveVocab(); renderVocabInfo(); }
  }

  /** Les écritures d'un classeur repris dans le registre enrichissent le vocabulaire (mots, noms, comptes). */
  function learnEntries(entries) {
    try {
      state.vocab = P.mergeVocabulary(state.vocab, P.learnVocabulary(entries || []));
      saveVocab();
      renderVocabInfo();
    } catch (e) { /* ignore */ }
  }

  window.CaisseApp = { state, vocabActif, majDonnees, addPdfFiles, reparse, refreshAll, gotoNextDoubt, selectEntry, startCrossReading, applyFieldValue, saveBlob, rememberVocabulary, learnEntries, applyMode, showPanel, getCaisse, verserAuJournal, retirerDuJournal };

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
    if (c.conflits.length) graves.push(`• numéros déjà présents dans ${baseLabel()} avec un autre montant : ${c.conflits.join(', ')}`);
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
    const reelCompte = soldeCompte();
    if (reelCompte != null) {
      const t0 = X.computeTotals(currentOpening(), entriesUpToCheckDate());
      const ecart = P.round2(t0.end - reelCompte);
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
