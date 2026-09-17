  // =====================================================================
  //  Saisie enrichie : une zone editable ou chaque morceau garde son style
  // =====================================================================
  function richeLongueur(n) {
    if (n.nodeType === 3) return n.nodeValue.length;
    if (n.nodeName === 'BR') return 1;
    let s = 0;
    n.childNodes.forEach(c => { s += richeLongueur(c); });
    return s;
  }
  // Position d'un point du DOM, comptee en caracteres depuis le debut.
  function richeIndex(zone, node, offset) {
    if (node === zone) {
      let n = 0;
      for (let k = 0; k < offset && k < zone.childNodes.length; k++) n += richeLongueur(zone.childNodes[k]);
      return n;
    }
    let n = 0, fini = false;
    const parcourir = el => {
      if (fini) return;
      for (const enfant of Array.from(el.childNodes)) {
        if (fini) return;
        if (enfant.nodeType === 3) {
          if (enfant === node) { n += Math.min(offset, enfant.nodeValue.length); fini = true; return; }
          n += enfant.nodeValue.length;
        } else if (enfant.nodeName === 'BR') {
          if (enfant === node) { fini = true; return; }
          n += 1;
        } else if (enfant === node) {
          for (let k = 0; k < offset && k < enfant.childNodes.length; k++) n += richeLongueur(enfant.childNodes[k]);
          fini = true; return;
        } else parcourir(enfant);
      }
    };
    parcourir(zone);
    return fini ? n : null;
  }
  function richeOffsets(zone) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const r = sel.getRangeAt(0);
    if (!zone.contains(r.startContainer) || !zone.contains(r.endContainer)) return null;
    const a = richeIndex(zone, r.startContainer, r.startOffset);
    const b = richeIndex(zone, r.endContainer, r.endOffset);
    if (a == null || b == null) return null;
    return { debut: Math.min(a, b), fin: Math.max(a, b) };
  }
  function richePoint(zone, index) {
    let reste = Math.max(0, index), cible = null;
    const parcourir = el => {
      for (const enfant of Array.from(el.childNodes)) {
        if (cible) return;
        if (enfant.nodeType === 3) {
          const L = enfant.nodeValue.length;
          if (reste <= L) { cible = { node: enfant, offset: reste }; return; }
          reste -= L;
        } else if (enfant.nodeName === 'BR') {
          if (reste === 0) { cible = { node: zone, offset: Array.from(zone.childNodes).indexOf(enfant) }; return; }
          reste -= 1;
        } else parcourir(enfant);
      }
    };
    parcourir(zone);
    return cible || { node: zone, offset: zone.childNodes.length };
  }
  function richePlacer(zone, debut, fin) {
    try {
      const a = richePoint(zone, debut), b = richePoint(zone, fin == null ? debut : fin);
      const r = document.createRange();
      r.setStart(a.node, a.offset);
      r.setEnd(b.node, b.offset);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    } catch (_) {}
  }
  function richePeindre(zone, a) {
    zone.replaceChildren();
    a.runs.forEach((run, i) => {
      const st = polAffichageRun(run);
      String(run.t).split('\n').forEach((bout, k) => {
        if (k) zone.appendChild(document.createElement('br'));
        const sp = document.createElement('span');
        sp.dataset.i = i;
        sp.dataset.gras = run.gras ? '1' : '0';
        sp.dataset.italique = run.italique ? '1' : '0';
        sp.style.fontFamily = st.famille;
        sp.style.fontWeight = st.poids;
        sp.style.fontStyle = st.penche;
        sp.style.fontSize = (run.size * ed.scale).toFixed(2) + 'px';
        sp.style.color = run.color;
        sp.textContent = bout;
        zone.appendChild(sp);
      });
    });
  }
  // Relit la zone : chaque bout de texte retrouve le style du morceau d'ou
  // il vient, et ce qui a ete tape reprend celui de son voisin de gauche.
  function richeLire(zone, a) {
    const bouts = [];
    let dernier = 0;
    const parcourir = el => {
      Array.from(el.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const sp = n.parentElement && n.parentElement.closest('[data-i]');
          const i = sp ? Math.min(a.runs.length - 1, Math.max(0, +sp.dataset.i || 0)) : dernier;
          dernier = i;
          if (n.nodeValue) bouts.push({ i, t: n.nodeValue });
        } else if (n.nodeName === 'BR') bouts.push({ i: dernier, t: '\n' });
        else parcourir(n);
      });
    };
    parcourir(zone);
    // Le navigateur ajoute un saut de ligne technique en fin de zone.
    if (bouts.length && bouts[bouts.length - 1].t === '\n') bouts.pop();
    return runsRanger(bouts.map(b => Object.assign({}, a.runs[b.i], { t: b.t })));
  }

  function edFermerSaisie(annuler) {
    const s = ed.saisie;
    if (!s) return;
    ed.saisie = null;
    document.removeEventListener('pointerdown', s.dehors, true);
    document.removeEventListener('selectionchange', s.suivre);
    if (!annuler) {
      const neufs = richeLire(s.zone, s.a);
      // Rouvrir un paragraphe sans y toucher ne doit rien déplacer : on ne
      // replie le texte que s'il a réellement changé.
      if (runsEmpreinte(neufs) !== s.empreinte) {
        s.a.runs = neufs;
        recalcRuns(s.a);
        state.touched = true;
      }
    }
    s.zone.remove();
    if (s.barre) s.barre.remove();
    if (ed.root) ed.root.classList.remove('en-saisie');
    edDrawOverlay();
  }


  // Ou tomberait le curseur si l'on cliquait a cet endroit de l'ecran.
  function richeAuPoint(zone, cx, cy) {
    if (cx == null || cy == null) return null;
    try {
      let r = null;
      if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(cx, cy);
      else if (document.caretPositionFromPoint) {
        const c = document.caretPositionFromPoint(cx, cy);
        if (c) { r = document.createRange(); r.setStart(c.offsetNode, c.offset); r.collapse(true); }
      }
      if (!r || !zone.contains(r.startContainer)) return null;
      return richeIndex(zone, r.startContainer, r.startOffset);
    } catch (_) { return null; }
  }

  function edBarreFormat(a, zone) {
    const barre = document.createElement('div');
    barre.className = 'ed-format';
    barre.setAttribute('role', 'toolbar');
    barre.setAttribute('aria-label', 'Mise en forme du texte');
    barre.addEventListener('pointerdown', e => { if (e.target === barre || e.target.tagName === 'BUTTON' || e.target.closest('button')) e.preventDefault(); });

    const taille = document.createElement('input');
    taille.className = 'taille'; taille.type = 'text'; taille.inputMode = 'decimal';
    taille.title = 'Taille du texte, en points';
    taille.setAttribute('aria-label', 'Taille du texte en points');

    let etatGras = null, etatItal = null;
    const bouton = (texte, titre, onClick) => {
      const b = document.createElement('button');
      b.type = 'button'; b.title = titre; b.setAttribute('aria-label', titre);
      b.append(texte);
      b.addEventListener('mousedown', e => e.preventDefault());
      b.addEventListener('click', onClick);
      return b;
    };

    // Sur quoi agir : la selection si elle existe, tout le texte sinon.
    const agir = calcul => {
      const o = richeOffsets(zone) || ed.saisie.sel || null;
      a.runs = richeLire(zone, a);
      const total = runsTexte(a.runs).length;
      let debut = o ? Math.min(o.debut, total) : 0;
      let fin = o ? Math.min(o.fin, total) : total;
      if (debut === fin) { debut = 0; fin = total; }
      runsAppliquer(a, debut, fin, calcul(debut, fin));
      a.runs = runsRanger(a.runs);
      richePeindre(zone, a);
      zone.focus();
      richePlacer(zone, o ? o.debut : 0, o ? o.fin : total);
      ed.saisie.sel = { debut: o ? o.debut : 0, fin: o ? o.fin : total };
      majBarre();
    };
    const basculer = champ => agir((d, f) => {
      const tous = runsTous(a, d, f, r => !!r[champ]);
      return r => {
        r[champ] = !tous;
        const alt = polVariante(ed.polices, r.pol, r.gras, r.italique);
        if (alt) r.pol = alt;
      };
    });
    const corps = v => agir(() => r => { r.size = Math.max(4, Math.min(200, Math.round(v * 10) / 10)); });
    const pas = d => agir(() => r => { r.size = Math.max(4, Math.min(200, Math.round((r.size + d) * 10) / 10)); });

    const police = document.createElement('select');
    police.className = 'police';
    police.title = 'Police du texte';
    police.setAttribute('aria-label', 'Police du texte');
    [['doc', 'Du document'], ['Helvetica', 'Helvetica'], ['Times', 'Times'], ['Courier', 'Courier']]
      .forEach(o => { const op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; police.appendChild(op); });
    police.addEventListener('mousedown', () => { ed.saisie.sel = richeOffsets(zone) || ed.saisie.sel; });
    police.addEventListener('change', () => agir(() => r => {
      if (police.value === 'doc') {
        if (!r.polSrc) return;
        r.pol = polVariante(ed.polices, r.polSrc, r.gras, r.italique) || r.polSrc;
        r.genre = r.pol.genre;
      } else { r.pol = null; r.genre = police.value; }
    }));

    const gEl = document.createElement('b'); gEl.textContent = 'G';
    const iEl = document.createElement('i'); iEl.textContent = 'I';
    const bGras = bouton(gEl, 'Gras (Ctrl+B)', () => basculer('gras'));
    bGras.dataset.a = 'gras';
    const bItal = bouton(iEl, 'Italique (Ctrl+I)', () => basculer('italique'));
    bItal.dataset.a = 'italique';
    const couleur = document.createElement('input');
    couleur.type = 'color'; couleur.title = 'Couleur du texte';
    couleur.setAttribute('aria-label', 'Couleur du texte');
    couleur.addEventListener('change', () => agir(() => r => { r.color = couleur.value; }));

    taille.addEventListener('mousedown', () => { ed.saisie.sel = richeOffsets(zone) || ed.saisie.sel; });
    taille.addEventListener('change', () => {
      const v = parseFloat(String(taille.value).replace(',', '.'));
      if (v > 0) corps(v); else majBarre();
    });
    taille.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); taille.blur(); } });

    const sep = () => { const s = document.createElement('span'); s.className = 'sep'; return s; };
    barre.append(
      bouton('A−', 'Réduire la taille', () => pas(-0.5)), taille, bouton('A+', 'Agrandir la taille', () => pas(0.5)),
      sep(), police, sep(), bGras, bItal, sep(), couleur, sep(),
      bouton('✓', 'Valider (Échap)', () => edFermerSaisie()),
    );

    function majBarre() {
      const o = richeOffsets(zone) || ed.saisie.sel;
      const total = runsTexte(a.runs).length;
      const d = o ? o.debut : 0, f = o && o.fin > o.debut ? o.fin : total;
      etatGras = runsTous(a, d, f, r => !!r.gras);
      etatItal = runsTous(a, d, f, r => !!r.italique);
      bGras.setAttribute('aria-pressed', etatGras ? 'true' : 'false');
      bItal.setAttribute('aria-pressed', etatItal ? 'true' : 'false');
      let corpsVu = null, multiple = false;
      let pos = 0;
      a.runs.forEach(r => {
        const x = pos, y = pos + r.t.length; pos = y;
        if (f <= x || d >= y || !r.t.length) return;
        if (corpsVu == null) corpsVu = r.size;
        else if (Math.abs(corpsVu - r.size) > 0.05) multiple = true;
      });
      if (document.activeElement !== taille) {
        taille.value = multiple ? '' : (corpsVu == null ? '' : String(Math.round(corpsVu * 10) / 10));
      }
      taille.placeholder = multiple ? '—' : '';
      const duDoc = runsTous(a, d, f, r => !!r.pol);
      let genreVu = null, genresMeles = false;
      pos = 0;
      a.runs.forEach(r => {
        const x = pos, y = pos + r.t.length; pos = y;
        if (f <= x || d >= y || !r.t.length) return;
        const gg = r.pol ? 'doc' : (r.genre || 'Helvetica');
        if (genreVu == null) genreVu = gg; else if (genreVu !== gg) genresMeles = true;
      });
      police.value = duDoc ? 'doc' : (genresMeles || genreVu == null ? '' : genreVu);
      police.options[0].disabled = !runsTous(a, d, f, r => !!r.polSrc);
    }
    barre.maj = majBarre;
    return barre;
  }

  // Ouvre la saisie enrichie sur une retouche de ligne.
  function edEditRuns(a, opts) {
    opts = opts || {};
    edFermerSaisie();
    if (!opts.nouveau) snapshot();
    const zone = document.createElement('div');
    zone.className = 'ed-riche';
    try { zone.contentEditable = 'plaintext-only'; } catch (_) {}
    if (zone.contentEditable !== 'plaintext-only') zone.contentEditable = 'true';
    zone.spellcheck = false;
    zone.setAttribute('role', 'textbox');
    zone.setAttribute('aria-label', 'Texte de la ligne');
    // bordure (1) + marge interieure (2) : la zone est decalee d'autant
    // pour que le texte se pose la ou il sera dessine.
    const hautTexte = (a.b0 == null ? a.pad + a.size * 0.82 : a.b0) - a.size * 0.82;
    zone.style.left = ((a.x + 1) * ed.scale - 3) + 'px';
    zone.style.top = ((a.y + hautTexte) * ed.scale - 2) + 'px';
    zone.style.width = (Math.max(8, a.w - 2 + (a.marge || 0)) * ed.scale) + 'px';
    zone.style.lineHeight = String(((a.interligne > 0 ? a.interligne : a.size * 1.18) / Math.max(1, a.size)).toFixed(3));
    zone.style.textAlign = a.aligne === 'justifie' ? 'justify' : a.aligne === 'centre' ? 'center' : a.aligne === 'droite' ? 'right' : 'left';
    richePeindre(zone, a);
    ed.sheet.appendChild(zone);

    const barre = edBarreFormat(a, zone);
    ed.bandeau.appendChild(barre);
    ed.root.classList.add('en-saisie');
    const total = runsTexte(a.runs).length;
    // Le curseur se pose la ou l'on a clique. Rien n'est selectionne : la
    // premiere touche frappee ne doit jamais effacer le paragraphe entier.
    let debut = richeAuPoint(zone, opts.point && opts.point.cx, opts.point && opts.point.cy);
    if (debut == null) debut = total;
    const saisie = { zone, barre, a, sel: { debut, fin: debut }, empreinte: runsEmpreinte(a.runs) };
    ed.saisie = saisie;
    edDrawOverlay();

    saisie.suivre = () => {
      const o = richeOffsets(zone);
      if (o) { saisie.sel = o; barre.maj(); }
    };
    saisie.dehors = e => {
      if (zone.contains(e.target) || barre.contains(e.target)) return;
      edFermerSaisie();
    };
    document.addEventListener('selectionchange', saisie.suivre);
    document.addEventListener('pointerdown', saisie.dehors, true);

    zone.addEventListener('keydown', e => {
      e.stopPropagation();
      const mod = e.ctrlKey || e.metaKey;
      // Entree fait un retour a la ligne, comme dans un traitement de texte ;
      // c'est Echap (ou Ctrl+Entree) qui valide la correction.
      if (e.key === 'Escape' || (e.key === 'Enter' && mod)) { e.preventDefault(); edFermerSaisie(); return; }
      if (mod && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); basculerDepuisBarre('gras'); return; }
      if (mod && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); basculerDepuisBarre('italique'); return; }
    });
    const basculerDepuisBarre = champ => {
      const b = barre.querySelector('[data-a="' + champ + '"]');
      if (b) b.click();
    };

    zone.focus();
    richePlacer(zone, debut, debut);
    barre.maj();
    requestAnimationFrame(() => {
      if (ed.saisie !== saisie) return;
      if (document.activeElement !== zone) { zone.focus(); richePlacer(zone, debut, debut); }
    });
  }

  function edEditText(a) {
    const p = edPage();
    const retouche = a.type === 'edit';
    const ta = document.createElement('textarea');
    ta.className = 'ed-textarea';
    ta.style.left = ((a.x + (retouche ? 1 : 0)) * ed.scale) + 'px';
    ta.style.top = ((a.y + (retouche ? a.pad : 0)) * ed.scale) + 'px';
    ta.style.width = ((a.w - (retouche ? 2 : 0)) * ed.scale) + 'px';
    const stp = polAffichage(a);
    ta.style.fontSize = (a.size * ed.scale) + 'px';
    ta.style.fontFamily = stp.famille;
    ta.style.fontWeight = stp.poids;
    ta.style.fontStyle = stp.penche;
    ta.style.color = a.color;
    ta.value = a.text || (a.lines || []).join('\n');
    ed.sheet.appendChild(ta);
    ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px';
    ta.focus(); ta.select();
    requestAnimationFrame(() => { if (document.activeElement !== ta) { ta.focus(); ta.select(); } });
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; });
    let closed = false;
    const commit = () => {
      if (closed) return;
      closed = true;
      const text = ta.value.replace(/\s+$/, '');
      ta.remove();
      snapshot();
      if (!text.trim() && !retouche) { p.ann = p.ann.filter(x => x.id !== a.id); ed.sel = null; }
      else { a.text = text; recalcAnn(a); }
      state.touched = true;
      edDrawOverlay();
    };
    ta.addEventListener('blur', commit);
    ta.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); commit(); }
    });
  }

  function edPlaceImage(dataUrl, natW, natH, preferW) {
    const p = edPage();
    const g = pageGeom(p);
    const w = Math.min(preferW || g.Wd * 0.45, g.Wd * 0.9);
    const h = w * (natH / natW);
    edCommit({ id: -1, type: 'image', x: (g.Wd - w) / 2, y: Math.min(g.Hd * 0.62, g.Hd - h - 20), w, h, data: dataUrl, opacity: 1 });
  }

  function edPickImage() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/png,image/jpeg';
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      try {
        const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
        const im = await loadImage(data);
        edPlaceImage(data, im.naturalWidth, im.naturalHeight);
        setLast('Image insérée : déplacez-la puis redimensionnez-la avec la poignée.');
      } catch (e) { toast('Image illisible.', 'error'); }
    });
    inp.click();
  }

