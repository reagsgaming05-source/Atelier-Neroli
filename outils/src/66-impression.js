  // =====================================================================
  //  Impression
  //  -------------------------------------------------------------------
  //  Le document est assemblé exactement comme à l'export, puis remis au
  //  navigateur, qui ouvre la fenêtre d'impression du système : c'est là
  //  qu'on choisit l'imprimante, le recto verso et le nombre de copies.
  // =====================================================================
  // =====================================================================
  //  Mise en page à l'impression
  //  -------------------------------------------------------------------
  //  Livret, plusieurs pages par feuille : le document est réassemblé avant
  //  d'être envoyé, comme le fait la « gestion des pages » d'Acrobat. Ce
  //  qui part à l'imprimante est donc exactement ce qu'on voit décrit.
  // =====================================================================
  const NUP_GRILLES = { 2: [[1, 2], [2, 1]], 4: [[2, 2]], 6: [[2, 3], [3, 2]], 9: [[3, 3]], 16: [[4, 4]] };
  const PAPIERS = { doc: null, a4: [595.28, 841.89], a3: [841.89, 1190.55], letter: [612, 792], legal: [612, 1008] };
  const orienter = (t, sens) => {
    const [a, b] = t;
    if (sens === 'portrait') return a <= b ? [a, b] : [b, a];
    if (sens === 'paysage') return a >= b ? [a, b] : [b, a];
    return [a, b];
  };

  // L'ordre d'un cahier piqué à cheval : pour n pages (complétées à un
  // multiple de quatre), les paires [gauche, droite] de chaque côté de
  // feuille — recto puis verso — telles qu'un pliage les remet dans l'ordre.
  function livretOrdre(n) {
    const N = Math.max(4, Math.ceil(n / 4) * 4);
    const cotes = [];
    for (let i = 0; i < N / 4; i++) {
      cotes.push([N - 1 - 2 * i, 2 * i]);        // recto de la feuille
      cotes.push([2 * i + 1, N - 2 - 2 * i]);    // verso
    }
    return cotes;
  }

  async function imposerPdf(octets, o) {
    const { PDFDocument, rgb } = PDFLib;
    // Rien à changer : on garde le document tel quel, au point près.
    if (o.disposition === 'normale' && o.papier === 'doc' && o.echelle === 'ajuster' && o.orientation === 'auto') return octets;
    const src = await PDFDocument.load(octets);
    const pagesSrc = src.getPages();
    const n = pagesSrc.length;
    if (!n) return octets;
    const out = await PDFDocument.create();

    // Une page restée vide n'a pas de contenu : on la laisse en blanc plutôt
    // que de faire échouer tout l'assemblage.
    const emb = [];
    for (const pg of pagesSrc) {
      let e = null;
      try { if (pg.node.Contents()) e = await out.embedPage(pg); } catch (_) { e = null; }
      emb.push(e);
    }
    const dim = i => {
      const pg = pagesSrc[Math.max(0, Math.min(n - 1, i))];
      const t = pg.getSize();
      return [t.width, t.height];
    };
    const base = dim(0);
    const perso = o.echelle === 'perso' ? Math.max(10, Math.min(400, o.pourcent || 100)) / 100 : 1;

    const poser = (feuille, i, x, y, largeur, hauteur, bord, regle) => {
      if (bord) feuille.drawRectangle({ x, y, width: largeur, height: hauteur, borderColor: rgb(0.62, 0.65, 0.69), borderWidth: 0.5 });
      const e = emb[i];
      if (i == null || i < 0 || i >= n || !e) return;
      const ajuste = Math.min(largeur / e.width, hauteur / e.height);
      let k = ajuste;
      if (regle === 'libre') {
        if (o.echelle === 'reelle') k = 1;
        else if (o.echelle === 'reduire') k = Math.min(1, ajuste);
        else if (o.echelle === 'perso') k = perso;
      } else if (o.echelle === 'perso') k = ajuste * perso;
      feuille.drawPage(e, {
        x: x + (largeur - e.width * k) / 2,
        y: y + (hauteur - e.height * k) / 2,
        xScale: k, yScale: k,
      });
    };

    // ---------------------------------------------------------------- livret
    if (o.disposition === 'livret') {
      // Un livret se plie : la feuille est celle du papier, à l'italienne,
      // et les deux pages viennent s'y loger côte à côte — comme dans
      // Acrobat. La feuille n'est jamais doublée.
      const f = orienter(o.papier === 'doc' ? base : (PAPIERS[o.papier] || PAPIERS.a4), 'paysage');
      const cotes = livretOrdre(n);
      cotes.filter((_, i) => o.cotes === 'tous' || (o.cotes === 'recto' ? i % 2 === 0 : i % 2 === 1))
        .forEach(paire => {
          const [g, d] = o.reliure === 'droite' ? [paire[1], paire[0]] : paire;
          const feuille = out.addPage([f[0], f[1]]);
          poser(feuille, g, 0, 0, f[0] / 2, f[1], false, 'case');
          poser(feuille, d, f[0] / 2, 0, f[0] / 2, f[1], false, 'case');
        });
      return out.save();
    }

    // ------------------------------------------------ plusieurs par feuille
    if (o.disposition === 'nup') {
      const par = NUP_GRILLES[o.parFeuille] ? o.parFeuille : 4;
      const marge = 10;
      const papier = o.papier === 'doc' ? base : (PAPIERS[o.papier] || PAPIERS.a4);
      const sens = o.orientation === 'auto' ? [[papier[0], papier[1]], [papier[1], papier[0]]] : [orienter(papier, o.orientation)];
      let choix = null;
      NUP_GRILLES[par].forEach(([cols, rangs]) => {
        sens.forEach(([fw, fh]) => {
          const cw = (fw - marge * (cols + 1)) / cols;
          const ch = (fh - marge * (rangs + 1)) / rangs;
          if (cw <= 4 || ch <= 4) return;
          const k = Math.min(cw / base[0], ch / base[1]);
          if (!choix || k > choix.k) choix = { cols, rangs, fw, fh, cw, ch, k };
        });
      });
      if (!choix) return octets;
      for (let d = 0; d < n; d += par) {
        const feuille = out.addPage([choix.fw, choix.fh]);
        for (let c = 0; c < par; c++) {
          const i = d + c;
          if (i >= n) break;
          // Horizontal : de gauche à droite puis ligne suivante.
          // Vertical : de haut en bas puis colonne suivante.
          const col = o.ordre === 'vertical' ? Math.floor(c / choix.rangs) : c % choix.cols;
          const rang = o.ordre === 'vertical' ? c % choix.rangs : Math.floor(c / choix.cols);
          if (col >= choix.cols || rang >= choix.rangs) break;
          const x = marge + col * (choix.cw + marge);
          const y = choix.fh - marge - (rang + 1) * choix.ch - rang * marge;
          poser(feuille, i, x, y, choix.cw, choix.ch, !!o.bordure, 'case');
        }
      }
      return out.save();
    }

    // ---------------------------------------------------------------- normale
    for (let i = 0; i < n; i++) {
      const d = dim(i);
      let f = o.papier === 'doc' ? d : (PAPIERS[o.papier] || PAPIERS.a4);
      if (o.orientation !== 'auto') f = orienter(f, o.orientation);
      else if (o.papier !== 'doc' && (d[0] > d[1]) !== (f[0] > f[1])) f = [f[1], f[0]];
      const feuille = out.addPage([f[0], f[1]]);
      poser(feuille, i, 0, 0, f[0], f[1], false, 'libre');
    }
    return out.save();
  }

  async function assemblerPourImpression(pages, o) {
    setBusy('Assemblage de ' + plural(pages.length, 'page', 'pages') + '…', 0, { annuler: true });
    try {
      let octets = await buildPdf(pages, { onProgress: (r, t) => { verifierAnnulation(); setBusy(t || 'Assemblage…', r, { annuler: true }); } });
      if (o.disposition !== 'normale') {
        setBusy('Mise en page…', 0.9);
        octets = await imposerPdf(octets, o);
      }
      return octets;
    } catch (e) {
      if (e && e.annule) { toast('Impression annulée.', 'warn'); return null; }
      console.error(e);
      toast('Échec de la préparation : ' + (e && e.message ? e.message : e), 'error');
      return null;
    } finally { setBusy(''); }
  }

  async function imprimerPages(pages, o) {
    if (!pages.length || state.busy) return;
    const octets = await assemblerPourImpression(pages, o);
    if (!octets) return;
    // Le navigateur affiche un PDF dans un cadre d'une autre origine et
    // refuse d'y lancer l'impression, quelle que soit la façon dont la page
    // est servie. On imprime donc le document assemblé rendu page par page :
    // ce qui part à l'imprimante est bien ce qui a été mis en page.
    await imprimerEnImages(octets, pages.length, o);
  }

  // Le document assemblé, rendu page par page, dans une feuille que seule
  // l'imprimante voit. Marche partout, y compris depuis un simple fichier.
  async function imprimerEnImages(octets, combien, o) {
    setBusy('Préparation de l\'impression…', 0);
    const hote = document.createElement('div');
    hote.className = 'feuille-impression';
    let doc = null;
    // Chaque feuille annonce sa taille au moteur d'impression : sans fenêtre
    // de réglage, c'est ce qui décide du papier et de l'orientation.
    const formats = new Map();   // « largeur hauteur » en mm -> nom de page CSS
    try {
      doc = await pdfjs.getDocument({ data: octets.slice(0) }).promise;
      // Assez fin pour que le texte reste net sur le papier, sans faire
      // enfler la page au point de la bloquer sur un gros document.
      // Fine par défaut ; l'utilisateur choisit dans la fenêtre d'impression.
      const ppp = (o && +o.qualite) || (doc.numPages > 40 ? 200 : 300);
      for (let i = 1; i <= doc.numPages; i++) {
        if (annulationDemandee()) { setBusy(''); toast('Impression annulée.', 'warn'); return; }
        setBusy('Préparation de l\'impression…', (i - 1) / doc.numPages, { annuler: true });
        const pg = await doc.getPage(i);
        const v1 = pg.getViewport({ scale: 1 });
        const format = (v1.width * 25.4 / 72).toFixed(1) + 'mm ' + (v1.height * 25.4 / 72).toFixed(1) + 'mm';
        if (!formats.has(format)) formats.set(format, 'feuille' + formats.size);
        const vp = pg.getViewport({ scale: ppp / 72 });
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.ceil(vp.width));
        cv.height = Math.max(1, Math.ceil(vp.height));
        const cx = cv.getContext('2d', { alpha: false });
        cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
        await pg.render({ canvasContext: cx, viewport: vp }).promise;
        pg.cleanup();
        const f = document.createElement('div');
        f.className = 'page-impression';
        f.style.setProperty('page', formats.get(format));
        const img = document.createElement('img');
        img.alt = '';
        img.src = cv.toDataURL('image/jpeg', 0.92);
        f.appendChild(img);
        hote.appendChild(f);
      }
      {
        const style = document.createElement('style');
        style.textContent = Array.from(formats, ([taille, nom]) => '@page ' + nom + ' { size: ' + taille + '; margin: 0; }').join('\n');
        hote.appendChild(style);
      }
    } catch (e) {
      console.error(e);
      setBusy('');
      toast('Impossible de préparer l\'impression : ' + (e && e.message ? e.message : e), 'error');
      return;
    } finally { try { if (doc) doc.destroy(); } catch (_) {} }
    setBusy('');
    document.body.appendChild(hote);
    document.documentElement.classList.add('en-impression');
    const finir = () => {
      document.documentElement.classList.remove('en-impression');
      hote.remove();
      window.removeEventListener('afterprint', finir);
    };
    if (state.bureau) {
      // La fenêtre de l'application imprime elle-même : l'imprimante
      // choisie, le recto verso, les copies, la taille de la feuille.
      const [wmm, hmm] = (formats.keys().next().value || '210mm 297mm').split(' ').map(parseFloat);
      window.BlonayDesktop.imprimer({
        imprimante: (o && o.imprimante) || '', duplex: (o && o.duplex) || 'simplex', copies: (o && o.copies) || 1,
        dialogue: !!(o && o.dialogue),
        paysage: wmm > hmm, largeurMicrons: Math.round(Math.min(wmm, hmm) * 1000), hauteurMicrons: Math.round(Math.max(wmm, hmm) * 1000),
      }).then(r => {
        if (r && r.ok) setLast(plural(combien, 'page envoyée', 'pages envoyées') + ' à l\'impression');
        else toast('L\'impression a échoué : ' + ((r && r.erreur) || 'imprimante indisponible'), 'error');
      }).catch(e => toast('L\'impression a échoué : ' + (e && e.message ? e.message : e), 'error'))
        .finally(() => setTimeout(finir, 300));
      return;
    }
    window.addEventListener('afterprint', finir);
    setTimeout(() => {
      try { window.print(); } catch (e) { signaler('Impression', e); }
      setLast(plural(combien, 'page envoyée', 'pages envoyées') + ' à l\'impression');
      setTimeout(finir, 1500);
    }, 60);
  }

  const IMP_MODES = [
    ['normale', 'Taille', ['M5 2.5h14v19H5z']],
    ['nup', 'Multiple', ['M4 3.5h7v7H4z', 'M13 3.5h7v7h-7z', 'M4 13.5h7v7H4z', 'M13 13.5h7v7h-7z']],
    ['livret', 'Livret', ['M12 4v16', 'M12 4 4 6v14l8-2', 'M12 4l8 2v14l-8-2']],
  ];

  // Choisir ce qu'on imprime, et comment, avec l'aperçu de ce qui sortira.
  function dialogImprimer() {
    if (!state.pages.length) { toast('Aucune page à imprimer.', 'warn'); return; }
    const nSel = state.selected.size;
    const o = {
      quoi: nSel ? 'selection' : 'tout', disposition: 'normale',
      parFeuille: 4, ordre: 'horizontal', bordure: false,
      reliure: 'gauche', cotes: 'tous', faces: 'toutes', inverse: false,
      papier: 'doc', echelle: 'ajuster', pourcent: 100, orientation: 'auto',
    };

    // ------------------------------------------------------------ réglages
    const choix = [['tout', 'Tout']];
    if (nSel) choix.push(['selection', 'Sélection']);
    choix.push(['plage', 'Pages']);
    const seg = segmented('imp-quoi', choix, o.quoi, v => { o.quoi = v; rafraichir(); });
    const plage = input('imp-plage', 'text', '1-' + state.pages.length);
    plage.placeholder = 'ex. 1-3, 5, 8-10';
    const champPlage = field('Lesquelles', plage, 'Numéros ou intervalles, séparés par des virgules.');

    const modes = document.createElement('div');
    modes.className = 'imp-modes';
    modes.setAttribute('role', 'group');
    const boutonsMode = IMP_MODES.map(([cle, nom, traits]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'imp-mode'; b.dataset.mode = cle;
      const sv = document.createElementNS(SVGNS, 'svg');
      sv.setAttribute('viewBox', '0 0 24 24');
      sv.setAttribute('fill', 'none');
      sv.setAttribute('stroke', 'currentColor');
      sv.setAttribute('stroke-width', '1.4');
      sv.setAttribute('stroke-linejoin', 'round');
      traits.forEach(d => { const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); sv.appendChild(p); });
      const t = document.createElement('span'); t.textContent = nom;
      b.append(sv, t);
      b.addEventListener('click', () => { o.disposition = cle; rafraichir(); });
      modes.appendChild(b);
      return b;
    });

    const nup = select('imp-nup', [['2', '2 pages'], ['4', '4 pages'], ['6', '6 pages'], ['9', '9 pages'], ['16', '16 pages']], '4');
    const ordre = select('imp-ordre', [['horizontal', 'De gauche à droite'], ['vertical', 'De haut en bas']], 'horizontal');
    const bordure = checkbox('imp-bord', 'Tracer un cadre autour de chaque page', false);
    const blocNup = document.createElement('div');
    blocNup.className = 'imp-reglages';
    blocNup.append(field('Pages par feuille', nup), field('Ordre', ordre), bordure);

    const reliure = select('imp-reliure', [['gauche', 'À gauche'], ['droite', 'À droite']], 'gauche');
    const cotes = select('imp-cotes', [['tous', 'Les deux côtés'], ['recto', 'Recto seulement'], ['verso', 'Verso seulement']], 'tous');
    const blocLivret = document.createElement('div');
    blocLivret.className = 'imp-reglages';
    blocLivret.append(
      field('Reliure', reliure),
      field('Côtés', cotes, 'Sans recto verso automatique : imprimez les rectos, remettez la pile, puis les versos.'),
      note('Les feuilles sortent dans l\'ordre du pliage, pas dans celui des pages : la première porte la dernière page à côté de la première. C\'est normal — imprimées, empilées et pliées en deux, les pages se lisent dans l\'ordre.'),
      note(state.bureau
        ? 'Pour un livret, « Recto verso, bords courts » ci-dessus. Avec les bords longs, les versos sortiraient à l\'envers.'
        : state.impressionDirecte
        ? 'Pour le recto verso automatique, l\'imprimante doit avoir « retourner sur les bords courts » dans ses réglages par défaut Windows (Paramètres › Imprimantes › Préférences d\'impression). Avec les bords longs, les versos sortiraient à l\'envers.'
        : 'Pour le recto verso automatique, choisissez dans votre imprimante « retourner sur les bords courts ». Avec les bords longs, les versos sortiraient à l\'envers.', 'warn'),
    );

    // Où part l'impression : l'application l'envoie directement à
    // l'imprimante par défaut de Windows ; la version navigateur passe par
    // la fenêtre du navigateur, qui demande l'imprimante.
    const bureau = state.bureau ? window.BlonayDesktop : null;
    const imprimante = select('imp-imprimante', [['', 'Imprimante par défaut de Windows']], '');
    const duplex = select('imp-duplex', [['simplex', 'Recto seulement'], ['longEdge', 'Recto verso, bords longs'], ['shortEdge', 'Recto verso, bords courts']], 'simplex');
    const copies = input('imp-copies', 'number', 1, { min: 1, max: 99 });
    // Chaque page part comme une image : sa finesse se choisit ici.
    const qualite = select('imp-qualite', [['300', 'Fine — 300 ppp'], ['200', 'Normale — 200 ppp'], ['150', 'Rapide — 150 ppp']], state.pages.length > 40 ? '200' : '300');
    const champQualite = field('Qualité', qualite, 'Fine pour un texte net ; Rapide pour un gros document ou un brouillon.');
    let champDestination, champDuplex = null, champCopies = null;
    if (bureau) {
      champDestination = field('Imprimante', imprimante, 'Envoi direct à cette imprimante, sans autre fenêtre. « Propriétés… » passe par la fenêtre d\'impression de Windows, avec les réglages du pilote (bac, qualité, options).');
      champDuplex = field('Recto verso', duplex);
      champCopies = field('Copies', copies);
      bureau.imprimantes().then(liste => {
        if (!Array.isArray(liste) || !liste.length) return;
        imprimante.replaceChildren();
        liste.forEach(p => {
          const op = document.createElement('option');
          op.value = p.name; op.textContent = p.displayName || p.name;
          if (p.isDefault) op.selected = true;
          imprimante.appendChild(op);
        });
      }).catch(e => signaler('Imprimantes', e));
    } else {
      const destination = document.createElement('div');
      destination.className = 'imp-destination';
      const destNom = document.createElement('b');
      destNom.textContent = state.impressionDirecte ? 'Imprimante par défaut de Windows' : 'Choisie à l\'étape suivante';
      destination.appendChild(destNom);
      champDestination = field('Imprimante', destination, state.impressionDirecte
        ? 'Envoi direct, sans autre fenêtre. Recto verso, couleur et bac suivent les réglages par défaut de cette imprimante dans Windows.'
        : 'Le navigateur vous demandera l\'imprimante et ses réglages.');
    }

    const papier = select('imp-papier', [['doc', 'Comme le document'], ['a4', 'A4'], ['a3', 'A3'], ['letter', 'Letter'], ['legal', 'Legal']], 'doc');
    const pourcent = input('imp-pct', 'number', 100, { min: 10, max: 400, step: 1 });
    pourcent.setAttribute('aria-label', 'Pourcentage');
    const echelle = document.createElement('div');
    echelle.className = 'radios';
    echelle.id = 'imp-echelle';
    [['ajuster', 'Ajuster'], ['reelle', 'Taille réelle'], ['reduire', 'Réduire les pages hors format'], ['perso', 'Échelle personnalisée :']].forEach(([v, l]) => {
      const lab = document.createElement('label'); lab.className = 'radio-row';
      const r = document.createElement('input'); r.type = 'radio'; r.name = 'imp-echelle'; r.value = v; r.checked = v === 'ajuster';
      const sp = document.createElement('span'); sp.textContent = l;
      lab.append(r, sp);
      if (v === 'perso') lab.append(pourcent, document.createTextNode('%'));
      echelle.appendChild(lab);
    });
    Object.defineProperty(echelle, 'value', {
      get: () => { const r = echelle.querySelector('input[name="imp-echelle"]:checked'); return r ? r.value : 'ajuster'; },
      set: v => { const r = echelle.querySelector('input[value="' + v + '"]'); if (r) r.checked = true; },
    });
    // Une saisie dans le pourcentage vaut choix de l'échelle personnalisée.
    pourcent.addEventListener('focus', () => { echelle.value = 'perso'; });
    const champPct = document.createElement('span');
    champPct.hidden = true;
    // La source de papier suit le format de chaque page : c'est « Papier :
    // comme le document », dont l'imprimante reçoit le format et choisit le bac.
    const bacSelonPage = checkbox('imp-bac', 'Choisir la source de papier selon le format de la page PDF', false);
    const orientation = segmented('imp-orient', [['auto', 'Auto'], ['portrait', 'Portrait'], ['paysage', 'Paysage']], 'auto', v => { o.orientation = v; rafraichir(); });

    const faces = select('imp-faces', [['toutes', 'Toutes les pages'], ['impaires', 'Pages impaires seulement'], ['paires', 'Pages paires seulement']], 'toutes');
    const champFaces = field('Sous-ensemble', faces);
    const inverse = checkbox('imp-inv', 'Ordre inverse, de la dernière à la première', false);

    // ------------------------------------------------------------- aperçu
    const vue = document.createElement('div'); vue.className = 'imp-vue';
    const attente = document.createElement('span'); attente.className = 'attente'; attente.textContent = 'Aperçu…';
    vue.appendChild(attente);
    const chiffres = document.createElement('div'); chiffres.className = 'chiffres';
    const legende = document.createElement('div'); legende.className = 'chiffres';
    const nav = document.createElement('div'); nav.className = 'imp-nav';
    const prec = document.createElement('button'); prec.type = 'button'; prec.textContent = '‹'; prec.setAttribute('aria-label', 'Feuille précédente');
    const suiv = document.createElement('button'); suiv.type = 'button'; suiv.textContent = '›'; suiv.setAttribute('aria-label', 'Feuille suivante');
    const compte = document.createElement('span');
    nav.append(prec, compte, suiv);
    const bloc = document.createElement('div'); bloc.className = 'imp-apercu';
    bloc.append(chiffres, vue, nav, legende);

    let feuille = 0, total = 0, jeton = 0, cacheCle = null, cacheOctets = null, minuteur = null;
    prec.addEventListener('click', () => { if (feuille > 0) { feuille--; dessiner(); } });
    suiv.addEventListener('click', () => { if (feuille < total - 1) { feuille++; dessiner(); } });

    const signature = p => [p.map(x => x.id).join(','), o.disposition, o.parFeuille, o.ordre, o.bordure,
      o.reliure, o.cotes, o.papier, o.echelle, o.pourcent, o.orientation].join('|');

    let doc = null;
    async function reconstruire() {
      const p = retenues();
      const cle = signature(p);
      if (cle === cacheCle && doc) return;
      const mien = ++jeton;
      attente.textContent = 'Aperçu…';
      if (!p.length) { vue.replaceChildren(attente); attente.textContent = 'Rien à imprimer.'; chiffres.textContent = ''; compte.textContent = ''; total = 0; majNav(); return; }
      try {
        let octets = cacheOctets && cacheCle && cacheCle.split('|')[0] === cle.split('|')[0] ? cacheOctets : await buildPdf(p, {});
        if (mien !== jeton) return;
        cacheOctets = octets;
        const imposes = await imposerPdf(octets, o);
        if (mien !== jeton) return;
        if (doc) { try { doc.destroy(); } catch (_) {} }
        doc = await pdfjs.getDocument({ data: imposes.slice(0) }).promise;
        if (mien !== jeton) { try { doc.destroy(); } catch (_) {} doc = null; return; }
        cacheCle = cle;
        total = doc.numPages;
        if (feuille >= total) feuille = 0;
        await dessiner();
      } catch (e) {
        console.error(e);
        vue.replaceChildren(attente);
        attente.textContent = 'Aperçu indisponible.';
      }
    }

    async function dessiner() {
      if (!doc) return;
      majNav();
      const pg = await doc.getPage(feuille + 1);
      const v1 = pg.getViewport({ scale: 1 });
      const k = Math.min(214 / v1.width, 244 / v1.height, 1.6);
      const vp = pg.getViewport({ scale: k });
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.ceil(vp.width));
      cv.height = Math.max(1, Math.ceil(vp.height));
      const cx = cv.getContext('2d', { alpha: false });
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
      await pg.render({ canvasContext: cx, viewport: vp }).promise;
      pg.cleanup();
      vue.replaceChildren(cv);
      const mm = t => (t * 25.4 / 72).toFixed(0);
      chiffres.textContent = mm(v1.width) + ' × ' + mm(v1.height) + ' mm'
        + (o.echelle === 'perso' ? '  ·  ' + (o.pourcent || 100) + ' %' : '');
      legende.textContent = o.disposition === 'livret' ? livretLegende(feuille, retenues().length, o) : '';
    }

    // Ce que porte la feuille affichée, en clair : « feuille 1, recto, page 8
    // et page 1 ». Sans quoi l'aperçu a tout l'air d'un désordre.
    function livretLegende(i, combien, opt) {
      const j = opt.cotes === 'tous' ? i : opt.cotes === 'recto' ? 2 * i : 2 * i + 1;
      const t = Math.floor(j / 2);
      const verso = j % 2 === 1;
      const paire = livretOrdre(combien)[j] || [0, 0];
      const [g, d] = opt.reliure === 'droite' ? [paire[1], paire[0]] : paire;
      const nom = k => (k + 1 > combien ? 'blanche' : 'page ' + (k + 1));
      return 'Feuille ' + (t + 1) + ', ' + (verso ? 'verso' : 'recto') + ' · ' + nom(g) + ' et ' + nom(d);
    }
    function majNav() {
      compte.textContent = total ? 'Feuille ' + (feuille + 1) + ' sur ' + total : '';
      prec.disabled = feuille <= 0;
      suiv.disabled = feuille >= total - 1;
    }

    const retenues = () => {
      let liste;
      if (o.quoi === 'selection') liste = selectedPages();
      else if (o.quoi !== 'plage') liste = state.pages.slice();
      else {
        const vues = new Set();
        String(plage.value).split(',').forEach(bout => {
          const m = /^\s*(\d+)\s*(?:[-–]\s*(\d+))?\s*$/.exec(bout);
          if (!m) return;
          // On ne ramène pas un numéro hors du document sur la première page :
          // « 9-12 » dans un document de 5 pages ne désigne rien.
          const a = parseInt(m[1], 10), b = m[2] ? parseInt(m[2], 10) : a;
          if (!(a > 0) || !(b > 0)) return;
          const d = Math.max(1, Math.min(a, b)), f = Math.min(state.pages.length, Math.max(a, b));
          for (let i = d; i <= f; i++) vues.add(i - 1);
        });
        liste = Array.from(vues).sort((x, y) => x - y).map(i => state.pages[i]);
      }
      if (o.disposition !== 'livret') {
        if (o.faces === 'impaires') liste = liste.filter((_, i) => i % 2 === 0);
        else if (o.faces === 'paires') liste = liste.filter((_, i) => i % 2 === 1);
        if (o.inverse) liste = liste.slice().reverse();
      }
      return liste;
    };

    function rafraichir() {
      o.parFeuille = parseInt(nup.value, 10) || 4;
      o.ordre = ordre.value; o.bordure = bordure.input.checked;
      o.reliure = reliure.value; o.cotes = cotes.value;
      o.papier = papier.value; o.echelle = echelle.value;
      o.pourcent = Math.max(10, Math.min(400, parseFloat(pourcent.value) || 100));
      o.faces = faces.value; o.inverse = inverse.input.checked;
      boutonsMode.forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === o.disposition ? 'true' : 'false'));
      champPlage.hidden = o.quoi !== 'plage';
      blocNup.hidden = o.disposition !== 'nup';
      blocLivret.hidden = o.disposition !== 'livret';
      champPct.hidden = o.echelle !== 'perso';
      // Un livret a son propre recto verso et sa propre feuille : le
      // sous-ensemble et l'échelle libre n'y ont pas de sens.
      champFaces.hidden = o.disposition === 'livret';
      inverse.hidden = o.disposition === 'livret';
      if (o.disposition === 'livret' && duplex.value === 'simplex') duplex.value = 'shortEdge';
      clearTimeout(minuteur);
      minuteur = setTimeout(reconstruire, 220);
    }
    [nup, ordre, reliure, cotes, papier, echelle, pourcent, faces].forEach(c => c.addEventListener('change', rafraichir));
    bacSelonPage.input.addEventListener('change', () => {
      if (bacSelonPage.input.checked) papier.value = 'doc';
      papier.disabled = bacSelonPage.input.checked;
      rafraichir();
    });
    [bordure.input, inverse.input].forEach(c => c.addEventListener('change', rafraichir));
    plage.addEventListener('input', rafraichir);
    pourcent.addEventListener('input', rafraichir);

    const lancer = quoi => close => {
      const pages = retenues();
      if (!pages.length) { toast('Cette plage ne désigne aucune page.', 'warn'); return; }
      o.imprimante = imprimante.value;
      o.duplex = duplex.value;
      o.copies = clampInt(copies.value, 1, 99) || 1;
      o.qualite = qualite.value;
      clearTimeout(minuteur);
      jeton++;
      if (doc) { try { doc.destroy(); } catch (_) {} doc = null; }
      close();
      if (quoi === 'imprimer') { imprimerPages(pages, o); return; }
      if (quoi === 'proprietes') { imprimerPages(pages, Object.assign({}, o, { dialogue: true })); return; }
      assemblerPourImpression(pages, o).then(octets => {
        if (octets) deliver(octets, safeBase(el.filename.value)
          + (o.disposition === 'livret' ? '-livret' : o.disposition === 'nup' ? '-' + o.parFeuille + '-par-feuille' : '') + '.pdf');
      });
    };

    dialog({
      title: 'Imprimer', icon: IC.print, wide: true, submitOnEnter: true,
      build: b => {
        const grille = document.createElement('div'); grille.className = 'imp-grille';
        const gauche = document.createElement('div'); gauche.className = 'imp-reglages';
        gauche.append(
          champDestination,
          field('Pages à imprimer', seg), champPlage,
          field('Dimensionnement et gestion des pages', modes),
          blocNup, blocLivret,
          field('Papier', papier), field('Mise à l\'échelle', echelle), champPct,
          field('Orientation', orientation),
          champFaces, inverse,
        );
        if (champDuplex) gauche.append(champDuplex, champCopies, bacSelonPage);
        gauche.append(champQualite);
        grille.append(gauche, bloc);
        b.append(grille);
        rafraichir();
      },
      onClose: () => { jeton++; clearTimeout(minuteur); if (doc) { try { doc.destroy(); } catch (_) {} doc = null; } },
      actions: [
        { label: 'Annuler', onClick: c => c() },
        { label: 'Enregistrer', onClick: lancer('enregistrer') },
        ...(bureau ? [{ label: 'Propriétés…', onClick: lancer('proprietes') }] : []),
        { label: 'Imprimer', primary: true, onClick: lancer('imprimer') },
      ],
    });
  }

