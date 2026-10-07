// Le logiciel et le reste du poste de travail (chapitre 16), joué dans la page avec un pont simulé vers l'application fenêtrée :
// « Envoyer par courriel », la boîte de réception du copieur, la copie d'une page ou d'une zone comme image, le fichier montré dans son
// dossier, l'inscription « Ouvrir avec » des Préférences, l'impression d'un dossier aux formats mêlés, le nom qui garde ses accents.
// Le vrai pont (processus principal, registre, Outlook) s'éprouve ailleurs : desktop/smoke-test.js et desktop/association-test.js sous Windows.
const { test, expect, pdfDe } = require('./aide');

const A4 = { largeur: 595, hauteur: 842 }, A3PAYSAGE = { largeur: 1191, hauteur: 842 };
const doc3 = () => pdfDe([
  Object.assign({ morceaux: [{ x: 70, y: 760, texte: 'Page A4 un' }] }, A4),
  Object.assign({ morceaux: [{ x: 70, y: 760, texte: 'Plan A3' }] }, A3PAYSAGE),
  Object.assign({ morceaux: [{ x: 70, y: 760, texte: 'Page A4 trois' }] }, A4),
]);

// Le pont simulé : chaque appel est noté dans window.__appels ; les réponses se règlent par l'option.
async function simulerLeBureau(page, o) {
  o = o || {};
  await page.addInitScript((o) => {
    window.__appels = [];
    const note = (nom, ...a) => { window.__appels.push([nom].concat(a.map((x) => (x instanceof Uint8Array ? { octets: x.length, debut: Array.from(x.slice(0, 8)) } : x)))); };
    const rep = (nom, valeur) => (...a) => { note(nom, ...a); return Promise.resolve(typeof valeur === 'function' ? valeur(...a) : valeur); };
    let arrivees = (o.arrivees || []).map((x) => Object.assign({}, x));
    let etatArr = Object.assign({ dossier: '', actif: false, erreur: '', total: 0, nouveaux: 0 }, o.etatArrivees || {});
    const pdfBytes = o.pdfB64 ? Uint8Array.from(atob(o.pdfB64), (c) => c.charCodeAt(0)) : null;
    let association = Object.assign({ possible: true, raison: '', inscrit: false, aJour: false }, o.association || {});
    window.AktumDesktop = {
      version: 'test', construction: '', profil: '', langue: 'fr', electron: 'x', chrome: 'x',
      fichiersInitiaux: () => Promise.resolve(o.initiaux ? o.initiaux.map((f) => Object.assign({}, f, { octets: pdfBytes })) : []),
      onOuvrir() {}, onOuvrirOnglet() {}, onCommande(cb) { window.__commande = cb; }, onEnregistre() {}, onLangue() {},
      recupListe: () => Promise.resolve([]), recupEcrire: () => Promise.resolve({ ok: true }), recupEffacer: () => Promise.resolve(true),
      licence: () => Promise.resolve({ etat: 'licence', description: 'Licence de l\'essai', jours: 0 }),
      imprimantes: () => Promise.resolve([{ name: 'P1', displayName: 'P1', isDefault: true }]),
      imprimer: rep('imprimer', { ok: true }),
      definirMenuOutils() {}, definirAccelerateurs() {}, definirTheme() {},
      lireReglage: () => Promise.resolve(false), ecrireReglage: () => Promise.resolve(true),
      recents: () => Promise.resolve([]), noterRecents() {}, cheminDe: () => '', liberer: () => Promise.resolve(true),
      ecrire: rep('ecrire', { ok: true }),
      courriel: (o2) => { note('courriel', { nom: o2.nom, octets: { octets: o2.octets.length, debut: Array.from(o2.octets.slice(0, 8)) } }); return Promise.resolve(o.courriel || { ok: true, mode: 'outlook' }); },
      afficherDansLeDossier: rep('afficherDansLeDossier', true),
      copierImage: rep('copierImage', true),
      associationEtat: () => Promise.resolve(Object.assign({}, association)),
      associationInscrire: (...a) => { note('associationInscrire', ...a); association = Object.assign({}, association, { inscrit: true, aJour: true }); return Promise.resolve({ ok: true, erreur: '' }); },
      associationRetirer: (...a) => { note('associationRetirer', ...a); association = Object.assign({}, association, { inscrit: false, aJour: false }); return Promise.resolve({ ok: true, erreur: '' }); },
      associationReglages: rep('associationReglages', true),
      arriveesEtat: () => Promise.resolve(Object.assign({}, etatArr)),
      arriveesChoisir: (...a) => { note('arriveesChoisir', ...a); etatArr = Object.assign({}, etatArr, { dossier: 'S:\\Scans', actif: true, total: arrivees.length }); return Promise.resolve(etatArr); },
      arriveesArreter: (...a) => { note('arriveesArreter', ...a); etatArr = Object.assign({}, etatArr, { dossier: '', actif: false }); return Promise.resolve(etatArr); },
      arriveesListe: () => Promise.resolve(arrivees.map((x) => Object.assign({}, x))),
      arriveesOuvrir: (nom) => { note('arriveesOuvrir', nom); return Promise.resolve(pdfBytes ? [{ nom, octets: pdfBytes, chemin: '', mtimeMs: 0, verrou: null }] : []); },
      arriveesClasser: (nom) => { note('arriveesClasser', nom); arrivees = arrivees.filter((x) => x.nom !== nom); return Promise.resolve({ ok: true, dossier: 'S:\\Affaires\\2026', nom }); },
      arriveesSupprimer: (nom) => { note('arriveesSupprimer', nom); arrivees = arrivees.filter((x) => x.nom !== nom); return Promise.resolve({ ok: true }); },
      onArrivees(cb) { window.__surArrivees = cb; },
    };
  }, o);
}
async function demarrer(page, app, o) {
  await simulerLeBureau(page, o);
  await page.reload();
  await page.waitForSelector('#app-toolbar', { state: 'visible', timeout: 60000 });
  await page.waitForFunction(() => typeof window.__commande === 'function');
}
const appels = (page, nom) => page.evaluate((n) => window.__appels.filter((a) => a[0] === n), nom);
const commande = (page, nom) => page.evaluate((n) => window.__commande(n), nom);

test('envoyer par courriel : le PDF est préparé comme à l\'export et remis au processus principal, le message s\'affiche', async ({ app, page }) => {
  await demarrer(page, app, { courriel: { ok: true, mode: 'outlook' } });
  await app.ouvrir('Préavis 3-26.pdf', pdfDe([[{ x: 70, y: 760, texte: 'Préavis municipal' }]]));
  await commande(page, 'outil:courriel');
  await expect(page.locator('.dialog')).toContainText('Envoyer par courriel');
  await page.click('#cr-preparer');
  await expect.poll(async () => (await appels(page, 'courriel')).length, { timeout: 30000 }).toBe(1);
  const [, o] = (await appels(page, 'courriel'))[0];
  expect(o.nom).toBe('Préavis 3-26.pdf');
  expect(o.octets.debut.slice(0, 4), 'un vrai PDF part (%PDF)').toEqual([0x25, 0x50, 0x44, 0x46]);
  await expect(page.locator('#toast')).toContainText('prêt dans Outlook');
});

test('envoyer par courriel sans Outlook : le dossier du PDF est ouvert et la phrase dit quoi faire', async ({ app, page }) => {
  await demarrer(page, app, { courriel: { ok: true, mode: 'dossier', raison: 'Outlook n\u2019est pas disponible sur ce poste.', chemin: 'C:\\x.pdf' } });
  await app.ouvrir('lettre.pdf', pdfDe([[{ x: 70, y: 760, texte: 'Lettre' }]]));
  await commande(page, 'outil:courriel');
  await page.click('#cr-preparer');
  await expect(page.locator('#toast')).toContainText('joignez « lettre.pdf » à votre message', { timeout: 30000 });
  await expect(page.locator('#toast')).toContainText('Outlook n’est pas disponible');
});

test('un dossier aux formats mêlés part en un envoi par suite de pages de même format, chacun sur son papier', async ({ app, page }) => {
  await demarrer(page, app, {});
  await app.ouvrir('mise-a-lenquete.pdf', doc3());
  await commande(page, 'imprimer');
  await page.locator('.dialog .dlg-foot .tb-btn.primary').click();
  await expect.poll(async () => (await appels(page, 'imprimer')).length, { timeout: 90000 }).toBe(3);
  const jobs = (await appels(page, 'imprimer')).map((a) => a[1]);
  const proche = (j, paysage, l, h) => { expect(j.paysage).toBe(paysage); expect(Math.abs(j.largeurMicrons - l)).toBeLessThan(400); expect(Math.abs(j.hauteurMicrons - h)).toBeLessThan(400); };
  proche(jobs[0], false, 210000, 297000);     // A4 portrait
  proche(jobs[1], true, 297000, 420000);      // A3 paysage : la feuille est annoncée courte × longue, avec l'orientation à part
  proche(jobs[2], false, 210000, 297000);
  expect(jobs.every((j) => j.gris === false)).toBe(true);
  await expect(page.locator('#last')).toContainText(/3 envois/, { timeout: 30000 });
  await expect(page.locator('#toast')).toContainText('mêle 2 formats de feuille');
});

test('« Nuances de gris » : le travail le dit au processus principal', async ({ app, page }) => {
  await demarrer(page, app, {});
  await app.ouvrir('couleur.pdf', pdfDe([[{ x: 70, y: 760, texte: 'Une page' }]]));
  await commande(page, 'imprimer');
  await page.locator('#imp-gris').check();
  await page.locator('.dialog .dlg-foot .tb-btn.primary').click();
  await expect.poll(async () => (await appels(page, 'imprimer')).length, { timeout: 60000 }).toBe(1);
  expect((await appels(page, 'imprimer'))[0][1].gris).toBe(true);
});

test('la page imprimée en gris est faite de pixels gris', async ({ app, page }) => {
  await demarrer(page, app, {});
  // la fonction de conversion elle-même : un aplat rouge devient gris (r = v = b)
  const rgb = await page.evaluate(() => {
    const cv = document.createElement('canvas'); cv.width = 4; cv.height = 4;
    const cx = cv.getContext('2d'); cx.fillStyle = '#d00000'; cx.fillRect(0, 0, 4, 4);
    const g = document.createElement('canvas'); g.width = 4; g.height = 4;
    const gx = g.getContext('2d'); gx.filter = 'grayscale(1)'; gx.drawImage(cv, 0, 0);
    return Array.from(gx.getImageData(1, 1, 1, 1).data.slice(0, 3));
  });
  expect(rgb[0]).toBe(rgb[1]);
  expect(rgb[1]).toBe(rgb[2]);
});

test('le nom proposé à l\'enregistrement garde ses accents dans l\'application : il voyage en ASCII, le processus principal le rend tel quel', async ({ app, page }) => {
  await demarrer(page, app, {});
  await app.ouvrir('Procès-verbal août.pdf', pdfDe([[{ x: 70, y: 760, texte: 'PV' }]]));
  await page.fill('#filename', 'Décision — Hêtre');
  const { nom } = await app.recolter(() => page.click('#btn-export'));
  // Chromium remplacerait par « download » un nom non ASCII : la page le transporte en ASCII (aktum-u8-…), et desktop/main.js le décode
  // (voir desktop/nom-telechargement.js, éprouvé de bout en bout par desktop/smoke-test.js).
  expect(nom).toMatch(/^aktum-u8-[A-Za-z0-9_-]+\.pdf$/);
  const decode = Buffer.from(nom.slice('aktum-u8-'.length, -4).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  expect(decode + '.pdf').toBe('Décision — Hêtre.pdf');
});

test('afficher le document dans son dossier : le chemin du fichier ouvert est donné au système', async ({ app, page }) => {
  await demarrer(page, app, { initiaux: [{ nom: 'lettre.pdf', chemin: 'C:\\Dossiers\\lettre.pdf', mtimeMs: 1 }], pdfB64: Buffer.from(pdfDe([[{ x: 70, y: 760, texte: 'Lettre' }]])).toString('base64') });
  await app.attendreRendu();
  await commande(page, 'afficher-fichier');
  await expect.poll(async () => (await appels(page, 'afficherDansLeDossier')).length).toBe(1);
  expect((await appels(page, 'afficherDansLeDossier'))[0][1]).toBe('C:\\Dossiers\\lettre.pdf');
});

test('afficher le document sans fichier sur le disque : on le dit', async ({ app, page }) => {
  await demarrer(page, app, {});
  await app.ouvrir('neuf.pdf', pdfDe([[{ x: 70, y: 760, texte: 'x' }]]));
  await commande(page, 'afficher-fichier');
  await expect(page.locator('#toast')).toContainText('pas encore de fichier sur le disque');
  expect(await appels(page, 'afficherDansLeDossier')).toHaveLength(0);
});

test('copier la page comme image : une image PNG part au presse-papiers', async ({ app, page }) => {
  await demarrer(page, app, {});
  await app.ouvrir('plan.pdf', pdfDe([[{ x: 70, y: 760, texte: 'Plan' }]]));
  await commande(page, 'outil:copier-image');
  await page.click('#ci-page');
  await expect.poll(async () => (await appels(page, 'copierImage')).length, { timeout: 60000 }).toBe(1);
  const [, img] = (await appels(page, 'copierImage'))[0];
  expect(img.debut, 'signature PNG').toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  expect(img.octets).toBeGreaterThan(1000);
  await expect(page.locator('#toast')).toContainText('copiée comme image');
});

test('copier une zone : le cadre dessiné à la souris donne une image plus petite que la page', async ({ app, page }) => {
  await demarrer(page, app, {});
  await app.ouvrir('plan.pdf', pdfDe([[{ x: 70, y: 760, texte: 'Plan' }]]));
  await commande(page, 'outil:copier-image');
  await page.click('#ci-page');
  await expect.poll(async () => (await appels(page, 'copierImage')).length, { timeout: 60000 }).toBe(1);
  const pleine = (await appels(page, 'copierImage'))[0][1].octets;
  await commande(page, 'outil:copier-image');
  await page.click('#ci-zone');
  await expect(page.locator('body.en-instantane')).toHaveCount(1);
  const f = await page.locator('.feuille-vue').first().boundingBox();
  await page.mouse.move(f.x + f.width * 0.1, f.y + f.height * 0.1);
  await page.mouse.down();
  await page.mouse.move(f.x + f.width * 0.5, f.y + f.height * 0.3, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => (await appels(page, 'copierImage')).length, { timeout: 60000 }).toBe(2);
  const zone = (await appels(page, 'copierImage'))[1][1].octets;
  expect(zone).toBeLessThan(pleine);
  await expect(page.locator('body.en-instantane')).toHaveCount(0);
});

test('Échap abandonne le dessin de la zone sans rien copier', async ({ app, page }) => {
  await demarrer(page, app, {});
  await app.ouvrir('plan.pdf', pdfDe([[{ x: 70, y: 760, texte: 'Plan' }]]));
  await commande(page, 'outil:copier-image');
  await page.click('#ci-zone');
  await expect(page.locator('body.en-instantane')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('body.en-instantane')).toHaveCount(0);
  expect(await appels(page, 'copierImage')).toHaveLength(0);
});

const ARRIVEES = [
  { nom: 'scan-0001.pdf', taille: 120000, mtimeMs: Date.now() - 600000, stable: true, nouveau: true },
  { nom: 'scan-0002.pdf', taille: 3400, mtimeMs: Date.now() - 1000, stable: false, nouveau: true },
];
const etatArr = { dossier: 'S:\\Scans', actif: true, erreur: '', total: 2, nouveaux: 1 };

test('la boîte du copieur liste les arrivées, ouvre un document, et laisse en attente celui que le copieur écrit encore', async ({ app, page }) => {
  await demarrer(page, app, { arrivees: ARRIVEES, etatArrivees: etatArr, pdfB64: Buffer.from(pdfDe([[{ x: 70, y: 760, texte: 'Scan du copieur' }]])).toString('base64') });
  await app.ouvrir('autre.pdf', pdfDe([[{ x: 70, y: 760, texte: 'autre' }]]));
  await commande(page, 'outil:arrivees');
  await expect(page.locator('.ar-ligne')).toHaveCount(2);
  await expect(page.locator('.ar-ligne[data-nom="scan-0002.pdf"]')).toContainText('en cours d\'écriture');
  await expect(page.locator('.ar-ligne[data-nom="scan-0002.pdf"] .ar-ouvrir')).toBeDisabled();
  await expect(page.locator('.ar-ligne[data-nom="scan-0001.pdf"] .ar-nouveau')).toBeVisible();
  await page.click('.ar-ligne[data-nom="scan-0001.pdf"] .ar-ouvrir');
  await expect.poll(async () => (await appels(page, 'arriveesOuvrir')).length).toBe(1);
  await expect(page.locator('#doc-list .doc-name', { hasText: 'scan-0001' })).toHaveCount(1, { timeout: 30000 });
});

test('classer et supprimer passent par le processus principal, avec le seul nom du fichier', async ({ app, page }) => {
  await demarrer(page, app, { arrivees: ARRIVEES.slice(0, 1).concat([{ nom: 'scan-0003.pdf', taille: 900, mtimeMs: Date.now() - 900000, stable: true, nouveau: false }]), etatArrivees: etatArr });
  await app.ouvrir('autre.pdf', pdfDe([[{ x: 70, y: 760, texte: 'autre' }]]));
  await commande(page, 'outil:arrivees');
  await page.click('.ar-ligne[data-nom="scan-0001.pdf"] .ar-classer');
  await expect(page.locator('#toast')).toContainText('est classé dans S:\\Affaires\\2026');
  await expect(page.locator('.ar-ligne')).toHaveCount(1);
  await page.click('.ar-ligne[data-nom="scan-0003.pdf"] .ar-supprimer');
  await expect(page.locator('.ar-ligne')).toHaveCount(0, { timeout: 10000 });
  expect((await appels(page, 'arriveesClasser')).map((a) => a.slice(1))).toEqual([['scan-0001.pdf']]);
  expect((await appels(page, 'arriveesSupprimer')).map((a) => a.slice(1))).toEqual([['scan-0003.pdf']]);
});

test('sans dossier désigné, la boîte l\'explique et propose de le choisir ; arrêter la surveillance ne touche à rien', async ({ app, page }) => {
  await demarrer(page, app, { arrivees: ARRIVEES });
  await app.ouvrir('autre.pdf', pdfDe([[{ x: 70, y: 760, texte: 'autre' }]]));
  await commande(page, 'outil:arrivees');
  await expect(page.locator('.dialog')).toContainText('Désignez le dossier où votre copieur dépose ses numérisations');
  await page.click('#ar-choisir');
  await expect(page.locator('.ar-dossier')).toContainText('S:\\Scans');
  await page.click('#ar-arreter');
  await expect(page.locator('#ar-choisir')).toBeVisible();
  expect(await appels(page, 'arriveesChoisir')).toHaveLength(1);
  expect(await appels(page, 'arriveesArreter')).toHaveLength(1);
  expect(await appels(page, 'arriveesClasser')).toHaveLength(0);
  expect(await appels(page, 'arriveesSupprimer')).toHaveLength(0);
});

test('un nouveau document dans la boîte est annoncé', async ({ app, page }) => {
  await demarrer(page, app, { arrivees: ARRIVEES, etatArrivees: Object.assign({}, etatArr, { nouveaux: 0 }) });
  await page.evaluate(() => window.__surArrivees({ total: 3, nouveaux: 2 }));
  await expect(page.locator('#toast')).toContainText('2 nouveaux documents dans la boîte du copieur');
});

test('Préférences : l\'inscription « Ouvrir avec » se propose, puis se retire, sans rien faire d\'autre', async ({ app, page }) => {
  await demarrer(page, app, { association: { possible: true, inscrit: false } });
  await commande(page, 'preferences');
  await expect(page.locator('#pref-assoc-etat')).toContainText('n\'est pas inscrit');
  await expect(page.locator('#pref-assoc-retirer')).toBeHidden();
  await page.click('#pref-assoc-inscrire');
  await expect(page.locator('#pref-assoc-etat')).toContainText('proposé dans « Ouvrir avec »');
  await expect(page.locator('#pref-assoc-inscrire')).toBeHidden();
  await page.click('#pref-assoc-reglages');
  await page.click('#pref-assoc-retirer');
  await expect(page.locator('#pref-assoc-etat')).toContainText('n\'est pas inscrit');
  expect((await appels(page, 'associationInscrire')).length).toBe(1);
  expect((await appels(page, 'associationRetirer')).length).toBe(1);
  expect((await appels(page, 'associationReglages')).length).toBe(1);
});

test('Préférences : depuis un support amovible l\'inscription n\'est pas proposée, et la raison est dite', async ({ app, page }) => {
  await demarrer(page, app, { association: { possible: false, raison: 'L\u2019application est sur un support amovible (clé USB, disque externe) : l\u2019inscription resterait sur ce poste.', inscrit: false } });
  await commande(page, 'preferences');
  await expect(page.locator('#pref-assoc-etat')).toContainText('support amovible');
  await expect(page.locator('#pref-assoc-inscrire')).toBeHidden();
});
