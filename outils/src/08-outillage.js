  // =====================================================================
  //  Small helpers
  // =====================================================================
  let toastTimer = null;
  function toast(msg, kind) {
    el.toast.textContent = msg;
    el.toast.className = 'toast show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), kind === 'error' ? 7000 : 3600);
  }
  function setLast(text) {
    if (state.busy) { state.messageBusy = text || ''; return; }
    el.last.textContent = text || '';
  }
  const plural = (n, one, many) => n + ' ' + (n > 1 ? many : one);
  const dureeTexte = s => s < 60 ? Math.max(1, Math.round(s)) + ' s' : Math.floor(s / 60) + ' min' + (Math.round(s % 60) ? ' ' + pad(Math.round(s % 60), 2) + ' s' : '');
  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',') + ' Mo';
  }
  const baseName = n => n.replace(/\.[a-z0-9]+$/i, '');
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
  function todayStr() {
    const d = new Date();
    return pad(d.getDate(), 2) + '/' + pad(d.getMonth() + 1, 2) + '/' + d.getFullYear();
  }
  function setBusy(text, pct, o) {
    if (text && !state.busy) state.messageBusy = '';
    state.busy = !!text;
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
    if (text && typeof pct === 'number') el.progressBar.style.width = Math.round(pct * 100) + '%';
    syncButtons();
  }
  const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));

  // Le journal de la session : tout ce qui n'a pas marché comme prévu, ou
  // qui a été fait autrement (une correction posée par-dessus plutôt que
  // réécrite), pour que l'utilisateur sache pourquoi le résultat diffère.
  const journal = [];
  function signaler(contexte, e, niveau) {
    const msg = e && e.message ? e.message : String(e == null ? '' : e);
    journal.push({ quand: new Date(), contexte, msg, niveau: niveau || 'avert' });
    if (journal.length > 400) journal.shift();
    if (niveau === 'erreur') console.error(contexte + ' :', e); else if (niveau !== 'info') console.warn(contexte + ' :', e);
    majJournal();
  }
  function majJournal() {
    if (!el.btnJournal) return;
    const n = journal.length;
    const graves = journal.filter(j => j.niveau !== 'info').length;
    el.btnJournal.hidden = !n;
    el.btnJournal.querySelector('.n').textContent = n;
    el.btnJournal.classList.toggle('grave', graves > 0);
    el.btnJournal.title = plural(n, 'avis', 'avis') + ' dans le journal de la session' + (graves ? ', dont ' + plural(graves, 'avertissement', 'avertissements') : '');
  }
  function toolJournal() {
    const liste = document.createElement('div'); liste.className = 'list journal';
    const remplir = () => {
      liste.replaceChildren();
      if (!journal.length) { liste.appendChild(note('Rien à signaler.')); return; }
      journal.slice().reverse().forEach(j => {
        const d = document.createElement('div'); d.className = 'list-item avis-' + j.niveau;
        const q = document.createElement('span'); q.className = 'quand'; q.textContent = pad(j.quand.getHours(), 2) + ':' + pad(j.quand.getMinutes(), 2) + ':' + pad(j.quand.getSeconds(), 2);
        const g = document.createElement('div'); g.className = 'g';
        const c = document.createElement('div'); c.className = 'n'; c.textContent = j.contexte;
        const m = document.createElement('div'); m.className = 's'; m.textContent = j.msg;
        g.append(c, m);
        d.append(q, g);
        liste.appendChild(d);
      });
    };
    remplir();
    dialog({
      title: 'Journal de la session', icon: IC.info, wide: true,
      build: b => {
        b.append(note('Ce qui n\'a pas marché comme prévu, ou qui a été fait autrement. Rien de tout cela ne quitte cet ordinateur.'));
        b.append(liste);
      },
      actions: [
        { label: 'Copier', onClick: async () => { const t = journal.map(j => j.quand.toISOString() + ' [' + j.niveau + '] ' + j.contexte + ' : ' + j.msg).join('\n'); if (await copierTexte(t)) toast('Journal copié.'); } },
        { label: 'Vider', onClick: () => { journal.length = 0; majJournal(); remplir(); } },
        { label: 'Fermer', primary: true, onClick: c => c() },
      ],
    });
  }

  // Une opération longue s'interrompt d'un clic : chaque boucle regarde si
  // l'arrêt a été demandé entre deux pages ou deux fichiers.
  const annulation = { demande: false, actif: false };
  class Annule extends Error { constructor() { super('Opération annulée'); this.annule = true; } }
  function annulable(oui) {
    annulation.actif = !!oui; annulation.demande = false;
    if (!el.btnAnnulerOp) return;
    el.btnAnnulerOp.hidden = !oui; el.btnAnnulerOp.disabled = false; el.btnAnnulerOp.textContent = 'Annuler';
  }
  function demanderAnnulation() {
    if (!annulation.actif) return;
    annulation.demande = true;
    if (el.btnAnnulerOp) { el.btnAnnulerOp.disabled = true; el.btnAnnulerOp.textContent = 'Arrêt…'; }
  }
  const annulationDemandee = () => annulation.actif && annulation.demande;
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
  const WINANSI_SUP = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
  const CHAR_MAP = { ' ': ' ', ' ': ' ', ' ': ' ', '‑': '-', '−': '-', '­': '' };
  function winAnsi(s) {
    let out = '';
    for (const ch of String(s == null ? '' : s)) {
      if (CHAR_MAP[ch] !== undefined) { out += CHAR_MAP[ch]; continue; }
      const c = ch.codePointAt(0);
      if (c === 9) { out += '    '; continue; }
      if (c < 32) { out += ch === '\n' ? '\n' : ' '; continue; }
      // 0x7F à 0x9F : des codes de commande, que WinAnsi ne porte pas.
      if (c >= 0x7f && c <= 0x9f) { out += ' '; continue; }
      out += (c <= 255 || WINANSI_SUP.indexOf(ch) >= 0) ? ch : '?';
    }
    return out;
  }

