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
  // avec sa largeur, pour pouvoir ensuite les poser un par un.
  function replierRuns(runs, maxW) {
    const lignes = [];
    let courante = [], largeur = 0;
    const fermer = () => { lignes.push(courante); courante = []; largeur = 0; };
    runs.forEach((run, i) => {
      String(run.t).split(/(\n|[ \t]+)/).forEach(bout => {
        if (bout === '') return;
        if (bout === '\n') { courante.dur = true; fermer(); return; }
        const blanc = !bout.trim();
        if (!courante.length && blanc) return;          // pas d'espace en debut de ligne
        const w = mesurerRun(bout, run);
        if (courante.length && !blanc && largeur + w > maxW) {
          // l'espace qui trainait en fin de ligne ne descend pas avec le mot
          while (courante.length && courante[courante.length - 1].blanc) largeur -= courante.pop().w;
          fermer();
        }
        courante.push({ r: i, t: bout, w, blanc });
        largeur += w;
      });
    });
    fermer();
    return lignes;
  }

  // Pose les jetons d'une ligne. Un paragraphe justifie repartit le vide
  // entre les mots, comme le faisait le document d'origine.
  function poserJetons(a, seg, limite, derniere) {
    let naturelle = 0, espaces = 0, mini = 0;
    seg.forEach(j => { naturelle += j.w; if (j.blanc) { espaces++; mini = mini ? Math.min(mini, j.w) : j.w; } });
    let extra = 0;
    if (a.aligne === 'justifie' && !derniere && espaces > 0 && naturelle > limite * 0.55) {
      extra = Math.max((limite - naturelle) / espaces, -mini * 0.6);
    }
    let x = 0;
    if (a.aligne === 'centre' && a.centreX != null) x = (a.centreX - (a.x + 1)) - naturelle / 2;
    else if (a.aligne === 'droite' && a.droiteX != null) x = (a.droiteX - (a.x + 1)) - naturelle;
    seg.forEach(j => { j.x = x; x += j.w + (j.blanc ? extra : 0); });
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
      out.push({ r: j.r, t: j.t, x: j.x, w: j.w });
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
    (cible.lignesBouts || []).forEach((bs, i) => {
      const seg = [];
      bs.forEach(b => {
        const r = rang.get(b);
        if (r == null) return;
        (b.pos || []).forEach(q => { if (q.t) seg.push({ r, t: q.t, x: q.x - gauche, w: q.w }); });
      });
      if (!seg.length) return;
      a.lignes.push(fondreJetons(seg, 0.4));
      a.ly.push((cible.lignesBase[i] != null ? cible.lignesBase[i] : cible.base) - a.y);
    });
    if (!a.lignes.length) { recalcRuns(a); return; }
    a.h = cible.h;
    a.intact = true;
  }

  // Ce qui, dans les morceaux, décide de la mise en page. Deux signatures
  // identiques : rien n'a bougé, et la mise en page d'origine doit rester.
  function runsEmpreinte(runs) {
    return JSON.stringify(runsRanger((runs || []).map(r => Object.assign({}, r)))
      .map(r => [r.t, Math.round(r.size * 100), r.gras ? 1 : 0, r.italique ? 1 : 0, r.color, r.genre || '', r.pol ? r.pol.nom : '']));
  }

  // Place chaque ligne : la première garde exactement la ligne de base du
  // document, les suivantes suivent son interligne.
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
    a.lignes = replierRuns(a.runs, limite);
    a.size = a.runs.reduce((m, r) => Math.max(m, r.size), 6);
    a.color = a.runs[0].color;
    const corpsDe = seg => seg.reduce((m, j) => Math.max(m, a.runs[j.r] ? a.runs[j.r].size : 0), 0) || a.size;
    const inter = a.interligne > 0 ? a.interligne : a.size * 1.18;
    a.ly = [];
    let base = a.b0 != null ? a.b0 : a.pad + a.size * 0.82;
    a.lignes.forEach((seg, i) => {
      if (i) base += inter;
      a.ly.push(base);
      poserJetons(a, seg, bord, i === a.lignes.length - 1 || !!seg.dur);
    });
    a.lignes = a.lignes.map(seg => { const f = fondreJetons(seg); f.dur = seg.dur; return f; });
    const fin = corpsDe(a.lignes[a.lignes.length - 1] || []);
    a.h = Math.max(a.pad * 2 + fin, base + fin * 0.36 + a.pad);
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

