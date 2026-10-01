  // =====================================================================
  //  Traitement par lots
  //  -------------------------------------------------------------------
  //  Le même traitement sur une série de fichiers, sans les ouvrir un par
  //  un : chacun passe par un document de travail à part, le document en
  //  cours n'est pas touché, et les résultats partent dans une archive.
  // =====================================================================
  const LOTS = [
    ['vides', 'Supprimer les pages vides'],
    ['compresser', 'Réduire la taille (150 ppp)'],
    ['numeroter', 'Numéroter les pages (pied de page)'],
    ['proteger', 'Protéger par mot de passe'],
    ['images', 'Convertir les images en PDF'],
    ['separer', 'Séparer : une page par fichier'],
    ['texte', 'Extraire le texte (.txt)'],
  ];
  async function traiterLots(fichiers, op, params, avancement) {
    const sorties = [], rapport = [];
    const sauve = prendreEtat();
    state.silencieux = true;
    try {
      for (let i = 0; i < fichiers.length; i++) {
        const f = fichiers[i];
        const base = safeBase(baseName(f.name));
        if (annulationDemandee()) { rapport.push('Interrompu ici : ' + plural(fichiers.length - i, 'fichier non traité', 'fichiers non traités') + '.'); break; }
        if (avancement) avancement(f.name, i, fichiers.length);
        poserEtat(etatVierge());
        try {
          if (op === 'images' && !isImage(f)) { rapport.push(f.name + ' : pas une image, laissé de côté'); continue; }
          await addFiles([f]);
          if (!state.pages.length) { rapport.push(f.name + ' : illisible'); continue; }
          if (op === 'vides') {
            const r = await detecterPagesVides(state.pages, SENSIBILITE.normal, null, null);
            const ids = new Set((r ? r.vides : []).map(m => m.p.id));
            const restantes = state.pages.filter(p => !ids.has(p.id));
            if (!restantes.length) { rapport.push(f.name + ' : toutes les pages sont vides, rien à garder'); continue; }
            sorties.push({ nom: base + tr('-sans-vides.pdf'), octets: await buildPdf(restantes, { noInPlace: ids.size > 0 }) });
            rapport.push(f.name + ' : ' + (ids.size ? plural(ids.size, 'page vide supprimée', 'pages vides supprimées') : 'aucune page vide'));
          } else if (op === 'compresser') {
            const avant = state.sources.reduce((a, s) => a + s.bytes.byteLength, 0);
            const octets = await buildPdf(state.pages, { rasterize: true, dpi: 150, quality: 0.72, noInPlace: true });
            // Réduire ne doit jamais alourdir : sur un document de texte, convertir
            // les pages en images multiplie la taille par dix ou plus.
            if (octets.length >= avant) {
              rapport.push(f.name + ' : non réduit — le résultat aurait fait ' + fmtSize(octets.length) + ' contre ' + fmtSize(avant) + ' (document de texte : la conversion en images l\'alourdirait), laissé tel quel');
              continue;
            }
            sorties.push({ nom: base + tr('-leger.pdf'), octets });
            rapport.push(f.name + ' : ' + fmtSize(avant) + ' → ' + fmtSize(octets.length));
          } else if (op === 'numeroter') {
            state.stamp = { headerLeft: '', headerCenter: '', headerRight: '', footerLeft: '', footerCenter: '{p} / {n}', footerRight: '',
              font: 'Helvetica', bold: false, size: 9, color: '#444444', margin: 28, start: 1, skipFirst: false, batesPrefix: '', batesDigits: 4 };
            sorties.push({ nom: base + tr('-numerote.pdf'), octets: await buildPdf(state.pages) });
            rapport.push(f.name + ' : ' + plural(state.pages.length, 'page numérotée', 'pages numérotées'));
          } else if (op === 'proteger') {
            state.security = { userPassword: params.pw || '', ownerPassword: params.pwo || params.pw || '', permissions: {} };
            sorties.push({ nom: base + tr('-protege.pdf'), octets: await buildPdf(state.pages) });
            rapport.push(f.name + ' : protégé');
          } else if (op === 'images') {
            sorties.push({ nom: base + '.pdf', octets: await buildPdf(state.pages) });
            rapport.push(f.name + ' : converti en PDF');
          } else if (op === 'separer') {
            const n = state.pages.length;
            for (let k = 0; k < n; k++) sorties.push({ nom: base + '-' + pad(k + 1, String(n).length) + '.pdf', octets: await buildPdf([state.pages[k]], { noInPlace: true }) });
            rapport.push(f.name + ' : ' + plural(n, 'fichier', 'fichiers'));
          } else if (op === 'texte') {
            const parts = [];
            for (let k = 0; k < state.pages.length; k++) parts.push(tr('--- Page ' + (k + 1) + ' ---\n') + ((await getPageText(state.pages[k])) || tr('(aucun texte)')));
            sorties.push({ nom: base + '.txt', octets: new TextEncoder().encode(parts.join('\n\n')) });
            rapport.push(f.name + ' : texte extrait');
          }
        } catch (e) { console.error(e); rapport.push(f.name + ' : échec (' + (e && e.message ? e.message : e) + ')'); }
      }
    } finally {
      poserEtat(sauve);
      state.silencieux = false;
      vue.render();
    }
    return { sorties, rapport };
  }
  function toolLots(opVoulue) {
    const fichiers = [];
    const liste = document.createElement('div'); liste.className = 'list';
    const inp = document.createElement('input');
    inp.type = 'file'; inp.multiple = true; inp.id = 'lots-fichiers'; inp.className = 'sr-only'; inp.tabIndex = -1;
    inp.accept = 'application/pdf,.pdf,image/png,image/jpeg,image/webp';
    const choisir = document.createElement('button');
    choisir.type = 'button'; choisir.className = 'tb-btn'; choisir.style.border = '1px solid var(--trait)';
    choisir.textContent = 'Choisir les fichiers…';
    choisir.addEventListener('click', () => { inp.value = ''; inp.click(); });
    const info = note('Aucun fichier choisi.');
    const remplir = () => {
      liste.replaceChildren();
      fichiers.forEach((f, i) => {
        const ligne = document.createElement('div'); ligne.className = 'list-item';
        const g = document.createElement('div'); g.className = 'g';
        const n = document.createElement('div'); n.className = 'n'; n.textContent = f.name;
        const sz = document.createElement('div'); sz.className = 's'; sz.textContent = fmtSize(f.size);
        g.append(n, sz);
        const x = document.createElement('button');
        x.type = 'button'; x.className = 'doc-rm'; x.title = 'Retirer'; x.setAttribute('aria-label', 'Retirer ' + f.name);
        x.style.opacity = '1';
        x.appendChild(icon(IC.x, { sw: 1.7 }));
        x.addEventListener('click', () => { fichiers.splice(i, 1); remplir(); });
        ligne.append(g, x);
        liste.appendChild(ligne);
      });
      info.textContent = fichiers.length ? plural(fichiers.length, 'fichier', 'fichiers') + ' · ' + fmtSize(fichiers.reduce((a, f) => a + f.size, 0)) : 'Aucun fichier choisi.';
    };
    inp.addEventListener('change', () => {
      Array.from(inp.files || []).forEach(f => { if ((isPdf(f) || isImage(f)) && !fichiers.some(x => x.name === f.name && x.size === f.size)) fichiers.push(f); });
      remplir();
    });
    const op = select('lots-op', LOTS, LOTS.some(l => l[0] === opVoulue) ? opVoulue : 'vides');
    const pw = input('lots-pw', 'password', ''), pwo = input('lots-pwo', 'password', '');
    const pwWrap = rowOf([field('Mot de passe d\'ouverture', pw), field('Mot de passe propriétaire', pwo, 'Facultatif')]);
    pwWrap.hidden = true;
    op.addEventListener('change', () => { pwWrap.hidden = op.value !== 'proteger'; });
    dialog({
      title: 'Traiter plusieurs fichiers', icon: IC.grille, wide: true, submitOnEnter: false,
      build: b => {
        b.append(rowOf([choisir, info], true));
        b.append(inp);
        b.append(liste);
        b.append(field('Traitement', op));
        b.append(pwWrap);
        b.append(note('Chaque fichier est traité à part, le document ouvert n\'est pas touché. Les résultats sont réunis dans une archive ZIP (un seul fichier : enregistré tel quel).'));
      },
      actions: [{ label: 'Annuler', onClick: c => c() }, { label: 'Lancer', primary: true, onClick: async close => {
        if (!fichiers.length) { toast('Choisissez d\'abord les fichiers à traiter.', 'warn'); return; }
        if (op.value === 'proteger' && !FEAT.encrypt) { toast('Le chiffrement n\'est pas disponible ici.', 'error'); return; }
        if (op.value === 'proteger' && !pw.value && !pwo.value) { toast('Indiquez au moins un mot de passe.', 'warn'); return; }
        close();
        const quoi = op.value;
        setBusy('Traitement du lot…', 0, { annuler: true });
        try {
          const r = await traiterLots(fichiers.slice(), quoi, { pw: pw.value, pwo: pwo.value }, (nom, i, n) => setBusy('Lot : ' + nom + ' (' + (i + 1) + '/' + n + ')', i / n, { annuler: true }));
          const jour = new Date().toISOString().slice(0, 10);
          if (!r.sorties.length) toast('Aucun fichier produit. ' + r.rapport.join(' · '), 'warn');
          else if (r.sorties.length === 1 || !FEAT.zip) {
            for (const f of r.sorties) await deliver(f.octets, f.nom, /\.txt$/.test(f.nom) ? 'text/plain' : 'application/pdf');
          } else {
            const zip = new JSZip();
            r.sorties.forEach(f => zip.file(f.nom, f.octets));
            const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
            await deliver(blob, tr('lot-') + quoi + '-' + jour + '.zip', 'application/zip');
          }
          setLast('Lot traité : ' + plural(r.sorties.length, 'fichier produit', 'fichiers produits'));
          dialog({
            title: 'Lot traité', icon: IC.grille,
            build: b => {
              b.append(note(plural(r.sorties.length, 'fichier produit', 'fichiers produits') + (r.sorties.length > 1 && FEAT.zip ? ', réunis dans une archive ZIP.' : '.')));
              const ul = document.createElement('div'); ul.className = 'list';
              r.rapport.forEach(t => { const d = document.createElement('div'); d.className = 'list-item'; d.textContent = t; ul.appendChild(d); });
              b.append(ul);
            },
          });
        } catch (e) { console.error(e); toast('Échec du traitement : ' + e.message, 'error'); }
        finally { setBusy(''); }
      } }],
    });
  }

  function toolImages() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp'; inp.multiple = true;
    inp.addEventListener('change', () => addFiles(inp.files));
    inp.click();
  }

  // Les plages de la division, une à une (voir lireIntervalles, 07-plages.js).
  const parseRanges = (text, max) => lireIntervalles(text, max);

  function toolSplit() {
    const mode = segmented('sp-mode', [['each', 'Une page par fichier'], ['every', 'Par lots'], ['ranges', 'Par plages']], 'each', v => {
      everyWrap.hidden = v !== 'every';
      rangesWrap.hidden = v !== 'ranges';
    });
    const every = input('sp-every', 'number', 2, { min: 1, max: 500 });
    const ranges = input('sp-ranges', 'text', '1-3, 4-6');
    const everyWrap = field('Nombre de pages par fichier', every);
    const rangesWrap = field('Plages de pages', ranges, 'Exemple : 1-3, 5, 8-10 — un fichier par plage.');
    everyWrap.hidden = true; rangesWrap.hidden = true;
    dialog({
      title: 'Diviser le document', icon: IC.deux,
      build: b => {
        b.append(field('Découpage', mode));
        b.append(everyWrap, rangesWrap);
        b.append(note(FEAT.zip ? 'Les fichiers obtenus sont réunis dans une archive ZIP.' : 'L\'archive ZIP est indisponible : les fichiers seront enregistrés un par un.', FEAT.zip ? null : 'warn'));
      },
      actions: [{ label: 'Annuler', onClick: c => c() }, { label: 'Diviser', primary: true, onClick: async close => {
        close();
        const n = state.pages.length;
        let groups = [];
        if (mode.value === 'each') groups = state.pages.map((p, i) => ({ label: pad(i + 1, String(n).length), pages: [p] }));
        else if (mode.value === 'every') {
          const k = clampInt(every.value, 1, 500) || 2;
          for (let i = 0; i < n; i += k) groups.push({ label: (i + 1) + '-' + Math.min(n, i + k), pages: state.pages.slice(i, i + k) });
        } else {
          groups = parseRanges(ranges.value, n).map(r => ({ label: r[0] + '-' + r[1], pages: state.pages.slice(r[0] - 1, r[1]) }));
        }
        groups = groups.filter(g => g.pages.length);
        if (!groups.length) { toast('Aucune plage valide : indiquez par exemple 1-3, 5.', 'warn'); return; }
        const base = safeBase(el.filename.value);
        setBusy('Division en ' + plural(groups.length, 'fichier', 'fichiers') + '…', 0);
        try {
          const files = [];
          for (let i = 0; i < groups.length; i++) {
            setBusy('Fichier ' + (i + 1) + '/' + groups.length + '…', i / groups.length);
            const bytes = await buildPdf(groups[i].pages, { noInPlace: true });
            files.push({ name: base + '-' + groups[i].label + '.pdf', bytes });
            await nextFrame();
          }
          if (FEAT.zip && files.length > 1) {
            const zip = new JSZip();
            files.forEach(f => zip.file(f.name, f.bytes));
            const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
            await deliver(blob, base + tr('-divise.zip'), 'application/zip');
          } else {
            for (const f of files) await deliver(f.bytes, f.name);
          }
          setLast(plural(files.length, 'fichier créé', 'fichiers créés'));
        } catch (e) { console.error(e); toast('Échec de la division : ' + e.message, 'error'); }
        finally { setBusy(''); }
      } }],
    });
  }

  function toolResize() {
    const size = select('rs-size', [['A4', 'A4 (210 × 297 mm)'], ['A5', 'A5'], ['A3', 'A3'], ['Letter', 'Letter'], ['Legal', 'Legal']], 'A4');
    const orient = select('rs-or', [['auto', 'Conserver l\'orientation de chaque page'], ['portrait', 'Tout en portrait'], ['paysage', 'Tout en paysage']], 'auto');
    const margin = input('rs-margin', 'number', 0, { min: 0, max: 120 });
    const scope = select('rs-scope', [['all', 'Toutes les pages'], ['sel', 'Pages sélectionnées']], state.selected.size ? 'sel' : 'all');
    dialog({
      title: 'Redimensionner les pages', icon: IC.resize,
      build: b => {
        b.append(rowOf([field('Format cible', size), field('Orientation', orient)]));
        b.append(rowOf([field('Marge (points)', margin), field('Appliquer à', scope)]));
        b.append(note('Le contenu est mis à l\'échelle sans déformation et centré. Le document est remplacé par sa version redimensionnée.'));
      },
      actions: [{ label: 'Annuler', onClick: c => c() }, { label: 'Redimensionner', primary: true, onClick: async close => {
        close();
        const targets = scope.value === 'sel' && state.selected.size ? new Set(selectedInOrder()) : null;
        const m = clampInt(margin.value, 0, 120) || 0;
        setBusy('Redimensionnement…', 0);
        try {
          const out = await PDFLib.PDFDocument.create();
          const docCache = new Map();
          for (let i = 0; i < state.pages.length; i++) {
            const p = state.pages[i];
            const g = pageGeom(p);
            const src = srcById(p.src);
            if (!docCache.has(src.id)) docCache.set(src.id, await sourceDoc(src, false));
            const emb = await out.embedPage(docCache.get(src.id).getPage(p.index));
            let W, H;
            if (targets && !targets.has(p.id)) { W = g.Wd; H = g.Hd; }
            else {
              const dim = PAGE_SIZES[size.value] || PAGE_SIZES.A4;
              const wantLandscape = orient.value === 'paysage' || (orient.value === 'auto' && g.Wd > g.Hd);
              W = wantLandscape ? Math.max(dim[0], dim[1]) : Math.min(dim[0], dim[1]);
              H = wantLandscape ? Math.min(dim[0], dim[1]) : Math.max(dim[0], dim[1]);
            }
            const page = out.addPage([W, H]);
            const avW = Math.max(1, W - 2 * m), avH = Math.max(1, H - 2 * m);
            // embedPage keeps the source rotation, so use the displayed size for the fit
            const s = Math.min(avW / g.Wd, avH / g.Hd);
            const dw = g.Wd * s, dh = g.Hd * s;
            const rot = g.total;
            const box = { x: (W - dw) / 2, y: (H - dh) / 2 };
            const opts = { xScale: s, yScale: s, rotate: PDFLib.degrees(rot) };
            if (rot === 90) { opts.x = box.x + dw; opts.y = box.y; }
            else if (rot === 180) { opts.x = box.x + dw; opts.y = box.y + dh; }
            else if (rot === 270) { opts.x = box.x; opts.y = box.y + dh; }
            else { opts.x = box.x; opts.y = box.y; }
            page.drawPage(emb, opts);
            if (i % 8 === 0) { setBusy('Redimensionnement… ' + (i + 1) + '/' + state.pages.length, i / state.pages.length); await nextFrame(); }
          }
          const bytes = await out.save();
          await replaceProject(bytes, safeBase(el.filename.value) + tr('-redimensionné.pdf'));
          setLast('Pages redimensionnées');
        } catch (e) { console.error(e); toast('Échec du redimensionnement : ' + e.message, 'error'); }
        finally { setBusy(''); }
      } }],
    });
  }

  async function replaceProject(bytes, name) {
    const buf = bytes.buffer ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) : bytes;
    snapshot();
    const keepMeta = state.meta, keepSec = state.security;
    state.sources = []; state.pages = []; state.selected.clear();
    state.watermark = null; state.stamp = null;
    await addPdfSource(name, buf, { silent: true });
    state.meta = keepMeta; state.security = keepSec;
    state.touched = true;
    vue.render();
  }

  // L'aperçu d'un réglage posé sur la page qu'on lit, avant l'export : la vignette de la page, et par-dessus ce que le réglage y écrira
  // (le filigrane, l'en-tête et le pied de page), refait à chaque frappe. La mise en page est celle de l'export — des positions en
  // pourcentage de la page, des tailles en points de la page (unités « cqw » : 1 % de la largeur de la feuille montrée) ; les polices
  // sont des approximations de Helvetica, Times et Courier, pas leur rendu exact.
  const FAMILLES_APERCU = { Helvetica: 'Helvetica, Arial, sans-serif', Times: '"Times New Roman", Times, serif', Courier: '"Courier New", Courier, monospace' };
  function apercuReglage(peindre) {
    const boite = document.createElement('div'); boite.className = 'apercu-reglage';
    const p = state.pages.find(x => x.id === pageCouranteId());
    if (!p) { boite.hidden = true; return { noeud: boite, maj() {} }; }
    const g = pageGeom(p);
    const feuille = document.createElement('div'); feuille.className = 'apercu-feuille';
    feuille.style.aspectRatio = g.Wd.toFixed(2) + ' / ' + g.Hd.toFixed(2);
    const th = thumbs.get(pkey(p));
    // La vignette si elle existe ; sinon la page telle qu'elle est dessinée en lecture (les vignettes ne se font qu'en vue Organiser).
    let image = th && th.status === 'done' ? th.url : '';
    if (!image) {
      const cv = $('#lecture .feuille-vue[data-id="' + p.id + '"] canvas');
      try { if (cv && cv.width > 10) image = cv.toDataURL('image/jpeg', 0.7); } catch (e) { signaler('Aperçu du réglage', e, 'info'); }
    }
    if (image) { const img = document.createElement('img'); img.alt = ''; img.src = image; feuille.appendChild(img); }
    const couche = document.createElement('div'); couche.className = 'apercu-couche'; couche.setAttribute('aria-hidden', 'true'); couche.setAttribute('translate', 'no');
    feuille.appendChild(couche);
    const legende = document.createElement('div'); legende.className = 'apercu-legende';
    legende.textContent = tr('Aperçu sur la page') + ' ' + (pageIndex(p.id) + 1);
    boite.append(feuille, legende);
    const mesure = document.createElement('canvas').getContext('2d');
    // Un texte à la position (x, y) de la page, en points, mesurée depuis le coin haut gauche ; `align` dit de quel côté du texte est x.
    const texte = (t, x, y, o) => {
      const s = document.createElement('span'); s.className = 'apercu-texte'; s.textContent = t;
      s.style.left = (x / g.Wd * 100).toFixed(3) + '%'; s.style.top = (y / g.Hd * 100).toFixed(3) + '%';
      s.style.fontSize = (o.size / g.Wd * 100).toFixed(3) + 'cqw';
      s.style.fontFamily = FAMILLES_APERCU[o.font] || FAMILLES_APERCU.Helvetica;
      s.style.fontWeight = o.bold ? '700' : '400';
      s.style.color = o.color; if (o.opacity != null) s.style.opacity = String(o.opacity);
      const dx = o.align === 'right' ? '-100%' : o.align === 'left' ? '0' : '-50%';
      s.style.transform = 'translate(' + dx + ', ' + (o.centre ? '-50%' : '-100%') + ')' + (o.angle ? ' rotate(' + (-o.angle) + 'deg)' : '');
      couche.appendChild(s);
    };
    const largeur = (t, o) => { mesure.font = (o.bold ? 'bold ' : '') + o.size + 'px ' + (FAMILLES_APERCU[o.font] || FAMILLES_APERCU.Helvetica); return mesure.measureText(t).width; };
    return { noeud: boite, maj() { couche.replaceChildren(); try { peindre({ g, p, texte, largeur }); } catch (e) { signaler('Aperçu du réglage', e, 'info'); } } };
  }
  // Les champs d'un côté, l'aperçu de l'autre.
  function reglageAvecApercu(champs, apercu) {
    const r = document.createElement('div'); r.className = 'reglage-deux';
    champs.classList.add('reglage-champs');
    r.append(champs, apercu.noeud);
    return r;
  }

  // Des configurations nommées : « Brouillon », « Courrier officiel »… Le réglage d'une fenêtre se range sous un nom, se rappelle d'un
  // choix, se supprime. Elles restent sur ce poste, avec les autres mémoires (Préférences › Ce que l'application retient), jamais
  // dans un document. `lire()` rend les valeurs de la fenêtre, `poser(valeurs)` les y remet.
  const CLES_CONFIGS = { filigrane: 'aktum-configs-filigrane', entete: 'aktum-configs-entete', proprietes: 'aktum-configs-proprietes' };
  function configsLire(type) {
    try {
      const l = JSON.parse(localStorage.getItem(CLES_CONFIGS[type]) || '[]');
      return Array.isArray(l) ? l.filter(c => c && typeof c.nom === 'string' && c.nom && c.valeurs && typeof c.valeurs === 'object') : [];
    } catch (e) { signaler('Configurations nommées', e, 'info'); return []; }
  }
  function configsEcrire(type, liste) {
    try { if (liste.length) localStorage.setItem(CLES_CONFIGS[type], JSON.stringify(liste)); else localStorage.removeItem(CLES_CONFIGS[type]); }
    catch (e) { signaler('Configurations nommées', e, 'info'); toast('La configuration n\'a pas pu être gardée sur ce poste.', 'warn'); }
  }
  function selecteurDeConfigs(type, lire, poser) {
    const rang = document.createElement('div'); rang.className = 'configs';
    const choix = document.createElement('select'); choix.id = 'cfg-' + type; choix.setAttribute('aria-label', tr('Configurations enregistrées'));
    const nom = document.createElement('input'); nom.type = 'text'; nom.id = 'cfg-nom-' + type; nom.autocomplete = 'off'; nom.maxLength = 40;
    nom.placeholder = tr('Nom de la configuration'); nom.setAttribute('aria-label', tr('Nom de la configuration'));
    const garder = document.createElement('button'); garder.type = 'button'; garder.className = 'tb-btn'; garder.textContent = tr('Enregistrer');
    const retirer = document.createElement('button'); retirer.type = 'button'; retirer.className = 'tb-btn'; retirer.textContent = tr('Supprimer la configuration');
    const remplir = (choisie) => {
      choix.replaceChildren();
      const premiere = document.createElement('option'); premiere.value = ''; premiere.textContent = configsLire(type).length ? tr('Configurations…') : tr('Aucune configuration enregistrée');
      choix.appendChild(premiere);
      configsLire(type).forEach(c => { const o = document.createElement('option'); o.value = c.nom; o.textContent = c.nom; choix.appendChild(o); });
      choix.value = choisie || '';
      choix.disabled = !configsLire(type).length;
      retirer.disabled = !choix.value;
    };
    choix.addEventListener('change', () => {
      retirer.disabled = !choix.value;
      const c = configsLire(type).find(x => x.nom === choix.value);
      if (c) { nom.value = c.nom; poser(c.valeurs); setLast(tr('Configuration « {0} » reprise.').replace('{0}', c.nom)); }
    });
    garder.addEventListener('click', () => {
      const n = nom.value.trim();
      if (!n) { toast('Donnez un nom à la configuration.', 'warn'); nom.focus(); return; }
      const liste = configsLire(type).filter(x => x.nom.toLowerCase() !== n.toLowerCase());
      liste.push({ nom: n, valeurs: lire() });
      liste.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
      configsEcrire(type, liste.slice(0, 30));
      remplir(n);
      setLast(tr('Configuration « {0} » enregistrée sur ce poste.').replace('{0}', n));
    });
    retirer.addEventListener('click', () => {
      const n = choix.value; if (!n) return;
      configsEcrire(type, configsLire(type).filter(x => x.nom !== n));
      nom.value = '';
      remplir('');
      setLast(tr('Configuration « {0} » supprimée.').replace('{0}', n));
    });
    remplir('');
    rang.append(choix, nom, garder, retirer);
    return groupOf('Configurations', [rang]);
  }
  // Remet une valeur dans un champ, et le dit à ce qui l'écoute (l'aperçu).
  function poserChamp(c, v) {
    if (v == null) return;
    if (c.type === 'checkbox') c.checked = !!v; else c.value = v;
    c.dispatchEvent(new Event('input', { bubbles: true })); c.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Le champ « Pages » des réglages posés sur le document : vide pour toutes les pages, ou une plage « 3-7, 12 » (la même lecture
  // partout : impression, division, sélection). Rend un message si elle n'est pas comprise ou ne désigne rien, sinon rien.
  function champPages(id, valeur) {
    const i = input(id, 'text', valeur || '', { placeholder: tr('Toutes les pages') });
    i.setAttribute('aria-describedby', id + '-aide');
    return i;
  }
  function verdictPages(texte) {
    const t = String(texte || '').trim();
    if (!t) return '';
    const r = lirePlages(t, state.pages.length);
    if (r.ignores.length) return tr('Plage de pages non comprise :') + ' ' + r.ignores.join(', ') + '. ' + tr('Écrivez par exemple 3-7, 12.');
    if (!r.pages.length) return tr('Cette plage ne désigne aucune page.');
    return '';
  }

  function toolWatermark() {
    const origine = { text: tr('CONFIDENTIEL'), font: 'Helvetica', bold: true, size: 60, color: '#FF0000', opacity: 0.18, angle: 45, mode: 'center', pages: '' };
    // Sans filigrane posé, on reprend le dernier réglage appliqué : le même
    // texte, la même teinte, d'un document au suivant.
    const memo = !state.watermark && reglageLire('filigrane');
    const wm = state.watermark || Object.assign({}, origine, memo || {}, memo ? { pages: '' } : {});   // les pages visées ne suivent pas d'un document à l'autre
    const pagesEl = champPages('wm-pages', wm.pages);
    const text = input('wm-text', 'text', wm.text);
    const size = input('wm-size', 'number', wm.size, { min: 6, max: 300 });
    const angle = input('wm-angle', 'number', wm.angle, { min: -180, max: 180 });
    const color = input('wm-color', 'color', wm.color);
    const opacity = input('wm-op', 'range', Math.round(wm.opacity * 100), { min: 3, max: 100, step: 1 });
    const opVal = document.createElement('span'); opVal.className = 'hint'; opVal.textContent = Math.round(wm.opacity * 100) + ' %';
    opacity.addEventListener('input', () => { opVal.textContent = opacity.value + ' %'; });
    const font = select('wm-font', [['Helvetica', 'Helvetica'], ['Times', 'Times'], ['Courier', 'Courier']], wm.font);
    const bold = checkbox('wm-bold', 'Gras', wm.bold);
    const mode = select('wm-mode', [['center', 'Au centre'], ['tile', 'Répété en mosaïque'], ['top', 'En haut'], ['bottom', 'En bas']], wm.mode);
    const apercu = apercuReglage(({ g, p: page, texte, largeur }) => {
      const t = text.value; if (!t) return;
      const visees = pagesVisees(pagesEl.value);
      if (visees && !visees.has(pageIndex(page.id) + 1)) return;
      const o = { size: clampInt(size.value, 6, 300) || 60, font: font.value, bold: bold.input.checked, color: color.value, opacity: (clampInt(opacity.value, 3, 100) || 18) / 100, angle: clampInt(angle.value, -180, 180) || 0, align: 'center', centre: true };
      if (mode.value === 'tile') {
        const stepX = Math.max(120, largeur(t, o) * 1.5), stepY = Math.max(90, o.size * 4);
        for (let y = stepY / 2; y < g.Hd + stepY; y += stepY) for (let x = stepX / 2; x < g.Wd + stepX; x += stepX) texte(t, x, y, o);
      } else texte(t, g.Wd / 2, g.Hd * (mode.value === 'top' ? 0.16 : mode.value === 'bottom' ? 0.86 : 0.5), o);
    });
    [text, size, angle, color, opacity, font, mode, bold.input, pagesEl].forEach(c => { c.addEventListener('input', apercu.maj); c.addEventListener('change', apercu.maj); });
    dialog({
      title: 'Filigrane', icon: IC.water, wide: true,
      build: b => {
        const champs = document.createElement('div'); champs.className = 'reglage-colonne';
        champs.append(selecteurDeConfigs('filigrane',
          () => ({ text: text.value, font: font.value, bold: bold.input.checked, size: size.value, color: color.value, opacity: opacity.value, angle: angle.value, mode: mode.value }),
          v => { poserChamp(text, v.text); poserChamp(font, v.font); poserChamp(bold.input, v.bold); poserChamp(size, v.size); poserChamp(color, v.color); poserChamp(opacity, v.opacity); poserChamp(angle, v.angle); poserChamp(mode, v.mode); opVal.textContent = opacity.value + ' %'; }));
        champs.append(field('Texte', text));
        champs.append(rowOf([field('Police', font), field('Taille', size), field('Angle (°)', angle)]));
        const cw = field('Couleur', color);
        const ow = field('Opacité', opacity); ow.appendChild(opVal);
        champs.append(rowOf([cw, ow, field('Disposition', mode)]));
        champs.append(bold);
        champs.append(field('Pages', pagesEl, 'Toutes les pages, ou une plage : 3-7, 12.'));
        champs.append(note('Le filigrane est dessiné par-dessus le contenu, sur toutes les pages, au moment de l\'export.'
          + (memo ? ' Réglage repris du dernier filigrane appliqué.' : '')));
        b.append(reglageAvecApercu(champs, apercu));
        apercu.maj();
      },
      actions: [
        memo ? { label: 'Réglages d\'origine', onClick: close => { reglageEcrire('filigrane', null); close(); toolWatermark(); } } : null,
        state.watermark ? { label: 'Retirer', onClick: close => { snapshot(); state.watermark = null; vue.render(); close(); setLast('Filigrane retiré'); } } : null,
        { label: 'Annuler', onClick: c => c() },
        { label: 'Appliquer', primary: true, onClick: close => {
          if (!text.value.trim()) { toast('Indiquez le texte du filigrane.', 'warn'); return; }
          const refus = verdictPages(pagesEl.value);
          if (refus) { toast(refus, 'warn'); return; }
          snapshot();
          state.watermark = {
            text: text.value, font: font.value, bold: bold.input.checked,
            size: clampInt(size.value, 6, 300) || 60, color: color.value,
            opacity: (clampInt(opacity.value, 3, 100) || 18) / 100,
            angle: clampInt(angle.value, -180, 180) || 0, mode: mode.value, pages: pagesEl.value.trim(),
          };
          reglageEcrire('filigrane', state.watermark);
          state.touched = true; vue.render(); close();
          setLast('Filigrane « ' + state.watermark.text + ' » appliqué');
        } },
      ].filter(Boolean),
    });
  }

  function toolStamp(preset) {
    const cleMemo = preset === 'number' ? 'numerotation' : 'entete';
    const origine = {
      headerLeft: '', headerCenter: '', headerRight: '', footerLeft: '', footerCenter: '', footerRight: '',
      font: 'Helvetica', bold: false, size: 9, color: '#444444', margin: 28, start: 1, skipFirst: false, batesPrefix: '', batesDigits: 4, pages: '',
    };
    if (preset === 'number') origine.footerCenter = '{p} / {n}';
    // Sans réglage posé sur ce document, on reprend le dernier appliqué (le texte
    // d'en-tête de la commune, la forme de numérotation), mais jamais le premier
    // numéro : chaque document recommence à 1.
    const memo = !state.stamp && reglageLire(cleMemo);
    const st = state.stamp || Object.assign({}, origine, memo || {}, memo ? { start: 1, pages: '' } : {});
    const pagesEl = champPages('st-pages', st.pages);
    const mk = (id, v) => input(id, 'text', v);
    const hl = mk('st-hl', st.headerLeft), hc = mk('st-hc', st.headerCenter), hr = mk('st-hr', st.headerRight);
    const fl = mk('st-fl', st.footerLeft), fc = mk('st-fc', st.footerCenter), fr = mk('st-fr', st.footerRight);
    const font = select('st-font', [['Helvetica', 'Helvetica'], ['Times', 'Times'], ['Courier', 'Courier']], st.font);
    const size = input('st-size', 'number', st.size, { min: 5, max: 40 });
    const color = input('st-color', 'color', st.color);
    const margin = input('st-margin', 'number', st.margin, { min: 6, max: 120 });
    const start = input('st-start', 'number', st.start, { min: 0, max: 99999 });
    const skip = checkbox('st-skip', 'Ne rien afficher sur la première page', st.skipFirst);
    const bpre = input('st-bpre', 'text', st.batesPrefix);
    const bdig = input('st-bdig', 'number', st.batesDigits, { min: 1, max: 10 });
    const apercu = apercuReglage(({ g, p: page, texte }) => {
      const i = pageIndex(page.id);
      if (skip.input.checked && i === 0) return;
      const visees = pagesVisees(pagesEl.value);
      if (visees && !visees.has(i + 1)) return;
      const taille = clampInt(size.value, 5, 40) || 9, m = clampInt(margin.value, 6, 120) || 28;
      const num = (clampInt(start.value, 0, 99999) || 1) + i;
      const ctx = { i, p: num, n: state.pages.length, date: todayStr(), file: safeBase(el.filename.value), bates: (bpre.value || '') + pad(num, clampInt(bdig.value, 1, 10) || 4) };
      const o = { size: taille, font: font.value, bold: st.bold, color: color.value };
      [[hl, m, m + taille, 'left'], [hc, g.Wd / 2, m + taille, 'center'], [hr, g.Wd - m, m + taille, 'right'],
        [fl, m, g.Hd - m, 'left'], [fc, g.Wd / 2, g.Hd - m, 'center'], [fr, g.Wd - m, g.Hd - m, 'right']].forEach(([champ, x, y, align]) => {
        const t = stampText(champ.value, ctx);
        if (t) texte(t, x, y, Object.assign({ align }, o));
      });
    });
    [hl, hc, hr, fl, fc, fr, font, size, color, margin, start, bpre, bdig, skip.input, pagesEl].forEach(c => { c.addEventListener('input', apercu.maj); c.addEventListener('change', apercu.maj); });
    dialog({
      title: preset === 'number' ? 'Numéroter les pages' : 'En-tête et pied de page', icon: IC.header, wide: true,
      build: b => {
        const champs = document.createElement('div'); champs.className = 'reglage-colonne';
        champs.append(selecteurDeConfigs('entete',
          () => ({ hl: hl.value, hc: hc.value, hr: hr.value, fl: fl.value, fc: fc.value, fr: fr.value, font: font.value, size: size.value, color: color.value, margin: margin.value, bpre: bpre.value, bdig: bdig.value, skip: skip.input.checked }),
          v => { [[hl, v.hl], [hc, v.hc], [hr, v.hr], [fl, v.fl], [fc, v.fc], [fr, v.fr], [font, v.font], [size, v.size], [color, v.color], [margin, v.margin], [bpre, v.bpre], [bdig, v.bdig], [skip.input, v.skip]].forEach(([c, x]) => poserChamp(c, x)); }));
        champs.append(groupOf('En-tête', [rowOf([field('Gauche', hl), field('Centre', hc), field('Droite', hr)])]));
        champs.append(groupOf('Pied de page', [rowOf([field('Gauche', fl), field('Centre', fc), field('Droite', fr)])]));
        champs.append(rowOf([field('Police', font), field('Taille', size), field('Couleur', color), field('Marge (pt)', margin)], true));
        champs.append(rowOf([field('Premier numéro', start), field('Préfixe Bates', bpre, 'Pour {bates}'), field('Chiffres Bates', bdig)], true));
        champs.append(skip);
        champs.append(field('Pages', pagesEl, 'Toutes les pages, ou une plage : 3-7, 12. Le premier numéro suit la place de la page dans le document.'));
        champs.append(note('Codes disponibles : {p} numéro de page, {n} nombre de pages, {date} date du jour, {file} nom du fichier, {bates} numérotation Bates.'
          + (memo ? ' Réglage repris du dernier appliqué.' : '')));
        b.append(reglageAvecApercu(champs, apercu));
        apercu.maj();
      },
      actions: [
        memo ? { label: 'Réglages d\'origine', onClick: close => { reglageEcrire(cleMemo, null); close(); toolStamp(preset); } } : null,
        state.stamp ? { label: 'Retirer', onClick: close => { snapshot(); state.stamp = null; vue.render(); close(); setLast('En-tête et pied de page retirés'); } } : null,
        { label: 'Annuler', onClick: c => c() },
        { label: 'Appliquer', primary: true, onClick: close => {
          const next = {
            headerLeft: hl.value, headerCenter: hc.value, headerRight: hr.value,
            footerLeft: fl.value, footerCenter: fc.value, footerRight: fr.value,
            font: font.value, bold: st.bold, size: clampInt(size.value, 5, 40) || 9, color: color.value,
            margin: clampInt(margin.value, 6, 120) || 28, start: clampInt(start.value, 0, 99999) || 1,
            skipFirst: skip.input.checked, batesPrefix: bpre.value, batesDigits: clampInt(bdig.value, 1, 10) || 4,
          };
          const any = ['headerLeft', 'headerCenter', 'headerRight', 'footerLeft', 'footerCenter', 'footerRight'].some(k => next[k].trim());
          if (!any) { toast('Renseignez au moins une zone.', 'warn'); return; }
          const refus = verdictPages(pagesEl.value);
          if (refus) { toast(refus, 'warn'); return; }
          next.pages = pagesEl.value.trim();
          snapshot();
          reglageEcrire(cleMemo, next);
          state.stamp = next; state.touched = true; vue.render(); close();
          setLast('En-tête et pied de page appliqués');
        } },
      ].filter(Boolean),
    });
  }

  function toolProperties() {
    const t = input('pr-title', 'text', state.meta.title);
    const a = input('pr-author', 'text', state.meta.author);
    const s = input('pr-subject', 'text', state.meta.subject);
    const k = input('pr-keywords', 'text', state.meta.keywords);
    const langue = select('pr-langue', BALISAGE_LANGUES, state.meta.langue || codeLangue());
    const balise = checkbox('pr-balise', 'Balisage d\'accessibilité (PDF balisé pour les lecteurs d\'écran)', !!state.meta.balise);
    dialog({
      title: 'Propriétés du document', icon: IC.info,
      build: b => {
        b.append(selecteurDeConfigs('proprietes',
          () => ({ auteur: a.value, sujet: s.value, mots: k.value, langue: langue.value, balise: balise.input.checked }),
          v => { poserChamp(a, v.auteur); poserChamp(s, v.sujet); poserChamp(k, v.mots); poserChamp(langue, v.langue); poserChamp(balise.input, v.balise); }));
        b.append(field('Titre', t, 'Affiché dans la barre de la fenêtre ; indispensable à l\'accessibilité.'));
        b.append(rowOf([field('Auteur', a), field('Sujet', s)]));
        b.append(field('Mots-clés', k, 'Séparés par des virgules.'));
        b.append(groupOf('Accessibilité', [
          rowOf([field('Langue du document', langue)], true),
          balise,
          note('Le balisage décrit au lecteur d\'écran la structure du document : le sommaire et les intercalaires d\'un dossier sont de vrais titres et une vraie table des matières ; les numérotations et filigranes sont écartés de la lecture ; chaque page venue d\'un autre fichier forme un bloc, lu dans l\'ordre du fichier d\'origine. Les titres, listes et tableaux de ces pages ne sont pas devinés, et les liens, annotations et champs de formulaire ne sont pas balisés : ce n\'est pas un PDF/UA.'),
        ]));
        const dl = document.createElement('dl'); dl.className = 'kv';
        const rows = [['Pages', state.pages.length], ['Documents ouverts', state.sources.length],
          ['Poids des sources', fmtSize(state.sources.reduce((x, y) => x + y.bytes.byteLength, 0))],
          ['Annotations', state.pages.reduce((x, p) => x + p.ann.length, 0)],
          ['Producteur', APP]];
        rows.forEach(r => { const dt = document.createElement('dt'); dt.textContent = r[0]; const dd = document.createElement('dd'); dd.textContent = r[1]; dl.append(dt, dd); });
        b.append(groupOf('Informations', [dl]));
      },
      actions: [{ label: 'Annuler', onClick: c => c() }, { label: 'Enregistrer', primary: true, onClick: close => {
        snapshot();
        state.meta = { title: t.value.trim(), author: a.value.trim(), subject: s.value.trim(), keywords: k.value.trim(), balise: balise.input.checked, langue: langue.value };
        state.touched = true; vue.render(); close();
        setLast('Propriétés enregistrées');
      } }],
    });
  }

  function toolPassword() {
    if (!FEAT.encrypt) {
      dialog({ title: 'Protection par mot de passe', icon: IC.lock, build: b => b.append(note(EN_LIGNE
        ? 'Le composant de chiffrement n\'a pas pu être chargé. Rechargez la page avec une connexion internet active pour activer cette fonction.'
        : 'Le composant de chiffrement est absent de cette copie du logiciel, qui est incomplète. Retéléchargez-la depuis l\'adresse où vous l\'avez obtenue.', 'warn')) });
      return;
    }
    const sec = state.security || { userPassword: '', ownerPassword: '', permissions: { printing: 'highResolution', copying: true, modifying: false, annotating: true, fillingForms: true, documentAssembly: false, contentAccessibility: true } };
    const up = input('se-up', 'password', sec.userPassword);
    const op = input('se-op', 'password', sec.ownerPassword);
    const perms = [
      ['printing', 'Autoriser l\'impression'],
      ['copying', 'Autoriser la copie de texte'],
      ['modifying', 'Autoriser la modification du contenu'],
      ['annotating', 'Autoriser les annotations'],
      ['fillingForms', 'Autoriser le remplissage des formulaires'],
      ['documentAssembly', 'Autoriser la réorganisation des pages'],
    ].map(p => checkbox('se-' + p[0], p[1], p[0] === 'printing' ? sec.permissions.printing !== false : !!sec.permissions[p[0]]));
    dialog({
      title: 'Protection par mot de passe', icon: IC.lock,
      build: b => {
        b.append(field('Mot de passe d\'ouverture', up, 'Demandé pour ouvrir le document. Laissez vide pour n\'imposer que des autorisations.'));
        b.append(field('Mot de passe propriétaire', op, 'Permet de lever les restrictions. Laissez vide pour reprendre celui d\'ouverture.'));
        b.append(groupOf('Autorisations', perms));
        b.append(note('Chiffrement AES-256, appliqué au moment de l\'export. Conservez le mot de passe : il est impossible de le retrouver.'));
      },
      actions: [
        state.security ? { label: 'Retirer', onClick: close => { snapshot(); state.security = null; vue.render(); close(); setLast('Protection retirée'); } } : null,
        { label: 'Annuler', onClick: c => c() },
        { label: 'Appliquer', primary: true, onClick: close => {
          if (!up.value && !op.value) { toast('Indiquez au moins un mot de passe.', 'warn'); return; }
          const permissions = {};
          perms.forEach((w, i) => {
            const keyName = ['printing', 'copying', 'modifying', 'annotating', 'fillingForms', 'documentAssembly'][i];
            permissions[keyName] = keyName === 'printing' ? (w.input.checked ? 'highResolution' : false) : w.input.checked;
          });
          permissions.contentAccessibility = true;
          snapshot();
          state.security = { userPassword: up.value, ownerPassword: op.value || up.value, permissions };
          state.touched = true; vue.render(); close();
          setLast('Protection par mot de passe activée');
        } },
      ].filter(Boolean),
    });
  }

  function toolFlatten() {
    const flat = checkbox('fl-flat', 'Aplatir les champs de formulaire à l\'export', state.flatten);
    const figer = checkbox('fl-annots', 'Figer aussi les annotations dans la page (surlignages, cadres, dessins, textes, tampons)', state.figerAnnotations);
    dialog({
      title: 'Aplatir le document', icon: IC.flat,
      build: b => {
        b.append(flat);
        b.append(note('Les champs de formulaire deviennent du contenu fixe : les valeurs restent visibles mais ne sont plus modifiables.'));
        b.append(figer);
        b.append(note('Par défaut, les annotations partent comme de vrais commentaires PDF : dans Acrobat ou un navigateur, le destinataire les voit, peut les déplacer, les modifier ou les retirer. Figées, elles font partie de la page comme de l\'encre. Les corrections de texte, les images, les signatures et les caviardages sont toujours fondus dans la page ; une page caviardée garde son texte net, seules les lettres masquées et, s\'il y a lieu, l\'image sous le rectangle sont refaites.'));
      },
      actions: [{ label: 'Annuler', onClick: c => c() }, { label: 'Appliquer', primary: true, onClick: close => {
        snapshot(); state.flatten = flat.input.checked; state.figerAnnotations = figer.input.checked; state.touched = true; vue.render(); close();
        setLast((state.flatten ? 'Champs aplatis à l\'export' : 'Champs conservés') + ' · annotations ' + (state.figerAnnotations ? 'figées' : 'modifiables'));
      } }],
    });
  }

  function toolForm() {
    const withFields = state.sources.filter(s => s.formFields && s.formFields.length);
    if (!withFields.length) {
      dialog({ title: 'Formulaire', icon: IC.form, build: b => b.append(note('Aucun champ de formulaire n\'a été trouvé dans les documents ouverts. Vous pouvez ajouter du texte avec l\'éditeur de page.')) });
      return;
    }
    let current = withFields[0];
    const picker = select('fm-doc', withFields.map(s => [s.id, s.name]), current.id);
    const list = document.createElement('div'); list.className = 'list';
    const inputs = new Map();
    function build() {
      list.replaceChildren();
      inputs.clear();
      const vals = current.formValues || {};
      current.formFields.forEach((f, i) => {
        const row = document.createElement('div'); row.className = 'list-item';
        const g = document.createElement('div'); g.className = 'g';
        const n = document.createElement('div'); n.className = 'n'; n.textContent = f.name;
        const s = document.createElement('div'); s.className = 's';
        s.textContent = { text: 'Texte', check: 'Case à cocher', dropdown: 'Liste déroulante', radio: 'Choix', list: 'Liste', button: 'Bouton', signature: 'Signature' }[f.kind] || 'Champ';
        g.append(n, s);
        const cur = vals[f.name] !== undefined ? vals[f.name] : f.value;
        let ctrl;
        if (f.kind === 'check') { const c = checkbox('fm-f' + i, '', !!cur); ctrl = c; inputs.set(f.name, () => c.input.checked); }
        else if ((f.kind === 'dropdown' || f.kind === 'radio' || f.kind === 'list') && f.options && f.options.length) {
          const sel = select('fm-f' + i, [['', '—']].concat(f.options.map(o => [o, o])), cur);
          sel.style.maxWidth = '190px';
          ctrl = sel; inputs.set(f.name, () => sel.value);
        } else if (f.kind === 'button' || f.kind === 'signature') { ctrl = document.createElement('span'); ctrl.className = 's'; ctrl.textContent = 'non modifiable'; }
        else { const t = input('fm-f' + i, 'text', cur == null ? '' : cur); t.style.maxWidth = '190px'; ctrl = t; inputs.set(f.name, () => t.value); }
        row.append(g, ctrl);
        list.appendChild(row);
      });
    }
    build();
    picker.addEventListener('change', () => { current = withFields.find(s => String(s.id) === picker.value); build(); });
    const flat = checkbox('fm-flat', 'Aplatir après remplissage (valeurs non modifiables)', state.flatten);
    dialog({
      title: 'Remplir le formulaire', icon: IC.form, wide: true,
      build: b => {
        if (withFields.length > 1) b.append(field('Document', picker));
        b.append(list);
        b.append(flat);
        b.append(note('Si les pages sont réorganisées ou fusionnées, les champs sont aplatis automatiquement pour conserver les valeurs saisies.'));
      },
      actions: [{ label: 'Annuler', onClick: c => c() }, { label: 'Enregistrer', primary: true, onClick: close => {
        snapshot();
        const vals = {};
        inputs.forEach((get, name) => { vals[name] = get(); });
        current.formValues = vals;
        state.flatten = flat.input.checked;
        state.touched = true; vue.render(); close();
        setLast('Formulaire rempli : ' + plural(Object.keys(vals).length, 'champ', 'champs'));
      } }],
    });
  }

  function toolExportImages() {
    const fmt = segmented('ei-fmt', [['png', 'PNG'], ['jpeg', 'JPEG']], 'png');
    const dpi = select('ei-dpi', [['72', '72 ppp (écran)'], ['150', '150 ppp'], ['300', '300 ppp (impression)']], '150');
    const scope = select('ei-scope', [['all', 'Toutes les pages'], ['sel', 'Pages sélectionnées']], state.selected.size ? 'sel' : 'all');
    dialog({
      title: 'Exporter en images', icon: IC.image,
      build: b => {
        b.append(rowOf([field('Format', fmt), field('Résolution', dpi)]));
        b.append(field('Pages', scope));
        b.append(note(FEAT.zip ? 'Plusieurs pages sont réunies dans une archive ZIP.' : 'Archive ZIP indisponible : les images seront enregistrées une par une.', FEAT.zip ? null : 'warn'));
      },
      actions: [{ label: 'Annuler', onClick: c => c() }, { label: 'Exporter', primary: true, onClick: async close => {
        close();
        const pages = scope.value === 'sel' && state.selected.size ? selectedPages() : state.pages;
        const base = safeBase(el.filename.value);
        const ext = fmt.value === 'png' ? 'png' : 'jpg';
        setBusy('Rendu des images…', 0);
        try {
          const files = [];
          for (let i = 0; i < pages.length; i++) {
            setBusy('Page ' + (i + 1) + '/' + pages.length + '…', i / pages.length);
            const { canvas } = await rasterizePage(pages[i], +dpi.value);
            const blob = await new Promise(r => canvas.toBlob(r, fmt.value === 'png' ? 'image/png' : 'image/jpeg', 0.92));
            files.push({ name: base + '-' + pad(i + 1, String(pages.length).length) + '.' + ext, blob });
            await nextFrame();
          }
          if (files.length === 1) await deliver(files[0].blob, files[0].name, files[0].blob.type);
          else if (FEAT.zip) {
            const zip = new JSZip();
            files.forEach(f => zip.file(f.name, f.blob));
            const out = await zip.generateAsync({ type: 'blob' });
            await deliver(out, base + tr('-images.zip'), 'application/zip');
          } else { for (const f of files) await deliver(f.blob, f.name, f.blob.type); }
          setLast(plural(files.length, 'image exportée', 'images exportées'));
        } catch (e) { console.error(e); toast('Échec de l\'export : ' + e.message, 'error'); }
        finally { setBusy(''); }
      } }],
    });
  }

  async function toolExportText() {
    setBusy('Extraction du texte…', 0);
    try {
      const parts = [];
      for (let i = 0; i < state.pages.length; i++) {
        setBusy('Page ' + (i + 1) + '/' + state.pages.length + '…', i / state.pages.length);
        const t = await getPageText(state.pages[i]);
        parts.push(tr('--- Page ' + (i + 1) + ' ---\n') + (t || tr('(aucun texte)')));
      }
      const txt = parts.join('\n\n');
      const empty = parts.every(p => /\(aucun texte\)/.test(p));
      await deliver(txt, safeBase(el.filename.value) + '.txt', 'text/plain');
      if (empty) toast('Aucun texte n\'a été trouvé : le document est probablement un scan. La reconnaissance de texte n\'est pas disponible ici.', 'warn');
    } catch (e) { console.error(e); toast('Échec de l\'extraction : ' + e.message, 'error'); }
    finally { setBusy(''); }
  }

  function toolCompress() {
    const dpi = select('cp-dpi', [['96', 'Écran — 96 ppp'], ['150', 'Équilibré — 150 ppp'], ['200', 'Qualité — 200 ppp']], '150');
    const q = input('cp-q', 'range', 72, { min: 30, max: 95, step: 1 });
    const qv = document.createElement('span'); qv.className = 'hint'; qv.textContent = '72 %';
    q.addEventListener('input', () => { qv.textContent = q.value + ' %'; });
    dialog({
      title: 'Réduire la taille du fichier', icon: IC.zap,
      build: b => {
        b.append(rowOf([field('Résolution', dpi), (() => { const f = field('Qualité des images', q); f.appendChild(qv); return f; })()]));
        b.append(note('Chaque page est convertie en image : le fichier devient plus léger mais le texte n\'est plus sélectionnable. Le document ouvert n\'est pas modifié.'));
      },
      actions: [{ label: 'Annuler', onClick: c => c() }, { label: 'Réduire et exporter', primary: true, onClick: async close => {
        close();
        const before = proprSources(state.pages).reduce((a, s) => a + s.bytes.byteLength, 0);
        // Mesuré avant d'écrire : un fichier « réduit » qui serait plus gros que
        // l'original n'est jamais livré. Convertir en images un document de
        // texte le multipliait par quarante, et le texte n'était plus sélectionnable.
        const refus = bytes => bytes.length >= before
          ? 'La réduction aurait alourdi le fichier : ' + fmtSize(before) + ' → ' + fmtSize(bytes.length) + '. Elle convertit chaque page en image ; elle ne sert qu\'aux documents scannés ou riches en images. Rien n\'a été enregistré.'
          : null;
        const bytes = await exportPages(state.pages, safeBase(el.filename.value) + tr('-leger.pdf'), { rasterize: true, dpi: +dpi.value, quality: (clampInt(q.value, 30, 95) || 72) / 100, noInPlace: true, refuserSi: refus });
        if (bytes) {
          const after = bytes.length;
          const pct = before ? Math.round((1 - after / before) * 100) : 0;
          toast('Taille : ' + fmtSize(before) + ' → ' + fmtSize(after) + (pct > 0 ? ' (−' + pct + ' %)' : ''));
        }
      } }],
    });
  }

