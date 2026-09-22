/*
 * La boîte de réception : les scans du copieur entrent tout seuls.
 *
 * Le processus principal surveille le dossier (voir desktop/veille.js) et nous confie les octets ;
 * c'est ici qu'on lit, parce que c'est ici qu'il y a pdf.js, l'OCR et l'analyseur.
 *
 * Le chemin d'un scan :
 *   1. chaque page est rendue en image et on y cherche la marque de la pièce (marque.js) ;
 *   2. la pile est découpée à chaque marque, et chaque document rendu à sa pièce (pile.js) ;
 *   3. le document découpé attend ici votre validation, puis vient se joindre à sa ligne du
 *      journal comme justificatif signé.
 *
 * La validation est le comportement par défaut, et « ranger automatiquement » est décoché au
 * départ : un classement qui se trompe une fois sur dix coûte plus cher que pas de classement du
 * tout. Et ce qui attend une validation attend dans les données de l'application, pas dans le
 * dossier du serveur : fermer l'application ne perd rien.
 */
(function () {
  'use strict';

  const S = window.CaisseScan || null;
  const M = window.CaisseMarque;
  const L = window.CaissePile;
  const R = window.CaisseRegistre;
  const pdfjsLib = window.pdfjsLib;
  const PDFLib = window.PDFLib;
  const $ = (id) => document.getElementById(id);
  const hote = $('receptionListe');
  if (!hote) return;

  const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plur = (n, mot, pluriel) => `${n} ${n > 1 ? (pluriel || mot + 's') : mot}`;
  const fmtCHF = (n) => { const v = Number(n) || 0; const [i, d] = v.toFixed(2).split('.'); return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, "'")}.${d}`; };

  /** Résolution de lecture des pages : celle d'un copieur ordinaire, et c'est assez (marque.js). */
  const PPP = 150;

  const etat = { documents: [], reglages: null, occupe: false, apercus: new Map() };

  /* ---------------- Lire une pile ---------------- */

  /** La marque relevée sur chaque page d'un PDF, ou null. */
  async function marquesDesPages(octets) {
    const doc = await pdfjsLib.getDocument({ data: octets.slice(), isEvalSupported: false, verbosity: 0 }).promise;
    const out = [];
    try {
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: PPP / 72 });
        const c = document.createElement('canvas');
        c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
        const ctx = c.getContext('2d', { willReadFrequently: true });
        // fond blanc : une page transparente donnerait du noir sur noir au décodeur
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const img = ctx.getImageData(0, 0, c.width, c.height);
        const trouve = M.chercher(img.data, img.width, img.height);
        out.push(trouve ? trouve.marque : null);
        page.cleanup();
      }
    } finally {
      try { await doc.destroy(); } catch (e) { /* ignore */ }
    }
    return out;
  }

  /** Extrait les pages d'un document de la pile dans un PDF à lui. */
  async function extraire(octets, pages) {
    const src = await PDFLib.PDFDocument.load(octets, { ignoreEncryption: true });
    const out = await PDFLib.PDFDocument.create();
    const copiees = await out.copyPages(src, pages);
    for (const p of copiees) out.addPage(p);
    return out.save();
  }

  /** Les registres nécessaires, chargés une seule fois par pile. */
  async function carnetDesPieces(annees) {
    const map = new Map();
    const storage = R.storage();
    if (!storage) return map;
    for (const annee of annees) {
      let reg = null;
      try { reg = await storage.load(annee); } catch (e) { reg = null; }
      if (!reg) continue;
      for (const p of reg.pieces || []) map.set(`${annee}:${p.id}`, p);
    }
    return map;
  }

  /**
   * Lit une pile entière et en tire des documents. Rend { documents, resume }.
   * Ne touche à rien : ni registre, ni fichier. C'est l'étape suivante qui range.
   */
  async function depouiller(nom, octets) {
    const marques = await marquesDesPages(octets);
    const bruts = L.decouper(marques);
    const annees = Array.from(new Set(bruts.filter((d) => d.marque).map((d) => d.marque.annee)));
    const carnet = await carnetDesPieces(annees);
    const classes = L.classer(bruts, carnet);
    const documents = [];
    for (let i = 0; i < classes.length; i++) {
      const d = classes[i];
      const tranche = await extraire(octets, d.pages);
      documents.push(Object.assign({}, d, {
        octets: tranche,
        source: nom,
        rang: i + 1,
        surTotal: classes.length,
      }));
    }
    return { documents, resume: L.resume(classes) };
  }

  /* ---------------- Ranger ---------------- */

  /** Joint le document à sa pièce, comme justificatif signé. Rend { ok, raison }. */
  async function joindre(doc) {
    if (!doc.piece || !doc.marque) return { ok: false, raison: 'aucune pièce désignée' };
    const storage = R.storage();
    if (!storage) return { ok: false, raison: 'stockage indisponible' };
    const annee = doc.marque.annee;
    let reg = null;
    try { reg = await storage.load(annee); } catch (e) { reg = null; }
    if (!reg) return { ok: false, raison: `le registre ${annee} est introuvable sur ce poste` };
    const piece = (reg.pieces || []).find((p) => p.id === doc.marque.id);
    if (!piece) return { ok: false, raison: `la pièce n'est plus dans le registre ${annee}` };

    // Rescanner une pièce doit REMPLACER son scan signé, pas en empiler un second. Le stockage
    // par fichiers cherche un nom libre quand le nom est pris (« piece-signee (1).pdf ») : sans
    // ce retrait préalable, une pièce repassée au copieur accumulerait les exemplaires, et le PDF
    // des pièces les imprimerait tous.
    const deja = (piece.justificatifs || []).find((j) => j.name === L.NOM_SIGNEE);
    if (deja) {
      try { await storage.remove(annee, piece.id, L.NOM_SIGNEE); } catch (e) { /* le fichier sera écrasé ou renommé */ }
      piece.justificatifs = piece.justificatifs.filter((j) => j.name !== L.NOM_SIGNEE);
    }
    let saved = null;
    try {
      saved = await storage.attach(annee, piece.id, L.NOM_SIGNEE, doc.octets);
    } catch (e) {
      if (deja) piece.justificatifs.push(deja); // l'ancien reste inscrit : on n'efface pas une trace pour rien
      return { ok: false, raison: `justificatif non enregistré (${(e && e.message) || e})` };
    }
    piece.justificatifs = (piece.justificatifs || []).filter((j) => j.name !== saved.name);
    piece.justificatifs.push({ name: saved.name, size: saved.size, kind: 'pdf', signee: true });
    try {
      await storage.save(reg);
    } catch (e) {
      return { ok: false, raison: `registre non enregistré (${(e && e.message) || e})` };
    }
    // la saisie affiche le même registre : elle doit voir le justificatif arriver
    const Sa = window.CaisseSaisie;
    if (Sa && Sa.state && Sa.state.reg && Sa.state.reg.annee === annee) {
      try { await Sa.openYear(annee); } catch (e) { /* l'affichage suivra */ }
    }
    return { ok: true, nom: saved.name };
  }

  /* ---------------- Ce que le processus principal nous confie ---------------- */

  /** Identifiant d'un document en attente : lisible, sans caractère surprenant. */
  const idReception = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  async function recevoir(d) {
    if (etat.occupe) { S.resultat({ id: d.id, ok: false, raison: 'une autre pile est en cours de lecture' }); return; }
    etat.occupe = true;
    majBandeau(`Lecture de « ${d.nom} »…`);
    try {
      const octets = d.octets instanceof Uint8Array ? d.octets : new Uint8Array(d.octets);
      const { documents, resume } = await depouiller(d.nom, octets);
      if (!documents.length) {
        S.resultat({ id: d.id, ok: false, raison: 'aucune page lisible dans ce PDF' });
        return;
      }
      let ranges = 0;
      for (const doc of documents) {
        // « Ranger automatiquement » ne vaut que pour ce qui ne laisse aucun doute : une marque
        // lisible, une pièce trouvée, et pas un second exemplaire.
        if (d.auto && doc.etat === 'trouvee') {
          const r = await joindre(doc);
          if (r.ok) { ranges += 1; continue; }
          doc.echec = r.raison;
        }
        await deposer(doc);
      }
      await rafraichir();
      const quoi = `${plur(documents.length, 'document')} (${plur(resume.pages, 'page')})`;
      majBandeau(`« ${d.nom} » : ${quoi}${ranges ? `, ${ranges} rangé(s) automatiquement` : ''}.`);
      S.resultat({ id: d.id, ok: true, nom: d.nom });
    } catch (e) {
      majBandeau(`« ${d.nom} » n'a pas pu être lu : ${(e && e.message) || e}`, 'err');
      S.resultat({ id: d.id, ok: false, raison: `lecture impossible (${(e && e.message) || e})` });
    } finally {
      etat.occupe = false;
    }
  }

  /** Met un document découpé en attente de validation, dans les données de l'application. */
  async function deposer(doc) {
    const id = idReception();
    const fiche = {
      etat: doc.etat,
      marque: doc.marque,
      source: doc.source,
      rang: doc.rang,
      surTotal: doc.surTotal,
      pages: doc.pages.length,
      echec: doc.echec || '',
      recuLe: new Date().toISOString(),
      piece: doc.piece ? { no: doc.piece.no, date: doc.piece.date, libelle: doc.piece.libelle, montant: doc.piece.montant, compte: doc.piece.compte } : null,
    };
    try { await S.deposer(id, fiche, doc.octets); } catch (e) { majBandeau(`Document non mis en attente : ${(e && e.message) || e}`, 'err'); }
  }

  /* ---------------- Affichage ---------------- */

  function majBandeau(texte, genre) {
    const el = $('receptionEtat');
    if (!el) return;
    el.className = `notice ${genre || 'ok'}`;
    el.innerHTML = escapeHtml(texte);
    el.classList.remove('hidden');
  }

  const ETIQUETTE = {
    trouvee: { texte: 'pièce reconnue', classe: 'ok' },
    doublon: { texte: 'déjà dans cette pile', classe: 'warn' },
    inconnue: { texte: 'marque illisible ici', classe: 'warn' },
    'sans-marque': { texte: 'sans code', classe: 'warn' },
  };

  function ligne(d) {
    const e = ETIQUETTE[d.etat] || ETIQUETTE['sans-marque'];
    const p = d.piece;
    const quoi = p
      ? `<b>n° ${escapeHtml(p.no)}</b> · ${escapeHtml(p.libelle || '')} · ${escapeHtml(fmtCHF(p.montant))}`
      : '<i>aucune pièce désignée</i>';
    const detail = d.etat === 'sans-marque'
      ? 'Ce document ne porte pas de code : il vient d\'avant les fiches marquées, ou ce n\'est pas une pièce de la caisse.'
      : d.etat === 'inconnue'
        ? `La marque désigne une pièce de ${escapeHtml((d.marque && d.marque.annee) || '?')} qui n'est pas dans les registres de ce poste.`
        : d.etat === 'doublon'
          ? 'Cette pièce est déjà venue plus haut dans la même pile : le chargeur a sans doute pris la feuille deux fois.'
          : '';
    return `<div class="rec" data-id="${escapeHtml(d.id)}">
  <div class="rec-vu"><canvas data-apercu="${escapeHtml(d.id)}" width="90" height="127"></canvas></div>
  <div class="rec-txt">
    <div class="rec-t">${quoi}</div>
    <div class="legend">${escapeHtml(d.source || '')} · document ${escapeHtml(d.rang)}/${escapeHtml(d.surTotal)} · ${plur(d.pages || 1, 'page')}</div>
    ${detail ? `<div class="legend">${detail}</div>` : ''}
    ${d.echec ? `<div class="legend" style="color:var(--err)">Rangement automatique impossible : ${escapeHtml(d.echec)}</div>` : ''}
  </div>
  <span class="chip ${e.classe}">${e.texte}</span>
  <div class="rec-act">
    ${d.etat === 'trouvee' || d.etat === 'doublon'
      ? `<button type="button" class="small primary" data-joindre="${escapeHtml(d.id)}"><svg class="ico sm"><use href="#i-check"/></svg> ${d.etat === 'doublon' ? 'Remplacer' : 'Joindre à la pièce'}</button>`
      : ''}
    <button type="button" class="small" data-voir="${escapeHtml(d.id)}"><svg class="ico sm"><use href="#i-eye"/></svg> Voir</button>
    <button type="button" class="small ghost" data-ecarter="${escapeHtml(d.id)}" title="Retirer de la boîte : le scan d'origine reste rangé dans « traité »"><svg class="ico sm"><use href="#i-x"/></svg></button>
  </div>
</div>`;
  }

  async function rafraichir() {
    if (!S) return;
    let liste = [];
    try { liste = await S.liste(); } catch (e) { liste = []; }
    liste.sort((a, b) => String(a.recuLe || '').localeCompare(String(b.recuLe || '')) || String(a.rang).localeCompare(String(b.rang)));
    etat.documents = liste;
    const compteur = $('receptionCompte');
    if (compteur) compteur.textContent = liste.length ? plur(liste.length, 'document en attente', 'documents en attente') : 'rien en attente';
    const badge = $('navBadgeReception');
    if (badge) { badge.textContent = liste.length ? String(liste.length) : ''; badge.classList.toggle('hidden', !liste.length); }
    hote.innerHTML = liste.length
      ? liste.map(ligne).join('')
      : '<div class="dvide">Rien en attente. Les scans déposés par le copieur dans le dossier surveillé arrivent ici tout seuls.</div>';
    for (const d of liste) dessinerApercu(d.id);
  }

  /** Première page du document, en vignette : de quoi reconnaître la pièce d'un coup d'œil. */
  async function dessinerApercu(id) {
    const c = hote.querySelector(`canvas[data-apercu="${id}"]`);
    if (!c) return;
    try {
      let octets = etat.apercus.get(id);
      if (!octets) { octets = await S.lire(id); if (octets) etat.apercus.set(id, octets); }
      if (!octets) return;
      const doc = await pdfjsLib.getDocument({ data: octets.slice(), isEvalSupported: false, verbosity: 0 }).promise;
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: Math.min(c.width / base.width, c.height / base.height) });
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      await doc.destroy();
    } catch (e) { /* une vignette manquante n'empêche pas de valider */ }
  }

  async function valider(id) {
    const d = etat.documents.find((x) => x.id === id);
    if (!d) return;
    let octets = null;
    try { octets = await S.lire(id); } catch (e) { octets = null; }
    if (!octets) { majBandeau('Le document en attente est introuvable.', 'err'); await rafraichir(); return; }
    const r = await joindre({ marque: d.marque, piece: d.piece, octets });
    if (!r.ok) { majBandeau(`Non joint : ${r.raison}`, 'err'); return; }
    try { await S.retirer(id); } catch (e) { /* le justificatif est en place, c'est l'essentiel */ }
    etat.apercus.delete(id);
    majBandeau(`Pièce n° ${d.piece ? d.piece.no : ''} : le scan signé est joint à la ligne du journal.`);
    await rafraichir();
  }

  async function voir(id) {
    let octets = null;
    try { octets = await S.lire(id); } catch (e) { octets = null; }
    if (!octets) return;
    const url = URL.createObjectURL(new Blob([octets], { type: 'application/pdf' }));
    const f = $('receptionFrame');
    if (f) { f.src = url; $('receptionApercu').classList.remove('hidden'); f.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  }

  async function ecarter(id) {
    const d = etat.documents.find((x) => x.id === id);
    if (d && !window.confirm('Retirer ce document de la boîte de réception ?\n\nLe scan d\'origine reste rangé dans « traité » : rien n\'est effacé.')) return;
    try { await S.retirer(id); } catch (e) { /* ignore */ }
    etat.apercus.delete(id);
    await rafraichir();
  }

  /* ---------------- Réglages ---------------- */

  async function majReglages() {
    if (!S) return;
    let r = null;
    try { r = await S.etat(); } catch (e) { r = null; }
    etat.reglages = r;
    const box = $('receptionDossiers');
    if (box) {
      box.innerHTML = (r && r.dossiers && r.dossiers.length)
        ? r.dossiers.map((d) => `<div class="dligne"><span class="dval">${escapeHtml(d.chemin)}</span><span class="dspacer"></span>` +
          `<button type="button" class="small ghost" data-oublier="${escapeHtml(d.chemin)}" title="Ne plus surveiller ce dossier"><svg class="ico sm"><use href="#i-x"/></svg></button></div>`).join('')
        : '<div class="dvide">Aucun dossier surveillé. Ajoutez celui où le copieur dépose ses scans (par exemple <code>P:\\Scan\\Caisse</code>).</div>';
    }
    const actif = $('optScanActif');
    if (actif) actif.checked = !!(r && r.actif);
    const auto = $('optScanAuto');
    if (auto) auto.checked = !!(r && r.auto);
    const info = $('receptionInfo');
    if (info && r) {
      info.innerHTML = `Poste <b>${escapeHtml(r.poste || '')}</b> · ${r.tours || 0} tour(s) · ` +
        `${r.traites || 0} scan(s) rangé(s) · ${r.revoir || 0} à revoir${r.erreurs ? ` · <span style="color:var(--err)">${r.erreurs} erreur(s) d'accès</span>` : ''}`;
    }
  }

  async function regler(patchObj) {
    try { await S.regler(patchObj); } catch (e) { majBandeau(`Réglage non enregistré : ${(e && e.message) || e}`, 'err'); }
    await majReglages();
  }

  /* ---------------- Branchements ---------------- */

  hote.addEventListener('click', (ev) => {
    const j = ev.target.closest('[data-joindre]');
    if (j) { valider(j.dataset.joindre); return; }
    const v = ev.target.closest('[data-voir]');
    if (v) { voir(v.dataset.voir); return; }
    const e = ev.target.closest('[data-ecarter]');
    if (e) { ecarter(e.dataset.ecarter); }
  });

  if ($('receptionDossiers')) {
    $('receptionDossiers').addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-oublier]');
      if (!b) return;
      const restants = ((etat.reglages && etat.reglages.dossiers) || []).filter((d) => d.chemin !== b.dataset.oublier);
      await regler({ scanDossiers: restants });
    });
  }
  if ($('btnScanAjouter')) {
    $('btnScanAjouter').addEventListener('click', async () => {
      let chemin = null;
      try { chemin = await S.choisirDossier(); } catch (e) { chemin = null; }
      if (!chemin) return;
      const actuels = (etat.reglages && etat.reglages.dossiers) || [];
      if (actuels.some((d) => d.chemin === chemin)) { majBandeau('Ce dossier est déjà surveillé.', 'warn'); return; }
      await regler({ scanDossiers: actuels.concat([{ chemin }]) });
      majBandeau(`Dossier surveillé : ${chemin}`);
    });
  }
  if ($('optScanActif')) $('optScanActif').addEventListener('change', (ev) => regler({ scanActif: ev.target.checked }));
  if ($('optScanAuto')) $('optScanAuto').addEventListener('change', (ev) => regler({ scanAuto: ev.target.checked }));
  if ($('btnScanRegarder')) {
    $('btnScanRegarder').addEventListener('click', async () => {
      majBandeau('Lecture du dossier…');
      try {
        const r = await S.regarder();
        majBandeau(r.erreurs.length
          ? `Dossier injoignable : ${r.erreurs[0]}`
          : `${plur(r.reserves, 'scan pris', 'scans pris')}${r.attentes ? `, ${plur(r.attentes, 'fichier')} encore en cours d'écriture` : ''}.`,
        r.erreurs.length ? 'err' : 'ok');
      } catch (e) { majBandeau(`Lecture impossible : ${(e && e.message) || e}`, 'err'); }
      await majReglages();
      await rafraichir();
    });
  }
  if ($('btnReceptionDossier')) $('btnReceptionDossier').addEventListener('click', () => S.ouvrirDossier());
  if ($('btnReceptionFermer')) $('btnReceptionFermer').addEventListener('click', () => $('receptionApercu').classList.add('hidden'));

  /* ---------------- Démarrage ---------------- */

  if (!S) {
    // fichier HTML seul, hors de l'application fenêtrée : pas de dossier à surveiller
    hote.innerHTML = '<div class="dvide">La surveillance d\'un dossier demande l\'application Windows <b>Compta Blonay</b>. Dans ce fichier HTML seul, déposez les PDF dans l\'espace « Pièces scannées ».</div>';
    const r = $('receptionReglages');
    if (r) r.classList.add('hidden');
  } else {
    S.onEntrant((d) => { recevoir(d).catch((e) => console.warn('scan entrant', e)); });
    majReglages();
    rafraichir();
    // Tant qu'on regarde cet écran, il dit l'état réel : la veille tourne dans le processus
    // principal et range des scans sans nous prévenir. Ailleurs dans l'application, on ne
    // demande rien — inutile d'interroger le disque pour un écran que personne ne regarde.
    setInterval(() => {
      const panneau = document.getElementById('panelReception');
      if (!panneau || panneau.classList.contains('hidden') || etat.occupe) return;
      majReglages();
      rafraichir();
    }, 5000);
  }

  window.CaisseReception = { depouiller, joindre, rafraichir, majReglages };
})();
