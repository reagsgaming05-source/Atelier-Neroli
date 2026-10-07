  // =====================================================================
  //  Préférences
  //  -------------------------------------------------------------------
  //  Ce que la personne règle, au même endroit : comment les documents s'ouvrent, les touches (y compris celles qu'elle
  //  veut changer), et ce que l'application retient de ses habitudes — avec le moyen de tout oublier.
  //  Les touches à une lettre se coupent ici (WCAG 2.1.4 : un raccourci d'une seule touche doit pouvoir être désactivé).
  // =====================================================================
  const MEMOIRES = [
    ['Réglages du filigrane', ['aktum-reglage-filigrane'], 'Le texte, la taille et la position du dernier filigrane posé.'],
    ['Configurations enregistrées', ['aktum-configs-filigrane', 'aktum-configs-entete', 'aktum-configs-proprietes'], 'Les jeux de réglages nommés (filigrane, en-tête et pied de page, propriétés) que vous avez enregistrés.'],
    ['Tampons mémorisés', ['aktum-tampons'], 'Les tampons personnels (« Reçu le… ») que vous avez créés.'],
    ['Signatures mémorisées', ['aktum-signatures'], 'Les signatures dessinées sur ce poste : des images de votre main.'],
    ['Position de la signature', ['aktum-reglage-signature-position'], 'L\'endroit où vous posez d\'habitude votre signature sur une page.'],
    ['Dernière recherche', ['aktum-reglage-recherche'], 'Les derniers termes cherchés et les options choisies.'],
    ['Auteur des annotations', ['aktum-auteur-annotations'], 'Votre choix d\'inscrire ou non votre nom sur les annotations que vous posez.'],
    ['Choix d\'écrasement', ['aktum-ecraser'], 'Votre réponse « toujours » à la question de réécrire le fichier ouvert.'],
    ['Langue de la reconnaissance de texte', ['aktum-ocr-langue'], 'Le français, l\'allemand ou les deux, pour lire un scan.'],
    ['Affichage', ['aktum-vue', 'aktum-zoom', 'aktum-zoom-lecture', 'aktum-dispo', 'aktum-volet', 'aktum-panneau-replie', 'aktum-groupes-replies'], 'La vue, le zoom, la disposition, le volet et les groupes d\'outils repliés.'],
  ];
  const aDesChoses = cles => cles.some(c => { try { return localStorage.getItem(c) != null; } catch (e) { return false; } });
  const oublier = cles => cles.forEach(c => { try { localStorage.removeItem(c); } catch (e) { signaler('Mémoire de l\'application', e, 'info'); } });

  // La touche en cours de choix (un écouteur de la fenêtre, pris avant ceux de la boîte, qui fermerait sur Échap).
  let captureTouche = null;
  const finCapture = () => { if (captureTouche) window.removeEventListener('keydown', captureTouche, true); captureTouche = null; };

  function toolPreferences() {
    const bureau = window.AktumDesktop || null;
    dialog({
      title: 'Préférences', icon: IC.info, wide: true,
      build: (b, api) => {
        // --- Ouverture des documents (application fenêtrée)
        if (bureau && typeof bureau.lireReglage === 'function') {
          const onglet = checkbox('pref-onglet', 'Ouvrir dans un onglet de la fenêtre déjà ouverte', false);
          bureau.lireReglage('toujoursEnOnglet').then(v => { onglet.input.checked = v === true; }).catch(e => signaler('Préférences', e, 'info'));
          onglet.input.addEventListener('change', () => { bureau.ecrireReglage('toujoursEnOnglet', onglet.input.checked).catch(e => signaler('Préférences', e)); });
          b.append(groupOf('Ouverture des documents', [onglet, note('Concerne un double-clic sur un PDF depuis le bureau ou l\'explorateur, « Ouvrir avec » et la liste des fichiers récents. Sans ce réglage, chaque document s\'ouvre dans sa propre fenêtre. « Ouvrir » et « Nouvel onglet », dans la fenêtre, ouvrent toujours un onglet.')]));
        }

        // --- Annotations : l'auteur qui part dans le fichier
        let auteurCoupe = false;
        try { auteurCoupe = localStorage.getItem(CLE_AUTEUR_ANNOT) === '0'; } catch (e) { signaler('Préférences', e, 'info'); }
        const auteurCase = checkbox('pref-auteur', 'Inscrire mon nom comme auteur des annotations que je pose', !auteurCoupe);
        auteurCase.input.addEventListener('change', () => {
          try { if (auteurCase.input.checked) localStorage.removeItem(CLE_AUTEUR_ANNOT); else localStorage.setItem(CLE_AUTEUR_ANNOT, '0'); }
          catch (e) { signaler('Préférences', e, 'info'); }
        });
        b.append(groupOf('Annotations', [auteurCase, note(bureau && bureau.profil
          ? 'Surlignages, cadres, textes et tampons portent le nom de votre compte et la date : la personne qui relit sait de qui vient chaque remarque. Ce nom est lisible par quiconque reçoit le PDF. Décochez pour ne rien inscrire.'
          : 'Hors d\'un compte, aucun nom n\'est inscrit : les annotations ne portent que leur date.')]));

        // --- Touches
        const seules = checkbox('pref-touches-seules', 'Touches à une lettre (R pivote, V sélectionne, H surligne…)', touchesSeulesActives());
        seules.input.addEventListener('change', () => {
          try { if (seules.input.checked) localStorage.removeItem(CLE_TOUCHES_SEULES); else localStorage.setItem(CLE_TOUCHES_SEULES, '0'); }
          catch (e) { signaler('Préférences', e, 'info'); }
        });
        const liste = document.createElement('div'); liste.className = 'prefs-touches';
        const message = note('', 'warn'); message.hidden = true;
        const arreterCapture = finCapture;
        const dessiner = () => {
          arreterCapture();
          liste.replaceChildren();
          let groupe = null;
          RACCOURCIS.commandes.forEach(c => {
            if (c.groupe !== groupe) {
              groupe = c.groupe;
              const h = document.createElement('h4'); h.className = 'prefs-groupe'; h.textContent = tr(groupe);
              liste.appendChild(h);
            }
            const ligne = document.createElement('div'); ligne.className = 'prefs-ligne'; ligne.dataset.commande = c.id;
            const nom = document.createElement('span'); nom.className = 'prefs-nom'; nom.textContent = libelleDeCommande(c);
            const touches = document.createElement('span'); touches.className = 'prefs-touche';
            touchesDe(c).forEach((combo, j) => {
              if (j) touches.append(document.createTextNode(' ' + tr('ou') + ' '));
              libelleTouche(combo).split('\u0000').forEach((k, i) => { if (i) touches.append(document.createTextNode(' + ')); const kb = document.createElement('kbd'); kb.textContent = k; touches.appendChild(kb); });
            });
            const changer = document.createElement('button');
            changer.type = 'button'; changer.className = 'tb-btn'; changer.textContent = 'Changer';
            changer.setAttribute('aria-label', tr('Changer la touche de « {0} »').replace('{0}', libelleDeCommande(c)));
            changer.addEventListener('click', () => {
              arreterCapture();
              $$('.prefs-ligne.capture', liste).forEach(l => l.classList.remove('capture'));
              ligne.classList.add('capture');
              touches.textContent = tr('Appuyez sur la touche voulue (Échap : annuler)…');
              message.hidden = true;
              const ecoute = e => {
                // avant tout autre gestionnaire (la boîte fermerait sur Échap)
                e.preventDefault(); e.stopPropagation();
                if (e.key === 'Escape') { dessiner(); return; }
                const combo = comboDe(e);
                if (!combo) return;
                const refus = verdictTouche(c, combo);
                if (refus) { message.textContent = refus; message.hidden = false; return; }
                poserTouches(c.id, [combo]);
                dessiner();
              };
              captureTouche = ecoute;
              window.addEventListener('keydown', ecoute, true);
            });
            const defaut = document.createElement('button');
            defaut.type = 'button'; defaut.className = 'tb-btn'; defaut.textContent = 'Rétablir';
            defaut.hidden = touchesChangees()[c.id] === undefined;
            defaut.addEventListener('click', () => { poserTouches(c.id, null); message.hidden = true; dessiner(); });
            ligne.append(nom, touches, changer, defaut);
            liste.appendChild(ligne);
          });
        };
        dessiner();
        const toutRetablir = document.createElement('button');
        toutRetablir.type = 'button'; toutRetablir.className = 'tb-btn'; toutRetablir.textContent = 'Rétablir toutes les touches d\'origine';
        toutRetablir.addEventListener('click', () => { try { localStorage.removeItem(CLE_TOUCHES); } catch (e) { signaler('Préférences', e, 'info'); } envoyerLesAccelerateurs(); message.hidden = true; dessiner(); });
        b.append(groupOf('Touches', [seules, note('Les touches du menu (Fichier, Édition, Affichage, Outils) suivent ce que vous choisissez ici. Un geste d\'une seule lettre, hors d\'un champ de saisie, peut gêner qui dicte ou utilise un clavier adapté : décochez-les alors.'), message, liste, toutRetablir]));

        // --- Ce que l'application retient
        const memoire = document.createElement('div'); memoire.className = 'prefs-memoire';
        const dessinerMemoire = () => {
          memoire.replaceChildren();
          MEMOIRES.forEach(([titre, cles, quoi]) => {
            const ligne = document.createElement('div'); ligne.className = 'prefs-ligne';
            const nom = document.createElement('span'); nom.className = 'prefs-nom';
            const t = document.createElement('b'); t.textContent = titre;
            const d = document.createElement('span'); d.className = 'prefs-detail'; d.textContent = quoi;
            nom.append(t, document.createElement('br'), d);
            const b1 = document.createElement('button');
            b1.type = 'button'; b1.className = 'tb-btn'; b1.textContent = 'Oublier';
            b1.setAttribute('aria-label', tr('Oublier : {0}').replace('{0}', tr(titre)));
            const presente = aDesChoses(cles);
            b1.disabled = !presente;
            b1.addEventListener('click', () => { oublier(cles); dessinerMemoire(); setLast(tr('« {0} » oublié.').replace('{0}', tr(titre))); });
            ligne.append(nom, b1);
            memoire.appendChild(ligne);
          });
        };
        dessinerMemoire();
        b.append(groupOf('Ce que l\'application retient', [note('Ces réglages restent sur ce poste, en clair, et ne sont envoyés nulle part. Vous les retrouvez d\'un document à l\'autre ; ici, vous pouvez les oublier un à un.'), memoire]));
      },
      actions: [{ label: 'Fermer', primary: true, onClick: c => c() }],
      onClose: finCapture,
    });
  }
