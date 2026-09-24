/*
 * La fiche de saisie (« PIÈCE COMPTABLE ») : ce que la personne tape doit être ce qui est
 * enregistré, et ce qu'elle a tapé ne doit pas se perdre sans qu'on le lui dise.
 *
 * Les listes (combo.js) et la fiche elle-même (saisie.js) sont éprouvées dans un petit document
 * simulé : juste ce qu'il faut d'éléments, d'événements et de valeurs pour que le code de la page
 * tourne tel quel dans Node, sans navigateur.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = require('../src/registre.js');
const P = require('../src/parser.js');
const Combo = require('../src/combo.js');

/* ------------------------------------------------------------------ */
/* Document simulé                                                      */
/* ------------------------------------------------------------------ */

class ClassList {
  constructor() { this.s = new Set(); }
  add(...c) { for (const x of c) this.s.add(x); }
  remove(...c) { for (const x of c) this.s.delete(x); }
  contains(c) { return this.s.has(c); }
  toggle(c, f) { const on = f === undefined ? !this.s.has(c) : !!f; if (on) this.s.add(c); else this.s.delete(c); return on; }
}

/** Un sélecteur simple : « tag », « .classe », « [attr] », « tag[data-x] », « tag.classe ». */
function correspond(el, sel) {
  return sel.split(',').some((un) => {
    const m = /^([a-z]*)((?:\.[\w-]+)*)((?:\[[\w-]+\])*)$/i.exec(un.trim());
    if (!m) return false;
    if (m[1] && el.tagName !== m[1].toUpperCase()) return false;
    for (const c of (m[2].match(/\.[\w-]+/g) || [])) if (!el.classList.contains(c.slice(1))) return false;
    for (const a of (m[3].match(/\[[\w-]+\]/g) || [])) {
      const nom = a.slice(1, -1);
      const data = nom.startsWith('data-') ? nom.slice(5).replace(/-([a-z])/g, (x, l) => l.toUpperCase()) : null;
      if (data ? !(data in el.dataset) : el.getAttribute(nom) == null) return false;
    }
    return true;
  });
}

class El extends EventTarget {
  constructor(doc, tag, id) {
    super();
    this.ownerDocument = doc; this.tagName = String(tag).toUpperCase(); this.id = id || '';
    this.children = []; this.parentNode = null; this.dataset = {}; this.attrs = {}; this.style = {};
    this.classList = new ClassList(); this.checked = false; this.disabled = false; this.readOnly = false;
    this.textContent = ''; this._html = ''; this.files = []; this.title = ''; this.tabIndex = 0; this.type = '';
    this.value = '';
  }
  get className() { return Array.from(this.classList.s).join(' '); }
  set className(v) { this.classList.s = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get innerHTML() { return this._html; }
  set innerHTML(h) { this._html = String(h); for (const c of this.children) c.parentNode = null; this.children = []; }
  get parentElement() { return this.parentNode; }
  get previousElementSibling() { const f = this.parentNode ? this.parentNode.children : []; const i = f.indexOf(this); return i > 0 ? f[i - 1] : null; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  hasAttribute(k) { return k in this.attrs; }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; }
  prepend(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.unshift(c); return c; }
  insertBefore(n, ref) { if (n.parentNode) n.parentNode.removeChild(n); const i = this.children.indexOf(ref); n.parentNode = this; this.children.splice(i < 0 ? this.children.length : i, 0, n); return n; }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
  matches(sel) { return correspond(this, sel); }
  closest(sel) { for (let x = this; x && x instanceof El; x = x.parentNode) if (correspond(x, sel)) return x; return null; }
  /** Les enfants posés par le code (pas ceux écrits en HTML, que ce document ne lit pas). */
  querySelectorAll(sel) { const out = []; const tour = (e) => { for (const c of e.children) { if (correspond(c, sel)) out.push(c); tour(c); } }; tour(this); return out; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  focus() { this.ownerDocument.activeElement = this; }
  blur() { if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = this.ownerDocument.body; }
  select() { this.selectionne = true; }
  click() { this.dispatchEvent(new Event('click', { cancelable: true })); }
  scrollIntoView() {}
  getBoundingClientRect() { return { top: 0, left: 0, width: 100, height: 30, bottom: 30, right: 100 }; }
}

/** Un <select> : ses options viennent du HTML qu'on lui donne, sa valeur est toujours l'une d'elles. */
class SelectEl extends El {
  get innerHTML() { return this._html; }
  set innerHTML(h) {
    this._html = String(h);
    const dec = (t) => t.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    this.options = Array.from(this._html.matchAll(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g)).map((m) => ({ value: dec(m[1]), textContent: dec(m[2]) }));
    this._v = this.options.length ? this.options[0].value : '';
  }
  get value() { return this._v == null ? '' : this._v; }
  set value(v) { const o = (this.options || []).find((x) => x.value === String(v)); this._v = o ? o.value : ''; }
}

const SELECTS = new Set(['pType', 'pObjet', 'regYear', 'regPdfFrom']);

function documentSimule() {
  const doc = new EventTarget();
  const parId = new Map();
  doc.body = new El(doc, 'body');
  doc.activeElement = doc.body;
  doc.createElement = (tag) => (String(tag).toLowerCase() === 'select' ? new SelectEl(doc, tag) : new El(doc, tag));
  doc.getElementById = (id) => {
    if (!parId.has(id)) {
      const el = SELECTS.has(id) ? new SelectEl(doc, 'select', id) : new El(doc, id === 'ficheCard' ? 'section' : 'div', id);
      if (SELECTS.has(id)) el.innerHTML = '';
      doc.body.appendChild(el);
      parId.set(id, el);
    }
    return parId.get(id);
  };
  doc.querySelector = () => null;
  doc.querySelectorAll = () => [];
  return doc;
}

/** Une touche, comme le navigateur l'envoie au champ. */
function touche(el, key, extra) {
  const ev = new Event('keydown', { cancelable: true });
  Object.assign(ev, { key }, extra || {});
  el.dispatchEvent(ev);
  return ev;
}
/** Taper un texte dans un champ (tout remplacé), comme le ferait la personne. */
function taper(el, texte) {
  el.value = texte;
  el.dispatchEvent(new Event('input'));
}

/* ------------------------------------------------------------------ */
/* Listes fermées (combo.js)                                            */
/* ------------------------------------------------------------------ */

/** Une liste fermée comme celle du type d'écriture : un <select> caché, un champ devant. */
function listeFermee(valeurs, depart) {
  const doc = documentSimule();
  const sel = doc.createElement('select');
  sel.id = 'pType';
  doc.body.appendChild(sel);
  sel.innerHTML = valeurs.map((v) => `<option value="${v}">${v}</option>`).join('');
  sel.value = depart;
  const changes = [];
  sel.addEventListener('change', () => changes.push(sel.value));
  Combo.fromSelect(sel, {});
  const champ = sel.previousElementSibling.querySelector('input');
  return { doc, sel, champ, changes };
}

test('un type tapé en entier puis Tab est bien celui qui est enregistré', () => {
  const { sel, champ, changes } = listeFermee(R.TYPES, 'REMBOURSEMENT');
  champ.focus();
  taper(champ, 'RECETTE');
  touche(champ, 'Tab');
  assert.equal(champ.value, 'RECETTE');
  assert.equal(sel.value, 'RECETTE', 'le champ affiche RECETTE mais la pièce partirait en REMBOURSEMENT');
  assert.deepEqual(changes, ['RECETTE'], 'la fiche doit être prévenue (sens, compte, libellé)');
});

test('un type tapé en entier puis Entrée, liste ouverte, est bien posé', () => {
  const { sel, champ } = listeFermee(R.TYPES, 'REMBOURSEMENT');
  champ.focus();
  taper(champ, 'DECOMPTE'); // la frappe ouvre la liste filtrée
  const ev = touche(champ, 'Enter');
  assert.equal(sel.value, 'DECOMPTE');
  assert.ok(ev.defaultPrevented, 'Entrée ne doit pas partir ailleurs (enregistrement de la fiche)');
});

test('majuscules et accents ne comptent pas, et le mot reprend son écriture de la liste', () => {
  const { sel, champ } = listeFermee(R.TYPES, 'REMBOURSEMENT');
  taper(champ, 'recette');
  touche(champ, 'Tab');
  assert.equal(sel.value, 'RECETTE');
  assert.equal(champ.value, 'RECETTE');
  // tapé à l'identique de la valeur en place : rien ne change, mais l'écriture est remise
  taper(champ, 'Recette');
  touche(champ, 'Tab');
  assert.equal(champ.value, 'RECETTE');
});

test('« Camp » désigne Camp et non Mini-camp, même en minuscules', () => {
  const { sel, champ } = listeFermee(P.OBJET_LIST, 'Autre');
  taper(champ, 'Camp');
  touche(champ, 'Tab');
  assert.equal(sel.value, 'Camp');
  sel.value = 'Autre'; sel.dispatchEvent(new Event('change'));
  taper(champ, 'camp');
  touche(champ, 'Tab');
  assert.equal(sel.value, 'Camp', '« camp » correspond à deux objets, mais s\'écrit exactement comme l\'un d\'eux');
});

test('un texte qui ne désigne rien revient à la valeur en place', () => {
  const { sel, champ, changes } = listeFermee(R.TYPES, 'FRAIS');
  taper(champ, 'N IMPORTE QUOI');
  touche(champ, 'Tab');
  assert.equal(sel.value, 'FRAIS');
  assert.equal(champ.value, 'FRAIS');
  assert.deepEqual(changes, []);
});

test('ce que désigne un texte tapé', () => {
  const liste = [{ value: '', label: 'toutes les pièces' }, { value: '7', label: 'depuis le n° 7' }, { value: '17', label: 'depuis le n° 17' }];
  assert.equal(Combo.designe(liste, '7').value, '7', 'un numéro tapé désigne sa pièce, pas toutes celles qui contiennent 7');
  assert.equal(Combo.designe(liste, 'toutes').value, '');
  assert.equal(Combo.designe(liste, 'depuis'), null, 'deux candidats : on ne choisit pas au hasard');
  assert.equal(Combo.designe(liste, '  '), null);
});

