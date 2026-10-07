// La synthèse des commentaires d'un PDF relu à plusieurs : un CSV qu'Excel trie, un PDF qui se lit.
const { test, expect, pdfDe, textesDuPdf } = require('./aide');

const relu = () => pdfDe([
  { morceaux: [{ x: 70, y: 700, texte: 'Projet de règlement' }],
    annots: ['<< /Type /Annot /Subtype /Text /Rect [400 700 420 720] /Contents (Merci de vérifier ce montant) /T (Relecteur) /M (D:20260101120000Z) >>'] },
  { morceaux: [{ x: 70, y: 700, texte: 'Article premier' }],
    annots: ['<< /Type /Annot /Subtype /Text /Rect [400 700 420 720] /Contents (Où est la base légale ; à citer ?) /T (Juriste) /M (D:20260102090000Z) >>'] },
]);

test('la synthèse en CSV : une ligne par commentaire, rangée par page, lisible dans Excel', async ({ app, page }) => {
  await app.ouvrir('relu.pdf', relu());
  await app.outil('commentaires');
  await expect(page.locator('.dialog')).toContainText('2 commentaires');
  const { octets, nom } = await app.recolter(() => page.click('#cm-synthese-csv'));
  expect(nom).toMatch(/-commentaires\.csv$/);
  const t = Buffer.from(octets).toString('utf8');
  expect(t.charCodeAt(0), 'marque UTF-8 pour Excel').toBe(0xfeff);
  const lignes = t.replace(/^﻿/, '').trim().split('\r\n');
  expect(lignes[0]).toBe('Page;Document;Type;Auteur;Date;Commentaire;Retiré à l\'export');
  expect(lignes).toHaveLength(3);
  expect(lignes[1]).toContain('Relecteur');
  expect(lignes[1]).toContain('01.01.2026');
  expect(lignes[2], 'le point-virgule du texte est protégé par des guillemets').toContain('"Où est la base légale ; à citer ?"');
});

test('la synthèse en PDF : un document qui contient chaque commentaire, avec son auteur et sa page', async ({ app, page }) => {
  await app.ouvrir('relu.pdf', relu());
  await app.outil('commentaires');
  const { octets, nom } = await app.recolter(() => page.click('#cm-synthese-pdf'));
  expect(nom).toMatch(/-commentaires\.pdf$/);
  const [p1] = await textesDuPdf(page, octets);
  expect(p1).toContain('Synthèse des commentaires');
  expect(p1).toContain('Merci de vérifier ce montant');
  expect(p1).toContain('Juriste');
  expect(p1).toMatch(/p\. 2/);
});
