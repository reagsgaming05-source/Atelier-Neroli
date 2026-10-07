// Exporter vers Word (chapitre 09) : un titre, un paragraphe et un tableau du PDF deviennent un vrai .docx — un titre de Word,
// un paragraphe d'une seule pièce, un tableau — et l'archive est celle qu'un Word attend.
const { test, expect, pdfDe } = require('./aide');

const L1 = 'Le Conseil communal a examiné le préavis relatif au décompte des frais et l\'a adopté';
const L2 = 'à l\'unanimité des membres présents.';
const ligne = (y, a, b, c) => [{ x: 70, y, texte: a }, { x: 300, y, texte: b }, { x: 430, y, texte: c }];
const exemple = () => pdfDe([
  [{ x: 70, y: 780, taille: 24, texte: 'Décompte des frais' },
    { x: 70, y: 740, taille: 10, texte: L1 }, { x: 70, y: 726, taille: 10, texte: L2 },
    ...ligne(660, 'Libellé', 'Quantité', 'Montant'), ...ligne(640, 'Transport', '12', "1'240.50"), ...ligne(620, 'Repas', '45', 'CHF 540.-')],
  [{ x: 70, y: 780, taille: 10, texte: 'Annexe : liste des classes concernées.' }],
]);

// Le contenu du .docx lu dans la page, avec l'archive qu'a écrite l'application.
async function lire(page, octets) {
  return page.evaluate(async (b64) => {
    const z = await window.JSZip.loadAsync(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
    return { fichiers: Object.keys(z.files).sort(), doc: await z.file('word/document.xml').async('string'), core: await z.file('docProps/core.xml').async('string') };
  }, Buffer.from(octets).toString('base64'));
}

test('un titre, un paragraphe d\'une pièce et un tableau', async ({ app, page }) => {
  await app.ouvrir('decompte.pdf', exemple());
  await app.outil('exp-word');
  await expect(page.locator('.dialog')).toContainText('1 titre, 2 paragraphes, 1 tableau repérés');
  const { nom, octets } = await app.recolter(() => page.locator('.dialog .dlg-foot .tb-btn.primary').click());
  expect(nom).toMatch(/\.docx$/);
  const { fichiers, doc, core } = await lire(page, octets);
  expect(fichiers).toEqual(expect.arrayContaining(['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'docProps/core.xml']));
  expect(doc).toContain('<w:pStyle w:val="Heading1"/>');
  expect(doc).toContain('Décompte des frais');
  expect(doc, 'les deux lignes du paragraphe sont une seule pièce').toContain('l\'a adopté à l\'unanimité des membres présents.');
  expect((doc.match(/<w:tbl>/g) || []).length).toBe(1);
  expect((doc.match(/<w:tr>/g) || []).length).toBe(3);
  expect(doc).toContain('<w:jc w:val="right"/>');            // le montant s'aligne à droite
  expect(doc).not.toContain('<w:br w:type="page"/>');
  expect(core, 'le fichier ne dit pas qui l\'a produit').not.toMatch(/<dc:creator|lastModifiedBy/);
});

test('sauts de page gardés, tableaux défaits', async ({ app, page }) => {
  await app.ouvrir('decompte.pdf', exemple());
  await app.outil('exp-word');
  await page.locator('#wd-sauts').check();
  await page.locator('#wd-tableaux').uncheck();
  await expect(page.locator('.dialog')).toContainText('0 tableau');
  const { octets } = await app.recolter(() => page.locator('.dialog .dlg-foot .tb-btn.primary').click());
  const { doc } = await lire(page, octets);
  expect((doc.match(/<w:br w:type="page"\/>/g) || []).length).toBe(1);
  expect(doc).not.toContain('<w:tbl>');
  expect(doc).toContain('Annexe : liste des classes concernées.');
});

test('une page sans texte : on le dit, et rien n\'est écrit', async ({ app, page }) => {
  await app.ouvrir('vide.pdf', pdfDe([[]]));
  await app.outil('exp-word');
  await expect(page.locator('.dialog')).toContainText('Aucun texte sur cette page');
  let ecrit = false; page.on('download', () => { ecrit = true; });
  await page.locator('.dialog .dlg-foot .tb-btn.primary').click();
  await expect(page.locator('.toast').filter({ hasText: 'Rien à enregistrer' })).toBeVisible();
  expect(ecrit).toBe(false);
});
