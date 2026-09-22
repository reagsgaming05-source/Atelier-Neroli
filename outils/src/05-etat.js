  // =====================================================================
  //  State
  // =====================================================================
  const HUES = [214, 152, 28, 282, 44, 184, 332, 96, 260, 10];
  const state = {
    sources: [],
    pages: [],
    selected: new Set(),
    anchor: null,
    history: [], redo: [],
    touched: false, hueIdx: 0, filenameDirty: false, busy: false,
    meta: { title: '', author: '', subject: '', keywords: '' },
    watermark: null,
    stamp: null,
    security: null,
    flatten: false,
    // On ouvre sur le document ; la table de montage est le second mode.
    vue: 'lecture', zoomLecture: 'page', impressionDirecte: false, bureau: false, messageBusy: '',
    // Le plan du document : des signets, chacun vers une page, avec ses sous-signets.
    signets: [],
    // Lecture : une page après l'autre, ou deux côte à côte comme un livre ouvert.
    dispo: 'une',
    // Les annotations partent comme de vrais commentaires PDF (modifiables
    // dans Acrobat) ; « figer » les fond dans la page.
    figerAnnotations: false,
    // Le dossier de pièces constitué, pour tenir son sommaire à jour.
    dossier: null,
  };
  // Ce qui fait un document ouvert — le reste de l'état (vue, zoom, thème)
  // est commun. Un traitement par lots, un onglet : chacun a le sien.
  const CHAMPS_DOC = ['sources', 'pages', 'selected', 'anchor', 'history', 'redo', 'touched', 'hueIdx', 'filenameDirty',
    'meta', 'watermark', 'stamp', 'security', 'flatten', 'signets', 'figerAnnotations', 'dossier', 'chemin', 'ecraserOk', 'cleRecup'];
  function etatVierge() {
    return {
      sources: [], pages: [], selected: new Set(), anchor: null, history: [], redo: [], touched: false, hueIdx: 0, filenameDirty: false,
      meta: { title: '', author: '', subject: '', keywords: '' }, watermark: null, stamp: null, security: null, flatten: false,
      signets: [], figerAnnotations: false, dossier: null, nomFichier: '',
      // Le fichier que « Enregistrer » réécrit (application), la confirmation
      // déjà donnée pour ce fichier, et la clé du dépôt de récupération.
      chemin: '', ecraserOk: false, cleRecup: '',
    };
  }
  function prendreEtat() {
    const e = {};
    CHAMPS_DOC.forEach(k => { e[k] = state[k]; });
    e.nomFichier = el.filename ? el.filename.value : '';
    return e;
  }
  function poserEtat(e) {
    CHAMPS_DOC.forEach(k => { state[k] = e[k]; });
    if (el.filename) el.filename.value = e.nomFichier || '';
    signetActif = null;
  }
  const dims = new Map();       // "srcId:index" -> {w,h,baseRot}
  const thumbs = new Map();     // "srcId:index" -> {status, url}
  const textCache = new Map();  // "srcId:index" -> string
  const ocrCache = new Set();   // les entrées de textCache venues de l'OCR
  const tiles = new Map();      // pageId -> element
  let uid = 0;
  const drag = { ids: [], to: null, marker: null };
  const el = {};

  const key = (srcId, index) => srcId + ':' + index;
  const pkey = p => key(p.src, p.index);
  const srcById = id => state.sources.find(s => s.id === id);
  const pageIndex = id => state.pages.findIndex(p => p.id === id);
  const selectedInOrder = () => state.pages.filter(p => state.selected.has(p.id)).map(p => p.id);
  const selectedPages = () => state.pages.filter(p => state.selected.has(p.id));

