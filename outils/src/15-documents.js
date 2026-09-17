  // =====================================================================
  //  Loading documents
  // =====================================================================
  function isPdf(f) { return /\.pdf$/i.test(f.name) || f.type === 'application/pdf'; }
  function isImage(f) { return /\.(png|jpe?g|webp)$/i.test(f.name) || /^image\/(png|jpeg|webp)$/.test(f.type); }

  async function addFiles(fileList) {
    const files = Array.from(fileList || []).filter(f => isPdf(f) || isImage(f));
    const rejected = Array.from(fileList || []).length - files.length;
    if (rejected) toast(plural(rejected, 'fichier ignoré', 'fichiers ignorés') + ' : seuls les PDF et les images sont acceptés.', 'warn');
    if (!files.length) return;
    dropSampleIfUntouched();
    const images = files.filter(isImage);
    const pdfs = files.filter(isPdf);
    // Pendant un traitement par lots, le sablier est celui du lot.
    const sablier = (t, r) => { if (!state.silencieux) setBusy(t, r); };
    for (const f of pdfs) {
      sablier('Lecture de ' + f.name + '…');
      try {
        const bytes = await f.arrayBuffer();
        const src = await addPdfSource(f.name, bytes, { remplaceExemple: true, chemin: typeof f.chemin === 'string' ? f.chemin : '' });
        setLast(f.name + ' · ' + plural(src.count, 'page ajoutée', 'pages ajoutées'));
      } catch (e) {
        console.error(e);
        if (e && e.cancelled) setLast('Ouverture annulée');
        else toast(e && e.message ? e.message : 'Impossible de lire ' + f.name, 'error');
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
        toast('Les images n\'ont pas pu être converties : ' + (e.message || e), 'error');
      }
    }
    sablier('');
  }

  async function openWithPdfjs(name, bytes, password) {
    try {
      const doc = await pdfjs.getDocument(Object.assign({ data: new Uint8Array(bytes.slice(0)) }, password ? { password } : {})).promise;
      return { doc, password: password || null };
    } catch (e) {
      if (e && e.name === 'PasswordException') {
        const pw = await askPassword(name, !!password);
        if (pw === null) { const err = new Error('annulé'); err.cancelled = true; throw err; }
        return openWithPdfjs(name, bytes, pw);
      }
      throw new Error('« ' + name + ' » n\'a pas pu être lu : le fichier est peut-être abîmé.');
    }
  }

  async function addPdfSource(name, bytes, opts) {
    opts = opts || {};
    const opened = await openWithPdfjs(name, bytes, null);
    const doc = opened.doc, password = opened.password;
    if (!opts.silent) snapshot();
    const src = {
      id: ++uid, name, bytes, pdfjs: doc, count: doc.numPages,
      hue: HUES[state.hueIdx++ % HUES.length], isSample: !!opts.isSample,
      password: password || null, formValues: null, formFields: null, encrypted: !!password,
      chemin: opts.chemin || '',
    };
    state.sources.push(src);
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
    render();
    await measurePages(src);
    render();
    detectForm(src);
    return src;
  }

  async function measurePages(src) {
    for (let i = 0; i < src.count; i++) {
      const k = key(src.id, i);
      if (dims.has(k)) continue;
      try {
        const page = await src.pdfjs.getPage(i + 1);
        const v = page.view || [0, 0, 595.28, 841.89];
        dims.set(k, { w: Math.abs(v[2] - v[0]), h: Math.abs(v[3] - v[1]), baseRot: page.rotate || 0 });
      } catch (_) { dims.set(k, Object.assign({}, DEFAULT_DIM)); }
      if (src.count > 40 && i % 25 === 0) { setBusy('Analyse des pages… ' + (i + 1) + '/' + src.count, i / src.count); await nextFrame(); }
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
        try { if (typeof f.getOptions === 'function') options = f.getOptions(); } catch (_) {}
        return { name: f.getName(), kind, value: readField(f, kind), options };
      });
      if (src.formFields.length) renderSources();
    } catch (_) { src.formFields = []; }
  }
  function readField(f, kind) {
    try {
      if (kind === 'text') return f.getText() || '';
      if (kind === 'check') return f.isChecked();
      if (kind === 'radio') return f.getSelected() || '';
      if (kind === 'dropdown' || kind === 'list') return (f.getSelected() || [])[0] || '';
    } catch (_) {}
    return '';
  }
  async function loadLib(src) {
    return PDFLib.PDFDocument.load(src.bytes, Object.assign({ ignoreEncryption: true, updateMetadata: false }, src.password ? { password: src.password } : {}));
  }

  async function imagesToPdf(files) {
    const doc = await PDFLib.PDFDocument.create();
    for (const f of files) {
      const buf = await f.arrayBuffer();
      let img;
      if (/png$/i.test(f.type) || /\.png$/i.test(f.name)) img = await doc.embedPng(buf);
      else if (/webp$/i.test(f.type) || /\.webp$/i.test(f.name)) img = await doc.embedPng(await webpToPng(buf));
      else img = await doc.embedJpg(buf);
      const page = doc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
    const bytes = await doc.save();
    const name = files.length === 1 ? baseName(files[0].name) + '.pdf' : 'images.pdf';
    return { bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), name };
  }
  async function webpToPng(buf) {
    const blob = new Blob([buf], { type: 'image/webp' });
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    c.getContext('2d').drawImage(bmp, 0, 0);
    const out = await new Promise(r => c.toBlob(r, 'image/png'));
    return out.arrayBuffer();
  }

  function dropSampleIfUntouched() {
    const sample = state.sources.find(s => s.isSample);
    if (!sample || state.touched || state.sources.length !== 1) return;
    state.sources = []; state.pages = []; state.selected.clear();
    state.history = []; state.redo = [];
    render();
  }

  // =====================================================================
  //  Thumbnails (rendered lazily, cached per source page)
  // =====================================================================
  const thumbQueue = [];
  let thumbActive = 0;
  function requestThumb(k) {
    if (thumbs.has(k)) return;
    thumbs.set(k, { status: 'pending', url: null });
    thumbQueue.push(k);
    pumpThumbs();
  }
  function pumpThumbs() {
    while (thumbActive < 3 && thumbQueue.length) {
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
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.82));
      page.cleanup();
      if (!blob) throw new Error('toBlob');
      thumbs.set(k, { status: 'done', url: URL.createObjectURL(blob) });
    } catch (e) {
      console.error(e);
      thumbs.set(k, { status: 'error', url: null });
    }
    state.pages.forEach(p => { if (pkey(p) === k) { const t = tiles.get(p.id); if (t) paintTile(t, p); } });
  }

  const thumbObserver = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (!en.isIntersecting) return;
          const id = +en.target.dataset.id;
          const p = state.pages.find(x => x.id === id);
          if (p) requestThumb(pkey(p));
        });
      }, { rootMargin: '400px 0px' })
    : null;

