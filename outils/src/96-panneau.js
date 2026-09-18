  // =====================================================================
  //  Tool panel
  // =====================================================================
  function toolGroups() {
    return [
      { title: 'Organiser', items: [
        { id: 'blank', name: 'Pages vierges', sub: 'Insérer une ou plusieurs pages', icon: IC.plus, run: toolBlank },
        { id: 'images', name: 'Ajouter des images', sub: 'JPEG, PNG, WebP en pages', icon: IC.image, run: toolImages },
        { id: 'vides', name: 'Détecter les pages vides', sub: 'Nettoyer un document scanné', icon: IC.vide, need: 'pages', run: toolPagesVides },
        { id: 'split', name: 'Diviser le document', sub: 'Un ou plusieurs fichiers', icon: IC.split, need: 'pages', run: toolSplit },
        { id: 'dossier', name: 'Constituer un dossier', sub: 'Intercalaires, pièces numérotées, sommaire', icon: IC.dossier, need: 'pages', run: toolDossier },
        { id: 'resize', name: 'Redimensionner', sub: 'A4, Letter, marges', icon: IC.resize, need: 'pages', run: toolResize },
      ] },
      { title: 'Modifier', items: [
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
    vierges: '#2680EB', images: '#8C5AE8', vides: '#0D9F8F', diviser: '#E68619', resize: '#2680EB',
    edit: '#8C5AE8', filigrane: '#D83790', entete: '#0D9F8F', numeros: '#E68619', form: '#2D9D5F',
    'exp-pdf': '#D7373F', 'exp-img': '#8C5AE8', 'exp-txt': '#0D9F8F', compress: '#E68619',
    password: '#D7373F', flatten: '#2680EB',
    props: '#6E7681', search: '#2680EB', tableau: '#2D9D5F', dossier: '#D83790', lots: '#E68619', ocr: '#8C5AE8', comparer: '#0D9F8F', commentaires: '#E68619',
  };

  function renderTools() {
    const host = $('#tool-groups');
    host.replaceChildren();
    toolGroups().forEach(group => {
      const g = document.createElement('div'); g.className = 'tool-group';
      const h = document.createElement('h3'); h.textContent = group.title;
      g.appendChild(h);
      group.items.forEach(item => {
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
    syncButtons();
  }

