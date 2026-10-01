  // =====================================================================
  //  Le balisage d'accessibilité des documents produits (PDF balisé)
  //  -------------------------------------------------------------------
  //  Un lecteur d'écran ne lit pas des pages : il lit une structure — titres,
  //  paragraphes, listes — et l'ordre dans lequel il doit la parcourir. Un PDF
  //  « balisé » porte cette structure. Ce logiciel la fabrique pour ce qu'il
  //  connaît de l'intérieur ; il ne la devine pas pour le reste.
  //
  //  Ce que le fichier produit contient, quand le balisage est demandé :
  //   - la langue du document, son titre (affiché dans la barre de la fenêtre),
  //     la déclaration « balisé », un arbre de structure à sa racine ;
  //   - le sommaire et les intercalaires d'un dossier de pièces, que le logiciel
  //     a écrits : vrais titres, vraie table des matières ;
  //   - les numérotations, en-têtes, pieds de page, filigranes et mentions, déclarés
  //     « artefacts » : un lecteur d'écran ne les relit pas à chaque page ;
  //   - les pages venues d'un autre fichier : un bloc par page, dans l'ordre du
  //     fichier d'origine ; une page scannée sans texte reconnu, une figure dont le
  //     texte de remplacement le dit ; une page dont le texte a été reconnu (OCR),
  //     le texte reconnu en paragraphes et l'image en artefact.
  //  Ce qu'il ne contient pas : titres, listes et tableaux des pages venues d'ailleurs
  //  (cela se devine mal, et un faux titre est pire que pas de titre), balises des liens,
  //  des annotations et des champs de formulaire. Ce n'est donc pas un PDF/UA, et il
  //  ne se déclare pas tel. Le contrôleur ci-dessous dit ce qui manque.
  // =====================================================================
  // @debut-balisage
  const BALISAGE_LANGUES = [['fr', 'Français'], ['de', 'Deutsch'], ['it', 'Italiano'], ['en', 'English']];

  // L'arbre de structure d'un document en cours d'écriture. doc : un PDFDocument de pdf-lib.
  function creerBalisage(doc, options) {
    const { PDFName, PDFNumber, PDFOperator, PDFString, PDFHexString } = PDFLib;
    const ctx = doc.context;
    const o = options || {};
    const pages = [];
    const racine = { role: 'Document', parent: null, attrs: {}, kids: [], ref: ctx.nextRef(), id: null };
    const elements = [racine];
    const nouvel = (role, parent, attrs, id) => {
      const e = { role, parent: parent || racine, attrs: attrs || {}, kids: [], ref: ctx.nextRef(), id: id || null };
      e.parent.kids.push(e);
      elements.push(e);
      return e;
    };
    const lien = (pc, role, parent, attrs, id) => {
      const e = nouvel(role, parent || pc.sect, attrs, id);
      const mcid = pc.suivant++;
      e.kids.push({ pc, mcid });
      pc.proprietaires[mcid] = e;
      return { e, mcid };
    };
    const B = {
      elements,
      // Une page du document : son numéro de clé dans l'arbre, et une section qui la regroupe.
      page(page) {
        const pc = { page, index: pages.length, suivant: 0, proprietaires: [], sect: null, ouverte: false, sansContenu: false };
        pc.sect = nouvel('Sect', racine, {});
        pages.push(pc);
        return pc;
      },
      // Ouvrir, dans le flux de la page, une séquence de contenu balisée ; fermer(pc) la ferme.
      ouvrir(pc, role, attrs, parent) {
        const { e, mcid } = lien(pc, role, parent, attrs);
        pc.page.pushOperators(PDFOperator.of('BDC', [PDFName.of(role), ctx.obj({ MCID: mcid })]));
        return e;
      },
      // Une séquence « artefact » : du contenu que la structure ne porte pas (pagination, filigrane).
      ouvrirArtefact(pc, sousType) {
        const props = { Type: 'Pagination' };
        if (sousType) props.Subtype = sousType;
        pc.page.pushOperators(PDFOperator.of('BDC', [PDFName.of('Artifact'), ctx.obj(props)]));
      },
      fermer(pc) { pc.page.pushOperators(PDFOperator.of('EMC', [])); },
      // Envelopper ce que la page contient déjà (son flux d'origine) dans une séquence balisée.
      envelopper(pc, role, attrs, parent) {
        const mcid = pc.suivant;
        const debut = ctx.register(ctx.stream('/' + role + ' <</MCID ' + mcid + '>> BDC\n'));
        const fin = ctx.register(ctx.stream('\nEMC\n'));
        // Un flux unique se met d'abord en liste : seule une liste peut être encadrée.
        pc.page.node.normalize();
        if (!pc.page.node.wrapContentStreams(debut, fin)) return null;
        const e = nouvel(role, parent || pc.sect, attrs);
        pc.suivant++;
        e.kids.push({ pc, mcid });
        pc.proprietaires[mcid] = e;
        return e;
      },
      envelopperArtefact(pc) {
        const debut = ctx.register(ctx.stream('/Artifact BMC\n'));
        const fin = ctx.register(ctx.stream('\nEMC\n'));
        pc.page.node.normalize();
        return pc.page.node.wrapContentStreams(debut, fin);
      },
      // Des séquences déjà présentes dans le flux (une page que le logiciel a écrite avec ses balises) :
      // chaque descripteur { mcid, role, id?, dans?, alt? } est rattaché à son élément.
      adopter(pc, descripteurs) {
        const parId = {};
        (descripteurs || []).forEach(d => {
          if (d.mcid == null) { parId[d.id] = nouvel(d.role, d.dans ? parId[d.dans] : pc.sect, d.attrs || {}, d.id); return; }
          let e = d.id ? parId[d.id] : null;
          if (!e) { e = nouvel(d.role, d.dans ? parId[d.dans] : pc.sect, d.attrs || {}, d.id); if (d.id) parId[d.id] = e; }
          e.kids.push({ pc, mcid: d.mcid });
          pc.proprietaires[d.mcid] = e;
          pc.suivant = Math.max(pc.suivant, d.mcid + 1);
        });
      },
      // Poser l'arbre dans le document : racine, table de renvois, langue, titre.
      terminer() {
        const nom = n => PDFName.of(n);
        const texte = t => (/^[\x20-\x7e]*$/.test(t) ? PDFString.of(t) : PDFHexString.fromText(t));
        // Les éléments sans contenu ne sont pas écrits (une page blanche n'a rien à lire).
        const vivant = e => { if (e.vivant != null) return e.vivant; e.vivant = e.kids.some(k => k.mcid != null || vivant(k)); return e.vivant; };
        elements.forEach(vivant);
        const gardes = elements.filter(e => e === racine || e.vivant);
        gardes.forEach(e => {
          const kids = e.kids.filter(k => k.mcid != null || k.vivant);
          const k = kids.map(x => (x.mcid != null ? ctx.obj({ Type: 'MCR', Pg: x.pc.page.ref, MCID: x.mcid }) : x.ref));
          const d = { Type: 'StructElem', S: e.role };
          if (e !== racine) d.P = e.parent.ref;
          // Un seul contenu : l'élément le désigne directement.
          d.K = k.length === 1 ? k[0] : ctx.obj(k);
          if (e.attrs.alt) d.Alt = texte(e.attrs.alt);
          if (e.attrs.texte) d.ActualText = texte(e.attrs.texte);
          if (e.attrs.langue) d.Lang = PDFString.of(e.attrs.langue);
          if (e.attrs.titre) d.T = texte(e.attrs.titre);
          ctx.assign(e.ref, ctx.obj(d));
        });
        // La table des renvois : pour chaque page, qui possède chaque séquence de contenu.
        const nums = [];
        pages.forEach(pc => {
          // Une page sans contenu balisé ne garde pas un renvoi d'un autre arbre.
          if (!pc.proprietaires.length) { pc.page.node.delete(nom('StructParents')); return; }
          pc.page.node.set(nom('StructParents'), PDFNumber.of(pc.index));
          pc.page.node.set(nom('Tabs'), nom('S'));
          nums.push(PDFNumber.of(pc.index), ctx.obj(pc.proprietaires.map(e => (e && e.vivant ? e.ref : null))));
        });
        const parentTree = ctx.register(ctx.obj({ Nums: nums }));
        const struct = ctx.register(ctx.obj({ Type: 'StructTreeRoot', K: racine.ref, ParentTree: parentTree, ParentTreeNextKey: pages.length }));
        ctx.lookup(racine.ref).set(nom('P'), struct);
        doc.catalog.set(nom('StructTreeRoot'), struct);
        doc.catalog.set(nom('MarkInfo'), ctx.obj({ Marked: true }));
        doc.catalog.set(nom('Lang'), PDFString.of(o.langue || codeLangue()));
        doc.catalog.set(nom('ViewerPreferences'), ctx.obj({ DisplayDocTitle: true }));
        if (o.titre) doc.setTitle(o.titre);
        // Des métadonnées XMP (titre, langue, producteur) : ce que les outils d'accessibilité et les archives lisent.
        // Pas de déclaration PDF/UA : elle n'est pas tenue (liens, annotations, formulaires).
        if (!o.sansXmp && !doc.catalog.has(nom('Metadata'))) {
          const x = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&apos;' }[c]));
          const xmp = '<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>\n<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
            + '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">'
            + '<dc:title><rdf:Alt><rdf:li xml:lang="x-default">' + x(o.titre || '') + '</rdf:li></rdf:Alt></dc:title>'
            + '<dc:language><rdf:Bag><rdf:li>' + x(o.langue || codeLangue()) + '</rdf:li></rdf:Bag></dc:language>'
            + '<pdf:Producer>' + x(o.producteur || '') + '</pdf:Producer></rdf:Description></rdf:RDF></x:xmpmeta>\n<?xpacket end="w"?>';
          doc.catalog.set(nom('Metadata'), ctx.register(ctx.stream(new TextEncoder().encode(xmp), { Type: 'Metadata', Subtype: 'XML' })));
        }
        return { elements: gardes.length, pages: pages.length };
      },
    };
    return B;
  }

  // Ce que le balisage d'un document contient et ne contient pas : { balise, problemes: [texte], avis: [texte] }.
  function controlerBalisage(doc) {
    const { PDFName, PDFDict, PDFArray, PDFNumber } = PDFLib;
    const problemes = [], avis = [];
    const cat = doc.catalog;
    const get = (d, k) => { try { return d.lookup(PDFName.of(k)); } catch (e) { return undefined; } };
    const marque = get(cat, 'MarkInfo');
    const struct = get(cat, 'StructTreeRoot');
    const balise = marque instanceof PDFDict && String(marque.get(PDFName.of('Marked'))) === 'true' && struct instanceof PDFDict;
    if (!balise) return { balise: false, problemes: ['Le document n\'est pas balisé.'], avis, elements: 0 };
    const lang = get(cat, 'Lang');
    if (!lang) problemes.push('La langue du document n\'est pas déclarée (/Lang).');
    const titre = (() => { try { return doc.getTitle(); } catch (e) { return ''; } })();
    if (!titre) problemes.push('Le document n\'a pas de titre.');
    const vp = get(cat, 'ViewerPreferences');
    if (!(vp instanceof PDFDict) || String(vp.get(PDFName.of('DisplayDocTitle'))) !== 'true') problemes.push('Le titre n\'est pas affiché dans la barre de la fenêtre (DisplayDocTitle).');
    // Les éléments : on les compte, on vérifie que chaque figure porte un texte de remplacement.
    let n = 0, figuresSansAlt = 0;
    const vus = new Set();
    const visiter = e => {
      if (!(e instanceof PDFDict) || vus.has(e) || n > 200000) return;
      vus.add(e); n++;
      const s = get(e, 'S');
      if (s && String(s) === '/Figure' && !e.has(PDFName.of('Alt')) && !e.has(PDFName.of('ActualText'))) figuresSansAlt++;
      const k = get(e, 'K');
      if (k instanceof PDFArray) for (let i = 0; i < k.size(); i++) visiter(k.lookup(i));
      else visiter(k);
    };
    visiter(get(struct, 'K'));
    if (figuresSansAlt) problemes.push(plural(figuresSansAlt, 'figure sans texte de remplacement', 'figures sans texte de remplacement') + '.');
    const pages = doc.getPages();
    const sansStruct = pages.filter(p => { const sp = get(p.node, 'StructParents'); return !(sp instanceof PDFNumber); }).length;
    if (sansStruct) avis.push(plural(sansStruct, 'page n\'a pas de contenu balisé (page blanche ?)', 'pages n\'ont pas de contenu balisé (pages blanches ?)') + '.');
    avis.push('Les liens, annotations et champs de formulaire ne sont pas rattachés à la structure : ce n\'est pas un PDF/UA.');
    return { balise: true, problemes, avis, elements: n, langue: lang ? String(lang).replace(/[()]/g, '') : '' };
  }
  // @fin-balisage

  // Écrire dans le flux une séquence balisée autour de `travail`, si le balisage est actif.
  async function baliser(B, pc, role, attrs, travail) {
    if (!B || !pc) return travail();
    B.ouvrir(pc, role, attrs);
    try { return await travail(); } finally { B.fermer(pc); }
  }
  async function artefact(B, pc, sousType, travail) {
    if (!B || !pc) return travail();
    B.ouvrirArtefact(pc, sousType);
    try { return await travail(); } finally { B.fermer(pc); }
  }

  // La structure d'une page qui n'a pas été écrite par le logiciel : un bloc par page, ou une figure
  // quand la page n'a pas de texte, ou rien (artefact) quand son texte est celui de la reconnaissance de texte.
  async function baliserPageSource(B, PB, p, raster, numero) {
    const src = srcById(p.src);
    // Une page que le logiciel a fabriquée (sommaire, intercalaire) porte déjà ses balises.
    if (src && src.genere && src.structure && src.structure[p.index] && !raster) { B.adopter(PB, src.structure[p.index]); return; }
    if (p.ocr && p.ocr.mots && p.ocr.mots.length) { B.envelopperArtefact(PB); return; }
    let avecTexte = false;
    if (!raster) { try { avecTexte = !!(await getPageText(p)); } catch (e) { signaler('Balisage', e, 'info'); } }
    if (avecTexte) B.envelopper(PB, 'Div', {});
    else B.envelopper(PB, 'Figure', { alt: raster
      ? 'Page ' + numero + ', convertie en image : son texte n\'est pas lisible par un lecteur d\'écran.'
      : 'Page ' + numero + ' sans texte (image ou numérisation) : lancez la reconnaissance de texte pour la rendre lisible par un lecteur d\'écran.' });
  }
