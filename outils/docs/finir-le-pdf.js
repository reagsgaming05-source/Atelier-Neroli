/*
 * La dernière main portée aux PDF de documentation (mode d'emploi, guide d'administration, fiches, déclaration) : Chromium les écrit
 * avec « HeadlessChrome » pour auteur du programme, sans langue et sans métadonnées XMP. Un éditeur de PDF livre des PDF propres :
 * un titre que la visionneuse affiche, la langue du document (un lecteur d'écran choisit sa voix d'après elle), un créateur honnête.
 * Ce n'est PAS une déclaration PDF/UA : le pied de page que Chromium écrit n'est pas marqué comme artefact.
 */
const fs = require('fs');
const path = require('path');
const { PDFDocument, PDFName, PDFString, PDFOperator, StandardFonts, rgb } = require(path.join(__dirname, '..', 'libs', 'cantoo-pdf-lib-2.11.0', 'dist', 'pdf-lib.js'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Le pied de page : écrit ici, marqué comme artefact de pagination, au lieu du gabarit de Chromium qui n'est pas marqué du tout. Un lecteur
// d'écran ne le lit donc pas à chaque page, et le contrôleur PDF/UA n'y trouve plus de contenu sans marque.
async function poserLePied(doc, gauche) {
  const police = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    const { width } = page.getSize();
    const droite = String(i + 1);
    page.pushOperators(PDFOperator.of('BMC', [PDFName.of('Artifact')]));
    page.drawText(gauche, { x: 45, y: 28, size: 8, font: police, color: rgb(0.53, 0.57, 0.63) });
    page.drawText(droite, { x: width - 45 - police.widthOfTextAtSize(droite, 8), y: 28, size: 8, font: police, color: rgb(0.53, 0.57, 0.63) });
    page.pushOperators(PDFOperator.of('EMC'));
  });
}

async function finirLePdf(chemin, o) {
  const doc = await PDFDocument.load(fs.readFileSync(chemin), { updateMetadata: false });
  if (o.pied) await poserLePied(doc, o.pied);
  const maintenant = new Date();
  doc.setTitle(o.titre);
  doc.setSubject(o.sujet || o.titre);
  doc.setKeywords(o.mots || []);
  doc.setAuthor(o.auteur || '');
  doc.setCreator(o.produit || 'Aktum PDF');
  doc.setProducer(o.produit || 'Aktum PDF');
  doc.setCreationDate(maintenant);
  doc.setModificationDate(maintenant);
  const langue = o.langue || 'fr-CH';
  doc.catalog.set(PDFName.of('Lang'), PDFString.of(langue));
  doc.catalog.set(PDFName.of('ViewerPreferences'), doc.context.obj({ DisplayDocTitle: true }));
  const xmp = '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n'
    + '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
    + '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">'
    + '<dc:title><rdf:Alt><rdf:li xml:lang="x-default">' + esc(o.titre) + '</rdf:li></rdf:Alt></dc:title>'
    + '<dc:language><rdf:Bag><rdf:li>' + esc(langue) + '</rdf:li></rdf:Bag></dc:language>'
    + '<xmp:CreatorTool>' + esc(o.produit || 'Aktum PDF') + '</xmp:CreatorTool>'
    + '<xmp:CreateDate>' + maintenant.toISOString() + '</xmp:CreateDate><xmp:ModifyDate>' + maintenant.toISOString() + '</xmp:ModifyDate>'
    + '<pdf:Producer>' + esc(o.produit || 'Aktum PDF') + '</pdf:Producer>'
    + '</rdf:Description></rdf:RDF></x:xmpmeta>\n<?xpacket end="w"?>';
  const flux = doc.context.stream(Buffer.from(xmp, 'utf8'), { Type: 'Metadata', Subtype: 'XML' });
  doc.catalog.set(PDFName.of('Metadata'), doc.context.register(flux));
  fs.writeFileSync(chemin, await doc.save({ useObjectStreams: false }));
  return doc.getPageCount();
}
module.exports = { finirLePdf };
