  // =====================================================================
  //  Glisser une page vers le Bureau (application fenêtrée)
  //  -------------------------------------------------------------------
  //  Une page de la vue Organiser se glisse hors de la fenêtre, vers le Bureau ou un dossier, et devient un fichier PDF d'une page.
  //  Le système n'accepte un glisser de fichier que si le fichier existe déjà au départ du geste : la page se prépare donc dès que la
  //  souris touche la poignée, et le processus principal l'écrit dans le dossier de données de l'application (effacé à la fermeture).
  //  Tout reste sur ce poste. Au clavier, ou en cliquant la poignée, la même page s'enregistre par la boîte habituelle.
  // =====================================================================
  const glisse = { prets: new Map(), enCours: new Map() };   // id de page → { cle, chemin } ; id de page → clé en préparation
  const glisserDispo = () => !!(window.AktumDesktop && typeof window.AktumDesktop.glisserPreparer === 'function' && typeof window.AktumDesktop.glisser === 'function');
  // Ce qui change le fichier d'une page : son contenu (voir lectureCle), sa place et le nombre de pages (numérotation, filigrane).
  const glisseCle = p => lectureCle(p) + '|' + pageIndex(p.id) + '|' + state.pages.length;
  const nomDeLaPage = p => safeBase(el.filename.value).replace(SUFFIXE_MODIFIE, '') + '-p' + (pageIndex(p.id) + 1) + '.pdf';

  async function preparerLaPage(p) {
    const cle = glisseCle(p);
    const pret = glisse.prets.get(p.id);
    if (pret && pret.cle === cle) return pret;
    if (glisse.enCours.get(p.id) === cle) return null;
    glisse.enCours.set(p.id, cle);
    try {
      const octets = await buildPdf([p], { noInPlace: true, silencieux: true });
      const r = await window.AktumDesktop.glisserPreparer({ nom: nomDeLaPage(p), octets });
      if (r && r.chemin) glisse.prets.set(p.id, { cle, chemin: r.chemin });
    } catch (e) { signaler('Glisser une page', e, 'info'); }
    finally { if (glisse.enCours.get(p.id) === cle) glisse.enCours.delete(p.id); }
    return glisse.prets.get(p.id) || null;
  }
  const pageDeLaPoignee = e => {
    const b = e.target && e.target.closest ? e.target.closest('button[data-act="glisser"]') : null;
    const t = b && b.closest('.tile');
    return t ? state.pages.find(x => x.id === +t.dataset.id) || null : null;
  };
  function brancherLeGlisser() {
    if (!glisserDispo()) return;
    const preparer = e => { const p = pageDeLaPoignee(e); if (p) preparerLaPage(p); };
    el.pages.addEventListener('pointerover', preparer);
    el.pages.addEventListener('focusin', preparer);
    // En phase de capture : avant le glisser-déposer des tuiles, qui réordonne les pages dans la fenêtre.
    el.pages.addEventListener('dragstart', e => {
      const p = pageDeLaPoignee(e);
      if (!p) return;
      e.stopPropagation();
      e.preventDefault();
      const pret = glisse.prets.get(p.id);
      if (!pret || pret.cle !== glisseCle(p)) {
        toast('La page se prépare : recommencez le glisser dans un instant.', 'warn');
        preparerLaPage(p);
        return;
      }
      window.AktumDesktop.glisser(pret.chemin);
    }, true);
  }
  // Le clic sur la poignée, ou la touche Entrée dessus : la boîte « Enregistrer sous » habituelle, pour cette page seule.
  function enregistrerLaPage(id) {
    const p = state.pages.find(x => x.id === id);
    if (p) exportPages([p], nomDeLaPage(p), { noInPlace: true });
  }
