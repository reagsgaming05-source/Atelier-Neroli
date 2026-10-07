  // =====================================================================
  //  Les pages : opérations sur le document
  //  -------------------------------------------------------------------
  //  Pivoter, retirer, dupliquer, déplacer, trier, sélectionner : ce que
  //  l'on fait aux pages du document, indépendamment de la façon de les
  //  montrer (vignettes en 40-tuiles.js, feuilles en 35-lecture.js). Les
  //  onglets et les menus s'en servent ; la vue, elle, est prévenue par
  //  vue.render().
  // =====================================================================
  function defaultBase() {
    if (state.chemin) return baseName(nomDe(state.chemin));
    const real = state.sources.filter(s => !s.isSample);
    if (real.length === 1) return baseName(real[0].name) + tr('-modifié');
    if (real.length > 1) return tr('fusion');
    if (state.sources.length) return tr('exemple');
    return tr('document');
  }

  // =====================================================================
  //  Mutations
  // =====================================================================
  const targetsFor = id => state.selected.has(id) ? selectedInOrder() : [id];

  // Rejouer sur les pages sélectionnées au moment de la répétition, pas sur celles de la première fois.
  function surLaSelection(faire) {
    const ids = selectedInOrder();
    if (!ids.length) { toast('Sélectionnez d\'abord des pages : l\'opération se répète sur la sélection.', 'warn'); return false; }
    faire(ids);
  }

  function rotatePages(ids, delta) {
    if (!ids.length) return;
    retenirOperation(tr(delta > 0 ? 'Pivoter à droite' : 'Pivoter à gauche'), () => surLaSelection(i => rotatePages(i, delta)));
    snapshot(delta > 0 ? 'Pivoter à droite' : 'Pivoter à gauche');
    const set = new Set(ids);
    state.pages.forEach(p => {
      if (!set.has(p.id)) return;
      if (p.ann.length) { const g = pageGeom(p); p.ann = rotateAnn(p.ann, delta, g.Wd, g.Hd); }
      p.rot = (((p.rot + delta) % 360) + 360) % 360;
    });
    state.touched = true;
    vue.render();
    setLast(plural(ids.length, 'page pivotée', 'pages pivotées') + (delta > 0 ? ' à droite' : ' à gauche'));
  }

  function deletePages(ids) {
    if (!ids.length) return;
    retenirOperation(tr('Supprimer les pages sélectionnées'), () => surLaSelection(deletePages));
    snapshot('Supprimer les pages sélectionnées');
    const set = new Set(ids);
    state.pages = state.pages.filter(p => !set.has(p.id));
    ids.forEach(id => state.selected.delete(id));
    state.touched = true;
    vue.render();
    setLast(plural(ids.length, 'page supprimée', 'pages supprimées') + ' · Ctrl+Z pour annuler');
  }

  function duplicatePages(ids) {
    if (!ids.length) return;
    retenirOperation(tr('Dupliquer les pages'), () => surLaSelection(duplicatePages));
    snapshot('Dupliquer les pages');
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
    vue.render();
    setLast(plural(ids.length, 'page dupliquée', 'pages dupliquées'));
  }

  function applyOrder(next, n, label) {
    if (next.length === state.pages.length && next.every((p, i) => p === state.pages[i])) return false;
    snapshot('Déplacer des pages');
    state.pages = next;
    state.touched = true;
    vue.render();
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
    snapshot('Retirer un document');
    state.sources = state.sources.filter(s => s.id !== id);
    state.pages = state.pages.filter(p => p.src !== id);
    if (!src.isSample) state.touched = true;
    vue.render();
    setLast(src.name + ' retiré · Ctrl+Z pour annuler');
  }
  function reverseOrder() {
    if (state.pages.length < 2) return;
    snapshot('Inverser l\'ordre des pages');
    state.pages.reverse();
    state.touched = true;
    vue.render();
    setLast('Ordre des pages inversé');
  }
  function selectAll() { state.pages.forEach(p => state.selected.add(p.id)); vue.updateSelectionUI(); }
  function clearSelection() { state.selected.clear(); vue.updateSelectionUI(); }
  function selectSource(id) {
    const ids = state.pages.filter(p => p.src === id).map(p => p.id);
    const all = ids.length && ids.every(x => state.selected.has(x));
    if (all) ids.forEach(x => state.selected.delete(x));
    else { state.selected.clear(); ids.forEach(x => state.selected.add(x)); }
    vue.updateSelectionUI();
  }
