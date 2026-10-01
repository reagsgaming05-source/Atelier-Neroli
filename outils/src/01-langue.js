
  // ---------------------------------------------------------------------------------------------
  // Langue de l'interface : français (la langue du code) ou allemand.
  //
  // Le code écrit ses textes en français, en toutes lettres ou assemblés (« 'Page ' + n + ' sur ' + total »).
  // Un dictionnaire (outils/i18n/de.json, relevé par outils/i18n/extraire.js et contrôlé par un test) donne
  // l'allemand de chaque texte ; trois chemins l'utilisent :
  //   - la page est traduite telle qu'elle s'affiche : chaque nœud de texte et chaque attribut lisible
  //     (title, aria-label, placeholder, alt) passe par tr(), au chargement puis à chaque modification ;
  //   - plural() choisit sa forme selon la langue ;
  //   - ce qui est gravé dans un document produit (page de garde, intercalaires, filigrane…) appelle tr()
  //     expressément, car cela ne passe jamais par la page.
  // En français, rien de tout cela ne tourne : le comportement est celui d'avant.
  // ---------------------------------------------------------------------------------------------

  let langue = 'fr';
  /*@traducteur@*/

  let traduction = null;
  // Le dictionnaire est posé par build.js dans la page, sous forme de JSON, et lu seulement si l'allemand est demandé.
  function lireLeDictionnaire() {
    try {
      const e = document.getElementById('aktum-dico-de');
      return e ? JSON.parse(e.textContent) : null;
    } catch (e) { signaler('Dictionnaire allemand', e, 'warn'); return null; }
  }
  // Traduit un texte du code dans la langue courante (rendu tel quel en français).
  const tr = s => (langue === 'fr' || !traduction) ? s : traduction(s);
  // Les dates et les nombres suivent la langue.
  const regionLocale = () => REGIONS[langue];
  // Le code de langue des documents produits (balisage, métadonnées) : celui de l'interface.
  const codeLangue = () => langue;

  // --- La page ---------------------------------------------------------------------------------
  const ATTRIBUTS_LISIBLES = ['title', 'aria-label', 'placeholder', 'alt'];
  // Ce qui n'est jamais traduit : le contenu des documents (couche de texte, zones de saisie), les dessins.
  const SANS_TRADUCTION = '[translate="no"], svg, canvas, script, style, textarea, [contenteditable]';
  const memoTexte = new WeakMap();   // nœud de texte → { fr, sortie } : le français d'origine, et ce que l'on y a écrit
  const memoAttribut = new WeakMap();   // élément → { attribut → { fr, sortie } }
  let observateur = null;

  // Texte d'origine d'une valeur : ce que la page y a écrit, sauf si c'est notre propre traduction.
  const origine = (memo, valeur) => (memo && memo.sortie === valeur) ? memo.fr : valeur;

  function traduireTexte(noeud) {
    const v = noeud.nodeValue;
    if (!v || !/\S/.test(v)) return;
    if (noeud.parentElement && noeud.parentElement.closest(SANS_TRADUCTION)) return;
    const m = memoTexte.get(noeud);
    const fr = origine(m, v);
    // Un texte français qui se dit de deux façons en allemand (« Annuler » : défaire, ou renoncer) porte la sienne.
    const p = noeud.parentElement;
    const choisi = (langue === 'de' && p && p.hasAttribute('data-de') && p.firstChild === noeud && p.childNodes.length === 1) ? p.getAttribute('data-de') : null;
    const sortie = langue === 'fr' ? fr : (choisi !== null ? choisi : tr(fr));
    if (sortie !== v) noeud.nodeValue = sortie;
    if (sortie !== fr) memoTexte.set(noeud, { fr, sortie }); else if (m) memoTexte.delete(noeud);
  }
  function traduireAttribut(element, attribut) {
    const v = element.getAttribute(attribut);
    if (!v) return;
    if (element.closest('[translate="no"]')) return;
    let memo = memoAttribut.get(element);
    const fr = origine(memo && memo[attribut], v);
    const sortie = langue === 'fr' ? fr : tr(fr);
    if (sortie !== v) element.setAttribute(attribut, sortie);
    if (sortie !== fr) { if (!memo) { memo = {}; memoAttribut.set(element, memo); } memo[attribut] = { fr, sortie }; }
    else if (memo && memo[attribut]) delete memo[attribut];
  }
  const traduireLesAttributs = e => ATTRIBUTS_LISIBLES.forEach(a => { if (e.hasAttribute(a)) traduireAttribut(e, a); });
  function traduireArbre(racine) {
    if (!racine) return;
    if (racine.nodeType === 3) { traduireTexte(racine); return; }
    if (racine.nodeType !== 1) return;
    // Un dessin ou une zone de document : seuls ses attributs lisibles sont examinés, pas son contenu.
    if (racine.matches(SANS_TRADUCTION)) { traduireLesAttributs(racine); return; }
    const marcheur = document.createTreeWalker(racine, 1 | 4, {
      acceptNode: n => {
        if (n.nodeType === 1 && n.matches(SANS_TRADUCTION)) { traduireLesAttributs(n); return 2; }   // 2 = rejeter ce sous-arbre
        return 1;
      },
    });
    const aTraiter = [racine];
    for (let n = marcheur.nextNode(); n; n = marcheur.nextNode()) aTraiter.push(n);
    aTraiter.forEach(n => { if (n.nodeType === 3) traduireTexte(n); else traduireLesAttributs(n); });
  }
  function surMutations(lot) {
    for (const m of lot) {
      if (m.type === 'childList') m.addedNodes.forEach(traduireArbre);
      else if (m.type === 'characterData') traduireTexte(m.target);
      else if (m.type === 'attributes') traduireAttribut(m.target, m.attributeName);
    }
  }
  // Revenir au français : chaque nœud qu'on a traduit retrouve son origine.
  function restaurerArbre(racine) {
    const marcheur = document.createTreeWalker(racine, 1 | 4);
    for (let n = marcheur.currentNode; n; n = marcheur.nextNode()) {
      if (n.nodeType === 3) { const m = memoTexte.get(n); if (m && m.sortie === n.nodeValue) { n.nodeValue = m.fr; memoTexte.delete(n); } }
      else if (n.nodeType === 1) {
        const memo = memoAttribut.get(n);
        if (memo) Object.keys(memo).forEach(a => { if (n.getAttribute(a) === memo[a].sortie) n.setAttribute(a, memo[a].fr); });
        memoAttribut.delete(n);
      }
    }
  }
  function preferenceDeLangue() {
    // Dans l'application fenêtrée, le processus principal décide (réglage, sinon langue du système).
    if (window.AktumDesktop && (window.AktumDesktop.langue === 'fr' || window.AktumDesktop.langue === 'de')) return window.AktumDesktop.langue;
    let v = null;
    try { v = localStorage.getItem('aktum-langue'); } catch (_) { /* stockage refusé : on suit la langue du système */ }
    if (v === 'fr' || v === 'de') return v;
    try { return /^de\b/i.test(navigator.language || '') ? 'de' : 'fr'; } catch (_) { return 'fr'; }
  }
  // Pose la langue : traduit la page, ou la rend au français.
  function definirLangue(l, memoriser) {
    if (!LANGUES[l]) l = 'fr';
    if (l === 'de' && !traduction) {
      const dico = lireLeDictionnaire();
      if (!dico) { l = 'fr'; } else traduction = fabriquerTraducteur(dico);
    }
    const avant = langue;
    langue = l;
    document.documentElement.lang = l;
    if (memoriser) {
      try { localStorage.setItem('aktum-langue', l); } catch (e) { signaler('Préférence de langue', e, 'info'); }
      // Le menu de l'application fenêtrée suit : le processus principal retient le choix et refait son menu.
      if (window.AktumDesktop && window.AktumDesktop.choisirLangue) { try { window.AktumDesktop.choisirLangue(l); } catch (e) { signaler('Langue de l\'application', e, 'info'); } }
    }
    if (observateur) { observateur.disconnect(); observateur = null; }
    if (l === 'de') {
      traduireArbre(document.documentElement);
      observateur = new MutationObserver(surMutations);
      observateur.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTS_LISIBLES });
    } else if (avant === 'de') {
      restaurerArbre(document.documentElement);
    }
    if (avant !== l) { try { window.dispatchEvent(new CustomEvent('aktum-langue', { detail: l })); } catch (_) { /* sans effet */ } }
    return l;
  }
  function demarrerLangue() { definirLangue(preferenceDeLangue(), false); }
