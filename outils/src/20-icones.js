  // =====================================================================
  //  Icons
  // =====================================================================
  const SVGNS = 'http://www.w3.org/2000/svg';
  function icon(d, extra) {
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 16 16');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', (extra && extra.sw) || '1.5');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    (Array.isArray(d) ? d : [d]).forEach(p => {
      const el = document.createElementNS(SVGNS, p.charAt(0) === 'C' ? 'circle' : 'path');
      if (p.charAt(0) === 'C') { const a = p.slice(1).split(','); el.setAttribute('cx', a[0]); el.setAttribute('cy', a[1]); el.setAttribute('r', a[2]); }
      else el.setAttribute('d', p);
      s.appendChild(el);
    });
    return s;
  }
  const IC = {
    rotL: ['M3.5 6.5A5 5 0 1 1 3 9', 'M3 3v3.5h3.5'],
    rotR: ['M12.5 6.5A5 5 0 1 0 13 9', 'M13 3v3.5H9.5'],
    left: 'm10 3-5 5 5 5',
    right: 'm6 3 5 5-5 5',
    hash: ['M6 2.5 4.5 13.5M11.5 2.5 10 13.5M2.5 6h11M2 10h11'],
    pencil: ['M11.5 2.5 13.5 4.5 5.5 12.5 2.5 13.5 3.5 10.5z'],
    trash: ['M3 4.5h10', 'M6.5 4.5V3h3v1.5', 'M4.5 4.5 5 13h6l.5-8.5'],
    x: 'm4 4 8 8M12 4l-8 8',
    check: 'm3.5 8.5 3 3 6-7',
    plus: 'M8 3v10M3 8h10',
    doc: ['M9.5 1.5H4.5A1.5 1.5 0 0 0 3 3v10a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 13 13V5z', 'M9.5 1.5V5H13'],
    split: ['M3 3.5h4.5v9H3z', 'M9.5 3.5H14v9H9.5z'],
    image: ['M2.5 3.5h11v9h-11z', 'M2.5 10.5 6 7l2.5 2.5L11 7l2.5 2.5', 'C5.5,6,1'],
    text: ['M4 4V2.8h8V4', 'M8 2.8v10.4', 'M6 13.2h4'],
    stamp: ['M4 13.5h8', 'M5.5 11.5h5l-.5-3a2.5 2.5 0 1 0-4 0z'],
    water: ['M8 2.5s4 4.5 4 7a4 4 0 0 1-8 0c0-2.5 4-7 4-7z'],
    header: ['M2.5 3.5h11', 'M2.5 12.5h11', 'M4.5 6.5h7M4.5 9h5'],
    lock: ['M3.5 7.5h9v6h-9z', 'M5.5 7.5V5a2.5 2.5 0 0 1 5 0v2.5'],
    zip: ['M3 2.5h10v11H3z', 'M7.5 2.5v2M8.5 4.5v2M7.5 6.5v2M8.5 8.5v1.5h-1V8.5'],
    txt: ['M4 2.5h5.5L12 5v8.5H4z', 'M9.5 2.5V5H12', 'M6 8h4M6 10.5h4'],
    zap: ['M8.5 2 4 9h3.5L7 14l4.5-7H8z'],
    resize: ['M2.5 2.5h11v11h-11z', 'M6 6h4v4H6z'],
    info: ['C8,8,6', 'M8 7.5v3.5', 'M8 5.2h.01'],
    search: ['C7,7,4.5', 'm10.5 10.5 3 3'],
    form: ['M2.5 3.5h11v9h-11z', 'M5 6.5h6M5 9.5h3'],
    champ: ['M2.5 4.5h11v7h-11z', 'M5.5 6.5v3', 'M4.5 6.5h2M4.5 9.5h2'],
    flat: ['M2.5 8 8 4.5 13.5 8 8 11.5z', 'M2.5 11 8 14l5.5-3'],
    sun: ['C8,8,3', 'M8 1.5v1.5M8 13v1.5M14.5 8H13M3 8H1.5M12.6 3.4l-1 1M4.4 11.6l-1 1M12.6 12.6l-1-1M4.4 4.4l-1-1'],
    moon: ['M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z'],
    auto: ['C8,8,6', 'M8 2a6 6 0 0 0 0 12z'],
    highlight: ['M3 13.5h10', 'M5 11 10.5 3l2.5 2L7.5 11z'],
    redact: ['M2.5 5.5h11v5h-11z'],
    draw: ['M2.5 12.5c2-6 4.5 2 6.5-2s3-4 4.5-5'],
    select: ['m3 2.5 9 5.5-4 1-1.5 4z'],
    box: ['M3 3.5h10v9H3z'],
    save: ['M8 2v8', 'm4.5 6.5 3.5 3.5 3.5-3.5', 'M2.5 11v1.5A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V11'],
    print: ['M4.5 6V2.5h7V6', 'M3 6h10a1 1 0 0 1 1 1v4h-2.5', 'M3 11H1.5', 'M4.5 9.5h7v4h-7z'],
    vide: ['M3 2.5h7l3 3v8H3z', 'M10 2.5V5.5h3', 'M5.5 11.5h5'],
    editText: ['M2.5 5V3.5h7V5', 'M6 3.5v7M4.5 10.5h3', 'M9.5 13.5l4.5-4.5-1.5-1.5L8 12v1.5z'],
    signet: ['M4 2.5h8v11l-4-3-4 3z'],
    deux: ['M1.5 3h5.5v10H1.5z', 'M9 3h5.5v10H9z'],
    compare: ['M8 2v12', 'M2.5 4h4v8h-4z', 'M9.5 4h4v8h-4z', 'M4.5 7h0M11.5 9h0'],
    dossier: ['M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v6.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5z', 'M5 9.5h6'],
    lots: ['M2.5 3.5h5v5h-5z', 'M8.5 3.5h5v5h-5z', 'M2.5 9.5h5v4h-5z', 'M8.5 9.5h5v4h-5z'],
    tableau: ['M2.5 3.5h11v9h-11z', 'M2.5 6.5h11M2.5 9.5h11', 'M6 3.5v9M10 3.5v9'],
    ocr: ['M2.5 5.5v-2h2M11.5 3.5h2v2M13.5 10.5v2h-2M4.5 12.5h-2v-2', 'M5.5 8h5', 'M8 6v4'],
    remplacer: ['M3 5.5h7l-2-2M13 10.5H6l2 2'],
  };

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
  async function dessinerMention(doc, page, p, fonts) {
    if (!p.piece) return;
    const g = pageGeom(p);
    const font = await getFont(doc, fonts, 'Helvetica', true, false);
    drawDisplayText(page, g, { text: p.piece, x: g.Wd - MENTION.marge, y: MENTION.haut, size: MENTION.size, font, color: '#333333', align: 'right' });
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

