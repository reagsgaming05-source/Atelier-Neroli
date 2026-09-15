/*
 * Test de fumée de l'application fenêtrée : la fenêtre s'ouvre avec son menu, un PDF
 * passé sur la ligne de commande (comme au double-clic) s'ouvre, les imprimantes sont
 * lues, et « Exporter » écrit un vrai PDF.
 *
 *   node smoke-test.js                              # source (electron .)
 *   node smoke-test.js chemin/vers/BlonayPDF.exe    # exécutable empaqueté
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { _electron: electron } = require('playwright-core');

// Un PDF de trois pages, écrit à la main : rien à installer pour le produire.
function fabriquerPdf(n) {
  const objets = ['<< /Type /Catalog /Pages 2 0 R >>'];
  const kids = Array.from({ length: n }, (_, i) => (3 + i) + ' 0 R').join(' ');
  objets.push('<< /Type /Pages /Kids [' + kids + '] /Count ' + n + ' >>');
  for (let i = 0; i < n; i++) objets.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>');
  let corps = '%PDF-1.4\n';
  const decalages = [];
  objets.forEach((o, i) => { decalages.push(corps.length); corps += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  const xref = corps.length;
  corps += 'xref\n0 ' + (objets.length + 1) + '\n0000000000 65535 f \n' + decalages.map((d) => String(d).padStart(10, '0') + ' 00000 n \n').join('');
  corps += 'trailer\n<< /Size ' + (objets.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(corps, 'latin1');
}

(async () => {
  const exe = process.argv[2];
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'blonay-fumee-'));
  const pdf = path.join(dossier, 'essai.pdf');
  fs.writeFileSync(pdf, fabriquerPdf(3));
  const env = { ...process.env, BLONAY_SMOKE_DIR: dossier };
  const app = await electron.launch(exe
    ? { executablePath: exe, args: [pdf], env }
    : { args: [path.join(__dirname), pdf, '--no-sandbox'], env });
  const win = await app.firstWindow();
  win.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await win.waitForLoadState('domcontentloaded');
  await win.waitForSelector('#app-toolbar', { state: 'visible', timeout: 60000 });
  // le document de la ligne de commande s'ouvre (3 pages), à la place de l'exemple
  await win.waitForFunction(() => document.querySelectorAll('#pages .tile').length === 3, null, { timeout: 60000 });
  const title = await win.title();
  const menu = await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items.map((i) => i.label));
  const info = await win.evaluate(async () => ({
    bureau: !!window.BlonayDesktop,
    docs: Array.from(document.querySelectorAll('#doc-list .doc-name')).map((e) => e.textContent),
    exemple: !!document.querySelector('#doc-list .badge'),
    imprimantes: Array.isArray(await window.BlonayDesktop.imprimantes()),
  }));
  console.log('titre :', title, '| menu :', JSON.stringify(menu));
  console.log(JSON.stringify(info));
  // une fonction réelle : Exporter écrit un vrai PDF de 3 pages (sans boîte de dialogue en fumée)
  await win.click('#btn-export');
  await win.waitForFunction(() => /Enregistré/.test(document.querySelector('#last').textContent), null, { timeout: 60000 });
  const dernier = await win.evaluate(() => document.querySelector('#last').textContent);
  const sortie = fs.readdirSync(dossier).filter((f) => f !== 'essai.pdf' && f.endsWith('.pdf'))[0];
  const octets = sortie ? fs.readFileSync(path.join(dossier, sortie)) : Buffer.alloc(0);
  const texte = octets.toString('latin1');
  const pages = (texte.match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log('export :', sortie, octets.length, 'octets,', pages, 'page(s) |', dernier);
  let ok = title === 'Blonay PDF' && JSON.stringify(menu) === JSON.stringify(['Fichier', 'Affichage', 'Outils', 'Aide'])
    && info.bureau && info.docs.length === 1 && /essai\.pdf/.test(info.docs[0]) && !info.exemple && info.imprimantes
    && octets.slice(0, 5).toString() === '%PDF-' && pages === 3 && /Enregistré/.test(dernier);
  // un second double-clic (seconde instance) ouvre SA fenêtre, sans toucher à la première
  const pdf2 = path.join(dossier, 'autre.pdf');
  fs.writeFileSync(pdf2, fabriquerPdf(2));
  const { spawn } = require('child_process');
  const seconde = exe ? spawn(exe, [pdf2], { env, stdio: 'ignore' }) : spawn(require('electron'), [path.join(__dirname), pdf2, '--no-sandbox'], { env, stdio: 'ignore' });
  seconde.on('error', () => {});
  const win2 = await app.waitForEvent('window', { timeout: 60000 });
  await win2.waitForSelector('#app-toolbar', { state: 'visible', timeout: 60000 });
  await win2.waitForFunction(() => document.querySelectorAll('#pages .tile').length === 2, null, { timeout: 60000 });
  const docs2 = await win2.evaluate(() => Array.from(document.querySelectorAll('#doc-list .doc-name')).map((e) => e.textContent));
  const docs1 = await win.evaluate(() => Array.from(document.querySelectorAll('#doc-list .doc-name')).map((e) => e.textContent));
  console.log('seconde fenêtre :', JSON.stringify(docs2), '| première inchangée :', JSON.stringify(docs1), '| fenêtres :', app.windows().length);
  ok = ok && app.windows().length === 2 && docs2.length === 1 && /autre\.pdf/.test(docs2[0]) && docs1.length === 1 && /essai\.pdf/.test(docs1[0]);
  await app.close();
  fs.rmSync(dossier, { recursive: true, force: true });
  console.log(ok ? 'SMOKE OK' : 'SMOKE ÉCHEC');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
