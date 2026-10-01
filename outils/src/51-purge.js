  // =====================================================================
  //  Purge : ce que « caviarder » doit retirer du fichier, au-delà du texte vu
  //  -------------------------------------------------------------------
  //  Un nom caviardé sur la page peut survivre ailleurs dans le fichier : dans
  //  le titre et l'auteur, dans une note ou un champ de formulaire, dans un
  //  signet, dans une pièce jointe, dans un texte posé hors de la page ou en
  //  taille nulle, dans l'ancienne version d'une page que le fichier garde
  //  encore. Chaque terme caviardé est donc retenu (state.purges) et, à
  //  l'export, cherché sur toutes ces surfaces — le vérificateur indépendant de
  //  test-caviardage/ en regarde quinze.
  // =====================================================================
  const PURGE_MARQUE = '[caviardé]';

  // Un caractère à la fois : « ü » devient « u », « É » devient « E ». La
  // longueur ne change pas, donc une position trouvée dans le texte plié vaut
  // aussi dans l'original — c'est ce qui permet de chercher sans les accents
  // et de retrouver quand même où est le mot.
  function plierAccents(s) {
    let out = '';
    for (const ch of String(s)) {
      const sans = Array.from(ch.normalize('NFD').replace(/\p{M}/gu, ''))[0];
      out += sans && sans.length === ch.length ? sans : ch;
    }
    return out;
  }

  // Le texte sans les coupures de fin de ligne : « Mul-\nler » devient
  // « Muller ». `carte[i]` donne, pour chaque lettre du texte allégé, sa
  // place dans le texte d'origine : une occurrence qui enjambe la coupure
  // couvre alors les deux morceaux.
  function sansCesures(texte) {
    const carte = [];
    let plat = '';
    for (let i = 0; i < texte.length; i++) {
      const c = texte[i];
      if ((c === '-' || c === '­' || c === '‐') && /^\r?\n/.test(texte.slice(i + 1, i + 3)) && i > 0 && /\p{L}/u.test(texte[i - 1])) {
        i += texte[i + 1] === '\r' ? 2 : 1;
        continue;
      }
      plat += c; carte.push(i);
    }
    return { plat, carte };
  }

  // Les occurrences d'un terme dans un texte : [début, fin[ dans ce texte.
  // Insensible aux accents (sauf demande contraire), à la casse (sauf demande
  // contraire) et aux coupures de fin de ligne. Un caviardage manque plutôt
  // trop de précision que trop peu : « Muller » trouve « Müller ».
  function occurrencesDe(texte, spec) {
    if (!texte || !spec || !spec.terme) return [];
    const pliee = !spec.accents;
    const base = pliee ? plierAccents(texte) : texte;
    const { plat, carte } = sansCesures(base);
    const t = pliee ? plierAccents(spec.terme) : spec.terme;
    const corps = String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(spec.mot ? '(?<![\\p{L}\\p{N}_])' + corps + '(?![\\p{L}\\p{N}_])' : corps, (spec.casse ? 'g' : 'gi') + 'u');
    const out = [];
    let m;
    while ((m = rx.exec(plat)) && out.length < 5000) {
      if (!m[0].length) { rx.lastIndex++; continue; }
      out.push([carte[m.index], carte[m.index + m[0].length - 1] + 1]);
    }
    return out;
  }
  const purgeTrouve = (texte, specs) => (specs || []).some(s => occurrencesDe(texte, s).length > 0);
  // Le texte, avec chaque occurrence remplacée par une marque.
  function purgeMasquer(texte, specs) {
    let t = String(texte == null ? '' : texte);
    (specs || []).forEach(s => {
      const occ = occurrencesDe(t, s);
      for (let k = occ.length - 1; k >= 0; k--) t = t.slice(0, occ[k][0]) + tr(PURGE_MARQUE) + t.slice(occ[k][1]);
    });
    return t;
  }

  // Les chaînes d'un flux de contenu, recollées : ce qu'un lecteur en tirerait
  // en copiant-collant, sans dépendre d'une police.
  function purgeTexteDuFlux(octets) {
    let s = '';
    for (let i = 0; i < octets.length; i++) s += String.fromCharCode(octets[i]);
    const out = [];
    const litteral = t => t.replace(/\\([nrtbf])/g, ' ').replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))).replace(/\\(.)/g, '$1');
    const hexa = t => { const h = t.replace(/[^0-9A-Fa-f]/g, ''); let r = ''; for (let i = 0; i + 2 <= h.length; i += 2) r += String.fromCharCode(parseInt(h.substr(i, 2), 16)); return r.replace(/\u0000/g, ''); };
    const rx = /\(((?:\\.|[^\\()])*)\)|<([0-9A-Fa-f\s]{2,})>/g;
    let m;
    while ((m = rx.exec(s))) out.push(m[1] != null ? litteral(m[1]) : hexa(m[2]));
    return { brut: s, texte: out.join('') };
  }

  const CLES_SANS_TEXTE = new Set(['/P', '/Dest', '/Font', '/FontDescriptor', '/FontFile', '/FontFile2', '/FontFile3', '/DescendantFonts',
    '/ToUnicode', '/ColorSpace', '/Shading', '/Pattern', '/ExtGState', '/OC']);

  // Cet objet, ou quelque chose qui n'existe que par lui, porte-t-il le terme ?
  // On parcourt tout ce qu'il atteint — chaînes, flux d'apparence, fichiers
  // joints — sans jamais remonter dans une page, qui n'est pas à lui.
  function purgePorteTerme(doc, racine, specs) {
    const { PDFDict, PDFArray, PDFStream, PDFString, PDFHexString, PDFRef, PDFName, decodePDFRawStream } = PDFLib;
    const vus = new Set();
    const nom = (d, k) => { try { const v = d.get(PDFName.of(k)); return v && v.asString ? v.asString() : ''; } catch (_) { return ''; } };
    const visiter = (o, prof) => {
      if (prof > 40) return false;
      if (o instanceof PDFRef) {
        const cle = String(o);
        if (vus.has(cle)) return false;
        vus.add(cle);
        return visiter(doc.context.lookup(o), prof + 1);
      }
      if (o instanceof PDFString || o instanceof PDFHexString) {
        let t = '';
        try { t = o.decodeText(); } catch (_) { try { t = o.asString(); } catch (e2) { t = ''; } }
        return purgeTrouve(t, specs);
      }
      if (o instanceof PDFStream) {
        if (nom(o.dict, 'Subtype') === '/Image') return false;
        let octets = null;
        try { octets = decodePDFRawStream(o).decode(); } catch (_) { try { octets = o.getContents(); } catch (e2) { octets = null; } }
        if (octets && octets.length && octets.length < 8e6) {
          const { brut, texte } = purgeTexteDuFlux(octets);
          if (purgeTrouve(texte, specs) || purgeTrouve(brut, specs) || purgeTrouve(brut.replace(/\u0000/g, ''), specs)) return true;
        }
        return visiter(o.dict, prof + 1);
      }
      if (o instanceof PDFDict) {
        const type = nom(o, 'Type');
        if (type === '/Page' || type === '/Pages' || type === '/Catalog') return false;
        for (const k of o.keys()) {
          // Ce qui désigne une page n'appartient pas à la note ; les polices et
          // les images n'ont pas de texte à lire, seulement des octets à ne pas
          // parcourir pour rien.
          if (CLES_SANS_TEXTE.has(k.asString())) continue;
          if (visiter(o.get(k), prof + 1)) return true;
        }
        return false;
      }
      if (o instanceof PDFArray) {
        for (let i = 0; i < o.size(); i++) if (visiter(o.get(i), prof + 1)) return true;
      }
      return false;
    };
    return visiter(racine, 0);
  }

  // Retire d'une page les annotations (notes, champs, pièces jointes, tampons)
  // qui portent un des termes caviardés. Une note n'a pas de rectangle à noircir :
  // la retirer est la seule façon sûre.
  function purgeAnnotations(doc, page, specs) {
    const { PDFName, PDFDict } = PDFLib;
    const annots = page.node.Annots();
    if (!annots) return 0;
    const gardees = [];
    let retirees = 0;
    for (let i = 0; i < annots.size(); i++) {
      const ref = annots.get(i);
      let porte = false;
      try {
        const a = doc.context.lookup(ref);
        porte = a instanceof PDFDict && purgePorteTerme(doc, a, specs);
      } catch (e) { signaler('Purge', e); }
      if (porte) retirees++; else gardees.push(ref);
    }
    if (retirees) page.node.set(PDFName.of('Annots'), doc.context.obj(gardees));
    return retirees;
  }

  // Un copier-coller du plan : les titres de signets qui portent le terme sont
  // masqués. La structure ne change pas.
  function purgeSignets(signets, specs) {
    return (signets || []).map(s => Object.assign({}, s, { titre: purgeMasquer(s.titre, specs), enfants: purgeSignets(s.enfants, specs) }));
  }
  function purgeMeta(meta, specs) {
    const m = Object.assign({}, meta || {});
    ['title', 'author', 'subject', 'keywords'].forEach(k => { if (m[k]) m[k] = purgeMasquer(m[k], specs); });
    return m;
  }

  // Ce que le fichier garde sans le dire : tout objet que plus rien n'atteint
  // depuis le catalogue. pdf-lib écrit tout ce qu'il a en mémoire, y compris
  // l'ancien flux d'une page réécrite, l'image d'origine qu'on vient de
  // remplacer, une note qu'on vient de retirer. Un lecteur ne les montre pas ;
  // `strings`, si.
  function ramasserLesObjets(doc) {
    const { PDFRef, PDFDict, PDFArray, PDFStream } = PDFLib;
    const ctx = doc.context;
    const vus = new Set();
    const pile = [];
    const empiler = o => {
      if (o instanceof PDFRef) { const k = String(o); if (!vus.has(k)) { vus.add(k); pile.push(ctx.lookup(o)); } }
      else if (o instanceof PDFDict || o instanceof PDFArray || o instanceof PDFStream) pile.push(o);
    };
    const t = ctx.trailerInfo || {};
    [t.Root, t.Info, t.Encrypt].forEach(empiler);
    if (doc.catalog) pile.push(doc.catalog);
    while (pile.length) {
      const o = pile.pop();
      if (o instanceof PDFStream) pile.push(o.dict);
      else if (o instanceof PDFDict) o.keys().forEach(k => empiler(o.get(k)));
      else if (o instanceof PDFArray) for (let i = 0; i < o.size(); i++) empiler(o.get(i));
    }
    let retires = 0;
    const tous = [];
    ctx.enumerateIndirectObjects().forEach(([ref]) => { if (!vus.has(String(ref))) tous.push(ref); });
    let echecs = 0;
    tous.forEach(ref => { try { ctx.delete(ref); retires++; } catch (_) { echecs++; } });
    // Un objet qui reste, c'est peut-être ce qu'on voulait faire disparaître.
    if (echecs) signaler('Purge', new Error(plural(echecs, 'objet inaccessible n\'a pas pu être retiré du fichier', 'objets inaccessibles n\'ont pas pu être retirés du fichier')), 'erreur');
    return retires;
  }

  // Applique la purge à un document déjà assemblé : sur chaque page, ses
  // métadonnées propres et les annotations qui portent le terme ; puis le
  // ramasse-miettes. Rend un décompte pour le journal.
  function purgerLeDocument(out, pagesPdf, specs) {
    const { PDFName } = PDFLib;
    let notes = 0;
    pagesPdf.forEach(page => {
      try { page.node.delete(PDFName.of('Metadata')); } catch (e) { signaler('Métadonnées de page non retirées', e); }
      try { notes += purgeAnnotations(out, page, specs); } catch (e) { signaler('Purge', e); }
    });
    try { out.catalog.delete(PDFName.of('Metadata')); } catch (e) { signaler('Métadonnées du document non retirées', e); }
    const orphelins = ramasserLesObjets(out);
    return { notes, orphelins };
  }

  // Ce que le fichier porte du terme ailleurs qu'à l'écran : le dialogue de
  // recherche le dit avant qu'on caviarde, parce qu'un « 3 occurrences » qui
  // n'en compte que les visibles laisserait croire que c'est fini.
  // `visibles` : combien d'occurrences l'écran a trouvées, page par page.
  async function purgeInventaire(spec, visibles, annule) {
    const specs = [spec];
    const res = { metadonnees: 0, notes: 0, signets: 0, texteCache: 0 };
    const compterSignets = l => (l || []).forEach(sg => { if (purgeTrouve(sg.titre, specs)) res.signets++; compterSignets(sg.enfants); });
    compterSignets(state.signets);
    if (purgeTrouve(Object.values(state.meta || {}).join(' \n '), specs)) res.metadonnees++;
    const { PDFName, PDFDict } = PDFLib;
    const docs = new Map(), polices = new Map();
    const tour = cadence();
    for (let i = 0; i < state.pages.length; i++) {
      if (annule && annule()) return null;
      const p = state.pages[i];
      const src = srcById(p.src);
      if (!src || src.isSample) continue;
      let doc = docs.get(src.id);
      if (doc === undefined) {
        try { doc = await loadLib(src); } catch (e) { signaler('Purge', e); doc = null; }
        docs.set(src.id, doc);
        if (doc) {
          try {
            const infoRef = doc.context.trailerInfo && doc.context.trailerInfo.Info;
            const info = infoRef && doc.context.lookup(infoRef);
            if (info instanceof PDFDict && purgePorteTerme(doc, info, specs)) res.metadonnees++;
            const xmp = doc.catalog.get(PDFName.of('Metadata'));
            if (xmp && purgePorteTerme(doc, xmp, specs)) res.metadonnees++;
          } catch (e) { signaler('Purge', e); }
        }
      }
      if (!doc) continue;
      const page = doc.getPages()[p.index];
      if (!page) continue;
      try {
        const annots = page.node.Annots();
        for (let k = 0; annots && k < annots.size(); k++) {
          const a = doc.context.lookup(annots.get(k));
          if (a instanceof PDFDict && purgePorteTerme(doc, a, specs)) res.notes++;
        }
        const flux = fxFluxPage(doc, page);
        if (flux) {
          const shows = fxAffichages(flux.octets, nom => fxPolice(doc, page, nom, polices));
          const dansLeFlux = fxCompterTermes(shows, specs);
          res.texteCache += Math.max(0, dansLeFlux - ((visibles && visibles.get(p.id)) || 0));
        }
      } catch (e) { signaler('Purge', e); }
      await tour();
    }
    res.total = res.metadonnees + res.notes + res.signets + res.texteCache;
    return res;
  }
