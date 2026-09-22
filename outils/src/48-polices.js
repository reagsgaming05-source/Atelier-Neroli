  // =====================================================================
  //  Polices du document
  // =====================================================================
  // Pour qu'une ligne corrigee garde exactement la police de la page, on
  // s'appuie sur deux choses. A l'ecran : la fonte que pdf.js a deja
  // installee dans le navigateur pour dessiner la page -- c'est la police
  // embarquee dans le PDF, glyphe pour glyphe. A l'export : l'objet
  // police du PDF lui-meme, reutilise tel quel, sans le reencapsuler.
  // Quand le PDF n'embarque pas sa police (les 14 polices standard), on
  // retombe sur la standard correspondante, qui est la meme police.

  const POL_CONNUES = {
    arial: 'Arial', arialnarrow: 'Arial Narrow', arialblack: 'Arial Black',
    arialunicodems: 'Arial Unicode MS', helvetica: 'Helvetica', helveticaneue: 'Helvetica Neue',
    timesnewroman: 'Times New Roman', times: 'Times New Roman', timesroman: 'Times New Roman',
    couriernew: 'Courier New', courier: 'Courier New',
    calibri: 'Calibri', cambria: 'Cambria', cambriamath: 'Cambria Math',
    segoeui: 'Segoe UI', candara: 'Candara', constantia: 'Constantia', corbel: 'Corbel',
    consolas: 'Consolas', georgia: 'Georgia', verdana: 'Verdana', tahoma: 'Tahoma',
    trebuchetms: 'Trebuchet MS', palatinolinotype: 'Palatino Linotype', bookantiqua: 'Book Antiqua',
    garamond: 'Garamond', centurygothic: 'Century Gothic', franklingothicbook: 'Franklin Gothic Book',
    lucidasansunicode: 'Lucida Sans Unicode', lucidaconsole: 'Lucida Console',
    bookmanoldstyle: 'Bookman Old Style', comicsansms: 'Comic Sans MS', impact: 'Impact',
    symbol: 'Symbol', wingdings: 'Wingdings',
    liberationserif: 'Liberation Serif', liberationsans: 'Liberation Sans',
    liberationmono: 'Liberation Mono', dejavusans: 'DejaVu Sans', dejavuserif: 'DejaVu Serif',
    dejavusansmono: 'DejaVu Sans Mono', freesans: 'FreeSans', freeserif: 'FreeSerif',
    roboto: 'Roboto', opensans: 'Open Sans', lato: 'Lato', montserrat: 'Montserrat',
    notosans: 'Noto Sans', notoserif: 'Noto Serif', inter: 'Inter', poppins: 'Poppins',
    sourcesanspro: 'Source Sans Pro', ptsans: 'PT Sans', nunito: 'Nunito', ubuntu: 'Ubuntu',
  };

  // « ABCDEF+TimesNewRomanPS-BoldItalicMT » donne « Times New Roman ».
  function polFamilles(base) {
    const brut = String(base || '').replace(/^[A-Z]{6}\+/, '').replace(/[,_]/g, '-');
    const tete = (brut.split('-').filter(Boolean)[0] || '').replace(/\s+/g, '');
    const court = tete.replace(/(PSMT|PSM|MT|PS|LT|Std|Pro|Roman)$/i, '') || tete;
    const cle = t => t.toLowerCase().replace(/[^a-z0-9]/g, '');
    const out = [];
    const pousse = v => { if (v && out.indexOf(v) < 0) out.push(v); };
    pousse(POL_CONNUES[cle(tete)]);
    pousse(POL_CONNUES[cle(court)]);
    pousse(court.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').trim());
    pousse(court);
    return out.filter(Boolean);
  }

  function polStyle(base, o) {
    if (o && o.missingFile) return { gras: !!(o.bold || o.black), italique: !!o.italic };
    const s = String(base || '').toLowerCase();
    return {
      gras: /bold|black|heavy|semib|demib|extrab|ultrab|-bd|-blk/.test(s),
      italique: /italic|oblique|-it$|-it-/.test(s),
    };
  }

  // Famille de repli parmi les 14 polices standard du PDF.
  function polGenre(base, o, style) {
    const s = String(base || '').toLowerCase();
    if (/mono|courier|consol|typewriter/.test(s)) return 'Courier';
    const fb = String((o && o.fallbackName) || (style && style.fontFamily) || '');
    if (/mono/.test(fb)) return 'Courier';
    if (/serif|times|roman|georgia|garamond|cambria|palatino|bookman|minion|century|caslon|baskerville|didot|utopia|charter|constantia/.test(s)) {
      return /sans/.test(s) ? 'Helvetica' : 'Times';
    }
    if (/^serif$/.test(fb)) return 'Times';
    return 'Helvetica';
  }

  // La fonte installee par pdf.js rend-elle vraiment quelque chose ?
  const polFaces = new Map();
  function polFaceUtilisable(nom) {
    if (polFaces.has(nom)) return polFaces.get(nom);
    let ok = false;
    try {
      ok = document.fonts.check('16px "' + nom + '"');
      if (ok) {
        if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
        measureCtx.font = '32px "' + nom + '"';
        ok = measureCtx.measureText('Hn0').width > 0;
      }
    } catch (_) { ok = false; }
    polFaces.set(nom, ok);
    return ok;
  }

  function polDescripteur(o, style) {
    const base = o && o.name ? String(o.name) : '';
    const st = polStyle(base, o);
    const familles = polFamilles(base);
    const face = o && !o.missingFile && !o.isType3Font && o.loadedName ? String(o.loadedName) : null;
    const propre = !!(face && polFaceUtilisable(face));
    // Toujours entre guillemets : un nom de police peut commencer par un
    // chiffre ou porter des signes qui casseraient la declaration entiere.
    const cite = n => '"' + String(n).replace(/["\\]/g, '') + '"';
    const pile = [];
    if (propre) pile.push(cite(face));
    familles.forEach(n => { const v = cite(n); if (pile.indexOf(v) < 0) pile.push(v); });
    const genre = polGenre(base, o, style);
    pile.push(genre === 'Times' ? 'serif' : genre === 'Courier' ? 'monospace' : 'sans-serif');
    return {
      nom: base, genre, gras: st.gras, italique: st.italique,
      familles, lisible: familles[0] || genre,
      face: propre ? face : null,
      css: pile.join(', '),
      // La fonte embarquee porte deja sa graisse et son italique : les
      // reappliquer donnerait un gras de synthese par-dessus un vrai gras.
      poids: propre ? '400' : (st.gras ? '700' : '400'),
      penche: propre ? 'normal' : (st.italique ? 'italic' : 'normal'),
    };
  }

  // Catalogue des polices d'une page, repere via pdf.js.
  async function polDeLaPage(pdfPage, tc) {
    const noms = [];
    tc.items.forEach(it => { if (it.fontName && noms.indexOf(it.fontName) < 0) noms.push(it.fontName); });
    const co = pdfPage.commonObjs;
    if (noms.some(n => !(co && co.has && co.has(n)))) {
      // Les objets police n'existent qu'une fois la page interpretee.
      try { await pdfPage.getOperatorList(); } catch (_) {}
    }
    const map = new Map();
    noms.forEach(n => {
      let o = null;
      try { if (co && co.has && co.has(n)) o = co.get(n); } catch (_) { o = null; }
      map.set(n, polDescripteur(o, tc.styles && tc.styles[n]));
    });
    return map;
  }

  // Style d'affichage d'une annotation de texte, police du document comprise.
  function polAffichage(a) {
    if (a.pol && a.pol.css) return { famille: a.pol.css, poids: a.pol.poids, penche: a.pol.penche };
    return { famille: famOf(a.font), poids: a.bold ? '700' : '400', penche: a.italic ? 'italic' : 'normal' };
  }

  // ---------------------------------------------------------------------
  //  Cote export : reprise de l'objet police d'origine
  // ---------------------------------------------------------------------
  function polNomPdf(n) {
    return String(n == null ? '' : n).replace(/^\//, '')
      .replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  }

  function polTrouverDict(doc, page, nom) {
    const { PDFName, PDFDict, PDFRef } = PDFLib;
    let res = null, fonts = null;
    try { res = page.node.Resources(); } catch (_) { return null; }
    if (!res) return null;
    try { fonts = res.lookup(PDFName.of('Font'), PDFDict); } catch (_) { return null; }
    if (!fonts) return null;
    const cible = String(nom).replace(/[,_]/g, '-');
    const nu = t => t.replace(/^[A-Z]{6}\+/, '').toLowerCase();
    let exact = null, proche = null, seule = null, n = 0;
    fonts.keys().forEach(k => {
      let d = null;
      try { d = fonts.lookup(k, PDFDict); } catch (_) { return; }
      if (!d) return;
      n++;
      const cand = { dict: d, val: fonts.get(k) };
      seule = cand;
      const base = polNomPdf(d.get(PDFName.of('BaseFont'))).replace(/[,_]/g, '-');
      if (base === cible) { if (!exact) exact = cand; }
      else if (nu(base) === nu(cible)) { if (!proche) proche = cand; }
    });
    const pris = exact || proche || (n === 1 ? seule : null);
    if (!pris) return null;
    pris.ref = pris.val instanceof PDFRef ? pris.val : doc.context.register(pris.dict);
    return pris;
  }

  function polFlux(obj) {
    if (!obj) return null;
    try {
      if (obj instanceof PDFLib.PDFRawStream) return PDFLib.decodePDFRawStream(obj).decode();
      if (typeof obj.getContents === 'function') return obj.getContents();
    } catch (_) {}
    return null;
  }

  // Lecture du CMap /ToUnicode : il donne, pour chaque code de la police,
  // le caractere qu'il represente. Inverse, il dit quel code ecrire.
  function polLireToUnicode(octets) {
    const txt = new TextDecoder('latin1').decode(octets);
    const vers = new Map();
    let taille = 0;
    const cs = /begincodespacerange([\s\S]*?)endcodespacerange/.exec(txt);
    if (cs) { const m = /<([0-9A-Fa-f]+)>/.exec(cs[1]); if (m) taille = Math.max(1, Math.round(m[1].length / 2)); }
    const dec = hex => {
      let s = '';
      for (let i = 0; i + 4 <= hex.length; i += 4) s += String.fromCharCode(parseInt(hex.substr(i, 4), 16));
      return s;
    };
    const ajout = (code, s) => {
      if (!s || Array.from(s).length !== 1) return;   // ligatures : hors jeu
      if (!vers.has(s)) vers.set(s, code);
    };
    let b, m;
    const rxC = /beginbfchar([\s\S]*?)endbfchar/g;
    while ((b = rxC.exec(txt))) {
      const rx = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g;
      while ((m = rx.exec(b[1]))) ajout(parseInt(m[1], 16), dec(m[2]));
    }
    const rxR = /beginbfrange([\s\S]*?)endbfrange/g;
    while ((b = rxR.exec(txt))) {
      const rx = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]*)>|\[([\s\S]*?)\])/g;
      while ((m = rx.exec(b[1]))) {
        const lo = parseInt(m[1], 16);
        const hi = Math.min(parseInt(m[2], 16), lo + 65535);
        if (m[3] != null) {
          const base = dec(m[3]);
          if (!base) continue;
          const tete = base.slice(0, -1), fin = base.charCodeAt(base.length - 1);
          for (let c = lo; c <= hi; c++) ajout(c, tete + String.fromCharCode((fin + (c - lo)) & 0xFFFF));
        } else {
          let i = 0, mm; const rx2 = /<([0-9A-Fa-f]*)>/g;
          while ((mm = rx2.exec(m[4]))) { ajout(lo + i, dec(mm[1])); i++; }
        }
      }
    }
    return { vers, taille };
  }

  // Codes 128-159 de WinAnsi : ils ne suivent pas Latin-1.
  const POL_CP1252 = {
    128: '€', 130: '‚', 131: 'ƒ', 132: '„', 133: '…', 134: '†',
    135: '‡', 136: 'ˆ', 137: '‰', 138: 'Š', 139: '‹', 140: 'Œ',
    142: 'Ž', 145: '‘', 146: '’', 147: '“', 148: '”', 149: '•',
    150: '–', 151: '—', 152: '˜', 153: '™', 154: 'š', 155: '›',
    156: 'œ', 158: 'ž', 159: 'Ÿ',
  };
  let polWinAnsiMap = null;
  function polWinAnsi() {
    if (polWinAnsiMap) return polWinAnsiMap;
    const m = new Map();
    for (let c = 32; c <= 255; c++) {
      const s = (c >= 127 && c <= 159) ? POL_CP1252[c] : String.fromCharCode(c);
      if (s && !m.has(s)) m.set(s, c);
    }
    polWinAnsiMap = m;
    return m;
  }

  function polLargeurs(fd, df) {
    const { PDFName, PDFArray } = PDFLib;
    const w = new Map();
    let defaut = df ? 1000 : 0;
    const nb = v => (v && typeof v.asNumber === 'function' ? v.asNumber() : null);
    if (df) {
      try { const d = nb(df.lookup(PDFName.of('DW'))); if (d != null) defaut = d; } catch (_) {}
      try {
        const arr = df.lookup(PDFName.of('W'), PDFArray);
        let i = 0;
        while (arr && i < arr.size()) {
          const c1 = nb(arr.lookup(i));
          if (c1 == null) break;
          const suite = arr.lookup(i + 1);
          if (suite instanceof PDFArray) {
            for (let k = 0; k < suite.size(); k++) { const v = nb(suite.lookup(k)); if (v != null) w.set(c1 + k, v); }
            i += 2;
          } else {
            const c2 = nb(suite), v = nb(arr.lookup(i + 2));
            if (c2 == null || v == null) break;
            for (let c = c1; c <= c2 && c - c1 < 65536; c++) w.set(c, v);
            i += 3;
          }
        }
      } catch (_) {}
    } else {
      try {
        const dsc = fd.lookup(PDFName.of('FontDescriptor'));
        if (dsc && typeof dsc.lookup === 'function') { const mw = nb(dsc.lookup(PDFName.of('MissingWidth'))); if (mw != null) defaut = mw; }
      } catch (_) {}
      try {
        const premier = nb(fd.lookup(PDFName.of('FirstChar')));
        const arr = fd.lookup(PDFName.of('Widths'), PDFArray);
        if (arr && premier != null) {
          for (let i = 0; i < arr.size(); i++) { const v = nb(arr.lookup(i)); if (v != null) w.set(premier + i, v); }
        }
      } catch (_) {}
    }
    return { w, defaut };
  }

  // Rend une police pdf-lib qui pointe sur l'objet police deja present
  // dans le PDF : aucun glyphe n'est recree, ce sont les memes.
  function polReprise(doc, page, nom) {
    const { PDFName, PDFDict, PDFArray, PDFHexString, PDFFont } = PDFLib;
    const trouve = polTrouverDict(doc, page, nom);
    if (!trouve) return null;
    const fd = trouve.dict;
    const sous = polNomPdf(fd.get(PDFName.of('Subtype')));
    if (sous === 'Type3') return null;
    const composite = sous === 'Type0';
    let df = null;
    if (composite) {
      // Seul l'encodage Identity laisse ecrire les codes directement ;
      // avec un CMap predefini les largeurs ne seraient plus alignees.
      if (!/^Identity/.test(polNomPdf(fd.get(PDFName.of('Encoding'))))) return null;
      try { const arr = fd.lookup(PDFName.of('DescendantFonts'), PDFArray); df = arr && arr.lookup(0, PDFDict); } catch (_) {}
      if (!df) return null;
    }
    let codes = null, taille = composite ? 2 : 1;
    const tu = polFlux(fd.lookup(PDFName.of('ToUnicode')));
    if (tu) {
      const r = polLireToUnicode(tu);
      if (r.vers.size) { codes = r.vers; if (r.taille) taille = r.taille; }
    }
    if (!codes && !composite) {
      const enc = fd.get(PDFName.of('Encoding'));
      const encNom = polNomPdf(enc);
      const differences = enc && typeof enc.lookup === 'function';
      if (!differences && (encNom === 'WinAnsiEncoding' || (!enc && /^(TrueType|Type1|MMType1)$/.test(sous)))) codes = polWinAnsi();
    }
    if (!codes) return null;
    const lg = polLargeurs(fd, df);
    if (!lg.w.size) return null;   // sans table de largeurs, rien de sur

    const large = code => { const v = lg.w.get(code); return (v == null ? lg.defaut : v) / 1000; };
    const hex = n => { let s = (n & 0xFFFFFF).toString(16).toUpperCase(); while (s.length < taille * 2) s = '0' + s; return s; };

    const f = Object.create(PDFFont.prototype);
    f.ref = trouve.ref;
    f.doc = doc;
    f.name = 'PoliceDoc';
    f.duDocument = true;
    f.connait = ch => codes.has(ch);
    f.encodeText = t => {
      let s = '';
      for (const ch of String(t)) { const c = codes.get(ch); if (c != null) s += hex(c); }
      return PDFHexString.of(s);
    };
    f.widthOfTextAtSize = (t, size) => {
      let w = 0;
      for (const ch of String(t)) { const c = codes.get(ch); if (c != null) w += large(c); }
      return w * size;
    };
    f.glyphCountOfText = t => Array.from(String(t)).length;
    f.heightAtSize = s => s;
    f.sizeAtHeight = h => h;
    f.embed = () => Promise.resolve();
    return f;
  }

