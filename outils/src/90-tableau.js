  // =====================================================================
  //  Copier un tableau vers Excel
  //  -------------------------------------------------------------------
  //  Les morceaux de texte de la page sont rangés en rangées (même ligne de
  //  base) puis en colonnes : une colonne s'arrête là où une bande verticale
  //  blanche traverse toutes les rangées du tableau. Le résultat se colle
  //  dans Excel cellule par cellule.
  // =====================================================================
  // Les rangées : les morceaux de texte de la page, rangés par ligne de base, puis en cellules (des morceaux qui se touchent).
  function rangeesDe(morceaux) {
    const items = (morceaux || []).filter(m => m && m.str && m.str.trim())
      .map(m => ({ str: m.str.replace(/\s+/g, ' '), x: m.x, x1: m.x + (m.w > 0 ? m.w : (m.size || 10) * m.str.length * 0.5), base: m.base, size: m.size || 10 }));
    if (!items.length) return { rangees: [], corps: 10 };
    items.sort((a, b) => (a.base - b.base) || (a.x - b.x));
    const rangees = [];
    let R = null;
    items.forEach(m => {
      if (R && Math.abs(m.base - R.base) <= Math.max(1.5, Math.min(m.size, R.size) * 0.45)) { R.items.push(m); return; }
      R = { base: m.base, size: m.size, items: [m] };
      rangees.push(R);
    });
    const tailles = items.map(m => m.size).sort((a, b) => a - b);
    const corps = tailles[Math.floor(tailles.length / 2)] || 10;
    rangees.forEach(r => {
      r.items.sort((a, b) => a.x - b.x);
      const cellules = [];
      let C = null;
      r.items.forEach(m => {
        if (C && m.x - C.x1 <= Math.max(2, m.size * 0.9)) {
          const blanc = m.x - C.x1 > m.size * 0.12 && !/\s$/.test(C.str) && !/^\s/.test(m.str);
          C.str += (blanc ? ' ' : '') + m.str; C.x1 = Math.max(C.x1, m.x1);
          return;
        }
        C = { str: m.str, x: m.x, x1: m.x1 };
        cellules.push(C);
      });
      r.cellules = cellules.map(c => ({ str: c.str.trim(), x: c.x, x1: c.x1 })).filter(c => c.str);
    });
    return { rangees, corps };
  }
  // Les colonnes d'un ensemble de rangées. Les gouttières se cherchent sur les rangées qui ont au moins deux
  // cellules : un paragraphe qui court sur toute la largeur n'est pas une rangée du tableau et ne doit pas boucher les colonnes.
  function tableauDeRangees(rangees, corps) {
    const tableau = rangees.filter(r => r.cellules.length >= 2);
    const toutes = [];
    (tableau.length ? tableau : rangees).forEach(r => r.cellules.forEach(c => toutes.push(c)));
    if (!toutes.length) return { lignes: [], colonnes: 0 };
    const xmin = Math.floor(Math.min.apply(null, toutes.map(c => c.x)));
    const xmax = Math.ceil(Math.max.apply(null, toutes.map(c => c.x1)));
    const n = Math.max(1, xmax - xmin + 1);
    const couv = new Uint16Array(n);
    toutes.forEach(c => {
      for (let i = Math.max(0, Math.floor(c.x - xmin)); i <= Math.min(n - 1, Math.ceil(c.x1 - xmin)); i++) couv[i]++;
    });
    // Une vraie gouttière fait au moins la largeur d'une lettre : un blanc
    // plus étroit n'est qu'un mot un peu court sur une ligne.
    const mini = Math.max(4, corps * 0.8);
    const bornes = [xmin - 1];
    let i = 0;
    while (i < n) {
      if (couv[i]) { i++; continue; }
      let j = i;
      while (j < n && !couv[j]) j++;
      if (i > 0 && j < n && j - i >= mini) bornes.push(xmin + (i + j) / 2);
      i = j;
    }
    bornes.push(xmax + 1);
    const nc = bornes.length - 1;
    const colonneDe = c => {
      const cx = (c.x + c.x1) / 2;
      for (let k = 0; k < nc; k++) if (cx >= bornes[k] && cx < bornes[k + 1]) return k;
      return cx < bornes[0] ? 0 : nc - 1;
    };
    const lignes = rangees.map(r => {
      const row = new Array(nc).fill('');
      r.cellules.forEach(c => { const k = colonneDe(c); row[k] = row[k] ? row[k] + ' ' + c.str : c.str; });
      return row;
    }).filter(row => row.some(Boolean));
    return { lignes, colonnes: nc };
  }
  function tableauDepuisMorceaux(morceaux) {
    const r = rangeesDe(morceaux);
    return tableauDeRangees(r.rangees, r.corps);
  }
  // La structure d'une page pour un traitement de texte : des titres, des paragraphes et des tableaux, dans l'ordre de lecture.
  // Un tableau, ce sont au moins deux rangées d'au moins deux cellules, avec au moins deux colonnes séparées par un blanc qui
  // les traverse toutes (une rangée à une seule cellule, courte, entre deux rangées de tableau, en fait partie : un « Total »).
  // Un paragraphe, ce sont des lignes qui se suivent à interligne normal, quand la précédente va presque jusqu'à la marge droite :
  // une adresse, une liste, un titre restent chacun sur leur ligne. Un titre est une ligne seule plus grande que le corps.
  const RX_PUCE = /^\s*(?:[•◦▪■●○‣–—-]|\d{1,2}[.)]|[a-z][.)])\s+/;
  function blocsDePage(morceaux) {
    const { rangees, corps } = rangeesDe(morceaux);
    if (!rangees.length) return [];
    const multi = rangees.map(r => r.cellules.length >= 2);
    const dedans = multi.slice();
    for (let i = 1; i < rangees.length - 1; i++) {
      const c = rangees[i].cellules;
      if (!multi[i] && multi[i - 1] && multi[i + 1] && c.length === 1 && c[0].str.length <= 40) dedans[i] = true;
    }
    // Les lignes hors tableau, pour la marge droite et la marge gauche du texte courant.
    const lignes = rangees.map(r => {
      const c = r.cellules;
      return { str: c.map(x => x.str).join(' '), x: c.length ? c[0].x : 0, x1: c.length ? c[c.length - 1].x1 : 0, base: r.base, size: r.size };
    });
    const libres = lignes.filter((l, i) => !dedans[i] && l.str);
    const gauche = libres.length ? Math.min.apply(null, libres.map(l => l.x)) : 0;
    const droite = Math.max(libres.length ? Math.max.apply(null, libres.map(l => l.x1)) : 0, gauche + corps * 35);
    const longue = l => l.x1 >= gauche + 0.78 * (droite - gauche);
    const blocs = [];
    let para = null;
    const finir = () => {
      if (!para) return;
      const texte = para.map(l => l.str).reduce((a, b) => (/[a-zà-öø-ÿ]-$/.test(a) && /^[a-zà-öø-ÿ]/.test(b)) ? a.slice(0, -1) + b : a + ' ' + b);
      const taille = para[0].size;
      if (para.length === 1 && taille >= corps * 1.15 && texte.length <= 150) blocs.push({ t: 'titre', n: taille >= corps * 1.6 ? 1 : taille >= corps * 1.3 ? 2 : 3, s: texte });
      else blocs.push({ t: 'p', s: texte });
      para = null;
    };
    const ligne = l => {
      const prec = para && para[para.length - 1];
      const suite = prec && l.base - prec.base <= prec.size * 1.65 && l.base > prec.base
        && Math.abs(l.size - prec.size) <= prec.size * 0.12 && prec.size < corps * 1.15 && longue(prec) && !RX_PUCE.test(l.str);
      if (!suite) finir();
      if (!para) para = [];
      para.push(l);
    };
    let i = 0;
    while (i < rangees.length) {
      if (!dedans[i]) { if (lignes[i].str) ligne(lignes[i]); i++; continue; }
      let j = i;
      while (j < rangees.length && dedans[j]) j++;
      const groupe = rangees.slice(i, j);
      const vraies = groupe.filter(r => r.cellules.length >= 2).length;
      const t = vraies >= 2 ? tableauDeRangees(groupe, corps) : { lignes: [], colonnes: 0 };
      if (t.colonnes >= 2 && t.lignes.length >= 2) { finir(); blocs.push({ t: 'tableau', lignes: t.lignes }); }
      else for (let k = i; k < j; k++) if (lignes[k].str) ligne(lignes[k]);
      i = j;
    }
    finir();
    return blocs;
  }
  const tableauTsv = lignes => lignes.map(r => r.map(c => String(c).replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\r\n');
  const tableauCsv = lignes => '\ufeff' + lignes.map(r => r.map(c => {
    const t = String(c);
    return /[;"\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }).join(';')).join('\r\n');
  async function morceauxDePage(p) {
    const src = srcById(p.src);
    const g = pageGeom(p);
    const out = [];
    try {
      const page = await src.pdfjs.getPage(p.index + 1);
      const vp = page.getViewport({ scale: 1, rotation: g.total });
      const tc = await page.getTextContent();
      tc.items.forEach(it => {
        if (!it.str || !it.str.trim()) return;
        const m = pdfjs.Util.transform(vp.transform, it.transform);
        const geo = morceauGeom(m, it.width > 0 ? it.width : 0);
        if (geo.vertical || geo.envers) return;
        out.push({ str: it.str, x: geo.x, base: geo.base, w: it.width > 0 ? it.width : geo.size * it.str.length * 0.5, size: geo.size });
      });
      page.cleanup();
    } catch (e) { signaler('Tableau', e); }
    if (!out.length && p.ocr && p.ocr.mots) p.ocr.mots.forEach(m => out.push({ str: m.t, x: m.x, base: ocrBase(m), w: m.w, size: ocrCorps(m) }));
    return out;
  }
  // Un montant tel qu'il est écrit (1'234.50, CHF 1 234,50, 1'234.-) devient
  // un nombre qu'Excel reconnaît, avec le séparateur décimal choisi.
  const RX_MONTANT = /^\s*(?:CHF|SFr\.?|Fr\.?|€|EUR|USD|\$)?\s*([-+−]?)\s*(\d{1,3}(?:[ '’  ]\d{3})+|\d+)(?:[.,](\d{1,2}|-|–|—))?\s*(?:CHF|SFr\.?|Fr\.?|€|EUR|USD|\$)?\s*$/i;
  function celluleNombre(c, sep) {
    const m = RX_MONTANT.exec(String(c));
    if (!m) return c;
    const ent = m[2].replace(/\D/g, '');
    const dec = m[3] == null ? '' : (/^\d+$/.test(m[3]) ? m[3] : '00');
    return (m[1] === '-' || m[1] === '−' ? '-' : '') + ent + (dec ? sep + dec : '');
  }
  const separateurDecimal = () => { try { return new Intl.NumberFormat().format(1.5).includes(',') ? ',' : '.'; } catch (_) { return '.'; } };
  function toolTableau() {
    const courante = pageCouranteId();
    const sel = selectedPages();
    const options = state.pages.map((p, i) => [String(p.id), 'Page ' + (i + 1)]);
    if (sel.length > 1) options.unshift(['sel', 'Pages sélectionnées (' + sel.length + ')']);
    if (state.pages.length > 1) options.unshift(['tout', 'Tout le document (' + state.pages.length + ' pages)']);
    const choix = select('tb-page', options, String(courante));
    const nombres = checkbox('tb-nombres', 'Montants en nombres : 1\'234.50 devient 1234.50, monnaie et espaces retirés', true);
    const decimale = select('tb-decimale', [['.', 'point (1234.50)'], [',', 'virgule (1234,50)']], separateurDecimal());
    const info = note('');
    const apercu = document.createElement('div'); apercu.className = 'apercu-tableau';
    let lignes = [];
    const sortie = () => nombres.input.checked ? lignes.map(r => r.map(c => celluleNombre(c, decimale.value))) : lignes;
    let jeton = 0;
    function montrer() {
      apercu.replaceChildren();
      const l = sortie();
      if (!l.length) return;
      const t = document.createElement('table');
      t.setAttribute('translate', 'no');   // le contenu du document ne se traduit pas
      l.slice(0, 60).forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(c => { const td = document.createElement('td'); td.textContent = c; if (/^-?\d+([.,]\d+)?$/.test(String(c))) td.className = 'nombre'; tr.appendChild(td); });
        t.appendChild(tr);
      });
      apercu.appendChild(t);
      if (l.length > 60) apercu.appendChild(note('… et ' + (l.length - 60) + ' autres lignes.'));
    }
    async function analyser() {
      const my = ++jeton;
      const v = choix.value;
      const pages = v === 'tout' ? state.pages.slice() : v === 'sel' ? selectedPages() : state.pages.filter(x => x.id === +v);
      if (!pages.length) return;
      info.textContent = pages.length > 1 ? 'Lecture de ' + pages.length + ' pages…' : 'Lecture de la page…';
      apercu.replaceChildren();
      lignes = [];
      let colonnes = 0, vides = 0;
      const tour = cadence();
      for (let i = 0; i < pages.length; i++) {
        const r = tableauDepuisMorceaux(await morceauxDePage(pages[i]));
        if (my !== jeton) return;
        if (!r.lignes.length) vides++;
        lignes.push(...r.lignes);
        colonnes = Math.max(colonnes, r.colonnes);
        await tour();
      }
      if (!lignes.length) { info.textContent = (pages.length > 1 ? 'Aucun texte sur ces pages.' : 'Aucun texte sur cette page.') + ' Sur un scan, lancez d\'abord la reconnaissance de texte.'; return; }
      info.textContent = plural(lignes.length, 'ligne', 'lignes') + ' × ' + plural(colonnes, 'colonne', 'colonnes')
        + (pages.length > 1 ? ' sur ' + plural(pages.length, 'page', 'pages') + (vides ? ' (' + plural(vides, 'page sans texte', 'pages sans texte') + ')' : '') : '')
        + (colonnes < 2 ? ' — aucune colonne repérée : chaque ligne ira dans une seule cellule.' : '');
      montrer();
    }
    choix.addEventListener('change', analyser);
    nombres.input.addEventListener('change', montrer);
    decimale.addEventListener('change', montrer);
    dialog({
      aide: 'tableau',
      title: 'Copier un tableau vers Excel', icon: IC.tableau, wide: true, submitOnEnter: false,
      build: b => {
        b.append(field('Pages', choix, 'Les colonnes sont repérées d\'après les blancs qui traversent les lignes du tableau. Sur plusieurs pages, les lignes se suivent.'));
        b.append(rowOf([nombres, field('Séparateur décimal', decimale, 'La virgule pour un Excel en français ou en allemand ; le point pour un Excel anglais.')], true));
        b.append(info);
        b.append(apercu);
      },
      actions: [
        { label: 'Fermer', onClick: c => c() },
        { label: 'Enregistrer en CSV', onClick: async () => {
          if (!lignes.length) { toast('Rien à enregistrer.', 'warn'); return; }
          await deliver(tableauCsv(sortie()), safeBase(el.filename.value) + tr('-tableau.csv'), 'text/csv;charset=utf-8');
        } },
        { label: 'Copier pour Excel', primary: true, onClick: async close => {
          if (!lignes.length) { toast('Rien à copier.', 'warn'); return; }
          const ok = await copierTexte(tableauTsv(sortie()));
          if (ok) { close(); toast(plural(lignes.length, 'ligne copiée', 'lignes copiées') + ' : collez dans Excel (Ctrl+V), une cellule par colonne.'); setLast('Tableau copié'); }
          else toast('Le presse-papiers est inaccessible ici : enregistrez plutôt le CSV.', 'warn');
        } },
      ],
    });
    analyser();
  }

  // =====================================================================
  //  Exporter vers Word (.docx) : le texte et les tableaux, sans la mise en page
  //  -------------------------------------------------------------------
  //  Un .docx est une archive de quelques fichiers XML. On écrit le strict nécessaire : des styles de titre, des
  //  paragraphes, des tableaux à bordures. Ni les images, ni les polices, ni les couleurs, ni les colonnes de la page
  //  d'origine ne suivent : le dire est plus honnête que de promettre une conversion fidèle (qu'aucun logiciel ne fait).
  // =====================================================================
  const OOXML = 'http://schemas.openxmlformats.org/';
  const NS_W = OOXML + 'wordprocessingml/2006/main';
  const xmlTexte = t => String(t == null ? '' : t)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // Les noms de styles de Word (« Heading1 », « heading 1 ») sont des identifiants du format, pas des textes : ils ne se traduisent pas.
  const styleDeTitre = (n, nom) => [nom ? 'heading' : 'Heading', n].join(nom ? ' ' : '');
  const LARGEUR_TEXTE = 9072;                 // A4 (11 906) moins deux marges de 2,5 cm (1 417), en vingtièmes de point
  const paragrapheXml = (texte, o) => '<w:p>' + ((o && (o.style || o.droite))
    ? '<w:pPr>' + (o.style ? '<w:pStyle w:val="' + o.style + '"/>' : '') + (o.droite ? '<w:jc w:val="right"/>' : '') + '</w:pPr>' : '')
    + (texte ? '<w:r><w:t xml:space="preserve">' + xmlTexte(texte) + '</w:t></w:r>' : '') + '</w:p>';
  const estUnNombre = c => RX_MONTANT.test(String(c)) && /\d/.test(String(c));
  function tableauXml(lignes) {
    const nc = Math.max.apply(null, lignes.map(r => r.length));
    const w = Math.floor(LARGEUR_TEXTE / nc);
    return '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>'
      + '<w:tblGrid>' + new Array(nc).fill('<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid>'
      + lignes.map(r => '<w:tr>' + Array.from({ length: nc }, (_, k) => {
        const c = r[k] || '';
        return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/></w:tcPr>' + paragrapheXml(c, { droite: estUnNombre(c) }) + '</w:tc>';
      }).join('') + '</w:tr>').join('')
      + '</w:tbl>' + paragrapheXml('');       // un paragraphe après le tableau : deux tableaux de suite n'en feraient qu'un
  }
  const stylesDocx = lang => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:styles xmlns:w="' + NS_W + '">'
    + '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="' + lang + '" w:eastAsia="' + lang + '" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>'
    + '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
    + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
    + [[1, 32], [2, 28], [3, 24]].map(h =>
      '<w:style w:type="paragraph" w:styleId="' + styleDeTitre(h[0]) + '"><w:name w:val="' + styleDeTitre(h[0], true) + '"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>'
      + '<w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="' + (h[0] - 1) + '"/></w:pPr>'
      + '<w:rPr><w:b/><w:bCs/><w:sz w:val="' + h[1] + '"/><w:szCs w:val="' + h[1] + '"/></w:rPr></w:style>').join('')
    + '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>'
    + '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:uiPriority w:val="39"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>'
    + '<w:tblPr><w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b => '<w:' + b + ' w:val="single" w:sz="4" w:space="0" w:color="808080"/>').join('') + '</w:tblBorders></w:tblPr></w:style>'
    + '</w:styles>';
  // Les blocs (voir blocsDePage) deviennent un fichier .docx. blocs : [{ t: 'titre'|'p'|'tableau'|'saut', … }].
  async function docxDepuisBlocs(blocs, meta) {
    if (!JSZip) throw new Error('zip');
    meta = meta || {};
    const corps = blocs.map(b => b.t === 'titre' ? paragrapheXml(b.s, { style: styleDeTitre(b.n) })
      : b.t === 'tableau' ? tableauXml(b.lignes)
      : b.t === 'saut' ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
      : paragrapheXml(b.s)).join('');
    const lang = { fr: 'fr-CH', de: 'de-CH', it: 'it-CH', en: 'en-GB' }[meta.langue] || meta.langue || 'fr-CH';
    const document = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="' + NS_W + '"><w:body>' + corps
      + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="' + OOXML + 'package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
      + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
      + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
      + '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="' + OOXML + 'package/2006/relationships">'
      + '<Relationship Id="rId1" Type="' + OOXML + 'officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
      + '<Relationship Id="rId2" Type="' + OOXML + 'package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
      + '<Relationship Id="rId3" Type="' + OOXML + 'officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>');
    zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="' + OOXML + 'package/2006/relationships">'
      + '<Relationship Id="rId1" Type="' + OOXML + 'officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    zip.file('word/document.xml', document);
    zip.file('word/styles.xml', stylesDocx(xmlTexte(lang)));
    // Ni auteur ni dernier modificateur : le fichier ne dit pas qui l'a converti.
    zip.file('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="' + OOXML + 'package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
      + '<dc:title>' + xmlTexte(meta.titre || '') + '</dc:title><dc:language>' + xmlTexte(lang) + '</dc:language>'
      + '<dcterms:created xsi:type="dcterms:W3CDTF">' + new Date().toISOString().replace(/\.\d+Z$/, 'Z') + '</dcterms:created></cp:coreProperties>');
    zip.file('docProps/app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="' + OOXML + 'officeDocument/2006/extended-properties"><Application>' + xmlTexte(APP + ' ' + APP_VERSION) + '</Application></Properties>');
    return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
  function toolWord() {
    if (!FEAT.zip) { toast('Le composant qui écrit les archives manque : l\'export Word est indisponible.', 'error'); return; }
    const courante = pageCouranteId();
    const sel = selectedPages();
    const options = state.pages.map((p, i) => [String(p.id), 'Page ' + (i + 1)]);
    if (sel.length > 1) options.unshift(['sel', 'Pages sélectionnées (' + sel.length + ')']);
    if (state.pages.length > 1) options.unshift(['tout', 'Tout le document (' + state.pages.length + ' pages)']);
    const choix = select('wd-page', options, state.pages.length > 1 ? 'tout' : String(courante));
    const sauts = checkbox('wd-sauts', 'Un saut de page là où le PDF change de page', false);
    const tableaux = checkbox('wd-tableaux', 'Reconnaître les tableaux', true);
    const info = note('');
    let blocs = [], pagesLues = [];
    let jeton = 0;
    async function analyser() {
      const my = ++jeton;
      const v = choix.value;
      const pages = v === 'tout' ? state.pages.slice() : v === 'sel' ? selectedPages() : state.pages.filter(x => x.id === +v);
      if (!pages.length) return;
      info.textContent = pages.length > 1 ? 'Lecture de ' + pages.length + ' pages…' : 'Lecture de la page…';
      pagesLues = [];
      const tour = cadence();
      for (let i = 0; i < pages.length; i++) {
        const b = blocsDePage(await morceauxDePage(pages[i]));
        if (my !== jeton) return;
        pagesLues.push(b);
        await tour();
      }
      resume();
    }
    // Les blocs tels qu'ils partiront : les tableaux redeviennent des lignes si on ne les veut pas.
    function rassembler() {
      const out = [];
      pagesLues.forEach((b, i) => {
        if (i && sauts.input.checked) out.push({ t: 'saut' });
        b.forEach(x => {
          if (x.t === 'tableau' && !tableaux.input.checked) x.lignes.forEach(r => out.push({ t: 'p', s: r.filter(Boolean).join(' ') }));
          else out.push(x);
        });
      });
      return out;
    }
    function resume() {
      blocs = rassembler();
      const n = t => blocs.filter(b => b.t === t).length;
      info.textContent = !blocs.filter(b => b.t !== 'saut').length
        ? (pagesLues.length > 1 ? 'Aucun texte sur ces pages.' : 'Aucun texte sur cette page.') + ' Sur un scan, lancez d\'abord la reconnaissance de texte.'
        : plural(n('titre'), 'titre', 'titres') + ', ' + plural(n('p'), 'paragraphe', 'paragraphes') + ', ' + plural(n('tableau'), 'tableau', 'tableaux') + ' repérés.';
    }
    choix.addEventListener('change', analyser);
    sauts.input.addEventListener('change', () => { if (pagesLues.length) resume(); });
    tableaux.input.addEventListener('change', () => { if (pagesLues.length) resume(); });
    dialog({
      aide: 'exp-word',
      title: 'Exporter vers Word (.docx)', icon: IC.txt, submitOnEnter: false,
      build: b => {
        b.append(field('Pages', choix, 'Le texte est repris dans l\'ordre de lecture. Les lignes qui se suivent forment un paragraphe ; une ligne plus grande que le corps devient un titre.'));
        b.append(rowOf([tableaux, sauts], true));
        b.append(note('Reprend le texte et les tableaux. Les images, les polices, les couleurs et la disposition des colonnes de la page ne sont pas reprises : relisez le résultat dans Word.'));
        b.append(info);
      },
      actions: [
        { label: 'Fermer', onClick: c => c() },
        { label: 'Enregistrer en .docx', primary: true, onClick: async close => {
          if (!blocs.filter(b => b.t !== 'saut').length) { toast('Rien à enregistrer.', 'warn'); return; }
          try {
            const base = safeBase(el.filename.value).replace(SUFFIXE_MODIFIE, '');
            const octets = await docxDepuisBlocs(blocs, { titre: state.meta.title || base, langue: state.meta.langue || codeLangue() });
            close();
            await deliver(octets, base + '.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          } catch (e) { toast(messageDEchec('L\'export Word', e), 'error'); }
        } },
      ],
    });
    analyser();
  }
