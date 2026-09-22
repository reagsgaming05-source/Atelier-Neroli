  // =====================================================================
  //  Signets : le plan du document
  //  -------------------------------------------------------------------
  //  Les signets d'un PDF ouvert deviennent les nôtres ; on en ajoute, on
  //  les renomme, on les retire ; ils repartent dans le PDF exporté, où
  //  Acrobat et les autres visionneuses les montrent dans leur volet.
  // =====================================================================
  async function lireSignets(src, pagesDeSrc) {
    let plan = [];
    try { plan = await src.pdfjs.getOutline(); } catch (_) { plan = null; }
    if (!plan || !plan.length) return [];
    const doc = src.pdfjs;
    const indexDe = async dest => {
      try {
        let d = dest;
        if (typeof d === 'string') d = await doc.getDestination(d);
        if (!Array.isArray(d) || !d.length) return -1;
        if (typeof d[0] === 'number') return d[0];
        return await doc.getPageIndex(d[0]);
      } catch (_) { return -1; }
    };
    let compte = 0;
    const conv = async (items, prof) => {
      const out = [];
      for (const it of items) {
        if (++compte > 800) break;
        const i = await indexDe(it.dest);
        const enfants = prof < 8 && it.items && it.items.length ? await conv(it.items, prof + 1) : [];
        const page = i >= 0 && pagesDeSrc[i] ? pagesDeSrc[i].id : null;
        if (page != null) out.push({ id: ++uid, titre: String(it.title || '').replace(/\s+/g, ' ').trim() || 'Sans titre', page, enfants });
        else out.push(...enfants);
      }
      return out;
    };
    return conv(plan, 0);
  }
  // Un signet dont la page a disparu s'efface ; ses sous-signets remontent.
  function purgerSignets() {
    const vivantes = new Set(state.pages.map(p => p.id));
    const filtre = liste => {
      const r = [];
      (liste || []).forEach(s => {
        const enf = filtre(s.enfants);
        if (vivantes.has(s.page)) { s.enfants = enf; r.push(s); } else r.push(...enf);
      });
      return r;
    };
    state.signets = filtre(state.signets);
  }
  function signetsPlats(liste, prof, out) {
    (liste || []).forEach(s => { out.push({ s, prof }); signetsPlats(s.enfants, prof + 1, out); });
    return out;
  }
  function trouverSignet(id, liste) {
    for (const s of liste || []) { if (s.id === id) return s; const t = trouverSignet(id, s.enfants); if (t) return t; }
    return null;
  }
  let signetActif = null;
  function renderSignets() {
    if (!el.signets) return;
    el.signets.replaceChildren();
    const plats = signetsPlats(state.signets, 0, []);
    el.signetsVide.hidden = plats.length > 0;
    el.signetCount.textContent = plats.length;
    el.btnSignet.disabled = !state.pages.length;
    plats.forEach(({ s, prof }) => {
      const li = document.createElement('li'); li.className = 'signet';
      li.style.paddingLeft = (prof * 14) + 'px';
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sg' + (signetActif === s.id ? ' actif' : '');
      b.dataset.signet = s.id;
      b.title = 'Aller à la page ' + (pageIndex(s.page) + 1) + ' · double-clic pour renommer';
      const t = document.createElement('span'); t.className = 't'; t.textContent = s.titre;
      const pn = document.createElement('span'); pn.className = 'p'; pn.textContent = 'p. ' + (pageIndex(s.page) + 1);
      b.append(t, pn);
      b.addEventListener('click', () => { signetActif = s.id; allerPage(s.page); renderSignets(); });
      b.addEventListener('dblclick', () => renommerSignet(s));
      const x = document.createElement('button');
      x.type = 'button'; x.className = 'sg-x'; x.title = 'Retirer ce signet';
      x.setAttribute('aria-label', x.title);
      x.appendChild(icon(IC.x, { sw: 1.8 }));
      x.addEventListener('click', e => { e.stopPropagation(); retirerSignet(s.id); });
      li.append(b, x);
      el.signets.appendChild(li);
    });
  }
  function allerPage(pageId) {
    const i = pageIndex(pageId);
    if (i < 0) return;
    if (state.vue === 'lecture') { lectureAller(i + 1); return; }
    state.selected.clear(); state.selected.add(pageId); state.anchor = pageId;
    updateSelectionUI();
    const t = tiles.get(pageId);
    if (t) t.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  // La page « courante » : celle qu'on lit, ou la première sélectionnée.
  function pageCouranteId() {
    if (!state.pages.length) return null;
    if (state.vue === 'lecture') {
      const n = clampInt(el.pageNum.value, 1, state.pages.length) || 1;
      return state.pages[n - 1].id;
    }
    const sel = selectedInOrder();
    return sel.length ? sel[0] : state.pages[0].id;
  }
  function retirerSignet(id) {
    snapshot();
    const filtre = liste => (liste || []).filter(s => { if (s.id === id) return false; s.enfants = filtre(s.enfants); return true; });
    state.signets = filtre(state.signets);
    state.touched = true;
    if (signetActif === id) signetActif = null;
    renderSignets();
    setLast('Signet retiré · Ctrl+Z pour annuler');
  }
  // Un signet se range à sa place dans l'ordre des pages.
  function insererSignet(liste, s) {
    const i = liste.findIndex(x => pageIndex(x.page) > pageIndex(s.page));
    if (i < 0) liste.push(s); else liste.splice(i, 0, s);
  }
  async function ajouterSignet(pageId, titreVoulu) {
    const pid = pageId != null ? pageId : pageCouranteId();
    if (pid == null) return;
    const p = state.pages.find(x => x.id === pid);
    if (!p) return;
    let defaut = titreVoulu || '';
    if (!defaut) {
      try {
        const t = await getPageText(p);
        defaut = (t.split('\n').map(l => l.trim()).find(l => l.length >= 3) || '').slice(0, 70);
      } catch (_) {}
    }
    const titre = input('sg-titre', 'text', defaut || ('Page ' + (pageIndex(pid) + 1)));
    const parent = signetActif != null ? trouverSignet(signetActif, state.signets) : null;
    const sous = parent ? checkbox('sg-sous', 'Placer sous « ' + parent.titre.slice(0, 40) + ' »', false) : null;
    dialog({
      title: 'Ajouter un signet', icon: IC.signet,
      build: b => {
        b.append(field('Titre', titre, 'Pour la page ' + (pageIndex(pid) + 1) + '. Les signets sont enregistrés dans le PDF exporté.'));
        if (sous) b.append(sous);
      },
      actions: [{ label: 'Annuler', onClick: c => c() }, { label: 'Ajouter', primary: true, onClick: close => {
        const t = titre.value.trim();
        if (!t) { toast('Donnez un titre au signet.', 'warn'); return; }
        snapshot();
        const s = { id: ++uid, titre: t, page: pid, enfants: [] };
        if (sous && sous.input.checked) insererSignet(parent.enfants, s);
        else insererSignet(state.signets, s);
        signetActif = s.id; state.touched = true;
        close();
        renderSignets();
        setLast('Signet ajouté : ' + t);
      } }],
    });
  }
  function renommerSignet(s) {
    const titre = input('sg-titre', 'text', s.titre);
    dialog({
      title: 'Renommer le signet', icon: IC.signet,
      build: b => b.append(field('Titre', titre)),
      actions: [{ label: 'Annuler', onClick: c => c() }, { label: 'Renommer', primary: true, onClick: close => {
        const t = titre.value.trim();
        if (!t) return;
        snapshot(); s.titre = t; state.touched = true;
        close(); renderSignets();
      } }],
    });
  }
  // Les signets écrits dans le PDF : un arbre d'objets Outline, comme le
  // décrit la norme, chacun visant sa page.
  function poserSignets(out, mapped, signets) {
    const { PDFName, PDFHexString, PDFNumber } = PDFLib;
    const ctx = out.context;
    const refDe = new Map();
    mapped.forEach(({ p, page }) => refDe.set(p.id, page.ref));
    const filtre = liste => {
      const r = [];
      (liste || []).forEach(s => {
        const enf = filtre(s.enfants);
        if (refDe.has(s.page)) r.push({ titre: s.titre, ref: refDe.get(s.page), enfants: enf });
        else r.push(...enf);
      });
      return r;
    };
    const arbre = filtre(signets);
    try { out.catalog.delete(PDFName.of('Outlines')); } catch (_) {}
    if (!arbre.length) return 0;
    const compter = l => l.reduce((n, s) => n + 1 + compter(s.enfants), 0);
    const construire = (liste, parent) => {
      const refs = liste.map(() => ctx.nextRef());
      liste.forEach((s, i) => {
        const d = ctx.obj({ Title: PDFHexString.fromText(s.titre), Parent: parent, Dest: [s.ref, 'Fit'] });
        if (i > 0) d.set(PDFName.of('Prev'), refs[i - 1]);
        if (i < liste.length - 1) d.set(PDFName.of('Next'), refs[i + 1]);
        if (s.enfants.length) {
          const [f, l] = construire(s.enfants, refs[i]);
          d.set(PDFName.of('First'), f); d.set(PDFName.of('Last'), l);
          d.set(PDFName.of('Count'), PDFNumber.of(compter(s.enfants)));
        }
        ctx.assign(refs[i], d);
      });
      return [refs[0], refs[refs.length - 1]];
    };
    const racine = ctx.nextRef();
    const [f, l] = construire(arbre, racine);
    ctx.assign(racine, ctx.obj({ Type: 'Outlines', First: f, Last: l, Count: PDFNumber.of(compter(arbre)) }));
    out.catalog.set(PDFName.of('Outlines'), racine);
    out.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
    return compter(arbre);
  }

