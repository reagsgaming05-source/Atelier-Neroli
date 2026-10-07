// Signer avec un certificat personnel (.p12) : le geste complet dans la page, avec le composant
// de signature tel qu'il est livré, puis le fichier relu — par l'outil de vérification du logiciel et par
// pdfsig (poppler), qui n'est pas notre code.
const { test, expect, pdfTexte } = require('./aide');
const forge = require('../libs/node-forge-1.4.0/lib/index.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// Un certificat d'essai jetable (une autorité, un signataire) et son fichier .p12 : fabriqués ici, jamais dans le dépôt.
function fabriquerP12(mdp) {
  const cle = (cn, o, parent) => {
    const paire = forge.pki.rsa.generateKeyPair({ bits: 2048 });
    const c = forge.pki.createCertificate();
    c.publicKey = paire.publicKey; c.serialNumber = '0' + Math.floor(Math.random() * 1e9).toString(16);
    c.validity.notBefore = new Date(Date.now() - 86400000); c.validity.notAfter = new Date(Date.now() + 5 * 365 * 86400000);
    const at = [{ name: 'commonName', value: cn }, { name: 'organizationName', value: o }];
    c.setSubject(at); c.setIssuer(parent ? parent.cert.subject.attributes : at);
    c.setExtensions([{ name: 'basicConstraints', cA: !parent }]);
    c.sign(parent ? parent.cle : paire.privateKey, forge.md.sha256.create());
    return { cle: paire.privateKey, cert: c };
  };
  const ca = cle('Autorite d essai (non reconnue)', 'Essai');
  const sig = cle('Marie Dupont', 'Commune d essai', ca);
  const der = forge.asn1.toDer(forge.pkcs12.toPkcs12Asn1(sig.cle, [sig.cert, ca.cert], mdp, { algorithm: 'aes256', generateLocalKeyId: true })).getBytes();
  return Buffer.from(der, 'binary');
}
const P12 = fabriquerP12('secret-essai');
const pdfsigDispo = spawnSync('pdfsig', ['-v']).error === undefined;

async function lireCertificat(app, page, mdp) {
  await app.outil('certificat');
  await page.setInputFiles('#cert-fichier', { name: 'marie.p12', mimeType: 'application/x-pkcs12', buffer: P12 });
  await page.fill('#cert-mdp', mdp);
  await page.click('#cert-lire');
}

test('un mauvais mot de passe est dit, et rien ne se signe', async ({ app, page }) => {
  await app.ouvrir('decision.pdf', pdfTexte(['Décision du conseil']));
  await lireCertificat(app, page, 'pas-le-bon');
  await expect(page.locator('.dialog')).toContainText('Mot de passe incorrect');
  // Sans certificat lu, « Signer » n'est pas offert.
  await expect(page.locator('#cert-signer')).toBeDisabled();
});

test('le document se signe avec le certificat, le fichier relu est intact et le signataire est nommé', async ({ app, page }) => {
  await app.ouvrir('decision.pdf', pdfTexte(['Décision du conseil']));
  await lireCertificat(app, page, 'secret-essai');
  await expect(page.locator('.dialog')).toContainText('Certificat de « Marie Dupont » (Commune d essai)');
  await expect(page.locator('.dialog')).toContainText('délivré par « Autorite d essai (non reconnue) »');
  await page.fill('#cert-raison', 'Approbation');
  await page.fill('#cert-lieu', 'Lacville');
  const { nom, octets } = await app.recolter(() => page.click('#cert-signer'));
  expect(nom).toBe('decision-signe.pdf');
  expect(octets.subarray(0, 5).toString()).toBe('%PDF-');
  // Relu par un contrôleur qui n'est pas le nôtre.
  if (pdfsigDispo) {
    const f = path.join(os.tmpdir(), 'cert-e2e-' + process.pid + '.pdf');
    fs.writeFileSync(f, octets);
    const r = spawnSync('pdfsig', [f], { encoding: 'utf8' }).stdout;
    expect(r).toMatch(/Signature Validation: Signature is Valid/);
    expect(r).toMatch(/Signer Certificate Common Name: Marie Dupont/);
    expect(r).toMatch(/Total document signed/);
  }
  // Et par l'outil de vérification du logiciel, sur le fichier rouvert.
  await app.ouvrir('decision-signe.pdf', octets);
  await page.waitForFunction(() => !document.querySelector('#btn-journal').hidden, null, { timeout: 30000 });
  await app.outil('signatures');
  const d = page.locator('.dialog');
  await expect(d).toContainText('La signature est intacte', { timeout: 30000 });
  await expect(d).toContainText('Signé par « Marie Dupont » (Commune d essai)');
  await expect(d).toContainText('Motif indiqué : Approbation');
  await expect(d).toContainText('Chaîne jointe de 2 certificats');
});

test('un document protégé par mot de passe ne se signe pas, et le dit', async ({ app, page }) => {
  await app.ouvrir('decision.pdf', pdfTexte(['Décision du conseil']));
  await app.outil('password');
  await page.fill('#se-up', 'secret123');
  await page.locator('.dialog').getByRole('button', { name: 'Appliquer' }).click();
  await page.waitForSelector('.dialog', { state: 'detached' });
  await app.outil('certificat');
  await expect(page.locator('.dialog')).toContainText('protégé par un mot de passe');
});
