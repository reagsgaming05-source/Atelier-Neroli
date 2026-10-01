  // =====================================================================
  //  Raccourcis clavier : une seule table, lue partout
  //  -------------------------------------------------------------------
  //  desktop/raccourcis.json déclare chaque geste, ses touches d'origine et son groupe. La page la lit pour répondre au
  //  clavier, pour sa fenêtre d'aide et pour les préférences ; le menu de l'application fenêtrée la lit aussi (les
  //  touches qu'une personne a changées lui sont envoyées) ; le guide et les tests en tirent leurs listes. Il n'y a
  //  donc plus une chaîne de `else if` d'un côté, une fenêtre d'aide de l'autre et un menu d'un troisième, qui se
  //  contredisent sans qu'on s'en aperçoive.
  // =====================================================================
  const RACCOURCIS = /*@raccourcis@*/{ commandes: [], fixes: [] };
  const CLE_TOUCHES = 'aktum-raccourcis';          // { id: [touches] } : ce que la personne a changé
  const CLE_TOUCHES_SEULES = 'aktum-touches-seules'; // « 0 » : les touches à une lettre sont coupées
  const ACTIONS = {};                               // id -> { agit(e), quand(e) } : posées par init(), qui a les fonctions

  function touchesChangees() {
    try {
      const o = JSON.parse(localStorage.getItem(CLE_TOUCHES) || '{}');
      return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    } catch (e) { signaler('Raccourcis clavier', e, 'info'); return {}; }
  }
  function touchesDe(c) {
    const t = touchesChangees()[c.id];
    return Array.isArray(t) ? t.filter(x => typeof x === 'string') : c.touches;
  }
  function poserTouches(id, touches) {
    const o = touchesChangees();
    if (touches == null) delete o[id]; else o[id] = touches;
    try { if (Object.keys(o).length) localStorage.setItem(CLE_TOUCHES, JSON.stringify(o)); else localStorage.removeItem(CLE_TOUCHES); }
    catch (e) { signaler('Raccourcis clavier', e, 'info'); }
    envoyerLesAccelerateurs();
    poserLesInfobulles();
  }
  function touchesSeulesActives() {
    try { return localStorage.getItem(CLE_TOUCHES_SEULES) !== '0'; } catch (e) { return true; }
  }
  // La personne a-t-elle changé quelque chose ? (pour proposer de tout rétablir)
  const raccourcisChanges = () => Object.keys(touchesChangees()).length > 0;

  // La touche d'un évènement, écrite comme dans la table : Ctrl (ou Cmd), Alt, Shift, puis la touche.
  // Les chiffres se lisent à la touche physique (Maj+1 donne « + » ou « ! » selon le clavier) ; un signe qui demande
  // déjà Maj (« ? », « + ») ne le répète pas ; les lettres s'écrivent en capitales.
  function comboDe(e) {
    let k = e.key || '';
    if (k === 'Control' || k === 'Shift' || k === 'Alt' || k === 'Meta' || k === 'AltGraph' || k === 'Dead') return '';
    if (/^Digit\d$/.test(e.code || '')) k = e.code.slice(5);
    else if (k === ' ') k = 'Space';
    else if (k.length === 1) k = /[a-zA-Z]/.test(k) ? k.toUpperCase() : k;
    const maj = e.shiftKey && !(k.length === 1 && !/[A-Z0-9]/.test(k));
    return [(e.ctrlKey || e.metaKey) ? 'Ctrl' : '', e.altKey ? 'Alt' : '', maj ? 'Shift' : '', k].filter(Boolean).join('+');
  }

  // Répond à une touche : la commande de la table qui la porte, dans la portée demandée, si son action veut bien (`quand`).
  // Rend vrai quand quelqu'un a répondu.
  function traiterLaTouche(e, portee) {
    const combo = comboDe(e);
    if (!combo) return false;
    for (const c of RACCOURCIS.commandes) {
      if ((c.portee || 'page') !== portee) continue;
      if (c.uneLettre && !touchesSeulesActives()) continue;
      if (!touchesDe(c).includes(combo)) continue;
      const a = ACTIONS[c.id];
      if (!a || (a.quand && !a.quand(e))) continue;
      e.preventDefault();
      a.agit(e);
      return true;
    }
    return false;
  }

  // Le nom d'une touche, dans la langue affichée.
  const NOMS_TOUCHES = { Ctrl: 'Ctrl', Shift: 'Maj', Alt: 'Alt', Delete: 'Suppr', Backspace: 'Retour arrière', Escape: 'Échap', Enter: 'Entrée', Space: 'Espace', Tab: 'Tab',
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', PageUp: 'Page préc.', PageDown: 'Page suiv.', Home: 'Début', End: 'Fin', Clic: 'Clic', 'Double-clic': 'Double-clic', 'Clic droit': 'Clic droit' };
  // « Ctrl+Shift+S » en une liste de touches à afficher, séparées par un octet nul (le « + » est lui-même une touche).
  function libelleTouche(combo) {
    const jetons = [];
    let reste = combo;
    while (reste.length) {
      const m = /^(Ctrl|Shift|Alt)\+(.+)$/.exec(reste);
      if (m) { jetons.push(m[1]); reste = m[2]; continue; }
      jetons.push(reste); reste = '';
    }
    return jetons.map(j => tr(NOMS_TOUCHES[j] || j)).join('\u0000');
  }
  // Un geste, dans la langue affichée ; « Enregistrer » devient « Exporter le PDF » dans le navigateur.
  const libelleDeCommande = c => tr(c.id === 'enregistrer' && !state.bureau ? 'Exporter le PDF' : c.libelle);

  // L'infobulle d'un geste, avec sa touche : « Ouvrir des PDF ou des images (Ctrl+O) ». La touche est celle de la personne, écrite
  // dans la langue affichée ; un geste d'une seule lettre n'en montre pas quand ces touches sont coupées.
  function touchesAffichees(id) {
    const c = RACCOURCIS.commandes.find(x => x.id === id);
    if (!c || (c.uneLettre && !touchesSeulesActives())) return '';
    const t = touchesDe(c)[0];
    return t ? libelleTouche(t).split('\u0000').join('+') : '';
  }
  function infobulle(base, id) {
    const t = touchesAffichees(id);
    return tr(base) + (t ? ' (' + t + ')' : '');
  }
  // Les boutons que la page pose d'avance : leur infobulle suit la table, au démarrage, à chaque changement de touche ou de langue.
  const INFOBULLES = [
    ['#btn-open', 'Ouvrir des PDF ou des images', 'ouvrir'], ['#btn-undo', 'Annuler', 'annuler'], ['#btn-redo', 'Rétablir', 'retablir'],
    ['.vue-mode[data-vue="lecture"]', 'Lire le document', 'lecture'], ['.vue-mode[data-vue="organiser"]', 'Organiser les pages', 'organiser'],
    ['#zoom-moins', 'Réduire', 'zoom-moins'], ['#zoom-plus', 'Agrandir', 'zoom-plus'],
    ['#btn-select-all', 'Tout sélectionner', 'tout-selectionner'], ['#btn-search', 'Rechercher du texte', 'rechercher'],
    ['#btn-print', 'Imprimer', 'imprimer'], ['#sel-rot-left', 'Pivoter à gauche', 'pivoter-gauche'],
    ['.onglet .x', 'Fermer cet onglet', 'fermer-onglet'], ['#onglet-plus', 'Nouvel onglet', 'nouvel-onglet'],
  ];
  function poserLesInfobulles() {
    INFOBULLES.forEach(([sel, base, id]) => { $$(sel).forEach(b => { b.title = infobulle(base, id); }); });
    const b = $('#btn-replier');
    if (b) {
      const info = infobulle(b.getAttribute('aria-expanded') === 'false' ? 'Déplier le panneau' : 'Replier le panneau', 'panneau');
      b.title = info; b.setAttribute('aria-label', info);
    }
    // « Enregistrer » est « Exporter le PDF » dans le navigateur ; dans l'application, il réécrit le fichier ouvert (40-tuiles.js l'écrit alors)
    if (!state.bureau && el.btnExport) el.btnExport.title = infobulle('Exporter le PDF', 'enregistrer');
    else if (state.bureau) vue.syncButtons();
  }

  // Les lignes de la fenêtre d'aide : [[touches], libellé], rangées par groupe, dans l'ordre de la table.
  function groupesDeRaccourcis() {
    const ordre = [], parGroupe = new Map();
    const ajouter = (groupe, ligne) => { if (!parGroupe.has(groupe)) { parGroupe.set(groupe, []); ordre.push(groupe); } parGroupe.get(groupe).push(ligne); };
    RACCOURCIS.commandes.forEach(c => {
      if (c.uneLettre && !touchesSeulesActives()) return;
      const touches = touchesDe(c).map(libelleTouche);
      if (touches.length) ajouter(c.groupe, [touches, libelleDeCommande(c)]);
    });
    RACCOURCIS.fixes.forEach(f => ajouter(f.groupe, [[].concat(f.touches).map(libelleTouche), tr(f.libelle)]));
    return ordre.map(g => [tr(g), parGroupe.get(g)]);
  }

  // Au menu de l'application fenêtrée : les touches de chaque entrée qui en a une, telles qu'elles sont ici.
  function envoyerLesAccelerateurs() {
    const b = window.AktumDesktop;
    if (!b || typeof b.definirAccelerateurs !== 'function') return;
    const o = {};
    RACCOURCIS.commandes.filter(c => c.menu).forEach(c => { o[c.id] = touchesDe(c); });
    try { b.definirAccelerateurs(o); } catch (e) { signaler('Touches du menu', e, 'info'); }
  }

  // Une touche qu'on propose pour un geste : ce qu'elle a de défendu, ou rien. Le geste d'un autre ne se prend pas.
  function verdictTouche(c, combo) {
    if (!combo) return tr('Appuyez sur la touche voulue.');
    const aModif = /^(Ctrl|Alt)\+/.test(combo);
    const seule = !c.uneLettre && !aModif && !/^(F\d+|Delete|Backspace|Home|End|PageUp|PageDown|Shift\+F\d+)$/.test(combo);
    if (seule) return tr('Cette touche seule est réservée à la saisie : ajoutez Ctrl ou Alt.');
    if (/^Ctrl\+(C|V|X)$/.test(combo) || combo === 'Escape' || combo === 'Tab' || combo === 'Enter') return tr('Cette touche est réservée au système.');
    const autre = RACCOURCIS.commandes.find(x => x.id !== c.id && (x.portee || 'page') === (c.portee || 'page') && touchesDe(x).includes(combo));
    if (autre) return tr('Déjà prise par « {0} ».').replace('{0}', libelleDeCommande(autre));
    return '';
  }

  function toolHelp() {
    dialog({
      title: 'Raccourcis et aide', icon: IC.info, wide: true,
      build: (b, api) => {
        // La visite en quatre gestes, sur le document d'exemple : la première chose qu'on propose à qui ouvre l'aide.
        const visite = document.createElement('button'); visite.type = 'button'; visite.className = 'tb-btn primary'; visite.id = 'btn-visite';
        visite.textContent = 'Découvrir Aktum PDF en 5 minutes';
        visite.addEventListener('click', () => { api.close(); decouvrir().catch(e => signaler('Visite guidée', e)); });
        b.appendChild(visite);
        const mk = rows => {
          const dl = document.createElement('dl'); dl.className = 'kv';
          rows.forEach(r => {
            const dt = document.createElement('dt');
            // plusieurs touches possibles pour un même geste : « Suppr ou Retour arrière »
            r[0].forEach((combo, j) => {
              if (j) dt.append(document.createTextNode(' ' + tr('ou') + ' '));
              combo.split('\u0000').forEach((k, i) => { if (i) dt.append(document.createTextNode(' + ')); const kb = document.createElement('kbd'); kb.textContent = k.trim(); dt.appendChild(kb); });
            });
            const dd = document.createElement('dd'); dd.textContent = r[1];
            dl.append(dt, dd);
          });
          return dl;
        };
        // Les touches viennent de la table (desktop/raccourcis.json) : ce que la fenêtre dit est ce que le clavier fait, y compris
        // ce que la personne a changé dans les préférences.
        groupesDeRaccourcis().forEach(([titre, lignes]) => b.append(groupOf(titre, [mk(lignes)])));
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
        const bureau = window.AktumDesktop || null;
        b.append(note(APP + ' ' + APP_VERSION
          + (/^__/.test(APP_CONSTRUCTION) ? ' · version de travail' : ' · ' + APP_CONSTRUCTION)
          + (bureau && bureau.construction ? ' · application ' + (bureau.version || '') + ' ' + bureau.construction : '')));
        b.append(note('Astuce : tapez un chiffre sur une page sélectionnée au clavier pour la déplacer directement à ce numéro.'));
        const conf = document.createElement('div');
        conf.style.display = 'flex'; conf.style.flexDirection = 'column'; conf.style.gap = '8px';
        [
          'Vos documents ne quittent jamais cet ordinateur. Ils sont lus, modifiés et réassemblés par le navigateur, dans la mémoire de cette page.',
          'Aucun envoi, aucun compte, aucun cookie, aucune mesure d\'audience, aucun identifiant. Ce que vous réglez — thème, vue et zoom, touches, tampons et signatures, derniers réglages de filigrane ou de recherche — est gardé sur ce poste, en clair, et nulle part ailleurs : Préférences permet de l\'oublier, un réglage à la fois.',
          state.bureau
            ? 'Ce que vous mémorisez est écrit en clair dans le dossier data/, sans mot de passe : tampons, signatures, fichiers récents, et le travail mis de côté pour la récupération (effacé au bout de sept jours, ou au-delà de dix dépôts). Quiconque ouvre votre session Windows peut donc reposer votre signature sur un PDF. Verrouillez votre session, et ne mémorisez pas votre signature sur un poste partagé — tracez-la au moment de signer, sans cocher « Mémoriser ».'
            : 'Les tampons et signatures que vous mémorisez restent dans ce navigateur, en clair : quiconque ouvre votre session peut les reposer sur un PDF.',
          'La page ne sait contacter personne : ses règles de sécurité interdisent toute connexion sortante.',
        ].forEach(t => conf.appendChild(note(t)));
        b.append(groupOf('Confidentialité', [conf]));
      },
    });
  }
