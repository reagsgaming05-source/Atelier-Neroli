/*
 * Liste déroulante d'un champ : partout où plusieurs valeurs sont possibles, la même chose —
 * un champ où l'on tape, et une liste qu'on ouvre, qu'on filtre et qu'on parcourt.
 *
 * Deux façons de s'en servir :
 *   attach(input, items, opts)   un champ texte reçoit sa liste (le compte, la classe, un nom) ;
 *   fromSelect(select, opts)     une liste fermée du navigateur devient la même chose (le type
 *                                d'écriture, l'objet) — mêmes touches, même aspect, et on peut
 *                                filtrer en tapant, ce qu'un <select> ne sait pas faire.
 *
 * `items()` rend [{ value, label, hint, note, fort, titre }]. En mode libre (par défaut) le champ
 * garde ce qu'on tape : un compte qui n'existe pas encore doit pouvoir être saisi. En mode
 * `strict`, la valeur revient à la dernière valeur connue si ce qui est tapé n'est pas dans la
 * liste : un type d'écriture inventé n'aurait ni sens, ni compte habituel, ni libellé correct.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CaisseCombo = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ouverts = new Set();
  let ecouteurPose = false;

  /** Un seul écouteur pour toutes les listes : les lignes du tableau des pièces scannées se
   *  redessinent à chaque frappe, et un écouteur par champ s'accumulait sans jamais être retiré. */
  function poserEcouteur(doc) {
    if (ecouteurPose || !doc) return;
    ecouteurPose = true;
    doc.addEventListener('mousedown', (ev) => {
      for (const c of Array.from(ouverts)) if (!c.wrap.contains(ev.target)) c.fermer();
    });
  }

  const sansAccent = (t) => String(t == null ? '' : t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /**
   * L'entrée d'une liste que désigne un texte tapé : celle qui s'écrit exactement ainsi — sans
   * tenir compte des majuscules ni des accents, comme le filtre —, sinon la seule qui le contient.
   * « camp » désigne Camp et non Mini-camp, « 7 » désigne « depuis le n° 7 ». Rien sinon.
   */
  function designe(liste, texte) {
    const q = sansAccent(texte).trim();
    if (!q) return null;
    const ecrit = (it) => (it.label == null || it.label === '' ? it.value : it.label);
    const exact = liste.find((it) => sansAccent(ecrit(it)).trim() === q) || liste.find((it) => sansAccent(it.value).trim() === q);
    if (exact) return exact;
    const candidats = liste.filter((it) => sansAccent(`${it.value} ${it.label || ''}`).includes(q));
    return candidats.length === 1 ? candidats[0] : null;
  }

  /**
   * Pose une liste déroulante sur un champ texte existant.
   * Renvoie { ouvrir, fermer, input } ou null si le champ en a déjà une.
   */
  function attach(input, items, opts) {
    if (!input || input.dataset.combo) return null;
    opts = opts || {};
    const doc = input.ownerDocument;
    poserEcouteur(doc);
    input.dataset.combo = '1';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-autocomplete', 'list');
    input.removeAttribute('list'); // la liste native du navigateur ferait doublon

    const wrap = doc.createElement('div');
    wrap.className = 'combo' + (opts.classe ? ` ${opts.classe}` : '');
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const arrow = doc.createElement('button');
    arrow.type = 'button'; arrow.className = 'combo-arrow'; arrow.tabIndex = -1;
    arrow.setAttribute('aria-label', 'Voir la liste');
    wrap.appendChild(arrow);
    const pop = doc.createElement('div');
    pop.className = 'combo-pop hidden'; pop.setAttribute('role', 'listbox');
    wrap.appendChild(pop);

    let actif = -1; let vus = []; let enPose = false;
    // Vrai dès que la personne tape : la liste se filtre alors sur son texte. Tant qu'elle n'a
    // rien tapé, le texte du champ est la valeur en place, et ouvrir la liste doit montrer TOUS
    // les choix — filtrer sur « REMBOURSEMENT » ne montrait que REMBOURSEMENT.
    let tape = false;
    // Ce qu'on affiche et ce qu'on vaut ne sont pas toujours la même chose : « depuis le n° 7 »
    // vaut « 7 », « toutes les pièces » vaut la chaîne vide. Le champ montre le libellé, la
    // valeur est gardée à côté. Pour un champ libre (un compte, un nom) les deux se confondent.
    let valeur = input.value;
    let dernier = input.value; // mode strict : le libellé vers lequel on revient
    const texteDe = (it) => String(it.label == null || it.label === '' ? it.value : it.label);
    /** Poser la valeur depuis le code, sans rien déclencher : le champ suit ce qu'on lui donne. */
    function refleter(v) {
      valeur = v;
      tape = false;
      const it = tous().find((x) => String(x.value) === String(v));
      input.value = it ? texteDe(it) : String(v == null ? '' : v);
      dernier = input.value;
    }
    const api = { wrap, input, ouvrir, fermer, rafraichir, refleter, valeur: () => valeur };

    function tous() { try { return items() || []; } catch (e) { return []; } }
    function dessiner(filtre) {
      const q = sansAccent(filtre).trim();
      const liste = tous();
      vus = q ? liste.filter((it) => sansAccent(`${it.value} ${it.label || ''} ${it.hint || ''}`).includes(q)) : liste;
      if (!vus.length) {
        pop.innerHTML = `<div class="combo-vide">${esc(opts.vide || 'Rien de connu qui corresponde.')}</div>`;
        actif = -1;
        return;
      }
      pop.innerHTML = vus.map((it, i) => (
        `<div class="combo-item${i === actif ? ' actif' : ''}${it.fort ? ' fort' : ''}" role="option"` +
        ` aria-selected="${String(it.value) === String(valeur) ? 'true' : 'false'}" data-i="${i}"${it.titre ? ` title="${esc(it.titre)}"` : ''}>` +
        `<b>${esc(it.label || it.value)}</b>` +
        (it.hint ? `<span class="u">${esc(it.hint)}</span>` : '') +
        (it.note ? `<span class="n">${esc(it.note)}</span>` : '') +
        '</div>'
      )).join('');
    }
    function montrerActif() {
      const el = pop.querySelector('.combo-item.actif');
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
    function ouvrir(filtre) {
      // la valeur en place est mise en évidence quand on ouvre sans filtrer
      if (filtre == null || filtre === '') {
        const i = tous().findIndex((it) => String(it.value) === String(valeur));
        actif = i >= 0 ? i : -1;
      }
      dessiner(filtre == null ? '' : filtre);
      pop.classList.remove('hidden');
      input.setAttribute('aria-expanded', 'true');
      ouverts.add(api);
      montrerActif();
    }
    function fermer() {
      pop.classList.add('hidden');
      input.setAttribute('aria-expanded', 'false');
      ouverts.delete(api);
      actif = -1;
    }
    const estOuvert = () => ouverts.has(api);
    const filtre = () => (tape ? input.value : '');
    function rafraichir() { if (estOuvert()) dessiner(filtre()); }

    function poser(it) {
      input.value = texteDe(it);
      valeur = it.value;
      tape = false;
      dernier = input.value;
      fermer();
      // Ces événements préviennent le reste de l'application (libellé, comptes proposés). Sans ce
      // drapeau, l'écouteur « input » ci-dessous rouvrait la liste sur la valeur qu'on vient de
      // choisir : on cliquait, et le menu se rouvrait aussitôt.
      enPose = true;
      try {
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      } finally { enPose = false; }
      if (opts.onPick) opts.onPick(it);
    }
    function choisir(i) { if (vus[i]) poser(vus[i]); }

    /**
     * Mode strict : ce qui est tapé doit exister, sinon on revient à la dernière valeur connue.
     *
     * Un mot tapé en entier (« RECETTE », « Camp ») doit être POSÉ, pas seulement retenu : poser()
     * prévient le <select> caché et le reste de la fiche. Sans cela le champ affichait RECETTE
     * pendant que la pièce partait en REMBOURSEMENT — une entrée enregistrée en sortie.
     */
    function reglerStrict() {
      if (!opts.strict) return;
      const it = designe(tous(), input.value);
      if (!it) { if (input.value !== dernier) input.value = dernier; return; } // rien de connu : on remet ce qui valait
      if (String(it.value) !== String(valeur)) { poser(it); return; }
      input.value = texteDe(it); // « recette » tapé sur RECETTE : on remet l'écriture de la liste
      dernier = input.value;
    }

    arrow.addEventListener('mousedown', (ev) => {
      ev.preventDefault(); // garder le curseur dans le champ
      if (estOuvert()) fermer(); else { ouvrir(''); input.focus(); }
    });
    // Sous Windows, on clique n'importe où dans une liste déroulante pour l'ouvrir : viser la
    // petite flèche n'est pas un geste qu'on devine. Une liste fermée s'ouvre donc au clic dans
    // le champ, texte sélectionné pour que la frappe filtre ; un second clic la referme. Un champ
    // libre (compte, nom) s'ouvre au clic quand il est vide : plein, on y clique pour corriger.
    input.addEventListener('click', () => {
      if (opts.strict) {
        if (estOuvert()) { fermer(); return; }
        ouvrir('');
        input.select();
      } else if (!estOuvert() && !input.value) ouvrir('');
    });
    input.addEventListener('focus', () => { if (opts.strict) input.select(); });
    input.addEventListener('input', () => {
      if (enPose) return;
      tape = true;
      if (!opts.strict) valeur = input.value; // champ libre : ce qu'on tape est la valeur
      if (estOuvert() || input.value) { actif = -1; ouvrir(input.value); }
    });
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (!estOuvert()) {
          ouvrir(filtre());
          // premier appui : la liste s'ouvre sur la valeur en place, sans encore la quitter
          if (!tape && actif >= 0) return;
        }
        if (!vus.length) return;
        actif = ev.key === 'ArrowDown'
          ? (actif + 1) % vus.length
          : (actif <= 0 ? vus.length - 1 : actif - 1);
        dessiner(filtre()); montrerActif();
      } else if (ev.key === 'Enter' && estOuvert()) {
        if (actif >= 0) { ev.preventDefault(); choisir(actif); }
        else if (opts.strict) { ev.preventDefault(); reglerStrict(); fermer(); }
      } else if (ev.key === 'Escape' && estOuvert()) {
        ev.preventDefault(); ev.stopPropagation();
        if (opts.strict) { input.value = dernier; tape = false; }
        fermer();
      } else if (ev.key === 'Tab') { reglerStrict(); fermer(); }
    });
    pop.addEventListener('mousedown', (ev) => {
      const el = ev.target.closest('.combo-item');
      if (!el) return;
      ev.preventDefault(); // le champ ne doit pas perdre le focus avant le clic
      choisir(Number(el.dataset.i));
    });
    input.addEventListener('blur', () => setTimeout(() => {
      if (wrap.contains(doc.activeElement)) return;
      reglerStrict();
      fermer();
    }, 120));
    return api;
  }

  const convertis = [];

  /**
   * Donne à une liste fermée du navigateur la même liste déroulante que partout ailleurs.
   *
   * Le <select> reste en place, caché : c'est toujours lui qui porte l'identifiant, les options et
   * la valeur. Tout le code qui fait `els.pType.value`, qui écoute `change` ou qui réécrit les
   * <option> continue de marcher sans rien changer. Le champ ajouté devant ne sert qu'à afficher
   * et à choisir — il montre le libellé de l'option, pas sa valeur brute (« toutes les pièces »
   * plutôt qu'une case vide).
   *
   * Renvoie le <select>, pour que l'appelant garde la même référence qu'avant.
   */
  function fromSelect(select, opts) {
    if (!select || select.tagName !== 'SELECT' || select.dataset.comboPour) return select;
    opts = opts || {};
    const doc = select.ownerDocument;
    const options = () => Array.from(select.options).map((o) => ({ value: o.value, label: o.textContent }));
    const items = opts.items || options;

    const input = doc.createElement('input');
    input.type = 'text';
    input.className = select.className;
    if (select.getAttribute('style')) input.setAttribute('style', select.getAttribute('style'));
    if (select.title) input.title = select.title;
    input.setAttribute('aria-label', select.getAttribute('aria-label') || select.title || '');
    select.classList.add('hidden');
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;
    select.dataset.comboPour = '1';
    select.parentNode.insertBefore(input, select);
    // L'étiquette visait le <select> caché : un clic dessus ne menait nulle part. Elle vise
    // maintenant le champ visible (qui s'ouvre alors comme au clic).
    if (select.id) {
      input.id = `${select.id}Liste`;
      const etiquettes = doc.querySelectorAll ? doc.querySelectorAll(`label[for="${select.id}"]`) : [];
      for (const l of Array.from(etiquettes)) l.htmlFor = input.id;
    }

    const combo = attach(input, items, Object.assign({}, opts, {
      strict: true,
      onPick: (it) => {
        select.value = it.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.dispatchEvent(new Event('input', { bubbles: true }));
        if (opts.onPick) opts.onPick(it);
      },
    }));
    /** Le champ affiche ce que porte le <select> : appelé après toute écriture de .value. */
    const sync = () => { if (combo) combo.refleter(select.value); };
    sync();
    select.addEventListener('change', sync);
    convertis.push({ select, sync });
    return select;
  }

  /** Remet les champs d'affichage d'accord avec leurs <select>, après un remplissage par le code. */
  function syncAll() { for (const c of convertis) { try { c.sync(); } catch (e) { /* détaché */ } } }

  return { attach, fromSelect, syncAll, designe };
});
