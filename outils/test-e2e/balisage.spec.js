// Le balisage d'accessibilité des documents produits. Il n'est pas jugé par le code qui l'écrit :
// verifier-balisage.py (pikepdf) relit l'arbre de structure et le confronte au flux de contenu de
// chaque page ; pdfinfo (poppler) dit si le fichier se déclare balisé ; veraPDF, quand il est
// disponible, juge le dossier de pièces — seul document entièrement écrit par le logiciel — selon
// PDF/UA-1, pour dire ce qui reste à faire plutôt que de le taire.
const { test, expect, pdfDe, pdfTexte, textesDuPdf, pdfEmbarque } = require('./aide');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const python = ['python3', 'python'].find((p) => spawnSync(p, ['-c', 'import pikepdf']).status === 0);
const pdfinfoDispo = spawnSync('pdfinfo', ['-v']).error === undefined;

function ecrire(octets, nom) {
  const f = path.join(os.tmpdir(), 'aktum-balise-' + process.pid + '-' + nom + '.pdf');
  fs.writeFileSync(f, octets);
  return f;
}
// Le jugement de pikepdf : { balise, langue, titre, roles, erreurs… }. En intégration continue, son absence est un échec.
function jugePikepdf(octets, nom) {
  if (!python) {
    if (process.env.CI) throw new Error('pikepdf manque : le balisage n\'est pas jugé.');
    return null;
  }
  const r = spawnSync(python, [path.join(__dirname, 'verifier-balisage.py'), ecrire(octets, nom)], { encoding: 'utf8' });
  let rapport;
  try { rapport = JSON.parse(r.stdout); } catch (e) { throw new Error('verifier-balisage.py : ' + r.stdout + r.stderr); }
  return rapport;
}

async function demanderLeBalisage(app, page, { titre, langue } = {}) {
  await app.outil('props');
  if (titre) await page.fill('#pr-title', titre);
  if (langue) await page.selectOption('#pr-langue', langue);
  await page.check('#pr-balise');
  await page.locator('.dialog .dlg-foot').getByRole('button', { name: 'Enregistrer' }).click();
  await page.waitForSelector('.dialog', { state: 'detached' });
}

const piece = (titre, n) => pdfDe(Array.from({ length: n }, (_, i) => [{ x: 70, y: 700, taille: 20, texte: titre + ' page ' + (i + 1) }]));

test('un dossier de pièces balisé : vrais titres, vraie table des matières, structure cohérente avec le contenu', async ({ app, page }) => {
  await app.ouvrir('convention.pdf', piece('Convention', 2));
  await app.ouvrir('annexe.pdf', piece('Annexe', 2));
  await app.outil('dossier');
  await page.fill('#do-titre', 'Dossier communal');
  await page.click('.dialog .dlg-foot .tb-btn.primary');
  await expect.poll(() => app.dernier(), { timeout: 60000 }).toContain('Dossier constitué');
  await expect.poll(() => app.nbPages()).toBe(7);
  await demanderLeBalisage(app, page, { titre: 'Dossier communal', langue: 'fr' });
  const { octets } = await app.exporter();
  const r = jugePikepdf(octets, 'dossier');
  if (r) {
    expect(r.erreurs, 'cohérence arbre / flux').toEqual([]);
    expect(r.balise).toBe(true);
    expect(r.langue).toBe('fr');
    expect(r.titre).toBe('Dossier communal');
    expect(r.roles['/H1'], 'un titre par intercalaire et un pour le sommaire').toBe(3);
    expect(r.roles['/TOC']).toBe(1);
    expect(r.roles['/TOCI'], 'une ligne de table des matières par pièce').toBe(2);
    expect(r.roles['/Div'], 'un bloc par page venue d\'ailleurs').toBe(4);
    expect(r.roles['/Sect']).toBe(7);
    expect(r.artefacts, 'décors, pieds de page et mentions écartés de la lecture').toBeGreaterThan(5);
  }
  if (pdfinfoDispo) expect(spawnSync('pdfinfo', [ecrire(octets, 'dossier')], { encoding: 'utf8' }).stdout).toMatch(/Tagged:\s+yes/);
  // Le texte se lit toujours, dans l'ordre.
  const t = await textesDuPdf(page, octets);
  expect(t[0]).toContain('Sommaire');
  expect(t[2]).toContain('Pièce n° 1');
});

test('numérotation et filigrane sont des artefacts ; le contenu d\'origine est un bloc ; sans balisage demandé, rien n\'est balisé', async ({ app, page }) => {
  await app.ouvrir('lettre.pdf', pdfTexte(['Bonjour', 'Madame']));
  await app.outil('number');
  await page.locator('.dialog').getByRole('button', { name: 'Appliquer' }).click();
  await page.waitForSelector('.dialog', { state: 'detached' });
  await app.outil('watermark');
  await page.locator('.dialog').getByRole('button', { name: 'Appliquer' }).click();
  await page.waitForSelector('.dialog', { state: 'detached' });
  const sans = await app.exporter();
  const rs = jugePikepdf(sans.octets, 'sans-balisage');
  if (rs) expect(rs.balise, 'pas de balisage sans demande').toBe(false);

  await demanderLeBalisage(app, page, { titre: 'Lettre', langue: 'de' });
  const { octets } = await app.exporter();
  const r = jugePikepdf(octets, 'lettre');
  if (r) {
    expect(r.erreurs).toEqual([]);
    expect(r.langue).toBe('de');
    expect(r.roles['/Div']).toBe(1);
    expect(r.artefacts, 'la numérotation et le filigrane').toBeGreaterThanOrEqual(2);
    expect(r.roles['/P'], 'aucun paragraphe inventé').toBeUndefined();
  }
  const t = (await textesDuPdf(page, octets)).join(' ');
  expect(t).toContain('Bonjour');
  expect(t).toContain('CONFIDENTIEL');
});

test('une page sans texte est une figure dont le texte de remplacement le dit ; un scan reconnu devient un paragraphe', async ({ app, page }) => {
  test.setTimeout(240000);
  const b64 = await page.evaluate(async () => {
    const doc = await window.PDFLib.PDFDocument.create();
    const c = document.createElement('canvas'); c.width = 1240; c.height = 1754;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#000'; x.font = '38px "DejaVu Sans", Arial, sans-serif'; x.textBaseline = 'middle';
    ['Decision du Conseil communal', 'Objet : permis de construire'].forEach((l, i) => x.fillText(l, 120, 200 + i * 70));
    const img = await doc.embedPng(c.toDataURL('image/png'));
    doc.addPage([595, 842]).drawImage(img, { x: 0, y: 0, width: 595, height: 842 });
    const o = await doc.save();
    let t = ''; for (let i = 0; i < o.length; i++) t += String.fromCharCode(o[i]);
    return btoa(t);
  });
  await app.ouvrir('scan.pdf', Buffer.from(b64, 'base64'));
  await demanderLeBalisage(app, page, { titre: 'Scan', langue: 'fr' });
  const avant = await app.exporter();
  const r1 = jugePikepdf(avant.octets, 'scan-sans-ocr');
  if (r1) {
    expect(r1.erreurs).toEqual([]);
    expect(r1.roles['/Figure']).toBe(1);
  }
  const fig = await page.evaluate(async (b) => {
    const d = await window.PDFLib.PDFDocument.load(Uint8Array.from(atob(b), (c) => c.charCodeAt(0)));
    const racine = d.catalog.lookup(window.PDFLib.PDFName.of('StructTreeRoot'));
    let alt = '';
    const visiter = (e) => { if (!e || !e.lookup) return; const a = e.lookup(window.PDFLib.PDFName.of('Alt')); if (a && a.decodeText) alt = a.decodeText(); const k = e.lookup(window.PDFLib.PDFName.of('K')); if (k && k.size) for (let i = 0; i < k.size(); i++) visiter(k.lookup(i)); else visiter(k); };
    visiter(racine.lookup(window.PDFLib.PDFName.of('K')));
    return alt;
  }, avant.octets.toString('base64'));
  expect(fig).toContain('sans texte');
  expect(fig).toContain('reconnaissance de texte');

  // Après la reconnaissance de texte : l'image est un artefact, le texte un paragraphe.
  await app.outil('ocr');
  await page.locator('.dialog').getByRole('button', { name: 'Reconnaître' }).click();
  await expect.poll(() => app.dernier(), { timeout: 200000 }).toMatch(/Texte reconnu/);
  const apres = await app.exporter();
  const r2 = jugePikepdf(apres.octets, 'scan-ocr');
  if (r2) {
    expect(r2.erreurs).toEqual([]);
    expect(r2.roles['/P']).toBe(1);
    expect(r2.roles['/Figure']).toBeUndefined();
    expect(r2.artefacts).toBeGreaterThanOrEqual(1);
  }
});

test('le dossier balisé jugé par veraPDF (PDF/UA-1) : seule la déclaration manque, et elle manque exprès', async ({ app, page }) => {
  test.skip(!process.env.VERAPDF, 'VERAPDF non défini');
  await app.ouvrir('convention.pdf', await pdfEmbarque(page, { pages: 2 }));
  await app.ouvrir('annexe.pdf', await pdfEmbarque(page, { pages: 1 }));
  await app.outil('dossier');
  await page.fill('#do-titre', 'Dossier communal');
  await page.click('.dialog .dlg-foot .tb-btn.primary');
  await expect.poll(() => app.dernier(), { timeout: 60000 }).toContain('Dossier constitué');
  await demanderLeBalisage(app, page, { titre: 'Dossier communal', langue: 'fr' });
  const { octets } = await app.exporter();
  const r = spawnSync(process.env.VERAPDF, ['--flavour', 'ua1', '--format', 'xml', ecrire(octets, 'ua1')], { encoding: 'utf8', timeout: 180000 });
  const regles = Array.from(r.stdout.matchAll(/<rule specification="([^"]*)" clause="([^"]*)" testNumber="([^"]*)" status="failed"[^>]*>\s*<description>([^<]*)<\/description>/g)).map((m) => m[2] + '-' + m[3] + ' : ' + m[4]);
  // Un dossier dont les pièces ont leurs polices incorporées ne manque que de la déclaration PDF/UA
  // elle-même (règle 5-1), que ce logiciel ne pose pas : il ne peut pas garantir le reste pour des pages
  // venues d'ailleurs (liens, images, formulaires).
  expect(regles.map((r) => r.split(' : ')[0]), regles.join(' | ')).toEqual(['5-1']);
});
