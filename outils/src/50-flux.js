  // =====================================================================
  //  Retouche dans le flux de la page
  //  -------------------------------------------------------------------
  //  Un PDF ne contient pas du texte mais des opérateurs de dessin. Pour
  //  corriger un mot sans rien déplacer d'autre, on ne recouvre rien : on
  //  réécrit l'opérande de l'opérateur qui l'affiche, là où il est, et on
  //  rattrape la différence de largeur par un nombre de crénage pour que
  //  la suite de la ligne ne bouge pas d'un poil. C'est ainsi que procède
  //  un éditeur de PDF professionnel.
  // =====================================================================
  const FX_BLANC = new Set([0, 9, 10, 12, 13, 32]);
  const FX_DELIM = new Set([0x28, 0x29, 0x3c, 0x3e, 0x5b, 0x5d, 0x7b, 0x7d, 0x2f, 0x25]);
  const fxBlanc = c => FX_BLANC.has(c);
  const fxRegulier = c => !FX_BLANC.has(c) && !FX_DELIM.has(c);
  const fxTxt = (o, a, b) => { let t = ''; for (let i = a; i < b; i++) t += String.fromCharCode(o[i]); return t; };

  function fxNom(o, a, b) {
    let t = '';
    for (let i = a; i < b; i++) {
      if (o[i] === 0x23 && i + 2 < b) { t += String.fromCharCode(parseInt(fxTxt(o, i + 1, i + 3), 16)); i += 2; }
      else t += String.fromCharCode(o[i]);
    }
    return t;
  }

  // Découpe le flux en jetons, chacun avec sa position en octets.
  function fxJetons(o) {
    const j = [];
    let i = 0;
    const n = o.length;
    while (i < n) {
      const c = o[i];
      if (fxBlanc(c)) { i++; continue; }
      if (c === 0x25) { while (i < n && o[i] !== 10 && o[i] !== 13) i++; continue; }
      const a = i;
      if (c === 0x28) {
        let p = 1; i++;
        while (i < n && p > 0) {
          if (o[i] === 0x5c) { i += 2; continue; }
          if (o[i] === 0x28) p++; else if (o[i] === 0x29) p--;
          i++;
        }
        j.push({ t: 'chaine', hex: false, a, b: i });
        continue;
      }
      if (c === 0x3c && o[i + 1] === 0x3c) { j.push({ t: 'op', v: '<<', a, b: i + 2 }); i += 2; continue; }
      if (c === 0x3c) {
        i++;
        while (i < n && o[i] !== 0x3e) i++;
        i++;
        j.push({ t: 'chaine', hex: true, a, b: i });
        continue;
      }
      if (c === 0x3e && o[i + 1] === 0x3e) { j.push({ t: 'op', v: '>>', a, b: i + 2 }); i += 2; continue; }
      if (c === 0x5b || c === 0x5d || c === 0x7b || c === 0x7d) { j.push({ t: 'op', v: String.fromCharCode(c), a, b: i + 1 }); i++; continue; }
      if (c === 0x2f) {
        i++;
        while (i < n && fxRegulier(o[i])) i++;
        j.push({ t: 'nom', v: fxNom(o, a + 1, i), a, b: i });
        continue;
      }
      if ((c >= 0x30 && c <= 0x39) || c === 0x2b || c === 0x2d || c === 0x2e) {
        i++;
        while (i < n && ((o[i] >= 0x30 && o[i] <= 0x39) || o[i] === 0x2e || o[i] === 0x2d || o[i] === 0x2b || o[i] === 0x45 || o[i] === 0x65)) i++;
        j.push({ t: 'nombre', v: parseFloat(fxTxt(o, a, i)) || 0, a, b: i });
        continue;
      }
      i++;
      while (i < n && fxRegulier(o[i])) i++;
      const nom = fxTxt(o, a, i);
      j.push({ t: 'op', v: nom, a, b: i });
      if (nom === 'ID') {
        // Les octets de l'image suivent, bruts, jusqu'à EI isolé.
        let k = i + 1;
        while (k < n - 1) {
          if (o[k] === 0x45 && o[k + 1] === 0x49 && (k + 2 >= n || fxBlanc(o[k + 2])) && fxBlanc(o[k - 1])) break;
          k++;
        }
        i = Math.min(n, k + 2);
        j.push({ t: 'op', v: 'EI', a: k, b: i });
      }
    }
    return j;
  }

  // Les octets que porte une chaîne, littérale ou hexadécimale.
  function fxOctets(o, jeton) {
    const out = [];
    if (jeton.hex) {
      let h = '';
      for (let i = jeton.a + 1; i < jeton.b - 1; i++) {
        const c = o[i];
        if ((c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102)) h += String.fromCharCode(c);
      }
      if (h.length % 2) h += '0';
      for (let i = 0; i < h.length; i += 2) out.push(parseInt(h.substr(i, 2), 16));
      return out;
    }
    let i = jeton.a + 1;
    const fin = jeton.b - 1;
    while (i < fin) {
      const c = o[i];
      if (c === 0x5c) {
        i++;
        const d = o[i];
        if (d === 0x6e) { out.push(10); i++; }
        else if (d === 0x72) { out.push(13); i++; }
        else if (d === 0x74) { out.push(9); i++; }
        else if (d === 0x62) { out.push(8); i++; }
        else if (d === 0x66) { out.push(12); i++; }
        else if (d >= 0x30 && d <= 0x37) { let v = 0, k = 0; while (k < 3 && o[i] >= 0x30 && o[i] <= 0x37) { v = v * 8 + (o[i] - 0x30); i++; k++; } out.push(v & 0xff); }
        else if (d === 10) { i++; }
        else if (d === 13) { i++; if (o[i] === 10) i++; }
        else { out.push(d); i++; }
        continue;
      }
      out.push(c); i++;
    }
    return out;
  }

  const fxMat = (m, n) => [
    m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5],
  ];

  // Parcourt le flux et rend, pour chaque opérateur d'affichage, sa position
  // réelle sur la page, son texte, et de quoi le réécrire.
  function fxAffichages(o, police) {
    const jetons = fxJetons(o);
    const out = [];
    let ctm = [1, 0, 0, 1, 0, 0];
    const pile = [];
    let Tm = [1, 0, 0, 1, 0, 0], Tlm = [1, 0, 0, 1, 0, 0];
    let Tf = null, Tfs = 0, Tc = 0, Tw = 0, Th = 1, TL = 0, Ts = 0;
    let pol = null;
    const args = [];
    const large = code => (pol && pol.largeur ? pol.largeur(code) : 500) / 1000;
    const avance = oct => {
      let a = 0;
      const pas = pol && pol.composite ? 2 : 1;
      for (let i = 0; i + pas <= oct.length; i += pas) {
        const code = pas === 2 ? ((oct[i] << 8) | oct[i + 1]) : oct[i];
        a += large(code) * Tfs + Tc;
        if (pas === 1 && code === 32) a += Tw;
      }
      return a * Th;
    };
    const lire = oct => {
      let t = '';
      const pas = pol && pol.composite ? 2 : 1;
      for (let i = 0; i + pas <= oct.length; i += pas) {
        const code = pas === 2 ? ((oct[i] << 8) | oct[i + 1]) : oct[i];
        t += (pol && pol.unicode ? pol.unicode(code) : '') || '';
      }
      return t;
    };
    const montrer = (parts, operateur, crochets) => {
      const trm = fxMat([Tfs * Th, 0, 0, Tfs, 0, Ts], fxMat(Tm, ctm));
      let texte = '', larg = 0;
      parts.forEach(p => {
        if (p.nombre != null) { larg += (-p.nombre / 1000) * Tfs * Th; return; }
        texte += lire(p.octets);
        larg += avance(p.octets);
      });
      out.push({
        trm, x: trm[4], y: trm[5], taille: Math.hypot(trm[2], trm[3]) || Math.abs(trm[3]) || Tfs,
        police: Tf, texte, large: larg, parts, operateur, crochets,
        Tfs, Th, Tc, Tw, pol,
      });
      Tm = fxMat([1, 0, 0, 1, larg, 0], Tm);
    };
    for (let k = 0; k < jetons.length; k++) {
      const j = jetons[k];
      if (j.t !== 'op' || j.v === '[' || j.v === ']' || j.v === '<<' || j.v === '>>') { args.push(j); continue; }
      const op = j.v;
      const nb = i => { const t = args[args.length + i]; return t && t.t === 'nombre' ? t.v : 0; };
      if (op === 'q') pile.push({ ctm: ctm.slice(), Tf, Tfs, Tc, Tw, Th, TL, Ts, pol });
      else if (op === 'Q') {
        const e = pile.pop();
        if (e) { ctm = e.ctm; Tf = e.Tf; Tfs = e.Tfs; Tc = e.Tc; Tw = e.Tw; Th = e.Th; TL = e.TL; Ts = e.Ts; pol = e.pol; }
      }
      else if (op === 'cm') ctm = fxMat([nb(-6), nb(-5), nb(-4), nb(-3), nb(-2), nb(-1)], ctm);
      else if (op === 'BT') { Tm = [1, 0, 0, 1, 0, 0]; Tlm = Tm.slice(); }
      else if (op === 'Tf') { const n = args[args.length - 2]; if (n && n.t === 'nom') Tf = n.v; Tfs = nb(-1); pol = police(Tf); }
      else if (op === 'Td') { Tlm = fxMat([1, 0, 0, 1, nb(-2), nb(-1)], Tlm); Tm = Tlm.slice(); }
      else if (op === 'TD') { TL = -nb(-1); Tlm = fxMat([1, 0, 0, 1, nb(-2), nb(-1)], Tlm); Tm = Tlm.slice(); }
      else if (op === 'Tm') { Tlm = [nb(-6), nb(-5), nb(-4), nb(-3), nb(-2), nb(-1)]; Tm = Tlm.slice(); }
      else if (op === 'T*') { Tlm = fxMat([1, 0, 0, 1, 0, -TL], Tlm); Tm = Tlm.slice(); }
      else if (op === 'TL') TL = nb(-1);
      else if (op === 'Tc') Tc = nb(-1);
      else if (op === 'Tw') Tw = nb(-1);
      else if (op === 'Tz') Th = nb(-1) / 100;
      else if (op === 'Ts') Ts = nb(-1);
      else if (op === 'Tj' || op === "'" || op === '"') {
        if (op !== 'Tj') { Tlm = fxMat([1, 0, 0, 1, 0, -TL], Tlm); Tm = Tlm.slice(); }
        if (op === '"') { Tw = nb(-3); Tc = nb(-2); }
        const st = args[args.length - 1];
        if (st && st.t === 'chaine') montrer([{ octets: fxOctets(o, st), jeton: st }], op, [st.a, j.b]);
      } else if (op === 'TJ') {
        let d = args.length - 1;
        while (d >= 0 && !(args[d].t === 'op' && args[d].v === '[')) d--;
        const parts = [];
        for (let q = d + 1; q < args.length; q++) {
          const t = args[q];
          if (t.t === 'chaine') parts.push({ octets: fxOctets(o, t), jeton: t });
          else if (t.t === 'nombre') parts.push({ nombre: t.v });
        }
        if (parts.length) montrer(parts, 'TJ', d >= 0 ? [args[d].a, j.b] : null);
      }
      args.length = 0;
    }
    return out;
  }

  // Les XObjets (images, formulaires) posés par le flux, avec leur boîte en
  // espace utilisateur : sous une zone caviardée, une image garde ses pixels,
  // et la page doit alors être convertie en image.
  function fxXObjets(o) {
    const jetons = fxJetons(o);
    const out = [];
    let ctm = [1, 0, 0, 1, 0, 0];
    const pile = [];
    const args = [];
    for (let k = 0; k < jetons.length; k++) {
      const j = jetons[k];
      if (j.t !== 'op' || j.v === '[' || j.v === ']' || j.v === '<<' || j.v === '>>') { args.push(j); continue; }
      const nb = i => { const t = args[args.length + i]; return t && t.t === 'nombre' ? t.v : 0; };
      if (j.v === 'q') pile.push(ctm.slice());
      else if (j.v === 'Q') { const e = pile.pop(); if (e) ctm = e; }
      else if (j.v === 'cm') ctm = fxMat([nb(-6), nb(-5), nb(-4), nb(-3), nb(-2), nb(-1)], ctm);
      else if (j.v === 'Do' || j.v === 'BI' || j.v === 'sh') {
        const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map(q => [ctm[0] * q[0] + ctm[2] * q[1] + ctm[4], ctm[1] * q[0] + ctm[3] * q[1] + ctm[5]]);
        // Le nom de l'objet posé et l'endroit exact où il est écrit : c'est
        // par là qu'on remplacera l'image par sa version caviardée.
        const dernier = args[args.length - 1];
        const nom = j.v === 'Do' && dernier && dernier.t === 'nom' ? dernier.v : null;
        out.push({
          quoi: j.v, nom, nomA: nom ? dernier.a : 0, nomB: nom ? dernier.b : 0, ctm: ctm.slice(),
          x0: Math.min.apply(null, pts.map(q => q[0])), y0: Math.min.apply(null, pts.map(q => q[1])),
          x1: Math.max.apply(null, pts.map(q => q[0])), y1: Math.max.apply(null, pts.map(q => q[1])),
        });
      }
      args.length = 0;
    }
    return out;
  }
  const zonesSeCroisent = (a, z) => a.x0 < z.x + z.w && a.x1 > z.x && a.y0 < z.y + z.h && a.y1 > z.y;

  // Les lettres d'un affichage dont le centre tombe dans une des zones :
  // des plages [début, fin[ dans son texte.
  function fxGlyphesDans(sh, zones) {
    if (!sh.pol || !sh.trm || !sh.Tfs) return [];
    const pol = sh.pol, pas = pol.composite ? 2 : 1;
    const k = 1 / (sh.Tfs * sh.Th || 1);
    const ax = sh.trm[0] * k, ay = sh.trm[1] * k;
    const hx = sh.trm[2] * 0.3, hy = sh.trm[3] * 0.3;
    const plages = [];
    let cum = 0, pos = 0;
    sh.parts.forEach(part => {
      if (part.nombre != null) { cum += (-part.nombre / 1000) * sh.Tfs * sh.Th; return; }
      const oct = part.octets;
      for (let i = 0; i + pas <= oct.length; i += pas) {
        const code = pas === 2 ? ((oct[i] << 8) | oct[i + 1]) : oct[i];
        let adv = (pol.largeur ? pol.largeur(code) : 500) / 1000 * sh.Tfs + sh.Tc;
        if (pas === 1 && code === 32) adv += sh.Tw;
        adv *= sh.Th;
        const n = ((pol.unicode && pol.unicode(code)) || '').length;
        const cx = sh.x + ax * (cum + adv / 2) + hx, cy = sh.y + ay * (cum + adv / 2) + hy;
        if (n && zones.some(z => cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h)) {
          const d = plages[plages.length - 1];
          if (d && d[1] === pos) d[1] = pos + n; else plages.push([pos, pos + n]);
        }
        cum += adv; pos += n;
      }
    });
    return plages;
  }
  // Réécrit un affichage en remplaçant les plages données par des blancs de
  // même largeur : le reste de la ligne ne bouge pas.
  function fxRecrire(sh, plages) {
    plages.sort((p, q) => p[0] - q[0]);
    const fondues = [];
    plages.forEach(pl => { const d = fondues[fondues.length - 1]; if (d && pl[0] <= d[1]) d[1] = Math.max(d[1], pl[1]); else fondues.push(pl.slice()); });
    const unite = sh.Tfs * sh.Th;
    if (!unite || !sh.crochets) return null;
    const parts = [];
    let pos = 0, total = 0, bon = true;
    const pousser = (texte, blanc) => {
      if (!texte) return;
      const w = fxLargeur(sh.pol, texte, sh);
      if (w == null) { bon = false; return; }
      total += w;
      if (blanc) { parts.push((-w * 1000 / unite).toFixed(3)); return; }
      const hex = fxEncoder(sh.pol, texte);
      if (hex == null) { bon = false; return; }
      parts.push('<' + hex + '>');
    };
    fondues.forEach(([d, f]) => { pousser(sh.texte.slice(pos, d), false); pousser(sh.texte.slice(d, f), true); pos = f; });
    pousser(sh.texte.slice(pos), false);
    if (!bon) return null;
    const reste = sh.large - total;
    if (Math.abs(reste) > 0.001) parts.push((-reste * 1000 / unite).toFixed(3));
    const morceau = '[' + parts.join(' ') + '] TJ';
    const octets = [];
    for (let i = 0; i < morceau.length; i++) octets.push(morceau.charCodeAt(i));
    return { a: sh.crochets[0], b: sh.crochets[1], octets };
  }
  // Les zones à vider d'une page, en espace utilisateur : rectangles
  // caviardés, et blocs dont on a demandé l'effacement réel.
  function fxZonesAVider(p) {
    const g = pageGeom(p);
    const zones = [];
    const avecFond = (r, fond) => { r.fond = fond; return r; };
    (p.ann || []).forEach(an => {
      if (an.type === 'redact') zones.push(avecFond(rectToUser({ x: an.x - 0.5, y: an.y - 0.5, w: an.w + 1, h: an.h + 1 }, g), an.color || '#000000'));
      else if (an.type === 'edit' && an.efface) zones.push(avecFond(rectToUser({ x: an.x, y: an.y, w: an.w, h: an.h0 || annHauteur(an) }, g), an.bg || '#FFFFFF'));
    });
    return zones;
  }
  // L'image posée sous ce nom, si c'en est une : sa définition dans la page.
  function fxImageXObjet(page, nom) {
    const { PDFName } = PDFLib;
    const res = page.node.Resources();
    if (!res || typeof res.lookup !== 'function') return null;
    const xod = res.lookup(PDFName.of('XObject'));
    if (!xod || typeof xod.lookup !== 'function') return null;
    const xo = xod.lookup(PDFName.of(nom));
    const dict = xo && xo.dict ? xo.dict : xo;
    if (!dict || typeof dict.lookup !== 'function') return null;
    const sub = dict.lookup(PDFName.of('Subtype'));
    const quoi = sub && sub.asString ? sub.asString() : String(sub || '');
    if (quoi !== '/Image') return null;
    const nb = cle => { const v = dict.lookup(PDFName.of(cle)); return v && v.asNumber ? v.asNumber() : 0; };
    return { largeur: nb('Width'), hauteur: nb('Height') };
  }
  // Ajoute une image à la page sous un nom neuf (les autres pages qui
  // partagent ces ressources ne perdent rien : on n'écrase aucun nom).
  function fxPoserImage(doc, page, nom, ref) {
    const { PDFName } = PDFLib;
    let res = page.node.Resources();
    if (!res) { res = doc.context.obj({}); page.node.set(PDFName.of('Resources'), res); }
    let xod = res.lookup(PDFName.of('XObject'));
    if (!xod || typeof xod.set !== 'function') { xod = doc.context.obj({}); res.set(PDFName.of('XObject'), xod); }
    xod.set(PDFName.of(nom), ref);
  }

  // Peut-on vider ces zones en gardant la page vectorielle ? Le texte s'y
  // prête presque toujours ; une image sous la zone, elle, doit être
  // refaite — seule cette image-là devient du pixel, pas la page entière.
  // Rend { propre, images } : les images à refaire, ou propre à faux quand
  // il faut convertir toute la page, comme avant.
  function fxCaviardageBilan(doc, page, p, cache) {
    const rien = { propre: false, images: [] };
    const zones = fxZonesAVider(p);
    if (!zones.length) return { propre: true, images: [] };
    let flux = null;
    try { flux = fxFluxPage(doc, page); } catch (e) { signaler('Caviardage', e); return rien; }
    if (!flux) return rien;
    let objets = [];
    try { objets = fxXObjets(flux.octets); } catch (e) { signaler('Caviardage', e); return rien; }
    const images = [];
    for (const o of objets) {
      if (!zones.some(z => zonesSeCroisent(o, z))) continue;
      if (o.quoi !== 'Do' || !o.nom) { signaler('Caviardage', 'un dessin passe sous la zone : la page est convertie en image', 'info'); return rien; }
      // Posée de travers, ou posée plusieurs fois : on ne sait pas la refaire
      // pour ce seul endroit.
      if (Math.abs(o.ctm[1]) > 1e-6 || Math.abs(o.ctm[2]) > 1e-6 || o.ctm[0] <= 0 || o.ctm[3] <= 0) { signaler('Caviardage', 'une image posée de travers passe sous la zone : la page est convertie en image', 'info'); return rien; }
      if (objets.filter(x => x.nom === o.nom).length > 1) { signaler('Caviardage', 'la même image sert à plusieurs endroits : la page est convertie en image', 'info'); return rien; }
      const info = fxImageXObjet(page, o.nom);
      if (!info) { signaler('Caviardage', 'un contenu non reconnu passe sous la zone : la page est convertie en image', 'info'); return rien; }
      images.push(Object.assign({}, o, info));
    }
    let shows = [];
    try { shows = fxAffichages(flux.octets, nom => fxPolice(doc, page, nom, cache)); } catch (e) { signaler('Caviardage', e); return rien; }
    for (const sh of shows) {
      const pl = fxGlyphesDans(sh, zones);
      if (!pl.length) continue;
      if (!sh.pol || !sh.pol.codes || !sh.crochets || fxRecrire(sh, pl) == null) { signaler('Caviardage', 'une police du flux ne se laisse pas réécrire : la page est convertie en image', 'info'); return rien; }
    }
    return { propre: true, images };
  }

  // Refaire les images qui passent sous une zone : la page est rendue une
  // fois, la partie de chaque image est découpée, ce qui doit disparaître y
  // est peint, et cela remplacera l'image d'origine. Le reste de la page ne
  // bouge pas : texte net, fichier léger.
  async function preparerCaviardageImages(p, images) {
    const src = srcById(p.src);
    if (!src || !src.pdfjs || !images.length) return [];
    const zones = fxZonesAVider(p);
    const page = await src.pdfjs.getPage(p.index + 1);
    try {
      const v1 = page.getViewport({ scale: 1, rotation: 0 });
      // Aussi fin que l'image d'origine, sans faire exploser la mémoire.
      let ech = 2;
      images.forEach(o => { const large = Math.max(1, o.x1 - o.x0); if (o.largeur > 0) ech = Math.max(ech, o.largeur / large); });
      ech = Math.max(1, Math.min(ech, 8.4, Math.sqrt(12e6 / Math.max(1, v1.width * v1.height))));
      const vp = page.getViewport({ scale: ech, rotation: 0 });
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.ceil(vp.width)); cv.height = Math.max(1, Math.ceil(vp.height));
      const cx = cv.getContext('2d', { alpha: false });
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
      await page.render({ canvasContext: cx, viewport: vp }).promise;
      const cadre = (x0, y0, x1, y1) => {
        const a = vp.convertToViewportPoint(x0, y1), b = vp.convertToViewportPoint(x1, y0);
        return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1]) };
      };
      const sortie = [];
      for (const o of images) {
        const r = cadre(o.x0, o.y0, o.x1, o.y1);
        const X = Math.max(0, Math.round(r.x)), Y = Math.max(0, Math.round(r.y));
        const W = Math.min(cv.width - X, Math.round(r.w)), H = Math.min(cv.height - Y, Math.round(r.h));
        if (!(W >= 2 && H >= 2)) continue;
        const bout = document.createElement('canvas');
        bout.width = W; bout.height = H;
        const bc = bout.getContext('2d', { alpha: false });
        bc.fillStyle = '#fff'; bc.fillRect(0, 0, W, H);
        bc.drawImage(cv, X, Y, W, H, 0, 0, W, H);
        let touchee = false;
        zones.forEach(z => {
          const q = cadre(z.x, z.y, z.x + z.w, z.y + z.h);
          const zx = q.x - X, zy = q.y - Y;
          if (zx + q.w <= 0 || zy + q.h <= 0 || zx >= W || zy >= H) return;
          bc.fillStyle = z.fond || '#000000';
          bc.fillRect(zx, zy, q.w, q.h);
          touchee = true;
        });
        if (!touchee) continue;
        sortie.push({ nom: o.nom, donnees: bout.toDataURL('image/jpeg', 0.95) });
      }
      return sortie;
    } finally { page.cleanup(); }
  }

  // Applique des remplacements d'octets, du dernier au premier.
  function fxAppliquer(o, edits) {
    const tries = edits.slice().sort((x, y) => y.a - x.a);
    let taille = o.length;
    tries.forEach(e => { taille += e.octets.length - (e.b - e.a); });
    const out = new Uint8Array(taille);
    let src = o.length, dst = taille;
    tries.forEach(e => {
      const queue = src - e.b;
      out.set(o.subarray(e.b, src), dst - queue);
      dst -= queue;
      out.set(e.octets, dst - e.octets.length);
      dst -= e.octets.length;
      src = e.a;
    });
    out.set(o.subarray(0, src), 0);
    return out;
  }

  // Les tables d'une police citée par le flux : largeurs, et code -> lettre.
  function fxPolice(doc, page, nom, cache) {
    const cle = 'fx:' + nom;
    if (cache.has(cle)) return cache.get(cle);
    const { PDFName, PDFDict, PDFArray } = PDFLib;
    let out = null;
    try {
      // Le flux nomme la police par sa clé dans les ressources de la page,
      // et non par son nom de base : c'est donc là qu'il faut la chercher.
      const res = page.node.Resources();
      const table = res && res.lookup(PDFName.of('Font'), PDFDict);
      const fd = table && table.lookup(PDFName.of(nom), PDFDict);
      if (fd) {
        const sous = polNomPdf(fd.get(PDFName.of('Subtype')));
        const composite = sous === 'Type0';
        let df = null;
        if (composite) { try { const arr = fd.lookup(PDFName.of('DescendantFonts'), PDFArray); df = arr && arr.lookup(0, PDFDict); } catch (_) {} }
        const lg = polLargeurs(fd, df);
        // code -> lettre : l'inverse de ce qui sert à écrire.
        const vers = new Map();
        const tu = polFlux(fd.lookup(PDFName.of('ToUnicode')));
        if (tu) polLireToUnicode(tu).vers.forEach((code, ch) => { if (!vers.has(code)) vers.set(code, ch); });
        if (!vers.size && !composite) polWinAnsi().forEach((code, ch) => { if (!vers.has(code)) vers.set(code, ch); });
        let w = lg.w, defaut = lg.defaut;
        if (!w.size && !composite) {
          // Les 14 polices standard n'embarquent pas de table de largeurs :
          // elles sont connues de la bibliothèque.
          const base = polNomPdf(fd.get(PDFName.of('BaseFont'))).replace(/^[A-Z]{6}\+/, '');
          const std = Object.keys(PDFLib.StandardFonts).find(k => PDFLib.StandardFonts[k] === base)
            || Object.keys(PDFLib.StandardFonts).find(k => String(PDFLib.StandardFonts[k]).replace(/-/g, '') === base.replace(/-/g, ''));
          if (std) {
            const sf = doc.embedStandardFont(PDFLib.StandardFonts[std]);
            w = new Map();
            for (let c = 32; c < 256; c++) { try { w.set(c, sf.widthOfTextAtSize(String.fromCharCode(c), 1000)); } catch (_) {} }
          }
        }
        out = {
          composite, taille: composite ? 2 : 1,
          largeur: c => { const v = w.get(c); return v == null ? defaut : v; },
          unicode: c => vers.get(c) || '',
          codes: (() => { const m = new Map(); vers.forEach((ch, code) => { if (!m.has(ch)) m.set(ch, code); }); return m; })(),
        };
      }
    } catch (e) { signaler('Police du flux', e); }
    if (!out) out = { composite: false, taille: 1, largeur: () => 500, unicode: () => '', codes: new Map() };
    cache.set(cle, out);
    return out;
  }

  // Combien de pages du document se partagent chaque flux de contenu. Un flux
  // n'est retiré du fichier que s'il ne sert plus qu'à la page réécrite.
  function fxPartageContenus(doc) {
    if (doc.__fxContenus) return doc.__fxContenus;
    const { PDFName, PDFArray } = PDFLib;
    const m = new Map();
    const compter = r => { if (r == null) return; const k = String(r); m.set(k, (m.get(k) || 0) + 1); };
    try {
      doc.getPages().forEach(pg => {
        const c = pg.node.get(PDFName.of('Contents'));
        if (c instanceof PDFArray) { for (let i = 0; i < c.size(); i++) compter(c.get(i)); }
        else compter(c);
      });
    } catch (e) { signaler('Écriture du flux', e); }
    doc.__fxContenus = m;
    return m;
  }

  // Le flux de la page, concaténé, et de quoi le réécrire.
  function fxFluxPage(doc, page) {
    const { PDFArray, decodePDFRawStream, PDFName } = PDFLib;
    const c = page.node.Contents();
    if (!c) return null;
    const morceaux = [];
    const lire = flux => { try { return decodePDFRawStream(flux).decode(); } catch (_) { return null; } };
    if (c instanceof PDFArray) {
      for (let i = 0; i < c.size(); i++) {
        const d = lire(doc.context.lookup(c.get(i)));
        if (!d) return null;
        morceaux.push(d);
      }
    } else {
      const d = lire(c);
      if (!d) return null;
      morceaux.push(d);
    }
    let n = 0;
    morceaux.forEach(m => { n += m.length + 1; });
    const octets = new Uint8Array(n);
    let k = 0;
    morceaux.forEach(m => { octets.set(m, k); k += m.length; octets[k++] = 10; });
    return {
      octets,
      ecrire(nouveaux) {
        // L'ancien flux ne doit pas rester dans le fichier : la page ne le
        // montre plus, mais il y serait encore, en clair, et le texte caviardé
        // se relirait dans les octets. On le retire donc du document, sauf
        // s'il sert aussi à une autre page.
        const anciens = [];
        const avant = page.node.get(PDFName.of('Contents'));
        if (avant instanceof PDFArray) { for (let i = 0; i < avant.size(); i++) anciens.push(avant.get(i)); }
        else if (avant != null) anciens.push(avant);
        const flux = doc.context.flateStream(nouveaux);
        const ref = doc.context.register(flux);
        page.node.set(PDFName.of('Contents'), ref);
        const partage = fxPartageContenus(doc);
        anciens.forEach(r => {
          try {
            if (!r || typeof r.objectNumber !== 'number') return;
            if ((partage.get(String(r)) || 0) > 1) return;
            doc.context.delete(r);
          } catch (e) { signaler('Écriture du flux', e); }
        });
      },
    };
  }

  // Écrit un texte avec les codes de la police du document.
  function fxEncoder(pol, texte) {
    let h = '';
    for (const ch of String(texte)) {
      const c = pol.codes.get(ch);
      if (c == null) return null;
      let x = (c & 0xFFFF).toString(16).toUpperCase();
      while (x.length < pol.taille * 2) x = '0' + x;
      h += x;
    }
    return h;
  }
  function fxLargeur(pol, texte, sh) {
    let a = 0;
    for (const ch of String(texte)) {
      const c = pol.codes.get(ch);
      if (c == null) return null;
      a += pol.largeur(c) / 1000 * sh.Tfs + sh.Tc;
      if (pol.taille === 1 && c === 32) a += sh.Tw;
    }
    return a * sh.Th;
  }

  // Ce qu'il faut réécrire dans le flux pour que cette correction prenne
  // effet — sans rien déplacer d'autre. Rend null si le cas sort de ce que
  // l'on sait faire proprement : on recouvrira alors, comme avant.
  const fxNon = r => { try { (window.__fxDiag = window.__fxDiag || []).push(r); } catch (_) {} signaler('Correction posée par-dessus plutôt que réécrite dans la page', r, 'info'); return null; };
  function fxEdit(a, shows, g) {
    const o = a.origine;
    if (!o || !o.ancres.length) return fxNon('pas d ancres');
    const vieux = o.texte, neuf = runsTexte(a.runs);
    if (vieux === neuf) return [];
    let P = 0;
    while (P < vieux.length && P < neuf.length && vieux[P] === neuf[P]) P++;
    let S = 0;
    while (S < vieux.length - P && S < neuf.length - P && vieux[vieux.length - 1 - S] === neuf[neuf.length - 1 - S]) S++;
    const finV = vieux.length - S;
    const milieu = neuf.slice(P, neuf.length - S);
    // Le style des morceaux touchés doit être resté le même : changer une
    // taille ou un gras ne se fait pas dans le flux d'origine.
    if (!fxMemeStyle(a, o, P, finV)) return fxNon('style change');
    let touchees = o.ancres.filter(an => an.i < finV && an.i + an.n > P);
    if (!touchees.length) touchees = o.ancres.filter(an => an.i <= P && an.i + an.n >= P).slice(0, 1);
    if (!touchees.length) return fxNon('aucune ancre touchee');
    // Plusieurs morceaux voisins : ils doivent se suivre sans trou, et tomber
    // dans le même affichage — on les traite alors comme un seul.
    const prem = touchees[0], der = touchees[touchees.length - 1];
    for (let i = 1; i < touchees.length; i++) {
      if (touchees[i].i !== touchees[i - 1].i + touchees[i - 1].n) return fxNon('morceaux non contigus');
      if (Math.abs(touchees[i].dy - prem.dy) > 0.6) return fxNon('morceaux sur des lignes differentes');
    }
    const an = { i: prem.i, n: der.i + der.n - prem.i, dx: prem.dx, dy: prem.dy };
    if (P < an.i || finV > an.i + an.n) return fxNon('changement a cheval');
    let ancienBout = vieux.slice(an.i, an.i + an.n);
    let nouveauBout = ancienBout.slice(0, P - an.i) + milieu + ancienBout.slice(finV - an.i);

    // Quel affichage du flux porte ce morceau ?
    const u = toUser(an.dx, an.dy, g);
    const sh = shows.find(z => Math.abs(z.y - u.y) < 0.8 && u.x >= z.x - 0.8 && u.x <= z.x + z.large + 0.8);
    if (!sh) return fxNon('aucun affichage en ' + u.x.toFixed(1) + ',' + u.y.toFixed(1));
    if (!sh.pol || !sh.crochets) return fxNon('affichage sans police');
    // L'espace ajoutée en fin de ligne pour lier deux lignes n'existe pas
    // dans le flux : on la laisse de côté, tant que le changement ne la touche pas.
    const queue = /\s+$/.exec(ancienBout);
    if (queue && sh.texte.indexOf(ancienBout) < 0 && finV <= an.i + an.n - queue[0].length) {
      ancienBout = ancienBout.slice(0, -queue[0].length);
      nouveauBout = nouveauBout.slice(0, -queue[0].length);
    }
    const k = sh.texte.indexOf(ancienBout);
    if (k < 0) return fxNon('bout introuvable : ' + JSON.stringify(ancienBout) + ' dans ' + JSON.stringify(sh.texte));
    if (sh.texte.indexOf(ancienBout, k + 1) >= 0) return fxNon('bout ambigu');
    const avant = sh.texte.slice(0, k), apres = sh.texte.slice(k + ancienBout.length);
    const texteNeuf = avant + nouveauBout + apres;
    const hex = fxEncoder(sh.pol, texteNeuf);
    if (hex == null) return fxNon('lettre hors police');
    const lNeuf = fxLargeur(sh.pol, texteNeuf, sh);
    if (lNeuf == null) return fxNon('largeur inconnue');
    // Réécrire sur place ne sait pas replier le texte : si le nouveau mot
    // ne tient plus dans la place disponible, il mordrait sur ce qui suit.
    // On repasse alors par le recouvrement, qui sait replier le paragraphe.
    // Une ligne centrée grandit des deux côtés, une ligne calée à droite
    // grandit vers la gauche : le début recule d'autant.
    const part = a.aligne === 'centre' ? 0.5 : a.aligne === 'droite' ? 1 : 0;
    const dx = -(lNeuf - sh.large) * part;
    if (dx < -fxPlaceGauche(sh, shows) - 0.01) return fxNon('trop long a gauche');
    if (lNeuf + dx > sh.large + fxPlace(sh, shows, a, g) + 0.01) return fxNon('trop long pour la place');
    // Le crénage rattrape la différence : ce qui suit sur la ligne ne bouge
    // pas d'un poil, exactement comme dans un éditeur professionnel.
    const unite = sh.Tfs * sh.Th;
    const n0 = unite ? -dx * 1000 / unite : 0;
    const n1 = unite ? -(sh.large - lNeuf - dx) * 1000 / unite : 0;
    const morceau = '[' + (Math.abs(n0) > 0.001 ? n0.toFixed(3) + ' ' : '') + '<' + hex + '>' + (Math.abs(n1) > 0.001 ? ' ' + n1.toFixed(3) : '') + '] TJ';
    const octets = [];
    for (let i = 0; i < morceau.length; i++) octets.push(morceau.charCodeAt(i));
    return [{ a: sh.crochets[0], b: sh.crochets[1], octets }];
  }

  // La place libre à gauche d'un affichage : jusqu'au précédent sur la même
  // ligne, ou jusqu'à la marge gauche du texte de la page.
  function fxPlaceGauche(sh, shows) {
    let debut = -Infinity, bord = Infinity;
    shows.forEach(z => {
      bord = Math.min(bord, z.x);
      if (z === sh || Math.abs(z.y - sh.y) > 0.5) return;
      const fin = z.x + z.large;
      if (fin < sh.x - 0.5 && fin > debut) debut = fin;
    });
    if (debut === -Infinity) debut = Math.min(bord, sh.x);
    return Math.max(0, sh.x - debut);
  }

  // La place libre à droite d'un affichage : jusqu'au prochain sur la même
  // ligne, ou jusqu'au bord droit du bloc.
  function fxPlace(sh, shows, a, g) {
    let fin = Infinity, bord = 0;
    shows.forEach(z => {
      bord = Math.max(bord, z.x + z.large);
      if (z === sh || Math.abs(z.y - sh.y) > 0.5) return;
      if (z.x > sh.x + 0.5 && z.x < fin) fin = z.x;
    });
    // Rien après sur la ligne : la seule limite est la marge droite du
    // document, celle que le texte atteint ailleurs sur la page.
    if (fin === Infinity) fin = Math.max(bord, sh.x + sh.large);
    return Math.max(0, fin - (sh.x + sh.large));
  }

  // Le texte a-t-il seulement changé de lettres, sans changer de style ?
  function fxMemeStyle(a, o, P, finV) {
    if (!o.styles) return true;
    let pos = 0, vu = null;
    for (const r of a.runs) {
      const fin = pos + r.t.length;
      if (fin > P && pos < Math.max(finV, P + 1)) {
        const cle = [Math.round(r.size * 100), r.gras ? 1 : 0, r.italique ? 1 : 0, r.color, r.pol ? r.pol.nom : ''].join('|');
        if (vu == null) vu = cle; else if (vu !== cle) return false;
      }
      pos = fin;
    }
    return vu == null || o.styles.indexOf(vu) >= 0;
  }

  // Réécrit dans le flux de la page tout ce qui peut l'être ; rend la liste
  // des corrections ainsi faites, qu'il ne faudra donc pas recouvrir.
  // Quand une correction ne peut pas être réécrite sur place, le texte
  // d'origine est au moins effacé du flux sous le recouvrement : chaque
  // morceau ancré devient un blanc de même largeur, le reste de la ligne ne
  // bouge pas, et plus rien n'est à retrouver par copier-coller.
  function fxEffacerTous(annots, shows, g, exclus, parShowDonne) {
    const parShow = parShowDonne || new Map();
    annots.forEach(a => {
      const o = a.origine;
      if (!o || !o.ancres.length) return;
      const plages = [];
      for (const an of o.ancres) {
        const bout = o.texte.slice(an.i, an.i + an.n).replace(/^\s+|\s+$/g, '');
        if (!bout) continue;
        const u = toUser(an.dx, an.dy, g);
        const sh = shows.find(z => Math.abs(z.y - u.y) < 0.8 && u.x >= z.x - 0.8 && u.x <= z.x + z.large + 0.8);
        if (!sh || !sh.pol || !sh.crochets || exclus.has(sh)) return;
        const k = sh.texte.indexOf(bout);
        if (k < 0 || sh.texte.indexOf(bout, k + 1) >= 0) return;
        plages.push([sh, k, k + bout.length]);
      }
      // Tout le bloc ou rien : un effacement à moitié serait pire.
      plages.forEach(([sh, d, f]) => { if (!parShow.has(sh)) parShow.set(sh, []); parShow.get(sh).push([d, f]); });
    });
    return parShow;
  }

  function fxRetoucher(doc, page, p, cache, renommages) {
    const faits = new Set();
    const cibles = (p.ann || []).filter(a => a.type === 'edit' && !a.efface && a.origine);
    if (!cibles.length && !fxZonesAVider(p).length && !(renommages && renommages.size)) return faits;
    let flux = null, shows = null;
    try {
      flux = fxFluxPage(doc, page);
      if (!flux) return faits;
      shows = fxAffichages(flux.octets, nom => fxPolice(doc, page, nom, cache));
    } catch (e) { signaler('Lecture du flux', e); return faits; }
    const g = pageGeom(p);
    // D'abord les zones à vider (caviardage, effacement réel) : les lettres
    // qui y tombent deviennent des blancs, affichage par affichage.
    const parShow = new Map();
    const zones = fxZonesAVider(p);
    if (zones.length) shows.forEach(sh => { const pl = fxGlyphesDans(sh, zones); if (pl.length) parShow.set(sh, pl); });
    const remplacements = [];
    const recouvertes = [];
    cibles.forEach(a => {
      let r = null;
      try { r = fxEdit(a, shows, g); } catch (e) { signaler('Retouche dans le flux', e); }
      // Un affichage à la fois réécrit sur place et caviardé : la retouche
      // se pose par-dessus, le caviardage l'emporte.
      if (r && r.some(x => Array.from(parShow.keys()).some(sh => sh.crochets && sh.crochets[0] === x.a))) r = null;
      if (r) { remplacements.push.apply(remplacements, r); faits.add(a.id); }
      else recouvertes.push(a);
    });
    if (remplacements.length) {
      const tries = remplacements.slice().sort((x, y) => x.a - y.a);
      for (let i = 1; i < tries.length; i++) {
        if (tries[i].a < tries[i - 1].b) { signaler('Retouche dans le flux', 'des retouches se chevauchent : elles sont posées par-dessus'); return new Set(); }
      }
    }
    // Les blocs recouverts : leur texte d'origine s'efface, sauf dans un
    // affichage déjà réécrit sur place.
    if (recouvertes.length) {
      const pris = new Set();
      shows.forEach(sh => { if (sh.crochets && remplacements.some(r => r.a === sh.crochets[0])) pris.add(sh); });
      try { fxEffacerTous(recouvertes, shows, g, pris, parShow); } catch (e) { signaler('Effacement dans le flux', e); }
    }
    for (const [sh, plages] of parShow) {
      const r = fxRecrire(sh, plages);
      if (r) remplacements.push(r);
      else signaler('Effacement dans le flux', 'un affichage n\'a pas pu être réécrit ; son texte reste sous le recouvrement');
    }
    // L'image refaite prend la place de l'ancienne, là où la page la pose.
    if (renommages && renommages.size) {
      try {
        fxXObjets(flux.octets).forEach(o => {
          const neuf = o.nom && renommages.get(o.nom);
          if (neuf && o.nomB > o.nomA) remplacements.push({ a: o.nomA, b: o.nomB, octets: new TextEncoder().encode('/' + neuf) });
        });
      } catch (e) { signaler('Caviardage', e); }
    }
    if (remplacements.length) {
      try { flux.ecrire(fxAppliquer(flux.octets, remplacements)); }
      catch (e) { signaler('Écriture du flux', e); return new Set(); }
    }
    return faits;
  }

  function polPourPage(doc, page, nom, cache, cle) {
    const k = 'police:' + cle + ':' + nom;
    if (cache.has(k)) return cache.get(k);
    let f = null;
    try { f = polReprise(doc, page, nom); } catch (e) { signaler('Police du document', e); }
    cache.set(k, f);
    return f;
  }

