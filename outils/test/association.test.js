// L'inscription de l'application comme candidate à l'ouverture des PDF (desktop/association.js) : ce qui s'écrit, ce qui s'efface,
// ce qui se répare au lancement — éprouvé avec un faux « reg.exe » qui tient un petit registre en mémoire.
// Sous Windows (l'intégration continue), le même scénario passe aussi par le vrai reg.exe : voir desktop/association-test.js.
const test = require('node:test');
const assert = require('node:assert');
const A = require('../desktop/association.js');

const EXE = 'C:\\Logiciels\\Aktum PDF\\AktumPDF.exe';

// Un registre en mémoire qui répond comme reg.exe : add, query, delete.
function fauxRegistre() {
  const valeurs = new Map();   // « clé|valeur » -> donnée ; la valeur par défaut est « (Default) »
  const appels = [];
  const reg = async (args) => {
    appels.push(args.slice());
    const op = args[0], cle = args[1];
    const nom = (a) => (a.includes('/ve') ? '(Default)' : a[a.indexOf('/v') + 1]);
    if (op === 'add') {
      const d = args.indexOf('/d');
      valeurs.set(cle.toLowerCase() + '|' + nom(args), { type: args[args.indexOf('/t') + 1], donnee: d >= 0 ? args[d + 1] : '' });
      return { ok: true, code: 0, sortie: '' };
    }
    if (op === 'query') {
      const v = valeurs.get(cle.toLowerCase() + '|' + nom(args));
      return v ? { ok: true, code: 0, sortie: cle + '\r\n    (Default)    REG_SZ    ' + v.donnee + '\r\n' } : { ok: false, code: 1, sortie: '' };
    }
    if (op === 'delete') {
      const k = cle.toLowerCase();
      if (args.includes('/v')) { valeurs.delete(k + '|' + args[args.indexOf('/v') + 1]); return { ok: true, code: 0, sortie: '' }; }
      for (const c of Array.from(valeurs.keys())) if (c.startsWith(k + '|') || c.startsWith(k + '\\')) valeurs.delete(c);
      return { ok: true, code: 0, sortie: '' };
    }
    return { ok: false, code: 1, sortie: '' };
  };
  return { reg, valeurs, appels };
}

test('trois écritures, et seulement celles-là : le ProgID, OpenWithProgids, RegisteredApplications — jamais UserChoice', () => {
  const cles = A.ecritures(EXE).map((e) => e.cle).join('\n');
  assert.match(cles, /Software\\Classes\\AktumPDF\.Document\\shell\\open\\command/);
  assert.match(cles, /Software\\Classes\\\.pdf\\OpenWithProgids/);
  assert.match(cles, /Software\\RegisteredApplications/);
  assert.match(cles, /Capabilities\\FileAssociations/);
  assert.doesNotMatch(cles, /UserChoice/i);
  assert.doesNotMatch(cles, /HKLM|HKEY_LOCAL_MACHINE/i, 'rien hors du compte de la personne : aucun droit d\'administrateur');
  A.ecritures(EXE).forEach((e) => assert.match(e.cle, /^HKCU\\/));
});

test('la commande d\'ouverture est l\'exécutable entre guillemets et le document en %1', () => {
  assert.strictEqual(A.commandeDe(EXE), '"C:\\Logiciels\\Aktum PDF\\AktumPDF.exe" "%1"');
});

test('une valeur vide s\'écrit sans /d, et le type REG_NONE passe tel quel', () => {
  const e = A.ecritures(EXE).find((x) => x.type === 'REG_NONE');
  const args = A.argumentsAjout(e);
  assert.deepStrictEqual(args.slice(0, 2), ['add', 'HKCU\\Software\\Classes\\.pdf\\OpenWithProgids']);
  assert.ok(args.includes('REG_NONE'));
  assert.ok(!args.includes('/d'));
  assert.strictEqual(args[args.length - 1], '/f');
});

test('inscrire écrit tout, et l\'état dit « inscrit et à jour »', async () => {
  const { reg } = fauxRegistre();
  assert.deepStrictEqual(await A.etat(EXE, reg), { inscrit: false, aJour: false, commande: '' });
  assert.deepStrictEqual(await A.inscrire(EXE, reg), { ok: true, erreur: '' });
  const e = await A.etat(EXE, reg);
  assert.strictEqual(e.inscrit, true);
  assert.strictEqual(e.aJour, true);
  assert.strictEqual(e.commande, A.commandeDe(EXE));
});

test('retirer efface ce qui a été écrit, et seulement la valeur de OpenWithProgids (d\'autres programmes y sont)', async () => {
  const { reg, appels } = fauxRegistre();
  await A.inscrire(EXE, reg);
  await A.retirer(EXE, reg);
  assert.strictEqual((await A.etat(EXE, reg)).inscrit, false);
  const suppr = appels.filter((a) => a[0] === 'delete');
  const ow = suppr.find((a) => /OpenWithProgids/.test(a[1]));
  assert.deepStrictEqual(ow, ['delete', 'HKCU\\Software\\Classes\\.pdf\\OpenWithProgids', '/v', 'AktumPDF.Document', '/f']);
  assert.ok(!suppr.some((a) => a[1] === 'HKCU\\Software\\Classes\\.pdf'), 'la clé .pdf elle-même n\'est jamais effacée');
});

test('retirer sans rien d\'inscrit n\'est pas une erreur', async () => {
  const { reg } = fauxRegistre();
  assert.deepStrictEqual(await A.retirer(EXE, reg), { ok: true, erreur: '' });
});

test('une écriture refusée au milieu défait ce qui a déjà été écrit : jamais d\'inscription à moitié', async () => {
  const f = fauxRegistre();
  let n = 0;
  const reg = async (args) => {
    if (args[0] === 'add' && ++n === 5) return { ok: false, code: 5, sortie: '' };
    return f.reg(args);
  };
  const r = await A.inscrire(EXE, reg);
  assert.strictEqual(r.ok, false);
  assert.match(r.erreur, /refusé/);
  assert.strictEqual((await A.etat(EXE, f.reg)).inscrit, false);
});

test('au lancement, une inscription qui pointe ailleurs est réécrite ; sans inscription, rien n\'est écrit', async () => {
  const { reg, appels } = fauxRegistre();
  // jamais inscrit : on n'écrit rien
  const avant = await A.reparerAuLancement(EXE, reg);
  assert.strictEqual(avant.repare, false);
  assert.ok(!appels.some((a) => a[0] === 'add'), 'aucune écriture sans demande');
  // inscrit depuis un autre dossier (le dossier a été déplacé)
  const ancien = 'E:\\USB\\AktumPDF.exe';
  await A.inscrire(ancien, reg);
  assert.strictEqual((await A.etat(EXE, reg)).aJour, false);
  const r = await A.reparerAuLancement(EXE, reg);
  assert.strictEqual(r.repare, true);
  assert.strictEqual((await A.etat(EXE, reg)).aJour, true);
  // à jour : plus rien à faire
  assert.strictEqual((await A.reparerAuLancement(EXE, reg)).repare, false);
});

test('pas d\'inscription depuis un support amovible, ni hors de Windows', () => {
  assert.strictEqual(A.possible('win32', EXE, false).ok, true);
  const usb = A.possible('win32', 'E:\\AktumPDF.exe', true);
  assert.strictEqual(usb.ok, false);
  assert.match(usb.raison, /amovible/);
  assert.strictEqual(A.possible('linux', '/opt/aktum', false).ok, false);
  assert.strictEqual(A.possible('darwin', '/Applications/x', false).ok, false);
});

test('la lecture d\'une ligne de reg query, en français comme en anglais', () => {
  assert.strictEqual(A.valeurDeLaSortie('HKEY_X\r\n    (Default)    REG_SZ    "C:\\a b\\x.exe" "%1"\r\n'), '"C:\\a b\\x.exe" "%1"');
  assert.strictEqual(A.valeurDeLaSortie('HKEY_X\r\n    (par défaut)    REG_SZ    "C:\\x.exe" "%1"\r\n'), '"C:\\x.exe" "%1"');
  assert.strictEqual(A.valeurDeLaSortie(''), '');
});
