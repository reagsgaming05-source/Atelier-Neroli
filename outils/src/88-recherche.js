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
  // Calculé une fois par page : la recherche suivante, le remplacement et le caviardage qui la suivent le
  // reprennent tel quel. La clé dit ce dont il dépend — la page, son sens, le texte reconnu par l'OCR — et
  // les plus anciens s'effacent au-delà de POSITIONS_MAX pages, pour ne pas garder un gros dossier en mémoire.
  const positionsMemo = new Map();
  const POSITIONS_MAX = 400;
  function texteAvecPositions(p) {
    const g = pageGeom(p);
    const cle = pkey(p) + '|' + g.total + '|' + (p.ocr ? (p.ocr.quand || 1) + ':' + (p.ocr.mots ? p.ocr.mots.length : 0) : 0);
    let v = positionsMemo.get(cle);
    if (v) { positionsMemo.delete(cle); positionsMemo.set(cle, v); return v; }
    v = texteAvecPositionsBrut(p, g).then(r => { if (r.echec) positionsMemo.delete(cle); return r; });
    positionsMemo.set(cle, v);
    if (positionsMemo.size > POSITIONS_MAX) positionsMemo.delete(positionsMemo.keys().next().value);
    return v;
  }
  async function texteAvecPositionsBrut(p, g) {
    const src = srcById(p.src);
    let texte = '', last = null, echec = false;
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
      } catch (e) { signaler('Texte', e); echec = true; }
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
    return { texte, morceaux, echec };
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
  // `choix(idPage, rang)` : seulement certaines occurrences (le rang est celui de l'occurrence dans sa page). Dans ce cas le terme n'est
  // pas retenu pour l'export : il ne s'agit plus de le retirer de tout le fichier, mais de masquer ce qui a été choisi.
  async function caviarderPartout(terme, casse, avancement, mot, accents, ailleurs, choix) {
    const spec = { terme, casse: !!casse, mot: !!mot, accents: !!accents };
    let occurrences = 0, pages = 0;
    const ajouts = [];
    const tour = cadence();
    for (let i = 0; i < state.pages.length; i++) {
      const p = state.pages[i];
      verifierAnnulation();
      if (avancement) avancement(i, state.pages.length);
      const { texte, morceaux } = await texteAvecPositions(p);
      let n = 0;
      const rects = [];
      occurrencesDe(texte, spec).slice(0, 2000).forEach(([a, b], rang) => {
        if (choix && !choix(p.id, rang)) return;
        rectsOccurrence(morceaux, a, b).forEach(r => rects.push(r));
        n++;
      });
      if (!n) continue;
      pages++; occurrences += n;
      rects.forEach(r => ajouts.push({ p, a: { id: -1, type: 'redact', x: r.x - 1, y: r.y - 0.5, w: r.w + 2, h: r.h + 1, color: '#000000', opacity: 1, width: 1 } }));
      await tour();
    }
    // Rien de visible, mais le terme est ailleurs dans le fichier (métadonnées,
    // notes, texte hors de la page) : le caviardage porte alors sur ces
    // surfaces-là, sans rectangle à poser.
    if (!occurrences && !ailleurs) return { occurrences: 0, pages: 0 };
    snapshot('Caviarder dans tout le document');
    ajouts.forEach(({ p, a }) => { a.id = ++uid; p.ann.push(a); });
    // Le terme est retenu : l'export le cherchera sur toutes les surfaces du
    // fichier, pas seulement à l'endroit où l'on a vu le mot.
    if (!choix && !state.purges.some(x => x.terme === spec.terme && x.casse === spec.casse && x.mot === spec.mot && x.accents === spec.accents)) state.purges.push(spec);
    state.touched = true;
    vue.render();
    return { occurrences, pages };
  }

  // Remplacer partout : chaque bloc où le terme apparaît devient une
  // retouche, exactement comme si on l'avait corrigé à la main dans
  // l'éditeur — même fond relevé, mêmes polices, même mise en page.
  async function remplacerPartout(terme, nouveau, casse, avancement, mot) {
    const rx = regexDe(terme, casse, mot);
    let occurrences = 0, pages = 0;
    const neufs = [], touchees = [];
    const tour = cadence();
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
      await tour();
    }
    if (!occurrences) return { occurrences: 0, pages: 0 };
    snapshot('Remplacer dans tout le document');
    touchees.forEach(({ p, avant, apres }) => { Object.assign(avant, apres); });
    neufs.forEach(({ p, a }) => { a.id = ++uid; p.ann.push(a); });
    state.touched = true;
    vue.render();
    return { occurrences, pages };
  }

  // Le panneau de recherche flotte à côté du document : chaque occurrence
  // est surlignée sur sa page, et l'on va de l'une à l'autre.
  // `marques` : page → ses occurrences { pid, k, a, b, rects } ; `morceaux` : page → ses morceaux de texte. Les
  // rectangles ne se calculent qu'à la demande (une feuille qui se peint, un saut à une occurrence) : 8 400
  // occurrences ne coûtent plus 8 400 mesures et 8 400 éléments avant le premier résultat.
  const recherche = { marques: null, morceaux: null, cur: -1 };
  const rectsDeOccurrence = o => o.rects || (o.rects = rectsOccurrence((recherche.morceaux && recherche.morceaux.get(o.pid)) || [], o.a, o.b));
  // Les marques d'une page de la vue Lecture : seulement pour les pages peintes, et à chaque fois qu'une page se peint.
  function poserMarquesFeuille(p) {
    const f = feuilles.get(p.id);
    if (!f) return;
    const vieux = f.querySelector('.marques');
    if (vieux) vieux.remove();
    const liste = recherche.marques && recherche.marques.get(p.id);
    if (!liste || !liste.length) return;
    const g = pageGeom(p);
    const zone = document.createElement('div'); zone.className = 'marques';
    liste.forEach(o => rectsDeOccurrence(o).forEach(r => {
      const i = document.createElement('i');
      if (o.k === recherche.cur) i.className = 'courante';
      i.style.left = (r.x / g.Wd * 100).toFixed(3) + '%'; i.style.top = (r.y / g.Hd * 100).toFixed(3) + '%';
      i.style.width = (r.w / g.Wd * 100).toFixed(3) + '%'; i.style.height = (r.h / g.Hd * 100).toFixed(3) + '%';
      zone.appendChild(i);
    }));
    f.appendChild(zone);
  }
  function poserMarquesLecture() {
    state.pages.forEach(p => {
      const f = feuilles.get(p.id);
      if (!f) return;
      if (peintes.has(p.id) || !recherche.marques) poserMarquesFeuille(p);
      else { const vieux = f.querySelector('.marques'); if (vieux) vieux.remove(); }
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
  function effacerRecherche() { recherche.marques = null; recherche.morceaux = null; recherche.cur = -1; poserMarquesTuiles(); poserMarquesLecture(); }

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
  function confirmerLeCaviardage(terme, occurrences, ailleurs, laissees) {
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
          if (laissees) {
            b.append(note(plural(laissees, 'occurrence reste lisible', 'occurrences restent lisibles') + ' : seules celles qui sont cochées sont masquées, et « ' + terme + ' » n\'est pas retiré du reste du fichier (métadonnées, notes, texte hors de la page).', 'warn'));
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
    // Les occurrences que l'on ne veut pas caviarder (clé : leur rang dans la recherche). Rien d'exclu, c'est « tout caviarder ».
    let exclues = new Set();
    const extrait = (texte, ab) => {
      const from = Math.max(0, ab[0] - 40);
      const snippet = (from ? '…' : '') + texte.slice(from, ab[0]) + '§§' + texte.slice(ab[0], ab[1]) + '§§' + texte.slice(ab[1], ab[1] + 60) + '…';
      const xs = document.createElement('span'); xs.className = 'x'; xs.setAttribute('translate', 'no');
      snippet.replace(/\s+/g, ' ').split('§§').forEach((chunk, ci) => {
        if (ci === 1) { const mk = document.createElement('mark'); mk.textContent = chunk; xs.appendChild(mk); }
        else xs.appendChild(document.createTextNode(chunk));
      });
      return xs;
    };
    const aller = k => {
      if (!occ.length) return;
      cur = ((k % occ.length) + occ.length) % occ.length;
      recherche.cur = occ[cur].k;
      compte.textContent = (cur + 1) + ' / ' + occ.length;
      poserMarquesTuiles(); poserMarquesLecture();
      const o = occ[cur];
      if (state.vue === 'lecture') {
        const f = feuilles.get(o.pid);
        const r = rectsDeOccurrence(o)[0];
        if (f && r) el.canvas.scrollTo({ top: Math.max(0, f.offsetTop + r.y * lectureZ - el.canvas.clientHeight * 0.4), behavior: 'smooth' });
        else lectureAller(pageIndex(o.pid) + 1);
      } else allerPage(o.pid);
    };
    async function run() {
      const term = q.value.trim();
      const my = ++token;
      results.replaceChildren();
      total = 0; occ = []; cur = -1; ailleurs = null; exclues = new Set();
      results.dataset.fini = '0';
      infoCache.hidden = true;
      effacerRecherche();
      compte.textContent = '';
      if (term.length < 2) { info.textContent = 'Saisissez au moins deux caractères.'; majBoutons(); return; }
      info.textContent = 'Recherche…';
      let found = 0;
      const spec = { terme: term, casse: casse.input.checked, mot: mot.input.checked, accents: accents.input.checked };
      // Les résultats se montrent au fur et à mesure : le premier est visible dès qu'il est trouvé, sur n'importe
      // quel document, et la recherche reste fluide parce qu'elle ne garde la main que pendant un budget de temps.
      const marques = new Map();
      const visibles = new Map();
      recherche.marques = marques;
      recherche.morceaux = new Map();
      const tour = cadence();
      const poser = () => { poserMarquesTuiles(); poserMarquesLecture(); };
      // La page suivante s'extrait pendant que celle-ci se traite : le travailleur de pdf.js n'attend plus
      // entre deux demandes.
      const DEVANT = 4;
      const file = [];
      const demander = i => { if (i < state.pages.length) file.push(texteAvecPositions(state.pages[i])); };
      for (let j = 0; j < DEVANT; j++) demander(j);
      for (let i = 0; i < state.pages.length; i++) {
        if (my !== token) return;
        const p = state.pages[i];
        const { texte, morceaux } = await file.shift();
        demander(i + DEVANT);
        if (my !== token) return;
        let n = 0, premier = null;
        const surPage = [];
        const lesOccurrences = occurrencesDe(texte, spec).slice(0, 2000);
        lesOccurrences.forEach((ab, rang) => {
          if (!premier) premier = ab;
          const o = { pid: p.id, k: occ.length, a: ab[0], b: ab[1], rang, rects: null };
          occ.push(o);
          surPage.push(o);
          n++;
        });
        visibles.set(p.id, n);
        if (n) {
          found++; total += n;
          marques.set(p.id, surPage);
          recherche.morceaux.set(p.id, morceaux);
          const ligne = document.createElement('div'); ligne.className = 'result-ligne';
          const casePage = document.createElement('input'); casePage.type = 'checkbox'; casePage.checked = true; casePage.className = 'result-case';
          casePage.setAttribute('aria-label', tr('Caviarder les occurrences de la page {0}').replace('{0}', String(i + 1)));
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'result';
          const pn = document.createElement('span'); pn.className = 'p'; pn.textContent = 'p. ' + (i + 1) + (n > 1 ? ' ×' + n : '');
          b.append(pn, extrait(texte, premier));
          const k0 = surPage[0].k;
          b.addEventListener('click', () => aller(occ.findIndex(o => o.k === k0)));
          ligne.append(casePage, b);
          // La case de la page dit l'état de ses occurrences : cochée si toutes le sont, mixte si certaines seulement.
          const rafraichirPage = () => {
            const exclusIci = surPage.filter(o => exclues.has(o.k)).length;
            casePage.checked = exclusIci === 0; casePage.indeterminate = exclusIci > 0 && exclusIci < surPage.length;
          };
          const detail = document.createElement('div'); detail.className = 'result-detail'; detail.hidden = true;
          let cases = [];
          casePage.addEventListener('change', () => {
            surPage.forEach(o => { if (casePage.checked) exclues.delete(o.k); else exclues.add(o.k); });
            cases.forEach((c, r) => { c.checked = !exclues.has(surPage[r].k); });
            casePage.indeterminate = false;
            majBoutons();
          });
          if (n > 1) {
            const det = document.createElement('button'); det.type = 'button'; det.className = 'tb-btn result-detail-btn'; det.textContent = tr('Détailler');
            det.setAttribute('aria-expanded', 'false');
            det.setAttribute('aria-label', tr('Détailler les occurrences de la page {0}').replace('{0}', String(i + 1)));
            let rempli = false;
            det.addEventListener('click', async () => {
              detail.hidden = !detail.hidden;
              det.setAttribute('aria-expanded', String(!detail.hidden));
              det.textContent = tr(detail.hidden ? 'Détailler' : 'Replier');
              if (detail.hidden || rempli) return;
              rempli = true;
              // Le texte de la page se relit à la demande : un document de mille pages ne le garde pas en mémoire pour des détails qu'on n'ouvre pas.
              const { texte: t2 } = await texteAvecPositions(p);
              occurrencesDe(t2, spec).slice(0, 2000).forEach((ab, rang) => {
                const o = surPage[rang]; if (!o) return;
                const ligneOcc = document.createElement('div'); ligneOcc.className = 'result-ligne';
                const c = document.createElement('input'); c.type = 'checkbox'; c.className = 'result-case'; c.checked = !exclues.has(o.k);
                c.setAttribute('aria-label', tr('Caviarder l\'occurrence {0} de la page {1}').replace('{0}', String(rang + 1)).replace('{1}', String(i + 1)));
                c.addEventListener('change', () => { if (c.checked) exclues.delete(o.k); else exclues.add(o.k); rafraichirPage(); majBoutons(); });
                cases[rang] = c;
                const bo = document.createElement('button'); bo.type = 'button'; bo.className = 'result';
                const num = document.createElement('span'); num.className = 'p'; num.textContent = '#' + (rang + 1);
                bo.append(num, extrait(t2, ab));
                bo.addEventListener('click', () => aller(occ.findIndex(x => x.k === o.k)));
                ligneOcc.append(c, bo);
                detail.appendChild(ligneOcc);
              });
            });
            ligne.appendChild(det);
          }
          results.append(ligne, detail);
          // Le premier résultat : on y va tout de suite ; les suivants ne font que grossir le compte.
          if (found === 1) { poser(); aller(0); } else if (cur >= 0) compte.textContent = (cur + 1) + ' / ' + occ.length;
        }
        await tour(() => { info.textContent = 'Recherche… ' + plural(total, 'occurrence', 'occurrences'); poser(); });
      }
      if (my !== token) return;
      poser();
      info.textContent = found ? plural(total, 'occurrence', 'occurrences') + ' sur ' + plural(found, 'page', 'pages') + ' pour « ' + term + ' »' : 'Aucun résultat visible pour « ' + term + ' ».';
      compte.textContent = total ? ((cur >= 0 ? cur + 1 : 0) + ' / ' + total) : '';
      if (total && cur < 0) aller(0);
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
      if (bC) {
        const gardees = total - exclues.size;
        if (exclues.size) { bC.disabled = !gardees; bC.textContent = 'Caviarder les occurrences cochées (' + gardees + ' sur ' + total + ')'; }
        else { bC.disabled = !(total || dehors); bC.textContent = total ? 'Caviarder tout (' + total + (dehors ? ' + ' + dehors : '') + ')' : (dehors ? 'Caviarder hors page (' + dehors + ')' : 'Caviarder tout'); }
      }
    };
    api = dialog({
      aide: 'search',
      title: 'Rechercher, remplacer, caviarder', icon: IC.search, libre: true, submitOnEnter: false,
      build: b => {
        b.append(field('Recherche', q, 'Le mot, le nom ou le numéro à trouver dans tout le document. Entrée passe à l\'occurrence suivante.'));
        b.append(rowOf([casse, mot, accents], true));
        b.append(nav);
        b.append(info);
        b.append(infoCache);
        b.append(results);
        b.append(field('Remplacer par', rempl, 'Remplace l\'occurrence affichée ou toutes. Laissez vide pour caviarder : le texte est alors détruit, pas seulement caché.'));
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
          // Des occurrences décochées : on ne masque que les autres, et le terme n'est pas retiré du reste du fichier.
          const partiel = exclues.size > 0;
          const combien = total - exclues.size;
          const dehors = partiel ? null : ailleurs;
          if (!combien && !(dehors && dehors.total)) return;
          const ecartees = new Map();
          occ.forEach(o => { if (exclues.has(o.k)) { if (!ecartees.has(o.pid)) ecartees.set(o.pid, new Set()); ecartees.get(o.pid).add(o.rang); } });
          const choix = partiel ? (pid, rang) => !(ecartees.has(pid) && ecartees.get(pid).has(rang)) : null;
          if (!(await confirmerLeCaviardage(term, combien, dehors, partiel ? exclues.size : 0))) return;
          token++; close();
          setBusy('Caviardage de « ' + term + ' »…', 0, { annuler: true });
          try {
            const r = await caviarderPartout(term, casse.input.checked, (i, n) => setBusy('Caviardage… page ' + (i + 1) + '/' + n, i / n, { annuler: true }), entier, accents.input.checked, !!(dehors && dehors.total), choix);
            const dit = r.occurrences ? plural(r.occurrences, 'occurrence caviardée', 'occurrences caviardées') + ' sur ' + plural(r.pages, 'page', 'pages') : (dehors && dehors.total ? '« ' + term + ' » caviardé hors de la page affichée (' + decrireAilleurs(dehors) + ')' : '');
            setLast(dit ? dit + ' · Ctrl+Z pour annuler' : 'Aucune occurrence trouvée sur la page.');
            if (dit) toast(dit + '. Le texte masqué est retiré du fichier à l\'export ; la page reste nette.');
          } catch (e) { if (e && e.annule) { toast('Caviardage annulé : rien n\'a été changé.', 'warn'); return; } toast(messageDEchec('Le caviardage', e), 'error'); }
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
          } catch (e) { if (e && e.annule) { toast('Remplacement annulé : rien n\'a été changé.', 'warn'); return; } toast(messageDEchec('Le remplacement', e), 'error'); }
          finally { setBusy(''); }
        } },
      ],
    });
    majBoutons();
  }

