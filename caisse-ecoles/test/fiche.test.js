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
  /** Comme dans le navigateur, la valeur d'un champ est toujours du texte. */
  get value() { return this._val == null ? '' : this._val; }
  set value(v) { this._val = v == null ? '' : String(v); }
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

/** La liste déroulante d'un champ : ouverte ou non, et combien de choix elle montre. */
function liste(champ) {
  const pop = champ.parentNode.children.find((c) => c.classList.contains('combo-pop'));
  const choix = (pop.innerHTML.match(/role="option"/g) || []).length;
  const actif = /class="combo-item actif[^"]*"[^>]*>\s*<b>([^<]*)<\/b>/.exec(pop.innerHTML);
  return { ouverte: !pop.classList.contains('hidden'), choix, actif: actif ? actif[1] : null };
}

test('un clic dans une liste fermée l\'ouvre en entier, texte prêt à être remplacé', () => {
  const { champ } = listeFermee(R.TYPES, 'REMBOURSEMENT');
  assert.equal(liste(champ).ouverte, false);
  champ.focus();
  champ.click();
  assert.equal(liste(champ).ouverte, true, 'il fallait viser la petite flèche');
  assert.equal(liste(champ).choix, R.TYPES.length, 'tous les types, pas seulement celui affiché');
  assert.equal(liste(champ).actif, 'REMBOURSEMENT', 'la valeur en place est mise en évidence');
  assert.ok(champ.selectionne, 'la frappe doit remplacer le texte et filtrer');
  champ.click();
  assert.equal(liste(champ).ouverte, false, 'un second clic la referme, comme une liste Windows');
});

test('↓ ouvre la liste entière sur la valeur en place, puis la parcourt', () => {
  const { sel, champ } = listeFermee(R.TYPES, 'REMBOURSEMENT');
  touche(champ, 'ArrowDown');
  assert.equal(liste(champ).choix, R.TYPES.length, '↓ ne montrait que REMBOURSEMENT');
  assert.equal(liste(champ).actif, 'REMBOURSEMENT');
  touche(champ, 'ArrowDown');
  assert.equal(liste(champ).actif, R.TYPES[1]);
  touche(champ, 'Enter');
  assert.equal(sel.value, R.TYPES[1]);
  // après avoir tapé, ↓ parcourt ce qui correspond à la frappe
  taper(champ, 'rec');
  touche(champ, 'ArrowDown');
  assert.equal(liste(champ).choix, 1);
});

test('en tapant, le nom qui correspond passe avant ce qui ne correspond que par sa description', () => {
  const doc = documentSimule();
  const sel = doc.createElement('select');
  doc.body.appendChild(sel);
  sel.innerHTML = R.TYPES.map((v) => `<option value="${v}">${v}</option>`).join('');
  sel.value = 'REMBOURSEMENT';
  const hint = { AVANCE: 'sortie de caisse : argent remis avant une course, réglé ensuite par un décompte' };
  Combo.fromSelect(sel, { items: () => R.TYPES.map((t) => ({ value: t, hint: hint[t] || '' })) });
  const champ = sel.previousElementSibling.querySelector('input');
  taper(champ, 'decompte');
  touche(champ, 'ArrowDown');
  touche(champ, 'Enter');
  assert.equal(sel.value, 'DECOMPTE', 'AVANCE passait devant, parce que sa description dit « décompte »');
});

test('un champ libre vide s\'ouvre au clic ; rempli, on y clique pour corriger', () => {
  const doc = documentSimule();
  const input = doc.createElement('input');
  doc.body.appendChild(input);
  Combo.attach(input, () => [{ value: '51000.3662.00' }, { value: '9206.101' }], {});
  input.click();
  assert.equal(liste(input).ouverte, true);
  assert.equal(liste(input).choix, 2);
  touche(input, 'Escape');
  input.value = '9206.101';
  input.click();
  assert.equal(liste(input).ouverte, false);
});

test('ce que désigne un texte tapé', () => {
  const liste = [{ value: '', label: 'toutes les pièces' }, { value: '7', label: 'depuis le n° 7' }, { value: '17', label: 'depuis le n° 17' }];
  assert.equal(Combo.designe(liste, '7').value, '7', 'un numéro tapé désigne sa pièce, pas toutes celles qui contiennent 7');
  assert.equal(Combo.designe(liste, 'toutes').value, '');
  assert.equal(Combo.designe(liste, 'depuis'), null, 'deux candidats : on ne choisit pas au hasard');
  assert.equal(Combo.designe(liste, '  '), null);
});

/* ------------------------------------------------------------------ */
/* La fiche entière (saisie.js), sur un disque simulé                    */
/* ------------------------------------------------------------------ */

/**
 * Le dossier des données tel que le voit la page dans l'application fenêtrée (preload.js) :
 * mêmes règles que main.js, y compris le refus d'écrire quand un autre poste a écrit entre-temps.
 * Deux fiches branchées sur le même disque sont deux postes sur le même serveur.
 */
function disqueSimule() {
  const registres = new Map();
  const fichiers = new Map();
  return {
    registres, fichiers,
    dir: () => 'C:\\Compta\\data',
    years: async () => Array.from(registres.keys()).map(Number).sort(),
    load: async (y) => (registres.has(String(y)) ? registres.get(String(y)) : null),
    save: async (y, texte, attendu) => {
      const actuel = registres.has(String(y)) ? registres.get(String(y)) : null;
      if (attendu !== undefined && actuel !== null && actuel !== attendu) return { conflit: true, disque: actuel };
      registres.set(String(y), String(texte));
      return true;
    },
    attach: async (y, id, nom, octets) => { fichiers.set(`${y}/${id}/${nom}`, octets); return { name: nom, size: octets.length }; },
    read: async (y, id, nom) => fichiers.get(`${y}/${id}/${nom}`) || null,
    remove: async (y, id, nom) => { fichiers.delete(`${y}/${id}/${nom}`); return true; },
    openDir: () => {},
  };
}

const SRC = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
const pause = (ms) => new Promise((r) => setTimeout(r, ms || 15));

/**
 * Charge la page de saisie dans le document simulé. `reponse` : ce que répond la personne aux
 * questions (confirm). Rend de quoi remplir la fiche, cliquer, et lire ce qui a été enregistré.
 */
async function ficheSimulee(opts) {
  opts = opts || {};
  const doc = documentSimule();
  doc.getElementById('panelAnnee').classList.add('hidden'); // on est dans l'espace Saisie
  const disque = opts.disque || disqueSimule();
  const memoire = new Map();
  const fenetre = new EventTarget();
  const questions = [];
  const ouvertes = [];
  const sandbox = {
    document: doc, console, Event, CustomEvent, Blob, URL,
    // les messages s'effacent seuls au bout de quelques secondes : ils ne doivent pas retenir le test
    setTimeout: (f, ms, ...a) => { const t = setTimeout(f, ms, ...a); if (t.unref) t.unref(); return t; },
    clearTimeout,
    localStorage: {
      getItem: (k) => (memoire.has(k) ? memoire.get(k) : null), setItem: (k, v) => memoire.set(k, String(v)),
      removeItem: (k) => memoire.delete(k), key: (i) => Array.from(memoire.keys())[i] || null, get length() { return memoire.size; },
    },
    confirm: (m) => { questions.push(m); return typeof opts.reponse === 'function' ? opts.reponse(m) : opts.reponse !== false; },
    alert: (m) => { questions.push(m); },
    open: (url) => {
      const w = { closed: false, url, focus() { this.focusee = true; }, close() { this.closed = true; }, location: { replace(u) { w.url = u; } } };
      ouvertes.push(w);
      return w;
    },
    addEventListener: (t, f) => fenetre.addEventListener(t, f),
    removeEventListener: (t, f) => fenetre.removeEventListener(t, f),
    CaisseFiles: disque,
    CaisseApp: opts.app, // aides de app.js (saveBlob…), absentes par défaut
    CaissePdf: { buildPdf: async () => ({ bytes: new Uint8Array([37, 80, 68, 70]), pages: 1, skipped: [] }), recapDescription: (p) => p.libelle || '' },
    CaisseExcel: {},
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  for (const f of ['parser.js', 'registre.js', 'annee.js', 'vocabulaire.js', 'carnet.js', 'combo.js', 'saisie.js']) vm.runInContext(SRC(f), sandbox, { filename: f });
  const S = sandbox.CaisseSaisie;
  for (let i = 0; i < 200 && !(S.state.reg && S.state.photo); i++) await pause(5);
  const el = (id) => doc.getElementById(id);
  /** Le champ visible d'une liste fermée (type, objet). */
  const champ = (id) => el(id).previousElementSibling.querySelector('input');
  /** Un clic sur un bouton que la page a écrit en HTML dans `conteneur` (ligne du journal…). */
  const cliquerDans = (conteneur, donnees) => {
    const b = new El(doc, 'button');
    Object.assign(b.dataset, donnees);
    el(conteneur).appendChild(b);
    const ev = new Event('click', { cancelable: true });
    Object.defineProperty(ev, 'target', { value: b });
    el(conteneur).dispatchEvent(ev);
    b.remove();
  };
  const remplir = (valeurs) => {
    for (const [id, v] of Object.entries(valeurs)) { el(id).value = v; el(id).dispatchEvent(new Event('input')); el(id).dispatchEvent(new Event('change')); }
  };
  const enregistrer = async () => { el('btnPieceSave').click(); await pause(40); };
  const annee = S.state.reg.annee;
  return { S, doc, el, champ, disque, fenetre, questions, ouvertes, cliquerDans, remplir, enregistrer, annee, sandbox };
}

/** Une pièce ordinaire et complète, prête à enregistrer. */
function remplirRemboursement(f, montant) {
  f.remplir({ pPersonne: 'A. Berger', pMontant: montant || '29.70', pCompte: '51000.3662.50' });
}

test('« Nouvelle pièce » demande avant de jeter une fiche remplie', async () => {
  let reponse = false;
  const f = await ficheSimulee({ reponse: () => reponse });
  f.el('btnPieceNew').click();
  assert.equal(f.questions.length, 0, 'une fiche vierge part sans question');
  remplirRemboursement(f);
  f.el('btnPieceNew').click();
  assert.equal(f.questions.length, 1, 'aucune question avant d\'effacer la saisie');
  assert.match(f.questions[0], /n'est pas enregistrée/);
  assert.equal(f.el('pPersonne').value, 'A. Berger', 'Annuler doit laisser la fiche telle quelle');
  reponse = true;
  f.el('btnPieceNew').click();
  assert.equal(f.el('pPersonne').value, '', 'OK abandonne la saisie');
});

test('la fiche dit si elle porte une saisie non enregistrée, et retient la fermeture', async () => {
  const f = await ficheSimulee();
  assert.equal(f.S.ficheModifiee(), false);
  const calme = new Event('beforeunload', { cancelable: true });
  f.fenetre.dispatchEvent(calme);
  assert.equal(calme.defaultPrevented, false, 'une fiche vierge ne retient pas la fenêtre');
  f.remplir({ pDetail: 'musée Bolo', pMontant: '143.95' });
  assert.equal(f.S.ficheModifiee(), true);
  const ev = new Event('beforeunload', { cancelable: true });
  f.fenetre.dispatchEvent(ev);
  assert.equal(ev.defaultPrevented, true, 'fermer ou recharger effacerait la saisie sans rien dire');
  remplirRemboursement(f);
  await f.enregistrer();
  assert.equal(f.S.state.reg.pieces.length, 1);
  assert.equal(f.S.ficheModifiee(), false, 'une fois enregistrée, plus rien à perdre');
});

test('modifier une pièce se voit, se dit sur le bouton, et s\'annule', async () => {
  const f = await ficheSimulee();
  remplirRemboursement(f);
  await f.enregistrer();
  const p = f.S.state.reg.pieces[0];
  f.cliquerDans('journalBody', { edit: p.id });
  assert.ok(f.el('ficheCard').classList.contains('en-modification'), 'la fiche doit montrer qu\'on modifie');
  assert.equal(f.el('btnPieceSaveTexte').textContent, 'Enregistrer les modifications');
  assert.ok(!f.el('ficheMode').classList.contains('hidden'));
  assert.match(f.el('ficheMode').innerHTML, new RegExp(`pièce n° ${p.no}`));
  assert.match(f.el('ficheMode').innerHTML, /Annuler la modification/);
  f.remplir({ pMontant: '450' });
  f.cliquerDans('ficheMode', { annulerModif: '1' });
  assert.equal(f.S.state.editingId, null, 'la fiche revient à une pièce neuve');
  assert.ok(!f.el('ficheCard').classList.contains('en-modification'));
  assert.equal(f.el('btnPieceSaveTexte').textContent, 'Enregistrer la pièce → journal');
  assert.equal(f.S.state.reg.pieces[0].montant, 29.7, 'renoncer ne touche pas à la pièce du journal');
});

test('le crayon d\'une autre ligne ne jette pas une modification en cours sans demander', async () => {
  const f = await ficheSimulee({ reponse: false });
  remplirRemboursement(f, '10');
  await f.enregistrer();
  remplirRemboursement(f, '20');
  await f.enregistrer();
  const [a, b] = f.S.state.reg.pieces;
  f.cliquerDans('journalBody', { edit: a.id });
  f.remplir({ pMontant: '11' });
  f.cliquerDans('journalBody', { edit: b.id });
  assert.equal(f.questions.length, 1);
  assert.equal(f.S.state.editingId, a.id, 'Annuler : on reste sur la pièce en cours');
  assert.equal(f.el('pMontant').value, '11.00');
});

test('un justificatif enregistré retiré en modification ne quitte le disque qu\'à l\'enregistrement', async () => {
  const f = await ficheSimulee();
  remplirRemboursement(f);
  f.S.state.pending.push({ name: 'ticket.pdf', kind: 'pdf', bytes: new Uint8Array([1, 2, 3]) });
  await f.enregistrer();
  const p = f.S.state.reg.pieces[0];
  const cle = `${f.annee}/${p.id}/ticket.pdf`;
  assert.ok(f.disque.fichiers.has(cle));
  f.cliquerDans('journalBody', { edit: p.id });
  f.cliquerDans('pFilesList', { remove: 'saved:ticket.pdf' });
  assert.ok(f.disque.fichiers.has(cle), 'retiré puis abandonné : le ticket était perdu');
  assert.equal(f.S.ficheModifiee(), true);
  f.cliquerDans('ficheMode', { annulerModif: '1' });
  assert.ok(f.disque.fichiers.has(cle));
  assert.equal(f.S.state.reg.pieces[0].justificatifs.length, 1);
  // cette fois on enregistre : le fichier part avec
  f.cliquerDans('journalBody', { edit: p.id });
  f.cliquerDans('pFilesList', { remove: 'saved:ticket.pdf' });
  await f.enregistrer();
  assert.ok(!f.disque.fichiers.has(cle));
  assert.equal(f.S.state.reg.pieces[0].justificatifs.length, 0);
});

/* ------------------------------------------------------------------ */
/* Montant, erreurs de la fiche                                          */
/* ------------------------------------------------------------------ */

test('« 400.– », « 400.- » et « Fr. 400.- » se lisent 400, comme sur la quittance', () => {
  for (const t of ['400.–', '400.-', '400.--', 'Fr. 400.-', '400.', "1'200.–", 'CHF 400.—']) {
    assert.equal(R.parseAmountInput(t), t.startsWith('1') ? 1200 : 400, JSON.stringify(t));
  }
  // ce qui n'est pas un montant le reste
  for (const t of ['400.x', '4OO', '-', '.–', 'quatre cents']) assert.equal(R.parseAmountInput(t), null, JSON.stringify(t));
});

test('un montant illisible n\'est pas annoncé « manquant » : le message dit quoi taper', () => {
  const reg = R.emptyRegister(2026, {});
  const p = R.newPiece(reg);
  Object.assign(p, { date: '2026-03-02', type: 'FRAIS', personne: 'A. Berger', montant: 0, sens: 'credit', compte: '50000.3652.00' });
  const msg = (tape) => R.validateChamps(p, reg, { montantTape: tape }).find((e) => e.champ === 'pMontant').message;
  assert.match(msg('4OO.x'), /« 4OO\.x » n'est pas un montant lisible : tapez par exemple 400/);
  assert.equal(msg(''), 'Montant à indiquer');
  assert.match(msg('-50'), /plus grand que zéro/);
});

test('chaque erreur désigne son champ, et le n° déjà pris propose le numéro libre', () => {
  const reg = R.emptyRegister(2026, {});
  for (const no of [1, 2, 3]) R.upsertPiece(reg, Object.assign(R.newPiece(reg), { no }));
  const p = Object.assign(R.newPiece(reg), { no: 1, date: '2025-12-30', personne: '' });
  const errs = R.validateChamps(p, reg, {});
  const de = (champ) => errs.find((e) => e.champ === champ);
  assert.equal(de('pNo').libre, 4);
  assert.match(de('pNo').message, /le prochain numéro libre est le 4/);
  assert.match(de('pDate').message, /« L'année »/, 'dire où changer d\'année');
  assert.ok(de('pPersonne'));
  assert.ok(de('pCompte'));
  // le texte seul, pour qui n'a pas besoin du champ, reste le même
  assert.deepEqual(R.validate(p, reg), errs.map((e) => e.message));
});

test('la fiche enregistre « 400.– » et montre 400.00 en quittant le champ', async () => {
  const f = await ficheSimulee();
  f.remplir({ pPersonne: 'A. Berger', pCompte: '51000.3662.50', pMontant: '400.–' });
  assert.equal(f.el('pMontant').value, '400.00', 'le montant compris doit se voir');
  f.el('pMontant').value = 'Fr. 400.-'; // tapé puis enregistré sans quitter le champ
  await f.enregistrer();
  assert.equal(f.S.state.reg.pieces.length, 1, f.el('ficheErrors').innerHTML);
  assert.equal(f.S.state.reg.pieces[0].montant, 400);
});

test('les erreurs se posent sur leurs champs et s\'en vont quand on les corrige', async () => {
  const f = await ficheSimulee();
  f.remplir({ pCompte: '51000.3662.50', pMontant: '4OO' });
  await f.enregistrer();
  assert.equal(f.S.state.reg.pieces.length, 0);
  assert.ok(f.el('pMontant').classList.contains('champ-erreur'));
  assert.ok(f.el('pPersonne').classList.contains('champ-erreur'));
  assert.match(f.el('ficheErrors').innerHTML, /pas un montant lisible/);
  assert.equal(f.doc.activeElement, f.el('pMontant'), 'le curseur va au premier champ en cause');
  f.remplir({ pMontant: '40' });
  f.el('ficheCard').dispatchEvent(new Event('input')); // la frappe remonte jusqu'à la fiche
  assert.ok(!f.el('pMontant').classList.contains('champ-erreur'), 'corrigé, le champ ne doit plus être en rouge');
  assert.doesNotMatch(f.el('ficheErrors').innerHTML, /montant/i);
  assert.match(f.el('ficheErrors').innerHTML, /Personne/);
  f.remplir({ pPersonne: 'A. Berger' });
  f.el('ficheCard').dispatchEvent(new Event('input'));
  assert.equal(f.el('ficheErrors').innerHTML, '', 'tout est corrigé : le cadre rouge disparaît');
});

test('« Prendre le n° » pose le numéro libre proposé', async () => {
  const f = await ficheSimulee();
  remplirRemboursement(f);
  await f.enregistrer();
  remplirRemboursement(f);
  f.remplir({ pNo: '1' });
  await f.enregistrer();
  assert.match(f.el('ficheErrors').innerHTML, /data-prendre-no="2"/);
  f.cliquerDans('ficheErrors', { prendreNo: '2' });
  assert.equal(f.el('pNo').value, '2');
  await f.enregistrer();
  assert.equal(f.S.state.reg.pieces.length, 2);
});

/* ------------------------------------------------------------------ */
/* Choix du compte                                                      */
/* ------------------------------------------------------------------ */

const VOCAB = require('../src/vocabulaire.js');
const pieceDe = (over) => { const reg = R.emptyRegister(2026, {}); return { reg, p: Object.assign(R.newPiece(reg), over) }; };

test('un compte n\'est rempli d\'office que s\'il s\'impose pour ce genre de pièce', () => {
  const imp = (over) => { const { p, reg } = pieceDe(over); const x = R.compteImpose(p, VOCAB, reg); return x && x.compte; };
  // un remboursement sans objet : 51000.3170.05 ne sert qu'une fois sur six, on ne le devine pas
  assert.equal(imp({ type: 'REMBOURSEMENT', objet: 'Autre' }), null);
  // un décompte de course d'école : presque toujours le même compte
  assert.equal(imp({ type: 'DECOMPTE', objet: "Course d'école", classe: '5P/3' }), '51000.3662.00');
  // l'objet départage : une collation va toujours au même compte
  assert.equal(imp({ type: 'REMBOURSEMENT', objet: 'Collation' }), '51000.3662.50');
});

test('les comptes d\'un même type se distinguent par leurs objets et par un exemple réel', () => {
  const { p, reg } = pieceDe({ type: 'REMBOURSEMENT', objet: 'Autre' });
  const avant = [Object.assign(R.newPiece(reg), { date: '2025-11-03', type: 'REMBOURSEMENT', objet: 'Collation', detail: 'du chœur', compte: '51000.3662.50' })];
  const l = R.accountChoices(p, VOCAB, reg, { pieces: avant });
  const de = (c) => l.find((x) => x.compte === c);
  assert.ok(de('50000.3652.00').objets.includes('Repas'));
  assert.deepEqual(de('51000.3170.05').objets, [], 'employé pour ce type, jamais avec un objet précis');
  assert.equal(de('52000.3662.40').objets, null, 'jamais employé pour un remboursement');
  assert.equal(de('51000.3662.50').exemple, 'Collation du chœur', 'un exemple tiré de l\'année d\'avant');
  // l'année en cours passe devant : c'est l'exemple le plus récent
  R.upsertPiece(reg, Object.assign(R.newPiece(reg), { no: 1, date: '2026-02-10', type: 'REMBOURSEMENT', objet: 'Repas', detail: 'fête des jubilaires', compte: '51000.3662.50' }));
  assert.equal(R.accountChoices(p, VOCAB, reg, { pieces: avant }).find((x) => x.compte === '51000.3662.50').exemple, 'Repas fête des jubilaires');
});

test('la fiche ne remplit plus un compte au hasard, et sa liste distingue les comptes', async () => {
  const f = await ficheSimulee();
  assert.equal(f.el('pType').value, 'REMBOURSEMENT');
  assert.equal(f.el('pCompte').value, '', 'un compte pris une fois sur six ne doit pas être rempli d\'office');
  assert.match(f.el('pCompteSugg').innerHTML, /Plusieurs comptes servent pour ce type/);
  assert.match(f.el('pCompteSugg').innerHTML, /Choisir l'objet/);
  // la liste : les descriptions ne se répètent plus toutes
  f.el('pCompte').click();
  const pop = f.el('pCompte').parentNode.children.find((c) => c.classList.contains('combo-pop'));
  const descriptions = Array.from(pop.innerHTML.matchAll(/<span class="u">([^<]*)<\/span>/g)).map((m) => m[1]).slice(0, 9);
  assert.ok(new Set(descriptions).size >= 6, `descriptions trop semblables : ${descriptions.join(' | ')}`);
  assert.ok(!descriptions.every((d) => /REMBOURSEMENT/.test(d)));
  // choisir l'objet Collation propose le compte qui s'impose
  const objet = f.champ('pObjet');
  taper(objet, 'Collation');
  touche(objet, 'Tab');
  assert.equal(f.el('pCompte').value, '51000.3662.50');
  assert.match(f.el('pCompteSugg').innerHTML, /proposé : employé 6 fois sur 6/);
});

/* ------------------------------------------------------------------ */
/* Plusieurs postes sur le même registre, lots scannés                    */
/* ------------------------------------------------------------------ */

test('relire le registre reprend les pièces d\'un autre poste, sans conflit ensuite', async () => {
  const disque = disqueSimule();
  const A = R.fileStorage(disque); const B = R.fileStorage(disque);
  const regA0 = R.emptyRegister(2026, {});
  await A.save(regA0);
  const regA = (await A.loadStored(2026)).reg;
  const regB = (await B.loadStored(2026)).reg;
  assert.equal(await A.relire(regA), null, 'rien de neuf : rien à reprendre');
  R.upsertPiece(regB, Object.assign(R.newPiece(regB), { no: 1, type: 'RECETTE', personne: 'T. Morel', montant: 20, sens: 'debit', compte: '9206.101' }));
  await B.save(regB);
  const r = await A.relire(regA);
  assert.deepEqual(r.ajoutees.map((p) => p.no), [1]);
  assert.equal(R.nextNo(regA), 2, 'le poste A proposait encore le n° 1');
  // A enregistre ensuite sans fusion : il part de ce qu'il vient de relire
  R.upsertPiece(regA, Object.assign(R.newPiece(regA), { no: 2, personne: 'A. Berger', montant: 5, sens: 'credit', compte: '51000.3662.50' }));
  const res = await A.save(regA);
  assert.equal(res.fusion, null);
  assert.deepEqual(R.parse(disque.registres.get('2026')).pieces.map((p) => p.no), [1, 2]);
});

test('deux postes : le n° pris ailleurs entre-temps est changé et dit AVANT d\'enregistrer', async () => {
  const disque = disqueSimule();
  const posteA = await ficheSimulee({ disque });
  const posteB = await ficheSimulee({ disque });
  assert.equal(posteA.el('pNo').value, '1');
  assert.equal(posteB.el('pNo').value, '1');
  remplirRemboursement(posteB);
  await posteB.enregistrer();
  remplirRemboursement(posteA, '12');
  posteA.ouvertes.length = 0;
  await posteA.enregistrer();
  assert.equal(posteA.S.state.reg.pieces.filter((p) => p.personne === 'A. Berger' && p.montant === 12).length, 0, 'rien ne doit être écrit avec un n° en double');
  assert.equal(posteA.el('pNo').value, '2');
  assert.match(posteA.el('ficheErrors').innerHTML, /Le n° 1 vient d&#39;être pris sur un autre poste : cette pièce prend le n° 2/);
  assert.equal(posteA.ouvertes.length, 0, 'aucune fiche PDF ne doit s\'imprimer avec l\'ancien n°');
  assert.equal(posteA.el('pMontant').value, '12.00', 'la saisie est gardée');
  await posteA.enregistrer();
  const nos = R.parse(disque.registres.get(String(posteA.annee))).pieces.map((p) => p.no).sort();
  assert.deepEqual(nos, [1, 2], 'deux pièces, deux numéros');
});

test('revenir à la fenêtre relit le registre : le journal et le n° proposé suivent', async () => {
  const disque = disqueSimule();
  const posteA = await ficheSimulee({ disque });
  const posteB = await ficheSimulee({ disque });
  remplirRemboursement(posteB);
  await posteB.enregistrer();
  posteA.fenetre.dispatchEvent(new Event('focus'));
  await pause(40);
  assert.equal(posteA.S.state.reg.pieces.length, 1);
  assert.equal(posteA.el('pNo').value, '2');
  assert.match(posteA.el('regNotices').children[0].innerHTML, /1 pièce saisie sur un autre poste a été ajoutée au journal \(n° 1\)/);
  assert.equal(posteA.S.ficheModifiee(), false, 'un n° changé par l\'application n\'est pas une saisie');
});

test('après un lot scanné, la fiche propose le n° libre et garde ce qui y est tapé', async () => {
  const f = await ficheSimulee();
  assert.equal(f.el('pNo').value, '1');
  const lot = [1, 2, 3].map((no) => ({ scanKey: `d:${no}:0`, no, date: `${f.annee}-03-0${no}`, compte: '51000.3662.50', libelle: 'REMBOURSEMENT - Collation - A. Berger', credit: 10 + no }));
  // comme le fait l'espace des pièces scannées (app.js) : verser, enregistrer, redessiner
  R.syncScanBatch(f.S.state.reg, lot);
  await f.S.saveReg();
  f.S.renderJournal();
  assert.equal(f.el('pNo').value, '4', 'la fiche proposait encore le n° 1, déjà pris');
  // une fiche en cours n'est pas vidée par un versement, et son n° suit aussi
  f.remplir({ pDetail: 'musée Bolo', pMontant: '143.95' });
  await f.S.addFromScan([{ no: 4, date: `${f.annee}-03-09`, compte: '51000.3662.50', libelle: 'REMBOURSEMENT - Collation - T. Morel', credit: 8 }]);
  assert.equal(f.el('pDetail').value, 'musée Bolo');
  assert.equal(f.el('pNo').value, '5');
});

test('un n° tapé à la main n\'est pas changé en douce', async () => {
  const f = await ficheSimulee();
  f.remplir({ pNo: '40' });
  R.upsertPiece(f.S.state.reg, Object.assign(R.newPiece(f.S.state.reg), { no: 1 }));
  f.S.renderJournal();
  assert.equal(f.el('pNo').value, '40');
});

/* ------------------------------------------------------------------ */
/* La fiche à imprimer                                                   */
/* ------------------------------------------------------------------ */

test('les fiches à imprimer se remplacent dans une seule fenêtre, qui ne reprend pas la main', async () => {
  const f = await ficheSimulee();
  remplirRemboursement(f, '10');
  await f.enregistrer();
  assert.equal(f.ouvertes.length, 1, 'la première fiche s\'ouvre pour être imprimée');
  const w = f.ouvertes[0];
  const premiere = w.url;
  assert.match(premiere, /^blob:/);
  remplirRemboursement(f, '20');
  await f.enregistrer();
  remplirRemboursement(f, '30');
  await f.enregistrer();
  assert.equal(f.S.state.reg.pieces.length, 3);
  assert.equal(f.ouvertes.length, 1, 'une fenêtre de plus à chaque pièce : dix pièces, dix fenêtres');
  assert.notEqual(w.url, premiere, 'la fiche de la dernière pièce remplace la précédente');
  assert.ok(!w.focusee, 'la saisie en série au clavier ne doit pas partir dans la fenêtre PDF');
  // fermée par la personne : la suivante en rouvre une
  w.closed = true;
  remplirRemboursement(f, '40');
  await f.enregistrer();
  assert.equal(f.ouvertes.length, 2);
});

test('l\'imprimante d\'une ligne du journal imprime, sans boîte « Enregistrer sous »', async () => {
  let enregistrerSous = 0;
  const f = await ficheSimulee({ app: { saveBlob: async () => { enregistrerSous++; return 'cancelled'; } } });
  f.el('optPdfAuto').checked = false;
  f.el('optPdfAuto').dispatchEvent(new Event('change'));
  remplirRemboursement(f);
  await f.enregistrer();
  assert.equal(f.ouvertes.length, 0);
  f.cliquerDans('journalBody', { pdf: f.S.state.reg.pieces[0].id });
  await pause(30);
  assert.equal(enregistrerSous, 0);
  assert.equal(f.ouvertes.length, 1);
  assert.ok(f.ouvertes[0].focusee, 'demandée à la main, la fiche vient devant');
});

/* ------------------------------------------------------------------ */
/* Justificatifs, suppression, vocabulaire, décompte, mise en page        */
/* ------------------------------------------------------------------ */

/** Un fichier comme le donne le navigateur (glissé ou choisi). */
const fichier = (name, octets) => ({ name, arrayBuffer: async () => new Uint8Array(octets || [1, 2, 3]).buffer });
/** Un clic sur un bouton d'un message : il remonte jusqu'au document. */
function cliquerMessage(f, donnees) {
  const b = new El(f.doc, 'button');
  Object.assign(b.dataset, donnees);
  const m = new El(f.doc, 'div'); m.className = 'notice';
  m.appendChild(b); f.el('regNotices').appendChild(m);
  const ev = new Event('click', { cancelable: true });
  Object.defineProperty(ev, 'target', { value: b });
  f.doc.dispatchEvent(ev);
}

test('joindre un justificatif : un bouton en français, le glisser-déposer, et le compte des fichiers', async () => {
  const f = await ficheSimulee();
  let choisir = 0;
  f.el('pFiles').addEventListener('click', () => { choisir++; });
  f.el('btnJoindre').click();
  assert.equal(choisir, 1, 'le bouton ouvre le choix de fichiers');
  assert.match(f.el('pFilesCompte').textContent, /Aucun pour l'instant/);
  assert.equal(f.el('pFilesList').innerHTML, '', 'plus de phrase qui répète l\'étiquette');
  const depot = new Event('drop', { cancelable: true });
  depot.dataTransfer = { types: ['Files'], files: [fichier('ticket-migros.pdf')] };
  f.el('ficheCard').dispatchEvent(depot);
  await pause(20);
  assert.ok(depot.defaultPrevented, 'le navigateur ne doit pas ouvrir le fichier à la place de la page');
  assert.equal(f.S.state.pending.length, 1);
  assert.equal(f.el('pFilesCompte').textContent, '1 justificatif joint');
  assert.match(f.el('pFilesList').innerHTML, /ticket-migros\.pdf/);
});

test('une pièce supprimée se rattrape, justificatifs compris', async () => {
  const f = await ficheSimulee();
  remplirRemboursement(f, '10');
  await f.enregistrer();
  remplirRemboursement(f, '20');
  f.S.state.pending.push({ name: 'ticket.pdf', kind: 'pdf', bytes: new Uint8Array([7, 8, 9]) });
  await f.enregistrer();
  remplirRemboursement(f, '30');
  await f.enregistrer();
  const p2 = f.S.state.reg.pieces.find((p) => p.no === 2);
  f.cliquerDans('journalBody', { del: p2.id });
  await pause(40);
  assert.equal(f.S.state.reg.pieces.length, 2);
  const message = f.el('regNotices').children[0].innerHTML;
  assert.match(message, /Pièce n° 2 supprimée/, 'supprimer ne disait rien');
  assert.match(message, /data-annuler-suppression/);
  assert.match(message, /Donner le n° 2 à la fiche/, 'le n° libéré au milieu de la suite est offert');
  assert.match(f.el('journalNumbers').innerHTML, /ou une pièce supprimée \?/);
  cliquerMessage(f, { annulerSuppression: p2.id });
  await pause(40);
  const revenue = f.S.state.reg.pieces.find((p) => p.id === p2.id);
  assert.ok(revenue, 'la pièce revient');
  assert.equal(revenue.no, 2);
  assert.equal(revenue.montant, 20);
  assert.ok(f.disque.fichiers.has(`${f.annee}/${p2.id}/ticket.pdf`), 'son justificatif aussi');
  assert.equal(R.parse(f.disque.registres.get(String(f.annee))).pieces.length, 3, 'et c\'est enregistré');
});

test('« Donner le n° à la fiche » propose le numéro libéré', async () => {
  const f = await ficheSimulee();
  for (const m of ['10', '20', '30']) { remplirRemboursement(f, m); await f.enregistrer(); }
  const p2 = f.S.state.reg.pieces.find((p) => p.no === 2);
  f.cliquerDans('journalBody', { del: p2.id });
  await pause(40);
  assert.equal(f.el('pNo').value, '4');
  cliquerMessage(f, { donnerNo: '2' });
  assert.equal(f.el('pNo').value, '2');
  assert.equal(f.S.ficheModifiee(), false, 'c\'est l\'application qui propose, rien n\'est encore saisi');
});

test('le sens se dit d\'après le type, et l\'étiquette Personne dit qui reçoit ou remet l\'argent', async () => {
  const f = await ficheSimulee();
  assert.match(f.el('pSensHint').textContent, /^Sens déduit du type d'écriture : REMBOURSEMENT = sortie de caisse/);
  assert.equal(f.el('pPersonneLabel').textContent, "Personne qui reçoit l'argent (initiale et nom)");
  const type = f.champ('pType');
  taper(type, 'RECETTE');
  touche(type, 'Tab');
  assert.equal(f.el('pPersonneLabel').textContent, "Personne qui remet l'argent (initiale et nom)");
  taper(type, 'DECOMPTE');
  touche(type, 'Tab');
  assert.equal(f.el('pPersonneLabel').textContent, 'Personne (initiale et nom)', 'un décompte va dans les deux sens');
  // la liste des types explique ceux qui prêtent à confusion
  type.click();
  const pop = type.parentNode.children.find((c) => c.classList.contains('combo-pop'));
  assert.match(pop.innerHTML, /RETRAIT<\/b><span class="u">entrée en caisse : argent retiré à la banque/);
});

test('un décompte repris dit quel montant choisir, juste sous le montant', async () => {
  const f = await ficheSimulee();
  const d = { id: 'd1', numero: 'D-7', type_activite: 'course', classe: '5P/3', activite: 'Lausanne', enseignant: 'L. Duvernay',
    date_debut: `12.06.${f.annee}`, form_total: 658.1, total: 55.9, form_expenses: [{ paye_enseignant: 54.6 }] };
  f.S.useDecompte(d);
  const aide = f.el('pMontantAide');
  assert.ok(!aide.classList.contains('hidden'));
  assert.match(aide.innerHTML, /Quel montant \?<\/b> Celui qui sort réellement de la caisse/);
  assert.match(aide.innerHTML, /La part État est ce que la DGEO rendra à la commune/);
  assert.match(f.el('ficheMode').innerHTML, /Fiche pré-remplie depuis le décompte/);
  assert.equal(f.el('ficheErrors').innerHTML, '', 'l\'avis n\'est plus sous la fiche, loin du montant');
  f.cliquerDans('pMontantAide', { amount: '658.1' });
  assert.equal(f.el('pMontant').value, '658.10');
  f.S.state.photo = null; // on abandonne sans question
  f.el('btnPieceNew').click();
  assert.ok(aide.classList.contains('hidden'), 'l\'aide ne vaut que pour le décompte');
});

test('la fiche : exemples marqués « ex. », facultatifs dits, l\'essentiel d\'abord', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
  const fiche = html.slice(html.indexOf('id="ficheCard"'), html.indexOf('id="journalCard"'));
  const ph = (id) => (new RegExp(`id="${id}"[^>]*placeholder="([^"]*)"`).exec(fiche) || new RegExp(`placeholder="([^"]*)"[^>]*id="${id}"`).exec(fiche) || [])[1];
  for (const id of ['pPersonne', 'pClasse', 'pPeriode', 'pDetail', 'pMontant']) assert.match(ph(id) || '', /^ex\. /, `${id} : un exemple sans « ex. » passe pour une valeur`);
  for (const id of ['pClasse', 'pPeriode', 'pDetail']) assert.match(fiche, new RegExp(`for="${id}"[^<]*(<[^>]*>[^<]*)*?\\(facultatif\\)`), `${id} devrait être dit facultatif`);
  assert.ok(fiche.indexOf('id="pPersonne"') < fiche.indexOf('id="pClasse"'), 'Personne et Montant passent avant les champs facultatifs');
  assert.ok(!/type="file" id="pFiles"(?![^>]*class="hidden")/.test(fiche), 'le bouton de fichier du navigateur (en anglais) est caché');
  const journal = html.slice(html.indexOf('id="journalCard"'));
  assert.ok(journal.indexOf('for="regPdfFrom"') < journal.indexOf('id="regPdfFrom"') && journal.indexOf('id="regPdfFrom"') < journal.indexOf('id="btnRegPdf"'),
    'on choisit les pièces à imprimer avant de cliquer');
});

