/*
 * Glisser une page vers le Bureau : la page se prépare dans le dossier de données, le geste part du système avec ce fichier-là
 * et aucun autre, et le dossier est vidé à la fermeture.
 *
 * Le glisser du système ne se joue pas d'ici : on remplace startDrag par un espion dans le processus principal, puis on
 * déclenche le dragstart sur la poignée de la page, comme le ferait la souris.
 *
 *   node glisser-test.js                              # source (electron .)
 *   node glisser-test.js chemin/vers/AktumPDF.exe    # exécutable empaqueté
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { _electron: electron } = require('playwright-core');

function fabriquerPdf(n) {
  const objets = ['<< /Type /Catalog /Pages 2 0 R >>'];
  objets.push('<< /Type /Pages /Kids [' + Array.from({ length: n }, (_, i) => (3 + i) + ' 0 R').join(' ') + '] /Count ' + n + ' >>');
  for (let i = 0; i < n; i++) objets.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>');
  let corps = '%PDF-1.4\n';
  const decalages = [];
  objets.forEach((o, i) => { decalages.push(corps.length); corps += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  const xref = corps.length;
  corps += 'xref\n0 ' + (objets.length + 1) + '\n0000000000 65535 f \n' + decalages.map((d) => String(d).padStart(10, '0') + ' 00000 n \n').join('');
  corps += 'trailer\n<< /Size ' + (objets.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(corps, 'latin1');
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
async function attendre(cond, delai, quoi) {
  const fin = Date.now() + delai;
  while (Date.now() < fin) { if (await cond()) return true; await dormir(200); }
  throw new Error('délai dépassé : ' + quoi);
}

(async () => {
  const exe = process.argv[2];
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-glisser-'));
  const smoke = path.join(racine, 'poste');
  const doc = path.join(racine, 'dossier-du-conseil.pdf');
  fs.writeFileSync(doc, fabriquerPdf(3));
  let ok = true;
  const verifier = (cond, quoi) => { console.log((cond ? '  ok - ' : 'ÉCHEC : ') + quoi); if (!cond) ok = false; };

  const app = await electron.launch(exe
    ? { executablePath: exe, args: [doc], env: { ...process.env, AKTUM_SMOKE_DIR: smoke } }
    : { args: [path.join(__dirname), doc, '--no-sandbox'], env: { ...process.env, AKTUM_SMOKE_DIR: smoke } });
  const win = await app.firstWindow();
  win.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await win.waitForSelector('#app-toolbar', { state: 'visible', timeout: 60000 });
  await win.waitForFunction(() => document.querySelectorAll('#pages .tile').length === 3, null, { timeout: 60000 });
  // L'espion : ce que le système recevrait pour partir.
  await app.evaluate(({ BrowserWindow }) => {
    global.__glisses = [];
    const w = BrowserWindow.getAllWindows()[0];
    w.webContents.startDrag = (o) => { global.__glisses.push({ file: o.file, icone: !!(o.icon && !o.icon.isEmpty()) }); };
  });
  await win.keyboard.press('Control+Shift+2');
  const poignee = win.locator('#pages .tile:nth-child(2) button[data-act="glisser"]');
  verifier(await poignee.count() === 1, 'la page porte une poignée « glisser vers le Bureau »');
  verifier(await poignee.getAttribute('draggable') === 'true', 'et cette poignée est glissable');

  // Le glisser part dès que la page est prête : la souris touche la poignée, la page se prépare.
  await win.locator('#pages .tile:nth-child(2)').hover();
  await poignee.hover();
  const dossier = path.join(smoke, 'donnees', 'glisser');
  await attendre(() => fs.existsSync(dossier) && fs.readdirSync(dossier).length > 0, 20000, 'la page est préparée dans le dossier de données');
  await dormir(500);
  await poignee.dispatchEvent('dragstart');
  await attendre(async () => (await app.evaluate(() => global.__glisses.length)) > 0, 10000, 'le glisser part');
  const g = (await app.evaluate(() => global.__glisses))[0];
  verifier(g.icone, 'le glisser porte une icône (le système l\'exige)');
  verifier(path.resolve(g.file).startsWith(path.resolve(dossier) + path.sep), 'il part d\'un fichier du dossier de données de l\'application');
  verifier(/dossier-du-conseil-p2\.pdf$/.test(g.file), 'le fichier est nommé d\'après le document et la page (« ' + path.basename(g.file) + ' »)');
  const octets = fs.readFileSync(g.file).toString('latin1');
  verifier(octets.startsWith('%PDF-') && (octets.match(/\/Type\s*\/Page[^s]/g) || []).length === 1, 'et c\'est un PDF d\'une seule page');

  // Seul ce que l'application a préparé peut partir : un chemin quelconque envoyé par la page est refusé.
  await win.evaluate(() => window.AktumDesktop.glisser('/etc/passwd'));
  await win.evaluate((c) => window.AktumDesktop.glisser(c + '/../../../etc/passwd'), dossier);
  await dormir(600);
  verifier((await app.evaluate(() => global.__glisses.length)) === 1, 'un chemin hors du dossier préparé ne part pas');

  await app.close().catch(() => {});
  await dormir(800);
  verifier(!fs.existsSync(dossier), 'à la fermeture, plus rien ne traîne dans le dossier de glisser');

  try { fs.rmSync(racine, { recursive: true, force: true }); } catch (e) { /* tenu un instant encore */ }
  console.log(ok ? 'GLISSER OK' : 'GLISSER ÉCHEC');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
