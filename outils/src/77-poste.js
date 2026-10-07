  // =====================================================================
  //  Le poste de travail (application fenêtrée)
  //  -------------------------------------------------------------------
  //  Ce que le logiciel fait avec le reste du poste, et rien que ce qu'on lui demande : joindre le PDF à un message (le message s'affiche, il ne
  //  part que si la personne l'envoie), annoncer les numérisations que le copieur dépose dans un dossier qu'elle a choisi, copier une page ou une
  //  zone de page comme image, montrer le fichier dans son dossier, proposer l'application pour ouvrir les PDF. Rien de tout cela ne sort du poste.
  //  Le processus principal fait ce que la page ne peut pas (voir desktop/main.js) ; la page ne lui donne jamais de chemin à lire ou à effacer.
  // =====================================================================
  const posteSait = f => { const b = window.AktumDesktop; return !!(b && typeof b[f] === 'function'); };
  const NOM_SANS_MODIFIE = () => safeBase(el.filename.value).replace(SUFFIXE_MODIFIE, '');

  // --- Envoyer par courriel ---------------------------------------------------------------------------------------------------------------
  // Le PDF est produit comme à l'export (mêmes avertissements : signature détruite, caviardage, caractères), puis remis au processus principal.
  async function joindreAuMessage(octets, nom) {
    if (essaiFiniRefuse()) return false;
    try {
      const r = await window.AktumDesktop.courriel({ nom, octets });
      if (!r || !r.ok) { toast('Le message n\'a pas pu être préparé : ' + ((r && r.erreur) || 'erreur inconnue') + '.', 'error'); return false; }
      if (r.mode === 'outlook') {
        toast('Le message est prêt dans Outlook, le PDF joint. Il ne part que si vous l\'envoyez.');
        setLast('Message préparé dans Outlook : ' + nom);
      } else {
        toast('Le dossier du PDF est ouvert : joignez « ' + nom + ' » à votre message (glissez-le dedans). ' + (r.raison || ''), 'warn');
        setLast('PDF prêt à joindre : ' + nom);
      }
      return true;
    } catch (e) { toast(messageDEchec('La préparation du message', e), 'error'); return false; }
  }
  function toolCourriel() {
    if (!posteSait('courriel')) { toast('« Envoyer par courriel » est dans l\'application : ici, enregistrez le PDF puis joignez-le à votre message.', 'warn'); return; }
    const nSel = state.selected.size;
    const quoi = select('cr-quoi', nSel ? [['tout', 'Le document entier'], ['sel', 'Les pages sélectionnées']] : [['tout', 'Le document entier']], nSel ? 'sel' : 'tout');
    const alleger = checkbox('cr-alleger', 'Alléger les images (150 ppp) pour un message plus petit', false);
    dialog({
      aide: 'courriel',
      title: 'Envoyer par courriel', icon: IC.courriel,
      build: b => {
        b.append(field('Quoi', quoi, 'Le document entier, ou seulement les pages que vous avez sélectionnées dans la grille.'));
        b.append(alleger);
        b.append(note('Le PDF est préparé comme à l\'export, puis joint à un nouveau message dans Outlook. Le message s\'affiche : il ne part que si vous cliquez sur « Envoyer ». Sans Outlook, le dossier du PDF s\'ouvre et vous le joignez vous-même. Rien ne passe par Aktum PDF hors de ce poste.'));
      },
      actions: [{ label: 'Annuler', onClick: c => c() }, { label: 'Préparer le message', primary: true, id: 'cr-preparer', onClick: async close => {
        close();
        const pages = quoi.value === 'sel' && state.selected.size ? selectedPages() : state.pages;
        const opts = { noInPlace: true, envoi: joindreAuMessage };
        if (alleger.input.checked) opts.alleger = { dpi: 150, qualite: 0.72 };
        await exportPages(pages, NOM_SANS_MODIFIE() + '.pdf', opts);
      } }],
    });
  }

  // --- Afficher le document dans son dossier ------------------------------------------------------------------------------------------------
  function afficherLeDocument() {
    if (!posteSait('afficherDansLeDossier')) return;
    const chemin = cheminDocument();
    if (!chemin) { toast('Ce document n\'a pas encore de fichier sur le disque : enregistrez-le d\'abord (Ctrl+Maj+S).', 'warn'); return; }
    window.AktumDesktop.afficherDansLeDossier(chemin).then(ok => { if (!ok) toast('Ce fichier n\'existe plus à cet endroit.', 'warn'); }).catch(e => signaler('Afficher le fichier', e));
  }

  // --- Copier la page, ou une zone, comme image -----------------------------------------------------------------------------------------------
  async function mettreAuPressePapiers(canvas) {
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    if (!blob) throw new Error('l\'image n\'a pas pu être produite');
    const octets = new Uint8Array(await blob.arrayBuffer());
    if (posteSait('copierImage')) { if (!(await window.AktumDesktop.copierImage(octets))) throw new Error('le presse-papiers a refusé l\'image'); return 'copie'; }
    try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); return 'copie'; }
    catch (e) { signaler('Copier une image', e, 'info'); }
    // Le navigateur refuse : l'image est enregistrée, c'est le même service rendu.
    await deliver(blob, NOM_SANS_MODIFIE() + '-extrait.png', 'image/png');
    return 'fichier';
  }
  // zone : { x, y, w, h } en fractions de la page (0 à 1), ou null pour la page entière.
  async function copierLaPageEnImage(p, zone) {
    setBusy('Préparation de l\'image…', 0.3);
    try {
      const { canvas } = await rasterizePage(p, 200);
      let sortie = canvas;
      if (zone) {
        const x = Math.round(zone.x * canvas.width), y = Math.round(zone.y * canvas.height);
        const w = Math.max(1, Math.round(zone.w * canvas.width)), h = Math.max(1, Math.round(zone.h * canvas.height));
        sortie = document.createElement('canvas'); sortie.width = w; sortie.height = h;
        sortie.getContext('2d').drawImage(canvas, x, y, w, h, 0, 0, w, h);
      }
      const r = await mettreAuPressePapiers(sortie);
      toast(r === 'copie' ? (zone ? 'La zone est copiée comme image : collez-la dans un message ou un document.' : 'La page est copiée comme image : collez-la dans un message ou un document.') : 'Le presse-papiers n\'est pas disponible ici : l\'image est enregistrée en PNG.');
      setLast(r === 'copie' ? 'Image copiée' : 'Image enregistrée');
    } catch (e) { toast(messageDEchec('La copie de l\'image', e), 'error'); }
    finally { setBusy(''); }
  }
  // Le cadre à la souris, sur la page qu'on lit : « Instantané ». Échap l'abandonne.
  const instantane = { actif: false };
  function demarrerInstantane() {
    if (state.vue !== 'lecture') { toast('Passez en vue « Lire » pour dessiner la zone à copier.', 'warn'); return; }
    if (instantane.actif) return;
    instantane.actif = true;
    document.body.classList.add('en-instantane');
    setLast('Dessinez la zone à copier sur la page · Échap pour abandonner');
    let cadre = null, depart = null, feuille = null;
    const fin = () => {
      instantane.actif = false;
      document.body.classList.remove('en-instantane');
      document.removeEventListener('pointerdown', bas, true); document.removeEventListener('pointermove', bouge, true);
      document.removeEventListener('pointerup', haut, true); document.removeEventListener('keydown', touche, true);
      if (cadre) cadre.remove();
    };
    const rel = e => { const r = feuille.getBoundingClientRect(); return { x: Math.min(Math.max(e.clientX - r.left, 0), r.width), y: Math.min(Math.max(e.clientY - r.top, 0), r.height), W: r.width, H: r.height }; };
    const bas = e => {
      const f = e.target && e.target.closest ? e.target.closest('.feuille-vue') : null;
      if (!f) return;
      e.preventDefault(); e.stopPropagation();
      feuille = f; depart = rel(e);
      cadre = document.createElement('div'); cadre.className = 'instantane-cadre';
      f.appendChild(cadre);
    };
    const bouge = e => {
      if (!cadre) return;
      e.preventDefault();
      const c = rel(e);
      cadre.style.left = Math.min(depart.x, c.x) + 'px'; cadre.style.top = Math.min(depart.y, c.y) + 'px';
      cadre.style.width = Math.abs(c.x - depart.x) + 'px'; cadre.style.height = Math.abs(c.y - depart.y) + 'px';
    };
    const haut = e => {
      if (!cadre) return;
      e.preventDefault(); e.stopPropagation();
      const c = rel(e);
      const x = Math.min(depart.x, c.x), y = Math.min(depart.y, c.y), w = Math.abs(c.x - depart.x), h = Math.abs(c.y - depart.y);
      const id = +feuille.dataset.id, W = depart.W, H = depart.H;
      fin();
      const p = state.pages.find(q => q.id === id);
      if (!p || w < 6 || h < 6) { toast('Zone trop petite : recommencez en la dessinant plus grande.', 'warn'); return; }
      copierLaPageEnImage(p, { x: x / W, y: y / H, w: w / W, h: h / H });
    };
    const touche = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fin(); setLast('Copie abandonnée'); } };
    document.addEventListener('pointerdown', bas, true); document.addEventListener('pointermove', bouge, true);
    document.addEventListener('pointerup', haut, true); document.addEventListener('keydown', touche, true);
  }
  function toolCopierImage() {
    dialog({
      aide: 'copier-image',
      title: 'Copier comme image', icon: IC.dupliquer,
      build: b => {
        b.append(note('Copie la page, ou une zone de la page, comme une image prête à coller dans un message, un traitement de texte ou un tableur : un extrait de plan, une signature, un tableau. L\'image est faite à 200 ppp, annotations comprises.'));
        b.append(note('Le dessin de la zone se fait à la souris : sans souris, copiez la page entière.', null));
      },
      actions: [
        { label: 'Annuler', onClick: c => c() },
        { label: 'Une zone à dessiner', id: 'ci-zone', onClick: close => { close(); setTimeout(demarrerInstantane, 50); } },
        { label: 'La page entière', primary: true, id: 'ci-page', onClick: close => {
          close();
          const p = state.pages.find(q => q.id === pageCouranteId());
          if (p) copierLaPageEnImage(p, null);
        } },
      ],
    });
  }

  // --- La boîte de réception du copieur -----------------------------------------------------------------------------------------------------
  const arrivees = { total: 0, nouveaux: 0 };
  function brancherLesArrivees() {
    if (!posteSait('onArrivees')) return;
    const b = window.AktumDesktop;
    b.arriveesEtat().then(e => { arrivees.total = e.total; arrivees.nouveaux = e.nouveaux; vue.render(); }).catch(e => signaler('Arrivées du copieur', e, 'info'));
    b.onArrivees(bilan => {
      const avant = arrivees.nouveaux;
      arrivees.total = bilan.total; arrivees.nouveaux = bilan.nouveaux;
      if (bilan.nouveaux > avant) {
        const n = bilan.nouveaux - avant;
        toast(plural(n, 'nouveau document dans la boîte du copieur', 'nouveaux documents dans la boîte du copieur') + ' · Outils › Organiser › Arrivées du copieur');
        setLast(plural(bilan.nouveaux, 'document attend', 'documents attendent') + ' dans la boîte du copieur');
      }
      vue.render();
    });
  }
  const heureDe = ms => { const d = new Date(ms); return formaterDate(d) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

  function toolArrivees() {
    const b = window.AktumDesktop;
    if (!posteSait('arriveesEtat')) { toast('La boîte de réception du copieur est dans l\'application : elle surveille un dossier du poste.', 'warn'); return; }
    const corps = document.createElement('div');
    let minuteur = null, api = null;
    async function rafraichir() {
      let etat, liste = [];
      try { etat = await b.arriveesEtat(); if (etat.actif) liste = await b.arriveesListe(); } catch (e) { signaler('Arrivées du copieur', e); return; }
      corps.replaceChildren();
      if (!etat.dossier) {
        corps.append(note('Désignez le dossier où votre copieur dépose ses numérisations : Aktum PDF y annoncera chaque nouveau document, que vous ouvrez, classez ou supprimez d\'un clic. Le dossier est surveillé tant que l\'application tourne ; rien n\'est déplacé ni supprimé sans votre geste.'));
        const choisir = document.createElement('button'); choisir.type = 'button'; choisir.className = 'tb-btn primary'; choisir.id = 'ar-choisir'; choisir.textContent = 'Choisir le dossier…';
        choisir.addEventListener('click', async () => { await b.arriveesChoisir(); rafraichir(); });
        corps.append(choisir);
        return;
      }
      const tete = document.createElement('div'); tete.className = 'ar-tete';
      const quoi = document.createElement('span'); quoi.className = 'ar-dossier'; quoi.textContent = tr('Dossier surveillé :') + ' ' + etat.dossier;
      const changer = document.createElement('button'); changer.type = 'button'; changer.className = 'tb-btn'; changer.id = 'ar-changer'; changer.textContent = 'Changer…';
      changer.addEventListener('click', async () => { await b.arriveesChoisir(); rafraichir(); });
      const arreter = document.createElement('button'); arreter.type = 'button'; arreter.className = 'tb-btn'; arreter.id = 'ar-arreter'; arreter.textContent = 'Arrêter la surveillance';
      arreter.addEventListener('click', async () => { await b.arriveesArreter(); rafraichir(); toast('La surveillance du dossier est arrêtée. Les documents n\'ont pas bougé.'); });
      tete.append(quoi, changer, arreter);
      corps.append(tete);
      if (!etat.actif) { corps.append(note(etat.erreur || 'Le dossier n\'est pas joignable pour le moment : l\'application réessaie chaque minute.', 'warn')); return; }
      if (!liste.length) { corps.append(note('Aucun document dans la boîte.')); return; }
      const ul = document.createElement('div'); ul.classList.add('list', 'ar-liste');
      liste.forEach(f => {
        const ligne = document.createElement('div'); ligne.className = 'ar-ligne'; ligne.dataset.nom = f.nom;
        const nom = document.createElement('span'); nom.className = 'ar-nom'; nom.textContent = f.nom;
        const detail = document.createElement('span'); detail.className = 'ar-detail';
        detail.textContent = heureDe(f.mtimeMs) + ' · ' + fmtSize(f.taille) + (f.stable ? '' : ' · ' + tr('en cours d\'écriture…'));
        if (f.nouveau && f.stable) { const n = document.createElement('span'); n.className = 'ar-nouveau'; n.textContent = tr('nouveau'); nom.append(' ', n); }
        const texte = document.createElement('span'); texte.className = 'ar-texte'; texte.append(nom, document.createElement('br'), detail);
        const bouton = (classes, libelle, onClick, desactive) => {
          const x = document.createElement('button'); x.type = 'button'; x.classList.add('tb-btn', ...classes); x.textContent = libelle; x.disabled = !!desactive;
          x.setAttribute('aria-label', tr(libelle) + ' : ' + f.nom);
          x.addEventListener('click', onClick);
          return x;
        };
        const ouvrir = bouton(['ar-ouvrir'], 'Ouvrir', async () => {
          const l = await b.arriveesOuvrir(f.nom);
          if (!l.length) { toast('Ce document n\'est plus dans la boîte.', 'warn'); rafraichir(); return; }
          if (api) api.close();
          await vue.ouvrirListe(l, { onglet: true });
        }, !f.stable);
        const classer = bouton(['ar-classer'], 'Classer…', async () => {
          const r = await b.arriveesClasser(f.nom);
          if (r && r.ok) toast('« ' + f.nom + ' » est classé dans ' + r.dossier + (r.nom !== f.nom ? ' (sous le nom « ' + r.nom + ' »)' : '') + '.');
          else if (r && r.erreur) toast(r.erreur, 'warn');
          rafraichir();
        }, !f.stable);
        const supprimer = bouton(['ar-supprimer', 'peril'], 'Supprimer…', async () => {
          const r = await b.arriveesSupprimer(f.nom);
          if (r && r.ok) toast('« ' + f.nom + ' » est supprimé de la boîte.');
          else if (r && r.erreur) toast(r.erreur, 'warn');
          rafraichir();
        }, !f.stable);
        ligne.append(texte, ouvrir, classer, supprimer);
        ul.append(ligne);
      });
      corps.append(ul);
    }
    api = dialog({
      aide: 'arrivees',
      title: 'Arrivées du copieur', icon: IC.arrivees, wide: true,
      build: bd => { bd.append(corps); rafraichir(); minuteur = setInterval(rafraichir, 5000); },
      actions: [{ label: 'Fermer', primary: true, onClick: c => c() }],
      onClose: () => { if (minuteur) clearInterval(minuteur); minuteur = null; },
    });
  }

  // --- Préférences : « Ouvrir les PDF avec Aktum PDF » et le dossier du copieur ---------------------------------------------------------
  function groupesDuPoste(b) {
    const groupes = [];
    if (typeof b.associationEtat === 'function') {
      const etat = document.createElement('div'); etat.className = 'prefs-etat'; etat.id = 'pref-assoc-etat';
      const inscrire = document.createElement('button'); inscrire.type = 'button'; inscrire.className = 'tb-btn'; inscrire.id = 'pref-assoc-inscrire'; inscrire.textContent = 'Proposer Aktum PDF pour ouvrir les PDF…';
      const retirer = document.createElement('button'); retirer.type = 'button'; retirer.className = 'tb-btn'; retirer.id = 'pref-assoc-retirer'; retirer.textContent = 'Retirer l\'inscription';
      const reglages = document.createElement('button'); reglages.type = 'button'; reglages.className = 'tb-btn'; reglages.id = 'pref-assoc-reglages'; reglages.textContent = 'Ouvrir les réglages de Windows';
      const maj = () => b.associationEtat().then(e => {
        if (!e.possible && !e.inscrit) { etat.textContent = tr(e.raison || 'Non disponible ici.'); inscrire.hidden = true; retirer.hidden = true; reglages.hidden = true; return; }
        etat.textContent = e.inscrit ? tr(e.aJour ? 'Aktum PDF est proposé dans « Ouvrir avec » pour votre compte Windows.' : 'L\'inscription pointe un ancien emplacement : elle sera réécrite au prochain lancement.') : tr('Aktum PDF n\'est pas inscrit : un double-clic sur un PDF ouvre le programme habituel de Windows.');
        inscrire.hidden = e.inscrit || !e.possible; retirer.hidden = !e.inscrit; reglages.hidden = !e.inscrit;
      }).catch(e => signaler('Préférences', e, 'info'));
      inscrire.addEventListener('click', async () => {
        const r = await b.associationInscrire();
        if (r && r.ok) toast('Aktum PDF est proposé dans « Ouvrir avec ». Pour qu\'un double-clic l\'ouvre, choisissez-le dans les réglages de Windows.');
        else if (r && r.erreur) toast(r.erreur, 'error');
        maj();
      });
      retirer.addEventListener('click', async () => { await b.associationRetirer(); toast('L\'inscription est retirée : Windows n\'a plus rien de plus à propos d\'Aktum PDF.'); maj(); });
      reglages.addEventListener('click', () => { b.associationReglages(); });
      maj();
      groupes.push(groupOf('Ouvrir les PDF avec Aktum PDF', [etat, rowOf([inscrire, retirer, reglages], true),
        note('Sans cela, un double-clic sur un PDF ouvre le programme habituel de Windows (le navigateur, souvent). Le bouton écrit quelques clés sous votre compte Windows seulement — aucun droit d\'administrateur, aucun autre utilisateur touché —, et rien d\'autre n\'est jamais écrit dans le registre. Windows laisse ensuite à vous seul le choix du programme par défaut : « Ouvrir les réglages de Windows ». Si le dossier de l\'application est déplacé, l\'inscription se corrige au lancement. Sur une clé USB, elle n\'est pas proposée : elle resterait sur ce poste.')]));
    }
    if (typeof b.arriveesEtat === 'function') {
      const etat = document.createElement('div'); etat.className = 'prefs-etat'; etat.id = 'pref-arr-etat';
      const ouvrir = document.createElement('button'); ouvrir.type = 'button'; ouvrir.className = 'tb-btn'; ouvrir.id = 'pref-arr-ouvrir'; ouvrir.textContent = 'Ouvrir la boîte du copieur…';
      ouvrir.addEventListener('click', () => { toolArrivees(); });   // la boîte des Préférences se referme : une seule boîte à la fois
      b.arriveesEtat().then(e => { etat.textContent = e.dossier ? tr('Dossier surveillé :') + ' ' + e.dossier : tr('Aucun dossier surveillé.'); }).catch(e => signaler('Préférences', e, 'info'));
      groupes.push(groupOf('Boîte de réception du copieur', [etat, rowOf([ouvrir], true), note('Un dossier que vous désignez : les nouvelles numérisations du copieur y sont annoncées. Rien n\'est déplacé ni supprimé sans votre geste.')]));
    }
    return groupes;
  }
