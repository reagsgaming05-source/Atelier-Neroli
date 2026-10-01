  // =====================================================================
  //  Copier un tableau vers Excel
  //  -------------------------------------------------------------------
  //  Les morceaux de texte de la page sont rangés en rangées (même ligne de
  //  base) puis en colonnes : une colonne s'arrête là où une bande verticale
  //  blanche traverse toutes les rangées du tableau. Le résultat se colle
  //  dans Excel cellule par cellule.
  // =====================================================================
  function tableauDepuisMorceaux(morceaux) {
    const items = (morceaux || []).filter(m => m && m.str && m.str.trim())
      .map(m => ({ str: m.str.replace(/\s+/g, ' '), x: m.x, x1: m.x + (m.w > 0 ? m.w : (m.size || 10) * m.str.length * 0.5), base: m.base, size: m.size || 10 }));
    if (!items.length) return { lignes: [], colonnes: 0 };
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
    // Les gouttières se cherchent sur les rangées qui ont au moins deux
    // cellules : un paragraphe qui court sur toute la largeur n'est pas
    // une rangée du tableau et ne doit pas boucher les colonnes.
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
      title: 'Copier un tableau vers Excel', icon: IC.tableau, wide: true, submitOnEnter: false,
      build: b => {
        b.append(field('Pages', choix, 'Les colonnes sont repérées d\'après les blancs qui traversent les lignes du tableau. Sur plusieurs pages, les lignes se suivent.'));
        b.append(rowOf([nombres, field('Séparateur décimal', decimale)], true));
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
