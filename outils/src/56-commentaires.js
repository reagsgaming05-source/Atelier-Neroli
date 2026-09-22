  // =====================================================================
  //  Commentaires déjà présents dans un PDF reçu : les lister, en retirer
  // =====================================================================
  const TYPES_COMMENTAIRES = {
    Text: 'Note', FreeText: 'Texte libre', Highlight: 'Surlignage', Underline: 'Soulignement', StrikeOut: 'Texte barré',
    Squiggly: 'Soulignement ondulé', Square: 'Cadre', Circle: 'Ellipse', Line: 'Ligne', Polygon: 'Polygone', PolyLine: 'Ligne brisée',
    Ink: 'Dessin', Stamp: 'Tampon', FileAttachment: 'Pièce jointe', Caret: 'Insertion', Redact: 'Caviardage', Sound: 'Son', Movie: 'Vidéo',
  };
  async function commentairesDe(src) {
    if (src.commentaires) return src.commentaires;
    const out = [];
    try {
      for (let i = 0; i < src.count; i++) {
        const page = await src.pdfjs.getPage(i + 1);
        const liste = await page.getAnnotations();
        liste.forEach(a => {
          if (!a || !a.subtype || a.subtype === 'Link' || a.subtype === 'Widget' || a.subtype === 'Popup') return;
          if (!/^\d+R/.test(String(a.id))) return;
          const dateBrute = a.modificationDate || '';
          const m = /^D:(\d{4})(\d{2})(\d{2})/.exec(dateBrute);
          out.push({
            id: String(a.id), index: i, type: a.subtype, libelle: TYPES_COMMENTAIRES[a.subtype] || a.subtype,
            auteur: (a.titleObj && a.titleObj.str) || a.title || '', contenu: (a.contentsObj && a.contentsObj.str) || a.contents || '',
            date: m ? m[3] + '.' + m[2] + '.' + m[1] : '', rect: a.rect,
          });
        });
      }
    } catch (e) { signaler('Commentaires du document', e); }
    src.commentaires = out;
    return out;
  }
  // Dans le PDF exporté : les commentaires retirés disparaissent de la page,
  // et leurs bulles avec eux.
  function retirerCommentaires(doc, page, p) {
    const ids = p.retraits || [];
    if (!ids.length) return 0;
    const { PDFName, PDFDict, PDFRef } = PDFLib;
    const ctx = doc.context;
    let annots = null;
    try { annots = page.node.Annots(); } catch (_) { annots = null; }
    if (!annots) return 0;
    const idDe = ref => ref.objectNumber + 'R' + (ref.generationNumber ? ref.generationNumber : '');
    const retires = new Set();
    const garde = [];
    annots.asArray().forEach(item => { if (item instanceof PDFRef && ids.indexOf(idDe(item)) >= 0) retires.add(item.toString()); else garde.push(item); });
    if (!retires.size) return 0;
    const finales = garde.filter(item => {
      const a = ctx.lookup(item);
      if (!(a instanceof PDFDict)) return true;
      const parent = a.get(PDFName.of('Parent'));
      return !(parent instanceof PDFRef && retires.has(parent.toString()));
    });
    page.node.set(PDFName.of('Annots'), ctx.obj(finales));
    return retires.size;
  }
  // À l'écran : la page rendue sans ses commentaires retirés. Le rendu se
  // fait une seconde fois sans annotations, et les zones retirées sont
  // recopiées depuis ce rendu-là.
  async function effacerRetraits(cx, page, vp, p) {
    const ids = p.retraits || [];
    if (!ids.length) return;
    const src = srcById(p.src);
    if (!src) return;
    const liste = await commentairesDe(src);
    const rects = liste.filter(c => c.index === p.index && ids.indexOf(c.id) >= 0 && c.rect).map(c => c.rect);
    if (!rects.length) return;
    const off = document.createElement('canvas');
    off.width = cx.canvas.width; off.height = cx.canvas.height;
    const oc = off.getContext('2d', { alpha: false });
    oc.fillStyle = '#fff'; oc.fillRect(0, 0, off.width, off.height);
    await page.render({ canvasContext: oc, viewport: vp, annotationMode: pdfjs.AnnotationMode ? pdfjs.AnnotationMode.DISABLE : 0 }).promise;
    rects.forEach(r => {
      const v = vp.convertToViewportRectangle(r);
      const x = Math.max(0, Math.floor(Math.min(v[0], v[2]) - 2)), y = Math.max(0, Math.floor(Math.min(v[1], v[3]) - 2));
      const w = Math.min(off.width - x, Math.ceil(Math.abs(v[2] - v[0]) + 4)), h = Math.min(off.height - y, Math.ceil(Math.abs(v[3] - v[1]) + 4));
      if (w > 0 && h > 0) cx.drawImage(off, x, y, w, h, x, y, w, h);
    });
  }
  function toolCommentaires() {
    const sources = state.sources.filter(s => !s.isSample && !s.genere);
    const liste = document.createElement('div'); liste.className = 'list';
    const info = note('Lecture des commentaires…');
    const cases = [];
    let api = null;
    (async () => {
      let total = 0;
      for (const src of sources) {
        const cs = await commentairesDe(src);
        cs.forEach(c => {
          const pagesConcernees = state.pages.filter(p => p.src === src.id && p.index === c.index);
          if (!pagesConcernees.length) return;
          total++;
          const retire = pagesConcernees.every(p => (p.retraits || []).indexOf(c.id) >= 0);
          const ligne = document.createElement('div'); ligne.className = 'list-item';
          const cb = checkbox('cm-' + src.id + '-' + c.id, '', retire);
          const g = document.createElement('div'); g.className = 'g';
          const n = document.createElement('div'); n.className = 'n';
          n.textContent = c.libelle + (c.auteur ? ' · ' + c.auteur : '') + (c.date ? ' · ' + c.date : '');
          const sdiv = document.createElement('div'); sdiv.className = 's';
          sdiv.textContent = 'Page ' + (pageIndex(pagesConcernees[0].id) + 1) + (sources.length > 1 ? ' · ' + baseName(src.name) : '') + (c.contenu ? ' · « ' + c.contenu.slice(0, 80) + (c.contenu.length > 80 ? '…' : '') + ' »' : '');
          g.append(n, sdiv);
          ligne.append(cb, g);
          liste.appendChild(ligne);
          cases.push({ cb: cb.input, src, c, pages: pagesConcernees });
        });
      }
      info.textContent = total ? plural(total, 'commentaire', 'commentaires') + ' dans le document. Cochez ceux à retirer : ils disparaîtront du PDF exporté.' : 'Aucun commentaire dans les documents ouverts.';
    })();
    api = dialog({
      title: 'Commentaires du document', icon: IC.info, wide: true, submitOnEnter: false,
      build: b => {
        b.append(note('Les notes, surlignages, tampons et autres commentaires déjà présents dans les PDF ouverts. Ce que vous avez ajouté ici se règle dans l\'éditeur de page.'));
        b.append(info);
        b.append(liste);
      },
      actions: [
        { label: 'Annuler', onClick: c => c() },
        { label: 'Tout retirer', onClick: () => { cases.forEach(x => { x.cb.checked = true; }); } },
        { label: 'Appliquer', primary: true, onClick: close => {
          snapshot();
          let retires = 0;
          state.pages.forEach(p => { p.retraits = []; });
          cases.forEach(x => { if (!x.cb.checked) return; retires++; x.pages.forEach(p => { p.retraits = (p.retraits || []).concat([x.c.id]); }); });
          state.touched = true;
          state.pages.forEach(p => peintes.delete(p.id));
          render();
          close();
          setLast(retires ? plural(retires, 'commentaire retiré', 'commentaires retirés') + ' : ils disparaîtront à l\'export' : 'Aucun commentaire retiré');
        } },
      ],
    });
  }

  // =====================================================================
  //  Liens internes : un sommaire cliquable, un renvoi « voir page 12 »
  //  doivent suivre les pages quand on réorganise ou fusionne.
  // =====================================================================
  // Avant la copie : chaque lien vers une page du document est marqué de
  // l'index de cette page et débarrassé de sa référence, qui ne survivrait
  // pas à la copie. Les liens vers l'extérieur ne sont pas touchés.
  async function marquerLiens(doc, src) {
    if (doc.__liensMarques) return;
    doc.__liensMarques = true;
    const { PDFName, PDFArray, PDFDict, PDFRef, PDFString, PDFHexString, PDFNumber, PDFNull } = PDFLib;
    const ctx = doc.context;
    const pages = doc.getPages();
    const indexDe = new Map();
    pages.forEach((pg, i) => indexDe.set(pg.ref.toString(), i));
    const N = k => PDFName.of(k);
    const resoudre = async dest => {
      const d = dest instanceof PDFRef ? ctx.lookup(dest) : dest;
      if (d instanceof PDFString || d instanceof PDFHexString) {
        // Destination nommée : le lecteur pdf.js sait la résoudre.
        let nom = '';
        try { nom = d.decodeText(); } catch (_) { nom = ''; }
        if (!nom || !src || !src.pdfjs) return null;
        try {
          const ex = await src.pdfjs.getDestination(nom);
          if (!Array.isArray(ex) || !ex.length || !ex[0] || typeof ex[0].num !== 'number') return null;
          const i = await src.pdfjs.getPageIndex(ex[0]);
          const reste = ex.slice(1).map(v => (v && typeof v === 'object' && v.name ? PDFName.of(v.name) : typeof v === 'number' ? PDFNumber.of(v) : PDFNull));
          return { index: i, reste };
        } catch (_) { return null; }
      }
      if (!(d instanceof PDFArray) || !d.size()) return null;
      const premier = d.get(0);
      if (premier instanceof PDFNumber) return { index: premier.asNumber(), reste: d.asArray().slice(1) };
      if (!(premier instanceof PDFRef)) return null;
      const i = indexDe.get(premier.toString());
      return i == null ? null : { index: i, reste: d.asArray().slice(1) };
    };
    for (const pg of pages) {
      const annots = pg.node.Annots();
      if (!annots) continue;
      for (const item of annots.asArray()) {
        const a = ctx.lookup(item);
        if (!(a instanceof PDFDict)) continue;
        const sub = a.get(N('Subtype'));
        if (!sub || sub.toString() !== '/Link') continue;
        let dest = a.get(N('Dest')), viaAction = false;
        if (!dest) {
          const act = ctx.lookup(a.get(N('A')));
          const s = act instanceof PDFDict ? act.get(N('S')) : null;
          if (s && s.toString() === '/GoTo') { dest = act.get(N('D')); viaAction = true; }
        }
        if (!dest) continue;
        let r = null;
        try { r = await resoudre(dest); } catch (_) { r = null; }
        if (!r) continue;
        a.set(N('BlonayCible'), PDFNumber.of(r.index));
        a.set(N('BlonayReste'), ctx.obj(r.reste));
        a.delete(N('Dest'));
        if (viaAction) a.delete(N('A'));
      }
    }
  }
  // Après la copie : les marques redeviennent des destinations, vers les
  // pages du document exporté ; un lien vers une page absente est retiré.
  function reposerLiens(out, mapped) {
    const { PDFName, PDFDict } = PDFLib;
    const ctx = out.context;
    const N = k => PDFName.of(k);
    const cible = new Map();
    mapped.forEach(({ p, page }) => { const k = p.src + ':' + p.index; if (!cible.has(k)) cible.set(k, page.ref); });
    let poses = 0, retires = 0;
    mapped.forEach(({ p, page }) => {
      let annots = null;
      try { annots = page.node.Annots(); } catch (_) { annots = null; }
      if (!annots) return;
      const garde = [];
      let change = false;
      annots.asArray().forEach(item => {
        const a = ctx.lookup(item);
        if (!(a instanceof PDFDict) || !a.has(N('BlonayCible'))) { garde.push(item); return; }
        change = true;
        const idx = a.get(N('BlonayCible')).asNumber();
        const reste = ctx.lookup(a.get(N('BlonayReste')));
        a.delete(N('BlonayCible')); a.delete(N('BlonayReste'));
        const ref = cible.get(p.src + ':' + idx);
        if (!ref) { retires++; return; }
        const suite = reste && reste.asArray ? reste.asArray() : [];
        a.set(N('Dest'), ctx.obj([ref].concat(suite.length ? suite : [N('Fit')])));
        garde.push(item); poses++;
      });
      if (change) page.node.set(N('Annots'), ctx.obj(garde));
    });
    return { poses, retires };
  }

  function canExportInPlace(pages) {
    if (state.sources.length !== 1) return false;
    const src = state.sources[0];
    if (pages.length !== src.count) return false;
    return pages.every((p, i) => p.src === src.id && p.index === i);
  }

  let uidImageCaviardee = 0;
  async function buildPdf(pages, opts) {
    opts = opts || {};
    // Un dossier de pièces porte un sommaire et des intercalaires qui suivent
    // les pages. S'ils sont en train d'être refaits, on les attend : ce qui
    // part doit porter les numéros d'aujourd'hui, pas ceux d'avant le dernier
    // déplacement. La régénération remplace la source générée, et peut au
    // passage laisser des pages en trop dans la liste reçue : on ne garde que
    // celles qui sont encore dans le document.
    if (state.dossier) {
      await sommairePret();
      const vivantes = new Set(state.pages.map(p => p.id));
      if (pages.some(p => !vivantes.has(p.id))) pages = pages.filter(p => vivantes.has(p.id));
    }
    const { PDFDocument, degrees } = PDFLib;
    const onProgress = opts.onProgress || (() => {});
    const rasterAll = !!opts.rasterize;
    const rasterSet = new Set();
    // Une page caviardée reste vectorielle quand ses lettres peuvent être
    // vidées du flux ; sinon (image dessous, police illisible) elle est
    // convertie en image, comme avant.
    const docsVerif = new Map(), policesVerif = new Map();
    const imagesCaviardees = new Map();   // pageId -> [{ nom, donnees }]
    for (const p of pages) {
      if (rasterAll) { rasterSet.add(p.id); continue; }
      if (!p.ann.some(a => a.type === 'redact' || (a.type === 'edit' && a.efface))) continue;
      let bilan = { propre: false, images: [] };
      try {
        const src = srcById(p.src);
        if (src) {
          if (!docsVerif.has(src.id)) docsVerif.set(src.id, await loadLib(src));
          const dv = docsVerif.get(src.id);
          bilan = fxCaviardageBilan(dv, dv.getPages()[p.index], p, policesVerif);
        }
      } catch (e) { signaler('Caviardage', e); bilan = { propre: false, images: [] }; }
      // Les images concernées sont refaites tout de suite : si cela échoue,
      // on revient à la page convertie en image, comme avant.
      if (bilan.propre && bilan.images.length) {
        try {
          onProgress(0, 'Caviardage des images…');
          const bouts = await preparerCaviardageImages(p, bilan.images);
          if (bouts.length) imagesCaviardees.set(p.id, bouts);
        } catch (e) { signaler('Caviardage', e); bilan.propre = false; }
      }
      if (!bilan.propre) { rasterSet.add(p.id); imagesCaviardees.delete(p.id); }
      onProgress(0, 'Vérification du caviardage…');
    }

    const inPlace = !rasterSet.size && !opts.noInPlace && canExportInPlace(pages);
    let out, mapped;
    if (inPlace) {
      out = await sourceDoc(state.sources[0], false);
      const docPages = out.getPages();
      mapped = pages.map(p => ({ p, page: docPages[p.index] }));
      mapped.forEach(({ p, page }) => { try { retirerCommentaires(out, page, p); } catch (e) { signaler('Commentaires', e); } });
    } else {
      out = await PDFDocument.create();
      const bySource = new Map();
      pages.forEach((p, k) => {
        if (rasterSet.has(p.id)) return;
        if (!bySource.has(p.src)) bySource.set(p.src, []);
        bySource.get(p.src).push({ p, k });
      });
      const placed = new Array(pages.length);
      for (const [sid, items] of bySource) {
        const src = srcById(sid);
        if (!src) throw new Error('Document source introuvable.');
        const doc = await sourceDoc(src, !!(src.formValues && Object.keys(src.formValues).length));
        try { await marquerLiens(doc, src); } catch (e) { signaler('Liens', e); }
        const pagesDoc = doc.getPages();
        items.forEach(it => { try { retirerCommentaires(doc, pagesDoc[it.p.index], it.p); } catch (e) { signaler('Commentaires', e); } });
        const copied = await out.copyPages(doc, items.map(it => it.p.index));
        items.forEach((it, i) => { placed[it.k] = copied[i]; });
      }
      for (let k = 0; k < pages.length; k++) {
        const p = pages[k];
        if (rasterSet.has(p.id)) {
          onProgress(k / pages.length, 'Conversion de la page ' + (k + 1) + '…');
          const { canvas, g } = await rasterizePage(p, opts.dpi || 150);
          const dataUrl = canvas.toDataURL('image/jpeg', opts.quality == null ? 0.85 : opts.quality);
          const img = await out.embedJpg(dataUrl);
          const page = out.addPage([g.Wd, g.Hd]);
          page.drawImage(img, { x: 0, y: 0, width: g.Wd, height: g.Hd });
          placed[k] = page;
        } else {
          out.addPage(placed[k]);
        }
      }
      mapped = pages.map((p, k) => ({ p, page: placed[k] }));
    }
    try { reposerLiens(out, mapped); } catch (e) { signaler('Liens', e); }

    const fonts = new Map(), images = new Map();
    // Les noms déjà portés par les formulaires d'origine, pour ne pas les
    // écraser avec un champ ajouté ici.
    const nomsPris = new Set();
    try { out.getForm().getFields().forEach(f => nomsPris.add(f.getName())); } catch (_) {}
    const file = safeBase(el.filename.value);
    const bates = state.stamp && state.stamp.batesPrefix != null ? state.stamp : null;
    for (let i = 0; i < mapped.length; i++) {
      const { p, page } = mapped[i];
      const g = pageGeom(p);
      const raster = rasterSet.has(p.id);
      if (!raster) {
        page.setRotation(degrees(g.total));
        // Les images refaites entrent dans le document sous un nom neuf ;
        // le flux de la page ira les chercher à la place des anciennes.
        const renommages = new Map();
        const bouts = imagesCaviardees.get(p.id);
        if (bouts) {
          for (const b of bouts) {
            try {
              const im = await out.embedJpg(b.donnees);
              const neuf = 'BlonayCav' + (++uidImageCaviardee);
              fxPoserImage(out, page, neuf, im.ref);
              renommages.set(b.nom, neuf);
            } catch (e) { signaler('Caviardage', e); }
          }
        }
        // D'abord ce qui peut être réécrit dans le flux de la page : ni
        // rectangle, ni fond relevé, rien d'autre ne bouge.
        const enPlace = fxRetoucher(out, page, p, fonts, renommages);
        await drawAnnotations(out, page, p, fonts, images, enPlace);
      }
      await poserChamps(out, page, p, fonts, nomsPris);
      await poserAnnotationsReelles(out, page, p, fonts);
      await poserTexteOcr(out, page, p, fonts);
      if (!raster) await dessinerMention(out, page, p, fonts);
      await drawWatermark(out, page, p, fonts);
      const num = (state.stamp ? state.stamp.start : 1) + i;
      await drawStamp(out, page, p, fonts, {
        i, p: num, n: pages.length, date: todayStr(), file,
        bates: bates ? (bates.batesPrefix || '') + pad(num, bates.batesDigits || 4) : String(num),
      });
      if (i % 12 === 0) onProgress(i / mapped.length, 'Assemblage… ' + (i + 1) + '/' + mapped.length);
    }

    poserSignets(out, mapped, state.signets);

    const m = state.meta;
    out.setCreator(APP);
    if (m.title) out.setTitle(m.title); if (m.author) out.setAuthor(m.author);
    if (m.subject) out.setSubject(m.subject);
    if (m.keywords) out.setKeywords(m.keywords.split(/[,;]\s*/).filter(Boolean));
    out.setModificationDate(new Date());

    if (state.security && FEAT.encrypt) {
      const s = state.security;
      const o = { permissions: s.permissions || {} };
      if (s.userPassword) o.userPassword = s.userPassword;
      if (s.ownerPassword) o.ownerPassword = s.ownerPassword;
      if (o.userPassword || o.ownerPassword) out.encrypt(o);
    }
    onProgress(1, 'Finalisation…');
    return out.save();
  }

