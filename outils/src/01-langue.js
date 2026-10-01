
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

  // @debut-langue
  const LANGUES = { fr: 'Français', de: 'Deutsch' };
  const REGIONS = { fr: 'fr-CH', de: 'de-CH' };
  let langue = 'fr';

  // Fabrique la fonction de traduction d'un dictionnaire { litteraux, motifs, html, pluriels }.
  //   - un texte connu se traduit tel quel ;
  //   - un texte assemblé (« Page 3 sur 12 ») correspond à un motif (« Page {0} sur {1} ») ; ses morceaux
  //     variables sont à leur tour traduits (un nom de fichier ne l'est pas, faute d'entrée) ;
  //   - le reste est rendu intact : mieux vaut du français qu'un texte inventé.
  function fabriquerTraducteur(dico) {
    const exact = new Map();
    ['litteraux', 'html'].forEach(s => Object.keys(dico[s] || {}).forEach(k => { if (dico[s][k] !== k) exact.set(k, dico[s][k]); }));
    const echapper = s => s.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&');
    const motifs = Object.keys(dico.motifs || {}).filter(k => dico.motifs[k] !== k).map(k => {
      const morceaux = k.split(/\{(\d+)\}/);
      let re = '^';
      const ordre = [];
      let fixe = 0;
      morceaux.forEach((m, i) => {
        if (i % 2 === 0) { re += echapper(m); fixe += m.length; } else { re += '([\\s\\S]*?)'; ordre.push(+m); }
      });
      return { re: new RegExp(re + '$'), ordre, gabarit: dico.motifs[k], fixe };
    }).sort((a, b) => b.fixe - a.fixe);
    const pluriels = dico.pluriels || {};

    function traduire(s, profondeur) {
      if (typeof s !== 'string' || s === '') return s;
      if (exact.has(s)) return exact.get(s);
      if (!profondeur) profondeur = 0;
      for (const m of motifs) {
        const r = m.re.exec(s);
        if (!r) continue;
        const args = [];
        for (let i = 0; i < m.ordre.length; i++) if (args[m.ordre[i]] === undefined) args[m.ordre[i]] = r[i + 1];
        return m.gabarit.replace(/\{(\d+)\}/g, (_, n) => {
          const v = args[+n];
          return v === undefined ? '' : (profondeur < 3 ? traduire(v, profondeur + 1) : v);
        });
      }
      // Espaces de bord et retours à la ligne du HTML : le texte est cherché sans eux, puis rhabillé.
      const bords = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
      if (bords[1] || bords[3] || /\s{2,}|\n/.test(bords[2])) {
        const nu = bords[2].replace(/\s+/g, ' ');
        if (nu && (nu !== s)) { const t = traduire(nu, profondeur); if (t !== nu) return bords[1] + t + bords[3]; }
      }
      return s;
    }
    // « 3 pages » : le nombre, puis le nom au singulier ou au pluriel — l'allemand compte « 0 Seiten » (pluriel), le français « 0 page ».
    traduire.pluriel = (n, un, plusieurs, lang) => {
      const pl = lang === 'de' ? n !== 1 : n > 1;
      if (lang === 'de' && pl && un === plusieurs && pluriels[un] !== undefined) return pluriels[un];
      return traduire(pl ? plusieurs : un);
    };
    return traduire;
  }
  // @fin-langue

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
    if (memoriser) { try { localStorage.setItem('aktum-langue', l); } catch (e) { signaler('Préférence de langue', e, 'info'); } }
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
