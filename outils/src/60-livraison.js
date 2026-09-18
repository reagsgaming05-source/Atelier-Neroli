  // =====================================================================
  //  Delivery
  // =====================================================================
  const hasClaude = !!(window.claude && typeof window.claude.use === 'function');
  const downloadsReady = hasClaude ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null);

  function fallbackDownload(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }
  // Browsers refuse a download whose name is not plain ASCII, so accents are
  // folded for the file name itself. What the user typed stays on screen.
  function asciiName(name) {
    const n = String(name || '')
      .replace(/\u0153/g, 'oe').replace(/\u0152/g, 'OE')
      .replace(/\u00E6/g, 'ae').replace(/\u00C6/g, 'AE')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '-')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/-{2,}/g, '-').replace(/\s+/g, ' ').trim();
    return n || 'document.pdf';
  }
  // La fenêtre de l'application propose la boîte « Enregistrer sous » de
  // Windows et écrit le fichier elle-même, par morceaux. Si la boîte manque
  // à l'appel, on revient au téléchargement du moteur.
  function b64Octets(tampon) {
    const u8 = new Uint8Array(tampon);
    let bin = '';
    for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
    return btoa(bin);
  }
  async function enregistrerNatif(blob, filename) {
    let debut = null;
    try { debut = await window.blonayEnregistrerDebut(filename); } catch (e) { signaler('Enregistrer', e); return 'repli'; }
    if (!debut || debut.erreur) { signaler('Enregistrer', debut && debut.erreur); return 'repli'; }
    if (debut.annule) { toast('Enregistrement annulé.', 'warn'); return 'annule'; }
    const jeton = debut.jeton;
    try {
      const MORCEAU = 4 << 20;
      for (let pos = 0; pos < blob.size; pos += MORCEAU) {
        await window.blonayEnregistrerBout(jeton, b64Octets(await blob.slice(pos, pos + MORCEAU).arrayBuffer()));
      }
      const chemin = await window.blonayEnregistrerFin(jeton);
      toast(filename + ' enregistré (' + fmtSize(blob.size) + ')');
      setLast('Enregistré : ' + chemin);
      return 'ok';
    } catch (e) {
      console.error(e);
      try { await window.blonayEnregistrerAbandon(jeton); } catch (_) {}
      toast('L\'enregistrement a échoué : ' + (e && e.message ? e.message : e), 'error');
      return 'echec';
    }
  }

  // Rend vrai quand le fichier est parti (enregistré, ou téléchargement
  // lancé). o.document : c'est le document entier, tel quel — une fois écrit,
  // il n'est plus « modifié ».
  async function deliver(data, filename, mime, o) {
    filename = asciiName(filename);
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/pdf' });
    state.attenteChemin = null;
    if (state.bureau) {
      // La boîte « Enregistrer sous » répond plus tard, par onEnregistre.
      if (o && o.document) state.attenteChemin = { onglet: ongletActif };
      fallbackDownload(blob, filename);
      return true;
    }
    if (typeof window.blonayEnregistrerDebut === 'function') {
      const r = await enregistrerNatif(blob, filename);
      if (r !== 'repli') return r === 'ok';
    }
    const dl = await downloadsReady;
    if (dl) {
      try {
        await dl.save({ filename, data: blob });
        toast(filename + ' enregistré (' + fmtSize(blob.size) + ')');
        setLast(filename + ' enregistré');
        return true;
      } catch (e) {
        const code = e && e.code;
        if (code === 'declined') toast('Enregistrement annulé.', 'warn');
        else if (code === 'rate_limited') toast('Une demande d\'enregistrement est déjà ouverte : répondez-y puis réessayez.', 'warn');
        else if (code === 'rejected_extension' || code === 'extension_not_enabled') toast('Ce format de fichier n\'est pas autorisé à l\'enregistrement dans cette vue.', 'error');
        else toast('L\'enregistrement a échoué (' + (code || 'erreur') + ').', 'error');
        return false;
      }
    }
    if (hasClaude) { toast('L\'enregistrement n\'est pas disponible dans cette vue. Ouvrez la page dans un nouvel onglet ou depuis le fichier blonay-pdf.html.', 'error'); return false; }
    fallbackDownload(blob, filename);
    toast(filename + ' prêt (' + fmtSize(blob.size) + ')');
    setLast(filename + ' exporté');
    return true;
  }

  async function exportPages(pages, filename, opts) {
    if (!pages.length || state.busy) return null;
    // Le document entier, tel quel : une fois écrit, il n'est plus « modifié ».
    const entier = pages === state.pages && !opts;
    setBusy('Assemblage de ' + plural(pages.length, 'page', 'pages') + '…', 0, { annuler: true });
    const avisAvant = journal.filter(j => j.niveau !== 'info').length;
    try {
      const bytes = await buildPdf(pages, Object.assign({ onProgress: (r, t) => { verifierAnnulation(); setBusy(t || 'Assemblage…', r, { annuler: true }); } }, opts));
      const parti = await deliver(bytes, filename, null, { document: entier });
      if (parti && entier && !state.bureau) documentEnregistre('');
      const avis = journal.filter(j => j.niveau !== 'info').length - avisAvant;
      if (avis > 0) toast(plural(avis, 'avis pendant l\'export', 'avis pendant l\'export') + ' : voir le journal, en bas de la fenêtre.', 'warn');
      return bytes;
    } catch (e) {
      if (e && e.annule) { setLast('Export annulé'); toast('Export annulé.', 'warn'); return null; }
      console.error(e);
      toast('Échec de l\'assemblage : ' + (e && e.message ? e.message : e), 'error');
      return null;
    } finally { setBusy(''); }
  }

  // =====================================================================
  //  Enregistrer : réécrire le fichier ouvert
  //  -------------------------------------------------------------------
  //  Dans l'application, Ctrl+S remplace le fichier d'où vient le document,
  //  comme dans Acrobat — après une confirmation, la première fois pour
  //  chaque fichier. « Enregistrer sous… » (Ctrl+Maj+S) garde la boîte de
  //  dialogue. Dans le navigateur, qui ne peut pas écrire sur le disque,
  //  Enregistrer reste l'export habituel.
  // =====================================================================
  const nomDe = chemin => String(chemin || '').replace(/^.*[\\/]/, '');
  const ecritureDispo = () => !!(state.bureau && window.BlonayDesktop && typeof window.BlonayDesktop.ecrire === 'function');
  // Le fichier visé : celui du dernier enregistrement, sinon celui d'où vient
  // le document — s'il vient d'un seul fichier. Un document assemblé à partir
  // de plusieurs n'a pas de fichier à réécrire : ce sera « Enregistrer sous ».
  function cheminDocument() {
    if (state.chemin) return state.chemin;
    const reels = state.sources.filter(s => !s.isSample && !s.genere);
    return reels.length === 1 && reels[0].chemin ? reels[0].chemin : '';
  }
  function confirmerEcrasement(chemin) {
    return new Promise(res => {
      let pref = '';
      try { pref = localStorage.getItem('blonay-ecraser') || ''; } catch (_) {}
      if (pref === 'toujours' || state.ecraserOk) { res('remplacer'); return; }
      let fait = false;
      const plus = checkbox('ecr-plus', 'Ne plus demander : remplacer directement, comme Acrobat', false);
      dialog({
        title: 'Enregistrer « ' + nomDe(chemin) + ' »', icon: IC.save,
        build: b => {
          b.append(note('Le fichier ouvert sera remplacé par la version modifiée :'));
          const c = document.createElement('p'); c.className = 'dlg-chemin'; c.textContent = chemin; b.append(c);
          b.append(note('L\'original ne sera plus disponible. « Enregistrer sous… » le garde et crée un nouveau fichier.', 'warn'));
          b.append(plus);
        },
        onClose: () => { if (!fait) res(''); },
        actions: [
          { label: 'Annuler', onClick: c => c() },
          { label: 'Enregistrer sous…', id: 'ecr-sous', onClick: c => { fait = true; res('sous'); c(); } },
          { label: 'Remplacer le fichier', id: 'ecr-remplacer', primary: true, onClick: c => {
            fait = true;
            if (plus.input.checked) { try { localStorage.setItem('blonay-ecraser', 'toujours'); } catch (_) {} }
            state.ecraserOk = true;
            res('remplacer'); c();
          } },
        ],
      });
    });
  }
  async function enregistrer() {
    if (!state.pages.length || state.busy) return;
    const nom = safeBase(el.filename.value) + '.pdf';
    const chemin = ecritureDispo() ? cheminDocument() : '';
    if (!chemin) { exportPages(state.pages, nom); return; }
    const choix = await confirmerEcrasement(chemin);
    if (choix === 'sous') { exportPages(state.pages, nom); return; }
    if (choix !== 'remplacer' || state.busy) return;
    setBusy('Assemblage de ' + plural(state.pages.length, 'page', 'pages') + '…', 0, { annuler: true });
    const avisAvant = journal.filter(j => j.niveau !== 'info').length;
    try {
      const bytes = await buildPdf(state.pages, { onProgress: (r, t) => { verifierAnnulation(); setBusy(t || 'Assemblage…', r, { annuler: true }); } });
      setBusy('Écriture de ' + nomDe(chemin) + '…', 1);
      const r = await window.BlonayDesktop.ecrire(chemin, bytes);
      if (!r || !r.ok) throw new Error((r && r.erreur) || 'le fichier n\'a pas pu être écrit');
      documentEnregistre(chemin);
      toast(nomDe(chemin) + ' enregistré (' + fmtSize(bytes.byteLength) + ')');
      setLast('Enregistré : ' + chemin);
      const avis = journal.filter(j => j.niveau !== 'info').length - avisAvant;
      if (avis > 0) toast(plural(avis, 'avis pendant l\'enregistrement', 'avis pendant l\'enregistrement') + ' : voir le journal, en bas de la fenêtre.', 'warn');
    } catch (e) {
      if (e && e.annule) { setLast('Enregistrement annulé'); toast('Enregistrement annulé.', 'warn'); return; }
      signaler('Enregistrer', e);
      toast('Échec de l\'enregistrement : ' + (e && e.message ? e.message : e), 'error');
    } finally { setBusy(''); }
  }
  // Le document vient d'être écrit : il n'est plus « modifié », son dépôt de
  // récupération n'a plus lieu d'être, et Enregistrer visera ce fichier.
  function documentEnregistre(chemin, ongletId) {
    const courant = ongletId == null || ongletId === ongletActif;
    const e = courant ? state : (onglets.find(o => o.id === ongletId) || {}).etat;
    if (!e) return;
    e.touched = false;
    if (chemin) { e.chemin = chemin; e.ecraserOk = false; }
    recupOublier(e);
    if (courant) render(); else renderOnglets();
  }

  // =====================================================================
  //  Récupération après plantage
  //  -------------------------------------------------------------------
  //  Dans l'application, un document modifié est mis de côté dans le dossier
  //  de données quelques secondes après chaque changement : ses fichiers
  //  d'origine, une fois, et un manifeste (pages, annotations, réglages).
  //  Un enregistrement ou une fermeture voulue l'efface ; ce qui reste au
  //  lancement suivant vient d'un arrêt brutal, et il est proposé.
  // =====================================================================
  const RECUP_DELAI = 12000;
  const recupStock = new Map();      // clé -> Set des sources déjà déposées
  const recupSignature = new Map();  // clé -> dernier manifeste déposé
  let recupMinuteur = null, recupEnCours = null;
  const recupDispo = () => !!(state.bureau && window.BlonayDesktop && typeof window.BlonayDesktop.recupEcrire === 'function');
  function planifierRecuperation() {
    if (!recupDispo() || recupMinuteur) return;
    recupMinuteur = setTimeout(() => {
      recupMinuteur = null;
      recupEnCours = sauvegarderRecuperation().catch(e => signaler('Récupération', e)).then(() => { recupEnCours = null; });
    }, RECUP_DELAI);
  }
  const recupNomFichier = s => s.recupFichier || (s.recupFichier = 's' + s.id + '.pdf');
  function manifesteDe(e) {
    return {
      version: 1, quand: 0, titre: titreEtat(e), nomFichier: e.nomFichier || '', filenameDirty: !!e.filenameDirty, chemin: e.chemin || '',
      sources: e.sources.filter(s => !s.isSample).map(s => ({ id: s.id, name: s.name, chemin: s.chemin || '', genere: !!s.genere, fichier: recupNomFichier(s), formValues: s.formValues || null })),
      pages: e.pages.map(p => ({ id: p.id, src: p.src, index: p.index, rot: p.rot || 0, ann: p.ann || [], piece: p.piece || null, ocr: p.ocr || null, pieceN: p.pieceN || 0, intercalaire: p.intercalaire || 0, sommaire: p.sommaire || 0, retraits: p.retraits || [] })),
      signets: e.signets || [], meta: e.meta || null, watermark: e.watermark || null, stamp: e.stamp || null, security: e.security || null,
      flatten: !!e.flatten, figerAnnotations: !!e.figerAnnotations, dossier: e.dossier || null,
    };
  }
  async function sauvegarderRecuperation() {
    if (!recupDispo()) return;
    const bureau = window.BlonayDesktop;
    for (const o of onglets) {
      const e = o.id === ongletActif ? prendreEtat() : o.etat;
      if (!e || !e.touched || !e.pages.length || !e.sources.some(s => !s.isSample)) continue;
      if (!e.cleRecup) {
        e.cleRecup = 'd' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
        if (o.id === ongletActif) state.cleRecup = e.cleRecup;
      }
      const cle = e.cleRecup;
      const manifeste = manifesteDe(e);
      const signature = JSON.stringify(manifeste);
      if (recupSignature.get(cle) === signature) continue;
      manifeste.quand = Date.now();
      const deja = recupStock.get(cle) || new Set();
      const fichiers = [];
      e.sources.forEach(s => { if (!s.isSample && !deja.has(s.id)) fichiers.push({ nom: recupNomFichier(s), octets: new Uint8Array(s.bytes) }); });
      const r = await bureau.recupEcrire({ cle, manifeste, fichiers });
      if (!r || !r.ok) throw new Error((r && r.erreur) || 'dépôt impossible');
      e.sources.forEach(s => { if (!s.isSample) deja.add(s.id); });
      recupStock.set(cle, deja);
      recupSignature.set(cle, signature);
    }
  }
  function recupOublier(e) {
    if (!e || !e.cleRecup) return;
    const cle = e.cleRecup;
    e.cleRecup = '';
    recupStock.delete(cle); recupSignature.delete(cle);
    if (recupDispo()) window.BlonayDesktop.recupEffacer(cle).catch(() => {});
  }
  // Avant de quitter : plus rien à récupérer, et plus rien en route.
  function recupToutOublier() {
    clearTimeout(recupMinuteur); recupMinuteur = null;
    const cles = [];
    onglets.forEach(o => { const e = o.id === ongletActif ? state : o.etat; if (e && e.cleRecup) { cles.push(e.cleRecup); e.cleRecup = ''; } });
    recupStock.clear(); recupSignature.clear();
    if (!recupDispo() || !cles.length) return Promise.resolve();
    const bureau = window.BlonayDesktop;
    return Promise.resolve(recupEnCours).then(() => Promise.all(cles.map(c => bureau.recupEffacer(c).catch(() => {}))));
  }
  async function restaurerRecuperation(cle) {
    const bureau = window.BlonayDesktop;
    const r = await bureau.recupLire(cle);
    if (!r || !r.manifeste) throw new Error('le dépôt de récupération est illisible');
    const m = r.manifeste;
    if (ongletOccupe() || state.touched) nouvelOnglet();
    const idsSrc = new Map();
    state.silencieux = true;
    try {
      for (const s of m.sources || []) {
        const f = (r.fichiers || []).find(x => x.nom === s.fichier);
        if (!f) { signaler('Récupération', new Error('fichier manquant dans le dépôt : ' + s.name), 'avert'); continue; }
        const u8 = f.octets instanceof Uint8Array ? f.octets : new Uint8Array(f.octets);
        const src = await addPdfSource(s.name, u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength), { silent: true, chemin: s.chemin || '' });
        src.formValues = s.formValues || null; src.genere = !!s.genere; src.recupFichier = s.fichier;
        idsSrc.set(s.id, src.id);
      }
    } finally { state.silencieux = false; }
    const idsPage = new Map();
    state.pages = (m.pages || []).filter(p => idsSrc.has(p.src)).map(p => {
      const id = ++uid; idsPage.set(p.id, id);
      return { id, src: idsSrc.get(p.src), index: p.index, rot: p.rot || 0, ann: (p.ann || []).map(a => Object.assign({}, a, { id: ++uid })), piece: p.piece || null, ocr: p.ocr || null, pieceN: p.pieceN || 0, intercalaire: p.intercalaire || 0, sommaire: p.sommaire || 0, retraits: p.retraits || [] };
    });
    const remap = liste => (liste || []).map(sg => ({ id: ++uid, titre: sg.titre, page: idsPage.get(sg.page), enfants: remap(sg.enfants) }));
    state.signets = remap(m.signets);
    if (m.meta) state.meta = m.meta;
    state.watermark = m.watermark || null; state.stamp = m.stamp || null; state.security = m.security || null;
    state.flatten = !!m.flatten; state.figerAnnotations = !!m.figerAnnotations;
    state.dossier = m.dossier ? Object.assign({}, m.dossier, { srcId: idsSrc.get(m.dossier.srcId) || null, signature: '' }) : null;
    state.chemin = m.chemin || ''; state.ecraserOk = false;
    state.history = []; state.redo = []; state.selected.clear();
    state.filenameDirty = !!m.filenameDirty;
    if (m.filenameDirty && m.nomFichier) el.filename.value = m.nomFichier;
    state.pages.forEach(p => { if (p.ocr && p.ocr.texte != null) { textCache.set(pkey(p), p.ocr.texte); ocrCache.add(pkey(p)); } });
    state.touched = true;
    state.cleRecup = cle;
    recupStock.set(cle, new Set(Array.from(idsSrc.values())));
    recupSignature.delete(cle);
    render();
    setLast('Travail récupéré : ' + (m.titre || 'document'));
    return m;
  }
  function proposerRecuperation(liste) {
    const bureau = window.BlonayDesktop;
    const quand = t => { const d = new Date(t || 0); return pad(d.getDate(), 2) + '.' + pad(d.getMonth() + 1, 2) + '.' + d.getFullYear() + ' à ' + pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2); };
    dialog({
      title: 'Travail non enregistré retrouvé', icon: IC.info,
      build: b => {
        b.append(note('Blonay PDF s\'est arrêté sans que ' + (liste.length > 1 ? 'ces documents soient enregistrés' : 'ce document soit enregistré') + '. Les récupérer les rouvre tels qu\'ils étaient, avec les modifications en cours.'));
        const ul = document.createElement('ul'); ul.className = 'recup-liste';
        liste.forEach(r => { const li = document.createElement('li'); li.textContent = (r.titre || 'Document') + ' · ' + plural(r.pages || 0, 'page', 'pages') + ' · ' + quand(r.quand); ul.appendChild(li); });
        b.append(ul);
      },
      actions: [
        { label: 'Ignorer et supprimer', id: 'recup-ignorer', onClick: c => { c(); liste.forEach(r => bureau.recupEffacer(r.cle).catch(() => {})); setLast('Travail non enregistré supprimé'); } },
        { label: 'Récupérer', id: 'recup-ok', primary: true, onClick: c => {
          c();
          (async () => {
            for (const r of liste) {
              setBusy('Récupération de « ' + (r.titre || 'document') + ' »…');
              try { await restaurerRecuperation(r.cle); }
              catch (e) { signaler('Récupération', e); toast('« ' + (r.titre || 'document') + ' » n\'a pas pu être récupéré : ' + (e && e.message ? e.message : e), 'error'); }
            }
            setBusy('');
          })();
        } },
      ],
    });
  }
  // Les fichiers récents, sur la page d'accueil de l'application.
  async function renderRecents() {
    const zone = el.dzRecents;
    if (!zone) return;
    const bureau = window.BlonayDesktop;
    if (!state.bureau || !bureau || typeof bureau.recents !== 'function' || typeof bureau.lireRecent !== 'function') { zone.hidden = true; return; }
    let liste = [];
    try { liste = await bureau.recents(); } catch (_) { liste = []; }
    if (state.pages.length) return;
    zone.replaceChildren();
    if (!Array.isArray(liste) || !liste.length) { zone.hidden = true; return; }
    const t = document.createElement('div'); t.className = 'titre'; t.textContent = 'Fichiers récents'; zone.appendChild(t);
    liste.slice(0, 8).forEach(chemin => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = nomDe(chemin); b.title = chemin;
      b.addEventListener('click', async () => {
        try {
          const l = await bureau.lireRecent(chemin);
          if (l && l.length) await ouvrirListe(l, { onglet: true });
          else { toast('Ce fichier n\'existe plus : ' + chemin, 'warn'); renderRecents(); }
        } catch (e) { signaler('Récents', e); }
      });
      zone.appendChild(b);
    });
    zone.hidden = false;
  }

