/*
 * Le mode d'emploi, en PDF.
 *
 *   xvfb-run node faire-le-guide.js [sortie.pdf]     (Linux sans écran)
 *   node faire-le-guide.js [sortie.pdf]              (poste avec écran)
 *   node faire-le-guide.js --garder                  (ne pas reprendre les captures)
 *
 * Deux temps : captures.js photographie l'application, puis guide.html est
 * imprimé en PDF par Chromium. Le guide se refait donc d'une commande quand
 * l'interface bouge, au lieu de vieillir dans un coin.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const APP = path.join(__dirname, '..', 'desktop');
process.chdir(__dirname);
const { chromium } = require(path.join(APP, 'node_modules', 'playwright-core'));

const args = process.argv.slice(2);
const garder = args.includes('--garder');
const sortie = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(__dirname, 'Blonay-PDF-mode-d-emploi.pdf'));
const CAPTURES = path.join(__dirname, 'captures');

(async () => {
  if (!garder || !fs.existsSync(CAPTURES) || !fs.readdirSync(CAPTURES).length) {
    console.log('Captures…');
    execFileSync(process.execPath, [path.join(__dirname, 'captures.js'), CAPTURES], { stdio: 'inherit' });
  }

  // Le navigateur : celui de Playwright, ou celui que BLONAY_CHROMIUM désigne
  // sur un poste où le téléchargement est coupé.
  const nav = await chromium.launch(process.env.BLONAY_CHROMIUM
    ? { executablePath: process.env.BLONAY_CHROMIUM } : {});
  const page = await nav.newPage();
  const erreurs = [];
  page.on('requestfailed', (r) => erreurs.push(r.url()));
  await page.goto('file://' + path.join(__dirname, 'guide.html'), { waitUntil: 'load' });

  // Une image manquante ne se voit pas dans un PDF : on la fait dire.
  const manquantes = await page.evaluate(() => Array.from(document.images)
    .filter((i) => !i.complete || !i.naturalWidth).map((i) => i.getAttribute('src')));
  if (manquantes.length) throw new Error('Images absentes : ' + manquantes.join(', '));

  const pied = `<div style="width:100%;padding:0 16mm;font:8pt 'Liberation Sans',Arial,sans-serif;color:#8892a0;display:flex;justify-content:space-between">
    <span>Blonay PDF — mode d'emploi</span><span class="pageNumber"></span></div>`;
  await page.pdf({
    path: sortie, format: 'A4', printBackground: true,
    displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: pied,
    margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' },
  });
  await nav.close();

  const ko = Math.round(fs.statSync(sortie).size / 1024);
  console.log(sortie + ' — ' + ko + ' Ko');
  if (erreurs.length) console.error('Ressources non chargées :\n  ' + erreurs.join('\n  '));
  console.log('GUIDE OK');
})().catch((e) => { console.error(e.message); process.exit(1); });
