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
      title: 'Nettoyer le document', icon: IC.vide, aide: 'nettoyer',
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
