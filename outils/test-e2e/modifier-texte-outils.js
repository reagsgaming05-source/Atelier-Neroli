// Ce qu'il faut pour juger « Modifier le texte existant » avec des outils qui ne sont pas les nôtres : poppler lit les mots et le rendu du PDF produit,
// qpdf montre ce qui reste dans ses octets. Les scénarios (modifier-texte.spec.js) jouent la correction dans l'application, comme un utilisateur,
// puis demandent à ces outils si la page est telle qu'elle doit être : le nouveau texte est là, l'ancien n'y est plus, et rien d'autre n'a bougé.
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CORPUS = path.join(__dirname, 'fixtures', 'texte');

function outil(cmd, args, opts) {
  const r = spawnSync(cmd, args, Object.assign({ encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }, opts || {}));
  if (r.error) {
    if (r.error.code === 'ENOENT') throw new Error(cmd + ' est requis par ces scénarios (poppler-utils, qpdf) : il manque sur ce poste.');
    throw r.error;
  }
  return r;
}

const decoder = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

// Un PDF écrit sur le disque (les outils lisent des fichiers) ; `nettoyer()` les retire tous.
const temporaires = [];
function ecrire(octets, nom) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-texte-'));
  temporaires.push(dossier);
  const f = path.join(dossier, nom || 'page.pdf');
  fs.writeFileSync(f, octets);
  return f;
}
function nettoyer() { while (temporaires.length) fs.rmSync(temporaires.pop(), { recursive: true, force: true }); }

// Les mots de la page, en points, origine en haut à gauche, dans le sens où on la lit (une page tournée par /Rotate est rendue droite).
function mots(f, p) {
  p = p || 1;
  const x = outil('pdftotext', ['-bbox', '-f', String(p), '-l', String(p), f, '-']).stdout;
  const page = /<page width="([\d.]+)" height="([\d.]+)">/.exec(x);
  let tourne = 0;
  const m = /Page\s+\d+ rot:\s+(\d+)/.exec(outil('pdfinfo', ['-f', String(p), '-l', String(p), f]).stdout);
  if (m) tourne = +m[1];
  const out = [];
  const rx = /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;
  let q;
  while ((q = rx.exec(x))) out.push({ x0: +q[1], y0: +q[2], x1: +q[3], y1: +q[4], t: decoder(q[5]) });
  const w = page ? +page[1] : 595, h = page ? +page[2] : 842;
  return tourne % 180 ? { w: h, h: w, mots: out } : { w, h, mots: out };
}

const texte = (f, p) => outil('pdftotext', ['-layout', '-f', String(p || 1), '-l', String(p || 1), f, '-']).stdout;

// Les octets du fichier, flux décompressés : un ancien texte écrit en clair dans la page s'y lirait encore.
function octets(f) {
  const r = spawnSync('qpdf', ['--qdf', '--object-streams=disable', f, '-'], { maxBuffer: 256 * 1024 * 1024 });
  return r.stdout ? r.stdout.toString('latin1') : '';
}

// Les polices du fichier : leur nom, sans le préfixe de sous-ensemble.
function polices(f) {
  return outil('pdffonts', [f]).stdout.split('\n').slice(2).map(l => l.trim().split(/\s+/)[0]).filter(Boolean).map(n => n.replace(/^[A-Z]{6}\+/, ''));
}
// Familles de même dessin et de mêmes chasses : Arimo (celle du logiciel) = Liberation Sans = Arial = Helvetica.
function famille(nom) {
  const n = String(nom).replace(/[-,](Bold|Italic|Oblique|BoldItalic|BoldOblique|Regular)+(-\d+)?$/i, '').replace(/-\d+$/, '');
  if (/arimo|liberationsans|arial|helvetica|nimbussans/i.test(n)) return 'sans';
  if (/tinos|liberationserif|times|nimbusroman/i.test(n)) return 'serif';
  if (/cousine|liberationmono|courier|nimbusmono/i.test(n)) return 'mono';
  return n;
}

// Le nombre d'images de la page : une page convertie en image n'a plus de texte à sélectionner.
function images(f, p) {
  const l = outil('pdfimages', ['-list', '-f', String(p || 1), '-l', String(p || 1), f]).stdout.split('\n').slice(2).filter(x => x.trim());
  return l.length;
}

// Le rendu d'une page en niveaux de gris.
function rendu(f, p, dpi) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-rendu-'));
  try {
    outil('pdftoppm', ['-gray', '-r', String(dpi), '-f', String(p), '-l', String(p), f, path.join(dossier, 'r')]);
    const fichier = fs.readdirSync(dossier).find(n => /\.pgm$/.test(n));
    const b = fs.readFileSync(path.join(dossier, fichier));
    // « P5 », largeur, hauteur, valeur maximale, une espace, puis les octets
    let i = 0;
    const jeton = () => { while (b[i] === 0x20 || b[i] === 0x0a || b[i] === 0x0d || b[i] === 0x09) i++; let s = ''; while (b[i] > 0x20) s += String.fromCharCode(b[i++]); return s; };
    jeton(); const w = +jeton(), h = +jeton(); jeton(); i++;
    return { w, h, d: b.subarray(i) };
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}

// Combien de points de la page diffèrent entre deux états, hors d'une zone (en points, marge de 4 pt) — et dans la zone.
function pixels(avant, apres, p, zone) {
  const dpi = 144, K = dpi / 72, m = 4;
  const a = rendu(avant, p || 1, dpi), b = rendu(apres, p || 1, dpi);
  if (a.w !== b.w || a.h !== b.h) return { hors: Infinity, dans: Infinity };
  const z = zone ? [zone.x0 - m, zone.y0 - m, zone.x1 + m, zone.y1 + m].map(v => Math.round(v * K)) : [0, 0, 0, 0];
  let hors = 0, dans = 0;
  for (let y = 0; y < a.h; y++) {
    for (let x = 0; x < a.w; x++) {
      const k = y * a.w + x;
      if (Math.abs(a.d[k] - b.d[k]) <= 40) continue;
      if (x >= z[0] && x <= z[2] && y >= z[1] && y <= z[3]) dans++; else hors++;
    }
  }
  return { hors, dans };
}

// Chaque mot de `avant` hors de la zone doit se retrouver, au même endroit, dans `apres`.
function collateral(avant, apres, zone, tol) {
  tol = tol || 0.8;
  const dans = m => m.x1 > zone.x0 - 0.5 && m.x0 < zone.x1 + 0.5 && m.y1 > zone.y0 - 0.5 && m.y0 < zone.y1 + 0.5;
  const pris = new Set();
  const bouges = [], perdus = [];
  avant.forEach(m => {
    if (dans(m)) return;
    let best = -1, bd = 1e9;
    apres.forEach((n, i) => {
      if (pris.has(i) || n.t !== m.t) return;
      const d = Math.hypot(n.x0 - m.x0, n.y0 - m.y0);
      if (d < bd) { bd = d; best = i; }
    });
    if (best < 0) perdus.push(m.t + '@' + m.x0.toFixed(0) + ',' + m.y0.toFixed(0));
    else { pris.add(best); if (bd > tol) bouges.push(m.t + ' (' + bd.toFixed(1) + ' pt)'); }
  });
  return { bouges, perdus };
}

// Les mots qui se recouvrent franchement (plus du quart du plus petit) : ce qui rend un texte illisible.
function chevauchements(ms) {
  const recouvre = (a, b) => {
    const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    if (w <= 0 || h <= 0) return 0;
    return (w * h) / Math.max(0.01, Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0)));
  };
  const out = [];
  for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) if (recouvre(ms[i], ms[j]) > 0.25) out.push(ms[i].t + '/' + ms[j].t);
  return out;
}

const sansPonct = t => t.replace(/[.,;:!?]+$/, '');
// La suite de mots de la page qui forme `cible` (dans l'ordre de lecture de pdftotext) ; `rang` choisit parmi plusieurs occurrences.
function trouver(ms, cible, rang) {
  const voulu = cible.trim().split(/\s+/).map(sansPonct);
  let n = 0;
  for (let i = 0; i + voulu.length <= ms.length; i++) {
    if (voulu.every((v, k) => sansPonct(ms[i + k].t) === v) && (n++ === (rang || 0))) return ms.slice(i, i + voulu.length);
  }
  return null;
}

// La zone où la correction a le droit de changer la page : la ligne du mot visé, `haut` lignes au-dessus et `bas` en dessous, sur toute la largeur
// du texte (`large`) ou de quelques points autour de la ligne (`marge`, la place que le nouveau texte prend en plus).
function zoneDe(page, trouves, opts) {
  opts = opts || {};
  const base = trouves[0];
  const ligne = page.mots.filter(m => Math.abs(m.y1 - base.y1) < 2);
  let x0 = Math.min.apply(null, ligne.map(m => m.x0)), x1 = Math.max.apply(null, ligne.map(m => m.x1));
  let y0 = Math.min.apply(null, ligne.map(m => m.y0)), y1 = Math.max.apply(null, ligne.map(m => m.y1));
  const pas = 14.5;
  y0 -= (opts.haut || 0) * pas; y1 += (opts.bas || 0) * pas;
  if (opts.large) { x0 = Math.min(x0, 50); x1 = Math.max(x1, page.w - 50); }
  x0 -= opts.marge || 0; x1 += opts.marge || 0;
  return { x0, y0, x1, y1 };
}

// Un mot de la page est-il écrit en gras ? (le gras que pdftohtml lit dans le nom de la police du morceau qui le porte)
function enGras(f, mot, p) {
  const x = outil('pdftohtml', ['-xml', '-stdout', '-i', '-noframes', '-f', String(p || 1), '-l', String(p || 1), f]).stdout;
  const ech = mot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('<b>[^<]*' + ech + '[^<]*</b>').test(x);
}

module.exports = { CORPUS, enGras, ecrire, nettoyer, mots, texte, octets, polices, famille, images, pixels, collateral, chevauchements, trouver, zoneDe };
