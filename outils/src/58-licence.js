  // =====================================================================
  //  La licence, vue de la fenêtre
  //  -------------------------------------------------------------------
  //  L'état vient de l'application fenêtrée (desktop/licence.js) : une licence
  //  signée posée à côté de l'exécutable, ou un essai qui court depuis le premier
  //  lancement. La page ne décide de rien : elle affiche, et refuse de produire
  //  de nouveaux fichiers quand l'essai est fini — en le disant, et sans jamais
  //  toucher à ce qui est ouvert : le travail en cours reste dans la récupération.
  //  Pas de filigrane, pas de fonction retirée : pendant l'essai, tout marche, et
  //  ce qu'on produit est propre.
  // =====================================================================
  function majLicence() {
    const chip = document.getElementById('licence-ligne');
    const l = state.licence;
    if (!chip) return;
    const visible = !!l && (l.etat === 'essai' || l.etat === 'essai-fini');
    chip.hidden = !visible;
    if (!visible) return;
    chip.textContent = l.etat === 'essai-fini'
      ? 'Essai terminé · lecture seule'
      : 'Essai : ' + plural(l.joursRestants, 'jour restant', 'jours restants');
    chip.classList.toggle('fini', l.etat === 'essai-fini');
    chip.title = l.description + ' Cliquez pour les détails.';
  }

  function toolLicence() {
    const l = state.licence;
    if (!l) { toast('La licence se lit dans l\'application de bureau.', 'warn'); return; }
    dialog({
      title: 'Licence', icon: IC.info,
      build: b => {
        b.append(note(l.description));
        if (l.invalide) b.append(note('Un fichier « licence.json » est posé, mais il n\'est pas accepté : ' + l.invalide + '.'));
        if (l.etat === 'essai' || l.etat === 'essai-fini') {
          b.append(note(l.etat === 'essai'
            ? 'Pendant l\'essai, toutes les fonctions sont ouvertes, et les fichiers produits ne portent aucun filigrane.'
            : 'Vous pouvez toujours ouvrir, lire et rechercher. L\'enregistrement et l\'export de nouveaux fichiers sont suspendus ; ce qui est ouvert reste en l\'état et le travail en cours est gardé.'));
          b.append(note('Pour acheter ou prolonger : adressez-vous à l\'éditeur'
            + (l.editeur && l.editeur.contact ? ' — ' + (l.editeur.nom ? l.editeur.nom + ', ' : '') + l.editeur.contact : '') + '. '
            + 'Il vous remet un fichier « licence.json » : posez-le à côté de l\'exécutable, sans rien désinstaller, et relancez l\'application.'));
        }
      },
      actions: [{ label: 'Fermer', primary: true, onClick: c => c() }],
    });
  }

  // Une seule porte pour tout ce que l'application produit : deliver().
  function essaiFiniRefuse() {
    const l = state.licence;
    if (!state.bureau || !l || l.etat !== 'essai-fini') return false;
    toast('L\'essai est terminé : l\'enregistrement est suspendu. Le travail en cours est gardé ; voir « Licence » en bas de la fenêtre.', 'error');
    toolLicence();
    return true;
  }
