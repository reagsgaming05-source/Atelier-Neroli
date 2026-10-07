  // =====================================================================
  //  Comparer deux versions d'un document
  //  -------------------------------------------------------------------
  //  Page contre page, côte à côte, et les mots ajoutés ou retirés en
  //  couleur : ce qui a changé entre le devis reçu hier et celui d'aujourd'hui.
  // =====================================================================
  function motsDiff(a, b) {
    const A = String(a || '').split(/\s+/).filter(Boolean).slice(0, 3000);
    const B = String(b || '').split(/\s+/).filter(Boolean).slice(0, 3000);
    const n = A.length, m = B.length;
    const L = new Uint16Array((n + 1) * (m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        L[i * (m + 1) + j] = A[i] === B[j] ? L[(i + 1) * (m + 1) + j + 1] + 1 : Math.max(L[(i + 1) * (m + 1) + j], L[i * (m + 1) + j + 1]);
      }
    }
    const out = [];
    let i = 0, j = 0;
    const pousser = (t, mot) => { const d = out[out.length - 1]; if (d && d.t === t) d.mots.push(mot); else out.push({ t, mots: [mot] }); };
    while (i < n && j < m) {
      if (A[i] === B[j]) { pousser('=', A[i]); i++; j++; }
      else if (L[(i + 1) * (m + 1) + j] >= L[i * (m + 1) + j + 1]) { pousser('-', A[i]); i++; }
      else { pousser('+', B[j]); j++; }
    }
    while (i < n) { pousser('-', A[i]); i++; }
    while (j < m) { pousser('+', B[j]); j++; }
    const retires = out.filter(x => x.t === '-').reduce((k, x) => k + x.mots.length, 0);
    const ajoutes = out.filter(x => x.t === '+').reduce((k, x) => k + x.mots.length, 0);
    return { segments: out, retires, ajoutes };
  }
  // Le recalage des pages : une page insérée ou retirée ne décale pas toute la suite. Chaque page est réduite à l'ensemble de ses mots ; deux
  // pages se ressemblent selon la part de mots qu'elles ont en commun, et l'alignement garde, dans l'ordre, les paires qui se ressemblent le
  // plus. Une page sans équivalent devient une ligne « page retirée » ou « page ajoutée ». Sans aucun texte (deux scans), les pages se
  // rangent une à une, dans l'ordre : il n'y a rien d'autre pour les relier.
  const SIMILITUDE_MIN = 0.3;
  function motsDePage(t) { return new Set(String(t || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(m => m.length > 1)); }
  function similitude(a, b) {
    if (!a.size && !b.size) return 0.31;   // deux pages sans texte : un lien faible, qui garde l'ordre
    if (!a.size || !b.size) return 0;
    let commun = 0;
    const [petit, grand] = a.size <= b.size ? [a, b] : [b, a];
    petit.forEach(m => { if (grand.has(m)) commun++; });
    return commun / (a.size + b.size - commun);
  }
  function alignerPages(textesA, textesB) {
    const n = textesA.length, m = textesB.length;
    const A = textesA.map(motsDePage), B = textesB.map(motsDePage);
    const w = m + 1;
    const S = new Float32Array((n + 1) * w);
    const choix = new Uint8Array((n + 1) * w);   // 1 : paire, 2 : A retirée, 3 : B ajoutée
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        const sim = similitude(A[i], B[j]);
        const paire = sim >= SIMILITUDE_MIN ? S[(i + 1) * w + j + 1] + sim : -1;
        const sautA = S[(i + 1) * w + j], sautB = S[i * w + j + 1];
        let meilleur = Math.max(paire, sautA, sautB);
        S[i * w + j] = meilleur;
        // à égalité, la paire l'emporte : deux documents identiques s'alignent page à page
        choix[i * w + j] = paire === meilleur ? 1 : sautA >= sautB ? 2 : 3;
      }
    }
    const lignes = [];
    let i = 0, j = 0;
    while (i < n || j < m) {
      const c = i < n && j < m ? choix[i * w + j] : (i < n ? 2 : 3);
      if (c === 1) { lignes.push({ iA: i, iB: j }); i++; j++; }
      else if (c === 2) { lignes.push({ iA: i, iB: null }); i++; }
      else { lignes.push({ iA: null, iB: j }); j++; }
    }
    return lignes;
  }
  async function texteDocPage(docjs, i, srcId) {
    if (srcId != null && textCache.has(key(srcId, i))) { const t = textCache.get(key(srcId, i)); if (t) return t; }
    try {
      const page = await docjs.getPage(i + 1);
      const tc = await page.getTextContent();
      let out = '', last = null;
      tc.items.forEach(it => {
        if (last && it.transform && last.transform && Math.abs(it.transform[5] - last.transform[5]) > 2) out += '\n';
        else if (out && !/\s$/.test(out)) out += ' ';
        out += it.str; last = it;
      });
      page.cleanup();
      return out.replace(/[ \t]+/g, ' ').trim();
    } catch (_) { return ''; }
  }
  async function rendreDans(docjs, i, cv, largeur) {
    const page = await docjs.getPage(i + 1);
    const vp0 = page.getViewport({ scale: 1 });
    const k = Math.min(2, window.devicePixelRatio || 1);
    const vp = page.getViewport({ scale: largeur / vp0.width * k });
    cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
    cv.style.width = Math.round(vp.width / k) + 'px';
    const cx = cv.getContext('2d', { alpha: false });
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: cx, viewport: vp }).promise;
    page.cleanup();
  }
  function toolComparer() {
    const reelles = state.sources.filter(s => !s.genere);
    if (!reelles.length) { toast('Ouvrez d\'abord un document.', 'warn'); return; }
    const opts = reelles.map(s => [String(s.id), s.name]);
    const selA = select('cmp-a', opts, opts[0][0]);
    const selB = select('cmp-b', opts.concat([['fichier', 'Un autre fichier…']]), opts[1] ? opts[1][0] : 'fichier');
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/pdf,.pdf'; inp.id = 'cmp-fichier'; inp.className = 'sr-only'; inp.tabIndex = -1;
    const choisir = document.createElement('button');
    choisir.type = 'button'; choisir.className = 'tb-btn'; choisir.style.border = '1px solid var(--trait)';
    choisir.textContent = 'Choisir le fichier…';
    choisir.addEventListener('click', () => { inp.value = ''; inp.click(); });
    const nomB = note('Aucun fichier choisi.');
    let fichierB = null;
    inp.addEventListener('change', () => { fichierB = inp.files && inp.files[0] ? inp.files[0] : null; nomB.textContent = fichierB ? fichierB.name : 'Aucun fichier choisi.'; });
    const wrapB = rowOf([choisir, nomB], true);
    const majB = () => { wrapB.hidden = selB.value !== 'fichier'; };
    selB.addEventListener('change', majB); majB();
    dialog({
      aide: 'comparer',
      title: 'Comparer deux versions', icon: IC.compare,
      build: b => {
        b.append(field('Version A (avant)', selA, 'Le document de référence : ce qui était avant.'));
        b.append(field('Version B (après)', selB, 'Le document à contrôler : un autre document ouvert, ou un fichier de votre choix.'));
        b.append(wrapB, inp);
        b.append(note('Les pages sont mises côte à côte, et les mots retirés ou ajoutés sont surlignés. Une page scannée se compare après reconnaissance du texte.'));
      },
      actions: [{ label: 'Annuler', onClick: c => c() }, { label: 'Comparer', primary: true, onClick: async close => {
        const srcA = srcById(+selA.value);
        let docB = null, nomBTexte = '', srcBId = null;
        if (selB.value === 'fichier') {
          if (!fichierB) { toast('Choisissez le fichier de la version B.', 'warn'); return; }
          close();
          setBusy('Lecture de ' + fichierB.name + '…');
          try { docB = (await openWithPdfjs(fichierB.name, await fichierB.arrayBuffer(), null)).doc; nomBTexte = fichierB.name; }
          catch (e) { setBusy(''); toast('Impossible de lire ' + fichierB.name + '.', 'error'); return; }
        } else {
          const srcB = srcById(+selB.value);
          if (!srcA || !srcB) return;
          if (srcA === srcB) { toast('Choisissez deux versions différentes.', 'warn'); return; }
          close();
          docB = srcB.pdfjs; nomBTexte = srcB.name; srcBId = srcB.id;
        }
        if (!srcA) { setBusy(''); return; }
        setBusy('Comparaison…', 0, { annuler: true });
        try {
          const docA = srcA.pdfjs;
          const total = docA.numPages + docB.numPages;
          const textesA = [], textesB = [];
          const tour = cadence();
          for (let i = 0; i < docA.numPages; i++) {
            verifierAnnulation();
            setBusy('Lecture… page ' + (i + 1) + '/' + total, i / total, { annuler: true });
            textesA.push(await texteDocPage(docA, i, srcA.id));
            await tour();
          }
          for (let i = 0; i < docB.numPages; i++) {
            verifierAnnulation();
            setBusy('Lecture… page ' + (docA.numPages + i + 1) + '/' + total, (docA.numPages + i) / total, { annuler: true });
            textesB.push(await texteDocPage(docB, i, srcBId));
            await tour();
          }
          setBusy('Comparaison…', 0.95, { annuler: true });
          const pages = alignerPages(textesA, textesB).map(({ iA, iB }, i) => {
            const tA = iA != null ? textesA[iA] : '', tB = iB != null ? textesB[iB] : '';
            const d = motsDiff(tA, tB);
            return { i, iA, iB, tA, tB, diff: d, differe: d.retires + d.ajoutes > 0 || iA == null || iB == null };
          });
          setBusy('');
          afficherComparaison({ nomA: srcA.name, nomB: nomBTexte, docA, docB, pages, srcA, srcBId });
        } catch (e) { setBusy(''); if (e && e.annule) { toast('Comparaison annulée.', 'warn'); return; } toast(messageDEchec('La comparaison', e), 'error'); }
      } }],
    });
  }
  // Ce qui a changé d'aspect entre deux pages : les deux sont rendues à la
  // même échelle, comparées pixel à pixel (avec un pixel de tolérance pour
  // le lissage), et les écarts ressortent en rouge sur la page B estompée.
  async function diffVisuel(docA, docB, iA, iB, largeur) {
    const rendre = async (doc, i) => {
      if (i == null || i >= doc.numPages) return null;
      const page = await doc.getPage(i + 1);
      const v1 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: largeur / v1.width });
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
      const cx = cv.getContext('2d', { alpha: false, willReadFrequently: true });
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
      await page.render({ canvasContext: cx, viewport: vp }).promise;
      page.cleanup();
      return cv;
    };
    const a = await rendre(docA, iA), b = await rendre(docB, iB);
    const ref = b || a;
    if (!ref) return null;
    const W = ref.width, H = ref.height;
    const gris = cv => {
      const out = new Uint8ClampedArray(W * H);
      if (!cv) { out.fill(255); return out; }
      const d = cv.getContext('2d').getImageData(0, 0, Math.min(W, cv.width), Math.min(H, cv.height)).data;
      const w = Math.min(W, cv.width), h = Math.min(H, cv.height);
      out.fill(255);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = (y * w + x) * 4; out[y * W + x] = (d[k] * 299 + d[k + 1] * 587 + d[k + 2] * 114) / 1000; }
      return out;
    };
    const ga = gris(a), gb = gris(b);
    const sortie = document.createElement('canvas');
    sortie.width = W; sortie.height = H;
    const sc = sortie.getContext('2d');
    const img = sc.createImageData(W, H);
    const d = img.data;
    let diff = 0, encre = 0;
    const SEUIL = 56;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const j = y * W + x;
        const va = ga[j], vb = gb[j];
        if (va < 200 || vb < 200) encre++;
        // Un pixel diffère si aucun voisin immédiat de l'autre page ne lui ressemble.
        let ecart = Math.abs(va - vb);
        if (ecart > SEUIL) {
          let mini = ecart;
          for (let dy = -1; dy <= 1 && mini > SEUIL; dy++) for (let dx = -1; dx <= 1; dx++) {
            const yy = y + dy, xx = x + dx;
            if (yy < 0 || yy >= H || xx < 0 || xx >= W) continue;
            const e1 = Math.abs(va - gb[yy * W + xx]), e2 = Math.abs(vb - ga[yy * W + xx]);
            mini = Math.min(mini, e1, e2);
          }
          ecart = mini;
        }
        const k = j * 4;
        if (ecart > SEUIL) { diff++; d[k] = 220; d[k + 1] = 30; d[k + 2] = 40; d[k + 3] = 255; }
        else { const v = 255 - (255 - vb) * 0.35; d[k] = v; d[k + 1] = v; d[k + 2] = v; d[k + 3] = 255; }
      }
    }
    sc.putImageData(img, 0, 0);
    return { canvas: sortie, ratio: diff / (W * H), part: encre ? diff / encre : 0 };
  }
  function afficherComparaison(c) {
    let differentes = c.pages.filter(p => p.differe);
    let courante = differentes.length ? differentes[0].i : 0;
    let seulement = true;
    let aspect = false;
    const aspects = new Map();
    const resume = note('');
    const grille = document.createElement('div'); grille.className = 'cmp-grille';
    const colA = document.createElement('div'); colA.className = 'cmp-page';
    const colB = document.createElement('div'); colB.className = 'cmp-page';
    const colD = document.createElement('div'); colD.className = 'cmp-page'; colD.hidden = true;
    const cvA = document.createElement('canvas'), cvB = document.createElement('canvas'), cvD = document.createElement('canvas');
    cvD.className = 'cmp-diff-vue';
    const labA = document.createElement('div'); labA.className = 'cmp-nom';
    const labB = document.createElement('div'); labB.className = 'cmp-nom';
    const labD = document.createElement('div'); labD.className = 'cmp-nom'; labD.id = 'cmp-aspect-info';
    colA.append(labA, cvA); colB.append(labB, cvB); colD.append(labD, cvD);
    grille.append(colA, colB, colD);
    const nav = document.createElement('div'); nav.className = 'imp-nav';
    const prev = document.createElement('button'); prev.type = 'button'; prev.textContent = '\u2039'; prev.title = 'Page précédente';
    const next = document.createElement('button'); next.type = 'button'; next.textContent = '\u203a'; next.title = 'Page suivante';
    const ou = document.createElement('span'); ou.id = 'cmp-ou';
    const filtre = checkbox('cmp-filtre', 'Seulement les pages qui diffèrent', true);
    filtre.input.addEventListener('change', () => { seulement = filtre.input.checked; majNav(); });
    const voirAspect = checkbox('cmp-aspect', 'Différences d\'aspect (image)', false);
    voirAspect.input.addEventListener('change', () => { aspect = voirAspect.input.checked; grille.classList.toggle('trois', aspect); colD.hidden = !aspect; montrer(); });
    nav.append(prev, ou, next);
    const diff = document.createElement('div'); diff.className = 'cmp-diff';
    const liste = () => seulement && differentes.length ? differentes.map(p => p.i) : c.pages.map(p => p.i);
    const sansTexte = () => c.pages.filter(p => (p.iA != null && !p.tA.trim()) || (p.iB != null && !p.tB.trim()));
    // Les pages sans texte (scans) se lisent d'abord, puis se comparent.
    const btnOcr = document.createElement('button');
    btnOcr.type = 'button'; btnOcr.className = 'tb-btn'; btnOcr.id = 'cmp-ocr'; btnOcr.style.border = '1px solid var(--trait)';
    btnOcr.textContent = 'Reconnaître le texte des pages sans texte';
    btnOcr.hidden = !(ocrDisponible() && sansTexte().length);
    btnOcr.addEventListener('click', async () => {
      const cibles = sansTexte();
      if (!cibles.length) return;
      btnOcr.disabled = true;
      setBusy('Préparation du moteur de reconnaissance…', 0, { annuler: true });
      try {
        const moteur = await ocrMoteur(['fra'], (etat, prog) => setBusy('Préparation… ' + etat, prog || 0, { annuler: true }));
        for (let k = 0; k < cibles.length; k++) {
          const pg = cibles[k];
          if (annulationDemandee()) break;
          setBusy('Reconnaissance… page ' + (pg.i + 1) + ' (' + (k + 1) + '/' + cibles.length + ')', k / cibles.length, { annuler: true });
          if (pg.iA != null && !pg.tA.trim()) {
            const dansTable = c.srcA ? state.pages.find(p => p.src === c.srcA.id && p.index === pg.iA) : null;
            if (dansTable && dansTable.ocr) pg.tA = dansTable.ocr.texte;
            else {
              const r = await ocrDocPage(c.docA, pg.iA, moteur);
              pg.tA = r.texte;
              if (dansTable) { dansTable.ocr = { mots: r.mots, texte: r.texte, conf: r.conf, langues: 'fra', quand: Date.now() }; textCache.set(pkey(dansTable), r.texte); ocrCache.add(pkey(dansTable)); }
            }
          }
          if (pg.iB != null && !pg.tB.trim()) {
            const dansTable = c.srcBId ? state.pages.find(p => p.src === c.srcBId && p.index === pg.iB) : null;
            if (dansTable && dansTable.ocr) pg.tB = dansTable.ocr.texte;
            else {
              const r = await ocrDocPage(c.docB, pg.iB, moteur);
              pg.tB = r.texte;
              if (dansTable) { dansTable.ocr = { mots: r.mots, texte: r.texte, conf: r.conf, langues: 'fra', quand: Date.now() }; textCache.set(pkey(dansTable), r.texte); ocrCache.add(pkey(dansTable)); }
            }
          }
          pg.diff = motsDiff(pg.tA, pg.tB);
          pg.differe = pg.diff.retires + pg.diff.ajoutes > 0 || pg.iA == null || pg.iB == null || !!pg.aspectDiffere;
        }
        differentes = c.pages.filter(p => p.differe);
        if (state.pages.some(p => p.ocr)) { state.touched = true; vue.render(); }
        majResume();
        montrer();
      } catch (e) { toast(messageDEchec('La reconnaissance du texte', e), 'error'); }
      finally { setBusy(''); btnOcr.hidden = !sansTexte().length; btnOcr.disabled = false; }
    });
    const btnAspect = document.createElement('button');
    btnAspect.type = 'button'; btnAspect.className = 'tb-btn'; btnAspect.id = 'cmp-aspect-tout'; btnAspect.style.border = '1px solid var(--trait)';
    btnAspect.textContent = 'Comparer l\'aspect de toutes les pages';
    btnAspect.addEventListener('click', async () => {
      btnAspect.disabled = true;
      setBusy('Comparaison de l\'aspect…', 0, { annuler: true });
      try {
        for (let k = 0; k < c.pages.length; k++) {
          verifierAnnulation();
          setBusy('Aspect… page ' + (k + 1) + '/' + c.pages.length, k / c.pages.length, { annuler: true });
          if (!aspects.has(k)) aspects.set(k, await diffVisuel(c.docA, c.docB, c.pages[k].iA, c.pages[k].iB, 1000));
          const r = aspects.get(k);
          c.pages[k].aspectDiffere = !!(r && r.ratio > 0.002);
          c.pages[k].differe = c.pages[k].diff.retires + c.pages[k].diff.ajoutes > 0 || c.pages[k].iA == null || c.pages[k].iB == null || c.pages[k].aspectDiffere;
        }
        differentes = c.pages.filter(p => p.differe);
        majResume();
        if (!aspect) voirAspect.input.click();
        montrer();
      } catch (e) { if (!(e && e.annule)) { toast(messageDEchec('La comparaison', e), 'error'); } }
      finally { setBusy(''); btnAspect.disabled = false; }
    });
    const majNav = () => {
      const l = liste();
      const k = l.indexOf(courante);
      prev.disabled = k <= 0; next.disabled = k < 0 || k >= l.length - 1;
      ou.textContent = 'Page ' + (courante + 1) + ' / ' + c.pages.length + (seulement && differentes.length ? ' (' + (k + 1) + ' sur ' + differentes.length + ' différentes)' : '');
    };
    let jeton = 0;
    let montrer = async () => {
      const mien = ++jeton;
      majNav();
      const p = c.pages[courante];
      labA.textContent = 'A · ' + baseName(c.nomA) + (p.iA != null ? ' · ' + tr('p. ' + (p.iA + 1)) : ' · ' + tr('page absente : page ajoutée dans B'));
      labB.textContent = 'B · ' + baseName(c.nomB) + (p.iB != null ? ' · ' + tr('p. ' + (p.iB + 1)) : ' · ' + tr('page absente : page retirée de B'));
      diff.replaceChildren();
      const entete = document.createElement('div'); entete.className = 'cmp-chiffres';
      entete.textContent = p.diff.retires + p.diff.ajoutes
        ? plural(p.diff.retires, 'mot retiré', 'mots retirés') + ', ' + plural(p.diff.ajoutes, 'mot ajouté', 'mots ajoutés')
        : (p.tA || p.tB ? 'Texte identique sur cette page.' : 'Aucun texte sur cette page (scan ? lancez la reconnaissance de texte).');
      diff.appendChild(entete);
      const corps = document.createElement('p'); corps.className = 'cmp-texte'; corps.setAttribute('translate', 'no');
      p.diff.segments.forEach(sg => {
        const sp = document.createElement('span');
        if (sg.t === '-') sp.className = 'diff-del'; else if (sg.t === '+') sp.className = 'diff-add';
        sp.textContent = sg.mots.join(' ') + ' ';
        corps.appendChild(sp);
      });
      diff.appendChild(corps);
      const largeur = Math.max(160, Math.min(380, (grille.clientWidth || 760) / (aspect ? 3 : 2) - 14));
      try {
        if (p.iA != null) await rendreDans(c.docA, p.iA, cvA, largeur); else { cvA.width = 1; cvA.height = 1; }
        if (mien !== jeton) return;
        if (p.iB != null) await rendreDans(c.docB, p.iB, cvB, largeur); else { cvB.width = 1; cvB.height = 1; }
      } catch (e) { signaler('Comparaison', e); }
    };
    prev.addEventListener('click', () => { const l = liste(); const k = l.indexOf(courante); if (k > 0) { courante = l[k - 1]; montrer(); } });
    next.addEventListener('click', () => { const l = liste(); const k = l.indexOf(courante); if (k >= 0 && k < l.length - 1) { courante = l[k + 1]; montrer(); } });
    const majResume = () => {
      const totalR = c.pages.reduce((k, p) => k + p.diff.retires, 0), totalA = c.pages.reduce((k, p) => k + p.diff.ajoutes, 0);
      const aspectN = c.pages.filter(p => p.aspectDiffere).length;
      const st = sansTexte().length;
      resume.textContent = (differentes.length
        ? plural(differentes.length, 'page diffère', 'pages diffèrent') + ' sur ' + c.pages.length + ' : ' + plural(totalR, 'mot retiré', 'mots retirés') + ', ' + plural(totalA, 'mot ajouté', 'mots ajoutés') + (aspectN ? ', ' + plural(aspectN, 'page d\'aspect différent', 'pages d\'aspect différent') : '') + (c.docA.numPages !== c.docB.numPages ? ' · ' + c.docA.numPages + ' pages contre ' + c.docB.numPages : '') + '.'
        : 'Aucune différence de texte entre les deux versions (' + plural(c.pages.length, 'page', 'pages') + ').')
        + (st ? ' ' + plural(st, 'page n\'a pas de texte', 'pages n\'ont pas de texte') + ' (scan ?) : reconnaissez-le, ou comparez l\'aspect.' : '');
    };
    majResume();
    const montrerBase = montrer;
    montrer = async () => {
      await montrerBase();
      if (!aspect) return;
      const k = courante;
      labD.textContent = 'Différences d\'aspect…';
      if (!aspects.has(k)) {
        try { aspects.set(k, await diffVisuel(c.docA, c.docB, c.pages[k].iA, c.pages[k].iB, 1000)); } catch (e) { signaler('Comparaison', e); aspects.set(k, null); }
      }
      if (k !== courante) return;
      const r = aspects.get(k);
      if (!r) { labD.textContent = 'Aspect : page absente'; cvD.width = 1; cvD.height = 1; return; }
      cvD.width = r.canvas.width; cvD.height = r.canvas.height;
      cvD.style.width = Math.round(Math.max(160, Math.min(380, (grille.clientWidth || 760) / 3 - 14))) + 'px';
      cvD.getContext('2d').drawImage(r.canvas, 0, 0);
      // Un mot changé ne pèse rien à l'échelle de la page : le seuil est bas,
      // et la part de l'encre concernée est dite aussi.
      const pctPage = (r.ratio * 100).toFixed(2), pctEncre = (r.part * 100).toFixed(1);
      labD.textContent = 'Aspect : ' + (r.ratio < 0.0001 ? 'identique' : pctPage + ' % de la page diffère (' + pctEncre + ' % de l\'encre), en rouge');
    };
    dialog({
      title: 'Comparaison : ' + baseName(c.nomA) + ' → ' + baseName(c.nomB), icon: IC.compare, wide: true, submitOnEnter: false,
      build: b => { b.append(resume, rowOf([nav, filtre, voirAspect], true), rowOf([btnOcr, btnAspect], true), grille, diff); },
      actions: [{ label: 'Fermer', primary: true, onClick: cl => cl() }],
    });
    setTimeout(montrer, 30);
  }

