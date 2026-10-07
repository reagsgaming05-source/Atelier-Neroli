  // =====================================================================
  //  L'aide de chaque outil
  //  La même donnée (aide/outils.json) nourrit le « ? » des boîtes, le chapitre « Les outils » du mode d'emploi, la
  //  foire aux questions et la formation : un outil ne s'explique pas de quatre façons.
  // =====================================================================
  const AIDE = /*@aide@*/{ outils: [], messages: [] };

  const aideDeLOutil = id => AIDE.outils.find(o => o.id === id) || null;

  // Le bloc d'aide d'une boîte : ce que l'outil fait, comment s'en servir, ce qu'il change vraiment, ce qu'il faut savoir.
  function construireAide(id) {
    const o = aideDeLOutil(id);
    if (!o) return null;
    const bloc = document.createElement('section'); bloc.className = 'dlg-aide'; bloc.setAttribute('role', 'note');
    bloc.setAttribute('aria-label', tr('Aide sur cet outil'));
    const q = document.createElement('p'); q.className = 'quoi'; q.textContent = tr(o.quoi);
    const ol = document.createElement('ol');
    (o.etapes || []).forEach(t => { const li = document.createElement('li'); li.textContent = tr(t); ol.appendChild(li); });
    const dt = (titre, texte) => {
      const p = document.createElement('p');
      const b = document.createElement('strong'); b.textContent = tr(titre) + ' ';
      p.append(b, document.createTextNode(tr(texte)));
      return p;
    };
    bloc.append(q, ol, dt('Ce que cela change :', o.effet));
    if (o.attention) bloc.append(dt('À savoir :', o.attention));
    const pied = document.createElement('p'); pied.className = 'pied-aide';
    pied.textContent = tr('F1 ou « ? » referme cette aide. Le mode d\'emploi complet est dans le dossier du logiciel.');
    bloc.appendChild(pied);
    return bloc;
  }
  aideDeBoite.construire = construireAide;
