// Le caviardage tient-il sur des fichiers qui n'ont rien d'une démonstration ?
//
// caviardage.spec.js prouve qu'un mot disparaît d'un PDF d'une page, en
// Helvetica, sans annotation ni métadonnée. Ce fichier-ci fait l'inverse : il
// prend dix-sept PDF d'attaque (test-caviardage/pdf), chacun isolant une
// surface où un nom caviardé peut survivre — dictionnaire /Info et XMP,
// annotations, champs et pièces jointes, signets, texte invisible, objet de
// formulaire, mise à jour incrémentale, couche d'OCR sous un scan, césure,
// accent, zone rognée, police sans table ToUnicode, sous-ensemble serré — et
// regarde le fichier exporté avec un outil qui n'est pas le nôtre : poppler,
// qpdf et pikepdf, sur quinze surfaces.
//
// Cette suite est BLOQUANTE. Un caviardage qui laisse le nom dans le fichier
// tout en annonçant « caviardé » est une fuite de données personnelles, et
// c'est la faute la plus coûteuse que ce logiciel puisse commettre.
//
// Elle demande python3 avec pikepdf, qpdf et poppler-utils. Sur un poste qui
// ne les a pas, elle s'arrête en le disant ; en CI (variable CI), elle échoue.
const { test, expect } = require('./aide');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const DIR = path.join(__dirname, '..', 'test-caviardage');
const VERIFIER = path.join(DIR, 'verifier-caviardage.py');

const outilsPresents = (() => {
  const ok = (cmd, args) => { try { return spawnSync(cmd, args, { encoding: 'utf8' }).status === 0; } catch (_) { return false; } };
  return ok('python3', ['-c', 'import pikepdf']) && ok('qpdf', ['--version']) && ok('pdftotext', ['-v']);
})();
if (!outilsPresents && process.env.CI) {
  throw new Error('python3 + pikepdf, qpdf et pdftotext sont requis par la suite de caviardage (apt-get install qpdf poppler-utils ; pip install pikepdf).');
}

/**
 * f        le PDF d'attaque
 * recherche le terme saisi dans « Rechercher » (caviarder toutes ses occurrences)
 * manuel   [x0, y0, x1, y1] en points PDF : rectangle tracé à la souris, comme
 *          une secrétaire sur un scan dont le nom est dans les pixels
 * termes   ce que le vérificateur ne doit retrouver sur aucune surface
 */
const CAS = [
  { f: '01-metadonnees.pdf', recherche: 'Vasilakis', termes: ['Vasilakis'] },
  { f: '02-annotations.pdf', recherche: 'Vasilakis', termes: ['Vasilakis'] },
  { f: '03-signets.pdf', recherche: 'Vasilakis', termes: ['Vasilakis'] },
  { f: '04-invisible.pdf', recherche: 'Vasilakis', termes: ['Vasilakis'] },
  { f: '05-xobjet-formulaire.pdf', recherche: 'Vasilakis', termes: ['Vasilakis'] },
  { f: '06-incrementale.pdf', recherche: 'Vasilakis', termes: ['Vasilakis'] },
  { f: '07-ocr-sous-image.pdf', recherche: 'Vasilakis', termes: ['Vasilakis'] },
  { f: '08-partielle.pdf', recherche: 'Muller', termes: ['Muller', 'MULLER'] },
  { f: '09-scan-ocr.pdf', manuel: [80, 680, 430, 708], termes: ['Vasilakis'] },
  { f: '10-accents.pdf', recherche: 'Muller', termes: ['Müller', 'MÜLLER'] },
  { f: '11-cropbox.pdf', recherche: 'Vasilakis', termes: ['Vasilakis'] },
  { f: '12-ordinaire.pdf', recherche: 'Vasilakis', termes: ['Vasilakis'] },
  { f: '13-image-en-ligne.pdf', recherche: 'Vasilakis', termes: ['Vasilakis'] },
  { f: '14-police-embarquee.pdf', recherche: 'Vasilakis', termes: ['Vasilakis'] },
  { f: '15-sans-tounicode.pdf', recherche: 'Vasilakis', termes: ['Vasilakis'] },
  { f: '16-meta-2pages.pdf', recherche: 'Vasilakis', termes: ['Vasilakis'] },
  { f: '17-sous-ensemble-serre.pdf', recherche: 'Vasilakis', termes: ['Vasilakis'] },
];

async function caviarderParRecherche(page, terme) {
  await page.click('#btn-search');
  await page.fill('#se-q', terme);
  // La recherche est finie quand son inventaire l'est : visible ou non, le
  // terme est alors compté, et le bouton dit s'il y a quelque chose à retirer.
  await page.waitForFunction(() => document.querySelector('.dialog .list[data-fini="1"]'), null, { timeout: 90000 });
  const peutCaviarder = await page.locator('#se-caviarder').isEnabled();
  if (!peutCaviarder) { await page.click('.dialog .dlg-head .x'); return false; }
  await page.click('#se-caviarder');
  await page.click('#se-caviarder-oui');
  await page.waitForFunction(() => /caviard/i.test(document.querySelector('#last').textContent), null, { timeout: 180000 });
  return true;
}

async function caviarderALaMain(page, [x0, y0, x1, y1]) {
  await page.click('.vue-mode[data-vue="organiser"]');
  await page.waitForSelector('#pages .tile', { timeout: 30000 });
  await page.dblclick('#pages .tile:nth-child(1)');
  await page.waitForSelector('.editor', { state: 'visible', timeout: 30000 });
  await page.click('.ed-tool[data-tool="redact"]');
  const f = await page.locator('.ed-sheet').boundingBox();
  const px = (v) => f.x + v * (f.width / 595);
  const py = (v) => f.y + (842 - v) * (f.height / 842);
  await page.mouse.move(px(x0), py(y1));
  await page.mouse.down();
  await page.mouse.move(px(x1), py(y0), { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.editor', { state: 'hidden', timeout: 20000 });
}

test.describe.configure({ mode: 'parallel' });

for (const cas of CAS) {
  test(`${cas.f} : le nom caviardé ne survit sur aucune des quinze surfaces`, async ({ app, page }) => {
    test.skip(!outilsPresents, 'python3 + pikepdf, qpdf et pdftotext absents de ce poste');
    await app.ouvrir(cas.f, fs.readFileSync(path.join(DIR, 'pdf', cas.f)));
    if (cas.manuel) await caviarderALaMain(page, cas.manuel);
    else await caviarderParRecherche(page, cas.recherche);
    const { octets } = await app.exporter();

    const sortie = fs.mkdtempSync(path.join(os.tmpdir(), 'caviardage-'));
    const fichier = path.join(sortie, cas.f.replace(/\.pdf$/, '.out.pdf'));
    fs.writeFileSync(fichier, octets);
    const r = spawnSync('python3', [VERIFIER, fichier, ...cas.termes], { encoding: 'utf8', timeout: 180000 });
    // Le rapport du vérificateur dit quelle surface a fui : c'est lui qu'on lit.
    expect(r.status, `\n${r.stdout}${r.stderr}`).toBe(0);
  });
}
