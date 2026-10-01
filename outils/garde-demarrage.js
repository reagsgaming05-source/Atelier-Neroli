// Garde-fou du démarrage. Tous les modules de src/ partagent UNE portée : une
// `function` y est remontée, une `const` ne l'est pas. Qu'une déclaration passe
// de l'une à l'autre (ou change de module) et un appel fait au chargement, plus
// haut dans la page, échoue avec « Cannot access 'x' before initialization » :
// l'application ne démarre plus. Les tests de bout en bout le voient, mais après
// plusieurs minutes de préparation ; ici, c'est une dizaine de millisecondes, et
// le build refuse de produire une page qui ne démarre pas.
//
// Le script est évalué dans un contexte où tout ce qui n'existe pas (window,
// document, PDFLib…) est un leurre qui accepte tout appel et toute propriété. On
// n'y teste rien d'autre que l'ordre des déclarations.
const vm = require('node:vm');

function leurre() {
  const cible = function () {};
  const p = new Proxy(cible, {
    get(_, cle) {
      if (cle === Symbol.toPrimitive) return () => '';
      if (cle === Symbol.iterator) return function* () {};
      if (cle === Symbol.asyncIterator) return async function* () {};
      if (cle === 'then') return undefined;      // un leurre attendu se résout aussitôt
      if (cle === 'length') return 0;
      if (typeof cle === 'symbol') return undefined;
      return p;
    },
    set() { return true; },
    has() { return true; },
    apply() { return p; },
    construct() { return p; },
    deleteProperty() { return true; },
    getPrototypeOf() { return Function.prototype; },
  });
  return p;
}

// Rend les erreurs de démarrage qui trahissent un ordre de déclaration cassé.
// S'exécute dans un processus à part (voir plus bas) : le code de l'application,
// privé de tout ce qu'il attend, lève des erreurs sans rapport avec l'ordre des
// déclarations, et elles ne doivent pas atteindre le processus appelant.
async function executer(page) {
  const m = /<script>\n([\s\S]*)<\/script>\s*$/.exec(page);
  if (!m) return ['aucun script à la fin de la page'];
  const bac = leurre();
  const sable = new Proxy({}, {
    // Les noms du langage restent ceux du contexte ; tout le reste est un leurre.
    has: (_, k) => typeof k === 'string' && !(k in globalThis) && k !== 'undefined',
    get: (_, k) => (k === Symbol.unscopables ? undefined : bac),
    set: () => true,
  });
  const ctx = vm.createContext(sable);
  const trouvees = [];
  const note = e => { const t = String(e && e.message ? e.message : e); if (/before initialization/.test(t)) trouvees.push(t); };
  const surRejet = e => note(e);
  process.on('unhandledRejection', surRejet);
  process.on('uncaughtException', surRejet);
  try {
    new vm.Script(m[1], { filename: 'application.js' }).runInContext(ctx, { timeout: 4000 });
  } catch (e) { note(e); }
  // Le démarrage est asynchrone : on lui laisse le temps de dérouler ses attentes.
  for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r));
  process.off('unhandledRejection', surRejet);
  process.off('uncaughtException', surRejet);
  return trouvees;
}

// La page est passée par l'entrée standard au processus fils, qui rend la liste
// des erreurs en JSON.
function erreursDeDemarrage(page) {
  return new Promise((resolve, reject) => {
    const fils = require('node:child_process').spawn(process.execPath, [__filename, '--entree'], { stdio: ['pipe', 'pipe', 'inherit'] });
    let sortie = '';
    fils.stdout.on('data', d => { sortie += d; });
    fils.on('error', reject);
    fils.on('close', code => {
      if (code !== 0) return reject(new Error('le garde-fou du démarrage s\'est arrêté (code ' + code + ')'));
      try { resolve(JSON.parse(sortie)); } catch (e) { reject(e); }
    });
    fils.stdin.end(page);
  });
}

module.exports = { erreursDeDemarrage };

if (require.main === module) {
  if (process.argv.includes('--entree')) {
    // Le fils : lit la page, rend les erreurs, et s'en va sans attendre ce que
    // l'application aurait encore programmé.
    const morceaux = [];
    process.stdin.on('data', d => morceaux.push(d));
    process.stdin.on('end', () => {
      executer(Buffer.concat(morceaux).toString('utf8')).then(r => { process.stdout.write(JSON.stringify(r), () => process.exit(0)); });
    });
  } else {
    // En ligne de commande : le build l'appelle avant d'écrire quoi que ce soit.
    const { assembler } = require('./assembler');
    erreursDeDemarrage(assembler()).then(erreurs => {
      if (!erreurs.length) return;
      console.error('GARDE-FOU DU DÉMARRAGE : la page ne démarrerait pas.');
      erreurs.forEach(e => console.error('  - ' + e));
      console.error('Une déclaration `const` (ou `let`) est lue avant la ligne qui la pose : la remonter, ou la reprendre en `function`.');
      process.exit(1);
    });
  }
}
