  // =====================================================================
  //  PDF building
  // =====================================================================
  function fontKey(name, bold, italic) { return (name || 'Helvetica') + (bold ? '-B' : '') + (italic ? '-I' : ''); }
  async function getFont(doc, cache, name, bold, italic) {
    const k = fontKey(name, bold, italic);
    if (cache.has(k)) return cache.get(k);
    const S = PDFLib.StandardFonts;
    const map = {
      'Helvetica': S.Helvetica, 'Helvetica-B': S.HelveticaBold,
      'Helvetica-I': S.HelveticaOblique, 'Helvetica-B-I': S.HelveticaBoldOblique,
      'Times': S.TimesRoman, 'Times-B': S.TimesRomanBold,
      'Times-I': S.TimesRomanItalic, 'Times-B-I': S.TimesRomanBoldItalic,
      'Courier': S.Courier, 'Courier-B': S.CourierBold,
      'Courier-I': S.CourierOblique, 'Courier-B-I': S.CourierBoldOblique,
    };
    const f = await doc.embedFont(map[k] || S.Helvetica);
    cache.set(k, f);
    return f;
  }
  async function embedDataUrl(doc, cache, data) {
    if (cache.has(data)) return cache.get(data);
    const isPng = /^data:image\/png/i.test(data);
    const img = isPng ? await doc.embedPng(data) : await doc.embedJpg(data);
    cache.set(data, img);
    return img;
  }

  // Draw text positioned in *display* space (upright whatever the page rotation).
  function drawDisplayText(page, g, o) {
    const text = o.brut ? String(o.text == null ? '' : o.text) : winAnsi(o.text);
    if (!text) return;
    const a = (o.angle || 0) * Math.PI / 180;
    const w = o.font.widthOfTextAtSize(text, o.size);
    let x = o.x, y = o.y;
    const shift = o.align === 'center' ? w / 2 : o.align === 'right' ? w : 0;
    x -= shift * Math.cos(a);
    y += shift * Math.sin(a);
    const anchor = toUser(x, y, g);
    page.drawText(text, {
      x: anchor.x, y: anchor.y, size: o.size, font: o.font,
      color: pdfColor(o.color), opacity: o.opacity == null ? 1 : o.opacity,
      rotate: PDFLib.degrees((g.total + (o.angle || 0)) % 360),
    });
  }

  // Trace une ligne en gardant la police du document partout ou elle
  // possede le caractere, et en repliant sur une police standard ailleurs.
  function dessinerSuites(page, g, o) {
    const txt = String(o.text == null ? '' : o.text);
    if (!txt) return o.x;
    const suites = [];
    for (const ch of txt) {
      const propre = !!(o.propre && o.propre.connait(ch));
      const d = suites[suites.length - 1];
      if (d && d.propre === propre) d.t += ch;
      else suites.push({ propre, t: ch });
    }
    let x = o.x;
    suites.forEach(suite => {
      const font = suite.propre ? o.propre : o.repli;
      const texte = suite.propre ? suite.t : winAnsi(suite.t);
      if (!texte) return;
      drawDisplayText(page, g, {
        text: texte, brut: suite.propre, x, y: o.y, size: o.size,
        font, color: o.color, align: 'left',
      });
      x += font.widthOfTextAtSize(texte, o.size);
    });
    return x;
  }

  // Ce qui, à l'export, devient un vrai commentaire PDF — que le
  // destinataire retrouve, déplace ou retire dans Acrobat — plutôt qu'un
  // dessin fondu dans la page. À moins d'avoir demandé à tout figer.
  const TYPES_REELS = ['highlight', 'box', 'draw', 'text', 'tampon'];
  const annotationsReelles = () => !state.figerAnnotations;
  const enCommentaire = an => annotationsReelles() && TYPES_REELS.indexOf(an.type) >= 0;

  // Un rectangle aux coins arrondis, en chemin SVG (repère y vers le bas).
  function cheminArrondi(w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    return 'M' + r + ' 0H' + (w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + w + ' ' + r + 'V' + (h - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (w - r) + ' ' + h
      + 'H' + r + 'A' + r + ' ' + r + ' 0 0 1 0 ' + (h - r) + 'V' + r + 'A' + r + ' ' + r + ' 0 0 1 ' + r + ' 0Z';
  }
  // Le même, en opérateurs de flux PDF (repère y vers le haut).
  function opsArrondi(w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    const k = 0.5523 * r, f = n => (+n.toFixed(2));
    return [f(r) + ' 0 m', f(w - r) + ' 0 l', f(w - r + k) + ' 0 ' + f(w) + ' ' + f(r - k) + ' ' + f(w) + ' ' + f(r) + ' c',
      f(w) + ' ' + f(h - r) + ' l', f(w) + ' ' + f(h - r + k) + ' ' + f(w - r + k) + ' ' + f(h) + ' ' + f(w - r) + ' ' + f(h) + ' c',
      f(r) + ' ' + f(h) + ' l', f(r - k) + ' ' + f(h) + ' 0 ' + f(h - r + k) + ' 0 ' + f(h - r) + ' c',
      '0 ' + f(r) + ' l', '0 ' + f(r - k) + ' ' + f(r - k) + ' 0 ' + f(r) + ' 0 c', 'h'].join(' ');
  }
  async function dessinerTampon(doc, page, p, fonts, an) {
    const g = pageGeom(p);
    const coin = toUser(an.x, an.y, g);
    page.drawSvgPath(cheminArrondi(an.w, an.h, an.size * 0.25), {
      x: coin.x, y: coin.y, borderColor: pdfColor(an.color), borderWidth: an.size * 0.09, rotate: PDFLib.degrees(g.total),
    });
    const font = await getFont(doc, fonts, 'Helvetica', true, false);
    drawDisplayText(page, g, { text: an.text, x: an.x + an.w / 2, y: an.y + an.h / 2 + an.size * 0.35, size: an.size, font, color: an.color, align: 'center' });
  }

  // Les vrais commentaires PDF : surlignage, cadre, dessin, texte libre,
  // tampon. Chacun porte son apparence (le dessin qu'en fait n'importe
  // quelle visionneuse, sans rien avoir à deviner) et ses propriétés
  // normalisées, pour qu'Acrobat sache le modifier.
  async function poserAnnotationsReelles(doc, page, p, fonts) {
    const { PDFName, PDFString, PDFHexString } = PDFLib;
    const ctx = doc.context;
    const g = pageGeom(p);
    const quand = PDFString.fromDate(new Date());
    // L'apparence est dessinée droite, telle qu'on la voit ; sa matrice la
    // tourne comme la page.
    const matrice = g.total === 90 ? [0, 1, -1, 0] : g.total === 180 ? [-1, 0, 0, -1] : g.total === 270 ? [0, -1, 1, 0] : [1, 0, 0, 1];
    const rvb = hex => lireHex(hex).map(v => +(v / 255).toFixed(3));
    const n = v => +(+v).toFixed(2);
    const apparence = (contenu, w, h, ressources) => ctx.register(ctx.stream(contenu, {
      Type: 'XObject', Subtype: 'Form', FormType: 1, BBox: [0, 0, n(w), n(h)], Matrix: matrice.concat([0, 0]), Resources: ressources || {},
    }));
    const poser = (an, dict, ap, bb) => {
      const r = rectToUser(bb, g);
      Object.assign(dict, {
        Type: 'Annot', Rect: [n(r.x), n(r.y), n(r.x + r.w), n(r.y + r.h)], F: 4, P: page.ref, M: quand,
        NM: PDFString.of('blonay-' + an.id), AP: { N: ap },
      });
      page.node.addAnnot(ctx.register(ctx.obj(dict)));
    };
    let compte = 0;
    for (const an of p.ann) {
      if (!enCommentaire(an)) continue;
      try {
        if (an.type === 'highlight') {
          const op = an.opacity == null ? 0.35 : an.opacity;
          const c = rvb(an.color || '#FFE066');
          const ap = apparence('/GS gs ' + c.join(' ') + ' rg 0 0 ' + n(an.w) + ' ' + n(an.h) + ' re f', an.w, an.h,
            { ExtGState: { GS: { Type: 'ExtGState', CA: op, ca: op, BM: 'Multiply' } } });
          const r = rectToUser(an, g);
          poser(an, { Subtype: 'Highlight', C: c, CA: op, Contents: PDFHexString.fromText(''),
            QuadPoints: [n(r.x), n(r.y + r.h), n(r.x + r.w), n(r.y + r.h), n(r.x), n(r.y), n(r.x + r.w), n(r.y)].map(n) }, ap, an);
        } else if (an.type === 'box') {
          const lw = an.width || 1.5, c = rvb(an.color || '#000000');
          const ap = apparence(c.join(' ') + ' RG ' + n(lw) + ' w ' + n(lw / 2) + ' ' + n(lw / 2) + ' ' + n(an.w - lw) + ' ' + n(an.h - lw) + ' re S', an.w, an.h);
          poser(an, { Subtype: 'Square', C: c, BS: { W: n(lw), S: 'S' }, Contents: PDFHexString.fromText('') }, ap, an);
        } else if (an.type === 'draw') {
          const pts = an.pts || [];
          if (pts.length < 2) continue;
          const lw = an.width || 2, m = lw / 2 + 1, c = rvb(an.color || '#000000');
          const bb0 = annBounds(an);
          const bb = { x: bb0.x - m, y: bb0.y - m, w: bb0.w + 2 * m, h: bb0.h + 2 * m };
          const local = pts.map(q => n(q[0] - bb.x) + ' ' + n(bb.h - (q[1] - bb.y)));
          const ap = apparence(c.join(' ') + ' RG ' + n(lw) + ' w 1 J 1 j ' + local[0] + ' m ' + local.slice(1).map(q => q + ' l').join(' ') + ' S', bb.w, bb.h);
          const enUser = [];
          pts.forEach(q => { const u = toUser(q[0], q[1], g); enUser.push(n(u.x), n(u.y)); });
          poser(an, { Subtype: 'Ink', C: c, BS: { W: n(lw) }, InkList: [enUser], Contents: PDFHexString.fromText('') }, ap, bb);
        } else if (an.type === 'text') {
          const font = await getFont(doc, fonts, an.font, an.bold, an.italic);
          const c = rvb(an.color || '#000000');
          const lh = an.size * 1.25;
          const lignes = (an.lines || []).map((line, i) => {
            const t = winAnsi(line);
            return t ? '1 0 0 1 0 ' + n(an.h - (lh * i + an.size * 0.95)) + ' Tm ' + font.encodeText(t).toString() + ' Tj' : '';
          }).filter(Boolean);
          const ap = apparence('BT /F1 ' + n(an.size) + ' Tf ' + c.join(' ') + ' rg ' + lignes.join(' ') + ' ET', an.w, an.h, { Font: { F1: font.ref } });
          poser(an, { Subtype: 'FreeText', Contents: PDFHexString.fromText(an.text || ''), DA: PDFString.of('/Helv ' + n(an.size) + ' Tf ' + c.join(' ') + ' rg'),
            Q: 0, Border: [0, 0, 0], C: [1, 1, 1], CA: 1 }, ap, an);
        } else if (an.type === 'tampon') {
          const font = await getFont(doc, fonts, 'Helvetica', true, false);
          const c = rvb(an.color || '#C8102E');
          const t = winAnsi(an.text || '');
          const tw = t ? font.widthOfTextAtSize(t, an.size) : 0;
          const lw = an.size * 0.09;
          const contenu = c.join(' ') + ' RG ' + n(lw) + ' w q 1 0 0 1 ' + n(lw / 2) + ' ' + n(lw / 2) + ' cm ' + opsArrondi(an.w - lw, an.h - lw, an.size * 0.25) + ' S Q'
            + (t ? ' BT /F1 ' + n(an.size) + ' Tf ' + c.join(' ') + ' rg 1 0 0 1 ' + n((an.w - tw) / 2) + ' ' + n(an.h / 2 - an.size * 0.35) + ' Tm ' + font.encodeText(t).toString() + ' Tj ET' : '');
          const ap = apparence(contenu, an.w, an.h, { Font: { F1: font.ref } });
          poser(an, { Subtype: 'Stamp', Name: 'BlonayTampon', Contents: PDFHexString.fromText(an.text || ''), C: c, CA: 1 }, ap, an);
        }
        compte++;
      } catch (e) { signaler('Commentaire PDF', e); }
    }
    return compte;
  }

  async function drawAnnotations(doc, page, p, fonts, images, enPlace) {
    const g = pageGeom(p);
    for (const an of p.ann) {
      // Déjà réécrite dans le flux : il ne faut surtout pas la recouvrir.
      if (enPlace && an.type === 'edit' && enPlace.has(an.id)) continue;
      // Un vrai commentaire PDF : posé à part, jamais fondu dans la page.
      if (enCommentaire(an)) continue;
      if (an.type === 'tampon') { await dessinerTampon(doc, page, p, fonts, an); continue; }
      if (an.type === 'highlight' || an.type === 'redact' || an.type === 'box') {
        const r = rectToUser(an, g);
        if (r.w <= 0 || r.h <= 0) continue;
        if (an.type === 'box') {
          page.drawRectangle({ x: r.x, y: r.y, width: r.w, height: r.h, borderColor: pdfColor(an.color), borderWidth: an.width || 1.5, opacity: 0 });
        } else {
          page.drawRectangle({ x: r.x, y: r.y, width: r.w, height: r.h, color: pdfColor(an.color || '#000000'), opacity: an.type === 'highlight' ? (an.opacity == null ? 0.35 : an.opacity) : 1 });
        }
      } else if (an.type === 'edit') {
        const r = rectToUser({ x: an.x, y: an.y, w: an.w, h: annHauteur(an) }, g);
        if (r.w > 0 && r.h > 0) page.drawRectangle({ x: r.x, y: r.y, width: r.w, height: r.h, color: pdfColor(an.bg || '#FFFFFF') });
        if (an.bgImg && an.h0 > 0) {
          const fondImg = await embedDataUrl(doc, images, an.bgImg);
          const coin = toUser(an.x, an.y + an.h0, g);
          page.drawImage(fondImg, { x: coin.x, y: coin.y, width: an.w, height: an.h0, rotate: PDFLib.degrees(g.total) });
        }
        const lignes = an.lignes || [];
        for (let i = 0; i < lignes.length; i++) {
          for (const jeton of lignes[i]) {
            const run = an.runs[jeton.r];
            if (!run || !jeton.t) continue;
            // la police du document ne convient que si sa graisse et son
            // italique sont bien ceux demandes pour ce morceau
            const exacte = run.pol && run.pol.nom && !!run.pol.gras === !!run.gras && !!run.pol.italique === !!run.italique;
            const propre = exacte ? polPourPage(doc, page, run.pol.nom, fonts, p.id) : null;
            const repli = await getFont(doc, fonts, (run.pol && run.pol.genre) || run.genre, run.gras, run.italique);
            dessinerSuites(page, g, {
              text: jeton.t, x: an.x + 1 + jeton.x,
              y: an.y + (an.ly ? an.ly[i] : an.pad + run.size * 0.82),
              size: run.size, color: run.color, propre, repli,
            });
          }
        }
      } else if (an.type === 'text') {
        const font = await getFont(doc, fonts, an.font, an.bold, an.italic);
        const lh = an.size * 1.25;
        (an.lines || []).forEach((line, i) => {
          drawDisplayText(page, g, { text: line, x: an.x, y: an.y + lh * i + an.size * 0.95, size: an.size, font, color: an.color, align: 'left' });
        });
      } else if (an.type === 'draw') {
        const pts = an.pts || [];
        for (let i = 1; i < pts.length; i++) {
          const s = toUser(pts[i - 1][0], pts[i - 1][1], g);
          const e = toUser(pts[i][0], pts[i][1], g);
          page.drawLine({ start: { x: s.x, y: s.y }, end: { x: e.x, y: e.y }, thickness: an.width || 2, color: pdfColor(an.color), lineCap: PDFLib.LineCapStyle.Round });
        }
        if (pts.length === 1) {
          const s = toUser(pts[0][0], pts[0][1], g);
          page.drawCircle({ x: s.x, y: s.y, size: (an.width || 2) / 2, color: pdfColor(an.color) });
        }
      } else if (an.type === 'champ') {
        continue; // posé plus tard, comme vraie case de formulaire
      } else if (an.type === 'image') {
        const img = await embedDataUrl(doc, images, an.data);
        const anchor = toUser(an.x, an.y + an.h, g);
        page.drawImage(img, { x: anchor.x, y: anchor.y, width: an.w, height: an.h, rotate: PDFLib.degrees(g.total), opacity: an.opacity == null ? 1 : an.opacity });
      }
    }
  }

  // Les champs à remplir sont de vraies cases de formulaire PDF : elles
  // restent renseignables dans Acrobat, dans un navigateur, partout. Elles
  // sont posées même sur une page convertie en image : ce sont des objets à
  // part, qui se posent par-dessus.
  async function poserChamps(doc, page, p, fonts, pris) {
    const champs = (p.ann || []).filter(a => a.type === 'champ' && a.w > 2 && a.h > 2);
    if (!champs.length) return;
    const g = pageGeom(p);
    const form = doc.getForm();
    const police = await getFont(doc, fonts, 'Helvetica', false, false);
    for (const a of champs) {
      try {
        const r = rectToUser({ x: a.x, y: a.y, w: a.w, h: a.h }, g);
        if (r.w <= 0 || r.h <= 0) continue;
        const f = form.createTextField(champNom(a, pris));
        if (a.multi) f.enableMultiline();
        if (a.valeur) f.setText(String(a.valeur));
        f.setFontSize(champTaille(a));
        f.addToPage(page, {
          x: r.x, y: r.y, width: r.w, height: r.h, font: police,
          textColor: pdfColor(a.encre || '#111111'),
          backgroundColor: a.fond ? pdfColor(a.fond) : undefined,
          borderColor: a.bordure ? pdfColor(a.bordure) : undefined,
          borderWidth: a.bordure ? 1 : 0,
          rotate: PDFLib.degrees(g.total),
        });
      } catch (e) { console.error(e); }
    }
  }

  async function drawWatermark(doc, page, p, fonts) {
    const wm = state.watermark;
    if (!wm) return;
    const g = pageGeom(p);
    const font = await getFont(doc, fonts, wm.font, wm.bold);
    const o = { text: wm.text, size: wm.size, font, color: wm.color, opacity: wm.opacity, angle: wm.angle, align: 'center' };
    if (wm.mode === 'tile') {
      const stepX = Math.max(120, font.widthOfTextAtSize(winAnsi(wm.text), wm.size) * 1.5);
      const stepY = Math.max(90, wm.size * 4);
      for (let y = stepY / 2; y < g.Hd + stepY; y += stepY) {
        for (let x = stepX / 2; x < g.Wd + stepX; x += stepX) {
          drawDisplayText(page, g, Object.assign({}, o, { x, y }));
        }
      }
    } else {
      const pos = wm.mode === 'top' ? 0.16 : wm.mode === 'bottom' ? 0.86 : 0.5;
      drawDisplayText(page, g, Object.assign({}, o, { x: g.Wd / 2, y: g.Hd * pos }));
    }
  }

  function stampText(tpl, ctx) {
    return String(tpl || '')
      .replace(/\{p\}/g, ctx.p).replace(/\{n\}/g, ctx.n)
      .replace(/\{date\}/g, ctx.date).replace(/\{file\}/g, ctx.file)
      .replace(/\{bates\}/g, ctx.bates);
  }
  async function drawStamp(doc, page, p, fonts, ctx) {
    const st = state.stamp;
    if (!st) return;
    if (st.skipFirst && ctx.i === 0) return;
    const g = pageGeom(p);
    const font = await getFont(doc, fonts, st.font, st.bold);
    const m = st.margin;
    const slots = [
      ['headerLeft', m, m + st.size, 'left'], ['headerCenter', g.Wd / 2, m + st.size, 'center'], ['headerRight', g.Wd - m, m + st.size, 'right'],
      ['footerLeft', m, g.Hd - m, 'left'], ['footerCenter', g.Wd / 2, g.Hd - m, 'center'], ['footerRight', g.Wd - m, g.Hd - m, 'right'],
    ];
    for (const [field, x, y, align] of slots) {
      const text = stampText(st[field], ctx);
      if (!text) continue;
      drawDisplayText(page, g, { text, x, y, size: st.size, font, color: st.color, align });
    }
  }

  async function rasterizePage(p, dpi, quality) {
    const src = srcById(p.src);
    const g = pageGeom(p);
    const page = await src.pdfjs.getPage(p.index + 1);
    const scale = Math.min(6, (dpi || 150) / 72);
    const vp = page.getViewport({ scale, rotation: g.total });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(vp.width));
    canvas.height = Math.max(1, Math.ceil(vp.height));
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    page.cleanup();
    const s = canvas.width / g.Wd;
    await paintAnnotationsOnCanvas(ctx, p, g, s);
    if (p.piece) {
      ctx.save();
      ctx.fillStyle = '#333333'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 ' + (MENTION.size * s) + 'px Helvetica, Arial, sans-serif';
      ctx.fillText(p.piece, (g.Wd - MENTION.marge) * s, MENTION.haut * s);
      ctx.restore();
    }
    return { canvas, g };
  }

  async function paintAnnotationsOnCanvas(ctx, p, g, s) {
    for (const an of p.ann) {
      if (enCommentaire(an)) continue;
      ctx.save();
      if (an.type === 'tampon') {
        ctx.strokeStyle = an.color; ctx.lineWidth = an.size * 0.09 * s;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(an.x * s, an.y * s, an.w * s, an.h * s, an.size * 0.25 * s); else ctx.rect(an.x * s, an.y * s, an.w * s, an.h * s);
        ctx.stroke();
        ctx.fillStyle = an.color; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.font = '700 ' + (an.size * s) + 'px Helvetica, Arial, sans-serif';
        ctx.fillText(an.text || '', (an.x + an.w / 2) * s, (an.y + an.h / 2 + an.size * 0.35) * s);
      } else if (an.type === 'highlight' || an.type === 'redact' || an.type === 'box') {
        if (an.type === 'box') { ctx.strokeStyle = an.color; ctx.lineWidth = (an.width || 1.5) * s; ctx.strokeRect(an.x * s, an.y * s, an.w * s, an.h * s); }
        else {
          ctx.globalAlpha = an.type === 'highlight' ? (an.opacity == null ? 0.35 : an.opacity) : 1;
          ctx.fillStyle = an.color || '#000';
          ctx.fillRect(an.x * s, an.y * s, an.w * s, an.h * s);
        }
      } else if (an.type === 'edit') {
        ctx.fillStyle = an.bg || '#FFFFFF';
        ctx.fillRect(an.x * s, an.y * s, an.w * s, annHauteur(an) * s);
        if (an.bgImg && an.h0 > 0) {
          try { ctx.drawImage(await loadImage(an.bgImg), an.x * s, an.y * s, an.w * s, an.h0 * s); } catch (_) {}
        }
        ctx.textBaseline = 'alphabetic';
        (an.lignes || []).forEach((seg, i) => {
          seg.forEach(jeton => {
            const run = an.runs[jeton.r];
            if (!run || !jeton.t) return;
            const st2 = polAffichageRun(run);
            ctx.font = st2.penche + ' ' + st2.poids + ' ' + (run.size * s) + 'px ' + st2.famille;
            ctx.fillStyle = run.color;
            ctx.fillText(jeton.t, (an.x + 1 + jeton.x) * s, (an.y + an.ly[i]) * s);
          });
        });
      } else if (an.type === 'champ') {
        ctx.restore();
        continue; // posé ensuite, comme vraie case de formulaire
      } else if (an.type === 'text') {
        ctx.fillStyle = an.color;
        const st1 = polAffichage(an);
        ctx.font = st1.penche + ' ' + st1.poids + ' ' + (an.size * s) + 'px ' + st1.famille;
        ctx.textBaseline = 'alphabetic';
        const lh = an.size * 1.25;
        (an.lines || []).forEach((line, i) => ctx.fillText(line, an.x * s, (an.y + lh * i + an.size * 0.95) * s));
      } else if (an.type === 'draw') {
        ctx.strokeStyle = an.color; ctx.lineWidth = (an.width || 2) * s;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        (an.pts || []).forEach((pt, i) => i ? ctx.lineTo(pt[0] * s, pt[1] * s) : ctx.moveTo(pt[0] * s, pt[1] * s));
        ctx.stroke();
      } else if (an.type === 'image') {
        const im = await loadImage(an.data);
        ctx.globalAlpha = an.opacity == null ? 1 : an.opacity;
        ctx.drawImage(im, an.x * s, an.y * s, an.w * s, an.h * s);
      }
      ctx.restore();
    }
  }
  function loadImage(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }

  async function sourceDoc(src, forceFlatten) {
    const doc = await loadLib(src);
    const values = src.formValues;
    if (values && Object.keys(values).length) {
      try {
        const form = doc.getForm();
        Object.keys(values).forEach(name => {
          try {
            const f = form.getField(name);
            const t = fieldKind(f);
            const v = values[name];
            if (t === 'text') f.setText(String(v == null ? '' : v));
            else if (t === 'check') { v ? f.check() : f.uncheck(); }
            else if (t === 'dropdown') { if (v) f.select(String(v)); else if (f.clear) f.clear(); }
            else if (t === 'radio' || t === 'list') { if (v) f.select(String(v)); }
          } catch (_) {}
        });
      } catch (_) {}
    }
    if (forceFlatten || state.flatten) { try { doc.getForm().flatten(); } catch (_) {} }
    return doc;
  }

