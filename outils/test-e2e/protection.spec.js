// « Protection par mot de passe » sur le document ouvert (et pas seulement par lots) : ce que l'écran annonce est ce que le fichier contient.
// Le juge n'est pas notre code : qpdf relit le chiffrement des octets que l'application a écrits.
const { test, expect, pdfDe } = require('./aide');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const MOT = 'cochonnerie-introuvable';
const document = () => pdfDe([[{ x: 70, y: 700, taille: 16, texte: MOT }], [{ x: 70, y: 700, taille: 16, texte: 'page deux' }]]);

function qpdf(octets, args) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-prot-'));
  const f = path.join(dossier, 'sortie.pdf');
  try {
    fs.writeFileSync(f, octets);
    const r = spawnSync('qpdf', [...args, f], { encoding: 'utf8' });
    if (r.error) throw new Error('qpdf est requis par la suite de bout en bout : ' + r.error.message);
    return { statut: r.status, sortie: String(r.stdout || '') + String(r.stderr || '') };
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}

async function proteger(app, page, { ouverture, proprietaire, interdire }) {
  await app.outil('password');
  if (ouverture) await page.fill('#se-up', ouverture);
  if (proprietaire) await page.fill('#se-op', proprietaire);
  for (const nom of interdire || []) await page.uncheck('#se-' + nom);
  await page.click('.dialog button:has-text("Appliquer")');
  await page.waitForSelector('.dialog', { state: 'detached' });
  // La puce de l'état dit ce qui sera écrit : elle ne doit pas promettre autre chose que le fichier.
  await expect(page.locator('#last')).toContainText('Protection par mot de passe retenue');
}

test('un mot de passe d\'ouverture : le fichier est chiffré en AES-256, illisible sans lui, lisible avec', async ({ app, page }) => {
  await app.ouvrir('lettre.pdf', document());
  await proteger(app, page, { ouverture: 'ouvre-B2', proprietaire: 'proprio-A1' });
  const { octets } = await app.exporter();
  const t = octets.toString('latin1');
  expect(t).toContain('/Encrypt');
  expect(t, 'le texte ne traîne pas en clair dans le fichier').not.toContain(MOT);

  // Sans le mot de passe, un autre lecteur refuse ; avec, il relit un fichier sain.
  const sans = qpdf(octets, ['--check']);
  expect(sans.statut).toBe(2);
  expect(sans.sortie).toMatch(/invalid password/i);
  const avec = qpdf(octets, ['--password=ouvre-B2', '--check']);
  expect(avec.sortie).toMatch(/No syntax or stream encoding errors found/);
  const chiffrement = qpdf(octets, ['--password=ouvre-B2', '--show-encryption']);
  expect(chiffrement.sortie).toMatch(/R = 6/);
  expect(chiffrement.sortie).toMatch(/AES/i);
});

test('des autorisations seules : le fichier s\'ouvre sans mot de passe, et refuse ce qui a été interdit', async ({ app, page }) => {
  await app.ouvrir('lettre.pdf', document());
  await proteger(app, page, { proprietaire: 'proprio-A1', interdire: ['copying', 'modifying'] });
  const { octets } = await app.exporter();
  expect(octets.toString('latin1')).toContain('/Encrypt');

  const sortie = qpdf(octets, ['--show-encryption']);
  expect(sortie.statut).toBe(0);
  expect(sortie.sortie).toMatch(/User password = ?\n/);
  expect(sortie.sortie).toMatch(/extract for any purpose: not allowed/);
  expect(sortie.sortie).toMatch(/modify other annotations: allowed|modify annotations: allowed/);
  expect(qpdf(octets, ['--check']).sortie).toMatch(/No syntax or stream encoding errors found/);
});

test('retirer la protection avant d\'enregistrer : le fichier n\'est pas chiffré, et la puce le dit', async ({ app, page }) => {
  await app.ouvrir('lettre.pdf', document());
  await proteger(app, page, { ouverture: 'ouvre-B2' });
  await app.outil('password');
  await page.click('.dialog button:has-text("Retirer")');
  await page.waitForSelector('.dialog', { state: 'detached' });
  await expect(page.locator('#last')).toContainText('Protection retirée');
  const { octets } = await app.exporter();
  expect(octets.toString('latin1')).not.toContain('/Encrypt');
  expect(qpdf(octets, ['--check']).statut).toBe(0);
});
