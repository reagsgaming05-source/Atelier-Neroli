  // =====================================================================
  //  Annotation preview (SVG)
  // =====================================================================
  function annSvg(p, g, forEditor) {
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + g.Wd.toFixed(2) + ' ' + g.Hd.toFixed(2));
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.classList.add('ann-layer');
    p.ann.forEach(a => { const n = annNode(a, forEditor); if (n) svg.appendChild(n); });
    const m = mentionNode(p, g);
    if (m) svg.appendChild(m);
    return svg;
  }
  // La mention « Pièce n° 3 » d'un dossier, en haut à droite de la page.
  const MENTION = { size: 9, marge: 28, haut: 26 };
  function mentionNode(p, g) {
    if (!p.piece) return null;
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', g.Wd - MENTION.marge); t.setAttribute('y', MENTION.haut);
    t.setAttribute('text-anchor', 'end');
    t.setAttribute('font-size', MENTION.size); t.setAttribute('font-weight', '700');
    t.setAttribute('font-family', 'Helvetica, Arial, sans-serif');
    t.setAttribute('fill', '#333333');
    t.textContent = p.piece;
    return t;
  }
  function annNode(a, forEditor) {
    if (a.type === 'edit') {
      const gEl = document.createElementNS(SVGNS, 'g');
      gEl.setAttribute('data-ann', a.id);
      const fond = document.createElementNS(SVGNS, 'rect');
      fond.setAttribute('x', a.x); fond.setAttribute('y', a.y);
      fond.setAttribute('width', Math.max(0, a.w)); fond.setAttribute('height', Math.max(0, annHauteur(a)));
      fond.setAttribute('fill', a.bg || '#FFFFFF');
      gEl.appendChild(fond);
      // Le fond relevé sur la page couvre le bloc d'origine ; l'aplat
      // dessous sert au cas où la correction déborde vers le bas.
      if (a.bgImg && a.h0 > 0) {
        const im = document.createElementNS(SVGNS, 'image');
        im.setAttribute('x', a.x); im.setAttribute('y', a.y);
        im.setAttribute('width', Math.max(0, a.w)); im.setAttribute('height', Math.max(0, a.h0));
        im.setAttribute('preserveAspectRatio', 'none');
        im.setAttribute('href', a.bgImg);
        gEl.appendChild(im);
      }
      if (forEditor && ed.saisie && ed.saisie.a === a) return gEl;
      (a.lignes || []).forEach((seg, i) => {
        if (!seg.length) return;
        const t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', a.x + 1);
        t.setAttribute('y', a.y + a.ly[i]);
        t.setAttribute('xml:space', 'preserve');
        seg.forEach(jeton => {
          const run = a.runs[jeton.r];
          if (!run || !jeton.t) return;
          const st = polAffichageRun(run);
          const sp = document.createElementNS(SVGNS, 'tspan');
          sp.setAttribute('x', (a.x + 1 + jeton.x).toFixed(2));
          sp.setAttribute('data-gras', run.gras ? '1' : '0');
          sp.setAttribute('font-size', run.size);
          sp.setAttribute('font-family', st.famille);
          if (st.poids !== '400') sp.setAttribute('font-weight', st.poids);
          if (st.penche !== 'normal') sp.setAttribute('font-style', st.penche);
          sp.setAttribute('fill', run.color);
          sp.setAttribute('xml:space', 'preserve');
          sp.textContent = jeton.t;
          t.appendChild(sp);
        });
        gEl.appendChild(t);
      });
      return gEl;
    }
    if (a.type === 'tampon') {
      const gEl = document.createElementNS(SVGNS, 'g');
      gEl.setAttribute('data-ann', a.id);
      const r = document.createElementNS(SVGNS, 'rect');
      r.setAttribute('x', a.x); r.setAttribute('y', a.y);
      r.setAttribute('width', Math.max(0, a.w)); r.setAttribute('height', Math.max(0, a.h));
      r.setAttribute('rx', a.size * 0.25);
      r.setAttribute('fill', 'none'); r.setAttribute('stroke', a.color); r.setAttribute('stroke-width', a.size * 0.09);
      gEl.appendChild(r);
      const t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', a.x + a.w / 2); t.setAttribute('y', a.y + a.h / 2 + a.size * 0.35);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-size', a.size); t.setAttribute('font-weight', '700');
      t.setAttribute('font-family', 'Helvetica, Arial, sans-serif');
      t.setAttribute('fill', a.color);
      t.textContent = a.text;
      gEl.appendChild(t);
      return gEl;
    }
    if (a.type === 'text') {
      const gEl = document.createElementNS(SVGNS, 'g');
      gEl.setAttribute('data-ann', a.id);
      const lh = a.size * 1.25;
      const st = polAffichage(a);
      (a.lines || []).forEach((line, i) => {
        const t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', a.x);
        t.setAttribute('y', a.y + lh * i + a.size * 0.95);
        t.setAttribute('font-size', a.size);
        t.setAttribute('font-family', st.famille);
        if (st.poids !== '400') t.setAttribute('font-weight', st.poids);
        if (st.penche !== 'normal') t.setAttribute('font-style', st.penche);
        t.setAttribute('fill', a.color);
        t.textContent = line;
        gEl.appendChild(t);
      });
      return gEl;
    }
    if (a.type === 'champ') {
      const gEl = document.createElementNS(SVGNS, 'g');
      gEl.setAttribute('data-ann', a.id);
      const r = document.createElementNS(SVGNS, 'rect');
      r.setAttribute('x', a.x); r.setAttribute('y', a.y);
      r.setAttribute('width', Math.max(0, a.w)); r.setAttribute('height', Math.max(0, a.h));
      r.setAttribute('fill', a.fond || '#F2F6FC');
      r.setAttribute('stroke', a.bordure || '#7A8899');
      r.setAttribute('stroke-width', 1);
      r.setAttribute('vector-effect', 'non-scaling-stroke');
      gEl.appendChild(r);
      const corps = champTaille(a);
      const dedans = a.valeur || '';
      const gris = !dedans && !!(a.libelle || '').trim();
      if (dedans || gris) {
        const t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', a.x + 2.5);
        t.setAttribute('y', a.multi ? a.y + 2 + corps * 0.85 : a.y + a.h / 2 + corps * 0.35);
        t.setAttribute('font-size', corps);
        t.setAttribute('font-family', 'Helvetica, Arial, sans-serif');
        t.setAttribute('fill', gris ? '#8A98A8' : (a.encre || '#111111'));
        t.setAttribute('xml:space', 'preserve');
        t.textContent = dedans || a.libelle;
        gEl.appendChild(t);
      }
      return gEl;
    }
    if (a.type === 'draw') {
      const pl = document.createElementNS(SVGNS, 'polyline');
      pl.setAttribute('data-ann', a.id);
      pl.setAttribute('points', (a.pts || []).map(pt => pt[0].toFixed(2) + ',' + pt[1].toFixed(2)).join(' '));
      pl.setAttribute('fill', 'none');
      pl.setAttribute('stroke', a.color);
      pl.setAttribute('stroke-width', a.width);
      pl.setAttribute('stroke-linecap', 'round');
      pl.setAttribute('stroke-linejoin', 'round');
      return pl;
    }
    if (a.type === 'image') {
      const im = document.createElementNS(SVGNS, 'image');
      im.setAttribute('data-ann', a.id);
      im.setAttribute('x', a.x); im.setAttribute('y', a.y);
      im.setAttribute('width', a.w); im.setAttribute('height', a.h);
      im.setAttribute('preserveAspectRatio', 'none');
      im.setAttribute('href', a.data);
      return im;
    }
    const r = document.createElementNS(SVGNS, 'rect');
    r.setAttribute('data-ann', a.id);
    r.setAttribute('x', a.x); r.setAttribute('y', a.y);
    r.setAttribute('width', Math.max(0, a.w)); r.setAttribute('height', Math.max(0, a.h));
    if (a.type === 'highlight') { r.setAttribute('fill', a.color); r.setAttribute('fill-opacity', a.opacity != null ? a.opacity : 0.35); }
    else if (a.type === 'redact') { r.setAttribute('fill', a.color || '#000000'); }
    else { r.setAttribute('fill', 'none'); r.setAttribute('stroke', a.color); r.setAttribute('stroke-width', a.width || 1.5); }
    return r;
  }
