/*
 * Deux secrétaires, un même fichier sur le lecteur réseau : le travail de la
 * première ne doit jamais disparaître sans que la seconde l'ait su.
 *
 * Joue deux instances de l'application (chacune avec ses propres données, comme
 * deux postes) sur UN document d'un dossier partagé, et vérifie :
 *  - la seconde est prévenue à l'ouverture que la première l'a déjà ;
 *  - quand la première a enregistré, la seconde qui enregistre à son tour se
 *    voit demander quoi faire, au lieu d'écraser en silence ;
 *  - « Annuler » ne touche à rien ; « Écraser quand même » écrase, sciemment ;
 *  - à la fermeture, plus aucun verrou ne traîne dans le dossier partagé.
 *
 *   node ecrasement-test.js                              # source (electron .)
 *   node ecrasement-test.js chemin/vers/BlonayPDF.exe    # exécutable empaqueté
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
// Quelles pages sont tournées, dans l'ordre du fichier : « 100 » = la première seulement.
const tournees = (f) => {
  const s = fs.readFileSync(f).toString('latin1');
  return (s.match(/\d+ 0 obj\s*<<[^>]*\/Type\s*\/Page\b(?!s)[^>]*>>/g) || []).map((o) => (/\/Rotate\s+90\b/.test(o) ? '1' : '0')).join('');
};
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
const lancer = (exe, smoke, fichier) => electron.launch(exe
  ? { executablePath: exe, args: [fichier], env: { ...process.env, BLONAY_SMOKE_DIR: smoke } }
  : { args: [path.join(__dirname), fichier, '--no-sandbox'], env: { ...process.env, BLONAY_SMOKE_DIR: smoke } });
async function prete(app, pages) {
  const win = await app.firstWindow();
  win.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await win.waitForSelector('#app-toolbar', { state: 'visible', timeout: 60000 });
  await win.waitForFunction((n) => document.querySelectorAll('#pages .tile').length === n, pages, { timeout: 60000 });
  return win;
}
async function tourner(win, n) {
  await win.keyboard.press('Control+2');
  await win.keyboard.press('Escape');
  await win.click('#pages .tile:nth-child(' + n + ')');
  await win.click('#sel-rot-right');
  await win.waitForFunction(() => /modifié/.test(document.querySelector('#summary').textContent), null, { timeout: 10000 });
}

(async () => {
  const exe = process.argv[2];
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'blonay-ecrasement-'));
  const partage = path.join(racine, 'partage');
  fs.mkdirSync(partage);
  const doc = path.join(partage, 'decision.pdf');
  fs.writeFileSync(doc, fabriquerPdf(3));
  const verrou = path.join(partage, '.~verrou.decision.pdf.json');
  let ok = true;
  const verifier = (cond, quoi) => { console.log((cond ? '  ok - ' : 'ÉCHEC : ') + quoi); if (!cond) ok = false; };

  // Marie ouvre le document.
  const marie = await lancer(exe, path.join(racine, 'poste-marie'), doc);
  const fMarie = await prete(marie, 3);
  await attendre(() => fs.existsSync(verrou), 15000, 'verrou posé par la première personne');
  const v = JSON.parse(fs.readFileSync(verrou, 'utf8'));
  verifier(!!v.qui && !!v.instance && v.battement > 0, 'le verrou dit qui a ouvert le document');

  // Paul l'ouvre à son tour : il est prévenu, et le verrou de Marie n'est pas touché.
  const paul = await lancer(exe, path.join(racine, 'poste-paul'), doc);
  const fPaul = await prete(paul, 3);
  await fPaul.waitForSelector('#btn-journal', { state: 'visible', timeout: 20000 });
  await fPaul.click('#btn-journal');
  const journal = await fPaul.evaluate(() => document.querySelector('.dialog').textContent);
  verifier(/déjà ouvert par/.test(journal), 'la seconde personne est prévenue que le document est déjà ouvert');
  verifier(JSON.parse(fs.readFileSync(verrou, 'utf8')).instance === v.instance, 'le verrou de la première n\'est pas volé');
  await fPaul.click('.dialog .dlg-head .x');

  // Marie tourne la page 1 et enregistre.
  await tourner(fMarie, 1);
  await fMarie.click('#btn-export');
  await fMarie.waitForSelector('#ecr-remplacer', { state: 'visible', timeout: 10000 });
  await fMarie.click('#ecr-remplacer');
  await attendre(() => tournees(doc) === '100', 60000, 'enregistrement de la première');
  verifier(true, 'la première a enregistré : sa page 1 est tournée dans le fichier');
  await dormir(1500); // la date de modification doit différer de celle que Paul a lue

  // Paul tourne la page 2 et enregistre : le fichier a changé depuis sa lecture.
  await tourner(fPaul, 2);
  await fPaul.click('#btn-export');
  await fPaul.waitForSelector('#ecr-remplacer', { state: 'visible', timeout: 10000 });
  await fPaul.click('#ecr-remplacer');
  await fPaul.waitForSelector('#conflit-annuler', { state: 'visible', timeout: 20000 });
  verifier(true, 'la seconde qui enregistre se voit demander quoi faire, au lieu d\'écraser en silence');
  await fPaul.click('#conflit-annuler');
  await dormir(1200);
  verifier(tournees(doc) === '100', 'annuler ne touche à rien : le travail de la première est intact');

  // Il recommence et choisit d'écraser, sciemment.
  await fPaul.click('#btn-export');
  await fPaul.waitForSelector('#conflit-ecraser', { state: 'visible', timeout: 20000 });
  await fPaul.click('#conflit-ecraser');
  await attendre(() => tournees(doc) === '010', 60000, 'écrasement voulu');
  verifier(tournees(doc) === '010', 'écraser quand même écrase, sciemment : c\'est maintenant sa version (page 2), plus celle de la première');
  // Paul a maintenant la main : une nouvelle écriture de sa part ne redemande rien.
  await tourner(fPaul, 3);
  await fPaul.click('#btn-export');
  await fPaul.waitForSelector('#ecr-remplacer', { state: 'visible', timeout: 10000 });
  await fPaul.click('#ecr-remplacer');
  await attendre(() => tournees(doc) === '011', 60000, 'enregistrement suivant sans question');
  const encoreUneQuestion = await fPaul.locator('#conflit-annuler').count();
  verifier(encoreUneQuestion === 0, 'après son propre enregistrement, plus de conflit à confirmer');

  // Et la première, qui n'a rien relu depuis son propre enregistrement, est à son tour
  // arrêtée : le travail de la seconde, écrit depuis, ne disparaît pas non plus en silence.
  await tourner(fMarie, 2);
  await fMarie.click('#btn-export');
  await fMarie.waitForSelector('#ecr-remplacer', { state: 'visible', timeout: 10000 });
  await fMarie.click('#ecr-remplacer');
  await fMarie.waitForSelector('#conflit-annuler', { state: 'visible', timeout: 20000 });
  verifier(true, 'après son propre enregistrement, la première est encore protégée contre l\'écrasement du travail d\'une autre');
  // « Enregistrer sous… » : les deux versions sont gardées, rien n'est perdu.
  await fMarie.click('#conflit-sous');
  const posteMarie = path.join(racine, 'poste-marie');
  const sienne = () => fs.readdirSync(posteMarie).filter((f) => /\.pdf$/i.test(f)).map((f) => path.join(posteMarie, f))[0];
  await attendre(() => { try { return !!sienne() && tournees(sienne()) === '110'; } catch (e) { return false; } }, 60000, 'la version de la première, à part');
  verifier(tournees(doc) === '011', 'le fichier partagé reste tel que la seconde l\'a écrit');
  verifier(tournees(sienne()) === '110', 'et la version de la première est gardée à part, intacte');

  await marie.close();
  await paul.close();
  await dormir(500);
  verifier(!fs.existsSync(verrou), 'à la fermeture, plus aucun verrou ne traîne dans le dossier partagé');
  const restes = fs.readdirSync(partage).filter((f) => f !== 'decision.pdf');
  verifier(restes.length === 0, 'rien d\'autre que le document dans le dossier partagé (' + JSON.stringify(restes) + ')');

  await menage(racine);
  console.log(ok ? 'ÉCRASEMENT OK' : 'ÉCRASEMENT ÉCHEC');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
