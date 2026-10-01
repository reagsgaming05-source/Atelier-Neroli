  // =====================================================================
  //  Le contrôleur de conformité PDF/A-2b (contrôle interne)
  //  -------------------------------------------------------------------
  //  Un fichier qui se déclare PDF/A sans l'être est pire qu'un fichier qui ne
  //  le dit pas : l'archive qui le recevra le refusera, des années plus tard.
  //  Avant de déclarer « PDF/A-2b », le logiciel contrôle donc ce qu'il vient
  //  d'écrire, et dit précisément ce qui l'en empêche.
  //
  //  Ce contrôle couvre les causes d'échec les plus courantes — polices non
  //  incorporées, chiffrement, scripts et actions interdites, pièces jointes,
  //  formulaires sans apparence, annotations sans apparence ou sans drapeau
  //  d'impression, métadonnées XMP, intention de sortie.
  //  Il n'est PAS un validateur complet de la norme (qui compte plus de cent
  //  quarante règles) : ni les profils de couleur d'un fichier reçu, ni les
  //  limites de taille de la norme, ni la structure de ses images ne sont lus.
  //  Les documents que produit le logiciel sont, eux, validés à chaque
  //  construction par veraPDF, le validateur de référence (voir la suite de
  //  tests) ; pour un fichier qui vous est confié, veraPDF reste le juge.
  // =====================================================================
  // @debut-conformite
  const PDFA_ACTIONS_INTERDITES = ['/Launch', '/Sound', '/Movie', '/ResetForm', '/ImportData', '/JavaScript', '/Hide', '/SetOCGState', '/Rendition', '/Trans', '/GoTo3DView'];
  const PDFA_ACTIONS_NOMMEES = ['/NextPage', '/PrevPage', '/FirstPage', '/LastPage'];

  const pdfaNom = (d, k) => { try { const v = d.lookup(PDFLib.PDFName.of(k)); return v && v.asString ? v.asString() : ''; } catch (e) { return ''; } };
  const pdfaDict = (d, k) => {
    try { const v = d.lookup(PDFLib.PDFName.of(k)); if (v instanceof PDFLib.PDFDict) return v; if (v instanceof PDFLib.PDFStream) return v.dict; return null; } catch (e) { return null; }
  };
  const pdfaTableau = (d, k) => { try { const v = d.lookup(PDFLib.PDFName.of(k)); return v instanceof PDFLib.PDFArray ? v : null; } catch (e) { return null; } };

  // Une police est incorporée quand son descripteur porte le programme de la police.
  function pdfaPoliceIncorporee(fd) {
    const { PDFName, PDFDict } = PDFLib;
    const sous = pdfaNom(fd, 'Subtype');
    if (sous === '/Type3') return true;
    let desc = null;
    if (sous === '/Type0') {
      const df = pdfaTableau(fd, 'DescendantFonts');
      const f0 = df && df.size() ? df.lookup(0) : null;
      desc = f0 instanceof PDFDict ? pdfaDict(f0, 'FontDescriptor') : null;
    } else desc = pdfaDict(fd, 'FontDescriptor');
    return !!(desc && (desc.has(PDFName.of('FontFile')) || desc.has(PDFName.of('FontFile2')) || desc.has(PDFName.of('FontFile3'))));
  }
  // Les polices que des ressources (page, formulaire, apparence d'annotation) citent sans
  // les incorporer, par leur nom de base : `sortie` est une Map nom -> true.
  function pdfaPolicesAbsentes(doc, res, sortie, visite) {
    const { PDFDict, PDFStream } = PDFLib;
    if (!(res instanceof PDFDict) || visite.has(res)) return;
    visite.add(res);
    const cible = x => { try { return doc.context.lookup(x); } catch (e) { return undefined; } };
    const polices = pdfaDict(res, 'Font');
    if (polices) polices.entries().forEach(([k, v]) => {
      const fd = cible(v);
      if (fd instanceof PDFDict && !pdfaPoliceIncorporee(fd)) sortie.set(pdfaNom(fd, 'BaseFont') || String(k), true);
    });
    const xo = pdfaDict(res, 'XObject');
    if (xo) xo.entries().forEach(([, v]) => {
      const x = cible(v);
      if (x instanceof PDFStream && pdfaNom(x.dict, 'Subtype') === '/Form') pdfaPolicesAbsentes(doc, pdfaDict(x.dict, 'Resources'), sortie, visite);
    });
  }
  // Les polices non incorporées d'une page, en clair (« Arial », « Helvetica »).
  function policesAbsentesDeLaPage(doc, page) {
    const sortie = new Map();
    pdfaPolicesAbsentes(doc, page.node.Resources(), sortie, new Set());
    return Array.from(sortie.keys()).map(b => String(b).replace(/^\//, '').replace(/^[A-Z]{6}\+/, ''));
  }

  // Le contrôle lit le document tel que pdf-lib l'a en mémoire : rien n'est écrit.
  // doc : un PDFDocument. Rend { problemes, corrigeables, regles }, où chaque
  // problème est { code, page (1-based, 0 si le document entier), texte, corrigeable }.
  function controlerPdfa(doc, options) {
    const L = PDFLib;
    const { PDFName, PDFDict, PDFArray, PDFStream } = L;
    const o = options || {};
    const ctx = doc.context;
    const problemes = [];
    let regles = 0;
    const dire = (code, page, texte, corrigeable) => problemes.push({ code, page: page || 0, texte, corrigeable: !!corrigeable });
    const nom = (d, k) => { try { const v = d.lookup(PDFName.of(k)); return v && v.asString ? v.asString() : ''; } catch (e) { return ''; } };
    const dict = (d, k) => { try { const v = d.lookup(PDFName.of(k)); if (v instanceof PDFDict) return v; if (v instanceof PDFStream) return v.dict; return null; } catch (e) { return null; } };
    const tableau = (d, k) => { try { const v = d.lookup(PDFName.of(k)); return v instanceof PDFArray ? v : null; } catch (e) { return null; } };
    const cible = x => { try { return ctx.lookup(x); } catch (e) { return undefined; } };

    // 1. Chiffrement : un PDF/A ne se chiffre pas.
    regles++;
    try { if (ctx.trailerInfo && ctx.trailerInfo.Encrypt) dire('chiffrement', 0, 'Le document est protégé par un mot de passe : un PDF/A ne peut pas être chiffré.', false); } catch (e) { signaler('Contrôle PDF/A', e, 'info'); }

    // 2. Actions interdites : scripts, lancement de programmes, son, vidéo…
    const actionsInterdites = (a, ou, page) => {
      if (!(a instanceof PDFDict)) return;
      const s = nom(a, 'S');
      if (PDFA_ACTIONS_INTERDITES.indexOf(s) >= 0) dire('action', page, 'Une action « ' + s.slice(1) + ' » (' + ou + ') est interdite dans un PDF/A.', true);
      else if (s === '/Named' && PDFA_ACTIONS_NOMMEES.indexOf(nom(a, 'N')) < 0) dire('action', page, 'Une action nommée « ' + nom(a, 'N').slice(1) + ' » (' + ou + ') est interdite dans un PDF/A.', true);
      const suite = a.lookup(PDFName.of('Next'));
      if (suite instanceof PDFDict) actionsInterdites(suite, ou, page);
      else if (suite instanceof PDFArray) for (let i = 0; i < suite.size(); i++) actionsInterdites(suite.lookup(i), ou, page);
    };
    const actionsAA = (d, ou, page) => {
      const aa = dict(d, 'AA');
      if (aa) { dire('action', page, 'Des actions automatiques (' + ou + ') sont interdites dans un PDF/A.', true); }
    };
    regles++;
    const cat = doc.catalog;
    try {
      actionsInterdites(cat.lookup(PDFName.of('OpenAction')), 'à l\'ouverture', 0);
      actionsAA(cat, 'document', 0);
      const noms = dict(cat, 'Names');
      if (noms && noms.has(PDFName.of('JavaScript'))) dire('action', 0, 'Le document contient des scripts JavaScript : interdits dans un PDF/A.', true);
      // 4. Fichiers incorporés : 2b n'en accepte pas (le niveau 2 ne les admet que s'ils sont eux-mêmes PDF/A).
      regles++;
      if (noms && noms.has(PDFName.of('EmbeddedFiles'))) dire('pieces-jointes', 0, 'Le document contient des fichiers joints : le PDF/A-2b n\'en admet pas.', true);
      if (cat.has(PDFName.of('AF'))) dire('pieces-jointes', 0, 'Le document porte des fichiers associés : le PDF/A-2b n\'en admet pas.', true);
    } catch (e) { signaler('Contrôle PDF/A', e, 'info'); }

    // 5. Formulaires : pas de XFA, pas de « NeedAppearances », une apparence à chaque champ.
    regles++;
    try {
      const form = dict(cat, 'AcroForm');
      if (form) {
        if (form.has(PDFName.of('XFA'))) dire('formulaire', 0, 'Le formulaire est de type XFA : interdit dans un PDF/A.', true);
        const na = form.lookup(PDFName.of('NeedAppearances'));
        if (na && String(na) === 'true') dire('formulaire', 0, 'Le formulaire demande à être redessiné à l\'ouverture (NeedAppearances) : interdit dans un PDF/A.', true);
      }
    } catch (e) { signaler('Contrôle PDF/A', e, 'info'); }

    // 3 et 6. Polices et annotations, page par page.
    const pages = doc.getPages();
    regles += 3;
    pages.forEach((pg, i) => {
      const n = i + 1;
      try {
        const sans = new Map();
        const visite = new Set();
        pdfaPolicesAbsentes(doc, pg.node.Resources(), sans, visite);
        const annots = tableau(pg.node, 'Annots');
        if (annots) for (let k = 0; k < annots.size(); k++) {
          const a = annots.lookup(k);
          if (!(a instanceof PDFDict)) continue;
          const st = nom(a, 'Subtype');
          // L'apparence d'une annotation peut citer ses propres polices.
          const ap = dict(a, 'AP');
          const normal = ap && ap.lookup(PDFName.of('N'));
          const flux = normal instanceof PDFStream ? [normal] : normal instanceof PDFDict ? normal.entries().map(([, v]) => cible(v)).filter(x => x instanceof PDFStream) : [];
          flux.forEach(f => pdfaPolicesAbsentes(doc, dict(f.dict, 'Resources'), sans, visite));
          if (st !== '/Popup') {
            // Une annotation sans surface (largeur et hauteur nulles) est dispensée d'apparence.
            const rect = tableau(a, 'Rect');
            let nulle = false;
            if (rect && rect.size() === 4) { const v = j => rect.lookup(j).asNumber(); nulle = v(0) === v(2) && v(1) === v(3); }
            if (!ap && st !== '/Link' && !nulle) dire('annotation', n, 'Une annotation « ' + (st || '?').slice(1) + ' » n\'a pas d\'apparence : un PDF/A l\'exige.', false);
            const f = a.lookup(PDFName.of('F'));
            const drap = f && f.asNumber ? f.asNumber() : 0;
            if (!(drap & 4) || (drap & 1) || (drap & 2) || (drap & 32)) dire('annotation', n, 'Une annotation « ' + (st || '?').slice(1) + ' » n\'est pas imprimable ou est cachée : un PDF/A l\'exige imprimable et visible.', true);
          }
          const act = a.lookup(PDFName.of('A'));
          actionsInterdites(act, 'annotation', n);
          actionsAA(a, 'annotation', n);
          if (st === '/FileAttachment') dire('pieces-jointes', n, 'Une annotation de fichier joint : le PDF/A-2b n\'en admet pas.', true);
          if (st === '/Widget' && ap == null) dire('formulaire', n, 'Un champ de formulaire n\'a pas d\'apparence.', false);
        }
        actionsAA(pg.node, 'page', n);
        sans.forEach((_, base) => {
          const propre = String(base).replace(/^\//, '').replace(/^[A-Z]{6}\+/, '');
          dire('police', n, 'La police « ' + propre + ' » n\'est pas incorporée au fichier : un PDF/A l\'exige.', false);
        });
      } catch (e) { signaler('Contrôle PDF/A', e, 'info'); }
    });

    // 7. Ce que la déclaration suppose : XMP et intention de sortie.
    if (o.declaration) {
      regles += 2;
      try {
        const meta = cible(cat.get(PDFName.of('Metadata')));
        let xmp = '';
        if (meta instanceof PDFStream) { try { xmp = new TextDecoder().decode(meta.getContents()); } catch (e) { xmp = ''; } }
        if (!/pdfaid:part(>|=")2/.test(xmp) || !/pdfaid:conformance(>|=")B/i.test(xmp)) dire('metadonnees', 0, 'Les métadonnées XMP ne déclarent pas le niveau PDF/A-2b.', false);
        const oi = tableau(cat, 'OutputIntents');
        if (!oi || !oi.size()) dire('metadonnees', 0, 'Le document n\'a pas d\'intention de sortie (profil de couleur).', false);
      } catch (e) { signaler('Contrôle PDF/A', e, 'info'); }
    }
    return { problemes, regles, corrigeables: problemes.filter(p => p.corrigeable).length };
  }

  // Les corrections qui ne retirent rien d'utile : drapeaux d'impression, actions
  // et scripts, fichiers joints, formulaire à redessiner. Rend ce qui a été retiré,
  // en clair, pour que l'utilisateur le sache.
  function corrigerPourPdfa(doc) {
    const L = PDFLib;
    const { PDFName, PDFDict, PDFArray, PDFNumber } = L;
    const ctx = doc.context;
    const fait = { drapeaux: 0, actions: 0, joints: 0, formulaire: 0 };
    const nom = (d, k) => { try { const v = d.lookup(PDFName.of(k)); return v && v.asString ? v.asString() : ''; } catch (e) { return ''; } };
    const retirer = (d, k) => { const n = PDFName.of(k); if (d.has(n)) { d.delete(n); return true; } return false; };
    const interdite = a => {
      if (!(a instanceof PDFDict)) return false;
      const s = nom(a, 'S');
      return PDFA_ACTIONS_INTERDITES.indexOf(s) >= 0 || (s === '/Named' && PDFA_ACTIONS_NOMMEES.indexOf(nom(a, 'N')) < 0);
    };
    const cat = doc.catalog;
    try {
      if (interdite(cat.lookup(PDFName.of('OpenAction')))) { retirer(cat, 'OpenAction'); fait.actions++; }
      if (retirer(cat, 'AA')) fait.actions++;
      const noms = cat.lookup(PDFName.of('Names'));
      if (noms instanceof PDFDict) {
        if (retirer(noms, 'JavaScript')) fait.actions++;
        if (retirer(noms, 'EmbeddedFiles')) fait.joints++;
      }
      if (retirer(cat, 'AF')) fait.joints++;
      const form = cat.lookup(PDFName.of('AcroForm'));
      if (form instanceof PDFDict) {
        if (retirer(form, 'XFA')) fait.formulaire++;
        if (retirer(form, 'NeedAppearances')) fait.formulaire++;
      }
    } catch (e) { signaler('Correction PDF/A', e, 'info'); }
    doc.getPages().forEach(pg => {
      try {
        if (retirer(pg.node, 'AA')) fait.actions++;
        const annots = pg.node.lookup(PDFName.of('Annots'));
        if (!(annots instanceof PDFArray)) return;
        const gardees = [];
        for (let k = 0; k < annots.size(); k++) {
          const a = annots.lookup(k);
          if (!(a instanceof PDFDict)) { gardees.push(annots.get(k)); continue; }
          if (nom(a, 'Subtype') === '/FileAttachment') { fait.joints++; continue; }
          if (interdite(a.lookup(PDFName.of('A')))) { retirer(a, 'A'); fait.actions++; }
          if (retirer(a, 'AA')) fait.actions++;
          if (nom(a, 'Subtype') !== '/Popup') {
            const f = a.lookup(PDFName.of('F'));
            const d = f && f.asNumber ? f.asNumber() : 0;
            const v = (d | 4) & ~(1 | 2 | 32);
            if (v !== d) { a.set(PDFName.of('F'), PDFNumber.of(v)); fait.drapeaux++; }
          }
          gardees.push(annots.get(k));
        }
        if (gardees.length !== annots.size()) pg.node.set(PDFName.of('Annots'), ctx.obj(gardees));
      } catch (e) { signaler('Correction PDF/A', e, 'info'); }
    });
    return fait;
  }
  // @fin-conformite

  // Ce que la correction a retiré ou changé, en une phrase par chose.
  function direCorrections(fait) {
    const l = [];
    if (fait.actions) l.push(plural(fait.actions, 'script ou action interdite retiré', 'scripts ou actions interdites retirés'));
    if (fait.joints) l.push(plural(fait.joints, 'fichier joint retiré', 'fichiers joints retirés'));
    if (fait.formulaire) l.push('réglages de formulaire interdits retirés');
    if (fait.drapeaux) l.push(plural(fait.drapeaux, 'annotation rendue imprimable', 'annotations rendues imprimables'));
    return l;
  }
