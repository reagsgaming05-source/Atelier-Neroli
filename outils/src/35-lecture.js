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
    // La mesure de la page fait partie de la clé : au remplacement de l'exemple, les pages d'un vrai document se mesurent après le premier
    // dessin (841,89 pt supposés, 842 réels), et la toile gardait un pixel de trop (715 pour 714 affichés) faute de nouveau dessin.
    const g = pageGeom(p);
    return [pkey(p), p.rot, Math.round(lectureZ * 100), g.Wd.toFixed(2) + 'x' + g.Hd.toFixed(2), p.ann.length, p.piece || '', empreinteDeValeur((srcById(p.src) || {}).formValues), p.ocr ? 'ocr' + (p.ocr.mots ? p.ocr.mots.length : 0) : '', (p.retraits || []).join('+'),
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
    // La légende et le libellé du bouton sont posés par la feuille de style,
    // depuis un attribut, et non écrits dans la page. Un pseudo-élément n'entre
    // jamais dans une sélection : sans cela, un glissé qui dépasse le bas de la
    // page collait « 2 / 12 · décompte » et « Modifier » au milieu du texte
    // copié. Le rendre non sélectionnable ne suffit pas — le navigateur le
    // ramasse quand même dès que la sélection l'enjambe.
    const num = document.createElement('span'); num.className = 'num';
    const ret = document.createElement('button');
    ret.type = 'button'; ret.className = 'retoucher';
    ret.setAttribute('aria-label', 'Ouvrir l\'éditeur de cette page');
    ret.appendChild(icon(IC.pencil));
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
      // Une peinture plus récente a pris la suite pendant l'attente : elle n'avait rien à annuler, le rendu n'était pas commencé. Deux rendus
      // sur la même toile, et pdf.js refuse (« Cannot use the same canvas during multiple render() operations ») — le journal en gardait quatre.
      if (peintes.get(p.id) !== cle) return;
      const vp = page.getViewport({ scale: px, rotation: g.total });
      cv.width = Math.max(1, Math.ceil(vp.width));
      cv.height = Math.max(1, Math.ceil(vp.height));
      const cx = cv.getContext('2d', { alpha: false });
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
      const tache = rendrePage(page, src, { canvasContext: cx, viewport: vp }, '#fff');
      enCours.set(p.id, tache);
      try { await tache.promise; }
      finally { if (enCours.get(p.id) === tache) enCours.delete(p.id); }
      if (peintes.get(p.id) !== cle) return;
      try { await effacerRetraits(cx, page, vp, p); } catch (e) { signaler('Commentaires', e); }
      try { await lectureCoucheTexte(f, p, page, g); } catch (e) { signaler('Couche de texte', e); }
      try { await lectureSaisies(f, p, page, g); } catch (e) { signaler('Saisies du formulaire', e); }
      page.cleanup();
      const att = f.querySelector('.attente');
      if (att) att.hidden = true;
    } catch (e) {
      if (e && e.name === 'RenderingCancelledException') return;
      if (peintes.get(p.id) === cle) peintes.delete(p.id);
      signaler('Lecture', e);
    }
    const vieux = f.querySelector('.ann-layer');
    if (vieux) vieux.remove();
    if (p.ann.length || p.piece) f.appendChild(annSvg(p, g, false));
    if (recherche.marques) poserMarquesFeuille(p);
  }

  // Ce que la personne a saisi dans le formulaire se voit tout de suite sur la page, sans attendre l'export : une couche par-dessus chaque champ
  // rempli (le texte, la coche, le choix). Le fichier d'origine n'est pas touché : la couche se dessine à partir des valeurs en attente.
  async function lectureSaisies(f, p, page, g) {
    const vieux = f.querySelector('.saisies-layer');
    if (vieux) vieux.remove();
    const src = srcById(p.src);
    const vals = src && src.formValues;
    if (!vals || !Object.keys(vals).length) return;
    const vp = page.getViewport({ scale: 1, rotation: g.total });
    const widgets = (await page.getAnnotations()).filter(a => a.subtype === 'Widget' && a.rect && a.fieldName && vals[a.fieldName] !== undefined);
    if (!widgets.length) return;
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + g.Wd.toFixed(2) + ' ' + g.Hd.toFixed(2));
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', 'saisies-layer');
    const el = (nom, at) => { const n = document.createElementNS(SVGNS, nom); Object.keys(at).forEach(k => n.setAttribute(k, at[k])); return n; };
    widgets.forEach(a => {
      const A = pdfjs.Util.applyTransform([a.rect[0], a.rect[1]], vp.transform), B = pdfjs.Util.applyTransform([a.rect[2], a.rect[3]], vp.transform);
      const x = Math.min(A[0], B[0]), y = Math.min(A[1], B[1]), w = Math.abs(A[0] - B[0]), h = Math.abs(A[1] - B[1]);
      const v = vals[a.fieldName];
      svg.appendChild(el('rect', { x, y, width: w, height: h, fill: '#fff' }));
      if (a.checkBox || a.radioButton) {
        const choisi = a.checkBox ? !!v : String(v) === String(a.buttonValue);
        svg.appendChild(a.radioButton
          ? el('ellipse', { cx: x + w / 2, cy: y + h / 2, rx: w / 2 - 0.5, ry: h / 2 - 0.5, fill: 'none', stroke: '#444', 'stroke-width': 0.8 })
          : el('rect', { x: x + 0.4, y: y + 0.4, width: w - 0.8, height: h - 0.8, fill: 'none', stroke: '#444', 'stroke-width': 0.8 }));
        if (choisi) svg.appendChild(a.radioButton
          ? el('ellipse', { cx: x + w / 2, cy: y + h / 2, rx: w / 4, ry: h / 4, fill: '#111' })
          : el('path', { d: 'M' + (x + w * 0.2) + ' ' + (y + h * 0.55) + 'L' + (x + w * 0.42) + ' ' + (y + h * 0.78) + 'L' + (x + w * 0.82) + ' ' + (y + h * 0.22), fill: 'none', stroke: '#111', 'stroke-width': Math.max(1, h / 8), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
        return;
      }
      const texte = Array.isArray(v) ? v.join(', ') : String(v == null ? '' : v);
      if (!texte) return;
      const taille = Math.max(5, Math.min(11, h * 0.68));
      const lignes = a.multiLine ? texte.split(/\r?\n/) : [texte.replace(/\r?\n/g, ' ')];
      lignes.slice(0, Math.max(1, Math.floor(h / (taille * 1.2)))).forEach((l, i) => {
        const t = el('text', { x: x + 2, y: a.multiLine ? y + 2 + taille * 0.85 + i * taille * 1.2 : y + h / 2 + taille * 0.35, 'font-size': taille, 'font-family': 'Helvetica, Arial, sans-serif', fill: '#111', 'xml:space': 'preserve' });
        t.textContent = l;
        svg.appendChild(t);
      });
    });
    f.appendChild(svg);
  }

  // Le texte de la page, invisible mais sélectionnable par-dessus l'image :
  // on copie une adresse, un montant, comme dans n'importe quelle visionneuse.
  // Sur un scan reconnu, ce sont les mots de l'OCR qui se posent.
  // Les titres du document, pour qui ne le lit pas à l'œil : un texte nettement plus gros que le texte courant de la page,
  // court, est exposé comme titre (niveaux 3 et 4, sous le titre « Document » de la zone). C'est une lecture de la mise en
  // forme, pas de la structure du PDF : un document balisé s'expose mieux, mais celui-ci n'a pas à l'être pour qu'on s'y repère.
  function marquerLesTitres(couche) {
    const spans = Array.from(couche.querySelectorAll('span')).filter(s => s.textContent.trim());
    const tailles = spans.map(s => { const m = /\*\s*([\d.]+)px/.exec(s.style.fontSize || ''); return m ? +m[1] : 0; });
    const connues = tailles.filter(t => t > 0).sort((a, b) => a - b);
    if (connues.length < 4) return;
    const mediane = connues[Math.floor(connues.length / 2)], plus = connues[connues.length - 1];
    spans.forEach((s, i) => {
      const long = s.textContent.trim().length;
      if (tailles[i] >= mediane * 1.35 && long >= 2 && long <= 90) {
        s.setAttribute('role', 'heading');
        s.setAttribute('aria-level', tailles[i] >= plus * 0.9 ? '3' : '4');
      }
    });
  }

  async function lectureCoucheTexte(f, p, page, g) {
    const vieux = f.querySelector('.couche-texte');
    if (vieux) vieux.remove();
    const couche = document.createElement('div');
    couche.className = 'couche-texte'; couche.setAttribute('translate', 'no');
    couche.style.setProperty('--scale-factor', String(lectureZ));
    const vp = page.getViewport({ scale: lectureZ, rotation: g.total });
    let pose = false;
    try {
      const tc = await page.getTextContent();
      if (tc.items.some(it => it.str && it.str.trim()) && typeof pdfjs.renderTextLayer === 'function') {
        await pdfjs.renderTextLayer({ textContentSource: tc, container: couche, viewport: vp, textDivs: [] }).promise;
        marquerLesTitres(couche);
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
      const legende = (i + 1) + ' / ' + state.pages.length
        + (src ? '  \u00b7  ' + baseName(src.name) : '');
      const nm = f.querySelector('.num');
      nm.dataset.legende = legende;
      const etiquette = 'Page ' + (i + 1) + ' sur ' + state.pages.length + (src ? ', ' + baseName(src.name) : '');
      nm.setAttribute('aria-label', etiquette);
      // Chaque feuille est une région nommée : on se déplace de page en page aux repères, comme on le ferait dans le papier.
      f.setAttribute('role', 'region');
      f.setAttribute('aria-label', etiquette);
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
    try { localStorage.setItem('aktum-vue', v); } catch (e) { signaler('Préférence d\'affichage', e, 'info'); }
    majVue();
    vue.render();
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

