// Le contrôleur de conformité PDF/A-2b : il doit voir ce qui empêche la déclaration,
// ne rien inventer sur un document en règle, et ne corriger que ce qui se corrige sans
// perte. (Que les documents que le logiciel produit soient réellement conformes est
// jugé par veraPDF dans la suite de bout en bout, pas ici.)
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { extraire } = require('./aide');

global.PDFLib = require(path.join(__dirname, '..', 'libs', 'cantoo-pdf-lib-2.11.0', 'dist', 'pdf-lib.js'));
global.signaler = () => {};
const { controlerPdfa, corrigerPourPdfa, policesAbsentesDeLaPage } =
  extraire('// @debut-conformite', '// @fin-conformite', '{ controlerPdfa, corrigerPourPdfa, policesAbsentesDeLaPage }');
const { PDFDocument, PDFName, PDFString, StandardFonts } = PDFLib;

// Une police « incorporée » pour le contrôle : un descripteur qui porte un programme de police.
function policeIncorporee(doc) {
  const prog = doc.context.register(doc.context.stream('programme'));
  const desc = doc.context.register(doc.context.obj({ Type: 'FontDescriptor', FontName: 'ABCDEF+Essai', FontFile2: prog }));
  return doc.context.register(doc.context.obj({ Type: 'Font', Subtype: 'TrueType', BaseFont: 'ABCDEF+Essai', FontDescriptor: desc }));
}
async function documentEnRegle() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([200, 200]);
  page.node.setFontDictionary(PDFName.of('F1'), policeIncorporee(doc));
  return doc;
}
const codes = r => r.problemes.map(p => p.code);

test('un document dont les polices sont incorporées : aucun problème', async () => {
  const doc = await documentEnRegle();
  const r = controlerPdfa(doc);
  assert.deepStrictEqual(r.problemes, []);
  assert.ok(r.regles >= 5);
});

test('une police standard non incorporée est nommée, avec sa page', async () => {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  doc.addPage().drawText('x', { font: f });
  doc.addPage();
  // Les polices ne sont écrites qu'à l'enregistrement : on relit le fichier.
  const relu = await PDFDocument.load(await doc.save());
  const r = controlerPdfa(relu);
  assert.strictEqual(r.problemes.length, 1);
  assert.strictEqual(r.problemes[0].code, 'police');
  assert.strictEqual(r.problemes[0].page, 1);
  assert.match(r.problemes[0].texte, /« Helvetica » n'est pas incorporée/);
  assert.deepStrictEqual(policesAbsentesDeLaPage(relu, relu.getPages()[0]), ['Helvetica']);
  assert.deepStrictEqual(policesAbsentesDeLaPage(relu, relu.getPages()[1]), []);
});

test('une police citée seulement par l\'apparence d\'une annotation est vue aussi', async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const std = doc.context.register(doc.context.obj({ Type: 'Font', Subtype: 'Type1', BaseFont: 'Helvetica' }));
  const ap = doc.context.register(doc.context.stream('', { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 10, 10], Resources: { Font: { Helv: std } } }));
  const annot = doc.context.register(doc.context.obj({ Type: 'Annot', Subtype: 'FreeText', Rect: [0, 0, 10, 10], F: 4, AP: { N: ap } }));
  page.node.set(PDFName.of('Annots'), doc.context.obj([annot]));
  const r = controlerPdfa(doc);
  assert.ok(codes(r).includes('police'));
});

test('scripts, actions interdites, fichiers joints, XFA, NeedAppearances : vus, et corrigeables', async () => {
  const doc = await documentEnRegle();
  const { context: c } = doc;
  doc.catalog.set(PDFName.of('OpenAction'), c.obj({ S: 'JavaScript', JS: PDFString.of('app.alert(1)') }));
  doc.catalog.set(PDFName.of('Names'), c.obj({
    JavaScript: c.obj({ Names: [] }),
    EmbeddedFiles: c.obj({ Names: [] }),
  }));
  doc.catalog.set(PDFName.of('AcroForm'), c.obj({ Fields: [], NeedAppearances: true, XFA: [] }));
  const r = controlerPdfa(doc);
  const par = code => r.problemes.filter(p => p.code === code).length;
  assert.ok(par('action') >= 2, 'OpenAction JS et JavaScript des noms');
  assert.strictEqual(par('pieces-jointes'), 1);
  assert.strictEqual(par('formulaire'), 2);
  assert.strictEqual(r.corrigeables, r.problemes.length, 'tout cela se corrige en le retirant');

  const fait = corrigerPourPdfa(doc);
  assert.ok(fait.actions >= 2 && fait.joints === 1 && fait.formulaire === 2);
  assert.deepStrictEqual(controlerPdfa(doc).problemes, []);
});

test('une annotation cachée ou non imprimable est corrigée, une sans apparence est un vrai problème', async () => {
  const doc = await documentEnRegle();
  const page = doc.getPages()[0];
  const { context: c } = doc;
  const ap = c.register(c.stream('', { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 10, 10] }));
  const cachee = c.register(c.obj({ Type: 'Annot', Subtype: 'Square', Rect: [0, 0, 10, 10], F: 2, AP: { N: ap } }));
  const lien = c.register(c.obj({ Type: 'Annot', Subtype: 'Link', Rect: [0, 0, 50, 10], A: { S: 'URI', URI: PDFString.of('https://example.org/') } }));
  const sansAp = c.register(c.obj({ Type: 'Annot', Subtype: 'Square', Rect: [0, 0, 10, 10], F: 4 }));
  page.node.set(PDFName.of('Annots'), c.obj([cachee, lien, sansAp]));
  let r = controlerPdfa(doc);
  const flags = r.problemes.filter(p => /imprimable/.test(p.texte));
  assert.strictEqual(flags.length, 2, 'la cachée et le lien sans drapeau');
  const sans = r.problemes.filter(p => /pas d'apparence/.test(p.texte));
  assert.strictEqual(sans.length, 1);
  assert.strictEqual(sans[0].corrigeable, false);
  corrigerPourPdfa(doc);
  r = controlerPdfa(doc);
  assert.deepStrictEqual(r.problemes.map(p => p.texte.replace(/«[^»]*»/, '«»')), ['Une annotation «» n\'a pas d\'apparence : un PDF/A l\'exige.']);
});

test('une annotation de surface nulle est dispensée d\'apparence, un fichier joint est retiré', async () => {
  const doc = await documentEnRegle();
  const page = doc.getPages()[0];
  const { context: c } = doc;
  const nulle = c.register(c.obj({ Type: 'Annot', Subtype: 'Text', Rect: [5, 5, 5, 5], F: 4 }));
  const joint = c.register(c.obj({ Type: 'Annot', Subtype: 'FileAttachment', Rect: [0, 0, 10, 10], F: 4, AP: { N: c.register(c.stream('', { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 1, 1] })) } }));
  page.node.set(PDFName.of('Annots'), c.obj([nulle, joint]));
  const r = controlerPdfa(doc);
  assert.deepStrictEqual(codes(r), ['pieces-jointes']);
  corrigerPourPdfa(doc);
  assert.deepStrictEqual(controlerPdfa(doc).problemes, []);
  assert.strictEqual(doc.getPages()[0].node.Annots().size(), 1);
});

test('le chiffrement est un problème qu\'on ne corrige pas', async () => {
  const doc = await documentEnRegle();
  doc.context.trailerInfo.Encrypt = doc.context.register(doc.context.obj({ Filter: 'Standard' }));
  const r = controlerPdfa(doc);
  assert.deepStrictEqual(codes(r), ['chiffrement']);
  assert.strictEqual(r.problemes[0].corrigeable, false);
});

test('la déclaration exige le XMP et l\'intention de sortie : absents avant, présents après convertToPDFA', async () => {
  const doc = await documentEnRegle();
  const avant = controlerPdfa(doc, { declaration: true });
  assert.ok(avant.problemes.some(p => /XMP/.test(p.texte)));
  assert.ok(avant.problemes.some(p => /intention de sortie/.test(p.texte)));
  doc.convertToPDFA({ conformance: '2B' });
  assert.deepStrictEqual(controlerPdfa(doc, { declaration: true }).problemes, []);
  // Un autre niveau n'est pas le niveau 2b.
  const autre = await documentEnRegle();
  autre.convertToPDFA({ conformance: '2U' });
  assert.ok(controlerPdfa(autre, { declaration: true }).problemes.some(p => /XMP/.test(p.texte)));
});
