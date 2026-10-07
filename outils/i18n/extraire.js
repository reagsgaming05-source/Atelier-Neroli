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
// Des textes que les règles de forme écartent à tort : repérés à la main, ils sont toujours retenus.
const TEXTES_RETENUS = ['pdf.js indisponible', 'point (1234.50)', '[caviardé]', 'CONFIDENTIEL',
  // les morceaux de noms de fichiers que le logiciel propose : traduits, ils ne ressemblent pas à des phrases
  '-extrait.pdf', '-signe.pdf', '-livret', '-par-feuille', '-sans-vides.pdf', '-leger.pdf', '-numerote.pdf', '-protege.pdf',
  'lot-', '-divise.zip', '-images.zip', '-tableau.csv', 'formulaire-', 'images.pdf', '(aucun texte)', 'Helvetica, Times ou Courier.'];

// Des noms de touches du navigateur (event.key), comparés dans le code et jamais affichés : « Shift » devient « Maj » via la table des noms (src/97-raccourcis.js).
const TEXTES_ECARTES = ['AltGraph', 'Control', 'Dead', 'Heading', 'Meta', '_rels/.rels', 'Shift', 'Space'];

function estUnTexte(s) {
  const t = s.trim();
  if (TEXTES_ECARTES.indexOf(t) >= 0) return false;
  if (TEXTES_RETENUS.indexOf(t) >= 0) return true;
  if (['Ae', 'Oe', 'Ue'].indexOf(t) >= 0) return false;                                 // le repliement des trémas d'un nom de fichier
  if (t.length < 2 || !/[A-Za-zÀ-ÿ]/.test(t)) return false;
  if (/^(https?:|data:|blob:|file:|#|\.|\/|\[|<)/.test(t)) return false;
  if (/^[a-z][a-zA-Z0-9_\-.:\/+=;,*]*$/.test(t) && !/[À-ÿ]/.test(t)) return false;   // identifiant, classe, type MIME, extension
  if (!/[a-zà-ÿ]/.test(t) && !/\s/.test(t)) return false;                              // SIGLE ou nom technique seul : PNG, CHF, SHA-256, DEFLATE (« PIÈCE N° » compte, « CONFIDENTIEL » est retenu à la main)
  if (/^__[A-Z_]+__$/.test(t)) return false;                                            // repère remplacé à la construction
  if (/^[Mm][-\d.\s,]*[-\d.\s,MmLlHhVvCcAaZz]*$/.test(t) && /\d/.test(t)) return false;
  if (/^\d+(\.\d+)?(px|em|rem|%)(\s|$)|var\(--/.test(t)) return false;                       // une valeur de style : « 1px solid var(--trait) »           // tracé d'icône (src/11-icones.js) : « M6 3 3 6l3 3 »
  if (/^rgba?\(|^hsla?\(/.test(t)) return false;                                      // une couleur de dégradé : rgba(0,0,0,0)
  if (/^[A-Za-z0-9+\/=]{24,}$/.test(t)) return false;                                  // base 64
  if (/\bconst \w+ =|=> \{|\bself\.|\bawait\b/.test(t)) return false;                         // du code (le travailleur de rendu)
  if (/\\[dsSwWbB]|\(\?:|\[\^/.test(t)) return false;                                   // morceau d'expression régulière
  if (/^[a-z]+(-[a-z0-9]+)+(\s+[a-z]+(-[a-z0-9]+)+)*$/.test(t)) return false;           // « sr-only », « tb-btn primary »
  if (!/^[A-ZÀ-Ý][a-zà-ÿ]+ /.test(t) && /^[\w.#\-\[\]="':, >+~*()]+$/.test(t) && /[#.\[]/.test(t) && !/\s{2}/.test(t) && !/[À-ÿ]/.test(t) && !/ [a-zà-ÿ]{3,} [a-zà-ÿ]{3,}/.test(t)) return false;   // sélecteurs
  return true;
}

// Quelques mots isolés s'affichent tels quels, bien qu'ils ressemblent à des identifiants : ils sont
// désignés ici, à la main, après lecture du code (les autres mots isolés sont des clés internes).
const MOTS_AFFICHES = ['actif', 'autorisations', 'rempli', 'identique', 'blanche', 'clair', 'sombre', 'automatique', 'recto', 'verso', 'fusion', 'exemple'];

// Un texte assemblé : ses morceaux fixes doivent faire un texte, et porter au moins une minuscule
// (« M{0} 0H{1}A{2} » est un tracé, « A · {0} » une étiquette sans mot).
const MOTIFS_RETENUS = ['p. {0}', 'p. {0}{1}', '{0} annot.', '{0} o', '{0} Ko', '{0} Mo'];
const estUnMotif = m => {
  if (MOTIFS_RETENUS.indexOf(m) >= 0) return true;
  if (/\bconst \w+ =|=> \{|\bself\.|\bawait\b/.test(m)) return false;   // du code (le travailleur de rendu)
  const fixe = m.replace(/\{\d+\}/g, '');
  if (/^\s*(rotate|translate|scale|rgba?|hsla?)\(/.test(fixe) || /^-[a-z]+$/.test(fixe)) return false;   // un morceau de style (« rotate(45deg) ») ou d'identifiant (« x-aide »)
  if (/\b(rg|RG|Tf|Tm|Tj|TJ|re|gs|cm|BDC|EMC)\b|^[\s\/]*[A-Za-z]{1,3}[\s\d]*$/.test(fixe) && !/[a-zà-ÿ]{4,}/.test(fixe)) return false;   // opérateurs de PDF
  // Un mot de liaison entre deux morceaux (« {0} sur {1} », « {0} à {1} ») se traduit, bien qu'il ne soit pas une phrase.
  if (/\s[A-Za-zÀ-ÿ]{2,}\s/.test(fixe) && /[a-zà-ÿ]/.test(fixe)) return true;
  return estUnTexte(fixe) && /[a-zà-ÿ]/.test(fixe);
};

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
  const mots = new Map();   // mots isolés écartés comme identifiants (« page », « avis ») : candidats si le français les emploie
  const motIsole = (v, n) => { if (/^[a-zà-ÿ]{3,}$/.test(v) && !estUnTexte(v)) { if (!mots.has(v)) mots.set(v, []); mots.get(v).push(n.loc.start.line); } };
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
      if (k > 0 && nTextes > 0) { if (estUnMotif(motif)) ajoute(motifs, motif, n); }
      else if (k === 0) { if (estUnTexte(motif)) ajoute(litteraux, motif, n); }   // « 'a' + 'b' » : un texte coupé en deux
      // Les expressions à l'intérieur peuvent contenir d'autres textes.
      morceaux.forEach(m => { if (m.expr) visiter(m.expr, n, 'expr'); });
      return;
    }
    if (n.type === 'Literal' && typeof n.value === 'string' && !pris.has(n)) {
      const cleDeProp = parent && parent.type === 'Property' && !parent.computed && parent.key === n;
      const imp = parent && (parent.type === 'ImportDeclaration' || parent.type === 'ExportNamedDeclaration');
      const directive = parent && parent.type === 'ExpressionStatement' && parent.directive;
      if (!cleDeProp && !imp && !directive) { if (estUnTexte(n.value)) ajoute(litteraux, n.value, n); else motIsole(n.value, n); }
      return;
    }
    if (n.type === 'TemplateLiteral' && !pris.has(n)) {
      let k = 0;
      const motif = n.quasis.map((q, i) => (q.value.cooked || '') + (i < n.expressions.length ? '{' + (k++) + '}' : '')).join('');
      if (estUnMotif(motif)) ajoute(k ? motifs : litteraux, motif, n);
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
  mots.forEach((lignesDuMot, mot) => { if (MOTS_AFFICHES.indexOf(mot) >= 0 && !litteraux.has(mot)) litteraux.set(mot, lignesDuMot); });
  // Les arguments de plural(n, 'page', 'pages') s'affichent : ils comptent, même s'ils ressemblent à des identifiants.
  (function chercherPlural(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 'plural') {
      n.arguments.slice(1, 3).forEach(a => { if (a.type === 'Literal' && typeof a.value === 'string' && !litteraux.has(a.value)) ajoute(litteraux, a.value, a); });
    }
    for (const c of Object.keys(n)) { const v = n[c]; if (Array.isArray(v)) v.forEach(chercherPlural); else if (v && typeof v.type === 'string') chercherPlural(v); }
  })(ast);
  // La table des raccourcis (desktop/raccourcis.json) : ses libellés et ses groupes s'affichent, dans la fenêtre d'aide et les préférences.
  const table = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'desktop', 'raccourcis.json'), 'utf8'));
  [].concat(table.commandes.map(c => c.libelle), table.commandes.map(c => c.groupe), table.fixes.map(f => f.libelle), table.fixes.map(f => f.groupe))
    .forEach(t => { if (!litteraux.has(t)) litteraux.set(t, ['desktop/raccourcis.json']); });
  // L'aide des outils (aide/outils.json) : ce que le « ? » des boîtes affiche.
  const aide = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'aide', 'outils.json'), 'utf8'));
  aide.outils.forEach(o => [o.quoi, o.effet, o.attention].concat(o.etapes || [])
    .forEach(t => { if (t && !litteraux.has(t)) litteraux.set(t, ['aide/outils.json']); }));
  // Le HTML de la page : les textes visibles et les attributs lisibles (title, aria-label, placeholder, alt).
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'page.html'), 'utf8');
  const htmlTextes = new Map();
  const ajouteHtml = (t, n) => { t = t.replace(/\s+/g, ' ').trim(); if (t && /[A-Za-zÀ-ÿ]/.test(t) && !/^[\d\s\W]+$/.test(t)) { if (!htmlTextes.has(t)) htmlTextes.set(t, []); htmlTextes.get(t).push(n); } };
  const sansScript = html.replace(/<(script|style)[\s\S]*?<\/\1>/g, m => m.replace(/[^\n]/g, ''));
  const ligneDe = i => sansScript.slice(0, i).split('\n').length;
  for (const m of sansScript.matchAll(/(?:title|aria-label|placeholder|alt)="([^"]+)"/g)) ajouteHtml(m[1], ligneDe(m.index));
  // Les textes entre balises, même répartis sur plusieurs lignes (une icône, puis le mot, sur la ligne suivante).
  for (const m of sansScript.matchAll(/>([^<>]+)</g)) ajouteHtml(m[1].replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;/g, '’').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»'), ligneDe(m.index));
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
