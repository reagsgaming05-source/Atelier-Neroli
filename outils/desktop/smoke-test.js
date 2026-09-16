/*
 * Test de fumée de l'application fenêtrée : la fenêtre s'ouvre avec son menu, un PDF
 * passé sur la ligne de commande (comme au double-clic) s'ouvre, les imprimantes sont
 * lues, « Enregistrer sous… » écrit un vrai PDF, « Enregistrer » réécrit ce fichier
 * après confirmation, le travail en cours survit à un arrêt brutal (récupération),
 * et un second double-clic ouvre sa propre fenêtre.
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
const compterPages = (octets) => (octets.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
const compterTournees = (octets) => (octets.toString('latin1').match(/\/Rotate\s+90\b/g) || []).length;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
async function attendre(cond, delai, quoi) {
  const fin = Date.now() + delai;
  while (Date.now() < fin) { if (await cond()) return true; await dormir(400); }
  throw new Error('délai dépassé : ' + quoi);
}
const lancer = (exe, dossier, env, fichiers) => electron.launch(exe
  ? { executablePath: exe, args: fichiers, env }
  : { args: [path.join(__dirname), ...fichiers, '--no-sandbox'], env });
async function fenetrePrete(app) {
  const win = await app.firstWindow();
  win.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await win.waitForLoadState('domcontentloaded');
  await win.waitForSelector('#app-toolbar', { state: 'visible', timeout: 60000 });
  return win;
}
const dernier = (win) => win.evaluate(() => document.querySelector('#last').textContent);
const menuClic = (app, id) => app.evaluate(({ Menu }, id) => { const it = Menu.getApplicationMenu().getMenuItemById(id); if (!it) throw new Error('menu absent : ' + id); it.click(); }, id);
// Sélectionne la n-ième page (vue Organiser) et la pivote par la barre de sélection.
async function tournerPage(win, n) {
  await win.keyboard.press('Control+2');
  await win.keyboard.press('Escape');   // un clic sur une vignette l'ajoute à la sélection : on repart de rien
  await win.click('#pages .tile:nth-child(' + n + ')');
  await win.click('#sel-rot-right');
  await win.waitForFunction(() => /modifié/.test(document.querySelector('#summary').textContent), null, { timeout: 10000 });
  console.log('  page ' + n + ' pivotée · drapeaux :', JSON.stringify(await win.evaluate(() => Array.from(document.querySelectorAll('#pages .tile')).map((t) => Array.from(t.querySelectorAll('.flag')).map((f) => f.textContent).join('/')))));
}

(async () => {
  const exe = process.argv[2];
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'blonay-fumee-'));
  const pdf = path.join(dossier, 'essai.pdf');
  fs.writeFileSync(pdf, fabriquerPdf(3));
  // BLONAY_SMOKE_DIR : les enregistrements y vont sans boîte de dialogue, et les
  // données (récents, récupération) dans son sous-dossier « donnees ».
  const env = { ...process.env, BLONAY_SMOKE_DIR: dossier };
  const sortie = path.join(dossier, 'essai-modifie.pdf');
  let ok = true;
  const verifier = (cond, quoi) => { if (!cond) { ok = false; console.log('ÉCHEC :', quoi); } };

  let app = await lancer(exe, dossier, env, [pdf]);
  let win = await fenetrePrete(app);
  // le document de la ligne de commande s'ouvre (3 pages), à la place de l'exemple
  await win.waitForFunction(() => document.querySelectorAll('#pages .tile').length === 3, null, { timeout: 60000 });
  const title = await win.title();
  const menu = await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items.map((i) => i.label));
  const info = await win.evaluate(async () => ({
    bureau: !!window.BlonayDesktop,
    docs: Array.from(document.querySelectorAll('#doc-list .doc-name')).map((e) => e.textContent),
    exemple: !!document.querySelector('#doc-list .badge'),
    imprimantes: Array.isArray(await window.BlonayDesktop.imprimantes()),
    bouton: document.querySelector('#btn-export .lbl').textContent,
  }));
  const donnees = await app.evaluate(({ app }) => app.getPath('userData'));
  console.log('titre :', title, '| menu :', JSON.stringify(menu), '| données :', donnees);
  console.log(JSON.stringify(info));
  verifier(title === 'Blonay PDF' && JSON.stringify(menu) === JSON.stringify(['Fichier', 'Affichage', 'Outils', 'Aide']), 'titre ou menu');
  verifier(info.bureau && info.docs.length === 1 && /essai\.pdf/.test(info.docs[0]) && !info.exemple && info.imprimantes, 'document du lancement');
  verifier(info.bouton === 'Enregistrer', 'bouton Enregistrer');
  verifier(donnees === path.join(dossier, 'donnees'), 'dossier de données du test');

  // 1. Enregistrer sous… (menu) écrit un vrai PDF de 3 pages, sans boîte de dialogue en fumée
  await menuClic(app, 'enregistrer-sous');
  await win.waitForFunction(() => /Enregistré/.test(document.querySelector('#last').textContent), null, { timeout: 60000 });
  let octets = fs.existsSync(sortie) ? fs.readFileSync(sortie) : Buffer.alloc(0);
  console.log('enregistrer sous :', path.basename(sortie), octets.length, 'octets,', compterPages(octets), 'page(s) |', await dernier(win));
  verifier(octets.slice(0, 5).toString() === '%PDF-' && compterPages(octets) === 3 && compterTournees(octets) === 0, 'enregistrer sous');

  // 2. Enregistrer (Ctrl+S / bouton) : après confirmation, le fichier est réécrit sur place
  await tournerPage(win, 1);
  await win.click('#btn-export');
  await win.waitForSelector('#ecr-remplacer', { state: 'visible', timeout: 10000 });
  const question = await win.evaluate(() => document.querySelector('.dialog h2').textContent);
  await win.click('#ecr-remplacer');
  await attendre(() => fs.existsSync(sortie) && compterTournees(fs.readFileSync(sortie)) === 1, 60000, 'réécriture du fichier');
  await win.waitForFunction(() => !/modifié/.test(document.querySelector('#summary').textContent), null, { timeout: 10000 });
  octets = fs.readFileSync(sortie);
  const fichiers = fs.readdirSync(dossier).filter((f) => f.endsWith('.pdf')).sort();
  console.log('enregistrer :', question, '|', compterPages(octets), 'page(s),', compterTournees(octets), 'tournée(s) | fichiers :', JSON.stringify(fichiers), '|', await dernier(win));
  verifier(/essai-modifie\.pdf/.test(question) && compterPages(octets) === 3 && compterTournees(octets) === 1, 'enregistrer sur place');
  verifier(JSON.stringify(fichiers) === JSON.stringify(['essai-modifie.pdf', 'essai.pdf']), 'aucun fichier en plus');
  verifier(/Enregistré : .*essai-modifie\.pdf/.test(await dernier(win)), 'message Enregistré');

  // 3. Récupération : une modification non enregistrée est mise de côté, puis
  //    l'application est tuée (comme un plantage) et relancée.
  await tournerPage(win, 2);
  const dossierRecup = path.join(donnees, 'recuperation');
  const manifestes = () => { try { return fs.readdirSync(dossierRecup).map((c) => path.join(dossierRecup, c, 'manifeste.json')).filter((f) => fs.existsSync(f)); } catch (e) { return []; } };
  await attendre(() => manifestes().length === 1, 60000, 'dépôt de récupération');
  const manifeste = JSON.parse(fs.readFileSync(manifestes()[0], 'utf8'));
  console.log('récupération :', manifeste.titre, '|', manifeste.pages.length, 'pages,', manifeste.pages.filter((p) => p.rot === 90).length, 'tournée(s) | fichier :', manifeste.chemin);
  verifier(manifeste.pages.length === 3 && manifeste.pages.filter((p) => p.rot === 90).length === 2 && manifeste.chemin === sortie, 'manifeste de récupération');
  app.process().kill('SIGKILL');
  await dormir(1500);
  app = await lancer(exe, dossier, env, []);
  win = await fenetrePrete(app);
  await win.waitForSelector('#recup-ok', { state: 'visible', timeout: 60000 });
  const proposition = await win.evaluate(() => document.querySelector('.dialog').textContent);
  await win.click('#recup-ok');
  await win.waitForFunction(() => document.querySelectorAll('#pages .tile').length === 3 && /modifié/.test(document.querySelector('#summary').textContent), null, { timeout: 60000 });
  await attendre(() => manifestes().length === 1, 5000, 'dépôt conservé après récupération');
  // le document récupéré s'enregistre comme avant : les deux pages tournées y sont
  await menuClic(app, 'enregistrer-sous');
  await win.waitForFunction(() => /Enregistré/.test(document.querySelector('#last').textContent), null, { timeout: 60000 });
  await attendre(() => manifestes().length === 0, 10000, 'dépôt effacé après enregistrement');
  octets = fs.readFileSync(sortie);
  const docsRecup = await win.evaluate(() => Array.from(document.querySelectorAll('#doc-list .doc-name')).map((e) => e.textContent));
  console.log('récupéré :', /retrouvé/.test(proposition) ? 'proposé' : 'NON PROPOSÉ', '|', JSON.stringify(docsRecup), '|', compterPages(octets), 'page(s),', compterTournees(octets), 'tournée(s) |', await dernier(win));
  verifier(/retrouvé/.test(proposition) && docsRecup.length === 1 && /essai\.pdf/.test(docsRecup[0]), 'proposition de récupération');
  verifier(compterPages(octets) === 3 && compterTournees(octets) === 2, 'document récupéré enregistré');

  // 4. un second double-clic (seconde instance) ouvre SA fenêtre, sans toucher à la première
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
  verifier(app.windows().length === 2 && docs2.length === 1 && /autre\.pdf/.test(docs2[0]) && docs1.length === 1 && /essai\.pdf/.test(docs1[0]), 'seconde instance');
  // les récents connaissent les deux documents et le fichier enregistré
  const recents = JSON.parse(fs.readFileSync(path.join(donnees, 'recents.json'), 'utf8'));
  console.log('récents :', JSON.stringify(recents.map((c) => path.basename(c))));
  verifier(recents.includes(pdf) && recents.includes(pdf2) && recents.includes(sortie), 'fichiers récents');
  await app.close();
  fs.rmSync(dossier, { recursive: true, force: true });
  console.log(ok ? 'SMOKE OK' : 'SMOKE ÉCHEC');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
