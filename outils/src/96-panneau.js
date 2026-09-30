  // =====================================================================
  //  Tool panel
  // =====================================================================
  // Le sélecteur de fichiers vit dans init() ; la liste des outils en a besoin
  // pour « Fusionner ». Il est posé ici au démarrage.
  let choisirDesFichiers = null;

  function toolGroups() {
    return [
      { title: 'Organiser', items: [
        // Fusionner est, avec signer, le geste le plus courant d'un
        // secrétariat — et le mot que les gens cherchent. La fonction existait
        // depuis toujours sous le nom « Ajouter un document » : personne ne la
        // trouvait.
        { id: 'fusionner', name: 'Fusionner des PDF', sub: 'Plusieurs fichiers en un seul document', icon: IC.doc, run: () => { if (choisirDesFichiers) choisirDesFichiers(''); } },
        { id: 'blank', name: 'Pages vierges', sub: 'Insérer une ou plusieurs pages', icon: IC.plus, run: toolBlank },
        { id: 'images', name: 'Ajouter des images', sub: 'JPEG, PNG, WebP en pages', icon: IC.image, run: toolImages },
        { id: 'vides', name: 'Détecter les pages vides', sub: 'Nettoyer un document scanné', icon: IC.vide, need: 'pages', run: toolPagesVides },
        { id: 'split', name: 'Diviser le document', sub: 'Un ou plusieurs fichiers', icon: IC.split, need: 'pages', run: toolSplit },
        { id: 'dossier', name: 'Constituer un dossier', sub: 'Intercalaires, pièces numérotées, sommaire', icon: IC.dossier, need: 'pages', run: toolDossier },
        { id: 'resize', name: 'Redimensionner', sub: 'A4, Letter, marges', icon: IC.resize, need: 'pages', run: toolResize },
      ] },
      { title: 'Modifier', items: [
        // La signature était mentionnée en sous-titre de l'éditeur. Pour un
        // syndic qui doit signer un procès-verbal, c'était introuvable.
        { id: 'signer', name: 'Signer', sub: 'Poser sa signature sur une page', icon: IC.draw, need: 'pages', run: () => {
          const id = (selectedInOrder()[0] || state.pages[0].id);
          openEditor(id);
          edSignature();
        } },
        { id: 'edit', name: 'Éditeur de page', sub: 'Texte, surlignage, signature', icon: IC.pencil, need: 'pages', run: () => openEditor(selectedInOrder()[0] || state.pages[0].id) },
        { id: 'watermark', name: 'Filigrane', sub: 'Texte en surimpression', icon: IC.water, need: 'pages', run: toolWatermark, active: () => !!state.watermark },
        { id: 'stamp', name: 'En-tête et pied de page', sub: 'Texte, date, nom du fichier', icon: IC.header, need: 'pages', run: () => toolStamp(), active: () => !!state.stamp },
        { id: 'number', name: 'Numéroter les pages', sub: 'Numérotation simple ou Bates', icon: IC.hash, need: 'pages', run: () => toolStamp('number'), active: () => !!(state.stamp && (state.stamp.footerCenter || '').includes('{p}')) },
      ] },
      { title: 'Formulaires', items: [
        { id: 'form', name: 'Remplir le formulaire', sub: 'Champs, cases, listes', icon: IC.form, need: 'pages', run: toolForm, active: () => state.sources.some(s => s.formValues && Object.keys(s.formValues).length) },
      ] },
      { title: 'Exporter', items: [
        { id: 'exp-pdf', name: 'Exporter le PDF', sub: 'Document complet', icon: IC.save, need: 'pages', run: () => exportPages(state.pages, safeBase(el.filename.value) + '.pdf') },
        { id: 'exp-img', name: 'Exporter en images', sub: 'PNG ou JPEG', icon: IC.image, need: 'pages', run: toolExportImages },
        { id: 'exp-txt', name: 'Extraire le texte', sub: 'Fichier .txt', icon: IC.txt, need: 'pages', run: toolExportText },
        { id: 'compress', name: 'Réduire la taille', sub: 'Compression des pages', icon: IC.zap, need: 'pages', run: toolCompress },
      ] },
      { title: 'Protéger', items: [
        { id: 'password', name: 'Mot de passe', sub: 'Chiffrement et autorisations', icon: IC.lock, need: 'pages', run: toolPassword, active: () => !!state.security },
        { id: 'flatten', name: 'Aplatir', sub: 'Figer les champs et les annotations', icon: IC.flat, need: 'pages', run: toolFlatten, active: () => state.flatten || state.figerAnnotations },
      ] },
      { title: 'Document', items: [
        { id: 'props', name: 'Propriétés', sub: 'Titre, auteur, mots-clés', icon: IC.info, need: 'pages', run: toolProperties, active: () => !!(state.meta.title || state.meta.author || state.meta.subject || state.meta.keywords) },
        { id: 'search', name: 'Rechercher, remplacer', sub: 'Ou caviarder, dans tout le document', icon: IC.search, need: 'pages', run: toolSearch },
        { id: 'tableau', name: 'Copier un tableau', sub: 'Vers Excel, en colonnes', icon: IC.tableau, need: 'pages', run: toolTableau },
        { id: 'ocr', name: 'Reconnaître le texte', sub: 'OCR local : un scan devient cherchable', icon: IC.ocr, need: 'pages', run: toolOcr, active: () => state.pages.some(p => p.ocr) },
        { id: 'commentaires', name: 'Commentaires du document', sub: 'Ceux déjà dans le PDF reçu : lister, retirer', icon: IC.text, need: 'pages', run: toolCommentaires, active: () => state.pages.some(p => p.retraits && p.retraits.length) },
        { id: 'comparer', name: 'Comparer deux versions', sub: 'Côte à côte, mots ajoutés ou retirés', icon: IC.compare, need: 'pages', run: toolComparer },
      ] },
      { title: 'Plusieurs fichiers', items: [
        { id: 'lots', name: 'Traiter plusieurs fichiers', sub: 'Pages vides, compression, numérotation… en série', icon: IC.lots, run: toolLots },
      ] },
    ];
  }

  // Chaque outil porte sa couleur : on le retrouve du coin de l'œil dans la
  // liste, sans avoir à lire.
  const TEINTES_OUTILS = {
    fusionner: '#2D9D5F', signer: '#D83790',
    vierges: '#2680EB', images: '#8C5AE8', vides: '#0D9F8F', diviser: '#E68619', resize: '#2680EB',
    edit: '#8C5AE8', filigrane: '#D83790', entete: '#0D9F8F', numeros: '#E68619', form: '#2D9D5F',
    'exp-pdf': '#D7373F', 'exp-img': '#8C5AE8', 'exp-txt': '#0D9F8F', compress: '#E68619',
    password: '#D7373F', flatten: '#2680EB',
    props: '#6E7681', search: '#2680EB', tableau: '#2D9D5F', dossier: '#D83790', lots: '#E68619', ocr: '#8C5AE8', comparer: '#0D9F8F', commentaires: '#E68619',
  };

  // Vingt-six outils dans une liste qui défile : « Comparer deux versions » est
  // à plus d'un écran du haut, et quelqu'un qui veut caviarder ne devine pas
  // que cela s'appelle « Rechercher, remplacer ». Le filtre cherche donc aussi
  // dans les sous-titres — c'est là que se trouve le mot « caviarder ».
  let filtreOutils = '';
  const sansAccent = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

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

  function renderTools() {
    brancherLeFiltre();
    const host = $('#tool-groups');
    host.replaceChildren();
    const cherche = sansAccent(filtreOutils);
    const garde = item => !cherche || sansAccent(item.name + ' ' + (item.sub || '')).includes(cherche);
    let trouves = 0;
    toolGroups().forEach(group => {
      const retenus = group.items.filter(garde);
      if (!retenus.length) return;
      trouves += retenus.length;
      const g = document.createElement('div'); g.className = 'tool-group';
      const h = document.createElement('h3'); h.textContent = group.title;
      g.appendChild(h);
      retenus.forEach(item => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'tool';
        b.dataset.tool = item.id;
        if (item.need) b.dataset.need = item.need;
        const ic = icon(item.icon);
        if (TEINTES_OUTILS[item.id]) ic.style.color = TEINTES_OUTILS[item.id];
        b.appendChild(ic);
        const box = document.createElement('span');
        const n = document.createElement('span'); n.className = 't-name'; n.textContent = item.name;
        const s = document.createElement('span'); s.className = 't-sub'; s.textContent = item.sub || '';
        box.append(n, document.createElement('br'), s);
        b.appendChild(box);
        if (item.active && item.active()) { const d = document.createElement('i'); d.className = 'dot'; d.title = 'Actif'; b.appendChild(d); }
        b.addEventListener('click', () => { if (!b.disabled) item.run(); });
        g.appendChild(b);
      });
      host.appendChild(g);
    });
    if (cherche && !trouves) {
      const rien = document.createElement('p');
      rien.className = 'outil-rien';
      rien.textContent = 'Aucun outil ne correspond à « ' + filtreOutils + ' ».';
      host.appendChild(rien);
    }
    syncButtons();
  }

