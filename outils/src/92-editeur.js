  // =====================================================================
  //  Page editor
  // =====================================================================
  const ed = {
    root: null, pageId: null, tool: 'select', zoom: 'fit', scale: 1, sel: null,
    style: { color: '#E8B04B', textColor: '#D0021B', size: 14, width: 2, opacity: 0.35, font: 'Helvetica', bold: false },
    gesture: null, snapped: false, lignes: null, lignesCle: null, saisie: null, polices: [],
  };

  function edPage() { return state.pages.find(p => p.id === ed.pageId); }

  function openEditor(pageId) {
    const p = state.pages.find(x => x.id === pageId);
    if (!p) return;
    ed.pageId = pageId; ed.sel = null; ed.tool = 'select'; ed.zoom = 'fit';
    if (!ed.root) buildEditor();
    ed.root.hidden = false;
    document.body.style.overflow = 'hidden';
    edSyncTools();
    edRenderPage();
  }
  function closeEditor() {
    if (!ed.root) return;
    edFermerSaisie();
    ed.root.hidden = true;
    document.body.style.overflow = '';
    ed.pageId = null; ed.sel = null;
    render();
  }

  function buildEditor() {
    const root = document.createElement('div');
    root.className = 'editor';
    root.hidden = true;

    const head = document.createElement('div'); head.className = 'ed-head';
    const title = document.createElement('span'); title.className = 'title'; title.textContent = 'Éditeur de page';
    const nav = document.createElement('div'); nav.className = 'nav';
    const prev = edBtn(IC.left, 'Page précédente', () => edGo(-1));
    const label = document.createElement('span'); label.id = 'ed-label';
    const next = edBtn(IC.right, 'Page suivante', () => edGo(1));
    nav.append(prev, label, next);
    const spacer = document.createElement('span'); spacer.className = 'tb-spacer';
    const zoomSel = select('ed-zoom', [['fit', 'Ajuster'], ['0.5', '50 %'], ['0.75', '75 %'], ['1', '100 %'], ['1.5', '150 %'], ['2', '200 %']], 'fit');
    zoomSel.style.height = '32px'; zoomSel.style.borderRadius = '7px'; zoomSel.style.border = '1px solid var(--trait)';
    zoomSel.style.background = 'var(--survol)'; zoomSel.style.padding = '0 8px';
    zoomSel.addEventListener('change', () => { ed.zoom = zoomSel.value; edRenderPage(); });
    const done = document.createElement('button');
    done.type = 'button'; done.className = 'tb-btn primary'; done.textContent = 'Terminer';
    done.addEventListener('click', closeEditor);
    const bandeau = document.createElement('div'); bandeau.className = 'ed-bandeau';
    const spacer2 = document.createElement('span'); spacer2.className = 'tb-spacer';
    const imprimer = edBtn(IC.print, 'Imprimer (Ctrl+P)', dialogImprimer);
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
      ['draw', IC.draw, 'Dessiner à main levée'],
      ['redact', IC.redact, 'Caviarder'],
      ['champ', IC.champ, 'Ajouter un champ à remplir'],
      ['|'],
      ['tampon', IC.stamp, 'Tampon : Reçu le, Payé, Copie conforme, Visé…'],
      ['sign', IC.pencil, 'Signer'],
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

