  // =====================================================================
  //  Tiles
  // =====================================================================
  function makeTile(p) {
    const li = document.createElement('li');
    li.className = 'tile';
    li.dataset.id = p.id;
    li.draggable = true;
    // Un seul arrêt de tabulation pour toute la grille (voir majTabulationTuiles) : Tab la traverse d'un coup, les flèches
    // vont de page en page.
    li.tabIndex = -1;
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
      b.tabIndex = -1; // à la souris ; au clavier, chaque geste a sa touche (Entrée, R, Suppr, Alt+flèches)
      b.setAttribute('aria-label', spec[2]);
      if (spec[0] === 'del') b.className = 'danger';
      b.appendChild(icon(spec[1]));
      tools.appendChild(b);
    });
    thumb.appendChild(tools);

    const foot = document.createElement('div'); foot.className = 'tile-foot';
    const pos = document.createElement('input');
    pos.className = 'pos'; pos.type = 'text'; pos.inputMode = 'numeric'; pos.autocomplete = 'off';
    pos.tabIndex = -1; // on y arrive en tapant un chiffre, ou la touche P, depuis la page
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
      row.style.setProperty('--h', src.hue);
      // La ligne n'est pas un bouton (elle en contient un, pour retirer le document) : son texte l'est, et le retrait
      // est son voisin. Un bouton qui en avalait un autre se lisait « seance.pdf 1 page Retirer seance.pdf… ».
      const g = document.createElement('button');
      g.type = 'button'; g.className = 'doc-main';
      g.title = 'Sélectionner toutes les pages de ' + src.name;
      const name = document.createElement('div'); name.className = 'doc-name'; name.setAttribute('translate', 'no'); name.textContent = src.name;
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
      g.addEventListener('click', () => selectSource(src.id));
      // à la souris, toute la ligne se prend, pas seulement son texte
      row.addEventListener('click', e => { if (!e.target.closest('button')) selectSource(src.id); });
      li.appendChild(row);
      el.docList.appendChild(li);
    });
  }

  function renderChips() {
    const items = [];
    if (state.watermark) items.push({ label: 'Filigrane', value: state.watermark.text, clear: () => { snapshot(); state.watermark = null; vue.render(); } });
    if (state.stamp) items.push({ label: 'En-tête / pied de page', value: 'actif', clear: () => { snapshot(); state.stamp = null; vue.render(); } });
    if (state.security) items.push({ label: 'Mot de passe', value: state.security.userPassword ? 'à l\'ouverture' : 'autorisations', clear: () => { snapshot(); state.security = null; vue.render(); } });
    if (state.flatten) items.push({ label: 'Aplatir', value: 'à l\'export', clear: () => { snapshot(); state.flatten = false; vue.render(); } });
    if (state.figerAnnotations) items.push({ label: 'Annotations', value: 'figées', clear: () => { snapshot(); state.figerAnnotations = false; vue.render(); } });
    const retraits = state.pages.reduce((n, p) => n + ((p.retraits || []).length), 0);
    if (retraits) items.push({ label: 'Commentaires retirés', value: String(retraits), clear: () => { snapshot(); state.pages.forEach(p => { p.retraits = []; peintes.delete(p.id); }); vue.render(); } });
    const m = state.meta;
    if (m.title || m.author || m.subject || m.keywords) items.push({ label: 'Propriétés', value: m.title || m.author || 'définies', clear: () => { snapshot(); state.meta = { title: '', author: '', subject: '', keywords: '', balise: !!state.meta.balise, langue: state.meta.langue || 'fr' }; vue.render(); } });
    if (m.balise) items.push({ label: 'Balisage', value: 'PDF balisé (' + (m.langue || 'fr') + ')', clear: () => { snapshot(); state.meta = Object.assign({}, state.meta, { balise: false }); vue.render(); } });
    const anyForm = state.sources.some(s => s.formValues && Object.keys(s.formValues).length);
    if (anyForm) items.push({ label: 'Formulaire', value: 'rempli', clear: () => { snapshot(); state.sources.forEach(s => { s.formValues = null; }); vue.render(); } });

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
    // En vue Lire aussi, ce qui est sélectionné se voit : un liseré sur la feuille. Sans cela, la barre de sélection
    // (Retirer, Pivoter…) surgissait pour des pages que rien n'indiquait.
    feuilles.forEach((f, id) => f.classList.toggle('selected', state.selected.has(id)));
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
    vue.syncButtons();
  }

  function syncButtons() {
    const has = state.pages.length > 0;
    el.btnUndo.disabled = !state.history.length;
    el.btnRedo.disabled = !state.redo.length;
    el.btnExport.disabled = !has || state.busy;
    el.btnPrint.disabled = !has || state.busy;
    el.btnSelectAll.disabled = !has;
    el.btnSearch.disabled = !has;
    // Le champ du nom est juste à gauche d'« Enregistrer » : on croit que le
    // bouton écrit là. Dans l'application, il réécrit le fichier ouvert ; le
    // champ sert à « Enregistrer sous… » et aux exports. L'infobulle le dit,
    // et nomme le fichier qui sera réellement remplacé.
    if (state.bureau) {
      const vise = typeof cheminDocument === 'function' ? cheminDocument() : '';
      el.btnExport.title = vue.infobulle(vise ? 'Enregistrer « ' + nomDe(vise) + ' »' : 'Enregistrer', 'enregistrer')
        + ' · ' + vue.infobulle('Enregistrer sous…', 'exporter');
      const champ = el.filename && el.filename.closest('.filename');
      if (champ) champ.title = 'Nom proposé pour « Enregistrer sous… » et les exports. « Enregistrer » réécrit le fichier ouvert.';
    }
    $$('[data-tool]').forEach(b => {
      const need = b.dataset.need;
      b.disabled = state.busy || (need === 'pages' && !has) || (need === 'sel' && !state.selected.size) || (need === 'zip' && (!has || !FEAT.zip));
    });
  }

  // Le modèle d'une liste à choix : un seul élément est dans l'ordre de tabulation (le dernier qui a eu le focus, ou la
  // première page), les autres y entrent aux flèches. Sans cela, huit pages et leurs sept boutons font soixante-quatre
  // arrêts de Tab avant de sortir de la grille.
  let tuileTabulee = null;
  function majTabulationTuiles(id) {
    if (id != null) tuileTabulee = id;
    const premier = state.pages.length ? state.pages[0].id : null;
    const cible = tuileTabulee != null && tiles.has(tuileTabulee) ? tuileTabulee : premier;
    tiles.forEach((t, k) => { t.tabIndex = k === cible ? 0 : -1; });
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
    majTabulationTuiles();

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
    vue.updateSelectionUI();
    if (state.dossier) lancerSommaire();
  }
  vue.render = render;
  vue.syncButtons = syncButtons;
  vue.updateSelectionUI = updateSelectionUI;
