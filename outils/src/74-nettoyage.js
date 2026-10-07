  // =====================================================================
  //  Nettoyer le document
  //  -------------------------------------------------------------------
  //  Un PDF garde bien plus que ce qu'on voit : le nom de celle qui l'a écrit, le logiciel d'origine, des fichiers joints, des
  //  scripts, des commentaires oubliés. Avant de publier ou d'envoyer à l'extérieur, la personne coche ce qui doit partir ; l'export
  //  refait le fichier page par page sans ces éléments (voir nettoyerLesPages, 51-purge.js). Rien n'est écrit avant l'export.
  // =====================================================================
  function toolNettoyer() {
    const o = Object.assign({}, NETTOYAGE_DEFAUT, state.nettoyage || {});
    const cases = NETTOYAGE_LIBELLES.map(([cle, libelle]) => { const c = checkbox('net-' + cle, libelle, o[cle]); c.cle = cle; return c; });
    dialog({
      aide: 'nettoyer',
      title: 'Nettoyer le document', icon: IC.balai,
      build: b => {
        b.append(note('Ce que le fichier garde sans le dire, retiré à l\'export. Utile avant de publier un document sur un site ou de l\'envoyer à l\'extérieur.'));
        b.append(groupOf('Retirer du fichier', cases));
        b.append(note('Le nom et le titre que vous avez inscrits dans « Propriétés » sont retirés aussi si vous cochez les métadonnées. Les commentaires et les signets retirés ne se retrouvent pas dans le fichier exporté ; le document ouvert, lui, reste intact.'));
        b.append(note('Après un caviardage, cochez au moins les métadonnées : un nom noirci sur la page peut rester dans le titre ou l\'auteur.', 'warn'));
      },
      actions: [
        state.nettoyage ? { label: 'Retirer', onClick: close => { snapshot('Retirer le nettoyage'); state.nettoyage = null; vue.render(); close(); setLast('Nettoyage retiré : l\'export gardera tout ce que le fichier contient'); } } : null,
        { label: 'Annuler', onClick: c => c() },
        { label: 'Appliquer', primary: true, onClick: close => {
          const choix = {};
          cases.forEach(c => { choix[c.cle] = c.input.checked; });
          if (!Object.values(choix).some(Boolean)) { toast('Cochez au moins un élément à retirer.', 'warn'); return; }
          snapshot('Nettoyer le document');
          state.nettoyage = choix; state.touched = true; vue.render(); close();
          setLast('Nettoyage réglé : appliqué à l\'export · Ctrl+Z pour annuler');
        } },
      ].filter(Boolean),
    });
  }

  // =====================================================================
  //  Le mode du caviardage : appliqué, certifié, ou simples marques à relire
  //  -------------------------------------------------------------------
  //  Appliqué (par défaut) : à l'export, le texte caviardé quitte le fichier. Certifié : en plus, chaque page caviardée devient une image à
  //  300 ppp, tout ce que le fichier cache est retiré, un journal horodaté dit ce qui a été caviardé et où, et la copie est relue. Marques : rien
  //  n'est retiré, les zones s'écrivent comme annotations « Redact » que quelqu'un relit (dans ce logiciel ou dans Acrobat) avant de les appliquer.
  //  Le mode vit avec les réglages de nettoyage (state.nettoyage.caviardage) : il suit le document comme eux.
  // =====================================================================
  const NETTOYAGE_TOUT = { meta: true, pj: true, scripts: true, vignettes: true, annots: true, signets: true };
  const NETTOYAGE_RIEN = { meta: false, pj: false, scripts: false, vignettes: false, annots: false, signets: false };
  function toolModeCaviardage() {
    const n = state.nettoyage || {};
    const mode = select('cv-mode', [['', 'Appliqué à l\'export (par défaut)'], ['certifie', 'Certifié : pages en images à 300 ppp, journal, relecture de la copie'], ['marques', 'Marques à relire : rien n\'est retiré, un relecteur applique']], n.caviardage || '');
    const termes = checkbox('cv-termes', 'Inscrire les termes caviardés dans le journal (le journal devient lui-même confidentiel)', !!n.termes);
    const explication = note('');
    const maj = () => {
      termes.hidden = mode.value !== 'certifie';
      explication.textContent = mode.value === 'certifie'
        ? 'Chaque page caviardée est refaite en image à 300 ppp (son texte n\'est plus sélectionnable), toutes les informations cachées sont retirées — métadonnées, pièces jointes, scripts, vignettes, commentaires, signets —, la copie écrite est rouverte pour y chercher les termes caviardés, et un journal horodaté, avec l\'empreinte du fichier, est enregistré à côté. C\'est la méthode des archives nationales : lente, lourde, sûre.'
        : mode.value === 'marques'
          ? 'Rien n\'est caviardé dans le fichier : chaque zone s\'écrit comme une marque « Redact » (une annotation de caviardage en attente), avec le texte toujours présent dessous. Une autre personne la relit, puis l\'applique — ici, avec « Commentaires du document » › « Reprendre les marques de caviardage », ou dans Acrobat. Les termes caviardés partout dans le document ne sont pas appliqués dans ce mode.'
          : 'Le texte caviardé est retiré du fichier à l\'export, page par page, sans convertir en image ce qui peut s\'en passer.';
    };
    mode.addEventListener('change', maj); maj();
    dialog({
      aide: 'caviardage-mode',
      title: 'Mode du caviardage', icon: IC.redact,
      build: b => {
        b.append(field('Mode', mode, 'À choisir avant d\'exporter. Il s\'applique à l\'export, jamais au document ouvert.'));
        b.append(explication);
        b.append(termes);
      },
      actions: [
        { label: 'Annuler', onClick: c => c() },
        { label: 'Appliquer', primary: true, onClick: close => {
          snapshot('Mode du caviardage');
          const v = mode.value;
          if (v === 'certifie') state.nettoyage = Object.assign({}, NETTOYAGE_TOUT, { caviardage: 'certifie', termes: termes.input.checked });
          else if (v === 'marques') state.nettoyage = Object.assign({}, NETTOYAGE_RIEN, { caviardage: 'marques' });
          else if (n.caviardage) {
            const reste = Object.assign({}, n, { caviardage: '', termes: false });
            state.nettoyage = Object.keys(NETTOYAGE_TOUT).some(k => reste[k]) && n.caviardage !== 'certifie' ? reste : null;
          }
          state.touched = true; vue.render(); close();
          setLast(v === 'certifie' ? 'Caviardage certifié à l\'export · Ctrl+Z pour annuler' : v === 'marques' ? 'Caviardage en marques à relire : rien n\'est retiré · Ctrl+Z pour annuler' : 'Caviardage appliqué à l\'export');
        } },
      ],
    });
  }
