  // =====================================================================
  //  Constituer un dossier de pièces
  //  -------------------------------------------------------------------
  //  Chaque document ouvert devient une pièce numérotée : un intercalaire
  //  devant, la mention « Pièce n° » sur ses pages, une pagination
  //  continue, un sommaire en tête et un signet par pièce.
  // =====================================================================
  function piecesDuDocument() {
    const ordre = [];
    const parSrc = new Map();
    state.pages.forEach(p => {
      if (!parSrc.has(p.src)) { parSrc.set(p.src, []); ordre.push(p.src); }
      parSrc.get(p.src).push(p);
    });
    return ordre.map(id => srcById(id)).filter(Boolean).filter(src => !src.genere)
      .map(src => ({ src, pages: parSrc.get(src.id), titre: baseName(src.name) }));
  }
  const couperTexte = (font, texte, taille, largeur) => {
    let t = winAnsi(texte);
    if (font.widthOfTextAtSize(t, taille) <= largeur) return t;
    while (t.length > 1 && font.widthOfTextAtSize(t + '\u2026', taille) > largeur) t = t.slice(0, -1);
    return t.replace(/\s+$/, '') + '\u2026';
  };
  const replierPdf = (font, texte, taille, largeur, max) => {
    const out = [];
    let ligne = '';
    winAnsi(texte).split(/\s+/).forEach(mot => {
      const essai = ligne ? ligne + ' ' + mot : mot;
      if (!ligne || font.widthOfTextAtSize(essai, taille) <= largeur) ligne = essai;
      else { out.push(ligne); ligne = mot; }
    });
    if (ligne) out.push(ligne);
    if (out.length > max) { out.length = max; out[max - 1] = couperTexte(font, out[max - 1] + '\u2026', taille, largeur); }
    return out;
  };
  // Le sommaire et les intercalaires : un petit PDF fabriqué sur place.
  async function fabriquerPagesDossier(o) {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const doc = await PDFDocument.create();
    const reg = await doc.embedFont(StandardFonts.Helvetica);
    const gras = await doc.embedFont(StandardFonts.HelveticaBold);
    const W = 595.28, H = 841.89, marge = 60;
    const gris = rgb(0.42, 0.45, 0.5), noir = rgb(0.08, 0.09, 0.11), bleu = rgb(0.15, 0.39, 0.79);
    const PAR_PAGE = 32;
    if (o.sommaire) {
      const nbPages = Math.max(1, Math.ceil(o.pieces.length / PAR_PAGE));
      for (let k = 0; k < nbPages; k++) {
        const pg = doc.addPage([W, H]);
        let y = H - 80;
        if (k === 0) {
          pg.drawText('Sommaire', { x: marge, y, size: 24, font: gras, color: noir });
          y -= 30;
          pg.drawText(couperTexte(reg, o.titre, 12, W - 2 * marge), { x: marge, y, size: 12, font: reg, color: gris });
          y -= 18;
          pg.drawText(winAnsi(plural(o.pieces.length, 'pi\u00e8ce', 'pi\u00e8ces') + ' \u00b7 ' + plural(o.totalPages, 'page', 'pages') + ' \u00b7 ' + todayStr()), { x: marge, y, size: 10, font: reg, color: gris });
          y -= 14;
        } else {
          pg.drawText('Sommaire (suite)', { x: marge, y, size: 16, font: gras, color: noir });
          y -= 16;
        }
        pg.drawRectangle({ x: marge, y: y - 6, width: W - 2 * marge, height: 1.2, color: bleu });
        y -= 30;
        o.pieces.slice(k * PAR_PAGE, (k + 1) * PAR_PAGE).forEach(pc => {
          const num = winAnsi('Pi\u00e8ce n\u00b0 ' + pc.n);
          pg.drawText(num, { x: marge, y, size: 11, font: gras, color: noir });
          const pageTxt = pc.debut > 0 ? 'p. ' + pc.debut : '\u2014';
          const wp = reg.widthOfTextAtSize(pageTxt, 11);
          pg.drawText(pageTxt, { x: W - marge - wp, y, size: 11, font: reg, color: noir });
          const xT = marge + 78;
          const titre = couperTexte(reg, pc.titre, 11, W - marge - wp - 14 - xT);
          pg.drawText(titre, { x: xT, y, size: 11, font: reg, color: noir });
          // les points de conduite
          const xFin = W - marge - wp - 8, xDeb = xT + reg.widthOfTextAtSize(titre, 11) + 6;
          for (let x = xDeb; x < xFin; x += 5) pg.drawCircle({ x, y: y + 2, size: 0.55, color: gris });
          y -= 22;
        });
        pg.drawText(winAnsi(o.titre), { x: marge, y: 40, size: 9, font: reg, color: gris });
      }
    }
    if (o.intercalaires) {
      o.pieces.forEach(pc => {
        const pg = doc.addPage([W, H]);
        const sur = winAnsi('PI\u00c8CE N\u00b0');
        pg.drawText(sur, { x: (W - gras.widthOfTextAtSize(sur, 16)) / 2, y: H - 300, size: 16, font: gras, color: bleu });
        const n = String(pc.n);
        pg.drawText(n, { x: (W - gras.widthOfTextAtSize(n, 120)) / 2, y: H - 420, size: 120, font: gras, color: noir });
        let y = H - 480;
        replierPdf(gras, pc.titre, 20, W - 2 * marge, 3).forEach(l => {
          pg.drawText(l, { x: (W - gras.widthOfTextAtSize(l, 20)) / 2, y, size: 20, font: gras, color: noir });
          y -= 28;
        });
        const sous = winAnsi(pc.debut > 0
          ? plural(pc.pages.length, 'page', 'pages') + (o.numerotation && pc.pages.length ? ' \u00b7 pages ' + (pc.debut + (o.intercalaires ? 1 : 0)) + ' \u00e0 ' + (pc.debut + pc.pages.length - (o.intercalaires ? 0 : 1)) : '')
          : 'pi\u00e8ce retir\u00e9e du dossier');
        pg.drawText(sous, { x: (W - reg.widthOfTextAtSize(sous, 11)) / 2, y: y - 6, size: 11, font: reg, color: gris });
        pg.drawText(winAnsi(o.titre), { x: marge, y: 40, size: 9, font: reg, color: gris });
      });
    }
    return doc.save();
  }
  // Le sommaire et les intercalaires suivent le document : dès que l'ordre
  // des pages change, les pages générées sont refaites avec les bons
  // numéros. Ce qu'on voit est ce qu'on exporte.
  let sommaireEnCours = false;
  // La régénération en cours, s'il y en a une : l'assemblage l'attend, sinon
  // un dernier déplacement de page partirait avec les numéros d'avant.
  let sommaireEnVol = null;
  function lancerSommaire() {
    const p = rafraichirSommaire();
    sommaireEnVol = p;
    p.catch(() => {}).then(() => { if (sommaireEnVol === p) sommaireEnVol = null; });
    return p;
  }
  // À jour : rien en train d'être refait, et la signature colle aux pages
  // d'aujourd'hui. La signature est posée dès le début de la régénération :
  // elle ne suffit donc pas à elle seule à dire que le sommaire est prêt.
  const sommaireAJour = () => {
    const d = state.dossier;
    if (!d) return true;
    if (sommaireEnCours || sommaireEnVol) return false;
    return d.signature === state.pages.map(p => p.id).join(',');
  };
  // Attendre que le sommaire soit prêt : chaque tour attend ce qui est en vol,
  // puis relance si les pages ont encore bougé entre-temps. Borné, et on
  // n'insiste pas si une relance ne change rien : jamais d'attente sans fin.
  async function sommairePret() {
    for (let tour = 0; tour < 8; tour++) {
      if (sommaireEnVol) { try { await sommaireEnVol; } catch (_) {} continue; }
      if (sommaireAJour()) return;
      const avant = state.dossier ? state.dossier.signature : '';
      try { await lancerSommaire(); } catch (_) { return; }
      if (state.dossier && state.dossier.signature === avant) return;
    }
  }
  async function rafraichirSommaire() {
    const d = state.dossier;
    if (!d) return;
    // Après une annulation, la source générée peut avoir changé d'identité.
    let ancien = srcById(d.srcId) || state.sources.find(s2 => s2.genere && state.pages.some(p => p.src === s2.id && (p.sommaire || p.intercalaire)));
    if (!ancien) return;
    d.srcId = ancien.id;
    const sig = state.pages.map(p => p.id).join(',');
    if (sig === d.signature || sommaireEnCours) return;
    d.signature = sig;
    sommaireEnCours = true;
    try {
      const pieces = d.pieces.map(pc => {
        const i = state.pages.findIndex(p => p.intercalaire === pc.n || p.pieceN === pc.n);
        return { n: pc.n, titre: pc.titre, debut: i + 1, pages: new Array(state.pages.filter(p => p.pieceN === pc.n).length) };
      });
      const o = { titre: d.titre, intercalaires: d.intercalaires, numerotation: d.numerotation, sommaire: d.sommaire, pieces, totalPages: state.pages.length };
      const bytes = await fabriquerPagesDossier(o);
      const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      // Une nouvelle source prend la place de l'ancienne ; les pages gardent
      // leur identité (signets, mentions, position), seul le contenu change.
      const miennes = state.pages.filter(p => p.src === ancien.id);
      const neuf = await addPdfSource(ancien.name, buf, { silent: true });
      neuf.genere = true; neuf.hue = ancien.hue;
      state.pages = state.pages.filter(p => p.src !== neuf.id);
      miennes.forEach(p => { p.src = neuf.id; });
      state.sources = state.sources.filter(s => s !== ancien);
      const remapper = h => {
        if (h.sources) h.sources = h.sources.map(s2 => (s2 === ancien ? neuf : s2));
        (h.pages || []).forEach(p => { if (p.src === ancien.id) p.src = neuf.id; });
        if (h.dossier && h.dossier.srcId === ancien.id) h.dossier.srcId = neuf.id;
      };
      state.history.forEach(remapper); state.redo.forEach(remapper);
      d.srcId = neuf.id;
      miennes.forEach(p => peintes.delete(p.id));
      render();
    } catch (e) { signaler('Sommaire', e); }
    finally {
      sommaireEnCours = false;
      // Les pages ont encore bougé pendant qu'on refaisait le sommaire ? On recommence.
      if (state.pages.map(p => p.id).join(',') !== sig) { d.signature = ''; lancerSommaire(); }
    }
  }
  function toolDossier() {
    const pieces = piecesDuDocument();
    if (!pieces.length) { toast('Ouvrez d\'abord les documents qui composent le dossier.', 'warn'); return; }
    const titre = input('do-titre', 'text', 'Dossier du ' + todayStr());
    const inter = checkbox('do-inter', 'Un intercalaire devant chaque pièce (page de titre « Pièce n° »)', true);
    const mention = checkbox('do-mention', 'La mention « Pièce n° … » en haut à droite de chaque page', true);
    const numero = checkbox('do-num', 'Une pagination continue en pied de page', true);
    const sommaire = checkbox('do-som', 'Un sommaire en tête du dossier (pièces et pages)', true);
    const signets = checkbox('do-signets', 'Un signet par pièce', true);
    const liste = document.createElement('div'); liste.className = 'list';
    const titres = [];
    pieces.forEach((pc, k) => {
      const ligne = document.createElement('div'); ligne.className = 'list-item';
      const n = document.createElement('span'); n.className = 'p'; n.style.flex = 'none'; n.style.fontFamily = 'var(--chiffre)'; n.style.color = 'var(--bleu-vif)';
      n.textContent = 'Pièce n° ' + (k + 1);
      const g = document.createElement('div'); g.className = 'g';
      const t = input('do-piece-' + k, 'text', pc.titre);
      t.style.width = '100%';
      const sfx = document.createElement('div'); sfx.className = 's';
      sfx.textContent = plural(pc.pages.length, 'page', 'pages') + ' · ' + pc.src.name;
      g.append(t, sfx);
      ligne.append(n, g);
      liste.appendChild(ligne);
      titres.push(t);
    });
    dialog({
      title: 'Constituer un dossier de pièces', icon: IC.dossier, wide: true, submitOnEnter: false,
      build: b => {
        b.append(field('Titre du dossier', titre));
        b.append(groupOf('Les pièces, dans l\'ordre des pages', [liste]));
        b.append(inter, mention, numero, sommaire, signets);
        b.append(note('Chaque document ouvert devient une pièce ; ses pages sont regroupées. Le sommaire et les intercalaires se refont d\'eux-mêmes si vous déplacez ou retirez des pages ensuite, et le PDF enregistré porte toujours les numéros du moment. Ctrl+Z défait le tout.'));
      },
      actions: [{ label: 'Annuler', onClick: c => c() }, { label: 'Constituer le dossier', primary: true, onClick: async close => {
        close();
        setBusy('Constitution du dossier…', 0);
        try {
          const o = {
            titre: titre.value.trim() || ('Dossier du ' + todayStr()),
            intercalaires: inter.input.checked, mention: mention.input.checked, numerotation: numero.input.checked,
            sommaire: sommaire.input.checked, signets: signets.input.checked,
            pieces: pieces.map((pc, k) => ({ n: k + 1, titre: titres[k].value.trim() || pc.titre, pages: pc.pages, src: pc.src })),
          };
          const ns = o.sommaire ? Math.max(1, Math.ceil(o.pieces.length / 32)) : 0;
          let debut = ns + 1;
          o.pieces.forEach(pc => { pc.debut = debut; debut += (o.intercalaires ? 1 : 0) + pc.pages.length; });
          o.totalPages = debut - 1;
          snapshot();
          let gPages = [];
          if (o.sommaire || o.intercalaires) {
            const bytes = await fabriquerPagesDossier(o);
            const genere = await addPdfSource('Sommaire et intercalaires', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), { silent: true });
            genere.genere = true;
            gPages = state.pages.filter(p => p.src === genere.id);
          }
          const ordre = [];
          let gi = 0;
          const somPages = gPages.slice(0, ns); gi = ns;
          somPages.forEach((p, k) => { p.sommaire = k + 1; });
          ordre.push(...somPages);
          o.pieces.forEach(pc => {
            if (o.intercalaires) { const inter = gPages[gi++]; inter.intercalaire = pc.n; ordre.push(inter); }
            ordre.push(...pc.pages);
            pc.pages.forEach(p => { p.pieceN = pc.n; if (o.mention) p.piece = 'Pièce n° ' + pc.n; });
          });
          // De quoi refaire le sommaire quand les pages bougent.
          state.dossier = (o.sommaire || o.intercalaires) && gPages.length ? {
            titre: o.titre, pieces: o.pieces.map(pc => ({ n: pc.n, titre: pc.titre })),
            intercalaires: o.intercalaires, numerotation: o.numerotation, sommaire: o.sommaire,
            srcId: gPages[0].src, signature: '',
          } : null;
          // les pages d'autres sources générées (un dossier précédent) suivent
          state.pages.forEach(p => { if (ordre.indexOf(p) < 0 && gPages.indexOf(p) < 0) ordre.push(p); });
          state.pages = ordre;
          if (o.numerotation) {
            state.stamp = Object.assign({
              headerLeft: '', headerCenter: '', headerRight: '', footerLeft: '', footerCenter: '', footerRight: '',
              font: 'Helvetica', bold: false, size: 9, color: '#444444', margin: 28, start: 1, skipFirst: false, batesPrefix: '', batesDigits: 4,
            }, state.stamp || {}, { footerCenter: '{p} / {n}' });
          }
          if (o.signets) {
            if (somPages.length) insererSignet(state.signets, { id: ++uid, titre: 'Sommaire', page: somPages[0].id, enfants: [] });
            o.pieces.forEach((pc, k) => {
              const premiere = o.intercalaires ? gPages[ns + k] : pc.pages[0];
              if (premiere) insererSignet(state.signets, { id: ++uid, titre: 'Pièce n° ' + pc.n + ' — ' + pc.titre, page: premiere.id, enfants: [] });
            });
          }
          state.filenameDirty = true;
          el.filename.value = safeBase(o.titre);
          state.touched = true;
          state.selected.clear();
          render();
          setLast('Dossier constitué : ' + plural(o.pieces.length, 'pièce', 'pièces') + ', ' + plural(state.pages.length, 'page', 'pages') + ' · Ctrl+Z pour défaire');
        } catch (e) { console.error(e); toast('Le dossier n\'a pas pu être constitué : ' + e.message, 'error'); }
        finally { setBusy(''); }
      } }],
    });
  }

