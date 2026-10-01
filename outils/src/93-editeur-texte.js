  // =====================================================================
  //  Modification du texte existant
  // =====================================================================
  // Les lignes de texte de la page, repérées dans le repère affiché.
  // Les blocs de texte de la page. Les morceaux sont d'abord regroupes en
  // lignes, puis les lignes en paragraphes : c'est le paragraphe entier
  // qu'on corrige, sinon une correction laisse les autres lignes en place.
  async function edLignes() {
    const p = edPage();
    if (!p) return [];
    const cle = p.id + ':' + p.rot;
    if (ed.lignesCle === cle && ed.lignes) return ed.lignes;
    const r = await edLignesDe(p);
    ed.polices = r.polices;
    ed.lignes = r.blocs;
    ed.lignesCle = cle;
    return ed.lignes;
  }
  // Les blocs de texte d'une page, quelle qu'elle soit (l'éditeur, mais
  // aussi remplacer partout, qui passe sur tout le document).
  async function edLignesDe(p) {
    const src = srcById(p.src);
    const g = pageGeom(p);
    const morceaux = [];
    let polices = new Map();
    try {
      const page = await src.pdfjs.getPage(p.index + 1);
      const vp = page.getViewport({ scale: 1, rotation: g.total });
      const tc = await page.getTextContent();
      polices = await polDeLaPage(page, tc);
      tc.items.forEach(it => {
        if (!it.str || !it.str.trim()) return;
        const m = pdfjs.Util.transform(vp.transform, it.transform);
        const geo = morceauGeom(m, it.width > 0 ? it.width : 0);
        if (geo.size < 1) return;
        // Un texte posé de côté ou à l'envers ne se corrige pas en ligne.
        if (geo.vertical || geo.envers) return;
        morceaux.push({
          str: it.str, x: geo.x, base: geo.base, size: geo.size,
          w: it.width > 0 ? it.width : geo.size * it.str.length * 0.5,
          pol: polices.get(it.fontName) || null,
        });
      });
      page.cleanup();
      // Une page reconnue par l'OCR : ses mots font des morceaux comme les
      // autres, et se corrigent de la même façon (le fond est relevé sur
      // l'image, le texte corrigé écrit par-dessus).
      if (!morceaux.length && p.ocr && p.ocr.mots) {
        p.ocr.mots.forEach(m => morceaux.push({ str: m.t, x: m.x, base: ocrBase(m), size: ocrCorps(m), w: m.w, pol: null }));
      }
    } catch (e) { console.error(e); }
    return { blocs: edParagraphes(morceaux, g), polices: Array.from(new Set(polices.values())) };
  }

  function edNouvelleLigne(m) {
    const l = {
      x: m.x, base: m.base, size: 0, droite: m.x, bouts: [],
      texte() { return this.bouts.map(b => b.t).join(''); },
      // Une espace à la charnière de deux morceaux écartés.
      espace() {
        const d = this.bouts[this.bouts.length - 1];
        if (!d) return;
        const q = d.pos[d.pos.length - 1];
        if (q && !/\s$/.test(q.t)) { q.t += ' '; d.t += ' '; }
      },
      pousser(n) {
        const d = this.bouts[this.bouts.length - 1];
        if (d && d.pol === n.pol && Math.abs(d.size - n.size) < 0.2) {
          d.t += n.str; d.x1 = n.x + n.w;
          d.pos.push({ t: n.str, x: n.x, w: n.w });
        } else {
          this.bouts.push({ t: n.str, pol: n.pol, size: n.size, x0: n.x, x1: n.x + n.w,
            pos: [{ t: n.str, x: n.x, w: n.w }] });
        }
        this.droite = Math.max(this.droite, n.x + n.w);
        this.size = Math.max(this.size, n.size);
      },
      finir() {
        // Le nettoyage porte sur les morceaux ; le texte du bout s'en déduit,
        // pour que les deux disent toujours la même chose.
        const tous = [];
        this.bouts.forEach(b => b.pos.forEach(q => { q.t = q.t.replace(/\s+/g, ' '); tous.push(q); }));
        if (tous.length) {
          tous[0].t = tous[0].t.replace(/^\s+/, '');
          tous[tous.length - 1].t = tous[tous.length - 1].t.replace(/\s+$/, '');
        }
        this.bouts.forEach(b => { b.pos = b.pos.filter(q => q.t.length); b.t = b.pos.map(q => q.t).join(''); });
        this.bouts = this.bouts.filter(b => b.t.length);
        const haut = this.base - this.size * 0.82 - 1;
        this.bouts.forEach(b => { b.y0 = haut; b.h0 = this.size * 1.18 + 2; });
        const dominant = this.bouts.reduce((m, b) => (!m || b.t.length > m.t.length ? b : m), null);
        this.pol = dominant ? dominant.pol : null;
      },
    };
    l.pousser(m);
    return l;
  }

  // Les bandes verticales que le texte ne traverse jamais : ce sont les
  // gouttières entre colonnes. Elles disent où couper une ligne de base qui
  // court d'une colonne à l'autre.
  function edRivieres(brutes, g) {
    const n = Math.max(8, Math.ceil(g.Wd));
    const couv = new Uint16Array(n + 2);
    brutes.forEach(b => b.items.forEach(m => {
      const a = Math.max(0, Math.floor(m.x)), z = Math.min(n, Math.ceil(m.x + m.w));
      for (let i = a; i < z; i++) couv[i]++;
    }));
    let xmin = 0; while (xmin < n && !couv[xmin]) xmin++;
    let xmax = n - 1; while (xmax > xmin && !couv[xmax]) xmax--;
    const tailles = [];
    brutes.forEach(b => b.items.forEach(m => tailles.push(m.size)));
    tailles.sort((a, b) => a - b);
    const corps = tailles.length ? tailles[Math.floor(tailles.length / 2)] : 10;
    const mini = Math.max(6, corps * 1.4);
    // Un titre ou un pied de page peut enjamber une gouttière sans qu'elle
    // cesse d'en être une.
    const toleres = Math.floor(brutes.length * 0.08);
    const out = [];
    let i = xmin;
    while (i <= xmax) {
      if (couv[i] > toleres) { i++; continue; }
      let j = i;
      while (j <= xmax && couv[j] <= toleres) j++;
      if (j - i >= mini) out.push([i, j]);
      i = j;
    }
    return out;
  }

  function edParagraphes(morceaux, g) {
    morceaux.sort((a, b) => (a.base - b.base) || (a.x - b.x));

    // --- 1er temps : tout ce qui partage une ligne de base, sans rien couper.
    const brutes = [];
    let R = null;
    morceaux.forEach(m => {
      if (R && Math.abs(m.base - R.base) <= Math.max(1.2, R.size * 0.3) && m.x >= R.x - 1) {
        R.items.push(m);
        R.droite = Math.max(R.droite, m.x + m.w);
        R.size = Math.max(R.size, m.size);
        return;
      }
      R = { base: m.base, x: m.x, droite: m.x + m.w, size: m.size, items: [m] };
      brutes.push(R);
    });

    // --- 2e temps : couper aux gouttières, pour séparer les colonnes.
    const rivieres = edRivieres(brutes, g);
    const segments = [];
    brutes.forEach(b => {
      let seg = null;
      b.items.forEach(m => {
        const traverse = seg && rivieres.some(r => r[0] >= seg.droite - 1 && r[1] <= m.x + 1);
        if (seg && !traverse) {
          seg.items.push(m);
          seg.droite = Math.max(seg.droite, m.x + m.w);
          seg.size = Math.max(seg.size, m.size);
          return;
        }
        seg = { base: b.base, x: m.x, droite: m.x + m.w, size: m.size, items: [m] };
        segments.push(seg);
      });
    });

    // Le bord droit de chaque colonne : c'est lui qui dit si une ligne est
    // justifiée ou non.
    const bandes = [];
    let prec = 0;
    rivieres.forEach(r => { bandes.push([prec, r[0]]); prec = r[1]; });
    bandes.push([prec, Math.max(g.Wd, prec + 1)]);
    const bandeDe = seg => {
      for (let i = 0; i < bandes.length; i++) if (seg.x >= bandes[i][0] - 1 && seg.x < bandes[i][1] + 1) return i;
      return bandes.length - 1;
    };
    const bords = new Map();
    segments.forEach(s => {
      const i = bandeDe(s);
      bords.set(i, Math.max(bords.get(i) || 0, s.droite));
    });

    // --- 3e temps : couper là où un blanc n'est pas une espace.
    // Une ligne qui touche le bord droit de sa colonne est justifiée : ses
    // blancs sont étirés exprès, parfois beaucoup, et il ne faut pas y
    // couper. Une ligne qui s'arrête avant ne justifie rien — un grand blanc
    // y sépare deux choses distinctes : deux libellés, deux cases, deux
    // pastilles.
    const lignes = [];
    segments.forEach(s => {
      const nb = bandeDe(s);
      const bord = bords.get(nb) || s.droite;
      const plein = s.droite >= bord - Math.max(1.5, s.size * 0.4);
      let L = null;
      s.items.forEach(m => {
        const plafond = m.size * (plein ? 6 : 1.5);
        if (L && m.x - L.droite <= plafond) {
          if (m.x - L.droite > m.size * 0.12 && !/\s$/.test(L.texte())) L.espace();
          L.pousser(m);
          return;
        }
        L = edNouvelleLigne(m);
        L.bande = nb;
        lignes.push(L);
      });
    });
    lignes.forEach(l => l.finir());

    // --- rythme de la page : l'interligne le plus courant sert de repere.
    // Un écart plus large qu'une interligne ordinaire marque un changement
    // de paragraphe, quel que soit le pas choisi par le document. Les écarts
    // se mesurent colonne par colonne : deux lignes côte à côte dans deux
    // colonnes ne se suivent pas.
    const utiles = lignes.filter(l => l.bouts.length);
    const colonnes = new Map();
    utiles.forEach(l => {
      const k = l.bande == null ? 0 : l.bande;
      if (!colonnes.has(k)) colonnes.set(k, []);
      colonnes.get(k).push(l);
    });
    const ecarts = [];
    colonnes.forEach(ls => {
      for (let i = 1; i < ls.length; i++) {
        const a = ls[i - 1], b = ls[i];
        const d = b.base - a.base;
        if (d > 0 && d < a.size * 3 && Math.abs(a.size - b.size) < a.size * 0.1) ecarts.push(d);
      }
    });
    ecarts.sort((a, b) => a - b);
    const rythme = ecarts.length ? ecarts[Math.floor(ecarts.length / 2)] : 0;

    // --- paragraphes : lignes qui se suivent, meme bord gauche, meme corps
    const blocs = [];
    colonnes.forEach(ls => {
    let B = null;
    ls.forEach(l => {
      if (B) {
        const prec = B.lignes[B.lignes.length - 1];
        const saut = l.base - prec.base;
        const corps = Math.max(prec.size, l.size, 1);
        const attendu = rythme > 0 ? rythme : corps * 1.2;
        // La ligne precedente s'arretait-elle bien avant le bord ? Alors elle
        // finissait son paragraphe, et la suivante en ouvre un autre.
        const bord = B.lignes.length > 1 ? B.droite : l.droite;
        const courte = prec.droite < bord - corps * 4;
        // Un titre n'entre pas dans le paragraphe qui le suit : ni le corps
        // ni la police ne concordent.
        if (l.pol === prec.pol && !courte
          && Math.abs(l.size - prec.size) <= Math.max(0.35, prec.size * 0.08)
          && Math.abs(l.x - B.x) <= corps * 1.8
          && saut > attendu * 0.55 && saut < Math.min(attendu * 1.35, corps * 2.4)) {
          B.lignes.push(l); B.sauts.push(saut);
          B.x = Math.min(B.x, l.x);
          B.droite = Math.max(B.droite, l.droite);
          return;
        }
      }
      B = { lignes: [l], sauts: [], x: l.x, droite: l.droite };
      blocs.push(B);
    });
    });
    return blocs.map(edBloc).filter(b => b.text.trim() && b.w > 1);
  }

  function edBloc(b) {
    const lignes = b.lignes;
    const premiere = lignes[0], derniere = lignes[lignes.length - 1];
    const corps = lignes.reduce((m, l) => Math.max(m, l.size), 0) || 10;
    const x = b.x - 1;
    const y = premiere.base - corps * 0.82 - 1;
    const sauts = b.sauts.slice().sort((p, q) => p - q);
    const interligne = sauts.length ? sauts[Math.floor(sauts.length / 2)] : corps * 1.18;
    // Justifie : toutes les lignes sauf la derniere s'arretent au meme bord.
    // Il en faut au moins deux pour conclure : sur un paragraphe de deux
    // lignes, la premiere touche forcement le bord et ne prouve rien.
    const justifie = lignes.length >= 3
      && lignes.slice(0, -1).every(l => Math.abs(l.droite - b.droite) < Math.max(1.2, corps * 0.2));
    // Centré : les lignes, de largeurs différentes, partagent le même
    // milieu. Calé à droite : elles partagent le même bord droit, pas le
    // même bord gauche. Une seule ligne ne dit rien : la place autour d'elle
    // le dira (voir edPlaceLigne).
    let aligne = justifie ? 'justifie' : 'gauche';
    if (!justifie && lignes.length >= 2) {
      const gauches = lignes.map(l => Math.min.apply(null, l.bouts.map(z => z.x0)));
      const largeurs = lignes.map((l, i) => l.droite - gauches[i]);
      const centres = lignes.map((l, i) => (gauches[i] + l.droite) / 2);
      const cm = centres.reduce((t, c) => t + c, 0) / centres.length;
      const variete = Math.max.apply(null, largeurs) - Math.min.apply(null, largeurs);
      if (variete > corps * 1.5 && centres.every(c => Math.abs(c - cm) < Math.max(1.5, corps * 0.3))) aligne = 'centre';
      else if (variete > corps * 1.5 && lignes.every(l => Math.abs(l.droite - b.droite) < Math.max(1.2, corps * 0.2))) aligne = 'droite';
    }
    // Des lignes qui coulent se rejoignent par une espace ; une liste, ou
    // une ligne qui s'arretait bien avant le bord, garde son retour.
    const puce = t => /^\s*([-\u2013\u2014\u2022\u00b7\u25cf\u25aa*]|\d{1,2}[.)])\s/.test(t);
    const bouts = [];
    lignes.forEach((l, i) => {
      if (i && bouts.length) {
        const d = bouts[bouts.length - 1];
        const prec = lignes[i - 1];
        const rupture = puce(l.bouts.map(z => z.t).join('')) || prec.droite < b.droite - corps * 4;
        const q = d.pos && d.pos[d.pos.length - 1];
        if (rupture) {
          d.t = d.t.replace(/\s+$/, '') + '\n';
          if (q) q.t = q.t.replace(/\s+$/, '') + '\n';
        } else if (!/[\s-]$/.test(d.t)) {
          d.t += ' ';
          if (q) q.t += ' ';
        }
      }
      l.bouts.forEach(z => bouts.push(z));
    });
    return {
      x, y, w: b.droite - b.x + 2, h: (derniere.base + corps * 0.36) - y + 1,
      base: premiere.base, size: corps, interligne,
      aligne,
      bouts, text: bouts.map(z => z.t).join(''),
      lignesBouts: lignes.map(l => l.bouts),
      lignesBase: lignes.map(l => l.base),
    };
  }

  // Rendu net d'une zone de la page. À la taille d'affichage, une lettre de
  // dix points ne fait qu'un pixel d'épaisseur : son cœur n'atteint jamais
  // sa vraie densité et la couleur relevée ressortirait délavée.
  async function edZoneNette(zone, corps, pageVoulue) {
    const p = pageVoulue || edPage();
    const src = srcById(p.src);
    const g = pageGeom(p);
    const echelle = Math.min(6, Math.max(2.5, 36 / Math.max(4, corps || 11)));
    const page = await src.pdfjs.getPage(p.index + 1);
    const vp = page.getViewport({ scale: echelle, rotation: g.total });
    const cv = document.createElement('canvas');
    cv.width = Math.max(2, Math.ceil((zone.w + 4) * echelle));
    cv.height = Math.max(2, Math.ceil((zone.h + 4) * echelle));
    const ctx = cv.getContext('2d', { alpha: false, willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.translate(-(zone.x - 2) * echelle, -(zone.y - 2) * echelle);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    page.cleanup();
    return { cv, echelle, x0: zone.x - 2, y0: zone.y - 2 };
  }

  function recalcAnn(a) {
    // Une retouche de ligne est faite de morceaux ; le texte ajoute, lui,
    // n'a qu'un seul style.
    if (a.type === 'edit') { recalcRuns(a); return; }
    a.lines = wrapText(a.text || '', a.w, a.size, a.font, a.bold, polAffichage(a));
    a.h = Math.max(1, a.lines.length) * a.size * 1.25;
  }

  // La place libre à gauche et à droite d'une ligne, en points : jusqu'au
  // trait d'une cellule ou à toute autre encre (relevée sur un rendu de la
  // rangée), au texte voisin sur la même ligne, ou aux marges du texte de
  // la page. C'est elle qui dit si la ligne est centrée ou calée à droite,
  // et jusqu'où elle peut grandir sans se replier.
  async function edPlaceLigne(cible, lignes, fond, pageVoulue) {
    const p = pageVoulue || edPage();
    const g = pageGeom(p);
    const fin = cible.x + cible.w;
    let gauche = cible.x, droite = Math.max(0, g.Wd - fin);
    lignes.forEach(l => {
      if (l === cible || l.y + l.h < cible.y + 1 || l.y > cible.y + cible.h - 1) return;
      if (l.x + l.w <= cible.x + 0.5) gauche = Math.min(gauche, cible.x - (l.x + l.w));
      if (l.x >= fin - 0.5) droite = Math.min(droite, l.x - fin);
    });
    try {
      const bande = { x: Math.max(0, cible.x - gauche - 2), y: cible.y, w: 0, h: cible.h };
      bande.w = Math.min(g.Wd, fin + droite + 2) - bande.x;
      const net = await edZoneNette(bande, cible.size, p);
      const k = net.echelle, W = net.cv.width;
      const d = net.cv.getContext('2d').getImageData(0, 0, W, net.cv.height).data;
      const ref = [parseInt(fond.slice(1, 3), 16), parseInt(fond.slice(3, 5), 16), parseInt(fond.slice(5, 7), 16)];
      const rangs = [0.3, 0.5, 0.7].map(f => Math.min(net.cv.height - 1, Math.max(0, Math.round((cible.y - net.y0 + cible.h * f) * k))));
      const libre = px => {
        let n = 0;
        for (const r of rangs) { const i = (r * W + px) * 4; if (Math.abs(d[i] - ref[0]) + Math.abs(d[i + 1] - ref[1]) + Math.abs(d[i + 2] - ref[2]) < 48) n++; }
        return n >= 2;
      };
      let px = Math.round((cible.x - 1.5 - net.x0) * k), n = 0;
      const bord0 = Math.max(0, Math.round((bande.x - net.x0) * k));
      while (px > bord0 && libre(px)) { px--; n++; }
      gauche = Math.min(gauche, n / k + 1.5);
      px = Math.round((fin + 1.5 - net.x0) * k); n = 0;
      const bord1 = Math.min(W - 1, Math.round((bande.x + bande.w - net.x0) * k));
      while (px < bord1 && libre(px)) { px++; n++; }
      droite = Math.min(droite, n / k + 1.5);
    } catch (e) { signaler('Place autour de la ligne', e); }
    return { gauche: Math.max(0, gauche), droite: Math.max(0, droite) };
  }

  async function edModifierTexte(pt, point) {
    // Deja corrigee : on rouvre la retouche au lieu d'en empiler une seconde.
    const deja = (edPage().ann || []).filter(x => x.type === 'edit')
      .find(x => pt.x >= x.x - 1 && pt.x <= x.x + x.w + 1 && pt.y >= x.y - 1 && pt.y <= x.y + annHauteur(x) + 1);
    if (deja) { ed.sel = deja.id; edEditRuns(deja, { point }); return; }
    const lignes = await edLignes();
    const cible = lignes.find(l => pt.x >= l.x - 2 && pt.x <= l.x + l.w + 2 && pt.y >= l.y - 1 && pt.y <= l.y + l.h + 1);
    if (!cible) {
      setLast(lignes.length ? 'Aucun texte à cet endroit.' : 'Cette page ne contient pas de texte : c\'est une image ou un scan.');
      toast(lignes.length ? 'Cliquez sur un paragraphe encadré.' : 'Aucun texte modifiable sur cette page : lancez d\'abord Outils › Reconnaître le texte (OCR).', 'warn');
      return;
    }
    const a = await edFabriquerRetouche(edPage(), cible, lignes);
    edCommit(a);
    edEditRuns(a, { nouveau: true, point });
  }

  // La retouche d'un bloc : son fond relevé, ses morceaux avec leur
  // police et leur couleur, sa mise en page d'origine — prête à être posée.
  async function edFabriquerRetouche(p, cible, lignes) {
    let net = await edZoneNette({ x: cible.x, y: cible.y, w: cible.w, h: cible.h }, cible.size, p);
    let couleurs = edCouleurs({ x: cible.x, y: cible.y, w: cible.w, h: cible.h }, net);
    if (!couleurs.encre) couleurs.encre = '#111111';
    // Une ligne seule — cellule d'un tableau, titre, libellé — se juge à la
    // place qui l'entoure : centrée entre deux traits, calée contre le
    // droit, ou simplement à gauche. Son cadre s'étend à cette place : elle
    // peut grandir sans se replier, et rester centrée en grandissant.
    let aligne = cible.aligne;
    let zone = { x: cible.x, y: cible.y, w: cible.w, h: cible.h };
    if ((cible.lignesBouts || []).length === 1 && aligne !== 'justifie') {
      const place = await edPlaceLigne(cible, lignes, couleurs.fond || '#FFFFFF', p);
      const tol = Math.max(2, cible.size * 0.25);
      if (place.gauche > 1.5 && Math.abs(place.gauche - place.droite) <= tol) aligne = 'centre';
      else if (place.droite <= Math.max(6, cible.size * 0.6) && place.gauche > place.droite * 3 + 4) aligne = 'droite';
      else aligne = 'gauche';
      // Jamais jusqu'au trait lui-même, et pas au-delà du raisonnable.
      const plafond = Math.max(cible.w, 160);
      const aG = aligne === 'gauche' ? 0 : Math.min(plafond, Math.max(0, place.gauche - 1));
      const aD = aligne === 'droite' ? 0 : Math.min(plafond, Math.max(0, place.droite - 1));
      if (aG || aD) {
        zone = { x: cible.x - aG, y: cible.y, w: cible.w + aG + aD, h: cible.h };
        net = await edZoneNette(zone, cible.size, p);
        const c2 = edCouleurs(zone, net);
        if (c2 && c2.fond) couleurs = Object.assign({}, couleurs, { fond: c2.fond });
      }
    }
    const releve = edFond(zone, net, cible.size, couleurs);
    // Couleur relevee morceau par morceau : un paragraphe peut porter un mot
    // dans une autre teinte, et le reprendre en noir se verrait.
    const enRun = b => {
      let encre = couleurs.encre;
      if (b.x1 - b.x0 > 7 && b.h0) {
        const c = edCouleurs({ x: b.x0 - 1, y: b.y0, w: b.x1 - b.x0 + 2, h: b.h0 }, net);
        if (c && c.encre) encre = c.encre;
      }
      return {
        t: b.t, pol: b.pol, polSrc: b.pol, genre: (b.pol && b.pol.genre) || 'Helvetica',
        gras: !!(b.pol && b.pol.gras), italique: !!(b.pol && b.pol.italique),
        size: b.size, color: encre,
      };
    };
    const a = {
      id: -1, type: 'edit',
      x: zone.x, y: zone.y, w: zone.w, h: zone.h, pad: 1,
      h0: cible.h, b0: cible.base - cible.y, interligne: cible.interligne, aligne,
      // Ce sur quoi une ligne centrée ou calée à droite reste alignée.
      centreX: cible.x + cible.w / 2, droiteX: cible.x + cible.w,
      runs: cible.bouts.map(enRun), size: cible.size, color: couleurs.encre,
      bg: releve.uni || couleurs.fond, bgImg: releve.img || null, efface: false, marge: 0,
    };
    // Le texte d'origine ne doit pas se replier autrement qu'avant : la
    // largeur mesuree ici ne colle jamais au millimetre a celle inscrite
    // dans le PDF, et un cheveu de trop ajouterait une ligne au bloc.
    let plusLarge = 0;
    (cible.lignesBouts || []).forEach(bs => {
      plusLarge = Math.max(plusLarge, bs.reduce((w, b) => w + mesurerRun(b.t, enRun(b)), 0));
    });
    a.marge = Math.max(0, plusLarge + 0.5 - (a.w - 2));
    a.text = runsTexte(a.runs);
    // On note où se trouve, sur la page, chaque morceau du texte d'origine.
    // C'est ce qui permettra, à l'export, de retrouver l'opérateur qui
    // l'affiche et de le réécrire sur place au lieu de le recouvrir.
    const ancres = [];
    const styles = [];
    let pos = 0;
    (cible.lignesBouts || []).forEach((bs, li) => {
      const base = cible.lignesBase && cible.lignesBase[li] != null ? cible.lignesBase[li] : cible.base;
      bs.forEach(b => {
        (b.pos || []).forEach(q => {
          if (q.t) ancres.push({ i: pos, n: q.t.length, dx: q.x + 0.5, dy: base - 0.5 });
          pos += q.t.length;
        });
        const cle = [Math.round(b.size * 100), b.pol && b.pol.gras ? 1 : 0, b.pol && b.pol.italique ? 1 : 0,
          couleurs.encre, b.pol ? b.pol.nom : ''].join('|');
        if (styles.indexOf(cle) < 0) styles.push(cle);
      });
    });
    a.origine = { texte: a.text, ancres, styles };
    edPoserOrigine(a, cible);
    return a;
  }

  async function edRenderPage() {
    edFermerSaisie();
    // (les commentaires retirés sont effacés du rendu plus bas, après le rendu de la page)
    const p = edPage();
    if (!p) { closeEditor(); return; }
    const g = pageGeom(p);
    const i = pageIndex(p.id);
    ed.label.textContent = (i + 1) + ' / ' + state.pages.length;
    const stageRect = ed.stage.getBoundingClientRect();
    let z;
    if (ed.zoom === 'fit') {
      z = Math.min((stageRect.width - 48) / g.Wd, (stageRect.height - 48) / g.Hd);
      z = Math.max(0.1, Math.min(z, 3));
    } else z = parseFloat(ed.zoom);
    ed.scale = z;
    const cssW = Math.round(g.Wd * z), cssH = Math.round(g.Hd * z);
    ed.sheet.style.width = cssW + 'px';
    ed.sheet.style.height = cssH + 'px';
    ed.svg.setAttribute('viewBox', '0 0 ' + g.Wd.toFixed(2) + ' ' + g.Hd.toFixed(2));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const src = srcById(p.src);
    try {
      const page = await src.pdfjs.getPage(p.index + 1);
      const vp = page.getViewport({ scale: z * dpr, rotation: g.total });
      ed.canvas.width = Math.max(1, Math.ceil(vp.width));
      ed.canvas.height = Math.max(1, Math.ceil(vp.height));
      const ctx = ed.canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ed.canvas.width, ed.canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      try { await effacerRetraits(ctx, page, vp, p); } catch (e) { signaler('Commentaires', e); }
      page.cleanup();
    } catch (e) { console.error(e); }
    edDrawOverlay();
  }

  function edDrawOverlay(skipSide) {
    const p = edPage();
    if (!p) return;
    const svg = ed.svg;
    svg.replaceChildren();
    const picking = ed.tool === 'select';
    p.ann.forEach(a => {
      const n = annNode(a, true);
      if (!n) return;
      n.style.pointerEvents = 'none';
      svg.appendChild(n);
      if (!picking) return;
      const bb = annBounds(a);
      if (a.type === 'draw') {
        const hit = document.createElementNS(SVGNS, 'polyline');
        hit.setAttribute('points', a.pts.map(pt => pt[0].toFixed(2) + ',' + pt[1].toFixed(2)).join(' '));
        hit.setAttribute('fill', 'none');
        hit.setAttribute('stroke', 'transparent');
        hit.setAttribute('stroke-width', Math.max(a.width || 2, 10 / ed.scale));
        hit.setAttribute('data-ann', a.id);
        hit.setAttribute('class', 'hit');
        svg.appendChild(hit);
      } else {
        const hit = document.createElementNS(SVGNS, 'rect');
        hit.setAttribute('x', bb.x); hit.setAttribute('y', bb.y);
        hit.setAttribute('width', Math.max(2, bb.w)); hit.setAttribute('height', Math.max(2, bb.h));
        hit.setAttribute('fill', 'transparent');
        hit.setAttribute('data-ann', a.id);
        hit.setAttribute('class', 'hit');
        svg.appendChild(hit);
      }
    });
    const mention = mentionNode(p, pageGeom(p));
    if (mention) { mention.style.pointerEvents = 'none'; svg.appendChild(mention); }
    svg.classList.toggle('texte', ed.tool === 'edittext');
    if (ed.tool === 'edittext' && ed.lignes && ed.lignesCle === p.id + ':' + p.rot) {
      ed.lignes.forEach((l, i) => {
        const r = document.createElementNS(SVGNS, 'rect');
        r.setAttribute('class', 'bloc' + (ed.chaud === i ? ' chaud' : ''));
        r.setAttribute('x', l.x - 1); r.setAttribute('y', l.y - 1);
        r.setAttribute('width', l.w + 2); r.setAttribute('height', l.h + 2);
        r.dataset.bloc = i;
        svg.appendChild(r);
      });
    }
    const sel = p.ann.find(a => a.id === ed.sel);
    if (sel && !(ed.saisie && ed.saisie.a === sel)) {
      const bb = annBounds(sel);
      const r = document.createElementNS(SVGNS, 'rect');
      r.setAttribute('class', 'sel-box');
      r.setAttribute('x', bb.x - 2); r.setAttribute('y', bb.y - 2);
      r.setAttribute('width', bb.w + 4); r.setAttribute('height', bb.h + 4);
      r.style.pointerEvents = 'none';
      svg.appendChild(r);
      if (sel.type !== 'draw') {
        const h = document.createElementNS(SVGNS, 'rect');
        const hs = 9 / ed.scale;
        h.setAttribute('class', 'handle');
        h.setAttribute('x', bb.x + bb.w - hs / 2); h.setAttribute('y', bb.y + bb.h - hs / 2);
        h.setAttribute('width', hs); h.setAttribute('height', hs);
        h.dataset.handle = '1';
        svg.appendChild(h);
      }
    }
    if (!skipSide) edSide();
  }

  function edPt(e) {
    const r = ed.svg.getBoundingClientRect();
    const g = pageGeom(edPage());
    return {
      x: Math.max(0, Math.min(g.Wd, (e.clientX - r.left) / r.width * g.Wd)),
      y: Math.max(0, Math.min(g.Hd, (e.clientY - r.top) / r.height * g.Hd)),
    };
  }

  function edPointerDown(e) {
    const p = edPage();
    if (!p || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const pt = edPt(e);
    const t = ed.tool;
    if (t === 'select') {
      const isHandle = e.target instanceof Element && e.target.dataset && e.target.dataset.handle;
      const annId = e.target instanceof Element ? e.target.getAttribute('data-ann') : null;
      if (isHandle && ed.sel != null) { edStart('resize', pt, e); return; }
      if (annId) {
        ed.sel = +annId; edDrawOverlay();
        edStart('move', pt, e);
        return;
      }
      ed.sel = null; edDrawOverlay();
      return;
    }
    e.preventDefault();
    if (t === 'edittext') { edModifierTexte(pt, { cx: e.clientX, cy: e.clientY }); return; }
    if (t === 'text') { edCreateText(pt); return; }
    if (t === 'tampon') { edPoserTampon(pt); return; }
    if (t === 'draw') { edStart('draw', pt, e); return; }
    edStart('rect', pt, e);
  }

  function edStart(type, pt, e) {
    const p = edPage();
    const g = pageGeom(p);
    const sel = p.ann.find(a => a.id === ed.sel);
    ed.gesture = { type, start: pt, last: pt, g, moved: false, orig: sel ? JSON.parse(JSON.stringify(sel)) : null, snapped: false };
    if (type === 'rect') {
      ed.pending = {
        id: -1, type: ed.tool,
        x: pt.x, y: pt.y, w: 0, h: 0,
        color: ed.tool === 'redact' ? '#000000' : ed.style.color,
        opacity: ed.tool === 'highlight' ? ed.style.opacity : 1,
        width: ed.style.width,
      };
      if (ed.tool === 'champ') Object.assign(ed.pending, champNeuf());
    } else if (type === 'draw') {
      ed.pending = { id: -1, type: 'draw', pts: [[pt.x, pt.y]], color: ed.style.textColor, width: ed.style.width };
    }
    try { ed.svg.setPointerCapture(e.pointerId); } catch (e) { signaler('Capture du pointeur', e, 'info'); }
    ed.svg.addEventListener('pointermove', edPointerMove);
    ed.svg.addEventListener('pointerup', edPointerUp);
    ed.svg.addEventListener('pointercancel', edPointerUp);
    edPreview();
  }

  function edPointerMove(e) {
    const gst = ed.gesture;
    if (!gst) return;
    const p = edPage();
    const pt = edPt(e);
    gst.moved = Math.abs(pt.x - gst.start.x) > 0.5 || Math.abs(pt.y - gst.start.y) > 0.5;
    if (gst.type === 'rect') {
      ed.pending.x = Math.min(gst.start.x, pt.x);
      ed.pending.y = Math.min(gst.start.y, pt.y);
      ed.pending.w = Math.abs(pt.x - gst.start.x);
      ed.pending.h = Math.abs(pt.y - gst.start.y);
      edPreview();
    } else if (gst.type === 'draw') {
      const last = ed.pending.pts[ed.pending.pts.length - 1];
      if (Math.hypot(pt.x - last[0], pt.y - last[1]) > 0.8) { ed.pending.pts.push([pt.x, pt.y]); edPreview(); }
    } else if (gst.type === 'move' || gst.type === 'resize') {
      const a = p.ann.find(x => x.id === ed.sel);
      if (!a || !gst.orig) return;
      if (!gst.snapped) { snapshot(); gst.snapped = true; state.touched = true; }
      const dx = pt.x - gst.start.x, dy = pt.y - gst.start.y;
      if (gst.type === 'move') {
        if (a.type === 'draw') a.pts = gst.orig.pts.map(q => [q[0] + dx, q[1] + dy]);
        else { a.x = gst.orig.x + dx; a.y = gst.orig.y + dy; }
      } else {
        a.w = Math.max(4, gst.orig.w + dx);
        const voulue = Math.max(4, gst.orig.h + dy);
        if (a.type === 'edit') { a.h0 = voulue; recalcAnn(a); }
        else if (a.type === 'text') { a.h = voulue; recalcAnn(a); }
        else if (a.type === 'tampon') { a.size = Math.max(6, Math.min(96, gst.orig.size * (a.w / Math.max(1, gst.orig.w)))); tamponMesure(a); }
        else a.h = voulue;
      }
      edDrawOverlay();
    }
  }

  function edPointerUp() {
    const gst = ed.gesture;
    ed.svg.removeEventListener('pointermove', edPointerMove);
    ed.svg.removeEventListener('pointerup', edPointerUp);
    ed.svg.removeEventListener('pointercancel', edPointerUp);
    ed.gesture = null;
    if (!gst) return;
    const p = edPage();
    if (gst.type === 'rect') {
      const a = ed.pending; ed.pending = null;
      if (a && a.w > 3 && a.h > 3) { edCommit(a); } else edDrawOverlay();
    } else if (gst.type === 'draw') {
      const a = ed.pending; ed.pending = null;
      if (a && a.pts.length > 1) edCommit(a); else edDrawOverlay();
    } else {
      edDrawOverlay();
    }
  }

  function edCommit(a) {
    const p = edPage();
    snapshot();
    a.id = ++uid;
    p.ann.push(a);
    ed.sel = a.id;
    state.touched = true;
    if (ed.tool !== 'draw' && ed.tool !== 'edittext' && ed.tool !== 'champ') { ed.tool = 'select'; edSyncTools(); }
    edDrawOverlay();
    setLast('Annotation ajoutée');
  }

  function edPreview() {
    edDrawOverlay();
    if (!ed.pending) return;
    const n = annNode(ed.pending, true);
    if (n) { n.style.pointerEvents = 'none'; ed.svg.appendChild(n); }
  }

  function edCreateText(pt) {
    const p = edPage();
    const g = pageGeom(p);
    const size = ed.style.size;
    const maxW = Math.min(g.Wd - pt.x - 8, g.Wd * 0.7);
    if (maxW < 30) return;
    const ta = document.createElement('textarea');
    ta.className = 'ed-textarea';
    ta.style.left = (pt.x * ed.scale) + 'px';
    ta.style.top = (pt.y * ed.scale) + 'px';
    ta.style.width = (maxW * ed.scale) + 'px';
    ta.style.height = (size * 1.35 * ed.scale) + 'px';
    ta.style.fontSize = (size * ed.scale) + 'px';
    ta.style.fontFamily = famOf(ed.style.font);
    ta.style.fontWeight = ed.style.bold ? '700' : '400';
    ta.style.color = ed.style.textColor;
    ta.setAttribute('aria-label', 'Texte à insérer');
    ed.sheet.appendChild(ta);
    ta.focus();
    requestAnimationFrame(() => { if (document.activeElement !== ta) ta.focus(); });
    const grow = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
    ta.addEventListener('input', grow);
    let closed = false;
    const commit = () => {
      if (closed) return;
      closed = true;
      const text = ta.value.replace(/\s+$/, '');
      ta.remove();
      if (!text.trim()) { edDrawOverlay(); return; }
      const lines = wrapText(text, maxW, size, ed.style.font, ed.style.bold);
      edCommit({
        id: -1, type: 'text', x: pt.x, y: pt.y, w: maxW, h: lines.length * size * 1.25,
        text, lines, size, color: ed.style.textColor, font: ed.style.font, bold: ed.style.bold,
      });
    };
    ta.addEventListener('blur', commit);
    ta.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); commit(); }
    });
  }

