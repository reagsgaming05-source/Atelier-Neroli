/*
 * L'audit des dépendances : `npm audit` sur chacun des manifestes du dépôt, jugé contre une liste d'avis ACCEPTÉS, écrite et datée.
 *
 *   node editeur/audit-dependances.js            # tous les manifestes (réseau : npm interroge le registre)
 *   node editeur/audit-dependances.js --seuls libs-manifeste,site
 *
 * Ce qui bloque : un avis de gravité au moins égale au seuil du manifeste, qui n'est PAS dans editeur/avis-acceptes.json — ou qui y est,
 * mais dont la date de relecture est dépassée. Une exception n'est donc jamais éternelle : au bout de six mois au plus, quelqu'un la relit
 * et la renouvelle, ou la retire parce que l'avis est corrigé.
 *
 * Les seuils :
 *  - libs-manifeste (les bibliothèques embarquées dans la page, donc livrées à chaque poste) : dès « moderate ».
 *  - desktop et site, SANS leurs outils de construction (--omit=dev) : dès « moderate » — c'est ce qui part chez le client ou sur l'hébergeur.
 *  - desktop et site AVEC leurs outils de construction, outils/ et test-e2e : dès « high » (ces outils tournent sur un poste de construction,
 *    jamais chez le client ; ce qui est moins grave est affiché, pas bloquant).
 *
 * Code de sortie : 0 tout est accepté ou sous le seuil ; 1 au moins un avis bloquant ; 2 l'audit n'a pas pu se faire (pas de réseau, registre muet).
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const ORDRE = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };
const SIX_MOIS_MS = 190 * 24 * 3600 * 1000;

const CIBLES = [
  { nom: 'libs-manifeste', dossier: 'libs-manifeste', omit: false, seuil: 'moderate', ce: 'les bibliothèques embarquées dans la page' },
  { nom: 'desktop (livré)', dossier: 'desktop', omit: true, seuil: 'moderate', ce: 'ce que l\'application de bureau embarque' },
  { nom: 'desktop (construction)', dossier: 'desktop', omit: false, seuil: 'high', ce: 'les outils de construction du bureau' },
  { nom: 'site (livré)', dossier: '../site', omit: true, seuil: 'moderate', ce: 'ce que le site de vente exécute' },
  { nom: 'site (construction)', dossier: '../site', omit: false, seuil: 'high', ce: 'les outils de développement du site' },
  { nom: 'outils', dossier: '.', omit: false, seuil: 'high', ce: 'l\'outillage d\'assemblage' },
  { nom: 'test-e2e', dossier: 'test-e2e', omit: false, seuil: 'high', ce: 'les tests de bout en bout' },
];

// Les avis d'un rapport `npm audit --json` : un par (identifiant, paquet), la gravité la plus haute retenue.
function avisDe(rapport) {
  const vus = new Map();
  for (const v of Object.values((rapport && rapport.vulnerabilities) || {})) {
    for (const via of v.via || []) {
      if (!via || typeof via !== 'object' || !via.url) continue;
      const id = String(via.url).split('/').pop();
      const cle = id + '|' + via.name;
      if (!vus.has(cle)) vus.set(cle, { id, paquet: via.name, gravite: via.severity || 'high', titre: via.title || '', url: via.url });
    }
  }
  return [...vus.values()];
}

/**
 * Juge les avis d'un manifeste.
 * @param {object[]} avis        sortie de avisDe
 * @param {object[]} acceptes    editeur/avis-acceptes.json › avis
 * @param {{nom:string,seuil:string}} cible
 * @param {Date} maintenant
 * @returns {{bloquants:object[], acceptes:object[], moindres:object[], expires:object[], utilises:Set<object>}}
 */
function evaluer(avis, acceptes, cible, maintenant) {
  const seuil = ORDRE[cible.seuil];
  const r = { bloquants: [], acceptes: [], moindres: [], expires: [], utilises: new Set() };
  for (const a of avis) {
    if ((ORDRE[a.gravite] || 0) < seuil) { r.moindres.push(a); continue; }
    const regle = acceptes.find((x) => x.manifeste === cible.nom && x.paquet === a.paquet && (!x.id || x.id === a.id));
    if (!regle) { r.bloquants.push(a); continue; }
    r.utilises.add(regle);
    if (new Date(regle.expire) < maintenant) { r.expires.push({ ...a, regle }); r.bloquants.push({ ...a, expire: regle.expire }); continue; }
    r.acceptes.push({ ...a, regle });
  }
  return r;
}

// Une règle d'exception bien formée : dit pourquoi, depuis quand, jusqu'à quand, et pas pour plus de six mois.
function reglesInvalides(acceptes) {
  const defauts = [];
  acceptes.forEach((x, i) => {
    const ou = 'avis[' + i + '] (' + (x.paquet || '?') + ')';
    ['manifeste', 'paquet', 'raison', 'relu', 'expire'].forEach((k) => { if (!x[k] || typeof x[k] !== 'string') defauts.push(ou + ' : « ' + k + ' » manque'); });
    if (x.raison && x.raison.length < 40) defauts.push(ou + ' : la raison est trop courte pour être une relecture');
    const relu = new Date(x.relu), expire = new Date(x.expire);
    if (isNaN(relu) || isNaN(expire)) defauts.push(ou + ' : dates illisibles');
    else if (expire - relu > SIX_MOIS_MS) defauts.push(ou + ' : une exception ne vaut pas plus de six mois');
    else if (expire <= relu) defauts.push(ou + ' : elle expire avant d\'avoir été relue');
    if (x.id && !/^GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}$/.test(x.id)) defauts.push(ou + ' : identifiant d\'avis illisible');
  });
  return defauts;
}

function lancerAudit(cible) {
  const cwd = path.resolve(RACINE, cible.dossier);
  const args = ['audit', '--json'].concat(cible.omit ? ['--omit=dev'] : []);
  let sortie;
  try {
    sortie = execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    sortie = e && e.stdout ? String(e.stdout) : '';   // npm audit sort en erreur dès qu'il trouve quelque chose : le rapport est quand même sur la sortie
  }
  let rapport;
  try { rapport = JSON.parse(sortie); } catch (e) { throw new Error('la sortie de « npm audit » n\'est pas lisible (' + cible.nom + ')'); }
  if (rapport && rapport.error) throw new Error('npm audit : ' + (rapport.error.summary || rapport.error.code || 'erreur') + ' (' + cible.nom + ')');
  return rapport;
}

function principal(argv) {
  const seuls = (() => { const i = argv.indexOf('--seuls'); return i >= 0 && argv[i + 1] ? argv[i + 1].split(',') : null; })();
  const fichier = path.join(__dirname, 'avis-acceptes.json');
  const acceptes = JSON.parse(fs.readFileSync(fichier, 'utf8')).avis || [];
  const mal = reglesInvalides(acceptes);
  if (mal.length) { console.error('editeur/avis-acceptes.json est mal formé :\n  ' + mal.join('\n  ')); return 1; }

  const maintenant = new Date();
  const lignes = [];
  let bloquant = 0, impossible = 0;
  const utilisees = new Set();
  for (const cible of CIBLES) {
    if (seuls && !seuls.some((s) => cible.nom.startsWith(s))) continue;
    let rapport;
    try { rapport = lancerAudit(cible); } catch (e) { impossible++; lignes.push('✖ ' + cible.nom + ' : audit impossible — ' + e.message); continue; }
    const r = evaluer(avisDe(rapport), acceptes, cible, maintenant);
    r.utilises.forEach((x) => utilisees.add(x));
    const entete = (r.bloquants.length ? '✖ ' : '✔ ') + cible.nom + ' (' + cible.ce + '; seuil « ' + cible.seuil + ' ») : '
      + r.bloquants.length + ' bloquant(s), ' + r.acceptes.length + ' accepté(s), ' + r.moindres.length + ' sous le seuil';
    lignes.push(entete);
    r.bloquants.forEach((a) => lignes.push('    BLOQUANT  ' + a.id + '  ' + a.paquet + '  [' + a.gravite + ']  ' + a.titre + (a.expire ? '  — exception expirée le ' + a.expire : '')));
    r.acceptes.forEach((a) => lignes.push('    accepté   ' + a.id + '  ' + a.paquet + '  [' + a.gravite + ']  jusqu\'au ' + a.regle.expire));
    r.moindres.forEach((a) => lignes.push('    moindre   ' + a.id + '  ' + a.paquet + '  [' + a.gravite + ']  ' + a.titre));
    bloquant += r.bloquants.length;
  }
  if (!seuls) {
    acceptes.filter((x) => !utilisees.has(x)).forEach((x) => lignes.push('… exception sans objet, à retirer de avis-acceptes.json : ' + x.manifeste + ' / ' + x.paquet + (x.id ? ' / ' + x.id : '')));
  }
  const texte = lignes.join('\n');
  console.log(texte);
  if (process.env.GITHUB_STEP_SUMMARY) { try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### Audit des dépendances\n\n```\n' + texte + '\n```\n'); } catch (e) { /* le résumé est un confort */ } }
  if (bloquant) { console.error('\n' + bloquant + ' avis bloquant(s) : corriger la dépendance, ou — après relecture — l\'inscrire dans editeur/avis-acceptes.json avec sa raison.'); return 1; }
  if (impossible) { console.error('\nL\'audit n\'a pas pu se faire pour ' + impossible + ' manifeste(s) : rien n\'est dit de leur état.'); return 2; }
  return 0;
}

if (require.main === module) process.exit(principal(process.argv.slice(2)));

module.exports = { avisDe, evaluer, reglesInvalides, CIBLES, ORDRE };
