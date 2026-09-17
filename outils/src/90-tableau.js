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
  async function copierTexte(t) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(t); return true; } } catch (_) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (_) { return false; }
  }
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
      for (let i = 0; i < pages.length; i++) {
        const r = tableauDepuisMorceaux(await morceauxDePage(pages[i]));
        if (my !== jeton) return;
        if (!r.lignes.length) vides++;
        lignes.push(...r.lignes);
        colonnes = Math.max(colonnes, r.colonnes);
        if (i % 4 === 3) await nextFrame();
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
          await deliver(tableauCsv(sortie()), safeBase(el.filename.value) + '-tableau.csv', 'text/csv;charset=utf-8');
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

  function toolHelp() {
    dialog({
      title: 'Raccourcis et aide', icon: IC.info, wide: true,
      build: b => {
        const mk = rows => {
          const dl = document.createElement('dl'); dl.className = 'kv';
          rows.forEach(r => {
            const dt = document.createElement('dt');
            r[0].split('+').forEach((k, i) => { if (i) dt.append(document.createTextNode(' + ')); const kb = document.createElement('kbd'); kb.textContent = k.trim(); dt.appendChild(kb); });
            const dd = document.createElement('dd'); dd.textContent = r[1];
            dl.append(dt, dd);
          });
          return dl;
        };
        b.append(groupOf('Pages', mk([
          ['Clic', 'Sélectionner ou désélectionner'], ['Maj+Clic', 'Sélectionner une plage'],
          ['Ctrl+A', 'Tout sélectionner'], ['Échap', 'Désélectionner'],
          ['Suppr', 'Retirer la sélection'], ['R', 'Pivoter à droite'], ['Maj+R', 'Pivoter à gauche'],
          ['Alt+←', 'Décaler la page à gauche'], ['Alt+→', 'Décaler la page à droite'],
          ['Entrée', 'Ouvrir l\'éditeur de page'],
          ['Double-clic', 'Ouvrir l\'éditeur, où le texte existant se corrige par paragraphe'],
          ['Clic droit', 'Menu de la page : pivoter, modifier, signet, copier le texte, dupliquer, extraire, supprimer — et sur un onglet : enregistrer, fermer'],
        ])));
        b.append(groupOf('Document', mk([
          ['Ctrl+O', 'Ouvrir un document (nouvel onglet)'], ['Ctrl+Maj+O', 'Ajouter au document'], ['Ctrl+S', state.bureau ? 'Enregistrer (réécrit le fichier ouvert)' : 'Exporter le PDF'], ['Ctrl+Maj+S', 'Enregistrer sous… (nouveau fichier)'], ['Ctrl+P', 'Imprimer'],
          ['Ctrl+F', 'Rechercher (mot entier, occurrences surlignées, Entrée pour la suivante), remplacer, caviarder'], ['Ctrl+B', 'Ajouter un signet'],
          ['Ctrl+T', 'Nouvel onglet'], ['Ctrl+W', 'Fermer l\'onglet'], ['Ctrl+Tab', 'Onglet suivant'],
          ['Ctrl+Z', 'Annuler'], ['Ctrl+Y', 'Rétablir'], ['?', 'Cette fenêtre'],
        ])));
        const nouv = document.createElement('div');
        nouv.style.display = 'flex'; nouv.style.flexDirection = 'column'; nouv.style.gap = '6px';
        [
          'Reconnaître le texte (OCR) : un scan devient cherchable, corrigeable, et le PDF exporté garde ce texte, invisible mais sélectionnable. Français et allemand, tout en local.',
          'Constituer un dossier de pièces : sommaire, intercalaires « Pièce n° », mention sur chaque page, pagination continue, signets.',
          'Rechercher, remplacer partout, caviarder partout, sur tout le document.',
          'Copier un tableau vers Excel : les colonnes sont repérées, on colle dans Excel.',
          'Tampons (Reçu le, Payé, Copie conforme, Visé…) avec la date du jour, et signatures mémorisées sur ce poste.',
          'Traiter plusieurs fichiers : pages vides, compression, numérotation, protection, images en PDF, en série.',
          'Les surlignages, cadres, dessins, textes et tampons partent en vrais commentaires PDF, modifiables dans Acrobat (ou figés, au choix).',
          'Comparer deux versions : côte à côte, mots retirés et ajoutés en couleur.',
          'Signets (le plan du document) et lecture deux pages côte à côte.',
          'Onglets : plusieurs documents dans la fenêtre, une page se glisse d\'un onglet à l\'autre.',
        ].forEach(t => nouv.appendChild(note(t)));
        b.append(groupOf('Ce que sait faire la version 2', [nouv]));
        const suite = document.createElement('div');
        suite.style.display = 'flex'; suite.style.flexDirection = 'column'; suite.style.gap = '6px';
        [
          state.bureau
            ? 'Enregistrer (Ctrl+S) réécrit le fichier ouvert, après confirmation la première fois ; Enregistrer sous… (Ctrl+Maj+S) crée un nouveau fichier. Fichier › Récents rouvre les derniers documents.'
            : 'Dans l\'application Windows, Enregistrer (Ctrl+S) réécrit le fichier ouvert et Fichier › Récents rouvre les derniers documents ; ici, dans le navigateur, Enregistrer produit un nouveau fichier.',
          state.bureau
            ? 'Récupération : le travail en cours est mis de côté quelques secondes après chaque changement ; après un arrêt brutal, il est proposé au lancement suivant.'
            : 'Dans l\'application Windows, le travail en cours est mis de côté après chaque changement et proposé au lancement suivant si l\'application s\'est arrêtée brutalement.',
          'En mode Lire, le texte se sélectionne et se copie, y compris sur un scan reconnu.',
          'Caviarder ou effacer du texte garde la page vectorielle : les lettres sont retirées du fichier, et si une image passe sous le rectangle, seule cette image est refaite — pas la page entière. Le texte du reste de la page reste net et sélectionnable.',
          'Les commentaires déjà présents dans un PDF reçu se listent et se retirent (outil Commentaires, ou depuis le volet Document).',
          'Les longues opérations (OCR, lots, assemblage) s\'interrompent : bouton Annuler en bas, ou Échap.',
          'Ce qui a été contourné pendant une opération (police illisible, lien perdu…) est noté dans le journal, en bas de la fenêtre.',
          'Comparer deux versions : reconnaissance à la demande pour les scans, et une vue « aspect » qui marque en rouge ce qui change à l\'image.',
          'Impression : qualité au choix (fine, normale, rapide). Le document part en images, à la finesse choisie — c\'est ce qui permet l\'impression directe sans autre fenêtre.',
          'Rechercher (Ctrl+F) : le panneau flotte à côté du document, les occurrences sont surlignées sur les pages, Entrée ou Suivant passe à la suivante ; option « mot entier ».',
          'Clic droit sur une page ou sur un onglet : les gestes courants, sans passer par la barre d\'outils.',
          'Copier un tableau vers Excel : plusieurs pages d\'un coup, et les montants (1\'234.50, CHF 1 234.-) deviennent des nombres.',
          'La reconnaissance de texte annonce le temps restant.',
        ].forEach(t => suite.appendChild(note(t)));
        b.append(groupOf('Et depuis', [suite]));
        const bureau = window.BlonayDesktop || null;
        b.append(note(APP + ' ' + APP_VERSION
          + (/^__/.test(APP_CONSTRUCTION) ? ' · version de travail' : ' · ' + APP_CONSTRUCTION)
          + (bureau && bureau.construction ? ' · application ' + (bureau.version || '') + ' ' + bureau.construction : '')));
        b.append(note('Astuce : tapez un chiffre sur une page sélectionnée au clavier pour la déplacer directement à ce numéro.'));
        const conf = document.createElement('div');
        conf.style.display = 'flex'; conf.style.flexDirection = 'column'; conf.style.gap = '8px';
        [
          'Vos documents ne quittent jamais cet ordinateur. Ils sont lus, modifiés et réassemblés par le navigateur, dans la mémoire de cette page.',
          'Aucun envoi, aucun compte, aucun cookie, aucune mesure d\'audience, aucun identifiant. Rien n\'est conservé après la fermeture, hormis la taille des vignettes et le thème choisi.',
          state.bureau
            ? 'Ce que vous mémorisez est écrit en clair dans le dossier data/, sans mot de passe : tampons, signatures, fichiers récents, et le travail mis de côté pour la récupération. Quiconque ouvre votre session Windows peut donc reposer votre signature sur un PDF. Verrouillez votre session, et ne mémorisez pas votre signature sur un poste partagé — tracez-la au moment de signer, sans cocher « Mémoriser ».'
            : 'Les tampons et signatures que vous mémorisez restent dans ce navigateur, en clair : quiconque ouvre votre session peut les reposer sur un PDF.',
          'La page ne sait contacter personne : ses règles de sécurité interdisent toute connexion sortante.',
        ].forEach(t => conf.appendChild(note(t)));
        b.append(groupOf('Confidentialité', [conf]));
      },
    });
  }

