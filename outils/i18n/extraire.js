// Relève, dans le code de la page, tous les textes que l'utilisateur peut lire : les phrases écrites
// en toutes lettres (littéraux), et celles que le code assemble par morceaux (« 'Page ' + n + ' sur ' + total »,
// dont on garde le motif « Page {0} sur {1} »). C'est la matière du dictionnaire français → allemand,
// et ce que le test de complétude confronte à lui : un texte qui apparaît ici sans traduction fait échouer
// la construction, au lieu de s'afficher en français dans une interface allemande.
//
//   node i18n/extraire.js            écrit i18n/textes.json
//   require('./extraire').relever()  pour le test
const fs = require('fs');
const path = require('path');
const acorn = require(path.join(__dirname, '..', 'libs', 'acorn-8.14.1', 'dist', 'acorn.js'));
const SRC = path.join(__dirname, '..', 'src');
// Les modules JavaScript, dans l'ordre de leurs numéros : le corps de la page, comme l'assemble assembler.js.
const modules = () => fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(SRC, f), 'utf8').replace(/\r\n/g, '\n')).join('\n');

// Un texte « pour humain » : pas un sélecteur, une classe, un type MIME, une expression régulière…
function estUnTexte(s) {
  const t = s.trim();
  if (t.length < 2 || !/[A-Za-zÀ-ÿ]/.test(t)) return false;
  if (/^(https?:|data:|blob:|file:|#|\.|\/|\[|<)/.test(t)) return false;
  if (/^[a-z][a-zA-Z0-9_\-.:\/+=;,*]*$/.test(t) && !/[À-ÿ]/.test(t)) return false;   // identifiant, classe, type MIME, extension
  if (!/[a-zà-ÿ]/.test(t)) return false;                                                // SIGLE seul : PNG, CHF, OCR
  if (/^[A-Za-z0-9+\/=]{24,}$/.test(t)) return false;                                  // base 64
  if (/\\[dsSwWbB]|\(\?:|\[\^/.test(t)) return false;                                   // morceau d'expression régulière
  if (/^[a-z]+(-[a-z0-9]+)+(\s+[a-z]+(-[a-z0-9]+)+)*$/.test(t)) return false;           // « sr-only », « tb-btn primary »
  if (/^[\w.#\-\[\]="':, >+~*()]+$/.test(t) && /[#.\[]/.test(t) && !/\s{2}/.test(t) && !/[À-ÿ]/.test(t) && !/ [a-zà-ÿ]{3,} [a-zà-ÿ]{3,}/.test(t)) return false;   // sélecteurs
  return true;
}

function relever(options) {
  const o = options || {};
  const source = o.source || modules();
  const ast = acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowReturnOutsideFunction: true });
  const lignes = source.split('\n');
  const litteraux = new Map(), motifs = new Map();
  const ajoute = (m, cle, noeud) => {
    if (!m.has(cle)) m.set(cle, []);
    m.get(cle).push(noeud.loc.start.line);
  };
  const pris = new WeakSet();
  const estChaine = n => n && ((n.type === 'Literal' && typeof n.value === 'string') || n.type === 'TemplateLiteral');
  // Aplatir une chaîne de « + » en morceaux : [{ texte } | { expr }].
  function aplatir(n, morceaux) {
    if (n.type === 'BinaryExpression' && n.operator === '+') { aplatir(n.left, morceaux); aplatir(n.right, morceaux); return; }
    if (n.type === 'Literal' && typeof n.value === 'string') { morceaux.push({ texte: n.value, noeud: n }); return; }
    if (n.type === 'TemplateLiteral') {
      n.quasis.forEach((q, i) => { if (q.value.cooked) morceaux.push({ texte: q.value.cooked, noeud: q }); if (i < n.expressions.length) morceaux.push({ expr: n.expressions[i] }); });
      return;
    }
    morceaux.push({ expr: n });
  }
  const contientChaine = n => (n.type === 'BinaryExpression' && n.operator === '+') ? (contientChaine(n.left) || contientChaine(n.right)) : estChaine(n);
  function visiter(n, parent, cle) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'BinaryExpression' && n.operator === '+' && contientChaine(n) && !pris.has(n)) {
      // Seule la chaîne la plus haute est relevée.
      const morceaux = [];
      aplatir(n, morceaux);
      let k = 0;
      const motif = morceaux.map(m => (m.texte != null ? m.texte : '{' + (k++) + '}')).join('');
      const nTextes = morceaux.filter(m => m.texte != null).length;
      // marquer tout ce qui est dedans comme pris
      const marquer = x => { pris.add(x); if (x.type === 'BinaryExpression' && x.operator === '+') { marquer(x.left); marquer(x.right); } };
      marquer(n);
      morceaux.forEach(m => { if (m.noeud) pris.add(m.noeud); });
      if (k > 0 && nTextes > 0) { if (estUnTexte(motif.replace(/\{\d+\}/g, ''))) ajoute(motifs, motif, n); }
      else if (k === 0) { if (estUnTexte(motif)) ajoute(litteraux, motif, n); }   // « 'a' + 'b' » : un texte coupé en deux
      // Les expressions à l'intérieur peuvent contenir d'autres textes.
      morceaux.forEach(m => { if (m.expr) visiter(m.expr, n, 'expr'); });
      return;
    }
    if (n.type === 'Literal' && typeof n.value === 'string' && !pris.has(n)) {
      const cleDeProp = parent && parent.type === 'Property' && !parent.computed && parent.key === n;
      const imp = parent && (parent.type === 'ImportDeclaration' || parent.type === 'ExportNamedDeclaration');
      const directive = parent && parent.type === 'ExpressionStatement' && parent.directive;
      if (!cleDeProp && !imp && !directive && estUnTexte(n.value)) ajoute(litteraux, n.value, n);
      return;
    }
    if (n.type === 'TemplateLiteral' && !pris.has(n)) {
      let k = 0;
      const motif = n.quasis.map((q, i) => (q.value.cooked || '') + (i < n.expressions.length ? '{' + (k++) + '}' : '')).join('');
      if (estUnTexte(motif.replace(/\{\d+\}/g, ''))) ajoute(k ? motifs : litteraux, motif, n);
      n.expressions.forEach(e => visiter(e, n, 'expr'));
      return;
    }
    for (const c of Object.keys(n)) {
      const v = n[c];
      if (Array.isArray(v)) v.forEach(x => visiter(x, n, c));
      else if (v && typeof v.type === 'string') visiter(v, n, c);
    }
  }
  visiter(ast, null, null);
  // Le HTML de la page : les textes visibles et les attributs lisibles (title, aria-label, placeholder, alt).
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'page.html'), 'utf8');
  const htmlTextes = new Map();
  const ajouteHtml = (t, n) => { t = t.replace(/\s+/g, ' ').trim(); if (t && /[A-Za-zÀ-ÿ]/.test(t) && !/^[\d\s\W]+$/.test(t)) { if (!htmlTextes.has(t)) htmlTextes.set(t, []); htmlTextes.get(t).push(n); } };
  const sansScript = html.replace(/<(script|style)[\s\S]*?<\/\1>/g, m => m.replace(/[^\n]/g, ''));
  let ligneHtml = 1;
  sansScript.split('\n').forEach((l, i) => {
    for (const m of l.matchAll(/(?:title|aria-label|placeholder|alt)="([^"]+)"/g)) ajouteHtml(m[1], i + 1);
    for (const m of l.matchAll(/>([^<>]+)</g)) ajouteHtml(m[1].replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;/g, '’').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»'), i + 1);
  });
  return {
    litteraux: Object.fromEntries(Array.from(litteraux.entries()).sort((a, b) => a[0].localeCompare(b[0], 'fr'))),
    motifs: Object.fromEntries(Array.from(motifs.entries()).sort((a, b) => a[0].localeCompare(b[0], 'fr'))),
    html: Object.fromEntries(Array.from(htmlTextes.entries()).sort((a, b) => a[0].localeCompare(b[0], 'fr'))),
  };
}
module.exports = { relever, estUnTexte };

if (require.main === module) {
  const r = relever();
  fs.writeFileSync(path.join(__dirname, 'textes.json'), JSON.stringify(r, null, 1));
  console.log(Object.keys(r.litteraux).length + ' littéraux, ' + Object.keys(r.motifs).length + ' motifs, ' + Object.keys(r.html).length + ' textes de la page');
}
