// Mesure le couplage entre les modules de src/ : qui lit quoi, et surtout qui lit ce qui n'est défini que
// plus loin. Les modules sont recollés dans l'ordre de leurs numéros, dans une seule portée : une fonction
// peut appeler un symbole d'un module plus tardif (elle ne s'exécute qu'une fois tout chargé), mais un
// symbole `const` ou `let` lu au chargement avant sa déclaration est une erreur qui ne se voit qu'au démarrage.
//
//   node test/couplage-outil.js          liste les références à contre-courant, par symbole
const fs = require('fs');
const path = require('path');
const acorn = require(path.join(__dirname, '..', 'libs', 'acorn-8.14.1', 'dist', 'acorn.js'));
const SRC = path.join(__dirname, '..', 'src');

const modules = () => fs.readdirSync(SRC).filter(f => /^\d\d-[a-z0-9-]+\.js$/.test(f)).sort();

function motifsDe(p, noms) {
  if (!p) return;
  if (p.type === 'Identifier') noms.push(p.name);
  else if (p.type === 'ObjectPattern') p.properties.forEach(x => motifsDe(x.type === 'RestElement' ? x.argument : x.value, noms));
  else if (p.type === 'ArrayPattern') p.elements.forEach(x => motifsDe(x, noms));
  else if (p.type === 'AssignmentPattern') motifsDe(p.left, noms);
  else if (p.type === 'RestElement') motifsDe(p.argument, noms);
}

// Les déclarations du niveau supérieur d'un module : nom → { genre: 'function'|'const'|'let'|'var'|'class', ligne }.
function declarations(ast) {
  const d = new Map();
  for (const n of ast.body) {
    if (n.type === 'FunctionDeclaration') d.set(n.id.name, { genre: 'function', ligne: n.loc.start.line });
    else if (n.type === 'ClassDeclaration') d.set(n.id.name, { genre: 'class', ligne: n.loc.start.line });
    else if (n.type === 'VariableDeclaration') for (const v of n.declarations) { const noms = []; motifsDe(v.id, noms); noms.forEach(x => d.set(x, { genre: n.kind, ligne: n.loc.start.line })); }
  }
  return d;
}

// Les références d'un module à des noms qui ne sont pas déclarés localement : [{ nom, ligne, auChargement }].
// « auChargement » : la lecture se fait hors de toute fonction, donc pendant que le module se charge.
function references(ast) {
  const refs = [];
  const portees = [];
  const visible = (nom) => portees.some(s => s.has(nom));
  const pousser = (noms) => portees.push(new Set(noms));
  // pré-déclarer ce qu'une portée contient : var (jusqu'à la fonction), let/const/class/function (dans le bloc)
  function declarerBloc(corps, noms) {
    for (const n of corps) {
      if (n.type === 'FunctionDeclaration') noms.push(n.id.name);
      else if (n.type === 'ClassDeclaration') noms.push(n.id.name);
      else if (n.type === 'VariableDeclaration') n.declarations.forEach(v => motifsDe(v.id, noms));
    }
  }
  function varsDe(n, noms) {   // les « var » imbriqués dans une fonction, hors fonctions filles
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') return;
    if (n.type === 'VariableDeclaration' && n.kind === 'var') n.declarations.forEach(v => motifsDe(v.id, noms));
    for (const c of Object.keys(n)) { const x = n[c]; if (Array.isArray(x)) x.forEach(y => varsDe(y, noms)); else if (x && typeof x.type === 'string') varsDe(x, noms); }
  }
  function visiter(n, parent, cle, profondeurFonction) {
    if (!n || typeof n.type !== 'string') return;
    switch (n.type) {
      case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': {
        const noms = [];
        n.params.forEach(p => motifsDe(p, noms));
        if (n.type === 'FunctionExpression' && n.id) noms.push(n.id.name);
        if (n.body.type === 'BlockStatement') { declarerBloc(n.body.body, noms); varsDe(n.body, noms); }
        noms.push('arguments');
        pousser(noms);
        n.params.forEach(p => visiter(p, n, 'params', profondeurFonction + 1));
        visiter(n.body, n, 'body', profondeurFonction + 1);
        portees.pop();
        return;
      }
      case 'BlockStatement': case 'StaticBlock': {
        const noms = []; declarerBloc(n.body, noms); pousser(noms);
        n.body.forEach(x => visiter(x, n, 'body', profondeurFonction));
        portees.pop();
        return;
      }
      case 'ForStatement': case 'ForInStatement': case 'ForOfStatement': {
        const noms = [];
        const tete = n.type === 'ForStatement' ? n.init : n.left;
        if (tete && tete.type === 'VariableDeclaration') tete.declarations.forEach(v => motifsDe(v.id, noms));
        pousser(noms);
        for (const c of Object.keys(n)) { const x = n[c]; if (Array.isArray(x)) x.forEach(y => visiter(y, n, c, profondeurFonction)); else if (x && typeof x.type === 'string') visiter(x, n, c, profondeurFonction); }
        portees.pop();
        return;
      }
      case 'CatchClause': {
        const noms = []; motifsDe(n.param, noms); pousser(noms);
        visiter(n.body, n, 'body', profondeurFonction);
        portees.pop();
        return;
      }
      case 'SwitchStatement': {
        visiter(n.discriminant, n, 'discriminant', profondeurFonction);
        const noms = []; n.cases.forEach(c => declarerBloc(c.consequent, noms)); pousser(noms);
        n.cases.forEach(c => visiter(c, n, 'cases', profondeurFonction));
        portees.pop();
        return;
      }
      case 'Identifier':
        if (!visible(n.name)) refs.push({ nom: n.name, ligne: n.loc.start.line, auChargement: profondeurFonction === 0 });
        return;
      case 'MemberExpression':
        visiter(n.object, n, 'object', profondeurFonction);
        if (n.computed) visiter(n.property, n, 'property', profondeurFonction);
        return;
      case 'Property': case 'MethodDefinition': case 'PropertyDefinition':
        if (n.computed) visiter(n.key, n, 'key', profondeurFonction);
        if (n.shorthand && n.value && n.value.type === 'Identifier') { visiter(n.value, n, 'value', profondeurFonction); return; }
        visiter(n.value, n, 'value', profondeurFonction);
        return;
      case 'LabeledStatement': visiter(n.body, n, 'body', profondeurFonction); return;
      case 'BreakStatement': case 'ContinueStatement': return;
      case 'VariableDeclarator':
        // la cible d'une déclaration n'est pas une lecture ; ses valeurs par défaut en sont
        if (n.id.type !== 'Identifier') visiter(n.id, n, 'id', profondeurFonction);
        visiter(n.init, n, 'init', profondeurFonction);
        return;
      case 'ObjectPattern': case 'ArrayPattern': case 'AssignmentPattern': case 'RestElement':
        // dans un motif de déclaration, seuls les défauts sont des lectures : on parcourt prudemment
        for (const c of Object.keys(n)) { const x = n[c]; if (Array.isArray(x)) x.forEach(y => y && (y.type === 'Property' ? visiter(y.value && y.value.type === 'AssignmentPattern' ? y.value.right : null, y, 'value', profondeurFonction) : y.type === 'AssignmentPattern' ? visiter(y.right, y, 'right', profondeurFonction) : null)); else if (c === 'right') visiter(x, n, c, profondeurFonction); }
        return;
      default:
        for (const c of Object.keys(n)) { const x = n[c]; if (Array.isArray(x)) x.forEach(y => visiter(y, n, c, profondeurFonction)); else if (x && typeof x.type === 'string') visiter(x, n, c, profondeurFonction); }
    }
  }
  pousser([]);
  return { refs, visiter: (ast) => { visiter(ast, null, null, 0); return refs; } };
}

function analyser() {
  const fichiers = modules();
  const defs = new Map();   // nom → { fichier, genre, ligne }
  const asts = new Map();
  fichiers.forEach((f, rang) => {
    const src = fs.readFileSync(path.join(SRC, f), 'utf8').replace(/\r\n/g, '\n');
    const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowReturnOutsideFunction: true });
    asts.set(f, ast);
    for (const [nom, d] of declarations(ast)) if (!defs.has(nom)) defs.set(nom, Object.assign({ fichier: f, rang }, d));
  });
  const arcs = [];   // références à un symbole défini dans un module de numéro supérieur
  const total = { references: 0 };
  fichiers.forEach((f, rang) => {
    const locales = declarations(asts.get(f));
    const r = references(asts.get(f));
    // les déclarations du niveau supérieur du module sont visibles de tout le module
    r.refs.length = 0;
    const portee = new Set(locales.keys());
    const lectures = [];
    // on rejoue la visite avec les noms du niveau supérieur déclarés localement
    const r2 = references(asts.get(f));
    const lect = r2.visiter(asts.get(f));
    for (const x of lect) {
      if (portee.has(x.nom)) continue;
      const d = defs.get(x.nom);
      if (!d) continue;
      total.references++;
      if (d.rang > rang) arcs.push({ de: f, vers: d.fichier, nom: x.nom, ligne: x.ligne, genre: d.genre, auChargement: x.auChargement });
    }
  });
  return { fichiers, defs, arcs, total: total.references };
}

module.exports = { analyser, modules };

if (require.main === module) {
  const { arcs, total } = analyser();
  const symboles = new Set(arcs.map(a => a.nom));
  const paires = new Set(arcs.map(a => a.de + ' → ' + a.vers));
  console.log(arcs.length + ' références à contre-courant sur ' + total + ', ' + paires.size + ' arêtes, ' + symboles.size + ' symboles');
  const parSymbole = new Map();
  arcs.forEach(a => { const k = a.nom + ' (' + a.vers + ', ' + a.genre + ')'; (parSymbole.get(k) || parSymbole.set(k, []).get(k)).push(a.de + ':' + a.ligne + (a.auChargement ? '*' : '')); });
  Array.from(parSymbole.entries()).sort((a, b) => b[1].length - a[1].length).forEach(([k, v]) => console.log('  ' + k + ' ← ' + v.length + ' : ' + v.slice(0, 6).join(', ') + (v.length > 6 ? ' …' : '')));
  const auChargement = arcs.filter(a => a.auChargement);
  console.log(auChargement.length + ' lecture(s) au chargement vers un module plus tardif' + (auChargement.length ? ' (marquées *)' : ''));
}
