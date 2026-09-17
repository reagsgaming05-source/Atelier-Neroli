  // =====================================================================
  //  Lecture : le document en continu
  //  -------------------------------------------------------------------
  //  À l'ouverture, on tombe sur le document lui-même, page après page,
  //  comme dans une visionneuse. La table de montage — pour déplacer ou
  //  retirer des pages — est un second mode, à un clic.
  // =====================================================================
  const feuilles = new Map();       // id de page -> élément
  const peintes = new Map();        // id de page -> clé du rendu déjà fait
  const enCours = new Map();        // id de page -> rendu pdf.js en train de peindre
  let lectureObs = null;
  let lectureZ = 1;                 // facteur réellement appliqué

  function lectureEchelle() {
    const g0 = state.pages.length ? pageGeom(state.pages[0]) : null;
    if (!g0) return 1;
    const total = Math.max(120, (el.canvas.clientWidth || 800) - 64);
    // Deux pages côte à côte se partagent la largeur, gouttière déduite.
    const dispo = lectureDeux() ? (total - 18) / 2 : total;
    const haut = Math.max(160, (el.canvas.clientHeight || 600) - 64);
    let large = 0, grand = 0;
    state.pages.forEach(p => { const g = pageGeom(p); large = Math.max(large, g.Wd); grand = Math.max(grand, g.Hd); });
    const v = state.zoomLecture;
    if (v === 'largeur') return Math.max(0.1, Math.min(4, dispo / (large || g0.Wd)));
    if (v === 'page') return Math.max(0.1, Math.min(4, Math.min(dispo / (large || g0.Wd), haut / (grand || g0.Hd))));
    return Math.max(0.1, Math.min(4, parseFloat(v) || 1));
  }

  const lectureDeux = () => state.dispo === 'deux' && state.pages.length > 1;

  function lectureCle(p) {
    return [pkey(p), p.rot, Math.round(lectureZ * 100), p.ann.length, p.piece || '', p.ocr ? 'ocr' + (p.ocr.mots ? p.ocr.mots.length : 0) : '', (p.retraits || []).join('+'),
      p.ann.map(a => a.id + ':' + Math.round((a.x || 0) * 10) + ':' + (a.text || '').length).join()].join('|');
  }

  function lectureFeuille(p) {
    let f = feuilles.get(p.id);
    if (f) return f;
    f = document.createElement('div');
    f.className = 'feuille-vue';
    f.dataset.id = p.id;
    const cv = document.createElement('canvas');
    const attente = document.createElement('div'); attente.className = 'attente';
    const sp = document.createElement('span'); sp.className = 'spinner';
    attente.appendChild(sp);
    const num = document.createElement('span'); num.className = 'num';
    const ret = document.createElement('button');
    ret.type = 'button'; ret.className = 'retoucher';
    ret.appendChild(icon(IC.pencil));
    const lbl = document.createElement('span'); lbl.textContent = 'Modifier';
    ret.appendChild(lbl);
    ret.addEventListener('click', e => { e.stopPropagation(); openEditor(+f.dataset.id); });
    f.append(cv, attente, num, ret);
    // Un double-clic sur du texte sélectionne le mot ; sur le reste, il ouvre l'éditeur.
    f.addEventListener('dblclick', () => { const sel = window.getSelection ? String(window.getSelection()) : ''; if (!sel.trim()) openEditor(+f.dataset.id); });
    feuilles.set(p.id, f);
    if (lectureObs) lectureObs.observe(f);
    return f;
  }

  async function lecturePeindre(f, p) {
    const cle = lectureCle(p);
    if (peintes.get(p.id) === cle) return;
    peintes.set(p.id, cle);
    // Une toile ne peut porter qu'un rendu à la fois : si la page change
    // pendant qu'on la peint (second document ajouté, zoom), l'ancien rendu
    // est annulé plutôt que refusé par pdf.js.
    const ancien = enCours.get(p.id);
    if (ancien) { enCours.delete(p.id); ancien.cancel(); }
    const g = pageGeom(p);
    const cv = f.querySelector('canvas');
    // Assez fin pour un écran fin, sans faire exploser la mémoire sur un
    // gros document.
    const net = Math.min(2, window.devicePixelRatio || 1);
    const px = Math.min(net * lectureZ, Math.sqrt(4.2e6 / Math.max(1, g.Wd * g.Hd)));
    try {
      const src = srcById(p.src);
      if (!src || !src.pdfjs) throw new Error('document indisponible');
      const page = await src.pdfjs.getPage(p.index + 1);
      const vp = page.getViewport({ scale: px, rotation: g.total });
      cv.width = Math.max(1, Math.ceil(vp.width));
      cv.height = Math.max(1, Math.ceil(vp.height));
      const cx = cv.getContext('2d', { alpha: false });
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
      const tache = page.render({ canvasContext: cx, viewport: vp });
      enCours.set(p.id, tache);
      try { await tache.promise; }
      finally { if (enCours.get(p.id) === tache) enCours.delete(p.id); }
      try { await effacerRetraits(cx, page, vp, p); } catch (e) { signaler('Commentaires', e); }
      try { await lectureCoucheTexte(f, p, page, g); } catch (e) { signaler('Couche de texte', e); }
      page.cleanup();
      const att = f.querySelector('.attente');
      if (att) att.hidden = true;
    } catch (e) {
      if (e && e.name === 'RenderingCancelledException') return;
      peintes.delete(p.id);
      signaler('Lecture', e);
    }
    const vieux = f.querySelector('.ann-layer');
    if (vieux) vieux.remove();
    if (p.ann.length || p.piece) f.appendChild(annSvg(p, g, false));
  }

  // Le texte de la page, invisible mais sélectionnable par-dessus l'image :
  // on copie une adresse, un montant, comme dans n'importe quelle visionneuse.
  // Sur un scan reconnu, ce sont les mots de l'OCR qui se posent.
  async function lectureCoucheTexte(f, p, page, g) {
    const vieux = f.querySelector('.couche-texte');
    if (vieux) vieux.remove();
    const couche = document.createElement('div');
    couche.className = 'couche-texte';
    couche.style.setProperty('--scale-factor', String(lectureZ));
    const vp = page.getViewport({ scale: lectureZ, rotation: g.total });
    let pose = false;
    try {
      const tc = await page.getTextContent();
      if (tc.items.some(it => it.str && it.str.trim()) && typeof pdfjs.renderTextLayer === 'function') {
        await pdfjs.renderTextLayer({ textContentSource: tc, container: couche, viewport: vp, textDivs: [] }).promise;
        pose = true;
      }
    } catch (e) { signaler('Couche de texte', e); }
    if (!pose && p.ocr && p.ocr.mots && p.ocr.mots.length) {
      const style = { famille: 'Helvetica, Arial, sans-serif', poids: '400', penche: 'normal' };
      p.ocr.mots.forEach(m => {
        const corps = ocrCorps(m);
        const sp = document.createElement('span');
        sp.textContent = m.t;
        sp.style.left = (m.x * lectureZ).toFixed(2) + 'px';
        sp.style.top = ((ocrBase(m) - corps * 0.8) * lectureZ).toFixed(2) + 'px';
        sp.style.fontSize = (corps * lectureZ).toFixed(2) + 'px';
        sp.style.fontFamily = style.famille;
        const nat = mesurerTexte(m.t, corps * lectureZ, style);
        if (nat > 0) sp.style.transform = 'scaleX(' + ((m.w * lectureZ) / nat).toFixed(3) + ')';
        couche.appendChild(sp);
      });
    }
    f.appendChild(couche);
  }

  function lectureRendu() {
    if (!el.lecture) return;
    if (!lectureObs && 'IntersectionObserver' in window) {
      lectureObs = new IntersectionObserver(entrees => {
        entrees.forEach(e => {
          if (!e.isIntersecting) return;
          const p = state.pages.find(x => x.id === +e.target.dataset.id);
          if (p) lecturePeindre(e.target, p);
        });
      }, { root: el.canvas, rootMargin: '600px 0px' });
    }
    lectureZ = lectureEchelle();
    const vivantes = new Set(state.pages.map(p => p.id));
    Array.from(feuilles.keys()).forEach(id => {
      if (vivantes.has(id)) return;
      const f = feuilles.get(id);
      if (lectureObs && f) lectureObs.unobserve(f);
      feuilles.delete(id); peintes.delete(id);
    });
    const frag = document.createDocumentFragment();
    const deux = lectureDeux();
    el.lecture.classList.toggle('deux', deux);
    let rangee = null;
    state.pages.forEach((p, i) => {
      const f = lectureFeuille(p);
      const g = pageGeom(p);
      f.style.width = Math.round(g.Wd * lectureZ) + 'px';
      f.style.height = Math.round(g.Hd * lectureZ) + 'px';
      const src = srcById(p.src);
      f.querySelector('.num').textContent = (i + 1) + ' / ' + state.pages.length
        + (src ? '  \u00b7  ' + baseName(src.name) : '');
      if (peintes.get(p.id) !== lectureCle(p)) {
        const att = f.querySelector('.attente');
        if (att) att.hidden = false;
        peintes.delete(p.id);
      }
      if (!deux) { frag.appendChild(f); return; }
      // Comme un livre ouvert : la couverture seule, puis les pages deux
      // par deux, la paire vers la gauche, l'impaire vers la droite.
      if (i === 0 || i % 2 === 1) { rangee = document.createElement('div'); rangee.className = 'rangee'; frag.appendChild(rangee); }
      rangee.appendChild(f);
    });
    el.lecture.replaceChildren(frag);
    // Les premières pages sans attendre le défilement.
    state.pages.slice(0, 3).forEach(p => { const f = feuilles.get(p.id); if (f) lecturePeindre(f, p); });
    if (recherche.marques) poserMarquesLecture();
    majPageCourante();
  }

  function majPageCourante() {
    if (!el.pageCourante || state.vue !== 'lecture' || !state.pages.length) return;
    const haut = el.canvas.scrollTop + el.canvas.clientHeight * 0.35;
    let n = 1;
    state.pages.forEach((p, i) => {
      const f = feuilles.get(p.id);
      if (f && f.offsetTop <= haut) n = i + 1;
    });
    if (document.activeElement !== el.pageNum) el.pageNum.value = String(n);
    el.pageTotal.textContent = '/ ' + state.pages.length;
  }

  function lectureAller(n) {
    const i = clampInt(n, 1, state.pages.length);
    if (i == null) return;
    const f = feuilles.get(state.pages[i - 1].id);
    if (f) el.canvas.scrollTo({ top: Math.max(0, f.offsetTop - 12), behavior: 'smooth' });
  }

  function changerVue(v) {
    if (state.vue === v) return;
    state.vue = v;
    try { localStorage.setItem('blonay-vue', v); } catch (_) {}
    majVue();
    render();
    if (v === 'lecture') el.canvas.scrollTop = 0;
  }

  function majVue() {
    const lecture = state.vue === 'lecture';
    const legende = $('.shortcuts');
    if (legende) legende.hidden = lecture;
    $$('.vue-mode').forEach(b => b.setAttribute('aria-pressed', b.dataset.vue === state.vue ? 'true' : 'false'));
    const has = state.pages.length > 0;
    el.zoomTuiles.hidden = lecture || !has;
    el.zoomLecture.hidden = !lecture || !has;
    el.pageCourante.hidden = !lecture || !has;
  }

