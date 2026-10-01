// Ce que le système répond à une écriture ratée, dit à une secrétaire : cinq codes traduits, le code lui-même pour les autres ;
// et un enregistrement qui échoue ne laisse pas de fichier temporaire derrière lui.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { phraseErreur, PHRASES } = require('../desktop/erreurs');

test('cinq codes se disent en clair, sans le code ni le jargon du système', () => {
  for (const code of ['EACCES', 'EPERM', 'EBUSY', 'ENOSPC', 'ENOENT', 'EROFS']) {
    const p = phraseErreur({ code, message: 'EACCES: permission denied, open \'C:\\x\'' });
    assert.equal(p, PHRASES[code]);
    assert.ok(!/EACCES|permission denied|errno/i.test(p), code + ' : ' + p);
    assert.match(p, /[.)]$/);
  }
  assert.match(PHRASES.EBUSY, /Acrobat/);
  assert.match(PHRASES.ENOSPC, /disque est plein/);
});

test('un autre code est cité tel quel, pour le support', () => {
  assert.match(phraseErreur({ code: 'EMFILE', message: 'too many open files' }), /\(EMFILE\).*too many open files/);
  assert.match(phraseErreur(new Error('boum')), /boum/);
  assert.match(phraseErreur(null), /pas pu être écrit/);
});

test('un enregistrement vers un dossier qui n\'existe plus échoue en clair, sans fichier temporaire', () => {
  // Le même geste que aktum:ecrire : écrire le temporaire, renommer ; en cas d'échec, effacer le temporaire.
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-err-'));
  const cible = path.join(dossier, 'inexistant', 'doc.pdf');
  let tmp = null, rendu;
  try { tmp = cible + '.aktum-tmp'; fs.writeFileSync(tmp, Buffer.from('%PDF-')); fs.renameSync(tmp, cible); }
  catch (err) { if (tmp) { try { fs.unlinkSync(tmp); } catch (e) { /* jamais écrit */ } } rendu = phraseErreur(err); }
  assert.equal(rendu, PHRASES.ENOENT);
  assert.deepEqual(fs.readdirSync(dossier), []);
  fs.rmSync(dossier, { recursive: true, force: true });
});
