/*
 * La mise à jour proposée toute seule, jouée sur l'application.
 *
 *   node maj-test.js                       # depuis les sources
 *   node maj-test.js chemin\AktumPDF.exe  # sur le dossier empaqueté
 *
 * Huit situations, parce que se tromper ici ne se rattrape pas : une mise à
 * jour proposée à tort réinstalle une version plus ancienne, une mise à jour
 * lancée pendant qu'une collègue travaille laisse une installation à moitié
 * remplacée, une mise à jour jamais proposée ne sert à rien — et une archive
 * que n'importe qui a déposée sur le partage ne doit jamais être exécutée :
 * seule une archive signée par l'éditeur est proposée. Les clés sont des clés
 * d'essai, posées par l'environnement ; l'application livrée porte les vraies.
 *
 * Le script de mise à jour est remplacé par un témoin : ce qu'on vérifie ici,
 * c'est que l'application ferme tout et l'appelle avec le bon zip. Que le vrai
 * script préserve « data » se vérifie ailleurs, sur Windows, avec le vrai zip.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const { _electron: electron } = require('playwright-core');
const crypto = require('crypto');
const { zipDe } = require('../test/zip-dessai.js');
const sg = require('./signature.js');
const { poserLeJeton } = require('./version-posee.js');
const { MARQUEUR, nomDuScriptDeMaj } = require('./ou-ranger.js');

const exe = process.argv[2];
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-maj-'));
const dit = (quoi) => console.log('  ' + quoi);
const souffler = (ms) => new Promise((r) => setTimeout(r, ms));
const DELAI = 9000; // l'application attend ce délai avant de regarder

function menage() {
  try {
    if (process.platform === 'win32') { require('child_process').execSync('taskkill /F /IM AktumPDF.exe /T', { stdio: 'ignore' }); return; }
    // Deux façons de lancer, donc deux choses à tuer : l'Electron des sources,
    // et l'application empaquetée. Ne viser que la première laissait survivre
    // l'instance relancée après la connexion ; elle gardait le verrou
    // d'instance unique, et le lancement suivant ressortait aussitôt — ce que
    // le pilote signale par « browser has been closed », sans dire pourquoi.
    require('child_process').execSync(
      'pkill -f ' + JSON.stringify('node_modules/electron/dis[t]/electron') + ' ; '
      // -x vise le nom du processus, pas sa ligne de commande : viser la ligne
      // attraperait n'importe quel shell qui mentionne le nom, y compris celui
      // qui lance ce test.
      + 'pkill -x AktumPDF ; true',
      { stdio: 'ignore' },
    );
  } catch (e) { /* rien à tuer */ }
}

// Les clés d'essai : la paire de « l'éditeur », et une autre qui n'est celle de personne.
const faire = () => { const k = crypto.generateKeyPairSync('ed25519'); return { pem: k.privateKey.export({ format: 'pem', type: 'pkcs8' }), cle: { id: 'essai-a', cle: sg.brute(k.publicKey) } }; };
const editeur = faire();
const intrus = faire();
const PLATEFORME = sg.PLATEFORMES[process.platform]; // Linux n'est pas une cible : sans nom, pas de contrôle de plateforme

// Écrit le fichier de signature à côté du zip : l'empreinte du zip tel qu'il est maintenant.
function signerLeZip(zip, fiche, opts) {
  const o = opts || {};
  const k = o.cle || editeur;
  const corps = { v: 1, objet: 'maj', cle: k.cle.id, fichier: path.basename(zip), sha256: sg.empreinteFichier(zip), taille: fs.statSync(zip).size,
    version: fiche.version || '', plateforme: o.plateforme || PLATEFORME || 'windows', canal: o.canal || 'stable', critique: !!o.critique,
    commit: fiche.commit || '', date: fiche.date || new Date().toISOString() };
  fs.writeFileSync(zip + sg.SIGNATURE_DU_ZIP, JSON.stringify(sg.signer(corps, k.pem)));
}

// Une installation d'essai : le dossier de l'application, son script de mise à
// jour remplacé par un témoin, et le zip qu'on veut lui faire trouver.
function installation(nom, fiche, opts) {
  const d = path.join(base, nom);
  fs.mkdirSync(d, { recursive: true });
  // Sans ce fichier, l'application demanderait d'abord qui l'ouvre, et rien
  // ne se lancerait derrière la fenêtre de connexion. C'est le mécanisme
  // prévu pour s'en passer, et la mise à jour n'a rien à voir avec les
  // comptes : elle regarde le dossier de l'application, pas celui d'une
  // personne. Les jetons des postes ouverts vont dans « data » dans les deux
  // cas — c'est ce qui compte ici.
  fs.writeFileSync(path.join(d, MARQUEUR), '');
  const temoin = path.join(d, 'temoin.txt');
  const script = path.join(d, nomDuScriptDeMaj(process.platform));
  if (process.platform === 'win32') {
    fs.writeFileSync(script, '@echo off\r\necho %AKTUM_MAJ_AUTO% %1> "%~dp0temoin.txt"\r\n');
  } else {
    fs.writeFileSync(script, '#!/bin/sh\nprintf "%s %s" "$AKTUM_MAJ_AUTO" "$1" > "$(dirname "$0")/temoin.txt"\n');
    fs.chmodSync(script, 0o755);
  }
  const zip = path.join(d, 'AktumPDF-windows.zip');
  if (fiche) {
    fs.writeFileSync(zip, zipDe([{ nom: 'AktumPDF/version.json', contenu: JSON.stringify(fiche) }]));
    if (!opts || opts.signe !== false) signerLeZip(zip, fiche, opts);
  }
  return { dossier: d, temoin, zip };
}

const lancer = (dossier) => {
  const env = { ...process.env, AKTUM_DOSSIER_APP: dossier, AKTUM_MAJ_DELAI: String(DELAI),
    AKTUM_CLES_PUBLIQUES_ESSAI: JSON.stringify({ maj: [editeur.cle], licence: [] }) };
  return electron.launch(exe ? { executablePath: exe, args: ['--no-sandbox'], env }
    : { args: [path.join(__dirname), '--no-sandbox'], env });
};

// On remplace la boîte de dialogue : elle est native, donc invisible au pilote,
// et elle retiendrait le test indéfiniment. Ce qu'on lit ensuite, c'est ce que
// l'application voulait dire, et ce qu'elle fait de la réponse.
async function guetter(app, reponse) {
  await app.evaluate(({ dialog }, rep) => {
    global.__boites = [];
    dialog.showMessageBox = (a, b) => {
      const o = b || a;
      global.__boites.push({ message: String(o.message || ''), detail: String(o.detail || ''), boutons: o.buttons || [] });
      return Promise.resolve({ response: rep });
    };
  }, reponse);
}
const boites = (app) => app.evaluate(() => global.__boites || []);

async function ouvrir(dossier, reponse) {
  const app = await lancer(dossier);
  const f = await app.firstWindow();
  await f.waitForSelector('#app-toolbar:not([hidden])', { timeout: 90000 });
  await guetter(app, reponse);
  return app;
}

async function attendreUneBoite(app, combien) {
  for (let i = 0; i < Math.ceil((DELAI + 12000) / 250); i++) {
    const vues = await boites(app).catch(() => []);
    if (vues.length >= (combien || 1)) return vues;
    await souffler(250);
  }
  return [];
}

(async () => {
  const demain = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const neuve = { construction: 'construite le 23.09.2026, commit f00df00', commit: 'f00df00', date: demain, version: '99.0.0' };

  // 1. Une version plus récente est posée : elle est proposée, et « Plus tard »
  //    ne touche à rien.
  let poste = installation('plus-tard', neuve);
  let app = await ouvrir(poste.dossier, 1);
  let vues = await attendreUneBoite(app);
  assert.equal(vues.length, 1, 'la mise à jour est proposée');
  assert.match(vues[0].message, /plus récente/i);
  assert.match(vues[0].detail, /f00df00/, 'la version posée est nommée');
  assert.deepEqual(vues[0].boutons, ['Mettre à jour maintenant', 'Plus tard']);
  await souffler(1500);
  assert.equal(fs.existsSync(poste.temoin), false, '« Plus tard » ne lance rien');
  await app.close().catch(() => {});
  menage();
  dit('proposée : « ' + vues[0].message + ' » — « Plus tard » ne lance rien');

  // 2. Une collègue a encore l'application ouverte ailleurs : on refuse, en le
  //    disant. La copie se ferait à moitié, ses fichiers étant verrouillés.
  poste = installation('occupe', neuve);
  poserLeJeton(path.join(poste.dossier, 'data'), 'PC-ACCUEIL', 4242, Date.now());
  app = await ouvrir(poste.dossier, 0);
  vues = await attendreUneBoite(app, 2);
  assert.equal(vues.length, 2, 'un avertissement suit la demande');
  assert.match(vues[1].message, /ouverte ailleurs/i);
  assert.match(vues[1].detail, /PC-ACCUEIL/, 'le poste qui bloque est nommé');
  await souffler(1500);
  assert.equal(fs.existsSync(poste.temoin), false, 'et rien n\'est lancé');
  await app.close().catch(() => {});
  menage();
  dit('un autre poste ouvert : « ' + vues[1].message + ' », rien n\'est lancé');

  // 3. Personne d'autre : l'application ferme tout et passe la main au script.
  poste = installation('seule', neuve);
  app = await ouvrir(poste.dossier, 0);
  await app.waitForEvent('close', { timeout: 30000 });
  for (let i = 0; i < 60 && !fs.existsSync(poste.temoin); i++) await souffler(250);
  assert.ok(fs.existsSync(poste.temoin), 'le script de mise à jour est lancé');
  const dit_par_le_script = fs.readFileSync(poste.temoin, 'utf8').trim();
  assert.match(dit_par_le_script, /^1 /, 'lancé en mode automatique (AKTUM_MAJ_AUTO)');
  assert.ok(dit_par_le_script.includes('AktumPDF-windows.zip'), 'avec le zip posé : ' + dit_par_le_script);
  menage();
  dit('seule au bureau : l\'application se ferme et appelle le script — ' + dit_par_le_script);

  // 4. Le zip posé porte la version installée : rien à proposer. C'est le cas
  //    ordinaire — le zip reste à côté après la mise à jour.
  // La fiche de la version installée se lit à côté de l'exécutable : c'est elle
  // que le dossier portable emporte, et l'oublier à l'empaquetage rendrait la
  // mise à jour automatique muette. Ce test tombe alors ici.
  const ouEstLaFiche = exe
    ? path.join(path.dirname(exe), 'version.json')
    : path.join(__dirname, 'app', 'construction.json');
  let installee = null;
  try { installee = JSON.parse(fs.readFileSync(ouEstLaFiche, 'utf8')); } catch (e) { /* dit juste après */ }
  assert.ok(installee && installee.date, 'la fiche de version accompagne l\'application : ' + ouEstLaFiche);
  poste = installation('deja-a-jour', null);
  app = await ouvrir(poste.dossier, 1);
  fs.writeFileSync(poste.zip, zipDe([{ nom: 'AktumPDF/version.json', contenu: JSON.stringify(installee) }]));
  signerLeZip(poste.zip, Object.assign({ version: '' }, installee, installee.version ? {} : { version: require('./package.json').version }));
  await souffler(DELAI + 6000);
  assert.deepEqual(await boites(app), [], 'la version déjà installée ne se propose pas');
  await app.close().catch(() => {});
  menage();
  dit('zip de la version installée : rien n\'est proposé');

  // 5. Une archive déposée sans signature — ce que ferait n'importe qui ayant accès
  //    au partage — n'est ni proposée au lancement, ni exécutée. Demandée à la
  //    main, l'application dit pourquoi elle la refuse.
  const cliquerMenu = (app2, libelle) => app2.evaluate(({ Menu }, l) => {
    const trouver = (items) => { for (const it of items) { if (it.label === l) return it; if (it.submenu) { const r = trouver(it.submenu.items); if (r) return r; } } return null; };
    trouver(Menu.getApplicationMenu().items).click();
  }, libelle);
  const refusee = async (nom, preparer, motif) => {
    const p = installation(nom, neuve, { signe: false });
    preparer(p);
    const a = await ouvrir(p.dossier, 0);
    await souffler(DELAI + 4000);
    assert.deepEqual(await boites(a), [], nom + ' : rien n\'est proposé au lancement');
    await cliquerMenu(a, 'Rechercher une mise à jour');
    const v = await attendreUneBoite(a);
    assert.equal(v.length, 1, nom + ' : demandée à la main, la raison est dite');
    assert.match(v[0].message, /Aucune mise à jour valable/);
    assert.match(v[0].detail, motif, nom + ' : ' + v[0].detail);
    assert.deepEqual(v[0].boutons, [], nom + ' : aucun bouton pour l\'installer');
    await souffler(1500);
    assert.equal(fs.existsSync(p.temoin), false, nom + ' : le script n\'est jamais lancé');
    await a.close().catch(() => {});
    menage();
    dit(nom + ' : refusée (' + motif + ')');
  };
  await refusee('sans-signature', () => {}, /pas de fichier de signature/);
  await refusee('falsifiee', (p) => {
    signerLeZip(p.zip, neuve);
    const b = fs.readFileSync(p.zip); b[b.length - 40] ^= 1; fs.writeFileSync(p.zip, b); // un octet change après la signature
  }, /modifié/);
  await refusee('autre-cle', (p) => signerLeZip(p.zip, neuve, { cle: Object.assign({}, intrus, { cle: Object.assign({}, intrus.cle, { id: 'essai-a' }) }) }), /invalide/);
  if (PLATEFORME) await refusee('autre-plateforme', (p) => signerLeZip(p.zip, neuve, { plateforme: PLATEFORME === 'windows' ? 'mac' : 'windows' }), /ce poste est sous/);
  // Une version « candidate » n'est acceptée que par une installation « candidate » : l'installation
  // de cet essai porte le canal de sa construction (fiche de version lue plus haut).
  if ((installee.canal || 'stable') === 'stable') {
    await refusee('candidate', (p) => signerLeZip(p.zip, neuve, { canal: 'candidate' }), /canal stable/);
  } else {
    poste = installation('candidate-acceptee', neuve, { canal: 'candidate' });
    app = await ouvrir(poste.dossier, 1);
    vues = await attendreUneBoite(app);
    assert.equal(vues.length, 1, 'une installation candidate accepte une version candidate');
    await app.close().catch(() => {});
    menage();
    dit('candidate-acceptee : une installation candidate propose une version candidate');
  }

  // 6. Une version plus ancienne, signée : jamais proposée seule ; proposée comme
  //    un retour en arrière quand on la demande — et dite comme telle.
  poste = installation('retour', { construction: 'ancienne', commit: '0ldc0de', date: '2020-01-01T00:00:00.000Z', version: '0.0.1' });
  app = await ouvrir(poste.dossier, 1);
  await souffler(DELAI + 4000);
  assert.deepEqual(await boites(app), [], 'une version plus ancienne ne se propose pas d\'elle-même');
  await cliquerMenu(app, 'Rechercher une mise à jour');
  vues = await attendreUneBoite(app);
  assert.equal(vues.length, 1);
  assert.match(vues[0].message, /plus ancienne/);
  assert.deepEqual(vues[0].boutons, ['Revenir à cette version', 'Plus tard']);
  await app.close().catch(() => {});
  menage();
  dit('retour en arrière : jamais d\'office, proposé et nommé quand on le demande');

  try { fs.rmSync(base, { recursive: true, force: true }); } catch (e) { /* ménage sans importance */ }
  console.log('MAJ OK');
})().catch((e) => { menage(); console.error(e); process.exit(1); });
