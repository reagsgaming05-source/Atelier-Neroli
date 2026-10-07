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
    meta: { title: '', author: '', subject: '', keywords: '', balise: false, langue: 'fr' },
    watermark: null,
    stamp: null,
    security: null,
    flatten: false,
    // « Nettoyer le document » : ce que l'export retire du fichier (métadonnées, pièces jointes, scripts…), ou null.
    nettoyage: null,
    // On ouvre sur le document ; la table de montage est le second mode.
    vue: 'lecture', zoomLecture: 'page', impressionDirecte: false, bureau: false, messageBusy: '',
    // Le plan du document : des signets, chacun vers une page, avec ses sous-signets.
    signets: [],
    // Les termes caviardés partout : ce qui doit disparaître de tout le
    // fichier à l'export, pas seulement des endroits où l'on a vu le mot.
    purges: [],
    // Lecture : une page après l'autre, ou deux côte à côte comme un livre ouvert.
    dispo: 'une',
    // Les annotations partent comme de vrais commentaires PDF (modifiables
    // dans Acrobat) ; « figer » les fond dans la page.
    figerAnnotations: false,
    // Le dossier de pièces constitué, pour tenir son sommaire à jour.
    dossier: null,
    // La licence (application de bureau) : essai, licence signée, ou rien — voir 58-licence.js.
    licence: null,
  };
  // Ce qui fait un document ouvert — le reste de l'état (vue, zoom, thème)
  // est commun. Un traitement par lots, un onglet : chacun a le sien.
  const CHAMPS_DOC = ['sources', 'pages', 'selected', 'anchor', 'history', 'redo', 'touched', 'hueIdx', 'filenameDirty',
    'meta', 'watermark', 'stamp', 'security', 'flatten', 'signets', 'purges', 'figerAnnotations', 'dossier', 'chemin', 'ecraserOk', 'cleRecup', 'mtimeFichier'];
  function etatVierge() {
    return {
      sources: [], pages: [], selected: new Set(), anchor: null, history: [], redo: [], touched: false, hueIdx: 0, filenameDirty: false,
      meta: { title: '', author: '', subject: '', keywords: '', balise: false, langue: 'fr' }, watermark: null, stamp: null, security: null, flatten: false, nettoyage: null,
      signets: [], purges: [], figerAnnotations: false, dossier: null, nomFichier: '',
      // Le fichier que « Enregistrer » réécrit (application), la confirmation
      // déjà donnée pour ce fichier, et la clé du dépôt de récupération.
      chemin: '', ecraserOk: false, cleRecup: '',
      // La date du fichier tel qu'on l'a lu ou écrit en dernier : ce qu'on compare avant de l'écraser.
      mtimeFichier: 0,
    };
  }
  let signetActif = null;
  // L'état de l'éditeur de page : l'onglet qui l'ouvre, les vignettes et les feuilles de lecture le consultent
  // sans dépendre du module qui le dessine (92-editeur.js et suivants).
  const ed = {
    root: null, pageId: null, tool: 'select', zoom: 'fit', scale: 1, sel: null,
    style: { color: '#E8B04B', textColor: '#D0021B', size: 14, width: 2, opacity: 0.35, font: 'Helvetica', bold: false },
    gesture: null, snapped: false, lignes: null, lignesCle: null, saisie: null, polices: [],
  };

  function edPage() { return state.pages.find(p => p.id === ed.pageId); }

  // Le modèle prévient sa vue par un seul chemin. Ces gestes — redessiner, rafraîchir les boutons, rafraîchir la
  // sélection, répondre à une touche de la table des raccourcis, écrire l'infobulle d'un geste avec sa touche — sont des points d'accroche que 40-tuiles.js (les
  // vignettes) et 99-init.js (la barre, les raccourcis) renseignent au chargement ; n'importe quel module appelle vue.render() sans savoir qui répond. Avant, 99-init.js remplaçait
  // « render » à chaud, ce qui supposait de savoir dans quel ordre tout se chargeait.
  const vue = { syntheseCommentaires() {}, async blocsDePage() { return []; }, async rangeesDePage() { return []; }, async livrer() { return false; }, async ouvrirListe() {}, lireCsv() { return null; }, render() {}, syncButtons() {}, updateSelectionUI() {}, touche() { return false; }, infobulle(base) { return base; } };

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
  // Où est cette page : une table identifiant → rang, vérifiée à chaque lecture (un rang qui ne tombe plus sur la page refait la table, une fois).
  // Un parcours de tout le document à chaque question rendait le dessin des vignettes quadratique sur un gros dossier.
  let rangsDesPages = new Map();
  const pageIndex = id => {
    const i = rangsDesPages.get(id);
    if (i !== undefined && state.pages[i] && state.pages[i].id === id) return i;
    rangsDesPages = new Map();
    state.pages.forEach((p, k) => rangsDesPages.set(p.id, k));
    const j = rangsDesPages.get(id);
    return j === undefined ? -1 : j;
  };
  const selectedInOrder = () => state.pages.filter(p => state.selected.has(p.id)).map(p => p.id);
  const selectedPages = () => state.pages.filter(p => state.selected.has(p.id));

