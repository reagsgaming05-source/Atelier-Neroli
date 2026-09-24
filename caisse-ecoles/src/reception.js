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
 * tout. Et ce qui attend une validation attend avec les données de la caisse (sur le serveur
 * quand elles y sont) : fermer l'application ne perd rien.
 */
(function () {
  'use strict';

  const S = window.CaisseScan || null;
  const M = window.CaisseMarque;
  const L = window.CaissePile;
  const R = window.CaisseRegistre;
  const P = window.CaisseParser;
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

  /**
   * Ce que chaque page d'un PDF dit d'elle : sa marque (ou null), et si son texte est celui d'une
   * fiche « PIÈCE COMPTABLE ». Le second sert quand le code d'une fiche est illisible : la page
   * ouvre alors un document à elle, au lieu d'être collée à la pièce d'avant (pile.js).
   */
  async function marquesDesPages(octets) {
    const doc = await pdfjsLib.getDocument({ data: octets.slice(), isEvalSupported: false, verbosity: 0 }).promise;
    const marques = [];
    const fiches = [];
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
        marques.push(trouve ? trouve.marque : null);
        let fiche = false;
        if (!trouve && P) {
          // le texte du scan (« PDF consultable ») : un scan sans texte ne dit rien, et c'est tout
          try {
            const vp1 = page.getViewport({ scale: 1 });
            const words = P.itemsFromTextContent(await page.getTextContent(), vp1, pdfjsLib.Util);
            fiche = P.countForms({ pageNumber: i, width: vp1.width, height: vp1.height, words }) > 0;
          } catch (e) { fiche = false; }
        }
        fiches.push(fiche);
        page.cleanup();
      }
    } finally {
      try { await doc.destroy(); } catch (e) { /* ignore */ }
    }
    return { marques, fiches };
  }

  /** Extrait les pages d'un document de la pile dans un PDF à lui. */
  async function extraire(octets, pages) {
    const src = await PDFLib.PDFDocument.load(octets, { ignoreEncryption: true });
    const out = await PDFLib.PDFDocument.create();
    const copiees = await out.copyPages(src, pages);
    for (const p of copiees) out.addPage(p);
    return out.save();
  }

  /**
   * Les registres nécessaires, chargés une seule fois par pile. `absents` : les années dont le
   * registre n'est pas sur ce poste — une pièce « introuvable » n'appelle pas le même geste selon
   * que c'est tout le registre qui manque ou la seule pièce.
   */
  async function carnetDesPieces(annees) {
    const map = new Map();
    map.absents = new Set();
    const storage = R.storage();
    if (!storage) return map;
    for (const annee of annees) {
      let reg = null;
      try { reg = await storage.load(annee); } catch (e) { reg = null; }
      if (!reg) { map.absents.add(annee); continue; }
      for (const p of reg.pieces || []) map.set(`${annee}:${p.id}`, p);
    }
    return map;
  }

  /**
   * Lit une pile entière et en tire des documents. Rend { documents, resume }.
   * Ne touche à rien : ni registre, ni fichier. C'est l'étape suivante qui range.
   */
  async function depouiller(nom, octets) {
    const { marques, fiches } = await marquesDesPages(octets);
    const bruts = L.decouper(marques, { fiches });
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
        registreAbsent: !!(d.marque && carnet.absents.has(d.marque.annee)),
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
    if (!reg) return { ok: false, raison: `le journal ${annee} est introuvable sur ce poste` };
    const piece = (reg.pieces || []).find((p) => p.id === doc.marque.id);
    if (!piece) return { ok: false, raison: `la pièce n'est plus dans le journal ${annee}` };

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
      return { ok: false, raison: `journal non enregistré (${(e && e.message) || e})` };
    }
    // Le bac à courrier : en plus d'être attaché au journal, un décompte est posé dans un dossier
    // qu'on ouvre dans l'explorateur pour voir ce qu'il reste à faire. Un échec ici ne remet pas
    // en cause le justificatif, qui est déjà en place : on le dit, et on n'annule rien.
    let range = null;
    const ou = L.rangement(piece);
    if (ou && S && S.poser) {
      try { range = { dossier: ou.dossier, nom: ou.nom, chemin: await S.poser(ou.dossier, ou.nom, doc.octets) }; }
      catch (e) { range = { dossier: ou.dossier, echec: (e && e.message) || String(e) }; }
    }

    // la saisie affiche le même registre : elle doit voir le justificatif arriver
    const Sa = window.CaisseSaisie;
    if (Sa && Sa.state && Sa.state.reg && Sa.state.reg.annee === annee) {
      try { await Sa.openYear(annee); } catch (e) { /* l'affichage suivra */ }
    }
    return { ok: true, nom: saved.name, range };
  }

  /* ---------------- Ce que le processus principal nous confie ---------------- */

  /** Identifiant d'un document en attente : lisible, sans caractère surprenant. */
  const idReception = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  /**
   * Lit une pile et met ses documents en attente dans la boîte. Rend { ok, raison, documents }.
   * Le bandeau dit ce que la pile contient — combien de pièces reconnues, en double, à regarder —
   * et avertit quand elle semble posée à l'envers : c'est le seul cas où des pages partent chez
   * la mauvaise pièce sans que rien d'autre ne le montre.
   */
  async function lireEtDeposer(nom, octets, auto) {
    majBandeau(`Lecture de « ${nom} »…`);
    const { documents, resume } = await depouiller(nom, octets);
    if (!documents.length) return { ok: false, raison: 'aucune page lisible dans ce PDF' };
    let ranges = 0;
    for (const doc of documents) {
      // « Joindre tout seul » ne vaut que pour ce qui ne laisse aucun doute : une marque
      // lisible, une pièce trouvée, et pas un second exemplaire.
      if (auto && doc.etat === 'trouvee') {
        const r = await joindre(doc);
        if (r.ok) { ranges += 1; continue; }
        doc.echec = r.raison;
      }
      await deposer(doc);
    }
    await rafraichir();
    const quoi = `${plur(documents.length, 'document')} (${plur(resume.pages, 'page')})`;
    const bilan = L.phrase(resume);
    const ordre = resume.ordreDouteux
      ? ' La pile commence par des pages sans code : si elle a été posée à l\'envers (tickets avant leur fiche), chaque ticket est parti avec la fiche d\'avant — regardez les pages de chaque document, et rescannez au besoin, chaque fiche posée au-dessus de ses tickets.'
      : '';
    majBandeau(`« ${nom} » : ${quoi}${bilan ? ` — ${bilan}` : ''}${ranges ? `, ${ranges} joint(s) tout seul(s)` : ''}.${ordre}`, resume.ordreDouteux ? 'warn' : 'ok');
    return { ok: true, documents: documents.length };
  }

  async function recevoir(d) {
    if (etat.occupe) { S.resultat({ id: d.id, ok: false, raison: 'une autre pile est en cours de lecture' }); return; }
    etat.occupe = true;
    try {
      const octets = d.octets instanceof Uint8Array ? d.octets : new Uint8Array(d.octets);
      const r = await lireEtDeposer(d.nom, octets, d.auto);
      S.resultat(r.ok ? { id: d.id, ok: true, nom: d.nom } : { id: d.id, ok: false, raison: r.raison });
    } catch (e) {
      majBandeau(`« ${d.nom} » n'a pas pu être lu : ${(e && e.message) || e}`, 'err');
      S.resultat({ id: d.id, ok: false, raison: `lecture impossible (${(e && e.message) || e})` });
    } finally {
      etat.occupe = false;
    }
  }

  /**
   * Une pile qui arrive autrement que par le copieur : des fiches signées déposées par erreur dans
   * « Pièces scannées ». Elles attendent ici comme les autres, jamais jointes sans accord.
   */
  async function accueillir(nom, octets) {
    if (!S) return { ok: false, raison: 'la boîte de réception demande l\'application Windows' };
    if (etat.occupe) return { ok: false, raison: 'une autre pile est en cours de lecture' };
    etat.occupe = true;
    try {
      return await lireEtDeposer(nom, octets instanceof Uint8Array ? octets : new Uint8Array(octets), false);
    } catch (e) {
      majBandeau(`« ${nom} » n'a pas pu être lu : ${(e && e.message) || e}`, 'err');
      return { ok: false, raison: `lecture impossible (${(e && e.message) || e})` };
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
      registreAbsent: !!doc.registreAbsent,
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
    trouvee: () => ({ texte: 'pièce reconnue', classe: 'ok' }),
    doublon: () => ({ texte: 'deux fois dans cette pile', classe: 'warn' }),
    // La marque a bien été lue : c'est la pièce qui manque. « marque illisible » faisait rescanner
    // une feuille parfaitement lisible.
    inconnue: (d) => ({ texte: `pièce introuvable (${(d.marque && d.marque.annee) || '?'})`, classe: 'warn' }),
    'code-illisible': () => ({ texte: 'code illisible', classe: 'warn' }),
    'sans-marque': () => ({ texte: 'sans code', classe: 'warn' }),
  };
  /** Documents sans pièce désignée : la personne peut dire à laquelle ils vont. */
  const RATTACHABLES = ['sans-marque', 'code-illisible', 'inconnue'];
  /** Nombre de petites vignettes de pages en plus de la première. */
  const PAGES_VUES = 5;

  function ligne(d) {
    const e = (ETIQUETTE[d.etat] || ETIQUETTE['sans-marque'])(d);
    const p = d.piece;
    const id = escapeHtml(d.id);
    const annee = escapeHtml((d.marque && d.marque.annee) || '?');
    const quoi = p
      ? `<b>n° ${escapeHtml(p.no)}</b> · ${escapeHtml(p.libelle || '')} · ${escapeHtml(fmtCHF(p.montant))}`
      : '<i>aucune pièce désignée</i>';
    // Ce qu'il faut faire, et pas seulement pourquoi.
    const detail = d.etat === 'sans-marque'
      ? 'Aucun code sur ce document : fiche remplie à la main (ancien modèle), ou feuille glissée par erreur. Tapez le n° de sa pièce pour l\'y joindre, lisez-le comme fiche remplie à la main, ou écartez-le.'
      : d.etat === 'code-illisible'
        ? 'C\'est une fiche PIÈCE COMPTABLE, mais son code n\'a pas pu être lu (pli, agrafe, tache ?). Tapez le n° écrit sur la fiche pour la joindre à sa pièce.'
        : d.etat === 'inconnue'
          ? (d.registreAbsent
            ? `Le code désigne une pièce de ${annee}, et le journal ${annee} n'est pas dans les données de ce poste. Tapez le n° d'une pièce de l'année ouverte pour l'y joindre, ou écartez ce document.`
            : `Le code désigne une pièce du journal ${annee} qui n'y est plus (supprimée depuis l'impression ?). Tapez le n° de la pièce à laquelle joindre ce document, ou écartez-le.`)
          : d.etat === 'doublon'
            ? 'Cette pièce est déjà venue plus haut dans la même pile : le chargeur a sans doute pris la feuille deux fois. Écartez ce doublon ; ne remplacez le scan joint que si celui-ci est le bon.'
            : '';
    const n = Number(d.pages) || 1;
    const autresPages = [];
    for (let i = 2; i <= Math.min(n, PAGES_VUES + 1); i++) autresPages.push(`<canvas data-apercu="${id}" data-page="${i}" width="45" height="64" title="Page ${i}"></canvas>`);
    const reg = registreOuvert();
    const rattacher = RATTACHABLES.includes(d.etat) && reg
      ? `<div class="rec-ratt"><label class="legend" for="ratt-${id}">Pièce n°</label><input type="number" min="1" step="1" id="ratt-${id}" data-ratt-no="${id}" placeholder="n°">` +
        `<button type="button" class="small" data-rattacher="${id}">Joindre à cette pièce (${reg.annee})</button>` +
        (d.etat === 'sans-marque' && window.CaisseApp && window.CaisseApp.addPdfFiles
          ? `<button type="button" class="small ghost" data-lire="${id}" title="L'envoyer dans « Pièces scannées », qui lit les fiches remplies à la main et les ajoute au journal">Lire comme fiche remplie à la main</button>` : '') +
        '</div>'
      : '';
    // Pour un doublon, l'action sûre est d'écarter : « Remplacer » en bouton principal faisait
    // perdre d'un clic le scan complet (fiche et tickets) au profit d'une feuille seule.
    const actions = d.etat === 'trouvee'
      ? `<button type="button" class="small primary" data-joindre="${id}"><svg class="ico sm"><use href="#i-check"/></svg> Joindre à la pièce</button>`
      : d.etat === 'doublon'
        ? `<button type="button" class="small primary" data-ecarter="${id}"><svg class="ico sm"><use href="#i-x"/></svg> Écarter ce doublon</button>`
        : '';
    return `<div class="rec" data-id="${id}">
  <div class="rec-vu"><canvas data-apercu="${id}" data-page="1" width="90" height="127"></canvas></div>
  <div class="rec-txt">
    <div class="rec-t">${quoi}</div>
    <div class="legend">${escapeHtml(d.source || '')} · document ${escapeHtml(d.rang)}/${escapeHtml(d.surTotal)} · ${escapeHtml(L.pagesDe(n, !!d.marque || d.etat === 'code-illisible'))}</div>
    ${autresPages.length ? `<div class="rec-pages">${autresPages.join('')}${n > PAGES_VUES + 1 ? `<span class="legend">+ ${n - PAGES_VUES - 1}</span>` : ''}</div>` : ''}
    ${detail ? `<div class="legend">${detail}</div>` : ''}
    ${rattacher}
    ${d.echec ? `<div class="legend" style="color:var(--err)">Pas joint tout seul : ${escapeHtml(d.echec)}</div>` : ''}
  </div>
  <span class="chip ${e.classe}">${escapeHtml(e.texte)}</span>
  <div class="rec-act">
    ${actions}
    <button type="button" class="small" data-voir="${id}"><svg class="ico sm"><use href="#i-eye"/></svg> Voir</button>
    ${d.etat === 'doublon'
      ? `<button type="button" class="small ghost rec-sec" data-joindre="${id}" title="Retire de la pièce le scan signé déjà joint et met celui-ci à sa place">Remplacer le scan joint…</button>`
      : `<button type="button" class="small ghost" data-ecarter="${id}" title="Retirer de la boîte : le scan d'origine reste rangé dans « traité »"><svg class="ico sm"><use href="#i-x"/></svg></button>`}
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
    // La Boîte de réception est listée dans les deux barres latérales : elle a donc deux pastilles,
    // et les deux doivent dire la même chose. On les prend par leur marque, pas par un identifiant.
    for (const badge of document.querySelectorAll('[data-badge-reception]')) {
      badge.textContent = liste.length ? String(liste.length) : '';
      badge.classList.toggle('hidden', !liste.length);
    }
    // Une pile de trente fiches ne doit pas coûter trente clics : les pièces reconnues sans doute
    // possible se joignent d'un coup, après une confirmation qui dit lesquelles.
    const groupe = $('receptionGroupe');
    if (groupe) {
      const trouvees = liste.filter((d) => d.etat === 'trouvee');
      groupe.classList.toggle('hidden', trouvees.length < 2);
      groupe.innerHTML = trouvees.length < 2 ? ''
        : `<button type="button" class="small primary" data-joindre-tout="1"><svg class="ico sm"><use href="#i-check"/></svg> Joindre les ${trouvees.length} pièces reconnues</button>` +
          `<span class="legend">n° ${escapeHtml(trouvees.map((d) => (d.piece ? d.piece.no : '?')).join(', '))} · les autres documents restent à regarder un par un</span>`;
    }
    hote.innerHTML = liste.length
      ? liste.map(ligne).join('')
      : '<div class="dvide">Rien en attente. Les fiches signées que vous scannez au copieur arrivent ici toutes seules.</div>';
    for (const d of liste) dessinerApercu(d.id);
    rendreDecomptes();
  }

  /** Les pages du document en vignettes : la première pour reconnaître la pièce, les suivantes
   *  pour voir d'un coup d'œil qu'une fiche s'est glissée dans la pièce d'à côté. */
  async function dessinerApercu(id) {
    const toiles = Array.from(hote.querySelectorAll(`canvas[data-apercu="${id}"]`));
    if (!toiles.length) return;
    try {
      let octets = etat.apercus.get(id);
      if (!octets) { octets = await S.lire(id); if (octets) etat.apercus.set(id, octets); }
      if (!octets) return;
      const doc = await pdfjsLib.getDocument({ data: octets.slice(), isEvalSupported: false, verbosity: 0 }).promise;
      try {
        for (const c of toiles) {
          const n = Number(c.dataset.page) || 1;
          if (n > doc.numPages) continue;
          const page = await doc.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: Math.min(c.width / base.width, c.height / base.height) });
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
        }
      } finally { await doc.destroy(); }
    } catch (e) { /* une vignette manquante n'empêche pas de valider */ }
  }

  /**
   * La pièce a-t-elle déjà un scan signé ? Rend { pages } ou null. Le joindre à nouveau le
   * remplace : on le dit avant, avec le nombre de pages de part et d'autre — deux pages (fiche et
   * ticket) remplacées par une seule, c'est un ticket perdu.
   */
  async function scanDejaJoint(marque) {
    if (!marque) return null;
    const storage = R.storage();
    if (!storage) return null;
    const ouvert = registreOuvert();
    let reg = ouvert && ouvert.annee === marque.annee ? ouvert : null;
    if (!reg) { try { reg = await storage.load(marque.annee); } catch (e) { reg = null; } }
    const p = reg && (reg.pieces || []).find((x) => x.id === marque.id);
    if (!p || !(p.justificatifs || []).some((j) => j.name === L.NOM_SIGNEE)) return null;
    let pages = 0;
    try {
      const o = await storage.read(marque.annee, p.id, L.NOM_SIGNEE);
      if (o) {
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(o).slice(), isEvalSupported: false, verbosity: 0 }).promise;
        pages = doc.numPages;
        await doc.destroy();
      }
    } catch (e) { pages = 0; }
    return { pages };
  }

  /** Joint un document en attente à une pièce, puis le sort de la boîte. Rend vrai s'il est joint. */
  async function joindreEtRetirer(d, marque, piece, silencieux) {
    let octets = null;
    try { octets = await S.lire(d.id); } catch (e) { octets = null; }
    if (!octets) { if (!silencieux) { majBandeau('Le document en attente est introuvable.', 'err'); await rafraichir(); } return { ok: false, raison: 'document introuvable' }; }
    const r = await joindre({ marque, piece, octets });
    if (!r.ok) { if (!silencieux) majBandeau(`Non joint : ${r.raison}`, 'err'); return r; }
    try { await S.retirer(d.id); } catch (e) { /* le justificatif est en place, c'est l'essentiel */ }
    etat.apercus.delete(d.id);
    if (!silencieux) {
      const ou = r.range && !r.range.echec
        ? ` Posé aussi dans ${r.range.dossier.replace(/\//g, '\\')}.`
        : (r.range && r.range.echec ? ` Non posé dans ${r.range.dossier} : ${r.range.echec}` : '');
      majBandeau(`Pièce n° ${piece && piece.no != null ? piece.no : ''} : le scan signé est joint à la ligne du journal.${ou}`, r.range && r.range.echec ? 'warn' : 'ok');
      await rafraichir();
    }
    return r;
  }

  async function valider(id) {
    const d = etat.documents.find((x) => x.id === id);
    if (!d) return;
    const deja = await scanDejaJoint(d.marque);
    if (deja && !window.confirm(`La pièce n° ${d.piece ? d.piece.no : '?'} a déjà un scan signé${deja.pages ? ` (${plur(deja.pages, 'page')})` : ''}.\n\n` +
      `Le remplacer par celui-ci (${plur(Number(d.pages) || 1, 'page')}) ? L'ancien scan sera retiré de la pièce.`)) return;
    await joindreEtRetirer(d, d.marque, d.piece);
  }

  /** « Joindre les N pièces reconnues » : celles qui n'ont pas encore de scan signé. */
  async function joindreTout() {
    const trouvees = etat.documents.filter((d) => d.etat === 'trouvee');
    if (!trouvees.length) return;
    if (!window.confirm(`Joindre le scan signé de ${plur(trouvees.length, 'pièce')} à sa ligne du journal ?\n\n` +
      `n° ${trouvees.map((d) => (d.piece ? d.piece.no : '?')).join(', ')}\n\n` +
      'Une pièce qui a déjà un scan signé est laissée de côté : elle se remplace une par une.')) return;
    let joints = 0; const laisses = []; const echecs = [];
    for (const d of trouvees) {
      if (await scanDejaJoint(d.marque)) { laisses.push(d.piece ? d.piece.no : '?'); continue; }
      const r = await joindreEtRetirer(d, d.marque, d.piece, true);
      if (r.ok) joints += 1; else echecs.push(`n° ${d.piece ? d.piece.no : '?'} (${r.raison})`);
    }
    majBandeau(`${plur(joints, 'scan signé joint', 'scans signés joints')} à leur pièce.` +
      (laisses.length ? ` Déjà signées, laissées de côté : n° ${laisses.join(', ')}.` : '') +
      (echecs.length ? ` Non joints : ${echecs.join(' ; ')}.` : ''), echecs.length ? 'warn' : 'ok');
    await rafraichir();
  }

  /** Un document sans pièce désignée, joint à la pièce dont la personne tape le n°. */
  async function rattacher(id) {
    const d = etat.documents.find((x) => x.id === id);
    const champ = hote.querySelector(`input[data-ratt-no="${id}"]`);
    const reg = registreOuvert();
    if (!d || !champ || !reg) return;
    const no = Number(String(champ.value).trim());
    if (!Number.isInteger(no) || no <= 0) { majBandeau('Tapez le n° de la pièce à laquelle joindre ce document.', 'warn'); champ.focus(); return; }
    const piece = (reg.pieces || []).find((p) => p.no === no);
    if (!piece) { majBandeau(`Aucune pièce n° ${no} dans le journal ${reg.annee}.`, 'err'); champ.focus(); return; }
    const marque = { annee: reg.annee, id: piece.id };
    const deja = await scanDejaJoint(marque);
    if (!window.confirm(`Joindre ce document (${plur(Number(d.pages) || 1, 'page')}) à la pièce n° ${no} du journal ${reg.annee} ?\n\n` +
      `${piece.libelle || ''} — ${fmtCHF(piece.montant)}` +
      (deja ? `\n\nCette pièce a déjà un scan signé${deja.pages ? ` (${plur(deja.pages, 'page')})` : ''} : il sera remplacé par celui-ci.` : ''))) return;
    await joindreEtRetirer(d, marque, piece);
  }

  /** Une fiche remplie à la main, sans code : sa place est « Pièces scannées », qui la lit. */
  async function lireCommeFiche(id) {
    const d = etat.documents.find((x) => x.id === id);
    const A = window.CaisseApp;
    if (!d || !A || !A.addPdfFiles) return;
    let octets = null;
    try { octets = await S.lire(id); } catch (e) { octets = null; }
    if (!octets) { majBandeau('Le document en attente est introuvable.', 'err'); return; }
    const nom = `${String(d.source || 'scan').replace(/\.pdf$/i, '')} - document ${d.rang}.pdf`;
    await A.addPdfFiles([new File([octets], nom, { type: 'application/pdf' })]);
    try { await S.retirer(id); } catch (e) { /* il est lu, c'est l'essentiel */ }
    etat.apercus.delete(id);
    await rafraichir();
    if (A.showPanel) A.showPanel('panelScan');
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

  /* ---------------- Les décomptes à faire, dans l'application ---------------- */
  /*
   * Le même contenu que le dossier « Décomptes\À faire », mais lu dans le registre plutôt que sur
   * le disque. C'est plus juste : le registre connaît aussi les décomptes dont le scan signé n'est
   * pas encore revenu, et le dossier ne peut pas les montrer.
   */

  const registreOuvert = () => (window.CaisseSaisie && window.CaisseSaisie.state && window.CaisseSaisie.state.reg) || null;
  const aSonScan = (p) => (p.justificatifs || []).some((j) => j.name === L.NOM_SIGNEE);

  function decomptesAFaire() {
    const reg = registreOuvert();
    if (!reg) return [];
    return (reg.pieces || [])
      .filter((p) => String(p.type || '').toUpperCase() === 'DECOMPTE' && p.decompteAFaire)
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || (a.no || 0) - (b.no || 0));
  }

  function ligneDecompte(p) {
    const genre = L.genreDeDecompte(p.objet);
    const scan = aSonScan(p);
    const description = String(p.libelle || '').replace(/^[A-ZÀ-Ý' ]+ - /, '').trim() || '(sans libellé)';
    return `<div class="dligne" data-piece="${escapeHtml(p.id)}">
  <span class="dval">n° ${escapeHtml(p.no == null ? '?' : p.no)}</span>
  <span class="ddetail" style="flex:1;white-space:normal">${escapeHtml(description)}</span>
  <span class="chip ${scan ? 'ok' : 'warn'}" title="${scan ? 'La fiche signée est revenue du copieur' : 'La fiche signée n\'a pas encore été scannée'}">${scan ? 'signée' : 'pas encore scannée'}</span>
  <span class="dn">${escapeHtml(fmtCHF(p.montant))}</span>
  ${scan ? `<button type="button" class="small" data-voir-piece="${escapeHtml(p.id)}"><svg class="ico sm"><use href="#i-eye"/></svg> Voir</button>` : ''}
  <button type="button" class="small primary" data-fait="${escapeHtml(p.id)}" title="Le décompte est établi : retirer de « à faire »"><svg class="ico sm"><use href="#i-check"/></svg> Fait</button>
</div>`;
  }

  function rendreDecomptes() {
    const boite = $('decomptesListe');
    if (!boite) return;
    const tous = decomptesAFaire();
    const compteur = $('decomptesCompte');
    const reg = registreOuvert();
    if (compteur) compteur.textContent = tous.length ? `${plur(tous.length, 'décompte')} · ${reg ? reg.annee : ''}` : (reg ? `rien à faire · ${reg.annee}` : '');
    if (!tous.length) {
      boite.innerHTML = '<div class="dvide">Aucun décompte à faire. Cochez « Décompte à faire » sur la fiche d\'un DECOMPTE pour qu\'il apparaisse ici.</div>';
      return;
    }
    const groupes = [['Camp', tous.filter((p) => L.genreDeDecompte(p.objet) === 'Camp')],
      ["Course d'école", tous.filter((p) => L.genreDeDecompte(p.objet) !== 'Camp')]];
    boite.innerHTML = groupes.filter(([, l]) => l.length).map(([titre, l]) => (
      `<div class="dgroupe"><div class="dgroupe-t">${escapeHtml(titre)} <span class="legend">${plur(l.length, 'décompte')}</span></div>` +
      `<div class="dliste" style="max-height:none;margin-top:8px">${l.map(ligneDecompte).join('')}</div></div>`
    )).join('');
  }

  /** Le décompte est établi : il sort du bac, à l'écran comme dans le dossier. */
  async function marquerFait(id) {
    const reg = registreOuvert();
    if (!reg) return;
    const piece = (reg.pieces || []).find((p) => p.id === id);
    if (!piece) return;
    const avant = L.rangement(piece); // là où son scan se trouve aujourd'hui
    piece.decompteAFaire = false;
    const apres = L.rangement(piece);
    try {
      await window.CaisseSaisie.saveReg();
    } catch (e) {
      piece.decompteAFaire = true;
      majBandeau(`Journal non enregistré : ${(e && e.message) || e}`, 'err');
      return;
    }
    let dit = '';
    if (avant && apres && avant.dossier !== apres.dossier && S && S.deplacer) {
      try {
        const r = await S.deplacer(avant.dossier, apres.dossier, avant.nom);
        dit = r && r.deplace ? ` Son scan est passé dans <b>Décomptes</b>.` : '';
      } catch (e) { dit = ` <span style="color:var(--err)">Scan non déplacé : ${escapeHtml((e && e.message) || e)}</span>`; }
    }
    if (window.CaisseSaisie.renderJournal) { try { window.CaisseSaisie.renderJournal(); } catch (e) { /* ignore */ } }
    majBandeau(`Décompte n° ${piece.no} marqué fait.${dit}`);
    rendreDecomptes();
  }

  /** Le scan signé d'une pièce, tel qu'il est joint à sa ligne du journal. */
  async function voirPiece(id) {
    const reg = registreOuvert();
    const storage = R.storage();
    if (!reg || !storage) return;
    let octets = null;
    try { octets = await storage.read(reg.annee, id, L.NOM_SIGNEE); } catch (e) { octets = null; }
    if (!octets) { majBandeau('Le scan signé de cette pièce est introuvable.', 'warn'); return; }
    const url = URL.createObjectURL(new Blob([octets], { type: 'application/pdf' }));
    const f = $('receptionFrame');
    if (f) { f.src = url; $('receptionApercu').classList.remove('hidden'); f.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  }

  /* ---------------- Réglages ---------------- */

  async function majReglages() {
    if (!S) return;
    let r = null;
    try { r = await S.etat(); } catch (e) { r = null; }
    etat.reglages = r;
    // Le dossier de l'application : l'adresse à donner au copieur. C'est l'information qu'on
    // vient chercher sur cet écran, donc elle est en haut, en toutes lettres, et copiable.
    const dep = $('receptionDepot');
    if (dep && r) dep.textContent = r.depot || '';
    const note = $('receptionDepotNote');
    if (note && r) {
      note.innerHTML = r.depotReseau
        ? 'Cette adresse est sur le réseau : le copieur peut la viser telle quelle.'
        // Ne plus conseiller de poser le programme sur le serveur : c'est ce qui échoue (lenteur,
        // sécurité du réseau). Ce sont les DONNÉES qui y vont — voir « Où sont les données ».
        : "Cette adresse est locale à ce PC : le copieur ne peut pas l'atteindre. Mettez les <b>données</b> sur le serveur (<i>L'année → Où sont les données</i>) — le programme, lui, reste sur ce PC —, ou ajoutez plus bas le dossier réseau où le copieur dépose déjà.";
    }
    const box = $('receptionDossiers');
    if (box) {
      box.innerHTML = (r && r.dossiers && r.dossiers.length)
        ? r.dossiers.map((d) => `<div class="dligne"><span class="dval">${escapeHtml(d.chemin)}</span><span class="dspacer"></span>` +
          `<button type="button" class="small ghost" data-oublier="${escapeHtml(d.chemin)}" title="Ne plus surveiller ce dossier"><svg class="ico sm"><use href="#i-x"/></svg></button></div>`).join('')
        : '<div class="dvide">Aucun autre dossier. Le dossier de l\'application ci-dessus suffit si le copieur peut y écrire.</div>';
    }
    const actif = $('optScanActif');
    if (actif) actif.checked = !!(r && r.actif);
    const auto = $('optScanAuto');
    if (auto) auto.checked = !!(r && r.auto);
    // « Il y a combien de temps », plutôt qu'un nombre de tours qui ne dit rien à personne
    const depuis = r && r.dernierTour ? Math.max(0, Math.round((Date.now() - r.dernierTour) / 1000)) : null;
    const quand = depuis == null ? '' : depuis < 60 ? `il y a ${depuis} s` : `il y a ${Math.round(depuis / 60)} min`;
    const surveille = r && r.actif ? (quand ? `surveillé, regardé ${quand}` : 'surveillé') : 'surveillance arrêtée';
    const resume = $('receptionResume');
    if (resume && r) resume.textContent = `— le copieur dépose dans ${r.depot || '?'} · ${surveille}`;
    const info = $('receptionInfo');
    if (info && r) {
      info.innerHTML = `Poste <b>${escapeHtml(r.poste || '')}</b> · dossier ${escapeHtml(surveille)} · ` +
        `${plur(r.traites || 0, 'scan lu', 'scans lus')} depuis l'ouverture${r.erreurs ? ` · <span style="color:var(--err)">${plur(r.erreurs, 'dossier injoignable', 'dossiers injoignables')} (réseau ?)</span>` : ''}`;
    }
    rendreARevoir(r);
  }

  /**
   * Les scans qui n'ont pas pu être lus : un compteur gris « 1 à revoir », sans raison ni chemin,
   * ne permettait rien. On dit lequel, pourquoi, et où il se trouve — le fichier n'est jamais
   * détruit, il attend dans « à revoir » à côté d'une note qui redit la raison.
   */
  function rendreARevoir(r) {
    const box = $('receptionRevoir');
    if (!box) return;
    const liste = (r && r.aRevoir) || [];
    if (!liste.length) { box.innerHTML = ''; return; }
    const depot = r.depot || '';
    const lignes = liste.slice(-8).reverse().map((x) => `<li><b>${escapeHtml(x.nom)}</b> : ${escapeHtml(x.raison)}` +
      (x.dossier && x.dossier !== depot ? ` <span class="legend">(dans ${escapeHtml(x.dossier)}\\à revoir)</span>` : '') + '</li>').join('');
    const dansLeDepot = liste.some((x) => !x.dossier || x.dossier === depot);
    box.innerHTML = `<div class="notice warn">${liste.length > 1 ? `${liste.length} scans n'ont pas pu être lus` : 'Un scan n\'a pas pu être lu'} : ` +
      `${liste.length > 1 ? 'ils attendent' : 'il attend'} dans le dossier « à revoir », rien n'est perdu. Rescannez la pile, ou ouvrez le fichier pour voir ce qui cloche.<ul>${lignes}</ul>` +
      (dansLeDepot && S && S.ouvrirClassement ? '<button type="button" class="small" data-ouvrir-revoir="1">Ouvrir le dossier « à revoir »</button>' : '') + '</div>';
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
    const ra = ev.target.closest('[data-rattacher]');
    if (ra) { rattacher(ra.dataset.rattacher); return; }
    const li = ev.target.closest('[data-lire]');
    if (li) { lireCommeFiche(li.dataset.lire); return; }
    const e = ev.target.closest('[data-ecarter]');
    if (e) { ecarter(e.dataset.ecarter); }
  });
  // Entrée dans le champ du n° vaut « Joindre à cette pièce »
  hote.addEventListener('keydown', (ev) => {
    const champ = ev.target.closest && ev.target.closest('input[data-ratt-no]');
    if (champ && ev.key === 'Enter') { ev.preventDefault(); rattacher(champ.dataset.rattNo); }
  });
  if ($('receptionGroupe')) $('receptionGroupe').addEventListener('click', (ev) => { if (ev.target.closest('[data-joindre-tout]')) joindreTout(); });
  // Le dossier « à revoir » du dépôt de l'application. Le dépôt est le dossier « Scans » des données
  // (main.js, DEPOT) : on l'ouvre par le même chemin que le bac des décomptes, qui refuse tout ce
  // qui sortirait des données. Le dossier de réception interne n'est plus proposé : on n'a rien à
  // y faire à la main, et y toucher abîme ce qui attend une validation.
  if ($('receptionRevoir')) $('receptionRevoir').addEventListener('click', (ev) => { if (ev.target.closest('[data-ouvrir-revoir]') && S) S.ouvrirClassement('Scans/à revoir'); });

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
  if ($('btnOuvrirDecomptes2')) $('btnOuvrirDecomptes2').addEventListener('click', () => S.ouvrirClassement());
  if ($('decomptesListe')) {
    $('decomptesListe').addEventListener('click', (ev) => {
      const f = ev.target.closest('[data-fait]');
      if (f) { marquerFait(f.dataset.fait); return; }
      const v = ev.target.closest('[data-voir-piece]');
      if (v) voirPiece(v.dataset.voirPiece);
    });
  }
  if ($('btnDepotOuvrir')) $('btnDepotOuvrir').addEventListener('click', () => S.ouvrirDepot());
  if ($('btnDepotCopier')) {
    $('btnDepotCopier').addEventListener('click', async () => {
      const chemin = (etat.reglages && etat.reglages.depot) || '';
      if (!chemin) return;
      try {
        await navigator.clipboard.writeText(chemin);
        majBandeau('Adresse copiée. Collez-la dans le réglage « numériser vers un dossier » du copieur.');
      } catch (e) {
        // presse-papiers refusé : on sélectionne le texte, il reste copiable à la main
        const el = $('receptionDepot');
        if (el) { const r = document.createRange(); r.selectNodeContents(el); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); }
        majBandeau('Adresse sélectionnée : copiez-la avec Ctrl+C.', 'warn');
      }
    });
  }
  if ($('btnReceptionFermer')) $('btnReceptionFermer').addEventListener('click', () => $('receptionApercu').classList.add('hidden'));

  /* ---------------- Démarrage ---------------- */

  if (!S) {
    // Fichier HTML seul, hors de l'application fenêtrée : pas de dossier à surveiller. Il disait
    // « déposez les PDF dans Pièces scannées », où des fiches signées ne sont jointes à rien.
    hote.innerHTML = '<div class="dvide">La surveillance du dossier du copieur demande l\'application Windows <b>Compta Blonay</b>. ' +
      'Dans ce fichier HTML seul, déposez le PDF de vos fiches signées dans « Pièces scannées » : il les reconnaît à leur code et propose de les joindre à leurs pièces.</div>';
    for (const id of ['receptionReglages', 'btnScanRegarder', 'btnOuvrirDecomptes2']) { const x = $(id); if (x) x.classList.add('hidden'); }
    // les décomptes à faire se lisent dans le registre : ils ont leur place ici aussi
    document.addEventListener('caisse:registre', () => rendreDecomptes());
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

  window.CaisseReception = { depouiller, joindre, accueillir, rafraichir, majReglages, rendreDecomptes, decomptesAFaire, marquerFait };
})();
