  // =====================================================================
  //  Rendu des pages hors du fil principal
  //  -------------------------------------------------------------------
  //  pdf.js lit un PDF dans son propre travailleur, mais il dessine la page
  //  sur le fil de l'interface : pour un scan, décoder l'image puis la
  //  réduire gèle la fenêtre de 0,7 à 2,5 secondes à chaque page (mesuré :
  //  721 ms d'un seul bloc pour une page de 8,7 mégapixels). Ici, les pages
  //  des documents lourds se dessinent dans un travailleur, sur un
  //  OffscreenCanvas, et reviennent en ImageBitmap : le résultat est le
  //  même pixel pour pixel, la fenêtre ne se fige plus (27 ms mesurées).
  //
  //  Le travailleur embarque sa propre copie de pdf.js (le texte de la
  //  bibliothèque est déjà dans la page) et fait tourner le travailleur de
  //  pdf.js dans son propre fil, sans en créer un troisième : un blob:
  //  d'une page ouverte depuis le disque ne peut pas lancer un travailleur
  //  imbriqué. Il ne sert qu'aux documents lourds ; un document de texte
  //  se dessine en quelques millisecondes et garde le chemin d'avant.
  //  Au moindre échec — navigateur, mémoire, document chiffré —, le
  //  dessin retombe sur le fil principal, sans rien dire à l'utilisateur.
  // =====================================================================
  const RENDU_LOURD = 150 * 1024;                // octets par page à partir desquels un document est « lourd »
  const RENDU_MAX = 400 * 1024 * 1024;           // ce que le travailleur garde de copies de fichiers, au plus
  const rendu = { travailleur: null, hors: false, appels: new Map(), ouverts: new Map(), octets: 0, n: 0 };

  // Le travailleur : pdf.js, son travailleur de lecture dans le même fil, et un petit protocole.
  const RENDU_CORPS = `
    const fabrique = { create(w, h) { const c = new OffscreenCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; },
      reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }, destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; cc.canvas = null; cc.context = null; } };
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'aucun.js';
    const docs = new Map(), taches = new Map();
    self.onmessage = async (e) => {
      const m = e.data;
      try {
        if (m.type === 'ouvrir') {
          const doc = await pdfjsLib.getDocument(Object.assign({ data: m.donnees, disableFontFace: true, isEvalSupported: false, canvasFactory: fabrique, isOffscreenCanvasSupported: true }, m.mdp ? { password: m.mdp } : {})).promise;
          docs.set(m.doc, doc);
          postMessage({ id: m.id, ok: true });
        } else if (m.type === 'fermer') {
          const doc = docs.get(m.doc); docs.delete(m.doc);
          if (doc) doc.destroy();
          postMessage({ id: m.id, ok: true });
        } else if (m.type === 'annuler') {
          const t = taches.get(m.cible); if (t) t.cancel();
        } else if (m.type === 'rendre') {
          const page = await docs.get(m.doc).getPage(m.page);
          const vp = page.getViewport({ scale: m.echelle, rotation: m.rotation });
          const oc = new OffscreenCanvas(Math.max(1, Math.ceil(vp.width)), Math.max(1, Math.ceil(vp.height)));
          const cx = oc.getContext('2d');
          if (m.fond) { cx.fillStyle = m.fond; cx.fillRect(0, 0, oc.width, oc.height); }
          const tache = page.render({ canvasContext: cx, viewport: vp, canvasFactory: fabrique });
          taches.set(m.id, tache);
          try { await tache.promise; } finally { taches.delete(m.id); page.cleanup(); }
          const bmp = oc.transferToImageBitmap();
          postMessage({ id: m.id, ok: true, bmp }, [bmp]);
        }
      } catch (err) { postMessage({ id: m.id, ok: false, annule: !!(err && err.name === 'RenderingCancelledException'), err: String(err && err.message || err) }); }
    };`;

  function renduTravailleur() {
    if (rendu.travailleur) return rendu.travailleur;
    const lib = document.getElementById('aktum-pdfjs'), moteur = document.getElementById('aktum-worker');
    if (rendu.hors || !lib || !moteur || typeof Worker !== 'function' || typeof OffscreenCanvas !== 'function' || typeof createImageBitmap !== 'function') { rendu.hors = true; return null; }
    try {
      // pdf.js, puis son travailleur de lecture (qui se déclare tout seul), puis le protocole.
      const code = lib.textContent + '\n' + moteur.textContent + '\nself.pdfjsWorker = self["pdfjs-dist/build/pdf.worker"] || self.pdfjsWorker;\n' + RENDU_CORPS;
      const w = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
      w.onmessage = e => {
        const r = rendu.appels.get(e.data.id);
        if (!r) { if (e.data.bmp) e.data.bmp.close(); return; }
        rendu.appels.delete(e.data.id);
        if (e.data.ok) r.res(e.data); else { const err = new Error(e.data.err || 'rendu'); if (e.data.annule) err.name = 'RenderingCancelledException'; r.rej(err); }
      };
      w.onerror = e => { renduRenoncer(e && e.message ? e.message : 'travailleur'); };
      rendu.travailleur = w;
      return w;
    } catch (e) { renduRenoncer(e && e.message ? e.message : e); return null; }
  }
  // Le travailleur est abandonné : les appels en vol échouent (l'appelant retombe sur le fil principal), et on n'y revient pas.
  function renduRenoncer(raison) {
    rendu.hors = true;
    if (rendu.travailleur) { try { rendu.travailleur.terminate(); } catch (_) { /* déjà arrêté */ } rendu.travailleur = null; }
    rendu.appels.forEach(r => r.rej(new Error('rendu : ' + raison)));
    rendu.appels.clear(); rendu.ouverts.clear(); rendu.octets = 0;
  }
  function renduAppeler(message, transfert) {
    const w = renduTravailleur();
    if (!w) return Promise.reject(new Error('rendu indisponible'));
    const id = ++rendu.n;
    return new Promise((res, rej) => { rendu.appels.set(id, { res, rej }); w.postMessage(Object.assign({ id }, message), transfert || []); }).then(r => r, e => { throw e; });
  }
  // Ce document se dessine-t-il dans le travailleur ? Un document lourd (beaucoup d'octets par page), tant que les
  // copies gardées par le travailleur tiennent dans la limite : au-delà, on libère d'abord celles des documents que
  // l'on ne montre plus (un onglet fermé, un document retiré), puis on y renonce pour celui-ci.
  function renduPour(src) {
    if (rendu.hors || !src || !src.pdfjs || !src.bytes) return false;
    if (!document.getElementById('aktum-pdfjs')) return false;
    const taille = src.bytes.byteLength;
    if (taille / Math.max(1, src.count || 1) < RENDU_LOURD) return false;
    if (rendu.ouverts.has(src.id)) return true;
    if (rendu.octets + taille > RENDU_MAX) {
      const vus = new Set(state.sources.map(s => s.id));
      Array.from(rendu.ouverts.keys()).forEach(id => { if (!vus.has(id)) renduFermer(id); });
    }
    return rendu.octets + taille <= RENDU_MAX;
  }
  function renduOuvrir(src) {
    const dejaLa = rendu.ouverts.get(src.id);
    if (dejaLa) return dejaLa.promesse;
    const taille = src.bytes.byteLength;
    rendu.octets += taille;
    const copie = new Uint8Array(taille);
    copie.set(src.bytes instanceof Uint8Array ? src.bytes : new Uint8Array(src.bytes));
    const promesse = renduAppeler({ type: 'ouvrir', doc: src.id, donnees: copie, mdp: src.password || null }, [copie.buffer]);
    rendu.ouverts.set(src.id, { promesse, octets: taille });
    promesse.catch(() => renduOublier(src.id));
    return promesse;
  }
  function renduOublier(id) {
    const o = rendu.ouverts.get(id);
    if (!o) return;
    rendu.ouverts.delete(id);
    rendu.octets = Math.max(0, rendu.octets - o.octets);
  }
  // Libère la copie d'un document que l'on ne montre plus.
  function renduFermer(id) {
    if (!rendu.ouverts.has(id)) return;
    renduOublier(id);
    if (rendu.travailleur) renduAppeler({ type: 'fermer', doc: id }).catch(() => { /* déjà fermé */ });
  }

  // Remplace `page.render({ canvasContext, viewport })` : même contrat (une tâche avec `promise` et `cancel()`, qui
  // échoue avec RenderingCancelledException si on l'annule), mais le dessin se fait hors du fil principal pour un
  // document lourd. `fond` : la couleur dont le canvas est déjà rempli (le travailleur l'applique aussi, pour que
  // le résultat soit identique).
  function rendrePage(page, src, opts, fond) {
    const vp = opts.viewport;
    if (opts.annotationMode !== undefined || !renduPour(src) || !vp || !(vp.scale > 0)) return page.render(opts);
    let annule = false, idRendu = 0;
    const tache = {
      promise: null,
      cancel() { annule = true; if (idRendu && rendu.travailleur) rendu.travailleur.postMessage({ type: 'annuler', cible: idRendu }); },
    };
    tache.promise = (async () => {
      try {
        await renduOuvrir(src);
        if (annule) { const e = new Error('annulé'); e.name = 'RenderingCancelledException'; throw e; }
        const id = rendu.n + 1;
        idRendu = id;
        const r = await renduAppeler({ type: 'rendre', doc: src.id, page: page.pageNumber, echelle: vp.scale, rotation: vp.rotation, fond: fond || null });
        try {
          if (annule) { const e = new Error('annulé'); e.name = 'RenderingCancelledException'; throw e; }
          opts.canvasContext.drawImage(r.bmp, 0, 0);
        } finally { r.bmp.close(); }
      } catch (e) {
        if (e && e.name === 'RenderingCancelledException') throw e;
        // Le travailleur n'a pas pu : le dessin se fait à l'ancienne, et l'on n'y revient pas.
        signaler('Rendu en arrière-plan', e, 'info');
        renduRenoncer(e && e.message ? e.message : e);
        if (annule) { const c = new Error('annulé'); c.name = 'RenderingCancelledException'; throw c; }
        await page.render(opts).promise;
      }
    })();
    return tache;
  }
