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
      const genre = genreDeChamp(a);
      const fond = a.fond || '#F2F6FC', bord = a.bordure || '#7A8899';
      const trait = (n) => { n.setAttribute('fill', 'none'); n.setAttribute('stroke', bord); n.setAttribute('stroke-width', 1.4); n.setAttribute('stroke-linecap', 'round'); n.setAttribute('stroke-linejoin', 'round'); n.setAttribute('vector-effect', 'non-scaling-stroke'); return n; };
      if (genre === 'radio') {
        const c = document.createElementNS(SVGNS, 'ellipse');
        c.setAttribute('cx', a.x + a.w / 2); c.setAttribute('cy', a.y + a.h / 2); c.setAttribute('rx', Math.max(0, a.w / 2)); c.setAttribute('ry', Math.max(0, a.h / 2));
        c.setAttribute('fill', fond); c.setAttribute('stroke', bord); c.setAttribute('stroke-width', 1); c.setAttribute('vector-effect', 'non-scaling-stroke');
        gEl.appendChild(c);
        if (a.valeur) {
          const pt = document.createElementNS(SVGNS, 'ellipse');
          pt.setAttribute('cx', a.x + a.w / 2); pt.setAttribute('cy', a.y + a.h / 2); pt.setAttribute('rx', Math.max(0, a.w / 4)); pt.setAttribute('ry', Math.max(0, a.h / 4));
          pt.setAttribute('fill', a.encre || '#111111');
          gEl.appendChild(pt);
        }
        return gEl;
      }
      const r = document.createElementNS(SVGNS, 'rect');
      r.setAttribute('x', a.x); r.setAttribute('y', a.y);
      r.setAttribute('width', Math.max(0, a.w)); r.setAttribute('height', Math.max(0, a.h));
      r.setAttribute('fill', fond);
      r.setAttribute('stroke', bord);
      r.setAttribute('stroke-width', 1);
      r.setAttribute('vector-effect', 'non-scaling-stroke');
      if (genre === 'signature') r.setAttribute('stroke-dasharray', '4 3');
      gEl.appendChild(r);
      if (genre === 'case') {
        if (a.valeur) {
          const v = document.createElementNS(SVGNS, 'path');
          v.setAttribute('d', 'M' + (a.x + a.w * 0.2) + ' ' + (a.y + a.h * 0.55) + 'L' + (a.x + a.w * 0.42) + ' ' + (a.y + a.h * 0.76) + 'L' + (a.x + a.w * 0.8) + ' ' + (a.y + a.h * 0.25));
          gEl.appendChild(trait(v));
        }
        return gEl;
      }
      if (genre === 'liste') {
        const f = document.createElementNS(SVGNS, 'path');
        const cx = a.x + a.w - Math.min(12, a.w / 3), cy = a.y + a.h / 2, d = Math.min(3.5, a.h / 5);
        f.setAttribute('d', 'M' + (cx - d) + ' ' + (cy - d / 2) + 'L' + (cx + d) + ' ' + (cy - d / 2) + 'L' + cx + ' ' + (cy + d) + 'Z');
        f.setAttribute('fill', bord);
        gEl.appendChild(f);
      }
      const corps = champTaille(a);
      const dedans = genre === 'signature' ? '' : (a.valeur || '');
      const marque = genre === 'signature' ? 'Signature' : (a.libelle || '').trim();
      const gris = !dedans && !!marque;
      if (dedans || gris) {
        const t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', a.x + 2.5);
        t.setAttribute('y', a.multi ? a.y + 2 + corps * 0.85 : a.y + a.h / 2 + corps * 0.35);
        t.setAttribute('font-size', corps);
        t.setAttribute('font-family', 'Helvetica, Arial, sans-serif');
        t.setAttribute('fill', gris ? '#8A98A8' : (a.encre || '#111111'));
        t.setAttribute('xml:space', 'preserve');
        t.textContent = dedans || marque;
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
    if (a.type === 'underline' || a.type === 'strike') {
      const gEl = document.createElementNS(SVGNS, 'g');
      gEl.setAttribute('data-ann', a.id);
      const zone = document.createElementNS(SVGNS, 'rect');
      zone.setAttribute('x', a.x); zone.setAttribute('y', a.y); zone.setAttribute('width', Math.max(0, a.w)); zone.setAttribute('height', Math.max(0, a.h));
      zone.setAttribute('fill', 'transparent');
      const y = a.type === 'underline' ? a.y + a.h : a.y + a.h / 2;
      const l = document.createElementNS(SVGNS, 'line');
      l.setAttribute('x1', a.x); l.setAttribute('x2', a.x + a.w); l.setAttribute('y1', y); l.setAttribute('y2', y);
      l.setAttribute('stroke', a.color); l.setAttribute('stroke-width', a.width || 1.2);
      gEl.append(zone, l);
      return gEl;
    }
    if (a.type === 'arrow' && a.pts && a.pts.length > 1) {
      const gEl = document.createElementNS(SVGNS, 'g');
      gEl.setAttribute('data-ann', a.id);
      const f = geomFleche(a);
      const l = document.createElementNS(SVGNS, 'line');
      l.setAttribute('x1', f.depart[0]); l.setAttribute('y1', f.depart[1]); l.setAttribute('x2', f.pied[0]); l.setAttribute('y2', f.pied[1]);
      l.setAttribute('stroke', a.color); l.setAttribute('stroke-width', a.width || 2); l.setAttribute('stroke-linecap', 'round');
      const t = document.createElementNS(SVGNS, 'polygon');
      t.setAttribute('points', f.tete.map(q => q[0].toFixed(2) + ',' + q[1].toFixed(2)).join(' '));
      t.setAttribute('fill', a.color);
      gEl.append(l, t);
      return gEl;
    }
    if (a.type === 'note') {
      const gEl = document.createElementNS(SVGNS, 'g');
      gEl.setAttribute('data-ann', a.id);
      const r = document.createElementNS(SVGNS, 'path');
      const s = a.w, x = a.x, y = a.y;
      r.setAttribute('d', ['M', x, ' ', y, 'h', s, 'v', s * 0.7, 'l', -s * 0.3, ' ', s * 0.3, 'h', -s * 0.7, 'z'].join(''));
      r.setAttribute('fill', a.color || '#FFD43B'); r.setAttribute('stroke', '#7A5C00'); r.setAttribute('stroke-width', 0.8);
      gEl.appendChild(r);
      [0.3, 0.5].forEach((k, i) => {
        const t = document.createElementNS(SVGNS, 'line');
        t.setAttribute('x1', x + s * 0.2); t.setAttribute('x2', x + s * (i ? 0.55 : 0.8)); t.setAttribute('y1', y + s * k); t.setAttribute('y2', y + s * k);
        t.setAttribute('stroke', '#7A5C00'); t.setAttribute('stroke-width', 0.8);
        gEl.appendChild(t);
      });
      const titre = document.createElementNS(SVGNS, 'title'); titre.textContent = a.text || '';
      gEl.appendChild(titre);
      return gEl;
    }
    if (a.type === 'lien') {
      // Un lien ne se voit pas sur la page : seul l'éditeur le dessine, en pointillés, pour qu'on le retrouve.
      if (!forEditor) return null;
      const r = document.createElementNS(SVGNS, 'rect');
      r.setAttribute('data-ann', a.id);
      r.setAttribute('x', a.x); r.setAttribute('y', a.y); r.setAttribute('width', Math.max(0, a.w)); r.setAttribute('height', Math.max(0, a.h));
      r.setAttribute('fill', 'rgba(38,128,235,.12)'); r.setAttribute('stroke', '#2680EB'); r.setAttribute('stroke-width', 1); r.setAttribute('stroke-dasharray', '4 3');
      r.setAttribute('vector-effect', 'non-scaling-stroke');
      return r;
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
