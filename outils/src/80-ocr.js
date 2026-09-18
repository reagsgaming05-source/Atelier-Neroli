  // =====================================================================
  //  Reconnaissance de texte (OCR), entièrement locale
  //  -------------------------------------------------------------------
  //  Le moteur tesseract tourne dans un worker de la page, avec les
  //  modèles français et allemand embarqués : rien ne part nulle part.
  //  Le texte reconnu sert à la recherche, au remplacement, au tableau,
  //  à la correction, et repart dans le PDF exporté en texte invisible.
  // =====================================================================
  const OCR_CDN = {
    lib: 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js',
    worker: 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js',
    core: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core-simd-lstm.wasm.js',
  };
  const ocr = { moteur: null, langues: '', workerUrl: null, embarque: !!document.getElementById('tess-worker-src') };
  // Le moteur pèse quelque deux cents mégaoctets. Il reste en place tant qu'on
  // s'en sert — reconnaître une seconde page ne doit pas le recharger — mais il
  // se libère après un long moment sans usage plutôt que de tenir la mémoire
  // jusqu'à la fermeture de l'application.
  const OCR_REPOS = 5 * 60 * 1000;
  let ocrMinuteur = null, ocrEnCours = 0;
  function ocrToucher() {
    clearTimeout(ocrMinuteur);
    ocrMinuteur = setTimeout(ocrLiberer, OCR_REPOS);
  }
  async function ocrLiberer() {
    clearTimeout(ocrMinuteur); ocrMinuteur = null;
    if (ocrEnCours || !ocr.moteur) return;
    const m = ocr.moteur;
    ocr.moteur = null; ocr.langues = '';
    try { await m.terminate(); } catch (e) { signaler('OCR', e, 'info'); }
  }
  // Un mot reconnu : sa ligne de base et son corps (ceux de sa ligne).
  const ocrBase = m => (m.b != null ? m.b : m.y + m.h * 0.8);
  const ocrCorps = m => (m.s > 0 ? m.s : Math.max(4, m.h * 1.05));
  const ocrDisponible = () => typeof WebAssembly === 'object' && typeof Worker !== 'undefined' && (ocr.embarque || !state.bureau);
  async function ocrMoteur(langues, avancement) {
    const cle = langues.join('+');
    ocrToucher();
    if (ocr.moteur && ocr.langues === cle) return ocr.moteur;
    if (ocr.moteur) { try { await ocr.moteur.terminate(); } catch (_) {} ocr.moteur = null; }
    if (!window.Tesseract) {
      if (ocr.embarque) throw new Error('le moteur de reconnaissance manque dans cette page');
      await loadScript(OCR_CDN.lib);
    }
    const base64Octets = b64 => { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };
    const opts = {
      cacheMethod: 'none',
      logger: m => { if (avancement && m && m.status) avancement(m.status, m.progress); },
      errorHandler: e => signaler('OCR', e),
    };
    let modeles;
    if (ocr.embarque) {
      // Le moteur (wasm) est concaténé devant le script du worker : il n'a
      // rien à charger de l'extérieur.
      if (!ocr.workerUrl) ocr.workerUrl = URL.createObjectURL(new Blob([document.getElementById('tess-core-src').textContent, '\n', document.getElementById('tess-worker-src').textContent], { type: 'application/javascript' }));
      modeles = langues.map(code => {
        const n = document.getElementById('tess-lang-' + code);
        if (!n) throw new Error('le modèle de langue « ' + code + ' » manque');
        return { code, data: base64Octets(n.textContent.replace(/\s+/g, '')) };
      });
      Object.assign(opts, { workerPath: ocr.workerUrl, workerBlobURL: false });
    } else {
      modeles = langues;
      Object.assign(opts, { workerPath: OCR_CDN.worker, corePath: OCR_CDN.core });
    }
    ocr.moteur = await window.Tesseract.createWorker(modeles, 1, opts);
    ocr.langues = cle;
    ocrToucher();
    return ocr.moteur;
  }
  // Une page rendue assez fin pour un texte imprimé (≈ 200 ppp), puis lue.
  async function ocrPage(p, moteur) {
    const g = pageGeom(p);
    const src = srcById(p.src);
    const page = await src.pdfjs.getPage(p.index + 1);
    return ocrRendu(page, g.total, moteur);
  }
  // La même lecture pour une page d'un document qui n'est pas ouvert dans
  // la table (l'autre version d'une comparaison).
  async function ocrDocPage(docjs, i, moteur) {
    const page = await docjs.getPage(i + 1);
    return ocrRendu(page, page.rotate || 0, moteur);
  }
  async function ocrRendu(page, rotation, moteur) {
    const v1 = page.getViewport({ scale: 1, rotation });
    const echelle = Math.min(4, Math.max(1.5, 2300 / Math.max(v1.width, v1.height)));
    const vp = page.getViewport({ scale: echelle, rotation });
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(vp.width)); cv.height = Math.max(1, Math.ceil(vp.height));
    const cx = cv.getContext('2d', { alpha: false });
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: cx, viewport: vp }).promise;
    page.cleanup();
    // Tant qu'une page est en cours de lecture, le moteur ne se libère pas.
    ocrEnCours++;
    let data;
    try { ({ data } = await moteur.recognize(cv, {}, { blocks: true, text: true })); }
    finally { ocrEnCours--; ocrToucher(); }
    const mots = [], lignes = [];
    (data.blocks || []).forEach(b => (b.paragraphs || []).forEach(par => (par.lines || []).forEach(l => {
      const ml = [];
      // La ligne de base et le corps sont ceux de la ligne : un mot sans
      // jambage ni hampe garde le même repère que ses voisins.
      const lb = l.bbox || null, base = l.baseline && l.baseline.has_baseline !== false ? l.baseline : null;
      const corps = lb ? Math.max(4, (lb.y1 - lb.y0) / echelle) : null;
      (l.words || []).forEach(w => {
        const t = String(w.text || '').trim();
        if (!t || !w.bbox) return;
        const cx = (w.bbox.x0 + w.bbox.x1) / 2;
        let b = null;
        if (base && base.x1 !== base.x0) b = (base.y0 + (base.y1 - base.y0) * (cx - base.x0) / (base.x1 - base.x0)) / echelle;
        else if (base) b = base.y0 / echelle;
        else if (lb) b = (lb.y1 - (lb.y1 - lb.y0) * 0.22) / echelle;
        mots.push({ t, x: w.bbox.x0 / echelle, y: w.bbox.y0 / echelle, w: (w.bbox.x1 - w.bbox.x0) / echelle, h: (w.bbox.y1 - w.bbox.y0) / echelle,
          b, s: corps ? +Math.min(corps * 0.95, corps).toFixed(2) : null, conf: Math.round(w.confidence || 0) });
        ml.push(t);
      });
      if (ml.length) lignes.push(ml.join(' '));
    })));
    return { mots, texte: lignes.join('\n'), conf: Math.round(data.confidence || 0) };
  }
  async function pageSansTexte(p) {
    const src = srcById(p.src);
    if (!src) return false;
    try {
      const page = await src.pdfjs.getPage(p.index + 1);
      const tc = await page.getTextContent();
      return !tc.items.some(it => it.str && it.str.trim());
    } catch (_) { return false; }
  }
  // Le texte reconnu, écrit invisible sur la page exportée : le PDF devient
  // sélectionnable et cherchable, comme après un OCR d'Acrobat.
  async function poserTexteOcr(doc, page, p, fonts) {
    if (!p.ocr || !p.ocr.mots || !p.ocr.mots.length) return;
    // Un mot masqué ne part pas dans le texte invisible : il disparaîtrait de
    // la page mais se lirait encore par copier-coller. Le reste de la page,
    // lui, garde son texte reconnu.
    const masques = (p.ann || []).filter(a => a.type === 'redact' || (a.type === 'edit' && a.efface))
      .map(a => ({ x: a.x - 0.5, y: a.y - 0.5, w: (a.w || 0) + 1, h: (a.type === 'redact' ? (a.h || 0) : (a.h0 || annHauteur(a))) + 1 }));
    const g = pageGeom(p);
    const font = await getFont(doc, fonts, 'Helvetica', false, false);
    page.pushOperators(PDFLib.setTextRenderingMode(PDFLib.TextRenderingMode.Invisible));
    p.ocr.mots.forEach(m => {
      const t = winAnsi(m.t);
      if (!t) return;
      if (masques.length) {
        const corps = ocrCorps(m);
        const b = { x: m.x, y: ocrBase(m) - corps * 0.8, w: m.w, h: corps * 1.1 };
        if (masques.some(z => b.x < z.x + z.w && b.x + b.w > z.x && b.y < z.y + z.h && b.y + b.h > z.y)) return;
      }
      const w1 = font.widthOfTextAtSize(t, 1);
      if (!(w1 > 0)) return;
      const size = Math.max(3, Math.min(ocrCorps(m) * 1.3, m.w / w1));
      drawDisplayText(page, g, { text: t, x: m.x, y: ocrBase(m), size, font, color: '#000000', align: 'left' });
    });
    page.pushOperators(PDFLib.setTextRenderingMode(PDFLib.TextRenderingMode.Fill));
  }
  function toolOcr() {
    if (!ocrDisponible()) {
      dialog({ title: 'Reconnaître le texte', icon: IC.ocr, build: b => b.append(note('La reconnaissance de texte n\'est pas disponible dans cette version de la page : utilisez la version hors ligne ou l\'application Windows, qui embarquent le moteur.', 'warn')) });
      return;
    }
    const quoi = select('ocr-quoi', [['sans', 'Les pages sans texte (scans, images)'], ['sel', 'Les pages sélectionnées'], ['toutes', 'Toutes les pages']], state.selected.size ? 'sel' : 'sans');
    let langueMemo = 'fra';
    try { langueMemo = localStorage.getItem('blonay-ocr-langue') || 'fra'; } catch (_) {}
    const langue = select('ocr-langue', [['fra', 'Français'], ['fra+deu', 'Français et allemand'], ['deu', 'Allemand']], langueMemo);
    dialog({
      title: 'Reconnaître le texte (OCR)', icon: IC.ocr,
      build: b => {
        b.append(rowOf([field('Pages', quoi), field('Langue', langue)]));
        b.append(note('Le texte reconnu sert à la recherche, au remplacement, au tableau vers Excel et à la correction dans l\'éditeur ; il part dans le PDF exporté, invisible mais sélectionnable et cherchable. Tout se passe sur cet ordinateur : rien n\'est envoyé.'));
        b.append(note('Comptez quelques secondes par page. Un scan droit, net et bien contrasté se lit mieux.'));
      },
      actions: [{ label: 'Annuler', onClick: c => c() }, { label: 'Reconnaître', primary: true, onClick: async close => {
        close();
        try { localStorage.setItem('blonay-ocr-langue', langue.value); } catch (_) {}
        const langues = langue.value.split('+');
        setBusy('Repérage des pages…', 0);
        let pages = quoi.value === 'sel' ? selectedPages() : state.pages.slice();
        if (quoi.value === 'sans') {
          const gardees = [];
          for (const p of pages) { if (!p.ocr && await pageSansTexte(p)) gardees.push(p); }
          pages = gardees;
        }
        if (!pages.length) { setBusy(''); toast(quoi.value === 'sans' ? 'Toutes les pages portent déjà du texte : rien à reconnaître.' : 'Aucune page à reconnaître.', 'warn'); return; }
        try {
          setBusy('Préparation du moteur de reconnaissance…', 0, { annuler: true });
          const moteur = await ocrMoteur(langues, (etat, prog) => setBusy('Préparation… ' + etat, prog || 0, { annuler: true }));
          snapshot();
          let mots = 0, faibles = 0, faites = 0, interrompu = false;
          const t0 = Date.now();
          for (let i = 0; i < pages.length; i++) {
            const p = pages[i];
            if (annulationDemandee()) { interrompu = true; break; }
            // Le temps restant, d'après les pages déjà faites.
            const reste = i ? ' · environ ' + dureeTexte((Date.now() - t0) / i * (pages.length - i) / 1000) + ' restantes' : '';
            setBusy('Reconnaissance… page ' + (pageIndex(p.id) + 1) + ' (' + (i + 1) + '/' + pages.length + ')' + reste, i / pages.length, { annuler: true });
            const r = await ocrPage(p, moteur);
            p.ocr = { mots: r.mots, texte: r.texte, conf: r.conf, langues: langue.value, quand: Date.now() };
            textCache.set(pkey(p), r.texte);
            ocrCache.add(pkey(p));
            mots += r.mots.length; faites++;
            if (r.mots.length && r.conf < 60) faibles++;
            await nextFrame();
          }
          state.touched = true;
          render();
          const bilan = plural(mots, 'mot reconnu', 'mots reconnus') + ' sur ' + plural(faites, 'page', 'pages');
          setLast((interrompu ? 'Reconnaissance interrompue : ' : 'Texte reconnu : ') + bilan);
          toast(bilan + (interrompu ? ' avant l\'arrêt.' : '.') + (faibles ? ' ' + plural(faibles, 'page se lit mal', 'pages se lisent mal') + ' : vérifiez le résultat.' : ''), faibles || interrompu ? 'warn' : null);
        } catch (e) { console.error(e); toast('La reconnaissance a échoué : ' + (e && e.message ? e.message : e), 'error'); }
        finally { setBusy(''); }
      } }],
    });
  }

