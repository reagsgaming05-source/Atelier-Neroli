// Le traitement par lots et la détection des pages vides : jamais couverts jusqu'ici. Trois fichiers passent par
// le même traitement sans que le document ouvert soit touché ; les résultats se rangent dans une archive.
const { test, expect, pdfDe, textesDuPdf, compterPages } = require('./aide');

const page = (texte) => (texte ? [{ x: 70, y: 700, taille: 16, texte }] : []);
const fichiers = () => [
  { name: 'a.pdf', mimeType: 'application/pdf', buffer: pdfDe([page('A page un'), page(''), page('A page trois')]) },
  { name: 'b.pdf', mimeType: 'application/pdf', buffer: pdfDe([page('B page un'), page('B page deux')]) },
  { name: 'c.pdf', mimeType: 'application/pdf', buffer: pdfDe([page(''), page('C page deux'), page(''), page('C page quatre')]) },
];

// L'archive récoltée : ses entrées (nom → octets), lues dans la page avec JSZip.
async function lireLArchive(p, octets) {
  const liste = await p.evaluate(async (b64) => {
    const zip = await window.JSZip.loadAsync(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
    const out = [];
    for (const nom of Object.keys(zip.files)) {
      const o = await zip.files[nom].async('uint8array');
      let s = ''; for (let i = 0; i < o.length; i += 8192) s += String.fromCharCode.apply(null, o.subarray(i, i + 8192));
      out.push([nom, btoa(s)]);
    }
    return out;
  }, octets.toString('base64'));
  return new Map(liste.map(([nom, b64]) => [nom, Buffer.from(b64, 'base64')]));
}

async function lancer(app, p, operation, fichiersChoisis, apres) {
  await p.click('#tab-tools');
  await p.click('[data-tool="lots"]');
  await p.waitForSelector('.dialog', { state: 'visible' });
  await p.setInputFiles('#lots-fichiers', fichiersChoisis);
  await p.selectOption('#lots-op', operation);
  if (apres) await apres();
  return app.recolter(() => p.locator('.dialog').getByRole('button', { name: 'Lancer' }).click());
}

test('« Supprimer les pages vides » sur trois fichiers : une archive, et le document ouvert n\'est pas touché', async ({ app, page: p }) => {
  test.setTimeout(240000);
  await app.ouvrir('ouvert.pdf', pdfDe([page('Document ouvert un'), page('Document ouvert deux')]));
  const { nom, octets } = await lancer(app, p, 'vides', fichiers());
  expect(nom).toMatch(/^lot-vides-\d{4}-\d{2}-\d{2}\.zip$/);
  const entrees = await lireLArchive(p, octets);
  expect(Array.from(entrees.keys()).sort()).toEqual(['a-sans-vides.pdf', 'b-sans-vides.pdf', 'c-sans-vides.pdf']);
  expect(compterPages(entrees.get('a-sans-vides.pdf')), 'a : une page vide supprimée').toBe(2);
  expect(compterPages(entrees.get('b-sans-vides.pdf')), 'b : rien à retirer').toBe(2);
  expect(compterPages(entrees.get('c-sans-vides.pdf')), 'c : deux pages vides supprimées').toBe(2);
  const textes = await textesDuPdf(p, entrees.get('c-sans-vides.pdf'));
  expect(textes.join(' ')).toMatch(/C page deux/);
  expect(textes.join(' ')).toMatch(/C page quatre/);
  // le document ouvert n'a pas bougé
  expect(await app.nbPages()).toBe(2);
  expect(await app.estModifie()).toBe(false);
  await expect(p.locator('#doc-list .doc-name')).toHaveCount(1);
});

test('« Numéroter les pages » : chaque fichier reçoit ses numéros', async ({ app, page: p }) => {
  test.setTimeout(240000);
  const { octets } = await lancer(app, p, 'numeroter', fichiers().slice(0, 2));
  const entrees = await lireLArchive(p, octets);
  expect(Array.from(entrees.keys()).sort()).toEqual(['a-numerote.pdf', 'b-numerote.pdf']);
  const a = await textesDuPdf(p, entrees.get('a-numerote.pdf'));
  expect(a[0]).toContain('1 / 3');
  expect(a[2]).toContain('3 / 3');
  const b = await textesDuPdf(p, entrees.get('b-numerote.pdf'));
  expect(b[1]).toContain('2 / 2');
});

test('« Séparer » : une page par fichier', async ({ app, page: p }) => {
  test.setTimeout(240000);
  const { octets } = await lancer(app, p, 'separer', fichiers().slice(2));
  const entrees = await lireLArchive(p, octets);
  expect(Array.from(entrees.keys()).sort()).toEqual(['c-1.pdf', 'c-2.pdf', 'c-3.pdf', 'c-4.pdf']);
  for (const e of entrees.values()) expect(compterPages(e)).toBe(1);
  expect((await textesDuPdf(p, entrees.get('c-2.pdf'))).join(' ')).toContain('C page deux');
});

test('« Extraire le texte » : un fichier texte, une section par page', async ({ app, page: p }) => {
  test.setTimeout(240000);
  const { nom, octets } = await lancer(app, p, 'texte', fichiers().slice(0, 1));
  expect(nom).toBe('a.txt');
  const t = octets.toString('utf8');
  expect(t).toMatch(/--- Page 1 ---\s+A page un/);
  expect(t).toMatch(/--- Page 2 ---\s+\(aucun texte\)/);
  expect(t).toMatch(/--- Page 3 ---\s+A page trois/);
});

test('« Protéger par mot de passe » : les fichiers produits sont chiffrés', async ({ app, page: p }) => {
  test.setTimeout(240000);
  const { octets } = await lancer(app, p, 'proteger', fichiers().slice(0, 1), async () => { await p.fill('#lots-pw', 'secret-d-essai'); });
  expect(octets.toString('latin1')).toContain('/Encrypt');
  expect(octets.toString('latin1')).not.toContain('A page un');
});

// Les configurations nommées enregistrées sur ce poste (voir reglages.spec.js) servent aussi aux lots.
const COURRIER = { nom: 'Courrier officiel', valeurs: { hl: 'Commune de Test', hc: '', hr: '', fl: '', fc: 'Page {p} sur {n}', fr: '', font: 'Helvetica', size: '10', color: '#333333', margin: '28', bpre: '', bdig: '4', skip: false } };
const BROUILLON = { nom: 'Brouillon', valeurs: { text: 'BROUILLON', font: 'Helvetica', bold: true, size: '60', color: '#cc0000', opacity: '30', angle: '45', mode: 'center' } };
const poserLesConfigs = (p) => p.evaluate(([c, b]) => {
  localStorage.setItem('aktum-configs-entete', JSON.stringify([c]));
  localStorage.setItem('aktum-configs-filigrane', JSON.stringify([b]));
}, [COURRIER, BROUILLON]);

test('trois opérations en chaîne : pages vides, en-tête d\'une configuration, filigrane d\'une autre — chacune sur chaque fichier', async ({ app, page: p }) => {
  test.setTimeout(240000);
  await poserLesConfigs(p);
  const { octets } = await lancer(app, p, 'vides', fichiers().slice(0, 2), async () => {
    await p.selectOption('#lots-op2', 'entete');
    await p.selectOption('#lots-cfg2', 'Courrier officiel');
    await p.selectOption('#lots-op3', 'filigrane');
    await p.selectOption('#lots-cfg3', 'Brouillon');
  });
  const entrees = await lireLArchive(p, octets);
  expect(Array.from(entrees.keys()).sort()).toEqual(['a-sans-vides-entete-filigrane.pdf', 'b-sans-vides-entete-filigrane.pdf']);
  const a = await textesDuPdf(p, entrees.get('a-sans-vides-entete-filigrane.pdf'));
  expect(a, 'la page vide est partie : deux pages').toHaveLength(2);
  expect(a[0], 'l\'en-tête de la configuration').toContain('Commune de Test');
  expect(a[0], 'la numérotation compte les pages restantes').toContain('Page 1 sur 2');
  expect(a[1]).toContain('Page 2 sur 2');
  expect(a[0], 'le filigrane de l\'autre configuration').toContain('BROUILLON');
  expect(a[1]).toContain('BROUILLON');
  const b = await textesDuPdf(p, entrees.get('b-sans-vides-entete-filigrane.pdf'));
  expect(b[1]).toContain('Page 2 sur 2');
  expect(b[1]).toContain('BROUILLON');
});

test('une opération qui produit les fichiers termine la chaîne : les suivantes se verrouillent', async ({ app, page: p }) => {
  await p.click('#tab-tools');
  await p.click('[data-tool="lots"]');
  await p.waitForSelector('.dialog', { state: 'visible' });
  await p.selectOption('#lots-op', 'separer');
  await expect(p.locator('#lots-op2')).toBeDisabled();
  await expect(p.locator('#lots-op3')).toBeDisabled();
  await p.selectOption('#lots-op', 'vides');
  await expect(p.locator('#lots-op2')).toBeEnabled();
  // une même opération ne se répète pas ; « images » n\'est que la première
  await expect(p.locator('#lots-op2 option[value="vides"]')).toBeDisabled();
  await expect(p.locator('#lots-op2 option[value="images"]')).toBeDisabled();
});

test('une configuration à appliquer est exigée : sans elle, rien ne se lance', async ({ app, page: p }) => {
  await poserLesConfigs(p);
  await p.click('#tab-tools');
  await p.click('[data-tool="lots"]');
  await p.waitForSelector('.dialog', { state: 'visible' });
  await p.setInputFiles('#lots-fichiers', fichiers().slice(0, 1));
  await p.selectOption('#lots-op', 'entete');
  await expect(p.locator('#lots-cfg1')).toBeVisible();
  let ecrit = false;
  p.on('download', () => { ecrit = true; });
  await p.locator('.dialog').getByRole('button', { name: 'Lancer' }).click();
  await expect(p.locator('#toast')).toContainText('Choisissez la configuration');
  await expect(p.locator('.dialog')).toBeVisible();
  expect(ecrit).toBe(false);
});

test('un lot sans fichier le dit, sans rien lancer', async ({ app, page: p }) => {
  await p.click('#tab-tools');
  await p.click('[data-tool="lots"]');
  await p.waitForSelector('.dialog', { state: 'visible' });
  await p.locator('.dialog').getByRole('button', { name: 'Lancer' }).click();
  await expect(p.locator('#toast')).toContainText('Choisissez d\'abord les fichiers');
  await expect(p.locator('.dialog')).toBeVisible();
});

test('la détection des pages vides : les pages blanches se cochent, celles qui portent du texte restent', async ({ app, page: p }) => {
  test.setTimeout(240000);
  await app.ouvrir('registre.pdf', pdfDe([page('Premiere'), page(''), page('Troisieme'), page(''), page('Cinquieme')]));
  await app.outil('vides');
  // l'analyse se fait, puis le décompte
  await expect(p.locator('.dialog')).toContainText('2 pages vides détectées sur 5', { timeout: 60000 });
  await p.locator('.dialog').getByRole('button', { name: /Supprimer/ }).click();
  await expect.poll(() => app.nbPages(), { timeout: 30000 }).toBe(3);
  const { octets } = await app.exporter();
  const textes = await textesDuPdf(p, octets);
  expect(textes.join(' ')).toMatch(/Premiere.*Troisieme.*Cinquieme/);
});
