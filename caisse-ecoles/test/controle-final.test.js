/*
 * Contrôle final après la fusion des six équipes : ce qu'une collègue voit à l'écran.
 *
 * Le vocabulaire d'abord — « journal » partout (plus de « registre »), « Monnaie » pour les
 * pièces de monnaie, « Décompte DGEO », pas d'anglais —, lu dans les textes que le code peut
 * afficher (chaînes des scripts, texte et infobulles des pages), commentaires exclus. Puis ce que
 * la feuille de style promet pour qu'aucune page ne défile en largeur ; la preuve à l'écran, à
 * 1366 × 768, est dans le test de fumée (desktop/smoke-test.js, « contrôle final »).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const lire = (p) => fs.readFileSync(path.join(racine, p), 'utf8');

/**
 * Les chaînes d'un script (entre ' " ou `, gabarits imbriqués compris), sans les commentaires ni
 * les expressions régulières : [{ ligne, texte }].
 */
function chaines(src) {
  const out = [];
  let i = 0; let ligne = 1; let dernier = '';
  const pile = []; let accolades = 0;
  const avance = (c) => { if (c === '\n') ligne++; };
  const lireChaine = (q) => {
    const debut = ligne; let t = ''; i++;
    while (i < src.length && src[i] !== q) {
      if (src[i] === '\\') { t += src[i] + (src[i + 1] || ''); avance(src[i + 1]); i += 2; continue; }
      avance(src[i]); t += src[i]; i++;
    }
    i++;
    out.push({ ligne: debut, texte: t });
  };
  // du début d'un gabarit (ou de la fin d'un ${ }) jusqu'au ` final ou au ${ suivant
  const lireGabarit = () => {
    const debut = ligne; let t = '';
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') { t += c + (src[i + 1] || ''); avance(src[i + 1]); i += 2; continue; }
      if (c === '`') { i++; out.push({ ligne: debut, texte: t }); return false; }
      if (c === '$' && src[i + 1] === '{') { i += 2; out.push({ ligne: debut, texte: t }); return true; }
      avance(c); t += c; i++;
    }
    out.push({ ligne: debut, texte: t });
    return false;
  };
  while (i < src.length) {
    const c = src[i]; const d = src[i + 1];
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { avance(src[i]); i++; } i += 2; continue; }
    if (c === '\'' || c === '"') { lireChaine(c); dernier = 'x'; continue; }
    if (c === '`') { i++; if (lireGabarit()) { pile.push(accolades); accolades++; } dernier = 'x'; continue; }
    if (c === '/' && (dernier === '' || '(,=:[!&|?{};+-*%<>~^'.includes(dernier) || /\b(return|typeof)$/.test(src.slice(Math.max(0, i - 8), i).trim()))) {
      i++; let classe = false;
      while (i < src.length) { const e = src[i]; if (e === '\\') { i += 2; continue; } if (e === '[') classe = true; else if (e === ']') classe = false; else if ((e === '/' && !classe) || e === '\n') break; i++; }
      i++; while (/[a-z]/i.test(src[i] || '')) i++;
      dernier = 'x'; continue;
    }
    if (c === '{') accolades++;
    if (c === '}') {
      accolades--;
      if (pile.length && accolades === pile[pile.length - 1]) { pile.pop(); i++; if (lireGabarit()) { pile.push(accolades); accolades++; } dernier = 'x'; continue; }
    }
    avance(c);
    if (!/\s/.test(c)) dernier = c;
    i++;
  }
  return out;
}

/** Ce qu'une page HTML montre : son texte, ses infobulles, ses exemples, ses noms pour lecteur d'écran. */
function texteDePage(html) {
  const sans = html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');
  const attributs = Array.from(sans.matchAll(/\s(?:title|placeholder|aria-label|alt)="([^"]*)"/g)).map((m) => m[1]);
  return sans.replace(/<[^>]*>/g, ' ').concat(' ', attributs.join(' ')).replace(/\s+/g, ' ');
}

const SCRIPTS = [
  ...fs.readdirSync(path.join(racine, 'src')).filter((f) => f.endsWith('.js')).map((f) => `src/${f}`),
  ...['main.js', 'dialogues.js', 'emplacement.js', 'veille.js', 'preload.js', 'lanceur.js', 'dgeo-proxy.js', 'boites-preload.js'].map((f) => `desktop/${f}`),
];

/** Les chaînes « registre » qui ne s'affichent pas : noms de fichiers, clés, sélecteurs, identifiants. */
const REGISTRE_TECHNIQUE = [
  /^registre$/, /^caisse:registre$/, /^caisse\.registre\.annee$/, /^caisse\.registre\.$/, /^\.\/registre\.js$/,
  /^registre illisible$/, // code d'erreur interne (saisie.js dit la chose avec ses mots)
  /^button\[data-act="toRegistre"\]$/,
  /^Registre caisse $/, // début du nom de fichier de la copie de sécurité (annee.js), gardé tel quel
  /^registre $/, // ligne du fichier de suivi technique (main.js)
];
/** « registre », seul ou au pluriel, hors des noms de fichiers « registre.json » / « registre.bak.json ». */
const REGISTRE = /(^|[^A-Za-zÀ-ÿ])[Rr]egistres?(?![A-Za-zÀ-ÿ.])/;

test('à l\'écran, on dit « journal » : plus de « registre » dans les textes affichés', () => {
  const trouves = [];
  for (const f of SCRIPTS) {
    for (const c of chaines(lire(f))) {
      const t = c.texte.replace(/registre(\.bak)?\.json/g, '');
      if (REGISTRE.test(t) && !REGISTRE_TECHNIQUE.some((r) => r.test(c.texte))) trouves.push(`${f}:${c.ligne} « ${c.texte.slice(0, 90)} »`);
    }
  }
  for (const f of ['src/index.html', 'desktop/shell.html']) {
    const t = texteDePage(lire(f));
    const m = t.match(new RegExp(`.{0,50}${REGISTRE.source}.{0,30}`, 'g'));
    if (m) trouves.push(...m.map((x) => `${f} « ${x.trim()} »`));
  }
  assert.deepEqual(trouves, []);
});

test('le mode d\'emploi livré dit « journal », lui aussi', () => {
  assert.doesNotMatch(lire('desktop/build/LISEZMOI-portable.txt'), /\bregistres?\b/i);
});

test('Compter la caisse dit « Monnaie » pour les pièces de monnaie : « pièce » est la pièce comptable', () => {
  const textes = chaines(lire('src/comptage.js')).map((c) => c.texte);
  // (« la pièce n° 12 » du journal, dans les pistes d'un écart, reste une pièce comptable)
  const piecesDeMonnaie = [/^Pièce$/, /^pièces$/, /billets et les pièces/, /\ben pièces\)/, /aucune pièce compté/];
  assert.deepEqual(textes.filter((t) => piecesDeMonnaie.some((r) => r.test(t))), []);
  // la ligne d'une coupure : « Billet 20 CHF » ou « Monnaie 2 CHF »
  assert.ok(textes.some((t) => t === 'Monnaie'), 'la ligne des pièces de monnaie dit « Monnaie »');
  const html = lire('src/index.html');
  const espace = html.slice(html.indexOf('<div id="panelCaisse"'), html.indexOf('<div id="panelReception"'));
  assert.doesNotMatch(texteDePage(espace), /billets et les pièces/);
  assert.match(texteDePage(espace), /Comptez les billets et la monnaie/);
});

test('Décompte DGEO porte son nom dès le démarrage', () => {
  const textes = chaines(lire('desktop/main.js')).map((c) => c.texte);
  assert.ok(!textes.some((t) => /logiciel de décompte/i.test(t)), 'la page d\'attente parle d\'un « logiciel de décompte »');
  assert.ok(textes.includes('Démarrage de Décompte DGEO…'));
});

test('aucun champ « fichier » du navigateur à l\'écran : son bouton dirait « Choose File », en anglais', () => {
  const html = lire('src/index.html');
  const champs = html.match(/<input[^>]*type="file"[^>]*>/g) || [];
  assert.ok(champs.length >= 6);
  for (const c of champs) assert.match(c, /class="[^"]*\bhidden\b|\shidden[\s>]/, `champ visible : ${c}`);
  // celui du classeur Excel de Pièces scannées a son bouton en français
  assert.match(html, /id="btnPickXlsx"[^>]*>[\s\S]*?Choisir le classeur Excel…<\/button>/);
  assert.match(lire('src/app.js'), /btnPickXlsx\.addEventListener\('click', \(\) => els\.xlsxFile\.click\(\)\)/);
});

/* ---------------------------------------------------------------- feuille de style */

const css = () => lire('src/app.css');
/** Toutes les déclarations d'une propriété pour un sélecteur exact, dans l'ordre de la feuille (hors @media). */
function declarations(feuille, selecteur, propriete) {
  const horsMedia = feuille.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media[^{]*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, '');
  const esc = selecteur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const out = [];
  for (const m of horsMedia.matchAll(new RegExp(`(?<=^|\\})\\s*${esc}\\s*\\{([^}]*)\\}`, 'g'))) {
    const d = new RegExp(`(?:^|;)\\s*${propriete}\\s*:\\s*([^;]+)`).exec(m[1]);
    if (d) out.push(d[1].trim());
  }
  return out;
}

test('la Saisie des pièces ne pousse plus la page en largeur : la grille ne prend pas la largeur du journal', () => {
  const col = declarations(css(), '.layout2', 'grid-template-columns');
  assert.ok(col.length, 'règle .layout2 introuvable : la feuille a changé, ce test doit suivre');
  assert.match(col[col.length - 1], /^minmax\(0,\s*1fr\)$/, 'un « 1fr » seul prend la largeur minimale du journal');
});

test('le libellé du journal se coupe (…) au lieu d\'élargir le tableau', () => {
  const mw = declarations(css(), 'table.entries.journal td.libelle', 'max-width');
  assert.equal(mw[mw.length - 1], '0', 'dans un tableau, max-width: 520px ne retient pas la cellule');
});

test('le bouton Enregistrer de la fiche reste au-dessus des messages', () => {
  const b = declarations(css(), '#ficheActions', 'bottom');
  assert.match(b[b.length - 1], /var\(--avis-h/, 'la barre collée en bas passait sous la zone des messages');
});

test('Pièces scannées, sous 1700 px : tableau resserré et aperçu à côté, rien qui dépasse à 1366 px', () => {
  const f = css();
  const m = /@media \(max-width: 1700px\) \{([\s\S]*?)\n\}/.exec(f);
  assert.ok(m, 'bloc @media (max-width: 1700px) introuvable');
  const corps = m[1];
  const px = (re) => { const x = re.exec(corps); assert.ok(x, `${re} introuvable`); return Number(x[1]); };
  const apercu = px(/\.layout \{ grid-template-columns: minmax\(0, 1fr\) (\d+)px; gap: (?:\d+)px; \}/);
  const ecart = px(/\.layout \{ grid-template-columns: minmax\(0, 1fr\) \d+px; gap: (\d+)px; \}/);
  assert.ok(apercu >= 280, 'l\'aperçu doit rester lisible à côté de la ligne');
  // Largeur disponible à 1366 px (fenêtre agrandie, barre de défilement de 15 px), barre latérale
  // de 212 px, marges de la page (2 × 30) et de la carte resserrée (2 × 16, bords 2) : le tableau
  // doit tenir dans ce qui reste à côté de l'aperçu. Sa largeur minimale, relevée à l'écran avec
  // ces réglages (dates, comptes et montants lisibles en entier), est de 723 px ; on vérifie la
  // marge prise par le calcul, pas le navigateur.
  const disponible = 1366 - 15 - 212 - 60 - 34 - ecart - apercu;
  assert.ok(disponible >= 723 + 20, `il reste ${disponible} px au tableau à 1366 px`);
  for (const sel of ['#entriesTable input.date', '#entriesTable input.compte', '#entriesTable input.num', '#entriesTable td.libelle']) {
    assert.ok(corps.includes(sel), `${sel} n'est plus resserré`);
  }
});
