// Réécrire un fichier sur place (desktop/ecriture.js) : le verrou passager d'un antivirus se contourne par quelques reprises ; un verrou
// durable se dit en clair ; et un échec ne laisse jamais de fichier temporaire derrière lui.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ecrireSurPlace, remplacer, ATTENTES_MS } = require('../desktop/ecriture.js');
const { phraseErreur } = require('../desktop/erreurs.js');

const dossier = () => fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-ecr-'));

test('écrire remplace le fichier, sans laisser de temporaire', () => {
  const d = dossier();
  try {
    const c = path.join(d, 'a.pdf');
    fs.writeFileSync(c, 'ancien');
    const r = ecrireSurPlace(c, new Uint8Array(Buffer.from('nouveau')));
    assert.strictEqual(r.reprises, 0);
    assert.strictEqual(fs.readFileSync(c, 'utf8'), 'nouveau');
    assert.deepStrictEqual(fs.readdirSync(d), ['a.pdf']);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('un verrou passager (EBUSY deux fois) se lève avec les reprises', () => {
  const d = dossier();
  try {
    const c = path.join(d, 'a.pdf');
    fs.writeFileSync(c, 'ancien');
    let n = 0;
    const faux = Object.assign({}, fs, { renameSync: (a, b) => { if (++n <= 2) { const e = new Error('busy'); e.code = 'EBUSY'; throw e; } return fs.renameSync(a, b); } });
    const attentes = [];
    const r = ecrireSurPlace(c, Buffer.from('nouveau'), { fs: faux, dormir: (ms) => attentes.push(ms) });
    assert.strictEqual(r.reprises, 2);
    assert.deepStrictEqual(attentes, ATTENTES_MS.slice(0, 2));
    assert.strictEqual(fs.readFileSync(c, 'utf8'), 'nouveau');
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('un verrou qui ne se lève pas renonce après les reprises, le dit en clair, et laisse l\'original intact', () => {
  const d = dossier();
  try {
    const c = path.join(d, 'a.pdf');
    fs.writeFileSync(c, 'ancien');
    const faux = Object.assign({}, fs, { renameSync: () => { const e = new Error('perm'); e.code = 'EPERM'; throw e; } });
    let attentes = 0;
    assert.throws(() => ecrireSurPlace(c, Buffer.from('nouveau'), { fs: faux, dormir: () => { attentes++; } }), (e) => {
      assert.strictEqual(e.code, 'AKTUM_VERROUILLE');
      assert.match(phraseErreur(e), /tenu ouvert par un autre programme/);
      return true;
    });
    assert.strictEqual(attentes, ATTENTES_MS.length);
    assert.strictEqual(fs.readFileSync(c, 'utf8'), 'ancien', 'l\'original n\'a pas bougé');
    assert.deepStrictEqual(fs.readdirSync(d), ['a.pdf'], 'et aucun temporaire ne traîne');
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('une autre erreur (disque plein) n\'est pas rejouée', () => {
  const d = dossier();
  try {
    const c = path.join(d, 'a.pdf');
    let appels = 0;
    const faux = Object.assign({}, fs, { renameSync: () => { appels++; const e = new Error('plein'); e.code = 'ENOSPC'; throw e; } });
    assert.throws(() => remplacer(c + '.tmp', c, { fs: faux, dormir: () => assert.fail('pas d\'attente') }), { code: 'ENOSPC' });
    assert.strictEqual(appels, 1);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});
