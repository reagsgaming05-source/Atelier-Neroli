  // =====================================================================
  //  Tool panel
  // =====================================================================
  // Le sélecteur de fichiers vit dans init() ; la liste des outils en a besoin
  // pour « Fusionner ». Il est posé ici au démarrage.
  let choisirDesFichiers = null;

  // Les outils sont rangés comme on les cherche, pas comme le code les a écrits : le caviardage est une protection
  // autant qu'une recherche, « Aplatir » une conversion qui se range avec l'export, les commentaires reçus avec les
  // annotations qu'on pose. Un groupe d'un seul outil n'est pas un groupe : « Formulaires » et « Plusieurs fichiers »
  // sont rentrés dans « Modifier » et « Organiser ». « Exporter le PDF » n'y est plus : c'est le bouton principal de
  // la barre d'outils. `mots` : ce que les gens tapent pour le trouver sans connaître son nom (voir le filtre).
  function toolGroups() {
    return [
      { id: 'organiser', title: 'Organiser', items: [
        // Fusionner est, avec signer, le geste le plus courant d'un secrétariat — et le mot que les gens cherchent.
        { id: 'fusionner', name: 'Fusionner des PDF', sub: 'Plusieurs fichiers en un seul document', icon: IC.doc, mots: 'combiner assembler joindre rassembler réunir concaténer ajouter un document', run: () => { if (choisirDesFichiers) choisirDesFichiers(''); } },
        { id: 'blank', name: 'Pages vierges', sub: 'Insérer une ou plusieurs pages', icon: IC.plus, mots: 'page blanche insérer intercalaire', run: toolBlank },
        { id: 'images', name: 'Ajouter des images', sub: 'JPEG, PNG, WebP en pages', icon: IC.image, mots: 'jpg jpeg png photo image scanner numériser convertir', run: toolImages },
        { id: 'vides', name: 'Détecter les pages vides', sub: 'Nettoyer un document scanné', icon: IC.vide, need: 'pages', mots: 'pages blanches nettoyer scan retirer supprimer', run: toolPagesVides },
        { id: 'select-plage', name: 'Sélectionner par numéros', sub: 'Des pages désignées par « 3-7, 12 »', icon: IC.select, need: 'pages', mots: 'plage intervalle pages numéros choisir paires impaires', run: toolSelectionPlage },
        { id: 'split', name: 'Diviser le document', sub: 'Un ou plusieurs fichiers', icon: IC.deux, need: 'pages', mots: 'découper scinder séparer fractionner extraire pages', run: toolSplit },
        { id: 'dossier', name: 'Constituer un dossier', sub: 'Intercalaires, pièces numérotées, sommaire', icon: IC.dossier, need: 'pages', mots: 'assembler annexe annexes bordereau pièces sommaire intercalaire table des matières joindre', run: toolDossier },
        { id: 'resize', name: 'Redimensionner', sub: 'A4, Letter, marges', icon: IC.resize, need: 'pages', mots: 'format taille marges a4 letter rogner recadrer', run: toolResize },
        { id: 'lots', name: 'Traiter plusieurs fichiers', sub: 'Pages vides, compression, numérotation… en série', icon: IC.grille, mots: 'série lot lots batch plusieurs fichiers dossier compresser numéroter protéger', run: () => toolLots() },
      ] },
      { id: 'modifier', title: 'Modifier', items: [
        // La signature était mentionnée en sous-titre de l'éditeur. Pour un syndic qui doit signer un procès-verbal,
        // c'était introuvable. Elle s'ouvre sur la page qu'on lit, pas sur la première du document.
        { id: 'signer', name: 'Signer', sub: 'Poser sa signature sur une page', icon: IC.draw, need: 'pages', mots: 'signature parapher manuscrite dessiner', run: () => {
          openEditor(pageCouranteId());
          edSignature();
        } },
        { id: 'edit', name: 'Éditeur de page', sub: 'Texte, surlignage, signature', icon: IC.pencil, need: 'pages', mots: 'annoter annotation texte surligner modifier éditer', run: () => openEditor(pageCouranteId()) },
        { id: 'caviarder-zone', name: 'Caviarder une zone', sub: 'Masquer une zone de la page, texte compris', icon: IC.redact, need: 'pages', mots: 'biffer rédaction noircir masquer anonymiser cacher effacer', run: () => openEditor(pageCouranteId(), 'redact') },
        { id: 'tampon', name: 'Tampon', sub: 'Reçu le, Payé, Copie conforme, Visé…', icon: IC.stamp, need: 'pages', mots: 'cachet reçu payé copie conforme visé approuvé', run: () => openEditor(pageCouranteId(), 'tampon') },
        { id: 'watermark', name: 'Filigrane', sub: 'Texte en surimpression', icon: IC.water, need: 'pages', mots: 'brouillon confidentiel copie surimpression texte en travers', run: toolWatermark, active: () => !!state.watermark },
        { id: 'stamp', name: 'En-tête et pied de page', sub: 'Texte, date, nom du fichier', icon: IC.header, need: 'pages', mots: 'entête pied date nom du fichier bas de page haut de page', run: () => toolStamp(), active: () => !!state.stamp },
        { id: 'number', name: 'Numéroter les pages', sub: 'Numérotation simple ou Bates', icon: IC.hash, need: 'pages', mots: 'numérotation numéros de page bates pagination', run: () => toolStamp('number'), active: () => !!(state.stamp && (state.stamp.footerCenter || '').includes('{p}')) },
        { id: 'form', name: 'Remplir le formulaire', sub: 'Champs, cases, listes', icon: IC.form, need: 'pages', mots: 'champs cases cocher saisir', run: toolForm, active: () => state.sources.some(s => s.formValues && Object.keys(s.formValues).length) },
        { id: 'serie', name: 'Remplir en série (CSV)', sub: 'Une copie du formulaire par ligne d\'un tableau', icon: IC.form, need: 'pages', mots: 'csv publipostage fusion courrier tableau excel plusieurs copies', run: toolSerie },
        { id: 'commentaires', name: 'Commentaires du document', sub: 'Ceux déjà dans le PDF reçu : lister, retirer', icon: IC.text, need: 'pages', mots: 'annotations notes remarques relecture retirer supprimer', run: toolCommentaires, active: () => state.pages.some(p => p.retraits && p.retraits.length) },
      ] },
      { id: 'exporter', title: 'Exporter', items: [
        { id: 'archiver', name: 'Archiver en PDF/A-2b', sub: 'Format d\'archivage à long terme, contrôlé', icon: IC.save, need: 'pages', mots: 'pdf/a pdfa archive archivage conservation long terme', run: toolArchiver },
        { id: 'exp-img', name: 'Exporter en images', sub: 'PNG ou JPEG', icon: IC.image, need: 'pages', mots: 'png jpg jpeg image convertir', run: toolExportImages },
        { id: 'exp-txt', name: 'Extraire le texte', sub: 'Fichier .txt', icon: IC.txt, need: 'pages', mots: 'txt texte brut copier contenu', run: toolExportText },
        { id: 'compress', name: 'Réduire la taille', sub: 'Compression des pages', icon: IC.zap, need: 'pages', mots: 'compresser optimiser alléger poids mégaoctets envoyer par courriel', run: toolCompress },
        { id: 'flatten', name: 'Aplatir', sub: 'Figer les champs et les annotations', icon: IC.flat, need: 'pages', mots: 'figer fusionner annotations champs verrouiller', run: toolFlatten, active: () => state.flatten || state.figerAnnotations },
      ] },
      { id: 'proteger', title: 'Protéger', items: [
        // L'outil qui caviarde se trouve ici aussi : c'est ici qu'on le cherche.
        { id: 'caviarder', name: 'Rechercher, remplacer, caviarder', sub: 'Un mot, un nom, un numéro : dans tout le document', icon: IC.redact, need: 'pages', mots: 'biffer rédaction noircir masquer anonymiser numéro avs nom', run: toolSearch },
        { id: 'password', name: 'Mot de passe', sub: 'Chiffrement et autorisations', icon: IC.lock, need: 'pages', mots: 'chiffrer chiffrement protéger sécuriser autorisations imprimer copier', run: toolPassword, active: () => !!state.security },
        { id: 'certificat', name: 'Signer avec un certificat', sub: 'Un certificat personnel (.p12, .pfx), signature numérique', icon: IC.draw, need: 'pages', mots: 'signature numérique électronique p12 pfx certificat', run: toolCertificat },
        { id: 'signatures', name: 'Vérifier les signatures', sub: 'Un document signé reçu : intact, modifié, signé par qui', icon: IC.lock, mots: 'signature signé intact modifié authenticité vérifier', run: toolSignatures, active: () => state.sources.some(s => s.proprietes && s.proprietes.signatures) },
      ] },
      { id: 'document', title: 'Document', items: [
        { id: 'props', name: 'Propriétés', sub: 'Titre, auteur, langue, accessibilité', icon: IC.info, need: 'pages', mots: 'titre auteur mots-clés métadonnées langue accessibilité balisé', run: toolProperties, active: () => !!(state.meta.title || state.meta.author || state.meta.subject || state.meta.keywords || state.meta.balise) },
        { id: 'access', name: 'Vérifier l\'accessibilité', sub: 'Titre, langue, balisage, pages sans texte', icon: IC.check, need: 'pages', mots: 'accessibilité accessible lecteur écran balisage pdf/ua handicap malvoyant wcag contrôle vérifier langue titre', run: toolAccessibilite },
        { id: 'search', name: 'Rechercher, remplacer, caviarder', sub: 'Un mot, un nom, un numéro : dans tout le document', icon: IC.search, need: 'pages', mots: 'chercher trouver remplacer biffer rédaction noircir masquer', run: toolSearch },
        { id: 'tableau', name: 'Copier un tableau', sub: 'Vers Excel, en colonnes', icon: IC.tableau, need: 'pages', mots: 'excel csv colonnes lignes extraire tableau', run: toolTableau },
        { id: 'ocr', name: 'Reconnaître le texte', sub: 'OCR local : un scan devient cherchable', icon: IC.ocr, need: 'pages', mots: 'ocr scan scanner numériser texte cherchable lisible', run: toolOcr, active: () => state.pages.some(p => p.ocr) },
        { id: 'comparer', name: 'Comparer deux versions', sub: 'Côte à côte, mots ajoutés ou retirés', icon: IC.compare, need: 'pages', mots: 'différences versions modifications comparaison côte à côte', run: toolComparer },
      ] },
    ];
  }

  // Ce que le filtre trouve en plus des outils : les gestes qui existent ailleurs que dans cette liste — les onze outils
  // de l'éditeur de page, les sept traitements par lots, les commandes de la barre. Chacun mène là où il se fait.
  function raccourcisDuFiltre() {
    const edit = (nom, sub, mots, outil) => ({ id: ['ed', outil].join('-'), name: nom, sub, icon: IC.pencil, need: 'pages', mots, run: () => openEditor(pageCouranteId(), outil), virtuel: 'Dans l\'éditeur de page' });
    const lot = (nom, sub, mots, op) => ({ id: ['lot', op].join('-'), name: nom, sub, icon: IC.grille, mots, run: () => toolLots(op), virtuel: 'Pour plusieurs fichiers' });
    return [
      edit('Surligner', 'Surligner du texte sur la page', 'marquer fluo stabilo souligner', 'highlight'),
      edit('Ajouter du texte', 'Poser un texte sur la page', 'écrire saisir remplir zone de texte', 'text'),
      edit('Modifier le texte existant', 'Corriger un paragraphe du PDF', 'corriger retoucher éditer paragraphe', 'edittext'),
      edit('Encadrer', 'Dessiner un cadre', 'rectangle cadre boîte entourer', 'box'),
      edit('Dessiner à main levée', 'Un trait libre sur la page', 'crayon stylo trait libre dessin', 'draw'),
      edit('Ajouter un champ à remplir', 'Créer un champ de formulaire', 'formulaire champ saisie case', 'champ'),
      edit('Insérer une image', 'Poser une image ou un logo', 'logo photo image tampon signature', 'image'),
      lot('Supprimer les pages vides', 'Dans plusieurs fichiers', 'blanches scan nettoyer', 'vides'),
      lot('Réduire la taille de plusieurs fichiers', 'Compression en série', 'compresser optimiser alléger poids', 'compresser'),
      lot('Numéroter les pages de plusieurs fichiers', 'Numérotation en série', 'numérotation pied de page pagination', 'numeroter'),
      lot('Protéger plusieurs fichiers par mot de passe', 'Chiffrement en série', 'chiffrer mot de passe protéger', 'proteger'),
      lot('Convertir des images en PDF', 'Photos et scans en documents', 'jpg png photo scanner convertir', 'images'),
      lot('Séparer en une page par fichier', 'Découpage en série', 'diviser découper éclater', 'separer'),
      lot('Extraire le texte de plusieurs fichiers', 'Fichiers .txt en série', 'txt texte brut', 'texte'),
      { id: 'cmd-imprimer', name: 'Imprimer', sub: 'Impression, livret, plusieurs pages par feuille', icon: IC.print, need: 'pages', mots: 'livret brochure recto verso feuille imprimante pages par feuille', run: () => dialogImprimer(), virtuel: 'Barre d\'outils' },
      { id: 'cmd-exporter', name: 'Exporter le PDF', sub: 'Le document complet, tel qu\'il est maintenant', icon: IC.save, need: 'pages', mots: 'enregistrer sauvegarder télécharger pdf', run: () => exportPages(state.pages, safeBase(el.filename.value) + '.pdf'), virtuel: 'Barre d\'outils' },
    ];
  }

  // Chaque outil porte sa couleur : on le retrouve du coin de l'œil dans la
  // liste, sans avoir à lire.
  const ETATS_ACTIFS = {
    watermark: 'Un filigrane est posé sur ce document', stamp: 'Un en-tête ou un pied de page est posé sur ce document',
    number: 'Une numérotation est posée sur ce document', form: 'Le formulaire est rempli', commentaires: 'Des commentaires reçus sont retirés',
    flatten: 'Le document sera aplati à l\'export', password: 'Le document sera protégé par un mot de passe à l\'export',
    props: 'Des propriétés sont définies pour ce document', signatures: 'Le document ouvert porte des signatures', ocr: 'Du texte a été reconnu sur ce document',
  };
  const TEINTES_OUTILS = {
    fusionner: '#2D9D5F', blank: '#2680EB', images: '#8C5AE8', vides: '#0D9F8F', 'select-plage': '#6E7681', split: '#E68619',
    dossier: '#D83790', resize: '#2680EB', lots: '#E68619',
    signer: '#D83790', edit: '#8C5AE8', 'caviarder-zone': '#D7373F', tampon: '#E68619', watermark: '#D83790', stamp: '#0D9F8F',
    number: '#E68619', form: '#2D9D5F', serie: '#2D9D5F', commentaires: '#E68619',
    archiver: '#6E7681', 'exp-img': '#8C5AE8', 'exp-txt': '#0D9F8F', compress: '#E68619', flatten: '#2680EB',
    caviarder: '#D7373F', password: '#D7373F', certificat: '#D83790', signatures: '#2680EB',
    props: '#6E7681', access: '#2D9D5F', search: '#2680EB', tableau: '#2D9D5F', ocr: '#8C5AE8', comparer: '#0D9F8F',
  };


  // Trente outils et des gestes qui vivent ailleurs, dans une liste : on ne filtre que ce qu'on sait nommer. Le filtre
  // cherche donc dans le nom, le sous-titre, le groupe et les mots qu'on tape sans connaître le nom officiel (« biffer »
  // pour caviarder, « livret » pour imprimer), dans la langue de l'interface comme dans celle du code. Il trouve aussi
  // les gestes de l'éditeur de page, des traitements par lots et de la barre, et mène là où ils se font.
  let filtreOutils = '';
  const sansAccent = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const CLE_GROUPES_REPLIES = 'aktum-groupes-replies';
  function groupesReplies() {
    try { const v = JSON.parse(localStorage.getItem(CLE_GROUPES_REPLIES) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function replierGroupe(id, replie) {
    const liste = groupesReplies().filter(x => x !== id);
    if (replie) liste.push(id);
    try { localStorage.setItem(CLE_GROUPES_REPLIES, JSON.stringify(liste)); } catch (e) { signaler('Groupes d\'outils', e, 'info'); }
  }

  function brancherLeFiltre() {
    const champ = $('#outil-q'), vider = $('#outil-q-vider');
    if (!champ || champ.dataset.branche) return;
    champ.dataset.branche = '1';
    champ.addEventListener('input', () => { filtreOutils = champ.value.trim(); vider.hidden = !filtreOutils; renderTools(); });
    champ.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !champ.value) return;
      e.stopPropagation(); // sinon la boîte ouverte derrière se fermerait
      champ.value = ''; filtreOutils = ''; vider.hidden = true; renderTools();
    });
    vider.addEventListener('click', () => { champ.value = ''; filtreOutils = ''; vider.hidden = true; renderTools(); champ.focus(); });
  }

  // Ce qu'on peut taper pour trouver un outil : son nom, son sous-titre, son groupe et ses synonymes, en français (le
  // code) et dans la langue affichée (la traduction : un secrétariat en allemand tape des mots allemands).
  const motsDe = (item, groupe) => [item.name, item.sub, item.mots, groupe]
    .filter(Boolean).map(t => t + ' ' + tr(t)).join(' ');

  function renderTools() {
    brancherLeFiltre();
    const host = $('#tool-groups');
    host.replaceChildren();
    const cherche = sansAccent(filtreOutils);
    // chaque mot tapé doit se trouver quelque part : « pdf archive » trouve l'archivage, « numéro page » la numérotation
    const mots = cherche.split(/\s+/).filter(Boolean);
    const garde = (item, groupe) => { if (!mots.length) return true; const foin = sansAccent(motsDe(item, groupe)); return mots.every(m => foin.includes(m)); };
    const replies = groupesReplies();
    let trouves = 0;

    const bouton = (item) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tool';
      b.dataset.tool = item.id;
      if (item.need) b.dataset.need = item.need;
      // Le sous-titre est une infobulle, lue aussi comme description : la ligne d'outil tient sur deux colonnes.
      if (item.sub) { b.title = item.sub; b.dataset.sub = item.sub; }
      const ic = icon(item.icon);
      if (TEINTES_OUTILS[item.id]) ic.style.color = TEINTES_OUTILS[item.id];
      b.appendChild(ic);
      const box = document.createElement('span'); box.className = 't-texte';
      const n = document.createElement('span'); n.className = 't-name'; n.textContent = item.name;
      const s = document.createElement('span'); s.className = 't-sub'; s.textContent = item.sub || '';
      box.append(n, s);
      b.appendChild(box);
      // La pastille dit ce qui est réglé, pas seulement que quelque chose l'est : « Actif » ne dit rien à qui la survole.
      if (item.active && item.active()) {
        const d = document.createElement('i'); d.className = 'dot';
        const dit = tr(ETATS_ACTIFS[item.id] || 'Cet outil a déjà été appliqué à ce document');
        d.title = dit; d.setAttribute('role', 'img'); d.setAttribute('aria-label', dit);
        b.appendChild(d);
      }
      b.addEventListener('click', () => { if (!b.disabled) item.run(); });
      return b;
    };

    const groupe = (id, titre, items, forcer) => {
      const g = document.createElement('section'); g.className = 'tool-group'; g.dataset.groupe = id;
      const replie = !forcer && replies.includes(id);
      const h = document.createElement('h3');
      const tete = document.createElement('button');
      tete.type = 'button'; tete.className = 'groupe-tete';
      tete.setAttribute('aria-expanded', replie ? 'false' : 'true');
      tete.setAttribute('aria-controls', 'grille-' + id);
      tete.append(icon(IC.right));
      const t = document.createElement('span'); t.className = 'g-titre'; t.textContent = titre;
      const nb = document.createElement('span'); nb.className = 'g-nb'; nb.textContent = String(items.length);
      tete.append(t, nb);
      h.appendChild(tete);
      const grille = document.createElement('div'); grille.className = 'tool-grille'; grille.id = 'grille-' + id;
      grille.setAttribute('role', 'group'); grille.setAttribute('aria-label', titre);
      grille.hidden = replie;
      items.forEach(item => grille.appendChild(bouton(item)));
      tete.addEventListener('click', () => {
        const ouvre = tete.getAttribute('aria-expanded') !== 'true';
        tete.setAttribute('aria-expanded', ouvre ? 'true' : 'false');
        grille.hidden = !ouvre;
        replierGroupe(id, !ouvre);
      });
      g.append(h, grille);
      host.appendChild(g);
    };

    toolGroups().forEach(grp => {
      const retenus = grp.items.filter(item => garde(item, grp.title));
      if (!retenus.length) return;
      trouves += retenus.length;
      groupe(grp.id, grp.title, retenus, !!mots.length);
    });
    // les gestes qui se font ailleurs, regroupés d'après l'endroit où ils se font
    if (mots.length) {
      const parLieu = new Map();
      raccourcisDuFiltre().filter(item => garde(item, item.virtuel)).forEach(item => {
        if (!parLieu.has(item.virtuel)) parLieu.set(item.virtuel, []);
        parLieu.get(item.virtuel).push(item);
      });
      parLieu.forEach((items, lieu) => { trouves += items.length; groupe('v-' + sansAccent(lieu).replace(/\W+/g, '-'), lieu, items, true); });
    }
    if (cherche && !trouves) {
      const rien = document.createElement('p');
      rien.className = 'outil-rien';
      rien.textContent = 'Aucun outil ne correspond à « ' + filtreOutils + ' ».';
      host.appendChild(rien);
    }
    vue.syncButtons();
  }

  // Le menu « Outils » de l'application fenêtrée reprend cette liste (voir desktop/main.js) : on la lui envoie rangée par
  // groupe, dans la langue affichée, à l'ouverture et à chaque changement de langue.
  function envoyerLeMenuDesOutils() {
    const b = window.AktumDesktop;
    if (!b || typeof b.definirMenuOutils !== 'function') return;
    try { b.definirMenuOutils(toolGroups().map(g => ({ titre: tr(g.title), outils: g.items.map(i => ({ id: i.id, nom: tr(i.name) })) }))); }
    catch (e) { signaler('Menu des outils', e, 'info'); }
  }
  // Une entrée du menu : l'outil se lance comme au clic dans le volet, et reste refusé tant qu'il lui faut un document.
  function lancerUnOutil(id) {
    const item = toolGroups().flatMap(g => g.items).find(i => i.id === id);
    if (!item) return;
    if (item.need === 'pages' && !state.pages.length) { toast('Ouvrez d\'abord un document : cet outil travaille sur ses pages.', 'warn'); return; }
    if (state.busy) return;
    item.run();
  }
