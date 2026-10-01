/*
 * Les comptes : chacune crée le sien au fur et à mesure, avec un mot de passe,
 * et reste connectée jusqu'à ce qu'elle se déconnecte.
 *
 *   node comptes-test.js                       # depuis les sources
 *   node comptes-test.js chemin\BlonayPDF.exe  # sur le dossier empaqueté
 *
 * Deux choses qu'une relecture ne garantit pas, et qu'on vérifie ici. D'abord
 * qu'une personne ne peut pas ouvrir le compte d'une autre : c'est toute la
 * raison d'être du mot de passe. Ensuite que les affaires sont vraiment
 * séparées — les tampons et les signatures ne vivent pas dans un fichier à
 * nous mais dans le stockage local du moteur d'affichage, qui suit le dossier
 * de données. Fixé trop tard, ou mal, deux personnes les partageraient sans
 * que rien ne le signale.
 */
const { _electron: electron } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const exe = process.argv[2];
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'blonay-comptes-'));
const dit = (quoi) => console.log('  ' + quoi);
const souffler = (ms) => new Promise((r) => setTimeout(r, ms));

// Le dossier d'essai tient lieu de dossier de l'application. Rien ne le fait
// passer pour un lecteur réseau : c'est un dossier temporaire ordinaire, sur
// le disque local, exactement comme une application décompressée sur le
// Bureau. C'est voulu — la connexion se demande partout, et ce test le prouve.
// Chaque « poste » a son propre profil Windows, pour que la connexion retenue
// ne soit pas commune.
//
// Ce profil se donne par BLONAY_PROFIL et non par APPDATA : sous Windows,
// Electron ne lit pas cette variable, il demande le dossier au système. Les
// postes partageaient donc une seule session, Sophie ouvrait celle de Marie et
// la fenêtre de connexion n'apparaissait jamais. Rien de tel sur un vrai
// secrétariat, où chacune a son profil Windows — mais le test ne prouvait plus
// ce qu'il annonçait.
const profilDe = (poste) => path.join(base, 'poste-' + poste);
const sessionDe = (poste) => path.join(profilDe(poste), 'Blonay PDF', 'session.json');
const lancer = (poste) => {
  const profil = profilDe(poste);
  const env = { ...process.env, BLONAY_DOSSIER_APP: base,
    BLONAY_PROFIL: profil, XDG_CONFIG_HOME: profil };
  return electron.launch(exe ? { executablePath: exe, args: ['--no-sandbox'], env }
    : { args: [path.join(__dirname), '--no-sandbox'], env });
};

// Se connecter fait redémarrer l'application : l'instance relancée échappe au
// pilote et garderait le verrou d'instance unique.
function menage() {
  try {
    if (process.platform === 'win32') { require('child_process').execSync('taskkill /F /IM BlonayPDF.exe /T', { stdio: 'ignore' }); return; }
    // Deux façons de lancer, donc deux choses à tuer : l'Electron des sources,
    // et l'application empaquetée. Ne viser que la première laissait survivre
    // l'instance relancée après la connexion ; elle gardait le verrou
    // d'instance unique, et le lancement suivant ressortait aussitôt — ce que
    // le pilote signale par « browser has been closed », sans dire pourquoi.
    //
    // Et tuer une fois ne suffit pas : l'application se relance elle-même après
    // la connexion, si bien qu'entre le moment où l'on tue et celui où l'on
    // regarde, le remplaçant peut naître, verrou en main. On insiste donc
    // jusqu'à ce qu'il n'en reste aucun — deux fois de suite, à 400 ms
    // d'intervalle, pour laisser à une relance en route le temps d'apparaître.
    require('child_process').execSync(
      'pkill -f ' + JSON.stringify('node_modules/electron/dis[t]/electron') + ' ; '
      // -x vise le nom du processus, pas sa ligne de commande : viser la ligne
      // attraperait n'importe quel shell qui mentionne le nom, y compris celui
      // qui lance ce test.
      + 'propre=0; n=0; '
      + 'while [ $n -lt 30 ]; do '
      + '  if pgrep -x BlonayPDF >/dev/null 2>&1; then pkill -x BlonayPDF 2>/dev/null; propre=0; '
      + '  else propre=$((propre+1)); [ $propre -ge 2 ] && break; fi; '
      + '  sleep 0.4; n=$((n+1)); '
      + 'done; true',
      { stdio: 'ignore' },
    );
  } catch (e) { /* rien à tuer */ }
}

// Crée le compte, note le code de récupération qu'on lui montre, confirme. Rend le code.
async function creer(poste, nom, mdp) {
  const e = await lancer(poste);
  const f = await e.firstWindow();
  await f.waitForSelector('#ecran-liste:not([hidden]), #ecran-creation:not([hidden])', { timeout: 60000 });
  if (await f.locator('#ecran-liste').isVisible()) await f.click('#vers-creation');
  await f.fill('#nom', nom);
  await f.fill('#mdp1', mdp);
  await f.fill('#mdp2', mdp);
  await f.click('#creer');
  await f.waitForSelector('#ecran-code:not([hidden])', { timeout: 20000 });
  const code = (await f.locator('#le-code').textContent()).trim();
  assert.equal(await f.locator('#code-ouvrir').isDisabled(), true, 'la session ne s\'ouvre pas avant que le code soit noté');
  await f.check('#code-note');
  await f.click('#code-ouvrir');
  await souffler(2500);
  await e.close().catch(() => {});
  menage();
  return code;
}

// Une fenêtre de connexion ouverte sur le compte `nom`, pour jouer des gestes à la main.
async function fenetreConnexion(poste, nom) {
  const e = await lancer(poste);
  const f = await e.firstWindow();
  await f.waitForSelector('#ecran-liste:not([hidden])', { timeout: 60000 });
  if (nom) await f.locator('.compte', { hasText: nom }).click();
  return { e, f, fermer: async () => { await e.close().catch(() => {}); menage(); } };
}
const messageDe = async (f, id) => ((await f.locator(id).textContent({ timeout: 5000 })) || '').trim();

// Rend le message d'erreur affiché, ou '' quand la connexion est passée.
async function seConnecter(poste, nom, mdp) {
  const e = await lancer(poste);
  const f = await e.firstWindow();
  await f.waitForSelector('#ecran-liste:not([hidden])', { timeout: 60000 });
  await f.locator('.compte', { hasText: nom }).click();
  await f.fill('#mdp', mdp);
  await f.click('#entrer');
  await souffler(2500);
  let erreur = '';
  try { erreur = (await f.locator('#erreur-c').textContent({ timeout: 800 })) || ''; } catch (e2) { /* fenêtre partie */ }
  await e.close().catch(() => {});
  menage();
  return erreur.trim();
}

async function ouvrir(poste) {
  const e = await lancer(poste);
  const f = await e.firstWindow();
  await f.waitForSelector('#app-toolbar:not([hidden])', { timeout: 90000 });
  return { e, f, dossier: await e.evaluate(({ app }) => app.getPath('userData')) };
}
const refermer = async (s) => { await s.e.close().catch(() => {}); await souffler(800); menage(); };

(async () => {
  // Un « data » hérité d'une version qui ne demandait rien à personne : elle y
  // rangeait directement le stockage du moteur d'affichage. Ces dossiers-là ne
  // sont pas des comptes, et n'ont rien à faire dans la liste.
  ['Cache', 'Local Storage', 'GPUCache', 'Partitions']
    .forEach((n) => fs.mkdirSync(path.join(base, 'data', n), { recursive: true }));

  // La première chose, avant toute fenêtre de travail : qui êtes-vous ?
  {
    const e = await lancer('bureau-1');
    const f = await e.firstWindow();
    await f.waitForSelector('#ecran-creation:not([hidden])', { timeout: 60000 });
    assert.match(f.url(), /choix-profil\.html$/,
      'la fenêtre de connexion est la première, et il n\'y en a pas d\'autre');
    assert.equal(await f.locator('.compte').count(), 0,
      'aucun dossier du moteur d\'affichage n\'est proposé comme compte');
    await e.close().catch(() => {});
    menage();
    dit('premier lancement : la connexion, et rien d\'autre');
  }

  // Rien n'est préparé : ni liste de noms, ni comptes. Tout se crée à l'usage.
  const codeMarie = await creer('bureau-1', 'Marie', 'greffe2026');
  assert.match(codeMarie, /^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/, 'Marie reçoit un code de récupération');
  // Avant de s'appuyer dessus : chaque poste a bien sa session, et elle est
  // allée là où le test l'attend. Sans quoi ce qui suit échouerait plus loin,
  // par une attente de fenêtre interminable, au lieu de le dire ici.
  assert.ok(fs.existsSync(sessionDe('bureau-1')), 'la session de Marie est dans le profil du poste 1');
  assert.ok(!fs.existsSync(sessionDe('bureau-2')), 'et le poste 2 n\'en a pas hérité');
  let s = await ouvrir('bureau-1');
  assert.equal(s.dossier, path.join(base, 'data', 'Marie'), 'Marie travaille dans son dossier');
  await s.f.evaluate(() => localStorage.setItem('blonay-tampons', JSON.stringify([{ text: 'REÇU LE' }])));
  await refermer(s);
  dit('Marie : compte créé, ' + s.dossier + ', un tampon mémorisé');

  // La connexion tient : on rouvre sans rien redemander.
  s = await ouvrir('bureau-1');
  assert.notEqual(await s.f.evaluate(() => localStorage.getItem('blonay-tampons')), null,
    'Marie reste connectée et retrouve son tampon');
  await refermer(s);
  dit('Marie : toujours connectée, sans remettre son mot de passe');

  await creer('bureau-2', 'Sophie', 'archives!7');
  s = await ouvrir('bureau-2');
  assert.equal(s.dossier, path.join(base, 'data', 'Sophie'), 'Sophie a son propre dossier');
  assert.equal(await s.f.evaluate(() => localStorage.getItem('blonay-tampons')), null,
    'Sophie ne voit pas le tampon de Marie');
  await refermer(s);
  dit('Sophie : compte créé, ' + s.dossier + ', et aucun tampon de Marie');

  // Le point de la question : on n'entre pas chez quelqu'un d'autre.
  const refus = await seConnecter('bureau-3', 'Marie', 'greffe2025');
  assert.match(refus, /incorrect/i, 'un mauvais mot de passe est refusé');
  assert.equal(fs.existsSync(sessionDe('bureau-3')), false,
    'et aucune session n\'est ouverte pour autant');
  dit('mauvais mot de passe : « ' + refus +' », aucune session ouverte');

  // Le bon mot de passe ouvre, depuis n'importe quel poste.
  assert.equal(await seConnecter('bureau-4', 'Marie', 'greffe2026'), '', 'le bon mot de passe passe');
  s = await ouvrir('bureau-4');
  assert.equal(s.dossier, path.join(base, 'data', 'Marie'), 'Marie retrouve ses affaires sur un autre poste');
  await refermer(s);
  dit('Marie depuis un autre poste : ' + s.dossier);

  // Le mot de passe n'est écrit nulle part.
  const fiche = fs.readFileSync(path.join(base, 'data', 'Marie', 'compte.json'), 'utf8');
  assert.ok(!fiche.includes('greffe2026'), 'la fiche ne contient pas le mot de passe');
  assert.match(fiche, /scrypt/, 'seulement son empreinte');
  dit('fiche de Marie : empreinte scrypt, pas de mot de passe');

  // Les comptes, et eux seuls : « data » porte aussi des fichiers à nous, dont
  // le jeton qui dit quels postes ont l'application ouverte, et les dossiers
  // du moteur d'affichage laissés par la version d'avant. C'est la fiche qui
  // fait le compte.
  const dossiers = fs.readdirSync(path.join(base, 'data'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(base, 'data', d.name, 'compte.json')))
    .map((d) => d.name).sort();
  assert.deepEqual(dossiers, ['Marie', 'Sophie'], 'un dossier par personne dans data/');
  assert.ok(fs.existsSync(path.join(base, 'data', 'Local Storage')),
    'et l\'héritage de la version d\'avant n\'a pas été effacé au passage');
  dit('data/ : ' + dossiers.join(', '));

  const ficheDe = (n) => JSON.parse(fs.readFileSync(path.join(base, 'data', n, 'compte.json'), 'utf8'));
  const ecrireFiche = (n, f) => fs.writeFileSync(path.join(base, 'data', n, 'compte.json'), JSON.stringify(f, null, 2));
  assert.ok(ficheDe('Marie').recuperation && !JSON.stringify(ficheDe('Marie')).includes(codeMarie.replace(/-/g, '')), 'le code n\'est gardé qu\'en empreinte');
  assert.equal(ficheDe('Marie').motDePasse.N, 131072, 'scrypt à N = 2^17');
  dit('fiche de Marie : code de récupération en empreinte, scrypt N = 2^17');

  // Les règles : huit caractères, et pas « 12345678 ».
  {
    const w = await fenetreConnexion('bureau-5', 'Marie');
    await w.f.click('#retour-c'); await w.f.click('#vers-creation');
    await w.f.fill('#nom', 'Paul Test');
    await w.f.fill('#mdp1', 'abc1234'); await w.f.fill('#mdp2', 'abc1234'); await w.f.click('#creer');
    assert.match(await messageDe(w.f, '#erreur-n'), /au moins 8 caractères/, 'sept caractères : refusé');
    await w.f.fill('#mdp1', '12345678'); await w.f.fill('#mdp2', '12345678'); await w.f.click('#creer');
    assert.match(await messageDe(w.f, '#erreur-n'), /premiers qu/, '« 12345678 » : refusé');
    assert.equal(fs.existsSync(path.join(base, 'data', 'Paul Test')), false, 'aucun compte créé pour autant');
    await w.fermer();
    dit('règles : huit caractères, et pas « 12345678 »');
  }

  // Le frein : trois essais libres, puis on patiente — même avec le bon mot de passe.
  {
    const w = await fenetreConnexion('bureau-5', 'Marie');
    for (let i = 0; i < 3; i++) { await w.f.fill('#mdp', 'faux-' + i + '-faux'); await w.f.click('#entrer'); await souffler(900); }
    assert.match(await messageDe(w.f, '#erreur-c'), /Patientez/, 'après trois échecs : on patiente');
    await w.f.fill('#mdp', 'greffe2026'); await w.f.click('#entrer'); await souffler(900);
    assert.match(await messageDe(w.f, '#erreur-c'), /Trop d.essais/, 'et le bon mot de passe ne passe pas pendant l\'attente');
    assert.ok(ficheDe('Marie').echecs >= 3, 'le compteur est dans la fiche : redémarrer ne le remet pas à zéro');
    await w.fermer();
    dit('frein : ' + ficheDe('Marie').echecs + ' échecs retenus, attente imposée');
    const f0 = ficheDe('Marie'); delete f0.echecs; delete f0.dernierEchec; ecrireFiche('Marie', f0); // la patience n'est pas ce qu'on teste ensuite
  }

  // Mot de passe oublié : le code de récupération rend l'accès, et en donne un neuf.
  {
    const w = await fenetreConnexion('bureau-6', 'Marie');
    await w.f.click('#vers-oubli');
    await w.f.fill('#oubli-code', 'AAAAA-AAAAA-AAAAA-AAAAA'); await w.f.fill('#oubli-1', 'nouveau-greffe-1'); await w.f.fill('#oubli-2', 'nouveau-greffe-1');
    await w.f.click('#oubli-ok');
    assert.match(await messageDe(w.f, '#erreur-o'), /pas le bon/, 'un mauvais code est refusé');
    await w.f.fill('#oubli-code', codeMarie.toLowerCase());
    await w.f.click('#oubli-ok');
    await w.f.waitForSelector('#ecran-code:not([hidden])', { timeout: 20000 });
    const neuf = (await w.f.locator('#le-code').textContent()).trim();
    assert.notEqual(neuf, codeMarie, 'un nouveau code remplace l\'ancien');
    await w.f.check('#code-note'); await w.f.click('#code-ouvrir');
    await souffler(2500); await w.fermer();
    assert.equal(await seConnecter('bureau-7', 'Marie', 'greffe2026'), 'Mot de passe incorrect.', 'l\'ancien mot de passe ne marche plus');
    assert.equal(await seConnecter('bureau-7', 'Marie', 'nouveau-greffe-1'), '', 'le nouveau marche');
    assert.match(JSON.stringify(ficheDe('Marie').evenements), /code de récupération/, 'la trace dit que le code a servi');
    dit('mot de passe oublié : le code rend l\'accès, l\'ancien code ne vaut plus, la trace est écrite');
  }

  // Le compte dont l'administrateur a retiré le mot de passe : c'est dit, et c'est tracé.
  {
    const f1 = ficheDe('Sophie'); delete f1.motDePasse; ecrireFiche('Sophie', f1);
    const w = await fenetreConnexion('bureau-8', null);
    assert.match(await w.f.locator('.compte', { hasText: 'Sophie' }).textContent(), /attend un nouveau mot de passe/, 'la liste le dit');
    await w.f.locator('.compte', { hasText: 'Sophie' }).click();
    assert.equal(await w.f.locator('#avis-attente').isVisible(), true, 'l\'écran de connexion prévient');
    await w.f.fill('#mdp', 'archives-neuves'); await w.f.fill('#mdp-confirm', 'archives-neuves'); await w.f.click('#entrer');
    await w.f.waitForSelector('#ecran-code:not([hidden])', { timeout: 20000 });
    await w.f.check('#code-note'); await w.f.click('#code-ouvrir');
    await souffler(2500); await w.fermer();
    const tr = ficheDe('Sophie');
    assert.match(JSON.stringify(tr.evenements), /réinitialisation/, 'la reprise du compte est tracée');
    assert.ok(tr.evenements.some((x) => x.poste), 'avec le poste');
    dit('compte réinitialisé : signalé dans la liste et sur l\'écran, repris avec un code neuf, tracé dans la fiche');
  }

  // Changer son mot de passe depuis le menu, une fois connectée.
  {
    s = await ouvrir('bureau-7'); // Marie
    const fenetre = s.e.waitForEvent('window');
    await s.e.evaluate(({ Menu }) => {
      const trouver = (items) => { for (const it of items) { if (it.label === 'Changer mon mot de passe…') return it; if (it.submenu) { const r = trouver(it.submenu.items); if (r) return r; } } return null; };
      trouver(Menu.getApplicationMenu().items).click();
    });
    const w = await fenetre;
    await w.waitForSelector('#ecran-changer:not([hidden])', { timeout: 20000 });
    await w.fill('#ch-ancien', 'pas-le-bon-1'); await w.fill('#ch-1', 'troisieme-greffe'); await w.fill('#ch-2', 'troisieme-greffe'); await w.click('#ch-ok');
    assert.match(await messageDe(w, '#erreur-ch'), /pas le bon/, 'le mot de passe actuel est exigé');
    await w.fill('#ch-ancien', 'nouveau-greffe-1'); await w.fill('#ch-1', '12345678'); await w.fill('#ch-2', '12345678'); await w.click('#ch-ok');
    assert.match(await messageDe(w, '#erreur-ch'), /premiers qu/, 'et le nouveau doit être acceptable');
    await w.fill('#ch-ancien', 'nouveau-greffe-1'); await w.fill('#ch-1', 'troisieme-greffe'); await w.fill('#ch-2', 'troisieme-greffe'); await w.click('#ch-ok');
    await w.waitForSelector('#fait-ch:not([hidden])', { timeout: 20000 });
    await refermer(s);
    assert.equal(await seConnecter('bureau-9', 'Marie', 'troisieme-greffe'), '', 'le mot de passe changé depuis le menu ouvre le compte');
    dit('changer son mot de passe depuis le menu : l\'actuel est exigé, le nouveau contrôlé');
  }

  // Supprimer un compte : le départ d'une collègue.
  {
    const w = await fenetreConnexion('bureau-10', 'Sophie');
    await w.f.click('#vers-oubli'); await w.f.click('#vers-suppression');
    await w.f.fill('#supp-secret', 'pas-ce-mot-la'); await w.f.click('#supp-ok');
    assert.match(await messageDe(w.f, '#erreur-s'), /ne correspondent/, 'sans le bon secret, rien n\'est supprimé');
    assert.ok(fs.existsSync(path.join(base, 'data', 'Sophie')), 'le dossier est toujours là');
    await w.f.fill('#supp-secret', 'archives-neuves'); await w.f.click('#supp-ok');
    await w.f.waitForFunction(() => !Array.from(document.querySelectorAll('.compte')).some((c) => /Sophie/.test(c.textContent)), null, { timeout: 20000 });
    assert.equal(fs.existsSync(path.join(base, 'data', 'Sophie')), false, 'le dossier de Sophie est effacé');
    assert.ok(fs.existsSync(path.join(base, 'data', 'Marie')), 'celui de Marie, non');
    await w.fermer();
    dit('suppression d\'un compte : refusée sans le secret, faite avec, les autres comptes intacts');
  }

  try { fs.rmSync(base, { recursive: true, force: true }); } catch (e) { /* ménage sans importance */ }
  console.log('COMPTES OK');
})().catch((e) => { menage(); console.error(e); process.exit(1); });
