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
    if (Array.isArray(window.__aktumOuvrir)) { liste = window.__aktumOuvrir; delete window.__aktumOuvrir; }
    const nom = fichierDemande();
    if (!liste && !nom) return false;
    if (nom) {
      // L'adresse est nettoyée tout de suite : le fichier d'ouverture ne vit
      // que quelques instants, un rechargement ne doit pas le redemander.
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { signaler('Adresse de la page', e, 'info'); }
    }
    setBusy('Ouverture du document…');
    if (!liste) liste = await new Promise(resolve => {
      const s = document.createElement('script');
      s.src = nom;
      s.onload = () => { const l = window.__aktumOuvrir; delete window.__aktumOuvrir; s.remove(); resolve(Array.isArray(l) ? l : null); };
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
        // Sa date de modification à la lecture, et qui l'a déjà ouvert : de quoi
        // ne pas écraser le travail d'une collègue sans le savoir.
        if (f.mtimeMs > 0) fichier.mtimeMs = f.mtimeMs;
        if (f.verrou) fichier.verrou = f.verrou;
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
    try { localStorage.setItem('aktum-theme', mode); } catch (e) { signaler('Préférence de thème', e, 'info'); }
    // La fenêtre de l'application peint son fond avant la page : elle retient le thème pour la prochaine ouverture.
    if (window.AktumDesktop && typeof window.AktumDesktop.definirTheme === 'function') { try { window.AktumDesktop.definirTheme(mode); } catch (e) { signaler('Thème de la fenêtre', e, 'info'); } }
  }

  // =====================================================================
  //  Init
  // =====================================================================
  function init() {
    // Un bouton sans texte tire son nom de son infobulle : on le dit explicitement, car `title` seul n'est pas un nom fiable
    // pour tous les lecteurs d'écran (la page a quatre boutons de ce genre : aide, thème, langue, replier).
    $$('button[title]:not([aria-label])').forEach(b => { if (!b.textContent.trim()) b.setAttribute('aria-label', b.title); });
    // Quel bouton vient d'être cliqué : de quoi lui donner l'état « occupé » quand son opération dure (voir setBusy).
    document.addEventListener('click', (e) => {
      const b = e.target && e.target.closest ? e.target.closest('button') : null;
      state.dernierClic = { bouton: b, t: performance.now() };
    }, true);
    Object.assign(el, {
      pages: $('#pages'), canvas: $('#canvas'), dropzone: $('#dropzone'), chips: $('#chips'),
      docList: $('#doc-list'), docsEmpty: $('#docs-empty'), docCount: $('#doc-count'),
      fileInput: $('#file-input'), filename: $('#filename'),
      btnOpen: $('#btn-open'), btnAdd: $('#btn-add'), btnChoose: $('#btn-choose'), btnSample: $('#btn-sample'), dzRecents: $('#dz-recents'),
      btnExport: $('#btn-export'), btnPrint: $('#btn-print'), btnUndo: $('#btn-undo'), btnRedo: $('#btn-redo'),
      btnSelectAll: $('#btn-select-all'), selectAllLabel: $('#select-all-label'), btnSearch: $('#btn-search'),
      btnTheme: $('#btn-theme'), btnHelp: $('#btn-help'), btnLangue: $('#btn-langue'),
      zoom: $('#zoom'), summary: $('#summary'), last: $('#last'),
      progress: $('#progress'), progressBar: $('#progress-bar'),
      btnAnnulerOp: $('#btn-annuler-op'), btnJournal: $('#btn-journal'),
      selbar: $('#selbar'), selCount: $('#sel-count'), moveto: $('#moveto'), movetoGo: $('#moveto-go'), selPlage: $('#sbar-plage'), selRapide: $('#sbar-rapide'),
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
    try { theme = localStorage.getItem('aktum-theme') || 'light'; } catch (e) { signaler('Préférence de thème', e, 'info'); }
    applyTheme(theme);
    el.btnTheme.addEventListener('click', () => {
      theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light';
      applyTheme(theme);
    });
    // La langue : le bouton affiche l'autre langue (« DE » sur une page française) et la propose.
    const afficherLangue = () => {
      const autre = langue === 'fr' ? 'de' : 'fr';
      el.btnLangue.textContent = autre.toUpperCase();
      el.btnLangue.title = 'Passer à ' + LANGUES[autre];
      el.btnLangue.setAttribute('aria-label', el.btnLangue.title);
    };
    afficherLangue();
    window.addEventListener('aktum-langue', afficherLangue);
    el.btnLangue.addEventListener('click', () => { definirLangue(langue === 'fr' ? 'de' : 'fr', true); vue.render(); });
    el.btnHelp.addEventListener('click', toolHelp);
    el.btnAnnulerOp.addEventListener('click', demanderAnnulation);
    el.btnJournal.addEventListener('click', toolJournal);

    // tabs
    const tabs = [[$('#tab-docs'), $('#pane-docs')], [$('#tab-tools'), $('#pane-tools')], [$('#tab-plan'), $('#pane-plan')]];
    // Le volet choisi est retenu, comme la vue, le thème et le repli du panneau : on rouvre là où on travaillait.
    const poserVolet = (tab, pane) => tabs.forEach(([t, p]) => { t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); p.hidden = p !== pane; });
    tabs.forEach(([tab, pane]) => {
      tab.addEventListener('click', () => {
        poserVolet(tab, pane);
        try { localStorage.setItem('aktum-volet', tab.id); } catch (e) { signaler('Volet du panneau', e, 'info'); }
      });
    });
    try {
      const retenu = localStorage.getItem('aktum-volet');
      const choix = tabs.find(([t]) => t.id === retenu);
      if (choix) poserVolet(choix[0], choix[1]);
    } catch (e) { signaler('Volet du panneau', e, 'info'); }

    // « Ouvrir » ouvre un document à part (nouvel onglet si celui-ci en a
    // déjà un) ; « Ajouter un document » le combine au document en cours.
    let modeOuverture = '';
    const openPicker = mode => { modeOuverture = mode || ''; el.fileInput.value = ''; el.fileInput.click(); };
    choisirDesFichiers = openPicker; // « Fusionner des PDF », dans le panneau des outils

    // Replier le panneau : la place revient au document. Le choix est retenu.
    const espace = $('.workspace'), btnReplier = $('#btn-replier');
    const poserLeRepli = replie => {
      espace.classList.toggle('replie', replie);
      btnReplier.setAttribute('aria-expanded', replie ? 'false' : 'true');
      btnReplier.title = vue.infobulle(replie ? 'Déplier le panneau' : 'Replier le panneau', 'panneau');
      btnReplier.setAttribute('aria-label', btnReplier.title);
      try { localStorage.setItem('aktum-panneau-replie', replie ? '1' : ''); } catch (e) { signaler('Préférence d\'affichage', e, 'info'); }
      planifierAjustementBarre();
    };
    try { if (localStorage.getItem('aktum-panneau-replie')) poserLeRepli(true); } catch (e) { signaler('Préférence d\'affichage', e, 'info'); }
    btnReplier.addEventListener('click', () => poserLeRepli(!espace.classList.contains('replie')));
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
    try { const v = localStorage.getItem('aktum-vue'); if (v === 'organiser' || v === 'lecture') state.vue = v; } catch (e) { signaler('Préférence d\'affichage', e, 'info'); }
    $$('.vue-mode').forEach(b => b.addEventListener('click', () => changerVue(b.dataset.vue)));
    const NIVEAUX = ['page', 'largeur', '0.5', '0.75', '1', '1.25', '1.5', '2', '3', '4'];
    const poserZoom = v => {
      state.zoomLecture = v;
      el.zoomNiveau.value = v;
      try { localStorage.setItem('aktum-zoom-lecture', v); } catch (e) { signaler('Préférence de zoom', e, 'info'); }
      if (state.vue === 'lecture') lectureRendu();
    };
    try { const z = localStorage.getItem('aktum-zoom-lecture'); if (z && NIVEAUX.indexOf(z) >= 0) state.zoomLecture = z; } catch (e) { signaler('Préférence de zoom', e, 'info'); }
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
      try { localStorage.setItem('aktum-dispo', state.dispo); } catch (e) { signaler('Préférence de disposition', e, 'info'); }
      if (state.vue === 'lecture' && state.pages.length) lectureRendu();
    };
    try { if (localStorage.getItem('aktum-dispo') === 'deux') { state.dispo = 'deux'; el.vueDeux.setAttribute('aria-pressed', 'true'); } } catch (e) { signaler('Préférence de disposition', e, 'info'); }
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
    // « Pages » de la barre de sélection : une plage « 3-7, 12 » remplace la sélection (la même lecture que partout) ; les choix rapides
    // font le reste : toutes les pages, les impaires, les paires, l'inverse de la sélection.
    const choisirUnePlage = () => {
      const t = el.selPlage.value.trim();
      if (!t || !state.pages.length) return;
      const r = lirePlages(t, state.pages.length);
      if (r.ignores.length) { toast(tr('Plage de pages non comprise :') + ' ' + r.ignores.join(', ') + '. ' + tr('Écrivez par exemple 3-7, 12.'), 'warn'); return; }
      if (!r.pages.length) { toast('Cette plage ne désigne aucune page.', 'warn'); return; }
      state.selected.clear();
      r.pages.forEach(n => state.selected.add(state.pages[n - 1].id));
      vue.updateSelectionUI();
      setLast(plural(r.pages.length, 'page sélectionnée', 'pages sélectionnées') + ' : ' + formaterPlages(r.pages));
    };
    el.selPlage.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); choisirUnePlage(); } else if (e.key === 'Escape') { e.preventDefault(); el.selPlage.blur(); } });
    el.selRapide.addEventListener('change', () => {
      const choix = el.selRapide.value;
      el.selRapide.value = '';
      if (!choix || !state.pages.length) return;
      const avant = new Set(state.selected);
      state.selected.clear();
      state.pages.forEach((p, i) => {
        const pris = choix === 'tout' ? true : choix === 'impaires' ? i % 2 === 0 : choix === 'paires' ? i % 2 === 1 : !avant.has(p.id);
        if (pris) state.selected.add(p.id);
      });
      vue.updateSelectionUI();
      setLast(plural(state.selected.size, 'page sélectionnée', 'pages sélectionnées'));
    });
    el.movetoGo.addEventListener('click', commitMoveTo);
    el.moveto.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commitMoveTo(); } else if (e.key === 'Escape') { e.preventDefault(); el.moveto.blur(); } });
    el.moveto.addEventListener('focus', () => requestAnimationFrame(() => el.moveto.select()));

    el.zoom.addEventListener('input', () => {
      document.documentElement.style.setProperty('--tuile', el.zoom.value + 'px');
      try { localStorage.setItem('aktum-zoom', el.zoom.value); } catch (e) { signaler('Préférence de zoom', e, 'info'); }
    });
    // Sans réglage retenu, la taille des vignettes se déduit de la place : sur
    // un grand écran, quatre pages occupaient le coin supérieur gauche d'une
    // table qui pouvait en montrer vingt, et le curseur qui aurait corrigé cela
    // est petit, sans libellé, en bas à droite — personne ne le trouve.
    function tuilesALaPlace() {
      const table = $('#canvas');
      const dispo = (table ? table.clientWidth : window.innerWidth) - 44;
      if (dispo < 200) return null;
      // On vise six colonnes, sans jamais sortir des bornes du curseur.
      const large = Math.floor((dispo - 5 * 18) / 6);
      return Math.max(120, Math.min(300, large));
    }
    try {
      const z = localStorage.getItem('aktum-zoom');
      if (z && +z >= 120 && +z <= 300) { el.zoom.value = z; document.documentElement.style.setProperty('--tuile', z + 'px'); }
      else {
        const t = tuilesALaPlace();
        if (t) { el.zoom.value = t; document.documentElement.style.setProperty('--tuile', t + 'px'); }
      }
    } catch (e) { signaler('Préférence de zoom', e, 'info'); }

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
        else if (act === 'glisser') enregistrerLaPage(id);
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
      vue.updateSelectionUI();
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

    // Le dernier élément qui a eu le focus est celui où Tab revient (voir majTabulationTuiles).
    el.pages.addEventListener('focusin', e => { const t = e.target.closest('.tile'); if (t) majTabulationTuiles(+t.dataset.id); });
    el.pages.addEventListener('keydown', e => {
      const t = e.target.closest('.tile');
      if (!t || e.target !== t) return;
      const id = +t.dataset.id;
      const i = pageIndex(id);
      if (e.key === ' ') {
        e.preventDefault();
        if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
        state.anchor = id; vue.updateSelectionUI();
      } else if (e.key === 'Enter') { e.preventDefault(); openEditor(id); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        if (e.altKey) { nudge(id, dir); return; }
        const next = state.pages[i + dir];
        if (next) { const nt = tiles.get(next.id); if (nt) nt.focus(); }
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        // La grille est à deux dimensions : haut et bas vont à la page de la rangée voisine, dans la même colonne.
        e.preventDefault();
        const r = t.getBoundingClientRect(), cx = r.left + r.width / 2, bas = e.key === 'ArrowDown';
        let meilleur = null, score = Infinity;
        state.pages.forEach(p => {
          const x = tiles.get(p.id);
          if (!x || x === t) return;
          const b = x.getBoundingClientRect();
          if (bas ? b.top < r.top + r.height * 0.5 : b.bottom > r.bottom - r.height * 0.5) return;
          const sc = Math.abs(b.top - r.top) * 1000 + Math.abs(cx - (b.left + b.width / 2));
          if (sc < score) { score = sc; meilleur = x; }
        });
        if (meilleur) meilleur.focus();
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        const x = tiles.get(state.pages[e.key === 'Home' ? 0 : state.pages.length - 1].id);
        if (x) x.focus();
      } else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); t.querySelector('.pos').focus(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deletePages(targetsFor(id)); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rotatePages(targetsFor(id), e.shiftKey ? -90 : 90); }
      else if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const inp = t.querySelector('.pos');
        inp.focus(); inp.value = e.key;
      }
    });

    // La barre d'actions écartée par Échap revient quand on quitte la vignette.
    const rendreLesOutils = e => { const t = e.target.closest ? e.target.closest('.tile') : null; if (t && !t.contains(e.relatedTarget)) t.classList.remove('outils-ecartes'); };
    el.pages.addEventListener('pointerout', rendreLesOutils);
    el.pages.addEventListener('focusout', rendreLesOutils);
    // --- drag & drop
    brancherLeGlisser();
    el.pages.addEventListener('dragstart', e => {
      const t = e.target.closest('.tile');
      if (!t) return;
      const id = +t.dataset.id;
      if (!state.selected.has(id)) { state.selected.clear(); state.selected.add(id); state.anchor = id; vue.updateSelectionUI(); }
      drag.ids = selectedInOrder();
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', 'aktum-pages'); } catch (e) { signaler('Glisser-déposer', e, 'info'); }
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
        vue.updateSelectionUI();
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

    // --- les touches : la table (desktop/raccourcis.json) dit lesquelles ; ici, les fonctions qu'elles lancent.
    // Une action n'agit que si elle peut (`quand`) : sans document, Ctrl+F laisse la touche au navigateur.
    const sansTuile = e => !(e && e.target && e.target.closest && e.target.closest('.tile'));
    const pagesSel = () => state.selected.size > 0;
    const enLecture = () => state.vue === 'lecture' && state.pages.length > 0;
    const pageLue = () => clampInt(el.pageNum.value, 1, state.pages.length) || 1;
    const outilsOuverts = () => { const t = $('#tab-tools'); if (t) t.click(); };
    Object.assign(ACTIONS, {
      annuler: { agit: () => undo() },
      retablir: { agit: () => redoAction() },
      repeter: { quand: () => state.pages.length > 0, agit: () => repeterOperation() },
      'tout-selectionner': { quand: () => state.pages.length > 0, agit: () => selectAll() },
      ouvrir: { agit: () => openPicker('onglet') },
      ajouter: { agit: () => openPicker('') },
      'nouvel-onglet': { agit: () => nouvelOnglet() },
      'fermer-onglet': { agit: () => fermerOnglet(ongletActif) },
      'onglet-suivant': { agit: () => ongletVoisin(1) },
      'onglet-precedent': { agit: () => ongletVoisin(-1) },
      signet: { agit: () => { if (state.pages.length) ajouterSignet(); } },
      enregistrer: { agit: () => enregistrer() },
      exporter: { agit: () => { if (state.pages.length && !state.busy) exportPages(state.pages, safeBase(el.filename.value) + '.pdf'); } },
      imprimer: { agit: () => { if (state.pages.length && !state.busy) dialogImprimer(); } },
      rechercher: { quand: () => state.pages.length > 0, agit: () => toolSearch() },
      // « Suivant » et « Précédent » du panneau de recherche, quel que soit le focus ; fermé, F3 le rouvre.
      'occurrence-suivante': { quand: () => state.pages.length > 0, agit: () => { const b = $('#se-suiv'); if (b) b.click(); else toolSearch(); } },
      'occurrence-precedente': { quand: () => state.pages.length > 0, agit: () => { const b = $('#se-prec'); if (b) b.click(); else toolSearch(); } },
      'filtre-outils': { agit: () => { outilsOuverts(); const q = $('#outil-q'); if (q) { q.focus(); q.select(); } } },
      preferences: { agit: () => toolPreferences() },
      raccourcis: { agit: () => toolHelp() },
      decouverte: { agit: () => { decouvrir().catch(e => signaler('Visite guidée', e)); } },
      lecture: { agit: () => changerVue('lecture') },
      organiser: { agit: () => changerVue('organiser') },
      'deux-pages': { agit: () => { changerVue('lecture'); poserDispo(state.dispo === 'deux' ? 'une' : 'deux'); } },
      'zoom-plus': { quand: enLecture, agit: () => pas(1) },
      'zoom-moins': { quand: enLecture, agit: () => pas(-1) },
      'zoom-page': { quand: enLecture, agit: () => poserZoom('page') },
      'zoom-100': { quand: enLecture, agit: () => poserZoom('1') },
      'zoom-largeur': { quand: enLecture, agit: () => poserZoom('largeur') },
      panneau: { agit: () => poserLeRepli(!espace.classList.contains('replie')) },
      // Aller à la page : le champ de la barre d'état, déjà là, prend le focus (Entrée y mène)
      'aller-page': { quand: enLecture, agit: () => { el.pageNum.focus(); el.pageNum.select(); } },
      'page-suivante': { quand: enLecture, agit: () => lectureAller(Math.min(state.pages.length, pageLue() + 1)) },
      'page-precedente': { quand: enLecture, agit: () => lectureAller(Math.max(1, pageLue() - 1)) },
      'premiere-page': { quand: enLecture, agit: () => lectureAller(1) },
      'derniere-page': { quand: enLecture, agit: () => lectureAller(state.pages.length) },
      'supprimer-pages': { quand: e => pagesSel() && sansTuile(e), agit: () => deletePages(selectedInOrder()) },
      'pivoter-droite': { quand: e => pagesSel() && sansTuile(e), agit: () => rotatePages(selectedInOrder(), 90) },
      'pivoter-gauche': { quand: e => pagesSel() && sansTuile(e), agit: () => rotatePages(selectedInOrder(), -90) },
      // Échap écarte aussi la barre d'actions qui s'affiche au survol ou au focus d'une vignette (WCAG 1.4.13) : elle revient quand le
      // pointeur ou le focus quitte la vignette puis y revient.
      deselectionner: { agit: () => {
        if (annulation.actif) { demanderAnnulation(); return; }
        const ouvert = el.pages.querySelector('.tile:hover, .tile:focus-within');
        if (ouvert) ouvert.classList.add('outils-ecartes');
        clearSelection();
      } },
    });
    // L'éditeur de page : un outil par touche, et ses deux pages voisines
    ['select', 'edittext', 'text', 'highlight', 'box', 'draw', 'redact', 'champ', 'tampon', 'sign', 'image'].forEach(outil => {
      ACTIONS['ed-' + outil] = { quand: () => ed.root && !ed.root.hidden, agit: () => { const b = $('.ed-tool[data-tool="' + outil + '"]', ed.root); if (b) b.click(); } };
    });
    ACTIONS['ed-precedente'] = { quand: () => ed.root && !ed.root.hidden, agit: () => edGo(-1) };
    ACTIONS['ed-suivante'] = { quand: () => ed.root && !ed.root.hidden, agit: () => edGo(1) };
    envoyerLesAccelerateurs();
    poserLesInfobulles();
    window.addEventListener('aktum-langue', poserLesInfobulles);

    document.addEventListener('keydown', e => {
      if (ed.root && !ed.root.hidden) return;
      if (openDlg) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      traiterLaTouche(e, 'page');
    });

    window.addEventListener('beforeunload', e => {
      if (modifieQuelquePart()) { e.preventDefault(); e.returnValue = ''; }
    });

    renderTools();
    envoyerLeMenuDesOutils();
    window.addEventListener('aktum-langue', envoyerLeMenuDesOutils);
    vue.render();
    // Lancée par l'exécutable, la page imprime directement : le moteur
    // d'affichage n'ouvre pas sa propre fenêtre d'impression.
    state.impressionDirecte = optionLancement('impression') === 'directe';
    // La fenêtre de l'application ne se ferme pas d'un coup : elle demande
    // ici. Rien à défendre, on part ; sinon, la question, et la réponse
    // repart par aktumQuitter(true) pour partir, (false) pour rester.
    window.__aktumFermer = () => {
      const quitter = oui => { try { if (typeof window.aktumQuitter === 'function') window.aktumQuitter(!!oui); } catch (e) { signaler('Fermeture de l\'application', e); } };
      // Partir pour de bon : le travail mis de côté pour la récupération
      // n'a plus lieu d'être — sans attendre plus d'une seconde et demie.
      const partir = () => { const fin = () => quitter(true); Promise.race([recupToutOublier(), new Promise(r => setTimeout(r, 1500))]).then(fin, fin); };
      if (!modifieQuelquePart()) { partir(); return; }
      let decide = false;
      dialog({
        title: 'Quitter Aktum PDF', icon: IC.info,
        build: b => { b.append(note('Des modifications n\'ont pas été enregistrées. En quittant maintenant, vous les perdez.', 'warn')); },
        onClose: () => { if (!decide) quitter(false); },
        actions: [
          { label: 'Revenir au document', onClick: c => c() },
          { label: 'Quitter sans enregistrer', primary: true, onClick: c => { decide = true; c(); partir(); } },
        ],
      });
    };
    // La fenêtre de l'application (Electron) parle à la page par
    // window.AktumDesktop : les documents reçus, les commandes de son menu,
    // le résultat d'un enregistrement.
    // Une commande d'édition du menu (Annuler, Rétablir, Tout sélectionner) rejoue la touche correspondante là où est le
    // focus : tout ce qui sait y répondre — l'application sur le document, l'éditeur de page, une fenêtre — y répond
    // comme à la touche. Si personne n'y répond et que le focus est dans un champ de saisie, c'est le champ qui fait.
    const toucheEdition = (touche, maj) => {
      const cible = document.activeElement || document.body;
      const evt = new KeyboardEvent('keydown', { key: maj ? touche.toUpperCase() : touche, ctrlKey: true, shiftKey: maj, bubbles: true, cancelable: true });
      if (!cible.dispatchEvent(evt)) return;
      const champ = cible.isContentEditable || /^(input|textarea)$/i.test(cible.tagName || '');
      if (!champ) return;
      if (touche === 'a') { if (typeof cible.select === 'function') cible.select(); else document.execCommand('selectAll'); }
      else document.execCommand(maj ? 'redo' : 'undo');
    };
    const bureau = window.AktumDesktop || null;
    state.bureau = !!bureau;
    if (bureau) {
      const commandeBureau = nom => {
        // Les gestes de la table se lancent comme à la touche. Annuler, Rétablir et Tout sélectionner passent d'abord par
        // le champ qui a le focus (voir toucheEdition).
        const a = ACTIONS[nom];
        if (nom !== 'annuler' && nom !== 'retablir' && nom !== 'tout-selectionner' && a) { if (!a.quand || a.quand(null)) a.agit(null); return; }
        if (nom === 'dossier') { if (state.pages.length) toolDossier(); }
        else if (nom === 'lots') toolLots();
        else if (nom === 'tableau') { if (state.pages.length) toolTableau(); }
        else if (nom === 'ocr') { if (state.pages.length) toolOcr(); }
        else if (nom === 'comparer') { if (state.pages.length) toolComparer(); }
        else if (nom === 'editeur') { if (state.pages.length) openEditor(pageCouranteId()); }
        else if (nom.startsWith('outil:')) lancerUnOutil(nom.slice(6));
        else if (nom === 'annuler') toucheEdition('z', false);
        else if (nom === 'retablir') toucheEdition('z', true);
        else if (nom === 'tout-selectionner') toucheEdition('a', false);
        else if (nom === 'theme') el.btnTheme.click();
      };
      // La licence : l'état vient de l'application, la page affiche et suspend l'enregistrement
      // quand l'essai est fini. Relue de temps en temps : le fichier peut être posé pendant qu'on travaille.
      const lireLaLicence = () => { if (typeof bureau.licence === 'function') bureau.licence().then(l => { state.licence = l; majLicence(); }).catch(e => signaler('Licence', e)); };
      lireLaLicence();
      setInterval(lireLaLicence, 10 * 60 * 1000);
      const chipLicence = document.getElementById('licence-ligne');
      if (chipLicence) chipLicence.addEventListener('click', toolLicence);
      try {
        bureau.onOuvrir(liste => { ouvrirListe(liste); });
        if (bureau.onOuvrirOnglet) bureau.onOuvrirOnglet(liste => { ouvrirListe(liste, { onglet: true }); });
        bureau.onCommande(commandeBureau);
        // Un changement de langue venu du menu : la page suit, et relit l'état de la licence (son texte est rédigé par le processus principal).
        if (bureau.onLangue) bureau.onLangue(l => { if (l !== codeLangue()) { definirLangue(l, false); vue.render(); } lireLaLicence(); });
        window.addEventListener('aktum-langue', lireLaLicence);
        bureau.onEnregistre(r => {
          const attente = state.attenteChemin; state.attenteChemin = null;
          if (r && r.chemin) {
            toast(nomDe(r.chemin) + ' enregistré'); setLast('Enregistré : ' + r.chemin);
            // Le document entier vient d'être écrit là : c'est son fichier, désormais.
            if (attente && /\.pdf$/i.test(r.chemin)) documentEnregistre(r.chemin, attente.onglet, r.mtimeMs);
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
      el.btnExport.title = vue.infobulle('Enregistrer', 'enregistrer') + ' · ' + vue.infobulle('Enregistrer sous…', 'exporter');
    } else {
      // Un document demandé au lancement prend la place de l'exemple. Demandé
      // plus tard, sur une page déjà ouverte, il s'ajoute comme par le bouton Ouvrir.
      ouvrirAuLancement().then(demande => { if (!demande) loadSample(); });
      window.addEventListener('hashchange', () => { ouvrirAuLancement(); });
    }
  }

  // La barre est remesurée après chaque rendu : passer en lecture fait
  // apparaître les contrôles de zoom, et c'est précisément là qu'elle débordait.
  const rendreLesVignettes = vue.render;
  vue.render = function () { rendreLesVignettes(); renderTools(); planifierAjustementBarre(); };
  vue.touche = traiterLaTouche;
  vue.infobulle = infobulle;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
