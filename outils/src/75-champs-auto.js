  // =====================================================================
  //  Reconnaître les champs d'un formulaire « à plat »
  //  -------------------------------------------------------------------
  //  Un formulaire imprimé puis numérisé, ou fait dans Word et exporté sans champs, n'est qu'une page : des intitulés, des
  //  lignes à remplir, des cases, des cadres. On y repère ce qui ressemble à une zone à remplir — une ligne ou des pointillés
  //  après un intitulé, un cadre vide, une petite case carrée — et on propose d'y poser de vrais champs. Rien n'est posé tant
  //  que la personne n'a pas contrôlé la liste, et ce qui est posé se retouche dans l'éditeur de page comme un champ tracé à la main.
  //  Lire les formes demande le dessin de la page, pas son texte : un scan (une image) n'en a pas, on le dit.
  // =====================================================================

  // Les traits et les cadres de la page, en points de la page affichée (origine en haut à gauche), depuis la liste d'opérations
  // de pdf.js. ol : { fnArray, argsArray } ; OPS : les codes d'opérations ; T : la matrice de la vue.
  function formesDeLaPage(ol, OPS, T) {
    const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
    const horizontaux = [], verticaux = [], boites = [];
    let ctm = [1, 0, 0, 1, 0, 0];
    const pile = [];
    let sous = [];                                  // les sous-chemins du chemin en cours : { pts, ferme, rect }
    const pt = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    const trace = (peint, rempli) => {
      sous.forEach(s => {
        const m = mul(T, ctm);
        const pts = s.pts.map(q => pt(m, q[0], q[1]));
        if (s.rect || (pts.length >= 4 && pts.length <= 5 && s.ferme)) {
          const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
          const x = Math.min.apply(null, xs), y = Math.min.apply(null, ys), w = Math.max.apply(null, xs) - x, h = Math.max.apply(null, ys) - y;
          // un quadrilatère n'est un cadre que si ses côtés sont droits
          const droit = s.rect || pts.every((q, i) => { const r = pts[(i + 1) % pts.length]; return Math.abs(q[0] - r[0]) < 0.6 || Math.abs(q[1] - r[1]) < 0.6; });
          if (!droit) return;
          if (h <= 1.6 && w >= 8) horizontaux.push({ x0: x, x1: x + w, y: y + h / 2 });          // un filet : un rectangle très plat
          else if (w <= 1.6 && h >= 8) verticaux.push({ x, y0: y, y1: y + h });
          else if (w >= 5 && h >= 5) boites.push({ x, y, w, h, trait: peint, rempli });
        } else if (pts.length === 2 && peint) {
          const a = pts[0], b = pts[1];
          if (Math.abs(a[1] - b[1]) <= 0.8 && Math.abs(a[0] - b[0]) >= 8) horizontaux.push({ x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y: (a[1] + b[1]) / 2 });
          else if (Math.abs(a[0] - b[0]) <= 0.8 && Math.abs(a[1] - b[1]) >= 8) verticaux.push({ x: (a[0] + b[0]) / 2, y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]) });
        }
      });
      sous = [];
    };
    const peintres = {};
    [OPS.stroke, OPS.closeStroke].forEach(c => { peintres[c] = [true, false]; });
    [OPS.fill, OPS.eoFill].forEach(c => { peintres[c] = [false, true]; });
    [OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke].forEach(c => { peintres[c] = [true, true]; });
    for (let i = 0; i < ol.fnArray.length; i++) {
      const fn = ol.fnArray[i], a = ol.argsArray[i];
      if (fn === OPS.save) pile.push(ctm.slice());
      else if (fn === OPS.restore) { if (pile.length) ctm = pile.pop(); }
      else if (fn === OPS.transform) ctm = mul(ctm, a);
      else if (fn === OPS.constructPath) {
        const ops = a[0], c = a[1];
        let j = 0, cur = null;
        for (let k = 0; k < ops.length; k++) {
          const op = ops[k];
          if (op === OPS.rectangle) { const x = c[j++], y = c[j++], w = c[j++], h = c[j++]; sous.push({ pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], rect: true, ferme: true }); cur = null; }
          else if (op === OPS.moveTo) { cur = { pts: [[c[j++], c[j++]]], ferme: false }; sous.push(cur); }
          else if (op === OPS.lineTo) { if (cur) cur.pts.push([c[j++], c[j++]]); else j += 2; }
          else if (op === OPS.curveTo) { j += 6; if (cur) cur.courbe = true; }
          else if (op === OPS.curveTo2 || op === OPS.curveTo3) { j += 4; if (cur) cur.courbe = true; }
          else if (op === OPS.closePath) { if (cur) cur.ferme = true; }
        }
        sous = sous.filter(s => !s.courbe);
      } else if (peintres[fn]) trace(peintres[fn][0], peintres[fn][1]);
      else if (fn === OPS.endPath) sous = [];
    }
    return { horizontaux, verticaux, boites };
  }

  const RX_POINTILLES = /([_]{4,}|[.·]{5,}|…{2,}|[-–—]{6,})\s*$/;
  const RX_CASE_TEXTE = /^[☐□◻❏❑▢]$/;
  const intitule = t => String(t || '').replace(/^[\s:.…_·\-–—(]+|[\s:.…_·\-–—)]+$/g, '').replace(/\s+/g, ' ').slice(0, 60);

  // page : { largeur, hauteur, rangees (voir rangeesDe), horizontaux, verticaux, boites, widgets, existants }
  // Rend des champs probables, du haut vers le bas : { genre, x, y, w, h, libelle, multi, sur } — « sur » dit si c'est une forte probabilité.
  function champsProbables(page) {
    const cellules = [];
    page.rangees.forEach(r => r.cellules.forEach(c => cellules.push({ str: c.str, x: c.x, x1: c.x1, base: r.base, size: r.size })));
    const traits = (page.horizontaux || []).map(h => Object.assign({ depuis: 'trait' }, h));
    const casesTexte = [];
    // 1. Les pointillés et soulignés tapés au clavier : une cellule qui se termine par une série de _ ou de points. Leur étendue se
    //    déduit de la largeur de la cellule, à raison d'une largeur égale par caractère : c'est une approximation, que le contrôle corrige.
    cellules.forEach(c => {
      if (RX_CASE_TEXTE.test(c.str.trim())) { casesTexte.push(c); c.garde = true; return; }
      const m = RX_POINTILLES.exec(c.str);
      if (!m) return;
      const n = c.str.length, l = c.x1 - c.x;
      const x0 = c.x + l * m.index / n, x1 = c.x + l * (m.index + m[1].length) / n;
      c.garde = true;
      if (x1 - x0 < 30) return;
      traits.push({ x0, x1, y: c.base + 1.5, depuis: 'texte', avant: c.str.slice(0, m.index), size: c.size, base: c.base, cellule: c });
    });
    const texte = cellules.filter(c => !RX_CASE_TEXTE.test(c.str.trim()));
    const aGauche = (x0, y) => texte.filter(c => !RX_POINTILLES.test(c.str) || intitule(c.str.replace(RX_POINTILLES, '')))
      .filter(c => c.base <= y + 3 && c.base >= y - Math.max(14, c.size * 1.8) && c.x1 <= x0 + 4 && c.x1 >= x0 - 45)
      .sort((a, b) => b.x1 - a.x1)[0];
    const audessus = (x0, x1, y) => texte.filter(c => !RX_POINTILLES.test(c.str) && c.base < y - 5 && c.base >= y - 26 && c.x < x1 && c.x1 > x0 - 6 && c.x <= x0 + 24)
      .sort((a, b) => b.base - a.base)[0];
    const textDans = b => cellules.some(c => !c.garde && (c.x + c.x1) / 2 > b.x && (c.x + c.x1) / 2 < b.x + b.w && c.base - c.size * 0.3 > b.y && c.base < b.y + b.h + 1);
    const resultats = [];

    // 2. Les cadres : une petite case carrée vide est une case à cocher, un cadre vide plus large est un champ.
    (page.boites || []).forEach(b => {
      if (b.w > page.largeur * 0.9 && b.h > page.hauteur * 0.8) return;                       // le cadre de la page
      if (textDans(b)) return;
      const carre = Math.abs(b.w - b.h) <= 3 && b.w >= 5 && b.w <= 22;
      if (carre) {
        const suite = texte.filter(c => c.x >= b.x + b.w - 1 && c.x - (b.x + b.w) <= 14 && Math.abs((c.base - c.size * 0.35) - (b.y + b.h / 2)) <= 7).sort((p, q) => p.x - q.x)[0];
        resultats.push({ genre: 'case', x: b.x, y: b.y, w: b.w, h: b.h, libelle: intitule(suite && suite.str), sur: !!b.trait, source: 'boite' });
        return;
      }
      if (b.w < 40 || b.h < 11 || b.h > 140) return;
      const gauche = texte.filter(c => c.x1 <= b.x + 2 && c.x1 >= b.x - 70 && c.base >= b.y - 4 && c.base <= b.y + b.h + 4).sort((p, q) => q.x1 - p.x1)[0];
      const dessus = gauche ? null : audessus(b.x, b.x + b.w, b.y + 6);
      const nom = gauche || dessus;
      resultats.push({ genre: 'texte', x: b.x, y: b.y, w: b.w, h: b.h, libelle: intitule(nom && nom.str), multi: b.h > 34, sur: !!b.trait && !b.rempli, source: 'boite' });
    });
    // 3. Les cases dessinées avec un caractère (☐).
    casesTexte.forEach(c => {
      const taille = Math.max(8, Math.min(16, c.size * 1.0));
      const suite = texte.filter(t => t !== c && t.x >= c.x1 - 1 && t.x - c.x1 <= 14 && Math.abs(t.base - c.base) <= 3).sort((p, q) => p.x - q.x)[0];
      resultats.push({ genre: 'case', x: c.x, y: c.base - taille * 0.85, w: taille, h: taille, libelle: intitule(suite && suite.str), sur: true, source: 'texte' });
    });
    // 4. Les lignes à remplir : un trait ou des pointillés, qui n'est ni le soulignement d'un texte, ni le bord d'un cadre, ni une ligne de tableau.
    traits.forEach(s => {
      const long = s.x1 - s.x0;
      if (long < 36) return;
      if (s.depuis === 'trait') {
        const dessous = texte.filter(c => c.base <= s.y + 2 && c.base >= s.y - c.size * 1.6 && c.x < s.x1 && c.x1 > s.x0);
        const couvert = dessous.reduce((a, c) => a + Math.max(0, Math.min(c.x1, s.x1) - Math.max(c.x, s.x0)), 0);
        if (couvert > long * 0.6) return;                                                   // un texte souligné
        const touche = (page.verticaux || []).filter(v => v.x >= s.x0 - 2 && v.x <= s.x1 + 2 && v.y0 <= s.y + 2 && v.y1 >= s.y - 2).length;
        if (touche >= 2) return;                                                            // une ligne de tableau
        if ((page.boites || []).some(b => s.x0 >= b.x - 2 && s.x1 <= b.x + b.w + 2 && (Math.abs(s.y - b.y) < 2 || Math.abs(s.y - (b.y + b.h)) < 2))) return;   // le bord d'un cadre
      }
      let nom = null;
      if (s.depuis === 'texte' && intitule(s.avant)) nom = { str: s.avant };
      if (!nom) nom = aGauche(s.x0, s.y) || audessus(s.x0, s.x1, s.y);
      const haut = Math.max(13, Math.min(20, (nom && nom.size ? nom.size : s.size || 10) * 1.6));
      resultats.push({ genre: 'texte', x: s.x0, y: s.y - haut, w: long, h: haut, libelle: intitule(nom && nom.str), multi: false, sur: s.depuis === 'texte' || long >= 60, source: 'trait' });
    });

    // 5. Ce qui est déjà un champ (de formulaire ou posé ici) n'est pas proposé une seconde fois ; deux détections du même endroit n'en font qu'une.
    const recouvre = (a, b) => {
      const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      return w > 0 && h > 0 && (w * h) / Math.min(a.w * a.h, b.w * b.h) > 0.4;
    };
    const dejaLa = (page.widgets || []).concat(page.existants || []);
    const ordre = { boite: 0, texte: 1, trait: 2 };
    const gardes = [];
    resultats.sort((a, b) => ordre[a.source] - ordre[b.source]).forEach(r => {
      if (dejaLa.some(w => recouvre(r, w))) return;
      if (gardes.some(g => recouvre(r, g))) return;
      gardes.push(r);
    });
    return gardes.sort((a, b) => (Math.round(a.y / 6) - Math.round(b.y / 6)) || (a.x - b.x));
  }

  // La page lue : ses formes, ses lignes de texte, et ce qui est déjà champ.
  async function lireLaPageDuFormulaire(p) {
    const src = srcById(p.src);
    const g = pageGeom(p);
    const page = await src.pdfjs.getPage(p.index + 1);
    const vp = page.getViewport({ scale: 1, rotation: g.total });
    let formes = { horizontaux: [], verticaux: [], boites: [] };
    try {
      const ol = await page.getOperatorList();
      if (ol.fnArray.length <= 600000) formes = formesDeLaPage(ol, pdfjs.OPS, vp.transform);
    } catch (e) { signaler('Détection des champs', e); }
    const widgets = [];
    try {
      (await page.getAnnotations()).forEach(a => {
        if (a.subtype !== 'Widget' || !a.rect) return;
        const A = pdfjs.Util.applyTransform([a.rect[0], a.rect[1]], vp.transform), B = pdfjs.Util.applyTransform([a.rect[2], a.rect[3]], vp.transform);
        widgets.push({ x: Math.min(A[0], B[0]), y: Math.min(A[1], B[1]), w: Math.abs(A[0] - B[0]), h: Math.abs(A[1] - B[1]) });
      });
    } catch (e) { signaler('Détection des champs', e); }
    page.cleanup();
    const rangees = await vue.rangeesDePage(p);
    const existants = (p.ann || []).filter(a => a.type === 'champ').map(a => ({ x: a.x, y: a.y, w: a.w, h: a.h }));
    return Object.assign({ largeur: g.Wd, hauteur: g.Hd, rangees, widgets, existants }, formes);
  }

  function toolChampsAuto() {
    const courante = pageCouranteId();
    const sel = selectedPages();
    const options = state.pages.map((p, i) => [String(p.id), 'Page ' + (i + 1)]);
    if (sel.length > 1) options.unshift(['sel', 'Pages sélectionnées (' + sel.length + ')']);
    if (state.pages.length > 1) options.unshift(['tout', 'Tout le document (' + state.pages.length + ' pages)']);
    const choix = select('ca-pages', options, String(courante));
    const info = note('');
    const liste = document.createElement('div'); liste.className = 'liste-champs';
    let trouves = [];                    // { page, c, case }
    let jeton = 0;
    const genreNom = g => (GENRES_DE_CHAMP.find(x => x[0] === g) || [g, g])[1];
    function montrer() {
      liste.replaceChildren();
      trouves.forEach((t, i) => {
        const rang = state.pages.indexOf(t.page) + 1;
        const dits = [tr('Page') + ' ' + rang, tr(genreNom(t.c.genre)), t.c.libelle ? '« ' + t.c.libelle + ' »' : tr('(sans intitulé)')];
        if (!t.c.sur) dits.push(tr('incertain'));
        const ligne = checkbox('ca-' + i, dits.join(' — '), t.coche);
        ligne.input.addEventListener('change', () => { t.coche = ligne.input.checked; majBouton(); });
        liste.appendChild(ligne);
      });
      majBouton();
    }
    const majBouton = () => { const b = document.getElementById('ca-ajouter'); if (b) { const n = trouves.filter(t => t.coche).length; b.disabled = !n; b.textContent = n ? 'Ajouter ' + plural(n, 'champ', 'champs') : 'Ajouter les champs'; } };
    async function analyser() {
      const my = ++jeton;
      const v = choix.value;
      const pages = v === 'tout' ? state.pages.slice() : v === 'sel' ? selectedPages() : state.pages.filter(x => x.id === +v);
      if (!pages.length) return;
      info.textContent = pages.length > 1 ? 'Lecture de ' + pages.length + ' pages…' : 'Lecture de la page…';
      liste.replaceChildren();
      trouves = [];
      const tour = cadence();
      let sansFormes = 0;
      for (let i = 0; i < pages.length; i++) {
        const lue = await lireLaPageDuFormulaire(pages[i]);
        if (my !== jeton) return;
        if (!lue.horizontaux.length && !lue.boites.length && !lue.rangees.length) sansFormes++;
        champsProbables(lue).forEach(c => trouves.push({ page: pages[i], c, coche: c.sur }));
        await tour();
      }
      info.textContent = trouves.length
        ? plural(trouves.length, 'champ probable', 'champs probables') + '. Décochez ce qui n\'en est pas un : rien n\'est posé avant votre accord, et chaque champ se retouche ensuite dans l\'éditeur de page.'
        : 'Aucun champ reconnu.' + (sansFormes ? ' Un scan n\'a pas de lignes ni de cadres à lire : lancez d\'abord la reconnaissance de texte, ou tracez les champs à la main.' : ' Les lignes, les pointillés, les cadres vides et les petites cases carrées sont repérés ; le reste se trace à la main dans l\'éditeur de page.');
      montrer();
    }
    choix.addEventListener('change', analyser);
    dialog({
      aide: 'champs-auto',
      title: 'Reconnaître les champs d\'un formulaire', icon: IC.form, wide: true, submitOnEnter: false,
      build: b => {
        b.append(field('Pages', choix, 'Les pages à parcourir. Le texte, les traits et les cadres de la page sont lus ; un champ déjà présent n\'est pas proposé deux fois.'));
        b.append(info);
        b.append(liste);
      },
      actions: [
        { label: 'Fermer', onClick: c => c() },
        { label: 'Ajouter les champs', primary: true, id: 'ca-ajouter', onClick: close => {
          const ajoutes = trouves.filter(t => t.coche);
          if (!ajoutes.length) return;
          snapshot('Reconnaître les champs');
          ajoutes.forEach(t => {
            const c = t.c;
            const champ = Object.assign(champNeuf(c.genre), { id: ++uid, x: c.x, y: c.y, w: c.w, h: c.h, libelle: c.libelle || '', multi: !!c.multi });
            champ.size = c.genre === 'texte' ? Math.max(6, Math.min(11, c.h * 0.62)) : 11;
            t.page.ann.push(champ);
          });
          state.touched = true;
          close();
          vue.render();
          toast(plural(ajoutes.length, 'champ ajouté', 'champs ajoutés') + ' : contrôlez-les dans l\'éditeur de page (double-clic sur la page).');
          setLast(plural(ajoutes.length, 'champ ajouté', 'champs ajoutés') + ' · Ctrl+Z pour annuler');
        } },
      ],
    });
    majBouton();
    analyser();
  }
