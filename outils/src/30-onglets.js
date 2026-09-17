  // =====================================================================
  //  Onglets : plusieurs documents dans une même fenêtre
  //  -------------------------------------------------------------------
  //  Chaque onglet a son document, son historique, son nom de fichier ;
  //  une page glissée sur un autre onglet y déménage.
  // =====================================================================
  const onglets = [];
  let ongletActif = null;
  const ongletCourant = () => onglets.find(o => o.id === ongletActif) || null;
  function titreEtat(e) {
    const srcs = (e.sources || []).filter(s => !s.genere);
    if (!srcs.length) return 'Nouveau document';
    const nom = baseName(srcs[0].name);
    return srcs.length > 1 ? nom + ' +' + (srcs.length - 1) : nom;
  }
  function renderOnglets() {
    if (!el.onglets) return;
    const montrer = onglets.length > 1 || state.pages.length > 0;
    el.onglets.hidden = !montrer;
    el.onglets.replaceChildren();
    if (!montrer) return;
    onglets.forEach(o => {
      const e = o.id === ongletActif ? prendreEtat() : o.etat;
      const t = document.createElement('div');
      t.className = 'onglet'; t.setAttribute('role', 'tab');
      // Un seul onglet est atteignable par Tab ; les flèches font le reste.
      t.tabIndex = o.id === ongletActif ? 0 : -1;
      t.dataset.onglet = o.id;
      t.setAttribute('aria-selected', o.id === ongletActif ? 'true' : 'false');
      const titre = titreEtat(e);
      const modifie = !!(e.touched && e.pages.length);
      t.title = titre + (modifie ? ' · modifié' : '');
      const sp = document.createElement('span'); sp.className = 't'; sp.textContent = titre;
      t.appendChild(sp);
      if (modifie) { const m = document.createElement('span'); m.className = 'mod'; m.textContent = '\u2022'; m.title = 'Modifié'; t.appendChild(m); }
      const x = document.createElement('button');
      x.type = 'button'; x.className = 'x'; x.title = 'Fermer cet onglet (Ctrl+W)'; x.setAttribute('aria-label', 'Fermer ' + titre);
      x.appendChild(icon(IC.x, { sw: 2 }));
      x.addEventListener('click', ev => { ev.stopPropagation(); fermerOnglet(o.id); });
      t.appendChild(x);
      t.addEventListener('click', () => activerOnglet(o.id));
      t.addEventListener('contextmenu', ev => menuOnglet(ev, o.id));
      t.addEventListener('keydown', ev => surOngletTouche(ev, o.id));
      el.onglets.appendChild(t);
    });
    const plus = document.createElement('button');
    plus.type = 'button'; plus.className = 'onglet-plus'; plus.id = 'onglet-plus';
    plus.title = 'Nouvel onglet (Ctrl+T)'; plus.setAttribute('aria-label', 'Nouvel onglet');
    plus.appendChild(icon(IC.plus, { sw: 1.8 }));
    plus.addEventListener('click', () => nouvelOnglet());
    el.onglets.appendChild(plus);
  }
  // Le clavier dans la barre d'onglets : les flèches passent de l'un à
  // l'autre, Début et Fin aux extrémités, Suppr ferme celui qu'on tient.
  function surOngletTouche(ev, id) {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); activerOnglet(id); return; }
    if (ev.key === 'Delete') { ev.preventDefault(); fermerOnglet(id); return; }
    const i = onglets.findIndex(o => o.id === id);
    if (i < 0) return;
    let cible = null;
    if (ev.key === 'ArrowRight') cible = onglets[(i + 1) % onglets.length];
    else if (ev.key === 'ArrowLeft') cible = onglets[(i - 1 + onglets.length) % onglets.length];
    else if (ev.key === 'Home') cible = onglets[0];
    else if (ev.key === 'End') cible = onglets[onglets.length - 1];
    if (!cible) return;
    ev.preventDefault();
    activerOnglet(cible.id);
    // Le rendu a remplacé les éléments : on reprend le clavier sur le neuf.
    const n = el.onglets.querySelector('[data-onglet="' + cible.id + '"]');
    if (n) n.focus();
  }

  function quitterDocument() {
    if (ed.root && !ed.root.hidden) closeEditor();
    if (openDlg) openDlg.close();
    const courant = ongletCourant();
    if (courant) courant.etat = prendreEtat();
  }
  function nouvelOnglet(fichiers) {
    quitterDocument();
    const o = { id: ++uid, etat: etatVierge() };
    onglets.push(o);
    ongletActif = o.id;
    poserEtat(o.etat);
    render();
    el.canvas.scrollTop = 0;
    if (fichiers && fichiers.length) addFiles(fichiers);
    return o;
  }
  function activerOnglet(id) {
    if (id === ongletActif) return;
    const cible = onglets.find(o => o.id === id);
    if (!cible) return;
    quitterDocument();
    ongletActif = id;
    poserEtat(cible.etat);
    render();
    el.canvas.scrollTop = 0;
  }
  function ongletVoisin(sens) {
    if (onglets.length < 2) return;
    const i = onglets.findIndex(o => o.id === ongletActif);
    activerOnglet(onglets[(i + sens + onglets.length) % onglets.length].id);
  }
  function fermerOnglet(id) {
    const o = onglets.find(x => x.id === id);
    if (!o) return;
    const e = o.id === ongletActif ? prendreEtat() : o.etat;
    const faire = () => {
      const i = onglets.indexOf(o);
      if (i < 0) return;
      recupOublier(o.id === ongletActif ? state : o.etat);
      onglets.splice(i, 1);
      if (o.id !== ongletActif) { renderOnglets(); return; }
      if (ed.root && !ed.root.hidden) closeEditor();
      const suivant = onglets[Math.min(i, onglets.length - 1)];
      if (suivant) { ongletActif = suivant.id; poserEtat(suivant.etat); }
      else { const n = { id: ++uid, etat: etatVierge() }; onglets.push(n); ongletActif = n.id; poserEtat(n.etat); }
      render();
      el.canvas.scrollTop = 0;
    };
    if (!(e.touched && e.pages.length)) { faire(); return; }
    dialog({
      title: 'Fermer « ' + titreEtat(e) + ' »', icon: IC.info,
      build: b => b.append(note('Des modifications n\'ont pas été exportées. En fermant cet onglet, vous les perdez.', 'warn')),
      actions: [
        { label: 'Revenir au document', onClick: c => c() },
        { label: 'Fermer sans exporter', primary: true, onClick: c => { c(); faire(); } },
      ],
    });
  }
  // Ouvrir : dans un nouvel onglet dès que celui-ci porte un vrai document.
  const ongletOccupe = () => state.pages.length > 0 && state.sources.some(s => !s.isSample);
  function ouvrirDansOnglet(fichiers) {
    const liste = Array.from(fichiers || []);
    if (!liste.length) return;
    if (ongletOccupe()) nouvelOnglet(liste); else addFiles(liste);
  }
  // Des pages glissées sur un autre onglet y déménagent — en copie, pour
  // que l'historique de chaque onglet reste le sien.
  function deplacerPagesVersOnglet(ids, ongletId) {
    const cible = onglets.find(o => o.id === ongletId);
    if (!cible || ongletId === ongletActif || !ids.length) return;
    const set = new Set(ids);
    const moving = state.pages.filter(p => set.has(p.id));
    if (!moving.length) return;
    snapshot();
    const e = cible.etat;
    moving.forEach(p => {
      const src = srcById(p.src);
      // Le même fichier déjà ouvert là-bas : on s'y rattache plutôt que de
      // le lister deux fois.
      let la = src && e.sources.find(s => s.id === src.id || (s.name === src.name && s.bytes.byteLength === src.bytes.byteLength));
      if (src && !la) { la = src; e.sources.push(src); }
      e.pages.push({ id: ++uid, src: la ? la.id : p.src, index: p.index, rot: p.rot, ann: p.ann.map(a => Object.assign({}, a, { id: ++uid })), piece: p.piece || null, ocr: p.ocr || null, pieceN: p.pieceN || 0, retraits: (p.retraits || []).slice() });
    });
    e.touched = true;
    state.pages = state.pages.filter(p => !set.has(p.id));
    state.touched = true;
    render();
    setLast(plural(moving.length, 'page déplacée', 'pages déplacées') + ' vers « ' + titreEtat(e) + ' »');
  }
  const modifieQuelquePart = () => onglets.some(o => { const e = o.id === ongletActif ? state : o.etat; return !!(e && e.touched && e.pages.length); });

  // =====================================================================
  //  Menu contextuel (clic droit) : sur une page, sur un onglet
  //  -------------------------------------------------------------------
  //  Plus discret que la barre d'outils : les gestes courants à portée de
  //  souris, avec leur raccourci en rappel.
  // =====================================================================
  let menuCtx = null;
  function fermerMenuCtx() {
    if (!menuCtx) return;
    menuCtx.remove(); menuCtx = null;
    document.removeEventListener('mousedown', surMenuCtxMousedown, true);
    document.removeEventListener('keydown', surMenuCtxKey, true);
    el.canvas.removeEventListener('scroll', fermerMenuCtx);
    window.removeEventListener('blur', fermerMenuCtx);
    window.removeEventListener('resize', fermerMenuCtx);
  }
  function surMenuCtxMousedown(e) { if (menuCtx && !menuCtx.contains(e.target)) fermerMenuCtx(); }
  function surMenuCtxKey(e) {
    if (!menuCtx) return;
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); fermerMenuCtx(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); e.stopPropagation();
      const b = Array.from(menuCtx.querySelectorAll('button:not(:disabled)'));
      if (!b.length) return;
      const i = b.indexOf(document.activeElement);
      b[(i + (e.key === 'ArrowDown' ? 1 : -1) + b.length) % b.length].focus();
    }
  }
  function menuContextuel(e, entrees) {
    e.preventDefault();
    fermerMenuCtx();
    const m = document.createElement('div'); m.className = 'menu-ctx'; m.setAttribute('role', 'menu');
    entrees.forEach(en => {
      if (!en) return;
      if (en.sep) { const sp = document.createElement('div'); sp.className = 'sep'; m.appendChild(sp); return; }
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem');
      if (en.icon) b.appendChild(icon(en.icon));
      const t = document.createElement('span'); t.textContent = en.label; b.appendChild(t);
      if (en.touche) { const k = document.createElement('kbd'); k.textContent = en.touche; b.appendChild(k); }
      if (en.disabled) b.disabled = true;
      if (en.danger) b.classList.add('danger');
      b.addEventListener('click', () => { fermerMenuCtx(); en.run(); });
      m.appendChild(b);
    });
    document.body.appendChild(m);
    const W = m.offsetWidth, H = m.offsetHeight;
    m.style.left = Math.max(4, Math.min(e.clientX, window.innerWidth - W - 6)) + 'px';
    m.style.top = Math.max(4, Math.min(e.clientY, window.innerHeight - H - 6)) + 'px';
    menuCtx = m;
    setTimeout(() => { if (menuCtx === m) document.addEventListener('mousedown', surMenuCtxMousedown, true); }, 0);
    document.addEventListener('keydown', surMenuCtxKey, true);
    el.canvas.addEventListener('scroll', fermerMenuCtx);
    window.addEventListener('blur', fermerMenuCtx);
    window.addEventListener('resize', fermerMenuCtx);
    const premier = m.querySelector('button:not(:disabled)');
    if (premier) premier.focus();
  }
  function menuPage(e, id) {
    const p = state.pages.find(x => x.id === id);
    if (!p) return;
    if (state.vue === 'organiser' && !state.selected.has(id)) { state.selected.clear(); state.selected.add(id); state.anchor = id; updateSelectionUI(); }
    const ids = state.vue === 'organiser' ? targetsFor(id) : [id];
    const n = ids.length, s = n > 1 ? ' (' + n + ' pages)' : '';
    const selection = window.getSelection ? String(window.getSelection()).trim() : '';
    menuContextuel(e, [
      selection ? { label: 'Copier la sélection', run: async () => { const ok = await copierTexte(selection); toast(ok ? 'Texte copié.' : 'Le presse-papiers est inaccessible ici.', ok ? '' : 'warn'); } } : null,
      selection ? { sep: true } : null,
      { label: 'Pivoter à droite' + s, icon: IC.rotR, touche: 'R', run: () => rotatePages(ids, 90) },
      { label: 'Pivoter à gauche' + s, icon: IC.rotL, touche: 'Maj+R', run: () => rotatePages(ids, -90) },
      { sep: true },
      { label: 'Modifier la page…', icon: IC.pencil, touche: 'Entrée', run: () => openEditor(id) },
      { label: 'Ajouter un signet', icon: IC.signet, touche: 'Ctrl+B', run: () => ajouterSignet(id) },
      { label: 'Copier le texte de la page', icon: IC.txt, run: async () => { const t = await getPageText(p); const ok = t.trim() && await copierTexte(t); toast(ok ? 'Texte de la page copié.' : (t.trim() ? 'Le presse-papiers est inaccessible ici.' : 'Cette page n\'a pas de texte (scan sans reconnaissance ?).'), ok ? '' : 'warn'); } },
      { sep: true },
      { label: 'Dupliquer' + s, icon: IC.doc, run: () => duplicatePages(ids) },
      { label: 'Extraire' + s + ' dans un PDF…', icon: IC.save, run: () => exportPages(state.pages.filter(x => ids.includes(x.id)), safeBase(el.filename.value).replace(/-modifié$/, '') + '-extrait.pdf', { noInPlace: true }) },
      { sep: true },
      { label: 'Supprimer' + s, icon: IC.trash, touche: 'Suppr', danger: true, run: () => deletePages(ids) },
    ]);
  }
  function fermerAutresOnglets(id) {
    const gardes = [];
    onglets.filter(o => o.id !== id).forEach(o => {
      const e = o.id === ongletActif ? prendreEtat() : o.etat;
      if (e && e.touched && e.pages.length) gardes.push(o); else fermerOnglet(o.id);
    });
    if (ongletActif !== id) activerOnglet(id);
    if (gardes.length) toast(plural(gardes.length, 'onglet modifié gardé', 'onglets modifiés gardés') + ' : enregistrez-le ou fermez-le à part.', 'warn');
  }
  function menuOnglet(e, id) {
    const o = onglets.find(x => x.id === id);
    if (!o) return;
    const etat = o.id === ongletActif ? state : o.etat;
    const avecPages = !!(etat && etat.pages && etat.pages.length);
    menuContextuel(e, [
      { label: state.bureau ? 'Enregistrer' : 'Exporter le PDF', icon: IC.save, touche: 'Ctrl+S', disabled: !avecPages, run: () => { activerOnglet(id); enregistrer(); } },
      { label: 'Enregistrer sous…', touche: 'Ctrl+Maj+S', disabled: !avecPages, run: () => { activerOnglet(id); if (state.pages.length && !state.busy) exportPages(state.pages, safeBase(el.filename.value) + '.pdf'); } },
      { sep: true },
      { label: 'Nouvel onglet', touche: 'Ctrl+T', run: () => nouvelOnglet() },
      { label: 'Fermer l\'onglet', touche: 'Ctrl+W', run: () => fermerOnglet(id) },
      { label: 'Fermer les autres onglets', disabled: onglets.length < 2, run: () => fermerAutresOnglets(id) },
    ]);
  }

