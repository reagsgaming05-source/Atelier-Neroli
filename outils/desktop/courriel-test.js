/*
 * « Envoyer par courriel », éprouvé avec le VRAI PowerShell : sous Windows seulement (ailleurs, le repli est le seul chemin et il est éprouvé par
 * test/courriel.test.js). Sur un poste d'intégration continue, il n'y a pas d'Outlook : ce que le test constate, c'est que le script s'exécute (il
 * n'est pas une erreur de syntaxe : code 1) et qu'il rend le code « Outlook indisponible » (3) — donc que le repli honnête est pris, avec sa raison.
 *   node courriel-test.js
 */
const assert = require('assert');
const C = require('./courriel.js');

if (process.platform !== 'win32') { console.log('courriel-test : sans objet hors de Windows.'); process.exit(0); }

(async () => {
  const brut = await C.preparer('C:\\Temp\\sans-importance.pdf', 'Préavis "test" & $env:USERNAME.pdf', {});
  if (brut.mode === 'outlook') { console.log('COURRIEL OK (un Outlook est installé : le message s\u2019est affiché, il n\u2019est pas envoyé)'); return; }
  assert.strictEqual(brut.mode, 'dossier');
  assert.match(brut.raison, /Outlook n’est pas disponible|Outlook n\u2019est pas disponible/, 'le repli dit pourquoi : ' + brut.raison + ' (PowerShell lancé, code 3 attendu)');
  console.log('COURRIEL OK — repli : ' + brut.raison);
})().catch((e) => { console.error('COURRIEL ÉCHEC :', e && e.stack || e); process.exit(1); });
