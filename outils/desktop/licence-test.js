/*
 * La licence, jouée sur l'application : un essai qui court, une licence signée qui
 * s'affiche, un fichier falsifié qui n'ouvre rien, un essai fini qui n'enregistre plus
 * — et qui laisse tout lire.
 *
 *   node licence-test.js                       # depuis les sources
 *   node licence-test.js chemin\BlonayPDF.exe  # sur le dossier empaqueté
 *
 * Les clés sont des clés d'essai, posées par l'environnement. Le « profil » de chaque
 * poste (où vit l'ancre de l'essai) est un dossier d'essai, comme dans comptes-test.js.
 */
const { _electron: electron } = require('playwright-core');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sg = require('./signature.js');
const { MARQUEUR } = require('./ou-ranger.js');

const exe = process.argv[2];
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'blonay-licence-'));
const dit = (q) => console.log('  ' + q);
const souffler = (ms) => new Promise((r) => setTimeout(r, ms));
const J = 24 * 3600 * 1000;

const k = crypto.generateKeyPairSync('ed25519');
const editeur = { pem: k.privateKey.export({ format: 'pem', type: 'pkcs8' }), cle: { id: 'lic-essai', cle: sg.brute(k.publicKey) } };
const CLES = JSON.stringify({ maj: [], licence: [editeur.cle] });

function pdf() {
  const objets = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>'];
  let c = '%PDF-1.4\n'; const o = [];
  objets.forEach((x, i) => { o.push(c.length); c += (i + 1) + ' 0 obj\n' + x + '\nendobj\n'; });
  const xr = c.length;
  c += 'xref\n0 4\n0000000000 65535 f \n' + o.map((d) => String(d).padStart(10, '0') + ' 00000 n \n').join('') + 'trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF\n';
  return Buffer.from(c, 'latin1');
}

function menage() {
  try {
    if (process.platform === 'win32') { require('child_process').execSync('taskkill /F /IM BlonayPDF.exe /T', { stdio: 'ignore' }); return; }
    require('child_process').execSync('pkill -f ' + JSON.stringify('node_modules/electron/dis[t]/electron') + ' ; pkill -x BlonayPDF ; true', { stdio: 'ignore' });
  } catch (e) { /* rien à tuer */ }
}

// Un poste : un dossier d'application, un profil, et ce qu'on y pose.
function poste(nom, { licence, debutEssai }) {
  const dossier = path.join(base, nom);
  const profil = path.join(base, nom + '-profil');
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, MARQUEUR), '');
  fs.writeFileSync(path.join(dossier, 'decision.pdf'), pdf());
  if (licence) fs.writeFileSync(path.join(dossier, 'licence.json'), typeof licence === 'string' ? licence : JSON.stringify(licence));
  if (debutEssai) { fs.mkdirSync(path.join(profil, 'Blonay PDF'), { recursive: true }); fs.writeFileSync(path.join(profil, 'Blonay PDF', 'essai.json'), JSON.stringify({ debut: debutEssai })); }
  return { dossier, profil, smoke: path.join(base, nom + '-smoke') };
}
const signee = (corps) => sg.signer(Object.assign({ v: 1, objet: 'licence', cle: editeur.cle.id, id: 'BLP-2026-0042', client: 'Commune d\'Essai', ide: 'CHE-000.000.000', postes: 10, modele: 'site', emise: '2026-10-01', majJusqu: '2027-10-01' }, corps), editeur.pem);

async function ouvrir(p) {
  const env = { ...process.env, BLONAY_DOSSIER_APP: p.dossier, BLONAY_PROFIL: p.profil, BLONAY_CLES_PUBLIQUES_ESSAI: CLES };
  const app = await electron.launch(exe ? { executablePath: exe, args: [path.join(p.dossier, 'decision.pdf')], env }
    : { args: [path.join(__dirname), path.join(p.dossier, 'decision.pdf'), '--no-sandbox'], env });
  const f = await app.firstWindow();
  await f.waitForSelector('#app-toolbar:not([hidden])', { timeout: 90000 });
  await f.waitForFunction(() => document.querySelectorAll('#pages .tile').length === 1, null, { timeout: 60000 });
  // Le dossier de données est celui du profil de la machine, commun à tous les postes d'essai :
  // un travail laissé par un poste précédent se propose de revenir. Ce n'est pas l'objet ici.
  await souffler(1500);
  const recup = f.getByRole('button', { name: 'Ignorer et supprimer' });
  if (await recup.isVisible().catch(() => false)) { await recup.click(); await souffler(500); }
  return { app, f };
}
// Fermer sans que la question « modifications non exportées » (native, invisible au pilote) ne retienne le test.
const fermer = async (s) => {
  await s.app.evaluate(({ app }) => { setTimeout(() => app.exit(0), 50); }).catch(() => {});
  await Promise.race([s.app.waitForEvent('close').catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
  await s.app.close().catch(() => {});
  await souffler(600); menage();
};
const garde = setTimeout(() => { console.error('ÉCHEC : délai global dépassé (9 minutes)'); menage(); process.exit(1); }, 9 * 60 * 1000);
const puce = async (f) => (await f.locator('#licence-ligne').isVisible()) ? (await f.locator('#licence-ligne').textContent()).trim() : '';

(async () => {
  // 1. Premier lancement, sans licence : l'essai commence, toutes les fonctions sont là.
  let p = poste('essai', {});
  let s = await ouvrir(p);
  await s.f.waitForSelector('#licence-ligne:not([hidden])', { timeout: 20000 });
  assert.match(await puce(s.f), /Essai : 45 jours restants/, 'quarante-cinq jours au premier lancement');
  assert.ok(fs.existsSync(path.join(p.profil, 'Blonay PDF', 'essai.json')), 'l\'ancre est dans le profil, hors du dossier de l\'application');
  // L'enregistrement marche pendant l'essai.
  await s.f.keyboard.press('Control+2'); await s.f.keyboard.press('Escape');
  await s.f.click('#pages .tile:nth-child(1)'); await s.f.click('#sel-rot-right');
  await s.f.click('#btn-export');
  await s.f.waitForSelector('#ecr-remplacer', { state: 'visible', timeout: 10000 });
  await s.f.click('#ecr-remplacer');
  for (let i = 0; i < 60 && !/\/Rotate\s+90/.test(fs.readFileSync(path.join(p.dossier, 'decision.pdf'), 'latin1')); i++) await souffler(500);
  assert.match(fs.readFileSync(path.join(p.dossier, 'decision.pdf'), 'latin1'), /\/Rotate\s+90/, 'pendant l\'essai, on enregistre');
  await fermer(s);
  dit('essai : 45 jours au premier lancement, ancre dans le profil, l\'enregistrement marche');

  // 2. Le même dossier recopié ailleurs : l'essai ne repart pas à zéro — même profil, même ancre.
  const ancre = JSON.parse(fs.readFileSync(path.join(p.profil, 'Blonay PDF', 'essai.json'), 'utf8')).debut;
  const copie = poste('essai-copie', { debutEssai: ancre });
  s = await ouvrir(copie);
  await s.f.waitForSelector('#licence-ligne:not([hidden])', { timeout: 20000 });
  assert.match(await puce(s.f), /Essai : 45 jours restants/, 'la copie voit la même ancre');
  assert.equal(JSON.parse(fs.readFileSync(path.join(copie.profil, 'Blonay PDF', 'essai.json'), 'utf8')).debut, ancre, 'et ne la réécrit pas');
  await fermer(s);
  dit('dossier recopié : l\'ancre du profil est conservée');

  // 3. Une licence signée : plus de puce d'essai, et « À propos » dit à qui elle est.
  p = poste('licence', { licence: signee({}) });
  s = await ouvrir(p);
  await souffler(1500);
  assert.equal(await puce(s.f), '', 'avec une licence, aucune puce d\'essai');
  const apropos = await s.app.evaluate(async ({ dialog, Menu }) => {
    let texte = '';
    dialog.showMessageBox = (a, b) => { texte = String((b || a).detail || ''); return Promise.resolve({ response: 0 }); };
    const trouver = (items) => { for (const it of items) { if ((it.label || '').startsWith('À propos de')) return it; if (it.submenu) { const r = trouver(it.submenu.items); if (r) return r; } } return null; };
    trouver(Menu.getApplicationMenu().items).click();
    return texte;
  });
  assert.match(apropos, /Licence : Commune d'Essai — 10 postes — mises à jour comprises jusqu.au 2027-10-01 \(BLP-2026-0042\)/, '« À propos » nomme le client');
  await fermer(s);
  dit('licence signée : le client est nommé dans « À propos », pas de puce d\'essai');

  // 4. Une licence falsifiée (400 postes au lieu de 10) n'ouvre rien : retour à l'essai, et la raison est dite.
  const fausse = signee({}); fausse.postes = 400;
  p = poste('falsifiee', { licence: fausse });
  s = await ouvrir(p);
  await s.f.waitForSelector('#licence-ligne:not([hidden])', { timeout: 20000 });
  await s.f.click('#licence-ligne');
  const dlg = await s.f.locator('.dialog').textContent();
  assert.match(dlg, /signature de la licence est invalide/, 'la raison est dite');
  await fermer(s);
  dit('licence falsifiée : refusée avec sa raison, retour à l\'essai');

  // 5. L'essai est fini : on lit, on ne produit plus rien, et le travail ouvert n'est pas touché.
  p = poste('fini', { debutEssai: new Date(Date.now() - 60 * J).toISOString() });
  const avant = fs.readFileSync(path.join(p.dossier, 'decision.pdf'));
  s = await ouvrir(p);
  await s.f.waitForSelector('#licence-ligne.fini', { timeout: 20000 });
  assert.match(await puce(s.f), /Essai terminé/);
  // Rien n'est modifié : la fermeture ne demandera rien. L'enregistrement est refusé d'emblée.
  await s.f.click('#btn-export');
  await s.f.waitForSelector('.dialog:has-text("Licence")', { timeout: 10000 });
  await souffler(1500);
  assert.ok(avant.equals(fs.readFileSync(path.join(p.dossier, 'decision.pdf'))), 'le fichier n\'a pas été touché');
  assert.match(await s.f.locator('.dialog').textContent(), /lire et rechercher/, 'la boîte dit ce qui reste possible');
  assert.equal(await s.f.locator('#pages .tile').count(), 1, 'le document reste ouvert, lisible');
  await fermer(s);
  dit('essai terminé : l\'enregistrement est refusé et dit pourquoi, le document reste ouvert et intact');

  try { fs.rmSync(base, { recursive: true, force: true }); } catch (e) { /* ménage sans importance */ }
  clearTimeout(garde);
  console.log('LICENCE OK');
})().catch((e) => { menage(); console.error(e); process.exit(1); });
