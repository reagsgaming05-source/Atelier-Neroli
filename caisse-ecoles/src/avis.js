/*
 * Les messages de l'application : une seule zone, toujours à l'écran.
 *
 * Les messages de la fiche et du journal s'ajoutaient sous le journal — à des milliers de pixels
 * sous l'écran avec une année réelle — et s'effaçaient au bout de 7 secondes : on ne savait pas
 * si la pièce était enregistrée, et une erreur d'écriture passait pour un clic sans effet. Depuis
 * « Compter la caisse », l'erreur partait même dans un espace caché.
 *
 * La zone est fixée en bas de la fenêtre, au-dessus de tout, quel que soit l'espace ouvert et
 * l'endroit où l'on a fait défiler la page. Dans Décompte DGEO, dont la page est posée par-dessus
 * celle-ci, elle prend sa place sous la page du décompte (voir app.css, `.content.embed`).
 *
 * Combien de temps : une réussite reste 12 s, un avertissement 25 s ; une erreur, ou un message
 * qui propose une action, reste jusqu'à ce qu'on le ferme. Un message survolé ne s'efface pas.
 * Chaque message a sa croix. Le même message (ou le même sujet, `opts.id`) ne s'empile pas.
 *
 * notice(genre, html, opts) de saisie.js reste la façon d'afficher un message : elle passe par
 * ici. Ailleurs : window.CaisseAvis.afficher(genre, html, opts), mêmes arguments.
 *   genre : 'ok' | 'warn' | 'err' ; html : texte déjà échappé ;
 *   opts.keep (ou garder) : rester jusqu'à ce qu'on le ferme ; opts.id : remplace le message de même id ;
 *   opts.actions : [{ texte, faire, principal }] — des boutons ; le message se ferme au clic.
 * CaisseAvis.retirer(id) retire le message de cet id.
 * En Node (tests) : les règles seules, duree() et aRetirer().
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CaisseAvis = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DUREES = { ok: 12000, info: 12000, warn: 25000 };
  const MAX = 4;

  /** Durée d'affichage en millisecondes, ou null : le message reste jusqu'à ce qu'on le ferme. */
  function duree(genre, opts) {
    const o = opts || {};
    if (o.keep || o.garder || (Array.isArray(o.actions) && o.actions.length)) return null;
    if (genre === 'err') return null;
    return DUREES[genre] || DUREES.ok;
  }

  /**
   * Trop de messages à la fois : lesquels retirer. Les plus anciens de ceux qui s'effaceraient
   * d'eux-mêmes d'abord ; un message qui attend qu'on le ferme (une erreur) ne part que s'il n'y
   * a plus que ceux-là. `liste` : du plus ancien au plus récent, [{ persistant }] ; renvoie les
   * indices à retirer.
   */
  function aRetirer(liste, max) {
    const surplus = liste.length - (max || MAX);
    if (surplus <= 0) return [];
    const idx = liste.map((x, i) => i);
    return idx.filter((i) => !liste[i].persistant).concat(idx.filter((i) => liste[i].persistant)).slice(0, surplus);
  }

  if (typeof document === 'undefined') return { duree, aRetirer, MAX };

  /* ---------------- à l'écran ---------------- */
  let zone = null;
  function laZone() {
    if (zone && zone.isConnected) return zone;
    zone = document.getElementById('zoneAvis');
    if (!zone) {
      zone = document.createElement('div');
      zone.id = 'zoneAvis';
      zone.className = 'zone-avis';
      (document.querySelector('main') || document.body).appendChild(zone);
    }
    zone.setAttribute('aria-live', 'polite');
    // Les boutons « Ouvrir la fiche PDF » (fenêtre bloquée) : ouverts ici, où qu'ait été écrit le message.
    zone.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-open-pdf]');
      if (b) window.open(b.dataset.openPdf, '_blank');
    });
    // La page peut défiler jusque sous les messages : ils ne cachent rien pour de bon.
    if (window.ResizeObserver) {
      new ResizeObserver(() => {
        const main = document.querySelector('main.content');
        if (main) main.style.setProperty('--avis-h', `${zone.offsetHeight}px`);
      }).observe(zone);
    }
    return zone;
  }

  function fermer(div) {
    if (div && div.parentNode) div.parentNode.removeChild(div);
  }

  /** S'efface après `ms`, sauf pendant qu'on le survole ou qu'on y est au clavier. */
  function programmer(div, ms) {
    let reste = ms;
    let debut = Date.now();
    let t = setTimeout(() => fermer(div), reste);
    const pause = () => { clearTimeout(t); reste -= Date.now() - debut; };
    const reprise = () => { debut = Date.now(); clearTimeout(t); t = setTimeout(() => fermer(div), Math.max(4000, reste)); };
    div.addEventListener('mouseenter', pause);
    div.addEventListener('mouseleave', reprise);
    div.addEventListener('focusin', pause);
    div.addEventListener('focusout', reprise);
  }

  function afficher(genre, html, opts) {
    const o = opts || {};
    const z = laZone();
    const cle = o.id ? `id:${o.id}` : `${genre}:${html}`;
    for (const ancien of Array.from(z.children)) if (ancien.dataset.cle === cle) fermer(ancien);

    const div = document.createElement('div');
    div.className = `notice ${genre}`;
    div.dataset.cle = cle;
    if (genre === 'err') div.setAttribute('role', 'alert');
    const texte = document.createElement('div');
    texte.className = 'avis-texte';
    texte.innerHTML = html;
    div.appendChild(texte);
    if (Array.isArray(o.actions) && o.actions.length) {
      const barre = document.createElement('div');
      barre.className = 'avis-actions';
      for (const a of o.actions) {
        const b = document.createElement('button');
        b.type = 'button';
        if (a.principal) b.className = 'primary';
        b.textContent = a.texte;
        b.addEventListener('click', () => { fermer(div); try { a.faire(); } catch (e) { console.error(e); } });
        barre.appendChild(b);
      }
      div.appendChild(barre);
    }
    const croix = document.createElement('button');
    croix.type = 'button';
    croix.className = 'avis-fermer';
    croix.title = 'Fermer ce message';
    croix.setAttribute('aria-label', 'Fermer ce message');
    croix.textContent = '×';
    croix.addEventListener('click', () => fermer(div));
    div.appendChild(croix);

    const ms = duree(genre, o);
    div.dataset.persistant = ms == null ? '1' : '';
    z.appendChild(div); // le plus récent en bas, au plus près du bord où l'œil le cherche
    if (ms != null) programmer(div, ms);
    const tous = Array.from(z.children);
    for (const i of aRetirer(tous.map((d) => ({ persistant: !!d.dataset.persistant })))) fermer(tous[i]);
    return div;
  }

  /** Retire le message de cet id (une erreur d'enregistrement, une fois l'enregistrement réussi). */
  function retirer(id) {
    const z = document.getElementById('zoneAvis');
    if (!z) return;
    for (const d of Array.from(z.children)) if (d.dataset.cle === `id:${id}`) fermer(d);
  }

  return { duree, aRetirer, MAX, afficher, fermer, retirer };
});
