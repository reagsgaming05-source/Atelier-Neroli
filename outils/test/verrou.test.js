// Le verrou et la date de modification : de simples fichiers, aucun Electron.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const V = require('../desktop/verrou');

const dossier = () => fs.mkdtempSync(path.join(os.tmpdir(), 'blonay-verrou-'));
const doc = (d) => { const f = path.join(d, 'decision.pdf'); fs.writeFileSync(f, 'x'); return f; };

test('un document libre se verrouille', () => {
  const f = doc(dossier());
  assert.deepEqual(V.poser(f, 'Marie', 'a'), { pose: true });
  assert.equal(V.lire(f).qui, 'Marie');
});

test('une seconde personne est prévenue, et ne prend pas le verrou', () => {
  const f = doc(dossier());
  V.poser(f, 'Marie', 'a');
  const r = V.poser(f, 'Paul', 'b');
  assert.equal(r.pose, false);
  assert.equal(r.autre.qui, 'Marie');
  assert.equal(V.lire(f).instance, 'a', 'le verrou de Marie est intact');
});

test('on rouvre son propre verrou sans se prévenir soi-même', () => {
  const f = doc(dossier());
  V.poser(f, 'Marie', 'a');
  assert.equal(V.poser(f, 'Marie', 'a').pose, true);
});

test('un verrou qui n\'est plus rafraîchi est périmé : il ne gêne plus personne', () => {
  const f = doc(dossier());
  const maintenant = Date.now();
  V.poser(f, 'Marie', 'a', maintenant - V.PEREMPTION_MS - 5000);
  // Marie est sur un autre poste, on ne peut pas savoir si son processus vit : seul l'âge compte.
  const v = V.lire(f); v.poste = 'AUTRE-POSTE'; fs.writeFileSync(V.nomVerrou(f), JSON.stringify(v));
  assert.equal(V.poser(f, 'Paul', 'b', maintenant).pose, true);
  assert.equal(V.lire(f).qui, 'Paul');
});

test('un verrou rafraîchi reste vivant', () => {
  const f = doc(dossier());
  const t = Date.now();
  V.poser(f, 'Marie', 'a', t - V.PEREMPTION_MS - 5000);
  const v = V.lire(f); v.poste = 'AUTRE-POSTE'; fs.writeFileSync(V.nomVerrou(f), JSON.stringify(v));
  assert.equal(V.rafraichir(f, 'a', t), true);
  assert.equal(V.poser(f, 'Paul', 'b', t).pose, false);
});

test('sur le même poste, un processus disparu libère le verrou sans attendre', () => {
  const f = doc(dossier());
  V.poser(f, 'Marie', 'a');
  const v = V.lire(f); v.pid = 2147483646; fs.writeFileSync(V.nomVerrou(f), JSON.stringify(v));
  assert.equal(V.poser(f, 'Paul', 'b').pose, true);
});

test('on ne libère jamais le verrou d\'une autre', () => {
  const f = doc(dossier());
  V.poser(f, 'Marie', 'a');
  assert.equal(V.liberer(f, 'b'), false);
  assert.ok(V.lire(f));
  assert.equal(V.liberer(f, 'a'), true);
  assert.equal(V.lire(f), null);
});

test('un dossier en lecture seule n\'est pas une erreur', () => {
  const r = V.poser(path.join(os.tmpdir(), 'inexistant-' + Date.now(), 'x.pdf'), 'Marie', 'a');
  assert.equal(r.pose, false);
  assert.equal(r.lectureSeule, true);
});

test('le fichier qui a changé depuis sa lecture est un conflit', () => {
  const f = doc(dossier());
  const lu = fs.statSync(f).mtimeMs;
  assert.equal(V.conflit(f, lu).conflit, false);
  const futur = new Date(Date.now() + 60000);
  fs.utimesSync(f, futur, futur);
  const c = V.conflit(f, lu);
  assert.equal(c.conflit, true);
  assert.ok(c.mtimeMs > lu);
});

test('sans date attendue, ou sans fichier, il n\'y a pas de conflit à affirmer', () => {
  const f = doc(dossier());
  assert.equal(V.conflit(f, 0).conflit, false);
  assert.equal(V.conflit(path.join(os.tmpdir(), 'rien-' + Date.now() + '.pdf'), 12345).conflit, false);
});
