  // =====================================================================
  //  Page editor
  // =====================================================================

  // L'éditeur plaque l'écran : c'est une boîte modale, et elle doit se conduire comme les autres (voir dialog()).
  // Pour le clavier et pour un lecteur d'écran, tout ce qui est derrière n'existe plus tant qu'elle est ouverte
  // (`inert` retire le focus et les clics, aria-hidden le dit) ; le focus entre à l'ouverture, Tab y tourne, et il
  // retourne à ce qui l'avait quand on referme.
  const FOND_DE_L_EDITEUR = ['#app-toolbar', '#app-main', '#app-status', '#selbar'];
  function edFondInerte(inerte) {
    FOND_DE_L_EDITEUR.forEach(sel => {
      const n = $(sel);
      if (!n) return;
      n.inert = inerte;
      if (inerte) n.setAttribute('aria-hidden', 'true'); else n.removeAttribute('aria-hidden');
    });
  }
  function edCibles() {
    return Array.from(ed.root.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'))
      .filter(n => n.offsetWidth > 0 || n.offsetHeight > 0);
  }

  // `outil` : l'éditeur s'ouvre sur cet outil déjà choisi (« Caviarder une zone », « Tampon » du volet des outils).
  function openEditor(pageId, outil) {
    const p = state.pages.find(x => x.id === pageId);
    if (!p) return;
    ed.pageId = pageId; ed.sel = null; ed.tool = outil && outil !== 'tampon' ? outil : 'select'; ed.zoom = 'fit';
    if (!ed.root) buildEditor();
    if (ed.root.hidden) { ed.retour = document.activeElement; ed.retourPage = pageId; ed.retourOutil = ed.retour && ed.retour.dataset ? ed.retour.dataset.tool : null; }
    ed.root.hidden = false;
    document.body.style.overflow = 'hidden';
    edFondInerte(true);
    edSyncTools();
    edRenderPage();
    const premier = edCibles()[0];
    if (premier) premier.focus();
    // Ces deux-là n'ont pas qu'un état à poser : on fait comme au clic sur leur bouton (le dialogue des tampons s'ouvre, le texte se repère).
    if (outil === 'tampon' || outil === 'edittext') { const b = $('.ed-tool[data-tool="' + outil + '"]', ed.root); if (b) b.click(); }
  }

  function closeEditor() {
    if (!ed.root) return;
    edFermerSaisie();
    ed.root.hidden = true;
    document.body.style.overflow = '';
    edFondInerte(false);
    ed.pageId = null; ed.sel = null;
    vue.render();
    // Le focus retourne là où il était : le bouton qui a ouvert l'éditeur, ou la vignette de la page quand c'est elle
    // (la vue vient d'être redessinée : l'ancien élément n'existe peut-être plus).
    try {
      const t = ed.retourPage != null ? tiles.get(ed.retourPage) : null;
      // la liste des outils vient d'être redessinée avec le reste : on retrouve le bouton par son identifiant
      const outil = ed.retourOutil ? document.querySelector('#tool-groups [data-tool="' + ed.retourOutil + '"]') : null;
      if (ed.retour && ed.retour.isConnected && ed.retour !== document.body) ed.retour.focus();
      else if (outil) outil.focus();
      else if (t) t.focus();
    } catch (e) { signaler('Retour du focus', e, 'info'); }
    ed.retour = null; ed.retourPage = null; ed.retourOutil = null;
  }

  function buildEditor() {
    const root = document.createElement('div');
    root.className = 'editor';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Éditeur de page');
    // Tab tourne dans l'éditeur (une fenêtre ouverte par-dessus garde son propre clavier).
    root.addEventListener('keydown', e => {
      if (e.key !== 'Tab' || openDlg) return;
      const cibles = edCibles();
      if (!cibles.length) return;
      const premier = cibles[0], dernier = cibles[cibles.length - 1];
      if (!ed.root.contains(document.activeElement)) { e.preventDefault(); premier.focus(); }
      else if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
      else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
    });

    const head = document.createElement('div'); head.className = 'ed-head';
    const title = document.createElement('span'); title.className = 'title'; title.textContent = 'Éditeur de page';
    const nav = document.createElement('div'); nav.className = 'nav';
    const prev = edBtn(IC.left, 'Page précédente', () => edGo(-1));
    const label = document.createElement('span'); label.id = 'ed-label';
    const next = edBtn(IC.right, 'Page suivante', () => edGo(1));
    nav.append(prev, label, next);
    const spacer = document.createElement('span'); spacer.className = 'tb-spacer';
    const zoomSel = select('ed-zoom', [['fit', 'Ajuster'], ['0.5', '50 %'], ['0.75', '75 %'], ['1', '100 %'], ['1.5', '150 %'], ['2', '200 %']], 'fit');
    zoomSel.style.height = '32px'; zoomSel.style.borderRadius = '7px'; zoomSel.style.border = '1px solid var(--trait-champ)';
    zoomSel.setAttribute('aria-label', 'Zoom de la page');
    zoomSel.style.background = 'var(--survol)'; zoomSel.style.padding = '0 8px';
    zoomSel.addEventListener('change', () => { ed.zoom = zoomSel.value; edRenderPage(); });
    const done = document.createElement('button');
    done.type = 'button'; done.className = 'tb-btn primary'; done.textContent = 'Terminer';
    done.addEventListener('click', closeEditor);
    const bandeau = document.createElement('div'); bandeau.className = 'ed-bandeau';
    const spacer2 = document.createElement('span'); spacer2.className = 'tb-spacer';
    const imprimer = edBtn(IC.print, vue.infobulle('Imprimer', 'imprimer'), dialogImprimer);
    imprimer.id = 'ed-print';
    head.append(title, nav, spacer, bandeau, spacer2, imprimer, zoomSel, done);

    const body = document.createElement('div'); body.className = 'ed-body';
    const rail = document.createElement('div'); rail.className = 'ed-rail';
    const TOOLS = [
      ['select', IC.select, 'Sélectionner et déplacer'],
      ['edittext', IC.editText, 'Modifier le texte existant'],
      ['text', IC.text, 'Ajouter du texte'],
      ['highlight', IC.highlight, 'Surligner'],
      ['box', IC.box, 'Encadrer'],
      ['underline', IC.souligne, 'Souligner'],
      ['strike', IC.barre, 'Barrer du texte'],
      ['arrow', IC.fleche, 'Flèche'],
      ['note', IC.note, 'Note autocollante'],
      ['draw', IC.draw, 'Dessiner à main levée'],
      ['redact', IC.redact, 'Caviarder'],
      ['champ', IC.champ, 'Ajouter un champ à remplir'],
      ['lien', IC.lien, 'Lien vers une adresse ou une page'],
      ['|'],
      ['tampon', IC.stamp, 'Tampon : Reçu le, Payé, Copie conforme, Visé…'],
      ['sign', IC.pencil, 'Signature manuscrite'],
      ['image', IC.image, 'Insérer une image'],
    ];
    TOOLS.forEach(t => {
      if (t[0] === '|') { const s = document.createElement('span'); s.className = 'rail-sep'; rail.appendChild(s); return; }
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ed-tool'; b.dataset.tool = t[0]; b.title = t[2];
      b.setAttribute('aria-label', t[2]);
      b.appendChild(icon(t[1]));
      b.addEventListener('click', () => {
        if (t[0] === 'sign') { edSignature(); return; }
        if (t[0] === 'image') { edPickImage(); return; }
        if (t[0] === 'tampon') { edTampons(); return; }
        ed.tool = t[0]; ed.sel = null; edSyncTools(); edDrawOverlay();
        if (t[0] === 'edittext') {
          setBusy('Repérage du texte…');
          edLignes().then(l => {
            setBusy('');
            edDrawOverlay();
            setLast(l.length ? plural(l.length, 'bloc de texte modifiable', 'blocs de texte modifiables') + ' sur cette page' : 'Aucun texte sur cette page');
            // Un texte couché ou à l'envers ne se corrige pas tel quel : on dit quoi faire plutôt que de laisser une page muette.
            if (!l.length && ed.tournes) toast('Le texte de cette page est couché ou à l\'envers : tournez d\'abord la page (Pivoter à gauche ou à droite, dans la vue Organiser), corrigez le texte, puis remettez la page dans son sens.', 'warn');
          });
        }
      });
      rail.appendChild(b);
    });

    const stage = document.createElement('div'); stage.className = 'ed-stage';
    const sheet = document.createElement('div'); sheet.className = 'ed-sheet';
    const canvas = document.createElement('canvas');
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'ed-overlay');
    svg.setAttribute('preserveAspectRatio', 'none');
    sheet.append(canvas, svg);
    stage.appendChild(sheet);

    const side = document.createElement('div'); side.className = 'ed-side';

    body.append(rail, stage, side);
    const foot = document.createElement('div'); foot.className = 'ed-foot';
    foot.id = 'ed-foot';
    root.append(head, body, foot);
    document.body.appendChild(root);
    ed.root = root; ed.canvas = canvas; ed.svg = svg; ed.sheet = sheet; ed.side = side; ed.label = label; ed.stage = stage; ed.bandeau = bandeau;

    svg.addEventListener('pointerdown', edPointerDown);
    svg.addEventListener('pointermove', e => {
      if (ed.tool !== 'edittext' || !ed.lignes || ed.saisie) return;
      const pt = edPt(e);
      const i = ed.lignes.findIndex(l => pt.x >= l.x - 2 && pt.x <= l.x + l.w + 2 && pt.y >= l.y - 1 && pt.y <= l.y + l.h + 1);
      if (i === ed.chaud) return;
      ed.chaud = i;
      $$('.bloc', svg).forEach(r => r.classList.toggle('chaud', +r.dataset.bloc === i));
    });
    svg.addEventListener('pointerleave', () => {
      if (ed.chaud === -1 || ed.chaud == null) return;
      ed.chaud = -1;
      $$('.bloc', svg).forEach(r => r.classList.remove('chaud'));
    });
    svg.addEventListener('dblclick', e => {
      const p = edPage();
      if (!p) return;
      const id = e.target instanceof Element ? e.target.getAttribute('data-ann') : null;
      const a = id ? p.ann.find(x => x.id === +id) : null;
      if (a && a.type === 'edit') { e.preventDefault(); ed.sel = a.id; edEditRuns(a); }
    });
    window.addEventListener('resize', () => { if (ed.root && !ed.root.hidden && ed.zoom === 'fit') edRenderPage(); });
  }

  function edBtn(path, title, onClick) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tb-btn icon'; b.title = title;
    b.setAttribute('aria-label', title);
    b.appendChild(icon(path));
    b.addEventListener('click', onClick);
    return b;
  }
  function edSyncTools() {
    $$('.ed-tool', ed.root).forEach(b => b.setAttribute('aria-pressed', b.dataset.tool === ed.tool ? 'true' : 'false'));
    const svg = ed.svg;
    ed.chaud = -1;
    svg.classList.toggle('pick', ed.tool === 'select');
    const hints = {
      select: 'Cliquez une annotation pour la déplacer, la redimensionner ou la supprimer.',
      text: 'Cliquez à l\'endroit où écrire, puis saisissez le texte. Échap pour valider.',
      highlight: 'Faites glisser sur le texte à surligner.',
      box: 'Faites glisser pour tracer un cadre.',
      draw: 'Dessinez en maintenant le bouton enfoncé.',
      edittext: 'Cliquez dans un paragraphe : le curseur se pose à cet endroit. Entrée revient à la ligne, Échap valide.',
      redact: 'Faites glisser sur la zone à masquer. À l\'export, le texte en dessous est effacé du fichier ; si une image passe dessous, la page est convertie en image.',
      champ: 'Faites glisser pour tracer un champ à remplir, de la taille voulue. L\'outil reste actif : tracez-en autant que nécessaire, puis prenez la flèche pour les déplacer.',
      tampon: 'Cliquez sur la page à l\'endroit où poser le tampon. Il se déplace ensuite avec la flèche.',
    };
    $('#ed-foot').textContent = hints[ed.tool] || '';
    edSide();
  }
  function edGo(dir) {
    edFermerSaisie();
    const i = pageIndex(ed.pageId);
    const n = state.pages[i + dir];
    if (!n) return;
    ed.pageId = n.id; ed.sel = null; ed.chaud = -1;
    ed.lignes = null; ed.lignesCle = null;
    edRenderPage();
  }

