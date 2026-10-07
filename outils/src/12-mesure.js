  // =====================================================================
  //  Mesure du texte et géométrie des annotations
  //  -------------------------------------------------------------------
  //  Ce que tout le monde demande avant de dessiner : la largeur d'un
  //  texte, sa coupe en lignes, la hauteur et l'encombrement d'une
  //  annotation, la taille d'un champ de formulaire. Placé tôt : les
  //  vignettes, la recherche, la reconnaissance de texte et l'assemblage
  //  s'en servent sans dépendre de l'éditeur de texte.
  // =====================================================================

  // Un champ à remplir : une case que le lecteur du PDF pourra renseigner,
  // dans Acrobat comme dans n'importe quelle visionneuse.
  let champNumero = 0;

  function champNeuf() {
    return {
      type: 'champ', nom: '', valeur: '', libelle: '',
      size: 11, multi: false, bordure: '#7A8899', fond: '#F2F6FC', encre: '#111111',
    };
  }

  // Le nom sert d'étiquette dans le PDF : il doit rester unique et lisible.
  function champNom(a, pris) {
    let base = String(a.libelle || a.nom || '').trim().replace(/[.\[\]()]/g, ' ').replace(/\s+/g, ' ').slice(0, 60);
    if (!base) base = 'Champ';
    let nom = base, n = 1;
    while (pris.has(nom)) { n++; nom = base + ' ' + n; }
    pris.add(nom);
    return nom;
  }

  function champTaille(a) {
    const voulue = a.size > 0 ? a.size : 11;
    // Le texte doit tenir dans la hauteur tracée, sinon la visionneuse le
    // rogne : un champ d'une ligne de 14 pt ne peut pas porter du 20 pt.
    return a.multi ? voulue : Math.max(5, Math.min(voulue, (a.h || 18) * 0.68));
  }

  // Hauteur du rectangle de recouvrement : au moins celle du bloc d'origine.
  function annHauteur(a) {
    return a.type === 'edit' ? Math.max(a.h || 0, a.h0 || 0) : a.h;
  }

  // Une flèche : le trait va de son départ au pied de la pointe, et la pointe est un triangle plein dont le sommet est le second point.
  function geomFleche(a) {
    const p0 = a.pts[0], p1 = a.pts[1], w = a.width || 2;
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const L = Math.min(len * 0.6, Math.max(9, w * 5)), H = L * 0.5;
    const bx = p1[0] - ux * L, by = p1[1] - uy * L;
    return { depart: p0, pied: [bx, by], tete: [[p1[0], p1[1]], [bx - uy * H, by + ux * H], [bx + uy * H, by - ux * H]] };
  }
  function annBounds(a) {
    if (a.type === 'draw' || a.type === 'arrow') {
      const xs = a.pts.map(p => p[0]), ys = a.pts.map(p => p[1]);
      const x = Math.min.apply(null, xs), y = Math.min.apply(null, ys);
      return { x, y, w: Math.max.apply(null, xs) - x, h: Math.max.apply(null, ys) - y };
    }
    return { x: a.x, y: a.y, w: a.w, h: annHauteur(a) };
  }

  function famOf(name) {
    return name === 'Times' ? '"Times New Roman", Times, serif' : name === 'Courier' ? '"Courier New", Courier, monospace' : 'Helvetica, Arial, sans-serif';
  }

  let measureCtx = null;

  function mesurerTexte(texte, size, style) {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    measureCtx.font = style.penche + ' ' + style.poids + ' ' + size + 'px ' + style.famille;
    return measureCtx.measureText(String(texte == null ? '' : texte)).width;
  }

  function wrapText(text, maxW, size, fontName, bold, style) {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    const st = style || { famille: famOf(fontName), poids: bold ? '700' : '400', penche: 'normal' };
    measureCtx.font = st.penche + ' ' + st.poids + ' ' + size + 'px ' + st.famille;
    const lim = Math.max(10, maxW * 0.98);
    const out = [];
    String(text).split('\n').forEach(par => {
      const words = par.split(/\s+/).filter(w => w.length);
      if (!words.length) { out.push(''); return; }
      let line = '';
      words.forEach(w => {
        const test = line ? line + ' ' + w : w;
        if (!line || measureCtx.measureText(test).width <= lim) line = test;
        else { out.push(line); line = w; }
      });
      out.push(line);
    });
    return out;
  }
