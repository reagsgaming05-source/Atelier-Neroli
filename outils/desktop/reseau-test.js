/*
 * « Aucune donnée ne quitte le poste » : preuve par l'observation, pas par la
 * lecture du code.
 *
 * Un mandataire d'observation est posé sur la machine, et l'application est
 * lancée de façon que tout ce qui s'échapperait de ses barrières (voir main.js)
 * tombe chez lui. On l'utilise ensuite pour de bon — ouvrir, tourner une page,
 * exporter, reconnaître le texte d'une image — et le test échoue à la moindre
 * connexion reçue, ou à la moindre requête que l'application a elle-même refusée.
 *
 * Un observateur qui ne verrait jamais rien ne prouverait rien : une première
 * exécution, barrières levées, vérifie qu'il voit bien ce qui s'échappe.
 *
 *   node reseau-test.js                              # source (electron .)
 *   node reseau-test.js chemin/vers/AktumPDF.exe    # exécutable empaqueté
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
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
  while (Date.now() < fin) { if (await cond()) return true; await dormir(300); }
  throw new Error('délai dépassé : ' + quoi);
}
async function menage(dossier) {
  for (let essai = 1; essai <= 6; essai++) {
    try { fs.rmSync(dossier, { recursive: true, force: true }); return; } catch (e) { await dormir(essai * 400); }
  }
}

// Le mandataire d'observation : il note, il ne transmet jamais rien.
function observateur() {
  const vu = [];
  const srv = http.createServer((req, res) => { vu.push(req.method + ' ' + req.url); res.writeHead(502); res.end(); });
  srv.on('connect', (req, sock) => { vu.push('CONNECT ' + req.url); sock.end('HTTP/1.1 502 Bad Gateway\r\n\r\n'); });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok({ vu, adresse: '127.0.0.1:' + srv.address().port, fermer: () => srv.close() })));
}

// Une garde : un test qui se fige ne doit pas retenir la construction pendant des heures. Il dit
// à quelle étape il s'est arrêté, et sort en échec.
let etape = 'démarrage';
const note = (quoi) => { etape = quoi; console.log('  … ' + quoi); };
const garde = setTimeout(() => { console.error('ÉCHEC : délai global dépassé pendant « ' + etape + ' »'); process.exit(1); }, 9 * 60 * 1000);

// Fermer sans que la question « modifications non exportées » ne retienne le test : elle est
// native, donc invisible au pilote.
async function arreter(app) {
  await app.evaluate(({ app: a }) => { setTimeout(() => a.exit(0), 50); }).catch(() => {});
  await Promise.race([app.waitForEvent('close').catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
  await app.close().catch(() => {});
}

const lancer = (exe, smoke, fichier, env) => electron.launch(exe
  ? { executablePath: exe, args: fichier ? [fichier] : [], env: { ...process.env, AKTUM_SMOKE_DIR: smoke, ...env } }
  : { args: [path.join(__dirname), ...(fichier ? [fichier] : []), '--no-sandbox'], env: { ...process.env, AKTUM_SMOKE_DIR: smoke, ...env } });

// Ce que l'application a refusé, et la tentative d'un faux appel de sa part.
const refuses = (app) => app.evaluate(() => global.__aktumReseau.map((r) => r.url));
async function tenter(app, adresses) {
  await app.evaluate(async ({ session }, liste) => {
    for (const u of liste) { try { await session.defaultSession.fetch(u); } catch (e) { /* attendu : c'est le but */ } }
  }, adresses);
}

(async () => {
  const exe = process.argv[2];
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-reseau-'));
  let ok = true;
  const verifier = (cond, quoi) => { console.log((cond ? '  ok - ' : 'ÉCHEC : ') + quoi); if (!cond) ok = false; };
  const doc = path.join(racine, 'decision.pdf');
  fs.writeFileSync(doc, fabriquerPdf(3));
  const CANARIS = ['http://canari-http.example/essai', 'https://canari-https.example/essai'];

  // ---------------------------------------------------------------------------
  // 1. L'observateur voit ce qui s'échapperait : barrières levées.
  // ---------------------------------------------------------------------------
  console.log('1. L\'observateur est-il capable de voir ?');
  {
    const obs = await observateur();
    note('lancement, barrières levées');
    const app = await lancer(exe, path.join(racine, 'poste-1'), doc, { AKTUM_OBSERVATEUR: obs.adresse, AKTUM_OBSERVATEUR_OUVERT: '1' });
    const win = await app.firstWindow();
    await win.waitForSelector('#app-toolbar', { state: 'visible', timeout: 60000 });
    note('appels d\'essai, barrières levées');
    await tenter(app, CANARIS);
    await attendre(() => obs.vu.some((v) => /canari-http\.example/.test(v)) && obs.vu.some((v) => /canari-https\.example/.test(v)), 20000, 'l\'observateur reçoit les deux appels d\'essai');
    verifier(obs.vu.some((v) => /^GET http:\/\/canari-http\.example/.test(v)), 'un appel http qui s\'échappe arrive chez l\'observateur');
    verifier(obs.vu.some((v) => /^CONNECT canari-https\.example:443/.test(v)), 'un appel https qui s\'échappe arrive chez l\'observateur');
    verifier((await refuses(app)).length >= 2, 'et l\'application les note comme requêtes non locales');
    await arreter(app);
    obs.fermer();
  }

  // ---------------------------------------------------------------------------
  // 2. Un usage réel, barrières en place : rien n'arrive nulle part.
  // ---------------------------------------------------------------------------
  console.log('2. Usage réel, barrières en place');
  {
    const obs = await observateur();
    const smoke = path.join(racine, 'poste-2');
    note('lancement, barrières en place');
    const app = await lancer(exe, smoke, doc, { AKTUM_OBSERVATEUR: obs.adresse });
    const win = await app.firstWindow();
    win.on('pageerror', (e) => console.log('[pageerror]', e.message));
    await win.waitForSelector('#app-toolbar', { state: 'visible', timeout: 60000 });
    await win.waitForFunction(() => document.querySelectorAll('#pages .tile').length === 3, null, { timeout: 60000 });

    note('tourner une page et enregistrer');
    // Tourner une page et exporter : la boîte « Enregistrer sous » se règle sur le dossier d'essai.
    await win.keyboard.press('Control+Shift+2');
    await win.keyboard.press('Escape');
    await win.click('#pages .tile:nth-child(1)');
    await win.click('#sel-rot-right');
    await win.waitForFunction(() => /modifié/.test(document.querySelector('#summary').textContent), null, { timeout: 10000 });
    await win.click('#btn-export');
    const remplacer = win.locator('#ecr-remplacer');
    if (await remplacer.isVisible({ timeout: 8000 }).catch(() => false)) await remplacer.click();
    await attendre(() => /\/Rotate\s+90/.test(fs.readFileSync(doc, 'latin1')), 60000, 'l\'export écrit le fichier');
    verifier(true, 'ouvrir, tourner, enregistrer : fait');

    note('reconnaissance de texte');
    // Reconnaissance de texte : le gros morceau (moteur wasm, worker, modèles de langue).
    const png = await win.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 1240; c.height = 800;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = '#000'; x.font = '40px sans-serif'; x.textBaseline = 'middle';
      ['Decision du Conseil communal', 'Objet : permis de construire', 'Parcelle numero 1234'].forEach((l, i) => x.fillText(l, 100, 150 + i * 80));
      return c.toDataURL('image/png').split(',')[1];
    });
    await win.setInputFiles('#file-input', { name: 'scan.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    await win.waitForFunction(() => document.querySelectorAll('#pages .tile').length >= 4, null, { timeout: 30000 });
    await win.click('#tab-tools');
    await win.click('[data-tool="ocr"]');
    await win.locator('.dialog').getByRole('button', { name: 'Reconnaître' }).click();
    await attendre(async () => /Texte reconnu/.test(await win.locator('#last').textContent()), 240000, 'la reconnaissance de texte aboutit');
    verifier(true, 'reconnaissance de texte : faite');

    note('attente d\'un éventuel service d\'arrière-plan');
    // Imprimer, c'est ouvrir l'aperçu : la fenêtre d'impression ne doit pas non plus appeler dehors.
    await win.keyboard.press('Escape');
    await dormir(3000); // le temps qu'un service d'arrière-plan s'il y en a un se manifeste

    verifier(obs.vu.length === 0, 'l\'observateur n\'a reçu AUCUNE connexion pendant tout cet usage' + (obs.vu.length ? ' : ' + obs.vu.join(' ; ') : ''));
    const r = await refuses(app);
    verifier(r.length === 0, 'l\'application n\'a elle-même refusé aucune requête (rien n\'a même essayé)' + (r.length ? ' : ' + r.join(' ; ') : ''));

    note('appels d\'essai, barrières en place');
    // Et si l'on essaie quand même — comme le ferait une page piégée — la barrière tient.
    await tenter(app, CANARIS);
    await dormir(1500);
    const apres = await refuses(app);
    verifier(CANARIS.every((u) => apres.includes(u)), 'un appel d\'essai est refusé par l\'application et noté');
    verifier(obs.vu.length === 0, 'et il n\'atteint toujours pas le mandataire' + (obs.vu.length ? ' : ' + obs.vu.join(' ; ') : ''));
    await arreter(app);
    obs.fermer();
  }

  clearTimeout(garde);
  await menage(racine);
  if (!ok) { console.log('\nRÉSEAU : ÉCHEC'); process.exit(1); }
  console.log('\nRéseau : rien ne sort.');
})().catch((e) => { console.error(e); process.exit(1); });
