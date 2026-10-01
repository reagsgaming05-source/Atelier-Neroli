// Vérifier les signatures d'un PDF reçu : ce que l'outil dit doit être ce qui est vrai du
// fichier, y compris — surtout — quand il a été altéré, et ce qu'il ne peut pas établir.
const { test, expect, pdfVide } = require('./aide');
const fs = require('fs');
const path = require('path');

const FIX = (n) => fs.readFileSync(path.join(__dirname, 'fixtures', n));

async function ouvrirEtVerifier(app, page, nom, octets) {
  await app.ouvrir(nom, octets);
  // La lecture des propriétés se termine après l'ouverture.
  await page.waitForFunction(() => !document.querySelector('#btn-journal').hidden, null, { timeout: 30000 });
  await app.outil('signatures');
  await expect(page.locator('.dialog')).not.toContainText('Contrôle en cours', { timeout: 30000 });
}

test('une signature intacte est dite intacte, avec son signataire et ce que ce logiciel ne peut pas établir', async ({ app, page }) => {
  await ouvrirEtVerifier(app, page, 'decision-signee.pdf', FIX('decision-signee.pdf'));
  const d = page.locator('.dialog');
  await expect(d).toContainText('La signature est intacte : le document est tel qu\'il était au moment de la signature');
  await expect(d).toContainText('Signé par « Signataire d essai (non valide) »');
  await expect(d).toContainText('auto-signé');
  await expect(d).toContainText('n\'a été délivré par aucune autorité');
  await expect(d).toContainText('Révocation du certificat non vérifiée');
  await expect(d).toContainText('rien n\'est envoyé');
  await expect(d).toContainText('Fixture de test');
});

test('un fichier altéré après signature est dit altéré', async ({ app, page }) => {
  const f = Buffer.from(FIX('decision-signee.pdf'));
  f[200] = f[200] === 0x41 ? 0x42 : 0x41;
  await ouvrirEtVerifier(app, page, 'decision-modifiee.pdf', f);
  await expect(page.locator('.dialog')).toContainText('Le contenu signé a été modifié depuis la signature');
  await expect(page.locator('.dialog')).not.toContainText('La signature est intacte');
});

test('un document certifié le dit, et dit ce que le certificat autorise ensuite', async ({ app, page }) => {
  await ouvrirEtVerifier(app, page, 'decision-certifiee.pdf', FIX('decision-certifiee.pdf'));
  await expect(page.locator('.dialog')).toContainText('Document certifié par cette signature');
  await expect(page.locator('.dialog')).toContainText('aucune');
});

test('deux signatures : chacune a son verdict, la première dit qu\'une autre l\'a suivie', async ({ app, page }) => {
  await ouvrirEtVerifier(app, page, 'signee-deux.pdf', FIX('signee-deux.pdf'));
  const d = page.locator('.dialog');
  await expect(d).toContainText('Signature « Signature1 »');
  await expect(d).toContainText('Signature « Signature2 »');
  await expect(d).toContainText('la signature suivante, ce qui est normal');
  await expect(d).toContainText('Chaîne jointe de 2 certificats');
});

test('sans signature, l\'outil le dit', async ({ app, page }) => {
  await app.ouvrir('simple.pdf', pdfVide(1));
  await app.outil('signatures');
  await expect(page.locator('.dialog')).toContainText('Aucune signature numérique');
});
