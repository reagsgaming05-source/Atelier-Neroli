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

  // Les motifs qu'on cherche et qu'on caviarde sans connaître la valeur : un numéro AVS, un IBAN, un téléphone. Chaque motif est une
  // expression régulière posée sur le texte sans accents ni coupures ; elle trouve les écritures usuelles (avec des points, des espaces,
  // des tirets, ou rien). Elle attrape volontiers un peu large : pour caviarder, un numéro de trop noirci vaut mieux qu'un numéro oublié.
  const MOTIFS = {
    avs: { libelle: 'Numéro AVS (756.xxxx.xxxx.xx)', rx: '(?<![\\d.])756[.\\s-]?\\d{4}[.\\s-]?\\d{4}[.\\s-]?\\d{2}(?!\\d)' },
    iban: { libelle: 'IBAN suisse ou liechtensteinois', rx: '\\b(?:CH|LI)\\d{2}(?:[ ]?[0-9A-Z]{4}){4}[ ]?[0-9A-Z]\\b' },
    telephone: { libelle: 'Numéro de téléphone suisse', rx: '(?<![\\d])(?:(?:\\+|00)41[\\s.-]?\\(?0?\\)?[\\s.-]?|0)\\d{2}[\\s.-]?\\d{3}[\\s.-]?\\d{2}[\\s.-]?\\d{2}(?!\\d)' },
    courriel: { libelle: 'Adresse de courriel', rx: '[\\p{L}\\p{N}._%+-]+@[\\p{L}\\p{N}.-]+\\.[\\p{L}]{2,}' },
    date: { libelle: 'Date (31.12.2026 ou 31/12/26)', rx: '(?<![\\d])(?:0?[1-9]|[12]\\d|3[01])[./](?:0?[1-9]|1[0-2])[./](?:19|20)?\\d{2}(?!\\d)' },
    ide: { libelle: 'Numéro d\'identification des entreprises (CHE-123.456.789)', rx: '\\bCHE[-.\\s]?\\d{3}[.\\s]?\\d{3}[.\\s]?\\d{3}\\b' },
    plaque: { libelle: 'Plaque de véhicule (VD 123456)', rx: '\\b(?:AG|AI|AR|BE|BL|BS|FR|GE|GL|GR|JU|LU|NE|NW|OW|SG|SH|SO|SZ|TG|TI|UR|VD|VS|ZG|ZH)[ -]?\\d{3,6}\\b' },
    montant: { libelle: 'Montant en francs (CHF 1\'250.50)', rx: '(?:CHF|Fr\\.)\\s?\\d[\\d\'’ ]*(?:[.,]\\d{1,2})?' },
  };
  // L'expression d'un motif, prête à servir (drapeau global, sans casse, Unicode) ; null si le motif est inconnu.
  function regexDuMotif(id) {
    const m = MOTIFS[id];
    return m ? new RegExp(m.rx, 'giu') : null;
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
    let rx;
    if (spec.motif) {
      rx = regexDuMotif(spec.motif);
      if (!rx) return [];
    } else {
      const t = pliee ? plierAccents(spec.terme) : spec.terme;
      const corps = String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      rx = new RegExp(spec.mot ? '(?<![\\p{L}\\p{N}_])' + corps + '(?![\\p{L}\\p{N}_])' : corps, (spec.casse ? 'g' : 'gi') + 'u');
    }
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
  // « Nettoyer le document » : ce qu'un fichier garde sans le dire, retiré à l'export selon ce que la personne a coché. Le document est
  // toujours refait page par page (jamais écrit sur place), si bien que le dictionnaire d'information d'origine, les métadonnées XMP, les
  // pièces jointes du fichier, les scripts du document, ses actions d'ouverture et les versions antérieures ne sont pas reportés : il ne reste
  // à retirer que ce que les pages portent elles-mêmes.
  const NETTOYAGE_DEFAUT = { meta: true, pj: true, scripts: true, vignettes: true, annots: false, signets: false };
  const NETTOYAGE_LIBELLES = [
    ['meta', 'Métadonnées : titre, auteur, sujet, mots-clés, logiciel d\'origine, dates et XMP'],
    ['pj', 'Fichiers joints'],
    ['scripts', 'Scripts et actions (JavaScript, ouverture automatique)'],
    ['vignettes', 'Aperçus de pages et données propres au logiciel d\'origine'],
    ['annots', 'Commentaires et annotations (notes, surlignages, tampons, dessins)'],
    ['signets', 'Signets'],
  ];
  function nettoyerLesPages(out, pagesPdf, o) {
    const { PDFName, PDFDict, PDFArray } = PDFLib;
    const ctx = out.context, N = k => PDFName.of(k);
    const bilan = { annots: 0, pj: 0, scripts: 0, pages: pagesPdf.length };
    pagesPdf.forEach(page => {
      const nd = page.node;
      if (o.vignettes) ['Thumb', 'PieceInfo', 'Metadata', 'LastModified'].forEach(k => nd.delete(N(k)));
      if (o.scripts && nd.has(N('AA'))) { nd.delete(N('AA')); bilan.scripts++; }
      let annots = null;
      try { annots = nd.Annots(); } catch (_) { annots = null; }
      if (!annots) return;
      const garde = [];
      annots.asArray().forEach(item => {
        const a = ctx.lookup(item);
        if (!(a instanceof PDFDict)) { garde.push(item); return; }
        const sub = a.get(N('Subtype')); const st = sub ? sub.toString().slice(1) : '';
        if (o.pj && st === 'FileAttachment') { bilan.pj++; return; }
        if (o.annots && st !== 'Link' && st !== 'Widget' && st !== 'FileAttachment') { bilan.annots++; return; }
        if (o.scripts) {
          const act = ctx.lookup(a.get(N('A')));
          const s = act instanceof PDFDict ? act.get(N('S')) : null;
          if (s && /JavaScript|Launch|ImportData|SubmitForm|GoToR/.test(s.toString())) { a.delete(N('A')); bilan.scripts++; }
          if (a.has(N('AA'))) { a.delete(N('AA')); bilan.scripts++; }
        }
        if (o.vignettes) ['PieceInfo', 'LastModified'].forEach(k => a.delete(N(k)));
        garde.push(item);
      });
      if (garde.length !== annots.size()) nd.set(N('Annots'), ctx.obj(garde));
    });
    if (o.scripts) {
      // Les champs de formulaire portent leurs propres actions, au niveau du dictionnaire des champs.
      try {
        out.getForm().getFields().forEach(f => { const d = f.acroField.dict; if (d.has(N('AA'))) { d.delete(N('AA')); bilan.scripts++; } });
      } catch (_) { /* pas de formulaire */ }
    }
    return bilan;
  }
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

  // =====================================================================
  //  Le caviardage certifié : un journal, et une relecture de la copie
  //  -------------------------------------------------------------------
  //  Un service juridique ne se contente pas d'un « c'est fait » : il veut savoir quoi, où, quand, par quel logiciel, et que la copie a été
  //  relue. Le journal le dit ; la relecture rouvre la copie écrite et y cherche chaque terme, dans le texte de chaque page et dans les
  //  informations du fichier. C'est le contrôle que la secrétaire ferait à la main (« rouvrir la copie, chercher le nom ») — fait pour elle.
  // =====================================================================
  // @debut-journal
  // info : { nom, fichier, quand, logiciel, operateur, pages, pagesCaviardees[], parPage: [[page, zones]], termes: [{ terme, total, parPage: [[page, n]] }],
  //          avecTermes, controle: { fait, restes: [{ page, terme }] }, empreinte }
  function journalDeCaviardage(info) {
    const L = [];
    const pg = tr('p.');
    const liste = pp => pp.map(([p, n]) => pg + ' ' + p + ' : ' + n).join(' ; ');
    L.push(tr('JOURNAL DE CAVIARDAGE'));
    L.push(tr('Document confidentiel : il décrit ce qui a été caviardé. Ne le diffusez pas avec le dossier.'));
    L.push('');
    L.push(tr('Document') + ' : ' + info.nom);
    L.push(tr('Fichier produit') + ' : ' + info.fichier);
    L.push(tr('Date et heure') + ' : ' + info.quand);
    L.push(tr('Logiciel') + ' : ' + info.logiciel);
    if (info.operateur) L.push(tr('Opérateur') + ' : ' + info.operateur);
    L.push(tr('Pages du fichier produit') + ' : ' + info.pages);
    L.push(tr('Pages caviardées, converties en images à 300 ppp') + ' : ' + (info.pagesCaviardees.length ? info.pagesCaviardees.join(', ') : tr('aucune')));
    L.push('');
    L.push(tr('Zones caviardées, par page'));
    L.push('  ' + (info.parPage.length ? liste(info.parPage) : tr('aucune zone')));
    if (info.termes.length) {
      L.push('');
      L.push(tr('Termes caviardés dans tout le document'));
      info.termes.forEach((t, i) => {
        const nom = info.avecTermes ? '« ' + t.terme + ' »' : tr('terme') + ' ' + (i + 1);
        L.push('  ' + nom + ' : ' + t.total + ' ' + tr('occurrences') + (t.parPage.length ? ' (' + liste(t.parPage) + ')' : ''));
      });
      if (!info.avecTermes) L.push('  ' + tr('Les termes ne sont pas inscrits dans ce journal, à votre demande.'));
    }
    L.push('');
    L.push(tr('Retiré du fichier') + ' : ' + tr('métadonnées, informations du document, fichiers joints, scripts, vignettes, commentaires, signets.'));
    L.push(tr('Relecture de la copie') + ' : ' + (!info.controle.fait ? tr('non faite')
      : info.controle.restes.length ? tr('À VÉRIFIER — un terme caviardé a été retrouvé dans la copie') + ' : ' + info.controle.restes.map(r => (r.page ? pg + ' ' + r.page + ' ' : '') + '« ' + (info.avecTermes ? r.terme : '…') + ' »').join(', ')
      : tr('aucun terme caviardé ne se retrouve dans le texte des pages ni dans les informations du fichier.')));
    L.push(tr('Empreinte SHA-256 du fichier produit') + ' : ' + info.empreinte);
    L.push('');
    L.push(tr('Ce contrôle automatique ne remplace pas la relecture du document par une personne avant sa publication.'));
    return L.join('\r\n') + '\r\n';
  }
  // @fin-journal
  // Rouvre la copie écrite et y cherche chaque terme : texte de chaque page, informations du fichier. Rend [{ page, terme }] (page 0 : les informations).
  async function relireLaCopie(octets, specs) {
    const restes = [];
    if (!specs.length) return { fait: true, restes };
    const doc = await pdfjs.getDocument({ data: octets.slice(), isEvalSupported: false }).promise;
    try {
      for (let i = 1; i <= doc.numPages; i++) {
        const pg = await doc.getPage(i);
        const tc = await pg.getTextContent();
        const t = tc.items.map(x => x.str).join(' ');
        specs.forEach(s => { if (occurrencesDe(t, s).length) restes.push({ page: i, terme: s.terme }); });
        pg.cleanup();
      }
      try {
        const md = await doc.getMetadata();
        const infos = JSON.stringify(md && md.info || {}) + ' ' + (md && md.metadata && md.metadata.getRaw ? md.metadata.getRaw() : '');
        specs.forEach(s => { if (occurrencesDe(infos, s).length) restes.push({ page: 0, terme: s.terme }); });
      } catch (e) { signaler('Relecture de la copie', e, 'info'); }
    } finally { try { await doc.destroy(); } catch (e) { signaler('Relecture de la copie', e, 'info'); } }
    return { fait: true, restes };
  }
