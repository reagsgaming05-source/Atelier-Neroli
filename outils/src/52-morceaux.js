  // ---------------------------------------------------------------------
  //  Morceaux de ligne : chaque bout garde sa police, sa taille, sa couleur
  // ---------------------------------------------------------------------
  // Une ligne de PDF melange souvent plusieurs styles -- « Montant total :
  // 4 250.00 CHF » ou la moitie est en gras. On ne garde donc pas un style
  // pour toute la ligne mais un par morceau, et la correction les conserve.

  // Cherche sur la page la meme famille dans la graisse ou l'italique voulu.
  // Un document qui contient Arial et Arial-Bold permet ainsi de basculer en
  // gras avec le vrai gras du document, pas un gras de synthese.
  function polVariante(catalogue, pol, gras, italique) {
    if (!pol) return null;
    if (!!pol.gras === !!gras && !!pol.italique === !!italique) return pol;
    const cle = (pol.familles || [])[0] || pol.lisible || '';
    if (!cle) return null;
    let trouve = null;
    (catalogue || []).forEach(c => {
      if (!c || c === pol || trouve) return;
      if (((c.familles || [])[0] || c.lisible || '') !== cle) return;
      if (!!c.gras === !!gras && !!c.italique === !!italique) trouve = c;
    });
    return trouve;
  }

  // Style d'affichage d'un morceau. La police du document n'est reprise que
  // si sa graisse et son italique sont bien ceux demandes ; sinon on passe
  // a la famille systeme, qui sait fabriquer les deux.
  function polAffichageRun(r) {
    const pol = r.pol;
    if (pol && !!pol.gras === !!r.gras && !!pol.italique === !!r.italique) {
      return { famille: pol.css, poids: pol.poids, penche: pol.penche };
    }
    const genre = (pol && pol.genre) || r.genre || 'Helvetica';
    const pile = [];
    if (pol) (pol.familles || []).forEach(n => pile.push('"' + String(n).replace(/["\\]/g, '') + '"'));
    pile.push(genre === 'Times' ? 'serif' : genre === 'Courier' ? 'monospace' : 'sans-serif');
    return { famille: pile.join(', '), poids: r.gras ? '700' : '400', penche: r.italique ? 'italic' : 'normal' };
  }

  function mesurerRun(texte, r) { return mesurerTexte(texte, r.size, polAffichageRun(r)); }

  function runsTexte(runs) { return (runs || []).map(r => r.t).join(''); }

  // Fusionne les morceaux voisins de style identique et jette les vides.
  function runsRanger(runs) {
    const out = [];
    (runs || []).forEach(r => {
      if (!r.t) return;
      const d = out[out.length - 1];
      if (d && d.pol === r.pol && d.gras === r.gras && d.italique === r.italique
        && Math.abs(d.size - r.size) < 0.01 && d.color === r.color) { d.t += r.t; return; }
      out.push(Object.assign({}, r));
    });
    if (out.length) return out;
    const modele = (runs || [])[0];
    return [modele ? Object.assign({}, modele, { t: '' })
      : { t: '', pol: null, genre: 'Helvetica', gras: false, italique: false, size: 12, color: '#111111' }];
  }

  // Replie les morceaux en lignes de jetons : un mot ou une espace, chacun
  // avec sa largeur, pour pouvoir ensuite les poser un par un. `depuis` : on
  // ne replie que le texte à partir de ce caractère (les lignes qui le
  // précèdent sont gardées telles que le document les a faites).
  // `maxW` : la largeur d'une ligne, ou une fonction qui la donne pour la ligne de rang i (une puce ou un alinéa retire de la place aux lignes qui
  // suivent la première).
  function replierRuns(runs, maxW, depuis) {
    const lignes = [];
    const place = () => (typeof maxW === 'function' ? maxW(lignes.length) : maxW);
    let courante = [], largeur = 0, cpos = 0;
    const fermer = () => { lignes.push(courante); courante = []; largeur = 0; };
    runs.forEach((run, i) => {
      String(run.t).split(/(\n|[ \t]+)/).forEach(bout => {
        if (bout === '') return;
        const deb = cpos;
        cpos += bout.length;
        if (depuis && deb < depuis) return;
        if (bout === '\n') { courante.dur = true; fermer(); return; }
        const blanc = !bout.trim();
        if (!courante.length && blanc) return;          // pas d'espace en debut de ligne
        const w = mesurerRun(bout, run);
        if (courante.length && !blanc && largeur + w > place()) {
          // l'espace qui trainait en fin de ligne ne descend pas avec le mot
          while (courante.length && courante[courante.length - 1].blanc) largeur -= courante.pop().w;
          fermer();
        }
        courante.push({ r: i, t: bout, w, blanc, c: deb });
        largeur += w;
      });
    });
    fermer();
    return lignes;
  }

  // Pose les jetons d'une ligne. Un paragraphe justifie repartit le vide
  // entre les mots, comme le faisait le document d'origine.
  function poserJetons(a, seg, limite, derniere, retrait) {
    let naturelle = 0, espaces = 0, mini = 0;
    seg.forEach(j => { naturelle += j.w; if (j.blanc) { espaces++; mini = mini ? Math.min(mini, j.w) : j.w; } });
    let extra = 0;
    if (a.aligne === 'justifie' && !derniere && espaces > 0 && naturelle > limite * 0.55) {
      extra = Math.max((limite - naturelle) / espaces, -mini * 0.6);
    }
    let x = retrait || 0;
    if (a.aligne === 'centre' && a.centreX != null) x = (a.centreX - (a.x + 1)) - naturelle / 2;
    else if (a.aligne === 'droite' && a.droiteX != null) x = (a.droiteX - (a.x + 1)) - naturelle;
    seg.forEach(j => { j.x = x; x += j.w + (j.blanc ? extra : 0); });
    seg.etire = extra !== 0;
  }

  // Les jetons qui se touchent sont écrits d'un seul tenant : le texte du
  // PDF exporté reste copiable en entier, et non mot par mot. Seule une
  // ligne justifiée, dont les blancs sont étirés, reste en morceaux.
  function fondreJetons(seg, jeu) {
    const tol = jeu == null ? 0.01 : jeu;
    const out = [];
    seg.forEach(j => {
      const d = out[out.length - 1];
      if (d && d.r === j.r && Math.abs(d.x + d.w - j.x) <= tol) { d.t += j.t; d.w = j.x + j.w - d.x; return; }
      out.push({ r: j.r, t: j.t, x: j.x, w: j.w, c: j.c });
    });
    return out;
  }

  // Tant que rien n'a été changé, on rejoue exactement la mise en page du
  // document : mêmes coupures de ligne, mêmes positions, mêmes blancs. Replier
  // le texte nous-mêmes, avec nos propres mesures, le ferait bouger dès le
  // premier clic — et c'est justement ce qu'on ne veut pas.
  function edPoserOrigine(a, cible) {
    const gauche = a.x + 1;
    const rang = new Map();
    cible.bouts.forEach((b, i) => rang.set(b, i));
    a.lignes = [];
    a.ly = [];
    let cpos = 0;
    (cible.lignesBouts || []).forEach((bs, i) => {
      const seg = [];
      bs.forEach(b => {
        const r = rang.get(b);
        (b.pos || []).forEach(q => {
          if (r != null && q.t) seg.push({ r, t: q.t, x: q.x - gauche, w: q.w, c: cpos });
          cpos += q.t.length;
        });
      });
      if (!seg.length) return;
      a.lignes.push(fondreJetons(seg, 0.4));
      a.ly.push((cible.lignesBase[i] != null ? cible.lignesBase[i] : cible.base) - a.y);
    });
    if (!a.lignes.length) { recalcRuns(a); return; }
    a.h = cible.h;
    a.intact = true;
    // Ce que le document a fait, à garder : tant qu'une ligne n'est pas touchée par la correction, c'est celle-ci qui reste, au pixel près.
    if (a.origine) {
      a.origine.lignesJetons = a.lignes.map(seg => seg.map(j => Object.assign({}, j)));
      a.origine.ly = a.ly.slice();
      a.origine.runs0 = a.runs.map(r => Object.assign({}, r));
    }
  }

  // Le style d'un morceau, en une clé comparable.
  const runCle = r => [Math.round(r.size * 100), r.gras ? 1 : 0, r.italique ? 1 : 0, r.color, r.pol ? r.pol.nom : '', r.genre || ''].join('|');
  // Le morceau qui porte le caractère `c`.
  function runDuCaractere(runs, c) {
    let pos = 0;
    for (let i = 0; i < runs.length; i++) {
      const f = pos + runs[i].t.length;
      if (c < f) return i;
      pos = f;
    }
    return Math.max(0, runs.length - 1);
  }

  // Ce qui, dans les morceaux, décide de la mise en page. Deux signatures
  // identiques : rien n'a bougé, et la mise en page d'origine doit rester.
  function runsEmpreinte(runs) {
    return JSON.stringify(runsRanger((runs || []).map(r => Object.assign({}, r)))
      .map(r => [r.t, Math.round(r.size * 100), r.gras ? 1 : 0, r.italique ? 1 : 0, r.color, r.genre || '', r.pol ? r.pol.nom : '']));
  }

  // Le premier caractère que la correction a changé : de lettre, ou de style (gras, taille, couleur, police).
  function premiereDifference(a) {
    const o = a.origine;
    const v = o.texte, n = a.text;
    let P = 0;
    while (P < v.length && P < n.length && v[P] === n[P]) P++;
    let pos = 0;
    for (const r0 of o.runs0) {
      const d = pos, f = pos + r0.t.length;
      pos = f;
      if (d >= P) break;
      let q = d;
      while (q < Math.min(f, P)) {
        const i = runDuCaractere(a.runs, q);
        if (!a.runs[i] || runCle(a.runs[i]) !== runCle(r0)) return q;
        let fin = 0;
        for (let k = 0; k <= i; k++) fin += a.runs[k].t.length;
        q = Math.max(q + 1, fin);
      }
    }
    return P;
  }
  // La position, sur la ligne, du caractère numéro `c` du texte : le début du jeton qui le porte, plus la largeur de ce qui le précède dans ce
  // jeton (mesurée avec la police du morceau, corrigée du rapport entre la largeur du jeton dans le document et la nôtre).
  function xDuCaractere(runs, seg, c) {
    for (const j of seg) {
      if (j.c == null || c < j.c || c > j.c + j.t.length) continue;
      if (c === j.c) return j.x;
      const run = runs[j.r];
      if (!run) return j.x;
      // La largeur du jeton dans le document est celle de son texte sans l'espace de fin que nous ajoutons entre deux morceaux : le rapport se prend
      // donc sur le texte rogné, sans quoi tout ce qui précède se trouve raccourci d'une espace, et la correction qui suit se colle au mot d'avant.
      // (Un jeton qui n'est fait que de blancs, comme ceux de la mise en page que nous faisons, porte sa largeur tout entière.)
      const rogne = j.t.trim() ? j.t.replace(/\s+$/, '') : j.t;
      const tout = mesurerRun(rogne, run);
      const k = tout > 0 && j.w > 0 ? Math.max(0.9, Math.min(1.1, j.w / tout)) : 1;
      const avant = c - j.c;
      if (avant <= rogne.length) return j.x + mesurerRun(j.t.slice(0, avant), run) * k;
      return j.x + j.w + mesurerRun(j.t.slice(rogne.length, avant), run) * k;
    }
    return null;
  }
  // Combien de lignes d'origine, depuis le haut, la correction laisse-t-elle intactes ? Une ligne l'est si son texte et le style de chacun de ses
  // morceaux n'ont pas bougé : elle reste alors celle du document, pas une ligne refaite avec nos mesures. La dernière ligne ne l'est jamais :
  // ce qu'on tape après elle la prolonge.
  function lignesIntactes(a, P) {
    const o = a.origine;
    if (!o || !o.lignesJetons || !o.debuts || !o.runs0) return 0;
    let k = 0;
    while (k < o.lignesJetons.length - 1 && (k + 1 < o.debuts.length ? o.debuts[k + 1] : o.texte.length) <= P) k++;
    return k;
  }

  // De combien la ligne de rang `i` du bloc est rentrée, par rapport au bord gauche du bloc, comme le document l'a fait : l'alinéa d'un paragraphe
  // (la première ligne seule), la puce d'une liste (les lignes qui suivent la première partent du texte, pas de la puce). Une ligne refaite
  // reprend ce retrait : sinon la suite d'une puce reviendrait sous la puce.
  function retraitDeLigne(a, i) {
    const o = a.origine;
    if (!o || !o.lignesJetons || !o.lignesJetons.length || (a.aligne !== 'gauche' && a.aligne !== 'justifie')) return 0;
    const L = o.lignesJetons;
    if (i === 0) return L[0][0] ? Math.max(0, L[0][0].x) : 0;
    if (L[1] && L[1][0]) return Math.max(0, L[1][0].x);
    // Une seule ligne d'origine, qui commence par une puce : ce qui s'y ajoute et passe à la ligne repart du texte.
    const puce = L[0][0] && L[0][1] && /^[\s\uf0b7\u2022\u00b7\u25cf\u25aa\u2013\u2014*-]+$|^\s*\d{1,2}[.)]\s*$/.test(L[0][0].t);
    return puce ? Math.max(0, L[0][1].x) : 0;
  }

  // Place chaque ligne : la première garde exactement la ligne de base du
  // document, les suivantes suivent son interligne. Les lignes que la
  // correction n'a pas touchées sont reprises telles que le document les a
  // faites ; le reste est replié à partir de là.
  function recalcRuns(a) {
    a.intact = false;
    a.runs = runsRanger(a.runs);
    a.text = runsTexte(a.runs);
    // Le repli s'autorise une marge : notre mesure ne colle jamais au
    // millimetre a celle du PDF. La justification, elle, vise exactement le
    // bord droit d'origine, sinon le paragraphe s'elargirait a chaque
    // correction.
    const limite = Math.max(12, a.w - 2 + (a.marge || 0));
    const bord = Math.max(12, a.w - 2);
    const o = a.origine;
    const P = o && o.runs0 && o.debuts ? premiereDifference(a) : 0;
    const gardees = lignesIntactes(a, P);
    a.gardees = gardees;
    const depuis = gardees && o.debuts[gardees] != null ? o.debuts[gardees] : 0;
    const retrait = i => retraitDeLigne(a, i);
    const neuves = replierRuns(a.runs, i => limite - retrait(gardees + i), depuis);
    a.size = a.runs.reduce((m, r) => Math.max(m, r.size), 6);
    a.color = a.runs[0].color;
    const corpsDe = seg => seg.reduce((m, j) => Math.max(m, a.runs[j.r] ? a.runs[j.r].size : 0), 0) || a.size;
    const inter = a.interligne > 0 ? a.interligne : a.size * 1.18;
    const lignes = [], ly = [];
    for (let k = 0; k < gardees; k++) {
      const reprise = o.lignesJetons[k].map(j => Object.assign({}, j, { r: runDuCaractere(a.runs, j.c) }));
      reprise.fondu = true;
      lignes.push(reprise);
      ly.push(o.ly[k]);
    }
    let base = a.b0 != null ? a.b0 : a.pad + a.size * 0.82;
    if (gardees) base = o.ly[gardees] != null ? o.ly[gardees] : o.ly[gardees - 1] + inter;
    neuves.forEach((seg, i) => {
      if (i) base += inter;
      ly.push(base);
      poserJetons(a, seg, bord - retrait(gardees + i), i === neuves.length - 1 || !!seg.dur, retrait(gardees + i));
      lignes.push(seg);
    });
    // La première ligne refaite garde, quand elle est tenue à gauche et non étirée, tout ce qui précède le premier caractère changé : ces lettres-là
    // restent celles du document, et seul le reste est écrit — à l'endroit exact où le texte d'origine se poursuivait.
    a.partiel = null;
    if (o && o.runs0 && gardees < o.lignesJetons.length && neuves.length && P > (o.debuts[gardees] || 0) && !neuves[0].etire && (a.aligne === 'gauche' || a.aligne === 'justifie')) {
      const xo = xDuCaractere(o.runs0, o.lignesJetons[gardees], P), xn = xDuCaractere(a.runs, neuves[0], P);
      if (xo != null && xn != null) a.partiel = { ligne: gardees, c: P, dx: xo - xn, x: a.x + 1 + xo };
    }
    a.ly = ly;
    a.lignes = lignes.map(seg => { if (seg.fondu) return seg; const f = fondreJetons(seg); f.dur = seg.dur; f.fondu = true; return f; });
    const fin = corpsDe(a.lignes[a.lignes.length - 1] || []);
    a.h = Math.max(a.pad * 2 + fin, base + fin * 0.36 + a.pad);
  }

  // Les morceaux (coupés au besoin) qui couvrent [debut, fin[ en caractères.
  function runsTranche(runs, debut, fin) {
    const out = [];
    let pos = 0;
    (runs || []).forEach(r => {
      const d = pos, f = pos + r.t.length;
      pos = f;
      if (fin <= d || debut >= f) return;
      out.push(Object.assign({}, r, { t: r.t.slice(Math.max(0, debut - d), Math.min(r.t.length, fin - d)) }));
    });
    return out;
  }

  // Applique une transformation aux morceaux couvrant [debut, fin[ en
  // caracteres, en decoupant proprement les morceaux a cheval.
  function runsAppliquer(a, debut, fin, transformer) {
    const out = [];
    let pos = 0;
    a.runs.forEach(r => {
      const d = pos, f = pos + r.t.length;
      pos = f;
      if (fin <= d || debut >= f) { out.push(r); return; }
      const avant = r.t.slice(0, Math.max(0, debut - d));
      const milieu = r.t.slice(Math.max(0, debut - d), Math.min(r.t.length, fin - d));
      const apres = r.t.slice(Math.min(r.t.length, fin - d));
      if (avant) out.push(Object.assign({}, r, { t: avant }));
      if (milieu) { const c = Object.assign({}, r, { t: milieu }); transformer(c); out.push(c); }
      if (apres) out.push(Object.assign({}, r, { t: apres }));
    });
    a.runs = out;
  }

  // Vrai si tous les morceaux couverts repondent au test.
  function runsTous(a, debut, fin, test) {
    let pos = 0, vu = false, tous = true;
    a.runs.forEach(r => {
      const d = pos, f = pos + r.t.length;
      pos = f;
      if (fin <= d || debut >= f || !r.t.length) return;
      vu = true;
      if (!test(r)) tous = false;
    });
    return vu && tous;
  }

