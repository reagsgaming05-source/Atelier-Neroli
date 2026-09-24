/*
 * Dossier scanné pour Décompte DGEO : les pages « PIÈCE COMPTABLE » de la caisse, qui ouvrent le
 * dossier (fiche imprimée depuis l'application ou remplie à la main), sont retirées avant l'analyse,
 * pour que Décompte DGEO ne lise que le formulaire de couverture et les tickets qui suivent.
 * Reconnaissance par la couche texte (le même analyseur que pour les pièces scannées) ; sans texte
 * lisible du tout, la première page est retirée si le réglage le demande.
 * Dans l'application fenêtrée, la passerelle placée devant Décompte DGEO appelle clean() ; en Node
 * (tests) : require avec pdfjs-dist, pdf-lib et l'analyseur.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('pdfjs-dist/legacy/build/pdf.js'), require('pdf-lib'), require('./parser.js'));
  else root.CaisseDossier = factory(root.pdfjsLib, root.PDFLib, root.CaisseParser);
})(typeof self !== 'undefined' ? self : this, function (pdfjsLib, PDFLib, P) {
  'use strict';

  const { PDFDocument } = PDFLib;
  const PIECE_RE = /PI[EÈ]CE\s*COMPTABLE/i;
  const COLS_RE = /\b(DOIT|AVOIR|SOMME)\b/i;

  /** Pour chaque page : { index, text, form, hasText } ; form = fiche PIÈCE COMPTABLE reconnue. */
  async function inspect(bytes) {
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, verbosity: 0 }).promise;
    const pages = [];
    try {
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 1 });
        const tc = await page.getTextContent();
        const words = P.itemsFromTextContent(tc, vp, pdfjsLib.Util);
        const text = words.map((w) => w.str).join(' ');
        // Reconnaissance stricte : cette page sera RETIRÉE du dossier avant l'analyse de Décompte
        // DGEO. L'analyseur des pièces scannées, lui, accepte une page qui contient seulement
        // « doit », « avoir » et « somme » — trois mots ordinaires qui suffisaient à faire
        // disparaître le formulaire de couverture d'une course d'école.
        let form = PIECE_RE.test(text);
        if (form) {
          let lu = false;
          try { lu = !!P.analyzePage({ pageNumber: i, width: vp.width, height: vp.height, words }); } catch (e) { lu = false; }
          form = lu || COLS_RE.test(text);
        }
        pages.push({ index: i - 1, text, form, hasText: text.replace(/\s+/g, '').length > 20 });
      }
    } finally {
      try { if (doc.destroy) await doc.destroy(); } catch (e) { /* ignore */ }
    }
    return pages;
  }

  /**
   * Retire les pages de pièce comptable du dossier. opts.skipFirst : si aucune page n'a de texte
   * lisible, retirer la première page (le dossier scanné commence toujours par la pièce comptable).
   * Renvoie { bytes, removed: [n° de page, base 1], total, reason, supposee } ; bytes inchangé si
   * rien n'est retiré. supposee : la page a été retirée sans avoir été reconnue (scan sans texte) —
   * la page de Décompte DGEO le dit, puisque ce peut être le formulaire de couverture.
   */
  async function clean(bytes, opts) {
    opts = opts || {};
    let pages;
    try { pages = await inspect(bytes); } catch (e) { return { bytes, removed: [], total: 0, reason: `PDF illisible (${e && e.message ? e.message : e})` }; }
    const total = pages.length;
    let removed = pages.filter((p) => p.form).map((p) => p.index);
    let reason = removed.length ? (removed.length > 1 ? 'pièces comptables reconnues' : 'pièce comptable reconnue') : '';
    let supposee = false;
    if (!removed.length && total > 1 && opts.skipFirst && !pages.some((p) => p.hasText)) {
      removed = [0];
      reason = 'première page retirée (dossier scanné sans texte lisible)';
      supposee = true;
    }
    if (!removed.length) return { bytes, removed: [], total, reason: 'aucune pièce comptable reconnue' };
    if (removed.length >= total) return { bytes, removed: [], total, reason: 'toutes les pages sont des pièces comptables : dossier transmis tel quel' };
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const out = await PDFDocument.create();
    const keep = pages.map((p) => p.index).filter((i) => !removed.includes(i));
    const copied = await out.copyPages(src, keep);
    copied.forEach((p) => out.addPage(p));
    const outBytes = await out.save();
    return { bytes: outBytes, removed: removed.map((i) => i + 1), total, reason, supposee };
  }

  return { inspect, clean };
});
