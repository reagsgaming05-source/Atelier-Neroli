  // =====================================================================
  //  Page geometry  (display space <-> PDF user space)
  // =====================================================================
  const DEFAULT_DIM = { w: 595.28, h: 841.89, baseRot: 0 };
  function pageGeom(p) {
    const d = dims.get(pkey(p)) || DEFAULT_DIM;
    const base = ((d.baseRot % 360) + 360) % 360;
    const Wb = base % 180 ? d.h : d.w;          // size as pdf.js renders it (base rotation applied)
    const Hb = base % 180 ? d.w : d.h;
    const rot = ((p.rot % 360) + 360) % 360;    // extra rotation asked by the user
    const Wd = rot % 180 ? Hb : Wb;             // size as displayed
    const Hd = rot % 180 ? Wb : Hb;
    return { w: d.w, h: d.h, base, rot, total: (base + rot) % 360, Wb, Hb, Wd, Hd };
  }
  // Display point (dx, dy from top-left, in points) -> PDF user point.
  function toUser(dx, dy, g) {
    const { w: W, h: H, total } = g;
    if (total === 90) return { x: dy, y: dx };
    if (total === 180) return { x: W - dx, y: dy };
    if (total === 270) return { x: W - dy, y: H - dx };
    return { x: dx, y: H - dy };
  }
  function rectToUser(a, g) {
    const p1 = toUser(a.x, a.y, g), p2 = toUser(a.x + a.w, a.y + a.h, g);
    return { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y), w: Math.abs(p2.x - p1.x), h: Math.abs(p2.y - p1.y) };
  }
  // Re-map annotations when the page rotation changes by +/-90.
  function rotateAnn(ann, dir, Wd, Hd) {
    const mapPt = (x, y) => dir > 0 ? { x: Hd - y, y: x } : { x: y, y: Wd - x };
    return ann.map(a => {
      const b = Object.assign({}, a);
      if (a.type === 'draw') {
        b.pts = a.pts.map(pt => { const m = mapPt(pt[0], pt[1]); return [m.x, m.y]; });
        return b;
      }
      const c1 = mapPt(a.x, a.y), c2 = mapPt(a.x + a.w, a.y + a.h);
      b.x = Math.min(c1.x, c2.x); b.y = Math.min(c1.y, c2.y);
      b.w = Math.abs(c2.x - c1.x); b.h = Math.abs(c2.y - c1.y);
      return b;
    });
  }

  // =====================================================================
  //  History
  // =====================================================================
  function capture() {
    return {
      pages: state.pages.map(p => ({ id: p.id, src: p.src, index: p.index, rot: p.rot, ann: p.ann.map(a => Object.assign({}, a)), piece: p.piece || null, ocr: p.ocr || null, pieceN: p.pieceN || 0, intercalaire: p.intercalaire || 0, sommaire: p.sommaire || 0, retraits: (p.retraits || []).slice() })),
      sources: state.sources.slice(),
      formValues: state.sources.map(s => Object.assign({}, s.formValues || {})),
      meta: Object.assign({}, state.meta),
      watermark: state.watermark && Object.assign({}, state.watermark),
      stamp: state.stamp && Object.assign({}, state.stamp),
      security: state.security && JSON.parse(JSON.stringify(state.security)),
      flatten: state.flatten,
      touched: state.touched,
      signets: JSON.parse(JSON.stringify(state.signets || [])),
      figerAnnotations: state.figerAnnotations,
      dossier: state.dossier ? JSON.parse(JSON.stringify(state.dossier)) : null,
    };
  }
  function restore(h) {
    state.pages = h.pages;
    state.sources = h.sources;
    h.sources.forEach((s, i) => { s.formValues = h.formValues[i]; });
    state.meta = h.meta;
    state.watermark = h.watermark;
    state.stamp = h.stamp;
    state.security = h.security;
    state.flatten = h.flatten;
    state.touched = h.touched;
    state.signets = h.signets || [];
    state.figerAnnotations = !!h.figerAnnotations;
    state.dossier = h.dossier || null;
    // Le sommaire se revérifie : les pages viennent de changer d'un coup.
    if (state.dossier) state.dossier.signature = '';
    state.selected.clear();
    // Le texte reconnu par l'OCR suit les pages : repris avec elles, ou
    // oublié si l'annulation le retire.
    const avecOcr = new Map();
    state.pages.forEach(p => { if (p.ocr && p.ocr.texte != null) avecOcr.set(pkey(p), p.ocr.texte); });
    Array.from(ocrCache).forEach(k => { if (!avecOcr.has(k)) { textCache.delete(k); ocrCache.delete(k); } });
    avecOcr.forEach((t, k) => { textCache.set(k, t); ocrCache.add(k); });
  }
  function snapshot() {
    state.history.push(capture());
    if (state.history.length > 60) state.history.shift();
    state.redo = [];
    syncButtons();
  }
  function undo() {
    const h = state.history.pop();
    if (!h) return;
    state.redo.push(capture());
    restore(h);
    render(); setLast('Action annulée');
  }
  function redoAction() {
    const h = state.redo.pop();
    if (!h) return;
    state.history.push(capture());
    restore(h);
    render(); setLast('Action rétablie');
  }

