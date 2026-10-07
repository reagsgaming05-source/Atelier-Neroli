  // =====================================================================
  //  Vérifier l'accessibilité du document ouvert
  //  -------------------------------------------------------------------
  //  Un document public doit pouvoir se lire à l'oreille. L'outil rend le verdict et la liste des manques sur ce que l'export
  //  donnerait — le document tel qu'il est, balisage demandé —, sans rien envoyer nulle part : le contrôle se fait sur ce poste, avec
  //  le même contrôleur que celui qui accompagne l'export (63-balisage.js), plus ce que seul l'état du document sait dire (le titre,
  //  la langue, les signets, les pages qui ne sont qu'une image).
  //  Ce n'est pas un contrôle PDF/UA complet : un lecteur d'écran, ou un contrôleur dédié, reste la preuve. L'outil le dit.
  // =====================================================================
  const ACCESS_PAGES_MAX = 200;   // au-delà, le détail se limite aux premières pages : la vérification doit rester brève

  // Le texte lisible d'une page : un scan en est dépourvu, et un lecteur d'écran n'y trouve rien — sauf si le texte a été reconnu.
  async function accessPagesSansTexte() {
    const sans = [];
    const pages = state.pages.slice(0, ACCESS_PAGES_MAX);
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      if (p.ocr && p.ocr.mots && p.ocr.mots.length) continue;
      const src = srcById(p.src);
      if (!src || !src.pdfjs) continue;
      try {
        const page = await src.pdfjs.getPage(p.index + 1);
        const tc = await page.getTextContent();
        if (!tc.items.some(it => it.str && it.str.trim())) sans.push(i + 1);
      } catch (e) { signaler('Vérification de l\'accessibilité', e, 'info'); }
      if (i % 10 === 9) await nextFrame();
    }
    return sans;
  }

  async function verifierLAccessibilite() {
    // Ce que donnerait l'export, balisage demandé : le contrôleur du balisage lit le document produit.
    const opts = { balise: true, silencieux: true };
    await buildPdf(state.pages.slice(), opts);
    const r = opts.rapportBalisage || { balise: false, problemes: ['Le document n\'est pas balisé.'], avis: [], elements: 0 };
    const problemes = r.problemes.slice(), avis = r.avis.slice(), bons = [];
    if (r.balise) bons.push(plural(r.elements, 'élément de structure', 'éléments de structure') + (r.langue ? ' · ' + tr('langue') + ' ' + r.langue : ''));
    // ce que seul l'état du document sait
    const sans = await accessPagesSansTexte();
    if (sans.length) {
      const liste = sans.length > 12 ? sans.slice(0, 12).join(', ') + '…' : sans.join(', ');
      problemes.push(plural(sans.length, 'page est une image sans texte', 'pages sont des images sans texte') + ' (p. ' + liste + ') : un lecteur d\'écran n\'y lit rien. « Reconnaître le texte » les rend lisibles.');
    }
    if (state.pages.length > 10 && !(state.signets && state.signets.length)) avis.push(tr('Plus de dix pages et aucun signet : des signets permettent de naviguer sans tout lire.'));
    if (state.pages.length > ACCESS_PAGES_MAX) avis.push(tr('Les pages sans texte n\'ont été cherchées que dans les {0} premières.').replace('{0}', String(ACCESS_PAGES_MAX)));
    if (!state.meta.balise) avis.push(tr('Le balisage n\'est pas demandé : l\'export actuel ne serait pas balisé. Il se demande dans Propriétés.'));
    return { problemes, avis, bons, balise: r.balise };
  }

  function toolAccessibilite() {
    if (!state.pages.length) return;
    const zone = document.createElement('div'); zone.className = 'access-rapport';
    zone.setAttribute('aria-live', 'polite');
    const attente = note('Vérification en cours…');
    zone.appendChild(attente);
    const api = dialog({
      aide: 'access',
      title: 'Vérifier l\'accessibilité', icon: IC.info, libre: true, submitOnEnter: false,
      build: b => {
        b.append(note('Le contrôle se fait sur ce poste, sur le document tel que l\'export le donnerait, balisage demandé. Il relève ce qu\'un lecteur d\'écran ne pourrait pas lire ; il ne remplace pas un contrôle PDF/UA complet.'));
        b.append(zone);
      },
      actions: [
        { label: 'Propriétés…', onClick: close => { close(); toolProperties(); } },
        { label: 'Fermer', primary: true, onClick: c => c() },
      ],
    });
    setBusy('Vérification de l\'accessibilité…');
    verifierLAccessibilite().then(r => {
      zone.replaceChildren();
      const verdict = document.createElement('p'); verdict.className = 'access-verdict ' + (r.problemes.length ? 'ko' : 'ok'); verdict.setAttribute('role', 'status');
      verdict.textContent = r.problemes.length
        ? plural(r.problemes.length, 'manque à corriger', 'manques à corriger')
        : tr('Aucun manque relevé par ces contrôles.');
      zone.appendChild(verdict);
      const liste = (titre, lignes, genre) => {
        if (!lignes.length) return;
        const h = document.createElement('h3'); h.className = 'access-titre'; h.textContent = tr(titre);
        const ul = document.createElement('ul'); ul.className = 'access-liste ' + genre;
        lignes.forEach(l => { const li = document.createElement('li'); li.textContent = tr(l); ul.appendChild(li); });
        zone.append(h, ul);
      };
      liste('À corriger', r.problemes, 'ko');
      liste('À savoir', r.avis, 'avis');
      liste('Relevé', r.bons, 'ok');
      setLast(r.problemes.length ? plural(r.problemes.length, 'manque d\'accessibilité relevé', 'manques d\'accessibilité relevés') : 'Accessibilité : aucun manque relevé');
    }).catch(e => {
      zone.replaceChildren(note(messageDEchec('La vérification de l\'accessibilité', e), 'warn'));
    }).finally(() => setBusy(''));
    return api;
  }
