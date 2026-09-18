  // =====================================================================
  //  Drag & drop, pointer and keyboard wiring
  // =====================================================================
  function computeDrop(x, y) {
    const list = state.pages.map(p => tiles.get(p.id)).filter(t => t && !t.classList.contains('dragging'));
    if (!list.length) return { tile: null, index: state.pages.length };
    const rects = list.map(t => t.getBoundingClientRect());
    let rowIdx = rects.findIndex(r => y >= r.top && y <= r.bottom);
    if (rowIdx === -1) {
      let best = 0, bd = Infinity;
      rects.forEach((r, i) => { const d = y < r.top ? r.top - y : y - r.bottom; if (d < bd) { bd = d; best = i; } });
      rowIdx = best;
    }
    const top = rects[rowIdx].top;
    const row = [];
    rects.forEach((r, i) => { if (Math.abs(r.top - top) < 2) row.push(i); });
    for (const i of row) {
      const r = rects[i];
      if (x < r.left + r.width / 2) return { tile: list[i], before: true, index: pageIndex(+list[i].dataset.id) };
    }
    const last = list[row[row.length - 1]];
    return { tile: last, before: false, index: pageIndex(+last.dataset.id) + 1 };
  }
  function clearMarker() { if (drag.marker) { drag.marker.classList.remove('drop-before', 'drop-after'); drag.marker = null; } }
  function showMarker(d) {
    if (drag.marker !== d.tile) clearMarker();
    if (!d.tile) return;
    drag.marker = d.tile;
    d.tile.classList.toggle('drop-before', !!d.before);
    d.tile.classList.toggle('drop-after', !d.before);
  }
  function endDrag() {
    clearMarker();
    drag.ids.forEach(id => { const t = tiles.get(id); if (t) t.classList.remove('dragging'); });
    drag.ids = []; drag.to = null;
  }
  const isFileDrag = e => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');

  // =====================================================================
  //  Sample document
  // =====================================================================
  async function makeSample() {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const doc = await PDFDocument.create();
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const reg = await doc.embedFont(StandardFonts.Helvetica);
    const titles = ['Couverture', 'Sommaire', 'Présentation', 'Offre', 'Conditions', 'Contact'];
    const W = 595.28, H = 841.89;
    titles.forEach((t, i) => {
      const p = doc.addPage([W, H]);
      p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });
      p.drawRectangle({ x: 48, y: H - 72, width: W - 96, height: 3, color: rgb(0.15, 0.39, 0.79) });
      p.drawText('DOCUMENT D\'EXEMPLE', { x: 48, y: H - 60, size: 9, font: bold, color: rgb(0.15, 0.39, 0.79) });
      p.drawText(String(i + 1), { x: 48, y: H - 300, size: 190, font: bold, color: rgb(0.89, 0.9, 0.92) });
      p.drawText(t, { x: 48, y: H - 360, size: 34, font: bold, color: rgb(0.08, 0.09, 0.11) });
      p.drawText('Page ' + (i + 1) + ' sur ' + titles.length + ' - remplacez cet exemple par vos propres documents.', { x: 48, y: H - 392, size: 12, font: reg, color: rgb(0.36, 0.39, 0.45) });
      for (let k = 0; k < 9; k++) {
        p.drawRectangle({ x: 48, y: H - 460 - k * 26, width: (k % 3 === 2 ? 0.55 : 0.92) * (W - 96), height: 8, color: rgb(0.91, 0.92, 0.94) });
      }
      p.drawText(APP, { x: 48, y: 40, size: 10, font: reg, color: rgb(0.55, 0.58, 0.63) });
      p.drawText(String(i + 1), { x: W - 60, y: 40, size: 10, font: reg, color: rgb(0.55, 0.58, 0.63) });
    });
    return doc.save();
  }
  async function loadSample() {
    if (state.sources.some(s => s.isSample)) return;
    try {
      setBusy('Préparation de l\'exemple…');
      const bytes = await makeSample();
      await addPdfSource('exemple.pdf', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), { isSample: true, silent: true });
      state.history = []; state.redo = [];
      render();
      setLast('Exemple chargé : déplacez une page, annotez-la, ou ouvrez vos propres documents.');
    } catch (e) { console.error(e); toast('L\'exemple n\'a pas pu être créé.', 'error'); }
    finally { setBusy(''); }
  }

  // =====================================================================
  //  Ouverture au lancement
  // =====================================================================
  // Quand l'outil est le programme par défaut des PDF, un double-clic sur un
  // fichier démarre le lanceur avec son chemin. Le lanceur dépose alors le
  // document, encodé, dans un petit fichier à côté de la page, et nomme ce
  // fichier dans l'adresse : #ouvrir=ouverture-….js. Une page file:// n'a pas
  // le droit de lire un fichier voisin, mais elle peut le charger comme script.
  const OUVERTURE = /^ouverture-[a-f0-9]{24}\.js$/;
  function optionLancement(nom) {
    const m = new RegExp('(?:^#|&)' + nom + '=([^&]+)').exec(location.hash);
    return m ? m[1] : null;
  }
  function fichierDemande() {
    const m = optionLancement('ouvrir');
    if (!m) return null;
    let nom = '';
    try { nom = decodeURIComponent(m); } catch (_) { return null; }
    // Seul un nom de cette forme est accepté : jamais un chemin, jamais une adresse.
    return OUVERTURE.test(nom) ? nom : null;
  }
  async function ouvrirAuLancement() {
    // La fenêtre de l'application remet le document directement, avant le
    // premier script de la page : rien à charger.
    let liste = null;
    if (Array.isArray(window.__blonayOuvrir)) { liste = window.__blonayOuvrir; delete window.__blonayOuvrir; }
    const nom = fichierDemande();
    if (!liste && !nom) return false;
    if (nom) {
      // L'adresse est nettoyée tout de suite : le fichier d'ouverture ne vit
      // que quelques instants, un rechargement ne doit pas le redemander.
      try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
    }
    setBusy('Ouverture du document…');
    if (!liste) liste = await new Promise(resolve => {
      const s = document.createElement('script');
      s.src = nom;
      s.onload = () => { const l = window.__blonayOuvrir; delete window.__blonayOuvrir; s.remove(); resolve(Array.isArray(l) ? l : null); };
      s.onerror = () => { s.remove(); resolve(null); };
      document.head.appendChild(s);
    });
    if (!liste) {
      setBusy('');
      toast('Le document à ouvrir n\'a pas été trouvé. Ouvrez-le avec le bouton Ouvrir.', 'warn');
      return true;
    }
    await ouvrirListe(liste);
    return true;
  }
  // Une liste de documents { nom, b64 } ou { nom, octets } — venue du fichier
  // d'ouverture, de la fenêtre de l'application ou de son menu Ouvrir.
  async function ouvrirListe(liste, opts) {
    const fichiers = [];
    for (const f of liste || []) {
      if (!f || typeof f.nom !== 'string') continue;
      try {
        let octets = null;
        if (typeof f.b64 === 'string') octets = await (await fetch('data:application/octet-stream;base64,' + f.b64)).arrayBuffer();
        else if (f.octets) octets = f.octets;
        if (!octets) continue;
        const fichier = new File([octets], f.nom, { type: /\.pdf$/i.test(f.nom) ? 'application/pdf' : '' });
        // D'où il vient, pour qu'Enregistrer sache quoi réécrire.
        if (typeof f.chemin === 'string' && f.chemin) fichier.chemin = f.chemin;
        fichiers.push(fichier);
      } catch (e) { console.error(e); }
    }
    setBusy('');
    if (!fichiers.length) { toast('Le document à ouvrir n\'a pas pu être lu.', 'error'); return; }
    if (opts && opts.onglet && ongletOccupe()) nouvelOnglet(fichiers);
    else await addFiles(fichiers);
  }

  // =====================================================================
  //  Theme
  // =====================================================================
  function applyTheme(mode) {
    const root = document.documentElement;
    if (mode === 'light') root.setAttribute('data-theme', 'light');
    else if (mode === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    el.btnTheme.replaceChildren(icon(mode === 'light' ? IC.sun : mode === 'dark' ? IC.moon : IC.auto));
    el.btnTheme.title = 'Thème : ' + (mode === 'light' ? 'clair' : mode === 'dark' ? 'sombre' : 'automatique');
    el.btnTheme.setAttribute('aria-label', el.btnTheme.title);
    try { localStorage.setItem('blonay-theme', mode); } catch (_) {}
  }

  // =====================================================================
  //  Init
  // =====================================================================
  function init() {
    Object.assign(el, {
      pages: $('#pages'), canvas: $('#canvas'), dropzone: $('#dropzone'), chips: $('#chips'),
      docList: $('#doc-list'), docsEmpty: $('#docs-empty'), docCount: $('#doc-count'),
      fileInput: $('#file-input'), filename: $('#filename'),
      btnOpen: $('#btn-open'), btnAdd: $('#btn-add'), btnChoose: $('#btn-choose'), btnSample: $('#btn-sample'), dzRecents: $('#dz-recents'),
      btnExport: $('#btn-export'), btnPrint: $('#btn-print'), btnUndo: $('#btn-undo'), btnRedo: $('#btn-redo'),
      btnSelectAll: $('#btn-select-all'), selectAllLabel: $('#select-all-label'), btnSearch: $('#btn-search'),
      btnTheme: $('#btn-theme'), btnHelp: $('#btn-help'),
      zoom: $('#zoom'), summary: $('#summary'), last: $('#last'),
      progress: $('#progress'), progressBar: $('#progress-bar'),
      btnAnnulerOp: $('#btn-annuler-op'), btnJournal: $('#btn-journal'),
      selbar: $('#selbar'), selCount: $('#sel-count'), moveto: $('#moveto'), movetoGo: $('#moveto-go'),
      selRotLeft: $('#sel-rot-left'), selRotRight: $('#sel-rot-right'), selDup: $('#sel-dup'),
      selExtract: $('#sel-extract'), selDelete: $('#sel-delete'), selClear: $('#sel-clear'),
      toast: $('#toast'),
      lecture: $('#lecture'), vueModes: $('#vue-modes'),
      zoomTuiles: $('#zoom-tuiles'), zoomLecture: $('#zoom-lecture'), zoomNiveau: $('#zoom-niveau'),
      zoomMoins: $('#zoom-moins'), zoomPlus: $('#zoom-plus'),
      pageCourante: $('#page-courante'), pageNum: $('#page-num'), pageTotal: $('#page-total'),
      vueDeux: $('#vue-deux'),
      signets: $('#signets'), signetsVide: $('#signets-vide'), signetCount: $('#signet-count'), btnSignet: $('#btn-signet'),
      onglets: $('#onglets'),
    });
    // Le premier onglet : le document de cette fenêtre.
    onglets.push({ id: ++uid, etat: null });
    ongletActif = onglets[0].id;

    let theme = 'light';
    try { theme = localStorage.getItem('blonay-theme') || 'light'; } catch (_) {}
    applyTheme(theme);
    el.btnTheme.addEventListener('click', () => {
      theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light';
      applyTheme(theme);
    });
    el.btnHelp.addEventListener('click', toolHelp);
    el.btnAnnulerOp.addEventListener('click', demanderAnnulation);
    el.btnJournal.addEventListener('click', toolJournal);

    // tabs
    const tabs = [[$('#tab-docs'), $('#pane-docs')], [$('#tab-tools'), $('#pane-tools')], [$('#tab-plan'), $('#pane-plan')]];
    tabs.forEach(([tab, pane]) => {
      tab.addEventListener('click', () => {
        tabs.forEach(([t, p]) => { t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); p.hidden = p !== pane; });
      });
    });

    // « Ouvrir » ouvre un document à part (nouvel onglet si celui-ci en a
    // déjà un) ; « Ajouter un document » le combine au document en cours.
    let modeOuverture = '';
    const openPicker = mode => { modeOuverture = mode || ''; el.fileInput.value = ''; el.fileInput.click(); };
    el.btnOpen.addEventListener('click', () => openPicker('onglet'));
    el.btnAdd.addEventListener('click', () => openPicker(''));
    el.btnChoose.addEventListener('click', () => openPicker(''));
    el.btnSample.addEventListener('click', loadSample);
    el.fileInput.addEventListener('change', () => { if (modeOuverture === 'onglet') ouvrirDansOnglet(el.fileInput.files); else addFiles(el.fileInput.files); });
    // Des pages glissées sur un onglet y déménagent.
    el.onglets.addEventListener('dragover', e => {
      if (!drag.ids.length) return;
      const t = e.target.closest('.onglet');
      $$('.onglet.cible', el.onglets).forEach(x => { if (x !== t) x.classList.remove('cible'); });
      if (!t || +t.dataset.onglet === ongletActif) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      t.classList.add('cible');
    });
    el.onglets.addEventListener('dragleave', e => { if (!el.onglets.contains(e.relatedTarget)) $$('.onglet.cible', el.onglets).forEach(x => x.classList.remove('cible')); });
    el.onglets.addEventListener('drop', e => {
      const t = e.target.closest('.onglet');
      $$('.onglet.cible', el.onglets).forEach(x => x.classList.remove('cible'));
      if (!t || !drag.ids.length) return;
      e.preventDefault();
      const ids = drag.ids.slice();
      endDrag();
      deplacerPagesVersOnglet(ids, +t.dataset.onglet);
    });
    el.btnUndo.addEventListener('click', undo);
    el.btnRedo.addEventListener('click', redoAction);
    el.btnSearch.addEventListener('click', toolSearch);
    el.btnSelectAll.addEventListener('click', () => { if (state.selected.size === state.pages.length) clearSelection(); else selectAll(); });
    el.btnExport.addEventListener('click', () => enregistrer());
    el.btnPrint.addEventListener('click', dialogImprimer);

    // --- lecture ou table de montage
    try { const v = localStorage.getItem('blonay-vue'); if (v === 'organiser' || v === 'lecture') state.vue = v; } catch (_) {}
    $$('.vue-mode').forEach(b => b.addEventListener('click', () => changerVue(b.dataset.vue)));
    const NIVEAUX = ['page', 'largeur', '0.5', '0.75', '1', '1.25', '1.5', '2', '3', '4'];
    const poserZoom = v => {
      state.zoomLecture = v;
      el.zoomNiveau.value = v;
      try { localStorage.setItem('blonay-zoom-lecture', v); } catch (_) {}
      if (state.vue === 'lecture') lectureRendu();
    };
    try { const z = localStorage.getItem('blonay-zoom-lecture'); if (z && NIVEAUX.indexOf(z) >= 0) state.zoomLecture = z; } catch (_) {}
    el.zoomNiveau.value = state.zoomLecture;
    el.zoomNiveau.addEventListener('change', () => poserZoom(el.zoomNiveau.value));
    // Les deux boutons parcourent la liste, en partant du niveau réellement
    // appliqué quand on est sur « Largeur » ou « Page entière ».
    const pas = sens => {
      let i = NIVEAUX.indexOf(state.zoomLecture);
      if (i < 2) {
        const proche = NIVEAUX.slice(2).map(parseFloat).reduce((a, b) => Math.abs(b - lectureZ) < Math.abs(a - lectureZ) ? b : a, 1);
        i = NIVEAUX.indexOf(String(proche));
      }
      const j = Math.max(2, Math.min(NIVEAUX.length - 1, i + sens));
      poserZoom(NIVEAUX[j]);
    };
    el.zoomMoins.addEventListener('click', () => pas(-1));
    el.zoomPlus.addEventListener('click', () => pas(1));
    // Une page, ou deux côte à côte.
    const poserDispo = v => {
      state.dispo = v === 'deux' ? 'deux' : 'une';
      el.vueDeux.setAttribute('aria-pressed', state.dispo === 'deux' ? 'true' : 'false');
      try { localStorage.setItem('blonay-dispo', state.dispo); } catch (_) {}
      if (state.vue === 'lecture' && state.pages.length) lectureRendu();
    };
    try { if (localStorage.getItem('blonay-dispo') === 'deux') { state.dispo = 'deux'; el.vueDeux.setAttribute('aria-pressed', 'true'); } } catch (_) {}
    el.vueDeux.addEventListener('click', () => poserDispo(state.dispo === 'deux' ? 'une' : 'deux'));
    el.btnSignet.addEventListener('click', () => ajouterSignet());
    // Ctrl + molette zoome le document, pas la page entière du navigateur.
    // Un pavé tactile en envoie une rafale : un pas tous les 120 ms suffit.
    let molette = 0;
    el.canvas.addEventListener('wheel', e => {
      if (!(e.ctrlKey || e.metaKey) || state.vue !== 'lecture' || !state.pages.length) return;
      e.preventDefault();
      const t = Date.now();
      if (t - molette < 120) return;
      molette = t;
      pas(e.deltaY < 0 ? 1 : -1);
    }, { passive: false });
    el.canvas.addEventListener('scroll', () => { if (state.vue === 'lecture') majPageCourante(); }, { passive: true });
    const allerPage = () => { lectureAller(el.pageNum.value); el.pageNum.blur(); };
    el.pageNum.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); allerPage(); } });
    el.pageNum.addEventListener('change', allerPage);
    el.pageNum.addEventListener('focus', () => el.pageNum.select());
    let redim = null;
    window.addEventListener('resize', () => {
      if (state.vue !== 'lecture' || !state.pages.length) return;
      clearTimeout(redim);
      redim = setTimeout(() => { if (state.zoomLecture === 'largeur' || state.zoomLecture === 'page' || lectureDeux()) lectureRendu(); }, 180);
    });
    el.filename.addEventListener('input', () => { state.filenameDirty = el.filename.value.trim() !== ''; });
    el.filename.addEventListener('blur', () => { if (!el.filename.value.trim()) { state.filenameDirty = false; el.filename.value = defaultBase(); } });
    el.filename.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.filename.blur(); } });

    el.selRotLeft.addEventListener('click', () => rotatePages(selectedInOrder(), -90));
    el.selRotRight.addEventListener('click', () => rotatePages(selectedInOrder(), 90));
    el.selDup.addEventListener('click', () => duplicatePages(selectedInOrder()));
    el.selDelete.addEventListener('click', () => deletePages(selectedInOrder()));
    el.selClear.addEventListener('click', clearSelection);
    el.selExtract.addEventListener('click', () => exportPages(selectedPages(), safeBase(el.filename.value).replace(/-modifié$/, '') + '-extrait.pdf', { noInPlace: true }));

    function commitMoveTo() {
      const ids = selectedInOrder();
      if (!ids.length) return;
      const n = clampInt(el.moveto.value, 1, state.pages.length);
      if (n == null) { el.moveto.value = pageIndex(ids[0]) + 1; return; }
      moveToPosition(ids, n);
      const first = state.pages.findIndex(p => state.selected.has(p.id));
      el.moveto.value = first + 1;
      setLast(ids.length > 1 ? ids.length + ' pages déplacées en position ' + (first + 1) : 'Page déplacée en position ' + (first + 1));
      const t = tiles.get(ids[0]);
      if (t) t.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    el.movetoGo.addEventListener('click', commitMoveTo);
    el.moveto.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commitMoveTo(); } else if (e.key === 'Escape') { e.preventDefault(); el.moveto.blur(); } });
    el.moveto.addEventListener('focus', () => requestAnimationFrame(() => el.moveto.select()));

    el.zoom.addEventListener('input', () => {
      document.documentElement.style.setProperty('--tuile', el.zoom.value + 'px');
      try { localStorage.setItem('blonay-zoom', el.zoom.value); } catch (_) {}
    });
    try {
      const z = localStorage.getItem('blonay-zoom');
      if (z && +z >= 120 && +z <= 300) { el.zoom.value = z; document.documentElement.style.setProperty('--tuile', z + 'px'); }
    } catch (_) {}

    // --- tiles: clicks
    el.pages.addEventListener('click', e => {
      const btn = e.target.closest('button[data-act]');
      const t = e.target.closest('.tile');
      if (!t) return;
      const id = +t.dataset.id;
      if (btn) {
        e.stopPropagation();
        const act = btn.dataset.act;
        if (act === 'rotl') rotatePages(targetsFor(id), -90);
        else if (act === 'rotr') rotatePages(targetsFor(id), 90);
        else if (act === 'left') nudge(id, -1);
        else if (act === 'right') nudge(id, 1);
        else if (act === 'pos') { const inp = t.querySelector('.pos'); inp.focus(); inp.select(); }
        else if (act === 'edit') openEditor(id);
        else if (act === 'del') deletePages(targetsFor(id));
        return;
      }
      if (e.shiftKey && state.anchor != null && pageIndex(state.anchor) >= 0) {
        const a = pageIndex(state.anchor), b = pageIndex(id);
        const [lo, hi] = a < b ? [a, b] : [b, a];
        state.selected.clear();
        for (let i = lo; i <= hi; i++) state.selected.add(state.pages[i].id);
      } else {
        if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
        state.anchor = id;
      }
      updateSelectionUI();
    });
    el.pages.addEventListener('dblclick', e => {
      const t = e.target.closest('.tile');
      if (!t || e.target.closest('button') || e.target.closest('input')) return;
      openEditor(+t.dataset.id);
    });
    // Clic droit : le menu de la page, en organisation comme en lecture.
    el.pages.addEventListener('contextmenu', e => {
      const t = e.target.closest('.tile');
      if (!t || e.target.closest('input')) return;
      menuPage(e, +t.dataset.id);
    });
    el.lecture.addEventListener('contextmenu', e => {
      const f = e.target.closest('.feuille-vue');
      if (!f) return;
      menuPage(e, +f.dataset.id);
    });

    el.pages.addEventListener('keydown', e => {
      const t = e.target.closest('.tile');
      if (!t || e.target !== t) return;
      const id = +t.dataset.id;
      const i = pageIndex(id);
      if (e.key === ' ') {
        e.preventDefault();
        if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
        state.anchor = id; updateSelectionUI();
      } else if (e.key === 'Enter') { e.preventDefault(); openEditor(id); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        if (e.altKey) { nudge(id, dir); return; }
        const next = state.pages[i + dir];
        if (next) { const nt = tiles.get(next.id); if (nt) nt.focus(); }
      } else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deletePages(targetsFor(id)); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rotatePages(targetsFor(id), e.shiftKey ? -90 : 90); }
      else if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const inp = t.querySelector('.pos');
        inp.focus(); inp.value = e.key;
      }
    });

    // --- drag & drop
    el.pages.addEventListener('dragstart', e => {
      const t = e.target.closest('.tile');
      if (!t) return;
      const id = +t.dataset.id;
      if (!state.selected.has(id)) { state.selected.clear(); state.selected.add(id); state.anchor = id; updateSelectionUI(); }
      drag.ids = selectedInOrder();
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', 'blonay-pages'); } catch (_) {}
      requestAnimationFrame(() => drag.ids.forEach(i => { const x = tiles.get(i); if (x) x.classList.add('dragging'); }));
    });
    el.canvas.addEventListener('dragover', e => {
      if (drag.ids.length) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const d = computeDrop(e.clientX, e.clientY);
        showMarker(d); drag.to = d.index;
      } else if (isFileDrag(e)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        el.canvas.classList.add('is-file-over');
      }
    });
    el.canvas.addEventListener('dragleave', e => {
      if (e.relatedTarget && el.canvas.contains(e.relatedTarget)) return;
      el.canvas.classList.remove('is-file-over');
      clearMarker();
    });
    el.canvas.addEventListener('drop', e => {
      el.canvas.classList.remove('is-file-over');
      if (drag.ids.length) {
        e.preventDefault();
        const ids = drag.ids.slice();
        const to = drag.to == null ? state.pages.length : drag.to;
        endDrag();
        movePages(ids, to);
      } else if (isFileDrag(e)) { e.preventDefault(); addFiles(e.dataTransfer.files); }
    });
    document.addEventListener('dragend', endDrag);
    document.addEventListener('dragover', e => { if (isFileDrag(e)) e.preventDefault(); });
    document.addEventListener('drop', e => { if (isFileDrag(e)) { e.preventDefault(); if (!el.canvas.contains(e.target)) addFiles(e.dataTransfer.files); } });

    // --- sélection au lasso : comme sur le bureau, on trace un rectangle sur
    // le vide de la table et les pages qu'il touche sont prises. Avec Ctrl ou
    // Maj, le tracé s'ajoute à la sélection en cours ; un simple clic sur le
    // vide la défait.
    const lasso = { actif: false, trace: false, x0: 0, y0: 0, el: null, base: null, ajoute: false };
    const lassoPos = e => {
      const r = el.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left + el.canvas.scrollLeft, y: e.clientY - r.top + el.canvas.scrollTop };
    };
    el.canvas.addEventListener('mousedown', e => {
      if (e.button !== 0 || state.vue !== 'organiser' || !state.pages.length) return;
      if (e.target.closest('.tile, .chip, button, input, select, textarea, a, label')) return;
      const p = lassoPos(e);
      Object.assign(lasso, { actif: true, trace: false, x0: p.x, y0: p.y, base: new Set(state.selected), ajoute: e.ctrlKey || e.metaKey || e.shiftKey });
      e.preventDefault(); // pas de sélection de texte pendant le tracé
    });
    document.addEventListener('mousemove', e => {
      if (!lasso.actif) return;
      const p = lassoPos(e);
      if (!lasso.trace) {
        if (Math.abs(p.x - lasso.x0) < 4 && Math.abs(p.y - lasso.y0) < 4) return;
        lasso.trace = true;
        lasso.el = document.createElement('div'); lasso.el.className = 'lasso';
        el.canvas.appendChild(lasso.el);
      }
      // Près du bord, la table défile toute seule.
      const r = el.canvas.getBoundingClientRect();
      if (e.clientY > r.bottom - 28) el.canvas.scrollTop += 14; else if (e.clientY < r.top + 28) el.canvas.scrollTop -= 14;
      const q = lassoPos(e);
      const x = Math.min(q.x, lasso.x0), y = Math.min(q.y, lasso.y0), w = Math.abs(q.x - lasso.x0), h = Math.abs(q.y - lasso.y0);
      Object.assign(lasso.el.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      const voulu = new Set(lasso.ajoute ? lasso.base : []);
      state.pages.forEach(pg => {
        const t = tiles.get(pg.id);
        if (!t) return;
        const b = (t.querySelector('.thumb') || t).getBoundingClientRect();
        const bx = b.left - r.left + el.canvas.scrollLeft, by = b.top - r.top + el.canvas.scrollTop;
        if (bx < x + w && bx + b.width > x && by < y + h && by + b.height > y) {
          if (lasso.ajoute && lasso.base.has(pg.id)) voulu.delete(pg.id); else voulu.add(pg.id);
        }
      });
      if (voulu.size !== state.selected.size || Array.from(voulu).some(i => !state.selected.has(i))) {
        state.selected.clear();
        voulu.forEach(i => state.selected.add(i));
        updateSelectionUI();
      }
    });
    const finLasso = e => {
      if (!lasso.actif) return;
      lasso.actif = false;
      if (lasso.el) { lasso.el.remove(); lasso.el = null; }
      else if (e && e.type === 'mouseup' && !lasso.ajoute && state.selected.size) clearSelection();
    };
    document.addEventListener('mouseup', finLasso);
    window.addEventListener('blur', finLasso);

    // --- global keys
    document.addEventListener('keydown', e => {
      if (ed.root && !ed.root.hidden) return;
      if (openDlg) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undo(); }
      else if (mod && ((e.key === 'y' || e.key === 'Y') || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) { e.preventDefault(); redoAction(); }
      else if (mod && (e.key === 'a' || e.key === 'A') && state.pages.length) { e.preventDefault(); selectAll(); }
      else if (mod && (e.key === 'o' || e.key === 'O')) { e.preventDefault(); openPicker(e.shiftKey ? '' : 'onglet'); }
      else if (mod && (e.key === 't' || e.key === 'T')) { e.preventDefault(); nouvelOnglet(); }
      else if (mod && (e.key === 'w' || e.key === 'W')) { e.preventDefault(); fermerOnglet(ongletActif); }
      else if (mod && e.key === 'Tab') { e.preventDefault(); ongletVoisin(e.shiftKey ? -1 : 1); }
      else if (mod && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); if (state.pages.length) ajouterSignet(); }
      else if (mod && e.shiftKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); if (state.pages.length && !state.busy) exportPages(state.pages, safeBase(el.filename.value) + '.pdf'); }
      else if (mod && (e.key === 's' || e.key === 'S')) { e.preventDefault(); enregistrer(); }
      else if (mod && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); if (state.pages.length && !state.busy) dialogImprimer(); }
      else if (mod && e.key === '1') { e.preventDefault(); changerVue('lecture'); }
      else if (mod && e.key === '2') { e.preventDefault(); changerVue('organiser'); }
      else if (mod && state.vue === 'lecture' && (e.key === '+' || e.key === '=')) { e.preventDefault(); pas(1); }
      else if (mod && state.vue === 'lecture' && e.key === '-') { e.preventDefault(); pas(-1); }
      else if (mod && state.vue === 'lecture' && e.key === '0') { e.preventDefault(); poserZoom('page'); }
      else if (mod && (e.key === 'f' || e.key === 'F')) { if (state.pages.length) { e.preventDefault(); toolSearch(); } }
      else if (e.key === '?' || (e.key === '/' && e.shiftKey)) { e.preventDefault(); toolHelp(); }
      else if (e.key === 'Escape') { if (annulation.actif) demanderAnnulation(); else clearSelection(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && state.selected.size && !e.target.closest('.tile')) { e.preventDefault(); deletePages(selectedInOrder()); }
      else if ((e.key === 'r' || e.key === 'R') && state.selected.size && !e.target.closest('.tile') && !mod) { e.preventDefault(); rotatePages(selectedInOrder(), e.shiftKey ? -90 : 90); }
    });

    window.addEventListener('beforeunload', e => {
      if (modifieQuelquePart()) { e.preventDefault(); e.returnValue = ''; }
    });

    renderTools();
    render();
    // Lancée par l'exécutable, la page imprime directement : le moteur
    // d'affichage n'ouvre pas sa propre fenêtre d'impression.
    state.impressionDirecte = optionLancement('impression') === 'directe';
    // La fenêtre de l'application ne se ferme pas d'un coup : elle demande
    // ici. Rien à défendre, on part ; sinon, la question, et la réponse
    // repart par blonayQuitter(true) pour partir, (false) pour rester.
    window.__blonayFermer = () => {
      const quitter = oui => { try { if (typeof window.blonayQuitter === 'function') window.blonayQuitter(!!oui); } catch (_) {} };
      // Partir pour de bon : le travail mis de côté pour la récupération
      // n'a plus lieu d'être — sans attendre plus d'une seconde et demie.
      const partir = () => { const fin = () => quitter(true); Promise.race([recupToutOublier(), new Promise(r => setTimeout(r, 1500))]).then(fin, fin); };
      if (!modifieQuelquePart()) { partir(); return; }
      let decide = false;
      dialog({
        title: 'Quitter Blonay PDF', icon: IC.info,
        build: b => { b.append(note('Des modifications n\'ont pas été enregistrées. En quittant maintenant, vous les perdez.', 'warn')); },
        onClose: () => { if (!decide) quitter(false); },
        actions: [
          { label: 'Revenir au document', onClick: c => c() },
          { label: 'Quitter sans enregistrer', primary: true, onClick: c => { decide = true; c(); partir(); } },
        ],
      });
    };
    // La fenêtre de l'application (Electron) parle à la page par
    // window.BlonayDesktop : les documents reçus, les commandes de son menu,
    // le résultat d'un enregistrement.
    const bureau = window.BlonayDesktop || null;
    state.bureau = !!bureau;
    if (bureau) {
      const commandeBureau = nom => {
        if (nom === 'exporter') { if (state.pages.length && !state.busy) exportPages(state.pages, safeBase(el.filename.value) + '.pdf'); }
        else if (nom === 'enregistrer') enregistrer();
        else if (nom === 'imprimer') { if (state.pages.length && !state.busy) dialogImprimer(); }
        else if (nom === 'ouvrir') openPicker('onglet');
        else if (nom === 'ajouter') openPicker('');
        else if (nom === 'nouvel-onglet') nouvelOnglet();
        else if (nom === 'fermer-onglet') fermerOnglet(ongletActif);
        else if (nom === 'onglet-suivant') ongletVoisin(1);
        else if (nom === 'onglet-precedent') ongletVoisin(-1);
        else if (nom === 'rechercher') { if (state.pages.length) toolSearch(); }
        else if (nom === 'dossier') { if (state.pages.length) toolDossier(); }
        else if (nom === 'lots') toolLots();
        else if (nom === 'tableau') { if (state.pages.length) toolTableau(); }
        else if (nom === 'ocr') { if (state.pages.length) toolOcr(); }
        else if (nom === 'comparer') { if (state.pages.length) toolComparer(); }
        else if (nom === 'editeur') { if (state.pages.length) openEditor(pageCouranteId()); }
        else if (nom === 'lecture' || nom === 'organiser') changerVue(nom);
        else if (nom === 'zoom-plus') { if (state.vue === 'lecture') pas(1); }
        else if (nom === 'zoom-moins') { if (state.vue === 'lecture') pas(-1); }
        else if (nom === 'zoom-page') { if (state.vue === 'lecture') poserZoom('page'); }
        else if (nom === 'deux-pages') { changerVue('lecture'); poserDispo(state.dispo === 'deux' ? 'une' : 'deux'); }
        else if (nom === 'signet') { if (state.pages.length) ajouterSignet(); }
        else if (nom === 'theme') el.btnTheme.click();
        else if (nom === 'raccourcis') toolHelp();
      };
      try {
        bureau.onOuvrir(liste => { ouvrirListe(liste); });
        if (bureau.onOuvrirOnglet) bureau.onOuvrirOnglet(liste => { ouvrirListe(liste, { onglet: true }); });
        bureau.onCommande(commandeBureau);
        bureau.onEnregistre(r => {
          const attente = state.attenteChemin; state.attenteChemin = null;
          if (r && r.chemin) {
            toast(nomDe(r.chemin) + ' enregistré'); setLast('Enregistré : ' + r.chemin);
            // Le document entier vient d'être écrit là : c'est son fichier, désormais.
            if (attente && /\.pdf$/i.test(r.chemin)) documentEnregistre(r.chemin, attente.onglet);
          } else if (r && r.annule) toast('Enregistrement annulé.', 'warn');
        });
      } catch (e) { console.error(e); }
      // Les documents du lancement d'abord ; ensuite seulement, le travail
      // laissé par un arrêt brutal, pour qu'il rouvre dans son propre onglet.
      bureau.fichiersInitiaux().then(l => (l && l.length) ? ouvrirListe(l) : null).catch(() => {})
        .then(() => (typeof bureau.recupListe === 'function' ? bureau.recupListe() : []))
        .then(liste => { if (Array.isArray(liste) && liste.length) proposerRecuperation(liste); })
        .catch(e => signaler('Récupération', e));
      // Dans l'application, Enregistrer réécrit le fichier ouvert (Ctrl+S) ;
      // « Enregistrer sous… » (Ctrl+Maj+S) est dans le menu Fichier.
      const lblExport = el.btnExport.querySelector('.lbl');
      if (lblExport) lblExport.textContent = 'Enregistrer';
      el.btnExport.title = 'Enregistrer (Ctrl+S) · Enregistrer sous… : Ctrl+Maj+S';
    } else {
      // Un document demandé au lancement prend la place de l'exemple. Demandé
      // plus tard, sur une page déjà ouverte, il s'ajoute comme par le bouton Ouvrir.
      ouvrirAuLancement().then(demande => { if (!demande) loadSample(); });
      window.addEventListener('hashchange', () => { ouvrirAuLancement(); });
    }
  }

  const origRender = render;
  render = function () { origRender(); renderTools(); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
