  // =====================================================================
  //  Relire le texte reconnu
  //  -------------------------------------------------------------------
  //  Un OCR qui se trompe sans le dire est pire qu'un OCR qui ne lit rien : le texte part dans le PDF, cherchable, et c'est lui qu'on
  //  retrouve. Cet écran montre, mot par mot, ce que le moteur a lu avec le moins de confiance — l'image du mot à côté de ce qui en a été
  //  fait — et laisse corriger. La correction va dans le texte reconnu de la page (celui qui part dans le PDF exporté, et que la recherche lit),
  //  pas dans l'image : la page scannée ne change pas.
  // =====================================================================
  // Le texte d'une page, refait depuis ses mots : un mot par ligne d'origine (champ « li »), les lignes l'une sous l'autre.
  function ocrTexteDeMots(mots) {
    const lignes = [];
    let courant = null, derniere = null;
    mots.forEach(m => {
      if (derniere === null || m.li !== derniere || m.li == null) { courant = []; lignes.push(courant); }
      courant.push(m.t); derniere = m.li;
    });
    return lignes.map(l => l.join(' ')).join('\n');
  }

  function toolRelireOcr() {
    const reconnues = state.pages.filter(p => p.ocr && p.ocr.mots && p.ocr.mots.length);
    if (!reconnues.length) {
      dialog({ title: 'Relire le texte reconnu', icon: IC.ocr, build: b => b.append(note('Aucune page n\'a de texte reconnu. Lancez d\'abord « Reconnaître le texte » sur un scan.', 'warn')) });
      return;
    }
    const courante = pageCouranteId();
    const options = [['courante', 'La page affichée'], ['toutes', 'Toutes les pages reconnues (' + reconnues.length + ')']];
    const choix = select('rl-pages', options, reconnues.some(p => p.id === courante) ? 'courante' : 'toutes');
    const tous = checkbox('rl-tous', 'Montrer tous les mots, pas seulement ceux que le moteur a mal lus', false);
    const info = note('');
    const liste = document.createElement('div'); liste.className = 'liste-relecture';
    let jeton = 0, annule = false;
    const rendus = new Map();                       // id de page -> canvas de la page entière
    const ECHELLE = 3;

    async function imageDePage(p) {
      if (rendus.has(p.id)) return rendus.get(p.id);
      const g = pageGeom(p);
      const src = srcById(p.src);
      const pg = await src.pdfjs.getPage(p.index + 1);
      const vp = pg.getViewport({ scale: ECHELLE, rotation: g.total });
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.ceil(vp.width)); cv.height = Math.max(1, Math.ceil(vp.height));
      const cx = cv.getContext('2d', { alpha: false });
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
      await rendrePage(pg, src, { canvasContext: cx, viewport: vp }, '#fff').promise;
      pg.cleanup();
      rendus.set(p.id, cv);
      return cv;
    }
    // Ce qui est changé est écrit dans le texte reconnu de la page ; le texte cherchable suit.
    function appliquer(p, m, neuf) {
      if (!annule) { snapshot('Corriger le texte reconnu'); annule = true; }
      m.t = neuf; m.conf = 100; m.corrige = true;
      p.ocr.texte = ocrTexteDeMots(p.ocr.mots);
      textCache.set(pkey(p), p.ocr.texte); ocrCache.add(pkey(p));
      state.touched = true;
    }
    async function montrer() {
      const mon = ++jeton;
      liste.replaceChildren();
      const pages = choix.value === 'courante' ? reconnues.filter(p => p.id === courante) : reconnues;
      let n = 0, total = 0;
      info.textContent = 'Lecture des pages…';
      for (const p of pages) {
        const douteux = p.ocr.mots.map((m, i) => ({ m, i })).filter(x => tous.input.checked || (!x.m.corrige && x.m.conf < OCR_SEUIL_CONFIANCE));
        total += douteux.length;
        if (!douteux.length) continue;
        let cv = null;
        try { cv = await imageDePage(p); } catch (e) { signaler('Relecture du texte reconnu', e); }
        if (mon !== jeton) return;
        const titre = document.createElement('h4'); titre.className = 'rl-page'; titre.textContent = tr('Page') + ' ' + (pageIndex(p.id) + 1) + ' — ' + plural(douteux.length, 'mot à relire', 'mots à relire');
        liste.appendChild(titre);
        const g = pageGeom(p);
        douteux.slice(0, 300).forEach(({ m }) => {
          const ligne = document.createElement('div'); ligne.className = 'list-item rl-mot';
          // L'image du mot, avec un peu de contexte de chaque côté.
          const vue = document.createElement('canvas'); vue.className = 'rl-image';
          if (cv) {
            const k = cv.width / g.Wd;
            const marge = Math.max(m.h, 8) * 0.9;
            const sx = Math.max(0, (m.x - marge * 2) * k), sy = Math.max(0, (m.y - marge * 0.5) * k);
            const sw = Math.min(cv.width - sx, (m.w + marge * 4) * k), sh = Math.min(cv.height - sy, (m.h + marge) * k);
            vue.width = Math.max(1, Math.round(sw)); vue.height = Math.max(1, Math.round(sh));
            vue.getContext('2d').drawImage(cv, sx, sy, sw, sh, 0, 0, vue.width, vue.height);
            vue.setAttribute('role', 'img'); vue.setAttribute('aria-label', tr('Le mot tel qu\'il est sur la page scannée'));
          }
          const champ = input('rl-m' + n++, 'text', m.t);
          champ.setAttribute('aria-label', tr('Texte reconnu'));
          const conf = document.createElement('span'); conf.className = 's'; conf.textContent = m.corrige ? tr('corrigé') : (m.conf + ' %');
          const garde = () => { const v = champ.value.trim(); if (v && v !== m.t) { appliquer(p, m, v); conf.textContent = tr('corrigé'); } };
          champ.addEventListener('change', garde);
          champ.addEventListener('keydown', e => { if (e.key === 'Enter') { garde(); const s = ligne.nextElementSibling; const suite = s && s.querySelector && s.querySelector('input'); if (suite) { suite.focus(); suite.select(); } } });
          const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'tb-btn'; ok.textContent = tr('C\'est juste');
          ok.addEventListener('click', () => { if (!annule) { snapshot('Corriger le texte reconnu'); annule = true; } m.conf = 100; m.corrige = true; state.touched = true; conf.textContent = tr('corrigé'); ligne.classList.add('rl-fait'); });
          ligne.append(vue, champ, conf, ok);
          liste.appendChild(ligne);
        });
        if (douteux.length > 300) liste.appendChild(note('… et ' + (douteux.length - 300) + ' autres sur cette page : corrigez ceux-ci, puis rouvrez cet écran.'));
      }
      info.textContent = total
        ? plural(total, 'mot à relire', 'mots à relire') + '. Tapez la bonne graphie (Entrée passe au suivant) ou « C\'est juste » : le texte reconnu est corrigé, pas l\'image du scan.'
        : 'Rien à relire : le moteur a lu tous les mots avec assez de confiance.';
    }
    choix.addEventListener('change', montrer);
    tous.input.addEventListener('change', montrer);
    dialog({
      aide: 'ocr-relire',
      title: 'Relire le texte reconnu', icon: IC.ocr, wide: true, submitOnEnter: false,
      build: b => {
        b.append(field('Pages', choix, 'Seules les pages dont le texte a été reconnu sont proposées.'));
        b.append(tous);
        b.append(info);
        b.append(liste);
      },
      onClose: () => { jeton++; if (annule) vue.render(); },
      actions: [{ label: 'Fermer', primary: true, onClick: c => c() }],
    });
    montrer();
  }
