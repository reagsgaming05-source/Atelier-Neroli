  // =====================================================================
  //  Small helpers
  // =====================================================================
  let toastTimer = null;
  function toast(msg, kind) {
    // Une erreur s'annonce tout de suite (alert), le reste attend qu'on ait fini de parler (status).
    el.toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    el.toast.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite');
    el.toast.textContent = msg;
    el.toast.className = 'toast show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), kind === 'error' ? 7000 : 3600);
  }
  function setLast(text) {
    if (state.busy) { state.messageBusy = text || ''; return; }
    el.last.textContent = text || '';
  }
  const plural = (n, one, many) => formaterNombre(n) + ' ' + (traduction && langue !== 'fr' ? traduction.pluriel(n, one, many, langue) : (n > 1 ? many : one));
  // Les nombres à la suisse, dans les deux langues : l'apostrophe des milliers, le point décimal — « 1’250’000.50 ». Une seule fonction,
  // pour que « 1 250 pages » ne s'écrive pas d'une façon ici et d'une autre dans un document.
  function formaterNombre(n, decimales) {
    if (typeof n !== 'number' || !isFinite(n)) return String(n);
    const d = decimales == null ? (Number.isInteger(n) ? 0 : 1) : decimales;
    const [entier, frac] = Math.abs(n).toFixed(d).split('.');
    return (n < 0 ? '-' : '') + entier.replace(/\B(?=(\d{3})+(?!\d))/g, '\u2019') + (frac ? '.' + frac : '');
  }
  const dureeTexte = s => s < 60 ? Math.max(1, Math.round(s)) + ' s' : Math.floor(s / 60) + ' min' + (Math.round(s % 60) ? ' ' + pad(Math.round(s % 60), 2) + ' s' : '');
  function fmtSize(bytes) {
    if (bytes < 1024) return formaterNombre(bytes) + ' o';
    if (bytes < 1024 * 1024) return formaterNombre(Math.round(bytes / 1024)) + ' Ko';
    return formaterNombre(bytes / (1024 * 1024), 1) + ' Mo';
  }
  const baseName = n => n.replace(/\.[a-z0-9]+$/i, '');
  // Le suffixe que prennent les documents modifiés (« rapport-modifié »), dans l'une ou l'autre langue.
  const SUFFIXE_MODIFIE = /-(modifi[eé]|ge(ä|ae)ndert)$/i;
  function safeBase(name) {
    const n = (name || '').trim().replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
    return n || 'document';
  }
  function clampInt(v, lo, hi) {
    const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10);
    if (Number.isNaN(n)) return null;
    return Math.min(hi, Math.max(lo, n));
  }
  function pad(n, w) { return String(n).padStart(w, '0'); }
  // La date à la suisse, dans les deux langues et dans les documents produits : « 31.12.2026 ».
  function formaterDate(d) { return pad(d.getDate(), 2) + '.' + pad(d.getMonth() + 1, 2) + '.' + d.getFullYear(); }
  const todayStr = () => formaterDate(new Date());
  // Le bouton dont le clic vient de lancer l'opération prend l'état « occupé » le temps qu'elle dure : un disque
  // à la place de son icône, au bout du curseur, plutôt qu'un seul signe de vie en bas à gauche de la fenêtre.
  function marquerOccupe(on) {
    if (on) {
      const d = state.dernierClic;
      const b = d && d.bouton && d.bouton.isConnected && performance.now() - d.t < 1500 ? d.bouton : null;
      state.boutonOccupe = b;
      if (b) b.setAttribute('aria-busy', 'true');
    } else if (state.boutonOccupe) {
      state.boutonOccupe.removeAttribute('aria-busy');
      state.boutonOccupe = null;
    }
  }
  function setBusy(text, pct, o) {
    const etait = state.busy;
    if (text && !state.busy) state.messageBusy = '';
    state.busy = !!text;
    if (text && !etait) marquerOccupe(true); else if (!text) marquerOccupe(false);
    if (!text) annulable(false); else if (o && o.annuler) annulable(true);
    if (text) {
      el.last.replaceChildren();
      const sp = document.createElement('span'); sp.className = 'spinner';
      const tx = document.createElement('span'); tx.textContent = text;
      el.last.append(sp, tx);
    } else {
      // Le message posé pendant le travail prend la place du sablier.
      el.last.textContent = state.messageBusy || '';
      state.messageBusy = '';
    }
    el.progress.hidden = !(text && typeof pct === 'number');
    if (text && typeof pct === 'number') {
      el.progressBar.style.width = Math.round(pct * 100) + '%';
      el.progress.setAttribute('aria-valuenow', String(Math.round(pct * 100)));
      el.progress.setAttribute('aria-valuetext', text + ' : ' + Math.round(pct * 100) + ' %');
    }
    vue.syncButtons();
  }
  const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
  // @debut-cadence
  // Rendre la main à l'interface sur un budget de temps, non sur un nombre de pages : une page de texte se traite
  // en 10 ms, une page scannée en 500, et « toutes les quatre pages » ne protège de rien. On prend une cadence
  // avant la boucle, on l'appelle à chaque tour : elle ne laisse la main (un rendu d'image) que si le budget est
  // dépassé, et prévient d'abord l'appelant (`avant`) pour qu'il puisse écrire où il en est — un message écrit
  // sans que la main soit rendue ne se peint jamais.
  function cadence(budgetMs, maintenant, rendre) {
    const max = budgetMs > 0 ? budgetMs : 16;
    const horloge = maintenant || (() => performance.now());
    const passer = rendre || nextFrame;
    let debut = horloge();
    return async (avant) => {
      if (horloge() - debut < max) return false;
      if (avant) avant();
      await passer();
      debut = horloge();
      return true;
    };
  }
  // @fin-cadence

  // Le journal de la session : tout ce qui n'a pas marché comme prévu, ou
  // qui a été fait autrement (une correction posée par-dessus plutôt que
  // réécrite), pour que l'utilisateur sache pourquoi le résultat diffère.
  const journal = [];
  function signaler(contexte, e, niveau) {
    const msg = e && e.message ? e.message : String(e == null ? '' : e);
    // La même chose répétée (un stockage refusé à chaque réglage) ne remplit pas
    // le journal : une ligne, et le nombre de fois.
    const niv = niveau || 'avert';
    const deja = journal.find(j => j.contexte === contexte && j.msg === msg && j.niveau === niv);
    if (deja) { deja.fois = (deja.fois || 1) + 1; deja.quand = new Date(); }
    else journal.push({ quand: new Date(), contexte, msg, niveau: niv, fois: 1 });
    if (journal.length > 400) journal.shift();
    if (niveau === 'erreur') console.error(contexte + ' :', e); else if (niveau !== 'info') console.warn(contexte + ' :', e);
    majJournal();
  }
  // Quand une opération échoue, la personne lit une phrase française qui dit ce qui s'est passé, ce qu'elle peut faire et une référence
  // à citer au support — jamais le message brut de la bibliothèque (en anglais, sans issue : « This method should not be called. »),
  // qui va au journal, sous la même référence. `quoi` : « L'archivage », « La signature »…
  const CAUSES_ECHEC = [
    ['MEM', /out of memory|allocation failed|array buffer allocation|invalid (typed )?array length|maximum call stack|RangeError/i,
      'la mémoire de ce poste ne suffit pas pour ce document', 'Fermez les autres documents ou traitez moins de pages à la fois, puis recommencez.'],
    ['MDP', /password|encrypt|decrypt|crypt/i,
      'le document est protégé par un mot de passe', 'Rouvrez-le en donnant le mot de passe, puis recommencez.'],
    ['FICHIER', /invalid pdf|no pdf header|xref|trailer|unexpected end|failed to parse|corrupt|malformed|invalid object|unable to parse|bad (ref|object)|stream/i,
      'le fichier est incomplet ou abîmé', 'Rouvrez-le depuis son origine, ou réparez-le avec l\'application qui l\'a produit.'],
    ['DISQUE', /ENOSPC|no space|quota|disk full|EBUSY|EACCES|EPERM|permission|read-only|locked/i,
      'l\'écriture a été refusée (disque plein, fichier tenu par un autre programme ou droits manquants)', 'Choisissez un autre dossier, fermez le fichier s\'il est ouvert ailleurs, puis recommencez.'],
    ['COMPOSANT', /failed to fetch|network|load failed|importScripts|worker|wasm|WebAssembly/i,
      'un composant du logiciel n\'a pas pu être chargé', 'Fermez puis rouvrez l\'application, et recommencez.'],
    ['POLICE', /font|glyph|encoding|cmap|WinAnsi/i,
      'une police du document n\'a pas pu être lue ou écrite', 'Recommencez avec « Convertir en images » si l\'outil le propose, ou avec une autre police.'],
  ];
  // La cause d'un échec, dite en français, avec sa référence : { code, cause, action }.
  function analyserEchec(e) {
    const brut = e && e.message ? e.message : String(e == null ? '' : e);
    let cat = ['INCONNU', null, 'la cause n\'a pas pu être identifiée', 'Recommencez ; si cela se reproduit, joignez le rapport de diagnostic à votre demande d\'aide (Aide › Rapport de diagnostic pour le support…).'];
    for (const c of CAUSES_ECHEC) if (c[1].test(brut)) { cat = c; break; }
    return { code: 'E-' + cat[0], cause: tr(cat[2]), action: tr(cat[3]) };
  }
  function messageDEchec(quoi, e) {
    const a = analyserEchec(e);
    signaler(quoi + ' — échec [' + a.code + ']', e, 'erreur');
    return tr(quoi) + tr(' n\'a pas abouti : ') + a.cause + '. ' + a.action + ' [' + a.code + ']';
  }
  // Le journal de la session pour le rapport de diagnostic de l'application de bureau : des
  // copies, jamais l'objet vivant. Le rapport le nettoie avant de le montrer (desktop/diagnostic.js).
  window.aktumDiagnostic = () => journal.map(j => ({ quand: j.quand.getTime(), niveau: j.niveau, contexte: j.contexte, msg: j.msg, fois: j.fois || 1 }));
  // Les réglages que l'on refait à chaque document (le texte d'un filigrane, la
  // forme d'une numérotation) : gardés dans ce poste, jamais envoyés ailleurs.
  // Une valeur illisible ou d'une autre forme est ignorée, jamais fatale.
  function reglageLire(nom) {
    try {
      const v = JSON.parse(localStorage.getItem('aktum-reglage-' + nom) || 'null');
      return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
    } catch (e) { signaler('Réglage mémorisé (' + nom + ')', e, 'info'); return null; }
  }
  function reglageEcrire(nom, valeur) {
    try {
      if (valeur == null) localStorage.removeItem('aktum-reglage-' + nom);
      else localStorage.setItem('aktum-reglage-' + nom, JSON.stringify(valeur));
    } catch (e) { signaler('Réglage mémorisé (' + nom + ')', e, 'info'); }
  }
  // Le nombre d'avis qui comptent (hors information), répétitions comprises : de
  // quoi savoir si une opération en a ajouté, même un avis déjà vu.
  const avisGraves = () => journal.reduce((t, j) => (j.niveau !== 'info' ? t + (j.fois || 1) : t), 0);
  function majJournal() {
    if (!el.btnJournal) return;
    // Le même compte partout : chaque signalement, répétitions comprises (un avertissement répété quatre fois est quatre signalements).
    const n = journal.reduce((t, j) => t + (j.fois || 1), 0);
    const graves = avisGraves();
    el.btnJournal.hidden = !journal.length;
    el.btnJournal.querySelector('.n').textContent = n;
    el.btnJournal.classList.toggle('grave', graves > 0);
    el.btnJournal.title = tr('Journal de la session') + ' : ' + plural(n, 'signalement', 'signalements') + (graves ? ' (' + graves + ' ' + tr('à vérifier') + ')' : '');
  }

  // Une opération longue s'interrompt d'un clic : chaque boucle regarde si
  // l'arrêt a été demandé entre deux pages ou deux fichiers.
  const annulation = { demande: false, actif: false };
  class Annule extends Error { constructor() { super('Opération annulée'); this.annule = true; } }
  function annulable(oui) {
    const etaitActif = annulation.actif;
    annulation.actif = !!oui;
    // Réactiver le bouton alors qu'il l'est déjà ne doit PAS effacer une demande
    // d'arrêt : chaque setBusy(…, { annuler: true }) passe ici, et le journal du
    // moteur de reconnaissance en émet plusieurs par page — la demande était
    // effacée dans la milliseconde, et l'arrêt n'avait aucun effet.
    if (oui && etaitActif) return;
    annulation.demande = false;
    if (!el.btnAnnulerOp) return;
    el.btnAnnulerOp.hidden = !oui; el.btnAnnulerOp.disabled = false; el.btnAnnulerOp.textContent = 'Annuler';
  }
  function demanderAnnulation() {
    if (!annulation.actif) return;
    annulation.demande = true;
    if (el.btnAnnulerOp) { el.btnAnnulerOp.disabled = true; el.btnAnnulerOp.textContent = 'Arrêt…'; }
  }
  const annulationDemandee = () => annulation.actif && annulation.demande;

  // « Répéter la dernière opération » (Ctrl+Maj+Y) : la dernière opération faite sur des pages (pivoter, supprimer, dupliquer) ou le
  // dernier réglage posé (filigrane, en-tête et pied de page) se rejoue — sur la sélection du moment pour les pages, sur le document
  // ouvert pour un réglage, qui peut être un autre document que celui où l'on vient de le poser.
  const derniereOperation = { libelle: '', rejouer: null };
  function retenirOperation(libelle, rejouer) { derniereOperation.libelle = libelle; derniereOperation.rejouer = rejouer; }
  function repeterOperation() {
    if (!derniereOperation.rejouer) { toast('Aucune opération à répéter : faites d\'abord une opération sur des pages, ou posez un filigrane ou un en-tête.', 'warn'); return; }
    if (state.busy || !state.pages.length) return;
    const libelle = derniereOperation.libelle;
    if (derniereOperation.rejouer() === false) return;
    toast(tr('Répété : {0}').replace('{0}', libelle));
  }
  function verifierAnnulation() { if (annulationDemandee()) { annulation.demande = false; throw new Annule(); } }

  // Colors ------------------------------------------------------------
  function hexToRgb01(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#000000');
    if (!m) return { r: 0, g: 0, b: 0 };
    return { r: parseInt(m[1], 16) / 255, g: parseInt(m[2], 16) / 255, b: parseInt(m[3], 16) / 255 };
  }
  function pdfColor(hex) { const c = hexToRgb01(hex); return PDFLib.rgb(c.r, c.g, c.b); }

  // WinAnsi-safe text for the standard PDF fonts ----------------------
  // Les polices standard d'un PDF savent écrire tout le jeu WinAnsi, et la
  // ponctuation typographique en fait partie : l'apostrophe courbe, les
  // guillemets, le tiret cadratin, les points de suspension. Les remplacer
  // par leur approximation ASCII abîmait le texte pour rien.
  // Comment le logiciel écrit le texte dans un document : polices standard (WinAnsi), ou polices incorporées
  // quand la page en demande (voir 49-unicode.js, qui le pilote).
  const ecriture = { unicode: false, actifs: 0, couverture: null };
  const WINANSI_SUP = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
  const CHAR_MAP = { ' ': ' ', ' ': ' ', ' ': ' ', '‑': '-', '−': '-', '­': '' };
  // Les caractères que les polices standard ne savent pas écrire, relevés au
  // fil de l'assemblage : « ć » dans « Milošević » sortait « Miloševi? », sans
  // un mot. On les garde avec le mot où ils figurent, pour le dire avant d'écrire.
  const pertesCaracteres = new Map();
  const oublierPertes = () => pertesCaracteres.clear();
  function noterPerte(ch, texte) {
    if (pertesCaracteres.has(ch)) return;
    const mot = (String(texte).split(/[\s\n]+/).find(m => m.indexOf(ch) >= 0) || '').slice(0, 40);
    pertesCaracteres.set(ch, mot);
  }
  const hors = ch => {
    const c = ch.codePointAt(0);
    if (ecriture.unicode && ecriture.couverture) return c > 255 && !ecriture.couverture.has(c) && CHAR_MAP[ch] === undefined;
    return c > 255 && WINANSI_SUP.indexOf(ch) < 0 && CHAR_MAP[ch] === undefined;
  };
  // Pour les valeurs que pdf-lib écrit lui-même (champs de formulaire).
  function releverHorsWinAnsi(texte) { for (const ch of String(texte == null ? '' : texte)) if (hors(ch)) noterPerte(ch, texte); }
  function winAnsi(s) {
    let out = '';
    for (const ch of String(s == null ? '' : s)) {
      if (CHAR_MAP[ch] !== undefined) { out += CHAR_MAP[ch]; continue; }
      const c = ch.codePointAt(0);
      if (c === 9) { out += '    '; continue; }
      if (c < 32) { out += ch === '\n' ? '\n' : ' '; continue; }
      // 0x7F à 0x9F : des codes de commande, que WinAnsi ne porte pas.
      if (c >= 0x7f && c <= 0x9f) { out += ' '; continue; }
      // Polices incorporées : tout ce qu'elles couvrent s'écrit tel quel.
      if (ecriture.unicode && ecriture.couverture) {
        if (c > 255 && !ecriture.couverture.has(c)) { noterPerte(ch, s); out += '?'; } else out += ch;
        continue;
      }
      if (c > 255 && WINANSI_SUP.indexOf(ch) < 0) noterPerte(ch, s);
      out += (c <= 255 || WINANSI_SUP.indexOf(ch) >= 0) ? ch : '?';
    }
    return out;
  }

  async function copierTexte(t) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(t); return true; } } catch (e) { signaler('Presse-papiers', e, 'info'); }
    try {
      const ta = document.createElement('textarea');
      ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (_) { return false; }
  }

  // Les chemins : le nom d'un fichier, et le fichier que « Enregistrer » réécrirait (voir 60-livraison.js).
  const nomDe = chemin => String(chemin || '').replace(/^.*[\\/]/, '');

  // Le fichier visé : celui du dernier enregistrement, sinon celui d'où vient
  // le document — s'il vient d'un seul fichier. Un document assemblé à partir
  // de plusieurs n'a pas de fichier à réécrire : ce sera « Enregistrer sous ».
  function cheminDocument() {
    if (state.chemin) return state.chemin;
    const reels = state.sources.filter(s => !s.isSample && !s.genere);
    return reels.length === 1 && reels[0].chemin ? reels[0].chemin : '';
  }
