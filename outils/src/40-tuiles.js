  // =====================================================================
  //  Tiles
  // =====================================================================
  function makeTile(p) {
    const li = document.createElement('li');
    li.className = 'tile';
    li.dataset.id = p.id;
    li.draggable = true;
    li.tabIndex = 0;
    li.setAttribute('role', 'option');

    const thumb = document.createElement('div'); thumb.className = 'thumb';
    const sheet = document.createElement('div'); sheet.className = 'sheet';
    const rot = document.createElement('div'); rot.className = 'rot';
    rot.style.position = 'absolute'; rot.style.top = '50%'; rot.style.left = '50%';
    const img = document.createElement('img'); img.alt = ''; img.draggable = false;
    rot.appendChild(img);
    sheet.appendChild(rot);
    const ph = document.createElement('div'); ph.className = 'placeholder';
    const sp = document.createElement('span'); sp.className = 'spinner';
    ph.appendChild(sp);
    thumb.append(sheet, ph);

    const check = document.createElement('span'); check.className = 'check'; check.appendChild(icon(IC.check, { sw: 2.2 }));
    const flags = document.createElement('div'); flags.className = 'flags';
    thumb.append(check, flags);

    const tools = document.createElement('div'); tools.className = 'tile-tools';
    tools.setAttribute('role', 'group');
    [['rotl', IC.rotL, 'Pivoter à gauche'], ['rotr', IC.rotR, 'Pivoter à droite'], ['|'],
     ['left', IC.left, 'Déplacer d\'une position vers la gauche'], ['pos', IC.hash, 'Déplacer vers un numéro de page précis'], ['right', IC.right, 'Déplacer d\'une position vers la droite'], ['|'],
     ['edit', IC.pencil, 'Ouvrir l\'éditeur de page'], ['del', IC.trash, 'Retirer cette page']].forEach(spec => {
      if (spec[0] === '|') { const s = document.createElement('span'); s.className = 'sep'; tools.appendChild(s); return; }
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.act = spec[0]; b.title = spec[2];
      b.setAttribute('aria-label', spec[2]);
      if (spec[0] === 'del') b.className = 'danger';
      b.appendChild(icon(spec[1]));
      tools.appendChild(b);
    });
    thumb.appendChild(tools);

    const foot = document.createElement('div'); foot.className = 'tile-foot';
    const pos = document.createElement('input');
    pos.className = 'pos'; pos.type = 'text'; pos.inputMode = 'numeric'; pos.autocomplete = 'off';
    pos.title = 'Position de la page : saisissez un numéro puis Entrée pour la déplacer';
    pos.setAttribute('aria-label', 'Position de la page');
    const lab = document.createElement('span'); lab.className = 'src-label';
    const sw = document.createElement('i'); sw.className = 'swatch';
    const txt = document.createElement('span');
    lab.append(sw, txt);
    foot.append(pos, lab);
    li.append(thumb, foot);

    pos.addEventListener('mousedown', () => { li.draggable = false; });
    pos.addEventListener('focus', () => { li.draggable = false; pos.dataset.orig = pos.value; requestAnimationFrame(() => pos.select()); });
    pos.addEventListener('blur', () => { li.draggable = true; pos.value = String(pageIndex(+li.dataset.id) + 1); });
    pos.addEventListener('click', e => e.stopPropagation());
    pos.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); commitPos(li, pos); }
      else if (e.key === 'Escape') { e.preventDefault(); pos.value = pos.dataset.orig || pos.value; pos.blur(); li.focus(); }
    });
    pos.addEventListener('change', () => commitPos(li, pos));
    if (thumbObserver) thumbObserver.observe(li);
    return li;
  }

  function commitPos(li, pos) {
    const id = +li.dataset.id;
    const n = clampInt(pos.value, 1, state.pages.length);
    if (n == null) { pos.value = String(pageIndex(id) + 1); return; }
    const moved = moveToPosition([id], n);
    pos.blur();
    const t = tiles.get(id);
    if (t) { t.focus(); t.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    if (moved) setLast('Page déplacée en position ' + (pageIndex(id) + 1));
  }

  function paintTile(li, p) {
    const g = pageGeom(p);
    const sheet = li.querySelector('.sheet');
    const rot = li.querySelector('.rot');
    const img = li.querySelector('img');
    const ph = li.querySelector('.placeholder');
    const portrait = g.Hd >= g.Wd;
    sheet.style.aspectRatio = g.Wd.toFixed(2) + ' / ' + g.Hd.toFixed(2);
    sheet.style.width = portrait ? 'auto' : '100%';
    sheet.style.height = portrait ? '100%' : 'auto';
    rot.style.width = (g.Wb / g.Wd * 100).toFixed(4) + '%';
    rot.style.height = (g.Hb / g.Hd * 100).toFixed(4) + '%';
    rot.style.transform = 'translate(-50%, -50%) rotate(' + g.rot + 'deg)';

    const th = thumbs.get(pkey(p));
    li.classList.toggle('thumb-error', !!(th && th.status === 'error'));
    if (th && th.status === 'done') {
      if (img.getAttribute('src') !== th.url) img.src = th.url;
      sheet.style.visibility = 'visible';
      if (ph) ph.hidden = true;
    } else {
      sheet.style.visibility = th && th.status === 'error' ? 'hidden' : 'hidden';
      if (ph) {
        ph.hidden = false;
        if (th && th.status === 'error') { ph.replaceChildren(); ph.textContent = 'Aperçu indisponible'; }
      }
    }
    const old = sheet.querySelector('.ann-layer');
    if (old) old.remove();
    if (p.ann.length) sheet.appendChild(annSvg(p, g, false));
  }

  function updateTile(li, p, pos) {
    const src = srcById(p.src);
    const posInput = li.querySelector('.pos');
    if (document.activeElement !== posInput) posInput.value = pos + 1;
    const lab = li.querySelector('.src-label');
    lab.querySelector('.swatch').style.setProperty('--h', src ? src.hue : 0);
    lab.querySelector('span').textContent = (src ? (src.isSample ? 'Exemple' : baseName(src.name)) : '?') + ' · p. ' + (p.index + 1);
    lab.title = (src ? src.name : '') + ' — page ' + (p.index + 1);

    const flags = li.querySelector('.flags');
    flags.replaceChildren();
    if (p.rot) { const f = document.createElement('span'); f.className = 'flag'; f.textContent = p.rot + '°'; flags.appendChild(f); }
    if (p.ann.length) {
      const f = document.createElement('span'); f.className = 'flag ann';
      const retouches = p.ann.filter(a => a.type === 'edit').length;
      f.textContent = retouches === p.ann.length ? retouches + (retouches > 1 ? ' retouches' : ' retouche') : p.ann.length + ' annot.';
      flags.appendChild(f);
    }

    const sel = state.selected.has(p.id);
    li.classList.toggle('selected', sel);
    li.setAttribute('aria-selected', sel ? 'true' : 'false');
    li.setAttribute('aria-label', 'Page ' + (pos + 1) + (src ? ' · ' + src.name + ' page ' + (p.index + 1) : '') + (p.rot ? ' · pivotée de ' + p.rot + ' degrés' : ''));
    li.querySelector('[data-act="left"]').disabled = pos === 0;
    li.querySelector('[data-act="right"]').disabled = pos === state.pages.length - 1;
    paintTile(li, p);
  }

  // =====================================================================
  //  Sidebar + chips + status
  // =====================================================================
  function renderSources() {
    el.docList.replaceChildren();
    el.docsEmpty.hidden = state.sources.length > 0;
    el.docCount.textContent = state.sources.length;
    state.sources.forEach(src => {
      const li = document.createElement('li');
      const row = document.createElement('div');
      row.className = 'doc';
      row.setAttribute('role', 'button');
      row.tabIndex = 0;
      row.style.setProperty('--h', src.hue);
      row.title = 'Sélectionner toutes les pages de ' + src.name;
      const g = document.createElement('div');
      const name = document.createElement('div'); name.className = 'doc-name'; name.textContent = src.name;
      if (src.isSample) { const b = document.createElement('span'); b.className = 'badge'; b.textContent = 'Exemple'; name.appendChild(b); }
      if (src.genere) { const b = document.createElement('span'); b.className = 'badge'; b.textContent = 'Généré'; name.appendChild(b); }
      if (src.encrypted) { const b = document.createElement('span'); b.className = 'badge lock'; b.textContent = 'Protégé'; name.appendChild(b); }
      if (src.formFields && src.formFields.length) { const b = document.createElement('span'); b.className = 'badge form'; b.textContent = 'Formulaire'; name.appendChild(b); }
      const meta = document.createElement('div'); meta.className = 'doc-meta';
      const kept = state.pages.filter(p => p.src === src.id).length;
      meta.textContent = (kept === src.count ? plural(src.count, 'page', 'pages') : kept + ' / ' + plural(src.count, 'page', 'pages')) + ' · ' + fmtSize(src.bytes.byteLength);
      g.append(name, meta);
      const rm = document.createElement('button');
      rm.type = 'button'; rm.className = 'doc-rm';
      rm.title = 'Retirer ' + src.name + ' et toutes ses pages';
      rm.setAttribute('aria-label', rm.title);
      rm.appendChild(icon(IC.x, { sw: 1.7 }));
      rm.addEventListener('click', e => { e.stopPropagation(); removeSource(src.id); });
      row.append(g, rm);
      row.addEventListener('click', () => selectSource(src.id));
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectSource(src.id); } });
      li.appendChild(row);
      el.docList.appendChild(li);
    });
  }

  function renderChips() {
    const items = [];
    if (state.watermark) items.push({ label: 'Filigrane', value: state.watermark.text, clear: () => { snapshot(); state.watermark = null; render(); } });
    if (state.stamp) items.push({ label: 'En-tête / pied de page', value: 'actif', clear: () => { snapshot(); state.stamp = null; render(); } });
    if (state.security) items.push({ label: 'Mot de passe', value: state.security.userPassword ? 'à l\'ouverture' : 'autorisations', clear: () => { snapshot(); state.security = null; render(); } });
    if (state.flatten) items.push({ label: 'Aplatir', value: 'à l\'export', clear: () => { snapshot(); state.flatten = false; render(); } });
    if (state.figerAnnotations) items.push({ label: 'Annotations', value: 'figées', clear: () => { snapshot(); state.figerAnnotations = false; render(); } });
    const retraits = state.pages.reduce((n, p) => n + ((p.retraits || []).length), 0);
    if (retraits) items.push({ label: 'Commentaires retirés', value: String(retraits), clear: () => { snapshot(); state.pages.forEach(p => { p.retraits = []; peintes.delete(p.id); }); render(); } });
    const m = state.meta;
    if (m.title || m.author || m.subject || m.keywords) items.push({ label: 'Propriétés', value: m.title || m.author || 'définies', clear: () => { snapshot(); state.meta = { title: '', author: '', subject: '', keywords: '' }; render(); } });
    const anyForm = state.sources.some(s => s.formValues && Object.keys(s.formValues).length);
    if (anyForm) items.push({ label: 'Formulaire', value: 'rempli', clear: () => { snapshot(); state.sources.forEach(s => { s.formValues = null; }); render(); } });

    el.chips.replaceChildren();
    el.chips.hidden = items.length === 0;
    items.forEach(it => {
      const c = document.createElement('span'); c.className = 'chip';
      const b = document.createElement('b'); b.textContent = it.label;
      const v = document.createElement('span'); v.textContent = it.value ? (it.value.length > 24 ? it.value.slice(0, 24) + '…' : it.value) : '';
      const x = document.createElement('button'); x.type = 'button'; x.title = 'Retirer ' + it.label;
      x.setAttribute('aria-label', x.title);
      x.appendChild(icon(IC.x, { sw: 2 }));
      x.addEventListener('click', it.clear);
      c.append(b, v, x);
      el.chips.appendChild(c);
    });
  }

  function updateSelectionUI() {
    state.pages.forEach(p => {
      const t = tiles.get(p.id);
      if (!t) return;
      const sel = state.selected.has(p.id);
      t.classList.toggle('selected', sel);
      t.setAttribute('aria-selected', sel ? 'true' : 'false');
    });
    const n = state.selected.size;
    el.selbar.hidden = n === 0;
    if (n) {
      const first = state.pages.findIndex(p => state.selected.has(p.id));
      el.selCount.replaceChildren();
      const b = document.createElement('b'); b.textContent = n;
      el.selCount.append(b, document.createTextNode(' ' + (n > 1 ? 'pages' : 'page')));
      if (document.activeElement !== el.moveto) el.moveto.value = first + 1;
    }
    el.selectAllLabel.textContent = n && n === state.pages.length ? 'Tout désélectionner' : 'Tout sélectionner';
    $$('.doc', el.docList).forEach((row, i) => {
      const src = state.sources[i];
      if (!src) return;
      const ids = state.pages.filter(p => p.src === src.id);
      row.classList.toggle('active', ids.length > 0 && ids.every(p => state.selected.has(p.id)));
    });
    syncButtons();
  }

  function syncButtons() {
    const has = state.pages.length > 0;
    el.btnUndo.disabled = !state.history.length;
    el.btnRedo.disabled = !state.redo.length;
    el.btnExport.disabled = !has || state.busy;
    el.btnPrint.disabled = !has || state.busy;
    el.btnSelectAll.disabled = !has;
    el.btnSearch.disabled = !has;
    $$('[data-tool]').forEach(b => {
      const need = b.dataset.need;
      b.disabled = state.busy || (need === 'pages' && !has) || (need === 'sel' && !state.selected.size) || (need === 'zip' && (!has || !FEAT.zip));
    });
  }

  function render() {
    if (state.silencieux) return;
    const alive = new Set(state.pages.map(p => p.id));
    Array.from(state.selected).forEach(id => { if (!alive.has(id)) state.selected.delete(id); });
    Array.from(tiles.keys()).forEach(id => { if (!alive.has(id)) { const t = tiles.get(id); if (thumbObserver && t) thumbObserver.unobserve(t); tiles.delete(id); } });

    const frag = document.createDocumentFragment();
    state.pages.forEach((p, i) => {
      let t = tiles.get(p.id);
      if (!t) {
        t = makeTile(p);
        tiles.set(p.id, t);
        if (i < 28) {
          // les feuilles se posent l'une après l'autre, comme sur une table
          const tuile = t;
          tuile.classList.add('arrive');
          tuile.style.animationDelay = Math.min(i * 20, 380) + 'ms';
          tuile.addEventListener('animationend', () => {
            tuile.classList.remove('arrive');
            tuile.style.animationDelay = '';
          }, { once: true });
        }
      }
      updateTile(t, p, i);
      frag.appendChild(t);
    });
    el.pages.replaceChildren(frag);

    const has = state.pages.length > 0;
    el.dropzone.hidden = has;
    el.pages.hidden = !has || state.vue !== 'organiser';
    el.lecture.hidden = !has || state.vue !== 'lecture';
    if (has && state.vue === 'lecture') lectureRendu();
    majVue();

    const total = state.sources.reduce((a, s) => a + s.bytes.byteLength, 0);
    el.summary.replaceChildren();
    if (has) {
      el.summary.append(document.createTextNode(plural(state.pages.length, 'page', 'pages') + ' · ' + plural(state.sources.length, 'document', 'documents') + ' · ' + fmtSize(total)));
      if (state.touched) { const m = document.createElement('span'); m.className = 'mod'; m.textContent = ' · modifié'; el.summary.appendChild(m); }
      const chemin = cheminDocument();
      el.summary.title = chemin ? 'Fichier : ' + chemin : '';
    } else { el.summary.textContent = 'Aucune page'; el.summary.title = ''; }
    if (!has) renderRecents();
    if (has && modifieQuelquePart()) planifierRecuperation();

    if (!state.filenameDirty) el.filename.value = defaultBase();
    renderSources();
    purgerSignets();
    renderSignets();
    renderChips();
    renderOnglets();
    updateSelectionUI();
    if (state.dossier) lancerSommaire();
  }

  function defaultBase() {
    if (state.chemin) return baseName(nomDe(state.chemin));
    const real = state.sources.filter(s => !s.isSample);
    if (real.length === 1) return baseName(real[0].name) + '-modifié';
    if (real.length > 1) return 'fusion';
    if (state.sources.length) return 'exemple';
    return 'document';
  }

  // =====================================================================
  //  Mutations
  // =====================================================================
  const targetsFor = id => state.selected.has(id) ? selectedInOrder() : [id];

  function rotatePages(ids, delta) {
    if (!ids.length) return;
    snapshot();
    const set = new Set(ids);
    state.pages.forEach(p => {
      if (!set.has(p.id)) return;
      if (p.ann.length) { const g = pageGeom(p); p.ann = rotateAnn(p.ann, delta, g.Wd, g.Hd); }
      p.rot = (((p.rot + delta) % 360) + 360) % 360;
    });
    state.touched = true;
    render();
    setLast(plural(ids.length, 'page pivotée', 'pages pivotées') + (delta > 0 ? ' à droite' : ' à gauche'));
  }

  function deletePages(ids) {
    if (!ids.length) return;
    snapshot();
    const set = new Set(ids);
    state.pages = state.pages.filter(p => !set.has(p.id));
    ids.forEach(id => state.selected.delete(id));
    state.touched = true;
    render();
    setLast(plural(ids.length, 'page retirée', 'pages retirées') + ' · Ctrl+Z pour annuler');
  }

  function duplicatePages(ids) {
    if (!ids.length) return;
    snapshot();
    const set = new Set(ids);
    const next = [], created = [];
    state.pages.forEach(p => {
      next.push(p);
      if (set.has(p.id)) {
        const c = { id: ++uid, src: p.src, index: p.index, rot: p.rot, ann: p.ann.map(a => Object.assign({}, a, { id: ++uid })), piece: p.piece || null, ocr: p.ocr || null, pieceN: p.pieceN || 0, retraits: (p.retraits || []).slice() };
        next.push(c); created.push(c.id);
      }
    });
    state.pages = next;
    state.selected = new Set(created);
    state.touched = true;
    render();
    setLast(plural(ids.length, 'page dupliquée', 'pages dupliquées'));
  }

  function applyOrder(next, n, label) {
    if (next.length === state.pages.length && next.every((p, i) => p === state.pages[i])) return false;
    snapshot();
    state.pages = next;
    state.touched = true;
    render();
    if (label) setLast(label);
    return true;
  }
  function movePages(ids, toIndex) {
    const set = new Set(ids);
    const moving = state.pages.filter(p => set.has(p.id));
    if (!moving.length) return false;
    const before = state.pages.slice(0, toIndex).filter(p => !set.has(p.id));
    const after = state.pages.slice(toIndex).filter(p => !set.has(p.id));
    return applyOrder(before.concat(moving, after), moving.length, moving.length > 1 ? moving.length + ' pages déplacées' : 'Page déplacée');
  }
  function moveToPosition(ids, position) {
    const set = new Set(ids);
    const moving = state.pages.filter(p => set.has(p.id));
    if (!moving.length) return false;
    const rest = state.pages.filter(p => !set.has(p.id));
    const t = Math.min(rest.length, Math.max(0, position - 1));
    return applyOrder(rest.slice(0, t).concat(moving, rest.slice(t)), moving.length, null);
  }
  function nudge(id, dir) {
    const i = pageIndex(id), j = i + dir;
    if (i < 0 || j < 0 || j >= state.pages.length) return;
    movePages([id], dir > 0 ? j + 1 : j);
    const t = tiles.get(id);
    if (t) t.focus();
  }
  function removeSource(id) {
    const src = srcById(id);
    if (!src) return;
    snapshot();
    state.sources = state.sources.filter(s => s.id !== id);
    state.pages = state.pages.filter(p => p.src !== id);
    if (!src.isSample) state.touched = true;
    render();
    setLast(src.name + ' retiré · Ctrl+Z pour annuler');
  }
  function reverseOrder() {
    if (state.pages.length < 2) return;
    snapshot();
    state.pages.reverse();
    state.touched = true;
    render();
    setLast('Ordre des pages inversé');
  }
  function selectAll() { state.pages.forEach(p => state.selected.add(p.id)); updateSelectionUI(); }
  function clearSelection() { state.selected.clear(); updateSelectionUI(); }
  function selectSource(id) {
    const ids = state.pages.filter(p => p.src === id).map(p => p.id);
    const all = ids.length && ids.every(x => state.selected.has(x));
    if (all) ids.forEach(x => state.selected.delete(x));
    else { state.selected.clear(); ids.forEach(x => state.selected.add(x)); }
    updateSelectionUI();
  }

