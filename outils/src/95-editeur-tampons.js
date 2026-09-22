  // =====================================================================
  //  Tampons : Reçu le, Payé, Copie conforme… et les vôtres, mémorisés
  // =====================================================================
  const TAMPONS_BASE = [
    ['Reçu le {date}', '#1D4ED8'], ['Payé le {date}', '#C8102E'], ['Traité le {date}', '#0D7A3F'],
    ['Copie conforme', '#1D4ED8'], ['Visé', '#0D7A3F'], ['Approuvé', '#0D7A3F'], ['Refusé', '#C8102E'],
    ['Confidentiel', '#C8102E'], ['Urgent', '#C8102E'], ['Original', '#1D4ED8'], ['Brouillon', '#6E7681'], ['Pour information', '#6E7681'],
  ];
  const STYLE_TAMPON = { famille: 'Helvetica, Arial, sans-serif', poids: '700', penche: 'normal' };
  function tamponMesure(a) {
    const tw = mesurerTexte(a.text || '', a.size, STYLE_TAMPON);
    a.w = tw + a.size * 1.2;
    a.h = a.size * 1.7;
    return a;
  }
  const tamponTexte = t => String(t || '').replace(/\{date\}/gi, todayStr());
  function tamponsMemo() {
    try { const l = JSON.parse(localStorage.getItem('blonay-tampons') || '[]'); return Array.isArray(l) ? l.filter(t => t && typeof t.text === 'string' && t.text.trim()) : []; } catch (_) { return []; }
  }
  function tamponsEcrire(liste) { try { localStorage.setItem('blonay-tampons', JSON.stringify(liste.slice(0, 40))); } catch (_) {} }
  function tamponMemoriser(t) {
    const liste = tamponsMemo().filter(x => x.text !== t.text);
    liste.unshift({ text: t.text, color: t.color || '#C8102E', size: t.size || 14 });
    tamponsEcrire(liste);
  }
  function edPoserTampon(pt) {
    const m = ed.tampon;
    if (!m) { edTampons(); return; }
    const p = edPage();
    const g = pageGeom(p);
    const a = tamponMesure({ id: -1, type: 'tampon', x: 0, y: 0, w: 0, h: 0, text: tamponTexte(m.text), textModele: m.text, color: m.color, size: m.size });
    a.x = Math.max(0, Math.min(g.Wd - a.w, pt.x - a.w / 2));
    a.y = Math.max(0, Math.min(g.Hd - a.h, pt.y - a.h / 2));
    edCommit(a);
    setLast('Tampon posé : ' + a.text + ' · déplacez-le avec la flèche');
  }
  function edTampons() {
    const grille = document.createElement('div'); grille.className = 'tampons';
    const taille = select('tp-taille', [['10', 'Petit — 10 pt'], ['14', 'Normal — 14 pt'], ['18', 'Grand — 18 pt'], ['24', 'Très grand — 24 pt']], String((ed.tampon && ed.tampon.size) || 14));
    const couleur = select('tp-couleur', [['', 'Couleur du tampon'], ['#C8102E', 'Rouge'], ['#1D4ED8', 'Bleu'], ['#0D7A3F', 'Vert'], ['#111111', 'Noir'], ['#6E7681', 'Gris']], '');
    let api = null;
    const choisir = t => {
      ed.tampon = { text: t.text, color: couleur.value || t.color, size: parseInt(taille.value, 10) || t.size || 14 };
      ed.tool = 'tampon'; ed.sel = null;
      if (api) api.close();
      edSyncTools(); edDrawOverlay();
      setLast('Tampon « ' + tamponTexte(t.text) + ' » : cliquez sur la page pour le poser.');
    };
    const remplir = () => {
      grille.replaceChildren();
      const perso = tamponsMemo();
      const tous = perso.map(t => Object.assign({ perso: true }, t)).concat(TAMPONS_BASE.map(([text, color]) => ({ text, color, size: 14 })));
      tous.forEach(t => {
        const item = document.createElement('div'); item.className = 'tampon-item';
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'tampon-choix'; b.style.color = t.color;
        b.textContent = tamponTexte(t.text);
        b.title = t.perso ? 'Votre tampon' : 'Tampon';
        b.addEventListener('click', () => choisir(t));
        item.appendChild(b);
        if (t.perso) {
          const x = document.createElement('button');
          x.type = 'button'; x.className = 'oubli'; x.title = 'Oublier ce tampon'; x.setAttribute('aria-label', x.title);
          x.appendChild(icon(IC.x, { sw: 2 }));
          x.addEventListener('click', e => { e.stopPropagation(); tamponsEcrire(perso.filter(q => q.text !== t.text)); remplir(); });
          item.appendChild(x);
        }
        grille.appendChild(item);
      });
    };
    remplir();
    const neuf = input('tp-neuf', 'text', '');
    neuf.placeholder = 'Texte du tampon — {date} pour la date du jour';
    const neufCouleur = input('tp-neuf-couleur', 'color', '#C8102E');
    const garder = document.createElement('button');
    garder.type = 'button'; garder.className = 'tb-btn'; garder.style.border = '1px solid var(--trait)';
    garder.textContent = 'Mémoriser';
    garder.addEventListener('click', () => {
      const t = neuf.value.trim();
      if (!t) { toast('Écrivez d\'abord le texte du tampon.', 'warn'); return; }
      tamponMemoriser({ text: t, color: neufCouleur.value, size: parseInt(taille.value, 10) || 14 });
      neuf.value = '';
      remplir();
    });
    const poserNeuf = document.createElement('button');
    poserNeuf.type = 'button'; poserNeuf.className = 'tb-btn primary';
    poserNeuf.textContent = 'Poser sans mémoriser';
    poserNeuf.addEventListener('click', () => {
      const t = neuf.value.trim();
      if (!t) { toast('Écrivez d\'abord le texte du tampon.', 'warn'); return; }
      choisir({ text: t, color: neufCouleur.value, size: parseInt(taille.value, 10) || 14 });
    });
    api = dialog({
      title: 'Poser un tampon', icon: IC.stamp, wide: true, submitOnEnter: false,
      build: b => {
        b.append(rowOf([field('Taille', taille), field('Couleur', couleur)], true));
        b.append(grille);
        b.append(groupOf('Votre tampon', [
          field('Texte', neuf, '{date} est remplacé par la date du jour au moment de poser le tampon.'),
          rowOf([field('Couleur', neufCouleur), garder, poserNeuf], true),
        ]));
        b.append(note('Les tampons mémorisés restent sur cet ordinateur (dossier data/ de l\'application), jamais dans le PDF. Cliquez un tampon puis cliquez sur la page pour le poser.'));
      },
      actions: [{ label: 'Fermer', onClick: c => c() }],
    });
  }

  // Les signatures mémorisées sur cet ordinateur.
  function signaturesMemo() {
    try { const l = JSON.parse(localStorage.getItem('blonay-signatures') || '[]'); return Array.isArray(l) ? l.filter(x => x && typeof x.data === 'string' && x.w > 0 && x.h > 0) : []; } catch (_) { return []; }
  }
  function signaturesEcrire(liste) { try { localStorage.setItem('blonay-signatures', JSON.stringify(liste.slice(0, 6))); } catch (e) { signaler('Signatures', e); } }

  function edSignature() {
    const wrap = document.createElement('div');
    const cv = document.createElement('canvas');
    cv.width = 900; cv.height = 300;
    cv.style.width = '100%'; cv.style.height = 'auto'; cv.style.background = '#fff';
    cv.style.border = '1px dashed var(--trait)'; cv.style.borderRadius = '8px'; cv.style.touchAction = 'none'; cv.style.cursor = 'crosshair';
    const ctx = cv.getContext('2d');
    ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0B2545';
    let drawing = false, any = false;
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * cv.width, y: (e.clientY - r.top) / r.height * cv.height }; };
    cv.addEventListener('pointerdown', e => { drawing = true; any = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); });
    cv.addEventListener('pointerup', () => { drawing = false; });
    wrap.appendChild(cv);
    const colorSel = segmented('sg-color', [['#0B2545', 'Bleu'], ['#111111', 'Noir']], '#0B2545', v => { ctx.strokeStyle = v; });
    const garder = checkbox('sg-garder', 'Mémoriser cette signature sur cet ordinateur', true);
    const memo = document.createElement('div'); memo.className = 'signatures';
    let api = null;
    const remplirMemo = () => {
      memo.replaceChildren();
      const liste = signaturesMemo();
      memo.hidden = !liste.length;
      liste.forEach((sg, i) => {
        const item = document.createElement('div'); item.className = 'signature-item';
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'signature-choix'; b.title = 'Insérer cette signature';
        const im = document.createElement('img'); im.src = sg.data; im.alt = 'Signature mémorisée ' + (i + 1);
        b.appendChild(im);
        b.addEventListener('click', () => { if (api) api.close(); edPlaceImage(sg.data, sg.w, sg.h, 170); setLast('Signature insérée : placez-la où vous voulez.'); });
        const x = document.createElement('button');
        x.type = 'button'; x.className = 'oubli'; x.title = 'Oublier cette signature'; x.setAttribute('aria-label', x.title);
        x.appendChild(icon(IC.x, { sw: 2 }));
        x.addEventListener('click', e => { e.stopPropagation(); signaturesEcrire(liste.filter((_, j) => j !== i)); remplirMemo(); });
        item.append(b, x);
        memo.appendChild(item);
      });
    };
    remplirMemo();
    api = dialog({
      title: 'Signer', icon: IC.pencil, wide: true,
      build: b => {
        if (!memo.hidden) b.append(groupOf('Vos signatures mémorisées — cliquez pour insérer', [memo]));
        b.append(note(memo.hidden ? 'Tracez votre signature avec la souris, le doigt ou le stylet.' : 'Ou tracez-en une nouvelle :'));
        b.append(wrap);
        b.append(rowOf([field('Couleur', colorSel), garder], true));
        b.append(note('Une signature mémorisée reste sur cet ordinateur (dossier data/ de l\'application) ; elle n\'est jamais écrite dans un PDF sans que vous l\'y posiez. Elle y est écrite en clair : sur un poste partagé, mieux vaut la tracer chaque fois plutôt que la mémoriser.', 'warn'));
      },
      actions: [
        { label: 'Effacer', onClick: () => { ctx.clearRect(0, 0, cv.width, cv.height); any = false; } },
        { label: 'Annuler', onClick: c => c() },
        { label: 'Insérer', primary: true, onClick: close => {
          if (!any) { toast('Tracez d\'abord votre signature.', 'warn'); return; }
          const img = ctx.getImageData(0, 0, cv.width, cv.height);
          let minX = cv.width, minY = cv.height, maxX = 0, maxY = 0;
          for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
            if (img.data[(y * cv.width + x) * 4 + 3] > 8) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
          }
          if (maxX <= minX || maxY <= minY) { toast('Tracez d\'abord votre signature.', 'warn'); return; }
          const pad2 = 8;
          minX = Math.max(0, minX - pad2); minY = Math.max(0, minY - pad2);
          maxX = Math.min(cv.width, maxX + pad2); maxY = Math.min(cv.height, maxY + pad2);
          const out = document.createElement('canvas');
          out.width = maxX - minX; out.height = maxY - minY;
          out.getContext('2d').drawImage(cv, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
          const data = out.toDataURL('image/png');
          if (garder.input.checked) signaturesEcrire([{ data, w: out.width, h: out.height, quand: Date.now() }].concat(signaturesMemo().filter(x => x.data !== data)));
          close();
          edPlaceImage(data, out.width, out.height, 170);
          setLast('Signature insérée : placez-la où vous voulez.');
        } },
      ],
    });
  }

  function edSide() {
    if (!ed.side) return;
    const p = edPage();
    ed.side.replaceChildren();
    if (!p) return;
    const sel = p.ann.find(a => a.id === ed.sel);
    const h = document.createElement('h3');
    const enSaisie = !!(ed.saisie && sel && ed.saisie.a === sel);
    h.textContent = sel
      ? (sel.type === 'edit' ? (enSaisie ? 'Correction en cours' : 'Texte corrigé')
        : sel.type === 'champ' ? 'Champ à remplir' : 'Annotation sélectionnée')
      : (ed.tool === 'champ' ? 'Champ à remplir' : 'Style de l\'outil');
    ed.side.appendChild(h);

    const isChamp = sel ? sel.type === 'champ' : ed.tool === 'champ';
    const isEdit = sel ? sel.type === 'edit' : ed.tool === 'edittext';
    const isText = sel ? sel.type === 'text' : ed.tool === 'text';
    const isRect = sel ? (sel.type === 'highlight' || sel.type === 'box' || sel.type === 'redact') : (ed.tool === 'highlight' || ed.tool === 'box' || ed.tool === 'redact');
    const isDraw = sel ? sel.type === 'draw' : ed.tool === 'draw';
    const isImg = sel && sel.type === 'image';
    const isTampon = sel ? sel.type === 'tampon' : ed.tool === 'tampon';
    const texteModifiable = isText || (isEdit && !!sel);

    const change = fn => { if (sel) { snapshot(); state.touched = true; } fn(); edDrawOverlay(true); };

    if (isChamp) { edSideChamp(sel, p, change); return; }
    if (isTampon && sel) {
      const t = input('ed-tampon-texte', 'text', sel.text);
      t.addEventListener('input', () => change(() => { sel.text = t.value; tamponMesure(sel); }));
      const c = input('ed-color', 'color', sel.color);
      c.addEventListener('input', () => change(() => { sel.color = c.value; }));
      const sz = input('ed-size', 'number', Math.round(sel.size * 10) / 10, { min: 6, max: 96, step: 1 });
      sz.addEventListener('change', () => change(() => { sel.size = Math.min(96, Math.max(6, parseFloat(sz.value) || 14)); tamponMesure(sel); }));
      ed.side.append(field('Texte', t), field('Couleur', c), field('Taille (pt)', sz));
      const memo = document.createElement('button');
      memo.type = 'button'; memo.className = 'tb-btn'; memo.style.border = '1px solid var(--trait)'; memo.style.justifyContent = 'center';
      memo.textContent = 'Mémoriser ce tampon';
      memo.addEventListener('click', () => { tamponMemoriser({ text: sel.textModele || sel.text, color: sel.color, size: sel.size }); toast('Tampon mémorisé : vous le retrouverez dans la liste des tampons.'); });
      ed.side.appendChild(memo);
    } else if (isTampon) {
      ed.side.appendChild(note('Cliquez sur la page pour poser le tampon choisi. Pour en choisir un autre, cliquez à nouveau l\'outil Tampon.'));
    }

    if (isEdit && !sel) {
      ed.side.appendChild(note('Cliquez dans un paragraphe encadré : le curseur se pose là où vous avez cliqué et vous écrivez directement sur la page, avec ses polices, son interligne et sa justification d\'origine.'));
    }
    // Une retouche de ligne se regle dans la barre flottante, morceau par
    // morceau ; le panneau n'agit que sur la ligne entiere.
    const retouche = isEdit && !!sel;
    if ((texteModifiable && !retouche) || isDraw || isRect) {
      const cur = sel ? sel.color : (isText || isDraw ? ed.style.textColor : ed.style.color);
      const c = input('ed-color', 'color', cur);
      c.addEventListener('input', () => change(() => {
        if (sel) sel.color = c.value;
        else if (isText || isDraw) ed.style.textColor = c.value;
        else ed.style.color = c.value;
      }));
      ed.side.appendChild(field('Couleur', c));
    }
    if (texteModifiable && !retouche) {
      const s = input('ed-size', 'number', sel ? Math.round(sel.size * 10) / 10 : ed.style.size, { min: 5, max: 96, step: 0.5 });
      s.addEventListener('change', () => change(() => {
        const v = Math.min(96, Math.max(5, parseFloat(s.value) || 14));
        if (sel) { sel.size = v; recalcAnn(sel); } else ed.style.size = v;
      }));
      const f = select('ed-font', [['Helvetica', 'Helvetica'], ['Times', 'Times'], ['Courier', 'Courier']], sel ? sel.font : ed.style.font);
      f.addEventListener('change', () => change(() => {
        if (sel) { sel.font = f.value; recalcAnn(sel); } else ed.style.font = f.value;
      }));
      const bd = checkbox('ed-bold', 'Gras', sel ? sel.bold : ed.style.bold);
      bd.input.addEventListener('change', () => change(() => {
        if (sel) { sel.bold = bd.input.checked; recalcAnn(sel); } else ed.style.bold = bd.input.checked;
      }));
      ed.side.append(field('Taille (pt)', s), field('Police', f), bd);
      if (sel) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'tb-btn'; b.style.border = '1px solid var(--trait)'; b.style.justifyContent = 'center';
        b.textContent = 'Modifier le texte';
        b.addEventListener('click', () => edEditText(sel));
        ed.side.appendChild(b);
      }
    }
    if (retouche) {
      const polices = Array.from(new Set((sel.runs || []).map(r => r.pol && r.pol.lisible).filter(Boolean)));
      const tailles = Array.from(new Set((sel.runs || []).map(r => Math.round(r.size * 10) / 10)));
      const fiche = document.createElement('div'); fiche.className = 'fiche';
      [['Police', polices.join(', ') || 'standard'],
       ['Taille', (tailles.length > 1 ? tailles.join(' / ') : tailles[0]) + ' pt'],
       ['Mise en page', sel.aligne === 'justifie' ? 'justifiée' : 'alignée à gauche']].forEach(kv => {
        const d = document.createElement('span'); d.textContent = kv[0];
        const v = document.createElement('b'); v.textContent = kv[1];
        fiche.append(d, v);
      });
      ed.side.appendChild(fiche);
      if (enSaisie) {
        ed.side.appendChild(note('Écrivez directement sur la page. La barre en haut règle la taille, le gras et la couleur de la partie sélectionnée. Échap valide.'));
      } else {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'tb-btn primary'; b.style.justifyContent = 'center';
        b.textContent = 'Reprendre le texte';
        b.addEventListener('click', () => edEditRuns(sel));
        ed.side.appendChild(b);
      }
      const r = document.createElement('div'); r.className = 'regle';
      ed.side.appendChild(r);
    }
    if (isEdit && sel) {
      const bg = input('ed-bg', 'color', sel.bg || '#FFFFFF');
      // Choisir une couleur à la main remplace le fond relevé : l'un ou
      // l'autre, jamais les deux superposés.
      bg.addEventListener('input', () => change(() => { sel.bg = bg.value; sel.bgImg = null; }));
      ed.side.appendChild(field('Couleur du fond', bg, sel.bgImg
        ? 'Le fond de la page a été recopié tel quel sous le texte. Choisir une couleur ici le remplace par un aplat.'
        : 'Relevée sur la page. À ajuster si le fond n\'est pas uni.'));
      const eff = checkbox('ed-eff', 'Effacer vraiment le texte d\'origine', sel.efface);
      eff.input.addEventListener('change', () => {
        snapshot();
        sel.efface = eff.input.checked;
        state.touched = true;
        edDrawOverlay(); // panneau reconstruit : l'avertissement doit suivre
      });
      ed.side.appendChild(eff);
      ed.side.appendChild(note(sel.efface
        ? 'À l\'export, les lettres d\'origine sous ce bloc sont effacées du fichier ; la page reste du texte, sauf si une image passe dessous.'
        : 'Quand la correction tient dans la place disponible, elle est écrite directement dans la page : le texte d\'origine disparaît pour de bon, sans rectangle. Sinon elle est posée par-dessus, et le texte d\'origine est effacé dessous.',
        sel.efface ? 'warn' : null));
    }
    if (isDraw || (isRect && (sel ? sel.type === 'box' : ed.tool === 'box'))) {
      const w = input('ed-width', 'number', sel ? (sel.width || 2) : ed.style.width, { min: 1, max: 24 });
      w.addEventListener('change', () => change(() => {
        const v = clampInt(w.value, 1, 24) || 2;
        if (sel) sel.width = v; else ed.style.width = v;
      }));
      ed.side.appendChild(field('Épaisseur', w));
    }
    if ((sel && sel.type === 'highlight') || (!sel && ed.tool === 'highlight') || isImg) {
      const cur = sel ? (sel.opacity == null ? 0.35 : sel.opacity) : ed.style.opacity;
      const o = input('ed-op', 'range', Math.round(cur * 100), { min: 5, max: 100 });
      o.addEventListener('input', () => change(() => {
        const v = (clampInt(o.value, 5, 100) || 35) / 100;
        if (sel) sel.opacity = v; else ed.style.opacity = v;
      }));
      ed.side.appendChild(field('Opacité', o));
    }
    if (sel) {
      const pied = document.createElement('div'); pied.className = 'pied';
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'tb-btn danger';
      del.textContent = sel.type === 'edit' ? 'Annuler cette correction' : 'Supprimer';
      del.addEventListener('click', () => {
        edFermerSaisie(true);
        snapshot();
        p.ann = p.ann.filter(a => a.id !== sel.id);
        ed.sel = null; state.touched = true; edDrawOverlay();
      });
      pied.appendChild(del);
      ed.side.appendChild(pied);
    } else if (ed.tool === 'redact') {
      ed.side.appendChild(note('À l\'export, les lettres sous la zone sont effacées du fichier et la page reste du texte. Une image sous la zone fait convertir la page en image.', 'warn'));
    } else if (!isEdit) {
      // Le panneau ne reste jamais vide : il dit ce que fait l'outil choisi.
      const AIDE = {
        select: 'Aucune annotation sélectionnée. Cliquez-en une sur la page pour la déplacer, la redimensionner ou en changer le style.',
        text: 'Cliquez sur la page à l\'endroit où écrire. Le texte ajouté se pose par-dessus, sans toucher au contenu d\'origine.',
        highlight: 'Faites glisser sur la page pour poser un surlignage translucide.',
        box: 'Faites glisser pour tracer un cadre autour d\'une zone.',
        draw: 'Dessinez à main levée en maintenant le bouton enfoncé.',
      };
      if (AIDE[ed.tool]) ed.side.appendChild(note(AIDE[ed.tool]));
    }
    if (p.ann.length) {
      let pied = ed.side.querySelector('.pied');
      if (!pied) { pied = document.createElement('div'); pied.className = 'pied'; ed.side.appendChild(pied); }
      const all = document.createElement('button');
      all.type = 'button'; all.className = 'tb-btn';
      all.textContent = 'Tout effacer sur cette page';
      all.addEventListener('click', () => { edFermerSaisie(true); snapshot(); p.ann = []; ed.sel = null; state.touched = true; edDrawOverlay(); });
      pied.appendChild(all);
    }
  }

  // Le panneau d'un champ à remplir.
  function edSideChamp(sel, p, change) {
    if (!sel) {
      ed.side.appendChild(note('Faites glisser sur la page pour tracer un champ, à l\'endroit et à la taille voulus. '
        + 'Dans le PDF exporté, n\'importe qui pourra écrire dedans, avec Acrobat ou un simple navigateur.'));
      return;
    }
    const lib = input('ch-lib', 'text', sel.libelle || '');
    lib.placeholder = 'Nom, Prénom, Date…';
    lib.addEventListener('input', () => change(() => { sel.libelle = lib.value; }));
    ed.side.appendChild(field('Intitulé', lib, 'Sert d\'étiquette au champ dans le PDF, et s\'affiche en gris tant qu\'il est vide.'));

    const val = input('ch-val', 'text', sel.valeur || '');
    val.addEventListener('input', () => change(() => { sel.valeur = val.value; }));
    ed.side.appendChild(field('Texte déjà inscrit', val, 'Laissez vide pour un champ à remplir par la suite.'));

    const t = input('ch-size', 'number', sel.size || 11, { min: 5, max: 48, step: 0.5 });
    t.addEventListener('change', () => change(() => { sel.size = Math.min(48, Math.max(5, parseFloat(t.value) || 11)); }));
    ed.side.appendChild(field('Taille (pt)', t));

    const ml = checkbox('ch-multi', 'Plusieurs lignes', sel.multi);
    ml.input.addEventListener('change', () => change(() => { sel.multi = ml.input.checked; }));
    ed.side.appendChild(ml);

    const cf = input('ch-fond', 'color', sel.fond || '#F2F6FC');
    cf.addEventListener('input', () => change(() => { sel.fond = cf.value; }));
    const cb = input('ch-bord', 'color', sel.bordure || '#7A8899');
    cb.addEventListener('input', () => change(() => { sel.bordure = cb.value; }));
    const ce = input('ch-encre', 'color', sel.encre || '#111111');
    ce.addEventListener('input', () => change(() => { sel.encre = ce.value; }));
    const rang = document.createElement('div'); rang.className = 'row tight';
    rang.append(field('Fond', cf), field('Bordure', cb), field('Texte', ce));
    ed.side.appendChild(rang);

    const r = document.createElement('div'); r.className = 'regle';
    ed.side.appendChild(r);
    ed.side.appendChild(note('Tirez le coin pour changer la taille, glissez pour déplacer.'));

    const pied = document.createElement('div'); pied.className = 'pied';
    const del = document.createElement('button');
    del.type = 'button'; del.className = 'tb-btn danger'; del.textContent = 'Supprimer ce champ';
    del.addEventListener('click', () => {
      snapshot();
      p.ann = p.ann.filter(a => a.id !== sel.id);
      ed.sel = null; state.touched = true; edDrawOverlay();
    });
    pied.appendChild(del);
    ed.side.appendChild(pied);
  }

  // Editor keyboard + double-click to edit text
  document.addEventListener('keydown', e => {
    if (!ed.root || ed.root.hidden) return;
    // Une fenêtre ouverte par-dessus (imprimer…) garde son clavier.
    if (openDlg) return;
    // Pendant une saisie, Suppr efface le texte selectionne et Echap valide :
    // la zone de saisie garde la main sur son clavier.
    if (ed.saisie) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'textarea' || tag === 'input' || tag === 'select') return;
    if (e.key === 'Escape') { e.preventDefault(); if (ed.sel != null) { ed.sel = null; edDrawOverlay(); } else closeEditor(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (ed.sel == null) return;
      e.preventDefault();
      const p = edPage();
      snapshot();
      p.ann = p.ann.filter(a => a.id !== ed.sel);
      ed.sel = null; state.touched = true; edDrawOverlay();
    } else if (e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); edGo(-1); }
    else if (e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); edGo(1); }
    else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undo(); edRenderPage(); }
    else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); dialogImprimer(); }
  }, true);

