  // =====================================================================
  //  Remplir un formulaire en série, depuis un fichier CSV
  //  -------------------------------------------------------------------
  //  Une ligne du tableau, une copie remplie du formulaire : les convocations,
  //  les attestations, les bulletins d'inscription que l'on fait à la
  //  chaîne. Tout se passe dans la fenêtre : le fichier CSV est lu ici, les
  //  copies sont écrites ici, rien n'en sort.
  //  Ce qui compte, c'est de ne pas remplir de travers sans le dire : une
  //  case dont la valeur n'est pas comprise, une liste dont le choix n'existe
  //  pas, une ligne qui a plus de cellules que d'en-têtes sont rapportées,
  //  avec leur numéro de ligne, avant que rien ne soit écrit.
  // =====================================================================
  // @debut-csv
  const SERIE_MAX = 1000;
  const normaliserCle = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

  // Le texte d'un CSV : séparateur reconnu (point-virgule d'Excel en français,
  // virgule, tabulation), guillemets doublés, retours à la ligne dans une
  // cellule, BOM d'Excel. { delimiteur, entetes, lignes (tableaux de cellules), avis }.
  function lireCsv(texte) {
    let t = String(texte == null ? '' : texte);
    if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
    const compte = { ';': 0, ',': 0, '\t': 0 };
    let guil = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (c === '"') guil = !guil;
      else if (!guil) { if (c === '\n' || c === '\r') break; if (c in compte) compte[c]++; }
    }
    let delimiteur = ';';
    for (const d of [',', '\t']) if (compte[d] > compte[delimiteur]) delimiteur = d;
    const brutes = [];
    let ligne = [], champ = '', dedans = false;
    const finChamp = () => { ligne.push(champ); champ = ''; };
    const finLigne = () => { finChamp(); if (ligne.some(x => x.trim() !== '')) brutes.push(ligne); ligne = []; };
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (dedans) {
        if (c === '"') { if (t[i + 1] === '"') { champ += '"'; i++; } else dedans = false; }
        else champ += c;
      } else if (c === '"' && champ === '') dedans = true;
      else if (c === delimiteur) finChamp();
      else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; finLigne(); }
      else champ += c;
    }
    if (champ !== '' || ligne.length) finLigne();
    const avis = [];
    if (dedans) avis.push('Un guillemet n\'est pas refermé : la fin du fichier est lue comme une seule cellule.');
    if (!brutes.length) return { delimiteur, entetes: [], lignes: [], avis };
    const vus = new Set();
    const entetes = brutes[0].map((e, i) => {
      let n = e.trim() || 'colonne ' + (i + 1);
      const base = n;
      for (let k = 2; vus.has(normaliserCle(n)); k++) n = base + ' (' + k + ')';
      vus.add(normaliserCle(n));
      return n;
    });
    const lignes = brutes.slice(1).map((l, i) => {
      if (l.length > entetes.length) avis.push('Ligne ' + (i + 1) + ' : ' + l.length + ' cellules pour ' + entetes.length + ' en-têtes — les cellules en trop sont ignorées.');
      const r = l.slice(0, entetes.length);
      while (r.length < entetes.length) r.push('');
      return r;
    });
    return { delimiteur, entetes, lignes, avis };
  }

  // « oui », « x », « 1 », « vrai »… coché ; « non », « 0 », vide… décoché ; le reste : null.
  function lireOuiNon(v) {
    const t = normaliserCle(v);
    if (['oui', 'o', 'yes', 'y', 'true', 'vrai', 'x', '1', 'ja', 'j', 'on', 'coche', 'coches'].indexOf(t) >= 0) return true;
    if (['', 'non', 'n', 'no', 'false', 'faux', '0', 'nein', 'off', 'decoche'].indexOf(t) >= 0) return false;
    return null;
  }

  // Le choix d'une liste : le texte exact, sinon sans tenir compte des accents ni de la casse.
  function choisirOption(valeur, options) {
    const v = String(valeur == null ? '' : valeur).trim();
    if (options.indexOf(v) >= 0) return v;
    const k = normaliserCle(v);
    return k ? (options.find(o => normaliserCle(o) === k) || null) : null;
  }

  // Les valeurs à poser pour chaque ligne : champs = [{ name, kind, options }],
  // liens = { nomDuChamp: indexDeColonne } (absent ou -1 : champ laissé tel quel).
  // Rend { lignes: [{ valeurs, avis }], avis } ; un avis dit la ligne, la colonne et le champ.
  function planDeSerie(champs, csv, liens) {
    const tous = [];
    const lignes = csv.lignes.map((cellules, r) => {
      const valeurs = {}, avis = [];
      champs.forEach(f => {
        const col = liens[f.name];
        if (col == null || col < 0) return;
        const brut = cellules[col] == null ? '' : String(cellules[col]).trim();
        const ou = 'Ligne ' + (r + 1) + ', « ' + csv.entetes[col] + ' » → « ' + f.name + ' » : ';
        if (f.kind === 'check') {
          const b = lireOuiNon(brut);
          if (b === null) avis.push(ou + '« ' + brut + ' » n\'est pas compris (oui/non, x, 1/0) : la case reste comme dans le modèle.');
          else valeurs[f.name] = b;
        } else if (f.kind === 'dropdown' || f.kind === 'radio' || f.kind === 'list') {
          if (brut === '') { if (f.kind === 'dropdown') valeurs[f.name] = ''; return; }
          const o = choisirOption(brut, f.options || []);
          if (o == null) avis.push(ou + '« ' + brut + ' » n\'est pas un des choix du champ : il reste comme dans le modèle.');
          else valeurs[f.name] = o;
        } else valeurs[f.name] = brut;
      });
      avis.forEach(a => tous.push(a));
      return { valeurs, avis };
    });
    return { lignes, avis: tous };
  }

  // Le nom d'un fichier de la série : { n } le numéro, { colonne } une cellule de la ligne.
  function nomDeSerie(modele, entetes, ligne, n, total) {
    const cles = entetes.map(normaliserCle);
    const largeur = Math.max(3, String(total).length);
    return String(modele).replace(/\{([^{}]+)\}/g, (tout, nom) => {
      if (normaliserCle(nom) === 'n') return String(n).padStart(largeur, '0');
      const i = cles.indexOf(normaliserCle(nom));
      return i >= 0 ? String(ligne[i] == null ? '' : ligne[i]).trim() : tout;
    });
  }
  // Les marques { … } d'un modèle qui ne désignent aucune colonne.
  function marquesInconnues(modele, entetes) {
    const cles = entetes.map(normaliserCle);
    const l = [];
    String(modele).replace(/\{([^{}]+)\}/g, (tout, nom) => { if (normaliserCle(nom) !== 'n' && cles.indexOf(normaliserCle(nom)) < 0) l.push(tout); return tout; });
    return l;
  }
  // Deux copies ne portent jamais le même nom : « Dupont », « Dupont (2) ».
  function nomsUniques(noms) {
    const pris = new Map();
    return noms.map(n => {
      const k = n.toLowerCase();
      const fois = (pris.get(k) || 0) + 1;
      pris.set(k, fois);
      return fois > 1 ? n + ' (' + fois + ')' : n;
    });
  }
  // @fin-csv

  async function fichierTexte(fichier) {
    const tampon = await fichier.arrayBuffer();
    const u8 = new Uint8Array(tampon);
    // Un CSV d'Excel « ancien » est en Windows-1252, pas en UTF-8 : on essaie
    // l'UTF-8 strict, et si le fichier n'en est pas, on le lit en Windows-1252
    // plutôt que de remplacer les accents par des « ? ».
    try { return new TextDecoder('utf-8', { fatal: true }).decode(u8); }
    catch (e) { signaler('Lecture du CSV', 'Le fichier n\'est pas en UTF-8 : lu en Windows-1252.', 'info'); return new TextDecoder('windows-1252').decode(u8); }
  }

  function toolSerie() {
    const aRemplir = f => f.kind !== 'button' && f.kind !== 'signature' && f.kind !== 'other';
    const sources = state.sources.filter(s => s.formFields && s.formFields.some(aRemplir));
    if (!sources.length) {
      dialog({ title: 'Remplir en série', icon: IC.form, build: b => b.append(note('Aucun champ de formulaire n\'a été trouvé dans les documents ouverts. Ouvrez d\'abord le formulaire à remplir, puis revenez ici avec le fichier CSV.')) });
      return;
    }
    let src = sources[0];
    let csv = null, plan = null;
    const liens = {};
    const picker = select('serie-doc', sources.map(s => [s.id, s.name]), src.id);
    const inp = document.createElement('input');
    inp.type = 'file'; inp.id = 'serie-csv'; inp.className = 'sr-only'; inp.tabIndex = -1; inp.accept = '.csv,.tsv,.txt,text/csv,text/plain';
    const choisir = document.createElement('button');
    choisir.type = 'button'; choisir.className = 'tb-btn'; choisir.style.border = '1px solid var(--trait)';
    choisir.textContent = 'Choisir le fichier CSV…';
    choisir.addEventListener('click', () => { inp.value = ''; inp.click(); });
    const infoCsv = note('Aucun fichier choisi. Une première ligne d\'en-têtes, puis une ligne par copie.');
    const zoneLiens = document.createElement('div'); zoneLiens.className = 'list';
    const modele = input('serie-nom', 'text', safeBase(baseName(src.name)) + '-{n}');
    const exemple = note('');
    const sortie = segmented('serie-sortie', [['zip', 'Un fichier par ligne (ZIP)'], ['un', 'Un seul PDF']], FEAT.zip ? 'zip' : 'un', () => maj());
    if (!FEAT.zip) Array.from(sortie.children).forEach(b => { if (b.dataset.value === 'zip') b.disabled = true; });
    const aplatir = checkbox('serie-aplatir', 'Aplatir : les valeurs ne sont plus modifiables dans les copies', true);
    const bilan = note('');
    let bouton = null;

    const colonnes = () => [['-1', '— ne pas remplir —']].concat(csv ? csv.entetes.map((e, i) => [String(i), e]) : []);
    function champsDe() { return src.formFields.filter(aRemplir); }
    function relier() {
      Object.keys(liens).forEach(k => delete liens[k]);
      const cles = csv ? csv.entetes.map(normaliserCle) : [];
      champsDe().forEach(f => { liens[f.name] = csv ? cles.indexOf(normaliserCle(f.name)) : -1; });
    }
    function dessinerLiens() {
      zoneLiens.replaceChildren();
      if (!csv) return;
      champsDe().forEach((f, i) => {
        const row = document.createElement('div'); row.className = 'list-item';
        const g = document.createElement('div'); g.className = 'g';
        const n = document.createElement('div'); n.className = 'n'; n.textContent = f.name;
        const s = document.createElement('div'); s.className = 's';
        s.textContent = { text: 'Texte', check: 'Case à cocher', dropdown: 'Liste déroulante', radio: 'Choix', list: 'Liste' }[f.kind] || 'Champ';
        g.append(n, s);
        const sel = select('serie-col-' + i, colonnes(), String(liens[f.name]));
        sel.style.maxWidth = '210px';
        sel.addEventListener('change', () => { liens[f.name] = parseInt(sel.value, 10); maj(); });
        row.append(g, sel);
        zoneLiens.appendChild(row);
      });
    }
    function maj() {
      if (!csv) { bilan.textContent = ''; if (bouton) bouton.disabled = true; return; }
      plan = planDeSerie(champsDe(), csv, liens);
      const reliés = champsDe().filter(f => liens[f.name] >= 0).length;
      const n = csv.lignes.length;
      const inconnues = marquesInconnues(modele.value, csv.entetes);
      const noms = nomsUniques(csv.lignes.map((l, i) => safeBase(nomDeSerie(modele.value, csv.entetes, l, i + 1, n)) ));
      exemple.textContent = n ? 'Premier fichier : ' + noms[0] + '.pdf' + (inconnues.length ? ' — ' + inconnues.join(', ') + ' ne désigne aucune colonne.' : '') : '';
      exemple.classList.toggle('warn', inconnues.length > 0);
      const unSeul = sortie.value === 'un';
      aplatir.input.checked = aplatir.input.checked || unSeul;
      aplatir.input.disabled = unSeul;
      let t = plural(n, 'ligne', 'lignes') + ', ' + plural(reliés, 'champ relié', 'champs reliés') + ' sur ' + champsDe().length + '.';
      const avis = csv.avis.concat(plan.avis);
      if (n > SERIE_MAX) t += ' Trop de lignes : ' + SERIE_MAX + ' au plus par série, découpez le fichier.';
      else if (!reliés) t += ' Reliez au moins un champ à une colonne.';
      if (avis.length) {
        t += ' ' + plural(avis.length, 'avis', 'avis') + ' :';
        avis.slice(0, 5).forEach(a => { t += '\n• ' + a; });
        if (avis.length > 5) t += '\n• … et ' + plural(avis.length - 5, 'autre', 'autres') + '.';
      }
      bilan.textContent = t;
      bilan.style.whiteSpace = 'pre-line';
      bilan.classList.toggle('warn', avis.length > 0 || n > SERIE_MAX || !reliés);
      if (bouton) bouton.disabled = !n || n > SERIE_MAX || !reliés;
    }
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      try {
        csv = lireCsv(await fichierTexte(f));
      } catch (e) { signaler('Lecture du CSV', e, 'erreur'); toast('Ce fichier n\'a pas pu être lu : ' + e.message, 'error'); return; }
      if (!csv.entetes.length || !csv.lignes.length) {
        infoCsv.textContent = f.name + ' : il faut une ligne d\'en-têtes et au moins une ligne de données.';
        infoCsv.classList.add('warn'); csv = null; dessinerLiens(); maj(); return;
      }
      infoCsv.classList.remove('warn');
      infoCsv.textContent = f.name + ' : ' + plural(csv.lignes.length, 'ligne', 'lignes') + ', ' + plural(csv.entetes.length, 'colonne', 'colonnes')
        + ' (séparateur « ' + (csv.delimiteur === '\t' ? 'tabulation' : csv.delimiteur) + ' »).';
      relier(); dessinerLiens(); maj();
    });
    picker.addEventListener('change', () => { src = sources.find(s => String(s.id) === picker.value); relier(); dessinerLiens(); maj(); });
    modele.addEventListener('input', maj);
    aplatir.input.addEventListener('change', maj);
    relier();

    dialog({
      title: 'Remplir en série (CSV)', icon: IC.form, wide: true, submitOnEnter: false,
      build: b => {
        if (sources.length > 1) b.append(field('Formulaire', picker));
        b.append(rowOf([choisir, infoCsv], true));
        b.append(inp);
        b.append(zoneLiens);
        b.append(field('Nom des fichiers', modele, '{n} le numéro de la ligne, {colonne} le contenu d\'une cellule. Exemple : {Nom}-{Prénom}'));
        b.append(exemple);
        b.append(field('Résultat', sortie));
        b.append(aplatir);
        b.append(bilan);
        b.append(note('Les champs que vous avez déjà remplis à la main servent de base ; la ligne du tableau ne remplace que ce qu\'elle relie. Chaque copie reprend tout le document tel qu\'il est ouvert, avec ses pages, son filigrane, sa numérotation. Les signets ne sont pas repris dans « Un seul PDF ».'));
      },
      actions: [
        { label: 'Annuler', onClick: c => c() },
        { id: 'serie-lancer', label: 'Produire', primary: true, onClick: close => { close(); produireSerie({ src, csv, plan, liens, modele: modele.value, sortie: sortie.value, aplatir: aplatir.input.checked || sortie.value === 'un' }); } },
      ],
    });
    bouton = $('#serie-lancer') || document.getElementById('serie-lancer');
    maj();
  }

  async function produireSerie(o) {
    const { src, csv, plan } = o;
    const n = csv.lignes.length;
    if (state.busy || !n) return;
    if (essaiFiniRefuse()) return;
    if (!(await pertesAcceptees(state.pages))) { setLast('Série annulée'); return; }
    // Les caractères que les polices du logiciel ne savent pas écrire, repérés
    // dans toute la série avant qu'une seule copie soit faite.
    oublierPertes();
    plan.lignes.forEach(l => Object.keys(l.valeurs).forEach(k => { if (typeof l.valeurs[k] === 'string') releverHorsWinAnsi(l.valeurs[k]); }));
    if (!(await caracteresAcceptes())) { setLast('Série annulée'); return; }
    const noms = nomsUniques(csv.lignes.map((l, i) => safeBase(nomDeSerie(o.modele, csv.entetes, l, i + 1, n)) || 'formulaire-' + (i + 1)));
    const base = safeBase(baseName(src.name));
    const avant = { flatten: state.flatten, valeurs: src.formValues, securite: state.security };
    const sortieUnique = o.sortie === 'un';
    const avisAvant = avisGraves();
    setBusy('Copie 1/' + n + '…', 0, { annuler: true });
    try {
      const zip = sortieUnique ? null : new JSZip();
      const fusion = sortieUnique ? await PDFLib.PDFDocument.create() : null;
      state.flatten = o.aplatir;
      // Chaque copie est écrite sans mot de passe ; en « un seul PDF », la
      // protection est posée une fois, sur le tout.
      if (sortieUnique) state.security = null;
      for (let i = 0; i < n; i++) {
        verifierAnnulation();
        setBusy('Copie ' + (i + 1) + '/' + n + '…', i / n, { annuler: true });
        await nextFrame();
        src.formValues = Object.assign({}, avant.valeurs || {}, plan.lignes[i].valeurs);
        const octets = await buildPdf(state.pages, { onProgress: () => {} });
        if (sortieUnique) {
          const d = await PDFLib.PDFDocument.load(octets, { updateMetadata: false });
          (await fusion.copyPages(d, d.getPageIndices())).forEach(p => fusion.addPage(p));
        } else zip.file(noms[i] + '.pdf', octets);
      }
      state.flatten = avant.flatten; src.formValues = avant.valeurs; state.security = avant.securite;
      setBusy('Écriture du résultat…', 1);
      let parti, resume;
      if (sortieUnique) {
        fusion.setCreator(APP);
        if (state.meta && state.meta.title) fusion.setTitle(state.meta.title);
        if (state.security && FEAT.encrypt) {
          const s = state.security, p = { permissions: s.permissions || {} };
          if (s.userPassword) p.userPassword = s.userPassword;
          if (s.ownerPassword) p.ownerPassword = s.ownerPassword;
          if (p.userPassword || p.ownerPassword) fusion.encrypt(p);
        }
        parti = await deliver(await fusion.save(), base + '-serie.pdf');
        resume = plural(n, 'copie', 'copies') + ' dans un seul PDF';
      } else {
        parti = await deliver(await zip.generateAsync({ type: 'blob' }), base + '-serie.zip', 'application/zip');
        resume = plural(n, 'fichier', 'fichiers') + ' dans une archive ZIP';
      }
      if (parti) setLast('Série produite : ' + resume);
      const avis = avisGraves() - avisAvant;
      if (avis > 0) toast(plural(avis, 'avis pendant la série', 'avis pendant la série') + ' : voir le journal, en bas de la fenêtre.', 'warn');
    } catch (e) {
      if (e && e.annule) { setLast('Série annulée'); toast('Série annulée : rien n\'a été écrit.', 'warn'); }
      else { console.error(e); toast('Échec de la série : ' + (e && e.message ? e.message : e), 'error'); }
    } finally {
      state.flatten = avant.flatten; src.formValues = avant.valeurs; state.security = avant.securite;
      setBusy('');
    }
  }
