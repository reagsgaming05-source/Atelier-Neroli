/*
 * L'inscription « Ouvrir avec Aktum PDF », éprouvée contre le VRAI registre (reg.exe). Sous Windows seulement : ailleurs, il n'y a pas de
 * registre et le test le dit sans échouer (la logique est éprouvée par test/association.test.js, avec un faux registre).
 *
 *   node association-test.js
 *
 * Ce que ce test ferait constater, et que le faux registre ne peut pas : que la ligne de commande passe bien par reg.exe avec ses guillemets
 * et son « %1 » (un chemin avec espaces, un argument vide…), que la lecture d'une valeur relit ce qu'on a écrit, que le retrait ne laisse
 * rien, et que les autres programmes de .pdf\OpenWithProgids ne sont pas touchés.
 */
const assert = require('assert');
const { execFileSync } = require('child_process');
const A = require('./association.js');

if (process.platform !== 'win32') { console.log('association-test : sans objet hors de Windows (pas de registre).'); process.exit(0); }

const EXE = 'C:\\Program Files\\Test Aktum\\AktumPDF.exe';
const reg = (args) => { try { return execFileSync('reg', args, { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return null; } };
const valeur = (cle, nom) => { const s = reg(['query', cle, nom ? '/v' : '/ve'].concat(nom ? [nom] : [])); return s == null ? null : A.valeurDeLaSortie(s); };

(async () => {
  // Un autre programme, déjà candidat à .pdf : l'inscription et le retrait ne doivent pas y toucher.
  const AUTRE = 'AutreProgramme.Test';
  reg(['add', 'HKCU\\Software\\Classes\\.pdf\\OpenWithProgids', '/v', AUTRE, '/t', 'REG_NONE', '/f']);
  try {
    assert.strictEqual((await A.etat(EXE)).inscrit, false, 'rien d\'inscrit au départ');
    const r = await A.inscrire(EXE);
    assert.deepStrictEqual(r, { ok: true, erreur: '' }, 'l\'inscription réussit sans droits d\'administrateur : ' + r.erreur);
    const e = await A.etat(EXE);
    assert.strictEqual(e.inscrit, true);
    assert.strictEqual(e.aJour, true, 'la commande relue est celle qu\'on a écrite : ' + e.commande);
    assert.strictEqual(e.commande, '"' + EXE + '" "%1"');
    assert.ok(reg(['query', 'HKCU\\Software\\Classes\\.pdf\\OpenWithProgids', '/v', A.PROGID]), 'proposé dans « Ouvrir avec »');
    assert.strictEqual(valeur('HKCU\\Software\\RegisteredApplications', A.CLE_APP), 'Software\\AktumPDF\\Capabilities', 'déclaré dans les applications par défaut');
    assert.strictEqual(valeur('HKCU\\Software\\AktumPDF\\Capabilities\\FileAssociations', '.pdf'), A.PROGID);
    assert.ok(reg(['query', 'HKCU\\Software\\Classes\\.pdf\\OpenWithProgids', '/v', AUTRE]), 'l\'autre programme est toujours là');
    const uc = reg(['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.pdf\\UserChoice', '/v', 'ProgId']);
    assert.ok(!uc || !/AktumPDF/.test(uc), 'UserChoice n\'est jamais écrit : le choix par défaut reste à Windows');

    // Le dossier a été déplacé : l'inscription est réécrite au lancement.
    const AILLEURS = 'D:\\Ailleurs\\AktumPDF.exe';
    const rep = await A.reparerAuLancement(AILLEURS);
    assert.strictEqual(rep.repare, true, 'une inscription qui pointe ailleurs est réécrite');
    assert.strictEqual((await A.etat(AILLEURS)).aJour, true);

    await A.retirer(AILLEURS);
    assert.strictEqual((await A.etat(AILLEURS)).inscrit, false, 'retirée');
    assert.strictEqual(reg(['query', 'HKCU\\Software\\Classes\\.pdf\\OpenWithProgids', '/v', A.PROGID]), null);
    assert.strictEqual(reg(['query', 'HKCU\\Software\\AktumPDF']), null);
    assert.ok(reg(['query', 'HKCU\\Software\\Classes\\.pdf\\OpenWithProgids', '/v', AUTRE]), 'l\'autre programme est toujours là après le retrait');
    // Sans inscription, le lancement n'écrit rien.
    assert.strictEqual((await A.reparerAuLancement(EXE)).repare, false);
    assert.strictEqual((await A.etat(EXE)).inscrit, false);
    console.log('ASSOCIATION OK');
  } finally {
    await A.retirer(EXE).catch(() => {});
    reg(['delete', 'HKCU\\Software\\Classes\\.pdf\\OpenWithProgids', '/v', AUTRE, '/f']);
  }
})().catch((e) => { console.error('ASSOCIATION ÉCHEC :', e && e.stack || e); process.exit(1); });
