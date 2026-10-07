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
      aide: 'commentaires',
      title: 'Commentaires du document', icon: IC.info, libre: true, submitOnEnter: false,
      build: b => {
        b.append(note('Les notes, surlignages, tampons et autres commentaires déjà présents dans les PDF ouverts. Ce que vous avez ajouté ici se règle dans l\'éditeur de page.'));
        b.append(info);
        b.append(liste);
      },
      actions: [
        { label: 'Annuler', onClick: c => c() },
        { label: 'Tout retirer', onClick: () => { cases.forEach(x => { x.cb.checked = true; }); } },
        { id: 'cm-reprendre', label: 'Reprendre les marques de caviardage', onClick: close => {
          // Les marques « Redact » d'un PDF reçu (en attente d'application) deviennent des zones de caviardage de ce document : on les relit à l'écran,
          // on les ajuste dans l'éditeur, puis l'export les applique. La marque d'origine est retirée pour ne pas rester en double.
          const marques = cases.filter(x => x.c.type === 'Redact' && x.c.rect);
          if (!marques.length) { toast('Aucune marque de caviardage dans les documents ouverts.', 'warn'); return; }
          snapshot('Reprendre les marques de caviardage');
          let n = 0;
          marques.forEach(x => x.pages.forEach(p => {
            const r = rectFromUser(x.c.rect, pageGeom(p));
            p.ann.push({ id: ++uid, type: 'redact', x: r.x, y: r.y, w: r.w, h: r.h, color: '#000000', opacity: 1, width: 1 });
            p.retraits = (p.retraits || []).concat([x.c.id]);
            n++;
          }));
          // Reprendre des marques, c'est vouloir les appliquer : le mode « marques à relire » (qui ne retire rien) est quitté.
          const quitte = !!(state.nettoyage && state.nettoyage.caviardage === 'marques');
          if (quitte) state.nettoyage = null;
          state.touched = true;
          state.pages.forEach(p => peintes.delete(p.id));
          vue.render();
          close();
          setLast(plural(n, 'marque reprise', 'marques reprises') + ' comme zones de caviardage' + (quitte ? ' (le mode « marques à relire » est quitté)' : '') + ' : relisez-les, puis exportez · Ctrl+Z pour annuler');
        } },
        { id: 'cm-synthese-csv', label: 'Synthèse (CSV)', onClick: () => vue.syntheseCommentaires(cases, 'csv') },
        { id: 'cm-synthese-pdf', label: 'Synthèse (PDF)', onClick: () => vue.syntheseCommentaires(cases, 'pdf') },
        { label: 'Appliquer', primary: true, onClick: close => {
          snapshot('Retirer des commentaires');
          let retires = 0;
          state.pages.forEach(p => { p.retraits = []; });
          cases.forEach(x => { if (!x.cb.checked) return; retires++; x.pages.forEach(p => { p.retraits = (p.retraits || []).concat([x.c.id]); }); });
          state.touched = true;
          state.pages.forEach(p => peintes.delete(p.id));
          vue.render();
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
        a.set(N('AktumCible'), PDFNumber.of(r.index));
        a.set(N('AktumReste'), ctx.obj(r.reste));
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
    // les liens du sommaire d'un dossier visent une page par son identité, d'un document à l'autre
    const parIdentite = new Map();
    mapped.forEach(({ p, page }) => parIdentite.set(p.id, page.ref));
    let poses = 0, retires = 0;
    mapped.forEach(({ p, page }) => {
      let annots = null;
      try { annots = page.node.Annots(); } catch (_) { annots = null; }
      if (!annots) return;
      const garde = [];
      let change = false;
      annots.asArray().forEach(item => {
        const a = ctx.lookup(item);
        if (a instanceof PDFDict && a.has(N('AktumPageId'))) {
          change = true;
          const ref = parIdentite.get(a.get(N('AktumPageId')).asNumber());
          a.delete(N('AktumPageId'));
          if (!ref) { retires++; return; }
          a.set(N('Dest'), ctx.obj([ref, N('Fit')]));
          garde.push(item); poses++;
          return;
        }
        if (!(a instanceof PDFDict) || !a.has(N('AktumCible'))) { garde.push(item); return; }
        change = true;
        const idx = a.get(N('AktumCible')).asNumber();
        const reste = ctx.lookup(a.get(N('AktumReste')));
        a.delete(N('AktumCible')); a.delete(N('AktumReste'));
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
  // Les polices standard du PDF ne savent écrire que le jeu Windows. Quand le document
  // porte des caractères hors de ce jeu (« ć » de Milošević), il est refait une seconde
  // fois avec des polices incorporées plutôt que d'écrire « ? ». L'archivage en PDF/A
  // (opts.archivage) écrit toujours avec des polices incorporées.
  // Ce que le fichier reçu a de bancal et que l'écriture ne doit pas reproduire : un fichier qui sort d'ici sort sain, quel que soit l'état de celui
  // qui est entré. Une page sans /MediaBox (copieur ou générateur défaillant) : chaque lecteur la prendrait à sa façon, on écrit la taille que
  // cette page a pour nous (Lettre, sauf mention contraire). Un contenu qui renvoie à un objet absent : les lecteurs le disent « abîmé », la page
  // est écrite vide, et le journal le dit.
  function soignerLaPage(out, page, p, rang) {
    let sansTaille = false;
    try { sansTaille = !page.node.MediaBox(); } catch (e) { sansTaille = true; }   // pdf-lib lève quand la boîte manque
    if (sansTaille) { try { const g0 = pageGeom(p); page.setMediaBox(g0.ox, g0.oy, g0.w, g0.h); } catch (e) { signaler('Taille de page', e, 'info'); } }
    try {
      const cle = PDFLib.PDFName.of('Contents'), ref = page.node.get(cle);
      if (ref && out.context.lookup(ref) === undefined) { page.node.delete(cle); signaler('Contenu de page', tr('La page {0} renvoyait à un contenu absent du fichier d\'origine : elle est écrite vide.').replace('{0}', rang + 1), 'warn'); }
    } catch (e) { signaler('Contenu de page', e, 'info'); }
  }

  async function buildPdf(pages, opts) {
    opts = opts || {};
    // Le balisage s'écrit avec des polices incorporées : un lecteur d'écran lit le texte d'une police
    // qui sait dire quelle lettre est quelle lettre, et l'archivage comme l'accessibilité l'exigent.
    const balise = opts.balise != null ? !!opts.balise : !!(state.meta && state.meta.balise);
    const veut = !!(opts.archivage || opts.unicode || balise);
    const octets = await avecEcritureUnicode(veut, () => construirePdf(pages, opts));
    if (!veut && FEAT.unicode && caracteresPerdus().length) {
      signaler('Caractères', 'Des caractères hors du jeu Windows sont écrits avec une police incorporée.', 'info');
      return avecEcritureUnicode(true, () => construirePdf(pages, opts));
    }
    return octets;
  }
  // Le journal du caviardage certifié : ce qui a été caviardé, où, quand ; et la relecture de la copie qui vient d'être écrite.
  async function preparerJournalCaviardage(octets, pages, specs, rasterSet, onProgress) {
    onProgress(1, 'Relecture de la copie…');
    const parPage = [], pagesCaviardees = [];
    pages.forEach((p, k) => {
      const n = (p.ann || []).filter(a => a.type === 'redact' || (a.type === 'edit' && a.efface)).length;
      if (n) parPage.push([k + 1, n]);
      if (rasterSet.has(p.id)) pagesCaviardees.push(k + 1);
    });
    const termes = [];
    for (const s of specs) {
      const par = [];
      let total = 0;
      for (let k = 0; k < pages.length; k++) {
        const n = occurrencesDe(await getPageText(pages[k]), s).length;
        if (n) { par.push([k + 1, n]); total += n; }
      }
      termes.push({ terme: s.terme, total, parPage: par });
    }
    const controle = await relireLaCopie(octets, specs);
    const d = new Date();
    const deux = n => String(n).padStart(2, '0');
    const sources = proprSources(pages);
    return {
      info: {
        nom: sources.map(s => s.name).join(', '), fichier: el.filename.value, quand: formaterDate(d) + ' ' + deux(d.getHours()) + ':' + deux(d.getMinutes()) + ':' + deux(d.getSeconds()),
        logiciel: APP + ' ' + APP_VERSION, operateur: auteurDesAnnotations() || '', pages: pages.length, pagesCaviardees, parPage, termes,
        avecTermes: !!(state.nettoyage && state.nettoyage.termes), controle, empreinte: await empreinteSha256(octets),
      },
    };
  }
  async function construirePdf(pages, opts) {
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
    // Le mode du caviardage (voir 74-nettoyage.js) : certifié, ou simples marques « Redact » à relire — auquel cas rien n'est caviardé dans le fichier.
    const modeCav = (!opts.sansNettoyage && state.nettoyage && state.nettoyage.caviardage) || '';
    if (modeCav === 'marques') pages = pages.map(p => ((p.ann || []).some(a => a.type === 'redact') ? Object.assign({}, p, { ann: p.ann.map(a => (a.type === 'redact' ? Object.assign({}, a, { type: 'marque-redact' }) : a)) }) : p));
    if (modeCav === 'certifie') opts.dpi = Math.max(opts.dpi || 0, 300);
    state.dernierJournal = null;
    oublierPertes();
    // Les valeurs de formulaire sont écrites par pdf-lib avec la police standard.
    proprSources(pages).forEach(s => { Object.values(s.formValues || {}).forEach(v => { if (typeof v === 'string') releverHorsWinAnsi(v); }); });
    const onProgress = opts.onProgress || (() => {});
    const rasterAll = !!opts.rasterize;
    // Les termes caviardés partout : à retirer de tout le fichier, pas
    // seulement des endroits où le mot s'est vu.
    const specs = modeCav === 'marques' ? [] : (state.purges || []).filter(x => x && x.terme);
    const caviarde = specs.length > 0 || pages.some(p => (p.ann || []).some(a => a.type === 'redact' || (a.type === 'edit' && a.efface)));
    const rasterSet = new Set();
    // Une page caviardée reste vectorielle quand ses lettres peuvent être
    // vidées du flux ; sinon (image dessous, police illisible) elle est
    // convertie en image, comme avant.
    const docsVerif = new Map(), policesVerif = new Map();
    const imagesCaviardees = new Map();   // pageId -> [{ nom, donnees }]
    for (const p of pages) {
      // Archivage : les pages dont les polices ne sont pas incorporées (accord donné) sont converties en image.
      if (rasterAll || (opts.rasterIds && opts.rasterIds.has(p.id))) { rasterSet.add(p.id); continue; }
      // Caviardage certifié : toute page qui porte une zone caviardée devient une image, sans examen de ce que le flux permettrait.
      if (modeCav === 'certifie' && p.ann.some(a => a.type === 'redact' || (a.type === 'edit' && a.efface))) { rasterSet.add(p.id); continue; }
      // Une correction de texte qui ne se réécrit pas dans le flux se pose par-dessus un recouvrement : l'ancien texte doit s'effacer du flux, en entier.
      const corrige = p.ann.some(a => a.type === 'edit' && !a.efface && a.origine);
      if (!specs.length && !corrige && !p.ann.some(a => a.type === 'redact' || (a.type === 'edit' && a.efface))) continue;
      let bilan = { propre: false, images: [] };
      try {
        const src = srcById(p.src);
        if (src) {
          if (!docsVerif.has(src.id)) docsVerif.set(src.id, await loadLib(src));
          const dv = docsVerif.get(src.id);
          bilan = fxCaviardageBilan(dv, dv.getPages()[p.index], p, policesVerif, specs);
          if (bilan.propre && corrige && !fxCorrectionsBilan(dv, dv.getPages()[p.index], p, policesVerif).propre) {
            signaler('Export', 'Une correction de texte n\'a pas pu s\'écrire dans la page et son texte d\'origine n\'a pas pu en être effacé : la page est convertie en image, plutôt que de laisser l\'ancien texte caché sous la correction.', 'warn');
            bilan = { propre: false, images: [] };
          }
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

    // Une page convertie en image perd son texte sélectionnable : on le dit, au journal et à l'écran (sauf si la personne l'a demandé —
    // tout rasteriser, ou l'accord donné à l'archivage —, ou si l'export n'est qu'une vérification).
    if (rasterSet.size && !rasterAll && !opts.rasterIds && !opts.silencieux) {
      const msg = plural(rasterSet.size, 'page a été convertie en image', 'pages ont été converties en image') + ' : ' + (rasterSet.size > 1 ? 'leur texte n\'est plus sélectionnable.' : 'son texte n\'est plus sélectionnable.');
      signaler('Export', msg, 'warn');
      toast(msg, 'warn');
    }

    // Un document caviardé ne s'écrit JAMAIS « sur place » : le fichier chargé
    // garde son dictionnaire /Info, son XMP, ses mises à jour antérieures, ses
    // objets orphelins — tout ce qui fait qu'un nom noirci sur la page se
    // retrouve encore dans le fichier. On rebâtit un document neuf, qui ne
    // reprend que ce que les pages atteignent.
    // Le balisage se refait avec le fichier : celui d'un document balisé qu'on réécrirait sur place resterait faux.
    const meta0 = specs.length ? purgeMeta(state.meta, specs) : state.meta;
    const veutBalise = opts.balise != null ? !!opts.balise : !!(meta0 && meta0.balise);
    // Un nettoyage refait le fichier page par page : rien du fichier d'origine (information, XMP, pièces jointes, scripts) ne passe.
    const nettoyage = opts.sansNettoyage ? null : state.nettoyage;
    const inPlace = !rasterSet.size && !opts.noInPlace && !opts.archivage && !veutBalise && !caviarde && !nettoyage && canExportInPlace(pages);
    let out, mapped;
    if (inPlace) {
      out = await sourceDoc(state.sources[0], false);
      const docPages = out.getPages();
      mapped = pages.map(p => ({ p, page: docPages[p.index] }));
      mapped.forEach(({ p, page }, k) => { try { retirerCommentaires(out, page, p); } catch (e) { signaler('Commentaires', e); } soignerLaPage(out, page, p, k); });
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
        const doc = await sourceDoc(src, !!opts.archivage || !!(src.formValues && Object.keys(src.formValues).length));
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
          soignerLaPage(out, placed[k], p, k);
        }
      }
      mapped = pages.map((p, k) => ({ p, page: placed[k] }));
    }
    try { reposerLiens(out, mapped); } catch (e) { signaler('Liens', e); }

    const fonts = new Map(), images = new Map();
    // Les noms déjà portés par les formulaires d'origine, pour ne pas les
    // écraser avec un champ ajouté ici.
    const nomsPris = new Set();
    const groupesRadio = new Map();
    try { out.getForm().getFields().forEach(f => nomsPris.add(f.getName())); } catch (e) { signaler('Noms des champs de formulaire', e); }
    const file = safeBase(el.filename.value);
    const bates = state.stamp && state.stamp.batesPrefix != null ? state.stamp : null;
    // Le balisage d'accessibilité : demandé dans les propriétés du document, ou par l'appelant.
    const balisage = veutBalise ? creerBalisage(out, { langue: (meta0 && meta0.langue) || codeLangue(), titre: (meta0 && meta0.title) || file, producteur: APP, sansXmp: !!opts.archivage }) : null;
    // Rendre la main sur un budget de temps : l'avancement se peint, et l'interface ne gèle pas sur un gros dossier.
    const tour = cadence();
    for (let i = 0; i < mapped.length; i++) {
      const { p, page } = mapped[i];
      const g = pageGeom(p);
      const raster = rasterSet.has(p.id);
      const PB = balisage ? balisage.page(page) : null;
      if (balisage && raster) await baliserPageSource(balisage, PB, p, raster, i + 1);
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
              const neuf = 'AktumCav' + (++uidImageCaviardee);
              fxPoserImage(out, page, neuf, im.ref);
              renommages.set(b.nom, neuf);
            } catch (e) { signaler('Caviardage', e); }
          }
        }
        // D'abord ce qui peut être réécrit dans le flux de la page : ni
        // rectangle, ni fond relevé, rien d'autre ne bouge.
        const enPlace = fxRetoucher(out, page, p, fonts, renommages, specs);
        if (balisage) await baliserPageSource(balisage, PB, p, raster, i + 1);
        // Ce que l'utilisateur a dessiné dans la page forme un bloc de plus, après le contenu d'origine.
        const dessine = p.ann.some(a => !enCommentaire(a) && a.type !== 'champ');
        await baliser(balisage, dessine ? PB : null, 'Div', {}, () => drawAnnotations(out, page, p, fonts, images, enPlace));
      }
      await poserChamps(out, page, p, fonts, { pris: nomsPris, radios: groupesRadio });
      await poserAnnotationsReelles(out, page, p, fonts);
      // Le texte reconnu forme un paragraphe ; l'image dessous est un artefact.
      await baliser(balisage, p.ocr && p.ocr.mots && p.ocr.mots.length ? PB : null, 'P', {}, () => poserTexteOcr(out, page, p, fonts));
      // La pagination, les filigranes et les mentions ne sont pas du contenu : un lecteur d'écran ne les relit pas.
      if (!raster) await artefact(balisage, PB, 'Footer', () => dessinerMention(out, page, p, fonts));
      await artefact(balisage, PB, 'Watermark', () => drawWatermark(out, page, p, fonts));
      const num = (state.stamp ? state.stamp.start : 1) + i;
      await artefact(balisage, state.stamp ? PB : null, null, () => drawStamp(out, page, p, fonts, {
        i, p: num, n: pages.length, date: todayStr(), file,
        bates: bates ? (bates.batesPrefix || '') + pad(num, bates.batesDigits || 4) : String(num),
      }));
      await tour(() => onProgress((i + 1) / mapped.length, 'Assemblage… ' + (i + 1) + '/' + mapped.length));
    }

    // Les liens que l'éditeur vient de poser vers une page du document (et ceux du sommaire d'un dossier) se résolvent ici : toutes
    // les pages existent, et chacune sait où elle est.
    try { reposerLiens(out, mapped); } catch (e) { signaler('Liens', e); }
    if (nettoyage) {
      const b = nettoyerLesPages(out, mapped.map(x => x.page), nettoyage);
      opts.bilanNettoyage = b;
    }
    // L'arbre de structure se pose une fois toutes les pages écrites.
    if (balisage) { balisage.terminer(); opts.balisee = true; }
    opts.rapportBalisage = balisage ? controlerBalisage(out) : null;

    poserSignets(out, mapped, nettoyage && nettoyage.signets ? [] : (specs.length ? purgeSignets(state.signets, specs) : state.signets));

    let m = specs.length ? purgeMeta(state.meta, specs) : state.meta;
    if (nettoyage && nettoyage.meta) m = Object.assign({}, m, { title: '', author: '', subject: '', keywords: '' });
    out.setCreator(APP);
    try { const s0 = pages.length ? srcById(pages[0].src) : null; if (s0 && s0.proprietes && s0.proprietes.creation) out.setCreationDate(new Date(s0.proprietes.creation)); } catch (e) { signaler('Date de création', e, 'info'); }
    // Le producteur dit quel logiciel a écrit le fichier, version comprise (et non « pdf-lib ») : c'est ce que le support lit en premier.
    out.setProducer(APP + ' ' + APP_VERSION);
    // L'identifiant du fichier (/ID) : la première moitié reste celle du fichier d'origine quand il en avait une, la seconde change à chaque
    // écriture — c'est ainsi qu'un lecteur sait que deux fichiers sont deux états du même document, et qu'un archiviste les distingue.
    // Un fichier chiffré a le sien, posé par le chiffrement.
    if (!(state.security && FEAT.encrypt)) {
      try {
        const { PDFHexString } = PDFLib;
        const hasard = () => { const b = new Uint8Array(16); crypto.getRandomValues(b); return Array.from(b, x => x.toString(16).padStart(2, '0')).join(''); };
        const avant = out.context.trailerInfo.ID;
        let premier = '';
        try {
          const v0 = avant && avant.size && avant.size() ? avant.get(0) : null;
          if (v0 instanceof PDFHexString) premier = v0.asString().toLowerCase();
          else if (v0 && v0.asString) premier = v0.asString().split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
        } catch (_) { premier = ''; }
        if (!/^[0-9a-f]{32}$/.test(premier)) premier = hasard();
        out.context.trailerInfo.ID = out.context.obj([PDFHexString.of(premier), PDFHexString.of(hasard())]);
      } catch (e) { signaler('Identifiant du fichier', e, 'info'); }
    }
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
    // Pour finir, ce que le fichier garde sans le dire : notes, champs et
    // pièces jointes qui portent le terme, métadonnées de page, objets que
    // plus rien n'atteint (l'ancien flux, l'image d'origine).
    if (caviarde) {
      try {
        const r = purgerLeDocument(out, mapped.map(x => x.page), specs);
        if (r.notes) signaler('Caviardage', plural(r.notes, 'note, champ ou pièce jointe a été retiré', 'notes, champs ou pièces jointes ont été retirés') + ' parce qu\'ils portaient le texte caviardé.', 'info');
      } catch (e) { signaler('Caviardage', e, 'erreur'); throw e; }
    }
    // Signatures, balisage et XFA détruits : plus aucune de leurs marques dans
    // le fichier ; PDF/A refait au même niveau quand rien ne l'empêche.
    try { appliquerProprietes(out, mapped.map(x => x.page), pages, opts); } catch (e) { signaler('Propriétés du document', e, 'erreur'); }
    // Ce que plus rien n'atteint ne part pas : l'ancien plan du document, les
    // anciens flux des pages réécrites, les objets d'une version antérieure. pdf-lib
    // écrit tout ce qu'il a en mémoire, et le fichier enflait de ses restes.
    try { ramasserLesObjets(out); } catch (e) { signaler('Nettoyage du fichier', e); }
    // « Réduire la taille » : les grosses images sont réduites et recompressées, le texte n'est pas touché.
    if (opts.alleger) {
      onProgress(0.95, 'Allègement des images…');
      opts.bilanAllegement = await alegerLesImages(out, opts.alleger);
    }
    onProgress(1, 'Finalisation…');
    // Les flux d'objets (PDF 1.5) font gagner quelques pour cent de plus : on n'y recourt que pour alléger, jamais pour archiver.
    const octets = opts.alleger ? await out.save({ useObjectStreams: true }) : await out.save();
    if (modeCav === 'certifie') {
      try { state.dernierJournal = await preparerJournalCaviardage(octets, pages, specs, rasterSet, onProgress); } catch (e) { signaler('Journal du caviardage', e); }
    }
    return octets;
  }

