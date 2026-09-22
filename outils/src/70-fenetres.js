  // =====================================================================
  //  Dialog framework
  // =====================================================================
  let openDlg = null;
  function dialog(o) {
    if (openDlg) openDlg.close();
    const scrim = document.createElement('div');
    scrim.className = 'scrim';
    const dlg = document.createElement('div');
    dlg.className = 'dialog' + (o.wide ? ' wide' : '') + (o.libre ? ' libre' : '');
    dlg.setAttribute('role', 'dialog');
    // Une boîte « libre » n'est pas modale : on lit le document derrière, et le
    // clavier doit pouvoir en sortir. Une vraie boîte, elle, retient le focus.
    if (!o.libre) dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('aria-label', o.title);

    const head = document.createElement('div'); head.className = 'dlg-head';
    if (o.icon) { const ic = icon(o.icon); ic.classList.add('ic'); head.appendChild(ic); }
    const h2 = document.createElement('h2'); h2.textContent = o.title;
    const x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.title = 'Fermer'; x.setAttribute('aria-label', 'Fermer');
    x.appendChild(icon(IC.x, { sw: 1.8 }));
    head.append(h2, x);

    const body = document.createElement('div'); body.className = 'dlg-body';
    const foot = document.createElement('div'); foot.className = 'dlg-foot';
    dlg.append(head, body, foot);
    scrim.appendChild(dlg);
    // Une boîte « libre » flotte à côté du document, sans voile : on
    // continue à lire, à défiler, à cliquer pendant qu'elle est ouverte.
    const conteneur = o.libre ? dlg : scrim;

    // Où rendre le clavier en refermant : là où l'utilisateur l'avait laissé.
    const revenirA = document.activeElement;
    const close = () => {
      conteneur.remove();
      document.removeEventListener('keydown', onKey, true);
      openDlg = null;
      try { if (revenirA && revenirA.focus && document.contains(revenirA)) revenirA.focus(); } catch (_) {}
      if (o.onClose) o.onClose();
    };
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); }
      else if (e.key === 'Enter' && o.submitOnEnter !== false) {
        const t = e.target;
        if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON' || t.tagName === 'SELECT')) return;
        const prim = foot.querySelector('.primary');
        if (prim && !prim.disabled) { e.preventDefault(); prim.click(); }
      }
      else if (e.key === 'Tab' && !o.libre) {
        // Tab tourne dans la boîte : sans cela le clavier part parcourir le
        // document derrière, sans moyen visible de revenir.
        const cibles = Array.from(dlg.querySelectorAll('a[href], button:not(:disabled), input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'))
          .filter(n => n === document.activeElement || (n.offsetWidth > 0 || n.offsetHeight > 0));
        if (!cibles.length) return;
        const premier = cibles[0], dernier = cibles[cibles.length - 1];
        if (!dlg.contains(document.activeElement)) { e.preventDefault(); premier.focus(); }
        else if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
        else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
      }
    }
    x.addEventListener('click', close);
    scrim.addEventListener('mousedown', e => { if (e.target === scrim) close(); });
    document.addEventListener('keydown', onKey, true);

    const api = { close, body, foot, dlg };
    if (o.build) o.build(body, api);
    const left = document.createElement('span'); left.className = 'grow';
    foot.appendChild(left);
    (o.actions || [{ label: 'Fermer', primary: true, onClick: close }]).forEach(a => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tb-btn' + (a.primary ? ' primary' : '');
      b.textContent = a.label;
      if (a.id) b.id = a.id;
      b.addEventListener('click', () => a.onClick(close, api));
      foot.appendChild(b);
    });
    $('#modal-root').appendChild(conteneur);
    openDlg = api;
    const first = dlg.querySelector('input:not([type=hidden]), select, textarea, button.primary');
    if (first) setTimeout(() => { try { first.focus(); if (first.select) first.select(); } catch (_) {} }, 30);
    return api;
  }

  function field(label, node, hint) {
    const f = document.createElement('div'); f.className = 'field';
    if (label) { const l = document.createElement('label'); l.textContent = label; if (node.id) l.htmlFor = node.id; f.appendChild(l); }
    f.appendChild(node);
    if (hint) { const h = document.createElement('div'); h.className = 'hint'; h.textContent = hint; f.appendChild(h); }
    return f;
  }
  function input(id, type, value, attrs) {
    const i = document.createElement('input');
    i.type = type || 'text'; i.id = id; i.value = value == null ? '' : value;
    i.autocomplete = 'off';
    Object.assign(i, attrs || {});
    return i;
  }
  function select(id, options, value) {
    const s = document.createElement('select'); s.id = id;
    options.forEach(o => {
      const op = document.createElement('option');
      op.value = o[0]; op.textContent = o[1];
      if (String(o[0]) === String(value)) op.selected = true;
      s.appendChild(op);
    });
    return s;
  }
  function checkbox(id, label, checked) {
    const w = document.createElement('label'); w.className = 'check-row'; w.htmlFor = id;
    const i = document.createElement('input'); i.type = 'checkbox'; i.id = id; i.checked = !!checked;
    const s = document.createElement('span'); s.textContent = label;
    w.append(i, s);
    w.input = i;
    return w;
  }
  function segmented(id, options, value, onChange) {
    const w = document.createElement('div'); w.className = 'seg'; w.id = id;
    w.value = value;
    options.forEach(o => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = o[1]; b.dataset.value = o[0];
      b.setAttribute('aria-pressed', String(o[0]) === String(value) ? 'true' : 'false');
      b.addEventListener('click', () => {
        w.value = o[0];
        Array.from(w.children).forEach(c => c.setAttribute('aria-pressed', c === b ? 'true' : 'false'));
        if (onChange) onChange(o[0]);
      });
      w.appendChild(b);
    });
    return w;
  }
  // Un seul élément ou une liste : les deux se posent.
  const enListe = nodes => (Array.isArray(nodes) ? nodes : [nodes]).filter(Boolean);
  function rowOf(nodes, tight) {
    const r = document.createElement('div'); r.className = 'row' + (tight ? ' tight' : '');
    enListe(nodes).forEach(n => r.appendChild(n));
    return r;
  }
  function groupOf(legend, nodes) {
    const f = document.createElement('fieldset'); f.className = 'group';
    const l = document.createElement('legend'); l.textContent = legend;
    f.appendChild(l);
    enListe(nodes).forEach(n => f.appendChild(n));
    return f;
  }
  function note(text, kind) {
    const p = document.createElement('p');
    p.className = 'dlg-note' + (kind ? ' ' + kind : '');
    p.textContent = text;
    return p;
  }

  function askPassword(name, retry) {
    return new Promise(res => {
      let done = false;
      const pw = input('dlg-pw', 'password', '');
      dialog({
        title: 'Document protégé',
        icon: IC.lock,
        build: b => {
          b.append(note((retry ? 'Mot de passe incorrect. ' : '') + '« ' + name + ' » demande un mot de passe pour être ouvert.', retry ? 'warn' : null));
          b.append(field('Mot de passe', pw));
        },
        onClose: () => { if (!done) res(null); },
        actions: [
          { label: 'Annuler', onClick: close => close() },
          { label: 'Ouvrir', primary: true, onClick: close => { done = true; res(pw.value); close(); } },
        ],
      });
    });
  }

