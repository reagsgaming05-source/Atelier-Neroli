  // =====================================================================
  //  Plages de pages : « 3-7, 12 »
  //  -------------------------------------------------------------------
  //  Le geste d'Acrobat, partout où l'on désigne des pages : à l'impression,
  //  à la division, et pour sélectionner. Une seule lecture, pour que « 5- »
  //  ou « 3–7 » (tiret demi-cadratin, celui que Word met tout seul) veuillent
  //  dire la même chose dans les trois.
  //   « 3 »     la page 3            « 3-7 »   de la 3 à la 7 (7-3 se lit pareil)
  //   « 5- »    de la 5 à la fin     « -3 »    jusqu'à la 3
  //   « fin »   la dernière page     séparateurs : virgule, point-virgule, ligne
  //  Un numéro hors du document ne désigne rien : on ne le ramène pas sur la
  //  première page. Ce qui n'est pas compris est rendu à part, pour le dire.
  // =====================================================================
  // @debut-plages
  function lireUneBorne(t, max) {
    if (/^(fin|dernière|derniere)$/i.test(t)) return max;
    return /^\d+$/.test(t) ? parseInt(t, 10) : null;
  }
  // Une plage : { a, b } (bornes dans 1..max, a ≤ b), 'hors' si elle ne touche pas le document, null si incomprise.
  function lireUnePlage(brut, max) {
    const t = String(brut).trim().replace(/\s+/g, ' ');
    if (!t) return undefined;
    const m = /^(\S+?)?\s*[-–—]\s*(\S+)?$/.exec(t);
    let a, b;
    if (m && (m[1] || m[2])) {
      a = m[1] != null ? lireUneBorne(m[1], max) : 1;
      b = m[2] != null ? lireUneBorne(m[2], max) : max;
      if (a == null || b == null) return null;
    } else {
      a = b = lireUneBorne(t, max);
      if (a == null) return null;
    }
    if (a > b) { const s = a; a = b; b = s; }
    if (b < 1 || a > max || a < 1 && b < 1) return 'hors';
    return { a: Math.max(1, a), b: Math.min(max, b) };
  }
  // Les pages désignées, une fois chacune, dans l'ordre : { pages: [1-based], ignores: [textes incompris], hors: [textes hors du document] }
  function lirePlages(texte, max) {
    const pages = new Set(), ignores = [], hors = [];
    String(texte == null ? '' : texte).split(/[,;\n]+/).forEach(brut => {
      const r = lireUnePlage(brut, max);
      if (r === undefined) return;
      if (r === null) ignores.push(brut.trim());
      else if (r === 'hors') hors.push(brut.trim());
      else for (let i = r.a; i <= r.b; i++) pages.add(i);
    });
    return { pages: Array.from(pages).sort((x, y) => x - y), ignores, hors };
  }
  // Les plages une à une, dans l'ordre où on les a écrites : « 1-3, 4-6 » fait deux fichiers à la division.
  function lireIntervalles(texte, max) {
    const out = [];
    String(texte == null ? '' : texte).split(/[,;\n]+/).forEach(brut => {
      const r = lireUnePlage(brut, max);
      if (r && r !== 'hors') out.push([r.a, r.b]);
    });
    return out;
  }
  // [1,2,3,5,8,9] → « 1-3, 5, 8-9 »
  function formaterPlages(pages) {
    const l = Array.from(new Set(pages)).sort((x, y) => x - y);
    const out = [];
    for (let i = 0; i < l.length;) {
      let j = i;
      while (j + 1 < l.length && l[j + 1] === l[j] + 1) j++;
      out.push(j > i ? l[i] + '-' + l[j] : String(l[i]));
      i = j + 1;
    }
    return out.join(', ');
  }
  // @fin-plages
