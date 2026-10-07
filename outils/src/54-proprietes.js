  // =====================================================================
  //  Ce qu'un document porte, et qu'une réécriture détruit
  //  -------------------------------------------------------------------
  //  Une signature numérique, une déclaration PDF/A, un balisage d'accessibilité,
  //  un formulaire XFA : chacun tient à la forme exacte du fichier. Ce logiciel
  //  réécrit le fichier à chaque export — c'est inévitable, comme dans
  //  Acrobat quand on modifie un document signé. Ce qui n'est pas permis, c'est
  //  de le faire sans le dire, ou de laisser le fichier prétendre qu'il porte
  //  encore ce qu'il n'a plus : un /ByteRange périmé, un « pdfaid:part 2 » sur
  //  une page qui ne l'est plus.
  //  Chaque propriété est donc lue à l'ouverture, annoncée, rappelée avant
  //  l'enregistrement qui la détruit, et ses marques sont retirées du fichier
  //  produit — sauf PDF/A, que l'on sait refaire quand rien ne l'empêche.
  // =====================================================================
  // Les niveaux que la bibliothèque embarquée sait refaire : le niveau « a » exige un balisage complet.
  const PDFA_NIVEAUX = ['1B', '2B', '2U', '3B', '3U'];
  const nomPdf = (d, k) => { try { const v = d.get(PDFLib.PDFName.of(k)); return v && v.asString ? v.asString() : ''; } catch (_) { return ''; } };

  // Le type de champ d'un dictionnaire, hérité de ses parents.
  function proprFT(doc, d) {
    const { PDFName, PDFDict } = PDFLib;
    for (let i = 0; d instanceof PDFDict && i < 20; i++) {
      const ft = nomPdf(d, 'FT');
      if (ft) return ft;
      d = doc.context.lookup(d.get(PDFName.of('Parent')));
    }
    return '';
  }
  // Une valeur de signature : un dictionnaire /Sig portant /ByteRange.
  function proprEstSignee(doc, champ) {
    const { PDFName, PDFDict } = PDFLib;
    const v = doc.context.lookup(champ.get(PDFName.of('V')));
    return v instanceof PDFDict && (nomPdf(v, 'Type') === '/Sig' || v.has(PDFName.of('ByteRange')) || v.has(PDFName.of('Contents')));
  }
  function proprChamps(doc, liste, sortie, prof) {
    const { PDFName, PDFDict, PDFArray } = PDFLib;
    if (!(liste instanceof PDFArray) || prof > 12) return;
    for (let i = 0; i < liste.size(); i++) {
      const f = doc.context.lookup(liste.get(i));
      if (!(f instanceof PDFDict)) continue;
      sortie.push(f);
      proprChamps(doc, doc.context.lookup(f.get(PDFName.of('Kids'))), sortie, prof + 1);
    }
  }
  const proprXmp = doc => {
    const { PDFName, decodePDFRawStream } = PDFLib;
    try {
      const flux = doc.context.lookup(doc.catalog.get(PDFName.of('Metadata')));
      if (!flux || !flux.dict) return '';
      return new TextDecoder('utf-8').decode(decodePDFRawStream(flux).decode());
    } catch (_) { return ''; }
  };

  async function lireProprietes(src) {
    const { PDFName, PDFDict, PDFNumber } = PDFLib;
    const doc = await loadLib(src);
    const cat = doc.catalog;
    const out = { signatures: 0, certifie: false, pdfa: '', balise: false, pdfua: false, xfa: false };
    // Signatures : le champ porte une valeur /Sig, ou le formulaire se déclare signé.
    const form = doc.context.lookup(cat.get(PDFName.of('AcroForm')));
    if (form instanceof PDFDict) {
      const champs = [];
      proprChamps(doc, doc.context.lookup(form.get(PDFName.of('Fields'))), champs, 0);
      champs.forEach(f => { if (proprFT(doc, f) === '/Sig' && proprEstSignee(doc, f)) out.signatures++; });
      const flags = doc.context.lookup(form.get(PDFName.of('SigFlags')));
      if (!out.signatures && flags instanceof PDFNumber && (flags.asNumber() & 1)) out.signatures = 1;
      if (form.has(PDFName.of('XFA'))) out.xfa = true;
    }
    const perms = doc.context.lookup(cat.get(PDFName.of('Perms')));
    if (perms instanceof PDFDict && perms.has(PDFName.of('DocMDP'))) { out.certifie = true; out.signatures = Math.max(out.signatures, 1); }
    // PDF/A et PDF/UA : déclarés dans le paquet XMP du catalogue.
    const xmp = proprXmp(doc);
    const part = /pdfaid:part(?:>|\s*=\s*["'])\s*(\d)/.exec(xmp);
    const conf = /pdfaid:conformance(?:>|\s*=\s*["'])\s*([A-Za-z])/.exec(xmp);
    if (part) out.pdfa = part[1] + (conf ? conf[1].toUpperCase() : 'B');
    out.pdfua = /pdfuaid:part/.test(xmp);
    // Balisage : une structure, déclarée marquée.
    const marque = doc.context.lookup(cat.get(PDFName.of('MarkInfo')));
    out.balise = cat.has(PDFName.of('StructTreeRoot')) && marque instanceof PDFDict && !!(marque.get(PDFName.of('Marked')) && String(marque.get(PDFName.of('Marked'))) === 'true');
    return out;
  }

  // À l'ouverture : dire ce que le document porte, et ce que cela coûte.
  function annoncerProprietes(src) {
    const p = src.proprietes;
    if (!p) return;
    const dits = [];
    if (p.signatures) dits.push(p.certifie
      ? '« ' + src.name + ' » est un document certifié : toute modification — même un numéro de page — détruit sa signature.'
      : '« ' + src.name + ' » est signé : l\'enregistrer détruit sa signature. La copie ne sera plus signée. L\'outil « Vérifier les signatures » dit si le contenu signé est intact.');
    if (p.xfa) dits.push('« ' + src.name + ' » est un formulaire XFA, un format que ce logiciel ne sait pas remplir ni modifier. Ouvrez-le dans Adobe Reader pour le remplir ; l\'enregistrer ici peut lui faire perdre son formulaire.');
    if (p.pdfa) dits.push('« ' + src.name + ' » déclare le format d\'archivage PDF/A-' + p.pdfa.toLowerCase() + '. Un filigrane, une numérotation, des annotations, la reconnaissance de texte ou un mot de passe lui feront perdre cette conformité : vous serez prévenu avant l\'enregistrement.');
    if (p.balise) dits.push('« ' + src.name + ' » est balisé pour l\'accessibilité (lecteurs d\'écran). Supprimer, déplacer ou extraire des pages détruit ce balisage.');
    dits.forEach(t => { signaler('Document', t, 'info'); });
    if (dits.length) toast(dits[0] + (dits.length > 1 ? ' (' + (dits.length - 1) + ' autre avis dans le journal)' : ''), 'warn');
  }

  // Sources effectivement utilisées par ces pages.
  const proprSources = pages => {
    const ids = new Set(pages.map(p => p.src));
    return state.sources.filter(s => ids.has(s.id));
  };
  // Le document sera-t-il écrit en entier, sur place, ou reconstruit page par page ?
  function proprReconstruit(pages, opts) {
    const specs = (state.purges || []).filter(x => x && x.terme);
    const caviarde = specs.length > 0 || pages.some(p => (p.ann || []).some(a => a.type === 'redact' || (a.type === 'edit' && a.efface)));
    // Un document dont on demande le balisage est lui aussi refait en entier.
    const balise = opts && opts.balise != null ? !!opts.balise : !!(state.meta && state.meta.balise);
    return !!(opts && (opts.noInPlace || opts.rasterize || opts.archivage)) || caviarde || balise || !canExportInPlace(pages);
  }
  // Pourquoi la conformité PDF/A ne peut pas être gardée : ce que l'export ajoute.
  function proprRaisonsPdfa(pages, srcs) {
    const r = [];
    if (state.watermark) r.push('un filigrane');
    if (state.stamp) r.push('une numérotation ou un en-tête');
    if (pages.some(p => (p.ann || []).length)) r.push('des annotations ou des corrections');
    if (pages.some(p => p.ocr)) r.push('la reconnaissance de texte');
    if (state.security) r.push('un mot de passe');
    if (state.dossier) r.push('un dossier de pièces');
    if (srcs.some(s => !s.proprietes || !s.proprietes.pdfa)) r.push('l\'ajout de pages qui ne sont pas du PDF/A');
    if (new Set(srcs.map(s => s.proprietes && s.proprietes.pdfa)).size > 1) r.push('l\'assemblage de documents de niveaux PDF/A différents');
    if (srcs.some(s => s.proprietes && /A$/.test(s.proprietes.pdfa))) r.push('le niveau « a », qui exige un balisage que ce logiciel ne sait pas refaire');
    return r;
  }
  // Le niveau PDF/A que l'export peut garder, ou '' s'il ne le peut pas.
  function proprPdfaGardable(pages, srcs) {
    const declares = srcs.filter(s => s.proprietes && s.proprietes.pdfa);
    if (!declares.length) return '';
    if (proprRaisonsPdfa(pages, srcs).length) return '';
    return declares[0].proprietes.pdfa;
  }

  // Ce que cet export détruit : la liste à montrer avant d'écrire.
  function proprietesPerdues(pages, opts) {
    const srcs = proprSources(pages);
    const pertes = [];
    srcs.forEach(s => {
      const p = s.proprietes;
      if (!p) return;
      if (p.signatures) pertes.push(p.certifie
        ? '« ' + s.name + ' » est certifié : la copie ne sera plus certifiée ni signée, et ne se déclarera plus telle.'
        : '« ' + s.name + ' » est signé : la signature est détruite par l\'enregistrement. La copie ne sera plus signée, et ne se déclarera plus signée.');
      if (p.xfa) pertes.push(proprReconstruit(pages, opts)
        ? '« ' + s.name + ' » est un formulaire XFA : il ne sera pas conservé comme formulaire.'
        : '« ' + s.name + ' » est un formulaire XFA : il est conservé tel quel, mais ce logiciel ne le modifie pas, et ce que vous y ajoutez peut ne pas s\'afficher dans Adobe Reader.');
      if (p.pdfa && !(opts && opts.archivage) && !proprPdfaGardable(pages, srcs)) pertes.push('« ' + s.name + ' » perd sa conformité PDF/A-' + p.pdfa.toLowerCase() + ' (' + proprRaisonsPdfa(pages, srcs).join(', ') + '). La copie ne se déclarera plus PDF/A.');
      if (p.balise && proprReconstruit(pages, opts)) {
        const nouveau = opts && opts.balise != null ? !!opts.balise : !!(state.meta && state.meta.balise);
        pertes.push(nouveau
          ? '« ' + s.name + ' » est balisé : son balisage d\'origine (titres, listes, tableaux) est remplacé par un balisage plus simple, un bloc par page.'
          : '« ' + s.name + ' » perd son balisage d\'accessibilité : le texte ne sera plus lisible comme tel par un lecteur d\'écran.');
      }
    });
    return pertes;
  }
  // Demander avant d'écrire. Les identifiants des boutons sont stables : les
  // scénarios de test et les gestes rapides s'y reconnaissent.
  function confirmerPertes(pertes) {
    return new Promise(res => {
      let repondu = false;
      dialog({
        title: 'Cet enregistrement détruit des propriétés du document',
        icon: IC.info,
        build: b => {
          b.append(note('Ce que le fichier porte aujourd\'hui, et que la copie n\'aura plus :', 'warn'));
          pertes.forEach(t => b.append(note(t)));
          b.append(note('Le fichier d\'origine n\'est pas touché tant que vous ne le remplacez pas : « Enregistrer sous… » en garde une copie.'));
        },
        onClose: () => { if (!repondu) res(false); },
        actions: [
          { id: 'perte-annuler', label: 'Annuler', onClick: close => close() },
          { id: 'perte-continuer', label: 'Enregistrer quand même', peril: true, onClick: close => { repondu = true; res(true); close(); } },
        ],
      });
    });
  }
  async function pertesAcceptees(pages, opts) {
    const pertes = proprietesPerdues(pages, opts);
    return pertes.length ? confirmerPertes(pertes) : true;
  }

  // Dans le fichier produit : plus aucune marque d'une propriété détruite.
  function appliquerProprietes(out, pagesPdf, pages, opts) {
    const { PDFName, PDFDict, PDFArray } = PDFLib;
    const srcs = proprSources(pages);
    const sauve = proprPdfaGardable(pages, srcs);
    // Retirer une référence ne retire pas l'objet : pdf-lib écrit tout ce qu'il
    // a en mémoire. Dès qu'on a ôté quelque chose, les objets que plus rien
    // n'atteint (la valeur de signature, son /ByteRange) sont ramassés, sinon
    // ils resteraient dans le fichier, intacts.
    let retire = false;
    const ote = (d, k) => { const n = PDFName.of(k); if (d.has(n)) { d.delete(n); retire = true; } };

    // 1. Signatures : plus de /Perms, plus de /SigFlags, plus de champ signé. Une zone de signature encore vide, elle, n'a rien à détruire : elle reste.
    //    Le /ByteRange recopié pointerait sur des octets quelconques.
    try { ote(out.catalog, 'Perms'); } catch (e) { signaler('Certification du document non retirée', e); }
    try {
      const form = out.context.lookup(out.catalog.get(PDFName.of('AcroForm')));
      if (form instanceof PDFDict) {
        ote(form, 'SigFlags');
        const champs = out.context.lookup(form.get(PDFName.of('Fields')));
        if (champs instanceof PDFArray) {
          const gardes = [];
          for (let i = 0; i < champs.size(); i++) {
            const f = out.context.lookup(champs.get(i));
            if (f instanceof PDFDict && proprFT(out, f) === '/Sig' && proprEstSignee(out, f)) { retire = true; continue; }
            gardes.push(champs.get(i));
          }
          form.set(PDFName.of('Fields'), out.context.obj(gardes));
        }
        // Un formulaire XFA reconstruit n'est plus cohérent : il ne se déclare plus.
        if (proprReconstruit(pages, opts)) ote(form, 'XFA');
      }
    } catch (e) { signaler('Signatures', e); }
    pagesPdf.forEach(page => {
      try {
        const annots = page.node.Annots();
        if (!annots) return;
        const gardees = [];
        let sig = false;
        for (let i = 0; i < annots.size(); i++) {
          const a = out.context.lookup(annots.get(i));
          if (a instanceof PDFDict && nomPdf(a, 'Subtype') === '/Widget' && proprFT(out, a) === '/Sig' && proprEstSignee(out, a)) { sig = true; continue; }
          gardees.push(annots.get(i));
        }
        if (sig) { page.node.set(PDFName.of('Annots'), out.context.obj(gardees)); retire = true; }
      } catch (e) { signaler('Signatures', e); }
      // Le balisage se reconstruit avec le fichier : ses renvois ne mènent plus nulle part.
      try { if (proprReconstruit(pages, opts) && !(opts && opts.balisee)) ote(page.node, 'StructParents'); } catch (e) { signaler('Renvois du balisage', e); }
    });
    try {
      // Le balisage d'origine ne suit pas ; celui que ce logiciel vient d'écrire, si.
      if (proprReconstruit(pages, opts) && !(opts && opts.balisee)) { ote(out.catalog, 'StructTreeRoot'); ote(out.catalog, 'MarkInfo'); }
    } catch (e) { signaler('Balisage non retiré', e); }

    // L'archivage demandé en PDF/A-2b : contrôlé, corrigé, puis déclaré ou non (voir 53-conformite.js).
    if (opts && opts.archivage) return archiverEnPdfa(out, opts.archivage, retire);

    // 2. PDF/A : refait au même niveau quand rien ne l'empêche — la mécanique
    //    existe dans la bibliothèque embarquée —, sinon la déclaration disparaît.
    if (sauve && PDFA_NIVEAUX.indexOf(sauve) >= 0) {
      try {
        out.convertToPDFA({ conformance: sauve });
        if (retire) ramasserLesObjets(out);
        return { pdfa: sauve };
      } catch (e) { signaler('PDF/A', e); }
    }
    try {
      // Quelle que soit la raison, la déclaration ne reste pas : ni XMP « pdfaid », ni intention de sortie.
      // Les métadonnées que le balisage vient d'écrire (titre, langue) ne déclarent pas PDF/A : elles restent.
      if (!(opts && opts.balisee)) ote(out.catalog, 'Metadata');
      ote(out.catalog, 'OutputIntents');
    } catch (e) { signaler('Déclaration PDF/A non retirée', e); }
    if (retire) { try { ramasserLesObjets(out); } catch (e) { signaler('Propriétés du document', e); } }
    return { pdfa: '' };
  }

  // Le document est contrôlé ; ce qui se corrige sans perte d'information l'est ; il n'est
  // déclaré « PDF/A-2b » que si plus rien ne s'y oppose. `rapport` est rempli pour l'appelant :
  // { corrections, problemes, regles, conforme }.
  function archiverEnPdfa(out, rapport, retire) {
    const { PDFName } = PDFLib;
    try {
      const fait = corrigerPourPdfa(out);
      rapport.corrections = direCorrections(fait);
      if (retire || fait.joints || fait.actions) ramasserLesObjets(out);
      let ctrl = controlerPdfa(out);
      rapport.regles = ctrl.regles;
      rapport.problemes = ctrl.problemes;
      if (!ctrl.problemes.length) {
        out.convertToPDFA({ conformance: '2B' });
        ctrl = controlerPdfa(out, { declaration: true });
        rapport.regles = ctrl.regles;
        rapport.problemes = ctrl.problemes;
      }
    } catch (e) { signaler('Archivage PDF/A', e, 'erreur'); rapport.problemes = (rapport.problemes || []).concat([{ code: 'erreur', page: 0, texte: 'Le contrôle a échoué : ' + (e && e.message ? e.message : e), corrigeable: false }]); }
    rapport.conforme = !(rapport.problemes && rapport.problemes.length);
    if (!rapport.conforme) {
      // Jamais de fausse déclaration : ni XMP « pdfaid », ni intention de sortie.
      try { out.catalog.delete(PDFName.of('Metadata')); out.catalog.delete(PDFName.of('OutputIntents')); } catch (e) { signaler('Déclaration PDF/A non retirée', e); }
      try { ramasserLesObjets(out); } catch (e) { signaler('Archivage PDF/A', e, 'info'); }
    }
    return { pdfa: rapport.conforme ? '2B' : '' };
  }

  // Des caractères que les polices du logiciel ne savent pas écrire : le dire
  // avant d'écrire le fichier, avec le mot où ils figurent, plutôt que de laisser
  // sortir « Wang ? » sans un mot. Les polices incorporées (alphabets latin, grec et
  // cyrillique) ont supprimé l'avertissement pour la plupart des noms ; il reste pour
  // les autres écritures, afin de ne jamais envoyer un document faux sans le dire.
  function caracteresPerdus() { return Array.from(pertesCaracteres.entries()).map(([ch, mot]) => ({ ch, mot })); }
  async function caracteresAcceptes() {
    const l = caracteresPerdus();
    if (!l.length) return true;
    l.forEach(x => signaler('Caractères', '« ' + x.ch + ' » (U+' + x.ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0') + ') n\'a pas pu être écrit' + (x.mot ? ' dans « ' + x.mot + ' »' : '') + ' : il est remplacé par « ? ».'));
    return new Promise(res => {
      let repondu = false;
      dialog({
        title: 'Des caractères ne peuvent pas être écrits', icon: IC.info,
        build: b => {
          b.append(note('Les polices du logiciel (alphabets latin, grec et cyrillique) ne savent pas écrire ces caractères. Dans le fichier, ils seraient remplacés par « ? » :', 'warn'));
          l.slice(0, 8).forEach(x => b.append(note('« ' + x.ch + ' »' + (x.mot ? ' dans « ' + x.mot + ' »' : ''))));
          if (l.length > 8) b.append(note('… et ' + plural(l.length - 8, 'autre', 'autres') + '.'));
          b.append(note('Un nom écrit « Wang ? » est un document qu\'on ne peut pas envoyer. Remplacez ces caractères par des lettres de l\'alphabet latin, ou exportez en connaissance de cause.'));
        },
        onClose: () => { if (!repondu) res(false); },
        actions: [
          { id: 'carac-annuler', label: 'Annuler', onClick: close => close() },
          { id: 'carac-continuer', label: 'Exporter quand même', peril: true, onClick: close => { repondu = true; res(true); close(); } },
        ],
      });
    });
  }
