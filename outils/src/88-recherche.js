  // Un morceau de texte dans le repère affiché. Sa direction n'est pas
  // toujours de gauche à droite : un tableau posé de côté sur la page, un
  // texte à l'envers. On rend sa boîte, et « vertical » dit qu'il court de
  // haut en bas (ou de bas en haut : « monte »).
  function morceauGeom(m, largeur) {
    const size = Math.hypot(m[2], m[3]) || Math.abs(m[3]) || 10;
    const dx = m[0], dy = m[1], len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const w = largeur > 0 ? largeur : size * 0.5;
    if (Math.abs(ux) >= Math.abs(uy)) {
      return { x: ux >= 0 ? m[4] : m[4] - w, base: m[5], w, size, vertical: false, envers: ux < 0 };
    }
    // Vertical : les lettres se dressent à droite de la ligne de base quand
    // le texte descend, à gauche quand il monte.
    const monte = uy < 0;
    return {
      x: monte ? m[4] - size * 0.85 : m[4] - size * 0.25, base: m[5], w: size * 1.1, size, vertical: true, monte,
      y0: Math.min(m[5], m[5] + uy * w), h: Math.abs(uy * w),
    };
  }

  // Le texte d'une page avec, pour chaque morceau, sa place sur la page :
  // de quoi retrouver où se trouve une occurrence pour la caviarder.
  async function texteAvecPositions(p) {
    const src = srcById(p.src);
    const g = pageGeom(p);
    let texte = '', last = null;
    const morceaux = [];
    if (src) {
      try {
        const page = await src.pdfjs.getPage(p.index + 1);
        const vp = page.getViewport({ scale: 1, rotation: g.total });
        const tc = await page.getTextContent();
        tc.items.forEach(it => {
          if (!it.str) return;
          const m = pdfjs.Util.transform(vp.transform, it.transform);
          const geo = morceauGeom(m, it.width > 0 ? it.width : 0);
          const st = tc.styles && tc.styles[it.fontName];
          geo.famille = st && st.fontFamily ? st.fontFamily : 'sans-serif';
          geo.str = it.str;
          if (!(it.width > 0)) geo.w = geo.size * it.str.length * 0.5;
          const memeLigne = last && (geo.vertical ? (last.vertical && Math.abs(geo.x - last.x) <= 2) : (!last.vertical && Math.abs(geo.base - last.base) <= 2));
          if (last && !memeLigne) texte += '\n';
          else if (texte && !/\s$/.test(texte) && last && (geo.vertical ? Math.abs(geo.y0 - last.finY) > geo.size * 0.12 : geo.x - last.fin > geo.size * 0.12)) texte += ' ';
          const i0 = texte.length;
          texte += it.str;
          morceaux.push({ i0, i1: texte.length, x: geo.x, base: geo.base, w: geo.w, size: geo.size, vertical: geo.vertical, monte: geo.monte, y0: geo.y0, h: geo.h, str: geo.str, famille: geo.famille });
          last = { base: geo.base, fin: geo.x + geo.w, x: geo.x, vertical: geo.vertical, finY: geo.vertical ? (geo.monte ? geo.y0 : geo.y0 + geo.h) : 0 };
        });
        page.cleanup();
      } catch (e) { signaler('Texte', e); }
    }
    if (!morceaux.length && p.ocr && p.ocr.mots) {
      p.ocr.mots.forEach(m => {
        const base = ocrBase(m), corps = ocrCorps(m);
        if (last && Math.abs(base - last.base) > corps * 0.5) texte += '\n'; else if (texte) texte += ' ';
        const i0 = texte.length;
        texte += m.t;
        morceaux.push({ i0, i1: texte.length, x: m.x, base, w: m.w, size: corps, str: m.t, famille: 'sans-serif' });
        last = { base, fin: m.x + m.w };
      });
    }
    return { texte, morceaux };
  }
  // Où tombe le caractère k d'un morceau, en part de sa largeur : mesuré
  // avec une police de même famille, bien plus juste qu'un compte de lettres
  // dans une police proportionnelle.
  function partDuMorceau(m, k) {
    const n = Math.max(1, m.i1 - m.i0);
    if (!m.str || k <= 0) return 0;
    if (k >= n) return 1;
    const style = { famille: m.famille || 'sans-serif', poids: '400', penche: 'normal' };
    const tout = mesurerTexte(m.str, 100, style);
    if (!(tout > 0)) return k / n;
    return Math.max(0, Math.min(1, mesurerTexte(m.str.slice(0, k), 100, style) / tout));
  }
  // Les rectangles (repère affiché) couverts par les caractères [i0, i1[.
  function rectsOccurrence(morceaux, i0, i1) {
    const out = [];
    morceaux.forEach(m => {
      if (m.i1 <= i0 || m.i0 >= i1) return;
      const n = Math.max(1, m.i1 - m.i0);
      const fa = partDuMorceau(m, Math.max(0, i0 - m.i0)), fb = partDuMorceau(m, Math.min(n, i1 - m.i0));
      if (fb <= fa) return;
      if (m.vertical) {
        // le long de la colonne : vers le bas, ou vers le haut si le texte monte
        const ya = m.monte ? m.y0 + m.h * (1 - fb) : m.y0 + m.h * fa;
        out.push({ x: m.x, y: ya, w: m.w, h: m.h * (fb - fa) });
        return;
      }
      out.push({ x: m.x + m.w * fa, y: m.base - m.size * 0.85, w: m.w * (fb - fa), h: m.size * 1.1 });
    });
    return out;
  }
  // Le terme tel quel ; « mot entier » exige une frontière de mot des deux
  // côtés, lettres accentuées comprises.
  const regexDe = (terme, casse, mot) => {
    const corps = String(terme).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(mot ? '(?<![\\p{L}\\p{N}_])' + corps + '(?![\\p{L}\\p{N}_])' : corps, (casse ? 'g' : 'gi') + 'u');
  };

  // Caviarder partout : chaque occurrence est couverte d'un rectangle noir,
  // et la page convertie en image à l'export — le texte disparaît vraiment.
  async function caviarderPartout(terme, casse, avancement, mot, accents, ailleurs) {
    const spec = { terme, casse: !!casse, mot: !!mot, accents: !!accents };
    let occurrences = 0, pages = 0;
    const ajouts = [];
    for (let i = 0; i < state.pages.length; i++) {
      const p = state.pages[i];
      verifierAnnulation();
      if (avancement) avancement(i, state.pages.length);
      const { texte, morceaux } = await texteAvecPositions(p);
      let n = 0;
      const rects = [];
      for (const [a, b] of occurrencesDe(texte, spec).slice(0, 2000)) {
        rectsOccurrence(morceaux, a, b).forEach(r => rects.push(r));
        n++;
      }
      if (!n) continue;
      pages++; occurrences += n;
      rects.forEach(r => ajouts.push({ p, a: { id: -1, type: 'redact', x: r.x - 1, y: r.y - 0.5, w: r.w + 2, h: r.h + 1, color: '#000000', opacity: 1, width: 1 } }));
      if (i % 4 === 0) await nextFrame();
    }
    // Rien de visible, mais le terme est ailleurs dans le fichier (métadonnées,
    // notes, texte hors de la page) : le caviardage porte alors sur ces
    // surfaces-là, sans rectangle à poser.
    if (!occurrences && !ailleurs) return { occurrences: 0, pages: 0 };
    snapshot();
    ajouts.forEach(({ p, a }) => { a.id = ++uid; p.ann.push(a); });
    // Le terme est retenu : l'export le cherchera sur toutes les surfaces du
    // fichier, pas seulement à l'endroit où l'on a vu le mot.
    if (!state.purges.some(x => x.terme === spec.terme && x.casse === spec.casse && x.mot === spec.mot && x.accents === spec.accents)) state.purges.push(spec);
    state.touched = true;
    render();
    return { occurrences, pages };
  }

  // Remplacer partout : chaque bloc où le terme apparaît devient une
  // retouche, exactement comme si on l'avait corrigé à la main dans
  // l'éditeur — même fond relevé, mêmes polices, même mise en page.
  async function remplacerPartout(terme, nouveau, casse, avancement, mot) {
    const rx = regexDe(terme, casse, mot);
    let occurrences = 0, pages = 0;
    const neufs = [], touchees = [];
    const remplacerDans = a => {
      let n = 0;
      const texte = runsTexte(a.runs);
      const coups = [];
      rx.lastIndex = 0;
      let m;
      while ((m = rx.exec(texte)) && coups.length < 500) { if (!m[0].length) { rx.lastIndex++; continue; } coups.push([m.index, m.index + m[0].length]); }
      // de la fin vers le début : les positions précédentes ne bougent pas
      coups.reverse().forEach(([d, f]) => {
        let premier = true;
        runsAppliquer(a, d, f, c => { c.t = premier ? nouveau : ''; premier = false; });
        n++;
      });
      if (n) recalcRuns(a);
      return n;
    };
    for (let i = 0; i < state.pages.length; i++) {
      const p = state.pages[i];
      verifierAnnulation();
      if (avancement) avancement(i, state.pages.length);
      const texte = await getPageText(p);
      rx.lastIndex = 0;
      const dejaDedans = (p.ann || []).filter(x => x.type === 'edit' && rx.test(runsTexte(x.runs || [])));
      rx.lastIndex = 0;
      if (!rx.test(texte) && !dejaDedans.length) continue;
      let n = 0;
      // Un bloc déjà corrigé se corrige dans sa retouche, pas par-dessus.
      const copies = dejaDedans.map(x => { const c = Object.assign({}, x, { runs: x.runs.map(r => Object.assign({}, r)) }); const k = remplacerDans(c); return k ? { p, avant: x, apres: c, k } : null; }).filter(Boolean);
      copies.forEach(c => { n += c.k; touchees.push(c); });
      const blocs = (await edLignesDe(p)).blocs;
      for (const b of blocs) {
        rx.lastIndex = 0;
        if (!rx.test(b.text)) continue;
        const couvert = (p.ann || []).some(x => x.type === 'edit' && x.x < b.x + b.w && x.x + x.w > b.x && x.y < b.y + b.h && x.y + annHauteur(x) > b.y);
        if (couvert) continue;
        try {
          const a = await edFabriquerRetouche(p, b, blocs);
          const k = remplacerDans(a);
          if (k) { n += k; neufs.push({ p, a }); }
        } catch (e) { signaler('Remplacement', e); }
      }
      if (n) { pages++; occurrences += n; }
      await nextFrame();
    }
    if (!occurrences) return { occurrences: 0, pages: 0 };
    snapshot();
    touchees.forEach(({ p, avant, apres }) => { Object.assign(avant, apres); });
    neufs.forEach(({ p, a }) => { a.id = ++uid; p.ann.push(a); });
    state.touched = true;
    render();
    return { occurrences, pages };
  }

  // Le panneau de recherche flotte à côté du document : chaque occurrence
  // est surlignée sur sa page, et l'on va de l'une à l'autre.
  const recherche = { marques: null, cur: -1 };
  function poserMarquesLecture() {
    state.pages.forEach(p => {
      const f = feuilles.get(p.id);
      if (!f) return;
      const vieux = f.querySelector('.marques');
      if (vieux) vieux.remove();
      const liste = recherche.marques && recherche.marques.get(p.id);
      if (!liste || !liste.length) return;
      const g = pageGeom(p);
      const zone = document.createElement('div'); zone.className = 'marques';
      liste.forEach(o => o.rects.forEach(r => {
        const i = document.createElement('i');
        if (o.k === recherche.cur) i.className = 'courante';
        i.style.left = (r.x / g.Wd * 100).toFixed(3) + '%'; i.style.top = (r.y / g.Hd * 100).toFixed(3) + '%';
        i.style.width = (r.w / g.Wd * 100).toFixed(3) + '%'; i.style.height = (r.h / g.Hd * 100).toFixed(3) + '%';
        zone.appendChild(i);
      }));
      f.appendChild(zone);
    });
  }
  function poserMarquesTuiles() {
    state.pages.forEach(p => {
      const t = tiles.get(p.id);
      if (!t) return;
      const liste = recherche.marques && recherche.marques.get(p.id);
      t.classList.toggle('hit', !!(liste && liste.length));
      t.classList.toggle('hit-courante', !!(liste && liste.some(o => o.k === recherche.cur)));
    });
  }
  function effacerRecherche() { recherche.marques = null; recherche.cur = -1; poserMarquesTuiles(); poserMarquesLecture(); }

  // « 2 textes cachés, 1 note, les métadonnées » : ce que le fichier porte du
  // terme en dehors de ce que l'écran affiche.
  function decrireAilleurs(a) {
    const parts = [];
    if (a.texteCache) parts.push(plural(a.texteCache, 'texte invisible ou hors page', 'textes invisibles ou hors page'));
    if (a.notes) parts.push(plural(a.notes, 'note, champ ou pièce jointe', 'notes, champs ou pièces jointes'));
    if (a.metadonnees) parts.push('les métadonnées du fichier');
    if (a.signets) parts.push(plural(a.signets, 'signet', 'signets'));
    return parts.join(', ');
  }

  // Une confirmation qui dit ce qui va se passer, et à combien d'endroits.
  // « Êtes-vous sûr ? » ne renseigne personne ; le nombre, si.
  function confirmerLeCaviardage(terme, occurrences, ailleurs) {
    return new Promise(res => {
      let repondu = false;
      dialog({
        title: 'Caviarder dans tout le document',
        icon: IC.search,
        build: b => {
          if (occurrences) {
            b.append(note(plural(occurrences, 'occurrence', 'occurrences') + ' de « ' + terme + ' » '
              + (occurrences > 1 ? 'seront masquées d\'un rectangle noir' : 'sera masquée d\'un rectangle noir')
              + ', et le texte correspondant sera retiré du fichier à l\'enregistrement.', 'warn'));
          }
          if (ailleurs && ailleurs.total) {
            b.append(note('« ' + terme + ' » figure aussi hors de la page affichée : ' + decrireAilleurs(ailleurs)
              + '. Ces emplacements seront nettoyés à l\'enregistrement ; une note, un champ ou une pièce jointe qui le porte sera retiré.', 'warn'));
          }
          b.append(note('C\'est ce qu\'il faut avant de publier un document : le texte ne se retrouve pas en le'
            + ' sélectionnant. Ctrl+Z défait l\'opération tant que le document n\'est pas enregistré.'));
        },
        onClose: () => { if (!repondu) res(false); },
        actions: [
          { id: 'se-caviarder-non', label: 'Annuler', onClick: close => close() },
          { id: 'se-caviarder-oui', label: 'Caviarder', peril: true, onClick: close => { repondu = true; res(true); close(); } },
        ],
      });
    });
  }

  function toolSearch() {
    const q = input('se-q', 'text', '');
    q.placeholder = 'Mot ou expression à rechercher';
    const rempl = input('se-r', 'text', '');
    rempl.placeholder = 'Texte de remplacement';
    const casse = checkbox('se-casse', 'Respecter la casse', false);
    const mot = checkbox('se-mot', 'Mot entier', false);
    // Par défaut « Muller » trouve « Müller » : pour caviarder, manquer un nom
    // parce qu'on a oublié le tréma est pire que d'en noircir un de trop.
    const accents = checkbox('se-accents', 'Respecter les accents', false);
    const results = document.createElement('div'); results.className = 'list';
    const info = note('');
    const infoCache = note('', 'warn'); infoCache.id = 'se-ailleurs'; infoCache.hidden = true;
    const nav = document.createElement('div'); nav.className = 'se-nav';
    const prec = document.createElement('button'); prec.type = 'button'; prec.id = 'se-prec'; prec.className = 'tb-btn'; prec.textContent = '‹ Précédent'; prec.title = 'Occurrence précédente (Maj+Entrée)';
    const suiv = document.createElement('button'); suiv.type = 'button'; suiv.id = 'se-suiv'; suiv.className = 'tb-btn'; suiv.textContent = 'Suivant ›'; suiv.title = 'Occurrence suivante (Entrée)';
    const compte = document.createElement('span'); compte.id = 'se-compte'; compte.className = 'compte';
    nav.append(prec, suiv, compte);
    let token = 0, total = 0, occ = [], cur = -1, ailleurs = null;
    const aller = k => {
      if (!occ.length) return;
      cur = ((k % occ.length) + occ.length) % occ.length;
      recherche.cur = occ[cur].k;
      compte.textContent = (cur + 1) + ' / ' + occ.length;
      poserMarquesTuiles(); poserMarquesLecture();
      const o = occ[cur];
      if (state.vue === 'lecture') {
        const f = feuilles.get(o.pid);
        const r = o.rects[0];
        if (f && r) el.canvas.scrollTo({ top: Math.max(0, f.offsetTop + r.y * lectureZ - el.canvas.clientHeight * 0.4), behavior: 'smooth' });
        else lectureAller(pageIndex(o.pid) + 1);
      } else allerPage(o.pid);
    };
    async function run() {
      const term = q.value.trim();
      const my = ++token;
      results.replaceChildren();
      total = 0; occ = []; cur = -1; ailleurs = null;
      results.dataset.fini = '0';
      infoCache.hidden = true;
      effacerRecherche();
      compte.textContent = '';
      if (term.length < 2) { info.textContent = 'Saisissez au moins deux caractères.'; majBoutons(); return; }
      info.textContent = 'Recherche…';
      let found = 0;
      const spec = { terme: term, casse: casse.input.checked, mot: mot.input.checked, accents: accents.input.checked };
      const marques = new Map();
      const visibles = new Map();
      for (let i = 0; i < state.pages.length; i++) {
        if (my !== token) return;
        const p = state.pages[i];
        const { texte, morceaux } = await texteAvecPositions(p);
        if (my !== token) return;
        let n = 0, premier = null;
        const surPage = [];
        for (const ab of occurrencesDe(texte, spec).slice(0, 2000)) {
          if (!premier) premier = ab;
          const k = occ.length;
          const rects = rectsOccurrence(morceaux, ab[0], ab[1]);
          occ.push({ pid: p.id, k, rects });
          surPage.push({ k, rects });
          n++;
        }
        visibles.set(p.id, n);
        if (!n) continue;
        found++; total += n;
        marques.set(p.id, surPage);
        const from = Math.max(0, premier[0] - 40);
        const snippet = (from ? '…' : '') + texte.slice(from, premier[0]) + '§§' + texte.slice(premier[0], premier[1]) + '§§' + texte.slice(premier[1], premier[1] + 60) + '…';
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'result';
        const pn = document.createElement('span'); pn.className = 'p'; pn.textContent = 'p. ' + (i + 1) + (n > 1 ? ' ×' + n : '');
        const xs = document.createElement('span'); xs.className = 'x';
        snippet.replace(/\s+/g, ' ').split('§§').forEach((chunk, ci) => {
          if (ci === 1) { const mk = document.createElement('mark'); mk.textContent = chunk; xs.appendChild(mk); }
          else xs.appendChild(document.createTextNode(chunk));
        });
        b.append(pn, xs);
        const k0 = surPage[0].k;
        b.addEventListener('click', () => aller(occ.findIndex(o => o.k === k0)));
        results.appendChild(b);
        if (i % 6 === 0) await nextFrame();
      }
      if (my !== token) return;
      recherche.marques = marques;
      poserMarquesTuiles(); poserMarquesLecture();
      info.textContent = found ? plural(total, 'occurrence', 'occurrences') + ' sur ' + plural(found, 'page', 'pages') + ' pour « ' + term + ' »' : 'Aucun résultat visible pour « ' + term + ' ».';
      compte.textContent = total ? '0 / ' + total : '';
      if (total) aller(0);
      majBoutons();
      // Ce que le fichier porte du terme sans l'afficher : métadonnées, notes,
      // pièces jointes, signets, texte hors de la page. Le dire avant de
      // caviarder, sinon « Aucun résultat » laisse croire qu'il n'y a rien.
      try {
        const inv = await purgeInventaire(spec, visibles, () => my !== token);
        if (my !== token || !inv) return;
        ailleurs = inv;
        if (inv.total) {
          infoCache.textContent = 'Hors de la page affichée : ' + decrireAilleurs(inv) + '. « Caviarder tout » les retire aussi.';
          infoCache.hidden = false;
          if (!total) info.textContent = 'Aucun résultat visible pour « ' + term + ' », mais le fichier le porte ailleurs.';
        }
      } catch (e) { signaler('Recherche', e); }
      majBoutons();
      // La recherche est complète, inventaire compris : les scénarios de test
      // et les gestes rapides peuvent agir sans deviner.
      results.dataset.fini = '1';
    }
    let deb = null;
    q.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(run, 260); });
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (occ.length) aller(cur + (e.shiftKey ? -1 : 1)); } });
    casse.input.addEventListener('change', run);
    mot.input.addEventListener('change', run);
    accents.input.addEventListener('change', run);
    prec.addEventListener('click', () => aller(cur - 1));
    suiv.addEventListener('click', () => aller(cur + 1));
    let api = null;
    const majBoutons = () => {
      if (!api) return;
      const bR = api.foot.querySelector('#se-remplacer'), bC = api.foot.querySelector('#se-caviarder');
      const dehors = ailleurs ? ailleurs.total : 0;
      if (bR) { bR.disabled = !total; bR.textContent = total ? 'Remplacer tout (' + total + ')' : 'Remplacer tout'; }
      if (bC) { bC.disabled = !(total || dehors); bC.textContent = total ? 'Caviarder tout (' + total + (dehors ? ' + ' + dehors : '') + ')' : (dehors ? 'Caviarder hors page (' + dehors + ')' : 'Caviarder tout'); }
    };
    api = dialog({
      title: 'Rechercher, remplacer, caviarder', icon: IC.search, libre: true, submitOnEnter: false,
      build: b => {
        b.append(field('Recherche', q));
        b.append(rowOf([casse, mot, accents], true));
        b.append(nav);
        b.append(info);
        b.append(infoCache);
        b.append(results);
        b.append(field('Remplacer par', rempl));
        b.append(note('Remplacer tout corrige chaque bloc concerné comme dans l\'éditeur : mêmes polices, même mise en page. Caviarder tout masque chaque occurrence d\'un rectangle noir et retire le texte du fichier à l\'export.'));
      },
      onClose: () => { token++; effacerRecherche(); },
      actions: [
        { label: 'Fermer', onClick: c => c() },
        { id: 'se-caviarder', label: 'Caviarder tout', peril: true, onClick: async close => {
          const term = q.value.trim();
          if (term.length < 2 || !(total || (ailleurs && ailleurs.total))) return;
          const entier = mot.input.checked;
          // Caviarder retire le texte du fichier : c'est le geste qu'une
          // commune fait avant de publier un dossier d'enquête, et celui qu'on
          // ne rattrape pas une fois le PDF parti. Il se confirme, en disant
          // combien d'occurrences et ce qui leur arrive.
          const combien = total;
          const dehors = ailleurs;
          if (!(await confirmerLeCaviardage(term, combien, dehors))) return;
          token++; close();
          setBusy('Caviardage de « ' + term + ' »…', 0, { annuler: true });
          try {
            const r = await caviarderPartout(term, casse.input.checked, (i, n) => setBusy('Caviardage… page ' + (i + 1) + '/' + n, i / n, { annuler: true }), entier, accents.input.checked, !!(dehors && dehors.total));
            const dit = r.occurrences ? plural(r.occurrences, 'occurrence caviardée', 'occurrences caviardées') + ' sur ' + plural(r.pages, 'page', 'pages') : (dehors && dehors.total ? '« ' + term + ' » caviardé hors de la page affichée (' + decrireAilleurs(dehors) + ')' : '');
            setLast(dit ? dit + ' · Ctrl+Z pour annuler' : 'Aucune occurrence trouvée sur la page.');
            if (dit) toast(dit + '. Le texte masqué est retiré du fichier à l\'export ; la page reste nette.');
          } catch (e) { if (e && e.annule) { toast('Caviardage annulé : rien n\'a été changé.', 'warn'); return; } console.error(e); toast('Échec du caviardage : ' + e.message, 'error'); }
          finally { setBusy(''); }
        } },
        { id: 'se-remplacer', label: 'Remplacer tout', primary: true, onClick: async close => {
          const term = q.value.trim();
          if (term.length < 2 || !total) return;
          const entier = mot.input.checked;
          token++; close();
          setBusy('Remplacement de « ' + term + ' »…', 0, { annuler: true });
          try {
            const r = await remplacerPartout(term, rempl.value, casse.input.checked, (i, n) => setBusy('Remplacement… page ' + (i + 1) + '/' + n, i / n, { annuler: true }), entier);
            setLast(r.occurrences ? plural(r.occurrences, 'occurrence remplacée', 'occurrences remplacées') + ' sur ' + plural(r.pages, 'page', 'pages') + ' · Ctrl+Z pour annuler' : 'Rien à remplacer : le texte n\'est pas modifiable (scan sans OCR ?).');
            if (!r.occurrences) toast('Aucun bloc modifiable ne contient « ' + term + ' ». Sur un scan, lancez d\'abord la reconnaissance de texte.', 'warn');
          } catch (e) { if (e && e.annule) { toast('Remplacement annulé : rien n\'a été changé.', 'warn'); return; } console.error(e); toast('Échec du remplacement : ' + e.message, 'error'); }
          finally { setBusy(''); }
        } },
      ],
    });
    majBoutons();
  }

