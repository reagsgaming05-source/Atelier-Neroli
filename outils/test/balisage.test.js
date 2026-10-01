// Le balisage : l'arbre que fabrique creerBalisage et ce que controlerBalisage en dit. (La cohérence de
// l'arbre avec le flux de contenu est jugée par pikepdf dans la suite de bout en bout.)
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { extraire } = require('./aide');

global.PDFLib = require(path.join(__dirname, '..', 'libs', 'cantoo-pdf-lib-2.11.0', 'dist', 'pdf-lib.js'));
global.signaler = () => {};
global.plural = (n, un, plus) => n + ' ' + (n > 1 ? plus : un);
const { creerBalisage, controlerBalisage } = extraire('// @debut-balisage', '// @fin-balisage', '{ creerBalisage, controlerBalisage }');
const { PDFDocument, StandardFonts } = PDFLib;

async function documentBalise(options, remplir) {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const B = creerBalisage(doc, options);
  const p1 = doc.addPage([200, 200]);
  const pc = B.page(p1);
  B.ouvrir(pc, 'H1', {}); p1.drawText('Titre', { x: 10, y: 150, font: f, size: 20 }); B.fermer(pc);
  B.ouvrirArtefact(pc, 'Footer'); p1.drawText('1', { x: 100, y: 10, font: f, size: 8 }); B.fermer(pc);
  if (remplir) remplir(doc, B, f);
  const bilan = B.terminer();
  return { doc: await PDFDocument.load(await doc.save()), bilan };
}

test('un document balisé : racine, langue, titre, contrôleur satisfait', async () => {
  const { doc, bilan } = await documentBalise({ langue: 'de', titre: 'Mon titre', producteur: 'Essai' });
  assert.strictEqual(bilan.elements, 3, 'Document, Sect, H1');
  const r = controlerBalisage(doc);
  assert.strictEqual(r.balise, true);
  assert.deepStrictEqual(r.problemes, []);
  assert.strictEqual(r.langue, 'de');
  assert.strictEqual(doc.getTitle(), 'Mon titre');
  assert.ok(r.avis.some(a => /pas un PDF\/UA/.test(a)), 'dit ce qu\'il ne tient pas');
});

test('un document non balisé est reconnu comme tel', async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  const r = controlerBalisage(doc);
  assert.strictEqual(r.balise, false);
  assert.strictEqual(r.problemes.length, 1);
});

test('une figure sans texte de remplacement est un problème, avec texte elle passe', async () => {
  const sans = await documentBalise({ langue: 'fr', titre: 'T' }, (doc, B) => {
    const p = doc.addPage([100, 100]); const pc = B.page(p);
    B.ouvrir(pc, 'Figure', {}); p.drawRectangle({ x: 0, y: 0, width: 10, height: 10 }); B.fermer(pc);
  });
  assert.ok(controlerBalisage(sans.doc).problemes.some(t => /figure sans texte de remplacement/.test(t)));
  const avec = await documentBalise({ langue: 'fr', titre: 'T' }, (doc, B) => {
    const p = doc.addPage([100, 100]); const pc = B.page(p);
    B.ouvrir(pc, 'Figure', { alt: 'Le plan du terrain' }); p.drawRectangle({ x: 0, y: 0, width: 10, height: 10 }); B.fermer(pc);
  });
  assert.deepStrictEqual(controlerBalisage(avec.doc).problemes, []);
});

test('une page blanche ne laisse aucun élément vide, une page sans balisage est signalée', async () => {
  const { doc } = await documentBalise({ langue: 'fr', titre: 'T' }, (d, B) => { B.page(d.addPage([100, 100])); });
  const r = controlerBalisage(doc);
  assert.deepStrictEqual(r.problemes, []);
  assert.ok(r.avis.some(a => /1 page n'a pas de contenu balisé/.test(a)));
});

test('le contenu existant d\'une page se balise en bloc, y compris quand son flux est unique', async () => {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const source = await PDFDocument.create();
  const sf = await source.embedFont(StandardFonts.Helvetica);
  source.addPage([100, 100]).drawText('Venu d\'ailleurs', { x: 5, y: 50, font: sf, size: 10 });
  const [copie] = await doc.copyPages(source, [0]);
  doc.addPage(copie);
  const B = creerBalisage(doc, { langue: 'fr', titre: 'T' });
  const pc = B.page(copie);
  assert.ok(B.envelopper(pc, 'Div', {}), 'le flux unique est mis en liste puis encadré');
  B.ouvrirArtefact(pc, null); copie.drawText('pied', { x: 5, y: 5, font: f, size: 6 }); B.fermer(pc);
  B.terminer();
  const relu = await PDFDocument.load(await doc.save());
  assert.deepStrictEqual(controlerBalisage(relu).problemes, []);
  // le flux contient la séquence ouverte puis fermée avant l'artefact
  const flux = Buffer.from(await relu.save({ useObjectStreams: false })).toString('latin1');
  assert.match(flux, /\/Div <<\/MCID 0>> BDC/);
});

test('un document dont le titre manque est signalé', async () => {
  const { doc } = await documentBalise({ langue: 'fr', titre: '' });
  assert.ok(controlerBalisage(doc).problemes.some(t => /pas de titre/.test(t)));
});
