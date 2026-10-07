// « Envoyer par courriel » (desktop/courriel.js) : le script ne contient jamais le nom du fichier ni le sujet — ils passent par l'environnement —,
// et chaque issue (message affiché, pas d'Outlook, PowerShell bridé, autre plateforme) mène soit au message, soit au repli honnête.
const test = require('node:test');
const assert = require('node:assert');
const C = require('../desktop/courriel.js');

test('le script ne porte ni chemin ni sujet : tout passe par l\'environnement', () => {
  assert.match(C.SCRIPT_OUTLOOK, /\$env:AKTUM_PJ/);
  assert.match(C.SCRIPT_OUTLOOK, /\$env:AKTUM_SUJET/);
  assert.match(C.SCRIPT_OUTLOOK, /\.Display\(\)/, 'le message est affiché…');
  assert.doesNotMatch(C.SCRIPT_OUTLOOK, /\.Send\(\)/, '…jamais envoyé');
  assert.doesNotMatch(C.SCRIPT_OUTLOOK, /"/, 'aucun guillemet double : rien à échapper dans la ligne de commande');
});

test('le sujet est le nom du document, sans extension, sur une ligne', () => {
  assert.strictEqual(C.sujetDe('Préavis 3-26.pdf'), 'Préavis 3-26');
  assert.strictEqual(C.sujetDe('a\r\nb.pdf'), 'a b');
  assert.strictEqual(C.sujetDe('x'.repeat(500) + '.pdf').length, 200);
});

test('un nom piégé reste du texte : il part dans l\'environnement, pas dans le script', async () => {
  let vu = null;
  const exec = async (args, env) => { vu = { args, env }; return { code: 0 }; };
  const piege = 'a"; Remove-Item C:\\* -Recurse; "b.pdf';
  const r = await C.preparer('C:\\Temp\\' + piege, piege, { plateforme: 'win32', exec, env: {} });
  assert.strictEqual(r.mode, 'outlook');
  assert.strictEqual(vu.env.AKTUM_PJ, 'C:\\Temp\\' + piege);
  assert.ok(vu.env.AKTUM_SUJET.includes('Remove-Item'));
  assert.ok(!vu.args.join(' ').includes('Remove-Item'), 'jamais dans les arguments du programme');
});

test('Outlook absent, PowerShell bridé, échec du message : le repli dit pourquoi', async () => {
  const avec = (code) => C.preparer('C:\\x.pdf', 'x.pdf', { plateforme: 'win32', exec: async () => ({ code }), env: {} });
  const sans = await avec(3);
  assert.strictEqual(sans.mode, 'dossier');
  assert.match(sans.raison, /Outlook n’est pas disponible|Outlook n\u2019est pas disponible/);
  assert.match((await avec(-1)).raison, /PowerShell/);
  assert.match((await avec(4)).raison, /préparer le message/);
});

test('hors de Windows : le repli, sans rien lancer', async () => {
  let lance = false;
  const r = await C.preparer('/tmp/x.pdf', 'x.pdf', { plateforme: 'linux', exec: async () => { lance = true; return { code: 0 }; } });
  assert.strictEqual(r.mode, 'dossier');
  assert.strictEqual(lance, false);
});
