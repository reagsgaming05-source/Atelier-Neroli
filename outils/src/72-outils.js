  // =====================================================================
  //  Tools
  // =====================================================================
  const PAGE_SIZES = { A4: [595.28, 841.89], A3: [841.89, 1190.55], A5: [419.53, 595.28], Letter: [612, 792], Legal: [612, 1008] };

  function toolBlank() {
    const size = select('bl-size', [['same', 'Même format que la page courante'], ['A4', 'A4'], ['A5', 'A5'], ['A3', 'A3'], ['Letter', 'Letter'], ['Legal', 'Legal']], 'same');
    const count = input('bl-count', 'number', 1, { min: 1, max: 100 });
    const where = select('bl-where', [['after', 'Après la sélection'], ['end', 'À la fin'], ['start', 'Au début']], state.selected.size ? 'after' : 'end');
    const orient = segmented('bl-or', [['portrait', 'Portrait'], ['paysage', 'Paysage']], 'portrait');
    dialog({
      title: 'Insérer des pages vierges', icon: IC.plus,
      build: b => {
        b.append(rowOf([field('Nombre de pages', count), field('Position', where)]));
        b.append(field('Format', size));
        b.append(field('Orientation', orient));
      },
      actions: [{ label: 'Annuler', onClick: c => c() }, { label: 'Insérer', primary: true, onClick: async close => {
        close();
        const n = clampInt(count.value, 1, 100) || 1;
        let dim = PAGE_SIZES[size.value];
        if (!dim) {
          const ref = selectedPages()[0] || state.pages[0];
          const g = ref ? pageGeom(ref) : null;
          dim = g ? [g.Wd, g.Hd] : PAGE_SIZES.A4;
        }
        let [w, h] = dim;
        if (orient.value === 'paysage' && h > w) { const t = w; w = h; h = t; }
        if (orient.value === 'portrait' && w > h) { const t = w; w = h; h = t; }
        setBusy('Création des pages…');
        try {
          const doc = await PDFLib.PDFDocument.create();
          for (let i = 0; i < n; i++) doc.addPage([w, h]);
          const bytes = await doc.save();
          const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
          const src = await addPdfSource(n > 1 ? n + ' pages vierges' : 'Page vierge', buf);
          const added = state.pages.filter(p => p.src === src.id).map(p => p.id);
          let at = state.pages.length;
          if (where.value === 'start') at = 0;
          else if (where.value === 'after' && state.selected.size) {
            const sel = selectedInOrder();
            at = pageIndex(sel[sel.length - 1]) + 1;
          }
          if (where.value !== 'end') movePages(added, at);
          state.touched = true;
          state.selected = new Set(added);
          render();
          setLast(plural(n, 'page vierge insérée', 'pages vierges insérées'));
        } catch (e) { console.error(e); toast('Échec de l\'insertion : ' + e.message, 'error'); }
        finally { setBusy(''); }
      } }],
    });
  }

  // =====================================================================
  //  Détection des pages vides
  // =====================================================================
  // Réglages : écart de luminosité à partir duquel un pixel compte comme de
  // l'encre, et proportion de la page au-delà de laquelle elle n'est plus vide.
  // Seuils établis par mesure : une page réellement vide, même bruitée par un
  // scanner ou marquée par l'ombre du bord, mesure zéro ; un simple tampon de
  // deux centimètres mesure déjà un dixième de pourcent.
  // « lettres » : combien de caractères une page peut porter tout en restant
  // considérée comme vide — un simple numéro de page, un pied de page court.
  // Seuils établis par mesure sur des documents réels, en proportion de la
  // page couverte par des marques qui se tiennent : une page vraiment vide,
  // même bruitée par un scanner, mesure zéro ; un petit tampon 0,11 % ;
  // un titre seul 0,04 % ; trois lignes de texte 0,98 % ; une page pleine 5 %.
  // Au-delà, la page porte une vraie image ou un vrai texte : elle n'est
  // pas « presque vide » et ne doit pas être proposée au retrait.
  // Repères mesurés : un tampon 0,11 %, un titre seul 0,04 %, trois lignes
  // 0,98 %, une page pleine 5 %, un scan pleine page 12 à 40 %.
  const PRESQUE_VIDE = { ratio: 0.006, lettres: 120 };
  const SENSIBILITE = {
    strict: { ecart: 20, seuil: 0, marge: 0.03, lettres: 0 },
    normal: { ecart: 34, seuil: 0.0002, marge: 0.04, lettres: 2 },
    tolerant: { ecart: 48, seuil: 0.004, marge: 0.06, lettres: 30 },
  };

  // Mesure la quantité d'encre d'une page, bords exclus, bruit isolé écarté.
  // « masque » : les pixels du mobilier de page (en-tête, pied de page, logo,
  // repérés parce qu'ils se répètent à l'identique sur les autres pages), qui
  // ne comptent pas comme de l'encre.
  async function mesurerEncre(p, reglages, masque) {
    const src = srcById(p.src);
    const g = pageGeom(p);
    const page = await src.pdfjs.getPage(p.index + 1);
    const echelle = Math.min(2, 360 / Math.max(g.Wd, g.Hd, 1));
    const vp = page.getViewport({ scale: echelle, rotation: g.total });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(8, Math.ceil(vp.width));
    canvas.height = Math.max(8, Math.ceil(vp.height));
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    page.cleanup();

    const mx = Math.round(canvas.width * reglages.marge);
    const my = Math.round(canvas.height * reglages.marge);
    const W = Math.max(4, canvas.width - 2 * mx);
    const H = Math.max(4, canvas.height - 2 * my);
    const d = ctx.getImageData(mx, my, W, H).data;

    const lum = new Uint8Array(W * H);
    const hist = new Uint32Array(256);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) {
      const l = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 | 0;
      lum[j] = l;
      hist[l]++;
    }
    // Blanc du papier : 92e centile, ce qui absorbe un fond légèrement gris.
    let cumul = 0, blanc = 255;
    const cible = Math.floor(W * H * 0.92);
    for (let l = 0; l < 256; l++) { cumul += hist[l]; if (cumul >= cible) { blanc = l; break; } }
    const seuilEncre = Math.max(8, blanc - reglages.ecart);
    const m = masque && masque.length === W * H ? masque : null;

    // Regroupement par blocs : une poussière isolée ne suffit pas à noircir un bloc.
    const B = 3, bw = Math.floor(W / B), bh = Math.floor(H / B);
    const totalBlocs = Math.max(1, bw * bh);
    const grille = new Uint8Array(totalBlocs);
    let bruts = 0;
    for (let by = 0; by < bh; by++) {
      for (let bx = 0; bx < bw; bx++) {
        let n = 0;
        for (let y = 0; y < B; y++) {
          const ligne = (by * B + y) * W + bx * B;
          for (let x = 0; x < B; x++) if (lum[ligne + x] < seuilEncre && !(m && m[ligne + x])) n++;
        }
        if (n >= 4) { grille[by * bw + bx] = 1; bruts++; }
      }
    }
    // Le grain d'un scanner sème des blocs isolés ; l'écriture, elle, est
    // toujours faite de blocs qui se touchent. On ne garde que les taches
    // d'au moins deux blocs — et, parmi elles, ni celles qui restent pâles
    // de bout en bout (le verso qui transparaît, l'ombre d'un pli : une
    // vraie écriture atteint quelque part sa pleine noirceur), ni les petites
    // taches rondes collées au bord (les trous de perforation).
    // Même en mode strict, une marque qui ne descend jamais sous ce gris
    // n'est pas de l'écriture.
    const noir = blanc - Math.max(2 * reglages.ecart, 60);
    const ptParBloc = B / echelle;
    const vu = new Uint8Array(totalBlocs);
    let blocsEncres = 0;
    for (let depart = 0; depart < totalBlocs; depart++) {
      if (!grille[depart] || vu[depart]) continue;
      const pile = [depart];
      vu[depart] = 1;
      let taille = 0, plusSombre = 255, x0 = bw, x1 = 0, y0 = bh, y1 = 0;
      while (pile.length) {
        const k = pile.pop();
        const bx = k % bw, by = (k - bx) / bw;
        taille++;
        if (bx < x0) x0 = bx; if (bx > x1) x1 = bx; if (by < y0) y0 = by; if (by > y1) y1 = by;
        for (let y = 0; y < B; y++) {
          const ligne = (by * B + y) * W + bx * B;
          for (let x = 0; x < B; x++) if (lum[ligne + x] < plusSombre) plusSombre = lum[ligne + x];
        }
        const autour = [bx > 0 ? k - 1 : -1, bx < bw - 1 ? k + 1 : -1, by > 0 ? k - bw : -1, by < bh - 1 ? k + bw : -1];
        for (const v of autour) if (v >= 0 && grille[v] && !vu[v]) { vu[v] = 1; pile.push(v); }
      }
      if (taille < 2) continue;
      if (plusSombre > noir) continue;
      const largeurPt = (x1 - x0 + 1) * ptParBloc, hauteurPt = (y1 - y0 + 1) * ptParBloc;
      const centrePt = mx / echelle + (x0 + x1 + 1) / 2 * ptParBloc;
      const largeurPage = canvas.width / echelle;
      if (largeurPt <= 26 && hauteurPt <= 26 && (centrePt < 72 || centrePt > largeurPage - 72)) continue;
      blocsEncres += taille;
    }
    const apercu = document.createElement('canvas');
    apercu.width = 80;
    apercu.height = Math.max(8, Math.round(80 * canvas.height / canvas.width));
    apercu.getContext('2d').drawImage(canvas, 0, 0, apercu.width, apercu.height);
    return {
      ratio: blocsEncres / totalBlocs, brut: bruts / totalBlocs, blanc,
      apercu: apercu.toDataURL('image/jpeg', 0.6),
      lum, W, H, seuilEncre,
    };
  }

  // Le texte d'une page avec ses positions, et pour chaque élément une
  // signature qui ne change pas d'une page à l'autre quand c'est le même
  // en-tête ou pied de page : le texte, chiffres effacés (« Page 3 » et
  // « Page 4 » sont le même pied de page), à la même place.
  async function elementsTexte(p) {
    const src = srcById(p.src);
    if (!src) return [];
    const page = await src.pdfjs.getPage(p.index + 1);
    const tc = await page.getTextContent();
    return tc.items.filter(it => it.str && it.str.trim()).map(it => ({
      lettres: it.str.replace(/\s/g, '').length,
      sig: it.str.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim() + '@' + Math.round(it.transform[4] / 4) + ',' + Math.round(it.transform[5] / 4),
    }));
  }

  // Le mobilier de page : ce qui se retrouve à l'identique sur la plupart des
  // pages d'un même document — en-tête, pied de page, logo, cadre, numéro de
  // page. Ça ne porte aucune information propre à la page : une page qui n'a
  // que cela est vide. Repéré au pixel près sur un échantillon de pages,
  // donc un corps de texte, différent d'une page à l'autre, n'y entre pas.
  const MOBILIER = { part: 0.7, echantillon: 24 };
  async function reperer_mobilier(pages, reglages, textes, avancement) {
    const n = pages.length;
    if (n < 2) return null;
    const pas = Math.max(1, n / MOBILIER.echantillon);
    const choisies = [];
    for (let k = 0; k < n && choisies.length < MOBILIER.echantillon; k += pas) choisies.push(pages[Math.floor(k)]);
    let compte = null, W = 0, H = 0;
    const sigs = new Map();
    for (let i = 0; i < choisies.length; i++) {
      const p = choisies[i];
      if (avancement) avancement(i, choisies.length);
      const r = await mesurerEncre(p, reglages);
      if (!compte) { W = r.W; H = r.H; compte = new Uint16Array(W * H); }
      if (r.W !== W || r.H !== H) continue;
      for (let j = 0; j < compte.length; j++) if (r.lum[j] < r.seuilEncre) compte[j]++;
      const items = await elementsTexte(p);
      textes.set(pkey(p), items);
      new Set(items.map(it => it.sig)).forEach(sg => sigs.set(sg, (sigs.get(sg) || 0) + 1));
    }
    const quorum = Math.ceil(MOBILIER.part * choisies.length);
    const masque = new Uint8Array(W * H);
    let pixels = 0;
    for (let j = 0; j < compte.length; j++) if (compte[j] >= quorum) { masque[j] = 1; pixels++; }
    // Élargi d'un pixel : le lissage des bords ne doit pas laisser un liseré.
    if (pixels) {
      const large = new Uint8Array(masque);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!masque[y * W + x]) continue;
          if (x > 0) large[y * W + x - 1] = 1;
          if (x < W - 1) large[y * W + x + 1] = 1;
          if (y > 0) large[(y - 1) * W + x] = 1;
          if (y < H - 1) large[(y + 1) * W + x] = 1;
        }
      }
      masque.set(large);
    }
    const meubles = new Set();
    sigs.forEach((c, sg) => { if (c >= quorum) meubles.add(sg); });
    return { masque: pixels ? masque : null, meubles, pixels };
  }

  // La détection elle-même, sans fenêtre : ce qu'en fait l'outil, et ce
  // que refait le traitement par lots.
  async function detecterPagesVides(pages, reglages, avancement, annule) {
    const dire = msg => { if (avancement) avancement(msg); };
    const stop = () => !!(annule && annule());
    const mesures = [];
    let rates = 0;

    // Le mobilier se repère par document et par format de page : un
    // en-tête n'a de sens que parmi des pages qui se ressemblent.
    const groupes = new Map();
    pages.forEach(p => {
      const g = pageGeom(p);
      const cle = p.src + '|' + Math.round(g.Wd) + '|' + Math.round(g.Hd) + '|' + g.total;
      if (!groupes.has(cle)) groupes.set(cle, { pages: [], mobilier: null });
      groupes.get(cle).pages.push(p);
    });
    const textes = new Map();
    for (const gr of groupes.values()) {
      if (stop()) return null;
      if (gr.pages.length < 2) continue;
      try {
        gr.mobilier = await reperer_mobilier(gr.pages, reglages, textes, (i, n) => dire('Repérage des en-têtes et pieds de page… ' + (i + 1) + ' sur ' + n));
      } catch (e) { console.error(e); }
    }
    const groupeDe = p => { const g = pageGeom(p); return groupes.get(p.src + '|' + Math.round(g.Wd) + '|' + Math.round(g.Hd) + '|' + g.total); };

    for (let i = 0; i < pages.length; i++) {
      if (stop()) return null;
      const p = pages[i];
      dire('Analyse… page ' + (i + 1) + ' sur ' + pages.length);
      const gr = groupeDe(p);
      const mob = gr && gr.mobilier;
      let mesure = null;
      try { mesure = await mesurerEncre(p, reglages, mob && mob.masque); } catch (e) { console.error(e); rates++; }
      if (!mesure) continue;
      mesure.lum = null;
      let items = textes.get(pkey(p));
      if (!items) { try { items = await elementsTexte(p); } catch (e) { console.error(e); items = []; } }
      let lettres = items.reduce((t, it) => t + (mob && mob.meubles.has(it.sig) ? 0 : it.lettres), 0);
      // Une page reconnue par l'OCR porte du texte, même si elle est une image.
      if (!items.length && p.ocr && p.ocr.mots) lettres += p.ocr.mots.reduce((t, m) => t + m.t.length, 0);
      const mobilier = !!(mob && (mob.masque || mob.meubles.size));
      mesures.push({ p, i, mesure, lettres, mobilier,
        vide: mesure.ratio <= reglages.seuil && lettres <= reglages.lettres });
      if (i % 3 === 0) await nextFrame();
    }
    if (stop()) return null;

    const vides = mesures.filter(m => m.vide);
    // « Presque vide » veut dire : la page ne porte qu'une marque ou deux,
    // un tampon, un titre seul. Une photo ou un scan en couvre bien
    // davantage et n'a rien à faire dans cette liste, même si c'est la
    // page la moins chargée du document.
    const autres = mesures.filter(m => !m.vide && m.mesure.ratio <= PRESQUE_VIDE.ratio && m.lettres <= PRESQUE_VIDE.lettres)
      .sort((a, b) => (a.mesure.ratio - b.mesure.ratio) || (a.lettres - b.lettres))
      .slice(0, 8);
    return { mesures, vides, autres, rates };
  }

  function toolPagesVides() {
    let mode = 'normal';
    const sensi = segmented('pv-sensi', [['strict', 'Strict'], ['normal', 'Normal'], ['tolerant', 'Tolérant']], mode, v => { mode = v; analyser(); });
    const info = note('');
    const liste = document.createElement('div'); liste.className = 'list';
    const cases = new Map();
    let jeton = 0;

    async function analyser() {
      const mien = ++jeton;
      const reglages = SENSIBILITE[mode];
      liste.replaceChildren();
      cases.clear();
      const r = await detecterPagesVides(state.pages, reglages, msg => { info.textContent = msg; }, () => mien !== jeton);
      if (!r || mien !== jeton) return;
      const { vides, autres, rates } = r;

      info.textContent = (vides.length
        ? plural(vides.length, 'page vide détectée', 'pages vides détectées') + ' sur ' + state.pages.length + ', déjà cochée' + (vides.length > 1 ? 's' : '') + '.'
        : 'Aucune page entièrement vide sur ' + plural(state.pages.length, 'page', 'pages') + '.')
        + (autres.length
          ? ' ' + plural(autres.length, 'page ne porte presque rien', 'pages ne portent presque rien') + ' : cochez celles à retirer.'
          : (vides.length ? '' : ' Toutes portent du texte ou une image.'))
        + (rates ? ' ' + plural(rates, 'page n\'a pas pu être analysée', 'pages n\'ont pas pu être analysées') + '.' : '');

      const ajouter = (m, coche, titre) => {
        const ligne = document.createElement('div'); ligne.className = 'list-item';
        const c = checkbox('pv-' + m.p.id, '', coche);
        const img = document.createElement('img');
        img.src = m.mesure.apercu;
        img.alt = '';
        img.style.width = '34px'; img.style.border = '1px solid var(--trait)'; img.style.background = '#fff';
        const g = document.createElement('div'); g.className = 'g';
        const n = document.createElement('div'); n.className = 'n';
        n.textContent = 'Page ' + (m.i + 1) + (titre ? ' · ' + titre : '');
        const sous = document.createElement('div'); sous.className = 's';
        const src = srcById(m.p.id) || srcById(m.p.src);
        const marques = m.mesure.ratio === 0
          ? (m.lettres > 0 ? 'marques infimes' : m.mesure.brut > 0 ? 'aucune marque, seulement du grain' : 'parfaitement vide')
          : 'marques : ' + (m.mesure.ratio * 100).toFixed(2) + ' %';
        sous.textContent = marques + (m.lettres ? ' · ' + plural(m.lettres, 'caractère', 'caractères') : ' · aucun texte')
          + (m.mobilier ? ' · hors en-tête et pied de page' : '')
          + (src ? ' · ' + baseName(src.name) + ' p. ' + (m.p.index + 1) : '');
        g.append(n, sous);
        ligne.append(c, img, g);
        liste.appendChild(ligne);
        cases.set(m.p.id, c.input);
      };
      vides.forEach(m => ajouter(m, true, null));
      autres.forEach(m => ajouter(m, false, 'presque vide'));
    }

    dialog({
      title: 'Détecter les pages vides', icon: IC.vide, wide: true, submitOnEnter: false,
      build: b => {
        b.append(field('Sensibilité', sensi, 'Strict ne retient que les pages sans la moindre marque. Normal tolère un numéro de page. Tolérant accepte un pied de page court et le grain d\'un scanner.'));
        b.append(info);
        b.append(liste);
        b.append(note('Les bords sont ignorés, et le grain d\'un scanner ne compte pas ; ni le verso qui transparaît, ni les trous de perforation : seules les marques qui se tiennent et atteignent leur pleine noirceur, comme de l\'écriture, sont mesurées. Ce qui se répète à l\'identique sur les pages d\'un document — en-tête, pied de page, logo, numéro de page — ne compte pas non plus : une page qui ne porte que cela est vide.'));
      },
      onOpen: () => {},
      actions: [
        { label: 'Fermer', onClick: c => { jeton++; c(); } },
        { label: 'Retirer les pages cochées', primary: true, onClick: close => {
          const ids = [];
          cases.forEach((input, id) => { if (input.checked) ids.push(id); });
          if (!ids.length) { toast('Aucune page cochée.', 'warn'); return; }
          jeton++;
          close();
          const ordonnees = state.pages.filter(p => ids.indexOf(p.id) !== -1).map(p => p.id);
          deletePages(ordonnees);
        } },
      ],
    });
    analyser();
  }

