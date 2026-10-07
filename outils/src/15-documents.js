  // =====================================================================
  //  Loading documents
  // =====================================================================
  function isPdf(f) { return /\.pdf$/i.test(f.name) || f.type === 'application/pdf'; }
  function isImage(f) { return /\.(png|jpe?g|webp|tiff?)$/i.test(f.name) || /^image\/(png|jpeg|webp|tiff)$/.test(f.type); }
  const estTiff = f => /\.tiff?$/i.test(f.name) || f.type === 'image/tiff';

  // Un document déposé sur la fenêtre ou choisi par le champ de fichier ne passe pas par « Ouvrir » : l'application fenêtrée ne connaît pas
  // son chemin. Elle le demande au fichier lui-même, pour que « Récents » le retienne comme les autres (tous les chemins d'ouverture).
  function noterLesRecents(files) {
    const b = window.AktumDesktop;
    if (!b || typeof b.cheminDe !== 'function' || typeof b.noterRecents !== 'function') return;
    try {
      const chemins = files.filter(f => f instanceof File && !f.chemin).map(f => b.cheminDe(f)).filter(Boolean);
      if (chemins.length) b.noterRecents(chemins);
    } catch (e) { signaler('Fichiers récents', e, 'info'); }
  }
  // Un fichier que l'application ne lit pas dit ce qu'il faut faire, pas seulement qu'il est refusé : un secrétariat dépose
  // surtout du Word, de l'Excel et des courriels.
  const CONSEILS_DE_FORMAT = [
    [/\.(docx?|odt|rtf)$/i, 'Dans Word : Fichier › Enregistrer sous › PDF. Le PDF garde la mise en page.'],
    [/\.(xlsx?|ods|csv)$/i, 'Dans Excel : Fichier › Exporter › PDF. Choisissez la zone à imprimer avant.'],
    [/\.(pptx?|odp)$/i, 'Dans PowerPoint : Fichier › Exporter › PDF.'],
    [/\.(msg|eml)$/i, 'Depuis la messagerie : imprimer le message en PDF (« Microsoft Print to PDF »).'],
    [/\.(heic|heif|gif|bmp)$/i, 'Enregistrez d\'abord l\'image en JPEG ou en PNG.'],
  ];
  function refusDeFichiers(fichiers) {
    const noms = fichiers.slice(0, 3).map(f => '« ' + f.name + ' »').join(', ') + (fichiers.length > 3 ? '…' : '');
    const conseil = CONSEILS_DE_FORMAT.find(c => fichiers.some(f => c[0].test(f.name)));
    return tr(plural(fichiers.length, 'fichier ignoré', 'fichiers ignorés')) + ' (' + noms + ') : ' + tr('seuls les PDF et les images (JPEG, PNG, WebP, TIFF) sont ouverts.')
      + (conseil ? ' ' + tr(conseil[1]) : '');
  }
  async function addFiles(fileList) {
    const files = Array.from(fileList || []).filter(f => isPdf(f) || isImage(f));
    const refuses = Array.from(fileList || []).filter(f => !(isPdf(f) || isImage(f)));
    if (refuses.length) toast(refusDeFichiers(refuses), 'warn');
    if (!files.length) return;
    noterLesRecents(files);
    // L'exemple cède sa place une fois le document lu (addPdfSource, remplaceExemple) : un fichier refusé ne le fait pas disparaître.
    const images = files.filter(isImage);
    const pdfs = files.filter(isPdf);
    // Pendant un traitement par lots, le sablier est celui du lot.
    const sablier = (t, r) => { if (!state.silencieux) setBusy(t, r); };
    for (const f of pdfs) {
      sablier('Lecture de ' + f.name + '…');
      try {
        const bytes = await f.arrayBuffer();
        const src = await addPdfSource(f.name, bytes, { remplaceExemple: true, chemin: typeof f.chemin === 'string' ? f.chemin : '', mtimeMs: f.mtimeMs || 0 });
        setLast(f.name + ' · ' + plural(src.count, 'page ajoutée', 'pages ajoutées'));
        if (f.verrou) avertirVerrou(f.name, f.verrou);
      } catch (e) {
        console.error(e);
        if (e && e.cancelled) setLast('Ouverture annulée');
        else toast(e && e.humain ? e.message : messageDEchec('La lecture de « ' + f.name + ' »', e), 'error');
      }
    }
    if (images.length) {
      sablier('Conversion ' + plural(images.length, 'de l\'image', 'des images') + '…');
      try {
        const { bytes, name } = await imagesToPdf(images);
        const src = await addPdfSource(name, bytes, { remplaceExemple: true });
        setLast(plural(src.count, 'image convertie', 'images converties') + ' en pages');
      } catch (e) {
        console.error(e);
        toast(messageDEchec('La conversion des images', e), 'error');
      }
    }
    sablier('');
  }

  async function openWithPdfjs(name, bytes, password) {
    try {
      const doc = await pdfjs.getDocument(Object.assign({ data: new Uint8Array(bytes.slice(0)), isEvalSupported: false }, password ? { password } : {})).promise;
      return { doc, password: password || null };
    } catch (e) {
      if (e && e.name === 'PasswordException') {
        const pw = await askPassword(name, !!password);
        if (pw === null) { const err = new Error('annulé'); err.cancelled = true; throw err; }
        return openWithPdfjs(name, bytes, pw);
      }
      throw Object.assign(new Error(refusDOuverture(name, bytes, e)), { humain: true });
    }
  }
  // Pourquoi un fichier ne s'ouvre pas : trois cas, trois phrases — un fichier vide, un fichier qui n'est pas un PDF (une extension qui
  // ment), un PDF dont la structure est illisible (tronqué, abîmé) — au lieu d'un « peut-être abîmé » pour tout.
  function refusDOuverture(name, bytes, e) {
    const taille = bytes && bytes.byteLength != null ? bytes.byteLength : 0;
    if (!taille) return tr('« {0} » est vide : il ne contient aucune donnée.').replace('{0}', name);
    let tete = '';
    try { tete = String.fromCharCode.apply(null, new Uint8Array(bytes.slice(0, 1024))); } catch (err) { signaler('Ouverture', err, 'info'); }
    if (tete.indexOf('%PDF-') < 0) return tr('« {0} » n\'est pas un PDF (il n\'en a que l\'extension). Ouvrez-le avec l\'application qui l\'a produit.').replace('{0}', name);
    signaler('Ouverture de ' + name, e, 'info');
    return tr('« {0} » est un PDF incomplet ou abîmé : sa structure est illisible (fichier tronqué, téléchargement interrompu ?). Rouvrez-le depuis son origine, ou réparez-le avec l\'application qui l\'a produit.').replace('{0}', name);
  }

  // Quelqu'un d'autre a déjà ce document ouvert : le dire tout de suite, avec
  // son nom et l'heure, plutôt que de laisser l'écraser sans le savoir.
  function avertirVerrou(nom, v) {
    const d = v && v.depuis ? new Date(v.depuis) : null;
    const heure = d ? ' depuis ' + pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2) : '';
    const qui = (v && v.qui ? v.qui : 'Une autre personne') + (v && v.poste ? ' (poste ' + v.poste + ')' : '');
    const msg = '« ' + nom + ' » est déjà ouvert par ' + qui + heure + '. Vous pouvez le lire ; avant d\'enregistrer, vérifiez avec elle, sous peine d\'écraser son travail.';
    signaler('Document ouvert ailleurs', msg, 'info');
    toast(msg, 'warn');
  }

  // La limite pour laquelle le logiciel est conçu, dite à l'ouverture plutôt que découverte en réunion : au-delà, tout reste possible, en plus lent.
  const LIMITE_PAGES = 2000, LIMITE_OCTETS = 50 * 1024 * 1024;
  function avertirDuPoids(nom, pages, octets) {
    if (pages <= LIMITE_PAGES && octets <= LIMITE_OCTETS) return;
    const msg = '« ' + nom + ' » compte ' + plural(pages, 'page', 'pages') + ' (' + fmtSize(octets) + ') : l\'application est conçue pour des documents jusqu\'à 2 000 pages ou 50 Mo. Au-delà, tout reste possible, mais la recherche, les aperçus et l\'export sont plus lents : prévoyez de la patience et fermez les autres programmes.';
    signaler('Gros document', msg, 'info');
    toast(msg, 'warn');
  }
  async function addPdfSource(name, bytes, opts) {
    opts = opts || {};
    const opened = await openWithPdfjs(name, bytes, null);
    const doc = opened.doc, password = opened.password;
    // Un document sans page (un générateur qui a planté en route) s'ouvrirait « à moitié » : une entrée de liste vide, rien à afficher.
    if (!doc.numPages) { try { doc.destroy(); } catch (e) { /* le lecteur s'en charge */ } throw Object.assign(new Error(tr('« {0} » ne contient aucune page : il n\'y a rien à afficher ni à modifier.').replace('{0}', name)), { humain: true }); }
    // L'exemple, lui, ne revient pas par-dessus ce que la personne a ouvert pendant qu'il se préparait : le premier document réel l'a déjà remplacé.
    if (opts.isSample && state.sources.some(x => !x.isSample)) { try { doc.destroy(); } catch (e) { /* le lecteur s'en charge */ } return null; }
    // Ouvrir un document dans un espace vide n'est pas une action qu'on annule :
    // Ctrl+Z juste après l'ouverture ramenait l'espace de travail à rien, et le
    // document disparaissait. Seul ce qu'on AJOUTE à un document déjà là se défait.
    const espaceVide = !state.sources.some(s => !s.isSample);
    if (!opts.silent && !espaceVide) snapshot();
    else if (espaceVide) { state.history = []; state.redo = []; vue.syncButtons(); }
    const src = {
      id: ++uid, name, bytes, pdfjs: doc, count: doc.numPages,
      hue: HUES[state.hueIdx++ % HUES.length], isSample: !!opts.isSample,
      password: password || null, formValues: null, formFields: null, encrypted: !!password,
      chemin: opts.chemin || '',
      mtime: opts.mtimeMs || 0,
    };
    state.sources.push(src);
    avertirDuPoids(name, doc.numPages, bytes.byteLength);
    const fresh = [];
    for (let i = 0; i < src.count; i++) fresh.push({ id: ++uid, src: src.id, index: i, rot: 0, ann: [] });
    state.pages.push(...fresh);
    // Le plan du document, s'il en a un, devient nos signets.
    try { const plan = await lireSignets(src, fresh); if (plan.length) state.signets.push(...plan); } catch (e) { signaler('Signets', e); }
    // L'exemple cède la place au premier document ouvert par l'utilisateur,
    // même s'il finissait de se charger à ce moment-là. Les pages produites par
    // l'outil, elles, s'ajoutent normalement.
    if (opts.remplaceExemple && !state.touched) {
      const exemple = state.sources.find(x => x.isSample);
      if (exemple) {
        state.sources = state.sources.filter(x => x !== exemple);
        state.pages = state.pages.filter(q => q.src !== exemple.id);
      }
    }
    vue.render();
    await measurePages(src);
    vue.render();
    detectForm(src);
    // Ce que le fichier porte et que la réécriture détruirait (signature, PDF/A,
    // balisage, XFA) : lu sans bloquer l'ouverture, annoncé dès que c'est connu.
    if (!src.isSample) lireProprietes(src).then(p => { src.proprietes = p; annoncerProprietes(src); }).catch(e => signaler('Document', e));
    return src;
  }

  async function measurePages(src) {
    const tour = cadence();
    for (let i = 0; i < src.count; i++) {
      const k = key(src.id, i);
      if (dims.has(k)) continue;
      try {
        const page = await src.pdfjs.getPage(i + 1);
        const v = page.view || [0, 0, 595.28, 841.89];
        // ox, oy : le coin bas-gauche de la zone visible (CropBox) dans l'espace du PDF — presque toujours 0, mais pas pour un document recadré
        dims.set(k, { w: Math.abs(v[2] - v[0]), h: Math.abs(v[3] - v[1]), baseRot: page.rotate || 0, ox: Math.min(v[0], v[2]), oy: Math.min(v[1], v[3]) });
      } catch (_) { dims.set(k, Object.assign({}, DEFAULT_DIM)); }
      if (src.count > 40) await tour(() => setBusy('Analyse des pages… ' + (i + 1) + '/' + src.count, i / src.count));
    }
    if (src.count > 40) setBusy('');
  }

  // Class names are mangled by minification, so identify fields by type, then
  // by the methods they carry.
  function fieldKind(f) {
    const L = PDFLib;
    if (L.PDFTextField && f instanceof L.PDFTextField) return 'text';
    if (L.PDFCheckBox && f instanceof L.PDFCheckBox) return 'check';
    if (L.PDFRadioGroup && f instanceof L.PDFRadioGroup) return 'radio';
    if (L.PDFDropdown && f instanceof L.PDFDropdown) return 'dropdown';
    if (L.PDFOptionList && f instanceof L.PDFOptionList) return 'list';
    if (L.PDFButton && f instanceof L.PDFButton) return 'button';
    if (L.PDFSignature && f instanceof L.PDFSignature) return 'signature';
    if (typeof f.getText === 'function') return 'text';
    if (typeof f.isChecked === 'function') return 'check';
    if (typeof f.getOptions === 'function') return 'dropdown';
    return 'other';
  }
  async function detectForm(src) {
    try {
      const doc = await loadLib(src);
      const fields = doc.getForm().getFields();
      src.formFields = fields.map(f => {
        const kind = fieldKind(f);
        let options = null;
        try { if (typeof f.getOptions === 'function') options = f.getOptions(); } catch (e) { signaler('Liste de choix d\'un champ de formulaire', e); }
        // Ce que le champ dit de lui-même : son intitulé (/TU), s'il est en lecture seule ou obligatoire, s'il tient sur plusieurs lignes, sa longueur
        // maximale, son format (celui que ce logiciel écrit : /AktumFormat), le choix multiple d'une liste.
        const att = { lecture: false, requis: false, multi: false, maxLen: 0, format: '', multiSelect: false, aide: '' };
        try { att.lecture = !!f.isReadOnly(); att.requis = !!f.isRequired(); } catch (e) { signaler('Attributs d\'un champ de formulaire', e, 'info'); }
        try { if (kind === 'text') { att.multi = !!f.isMultiline(); att.maxLen = f.getMaxLength() || 0; } if (kind === 'list') att.multiSelect = !!f.isMultiselect(); } catch (e) { signaler('Attributs d\'un champ de formulaire', e, 'info'); }
        try {
          const d = f.acroField.dict;
          const tu = d.get(PDFLib.PDFName.of('TU')); if (tu && tu.decodeText) att.aide = tu.decodeText();
          const fmt = d.get(PDFLib.PDFName.of('AktumFormat')); if (fmt && fmt.asString) att.format = fmt.asString().replace(/^\//, '');
        } catch (e) { signaler('Attributs d\'un champ de formulaire', e, 'info'); }
        return Object.assign({ name: f.getName(), kind, value: readField(f, kind), options }, att);
      });
      if (src.formFields.length) renderSources();
    } catch (_) { src.formFields = []; }
  }
  function readField(f, kind) {
    try {
      if (kind === 'text') return f.getText() || '';
      if (kind === 'check') return f.isChecked();
      if (kind === 'radio') return f.getSelected() || '';
      if (kind === 'dropdown') return (f.getSelected() || [])[0] || '';
      if (kind === 'list') return f.isMultiselect() ? (f.getSelected() || []) : ((f.getSelected() || [])[0] || '');
    } catch (e) { signaler('Lecture d\'un champ de formulaire', e); }
    return '';
  }
  async function loadLib(src) {
    // preserveXFA : sans cela, pdf-lib efface le paquet XFA d'un formulaire dès
    // qu'on en demande les champs — c'est-à-dire à l'ouverture. Le formulaire
    // ressort intact même s'il n'est pas compris.
    return PDFLib.PDFDocument.load(src.bytes, Object.assign({ ignoreEncryption: true, updateMetadata: false, preserveXFA: true }, src.password ? { password: src.password } : {}));
  }

  async function imagesToPdf(files) {
    const doc = await PDFLib.PDFDocument.create();
    for (const f of files) {
      const buf = await f.arrayBuffer();
      if (estTiff(f)) {
        // Un TIFF (la sortie d'un scanner) peut porter plusieurs pages : chacune devient une page du PDF, à sa taille réelle.
        for (const t of await tiffEnPages(buf, f.name)) {
          const im = await doc.embedPng(t.png);
          const page = doc.addPage([t.largeur, t.hauteur]);
          page.drawImage(im, { x: 0, y: 0, width: t.largeur, height: t.hauteur });
        }
        continue;
      }
      let img;
      if (/png$/i.test(f.type) || /\.png$/i.test(f.name)) img = await doc.embedPng(buf);
      else if (/webp$/i.test(f.type) || /\.webp$/i.test(f.name)) img = await doc.embedPng(await webpToPng(buf));
      else img = await doc.embedJpg(buf);
      const page = doc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
    const bytes = await doc.save();
    const name = files.length === 1 ? baseName(files[0].name) + '.pdf' : tr('images.pdf');
    return { bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), name };
  }
  // Les pages d'un TIFF, en PNG (sans perte : un scan noir et blanc reste net), avec la taille que la résolution du fichier leur
  // donne en points PDF. Sans résolution écrite, 200 points par pouce — la définition courante d'un scan de bureau.
  async function tiffEnPages(buf, nom) {
    if (!FEAT.tiff) throw Object.assign(new Error('Les images TIFF ne sont pas lisibles dans cette version.'), { humain: true });
    let ifds;
    try { ifds = UTIF.decode(buf); } catch (e) { throw Object.assign(new Error('« ' + nom + ' » n\'est pas un TIFF lisible : le fichier est peut-être abîmé.'), { humain: true }); }
    const pages = [];
    for (const ifd of ifds) {
      if (!ifd.t256 || !ifd.t257) continue;   // une miniature ou des métadonnées, sans image
      UTIF.decodeImage(buf, ifd);
      const w = ifd.width, h = ifd.height;
      const rgba = UTIF.toRGBA8(ifd);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength), w, h), 0, 0);
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      const xr = ifd.t282 ? Number(ifd.t282[0]) : 0, yr = ifd.t283 ? Number(ifd.t283[0]) : 0;
      const unite = ifd.t296 ? Number(ifd.t296[0]) : 2;   // 2 : pouce (la valeur par défaut du format), 3 : centimètre
      const parPouce = v => (v > 0 ? (unite === 3 ? v * 2.54 : v) : 200);
      pages.push({ png: await blob.arrayBuffer(), largeur: w * 72 / parPouce(xr), hauteur: h * 72 / parPouce(yr || xr) });
    }
    if (!pages.length) throw Object.assign(new Error('« ' + nom + ' » ne contient aucune image.'), { humain: true });
    return pages;
  }
  async function webpToPng(buf) {
    const blob = new Blob([buf], { type: 'image/webp' });
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    c.getContext('2d').drawImage(bmp, 0, 0);
    const out = await new Promise(r => c.toBlob(r, 'image/png'));
    return out.arrayBuffer();
  }


  // =====================================================================
  //  Thumbnails (rendered lazily, cached per source page)
  // =====================================================================
  const thumbQueue = [];
  let thumbActive = 0;
  // Autant de vignettes en parallèle que le poste a de cœurs, moins un : le rendu se fait hors du fil principal pour un document lourd.
  const THUMB_PARALLELE = Math.max(2, Math.min(6, (navigator.hardwareConcurrency || 4) - 1));
  // Le cache de vignettes est borné : au-delà, les moins récemment demandées, hors de l'écran, sont libérées (leur adresse est révoquée).
  // Sans cette borne, mille pages tenaient près de deux gigaoctets de mémoire.
  const THUMB_MAX = 200;
  const thumbVisibles = new Set();
  // Des comptes, rien d'autre (aucun nom, aucun contenu) : ce que le rapport de diagnostic et les essais lisent de la mémoire des aperçus.
  window.aktumMesures = () => ({ vignettes: thumbOrdre.size, vignettesMax: THUMB_MAX, pages: state.pages.length });
  const thumbOrdre = new Map();   // clé -> dernier usage (ordre d'insertion = ordre d'usage)
  function thumbUsage(k) { thumbOrdre.delete(k); thumbOrdre.set(k, true); }
  function thumbEvincer() {
    if (thumbOrdre.size <= THUMB_MAX) return;
    for (const k of Array.from(thumbOrdre.keys())) {
      if (thumbOrdre.size <= THUMB_MAX) break;
      const t = thumbs.get(k);
      if (!t || t.status !== 'done' || thumbVisibles.has(k)) continue;
      try { if (t.url) URL.revokeObjectURL(t.url); } catch (e) { signaler('Vignette', e, 'info'); }
      thumbs.delete(k); thumbOrdre.delete(k);
      // La tuile (hors de l'écran) ne montre plus rien : son image reviendra, redessinée, quand on y retournera.
      state.pages.forEach(p => { if (pkey(p) === k) { const tl = tiles.get(p.id); const im = tl && tl.querySelector('img'); if (im) im.removeAttribute('src'); } });
    }
  }
  function requestThumb(k) {
    if (thumbs.has(k)) { thumbUsage(k); return; }
    thumbs.set(k, { status: 'pending', url: null });
    thumbQueue.push(k);
    pumpThumbs();
  }
  function pumpThumbs() {
    while (thumbActive < THUMB_PARALLELE && thumbQueue.length) {
      const k = thumbQueue.shift();
      thumbActive++;
      renderThumb(k).catch(() => {}).then(() => { thumbActive--; pumpThumbs(); });
    }
  }
  async function renderThumb(k) {
    const [sid, idx] = k.split(':').map(Number);
    const src = srcById(sid) || (state.history.concat(state.redo).map(h => h.sources.find(s => s.id === sid)).find(Boolean));
    if (!src) { thumbs.delete(k); return; }
    try {
      const page = await src.pdfjs.getPage(idx + 1);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(3, (300 * dpr) / Math.max(base.width, base.height));
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.ceil(vp.width));
      canvas.height = Math.max(1, Math.ceil(vp.height));
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await rendrePage(page, src, { canvasContext: ctx, viewport: vp }, '#fff').promise;
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.82));
      page.cleanup();
      if (!blob) throw new Error('toBlob');
      thumbs.set(k, { status: 'done', url: URL.createObjectURL(blob) });
      thumbUsage(k); thumbEvincer();
    } catch (e) {
      console.error(e);
      thumbs.set(k, { status: 'error', url: null });
    }
    state.pages.forEach(p => { if (pkey(p) === k) { const t = tiles.get(p.id); if (t) paintTile(t, p); } });
  }

  const thumbObserver = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(entries => {
        entries.forEach(en => {
          const id = +en.target.dataset.id;
          const p = state.pages[pageIndex(id)];
          if (!p) return;
          if (!en.isIntersecting) { thumbVisibles.delete(pkey(p)); return; }
          thumbVisibles.add(pkey(p));
          requestThumb(pkey(p));
        });
      }, { rootMargin: '400px 0px' })
    : null;

  async function getPageText(p) {
    const k = pkey(p);
    if (textCache.has(k)) return textCache.get(k);
    const src = srcById(p.src);
    if (!src) return '';
    try {
      const page = await src.pdfjs.getPage(p.index + 1);
      const tc = await page.getTextContent();
      let last = null, out = '';
      tc.items.forEach(it => {
        if (last && it.transform && last.transform && Math.abs(it.transform[5] - last.transform[5]) > 2) out += '\n';
        else if (out && !/\s$/.test(out)) out += ' ';
        out += it.str;
        last = it;
      });
      page.cleanup();
      const s = out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
      textCache.set(k, s);
      return s;
    } catch (_) { textCache.set(k, ''); return ''; }
  }
