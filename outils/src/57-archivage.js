  // =====================================================================
  //  Archiver en PDF/A-2b
  //  -------------------------------------------------------------------
  //  Le format d'archivage à long terme (ISO 19005-2, niveau B) : polices
  //  incorporées, ni mot de passe ni script, formulaires aplatis. Le document
  //  est reconstruit, contrôlé (53-conformite.js), et n'est déclaré PDF/A-2b
  //  que si rien ne s'y oppose. Ce que l'on ne peut pas rendre conforme sans
  //  y toucher — des pages dont les polices ne sont pas dans le fichier — est
  //  dit avant, avec la seule solution que ce logiciel sache offrir : convertir
  //  ces pages en images, avec l'accord de l'utilisateur.
  // =====================================================================

  // Les pages dont des polices ne sont pas incorporées au fichier d'origine.
  async function pagesSansPolices() {
    const docs = new Map();
    const sortie = [];
    for (let k = 0; k < state.pages.length; k++) {
      const p = state.pages[k];
      const src = srcById(p.src);
      if (!src) continue;
      try {
        if (!docs.has(src.id)) docs.set(src.id, await loadLib(src));
        const doc = docs.get(src.id);
        const abs = policesAbsentesDeLaPage(doc, doc.getPages()[p.index]);
        if (abs.length) sortie.push({ page: p, numero: k + 1, polices: abs });
      } catch (e) { signaler('Analyse des polices', e, 'info'); }
      if (k % 25 === 24) { setBusy('Analyse des polices… ' + (k + 1) + '/' + state.pages.length, k / state.pages.length); await nextFrame(); }
    }
    return sortie;
  }

  // Les mêmes problèmes d'une page à l'autre ne font qu'une ligne, avec leurs pages.
  function grouperProblemes(problemes) {
    const m = new Map();
    problemes.forEach(p => {
      if (!m.has(p.texte)) m.set(p.texte, { texte: p.texte, pages: [] });
      if (p.page) m.get(p.texte).pages.push(p.page);
    });
    return Array.from(m.values()).map(g => g.texte + (g.pages.length ? ' (' + (g.pages.length > 1 ? 'pages ' : 'page ') + formaterPlages(g.pages) + ')' : ''));
  }

  async function toolArchiver() {
    if (!state.pages.length) { toast('Aucune page à archiver.', 'warn'); return; }
    if (state.busy) return;
    if (!FEAT.unicode) {
      dialog({ title: 'Archiver en PDF/A-2b', icon: IC.save, build: b => b.append(note('Cette copie du logiciel n\'embarque pas les polices nécessaires à l\'archivage. Utilisez la version portable (le fichier Aktum PDF hors ligne).', 'warn')) });
      return;
    }
    if (state.security) {
      dialog({ title: 'Archiver en PDF/A-2b', icon: IC.save, build: b => b.append(note('Ce document est protégé par un mot de passe : un PDF/A ne peut pas être chiffré. Retirez d\'abord la protection (outil « Mot de passe », bouton « Retirer »).', 'warn')) });
      return;
    }
    setBusy('Analyse des polices…', 0);
    let absentes = [];
    try { absentes = await pagesSansPolices(); } finally { setBusy(''); }
    const convertir = checkbox('arch-raster', absentes.length ? 'Convertir en images ' + (absentes.length > 1 ? 'ces ' + absentes.length + ' pages' : 'cette page') + ' (le texte n\'y sera plus sélectionnable, sauf si la reconnaissance de texte l\'a lu)' : '', false);
    dialog({
      title: 'Archiver en PDF/A-2b', icon: IC.save, wide: true,
      build: b => {
        b.append(note('Le PDF/A-2b est le format d\'archivage à long terme (norme ISO 19005-2) : polices incorporées au fichier, ni mot de passe ni script, formulaires aplatis. Le document est reconstruit puis contrôlé ; il n\'est déclaré PDF/A-2b que si rien ne s\'y oppose.'));
        if (absentes.length) {
          b.append(note('Des pages utilisent des polices qui ne sont pas dans le fichier d\'origine, ce que le PDF/A interdit :', 'warn'));
          const par = new Map();
          absentes.forEach(a => a.polices.forEach(f => { if (!par.has(f)) par.set(f, []); par.get(f).push(a.numero); }));
          Array.from(par.entries()).slice(0, 8).forEach(([f, ns]) => b.append(note('« ' + f + ' » : ' + (ns.length > 1 ? 'pages ' : 'page ') + formaterPlages(ns))));
          b.append(note('Ce logiciel ne peut pas incorporer une police qu\'il n\'a pas. Il peut convertir ces pages en images : leur apparence est gardée à l\'identique, leur texte ne l\'est pas.'));
          b.append(convertir);
        }
        b.append(note('Seront retirés du fichier archivé : scripts, fichiers joints, mot de passe. Les formulaires sont aplatis. Le fichier d\'origine n\'est pas touché.'));
      },
      actions: [
        { label: 'Annuler', onClick: c => c() },
        { id: 'arch-lancer', label: 'Enregistrer en PDF/A-2b', primary: true, onClick: close => {
          if (absentes.length && !convertir.input.checked) { toast('Cochez la conversion des pages en images, ou corrigez ces polices dans le document d\'origine.', 'warn'); return; }
          close();
          produireArchive(new Set(absentes.map(a => a.page.id)));
        } },
      ],
    });
  }

  async function produireArchive(rasterIds) {
    if (state.busy) return;
    const pages = state.pages;
    const rapport = {};
    const opts = { archivage: rapport, rasterIds, noInPlace: true };
    if (essaiFiniRefuse()) return;
    if (!(await pertesAcceptees(pages, opts))) { setLast('Archivage annulé'); return; }
    setBusy('Archivage de ' + plural(pages.length, 'page', 'pages') + '…', 0, { annuler: true });
    // « rapport-modifié » est le nom par défaut d'un export : une archive n'est pas « modifiée ».
    const nom = safeBase(baseName(el.filename.value)).replace(/-modifi[eé]$/i, '') + '-pdfa.pdf';
    try {
      const octets = await buildPdf(pages, Object.assign({ onProgress: (r, t) => { verifierAnnulation(); setBusy(t || 'Archivage…', r, { annuler: true }); } }, opts));
      setBusy('');
      if (!(await caracteresAcceptes())) { setLast('Archivage annulé'); return; }
      if (rapport.conforme) {
        const parti = await deliver(octets, nom, null, {});
        if (parti) setLast('Archivé en PDF/A-2b : ' + nom);
        await montrerRapportArchive(rapport, true);
      } else {
        const garder = await montrerRapportArchive(rapport, false);
        // En connaissance de cause : le fichier part, sans se déclarer PDF/A.
        if (garder) { const parti = await deliver(octets, nom.replace(/-pdfa\.pdf$/, '.pdf'), null, {}); if (parti) setLast('Enregistré sans déclaration PDF/A : ' + nom.replace(/-pdfa\.pdf$/, '.pdf')); }
        else setLast('Archivage annulé : le document n\'est pas conforme');
      }
    } catch (e) {
      if (e && e.annule) { setLast('Archivage annulé'); toast('Archivage annulé.', 'warn'); return; }
      console.error(e);
      toast('Échec de l\'archivage : ' + (e && e.message ? e.message : e), 'error');
    } finally { setBusy(''); }
  }

  // Ce que le contrôle a vu, dit tel quel. Rend vrai si l'utilisateur veut quand même
  // enregistrer le fichier (non conforme, donc sans déclaration PDF/A).
  function montrerRapportArchive(rapport, conforme) {
    return new Promise(res => {
      let repondu = false;
      dialog({
        title: conforme ? 'Archivé en PDF/A-2b' : 'Ce document ne peut pas être déclaré PDF/A-2b', icon: IC.info, wide: true,
        build: b => {
          if (conforme) {
            b.append(note('Le fichier est enregistré. Le contrôle interne a vérifié ' + plural(rapport.regles, 'point', 'points') + ' et n\'a trouvé aucun écart.'));
            (rapport.corrections || []).forEach(c => b.append(note('Corrigé : ' + c + '.')));
          } else {
            b.append(note('Voici ce qui s\'y oppose :', 'warn'));
            grouperProblemes(rapport.problemes || []).slice(0, 12).forEach(t => b.append(note('• ' + t)));
            b.append(note('Le fichier peut être enregistré quand même, mais il ne se déclarera pas PDF/A : une archive qui le recevra n\'y verrait pas de promesse non tenue.'));
          }
          b.append(note('Ce contrôle couvre les causes d\'échec les plus courantes ; ce n\'est pas une validation complète de la norme. Pour une preuve formelle, passez le fichier dans veraPDF, le validateur de référence (gratuit, verapdf.org).'));
        },
        onClose: () => { if (!repondu) res(false); },
        actions: conforme
          ? [{ label: 'Fermer', primary: true, onClick: close => { repondu = true; res(true); close(); } }]
          : [
            { id: 'arch-abandon', label: 'Ne pas enregistrer', onClick: close => close() },
            { id: 'arch-quand-meme', label: 'Enregistrer sans déclaration PDF/A', peril: true, onClick: close => { repondu = true; res(true); close(); } },
          ],
      });
    });
  }
