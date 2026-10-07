// Relève les textes de l'application fenêtrée (processus principal) : menus, fenêtres de dialogue, messages
// de connexion, de licence et de mise à jour. Comme extraire.js pour la page, mais sans motifs : le processus
// principal les rend tels quels ou, assemblés, par morceaux (le traducteur remplace chaque morceau connu).
//   node i18n/extraire-bureau.js     écrit i18n/textes-bureau.json
const fs = require('fs');
const path = require('path');
const acorn = require(path.join(__dirname, '..', 'libs', 'acorn-8.14.1', 'dist', 'acorn.js'));
const { estUnTexte } = require('./extraire');
const BUREAU = path.join(__dirname, '..', 'desktop');
// Les fichiers dont les textes arrivent sous les yeux de l'utilisateur. diagnostic.js (le rapport pour le
// support) et signature.js (la chaîne de construction) restent en français : ils ne s'adressent pas à lui.
const FICHIERS = ['main.js', 'licence.js', 'comptes.js', 'verifier-maj.js', 'ou-ranger.js', 'fiche-de-version.js', 'erreurs.js'];
// Des mots seuls qui s'affichent (menus) : relevés par leur propriété.
const PROPRIETES_AFFICHEES = ['label', 'sublabel', 'toolTip', 'title', 'message', 'detail', 'name'];
// Des textes que la forme écarte à tort, ou retient à tort : désignés à la main.
const RETENUS = [' secondes', ' minutes'];   // la durée d'attente des comptes : « 30 secondes », « 4 minutes »
const IGNORES = ['Deutsch', 'Français', 'MAP * ~NOTFOUND , EXCLUDE ', 'Aktum PDF', 'Blonay PDF', '--nouvelle-fenetre', '-NoProfile', '-NonInteractive', '-Command', 'document invalide', 'AktumPDF-windows.zip', 'illisible :', 'clé invalide', 'chemin invalide', 'page invalide', 'Texte', 'Nom du fichier',
  // le journal des événements d'un compte et les sorties de commande restent en français : ils servent à l'informaticien
  'compte créé', 'code de récupération créé', 'code de récupération refait', 'mot de passe changé', 'mot de passe changé avec le code de récupération', 'mot de passe posé après réinitialisation',
  'SIGNATURE-REFUSEE : ', 'fiche de version : ', 'usage : node fiche-de-version.js windows|mac <destination>', 'usage : verifier-maj.js <archive.zip>',
  'Diagnostic-Aktum-PDF-', 'Electron ', ' – Chromium ', 'Windows', ' — commit ', 'Alt+F4', 'Ctrl+Tab', 'Ctrl+Shift+Tab',
  // les noms de touches d'Electron (enAccelerateur, dans main.js) : du code, jamais affichés
  'CmdOrCtrl', 'Ctrl', 'Tab', 'Up', 'Down', 'Left', 'Right', 'Plus', 'AktumPDF',
  // les raisons que la vérification de licence rend à l'informaticien : lues dans le rapport de diagnostic
  ];

function relever() {
  const textes = new Map();
  const ajoute = (s, f, l) => { if (!textes.has(s)) textes.set(s, []); textes.get(s).push(f + ':' + l); };
  for (const f of FICHIERS) {
    const src = fs.readFileSync(path.join(BUREAU, f), 'utf8');
    const ast = acorn.parse(src, { ecmaVersion: 'latest', locations: true, allowReturnOutsideFunction: true });
    (function visiter(n, parent) {
      if (!n || typeof n.type !== 'string') return;
      if (n.type === 'Literal' && typeof n.value === 'string') {
        const cle = parent && parent.type === 'Property' && parent.key === n && !parent.computed;
        const prop = parent && parent.type === 'Property' && parent.value === n && parent.key && PROPRIETES_AFFICHEES.includes(parent.key.name);
        const dansTableau = parent && parent.type === 'ArrayExpression';
        const v = n.value;
        if (!cle && IGNORES.indexOf(v) < 0 && !/^(CmdOrCtrl\+|--aktum|window\.|!!document|OptimizationHints)/.test(v) && ((prop && /[A-Za-zÀ-ÿ]{3,}/.test(v)) || estUnTexte(v) || (dansTableau && /^[A-ZÀ-Ý][a-zà-ÿ ]{3,}$/.test(v)))) ajoute(v, f, n.loc.start.line);
        return;
      }
      if (n.type === 'TemplateElement') { const v = n.value.cooked || ''; if (estUnTexte(v) && /\s/.test(v.trim())) ajoute(v, f, n.loc.start.line); return; }
      for (const c of Object.keys(n)) { const x = n[c]; if (Array.isArray(x)) x.forEach(y => visiter(y, n)); else if (x && typeof x.type === 'string') visiter(x, n); }
    })(ast, null);
  }
  RETENUS.forEach(s => { if (!textes.has(s)) textes.set(s, ['(retenu)']); });
  const trie = m => Object.fromEntries(Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0], 'fr')));
  return { litteraux: trie(textes), profil: trie(relieverProfil()) };
}

// La fenêtre de connexion (choix-profil.html) : ses textes, dans la page et dans son script. Ils sont traduits
// à l'ouverture de la fenêtre (voir injecterLaLangue dans main.js).
function relieverProfil() {
  const h = fs.readFileSync(path.join(BUREAU, 'choix-profil.html'), 'utf8').replace(/\r\n/g, '\n');
  const texte = new Map();
  // Les textes de la page se lisent sans leurs espaces de bord ; ceux du script, tels quels (« ', depuis ' » s'assemble avec d'autres).
  const ajoute = (s, brut) => { if (!brut) s = s.replace(/\s+/g, ' ').trim(); if (s && /[A-Za-zÀ-ÿ]{2,}/.test(s) && !/^(XXXXX|2-digit)/.test(s) && s !== 'Aktum PDF') texte.set(s, ['choix-profil.html']); };
  const sansScript = h.replace(/<(script|style)[\s\S]*?<\/\1>/g, m => m.replace(/[^\n]/g, ''));
  for (const m of sansScript.matchAll(/(?:title|aria-label|placeholder|alt)="([^"]+)"/g)) ajoute(m[1]);
  for (const m of sansScript.matchAll(/>([^<>]+)</g)) ajoute(m[1].replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;/g, '’'));
  const script = h.match(/<script>([\s\S]*?)<\/script>/)[1];
  const ast = acorn.parse(script, { ecmaVersion: 'latest', locations: true });
  (function visiter(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Literal' && typeof n.value === 'string' && estUnTexte(n.value)) ajoute(n.value, true);
    if (n.type === 'TemplateElement' && estUnTexte(n.value.cooked || '')) ajoute(n.value.cooked, true);
    for (const c of Object.keys(n)) { const x = n[c]; if (Array.isArray(x)) x.forEach(visiter); else if (x && typeof x.type === 'string') visiter(x); }
  })(ast);
  return texte;
}
module.exports = { relever };
if (require.main === module) {
  const r = relever();
  fs.writeFileSync(path.join(__dirname, 'textes-bureau.json'), JSON.stringify(r, null, 1));
  console.log(Object.keys(r.litteraux).length + ' textes, ' + Object.keys(r.profil).length + ' pour la fenêtre de connexion');
}
